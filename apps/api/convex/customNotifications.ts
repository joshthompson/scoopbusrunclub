/**
 * Notifications written by hand in the admin area.
 *
 * Everything else the club sends follows from data — a result landed, a
 * milestone was crossed. This is the one that doesn't: somebody types it.
 *
 * Timing is Convex's job rather than the hourly cron's. Scheduling one calls
 * `ctx.scheduler.runAt`, which fires at the minute asked for and hands back a
 * job id, so a scheduled notification can be called off right up until it goes.
 * The cron only exists for the recurring 9am things, which have no row to hang
 * a job off.
 */

import { v } from 'convex/values'
import {
	CUSTOM_BODY_MAX,
	CUSTOM_TITLE_MAX,
	buildCustom,
	customKey,
} from '../../../libs/shared/notifications/messages'
import { internal } from './_generated/api'
import {
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from './_generated/server'
import { logAdminEvent, validateSession } from './auth'

/** How far ahead one can be scheduled. Beyond a year it isn't a plan. */
const MAX_SCHEDULE_AHEAD_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Slack allowed on a scheduled time being in the past, so a send chosen for
 * "now" isn't rejected because the request took a second to arrive.
 */
const PAST_TOLERANCE_MS = 60 * 1000

interface ValidationError {
	error: string
}

function validate(
	title: string,
	body: string,
	url: string,
	sendAt: number,
): ValidationError | null {
	if (!title.trim()) return { error: 'Give it a title' }
	if (title.length > CUSTOM_TITLE_MAX) {
		return { error: `Titles can be at most ${CUSTOM_TITLE_MAX} characters` }
	}
	if (!body.trim()) return { error: 'Give it a message' }
	if (body.length > CUSTOM_BODY_MAX) {
		return { error: `Messages can be at most ${CUSTOM_BODY_MAX} characters` }
	}
	// Relative only: the notification opens inside our own site, and an absolute
	// URL from a text box is a way to point the club's phones anywhere at all.
	if (url && !url.startsWith('/')) {
		return { error: 'The link must be a path on the site, starting with /' }
	}
	if (!Number.isFinite(sendAt)) return { error: 'Invalid send time' }
	if (sendAt > Date.now() + MAX_SCHEDULE_AHEAD_MS) {
		return { error: "That's more than a year away" }
	}
	if (sendAt < Date.now() - PAST_TOLERANCE_MS) {
		return { error: 'That time has already passed' }
	}
	return null
}

// ---------------------------------------------------------------------------
// Writing one
// ---------------------------------------------------------------------------

/**
 * Compose a notification, to go out now or at a chosen time.
 *
 * Super-admins only. A push reaches every subscribed device and can't be
 * recalled once the push services have it, which is a heavier thing than the
 * rest of the admin area does.
 */
export const create = mutation({
	args: {
		token: v.string(),
		title: v.string(),
		body: v.string(),
		url: v.optional(v.string()),
		/** Epoch ms. Now, or close to it, for an immediate send. */
		sendAt: v.number(),
	},
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }
		if (!session.isSuperAdmin) {
			return { error: 'Only super-admins can send notifications' }
		}

		const url = (args.url ?? '').trim()
		const invalid = validate(args.title, args.body, url, args.sendAt)
		if (invalid) return invalid

		const id = await ctx.db.insert('customNotifications', {
			title: args.title.trim(),
			body: args.body.trim(),
			url: url || '/',
			sendAt: args.sendAt,
			status: 'scheduled',
			createdBy: session.username,
			createdAt: Date.now(),
		})

		// `runAt` in the past fires immediately, which is exactly what "send now"
		// wants — no separate path for the two.
		const jobId = await ctx.scheduler.runAt(
			args.sendAt,
			internal.customNotifications.send,
			{ id },
		)
		await ctx.db.patch(id, { jobId })

		const immediate = args.sendAt <= Date.now() + PAST_TOLERANCE_MS
		await logAdminEvent(ctx, {
			username: session.username,
			userId: session.userId,
			action: immediate ? 'sent_notification' : 'scheduled_notification',
			detail: immediate
				? `Sent notification "${args.title.trim()}"`
				: `Scheduled notification "${args.title.trim()}" for ${new Date(args.sendAt).toISOString()}`,
			targetType: 'notification',
			targetId: id,
		})

		return { id, scheduled: !immediate }
	},
})

