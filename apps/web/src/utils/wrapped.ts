import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/data/countries'
import { runners as runnerSignals } from '@/data/runners'
import { RoleTranslations } from '@/data/volunteer-roles'
import type {
	GuestItem,
	GuestResultItem,
	LargestClubSnapshot,
	RaceItem,
	RunResultItem,
	Runner,
	VolunteerItem,
} from '@/utils/api'
import { getEvent, getEventName } from '@/utils/events'
import {
	JUNIOR_PARKRUN_DISTANCE_KM,
	PARKRUN_DISTANCE_KM,
	isJuniorEvent,
	journeyMilestones,
} from '@/utils/journey'
import { SCOOP_BUS_CLUB_NAME } from '@/utils/largestClubs'
import { formatName, parseTimeToSeconds } from '@/utils/misc'
import { MILESTONE_SET } from '@shared/calendar/milestones'

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** The year Scoop Bus Run Club started — its joiners are founding members. */
export const CLUB_FOUNDED_YEAR = 2025

/** parkrunId → the club member it belongs to. Also our "is a member" test. */
export const parkrunIdToMeta = new Map<string, { name: string; key: string }>()
/** RunnerName key → display name, for races (which key on the name, not the id). */
const runnerKeyToMeta = new Map<string, { name: string; parkrunId: string }>()
/**
 * The roster in declaration order, for "who joined when". Keyed on the runner
 * key rather than parkrunId, because a member can have no parkrun id of their
 * own (Link runs on Alisa's) and still have joined the club.
 */
const clubRoster: {
	key: string
	name: string
	parkrunId: string
	joined: number
}[] = []
for (const [key, [runner]] of Object.entries(runnerSignals)) {
	const data = runner()
	if (data.id) parkrunIdToMeta.set(data.id, { name: data.name, key })
	runnerKeyToMeta.set(key, { name: data.name, parkrunId: data.id })
	clubRoster.push({
		key,
		name: data.name,
		parkrunId: data.id,
		joined: data.joined,
	})
}

const roleTranslations = RoleTranslations as Record<string, string>

/** Swedish role names as scraped; English is what we show. */
function translateRole(role: string): string {
	return roleTranslations[role] ?? role
}

function isRunDirector(role: string): boolean {
	return role === 'Loppansvarig' || translateRole(role) === 'Run Director'
}

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The longest run of appearances exactly a week apart. Junior parkruns fall on
 * a Sunday, so they naturally sit outside a Saturday chain rather than
 * splitting it in two.
 */
function longestWeeklyStreak(dates: Iterable<string>): number {
	const sorted = Array.from(new Set(dates)).sort()
	let best = 0
	let current = 0
	let previous: number | null = null
	for (const date of sorted) {
		const time = Date.parse(`${date}T00:00:00Z`)
		if (!Number.isFinite(time)) continue
		current =
			previous !== null && time - previous === 7 * DAY_MS ? current + 1 : 1
		previous = time
		if (current > best) best = current
	}
	return best
}

