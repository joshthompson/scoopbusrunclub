/**
 * Special (non-Saturday) parkrun event day detection.
 * Returns the name of the special event for a given date, or null if it's a normal day.
 */

/**
 * A day parkrun lets events hold an extra run. Apart from New Year's Day,
 * each country picks its own, so a day only counts for the countries listed.
 */
interface SpecialDay {
	name: string
	/** Country codes as in DOMAIN_TO_COUNTRY (`SE`, `UK`, …), or 'all' */
	countries: readonly string[] | 'all'
	/** First year the day applies, for a country that changed its day */
	fromYear?: number
	/** Last year the day applies */
	untilYear?: number
	/** Years no event in the country held it */
	exceptYears?: readonly number[]
}

/** Fixed MM-DD → special days on that date */
const FIXED_SPECIAL_DAYS: Record<string, SpecialDay[]> = {
	'01-01': [{ name: "New Year's Day", countries: 'all' }],
	'03-11': [
		{ name: 'Lithuanian Independence Restoration Day', countries: ['LT'] },
	],
	'04-27': [{ name: 'Freedom Day', countries: ['ZA'] }],
	// Austria moved its day from National Day to May 1 for 2026, and then
	// every Austrian event declined it.
	'05-01': [
		{
			name: 'State Holiday',
			countries: ['AT'],
			fromYear: 2026,
			exceptYears: [2026],
		},
	],
	'05-04': [{ name: 'Greenery Day', countries: ['JP'] }],
	'07-01': [{ name: 'Canada Day', countries: ['CA'] }],
	'08-09': [{ name: 'National Day', countries: ['SG'] }],
	'09-16': [{ name: 'Malaysia Day', countries: ['MY'] }],
	'10-03': [{ name: 'German Unity Day', countries: ['DE'] }],
	'10-26': [
		{ name: 'Austrian National Day', countries: ['AT'], untilYear: 2025 },
	],
	'12-25': [
		{ name: 'Christmas Day', countries: ['AU', 'IE', 'IT', 'NZ', 'UK'] },
	],
	'12-26': [{ name: 'Boxing Day', countries: ['PL'] }],
}

/** The club's home country, used when there's no parkrun to take one from */
const DEFAULT_COUNTRY = 'SE'

// ---------- Dynamic date helpers ----------

/** Compute Easter Sunday for a given year (Anonymous Gregorian algorithm) */
function easterSunday(year: number): Date {
	const a = year % 19
	const b = Math.floor(year / 100)
	const c = year % 100
	const d = Math.floor(b / 4)
	const e = b % 4
	const f = Math.floor((b + 8) / 25)
	const g = Math.floor((b - f + 1) / 3)
	const h = (19 * a + b - d - g + 15) % 30
	const i = Math.floor(c / 4)
	const k = c % 4
	const l = (32 + 2 * e + 2 * i - h - k) % 7
	const m = Math.floor((a + 11 * h + 22 * l) / 451)
	const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = March, 4 = April
	const day = ((h + l - 7 * m + 114) % 31) + 1
	return new Date(year, month - 1, day)
}

function toMMDD(d: Date): string {
	return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Dynamic special days that depend on Easter or other yearly calculations */
function getDynamicSpecialDays(year: number): Record<string, SpecialDay[]> {
	const easter = easterSunday(year)

	const ascension = new Date(easter)
	ascension.setDate(ascension.getDate() + 39)

	const whitMon = new Date(easter)
	whitMon.setDate(whitMon.getDate() + 50)

	const nov1 = new Date(year, 10, 1)
	const dayOfWeek = nov1.getDay()
	const firstThursday =
		dayOfWeek <= 4 ? 1 + (4 - dayOfWeek) : 1 + (11 - dayOfWeek)
	const fourthThursday = firstThursday + 21
	const thanksgivingDate = new Date(year, 10, fourthThursday)

	return {
		[toMMDD(ascension)]: [
			{ name: 'Ascension Day', countries: ['DK', 'FI', 'NO', 'SE'] },
		],
		[toMMDD(whitMon)]: [{ name: 'Whit Monday', countries: ['NL'] }],
		[toMMDD(thanksgivingDate)]: [{ name: 'Thanksgiving', countries: ['US'] }],
	}
}

function appliesTo(day: SpecialDay, country: string, year: number): boolean {
	if (day.countries !== 'all' && !day.countries.includes(country)) return false
	if (day.fromYear != null && year < day.fromYear) return false
	if (day.untilYear != null && year > day.untilYear) return false
	return !day.exceptYears?.includes(year)
}

/**
 * Given a date string (YYYY-MM-DD) and the country of the parkrun, returns
 * the special event name or null. Without a country it answers for Sweden.
 */
export function getSpecialDayName(
	dateStr: string,
	country: string = DEFAULT_COUNTRY,
): string | null {
	const mmdd = dateStr.slice(5) // "MM-DD"
	const year = Number.parseInt(dateStr.slice(0, 4), 10)
	if (Number.isNaN(year)) return null

	const candidates = [
		...(FIXED_SPECIAL_DAYS[mmdd] ?? []),
		...(getDynamicSpecialDays(year)[mmdd] ?? []),
	]
	return candidates.find((day) => appliesTo(day, country, year))?.name ?? null
}
