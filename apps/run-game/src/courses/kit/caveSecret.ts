import type { SecretLook, SecretPicture, SecretProp } from '../types'
import {
	type PixelRect,
	paintedArt,
	pixelArt,
	pixelText,
	pixelTextWidth,
	svgUrl,
} from './pixelArt'

/**
 * Under the Caves, its Secret: the mine. Down through the rope bridge, a
 * sign at it pointing the way; a shaft, and a mine cart off GRUVBANAN's
 * station, loop-the-loop and all; and at the end of the line the chamber
 * the mine people live in, their lamp lit, their lunch out, their dynamite
 * stacked, FALU GRUVA on the wall. At its far end, the lift: a cage at the
 * bottom of its shaft, to shoot you back up and out of a hatch in the
 * cave's floor. Drawn in code, a pixel a cell, shown at twice that: sizes
 * here are in world pixels, but for the signs, which are scenery.
 *
 * The mine people are all dressed the one way, as at Falun: an orange
 * hard hat, and a great stiff orange cape, its shoulders sticking straight
 * out, far wider than they are, hanging down like a box to mid-thigh. No
 * arms to be seen. Under it, dark trousers and blue-grey trainers, white
 * soles. Some of their capes are grubby. They face left, the way you come.
 */

const CELL = 2

// --- Shared colours ---------------------------------------------------------

const INK = '#1d1d1d'
/** A hard hat: orange, shiny along its top. */
const HAT = '#ee7a2c'
const HAT_LIT = '#ffa65a'
const HAT_SHADE = '#c0581c'
/** Their trousers, dark; their trainers, blue-grey, white-soled. */
const TROUSERS = '#363743'
const TROUSERS_LIT = '#4a4c5a'
const TROUSERS_SHADE = '#282830'
const TRAINER = '#5f7491'
const TRAINER_LIT = '#869bb6'
const SOLE = '#eceff2'
/** Brass, for the snaps down a cape's front. */
const SNAP = '#d8b04a'
/** Mine timber, as the Caves' props are. */
const TIMBER = '#8a5a32'
const TIMBER_LIT = '#b07a44'
const TIMBER_SHADE = '#5e3a1e'
const TIMBER_DARK = '#3f2614'
/** Steel, girders and plate, and its iron. */
const STEEL = '#5d636c'
const STEEL_LIT = '#8b929c'
const STEEL_SHADE = '#3e434a'
const IRON = '#2c2d31'
const IRON_LIT = '#5a5b60'
/** Hazard paint, yellow and black. */
const HAZARD = '#e8b830'
const HAZARD_BLACK = '#2a2722'
/** The dark down a hole. */
const HOLE = '#0e0a08'
const HOLE_SHADE = '#1f1712'
/** Lamplight. */
const FLAME = '#ffd34d'
const FLAME_HOT = '#fff4c2'
const GLOW = '#ffb84d'

/** A cape, the stiff orange oilskin: lit along its shoulders, shaded down its far side and hem. */
interface Cloth {
	base: string
	lit: string
	shade: string
	deep: string
	grime: string
}

/** Bright, near red: a new one, as in the photo by the headframe. */
const CAPE_RED: Cloth = {
	base: '#e2623a',
	lit: '#f4875c',
	shade: '#b9472a',
	deep: '#8c3420',
	grime: '#7e4028',
}
/** Faded to a yellower orange, years down the mine. */
const CAPE_OLD: Cloth = {
	base: '#df8236',
	lit: '#f2a55c',
	shade: '#b4632a',
	deep: '#87481e',
	grime: '#7c5230',
}

interface Skin {
	base: string
	shade: string
	cheek?: string
}

const PALE: Skin = { base: '#f2c09a', shade: '#d5a885' }
const ROSY: Skin = { base: '#f0b893', shade: '#d39a76', cheek: '#e88a7a' }
const TAN: Skin = { base: '#c88a5c', shade: '#a46c44' }
const HAIR = '#6b4a30'

// --- The mine people ----------------------------------------------------------

/**
 * One of the mine people, `w` by `h`, built from the top down: its hard
 * hat on its head, its face's top left at `face`, its collar under its
 * chin, its cape from `cape.top`, its shoulders, to `cape.hem`, and its
 * legs out from under it, their left columns `legs`, down to its
 * trainers on the bottom two rows.
 */
interface Miner {
	w: number
	h: number
	face: { x: number; y: number; w: number; h: number }
	cape: { x: number; w: number; top: number; hem: number }
	legs: { at: [number, number]; w: number }
	skin: Skin
	cloth: Cloth
	/** Its eyes shut, for a frame. */
	blink?: boolean
	/** Its near foot up off the floor, a shuffle. */
	shuffle?: boolean
	/** Sat down, its knees out from under its cape. */
	sit?: boolean
	/** Muck on its cape, cells from its top left. */
	grime?: [number, number][]
	/** Drawn first, behind it: what it's sat on. */
	under?: PixelRect[]
	/** Drawn last, over it: a moustache, a lamp. */
	over?: PixelRect[]
}

