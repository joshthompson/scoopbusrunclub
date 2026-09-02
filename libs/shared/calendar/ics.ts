/**
 * The calendar as an iCalendar (.ics) feed.
 *
 * Everything here is built from the same {@link indexCalendarEntries} index the
 * website's calendar page draws, walked a day at a time exactly the way the
 * month grid walks it — so the standing Wednesday and the birthdays a day
 * generates for itself land in the feed too, and a change to the entry logic
 * shows up in both places at once.
 */

import {
	type CalendarEntry,
	type CalendarEntryKind,
	indexCalendarEntries,
	standingEntriesForDate,
	toISODate,
} from './entries'
import type { CalendarContext, CalendarSources } from './types'

/** Bumped when the feed's own wording or structure changes, to force a rebuild. */
export const ICS_FORMAT_VERSION = 1

const DEFAULT_SITE_ORIGIN = 'https://scoopbus.run'
const DEFAULT_DAYS_AHEAD = 365
const DEFAULT_REFRESH_HOURS = 6

export interface IcsOptions {
	/** Site the internal links point at, without a trailing slash. */
	siteOrigin?: string
	/** Calendar name, as calendar apps list it. */
	name?: string
	description?: string
	/** Timezone the dates are meant in. Every event is a whole day. */
	timezone?: string
	/** Only these kinds of entry. Defaults to all of them. */
	kinds?: CalendarEntryKind[]
	/** First day to include. Defaults to the earliest day with anything on it. */
	from?: string
	/**
	 * How far back to work out birthdays and the standing Wednesday. They exist
	 * for any date at all, and a subscriber has no use for a birthday from
	 * before the club existed, so they only run from here.
	 */
	standingFrom?: string
	/** How far past today to keep going. Data further out is still included. */
	daysAhead?: number
	/** How often subscribers should come back. */
	refreshHours?: number
	/** Today, in the club's own timezone. Defaults to the host's today. */
	today?: string
	/** Stamped on every event. Defaults to now. */
	generatedAt?: Date
}

// ---------- iCalendar plumbing ----------

/** Escape a value for a text property: RFC 5545 §3.3.11. */
function escapeText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n')
}

const encoder = new TextEncoder()

/**
 * Fold a content line to 75 octets, continuing with a leading space. Counted in
 * octets rather than characters because the emoji in our titles are several
 * octets each, and never split mid-character.
 */
function foldLine(line: string): string {
	if (encoder.encode(line).length <= 75) return line

	const pieces: string[] = []
	let current = ''
	let currentBytes = 0
	// The continuation space costs an octet, so later lines have 74 to play with.
	let budget = 75

	for (const char of line) {
		const size = encoder.encode(char).length
		if (currentBytes + size > budget) {
			pieces.push(current)
			current = ''
			currentBytes = 0
			budget = 74
		}
		current += char
		currentBytes += size
	}
	if (current) pieces.push(current)

	return pieces.join('\r\n ')
}

/** YYYYMMDD, as a whole-day DTSTART wants it. */
function icsDate(date: string): string {
	return date.replace(/-/g, '')
}

/** The UTC timestamp form, for DTSTAMP and friends. */
function icsTimestamp(date: Date): string {
	return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/** FNV-1a, so an entry keeps the same UID for as long as it says the same thing. */
function hash(value: string): string {
	let h = 0x811c9dc5
	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i)
		h = Math.imul(h, 0x01000193) >>> 0
	}
	return h.toString(16).padStart(8, '0')
}

// ---------- Dates ----------

/** The day after a YYYY-MM-DD, which is where a whole-day event ends. */
function nextDay(date: string): string {
	const [year, month, day] = date.split('-').map(Number)
	return toISODate(new Date(year, month - 1, day + 1))
}

function addDays(date: string, days: number): string {
	const [year, month, day] = date.split('-').map(Number)
	return toISODate(new Date(year, month - 1, day + days))
}

// ---------- Events ----------

/** What an entry says beyond its title: who was there, and where to read more. */
function eventDescription(entry: CalendarEntry, link: string | null): string[] {
	const lines: string[] = []
	const description = entry.tooltip ?? entry.detail
	if (description) lines.push(description)
	if (entry.people.length > 0) lines.push(entry.people.join(', '))
	if (entry.volunteers.length > 0)
		lines.push(`Volunteered: ${entry.volunteers.join(', ')}`)
	if (link) lines.push(link)
	return lines
}

