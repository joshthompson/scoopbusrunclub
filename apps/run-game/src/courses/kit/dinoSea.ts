import type { CaveTiles } from '../types'
import { type PixelRect, paintedArt, pixelArt, tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Dino Island's sea, under it: what's on the seabed and swimming about.
 * All a cell a pixel, at `scale: 2`, stood with their bottoms on the sand.
 * Warm reefs against the cold blue water, so they pop; each piece has a
 * base, a lit tone along its tops and a shade along its undersides and
 * far sides, like everything else.
 */

type Grid = (string | undefined)[][]

const grid = (width: number, height: number): Grid =>
	Array.from({ length: height }, () => Array(width).fill(undefined))

/** Fills a rect of `grid` with `colour`, clipped to its edges. */
function fill(
	g: Grid,
	x: number,
	y: number,
	w: number,
	h: number,
	colour: string | undefined,
) {
	for (let j = y; j < y + h; j++)
		for (let i = x; i < x + w; i++)
			if (j >= 0 && j < g.length && i >= 0 && i < g[0].length) g[j][i] = colour
}

/** Lights `base` cells of `grid`: lit where it's open above, shade where it's open below or to the right. */
function light(g: Grid, base: string, lit: string, shade: string) {
	const h = g.length
	const w = g[0].length
	const was = g.map((row) => [...row])
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			if (was[y][x] !== base) continue
			if (y > 0 && was[y - 1][x] === undefined) g[y][x] = lit
			else if (
				(y < h - 1 && was[y + 1][x] === undefined) ||
				(x < w - 1 && was[y][x + 1] === undefined)
			)
				g[y][x] = shade
		}
}

/** Stamps rows of letters onto `grid` at `x`, `y`, `.` leaving what's there. */
function stamp(
	g: Grid,
	x: number,
	y: number,
	rows: string[],
	colours: Record<string, string>,
) {
	rows.forEach((row, j) => {
		for (let i = 0; i < row.length; i++)
			if (
				row[i] !== '.' &&
				y + j >= 0 &&
				y + j < g.length &&
				x + i >= 0 &&
				x + i < g[0].length
			)
				g[y + j][x + i] = colours[row[i]]
	})
}

/** A grid, as its picture. */
const picture = (g: Grid) =>
	paintedArt(g[0].length, g.length, (x, y) => g[Math.floor(y)][Math.floor(x)])

/** Several grids as one picture, side by side: a strip of frames. */
function strip(frames: Grid[]) {
	const w = frames[0].length ? frames[0][0].length : 0
	const h = frames[0].length
	const rects: PixelRect[] = []
	frames.forEach((g, f) => {
		for (let y = 0; y < h; y++) {
			let from = 0
			let colour: string | undefined
			for (let x = 0; x <= w; x++) {
				const here = x < w ? g[y][x] : undefined
				if (here !== colour) {
					if (colour) rects.push([f * w + from, y, x - from, 1, colour])
					from = x
					colour = here
				}
			}
		}
	})
	return pixelArt(w * frames.length, h, rects)
}

// --- Coral ---------------------------------------------------------------

const PINK = '#ef7a6a'
const PINK_LIT = '#ffa89a'
const PINK_SHADE = '#c0485a'

const PURPLE = '#c25ab0'
const PURPLE_LIT = '#e88cd6'
const PURPLE_SHADE = '#8a3a88'

const ORANGE = '#f2a23a'
const ORANGE_LIT = '#ffd06a'
const ORANGE_SHADE = '#c46a22'
const MOUTH = '#6a2e1a'

/** Branching coral, pink: a stout trunk on a spread foot, forking into arms, thinner towards their tips, each tipped lighter. 20 by 18. */
function branching() {
	const rows = [
		'.........PP.........',
		'.........PP....PP...',
		'..PP.....PP....PP...',
		'..PP..PP.PPP...PP.PP',
		'..PPP.PP.PPP..PPP.PP',
		'...PP.PPPPPPP.PP.PPP',
		'...PPPPPPPPPPPPPPPP.',
		'....PPPPPPPPPPPPPP..',
		'.....PPPPPPPPPPPP...',
		'.......PPPPPPPP.....',
		'.......PPPPPPP......',
		'........PPPPP.......',
		'........PPPPP.......',
		'........PPPPP.......',
		'.......PPPPPPP......',
		'....PPPPPPPPPPPP....',
		'...PPPPPPPPPPPPPP...',
		'..PPPPPPPPPPPPPPPP..',
	].map((row) => row.padEnd(20, '.'))
	const g = grid(20, rows.length)
	stamp(g, 0, 0, rows, { P: PINK })
	light(g, PINK, PINK_LIT, PINK_SHADE)
	return picture(g)
}

