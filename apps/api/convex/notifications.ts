/**
 * Web push subscriptions, and the record of what has already been sent.
 *
 * This file is the storage half of notifications and runs in Convex's own
 * runtime. The sending half needs Node, and lives next door in
 * `notificationsSend.ts`; what to send is worked out in
 * `notificationTriggers.ts` and `notificationSchedule.ts`.
 */

import { v } from 'convex/values'
import type { NotificationKind } from '../../../libs/shared/notifications/messages'
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from './_generated/server'
import { validateSession } from './auth'

/**
 * How many consecutive soft failures a subscription is given before it's
 * dropped. A phone that's been off for a week shouldn't lose its subscription,
 * but one whose endpoint has quietly stopped working should.
 */
const MAX_FAILURES = 5

/**
 * How many devices one address can subscribe. Subscribing is an unauthenticated
 * public write, and while a genuine endpoint can only be minted by a push
 * service, nothing stops someone posting made-up ones. A household on one
 * connection with a phone and a laptop each is nowhere near this.
 */
const MAX_SUBSCRIPTIONS_PER_IP = 20

/**
 * An endpoint has to at least be an HTTPS URL. Push services are the only
 * things that issue these and they're all HTTPS, so anything else is junk.
 */
function isPlausibleEndpoint(endpoint: string): boolean {
	if (endpoint.length > 1000) return false
	try {
		return new URL(endpoint).protocol === 'https:'
	} catch {
		return false
	}
}

// ---------------------------------------------------------------------------
// Subscribing
// ---------------------------------------------------------------------------

/**
 * Record a browser's push subscription, or refresh one we already hold.
 *
 * Called with no authentication — there are no accounts, and the endpoint is
 * an unguessable URL the push service minted, so it authenticates itself. The
 * HTTP route in front of this rate limits by IP.
 */
export const subscribe = mutation({
	args: {
		endpoint: v.string(),
		p256dh: v.string(),
		auth: v.string(),
		userAgent: v.optional(v.string()),
		ip: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		if (!isPlausibleEndpoint(args.endpoint)) {
			return { status: 'rejected' as const, error: 'Invalid endpoint' }
		}
		if (!args.p256dh || !args.auth) {
			return { status: 'rejected' as const, error: 'Missing subscription keys' }
		}

		const existing = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
			.unique()

		if (existing) {
			// A browser can re-issue the keys for an endpoint it already has, so
			// these are refreshed rather than assumed unchanged.
			await ctx.db.patch(existing._id, {
				p256dh: args.p256dh,
				auth: args.auth,
				userAgent: args.userAgent,
				lastSeenAt: Date.now(),
				failureCount: 0,
			})
			return { status: 'refreshed' as const }
		}

		// Only new rows are capped — an existing device refreshing its keys above
		// has already been counted, and shouldn't be locked out by the cap.
		if (args.ip) {
			const fromSameIp = await ctx.db
				.query('pushSubscriptions')
				.withIndex('by_ip', (q) => q.eq('ip', args.ip))
				.collect()
			if (fromSameIp.length >= MAX_SUBSCRIPTIONS_PER_IP) {
				return { status: 'rejected' as const, error: 'Too many devices' }
			}
		}

		await ctx.db.insert('pushSubscriptions', {
			endpoint: args.endpoint,
			p256dh: args.p256dh,
			auth: args.auth,
			userAgent: args.userAgent,
			ip: args.ip,
			createdAt: Date.now(),
			lastSeenAt: Date.now(),
			failureCount: 0,
		})
		return { status: 'subscribed' as const }
	},
})

/** Forget a subscription. Silent when it's already gone — unsubscribing twice is fine. */
export const unsubscribe = mutation({
	args: { endpoint: v.string() },
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
			.unique()

		if (existing) await ctx.db.delete(existing._id)
		return { status: 'unsubscribed' as const }
	},
})

/** Whether this endpoint is one we'd push to — what the page shows on load. */
export const isSubscribed = query({
	args: { endpoint: v.string() },
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
			.unique()
		return existing !== null
	},
})

// ---------------------------------------------------------------------------
// Reading subscriptions, for the sender
// ---------------------------------------------------------------------------

export const listSubscriptions = internalQuery({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query('pushSubscriptions').collect()
		return rows.map((row) => ({
			endpoint: row.endpoint,
			p256dh: row.p256dh,
			auth: row.auth,
		}))
	},
})

/** One subscription by endpoint — all the test notification needs. */
export const getSubscription = internalQuery({
	args: { endpoint: v.string() },
	handler: async (ctx, args) => {
		const row = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
			.unique()
		if (!row) return null
		return { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth }
	},
})

/**
 * Fold a send's outcome back into the table: endpoints the push service
 * declared dead are deleted, ones that merely failed are counted, and ones that
 * worked have their counter cleared.
 */
