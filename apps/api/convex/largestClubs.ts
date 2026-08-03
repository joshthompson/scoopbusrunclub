import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'

/**
 * Weekly snapshots of the parkrun Sweden "largest clubs" league table, plus the
 * projection maths for Scoop Bus Run Club's race to the top.
 *
 * Snapshots are scraped by scripts/fetch-largest-clubs.ts and ingested through
 * the /api/ingest-largest-clubs HTTP endpoint. One row per club per week.
 */

export const SCOOP_BUS_CLUB_NAME = 'Scoop Bus Run Club'

const DAY_MS = 24 * 60 * 60 * 1000

/** How many weeks of history feed the average-weekly-events rate. */
const RATE_WINDOW_WEEKS = 6

/**
 * Projections further out than this are treated as "not projected" — at that
 * range the rate estimate is noise, not a forecast.
 */
const MAX_PROJECTION_WEEKS = 520 // 10 years

function isScoopBus(name: string): boolean {
	return name.trim().toLowerCase() === SCOOP_BUS_CLUB_NAME.toLowerCase()
}

/** Whole weeks between two YYYY-MM-DD dates (may be fractional). */
function weeksBetween(from: string, to: string): number {
	const fromMs = Date.parse(`${from}T00:00:00Z`)
	const toMs = Date.parse(`${to}T00:00:00Z`)
	if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 0
	return (toMs - fromMs) / (7 * DAY_MS)
}

/** Shift a YYYY-MM-DD date back by a number of weeks. */
function weeksBefore(week: string, count: number): string {
	const ms = Date.parse(`${week}T00:00:00Z`)
	if (Number.isNaN(ms)) return week
	return new Date(ms - count * 7 * DAY_MS).toISOString().slice(0, 10)
}

interface Snapshot {
	week: string
	name: string
	clubId?: string
	members: number
	events: number
}

/**
 * Estimate a club's events-per-week from its snapshots inside the rate window,
 * as the total gain across the window divided by the weeks it spans.
 * Returns 0 when there isn't enough history to tell.
 */
function averageWeeklyEvents(
	snapshots: Snapshot[],
	latestWeek: string,
): number {
	const cutoff = weeksBefore(latestWeek, RATE_WINDOW_WEEKS)
	const window = snapshots
		.filter((s) => s.week >= cutoff && s.week <= latestWeek)
		.sort((a, b) => a.week.localeCompare(b.week))

	if (window.length < 2) return 0

	const first = window[0]
	const last = window[window.length - 1]
	const weeks = weeksBetween(first.week, last.week)
	if (weeks <= 0) return 0

	const rate = (last.events - first.events) / weeks
	return rate > 0 ? Math.round(rate * 100) / 100 : 0
}

interface ClubRate {
	name: string
	events: number
	averageWeeklyEvents: number
}

/**
 * Whole weeks until `behind` overtakes `ahead` (i.e. holds strictly more
 * events), or null when it never happens inside the projection horizon.
 */
function weeksUntilOvertake(behind: ClubRate, ahead: ClubRate): number | null {
	const rateGap = behind.averageWeeklyEvents - ahead.averageWeeklyEvents
	if (rateGap <= 0) return null

	// +1 because overtaking means finishing strictly ahead, not level.
	const weeks = Math.ceil((ahead.events - behind.events + 1) / rateGap)
	if (weeks <= 0 || weeks > MAX_PROJECTION_WEEKS) return null
	return weeks
}

// ── Mutations ───────────────────────────────────────────────────────

/** Upsert one club's snapshot for one week. */
export const storeSnapshot = internalMutation({
	args: {
		week: v.string(),
		clubId: v.optional(v.string()),
		name: v.string(),
		members: v.number(),
		events: v.number(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('largestClubs')
			.withIndex('by_unique_snapshot', (q) =>
				q.eq('name', args.name).eq('week', args.week),
			)
			.unique()

		if (existing) {
			await ctx.db.patch(existing._id, {
				clubId: args.clubId,
				members: args.members,
				events: args.events,
				fetchedAt: Date.now(),
			})
		} else {
			await ctx.db.insert('largestClubs', { ...args, fetchedAt: Date.now() })
		}
	},
})

// ── Queries ─────────────────────────────────────────────────────────

/** Every snapshot ever taken, oldest week first. Powers the graph page. */
export const listAll = query({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query('largestClubs').collect()

		return rows
			.map((row) => ({
				week: row.week,
				name: row.name,
				clubId: row.clubId,
				members: row.members,
				events: row.events,
			}))
			.sort((a, b) => a.week.localeCompare(b.week) || b.events - a.events)
	},
})

/**
 * The clubs in the top two positions by total events (including everyone tied
 * on those two positions), plus Scoop Bus Run Club when it isn't already
 * there — each with its recent events-per-week rate and, for the challengers,
 * how long until they pass Scoop Bus.
 */
export const getSummary = query({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query('largestClubs').collect()

		if (rows.length === 0) {
			return { week: null, estimatedWeeksToLargest: null, clubs: [] }
		}

		const latestWeek = rows.reduce(
			(latest, row) => (row.week > latest ? row.week : latest),
			'',
		)

		const snapshotsByName = new Map<string, Snapshot[]>()
		for (const row of rows) {
			const list = snapshotsByName.get(row.name) ?? []
			list.push(row)
			snapshotsByName.set(row.name, list)
		}

		const current = rows
			.filter((row) => row.week === latestWeek)
			.sort((a, b) => b.events - a.events)

		// Everyone holding one of the top two distinct event totals — so ties for
		// first or second are all included.
		const topTotals = [...new Set(current.map((row) => row.events))].slice(0, 2)
		const selected = current.filter((row) => topTotals.includes(row.events))

		// Always include ourselves, even when we're further down the table.
		const scoopBusRow = current.find((row) => isScoopBus(row.name))
		if (scoopBusRow && !selected.includes(scoopBusRow)) {
			selected.push(scoopBusRow)
		}

		const clubs = selected.map((row) => ({
			name: row.name,
			members: row.members,
			events: row.events,
			averageWeeklyEvents: averageWeeklyEvents(
				snapshotsByName.get(row.name) ?? [],
				latestWeek,
			),
			isScoopBus: isScoopBus(row.name),
			/** Weeks until this club passes Scoop Bus. Null for us, or if never. */
			weeksToOvertakeScoopBus: null as number | null,
		}))

		const scoopBus = clubs.find((club) => club.isScoopBus)

		if (scoopBus) {
			for (const club of clubs) {
				if (club.isScoopBus) continue
				// Clubs already ahead of us aren't "overtaking" — they're leading.
				if (club.events > scoopBus.events) continue
				club.weeksToOvertakeScoopBus = weeksUntilOvertake(club, scoopBus)
			}
		}

		// To be the largest we have to pass everyone not already behind us; the
		// slowest of those crossings is when we'd take the lead outright.
		let estimatedWeeksToLargest: number | null = null
		if (scoopBus) {
			const toPass = clubs.filter(
				(club) => !club.isScoopBus && club.events >= scoopBus.events,
			)
			for (const club of toPass) {
				const weeks = weeksUntilOvertake(scoopBus, club)
				if (weeks === null) {
					estimatedWeeksToLargest = null
					break
				}
				estimatedWeeksToLargest = Math.max(estimatedWeeksToLargest ?? 0, weeks)
			}
		}

		return {
			week: latestWeek,
			estimatedWeeksToLargest,
			clubs: clubs.sort((a, b) => b.events - a.events),
		}
	},
})
