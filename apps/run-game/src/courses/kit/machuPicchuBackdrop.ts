import { svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * Machu Picchu's nearer horizon bands, the ground behind the path: tall ones,
 * drawn on a grid of 2 px cells that wraps round at the edges, so each goes
 * round and round without a seam, and thins out toward its bottom, where the
 * path goes over it, down to the plain colour its `fill` carries on in.
 *
 * The cloud-forest hillside the Inca Trail climbs along, and the Urubamba
 * rushing past the railway down in the valley at Aguas Calientes.
 */

/** A band's width: as wide as the screen. */
const W = 960
const CELLS = W / 2
const TAU = Math.PI * 2

interface Band {
	asset: string
	height: number
	fill: string
}

type Random = () => number

/** A whole number from `a` to `b`, either end included. */
function between(random: Random, a: number, b: number) {
	return a + Math.floor(random() * (b - a + 1))
}

/** A wavy line, `base` down it, `amp` either way, whole numbers of waves across the band. */
function wave(seed: number, base: number, amp: number, waves: number[]) {
	const random = seeded(seed)
	const parts = waves.map((k) => ({
		k,
		phase: random() * TAU,
		size: 0.4 + random() * 0.6,
	}))
	const total = parts.reduce((sum, p) => sum + p.size, 0)
	return (x: number) =>
		base +
		(amp / total) *
			parts.reduce(
				(sum, p) => sum + p.size * Math.sin((TAU * p.k * x) / W + p.phase),
				0,
			)
}

/** Where a line is at a 2 px column starting at `x`, to the nearest 2 px. */
const at = (line: (x: number) => number, x: number) =>
	Math.round(line(x + 1) / 2) * 2

/**
 * A band's picture as a grid of 2 px cells. Anything set past either side
 * comes in on the other, so what's near an edge is drawn on both. `see`
 * is for what's see-through (mist), laid over the cells.
 */
class Grid {
	private readonly rows: number
	private readonly cells: (string | undefined)[]
	private readonly see: (string | undefined)[]

	constructor(readonly height: number) {
		this.rows = height / 2
		this.cells = new Array<string | undefined>(this.rows * CELLS)
		this.see = new Array<string | undefined>(this.rows * CELLS)
	}

	private index(x: number, y: number) {
		const row = Math.floor(y / 2)
		if (row < 0 || row >= this.rows) return -1
		return row * CELLS + (((Math.floor(x / 2) % CELLS) + CELLS) % CELLS)
	}

	set(x: number, y: number, colour: string) {
		const i = this.index(x, y)
		if (i >= 0) this.cells[i] = colour
	}

	get(x: number, y: number) {
		const i = this.index(x, y)
		return i >= 0 ? this.cells[i] : undefined
	}

	/** Set a cell only where there's nothing yet. */
	fillGap(x: number, y: number, colour: string) {
		if (!this.get(x, y)) this.set(x, y, colour)
	}

	haze(x: number, y: number, colour: string) {
		const i = this.index(x, y)
		if (i >= 0) this.see[i] = colour
	}

	rect(x: number, y: number, w: number, h: number, colour: string) {
		for (let j = 0; j < h; j += 2)
			for (let i = 0; i < w; i += 2) this.set(x + i, y + j, colour)
	}

	/** Under a line, on down to `bottom`. */
	under(
		line: (x: number) => number,
		paint: string | ((x: number, y: number) => string),
		bottom = this.height,
	) {
		for (let x = 0; x < W; x += 2)
			for (let y = Math.max(0, at(line, x)); y < bottom; y += 2)
				this.set(x, y, typeof paint === 'string' ? paint : paint(x, y))
	}

	/** A ball, its middle at `x`, `y`. */
	disc(x: number, y: number, r: number, colour: string) {
		for (let j = -r; j <= r; j += 2)
			for (let i = -r; i <= r; i += 2)
				if (i * i + j * j <= r * r) this.set(x + i, y + j, colour)
	}

	/** The picture: its cells joined up into as few rects as they'll go in. */
	svg() {
		const run = (cells: (string | undefined)[]) => {
			const out: { x: number; y: number; w: number; h: number; c: string }[] =
				[]
			const open = new Map<string, (typeof out)[number]>()
			for (let row = 0; row < this.rows; row++) {
				let col = 0
				while (col < CELLS) {
					const colour = cells[row * CELLS + col]
					if (!colour) {
						col++
						continue
					}
					let end = col + 1
					while (end < CELLS && cells[row * CELLS + end] === colour) end++
					const key = `${col},${end - col},${colour}`
					const above = open.get(key)
					if (above && above.y + above.h === row * 2) above.h += 2
					else {
						const rect = {
							x: col * 2,
							y: row * 2,
							w: (end - col) * 2,
							h: 2,
							c: colour,
						}
						out.push(rect)
						open.set(key, rect)
					}
					col = end
				}
			}
			return out
				.map(
					(r) =>
						`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.c}"/>`,
				)
				.join('')
		}
		return run(this.cells) + run(this.see)
	}

	band(fill: string): Band {
		return {
			asset: svgUrl(W, this.height, this.svg()),
			height: this.height,
			fill,
		}
	}
}

/** `a` or `b` in a checkerboard, to blend one into the other. */
const dither = (x: number, y: number, a: string, b: string) =>
	(Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? a : b

/** A clump of treetops: dark ball, a lit one up and to the left, a shaded edge. */
function clump(
	grid: Grid,
	x: number,
	y: number,
	r: number,
	body: string,
	lit: string,
	dark: string,
) {
	grid.disc(x, y + 2, r, dark)
	grid.disc(x, y, r, body)
	grid.disc(x - r / 3, y - r / 3, Math.max(2, r - 4), lit)
}

// --- The Inca Trail: the cloud-forest hillside ---------------------------------

const SLOPE_HEIGHT = 260

const SLOPE_GREEN = '#5d9a4c'
const SLOPE_DARK = '#457f3b'
const SLOPE_LIT = '#6fae58'
const SLOPE_GULLY = '#38683a'
const SLOPE_TRUNK = '#5a4a38'
const SLOPE_MOSS = '#9ab86a'
const FERN_FROND = '#3f8a46'
const FERN_LIT = '#7cc060'
const ROCK_WATER = '#f4f8f8'
const ROCK_WATER_SHADE = '#c8dcdc'
const STONE_LIT = '#b6b4ac'
const STONE = '#8f8d86'
const STONE_JOINT = '#6f6d67'
const STONE_FOOT = '#56544f'

/** A tall slender tree, trunk from `foot` up `height`, a small crown and moss hanging from its boughs. */
function mossy(
	grid: Grid,
	random: Random,
	x: number,
	foot: number,
	height: number,
) {
	for (let y = foot - height; y < foot; y += 2)
		grid.rect(x, y, 4, 2, SLOPE_TRUNK)
	const top = foot - height
	grid.disc(x + 2, top, 10, SLOPE_DARK)
	grid.disc(x, top - 2, 8, SLOPE_GREEN)
	grid.disc(x - 2, top - 4, 4, SLOPE_LIT)
	// Strands hanging from the crown and from boughs part way down.
	for (const [dx, from] of [
		[-8, top + 6],
		[10, top + 6],
		[-2, top + 14],
		[6, top + 18],
	] as const) {
		const len = between(random, 4, 9) * 2
		for (let j = 0; j < len; j += 2)
			grid.rect(x + dx + (j % 4 === 2 ? 2 : 0), from + j, 2, 2, SLOPE_MOSS)
	}
}

/** A tree fern, its fronds fanning from a short trunk at `x`, `y`. */
function treeFernCrown(
	grid: Grid,
	x: number,
	y: number,
	trunk: number,
	size: number,
) {
	for (let j = 0; j < trunk; j += 2) grid.rect(x, y + j, 2, 2, SLOPE_TRUNK)
	for (const dir of [-1, 1])
		for (let i = 2; i <= size; i += 2) {
			const droop = Math.floor((i * i) / (size * 2.2)) * 2
			grid.rect(x + dir * i, y + droop, 2, 2, FERN_FROND)
			if (i > 2 && i < size)
				grid.rect(x + dir * i, y + droop - 2, 2, 2, FERN_LIT)
		}
	for (let j = 2; j <= 6; j += 2) grid.rect(x, y - j, 2, 2, FERN_FROND)
	grid.rect(x - 2, y - 4, 2, 2, FERN_LIT)
}

/**
 * The cloud-forest hillside the Inca Trail climbs along, 260 px tall. A wavy
 * canopy line along the top, then forest going down the slope in rows of
 * treetops, green with a lit one on each and a dark shaded edge, the rows
 * smaller and sparser the nearer the bottom. A few tall slender trees stand
 * up above the canopy with moss hanging from their boughs, tree ferns spread
 * their crowns among the treetops, a wisp of mist lies in a fold of the
 * hill, a short stretch of old granite terrace wall and a stair show between
 * the trees, and a waterfall runs down one gully, a thread of white. It
 * thins toward the bottom, to plain trail green.
 */
export const TRAIL_SLOPE: Band = (() => {
	const random = seeded(8101)
	const grid = new Grid(SLOPE_HEIGHT)
	const top = wave(8102, 44, 10, [2, 3, 7])
	grid.under(top, SLOPE_GREEN)

	// Folds in the hill: darker gullies running down it, dithered at their edges.
	for (const [x, w, from] of [
		[560, 22, 70],
		[820, 18, 80],
		[130, 20, 84],
	] as const)
		for (let y = from; y < from + 90; y += 2) {
			const half = Math.round((w * (0.4 + (y - from) / 150)) / 4) * 2
			const sway = Math.round(Math.sin(y / 16 + x) * 2) * 2
			for (let i = -half; i <= half; i += 2)
				grid.set(
					x + sway + i,
					y,
					Math.abs(i) >= half - 2
						? dither(x + i, y, SLOPE_DARK, SLOPE_GULLY)
						: SLOPE_GULLY,
				)
		}

	// Rows of treetops down the slope, smaller and fewer going down.
	const rows = [
		{ y: 56, r: 12, n: 34 },
		{ y: 82, r: 10, n: 40 },
		{ y: 110, r: 8, n: 42 },
		{ y: 140, r: 8, n: 36 },
		{ y: 172, r: 6, n: 28 },
		{ y: 200, r: 6, n: 16 },
		{ y: 222, r: 4, n: 8 },
	]
	for (const row of rows)
		for (let i = 0; i < row.n; i++) {
			const x = between(random, 0, CELLS) * 2
			const y = row.y + between(random, -3, 3) * 2
			if (y < at(top, x) + 8) continue
			const r = row.r + between(random, -1, 1) * 2
			for (const shift of [-W, 0, W])
				clump(grid, x + shift, y, r, SLOPE_DARK, SLOPE_LIT, SLOPE_GULLY)
			// A fresh green lit top on some, so it isn't all one dark.
			if (random() < 0.5)
				grid.disc(x - 2, y - 2, Math.max(2, r - 6), SLOPE_GREEN)
		}

	// The waterfall down the gully at x 560: a thread of white, broken, with a pool of foam at its foot.
	for (let y = 92; y < 176; y += 2) {
		const sway = Math.round(Math.sin(y / 14) * 1) * 2
		const w = y < 120 ? 2 : y < 150 ? 4 : 2
		grid.rect(
			560 + sway - w / 2,
			y,
			w,
			2,
			(y / 2) % 7 === 0 ? ROCK_WATER_SHADE : ROCK_WATER,
		)
	}
	grid.rect(552, 176, 16, 2, ROCK_WATER)
	grid.rect(556, 178, 8, 2, ROCK_WATER_SHADE)
	// Rock on each side of its top, where it leaves the cliff.
	grid.rect(552, 88, 6, 4, STONE)
	grid.rect(564, 90, 6, 4, STONE_JOINT)

	// A stretch of old Inca terrace wall among the trees, and a stair climbing beside it.
	{
		const x0 = 214
		const y0 = 134
		for (let course = 0; course < 6; course++) {
			for (let x = 0; x < 130; x += 2) {
				const joint =
					(Math.floor(x / 2) + course * 3) % (5 + (course % 2)) === 0
				const colour =
					course === 0
						? STONE_LIT
						: course === 5
							? STONE_FOOT
							: joint
								? STONE_JOINT
								: STONE
				grid.rect(x0 + x, y0 + course * 2, 2, 2, colour)
			}
		}
		// Stair: steps rising to the right, each step lit on top.
		for (let s = 0; s < 7; s++) {
			const sx = x0 + 140 + s * 10
			const sy = y0 + 12 - s * 4
			grid.rect(sx, sy, 10, 2, STONE_LIT)
			grid.rect(sx, sy + 2, 10, 4, STONE)
		}
		// Bushes at the wall's foot, in front.
		for (const dx of [8, 48, 96, 126])
			clump(grid, x0 + dx, y0 + 16, 6, SLOPE_DARK, SLOPE_LIT, SLOPE_GULLY)
	}

	// Tree ferns in the canopy.
	for (const [x, y, trunk, size] of [
		[96, 86, 10, 14],
		[380, 108, 8, 12],
		[700, 98, 10, 14],
		[880, 128, 6, 10],
		[470, 152, 6, 10],
		[60, 160, 6, 8],
	] as const) {
		treeFernCrown(grid, x, y, trunk, size)
		if (x < 40 || x > W - 40)
			treeFernCrown(grid, x + (x < 40 ? W : -W), y, trunk, size)
	}

	// Tall slender trees with hanging moss, poking up above the canopy.
	for (const [x, foot, h] of [
		[40, 74, 44],
		[300, 80, 52],
		[430, 70, 38],
		[640, 78, 48],
		[760, 72, 36],
		[910, 84, 50],
	] as const) {
		mossy(grid, random, x, foot, h)
		if (x < 20 || x > W - 20)
			mossy(grid, random, x + (x < 20 ? W : -W), foot, h)
	}

	// Plain green at the bottom, the odd tuft further up.
	for (let n = 0; n < 90; n++) {
		const x = between(random, 0, CELLS) * 2
		const y = 190 + between(random, 0, 33) * 2
		if (random() > (y - 190) / 70 + 0.1)
			grid.rect(
				x,
				y,
				between(random, 1, 3) * 2,
				2,
				random() < 0.6 ? SLOPE_DARK : SLOPE_LIT,
			)
	}

	// Mist lying in a fold of the hill, see-through, so the trees show through.
	for (const [cx, cy, len] of [
		[470, 124, 260],
		[110, 176, 160],
	] as const)
		for (let dx = -len / 2; dx < len / 2; dx += 2) {
			const t = 1 - Math.abs(dx) / (len / 2)
			const h = Math.max(2, Math.round((2 + t * 8) / 2) * 2)
			const colour = `rgba(244,248,250,${(0.18 + t * 0.34).toFixed(2)})`
			for (let j = 0; j < h; j += 2)
				grid.haze(
					cx + dx,
					cy - h / 2 + j + (Math.floor(dx / 14) % 2) * 2,
					colour,
				)
		}

	return grid.band(SLOPE_GREEN)
})()

// --- Down in the valley: the Urubamba and the railway --------------------------

const URUBAMBA_HEIGHT = 240

const VALLEY_GREEN = '#4a8a3e'
const BANK_FOREST = '#3a7433'
const BANK_LIT = '#5a9a48'
const BANK_SHADE = '#2c5a2a'
const WATER = '#5f7f7a'
const WATER_LIGHT = '#7a8f86'
const WATER_DEEP = '#4a6a68'
const FOAM = '#e8f1ee'
const BOULDER = '#3a403d'
const BOULDER_LIT = '#5a625e'
const PEBBLE = '#8e8d86'
const PEBBLE_LIT = '#adaca4'
const PEBBLE_DARK = '#6c6b65'
const BALLAST = '#8a8478'
const BALLAST_DARK = '#6a655b'
const SLEEPER = '#5a4630'
const RAIL = '#9aa0a4'
const RAIL_DARK = '#5a5e62'
const LEAF = '#3f8f3a'
const LEAF_LIT = '#78b84c'
const LEAF_DARK = '#2f6e30'

/** A banana-leaf clump: broad leaves arching up and out from `x`, `y`. */
function bananaClump(
	grid: Grid,
	random: Random,
	x: number,
	y: number,
	size: number,
) {
	for (const shift of [-W, 0, W]) {
		for (const dir of [-1, 0, 1]) {
			const len = size - (dir === 0 ? 0 : between(random, 0, 2) * 2)
			for (let i = 0; i < len; i += 2) {
				// Up and out, then drooping over at the tip.
				const out = dir * (i + 2) * 0.8
				const lift = i < len * 0.6 ? i : len * 0.6 * 2 - i - 2
				const lx = Math.round((x + shift + out) / 2) * 2
				const ly = Math.round((y - lift) / 2) * 2
				grid.rect(lx, ly, 4, 2, dir < 0 ? LEAF_LIT : LEAF)
				grid.rect(lx, ly + 2, 4, 2, LEAF_DARK)
			}
		}
		grid.rect(x + shift - 2, y, 4, 4, LEAF_DARK)
	}
}

/**
 * The Urubamba past Aguas Calientes, 240 px tall. The forest on the far
 * bank runs along the top in a wavy canopy line, dark with a lit tuft on
 * each treetop. Below it the river, 36 px of grey-green white water in
 * bands, white rapids streaks across it, dark boulders with foam piling
 * against their upstream side. The near bank is grey stones, with the
 * railway to Aguas Calientes along it: a ballast bed, sleepers and two
 * rails. Then grass down to the path, with banana-leaf clumps and tufts. It
 * ends in plain valley green.
 */
export const URUBAMBA: Band = (() => {
	const random = seeded(8201)
	const grid = new Grid(URUBAMBA_HEIGHT)
	const RIVER_TOP = 92
	const RIVER_BOTTOM = 130

	// The far bank: forest, its canopy line wavy, treetops along it, shaded at its foot.
	const top = wave(8202, 30, 9, [2, 4, 7])
	grid.under(top, BANK_FOREST, RIVER_TOP)
	for (let i = 0; i < 90; i++) {
		const x = between(random, 0, CELLS) * 2
		const y = at(top, x) + between(random, 1, 14) * 2
		if (y > RIVER_TOP - 10) continue
		const r = between(random, 2, 4) * 2
		for (const shift of [-W, 0, W])
			clump(grid, x + shift, y, r, BANK_FOREST, BANK_LIT, BANK_SHADE)
	}
	for (let x = 0; x < W; x += 2)
		for (let y = RIVER_TOP - 8; y < RIVER_TOP; y += 2)
			grid.set(x, y, dither(x, y, BANK_SHADE, BANK_FOREST))
	// A few tall trees from the far bank against the sky.
	for (const x of [90, 330, 540, 790]) {
		for (const shift of [0]) {
			const y = at(top, x)
			grid.rect(x + shift, y - 10, 2, 12, '#4a3a2a')
			grid.disc(x + shift, y - 12, 6, BANK_FOREST)
			grid.disc(x + shift - 2, y - 14, 4, BANK_LIT)
		}
	}

	// The river: bands of water, each shifting a little along, white streaks on the rapids.
	const bandLine = wave(8203, 0, 3, [3, 6, 11])
	for (let x = 0; x < W; x += 2)
		for (let y = RIVER_TOP; y < RIVER_BOTTOM; y += 2) {
			const stripe = Math.floor((y + bandLine(x) * 2) / 6)
			const bandColour =
				stripe % 3 === 0 ? WATER_LIGHT : stripe % 3 === 1 ? WATER : WATER_DEEP
			grid.set(x, y, y < RIVER_TOP + 4 ? WATER_DEEP : bandColour)
		}
	for (let i = 0; i < 130; i++) {
		const x = between(random, 0, CELLS) * 2
		const y = RIVER_TOP + 4 + between(random, 0, 15) * 2
		const w = between(random, 2, 8) * 2
		for (const shift of [-W, 0, W]) grid.rect(x + shift, y, w, 2, FOAM)
	}
	// Boulders in the water, foam piling up against their upstream (left) side and spilling over.
	for (const [x, y, r] of [
		[70, 112, 8],
		[210, 104, 6],
		[360, 118, 10],
		[520, 108, 6],
		[640, 116, 8],
		[790, 106, 8],
		[910, 118, 6],
	] as const) {
		for (const shift of [-W, 0, W]) {
			const bx = x + shift
			grid.rect(bx - r - 6, y - 2, r - 2, 2, FOAM)
			grid.rect(bx - r - 4, y, r, 2, FOAM)
			grid.rect(bx - r - 2, y + 2, r, 2, FOAM)
			grid.disc(bx, y, r, BOULDER)
			grid.disc(bx - 2, y - 2, r - 4, BOULDER_LIT)
			grid.rect(bx + r - 2, y + r - 4, r + 6, 2, FOAM)
			grid.rect(bx + r + 2, y + r - 2, r, 2, WATER_LIGHT)
		}
	}

	// The near bank: grey stones going down to the railway, scattered over a darker bed.
	const bankTop = wave(8204, RIVER_BOTTOM, 3, [4, 9])
	grid.under(bankTop, PEBBLE_DARK, 172)
	for (let x = 0; x < W; x += 2) {
		const t = at(bankTop, x)
		grid.set(x, t, FOAM)
		grid.set(x, t + 2, WATER_LIGHT)
	}
	for (let i = 0; i < 130; i++) {
		const x = between(random, 0, CELLS) * 2
		const y = RIVER_BOTTOM + 6 + between(random, 0, 16) * 2
		const w = between(random, 2, 5) * 2
		for (const shift of [-W, 0, W]) {
			grid.rect(x + shift, y, w, 4, PEBBLE)
			grid.rect(x + shift, y - 2, w - 2, 2, PEBBLE_LIT)
			grid.rect(x + shift, y + 4, w, 2, PEBBLE_DARK)
		}
	}

	// The railway: a ballast bed with sleepers, a rail at the back and a rail at the front.
	const RAIL_Y = 174
	grid.rect(0, RAIL_Y - 2, W, 14, BALLAST)
	for (let x = 0; x < W; x += 2) {
		if ((x / 2) % 3 === 0) grid.rect(x, RAIL_Y + 8, 2, 2, BALLAST_DARK)
		grid.set(x, RAIL_Y + 10, BALLAST_DARK)
		grid.set(x, RAIL_Y + 12, dither(x, RAIL_Y + 12, BALLAST_DARK, VALLEY_GREEN))
	}
	for (let x = 0; x < W; x += 12) grid.rect(x, RAIL_Y, 4, 10, SLEEPER)
	grid.rect(0, RAIL_Y, W, 2, RAIL_DARK)
	grid.rect(0, RAIL_Y + 6, W, 2, RAIL)
	grid.rect(0, RAIL_Y - 2, W, 2, BALLAST_DARK)

	// Grass down to the path, banana clumps and tufts, fewer the lower down.
	for (let x = 0; x < W; x += 2)
		for (let y = RAIL_Y + 14; y < URUBAMBA_HEIGHT; y += 2)
			grid.set(x, y, VALLEY_GREEN)
	for (let n = 0; n < 150; n++) {
		const x = between(random, 0, CELLS) * 2
		const y = RAIL_Y + 14 + between(random, 0, 31) * 2
		if (random() > (y - 176) / 60 + 0.15)
			grid.rect(
				x,
				y,
				between(random, 1, 2) * 2,
				2,
				random() < 0.5 ? BANK_FOREST : '#62a04a',
			)
	}
	for (const [x, y, size] of [
		[60, 214, 22],
		[250, 204, 18],
		[430, 218, 24],
		[610, 206, 18],
		[790, 216, 22],
		[900, 204, 14],
	] as const)
		bananaClump(grid, random, x, y, size * 2)
	for (const [x, y] of [
		[160, 226],
		[340, 230],
		[520, 228],
		[700, 232],
		[860, 228],
	] as const)
		for (let k = -1; k <= 1; k++)
			grid.rect(
				x + k * 4,
				y - 4 + Math.abs(k) * 2,
				2,
				6 - Math.abs(k) * 2,
				LEAF,
			)

	return grid.band(VALLEY_GREEN)
})()
