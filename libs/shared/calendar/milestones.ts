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

/** The shape a result needs for its run number to be worked out. */
export interface MilestoneResultSource {
	parkrunId: string
	date: string
}

/** A runner's current total, as parkrun reports it on their profile. */
export interface MilestoneRunnerSource {
	parkrunId: string
	totalRuns: number
}

/**
 * "parkrunId:date" → the run number, for the days a milestone landed on.
 *
 * Counted backwards from the runner's current total rather than forwards from
 * their first result: parkrun knows how many runs someone has, but we only hold
 * the ones we've scraped, so counting forwards would number everyone's runs
 * from wherever our records happen to start.
 *
 * Shared because the website draws a balloon on these days and the backend
 * pushes a notification about them — the two must agree on which run was the
 * 100th.
 */
export function buildMilestoneMap(
	results: MilestoneResultSource[],
	runners: MilestoneRunnerSource[],
): Map<string, number> {
	const totalRunsMap = new Map<string, number>()
	for (const r of runners) totalRunsMap.set(r.parkrunId, r.totalRuns)

	const byRunner = new Map<string, MilestoneResultSource[]>()
	for (const item of results) {
		if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
		byRunner.get(item.parkrunId)?.push(item)
	}

	const map = new Map<string, number>()
	for (const [parkrunId, runs] of byRunner) {
		const totalRuns = totalRunsMap.get(parkrunId)
		if (totalRuns === undefined) continue
		runs.sort((a, b) => a.date.localeCompare(b.date))
		for (let i = 0; i < runs.length; i++) {
			const runNumber = totalRuns - (runs.length - 1 - i)
			if (MILESTONE_SET.has(runNumber)) {
				map.set(`${parkrunId}:${runs[i].date}`, runNumber)
			}
		}
	}
	return map
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
