import {
	type PixelRect,
	letterArt,
	pixelArt,
	rectsMarkup,
	svgUrl,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * The sea stack for Mr Claws, drawn in code: a dusky sunset over a northern
 * sea, two bands of water for the horizon with far-off stacks and a low
 * sun, and the stack everyone stands on, a pillar of sandstone strata over
 * basalt columns with a grassy, sea-thrift-pink top. Cells are 2 px, as
 * everywhere; things are drawn a cell at a time on a grid, then run
 * together into rects.
 */

const CELL = 2

/** The sky behind it all, top and bottom: violet to peach. */
export const SEA_STACK_SKY_TOP = '#3d3070'
export const SEA_STACK_SKY_BOTTOM = '#f6b07e'

/** The sea at the horizon, nearer, and its foam (warm, in the last light). */
export const SEA_STACK_SEA_FAR = '#33657e'
export const SEA_STACK_SEA = '#1b5262'
export const SEA_STACK_FOAM = '#f6e4d6'

/** The sun, its rim, and the light it throws on the water. */
const SUN = '#ffdca4'
const SUN_RIM = '#ffb77a'
const GLINT = 'rgba(255,214,160,0.55)'
const GLINT_FAINT = 'rgba(255,214,160,0.22)'
/** Far-off stacks and headland, hazy violet, lit along the sun's side. */
const FAR_ROCK = '#5f4f82'
const FAR_ROCK_LIT = '#8f7098'
const FAR_ROCK_HAZE = '#7a6690'
const FAR_HORIZON = '#e29a86'
const FAR_REFLECTION = '#3c5a7c'

/** Tones of a material, lightest first. */
const GRASS_RAMP = ['#a4cb64', '#76a64c', '#4e7e40', '#6b4636']
const SAND_RAMP = ['#f2c89c', '#dca77c', '#c28762', '#a26752', '#7e4c46']
const BASALT_RAMP = ['#7c769a', '#5d577a', '#454062', '#302c48', '#221f35']
/** The same rock under the sea, which paints over it: darker and bluer. */
const UNDER_RAMP = ['#35496c', '#293b5a', '#202e48', '#172238', '#101829']
const RAMPS = [GRASS_RAMP, SAND_RAMP, BASALT_RAMP, UNDER_RAMP]

/** A colour in its ramp, `by` tones lighter (negative) or darker (positive). */
function tone(colour: string | undefined, by: number) {
	if (!colour) return colour
	for (const ramp of RAMPS) {
		const at = ramp.indexOf(colour)
		if (at >= 0) return ramp[Math.max(0, Math.min(ramp.length - 1, at + by))]
	}
	return colour
}

const THRIFT_LIT = '#ffd0e0'
const THRIFT = '#f27ea9'
const THRIFT_SHADE = '#c85686'
const STEM = '#5f9a47'
const WEED = '#55662f'
const WEED_LIT = '#80903f'
const BARNACLE = '#9a98ae'

/** A grid of cells, drawn into a cell at a time, and run together into rects. */
function grid(width: number, height: number) {
	const cells: (string | undefined)[] = new Array(width * height)
	const put = (x: number, y: number, fill: string | undefined) => {
		if (x >= 0 && x < width && y >= 0 && y < height) cells[y * width + x] = fill
	}
	const get = (x: number, y: number) =>
		x >= 0 && x < width && y >= 0 && y < height
			? cells[y * width + x]
			: undefined
	const fill = (x: number, y: number, w: number, h: number, c: string) => {
		for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c)
	}
	/** A little picture's rows of letters, `.` left alone, its top left at `x`, `y`. */
	const stamp = (
		x: number,
		y: number,
		rows: string[],
		colours: Record<string, string>,
	) =>
		rows.forEach((row, j) =>
			[...row].forEach((letter, i) => {
				if (letter !== '.') put(x + i, y + j, colours[letter])
			}),
		)
	/** Rects for columns `left` to `left + w`: runs along a row, then a run the same as the one above grows down. */
	const rects = (left = 0, w = width) => {
		const out: PixelRect[] = []
		const open = new Map<string, PixelRect>()
		for (let y = 0; y < height; y++) {
			let from = 0
			for (let x = 0; x <= w; x++) {
				const here = x < w ? cells[y * width + left + x] : undefined
				const start = cells[y * width + left + from]
				if (x === w || here !== start) {
					if (start) {
						const key = `${from},${x - from},${start}`
						const above = open.get(key)
						if (above && above[1] + above[3] === y) above[3]++
						else {
							const rect: PixelRect = [from, y, x - from, 1, start]
							out.push(rect)
							open.set(key, rect)
						}
					}
					from = x
				}
			}
		}
		return out
	}
	/**
	 * Its picture, columns `left` to `left + w`: a pixel a cell, for art drawn
	 * at 2 px a cell; or `cell` px a cell, for a band of the backdrop.
	 */
	const url = (cell = 1, left = 0, w = width) => {
		const out = rects(left, w)
		if (cell === 1) return pixelArt(w, height, out)
		return svgUrl(
			w * cell,
			height * cell,
			`<g transform="scale(${cell})">${rectsMarkup(out)}</g>`,
		)
	}
	return { width, height, put, get, fill, stamp, url }
}

