/**
 * The subscribable calendar feed.
 *
 * The feed is built by the same code the website's calendar page uses
 * (`libs/shared/calendar`), so the two never disagree, and the result is kept
 * as a file in Convex storage rather than rebuilt per request. A subscriber's
 * calendar app checks in every few hours and mostly gets the stored bytes
 * back; the file is only rebuilt when the data behind it — or the day — has
 * moved on.
 */

import { v } from 'convex/values'
import {
	CALENDAR_ENTRY_KINDS,
	type CalendarEntryKind,
} from '../../../libs/shared/calendar/entries'
import {
	ICS_FORMAT_VERSION,
	buildCalendarIcs,
} from '../../../libs/shared/calendar/ics'
import type { CalendarSources } from '../../../libs/shared/calendar/types'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
	type QueryCtx,
	internalAction,
	internalMutation,
	internalQuery,
} from './_generated/server'

const SITE_ORIGIN = 'https://scoopbus.run'

/**
 * The feeds on offer.
 *
 * `noResults` is what you get by default: the races, milestones, birthdays and
 * Track and Food, without the "who ran where" entries. Those are most of the
 * calendar by volume — a decade of them — and not what anybody wants filling
 * up the calendar they live out of. Milestones are still worked out from the
 * results either way; they're just not listed run by run.
 *
 * `full` is the calendar as the page shows it, for anyone who does want the
 * lot, and is asked for with `?results=true`.
 */
export type FeedVariant = 'noResults' | 'full'

const VARIANT_KINDS: Record<FeedVariant, CalendarEntryKind[] | undefined> = {
	noResults: CALENDAR_ENTRY_KINDS.filter((kind) => kind !== 'parkrun'),
	full: undefined,
}

const VARIANT_DESCRIPTION: Record<FeedVariant, string | undefined> = {
	noResults: 'races, milestones and birthdays from the Scoop Bus Run Club',
	// The generator's own wording already mentions the parkruns.
	full: undefined,
}

/** Where a feed's whereabouts are noted down in `appData`. */
function feedKey(variant: FeedVariant): string {
	return `calendarIcsFeed:${variant}`
}

const variantArg = v.optional(
	v.union(v.literal('noResults'), v.literal('full')),
)

interface StoredFeed {
	storageId: Id<'_storage'>
	/** What the data looked like when this was built. See {@link feedVersion}. */
	version: string
	bytes: number
	generatedAt: number
}

/**
 * A stamp for everything the feed depends on: the three data timestamps the
 * site's own cache watches, the day (the calendar's "today" moves the projected
 * milestones and the horizon along), and the generator's own version.
 *
 * UTC is close enough for the day: an entry's date comes from the data, and the
 * only thing that shifts is how far ahead the feed runs.
 */
function feedVersion(
	variant: FeedVariant,
	timestamps: {
		parkrun: string | null
		scoopBus: string | null
		guest: string | null
	},
): string {
	const today = new Date().toISOString().slice(0, 10)
	return [
		`v${ICS_FORMAT_VERSION}`,
		variant,
		timestamps.parkrun ?? '-',
		timestamps.scoopBus ?? '-',
		timestamps.guest ?? '-',
		today,
	].join('|')
}

async function appDataValue(
	ctx: QueryCtx,
	key: string,
): Promise<string | null> {
	const row = await ctx.db
		.query('appData')
		.withIndex('by_key', (q) => q.eq('key', key))
		.unique()
	return row?.value ?? null
}

/** The stored feed, if there is one, and the version it ought to be. */
export const feedState = internalQuery({
	args: { variant: variantArg },
	handler: async (ctx, args) => {
		const variant = args.variant ?? 'noResults'
		const stored = await appDataValue(ctx, feedKey(variant))
		const version = feedVersion(variant, {
			parkrun: await appDataValue(ctx, 'parkrunDataUpdatedAt'),
			scoopBus: await appDataValue(ctx, 'scoopBusDataUpdatedAt'),
			guest: await appDataValue(ctx, 'guestDataUpdatedAt'),
		})

		let feed: StoredFeed | null = null
		if (stored) {
			try {
				feed = JSON.parse(stored) as StoredFeed
			} catch {
				// A malformed note means we no longer know where the file is; rebuild.
				feed = null
			}
		}

		return { feed, version, stale: !feed || feed.version !== version }
	},
})

/**
 * Everything the calendar is built from, in the shapes the shared logic wants —
 * the same ones the public API hands the website.
 */
