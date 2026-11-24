import {
	FLAT_LEFT,
	FLAT_RIGHT,
	FLOOR,
	LIP_LEFT,
	LIP_RIGHT,
	LIP_Y,
	RAMP_LEFT,
	rampSlope,
	rampY,
} from '../../minigames/skateRamp'
import {
	type PixelRect,
	pixelCircle,
	pixelText,
	rectsMarkup,
	svgUrl,
} from './pixelArt'

/**
 * Skate Jam's skatepark: Fryshuset's, in Johanneshov, on a summer evening.
 * Behind, the town's rooftops against a sunset, Fryshuset's brick hall,
 * birches, and Globen, the great white ball of an arena, glowing; a
 * concrete wall along the back of the park, kids sat on it watching, the
 * Scoop Bus stencilled on it and posters pasted up; the park's floor in
 * front of it, a ledge, stairs, boards, a bin; and two floodlights on tall
 * poles, on. In front, the mini ramp itself, side on: its plywood side,
 * sprayed "SCOOP BUS" on one quarter pipe and "SKATE JAM" on the other in
 * bubble letters; its grey riding surface curving up into each to a steel
 * coping, a deck behind each with a railing, and "FRYSHUSET" painted
 * along the flat.
 *
 * Both are the whole screen, 480 cells by 270, a cell 2 px, so they line
 * up with the ramp the skaters ride (`minigames/skateJam`): its curve's
 * the riding surface's top.
 */

const CELL = 2
const COLUMNS = 480
const ROWS = 270
export const SKATE_ART_WIDTH = COLUMNS * CELL
export const SKATE_ART_HEIGHT = ROWS * CELL

/** A summer evening: blue going violet overhead, warm orange low down. */
export const SKATE_SKY_TOP = '#4f5aa8'
export const SKATE_SKY_BOTTOM = '#f4a36e'
/** The park's back wall, concrete. */
export const SKATE_WALL = '#7b7883'

// --- Behind -------------------------------------------------------------------

/** The town's rooftops, far off against the sunset: paler and pinker the further. */
const TOWN_FAR = '#b48fb4'
const TOWN = '#9a7aa6'
const TOWN_WINDOW = '#ffd98a'
/** Birches, in silhouette. */
const TREE = '#6e6690'
const TREE_SHADE = '#5f5880'
/** Globen: white, lit pink by the sunset on top, its rings of panels, and its own lights coming on. */
const GLOBE = '#f4efe6'
const GLOBE_LIT = '#ffe2d6'
const GLOBE_SHADE = '#d8cfd2'
const GLOBE_RING = '#c7bcc4'
const GLOBE_LIGHT = '#fff7d6'
/** The wall: its cap, joints, and the grime along its foot. */
const WALL_CAP = '#9b98a3'
const WALL_SHADE = '#6b6873'
const WALL_JOINT = '#6f6c77'
/** Spray paint, and its outline. */
const INK = '#2b2433'
const PINK = '#ff6fae'
const PINK_LIT = '#ffb3d4'
const YELLOW = '#ffd23f'
/** The floodlights: their poles, heads, lamps, and the glow round them, which is air. */
const POLE = '#3a3c46'
const POLE_LIT = '#555867'
const LAMP = '#fff4c8'
const GLOW = 'rgba(255, 236, 170, 0.18)'
const GLOW_NEAR = 'rgba(255, 236, 170, 0.32)'

/** Where the wall's top is, in cells down the screen. */
const WALL_TOP = 118

