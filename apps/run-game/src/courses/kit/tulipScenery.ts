import { paintedArt } from './pixelArt'
import { seeded } from './seeded'

/**
 * The tulip field, drawn in code, for Potato Rain's clearing: a pretty
 * field of tulips in rows (the Netherlands in spring) running back to the
 * hills, the clearing's lawn at its foot, tulips along the front of the
 * path, and in the background a red barn with its silo and, far off, a
 * windmill. All drawn at scale 2, a cell two pixels.
 */

const CELL = 2

/** The clearing's lawn, and the field between its rows. */
export const TULIP_GRASS = '#6fae4a'
export const TULIP_GRASS_SHADE = '#5a9440'
/** The path the runners are on. */
export const TULIP_PATH = '#b8915a'
export const TULIP_PATH_SHADE = '#9a7646'
/** The sky, top and bottom. */
export const TULIP_SKY_TOP = '#7cc8f0'
export const TULIP_SKY_BOTTOM = '#d8f0ff'

const GRASS_LIT = '#82c25a'
const STEM = '#3f8a36'
const LEAF_LIT = '#7fc058'
const LEAF = '#4d9a3a'
const LEAF_DARK = '#3a7a30'
/** What far-off rows are mixed with: haze, the greener the nearer. */
const HAZE = '#a9d38c'

/** Each tulip colour: its base, lit and shaded tones. */
export const TULIPS = {
	red: ['#d8343c', '#f0585a', '#a82430'],
	yellow: ['#f4c92a', '#ffe36a', '#d09a1c'],
	pink: ['#ee7fb0', '#ffa8cc', '#c85a8c'],
	purple: ['#8a4cb8', '#aa72d6', '#66348e'],
	white: ['#f2f0ea', '#ffffff', '#c9c6d0'],
	orange: ['#f08a24', '#ffaa4a', '#c8641a'],
} as const
const ROWS = ['red', 'yellow', 'pink', 'purple', 'white', 'orange'] as const
/** The tulips' colours, in order, for tulips drawn elsewhere: Potato Rain's, growing on the path. */
export const TULIP_COLOURS = ROWS
/** A tulip's stem and leaves: lit, as they are, and shaded. */
export const TULIP_GREENS = {
	stem: STEM,
	lit: LEAF_LIT,
	leaf: LEAF,
	dark: LEAF_DARK,
} as const

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

/** A grid of cells to paint, `width` by `height`, wrapping round its sides if it's to tile. */
function canvas(width: number, height: number, wrap = false) {
	const cells = new Map<number, string>()
	const set = (x: number, y: number, fill: string) => {
		if (y < 0 || y >= height) return
		const col = wrap ? ((x % width) + width) % width : x
		if (col < 0 || col >= width) return
		cells.set(y * width + col, fill)
	}
	return {
		set,
		has: (x: number, y: number) => cells.has(y * width + x),
		rect(x: number, y: number, w: number, h: number, fill: string) {
			for (let j = 0; j < h; j++)
				for (let i = 0; i < w; i++) set(x + i, y + j, fill)
		},
		url: () =>
			paintedArt(width, height, (x, y) =>
				cells.get(Math.floor(y) * width + Math.floor(x)),
			),
	}
}

type Painter = ReturnType<typeof canvas>

/** A tulip head, `size` cells (2 or 3) across, its top left at `x`, `y`: a cup, lit at the top left. */
function head(
	p: Painter,
	x: number,
	y: number,
	[base, lit, shade]: readonly string[],
	size: number,
) {
	if (size === 2) {
		p.set(x, y, lit)
		p.set(x + 1, y, base)
		p.set(x, y + 1, base)
		p.set(x + 1, y + 1, shade)
		return
	}
	p.set(x, y, lit)
	p.set(x + 2, y, base)
	p.set(x, y + 1, lit)
	p.set(x + 1, y + 1, base)
	p.set(x + 2, y + 1, shade)
	p.set(x + 1, y + 2, shade)
}

const FIELD_W = 480
const FIELD_H = 110
/** Where the clearing's lawn starts: the bottom 30 px. */
const LAWN_TOP = FIELD_H - 15

