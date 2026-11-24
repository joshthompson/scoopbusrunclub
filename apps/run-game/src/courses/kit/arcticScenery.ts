import {
	type PixelRect,
	letterArt,
	pixelArt,
	rectsMarkup,
	svgUrl,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * The Arctic for Iceberg Bump, drawn in code: two bands of cold sea for the
 * horizon, the big iceberg everyone stands on, a loose floe and a fleck of
 * wave crest. Cells are 2 px, as everywhere; the bands are drawn a cell at a
 * time on a grid, then run together into rects.
 */

const CELL = 2

/** The sky behind it all, top and bottom: pale and cold. */
export const ARCTIC_SKY_TOP = '#9fc7e0'
export const ARCTIC_SKY_BOTTOM = '#e4f0f6'

/** The sea at the horizon, nearer, deep down, and its foam. */
export const ARCTIC_SEA_FAR = '#3d6f8f'
export const ARCTIC_SEA = '#24506e'
export const ARCTIC_SEA_DEEP = '#16384f'
export const ARCTIC_FOAM = '#e8f4fa'

/** Ice: snow on top, lit, in between, shaded, and deep under the water. */
export const ICE_SNOW = '#f6fbfe'
export const ICE_LIT = '#d6eef8'
export const ICE = '#a9d8ec'
export const ICE_SHADE = '#78b8d6'
export const ICE_DEEP = '#4f93b8'

/** Far-off ice, paler and bluer, and rock showing through a glacier. */
const FAR_ICE = '#cfe3ee'
const FAR_ICE_LIT = '#e6f2f8'
const FAR_ICE_SHADE = '#a9c5d6'
const FAR_ROCK = '#8aa3b5'
const FAR_HORIZON = '#9cc0d3'
const FAR_REFLECTION = '#7fa6bf'

/** A seal's and a polar bear's colours. */
const SEAL = '#76879a'
const SEAL_LIT = '#9aa8b5'
const SEAL_SHADE = '#586878'
const SEAL_BELLY = '#d0d9e0'
const BEAR = '#f4f1ea'
const BEAR_SHADE = '#cdd8df'
const INK = '#1d2530'

/** A grid of cells, drawn into a cell at a time, and run together into rects. */
function grid(width: number, height: number) {
	const cells: (string | undefined)[] = new Array(width * height)
	const put = (x: number, y: number, fill: string | undefined) => {
		if (x >= 0 && x < width && y >= 0 && y < height) cells[y * width + x] = fill
	}
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
	/**
	 * Its picture: a pixel a cell, for scenery drawn at `scale: 2`; or `cell`
	 * px a cell, for a band of the backdrop, drawn at its own size.
	 */
	const url = (cell = 1) => {
		// Runs along a row, then a run the same as the one above it grows down.
		const rects: PixelRect[] = []
		const open = new Map<string, PixelRect>()
		for (let y = 0; y < height; y++) {
			const seen = new Set<string>()
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
							const rect: PixelRect = [from, y, x - from, 1, start]
							rects.push(rect)
							open.set(key, rect)
						}
						seen.add(key)
					}
					from = x
				}
			}
		}
		if (cell === 1) return pixelArt(width, height, rects)
		return svgUrl(
			width * cell,
			height * cell,
			`<g transform="scale(${cell})">${rectsMarkup(rects)}</g>`,
		)
	}
	return { width, height, put, fill, stamp, url }
}

type Grid = ReturnType<typeof grid>

/** A small whole number from `random`, `low` to `high` both included. */
const between = (random: () => number, low: number, high: number) =>
	low + Math.floor(random() * (high - low + 1))

// --- Floes ----------------------------------------------------------------------------

/**
 * A floe: snow on top, ice to its waterline three rows down, then the
 * underwater part, narrowing to a rounded bottom. `width` cells at its widest,
 * its top at `x`, `y`; its rows are 8 tall.
 */
function floe(g: Grid, x: number, y: number, width: number) {
	// How far in from each side its rows are: snow's top, ice, the waterline, then under it.
	const insets = [4, 2, 1, 0, 1, 3, 6, 10]
	const colours = [
		ICE_SNOW,
		ICE_SNOW,
		ICE_LIT,
		ICE,
		ICE_SHADE,
		ICE_SHADE,
		ICE_DEEP,
		ICE_DEEP,
	]
	const wide = width / 30
	insets.forEach((inset, row) => {
		const cut = Math.round(inset * (wide > 1 ? 1 : wide))
		const left = x + cut
		const span = width - cut * 2
		g.fill(left, y + row, span, 1, colours[row])
		// Lit along its left edge, shaded down its right.
		if (row >= 1 && span > 6) {
			g.fill(left, y + row, 2, 1, row < 4 ? ICE_SNOW : ICE)
			g.fill(left + span - 3, y + row, 3, 1, row < 4 ? ICE : ICE_DEEP)
		}
	})
}

