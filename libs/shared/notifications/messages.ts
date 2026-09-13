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
// New results
// ---------------------------------------------------------------------------

/**
 * One notification per day of results, not per upload. The admin page can
 * upload a Saturday in chunks, and the first chunk through claims the day — so
 * a hand-uploaded week announces itself once, with however many results had
 * landed by then, rather than buzzing on every chunk.
 */
export function resultsKey(resultDate: string): string {
	return `results:${resultDate}`
}

export function buildResults(count: number): PushPayload {
	return {
		title: 'New Scoop Bus Results',
		body: `${count} new result${count === 1 ? ' is' : 's are'} available`,
		url: '/',
		tag: 'results',
	}
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

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
