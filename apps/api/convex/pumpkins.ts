import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { findBlockedTerm } from './profanity'

/** Kept in step with `PUMPKIN_WIDTH` and `PUMPKIN_HEIGHT` on the website. */
const PUMPKIN_WIDTH = 29
const PUMPKIN_PIXELS = PUMPKIN_WIDTH * 23

/** Kept in step with `MAX_PUMPKIN_NAME_LENGTH` on the website. */
export const MAX_NAME_LENGTH = 20

/** Per IP, a day at a time. */
export const MAX_PUMPKINS_PER_DAY = 10
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * How many of the newest pumpkins from the database the patch page shows and
 * the random ones are picked from, so a visit never has to read the whole
 * patch. Josh's come on top.
 */
const PATCH_SIZE = 500

/**
 * Josh's pumpkins, the same faces as the website's drawn `pumpkin1.png` to
 * `pumpkin5.png`. Always in the patch, alongside everyone's from the database,
 * without being in it themselves: to change one, change it here. Drawn the way
 * they're carved: `#` cut out, `o` left as pumpkin, `.` not pumpkin at all.
 */
const JOSHS_DRAWINGS = [
	{
		// pumpkin1.png
		name: 'Smirko',
		rows: [
			'.............................',
			'.............................',
			'.............................',
			'.............................',
			'.......oooooo...ooooooo......',
			'.....ooooooooo.ooooooooo.....',
			'...ooooooooooooooooooooooo...',
			'..oooooooooooooooooooooooo...',
			'..oooo#oooooooooooo#ooooooo..',
			'.oooo##oooooooooooo#oooooooo.',
			'.oooo##ooooooooooo##oooooooo.',
			'ooooo###ooooooooo###oooooooo.',
			'oooo#####ooooooo#####ooooooo.',
			'ooo#####oooooooooo####ooooooo',
			'oooooo#ooooo#oo#oo#oooooooooo',
			'ooooooooooo##oo##ooooo#oooooo',
			'ooo#ooo##o####o###ooo##ooooo.',
			'ooo##o#############o###ooooo.',
			'.ooo###################oooo..',
			'.ooo####o###o#########oooo...',
			'..ooo##oo##oo##oo####oooo....',
			'...oooooooooooooooo#oooo.....',
			'.....ooooooo...oooooooo......',
		],
	},
	{
		// pumpkin2.png
		name: 'Grinner',
		rows: [
			'.............................',
			'.............................',
			'.............................',
			'.............................',
			'.......oooooo...ooooooo......',
			'.....ooooooooo.ooooooooo.....',
			'...ooooooooooooooooooooooo...',
			'..oooooooooooooooooooooooo...',
			'..ooooooooooooooooooooooooo..',
			'.ooooo#ooooooooooooo#ooooooo.',
			'.ooooo###oooooooooo##ooooooo.',
			'ooooooo#####ooo######ooooooo.',
			'ooooooo####ooooo####oooooooo.',
			'ooooooooooooooooooooooooooooo',
			'ooo#oooooooo#o#ooooooo#oooooo',
			'ooo##oooooooooooooooo#ooooooo',
			'oooo#o#ooooooooooo#o##oooooo.',
			'oooo####o#o#ooo#o####ooooooo.',
			'.oooo#o#############ooooooo..',
			'.oooooo#o##o#o###o#ooooooo...',
			'..ooooooo#oooo#oooooooooo....',
			'...ooooooooooooooooooooo.....',
			'.....ooooooo...oooooooo......',
		],
	},
	{
		// pumpkin3.png
		name: 'Gasp',
		rows: [
			'.............................',
			'.............................',
			'.............................',
			'.............................',
			'.......oooooo...ooooooo......',
			'.....ooooooooo.ooooooooo.....',
			'...ooooooooooooooooooooooo...',
			'..oooooooooooooooooooooooo...',
			'..ooooooooooooooooooooooooo..',
			'.oooooo##ooooooooooooooooooo.',
			'.ooooo####ooooo##ooooooooooo.',
			'oooooo####oooo####oooooooooo.',
			'oooooo####oooo####oooooooooo.',
			'ooooooo##ooooo####ooooooooooo',
			'ooooooooooooooo##oooooooooooo',
			'ooooooooo#####ooooooooooooooo',
			'oooooooo#######ooooooooooooo.',
			'oooooooo#######ooooooooooooo.',
			'.ooooooo#######oooooooooooo..',
			'.ooooooo#######ooooooooooo...',
			'..ooooooo#####ooooooooooo....',
			'...ooooooooooooooooooooo.....',
			'.....ooooooo...oooooooo......',
		],
	},
	{
		// pumpkin4.png
		name: 'Smiley',
		rows: [
			'.............................',
			'.............................',
			'.............................',
			'.............................',
			'.......oooooo...ooooooo......',
			'.....ooooooooo.ooooooooo.....',
			'...ooooooooooooooooooooooo...',
			'..oooooooooooooooooooooooo...',
			'..ooooooooooooooooooooooooo..',
			'.ooooooooooooooooooooooooooo.',
			'.oooo##ooooo##oooooooooooooo.',
			'ooooo##ooooo##oooooooooooooo.',
			'oooooooooooooooooooooooooooo.',
			'ooooooooooooooooooooooooooooo',
			'ooooooo#o#ooooooooooooooooooo',
			'ooooooooooooooooooooooooooooo',
			'oooo#ooooooo#ooooooooooooooo.',
			'oooo##ooooo##ooooooooooooooo.',
			'.oooo#######ooooooooooooooo..',
			'.oooo#######oooooooooooooo...',
			'..ooooo###ooooooooooooooo....',
			'...ooooooooooooooooooooo.....',
			'.....ooooooo...oooooooo......',
		],
	},
	{
		// pumpkin5.png
		name: 'Grumpy',
		rows: [
			'.............................',
			'.............................',
			'.............................',
			'.............................',
			'.......oooooo...ooooooo......',
			'.....ooooooooo.ooooooooo.....',
			'...ooooooooooooooooooooooo...',
			'..oooooooooooooooooooooooo...',
			'..ooooooooooooooooooooooooo..',
			'.ooooooooooooooooooooooooooo.',
			'.ooooo##oooooooooo##oooooooo.',
			'oooooooo##oooooo##oooooooooo.',
			'oooooo#oooooooooooo#oooooooo.',
			'ooooooo###oooooo###oooooooooo',
			'oooooooo##oooooo##ooooooooooo',
			'ooooooooooooooooooooooooooooo',
			'oooooooooooooooooooooooooooo.',
			'oooooooooooooooooooooooooooo.',
			'.oooooo#o#o#o#o#o#o#ooooooo..',
			'.oooo################ooooo...',
			'..oooo#o#o#o#o#o#o#oooooo....',
			'...ooooooooooooooooooooo.....',
			'.....ooooooo...oooooooo......',
		],
	},
]

