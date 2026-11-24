import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * Bomb Hat's art: the eleven papier-mâché bomb heads, one a creature (a
 * frog, an owl, a pig, a fox, a ladybird, a hedgehog, a cat, an octopus),
 * the blast they go off in, and the fuse, which is painted in code. The
 * heads are 2 px cells, like the runners', facing left.
 */

const CELL = 2

// ---------------------------------------------------------------------------
// Shared colours
// ---------------------------------------------------------------------------

const INK = '#1d1d1d'
const EYE_WHITE = '#ffffff'
const EYE_SHADE = '#dde5ee'
/** The newsprint scrap pasted on each head: the paper and its tiny dark "text". */
const NEWS_PAPER = '#dedcd2'
const NEWS_SHADE = '#c3c1b6'
const NEWS_TEXT = '#6f6e6a'
/** The bomb's metal fuse collar: lit along its top, a ring round it, dark underneath. */
const COLLAR_LIT = '#a9aeb7'
const COLLAR = '#6a6e77'
const COLLAR_SHADE = '#464951'
const COLLAR_HOLE = '#25272c'
/** The dark band at the base of each head: the neck hole the wearer's shoulders go into. */
const NECK_HOLE = '#2b2230'
const NECK_RIM = '#3d3340'

/** The fuse's tarred twine, dark so it shows against the sky and the leaves both: its base, lit and shaded tones. */
const CORD = '#5a3e26'
const CORD_LIT = '#8a6440'
const CORD_SHADE = '#3a2616'

/**
 * The fuse's way out of the collar, in cells, through these points: up out
 * of it, then curling back over the top of the head (its art faces left,
 * so right). The game runs it on straight up from the last, as tall as it
 * wants it.
 */
export const FUSE_BENDS: [number, number][] = [
	[0, 0],
	[0, -4],
	[1, -7],
	[3, -10],
	[6, -12],
	[9, -13],
	[12, -13],
	[14, -15],
	[15, -18],
]

/** Every cell along a fuse through `bends`, in order, none twice. */
export function fuseCells(bends: [number, number][]): [number, number][] {
	const cells: [number, number][] = []
	for (let i = 1; i < bends.length; i++) {
		const [ax, ay] = bends[i - 1]
		const [bx, by] = bends[i]
		const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2
		for (let j = 0; j <= steps; j++) {
			const x = Math.round(ax + ((bx - ax) * j) / steps)
			const y = Math.round(ay + ((by - ay) * j) / steps)
			const last = cells[cells.length - 1]
			if (!last || last[0] !== x || last[1] !== y) cells.push([x, y])
		}
	}
	return cells
}

/**
 * A fuse's cord along `cells`, out of the collar at `x`, `y` (px): thick and
 * braided, two cells across, lit along its top left, shaded along its bottom
 * right, a dark band round it every few cells.
 */
export function paintCord(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	cells: [number, number][],
) {
	const cell = (across: number, down: number, colour: string) => {
		ctx.fillStyle = colour
		ctx.fillRect(x + across * CELL - CELL, y + down * CELL, CELL, CELL)
	}
	cells.forEach(([across, down], i) => {
		const band = i % 4 === 3
		cell(across, down, band ? CORD_SHADE : CORD_LIT)
		cell(across + 1, down, band ? CORD_SHADE : CORD)
		cell(across, down + 1, band ? CORD_SHADE : CORD)
		cell(across + 1, down + 1, CORD_SHADE)
	})
}

/**
 * The burning spark at the end of the fuse, hottest first: white-hot,
 * yellow, orange and a red ember.
 */
export const SPARK_COLOURS = ['#ffffff', '#ffe566', '#ff9b2e', '#e8452a']

/** A material's tones, lightest first: a strip's lit paper, lit, base, shade, and its seam. */
type Palette = [string, string, string, string, string]

// ---------------------------------------------------------------------------
// The grid every head is painted on
// ---------------------------------------------------------------------------

/** Every head's picture: 34 columns by 30 rows of cells. */
const COLUMNS = 34
const ROWS = 30
/** The middle of the round body, and how far it reaches across and down, in cells. */
const BODY_X = 17
const BODY_Y = 16.5
const BODY_RX = 13
const BODY_RY = 12

class Grid {
	cells: (string | undefined)[] = new Array(COLUMNS * ROWS)
	set(x: number, y: number, colour: string | undefined) {
		const column = Math.floor(x)
		const row = Math.floor(y)
		if (column >= 0 && row >= 0 && column < COLUMNS && row < ROWS)
			this.cells[row * COLUMNS + column] = colour
	}
	get(x: number, y: number) {
		return this.cells[Math.floor(y) * COLUMNS + Math.floor(x)]
	}
	rect(x: number, y: number, w: number, h: number, colour: string) {
		for (let j = 0; j < h; j++)
			for (let i = 0; i < w; i++) this.set(x + i, y + j, colour)
	}
	/** Every cell of `inside`, as `paint` says. */
	each(
		inside: (x: number, y: number) => boolean,
		paint: (x: number, y: number) => string | undefined,
	) {
		for (let y = 0; y < ROWS; y++)
			for (let x = 0; x < COLUMNS; x++)
				if (inside(x + 0.5, y + 0.5)) this.set(x, y, paint(x, y))
	}
}

type Inside = (x: number, y: number) => boolean

/** Inside the round body, which is lumpy: its edge wobbles a cell or so. */
const body: Inside = (x, y) => {
	const dx = (x - BODY_X) / BODY_RX
	const dy = (y - BODY_Y) / BODY_RY
	const angle = Math.atan2(dy, dx)
	const lump =
		0.07 * Math.sin(3 * angle + 1) + 0.045 * Math.sin(5 * angle + 2.3)
	return dx * dx + dy * dy <= 1 + lump
}

const ellipse =
	(cx: number, cy: number, rx: number, ry: number): Inside =>
	(x, y) =>
		((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

const triangle =
	(a: [number, number], b: [number, number], c: [number, number]): Inside =>
	(x, y) => {
		const side = (p: [number, number], q: [number, number]) =>
			(q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])
		const s1 = side(a, b)
		const s2 = side(b, c)
		const s3 = side(c, a)
		return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)
	}

