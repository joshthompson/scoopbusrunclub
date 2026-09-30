import { addDays, toISODate } from '@shared/calendar/dates'
import { expandRecurringRaces } from '@shared/calendar/recurrence'
import { createSignal } from 'solid-js'
import type { RaceItem } from './api'

/**
 * The furbies' events: anything with "Förbi" or "Furby" in its name, in any
 * case, starting with Förbifartspremiären. They're out for a week from the day
 * of one.
 */
const FURBY_EVENT = /förbi|furby/iu
const FURBY_WEEK_DAYS = 7

/**
 * Every image in the furbys assets, so another furby joins the troupe just by
 * dropping `furby9.png` next to the others.
 */
export const furbyAssets = Object.entries(
	import.meta.glob('../assets/furbys/*.png', {
		eager: true,
		import: 'default',
	}) as Record<string, string>,
)
	.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
	.map(([, url]) => url)

/** Whether an event is one of the furbies'. */
export function isFurbyEvent(name: string) {
	return FURBY_EVENT.test(name.normalize('NFC'))
}

/**
 * Whether one of their events was today or in the six days before it. One that
 * repeats counts every time it comes round.
 */
export function isFurbyWeek(races: RaceItem[], today = toISODate(new Date())) {
	return expandRecurringRaces(races, { today }).some(
		(race) =>
			isFurbyEvent(race.name) &&
			race.date <= today &&
			today < addDays(race.date, FURBY_WEEK_DAYS),
	)
}

const [furbyWeek, setFurbyWeek] = createSignal(false)
/** Let out or put away by hand, and then left alone by the calendar. */
const [released, setReleased] = createSignal<boolean>()

/** Whether the furbies are out: their week, unless someone's said otherwise. */
export const furbysOn = () => released() ?? furbyWeek()

/** Report the club's events, which say whether it's the furbies' week. */
export function reportFurbyEvents(races: RaceItem[]) {
	setFurbyWeek(isFurbyWeek(races))
}

/** Let the furbies out, or put them away, whatever week it is. */
export function setFurbys(on: boolean) {
	setReleased(on)
}

declare global {
	interface Window {
		setFurbys: (on: boolean) => string
	}
}

/**
 * `setFurbys(true)` from the browser console to let the furbies out outside
 * their week, `setFurbys(false)` to put them away. Sticks until reload.
 */
if (typeof window !== 'undefined') {
	window.setFurbys = (on: boolean) => {
		setFurbys(on)
		return `furbys: ${on ? 'on' : 'off'}`
	}
}
