import { createSignal } from 'solid-js'
import { type Medal, better } from '../game/medals'

/**
 * The best medal got on each course, by its id, kept in this browser: in
 * practice or in Endless.
 */
const STORAGE_KEY = 'scoopbus-run:medals'

type Medals = Record<string, Medal>

const isMedal = (value: unknown): value is Medal =>
	value === 'bronze' || value === 'silver' || value === 'gold'

function load(): Medals {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
		const medals: Medals = {}
		for (const [id, medal] of Object.entries(stored ?? {}))
			if (isMedal(medal)) medals[id] = medal
		return medals
	} catch {
		return {}
	}
}

const [medals, setMedals] = createSignal<Medals>(load())

/** The best medal got on a course, if any's been got. */
export const bestMedal = (courseId: string): Medal | undefined =>
	medals()[courseId]

/** `medal` got on a course: kept, if it's its best yet. Whether it is. */
export function award(courseId: string, medal: Medal) {
	if (!better(medal, bestMedal(courseId))) return false
	const next = { ...medals(), [courseId]: medal }
	setMedals(next)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Storage off: kept until the page is closed.
	}
	return true
}

/** For "Clear local data". */
export function forgetMedals() {
	setMedals({})
	try {
		localStorage.removeItem(STORAGE_KEY)
	} catch {
		// Storage off: nothing to forget.
	}
}
