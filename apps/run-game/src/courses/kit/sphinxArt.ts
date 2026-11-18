import { type PixelRect, pixelArt } from './pixelArt'

/**
 * The Sphinx, side on, facing back along the course at whoever's coming,
 * carved from the same sandstone as its body (the Pyramids' Cave rock, see
 * `pyramids.ts`): its head, in its nemes, on top of its chest; its near
 * foreleg out along the path, its paw at the end, the far one behind;
 * and carved into its side, its shoulder down to its elbow, and its
 * haunch, its hind leg tucked under it and its tail round its foot. Drawn
 * on the 2 px grid, lit from the upper left.
 */

/** How big a cell is on the screen. */
export const SPHINX_CELL = 2

/** Its sandstone: the Cave's rock and seams, lit, and on down into shadow. */
const STONE = {
	W: '#f0d293',
	L: '#e2bd7a',
	S: '#c99b55',
	M: '#a87b3c',
	D: '#7d5a2a',
	K: '#5a3f1c',
	X: '#3a2812',
}
type Tone = keyof typeof STONE
/** Each tone a shade darker. */
const DARKER: Record<Tone, Tone> = {
	W: 'L',
	L: 'S',
	S: 'M',
	M: 'D',
	D: 'K',
	K: 'X',
	X: 'X',
}

type Point = [x: number, y: number]

/** A grid of cells, `columns` by `rows`, each a tone or nothing, painted over one another. */
function grid(columns: number, rows: number) {
	const cells: (Tone | undefined)[][] = Array.from({ length: rows }, () =>
		Array(columns).fill(undefined),
	)
	const at = (x: number, y: number) => cells[y]?.[x]
	const set = (x: number, y: number, tone: Tone | undefined) => {
		if (y >= 0 && y < rows && x >= 0 && x < columns) cells[y][x] = tone
	}
	/** Whether a cell's middle is inside `points`. */
	const inside = (points: Point[], x: number, y: number) => {
		const px = x + 0.5
		const py = y + 0.5
		let odd = false
		for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
			const [xi, yi] = points[i]
			const [xj, yj] = points[j]
			if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
				odd = !odd
		}
		return odd
	}
	return {
		at,
		set,
		inside,
		/** Every cell inside `points`, its tone by where it is. */
		fill(points: Point[], tone: Tone | ((x: number, y: number) => Tone)) {
			for (let y = 0; y < rows; y++)
				for (let x = 0; x < columns; x++)
					if (inside(points, x, y))
						set(x, y, typeof tone === 'string' ? tone : tone(x, y))
		},
		/** A line of cells through `points`, in turn. */
		line(points: Point[], tone: Tone) {
			for (let i = 1; i < points.length; i++) {
				const [x0, y0] = points[i - 1]
				const [x1, y1] = points[i]
				const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
				for (let s = 0; s <= steps; s++)
					set(
						Math.round(x0 + ((x1 - x0) * s) / steps),
						Math.round(y0 + ((y1 - y0) * s) / steps),
						tone,
					)
			}
		},
		/** Its cells, as a picture's URL, `SPHINX_CELL` px a cell once drawn at its size. */
		picture() {
			const rects: PixelRect[] = []
			cells.forEach((row, y) => {
				// Runs of a tone along a row, as one rect each.
				let from = 0
				for (let x = 1; x <= columns; x++)
					if (x === columns || row[x] !== row[from]) {
						const tone = row[from]
						if (tone) rects.push([from, y, x - from, 1, STONE[tone]])
						from = x
					}
			})
			return pixelArt(columns, rows, rects)
		},
	}
}

// --- Its head ------------------------------------------------------------------

const HEAD_COLUMNS = 64
const HEAD_ROWS = 72
export const SPHINX_HEAD_WIDTH = HEAD_COLUMNS * SPHINX_CELL
export const SPHINX_HEAD_HEIGHT = HEAD_ROWS * SPHINX_CELL

