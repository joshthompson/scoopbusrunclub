/**
 * What to send, and when, after new data lands.
 *
 * Results arrive, and from them follow the notifications: how many there were,
 * whose PBs they were, which milestones they crossed, and how far along the
 * journey out of Stockholm they carried the club. Working that out means
 * replaying every result, which is exactly what the website does to draw the
 * same facts — so this reads the same shared functions rather than a second
 * opinion of its own.
 *
 * A day of results is one notification, not one per fact. Uploads arrive in
 * pieces — the admin page sends one athlete per request — so an ingest doesn't
 * announce anything itself: it arms a summary for each day it touched, a few
 * minutes out, and every further ingest for that day pushes the moment back.
 * When the uploads go quiet the summary fires once, reads the whole day, and
 * says everything in a single push.
 *
 * Nothing here sends: it builds payloads, claims their dedupe keys, and hands
 * the survivors to `notificationsSend`.
 */

import { v } from 'convex/values'
import { journeyMilestones } from '../../../libs/shared/calendar/journey'
import { buildMilestoneMap } from '../../../libs/shared/calendar/milestones'
import { memberDisplayName, memberRoute } from '../../../libs/shared/members'
import {
	LARGEST_CLUB_KEY,
	type NotificationKind,
	type ResultsSummary,
	buildLargestClub,
	buildResultsSummary,
	coursePbKey,
	journeyKey,
	milestoneKey,
	pbKey,
	resultsKey,
	summaryKey,
} from '../../../libs/shared/notifications/messages'
import type { PushPayload } from '../../../libs/shared/notifications/types'
import { buildPBMap, pbResultKey } from '../../../libs/shared/results/pb'
import { api, internal } from './_generated/api'
import {
	type ActionCtx,
	internalAction,
	internalMutation,
	internalQuery,
} from './_generated/server'

/**
 * How recent a result has to be to be worth a notification.
 *
 * Re-scraping is routine, and a backfill can insert a decade of results that
 * are new to the database but ancient to everybody else. Anything older than
 * this is stored quietly.
 */
const RECENT_DAYS = 14

/**
 * How long a results day waits after its last ingest before it's summarised.
 *
 * Long enough that an athlete-by-athlete upload from the admin page finishes
 * inside it, short enough that a Saturday evening doesn't feel late. Every
 * ingest for the day restarts the clock.
 */
const SUMMARY_QUIET_MS = 3 * 60 * 1000

/** A result as the ingest handlers report it having inserted. */
export const newResultValidator = v.object({
	parkrunId: v.string(),
	event: v.string(),
	eventNumber: v.number(),
	time: v.string(),
	date: v.string(),
})