/** Brain coral, purple: a round dome, its surface all winding grooves, on a rocky base. 24 by 14. */
function brain() {
	const g = grid(24, 14)
	for (let y = 0; y < 14; y++)
		for (let x = 0; x < 24; x++) {
			const dx = (x + 0.5 - 12) / 12
			const dy = (y + 0.5 - 11) / 10.5
			if (y > 11) {
				if (Math.abs(dx) < 0.75) g[y][x] = PURPLE_SHADE
			} else if (dx * dx + dy * dy <= 1) {
				// Winding grooves, a few cells at a time.
				const groove = (x + (y % 4 < 2 ? 0 : 3)) % 6 < 2 && y % 3 !== 0
				g[y][x] = groove ? PURPLE_SHADE : PURPLE
			}
		}
	// Lit along its top, ridges only.
	for (let y = 0; y < 14; y++)
		for (let x = 0; x < 24; x++)
			if (g[y][x] === PURPLE && (y === 0 || g[y - 1][x] === undefined))
				g[y][x] = PURPLE_LIT
			else if (g[y][x] === PURPLE && y > 0 && g[y - 1][x] === undefined)
				g[y][x] = PURPLE_LIT
	// A glint or two, up on its left.
	for (const [x, y] of [
		[7, 3],
		[9, 2],
		[5, 5],
	])
		if (g[y][x] === PURPLE) g[y][x] = PURPLE_LIT
	return picture(g)
}

/** Tube coral, orange: a cluster of tubes of different heights, each open at the top, its dark mouth showing. 16 by 22. */
function tubes() {
	const g = grid(16, 22)
	// Tubes: [left, top, width], each its own lit rim and shaded side.
	for (const [x, top, w] of [
		[0, 11, 4],
		[5, 3, 4],
		[10, 7, 3],
		[14, 15, 2],
	] as const) {
		fill(g, x, top, w, 22 - top, ORANGE)
		fill(g, x + w - 1, top, 1, 22 - top, ORANGE_SHADE)
		fill(g, x, top, w, 1, ORANGE_LIT)
		if (w > 2) fill(g, x + 1, top + 1, w - 2, 2, MOUTH)
		// Growth rings down it.
		for (let y = top + 5; y < 21; y += 5) fill(g, x, y, w - 1, 1, ORANGE_LIT)
	}
	return picture(g)
}

/** Coral, stood on the seabed: a few kinds, taken in turn. */
export const CORAL: string[] = [branching(), brain(), tubes()]

// --- Kelp ----------------------------------------------------------------

const KELP_STEM = '#2f7a3e'
const KELP_BLADE = '#4fa84e'
const KELP_LIT = '#86cf62'
const KELP_FLOAT = '#c2d86a'

/** A frond of kelp in one frame: its stem swaying `phase` along, floats at its nodes and blades hanging from them. 12 by 50. */
function kelpFrame(phase: number) {
	const w = 12
	const h = 50
	const g = grid(w, h)
	const bend = (y: number) =>
		Math.round(Math.sin(y / 7 + phase) * ((50 - y) / 50) * 2.6)
	const stem = (y: number) => 5 + bend(y)
	for (let y = 0; y < h; y++) fill(g, stem(y), y, 2, 1, KELP_STEM)
	// Its holdfast, gripping the sand.
	fill(g, 3, 47, 6, 3, KELP_STEM)
	fill(g, 2, 49, 8, 1, KELP_STEM)
	// A float and a blade at each node, one side then the other.
	for (let n = 0; n < 5; n++) {
		const y = 5 + n * 8
		const side = n % 2 === 0 ? -1 : 1
		const x = stem(y)
		// Float: a little pale bulb on the stem.
		fill(g, x, y, 2, 2, KELP_FLOAT)
		// Blade: a long leaf drooping out and down, flapping with the sway.
		const flap = Math.round(Math.sin(y / 7 + phase + 1) * 1)
		for (let i = 0; i < 5; i++) {
			const bx = side < 0 ? x - 1 - i : x + 2 + i
			const by = y + 1 + Math.floor(i / 2) + flap + (i > 2 ? 1 : 0)
			fill(g, bx, by, 1, 2, KELP_BLADE)
			if (i > 0) g[by][bx] = KELP_LIT
		}
	}
	return g
}

/** Kelp, a tall frond, swaying: its frames, side by side in `asset`, each `width` across. */
export const KELP = {
	asset: strip([kelpFrame(0), kelpFrame(Math.PI)]),
	width: 12,
	count: 2,
}

// --- Octopus -------------------------------------------------------------

const OCTO = '#c25a8a'
const OCTO_LIT = '#e88ab2'
const OCTO_SHADE = '#8e3a68'
const SUCKER = '#f6c6dc'
const WHITE = '#ffffff'
const INK = '#2b2722'