function entryLink(entry: CalendarEntry, siteOrigin: string): string | null {
	if (entry.url) return entry.url
	if (entry.href) return `${siteOrigin}${entry.href}`
	return null
}

function eventLines(
	date: string,
	entry: CalendarEntry,
	options: { siteOrigin: string; stamp: string },
): string[] {
	const link = entryLink(entry, options.siteOrigin)
	const description = eventDescription(entry, link)
	const uid = `${date}-${entry.kind}-${hash(`${entry.name}|${entry.detail ?? ''}`)}@scoopbus.run`

	const lines = [
		'BEGIN:VEVENT',
		`UID:${uid}`,
		`DTSTAMP:${options.stamp}`,
		`DTSTART;VALUE=DATE:${icsDate(date)}`,
		`DTEND;VALUE=DATE:${icsDate(nextDay(date))}`,
		`SUMMARY:${escapeText(`${entry.emoji} ${entry.name}`)}`,
		'TRANSP:TRANSPARENT',
		`CATEGORIES:${escapeText(entry.kind)}`,
	]
	if (description.length > 0)
		lines.push(`DESCRIPTION:${escapeText(description.join('\n'))}`)
	if (link) lines.push(`URL:${link}`)
	lines.push('END:VEVENT')

	return lines
}

// ---------- The feed ----------

/**
 * The whole calendar as an .ics feed, ready to be served to anyone subscribed.
 */
export function buildCalendarIcs(
	sources: CalendarSources,
	ctx: CalendarContext,
	options: IcsOptions = {},
): string {
	const siteOrigin = options.siteOrigin ?? DEFAULT_SITE_ORIGIN
	const generatedAt = options.generatedAt ?? new Date()
	const stamp = icsTimestamp(generatedAt)
	const today = options.today ?? toISODate(generatedAt)
	const daysAhead = options.daysAhead ?? DEFAULT_DAYS_AHEAD
	const refreshHours = options.refreshHours ?? DEFAULT_REFRESH_HOURS
	const kinds = options.kinds ? new Set(options.kinds) : null

	const index = indexCalendarEntries(sources, ctx)
	const dates = Array.from(index.keys()).sort()

	const first = options.from ?? dates[0] ?? today
	const lastDated = dates[dates.length - 1] ?? today
	const horizon = addDays(today, daysAhead)
	const last = lastDated > horizon ? lastDated : horizon

	const dated: { date: string; entry: CalendarEntry }[] = []

	// Everything recorded, however far back it goes — the oldest parkrun a
	// member has to their name is the oldest thing on the calendar.
	for (const date of dates) {
		if (date < first || date > last) continue
		for (const entry of index.get(date) ?? []) {
			dated.push({ date, entry })
		}
	}

	// Birthdays and the standing Wednesday, over a window rather than all of
	// history: a year back, and as far ahead as the horizon. Recorded entries
	// can sit past it — a projected milestone years out, say — without dragging
	// a Wednesday a week along behind them.
	const standingFrom = options.standingFrom ?? addDays(today, -365)
	let date = standingFrom > first ? standingFrom : first
	while (date <= horizon) {
		for (const entry of standingEntriesForDate(index, date)) {
			dated.push({ date, entry })
		}
		date = nextDay(date)
	}

	dated.sort((a, b) => a.date.localeCompare(b.date))

	const body: string[] = []
	for (const { date: on, entry } of dated) {
		if (kinds && !kinds.has(entry.kind)) continue
		body.push(...eventLines(on, entry, { siteOrigin, stamp }))
	}

	const name = options.name ?? 'Scoop Bus Run Club'
	const description =
		options.description ??
		'parkruns, races, milestones and birthdays from the Scoop Bus Run Club'

	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Scoop Bus Run Club//Calendar//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${escapeText(name)}`,
		`X-WR-CALDESC:${escapeText(description)}`,
		`X-WR-TIMEZONE:${options.timezone ?? 'Europe/Stockholm'}`,
		// Both spellings: the standard one, and the one Apple and Outlook read.
		`REFRESH-INTERVAL;VALUE=DURATION:PT${refreshHours}H`,
		`X-PUBLISHED-TTL:PT${refreshHours}H`,
		...body,
		'END:VCALENDAR',
	]

	// RFC 5545 wants CRLF, and a trailing one to close the last line.
	return `${lines.map(foldLine).join('\r\n')}\r\n`
}
