/**
 * The club members whose parkrun results we ingest.
 *
 * Shared between the scraping scripts and the Manual Results admin page so both
 * ask for exactly the same set of athletes. Adding someone here adds them to
 * both the scrape and the manual upload form.
 */

export interface TrackedAthlete {
	parkrunId: string
	'5verstId'?: string
	name: string
}

export const TRACKED_ATHLETES: TrackedAthlete[] = [
	{ parkrunId: '8070821', name: 'Josh', '5verstId': '790281221' },
	{ parkrunId: '10663604', name: 'Alisa', '5verstId': '790281220' },
	{ parkrunId: '7758658', name: 'Adam' },
	{ parkrunId: '5635044', name: 'Keith' },
	{ parkrunId: '6076813', name: 'Sophie' },
	{ parkrunId: '377595', name: 'Claire' },
	{ parkrunId: '8009111', name: 'Lyra' },
	{ parkrunId: '545803', name: 'August' },
	{ parkrunId: '850764', name: 'Anna' },
	{ parkrunId: '8943925', name: 'Eline' },
	{ parkrunId: '9679233', name: 'Rick' },
	{ parkrunId: '5346109', name: 'Other Josh' },
	{ parkrunId: '9854274', name: 'Mikael' },
	{ parkrunId: '8398883', name: 'Mia' },
	{ parkrunId: '3710502', name: 'David' },
]

export const TRACKED_IDS = new Set(TRACKED_ATHLETES.map((a) => a.parkrunId))
