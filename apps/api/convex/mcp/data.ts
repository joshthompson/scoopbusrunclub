/**
 * The club's data as the MCP tools see it: the snapshot files, plus the
 * look-ups every tool wants (members by name, results by runner, PBs and
 * milestones worked out once).
 *
 * Built from storage, never the tables, and kept in module scope by snapshot
 * version — Convex reuses a warm isolate where it can, and then a question
 * costs one small `appData` read and no file reads at all.
 */

import { toISODate } from '../../../../libs/shared/calendar/dates'
import {
	buildMilestoneMap,
	nextMilestone,
	projectedMilestoneDate,
} from '../../../../libs/shared/calendar/milestones'
import {
	LINK_PARKRUN_ID,
	LINK_RESULTS,
	LINK_VOLUNTEERS,
} from '../../../../libs/shared/link'
import {
	CLUB_MEMBER_ENTRIES,
	memberKeyFor,
} from '../../../../libs/shared/members'
import {
	type PBStatus,
	buildPBMap,
	isJuniorEvent,
	parseTimeToSeconds,
	pbResultKey,
} from '../../../../libs/shared/results/pb'
import type { Doc } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import type { GuestResultItem } from '../guests'
import { clubNow } from '../notificationSchedule'
import type { ResultItem, VolunteerItem } from '../queries'
import { loadSnapshots } from '../snapshots'

export interface Member {
	/** The site's key for them, e.g. "otherJosh". Their page is /member/<key>. */
	key: string
	name: string
	/** Empty for a member parkrun doesn't know about. */
	parkrunId: string
	/** Every name they might be asked about by. */
	aliases: string[]
	/** DD/MM, or null when we don't know it. */
	birthday: string | null
	joined: number | null
	/** parkrun's own counts, from their profile. */
	totalRuns: number | null
	totalJuniorRuns: number | null
}

export interface ClubData {
	version: string
	generatedAt: number
	members: Member[]
	/** Oldest first. Includes Link's hand-kept record. */
	results: ResultItem[]
	volunteers: VolunteerItem[]
	parkruns: Doc<'events'>[]
	races: Doc<'races'>[]
	guests: Doc<'guests'>[]
	guestResults: GuestResultItem[]
	eventName: (eventId: string) => string
	isJunior: (eventId: string) => boolean
	memberById: Map<string, Member>
	memberByKey: Map<string, Member>
	/** parkrunId → their results, oldest first. */
	resultsBy: Map<string, ResultItem[]>
	volunteersBy: Map<string, VolunteerItem[]>
	pbs: Map<string, PBStatus>
	/** "parkrunId:date" → run number, for milestone runs. */
	milestones: Map<string, number>
	/** The latest date with any result. */
	latestResultDate: string | null
}

let cached: ClubData | null = null

export async function loadClubData(ctx: ActionCtx): Promise<ClubData> {
	const snapshot = await loadSnapshots(ctx, [
		'members',
		'results',
		'volunteers',
		'parkruns',
		'our-events',
		'guests',
		'guest-results',
	])
	if (cached?.version === snapshot.version) return cached

	const { data } = snapshot
	const eventNames = new Map(data.parkruns.map((e) => [e.eventId, e.name]))
	const eventName = (eventId: string) => eventNames.get(eventId) ?? eventId
	const isJunior = (eventId: string) => isJuniorEvent(eventId, eventName)

	const runnerById = new Map(data.members.map((r) => [r.parkrunId, r]))
	const members: Member[] = CLUB_MEMBER_ENTRIES.map(([key, facts]) => {
		const parkrunId = key === 'link' ? LINK_PARKRUN_ID : facts.id
		const runner = runnerById.get(parkrunId)
		return {
			key,
			name: facts.name,
			parkrunId,
			aliases: [
				key,
				facts.name,
				...(facts.altNames ?? []),
				...(runner ? [runner.name] : []),
			],
			birthday: facts.birthday === '00/00' ? null : facts.birthday,
			joined: facts.joined,
			totalRuns: runner?.totalRuns ?? null,
			totalJuniorRuns: runner?.totalJuniorRuns ?? null,
		}
	})
	// Anyone tracked who isn't in the member list yet still gets answered for.
	for (const runner of data.members) {
		if (memberKeyFor(runner.parkrunId, runner.name)) continue
		members.push({
			key: runner.parkrunId,
			name: runner.name,
			parkrunId: runner.parkrunId,
			aliases: [runner.name],
			birthday: null,
			joined: null,
			totalRuns: runner.totalRuns,
			totalJuniorRuns: runner.totalJuniorRuns ?? null,
		})
	}

	const results = [...data.results, ...LINK_RESULTS].sort((a, b) =>
		a.date.localeCompare(b.date),
	)
	const volunteers = [...data.volunteers, ...LINK_VOLUNTEERS].sort((a, b) =>
		a.date.localeCompare(b.date),
	)

	cached = {
		version: snapshot.version,
		generatedAt: snapshot.generatedAt,
		members,
		results,
		volunteers,
		parkruns: data.parkruns,
		races: data['our-events'],
		guests: data.guests,
		guestResults: data['guest-results'],
		eventName,
		isJunior,
		memberById: new Map(members.map((m) => [m.parkrunId, m])),
		memberByKey: new Map(members.map((m) => [m.key, m])),
		resultsBy: groupBy(results, (r) => r.parkrunId),
		volunteersBy: groupBy(volunteers, (v) => v.parkrunId),
		pbs: buildPBMap(results, eventName),
		milestones: buildMilestoneMap(results, data.members),
		latestResultDate: results.at(-1)?.date ?? null,
	}
	return cached
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
	const map = new Map<string, T[]>()
	for (const item of items) {
		const k = key(item)
		const list = map.get(k)
		if (list) list.push(item)
		else map.set(k, [item])
	}
	return map
}