// --- The far sea ------------------------------------------------------------------------

export const ARCTIC_FAR_WIDTH = 960
export const ARCTIC_FAR_HEIGHT = 160

/** A tabular iceberg far off: a flat top, straight sides, lit left, shaded right. */
function farTabular(g: Grid, x: number, w: number, top: number) {
	const base = 61
	for (let y = top; y <= base; y++) {
		const inset = y === top ? 2 : 0
		g.fill(x + inset, y, w - inset * 2, 1, FAR_ICE)
		g.fill(x + inset, y, 3, 1, FAR_ICE_LIT)
		g.fill(x + w - inset - 4, y, 4, 1, FAR_ICE_SHADE)
	}
	// Its top face catches the light; a ledge line cuts along its side.
	g.fill(x + 2, top, w - 4, 1, FAR_ICE_LIT)
	g.fill(x + 6, top + 4, w - 14, 1, FAR_ICE_SHADE)
	// Its reflection in the sea.
	g.fill(x + 4, base + 1, w - 8, 1, FAR_REFLECTION)
}

/** A peaked iceberg far off: a spire, its two faces split down the middle. */
function farPeaked(
	g: Grid,
	x: number,
	peak: number,
	left: number,
	right: number,
) {
	const base = 61
	const top = 32
	for (let y = top; y <= base; y++) {
		const t = (y - top) / (base - top)
		// Steeper near the top, spreading as it goes down, ragged on one side.
		const l = Math.round(peak - left * t ** 0.85 - (y % 5 === 0 ? 1 : 0))
		const r = Math.round(peak + right * t ** 0.9 + (y % 7 === 0 ? 1 : 0))
		g.fill(x + l, y, peak - l, 1, FAR_ICE)
		g.fill(x + peak, y, r - peak + 1, 1, FAR_ICE_SHADE)
		g.fill(x + l, y, 2, 1, FAR_ICE_LIT)
	}
	g.fill(x + peak - 1, top, 2, 3, FAR_ICE_LIT)
	g.fill(x + peak - 8, 50, 7, 1, FAR_ICE_SHADE)
	g.fill(x + peak + 4, 46, 9, 1, FAR_ICE)
	g.fill(x + peak + 6, 52, 8, 1, FAR_ICE_SHADE)
	g.fill(x + peak - left + 2, base + 1, left + right - 4, 1, FAR_REFLECTION)
}

/** A low glacier along the shore: a ridge of snow over blue ice and rock. */
function farGlacier(g: Grid, x: number, w: number) {
	const random = seeded(7311)
	let bump = 0
	for (let i = 0; i < w; i++) {
		// Rolling heights, ragged, and falling away to nothing at both ends.
		if (i % 3 === 0) bump = between(random, -1, 1)
		const edge = Math.min(i, w - 1 - i)
		const h = Math.max(
			1,
			Math.round(8 + 5 * Math.sin(i / 9) + 2 * Math.sin(i / 3.7) + bump),
		)
		const height = Math.min(h, 1 + Math.floor(edge * 0.35))
		for (let j = 0; j < height; j++) {
			const y = 60 - j
			let colour = FAR_ICE_LIT
			if (j < 2) colour = FAR_ICE
			else if (j >= height - 2 && height > 4) colour = '#ffffff'
			g.put(x + i, y, colour)
		}
		// Dark rock at the foot, here and there.
		if (i % 11 < 4 && height > 3) g.put(x + i, 60, FAR_ROCK)
		if (i % 11 < 2 && height > 4) g.put(x + i, 59, FAR_ROCK)
	}
	g.fill(x, 61, w, 1, FAR_REFLECTION)
}

/**
 * Far off: flat cold sea from the horizon down, a pale line along the
 * horizon, three distant icebergs (a tabular one, a peaked one, a low one),
 * a glacier along the shore, a few tiny floes and glints. 960 by 160,
 * tiling: nothing crosses an edge.
 */
