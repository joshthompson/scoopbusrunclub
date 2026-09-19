import type { RunResultItem, VolunteerItem } from '@/utils/api'

/**
 * Link's record, kept by hand.
 *
 * Link is a dog, so parkrun issues him no times and no volunteer credits, and
 * `CLUB_MEMBERS.link.id` stays empty for the backend. The club credits him
 * here instead: these entries are appended to the fetched results and
 * volunteer lists when the app loads, under a made-up parkrun id, so his page,
 * the heatmap, celebrations and the header treat them like anyone else's.
 *
 * Roles use the Swedish names parkrun reports (see `data/volunteer-roles`),
 * so the header picks the right pose and the lists translate them the same way.
 */
export const LINK_PARKRUN_ID = 'link'

const NAME = 'Link'

export const LINK_VOLUNTEERS: VolunteerItem[] = [
	{
		parkrunId: LINK_PARKRUN_ID,
		volunteerName: NAME,
		event: 'haga',
		eventName: 'Haga',
		eventNumber: 422,
		roles: ['Funktionär'],
		date: '2026-09-19',
	},
]

/**
 * Times, once he has any. Same shape as a scraped result, e.g.
 * `{ parkrunId: LINK_PARKRUN_ID, runnerName: NAME, event: 'haga', eventName: 'Haga',
 *    eventNumber: 430, position: 87, time: '31:12', ageGrade: '', date: '2026-11-14' }`
 */
export const LINK_RESULTS: RunResultItem[] = []

export function withLinkResults(results: RunResultItem[]): RunResultItem[] {
	return LINK_RESULTS.length ? [...results, ...LINK_RESULTS] : results
}

export function withLinkVolunteers(
	volunteers: VolunteerItem[],
): VolunteerItem[] {
	return LINK_VOLUNTEERS.length
		? [...volunteers, ...LINK_VOLUNTEERS]
		: volunteers
}