/** Fryshuset's hall, on the skyline: old brick, lit along its top, and its tall windows lit. */
const BRICK = '#8f5a52'
const BRICK_LIT = '#a8706a'
const BRICK_SHADE = '#744741'
const HALL_WINDOW = '#ffcf86'
const HALL_FRAME = '#5e3a35'
/** Along the top of the wall: its railing. */
const TOP_RAIL = '#4a4753'
const TOP_RAIL_LIT = '#6a6775'
/** Whoever's sat on the wall, watching: skin, hair, shirts, trousers, shoes. */
const SKINS = ['#f1c9a5', '#c98e66', '#8d5a3b', '#e8b48c']
const HAIRS = ['#3b2a20', '#e8c560', '#1d1d1d', '#a0522d']
const SHIRTS = ['#e3342b', '#3fd0e0', '#ffd23f', '#7be05a']
const TROUSERS = ['#2f3a5a', '#3a3c46', '#5a4a3a', '#2b2433']
const SHOE = '#f2efe8'
/** The wall's grime along its foot, its cracks, and paste-ups on it. */
const GRIME = '#6c6974'
const CRACK = '#5f5c68'
const POSTER = '#efe6d2'
const POSTER_SHADE = '#cfc4ad'
const POSTER_RED = '#d8342c'
const POSTER_YELLOW = '#f2d25a'
/** The park's floor behind the mini ramp, and what's on it: concrete, steel, a bin, cones, boards and a bag. */
const PARK_FLOOR = '#5f5c66'
const PARK_FLOOR_LIT = '#86838e'
const CONCRETE = '#94919c'
const CONCRETE_LIT = '#b2afba'
const CONCRETE_SHADE = '#7a7783'
const EDGE = '#c9d0d8'
const HANDRAIL = '#454852'
const HANDRAIL_LIT = '#7c818e'
const BIN = '#3f5a4a'
const BIN_LIT = '#557a63'
const CONE = '#ff8a3d'
const CONE_BAND = '#f6ead0'
const BOARD_DECK = '#c98a4b'
const BOARD_GRIP = '#2b2433'
const BOARD_WHEEL = '#f2efe8'
const BAG = '#3a4f8a'
const BAG_LIT = '#5b72b0'
/** The bus stencilled on the wall: black, a grey second layer, and one thing in red. */
const STENCIL = '#1d1d1f'
const STENCIL_GREY = '#4b4a52'
const STENCIL_RED = '#d8342c'

/** Where the park's floor is, behind the mini ramp: the foot of the wall, and the ground under everything on it. */
const WALL_FOOT = 238
const PARK_GROUND = 246

/** Graffiti: each colour's lit top, and its 3D edge; the glow sprayed round a piece; and a shine on it. */
const YELLOW_LIT = '#fff0a0'
const YELLOW_DEPTH = '#a86a1c'
const PINK_DEPTH = '#8a2c5e'
const CYAN = '#3fd0e0'
const CYAN_LIT = '#a8f0f6'
const CYAN_DEPTH = '#1d6d84'
const GREEN = '#7be05a'
const GREEN_LIT = '#c4f5a8'
const GREEN_DEPTH = '#3c7a2c'
const AURA = '#f6ead0'
const SHINE = '#ffffff'

/**
 * Bubble letters, drawn by hand for the ramps' graffiti, 9 cells by 10:
 * fat, round-shouldered, `#` painted. Only the letters sprayed.
 */
const BUBBLES: Record<string, string[]> = {
	S: [
		'..#####..',
		'.#######.',
		'###...###',
		'####.....',
		'.#######.',
		'..#######',
		'.....####',
		'###...###',
		'.#######.',
		'..#####..',
	],
	C: [
		'..#####..',
		'.#######.',
		'###...###',
		'###......',
		'###......',
		'###......',
		'###......',
		'###...###',
		'.#######.',
		'..#####..',
	],
	O: [
		'..#####..',
		'.#######.',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'.#######.',
		'..#####..',
	],
	P: [
		'#######..',
		'########.',
		'###...###',
		'###...###',
		'########.',
		'#######..',
		'###......',
		'###......',
		'###......',
		'.#.......',
	],
	B: [
		'#######..',
		'########.',
		'###...###',
		'###..###.',
		'#######..',
		'###..###.',
		'###...###',
		'###...###',
		'########.',
		'#######..',
	],
	U: [
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'.#######.',
		'..#####..',
	],
	K: [
		'###...###',
		'###..###.',
		'###.###..',
		'######...',
		'#####....',
		'######...',
		'###.###..',
		'###..###.',
		'###...###',
		'.#.....#.',
	],
	A: [
		'..#####..',
		'.#######.',
		'###...###',
		'###...###',
		'#########',
		'#########',
		'###...###',
		'###...###',
		'###...###',
		'.#.....#.',
	],
	T: [
		'#########',
		'#########',
		'...###...',
		'...###...',
		'...###...',
		'...###...',
		'...###...',
		'...###...',
		'...###...',
		'....#....',
	],
	E: [
		'#########',
		'#########',
		'###......',
		'###......',
		'#######..',
		'#######..',
		'###......',
		'###......',
		'#########',
		'#########',
	],
	J: [
		'....#####',
		'....#####',
		'......###',
		'......###',
		'......###',
		'......###',
		'###...###',
		'###...###',
		'.#######.',
		'..#####..',
	],
	M: [
		'###...###',
		'####.####',
		'#########',
		'###.#.###',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'###...###',
		'.#.....#.',
	],
}
/** How far each letter tucks in under the one before. */
const BUBBLE_TUCK = 1
/** How wide `word` is, in bubble letters. */
const bubbleWidth = (word: string) =>
	[...word].reduce(
		(w, c) => w + (BUBBLES[c]?.[0].length ?? 0) - BUBBLE_TUCK,
		BUBBLE_TUCK,
	)

