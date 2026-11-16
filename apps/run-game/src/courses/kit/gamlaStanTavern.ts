import type { SecretLook, SecretPicture, SecretProp } from '../types'
import {
	type PixelRect,
	paintedArt,
	pixelArt,
	pixelText,
	svgUrl,
} from './pixelArt'

/**
 * The tavern under Gamla Stan, and the way down to it and up out of it:
 * an open manhole in the street, a ladder down it; the cellar's things,
 * barrels, a long table, the bar, a hearth, lanterns, a shield on the
 * wall and the tavern's sign; and at its far end, the air duct that blows
 * you back up, out of a grate in the street. Each a cell to a pixel, drawn
 * twice the size.
 */

const CELL = 2

type Picture = SecretPicture

const picture = (w: number, h: number, rects: PixelRect[]): Picture => ({
	asset: pixelArt(w, h, rects),
	width: w * CELL,
	height: h * CELL,
})

// --- The manhole --------------------------------------------------------------

/** Cast iron: the grate in the street, and the ladder down the manhole. */
const IRON = '#3d3a37'
const IRON_LIT = '#5f5a54'
const IRON_SHADE = '#2a2725'
const IRON_RIDGE = '#77706a'
/** The dark down it, and the stones round its rim. */
const HOLE = '#0e0c0b'
const HOLE_SHADE = '#1f1b18'
const RIM = '#8f8880'
const RIM_SHADE = '#6f6962'

/** The manhole's shaft: old brick, its mortar, the dark down it, and its ladder's iron. */
export const SHAFT = {
	brick: '#6e3a2a',
	mortar: '#4a2a1f',
	dark: '#120e0c',
	rung: '#7a736d',
}

const HOLE_W = 24
const HOLE_H = 5

/**
 * The manhole, open, its cover gone: a dark oval in the street, seen side
 * on, the shaft going down out of sight, the street's stones round its rim.
 */
export const MANHOLE = picture(HOLE_W, HOLE_H, [
	[4, 0, 16, 1, RIM],
	[1, 1, 22, 1, RIM_SHADE],
	[2, 1, 20, 1, HOLE_SHADE],
	[0, 2, 24, 1, RIM_SHADE],
	[2, 2, 20, 1, HOLE],
	[1, 3, 22, 1, HOLE],
	[4, 4, 16, 1, HOLE],
])

const LADDER_W = 8
const LADDER_H = 15

/**
 * The top of the iron ladder down the manhole, poking up out of it: its
 * two rails, bent over at the top into handholds, lit down their left,
 * two rungs between them, and its foot down in the dark of the hole.
 */
export const LADDER = picture(LADDER_W, LADDER_H, [
	// Its handholds, bent over the top.
	[0, 0, 3, 1, IRON_LIT],
	[5, 0, 3, 1, IRON_LIT],
	[0, 1, 1, 2, IRON_RIDGE],
	[7, 1, 1, 2, IRON_SHADE],
	// Its rails.
	[2, 0, 1, LADDER_H, IRON_RIDGE],
	[1, 0, 1, LADDER_H, IRON_LIT],
	[5, 0, 1, LADDER_H, IRON_RIDGE],
	[6, 0, 1, LADDER_H, IRON_SHADE],
	// Its rungs.
	...[4, 9, 14].map((y): PixelRect => [3, y, 2, 1, IRON_SHADE]),
	...[3, 8, 13].map((y): PixelRect => [3, y, 2, 1, IRON_RIDGE]),
])

/** How far in from the hole's left the ladder stands, on its far side, in world pixels. */
export const LADDER_AT = (HOLE_W - LADDER_W - 3) * CELL

// --- The duct ------------------------------------------------------------------

/** Galvanised steel: the duct, its seams, and its rivets. */
const STEEL = '#9aa3ab'
const STEEL_LIT = '#c3cad0'
const STEEL_SHADE = '#6e767e'
const SEAM = '#5a6168'
const AIR = 'rgba(255,255,255,0.75)'
const AIR_FAINT = 'rgba(255,255,255,0.4)'

