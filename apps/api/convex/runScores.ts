import type { Infer } from 'convex/values'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import {
	type MutationCtx,
	type QueryCtx,
	internalMutation,
	internalQuery,
} from './_generated/server'
import { findBlockedTerm } from './profanity'
import { runIconValidator } from './schema'

/**
 * The run game's online high scores (apps/run-game): one table for Endless,
 * and one for each course. Each score's under a player's Profile, which has
 * their name and whose head goes by it: changed once, it's changed on every
 * table they're on.
 *
 * A score can't be signed: whatever signs it ships to the player's browser,
 * and can be copied. So instead each go (a Run of Endless, or a Practice of
 * a course) gets a Ticket from here as it starts, and a score is only taken for a ticket, and only if it adds up:
 * enough real time has gone by since the ticket for the run it claims, no
 * faster than anyone can run, and every bonus the size it is in the game and
 * no more of them than a course has. It stops a faked score being sent by
 * hand; someone set on it could still fake a run that adds up.
 *
 * The game's own numbers, kept in step with apps/run-game/src/game/constants.ts.
 */
const TICK_MS = 1000 / 60
const PX_PER_M = 4
/** A little over the game's top speed, in px a tick: nobody gets round quicker. */
const TOP_SPEED = 14
const BUS_START_SPEED = 3.8
const BUS_HOLD_TICKS = 60
const SPEED_POINTS = 2
const COURSE_METRES = 5000

/** Each bonus that's always the same, for each one had. */
const FIXED_POINTS = {
	fika: 100,
	cheers: 50,
	corgis: 250,
	geese: 250,
	pumpkins: 100,
	barcodes: 250,
	rings: 50,
	gates: 25,
	hazards: -50,
} as const
/** Bouncing off heads: from this, doubling for each more before landing, up to the most. */
const HEADS_POINTS = { least: 100, most: 1600 }
/**
 * Those whose points vary, each one had: tricks landed, doubling like heads;
 * grinds, for how long; ski jumps, for how far.
 */
const RANGED_POINTS = {
	heads: HEADS_POINTS,
	tricks: { least: 100, most: 1600 },
	grinds: { least: 50, most: 500 },
	jumps: { least: 0, most: 1500 },
} as const
/**
 * The most of each a course has, with some to spare: the most fika on any
 * course is 18, cheers 6, pumpkins 8, rides 8, geese 8 and Rings 40.
 */
const MOST_PER_COURSE = {
	fika: 22,
	cheers: 8,
	corgis: 10,
	geese: 10,
	pumpkins: 10,
	barcodes: 1,
	rings: 50,
	gates: 30,
	heads: 60,
	tricks: 160,
	grinds: 40,
	jumps: 3,
} as const

type BonusKind =
	| keyof typeof FIXED_POINTS
	| keyof typeof RANGED_POINTS
	| 'speed'
const BONUS_KINDS: BonusKind[] = [
	...(Object.keys(FIXED_POINTS) as (keyof typeof FIXED_POINTS)[]),
	...(Object.keys(RANGED_POINTS) as (keyof typeof RANGED_POINTS)[]),
	'speed',
]

/** A ticket's good for this long: long enough for a long Endless run. */
const TICKET_HOURS = 8
const HOUR_MS = 60 * 60 * 1000
/** Per IP, a day at a time. */
const MAX_TICKETS_PER_DAY = 2000
const MAX_SCORES_PER_DAY = 1000
const MAX_PROFILE_SAVES_PER_DAY = 200
const DAY_MS = 24 * HOUR_MS

export const MAX_NAME_LENGTH = 16
/** How many a table shows. */
export const TABLE_SIZE = 10

/** Tables there are: Endless, and the courses' ids. */
const TABLE_ID = /^(endless|[a-z][a-z0-9-]{1,30})$/

const bonusValidator = v.object({ count: v.number(), points: v.number() })

