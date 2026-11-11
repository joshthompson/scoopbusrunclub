import { createSignal } from 'solid-js'

/**
 * How far anyone's got, kept in this browser: the furthest course that's
 * unlocked for practice, by finishing the one before it, in Endless or
 * practising. The best runs are in `highScores`.
 */
const STORAGE_KEY = 'scoopbus-run:progress'

interface Progress {
	/** The furthest course unlocked, as an index into `COURSES`. */
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

/** Whether the course at `index` in `COURSES` can be practised: the first always can. */
export const isUnlocked = (index: number) => index <= progress().reached

/** The course at `index` is unlocked: the one before it's been finished. Whether that's new. */
export function reach(index: number) {
	if (isUnlocked(index)) return false
	store({ ...progress(), reached: index })
	return true
}

/** For debugging: every course up to `index` unlocked, as if Endless had got there. */
export function unlockUpTo(index: number) {
	store({ ...progress(), reached: Math.max(progress().reached, index) })
}

/** For debugging: everything locked again, in storage too. */
export function lockAll() {
	store(NONE)
}

/** For "Clear local data": everything's locked again. */
export function forgetProgress() {
	setProgress(NONE)
}
