import type { CaveTiles } from '../types'
import { svgUrl, tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Rocket Launch's alien base, drawn in code: inside its glass domes, the
 * alien jungle, the glass itself, its plants and trees, its consoles and
 * signs; the boss's chamber, its walls and its doors; and the cage the
 * prisoner hangs in. A cell to a pixel, drawn twice its size as scenery
 * (`scale: 2`), unless it says it's in world pixels (the tiles).
 */

// --- Tools -------------------------------------------------------------------

/** A set of cells on a `w` by `h` grid, optionally wrapping round its edges. */
class Mask {
	readonly on = new Set<number>()
	constructor(
		readonly w: number,
		readonly h: number,
		readonly wrapX = false,
		readonly wrapY = false,
	) {}
	private key(fx: number, fy: number) {
		let x = Math.round(fx)
		let y = Math.round(fy)
		if (this.wrapX) x = ((x % this.w) + this.w) % this.w
		else if (x < 0 || x >= this.w) return -1
		if (this.wrapY) y = ((y % this.h) + this.h) % this.h
		else if (y < 0 || y >= this.h) return -1
		return y * this.w + x
	}
	add(x: number, y: number) {
		const k = this.key(x, y)
		if (k >= 0) this.on.add(k)
		return this
	}
	has(x: number, y: number) {
		const k = this.key(x, y)
		return k >= 0 && this.on.has(k)
	}
	rect(x: number, y: number, w: number, h: number) {
		for (let j = 0; j < h; j++)
			for (let i = 0; i < w; i++) this.add(x + i, y + j)
		return this
	}
	/** A filled ellipse round `cx`, `cy`. */
	disc(cx: number, cy: number, rx: number, ry = rx) {
		for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
			for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
				if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1)
					this.add(x, y)
		return this
	}
	/** A stepped line from one point to another, `w` cells thick (`w1` at its far end, if it tapers). */
	line(x0: number, y0: number, x1: number, y1: number, w = 1, w1 = w) {
		const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2
		for (let i = 0; i <= n; i++) {
			const t = i / n
			const r = (w + (w1 - w) * t) / 2
			this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Math.max(r, 0.5))
		}
		return this
	}
}

/** A picture, a cell at a time, painted in order. */
class Grid {
	readonly cells: (string | undefined)[]
	constructor(
		readonly w: number,
		readonly h: number,
	) {
		this.cells = new Array(w * h)
	}
	set(fx: number, fy: number, c: string | undefined) {
		const x = Math.round(fx)
		const y = Math.round(fy)
		if (x >= 0 && x < this.w && y >= 0 && y < this.h)
			this.cells[y * this.w + x] = c
		return this
	}
	rect(x: number, y: number, w: number, h: number, c: string | undefined) {
		for (let j = 0; j < h; j++)
			for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
		return this
	}
	/** A mask in one flat colour. */
	flat(m: Mask, c: string) {
		for (const k of m.on) this.set(k % m.w, Math.floor(k / m.w), c)
		return this
	}
	/** A mask in its base colour, lit along its top edges and shaded along its undersides. */
	shade(m: Mask, base: string, lit: string, dark: string) {
		for (const k of m.on) {
			const x = k % m.w
			const y = Math.floor(k / m.w)
			const above = y > 0 && m.has(x, y - 1)
			const below = y >= m.h - 1 || m.has(x, y + 1)
			this.set(x, y, !above ? lit : !below ? dark : base)
		}
		return this
	}
	/** As an image's URL, `scale` px a cell. */
	url(scale = 1) {
		let body = ''
		for (let y = 0; y < this.h; y++) {
			let from = 0
			let c: string | undefined
			for (let x = 0; x <= this.w; x++) {
				const here = x < this.w ? this.cells[y * this.w + x] : undefined
				if (here !== c) {
					if (c)
						body += `<rect x="${from * scale}" y="${y * scale}" width="${(x - from) * scale}" height="${scale}" fill="${c}"/>`
					from = x
					c = here
				}
			}
		}
		return svgUrl(this.w * scale, this.h * scale, body)
	}
}

/** Letters to cells: rows of a glyph, `#` lit. */
const stamp = (g: Grid, x: number, y: number, rows: string[], c: string) => {
	rows.forEach((row, j) =>
		[...row].forEach((ch, i) => {
			if (ch === '#') g.set(x + i, y + j, c)
		}),
	)
}

// --- Colours -----------------------------------------------------------------

/** The glass: pale frame, panes of teal and sky, glints. */
const FRAME = '#f2f8f6'
const FRAME_SHADE = '#c6dbd6'
const PANE = '#93d3cc'
const PANE_SKY = '#aee0e6'
const PANE_JUNGLE = '#86cfb0'
const PANE_GLINT = '#d2f2ee'
/** Jungle behind the glass: deep green, its leaves, and glow. */
const JUNGLE = '#1f5646'
const JUNGLE_LIT = '#2c6c58'
const JUNGLE_DARK = '#194536'
const GLOW = '#6fe0a0'
/** The far canopy, then the near. */
const FAR = '#2f6f63'
const FAR_LIT = '#3d8575'
const FAR_DARK = '#285f54'
const NEAR = '#245a4c'
const NEAR_LIT = '#2f7060'
const NEAR_DARK = '#1b4639'
const POD_PINK = '#d06ad8'
const POD_CYAN = '#7ff0e0'
const POD_GOLD = '#f0d860'
/** Dark metal, its rivets and glowing seams. */
const PLATE = '#454a5c'
const PLATE_LIT = '#5a6076'
const PLATE_DARK = '#363a4a'
const RIVET = '#8088a0'
const SEAM = '#5af0b0'
const SEAM_DIM = '#2f8a72'
const METAL_WALL = '#2d3040'
const METAL_WALL_DARK = '#232634'
const METAL_WALL_RIVET = '#41465a'
/** Alien trees: violet trunks, green fronds. */
const TRUNK = '#5b4b7a'
const TRUNK_LIT = '#7a65a0'
const TRUNK_DARK = '#43375c'
const FROND = '#3fbf8a'
const FROND_LIT = '#72e4ae'
const FROND_DARK = '#2a8f6a'
/** A console's steel. */
const STEEL = '#5a6b80'
const STEEL_LIT = '#7c8fa6'
const STEEL_DARK = '#3d4a5c'
const SCREEN = '#1d3f44'
const INK = '#1d1d1d'
/** A cage's bars. */
const BAR = '#8a8fa0'
const BAR_LIT = '#b5bacb'
const BAR_DARK = '#5a5f70'
const LAMP = '#f0b030'

// --- The glass and the walls --------------------------------------------------

/** A tile of `w` by `h` cells, drawn by `paint`, as a 2-pixel-cell asset. */
function makeTile(
	cells: number,
	paint: (g: Grid) => void,
): { asset: string; width: number; height: number } {
	const g = new Grid(cells, cells)
	paint(g)
	return { asset: g.url(2), width: cells * 2, height: cells * 2 }
}
const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * A dome's glass: diamond panes in a white frame, some looking out at the
 * sky, some into the jungle, a glint in each. 32 px, to tile.
 */
const glassTile = () =>
	makeTile(16, (g) => {
		const PANES = [PANE, PANE_SKY, PANE_JUNGLE, PANE]
		for (let y = 0; y < 16; y++)
			for (let x = 0; x < 16; x++) {
				const u = x + y
				const v = x - y
				const onU = mod(u, 8) <= 1
				const onV = mod(v, 8) <= 1
				if (onU || onV) {
					// The frame's lower-right edges are in shade.
					g.set(x, y, mod(u, 8) === 1 && !onV ? FRAME_SHADE : FRAME)
				} else {
					const pane = mod(Math.floor(u / 8), 2) * 2 + mod(Math.floor(v / 8), 2)
					g.set(x, y, PANES[pane])
				}
			}
		// A glint in each pane, up its left corner.
		for (const [x, y] of [
			[4, 1],
			[8, 5],
			[0, 13],
			[12, 9],
		])
			g.set(x, y, PANE_GLINT)
	})