/** The field behind the path, 960 by 220 px. */
export const TULIP_FIELD_WIDTH = FIELD_W * CELL
export const TULIP_FIELD_HEIGHT = FIELD_H * CELL

/**
 * The tulip field behind the path, tiling: its top ragged, fading into the
 * hills; rows of single colours across it, thin dotted stripes far off,
 * taller with their heads and stems showing nearer, grass between them; and
 * at its foot the clearing's lawn, plain but for a few tufts.
 */
export const TULIP_FIELD = (() => {
	const random = seeded(2207)
	const p = canvas(FIELD_W, FIELD_H, true)
	// The ground, paler the further off; the top rows ragged.
	for (let y = 0; y < FIELD_H; y++) {
		const haze = Math.max(0, 0.45 * (1 - y / 60))
		const ground = mix(TULIP_GRASS, HAZE, haze)
		for (let x = 0; x < FIELD_W; x++) {
			if (y < 8 && random() > (y + 0.5) / 8) continue
			p.set(x, y, ground)
		}
	}
	// Rows of tulips, taller and further apart the nearer.
	let y = 8
	for (let i = 0; y < LAWN_TOP - 3; i++) {
		const near = (y - 8) / (LAWN_TOP - 11)
		const h = 2 + Math.round(near ** 1.2 * 10)
		const gap = 1 + Math.round(near * 3.4)
		const haze = 0.4 * (1 - near) ** 1.5
		const tones = TULIPS[ROWS[i % ROWS.length]].map((c) => mix(c, HAZE, haze))
		const leaf = mix(TULIP_GRASS_SHADE, HAZE, haze)
		const stem = mix(STEM, HAZE, haze)
		if (h <= 3) {
			// Far off: a stripe, its top row dotted with light and its foot in shade.
			p.rect(0, y, FIELD_W, h, tones[0])
			for (let x = 0; x < FIELD_W; x++) {
				if (x % 2 === 0 && random() < 0.8) p.set(x, y, tones[1])
				if (random() < 0.2)
					p.set(x, y + 1 + Math.floor(random() * (h - 1)), leaf)
			}
			p.rect(0, y + h - 1, FIELD_W, 1, tones[2])
		} else {
			const size = h <= 5 ? 2 : 3
			const pitch = size + 1
			p.rect(0, y, FIELD_W, h, leaf)
			// Two ranks of heads, the back one at the top of the row and the front at its foot.
			const ranks = [
				{ top: y, from: 0 },
				{ top: y + h - size, from: Math.floor(pitch / 2) },
			]
			for (const { top, from } of ranks) {
				for (let x = from; x < FIELD_W + from; x += pitch) {
					if (random() < 0.1) continue
					const lift = size === 3 && random() < 0.4 ? 1 : 0
					const stemX = x + Math.floor(size / 2)
					if (size === 3 && top === y)
						for (let s = top + size - lift; s < y + h - 1; s++)
							p.set(stemX, s, stem)
					head(
						p,
						x,
						top - (top === y ? 0 : lift) + (top === y ? lift : 0),
						tones,
						size,
					)
				}
			}
		}
		// The grass between rows, a few darker blades in it.
		for (let g = 0; g < gap; g++)
			for (let x = 0; x < FIELD_W; x++)
				if (random() < 0.16)
					p.set(x, y + h + g, mix(TULIP_GRASS_SHADE, HAZE, haze))
		y += h + gap
	}
	// The lawn: plain, with a few tufts.
	p.rect(0, LAWN_TOP, FIELD_W, FIELD_H - LAWN_TOP, TULIP_GRASS)
	for (let t = 0; t < 22; t++) {
		const x = Math.floor(random() * FIELD_W)
		const ty = LAWN_TOP + 2 + Math.floor(random() * 10)
		p.set(x, ty, TULIP_GRASS_SHADE)
		p.set(x + 2, ty, TULIP_GRASS_SHADE)
		p.set(x + 1, ty + 1, TULIP_GRASS_SHADE)
		p.set(x - 1, ty, GRASS_LIT)
	}
	return p.url()
})()