const VOLUNTEER_MILESTONE_SET = new Set([
	1, 5, 10, 25, 50, 100, 150, 200, 250, 500,
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WrappedInput {
	year: number
	/** Every result we hold, all years — prior years are needed for "first ever". */
	results: RunResultItem[]
	runners: Runner[]
	/** Every volunteer shift we hold, all years. */
	volunteers: VolunteerItem[]
	races: RaceItem[]
	guests: GuestItem[]
	guestResults: GuestResultItem[]
	/** Weekly league-table snapshots, all weeks we hold. */
	clubSnapshots: LargestClubSnapshot[]
}

export interface WrappedStats {
	year: number
	hasData: boolean
	totalRuns: number
	totalJuniorRuns: number
	totalDistanceKm: number
	uniqueEvents: number
	uniqueCountries: number
	volunteerSessions: number
	activeSaturdays: number
	activeMembers: number

	// Fun facts
	busiestSaturday: {
		date: string
		count: number
		events: { name: string; eventNumber: number }[]
	} | null
	mostExploredMember: { names: string[]; events: number } | null
	mostVolunteeredMember: { names: string[]; count: number } | null
	newEventsDiscovered: number
	closeFinishes: number
	mostCommonCloseFinishPair: {
		nameA: string
		nameB: string
		count: number
	} | null

	// Per-member summaries
	memberStats: {
		parkrunId: string
		name: string
		runs: number
		events: number
		newEvents: number
		volunteered: number
		roles: number
		pbImprovement: number // seconds improved, 0 if no PB
	}[]

	// Top new events
	newEventsList: {
		eventId: string
		name: string
		country: string
		discoveredBy: string
	}[]

	// Members who debuted this year (first-ever parkrun result)
	debutMembers: { parkrunId: string; name: string; key: string; date: string }[]

	/** Members who joined Scoop Bus this year, in roster order. */
	clubJoiners: { key: string; name: string; parkrunId: string }[]
	/** True for the club's founding year, when the joiners are the founders. */
	isFoundingYear: boolean

	// PBs
	totalPBs: number
	biggestPBImprover: { name: string; secondsSaved: number } | null

	// Biggest scoop bus trip (non-Haga event with most members)
	biggestTrip: {
		date: string
		event: string
		eventName: string
		eventNumber: number
		count: number
	} | null

	// Biggest Haga event
	biggestHaga: { date: string; eventNumber: number; count: number } | null

	// New countries ran in this year (not visited in any prior year)
	newCountries: {
		code: string
		flag: string
		name: string
		eventName: string
	}[]

	// --- Volunteering ---

	/** Members whose first-ever Run Director shift landed this year. */
	runDirectorDebuts: {
		parkrunId: string
		name: string
		key: string
		date: string
		eventName: string
		eventNumber: number
	}[]
	/** Every (member, role) pair done for the first time this year. */
	newRoleTries: {
		parkrunId: string
		name: string
		role: string
		date: string
	}[]
	/** How many distinct members appear in `newRoleTries`. */
	newRoleMemberCount: number
	/** Distinct roles the club covered this year. */
	rolesCovered: number
	mostCommonRole: { role: string; count: number } | null
	/** Member(s) who covered the most distinct roles this year. */
	roleCollector: { names: string[]; roles: number } | null
	/** Volunteer-count milestones (1st, 5th, 10th…) reached this year. */
	volunteerMilestones: { name: string; count: number; date: string }[]

	// --- Run milestones ---

	/** Run-count milestones (10th, 25th, 50th…) reached this year. */
	runMilestones: { name: string; runNumber: number; date: string }[]

	/**
	 * Waypoints on the journey out of Stockholm that the club's all-time
	 * distance passed this year, in the order they were reached.
	 */
	distanceMilestones: { label: string; km: number; date: string }[]

	// --- Performance ---

	fastestRun: {
		name: string
		time: string
		eventName: string
		date: string
	} | null
	busiestMonth: { month: string; runs: number } | null
	longestStreak: { names: string[]; weeks: number } | null

	// --- Largest club league table ---

	clubLeague: {
		startWeek: string
		endWeek: string
		startRank: number
		endRank: number
		startRuns: number
		endRuns: number
		startMembers: number
		endMembers: number
		/** Clubs ahead of us at the start of the year and behind us at the end. */
		overtaken: string[]
		becameLargest: boolean
		isLargest: boolean
	} | null

	// --- Guests ---

	guestCount: number
	guestAppearances: number
	topGuest: { name: string; count: number } | null
	newGuests: string[]

	// --- Races beyond parkrun ---

	raceCount: number
	raceEntries: number
	raceKm: number
	biggestRace: { name: string; date: string; count: number } | null
	longestRace: {
		name: string
		date: string
		distanceKm: number
		names: string[]
	} | null
}

/** Roster members whose `joined` year matches, in declaration order. */
function clubJoinersFor(year: number): WrappedStats['clubJoiners'] {
	return clubRoster
		.filter((member) => member.joined === year)
		.map(({ key, name, parkrunId }) => ({ key, name, parkrunId }))
}

function emptyStats(year: number): WrappedStats {
	return {
		year,
		hasData: false,
		totalRuns: 0,
		totalJuniorRuns: 0,
		totalDistanceKm: 0,
		uniqueEvents: 0,
		uniqueCountries: 0,
		volunteerSessions: 0,
		activeSaturdays: 0,
		activeMembers: 0,
		busiestSaturday: null,
		mostExploredMember: null,
		mostVolunteeredMember: null,
		newEventsDiscovered: 0,
		closeFinishes: 0,
		mostCommonCloseFinishPair: null,
		memberStats: [],
		newEventsList: [],
		debutMembers: [],
		clubJoiners: clubJoinersFor(year),
		isFoundingYear: year === CLUB_FOUNDED_YEAR,
		totalPBs: 0,
		biggestPBImprover: null,
		biggestTrip: null,
		biggestHaga: null,
		newCountries: [],
		runDirectorDebuts: [],
		newRoleTries: [],
		newRoleMemberCount: 0,
		rolesCovered: 0,
		mostCommonRole: null,
		roleCollector: null,
		volunteerMilestones: [],
		runMilestones: [],
		distanceMilestones: [],
		fastestRun: null,
		busiestMonth: null,
		longestStreak: null,
		clubLeague: null,
		guestCount: 0,
		guestAppearances: 0,
		topGuest: null,
		newGuests: [],
		raceCount: 0,
		raceEntries: 0,
		raceKm: 0,
		biggestRace: null,
		longestRace: null,
	}
}

// ---------------------------------------------------------------------------
// Volunteering
// ---------------------------------------------------------------------------

interface VolunteerStats {
	runDirectorDebuts: WrappedStats['runDirectorDebuts']
	newRoleTries: WrappedStats['newRoleTries']
	newRoleMemberCount: number
	rolesCovered: number
	mostCommonRole: WrappedStats['mostCommonRole']
	roleCollector: WrappedStats['roleCollector']
	volunteerMilestones: WrappedStats['volunteerMilestones']
	/** parkrunId → distinct roles covered this year, for the member cards. */
	memberRoleCounts: Map<string, number>
}

function computeVolunteerStats(
	yearStr: string,
	allVolunteers: VolunteerItem[],
): VolunteerStats {
	const byMember = new Map<string, VolunteerItem[]>()
	for (const v of allVolunteers) {
		if (!parkrunIdToMeta.has(v.parkrunId)) continue
		const list = byMember.get(v.parkrunId)
		if (list) list.push(v)
		else byMember.set(v.parkrunId, [v])
	}

	const runDirectorDebuts: WrappedStats['runDirectorDebuts'] = []
	const newRoleTries: WrappedStats['newRoleTries'] = []
	const volunteerMilestones: WrappedStats['volunteerMilestones'] = []
	const memberRoleCounts = new Map<string, number>()
	const roleCounts = new Map<string, number>()
	const rolesCoveredSet = new Set<string>()

	for (const [parkrunId, shifts] of byMember) {
		const meta = parkrunIdToMeta.get(parkrunId)
		if (!meta) continue
		shifts.sort(
			(a, b) => a.date.localeCompare(b.date) || a.eventNumber - b.eventNumber,
		)

		// Roles seen before this year, so "new" means new to them, not new this year.
		const seenRoles = new Set<string>()
		const seenThisYear = new Set<string>()
		let hadRunDirected = false
		let recordedDebut = false

		for (let i = 0; i < shifts.length; i++) {
			const shift = shifts[i]
			const inYear = shift.date.startsWith(yearStr)

			if (inYear && VOLUNTEER_MILESTONE_SET.has(i + 1)) {
				volunteerMilestones.push({
					name: meta.name,
					count: i + 1,
					date: shift.date,
				})
			}

			for (const rawRole of shift.roles) {
				const role = translateRole(rawRole)

				if (inYear) {
					rolesCoveredSet.add(role)
					roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1)
					if (!seenRoles.has(role)) {
						newRoleTries.push({
							parkrunId,
							name: meta.name,
							role,
							date: shift.date,
						})
					}
					if (!seenThisYear.has(role)) {
						seenThisYear.add(role)
						memberRoleCounts.set(
							parkrunId,
							(memberRoleCounts.get(parkrunId) ?? 0) + 1,
						)
					}
				}

				if (isRunDirector(rawRole)) {
					if (inYear && !hadRunDirected && !recordedDebut) {
						recordedDebut = true
						runDirectorDebuts.push({
							parkrunId,
							name: meta.name,
							key: meta.key,
							date: shift.date,
							eventName: getEventName(shift.event),
							eventNumber: shift.eventNumber,
						})
					}
					hadRunDirected = true
				}

				seenRoles.add(role)
			}
		}
	}

	runDirectorDebuts.sort((a, b) => a.date.localeCompare(b.date))
	newRoleTries.sort((a, b) => a.date.localeCompare(b.date))
	volunteerMilestones.sort(
		(a, b) => a.date.localeCompare(b.date) || b.count - a.count,
	)

	let mostCommonRole: WrappedStats['mostCommonRole'] = null
	for (const [role, count] of roleCounts) {
		if (!mostCommonRole || count > mostCommonRole.count) {
			mostCommonRole = { role, count }
		}
	}

	let roleCollector: WrappedStats['roleCollector'] = null
	for (const [parkrunId, roles] of memberRoleCounts) {
		const name = parkrunIdToMeta.get(parkrunId)?.name ?? parkrunId
		if (!roleCollector || roles > roleCollector.roles) {
			roleCollector = { names: [name], roles }
		} else if (roles === roleCollector.roles) {
			roleCollector.names.push(name)
		}
	}

	return {
		runDirectorDebuts,
		newRoleTries,
		newRoleMemberCount: new Set(newRoleTries.map((t) => t.parkrunId)).size,
		rolesCovered: rolesCoveredSet.size,
		mostCommonRole,
		roleCollector,
		volunteerMilestones,
		memberRoleCounts,
	}
}

// ---------------------------------------------------------------------------
// Largest club league table
// ---------------------------------------------------------------------------

/** One week's standings, ordered by total runs. */
function rankWeek(snapshots: LargestClubSnapshot[]): LargestClubSnapshot[] {
	return [...snapshots].sort((a, b) => b.events - a.events)
}

function computeClubLeague(
	yearStr: string,
	clubSnapshots: LargestClubSnapshot[],
): WrappedStats['clubLeague'] {
	const byWeek = new Map<string, LargestClubSnapshot[]>()
	for (const snapshot of clubSnapshots) {
		if (!snapshot.week.startsWith(yearStr)) continue
		const list = byWeek.get(snapshot.week)
		if (list) list.push(snapshot)
		else byWeek.set(snapshot.week, [snapshot])
	}

	const weeks = Array.from(byWeek.keys()).sort()
	// One snapshot can't show movement, so there's nothing to say.
	if (weeks.length < 2) return null

	const startWeek = weeks[0]
	const endWeek = weeks[weeks.length - 1]
	const startTable = rankWeek(byWeek.get(startWeek) ?? [])
	const endTable = rankWeek(byWeek.get(endWeek) ?? [])

	const startIndex = startTable.findIndex((c) => c.name === SCOOP_BUS_CLUB_NAME)
	const endIndex = endTable.findIndex((c) => c.name === SCOOP_BUS_CLUB_NAME)
	if (startIndex === -1 || endIndex === -1) return null

	const start = startTable[startIndex]
	const end = endTable[endIndex]

	const aheadAtStart = new Set(
		startTable.slice(0, startIndex).map((c) => c.name),
	)
	const overtaken = endTable
		.slice(endIndex + 1)
		.filter((c) => aheadAtStart.has(c.name))
		.map((c) => c.name)

	return {
		startWeek,
		endWeek,
		startRank: startIndex + 1,
		endRank: endIndex + 1,
		startRuns: start.events,
		endRuns: end.events,
		startMembers: start.members,
		endMembers: end.members,
		overtaken,
		becameLargest: startIndex > 0 && endIndex === 0,
		isLargest: endIndex === 0,
	}
}

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------

interface GuestStats {
	guestCount: number
	guestAppearances: number
	topGuest: WrappedStats['topGuest']
	newGuests: string[]
}

function computeGuestStats(
	yearStr: string,
	guests: GuestItem[],
	guestResults: GuestResultItem[],
	races: RaceItem[],
): GuestStats {
	const guestNames = new Map<string, string>()
	for (const guest of guests) guestNames.set(guest._id, guest.name)

	/** guestId → every date they ran with us, parkrun and races alike. */
	const appearances = new Map<string, string[]>()
	const record = (guestId: string, date: string) => {
		const list = appearances.get(guestId)
		if (list) list.push(date)
		else appearances.set(guestId, [date])
	}

	for (const result of guestResults) {
		guestNames.set(result.guestId, result.guestName)
		record(result.guestId, result.date)
	}
	for (const race of races) {
		for (const guest of race.guests ?? []) record(guest.guestId, race.date)
	}

	let guestAppearances = 0
	const thisYearGuests = new Set<string>()
	const newGuests: string[] = []
	let topGuest: WrappedStats['topGuest'] = null

	for (const [guestId, dates] of appearances) {
		const inYear = dates.filter((d) => d.startsWith(yearStr))
		if (inYear.length === 0) continue

		const name = guestNames.get(guestId) ?? 'A guest'
		thisYearGuests.add(guestId)
		guestAppearances += inYear.length

		const firstEver = dates.reduce((a, b) => (a < b ? a : b))
		if (firstEver.startsWith(yearStr)) newGuests.push(name)

		if (!topGuest || inYear.length > topGuest.count) {
			topGuest = { name, count: inYear.length }
		}
	}

	newGuests.sort((a, b) => a.localeCompare(b))

	return {
		guestCount: thisYearGuests.size,
		guestAppearances,
		topGuest,
		newGuests,
	}
}

// ---------------------------------------------------------------------------
// Races beyond parkrun
// ---------------------------------------------------------------------------

interface RaceStats {
	raceCount: number
	raceEntries: number
	raceKm: number
	biggestRace: WrappedStats['biggestRace']
	longestRace: WrappedStats['longestRace']
}

function computeRaceStats(yearStr: string, races: RaceItem[]): RaceStats {
	let raceCount = 0
	let raceEntries = 0
	let raceKm = 0
	let biggestRace: WrappedStats['biggestRace'] = null
	let longestRace: WrappedStats['longestRace'] = null

	for (const race of races) {
		if (!race.date.startsWith(yearStr)) continue
		raceCount++

		const turnout = race.attendees.length + (race.guests?.length ?? 0)
		raceEntries += turnout
		if (!biggestRace || turnout > biggestRace.count) {
			biggestRace = { name: race.name, date: race.date, count: turnout }
		}

		// Distance is recorded per attendee, since not everyone runs the same
		// distance at a multi-distance event.
		let furthest = 0
		const furthestNames: string[] = []
		for (const attendee of race.attendees) {
			const distance = attendee.distance
			if (distance === undefined || !Number.isFinite(distance)) continue
			raceKm += distance
			const name =
				runnerKeyToMeta.get(attendee.runnerId)?.name ??
				formatName(attendee.runnerId)
			if (distance > furthest) {
				furthest = distance
				furthestNames.length = 0
				furthestNames.push(name)
			} else if (distance === furthest) {
				furthestNames.push(name)
			}
		}

		if (furthest > 0 && (!longestRace || furthest > longestRace.distanceKm)) {
			longestRace = {
				name: race.name,
				date: race.date,
				distanceKm: furthest,
				names: furthestNames,
			}
		}
	}

	return {
		raceCount,
		raceEntries,
		raceKm: Math.round(raceKm),
		biggestRace,
		longestRace,
	}
}

// ---------------------------------------------------------------------------
// Run milestones
// ---------------------------------------------------------------------------

/**
 * Counts back from each member's lifetime total so a run's number can be
 * derived even though we don't hold their whole history.
 */
/**
 * The journey's waypoints passed during the year. The journey is cumulative
 * over the club's whole history, so this reads every result and then keeps the
 * crossings that landed in the year being wrapped.
 */
function computeDistanceMilestones(
	yearStr: string,
	allResults: RunResultItem[],
): WrappedStats['distanceMilestones'] {
	return journeyMilestones(allResults)
		.filter((milestone) => milestone.date.startsWith(yearStr))
		.map((milestone) => ({
			// `place` reads as a destination for the waypoints that aren't a city.
			label: milestone.waypoint.place ?? milestone.waypoint.name,
			km: milestone.waypoint.km,
			date: milestone.date,
		}))
}

function computeRunMilestones(
	yearStr: string,
	results: RunResultItem[],
	runners: Runner[],
): WrappedStats['runMilestones'] {
	const totalRunsMap = new Map<string, number>()
	for (const runner of runners)
		totalRunsMap.set(runner.parkrunId, runner.totalRuns)

	const byRunner = new Map<string, RunResultItem[]>()
	for (const result of results) {
		if (!parkrunIdToMeta.has(result.parkrunId)) continue
		const list = byRunner.get(result.parkrunId)
		if (list) list.push(result)
		else byRunner.set(result.parkrunId, [result])
	}

	const milestones: WrappedStats['runMilestones'] = []
	for (const [parkrunId, runs] of byRunner) {
		const totalRuns = totalRunsMap.get(parkrunId)
		if (totalRuns === undefined) continue
		runs.sort((a, b) => a.date.localeCompare(b.date))
		for (let i = 0; i < runs.length; i++) {
			const runNumber = totalRuns - (runs.length - 1 - i)
			if (!MILESTONE_SET.has(runNumber)) continue
			if (!runs[i].date.startsWith(yearStr)) continue
			milestones.push({
				name: parkrunIdToMeta.get(parkrunId)?.name ?? parkrunId,
				runNumber,
				date: runs[i].date,
			})
		}
	}

	milestones.sort(
		(a, b) => a.date.localeCompare(b.date) || b.runNumber - a.runNumber,
	)
	return milestones
}

// ---------------------------------------------------------------------------
// Year stats computation
// ---------------------------------------------------------------------------

export function computeWrappedStats(input: WrappedInput): WrappedStats {
	const {
		year,
		results: allResults,
		runners: allRunners,
		volunteers: allVolunteers,
		races,
		guests,
		guestResults,
		clubSnapshots,
	} = input

	const yearStr = String(year)
	const results = allResults.filter((r) => r.date.startsWith(yearStr))
	const volunteers = allVolunteers.filter((v) => v.date.startsWith(yearStr))

	const raceStats = computeRaceStats(yearStr, races)
	const guestStats = computeGuestStats(yearStr, guests, guestResults, races)

	// A year with only races or only guests still has a story to tell, so the
	// bar for "we have something" is any source at all.
	if (
		results.length === 0 &&
		volunteers.length === 0 &&
		raceStats.raceCount === 0 &&
		guestStats.guestAppearances === 0
	) {
		return emptyStats(year)
	}

	let totalRuns = 0
	let totalJuniorRuns = 0
	for (const r of results) {
		if (isJuniorEvent(r.event)) totalJuniorRuns++
		else totalRuns++
	}

	const totalDistanceKm =
		totalRuns * PARKRUN_DISTANCE_KM +
		totalJuniorRuns * JUNIOR_PARKRUN_DISTANCE_KM

	// Unique events and countries
	const uniqueEventSet = new Set<string>()
	for (const r of results) uniqueEventSet.add(r.event)
	for (const v of volunteers) uniqueEventSet.add(v.event)

	const uniqueCountrySet = new Set<string>()
	for (const eventId of uniqueEventSet) {
		const ev = getEvent(eventId)
		if (ev?.country) uniqueCountrySet.add(ev.country)
	}

	// Active dates and members
	const activeDates = new Set<string>()
	const activeMembers = new Set<string>()
	for (const r of results) {
		activeDates.add(r.date)
		activeMembers.add(r.parkrunId)
	}
	for (const v of volunteers) {
		activeDates.add(v.date)
		activeMembers.add(v.parkrunId)
	}

	// Busiest date
	const dateMembers = new Map<string, Set<string>>()
	const dateEvents = new Map<string, Map<string, number>>() // date -> eventId -> eventNumber
	for (const r of results) {
		if (!dateMembers.has(r.date)) dateMembers.set(r.date, new Set())
		dateMembers.get(r.date)?.add(r.parkrunId)
		if (!dateEvents.has(r.date)) dateEvents.set(r.date, new Map())
		dateEvents.get(r.date)?.set(r.event, r.eventNumber)
	}
	for (const v of volunteers) {
		if (!dateMembers.has(v.date)) dateMembers.set(v.date, new Set())
		dateMembers.get(v.date)?.add(v.parkrunId)
		if (!dateEvents.has(v.date)) dateEvents.set(v.date, new Map())
		dateEvents.get(v.date)?.set(v.event, v.eventNumber)
	}

	let busiestSaturday: WrappedStats['busiestSaturday'] = null
	for (const [date, members] of dateMembers) {
		if (!busiestSaturday || members.size > busiestSaturday.count) {
			const evMap = dateEvents.get(date) ?? new Map()
			const events = Array.from(evMap.entries()).map(
				([eventId, eventNumber]) => ({
					name: getEventName(eventId),
					eventNumber,
				}),
			)
			busiestSaturday = { date, count: members.size, events }
		}
	}

	// Per-member stats
	const memberRunCounts = new Map<string, number>()
	const memberEventSets = new Map<string, Set<string>>()
	const memberVolCounts = new Map<string, number>()
	const memberDates = new Map<string, Set<string>>()

	for (const r of results) {
		memberRunCounts.set(
			r.parkrunId,
			(memberRunCounts.get(r.parkrunId) ?? 0) + 1,
		)
		if (!memberEventSets.has(r.parkrunId))
			memberEventSets.set(r.parkrunId, new Set())
		memberEventSets.get(r.parkrunId)?.add(r.event)
		if (!memberDates.has(r.parkrunId)) memberDates.set(r.parkrunId, new Set())
		memberDates.get(r.parkrunId)?.add(r.date)
	}
	for (const v of volunteers) {
		memberVolCounts.set(
			v.parkrunId,
			(memberVolCounts.get(v.parkrunId) ?? 0) + 1,
		)
		if (!memberDates.has(v.parkrunId)) memberDates.set(v.parkrunId, new Set())
		memberDates.get(v.parkrunId)?.add(v.date)
	}

	// Events visited before this year
	const priorEvents = new Map<string, Set<string>>() // parkrunId -> set of eventIds
	for (const r of allResults) {
		if (r.date >= yearStr) continue
		if (!priorEvents.has(r.parkrunId)) priorEvents.set(r.parkrunId, new Set())
		priorEvents.get(r.parkrunId)?.add(r.event)
	}

	const globalPriorEvents = new Set<string>()
	for (const r of allResults) {
		if (r.date < yearStr) globalPriorEvents.add(r.event)
	}

	// New events this year
	const newEventsList: WrappedStats['newEventsList'] = []
	const newEventsSet = new Set<string>()
	for (const r of results) {
		if (!globalPriorEvents.has(r.event) && !newEventsSet.has(r.event)) {
			newEventsSet.add(r.event)
			const ev = getEvent(r.event)
			newEventsList.push({
				eventId: r.event,
				name: r.eventName || getEventName(r.event),
				country: ev?.country ?? '??',
				discoveredBy:
					parkrunIdToMeta.get(r.parkrunId)?.name ?? formatName(r.runnerName),
			})
		}
	}

	const memberNewEvents = new Map<string, number>()
	for (const r of results) {
		const prior = priorEvents.get(r.parkrunId)
		if (!prior || !prior.has(r.event)) {
			// Check we haven't already counted this event for this member this year
			const key = `${r.parkrunId}:${r.event}`
			if (!memberNewEvents.has(key)) {
				memberNewEvents.set(key, 1)
				// Accumulate per member
			}
		}
	}
	const memberNewEventCounts = new Map<string, number>()
	for (const key of memberNewEvents.keys()) {
		const parkrunId = key.split(':')[0]
		memberNewEventCounts.set(
			parkrunId,
			(memberNewEventCounts.get(parkrunId) ?? 0) + 1,
		)
	}

	// Most explored member(s) — ties included
	let mostExploredMember: WrappedStats['mostExploredMember'] = null
	for (const [id, events] of memberEventSets) {
		const count = events.size
		const name = parkrunIdToMeta.get(id)?.name ?? id
		if (!mostExploredMember || count > mostExploredMember.events) {
			mostExploredMember = { names: [name], events: count }
		} else if (count === mostExploredMember.events) {
			mostExploredMember.names.push(name)
		}
	}

	// Most volunteered member(s) — ties included
	let mostVolunteeredMember: WrappedStats['mostVolunteeredMember'] = null
	for (const [id, count] of memberVolCounts) {
		const name = parkrunIdToMeta.get(id)?.name ?? id
		if (!mostVolunteeredMember || count > mostVolunteeredMember.count) {
			mostVolunteeredMember = { names: [name], count }
		} else if (count === mostVolunteeredMember.count) {
			mostVolunteeredMember.names.push(name)
		}
	}

	// Close finishes
	const eventResultsMap = new Map<string, RunResultItem[]>()
	for (const r of results) {
		const key = `${r.date}:${r.event}:${r.eventNumber}`
		if (!eventResultsMap.has(key)) eventResultsMap.set(key, [])
		eventResultsMap.get(key)?.push(r)
	}

	let closeFinishes = 0
	const closePairCount = new Map<string, number>()
	for (const evResults of eventResultsMap.values()) {
		if (evResults.length < 2) continue
		for (let i = 0; i < evResults.length; i++) {
			for (let j = i + 1; j < evResults.length; j++) {
				const diff = Math.abs(
					parseTimeToSeconds(evResults[i].time) -
						parseTimeToSeconds(evResults[j].time),
				)
				if (diff <= 10) {
					closeFinishes++
					const a = evResults[i].parkrunId
					const b = evResults[j].parkrunId
					const pk = a < b ? `${a}|${b}` : `${b}|${a}`
					closePairCount.set(pk, (closePairCount.get(pk) ?? 0) + 1)
				}
			}
		}
	}

	let mostCommonCloseFinishPair: WrappedStats['mostCommonCloseFinishPair'] =
		null
	for (const [pk, count] of closePairCount) {
		if (!mostCommonCloseFinishPair || count > mostCommonCloseFinishPair.count) {
			const [idA, idB] = pk.split('|')
			mostCommonCloseFinishPair = {
				nameA: parkrunIdToMeta.get(idA)?.name ?? idA,
				nameB: parkrunIdToMeta.get(idB)?.name ?? idB,
				count,
			}
		}
	}

	// Debut members — members whose first-ever result in the full dataset falls in this year
	const firstResultDate = new Map<string, string>()
	for (const r of allResults) {
		const id = r.parkrunId
		if (!parkrunIdToMeta.has(id)) continue
		const existing = firstResultDate.get(id)
		if (!existing || r.date < existing) firstResultDate.set(id, r.date)
	}
	// Also check volunteers for first appearance
	for (const v of allVolunteers) {
		const id = v.parkrunId
		if (!parkrunIdToMeta.has(id)) continue
		const existing = firstResultDate.get(id)
		if (!existing || v.date < existing) firstResultDate.set(id, v.date)
	}

	const debutMembers: WrappedStats['debutMembers'] = []
	for (const [id, date] of firstResultDate) {
		if (date.startsWith(yearStr)) {
			const meta = parkrunIdToMeta.get(id)
			if (meta)
				debutMembers.push({
					parkrunId: id,
					name: meta.name,
					key: meta.key,
					date,
				})
		}
	}
	debutMembers.sort((a, b) => a.date.localeCompare(b.date))

	// PBs — count runs that are a member's best 5K time at that point
	// For each member, find their best time before this year, then track PBs within this year
	const priorBestTime = new Map<string, number>() // parkrunId -> best seconds before this year
	for (const r of allResults) {
		if (r.date >= yearStr) continue
		if (isJuniorEvent(r.event)) continue
		const id = r.parkrunId
		if (!parkrunIdToMeta.has(id)) continue
		const secs = parseTimeToSeconds(r.time)
		if (secs <= 0) continue
		const existing = priorBestTime.get(id)
		if (!existing || secs < existing) priorBestTime.set(id, secs)
	}

	let totalPBs = 0
	const pbImprovements = new Map<string, number>() // parkrunId -> total seconds improved
	// Sort this year's results by date so we can track running best
	const sortedResults = [...results]
		.filter((r) => !isJuniorEvent(r.event))
		.sort((a, b) => a.date.localeCompare(b.date))
	const currentBest = new Map<string, number>() // running best per member within the year
	for (const [id, secs] of priorBestTime) currentBest.set(id, secs)

	for (const r of sortedResults) {
		const id = r.parkrunId
		if (!parkrunIdToMeta.has(id)) continue
		const secs = parseTimeToSeconds(r.time)
		if (secs <= 0) continue
		const best = currentBest.get(id)
		if (!best || secs < best) {
			if (best) {
				totalPBs++
				const improvement = best - secs
				pbImprovements.set(id, (pbImprovements.get(id) ?? 0) + improvement)
			} else {
				// First ever run — it's technically a PB but we only count improvements
				totalPBs++
			}
			currentBest.set(id, secs)
		}
	}

	let biggestPBImprover: WrappedStats['biggestPBImprover'] = null
	for (const [id, saved] of pbImprovements) {
		if (!biggestPBImprover || saved > biggestPBImprover.secondsSaved) {
			biggestPBImprover = {
				name: parkrunIdToMeta.get(id)?.name ?? id,
				secondsSaved: saved,
			}
		}
	}

	const volunteerStats = computeVolunteerStats(yearStr, allVolunteers)

	// Build member stats list
	const memberStats: WrappedStats['memberStats'] = []
	for (const id of activeMembers) {
		const meta = parkrunIdToMeta.get(id)
		memberStats.push({
			parkrunId: id,
			name: meta?.name ?? formatName(id),
			runs: memberRunCounts.get(id) ?? 0,
			events: memberEventSets.get(id)?.size ?? 0,
			newEvents: memberNewEventCounts.get(id) ?? 0,
			volunteered: memberVolCounts.get(id) ?? 0,
			roles: volunteerStats.memberRoleCounts.get(id) ?? 0,
			pbImprovement: pbImprovements.get(id) ?? 0,
		})
	}
	memberStats.sort((a, b) => b.runs - a.runs) // Sort by runs, just for ordering

	// Biggest scoop bus trip — most members at a single non-Haga event instance
	const eventInstanceMembers = new Map<
		string,
		{ event: string; eventNumber: number; date: string; members: Set<string> }
	>()
	for (const r of results) {
		if (!parkrunIdToMeta.has(r.parkrunId)) continue
		const key = `${r.date}:${r.event}:${r.eventNumber}`
		if (!eventInstanceMembers.has(key)) {
			eventInstanceMembers.set(key, {
				event: r.event,
				eventNumber: r.eventNumber,
				date: r.date,
				members: new Set(),
			})
		}
		eventInstanceMembers.get(key)?.members.add(r.parkrunId)
	}
	for (const v of volunteers) {
		if (!parkrunIdToMeta.has(v.parkrunId)) continue
		const key = `${v.date}:${v.event}:${v.eventNumber}`
		if (!eventInstanceMembers.has(key)) {
			eventInstanceMembers.set(key, {
				event: v.event,
				eventNumber: v.eventNumber,
				date: v.date,
				members: new Set(),
			})
		}
		eventInstanceMembers.get(key)?.members.add(v.parkrunId)
	}

	let biggestTrip: WrappedStats['biggestTrip'] = null
	let biggestHaga: WrappedStats['biggestHaga'] = null
	for (const inst of eventInstanceMembers.values()) {
		const count = inst.members.size
		if (inst.event === 'haga') {
			if (!biggestHaga || count > biggestHaga.count) {
				biggestHaga = { date: inst.date, eventNumber: inst.eventNumber, count }
			}
		} else {
			if (!biggestTrip || count > biggestTrip.count) {
				biggestTrip = {
					date: inst.date,
					event: inst.event,
					eventName: getEventName(inst.event),
					eventNumber: inst.eventNumber,
					count,
				}
			}
		}
	}

	// New countries — countries visited this year that weren't visited in any prior year
	const priorCountries = new Set<string>()
	for (const r of allResults) {
		if (r.date >= yearStr) continue
		if (!parkrunIdToMeta.has(r.parkrunId)) continue
		const ev = getEvent(r.event)
		if (ev?.country) priorCountries.add(ev.country)
	}

	const newCountriesMap = new Map<string, string>() // country code -> first event name
	for (const r of results) {
		if (!parkrunIdToMeta.has(r.parkrunId)) continue
		const ev = getEvent(r.event)
		if (
			ev?.country &&
			!priorCountries.has(ev.country) &&
			!newCountriesMap.has(ev.country)
		) {
			newCountriesMap.set(ev.country, ev.name)
		}
	}
	const newCountries: WrappedStats['newCountries'] = []
	for (const [code, eventName] of newCountriesMap) {
		newCountries.push({
			code,
			flag: COUNTRY_FLAGS[code] ?? '🏳️',
			name: COUNTRY_NAMES[code] ?? code,
			eventName,
		})
	}

	// Performance highlights — members only, and 5K only so the numbers compare.
	let fastestRun: WrappedStats['fastestRun'] = null
	let fastestSeconds = Number.POSITIVE_INFINITY
	const monthRuns = new Map<number, number>()

	for (const r of results) {
		const meta = parkrunIdToMeta.get(r.parkrunId)
		if (!meta) continue

		const month = Number.parseInt(r.date.slice(5, 7), 10) - 1
		if (month >= 0 && month < 12) {
			monthRuns.set(month, (monthRuns.get(month) ?? 0) + 1)
		}

		if (isJuniorEvent(r.event)) continue

		const seconds = parseTimeToSeconds(r.time)
		if (seconds > 0 && seconds < fastestSeconds) {
			fastestSeconds = seconds
			fastestRun = {
				name: meta.name,
				time: r.time,
				eventName: r.eventName || getEventName(r.event),
				date: r.date,
			}
		}
	}

	let busiestMonth: WrappedStats['busiestMonth'] = null
	for (const [month, runs] of monthRuns) {
		if (!busiestMonth || runs > busiestMonth.runs) {
			busiestMonth = { month: MONTH_NAMES[month], runs }
		}
	}

	let longestStreak: WrappedStats['longestStreak'] = null
	for (const [id, dates] of memberDates) {
		const meta = parkrunIdToMeta.get(id)
		if (!meta) continue
		const weeks = longestWeeklyStreak(dates)
		if (weeks < 2) continue
		if (!longestStreak || weeks > longestStreak.weeks) {
			longestStreak = { names: [meta.name], weeks }
		} else if (weeks === longestStreak.weeks) {
			longestStreak.names.push(meta.name)
		}
	}

	return {
		year,
		hasData: true,
		totalRuns,
		totalJuniorRuns,
		totalDistanceKm,
		uniqueEvents: uniqueEventSet.size,
		uniqueCountries: uniqueCountrySet.size,
		volunteerSessions: volunteers.length,
		activeSaturdays: activeDates.size,
		activeMembers: activeMembers.size,
		busiestSaturday,
		mostExploredMember,
		mostVolunteeredMember,
		newEventsDiscovered: newEventsSet.size,
		closeFinishes,
		mostCommonCloseFinishPair,
		memberStats,
		newEventsList,
		debutMembers,
		clubJoiners: clubJoinersFor(year),
		isFoundingYear: year === CLUB_FOUNDED_YEAR,
		totalPBs,
		biggestPBImprover,
		biggestTrip,
		biggestHaga,
		newCountries,
		runDirectorDebuts: volunteerStats.runDirectorDebuts,
		newRoleTries: volunteerStats.newRoleTries,
		newRoleMemberCount: volunteerStats.newRoleMemberCount,
		rolesCovered: volunteerStats.rolesCovered,
		mostCommonRole: volunteerStats.mostCommonRole,
		roleCollector: volunteerStats.roleCollector,
		volunteerMilestones: volunteerStats.volunteerMilestones,
		runMilestones: computeRunMilestones(yearStr, allResults, allRunners),
		distanceMilestones: computeDistanceMilestones(yearStr, allResults),
		fastestRun,
		busiestMonth,
		longestStreak,
		clubLeague: computeClubLeague(yearStr, clubSnapshots),
		...guestStats,
		...raceStats,
	}
}