export const recordSendOutcome = internalMutation({
	args: {
		delivered: v.array(v.string()),
		failed: v.array(v.string()),
		gone: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const find = async (endpoint: string) =>
			await ctx.db
				.query('pushSubscriptions')
				.withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
				.unique()

		for (const endpoint of args.gone) {
			const row = await find(endpoint)
			if (row) await ctx.db.delete(row._id)
		}

		for (const endpoint of args.failed) {
			const row = await find(endpoint)
			if (!row) continue
			const failureCount = row.failureCount + 1
			if (failureCount >= MAX_FAILURES) await ctx.db.delete(row._id)
			else await ctx.db.patch(row._id, { failureCount })
		}

		for (const endpoint of args.delivered) {
			const row = await find(endpoint)
			if (row && row.failureCount > 0) {
				await ctx.db.patch(row._id, { failureCount: 0, lastSeenAt: Date.now() })
			}
		}
	},
})

// ---------------------------------------------------------------------------
// Claiming what's already been said
// ---------------------------------------------------------------------------

/**
 * Claim a set of dedupe keys, returning only the ones that weren't already
 * taken. Convex mutations are transactional, so two ingests racing to announce
 * the same Saturday can't both win.
 */
export const claimDedupeKeys = internalMutation({
	args: {
		keys: v.array(
			v.object({
				dedupeKey: v.string(),
				kind: v.string(),
				title: v.optional(v.string()),
				body: v.optional(v.string()),
			}),
		),
	},
	handler: async (ctx, args) => {
		const claimed: string[] = []

		for (const { dedupeKey, kind, title, body } of args.keys) {
			const existing = await ctx.db
				.query('sentNotifications')
				.withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', dedupeKey))
				.unique()
			if (existing) continue

			await ctx.db.insert('sentNotifications', {
				dedupeKey,
				kind,
				title,
				body,
				sentAt: Date.now(),
			})
			claimed.push(dedupeKey)
		}

		return claimed
	},
})

/**
 * Write down how many devices a send reached.
 *
 * Separate from the claim because the two happen at different times: the key is
 * claimed before anything is sent (so a crash mid-send loses a notification
 * rather than repeating it), and the count is only known once the push service
 * has answered for every subscription.
 */
export const recordSentCount = internalMutation({
	args: { dedupeKey: v.string(), sentCount: v.number() },
	handler: async (ctx, args) => {
		const row = await ctx.db
			.query('sentNotifications')
			.withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', args.dedupeKey))
			.unique()
		if (row) await ctx.db.patch(row._id, { sentCount: args.sentCount })
	},
})

/**
 * Mark keys as sent without sending anything.
 *
 * Used once, on first deploy: every journey waypoint the club passed years ago
 * and every milestone already reached is "new" to an empty table, and without
 * this the first ingest would fire a decade of history at everyone's phone at
 * once. See `notificationTriggers.seedHistory`.
 */
export const seedDedupeKeys = internalMutation({
	args: {
		keys: v.array(v.object({ dedupeKey: v.string(), kind: v.string() })),
	},
	handler: async (ctx, args) => {
		let seeded = 0
		for (const { dedupeKey, kind } of args.keys) {
			const existing = await ctx.db
				.query('sentNotifications')
				.withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', dedupeKey))
				.unique()
			if (existing) continue
			await ctx.db.insert('sentNotifications', {
				dedupeKey,
				kind,
				sentAt: Date.now(),
				seeded: true,
			})
			seeded++
		}
		return seeded
	},
})

// ---------------------------------------------------------------------------
// Reading the history, for the admin page
// ---------------------------------------------------------------------------

/**
 * What has actually been sent, newest first.
 *
 * Rows written by `seedHistory` are left out: they exist to stop a notification
 * being sent, not because one was, and a few hundred of them would bury the
 * handful that are real history.
 */
export const listSent = query({
	args: {
		token: v.string(),
		limit: v.optional(v.number()),
		cursor: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token)
		if (!session) return { notifications: [], hasMore: false }

		const pageSize = Math.min(args.limit ?? 50, 200)

		// Seeded rows are excluded by the index rather than filtered afterwards:
		// they never carried a `seeded` field only when they were real sends, so
		// `undefined` selects exactly the history and the several hundred
		// bookkeeping rows are never read at all.
		const rows = await ctx.db
			.query('sentNotifications')
			.withIndex('by_seeded_sentAt', (q) =>
				args.cursor !== undefined
					? q.eq('seeded', undefined).lt('sentAt', args.cursor)
					: q.eq('seeded', undefined),
			)
			.order('desc')
			.take(pageSize + 1)

		const page = rows.slice(0, pageSize)

		return {
			notifications: page.map((row) => ({
				_id: row._id,
				dedupeKey: row.dedupeKey,
				kind: row.kind,
				title: row.title ?? null,
				body: row.body ?? null,
				sentCount: row.sentCount ?? null,
				sentAt: row.sentAt,
			})),
			hasMore: rows.length > pageSize,
		}
	},
})

/** How many devices are currently subscribed — what a send would reach. */
export const subscriberCount = query({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token)
		if (!session) return 0
		const rows = await ctx.db.query('pushSubscriptions').collect()
		return rows.length
	},
})

/** Type-check helper: the kinds `claimDedupeKeys` stores are the shared union. */
export type StoredKind = NotificationKind