/** A drawing's `#`s, as the pixel indexes a pumpkin is stored with. */
function carvedFrom(rows: string[]) {
	return rows.flatMap((row, y) =>
		[...row].flatMap((pixel, x) =>
			pixel === '#' ? [y * PUMPKIN_WIDTH + x] : [],
		),
	)
}

/** Josh's pumpkins in the same shape as everyone's, with ids of their own. */
const JOSHS_PUMPKINS = JOSHS_DRAWINGS.map((drawing, i) => ({
	_id: `josh-${i + 1}`,
	name: drawing.name,
	carver: 'Josh',
	carved: carvedFrom(drawing.rows),
}))

/**
 * The newest pumpkins, newest first, and then Josh's, for the patch page and
 * for picking random ones from. Without the IP, which would give away who
 * carved them.
 */
export const listPublic = query({
	args: {},
	handler: async (ctx) => {
		const newest = await ctx.db
			.query('pumpkins')
			.withIndex('by_status', (q) => q.eq('status', 'active'))
			.order('desc')
			.take(PATCH_SIZE)
		return [
			...newest.map((pumpkin) => ({
				_id: pumpkin._id as string,
				name: pumpkin.name,
				carver: pumpkin.carver,
				carved: pumpkin.carved,
			})),
			...JOSHS_PUMPKINS,
		]
	},
})

function cleanName(name: string) {
	return name.trim().replace(/\s+/g, ' ')
}

export const create = mutation({
	args: {
		name: v.string(),
		carver: v.string(),
		carved: v.array(v.number()),
		ip: v.string(),
	},
	handler: async (ctx, args) => {
		const name = cleanName(args.name)
		const carver = cleanName(args.carver)
		if (!name) return { error: 'Please give your pumpkin a name' }
		if (!carver) return { error: 'Please tell us who carved it' }
		if (name.length > MAX_NAME_LENGTH || carver.length > MAX_NAME_LENGTH) {
			return { error: `Names can be at most ${MAX_NAME_LENGTH} characters` }
		}
		// Only which pixels are carved is checked here. Whether each is on the
		// pumpkin's body is the website's to say, since only it has the image,
		// and it draws only the ones that are.
		const carved = [...new Set(args.carved)].sort((a, b) => a - b)
		if (
			carved.length === 0 ||
			!carved.every((i) => Number.isInteger(i) && i >= 0 && i < PUMPKIN_PIXELS)
		) {
			return { error: 'Carve something out of your pumpkin first' }
		}

		const now = Date.now()
		if (args.ip) {
			const byIp = await ctx.db
				.query('pumpkins')
				.withIndex('by_ip', (q) => q.eq('ip', args.ip))
				.collect()
			if (
				byIp.filter((p) => p.createdAt > now - DAY_MS).length >=
				MAX_PUMPKINS_PER_DAY
			) {
				return { error: 'limit', limit: MAX_PUMPKINS_PER_DAY }
			}
		}

		const blockedTerm = findBlockedTerm(name) ?? findBlockedTerm(carver)
		const id = await ctx.db.insert('pumpkins', {
			name,
			carver,
			carved,
			ip: args.ip,
			status: blockedTerm ? 'hidden' : 'active',
			flagReason: blockedTerm
				? `matched blocked term '${blockedTerm}'`
				: undefined,
			createdAt: now,
		})

		return { id }
	},
})
