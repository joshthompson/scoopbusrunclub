import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { validateSession, logAdminEvent } from './auth'

// ── Queries ─────────────────────────────────────────────────────────

export const list = query({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token)
		if (!session) return []
		return await ctx.db.query('guests').collect()
	},
})

export const listPublic = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('guests').collect()
	},
})

export const get = query({
	args: { guestId: v.id('guests') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.guestId)
	},
})

export const getByParkrunId = query({
	args: { parkrunId: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('guests')
			.withIndex('by_parkrunId', (q) => q.eq('parkrunId', args.parkrunId))
			.unique()
	},
})

export const getGuestResults = query({
	args: { guestId: v.id('guests') },
	handler: async (ctx, args) => {
		const events = await ctx.db.query('events').collect()
		const eventNameMap = new Map(events.map((e) => [e.eventId, e.name]))

		const results = await ctx.db
			.query('guestResults')
			.withIndex('by_guestId', (q) => q.eq('guestId', args.guestId))
			.collect()

		return results.map((r) => ({
			...r,
			eventName: eventNameMap.get(r.event) ?? r.event,
		}))
	},
})

export const getAllGuestResults = query({
	args: {},
	handler: async (ctx) => {
		const guests = await ctx.db.query('guests').collect()
		const guestMap = new Map(guests.map((g) => [g._id, g]))

		const events = await ctx.db.query('events').collect()
		const eventNameMap = new Map(events.map((e) => [e.eventId, e.name]))

		const allResults = await ctx.db.query('guestResults').collect()

		return allResults.map((r) => {
			const guest = guestMap.get(r.guestId)
			return {
				guestId: r.guestId,
				guestName: guest?.name ?? 'Unknown',
				guestExtra: guest?.extra,
				guestParkrunId: guest?.parkrunId,
				event: r.event,
				eventName: eventNameMap.get(r.event) ?? r.event,
				eventNumber: r.eventNumber,
				position: r.position,
				time: r.time,
				date: r.date,
			}
		})
	},
})

// ── Mutations ───────────────────────────────────────────────────────

export const create = mutation({
	args: {
		token: v.string(),
		name: v.string(),
		extra: v.optional(v.string()),
		parkrunId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }

		const now = Date.now()
		const id = await ctx.db.insert('guests', {
			name: args.name,
			extra: args.extra,
			parkrunId: args.parkrunId,
			avatar: {},
			createdAt: now,
			modifiedAt: now,
		})

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'created_guest',
			detail: `Created guest '${args.name}'`,
			targetType: 'guest',
			targetId: id,
		})

		return { id }
	},
})

export const update = mutation({
	args: {
		token: v.string(),
		guestId: v.id('guests'),
		name: v.optional(v.string()),
		extra: v.optional(v.string()),
		parkrunId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }

		const existing = await ctx.db.get(args.guestId)
		if (!existing) return { error: 'Guest not found' }

		const patch: Record<string, string | number | undefined> = {
			modifiedAt: Date.now(),
		}
		if (args.name !== undefined) patch.name = args.name
		if (args.extra !== undefined) patch.extra = args.extra
		if (args.parkrunId !== undefined) patch.parkrunId = args.parkrunId

		await ctx.db.patch(args.guestId, patch)

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'edited_guest',
			detail: `Edited guest '${existing.name}'`,
			targetType: 'guest',
			targetId: args.guestId,
		})

		return { ok: true }
	},
})

export const remove = mutation({
	args: {
		token: v.string(),
		guestId: v.id('guests'),
	},
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }

		const existing = await ctx.db.get(args.guestId)
		if (!existing) return { error: 'Guest not found' }

		// Also remove all guest results
		const results = await ctx.db
			.query('guestResults')
			.withIndex('by_guestId', (q) => q.eq('guestId', args.guestId))
			.collect()
		for (const r of results) {
			await ctx.db.delete(r._id)
		}

		await ctx.db.delete(args.guestId)

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'deleted_guest',
			detail: `Deleted guest '${existing.name}'`,
			targetType: 'guest',
			targetId: args.guestId,
		})

		return { ok: true }
	},
})

// ── Guest result mutations ──────────────────────────────────────────

export const addGuestResult = mutation({
	args: {
		token: v.string(),
		guestId: v.id('guests'),
		event: v.string(),
		eventNumber: v.number(),
		position: v.number(),
		time: v.string(),
		date: v.string(),
	},
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }

		const guest = await ctx.db.get(args.guestId)
		if (!guest) return { error: 'Guest not found' }

		// Check for duplicate
		const existing = await ctx.db
			.query('guestResults')
			.withIndex('by_unique_result', (q) =>
				q
					.eq('guestId', args.guestId)
					.eq('event', args.event)
					.eq('eventNumber', args.eventNumber),
			)
			.unique()

		if (existing) {
			// Update existing result
			await ctx.db.patch(existing._id, {
				position: args.position,
				time: args.time,
				date: args.date,
			})
		} else {
			await ctx.db.insert('guestResults', {
				guestId: args.guestId,
				event: args.event,
				eventNumber: args.eventNumber,
				position: args.position,
				time: args.time,
				date: args.date,
				createdAt: Date.now(),
			})
		}

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'added_guest_result',
			detail: `Added result for guest '${guest.name}' at ${args.event} #${args.eventNumber}`,
			targetType: 'guest_result',
			targetId: args.guestId,
		})

		return { ok: true }
	},
})

export const removeGuestResult = mutation({
	args: {
		token: v.string(),
		resultId: v.id('guestResults'),
	},
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }

		const result = await ctx.db.get(args.resultId)
		if (!result) return { error: 'Result not found' }

		await ctx.db.delete(args.resultId)

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'deleted_guest_result',
			detail: `Deleted guest result at ${result.event} #${result.eventNumber}`,
			targetType: 'guest_result',
			targetId: result.guestId,
		})

		return { ok: true }
	},
})
