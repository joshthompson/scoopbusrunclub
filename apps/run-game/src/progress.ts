import { createSignal } from 'solid-js'

/**
 * How far Endless has got, kept in this browser: which courses it's reached,
 * which unlocks them for practice. The best runs are in `highScores`.
 */
const STORAGE_KEY = 'scoopbus-run:progress'

interface Progress {
	/** The furthest course reached in Endless, as an index into `LEVELS`. */
	reached: number
}

const NONE: Progress = { reached: 0 }

function load(): Progress {
	try {
		return {
			...NONE,
			...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'),
		}
	} catch {
		return NONE
	}
}

const [progress, setProgress] = createSignal<Progress>(load())

function store(next: Progress) {
	setProgress(next)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Storage off: kept until the page is closed.
	}
}

/** Whether the course at `index` in `LEVELS` can be practised: the first always can. */
export const isUnlocked = (index: number) => index <= progress().reached

/** Endless has got as far as the course at `index`. Whether that's new. */
export function reach(index: number) {
	if (isUnlocked(index)) return false
	store({ ...progress(), reached: index })
	return true
}

/** For "Clear local data": everything's locked again. */
export function forgetProgress() {
	setProgress(NONE)
}