/** Inside a strip of paper: `length` long, `width` across, tipped `angle` degrees. */
const strip = (
	cx: number,
	cy: number,
	length: number,
	width: number,
	angle: number,
) => {
	const a = (angle * Math.PI) / 180
	const across = (x: number, y: number) =>
		(y - cy) * Math.cos(a) - (x - cx) * Math.sin(a)
	const along = (x: number, y: number) =>
		(x - cx) * Math.cos(a) + (y - cy) * Math.sin(a)
	return {
		on: (x: number, y: number) =>
			Math.abs(along(x, y)) <= length / 2 &&
			Math.abs(across(x, y)) <= width / 2,
		/** The one cell under its lower edge, where it lies over the paper beneath. */
		edge: (x: number, y: number) =>
			Math.abs(along(x, y)) <= length / 2 &&
			across(x, y) > width / 2 &&
			across(x, y) <= width / 2 + 1,
	}
}

/** The strips of paper laid over a head: [x, y, length, width, angle]. */
const STRIPS: [number, number, number, number, number][] = [
	[22, 9, 11, 3, -35],
	[9, 9, 9, 3, 28],
	[24, 21, 10, 3, 38],
	[13, 25, 10, 3, -12],
	[18, 15, 9, 3, 75],
]

/**
 * Paints `inside` in `palette`, lit from above left: the tone from where
 * a cell is round the shape's middle, `cx`, `cy`. Its `strips` are a tone
 * lighter, with a seam a tone darker along their lower edge.
 */
function paint(
	grid: Grid,
	inside: Inside,
	palette: Palette,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	strips: ReturnType<typeof strip>[] = [],
) {
	grid.each(inside, (x, y) => {
		const u = (x + 0.5 - cx) / rx
		const v = (y + 0.5 - cy) / ry
		const s = u * 0.6 + v * 0.8
		let tone = s < -0.5 ? 1 : s > 0.42 || v > 0.7 ? 3 : 2
		if (strips.some((p) => p.on(x + 0.5, y + 0.5))) tone -= 1
		else if (strips.some((p) => p.edge(x + 0.5, y + 0.5))) tone += 1
		return palette[tone]
	})
}

/** The head's round body, painted, with its paper strips. */
function paintBody(grid: Grid, palette: Palette, inside: Inside = body) {
	paint(
		grid,
		(x, y) => body(x, y) && inside(x, y),
		palette,
		BODY_X,
		BODY_Y,
		BODY_RX,
		BODY_RY,
		STRIPS.map((s) => strip(...s)),
	)
}

/** A scrap of newsprint stuck on, `w` by `h` cells: pale grey with dark dashes of "text". */
function newsprint(grid: Grid, x: number, y: number, w: number, h: number) {
	for (let j = 0; j < h; j++)
		for (let i = 0; i < w; i++) {
			if (!body(x + i + 0.5, y + j + 0.5)) continue
			const text = j % 2 === 0 && (i + j * 2) % 4 !== 3 && i > 0 && i < w - 1
			grid.set(
				x + i,
				y + j,
				text ? NEWS_TEXT : j === h - 1 ? NEWS_SHADE : NEWS_PAPER,
			)
		}
}

/** The dark curved band at the base: the open neck the wearer's shoulders go up into. */
function neckHole(grid: Grid) {
	grid.each(
		(x, y) =>
			body(x, y) &&
			Math.abs(x - BODY_X) <= 8.6 &&
			y > 27.4 - 2.4 * Math.sqrt(Math.max(0, 1 - ((x - BODY_X) / 8.6) ** 2)),
		(x, y) => (y < 26.6 ? NECK_RIM : NECK_HOLE),
	)
}

/** The metal collar on top, the fuse coming out of its middle. */
function collar(grid: Grid) {
	// Its cap, lit along its top; its ring; its sides, shaded to the right.
	grid.rect(13, 1, 8, 1, COLLAR_LIT)
	grid.rect(13, 2, 8, 3, COLLAR)
	grid.rect(13, 2, 2, 3, COLLAR_LIT)
	grid.rect(18, 2, 3, 3, COLLAR_SHADE)
	grid.rect(12, 5, 10, 1, COLLAR_SHADE)
	grid.rect(12, 4, 10, 1, COLLAR_LIT)
	grid.rect(16, 0, 2, 1, COLLAR_HOLE)
	grid.rect(16, 1, 2, 1, COLLAR_HOLE)
}

/** A big googly eye, `size` cells across, its top left at `x`, `y`, looking left. */
function eye(
	grid: Grid,
	x: number,
	y: number,
	size: number,
	lid: string,
	state: Blink,
) {
	const c = size / 2
	const disc: Inside = (px, py) =>
		(px - x - c) ** 2 + (py - y - c) ** 2 <= c * c + 0.25
	const rows = size
	if (state === 'shut') {
		grid.each(
			(px, py) =>
				disc(px, py) && px >= x && px < x + size && py >= y && py < y + size,
			() => lid,
		)
		// A curved dark line where the lids meet, its ends turned up.
		const mid = y + Math.floor(rows / 2) + 1
		grid.rect(x + 1, mid - 1, 1, 1, INK)
		grid.rect(x + size - 2, mid - 1, 1, 1, INK)
		grid.rect(x + 2, mid, size - 4, 1, INK)
		return
	}
	grid.each(
		(px, py) =>
			disc(px, py) && px >= x && px < x + size && py >= y && py < y + size,
		(_px, py) => (py >= y + rows - 1 ? EYE_SHADE : EYE_WHITE),
	)
	const lidRows = state === 'half' ? Math.ceil(rows / 2) : 0
	// The pupil, a third of the eye, on its left.
	const pupil = Math.round(size / 2.3)
	const pupilY =
		state === 'half' ? y + lidRows : y + Math.floor((rows - pupil) / 2)
	for (let j = 0; j < pupil; j++)
		for (let i = 0; i < pupil; i++)
			if (
				pupilY + j < y + rows &&
				grid.get(x + 1 + i, pupilY + j) !== undefined
			)
				grid.set(x + 1 + i, pupilY + j, INK)
	if (state === 'open') grid.set(x + 1 + pupil - 1, pupilY, EYE_WHITE)
	if (state === 'half') {
		grid.each(
			(px, py) => disc(px, py) && py < y + lidRows,
			() => lid,
		)
		grid.each(
			(px, py) => disc(px, py) && py >= y + lidRows - 1 && py < y + lidRows,
			() => INK,
		)
	}
}

