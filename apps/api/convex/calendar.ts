/**
 * The subscribable calendar feed.
 *
 * The feed is built by the same code the website's calendar page uses
 * (`libs/shared/calendar`), so the two never disagree, from the same JSON
 * snapshots the site is served (see snapshots.ts), and the result is kept as a
 * file in Convex storage rather than rebuilt per request. A subscriber's
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
	type ActionCtx,
	type QueryCtx,
	internalAction,
	internalMutation,
	internalQuery,
} from './_generated/server'
import { type SnapshotGroup, loadSnapshots, readPointer } from './snapshots'

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
 * A stamp for everything the feed depends on: the versions of the snapshot
 * files it's built from, the day (the calendar's "today" moves the projected
 * milestones and the horizon along), and the generator's own version.
 *
 * UTC is close enough for the day: an entry's date comes from the data, and the
 * only thing that shifts is how far ahead the feed runs.
 */
function feedVersion(
	variant: FeedVariant,
	snapshots: Record<SnapshotGroup, string | null>,
): string {
	const today = new Date().toISOString().slice(0, 10)
	return [
		`v${ICS_FORMAT_VERSION}`,
		variant,
		snapshots.parkrun ?? '-',
		snapshots.scoopBus ?? '-',
		snapshots.guest ?? '-',
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
			parkrun: (await readPointer(ctx, 'parkrun'))?.version ?? null,
			scoopBus: (await readPointer(ctx, 'scoopBus'))?.version ?? null,
			guest: (await readPointer(ctx, 'guest'))?.version ?? null,
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
 * Everything the calendar is built from, read out of the snapshot files rather
 * than the tables — the same shapes the public API hands the website.
 */
async function feedSources(ctx: ActionCtx): Promise<{
	sources: CalendarSources
	eventNames: Record<string, string>
}> {
	const { data } = await loadSnapshots(ctx, [
		'members',
		'parkruns',
		'results',
		'volunteers',
		'guest-results',
		'our-events',
	])

	return {
		sources: {
			results: data.results,
			volunteers: data.volunteers,
			guestResults: data['guest-results'],
			races: data['our-events'],
			runners: data.members,
		},
		eventNames: Object.fromEntries(
			data.parkruns.map((e) => [e.eventId, e.name]),
		),
	}
}

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

		const { sources, eventNames } = await feedSources(ctx)

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
