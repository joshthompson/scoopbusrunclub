import { type PixelRect, letterArt, rectsMarkup, svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * An autumn forest, drawn in code, for Bomb Hat's arena: a clear crisp sky,
 * far hills and a nearer treeline all in rust, gold and crimson, a forest
 * floor carpeted in fallen leaves with bracken and a mossy stump, leaves
 * and acorns along the front of the path, big trees to frame the edges
 * (a crimson maple, golden birches, an oak, a spruce), and the small things
 * of the woods: fly agarics, a mossy log, a leaf pile, a hedgehog, a red
 * squirrel, and leaves to drift down. Everything but the horizon bands is
 * drawn at scale 2, a cell two pixels; the bands are already 2 px a cell.
 */

const CELL = 2
const TAU = Math.PI * 2

/** The sky, top and bottom: crisp blue fading to a warm pale at the horizon. */
export const AUTUMN_SKY_TOP = '#86bde8'
export const AUTUMN_SKY_BOTTOM = '#f7e8cc'
/** The forest floor, and the shade of it under the trees. */
export const AUTUMN_GRASS = '#867a3c'
export const AUTUMN_GRASS_SHADE = '#6e6532'
/** The dirt track the runners are on: base, shade and lit. */
export const AUTUMN_PATH = '#ad7e4c'
export const AUTUMN_PATH_SHADE = '#8f643a'
export const AUTUMN_PATH_LIGHT = '#c79a66'
/** What's below the far hills, where the near band covers it. */
export const AUTUMN_FAR_FILL = '#8c7468'

const FLOOR_LIT = '#9a8e46'
const INK = '#1d1a18'

/** Fallen leaves: orange, gold, red, brown, russet. */
const LEAVES = ['#d46a22', '#e0a42e', '#b53a24', '#7e4c28', '#a8561e'] as const

/** Bark: base, lit, shade and dark. */
const BARK = '#5e4030'
const BARK_LIT = '#7e5a40'
const BARK_SHADE = '#432a20'
const BARK_DARK = '#2c1b16'
const MOSS = '#5c8a38'
const MOSS_LIT = '#80ae4c'
const MOSS_SHADE = '#436a2c'

/** One colour's tones for foliage: base, lit, lightest, shade and darkest. */
interface Tones {
	base: string
	lit: string
	hi: string
	shade: string
	dark: string
}

const CRIMSON: Tones = {
	base: '#c0302c',
	lit: '#e0502f',
	hi: '#f47c3c',
	shade: '#96242a',
	dark: '#6c1a26',
}
const ORANGE: Tones = {
	base: '#dd7a22',
	lit: '#f0a032',
	hi: '#fcc654',
	shade: '#b45a20',
	dark: '#843c1e',
}
const GOLD: Tones = {
	base: '#eebc32',
	lit: '#fbdc5c',
	hi: '#fff39a',
	shade: '#d08e22',
	dark: '#a2661c',
}
const RUST: Tones = {
	base: '#b8662a',
	lit: '#d88a3a',
	hi: '#f0b04e',
	shade: '#8e4a24',
	dark: '#66321f',
}
const SPRUCE: Tones = {
	base: '#2f5a3a',
	lit: '#437c4a',
	hi: '#5a9658',
	shade: '#20402c',
	dark: '#152c20',
}

/** `a` mixed `t` of the way to `b`. */
function mix(a: string, b: string, t: number) {
	const channel = (hex: string, i: number) =>
		Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
	return `#${[0, 1, 2]
		.map((i) =>
			Math.round(channel(a, i) * (1 - t) + channel(b, i) * t)
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`
}

const hazeTones = (t: Tones, haze: string, amount: number): Tones => ({
	base: mix(t.base, haze, amount),
	lit: mix(t.lit, haze, amount),
	hi: mix(t.hi, haze, amount),
	shade: mix(t.shade, haze, amount),
	dark: mix(t.dark, haze, amount),
})

type Colour = string | undefined

/** A grid of cells to paint on, later over earlier, wrapping round its sides if it's to tile. */
function canvas(width: number, height: number, wrap = false) {
	const grid: Colour[] = new Array(width * height)
	const set = (x: number, fy: number, fill: Colour) => {
		const y = Math.round(fy)
		if (y < 0 || y >= height) return
		const col = wrap ? ((Math.round(x) % width) + width) % width : Math.round(x)
		if (col < 0 || col >= width) return
		grid[y * width + col] = fill
	}
	const self = {
		set,
		get: (x: number, y: number) =>
			y < 0 || y >= height || x < 0 || x >= width
				? undefined
				: grid[y * width + x],
		rect(x: number, y: number, w: number, h: number, fill: Colour) {
			for (let j = 0; j < h; j++)
				for (let i = 0; i < w; i++) set(x + i, y + j, fill)
		},
		/** An ellipse round `cx`, `cy`, `rx` by `ry` across. */
		ellipse(cx: number, cy: number, rx: number, ry: number, fill: Colour) {
			for (let j = Math.floor(cy - ry); j <= cy + ry; j++)
				for (let i = Math.floor(cx - rx); i <= cx + rx; i++)
					if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1)
						set(i, j, fill)
		},
		/** A line `w` cells thick, stepped. */
		line(
			x0: number,
			y0: number,
			x1: number,
			y1: number,
			w: number,
			fill: Colour,
		) {
			const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
			for (let i = 0; i <= n; i++) {
				const x = Math.round(x0 + ((x1 - x0) * i) / n)
				const y = Math.round(y0 + ((y1 - y0) * i) / n)
				for (let j = 0; j < w; j++)
					for (let k = 0; k < w; k++)
						set(x + j - Math.floor(w / 2), y + k, fill)
			}
		},
		/** As an image's URL, `scale` px a cell. */
		url(scale = 1) {
			const rects: PixelRect[] = []
			for (let y = 0; y < height; y++) {
				let from = 0
				let colour: Colour
				for (let x = 0; x <= width; x++) {
					const here = x < width ? grid[y * width + x] : undefined
					if (here !== colour) {
						if (colour)
							rects.push([
								from * scale,
								y * scale,
								(x - from) * scale,
								scale,
								colour,
							])
						from = x
						colour = here
					}
				}
			}
			return svgUrl(width * scale, height * scale, rectsMarkup(rects))
		},
	}
	return self
}
type Canvas = ReturnType<typeof canvas>

