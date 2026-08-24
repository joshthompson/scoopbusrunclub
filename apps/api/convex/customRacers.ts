import { v } from 'convex/values'
import {
	type MutationCtx,
	type QueryCtx,
	mutation,
	query,
} from './_generated/server'
import { logAdminEvent, validateSession } from './auth'
import { findBlockedTerm } from './profanity'

/** How long a visitor-created racer runs in the header. */
export const RACER_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

/** Per IP and per browser, within one lifetime window. */
export const MAX_RACERS_PER_WINDOW = 5

export const MAX_NAME_LENGTH = 20

/**
 * Hard cap on how many racers run in the header at once. Enforced at creation
 * rather than at read time: the 50 already running keep their full week, and
 * whoever hits the cap is told so instead of quietly making a racer that would
 * never appear.
 */
export const MAX_ACTIVE_RACERS = 50

const avatarValidator = v.object({
	topType: v.union(
		v.literal('vest'),
		v.literal('tshirt'),
		v.literal('longsleeve'),
	),
	bottomType: v.union(
		v.literal('short-shorts'),
		v.literal('shorts'),
		v.literal('trousers'),
	),
	skin: v.union(v.literal('light'), v.literal('medium'), v.literal('dark')),
	topColor: v.string(),
	bottomColor: v.string(),
	showColor: v.string(),
	sockColor: v.optional(v.string()),
	shoeColor: v.string(),
	head: v.object({
		hair: v.optional(
			v.union(v.literal('long'), v.literal('medium'), v.literal('short')),
		),
		hairColor: v.optional(v.string()),
		accessory: v.optional(
			v.union(v.literal('cap'), v.literal('headband'), v.literal('glasses')),
		),
		accessoryColor: v.optional(v.string()),
		facialHair: v.optional(
			v.union(v.literal('beard'), v.literal('stubble'), v.literal('long')),
		),
		facialHairColor: v.optional(v.string()),
		topColorForNeck: v.optional(v.boolean()),
	}),
})

/** Colours come straight off an `<input type="color">`, so only #rrggbb is valid. */
function isHexColor(value: string): boolean {
	return /^#[0-9a-fA-F]{6}$/.test(value)
}

function avatarColorsValid(avatar: {
	topColor: string
	bottomColor: string
	showColor: string
	sockColor?: string
	shoeColor: string
	head: {
		hairColor?: string
		accessoryColor?: string
		facialHairColor?: string
	}
}): boolean {
	const colors = [
		avatar.topColor,
		avatar.bottomColor,
		avatar.showColor,
		avatar.shoeColor,
		avatar.sockColor,
		avatar.head.hairColor,
		avatar.head.accessoryColor,
		avatar.head.facialHairColor,
	]
	return colors.every((c) => c === undefined || isHexColor(c))
}

/**
 * The public shape of a racer — everything the header and the listing page need,
 * and nothing (IP, secret id, flag reason) that would leak who made it.
 */
function toPublic(racer: {
	_id: string
	name: string
	avatar: unknown
	speed: number
	createdAt: number
	expiresAt: number
}) {
	return {
		_id: racer._id,
		name: racer.name,
		avatar: racer.avatar,
		speed: racer.speed,
		createdAt: racer.createdAt,
		expiresAt: racer.expiresAt,
	}
}

/**
 * Racers currently holding a header slot. Shadow-banned ones don't count — they
 * only run for whoever made them, and letting abuse eat the cap would punish
 * everyone else. Pending ones do, since approving one puts it straight in.
 */
async function countActiveRacers(ctx: QueryCtx | MutationCtx): Promise<number> {
	const live = await ctx.db
		.query('customRacers')
		.withIndex('by_expiresAt', (q) => q.gt('expiresAt', Date.now()))
		.collect()
	return live.filter((r) => r.status !== 'hidden').length
}

/** Whether new racers have to be approved before they appear, off by default. */
async function approvalRequired(ctx: QueryCtx | MutationCtx): Promise<boolean> {
	const row = await ctx.db
		.query('appData')
		.withIndex('by_key', (q) => q.eq('key', 'customRacerApproval'))
		.unique()
	return row?.value === 'required'
}

