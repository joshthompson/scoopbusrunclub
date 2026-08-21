import type { RunResultItem } from './api'
import { getEventName } from './events'

/**
 * The club's collective distance, told as a journey out of Stockholm.
 *
 * The waypoints and the distance-per-run figures live here rather than on the
 * page that draws the progress bar, because the calendar and the results feed
 * both need to say when the bus passed one of them.
 */

export const PARKRUN_DISTANCE_KM = 5
export const JUNIOR_PARKRUN_DISTANCE_KM = 2

export interface JourneyWaypoint {
	name: string
	km: number
	emoji: string
	/**
	 * How to finish "The Scoop Bus …" for waypoints that aren't a place you can
	 * arrive at. Defaults to "has reached {name}!".
	 */
	reached?: string
	/**
	 * How to finish "…which would take us from Stockholm to …", where the
	 * waypoint's own name doesn't read as a destination.
	 */
	place?: string
}

/** Straight-line (great-circle) distances from Stockholm */
export const JOURNEY_WAYPOINTS: JourneyWaypoint[] = [
	{ name: 'Stockholm', km: 0, emoji: '🇸🇪' },
	{ name: 'Uppsala', km: 64, emoji: '🇸🇪' },
	{ name: 'Copenhagen', km: 522, emoji: '🇩🇰' },
	{ name: 'Berlin', km: 810, emoji: '🇩🇪' },
	{ name: 'London', km: 1_435, emoji: '🇬🇧' },
	{ name: 'Rome', km: 1_985, emoji: '🇮🇹' },
	{ name: 'Istanbul', km: 2_108, emoji: '🇹🇷' },
	{ name: 'Cairo', km: 3_212, emoji: '🇪🇬' },
	{ name: 'Dubai', km: 4_670, emoji: '🇦🇪' },
	{ name: 'Nairobi', km: 6_275, emoji: '🇰🇪' },
	{ name: 'Tokyo', km: 8_134, emoji: '🇯🇵' },
	{ name: 'Cape Town', km: 10_230, emoji: '🇿🇦' },
	{ name: 'Buenos Aires', km: 12_570, emoji: '🇦🇷' },
	{ name: 'Sydney', km: 15_590, emoji: '🇦🇺' },
	{ name: 'Auckland', km: 17_080, emoji: '🇳🇿' },
	{
		name: 'Halfway around the Earth',
		km: 20_038,
		emoji: '🌍',
		reached: 'is halfway around the Earth!',
		place: 'halfway around the Earth',
	},
	{
		name: '¾ around the Earth',
		km: 30_056,
		emoji: '🌍',
		reached: 'is ¾ of the way around the Earth!',
		place: '¾ of the way around the Earth',
	},
	{
		name: 'Around the Earth!',
		km: 40_075,
		emoji: '🌍',
		reached: 'has gone all the way around the Earth!',
		place: 'all the way around the Earth',
	},
	{
		name: 'To the Moon! 🚀',
		km: 384_400,
		emoji: '🌕',
		reached: 'has reached the Moon! 🚀',
		place: 'the Moon',
	},
]

/** Junior parkruns are 2km, and only their name says so. */
export function isJuniorEvent(eventId: string): boolean {
	return getEventName(eventId).trim().toLowerCase().includes('juniors')
}

/** How far one recorded run added to the journey. */
export function resultDistanceKm(result: { event: string }): number {
	return isJuniorEvent(result.event)
		? JUNIOR_PARKRUN_DISTANCE_KM
		: PARKRUN_DISTANCE_KM
}

export interface JourneyMilestone {
	/** The day the waypoint's distance was passed. */
	date: string
	waypoint: JourneyWaypoint
	/** The club's running total that day, once the day's runs are counted. */
	totalKm: number
}

/**
 * The day the club passed each waypoint, worked out by replaying the results in
 * date order. Every milestone lands on a day that has results on it, so the
 * calendar and the results feed always have something to attach it to.
 */
export function journeyMilestones(
	results: RunResultItem[],
): JourneyMilestone[] {
	const kmByDate = new Map<string, number>()
	for (const result of results) {
		kmByDate.set(
			result.date,
			(kmByDate.get(result.date) ?? 0) + resultDistanceKm(result),
		)
	}

	const milestones: JourneyMilestone[] = []
	let totalKm = 0
	// Stockholm is where the journey starts, so it isn't somewhere we arrive.
	let next = JOURNEY_WAYPOINTS.findIndex((waypoint) => waypoint.km > 0)
	if (next < 0) return milestones

	for (const date of Array.from(kmByDate.keys()).sort()) {
		totalKm += kmByDate.get(date) ?? 0
		while (
			next < JOURNEY_WAYPOINTS.length &&
			totalKm >= JOURNEY_WAYPOINTS[next].km
		) {
			milestones.push({ date, waypoint: JOURNEY_WAYPOINTS[next], totalKm })
			next++
		}
	}

	return milestones
}

/** Milestones grouped by the day they happened. */
export function journeyMilestonesByDate(
	results: RunResultItem[],
): Map<string, JourneyMilestone[]> {
	const byDate = new Map<string, JourneyMilestone[]>()
	for (const milestone of journeyMilestones(results)) {
		const existing = byDate.get(milestone.date)
		if (existing) existing.push(milestone)
		else byDate.set(milestone.date, [milestone])
	}
	return byDate
}

/** "The Scoop Bus has reached Cape Town!" */
export function journeyMilestoneTitle(waypoint: JourneyWaypoint): string {
	return `The Scoop Bus ${waypoint.reached ?? `has reached ${waypoint.name}!`}`
}

export function journeyMilestoneDetail(waypoint: JourneyWaypoint): string {
	const place = waypoint.place ?? waypoint.name
	return `The total distance members have run has exceeded ${waypoint.km.toLocaleString('en-GB')}km which would take us from Stockholm to ${place}`
}

/** The same thing in the room a calendar cell has: "Total distance > 8,134km". */
export function journeyMilestoneShortDetail(waypoint: JourneyWaypoint): string {
	return `Total distance > ${waypoint.km.toLocaleString('en-GB')}km`
}