/** How wide the duct is, in cells, and so its shaft up through the rock to the street. */
const DUCT_W = 20
/** How wide it is, and its colours, for its shaft up through the rock, drawn with it. */
export const DUCT_COLOURS = {
	width: DUCT_W * CELL,
	steel: STEEL,
	lit: STEEL_LIT,
	shade: STEEL_SHADE,
	seam: SEAM,
	air: AIR,
} satisfies Omit<NonNullable<SecretLook['duct']>, 'grate'>

/**
 * The grate in the street over the duct: a heavy iron grille, its bars
 * across, flat in the cobbles, as the steam vents' are, but square-cut.
 */
export const GRATE = picture(26, 5, [
	[1, 0, 24, 1, IRON_LIT],
	[0, 1, 26, 3, IRON_SHADE],
	[0, 4, 26, 1, IRON_SHADE],
	// Its bars, the dark between them.
	...[2, 6, 10, 14, 18, 22].map((x): PixelRect => [x, 1, 2, 3, HOLE]),
	...[1, 5, 9, 13, 17, 21].map((x): PixelRect => [x, 1, 1, 3, IRON]),
])

const HOUSING = '#7f8890'
const FAN = '#3a3f45'
const FAN_LIT = '#d9dee2'

const LAUNCHER_W = 32
/** As tall as the tavern: the duct goes on up into its roof. */
const LAUNCHER_H = 110
const DUCT_LEFT = (LAUNCHER_W - DUCT_W) / 2
const BOX_TOP = LAUNCHER_H - 28

/**
 * The air duct at the tavern's far end: a square galvanised duct down out
 * of its roof, its seams every so far, into a fan's housing on the floor,
 * riveted, its round grille facing us. Still, its blades show through the
 * grille; `blowing`, they're a blur, and air streams up off the top of the
 * housing into the duct.
 */
const duct = (blowing: boolean) => {
	const rects: PixelRect[] = []
	// The duct, lit down its left, in shadow down its right.
	rects.push([DUCT_LEFT, 0, DUCT_W, BOX_TOP, STEEL])
	rects.push([DUCT_LEFT, 0, 2, BOX_TOP, STEEL_LIT])
	rects.push([DUCT_LEFT + DUCT_W - 2, 0, 2, BOX_TOP, STEEL_SHADE])
	for (let y = 12; y < BOX_TOP; y += 16) {
		rects.push([DUCT_LEFT, y, DUCT_W, 1, SEAM])
		rects.push([DUCT_LEFT, y + 1, DUCT_W, 1, STEEL_LIT])
		for (let x = DUCT_LEFT + 2; x < DUCT_LEFT + DUCT_W - 1; x += 4)
			rects.push([x, y - 1, 1, 1, SEAM])
	}
	// The housing.
	rects.push([0, BOX_TOP, LAUNCHER_W, 28, HOUSING])
	rects.push([0, BOX_TOP, LAUNCHER_W, 2, STEEL_LIT])
	rects.push([0, BOX_TOP + 2, 1, 26, STEEL_LIT])
	rects.push([LAUNCHER_W - 2, BOX_TOP + 2, 2, 26, STEEL_SHADE])
	rects.push([0, LAUNCHER_H - 2, LAUNCHER_W, 2, STEEL_SHADE])
	for (const [x, y] of [
		[2, BOX_TOP + 3],
		[LAUNCHER_W - 4, BOX_TOP + 3],
		[2, LAUNCHER_H - 5],
		[LAUNCHER_W - 4, LAUNCHER_H - 5],
	])
		rects.push([x, y, 1, 1, SEAM])
	// Its grille, round, and the fan behind it.
	const cx = LAUNCHER_W / 2
	const cy = BOX_TOP + 15
	for (let y = -10; y < 10; y++)
		for (let x = -10; x < 10; x++) {
			const r = Math.hypot(x + 0.5, y + 0.5)
			if (r > 10) continue
			let fill = FAN
			if (r > 9) fill = SEAM
			else if (blowing)
				fill = r < 2 ? SEAM : (x + y) % 3 === 0 ? FAN_LIT : '#8a929a'
			else {
				// Four blades, still.
				const blade = Math.abs(x + 0.5) < 2.5 || Math.abs(y + 0.5) < 2.5
				fill = r < 2 ? SEAM : blade ? STEEL : FAN
			}
			rects.push([cx + x, cy + y, 1, 1, fill])
		}
	// The grille's bars across it.
	for (let y = cy - 8; y < cy + 9; y += 4)
		rects.push([cx - 9, y, 18, 1, STEEL_SHADE])
	// Blowing: air streaming up off the housing, into the duct.
	if (blowing)
		for (const [x, top, long] of [
			[DUCT_LEFT + 4, BOX_TOP - 18, 14],
			[DUCT_LEFT + 9, BOX_TOP - 30, 22],
			[DUCT_LEFT + 14, BOX_TOP - 22, 16],
		]) {
			rects.push([x, top, 1, long, AIR])
			rects.push([x + 1, top + 4, 1, long - 6, AIR_FAINT])
		}
	return pixelArt(LAUNCHER_W, LAUNCHER_H, rects)
}