/** Its face's outline, side on: forehead, brow, its broken nose, lips, chin, jaw, up to its ear. */
const FACE: Point[] = [
	[14, 16],
	[12, 20],
	[11, 22],
	[9, 23],
	[9, 25],
	[11, 26],
	[10, 28],
	[7, 30],
	[4, 32],
	[3, 33],
	[3, 35],
	[5, 36],
	[6, 37],
	[5, 38],
	[5, 40],
	[7, 41],
	[6, 42],
	[7, 44],
	[7, 46],
	[8, 48],
	[11, 50],
	[18, 50],
	[30, 46],
	[34, 42],
	[37, 40],
	[36, 24],
	[34, 21],
]
/** Its nemes, the headdress: its dome, and its lappet, down behind its jaw onto its shoulder. */
const NEMES: Point[] = [
	[14, 16],
	[16, 9],
	[22, 3],
	[31, 0],
	[43, 0],
	[51, 3],
	[57, 10],
	[60, 20],
	[62, 34],
	[64, 50],
	[64, 72],
	[45, 72],
	[41, 56],
	[39, 40],
	[36, 24],
	[34, 21],
]
/** Its neck, under its jaw, down into its chest. */
const NECK: Point[] = [
	[14, 48],
	[32, 43],
	[42, 46],
	[46, 72],
	[17, 72],
	[17, 58],
]
/** Its beard, plaited, broken off short. */
const BEARD: Point[] = [
	[9, 49],
	[15, 49],
	[15, 61],
	[13, 64],
	[12, 62],
	[10, 64],
	[9, 61],
]

function head() {
	const g = grid(HEAD_COLUMNS, HEAD_ROWS)
	// Its neck, in the shadow under its jaw, lighter down into its chest.
	g.fill(NECK, (_, y) => (y < 52 ? 'D' : y < 58 ? 'M' : 'S'))
	// Its face: lit down the front, in shade round toward its ear.
	g.fill(FACE, (x, y) => {
		if (!g.inside(FACE, x - 3, y)) return 'L'
		return x >= 27 ? 'M' : 'S'
	})
	// Its nemes, striped, lit along its top, in shade down its back.
	g.fill(NEMES, (x, y) => {
		let tone: Tone = Math.floor(y / 3) % 2 ? 'M' : 'S'
		if (y < 5 && tone === 'S') tone = 'L'
		if (x >= 56) tone = DARKER[tone]
		return tone
	})
	// The band over its brow, across the front of the nemes.
	g.line(
		[
			[13, 13],
			[34, 18],
		],
		'L',
	)
	g.line(
		[
			[13, 14],
			[34, 19],
		],
		'M',
	)
	g.line(
		[
			[13, 15],
			[35, 20],
		],
		'K',
	)
	// The nemes's edge, down in front of its lappet, in shadow.
	g.line(
		[
			[36, 22],
			[39, 40],
			[41, 56],
			[44, 71],
		],
		'D',
	)
	// The cobra reared on its brow, worn to a stub.
	for (const [x, y, tone] of [
		[13, 10, 'L'],
		[14, 10, 'S'],
		[13, 11, 'S'],
		[14, 11, 'M'],
		[14, 12, 'M'],
		[15, 11, 'K'],
	] as const)
		g.set(x, y, tone)
	// Its ear, in front of its lappet: rim lit, hollow dark.
	for (let y = 26; y <= 38; y++)
		for (let x = 30; x <= 37; x++) {
			const dx = (x + 0.5 - 33.5) / 3.6
			const dy = (y + 0.5 - 32.5) / 6.6
			const d = dx * dx + dy * dy
			if (d > 1) continue
			g.set(
				x,
				y,
				d > 0.55 ? (dx < 0 || dy < -0.5 ? 'L' : 'M') : d > 0.2 ? 'D' : 'K',
			)
		}
	// Its brow, heavy, over its eye, deep in the shadow under it.
	g.line(
		[
			[9, 23],
			[18, 22],
		],
		'W',
	)
	g.line(
		[
			[10, 24],
			[18, 24],
		],
		'K',
	)
	for (const [x, tone] of [
		[11, 'K'],
		[12, 'X'],
		[13, 'X'],
		[14, 'D'],
		[15, 'D'],
		[16, 'K'],
	] as const)
		g.set(x, 25, tone)
	g.line(
		[
			[12, 26],
			[16, 26],
		],
		'K',
	)
	// Its cheekbone, catching the light.
	g.line(
		[
			[13, 29],
			[19, 29],
		],
		'L',
	)
	// Its nose, broken off: the break rough, a shadow under it.
	for (const [x, y] of [
		[3, 33],
		[4, 34],
		[3, 35],
	])
		g.set(x, y, 'M')
	g.line(
		[
			[5, 36],
			[10, 36],
		],
		'K',
	)
	g.set(9, 35, 'X')
	// Its mouth, a hard line, turned down.
	g.line(
		[
			[6, 40],
			[13, 40],
			[14, 41],
		],
		'K',
	)
	g.line(
		[
			[7, 42],
			[12, 42],
		],
		'M',
	)
	// Its jaw, its chin's shadow on its neck.
	g.line(
		[
			[11, 50],
			[19, 49],
			[30, 46],
			[34, 42],
		],
		'K',
	)
	// Its beard, plaited.
	g.fill(BEARD, (x, y) => (y % 3 === 0 ? 'D' : x >= 13 ? 'M' : 'S'))
	// Its far edge, against the sky, in shadow.
	for (let y = 0; y < HEAD_ROWS; y++)
		for (let x = 0; x < HEAD_COLUMNS; x++) {
			const tone = g.at(x, y)
			if (tone && !g.at(x + 1, y) && x > 40) g.set(x, y, DARKER[tone])
		}
	// Cracks, and the stone worn away here and there.
	for (const [x, y] of [
		[20, 18],
		[21, 19],
		[21, 20],
		[22, 21],
		[24, 33],
		[25, 34],
		[25, 35],
		[48, 12],
		[49, 13],
		[49, 14],
		[52, 40],
		[53, 41],
		[53, 42],
		[54, 43],
	])
		g.set(x, y, 'K')
	return g.picture()
}
export const sphinxHead = head()