/** An octopus in one frame: a round head, one wide eye looking out, and arms along the sand, their tips curling `curl` ways. 22 by 20. */
function octopusFrame(curl: 0 | 1) {
	const g = grid(22, 20)
	// Its head: a dome of a mantle, over a rounder face.
	for (let y = 0; y < 15; y++)
		for (let x = 0; x < 22; x++) {
			const dx = (x + 0.5 - 11) / 6.5
			const dy = (y + 0.5 - 8) / 7.5
			if (dx * dx + dy * dy <= 1) g[y][x] = OCTO
		}
	// Its arms: [points] a 2x2 stamp walked along each.
	const arms: [number, number][][] =
		curl === 0
			? [
					[
						[6, 13],
						[4, 15],
						[2, 17],
						[1, 18],
						[0, 16],
						[1, 14],
					],
					[
						[8, 14],
						[7, 17],
						[5, 18],
						[3, 18],
					],
					[
						[13, 14],
						[14, 17],
						[16, 18],
						[18, 18],
					],
					[
						[15, 13],
						[17, 15],
						[19, 17],
						[20, 18],
						[20, 16],
						[19, 14],
					],
				]
			: [
					[
						[6, 13],
						[4, 15],
						[2, 17],
						[1, 18],
						[0, 18],
						[0, 16],
					],
					[
						[8, 14],
						[7, 17],
						[5, 18],
						[3, 17],
						[2, 15],
					],
					[
						[13, 14],
						[14, 17],
						[16, 18],
						[18, 17],
						[19, 15],
					],
					[
						[15, 13],
						[17, 15],
						[19, 17],
						[20, 18],
						[20, 18],
						[21, 16],
					],
				]
	for (const arm of arms)
		for (let i = 0; i < arm.length - 1; i++) {
			const [x1, y1] = arm[i]
			const [x2, y2] = arm[i + 1]
			const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
			for (let s = 0; s <= steps; s++) {
				const x = Math.round(x1 + ((x2 - x1) * s) / steps)
				const y = Math.round(y1 + ((y2 - y1) * s) / steps)
				const size = i < 2 ? 3 : i === arm.length - 2 && s > steps / 2 ? 1 : 2
				fill(g, x, y, size, size, OCTO)
			}
		}
	light(g, OCTO, OCTO_LIT, OCTO_SHADE)
	// Suckers, pale dots along the arms' undersides.
	for (const [x, y] of [
		[3, 18],
		[5, 18],
		[16, 19],
		[18, 19],
		[1, 17],
		[19, 17],
	])
		if (g[y]?.[x] !== undefined) g[y][x] = SUCKER
	// Its one big eye, looking out to the left: a white, a dark pupil, a glint.
	fill(g, 5, 6, 5, 5, WHITE)
	fill(g, 6, 5, 3, 1, WHITE)
	fill(g, 6, 7, 2, 3, INK)
	g[7][6] = WHITE
	// A shy smile and a bright cheek.
	fill(g, 8, 12, 3, 1, OCTO_SHADE)
	fill(g, 13, 4, 2, 1, OCTO_LIT)
	return g
}

/** An octopus, sat on the seabed, its arms curling: its frames, side by side. */
export const OCTOPUS = {
	asset: strip([octopusFrame(0), octopusFrame(1)]),
	width: 22,
	count: 2,
}

// --- Fish ----------------------------------------------------------------

/** A fish facing right, in three tones, its tail `open` or flicked in: 8 by 4. */
const fishRows = (open: boolean) =>
	open
		? ['t..lll..', 'ttbbbbeb', 'ttbbbbb.', 't..sss..']
		: ['...lll..', '.tbbbbeb', '.tbbbbb.', '.t.sss..']

const TANG = { l: '#fff08a', b: '#ffd23a', s: '#e0a020', t: '#f2a23a', e: INK }
const BLUE = { l: '#8ac4ff', b: '#3a82e8', s: '#2a56b8', t: '#2a56b8', e: INK }

/** The school's fish: [x, y, blue?], and how far each is a cell ahead or behind in the second frame. */
const SCHOOL: [number, number, boolean, number][] = [
	[24, 12, false, 1],
	[10, 20, true, 0],
	[18, 26, false, 1],
	[29, 30, true, 1],
	[5, 36, false, 0],
	[16, 42, true, 1],
	[27, 47, false, 0],
]

function schoolFrame(open: boolean, second: boolean) {
	const g = grid(40, 100)
	for (const [x, y, blue, drift] of SCHOOL)
		stamp(
			g,
			x + (second ? drift : 0),
			y,
			fishRows(open !== (x % 2 === 0)),
			blue ? BLUE : TANG,
		)
	return g
}

/**
 * A school of fish, swimming about over the seabed: a tall picture, mostly
 * clear, the fish up in the water above where it stands, its frames side by
 * side. Seven of them, yellow tangs and blue, all heading right, tails flicking.
 */
export const FISH_SCHOOL = {
	asset: strip([schoolFrame(true, false), schoolFrame(false, true)]),
	width: 40,
	count: 2,
}

// --- Seabed bits ---------------------------------------------------------

/** A starfish, orange, five stubby arms, speckled. 8 by 6. */
const starfish = (() => {
	const g = grid(8, 6)
	stamp(
		g,
		0,
		0,
		['...ll...', 'l..ll..l', '.ooooso.', '..osoo..', '..oo.so.', '.oo...oo'],
		{ l: '#ffc27a', o: '#f28a4a', s: '#c4562a' },
	)
	return picture(g)
})()

