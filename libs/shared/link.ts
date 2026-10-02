/**
 * Link's record, kept by hand.
 *
 * Link is a dog, so parkrun issues him no times and no volunteer credits, and
 * `CLUB_MEMBERS.link.id` stays empty for the backend. The club credits him
 * here instead: the website appends these to the fetched results and volunteer
 * lists when it loads (see `apps/web/src/data/link.ts`), and the MCP server
 * does the same, under a made-up parkrun id, so his page, the heatmap,
 * celebrations and the header treat them like anyone else's.
 *
 * Roles use the Swedish names parkrun reports (see `data/volunteer-roles`),
 * so the header picks the right pose and the lists translate them the same way.
 */
export const LINK_PARKRUN_ID = 'link'

const NAME = 'Link'

/** Same shape as a scraped volunteer credit. */
export interface LinkVolunteer {
	parkrunId: string
	volunteerName: string
	event: string
	eventName: string
	eventNumber: number
	roles: string[]
	date: string
}

/** Same shape as a scraped result. */
export interface LinkResult {
	parkrunId: string
	runnerName: string
	event: string
	eventName: string
	eventNumber: number
	position: number
	time: string
	ageGrade: string
	date: string
}

export const LINK_VOLUNTEERS: LinkVolunteer[] = [
	{
		parkrunId: LINK_PARKRUN_ID,
		volunteerName: NAME,
		event: 'haga',
		eventName: 'Haga',
		eventNumber: 422,
		roles: ['Funktionär'],
		date: '2026-09-19',
	},
	{
		parkrunId: LINK_PARKRUN_ID,
		volunteerName: NAME,
		event: 'haga',
		eventName: 'Haga',
		eventNumber: 423,
		roles: ['Funktionär'],
		date: '2026-09-26',
	},
]

/**
 * Times, once he has any. Same shape as a scraped result, e.g.
 * `{ parkrunId: LINK_PARKRUN_ID, runnerName: NAME, event: 'haga', eventName: 'Haga',
 *    eventNumber: 430, position: 87, time: '31:12', ageGrade: '', date: '2026-11-14' }`
 */
export const LINK_RESULTS: LinkResult[] = []
