import { letterArt, paintedArt, pixelPolygon, svgUrl, tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * The beach for Fruit Kebab, drawn in code: sea bands for the horizon, two
 * palms, a scuttling crab, and a shell and a starfish for the sand. Cells
 * are 2 px, as everywhere; the bands are 2-px rects like the voyage's.
 */

const CELL = 2

/** The sand the runners stand on, in shade, and wet where the sea reached it. */
export const BEACH_SAND = '#f2d59a'
export const BEACH_SAND_SHADE = '#e2bf7e'
export const BEACH_WET_SAND = '#d4b175'

/** The sea near the shore, out at the horizon, in the shallows, and its foam. */
export const BEACH_SEA = '#2f9fc6'
export const BEACH_SEA_FAR = '#4fb4d6'
export const BEACH_SHALLOWS = '#5fcad6'
export const BEACH_FOAM = '#ffffff'

/** The sky behind it all, top and bottom. */
export const BEACH_SKY_TOP = '#5ec8f2'
export const BEACH_SKY_BOTTOM = '#c9f1ff'

const INK = '#2b2722'

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

// --- The sea ------------------------------------------------------------------------

/** Sparkles on the water: little white dashes, some with a dot above, none over an edge. */
function sparkles(width: number, top: number, bottom: number, seed: number) {
	const random = seeded(seed)
	let out = ''
	for (let i = 0; i < width / 36; i++) {
		const w = 4 + Math.round(random() * 2) * 2
		const x = Math.round((random() * (width - w - 2)) / 2) * 2
		const y = Math.round((top + 4 + random() * (bottom - top - 8)) / 2) * 2
		out += rect(x, y, w, 2, 'rgba(255,255,255,0.7)')
		if (random() < 0.4) out += rect(x + 2, y - 2, 2, 2, 'rgba(255,255,255,0.5)')
	}
	return out
}

/** A tiny palm on the far island, its foot at `x`, `y`, `h` tall, leaning `lean` cells. */
function farPalm(x: number, y: number, h: number, lean: number) {
	const top = y - h
	return [
		rect(x, top + 2, 2, h - 2, '#6b5a3a'),
		rect(x + lean, top + 2, 2, 2, '#6b5a3a'),
		rect(x + lean - 6, top, 14, 2, '#2f7a4a'),
		rect(x + lean - 4, top - 2, 10, 2, '#43a05a'),
		rect(x + lean - 8, top + 2, 4, 2, '#2f7a4a'),
		rect(x + lean + 6, top + 2, 4, 2, '#2f7a4a'),
	].join('')
}

/** A far sailboat, hull on the water at `x`, `y`: white sails, a pale hull. */
function sailboat(x: number, y: number) {
	return [
		// Hull.
		rect(x, y - 4, 24, 4, '#f3f1ea'),
		rect(x + 2, y - 2, 20, 2, '#c9d6de'),
		// Mast.
		rect(x + 11, y - 30, 2, 26, '#8a6a3a'),
		// Big sail and jib.
		pixelPolygon(
			[
				[x + 8, y - 6],
				[x + 8, y - 28],
				[x - 2, y - 6],
			],
			'#ffffff',
		),
		pixelPolygon(
			[
				[x + 14, y - 6],
				[x + 14, y - 32],
				[x + 26, y - 6],
			],
			'#ffffff',
		),
		rect(x + 14, y - 12, 12, 2, '#e8eef2'),
		rect(x + 14, y - 8, 12, 2, '#e8eef2'),
		// A red pennant.
		rect(x + 13, y - 32, 4, 2, '#e0452f'),
	].join('')
}

export const BEACH_SEA_FAR_WIDTH = 960
export const BEACH_SEA_FAR_HEIGHT = 160

/**
 * Far off: the flat horizon over a sea of pale blue, a small island with
 * three palms on it, a white sailboat, sparkles. 960 by 160, tiling.
 */
export const beachSeaFar = svgUrl(
	BEACH_SEA_FAR_WIDTH,
	BEACH_SEA_FAR_HEIGHT,
	[
		rect(0, 120, 960, 40, BEACH_SEA_FAR),
		// The horizon line, a shade lighter.
		rect(0, 120, 960, 2, '#7fcde6'),
		// The island: a green hump, a bit of sand at its foot, dark in its lee.
		pixelPolygon(
			[
				[610, 120],
				[622, 110],
				[640, 104],
				[664, 104],
				[684, 110],
				[700, 120],
			],
			'#3f9a64',
		),
		pixelPolygon(
			[
				[640, 120],
				[650, 112],
				[672, 110],
				[690, 114],
				[700, 120],
			],
			'#2f7a4a',
		),
		rect(612, 118, 88, 2, '#f2d59a'),
		farPalm(630, 108, 18, -2),
		farPalm(650, 104, 24, 2),
		farPalm(676, 107, 16, 2),
		sailboat(236, 122),
		sparkles(960, 120, 160, 5101),
	].join(''),
)

export const BEACH_SEA_NEAR_WIDTH = 1024
export const BEACH_SEA_NEAR_HEIGHT = 160

/**
 * Nearer: the sea, a shade deeper, rolling in white wave crests, a few
 * sparkles, two gulls far off. 1024 by 160, tiling.
 */
export const beachSeaNear = svgUrl(
	BEACH_SEA_NEAR_WIDTH,
	BEACH_SEA_NEAR_HEIGHT,
	[
		rect(0, 112, 1024, 48, BEACH_SEA),
		rect(0, 112, 1024, 2, '#4fb4d6'),
		// Crests: dashes, a row of them every 10 px, shifted along row by row.
		...Array.from({ length: 24 }, (_, i) => {
			const x = i * 42 + (i % 3) * 6
			const y = 118 + (i % 4) * 10
			return (
				rect(x, y, 20, 2, 'rgba(255,255,255,0.4)') +
				rect(x + 6, y + 2, 10, 2, 'rgba(255,255,255,0.22)')
			)
		}),
		// Gulls, far off.
		...[
			[300, 60],
			[330, 48],
		].map(
			([x, y]) =>
				`${rect(x, y, 4, 2, '#ffffff')}${rect(x + 4, y + 2, 2, 2, '#ffffff')}${rect(x + 6, y, 4, 2, '#ffffff')}`,
		),
		sparkles(1024, 114, 160, 5102),
	].join(''),
)

// --- Palms --------------------------------------------------------------------------

const BARK = '#a8743f'
const BARK_LIT = '#c99560'
const BARK_SHADE = '#74492a'
const FROND = '#3f9a4a'
const FROND_LIT = '#6bc15a'
const FROND_SHADE = '#2b7440'
const NUT = '#6a4326'
const NUT_LIT = '#8f6038'

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

/** A palm, painted a cell at a time from its trunk's curve and its fronds' arcs. */
function palm(shape: PalmShape) {
	const grid: (string | undefined)[][] = Array.from(
		{ length: shape.height },
		() => Array<string | undefined>(shape.width).fill(undefined),
	)
	const put = (x: number, y: number, c: string) => {
		if (x >= 0 && x < shape.width && y >= 0 && y < shape.height) grid[y][x] = c
	}

	// Fronds behind the trunk's top first: the back ones, darker.
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
			// Leaflet tips: every third column hangs a cell lower, out along the blade.
			if (x % 3 === 0 && t > 0.35) put(x, y + th, FROND_SHADE)
		}
	}

	// Trunk.
	const rows = shape.foot > -1 ? shape.height - shape.crownY - 1 : 1
	for (let y = shape.crownY; y < shape.height; y++) {
		const t = (shape.height - 1 - y) / rows // 0 at foot, 1 at crown
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
			if (i === 0) c = BARK_LIT
			else if (i >= width - 1) c = BARK_SHADE
			if (ring) c = i === 0 ? BARK : BARK_SHADE
			put(left + i, y, c)
		}
	}
	// A flare at the foot.
	const footLeft = Math.round(shape.foot - shape.baseWidth / 2)
	put(footLeft - 1, shape.height - 1, BARK)
	put(footLeft + shape.baseWidth, shape.height - 1, BARK_SHADE)

	// Fronds: far ones first (the shorter, upright), near ones over.
	const order = [...shape.fronds].sort((a, b) => b.rise - a.rise)
	order.forEach((f, i) => drawFrond(f, i % 2 === 0 || f.rise > 6))
	// A boss of cells where they meet, and the nuts under it.
	for (const [dx, dy] of [
		[-1, 0],
		[0, 0],
		[1, 0],
		[0, -1],
		[-1, 1],
		[0, 1],
	])
		put(shape.crownX + dx, shape.crownY + dy, FROND)
	put(shape.crownX - 1, shape.crownY - 1, FROND_LIT)
	for (const [dx, dy] of shape.nuts) {
		const nx = shape.crownX + dx
		const ny = shape.crownY + dy
		put(nx, ny, NUT_LIT)
		put(nx + 1, ny, NUT)
		put(nx, ny + 1, NUT)
		put(nx + 1, ny + 1, NUT)
	}

	return paintedArt(shape.width, shape.height, (x, y) => grid[y - 0.5][x - 0.5])
}