function miner(m: Miner): PixelRect[] {
	const { face, cape, legs, skin, cloth, h } = m
	const r: PixelRect[] = [...(m.under ?? [])]
	// Its legs, out from under the cape, lit down the near one.
	const legTop = cape.hem + 1
	legs.at.forEach((knee, i) => {
		const lifted = m.shuffle && i === 0 ? 1 : 0
		// Sat, its knees out in front, to the left, its shins down from them.
		const x = m.sit ? knee - 2 : knee
		if (m.sit) {
			r.push([x, legTop, legs.w + 2, 2, TROUSERS])
			r.push([x, legTop, legs.w + 2, 1, TROUSERS_LIT])
		}
		const from = m.sit ? legTop + 2 : legTop
		const long = h - 2 - from - lifted
		r.push([x, from, legs.w, long, TROUSERS])
		r.push([x + legs.w - 1, from, 1, long, TROUSERS_SHADE])
		if (i === 0) r.push([x, from, 1, long, TROUSERS_LIT])
		// Its trainer, toe to the left, its sole white.
		const y = h - 2 - lifted
		r.push([x - 1, y, legs.w + 1, 1, TRAINER])
		r.push([x - 1, y, 1, 1, TRAINER_LIT])
		r.push([x + 1, y, 1, 1, TRAINER_LIT])
		r.push([x - 1, y + 1, legs.w + 1, 1, SOLE])
	})
	// The cape: its shoulders straight out, their corners round, hanging
	// down like a box. Lit along the top, shaded down its far side, darker
	// still along the hem.
	const { x, w, top, hem } = cape
	const tall = hem - top + 1
	r.push([x + 2, top, w - 4, 1, cloth.lit])
	r.push([x + 1, top + 1, w - 2, 1, cloth.lit])
	r.push([x, top + 2, w, tall - 3, cloth.base])
	r.push([x, top + 2, 1, 1, cloth.lit])
	r.push([x + w - 1, top + 2, 1, 1, cloth.lit])
	r.push([x + w - 2, top + 3, 2, tall - 4, cloth.shade])
	r.push([x, hem - 1, w, 1, cloth.shade])
	// Where it falls from the ends of its shoulders, a fold each side,
	// tucking its hem up a cell where it meets it.
	const folds = [x + 3, x + w - 5]
	for (const fx of folds) r.push([fx, top + 4, 1, tall - 5, cloth.shade])
	for (const [from, to] of [
		[x, folds[0]],
		[folds[0] + 1, folds[1]],
		[folds[1] + 1, x + w],
	])
		r.push([from, hem, to - from, 1, cloth.deep])
	// Down its front, from under the chin: where it buttons, and its snaps.
	const front = face.x + 1
	r.push([front, top, 1, tall - 1, cloth.shade])
	r.push([front + 1, top + 2, 1, 1, SNAP])
	if (tall > 9) r.push([front + 1, top + 7, 1, 1, SNAP])
	for (const [gx, gy] of m.grime ?? [])
		r.push([x + gx, top + gy, 1, 1, cloth.grime])
	// Its collar, stood up round its neck.
	r.push([face.x, top - 1, face.w, 1, cloth.base])
	r.push([face.x + face.w - 1, top - 1, 1, 1, cloth.shade])
	// Its face, turned to the left: its far cheek in shade, the brim's
	// shadow over its brow, an eye a dark cell, its nose poking out.
	r.push([face.x, face.y, face.w, face.h, skin.base])
	r.push([face.x + face.w - 1, face.y, 1, face.h, skin.shade])
	r.push([face.x, face.y, face.w, 1, skin.shade])
	r.push([face.x + face.w - 1, face.y, 1, 2, HAIR])
	r.push([face.x - 1, face.y + 2, 1, 1, skin.base])
	r.push([face.x + 1, face.y + 1, 1, 1, m.blink ? skin.shade : INK])
	if (skin.cheek) r.push([face.x + 2, face.y + 2, 1, 1, skin.cheek])
	// Its hard hat: a dome, a ridge along it, its brim out over its brow,
	// further at the front.
	const hy = face.y - 4
	r.push([face.x, hy, face.w - 1, 1, HAT_LIT])
	r.push([face.x - 1, hy + 1, face.w + 1, 2, HAT])
	r.push([face.x, hy + 1, 1, 1, HAT_LIT])
	r.push([face.x + face.w - 1, hy + 1, 1, 2, HAT_SHADE])
	r.push([face.x + 1, hy + 1, 1, 2, HAT_LIT])
	r.push([face.x - 2, hy + 3, face.w + 3, 1, HAT])
	r.push([face.x - 2, hy + 3, 1, 1, HAT_LIT])
	r.push([face.x + face.w, hy + 3, 1, 1, HAT_SHADE])
	r.push(...(m.over ?? []))
	return r
}

/** One of the mine people, in a few frames, to idle through slowly. */
export interface MinePerson {
	frames: string[]
	width: number
	height: number
}

const person = (w: number, h: number, frames: PixelRect[][]): MinePerson => ({
	frames: frames.map((rects) => pixelArt(w, h, rects)),
	width: w * CELL,
	height: h * CELL,
})

/**
 * The tall one, the foreman, a head over the rest: his cape the bright
 * new red, standing very straight. Idles: still, a blink, and a bob, his
 * knees giving a little, his cape with them. 23 by 31.
 */
const TALL = (() => {
	const at = (bob: number, blink = false): Miner => ({
		w: 23,
		h: 31,
		face: { x: 8, y: 4 + bob, w: 4, h: 4 },
		cape: { x: 1, w: 21, top: 9 + bob, hem: 21 + bob },
		legs: { at: [8, 12], w: 2 },
		skin: PALE,
		cloth: CAPE_RED,
		blink,
	})
	return person(23, 31, [miner(at(0)), miner(at(0, true)), miner(at(1))])
})()

/**
 * The short round one: a round face, rosy, under a hat too big for it,
 * his cape wider than he's tall nearly, on two short stout legs. Idles:
 * still, a bob, a blink. 25 by 26.
 */
const ROUND = (() => {
	const at = (bob: number, blink = false): Miner => ({
		w: 25,
		h: 26,
		face: { x: 9, y: 4 + bob, w: 5, h: 5 },
		cape: { x: 1, w: 23, top: 10 + bob, hem: 20 },
		legs: { at: [8, 14], w: 3 },
		skin: ROSY,
		cloth: CAPE_OLD,
		blink,
		grime: [
			[5, 9],
			[6, 8],
			[16, 6],
		],
		// His chin's round: its corners off.
		over: [
			[9, 8 + bob, 1, 1, CAPE_OLD.base],
			[13, 8 + bob, 1, 1, CAPE_OLD.shade],
		],
	})
	return person(25, 26, [miner(at(0)), miner(at(1)), miner(at(0, true))])
})()

/** Gone white, years down there. */
const MOUSTACHE = '#d8d2c6'
const MOUSTACHE_LIT = '#f4f0e8'

/**
 * The one with the moustache: a great white walrus of a thing, its ends
 * drooping down over his collar, and his cape mucky from years down
 * there. Idles: still, the moustache's end twitching up, a blink. 23 by
 * 29.
 */
const MOUSTACHED = (() => {
	const at = (twitch: boolean, blink = false): Miner => {
		const f = { x: 8, y: 4, w: 4, h: 4 }
		return {
			w: 23,
			h: 29,
			face: f,
			cape: { x: 1, w: 21, top: 9, hem: 20 },
			legs: { at: [8, 12], w: 2 },
			skin: TAN,
			cloth: CAPE_OLD,
			blink,
			grime: [
				[2, 7],
				[3, 8],
				[2, 9],
				[12, 5],
				[13, 10],
				[18, 3],
			],
			over: [
				[f.x, f.y + 2, 3, 1, MOUSTACHE_LIT],
				[f.x - 2, f.y + 3, 5, 1, MOUSTACHE],
				twitch
					? [f.x - 3, f.y + 2, 1, 1, MOUSTACHE_LIT]
					: [f.x - 2, f.y + 4, 1, 1, MOUSTACHE],
			],
		}
	}
	return person(23, 29, [
		miner(at(false)),
		miner(at(true)),
		miner(at(false, true)),
	])
})()

