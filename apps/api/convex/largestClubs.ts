import { v } from 'convex/values'
import { averageWeeklyEvents } from '../../../libs/shared/largest-clubs-rate'
import { internalMutation, query } from './_generated/server'

/**
 * Weekly snapshots of the parkrun Sweden "largest clubs" league table, plus the
 * projection maths for Scoop Bus Run Club's race to the top.
 *
 * Snapshots are scraped by scripts/fetch-largest-clubs.ts and ingested through
 * the /api/ingest-largest-clubs HTTP endpoint. One row per club per week.
 */

export const SCOOP_BUS_CLUB_NAME = 'Scoop Bus Run Club'

/**
 * Projections further out than this are treated as "not projected" — at that
 * range the rate estimate is noise, not a forecast.
 */
const MAX_PROJECTION_WEEKS = 520 // 10 years

function isScoopBus(name: string): boolean {
	return name.trim().toLowerCase() === SCOOP_BUS_CLUB_NAME.toLowerCase()
}

interface Snapshot {
	week: string
	name: string
	clubId?: string
	members: number
	events: number
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

/**
 * Upsert one club's snapshot for one week.
 *
 * (name, week) identifies a snapshot, so re-scraping a week overwrites it. That
 * happens routinely: parkrun finalises the league table days after the events it
 * counts, so a week fetched on the day gets fetched again once it settles, and
 * the later numbers must replace the earlier ones.
 */
export const storeSnapshot = internalMutation({
	args: {
		week: v.string(),
		clubId: v.optional(v.string()),
		name: v.string(),
		members: v.number(),
		events: v.number(),
	},
	handler: async (ctx, args) => {
		// collect() rather than unique(): unique() throws if a week ever ended up
		// with two rows for a club, which would leave the re-scrape unable to
		// correct the very row that's wrong. Take the first and drop any others, so
		// an overwrite always lands and the duplicate heals itself.
		const existing = await ctx.db
			.query('largestClubs')
			.withIndex('by_unique_snapshot', (q) =>
				q.eq('name', args.name).eq('week', args.week),
			)
			.collect()

		if (existing.length === 0) {
			await ctx.db.insert('largestClubs', { ...args, fetchedAt: Date.now() })
			return
		}

		await ctx.db.patch(existing[0]._id, {
			clubId: args.clubId,
			members: args.members,
			events: args.events,
			fetchedAt: Date.now(),
		})

		for (const duplicate of existing.slice(1)) {
			await ctx.db.delete(duplicate._id)
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
			// A club with too little history has no rate; the projection treats that
			// as "not growing", which keeps it out of every overtake estimate.
			averageWeeklyEvents:
				averageWeeklyEvents(snapshotsByName.get(row.name) ?? [], latestWeek) ??
				0,
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