/** A run starting: its ticket. */
export const start = internalMutation({
	args: { table: v.string(), ip: v.string() },
	handler: async (ctx, { table, ip }) => {
		if (!TABLE_ID.test(table)) return { error: 'No such table' }
		const now = Date.now()
		// Clear out a few that are past their time, as each one's handed out.
		const old = await ctx.db
			.query('runTickets')
			.withIndex('by_startedAt', (q) =>
				q.lt('startedAt', now - TICKET_HOURS * HOUR_MS),
			)
			.take(20)
		for (const ticket of old) await ctx.db.delete(ticket._id)
		if (ip) {
			const today = await ctx.db
				.query('runTickets')
				.withIndex('by_ip', (q) => q.eq('ip', ip).gt('startedAt', now - DAY_MS))
				.take(MAX_TICKETS_PER_DAY)
			if (today.length >= MAX_TICKETS_PER_DAY) return { error: 'limit' }
		}
		const ticket = await ctx.db.insert('runTickets', {
			table,
			startedAt: now,
			ip,
		})
		return { ticket }
	},
})

/** Why a score doesn’t add up, or nothing if it does. Exported to be tried out on its own. */
export function implausible(
	args: {
		score: number
		metres: number
		ticks: number
		courses: number
		bonuses: Partial<Record<BonusKind, { count: number; points: number }>>
	},
	elapsed: number,
): string | undefined {
	const { score, metres, ticks, bonuses } = args
	const whole = (n: number) => Number.isInteger(n) && n >= 0
	if (![score, metres, ticks, args.courses].every(whole)) return 'not numbers'
	// However many courses it's been on: each is 5 km.
	const courses = Math.max(1, Math.ceil(metres / COURSE_METRES), args.courses)
	if (ticks * TICK_MS > elapsed + 5000) return 'more time than has gone by'
	if (metres * PX_PER_M > ticks * TOP_SPEED + 400) return 'too quick'
	let total = metres
	for (const kind of BONUS_KINDS) {
		const bonus = bonuses[kind]
		if (!bonus) continue
		const { count, points } = bonus
		if (!Number.isInteger(count) || !Number.isInteger(points) || count < 0)
			return `${kind}: not numbers`
		if (kind === 'speed') {
			// One for each course finished, for how much quicker than the bus.
			const most =
				SPEED_POINTS *
				(metres * PX_PER_M * (1 / BUS_START_SPEED - 1 / TOP_SPEED) +
					BUS_HOLD_TICKS * courses)
			if (count > courses || points < 0 || points > most) return 'speed'
		} else if (kind in RANGED_POINTS) {
			const range = RANGED_POINTS[kind as keyof typeof RANGED_POINTS]
			const most = MOST_PER_COURSE[kind as keyof typeof RANGED_POINTS]
			if (count > most * courses) return kind
			if (points < count * range.least || points > count * range.most)
				return kind
		} else {
			const fixed = FIXED_POINTS[kind as keyof typeof FIXED_POINTS]
			if (points !== count * fixed) return kind
			if (kind !== 'hazards' && count > MOST_PER_COURSE[kind] * courses)
				return kind
		}
		if (kind !== 'hazards') total += points
	}
	// Hazards come off, but never below 0 a course: so at most this.
	if (score > total) return 'more than it adds up to'
	return undefined
}

type RunIcon = Infer<typeof runIconValidator>

/** What a player sends to be known by on the tables. */
interface ProfileFields {
	playerId: string
	name: string
	icon: RunIcon
	ip: string
}

/** Their name, tidied, if the profile's fit to keep; why not, if not. */
function checkProfile(
	args: ProfileFields,
): { name: string } | { error: string } {
	const name = args.name.trim().replace(/\s+/g, ' ')
	if (!name) return { error: 'Please give a name' }
	if (name.length > MAX_NAME_LENGTH)
		return { error: `Names can be at most ${MAX_NAME_LENGTH} characters` }
	if (!/^[\w-]{8,64}$/.test(args.playerId)) return { error: 'No player' }
	if (
		'look' in args.icon &&
		(typeof args.icon.look !== 'object' ||
			args.icon.look === null ||
			JSON.stringify(args.icon.look).length > 2000)
	)
		return { error: 'No such runner' }
	if ('member' in args.icon && !/^[A-Za-z]{1,30}$/.test(args.icon.member))
		return { error: 'No such runner' }
	return { name }
}