/** Behind the glass: the deep jungle, a few big leaves, a glow here and there. 32 px. */
const jungleTile = () =>
	makeTile(16, (g) => {
		g.rect(0, 0, 16, 16, JUNGLE)
		const leaves = new Mask(16, 16, true, true)
		for (const [x, y, len, lean] of [
			[3, 1, 6, 1],
			[11, 5, 7, -1],
			[5, 10, 5, 1],
			[14, 13, 4, -1],
		])
			leaves.line(x, y, x + lean * 2, y + len, 2, 1)
		g.shade(leaves, JUNGLE_DARK, JUNGLE_LIT, JUNGLE_DARK)
		// A glowing spore or two.
		g.set(8, 4, GLOW)
		g.set(1, 11, GLOW)
	})

/** The glass, over the jungle behind it. World pixels. */
export const DOME_TILES: CaveTiles = {
	rock: glassTile(),
	wall: jungleTile(),
}

/** A plated panel of the chamber's hull: riveted, with a seam that glows. 32 px. */
const plateTile = () =>
	makeTile(16, (g) => {
		g.rect(0, 0, 16, 16, PLATE)
		g.rect(0, 0, 16, 1, PLATE_LIT)
		g.rect(0, 0, 1, 16, PLATE_LIT)
		g.rect(0, 15, 16, 1, PLATE_DARK)
		g.rect(15, 0, 1, 16, PLATE_DARK)
		// Rivets in its corners.
		for (const [x, y] of [
			[2, 2],
			[13, 2],
			[2, 13],
			[13, 13],
		])
			g.set(x, y, RIVET)
		// A seam that glows, down its right edge and across the middle.
		g.rect(15, 4, 1, 8, SEAM)
		g.rect(14, 4, 1, 8, SEAM_DIM)
		g.rect(5, 8, 5, 1, SEAM_DIM)
		g.rect(6, 8, 3, 1, SEAM)
	})

/** Behind it: darker plates, rivets, a faint glow along a seam. 32 px. */
const metalWallTile = () =>
	makeTile(16, (g) => {
		g.rect(0, 0, 16, 16, METAL_WALL)
		g.rect(0, 7, 16, 1, METAL_WALL_DARK)
		g.rect(0, 15, 16, 1, METAL_WALL_DARK)
		g.rect(7, 0, 1, 8, METAL_WALL_DARK)
		g.rect(15, 8, 1, 8, METAL_WALL_DARK)
		for (const [x, y] of [
			[2, 2],
			[12, 2],
			[2, 10],
			[10, 10],
		])
			g.set(x, y, METAL_WALL_RIVET)
		g.rect(0, 8, 16, 1, SEAM_DIM)
		g.rect(4, 8, 6, 1, '#3aa890')
	})

/** The boss's chamber's walls: dark metal plates, rivets, glowing seams. */
export const CHAMBER_TILES: CaveTiles = {
	rock: plateTile(),
	wall: metalWallTile(),
}

// --- Inside the dome ---------------------------------------------------------

const BAND_W = 480
const BAND_H = 80

/**
 * A canopy band, 960 by 160 px: rounded crowns of jungle in a row, tall
 * fronds fanned up out of some, and glowing pods. All of it wraps.
 */
function canopy(o: {
	seed: number
	count: number
	/** Crowns' centre row, and their radii. */
	row: number
	minR: number
	maxR: number
	fronds: number
	frond: number
	colours: [string, string, string]
	frondColour: string
	pods: string[]
	podCount: number
}) {
	const random = seeded(o.seed)
	const g = new Grid(BAND_W, BAND_H)
	const crowns = new Mask(BAND_W, BAND_H, true)
	const step = BAND_W / o.count
	for (let i = 0; i < o.count; i++) {
		const cx = Math.round(i * step + (random() - 0.5) * step * 0.5)
		const r = o.minR + random() * (o.maxR - o.minR)
		const cy = o.row + (random() - 0.5) * 8
		crowns.disc(cx, cy, r, r * 0.8)
	}
	crowns.rect(0, o.row, BAND_W, BAND_H)
	// Giant fronds fanned up and over, tips drooping.
	const fronds = new Mask(BAND_W, BAND_H, true)
	for (let i = 0; i < o.fronds; i++) {
		const cx = Math.round(
			(i + 0.5) * (BAND_W / o.fronds) + (random() - 0.5) * 20,
		)
		const base = o.row - o.minR * 0.8
		for (const d of [-1, -0.6, -0.25, 0.25, 0.6, 1]) {
			const len = o.frond * (0.7 + random() * 0.4)
			let px = cx
			let py = base
			for (let t = 1; t <= 14; t++) {
				const f = t / 14
				const x = cx + d * len * f
				const y = base - len * 1.3 * f + len * 1.5 * Math.abs(d) * f * f
				fronds.line(px, py, x, y, 4 - f * 3, 4 - f * 3)
				px = x
				py = y
			}
		}
	}
	const [base, lit, dark] = o.colours
	g.shade(fronds, o.frondColour, lit, dark)
	g.shade(crowns, base, lit, dark)
	// A few darker leaves in the crowns, so they aren't blank.
	for (let i = 0; i < o.count * 6; i++) {
		const x = Math.floor(random() * BAND_W)
		const y = o.row - o.minR * 0.4 + Math.floor(random() * o.minR * 1.2)
		if (crowns.has(x, y) && crowns.has(x + 3, y + 1)) {
			g.rect(x, y, 3, 1, dark)
			g.rect(x + 1, y + 1, 2, 1, dark)
		}
	}
	// Glowing pods, a small bright core to each.
	for (let i = 0; i < o.podCount; i++) {
		const x = Math.floor(random() * (BAND_W - 4))
		const y = o.row - o.minR * 0.5 + Math.floor(random() * o.minR * 1.4)
		if (crowns.has(x, y) && crowns.has(x + 3, y + 3)) {
			const c = o.pods[i % o.pods.length]
			g.rect(x, y, 2, 2, c)
			g.set(x, y, '#ffffff')
		}
	}
	return g.url(2)
}

/** Far in the dome: pale, bluish canopy, a few pods glowing, fronds standing up out of it. */
export const DOME_FAR = canopy({
	seed: 4401,
	count: 16,
	row: 36,
	minR: 12,
	maxR: 18,
	fronds: 6,
	frond: 20,
	colours: [FAR, FAR_LIT, FAR_DARK],
	frondColour: '#2b6a5e',
	pods: [POD_CYAN, POD_GOLD],
	podCount: 26,
})
/** Nearer: darker, bigger crowns, fronds, and bright pods. */
export const DOME_NEAR = canopy({
	seed: 4402,
	count: 12,
	row: 50,
	minR: 16,
	maxR: 24,
	fronds: 5,
	frond: 28,
	colours: [NEAR, NEAR_LIT, NEAR_DARK],
	frondColour: '#1f5242',
	pods: [POD_PINK, POD_CYAN, POD_GOLD],
	podCount: 24,
})
export const DOME_FILL = '#1f4c40'
export const DOME_SKY: [string, string] = ['#0e2a33', '#2e7f7a']

// --- Plants and trees --------------------------------------------------------

/**
 * A tall alien tree: a leaning violet trunk in rings, and a crown of big
 * drooping fronds with golden fruit hanging under them. 44 by 90 cells.
 */
