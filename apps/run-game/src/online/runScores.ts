import { createSignal } from 'solid-js'
import type { BonusKind, World } from '../game/world'
import { type ScoreIcon, identity } from '../saved/identity'
import { ONLINE, ask, isObject, numberIn, post, stringIn } from './backend'

export { ONLINE }

/**
 * The online high score tables, on the website's backend: one for Endless,
 * and one for each course, as the ones kept in this browser are. Each score
 * is under your Profile there, with your name and head (see `saveProfile`).
 *
 * Each go, a Run of Endless or a Practice, gets a Ticket as it starts, and
 * its score's sent with it: the backend only takes a score for a go it saw
 * start, long enough ago, that adds up
 * (see `apps/api/convex/runScores.ts`). Without a backend to ask (no
 * `VITE_CONVEX_URL`, as when developing), or with no connection, there's
 * just no ticket, and the score stays in this browser.
 */

/** How many a table shows: in step with the backend's. */
export const ONLINE_TABLE_SIZE = 10

/** What a run's got, to show its score adds up. */
export interface Tally {
	metres: number
	/** How long it's taken, in ticks of the race. */
	ticks: number
	/** Courses got round. */
	courses: number
	finished: boolean
	bonuses: Partial<Record<BonusKind, { count: number; points: number }>>
}

/** A course's tally, from its world, at its end. */
export function courseTally(world: World): Tally {
	const finished = world.result()?.kind === 'finished'
	return {
		metres: world.metres(),
		ticks: world.raceTicks(),
		courses: finished ? 1 : 0,
		finished,
		bonuses: structuredClone(world.bonuses),
	}
}

/** Two tallies as one: an Endless run's so far, and its next course's. */
export function addTallies(a: Tally, b: Tally): Tally {
	const bonuses = { ...a.bonuses }
	for (const [kind, bonus] of Object.entries(b.bonuses) as [
		BonusKind,
		{ count: number; points: number },
	][]) {
		const was = bonuses[kind] ?? { count: 0, points: 0 }
		bonuses[kind] = {
			count: was.count + bonus.count,
			points: was.points + bonus.points,
		}
	}
	return {
		metres: a.metres + b.metres,
		ticks: a.ticks + b.ticks,
		courses: a.courses + b.courses,
		finished: b.finished,
		bonuses,
	}
}

export const EMPTY_TALLY: Tally = {
	metres: 0,
	ticks: 0,
	courses: 0,
	finished: false,
	bonuses: {},
}

/** A ticket for a run of a table, starting now: undefined offline. */
export async function startRun(table: string): Promise<string | undefined> {
	if (!ONLINE) return undefined
	return stringIn(await post('/api/run/start', { table }), 'ticket')
}

/**
 * An Endless run's ticket and what it's got so far, from one course to the
 * next: kept only while the game's open.
 */
interface EndlessRun {
	ticket: Promise<string | undefined>
	tally: Tally
}
const endlessRuns = new Map<string, EndlessRun>()

/** An Endless run, by its id: its ticket asked for the first time it's seen. */
export function endlessRun(runId: string): EndlessRun {
	let run = endlessRuns.get(runId)
	if (!run) {
		run = { ticket: startRun('endless'), tally: EMPTY_TALLY }
		endlessRuns.set(runId, run)
	}
	return run
}

/** A score on an online table, as it's shown. */
export interface OnlineEntry {
	score: number
	name: string
	/** Whose head it's under: none if the backend's is one this game doesn't know. */
	icon?: ScoreIcon
	date: string
	metres?: number
	finished?: boolean
	courses?: number
	/** Whether it's this player's. */
	mine: boolean
}

export interface OnlineTable {
	entries: OnlineEntry[]
	/** This player's own, if it's further down: where it comes, from 0. */
	mine?: { rank: number; entry: OnlineEntry }
}

/** A score's icon from the backend: undefined if it isn't one, for no face. */
function asIcon(icon: unknown): ScoreIcon | undefined {
	if (!isObject(icon)) return undefined
	if (typeof icon.member === 'string') return { member: icon.member }
	if (isObject(icon.look)) return icon as ScoreIcon
	return undefined
}