type Blink = 'open' | 'half' | 'shut'

interface Creature {
	name: string
	/** Its papier-mâché's colours: the scraps it bursts into. */
	scraps: string[]
	/** Draws everything but its eyes, and gives where those go. */
	draw: (grid: Grid) => Eye[]
}

interface Eye {
	x: number
	y: number
	size: number
	/** What its eyelids are: the colour of the face it sits on. */
	lid: string
}

/** A line of cells from `a` to `b`, `thick` across. */
function line(
	grid: Grid,
	a: [number, number],
	b: [number, number],
	colour: string,
	thick = 1,
) {
	const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
	for (let i = 0; i <= steps; i++) {
		const t = steps ? i / steps : 0
		grid.rect(
			Math.round(a[0] + (b[0] - a[0]) * t),
			Math.round(a[1] + (b[1] - a[1]) * t),
			thick,
			thick,
			colour,
		)
	}
}

/** A shaded blob: an ellipse in its own palette. */
function blob(
	grid: Grid,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	palette: Palette,
	clip: Inside = () => true,
) {
	paint(
		grid,
		(x, y) => ellipse(cx, cy, rx, ry)(x, y) && clip(x, y),
		palette,
		cx,
		cy,
		rx,
		ry,
	)
}

/** A shaded point: a triangle in its own palette. */
function point(
	grid: Grid,
	a: [number, number],
	b: [number, number],
	c: [number, number],
	palette: Palette,
) {
	const cx = (a[0] + b[0] + c[0]) / 3
	const cy = (a[1] + b[1] + c[1]) / 3
	const xs = [a[0], b[0], c[0]]
	const ys = [a[1], b[1], c[1]]
	paint(
		grid,
		triangle(a, b, c),
		palette,
		cx,
		cy,
		(Math.max(...xs) - Math.min(...xs)) / 1.6,
		(Math.max(...ys) - Math.min(...ys)) / 1.6,
	)
}

// ---------------------------------------------------------------------------
// The eight creatures
// ---------------------------------------------------------------------------

const FROG: Palette = ['#9fe466', '#82ca4c', '#5aae3c', '#3f8e36', '#2c6c2d']
const FROG_MOUTH = '#22441f'
const FROG_TONGUE = '#ee6f7c'

/** The frog: green, its eyes bulging up on top of its head, a wide smile. */
const frog: Creature = {
	name: 'Frog',
	scraps: [FROG[2], FROG[1], FROG[3], NEWS_PAPER],
	draw(g) {
		paintBody(g, FROG)
		newsprint(g, 22, 13, 6, 5)
		// Its two eyes bulge out of its head on top, either side of the fuse.
		blob(g, 8.5, 7.5, 6, 5.5, FROG)
		blob(g, 25, 7.5, 6, 5.5, FROG)
		// Its wide smile, a tongue tip showing in the middle, and nostrils.
		const smile = (x: number) =>
			Math.round(19 + 3 * (1 - ((x - 13) / 10.5) ** 2))
		for (let x = 3; x <= 24; x++) {
			g.set(x, smile(x), FROG_MOUTH)
			g.set(x, smile(x) + 1, FROG_MOUTH)
		}
		g.rect(3, 18, 1, 1, FROG_MOUTH)
		g.rect(24, 18, 1, 1, FROG_MOUTH)
		g.rect(11, 22, 4, 1, FROG_TONGUE)
		g.rect(12, 23, 2, 1, FROG_TONGUE)
		g.rect(5, 15, 1, 2, FROG[4])
		g.rect(8, 15, 1, 2, FROG[4])
		return [
			{ x: 5, y: 4, size: 7, lid: FROG[2] },
			{ x: 21.5, y: 4, size: 7, lid: FROG[2] },
		].map((e) => ({ ...e, x: Math.round(e.x) }))
	},
}

const OWL: Palette = ['#deb06a', '#cb9249', '#ad7538', '#8a5a2c', '#6c4423']
const OWL_FACE = '#efd9a8'
const OWL_FACE_SHADE = '#d6bb86'
const OWL_BEAK = '#f08a1e'
const OWL_BEAK_SHADE = '#c46a12'
const OWL_CHEVRON = '#e3c58a'

/** The owl: tawny, ear tufts, a cream face disc round big eyes, an orange beak, chevrons of feathers on its front. */
const owl: Creature = {
	name: 'Owl',
	scraps: [OWL[2], OWL[1], OWL[3], OWL_FACE],
	draw(g) {
		// Ear tufts, behind its head.
		point(g, [5, 8], [6, 0], [12, 5], OWL)
		point(g, [22, 5], [28, 0], [29, 8], OWL)
		paintBody(g, OWL)
		newsprint(g, 22, 15, 6, 5)
		// Feather chevrons down its front.
		for (const [cx, cy] of [
			[10, 22],
			[17, 22],
			[24, 22],
			[13, 25],
			[20, 25],
		]) {
			g.rect(cx - 3, cy, 1, 1, OWL_CHEVRON)
			g.rect(cx - 2, cy + 1, 2, 1, OWL_CHEVRON)
			g.rect(cx, cy + 1, 2, 1, OWL_CHEVRON)
			g.rect(cx + 2, cy, 1, 1, OWL_CHEVRON)
		}
		// Its face disc: two cream rings round its eyes.
		blob(g, 9.5, 13.5, 6.6, 6.6, [
			OWL_FACE,
			OWL_FACE,
			OWL_FACE,
			OWL_FACE_SHADE,
			OWL_FACE_SHADE,
		])
		blob(g, 19, 13.5, 6.6, 6.6, [
			OWL_FACE,
			OWL_FACE,
			OWL_FACE,
			OWL_FACE_SHADE,
			OWL_FACE_SHADE,
		])
		// Its beak, between and below its eyes.
		g.rect(12, 14, 4, 2, OWL_BEAK)
		g.rect(12, 16, 3, 2, OWL_BEAK)
		g.rect(12, 18, 2, 1, OWL_BEAK_SHADE)
		g.rect(15, 16, 1, 1, OWL_BEAK_SHADE)
		return [
			{ x: 6, y: 10, size: 7, lid: OWL_FACE },
			{ x: 16, y: 10, size: 7, lid: OWL_FACE },
		]
	},
}