// ---------------------------------------------------------------------------
// Helpers the tools share
// ---------------------------------------------------------------------------

/** A problem with what the model asked for, reported back to it to fix. */
export class ToolError extends Error {}

/** Today in Stockholm, YYYY-MM-DD. */
export function clubToday(): string {
	return clubNow().date
}

export function normalize(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9]/g, '')
}

/**
 * Find one thing by a loosely typed name: an exact match on any of its names
 * first, then a unique prefix or substring match.
 */
function findOne<T>(
	items: T[],
	names: (item: T) => string[],
	query: string,
	what: string,
	label: (item: T) => string,
): T {
	const q = normalize(query)
	if (!q) throw new ToolError(`Give a ${what} name.`)
	const exact = items.filter((item) =>
		names(item).some((n) => normalize(n) === q),
	)
	if (exact.length === 1) return exact[0]
	const loose = exact.length
		? exact
		: items.filter((item) =>
				names(item).some((n) => {
					const name = normalize(n)
					return name.startsWith(q) || name.includes(q)
				}),
			)
	if (loose.length === 1) return loose[0]
	if (loose.length > 1) {
		throw new ToolError(
			`"${query}" matches more than one ${what}: ${loose.map(label).join(', ')}. Be more specific.`,
		)
	}
	const known =
		items.length <= 40 ? ` Known: ${items.map(label).join(', ')}.` : ''
	throw new ToolError(`No ${what} matches "${query}".${known}`)
}

export function findMember(data: ClubData, name: string): Member {
	return findOne(
		data.members,
		(m) => m.aliases,
		name,
		'member',
		(m) => m.name,
	)
}

export function findParkrun(data: ClubData, name: string): Doc<'events'> {
	return findOne(
		data.parkruns,
		(e) => [e.eventId, e.name, e.name.replace(/\s*parkrun\s*/i, '')],
		name,
		'parkrun',
		(e) => e.name,
	)
}

export function memberName(
	data: ClubData,
	parkrunId: string,
	fallback: string,
) {
	return data.memberById.get(parkrunId)?.name ?? fallback
}

export function timeSeconds(time: string): number {
	return parseTimeToSeconds(time)
}

export function ageGradeValue(ageGrade: string): number {
	const value = Number.parseFloat(ageGrade)
	return Number.isFinite(value) ? value : 0
}

/** A result as the tools hand it back: compact, with only the flags that apply. */
export function resultRow(data: ClubData, r: ResultItem) {
	const flags = data.pbs.get(pbResultKey(r))
	const milestone = data.milestones.get(`${r.parkrunId}:${r.date}`)
	return {
		date: r.date,
		runner: memberName(data, r.parkrunId, r.runnerName),
		parkrun: r.eventName,
		event_number: r.eventNumber,
		position: r.position,
		time: r.time,
		age_grade: r.ageGrade || undefined,
		is_pb: flags?.pb || undefined,
		is_course_pb: flags?.coursePb || undefined,
		is_junior_pb: flags?.juniorPb || undefined,
		is_first_result_on_record: flags?.firstRun || undefined,
		milestone_run: milestone,
		is_junior: data.isJunior(r.event) || undefined,
	}
}

/** Their fastest 5k result (junior parkruns are a different distance). */
export function fastestResult(
	data: ClubData,
	runs: ResultItem[],
): ResultItem | undefined {
	let best: ResultItem | undefined
	for (const run of runs) {
		if (data.isJunior(run.event)) continue
		if (!best || timeSeconds(run.time) < timeSeconds(best.time)) best = run
	}
	return best
}

/** The member's next milestone run, and when it could land at a run a week. */
export function milestoneOutlook(data: ClubData, member: Member) {
	if (member.totalRuns === null) return undefined
	const next = nextMilestone(member.totalRuns)
	if (next === null) return undefined
	const runsToGo = next - member.totalRuns
	const projected = projectedMilestoneDate(
		runsToGo,
		data.latestResultDate ?? '',
	)
	return {
		run: next,
		runs_to_go: runsToGo,
		earliest_date: projected ? toISODate(projected) : undefined,
	}
}

/** Cap a list, saying how much was left out. */
export function capped<T>(items: T[], limit: number) {
	return {
		total: items.length,
		items: items.slice(0, limit),
		truncated: items.length > limit ? items.length - limit : undefined,
	}
}