/** A set of cells, "x,y", as rects of `fill`: runs along each row, as one rect each. */
function cellRects(cells: Set<string>, fill: string): PixelRect[] {
	const rows = new Map<number, number[]>()
	for (const key of cells) {
		const [x, y] = key.split(',').map(Number)
		const row = rows.get(y) ?? []
		row.push(x)
		rows.set(y, row)
	}
	const out: PixelRect[] = []
	for (const [y, xs] of rows) {
		xs.sort((a, b) => a - b)
		let from = xs[0]
		for (let i = 1; i <= xs.length; i++)
			if (i === xs.length || xs[i] !== xs[i - 1] + 1) {
				out.push([from, y, xs[i - 1] - from + 1, 1, fill])
				from = xs[i]
			}
	}
	return out
}

/** `cells` grown by `by` all round, its corners rounded off. */
function grown(cells: Set<string>, by: number) {
	const out = new Set<string>()
	for (const key of cells) {
		const [x, y] = key.split(',').map(Number)
		for (let dy = -by; dy <= by; dy++)
			for (let dx = -by; dx <= by; dx++)
				if (by < 2 || Math.abs(dx) + Math.abs(dy) <= by + 1)
					out.add(`${x + dx},${y + dy}`)
	}
	return out
}

/**
 * `word` sprayed as a graffiti piece in the bubble letters, its top left
 * at `x`, `y` (in cells): each letter bouncing up or down a little and
 * tucked under the one before, its own ink outline over the last; the
 * whole piece a 3D edge down and to the right, outlined, and a cream glow
 * sprayed round it all; every letter lit along its top edges, a shine on
 * it, and paint run down off every other one.
 */
function bubblePiece(
	word: string,
	x: number,
	y: number,
	colours: { fill: string; lit: string; depth: string },
): PixelRect[] {
	const bounce = [0, -1, 1, 0, -1, 1]
	let lx = x
	const letters = [...word].map((char, i) => {
		const mask = BUBBLES[char] ?? []
		const cells = new Set<string>()
		const ly = y + bounce[i % bounce.length]
		mask.forEach((row, ry) => {
			for (let rx = 0; rx < row.length; rx++)
				if (row[rx] === '#') cells.add(`${lx + rx},${ly + ry}`)
		})
		const letter = {
			cells,
			x: lx,
			y: ly,
			wide: mask[0]?.length ?? 0,
			tall: mask.length,
		}
		lx += letter.wide - BUBBLE_TUCK
		return letter
	})
	const all = new Set(letters.flatMap((l) => [...l.cells]))
	// Its 3D edge, down and to the right.
	const depth = new Set<string>()
	for (const key of all) {
		const [cx, cy] = key.split(',').map(Number)
		for (const d of [1, 2]) depth.add(`${cx + d},${cy + d}`)
	}
	const body = new Set([...all, ...depth])
	const out: PixelRect[] = [
		...cellRects(grown(body, 2), AURA),
		...cellRects(grown(body, 1), INK),
		...cellRects(depth, colours.depth),
	]
	letters.forEach((letter, i) => {
		out.push(...cellRects(grown(letter.cells, 1), INK))
		out.push(...cellRects(letter.cells, colours.fill))
		// Lit along its top edges.
		const lit = new Set(
			[...letter.cells].filter((key) => {
				const [cx, cy] = key.split(',').map(Number)
				return !letter.cells.has(`${cx},${cy - 1}`)
			}),
		)
		out.push(...cellRects(lit, colours.lit))
		// A shine, up on its left.
		if (letter.cells.has(`${letter.x + 1},${letter.y + 2}`))
			out.push([letter.x + 1, letter.y + 2, 1, 2, SHINE])
		else if (letter.cells.has(`${letter.x},${letter.y + 2}`))
			out.push([letter.x, letter.y + 2, 1, 2, SHINE])
		// Paint run down off every other letter.
		if (i % 2 === 0) {
			const dx = letter.x + Math.floor(letter.wide / 2) - 1 + (i % 3)
			let bottom = letter.y
			for (const key of letter.cells) {
				const [cx, cy] = key.split(',').map(Number)
				if (cx === dx) bottom = Math.max(bottom, cy)
			}
			out.push([dx, bottom + 1, 1, 2 + (i % 3), colours.fill])
		}
	})
	return out
}