export const frondTree = (() => {
	const g = new Grid(44, 90)
	const trunk = new Mask(44, 90)
	// It leans a little, and is wider at the foot.
	trunk.line(22, 89, 22, 70, 7, 5)
	trunk.line(22, 70, 23, 50, 5, 4)
	trunk.line(23, 50, 22, 34, 4, 4)
	g.shade(trunk, TRUNK, TRUNK_LIT, TRUNK_DARK)
	// Rings round it.
	for (let y = 82; y > 36; y -= 6) {
		const w = y > 70 ? 6 : y > 50 ? 4 : 3
		for (let x = 0; x < 44; x++)
			if (trunk.has(x, y) && trunk.has(x + w - 1, y)) {
				g.rect(x, y, w, 1, TRUNK_DARK)
				break
			}
	}
	// Roots.
	g.rect(15, 88, 5, 2, TRUNK)
	g.rect(24, 88, 6, 2, TRUNK)
	g.rect(14, 89, 3, 1, TRUNK_DARK)
	g.rect(28, 89, 3, 1, TRUNK_DARK)
	// The fronds: out and up from the top, then drooping.
	const fronds = new Mask(44, 90)
	const top = [22, 33]
	for (const [dx, up, len] of [
		[-1, 0.9, 20],
		[-0.7, 1.5, 19],
		[0, 1.9, 14],
		[0.7, 1.5, 19],
		[1, 0.9, 20],
		[-0.45, 1.1, 22],
		[0.45, 1.1, 22],
	]) {
		let px = top[0]
		let py = top[1]
		for (let t = 1; t <= 16; t++) {
			const f = t / 16
			const x = top[0] + dx * len * f
			const y =
				top[1] -
				up * 11 * Math.sin(f * Math.PI * 0.9) +
				14 * f * f * Math.abs(dx || 0.3)
			fronds.line(px, py, x, y, 7 - f * 6, 7 - f * 6)
			px = x
			py = y
		}
	}
	g.shade(fronds, FROND, FROND_LIT, FROND_DARK)
	// A vein up the middle of the bigger fronds' first stretch.
	g.rect(20, 28, 1, 4, FROND_DARK)
	// Golden fruit hanging under the crown.
	for (const [x, y] of [
		[19, 38],
		[25, 40],
		[22, 43],
	]) {
		g.rect(x, y, 3, 3, POD_GOLD)
		g.set(x, y, '#fff6b0')
		g.rect(x + 1, y + 2, 2, 1, '#c8a838')
	}
	return g.url(1)
})()

/** A glowing pod plant: a bulb of pink light on a stem, between two leaves, small pods about it. 26 by 34 cells. */
export const podPlant = (() => {
	const g = new Grid(26, 34)
	const leaves = new Mask(26, 34)
	leaves.line(13, 33, 3, 22, 3, 2)
	leaves.line(13, 33, 23, 24, 3, 2)
	leaves.line(13, 33, 7, 28, 2, 1)
	g.shade(leaves, FROND, FROND_LIT, FROND_DARK)
	const stem = new Mask(26, 34)
	stem.line(13, 33, 13, 16, 2, 2)
	g.shade(stem, FROND_DARK, FROND, '#1f6e50')
	// The bulb, its glowing heart showing through a slit.
	const bulb = new Mask(26, 34)
	bulb.disc(13, 10, 8, 9)
	g.shade(bulb, POD_PINK, '#ec9af0', '#a048b0')
	g.rect(11, 5, 4, 10, '#ffe8ff')
	g.rect(12, 4, 2, 12, '#ffffff')
	g.rect(11, 15, 4, 1, '#f0b8f4')
	g.rect(6, 12, 2, 1, '#a048b0')
	g.rect(18, 8, 2, 1, '#a048b0')
	// Two small pods.
	g.rect(4, 26, 3, 3, POD_CYAN)
	g.set(4, 26, '#ffffff')
	g.rect(21, 29, 3, 3, POD_CYAN)
	g.set(21, 29, '#ffffff')
	return g.url(1)
})()

/** A tentacle bush: orange tentacles curling up out of a mound, suckers along them. 30 by 24 cells. */
export const tentacleBush = (() => {
	const g = new Grid(30, 24)
	const arms = new Mask(30, 24)
	const mound = new Mask(30, 24)
	mound.disc(15, 25, 13, 6)
	for (const [x0, x1, y1, curl] of [
		[8, 4, 6, -1],
		[11, 9, 3, 1],
		[15, 15, 1, -1],
		[19, 21, 4, 1],
		[22, 26, 8, -1],
	]) {
		let px = x0
		let py = 20
		for (let t = 1; t <= 12; t++) {
			const f = t / 12
			const x = x0 + (x1 - x0) * f + curl * Math.sin(f * Math.PI * 1.5) * 3
			const y = 20 + (y1 - 20) * f
			arms.line(px, py, x, y, 5 - f * 3.5, 5 - f * 3.5)
			px = x
			py = y
		}
		// The tip curls over.
		arms.line(px, py, px + curl * 2, py + 2, 1, 1)
	}
	g.shade(arms, '#e0905a', '#f2b47c', '#b86a3e')
	g.shade(mound, '#b86a3e', '#d08050', '#8f4e2e')
	// Suckers.
	for (const [x, y] of [
		[7, 14],
		[10, 11],
		[15, 9],
		[20, 12],
		[24, 15],
		[15, 15],
	])
		if (arms.has(x, y)) g.set(x, y, '#8f4e2e')
	return g.url(1)
})()

// --- Inside the dome: ribs, silhouettes and hangings ---------------------------

/** The ribs' white metal, and the deep silhouettes' teal. */
const RIB_LIT = '#ffffff'
const RIB_DARK = '#9fbab4'
const SIL = '#2b6156'
const SIL_LIT = '#2f6a5e'
const SIL_DARK = '#275a50'

/**
 * One of the dome's white ribs: a tall member of the frame, a column with
 * lit left and shaded right, a collar with bolts at each joint, flared at
 * the foot into a bolted plate with moss at its base. A cell a pixel,
 * 14 cells wide; `h` tall, and the glass covers its top.
 */
const rib = (h: number) => {
	const g = new Grid(14, h)
	// The column.
	g.rect(3, 0, 8, h, FRAME)
	g.rect(3, 0, 1, h, RIB_LIT)
	g.rect(9, 0, 1, h, FRAME_SHADE)
	g.rect(10, 0, 1, h, RIB_DARK)
	// A groove down it, broken, where its two halves meet.
	for (let y = 2; y < h - 16; y += 6) g.rect(6, y, 1, 3, FRAME_SHADE)
	// Collars at the joints, bolted.
	for (let y = h - 34; y > 4; y -= 48) {
		g.rect(1, y, 12, 6, FRAME)
		g.rect(1, y, 12, 1, RIB_LIT)
		g.rect(1, y + 5, 12, 1, RIB_DARK)
		g.rect(12, y + 1, 1, 4, FRAME_SHADE)
		for (const x of [3, 9]) {
			g.set(x, y + 2, RIB_DARK)
			g.set(x, y + 3, RIB_DARK)
		}
	}
	// Flared into its foot, on a plate.
	g.rect(2, h - 14, 10, 4, FRAME)
	g.rect(2, h - 14, 10, 1, RIB_LIT)
	g.rect(1, h - 10, 12, 4, FRAME)
	g.rect(1, h - 10, 12, 1, RIB_LIT)
	g.rect(1, h - 7, 12, 1, FRAME_SHADE)
	g.rect(0, h - 6, 14, 6, FRAME)
	g.rect(0, h - 6, 14, 1, RIB_LIT)
	g.rect(0, h - 2, 14, 2, RIB_DARK)
	g.rect(12, h - 14, 1, 8, FRAME_SHADE)
	for (const x of [2, 11]) {
		g.set(x, h - 4, RIB_DARK)
		g.set(x, h - 3, RIB_DARK)
	}
	// Moss creeping up from the floor.
	for (const [x, y, w] of [
		[0, 1, 4],
		[5, 1, 3],
		[10, 1, 4],
		[1, 2, 2],
		[11, 2, 2],
	])
		g.rect(x, h - y - 1, w, 1, FROND_DARK)
	g.set(2, h - 3, FROND)
	g.set(11, h - 3, FROND)
	return { asset: g.url(1), width: 14, height: h }
}

/** A white rib of the dome's frame, a floor to the glass. 14 by 240 cells. */
export const DOME_RIB = rib(240)
/** A short rib, for the low necks between domes. 14 by 150 cells. */
export const DOME_RIB_SHORT = rib(150)

/** A fan of drooping fronds out of one point: for the silhouettes. */
const fan = (
	m: Mask,
	at: [number, number],
	spokes: [dx: number, up: number, len: number][],
	thick: number,
) => {
	for (const [dx, up, len] of spokes) {
		let px = at[0]
		let py = at[1]
		for (let t = 1; t <= 18; t++) {
			const f = t / 18
			const x = at[0] + dx * len * f
			const y =
				at[1] -
				up * 16 * Math.sin(f * Math.PI * 0.9) +
				22 * f * f * Math.abs(dx || 0.3)
			m.line(
				px,
				py,
				x,
				y,
				thick * (1 - f * 0.85) + 1,
				thick * (1 - f * 0.85) + 1,
			)
			px = x
			py = y
		}
	}
}

