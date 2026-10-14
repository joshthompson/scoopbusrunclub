import type { MemberKey } from '@shared/members'

/**
 * Hand-picked Wrapped awards — the things worth celebrating that no stat can
 * find. Each one becomes its own slide at the end of that year's Wrapped, in
 * the order written here.
 */
export interface WrappedAward {
	year: number
	/** Unique within the year. */
	id: string
	emoji: string
	title: string
	winners: MemberKey[]
	/** What it was won for. Reads after "for their", e.g. "parkrun report". */
	reason: string
	/** Where to read or see it. Linked from `reason` on the scrolling page. */
	link?: string
}

export const WRAPPED_AWARDS: WrappedAward[] = [
	{
		year: 2026,
		id: 'best-run-report',
		emoji: '📝',
		title: 'Best Run Report',
		winners: ['eline', 'anna', 'mikael'],
		reason: 'Urheilupuisto parkrun #48 report',
		link: 'https://www.parkrun.fi/urheilupuisto/news/2026/04/28/scoop-bus-run-club-parkrun-report-event-48/',
	},
]

export function getWrappedAwards(year: number): WrappedAward[] {
	return WRAPPED_AWARDS.filter((award) => award.year === year)
}