/**
 * Someone sat on the wall top, watching, `x` across, the `look`th of the
 * colours: hair and face over a shirt, sat on the wall's cap, legs dangling
 * down its face, white shoes; holding up a board, if `board`.
 */
function paintWatcher(r: PixelRect[], x: number, look: number, board: boolean) {
	const at = (list: readonly string[]) => list[look % list.length]
	const seat = WALL_TOP
	// Hair, and face.
	r.push([x + 1, seat - 12, 5, 2, at(HAIRS)])
	r.push([x + 1, seat - 10, 5, 4, at(SKINS)])
	r.push([x + 1, seat - 10, 1, 2, at(HAIRS)])
	// Shirt and arms, and hands on the cap.
	r.push([x, seat - 6, 7, 6, at(SHIRTS)])
	r.push([x - 1, seat - 2, 1, 2, at(SKINS)])
	r.push([x + 7, seat - 2, 1, 2, at(SKINS)])
	// Lap, and legs down the wall, shoes.
	r.push([x, seat, 7, 2, at(TROUSERS)])
	r.push([x + 1, seat + 2, 2, 5, at(TROUSERS)])
	r.push([x + 4, seat + 2, 2, 5, at(TROUSERS)])
	r.push([x + 1, seat + 7, 2, 1, SHOE])
	r.push([x + 4, seat + 7, 2, 1, SHOE])
	if (!board) return
	// A board held up, deck out, wheels to the wall.
	r.push([x + 8, seat - 16, 3, 16, BOARD_DECK])
	r.push([x + 8, seat - 16, 3, 1, BOARD_GRIP])
	r.push([x + 11, seat - 13, 1, 2, BOARD_WHEEL])
	r.push([x + 11, seat - 4, 1, 2, BOARD_WHEEL])
}

/**
 * The Scoop Bus, stencilled on the wall the way a street artist would: in
 * flat black, sprayed through a cut card, its windows and hubs cut out (the
 * wall showing through them, the windscreen held by a bridge of card), a
 * grey second layer along its side, and one thing in red, its scoop out in
 * front; paint dripping off it and a little overspray. Ahead of it, just
 * out of reach, a runner, stencilled too, running for it. Its top left at
 * `x`, `y`, heading right.
 */
function paintStencilBus(r: PixelRect[], x: number, y: number) {
	const w = 56
	const h = 20
	// Its body, corners rounded off, and its grey side panel.
	r.push([x + 1, y, w - 3, h, STENCIL])
	r.push([x, y + 1, w, h - 2, STENCIL])
	r.push([x + 2, y + 11, w - 10, 3, STENCIL_GREY])
	// Windows, cut out, and the windscreen, cut in two halves round a bridge.
	for (let wx = x + 4; wx < x + w - 14; wx += 8)
		r.push([wx, y + 3, 6, 5, SKATE_WALL])
	r.push([x + w - 9, y + 3, 3, 7, SKATE_WALL])
	r.push([x + w - 5, y + 3, 3, 7, SKATE_WALL])
	// Wheels, their hubs cut out.
	for (const wx of [x + 7, x + w - 17]) {
		r.push([wx, y + h - 2, 9, 5, STENCIL])
		r.push([wx + 1, y + h - 3, 7, 7, STENCIL])
		r.push([wx + 3, y + h, 3, 2, SKATE_WALL])
	}
	// Its scoop, out in front: the one thing in red.
	r.push([x + w, y + h - 6, 3, 2, STENCIL_RED])
	r.push([x + w + 2, y + h - 5, 6, 3, STENCIL_RED])
	r.push([x + w + 7, y + h - 8, 2, 4, STENCIL_RED])
	// Drips, run down off it, and a little overspray round it.
	for (const [dx, long] of [
		[5, 5],
		[19, 3],
		[31, 7],
		[44, 4],
	])
		r.push([x + dx, y + h + (dx % 2 ? 3 : 2), 1, long, STENCIL])
	for (const [dx, dy] of [
		[-2, 4],
		[-3, 12],
		[12, -2],
		[27, -3],
		[40, -2],
		[w + 1, 3],
		[-2, 17],
	])
		r.push([x + dx, y + dy, 1, 1, STENCIL])
	// The runner, ahead of it, mid-stride, arms pumping.
	const rx = x + w + 14
	const ry = y + 1
	r.push([rx + 3, ry, 3, 3, STENCIL])
	r.push([rx + 2, ry + 3, 3, 7, STENCIL])
	r.push([rx + 5, ry + 4, 3, 1, STENCIL])
	r.push([rx + 7, ry + 2, 1, 2, STENCIL])
	r.push([rx - 1, ry + 5, 3, 1, STENCIL])
	r.push([rx - 2, ry + 6, 1, 2, STENCIL])
	r.push([rx + 4, ry + 10, 2, 2, STENCIL])
	r.push([rx + 6, ry + 12, 2, 4, STENCIL])
	r.push([rx + 7, ry + 16, 2, 1, STENCIL])
	r.push([rx + 1, ry + 10, 2, 3, STENCIL])
	r.push([rx - 1, ry + 13, 2, 2, STENCIL])
	r.push([rx - 3, ry + 14, 2, 1, STENCIL])
	r.push([rx + 2, ry + 18, 1, 3, STENCIL])
}

