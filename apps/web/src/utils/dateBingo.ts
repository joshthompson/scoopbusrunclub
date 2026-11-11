/**
 * Date Bingo: a parkrun on every day of the calendar.
 *
 * The card has a square per day of the year (MM-DD), and a parkrun fills the
 * square for the date it was run, whatever the year. 29 February is a square
 * too, though leaving it off is a popular house rule, so it can be dropped.
 *
 * The forecast — when the card could be finished at the earliest — only counts
 * Saturdays, since those are the runs that always happen. Each empty square's
 * next chance is the next year its date falls on a Saturday; the card is done
 * once the last of those has come round. Special days (New Year's Day,
 * Christmas Day, …) are shown as a bonus way to fill a square sooner.
 */

import { dateParts } from '@shared/calendar/dates'
import {
	type SpecialDayOccurrence,
	specialDaysInYear,
} from '@shared/calendar/special-days'

export const LEAP_DAY = '02-29'

/** Days in each month, in a leap year, so 29 February has a square. */
const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Every square on the card as MM-DD, from 01-01 to 12-31. */
export const DATE_SLOTS: string[] = MONTH_LENGTHS.flatMap((length, month) =>
	Array.from(
		{ length },
		(_, day) =>
			`${String(month + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`,
	),
)

/** The square a YYYY-MM-DD date fills. */
export function dateSlot(date: string): string {
	return date.slice(5)
}

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function isSaturday(date: string): boolean {
	const [year, month, day] = dateParts(date)
	return new Date(year, month - 1, day).getDay() === 6
}

/**
 * The first Saturday on or after `from` falling on the square's date. A date
 * comes round on a Saturday every 5, 6 or 11 years — 29 February every 28.
 */
export function nextSaturdayOn(slot: string, from: string): string {
	const [fromYear] = dateParts(from)
	for (let year = fromYear; year <= fromYear + 400; year++) {
		if (slot === LEAP_DAY && !isLeapYear(year)) continue
		const date = `${year}-${slot}`
		if (date >= from && isSaturday(date)) return date
	}
	throw new Error(`${slot} never falls on a Saturday`)
}

export interface DateBingoSquare<R> {
	slot: string // MM-DD
	/** Whether the square is on the card (29 February can be left off). */
	isCounted: boolean
	/** The runs on this date, oldest first. */
	runs: R[]
	/** Empty squares: the next Saturday on this date. */
	nextSaturday?: string
	/** Empty squares: a special day on this date that comes before that Saturday. */
	nextSpecial?: SpecialDayOccurrence
}

export interface DateBingoCard<R> {
	squares: Map<string, DateBingoSquare<R>>
	/** Squares on the card: 366, or 365 without 29 February. */
	total: number
	filled: number
	/** The date the card was first filled, if it has been. */
	completedOn: string | null
	/** The soonest the card can be finished on Saturdays alone; null if done. */
	completionDate: string | null
	/**
	 * The next Saturday that can't be missed: skip it and its square's next
	 * Saturday comes after `completionDate`, pushing the finish back.
	 */
	mustMake: string | null
	/**
	 * The soonest the card can be finished going to special days too: each
	 * square on whichever comes first, its special day or its Saturday. Null if
	 * done.
	 */
	completionDateWithSpecials: string | null
}

/**
 * Lay a runner's parkruns out on the card. `today` is where the forecast
 * starts: a Saturday today still counts, as its results may not be in yet.
 */
export function buildDateBingo<R extends { date: string }>(
	results: R[],
	options: { today: string; includeLeapDay: boolean },
): DateBingoCard<R> {
	const { today, includeLeapDay } = options
	const isCounted = (slot: string) => includeLeapDay || slot !== LEAP_DAY

	const squares = new Map<string, DateBingoSquare<R>>()
	for (const slot of DATE_SLOTS) {
		squares.set(slot, { slot, isCounted: isCounted(slot), runs: [] })
	}

	const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date))
	const total = DATE_SLOTS.filter(isCounted).length
	let filled = 0
	let completedOn: string | null = null
	for (const result of sorted) {
		const square = squares.get(dateSlot(result.date))
		if (!square) continue
		if (square.runs.length === 0 && square.isCounted) {
			filled++
			if (filled === total) completedOn = result.date
		}
		square.runs.push(result)
	}

	// Every square still to fill, by when its next Saturday comes.
	const empty = [...squares.values()]
		.filter((square) => square.isCounted && square.runs.length === 0)
		.map((square) => {
			square.nextSaturday = nextSaturdayOn(square.slot, today)
			return square as DateBingoSquare<R> & { nextSaturday: string }
		})
		.sort((a, b) => a.nextSaturday.localeCompare(b.nextSaturday))

	// Special days only matter before the square's Saturday comes round, so
	// the latest of those is as far ahead as we need to look.
	const lastSaturday = empty.at(-1)?.nextSaturday
	if (lastSaturday) {
		const [fromYear] = dateParts(today)
		const [untilYear] = dateParts(lastSaturday)
		for (let year = fromYear; year <= untilYear; year++) {
			for (const special of specialDaysInYear(year)) {
				if (special.date < today || isSaturday(special.date)) continue
				const square = squares.get(dateSlot(special.date))
				if (
					square?.nextSaturday &&
					!square.nextSpecial &&
					special.date < square.nextSaturday
				) {
					square.nextSpecial = special
				}
			}
		}
	}

	const last = empty.at(-1)
	const completionDate = last?.nextSaturday ?? null

	let mustMake: string | null = null
	if (completionDate) {
		for (const square of empty) {
			const after = nextSaturdayOn(
				square.slot,
				`${dateParts(square.nextSaturday)[0] + 1}-01-01`,
			)
			if (after > completionDate) {
				mustMake = square.nextSaturday
				break
			}
		}
	}

	// A square's special day is only kept when it beats its Saturday, so it's
	// that square's first chance whenever there is one.
	let completionDateWithSpecials: string | null = null
	for (const square of empty) {
		const firstChance = square.nextSpecial?.date ?? square.nextSaturday
		if (!completionDateWithSpecials || firstChance > completionDateWithSpecials)
			completionDateWithSpecials = firstChance
	}

	return {
		squares,
		total,
		filled,
		completedOn,
		completionDate,
		mustMake,
		completionDateWithSpecials,
	}
}
