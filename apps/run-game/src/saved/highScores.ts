import { createSignal } from 'solid-js'

/**
 * The high score tables, kept in this browser for now: one for Endless, and
 * one for each course, for the points got on it in one go, in Endless or in
 * practice. Each keeps its top `TABLE_SIZE`.
 */
const STORAGE_KEY = 'scoopbus-run:high-scores'
export const TABLE_SIZE = 10

/** Which table: Endless, or a course's id. */
export type TableId = 'endless' | (string & {})

export interface ScoreEntry {
	/** An Endless run is one entry, updated as it goes on: its id says which. */
	id: string
	score: number
	/** Who ran it: a club member's name, or someone's own runner's. */
	runner: string
	/** The day, as YYYY-MM-DD. */
	date: string
	/** In Endless, how many courses it got round. */
	courses?: number
	/** On a course, how far round it got, and whether it got to the end. */
	metres?: number
	finished?: boolean
}

/** Keyed by `TableId`. */
type Tables = { [id: string]: ScoreEntry[] }

const isEntry = (value: unknown): value is ScoreEntry => {
	const entry = value as ScoreEntry
	return (
		typeof entry?.id === 'string' &&
		typeof entry.score === 'number' &&
		typeof entry.runner === 'string' &&
		typeof entry.date === 'string'
	)
}

function load(): Tables {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
		const tables: Tables = {}
		for (const [id, entries] of Object.entries(stored ?? {}))
			if (Array.isArray(entries)) tables[id] = entries.filter(isEntry)
		return tables
	} catch {
		return {}
	}
}

const [tables, setTables] = createSignal<Tables>(load())

/** A table's entries, best first. */
export const table = (id: TableId) => tables()[id] ?? []
/** A table's top score, or 0 with nobody in it yet. */
export const topScore = (id: TableId) => table(id)[0]?.score ?? 0

/** Today, as YYYY-MM-DD, in this browser's own time zone. */
export function today() {
	const now = new Date()
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Puts an entry in a table, or updates the one with its id: an Endless run as
 * it goes on. Its place in the table, from 0, or undefined if it didn't make it.
 */
export function record(id: TableId, entry: ScoreEntry) {
	const others = table(id).filter((e) => e.id !== entry.id)
	// After anyone with the same score already: they got it first.
	const at = others.findIndex((e) => e.score < entry.score)
	const place = at < 0 ? others.length : at
	if (place >= TABLE_SIZE) return undefined
	const next = [...others.slice(0, place), entry, ...others.slice(place)].slice(
		0,
		TABLE_SIZE,
	)
	const all = { ...tables(), [id]: next }
	setTables(all)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
	} catch {
		// Storage off: kept until the page is closed.
	}
	return place
}

/** For "Clear local data". */
export function forgetHighScores() {
	setTables({})
}