/** A silhouette, three tones of the same deep teal, barely there. */
const silhouette = (g: Grid, m: Mask) => g.shade(m, SIL, SIL_LIT, SIL_DARK)

/**
 * Deep behind: a huge alien tree as a dark-teal silhouette, a leaning trunk
 * and a fan of great drooping fronds. 50 by 120 cells.
 */
export const backTreeSilhouette = (() => {
	const g = new Grid(50, 120)
	const m = new Mask(50, 120)
	m.line(20, 119, 20, 100, 9, 7)
	m.line(20, 100, 24, 70, 7, 5)
	m.line(24, 70, 27, 44, 5, 4)
	m.rect(12, 116, 7, 4)
	m.rect(26, 116, 8, 4)
	fan(
		m,
		[27, 44],
		[
			[-1, 0.8, 24],
			[-0.65, 1.4, 22],
			[0, 1.9, 14],
			[0.65, 1.4, 22],
			[1, 0.8, 22],
			[-0.4, 1, 26],
			[0.4, 1, 26],
		],
		9,
	)
	silhouette(g, m)
	return g.url(1)
})()

/**
 * A second, different one: a forking tree whose branches each hold up a
 * round, tiered crown, with roots hanging down from it. 50 by 120 cells.
 */
export const backTreeSilhouette2 = (() => {
	const g = new Grid(50, 120)
	const m = new Mask(50, 120)
	m.line(25, 119, 25, 90, 8, 6)
	m.line(25, 90, 14, 62, 5, 3)
	m.line(25, 90, 38, 58, 5, 3)
	m.line(25, 90, 26, 46, 5, 3)
	m.line(14, 62, 8, 46, 3, 2)
	m.line(38, 58, 44, 40, 3, 2)
	// Crowns, in tiers, each wider than the one above.
	for (const [cx, cy, rx] of [
		[8, 42, 8],
		[44, 36, 7],
		[26, 30, 12],
		[14, 54, 8],
		[38, 50, 9],
	]) {
		m.disc(cx, cy, rx, 5)
		m.disc(cx, cy - 6, rx * 0.6, 4)
		m.disc(cx, cy - 11, rx * 0.3, 3)
	}
	// Roots, hanging from the crowns.
	for (const [x, y, len] of [
		[4, 46, 14],
		[12, 59, 10],
		[34, 55, 12],
		[43, 41, 16],
		[22, 36, 12],
		[30, 36, 8],
	])
		m.line(x, y, x + 1, y + len, 1, 1)
	silhouette(g, m)
	return g.url(1)
})()

/**
 * Creepers hanging down from the glass, from a tangle at the top, some
 * with leaves, and glowing buds at their ends. 30 by 60 cells.
 */
export const hangingVines = (() => {
	const g = new Grid(30, 60)
	const vines = new Mask(30, 60)
	const leaves = new Mask(30, 60)
	// The tangle at the top.
	vines.line(0, 1, 29, 2, 3, 3)
	vines.line(3, 3, 26, 1, 2, 2)
	for (const [x, len, sway, bud] of [
		[3, 30, 2, 0],
		[8, 52, -3, 1],
		[13, 22, 2, 2],
		[18, 44, 3, 0],
		[23, 34, -2, 1],
		[27, 18, 1, 2],
	])
		for (let y = 2; y < len; y++) {
			const px = x + Math.round(Math.sin(y / 5 + x) * sway)
			vines.add(px, y)
			// A leaf now and then, pointing out.
			if (y % 9 === 5 && y < len - 6) {
				const d = sway > 0 ? 1 : -1
				leaves.line(px, y, px + d * 4, y + 2, 2, 1)
			}
			if (y === len - 1) {
				const colours = [POD_CYAN, POD_PINK, POD_GOLD]
				const c = colours[bud]
				g.rect(px - 1, y + 1, 3, 3, c)
				g.set(px - 1, y + 1, '#ffffff')
				g.rect(
					px,
					y + 3,
					1,
					1,
					bud === 2 ? '#c8a838' : bud === 1 ? '#a048b0' : '#3fb8a8',
				)
			}
		}
	g.shade(vines, FROND_DARK, FROND, '#1f6e50')
	g.shade(leaves, FROND, FROND_LIT, FROND_DARK)
	// A bud in the tangle, too.
	g.rect(14, 4, 2, 2, POD_GOLD)
	g.set(14, 4, '#ffffff')
	return g.url(1)
})()

/** The plants' stems. */
const STEM = '#2a8f6a'
const STEM_LIT = '#3fbf8a'
const STEM_DARK = '#1f6e50'

/**
 * A spiral fern: fronds fanned up from the ground, each ending in a tight
 * curled fiddlehead, tiny leaflets down both sides. 20 by 30 cells.
 */
export const spiralFern = (() => {
	const g = new Grid(20, 30)
	const m = new Mask(20, 30)
	// [foot x, tip x, tip y, curl radius, which way it curls]
	for (const [x0, x1, y1, r, flip] of [
		[10, 10, 12, 5, 1],
		[8, 4, 19, 3, -1],
		[12, 16, 20, 3, 1],
	]) {
		let px = x0
		let py = 29
		for (let t = 1; t <= 10; t++) {
			const f = t / 10
			const x = x0 + (x1 - x0) * f
			const y = 29 + (y1 - 29) * f
			m.line(px, py, x, y, 2, 2)
			px = x
			py = y
		}
		// The curl: round to a centre beside the stem's tip, tighter as it goes.
		const cx0 = x1 + flip * r
		for (let a = 0; a <= 1; a += 0.03) {
			const ang = Math.PI + a * Math.PI * 2.4
			const rr = r * (1 - a * 0.8)
			const x = cx0 + flip * Math.cos(ang) * rr
			const y = y1 + Math.sin(ang) * rr
			m.line(px, py, x, y, a < 0.5 ? 2 : 1, a < 0.5 ? 2 : 1)
			px = x
			py = y
		}
	}
	g.shade(m, STEM, STEM_LIT, STEM_DARK)
	// Leaflets down the main frond's sides.
	const leaflets = new Mask(20, 30)
	for (let y = 15; y < 28; y += 3) {
		leaflets.line(10, y, 6 - (y % 2), y - 2, 1, 1)
		leaflets.line(10, y, 14 + (y % 2), y - 2, 1, 1)
	}
	g.flat(leaflets, FROND_LIT)
	// A glint at the heart of each curl.
	g.set(11, 10, POD_CYAN)
	return g.url(1)
})()

/**
 * A cluster of tall glowing mushrooms, three heights, caps of cyan, pink
 * and gold over pale stalks, spots on them and a glow beneath. 24 by 28 cells.
 */
export const glowMushrooms = (() => {
	const g = new Grid(24, 28)
	const STALK = '#cfe6dc'
	const STALK_DARK = '#8fb2a8'
	for (const [cx, top, rx, ry, base, lit, dark, gill] of [
		[12, 2, 8, 6, POD_CYAN, '#c4fff6', '#38b8b0', '#1f7e7c'],
		[4, 11, 5, 4, POD_PINK, '#ec9af0', '#a048b0', '#6e2c80'],
		[19, 14, 5, 4, POD_GOLD, '#fff6b0', '#c8a838', '#8a6e1e'],
	] as [number, number, number, number, string, string, string, string][]) {
		// The stalk.
		g.rect(cx - 1, top + ry, 3, 28 - top - ry, STALK)
		g.rect(cx + 1, top + ry, 1, 28 - top - ry, STALK_DARK)
		g.rect(cx - 2, 26, 5, 2, STALK_DARK)
		// The cap: a dome, flat under.
		const cap = new Mask(24, 28)
		for (let y = 0; y < ry; y++)
			for (let x = -rx; x <= rx; x++)
				if ((x / rx) ** 2 + ((y - ry + 0.5) / ry) ** 2 <= 1)
					cap.add(cx + x, top + y)
		g.shade(cap, base, lit, dark)
		g.rect(cx - rx, top + ry, 2 * rx + 1, 1, gill)
		g.rect(cx - rx + 1, top + ry + 1, 2 * rx - 1, 1, dark)
		// Spots, and the lit crown.
		g.set(cx - 2, top + 2, '#ffffff')
		g.set(cx + 2, top + 3, lit)
	}
	return g.url(1)
})()

