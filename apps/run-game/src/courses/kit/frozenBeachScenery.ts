import {
	type PixelRect,
	letterArt,
	paintedArt,
	pixelArt,
	rectsMarkup,
	svgUrl,
	tile,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * The frozen beach for Beach Volleyball, drawn in code: the warm beach's
 * winter twin, a sea of cold grey-blue with floes on it, snow-dusted sand,
 * two palms under snow, a striped hut, a snowman dressed for the sun and a
 * deckchair with a drift on it. Cells are 2 px, as everywhere; the bands
 * are drawn a cell at a time on a grid, then run together into rects.
 */

const CELL = 2

/** The sky behind it all, top and bottom: overcast, grey-blue down to near white. */
export const FROZEN_SKY_TOP = '#a9b9c6'
export const FROZEN_SKY_BOTTOM = '#e9eff3'

/** The sand the players stand on, snow over it: pale and bluish, in shade, and dark. */
export const FROZEN_SAND = '#e1e8ec'
export const FROZEN_SAND_SHADE = '#c9d5dd'
export const FROZEN_SAND_DARK = '#a3b2be'

/** The sea out at the horizon, under the far band. */
export const FROZEN_SEA_FAR = '#8aa2b3'

/** The sea nearer, deeper, and its foam. */
const SEA = '#6a859a'
const SEA_DEEP = '#587388'
const FOAM = '#e8f0f4'
const HORIZON = '#a7bbc8'

/** Snow and ice, from lit to shaded. */
const SNOW = '#f7fbfd'
const SNOW_SHADE = '#d3e2ea'
const SNOW_DEEP = '#b4c9d6'
const ICE = '#bfe0ee'
const ICE_SHADE = '#8cbcd4'

/** The far headland and its rock. */
const HILL = '#9fb1be'
const HILL_SHADE = '#8799a8'
const ROCK = '#76899a'

const INK = '#2b2722'

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

/** A grid of cells, drawn into a cell at a time, and run together into rects. */
function grid(width: number, height: number) {
	const cells: (string | undefined)[] = new Array(width * height)
	const put = (x: number, y: number, fill: string | undefined) => {
		if (x >= 0 && x < width && y >= 0 && y < height) cells[y * width + x] = fill
	}
	const fill = (x: number, y: number, w: number, h: number, c: string) => {
		for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c)
	}
	/** Its picture, `cell` px a cell, for a band of the backdrop. */
	const url = (cell: number) => {
		// Runs along a row, then a run the same as the one above it grows down.
		const rects: PixelRect[] = []
		const open = new Map<string, PixelRect>()
		for (let y = 0; y < height; y++) {
			let from = 0
			for (let x = 0; x <= width; x++) {
				const here = x < width ? cells[y * width + x] : undefined
				const start = cells[y * width + from]
				if (x === width || here !== start) {
					if (start) {
						const key = `${from},${x - from},${start}`
						const above = open.get(key)
						if (above && above[1] + above[3] === y) above[3]++
						else {
							const run: PixelRect = [from, y, x - from, 1, start]
							rects.push(run)
							open.set(key, run)
						}
					}
					from = x
				}
			}
		}
		return svgUrl(
			width * cell,
			height * cell,
			`<g transform="scale(${cell})">${rectsMarkup(rects)}</g>`,
		)
	}
	return { put, fill, url }
}

type Grid = ReturnType<typeof grid>

/** A small whole number from `random`, `low` to `high` both included. */
const between = (random: () => number, low: number, high: number) =>
	low + Math.floor(random() * (high - low + 1))

// --- The sea ------------------------------------------------------------------------

/**
 * A floe: snow on top, ice to its waterline, then a little underwater part.
 * `width` cells at its widest, its top at `x`, `y`; its rows are 6 tall.
 */
function floe(g: Grid, x: number, y: number, width: number) {
	const insets = [3, 1, 0, 1, 3, 5]
	const colours = [SNOW, SNOW, ICE, ICE_SHADE, ICE_SHADE, SEA_DEEP]
	insets.forEach((inset, row) => {
		const cut = Math.min(inset, Math.floor(width / 4))
		g.fill(x + cut, y + row, width - cut * 2, 1, colours[row])
		if (row === 2 && width > 8) g.fill(x + cut, y + row, 2, 1, SNOW)
	})
}