function behind(): string {
	const r: PixelRect[] = []
	/** Lettering, over the rects. */
	const markup: string[] = []
	/** The floodlights' glow, over the rest. */
	const glow: string[] = []
	// The town, far off: two rows of rooftops, a window lit here and there.
	const far = [
		[0, 104, 34],
		[34, 98, 22],
		[56, 106, 40],
		[96, 92, 18],
		[114, 102, 30],
		[144, 96, 26],
		[170, 108, 44],
		[214, 100, 24],
		[238, 104, 28],
		[266, 94, 20],
		[286, 106, 46],
		[332, 98, 30],
		[362, 104, 24],
		[386, 90, 16],
		[402, 100, 36],
		[438, 106, 42],
	]
	for (const [x, top, w] of far) r.push([x, top, w, WALL_TOP - top, TOWN_FAR])
	const near = [
		[10, 110, 26],
		[60, 106, 30],
		[118, 112, 34],
		[196, 108, 22],
		[330, 110, 28],
		[392, 106, 34],
		[446, 112, 30],
	]
	for (const [x, top, w] of near) {
		r.push([x, top, w, WALL_TOP - top, TOWN])
		for (let wx = x + 3; wx < x + w - 2; wx += 5)
			if ((wx * 7 + top) % 3 === 0) r.push([wx, top + 3, 2, 2, TOWN_WINDOW])
	}
	// Globen: a great white ball, sat behind the rooftops, its top lit by
	// the sunset, rings of panels round it, a light or two on.
	const gx = 316
	const gy = 132
	const gr = 44
	for (let y = gy - gr; y < WALL_TOP; y++) {
		const half = Math.floor(
			Math.sqrt(Math.max(0, gr * gr - (y + 0.5 - gy) ** 2)),
		)
		if (half <= 0) continue
		const up = (gy - y) / gr
		r.push([gx - half, y, half * 2, 1, up > 0.82 ? GLOBE_LIT : GLOBE])
		// Its far side, in shade.
		const shade = Math.max(2, Math.round(half * 0.28))
		r.push([gx + half - shade, y, shade, 1, GLOBE_SHADE])
	}
	for (const ring of [0.25, 0.5, 0.72]) {
		const y = Math.round(gy - gr * ring)
		const half = Math.floor(Math.sqrt(gr * gr - (y + 0.5 - gy) ** 2))
		r.push([gx - half + 1, y, half * 2 - 2, 1, GLOBE_RING])
	}
	for (const [lx, ly] of [
		[gx - 20, gy - 24],
		[gx + 6, gy - 36],
		[gx + 26, gy - 18],
	])
		r.push([lx, ly, 2, 1, GLOBE_LIGHT])
	// Fryshuset's hall, on the skyline on the left: an old brick block,
	// lit along its roof line, a row of tall windows lit in it.
	r.push([0, 74, 84, WALL_TOP - 74, BRICK])
	r.push([0, 74, 84, 2, BRICK_LIT])
	r.push([70, 76, 14, WALL_TOP - 76, BRICK_SHADE])
	r.push([0, 64, 26, 10, BRICK])
	r.push([0, 64, 26, 1, BRICK_LIT])
	for (let wx = 6; wx < 66; wx += 10) {
		r.push([wx - 1, 83, 6, 22, HALL_FRAME])
		r.push([wx, 85, 4, 19, HALL_WINDOW])
		r.push([wx + 1, 84, 2, 1, HALL_WINDOW])
		r.push([wx, 94, 4, 1, HALL_FRAME])
	}
	// Birches, in front of the rooftops: trunks, and their crowns, round.
	for (const [tx, tall, wide] of [
		[42, 34, 14],
		[92, 26, 11],
		[214, 30, 13],
		[372, 36, 15],
		[426, 24, 10],
	]) {
		const top = WALL_TOP - tall
		r.push([tx, top + Math.round(tall * 0.5), 2, tall, TREE_SHADE])
		for (let y = 0; y < tall * 0.7; y++) {
			const t = y / (tall * 0.7)
			const half = Math.round(
				wide * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.1)) * 0.5,
			)
			r.push([
				tx + 1 - half,
				top + y,
				half * 2,
				1,
				y > tall * 0.45 ? TREE_SHADE : TREE,
			])
		}
	}
	// The wall along the back of the park: its cap, joints, and grime.
	r.push([0, WALL_TOP, COLUMNS, ROWS - WALL_TOP, SKATE_WALL])
	r.push([0, WALL_TOP, COLUMNS, 2, WALL_CAP])
	r.push([0, WALL_TOP + 2, COLUMNS, 1, WALL_SHADE])
	for (let x = 34; x < COLUMNS; x += 64)
		r.push([x, WALL_TOP + 3, 1, ROWS, WALL_JOINT])
	// Grime along the wall's foot, and a crack or two up it.
	r.push([0, WALL_FOOT - 12, COLUMNS, 12, GRIME])
	for (let x = 6; x < COLUMNS; x += 37) r.push([x, WALL_FOOT - 16, 3, 4, GRIME])
	for (const [cx, cy, steps] of [
		[118, 130, 9],
		[262, 170, 7],
		[392, 136, 8],
	])
		for (let i = 0; i < steps; i++)
			r.push([
				cx + (i % 3 === 2 ? 1 : 0) + Math.floor(i / 3),
				cy + i * 2,
				1,
				2,
				CRACK,
			])
	// The Scoop Bus, stencilled on it, after a runner.
	paintStencilBus(r, 290, 150)
	// Paste-ups, a little peeled: a gig poster and a flyer.
	r.push([148, 192, 13, 18, POSTER])
	r.push([148, 192, 13, 4, POSTER_RED])
	for (let y = 199; y < 208; y += 3) r.push([150, y, 9, 1, POSTER_SHADE])
	r.push([159, 208, 2, 2, SKATE_WALL])
	r.push([158, 207, 2, 1, POSTER_SHADE])
	r.push([164, 196, 11, 14, POSTER_YELLOW])
	for (let y = 199; y < 208; y += 3) r.push([166, y, 7, 1, POSTER_SHADE])
	// The park's floor, behind the mini ramp, and what's on it.
	r.push([0, WALL_FOOT, COLUMNS, ROWS - WALL_FOOT, PARK_FLOOR])
	r.push([0, WALL_FOOT, COLUMNS, 1, PARK_FLOOR_LIT])
	// A concrete ledge, its top edged in steel.
	r.push([152, 228, 44, PARK_GROUND - 228, CONCRETE])
	r.push([152, 228, 44, 2, CONCRETE_LIT])
	r.push([152, 228, 44, 1, EDGE])
	r.push([190, 230, 6, PARK_GROUND - 230, CONCRETE_SHADE])
	// A stair set, four steps down to the right, its handrail along it.
	for (let i = 0; i < 4; i++) {
		const sx = 288 + i * 8
		const sy = 224 + i * 4
		r.push([sx, sy, 8, PARK_GROUND - sy, CONCRETE])
		r.push([sx, sy, 8, 1, CONCRETE_LIT])
		r.push([sx + 6, sy + 1, 2, PARK_GROUND - sy - 1, CONCRETE_SHADE])
	}
	for (const px of [290, 318])
		r.push([px, 214 + (px - 290) / 2, 2, 12, HANDRAIL])
	for (let i = 0; i < 30; i++)
		r.push([
			290 + i,
			213 + Math.floor(i / 2),
			1,
			1,
			i % 2 ? HANDRAIL : HANDRAIL_LIT,
		])
	// Boards leant on the wall by the ledge, and a bag dropped by them.
	for (const [bx, deck] of [
		[138, BOARD_DECK],
		[143, BOARD_GRIP],
	] as const) {
		r.push([bx, 222, 3, 18, deck])
		r.push([bx, 222, 3, 1, BOARD_GRIP])
		r.push([bx - 1, 225, 1, 2, BOARD_WHEEL])
		r.push([bx - 1, 235, 1, 2, BOARD_WHEEL])
	}
	r.push([128, 234, 9, 8, BAG])
	r.push([129, 233, 7, 2, BAG_LIT])
	r.push([131, 236, 3, 3, BAG_LIT])
	// A bin, and cones, out of the way.
	r.push([346, 226, 9, 16, BIN])
	r.push([345, 225, 11, 2, BIN_LIT])
	r.push([347, 229, 1, 11, BIN_LIT])
	for (const cx of [364, 372]) {
		r.push([cx + 2, 232, 2, 2, CONE])
		r.push([cx + 1, 234, 4, 2, CONE_BAND])
		r.push([cx + 1, 236, 4, 3, CONE])
		r.push([cx, 239, 6, 2, CONE])
	}
	// A railing along the top of the wall, and some of the club sat on it,
	// watching, legs dangling.
	r.push([0, 104, COLUMNS, 2, TOP_RAIL])
	r.push([0, 104, COLUMNS, 1, TOP_RAIL_LIT])
	r.push([0, 111, COLUMNS, 1, TOP_RAIL])
	for (let x = 4; x < COLUMNS; x += 30)
		r.push([x, 104, 2, WALL_TOP - 104, TOP_RAIL])
	;[138, 156, 262, 384].forEach((x, i) => paintWatcher(r, x, i, i === 2))
	// Two floodlights on tall poles behind the decks, on: a glow round each.
	for (const px of [16, COLUMNS - 18]) {
		const top = 22
		glow.push(pixelCircle(px + 1, top + 2, 15, GLOW, 1))
		glow.push(pixelCircle(px + 1, top + 2, 9, GLOW_NEAR, 1))
		r.push([px, top + 4, 2, LIP_Y / CELL - top, POLE])
		r.push([px, top + 4, 1, LIP_Y / CELL - top, POLE_LIT])
		r.push([px - 6, top - 2, 14, 6, POLE])
		r.push([px - 5, top + 2, 12, 2, LAMP])
		r.push([px - 6, top - 2, 14, 1, POLE_LIT])
	}
	return rectsMarkup(r) + glow.join('') + markup.join('')
}

