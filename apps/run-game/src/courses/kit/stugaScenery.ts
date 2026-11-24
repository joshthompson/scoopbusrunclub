import { type PixelRect, paintedArt, pixelArt } from './pixelArt'

/**
 * Fika Defence's garden: a summer's afternoon on an island out in the
 * Stockholm archipelago, a lawn running down to the sea in front of a
 * red stuga. Its pieces, drawn a cell a pixel, scaled up 2: the stuga,
 * falu red with white corners; a flagpole and the Swedish flag, flying;
 * a birch in full leaf; a midsummer pole, dressed in leaves and flowers;
 * a lilac in bloom; a sailboat out on the water; wildflowers along the
 * front; and the two garden tables, a gingham cloth each in its team's
 * colour, for the fika to be laid out on.
 */

const CELL = 2
const INK = '#1d1d1d'

/** A number from a place, the same every time: for leaves, and flowers. */
const hash = (x: number, y: number) => {
	let h = Math.imul(
		Math.floor(x) * 374761393 + Math.floor(y) * 668265263,
		1274126177,
	)
	h ^= h >>> 13
	return ((h >>> 0) % 1000) / 1000
}

// --- The lawn, the path and the sky --------------------------------------------

export const STUGA_SKY_TOP = '#5fb4ea'
export const STUGA_SKY_BOTTOM = '#cfeaf8'
export const STUGA_GRASS = '#74b84e'
export const STUGA_GRASS_SHADE = '#5e9e3e'
/** A gravel garden path, pale and warm. */
export const STUGA_PATH = '#d8ccae'
export const STUGA_PATH_SHADE = '#bcae8e'

// --- The stuga ---------------------------------------------------------------------

/** The stuga: 100 by 72 cells. */
export const STUGA_WIDTH = 100 * CELL
export const STUGA_HEIGHT = 72 * CELL

const FALU = '#a3301f'
const FALU_SHADE = '#88271a'
const FALU_DARK = '#6a1d13'
const TRIM = '#f4f0e6'
const TRIM_SHADE = '#d4cfc2'
const ROOF = '#3e3c42'
const ROOF_LINE = '#2e2c32'
const ROOF_LIT = '#58555d'
const GLASS = '#2f4558'
const GLASS_LIT = '#9cc3dc'
const DOOR = '#4f6f63'
const DOOR_SHADE = '#3c584e'
const STONE = '#8e8a84'
const STONE_LIT = '#aba69e'
const BOX = '#3f7a3a'
const PELARGON = '#e0453c'

/** A window, its top left at `x`, `y`: white frame, four panes, the sky in them, and a box of red pelargoniums under it. */
const stugaWindow = (x: number, y: number): PixelRect[] => [
	[x, y, 14, 18, TRIM],
	[x + 2, y + 2, 10, 14, GLASS],
	// Its glazing bars, a cross.
	[x + 6, y + 2, 2, 14, TRIM],
	[x + 2, y + 8, 10, 2, TRIM],
	// The sky, catching in it.
	[x + 2, y + 2, 2, 2, GLASS_LIT],
	[x + 4, y + 2, 1, 1, GLASS_LIT],
	[x + 8, y + 10, 2, 2, GLASS_LIT],
	[x + 10, y + 10, 1, 1, GLASS_LIT],
	// Its sill, shaded under.
	[x - 1, y + 18, 16, 1, TRIM],
	[x - 1, y + 19, 16, 1, TRIM_SHADE],
	// The window box, and the pelargoniums in it.
	[x, y + 20, 14, 3, BOX],
	[x, y + 22, 14, 1, '#2f5e2c'],
	[x + 1, y + 18, 2, 2, PELARGON],
	[x + 5, y + 17, 2, 2, PELARGON],
	[x + 9, y + 18, 2, 2, PELARGON],
	[x + 12, y + 17, 1, 2, PELARGON],
	[x + 3, y + 19, 2, 1, '#4f9a44'],
	[x + 7, y + 19, 2, 1, '#4f9a44'],
]

/**
 * A red stuga, side on: falu red board walls, white corner boards and
 * window frames, a dark tiled roof with white barge boards along its
 * gables and a white chimney, a green door up a stone step, and window
 * boxes of red pelargoniums. The real thing, all over the archipelago.
 */