// ── Queries ─────────────────────────────────────────────────────────

/** Live racers, for the header and the /custom-racer page. */
export const listPublic = query({
	args: {},
	handler: async (ctx) => {
		const now = Date.now()
		const live = await ctx.db
			.query('customRacers')
			.withIndex('by_expiresAt', (q) => q.gt('expiresAt', now))
			.collect()
		return live
			.filter((r) => r.status === 'active')
			.sort((a, b) => b.createdAt - a.createdAt)
			.slice(0, MAX_ACTIVE_RACERS)
			.map(toPublic)
	},
})

/**
 * The racers this browser made, including shadow-banned ones — the creator sees
 * their own work either way, which is the point of a shadow ban.
 */
export const listMine = query({
	args: { secretId: v.string() },
	handler: async (ctx, args) => {
		if (!args.secretId) {
			return {
				racers: [],
				remaining: MAX_RACERS_PER_WINDOW,
				headerFull: (await countActiveRacers(ctx)) >= MAX_ACTIVE_RACERS,
			}
		}
		const now = Date.now()
		const mine = await ctx.db
			.query('customRacers')
			.withIndex('by_secretId', (q) => q.eq('secretId', args.secretId))
			.collect()

		const recent = mine.filter((r) => r.createdAt > now - RACER_LIFETIME_MS)
		const racers = mine
			.filter((r) => r.expiresAt > now)
			.sort((a, b) => b.createdAt - a.createdAt)
			.map((r) => ({
				...toPublic(r),
				// Their own racer, so they get to know it's waiting on us
				pending: r.status === 'pending',
			}))

		return {
			racers,
			remaining: Math.max(0, MAX_RACERS_PER_WINDOW - recent.length),
			headerFull: (await countActiveRacers(ctx)) >= MAX_ACTIVE_RACERS,
		}
	},
})

// ── Public mutation ─────────────────────────────────────────────────

export const create = mutation({
	args: {
		name: v.string(),
		avatar: avatarValidator,
		speed: v.number(),
		secretId: v.string(),
		ip: v.string(),
	},
	handler: async (ctx, args) => {
		const name = args.name.trim().replace(/\s+/g, ' ')
		if (!name) return { error: 'Please give your racer a name' }
		if (name.length > MAX_NAME_LENGTH) {
			return { error: `Names can be at most ${MAX_NAME_LENGTH} characters` }
		}
		if (!args.secretId || args.secretId.length < 8) {
			return { error: 'Missing browser id — try reloading the page' }
		}
		if (!Number.isFinite(args.speed) || args.speed < 0 || args.speed > 1) {
			return { error: 'Invalid speed' }
		}
		if (!avatarColorsValid(args.avatar)) {
			return { error: 'Invalid avatar colours' }
		}

		const now = Date.now()
		const since = now - RACER_LIFETIME_MS

		// Rate limit on both axes: the browser id catches the same person coming
		// back, the IP catches them clearing storage or opening a private window.
		const bySecret = await ctx.db
			.query('customRacers')
			.withIndex('by_secretId', (q) => q.eq('secretId', args.secretId))
			.collect()
		if (
			bySecret.filter((r) => r.createdAt > since).length >=
			MAX_RACERS_PER_WINDOW
		) {
			return { error: 'limit', limit: MAX_RACERS_PER_WINDOW }
		}

		if (args.ip) {
			const byIp = await ctx.db
				.query('customRacers')
				.withIndex('by_ip', (q) => q.eq('ip', args.ip))
				.collect()
			if (
				byIp.filter((r) => r.createdAt > since).length >= MAX_RACERS_PER_WINDOW
			) {
				return { error: 'limit', limit: MAX_RACERS_PER_WINDOW }
			}
		}

		if ((await countActiveRacers(ctx)) >= MAX_ACTIVE_RACERS) {
			return { error: 'full', limit: MAX_ACTIVE_RACERS }
		}

		const blockedTerm = findBlockedTerm(name)
		const status = blockedTerm
			? 'hidden'
			: (await approvalRequired(ctx))
				? 'pending'
				: 'active'

		const id = await ctx.db.insert('customRacers', {
			name,
			avatar: args.avatar,
			speed: args.speed,
			secretId: args.secretId,
			ip: args.ip,
			status,
			flagReason: blockedTerm
				? `matched blocked term '${blockedTerm}'`
				: undefined,
			createdAt: now,
			expiresAt: now + RACER_LIFETIME_MS,
		})

		return { id, pending: status === 'pending' }
	},
})

