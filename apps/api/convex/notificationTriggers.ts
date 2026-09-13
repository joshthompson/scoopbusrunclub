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
	buildCoursePb,
	buildJourney,
	buildLargestClub,
	buildMilestone,
	buildPb,
	buildResults,
	coursePbKey,
	journeyKey,
	milestoneKey,
	pbKey,
	resultsKey,
} from '../../../libs/shared/notifications/messages'
import type { PushPayload } from '../../../libs/shared/notifications/types'
import { buildPBMap, pbResultKey } from '../../../libs/shared/results/pb'
import { api, internal } from './_generated/api'
import {
	type ActionCtx,
	internalAction,
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
			})),
		},
	)

	const claimedSet = new Set(claimed)
	const toSend = candidates.filter((c) => claimedSet.has(c.dedupeKey))

	for (const candidate of toSend) {
		await ctx.scheduler.runAfter(0, internal.notificationsSend.sendToAll, {
			payload: candidate.payload,
		})
	}

	return toSend.length
}

// ---------------------------------------------------------------------------
// After a results ingest
// ---------------------------------------------------------------------------

/**
 * Announce everything that follows from a batch of freshly inserted results.
 *
 * Called by both ingest routes — the Saturday scraper and the admin Process
 * Results page — so the club hears about results whichever way they arrived.
 * The dedupe keys mean the two can't both announce the same thing.
 */
export const afterResultsIngest = internalAction({
	args: { newResults: v.array(newResultValidator) },
	handler: async (ctx, args) => {
		const cutoff = daysAgo(RECENT_DAYS)
		const recent = args.newResults.filter((r) => r.date >= cutoff)
		if (recent.length === 0) return { sent: 0 }

		const context = await ctx.runQuery(
			internal.notificationTriggers.notificationContext,
		)

		const eventNameMap = new Map(context.eventNames)
		const eventName = (eventId: string) => eventNameMap.get(eventId) ?? eventId
		const runnerNames = new Map(
			context.runners.map((r) => [r.parkrunId, r.name] as const),
		)

		const candidates: Candidate[] = []

		// --- How many results there were ---

		const latestDate = recent.reduce(
			(latest, r) => (r.date > latest ? r.date : latest),
			'',
		)
		candidates.push({
			kind: 'results',
			dedupeKey: resultsKey(latestDate),
			payload: buildResults(recent.length),
		})

		// --- PBs and course PBs, judged against the whole history ---

		const pbMap = buildPBMap(context.results, eventName)

		for (const result of recent) {
			const status = pbMap.get(pbResultKey(result))
			if (!status) continue

			const { name, url } = runnerIdentity(
				result.parkrunId,
				runnerNames.get(result.parkrunId) ?? 'A Scoop Busser',
			)

			// An overall PB is also a course PB, and only the bigger news is worth
			// sending — the brief asks for the course one only when it stands alone.
			if (status.pb) {
				candidates.push({
					kind: 'pb',
					dedupeKey: pbKey(pbResultKey(result)),
					payload: buildPb(name, result.time, url),
				})
			} else if (status.coursePb) {
				candidates.push({
					kind: 'coursePb',
					dedupeKey: coursePbKey(pbResultKey(result)),
					payload: buildCoursePb(
						name,
						eventName(result.event),
						result.time,
						url,
					),
				})
			}
		}

		// --- Milestones ---

		const milestoneMap = buildMilestoneMap(context.results, context.runners)

		// One runner can only cross one milestone on a day, so the days that just
		// gained results are the only ones worth looking up.
		const touchedDays = new Set(recent.map((r) => `${r.parkrunId}:${r.date}`))

		for (const day of touchedDays) {
			const runs = milestoneMap.get(day)
			if (runs === undefined) continue

			const parkrunId = day.slice(0, day.indexOf(':'))
			const { name, url } = runnerIdentity(
				parkrunId,
				runnerNames.get(parkrunId) ?? 'A Scoop Busser',
			)

			candidates.push({
				kind: 'milestone',
				dedupeKey: milestoneKey(parkrunId, runs),
				payload: buildMilestone(name, runs, url),
			})
		}

		// --- Journey waypoints ---

		const recentDates = new Set(recent.map((r) => r.date))
		for (const milestone of journeyMilestones(context.results, eventName)) {
			if (!recentDates.has(milestone.date)) continue
			candidates.push({
				kind: 'journey',
				dedupeKey: journeyKey(milestone.waypoint.name),
				payload: buildJourney(milestone.waypoint),
			})
		}

		const sent = await claimAndSend(ctx, candidates)
		return { sent }
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
