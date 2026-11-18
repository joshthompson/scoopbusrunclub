import { svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * Everest's nearer horizon bands, the ground behind the path: tall ones,
 * drawn on a grid of 2 px cells that wraps round at the edges, so each goes
 * round and round without a seam, and thins out toward its bottom, where the
 * path goes over it, down to the plain colour its `fill` carries on in.
 *
 * The Khumbu valley's terraced hillside on the trek in, the glacier up the
 * moraine, and the mountain's own snow slopes high up over the clouds.
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
 * comes in on the other, so what's near an edge is drawn on both.
 */
class Grid {
	private readonly rows: number
	private readonly cells: (string | undefined)[]

	constructor(readonly height: number) {
		this.rows = height / 2
		this.cells = new Array<string | undefined>(this.rows * CELLS)
	}

	set(x: number, y: number, colour: string) {
		const row = Math.floor(y / 2)
		if (row < 0 || row >= this.rows) return
		const col = ((Math.floor(x / 2) % CELLS) + CELLS) % CELLS
		this.cells[row * CELLS + col] = colour
	}

	get(x: number, y: number) {
		const row = Math.floor(y / 2)
		if (row < 0 || row >= this.rows) return undefined
		const col = ((Math.floor(x / 2) % CELLS) + CELLS) % CELLS
		return this.cells[row * CELLS + col]
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

	/** A flat shape, its corners `points`. */
	polygon(points: [number, number][], colour: string) {
		const ys = points.map((p) => p[1])
		const top = Math.floor(Math.min(...ys) / 2) * 2
		const bottom = Math.max(...ys)
		for (let y = top; y < bottom; y += 2) {
			const line = y + 1
			const xs: number[] = []
			for (let i = 0; i < points.length; i++) {
				const [ax, ay] = points[i]
				const [bx, by] = points[(i + 1) % points.length]
				if ((ay <= line && by > line) || (by <= line && ay > line))
					xs.push(ax + ((line - ay) / (by - ay)) * (bx - ax))
			}
			xs.sort((a, b) => a - b)
			for (let i = 0; i + 1 < xs.length; i += 2)
				for (let x = Math.round(xs[i] / 2) * 2; x < xs[i + 1] - 1; x += 2)
					this.set(x, y, colour)
		}
	}

	/** The picture: its cells joined up into as few rects as they'll go in. */
	svg() {
		const out: { x: number; y: number; w: number; h: number; c: string }[] = []
		const open = new Map<string, (typeof out)[number]>()
		for (let row = 0; row < this.rows; row++) {
			let col = 0
			while (col < CELLS) {
				const colour = this.cells[row * CELLS + col]
				if (!colour) {
					col++
					continue
				}
				let end = col + 1
				while (end < CELLS && this.cells[row * CELLS + end] === colour) end++
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

/** A pine: tiers of dark, its left side lit, `height` tall, its foot at `y`. */
function pine(
	grid: Grid,
	x: number,
	y: number,
	height: number,
	dark: string,
	lit: string,
) {
	const rows = Math.floor(height / 2)
	for (let j = 0; j < rows; j++) {
		const half = Math.min(8, 2 + Math.floor(j * 0.8)) - (j % 3 === 2 ? 2 : 0)
		const top = y - height + j * 2
		grid.rect(x - half, top, half * 2, 2, dark)
		grid.rect(x - half, top, 2, 2, lit)
	}
	grid.rect(x - 1, y, 2, 2, '#4a3a2a')
}

// --- The trek in: the Khumbu valley's terraced hillside -------------------------

const TERRACE_HEIGHT = 260

const FIELD_GREEN = '#6fa04a'
const HILL_FOREST = '#5f9440'
const PINE_DARK = '#3f6e35'
const PINE_RIDGE = '#4a7a3a'
const PINE_LIT = '#5a9244'
const WALL_LIT = '#b4b1a8'
const WALL = '#8a8780'
const WALL_JOINT = '#74716b'
const WALL_STONE = '#9a978f'
const WALL_FOOT = '#6c6963'
const WHITEWASH = '#f4f1e8'
const WHITEWASH_SHADE = '#d6d0c0'
const BARLEY = '#9bc04f'
const SPROUT = '#7fb04a'
const MUSTARD = '#b8c458'
const POTATO = '#86b44c'
const TIN_BLUE = '#3f7fb8'
const TIN_GREEN = '#3a9a6a'
const BUSH = '#3f7a3a'
const BUSH_LIT = '#58944a'
const BLOOM_RED = '#d03a4c'
const BLOOM_PINK = '#f08a9a'

/**
 * The hillside behind the path on the trek in, in the Khumbu valley, 260 px
 * tall. A wavy green ridge with pines along it, then fields stepping down
 * the slope in terraces of barley, potatoes and mustard, each held up by a
 * dry-stone wall with its top row lit and a shadow under it. Three Sherpa
 * stone houses stand on the terraces, whitewashed, with small dark windows
 * in painted frames and tin roofs, and there are pine clumps and rhododendron
 * bushes in red flower. It thins toward the bottom, to plain field green.
 */
export const TREK_TERRACES: Band = (() => {
	const random = seeded(7301)
	const grid = new Grid(TERRACE_HEIGHT)
	const ridge = wave(7302, 36, 12, [2, 3, 6])
	grid.under(ridge, FIELD_GREEN)
	// Forest down the slope below the ridge, its edge dithered.
	const forestEdge = wave(7303, 62, 8, [3, 5])
	grid.under(
		(x) => ridge(x) + 6,
		(x, y) =>
			y > forestEdge(x) ? dither(x, y, FIELD_GREEN, HILL_FOREST) : HILL_FOREST,
		Math.round(forestEdge(0) / 2) * 2 + 24,
	)
	for (let i = 0; i < 64; i++) {
		const x = between(random, 0, CELLS) * 2
		pine(
			grid,
			x,
			at(ridge, x) + 6 + between(random, 0, 8) * 2,
			between(random, 5, 9) * 2,
			PINE_RIDGE,
			PINE_LIT,
		)
	}

	// The terraces: where each wall's top is, and how tall the wall is.
	const walls = [88, 122, 156, 188, 216].map((base, i) =>
		wave(7310 + i, base, 7, [1 + (i % 2), 2 + (i % 3), 5]),
	)
	const wallHeight = [6, 6, 8, 8, 10]
	const crops = [BARLEY, SPROUT, MUSTARD, POTATO, FIELD_GREEN]
	const furrow = ['#86ac42', '#6a9a3e', '#a3ae48', '#74a040']
	const shade = ['#74994a', '#5f8c3c', '#8a9a44', '#628f3e', '#5a8a3c']
	for (let i = 0; i < walls.length; i++) {
		const wall = walls[i]
		const wallH = wallHeight[i]
		const next = walls[i + 1]
		grid.under(wall, crops[i])
		for (let x = 0; x < W; x += 2) {
			const top = at(wall, x)
			// The wall: lit top, stones in courses with their joints, a dark foot.
			grid.rect(x, top, 2, 2, WALL_LIT)
			for (let y = top + 2; y < top + wallH; y += 2) {
				const course = (y - top) / 2
				const joint =
					(Math.floor(x / 2) + course * 3) % (4 + (course % 2)) === 0
				grid.rect(
					x,
					y,
					2,
					2,
					y >= top + wallH - 2
						? WALL_FOOT
						: joint
							? WALL_JOINT
							: (x * 7 + y * 13) % 11 === 0
								? WALL_STONE
								: WALL,
				)
			}
			grid.rect(x, top + wallH, 2, 2, shade[i])
			// The crops in rows along it, thinner and thinner further down.
			if (next && i < 4) {
				const gap = [4, 4, 6, 10][i]
				const stop = at(next, x) - 2
				for (let y = top + wallH + 6; y < stop; y += gap) {
					const k = (y - top) / gap
					if ((Math.floor(x / 2) + Math.floor(k) * 5) % 9 < 6)
						grid.rect(x, y, 2, 2, furrow[i])
				}
			}
		}
		// Flecks of flower and ripe grain in the fields.
		if (i < 4)
			for (let n = 0; n < 40 - i * 8; n++) {
				const x = between(random, 0, CELLS) * 2
				const y = at(wall, x) + wallH + between(random, 3, 11) * 2
				if (next && y < at(next, x) - 4)
					grid.rect(x, y, 2, 2, i % 2 ? '#e8d84a' : '#c8d870')
			}
	}

	// Plain grass at the bottom, a few tufts the further up it goes.
	for (let n = 0; n < 70; n++) {
		const x = between(random, 0, CELLS) * 2
		const y = 236 + between(random, 0, 11) * 2
		const t = (y - 236) / 24
		if (random() > t + 0.15)
			grid.rect(
				x,
				y,
				between(random, 1, 2) * 2,
				2,
				random() < 0.6 ? HILL_FOREST : '#7fb04a',
			)
	}

	// Pine clumps on the terraces.
	for (const [x, terrace] of [
		[60, 0],
		[330, 1],
		[420, 0],
		[700, 1],
		[930, 2],
		[610, 0],
	]) {
		for (let k = 0; k < 4; k++) {
			const px = x + (k - 1.5) * 10 + between(random, -2, 2) * 2
			pine(
				grid,
				px,
				at(walls[terrace + 1], px) - 2,
				between(random, 7, 11) * 2,
				PINE_DARK,
				PINE_LIT,
			)
		}
	}

	// Rhododendron bushes, in flower.
	for (const [x, terrace] of [
		[120, 1],
		[300, 2],
		[470, 3],
		[560, 1],
		[790, 2],
		[880, 3],
		[40, 3],
	]) {
		const y = at(walls[terrace + 1], x) - 6
		const r = between(random, 3, 4) * 2
		grid.disc(x, y, r, BUSH)
		grid.disc(x - 2, y - 2, r - 2, BUSH_LIT)
		for (let k = 0; k < 5; k++)
			grid.rect(
				x + between(random, -2, 2) * 2,
				y + between(random, -2, 1) * 2,
				2,
				2,
				k === 4 ? BLOOM_PINK : BLOOM_RED,
			)
	}

	// Sherpa houses, standing on the terraces.
	const house = (
		x: number,
		terrace: number,
		w: number,
		roof: string,
		frame: string,
	) => {
		let bottom = 0
		for (let i = 0; i <= w; i += 2)
			bottom = Math.max(bottom, at(walls[terrace + 1], x + i))
		bottom -= 2
		const body = 12
		grid.rect(x, bottom - body, w, body, WHITEWASH)
		grid.rect(x + w - 4, bottom - body, 4, body, WHITEWASH_SHADE)
		grid.rect(x, bottom - 2, w, 2, WHITEWASH_SHADE)
		// The tin roof, a low gable with eaves.
		grid.rect(
			x + 4,
			bottom - body - 6,
			w - 8,
			2,
			roof === TIN_BLUE ? '#6fa8d8' : '#6cc496',
		)
		grid.rect(x + 2, bottom - body - 4, w - 4, 2, roof)
		grid.rect(x - 2, bottom - body - 2, w + 4, 2, roof)
		grid.rect(x, bottom - body, w, 2, '#9a8f7a')
		// Windows with painted frames, and a door.
		for (const wx of [x + 3, x + w - 12]) {
			grid.rect(wx, bottom - 10, 6, 8, frame)
			grid.rect(wx + 2, bottom - 8, 2, 4, '#2a2f3a')
		}
		if (w > 20)
			grid.rect(x + Math.round(w / 2 / 2) * 2 - 1, bottom - 8, 4, 6, '#5a3a28')
	}
	house(170, 1, 24, TIN_BLUE, '#c0392b')
	house(490, 2, 20, TIN_GREEN, '#2f6fb0')
	house(826, 0, 22, TIN_BLUE, '#2f8a5a')

	return grid.band(FIELD_GREEN)
})()

// --- Up the moraine: the Khumbu Glacier ----------------------------------------

const GLACIER_HEIGHT = 240

const ICE = '#dfe9f2'
const ICE_FILL = '#c8d8e8'
const ICE_WHITE = '#f7fbff'
const ICE_SHADE = '#b0c6dc'
const ICE_SIDE = '#9db8d6'
const ICE_BLUE = '#7f9bb8'
const HOLLOW = '#b9cce2'
const HOLLOW_DEEP = '#a3bbd6'
const CREVASSE = '#3d5f8c'
const CREVASSE_DEEP = '#2b4673'
const RUBBLE = '#8a8f99'
const RUBBLE_LIT = '#a4a8b0'
const RUBBLE_DARK = '#5f636c'

/**
 * The Khumbu Glacier, 240 px tall, seen in perspective. Its far edge is a
 * ragged line of serac tops, white on the lit side and blue in shadow, with
 * pressure ridges across the ice below it. Crevasses cut it as dark-blue
 * slits, short and thin far off and longer and wider near, not in any
 * order. Two stripes of grey rubble, medial moraine, run along it, and
 * blue-grey hollows lie in it. It thins to plain ice at the bottom.
 */
export const GLACIER: Band = (() => {
	const random = seeded(7401)
	const grid = new Grid(GLACIER_HEIGHT)
	const edge = wave(7402, 28, 8, [3, 5, 9])
	grid.under(edge, (x, y) =>
		y < 104 ? ICE : y < 150 ? dither(x, y, ICE, ICE_FILL) : ICE_FILL,
	)
	// A shadow under the seracs.
	grid.under(edge, ICE_SHADE, 0)
	for (let x = 0; x < W; x += 2) {
		const top = at(edge, x)
		grid.rect(x, top + 6, 2, 2, ICE_SHADE)
		if ((x / 2) % 3 === 0) grid.rect(x, top + 8, 2, 2, ICE_SHADE)
	}

	// Pressure ridges across the ice: lit on top, blue in shadow under, in broken pieces.
	for (const [i, base] of [58, 82, 110, 142].entries()) {
		const ridge = wave(7410 + i, base, 4, [2 + i, 3 + i])
		const thick = 2 + Math.floor(i / 2) * 2
		for (let x = 0; x < W; x += 2) {
			const strength = Math.sin((TAU * (2 + (i % 3)) * x) / W + i * 2.1)
			if (strength < -0.1) continue
			const y = at(ridge, x)
			const long = strength > 0.55
			grid.rect(x, y, 2, 2, ICE_WHITE)
			grid.rect(x, y + 2, 2, thick, ICE_SIDE)
			if (long) grid.rect(x, y + 2 + thick, 2, 2, ICE_SHADE)
		}
	}

	// Hollows, in blue-grey shadow, their near lip lit.
	for (let n = 0; n < 8; n++) {
		const x = between(random, 0, CELLS) * 2
		const y = between(random, 40, 88) * 2
		const rx = 12 + Math.round((y / 180) * 30) + between(random, 0, 6) * 2
		const ry = 2 + Math.round((y / 180) * 6)
		for (let j = -ry; j <= ry; j += 2)
			for (let i = -rx; i <= rx; i += 2)
				if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1) {
					const colour =
						j < -ry * 0.3 ? HOLLOW_DEEP : j > ry * 0.5 ? ICE_WHITE : HOLLOW
					grid.set(x + i, y + j, colour)
				}
	}

	// Seracs along the far edge: blocks and spikes of ice, all sorts of heights.
	for (let x = 0; x < W; ) {
		const w = between(random, 3, 9) * 2
		const h =
			4 + Math.round((random() ** 2 * 18 + (random() < 0.12 ? 10 : 0)) / 2) * 2
		const peak = 0.25 + random() * 0.5
		for (let i = 0; i < w; i += 2) {
			const t = (i + 1) / w
			const shape = t < peak ? t / peak : (1 - t) / (1 - peak)
			const colH = Math.max(2, Math.round((h * (0.3 + 0.7 * shape)) / 2) * 2)
			const foot = at(edge, x + i)
			const top = foot - colH
			const lit = t < peak + 0.15
			for (let y = top; y < foot + 6; y += 2)
				grid.set(
					x + i,
					y,
					y === top || (lit && y < top + 6)
						? ICE_WHITE
						: lit
							? ICE
							: y > foot - 4
								? ICE_BLUE
								: ICE_SIDE,
				)
		}
		x += w - between(random, 0, 3) * 2
	}

	// Medial moraine: stripes of grey rubble along it.
	const stripes: [number, number, number][] = [
		[7420, 92, 6],
		[7421, 156, 10],
	]
	for (const [seed, centre, half] of stripes) {
		const line = wave(seed, centre, 5, [2, 4])
		const phase = random() * TAU
		for (let x = 0; x < W; x += 2) {
			const reach = half * (0.45 + 0.55 * Math.sin((TAU * 3 * x) / W + phase))
			if (reach < 2) continue
			const mid = line(x)
			for (let y = Math.round((mid - reach) / 2) * 2; y < mid + reach; y += 2) {
				const edgeRow = y < mid - reach + 2
				const r = random()
				grid.set(
					x,
					y,
					edgeRow
						? RUBBLE_LIT
						: r < 0.18
							? RUBBLE_DARK
							: r < 0.4
								? RUBBLE_LIT
								: RUBBLE,
				)
			}
			grid.set(x, Math.round((mid + reach) / 2) * 2, ICE_SHADE)
			if (random() < 0.5)
				grid.set(x, Math.round((mid + reach) / 2) * 2 + 2, ICE_SIDE)
			// Stones that have rolled off it.
			if (random() < 0.06)
				grid.set(x, mid + reach + 4 + between(random, 0, 3) * 2, RUBBLE)
			if (random() < 0.06)
				grid.set(x, mid - reach - 4 - between(random, 0, 3) * 2, RUBBLE_DARK)
		}
	}

	// Crevasses: dark-blue slits, anywhere on the ice, bigger the nearer.
	const placed: [number, number][] = []
	const iceColours = new Set([
		ICE,
		ICE_FILL,
		ICE_SHADE,
		ICE_SIDE,
		ICE_WHITE,
		HOLLOW,
		HOLLOW_DEEP,
	])
	for (let tries = 0; tries < 400 && placed.length < 24; tries++) {
		const y = 44 + Math.round(random() ** 0.8 * 150)
		const x = between(random, 0, CELLS) * 2
		if (
			placed.some(([px, py]) => {
				const dx = Math.min(Math.abs(px - x), W - Math.abs(px - x))
				return dx < 46 && Math.abs(py - y) < 16
			})
		)
			continue
		placed.push([x, y])
		const length =
			Math.round((10 + (y - 40) * 0.4 * (0.6 + random() * 0.9)) / 2) * 2
		const widest = y < 84 ? 1 : y < 130 ? 2 : 3
		const slope = (random() - 0.5) * 0.3
		let jag = 0
		for (let i = 0; i < length; i += 2) {
			const t = (i + 1) / length
			const cells = Math.round(widest * Math.sin(Math.PI * t) ** 0.6 + 0.1)
			if (cells < 1) continue
			if (random() < 0.15) jag += random() < 0.5 ? -2 : 2
			const cy = Math.round((y + slope * i) / 2) * 2 + jag
			if (!iceColours.has(grid.get(x + i, cy) ?? '')) continue
			for (let c = 0; c < cells; c++)
				grid.set(
					x + i,
					cy + c * 2,
					c === cells - 1 && cells > 1 ? CREVASSE : CREVASSE_DEEP,
				)
			if (cells > 1) grid.set(x + i, cy + cells * 2, ICE_SIDE)
		}
	}

	// A few thin streaks on the ice, fewer toward the bottom.
	for (let n = 0; n < 24; n++) {
		const x = between(random, 0, CELLS) * 2
		const y = 70 + between(random, 0, 50) * 2
		const length = between(random, 3, 9) * 2
		for (let i = 0; i < length; i += 2)
			if (iceColours.has(grid.get(x + i, y) ?? ''))
				grid.set(x + i, y, ICE_SHADE)
	}

	return grid.band(ICE_FILL)
})()

// --- Over the clouds: the mountain's own snow ------------------------------------

const SNOW_HEIGHT = 220

const SNOW_LIT = '#ffffff'
const SNOW_HIGH = '#f4f8fc'
const SNOW_MID = '#eef4fa'
const SNOW_FILL = '#e6eef6'
const SNOW_SHADOW = '#b4c8e0'
const SNOW_SHADOW_DEEP = '#9db4d2'
const SASTRUGI = '#cddcec'
const SASTRUGI_DEEP = '#c0d2e6'
const ROCK = '#4f5560'
const ROCK_LIT = '#6a717d'
const ROCK_DEEP = '#383d46'

/**
 * The mountain's snow slopes, nearer than the cloud sea, 220 px tall. A
 * corniced ridge at the top, white and lit, its lip hanging over a blue
 * shadow. Dark rock buttresses poke through the snow, with snow on their
 * ledges and a shadow cast to their right. Below, wind-carved ripples of
 * snow (sastrugi), thin pale-blue streaks each with a lit row over it, the
 * snow a touch bluer the lower it goes, to the plain colour of its fill.
 */
export const SNOWFIELD: Band = (() => {
	const random = seeded(7501)
	const grid = new Grid(SNOW_HEIGHT)
	const ridge = wave(7502, 34, 12, [2, 3, 5])
	const snowColour = (x: number, y: number) =>
		y < 64
			? SNOW_HIGH
			: y < 80
				? dither(x, y, SNOW_HIGH, SNOW_MID)
				: y < 124
					? SNOW_MID
					: y < 140
						? dither(x, y, SNOW_MID, SNOW_FILL)
						: SNOW_FILL
	grid.under(ridge, snowColour)

	// The cornice: a lit crest, with a lip overhanging where it's deepest, blue under it.
	const lips = wave(7503, 0, 1, [4, 7])
	for (let x = 0; x < W; x += 2) {
		const top = at(ridge, x)
		const bump =
			Math.round(((Math.sin(x / 7) + Math.sin(x / 3.1)) * 1.1) / 2) * 2
		grid.rect(x, top + Math.min(0, bump), 2, 6 - Math.min(0, bump), SNOW_LIT)
		const lip = lips(x)
		if (lip > -0.1) {
			const drop = 2 + Math.round((lip + 0.1) * 6) * 2
			grid.rect(x, top + 6, 2, 2, SNOW_LIT)
			for (let y = top + 8; y < top + 8 + drop; y += 2)
				grid.set(x, y, y > top + 8 + drop - 4 ? SNOW_SHADOW_DEEP : SNOW_SHADOW)
		} else {
			grid.rect(x, top + 6, 2, 2, SNOW_SHADOW)
		}
	}

	// Rock buttresses, with snow on their ledges.
	const buttress = (x: number, size: number, depth: number) => {
		const bottom = Math.round((ridge(x) + 28 + depth) / 2) * 2
		const top = bottom - depth
		const w = size
		const shape: [number, number][] = [
			[x - w / 2, bottom],
			[x - w * 0.42, bottom - depth * 0.45],
			[x - w * 0.3, bottom - depth * 0.6],
			[x - w * 0.18, top + 6],
			[x - w * 0.04, top],
			[x + w * 0.1, top + 10],
			[x + w * 0.2, bottom - depth * 0.75],
			[x + w * 0.36, bottom - depth * 0.4],
			[x + w / 2, bottom],
		]
		grid.polygon(shape, ROCK)
		const rock = (px: number, py: number) =>
			[ROCK, ROCK_LIT, ROCK_DEEP].includes(grid.get(px, py) ?? '')
		for (let py = top - 4; py < bottom; py += 2)
			for (let px = x - w; px < x + w; px += 2) {
				if (grid.get(px, py) !== ROCK) continue
				if (!rock(px - 2, py) || !rock(px - 4, py)) grid.set(px, py, ROCK_LIT)
				else if (!rock(px + 2, py) || !rock(px + 4, py) || px > x + w * 0.12)
					grid.set(px, py, ROCK_DEEP)
				else if ((px * 5 + py * 3) % 17 === 0) grid.set(px, py, ROCK_DEEP)
			}
		// Ledges with snow lying on them.
		const ledges = Math.max(2, Math.round(depth / 22))
		for (let k = 0; k < ledges; k++) {
			const ly =
				top +
				10 +
				Math.round((((k + random() * 0.6) / ledges) * (depth - 18)) / 2) * 2
			const lx = x - w * 0.3 + random() * w * 0.4
			const len = between(random, 3, 6) * 2
			for (let i = 0; i < len; i += 2) {
				const px = Math.round(lx / 2) * 2 + i
				if (rock(px, ly) && rock(px, ly + 2)) {
					grid.set(px, ly, SNOW_LIT)
					grid.set(px, ly + 2, SNOW_SHADOW)
				}
			}
		}
		// Snow on its top, and drifted up round its foot.
		for (let px = x - w; px < x + w; px += 2)
			if (rock(px, top + 2) && !rock(px, top)) grid.set(px, top + 2, SNOW_LIT)
		grid.polygon(
			[
				[x - w / 2 - 10, bottom + 6],
				[x - w / 2 + 2, bottom - 4],
				[x + w / 2 - 2, bottom - 4],
				[x + w / 2 + 10, bottom + 6],
			],
			SNOW_HIGH,
		)
		grid.rect(x - w / 2 + 2, bottom - 4, w - 4, 2, SNOW_LIT)
		// The shadow it casts, on the snow to its right.
		for (let py = top + 6; py < bottom + 2; py += 2) {
			let px = x + w
			while (px > x - w && !rock(px, py)) px -= 2
			if (px <= x - w) continue
			const cast = Math.max(
				2,
				Math.round((1 - (py - top) / (depth + 8)) * 5) * 2,
			)
			for (let i = 2; i <= cast; i += 2) {
				const c = grid.get(px + i, py)
				if (c && !rock(px + i, py)) grid.set(px + i, py, SNOW_SHADOW)
			}
		}
	}
	buttress(224, 84, 78)
	buttress(640, 66, 62)
	buttress(866, 34, 30)
	buttress(430, 30, 26)

	// Sastrugi: wind ripples, in streaks, each with a lit row above.
	const snow = new Set([SNOW_HIGH, SNOW_MID, SNOW_FILL])
	for (let n = 0; n < 130; n++) {
		const x = between(random, 0, CELLS) * 2
		const y = 66 + between(random, 0, 70) * 2
		if (y > SNOW_HEIGHT - 14) continue
		const length = between(random, 5, 12 + Math.round((y - 60) / 18)) * 2
		const pair = random() < 0.4 ? between(random, 2, 3) * 2 : 0
		for (let i = 0; i < length; i += 2) {
			const t = (i + 1) / length
			const bow = -Math.round(Math.sin(Math.PI * t)) * 2
			const cy = y + bow
			if (
				snow.has(grid.get(x + i, cy) ?? '') &&
				snow.has(grid.get(x + i, cy - 2) ?? '')
			) {
				grid.set(x + i, cy - 2, SNOW_LIT)
				grid.set(x + i, cy, y > 120 ? SASTRUGI_DEEP : SASTRUGI)
			}
			if (
				pair &&
				t > 0.2 &&
				t < 0.8 &&
				snow.has(grid.get(x + i, cy + pair) ?? '')
			)
				grid.set(x + i, cy + pair, SASTRUGI)
		}
	}

	return grid.band(SNOW_FILL)
})()