const PIG: Palette = ['#ffd6da', '#ffbcc7', '#f2a2b2', '#d67f94', '#b8607a']
const PIG_SNOUT: Palette = [
	'#ffc2cb',
	'#ffa8b7',
	'#ea8c9f',
	'#c96f86',
	'#a8546c',
]
const PIG_NOSTRIL = '#7a2f46'

/** The pig: pink, a big round snout with two nostrils sticking out in front, floppy ears. */
const pig: Creature = {
	name: 'Pig',
	scraps: [PIG[2], PIG[1], PIG[3], NEWS_PAPER],
	draw(g) {
		// Floppy ears, folded over at their tips.
		point(
			g,
			[4, 10],
			[6, 2],
			[12, 5],
			PIG[3] ? [PIG[1], PIG[2], PIG[3], PIG[3], PIG[4]] : PIG,
		)
		point(
			g,
			[22, 5],
			[28, 2],
			[30, 10],
			[PIG[1], PIG[2], PIG[3], PIG[3], PIG[4]],
		)
		paintBody(g, PIG)
		newsprint(g, 22, 12, 6, 5)
		// Its snout, a wide oval stuck out in front, with nostrils.
		blob(g, 8, 20, 7, 4.8, PIG_SNOUT)
		g.rect(5, 19, 2, 3, PIG_NOSTRIL)
		g.rect(10, 19, 2, 3, PIG_NOSTRIL)
		// Cheek blush.
		g.rect(17, 19, 3, 2, PIG[1])
		return [
			{ x: 6, y: 9, size: 7, lid: PIG[2] },
			{ x: 16, y: 9, size: 7, lid: PIG[2] },
		]
	},
}

const FOX: Palette = ['#ffba70', '#f89a48', '#e5762a', '#c25a1c', '#9e4616']
const FOX_WHITE: Palette = [
	'#ffffff',
	'#fffaf0',
	'#fbefdc',
	'#e3d2b8',
	'#c9b89c',
]
const FOX_BLACK = '#2a2220'
const FOX_EAR_INSIDE = '#f6c9a0'

/** The fox: orange, tall pointed ears tipped black, a white muzzle with a black nose, white cheeks. */
const fox: Creature = {
	name: 'Fox',
	scraps: [FOX[2], FOX[1], FOX[3], FOX_WHITE[2]],
	draw(g) {
		// Pointed ears, black at their tips, cream inside.
		point(g, [4, 10], [6, -1], [13, 6], FOX)
		point(g, [21, 6], [28, -1], [30, 10], FOX)
		g.each(triangle([4.8, 4.5], [6.4, 0], [10.2, 4.5]), () => FOX_BLACK)
		g.each(triangle([23.8, 4.5], [27.6, 0], [29.2, 4.5]), () => FOX_BLACK)
		g.each(triangle([7, 9], [7.5, 4.5], [10.5, 7]), () => FOX_EAR_INSIDE)
		g.each(triangle([23, 7], [26.5, 4.5], [27.4, 9]), () => FOX_EAR_INSIDE)
		paintBody(g, FOX)
		newsprint(g, 22, 11, 6, 5)
		// Its white cheeks and muzzle, coming to a point out in front.
		blob(g, 21, 23, 8.5, 4.6, FOX_WHITE, body)
		blob(g, 10, 21, 8, 5, FOX_WHITE, (x, y) => body(x, y) || x < 5)
		g.each(triangle([1, 19], [10, 17.5], [10, 25]), () => FOX_WHITE[2])
		g.rect(1, 19, 4, 2, FOX_BLACK)
		g.rect(2, 21, 2, 1, FOX_BLACK)
		g.rect(7, 24, 5, 1, FOX_WHITE[3])
		return [
			{ x: 6, y: 9, size: 7, lid: FOX[2] },
			{ x: 16, y: 9, size: 7, lid: FOX[2] },
		]
	},
}

const LADY: Palette = ['#f87c66', '#ec4c3e', '#d6302c', '#aa2022', '#831a20']
/** What a ladybird's eyelids are: a pale grey, so a shut eye's line shows on its black face. */
const LADY_LID = '#8c8c9a'
const LADY_BLACK: Palette = [
	'#5a5a66',
	'#464650',
	'#30303a',
	'#22222a',
	'#18181e',
]

/** The ladybird: red with black spots, a black face, two antennae with knobs. */
const ladybird: Creature = {
	name: 'Ladybird',
	scraps: [LADY[2], LADY[1], LADY[3], LADY_BLACK[2]],
	draw(g) {
		// Antennae, curling over its brow, behind the body.
		line(g, [8, 6], [5, 3], LADY_BLACK[2], 1)
		line(g, [11, 5], [10, 2], LADY_BLACK[2], 1)
		g.rect(3, 1, 3, 2, LADY_BLACK[2])
		g.rect(8, 0, 3, 2, LADY_BLACK[2])
		paintBody(g, LADY)
		// Its black face over its left side, edge a curve, and the seam of its wing cases.
		paint(
			g,
			(x, y) => body(x, y) && ellipse(9, 17, 8.6, 10.6)(x, y),
			LADY_BLACK,
			9,
			17,
			8.6,
			10.6,
		)
		for (let y = 6; y < 28; y++)
			if (body(17.5, y + 0.5)) g.set(17, y, LADY_BLACK[3])
		// Its spots.
		for (const [cx, cy, r] of [
			[23, 11, 2.7],
			[26, 18.5, 2.4],
			[21, 22, 2.6],
			[22, 16, 1.7],
		] as const)
			g.each(
				(x, y) => body(x, y) && ellipse(cx, cy, r, r)(x, y),
				() => LADY_BLACK[2],
			)
		newsprint(g, 23, 5, 5, 4)
		return [
			{ x: 5, y: 11, size: 7, lid: LADY_LID },
			{ x: 14, y: 11, size: 7, lid: LADY_LID },
		]
	},
}

