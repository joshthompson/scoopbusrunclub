/**
 * Events that happen again.
 *
 * An event record is a single date, and a recurrence turns that date into the
 * first of a series — the club's Wednesday track session is one record that
 * lands on every Wednesday after it. The repeats are worked out wherever the
 * events are read rather than written into the database, so a series stays one
 * row to edit and never fills the table with copies of itself.
 *
 * Repeats run to a horizon a year out: an open-ended series has to stop
 * somewhere, and there is nothing worth scrolling a year ahead to see.
 */

import { addDays, dateParts, toISODate } from './dates'
import type { RaceSource } from './types'

/** How often a repeat comes round. */
export type RecurrenceFreq = 'weekly' | 'monthly' | 'yearly'

export interface RecurrenceSource {
	freq: RecurrenceFreq
	/** Every N weeks/months/years. One when left out. */
	interval?: number
	/** The last date it can land on. Open-ended when left out. */
	until?: string
}

/** How far past today an open-ended series is worked out. */
export const RECURRENCE_HORIZON_DAYS = 365

/**
 * A race as it lands on one date: either the record itself, or one of the
 * repeats generated from it.
 */
export type RaceOccurrence<T extends RaceSource = RaceSource> = T & {
	/** The `_id` of the record this repeats, on the repeats only. */
	repeatOf?: string
}

const FREQ_LABELS: Record<RecurrenceFreq, [one: string, many: string]> = {
	weekly: ['week', 'weeks'],
	monthly: ['month', 'months'],
	yearly: ['year', 'years'],
}

/** "Every 2 weeks", for the admin list and the event form. */
export function describeRecurrence(recurrence: RecurrenceSource): string {
	const interval = Math.max(1, Math.round(recurrence.interval ?? 1))
	const [one, many] = FREQ_LABELS[recurrence.freq]
	const every = interval === 1 ? `Every ${one}` : `Every ${interval} ${many}`
	return recurrence.until ? `${every} until ${recurrence.until}` : every
}

/**
 * The date `count` steps on from the start, or null where the calendar has no
 * such day — the 31st of a 30-day month, the 29th of February in a common
 * year. A skipped step simply isn't an occurrence; the series carries on.
 */
function stepFrom(
	start: string,
	freq: RecurrenceFreq,
	count: number,
): string | null {
	if (freq === 'weekly') return addDays(start, count * 7)

	const [year, month, day] = dateParts(start)
	const shifted =
		freq === 'monthly'
			? new Date(year, month - 1 + count, day)
			: new Date(year + count, month - 1, day)
	// Date rolls an impossible day into the next month — 31 April becomes 1 May.
	return shifted.getDate() === day ? toISODate(shifted) : null
}

/**
 * Every date a series lands on within a window, the first one included.
 *
 * `to` is where the caller has decided to stop looking; `until` stops the
 * series itself, and whichever comes first wins.
 */
export function occurrenceDates(
	start: string,
	recurrence: RecurrenceSource,
	window: { from?: string; to: string },
): string[] {
	const interval = Math.max(1, Math.round(recurrence.interval ?? 1))
	const last =
		recurrence.until && recurrence.until < window.to
			? recurrence.until
			: window.to

	const dates: string[] = []
	// Steps that fall on no real day are skipped rather than ending the series,
	// so the loop is bounded by a count rather than by reaching the horizon.
	for (let step = 0; step < 4000; step += interval) {
		const date = stepFrom(start, recurrence.freq, step)
		if (date === null) continue
		if (date > last) break
		if (!window.from || date >= window.from) dates.push(date)
	}
	return dates
}

/** Whether a series still has a date to come on or after `date`. */
export function repeatsOnOrAfter(
	race: { date: string; recurrence?: RecurrenceSource | null },
	date: string,
): boolean {
	if (race.date >= date) return true
	if (!race.recurrence) return false
	return !race.recurrence.until || race.recurrence.until >= date
}

// ---------- Expansion ----------

/**
 * Every event as the dates it actually falls on: the one-offs untouched, and
 * each recurring event followed by its repeats out to the horizon.
 *
 * A repeat carries the record's name, type and time but none of its people —
 * who turned up to the first Wednesday says nothing about next Wednesday. The
 * turnout for a later one is recorded as an event of its own, which then stands
 * in place of the repeat (see {@link withoutClashingRepeats}).
 */
export function expandRecurringRaces<T extends RaceSource>(
	races: T[],
	options: { today: string; horizonDays?: number },
): RaceOccurrence<T>[] {
	const horizon = addDays(
		options.today,
		options.horizonDays ?? RECURRENCE_HORIZON_DAYS,
	)

	const expanded: RaceOccurrence<T>[] = []
	for (const race of races) {
		if (!race.recurrence) {
			expanded.push(race)
			continue
		}
		for (const date of occurrenceDates(race.date, race.recurrence, {
			to: horizon,
		})) {
			if (date === race.date) {
				expanded.push(race)
				continue
			}
			const repeat: RaceOccurrence<T> = {
				...race,
				_id: `${race._id}#${date}`,
				date,
				attendees: [],
				repeatOf: race._id,
			}
			// Guests are carried on the website's richer race shape rather than on
			// `RaceSource`, and they belong to the day they turned up on too.
			if ('guests' in repeat) (repeat as { guests?: unknown[] }).guests = []
			expanded.push(repeat)
		}
	}
	return expanded
}

/**
 * Repeats dropped where the day already has the real thing.
 *
 * Once a session has been written up as its own event — with who came, and
 * often a name of its own — the repeat standing in for it is noise. The event
 * is recognised as the same standing thing by its type, or failing that by its
 * name, so a renamed one still wins.
 */
export function withoutClashingRepeats<T extends RaceOccurrence>(
	races: T[],
): T[] {
	const recorded = new Set<string>()
	for (const race of races) {
		if (race.repeatOf) continue
		if (race.type) recorded.add(`${race.date}|type|${race.type}`)
		recorded.add(`${race.date}|name|${race.name}`)
	}

	return races.filter((race) => {
		if (!race.repeatOf) return true
		if (race.type && recorded.has(`${race.date}|type|${race.type}`))
			return false
		return !recorded.has(`${race.date}|name|${race.name}`)
	})
}
