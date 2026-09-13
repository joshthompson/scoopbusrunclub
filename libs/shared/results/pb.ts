/**
 * What counts as a personal best.
 *
 * The website draws a PB pill on a result, and the backend sends a push
 * notification about the same result — so the two have to agree about what a PB
 * is, down to how a junior run and a first run are treated. The rule lives here
 * and both read it from this one place.
 *
 * Resolving an event id to its name is the caller's job, exactly as it is for
 * the journey waypoints: the website has its loaded event cache, the backend has
 * the `events` table, and neither belongs in a shared module.
 */

/** How the caller resolves an event id to its display name. */
export type EventNameLookup = (eventId: string) => string

/** The shape a result needs to have a PB worked out for it. */
export interface PBResultSource {
	parkrunId: string
	event: string
	eventNumber: number
	time: string
	date: string
}

export interface PBStatus {
	firstRun?: boolean
	pb?: boolean
	juniorPb?: boolean
	coursePb?: boolean
}

/** Seconds from "mm:ss" or "hh:mm:ss"; infinite for anything unreadable. */
export function parseTimeToSeconds(time: string): number {
	const parts = time.split(':').map(Number)
	if (parts.length === 2) return parts[0] * 60 + parts[1]
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
	return Number.POSITIVE_INFINITY
}

/** Junior parkruns are a different distance, and only their name says so. */
export function isJuniorEvent(
	eventId: string,
	eventName: EventNameLookup,
): boolean {
	return eventName(eventId).trim().toLowerCase().includes('juniors')
}

/** The key a result is filed under in the PB map. */
export function pbResultKey(result: PBResultSource): string {
	return `${result.parkrunId}:${result.date}:${result.event}:${result.eventNumber}`
}

/**
 * "parkrunId:date:event:eventNumber" → PB flags.
 *
 * Worked out by replaying each runner's history in date order, so a result is
 * judged against what was true before it rather than against their current
 * best. Junior runs keep their own best and never touch the overall one — a 2km
 * time isn't a 5km PB.
 */
export function buildPBMap(
	results: PBResultSource[],
	eventName: EventNameLookup,
): Map<string, PBStatus> {
	const map = new Map<string, PBStatus>()

	const byRunner = new Map<string, PBResultSource[]>()
	for (const item of results) {
		if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
		byRunner.get(item.parkrunId)?.push(item)
	}

	for (const runs of byRunner.values()) {
		runs.sort((a, b) => a.date.localeCompare(b.date))
		let bestOverall = Number.POSITIVE_INFINITY
		let bestJunior = Number.POSITIVE_INFINITY
		const bestPerCourse = new Map<string, number>()

		for (let i = 0; i < runs.length; i++) {
			const run = runs[i]
			const secs = parseTimeToSeconds(run.time)
			const bestCourse =
				bestPerCourse.get(run.event) ?? Number.POSITIVE_INFINITY
			const key = pbResultKey(run)
			const isJunior = isJuniorEvent(run.event, eventName)

			if (i === 0) {
				map.set(key, { firstRun: true })
				if (isJunior) {
					bestJunior = secs
				} else {
					bestOverall = secs
					bestPerCourse.set(run.event, secs)
				}
			} else {
				if (isJunior) {
					const isJuniorPb = secs < bestJunior

					if (isJuniorPb) {
						map.set(key, { juniorPb: true })
					}

					bestJunior = Math.min(bestJunior, secs)
					continue
				}

				const isOverallPb = secs < bestOverall
				const isCoursePb =
					bestCourse !== Number.POSITIVE_INFINITY && secs < bestCourse

				if (isOverallPb || isCoursePb) {
					map.set(key, {
						pb: isOverallPb,
						coursePb: isCoursePb,
					})
				}

				if (isOverallPb) {
					bestOverall = secs
				}

				bestPerCourse.set(run.event, Math.min(bestCourse, secs))
			}
		}
	}

	return map
}