export const FROZEN_SEA_FAR_WIDTH = 960
export const FROZEN_SEA_FAR_HEIGHT = 160

/** Low hills far off, snow on their tops, rock showing at their feet. */
function hills(g: Grid, x: number, w: number, peak: number, seed: number) {
	const random = seeded(seed)
	let bump = 0
	for (let i = 0; i < w; i++) {
		if (i % 3 === 0) bump = between(random, -1, 1)
		const edge = Math.min(i, w - 1 - i)
		const h = Math.round(
			peak * Math.sin((Math.PI * (i + 0.5)) / w) ** 0.8 +
				2 * Math.sin(i / 4.3) +
				bump,
		)
		const height = Math.max(1, Math.min(h, 1 + Math.floor(edge * 0.6)))
		for (let j = 0; j < height; j++) {
			const y = 60 - j
			let colour = i > w * 0.55 ? HILL_SHADE : HILL
			if (j >= height - 3 && height > 4) colour = SNOW
			else if (j >= height - 5 && height > 6 && (i + j) % 3 !== 0)
				colour = SNOW_SHADE
			g.put(x + i, y, colour)
		}
		if (i % 13 < 4 && height > 3) g.put(x + i, 60, ROCK)
	}
}

/**
 * Far off: flat cold sea from the horizon down, a pale line along the
 * horizon, a headland of low snowy hills to the right and a small one to the
 * left, a few tiny floes and glints. 960 by 160, tiling: nothing crosses an
 * edge.
 */
export const frozenSeaFar = (() => {
	const g = grid(FROZEN_SEA_FAR_WIDTH / CELL, FROZEN_SEA_FAR_HEIGHT / CELL)
	g.fill(0, 60, 480, 20, FROZEN_SEA_FAR)
	g.fill(0, 60, 480, 1, HORIZON)
	hills(g, 300, 130, 17, 9301)
	hills(g, 400, 60, 11, 9302)
	hills(g, 40, 56, 10, 9303)
	// Their reflections, a faint line under the feet.
	g.fill(306, 61, 118, 1, 'rgba(95,119,138,0.55)')
	g.fill(44, 61, 48, 1, 'rgba(95,119,138,0.55)')
	// Tiny floes, a pale slab and its shade.
	for (const [x, y, w] of [
		[130, 65, 7],
		[170, 70, 5],
		[236, 66, 9],
		[270, 72, 6],
		[455, 68, 6],
		[110, 74, 8],
	]) {
		g.fill(x, y, w, 1, SNOW)
		g.fill(x + 1, y + 1, w - 2, 1, ICE_SHADE)
	}
	// Glints on the water, pale dashes that don't touch an edge.
	const random = seeded(9304)
	for (let i = 0; i < 18; i++) {
		const w = between(random, 3, 6)
		g.fill(
			between(random, 2, 480 - w - 2),
			between(random, 64, 77),
			w,
			1,
			'rgba(232,244,250,0.25)',
		)
	}
	return g.url(CELL)
})()

export const FROZEN_SEA_NEAR_WIDTH = 1024
export const FROZEN_SEA_NEAR_HEIGHT = 160

/**
 * Nearer: the sea a shade deeper, grey whitecaps on it, five floes, bigger
 * than the far ones, and along the bottom the sea's frozen crust where it
 * meets the sand, ragged on top. 1024 by 160, tiling: the crest dashes stay
 * clear of the edges and the crust is whole waves across.
 */
