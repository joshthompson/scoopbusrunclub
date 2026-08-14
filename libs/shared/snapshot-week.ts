/**
 * The week a largest-clubs snapshot belongs to.
 *
 * The league table is cumulative and always reads "as of now", so a snapshot is
 * filed under the Saturday it describes: the Saturday on or before the moment it
 * was taken.
 *
 * That date is also the upsert key — `largestClubs.storeSnapshot` matches on
 * (name, week) — which is what makes re-scraping safe. parkrun finalises the
 * table days after the events it counts, so the same week gets fetched more than
 * once, and each fetch has to overwrite the last rather than pile up beside it.
 * Both callers therefore share this one function: two implementations that
 * drifted by a day would file the second scrape under a different week and store
 * it twice.
 */
const DAY_MS = 24 * 60 * 60 * 1000

/** The Saturday on or before `timestamp`, as YYYY-MM-DD (UTC). */
export function snapshotWeek(timestamp: number = Date.now()): string {
	// getUTCDay: Sun=0 … Sat=6. Days elapsed since the most recent Saturday.
	const daysSinceSaturday = (new Date(timestamp).getUTCDay() + 1) % 7
	return new Date(timestamp - daysSinceSaturday * DAY_MS)
		.toISOString()
		.slice(0, 10)
}