export const arcticFar = (() => {
	const g = grid(ARCTIC_FAR_WIDTH / CELL, ARCTIC_FAR_HEIGHT / CELL)
	g.fill(0, 60, 480, 20, ARCTIC_SEA_FAR)
	g.fill(0, 60, 480, 1, FAR_HORIZON)
	farGlacier(g, 330, 118)
	farTabular(g, 60, 64, 52)
	farPeaked(g, 190, 20, 17, 26)
	farTabular(g, 276, 28, 57)
	// Tiny floes, a pale slab and its shade.
	for (const [x, y, w] of [
		[150, 65, 7],
		[168, 70, 5],
		[250, 66, 9],
		[300, 72, 6],
		[440, 68, 6],
		[20, 69, 8],
	]) {
		g.fill(x, y, w, 1, FAR_ICE_LIT)
		g.fill(x + 1, y + 1, w - 2, 1, FAR_ICE_SHADE)
	}
	// Glints on the water, pale dashes that don't touch an edge.
	const random = seeded(7312)
	for (let i = 0; i < 20; i++) {
		const w = between(random, 3, 6)
		g.fill(
			between(random, 2, 480 - w - 2),
			between(random, 64, 77),
			w,
			1,
			'rgba(232,244,250,0.22)',
		)
	}
	return g.url(CELL)
})()

// --- The near sea ----------------------------------------------------------------------

export const ARCTIC_NEAR_WIDTH = 1024
export const ARCTIC_NEAR_HEIGHT = 160

/** A seal lying on the ice, its head up on the left, flippers tucked. 13 by 5 cells. */
const SEAL_ROWS = [
	'...LLLL......',
	'.LLMMMMMMM...',
	'LKLMMMMMMMDD.',
	'NWWMMMMMMDDD.',
	'.WWWDDDDDDD..',
]

/** A polar bear, small and far off, walking. 13 by 6 cells. */
const BEAR_ROWS = [
	'...WWWWWW....',
	'.WWWWWWWWWW..',
	'KWWWWWWWWWWS.',
	'NWWWWWWWWSSS.',
	'.WW.WW..WW.W.',
	'.SS.SS..SS.S.',
]

/**
 * Nearer: sea a shade deeper, rolling in see-through white wave crests,
 * three small floes, one with a seal lying on it and, small and far, one
 * with a polar bear. 1024 by 160, tiling: the crests' dashes stay clear of
 * the edges.
 */
export const arcticNear = (() => {
	const g = grid(ARCTIC_NEAR_WIDTH / CELL, ARCTIC_NEAR_HEIGHT / CELL)
	g.fill(0, 56, 512, 24, ARCTIC_SEA)
	g.fill(0, 56, 512, 1, ARCTIC_SEA_FAR)
	// Darker troughs, then crests over them, a row of each shifted along as it goes down.
	const random = seeded(7321)
	for (let i = 0; i < 34; i++) {
		const w = between(random, 6, 12)
		const x = between(random, 2, 512 - w - 2)
		const y = between(random, 59, 77)
		g.fill(x, y + 1, w - 2, 1, 'rgba(22,56,79,0.35)')
		g.fill(x, y, w, 1, 'rgba(232,244,250,0.42)')
		g.fill(x + 2, y - 1, Math.max(2, w - 6), 1, 'rgba(232,244,250,0.22)')
	}
	// Floes.
	floe(g, 82, 53, 40)
	g.stamp(94, 48, SEAL_ROWS, {
		L: SEAL_LIT,
		M: SEAL,
		D: SEAL_SHADE,
		W: SEAL_BELLY,
		K: INK,
		N: INK,
	})
	floe(g, 214, 64, 24)
	floe(g, 350, 53, 34)
	g.stamp(361, 47, BEAR_ROWS, {
		W: BEAR,
		S: BEAR_SHADE,
		K: INK,
		N: INK,
	})
	floe(g, 452, 68, 28)
	return g.url(CELL)
})()

// --- The iceberg ------------------------------------------------------------------------

/** The cells the picture is across: 280 for the top, 12 each side for what's under. */
const BERG_COLUMNS = 304
const BERG_ROWS = 72
const BERG_TOP_ROW = 6
const BERG_WATER_ROW = 19
const BERG_LEFT = 12
const BERG_TOP_COLUMNS = 280

export const ICEBERG_WIDTH = BERG_COLUMNS * CELL
export const ICEBERG_HEIGHT = BERG_ROWS * CELL

/** In px, across the picture: where its flat top is, how high, how wide. */
export const ICEBERG_TOP_Y = BERG_TOP_ROW * CELL
export const ICEBERG_WATERLINE_Y = BERG_WATER_ROW * CELL
export const ICEBERG_TOP_LEFT = BERG_LEFT * CELL
export const ICEBERG_TOP_WIDTH = BERG_TOP_COLUMNS * CELL

