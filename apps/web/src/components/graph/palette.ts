/**
 * Line colours for multi-series graphs, ordered so that neighbouring series
 * stay easy to tell apart. Every colour is dark enough to read against the
 * parchment plot background and against the dark outline stroke.
 */
export const SERIES_COLORS = [
	'var(--blue-swedish)',
	'var(--pink-rose)',
	'var(--green-forest)',
	'var(--purple-violet)',
	'var(--amber-600)',
	'var(--blue-cyan)',
	'var(--purple-magenta)',
	'var(--green-teal-dark)',
	'var(--orange-600)',
	'var(--blue-indigo)',
]

/** The colour for series `index`, wrapping around if there are more series than colours. */
export function seriesColor(index: number): string {
	return SERIES_COLORS[index % SERIES_COLORS.length]
}
