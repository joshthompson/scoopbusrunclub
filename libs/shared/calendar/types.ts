/**
 * The data the calendar is built from.
 *
 * These are deliberately the smallest shapes the calendar needs, so both the
 * website's API types and the Convex documents behind them satisfy them
 * without conversion.
 */

export interface RunResultSource {
	parkrunId: string
	runnerName: string
	/** eventId, e.g. "haga" */
	event: string
	/** Resolved display name, e.g. "Haga" */
	eventName: string
	position: number
	date: string
}

export interface VolunteerSource {
	parkrunId: string
	volunteerName: string
	event: string
	eventName: string
	date: string
}

export interface GuestResultSource {
	guestName: string
	event: string
	eventName: string
	position: number
	date: string
}

export interface RaceAttendeeSource {
	runnerId: string
}

export interface RaceSource {
	_id: string
	date: string
	name: string
	website?: string
	type?: string
	attendees: RaceAttendeeSource[]
	majorEvent?: boolean
}

/** A member's parkrun totals, for working out milestone runs. */
export interface RunnerTotalsSource {
	parkrunId: string
	name: string
	totalRuns: number
}

export interface CalendarSources {
	results: RunResultSource[]
	volunteers: VolunteerSource[]
	guestResults: GuestResultSource[]
	races: RaceSource[]
	/** Run totals, used to work out which run was a milestone and when the next is due */
	runners?: RunnerTotalsSource[]
}

/**
 * The bits of the world the calendar can't work out for itself.
 *
 * The website resolves event names from the events it has loaded; the backend
 * reads them straight out of the database. Both hand the lookup in here so the
 * entry-building logic itself stays pure.
 */
export interface CalendarContext {
	/** Display name for a parkrun event id, e.g. "haga" → "Haga". */
	eventName: (eventId: string) => string
}