export const frozenSeaNear = (() => {
	const g = grid(FROZEN_SEA_NEAR_WIDTH / CELL, FROZEN_SEA_NEAR_HEIGHT / CELL)
	const wide = 512
	g.fill(0, 56, wide, 24, SEA)
	g.fill(0, 56, wide, 1, FROZEN_SEA_FAR)
	// Whitecaps: a trough, a crest over it, a smaller one above.
	const random = seeded(9311)
	for (let i = 0; i < 30; i++) {
		const w = between(random, 6, 12)
		const x = between(random, 2, wide - w - 2)
		const y = between(random, 59, 70)
		g.fill(x, y + 1, w - 2, 1, 'rgba(70,96,116,0.4)')
		g.fill(x, y, w, 1, 'rgba(232,244,250,0.4)')
		g.fill(x + 2, y - 1, Math.max(2, w - 6), 1, 'rgba(232,244,250,0.22)')
	}
	// Floes.
	floe(g, 70, 56, 34)
	floe(g, 190, 62, 20)
	floe(g, 300, 58, 38)
	floe(g, 400, 64, 16)
	floe(g, 462, 59, 26)
	// The frozen edge: a ragged crust of ice over the sea along the bottom.
	for (let x = 0; x < wide; x++) {
		const t = (2 * Math.PI * x) / wide
		const top = Math.round(
			75 +
				1.4 * Math.sin(t * 9) +
				1 * Math.sin(t * 23 + 1) +
				(x % 5 === 0 ? 1 : 0),
		)
		for (let y = top; y < 80; y++) {
			let colour = ICE
			if (y === top) colour = SNOW
			else if (y >= 78) colour = ICE_SHADE
			else if ((x + y) % 7 === 0) colour = SNOW_SHADE
			g.put(x, y, colour)
		}
	}
	return g.url(CELL)
})()

// --- The sand -------------------------------------------------------------------------

/**
 * Snow-dusted sand, all over, a tile of it: patches of snow, bits of damp
 * sand showing through, a few pebbles and a trail of footprints. See-through,
 * over `FROZEN_SAND`: quiet, so the players stay the busiest thing.
 */
export const FROZEN_SAND_TEXTURE = (() => {
	const random = seeded(9320)
	const width = 200
	const height = 80
	const sand = tile(width, height)
	const { rect: put } = sand
	const even = (n: number) => Math.round(n / 2) * 2
	// Bare sand showing through: low patches, grey-tan, with a darker edge under.
	for (let n = 0; n < 7; n++) {
		const x = even(random() * (width - 20))
		const y = even(random() * (height - 8))
		const w = 8 + even(random() * 10)
		put(x + 2, y, w - 4, 2, 'rgba(176,166,146,0.3)')
		put(x, y + 2, w, 2, 'rgba(176,166,146,0.38)')
		put(x + 2, y + 4, w - 4, 2, 'rgba(120,112,100,0.16)')
	}
	// Drifts of snow: a pale lump with a blue shadow under it.
	for (let n = 0; n < 8; n++) {
		const x = even(random() * (width - 20))
		const y = even(random() * (height - 6))
		const w = 8 + even(random() * 12)
		put(x + 2, y, w - 4, 2, 'rgba(255,255,255,0.75)')
		put(x, y + 2, w, 2, 'rgba(255,255,255,0.6)')
		put(x + 2, y + 4, w - 2, 2, 'rgba(120,150,175,0.2)')
	}
	// Flecks of snow.
	for (let n = 0; n < 40; n++)
		put(
			even(random() * width),
			even(random() * height),
			2,
			2,
			random() < 0.6 ? 'rgba(255,255,255,0.7)' : 'rgba(120,150,175,0.22)',
		)
	// A few pebbles, a dark cell with a glint.
	for (let n = 0; n < 4; n++) {
		const x = even(random() * (width - 6))
		const y = even(random() * (height - 4))
		put(x, y + 2, 4, 2, 'rgba(110,118,128,0.7)')
		put(x, y, 2, 2, 'rgba(150,158,166,0.7)')
	}
	// Footprints: a pair of blue-shadowed dents, a step apart, crossing the tile.
	for (let n = 0; n < 5; n++) {
		const x = 36 + n * 14
		const y = 40 + (n % 2) * 6 - n * 2
		put(x, y, 4, 2, 'rgba(110,140,168,0.35)')
		put(x, y + 2, 4, 2, 'rgba(110,140,168,0.28)')
	}
	return sand.pattern('frozen-sand')
})()

// --- Palms ----------------------------------------------------------------------------