// ── Admin ───────────────────────────────────────────────────────────

/** Everything, live or expired, with the IP and secret id attached. */
export const listAdmin = query({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token)
		if (!session) return []
		const all = await ctx.db
			.query('customRacers')
			.withIndex('by_createdAt')
			.collect()
		return all.sort((a, b) => b.createdAt - a.createdAt)
	},
})

export const adminUpdate = mutation({
	args: {
		token: v.string(),
		racerId: v.id('customRacers'),
		name: v.optional(v.string()),
		status: v.optional(
			v.union(v.literal('active'), v.literal('pending'), v.literal('hidden')),
		),
	},
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }

		const existing = await ctx.db.get(args.racerId)
		if (!existing) return { error: 'Racer not found' }

		const patch: Record<string, unknown> = {}
		const changes: string[] = []

		if (args.name !== undefined) {
			const name = args.name.trim().replace(/\s+/g, ' ')
			if (!name) return { error: 'Name cannot be empty' }
			if (name.length > MAX_NAME_LENGTH) {
				return { error: `Names can be at most ${MAX_NAME_LENGTH} characters` }
			}
			patch.name = name
			// An admin-chosen name is trusted, so the auto-block reason no longer applies
			patch.editedByAdmin = true
			patch.flagReason = undefined
			changes.push(`renamed '${existing.name}' to '${name}'`)
		}

		if (args.status !== undefined && args.status !== existing.status) {
			patch.status = args.status
			changes.push(`set status to ${args.status}`)
		}

		if (changes.length === 0) return { ok: true }

		await ctx.db.patch(args.racerId, patch)

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'edited_custom_racer',
			detail: `Custom racer: ${changes.join(', ')}`,
			targetType: 'customRacer',
			targetId: args.racerId,
		})

		return { ok: true }
	},
})

export const adminRemove = mutation({
	args: { token: v.string(), racerId: v.id('customRacers') },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }

		const existing = await ctx.db.get(args.racerId)
		if (!existing) return { error: 'Racer not found' }

		await ctx.db.delete(args.racerId)

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'deleted_custom_racer',
			detail: `Deleted custom racer '${existing.name}'`,
			targetType: 'customRacer',
			targetId: args.racerId,
		})

		return { ok: true }
	},
})

/** Read and flip the "new racers need approving" switch. */
export const getApprovalMode = query({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token)
		if (!session) return { required: false }
		return { required: await approvalRequired(ctx) }
	},
})

export const setApprovalMode = mutation({
	args: { token: v.string(), required: v.boolean() },
	handler: async (ctx, args) => {
		const session = await validateSession(ctx, args.token, true)
		if (!session) return { error: 'Unauthorized' }

		const value = args.required ? 'required' : 'off'
		const row = await ctx.db
			.query('appData')
			.withIndex('by_key', (q) => q.eq('key', 'customRacerApproval'))
			.unique()
		if (row) {
			await ctx.db.patch(row._id, { value })
		} else {
			await ctx.db.insert('appData', { key: 'customRacerApproval', value })
		}

		await logAdminEvent(ctx, {
			userId: session.userId,
			username: session.username,
			action: 'edited_custom_racer',
			detail: `Custom racer approval ${args.required ? 'enabled' : 'disabled'}`,
			targetType: 'customRacer',
		})

		return { ok: true }
	},
})