/** A scallop shell, cream, with its ridges fanning from a darker hinge. 8 by 5. */
const shell = (() => {
	const g = grid(8, 5)
	stamp(g, 0, 0, ['..llll..', '.lcLcLl.', 'lcLcLcLc', 'cdcdcdcd', '..hhhh..'], {
		l: '#fff4e0',
		c: '#f2e2c8',
		L: '#d9b894',
		d: '#b88a64',
		h: '#9a6a48',
	})
	return picture(g)
})()

/** Starfish and shells, small, on the sand. */
export const SEABED_BITS: string[] = [starfish, shell]

// --- More for the seabed -------------------------------------------------

/** A stepped line on `g` from one cell to another, `thick` cells square. */
function drawLine(
	g: Grid,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	thick: number,
	colour: string,
) {
	const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
	for (let i = 0; i <= steps; i++)
		fill(
			g,
			Math.round(x0 + ((x1 - x0) * i) / steps),
			Math.round(y0 + ((y1 - y0) * i) / steps),
			thick,
			thick,
			colour,
		)
}

/** A filled ellipse on `g`, centred on `cx`, `cy`. */
function disc(
	g: Grid,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	colour: string,
) {
	for (let y = Math.floor(cy - ry); y < Math.ceil(cy + ry); y++)
		for (let x = Math.floor(cx - rx); x < Math.ceil(cx + rx); x++) {
			const dx = (x + 0.5 - cx) / rx
			const dy = (y + 0.5 - cy) / ry
			if (dx * dx + dy * dy <= 1) fill(g, x, y, 1, 1, colour)
		}
}

const WEED = '#2f7a3e'
const WEED_BLADE = '#4fa84e'
const WEED_LIT = '#86cf62'

/** Seagrass in one frame: blades from the sand, each swaying `phase` along, lit at their tips. 20 by 18. */
function seagrassFrame(phase: number) {
	const g = grid(20, 18)
	const blades: [number, number][] = [
		[2, 12],
		[5, 17],
		[8, 14],
		[11, 18],
		[14, 13],
		[17, 16],
	]
	blades.forEach(([x, h], n) => {
		for (let y = 0; y < h; y++) {
			const up = y / h
			const sway = Math.round(Math.sin(phase + n * 1.3) * 2.2 * up * up)
			const at = x + sway
			fill(
				g,
				at,
				18 - 1 - y,
				2,
				1,
				y > h - 3 ? WEED_LIT : n % 2 ? WEED : WEED_BLADE,
			)
		}
	})
	fill(g, 1, 17, 18, 1, WEED)
	return g
}

/** Seagrass, a tuft of long blades on the sand, swaying: its frames, side by side in `asset`, each `width` across. */
export const SEAGRASS = {
	asset: strip([seagrassFrame(0), seagrassFrame(Math.PI)]),
	width: 20,
	count: 2,
}

const ANEM = '#d44a8a'
const ANEM_LIT = '#ff9ac8'
const ANEM_SHADE = '#8a2a68'
const ANEM_TIP = '#fff0a8'

const anemone = (() => {
	const g = grid(14, 14)
	fill(g, 3, 11, 8, 3, '#6a5a78')
	fill(g, 4, 8, 6, 4, ANEM_SHADE)
	fill(g, 4, 8, 2, 4, ANEM)
	for (const [x, top] of [
		[1, 3],
		[3, 1],
		[5, 0],
		[7, 0],
		[9, 1],
		[11, 3],
	] as const) {
		drawLine(g, x + 1, top + 1, 7, 8, 1, ANEM)
		fill(g, x, top, 2, 2, ANEM_TIP)
	}
	fill(g, 5, 4, 1, 4, ANEM_LIT)
	fill(g, 8, 4, 1, 4, ANEM_LIT)
	fill(g, 6, 7, 2, 2, ANEM)
	return picture(g)
})()
/** A sea anemone: a squat purple column on a rock, a fan of pink tentacles tipped pale. 14 by 14. */
export const ANEMONE = anemone

const AMMO = '#c9a77a'
const AMMO_LIT = '#f0dcb0'
const AMMO_SHADE = '#8f6e48'
const AMMO_RIB = '#a98456'
const SAND_HEAP = '#b89a64'

const ammonite = (() => {
	const g = grid(26, 20)
	const cx = 13
	const cy = 15.5
	for (let y = 0; y < 20; y++)
		for (let x = 0; x < 26; x++) {
			const dx = x + 0.5 - cx
			const dy = y + 0.5 - cy
			const r = Math.hypot(dx, dy)
			if (r > 13 || dy > 1) continue
			// A spiral of whorls: a ridge where the winding radius comes round.
			const turn = Math.atan2(dy, dx) / (Math.PI * 2) + 1
			const s = r - turn * 3.2
			const ridge = ((s % 4) + 4) % 4
			g[y][x] = ridge < 1 ? AMMO_RIB : ridge < 1.8 ? AMMO_SHADE : AMMO
		}
	// Lit along its rim, shaded in towards its middle.
	for (let y = 0; y < 20; y++)
		for (let x = 0; x < 26; x++)
			if (g[y][x] && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > 11.6)
				g[y][x] = x < 14 ? AMMO_LIT : AMMO
	disc(g, cx, cy - 1, 2, 2, AMMO_SHADE)
	// Ribs across its last whorl, short ticks.
	for (let a = 0.2; a < 3; a += 0.28) {
		const x = Math.round(cx - Math.cos(a) * 9.5)
		const y = Math.round(cy - Math.sin(a) * 9.5)
		if (g[y]?.[x] === AMMO) g[y][x] = AMMO_RIB
	}
	// The sand heaped round where it's sunk.
	fill(g, 0, 17, 26, 3, SAND_HEAP)
	fill(g, 2, 16, 22, 1, SAND_HEAP)
	fill(g, 0, 19, 26, 1, '#9a7e4e')
	return picture(g)
})()
/**
 * A big fossil ammonite, half sunk in the sand: the top half of a coiled
 * shell stood on its edge, its whorls ribbed and winding in to the middle,
 * lit along its rim; a landmark. 26 by 20.
 */