const BARK = '#9b6a3b'
const BARK_SHADE = '#6e4528'
const FROST = '#d9e4ea'
const FROST_SHADE = '#a9bfcc'
const FROND = '#3c7a54'
const FROND_LIT = '#5a9a6a'
const FROND_SHADE = '#2a5a44'
const NUT = '#6a4326'
const NUT_LIT = '#8f6038'
const ICICLE = '#cfeaf6'
const ICICLE_SHADE = '#92c4dc'

interface Frond {
	/** Which way it goes, and how many cells out. */
	dir: -1 | 1
	length: number
	/** How high it rises first, and how far it droops by its tip. */
	rise: number
	droop: number
	/** Its thickness at the root. */
	thick?: number
}

interface PalmShape {
	width: number
	height: number
	/** Trunk foot, crown, as cell columns/rows; the trunk curves between. */
	foot: number
	crownX: number
	crownY: number
	/** Cells wide at the base and near the top. */
	baseWidth: number
	topWidth: number
	/** How much the trunk bows (cells, towards the lean). */
	bow: number
	fronds: Frond[]
	/** Where its coconuts hang, relative to the crown. */
	nuts: [number, number][]
}

/**
 * A palm in winter, painted a cell at a time from its trunk's curve and its
 * fronds' arcs as the warm beach's are, then snowed on: snow along the top
 * of every frond, icicles from their undersides, frost on the trunk.
 */
function snowyPalm(shape: PalmShape) {
	const cells: (string | undefined)[][] = Array.from(
		{ length: shape.height },
		() => Array<string | undefined>(shape.width).fill(undefined),
	)
	const put = (x: number, y: number, c: string) => {
		if (x >= 0 && x < shape.width && y >= 0 && y < shape.height) cells[y][x] = c
	}
	const get = (x: number, y: number) =>
		x >= 0 && x < shape.width && y >= 0 && y < shape.height
			? cells[y][x]
			: undefined

	const drawFrond = (f: Frond, lit: boolean) => {
		const thick = f.thick ?? 6
		let last = ''
		for (let s = 0; s <= 160; s++) {
			const t = s / 160
			const x = Math.round(shape.crownX + f.dir * f.length * t)
			const y = Math.round(
				shape.crownY - f.rise * 4 * t * (1 - t) * 0.9 + f.droop * t * t,
			)
			const key = `${x},${y}`
			if (key === last) continue
			last = key
			const th = Math.max(
				2,
				Math.round(thick * (1 - t * 0.6)) + (t > 0.5 ? x % 2 : 0),
			)
			for (let k = 0; k < th; k++) {
				const colour =
					k === 0 && lit
						? FROND_LIT
						: k === th - 1 && th > 2
							? FROND_SHADE
							: FROND
				put(x, y + k, colour)
			}
			if (x % 3 === 0 && t > 0.35) put(x, y + th, FROND_SHADE)
		}
	}

	// Trunk, frosty: pale down its lit side, white at its rings.
	const rows = shape.height - shape.crownY - 1
	for (let y = shape.crownY; y < shape.height; y++) {
		const t = (shape.height - 1 - y) / rows
		const centre =
			shape.foot +
			(shape.crownX - shape.foot) * t +
			shape.bow * Math.sin(Math.PI * t)
		const width = Math.round(
			shape.baseWidth + (shape.topWidth - shape.baseWidth) * t,
		)
		const left = Math.round(centre - width / 2)
		const ring = (shape.height - y) % 4 === 0
		for (let i = 0; i < width; i++) {
			let c = BARK
			if (i === 0) c = (y + i) % 3 === 0 ? BARK : FROST
			else if (i >= width - 1) c = BARK_SHADE
			if (ring) c = i === 0 ? FROST : i >= width - 1 ? FROST_SHADE : FROST
			put(left + i, y, c)
		}
	}
	// A snowy foot: the drift it stands in.
	const footLeft = Math.round(shape.foot - shape.baseWidth / 2)
	for (let i = -2; i < shape.baseWidth + 2; i++) {
		put(footLeft + i, shape.height - 1, SNOW)
		if (i > -1 && i < shape.baseWidth + 1)
			put(footLeft + i, shape.height - 2, i % 3 === 0 ? SNOW_SHADE : SNOW)
	}

	const order = [...shape.fronds].sort((a, b) => b.rise - a.rise)
	order.forEach((f, i) => drawFrond(f, i % 2 === 0 || f.rise > 6))
	for (const [dx, dy] of [
		[-1, 0],
		[0, 0],
		[1, 0],
		[0, -1],
		[-1, 1],
		[0, 1],
	])
		put(shape.crownX + dx, shape.crownY + dy, FROND)
	for (const [dx, dy] of shape.nuts) {
		const nx = shape.crownX + dx
		const ny = shape.crownY + dy
		put(nx, ny, NUT_LIT)
		put(nx + 1, ny, NUT)
		put(nx, ny + 1, NUT)
		put(nx + 1, ny + 1, NUT)
	}

	// Snow on the fronds: every frond cell with nothing above it goes white,
	// and a shaded cell under it, every other column, makes it lie thick.
	const isFrond = (c: string | undefined) =>
		c === FROND || c === FROND_LIT || c === FROND_SHADE
	const tops: [number, number][] = []
	for (let y = 0; y < shape.height; y++)
		for (let x = 0; x < shape.width; x++)
			if (isFrond(cells[y][x]) && !get(x, y - 1)) tops.push([x, y])
	for (const [x, y] of tops) {
		put(x, y, SNOW)
		if (isFrond(get(x, y + 1))) put(x, y + 1, x % 3 === 1 ? SNOW_SHADE : SNOW)
		if (isFrond(get(x, y + 2)) && x % 2 === 0) put(x, y + 2, SNOW_SHADE)
	}
	// Icicles: from the underside of a frond, every fourth column, two or three long.
	for (let x = 0; x < shape.width; x++)
		for (let y = 0; y < shape.height - 1; y++) {
			if (!isFrond(get(x, y)) || get(x, y + 1)) continue
			if (y < shape.crownY - 2 || x % 4 !== 1) continue
			const length = 2 + ((x + y) % 2)
			for (let k = 1; k <= length; k++)
				if (!get(x, y + k)) put(x, y + k, k === length ? ICICLE_SHADE : ICICLE)
		}
	// A cap of snow on each coconut.
	for (const [dx, dy] of shape.nuts) {
		const nx = shape.crownX + dx
		const ny = shape.crownY + dy
		put(nx, ny, SNOW)
	}

	return paintedArt(
		shape.width,
		shape.height,
		(x, y) => cells[Math.floor(y)][Math.floor(x)],
	)
}

