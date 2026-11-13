import type { CaveTiles } from '../types'
import {
	type PixelRect,
	paintedArt,
	pixelArt,
	pixelText,
	pixelTextWidth,
	rectsMarkup,
	svgUrl,
	tile,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * Karolinska's art at full size, drawn in code: the hospital, outside and
 * in. Outside, Solna's skyline, the plaza in front of the new hospital and
 * its sign; inside, its walls and floors, the reception, the escalator up,
 * the corridor and its beds, the lab, and the shrink ray. Everything here
 * is a cell to a pixel, drawn twice its size as scenery (`scale: 2`),
 * unless it says it's in world pixels (tiles, features, rocks, the gurney).
 *
 * The scientist (Dr Lind, say) is the same one throughout: dark hair up in
 * a bun, round black glasses, a white lab coat over teal scrubs, a red
 * lanyard. At the shrink ray's controls; and on the far side of the body,
 * sneezing everyone back out. Shrunk, it's their face looming over the
 * bench.
 */

// --- Shared colours ---------------------------------------------------------

const INK = '#1d1d1d'
const WHITE = '#f6f7f6'
const WHITE_SHADE = '#d6dcdc'
const WHITE_DARK = '#b7bfc0'
const STEEL = '#9aa3a8'
const STEEL_LIT = '#c3cacd'
const STEEL_DARK = '#6c757a'
/** Karolinska's blue, on its signs. */
const KS_BLUE = '#1f4e8c'
const KS_BLUE_LIT = '#3a6fb0'
/** The scientist: skin, hair, glasses, coat, scrubs, lanyard. */
const SKIN = '#e8b48e'
const SKIN_SHADE = '#c98f6c'
const HAIR = '#2d211c'
const HAIR_LIT = '#4a372c'
const COAT = '#f4f6f6'
const COAT_SHADE = '#cdd4d6'
const SCRUBS = '#2f8f8a'
const SCRUBS_DARK = '#226a66'
const LANYARD = '#c8323a'
const SHOE = '#3a3f44'
/** Light off round glasses. */
const LENS = '#d6ecf6'

// --- The building ----------------------------------------------------------

const PANEL = '#e4e8e8'
const PANEL_LIT = '#f2f4f4'
const PANEL_SEAM = '#b9c1c4'
const GLASS = '#6c8ca4'
const GLASS_LIT = '#9cbbd0'
const GLASS_DARK = '#4f6d84'
const MULLION = '#56636c'

/**
 * The facade, 120 by 120, a storey to a tile: a band of pale panels, its
 * seams, and a band of windows, mullions between them, the sky catching in
 * the top of each pane.
 */
function facadeTile() {
	const t = tile(120, 120)
	t.rect(0, 0, 120, 120, PANEL)
	// The spandrel panels: lit along the top, a seam between each.
	t.rect(0, 0, 120, 2, PANEL_LIT)
	for (const x of [0, 40, 80]) t.rect(x, 0, 2, 40, PANEL_SEAM)
	t.rect(0, 20, 120, 2, PANEL_SEAM)
	// The windows, along a storey.
	t.rect(0, 40, 120, 54, MULLION)
	for (const x of [0, 30, 60, 90]) {
		t.rect(x + 2, 42, 26, 50, GLASS)
		t.rect(x + 2, 42, 26, 8, GLASS_LIT)
		t.rect(x + 2, 86, 26, 6, GLASS_DARK)
		t.rect(x + 22, 52, 4, 30, GLASS_LIT)
	}
	// The sill, and the panel under it.
	t.rect(0, 94, 120, 4, PANEL_LIT)
	t.rect(0, 98, 120, 2, PANEL_SEAM)
	t.rect(60, 100, 2, 20, PANEL_SEAM)
	return { asset: t.url(), width: 120, height: 120 }
}

/**
 * Its floor slab and foundations, under the path, 120 by 80: plain cast
 * concrete in big pours, a seam between them, and a pockmark now and then.
 */
function slabTile() {
	const t = tile(120, 80)
	t.rect(0, 0, 120, 80, '#8f969c')
	t.rect(0, 78, 120, 2, '#80878d')
	t.rect(118, 0, 2, 80, '#80878d')
	t.rect(0, 0, 120, 2, '#9ba2a7')
	for (const [x, y] of [
		[14, 22],
		[70, 12],
		[40, 54],
		[96, 46],
		[26, 66],
	])
		t.rect(x, y, 2, 2, '#828990')
	return { asset: t.url(), width: 120, height: 80 }
}

const WALL = '#e4ebdc'
const WALL_PANEL = '#dbe3d2'
const WAINSCOT = '#b6c8b4'
const WAINSCOT_DARK = '#9fb39d'
const RAIL = '#c79a62'
const RAIL_LIT = '#e0b880'
const SKIRTING = '#7f8f84'

/**
 * The inside walls, 120 by 240: pale green over a darker wainscot, the
 * handrail along it at a runner's hip, and the skirting: a storey, 240
 * tall. The floors are at 490 and 250, both 10 down a tile, so it lines
 * up on both: the wall shows down to 18 above the floor.
 */
function wallTile() {
	const t = tile(120, 240)
	t.rect(0, 0, 120, 240, WALL)
	// Faint panels, a seam between each, and a ceiling's shadow line high up.
	t.rect(0, 10, 2, 194, WALL_PANEL)
	t.rect(60, 10, 2, 194, WALL_PANEL)
	t.rect(0, 120, 120, 2, WALL_PANEL)
	// The wainscot, under the handrail, down to the skirting at the floor.
	t.rect(0, 208, 120, 32, WAINSCOT)
	t.rect(0, 238, 120, 2, WAINSCOT_DARK)
	t.rect(0, 0, 120, 8, WAINSCOT)
	t.rect(0, 6, 120, 4, SKIRTING)
	// The handrail, wood, on its brackets.
	t.rect(0, 204, 120, 4, RAIL)
	t.rect(0, 204, 120, 2, RAIL_LIT)
	for (const x of [20, 80]) t.rect(x, 208, 4, 4, STEEL_DARK)
	return { asset: t.url(), width: 120, height: 240 }
}

/**
 * The hospital as a Cave (see `Cave`): `rock`, its outside, its facade,
 * seen over the ceiling of wherever you are inside, and from outside over
 * the lot till you go in; `front`, its floor slab and foundations, under
 * the path; `wall`, the inside walls behind you. World pixels.
 */
export const HOSPITAL_TILES: CaveTiles = {
	rock: facadeTile(),
	front: slabTile(),
	wall: wallTile(),
}

// --- Solna, behind the plaza ------------------------------------------------

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
/** A rect, and again a band's width along if it runs off its right edge, so the band wraps. */
const wrapped = (
	width: number,
	x: number,
	y: number,
	w: number,
	h: number,
	fill: string,
) =>
	rect(x, y, w, h, fill) + (x + w > width ? rect(x - width, y, w, h, fill) : '')
const even = (n: number) => Math.round(n / 2) * 2

/**
 * Far off: Solna's blocks of flats and offices, pale and blue with the
 * distance, a crane, and the towers of Karolinska Institutet, 960 by 160.
 */
export const SOLNA_FAR = (() => {
	const W = 960
	const random = seeded(17101)
	const BLOCK = '#b4c3d1'
	const BLOCK_LIT = '#c2cfdb'
	const WINDOW = '#a5b5c4'
	let out = ''
	for (let x = 0; x < W; ) {
		const w = even(40 + random() * 70)
		const h = even(40 + random() * 50)
		out += wrapped(W, x, 160 - h, w, h, BLOCK)
		out += wrapped(W, x, 160 - h, w, 2, BLOCK_LIT)
		// Rows of windows, faint.
		for (let y = 160 - h + 6; y < 156; y += 8)
			for (let wx = x + 4; wx < x + w - 4; wx += 6)
				out += wrapped(W, wx, y, 2, 2, WINDOW)
		x += w + even(random() * 20)
	}
	// Karolinska Institutet's towers, and its Aula Medica, sloping.
	out += rect(300, 50, 26, 110, BLOCK)
	out += rect(300, 50, 26, 2, BLOCK_LIT)
	out += rect(332, 34, 22, 126, '#adbdcc')
	for (let y = 40; y < 156; y += 8) {
		out += rect(304, y + 8, 18, 2, WINDOW)
		out += rect(336, y, 14, 2, WINDOW)
	}
	for (let i = 0; i < 40; i++)
		out += rect(620 + i * 2, 90 + i, 2, 70 - i, '#a9b9c8')
	// A crane, over a building site.
	out += rect(780, 30, 2, 130, '#9fb0c0')
	out += rect(740, 30, 70, 2, '#9fb0c0')
	out += rect(806, 32, 2, 10, '#9fb0c0')
	return svgUrl(W, 160, out)
})()

/**
 * Nearer: the hospital's neighbours, flats with their windows lit by the
 * sky, and birches in front, 960 by 160.
 */
export const SOLNA_NEAR = (() => {
	const W = 960
	const random = seeded(17202)
	const BLOCK = '#94a7b8'
	const BLOCK_LIT = '#a5b7c6'
	const WINDOW = '#7d91a3'
	const WINDOW_LIT = '#b8cad8'
	const TREE = '#7f9a86'
	const TREE_DARK = '#6e8a76'
	let out = ''
	for (let x = 0; x < W; ) {
		const w = even(60 + random() * 80)
		const h = even(50 + random() * 40)
		out += wrapped(W, x, 160 - h, w, h, BLOCK)
		out += wrapped(W, x, 160 - h, w, 2, BLOCK_LIT)
		for (let y = 160 - h + 8; y < 150; y += 12)
			for (let wx = x + 6; wx < x + w - 8; wx += 10)
				out += wrapped(W, wx, y, 6, 6, random() < 0.25 ? WINDOW_LIT : WINDOW)
		x += w + even(20 + random() * 50)
	}
	// Birches along the foot of it all.
	for (let x = 10; x < W; x += even(30 + random() * 40)) {
		const h = even(26 + random() * 26)
		const r = even(10 + random() * 6)
		out += wrapped(W, x - r, 160 - h - r, r * 2, r * 2, TREE)
		out += wrapped(W, x - r + 4, 160 - h - r + 2, r * 2 - 8, 4, '#8fa996')
		out += wrapped(W, x - r, 160 - h + r - 4, r * 2, 4, TREE_DARK)
		out += wrapped(W, x - 1, 160 - h + r, 2, h - r, '#e2e6e2')
	}
	out += rect(0, 154, W, 6, '#8a9aa6')
	return svgUrl(W, 160, out)
})()
export const SOLNA_FILL = '#a7b6c4'

// --- Outside ---------------------------------------------------------------

/**
 * The big sign out front, on its plinth: KAROLINSKA in white on the
 * hospital's blue, Universitetssjukhuset under it: 74 by 30.
 */
export const karolinskaSign = (() => {
	const w = 74
	const name = 'KAROLINSKA'
	const nameX = Math.round((w - pixelTextWidth(name, 1)) / 2)
	return svgUrl(
		w,
		30,
		[
			rectsMarkup([
				// Its plinth, granite.
				[6, 22, 62, 8, '#8b8e90'],
				[6, 22, 62, 1, '#a9adaf'],
				// The sign.
				[2, 2, 70, 20, KS_BLUE],
				[2, 2, 70, 1, KS_BLUE_LIT],
				[2, 21, 70, 1, '#163a6a'],
				[2, 16, 70, 1, KS_BLUE_LIT],
				// A little crown, the Karolinska mark.
				[4, 4, 3, 1, '#f2c200'],
				[4, 3, 1, 1, '#f2c200'],
				[6, 3, 1, 1, '#f2c200'],
			]),
			pixelText(name, nameX, 6, 1, WHITE),
			rectsMarkup(
				// "UNIVERSITETSSJUKHUSET", in a line too small to letter: a rule.
				[[14, 18, 46, 1, '#c9d6e8']],
			),
		].join(''),
	)
})()

/** A bench on the plaza: slats, steel legs: 30 by 12. */
export const bench = pixelArt(30, 12, [
	[2, 0, 26, 2, '#9a6a3e'],
	[2, 0, 26, 1, '#b8844f'],
	[0, 4, 30, 2, '#9a6a3e'],
	[0, 4, 30, 1, '#b8844f'],
	[0, 6, 30, 1, '#6e4a2a'],
	[3, 7, 2, 5, STEEL_DARK],
	[25, 7, 2, 5, STEEL_DARK],
	[3, 2, 2, 2, STEEL_DARK],
	[25, 2, 2, 2, STEEL_DARK],
])

/** A bike rack, two bikes in it, one blue, one red: 40 by 18. */
export const bikeRack = (() => {
	const bike = (x: number, frame: string): PixelRect[] => [
		// Its wheels, a ring each.
		...ring(x, 10, frame),
		...ring(x + 12, 10, frame),
		// Its frame, saddle and bars.
		[x + 4, 8, 9, 1, frame],
		[x + 4, 9, 1, 3, frame],
		[x + 8, 9, 1, 4, frame],
		[x + 3, 6, 3, 1, INK],
		[x + 12, 5, 1, 4, frame],
		[x + 11, 5, 3, 1, INK],
	]
	function ring(x: number, y: number, fill: string): PixelRect[] {
		return [
			[x, y + 1, 1, 5, INK],
			[x + 6, y + 1, 1, 5, INK],
			[x + 1, y, 5, 1, INK],
			[x + 1, y + 6, 5, 1, INK],
			[x + 3, y + 3, 1, 1, fill],
		]
	}
	return pixelArt(40, 18, [
		// The rack's hoops.
		[2, 8, 1, 10, STEEL],
		[36, 8, 1, 10, STEEL],
		[2, 8, 35, 1, STEEL_LIT],
		...bike(4, '#2a6ac2'),
		...bike(20, '#c8323a'),
	])
})()

/**
 * A Swedish ambulance, parked: yellow, a green and yellow chequered band
 * along it, AMBULANS on its side, its blue lights on top: 72 by 34.
 */
export const ambulance = (() => {
	const YELLOW = '#f2d32a'
	const YELLOW_SHADE = '#d6b51c'
	const GREEN = '#1f9a4a'
	const rects: PixelRect[] = [
		// Its box body, and its cab, out front to the right.
		[2, 6, 50, 22, YELLOW],
		[2, 6, 50, 1, '#fbe878'],
		[52, 12, 16, 16, YELLOW],
		[52, 12, 16, 1, '#fbe878'],
		[66, 18, 4, 8, YELLOW_SHADE],
		// Its windscreen and side window.
		[56, 14, 10, 6, '#6c8ca4'],
		[56, 14, 10, 1, '#9cbbd0'],
		// The light bar.
		[20, 3, 12, 3, '#2a6ae0'],
		[24, 3, 4, 3, '#cfe0ff'],
		[54, 9, 8, 3, '#2a6ae0'],
		// The chequered band.
		...Array.from(
			{ length: 33 },
			(_, i): PixelRect => [2 + i * 2, 18, 2, 2, i % 2 ? GREEN : YELLOW],
		),
		...Array.from(
			{ length: 33 },
			(_, i): PixelRect => [2 + i * 2, 20, 2, 2, i % 2 ? YELLOW : GREEN],
		),
		// Its back doors.
		[2, 7, 1, 21, YELLOW_SHADE],
		[14, 7, 1, 11, YELLOW_SHADE],
		// Its wheels.
		[8, 26, 10, 8, INK],
		[11, 28, 4, 4, STEEL],
		[52, 26, 10, 8, INK],
		[55, 28, 4, 4, STEEL],
		[2, 27, 68, 1, '#3a3a3a'],
	]
	return svgUrl(
		72,
		34,
		rectsMarkup(rects) + pixelText('AMBULANS', 4, 9, 1, GREEN),
	)
})()

/** A birch, its white trunk with black marks, a light green crown: 32 by 72. */
export const birch = paintedArt(32, 72, (x, y) => {
	const crown =
		((x - 16) / 14) ** 2 + ((y - 22) / 22) ** 2 <= 1 ||
		((x - 10) / 8) ** 2 + ((y - 36) / 10) ** 2 <= 1 ||
		((x - 22) / 8) ** 2 + ((y - 34) / 10) ** 2 <= 1
	if (crown) {
		if (y < 10 || (x < 12 && y < 18)) return '#a7cf6a'
		if (y > 36 || x > 25) return '#5f8f3a'
		return (Math.floor(x / 3) + Math.floor(y / 3)) % 5 === 0
			? '#5f8f3a'
			: '#7cae48'
	}
	if (x >= 15 && x < 18 && y >= 30) {
		if ((Math.floor(y) % 7 === 0 && x < 17) || Math.floor(y) % 11 === 3)
			return INK
		return x < 16 ? '#ffffff' : '#e2e2dc'
	}
	return undefined
})

/** A street lamp, tall and slim, its lamp lit: 10 by 72. */
export const lampPost = pixelArt(10, 72, [
	[4, 4, 2, 66, '#4a4f55'],
	[3, 68, 4, 4, '#3a3f44'],
	[1, 2, 8, 3, '#4a4f55'],
	[2, 5, 6, 2, '#fff1b8'],
	[4, 4, 2, 1, '#6a7076'],
])

/**
 * Over the way in, on the outside of the building: a glass canopy, its
 * steel edge, and over it, on a band of the hospital's blue, its name,
 * KAROLINSKA, and under it UNIVERSITETSSJUKHUSET. 160 by 48 cells: world
 * pixels twice that. Its bottom on the vestibule's ceiling.
 */
export const ENTRANCE = (() => {
	const w = 160
	const h = 48
	const name = 'KAROLINSKA'
	const sub = 'UNIVERSITETSSJUKHUSET'
	const rects: PixelRect[] = [
		// The name's band, on the facade.
		[8, 2, 144, 30, KS_BLUE],
		[8, 2, 144, 1, KS_BLUE_LIT],
		[8, 31, 144, 1, '#163a6a'],
		// The canopy: glass, its steel edge along the front, and its stays.
		[0, 38, 160, 8, 'rgba(190, 222, 240, 0.55)'],
		[0, 36, 160, 2, STEEL_LIT],
		[0, 44, 160, 2, STEEL],
		[0, 46, 160, 2, STEEL_DARK],
		[30, 30, 2, 8, STEEL_DARK],
		[128, 30, 2, 8, STEEL_DARK],
		// Lights along its underside.
		...[12, 40, 68, 96, 124, 148].map(
			(x): PixelRect => [x, 46, 4, 2, '#fff1b8'],
		),
	]
	return {
		asset: svgUrl(
			w,
			h,
			rectsMarkup(rects) +
				pixelText(
					name,
					Math.round((w - pixelTextWidth(name, 2)) / 2),
					6,
					2,
					WHITE,
				) +
				pixelText(
					sub,
					Math.round((w - pixelTextWidth(sub, 1)) / 2),
					21,
					1,
					'#c9d6e8',
				),
		),
		width: w * 2,
		height: h * 2,
	}
})()

/** Revolving doors, in the way in: a drum of glass, its wings, a steel canopy: 40 by 72. */
export const revolvingDoor = pixelArt(40, 72, [
	// Its drum's top, and the floor plate.
	[0, 0, 40, 6, STEEL],
	[0, 0, 40, 2, STEEL_LIT],
	[0, 70, 40, 2, STEEL_DARK],
	// The glass of the drum, sides lit.
	[2, 6, 36, 64, 'rgba(170, 206, 228, 0.45)'],
	[2, 6, 2, 64, STEEL_LIT],
	[36, 6, 2, 64, STEEL],
	// Its wings, turning: one face on, one edge on.
	[19, 6, 2, 64, STEEL_DARK],
	[8, 6, 2, 64, 'rgba(120, 150, 170, 0.6)'],
	[30, 6, 2, 64, 'rgba(120, 150, 170, 0.6)'],
	// A push bar on each wing.
	[10, 36, 8, 2, STEEL_DARK],
	[22, 36, 8, 2, STEEL_DARK],
	// Glints.
	[6, 12, 2, 10, '#ffffff'],
	[33, 40, 1, 8, '#ffffff'],
])

// --- People ---------------------------------------------------------------

/**
 * The scientist, facing right, at a runner's size, 24 wide and 31 tall
 * in cells, their feet at the bottom: `x` across from the left. A head, a
 * bun, round glasses, a lab coat over teal scrubs.
 */
function scientist(
	x: number,
	y: number,
	options: {
		/** Head thrown forward, eyes shut, mouth open: sneezing. */
		sneeze?: boolean
		/** An arm out to the right, a hand on a lever. */
		reach?: boolean
		/** Facing left, rather than right. */
		left?: boolean
	} = {},
): PixelRect[] {
	const lean = options.sneeze ? 3 : 0
	const rects: PixelRect[] = [
		// Their shoes, and legs in teal scrubs.
		[x + 7, y + 29, 4, 2, SHOE],
		[x + 13, y + 29, 4, 2, SHOE],
		[x + 8, y + 22, 3, 7, SCRUBS],
		[x + 13, y + 22, 3, 7, SCRUBS_DARK],
		// The lab coat, open, down to the knee.
		[x + 5, y + 11, 13, 13, COAT],
		[x + 5, y + 11, 1, 13, COAT_SHADE],
		[x + 5, y + 23, 13, 1, COAT_SHADE],
		[x + 11, y + 12, 2, 10, SCRUBS],
		[x + 7, y + 17, 3, 3, COAT_SHADE],
		// A pen in the top pocket, and a red lanyard.
		[x + 14, y + 13, 1, 2, KS_BLUE],
		[x + 12, y + 11, 1, 5, LANYARD],
		[x + 12, y + 16, 2, 2, '#f2f2f2'],
		// The far arm, down.
		[x + 15, y + 12, 3, 9, COAT_SHADE],
		[x + 16, y + 21, 2, 2, SKIN_SHADE],
		// The neck.
		[x + 10 + lean, y + 9, 3, 2, SKIN_SHADE],
		// The head, its face to the right.
		[x + 8 + lean, y + 2, 8, 8, SKIN],
		[x + 16 + lean, y + 5, 1, 2, SKIN],
		[x + 8 + lean, y + 9, 7, 1, SKIN_SHADE],
		// Dark hair, swept back into a bun.
		[x + 7 + lean, y + 1, 7, 3, HAIR],
		[x + 7 + lean, y + 4, 3, 4, HAIR],
		[x + 4 + lean, y + 0, 4, 4, HAIR],
		[x + 5 + lean, y + 0, 2, 1, HAIR_LIT],
		[x + 9 + lean, y + 1, 4, 1, HAIR_LIT],
		// The ear.
		[x + 10 + lean, y + 5, 1, 2, SKIN_SHADE],
		// Round black glasses.
		[x + 13 + lean, y + 4, 3, 1, INK],
		[x + 13 + lean, y + 6, 3, 1, INK],
		[x + 13 + lean, y + 4, 1, 3, INK],
		[x + 15 + lean, y + 4, 1, 3, INK],
		[x + 11 + lean, y + 4, 2, 1, INK],
	]
	if (options.sneeze) {
		rects.push(
			// Eyes screwed shut behind the glasses' glare, and the mouth wide.
			[x + 14 + lean, y + 5, 1, 1, LENS],
			[x + 14 + lean, y + 8, 2, 1, '#7a2a2a'],
			// The near arm, up, a hand coming to the face too late.
			[x + 6, y + 11, 3, 6, COAT],
			[x + 8, y + 9, 3, 3, COAT],
			[x + 10, y + 8, 2, 2, SKIN],
		)
	} else {
		rects.push(
			// An eye, glinting behind the glasses, and a smile.
			[x + 14, y + 5, 1, 1, LENS],
			[x + 14, y + 8, 2, 1, '#9a4a3a'],
		)
		if (options.reach)
			rects.push([x + 15, y + 12, 6, 3, COAT], [x + 20, y + 12, 2, 2, SKIN])
		else rects.push([x + 6, y + 12, 3, 9, COAT], [x + 6, y + 21, 2, 2, SKIN])
	}
	return rects
}

/** Flipped across, `width` cells wide: facing the other way. */
const flipped = (width: number, rects: PixelRect[]): PixelRect[] =>
	rects.map(([x, y, w, h, fill]) => [width - x - w, y, w, h, fill])

/**
 * The scientist sneezing, stood facing right, head thrown forward, a spray
 * flying off their nose, drawn twice its size: its nose, where everyone's
 * sneezed out of, `nose` across from its left and down from its top, in
 * world pixels.
 */
export const SNEEZER = (() => {
	const w = 34
	const h = 32
	const spray: PixelRect[] = [
		[22, 4, 2, 2, 'rgba(220, 240, 255, 0.85)'],
		[25, 2, 2, 2, 'rgba(220, 240, 255, 0.75)'],
		[25, 6, 3, 3, 'rgba(220, 240, 255, 0.75)'],
		[28, 4, 2, 2, 'rgba(220, 240, 255, 0.6)'],
		[29, 8, 2, 2, 'rgba(220, 240, 255, 0.55)'],
		[31, 3, 2, 2, 'rgba(220, 240, 255, 0.45)'],
		[32, 7, 2, 2, 'rgba(220, 240, 255, 0.35)'],
	]
	return {
		asset: pixelArt(w, h, [...scientist(0, 1, { sneeze: true }), ...spray]),
		width: w * 2,
		height: h * 2,
		// The tip of the nose: column 19, row 6 + 1, its right edge.
		nose: { x: 20 * 2, y: 7 * 2 },
	}
})()

/** The scientist at the shrink ray's controls, facing left to it, a hand on its lever, pleased. */
export const operator = pixelArt(
	24,
	32,
	flipped(24, scientist(0, 1, { reach: true })),
)

// --- Inside ----------------------------------------------------------------

const DESK = '#e8dcc4'
const DESK_LIT = '#f4ecdc'
const DESK_SHADE = '#c7b898'

/**
 * The reception desk, curved, light wood, a receptionist behind it at a
 * screen, a sign over it, RECEPTION: 90 by 44.
 */
export const receptionDesk = (() => {
	const w = 90
	const rects: PixelRect[] = [
		// The sign, hung over it.
		[15, 0, 60, 9, KS_BLUE],
		[15, 0, 60, 1, KS_BLUE_LIT],
		[24, 9, 1, 3, STEEL_DARK],
		[66, 9, 1, 3, STEEL_DARK],
		// The receptionist, behind the desk: blue top, glasses on a chain.
		[40, 16, 8, 7, SKIN],
		[39, 15, 10, 3, '#b07a3a'],
		[39, 18, 2, 4, '#b07a3a'],
		[45, 19, 1, 1, INK],
		[37, 23, 14, 10, '#4f86b8'],
		[43, 23, 2, 2, SKIN_SHADE],
		// Their screen, turned to them.
		[54, 20, 10, 8, '#2b3036'],
		[55, 21, 8, 6, '#6fb0d8'],
		[58, 28, 2, 4, '#2b3036'],
		// The desk.
		[0, 30, 90, 4, DESK_LIT],
		[0, 34, 90, 10, DESK],
		[0, 43, 90, 1, DESK_SHADE],
		[0, 34, 2, 10, DESK_SHADE],
		[88, 34, 2, 10, DESK_SHADE],
		// Its counter's front, a blue stripe.
		[0, 38, 90, 2, KS_BLUE_LIT],
		// A bell, and a stand of leaflets.
		[12, 28, 4, 2, '#e2b13c'],
		[13, 27, 2, 1, '#e2b13c'],
		[74, 25, 6, 5, '#f2f2f2'],
		[75, 26, 4, 1, '#c8323a'],
		[75, 28, 4, 1, '#2a6ac2'],
	]
	return svgUrl(
		w,
		44,
		rectsMarkup(rects) +
			pixelText(
				'RECEPTION',
				45 - pixelTextWidth('RECEPTION', 1) / 2,
				1,
				1,
				WHITE,
			),
	)
})()

/** A row of waiting room chairs, blue seats on a steel beam, a magazine left on one: 70 by 22. */
export const waitingChairs = pixelArt(70, 22, [
	...[0, 18, 36, 54].flatMap((x): PixelRect[] => [
		// Its back.
		[x + 2, 0, 12, 10, '#3f74a6'],
		[x + 2, 0, 12, 1, '#5a90c2'],
		// Its seat.
		[x, 11, 16, 4, '#3f74a6'],
		[x, 11, 16, 1, '#5a90c2'],
		[x, 14, 16, 1, '#2d5682'],
		[x + 7, 10, 2, 1, STEEL_DARK],
	]),
	// The beam they're on, and its legs.
	[0, 15, 70, 2, STEEL],
	[4, 17, 2, 5, STEEL_DARK],
	[64, 17, 2, 5, STEEL_DARK],
	// A magazine.
	[40, 9, 8, 2, '#e85a8a'],
	[41, 9, 3, 1, '#ffffff'],
])

/** A rubber plant in a pot: 18 by 36. */
export const pottedPlant = paintedArt(18, 36, (x, y) => {
	if (y >= 26) {
		if (y < 28) return '#cfc9bf'
		return x >= 3 && x < 15 ? (x < 5 ? '#a9a39a' : '#bdb7ad') : undefined
	}
	const leaf = (cx: number, cy: number, rx: number, ry: number) =>
		((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
	if (x >= 8.5 && x < 9.5 && y > 6) return '#3c6a2c'
	if (leaf(5, 10, 4, 2.5) || leaf(13, 7, 4, 2.5) || leaf(5, 18, 4.5, 2.5))
		return y < 9 ? '#6fae4a' : '#4f8a3a'
	if (leaf(13, 15, 4.5, 2.5) || leaf(9, 3, 2.5, 3) || leaf(13, 22, 4, 2.5))
		return '#4f8a3a'
	if (leaf(5, 24, 3.5, 2)) return '#3c6a2c'
	return undefined
})

/** Which way to the lab: a blue sign on a post, an arrow up and LAB: 30 by 52. */
export const wayfindingSign = svgUrl(
	30,
	52,
	rectsMarkup([
		[14, 20, 2, 32, STEEL_DARK],
		[10, 50, 10, 2, STEEL_DARK],
		[0, 0, 30, 22, KS_BLUE],
		[0, 0, 30, 1, KS_BLUE_LIT],
		[0, 11, 30, 1, '#163a6a'],
	]) +
		pixelText('↑LAB', 3, 2, 1, WHITE) +
		pixelText('→ WC', 3, 13, 1, '#c9d6e8'),
)

/** A snack machine, red, its shelves lit, a coin slot: 26 by 52. */
export const vendingMachine = pixelArt(26, 52, [
	[0, 0, 26, 52, '#c43b3b'],
	[0, 0, 26, 2, '#e05a5a'],
	[24, 0, 2, 52, '#9a2a2a'],
	[2, 4, 16, 34, '#e8eef2'],
	...[8, 16, 24, 32].flatMap((y, i): PixelRect[] => [
		[2, y, 16, 1, STEEL],
		...[0, 1, 2, 3].map(
			(k): PixelRect => [
				3 + k * 4,
				y - 4,
				3,
				4,
				['#f2c200', '#2a6ac2', '#3aa04a', '#e85a8a'][(k + i) % 4],
			],
		),
	]),
	// The slot, the buttons, and the tray.
	[20, 8, 3, 1, INK],
	[20, 12, 3, 8, '#2b3036'],
	[21, 13, 1, 1, '#6fd06a'],
	[4, 42, 14, 6, '#2b3036'],
	[0, 50, 26, 2, '#7a1a1a'],
])

/** The hospital café's counter, a coffee machine, buns under glass, a menu: 70 by 48. */
export const cafeCounter = svgUrl(
	70,
	48,
	rectsMarkup([
		// The menu board, over it.
		[8, 0, 54, 14, '#2b3036'],
		[8, 0, 54, 1, '#4a5056'],
		// The coffee machine, chrome.
		[6, 20, 14, 12, STEEL],
		[6, 20, 14, 2, STEEL_LIT],
		[11, 26, 4, 2, INK],
		[12, 29, 3, 3, '#ffffff'],
		// Buns under glass.
		[34, 24, 28, 8, 'rgba(200, 230, 240, 0.6)'],
		[36, 28, 6, 4, '#c98a4a'],
		[44, 28, 6, 4, '#e2b06a'],
		[52, 28, 6, 4, '#c98a4a'],
		// The counter, wood.
		[0, 32, 70, 4, '#b8844f'],
		[0, 32, 70, 1, '#d6a26a'],
		[0, 36, 70, 12, '#9a6a3e'],
		[0, 47, 70, 1, '#6e4a2a'],
		...[8, 24, 40, 56].map((x): PixelRect => [x, 38, 2, 8, '#8a5a32']),
	]) + pixelText('KAFE', 35 - pixelTextWidth('KAFE', 1) / 2, 4, 1, '#f2e6c8'),
)

/** A ward's door, pale, a round window in it, its number, and a handle: 34 by 62. */
export const wardDoor = svgUrl(
	34,
	62,
	rectsMarkup([
		// Its frame.
		[0, 0, 34, 62, '#9fb0b8'],
		[2, 2, 30, 60, '#cfd8dc'],
		[2, 2, 30, 1, '#e4eaec'],
		[30, 2, 2, 60, '#b7c2c7'],
		// Its window.
		[11, 10, 12, 12, '#7f9aa8'],
		[12, 11, 10, 10, '#a7c6d6'],
		[13, 12, 3, 2, '#ffffff'],
		// Its handle, and a kick plate.
		[25, 32, 4, 2, STEEL_DARK],
		[4, 52, 26, 8, STEEL],
		// Its number plate.
		[8, 26, 18, 6, KS_BLUE],
	]) + pixelText('12', 11, 26, 1, WHITE),
)

/** A wheelchair, parked, facing left: 26 by 24. */
export const parkedWheelchair = pixelArt(26, 24, [
	// Its big wheel, and its little one.
	[8, 8, 14, 1, INK],
	[8, 23, 14, 1, INK],
	[6, 10, 1, 12, INK],
	[23, 10, 1, 12, INK],
	[7, 9, 2, 1, INK],
	[21, 9, 2, 1, INK],
	[7, 22, 2, 1, INK],
	[21, 22, 2, 1, INK],
	[14, 9, 1, 14, STEEL],
	[7, 15, 16, 1, STEEL],
	[2, 20, 3, 3, INK],
	// The seat and back, blue.
	[4, 12, 14, 3, '#3f74a6'],
	[16, 2, 3, 13, '#3f74a6'],
	[18, 0, 4, 2, STEEL_DARK],
	// Its footrest.
	[2, 15, 2, 5, STEEL],
	[0, 19, 4, 1, STEEL],
])

/** A fire extinguisher on its bracket: 8 by 18. */
export const fireExtinguisher = pixelArt(8, 18, [
	[2, 0, 4, 2, INK],
	[0, 1, 3, 1, INK],
	[1, 3, 6, 14, '#d83a2a'],
	[1, 3, 2, 14, '#ee5a48'],
	[1, 8, 6, 3, '#f2f2f2'],
	[1, 17, 6, 1, '#9a2a1e'],
])

/** A notice board, cork, notes pinned up on it: 40 by 26. */
export const noticeBoard = pixelArt(40, 26, [
	[0, 0, 40, 26, '#8a6a42'],
	[2, 2, 36, 22, '#c69a62'],
	[4, 4, 9, 11, '#ffffff'],
	[5, 6, 7, 1, '#9aa3a8'],
	[5, 8, 6, 1, '#9aa3a8'],
	[16, 5, 8, 8, '#f2e27a'],
	[27, 4, 9, 12, '#ffffff'],
	[28, 6, 7, 3, '#e85a8a'],
	[6, 17, 12, 6, '#9fd0f0'],
	[22, 16, 10, 7, '#ffffff'],
	[23, 18, 8, 1, '#c8323a'],
	[8, 4, 1, 1, '#c8323a'],
	[19, 5, 1, 1, '#2a6ac2'],
	[31, 4, 1, 1, '#3aa04a'],
])

/** A green exit sign, a running figure and an arrow, NÖDUTGÅNG over it: 36 by 14. */
export const exitSign = svgUrl(
	36,
	14,
	rectsMarkup([
		[0, 0, 36, 14, '#1f9a4a'],
		[0, 0, 36, 1, '#3cc06a'],
		[1, 13, 34, 1, '#14703a'],
		// The running figure, white.
		[5, 2, 2, 2, WHITE],
		[4, 4, 3, 4, WHITE],
		[2, 5, 2, 1, WHITE],
		[7, 5, 2, 1, WHITE],
		[3, 8, 2, 3, WHITE],
		[6, 8, 2, 2, WHITE],
		[7, 10, 2, 1, WHITE],
		// The door it's running to.
		[11, 2, 5, 9, WHITE],
		[12, 3, 3, 8, '#1f9a4a'],
	]) +
		pixelText('→', 19, 3, 1, WHITE) +
		pixelText('→', 26, 3, 1, WHITE),
)

// --- The escalators ---------------------------------------------------------

/**
 * An escalator's far side, along its steps: a glass balustrade, its black
 * handrail running along the top, the steel skirt along the steps, and
 * its ends curling down to the floor. 250 by 150 cells, from the floor at
 * its foot in the bottom left (bottom right, going down) to its handrail's
 * top at its head in the top right, 30 cells over the steps. World pixels
 * twice that.
 */
function escalator(down: boolean) {
	const W = 250
	const H = 150
	const RISE = 120
	const RAIL = 30
	/** Where the steps are, `x` along, a y. */
	const steps = (x: number) => H - (RISE * Math.max(0, Math.min(W, x))) / W
	const rects: PixelRect[] = []
	for (let x = 0; x < W; x += 2) {
		const top = Math.round(steps(x + 1))
		// Its ends: the handrail curling down to the floor at its foot, and
		// to the landing at its head.
		const end = Math.min(x, W - x)
		const curl =
			end < 16
				? Math.round(RAIL * (1 - Math.sqrt(1 - ((16 - end) / 16) ** 2)))
				: 0
		const rail = top - RAIL + curl
		rects.push(
			// The glass, a pale tint.
			[x, rail + 3, 2, top - rail - 7, 'rgba(196, 226, 240, 0.4)'],
			// The handrail, black rubber, lit along its top.
			[x, rail, 2, 3, '#1f2326'],
			[x, rail, 2, 1, '#4a5056'],
			// The skirt, steel, along the steps.
			[x, top - 4, 2, 4, STEEL],
			[x, top - 4, 2, 1, STEEL_LIT],
		)
		// The glass's posts, now and then.
		if (x % 40 === 20) rects.push([x, rail + 3, 2, top - rail - 7, STEEL_DARK])
		// A glint across the glass.
		if (x % 60 < 6)
			rects.push([x, rail + 8 + (x % 60), 2, 4, 'rgba(255,255,255,0.7)'])
	}
	return {
		asset: pixelArt(W, H, down ? flipped(W, rects) : rects),
		width: W * 2,
		height: H * 2,
	}
}

/**
 * The escalator's side, up from the ground floor to the next, along the
 * far side of its steps: a balustrade of glass, its handrail along the top.
 * World pixels, `width` along and `height` from its handrail's top at the
 * top end down to the floor at the bottom end. And the one back down.
 */
export const ESCALATOR_UP = escalator(false)
export const ESCALATOR_DOWN = escalator(true)

// --- The lab ---------------------------------------------------------------

/**
 * A lab bench, white, steel legs, cupboards under: on it, a microscope,
 * flasks of something blue and green, a rack of test tubes: 90 by 40.
 */
export const labBench = pixelArt(90, 40, [
	// The microscope.
	[10, 4, 4, 14, '#3a3f44'],
	[8, 2, 6, 3, '#3a3f44'],
	[9, 0, 4, 2, '#5a6066'],
	[13, 10, 6, 2, '#5a6066'],
	[14, 6, 3, 6, '#2b3036'],
	[6, 18, 12, 3, '#3a3f44'],
	[13, 13, 4, 1, '#9fd0f0'],
	// A conical flask, blue.
	[32, 6, 4, 4, 'rgba(200, 230, 240, 0.7)'],
	[30, 10, 8, 4, 'rgba(200, 230, 240, 0.7)'],
	[28, 14, 12, 7, '#4fa0e0'],
	[28, 14, 12, 1, '#8fd0ff'],
	// A round flask, green, bubbling.
	[50, 8, 2, 4, 'rgba(200, 230, 240, 0.7)'],
	[46, 12, 10, 9, '#5ac85a'],
	[46, 12, 10, 1, '#9fe89a'],
	[52, 4, 2, 2, '#9fe89a'],
	// A rack of test tubes.
	[62, 14, 20, 2, '#e8dcc4'],
	[62, 19, 20, 2, '#e8dcc4'],
	...[64, 68, 72, 76].map(
		(x, i): PixelRect => [
			x,
			8 + (i % 2) * 2,
			2,
			12,
			['#e85a8a', '#f2c200', '#4fa0e0', '#e85a8a'][i],
		],
	),
	// The bench top, and its cupboards.
	[0, 21, 90, 3, WHITE],
	[0, 21, 90, 1, '#ffffff'],
	[0, 24, 90, 1, WHITE_DARK],
	[2, 25, 86, 15, WHITE_SHADE],
	[44, 25, 1, 15, WHITE_DARK],
	[20, 30, 4, 1, STEEL_DARK],
	[66, 30, 4, 1, STEEL_DARK],
])

/** A fume hood: a steel cabinet, its glass sash half up, a flask inside: 50 by 72. */
export const fumeHood = pixelArt(50, 72, [
	[0, 0, 50, 72, '#c9d4d8'],
	[0, 0, 50, 2, '#e2e8ea'],
	[48, 0, 2, 72, '#a9b6bb'],
	// The duct out of its top.
	[18, 0, 14, 4, STEEL_DARK],
	// Inside, dim, a flask.
	[4, 8, 42, 30, '#8a989e'],
	[22, 26, 6, 8, '#e85a8a'],
	[24, 22, 2, 4, 'rgba(220, 240, 250, 0.8)'],
	// The sash: glass, its handle.
	[4, 8, 42, 16, 'rgba(210, 236, 248, 0.55)'],
	[4, 22, 42, 2, STEEL],
	[18, 24, 14, 1, STEEL_DARK],
	// The worktop, and the cupboards under.
	[0, 38, 50, 3, WHITE],
	[2, 41, 46, 31, '#b7c4c9'],
	[24, 41, 1, 31, '#9aa8ad'],
	[18, 52, 4, 1, STEEL_DARK],
	[28, 52, 4, 1, STEEL_DARK],
])

/** A centrifuge, on its stand, its lid down, a light on: 24 by 22. */
export const centrifuge = pixelArt(24, 22, [
	[2, 2, 20, 10, '#e6ecee'],
	[2, 2, 20, 2, '#ffffff'],
	[0, 10, 24, 6, '#c9d2d6'],
	[16, 12, 4, 2, '#2b3036'],
	[17, 12, 1, 1, '#6fd06a'],
	[4, 16, 2, 6, STEEL_DARK],
	[18, 16, 2, 6, STEEL_DARK],
	[2, 20, 20, 2, STEEL],
])

/** A lab fridge, glass-fronted, racks of samples inside, a BIOHAZARD sticker: 30 by 62. */
export const labFridge = pixelArt(30, 62, [
	[0, 0, 30, 62, '#eef2f4'],
	[0, 0, 30, 2, '#ffffff'],
	[28, 0, 2, 62, '#c9d2d6'],
	[3, 4, 22, 40, '#bcd8e6'],
	...[12, 22, 34].flatMap((y): PixelRect[] => [
		[3, y, 22, 1, '#8aa6b4'],
		[5, y - 6, 3, 6, '#e85a8a'],
		[10, y - 5, 3, 5, '#f2c200'],
		[16, y - 6, 3, 6, '#5ac85a'],
	]),
	[24, 18, 2, 10, STEEL_DARK],
	// The sticker, yellow, a black trefoil-ish mark.
	[10, 48, 8, 7, '#f2c200'],
	[13, 50, 2, 3, INK],
	[11, 52, 2, 1, INK],
	[15, 52, 2, 1, INK],
	[2, 60, 26, 2, '#9aa8ad'],
])

/** An anatomy model's skeleton, on its stand, one hand waving: 24 by 64. */
export const skeletonModel = pixelArt(24, 64, [
	// The skull.
	[8, 0, 8, 7, '#f1ead8'],
	[9, 3, 2, 2, INK],
	[13, 3, 2, 2, INK],
	[10, 7, 4, 2, '#f1ead8'],
	[10, 8, 1, 1, INK],
	[12, 8, 1, 1, INK],
	// The spine, the ribs.
	[11, 9, 2, 22, '#e2d8c0'],
	...[11, 14, 17, 20].map((y): PixelRect => [6, y, 12, 2, '#f1ead8']),
	// The arms: one down, one up, waving.
	[4, 11, 2, 14, '#f1ead8'],
	[3, 25, 3, 3, '#f1ead8'],
	[18, 4, 2, 9, '#f1ead8'],
	[18, 1, 4, 3, '#f1ead8'],
	// The hips, the legs.
	[7, 29, 10, 4, '#f1ead8'],
	[8, 33, 2, 20, '#f1ead8'],
	[14, 33, 2, 20, '#f1ead8'],
	[6, 53, 4, 2, '#f1ead8'],
	[14, 53, 4, 2, '#f1ead8'],
	// Its stand.
	[11, 31, 2, 31, STEEL_DARK],
	[4, 62, 16, 2, STEEL_DARK],
])

/** A whiteboard, on the wall, a DNA helix and sums scrawled on it: 70 by 40. */
export const whiteboard = (() => {
	const rects: PixelRect[] = [
		[0, 0, 70, 38, '#9aa3a8'],
		[2, 2, 66, 34, '#fbfbfb'],
		[2, 36, 66, 2, '#b7bfc0'],
		// Pens on its ledge.
		[50, 35, 6, 1, '#2a6ac2'],
		[58, 35, 6, 1, '#c8323a'],
	]
	// A double helix, its two strands crossing, rungs between.
	for (let x = 0; x < 30; x++) {
		const a = Math.round(18 + 10 * Math.sin(x / 4.6))
		const b = Math.round(18 - 10 * Math.sin(x / 4.6))
		rects.push([6 + x, a, 1, 1, '#2a6ac2'], [6 + x, b, 1, 1, '#c8323a'])
		if (x % 3 === 1)
			rects.push([6 + x, Math.min(a, b) + 1, 1, Math.abs(a - b) - 1, '#9aa3a8'])
	}
	// Sums, scribbled.
	for (const [y, w] of [
		[8, 16],
		[13, 12],
		[18, 18],
		[23, 10],
	] as const)
		rects.push([44, y, w, 1, '#3a3f44'])
	rects.push([44, 27, 18, 1, '#3a3f44'], [44, 29, 8, 1, '#c8323a'])
	return pixelArt(70, 40, rects)
})()

// --- The shrink ray ---------------------------------------------------------

const RAY_BODY = '#5d7590'
const RAY_LIT = '#7f98b3'
const RAY_DARK = '#40546b'
const RAY_GLOW = '#9ff0ff'
const RAY_GLOW_DEEP = '#36c8e8'
const BRASS = '#d4a63a'
const BRASS_LIT = '#f0cc6a'
/** The plate, where they stand to be shrunk: as pale as the bench they'll be on. */
const PLATE_TOP = '#f1f3f2'
const PLATE_EDGE = '#ffffff'
const PLATE_SPECK = '#dfe3e1'
/** Inside the tube, behind whoever's in it: lit up, near white. */
const TUBE_IN = '#e6f8fb'

/**
 * The shrink ray's size in cells, and the middle of its plate: where
 * everyone's feet are, shrunk down to a speck on it.
 */
const RAY_W = 120
const RAY_H = 112
const PLATE_X = 60
const PLATE_Y = 106
/** The glass tube over the plate, across and up from it. */
const TUBE_HALF = 26
const TUBE_TALL = 48

/**
 * The shrink ray, behind whoever's in it: a great machine of riveted
 * steel, blue-grey, its emitter hung over the plate on an arm, its lens
 * glowing; down its sides, dials, a screen with a shrinking figure on it,
 * lights, cables; the inside of the glass tube lit up; and the plate, a
 * disc as pale as a lab bench, a few specks on it.
 */
function shrinkRayBack() {
	const r: PixelRect[] = []
	const tubeL = PLATE_X - TUBE_HALF
	const tubeR = PLATE_X + TUBE_HALF
	const tubeTop = PLATE_Y - TUBE_TALL
	// The cabinets either side of the tube.
	for (const [x, w] of [
		[4, tubeL - 8],
		[tubeR + 4, RAY_W - tubeR - 8],
	] as const) {
		r.push(
			[x, 40, w, PLATE_Y - 34, RAY_BODY],
			[x, 40, w, 2, RAY_LIT],
			[x, 40, 2, PLATE_Y - 34, RAY_LIT],
			[x + w - 2, 40, 2, PLATE_Y - 34, RAY_DARK],
			// Rivets.
			...[0, 1, 2, 3].map(
				(k): PixelRect => [x + 3, 46 + k * 16, 1, 1, RAY_DARK],
			),
			...[0, 1, 2, 3].map(
				(k): PixelRect => [x + w - 4, 46 + k * 16, 1, 1, RAY_DARK],
			),
		)
	}
	// The left cabinet: a screen showing a figure shrinking, and dials.
	r.push(
		[8, 46, 18, 14, '#1d2a30'],
		[9, 47, 16, 12, '#2a5a4a'],
		[11, 50, 3, 7, '#6fe08a'],
		[16, 53, 2, 4, '#6fe08a'],
		[20, 55, 1, 2, '#6fe08a'],
		[14, 52, 2, 1, '#6fe08a'],
		[18, 54, 2, 1, '#6fe08a'],
		// Dials.
		...[0, 1].flatMap((k): PixelRect[] => [
			[9 + k * 9, 66, 7, 7, '#e8ecee'],
			[10 + k * 9, 67, 5, 5, '#ffffff'],
			[12 + k * 9, 67, 1, 3, '#c8323a'],
		]),
		// Lights, in a row.
		...[0, 1, 2, 3].map(
			(k): PixelRect => [
				10 + k * 4,
				78,
				2,
				2,
				['#f2c200', '#6fd06a', '#c8323a', '#36c8e8'][k],
			],
		),
		// A big red button.
		[12, 86, 8, 4, '#c8323a'],
		[13, 86, 6, 1, '#ef6a6a'],
		[11, 90, 10, 2, RAY_DARK],
	)
	// The right cabinet: a lever, its handle brass, and a gauge.
	r.push(
		[tubeR + 10, 48, 14, 10, '#e8ecee'],
		[tubeR + 11, 49, 12, 8, '#ffffff'],
		[tubeR + 12, 55, 10, 1, '#36c8e8'],
		[tubeR + 13, 53, 7, 1, '#36c8e8'],
		[tubeR + 16, 50, 1, 6, '#c8323a'],
		[tubeR + 15, 66, 6, 20, RAY_DARK],
		[tubeR + 17, 62, 2, 14, STEEL_LIT],
		[tubeR + 15, 59, 6, 4, BRASS],
		[tubeR + 15, 59, 6, 1, BRASS_LIT],
		[tubeR + 10, 90, 14, 3, '#2b3036'],
		[tubeR + 11, 91, 2, 1, '#6fd06a'],
		[tubeR + 15, 91, 2, 1, '#6fd06a'],
		[tubeR + 19, 91, 2, 1, '#f2c200'],
	)
	// Cables, from the cabinets up to the emitter.
	r.push(
		[6, 30, 2, 12, '#2b3036'],
		[6, 28, 20, 2, '#2b3036'],
		[RAY_W - 8, 26, 2, 16, '#c8323a'],
		[RAY_W - 28, 24, 20, 2, '#c8323a'],
	)
	// Inside the glass tube, lit up behind whoever's in it.
	r.push(
		[tubeL, tubeTop, TUBE_HALF * 2, TUBE_TALL, TUBE_IN],
		[tubeL, tubeTop, 4, TUBE_TALL, '#cdeff5'],
		[tubeR - 4, tubeTop, 4, TUBE_TALL, '#cdeff5'],
		// Faint rings of the field, round the plate.
		[tubeL + 4, PLATE_Y - 10, TUBE_HALF * 2 - 8, 1, '#c6f0f8'],
		[tubeL + 4, PLATE_Y - 24, TUBE_HALF * 2 - 8, 1, '#d0f2f8'],
	)
	// The arm the emitter hangs off, over the top, and the emitter itself:
	// a brass-ringed barrel, pointing down at the plate, its lens glowing.
	r.push(
		[16, 18, RAY_W - 32, 6, RAY_BODY],
		[16, 18, RAY_W - 32, 2, RAY_LIT],
		[16, 24, 6, 18, RAY_BODY],
		[RAY_W - 22, 24, 6, 18, RAY_BODY],
		[PLATE_X - 14, 2, 28, 18, RAY_BODY],
		[PLATE_X - 14, 2, 28, 2, RAY_LIT],
		[PLATE_X - 14, 2, 2, 18, RAY_LIT],
		[PLATE_X + 12, 2, 2, 18, RAY_DARK],
		[PLATE_X - 10, 20, 20, 8, RAY_DARK],
		[PLATE_X - 12, 26, 24, 3, BRASS],
		[PLATE_X - 12, 26, 24, 1, BRASS_LIT],
		[PLATE_X - 8, 29, 16, 4, RAY_DARK],
		[PLATE_X - 10, 33, 20, 3, BRASS],
		[PLATE_X - 10, 33, 20, 1, BRASS_LIT],
		// Its lens, glowing.
		[PLATE_X - 7, 36, 14, 4, RAY_GLOW_DEEP],
		[PLATE_X - 5, 36, 10, 3, RAY_GLOW],
		[PLATE_X - 3, 36, 3, 1, '#ffffff'],
		// Fins down its barrel.
		[PLATE_X - 8, 6, 2, 12, RAY_DARK],
		[PLATE_X - 2, 6, 2, 12, RAY_DARK],
		[PLATE_X + 4, 6, 2, 12, RAY_DARK],
		// A warning stripe across the arm.
		...Array.from(
			{ length: 8 },
			(_, k): PixelRect => [22 + k * 4, 20, 2, 2, k % 2 ? INK : '#f2c200'],
		),
		...Array.from(
			{ length: 8 },
			(_, k): PixelRect => [
				RAY_W - 54 + k * 4,
				20,
				2,
				2,
				k % 2 ? INK : '#f2c200',
			],
		),
	)
	// The tube's top cap, over the glass, under the emitter's lens.
	r.push(
		[tubeL - 4, tubeTop - 4, TUBE_HALF * 2 + 8, 4, STEEL],
		[tubeL - 4, tubeTop - 4, TUBE_HALF * 2 + 8, 1, STEEL_LIT],
		[PLATE_X - 6, tubeTop - 4, 12, 4, RAY_GLOW_DEEP],
	)
	// The plate: a disc, pale as a bench, specks on it; its base under it.
	r.push(
		[tubeL - 4, PLATE_Y - 2, TUBE_HALF * 2 + 8, 2, PLATE_TOP],
		[tubeL - 4, PLATE_Y, TUBE_HALF * 2 + 8, 1, PLATE_EDGE],
		[tubeL - 4, PLATE_Y + 1, TUBE_HALF * 2 + 8, 3, PLATE_TOP],
		[tubeL - 4, PLATE_Y + 4, TUBE_HALF * 2 + 8, 2, WHITE_SHADE],
		[PLATE_X - 9, PLATE_Y - 2, 1, 1, PLATE_SPECK],
		[PLATE_X + 5, PLATE_Y - 1, 1, 1, PLATE_SPECK],
		[PLATE_X - 2, PLATE_Y + 2, 1, 1, PLATE_SPECK],
		[PLATE_X + 13, PLATE_Y + 2, 1, 1, PLATE_SPECK],
		// The machine's base, along the floor.
		[2, PLATE_Y + 2, tubeL - 6, 4, RAY_DARK],
		[tubeR + 4, PLATE_Y + 2, RAY_W - tubeR - 6, 4, RAY_DARK],
	)
	return pixelArt(RAY_W, RAY_H, r)
}

/**
 * The shrink ray's glass tube, in front of whoever's in it: its rims, top
 * and bottom, steel, its glass only a few glints and its edges catching
 * the light, so they're seen in there; a label, SHRINK. 64 by 60, its
 * plate where the back's is.
 */
const FRONT_W = 64
const FRONT_H = 60
function shrinkRayFront() {
	const px = FRONT_W / 2
	const py = FRONT_H - (RAY_H - PLATE_Y)
	const l = px - TUBE_HALF
	const top = py - TUBE_TALL
	return pixelArt(FRONT_W, FRONT_H, [
		// The glass's edges, and glints down it.
		[l, top, 2, TUBE_TALL, 'rgba(220, 246, 255, 0.55)'],
		[l + TUBE_HALF * 2 - 2, top, 2, TUBE_TALL, 'rgba(220, 246, 255, 0.55)'],
		[l + 5, top + 4, 2, 14, 'rgba(255, 255, 255, 0.8)'],
		[l + 8, top + 6, 1, 6, 'rgba(255, 255, 255, 0.7)'],
		[l + TUBE_HALF * 2 - 8, top + 22, 1, 10, 'rgba(255, 255, 255, 0.6)'],
		// Its top rim, steel.
		[l - 4, top - 4, TUBE_HALF * 2 + 8, 4, STEEL],
		[l - 4, top - 4, TUBE_HALF * 2 + 8, 1, STEEL_LIT],
		[l - 4, top - 1, TUBE_HALF * 2 + 8, 1, STEEL_DARK],
		// Its bottom rim, under the plate, steel, its edge lit cyan; but
		// in the middle, under where they're shrunk to, the plate's own
		// pale edge, as pale as the bench they'll be on.
		[l - 4, py + 1, TUBE_HALF * 2 + 8, 1, RAY_GLOW_DEEP],
		[l - 4, py + 2, TUBE_HALF * 2 + 8, 3, STEEL],
		[l - 4, py + 5, TUBE_HALF * 2 + 8, 1, STEEL_DARK],
		[px - 14, py + 1, 28, 1, PLATE_EDGE],
		[px - 14, py + 2, 28, 3, PLATE_TOP],
		[px - 14, py + 5, 28, 1, WHITE_SHADE],
		// A brass plate on its rim, off to one side.
		[px + 16, py + 2, 8, 3, BRASS],
		[px + 16, py + 2, 8, 1, BRASS_LIT],
	])
}

/**
 * The shrink ray, in world pixels, its plate's middle, where they're
 * shrunk to, `plate` across and down from its top left: behind whoever's
 * in it, its body, the ray over the plate, its control panel; and in front
 * of them, its glass tube's front.
 */
export const SHRINK_RAY_BACK = {
	asset: shrinkRayBack(),
	width: RAY_W * 2,
	height: RAY_H * 2,
	plate: { x: PLATE_X * 2, y: PLATE_Y * 2 },
}
export const SHRINK_RAY_FRONT = {
	asset: shrinkRayFront(),
	width: FRONT_W * 2,
	height: FRONT_H * 2,
	plate: { x: (FRONT_W / 2) * 2, y: (FRONT_H - (RAY_H - PLATE_Y)) * 2 },
}

// --- In the way ------------------------------------------------------------

/**
 * A drip stand, on its wheels, a bag of saline hung on it: jumped as a
 * rock. World pixels.
 */
export const IV_STAND = {
	asset: pixelArt(16, 30, [
		// The bag, and its line.
		[9, 0, 6, 8, 'rgba(210, 236, 250, 0.9)'],
		[9, 0, 6, 1, '#ffffff'],
		[10, 4, 4, 3, '#bfe6ff'],
		[11, 8, 1, 10, '#bfe6ff'],
		// The pole, and its hook.
		[6, 0, 2, 26, STEEL],
		[6, 0, 9, 1, STEEL],
		[6, 0, 1, 26, STEEL_LIT],
		// Its wheeled feet.
		[1, 26, 14, 2, STEEL_DARK],
		[0, 28, 3, 2, INK],
		[13, 28, 3, 2, INK],
		[6, 28, 3, 2, INK],
	]),
	width: 32,
	height: 60,
}

/** A yellow wet floor sign, a figure slipping on it: jumped as a rock. World pixels. */
export const WET_FLOOR = {
	asset: pixelArt(14, 20, [
		[5, 0, 4, 2, '#f2c200'],
		[4, 2, 6, 4, '#f2c200'],
		[3, 6, 8, 6, '#f2c200'],
		[2, 12, 10, 6, '#f2c200'],
		[5, 0, 2, 2, '#fbe878'],
		[11, 12, 1, 6, '#c9a000'],
		// The figure, slipping.
		[6, 5, 2, 2, INK],
		[5, 7, 3, 1, INK],
		[6, 8, 2, 2, INK],
		[4, 10, 2, 1, INK],
		[8, 10, 3, 1, INK],
		[4, 13, 6, 1, '#4fa0e0'],
		// Its feet.
		[1, 18, 4, 2, '#c9a000'],
		[9, 18, 4, 2, '#c9a000'],
	]),
	width: 28,
	height: 40,
}

/**
 * A hospital bed on wheels, its porter pushing it towards you: a cyclist's
 * job, in a hospital's corridors. Two frames, facing left, world pixels.
 */
export const GURNEY = (() => {
	const W = 40
	const H = 26
	const frame = (step: number) => {
		const r: PixelRect[] = [
			// The patient: a head on the pillow, at the front, a blanket.
			[2, 8, 8, 3, '#ffffff'],
			[3, 5, 5, 4, SKIN],
			[3, 4, 5, 2, '#b07a3a'],
			[4, 7, 1, 1, INK],
			[8, 7, 18, 4, '#7fb6e0'],
			[8, 7, 18, 1, '#a8d2f0'],
			[16, 6, 4, 2, '#7fb6e0'],
			// The bed: mattress, frame, rails.
			[0, 11, 28, 2, '#e6ecef'],
			[0, 13, 28, 2, STEEL],
			[0, 9, 1, 4, STEEL_DARK],
			[27, 8, 1, 5, STEEL_DARK],
			[3, 15, 2, 7, STEEL_DARK],
			[23, 15, 2, 7, STEEL_DARK],
			// Its wheels, turning.
			[1, 22, 5, 4, INK],
			[21, 22, 5, 4, INK],
			[step ? 2 : 4, 23, 1, 2, STEEL],
			[step ? 24 : 22, 23, 1, 2, STEEL],
			// The porter, in green scrubs, pushing it, leaning in.
			[31, 2, 6, 6, SKIN],
			[31, 1, 6, 2, '#3a2a22'],
			[31, 4, 1, 1, INK],
			[30, 8, 7, 9, '#4fae7a'],
			[30, 8, 7, 1, '#6fce9a'],
			[27, 10, 4, 2, '#4fae7a'],
			[26, 10, 2, 2, SKIN],
			[32, 10, 1, 4, '#3f8e62'],
		]
		// Legs, striding.
		if (step)
			r.push(
				[30, 17, 3, 7, '#3f8e62'],
				[34, 17, 3, 7, '#4fae7a'],
				[29, 24, 4, 2, SHOE],
				[35, 24, 4, 2, SHOE],
			)
		else
			r.push(
				[31, 17, 3, 7, '#4fae7a'],
				[33, 17, 3, 7, '#3f8e62'],
				[31, 24, 4, 2, SHOE],
				[32, 24, 4, 2, SHOE],
			)
		return pixelArt(W, H, r)
	}
	return {
		frames: [frame(0), frame(1)] as [string, string],
		width: W * 2,
		height: H * 2,
	}
})()
