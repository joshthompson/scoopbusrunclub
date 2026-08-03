import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { logAdminEvent, validateSession } from './auth'

/**
 * Support mutations for the Manual Results admin page.
 *
 * The upload itself goes through /api/admin/manual-ingest, which reuses the
 * same internal mutations as the scraper's ingest endpoints. These two cover
 * the bits that endpoint can't express: the admin-log entry (which needs the
 * session's userId) and watermarks that must only ever move forward.
 */

// --- Admin log entry for a manual upload ---

export const logIngest = internalMutation({
	args: { token: v.string(), detail: v.string() },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'manual_ingest',
			detail: args.detail,
			targetType: 'manual_results',
		})
	},
})

// --- Forward-only appData watermarks ---

/**
 * Set an appData key only when the new value is ahead of the stored one.
 *
 * The scrapers always write the newest thing they saw, but a manual upload can
 * legitimately be an older page (re-uploading a week that was missed), and
 * winding `latestHagaEventNumber` backwards would make the next scrape redo
 * work it has already done.
 */
export const raiseWatermark = internalMutation({
	args: {
		key: v.string(),
		value: v.string(),
		/** How to compare against the stored value. */
		compare: v.union(v.literal('number'), v.literal('date')),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('appData')
			.withIndex('by_key', (q) => q.eq('key', args.key))
			.unique()

		if (!existing) {
			await ctx.db.insert('appData', { key: args.key, value: args.value })
			return
		}

		const isAhead =
			args.compare === 'number'
				? Number(args.value) > Number(existing.value)
				: args.value > existing.value

		if (isAhead) {
			await ctx.db.patch(existing._id, { value: args.value })
		}
	},
})