export const PALM_TALL_WIDTH = 36 * CELL
export const PALM_TALL_HEIGHT = 96 * CELL

/**
 * A tall coconut palm, leaning left: a curved, ringed trunk, lit on its
 * left and shaded on its right, seven fronds drooping from the crown, and
 * three coconuts under it. 36 by 96 cells, its foot mid-bottom.
 */
export const PALM_TALL = palm({
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

export const PALM_SHORT_WIDTH = 40 * CELL
export const PALM_SHORT_HEIGHT = 64 * CELL

/**
 * A shorter palm, leaning right: a bowed trunk, a rounder crown of seven
 * fronds that arch higher and hang shorter, coconuts under it. 40 by 64
 * cells, its foot a little left of the middle.
 */
export const PALM_SHORT = palm({
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

// --- Crab, shell, starfish ----------------------------------------------------------

const CRAB = {
	L: '#f0705a',
	R: '#d63a2e',
	D: '#a1261f',
	K: INK,
}

/** Legs, a row of cells at a time: `legs` columns of the body's underside, tilted by `lean`. */
function crabRows(lean: number) {
	const columns = [3, 5, 7, 10, 12, 14]
	const rows = [0, 1, 2].map(() => Array<string>(18).fill('.'))
	// Each leg goes down, then kicks out a cell and down again.
	for (const c of columns) {
		rows[0][c] = 'D'
		rows[1][c] = 'D'
		rows[1][c + lean] = 'D'
		rows[2][c + lean] = 'D'
	}
	return rows.map((row) => row.join(''))
}

/** The crab's top, claws up and eyes on stalks: 8 rows, then legs. */
const CRAB_TOP = [
	'L..L..K....K..L..L',
	'LRRL..R....R..LRRL',
	'.RRR..LLLLLL..RRR.',
	'..DRRLLLLLLLLRRD..',
	'...RLLLLLLLLLLR...',
	'..RRRRRRRRRRRRRR..',
	'...DDRRRRRRRRDD...',
	'....DDDDDDDDDD....',
]

export const CRAB_WIDTH = 18 * CELL
export const CRAB_HEIGHT = 11 * CELL

/**
 * A red crab, seen from the front: a round shell, lit on top, two raised
 * claws, eyes on stalks, six legs. Two frames the same size, legs tilted
 * one way, then the other, so flipping between them scuttles. 18 by 11 cells.
 */
export const CRAB_FRAMES: string[] = [
	letterArt([...CRAB_TOP, ...crabRows(-1)], CRAB),
	letterArt([...CRAB_TOP, ...crabRows(1)], CRAB),
]

export const SHELL_WIDTH = 7 * CELL
export const SHELL_HEIGHT = 5 * CELL

/** A scallop shell on the sand: a cream fan, ridged in pink. 7 by 5 cells. */
export const SHELL = letterArt(
	['..PCP..', '.PPCPP.', 'PCPCPCP', '.PPSPP.', '..SSS..'],
	{ C: '#f8ead4', P: '#f0bdb4', S: '#d98f8c' },
)

export const STARFISH_WIDTH = 9 * CELL
export const STARFISH_HEIGHT = 9 * CELL

/** A starfish on the sand: orange, five arms, a few pale spots. 9 by 9 cells. */
export const STARFISH = letterArt(
	[
		'....L....',
		'...LOD...',
		'...LOD...',
		'LLLLOODDD',
		'.LOOYOOD.',
		'..LOOOD..',
		'..LOOOD..',
		'.LOOD.OD.',
		'.LO....DD',
	],
	{ L: '#ffb347', O: '#f08a24', D: '#c8651a', Y: '#ffe3a0' },
)

/**
 * Beach sand, all over, a tile of it: fine grains lighter and darker, a few
 * soft ripples left by the wind, and now and then a bit of broken shell.
 * See-through, over `BEACH_SAND`: quieter than the desert's.
 */
export const BEACH_SAND_TEXTURE = (() => {
	const random = seeded(5100)
	const width = 200
	const height = 80
	const sand = tile(width, height)
	const { rect } = sand
	const even = (n: number) => Math.round(n / 2) * 2
	// Soft ripples: a lit crest, a faint shadow under it, wavering along.
	for (let n = 0; n < 6; n++) {
		let x = even(random() * width)
		let y = even(random() * (height - 4))
		const end = x + 16 + random() * 30
		while (x < end) {
			const w = 4 + even(random() * 6)
			rect(x, y, w, 2, 'rgba(255, 248, 225, 0.35)')
			rect(x, y + 2, w, 2, 'rgba(170, 130, 70, 0.14)')
			x += w
			const step = random()
			if (step < 0.3) y -= 2
			else if (step > 0.7) y += 2
			y = Math.max(0, Math.min(height - 4, y))
		}
	}
	// Grains, lighter and darker.
	for (let n = 0; n < 70; n++)
		rect(
			even(random() * width),
			even(random() * height),
			2,
			2,
			random() < 0.5 ? 'rgba(255, 248, 225, 0.45)' : 'rgba(170, 130, 70, 0.22)',
		)
	// Bits of broken shell, pale pink and white.
	for (let n = 0; n < 3; n++) {
		const x = even(random() * (width - 4))
		const y = even(random() * (height - 2))
		rect(x, y, 4, 2, 'rgba(255, 236, 228, 0.85)')
		rect(x + 2, y, 2, 2, 'rgba(232, 180, 170, 0.8)')
	}
	return sand.pattern('beach-sand')
})()
