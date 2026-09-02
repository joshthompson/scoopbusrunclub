export const FIXED_MILESTONES = [10, 25, 50]
export const MILESTONE_CAP = 3000
export const UPCOMING_THRESHOLD = 10

export function generateMilestones(): number[] {
	const set = new Set<number>(FIXED_MILESTONES)
	for (let n = 100; n <= MILESTONE_CAP; n += 100) set.add(n)
	for (let n = 250; n <= MILESTONE_CAP; n += 250) set.add(n)
	return Array.from(set).sort((a, b) => a - b)
}

export const MILESTONES = generateMilestones()
export const MILESTONE_SET = new Set(MILESTONES)

export function nextMilestone(totalRuns: number): number | null {
	return MILESTONES.find((m) => m > totalRuns) ?? null
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Counted in whole days rather than milliseconds: the clocks change twice a
 * year, and a projection a few months out would otherwise land an hour short
 * and slip to the day before.
 */
function addDays(date: Date, days: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function firstSaturdayOnOrAfter(date: Date): Date {
	const normalized = startOfDay(date)
	const daysUntilSaturday = (6 - normalized.getDay() + 7) % 7
	return addDays(normalized, daysUntilSaturday)
}

/**
 * When a milestone could land, assuming a run every Saturday from the first one
 * after the club's latest result. Returns null when there's nothing to project.
 */
export function projectedMilestoneDate(
	runsUntil: number,
	latestResultDate: string,
): Date | null {
	if (runsUntil <= 0) return null

	const latest = latestResultDate
		? new Date(`${latestResultDate}T00:00:00`)
		: null
	const today = startOfDay(new Date())
	const dayAfterLatest =
		latest && !Number.isNaN(latest.getTime())
			? addDays(startOfDay(latest), 1)
			: today

	let firstPossibleSaturday = firstSaturdayOnOrAfter(dayAfterLatest)
	while (firstPossibleSaturday < today) {
		firstPossibleSaturday = addDays(firstPossibleSaturday, 7)
	}

	return addDays(firstPossibleSaturday, (runsUntil - 1) * 7)
}

export function ordinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd']
	const v = n % 100
	return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