const HOG: Palette = ['#a88458', '#8a6642', '#6c4c2e', '#523a22', '#3e2a18']
const HOG_FACE: Palette = [
	'#fbe8c8',
	'#f0d4ac',
	'#dcb98a',
	'#bb946a',
	'#9a7550',
]
const HOG_SPINE = '#4a3320'
const HOG_SPINE_LIT = '#a98a5a'
const HOG_NOSE = '#1d1d1d'

/** The hedgehog: brown, spines bristling round its back and top, a pale face with a black nose. */
const hedgehog: Creature = {
	name: 'Hedgehog',
	scraps: [HOG[2], HOG[1], HOG_FACE[2], NEWS_PAPER],
	draw(g) {
		// Spines, every so often round its top and back.
		for (let deg = -170; deg <= 45; deg += 15) {
			const a = (deg * Math.PI) / 180
			const at = (r: number, off: number): [number, number] => {
				const aa = a + off
				return [
					BODY_X + Math.cos(aa) * BODY_RX * r,
					BODY_Y + Math.sin(aa) * BODY_RY * r,
				]
			}
			const tip = [
				BODY_X + Math.cos(a) * (BODY_RX + 4),
				BODY_Y + Math.sin(a) * (BODY_RY + 4),
			] as [number, number]
			const t = triangle(at(0.88, -0.17), at(0.88, 0.17), tip)
			g.each(t, (x, y) =>
				((x - BODY_X) / (BODY_RX + 3) ** 1) ** 2 +
					((y - BODY_Y) / (BODY_RY + 3)) ** 2 >
				1.0
					? HOG_SPINE_LIT
					: HOG_SPINE,
			)
		}
		paintBody(g, HOG)
		newsprint(g, 22, 12, 5, 5)
		// Its pale face, over the left of its body, and its snout poking out.
		blob(g, 9.5, 18.5, 8.6, 8, HOG_FACE, body)
		blob(g, 5, 20.5, 5, 3.2, HOG_FACE)
		g.rect(1, 20, 3, 2, HOG_NOSE)
		g.rect(1, 19, 2, 1, HOG_NOSE)
		g.rect(14, 5, 6, 1, HOG[3])
		return [
			{ x: 6, y: 11, size: 7, lid: HOG_FACE[2] },
			{ x: 15, y: 11, size: 7, lid: HOG_FACE[2] },
		]
	},
}

const CAT: Palette = ['#c2c7ce', '#a7acb4', '#8b909a', '#6c717b', '#545862']
const CAT_STRIPE = '#4c505a'
const CAT_MUZZLE = '#e6e9ee'
const CAT_NOSE = '#e88aa0'
const CAT_EAR = '#e9a4b2'
const WHISKER = '#f2f4f7'

/** The cat: grey tabby, dark stripes, pointy pink-lined ears, a pale muzzle with a pink nose, whiskers. */
const cat: Creature = {
	name: 'Cat',
	scraps: [CAT[2], CAT[1], CAT[3], CAT_MUZZLE],
	draw(g) {
		point(g, [4, 11], [5, -1], [13, 5], CAT)
		point(g, [21, 5], [29, -1], [30, 11], CAT)
		g.each(triangle([6.2, 8], [6.5, 3.2], [10.5, 5.8]), () => CAT_EAR)
		g.each(triangle([24, 5.8], [27.6, 3.2], [28.5, 8]), () => CAT_EAR)
		paintBody(g, CAT)
		newsprint(g, 23, 6, 5, 4)
		// Tabby stripes: round its right side, and over its brow.
		for (const y of [10, 14, 18, 22]) {
			const reach = 6 - Math.abs(y - 16) / 2
			for (let x = 31 - reach; x < 31; x++)
				if (body(x + 0.5, y + 0.5)) g.set(x, y, CAT_STRIPE)
			if (body(30.5, y + 1.5)) g.set(30, y + 1, CAT_STRIPE)
		}
		for (const x of [7, 10]) g.rect(x, 6 + (x === 7 ? 1 : 0), 1, 3, CAT_STRIPE)
		g.rect(14, 8, 1, 1, CAT_STRIPE)
		// Its pale muzzle, pink nose, and mouth.
		blob(g, 10.5, 22, 5, 3.4, [
			CAT_MUZZLE,
			CAT_MUZZLE,
			CAT_MUZZLE,
			'#cbd0d8',
			'#cbd0d8',
		])
		g.rect(8, 19, 3, 1, CAT_NOSE)
		g.rect(9, 20, 1, 1, CAT_NOSE)
		g.rect(9, 21, 1, 1, CAT_STRIPE)
		g.rect(8, 22, 1, 1, CAT_STRIPE)
		g.rect(10, 22, 1, 1, CAT_STRIPE)
		// Whiskers, both sides.
		line(g, [7, 21], [0, 19], WHISKER)
		line(g, [7, 23], [0, 24], WHISKER)
		line(g, [14, 21], [20, 19], WHISKER)
		line(g, [14, 23], [20, 25], WHISKER)
		return [
			{ x: 6, y: 9, size: 7, lid: CAT[2] },
			{ x: 16, y: 9, size: 7, lid: CAT[2] },
		]
	},
}

const OCTO: Palette = ['#cba0f4', '#b484e2', '#9662ce', '#7647aa', '#5a368a']
const OCTO_SUCKER = '#ecd2ff'
const OCTO_MOUTH = '#4a2a6c'