const FRONT_W = 480
const FRONT_H = 17

/** The strip along the front of the path, 960 by 34 px. */
export const TULIPS_FRONT_WIDTH = FRONT_W * CELL
export const TULIPS_FRONT_HEIGHT = FRONT_H * CELL

/**
 * Tulips along the front of the path, tiling: clumps of mixed colours, big
 * heads on stems among broad leaves, a gap of lawn between them. Clear
 * above the flowers.
 */
export const TULIPS_FRONT = (() => {
	const random = seeded(913)
	const p = canvas(FRONT_W, FRONT_H, true)
	const CLUMPS = 12
	const foot = FRONT_H - 3
	let last = -1
	for (let c = 0; c < CLUMPS; c++) {
		const cx = Math.round((c * FRONT_W) / CLUMPS + 6 + random() * 18)
		// Broad leaves, two cells wide, leaning out each side and rising.
		for (const [dir, length] of [
			[-1, 6],
			[1, 6],
			[-1, 8],
			[1, 8],
		] as const) {
			const lean = length === 8 ? 0.5 : 0.8
			for (let i = 0; i < length; i++) {
				const x = cx + dir * Math.round(1 + i * lean + (length === 8 ? 1 : 3))
				const ly = foot - i
				const tip = i >= length - 2
				const a = dir < 0 ? LEAF_LIT : LEAF
				const b = dir < 0 ? LEAF : LEAF_DARK
				if (tip) p.set(x, ly, b)
				else {
					p.set(x, ly, a)
					p.set(x + 1, ly, b)
				}
			}
		}
		// Three or four stems, each ending in a head.
		const stems = [
			[-5, 4],
			[-1, 0],
			[3, 3],
			[7, 6],
		].slice(0, 3 + (random() < 0.5 ? 1 : 0))
		for (const [dx, top] of stems) {
			let colour = Math.floor(random() * ROWS.length)
			if (colour === last) colour = (colour + 1) % ROWS.length
			last = colour
			const sx = cx + dx + 1
			for (let s = top + 3; s < foot; s++) p.set(sx, s, STEM)
			head(p, cx + dx, top, TULIPS[ROWS[colour]], 3)
		}
	}
	// The lawn edge along the foot, ragged on top.
	for (let x = 0; x < FRONT_W; x++) {
		p.set(x, foot + 1, TULIP_GRASS)
		p.set(x, foot + 2, TULIP_GRASS)
		if (random() < 0.65) p.set(x, foot, TULIP_GRASS)
		if (random() < 0.12) p.set(x, foot - 1, TULIP_GRASS_SHADE)
		if (random() < 0.15) p.set(x, foot + 1, GRASS_LIT)
	}
	return p.url()
})()

// The barn.
const WALL = '#b8322a'
const WALL_PLANK = '#a22a24'
const WALL_SHADE = '#8a2420'
const WALL_SHADE_PLANK = '#781e1c'
const DOOR = '#942a26'
const TRIM = '#f4efe6'
const TRIM_SHADE = '#cfc9c0'
const ROOF_LIT = '#6a6e7a'
const ROOF = '#51545e'
const ROOF_SHADE = '#3c3f48'
const HAY = '#e6c24a'
const HAY_LIT = '#f6de72'
const LOFT = '#3a2418'

const BARN_W = 70
const BARN_H = 54

/** A red barn, 140 by 108 px. */
export const BARN_WIDTH = BARN_W * CELL
export const BARN_HEIGHT = BARN_H * CELL

/**
 * A red Dutch barn standing on its foot, gambrel roof of grey shingles
 * over its gable end, red planks with white trim, big double doors with a
 * white X on each, a hayloft door with hay in it. Seen a little from the
 * right, so its long side's in shade; lit from the top left.
 */