type Grid = ReturnType<typeof grid>

/** A small whole number from `random`, `low` to `high` both included. */
const between = (random: () => number, low: number, high: number) =>
	low + Math.floor(random() * (high - low + 1))

// --- The far sea ------------------------------------------------------------------------

export const SEA_STACK_FAR_WIDTH = 960
export const SEA_STACK_FAR_HEIGHT = 160

/** A distant stack, its sun side lit, a ragged top; `arch` cuts a gap through its foot. */
function farStack(
	g: Grid,
	random: () => number,
	x: number,
	w: number,
	top: number,
	arch = false,
) {
	const base = 60
	let inset = 0
	for (let y = top; y < base; y++) {
		const t = (y - top) / (base - top)
		// Narrow at the top, widening as it goes down, a cell or two ragged.
		const want = Math.round((w / 2) * 0.5 * (1 - Math.min(1, t * 3.2)) ** 1.4)
		inset = Math.max(0, want + (random() < 0.3 ? between(random, -1, 1) : 0))
		const left = x + inset
		const span = w - inset * 2
		if (span <= 0) continue
		g.fill(left, y, span, 1, FAR_ROCK)
		g.put(left, y, FAR_ROCK_LIT)
		if (span > 6) g.put(left + 1, y, FAR_ROCK_LIT)
	}
	g.fill(x + 2, top, Math.max(1, w - 6), 1, FAR_ROCK_LIT)
	if (arch)
		for (let y = base - 9; y < base; y++) {
			const span = y > base - 5 ? 7 : 5 + (y - (base - 9)) / 2
			for (let i = 0; i < span; i++)
				g.put(x + Math.floor((w - span) / 2) + i, y, undefined)
		}
	g.fill(x + 2, base + 1, w - 4, 1, FAR_REFLECTION)
	g.fill(x + 4, base + 2, w - 8, 1, FAR_REFLECTION)
}

/** A low headland, rolling, falling away to nothing at both ends. */
function farHeadland(g: Grid, x: number, w: number) {
	for (let i = 0; i < w; i++) {
		const edge = Math.min(i, w - 1 - i)
		const h = Math.min(
			Math.round(7 + 3 * Math.sin(i / 8) + 2 * Math.sin(i / 3.3)),
			1 + Math.floor(edge * 0.4),
		)
		for (let j = 0; j < h; j++) g.put(x + i, 59 - j, FAR_ROCK_HAZE)
		if (h > 1) g.put(x + i, 60 - h, FAR_ROCK)
	}
	g.fill(x + 3, 61, w - 6, 1, FAR_REFLECTION)
}

/**
 * Far off: flat teal sea from the horizon down, a warm line along the
 * horizon, a low sun half sunk into it with a path of glints on the water,
 * streaks of cloud across the sun, a headland and five hazy sea stacks (one
 * with an arch). Its gulls fly, drawn over it (see `draw/mrClaws`). 960 by 160, tiling: nothing crosses an
 * edge.
 */
