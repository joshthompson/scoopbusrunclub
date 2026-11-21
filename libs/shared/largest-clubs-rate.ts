/**
 * How fast a club is adding parkruns — the number behind both the "largest club"
 * projection and the average/week column on the standings table.
 *
 * The two have to agree: the table's tooltip tells the reader how many weeks the
 * average covers, and the projection is only meaningful if it's the same window.
 * So the window and the maths live here, and Convex's projection query and the
 * page both read them from this one place. The page lets the reader change the
 * window, and reruns the same projection in the browser when they do.
 */

/** How many weeks of history feed the average-weekly-events rate by default. */
export const RATE_WINDOW_WEEKS = 6

/**
 * Projections further out than this are treated as "not projected" — at that
 * range the rate estimate is noise, not a forecast.
 */
export const MAX_PROJECTION_WEEKS = 520 // 10 years

export const SCOOP_BUS_CLUB_NAME = 'Scoop Bus Run Club'

export interface RateSnapshot {
	/** YYYY-MM-DD, the Saturday the snapshot represents. */
	week: string
	events: number
}

/** Shift a YYYY-MM-DD date back by a number of weeks. */
export function weeksBefore(week: string, count: number): string {
	const ms = Date.parse(`${week}T00:00:00Z`)
	if (Number.isNaN(ms)) return week
	return new Date(ms - count * 7 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10)
}

/** Whole weeks between two YYYY-MM-DD dates (may be fractional). */
export function weeksBetween(from: string, to: string): number {
	const fromMs = Date.parse(`${from}T00:00:00Z`)
	const toMs = Date.parse(`${to}T00:00:00Z`)
	if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 0
	return (toMs - fromMs) / (7 * 24 * 60 * 60 * 1000)
}

/**
 * Estimate a club's events-per-week from its snapshots inside the rate window
 * (the last `windowWeeks` weeks up to `latestWeek`),
 * as the total gain across the window divided by the weeks it spans. Rounded to
 * two decimal places.
 *
 * Returns null when there isn't enough history to tell — one snapshot shows a
 * total, not a rate — which the table shows as "—" rather than implying a club
 * that runs stood still. A club that genuinely isn't growing gives 0.
 */
export function averageWeeklyEvents(
	snapshots: RateSnapshot[],
	latestWeek: string,
	windowWeeks: number = RATE_WINDOW_WEEKS,
): number | null {
	const cutoff = weeksBefore(latestWeek, windowWeeks)
	const window = snapshots
		.filter((s) => s.week >= cutoff && s.week <= latestWeek)
		.sort((a, b) => a.week.localeCompare(b.week))

	if (window.length < 2) return null

	const first = window[0]
	const last = window[window.length - 1]
	const weeks = weeksBetween(first.week, last.week)
	if (weeks <= 0) return null

	const rate = (last.events - first.events) / weeks
	return rate > 0 ? Math.round(rate * 100) / 100 : 0
}

function isScoopBus(name: string): boolean {
	return name.trim().toLowerCase() === SCOOP_BUS_CLUB_NAME.toLowerCase()
}

export interface ClubSnapshot extends RateSnapshot {
	name: string
	members: number
}

export interface ProjectedClub {
	name: string
	members: number
	events: number
	/** Runs per week over the rate window; 0 when there's too little history. */
	averageWeeklyEvents: number
	isScoopBus: boolean
	/** Weeks until this club passes Scoop Bus. Null for us, or if never. */
	weeksToOvertakeScoopBus: number | null
}

export interface LargestClubsProjection {
	/** Saturday of the most recent snapshot. Null when there are no snapshots. */
	week: string | null
	/** Weeks until Scoop Bus is the largest club. Null if already there or never. */
	estimatedWeeksToLargest: number | null
	clubs: ProjectedClub[]
}

/**
 * Whole weeks until `behind` overtakes `ahead` (i.e. holds strictly more
 * events), or null when it never happens inside the projection horizon.
 */
function weeksUntilOvertake(
	behind: ProjectedClub,
	ahead: ProjectedClub,
): number | null {
	const rateGap = behind.averageWeeklyEvents - ahead.averageWeeklyEvents
	if (rateGap <= 0) return null

	// +1 because overtaking means finishing strictly ahead, not level.
	const weeks = Math.ceil((ahead.events - behind.events + 1) / rateGap)
	if (weeks <= 0 || weeks > MAX_PROJECTION_WEEKS) return null
	return weeks
}

/**
 * The clubs in the top two positions by total events (including everyone tied
 * on those two positions), plus Scoop Bus Run Club when it isn't already
 * there — each with its events-per-week rate over the last `windowWeeks` and,
 * for the challengers, how long until they pass Scoop Bus.
 */
export function projectLargestClubs(
	snapshots: ClubSnapshot[],
	windowWeeks: number = RATE_WINDOW_WEEKS,
): LargestClubsProjection {
	if (snapshots.length === 0) {
		return { week: null, estimatedWeeksToLargest: null, clubs: [] }
	}

	const latestWeek = snapshots.reduce(
		(latest, row) => (row.week > latest ? row.week : latest),
		'',
	)

	const snapshotsByName = new Map<string, ClubSnapshot[]>()
	for (const row of snapshots) {
		const list = snapshotsByName.get(row.name) ?? []
		list.push(row)
		snapshotsByName.set(row.name, list)
	}

	const current = snapshots
		.filter((row) => row.week === latestWeek)
		.sort((a, b) => b.events - a.events)

	// Everyone holding one of the top two distinct event totals — so ties for
	// first or second are all included.
	const topTotals = [...new Set(current.map((row) => row.events))].slice(0, 2)
	const selected = current.filter((row) => topTotals.includes(row.events))

	// Always include ourselves, even when we're further down the table.
	const scoopBusRow = current.find((row) => isScoopBus(row.name))
	if (scoopBusRow && !selected.includes(scoopBusRow)) {
		selected.push(scoopBusRow)
	}

	const clubs: ProjectedClub[] = selected.map((row) => ({
		name: row.name,
		members: row.members,
		events: row.events,
		// A club with too little history has no rate; the projection treats that
		// as "not growing", which keeps it out of every overtake estimate.
		averageWeeklyEvents:
			averageWeeklyEvents(
				snapshotsByName.get(row.name) ?? [],
				latestWeek,
				windowWeeks,
			) ?? 0,
		isScoopBus: isScoopBus(row.name),
		weeksToOvertakeScoopBus: null,
	}))

	const scoopBus = clubs.find((club) => club.isScoopBus)

	if (scoopBus) {
		for (const club of clubs) {
			if (club.isScoopBus) continue
			// Clubs already ahead of us aren't "overtaking" — they're leading.
			if (club.events > scoopBus.events) continue
			club.weeksToOvertakeScoopBus = weeksUntilOvertake(club, scoopBus)
		}
	}

	// To be the largest we have to pass everyone not already behind us; the
	// slowest of those crossings is when we'd take the lead outright.
	let estimatedWeeksToLargest: number | null = null
	if (scoopBus) {
		const toPass = clubs.filter(
			(club) => !club.isScoopBus && club.events >= scoopBus.events,
		)
		for (const club of toPass) {
			const weeks = weeksUntilOvertake(scoopBus, club)
			if (weeks === null) {
				estimatedWeeksToLargest = null
				break
			}
			estimatedWeeksToLargest = Math.max(estimatedWeeksToLargest ?? 0, weeks)
		}
	}

	return {
		week: latestWeek,
		estimatedWeeksToLargest,
		clubs: clubs.sort((a, b) => b.events - a.events),
	}
}