const LAMP_GLASS = '#fff4c2'
const LAMP_FLARE = '#ffe066'
const LAMP_DIM = '#b89a52'
const LAMP_RIM = '#2c2d31'

/**
 * The one with a headlamp on the front of her hat, its band round it, its
 * glass lit. Idles: on, on with a blink, and a flicker, the lamp gone dim,
 * as they do. 23 by 29.
 */
const HEADLAMP = (() => {
	const at = (lamp: 'on' | 'dim', blink = false): Miner => {
		const f = { x: 9, y: 4, w: 4, h: 4 }
		const on = lamp === 'on'
		return {
			w: 23,
			h: 29,
			face: f,
			cape: { x: 1, w: 21, top: 9, hem: 20 },
			legs: { at: [8, 12], w: 2 },
			skin: PALE,
			cloth: CAPE_RED,
			blink,
			grime: [[11, 9]],
			over: [
				// Her hair, out under the back of her hat.
				[f.x + f.w, f.y, 1, 3, HAIR],
				// The lamp, on the front of the dome, its band round it, and
				// on, a flare off its glass.
				[f.x, 2, f.w, 1, HAT_SHADE],
				[f.x - 1, 1, 1, 2, LAMP_RIM],
				[f.x - 2, 1, 1, 2, on ? LAMP_GLASS : LAMP_DIM],
				...(on ? ([[f.x - 3, 1, 1, 1, LAMP_FLARE]] as PixelRect[]) : []),
			],
		}
	}
	return person(23, 29, [
		miner(at('on')),
		miner(at('on', true)),
		miner(at('dim')),
	])
})()

/** Ore, in the crate: grey rock, copper in it, and the green of it. */
const ORE = '#6f6a66'
const ORE_LIT = '#948e88'
const ORE_SHADE = '#4e4a47'
const COPPER = '#c97a3a'
const VERDIGRIS = '#55ad8e'

/**
 * A crate of ore, from `x`, its lid at `y`, to the bottom of a picture
 * `h` tall: planks, lit along the lid, iron straps at its corners, ore
 * heaped up out of its far end.
 */
const oreCrate = (x: number, y: number, w: number, h: number): PixelRect[] => {
	const r: PixelRect[] = [
		// The ore, heaped over its top at the far end.
		[x + w - 9, y - 2, 7, 2, ORE],
		[x + w - 8, y - 3, 4, 1, ORE_LIT],
		[x + w - 9, y - 2, 2, 1, ORE_LIT],
		[x + w - 6, y - 2, 1, 1, COPPER],
		[x + w - 4, y - 1, 1, 1, VERDIGRIS],
		[x + w - 3, y - 1, 1, 1, ORE_SHADE],
		// Its lid, and its planks.
		[x, y, w, h - y, TIMBER],
		[x, y, w, 1, TIMBER_LIT],
		[x, y + 1, w, 1, TIMBER_SHADE],
	]
	for (let py = y + 4; py < h - 1; py += 3) r.push([x, py, w, 1, TIMBER_SHADE])
	r.push([x + w - 2, y + 1, 2, h - y - 1, TIMBER_SHADE])
	r.push([x, h - 1, w, 1, TIMBER_DARK])
	// Its straps, iron, at the corners.
	r.push([x, y, 2, h - y, IRON])
	r.push([x, y, 1, 1, IRON_LIT])
	r.push([x + w - 2, y, 2, h - y, IRON])
	r.push([x + w - 2, y, 1, 1, IRON_LIT])
	return r
}

/**
 * The one sat on a crate of ore, a break from it, his cape over the edge
 * of it, his feet on the floor. Idles: still, his foot tapping, a blink.
 * 30 by 27.
 */
const SITTING = (() => {
	const W = 30
	const H = 27
	const at = (shuffle: boolean, blink = false): Miner => ({
		w: W,
		h: H,
		face: { x: 9, y: 4, w: 4, h: 4 },
		cape: { x: 2, w: 21, top: 9, hem: 18 },
		legs: { at: [9, 14], w: 2 },
		skin: TAN,
		cloth: CAPE_RED,
		blink,
		shuffle,
		sit: true,
		grime: [
			[4, 6],
			[5, 7],
			[16, 5],
		],
		under: oreCrate(8, 18, 21, H),
		// A lump of ore on the floor by his feet, fallen out of it.
		over: [
			[1, 25, 3, 2, ORE],
			[1, 25, 2, 1, ORE_LIT],
			[3, 26, 1, 1, ORE_SHADE],
		],
	})
	return person(W, H, [
		miner(at(false)),
		miner(at(true)),
		miner(at(false, true)),
	])
})()

/**
 * The mine people, at home in their chamber: the tall one, the short
 * round one, the one with the moustache, the one with the headlamp, and
 * the one sat on a crate of ore. Each facing left, the way you come in,
 * runners' size, their heads as big as runners' heads. Each in two or
 * three frames the same size, to idle through slowly: a blink, a bob, a
 * twitch, a flicker, a tap of a foot. Their bottom rows on the floor.
 */
export const MINE_PEOPLE: MinePerson[] = [
	TALL,
	ROUND,
	MOUSTACHED,
	HEADLAMP,
	SITTING,
]

// --- The lift -----------------------------------------------------------------

/** The cage, from the front, in cells. */
const CAGE_W = 32
const CAGE_H = 38
/** The shaft round it, its timber lining, as wide as the picture. */
const LIFT_W = 38
const LIFT_H = 48
const CAGE_X = (LIFT_W - CAGE_W) / 2
const CAGE_Y = LIFT_H - CAGE_H
/** The cage's floor, where whoever's in it stands, down from its top. */
const CAGE_FLOOR = 36

/** The cable: steel wire, a lit strand down its left. */
const CABLE = '#4a4d52'
const CABLE_LIT = '#9aa0a8'
/** The cage's back wall, steel plate, in the shadow of its roof: dark, for whoever's in it to stand out against. */
const BACK = '#34373d'
const BACK_LIT = '#454950'
const BACK_SEAM = '#26282c'
const BULB = '#ffe9a0'

/**
 * The shaft the lift runs up: timber lining, lit down its left, in shadow
 * down its right, seams between its boards every 32 px, and dust hanging
 * in the air of it.
 */
export const LIFT_SHAFT = {
	timber: '#5e3e24',
	timberLit: '#7a5232',
	timberShade: '#432a17',
	seam: '#2e1d10',
	air: 'rgba(214,190,160,0.18)',
}