/** A player's profile, by the id their browser keeps. */
const profileOf = (ctx: Pick<QueryCtx, 'db'>, playerId: string) =>
	ctx.db
		.query('runProfiles')
		.withIndex('by_player', (q) => q.eq('playerId', playerId))
		.first()

/**
 * Their profile, made or brought up to date: the name, filtered, and the
 * head. Its scores hidden or shown along with it.
 */
async function saveProfileFields(
	ctx: MutationCtx,
	args: ProfileFields & { name: string },
	now: number,
): Promise<Doc<'runProfiles'>> {
	const blockedTerm = findBlockedTerm(args.name)
	const fields = {
		name: args.name,
		icon: args.icon,
		ip: args.ip,
		status: blockedTerm ? ('hidden' as const) : ('active' as const),
		flagReason: blockedTerm
			? `matched blocked term '${blockedTerm}'`
			: undefined,
		updatedAt: now,
	}
	const existing = await profileOf(ctx, args.playerId)
	if (!existing) {
		const id = await ctx.db.insert('runProfiles', {
			playerId: args.playerId,
			...fields,
		})
		return (await ctx.db.get(id)) as Doc<'runProfiles'>
	}
	await ctx.db.patch(existing._id, fields)
	if (existing.status !== fields.status)
		await setScoresStatus(ctx, existing._id, fields)
	return { ...existing, ...fields }
}

/** A profile's scores, shown or hidden with it. */
async function setScoresStatus(
	ctx: MutationCtx,
	profileId: Id<'runProfiles'>,
	{ status, flagReason }: Pick<Doc<'runProfiles'>, 'status' | 'flagReason'>,
) {
	const scores = await ctx.db
		.query('runScores')
		.withIndex('by_profile', (q) => q.eq('profileId', profileId))
		.collect()
	for (const score of scores)
		await ctx.db.patch(score._id, { status, flagReason })
}

/**
 * A player's name and head, saved to their profile: changed on every table
 * they're on, whether or not they've a new score to send.
 */
export const saveProfile = internalMutation({
	args: {
		playerId: v.string(),
		name: v.string(),
		icon: runIconValidator,
		ip: v.string(),
	},
	handler: async (ctx, args) => {
		const checked = checkProfile(args)
		if ('error' in checked) return checked
		const now = Date.now()
		if (args.ip) {
			const today = await ctx.db
				.query('runProfiles')
				.withIndex('by_ip', (q) =>
					q.eq('ip', args.ip).gt('updatedAt', now - DAY_MS),
				)
				.take(MAX_PROFILE_SAVES_PER_DAY)
			if (today.length >= MAX_PROFILE_SAVES_PER_DAY) return { error: 'limit' }
		}
		await saveProfileFields(ctx, { ...args, name: checked.name }, now)
		return { saved: true }
	},
})

/**
 * A run's score, so far or at its end, sent with its ticket: on the table if
 * it adds up, as the player's one entry there if it's their best. Under
 * their profile, saved with the name and head it's sent with.
 */