/** An entry from the backend, as it's shown: undefined if it's missing its score or name. */
function asEntry(entry: unknown): OnlineEntry | undefined {
	const score = numberIn(entry, 'score')
	const name = stringIn(entry, 'name')
	if (score === undefined || name === undefined || !isObject(entry))
		return undefined
	return {
		score,
		name,
		icon: asIcon(entry.icon),
		date: stringIn(entry, 'date') ?? '',
		metres: numberIn(entry, 'metres'),
		finished: entry.finished === true,
		courses: numberIn(entry, 'courses'),
		mine: entry.mine === true,
	}
}

/** A table from the backend: undefined if it isn't one. */
function asTable(table: unknown): OnlineTable | undefined {
	if (!isObject(table) || !Array.isArray(table.entries)) return undefined
	const entries = table.entries
		.map(asEntry)
		.filter((entry) => entry !== undefined)
	const rank = numberIn(table.mine, 'rank')
	const entry = isObject(table.mine) ? asEntry(table.mine.entry) : undefined
	return {
		entries,
		mine: rank !== undefined && entry ? { rank, entry } : undefined,
	}
}

/** The tables fetched so far, by id: shown straight away next time, while it's fetched again. */
const [tables, setTables] = createSignal<Record<string, OnlineTable>>({})
export const onlineTable = (table: string) => tables()[table]

/** A table, fresh: undefined offline. */
export async function fetchTable(
	table: string,
): Promise<OnlineTable | undefined> {
	if (!ONLINE) return undefined
	const params = new URLSearchParams({ table, player: identity().playerId })
	const fetched = asTable(await ask(`/api/run/scores?${params}`))
	if (!fetched) return undefined
	setTables((all) => ({ ...all, [table]: fetched }))
	return fetched
}

/** Why the backend said no, or that it couldn't be asked: undefined for a yes. */
function problemWith(result: unknown): string | undefined {
	if (!isObject(result)) return 'Couldn’t reach the high score tables'
	const error = result.error
	if (error === undefined) return undefined
	if (error === 'limit') return 'Too many scores sent today. Try again tomorrow'
	return typeof error === 'string' && error
		? error
		: 'The high score tables didn’t take it'
}

/** Whether a score's better than the player's own on a table, or they've none there yet. */
export function beatsOwn(table: OnlineTable, score: number) {
	const own = table.entries.find((e) => e.mine) ?? table.mine?.entry
	return score > 0 && (!own || score > own.score)
}

/** Whether a score would go on a table: in its top, and better than the player's own there. */
export function wouldPlace(table: OnlineTable, score: number) {
	if (!beatsOwn(table, score)) return false
	return (
		table.entries.filter((e) => !e.mine).length < ONLINE_TABLE_SIZE ||
		score > (table.entries.at(-1)?.score ?? 0)
	)
}

/**
 * Your name and head, to your profile on the tables: every score you've got
 * on them shows them, changed or not. Nothing offline, or not named yet.
 */
export async function saveProfile(): Promise<{ error?: string }> {
	const { name, icon, playerId } = identity()
	if (!ONLINE || !name || !icon) return {}
	const error = problemWith(
		await post('/api/run/profile', { playerId, name, icon }),
	)
	// Shown under the new name next time each table's looked at.
	if (!error) setTables({})
	return { error }
}

/** Send a score, saving your profile with it: where it came on the table (from 0), or why it couldn't go on. */
export async function submitScore(args: {
	ticket: string
	table: string
	score: number
	tally: Tally
	date: string
}): Promise<{ rank?: number; error?: string }> {
	const { name, icon, playerId } = identity()
	const result = await post('/api/run/score', {
		ticket: args.ticket,
		table: args.table,
		playerId,
		name,
		icon,
		date: args.date,
		score: args.score,
		...args.tally,
	})
	const error = problemWith(result)
	if (error) return { error }
	void fetchTable(args.table)
	return { rank: numberIn(result, 'rank') }
}
