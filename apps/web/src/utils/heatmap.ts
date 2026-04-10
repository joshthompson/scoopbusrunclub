import { type RunResultItem, type VolunteerItem } from "./api"

export type WeekActivity = "none" | "ran" | "volunteered" | "both"

export interface WeekCell {
  /** ISO date string (YYYY-MM-DD) of the Saturday for this week */
  date: string
  activity: WeekActivity
  /** Tooltip label, e.g. "Haga #456" */
  label: string
}

export interface HeatmapData {
  /** 53 weeks of data, oldest first */
  weeks: WeekCell[]
  currentStreak: number
  longestStreak: number
  totalActive: number
}

/** Format a Date as YYYY-MM-DD in local time (avoids UTC shift bugs). */
function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
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
 * Build heatmap data for a specific runner covering the last 53 weeks.
 */
export function buildHeatmapData(
  parkrunId: string,
  results: RunResultItem[],
  volunteers: VolunteerItem[],
): HeatmapData {
  // Determine the range: last 53 Saturdays ending at the most recent Saturday
  const today = new Date()
  const todaySat = toSaturday(toLocalDate(today))
  const start = new Date(`${todaySat}T00:00:00`)
  start.setDate(start.getDate() - 52 * 7) // 52 weeks back = 53 Saturdays total
  const startSat = toLocalDate(start)

  const allSaturdays = saturdaysBetween(startSat, todaySat)

  // Index runner's results by Saturday date
  const runDates = new Map<string, string[]>() // sat -> event names
  for (const r of results) {
    if (r.parkrunId !== parkrunId) continue
    const sat = toSaturday(r.date)
    if (!runDates.has(sat)) runDates.set(sat, [])
    runDates.get(sat)!.push(`${r.eventName} #${r.eventNumber}`)
  }

  // Index volunteer dates
  const volDates = new Map<string, string[]>()
  for (const v of volunteers) {
    if (v.parkrunId !== parkrunId) continue
    const sat = toSaturday(v.date)
    if (!volDates.has(sat)) volDates.set(sat, [])
    volDates.get(sat)!.push(`${v.eventName} #${v.eventNumber} (volunteer)`)
  }

  const weeks: WeekCell[] = allSaturdays.map((sat) => {
    const ran = runDates.has(sat)
    const vol = volDates.has(sat)
    let activity: WeekActivity = "none"
    if (ran && vol) activity = "both"
    else if (ran) activity = "ran"
    else if (vol) activity = "volunteered"

    const labels: string[] = [
      ...(runDates.get(sat) ?? []),
      ...(volDates.get(sat) ?? []),
    ]
    return { date: sat, activity, label: labels.join(", ") }
  })

  // Compute streaks (a streak = consecutive weeks with any activity, from most recent backwards)
  const activeSet = new Set(
    [...runDates.keys(), ...volDates.keys()],
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

  const totalActive = weeks.filter((w) => w.activity !== "none").length

  return { weeks, currentStreak, longestStreak, totalActive }
}