/** Call off a scheduled notification before it goes. */
export const cancel = mutation({
	args: { token: v.string(), id: v.id('customNotifications') },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }
		if (!session.isSuperAdmin) {
			return { error: 'Only super-admins can cancel notifications' }
		}

		const row = await ctx.db.get(args.id)
		if (!row) return { error: 'Not found' }
		if (row.status !== 'scheduled') {
			return { error: `That one is already ${row.status}` }
		}

		if (row.jobId) await ctx.scheduler.cancel(row.jobId)
		await ctx.db.patch(args.id, { status: 'cancelled' })

		await logAdminEvent(ctx, {
			username: session.username,
			userId: session.userId,
			action: 'cancelled_notification',
			detail: `Cancelled notification "${row.title}"`,
			targetType: 'notification',
			targetId: args.id,
		})

		return { cancelled: true }
	},
})

// ---------------------------------------------------------------------------
// Sending one
// ---------------------------------------------------------------------------

/**
 * Fired by the scheduler at the chosen moment.
 *
 * Claims a key first like every other notification, so a job that somehow runs
 * twice sends once.
 */
export const send = internalAction({
	args: { id: v.id('customNotifications') },
	// The return type is spelled out because this action reaches back into its
	// own module through `internal`, which TypeScript can't unpick on its own.
	handler: async (ctx, args): Promise<{ sent: number }> => {
		const row = await ctx.runQuery(internal.customNotifications.get, {
			id: args.id,
		})
		if (!row) return { sent: 0 }
		// Cancelled between being scheduled and firing — Convex cancels the job
		// too, so this is belt and braces.
		if (row.status !== 'scheduled') return { sent: 0 }

		const payload = buildCustom(row.title, row.body, row.url)
		const dedupeKey = customKey(args.id)

		const claimed = await ctx.runMutation(
			internal.notifications.claimDedupeKeys,
			{
				keys: [
					{
						dedupeKey,
						kind: 'custom',
						title: payload.title,
						body: payload.body,
					},
				],
			},
		)
		if (claimed.length === 0) return { sent: 0 }

		const result: { sent: number } = await ctx.runAction(
			internal.notificationsSend.sendToAll,
			{ payload, dedupeKey },
		)

		await ctx.runMutation(internal.customNotifications.markSent, {
			id: args.id,
			sentCount: result.sent,
		})

		return { sent: result.sent }
	},
})

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** One row, for the scheduled job that's about to send it. */
export const get = internalQuery({
	args: { id: v.id('customNotifications') },
	handler: async (ctx, args) => await ctx.db.get(args.id),
})

export const markSent = internalMutation({
	args: { id: v.id('customNotifications'), sentCount: v.number() },
	handler: async (ctx, args) => {
		const row = await ctx.db.get(args.id)
		if (!row || row.status !== 'scheduled') return
		await ctx.db.patch(args.id, {
			status: 'sent',
			sentAt: Date.now(),
			sentCount: args.sentCount,
		})
	},
})

/**
 * The queue, for the admin page: everything still due, then recently finished
 * ones for context. Any admin can look; only super-admins can write.
 */
export const listRecent = query({
	args: { token: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token)
		if (!session) return { scheduled: [], recent: [] }

		const rows = await ctx.db
			.query('customNotifications')
			.withIndex('by_createdAt')
			.order('desc')
			.take(Math.min(args.limit ?? 50, 200))

		const shape = (row: (typeof rows)[number]) => ({
			_id: row._id,
			title: row.title,
			body: row.body,
			url: row.url,
			sendAt: row.sendAt,
			status: row.status,
			createdBy: row.createdBy,
			sentAt: row.sentAt ?? null,
			sentCount: row.sentCount ?? null,
		})

		return {
			// Soonest first — the next thing to go out is the one worth seeing.
			scheduled: rows
				.filter((row) => row.status === 'scheduled')
				.sort((a, b) => a.sendAt - b.sendAt)
				.map(shape),
			recent: rows.filter((row) => row.status !== 'scheduled').map(shape),
		}
	},
})