// --- Its forelegs --------------------------------------------------------------

const LEG_COLUMNS = 96
const LEG_ROWS = 13
export const SPHINX_LEG_WIDTH = LEG_COLUMNS * SPHINX_CELL
export const SPHINX_LEG_HEIGHT = LEG_ROWS * SPHINX_CELL

/**
 * A foreleg, lying out along the ground: its elbow up at the chest, on the
 * right, its forearm along to its paw, on the left, its toes split, their
 * fronts rounded. In shade, for the far one, behind.
 */
function foreleg(far: boolean) {
	const g = grid(LEG_COLUMNS, LEG_ROWS)
	const shade = (tone: Tone) => (far ? DARKER[tone] : tone)
	const leg: Point[] = [
		[20, 3],
		[82, 3],
		[87, 1],
		[92, 0],
		[96, 1],
		[96, 13],
		[18, 13],
	]
	const paw: Point[] = [
		[0, 7],
		[2, 4],
		[6, 2],
		[16, 2],
		[23, 3],
		[25, 13],
		[0, 13],
	]
	const tone = (x: number, y: number): Tone =>
		shade(y >= 11 ? 'D' : y >= 9 ? 'M' : 'S')
	g.fill(leg, tone)
	g.fill(paw, tone)
	// Lit along its top.
	for (let x = 0; x < LEG_COLUMNS; x++)
		for (let y = 0; y < LEG_ROWS; y++)
			if (g.at(x, y)) {
				g.set(x, y, shade('L'))
				break
			}
	// Its forearm's muscle, and its wrist.
	g.line(
		[
			[28, 7],
			[60, 6],
			[80, 7],
		],
		shade('M'),
	)
	g.line(
		[
			[24, 4],
			[26, 12],
		],
		shade('D'),
	)
	// Its toes, split, and rounded at the front.
	for (const x of [6, 11, 16])
		g.line(
			[
				[x, 4],
				[x, 12],
			],
			shade('K'),
		)
	for (const x of [1, 6, 11, 16]) g.set(x + 1, 12, shade('K'))
	return g.picture()
}
export const sphinxLeg = foreleg(false)
export const sphinxFarLeg = foreleg(true)