export const submit = internalMutation({
	args: {
		ticket: v.string(),
		table: v.string(),
		playerId: v.string(),
		name: v.string(),
		icon: runIconValidator,
		date: v.string(),
		score: v.number(),
		metres: v.number(),
		ticks: v.number(),
		courses: v.number(),
		finished: v.boolean(),
		bonuses: v.record(v.string(), bonusValidator),
		ip: v.string(),
	},
	handler: async (ctx, args) => {
		const ticketId = ctx.db.normalizeId('runTickets', args.ticket)
		const ticket = ticketId ? await ctx.db.get(ticketId) : null
		const now = Date.now()
		if (
			!ticket ||
			ticket.table !== args.table ||
			now - ticket.startedAt > TICKET_HOURS * HOUR_MS
		)
			return { error: 'This run can’t go on the table' }

		const checked = checkProfile(args)
		if ('error' in checked) return checked
		if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) return { error: 'No date' }

		const why = implausible(args, now - ticket.startedAt)
		if (why) {
			console.warn(`run score turned down (${args.table}): ${why}`)
			return { error: 'That score doesn’t add up' }
		}

		if (args.ip) {
			const today = await ctx.db
				.query('runScores')
				.withIndex('by_ip', (q) =>
					q.eq('ip', args.ip).gt('updatedAt', now - DAY_MS),
				)
				.take(MAX_SCORES_PER_DAY)
			if (today.length >= MAX_SCORES_PER_DAY) return { error: 'limit' }
		}

		const profile = await saveProfileFields(
			ctx,
			{ ...args, name: checked.name },
			now,
		)
		const entry = {
			table: args.table,
			score: args.score,
			profileId: profile._id,
			date: args.date,
			...(args.table === 'endless'
				? { courses: args.courses }
				: { metres: args.metres, finished: args.finished }),
			ip: args.ip,
			status: profile.status,
			flagReason: profile.flagReason,
			updatedAt: now,
		}
		const theirs = await scoreOf(ctx, profile, args.table)
		let id: Id<'runScores'>
		if (!theirs) id = await ctx.db.insert('runScores', entry)
		else {
			id = theirs._id
			// Kept to their best, and under their profile now, if it wasn't.
			if (args.score > theirs.score) await ctx.db.replace(id, entry)
			else
				await ctx.db.patch(id, {
					profileId: profile._id,
					name: undefined,
					icon: undefined,
					playerId: undefined,
					status: profile.status,
					flagReason: profile.flagReason,
				})
		}
		await ctx.db.patch(ticket._id, { scoreId: id })
		const best = await ctx.db.get(id)
		return { rank: best ? await rankOf(ctx, best) : undefined }
	},
})

/**
 * A player's score on a table: under their profile, or one from before
 * there were profiles, under their old copy of the player.
 */
async function scoreOf(
	ctx: Pick<QueryCtx, 'db'>,
	profile: Doc<'runProfiles'>,
	table: string,
) {
	return (
		(await ctx.db
			.query('runScores')
			.withIndex('by_profile', (q) =>
				q.eq('profileId', profile._id).eq('table', table),
			)
			.first()) ??
		(await ctx.db
			.query('runScores')
			.withIndex('by_player', (q) =>
				q.eq('playerId', profile.playerId).eq('table', table),
			)
			.first())
	)
}

/** Where an entry comes on its table, from 0: after anyone with more, or as many, got first. */
async function rankOf(ctx: Pick<QueryCtx, 'db'>, entry: Doc<'runScores'>) {
	if (entry.status !== 'active') return undefined
	const above = await ctx.db
		.query('runScores')
		.withIndex('by_table', (q) =>
			q
				.eq('table', entry.table)
				.eq('status', 'active')
				.gte('score', entry.score),
		)
		.collect()
	return above.filter(
		(other) =>
			other._id !== entry._id &&
			(other.score > entry.score || other.updatedAt < entry.updatedAt),
	).length
}

/**
 * Who a score's by: their profile's name and head, and whose it is; or,
 * from before there were profiles, its own copy of them.
 */
async function byWhom(ctx: Pick<QueryCtx, 'db'>, entry: Doc<'runScores'>) {
	if (entry.profileId) {
		const profile = await ctx.db.get(entry.profileId)
		return profile
			? { name: profile.name, icon: profile.icon, playerId: profile.playerId }
			: undefined
	}
	if (entry.name && entry.icon && entry.playerId)
		return { name: entry.name, icon: entry.icon, playerId: entry.playerId }
	return undefined
}