export const AMMONITE = ammonite

const WOOD = '#5c4a3c'
const WOOD_LIT = '#7e6850'
const WOOD_SHADE = '#3a2e26'
const WOOD_END = '#a8946c'

const sunkenLog = (() => {
	const g = grid(50, 14)
	fill(g, 4, 3, 44, 10, WOOD)
	fill(g, 6, 2, 40, 1, WOOD_LIT)
	fill(g, 4, 3, 44, 1, WOOD_LIT)
	fill(g, 4, 10, 44, 3, WOOD_SHADE)
	// Its cut end, ringed, at the left.
	disc(g, 4, 8, 4, 5, WOOD_END)
	disc(g, 4, 8, 2.5, 3, WOOD_LIT)
	fill(g, 3, 7, 2, 2, WOOD_SHADE)
	// Its roots' end, at the right, ragged.
	fill(g, 46, 5, 4, 8, WOOD_SHADE)
	fill(g, 47, 3, 3, 2, WOOD)
	// Bark furrows and a limb stub.
	fill(g, 14, 6, 9, 1, WOOD_SHADE)
	fill(g, 28, 5, 10, 1, WOOD_SHADE)
	fill(g, 20, 9, 8, 1, WOOD_SHADE)
	fill(g, 32, 0, 3, 3, WOOD)
	fill(g, 32, 0, 3, 1, WOOD_LIT)
	// Weed on it, trailing: tufts on its top, strands hanging down its front.
	for (const [x, h] of [
		[10, 3],
		[17, 5],
		[24, 3],
		[36, 4],
		[41, 2],
	] as const) {
		fill(g, x, 3 - h + 1, 1, h, WEED_BLADE)
		fill(g, x + 1, 3 - h + 3, 1, h - 2, WEED)
		fill(g, x, 3 - h + 1, 1, 1, WEED_LIT)
	}
	for (const [x, h] of [
		[14, 5],
		[30, 4],
		[38, 6],
	] as const) {
		fill(g, x, 8, 1, h, WEED)
		fill(g, x + 1, 9, 1, h - 2, WEED_BLADE)
	}
	return picture(g)
})()
/** A sunken log, waterlogged and dark, a snapped limb stub, its cut end ringed, weed trailing off it. 50 by 14. */
export const SUNKEN_LOG = sunkenLog

const STONE = '#5b6b82'
const STONE_LIT = '#7d8fa6'
const STONE_SHADE = '#3c4a60'
const BARN = '#e6e0cc'
const BARN_SHADE = '#a8a290'

const barnacleRock = (() => {
	const g = grid(30, 20)
	disc(g, 15, 14, 14.5, 6.5, STONE)
	disc(g, 12, 10, 9, 7, STONE)
	disc(g, 21, 11, 7, 6, STONE)
	light(g, STONE, STONE_LIT, STONE_SHADE)
	fill(g, 3, 18, 24, 2, STONE_SHADE)
	// Barnacles, a few clustered at a time.
	for (const [x, y] of [
		[7, 12],
		[9, 14],
		[6, 15],
		[19, 9],
		[21, 11],
		[24, 13],
		[17, 15],
		[12, 17],
		[26, 16],
	] as const) {
		fill(g, x, y, 3, 2, BARN)
		fill(g, x + 2, y, 1, 2, BARN_SHADE)
		fill(g, x + 1, y, 1, 1, '#2b2722')
	}
	// Weed on its top, swaying frond by frond.
	for (const [x, h] of [
		[10, 7],
		[12, 9],
		[14, 6],
		[22, 5],
	] as const) {
		drawLine(g, x, 8, x + (x % 2 ? 2 : -2), 8 - h, 1, WEED_BLADE)
		fill(g, x + (x % 2 ? 2 : -2), 8 - h, 1, 2, WEED_LIT)
		fill(g, x, 7, 2, 2, WEED)
	}
	return picture(g)
})()
/** A rock on the seabed, blue-grey, crusted with barnacles (pale cones, each with a dark mouth) and weed on its top. 30 by 20. */
export const BARNACLE_ROCK = barnacleRock

// --- The reef slope ------------------------------------------------------