/** The shaft's lining, `w` by `h`, as the course draws it on up: boards across, a seam every 16 cells. */
const lining = (w: number, h: number): PixelRect[] => {
	const r: PixelRect[] = [
		[0, 0, w, h, LIFT_SHAFT.timber],
		[0, 0, 2, h, LIFT_SHAFT.timberLit],
		[w - 2, 0, 2, h, LIFT_SHAFT.timberShade],
	]
	for (let y = h % 16; y < h; y += 16) r.push([0, y, w, 1, LIFT_SHAFT.seam])
	// The guide rails the cage runs up between, steel, bolted on.
	for (const x of [CAGE_X - 1, CAGE_X + CAGE_W])
		r.push([x, 0, 1, h, STEEL_SHADE])
	return r
}

/** The cage's back: its back wall, steel plate, ribbed; its lamp, caged; and its floor. */
const cageBack = (): PixelRect[] => {
	const r: PixelRect[] = [[2, 4, CAGE_W - 4, CAGE_FLOOR - 4, BACK]]
	for (let x = 5; x < CAGE_W - 3; x += 6) {
		r.push([x, 6, 1, CAGE_FLOOR - 8, BACK_LIT])
		r.push([x + 1, 6, 1, CAGE_FLOOR - 8, BACK_SEAM])
	}
	// In the shadow of its roof.
	r.push([2, 4, CAGE_W - 4, 2, BACK_SEAM])
	// A bulb, in a little cage of its own, up on the back wall.
	r.push([14, 6, 4, 3, IRON])
	r.push([15, 6, 2, 2, BULB])
	r.push([15, 7, 2, 1, FLAME])
	// A handrail along the back.
	r.push([2, 21, CAGE_W - 4, 1, STEEL])
	r.push([2, 21, CAGE_W - 4, 1, STEEL_LIT])
	// Its floor, boards, seen from a little over it.
	r.push([2, CAGE_FLOOR - 2, CAGE_W - 4, 2, TIMBER])
	r.push([2, CAGE_FLOOR - 2, CAGE_W - 4, 1, TIMBER_LIT])
	return r
}

/**
 * The cage's front: its frame, steel, its roof and the crosshead the
 * cable's shackled to, its corner posts, the edge of its floor in
 * hazard stripes; and its gate, `open`, folded back to the right, or
 * shut, bars across the front of it.
 */
const cageFront = (open: boolean): PixelRect[] => {
	const r: PixelRect[] = [
		// The crosshead, up off the roof, and its shackle.
		[12, 1, 8, 1, STEEL],
		[14, 0, 4, 1, STEEL_LIT],
		[12, 1, 2, 1, STEEL_LIT],
		[15, 0, 2, 1, IRON],
		// The roof: a channel, lit along its top.
		[0, 2, CAGE_W, 2, STEEL],
		[0, 2, CAGE_W, 1, STEEL_LIT],
		[0, 4, CAGE_W, 1, STEEL_SHADE],
		// Its corner posts.
		[0, 2, 2, CAGE_H - 2, STEEL],
		[0, 2, 1, CAGE_H - 2, STEEL_LIT],
		[CAGE_W - 2, 2, 2, CAGE_H - 2, STEEL_SHADE],
		[CAGE_W - 2, 2, 1, CAGE_H - 2, STEEL],
		// Rivets.
		...[4, 10, 21, 26].map((x): PixelRect => [x, 3, 1, 1, STEEL_SHADE]),
	]
	// The edge of its floor, striped.
	for (let y = CAGE_FLOOR; y < CAGE_H; y++)
		for (let x = 0; x < CAGE_W; x++)
			r.push([x, y, 1, 1, Math.floor((x + y) / 2) % 2 ? HAZARD : HAZARD_BLACK])
	// The gate's track, under the roof, and its bars.
	r.push([2, 5, CAGE_W - 4, 1, STEEL_SHADE])
	const bars = open
		? [CAGE_W - 7, CAGE_W - 6, CAGE_W - 5, CAGE_W - 4]
		: Array.from({ length: 7 }, (_, i) => 4 + i * 4)
	for (const [i, x] of bars.entries())
		r.push([x, 6, 1, CAGE_FLOOR - 6, open && i % 2 ? STEEL_SHADE : STEEL_LIT])
	// Its rails, top and bottom, across the bars.
	const from = bars[0]
	const to = bars[bars.length - 1] + 1
	r.push([from, 6, to - from, 1, STEEL])
	r.push([from, CAGE_FLOOR - 2, to - from, 1, STEEL])
	return r
}

/** Rects, moved `dx` across and `dy` down. */
const moved = (rects: PixelRect[], dx: number, dy: number): PixelRect[] =>
	rects.map(([x, y, w, h, c]) => [x + dx, y + dy, w, h, c])

/** The cable, down the middle of the shaft from its top to `to`. */
const cable = (to: number, swing = 0): PixelRect[] => {
	const x = CAGE_X + CAGE_W / 2 - 1
	return [
		[x, 0, 1, to, CABLE_LIT],
		[x + 1, 0, 1, to, CABLE],
		[x + swing, to - 4, 1, 4, CABLE_LIT],
		[x + 1 + swing, to - 4, 1, 4, CABLE],
	]
}

const DUST = 'rgba(214,190,160,0.4)'
const DUST_FAINT = 'rgba(214,190,160,0.22)'

/** A puff of dust, `w` across, its bottom at `y`: thicker low down, rounded off on top. */
const puff = (x: number, y: number, w: number): PixelRect[] => [
	[x, y - 1, w, 2, DUST],
	[x + 1, y - 3, w - 2, 2, DUST],
	[x + 2, y - 4, w - 4, 1, DUST_FAINT],
	[x - 1, y, 1, 1, DUST_FAINT],
	[x + w, y - 1, 1, 2, DUST_FAINT],
]
const SPRING = '#b4bac2'

/**
 * The lift at the chamber's far end: the bottom of its shaft, lined in
 * timber, guide rails up it, and its cage, sat at the bottom, waiting,
 * its gate open, its cable up out of the top of it. Stand in it, at its
 * middle, and up it goes. Gone up, `thrown`: the shaft's bottom bare, its
 * buffer, springs on a timber block, for the cage to land on, its tail
 * rope swinging, and the dust it's left. `hands` is where whoever's in
 * it stands, from the picture's top left, in world pixels.
 */