/**
 * A small tree: a violet trunk forking into thin branches, strings of
 * glowing bulbs hanging from them, a few leaves. 36 by 64 cells.
 */
export const bulbTree = (() => {
	const g = new Grid(36, 64)
	const trunk = new Mask(36, 64)
	trunk.line(18, 63, 18, 44, 6, 4)
	trunk.line(18, 44, 8, 24, 3, 2)
	trunk.line(18, 44, 28, 22, 3, 2)
	trunk.line(18, 44, 18, 16, 3, 2)
	trunk.rect(11, 61, 5, 3)
	trunk.rect(21, 61, 5, 3)
	g.shade(trunk, TRUNK, TRUNK_LIT, TRUNK_DARK)
	g.rect(14, 54, 8, 1, TRUNK_DARK)
	g.rect(15, 48, 6, 1, TRUNK_DARK)
	// A few leaves at the branch ends.
	const leaves = new Mask(36, 64)
	for (const [x, y] of [
		[8, 24],
		[28, 22],
		[18, 16],
		[13, 30],
		[24, 30],
	]) {
		leaves.line(x, y, x - 5, y - 1, 3, 1)
		leaves.line(x, y, x + 5, y - 1, 3, 1)
		leaves.line(x, y, x, y - 4, 2, 1)
	}
	g.shade(leaves, FROND, FROND_LIT, FROND_DARK)
	// Strings of bulbs, hanging.
	const BULBS = [POD_CYAN, POD_GOLD, POD_PINK]
	for (const [x, y, len, c] of [
		[4, 25, 10, 0],
		[12, 26, 16, 1],
		[24, 27, 12, 2],
		[31, 24, 8, 0],
		[18, 19, 14, 1],
		[8, 26, 6, 2],
	]) {
		g.rect(x, y, 1, len, STEM_DARK)
		g.rect(x - 1, y + len, 3, 3, BULBS[c])
		g.set(x - 1, y + len, '#ffffff')
		g.rect(x, y + len + 2, 2, 1, STEM_DARK)
	}
	return g.url(1)
})()

/**
 * A weird plant: three stalks, each tipped by an eyeball, white with a
 * coloured iris and a dark pupil, one blinking. 18 by 24 cells.
 */
export const eyeStalks = (() => {
	const g = new Grid(18, 24)
	const stalks = new Mask(18, 24)
	stalks.line(9, 23, 9, 10, 2, 2)
	stalks.line(9, 23, 3, 16, 2, 1)
	stalks.line(9, 23, 15, 17, 2, 1)
	stalks.rect(6, 22, 7, 2)
	g.shade(stalks, STEM, STEM_LIT, STEM_DARK)
	g.rect(5, 20, 2, 1, FROND_LIT)
	g.rect(12, 20, 2, 1, FROND_LIT)
	const eye = (
		cx: number,
		cy: number,
		r: number,
		iris: string,
		dx: number,
		blink = false,
	) => {
		const ball = new Mask(18, 24)
		ball.disc(cx, cy, r)
		g.shade(ball, '#f4f0e4', '#ffffff', '#c8c0b0')
		const ir = r >= 4 ? 2 : 1
		g.rect(cx + dx - ir, cy - ir + 1, ir * 2, ir * 2, iris)
		g.set(cx + dx - 1, cy, INK)
		if (r >= 4) g.set(cx + dx - 1, cy + 1, INK)
		if (blink) {
			// A lid down over its top half.
			g.rect(cx - r + 1, cy - r, r * 2 - 1, r + 1, STEM)
			g.rect(cx - r + 1, cy, r * 2 - 1, 1, STEM_DARK)
		}
	}
	eye(9, 6, 4, '#4ad0e0', 0)
	eye(3, 13, 3, '#d06ad8', 0, true)
	eye(15, 15, 2, '#f0b030', 0)
	return g.url(1)
})()

// --- Base props --------------------------------------------------------------

/** The tank's green fluid. */
const FLUID = '#3fbf8a'
const FLUID_LIT = '#72e4ae'
const FLUID_DARK = '#2a8f6a'

/**
 * A specimen tank: a glass tube of green fluid on a steel base and under a
 * steel cap with a pipe, a strange pink creature floating in it, bubbles.
 * 20 by 46 cells.
 */
export const specimenTank = (() => {
	const g = new Grid(20, 46)
	// The pipe up from the cap.
	g.rect(9, 0, 3, 6, STEEL)
	g.rect(9, 0, 1, 6, STEEL_LIT)
	// Cap and base.
	g.rect(2, 5, 16, 3, STEEL)
	g.rect(2, 5, 16, 1, STEEL_LIT)
	g.rect(2, 7, 16, 1, STEEL_DARK)
	g.rect(0, 38, 20, 8, STEEL)
	g.rect(0, 38, 20, 1, STEEL_LIT)
	g.rect(0, 44, 20, 2, STEEL_DARK)
	g.rect(2, 41, 4, 2, SCREEN)
	g.rect(3, 41, 2, 1, SEAM)
	g.rect(8, 41, 10, 1, STEEL_DARK)
	g.rect(8, 43, 10, 1, STEEL_DARK)
	g.set(16, 40, POD_GOLD)
	// The fluid in its tube, the glass lit down the left.
	g.rect(3, 8, 14, 30, FLUID)
	g.rect(3, 8, 14, 2, FLUID_LIT)
	g.rect(14, 10, 3, 28, FLUID_DARK)
	g.rect(3, 10, 2, 26, PANE_GLINT)
	g.rect(5, 10, 1, 26, FLUID_LIT)
	// The creature: a floating bell, an eye, and trailing tentacles.
	const body = new Mask(20, 46)
	body.disc(10, 19, 4, 3)
	body.rect(7, 19, 7, 1)
	g.shade(body, POD_PINK, '#ec9af0', '#a048b0')
	g.rect(8, 18, 2, 2, '#ffffff')
	g.set(9, 19, INK)
	g.rect(12, 16, 1, 1, '#ffe8ff')
	const arms = new Mask(20, 46)
	arms.line(8, 21, 7, 27, 1, 1)
	arms.line(10, 21, 11, 30, 1, 1)
	arms.line(12, 21, 13, 26, 1, 1)
	arms.line(9, 21, 9, 24, 1, 1)
	g.flat(arms, '#a048b0')
	// Bubbles.
	for (const [x, y] of [
		[7, 33],
		[13, 30],
		[8, 13],
		[14, 12],
	])
		g.set(x, y, '#d2f2ee')
	return g.url(1)
})()

/**
 * Pipes and valves along the floor: a fat pipe with flanges, a thin one
 * above it joined by elbows, a red valve wheel and a gauge. 60 by 20 cells.
 */
export const pipeRun = (() => {
	const g = new Grid(60, 20)
	const VALVE = '#e0453a'
	// The thin pipe, higher, bending down into the fat one.
	g.rect(0, 5, 24, 3, STEEL)
	g.rect(0, 5, 24, 1, STEEL_LIT)
	g.rect(0, 7, 24, 1, STEEL_DARK)
	g.rect(22, 5, 3, 8, STEEL)
	g.rect(22, 5, 1, 8, STEEL_LIT)
	g.rect(24, 5, 1, 8, STEEL_DARK)
	// The fat pipe, along the floor.
	g.rect(0, 12, 60, 6, STEEL)
	g.rect(0, 12, 60, 2, STEEL_LIT)
	g.rect(0, 16, 60, 2, STEEL_DARK)
	g.rect(0, 13, 60, 1, '#9db0c6')
	// Flanges, bolted.
	for (const x of [8, 30, 52]) {
		g.rect(x, 10, 4, 10, STEEL_DARK)
		g.rect(x, 10, 1, 10, STEEL)
		g.set(x + 1, 11, RIVET)
		g.set(x + 1, 18, RIVET)
	}
	// Feet.
	for (const x of [16, 42]) g.rect(x, 18, 6, 2, STEEL_DARK)
	// A valve wheel up on a stem from the pipe.
	g.rect(38, 4, 1, 8, STEEL_DARK)
	g.rect(34, 2, 9, 2, VALVE)
	g.rect(34, 2, 9, 1, '#f0786e')
	g.rect(37, 0, 3, 2, VALVE)
	g.rect(36, 4, 5, 1, STEEL_DARK)
	// A gauge on the thin pipe.
	g.rect(12, 0, 5, 5, STEEL_DARK)
	g.rect(13, 1, 3, 3, SCREEN)
	g.set(14, 2, SEAM)
	g.set(15, 1, POD_GOLD)
	// Green stain at a joint, and a drip.
	g.rect(31, 17, 2, 1, SEAM_DIM)
	g.set(31, 19, SEAM)
	return g.url(1)
})()