const TEAL = '#2fa89a'
const TEAL_LIT = '#7adbc4'
const TEAL_SHADE = '#1f6e72'
const YELLOW = '#e8c83a'
const YELLOW_LIT = '#fff08a'
const YELLOW_SHADE = '#b8901e'
const REEF_ROCK = '#6a5a78'
const REEF_ROCK_SHADE = '#4a3e5c'

/** A slope of coral rising up to the shore: a rocky bank climbing left to right, domes and tubes of every colour on it. 50 by 24. */
function reefSlope() {
	const g = grid(50, 24)
	// The bank: its top climbing from 20 at the left to 8 at the right.
	for (let x = 0; x < 50; x++) {
		const top = Math.round(20 - (x / 49) * 12)
		fill(g, x, top, 1, 24 - top, REEF_ROCK)
	}
	light(g, REEF_ROCK, '#8a7a9c', REEF_ROCK_SHADE)
	fill(g, 0, 22, 50, 2, REEF_ROCK_SHADE)
	// Domes of coral along it, each lit and shaded.
	const domes: [number, number, number, number, string, string, string][] = [
		[6, 17, 6, 5, PINK, PINK_LIT, PINK_SHADE],
		[16, 15, 7, 6, ORANGE, ORANGE_LIT, ORANGE_SHADE],
		[27, 11, 7, 7, PURPLE, PURPLE_LIT, PURPLE_SHADE],
		[37, 8, 6, 6, PINK, PINK_LIT, PINK_SHADE],
		[45, 5, 5, 5, ORANGE, ORANGE_LIT, ORANGE_SHADE],
	]
	for (const [cx, cy, rx, ry, base, lit, shade] of domes) {
		disc(g, cx, cy, rx, ry, base)
		light(g, base, lit, shade)
		fill(g, cx - rx + 2, cy + ry - 2, rx * 2 - 3, 2, shade)
	}
	// Tubes standing between them, mouths dark.
	for (const [x, top] of [
		[11, 12],
		[22, 8],
		[33, 5],
		[42, 0],
	] as const) {
		fill(g, x, top, 3, 12, YELLOW)
		fill(g, x + 2, top, 1, 12, YELLOW_SHADE)
		fill(g, x, top, 3, 1, YELLOW_LIT)
		fill(g, x + 1, top + 1, 1, 2, MOUTH)
	}
	return picture(g)
}

/** Staghorn coral, teal: a thicket of antler arms forking up from a stout base. 36 by 38. */
function staghorn() {
	const g = grid(36, 38)
	const arm = (x0: number, y0: number, x1: number, y1: number, t: number) =>
		drawLine(g, x0, y0, x1, y1, t, TEAL)
	// Trunks from the base, forking again and again.
	arm(18, 36, 17, 22, 5)
	arm(17, 24, 8, 12, 3)
	arm(19, 24, 27, 10, 3)
	arm(8, 12, 4, 2, 2)
	arm(8, 12, 11, 1, 2)
	arm(27, 10, 24, 1, 2)
	arm(27, 10, 33, 3, 2)
	arm(17, 24, 17, 6, 3)
	arm(17, 8, 14, 0, 2)
	arm(17, 8, 21, 1, 2)
	arm(11, 18, 3, 16, 2)
	arm(24, 18, 32, 15, 2)
	arm(3, 16, 1, 10, 2)
	arm(32, 15, 34, 9, 2)
	fill(g, 6, 34, 24, 4, TEAL)
	fill(g, 3, 36, 30, 2, TEAL)
	light(g, TEAL, TEAL_LIT, TEAL_SHADE)
	fill(g, 3, 37, 30, 1, TEAL_SHADE)
	return picture(g)
}

/** Table coral, pink and orange: broad flat plates stacked on a thick stalk, lit on top, shadow under each. 44 by 26. */
function tableCoral() {
	const g = grid(44, 26)
	fill(g, 18, 12, 8, 14, PINK_SHADE)
	fill(g, 18, 12, 3, 14, PINK)
	fill(g, 13, 23, 18, 3, PINK_SHADE)
	// Its lower plate, then its upper, narrower, each a flat disc with a shadow below it.
	disc(g, 22, 14, 21, 3.5, ORANGE_SHADE)
	disc(g, 22, 12.5, 21, 3, ORANGE)
	fill(g, 3, 11, 38, 1, ORANGE_LIT)
	disc(g, 22, 6, 14, 3, PINK_SHADE)
	disc(g, 22, 4.5, 14, 3, PINK)
	fill(g, 10, 2, 24, 1, PINK_LIT)
	// Ridges on the plates' tops, short ticks.
	for (let x = 6; x < 38; x += 4) fill(g, x, 12, 1, 1, ORANGE_SHADE)
	for (let x = 12; x < 33; x += 4) fill(g, x, 5, 1, 1, PINK_SHADE)
	return picture(g)
}

/** A reef, built up the slope to the shore: a bank of mixed coral, staghorn and table coral, bigger than the singles. */
export const REEF: string[] = [reefSlope(), staghorn(), tableCoral()]

// --- The beach -----------------------------------------------------------

const TORCH = '#7a5a3a'
const TORCH_LIT = '#a07c54'
const TORCH_DARK = '#54391f'
const TORCH_BAND = '#d8c070'
const FLAME = '#f2a23a'
const FLAME_LIT = '#ffe066'
const FLAME_RED = '#e0562a'