export const seaStackFar = (() => {
	const g = grid(SEA_STACK_FAR_WIDTH / CELL, SEA_STACK_FAR_HEIGHT / CELL)
	const random = seeded(9411)
	g.fill(0, 60, 480, 20, SEA_STACK_SEA_FAR)
	g.fill(0, 60, 480, 1, FAR_HORIZON)
	// The sun, a halo round it, and a rim.
	for (const [r, fill] of [
		[26, 'rgba(255,190,130,0.16)'],
		[21, 'rgba(255,190,130,0.2)'],
		[15, SUN_RIM],
		[13, SUN],
	] as const)
		for (let y = 60 - r; y < 60; y++)
			for (let x = 150 - r; x <= 150 + r; x++)
				if ((x + 0.5 - 150) ** 2 + (y + 0.5 - 60) ** 2 <= r * r)
					g.put(x, y, fill)
	// Cloud streaks over the sun and either side of it.
	for (const [x, y, w] of [
		[118, 51, 26],
		[138, 55, 34],
		[100, 46, 14],
		[176, 49, 24],
		[60, 36, 30],
		[330, 38, 36],
		[420, 30, 24],
	])
		g.fill(x, y, w, 1, 'rgba(96,66,128,0.6)')
	// The sun's path on the water, wider as it comes down.
	for (let y = 62; y < 79; y += 2) {
		const spread = 6 + (y - 60) * 1.4
		for (let i = 0; i < 3; i++) {
			const w = between(random, 4, 10)
			const x = Math.round(150 + (random() * 2 - 1) * spread - w / 2)
			g.fill(x, y, w, 1, GLINT)
		}
	}
	farHeadland(g, 396, 76)
	farStack(g, random, 40, 14, 38)
	farStack(g, random, 84, 8, 46)
	farStack(g, random, 232, 18, 28)
	farStack(g, random, 268, 9, 42)
	farStack(g, random, 338, 26, 34, true)
	// Glints on the water, pale dashes that don't touch an edge.
	for (let i = 0; i < 14; i++) {
		const w = between(random, 3, 6)
		g.fill(
			between(random, 2, 480 - w - 2),
			between(random, 64, 77),
			w,
			1,
			GLINT_FAINT,
		)
	}
	return g.url(CELL)
})()

// --- The near sea ----------------------------------------------------------------------

export const SEA_STACK_NEAR_WIDTH = 1024
export const SEA_STACK_NEAR_HEIGHT = 160

/**
 * A stack in the near sea: basalt columns, lit left and shaded right,
 * narrowing a little as they rise, a cap of grass, foam at its foot. Its top
 * at `top`, its foot at `base`, `w` cells wide at the bottom.
 */
function nearStack(
	g: Grid,
	random: () => number,
	x: number,
	w: number,
	top: number,
	base: number,
	arch = false,
) {
	for (let y = top; y < base; y++) {
		const t = (y - top) / (base - top)
		const inset = Math.round((w / 2) * 0.35 * (1 - Math.min(1, t * 2.6)) ** 1.6)
		const left = x + inset
		const right = x + w - inset
		for (let i = left; i < right; i++) {
			const p = i - left
			let c = BASALT_RAMP[1]
			// Vertical columns: a lit face, a shaded one, a dark seam between.
			const phase = (i - x) % 7
			if (phase === 0) c = BASALT_RAMP[0]
			else if (phase === 5) c = BASALT_RAMP[2]
			else if (phase === 6) c = BASALT_RAMP[3]
			if (p < 1) c = BASALT_RAMP[0]
			if (right - i <= 2) c = BASALT_RAMP[2]
			g.put(i, y, c)
		}
		if (random() < 0.25) {
			const jx = between(random, left + 2, Math.max(left + 3, right - 3))
			g.put(jx, y, BASALT_RAMP[2])
		}
	}
	// Its grass cap, with a ragged underside.
	const inset0 = Math.round((w / 2) * 0.35)
	for (let i = x + inset0 - 1; i < x + w - inset0 + 1; i++) {
		g.put(i, top - 1, GRASS_RAMP[0])
		g.put(i, top, GRASS_RAMP[1])
		g.put(i, top + 1, GRASS_RAMP[1])
		g.put(i, top + 2 + (random() < 0.5 ? 0 : 1), GRASS_RAMP[2])
	}
	if (arch) {
		const cx = x + Math.floor(w / 2) - 2
		for (let y = base - 10; y < base; y++) {
			const span = y < base - 7 ? 3 + (y - (base - 10)) : 6
			for (let i = 0; i < span; i++)
				g.put(cx + Math.floor((6 - span) / 2) + i, y, undefined)
		}
	}
	// Foam at its foot.
	g.fill(x - 2, base - 1, w + 4, 1, SEA_STACK_FOAM)
	g.fill(x - 4, base, w + 8, 1, 'rgba(246,228,214,0.5)')
}