/** A line through [row, column] points, its column at `row`, stepped. */
function along(points: [number, number][], row: number) {
	for (let i = 1; i < points.length; i++) {
		const [r0, c0] = points[i - 1]
		const [r1, c1] = points[i]
		if (row <= r1) return c0 + ((c1 - c0) * (row - r0)) / (r1 - r0)
	}
	return points[points.length - 1][1]
}

/**
 * The iceberg everyone stands on, drawn level: 304 by 72 cells. Its top is
 * flat along cell row 6 from column 12 to 292, snow, with lumps of it rising
 * only within 12 cells of each end. Under the snow, ice cliffs in facets,
 * lit on the left, shaded on the right, creviced, down to the waterline at
 * row 19. Under that, the part underwater: wider at first, then tapering to a
 * rough point, in plainer, deeper blues, lighter near the surface.
 */
export const ICEBERG = (() => {
	const g = grid(BERG_COLUMNS, BERG_ROWS)
	const random = seeded(7331)
	const right = BERG_LEFT + BERG_TOP_COLUMNS // 292

	// Where its sides are on each row: straight cliffs, bulging out under the water.
	const leftAt = [
		[6, 12],
		[12, 11],
		[19, 9],
		[26, 3],
		[32, 2],
		[42, 12],
		[52, 40],
		[62, 86],
		[71, 143],
	] as [number, number][]
	const rightAt = [
		[6, 292],
		[12, 293],
		[19, 295],
		[26, 301],
		[32, 302],
		[42, 291],
		[52, 261],
		[62, 213],
		[71, 161],
	] as [number, number][]
	const edges: [number, number][] = []
	let wobbleLeft = 0
	let wobbleRight = 0
	for (let y = BERG_TOP_ROW; y < BERG_ROWS; y++) {
		// Ragged: occasionally a row steps a cell or two in or out.
		if (random() < 0.35) wobbleLeft = between(random, -1, 2)
		if (random() < 0.35) wobbleRight = between(random, -2, 1)
		const stay = y < 10 ? 0 : 1
		edges[y] = [
			Math.round(along(leftAt, y)) + wobbleLeft * stay,
			Math.round(along(rightAt, y)) + wobbleRight * stay,
		]
	}
	edges[BERG_TOP_ROW] = [BERG_LEFT, right]
	edges[BERG_TOP_ROW + 1] = [BERG_LEFT, right]

	// The cliffs: facets side by side, lit on the left of the berg, shaded on the right.
	const facets: number[] = [0]
	while (facets[facets.length - 1] < BERG_COLUMNS)
		facets.push(facets[facets.length - 1] + between(random, 22, 50))
	const facetAt = (x: number) => facets.findIndex((f) => f > x) - 1
	for (let y = BERG_TOP_ROW; y < BERG_WATER_ROW; y++) {
		const [l, r] = edges[y]
		for (let x = l; x < r; x++) {
			const f = facetAt(x)
			const start = facets[f]
			const end = facets[f + 1]
			// How far across the berg it is: lighter on the left, darker on the right.
			const across = (x - BERG_LEFT) / BERG_TOP_COLUMNS
			let body = across < 0.3 ? ICE_LIT : across > 0.68 ? ICE_SHADE : ICE
			// A facet leaning away is a shade darker in itself, occasionally.
			if (f % 3 === 1 && body !== ICE_SHADE)
				body = body === ICE_LIT ? ICE : ICE_SHADE
			let colour = body
			if (x - start < 1) colour = body === ICE_SHADE ? ICE : ICE_LIT
			else if (end - x <= 1) colour = body === ICE_LIT ? ICE : ICE_SHADE
			g.put(x, y, colour)
		}
	}
	// Crevices: thin dark cracks down from under the snow, stepping a cell as they go.
	for (let i = 0; i < 16; i++) {
		let x = between(random, BERG_LEFT + 6, right - 6)
		const length = between(random, 4, 9)
		for (let j = 0; j < length; j++) {
			const y = BERG_TOP_ROW + 4 + j
			if (y >= BERG_WATER_ROW - 1) break
			g.put(x, y, ICE_SHADE)
			if (j % 3 === 2) x += random() < 0.5 ? -1 : 1
		}
	}
	// A few glints of lit ice along the cliffs' faces.
	for (let i = 0; i < 18; i++) {
		const x = between(random, BERG_LEFT + 3, right - 8)
		const y = between(random, BERG_TOP_ROW + 4, BERG_WATER_ROW - 3)
		g.fill(x, y, between(random, 2, 4), 1, ICE_SNOW)
	}

	// The snow: its top flat on row 6, a ragged, dripping edge under it.
	g.fill(BERG_LEFT, BERG_TOP_ROW, BERG_TOP_COLUMNS, 2, ICE_SNOW)
	let x = BERG_LEFT
	while (x < right) {
		const run = between(random, 3, 8)
		const drip = random() < 0.65
		if (drip) g.fill(x, BERG_TOP_ROW + 2, Math.min(run, right - x), 1, ICE_SNOW)
		else g.fill(x, BERG_TOP_ROW + 2, Math.min(run, right - x), 1, ICE_LIT)
		x += run
	}
	// Snow's own shade, a few flecks of lit ice in it.
	for (let i = 0; i < 14; i++)
		g.fill(
			between(random, BERG_LEFT + 2, right - 6),
			BERG_TOP_ROW + 1,
			between(random, 2, 5),
			1,
			ICE_LIT,
		)

	// Lumps of snow at each end, and nowhere else: heights of the rim in cells.
	const rimLeft = [1, 2, 3, 4, 5, 5, 4, 4, 3, 2, 1, 1]
	const rimRight = [1, 1, 2, 3, 3, 4, 4, 5, 4, 3, 2, 1]
	rimLeft.forEach((h, i) => {
		g.fill(BERG_LEFT + i, BERG_TOP_ROW - h, 1, h, ICE_SNOW)
		// The lit ice down its sunless side, where the lump falls away.
		if (i > 0 && rimLeft[i - 1] > h)
			g.put(BERG_LEFT + i, BERG_TOP_ROW - h, ICE_LIT)
	})
	rimRight.forEach((h, i) => {
		const col = right - rimRight.length + i
		g.fill(col, BERG_TOP_ROW - h, 1, h, ICE_SNOW)
		if (i < rimRight.length - 1 && rimRight[i + 1] < h)
			g.put(col, BERG_TOP_ROW - h, ICE_LIT)
	})

	// Under the water: shallow ice near the surface, then shade, then deep.
	const under = [ICE, ICE_SHADE, ICE_DEEP]
	for (let y = BERG_WATER_ROW; y < BERG_ROWS; y++) {
		const [l, r] = edges[y]
		const depth = (y - BERG_WATER_ROW) / (BERG_ROWS - BERG_WATER_ROW)
		for (let x = l; x < r; x++) {
			// Bands of colour with steps in them, so they aren't ruled.
			const wave = Math.sin(x / 11 + y / 6) * 0.07 + Math.sin(x / 4.3) * 0.03
			let band = depth + wave < 0.09 ? 0 : depth + wave < 0.5 ? 1 : 2
			// Lit side lighter, shaded side darker.
			if (x - l < 3 && band > 0) band--
			else if (r - x <= 3 && band < 2) band++
			g.put(x, y, under[band])
		}
	}
	// Facets of the submerged bulk: a few big lighter and darker patches, and cracks.
	for (let i = 0; i < 22; i++) {
		const y = between(random, BERG_WATER_ROW + 5, BERG_ROWS - 8)
		const [l, r] = edges[y]
		const x = between(random, l + 8, Math.max(l + 9, r - 14))
		const w = between(random, 6, 16)
		const colour = random() < 0.5 ? ICE_SHADE : ICE_DEEP
		for (let j = 0; j < between(random, 2, 4); j++) {
			const [rl, rr] = edges[y + j]
			if (x > rl + 2 && x + w < rr - 2) g.fill(x + j, y + j, w, 1, colour)
		}
	}
	// A line of the waterline itself, a lighter row where the sea meets the cliffs.
	for (let x = edges[BERG_WATER_ROW][0]; x < edges[BERG_WATER_ROW][1]; x++)
		g.put(x, BERG_WATER_ROW, ICE_LIT)
	return g.url()
})()

// --- A floe and a crest -----------------------------------------------------------------

export const FLOE_WIDTH = 30 * CELL
export const FLOE_HEIGHT = 8 * CELL

/**
 * A small loose floe: a cap of snow, ice lit on its left and shaded on its
 * right, its waterline three cells from its top and the underwater part
 * narrowing to a rounded bottom under it. 30 by 8 cells.
 */
export const FLOE = (() => {
	const g = grid(30, 8)
	floe(g, 0, 0, 30)
	return g.url()
})()

export const WAVE_CREST_WIDTH = 10 * CELL
export const WAVE_CREST_HEIGHT = 3 * CELL

/** A wave's crest, a fleck of foam to scatter on the water: white, its lowest row see-through. 10 by 3 cells. */
export const WAVE_CREST = letterArt(
	['...FF.....', '.FFFFFF...', 'ffffffffff'].map((row) => row),
	{
		F: ARCTIC_FOAM,
		f: 'rgba(232,244,250,0.55)',
	},
)