/**
 * The duct, as the Secret's launcher: run into the fan's grille, at its
 * middle, and you're blown straight up the duct.
 */
export const DUCT: SecretLook['launcher'] = {
	kneel: duct(false),
	thrown: duct(true),
	width: LAUNCHER_W * CELL,
	kneelHeight: LAUNCHER_H * CELL,
	thrownHeight: LAUNCHER_H * CELL,
	hands: { x: (LAUNCHER_W / 2) * CELL, y: (BOX_TOP + 15) * CELL },
}

// --- The tavern's things -------------------------------------------------------

/** Oak, old and dark, and its iron hoops. */
const OAK = '#7a4f2c'
const OAK_LIT = '#9c6a3c'
const OAK_SHADE = '#553419'
const OAK_DARK = '#3d2410'
const HOOP = '#3a3634'
const HOOP_LIT = '#6a6460'
const BRASS = '#c9a24a'
const BRASS_LIT = '#f0d27a'
const PEWTER = '#a7aab0'
const PEWTER_LIT = '#d6d9dd'
const PEWTER_SHADE = '#7b7f86'
const FOAM = '#fffaf0'
const FOAM_SHADE = '#e8dcc2'
const ALE = '#d18b25'
const FLAME = '#ffd34d'
const FLAME_HOT = '#fff4c2'
const FLAME_OUT = '#ff8a2a'
const WAX = '#efe6cf'
const GLOW = '#ffb84d'

/** A pewter tankard, a little one, as it stands on a table, foam over its rim: 5 by 6. */
const tankard = (x: number, y: number): PixelRect[] => [
	[x, y, 4, 1, FOAM],
	[x, y + 1, 4, 5, PEWTER],
	[x, y + 1, 1, 5, PEWTER_LIT],
	[x + 3, y + 1, 1, 5, PEWTER_SHADE],
	[x + 4, y + 2, 1, 1, PEWTER_SHADE],
	[x + 4, y + 4, 1, 1, PEWTER_SHADE],
	[x + 1, y + 3, 2, 1, PEWTER_SHADE],
]

/** A candle, lit, on its stick: 3 by 7. */
const candle = (x: number, y: number, flicker: boolean): PixelRect[] => [
	[x + 1, y, 1, 1, flicker ? FLAME_OUT : FLAME_HOT],
	[x + (flicker ? 0 : 1), y + 1, 1, 1, FLAME],
	[x + 1, y + 2, 1, 3, WAX],
	[x, y + 5, 3, 1, BRASS],
	[x, y + 6, 3, 1, BRASS_LIT],
]