export const SNOWY_PALM_TALL_WIDTH = 36 * CELL
export const SNOWY_PALM_TALL_HEIGHT = 96 * CELL

/**
 * `PALM_TALL` in winter: the same curved trunk, frosted pale down its lit
 * side and white at its rings, snow along the top of all seven fronds,
 * icicles hanging from their undersides, snow capping the coconuts and
 * drifted round its foot. 36 by 96 cells, its foot mid-bottom.
 */
export const SNOWY_PALM_TALL = snowyPalm({
	width: 36,
	height: 96,
	foot: 22,
	crownX: 15,
	crownY: 18,
	baseWidth: 6,
	topWidth: 4,
	bow: -3,
	fronds: [
		{ dir: -1, length: 15, rise: 8, droop: 14 },
		{ dir: 1, length: 17, rise: 9, droop: 15 },
		{ dir: -1, length: 11, rise: 13, droop: 8 },
		{ dir: 1, length: 12, rise: 13, droop: 9 },
		{ dir: -1, length: 5, rise: 11, droop: 3 },
		{ dir: 1, length: 6, rise: 12, droop: 4 },
		{ dir: 1, length: 3, rise: 13, droop: 1, thick: 4 },
	],
	nuts: [
		[-3, 3],
		[0, 4],
		[2, 3],
	],
})

export const SNOWY_PALM_SHORT_WIDTH = 40 * CELL
export const SNOWY_PALM_SHORT_HEIGHT = 64 * CELL