export const BARN = (() => {
	const p = canvas(BARN_W, BARN_H)
	const cx = 27
	const eave = 30
	const knee = 17
	const SWEEP = [16, -8] as const
	/** How far the gable reaches either side of its middle, at row `y`. */
	const reach = (y: number) =>
		y < 8
			? -1
			: y < knee
				? 1 + ((y - 8) / (knee - 8)) * 20
				: y < eave
					? 21 + ((y - knee) / (eave - knee)) * 6
					: 27
	const front = (x: number, y: number) =>
		y >= 8 && y < BARN_H && Math.abs(x - cx) <= reach(y)
	for (let y = 0; y < BARN_H; y++)
		for (let x = 0; x < BARN_W; x++) {
			const fx = x + 0.5
			const fy = y + 0.5
			if (front(fx, fy)) {
				const trim =
					!front(fx, fy - 2) ||
					(fy < eave && Math.abs(fx - cx) > reach(fy) - 2) ||
					(fy >= eave && (x < 2 || x >= 52)) ||
					(fy >= eave && fy < eave + 2) ||
					y >= BARN_H - 2
				const plank = x % 4 === 3
				p.set(
					x,
					y,
					trim
						? y % 2 && y < eave
							? TRIM_SHADE
							: TRIM
						: plank
							? WALL_PLANK
							: WALL,
				)
				// A shadow under the eave's white board.
				if (!trim && fy >= eave + 2 && fy < eave + 4) p.set(x, y, WALL_SHADE)
				continue
			}
			// Its long side and its roof, swept back from the gable up and to the right.
			for (let t = 0; t <= 1; t += 0.02) {
				const sx = fx - SWEEP[0] * t
				const sy = fy - SWEEP[1] * t
				if (!front(sx, sy)) continue
				if (sy >= eave) {
					p.set(
						x,
						y,
						Math.floor(fx - SWEEP[0] * t) % 4 === 3
							? WALL_SHADE_PLANK
							: WALL_SHADE,
					)
				} else {
					const upper = sy < knee
					const course = Math.floor((upper ? sx : sy) / 3) % 2
					const tone = upper ? (sx < cx ? ROOF_LIT : ROOF) : ROOF_SHADE
					p.set(
						x,
						y,
						course && tone === ROOF
							? ROOF_LIT
							: course && tone === ROOF_LIT
								? ROOF
								: course
									? ROOF
									: tone,
					)
				}
				break
			}
		}
	// The hayloft door, white-framed, hay heaped in it and spilling over the sill.
	p.rect(23, 15, 9, 10, TRIM)
	p.rect(24, 16, 7, 8, LOFT)
	p.rect(24, 20, 7, 4, HAY)
	p.rect(25, 19, 4, 1, HAY)
	p.rect(24, 20, 3, 1, HAY_LIT)
	p.rect(26, 21, 1, 1, HAY_LIT)
	p.rect(25, 24, 2, 1, HAY)
	p.rect(29, 24, 2, 1, HAY)
	p.rect(28, 25, 2, 1, HAY_LIT)
	// The big doors, each leaf framed in white with a white X.
	p.rect(16, 34, 22, 20, TRIM)
	for (const left of [17, 27]) {
		p.rect(left, 35, 10, 19, DOOR)
		p.rect(left + 1, 36, 8, 17, DOOR)
		p.rect(left, 35, 10, 1, TRIM)
		p.rect(left, 35, 1, 19, TRIM)
		p.rect(left + 9, 35, 1, 19, TRIM)
		for (let i = 0; i < 17; i++) {
			p.set(left + 1 + Math.round((i * 7) / 16), 36 + i, TRIM)
			p.set(left + 8 - Math.round((i * 7) / 16), 36 + i, TRIM)
		}
	}
	p.rect(26, 35, 1, 19, WALL_SHADE)
	p.rect(27, 35, 1, 19, TRIM)
	return p.url()
})()

// The silo.
const SILO_LIT = '#e4eaee'
const SILO_BASE = '#c6d0d8'
const SILO_SHADE = '#a0acb8'
const SILO_DARK = '#8794a2'
const CAP = '#7e8794'
const CAP_LIT = '#a8b2bd'
const CAP_DARK = '#5f6874'

const SILO_W = 18
const SILO_H = 62