/** The crates' dark teal alloy. */
const CRATE = '#3d5e66'
const CRATE_LIT = '#5b8084'
const CRATE_DARK = '#2b4348'
const HAZARD_A = '#e0b82a'

/** One alien supply crate: banded alloy, corners strapped, a green label. */
const crate = (
	g: Grid,
	x: number,
	y: number,
	w: number,
	h: number,
	glyph: number,
) => {
	g.rect(x, y, w, h, CRATE)
	g.rect(x, y, w, 1, CRATE_LIT)
	g.rect(x, y, 1, h, CRATE_LIT)
	g.rect(x, y + h - 2, w, 2, CRATE_DARK)
	g.rect(x + w - 1, y, 1, h, CRATE_DARK)
	// Straps at the sides, hazard-striped.
	for (const sx of [x + 1, x + w - 3]) {
		g.rect(sx, y + 1, 2, h - 3, CRATE_DARK)
		for (let j = 0; j < h - 3; j += 2) g.set(sx, y + 1 + j, HAZARD_A)
	}
	// A label in alien.
	const lw = w - 8
	g.rect(x + 4, y + 3, lw, 4, SCREEN)
	for (let i = 0; i < lw - 1; i += 2)
		g.set(x + 4 + i, y + 4 + ((i / 2 + glyph) % 2), SEAM)
}

/** A stack of alien supply crates: two below, one on top and a little askew. 30 by 24 cells. */
export const crates = (() => {
	const g = new Grid(30, 24)
	crate(g, 0, 12, 14, 12, 0)
	crate(g, 15, 12, 15, 12, 1)
	crate(g, 4, 2, 13, 10, 1)
	// A small case on the end.
	g.rect(22, 7, 7, 5, STEEL)
	g.rect(22, 7, 7, 1, STEEL_LIT)
	g.rect(22, 11, 7, 1, STEEL_DARK)
	g.set(25, 9, LAMP)
	return g.url(1)
})()

/**
 * A holo-table: a steel pedestal under a round top with an emitter, and
 * above it a hologram of the planet in green scan-lines, ringed and
 * turning, a beam of light to it. 34 by 30 cells.
 */
export const holoTable = (() => {
	const g = new Grid(34, 30)
	const HOLO = '#7ff0e0'
	const HOLO_DIM = '#38b8b0'
	// The beam, a wedge from the emitter.
	for (let y = 11; y < 22; y++) {
		const half = Math.round(2 + (y - 11) * 0.6)
		g.rect(17 - half, y, 1, 1, HOLO_DIM)
		g.rect(17 + half, y, 1, 1, HOLO_DIM)
	}
	// The planet, in scan-lines, a ring round it, a continent or two.
	const planet = new Mask(34, 30)
	planet.disc(17, 7, 6)
	for (const k of planet.on) {
		const x = k % 34
		const y = Math.floor(k / 34)
		g.set(x, y, y % 2 === 0 ? HOLO : HOLO_DIM)
	}
	for (const [x, y, w] of [
		[14, 4, 4],
		[18, 8, 3],
		[13, 9, 2],
	])
		g.rect(x, y, w, 1, '#d2fff8')
	// The ring, in front of it and behind.
	for (let x = 3; x <= 31; x++) {
		const t = (x - 17) / 14
		const y = Math.round(7 + 2 * Math.sqrt(Math.max(0, 1 - t * t)))
		g.set(x, y, '#d2fff8')
	}
	// The table's top, and its emitter.
	g.rect(3, 20, 28, 3, STEEL_LIT)
	g.rect(3, 20, 28, 1, '#9db0c6')
	g.rect(3, 22, 28, 1, STEEL_DARK)
	g.rect(14, 18, 6, 2, STEEL_DARK)
	g.rect(15, 18, 4, 1, SEAM)
	// Its pedestal and foot.
	g.rect(13, 23, 8, 5, STEEL)
	g.rect(13, 23, 1, 5, STEEL_LIT)
	g.rect(20, 23, 1, 5, STEEL_DARK)
	g.rect(9, 28, 16, 2, STEEL_DARK)
	g.rect(9, 28, 16, 1, STEEL)
	// A readout on the pedestal.
	g.rect(15, 25, 4, 2, SCREEN)
	g.set(16, 25, SEAM)
	g.set(18, 26, POD_GOLD)
	return g.url(1)
})()

/**
 * A rack of plasma pistols: a pegboard on a stand, two rows of pistols
 * hanging by their barrels, each with a green glow at its muzzle. 28 by 26 cells.
 */
export const blasterRack = (() => {
	const g = new Grid(28, 26)
	// Feet and uprights.
	g.rect(2, 24, 6, 2, STEEL_DARK)
	g.rect(20, 24, 6, 2, STEEL_DARK)
	g.rect(3, 20, 2, 4, STEEL)
	g.rect(23, 20, 2, 4, STEEL)
	// The board.
	g.rect(0, 0, 28, 21, STEEL_DARK)
	g.rect(0, 0, 28, 1, STEEL_LIT)
	g.rect(0, 0, 1, 21, STEEL)
	g.rect(27, 0, 1, 21, PLATE_DARK)
	g.rect(0, 20, 28, 1, PLATE_DARK)
	g.rect(1, 1, 26, 19, PLATE)
	// Rails.
	for (const y of [3, 12]) {
		g.rect(1, y, 26, 1, STEEL)
		g.rect(1, y + 1, 26, 1, STEEL_DARK)
	}
	// The pistols, muzzle to the left, handle down.
	for (const y of [4, 13])
		for (const x of [3, 11, 19]) {
			g.rect(x, y, 6, 3, '#9aa6bb')
			g.rect(x, y, 6, 1, '#c8d2e2')
			g.rect(x + 5, y + 1, 2, 2, STEEL_DARK)
			g.rect(x + 4, y + 3, 2, 4, '#6b4a3a')
			g.rect(x + 4, y + 3, 1, 4, '#8a6450')
			g.set(x - 1, y + 1, SEAM)
			g.set(x + 2, y + 1, SEAM_DIM)
		}
	// A rivet at each corner, and a light for its charge.
	for (const [x, y] of [
		[2, 1],
		[25, 1],
	])
		g.set(x, y, RIVET)
	g.set(25, 18, SEAM)
	return g.url(1)
})()

// --- The ground ----------------------------------------------------------------

/**
 * The path in the base: deck plates over `#7fb8ae`, laid in courses,
 * seams between them with a glint beneath, a rivet at each corner, a little
 * moss in the joints and a scuff or two. A pattern in world pixels,
 * 2-pixel steps.
 */
