import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import {
	type QueryCtx,
	internalMutation,
	internalQuery,
} from './_generated/server'
import { findBlockedTerm } from './profanity'

/**
 * The run game's online high scores (apps/run-game): one table for Endless,
 * and one for each course.
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
	hazards: -50,
} as const
/** Bouncing off heads: from this, doubling for each more before landing, up to the most. */
const HEADS_POINTS = { least: 100, most: 1600 }
/**
 * The most of each a course has, with some to spare: the most fika on any
 * course is 18, cheers 6, pumpkins 8, rides 8 and geese 8.
 */
const MOST_PER_COURSE = {
	fika: 22,
	cheers: 8,
	corgis: 10,
	geese: 10,
	pumpkins: 10,
	barcodes: 1,
	heads: 60,
} as const

type BonusKind = keyof typeof FIXED_POINTS | 'heads' | 'speed'
const BONUS_KINDS: BonusKind[] = [
	...(Object.keys(FIXED_POINTS) as (keyof typeof FIXED_POINTS)[]),
	'heads',
	'speed',
]

/** A ticket's good for this long: long enough for a long Endless run. */
const TICKET_HOURS = 8
const HOUR_MS = 60 * 60 * 1000
/** Per IP, a day at a time. */
const MAX_TICKETS_PER_DAY = 2000
const MAX_SCORES_PER_DAY = 1000
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
		} else if (kind === 'heads') {
			if (count > MOST_PER_COURSE.heads * courses) return 'heads'
			if (
				points < count * HEADS_POINTS.least ||
				points > count * HEADS_POINTS.most
			)
				return 'heads'
		} else {
			if (points !== count * FIXED_POINTS[kind]) return kind
			if (kind !== 'hazards' && count > MOST_PER_COURSE[kind] * courses)
				return kind
		}
		if (kind !== 'hazards') total += points
	}
	// Hazards come off, but never below 0 a course: so at most this.
	if (score > total) return 'more than it adds up to'
	return undefined
}

/**
 * A run's score, so far or at its end, sent with its ticket: on the table if
 * it adds up, as the player's one entry there if it's their best.
 */
export const submit = internalMutation({
	args: {
		ticket: v.string(),
		table: v.string(),
		playerId: v.string(),
		name: v.string(),
		icon: v.union(
			v.object({ member: v.string() }),
			v.object({ look: v.any() }),
		),
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

		const name = args.name.trim().replace(/\s+/g, ' ')
		if (!name) return { error: 'Please give a name' }
		if (name.length > MAX_NAME_LENGTH)
			return { error: `Names can be at most ${MAX_NAME_LENGTH} characters` }
		if (!/^[\w-]{8,64}$/.test(args.playerId)) return { error: 'No player' }
		if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) return { error: 'No date' }
		if (
			'look' in args.icon &&
			(typeof args.icon.look !== 'object' ||
				JSON.stringify(args.icon.look).length > 2000)
		)
			return { error: 'No such runner' }
		if ('member' in args.icon && !/^[A-Za-z]{1,30}$/.test(args.icon.member))
			return { error: 'No such runner' }

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

		const blockedTerm = findBlockedTerm(name)
		const entry = {
			table: args.table,
			score: args.score,
			name,
			icon: args.icon,
			playerId: args.playerId,
			date: args.date,
			...(args.table === 'endless'
				? { courses: args.courses }
				: { metres: args.metres, finished: args.finished }),
			ip: args.ip,
			status: blockedTerm ? ('hidden' as const) : ('active' as const),
			flagReason: blockedTerm
				? `matched blocked term '${blockedTerm}'`
				: undefined,
			updatedAt: now,
		}
		const theirs = await ctx.db
			.query('runScores')
			.withIndex('by_player', (q) =>
				q.eq('playerId', args.playerId).eq('table', args.table),
			)
			.first()
		let id: Id<'runScores'>
		if (!theirs) id = await ctx.db.insert('runScores', entry)
		else {
			id = theirs._id
			// Kept to their best; under a new name or runner, though, if they've changed it.
			if (args.score > theirs.score) await ctx.db.replace(id, entry)
			else
				await ctx.db.patch(id, {
					name,
					icon: args.icon,
					status: entry.status,
					flagReason: entry.flagReason,
				})
		}
		await ctx.db.patch(ticket._id, { scoreId: id })
		const best = await ctx.db.get(id)
		return { rank: best ? await rankOf(ctx, best) : undefined }
	},
})

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
		const shown = (entry: Doc<'runScores'>) => ({
			score: entry.score,
			name: entry.name,
			icon: entry.icon,
			date: entry.date,
			metres: entry.metres,
			finished: entry.finished,
			courses: entry.courses,
			mine: !!playerId && entry.playerId === playerId,
		})
		const entries = top.slice(0, TABLE_SIZE).map(shown)
		let mine: { rank: number; entry: ReturnType<typeof shown> } | undefined
		if (playerId && !entries.some((entry) => entry.mine)) {
			const theirs = await ctx.db
				.query('runScores')
				.withIndex('by_player', (q) =>
					q.eq('playerId', playerId).eq('table', table),
				)
				.first()
			const rank = theirs ? await rankOf(ctx, theirs) : undefined
			if (theirs && rank !== undefined) mine = { rank, entry: shown(theirs) }
		}
		return { entries, mine }
	},
})