/**
 * An ale barrel on its side in a cradle, its end towards us: oak staves in
 * rings, iron hoops, and a brass tap in its middle. 20 by 20.
 */
const barrelAt = (x: number, y: number) => {
	if (x < 0 || y < 0 || x >= 20 || y >= 20) return undefined
	const dx = x - 10
	const dy = y - 9
	const r = Math.hypot(dx, dy)
	// Its cradle, under it.
	if (y > 16) return x < 3 || x > 16 ? OAK_DARK : y > 18 ? OAK_SHADE : undefined
	if (r > 9) return undefined
	// Its hoop round its end.
	if (r > 8) return dy < -3 ? HOOP_LIT : HOOP
	if (r > 7) return OAK_SHADE
	// The tap.
	if (Math.abs(dx) < 1 && dy > 0 && dy < 4) return dy > 3 ? BRASS : BRASS_LIT
	// The end's staves, lit at the top.
	if (Math.floor(x) % 4 === 0) return OAK_SHADE
	return dy < -4 ? OAK_LIT : OAK
}

const BARREL: Picture = {
	asset: paintedArt(20, 20, barrelAt),
	width: 20 * CELL,
	height: 20 * CELL,
}

/** Three barrels, two on the floor and one up on them, no cradle under it. 38 by 36. */
const BARRELS: Picture = {
	asset: paintedArt(
		38,
		36,
		(x, y) =>
			(y < 17 ? barrelAt(x - 9, y) : undefined) ??
			barrelAt(x, y - 16) ??
			barrelAt(x - 18, y - 16),
	),
	width: 38 * CELL,
	height: 36 * CELL,
}

/**
 * A long oak table, trestles under it, benches either side, three
 * tankards on it and a candle burning in the middle. 56 by 22, two frames,
 * the candle flickering.
 */
const table = (flicker: boolean) =>
	pixelArt(56, 22, [
		// The bench behind it.
		[0, 13, 56, 2, OAK_SHADE],
		// Its top, lit along its edge.
		[2, 11, 52, 2, OAK_LIT],
		[2, 13, 52, 2, OAK],
		[2, 15, 52, 1, OAK_DARK],
		// Its trestles.
		[6, 16, 3, 6, OAK_SHADE],
		[47, 16, 3, 6, OAK_SHADE],
		[6, 18, 44, 1, OAK_DARK],
		// The bench in front, low.
		[0, 18, 56, 2, OAK],
		[0, 18, 56, 1, OAK_LIT],
		[2, 20, 2, 2, OAK_DARK],
		[52, 20, 2, 2, OAK_DARK],
		// On it: tankards, and the candle.
		...tankard(8, 5),
		...tankard(16, 5),
		...tankard(40, 5),
		...candle(27, 4, flicker),
	])

const TABLE: SecretProp = {
	frames: [table(false), table(true)],
	width: 56 * CELL,
	height: 22 * CELL,
	glow: { x: 0, y: 34, reach: 44, colour: GLOW },
}

const BOTTLE = ['#2f6a3a', '#6a2f2a', '#3a4f7a']

/**
 * The bar: an oak counter, panelled, its top lit, three brass taps up off
 * it; behind it, shelves on the wall, bottles and tankards along them. 72
 * by 50.
 */