/** A steady pseudo-random number for a place, 0 up to 1. */
function noise(x: number, y: number, seed: number) {
	let h = (x * 374761393 + y * 668265263 + seed * 144665) | 0
	h = Math.imul(h ^ (h >>> 13), 1274126177)
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smooth value noise, 0 to 1, wrapping every `period` across so a band tiles. */
function smooth(x: number, y: number, seed: number, period: number) {
	const x0 = Math.floor(x)
	const y0 = Math.floor(y)
	const fx = x - x0
	const fy = y - y0
	const at = (i: number, j: number) =>
		noise(((i % period) + period) % period, j, seed)
	const sx = fx * fx * (3 - 2 * fx)
	const sy = fy * fy * (3 - 2 * fy)
	const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx
	const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx
	return top * (1 - sy) + bottom * sy
}

/**
 * A leafy crown: overlapping lobes, each lit at its top left and shaded at
 * its bottom right, so it reads as clumps of leaves; `sets` are the colours
 * lobes are picked from (the first most often).
 */
function canopy(
	g: Canvas,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	sets: Tones[],
	random: () => number,
	lobeSize = 0.32,
) {
	interface Lobe {
		x: number
		y: number
		rx: number
		ry: number
		t: Tones
	}
	const pick = () =>
		random() < 0.7 ? sets[0] : sets[Math.floor(random() * sets.length)]
	// The tone is picked a patch at a time, so a colour comes in drifts.
	const lobes: Lobe[] = [
		{ x: cx, y: cy, rx: rx * 0.8, ry: ry * 0.8, t: sets[0] },
	]
	const size = (rx + ry) / 2
	const r = Math.max(3.2, size * lobeSize * 0.62)
	const ring = Math.max(10, Math.round((TAU * size * 0.86) / (r * 1.1)))
	for (let i = 0; i < ring; i++) {
		const a = (i / ring) * TAU + random() * 0.2
		lobes.push({
			x: cx + Math.cos(a) * rx * 0.86,
			y: cy + Math.sin(a) * ry * 0.86,
			rx: r * (0.85 + random() * 0.35),
			ry: r * (0.85 + random() * 0.35),
			t: sets[Math.floor(noise(Math.round(a * 3), 3, 5) * sets.length)],
		})
	}
	const inner = Math.round((rx * ry) / (r * r * 1.6))
	for (let i = 0; i < inner; i++) {
		const a = random() * TAU
		const d = Math.sqrt(random()) * 0.78
		const x = cx + Math.cos(a) * rx * d
		const y = cy + Math.sin(a) * ry * d
		lobes.push({
			x,
			y,
			rx: r * (0.9 + random() * 0.5),
			ry: r * (0.9 + random() * 0.5),
			t:
				noise(Math.floor(x / 14), Math.floor(y / 14), 11) < 0.3
					? pick()
					: sets[0],
		})
	}
	for (let y = Math.floor(cy - ry * 1.1); y <= cy + ry * 1.1; y++)
		for (let x = Math.floor(cx - rx * 1.1); x <= cx + rx * 1.1; x++) {
			let best: Lobe | undefined
			let bestD = 1.6
			for (const l of lobes) {
				const d =
					(((x + 0.5 - l.x) / l.rx) ** 2 + ((y + 0.5 - l.y) / l.ry) ** 2) *
					(l === lobes[0] ? 1.6 : 1)
				if (d <= bestD) {
					bestD = d
					best = l
				}
			}
			if (!best) continue
			const local =
				((x + 0.5 - best.x) / best.rx) * 0.5 +
				((y + 0.5 - best.y) / best.ry) * 0.85
			const global = ((x + 0.5 - cx) / rx) * 0.5 + ((y + 0.5 - cy) / ry) * 0.85
			const s = local * 0.75 + global * 0.65
			const t = best.t
			let fill =
				s < -0.7
					? t.hi
					: s < -0.28
						? t.lit
						: s < 0.38
							? t.base
							: s < 0.85
								? t.shade
								: t.dark
			// A few leaves a tone off, so it isn't clean.
			const r = noise(x, y, 7)
			if (r < 0.03) fill = fill === t.shade ? t.dark : t.lit
			else if (r > 0.975) fill = fill === t.base ? t.shade : t.base
			g.set(x, y, fill)
		}
}

/** A trunk: lit down its left, shaded down its right, flared into roots at its foot. */
function trunk(
	g: Canvas,
	cx: number,
	top: number,
	bottom: number,
	wTop: number,
	wBottom: number,
	flare: number,
	rootRows: number,
	random: () => number,
	lean = 0,
) {
	for (let y = top; y <= bottom; y++) {
		const t = (y - top) / (bottom - top)
		const w = Math.round(wTop + (wBottom - wTop) * t)
		const into = y - (bottom - rootRows)
		const extra = into > 0 ? Math.round(flare * (into / rootRows) ** 2) : 0
		const mid = cx + Math.round(lean * (1 - t))
		const left = Math.round(mid - w / 2) - extra
		const right = Math.round(mid + w / 2) + extra
		for (let x = left; x < right; x++) {
			const side = Math.max(1, Math.floor(w / 5))
			g.set(
				x,
				y,
				x < left + side + (extra > 2 ? 1 : 0)
					? BARK_LIT
					: x >= right - side - (extra > 2 ? 1 : 0)
						? BARK_SHADE
						: BARK,
			)
		}
		// Streaks of dark in the bark, and here and there a gap between its roots.
		if (random() < 0.22) {
			const x = left + 1 + Math.floor(random() * Math.max(1, right - left - 2))
			g.set(x, y, BARK_DARK)
			if (random() < 0.5) g.set(x, y + 1, BARK_DARK)
		}
	}
}

/** Moss and fallen leaves round a trunk's foot. */
function footing(
	g: Canvas,
	cx: number,
	y: number,
	spread: number,
	random: () => number,
) {
	for (let i = 0; i < spread * 1.2; i++) {
		const x = cx - spread + Math.floor(random() * spread * 2)
		const yy = y - Math.floor(random() * 3)
		g.set(x, yy, LEAVES[Math.floor(random() * LEAVES.length)])
		if (random() < 0.3)
			g.set(x + 1, yy, LEAVES[Math.floor(random() * LEAVES.length)])
	}
	for (let i = 0; i < spread * 0.8; i++) {
		const x = cx - spread / 2 + Math.floor(random() * spread)
		g.set(x, y - 4 - Math.floor(random() * 5), random() < 0.4 ? MOSS_LIT : MOSS)
	}
}

// --- The horizon -------------------------------------------------------------------

const BAND_W = 480
const BAND_H = 80

/** A hill's top edge at column `x`, whole cycles across the band so it wraps. */
const ridge = (
	x: number,
	base: number,
	waves: [cycles: number, height: number, phase: number][],
) =>
	base +
	waves.reduce(
		(sum, [k, a, p]) => sum + a * Math.sin((TAU * k * x) / BAND_W + p),
		0,
	)

/** A dark conifer, a pointed tree of stacked tiers, its foot at `base`. */
function conifer(
	g: Canvas,
	x: number,
	base: number,
	height: number,
	tones: [string, string, string],
) {
	const [lit, body, shade] = tones
	for (let r = 0; r < height; r++) {
		const half =
			Math.round(((r + 1) / height) * (height / 3.4)) + (r % 4 === 3 ? 1 : 0)
		for (let dx = -half; dx <= half; dx++)
			g.set(
				x + dx,
				base - height + r,
				dx < -half / 3 ? lit : dx > half / 3 ? shade : body,
			)
	}
	g.rect(x, base, 1, 2, shade)
}

export const AUTUMN_FAR_WIDTH = 960
export const AUTUMN_FAR_HEIGHT = 160

/**
 * Hills far off, covered in autumn woodland, hazy: a pale violet-blue ridge
 * behind, and in front a nearer one patched in muted rust, gold and olive
 * with a sprinkle of dark conifers along its top. 960 by 160 px, wraps
 * seamlessly, clear above.
 */
export const autumnFar = (() => {
	const g = canvas(BAND_W, BAND_H, true)
	const random = seeded(4417)
	const HAZE = '#c9bfd8'
	// The back ridge: nearly the sky, a violet-blue with rose and gold in it.
	const back = ['#b5abc9', '#c1a7b6', '#c9bfa6', '#b9b3cc'] as const
	const jitter = Array.from({ length: BAND_W }, (_, i) =>
		Math.floor(noise(Math.floor(i / 3), 1, 4) * 3),
	)
	for (let x = 0; x < BAND_W; x++) {
		const top = Math.round(
			ridge(x, 40, [
				[3, 6, 0.4],
				[7, 3, 2],
				[13, 1.5, 1],
			]) - jitter[x],
		)
		for (let y = top; y < BAND_H; y++) {
			const n = smooth(x / 12, y / 6, 9, BAND_W / 12)
			g.set(
				x,
				y,
				y < top + 2
					? '#cdc6dc'
					: back[Math.min(back.length - 1, Math.floor(n * back.length))],
			)
		}
	}
	for (const x of [20, 55, 131, 168, 233, 301, 342, 405, 452])
		conifer(
			g,
			x,
			Math.round(
				ridge(x, 40, [
					[3, 6, 0.4],
					[7, 3, 2],
					[13, 1.5, 1],
				]),
			) + 3,
			8,
			['#9d9cb6', '#8f90ac', '#83849f'],
		)
	// The front ridge, patched in the colours of the woods, half lost in haze.
	const front = [
		mix('#a8566a', HAZE, 0.45),
		mix('#c9803c', HAZE, 0.45),
		mix('#d6a444', HAZE, 0.45),
		mix('#b2603a', HAZE, 0.45),
		mix('#8c7a64', HAZE, 0.45),
	]
	const wavesFront: [number, number, number][] = [
		[2, 5, 1.1],
		[5, 3, 0.2],
		[9, 2, 2.6],
		[17, 1, 0.5],
	]
	const frontTop = (x: number) => Math.round(ridge(x, 54, wavesFront))
	for (let x = 0; x < BAND_W; x++) {
		const top = frontTop(x) - jitter[(x * 7) % BAND_W]
		for (let y = top; y < BAND_H; y++) {
			if (y >= 70) {
				g.set(x, y, AUTUMN_FAR_FILL)
				continue
			}
			const n = smooth(x / 15, y / 7, 21, BAND_W / 15)
			let fill = front[Math.min(front.length - 1, Math.floor(n * front.length))]
			if (y < top + 2) fill = mix(fill, '#ffffff', 0.18)
			else {
				// Clumps of trees: a lit one, a shaded one, in little blocks.
				const c = noise(Math.floor(x / 2), Math.floor(y / 2), 3)
				if (c < 0.16) fill = mix(fill, '#fff2d8', 0.2)
				else if (c > 0.84) fill = mix(fill, '#5d4a68', 0.2)
			}
			if (y > 56) fill = mix(fill, AUTUMN_FAR_FILL, Math.min(1, (y - 56) / 14))
			g.set(x, y, fill)
		}
	}
	const dark = mix('#2f4a3c', HAZE, 0.5)
	for (let i = 0; i < 26; i++) {
		const x = Math.floor((i * BAND_W) / 26 + random() * 12)
		conifer(g, x, frontTop(x) + 3, 9 + Math.floor(random() * 5), [
			mix('#3f6048', HAZE, 0.5),
			dark,
			mix('#233a30', HAZE, 0.5),
		])
	}
	return g.url(CELL)
})()

const FLOOR_TOP = 60

/** The sets canopies in the treeline are picked from. */
const TREELINE = [ORANGE, CRIMSON, GOLD, RUST, ORANGE, CRIMSON, GOLD]

/** A spruce for the treeline or a prop: stacked drooping tiers, lit at the left. */
function spruce(
	g: Canvas,
	cx: number,
	base: number,
	height: number,
	halfWidth: number,
	tones: Tones,
	random: () => number,
) {
	const tiers = Math.max(5, Math.round(height / 11))
	g.rect(cx - 1, base - 6, 3, 6, BARK_SHADE)
	g.set(cx - 1, base - 6, BARK)
	const trunkTop = base - 5
	for (let i = 0; i < tiers; i++) {
		const top = base - height + Math.round((i * (height - 8)) / tiers)
		const next = base - height + Math.round(((i + 1) * (height - 8)) / tiers)
		const rows =
			Math.min(trunkTop, next + Math.round(height / tiers) * 0.5) - top
		const reach = Math.max(
			2,
			Math.round(((i + 1.2) / (tiers + 0.2)) * halfWidth),
		)
		for (let r = 0; r < rows; r++) {
			const half = Math.round(((r + 1) / rows) * reach)
			// A ragged, drooping lower edge.
			const droop = r > rows - 3 && random() < 0.5 ? 0 : 0
			for (let dx = -half; dx <= half + droop; dx++) {
				const edge = r >= rows - 2
				const fill = edge
					? dx > 0
						? tones.dark
						: tones.shade
					: dx < -half * 0.2
						? dx < -half * 0.6 && r < rows - 4
							? tones.lit
							: tones.base
						: dx > half * 0.35
							? tones.shade
							: tones.base
				g.set(cx + dx, top + r, fill)
			}
		}
	}
}

export const AUTUMN_NEAR_WIDTH = 960
export const AUTUMN_NEAR_HEIGHT = 160

/**
 * A dense treeline, nearer: a hazier row of canopies behind, then a front
 * row of big rounded ones in orange, crimson, gold and rust with a few dark
 * spruces among them, trunks showing at their feet, on a forest floor in the
 * grass colour that fills to the band's bottom. 960 by 160 px, wraps
 * seamlessly, clear above.
 */
export const autumnNear = (() => {
	const g = canvas(BAND_W, BAND_H, true)
	const random = seeded(5522)
	// The floor first, so the trunks stand on it.
	g.rect(0, FLOOR_TOP, BAND_W, BAND_H - FLOOR_TOP, AUTUMN_GRASS)
	// The back row, hazier and a little smaller.
	const HAZE = '#a8a2bc'
	for (let i = 0; i < 20; i++) {
		const cx = Math.round(i * 24 + random() * 8)
		const cy = 34 + Math.round(random() * 5)
		const t = hazeTones(TREELINE[i % TREELINE.length], HAZE, 0.38)
		g.rect(cx - 1, cy + 8, 3, FLOOR_TOP - cy - 7, mix(BARK_SHADE, HAZE, 0.4))
		canopy(g, cx, cy, 14 + random() * 5, 12 + random() * 3, [t], random)
	}
	// The front row, and spruces among it.
	for (let i = 0; i < 16; i++) {
		const cx = Math.round(i * 30 + 12 + random() * 6)
		const cy = 32 + Math.round(random() * 8)
		const rx = 14 + random() * 7
		const ry = 12 + random() * 6
		if (i % 5 === 2) {
			spruce(
				g,
				cx,
				FLOOR_TOP + 3,
				46 + Math.round(random() * 6),
				11,
				SPRUCE,
				random,
			)
			continue
		}
		const w = 3 + (random() < 0.4 ? 1 : 0)
		trunk(g, cx, Math.round(cy + ry * 0.4), FLOOR_TOP + 3, w, w, 1, 4, random)
		const set = TREELINE[(i * 3) % TREELINE.length]
		canopy(
			g,
			cx,
			cy,
			rx,
			ry,
			[set, TREELINE[(i * 3 + 2) % TREELINE.length]],
			random,
		)
	}
	// The floor: a lit edge, shade under the trees, a scatter of fallen leaves.
	for (let x = 0; x < BAND_W; x++) {
		g.set(x, FLOOR_TOP + 3, noise(x, 0, 5) < 0.5 ? FLOOR_LIT : AUTUMN_GRASS)
		if (noise(x, 1, 6) < 0.6) g.set(x, FLOOR_TOP + 4, AUTUMN_GRASS_SHADE)
		if (noise(x, 2, 8) < 0.1) g.set(x, FLOOR_TOP + 2, AUTUMN_GRASS_SHADE)
	}
	for (let i = 0; i < 70; i++) {
		const x = Math.floor(random() * BAND_W)
		const y = FLOOR_TOP + 5 + Math.floor(random() * (BAND_H - FLOOR_TOP - 6))
		const c = mix(
			LEAVES[Math.floor(random() * LEAVES.length)],
			AUTUMN_GRASS,
			0.3,
		)
		g.set(x, y, c)
		g.set(x + 1, y, c)
	}
	return g.url(CELL)
})()

// --- The floor and the front of the path ---------------------------------------------

const FIELD_W = 480
const FIELD_H = 86

/** The forest floor behind the path, 960 by 172 px. */
export const AUTUMN_FIELD_WIDTH = FIELD_W * CELL
export const AUTUMN_FIELD_HEIGHT = FIELD_H * CELL

/** A bracken clump: bronze fronds curling out from one foot, each feathered. */
function bracken(
	g: Canvas,
	bx: number,
	by: number,
	size: number,
	random: () => number,
) {
	const FROND = ['#8e5e26', '#b8802f', '#6a4622']
	for (const [dir, len] of [
		[-1, size],
		[1, size],
		[-1, size * 0.7],
		[1, size * 0.75],
		[0, size * 0.9],
	] as const) {
		const L = Math.round(len)
		for (let i = 0; i <= L * 1.6; i++) {
			const t = i / (L * 1.6)
			const x = bx + dir * L * 0.9 * t * (0.35 + 0.65 * t)
			const y = by - L * 0.95 * Math.sin((t * Math.PI) / 2)
			g.set(x, y, FROND[2])
			// Pinnae either side of the spine, shorter toward the tip.
			if (i % 2 === 0 && t > 0.1 && t < 0.96) {
				const reach = Math.max(1, Math.round(4 * (1 - t) + 0.6))
				for (let k = 1; k <= reach; k++) {
					const drop = k > 1 ? 1 : 0
					g.set(x - k, y + drop, FROND[1])
					g.set(x + k, y + drop, FROND[0])
				}
				if (random() < 0.5) g.set(x, y - 1, FROND[1])
			}
		}
	}
}

/** A stump: bark sides, a pale ringed top, moss on its lit side. */
function stump(g: Canvas, x: number, base: number, w: number, h: number) {
	g.rect(x, base - h, w, h, BARK)
	g.rect(x, base - h, 2, h, BARK_LIT)
	g.rect(x + w - 2, base - h, 2, h, BARK_SHADE)
	for (let i = 2; i < w - 2; i += 2) g.set(x + i, base - 2 - (i % 3), BARK_DARK)
	g.rect(x, base - 1, w, 1, BARK_SHADE)
	g.ellipse(x + w / 2, base - h, w / 2, 2, '#b88a5a')
	g.ellipse(x + w / 2, base - h, w / 4, 1, '#d4aa74')
	g.set(x + w / 2, base - h, '#8a6038')
	// Moss over its top left and down its side.
	g.rect(x, base - h - 1, 3, 2, MOSS)
	g.rect(x - 1, base - h, 2, 3, MOSS_SHADE)
	g.set(x, base - h - 1, MOSS_LIT)
	g.set(x + 1, base - h - 1, MOSS_LIT)
	g.rect(x + 1, base - h + 2, 2, 3, MOSS)
	g.set(x + 1, base - h + 2, MOSS_LIT)
}

/**
 * The forest floor behind the path, tiling: olive-ochre earth with sunny
 * and shady patches, carpeted in fallen leaves, tiny specks far off at the
 * top and bigger ones near the path; two bronze bracken clumps and a mossy
 * stump toward the sides. Its foot sits on the path's back edge; ragged and
 * clear at the top.
 */
export const AUTUMN_FIELD = (() => {
	const g = canvas(FIELD_W, FIELD_H, true)
	const random = seeded(8113)
	for (let y = 0; y < FIELD_H; y++)
		for (let x = 0; x < FIELD_W; x++) {
			if (y < 6 && random() > (y + 0.5) / 6) continue
			g.set(x, y, AUTUMN_GRASS)
		}
	// Shady and sunlit patches, flat and wide.
	for (let i = 0; i < 46; i++) {
		const y = 8 + random() * (FIELD_H - 8)
		const t = y / FIELD_H
		g.ellipse(
			random() * FIELD_W,
			y,
			6 + random() * 14 * (0.5 + t),
			1 + t * 2.4,
			AUTUMN_GRASS_SHADE,
		)
	}
	for (let i = 0; i < 22; i++) {
		const y = 10 + random() * (FIELD_H - 14)
		const t = y / FIELD_H
		g.ellipse(random() * FIELD_W, y, 5 + random() * 12, 1 + t * 2, FLOOR_LIT)
	}
	// Fallen leaves, small and dull far off, bigger and brighter near.
	for (let i = 0; i < 900; i++) {
		const y = 3 + Math.floor(random() ** 0.75 * (FIELD_H - 5))
		const t = y / FIELD_H
		const x = Math.floor(random() * FIELD_W)
		const c = mix(
			LEAVES[Math.floor(random() * LEAVES.length)],
			AUTUMN_GRASS,
			0.5 * (1 - t) + 0.12,
		)
		const w = 1 + Math.round(t * 2.2 * random())
		const h = t > 0.55 && random() < 0.6 ? 2 : 1
		g.rect(x, y, w, h, c)
		if (w >= 2 && h === 2) g.set(x, y, mix(c, '#ffffff', 0.16))
	}
	bracken(g, 40, 64, 15, random)
	bracken(g, 404, 76, 13, random)
	stump(g, 440, 72, 14, 10)
	return g.url()
})()

const FRONT_W = 480
const FRONT_H = 18

/** The strip in front of the path, 960 by 36 px. */
export const AUTUMN_FRONT_WIDTH = FRONT_W * CELL
export const AUTUMN_FRONT_HEIGHT = FRONT_H * CELL

/**
 * The front of the path, tiling: a ragged edge of forest floor along the
 * foot, with fallen leaves, acorns, little mushrooms and a fern frond
 * standing on it, and gaps between. Clear above them.
 */
export const AUTUMN_FRONT = (() => {
	const g = canvas(FRONT_W, FRONT_H, true)
	const random = seeded(3391)
	const foot = FRONT_H - 5
	for (let x = 0; x < FRONT_W; x++) {
		for (let y = foot + 1; y < FRONT_H; y++) g.set(x, y, AUTUMN_GRASS)
		if (random() < 0.7) g.set(x, foot, AUTUMN_GRASS)
		if (random() < 0.12) g.set(x, foot - 1, AUTUMN_GRASS_SHADE)
		if (random() < 0.15) g.set(x, foot + 1, FLOOR_LIT)
		if (random() < 0.3)
			g.set(x, FRONT_H - 1 - Math.floor(random() * 2), AUTUMN_GRASS_SHADE)
	}
	const leaf = (x: number, c: string, lit: string, shade: string) => {
		// A leaf lying on the ground, long and flat, lit on top.
		g.rect(x, foot, 5, 1, c)
		g.rect(x + 1, foot - 1, 3, 1, lit)
		g.set(x + 5, foot, shade)
		g.set(x - 1, foot, shade)
		g.rect(x + 1, foot + 1, 3, 1, shade)
	}
	const acorn = (x: number) => {
		g.rect(x, foot - 2, 3, 1, '#5a3c22')
		g.rect(x, foot - 1, 3, 2, '#b0773a')
		g.set(x, foot - 1, '#d09a52')
		g.set(x + 2, foot, '#8a5a2c')
		g.set(x + 1, foot - 3, '#5a3c22')
	}
	const mushroom = (x: number, cap: string, capLit: string, spot: boolean) => {
		g.rect(x + 1, foot - 3, 2, 3, '#efe3c8')
		g.set(x + 2, foot - 2, '#cfc2a4')
		g.rect(x, foot - 5, 4, 2, cap)
		g.rect(x + 1, foot - 6, 2, 1, cap)
		g.set(x + 1, foot - 6, capLit)
		g.set(x, foot - 5, capLit)
		if (spot) g.set(x + 2, foot - 5, '#fbf4e6')
	}
	const fern = (x: number) => {
		for (const dir of [-1, 1]) {
			const len = dir < 0 ? 13 : 10
			for (let i = 0; i <= len; i++) {
				const t = i / len
				const fx = x + dir * Math.round(1 + t * t * 9 + t * 2)
				const fy = foot - 1 - Math.round(Math.sin(t * 1.5) * 10 * (len / 13))
				g.set(fx, fy, dir < 0 ? '#9ab852' : '#7a9a42')
				if (i > 1 && i < len) {
					g.set(fx, fy + 1, '#5a7c34')
					g.set(fx - dir, fy - 1, dir < 0 ? '#b4cc66' : '#92b04c')
					if (i % 2 === 0) g.set(fx, fy + 2, '#4c6e2c')
				}
			}
		}
		g.rect(x, foot - 3, 1, 3, '#4c6e2c')
	}
	const things = [
		() => leaf(0, '#d46a22', '#e88a3a', '#a8481c'),
		() => acorn(0),
		() => mushroom(0, '#d9302c', '#ef5a40', true),
		() => fern(0),
		() => leaf(0, '#e0a42e', '#f2c455', '#b27a1c'),
		() => mushroom(0, '#9a5a30', '#bc7a44', false),
		() => leaf(0, '#b53a24', '#d65038', '#8a2a1c'),
	]
	// Place them, each at an x of its own, by drawing on a shifted canvas.
	let x = 8
	let n = 0
	while (x < FRONT_W - 12) {
		const kind = n++ % things.length
		drawAt(things[kind], g, x)
		x += 10 + Math.floor(random() * 16)
	}
	return g.url()
})()

/** Runs `draw` with the canvas's cells shifted `dx` along. */
function drawAt(draw: () => void, g: Canvas, dx: number) {
	const set = g.set
	const rect = g.rect
	g.set = (x, y, f) => set(x + dx, y, f)
	g.rect = (x, y, w, h, f) => rect(x + dx, y, w, h, f)
	try {
		draw()
	} finally {
		g.set = set
		g.rect = rect
	}
}

// --- Props -------------------------------------------------------------------------

const MAPLE_W = 110
const MAPLE_H = 210

/** The maple, 220 by 420 px: its foot is the bottom middle. */
export const AUTUMN_MAPLE_WIDTH = MAPLE_W * CELL
export const AUTUMN_MAPLE_HEIGHT = MAPLE_H * CELL

/**
 * A big crimson maple: a thick trunk flaring into roots at its foot, forking
 * up into a canopy so wide and tall it runs off the top of the picture,
 * crimson with orange where the light catches it, lit from the top left,
 * fallen leaves and a little moss at its roots. 110 by 210 cells.
 */
export const AUTUMN_MAPLE = (() => {
	const g = canvas(MAPLE_W, MAPLE_H)
	const random = seeded(6021)
	trunk(g, 55, 76, MAPLE_H - 1, 15, 15, 12, 16, random)
	// Limbs forking out under the canopy.
	g.line(50, 100, 28, 82, 5, BARK)
	g.line(60, 100, 84, 82, 5, BARK_SHADE)
	g.line(48, 92, 38, 70, 4, BARK_LIT)
	canopy(g, 55, 44, 55, 45, [CRIMSON, ORANGE, CRIMSON, CRIMSON], random)
	footing(g, 55, MAPLE_H - 1, 24, random)
	return g.url()
})()

const BIRCH_W = 70
const BIRCH_H = 200

/** The birches, 140 by 400 px: the foot is the bottom middle of the pair. */
export const AUTUMN_BIRCH_WIDTH = BIRCH_W * CELL
export const AUTUMN_BIRCH_HEIGHT = BIRCH_H * CELL

const BIRCH_WHITE = '#f0eadd'
const BIRCH_SHADE = '#cdc6b8'
const BIRCH_MARK = '#38302c'

/** A birch trunk: white bark, shaded down its right, dark marks across it. */
function birchTrunk(
	g: Canvas,
	cx: number,
	top: number,
	bottom: number,
	w: number,
	lean: number,
	random: () => number,
) {
	for (let y = top; y <= bottom; y++) {
		const t = (y - top) / (bottom - top)
		const into = y - (bottom - 8)
		const extra = into > 0 ? Math.round(2 * (into / 8) ** 2) : 0
		const left = Math.round(cx + lean * (1 - t) - w / 2) - extra
		const right = left + w + extra * 2
		for (let x = left; x < right; x++)
			g.set(x, y, x >= right - 2 ? BIRCH_SHADE : BIRCH_WHITE)
		if (into > 2) g.set(left, y, BIRCH_SHADE)
		if (random() < 0.16) {
			const len = 1 + Math.floor(random() * (w - 1))
			const at = left + Math.floor(random() * (w - len + 1))
			g.rect(at, y, len, 1, BIRCH_MARK)
		}
	}
	// Dark, rough bark at its foot.
	g.rect(cx - 3 - Math.round(lean * 0), bottom - 3, w + 5, 4, BIRCH_SHADE)
	for (let x = cx - 3; x < cx + w + 2; x++)
		if (random() < 0.5) g.set(x, bottom - Math.floor(random() * 4), BIRCH_MARK)
}

/**
 * A pair of golden birches: slender white trunks marked in dark dashes,
 * leaning a little apart, under oval crowns of yellow leaves that thin and
 * droop at their edges. 70 by 200 cells.
 */
export const AUTUMN_BIRCH = (() => {
	const g = canvas(BIRCH_W, BIRCH_H)
	const random = seeded(7702)
	birchTrunk(g, 22, 40, BIRCH_H - 1, 6, 3, random)
	birchTrunk(g, 47, 58, BIRCH_H - 1, 5, -2, random)
	g.line(22, 90, 12, 72, 2, BIRCH_WHITE)
	g.line(47, 100, 58, 84, 2, BIRCH_WHITE)
	const sets = [GOLD, GOLD, ORANGE]
	canopy(g, 46, 66, 21, 28, sets, random, 0.34)
	canopy(g, 24, 40, 22, 34, sets, random, 0.34)
	// Leaves hanging loose below the crowns.
	for (let i = 0; i < 40; i++) {
		const x = 6 + Math.floor(random() * 58)
		const y = 70 + Math.floor(random() * 30)
		if (g.get(x, y) || (!g.get(x, y - 1) && !g.get(x, y - 2))) continue
		g.set(x, y, random() < 0.5 ? GOLD.base : GOLD.shade)
		if (random() < 0.4) g.set(x, y + 1, GOLD.lit)
	}
	footing(g, 34, BIRCH_H - 1, 16, random)
	return g.url()
})()

const OAK_W = 80
const OAK_H = 120

/** The oak, 160 by 240 px: its foot is the bottom middle. */
export const AUTUMN_OAK_WIDTH = OAK_W * CELL
export const AUTUMN_OAK_HEIGHT = OAK_H * CELL

/**
 * An oak in the middle distance: a short stout trunk with two limbs under a
 * broad, rounded crown of orange-brown leaves with gold on its lit side.
 * 80 by 120 cells.
 */
export const AUTUMN_OAK = (() => {
	const g = canvas(OAK_W, OAK_H)
	const random = seeded(3310)
	trunk(g, 40, 54, OAK_H - 1, 10, 12, 7, 9, random)
	g.line(37, 66, 18, 50, 3, BARK)
	g.line(43, 66, 63, 48, 3, BARK_SHADE)
	canopy(g, 40, 34, 39, 31, [RUST, ORANGE, RUST, GOLD], random, 0.3)
	footing(g, 40, OAK_H - 1, 14, random)
	return g.url()
})()

const SPRUCE_W = 40
const SPRUCE_H = 110

/** The spruce, 80 by 220 px: its foot is the bottom middle. */
export const AUTUMN_SPRUCE_WIDTH = SPRUCE_W * CELL
export const AUTUMN_SPRUCE_HEIGHT = SPRUCE_H * CELL

/**
 * A dark green spruce, to set the autumn colours off: tiers of drooping
 * boughs getting wider down to a bare trunk, lit at the left. 40 by 110
 * cells.
 */
export const AUTUMN_SPRUCE = (() => {
	const g = canvas(SPRUCE_W, SPRUCE_H)
	const random = seeded(9090)
	spruce(g, 20, SPRUCE_H, SPRUCE_H, 19, SPRUCE, random)
	footing(g, 20, SPRUCE_H - 1, 8, random)
	return g.url()
})()

/** The fly agarics, 28 by 20 px: their foot is the bottom middle. */
export const AUTUMN_TOADSTOOLS_WIDTH = 14 * CELL
export const AUTUMN_TOADSTOOLS_HEIGHT = 10 * CELL

const CAP = '#d9302c'
const CAP_LIT = '#f05a40'
const CAP_SHADE = '#a3222a'
const SPOT = '#fbf4e6'
const STALK = '#efe6d2'
const STALK_SHADE = '#cfc2a6'

/**
 * A cluster of three fly agaric toadstools, red caps spotted white, the
 * tallest in the middle, on a little moss. 14 by 10 cells.
 */
export const AUTUMN_TOADSTOOLS = (() => {
	const g = canvas(14, 10)
	const toadstool = (
		x: number,
		base: number,
		capW: number,
		capH: number,
		stalk: number,
	) => {
		const half = capW / 2
		const mid = x + half
		g.rect(mid - 1, base - stalk, 2, stalk, STALK)
		g.set(mid, base - stalk + 1, STALK_SHADE)
		g.rect(mid, base - stalk, 1, stalk, STALK_SHADE)
		for (let r = 0; r < capH; r++) {
			const inset = Math.round((capH - 1 - r) * (capW / (capH * 3)))
			const top = base - stalk - capH + r + 1
			g.rect(x + inset, top, capW - inset * 2, 1, CAP)
			g.set(x + inset, top, CAP_LIT)
			g.set(x + capW - inset - 1, top, CAP_SHADE)
			if (r === capH - 1) g.rect(x + inset, top, capW - inset * 2, 1, CAP_SHADE)
		}
		g.rect(x + 1, base - stalk - capH + 2, 1, 1, SPOT)
		g.set(x + 1, base - stalk - capH + 1, CAP_LIT)
		if (capW > 5) {
			g.rect(x + capW - 3, base - stalk - capH + 3, 1, 1, SPOT)
			g.set(mid, base - stalk - capH + 1, SPOT)
		}
	}
	g.rect(0, 8, 14, 2, MOSS)
	for (const x of [1, 5, 9, 12]) g.set(x, 8, MOSS_LIT)
	toadstool(0, 9, 4, 3, 2)
	toadstool(9, 9, 5, 3, 2)
	toadstool(3, 9, 7, 4, 3)
	return g.url()
})()

/** The log, 88 by 28 px: its foot is the bottom middle. */
export const AUTUMN_LOG_WIDTH = 44 * CELL
export const AUTUMN_LOG_HEIGHT = 14 * CELL

/**
 * A mossy fallen log lying along the ground, bark lit on top, a pale ringed
 * end at its left, moss over its back, and an orange bracket fungus in tiers
 * on its side. 44 by 14 cells.
 */
export const AUTUMN_LOG = (() => {
	const g = canvas(44, 14)
	// The body, a rounded cylinder.
	g.rect(4, 3, 38, 10, BARK)
	g.rect(4, 3, 38, 2, BARK_LIT)
	g.rect(4, 11, 38, 2, BARK_SHADE)
	g.rect(4, 12, 38, 1, BARK_DARK)
	for (const [x, y, w] of [
		[9, 6, 5],
		[18, 8, 7],
		[27, 6, 4],
		[33, 9, 6],
		[14, 10, 4],
	])
		g.rect(x, y, w, 1, BARK_DARK)
	for (const x of [11, 22, 30, 37]) g.set(x, 5, BARK_LIT)
	g.rect(40, 4, 3, 8, BARK_SHADE)
	g.set(42, 3, BARK)
	// The cut end at the left: pale wood, a ring or two.
	g.ellipse(5, 8, 4, 5, '#b98c5c')
	g.ellipse(5, 8, 2.5, 3.5, '#d6ac76')
	g.ellipse(5, 8, 1, 1.5, '#9a6c3e')
	g.rect(1, 4, 1, 1, undefined)
	// Moss along its back, thick and ragged.
	for (let x = 6; x < 40; x++) {
		const depth = 1 + Math.round(1.2 * Math.sin(x * 0.7) + noise(x, 4, 2) * 2)
		for (let d = 0; d < depth; d++)
			g.set(x, 3 + d, d === 0 ? MOSS_LIT : d === depth - 1 ? MOSS_SHADE : MOSS)
		if (noise(x, 5, 2) < 0.35) g.set(x, 2, MOSS_LIT)
	}
	// Bracket fungus, tiers of half-moons stepping down its side.
	for (const [x, y, w] of [
		[23, 5, 8],
		[25, 8, 7],
		[22, 10, 6],
	]) {
		g.rect(x + 1, y, w - 2, 1, '#f6c982')
		g.rect(x, y + 1, w, 1, '#e8a24a')
		g.rect(x + 1, y + 2, w - 2, 1, '#b86e2c')
		g.rect(x + w - 2, y + 1, 1, 1, '#c9812e')
	}
	// Leaves caught beside it.
	for (const [x, c] of [
		[1, 0],
		[3, 1],
		[39, 2],
		[42, 4],
	] as const)
		g.set(x, 13, LEAVES[c])
	return g.url()
})()

/** The leaf pile, 52 by 20 px: its foot is the bottom middle. */
export const AUTUMN_LEAF_PILE_WIDTH = 26 * CELL
export const AUTUMN_LEAF_PILE_HEIGHT = 10 * CELL

/**
 * A heaped pile of fallen leaves, orange, gold, red and brown in little
 * flakes, lit at the top left and darker low on its right, a few leaves
 * strewn at its foot. 26 by 10 cells.
 */
export const AUTUMN_LEAF_PILE = (() => {
	const g = canvas(26, 10)
	const random = seeded(1212)
	const heap = (x: number) =>
		8.6 * Math.sqrt(Math.max(0, 1 - Math.abs((x - 12.5) / 12.5) ** 1.8))
	for (let x = 0; x < 26; x++) {
		const h = Math.round(heap(x + 0.5))
		for (let d = 0; d < h; d++) {
			const y = 9 - d
			// Lit toward the top left, shaded low on the right.
			const light = (h - d) / h - (x - 6) / 40
			const tones =
				light > 0.6 ? [0, 1] : light > 0.3 ? [0, 4, 1, 2] : [3, 4, 2]
			g.set(
				x,
				y,
				mix(
					LEAVES[tones[Math.floor(random() * tones.length)]],
					light > 0.85 ? '#ffe9a0' : '#3a2410',
					light > 0.85 ? 0.25 : d === 0 ? 0.25 : 0,
				),
			)
		}
	}
	for (const [x, c] of [
		[0, 0],
		[2, 1],
		[23, 2],
		[25, 4],
	] as const)
		g.set(x, 9, LEAVES[c])
	return g.url()
})()

/** The hedgehog, 28 by 18 px: its foot is the bottom middle, facing left. */
export const AUTUMN_HEDGEHOG_WIDTH = 14 * CELL
export const AUTUMN_HEDGEHOG_HEIGHT = 9 * CELL

/**
 * A hedgehog trundling along, facing left: a dome of brown spines tipped
 * pale, a cream face with a dark nose and eye, little feet. 14 by 9 cells.
 */
export const AUTUMN_HEDGEHOG = letterArt(
	[
		'.....l.l.l....',
		'...l.bdbdbl...',
		'..bdbdbdbdbl..',
		'.bdbdbdbdbdbd.',
		'.dbdbdbdbdbdb.',
		'fdbdbdbdbdbdd.',
		'ffeddbdbdbdd..',
		'nffpfdddddd...',
		'.pp.pp..pp.pp.',
	],
	{
		d: '#4a3022',
		b: '#7a5736',
		l: '#b8935e',
		f: '#e4c498',
		p: '#9c7448',
		e: INK,
		n: INK,
	},
)

/** The squirrel, 20 by 24 px: its foot is the bottom middle, facing left. */
export const AUTUMN_SQUIRREL_WIDTH = 10 * CELL
export const AUTUMN_SQUIRREL_HEIGHT = 12 * CELL

/**
 * A red squirrel sitting up, facing left, holding a nut to its chest, ear
 * tufts up, a big bushy tail curling up behind it. 10 by 12 cells.
 */
export const AUTUMN_SQUIRREL = letterArt(
	[
		'.t.t..lll.',
		'.rrr.lrrrl',
		'nerr.rrrrs',
		'ffff.rrrrs',
		'.ffkkrrrs.',
		'..fkkrrrs.',
		'..frrrrss.',
		'..rrrrrss.',
		'..rrrrss..',
		'..rrrrs...',
		'.drrrrsd..',
		'.dd..dd...',
	],
	{
		r: '#c4551e',
		l: '#e8843a',
		s: '#9a3c1a',
		f: '#f0dcc0',
		t: '#7a3a1a',
		d: '#6e2c14',
		e: INK,
		n: INK,
		k: '#8a5a2c',
	},
)

// --- Falling leaves ----------------------------------------------------------------

const LEAF_CELLS = 5

/** A falling leaf, 10 px square. */
export const FALLING_LEAF_SIZE = LEAF_CELLS * CELL

const STEM = '#6a4426'

/** Each leaf's three frames, face-on, tilted and edge-on: rows of 5, then its colours. */
const LEAF_SHAPES: { frames: string[][]; colours: Record<string, string> }[] = [
	// A red maple leaf.
	{
		frames: [
			['b.l.b', 'bblbb', '.bbs.', 'bbsbb', '..t..'],
			['..bl.', '.bbbl', 'bbbs.', '.bs..', 't....'],
			['.....', '.....', '.bls.', '..t..', '.....'],
		],
		colours: { b: '#c0302c', l: '#e8553a', s: '#96242a', t: STEM },
	},
	// An orange leaf, plain and oval.
	{
		frames: [
			['..t..', '.blb.', 'bbbbs', '.bbs.', '..s..'],
			['t.bl.', '.bbbs', '.bbs.', '..ss.', '.....'],
			['.....', '..t..', '.bls.', '.....', '.....'],
		],
		colours: { b: '#e07a24', l: '#f6a63a', s: '#b45a20', t: STEM },
	},
	// A yellow birch leaf, a pointed triangle.
	{
		frames: [
			['..l..', '.lbb.', '.bbbs', 'bbbss', '..t..'],
			['..l..', '..bbs', '.bbs.', '.bs..', 't....'],
			['.....', '.....', '.lbs.', '..t..', '.....'],
		],
		colours: { b: '#f0c632', l: '#fbe46a', s: '#d09222', t: STEM },
	},
	// A brown oak leaf, lobed.
	{
		frames: [
			['.bl..', 'bbbls', '.bbs.', 'bbbbs', '..t..'],
			['..bl.', '.bbbs', 'bbbs.', '.bss.', 't....'],
			['.....', '.....', '.bbs.', '..t..', '.....'],
		],
		colours: { b: '#9a5a2a', l: '#bc7a3a', s: '#6e3e20', t: STEM },
	},
]

/**
 * Four leaves to drift down the screen: red maple, orange, yellow birch and
 * brown oak, each in three frames (face-on, tilted, edge-on), 5 by 5 cells
 * (10 px) apiece. Indexed as `FALLING_LEAVES[kind][frame]`.
 */
export const FALLING_LEAVES: string[][] = LEAF_SHAPES.map(
	({ frames, colours }) => frames.map((rows) => letterArt(rows, colours)),
)

// --- Bomb Hat's branches and ladders ---------------------------------------------

/** How deep a branch's picture is, in cells, and how far down it the bark's top is: where feet go. */
const BRANCH_H = 22
const BRANCH_TOP = 6

/** A branch, for standing on: its picture, its size, and how far down it its top is, in px. */
export interface BranchArt {
	src: string
	width: number
	height: number
	top: number
}

/**
 * A branch reaching out level from a trunk, `cells` long, to stand on: its
 * thick end at the trunk (on the `from` side), tapering to its tip; bark
 * lit along its top, in shade underneath, a knot or two and moss here and
 * there along its top; a twig and a clump of leaves up off its tip and at
 * its thick end, clear of its middle, where feet go; and leaves hanging
 * under it in clumps, in `tones` (0 crimson, 1 orange, 2 gold, 3 rust).
 */
export function autumnBranch(
	cells: number,
	from: 'left' | 'right',
	tones: number,
	seed: number,
): BranchArt {
	const g = canvas(cells, BRANCH_H)
	const tone = [CRIMSON, ORANGE, GOLD, RUST][tones % 4]
	/** Along it from its thick end, 0 to 1, at column `x`. */
	const along = (x: number) =>
		from === 'left' ? x / (cells - 1) : 1 - x / (cells - 1)
	/**
	 * Foliage round `cx`, `cy`, `rx` by `ry`: ragged at its edge, leaf by
	 * leaf, lit to its top left, in shade to its bottom right, a few
	 * leaves loose about it.
	 */
	const foliage = (cx: number, cy: number, rx: number, ry: number) => {
		for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
			for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
				const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
				const ragged = 0.8 + 0.4 * noise(x, y, seed + 9)
				if (d > ragged) continue
				// Leaf by leaf, by chance, a little darker lower down: a mass of
				// leaves, not a ball.
				const light =
					((cy - y) / ry) * 0.5 + (noise(x, y, seed + 2) - 0.5) * 2.2
				g.set(
					x,
					y,
					light > 0.9
						? tone.hi
						: light > 0.3
							? tone.lit
							: light > -0.5
								? tone.base
								: light > -1.1
									? tone.shade
									: tone.dark,
				)
			}
		// Loose leaves hanging off its bottom.
		for (let i = 0; i < rx; i++)
			if (noise(i, cy, seed + 4) < 0.35) {
				const x = Math.round(cx - rx + noise(cx, i, seed + 5) * rx * 2)
				g.set(x, Math.round(cy + ry + 1 + noise(i, x, seed) * 2), tone.shade)
			}
	}
	// Foliage drooping under it all along, clumps run into each other,
	// hanging lower here and there, here and there a gap.
	for (let x = 1 + Math.floor(noise(0, 1, seed) * 4); x < cells - 3; ) {
		const rx = 6 + noise(x, 2, seed) * 5
		const ry = 3.5 + noise(x, 3, seed) * 3
		if (noise(x, 6, seed) > 0.15)
			foliage(x + rx * 0.7, BRANCH_TOP + 4 + ry * 0.6, rx, ry)
		x += Math.round(rx * 1.1 + noise(x, 4, seed) * 4)
	}
	// The bark: thicker at the trunk, tapering, lit along its top.
	for (let x = 0; x < cells; x++) {
		const thick = Math.round(8 - 4 * along(x))
		g.rect(x, BRANCH_TOP, 1, thick, BARK)
		g.set(x, BRANCH_TOP, BARK_LIT)
		g.set(x, BRANCH_TOP + thick - 1, BARK_SHADE)
		if (thick > 4) g.set(x, BRANCH_TOP + thick - 2, BARK_SHADE)
		// Lines along the bark, and a knot here and there.
		if (noise(x, 3, seed) < 0.12) g.set(x, BRANCH_TOP + 2, BARK_SHADE)
		if (noise(x, 4, seed) < 0.04) {
			g.set(x, BRANCH_TOP + 1, BARK_DARK)
			g.set(x + 1, BRANCH_TOP + 1, BARK_SHADE)
		}
		// Moss along its top in patches.
		if (noise(Math.floor(x / 5), 5, seed) < 0.3) {
			g.set(x, BRANCH_TOP, noise(x, 6, seed) < 0.5 ? MOSS : MOSS_LIT)
			if (noise(x, 7, seed) < 0.3) g.set(x, BRANCH_TOP - 1, MOSS_SHADE)
		}
	}
	// Its tip: a twig up off it, leaves on it.
	const tip = from === 'left' ? cells - 2 : 1
	const out = from === 'left' ? 1 : -1
	g.line(tip - out * 3, BRANCH_TOP, tip, BRANCH_TOP - 3, 1, BARK)
	foliage(tip - out * 2, BRANCH_TOP - 3, 4, 3)
	// And where it comes out of the trunk, leaves up off its top.
	const root = from === 'left' ? 3 : cells - 4
	foliage(root, BRANCH_TOP - 2, 4, 3)
	return {
		src: g.url(),
		width: cells * CELL,
		height: BRANCH_H * CELL,
		top: BRANCH_TOP * CELL,
	}
}