/**
 * `PALM_SHORT` in winter: the bowed trunk leaning right, frosted, a round
 * crown of seven fronds with snow lying on them and icicles from their
 * tips. 40 by 64 cells, its foot a little left of the middle.
 */
export const SNOWY_PALM_SHORT = snowyPalm({
	width: 40,
	height: 64,
	foot: 12,
	crownX: 25,
	crownY: 15,
	baseWidth: 7,
	topWidth: 5,
	bow: 4,
	fronds: [
		{ dir: -1, length: 15, rise: 8, droop: 12 },
		{ dir: 1, length: 14, rise: 8, droop: 14 },
		{ dir: -1, length: 9, rise: 12, droop: 7 },
		{ dir: 1, length: 10, rise: 12, droop: 8 },
		{ dir: -1, length: 4, rise: 12, droop: 1 },
		{ dir: 1, length: 4, rise: 12, droop: 1 },
		{ dir: 1, length: 2, rise: 14, droop: 0, thick: 4 },
	],
	nuts: [
		[-2, 4],
		[1, 5],
		[3, 4],
	],
})

// --- The hut --------------------------------------------------------------------------

const HUT_RED = '#d8453a'
const HUT_RED_SHADE = '#a9302b'
const HUT_WHITE = '#f4f1ea'
const HUT_WHITE_SHADE = '#d9d5cc'
const HUT_ROOF = '#2f6fb3'
const HUT_ROOF_SHADE = '#24578e'
const HUT_DOOR = '#3d4a63'
const HUT_DOOR_LIT = '#566480'

export const SNOWY_BEACH_HUT_WIDTH = 34 * CELL
export const SNOWY_BEACH_HUT_HEIGHT = 46 * CELL

/**
 * A little beach hut in red and white stripes, with a blue gabled roof
 * under a thick cap of snow, icicles along its eave, a dark blue door and
 * a drift banked against its right side. 34 by 46 cells, standing on its
 * foot.
 */
export const SNOWY_BEACH_HUT = (() => {
	const rects: PixelRect[] = []
	const fill = (x: number, y: number, w: number, h: number, c: string) =>
		rects.push([x, y, w, h, c])

	// Its walls: stripes four cells wide, shaded down the right-hand side.
	for (let i = 0; i < 7; i++) {
		const red = i % 2 === 0
		fill(3 + i * 4, 21, 4, 23, red ? HUT_RED : HUT_WHITE)
		if (i === 6)
			fill(3 + i * 4 + 2, 21, 2, 23, red ? HUT_RED_SHADE : HUT_WHITE_SHADE)
	}
	// Dark under the eave where the roof shades it.
	fill(3, 21, 28, 2, 'rgba(60,40,50,0.28)')

	// Its door, in the middle, with a knob and a step of snow.
	fill(13, 29, 8, 15, HUT_DOOR)
	fill(13, 29, 2, 15, HUT_DOOR_LIT)
	fill(18, 36, 2, 2, '#f2d36a')
	fill(12, 43, 10, 1, SNOW)

	// Its roof: a gable, one cell wider each side each row, shaded on the right.
	for (let r = 0; r < 15; r++) {
		const half = 2 + r
		fill(17 - half, 4 + r, half, 1, HUT_ROOF)
		fill(17, 4 + r, half, 1, HUT_ROOF_SHADE)
	}
	// An eave board across its foot, wider than the walls.
	fill(0, 19, 34, 2, HUT_ROOF)
	fill(0, 20, 34, 1, HUT_ROOF_SHADE)

	// The gable end is striped like the walls, with snow banked thick along
	// both slopes and over the top.
	for (let r = 0; r < 15; r++) {
		const half = 2 + r
		for (let x = 17 - half; x < 17 + half; x++) {
			const edge = x < 17 - half + 4 || x >= 17 + half - 4
			if (r < 5 || edge) fill(x, 4 + r, 1, 1, SNOW)
			else if (Math.floor((x - 3) / 4) % 2 === 0) fill(x, 4 + r, 1, 1, HUT_RED)
			else fill(x, 4 + r, 1, 1, HUT_WHITE)
		}
		// Shade under the snow's inner edge, and down the right slope.
		if (r >= 5) {
			fill(17 - half + 4, 4 + r, 1, 1, SNOW_SHADE)
			fill(17 + half - 5, 4 + r, 1, 1, SNOW_DEEP)
		}
	}
	// A ridge line of lit snow and a shadow under the cap's right half.
	fill(15, 3, 4, 1, SNOW)
	fill(16, 2, 2, 1, SNOW)
	fill(0, 18, 34, 1, SNOW)
	fill(1, 17, 30, 1, SNOW)

	// Icicles hanging from the eave, over the wall, of different lengths.
	for (const [x, length] of [
		[1, 3],
		[5, 2],
		[8, 4],
		[11, 2],
		[22, 3],
		[25, 5],
		[28, 2],
		[31, 3],
	]) {
		fill(x, 21, 1, length - 1, ICICLE)
		fill(x, 20 + length, 1, 1, ICICLE_SHADE)
	}

	// A drift against its right side, rising to the eave's foot.
	const drift = [2, 3, 4, 5, 5, 6, 7, 8, 8]
	drift.forEach((h, i) => {
		const x = 25 + i
		fill(x, 46 - h, 1, h, SNOW)
		if (h > 3) fill(x, 46 - h + 1, 1, 1, SNOW_SHADE)
		fill(x, 44, 1, 2, SNOW_SHADE)
	})
	// And snow at the foot all along it.
	fill(1, 44, 27, 2, SNOW)
	fill(3, 45, 20, 1, SNOW_SHADE)
	fill(2, 43, 8, 1, SNOW)
	return pixelArt(34, 46, rects)
})()