export const BASE_PATH = (() => {
	const W = 120
	const H = 40
	const t = tile(W, H)
	const random = seeded(9172)
	const SEAM_DARK = 'rgba(36, 68, 62, 0.42)'
	const GLINT = 'rgba(214, 246, 238, 0.5)'
	const BOLT = 'rgba(214, 246, 238, 0.65)'
	const BOLT_SHADE = 'rgba(36, 68, 62, 0.45)'
	const MOSS = 'rgba(70, 150, 96, 0.55)'
	const MOSS_LIT = 'rgba(120, 200, 130, 0.5)'
	const SCUFF = 'rgba(36, 68, 62, 0.16)'
	// Courses: a seam across at 0 and 20, upright seams staggered between.
	for (const y of [0, 20]) {
		t.rect(0, y, W, 2, SEAM_DARK)
		t.rect(0, y + 2, W, 2, GLINT)
	}
	t.rect(0, 2, 2, 18, SEAM_DARK)
	t.rect(2, 4, 2, 16, GLINT)
	t.rect(60, 22, 2, 18, SEAM_DARK)
	t.rect(62, 24, 2, 16, GLINT)
	// A rivet at each plate's corners.
	for (const [x, y] of [
		[6, 8],
		[50, 8],
		[66, 8],
		[110, 8],
		[6, 28],
		[34, 28],
		[66, 28],
		[110, 28],
	]) {
		t.rect(x, y, 2, 2, BOLT)
		t.rect(x + 2, y + 2, 2, 2, BOLT_SHADE)
	}
	// Moss in the seams.
	for (const [x, y, w] of [
		[8, 0, 8],
		[84, 0, 6],
		[0, 12, 4],
		[44, 20, 8],
		[100, 20, 6],
		[60, 34, 4],
	]) {
		t.rect(x, y, w, 2, MOSS)
		t.rect(x + 2, y - 2, 2, 2, MOSS_LIT)
	}
	// Scuffs, low and long.
	for (let n = 0; n < 5; n++) {
		const x = Math.round((random() * (W - 20)) / 2) * 2 + 8
		const y = Math.round((random() * (H - 12)) / 2) * 2 + 8
		t.rect(x, y, 6 + Math.round(random() * 3) * 2, 2, SCUFF)
	}
	return t.pattern('rl-base-path')
})()

/**
 * Under the path: dark soil over `#24443e`, flecks lighter and darker,
 * roots creeping through it, a buried pipe and the end of a beam, all of it
 * faint. A pattern in world pixels, 2-pixel steps.
 */
export const BASE_UNDER = (() => {
	const W = 160
	const H = 60
	const t = tile(W, H)
	const random = seeded(7731)
	const DARK = 'rgba(14, 32, 28, 0.4)'
	const LIGHT = 'rgba(70, 120, 108, 0.3)'
	const ROOT = 'rgba(122, 101, 160, 0.38)'
	const ROOT_DARK = 'rgba(67, 55, 92, 0.5)'
	const PIPE = 'rgba(90, 107, 128, 0.42)'
	const PIPE_LIT = 'rgba(124, 143, 166, 0.4)'
	const PIPE_DARK = 'rgba(30, 38, 52, 0.5)'
	// Soil: flecks.
	for (let n = 0; n < 30; n++) {
		const x = Math.round((random() * (W - 6)) / 2) * 2
		const y = Math.round((random() * (H - 4)) / 2) * 2
		t.rect(
			x,
			y,
			2 + Math.round(random() * 2) * 2,
			2,
			random() < 0.55 ? DARK : LIGHT,
		)
	}
	// A buried pipe along the lower part, flanged where it joins.
	t.rect(0, 40, W, 8, PIPE)
	t.rect(0, 40, W, 2, PIPE_LIT)
	t.rect(0, 46, W, 2, PIPE_DARK)
	for (const x of [30, 110]) {
		t.rect(x, 36, 4, 16, PIPE_DARK)
		t.rect(x, 36, 2, 16, PIPE)
	}
	// The foot of a beam standing in the soil above it.
	t.rect(80, 0, 8, 38, PIPE)
	t.rect(80, 0, 2, 38, PIPE_LIT)
	t.rect(86, 0, 2, 38, PIPE_DARK)
	t.rect(76, 34, 16, 4, PIPE_DARK)
	// Roots, wandering in 2-pixel steps.
	for (const [x0, y0, dir] of [
		[0, 12, 1],
		[100, 22, -1],
		[40, 54, 1],
	]) {
		let y = y0
		for (let x = x0; x < x0 + 56; x += 2) {
			t.rect(((x % W) + W) % W, y, 2, 2, ROOT)
			if (Math.floor(x / 2) % 4 === 0) y += dir * 2
			if (Math.floor(x / 2) % 7 === 3)
				t.rect(((x % W) + W) % W, y + 2, 2, 2, ROOT_DARK)
		}
	}
	return t.pattern('rl-base-under')
})()

// --- The base's furniture ----------------------------------------------------

/** A base console: a screen of green traces over a steel desk, buttons and lights blinking. 36 by 24 cells. */
export const consoleDesk = (() => {
	const g = new Grid(36, 24)
	// The screen, tipped back on the desk's rear.
	g.rect(5, 0, 18, 11, STEEL_DARK)
	g.rect(6, 1, 16, 9, SCREEN)
	g.rect(5, 0, 18, 1, STEEL)
	// Its traces: a line that wanders, and bars.
	for (const [x, y] of [
		[7, 7],
		[8, 6],
		[9, 5],
		[10, 6],
		[11, 7],
		[12, 7],
		[13, 4],
		[14, 3],
		[15, 5],
		[16, 6],
		[17, 5],
		[18, 4],
	])
		g.set(x, y, SEAM)
	g.rect(8, 8, 3, 1, SEAM_DIM)
	g.rect(18, 7, 3, 2, SEAM_DIM)
	g.rect(19, 6, 1, 1, '#a8ffd8')
	g.rect(7, 2, 5, 1, SEAM_DIM)
	// Its stand.
	g.rect(12, 11, 4, 2, STEEL_DARK)
	// The desk: lit top, buttons on it, a front with vents and lights.
	g.rect(2, 13, 32, 3, STEEL_LIT)
	g.rect(2, 13, 32, 1, '#9db0c6')
	g.rect(2, 16, 32, 8, STEEL)
	g.rect(2, 22, 32, 2, STEEL_DARK)
	g.rect(0, 23, 36, 1, STEEL_DARK)
	g.rect(26, 11, 7, 2, STEEL_DARK)
	g.rect(27, 10, 5, 1, STEEL_DARK)
	g.set(28, 10, '#e0453a')
	g.set(30, 10, POD_GOLD)
	for (const [x, y, c] of [
		[5, 14, '#e0453a'],
		[8, 14, POD_GOLD],
		[11, 14, SEAM],
		[14, 14, POD_CYAN],
		[22, 14, '#e0453a'],
		[25, 14, SEAM],
	] as [number, number, string][])
		g.rect(x, y, 2, 1, c)
	// Vent slats, and a row of lights.
	for (let x = 5; x < 17; x += 2) g.rect(x, 18, 1, 4, STEEL_DARK)
	g.rect(22, 18, 9, 3, STEEL_DARK)
	for (const [x, c] of [
		[23, SEAM],
		[25, POD_GOLD],
		[27, '#e0453a'],
		[29, SEAM],
	] as [number, string][])
		g.rect(x, 19, 1, 1, c)
	return g.url(1)
})()

/** The made-up glyphs of the aliens' writing: five cells by seven. */
const ALIEN_GLYPHS = [
	['#.#.#', '.###.', '#.#.#', '..#..', '#.#.#', '.###.', '..#..'],
	['.###.', '#...#', '..#..', '.###.', '..#..', '#...#', '.###.'],
	['#....', '#.##.', '####.', '#.#..', '####.', '#.##.', '#....'],
	['..#..', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '..#..'],
]

/** A sign in alien, glowing green on dark metal: four glyphs. 30 by 20 cells. */
export const alienSign = (() => {
	const g = new Grid(30, 20)
	// Two legs.
	g.rect(6, 14, 2, 6, STEEL_DARK)
	g.rect(22, 14, 2, 6, STEEL_DARK)
	g.rect(5, 19, 4, 1, STEEL_DARK)
	g.rect(21, 19, 4, 1, STEEL_DARK)
	// The board.
	g.rect(0, 0, 30, 14, STEEL)
	g.rect(0, 0, 30, 1, STEEL_LIT)
	g.rect(0, 13, 30, 1, STEEL_DARK)
	g.rect(2, 2, 26, 10, '#232634')
	ALIEN_GLYPHS.forEach((rows, i) => stamp(g, 3 + i * 6, 3, rows, SEAM))
	for (const [x, y] of [
		[1, 1],
		[28, 1],
		[1, 12],
		[28, 12],
	])
		g.set(x, y, RIVET)
	return g.url(1)
})()

// --- The boss's chamber's doors ----------------------------------------------

/** The doors' hazard stripes. */
const HAZARD = '#e0b82a'
const HAZARD_DARK = '#2b2b3b'
const DOOR = '#6b6f80'
const DOOR_LIT = '#8a8fa3'
const DOOR_DARK = '#4a4e5e'