/** A low rock in the water, lit on top, foam round it. */
function skerry(g: Grid, x: number, w: number, top: number, base: number) {
	for (let y = top; y < base; y++) {
		const t = (y - top + 1) / (base - top)
		const inset = Math.round((w / 2) * (1 - Math.sqrt(t)) * 0.9)
		g.fill(
			x + inset,
			y,
			w - inset * 2,
			1,
			y === top ? BASALT_RAMP[0] : BASALT_RAMP[y - top < 2 ? 1 : 2],
		)
	}
	g.fill(x - 1, base - 1, w + 2, 1, SEA_STACK_FOAM)
}

/**
 * Nearer: sea a shade deeper, rolling in see-through warm crests, two
 * stacks of basalt with grassy tops (one with an arch), a skerry, and a
 * low rock. Its puffins are alive, drawn on it (see `draw/mrClaws`). 1024 by 160, tiling:
 * the crests' dashes stay clear of the edges.
 */
export const seaStackNear = (() => {
	const g = grid(SEA_STACK_NEAR_WIDTH / CELL, SEA_STACK_NEAR_HEIGHT / CELL)
	const random = seeded(9421)
	g.fill(0, 56, 512, 24, SEA_STACK_SEA)
	g.fill(0, 56, 512, 1, SEA_STACK_SEA_FAR)
	for (let i = 0; i < 34; i++) {
		const w = between(random, 6, 12)
		const x = between(random, 2, 512 - w - 2)
		const y = between(random, 59, 77)
		g.fill(x, y + 1, w - 2, 1, 'rgba(14,50,62,0.35)')
		g.fill(x, y, w, 1, 'rgba(246,208,170,0.4)')
		g.fill(x + 2, y - 1, Math.max(2, w - 6), 1, 'rgba(246,208,170,0.2)')
	}
	nearStack(g, random, 70, 38, 22, 64, true)
	nearStack(g, random, 300, 24, 38, 66)
	skerry(g, 190, 18, 56, 66)
	skerry(g, 410, 30, 50, 68)
	skerry(g, 470, 12, 61, 68)
	return g.url(CELL)
})()

// --- The stack --------------------------------------------------------------------------

/** The y the stack pictures' top row is drawn at: 5 cells over the top, for grass and flowers. */
/** The ledges on the stack's face, in cells across its whole width from its left edge, and down from its top: where they start, and the row they're on. */
const LEDGES = [
	[150, 26],
	[244, 32],
] as const
/**
 * Where a puffin stands on each ledge, in px: its left from the stack's
 * left edge (the outermost left slice's), and its feet down from the
 * stack's pictures' top (`STACK_ART_TOP`).
 */
export const PUFFIN_LEDGES = LEDGES.map(([x, y]) => ({
	left: x * CELL,
	feet: y * CELL,
}))

export const STACK_ART_TOP = 340
/** The pictures' height: 100 cells, down past the waterline to the bottom of the screen. */
export const STACK_ART_HEIGHT = 200

/** In cells: the row the walkable top is on, and the sea's surface. */
const TOP_ROW = 5
const WATER_ROW = 74
const ROWS = STACK_ART_HEIGHT / CELL
/** Across, the whole stack in cells: five slices, the core and five slices, 20 a slice. */
const SLICE = 20
const CORE_LEFT = 5 * SLICE
const COLUMNS = CORE_LEFT + 100 + 5 * SLICE

/** Thrift's rows: a pom of pink, a stem, a tuft of leaves. 4 by 5 cells. */
const THRIFT_ROWS = ['.LL.', 'LPPP', '.PD.', '.G..', 'GGg.']
const THRIFT_COLOURS = {
	L: THRIFT_LIT,
	P: THRIFT,
	D: THRIFT_SHADE,
	G: STEM,
	g: GRASS_RAMP[0],
}

/**
 * The whole stack on one grid, 300 cells across, then cut into the core and
 * ten slices: so strata, columns and grass run on across every cut. From the
 * top: a flat cap of grass on row 5 with tufts and thrift above it and a
 * dripping edge under it; sandstone strata, warm in the last light, split
 * by joints; basalt columns from about row 44 to the waterline on row 74;
 * the same columns darker, under the sea. Two ledges, for puffins (see `draw/mrClaws`). A faint
 * crack runs down the face of each piece beside a slice that'll break off.
 */
