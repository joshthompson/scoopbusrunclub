import { type RunnerName, runners } from '@/data/runners'
import type {
	GuestResultItem,
	RaceItem,
	RunResultItem,
	Runner,
	VolunteerItem,
} from './api'
import {
	journeyMilestoneDetail,
	journeyMilestoneShortDetail,
	journeyMilestoneTitle,
	journeyMilestones,
} from './journey'
import { getMemberRoute } from './memberRoute'
import {
	MILESTONE_SET,
	nextMilestone,
	ordinalSuffix,
	projectedMilestoneDate,
} from './milestones'
import { formatName } from './misc'
import { isParkrunTrip, withoutReportedTrips } from './parkrunTrips'
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

export type CalendarEntryKind =
	| 'parkrun'
	| 'race'
	| 'birthday'
	| 'milestone'
	| 'distance'

export interface CalendarEntry {
	kind: CalendarEntryKind
	emoji: string
	name: string
	/** A line under the name, for entries that describe themselves. */
	detail?: string
	/** Fuller wording for the tooltip, where the cell only has room for `detail`. */
	tooltip?: string
	/** Internal route this entry links to, if any. */
	href?: string
	/** External website, for races that link out instead. */
	url?: string
	/** The race's type, for races — used to spot recurring events like Track and Food. */
	raceType?: string
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
/** MM-DD → members with a birthday that day, with their member page route. */
const birthdaysByMonthDay = new Map<string, { name: string; href: string }[]>()

for (const [runnerKey, [runner]] of Object.entries(runners)) {
	const data = runner()
	if (data.id) parkrunIdToRunnerName.set(data.id, data.name)
	const [day, month] = data.birthday.split('/')
	const key = `${month}-${day}`
	// MemberPage resolves the route param case-insensitively, so lowercase is safe.
	const member = { name: data.name, href: `/member/${runnerKey.toLowerCase()}` }
	const existing = birthdaysByMonthDay.get(key)
	if (existing) existing.push(member)
	else birthdaysByMonthDay.set(key, [member])
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
	/** Run totals, used to work out which run was a milestone and when the next is due */
	runners?: Runner[]
}

/**
 * Milestone runs — the ones already done, dated from the results, plus each
 * member's next one on the Saturday it could land.
 *
 * parkrun's run total is the source of truth, and our results only go back so
 * far, so the newest result is treated as run number `totalRuns` and earlier
 * ones counted back from there.
 */
function milestoneEntries(
	results: RunResultItem[],
	runners: Runner[],
): { date: string; entry: CalendarEntry }[] {
	const byRunner = new Map<string, RunResultItem[]>()
	for (const result of results) {
		const existing = byRunner.get(result.parkrunId)
		if (existing) existing.push(result)
		else byRunner.set(result.parkrunId, [result])
	}

	const latestDate = results.reduce(
		(latest, result) => (result.date > latest ? result.date : latest),
		'',
	)

	const entries: { date: string; entry: CalendarEntry }[] = []

	for (const runner of runners) {
		const history = (byRunner.get(runner.parkrunId) ?? []).sort((a, b) =>
			a.date.localeCompare(b.date),
		)
		if (history.length === 0) continue

		const name = memberName(runner.parkrunId, runner.name)
		const href = getMemberRoute(runner.parkrunId, runner.name) ?? undefined
		const runsBeforeHistory = runner.totalRuns - history.length

		history.forEach((result, index) => {
			const runNumber = runsBeforeHistory + index + 1
			if (!MILESTONE_SET.has(runNumber)) return
			entries.push({
				date: result.date,
				entry: {
					kind: 'milestone',
					emoji: '🎉',
					name: `${name}'s ${ordinalSuffix(runNumber)} parkrun`,
					href,
					people: [],
					volunteers: [],
				},
			})
		})

		const next = nextMilestone(runner.totalRuns)
		if (next === null) continue
		const projected = projectedMilestoneDate(
			next - runner.totalRuns,
			latestDate,
		)
		if (!projected) continue
		entries.push({
			date: toISODate(projected),
			entry: {
				kind: 'milestone',
				emoji: '🎯',
				name: `${name}'s ${ordinalSuffix(next)} parkrun?`,
				href,
				people: [],
				volunteers: [],
			},
		})
	}

	return entries
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

	for (const milestone of milestoneEntries(
		sources.results,
		sources.runners ?? [],
	)) {
		push(milestone.date, milestone.entry)
	}

	for (const milestone of journeyMilestones(sources.results)) {
		push(milestone.date, {
			kind: 'distance',
			emoji: '🚌',
			name: journeyMilestoneTitle(milestone.waypoint),
			detail: journeyMilestoneShortDetail(milestone.waypoint),
			tooltip: journeyMilestoneDetail(milestone.waypoint),
			href: '/everyone',
			people: [],
			volunteers: [],
		})
	}

	// Trips parkrun has already reported are covered by the results above.
	const races = withoutReportedTrips(
		sources.races,
		sources.results,
		sources.volunteers,
	)

	for (const race of races) {
		push(race.date, {
			kind: 'race',
			emoji: raceEmoji(race),
			name: race.name,
			raceType: race.type,
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
	if (isParkrunTrip(race)) return '🚌'
	if (race.type === 'Track and Food') return '🏟️'
	if (race.majorEvent) return '🔥'
	return '🏅'
}

/**
 * Birthday entries for a given YYYY-MM-DD — one per member, so each links to
 * its own member page.
 */
export function birthdayEntries(date: string): CalendarEntry[] {
	const birthdays = birthdaysByMonthDay.get(date.slice(5)) ?? []
	return birthdays.map((member) => ({
		kind: 'birthday',
		emoji: '🎂',
		name: `${member.name}'s birthday`,
		href: member.href,
		people: [],
		volunteers: [],
	}))
}

const TRACK_AND_FOOD = 'Track and Food'
/** Nothing before this — the club's Wednesdays only became a standing thing here. */
const TRACK_AND_FOOD_FROM = '2025-07-01'

/**
 * Track and Food is on every Wednesday, so the calendar shows one whether or not
 * anybody has recorded it. A real event that day wins, even when it's been given
 * its own name, so the standing entry never doubles up on it.
 */
function trackAndFoodEntries(
	date: string,
	recorded: CalendarEntry[],
): CalendarEntry[] {
	if (date < TRACK_AND_FOOD_FROM) return []
	if (parseISODate(date).getDay() !== 3) return []
	if (recorded.some((entry) => entry.raceType === TRACK_AND_FOOD)) return []
	return [
		{
			kind: 'race',
			emoji: '🏟️',
			name: TRACK_AND_FOOD,
			raceType: TRACK_AND_FOOD,
			people: [],
			volunteers: [],
		},
	]
}

/** Everything on a given day: what was recorded, plus the entries we assume. */
function entriesForDate(
	entriesByDate: Map<string, CalendarEntry[]>,
	date: string,
): CalendarEntry[] {
	const recorded = entriesByDate.get(date) ?? []
	return [
		...recorded,
		...trackAndFoodEntries(date, recorded),
		...birthdayEntries(date),
	]
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
		const entries = entriesForDate(entriesByDate, date)
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
		const entries = entriesForDate(entriesByDate, iso)

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
