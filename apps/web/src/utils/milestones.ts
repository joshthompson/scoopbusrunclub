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

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function firstSaturdayOnOrAfter(date: Date): Date {
	const normalized = startOfDay(date)
	const daysUntilSaturday = (6 - normalized.getDay() + 7) % 7
	return new Date(normalized.getTime() + daysUntilSaturday * DAY_MS)
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
			? new Date(startOfDay(latest).getTime() + DAY_MS)
			: today

	let firstPossibleSaturday = firstSaturdayOnOrAfter(dayAfterLatest)
	while (firstPossibleSaturday < today) {
		firstPossibleSaturday = new Date(
			firstPossibleSaturday.getTime() + 7 * DAY_MS,
		)
	}

	return new Date(
		firstPossibleSaturday.getTime() + (runsUntil - 1) * 7 * DAY_MS,
	)
}

export function ordinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd']
	const v = n % 100
	return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