/** The octopus: purple, tentacles curling round its bottom edge with pale suckers, pale spots on its dome. */
const octopus: Creature = {
	name: 'Octopus',
	scraps: [OCTO[2], OCTO[1], OCTO[3], OCTO_SUCKER],
	draw(g) {
		// Tentacles, hanging from its lower edge and curling at their tips.
		const tentacles: [number, number][][] = [
			[
				[6, 22],
				[3, 24],
				[3, 27],
				[6, 28],
				[7, 26],
			],
			[
				[27, 22],
				[30, 24],
				[30, 27],
				[27, 28],
				[26, 26],
			],
		]
		for (const t of tentacles)
			for (let i = 0; i < t.length - 1; i++) {
				const thick = i < t.length - 2 ? 3 : 2
				line(g, t[i], t[i + 1], OCTO[2], thick)
				line(
					g,
					[t[i][0] + 1, t[i][1] + thick - 1],
					[t[i + 1][0] + 1, t[i + 1][1] + thick - 1],
					OCTO[3],
					1,
				)
			}
		paintBody(g, OCTO)
		// Pale suckers along their undersides.
		for (const [x, y] of [
			[4, 25],
			[4, 27],
			[7, 28],
			[29, 25],
			[29, 27],
			[26, 28],
		])
			g.set(x, y, OCTO_SUCKER)
		// Pale spots on its dome.
		for (const [cx, cy, r] of [
			[22, 8, 1.6],
			[26, 13, 1.3],
			[19.5, 11, 1.2],
		] as const)
			g.each(
				(x, y) => body(x, y) && ellipse(cx, cy, r, r)(x, y),
				() => OCTO[0],
			)
		newsprint(g, 22, 17, 6, 5)
		// A small round mouth.
		g.rect(10, 21, 2, 2, OCTO_MOUTH)
		return [
			{ x: 6, y: 10, size: 7, lid: OCTO[2] },
			{ x: 15, y: 10, size: 7, lid: OCTO[2] },
		]
	},
}

const LLAMA: Palette = ['#fff6e2', '#f4e0b8', '#e1c590', '#bf9f6c', '#977a4c']
const LLAMA_MUZZLE: Palette = [
	'#fff1d4',
	'#f0d9ae',
	'#dcbd88',
	'#b99a66',
	'#957749',
]
const LLAMA_EAR = '#e9a99a'
const LLAMA_NOSE = '#3a2a22'
const TASSEL_RED = '#e0443c'
const TASSEL_TEAL = '#2fa8a0'
const TASSEL_YELLOW = '#f4c430'

/** The llama: cream and fawn, a fluffy fringe round its collar, long upright banana ears with a woven tassel on one, a long muzzle with a split lip. */
const llama: Creature = {
	name: 'Llama',
	scraps: [LLAMA[2], LLAMA[1], LLAMA[3], TASSEL_RED],
	draw(g) {
		// Long banana ears, leaning a little out, behind its head.
		blob(g, 8, 5, 2.8, 5.8, LLAMA)
		blob(g, 25.5, 5, 2.8, 5.8, LLAMA)
		g.each(ellipse(8, 5.5, 1.1, 3.6), () => LLAMA_EAR)
		g.each(ellipse(25.5, 5.5, 1.1, 3.6), () => LLAMA_EAR)
		paintBody(g, LLAMA)
		newsprint(g, 22, 14, 6, 5)
		// Its fluffy fringe: tufts round the collar, and over its brow.
		blob(g, 11.5, 7.5, 3.6, 2.4, LLAMA)
		blob(g, 22.5, 7.5, 3.6, 2.4, LLAMA)
		blob(g, 14.5, 6.5, 2.8, 2.2, LLAMA)
		blob(g, 19.5, 6.5, 2.8, 2.2, LLAMA)
		blob(g, 17, 8, 3.2, 2, LLAMA)
		// The tassel on its right ear: a pompom, a woven band, threads.
		g.rect(26, 0, 4, 4, TASSEL_RED)
		g.rect(26, 1, 4, 1, TASSEL_YELLOW)
		g.rect(27, 3, 2, 1, TASSEL_TEAL)
		g.rect(26, 4, 1, 2, TASSEL_RED)
		g.rect(28, 4, 1, 2, TASSEL_YELLOW)
		g.rect(29, 4, 1, 1, TASSEL_TEAL)
		// Its long muzzle, poking out in front, with its nose and split lip.
		blob(g, 6.5, 20, 6.5, 4.2, LLAMA_MUZZLE)
		g.rect(0, 18, 2, 2, LLAMA_NOSE)
		g.rect(2, 19, 1, 1, LLAMA_NOSE)
		g.rect(3, 21, 1, 3, LLAMA_NOSE)
		g.rect(4, 23, 7, 1, LLAMA_MUZZLE[3])
		g.rect(11, 22, 1, 1, LLAMA_MUZZLE[3])
		return [
			{ x: 6, y: 10, size: 7, lid: LLAMA[2] },
			{ x: 16, y: 10, size: 7, lid: LLAMA[2] },
		]
	},
}

const GOAT: Palette = ['#ffffff', '#f7f7f3', '#e5e5df', '#c0c1bd', '#9b9d9b']
const GOAT_HORN: Palette = [
	'#6a645e',
	'#4a4541',
	'#2f2b29',
	'#221f1e',
	'#171515',
]
const GOAT_NOSE = '#2b2626'
const GOAT_EAR = '#e8b8b8'

/** The mountain goat: a shaggy white coat, short black horns curving back, small side ears, a long white beard hanging off its chin, a dark nose. */
const goat: Creature = {
	name: 'Mountain Goat',
	scraps: [GOAT[2], GOAT[1], GOAT[3], GOAT_HORN[2]],
	draw(g) {
		// Shaggy tufts of coat, bristling out round its back and top.
		for (let deg = -125; deg <= 55; deg += 18) {
			const a = (deg * Math.PI) / 180
			const at = (off: number): [number, number] => [
				BODY_X + Math.cos(a + off) * BODY_RX * 0.88,
				BODY_Y + Math.sin(a + off) * BODY_RY * 0.88,
			]
			const tip: [number, number] = [
				BODY_X + Math.cos(a + 0.05) * (BODY_RX + 2.6),
				BODY_Y + Math.sin(a + 0.05) * (BODY_RY + 2.6),
			]
			g.each(triangle(at(-0.2), at(0.2), tip), (x, y) =>
				x + y > 30 ? GOAT[3] : GOAT[2],
			)
		}
		// Small ears sticking out sideways.
		point(
			g,
			[5, 10],
			[0, 9],
			[6, 14],
			[GOAT[1], GOAT[2], GOAT[3], GOAT[3], GOAT[4]],
		)
		point(
			g,
			[28, 10],
			[33, 9],
			[28, 14],
			[GOAT[1], GOAT[2], GOAT[3], GOAT[3], GOAT[4]],
		)
		g.rect(2, 10, 2, 2, GOAT_EAR)
		g.rect(30, 10, 2, 2, GOAT_EAR)
		// Short black horns, rising and curving back.
		for (const [x0, x1] of [
			[9, 15],
			[24, 29],
		]) {
			const dir = x1 > x0 ? 1 : 1
			g.rect(x0, 4, 3, 3, GOAT_HORN[1])
			g.rect(x0, 2, 3, 3, GOAT_HORN[2])
			g.rect(x0 + dir, 0, 3, 3, GOAT_HORN[2])
			g.rect(x0 + 3, 0, 2, 2, GOAT_HORN[3])
			g.rect(x0 + 5, 1, 1, 1, GOAT_HORN[4])
			g.rect(x0, 2, 1, 4, GOAT_HORN[0])
			g.rect(x0 + 1, 0, 2, 1, GOAT_HORN[0])
		}
		paintBody(g, GOAT)
		newsprint(g, 22, 13, 6, 5)
		// Its snout, a dark nose and mouth.
		blob(g, 7, 19, 5, 3.6, GOAT)
		g.rect(1, 17, 3, 3, GOAT_NOSE)
		g.rect(4, 22, 5, 1, GOAT[4])
		// Its long beard, hanging off its chin, ragged, down to a point.
		const beard = triangle([1.5, 20], [12, 20], [5.5, 30])
		g.each(beard, (x, y) => {
			if ((Math.floor(x) + Math.floor(y)) % 5 === 0 && y > 24) return undefined
			return y > 26 || x > 9 || x < 3.5 ? GOAT[3] : y > 23 ? GOAT[2] : GOAT[1]
		})
		g.rect(5, 23, 1, 4, GOAT[4])
		g.rect(8, 22, 1, 3, GOAT[4])
		return [
			{ x: 6, y: 9, size: 7, lid: GOAT[2] },
			{ x: 16, y: 9, size: 7, lid: GOAT[2] },
		]
	},
}

