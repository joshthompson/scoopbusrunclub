import { createSignal } from 'solid-js'
import type { Collectable } from '../game/collectables'
import { STORAGE_PREFIX } from './storagePrefix'

/**
 * What's been collected, kept in this browser, and how many times each:
 * see `game/collectables`.
 */
const STORAGE_KEY = `${STORAGE_PREFIX}collected`

type Counts = Partial<Record<Collectable, number>>

/**
 * Collectables that have since been swapped for something else, and what
 * for: had as the one, kept as the other. Midnattsloppet's korv med bröd,
 * now a slice of pizza.
 */
const RENAMED: Record<string, Collectable> = {
	'fika:hotDog': 'fika:pizzaSlice',
}

/** `counts`, with anything renamed counted under its new name. */
function renamed(counts: Record<string, number>): Counts {
	const out: Record<string, number> = {}
	for (const [id, n] of Object.entries(counts)) {
		const to = RENAMED[id] ?? id
		out[to] = (out[to] ?? 0) + n
	}
	return out as Counts
}

function load(): Counts {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
		// Once just a list of what's been had: each of them, once.
		if (Array.isArray(stored))
			return renamed(
				Object.fromEntries(stored.map((id: Collectable) => [id, 1])),
			)
		return renamed(stored)
	} catch {
		return {}
	}
}

const [counts, setCounts] = createSignal<Counts>(load())

/** How many times `id`'s been collected: none, if it hasn't. */
export const timesCollected = (id: Collectable) => counts()[id] ?? 0

/** Whether `id`'s been collected. */
export const hasCollected = (id: Collectable) => timesCollected(id) > 0

/** Collected `id`, once more. */
export function collect(id: Collectable) {
	const next = { ...counts(), [id]: timesCollected(id) + 1 }
	setCounts(next)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Storage off: kept until the page is closed.
	}
}

/** For "Clear local data": nothing collected any more. */
export function forgetCollected() {
	setCounts({})
}