/**
 * A heavy alien blast door, shut: a steel slab in a frame, riveted
 * panels, hazard stripes across it and a glowing eye in the middle.
 * 24 by 100 cells.
 */
const doorShut = (() => {
	const g = new Grid(24, 100)
	// The frame.
	g.rect(0, 0, 24, 100, PLATE_DARK)
	g.rect(0, 0, 2, 100, PLATE)
	g.rect(0, 0, 24, 2, PLATE_LIT)
	// The slab.
	g.rect(2, 2, 20, 98, DOOR)
	g.rect(2, 2, 20, 1, DOOR_LIT)
	g.rect(2, 2, 1, 98, DOOR_LIT)
	g.rect(21, 2, 1, 98, DOOR_DARK)
	// Panels: a seam each way, rivets at their corners.
	for (const y of [26, 74]) {
		g.rect(2, y, 20, 1, DOOR_DARK)
		g.rect(2, y + 1, 20, 1, DOOR_LIT)
	}
	g.rect(11, 2, 2, 24, DOOR_DARK)
	g.rect(11, 74, 2, 26, DOOR_DARK)
	for (const y of [5, 20, 77, 94])
		for (const x of [5, 18]) {
			g.set(x, y, RIVET)
			g.set(x + 1, y + 1, DOOR_DARK)
		}
	// Hazard stripes across the middle, slanted.
	g.rect(2, 36, 20, 2, DOOR_DARK)
	g.rect(2, 62, 20, 2, DOOR_DARK)
	for (let y = 38; y < 62; y++)
		for (let x = 2; x < 22; x++)
			g.set(x, y, Math.floor((x + y) / 4) % 2 === 0 ? HAZARD : HAZARD_DARK)
	// A glowing eye where they meet.
	g.rect(6, 43, 12, 14, '#232634')
	g.rect(7, 44, 10, 12, '#2d3040')
	g.rect(8, 47, 8, 6, POD_PINK)
	g.rect(9, 46, 6, 8, POD_PINK)
	g.rect(11, 48, 2, 4, '#ffe8ff')
	g.rect(9, 46, 6, 1, '#ec9af0')
	// A glow at the seam by the floor.
	g.rect(3, 97, 18, 1, SEAM_DIM)
	return g.url(2)
})()

/** The doorway, the door slid up into its lintel: dark beyond, a glow along the floor. 24 by 100 cells. */
const doorOpen = (() => {
	const g = new Grid(24, 100)
	g.rect(0, 0, 24, 100, '#14151c')
	g.rect(4, 12, 16, 88, '#1d1f28')
	// A faint glow far in, along the floor.
	g.rect(6, 96, 12, 2, '#2a2d3c')
	g.rect(8, 98, 8, 2, SEAM_DIM)
	// The jambs.
	g.rect(0, 0, 2, 100, PLATE)
	g.rect(0, 0, 1, 100, PLATE_LIT)
	g.rect(22, 0, 2, 100, PLATE_DARK)
	g.rect(2, 12, 2, 88, PLATE_DARK)
	g.rect(20, 12, 2, 88, PLATE_DARK)
	// The lintel, and the slab's lower edge, slid up into it.
	g.rect(0, 0, 24, 14, PLATE_DARK)
	g.rect(0, 0, 24, 2, PLATE_LIT)
	g.rect(2, 2, 20, 12, DOOR)
	g.rect(2, 2, 20, 1, DOOR_LIT)
	for (let y = 9; y < 13; y++)
		for (let x = 2; x < 22; x++)
			g.set(x, y, Math.floor((x + y) / 4) % 2 === 0 ? HAZARD : HAZARD_DARK)
	g.rect(2, 13, 20, 1, DOOR_DARK)
	for (const x of [4, 19]) g.set(x, 5, RIVET)
	return g.url(2)
})()

/** The boss's chamber's doors: shut, and open. */
export const CHAMBER_DOOR = {
	shut: doorShut,
	open: doorOpen,
	width: 48,
	height: 200,
}

// --- The cage ----------------------------------------------------------------

/** A cage's bars: two cells wide, lit down their left and shaded down their right. */
const bar = (g: Grid, x: number, y: number, h: number) => {
	g.rect(x, y, 1, h, BAR_LIT)
	g.rect(x + 1, y, 1, h, BAR_DARK)
}

/**
 * The cage the prisoner's in: a ring to hang by, a domed cap, bars with
 * nothing between them, a base, and a lock lit amber. 28 by 35 cells.
 */
const cageHanging = (() => {
	const g = new Grid(28, 35)
	// The ring.
	g.rect(11, 0, 6, 5, BAR)
	g.rect(13, 1, 2, 3, undefined)
	g.rect(11, 0, 6, 1, BAR_LIT)
	// The cap: domed, in steps.
	g.rect(11, 5, 6, 1, BAR_LIT)
	g.rect(8, 6, 12, 1, BAR)
	g.rect(5, 7, 18, 1, BAR)
	g.rect(3, 8, 22, 2, BAR)
	g.rect(3, 8, 22, 1, BAR_LIT)
	g.rect(3, 9, 22, 1, BAR_DARK)
	// The bars.
	for (const x of [4, 9, 14, 19, 24]) bar(g, x === 24 ? 23 : x, 10, 20)
	// A hoop round the middle.
	g.rect(4, 19, 20, 1, BAR_DARK)
	// The base.
	g.rect(2, 30, 24, 2, BAR)
	g.rect(2, 30, 24, 1, BAR_LIT)
	g.rect(2, 32, 24, 2, BAR_DARK)
	g.rect(4, 34, 3, 1, BAR_DARK)
	g.rect(21, 34, 3, 1, BAR_DARK)
	// The lock on its door.
	g.rect(12, 22, 4, 4, BAR_DARK)
	g.rect(13, 23, 2, 2, LAMP)
	return g.url(2)
})()

/**
 * The cage burst open on the floor: bars bent out and snapped, the cap
 * knocked off beside it, the door hanging off one hinge.
 */
const cageSmashed = (() => {
	const g = new Grid(28, 35)
	// The base, split.
	g.rect(1, 31, 26, 2, BAR)
	g.rect(1, 31, 26, 1, BAR_LIT)
	g.rect(1, 33, 26, 2, BAR_DARK)
	g.rect(14, 31, 1, 4, undefined)
	// Bars: two bent out on the left, one snapped off short, one bent right.
	const bent = new Mask(28, 35)
	bent.line(5, 30, 2, 15, 2, 2)
	bent.line(10, 30, 8, 21, 2, 2)
	bent.line(24, 30, 26, 13, 2, 2)
	g.shade(bent, BAR, BAR_LIT, BAR_DARK)
	g.rect(8, 20, 2, 1, BAR_LIT)
	bar(g, 19, 25, 6)
	// The domed cap, fallen flat on the floor between them.
	g.rect(10, 28, 9, 1, BAR_LIT)
	g.rect(8, 29, 12, 2, BAR)
	g.rect(8, 30, 12, 1, BAR_DARK)
	// The ring, rolled free.
	g.rect(0, 27, 5, 4, BAR)
	g.rect(1, 28, 3, 2, undefined)
	g.rect(0, 27, 5, 1, BAR_LIT)
	// The door, burst off its lock and hanging from the top hinge, skewed.
	const door = new Mask(28, 35)
	door.line(16, 12, 14, 26, 1, 1)
	door.line(22, 12, 20, 26, 1, 1)
	door.line(16, 12, 22, 12, 2, 2)
	door.line(14, 26, 20, 26, 2, 2)
	door.line(15, 19, 21, 19, 1, 1)
	g.shade(door, BAR, BAR_LIT, BAR_DARK)
	g.rect(22, 11, 3, 3, BAR_DARK)
	g.rect(17, 21, 2, 2, LAMP)
	return g.url(2)
})()

/** The cage the prisoner's in, hanging by its chain; and smashed open on the floor. 28 by 35 cells, 56 by 70 on the screen (`CAGE` in `game/space.ts`). */
export const CAGE_ART = {
	hanging: cageHanging,
	smashed: cageSmashed,
}