const STACK = (() => {
	const g = grid(COLUMNS, ROWS)
	const random = seeded(9431)

	// Sandstone: strata in bands a few rows thick, a little wavy.
	const bands: number[] = [9]
	while (bands[bands.length - 1] < 70)
		bands.push(bands[bands.length - 1] + between(random, 3, 6))
	// Where the basalt starts in each column: ragged, in columns 6 to 9 wide.
	const columnTop: number[] = []
	const columnPhase: number[] = []
	const columnWidth: number[] = []
	for (let x = 0; x < COLUMNS; ) {
		const w = between(random, 6, 9)
		const top = 44 + between(random, -2, 3)
		for (let i = 0; i < w && x + i < COLUMNS; i++) {
			columnTop[x + i] = top
			columnPhase[x + i] = i
			columnWidth[x + i] = w
		}
		x += w
	}
	for (let x = 0; x < COLUMNS; x++) {
		for (let y = TOP_ROW + 4; y < ROWS; y++) {
			let c: string
			if (y >= columnTop[x]) {
				const ramp = y >= WATER_ROW ? UNDER_RAMP : BASALT_RAMP
				const p = columnPhase[x]
				const w = columnWidth[x]
				c = ramp[1]
				if (p === 0) c = ramp[0]
				else if (p === w - 2) c = ramp[2]
				else if (p === w - 1) c = ramp[3]
				else if (y === columnTop[x]) c = ramp[0]
				// A joint across a column here and there.
				if (
					(y * 7 + x * 3 + columnWidth[x] * 11) % 23 === 0 &&
					p > 0 &&
					p < w - 1
				)
					c = ramp[2]
			} else {
				const wave = Math.round(Math.sin(x / 11 + y / 9) * 1.1)
				const r = y + wave
				let band = 0
				while (band < bands.length - 1 && bands[band + 1] <= r) band++
				const base = 1 + (band % 2)
				c = SAND_RAMP[base]
				if (r === bands[band]) c = SAND_RAMP[base - 1]
				else if (r === bands[band + 1] - 1) c = SAND_RAMP[base + 1]
			}
			g.put(x, y, c)
		}
	}
	// Shade under the grass.
	for (let x = 0; x < COLUMNS; x++)
		for (let y = TOP_ROW + 4; y < TOP_ROW + 7; y++)
			g.put(x, y, tone(g.get(x, y), y < TOP_ROW + 5 ? 2 : 1))
	// Joints: thin dark cracks down the sandstone, stepping a cell as they go.
	for (let i = 0; i < 24; i++) {
		let x = between(random, 2, COLUMNS - 3)
		const length = between(random, 5, 12)
		const start = between(random, TOP_ROW + 6, 34)
		for (let j = 0; j < length; j++) {
			const y = start + j
			if (y >= columnTop[x] - 1) break
			g.put(x, y, tone(g.get(x, y), 2))
			if (j % 3 === 2) x += random() < 0.5 ? -1 : 1
		}
	}
	// Glints of lit sandstone.
	for (let i = 0; i < 30; i++) {
		const x = between(random, 2, COLUMNS - 5)
		const y = between(random, TOP_ROW + 7, 40)
		if (y >= columnTop[x] - 1) continue
		for (let j = 0; j < between(random, 2, 4); j++)
			g.put(x + j, y, tone(g.get(x + j, y), -1))
	}

	// The cap: grass on row 5, speckled, a dripping edge under it.
	for (let x = 0; x < COLUMNS; x++) {
		g.put(x, TOP_ROW, GRASS_RAMP[0])
		g.put(x, TOP_ROW + 1, random() < 0.2 ? GRASS_RAMP[0] : GRASS_RAMP[1])
		g.put(x, TOP_ROW + 2, GRASS_RAMP[1])
		g.put(x, TOP_ROW + 3, GRASS_RAMP[2])
		const drip = random()
		if (drip < 0.55) g.put(x, TOP_ROW + 4, GRASS_RAMP[2])
		if (drip < 0.18) g.put(x, TOP_ROW + 5, GRASS_RAMP[3])
	}

	// Ledges for a puffin each (see `PUFFIN_LEDGES`): a lip of grass on the face.
	for (const [x, y] of LEDGES) {
		for (let i = 0; i < 12; i++) {
			g.put(x + i, y, GRASS_RAMP[0])
			if (i > 0 && i < 11) g.put(x + i, y + 1, GRASS_RAMP[1])
			if (i > 1 && i < 9) g.put(x + i, y + 2, GRASS_RAMP[2])
		}
		g.stamp(x + 8, y - 1, THRIFT_ROWS.slice(3), THRIFT_COLOURS)
	}

	// Tide line and seaweed at the waterline.
	for (let x = 0; x < COLUMNS; x++) {
		if (random() < 0.25) g.put(x, WATER_ROW - 3, BARNACLE)
		if (random() < 0.1) g.put(x, WATER_ROW - 5, BARNACLE)
		if (x % 4 === 1 && random() < 0.8) {
			const length = between(random, 2, 5)
			for (let j = 0; j < length; j++)
				g.put(x, WATER_ROW - 1 + j, j === 0 ? WEED_LIT : WEED)
		}
	}

	// Tufts and sea thrift above the cap: clear of every cut, so each slice has its own.
	for (let x = 1; x < COLUMNS - 3; x++) {
		const across = x % SLICE
		if (across < 1 || across > SLICE - 4) continue
		if (random() < 0.13) {
			const h = between(random, 2, 4)
			g.fill(x, TOP_ROW - h, 1, h, GRASS_RAMP[1])
			g.put(x, TOP_ROW - h, GRASS_RAMP[0])
			if (random() < 0.6) {
				const h2 = between(random, 1, 3)
				g.fill(x + 1, TOP_ROW - h2, 1, h2, GRASS_RAMP[2])
			}
		}
	}
	for (const x of [
		6, 27, 45, 63, 91, 118, 139, 165, 183, 207, 232, 255, 272, 287,
	])
		g.stamp(x, TOP_ROW - 5, THRIFT_ROWS, THRIFT_COLOURS)

	// The cliffs at each end: the grass overhangs, the rock steps in a cell or three.
	const stepIn = (start: number) => {
		const out: number[] = []
		let v = start
		for (let y = 0; y < ROWS; y++) {
			if (y % 4 === 0) v = Math.max(0, Math.min(3, v + between(random, -1, 1)))
			out[y] = v
		}
		return out
	}
	const leftIn = stepIn(1)
	const rightIn = stepIn(1)
	for (let y = TOP_ROW + 4; y < ROWS; y++) {
		for (let x = 0; x < leftIn[y]; x++) g.put(x, y, undefined)
		for (let x = 0; x < rightIn[y]; x++) g.put(COLUMNS - 1 - x, y, undefined)
		// Lit along the left face, shaded down the right.
		for (const [x, by] of [
			[leftIn[y], -1],
			[COLUMNS - 1 - rightIn[y], 1],
			[COLUMNS - 2 - rightIn[y], 1],
		] as const)
			g.put(x, y, tone(g.get(x, y), by))
	}

	// Faint cracks: down the face beside each slice that'll break off, in dashes.
	const seams = [
		...Array.from({ length: 5 }, (_, i) => CORE_LEFT - SLICE * i), // left, the face next to the core / its slice
		...Array.from({ length: 5 }, (_, i) => CORE_LEFT + 99 + SLICE * i),
	]
	for (const x of seams) {
		let y = TOP_ROW + 6
		let on = true
		while (y < ROWS) {
			const run = on ? between(random, 3, 7) : between(random, 2, 4)
			if (on)
				for (let j = 0; j < run; j++) {
					const c = g.get(x, y + j)
					if (c) g.put(x, y + j, tone(c, y + j > WATER_ROW ? 2 : 3))
				}
			y += run
			on = !on
		}
	}
	return g
})()