export const STUGA = pixelArt(100, 72, [
	// The chimney, behind the roof's ridge.
	[67, 0, 7, 9, TRIM],
	[72, 0, 2, 9, TRIM_SHADE],
	[66, 0, 9, 2, ROOF_LINE],
	// The roof: from its ridge out to its eaves, wider at the bottom, its
	// gables' barge boards white along the ends.
	...Array.from({ length: 19 }, (_, i): PixelRect[] => {
		const y = 4 + i
		const out = Math.floor(i / 3)
		const left = 8 - out
		const right = 92 + out
		const tone = i === 0 ? ROOF_LIT : i % 3 === 2 ? ROOF_LINE : ROOF
		return [
			[left, y, right - left, 1, tone],
			[left - 1, y, 2, 1, TRIM],
			[right - 1, y, 2, 1, TRIM],
		]
	}).flat(),
	// The walls: boards, each with a shaded edge, in the eaves' shadow at the top.
	[6, 23, 88, 43, FALU],
	...Array.from(
		{ length: 22 },
		(_, i): PixelRect => [9 + i * 4, 23, 1, 43, FALU_SHADE],
	),
	[6, 23, 88, 2, FALU_DARK],
	// The corner boards.
	[6, 23, 3, 43, TRIM],
	[91, 23, 3, 43, TRIM],
	[8, 23, 1, 43, TRIM_SHADE],
	[93, 23, 1, 43, TRIM_SHADE],
	// The windows.
	...stugaWindow(17, 30),
	...stugaWindow(67, 30),
	// The door, in its frame, a little window up in it, its handle.
	[41, 32, 16, 34, TRIM],
	[43, 34, 12, 32, DOOR],
	[53, 34, 2, 32, DOOR_SHADE],
	[45, 37, 8, 6, GLASS],
	[45, 37, 2, 2, GLASS_LIT],
	[47, 46, 4, 8, DOOR_SHADE],
	[45, 56, 8, 1, DOOR_SHADE],
	[51, 50, 2, 1, '#d8c070'],
	// A lamp by it.
	[37, 36, 2, 4, INK],
	[36, 38, 4, 1, INK],
	[37, 40, 2, 2, '#ffe9a0'],
	// The foundation, stones, and the step up to the door.
	[4, 66, 92, 6, STONE],
	...Array.from(
		{ length: 11 },
		(_, i): PixelRect => [6 + i * 8 + (i % 2) * 2, 66, 6, 1, STONE_LIT],
	),
	...Array.from(
		{ length: 11 },
		(_, i): PixelRect => [4 + i * 8 + (i % 2 ? 0 : 3), 69, 5, 1, STONE_LIT],
	),
	[39, 64, 20, 4, STONE_LIT],
	[39, 67, 20, 1, STONE],
])

// --- The flagpole -----------------------------------------------------------------

/** The flagpole: 6 by 130 cells, its foot the bottom middle. */
export const FLAGPOLE_WIDTH = 6 * CELL
export const FLAGPOLE_HEIGHT = 130 * CELL

/** A white flagpole, its gold knob on top, the halyard down it, and a little white base. */
export const FLAGPOLE = pixelArt(6, 130, [
	[2, 4, 2, 124, '#f4f4f0'],
	[3, 4, 1, 124, '#cfcfca'],
	[1, 0, 4, 4, '#e0b030'],
	[1, 0, 2, 1, '#f6d870'],
	[3, 3, 2, 1, '#b88a20'],
	[1, 6, 1, 90, '#9a968e'],
	[0, 124, 6, 6, '#e6e4de'],
	[0, 128, 6, 2, '#bebbb4'],
])

/** The flag: 26 by 19 cells, its hoist the left edge, frames of it flying. */
export const FLAG_WIDTH = 26 * CELL
export const FLAG_HEIGHT = 19 * CELL

const BLUE = '#1d5fae'
const BLUE_SHADE = '#164a8a'
const YELLOW = '#f8c400'
const YELLOW_SHADE = '#cf9e00'

/**
 * The Swedish flag, flying: blue, its yellow cross set nearer the hoist,
 * rippling, more the further from the pole, darker where it falls away.
 */
