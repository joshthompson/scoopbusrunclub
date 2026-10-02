import type { RunResultItem, VolunteerItem } from '@/utils/api'
import { LINK_PARKRUN_ID, LINK_RESULTS, LINK_VOLUNTEERS } from '@shared/link'

/**
 * Link's hand-kept record (see `libs/shared/link.ts`), appended to the fetched
 * results and volunteer lists when the app loads.
 */
export { LINK_PARKRUN_ID }

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