const AXO: Palette = ['#fff1f5', '#ffdce8', '#fcc0d3', '#e79bb7', '#c97b9d']
const AXO_GILL: Palette = [
	'#ff9fc4',
	'#ee66a0',
	'#d1427f',
	'#a82b64',
	'#7f1f4b',
]
const AXO_MOUTH = '#7a2a48'
const AXO_FRECKLE = '#e58fae'

/** The axolotl: pale pink, three feathery magenta gills fanning out each side of its head, a wide happy smile, freckles. */
const axolotl: Creature = {
	name: 'Axolotl',
	scraps: [AXO[2], AXO[1], AXO_GILL[1], AXO[3]],
	draw(g) {
		// Gills: three feathery fans each side, deeper pink towards their tips, notched like feathers.
		const gill = (
			base1: [number, number],
			base2: [number, number],
			tip: [number, number],
			flip: boolean,
		) => {
			const m = (q: [number, number]): [number, number] =>
				flip ? [33 - q[0], q[1]] : q
			const [a, b, t] = [m(base1), m(base2), m(tip)]
			const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
			const reach = Math.hypot(t[0] - mid[0], t[1] - mid[1])
			g.each(triangle(a, b, t), (x, y) => {
				const far = Math.hypot(x - mid[0], y - mid[1]) / reach
				if (far > 0.5 && (Math.floor(x) + 2 * Math.floor(y)) % 4 === 0)
					return undefined
				return far > 0.8 ? AXO_GILL[0] : far > 0.45 ? AXO_GILL[1] : AXO_GILL[2]
			})
		}
		for (const flip of [false, true]) {
			gill([10, 5], [6, 11], [0, 0], flip)
			gill([5, 11], [4, 16], [0, 10], flip)
			gill([5, 17], [6, 22], [0, 24], flip)
		}
		paintBody(g, AXO)
		newsprint(g, 22, 15, 6, 5)
		// Freckles.
		for (const [x, y] of [
			[21, 9],
			[24, 11],
			[12, 7],
			[26, 17],
			[9, 22],
			[19, 6],
		])
			g.set(x, y, AXO_FRECKLE)
		// Its wide happy smile, and blushing cheeks.
		const smile = (x: number) =>
			Math.round(20 + 3 * (1 - ((x - 14) / 10.5) ** 2))
		for (let x = 4; x <= 24; x++) {
			g.set(x, smile(x), AXO_MOUTH)
			g.set(x, smile(x) + 1, AXO_MOUTH)
		}
		g.rect(3, 19, 1, 1, AXO_MOUTH)
		g.rect(25, 19, 1, 1, AXO_MOUTH)
		g.rect(8, 24, 4, 1, AXO_GILL[0])
		g.rect(4, 17, 3, 1, AXO_GILL[0])
		g.rect(21, 17, 3, 1, AXO_GILL[0])
		return [
			{ x: 6, y: 9, size: 7, lid: AXO[2] },
			{ x: 16, y: 9, size: 7, lid: AXO[2] },
		]
	},
}

const CREATURES = [
	frog,
	owl,
	pig,
	fox,
	ladybird,
	hedgehog,
	cat,
	octopus,
	llama,
	goat,
	axolotl,
]

/** A head's picture, in one of its blinks. */
function pictureOf(creature: Creature, state: Blink) {
	const grid = new Grid()
	const eyes = creature.draw(grid)
	neckHole(grid)
	collar(grid)
	for (const e of eyes) eye(grid, e.x, e.y, e.size, e.lid, state)
	return paintedArt(COLUMNS, ROWS, (x, y) => grid.get(x, y))
}

// ---------------------------------------------------------------------------
// The heads
// ---------------------------------------------------------------------------

export interface BombHead {
	name: string
	/** Eyes open, half shut and shut: the same size, so they swap for a blink. */
	open: string
	half: string
	shut: string
	/** Its picture's size, in px. */
	width: number
	height: number
	/** Where, in px from its top left, the wearer's head goes: the middle of its neck hole's top. */
	neck: { x: number; y: number }
	/** Where, in px from its top left, the fuse comes out of the collar on top. */
	fuse: { x: number; y: number }
	/** Its papier-mâché's colours: the scraps it bursts into. */
	scraps: string[]
}

/**
 * The eleven bomb heads, each a papier-mâché ball big enough to go over a
 * runner's head and down over their shoulders, painted as a creature, facing
 * left. Each is 34 by 30 cells (68 by 60 px) with its eyes open, half shut or
 * shut; its round body is about 26 by 24 cells, lumpy, with paper strips over
 * it, a scrap of newsprint, the metal fuse collar on top and a dark band at
 * its base where the wearer's shoulders go in.
 */