const flag = (phase: number) =>
	paintedArt(26, 19, (x, y) => {
		const col = Math.floor(x)
		const amp = 0.2 + col * 0.045
		const wave = (c: number) => Math.sin(c * 0.3 - phase) * amp
		const off = Math.round(wave(col))
		const v = Math.floor(y) - 1 - off
		if (v < 0 || v >= 16) return undefined
		const falling = wave(col + 1) - wave(col) > 0.1
		const cross = (col >= 8 && col <= 11) || (v >= 6 && v <= 9)
		if (cross) return falling ? YELLOW_SHADE : YELLOW
		return falling ? BLUE_SHADE : BLUE
	})
export const FLAG = [0, 1, 2, 3].map((k) => flag((k * Math.PI) / 2))

// --- The birch ----------------------------------------------------------------------

/** A birch: 60 by 132 cells, its foot the bottom middle. */
export const BIRCH_WIDTH = 60 * CELL
export const BIRCH_HEIGHT = 132 * CELL

const LEAF = '#79b84a'
const LEAF_LIT = '#a2d064'
const LEAF_SHADE = '#5a9438'
const LEAF_DARK = '#477a2e'
const BARK = '#efeae0'
const BARK_SHADE = '#c9c2b4'
const BARK_MARK = '#2b2722'

/** The birch's crown: clumps of leaves, [across, down, how big], drawn back to front, the lowest hanging, smaller. */
const BIRCH_CLUMPS: [number, number, number][] = [
	[30, 13, 12],
	[18, 24, 12],
	[42, 23, 12],
	[30, 30, 15],
	[11, 40, 10],
	[49, 40, 9],
	[22, 45, 13],
	[39, 46, 13],
	[30, 57, 10],
	[14, 58, 7],
	[46, 59, 7],
	[20, 67, 5],
	[40, 68, 5],
]

/**
 * A silver birch in full summer leaf: its tall white trunk marked black,
 * a branch or two up into its crown, and the crown in light, airy clumps,
 * each lit on top and shaded under, the lowest hanging down smaller.
 */
export const BIRCH = paintedArt(60, 132, (x, y) => {
	// The trunk, leaning a little, thinner up it, behind the leaves.
	const lean = (132 - y) * 0.03
	const half = 2 + (y / 132) * 1.5
	const mid = 27 + lean
	let trunk: string | undefined
	if (y > 18 && Math.abs(x - mid) < half) {
		const mark = hash(Math.floor(y / 2), 7) < 0.22 && x < mid + 0.5 && y > 24
		trunk = mark ? BARK_MARK : x > mid + half - 1 ? BARK_SHADE : BARK
	}
	// A branch or two off it, up into the crown.
	if (y > 40 && y < 64 && Math.abs(x - (mid + (64 - y) * 0.6)) < 0.8)
		trunk = BARK_SHADE
	if (y > 44 && y < 62 && Math.abs(x - (mid - (62 - y) * 0.5)) < 0.8)
		trunk = BARK_SHADE
	// The clump nearest the front that this is in, and where in it.
	let colour: string | undefined
	for (const [cx, cy, r] of BIRCH_CLUMPS) {
		const dx = x - cx
		const dy = y - cy
		const ragged = r - hash(Math.floor(x / 2), Math.floor(y / 2)) * 1.8
		if (dx * dx + dy * dy > ragged * ragged) continue
		const n = hash(Math.floor(x / 3) + cx, Math.floor(y / 3) + cy)
		colour =
			dy < -r * 0.45 && dx < r * 0.4
				? LEAF_LIT
				: dy > r * 0.45 || dx > r * 0.6
					? n < 0.3
						? LEAF_DARK
						: LEAF_SHADE
					: n < 0.15
						? LEAF_LIT
						: LEAF
	}
	return colour ?? trunk
})

// --- The midsummer pole -------------------------------------------------------------

/** The midsummer pole: 40 by 92 cells, its foot the bottom middle. */
export const MAYPOLE_WIDTH = 40 * CELL
export const MAYPOLE_HEIGHT = 92 * CELL

const POLE_LEAF = '#4f8a3a'
const POLE_LEAF_LIT = '#6aa84c'
const POLE_LEAF_SHADE = '#3a6c2c'
const FLOWERS = ['#f6f2ea', '#f2c94c', '#6a8ee8', '#e46a8a']

/**
 * A midsommarstång, left up from midsummer: a tall pole bound in birch
 * leaves, a crossbar near the top, a leafy ring hanging from each end of
 * it, and flowers tucked in all over, blue and yellow ribbons fluttering
 * off the rings.
 */
