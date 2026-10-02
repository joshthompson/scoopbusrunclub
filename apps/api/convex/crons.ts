// Parkrun scraping is scheduled by GitHub Actions (fetch-parkrun.yml) rather
// than here, because it needs a headless browser via Playwright which can't run
// inside a Convex action.
//
// What does live here is the notification clock (see notificationSchedule.ts)
// and the snapshot check.

import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/**
 * Convex crons run in UTC, and the club's scheduled notifications are due at
 * 9am Swedish time — an hour that moves against UTC twice a year. So the tick
 * is hourly and `hourlyTick` decides whether it's nine o'clock in Stockholm,
 * which survives both clock changes without an offset hardcoded anywhere.
 */
crons.hourly(
	'notification clock',
	{ minuteUTC: 0 },
	internal.notificationSchedule.hourlyTick,
)

/**
 * The JSON snapshots rebuild themselves after every write (see snapshots.ts).
 * This only catches one that never got built — a first deploy, a format
 * change, a rebuild that failed — and costs a few `appData` reads otherwise.
 */
crons.hourly(
	'snapshot check',
	{ minuteUTC: 30 },
	internal.snapshots.rebuildStale,
)

export default crons