/** A tiki torch, lit: a bamboo pole, bound in twine, a bowl at the top and a flame in it. 8 by 30. */
function tikiTorch() {
	const r: PixelRect[] = []
	r.push(
		[3, 11, 2, 19, TORCH],
		[3, 11, 1, 19, TORCH_LIT],
		[4, 11, 1, 19, TORCH_DARK],
	)
	for (const y of [15, 21, 27]) r.push([3, y, 2, 1, TORCH_BAND])
	r.push([2, 28, 4, 2, TORCH_DARK])
	// Its bowl, wide at the top.
	r.push(
		[1, 9, 6, 3, TORCH_DARK],
		[1, 9, 6, 1, TORCH_LIT],
		[2, 12, 4, 1, TORCH_DARK],
	)
	// Its flame, orange round a yellow heart, a lick of red at its edge.
	r.push([2, 6, 4, 3, FLAME], [3, 3, 3, 3, FLAME], [4, 0, 1, 3, FLAME])
	r.push(
		[3, 6, 2, 3, FLAME_LIT],
		[4, 4, 1, 2, FLAME_LIT],
		[2, 7, 1, 2, FLAME_RED],
	)
	return pixelArt(8, 30, r)
}

const BOARD = '#f4efe0'
const BOARD_SHADE = '#cfc7ae'
const BOARD_STRIPE = '#e8534a'
const BOARD_STRIPE2 = '#3a9ac8'
const BEACH_SAND = '#e6cf94'
const BEACH_SAND_SHADE = '#c4a868'

/** A surfboard stuck upright in the sand: cream, a red and a blue stripe across, a stringer down its middle, its foot buried. 10 by 34. */
function surfboard() {
	const g = grid(10, 34)
	for (let y = 0; y < 30; y++) {
		const t = y / 29
		const half = y < 8 ? 1.5 + y * 0.45 : 5 - Math.max(0, (y - 22) * 0.12)
		fill(g, Math.round(5 - half), y, Math.round(half * 2), 1, BOARD)
	}
	fill(g, 7, 6, 2, 22, BOARD_SHADE)
	fill(g, 5, 4, 1, 26, BOARD_SHADE)
	fill(g, 1, 12, 8, 2, BOARD_STRIPE)
	fill(g, 1, 16, 8, 1, BOARD_STRIPE2)
	fill(g, 4, 2, 1, 2, BOARD)
	// Its sand heaped round its foot.
	fill(g, 0, 31, 10, 3, BEACH_SAND)
	fill(g, 2, 30, 6, 1, BEACH_SAND)
	fill(g, 0, 33, 10, 1, BEACH_SAND_SHADE)
	return picture(g)
}

const THATCH = '#d4a84a'
const THATCH_LIT = '#f0cf6c'
const THATCH_DARK = '#9a7430'
const PLANK = '#a8743e'
const PLANK_LIT = '#c8945a'
const PLANK_DARK = '#6e4a28'
const DOORWAY = '#2e2018'

/** A little thatched beach hut: a steep straw roof shaggy at its eaves, plank walls on stilts of posts, a dark doorway and a shuttered window. 60 by 44. */
function beachHut() {
	const r: PixelRect[] = []
	// Its roof, stepped in: wide at the eaves, a peak at the top, a lit left and a dark right.
	for (let y = 0; y < 26; y++) {
		const half = 5 + Math.round(y * 1.15)
		r.push([30 - half, y + 2, half * 2, 1, y % 5 === 4 ? THATCH_DARK : THATCH])
	}
	r.push([27, 0, 6, 3, THATCH], [29, 0, 2, 2, THATCH_LIT])
	for (let y = 0; y < 24; y += 5) {
		const half = 5 + Math.round(y * 1.15)
		r.push([30 - half + 1, y + 2, half - 2, 1, THATCH_LIT])
	}
	// Its eaves, ragged.
	for (let x = 0; x < 60; x += 3)
		r.push([x, 28, 2, 2, THATCH_DARK], [x + 1, 30, 1, 1, THATCH_DARK])
	// Its walls, planks.
	r.push(
		[8, 31, 44, 10, PLANK],
		[8, 31, 44, 1, PLANK_LIT],
		[8, 39, 44, 2, PLANK_DARK],
	)
	for (let x = 12; x < 52; x += 5) r.push([x, 32, 1, 8, PLANK_DARK])
	// Its doorway and its window.
	r.push([14, 32, 12, 12, DOORWAY], [14, 32, 12, 1, PLANK_DARK])
	r.push(
		[34, 33, 10, 6, DOORWAY],
		[34, 33, 10, 1, PLANK_DARK],
		[38, 33, 2, 6, PLANK],
		[34, 36, 10, 1, PLANK],
	)
	// Its corner posts.
	r.push(
		[6, 31, 3, 13, PLANK_DARK],
		[51, 31, 3, 13, PLANK_DARK],
		[6, 31, 1, 13, PLANK],
	)
	return pixelArt(60, 44, r)
}