/** A ladder's wood, lit and in shade, and the rope lashing its rungs on. */
const LADDER_WOOD = '#a8743e'
const LADDER_LIT = '#c99456'
const LADDER_SHADE = '#7c5228'
const LADDER_ROPE = '#dcc48c'
const LADDER_ROPE_SHADE = '#b09a64'
/** How wide a ladder is, in cells, and how far apart its rungs. */
const LADDER_W = 12
const RUNG_EVERY = 7

/** A ladder, `rows` cells tall: its picture and size in px. */
export interface LadderArt {
	src: string
	width: number
	height: number
}

/**
 * A rough wooden ladder, `rows` cells tall: two rails, lit down their
 * left, in shade down their right; rungs every few cells, lashed on with
 * rope, the top one hooked over a branch. 12 cells wide.
 */
export function autumnLadder(rows: number): LadderArt {
	const g = canvas(LADDER_W, rows)
	for (let y = 2; y < rows - 2; y += RUNG_EVERY) {
		g.rect(2, y, LADDER_W - 4, 2, LADDER_WOOD)
		g.rect(2, y, LADDER_W - 4, 1, LADDER_LIT)
		g.rect(2, y + 1, 1, 1, LADDER_SHADE)
	}
	for (const x of [0, LADDER_W - 2]) {
		g.rect(x, 0, 2, rows, LADDER_WOOD)
		g.rect(x, 0, 1, rows, LADDER_LIT)
		g.rect(x + 1, 0, 1, rows, LADDER_SHADE)
		g.set(x, 0, LADDER_SHADE)
		// The rope round each rung's end.
		for (let y = 2; y < rows - 2; y += RUNG_EVERY) {
			g.rect(x, y - 1, 2, 1, LADDER_ROPE)
			g.rect(x, y + 2, 2, 1, LADDER_ROPE_SHADE)
		}
	}
	return { src: g.url(), width: LADDER_W * CELL, height: rows * CELL }
}

