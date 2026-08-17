/**
 * Which Wrapped years are viewable, and the preview escape hatch. Shared by the
 * scrolling Wrapped page, the stories-style "explore" view, and the homepage
 * banner, so they can't disagree about what's available.
 */

export const FIRST_YEAR = 2012

/**
 * Preview mode unlocks the year in progress early, so this year's Wrapped can
 * be checked before it goes live. Opt in with a `#preview` hash on the URL.
 */
export const PREVIEW_HASH = '#preview'

export function isPreviewHash(hash: string): boolean {
	return hash.toLowerCase() === PREVIEW_HASH
}

export function getLatestAvailableYear(preview = false): number {
	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonth = now.getMonth() // 0-indexed
	// In December, the current year becomes available — as does preview mode
	if (preview || currentMonth === 11) return currentYear
	return currentYear - 1
}

export function getAvailableYears(preview = false): number[] {
	const latest = getLatestAvailableYear(preview)
	const years: number[] = []
	for (let y = latest; y >= FIRST_YEAR; y--) years.push(y)
	return years
}

/** The year in a `/wrapped/:year` param, or null when it isn't viewable yet. */
export function parseWrappedYear(
	raw: string | undefined,
	preview = false,
): number | null {
	const year = Number.parseInt(raw ?? '', 10)
	if (
		Number.isNaN(year) ||
		year < FIRST_YEAR ||
		year > getLatestAvailableYear(preview)
	) {
		return null
	}
	return year
}

/** Check if we're currently in December (for the banner) */
export function isDecember(): boolean {
	return new Date().getMonth() === 11
}

export function getWrappedBannerYear(): number {
	return new Date().getFullYear()
}