const BAR: Picture = picture(72, 50, [
	// The shelves, and what's on them: bottles and tankards on the top
	// one, tankards along the next.
	[2, 10, 68, 2, OAK],
	[2, 12, 68, 1, OAK_DARK],
	[2, 24, 68, 2, OAK],
	[2, 26, 68, 1, OAK_DARK],
	...Array.from({ length: 9 }, (_, i): PixelRect[] => {
		const x = 5 + i * 7
		if (i % 3 === 1) return tankard(x, 4)
		const glass = BOTTLE[i % BOTTLE.length]
		return [
			[x + 1, 2, 1, 3, glass],
			[x, 5, 3, 5, glass],
			[x, 5, 1, 2, '#ffffff'],
		]
	}).flat(),
	...Array.from({ length: 8 }, (_, i) => tankard(6 + i * 8, 18)).flat(),
	// The counter's top, lit along its edge.
	[0, 30, 72, 2, OAK_LIT],
	[0, 32, 72, 1, OAK_DARK],
	// Its front, panelled.
	[1, 33, 70, 17, OAK],
	...[2, 19, 36, 53].flatMap((x): PixelRect[] => [
		[x, 35, 15, 13, OAK_SHADE],
		[x + 1, 36, 13, 11, OAK],
		[x + 1, 36, 13, 1, OAK_LIT],
	]),
	// The taps, brass, up off the counter.
	...[24, 34, 44].flatMap((x): PixelRect[] => [
		[x - 1, 29, 4, 1, OAK_DARK],
		[x, 22, 2, 7, BRASS],
		[x, 22, 1, 7, BRASS_LIT],
		[x + 2, 24, 2, 1, BRASS],
	]),
])

/** Stone, for the hearth: grey granite, and its soot. */
const STONE = '#8a8580'
const STONE_LIT = '#aaa59f'
const STONE_SHADE = '#625e5a'
const SOOT = '#24201d'
const EMBER = '#c2401f'

/**
 * The hearth: a fireplace of rough-cut stone, a fire roaring in it, a pot
 * hung over it, two frames, the flames leaping. 40 by 44.
 */
const hearth = (leap: boolean) => {
	const rects: PixelRect[] = []
	// Its stones, in courses, each lit along its top.
	for (let y = 0; y < 44; y += 5)
		for (let x = (y / 5) % 2 ? -3 : 0; x < 40; x += 7) {
			const left = Math.max(0, x)
			const w = Math.min(40, x + 7) - left - 1
			rects.push([left, y, w, 4, STONE])
			rects.push([left, y, w, 1, STONE_LIT])
			rects.push([left, y + 4, w + 1, 1, STONE_SHADE])
		}
	// Its mantel.
	rects.push([0, 12, 40, 3, OAK])
	rects.push([0, 12, 40, 1, OAK_LIT])
	// Its mouth, black with soot, the fire in it.
	rects.push([7, 17, 26, 27, SOOT])
	rects.push([9, 41, 22, 3, EMBER])
	for (const [x, h] of leap
		? [
				[11, 12],
				[15, 17],
				[20, 14],
				[25, 18],
				[28, 9],
			]
		: [
				[11, 9],
				[15, 14],
				[20, 18],
				[25, 13],
				[28, 11],
			]) {
		rects.push([x, 41 - h, 3, h, FLAME_OUT])
		rects.push([x + 1, 41 - h + 3, 2, h - 3, FLAME])
		rects.push([x + 1, 41 - Math.floor(h / 3), 1, Math.floor(h / 3), FLAME_HOT])
	}
	// A pot, hung over it.
	rects.push([19, 17, 1, 6, HOOP])
	rects.push([15, 23, 10, 6, HOOP])
	rects.push([15, 23, 10, 1, HOOP_LIT])
	return pixelArt(40, 44, rects)
}

const HEARTH: SecretProp = {
	frames: [hearth(false), hearth(true)],
	width: 40 * CELL,
	height: 44 * CELL,
	glow: { x: 0, y: 20, reach: 90, colour: '#ff9a3a' },
}