const NUT = '#6e4a2c'
const NUT_LIT = '#9a6c42'
const NUT_DARK = '#3e2a18'

/** A pile of coconuts: brown and hairy, three eyes on each, heaped in a little pyramid. 16 by 8. */
function coconuts() {
	const r: PixelRect[] = []
	const nut = (x: number, y: number) => {
		r.push(
			[x + 1, y, 4, 1, NUT],
			[x, y + 1, 6, 3, NUT],
			[x + 1, y + 4, 4, 1, NUT_DARK],
		)
		r.push([x + 1, y + 1, 2, 1, NUT_LIT], [x + 4, y + 2, 1, 2, NUT_DARK])
		r.push([x + 2, y + 2, 1, 1, NUT_DARK], [x + 3, y + 3, 1, 1, NUT_DARK])
	}
	nut(1, 3)
	nut(9, 3)
	nut(5, 3)
	nut(4, 0)
	return pixelArt(16, 8, r)
}

/** For the beach at the finish: a tiki torch, lit; a surfboard stuck in the sand; a little thatched hut; a pile of coconuts. */
export const BEACH: string[] = [
	tikiTorch(),
	surfboard(),
	beachHut(),
	coconuts(),
]

// --- The shelf -----------------------------------------------------------

const SHELF = '#3c4a5e'
const SHELF_LIT = '#51617a'
const SHELF_DARK = '#2a3444'
const SHELF_CRACK = '#1a212d'
const SHELF_BARN = '#8d9bab'
const SHELF_WEED = '#2f6a4a'
const SHELF_WEED_LIT = '#4a9468'

/** A whole number of 2-pixel cells. */
const two = (n: number) => Math.round(n / 2) * 2

/**
 * One tile of the shelf, 120 by 120 px, in 2-px cells: basalt columns side
 * by side, each lit down its left edge and shaded down its right, their
 * cracks wandering whole cycles down it so it tiles; with `detail`, barnacles
 * and weed fronds sprinkled on.
 */
function shelfTile(
	base: string,
	lit: string,
	dark: string,
	crack: string,
	seed: number,
	detail: boolean,
) {
	const t = tile(120, 120)
	const random = seeded(seed)
	t.rect(0, 0, 120, 120, base)
	const colW = 24
	for (let c = 0; c < 5; c++) {
		const x0 = c * colW
		for (let y = 0; y < 120; y += 2) {
			const wob = two(
				Math.sin((y / 120) * Math.PI * 2 * (1 + (c % 2)) + c * 1.7) * 3,
			)
			t.rect(x0 + wob, y, 2, 2, crack)
			t.rect(x0 + wob + 2, y, 2, 2, lit)
			t.rect(
				x0 + wob - 4 < 0 ? x0 + wob - 4 + 120 : x0 + wob - 4,
				y,
				4,
				2,
				dark,
			)
		}
		// A joint or two across each column.
		for (let k = 0; k < 2; k++) {
			const y = two(random() * 116)
			const x = x0 + 6 + two(random() * 6)
			t.rect(x, y, 8 + two(random() * 6), 2, crack)
			t.rect(x, y + 2, 8, 2, dark)
		}
	}
	if (!detail) {
		// Hints only: a speck or two of pale.
		for (let i = 0; i < 5; i++)
			t.rect(two(random() * 116), two(random() * 116), 2, 2, lit)
		return { asset: t.url(), width: 120, height: 120 }
	}
	// Barnacles: little pale cones in clusters.
	for (let i = 0; i < 5; i++) {
		const cx = two(random() * 108)
		const cy = two(random() * 108)
		for (let b = 0; b < 3; b++) {
			const x = cx + two(random() * 8)
			const y = cy + two(random() * 6)
			t.rect(x, y, 4, 4, SHELF_BARN)
			t.rect(x + 2, y, 2, 4, '#69778a')
			t.rect(x + 1, y, 2, 2, SHELF_CRACK)
		}
	}
	// Weed fronds, rooted in a crack and swaying up.
	for (let i = 0; i < 6; i++) {
		let x = two(random() * 112)
		let y = 14 + two(random() * 100)
		const len = 5 + Math.floor(random() * 4)
		for (let s = 0; s < len; s++) {
			t.rect(x, y, 2, 4, s > len - 3 ? SHELF_WEED_LIT : SHELF_WEED)
			y -= 4
			x += s % 2 ? 2 : -2
		}
	}
	return { asset: t.url(), width: 120, height: 120 }
}

/**
 * The shelf under the sea, a huge reach of rock the swimmers go under by a
 * tunnel: `rock`, its face, dark blue-grey basalt in columns, cracked,
 * barnacled and hung with weed; `wall`, its back wall inside the tunnel,
 * the same, darker, almost blank. World pixels, 120 by 120 each.
 */
export const SHELF_TILES: CaveTiles = {
	rock: shelfTile(SHELF, SHELF_LIT, SHELF_DARK, SHELF_CRACK, 7301, true),
	wall: shelfTile('#222b39', '#2c3748', '#1a212c', '#12171f', 7302, false),
}