export const LIFT = {
	kneel: pixelArt(LIFT_W, LIFT_H, [
		...lining(LIFT_W, LIFT_H),
		...cable(CAGE_Y + 1),
		...moved(cageBack(), CAGE_X, CAGE_Y),
		...moved(cageFront(true), CAGE_X, CAGE_Y),
	]),
	thrown: pixelArt(LIFT_W, LIFT_H, [
		...lining(LIFT_W, LIFT_H),
		// Its tail rope, swinging, still going up after the cage.
		...cable(LIFT_H - 14, -1),
		// The buffer: a timber block, two springs on it.
		[10, LIFT_H - 6, 18, 6, TIMBER],
		[10, LIFT_H - 6, 18, 1, TIMBER_LIT],
		[26, LIFT_H - 5, 2, 5, TIMBER_SHADE],
		[10, LIFT_H - 1, 18, 1, TIMBER_DARK],
		...[12, 22].flatMap((x): PixelRect[] => [
			[x, LIFT_H - 7, 4, 1, STEEL],
			[x, LIFT_H - 9, 4, 1, SPRING],
			[x, LIFT_H - 11, 4, 1, SPRING],
			[x, LIFT_H - 8, 1, 1, STEEL_SHADE],
			[x + 3, LIFT_H - 10, 1, 1, STEEL_SHADE],
			[x, LIFT_H - 12, 4, 1, STEEL_LIT],
		]),
		// Dust, kicked up off the bottom either side of it, in puffs, and
		// drifting up after the cage.
		...puff(3, LIFT_H - 1, 7),
		...puff(28, LIFT_H - 1, 8),
		...puff(6, LIFT_H - 9, 4),
		...puff(30, LIFT_H - 11, 4),
		[11, LIFT_H - 17, 2, 2, DUST_FAINT],
		[26, LIFT_H - 22, 2, 2, DUST_FAINT],
		[16, LIFT_H - 28, 2, 1, DUST_FAINT],
	]),
	width: LIFT_W * CELL,
	kneelHeight: LIFT_H * CELL,
	thrownHeight: LIFT_H * CELL,
	hands: { x: (LIFT_W / 2) * CELL, y: (CAGE_Y + CAGE_FLOOR) * CELL },
} satisfies SecretLook['launcher']

/**
 * The cage on its own, as it goes up the shaft with someone in it: its
 * `back`, wall, lamp and floor, behind them, and its frame and its gate,
 * shut now, bars across them, in front, as the `asset`. The same size as
 * the cage at the bottom of `LIFT`, and its cable from the middle of its
 * top; whoever's in it stands `CAGE_FLOOR` cells down it (`LIFT.hands`).
 */
export const LIFT_CAGE = {
	asset: pixelArt(CAGE_W, CAGE_H, cageFront(false)),
	back: pixelArt(CAGE_W, CAGE_H, cageBack()),
	width: CAGE_W * CELL,
	height: CAGE_H * CELL,
}

// --- The hatch ----------------------------------------------------------------

/** The cave's path, sandy, its darker edge, spilt over the hatch's timbers. */
const SAND = '#d1a671'
const SAND_SHADE = '#ad855a'
const HATCH_W = 34
const HATCH_H = 7

/**
 * Where the lift's shaft comes out, up in the cave's floor: a collar of
 * timbers flush in the path round a dark square hole, and its trapdoor
 * flung open, lying flat beyond it, iron-strapped. Lying in the path as
 * Gamla Stan's grate does, seen side on; its hole's middle, row 3, on the
 * line everyone runs along (draw it 6 px over it).
 */
export const HATCH: SecretPicture = {
	asset: pixelArt(HATCH_W, HATCH_H, [
		// The trapdoor, flat on the path behind, its boards, its straps.
		[7, 0, 20, 2, TIMBER],
		[7, 0, 20, 1, TIMBER_LIT],
		...[12, 17, 22].map((x): PixelRect => [x, 0, 1, 2, TIMBER_SHADE]),
		[9, 1, 3, 1, IRON],
		[22, 1, 3, 1, IRON],
		// The collar's back beam, and its ends either side.
		[1, 2, 32, 1, TIMBER_LIT],
		[0, 3, 4, 3, TIMBER],
		[30, 3, 4, 3, TIMBER],
		[0, 3, 4, 1, TIMBER_LIT],
		[30, 3, 4, 1, TIMBER_LIT],
		[32, 3, 2, 3, TIMBER_SHADE],
		// The hole, the shaft's lining just showing down its back.
		[4, 3, 26, 1, LIFT_SHAFT.timberShade],
		[4, 4, 26, 1, HOLE_SHADE],
		[4, 5, 26, 1, HOLE],
		// The front beam, lit along its top.
		[0, 5, 34, 1, TIMBER_LIT],
		[0, 6, 34, 1, TIMBER_SHADE],
		[0, 5, 4, 1, TIMBER_LIT],
		...[8, 25].map((x): PixelRect => [x, 6, 1, 1, IRON]),
		// Sand, kicked over its ends.
		[0, 2, 2, 1, SAND],
		[31, 2, 3, 1, SAND],
		[0, 6, 2, 1, SAND_SHADE],
		[32, 6, 2, 1, SAND_SHADE],
		[2, 4, 1, 1, SAND_SHADE],
	]),
	width: HATCH_W * CELL,
	height: HATCH_H * CELL,
}

// --- The signs ----------------------------------------------------------------

const SIGN_WOOD = '#8a5a32'
const SIGN_LIT = '#a8743f'
const SIGN_SHADE = '#5e3a1e'
const SIGN_CARVED = '#3f2614'
const CHALK = '#e8e0cc'
const STONE = '#6a564a'
const STONE_LIT = '#8a7262'

/** The signpost by the rope bridge, in cells. */
export const BRIDGE_SIGN_SIZE = { width: 14, height: 24 }

/**
 * An old mine signpost at the rope bridge: its post with a hook off the
 * top of it, an old lamp hung on it, gone out; its board, a big
 * arrow carved in it pointing down, and a skull and a pick chalked under
 * that. Only a hint, as the Yetis' sign is: no words. Stones piled round
 * its foot. Shown at twice its size, as scenery.
 */