// --- Carved into its side ------------------------------------------------------

/**
 * Something rounded standing out of its side, its bottom on the ground: a
 * shoulder, a thigh. Its rim the upper half of an oval round `cx`, `cy`:
 * lit along its top and front, in shadow down its back, a shadow cast on
 * the stone behind it; inside it, the stone itself, left clear.
 */
function relief(
	g: ReturnType<typeof grid>,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
) {
	for (let y = 0; y < cy; y++)
		for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
			const across = (x + 0.5 - cx) / rx
			const down = (y + 0.5 - cy) / ry
			const d = Math.sqrt(across * across + down * down)
			const back = across > 0.45
			if (d <= 1 && d > 1 - 3 / ry) g.set(x, y, back ? 'D' : 'L')
			else if (d <= 1 - 3 / ry && d > 1 - 7 / ry && back) g.set(x, y, 'M')
			else if (d > 1 && d <= 1 + 3 / ry && back) g.set(x, y, 'M')
		}
}

/** A thick line, standing out of the stone, lit along its top: a tail. */
function tail(g: ReturnType<typeof grid>, points: Point[]) {
	g.line(
		points.map(([x, y]) => [x + 1, y + 2]),
		'D',
	)
	g.line(
		points.map(([x, y]) => [x, y + 1]),
		'L',
	)
	g.line(points, 'L')
	g.line(
		points.map(([x, y]) => [x, y - 1]),
		'W',
	)
}

/**
 * A paw, standing out of the stone, its toes split: lit along its top, in
 * shade down its back and under it; `x` along, its bottom on the ground.
 */
function paw(g: ReturnType<typeof grid>, x: number, rows: number) {
	const top = rows - 12
	const outline: Point[] = [
		[x, rows],
		[x + 1, top + 4],
		[x + 5, top],
		[x + 28, top],
		[x + 32, rows],
	]
	g.fill(outline, (_, y) =>
		y < top + 2 ? 'W' : y < rows - 3 ? 'L' : y < rows - 1 ? 'S' : 'M',
	)
	// Its back, in shade.
	for (let y = top; y < rows; y++)
		for (let c = x + 32; c >= x; c--)
			if (g.inside(outline, c, y)) {
				g.set(c, y, 'D')
				g.set(c - 1, y, 'M')
				break
			}
	for (const toe of [7, 13, 19])
		g.line(
			[
				[x + toe, top + 4],
				[x + toe, rows - 1],
			],
			'D',
		)
}

const SHOULDER_COLUMNS = 64
const SHOULDER_ROWS = 48
export const SPHINX_SHOULDER_WIDTH = SHOULDER_COLUMNS * SPHINX_CELL
export const SPHINX_SHOULDER_HEIGHT = SHOULDER_ROWS * SPHINX_CELL

/** Its shoulder, rounded out of the side of its chest, down to its elbow, where its foreleg starts. */
export const sphinxShoulder = (() => {
	const g = grid(SHOULDER_COLUMNS, SHOULDER_ROWS)
	relief(g, 30, SHOULDER_ROWS, 30, 44)
	return g.picture()
})()

const HAUNCH_COLUMNS = 150
const HAUNCH_ROWS = 48
export const SPHINX_HAUNCH_WIDTH = HAUNCH_COLUMNS * SPHINX_CELL
export const SPHINX_HAUNCH_HEIGHT = HAUNCH_ROWS * SPHINX_CELL

/**
 * Its haunch: its thigh, rounded out of its side; its hind paw, tucked
 * under the front of it, toes forward; and its tail, along the ground
 * from its rump, curling up in front of its paw.
 */
export const sphinxHaunch = (() => {
	const g = grid(HAUNCH_COLUMNS, HAUNCH_ROWS)
	relief(g, 84, HAUNCH_ROWS, 58, 44)
	paw(g, 10, HAUNCH_ROWS)
	tail(g, [
		[148, 44],
		[120, 45],
		[80, 45],
		[48, 44],
		[42, 40],
		[42, 35],
		[46, 32],
	])
	return g.picture()
})()