export const MAYPOLE = paintedArt(40, 92, (x, y) => {
	const cx = Math.floor(x)
	const cy = Math.floor(y)
	const leafy = (lit: boolean) => {
		const n = hash(cx, cy)
		if (n < 0.08) return FLOWERS[Math.floor(hash(cy, cx) * FLOWERS.length)]
		return lit ? POLE_LEAF_LIT : n < 0.35 ? POLE_LEAF_SHADE : POLE_LEAF
	}
	// The rings, hanging off the bar's ends: round, leafy, ribbons off them.
	for (const rx of [6, 33]) {
		const d = Math.hypot(x - rx - 0.5, y - 26)
		if (d > 4 && d < 7) return leafy(y < 23)
		// Ribbons, off the bottom of each.
		const ribbon = rx === 6 ? '#2f6cc0' : '#f2c400'
		if (cx === rx - 2 + (rx === 6 ? 0 : 3) && cy > 31 && cy < 44) return ribbon
		if (cx === rx + 2 - (rx === 6 ? 0 : 3) && cy > 31 && cy < 40)
			return rx === 6 ? '#f2c400' : '#2f6cc0'
	}
	// Its top, a little tuft.
	if (cy < 4 && Math.abs(x - 20) < 2 + cy * 0.5) return leafy(cy < 2)
	// The crossbar, and the hooks the rings hang from.
	if (cy >= 12 && cy < 16 && cx >= 4 && cx < 36) return leafy(cy === 12)
	if ((cx === 6 || cx === 33) && cy >= 16 && cy < 20) return POLE_LEAF_SHADE
	// The pole, bound in leaves all the way down.
	if (Math.abs(x - 20) < 2.5) return leafy(x < 20)
	return undefined
})

// --- The lilac ---------------------------------------------------------------------

/** A lilac bush: 36 by 28 cells, its foot the bottom middle. */
export const LILAC_WIDTH = 36 * CELL
export const LILAC_HEIGHT = 28 * CELL

/** A lilac, syren, in flower: a mound of leaves, cones of purple and white blossom stuck up all over it. */
export const LILAC = paintedArt(36, 28, (x, y) => {
	const dx = (x - 18) / 17
	const dy = (y - 28) / 24
	const n = hash(Math.floor(x / 2), Math.floor(y / 2))
	// The blossom: cones, pointing up, here and there over the top.
	for (const [bx, by, white] of [
		[6, 10, 0],
		[13, 5, 0],
		[20, 7, 1],
		[27, 9, 0],
		[10, 16, 1],
		[24, 15, 0],
		[31, 17, 0],
	] as const) {
		const up = by + 7 - y
		if (up >= 0 && up < 8 && Math.abs(x - bx) < (8 - up) / 3 + 0.5) {
			const lit = x < bx
			return white
				? lit
					? '#fbf6ff'
					: '#ddd2ea'
				: lit
					? '#c79ae0'
					: n < 0.5
						? '#9e6cc0'
						: '#b282d2'
		}
	}
	if (dx * dx + dy * dy > 1 - n * 0.12) return undefined
	return y < 14 && n > 0.4 ? LEAF : n < 0.4 ? LEAF_DARK : LEAF_SHADE
})

// --- The sailboat ------------------------------------------------------------------

/** A sailboat, far off: 14 by 16 cells, its waterline the bottom. */
export const SAILBOAT_WIDTH = 14 * CELL
export const SAILBOAT_HEIGHT = 16 * CELL

/** A little sailing boat out on the water, its mainsail and jib white, its hull white with a blue stripe. */
export const SAILBOAT = paintedArt(14, 16, (x, y) => {
	const cx = Math.floor(x)
	const cy = Math.floor(y)
	if (cy >= 12) {
		const inset = cy - 12
		if (cx < 1 + inset || cx > 12 - inset) return undefined
		return cy === 13 ? '#2f5f9e' : cy === 15 ? '#c9cdd0' : '#f6f6f2'
	}
	if (cx === 7) return '#6b5a48'
	// The mainsail, behind the mast; the jib, in front.
	if (cx > 7 && cx - 7 <= (cy * 5) / 12) return cy > 9 ? '#e2e2dc' : '#fbfbf6'
	if (cx < 7 && 7 - cx <= ((cy - 2) * 5) / 10 && cy > 1) return '#eeeee8'
	return undefined
})

