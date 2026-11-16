import { createSignal } from 'solid-js'
import { finishedInTables } from './highScores'
import { STORAGE_PREFIX } from './storagePrefix'

/**
 * Which courses have been finished, got to the end of, in Endless or
 * practising, kept in this browser, by course id: all of them, and Deri's
 * theirs to run as (see `DERI`).
 *
 * Before this was kept, a finish was only in the high score tables, so it
 * starts with any finish still in them.
 */
const STORAGE_KEY = `${STORAGE_PREFIX}finished-courses`

function load(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
		if (Array.isArray(stored))
			return stored.filter((id): id is string => typeof id === 'string')
	} catch {
		// Not kept, or not readable: from the tables, as if never kept.
	}
	return finishedInTables()
}

const [finished, setFinished] = createSignal<string[]>(load())

/** Whether a course has been finished. */
export const courseFinished = (courseId: string) =>
	finished().includes(courseId)

/** A course finished: kept. */
export function markFinished(courseId: string) {
	if (courseFinished(courseId)) return
	const next = [...finished(), courseId]
	setFinished(next)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Storage off: kept until the page is closed.
	}
}

/** For "Clear local data". */
export function forgetFinished() {
	setFinished([])
	try {
		localStorage.removeItem(STORAGE_KEY)
	} catch {
		// Storage off: nothing to forget.
	}
}