/** A silo, 36 by 124 px. */
export const SILO_WIDTH = SILO_W * CELL
export const SILO_HEIGHT = SILO_H * CELL

/**
 * A silo for beside the barn: a tall cylinder of pale grey, ringed with
 * hoops, lit down its left and shaded down its right, under a domed metal
 * cap with a knob on top.
 */
export const SILO = (() => {
	const p = canvas(SILO_W, SILO_H)
	const top = 12
	for (let y = top; y < SILO_H; y++)
		for (let x = 0; x < SILO_W; x++) {
			const ring = (y - top) % 9 === 8
			let tone =
				x < 4 ? SILO_LIT : x < 11 ? SILO_BASE : x < 15 ? SILO_SHADE : SILO_DARK
			if (ring) tone = x < 4 ? SILO_BASE : x < 11 ? SILO_SHADE : SILO_DARK
			p.set(x, y, tone)
		}
	p.rect(0, SILO_H - 2, SILO_W, 2, SILO_DARK)
	p.rect(0, SILO_H - 2, 4, 2, SILO_SHADE)
	// The dome: half an ellipse over the top, lit on the left.
	for (let y = 2; y < top + 1; y++)
		for (let x = 0; x < SILO_W; x++) {
			const dx = (x + 0.5 - 9) / 9
			const dy = (y + 0.5 - (top + 1)) / 11
			if (dx * dx + dy * dy > 1) continue
			p.set(x, y, x < 5 ? CAP_LIT : x < 12 ? CAP : CAP_DARK)
		}
	p.rect(8, 0, 2, 3, CAP)
	p.set(8, 0, CAP_LIT)
	p.rect(0, top, SILO_W, 1, CAP_DARK)
	return p.url()
})()

// The windmill, far off: pale and bluish, few details.
const MILL_WALL = '#c4cfe0'
const MILL_SHADE = '#a8b6cc'
const MILL_CAP = '#8d9bb4'
const MILL_SAIL = '#dde6f2'
const MILL_SPOKE = '#7f8fae'

const MILL_W = 26
const MILL_H = 44

/** A far-off windmill, 52 by 88 px. */
export const WINDMILL_WIDTH = MILL_W * CELL
export const WINDMILL_HEIGHT = MILL_H * CELL

/**
 * A small Dutch windmill far off, paler and bluer: a tower tapering up to a
 * cap, and four sails set in an X.
 */
export const WINDMILL = (() => {
	const p = canvas(MILL_W, MILL_H)
	const hub = [13, 13] as const
	// Its tower, wider at the foot, lit on the left, with a gallery round it.
	for (let y = 14; y < MILL_H; y++) {
		const half = 4 + ((y - 14) / (MILL_H - 15)) * 3
		for (let x = 0; x < MILL_W; x++) {
			const d = x + 0.5 - 13
			if (Math.abs(d) > half) continue
			p.set(x, y, d > half * 0.25 ? MILL_SHADE : MILL_WALL)
		}
	}
	p.rect(8, 32, 11, 1, MILL_CAP)
	p.rect(11, 40, 4, 4, MILL_CAP)
	// Its cap.
	p.rect(10, 9, 7, 5, MILL_CAP)
	p.rect(11, 8, 5, 1, MILL_CAP)
	p.rect(10, 9, 3, 2, MILL_SHADE)
	// Four sails, a spoke each with a blade of cloth along it.
	for (const sx of [-1, 1])
		for (const sy of [-1, 1]) {
			for (let k = 2; k <= 12; k++) {
				const x = hub[0] + sx * k
				const y = hub[1] + sy * k
				if (k >= 4)
					for (let j = 1; j <= 2; j++)
						p.set(
							x + sx * j * (sx * sy > 0 ? 1 : 0) - (sx * sy < 0 ? sx * j : 0),
							y - sy * j * (sx * sy > 0 ? 1 : 0) + (sx * sy < 0 ? sy * j : 0),
							MILL_SAIL,
						)
				p.set(x, y, MILL_SPOKE)
			}
		}
	p.rect(hub[0] - 1, hub[1] - 1, 2, 2, MILL_CAP)
	return p.url()
})()
