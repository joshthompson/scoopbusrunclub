import { createSignal } from 'solid-js'

/**
 * How far anyone's got, kept in this browser: the furthest course that's
 * unlocked for practice, by finishing the one before it, in Endless or
 * practising. The best runs are in `highScores`.
 *
 * Every course is open to practise unless courses are locked: by
 * `LOCKED_BY_DEFAULT`, or in this browser, by `lockAll()` in the console.
 * How far they've got is kept either way, so locking them again opens
 * what's been earned.
 */
const STORAGE_KEY = 'scoopbus-run:progress'

/** Whether courses start locked, each opened by finishing the one before. */
const LOCKED_BY_DEFAULT = false

interface Progress {
	/** The furthest course unlocked, as an index into `COURSES`. */
	reached: number
	/** Courses locked in this browser, or not, whatever the default. */
	locked?: boolean
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

/** Whether courses are locked here. */
const locked = () => progress().locked ?? LOCKED_BY_DEFAULT

/** Whether the course at `index` in `COURSES` can be practised: the first always can. */
export const isUnlocked = (index: number) =>
	!locked() || index <= progress().reached

/**
 * The course at `index` is reached: the one before it's been finished.
 * Whether that's unlocked it, new: never, with nothing locked.
 */
export function reach(index: number) {
	if (index <= progress().reached) return false
	const opened = !isUnlocked(index)
	store({ ...progress(), reached: index })
	return opened
}

/** For debugging: every course up to `index` unlocked, as if Endless had got there. */
export function unlockUpTo(index: number) {
	store({ ...progress(), reached: Math.max(progress().reached, index) })
}

/** For debugging: everything locked again, in storage too, as if nothing had been played. */
export function lockAll() {
	store({ ...NONE, locked: true })
}

/** For "Clear local data": everything's locked again. */
export function forgetProgress() {
	setProgress(NONE)
}
