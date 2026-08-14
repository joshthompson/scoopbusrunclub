import { type RunnerName, runners } from '@/data/runners'
import type {
	GuestResultItem,
	RaceItem,
	RunResultItem,
	VolunteerItem,
} from './api'
import { formatName } from './misc'
import { getSpecialDayName } from './special-days'

/** Weekday column headers, Monday-first (the week as Sweden counts it). */
export const WEEKDAY_LABELS = [
	'Mon',
	'Tue',
	'Wed',
	'Thu',
	'Fri',
	'Sat',
	'Sun',
] as const

export type CalendarEntryKind = 'parkrun' | 'race' | 'birthday'

export interface CalendarEntry {
	kind: CalendarEntryKind
	emoji: string
	name: string
	/** Internal route this entry links to, if any. */
	href?: string
	/** External website, for races that link out instead. */
	url?: string
	/** Members (and guests) who took part, in finishing order where known. */
	people: string[]
	/** Members who volunteered rather than ran. */
	volunteers: string[]
}

export interface CalendarDay {
	/** YYYY-MM-DD, in local time. */
	date: string
	dayOfMonth: number
	/** False for the leading/trailing days that pad the grid to whole weeks. */
	inMonth: boolean
	isToday: boolean
	isFuture: boolean
	/** Name of the special (non-Saturday) parkrun day, if this is one. */
	specialName: string | null
	entries: CalendarEntry[]
}

/** Format a Date as YYYY-MM-DD using local time (never UTC — dates shift). */
export function toISODate(date: Date): string {
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${date.getFullYear()}-${month}-${day}`
}

/** Parse a YYYY-MM-DD string as local midnight. */
export function parseISODate(date: string): Date {
	return new Date(`${date}T00:00:00`)
}

/** A "YYYY-MM" month key, as used in the ?month= search param. */
export function toMonthKey(year: number, month: number): string {
	return `${year}-${`${month + 1}`.padStart(2, '0')}`
}

/**
 * Read a "YYYY-MM" month key. Returns null for anything unparseable so the
 * caller can fall back to the current month.
 */
export function parseMonthKey(
	key: string | undefined,
): { year: number; month: number } | null {
	if (!key) return null
	const match = /^(\d{4})-(\d{2})$/.exec(key)
	if (!match) return null
	const year = Number(match[1])
	const month = Number(match[2]) - 1
	if (month < 0 || month > 11) return null
	return { year, month }
}

export function formatMonthTitle(year: number, month: number): string {
	return new Date(year, month, 1).toLocaleString('en-GB', {
		month: 'long',
		year: 'numeric',
	})
}

// ---------- Name lookups ----------

const parkrunIdToRunnerName = new Map<string, string>()
/** MM-DD → member names with a birthday that day. */
const birthdaysByMonthDay = new Map<string, string[]>()

for (const [, [runner]] of Object.entries(runners)) {
	const data = runner()
	if (data.id) parkrunIdToRunnerName.set(data.id, data.name)
	const [day, month] = data.birthday.split('/')
	const key = `${month}-${day}`
	const existing = birthdaysByMonthDay.get(key)
	if (existing) existing.push(data.name)
	else birthdaysByMonthDay.set(key, [data.name])
}

function memberName(parkrunId: string, fallback: string): string {
	return parkrunIdToRunnerName.get(parkrunId) ?? formatName(fallback)
}

function raceAttendeeName(runnerId: string): string {
	return runners[runnerId as RunnerName]?.[0]()?.name ?? formatName(runnerId)
}

// ---------- Entry index ----------

interface ParkrunGroup {
	eventId: string
	eventName: string
	results: { name: string; position: number }[]
	guests: { name: string; position: number }[]
	volunteers: string[]
}

export interface CalendarSources {
	results: RunResultItem[]
	volunteers: VolunteerItem[]
	guestResults: GuestResultItem[]
	races: RaceItem[]
}

/**
 * Index every parkrun and race we know about by date, so building a month is
 * just a lookup per day. Birthdays repeat every year, so they're added while
 * building the month rather than indexed here.
 */
export function indexCalendarEntries(
	sources: CalendarSources,
): Map<string, CalendarEntry[]> {
	const parkruns = new Map<string, Map<string, ParkrunGroup>>()

	const group = (date: string, eventId: string, eventName: string) => {
		let byEvent = parkruns.get(date)
		if (!byEvent) {
			byEvent = new Map()
			parkruns.set(date, byEvent)
		}
		let entry = byEvent.get(eventId)
		if (!entry) {
			entry = { eventId, eventName, results: [], guests: [], volunteers: [] }
			byEvent.set(eventId, entry)
		}
		return entry
	}

	for (const result of sources.results) {
		group(result.date, result.event, result.eventName).results.push({
			name: memberName(result.parkrunId, result.runnerName),
			position: result.position,
		})
	}

	for (const volunteer of sources.volunteers) {
		group(volunteer.date, volunteer.event, volunteer.eventName).volunteers.push(
			memberName(volunteer.parkrunId, volunteer.volunteerName),
		)
	}

	for (const guest of sources.guestResults) {
		group(guest.date, guest.event, guest.eventName).guests.push({
			name: formatName(guest.guestName),
			position: guest.position,
		})
	}

	const byDate = new Map<string, CalendarEntry[]>()
	const push = (date: string, entry: CalendarEntry) => {
		const existing = byDate.get(date)
		if (existing) existing.push(entry)
		else byDate.set(date, [entry])
	}

	for (const [date, byEvent] of parkruns) {
		// Busiest event first — that's the one the club actually turned out for.
		const sorted = Array.from(byEvent.values()).sort(
			(a, b) => b.results.length - a.results.length,
		)
		for (const parkrun of sorted) {
			const people = [...parkrun.results, ...parkrun.guests]
				.sort((a, b) => a.position - b.position)
				.map((person) => person.name)
			push(date, {
				kind: 'parkrun',
				emoji: '🏃',
				name: parkrunEventLabel(parkrun.eventName),
				href: `/event/${parkrun.eventId}`,
				people,
				volunteers: parkrun.volunteers,
			})
		}
	}

	for (const race of sources.races) {
		push(race.date, {
			kind: 'race',
			emoji: raceEmoji(race),
			name: race.name,
			url: race.website,
			people: race.attendees.map((attendee) =>
				raceAttendeeName(attendee.runnerId),
			),
			volunteers: [],
		})
	}

	return byDate
}

function parkrunEventLabel(eventName: string): string {
	return eventName === 'Bushy Park' ? 'Scoop Bushy Park' : eventName
}

function raceEmoji(race: RaceItem): string {
	if (race.type === 'Track and Food') return '🏟️'
	if (race.majorEvent) return '🔥'
	return '🏅'
}

/** The birthday entry for a given YYYY-MM-DD, if anyone has one that day. */
export function birthdayEntry(date: string): CalendarEntry | null {
	const birthdays = birthdaysByMonthDay.get(date.slice(5))
	if (!birthdays) return null
	return {
		kind: 'birthday',
		emoji: '🎂',
		name: birthdays.length > 1 ? 'Birthdays' : `${birthdays[0]}'s birthday`,
		people: birthdays,
		volunteers: [],
	}
}