/** A table's top entries, best first, with the player's own marked; and theirs, if it's further down. */
export const list = internalQuery({
	args: { table: v.string(), playerId: v.optional(v.string()) },
	handler: async (ctx, { table, playerId }) => {
		const top = await ctx.db
			.query('runScores')
			.withIndex('by_table', (q) => q.eq('table', table).eq('status', 'active'))
			.order('desc')
			.take(TABLE_SIZE * 3)
		// Equal scores: whoever got it first goes first.
		top.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt)
		const shown = async (entry: Doc<'runScores'>) => {
			const who = await byWhom(ctx, entry)
			if (!who) return undefined
			return {
				score: entry.score,
				name: who.name,
				icon: who.icon,
				date: entry.date,
				metres: entry.metres,
				finished: entry.finished,
				courses: entry.courses,
				// Never the player's id itself: only whether it's theirs.
				mine: !!playerId && who.playerId === playerId,
			}
		}
		type Shown = NonNullable<Awaited<ReturnType<typeof shown>>>
		const entries = (await Promise.all(top.map(shown)))
			.filter((entry): entry is Shown => !!entry)
			.slice(0, TABLE_SIZE)
		let mine: { rank: number; entry: Shown } | undefined
		if (playerId && !entries.some((entry) => entry.mine)) {
			const profile = await profileOf(ctx, playerId)
			const theirs = profile
				? await scoreOf(ctx, profile, table)
				: await ctx.db
						.query('runScores')
						.withIndex('by_player', (q) =>
							q.eq('playerId', playerId).eq('table', table),
						)
						.first()
			const rank = theirs ? await rankOf(ctx, theirs) : undefined
			const entry = theirs ? await shown(theirs) : undefined
			if (entry && rank !== undefined) mine = { rank, entry }
		}
		return { entries, mine }
	},
})

/**
 * Once, after profiles came in: every score from before them moved onto
 * its player's profile, made from the newest name and head they'd sent, and
 * its own copies cleared. A page at a time, each going on to the next.
 *
 *     npx convex run runScores:migrateToProfiles
 */
export const migrateToProfiles = internalMutation({
	args: { cursor: v.optional(v.union(v.string(), v.null())) },
	handler: async (ctx, { cursor }) => {
		const page = await ctx.db
			.query('runScores')
			.paginate({ cursor: cursor ?? null, numItems: 100 })
		let moved = 0
		for (const score of page.page) {
			if (score.profileId || !score.playerId || !score.name || !score.icon)
				continue
			let profile = await profileOf(ctx, score.playerId)
			if (!profile) {
				const id = await ctx.db.insert('runProfiles', {
					playerId: score.playerId,
					name: score.name,
					icon: score.icon,
					ip: score.ip,
					status: score.status,
					flagReason: score.flagReason,
					updatedAt: score.updatedAt,
				})
				profile = await ctx.db.get(id)
			} else if (score.updatedAt > profile.updatedAt) {
				// Their newest name and head: the one they'd last sent.
				const newer = {
					name: score.name,
					icon: score.icon,
					status: score.status,
					flagReason: score.flagReason,
					updatedAt: score.updatedAt,
				}
				await ctx.db.patch(profile._id, newer)
				await setScoresStatus(ctx, profile._id, newer)
				profile = { ...profile, ...newer }
			}
			if (!profile) continue
			await ctx.db.patch(score._id, {
				profileId: profile._id,
				name: undefined,
				icon: undefined,
				playerId: undefined,
				status: profile.status,
				flagReason: profile.flagReason,
			})
			moved++
		}
		if (!page.isDone)
			await ctx.scheduler.runAfter(0, internal.runScores.migrateToProfiles, {
				cursor: page.continueCursor,
			})
		return { moved, done: page.isDone }
	},
})