/** The core: 200 px wide, drawn at world x 100. */
export const STACK_CORE = STACK.url(1, CORE_LEFT, 100)

/**
 * Five slices each side, 40 px wide, index 0 against the core, 4 the
 * outermost. Left slice i is drawn at world x `100 - 40 * (i + 1)`, right
 * slice i at `300 + 40 * i`.
 */
export const STACK_SLICES_LEFT = Array.from({ length: 5 }, (_, i) =>
	STACK.url(1, CORE_LEFT - SLICE * (i + 1), SLICE),
)
export const STACK_SLICES_RIGHT = Array.from({ length: 5 }, (_, i) =>
	STACK.url(1, CORE_LEFT + 100 + SLICE * i, SLICE),
)

// --- A crest ----------------------------------------------------------------------------

export const SEA_STACK_CREST_WIDTH = 10 * CELL
export const SEA_STACK_CREST_HEIGHT = 3 * CELL

/** A wave's crest, a fleck of warm foam to scatter on the water: its lowest row see-through. 10 by 3 cells. */
export const SEA_STACK_CREST = letterArt(
	['...FF.....', '.FFFFFF...', 'ffffffffff'],
	{
		F: SEA_STACK_FOAM,
		f: 'rgba(246,228,214,0.55)',
	},
)
