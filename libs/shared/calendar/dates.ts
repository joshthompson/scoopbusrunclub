/**
 * The calendar's dates are YYYY-MM-DD strings in local time throughout — they
 * sort and compare as strings, and never shift a day the way a UTC timestamp
 * does. These are the few sums we need on them.
 */

/** Format a Date as YYYY-MM-DD using local time (never UTC — dates shift). */
export function toISODate(date: Date): string {
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${date.getFullYear()}-${month}-${day}`
}

/** Parse a YYYY-MM-DD string as local midnight. */
export function parseISODate(date: string): Date {
	return new Date(`${date}T00:00:00`)
}

/** The year, month (1-12) and day of a YYYY-MM-DD. */
export function dateParts(
	date: string,
): [year: number, month: number, day: number] {
	const [year, month, day] = date.split('-').map(Number)
	return [year, month, day]
}

export function addDays(date: string, days: number): string {
	const [year, month, day] = dateParts(date)
	return toISODate(new Date(year, month - 1, day + days))
}

/** The day after a YYYY-MM-DD, which is where a whole-day event ends. */
export function nextDay(date: string): string {
	return addDays(date, 1)
}