export const BRIDGE_SIGN = pixelArt(
	BRIDGE_SIGN_SIZE.width,
	BRIDGE_SIGN_SIZE.height,
	[
		// Its post.
		[4, 0, 2, 24, SIGN_SHADE],
		[4, 0, 1, 24, SIGN_WOOD],
		// The hook off its top, and the lamp hung on it, out.
		[5, 1, 7, 1, IRON],
		[11, 2, 1, 1, IRON],
		[10, 3, 3, 1, IRON_LIT],
		[10, 4, 3, 3, '#6a5a3a'],
		[11, 5, 1, 1, '#8a7a50'],
		[10, 7, 3, 1, IRON],
		// Its board, lit along its top, in shadow along its bottom.
		[0, 8, 14, 10, SIGN_WOOD],
		[0, 8, 14, 1, SIGN_LIT],
		[0, 17, 14, 1, SIGN_SHADE],
		[13, 9, 1, 8, SIGN_SHADE],
		// The arrow carved in it: down.
		[3, 9, 2, 4, SIGN_CARVED],
		[1, 13, 6, 1, SIGN_CARVED],
		[2, 14, 4, 1, SIGN_CARVED],
		[3, 15, 2, 1, SIGN_CARVED],
		// A skull chalked by it, its eyes holes, and a pick under it.
		[8, 9, 4, 3, CHALK],
		[9, 12, 2, 1, CHALK],
		[8, 10, 1, 1, SIGN_WOOD],
		[10, 10, 1, 1, SIGN_WOOD],
		[8, 14, 5, 1, CHALK],
		[8, 15, 1, 1, CHALK],
		[12, 15, 1, 1, CHALK],
		[10, 15, 1, 2, CHALK],
		// Stones round its foot.
		[2, 22, 6, 2, STONE],
		[3, 21, 3, 1, STONE_LIT],
		[2, 22, 2, 1, STONE_LIT],
		[7, 23, 3, 1, STONE],
	],
)

const ENAMEL = '#2c3e5e'
const ENAMEL_LIT = '#3e5478'
const ENAMEL_RIM = '#e8e0cc'
const LETTERS = '#f4ecd6'

/** GRUVBANAN's station sign, in cells. */
export const COASTER_SIGN_SIZE = { width: 63, height: 24 }

/**
 * The station sign at the start of the ride: GRUVBANAN, the mine
 * railway, in white on a blue enamel board, a white line round it as on
 * a railway's, hazard stripes along its bottom, on two timber posts. Shown at twice its size,
 * as scenery.
 */
export const COASTER_SIGN = (() => {
	const { width: w, height: h } = COASTER_SIGN_SIZE
	const rects: PixelRect[] = [
		// Its posts.
		[6, 14, 3, h - 14, TIMBER],
		[6, 14, 1, h - 14, TIMBER_LIT],
		[8, 14, 1, h - 14, TIMBER_SHADE],
		[w - 9, 14, 3, h - 14, TIMBER],
		[w - 9, 14, 1, h - 14, TIMBER_LIT],
		[w - 7, 14, 1, h - 14, TIMBER_SHADE],
		// Its board: enamel, a line round it, lit along its top.
		[0, 0, w, 15, ENAMEL],
		[0, 0, w, 1, ENAMEL_LIT],
		[1, 1, w - 2, 1, ENAMEL_RIM],
		[1, 12, w - 2, 1, ENAMEL_RIM],
		[1, 1, 1, 12, ENAMEL_RIM],
		[w - 2, 1, 1, 12, ENAMEL_RIM],
		[0, 15, w, 1, IRON],
	]
	// Hazard stripes under it.
	for (let x = 0; x < w; x++)
		rects.push([x, 14, 1, 1, Math.floor(x / 2) % 2 ? HAZARD : HAZARD_BLACK])
	const body = rects
		.map(
			([x, y, rw, rh, f]) =>
				`<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${f}"/>`,
		)
		.join('')
	return svgUrl(w, h, `${body}${pixelText('GRUVBANAN', 5, 3, 1, LETTERS)}`)
})()

// --- The chamber's things -------------------------------------------------------

/** A glow of light: rings round `cx`, `cy`, fainter outwards. */
function glow(cx: number, cy: number, r: number, colour: string) {
	return (x: number, y: number) => {
		const d = Math.hypot(x - cx, y - cy) / r
		if (d > 1) return undefined
		return `${colour}${d > 0.66 ? '18' : d > 0.33 ? '30' : '48'}`
	}
}

const LAMP_W = 20
const LAMP_H = 40
const LANTERN_GLASS = '#ffe7a8'

/**
 * A miners' lamp on a post: a timber post, a bracket off its top, and an
 * old brass lantern hung from it, lit, its glow round it. Two frames, its
 * flame flickering. 20 by 40.
 */
const minersLamp = (flicker: boolean) =>
	paintedArt(LAMP_W, LAMP_H, (x, y) => {
		const cx = 13
		// The bracket, off the post, and the lantern's ring on it.
		if (y > 1 && y < 3 && x > 7 && x < 15) return IRON
		if (y > 3 && y < 4 && x > 12 && x < 14) return IRON
		// The lantern: its cap, its glass, the flame in it, its base.
		if (y > 4 && y < 6 && Math.abs(x - cx) < 2) return IRON_LIT
		if (y > 6 && y < 7 && Math.abs(x - cx) < 3) return IRON
		if (y > 7 && y < 13 && Math.abs(x - cx) < 3) {
			if (Math.abs(x - cx) > 2) return IRON
			if (Math.abs(x - cx) < 1 && y > (flicker ? 8 : 9) && y < 12)
				return y < 10 ? FLAME_HOT : FLAME
			return LANTERN_GLASS
		}
		if (y > 13 && y < 15 && Math.abs(x - cx) < 3) return y < 14 ? SNAP : IRON
		// The post, sunk in the floor, stones round its foot.
		if (x > 6 && x < 9 && y > 0) {
			if (y > 38 || x > 8) return TIMBER_SHADE
			return x < 7 ? TIMBER_LIT : TIMBER
		}
		if (y > 37 && Math.abs(x - 7.5) < 4) return y < 39 ? STONE_LIT : STONE
		return glow(cx, 10, flicker ? 9 : 10, GLOW)(x, y)
	})

const LAMP: SecretProp = {
	frames: [minersLamp(false), minersLamp(true)],
	width: LAMP_W * CELL,
	height: LAMP_H * CELL,
	glow: { x: 3 * CELL, y: (LAMP_H - 10) * CELL, reach: 80, colour: GLOW },
}

const TIN = '#a7aab0'
const TIN_LIT = '#d6d9dd'
const TIN_SHADE = '#7b7f86'
const THERMOS = '#3f7a4a'
const THERMOS_LIT = '#5a9a62'
const THERMOS_SHADE = '#2c5834'
const CUP = '#d8473b'
const STEAM = 'rgba(255,255,255,0.6)'
const BUN = '#d9a058'
const BUN_LIT = '#f0c27a'