/** A payload with the key that claims it, before the claim is made. */
interface Candidate {
	kind: NotificationKind
	dedupeKey: string
	payload: PushPayload
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Everything the triggers need in one read: every result (a PB and the journey
 * are only knowable against the full history), every runner's current total,
 * and the event names.
 */
export const notificationContext = internalQuery({
	args: {},
	handler: async (ctx) => {
		const [results, runners, events] = await Promise.all([
			ctx.db.query('runResults').collect(),
			ctx.db.query('runners').collect(),
			ctx.db.query('events').collect(),
		])

		return {
			results: results.map((r) => ({
				parkrunId: r.parkrunId,
				event: r.event,
				eventNumber: r.eventNumber,
				time: r.time,
				date: r.date,
			})),
			runners: runners.map((r) => ({
				parkrunId: r.parkrunId,
				name: r.name,
				totalRuns: r.totalRuns,
			})),
			eventNames: events.map((e) => [e.eventId, e.name] as [string, string]),
		}
	},
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** YYYY-MM-DD, `days` ago. */
function daysAgo(days: number): string {
	return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10)
}

/**
 * How a runner should be named and linked. Members get the name they're known
 * by and their own page; anyone else parkrun reported gets what it said and the
 * homepage.
 */
function runnerIdentity(
	parkrunId: string,
	fallbackName: string,
): { name: string; url: string } {
	return {
		name: memberDisplayName(parkrunId) ?? fallbackName,
		url: memberRoute(parkrunId, fallbackName) ?? '/',
	}
}

/**
 * Claim the candidates' keys and send the ones that weren't already taken.
 *
 * Claiming first means a crash mid-send loses a notification rather than
 * repeating it — the right way round for something that buzzes a phone.
 */
async function claimAndSend(
	ctx: ActionCtx,
	candidates: Candidate[],
): Promise<number> {
	if (candidates.length === 0) return 0

	const claimed = await ctx.runMutation(
		internal.notifications.claimDedupeKeys,
		{
			keys: candidates.map((c) => ({
				dedupeKey: c.dedupeKey,
				kind: c.kind,
				title: c.payload.title,
				body: c.payload.body,
			})),
		},
	)

	const claimedSet = new Set(claimed)
	const toSend = candidates.filter((c) => claimedSet.has(c.dedupeKey))

	for (const candidate of toSend) {
		await ctx.scheduler.runAfter(0, internal.notificationsSend.sendToAll, {
			payload: candidate.payload,
			dedupeKey: candidate.dedupeKey,
		})
	}

	return toSend.length
}

// ---------------------------------------------------------------------------
// After a results ingest
// ---------------------------------------------------------------------------

/**
 * Note that a batch of results landed, and arm a summary for each day in it.
 *
 * Called by both ingest routes — the Saturday scraper and the admin Process
 * Results page — so the club hears about results whichever way they arrived.
 * Sends nothing itself; see `summariseResultsDay`.
 */
export const afterResultsIngest = internalAction({
	args: { newResults: v.array(newResultValidator) },
	handler: async (ctx, args) => {
		const cutoff = daysAgo(RECENT_DAYS)
		const dates = new Set(
			args.newResults.filter((r) => r.date >= cutoff).map((r) => r.date),
		)
		for (const date of dates) {
			await ctx.runMutation(internal.notificationTriggers.armResultsSummary, {
				date,
			})
		}
		return { armed: dates.size }
	},
})

/**
 * Schedule (or re-schedule) the summary for a day of results.
 *
 * Rather than cancelling the previously scheduled summariser — cancelling a
 * function that has already started also cancels anything *it* schedules,
 * which here would be the push itself — each arming writes a fresh token and
 * the summariser checks that its own token is still the current one. A stale
 * summariser runs for a moment, finds it has been superseded, and stops.
 */
export const armResultsSummary = internalMutation({
	args: { date: v.string() },
	handler: async (ctx, args) => {
		const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
		const dueAt = Date.now() + SUMMARY_QUIET_MS

		const existing = await ctx.db
			.query('pendingResultSummaries')
			.withIndex('by_date', (q) => q.eq('date', args.date))
			.unique()

		if (existing) await ctx.db.patch(existing._id, { token, dueAt })
		else
			await ctx.db.insert('pendingResultSummaries', {
				date: args.date,
				token,
				dueAt,
			})

		await ctx.scheduler.runAfter(
			SUMMARY_QUIET_MS,
			internal.notificationTriggers.summariseResultsDay,
			{ date: args.date, token },
		)
	},
})

/**
 * Take the pending summary for a day, if this token still owns it.
 *
 * Returns false when a later ingest re-armed the day, in which case the caller
 * is stale and the newer summariser will do the work.
 */
export const takeResultsSummary = internalMutation({
	args: { date: v.string(), token: v.string() },
	handler: async (ctx, args) => {
		const pending = await ctx.db
			.query('pendingResultSummaries')
			.withIndex('by_date', (q) => q.eq('date', args.date))
			.unique()
		if (!pending || pending.token !== args.token) return false
		await ctx.db.delete(pending._id)
		return true
	},
})

/**
 * Say everything a day of results produced, in one push.
 *
 * Reads the whole day from the database rather than any one upload, so the
 * count is the day's real total however many requests it took to get there.
 * Each fact — the day itself, every PB, milestone and waypoint — claims its
 * own key first, and only the facts that were new go in the message.
 *
 * A day is announced once. If its key was already taken — a straggling upload
 * hours later, or a single result being fixed and re-ingested — nothing more
 * is sent, however much the late upload brought with it. The facts still claim
 * their keys so the history stays a true record of what has been covered.
 */
export const summariseResultsDay = internalAction({
	args: { date: v.string(), token: v.string() },
	handler: async (ctx, args) => {
		const isCurrent = await ctx.runMutation(
			internal.notificationTriggers.takeResultsSummary,
			{ date: args.date, token: args.token },
		)
		if (!isCurrent) return { sent: 0, stale: true as const }

		// Guarded at ingest too, but the quiet period could in principle carry a
		// day over the line, and history should never buzz anybody.
		if (args.date < daysAgo(RECENT_DAYS))
			return { sent: 0, stale: false as const }

		const context = await ctx.runQuery(
			internal.notificationTriggers.notificationContext,
		)

		const eventNameMap = new Map(context.eventNames)
		const eventName = (eventId: string) => eventNameMap.get(eventId) ?? eventId
		const runnerNames = new Map(
			context.runners.map((r) => [r.parkrunId, r.name] as const),
		)
		const runnerName = (parkrunId: string) =>
			runnerIdentity(parkrunId, runnerNames.get(parkrunId) ?? 'A Scoop Busser')
				.name

		const dayResults = context.results.filter((r) => r.date === args.date)
		if (dayResults.length === 0) return { sent: 0, stale: false as const }

		// --- Gather the day's facts, each with the key that claims it ---

		interface Fact {
			dedupeKey: string
			kind: NotificationKind
			apply: (summary: ResultsSummary) => void
		}
		const facts: Fact[] = []

		// The day's own key. Whether this one is new decides whether anything
		// is sent at all; the count itself comes from `dayResults`.
		facts.push({
			dedupeKey: resultsKey(args.date),
			kind: 'results',
			apply: () => {},
		})

		const pbMap = buildPBMap(context.results, eventName)
		for (const result of dayResults) {
			const status = pbMap.get(pbResultKey(result))
			if (!status) continue
			const name = runnerName(result.parkrunId)

			// An overall PB is also a course PB, and only the bigger news is worth
			// telling — the course one stands in only when it stands alone.
			if (status.pb) {
				facts.push({
					dedupeKey: pbKey(pbResultKey(result)),
					kind: 'pb',
					apply: (summary) => summary.pbs.push({ name, time: result.time }),
				})
			} else if (status.coursePb) {
				facts.push({
					dedupeKey: coursePbKey(pbResultKey(result)),
					kind: 'coursePb',
					apply: (summary) =>
						summary.pbs.push({
							name,
							time: result.time,
							course: eventName(result.event),
						}),
				})
			}
		}

		const milestoneMap = buildMilestoneMap(context.results, context.runners)
		for (const parkrunId of new Set(dayResults.map((r) => r.parkrunId))) {
			const runs = milestoneMap.get(`${parkrunId}:${args.date}`)
			if (runs === undefined) continue
			const name = runnerName(parkrunId)
			facts.push({
				dedupeKey: milestoneKey(parkrunId, runs),
				kind: 'milestone',
				apply: (summary) => summary.milestones.push({ name, runs }),
			})
		}

		for (const milestone of journeyMilestones(context.results, eventName)) {
			if (milestone.date !== args.date) continue
			facts.push({
				dedupeKey: journeyKey(milestone.waypoint.name),
				kind: 'journey',
				apply: (summary) =>
					summary.journey.push({
						name: milestone.waypoint.name,
						reached: milestone.waypoint.reached,
					}),
			})
		}

		// --- Claim them, and say only what was new ---

		const claimed = new Set(
			await ctx.runMutation(internal.notifications.claimQuietly, {
				keys: facts.map((f) => ({ dedupeKey: f.dedupeKey, kind: f.kind })),
			}),
		)

		// The day itself was already announced: this is a late upload, and the
		// club has heard about the Saturday. Stay quiet.
		if (!claimed.has(resultsKey(args.date))) {
			return { sent: 0, stale: false as const, alreadyAnnounced: true as const }
		}

		const summary: ResultsSummary = {
			resultCount: dayResults.length,
			pbs: [],
			milestones: [],
			journey: [],
		}
		for (const fact of facts) {
			if (claimed.has(fact.dedupeKey)) fact.apply(summary)
		}

		const payload = buildResultsSummary(args.date, summary)

		const sent = await claimAndSend(ctx, [
			{
				kind: 'results',
				dedupeKey: summaryKey(args.date, Date.now()),
				payload,
			},
		])
		return { sent, stale: false as const }
	},
})

// ---------------------------------------------------------------------------
// After a largest-clubs ingest
// ---------------------------------------------------------------------------

/**
 * Announce the club taking the top of the Swedish league table.
 *
 * Sent once, ever — `LARGEST_CLUB_KEY` carries no week, so holding the lead
 * week after week doesn't buzz anybody, and neither does losing it and getting
 * it back. The first time is the news.
 */
export const afterLargestClubsIngest = internalAction({
	args: {},
	handler: async (ctx) => {
		const summary = await ctx.runQuery(api.largestClubs.getSummary)
		if (summary.clubs.length === 0) return { sent: 0 }

		const us = summary.clubs.find((club) => club.isScoopBus)
		if (!us) return { sent: 0 }

		// Strictly ahead of everyone, not level with them — "the most of any club"
		// isn't true of a tie, and a tie is a week away from being resolved anyway.
		const clearlyLargest = summary.clubs.every(
			(club) => club.isScoopBus || club.events < us.events,
		)
		if (!clearlyLargest) return { sent: 0 }

		const sent = await claimAndSend(ctx, [
			{
				kind: 'largestClub',
				dedupeKey: LARGEST_CLUB_KEY,
				payload: buildLargestClub(us.events),
			},
		])
		return { sent }
	},
})

// ---------------------------------------------------------------------------
// First-run seeding
// ---------------------------------------------------------------------------

/**
 * Write down every notification that would be "new" today, without sending any
 * of them.
 *
 * The dedupe table starts empty, so on a fresh deployment every journey
 * waypoint the club passed years ago and every milestone anybody has ever
 * reached counts as unannounced. Run this once from the Convex dashboard before
 * the first ingest, and only history from that point on gets pushed.
 */
export const seedHistory = internalAction({
	args: {},
	handler: async (ctx) => {
		const context = await ctx.runQuery(
			internal.notificationTriggers.notificationContext,
		)

		const eventNameMap = new Map(context.eventNames)
		const eventName = (eventId: string) => eventNameMap.get(eventId) ?? eventId

		const keys: { dedupeKey: string; kind: string }[] = []

		const pbMap = buildPBMap(context.results, eventName)
		for (const [resultKey, status] of pbMap) {
			if (status.pb) keys.push({ dedupeKey: pbKey(resultKey), kind: 'pb' })
			else if (status.coursePb) {
				keys.push({ dedupeKey: coursePbKey(resultKey), kind: 'coursePb' })
			}
		}

		const milestoneMap = buildMilestoneMap(context.results, context.runners)
		for (const [day, runs] of milestoneMap) {
			const parkrunId = day.slice(0, day.indexOf(':'))
			keys.push({
				dedupeKey: milestoneKey(parkrunId, runs),
				kind: 'milestone',
			})
		}

		for (const milestone of journeyMilestones(context.results, eventName)) {
			keys.push({
				dedupeKey: journeyKey(milestone.waypoint.name),
				kind: 'journey',
			})
		}

		for (const date of new Set(context.results.map((r) => r.date))) {
			keys.push({ dedupeKey: resultsKey(date), kind: 'results' })
		}

		// Claimed in batches — a decade of results is more keys than one mutation
		// should carry, and each batch is independently safe to retry.
		const BATCH = 250
		let seeded = 0
		for (let i = 0; i < keys.length; i += BATCH) {
			seeded += await ctx.runMutation(internal.notifications.seedDedupeKeys, {
				keys: keys.slice(i, i + BATCH),
			})
		}

		return { seeded, considered: keys.length }
	},
})