/** Everything behind the ramp, the whole screen of it, as an image's URL. */
export const SKATE_BEHIND = svgUrl(COLUMNS, ROWS, behind())

// --- The ramp -------------------------------------------------------------------

/** Its plywood side: the wood, lit and shaded; the seams between its sheets, and their screws. */
const PLY = '#c99456'
const PLY_LIT = '#dcab6f'
const PLY_SHADE = '#a8743f'
const PLY_SEAM = '#8f6233'
/** Its riding surface: dark grey, lit along its top. */
const SURFACE = '#45474f'
const SURFACE_LIT = '#6b6e78'
/** The steel coping at each lip. */
const STEEL = '#c9d0d8'
const STEEL_LIT = '#f2f5f8'
const STEEL_SHADE = '#7f8894'
/** The railings on the decks. */
const RAIL_DARK = '#2f3138'
const RAIL_LIT = '#5a5e6c'
/** The painted lettering on the flat's side. */
const PAINT = '#f6ead0'
const PAINT_SHADE = '#7a4d22'
/** The tarmac it stands on. */
const TARMAC = '#5c5960'

/** The ramp's surface at a column of cells: how far down, in cells. */
const surfaceAt = (column: number) =>
	rampY(RAMP_LEFT + column * CELL + CELL / 2) / CELL

