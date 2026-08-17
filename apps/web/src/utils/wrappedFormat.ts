/** Text and number formatting shared by the Wrapped page and its stories view. */

/** Joins names with commas and "and": ["Josh"] → "Josh", ["Josh", "Rick"] → "Josh and Rick", ["Josh", "Eline", "Rick"] → "Josh, Eline and Rick" */
export function joinNames(names: string[]): string {
	if (names.length === 0) return ''
	if (names.length === 1) return names[0]
	if (names.length === 2) return `${names[0]} and ${names[1]}`
	return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Like `joinNames`, but caps how much of a long list is spelled out — these
 * read inside a sentence, so "and 6 more" beats a paragraph of names.
 */
export function summariseList(items: string[], limit = 3): string {
	if (items.length <= limit) return joinNames(items)
	return `${items.slice(0, limit).join(', ')} and ${items.length - limit} more`
}

/**
 * "(19 times)" bound with a non-breaking space. Short parentheticals read badly
 * split across lines — "(19" trailing one line and "times)." leading the next.
 */
export function timesLabel(count: number): string {
	return `(${count} times)`
}

export function formatDateDisplay(dateStr: string): string {
	if (!dateStr) return ''
	const d = new Date(`${dateStr}T00:00:00`)
	return d.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
}

/** Day and month only — used for spans that already sit inside a known year. */
export function formatDateShort(dateStr: string): string {
	if (!dateStr) return ''
	const d = new Date(`${dateStr}T00:00:00`)
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

/** 125 → "2:05" */
export function formatDuration(seconds: number): string {
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function ordinalSuffix(n: number): string {
	const mod100 = n % 100
	if (mod100 >= 11 && mod100 <= 13) return `${n}th`
	switch (n % 10) {
		case 1:
			return `${n}st`
		case 2:
			return `${n}nd`
		case 3:
			return `${n}rd`
		default:
			return `${n}th`
	}
}
