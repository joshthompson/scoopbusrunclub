import { v } from 'convex/values'
import { projectLargestClubs } from '../../../libs/shared/largest-clubs-rate'
import { internalMutation, query } from './_generated/server'

/**
 * Weekly snapshots of the parkrun Sweden "largest clubs" league table, plus the
 * projection maths for Scoop Bus Run Club's race to the top.
 *
 * Snapshots are scraped by scripts/fetch-largest-clubs.ts and ingested through
 * the /api/ingest-largest-clubs HTTP endpoint. One row per club per week. The
 * projection maths is shared with the web page (libs/shared/largest-clubs-rate).
 */

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
 * The clubs in the top two positions by total events (plus Scoop Bus Run Club),
 * projected over the default rate window. See `projectLargestClubs`.
 */
export const getSummary = query({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query('largestClubs').collect()
		return projectLargestClubs(rows)
	},
})
