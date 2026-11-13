import { createSignal } from 'solid-js'

/**
 * Which courses' special goals have been done (see `SpecialGoal`), kept in
 * this browser, by course id.
 */
const STORAGE_KEY = 'scoopbus-run:special-goals'

function load(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
		return Array.isArray(stored)
			? stored.filter((id): id is string => typeof id === 'string')
			: []
	} catch {
		return []
	}
}

const [done, setDone] = createSignal<string[]>(load())

/** Whether a course's special goal's been done. */
export const specialDone = (courseId: string) => done().includes(courseId)

/** A course's special goal done: kept. Whether it's the first time. */
export function markSpecialDone(courseId: string) {
	if (specialDone(courseId)) return false
	const next = [...done(), courseId]
	setDone(next)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Storage off: kept until the page is closed.
	}
	return true
}

/** For "Clear local data". */
export function forgetSpecialGoals() {
	setDone([])
	try {
		localStorage.removeItem(STORAGE_KEY)
	} catch {
		// Storage off: nothing to forget.
	}
}