// --- The snowman ----------------------------------------------------------------------

const MAN_LIT = '#ffffff'
const MAN = '#eaf3f8'
const MAN_SHADE = '#b3c9da'
const MAN_DEEP = '#8ea8bd'
const STRAW = '#e9c46a'
const STRAW_SHADE = '#c49a3e'
const STICK = '#6e4a2a'
const CARROT = '#f08a24'

export const BEACH_SNOWMAN_WIDTH = 18 * CELL
export const BEACH_SNOWMAN_HEIGHT = 28 * CELL

/**
 * A snowman dressed for the beach: a straw sun hat with a red band, dark
 * sunglasses, a carrot nose, a coal smile, a garland of flowers round his
 * neck, and in one twig hand a drink with a little umbrella. Three balls
 * of snow, lit top left, shaded bottom right. 18 by 28 cells.
 */
export const BEACH_SNOWMAN = (() => {
	const cells = new Map<string, string>()
	const put = (x: number, y: number, c: string) => cells.set(`${x},${y}`, c)
	const ball = (cx: number, cy: number, r: number) => {
		for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
			for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
				const dx = x + 0.5 - cx
				const dy = y + 0.5 - cy
				if (dx * dx + dy * dy > r * r) continue
				// How far round towards the light (top left) it is.
				const light = (-dx - dy) / (r * 1.4)
				put(
					x,
					y,
					light > 0.55
						? MAN_LIT
						: light > -0.1
							? MAN
							: light > -0.55
								? MAN_SHADE
								: MAN_DEEP,
				)
			}
	}
	// Three balls of snow, the biggest at the bottom.
	ball(9, 21.5, 6.5)
	ball(9, 13.5, 5)
	ball(9, 7, 4)
	// Arms: a twig out to the right, and one up to the left, holding the drink.
	for (const [x, y] of [
		[13, 12],
		[14, 11],
		[15, 11],
		[16, 10],
		[17, 9],
		[16, 9],
		[5, 13],
		[4, 13],
		[3, 12],
		[2, 12],
		[2, 11],
	])
		put(x, y, STICK)
	// The drink: a glass of orange with a straw and a pink umbrella.
	for (const [x, y, c] of [
		[0, 8, '#e6417c'],
		[1, 7, '#e6417c'],
		[2, 7, '#e6417c'],
		[-1, 9, '#e6417c'],
		[1, 8, '#ffffff'],
		[0, 9, '#ffffff'],
		[0, 10, '#ffa63d'],
		[1, 10, '#ffa63d'],
		[0, 11, '#ffa63d'],
		[1, 11, '#f08a24'],
		[0, 12, '#cfeaf6'],
		[1, 12, '#cfeaf6'],
	] as [number, number, string][])
		put(x, y, c)
	// His face: a sun hat, sunglasses, carrot nose, a smile of coal.
	for (let x = 6; x <= 11; x++) put(x, 1, STRAW)
	for (let x = 6; x <= 11; x++)
		put(x, 2, x === 6 || x === 7 ? STRAW : '#e6417c')
	for (let x = 6; x <= 11; x++) put(x, 2, '#e6417c')
	put(6, 1, '#ffe08a')
	put(7, 0, STRAW)
	put(8, 0, STRAW)
	put(9, 0, STRAW)
	put(10, 0, STRAW)
	for (let x = 2; x <= 15; x++) put(x, 3, x < 9 ? '#ffe08a' : STRAW)
	for (let x = 3; x <= 14; x++) put(x, 4, STRAW_SHADE)
	for (const x of [5, 6, 7, 8, 9, 10, 11, 12]) put(x, 6, INK)
	put(5, 7, '#33415c')
	put(6, 7, '#33415c')
	put(7, 7, '#33415c')
	put(8, 7, INK)
	put(9, 7, '#33415c')
	put(10, 7, '#33415c')
	put(11, 7, '#33415c')
	put(12, 7, '#33415c')
	put(6, 6, '#7a8fb8')
	put(10, 6, '#7a8fb8')
	put(9, 8, CARROT)
	put(10, 8, CARROT)
	put(11, 8, '#c8651a')
	for (const [x, y] of [
		[6, 10],
		[7, 11],
		[8, 11],
		[9, 11],
		[10, 11],
		[11, 10],
	])
		put(x, y, INK)
	// A garland of flowers round his neck, over the join of head and body.
	const flowers = [
		'#e6417c',
		'#ffd35a',
		'#ff8a3d',
		'#ffffff',
		'#e6417c',
		'#ffd35a',
	]
	for (let i = 0; i < 8; i++) {
		const x = 5 + i
		const y = 12 + (i === 0 || i === 7 ? 0 : 1) - 0
		put(x, y, flowers[i % flowers.length])
		if (i % 2 === 0 && i > 0 && i < 7) put(x, y + 1, '#3c9a54')
	}
	// Buttons of coal down his middle.
	put(9, 15, INK)
	put(9, 17, INK)
	// A sprinkle of sunscreen: a white stripe on his nose.
	const rects: PixelRect[] = []
	for (const [key, c] of cells) {
		const [x, y] = key.split(',').map(Number)
		if (x >= 0 && x < 18 && y >= 0 && y < 28) rects.push([x, y, 1, 1, c])
	}
	return pixelArt(18, 28, rects)
})()

// --- The deckchair --------------------------------------------------------------------

export const FROZEN_DECKCHAIR_WIDTH = 20 * CELL
export const FROZEN_DECKCHAIR_HEIGHT = 16 * CELL

/**
 * A deckchair in red and white canvas stripes with a wooden frame, snow
 * capping its back and piled high on its seat. 20 by 16 cells, its feet
 * on the ground.
 */
export const FROZEN_DECKCHAIR = letterArt(
	[
		'..SSS...............',
		'.SSSSs..............',
		'.RRRRW..............',
		'..HHHHW.............',
		'...RRRRW............',
		'....HHHHW...........',
		'.....RRRRW...SS.....',
		'......HHHHW.SSSSs...',
		'.......RRRRSSSSSSs..',
		'........HHHHSSSSSSs.',
		'.........RRHHRRHHRRW',
		'.........wWWWWWWWWWW',
		'.........W.......W.W',
		'........W........W.W',
		'.......W.........W.W',
		'......ww.........w.w',
	],
	{
		S: SNOW,
		s: SNOW_SHADE,
		R: HUT_RED,
		H: HUT_WHITE,
		W: '#a8743f',
		w: '#74492a',
	},
)