/** An iron lantern, hung on the wall from its bracket, a candle in it: 10 by 16. */
const lantern = (flicker: boolean) =>
	pixelArt(10, 16, [
		// Its bracket, off the wall.
		[0, 0, 7, 1, HOOP],
		[5, 0, 1, 3, HOOP],
		// Its cap.
		[3, 3, 5, 1, HOOP_LIT],
		[2, 4, 7, 1, HOOP],
		// Its glass, lit by the candle in it.
		[2, 5, 7, 8, '#ffe7a8'],
		[2, 5, 1, 8, HOOP],
		[8, 5, 1, 8, HOOP],
		[5, 5, 1, 8, '#e8c47a'],
		...candle(4, 6, flicker).map(
			([x, y, w, h, c]): PixelRect => [x, y, w, Math.min(h, 13 - y), c],
		),
		// Its base.
		[2, 13, 7, 2, HOOP],
		[2, 13, 7, 1, HOOP_LIT],
		[4, 15, 3, 1, HOOP],
	])

const LANTERN: SecretProp = {
	frames: [lantern(false), lantern(true)],
	width: 10 * CELL,
	height: 16 * CELL,
	glow: { x: 2, y: 150 + 16, reach: 54, colour: GLOW },
	hung: 150,
}

const SHIELD_RED = '#b8352a'
const SHIELD_RED_LIT = '#d65446'
const SHIELD_WHITE = '#efe6d2'
const AXE_HEAD = '#b9bec4'
const AXE_EDGE = '#e8ecef'

/**
 * Over the hearth, a round shield, red and white in quarters, an iron boss
 * at its middle, and two axes crossed behind it. 34 by 26.
 */
const SHIELD: Picture = (() => {
	const w = 34
	const h = 26
	const asset = paintedArt(w, h, (x, y) => {
		const cx = w / 2
		const cy = h / 2
		const dx = x - cx
		const dy = y - cy
		const r = Math.hypot(dx, dy)
		if (r < 11) {
			if (r < 2.2) return r < 1.2 ? HOOP_LIT : HOOP
			if (r > 10) return dy < 0 ? OAK_LIT : OAK_SHADE
			const red = dx < 0 === dy < 0
			return red ? (dy < -5 ? SHIELD_RED_LIT : SHIELD_RED) : SHIELD_WHITE
		}
		// The axes, crossed behind it: their hafts on the diagonals, their
		// heads out at the top corners.
		const onA = Math.abs(dx - dy * 1.25) < 1.2
		const onB = Math.abs(dx + dy * 1.25) < 1.2
		if (dy < -6 && Math.abs(dx) > 9 && Math.abs(dx) < 16 && dy > -13)
			return Math.abs(dx) > 14 ? AXE_EDGE : AXE_HEAD
		if (onA || onB) return OAK_SHADE
		return undefined
	})
	return { asset, width: w * CELL, height: h * CELL }
})()

const SIGN_WOOD = '#6e4527'
const SIGN_LIT = '#8d5c34'
const SIGN_LETTERS = '#e8c25a'

/**
 * The tavern's sign, hung from the vault on two chains: KROGEN, the
 * tavern, in gold on a dark board. 44 by 18.
 */
const SIGN: Picture = {
	asset: svgUrl(
		44,
		18,
		`${[
			[6, 0, 1, 5, HOOP],
			[37, 0, 1, 5, HOOP],
			[1, 5, 42, 13, SIGN_WOOD],
			[1, 5, 42, 1, SIGN_LIT],
			[1, 17, 42, 1, OAK_DARK],
		]
			.map(
				([x, y, w, h, f]) =>
					`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`,
			)
			.join('')}${pixelText('KROGEN', 6, 8, 1, SIGN_LETTERS)}`,
	),
	width: 44 * CELL,
	height: 18 * CELL,
}

const prop = (art: Picture, more: Partial<SecretProp> = {}): SecretProp => ({
	frames: [art.asset],
	width: art.width,
	height: art.height,
	...more,
})

/** The tavern's things, to stand against its back wall or hang on it. */
export const TAVERN = {
	barrels: prop(BARRELS),
	barrel: prop(BARREL),
	table: TABLE,
	bar: prop(BAR),
	hearth: HEARTH,
	lantern: LANTERN,
	shield: prop(SHIELD, { hung: 104 }),
	sign: prop(SIGN, { hung: 150 }),
}
