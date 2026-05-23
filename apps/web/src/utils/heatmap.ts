import type { RaceItem, RunResultItem, VolunteerItem } from './api'
import { getSpecialDayName } from './special-days'

export type WeekActivity = 'none' | 'ran' | 'volunteered' | 'both'

export interface WeekCell {
	/** ISO date string (YYYY-MM-DD) of the Saturday for this week */
	date: string
	activity: WeekActivity
	/** Tooltip label, e.g. "Haga #456" */
	label: string
	/** Whether this is a special (non-Saturday) event */
	isSpecial?: boolean
	/** Name of the special event, e.g. "Ascension Day" */
	specialName?: string
}

export interface HeatmapData {
	/** 53 weeks of data, oldest first (includes special event cells) */
	weeks: WeekCell[]
	currentStreak: number
	longestStreak: number
	totalActive: number
}

/** Format a Date as YYYY-MM-DD in local time (avoids UTC shift bugs). */
function toLocalDate(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

/**
 * Return the most recent Saturday on or before `dateStr`.
 * parkrun always runs on Saturdays so this normalises any date to its week's parkrun day.
 */
function toSaturday(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00`)
	const day = d.getDay() // 0=Sun … 6=Sat
	const diff = (day + 1) % 7 // days since last Saturday (0 if already Sat)
	d.setDate(d.getDate() - diff)
	return toLocalDate(d)
}

function saturdaysBetween(start: string, end: string): string[] {
	const result: string[] = []
	const cur = new Date(`${start}T00:00:00`)
	const endDate = new Date(`${end}T00:00:00`)
	while (cur <= endDate) {
		result.push(toLocalDate(cur))
		cur.setDate(cur.getDate() + 7)
	}
	return result
}

/**
 * Check if a date string falls on a Saturday.
 */
function isSaturday(dateStr: string): boolean {
	const d = new Date(`${dateStr}T00:00:00`)
	return d.getDay() === 6
}

/**
 * Build heatmap data for a specific runner covering the last 53 weeks.
 */
export function buildHeatmapData(
	parkrunId: string,
	results: RunResultItem[],
	volunteers: VolunteerItem[],
	races: RaceItem[] = [],
): HeatmapData {
	// Determine the range: last 53 Saturdays ending at the most recent Saturday
	const today = new Date()
	const todaySat = toSaturday(toLocalDate(today))
	const start = new Date(`${todaySat}T00:00:00`)
	start.setDate(start.getDate() - 52 * 7) // 52 weeks back = 53 Saturdays total
	const startSat = toLocalDate(start)

	const allSaturdays = saturdaysBetween(startSat, todaySat)

	// Build a lookup of race names by date
	const raceNameByDate = new Map<string, string>()
	for (const race of races) {
		if (!isSaturday(race.date)) {
			raceNameByDate.set(race.date, race.name)
		}
	}

	// Separate results into Saturday and non-Saturday (special)
	const saturdayResults: RunResultItem[] = []
	const specialResults: RunResultItem[] = []
	for (const r of results) {
		if (r.parkrunId !== parkrunId) continue
		if (isSaturday(r.date)) {
			saturdayResults.push(r)
		} else {
			specialResults.push(r)
		}
	}

	// Separate volunteers into Saturday and non-Saturday
	const saturdayVolunteers: VolunteerItem[] = []
	const specialVolunteers: VolunteerItem[] = []
	for (const v of volunteers) {
		if (v.parkrunId !== parkrunId) continue
		if (isSaturday(v.date)) {
			saturdayVolunteers.push(v)
		} else {
			specialVolunteers.push(v)
		}
	}

	// Index runner's Saturday results by date
	const runDates = new Map<string, string[]>()
	for (const r of saturdayResults) {
		const sat = r.date
		if (!runDates.has(sat)) runDates.set(sat, [])
		runDates.get(sat)?.push(`${r.eventName} #${r.eventNumber}`)
	}

	// Index Saturday volunteer dates
	const volDates = new Map<string, string[]>()
	for (const v of saturdayVolunteers) {
		const sat = v.date
		if (!volDates.has(sat)) volDates.set(sat, [])
		volDates.get(sat)?.push(`${v.eventName} #${v.eventNumber} (volunteer)`)
	}

	// Build Saturday cells
	const weeks: WeekCell[] = allSaturdays.map((sat) => {
		const ran = runDates.has(sat)
		const vol = volDates.has(sat)
		let activity: WeekActivity = 'none'
		if (ran && vol) activity = 'both'
		else if (ran) activity = 'ran'
		else if (vol) activity = 'volunteered'

		const labels: string[] = [
			...(runDates.get(sat) ?? []),
			...(volDates.get(sat) ?? []),
		]
		return { date: sat, activity, label: labels.join(', ') }
	})

	// Build special event cells from non-Saturday parkrun results/volunteering
	const specialDates = new Map<string, { ran: string[]; vol: string[] }>()
	for (const r of specialResults) {
		if (r.date < startSat || r.date > todaySat) continue
		if (!specialDates.has(r.date))
			specialDates.set(r.date, { ran: [], vol: [] })
		const entry = specialDates.get(r.date)
		if (entry) entry.ran.push(`${r.eventName} #${r.eventNumber}`)
	}
	for (const v of specialVolunteers) {
		if (v.date < startSat || v.date > todaySat) continue
		if (!specialDates.has(v.date))
			specialDates.set(v.date, { ran: [], vol: [] })
		const entry = specialDates.get(v.date)
		if (entry) entry.vol.push(`${v.eventName} #${v.eventNumber} (volunteer)`)
	}

	// Also check races where the member is an attendee
	for (const race of races) {
		if (isSaturday(race.date)) continue
		if (race.date < startSat || race.date > todaySat) continue
		const isAttendee = race.attendees.some((a) => a.runnerId === parkrunId)
		if (!isAttendee) continue
		if (!specialDates.has(race.date))
			specialDates.set(race.date, { ran: [], vol: [] })
		// Only add race name if not already captured via parkrun results
		const entry = specialDates.get(race.date)
		if (entry && entry.ran.length === 0 && entry.vol.length === 0) {
			entry.ran.push(race.name)
		}
	}

	// Create special cells and insert them at the right positions
	const specialCells: WeekCell[] = []
	for (const [date, { ran, vol }] of specialDates) {
		let activity: WeekActivity = 'none'
		if (ran.length > 0 && vol.length > 0) activity = 'both'
		else if (ran.length > 0) activity = 'ran'
		else if (vol.length > 0) activity = 'volunteered'

		const labels = [...ran, ...vol]
		const specialName =
			raceNameByDate.get(date) ?? getSpecialDayName(date) ?? 'Special Event'
		specialCells.push({
			date,
			activity,
			label: labels.join(', '),
			isSpecial: true,
			specialName,
		})
	}

	// Merge Saturday cells and special cells, sorted by date
	const allCells = [...weeks, ...specialCells].sort((a, b) =>
		a.date.localeCompare(b.date),
	)

	// Compute streaks (a streak = consecutive weeks with any activity, from most recent backwards)
	// Only count Saturday cells for streaks (special events don't break streaks)
	const saturdayCells = allCells.filter((w) => !w.isSpecial)
	const activeSet = new Set(
		saturdayCells.filter((w) => w.activity !== 'none').map((w) => w.date),
	)

	let currentStreak = 0
	let longestStreak = 0
	let streak = 0

	// Walk all Saturdays newest-first to compute streaks
	for (let i = allSaturdays.length - 1; i >= 0; i--) {
		if (activeSet.has(allSaturdays[i])) {
			streak++
			if (streak > longestStreak) longestStreak = streak
		} else {
			if (currentStreak === 0) currentStreak = streak // first gap sets current streak
			streak = 0
		}
	}
	// Edge case: no gap found → the whole range is a streak
	if (currentStreak === 0) currentStreak = streak
	if (streak > longestStreak) longestStreak = streak

	const totalActive = allCells.filter((w) => w.activity !== 'none').length

	return { weeks: allCells, currentStreak, longestStreak, totalActive }
}