/**
 * The next few days with something on them, looking beyond the displayed month
 * so the page can always say what's coming up.
 */
export function upcomingCalendarDays(
	entriesByDate: Map<string, CalendarEntry[]>,
	options: { days?: number; max?: number } = {},
): { date: string; entries: CalendarEntry[] }[] {
	const { days = 90, max = 5 } = options
	const today = new Date()
	const upcoming: { date: string; entries: CalendarEntry[] }[] = []

	for (let offset = 0; offset < days && upcoming.length < max; offset++) {
		const date = toISODate(
			new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset),
		)
		const entries = [...(entriesByDate.get(date) ?? [])]
		const birthday = birthdayEntry(date)
		if (birthday) entries.push(birthday)
		if (entries.length > 0) upcoming.push({ date, entries })
	}

	return upcoming
}

// ---------- Month grid ----------

/**
 * Build the weeks of a month as a Monday-first grid, padded with the
 * neighbouring months' days so every row holds seven cells.
 */
export function buildCalendarMonth(
	year: number,
	month: number,
	entriesByDate: Map<string, CalendarEntry[]>,
): CalendarDay[][] {
	const today = toISODate(new Date())
	const firstOfMonth = new Date(year, month, 1)
	// getDay() is Sunday-first; shift it so Monday is column 0.
	const leading = (firstOfMonth.getDay() + 6) % 7
	const daysInMonth = new Date(year, month + 1, 0).getDate()
	const cellCount = Math.ceil((leading + daysInMonth) / 7) * 7

	const weeks: CalendarDay[][] = []
	for (let cell = 0; cell < cellCount; cell++) {
		const date = new Date(year, month, cell - leading + 1)
		const iso = toISODate(date)
		const inMonth = date.getMonth() === month && date.getFullYear() === year
		const entries = [...(entriesByDate.get(iso) ?? [])]

		const birthday = birthdayEntry(iso)
		if (birthday) entries.push(birthday)

		const day: CalendarDay = {
			date: iso,
			dayOfMonth: date.getDate(),
			inMonth,
			isToday: iso === today,
			isFuture: iso > today,
			specialName: getSpecialDayName(iso),
			entries,
		}

		if (cell % 7 === 0) weeks.push([day])
		else weeks[weeks.length - 1].push(day)
	}

	return weeks
}
