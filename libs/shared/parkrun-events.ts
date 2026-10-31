/**
 * Parkrun events that we scrape volunteer data for.
 * Shared between the web app and API scripts so both
 * agree on which events have volunteer information.
 *
 * To add a new event, append to this array, then backfill its history from
 * Process Results ("Fetch past volunteer results") — the weekly scrape only ever
 * picks up the latest event.
 */

export interface ParkrunEventConfig {
	/** Lowercase event ID used in URLs and DB, e.g. "haga" */
	eventId: string
	/** parkrun domain for this event */
	baseUrl: string
}

export const PARKRUN_EVENTS: ParkrunEventConfig[] = [
	{ eventId: 'haga', baseUrl: 'https://www.parkrun.se/haga' },
	{ eventId: 'judarskogen', baseUrl: 'https://www.parkrun.se/judarskogen' },
	{ eventId: 'huddinge', baseUrl: 'https://www.parkrun.se/huddinge' },
]

/** Just the event IDs that have volunteer data */
export const VOLUNTEER_EVENT_IDS = new Set(PARKRUN_EVENTS.map((e) => e.eventId))
