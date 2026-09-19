/**
 * Every notification the club can send, written down once.
 *
 * A notification is two things: the words a member reads on their lock screen,
 * and the key that stops them reading them twice. Both live here, next to each
 * other, so a change to the wording can't drift from the thing it identifies.
 *
 * Pure — no Convex, no Solid, no fetching. The backend calls `build...` to make
 * a payload and `...Key` to claim it; nothing else needs to know these strings.
 */

import { groupThousands } from '../calendar/format'
import { parseTimeToSeconds } from '../results/pb'
import type { PushPayload } from './types'

/**
 * What a notification is about. Stored alongside each claimed key so the
 * `sentNotifications` table can be read back and understood.
 */
export type NotificationKind =
	| 'results'
	| 'milestone'
	| 'pb'
	| 'coursePb'
	| 'largestClub'
	| 'journey'
	| 'race'
	| 'wrapped'
	| 'custom'
	| 'test'

/** A payload paired with the key that claims it. */
export interface ClaimedNotification {
	kind: NotificationKind
	dedupeKey: string
	payload: PushPayload
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * A finish time as it should read in a notification: "23:45" for the usual
 * parkrun, "1:09:20" once it's past the hour. Mirrors `formatEventTime` on the
 * website — an empty leading hour is noise on a lock screen.
 */
export function formatFinishTime(time: string): string {
	const totalSeconds = parseTimeToSeconds(time)
	if (!Number.isFinite(totalSeconds)) return time
	if (totalSeconds < 3600) {
		const parts = time.split(':')
		return parts.length === 3 ? parts.slice(1).join(':') : time
	}
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** "Josh", "Josh and Keith", "Josh, Keith and Claire" — a readable list. */
export function joinNames(names: string[]): string {
	if (names.length === 0) return ''
	if (names.length === 1) return names[0]
	return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// ---------------------------------------------------------------------------
// A day of results, summarised
// ---------------------------------------------------------------------------

/**
 * Everything a results day produced, folded into one notification.
 *
 * Results used to announce themselves one push at a time — a count, then a PB
 * alert per person, then a milestone each — and a burst like that arrives in
 * any order, or not at all, on a phone. So a day's news is one message, built
 * from these facts once the upload has gone quiet.
 */
export interface ResultsSummary {
	/** How many results the day has, counting every upload that fed it. */
	resultCount: number
	/** Overall PBs, or course PBs when `course` is set. */
	pbs: { name: string; time: string; course?: string }[]
	milestones: { name: string; runs: number }[]
	journey: { name: string; reached?: string }[]
}

/**
 * The most a summary body may run to. The same as the admin form's limit, for
 * the same reason: past this a phone truncates it and the tail is lost.
 */
export const SUMMARY_BODY_MAX = 180

/**
 * The key a day's results claim. One per day of results, not per upload: the
 * admin page uploads a Saturday one athlete at a time, and each request
 * announcing its own count meant the first through said "1 new result" for
 * the whole day. Now the day is claimed once, by its summary.
 */
export function resultsKey(resultDate: string): string {
	return `results:${resultDate}`
}

/**
 * The history row for a summary send. A summary has no key of its own to
 * dedupe on — the facts inside it each claimed theirs — so this only has to be
 * unique, and the send time makes it so.
 */
export function summaryKey(resultDate: string, sentAt: number): string {
	return `summary:${resultDate}:${sentAt}`
}

function pbItem(pb: { name: string; time: string; course?: string }): string {
	const time = formatFinishTime(pb.time)
	return pb.course
		? `${pb.name} (${pb.course}, ${time})`
		: `${pb.name} (${time})`
}

/** "Eline got a new Haga PB (23:12)." / "New PBs for Eline (Haga, 23:12) and Josh (21:40)." */
function pbSentence(pbs: ResultsSummary['pbs'], shown: number): string | null {
	if (pbs.length === 0) return null
	if (shown === 0) return `${pbs.length} new PBs.`
	if (pbs.length === 1) {
		const pb = pbs[0]
		const kind = pb.course ? `${pb.course} PB` : 'PB'
		return `${pb.name} got a new ${kind} (${formatFinishTime(pb.time)}).`
	}
	const items = pbs.slice(0, shown).map(pbItem)
	const rest = pbs.length - shown
	if (rest > 0) items.push(`${rest} more`)
	return `New PBs for ${joinNames(items)}.`
}

/** "Keith has now completed 100 parkruns!" / "Milestones for Keith (100) and Claire (50)!" */
function milestoneSentence(
	milestones: ResultsSummary['milestones'],
	shown: number,
): string | null {
	if (milestones.length === 0) return null
	if (shown === 0) return `${milestones.length} milestones!`
	if (milestones.length === 1) {
		const m = milestones[0]
		return `${m.name} has now completed ${groupThousands(m.runs)} parkruns!`
	}
	const items = milestones
		.slice(0, shown)
		.map((m) => `${m.name} (${groupThousands(m.runs)})`)
	const rest = milestones.length - shown
	if (rest > 0) items.push(`${rest} more`)
	return `Milestones for ${joinNames(items)}!`
}

/** Mirrors `journeyMilestoneTitle` — the same sentence the calendar shows. */
function journeySentence(journey: ResultsSummary['journey']): string | null {
	if (journey.length === 0) return null
	return journey
		.map((w) => `The Scoop Bus ${w.reached ?? `has reached ${w.name}!`}`)
		.join(' ')
}

/**
 * The summary's body.
 *
 * Facts go in priority order — the count, then PBs, milestones and the journey
 * — and when the whole thing overruns `SUMMARY_BODY_MAX`, names are dropped
 * from the PB list and then the milestone list ("and 3 more") until it fits.
 * A body that still won't fit is cut short rather than sent long.
 */
export function buildResultsSummaryBody(summary: ResultsSummary): string {
	const compose = (pbShown: number, msShown: number) =>
		[
			`${summary.resultCount} new result${summary.resultCount === 1 ? '' : 's'}.`,
			pbSentence(summary.pbs, pbShown),
			milestoneSentence(summary.milestones, msShown),
			journeySentence(summary.journey),
		]
			.filter((part): part is string => part !== null)
			.join(' ')

	let pbShown = summary.pbs.length
	let msShown = summary.milestones.length
	let body = compose(pbShown, msShown)

	while (body.length > SUMMARY_BODY_MAX) {
		if (pbShown > 0) pbShown--
		else if (msShown > 0) msShown--
		else break
		body = compose(pbShown, msShown)
	}

	if (body.length > SUMMARY_BODY_MAX) {
		body = `${body.slice(0, SUMMARY_BODY_MAX - 1).trimEnd()}…`
	}
	return body
}

export function buildResultsSummary(
	resultDate: string,
	summary: ResultsSummary,
): PushPayload {
	return {
		title: 'New Scoop Bus Results',
		body: buildResultsSummaryBody(summary),
		url: '/',
		// One tag per day, matching the one-summary-per-day rule.
		tag: resultsKey(resultDate),
	}
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
//
// Milestones, PBs and journey waypoints no longer go out as pushes of their
// own after an ingest — they're folded into the day's summary above. Their keys
// are still what dedupes them, and the builders remain for anything that wants
// to say one of these things on its own.

export function milestoneKey(parkrunId: string, runs: number): string {
	return `milestone:${parkrunId}:${runs}`
}

export function buildMilestone(
	name: string,
	runs: number,
	memberUrl: string,
): PushPayload {
	return {
		title: 'New Milestone!',
		body: `${name} has now completed ${groupThousands(runs)} parkruns!`,
		url: memberUrl,
		tag: `milestone:${name}:${runs}`,
	}
}

// ---------------------------------------------------------------------------
// Personal bests
// ---------------------------------------------------------------------------

/** `resultKey` is the shared "parkrunId:date:event:eventNumber" form. */
export function pbKey(resultKey: string): string {
	return `pb:${resultKey}`
}

export function coursePbKey(resultKey: string): string {
	return `coursepb:${resultKey}`
}

export function buildPb(
	name: string,
	time: string,
	memberUrl: string,
): PushPayload {
	return {
		title: 'PB Alert!',
		body: `${name} just got a new PB - ${formatFinishTime(time)}!`,
		url: memberUrl,
		tag: `pb:${name}`,
	}
}

export function buildCoursePb(
	name: string,
	courseName: string,
	time: string,
	memberUrl: string,
): PushPayload {
	return {
		title: 'Course PB Alert!',
		body: `${name} just got a new ${courseName} PB - ${formatFinishTime(time)}!`,
		url: memberUrl,
		tag: `coursepb:${name}:${courseName}`,
	}
}

// ---------------------------------------------------------------------------
// Largest club in Sweden
// ---------------------------------------------------------------------------

/**
 * Taking the top spot is a one-off, so the key carries no week. If the club
 * slips and climbs back, that isn't news the way the first time was.
 */
export const LARGEST_CLUB_KEY = 'largestclub:became'

export function buildLargestClub(events: number): PushPayload {
	return {
		title: 'Largest Club in Sweden!',
		body: `Scoop Bus Run Club now has ${groupThousands(events)} parkruns which is the most of any club in Sweden!`,
		url: '/largestclubs',
		tag: 'largestclub',
	}
}

// ---------------------------------------------------------------------------
// Journey waypoints
// ---------------------------------------------------------------------------

export function journeyKey(waypointName: string): string {
	return `journey:${waypointName}`
}

/**
 * Not every waypoint is a place you can be in. Most are — "The Scoop Bus is in
 * Tokyo!" — but a few are distances dressed up as destinations, and for those
 * the waypoint carries its own way of finishing the sentence: `reached` turns
 * "Halfway around the Earth" into "is halfway around the Earth!", the same way
 * the calendar already says it.
 */
export function buildJourney(waypoint: {
	name: string
	km: number
	reached?: string
	place?: string
}): PushPayload {
	const title = waypoint.reached
		? `The Scoop Bus ${waypoint.reached}`
		: `The Scoop Bus is in ${waypoint.name}!`

	return {
		title,
		body: `Scoop Bus Run Club has now collectively ran ${groupThousands(waypoint.km)}km which is the distance of Stockholm to ${waypoint.place ?? waypoint.name}!`,
		url: '/everyone',
		tag: `journey:${waypoint.name}`,
	}
}

// ---------------------------------------------------------------------------
// Major race days
// ---------------------------------------------------------------------------

/** Keyed by the day as well as the race, so a recurring race repeats properly. */
export function raceKey(raceId: string, date: string): string {
	return `race:${raceId}:${date}`
}

export function buildRace(eventName: string, names: string[]): PushPayload {
	return {
		title: eventName,
		body: `Today ${joinNames(names)} will be running ${eventName}`,
		url: '/calendar',
		tag: `race:${eventName}`,
	}
}

// ---------------------------------------------------------------------------
// Wrapped
// ---------------------------------------------------------------------------

export function wrappedKey(year: number): string {
	return `wrapped:${year}`
}

export function buildWrapped(year: number): PushPayload {
	return {
		title: 'Scoop Bus Wrapped is here!',
		body: "Check out this year's stats",
		url: `/wrapped/${year}/explore`,
		tag: `wrapped:${year}`,
	}
}

// ---------------------------------------------------------------------------
// Written by hand in the admin area
// ---------------------------------------------------------------------------

/** Limits the admin form enforces, so a phone shows the whole thing. */
export const CUSTOM_TITLE_MAX = 60
export const CUSTOM_BODY_MAX = 180

/**
 * Keyed by the row it came from, so a custom notification can't be sent twice —
 * a double-tapped Send, or a scheduled job that runs again after a retry, finds
 * the key already claimed.
 */
export function customKey(id: string): string {
	return `custom:${id}`
}

export function buildCustom(
	title: string,
	body: string,
	url: string,
): PushPayload {
	return {
		title,
		body,
		url: url || '/',
		// Unique per message: two announcements are two things to read, and a
		// shared tag would have the second quietly replace the first.
		tag: `custom:${title}`,
	}
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

/** Never claimed — the whole point is that it can be sent again. */
export function buildTest(): PushPayload {
	return {
		title: 'Scoop Bus Test Notification!',
		body: 'If you can see this notifications are working!',
		url: '/notifications',
		tag: 'test',
	}
}
