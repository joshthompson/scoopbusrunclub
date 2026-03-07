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

export function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