/** A tin lunchbox, its lid domed, a handle over it: 9 by 6, from `x`, `y`. */
const lunchbox = (x: number, y: number, open = false): PixelRect[] => [
	[x + 3, y, 3, 1, IRON],
	[x + 1, y + 1, 7, 1, open ? TIN_SHADE : TIN_LIT],
	[x, y + 2, 9, 4, TIN],
	[x, y + 2, 9, 1, TIN_LIT],
	[x + 8, y + 2, 1, 4, TIN_SHADE],
	[x, y + 4, 9, 1, TIN_SHADE],
	[x + 4, y + 3, 1, 1, IRON],
]

/**
 * The lunch table: a trestle table of rough boards, two tin lunchboxes on
 * it, a thermos, green, and its cup out, red, steaming, and a bun. A
 * bench along the front. Two frames, the steam rising. 44 by 22.
 */
const lunchTable = (rise: boolean) =>
	pixelArt(44, 22, [
		// The bench behind it.
		[0, 12, 44, 2, TIMBER_SHADE],
		// Its top, lit along its edge.
		[1, 10, 42, 2, TIMBER_LIT],
		[1, 12, 42, 2, TIMBER],
		[1, 14, 42, 1, TIMBER_DARK],
		[14, 10, 1, 2, TIMBER],
		[29, 10, 1, 2, TIMBER],
		// Its trestles, crossed.
		[4, 15, 2, 7, TIMBER_SHADE],
		[38, 15, 2, 7, TIMBER_SHADE],
		[6, 17, 32, 1, TIMBER_DARK],
		// The bench in front.
		[0, 18, 44, 2, TIMBER],
		[0, 18, 44, 1, TIMBER_LIT],
		[2, 20, 2, 2, TIMBER_DARK],
		[40, 20, 2, 2, TIMBER_DARK],
		// On it: a lunchbox, shut, and one open, its bun out by it.
		...lunchbox(3, 4),
		...lunchbox(30, 4, true),
		[24, 7, 4, 2, BUN],
		[25, 7, 2, 1, BUN_LIT],
		// The thermos, its cap off, and its cup, steaming.
		[15, 1, 4, 9, THERMOS],
		[15, 1, 1, 9, THERMOS_LIT],
		[18, 1, 1, 9, THERMOS_SHADE],
		[15, 0, 4, 1, TIN],
		[15, 4, 4, 1, TIN_LIT],
		[20, 6, 3, 4, CUP],
		[20, 6, 3, 1, '#f06a5a'],
		[23, 7, 1, 2, CUP],
		...(rise
			? ([
					[21, 3, 1, 2, STEAM],
					[22, 1, 1, 2, STEAM],
				] as PixelRect[])
			: ([
					[21, 4, 1, 2, STEAM],
					[20, 2, 1, 2, STEAM],
				] as PixelRect[])),
	])

const TABLE: SecretProp = {
	frames: [lunchTable(false), lunchTable(true)],
	width: 44 * CELL,
	height: 22 * CELL,
}

const TNT_RED = '#c8352a'
const DYNAMITE = '#d84a3a'
const DYNAMITE_LIT = '#f07a62'
const FUSE = '#e8e0cc'

/** A crate of dynamite, 21 by 11, TNT stencilled on it in red, from `x`, `y`. */
const tntCrate = (x: number, y: number): PixelRect[] => [
	[x, y, 21, 11, TIMBER],
	[x, y, 21, 1, TIMBER_LIT],
	[x, y + 10, 21, 1, TIMBER_DARK],
	[x + 19, y + 1, 2, 9, TIMBER_SHADE],
	[x, y + 1, 1, 9, TIMBER_SHADE],
	[x + 1, y + 1, 18, 1, TIMBER_SHADE],
]

/**
 * A stack of dynamite crates: two on the floor, one on them, its lid off,
 * sticks of dynamite poking up out of it, their fuses curled. TNT on each.
 * 43 by 26.
 */
const TNT_STACK: SecretPicture = {
	asset: svgUrl(
		43,
		26,
		[
			...[
				// The sticks up out of the top one.
				[15, 1, 2, 4, DYNAMITE],
				[15, 1, 1, 4, DYNAMITE_LIT],
				[18, 2, 2, 3, DYNAMITE],
				[18, 2, 1, 3, DYNAMITE_LIT],
				[21, 1, 2, 4, DYNAMITE],
				[21, 1, 1, 4, DYNAMITE_LIT],
				[16, 0, 1, 1, FUSE],
				[17, 0, 1, 1, FUSE],
				[19, 1, 1, 1, FUSE],
				[22, 0, 2, 1, FUSE],
				...tntCrate(11, 4),
				...tntCrate(0, 15),
				...tntCrate(22, 15),
			].map(
				([x, y, w, h, f]) =>
					`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`,
			),
			pixelText('TNT', 12 + 1, 6, 1, TNT_RED),
			pixelText('TNT', 1 + 1, 17, 1, TNT_RED),
			pixelText('TNT', 23 + 1, 17, 1, TNT_RED),
		].join(''),
	),
	width: 43 * CELL,
	height: 26 * CELL,
}

/** Falu red, the mine's own paint, and its lettering, off-white. */
const FALU_RED = '#8b2a1e'
const FALU_RED_LIT = '#a63a2a'
const LETTERING = '#f2ead8'
const LETTERING_SHADE = '#c9bfa8'
const STRING = '#3a2a1a'
const NAIL = '#9aa3ad'

/**
 * The miners' hammer and pick, crossed, the mining sign: 9 by 7, its top
 * left at `x`, `y`.
 */
const hammerAndPick = (x: number, y: number): PixelRect[] => [
	// The hafts, crossed.
	...Array.from({ length: 6 }, (_, i): PixelRect[] => [
		[x + 1 + i, y + 1 + i, 1, 1, TIMBER_LIT],
		[x + 7 - i, y + 1 + i, 1, 1, TIMBER_LIT],
	]).flat(),
	// Their heads: the hammer's, square, and the pick's, pointed.
	[x, y, 3, 2, LETTERING],
	[x, y + 1, 3, 1, LETTERING_SHADE],
	[x + 6, y, 3, 1, LETTERING],
	[x + 8, y + 1, 1, 1, LETTERING_SHADE],
]

const SIGN_TEXT = 'FALU GRUVA'
/** How wide its board is: its words, a margin of 3 either side, in a frame 2 wide. */
const FALU_W = pixelTextWidth(SIGN_TEXT, 1) + 10
const FALU_H = 26

/**
 * The sign on the chamber's wall, framed, hung from a nail by a string:
 * FALU GRUVA, the mine, as it's stencilled on their hard hats, off-white
 * on a board painted Falu red, the mine's own red, the hammer and pick
 * crossed over it. 69 by 26.
 */