export const BOMB_HEADS: BombHead[] = CREATURES.map((c) => ({
	name: c.name,
	open: pictureOf(c, 'open'),
	half: pictureOf(c, 'half'),
	shut: pictureOf(c, 'shut'),
	width: COLUMNS * CELL,
	height: ROWS * CELL,
	neck: { x: BODY_X * CELL, y: 26 * CELL },
	fuse: { x: BODY_X * CELL, y: 1 * CELL },
	scraps: c.scraps,
}))

// ---------------------------------------------------------------------------
// The explosion
// ---------------------------------------------------------------------------

const FLASH = '#ffffff'
const FIRE_YELLOW = '#ffe45c'
const FIRE_ORANGE = '#ff9a2a'
const FIRE_RED = '#e4402a'
const FIRE_DEEP = '#a82424'
const SMOKE_DARK = 'rgba(58,56,62,0.92)'
const SMOKE = 'rgba(100,98,106,0.85)'
const SMOKE_LIGHT = 'rgba(158,156,164,0.7)'
const SMOKE_FAINT = 'rgba(190,188,196,0.45)'

/** The blast's cells are 4 px, the picture 36 cells square. */
const BLAST_CELLS = 36
const BLAST_CELL = 4
/** The blast's size, in px: each of its frames is this wide and tall. */
export const EXPLOSION_SIZE = BLAST_CELLS * BLAST_CELL

const MID = BLAST_CELLS / 2

/** A ragged fireball's reach at `angle`: spikes, and a lump or two, turned by `turn`. */
function ragged(angle: number, turn: number, spikes: number, jag: number) {
	const wave =
		Math.abs(((((angle + turn) * spikes) / (2 * Math.PI)) % 1) - 0.5) * 2
	return (
		(1 - jag + jag * wave * 1.6 + 0.09 * Math.sin(3 * angle + turn * 2)) / 1.27
	)
}

/**
 * A fireball, `radius` cells big, centred `dy` up: white-hot at its middle,
 * yellow, orange, then red at its jagged edge. `hollow` lets its middle
 * die back to dark red.
 */
function fire(radius: number, turn: number, dy = 0, hollow = 0) {
	return (x: number, y: number) => {
		const px = x - MID
		const py = y - MID + dy
		const reach = radius * ragged(Math.atan2(py, px), turn, 9, 0.3)
		const t = Math.hypot(px, py) / reach
		if (t > 1) return undefined
		if (t < hollow) return FIRE_DEEP
		const s = (t - hollow) / (1 - hollow)
		return s < 0.3
			? FLASH
			: s < 0.55
				? FIRE_YELLOW
				: s < 0.8
					? FIRE_ORANGE
					: FIRE_RED
	}
}

/** A puff of smoke: [x, y, radius, colour]. */
type Puff = [number, number, number, string]

const puffs = (list: Puff[]) => (x: number, y: number) => {
	for (const [cx, cy, r, colour] of list)
		if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) return colour
	return undefined
}

/** Whichever of these paints a cell first. */
const layers =
	(...painters: ((x: number, y: number) => string | undefined)[]) =>
	(x: number, y: number) => {
		for (const p of painters) {
			const c = p(x, y)
			if (c) return c
		}
		return undefined
	}

/** Sparks flung out of the blast, in its first frames: [x, y]. */
const sparks = (list: [number, number][]) => (x: number, y: number) =>
	list.some(([sx, sy]) => Math.abs(x - sx) < 1 && Math.abs(y - sy) < 1)
		? FIRE_YELLOW
		: undefined

/**
 * The blast Bomb Hat's head goes off in, six frames of 36 by 36 cells of 4
 * px (144 px square), the one before the next: a white-hot flash; a yellow,
 * orange and red fireball with a jagged edge, swelling; then breaking up
 * into grey and dark smoke puffs that thin out and drift up, the last
 * little more than a few faint wisps. The fire is solid, the smoke see-through.
 */
export const EXPLOSION_FRAMES: string[] = [
	// 1: the flash.
	layers(
		fire(11, 0.2),
		sparks([
			[MID - 12, MID - 3],
			[MID + 12, MID + 4],
			[MID + 3, MID - 13],
		]),
	),
	// 2: the fireball swells.
	layers(
		fire(17, 0.9),
		sparks([
			[3, 6],
			[32, 9],
			[30, 30],
			[6, 28],
			[17, 2],
		]),
	),
	// 3: at its biggest, its middle going dark, smoke coming off its top.
	layers(
		fire(17.6, 1.7, 0, 0.35),
		puffs([
			[MID - 8, MID - 13, 4, SMOKE_DARK],
			[MID + 9, MID - 12, 4.5, SMOKE_DARK],
		]),
	),
	// 4: the fire dying back, the smoke billowing.
	layers(
		fire(12, 2.4, -1, 0.5),
		puffs([
			[MID - 10, MID - 6, 7, SMOKE_DARK],
			[MID + 10, MID - 7, 7.5, SMOKE],
			[MID, MID - 14, 7, SMOKE],
			[MID - 7, MID + 8, 5.5, SMOKE_LIGHT],
			[MID + 9, MID + 8, 5, SMOKE_LIGHT],
		]),
	),
	// 5: a few embers in the smoke, which thins and rises.
	layers(
		puffs([
			[MID, MID + 1, 3.3, FIRE_RED],
			[MID - 9, MID - 9, 6.5, SMOKE],
			[MID + 9, MID - 10, 7, SMOKE],
			[MID, MID - 15, 6, SMOKE_LIGHT],
			[MID - 6, MID + 6, 5, SMOKE_LIGHT],
			[MID + 8, MID + 4, 4.5, SMOKE_LIGHT],
		]),
	),
	// 6: just thin smoke drifting up.
	puffs([
		[MID - 8, MID - 14, 5.5, SMOKE_LIGHT],
		[MID + 7, MID - 15, 5, SMOKE_FAINT],
		[MID, MID - 8, 6.5, SMOKE_FAINT],
		[MID - 3, MID + 2, 5, SMOKE_FAINT],
	]),
].map((painter) => paintedArt(BLAST_CELLS, BLAST_CELLS, painter))
