/**
 * How fast a club is adding parkruns — the number behind both the "largest club"
 * projection and the average/week column on the standings table.
 *
 * The two have to agree: the table's tooltip tells the reader how many weeks the
 * average covers, and the projection is only meaningful if it's the same window.
 * So the window and the maths live here, and Convex's projection query and the
 * page both read them from this one place.
 */

/** How many weeks of history feed the average-weekly-events rate. */
export const RATE_WINDOW_WEEKS = 6

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
 * Estimate a club's events-per-week from its snapshots inside the rate window,
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
): number | null {
	const cutoff = weeksBefore(latestWeek, RATE_WINDOW_WEEKS)
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