const FALU_GRUVA: SecretPicture = (() => {
	const w = FALU_W
	const h = FALU_H
	const top = 5
	const mid = Math.floor(w / 2)
	const rects: PixelRect[] = [
		// The nail, and its string.
		[mid - 1, 0, 3, 1, NAIL],
		...Array.from({ length: top }, (_, i): PixelRect[] => [
			[mid - 1 - i * 3, i + 1, 3, 1, STRING],
			[mid - 1 + i * 3, i + 1, 3, 1, STRING],
		]).flat(),
		// Its frame, lit along its top and left, shaded along the others.
		[0, top, w, h - top, TIMBER],
		[0, top, w, 1, TIMBER_LIT],
		[0, top, 1, h - top, TIMBER_LIT],
		[0, h - 1, w, 1, TIMBER_DARK],
		[w - 1, top, 1, h - top, TIMBER_DARK],
		// The board in it, painted.
		[2, top + 2, w - 4, h - top - 4, FALU_RED],
		[2, top + 2, w - 4, 1, FALU_RED_LIT],
		...hammerAndPick(mid - 4, top + 3),
	]
	const body = rects
		.map(
			([x, y, rw, rh, f]) =>
				`<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${f}"/>`,
		)
		.join('')
	const text = pixelText(SIGN_TEXT, 5, top + 11, 1, LETTERING)
	return { asset: svgUrl(w, h, body + text), width: w * CELL, height: h * CELL }
})()

const RACK_W = 52
const RACK_H = 46

/** A cape hung up, on a peg at `x`, `y`: its shoulders still straight out, stiff, from habit. 15 by 15. */
const hungCape = (x: number, y: number, cloth: Cloth): PixelRect[] => [
	// Its collar, round the peg, the inside of it dark.
	[x + 5, y, 5, 2, cloth.base],
	[x + 6, y, 3, 1, cloth.deep],
	// Its shoulders, straight out, round at their ends.
	[x + 2, y + 1, 11, 1, cloth.lit],
	[x + 1, y + 2, 13, 1, cloth.lit],
	[x, y + 3, 15, 11, cloth.base],
	[x, y + 3, 1, 1, cloth.lit],
	[x + 13, y + 4, 2, 10, cloth.shade],
	[x, y + 13, 15, 1, cloth.shade],
	[x, y + 14, 15, 1, cloth.deep],
	// Its folds, down from its shoulders' ends, and its front, buttoned.
	[x + 3, y + 5, 1, 8, cloth.shade],
	[x + 11, y + 5, 1, 8, cloth.shade],
	[x + 7, y + 2, 1, 11, cloth.shade],
	[x + 8, y + 4, 1, 1, SNAP],
	[x + 8, y + 9, 1, 1, SNAP],
]

/** A hard hat, sat on a shelf, 7 by 4, from `x`, `y`. */
const hardHat = (x: number, y: number): PixelRect[] => [
	[x + 1, y, 4, 1, HAT_LIT],
	[x, y + 1, 6, 2, HAT],
	[x + 1, y + 1, 1, 2, HAT_LIT],
	[x + 5, y + 1, 1, 2, HAT_SHADE],
	[x - 1, y + 3, 8, 1, HAT_SHADE],
]

/**
 * The cloakroom: a timber rack, a shelf along its top with spare hard
 * hats on it, a row of pegs under, spare capes hung on them, still stiff,
 * their shoulders straight out; a pair of trainers under it, on the
 * floor. (No arms needed to hang them up, mind.) 52 by 46.
 */
const CAPE_RACK: SecretPicture = {
	asset: pixelArt(RACK_W, RACK_H, [
		// Its uprights.
		[1, 0, 3, RACK_H, TIMBER],
		[1, 0, 1, RACK_H, TIMBER_LIT],
		[3, 0, 1, RACK_H, TIMBER_SHADE],
		[RACK_W - 4, 0, 3, RACK_H, TIMBER],
		[RACK_W - 4, 0, 1, RACK_H, TIMBER_LIT],
		[RACK_W - 2, 0, 1, RACK_H, TIMBER_SHADE],
		// The shelf, and the hats on it.
		[0, 6, RACK_W, 2, TIMBER],
		[0, 6, RACK_W, 1, TIMBER_LIT],
		[0, 8, RACK_W, 1, TIMBER_DARK],
		...[6, 15, 24, 33, 42].flatMap((x) => hardHat(x, 2)),
		// The peg rail, and its pegs.
		[0, 11, RACK_W, 2, TIMBER],
		[0, 11, RACK_W, 1, TIMBER_LIT],
		[0, 13, RACK_W, 1, TIMBER_DARK],
		// The capes on the pegs.
		...hungCape(4, 13, CAPE_OLD),
		...hungCape(19, 13, CAPE_RED),
		...hungCape(33, 13, CAPE_OLD),
		[10, 12, 3, 1, TIMBER_DARK],
		[25, 12, 3, 1, TIMBER_DARK],
		[39, 12, 3, 1, TIMBER_DARK],
		// A smear of muck on one.
		[8, 22, 1, 1, CAPE_OLD.grime],
		[9, 23, 1, 1, CAPE_OLD.grime],
		// The bottom rail, a pair of trainers under it.
		[0, 36, RACK_W, 2, TIMBER],
		[0, 36, RACK_W, 1, TIMBER_LIT],
		[0, 38, RACK_W, 1, TIMBER_DARK],
		...[18, 23].flatMap((x): PixelRect[] => [
			[x, RACK_H - 2, 4, 1, TRAINER],
			[x, RACK_H - 2, 1, 1, TRAINER_LIT],
			[x + 2, RACK_H - 3, 2, 1, TRAINER],
			[x, RACK_H - 1, 4, 1, SOLE],
		]),
	]),
	width: RACK_W * CELL,
	height: RACK_H * CELL,
}

const prop = (
	art: SecretPicture,
	more: Partial<SecretProp> = {},
): SecretProp => ({
	frames: [art.asset],
	width: art.width,
	height: art.height,
	...more,
})

/**
 * The mine people's things, to stand against their chamber's back wall,
 * or hang on it: the miners' lamp on its post, lit; the lunch table; the
 * stack of dynamite crates; FALU GRUVA, framed, hung on the wall; and the
 * rack of spare capes and hard hats. In that order.
 */
export const CHAMBER_THINGS: SecretProp[] = [
	LAMP,
	TABLE,
	prop(TNT_STACK),
	prop(FALU_GRUVA, { hung: 90 }),
	prop(CAPE_RACK),
]