function ramp(): string {
	const r: PixelRect[] = []
	const lipL = (LIP_LEFT - RAMP_LEFT) / CELL
	const lipR = (LIP_RIGHT - RAMP_LEFT) / CELL
	const floor = FLOOR / CELL
	for (let c = 0; c < COLUMNS; c++) {
		const top = Math.round(surfaceAt(c))
		const slope = Math.abs(rampSlope(RAMP_LEFT + c * CELL + CELL / 2))
		// As thick, square on to it, however steep: deeper down a column.
		const band = Math.max(3, Math.round(3 * Math.sqrt(1 + slope * slope)))
		r.push([c, top + band, 1, ROWS - top - band, PLY])
		// Lit just under the surface, along its top edge.
		r.push([c, top + band, 1, 2, PLY_LIT])
		r.push([c, top, 1, band, SURFACE])
		r.push([c, top, 1, 1, SURFACE_LIT])
	}
	// The seams between its sheets, and their screws; shade along its foot.
	for (let c = 20; c < COLUMNS; c += 48) {
		const top = Math.round(surfaceAt(c)) + 6
		r.push([c, top, 1, ROWS - top, PLY_SEAM])
		for (let y = top + 4; y < ROWS - 6; y += 14) {
			r.push([c - 3, y, 1, 1, PLY_SEAM])
			r.push([c + 3, y, 1, 1, PLY_SEAM])
		}
	}
	r.push([0, floor + 12, COLUMNS, 1, PLY_SEAM])
	r.push([0, ROWS - 7, COLUMNS, 3, PLY_SHADE])
	r.push([0, ROWS - 4, COLUMNS, 4, TARMAC])
	// Under each deck, its frame: a post and a brace, in the shade.
	for (const x of [lipL - 4, lipR + 3]) {
		r.push([x, LIP_Y / CELL + 4, 2, ROWS - LIP_Y / CELL - 8, PLY_SHADE])
	}
	// Railings along the back of each deck.
	for (const [from, to] of [
		[2, lipL - 6],
		[lipR + 6, COLUMNS - 2],
	]) {
		const y = LIP_Y / CELL - 20
		r.push([from, y, to - from, 2, RAIL_DARK])
		r.push([from, y, to - from, 1, RAIL_LIT])
		for (const x of [from, to - 2, Math.round((from + to) / 2)])
			r.push([x, y, 2, 20, RAIL_DARK])
	}
	// The coping: a steel pipe along each lip, lit on top.
	for (const x of [lipL, lipR]) {
		const y = LIP_Y / CELL
		r.push([x - 3, y - 2, 6, 5, STEEL])
		r.push([x - 2, y - 3, 4, 1, STEEL])
		r.push([x - 2, y + 3, 4, 1, STEEL_SHADE])
		r.push([x - 3, y + 1, 6, 2, STEEL_SHADE])
		r.push([x - 2, y - 2, 3, 1, STEEL_LIT])
	}
	// "FRYSHUSET" painted along the flat's side, a shadow under it.
	const text = 'FRYSHUSET'
	const width = (text.length * 6 - 1) * 2
	const tx = Math.round(
		((FLAT_LEFT + FLAT_RIGHT) / 2 - RAMP_LEFT) / CELL - width / 2,
	)
	const ty = floor + 3
	const extra =
		pixelText(text, tx + 1, ty + 1, 2, PAINT_SHADE) +
		pixelText(text, tx, ty, 2, PAINT)
	// "SCOOP BUS SKATE JAM" sprayed on the quarter pipes' sides in bubble
	// letters, two words on each, under its deck and the top of its curve,
	// clear of the riding surface: SCOOP over BUS on the left, SKATE over
	// JAM on the right.
	const pink = { fill: PINK, lit: PINK_LIT, depth: PINK_DEPTH }
	const yellow = { fill: YELLOW, lit: YELLOW_LIT, depth: YELLOW_DEPTH }
	const cyan = { fill: CYAN, lit: CYAN_LIT, depth: CYAN_DEPTH }
	const green = { fill: GREEN, lit: GREEN_LIT, depth: GREEN_DEPTH }
	const top = floor - 34
	const under = floor - 16
	const sprayed = rectsMarkup([
		...bubblePiece('SCOOP', 6, top, pink),
		...bubblePiece('BUS', 12, under, yellow),
		...bubblePiece('SKATE', COLUMNS - 6 - bubbleWidth('SKATE'), top, cyan),
		...bubblePiece('JAM', COLUMNS - 12 - bubbleWidth('JAM'), under, green),
	])
	return rectsMarkup(r) + extra + sprayed
}

/** The ramp, the whole screen of it, as an image's URL. */
export const SKATE_RAMP = svgUrl(COLUMNS, ROWS, ramp())

// --- The rail ---------------------------------------------------------------------

/** The grind rail, jam red, on two posts: a cell either side its length. */
export const RAIL_RED = '#d8342c'
export const RAIL_RED_LIT = '#f47a70'
export const RAIL_RED_SHADE = '#9c1f1a'
export const RAIL_POST = '#3a3c44'
