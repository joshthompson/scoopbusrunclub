import { DOMAIN_TO_COUNTRY } from '../parkrun-parsers'
import type { RaceSource, VolunteerSource } from './types'

/**
 * Scoop Bus trips out to another parkrun.
 *
 * A trip is an ordinary event record with this type, so it shows up on the
 * calendar and in the upcoming lists like anything else. What makes it special
 * is that parkrun itself will report what happened: once the results for that
 * event and date land, the trip stops being an event and the standard result
 * block says everything it used to.
 */
export const PARKRUN_TRIP_TYPE = 'Parkrun Trip'

/** An example of the URL a trip needs, for placeholders and hints. */
export const PARKRUN_EVENT_URL_EXAMPLE = 'https://www.parkrun.se/kalgarden/'

export function isParkrunTrip(race: { type?: string }): boolean {
	return race.type === PARKRUN_TRIP_TYPE
}

/**
 * The event id in a parkrun event page URL — "kalgarden" in
 * `https://www.parkrun.se/kalgarden/`. The `www.` and the trailing slash are
 * both optional; anything deeper than the event page (results, course, …) is
 * not an event page, so it's rejected.
 *
 * Returns null for anything that isn't one, which is also how the admin form
 * decides whether the URL it's been given will do.
 */
export function parkrunEventIdFromUrl(url: string | undefined): string | null {
	if (!url) return null
	let parsed: URL
	try {
		parsed = new URL(url.trim())
	} catch {
		return null
	}
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
	const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
	if (!(host in DOMAIN_TO_COUNTRY)) return null
	const segments = parsed.pathname.split('/').filter(Boolean)
	if (segments.length !== 1) return null
	const eventId = segments[0].toLowerCase()
	return /^[a-z0-9-]+$/.test(eventId) ? eventId : null
}

/** Whether a URL is a parkrun event page, and so usable as a trip's link. */
export function isParkrunEventUrl(url: string | undefined): boolean {
	return parkrunEventIdFromUrl(url) !== null
}

/**
 * Trips whose parkrun has since reported — matched on the trip's event and its
 * date, so a trip that was moved or never happened stays on the calendar.
 * Volunteering counts too: a Saturday spent marshalling is still a trip taken.
 */
export function supersededTripIds(
	races: RaceSource[],
	results: { date: string; event: string }[],
	volunteers: VolunteerSource[],
): Set<string> {
	const superseded = new Set<string>()
	const trips = races.filter(isParkrunTrip)
	if (trips.length === 0) return superseded

	const reported = new Set<string>()
	for (const result of results) reported.add(`${result.date}:${result.event}`)
	for (const volunteer of volunteers)
		reported.add(`${volunteer.date}:${volunteer.event}`)

	for (const trip of trips) {
		const eventId = parkrunEventIdFromUrl(trip.website)
		if (eventId && reported.has(`${trip.date}:${eventId}`))
			superseded.add(trip._id)
	}

	return superseded
}

/** The events worth showing: everything, less the trips parkrun has reported. */
export function withoutReportedTrips<T extends RaceSource>(
	races: T[],
	results: { date: string; event: string }[],
	volunteers: VolunteerSource[],
): T[] {
	const superseded = supersededTripIds(races, results, volunteers)
	if (superseded.size === 0) return races
	return races.filter((race) => !superseded.has(race._id))
}
