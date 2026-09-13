'use node'

/**
 * The one part of the club's backend that needs Node.
 *
 * Sending a web push means encrypting a payload against the subscription's keys
 * (RFC 8291) and signing a VAPID token (RFC 8292) for every endpoint. That's
 * what `web-push` does, and it's a Node library — so this file, and only this
 * file, runs in Convex's Node runtime. Everything else about notifications
 * stays in the ordinary runtime next door.
 *
 * Credentials come from the Convex environment, never the repo:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * See docs/notifications.md for where to generate them.
 */

import { v } from 'convex/values'
import webpush from 'web-push'
import {
	NOTIFICATION_BADGE,
	NOTIFICATION_ICON,
} from '../../../libs/shared/notifications/types'
import { internal } from './_generated/api'
import { internalAction } from './_generated/server'

/** How long a push service should hold a message for a device that's offline. */
const TTL_SECONDS = 60 * 60 * 24

const payloadValidator = v.object({
	title: v.string(),
	body: v.string(),
	url: v.string(),
	tag: v.string(),
})

interface Subscription {
	endpoint: string
	p256dh: string
	auth: string
}

/**
 * Load the VAPID keypair, or explain what's missing. Read per call rather than
 * at module scope so a deployment without the variables set fails with a clear
 * message instead of refusing to load the module at all.
 */
function configureVapid(): { ok: true } | { ok: false; reason: string } {
	const publicKey = process.env.VAPID_PUBLIC_KEY
	const privateKey = process.env.VAPID_PRIVATE_KEY
	const subject = process.env.VAPID_SUBJECT

	const missing = [
		!publicKey && 'VAPID_PUBLIC_KEY',
		!privateKey && 'VAPID_PRIVATE_KEY',
		!subject && 'VAPID_SUBJECT',
	].filter(Boolean)

	if (missing.length > 0) {
		return {
			ok: false,
			reason: `Push is not configured: ${missing.join(', ')} not set on this Convex deployment. See docs/notifications.md.`,
		}
	}

	// biome-ignore lint/style/noNonNullAssertion: the missing check above covers these
	webpush.setVapidDetails(subject!, publicKey!, privateKey!)
	return { ok: true }
}

/**
 * The bytes that go over the wire. The icon and badge are added here rather
 * than carried in every payload — they're the same on every notification, and
 * push services charge by the byte in the sense that payloads are size-capped.
 */
function encodePayload(payload: {
	title: string
	body: string
	url: string
	tag: string
}): string {
	return JSON.stringify({
		...payload,
		icon: NOTIFICATION_ICON,
		badge: NOTIFICATION_BADGE,
	})
}

interface SendOutcome {
	delivered: string[]
	failed: string[]
	gone: string[]
}

/**
 * Push one payload to many subscriptions, sorting the endpoints into delivered,
 * temporarily failed, and permanently gone.
 *
 * A 404 or 410 is the push service saying the subscription no longer exists —
 * the browser was uninstalled, or the user revoked permission. Those rows are
 * deleted rather than retried; anything else is counted and given more chances.
 */
async function pushToAll(
	subscriptions: Subscription[],
	body: string,
): Promise<SendOutcome> {
	const outcome: SendOutcome = { delivered: [], failed: [], gone: [] }

	const results = await Promise.allSettled(
		subscriptions.map((subscription) =>
			webpush.sendNotification(
				{
					endpoint: subscription.endpoint,
					keys: { p256dh: subscription.p256dh, auth: subscription.auth },
				},
				body,
				{ TTL: TTL_SECONDS },
			),
		),
	)

	results.forEach((result, index) => {
		const endpoint = subscriptions[index].endpoint
		if (result.status === 'fulfilled') {
			outcome.delivered.push(endpoint)
			return
		}

		const statusCode = (result.reason as { statusCode?: number })?.statusCode
		if (statusCode === 404 || statusCode === 410) outcome.gone.push(endpoint)
		else outcome.failed.push(endpoint)
	})

	return outcome
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Send one notification to everybody who has opted in.
 *
 * Every trigger ends up here. The caller has already claimed the dedupe key, so
 * this doesn't second-guess whether the message should go — it just sends it.
 */
export const sendToAll = internalAction({
	args: {
		payload: payloadValidator,
		/**
		 * The history row to write the delivered count back to, when there is one.
		 * The key was claimed before this ran, so the row already exists.
		 */
		dedupeKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const vapid = configureVapid()
		if (!vapid.ok) {
			console.error(vapid.reason)
			return { sent: 0, skipped: true as const }
		}

		const subscriptions = await ctx.runQuery(
			internal.notifications.listSubscriptions,
		)

		if (subscriptions.length === 0) {
			// Still worth recording: "nobody was subscribed" is a better answer on
			// the admin page than a blank where a number should be.
			if (args.dedupeKey) {
				await ctx.runMutation(internal.notifications.recordSentCount, {
					dedupeKey: args.dedupeKey,
					sentCount: 0,
				})
			}
			return { sent: 0, skipped: false as const }
		}

		const outcome = await pushToAll(subscriptions, encodePayload(args.payload))

		await ctx.runMutation(internal.notifications.recordSendOutcome, outcome)

		if (args.dedupeKey) {
			await ctx.runMutation(internal.notifications.recordSentCount, {
				dedupeKey: args.dedupeKey,
				sentCount: outcome.delivered.length,
			})
		}

		console.log(
			`push "${args.payload.title}": ${outcome.delivered.length} delivered, ${outcome.failed.length} failed, ${outcome.gone.length} gone`,
		)

		return { sent: outcome.delivered.length, skipped: false as const }
	},
})

/**
 * Send one notification to a single endpoint — what the Test Notification
 * button does. The endpoint has to already be subscribed, so the button can't
 * be used to push to an arbitrary browser.
 */
export const sendToOne = internalAction({
	args: { endpoint: v.string(), payload: payloadValidator },
	handler: async (ctx, args) => {
		const vapid = configureVapid()
		if (!vapid.ok) return { sent: false as const, error: vapid.reason }

		const subscription = await ctx.runQuery(
			internal.notifications.getSubscription,
			{ endpoint: args.endpoint },
		)
		if (!subscription) {
			return { sent: false as const, error: 'Not subscribed' }
		}

		const outcome = await pushToAll([subscription], encodePayload(args.payload))
		await ctx.runMutation(internal.notifications.recordSendOutcome, outcome)

		return outcome.delivered.length > 0
			? { sent: true as const }
			: { sent: false as const, error: 'The push service rejected the message' }
	},
})
