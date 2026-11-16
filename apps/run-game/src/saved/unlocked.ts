import { createSignal } from 'solid-js'
import { STORAGE_PREFIX } from './storagePrefix'

/**
 * Which bonus runners have been unlocked (see `BONUS_RUNNERS`), kept in this
 * browser, by their runner id: the Yeti, by finding him under Everest.
 */
const STORAGE_KEY = `${STORAGE_PREFIX}unlocked-runners`

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

const [unlocked, setUnlocked] = createSignal<string[]>(load())

/** Whether a bonus runner's been unlocked, by their runner id. */
export const runnerUnlocked = (id: string) => unlocked().includes(id)

/** A bonus runner unlocked: kept. Whether it's the first time. */
export function unlockRunner(id: string) {
	if (runnerUnlocked(id)) return false
	const next = [...unlocked(), id]
	setUnlocked(next)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Storage off: kept until the page is closed.
	}
	return true
}

/** For "Clear local data": every bonus runner locked again. */
export function forgetUnlockedRunners() {
	setUnlocked([])
	try {
		localStorage.removeItem(STORAGE_KEY)
	} catch {
		// Storage off: nothing to forget.
	}
}