export const feedSources = internalQuery({
	args: {},
	handler: async (ctx) => {
		const runners = await ctx.db.query('runners').collect()
		const runnerNames = new Map(runners.map((r) => [r.parkrunId, r.name]))

		const events = await ctx.db.query('events').collect()
		const eventNames = new Map(events.map((e) => [e.eventId, e.name]))

		const results = (await ctx.db.query('runResults').collect()).map((r) => ({
			parkrunId: r.parkrunId,
			runnerName: runnerNames.get(r.parkrunId) ?? 'Unknown',
			event: r.event,
			eventName: eventNames.get(r.event) ?? r.event,
			position: r.position,
			date: r.date,
		}))

		const volunteers = (await ctx.db.query('volunteers').collect()).map(
			(v) => ({
				parkrunId: v.parkrunId,
				volunteerName: runnerNames.get(v.parkrunId) ?? 'Unknown',
				event: v.event,
				eventName: eventNames.get(v.event) ?? v.event,
				date: v.date,
			}),
		)

		const guests = await ctx.db.query('guests').collect()
		const guestNames = new Map(guests.map((g) => [g._id, g.name]))
		const guestResults = (await ctx.db.query('guestResults').collect()).map(
			(r) => ({
				guestName: guestNames.get(r.guestId) ?? 'Unknown',
				event: r.event,
				eventName: eventNames.get(r.event) ?? r.event,
				position: r.position,
				date: r.date,
			}),
		)

		const races = (await ctx.db.query('races').collect())
			.filter((race) => race.public)
			.map((race) => ({
				_id: race._id as string,
				date: race.date,
				name: race.name,
				website: race.website,
				type: race.type,
				attendees: race.attendees.map((a) => ({ runnerId: a.runnerId })),
				majorEvent: race.majorEvent,
			}))

		return {
			sources: {
				results,
				volunteers,
				guestResults,
				races,
				runners: runners.map((r) => ({
					parkrunId: r.parkrunId,
					name: r.name,
					totalRuns: r.totalRuns,
				})),
			} satisfies CalendarSources,
			eventNames: Object.fromEntries(eventNames),
		}
	},
})

/** Note where the new file is, and clear away the one it replaces. */
export const saveFeed = internalMutation({
	args: {
		variant: variantArg,
		storageId: v.id('_storage'),
		version: v.string(),
		bytes: v.number(),
	},
	handler: async (ctx, args) => {
		const key = feedKey(args.variant ?? 'noResults')
		const existing = await ctx.db
			.query('appData')
			.withIndex('by_key', (q) => q.eq('key', key))
			.unique()

		const feed: StoredFeed = {
			storageId: args.storageId,
			version: args.version,
			bytes: args.bytes,
			generatedAt: Date.now(),
		}
		const value = JSON.stringify(feed)

		if (existing) {
			await ctx.db.patch(existing._id, { value })
			try {
				const previous = JSON.parse(existing.value) as StoredFeed
				if (previous.storageId && previous.storageId !== args.storageId) {
					await ctx.storage.delete(previous.storageId)
				}
			} catch {
				// Nothing recoverable to delete.
			}
		} else {
			await ctx.db.insert('appData', { key, value })
		}
	},
})

/**
 * Rebuild the feed and store it, unless it's already current.
 *
 * Returns the version that's now on file, so a caller that was about to serve
 * the feed knows whether it should look the file up again.
 */
export const rebuild = internalAction({
	args: { variant: variantArg, force: v.optional(v.boolean()) },
	handler: async (
		ctx,
		args,
	): Promise<{ version: string; rebuilt: boolean }> => {
		const variant = args.variant ?? 'noResults'
		const state = await ctx.runQuery(internal.calendar.feedState, { variant })
		if (!state.stale && !args.force) {
			return { version: state.version, rebuilt: false }
		}

		const { sources, eventNames } = await ctx.runQuery(
			internal.calendar.feedSources,
		)

		const ics = buildCalendarIcs(
			sources,
			{ eventName: (eventId) => eventNames[eventId] ?? eventId },
			{
				siteOrigin: SITE_ORIGIN,
				kinds: VARIANT_KINDS[variant],
				description: VARIANT_DESCRIPTION[variant],
			},
		)

		const blob = new Blob([ics], { type: 'text/calendar; charset=utf-8' })
		const storageId = await ctx.storage.store(blob)

		await ctx.runMutation(internal.calendar.saveFeed, {
			variant,
			storageId,
			version: state.version,
			bytes: blob.size,
		})

		return { version: state.version, rebuilt: true }
	},
})