/** A near trunk's picture, in cells: as tall as the screen, and its trunk's width, its roots wider. */
const NEAR_TRUNK_H = 270
const NEAR_TRUNK_W = 30
const NEAR_ROOTS_W = 44

/** A near trunk: its picture, and its size in px. */
export interface NearTrunkArt {
	src: string
	width: number
	height: number
}

/**
 * The trunk of a great tree right in front, at the edge of the clearing,
 * the whole height of the screen, its crown up out of sight: bark in
 * deep furrows, lit down its left, in shade down its right, moss in
 * patches, its roots flaring out over the leaves at its foot. On its
 * `inward` side (towards the clearing), a collar of bark round each of
 * the branches it puts out, `joins` rows down (each a branch's top, in
 * cells), where they come out from behind it. 44 by 270 cells.
 */
export function autumnNearTrunk(
	inward: 'left' | 'right',
	joins: number[],
	seed: number,
): NearTrunkArt {
	const g = canvas(NEAR_ROOTS_W, NEAR_TRUNK_H)
	const middle = NEAR_ROOTS_W / 2
	const half = NEAR_TRUNK_W / 2
	const roots = 18
	for (let y = 0; y < NEAR_TRUNK_H; y++) {
		// Wider the nearer its foot, flaring out into roots.
		const flare = Math.max(0, y - (NEAR_TRUNK_H - roots)) / roots
		const wobble = Math.round(smooth(0, y, seed, 40) * 2 - 1)
		const w = half + Math.round(flare * flare * (NEAR_ROOTS_W / 2 - half))
		const from = Math.round(middle - w + wobble)
		const to = Math.round(middle + w + wobble)
		for (let x = from; x < to; x++) {
			const across = (x - from) / Math.max(1, to - from)
			// Furrows down it, running a little crooked.
			const furrow = smooth(x * 0.7, y * 0.06, seed + 1, 1000) < 0.32
			let fill =
				across < 0.16
					? BARK_LIT
					: across > 0.78
						? BARK_SHADE
						: furrow
							? BARK_SHADE
							: BARK
			if (furrow && across > 0.6) fill = BARK_DARK
			// Moss in clumps up its shady side, more of it low down, lit
			// along their tops.
			const moss =
				smooth(x * 0.35, y * 0.07, seed + 2, 1000) +
				across * 0.25 +
				(y / NEAR_TRUNK_H) * 0.15
			if (moss > 0.98)
				fill =
					smooth(x * 0.35, (y - 2) * 0.07, seed + 2, 1000) +
						across * 0.25 +
						((y - 2) / NEAR_TRUNK_H) * 0.15 <=
					0.98
						? MOSS_LIT
						: across > 0.75
							? MOSS_SHADE
							: MOSS
			g.set(x, y, fill)
		}
	}
	// A collar of bark round each branch, bulging out of its inward side.
	const side = inward === 'right' ? 1 : -1
	const edge = middle + side * half
	for (const top of joins)
		for (let y = top - 3; y < top + 11; y++) {
			const t = (y - (top - 3)) / 14
			const bulge = Math.round(Math.sin(t * Math.PI) * 4)
			for (let i = 0; i < bulge; i++) {
				const x = edge + side * i - (side > 0 ? 1 : 0)
				g.set(x, y, y < top ? BARK_LIT : y > top + 7 ? BARK_SHADE : BARK)
			}
			// The crease where the branch goes in behind it.
			g.set(edge + side * (bulge - 1), y, bulge > 2 ? BARK_SHADE : BARK)
		}
	// A knot hole, and fallen leaves gathered round its roots.
	g.ellipse(middle - 2, NEAR_TRUNK_H * 0.42, 2, 3, BARK_DARK)
	g.set(middle - 3, Math.round(NEAR_TRUNK_H * 0.42) - 2, BARK_LIT)
	for (let i = 0; i < 40; i++) {
		const x = Math.round(noise(i, 1, seed + 5) * NEAR_ROOTS_W)
		const y = NEAR_TRUNK_H - 1 - Math.round(noise(i, 2, seed + 5) * 4)
		g.set(x, y, LEAVES[i % LEAVES.length])
	}
	return {
		src: g.url(),
		width: NEAR_ROOTS_W * CELL,
		height: NEAR_TRUNK_H * CELL,
	}
}