// --- Wildflowers -------------------------------------------------------------------

/** A tuft of wildflowers: 12 by 10 cells, its foot the bottom middle. */
export const WILDFLOWERS_WIDTH = 12 * CELL
export const WILDFLOWERS_HEIGHT = 10 * CELL

/**
 * A tuft of long grass and summer wildflowers, as along the edge of a
 * Swedish lawn: ox-eye daisies, cornflowers, buttercups, red clover. In a
 * few mixes, `kind` 0 to 2.
 */
const wildflowers = (kind: number) =>
	pixelArt(12, 10, [
		// The grass, blades of it, a lighter and a darker green.
		[1, 5, 1, 5, '#5e9e3e'],
		[3, 3, 1, 7, '#4f8a34'],
		[5, 6, 1, 4, '#74b84e'],
		[7, 2, 1, 8, '#5e9e3e'],
		[9, 4, 1, 6, '#4f8a34'],
		[10, 6, 1, 4, '#74b84e'],
		[2, 7, 1, 3, '#74b84e'],
		...(
			[
				// Daisies and a cornflower.
				[
					[2, 2, '#f8f6ee', '#f2c94c'],
					[7, 0, '#5e7ee0', '#3f5cc0'],
					[9, 3, '#f8f6ee', '#f2c94c'],
				],
				// Buttercups and clover.
				[
					[3, 1, '#f2d230', '#c8a418'],
					[6, 4, '#d8507a', '#b03a60'],
					[9, 2, '#f2d230', '#c8a418'],
				],
				// A cornflower, a daisy, clover.
				[
					[2, 3, '#5e7ee0', '#3f5cc0'],
					[6, 1, '#f8f6ee', '#f2c94c'],
					[10, 4, '#d8507a', '#b03a60'],
				],
			] as [number, number, string, string][][]
		)[kind % 3].flatMap(([fx, fy, petal, middle]): PixelRect[] => [
			[fx - 1, fy, 3, 1, petal],
			[fx, fy - 1, 1, 3, petal],
			[fx, fy, 1, 1, middle],
		]),
	])
export const WILDFLOWERS = [0, 1, 2].map(wildflowers)

// --- The fika tables ----------------------------------------------------------------

/** A table: 104 by 22 cells, its top the top, its legs down to the ground. */
export const TABLE_WIDTH = 104 * CELL
export const TABLE_HEIGHT = 22 * CELL

/** Each team's tablecloth, gingham: their colour, a tint of it, and white. */
const CLOTHS = [
	{ full: '#c8382f', tint: '#ea9a90', white: '#f8f2ea', hem: '#962820' },
	{ full: '#3459c4', tint: '#9cb0ea', white: '#f2f4fa', hem: '#243f94' },
]
const TABLE_WOOD = '#e8e2d4'
const TABLE_WOOD_SHADE = '#bdb5a2'

/**
 * A garden table under a gingham cloth in team `team`'s colour, red or
 * blue: its top, the cloth hanging down over its edge in a scalloped hem,
 * and its painted wooden legs, a bar between them, under it.
 */
const table = (team: number) => {
	const cloth = CLOTHS[team]
	return paintedArt(104, 22, (x, y) => {
		const cx = Math.floor(x)
		const cy = Math.floor(y)
		// The legs, and the bar between each end's pair, under the cloth.
		const legs = [4, 12, 89, 97]
		if (cy >= 9) {
			if (legs.some((l) => cx >= l && cx < l + 3))
				return legs.some((l) => cx === l + 2) ? TABLE_WOOD_SHADE : TABLE_WOOD
			if (cy === 15 && ((cx > 4 && cx < 14) || (cx > 89 && cx < 99)))
				return TABLE_WOOD_SHADE
			// The hem's scallops, hanging lower between.
			if (cy === 9 && cx % 6 >= 1 && cx % 6 <= 4) return cloth.hem
			return undefined
		}
		// The cloth's top, catching the light.
		if (cy === 0) return cloth.white
		if (cy === 8) return cloth.hem
		// Gingham: stripes each way, where they cross, the full colour.
		const across = Math.floor(cx / 2) % 2 === 0
		const down = Math.floor((cy - 1) / 2) % 2 === 0
		return across && down
			? cloth.full
			: across || down
				? cloth.tint
				: cloth.white
	})
}
export const TABLES = [table(0), table(1)]
