import {
	type PixelRect,
	pixelArt,
	pixelText,
	pixelTextWidth,
	rectsMarkup,
	svgUrl,
} from './pixelArt'

/**
 * Midnattsloppet's way up to Sofiakyrkan: the old wooden houses of Vita
 * bergen, the way into Vitabergsparken, marschaller (outdoor candles)
 * lining the steep path up through it, Sofiakyrkan at the top, and its
 * choir out on the steps, singing. Each a cell a pixel, drawn at 2.
 *
 * It's midnight: everything's dark and greyed but what's alight, the
 * flames and the lit windows, each with a faint glow round it.
 */

/** Light from a window or a flame: warm, and its glow, a haze round it. */
const WARM = '#e8b25e'
const WARM_LIT = '#ffdc94'
const WARM_SHADE = '#a8702e'
const GLOW = '#ffc46e1c'
const FLAME = '#ffa82a'
const FLAME_TIP = '#ff8a1e'
const FLAME_CORE = '#fff1a8'
const INK = '#1d1d1d'

/**
 * A glow round something `w` by `h` lit: two boxes, crossed, a step out
 * round it, so its corners are rounded off and its middle's warmer.
 */
const glow = (
	x: number,
	y: number,
	w: number,
	h: number,
	by = 2,
): PixelRect[] => [
	[x - by, y - by + 1, w + 2 * by, h + 2 * by - 2, GLOW],
	[x - by + 1, y - by, w + 2 * by - 2, h + 2 * by, GLOW],
]

/** An arch, `w` wide, `h` tall to its top: its top two rows stepped in. */
const arch = (
	x: number,
	y: number,
	w: number,
	h: number,
	fill: string,
): PixelRect[] => [
	[x + 2, y, w - 4, 1, fill],
	[x + 1, y + 1, w - 2, 1, fill],
	[x, y + 2, w, h - 2, fill],
]

/* -------------------------------------------------------------------------- */
/* The wooden houses                                                           */
/* -------------------------------------------------------------------------- */

/** Their walls, boarded: falu red, and ochre, by night. Base, lit, shade. */
const FALU: [string, string, string] = ['#5c2a25', '#70362f', '#45201c']
const OCHRE: [string, string, string] = ['#76603a', '#8b7346', '#5a4a2c']
/** White paint, the corner boards and window frames, gone grey-blue in the dark. */
const TRIM = '#a3a6b2'
const TRIM_LIT = '#bec1cb'
const TRIM_SHADE = '#7c7f8c'
/** Their roofs' tiles, and their stone footings. */
const TILE = '#4b2b27'
const TILE_LIT = '#673c35'
const TILE_SHADE = '#381f1c'
const FOOTING = '#3c3b44'
const FOOTING_LIT = '#4f4e58'
/** A dark window's glass, a pane catching the street lamps. */
const PANE = '#1c2033'
const PANE_LIT = '#34405c'
const DOOR = '#2c221f'
const CHIMNEY = '#4a3c39'
const CHIMNEY_LIT = '#5f4f4b'

/**
 * A window, 7 by 9: a white frame round four panes, a bar across, a sill
 * under it; lit from inside, warm and glowing, or dark.
 */
const houseWindow = (x: number, y: number, lit: boolean): PixelRect[] => [
	...(lit ? glow(x, y, 7, 9) : []),
	[x, y, 7, 9, TRIM],
	[x, y, 7, 1, TRIM_LIT],
	...[
		[x + 1, y + 1],
		[x + 4, y + 1],
		[x + 1, y + 5],
		[x + 4, y + 5],
	].map(([px, py]): PixelRect => [px, py, 2, 3, lit ? WARM : PANE]),
	lit ? [x + 1, y + 1, 2, 1, WARM_LIT] : [x + 1, y + 1, 1, 1, PANE_LIT],
	lit ? [x + 4, y + 1, 2, 1, WARM_LIT] : [x + 4, y + 5, 1, 1, PANE_LIT],
	[x - 1, y + 9, 9, 1, TRIM_SHADE],
]

/**
 * A house's boarded wall, `x` to `x + w`, `top` to `bottom`: its boards'
 * seams, its corner boards white, the far one in shade, and a shadow
 * under its eaves.
 */
const boardedWall = (
	x: number,
	top: number,
	w: number,
	bottom: number,
	[wall, , shade]: [string, string, string],
): PixelRect[] => {
	const r: PixelRect[] = [[x, top, w, bottom - top, wall]]
	for (let bx = x + 5; bx < x + w - 3; bx += 4)
		r.push([bx, top + 1, 1, bottom - top - 1, shade])
	r.push([x, top, w, 1, shade])
	r.push([x, top, 2, bottom - top, TRIM])
	r.push([x, top, 1, bottom - top, TRIM_LIT])
	r.push([x + w - 2, top, 2, bottom - top, TRIM_SHADE])
	return r
}

/** A roof, tiled, `x` to `x + w` along its eaves at `bottom`, its ridge at `top`, its ends hipped in `hip` a row. */
const tiledRoof = (
	x: number,
	w: number,
	top: number,
	bottom: number,
	hip: number,
): PixelRect[] => {
	const r: PixelRect[] = []
	for (let y = top; y < bottom; y++) {
		const inset = Math.round((bottom - 1 - y) * hip)
		const fill =
			y === top ? TILE_LIT : (bottom - y) % 3 === 0 ? TILE_SHADE : TILE
		r.push([x + inset, y, w - 2 * inset, 1, fill])
		// Its hipped ends' edges, lit along the left, as tops are.
		if (y > top) r.push([x + inset, y, 1, 1, TILE_LIT])
	}
	r.push([x, bottom - 1, w, 1, TILE_SHADE])
	return r
}

/** A chimney, 5 wide, up off a roof from `y` to `bottom`. */
const chimney = (x: number, y: number, bottom: number): PixelRect[] => [
	[x, y, 5, bottom - y, CHIMNEY],
	[x - 1, y, 7, 2, CHIMNEY_LIT],
	[x + 4, y + 2, 1, bottom - y - 2, TILE_SHADE],
]

/** A door, `x` along, 8 wide, up from `bottom` to `y`, in a white frame, a step before it. */
const houseDoor = (x: number, y: number, bottom: number): PixelRect[] => [
	[x - 1, y - 1, 10, bottom - y + 1, TRIM],
	[x - 1, y - 1, 10, 1, TRIM_LIT],
	[x, y, 8, bottom - y, DOOR],
	[x + 4, y, 1, bottom - y, '#221a18'],
	[x + 6, y + 8, 1, 1, TRIM_SHADE],
]

/** A footing of stone along the bottom, `x` to `x + w`, `top` down to `h`. */
const footing = (x: number, w: number, top: number, h: number): PixelRect[] => [
	[x, top, w, h - top, FOOTING],
	[x, top, w, 1, FOOTING_LIT],
]

/**
 * A cottage long side on to the street: falu red boards under a hipped
 * tiled roof, a chimney, a door, a lit window and a dark one. 56 by 46.
 */
const houseA = (() => {
	const W = 56
	const H = 46
	return pixelArt(W, H, [
		...chimney(38, 0, 10),
		...tiledRoof(0, W, 4, 21, 0.35),
		...boardedWall(2, 21, W - 4, 42, FALU),
		...houseWindow(9, 26, true),
		...houseDoor(25, 27, 42),
		...houseWindow(40, 26, false),
		...footing(1, W - 2, 42, H),
	])
})()

/**
 * A cottage gable end on to the street, ochre: its gable's boards up into
 * the roof's point, a little window lit in the loft, two below, one lit.
 * 64 by 50.
 */
const houseB = (() => {
	const W = 64
	const H = 50
	const mid = W / 2
	const eaves = 28
	const peak = 4
	const [wall, lit, shade] = OCHRE
	const r: PixelRect[] = []
	// The roof's two slopes, over the gable, tiles along their edges.
	for (let y = peak; y < eaves; y++) {
		const out = Math.round((y - peak + 1) * 1.3)
		const inside = out - 3
		r.push([mid - out, y, out * 2, 1, TILE])
		r.push([mid - out, y, 2, 1, TILE_LIT])
		r.push([mid + out - 2, y, 2, 1, TILE_LIT])
		if (inside > 0) {
			// Its bargeboards, white, under the tiles, and the gable's wall.
			r.push([mid - inside - 1, y, inside * 2 + 2, 1, TRIM_SHADE])
			r.push([mid - inside, y, inside * 2, 1, wall])
		}
	}
	// The gable's boards, on up into its point.
	for (let bx = mid - 26; bx < mid + 26; bx += 4) {
		const top = peak + 3 + Math.ceil(Math.abs(bx + 0.5 - mid) / 1.3)
		if (top < eaves) r.push([bx, top, 1, eaves - top, shade])
	}
	r.push(...houseWindow(mid - 3, 14, true))
	// A board across under the gable, and the walls under it.
	r.push(...boardedWall(4, eaves, W - 8, 46, OCHRE))
	r.push([4, eaves, W - 8, 1, lit])
	r.push(...houseWindow(14, 33, true))
	r.push(...houseWindow(43, 33, false))
	r.push(...footing(3, W - 6, 46, H))
	return pixelArt(W, H, r)
})()

/**
 * A little cottage under a broken roof, the old Swedish kind, steep then
 * shallow: falu red, its door by the street with a lantern lit beside it,
 * and one window lit. 48 by 44.
 */
const houseC = (() => {
	const W = 48
	const H = 44
	return pixelArt(W, H, [
		...chimney(32, 2, 12),
		...tiledRoof(6, W - 12, 6, 13, 1.1),
		...tiledRoof(0, W, 12, 23, 0.2),
		...boardedWall(2, 23, W - 4, 40, FALU),
		// The lantern by the door, on a bracket, alight.
		...glow(15, 27, 2, 3, 3),
		[14, 26, 4, 1, INK],
		[15, 27, 2, 3, WARM_LIT],
		[14, 30, 4, 1, INK],
		...houseDoor(5, 27, 40),
		...houseWindow(21, 27, true),
		...houseWindow(35, 27, false),
		...footing(1, W - 2, 40, H),
	])
})()

/** The old wooden houses on the way up to Vita bergen, falu red and ochre: three, taken in turn. */
export const WOODEN_HOUSES = [
	{ asset: houseA, width: 56 },
	{ asset: houseB, width: 64 },
	{ asset: houseC, width: 48 },
]

/* -------------------------------------------------------------------------- */
/* Vitabergsparken                                                             */
/* -------------------------------------------------------------------------- */

const BOARD = '#22392c'
const BOARD_LIT = '#30503d'
const BOARD_SHADE = '#172a20'
const LETTERING = '#cdc7ae'
const POST = '#2e2723'
const POST_LIT = '#41372f'

/**
 * The sign at the way into Vitabergsparken: a board painted park green,
 * its name lettered on it in two lines, VITABERGS over PARKEN, on two
 * posts. 60 by 24.
 */
export const parkSign = (() => {
	const w = 60
	const lines = ['VITABERGS', 'PARKEN']
	return svgUrl(
		w,
		24,
		[
			rectsMarkup([
				// Its posts.
				[8, 18, 3, 6, POST],
				[8, 18, 1, 6, POST_LIT],
				[49, 18, 3, 6, POST],
				[49, 18, 1, 6, POST_LIT],
				// The board, lit along its top, its bottom edge in shade.
				[0, 0, w, 19, BOARD],
				[0, 0, w, 1, BOARD_LIT],
				[0, 18, w, 1, BOARD_SHADE],
				[w - 1, 1, 1, 17, BOARD_SHADE],
			]),
			...lines.map((line, i) =>
				pixelText(
					line,
					Math.round((w - pixelTextWidth(line, 1)) / 2),
					2 + i * 8,
					1,
					LETTERING,
				),
			),
		].join(''),
	)
})()

/**
 * A marschall, an outdoor candle, burning, up the path's side: a stick of
 * rolled wax, pushed into the ground, its top lit by its flame, which
 * flickers between two shapes, and a faint glow round it. 5 by 16.
 */
export const marschall = (() => {
	let body = rectsMarkup([
		...glow(1, 2, 3, 6, 1),
		// The torch: its wax, warm along its top from the flame, its charred end.
		[1, 8, 3, 8, '#625b50'],
		[1, 8, 3, 1, '#a07a48'],
		[3, 9, 1, 7, '#47423a'],
		[1, 7, 3, 1, '#2b2722'],
		// Its flame, the same in both shapes.
		[1, 4, 3, 3, FLAME],
		[2, 5, 1, 2, FLAME_CORE],
	])
	body += `<g>${rectsMarkup([
		[2, 2, 1, 2, FLAME_TIP],
		[1, 3, 1, 1, FLAME],
	])}<animate attributeName="opacity" values="1;0;1" keyTimes="0;0.5;1" calcMode="discrete" dur="0.6s" repeatCount="indefinite"/></g>`
	body += `<g>${rectsMarkup([
		[2, 1, 1, 3, FLAME_TIP],
		[3, 3, 1, 1, FLAME],
	])}<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" calcMode="discrete" dur="0.6s" repeatCount="indefinite"/></g>`
	return svgUrl(5, 16, body)
})()

/* -------------------------------------------------------------------------- */
/* Sofiakyrkan                                                                 */
/* -------------------------------------------------------------------------- */

/** Its pale plaster, greyed by night; the deep reveals of its windows. */
const PLASTER = '#737686'
const PLASTER_LIT = '#8c90a0'
const PLASTER_SHADE = '#585b6b'
const REVEAL = '#474a59'
/** Its granite plinth and steps. */
const GRANITE = '#45444d'
const GRANITE_LIT = '#58575f'
const GRANITE_SHADE = '#35343c'
const STEP = '#64636e'
const STEP_LIT = '#7a7984'
/** Its copper roofs, gone green. */
const COPPER = '#2f5b4d'
const COPPER_LIT = '#437767'
const COPPER_SHADE = '#22453a'
/** The belfry's louvres, and the gilt cross on top. */
const LOUVRE = '#262836'
const LOUVRE_SLAT = '#3b3e4f'
const GILT = '#b8963e'

/** A tall arched window, glass `w` wide, lit warm inside: its reveal round it, a bar across, a mullion up it. */
const churchWindow = (
	x: number,
	y: number,
	w: number,
	h: number,
	mullions: number[],
	transoms: number[],
): PixelRect[] => [
	...glow(x, y, w, h, 3),
	...arch(x - 1, y - 1, w + 2, h + 2, REVEAL),
	...arch(x, y, w, h, WARM),
	[x + 2, y, w - 4, 1, WARM_LIT],
	[x + 1, y + 1, w - 2, 2, WARM_LIT],
	...mullions.map((m): PixelRect => [x + m, y + 3, 1, h - 3, WARM_SHADE]),
	...transoms.map((t): PixelRect => [x, y + t, w, 1, WARM_SHADE]),
	[x - 2, y + h + 1, w + 4, 1, PLASTER_LIT],
]

/**
 * A floodlight's beam, faint warm light, fanning up the wall from a lamp at
 * `x`, `y`, `h` tall, and no wider than `most` either side: on the wall,
 * not out over the sky beside it.
 */
const FLOOD = '#fff1c00e'
const floodlight = (
	x: number,
	y: number,
	h: number,
	most: number,
): PixelRect[] => {
	const r: PixelRect[] = []
	for (let up = 0; up < h; up += 4) {
		const hw = Math.min(most, 2 + Math.round(up * 0.45))
		r.push([x - hw, y - up - 4, hw * 2, 4, FLOOD])
	}
	// The lamp itself, on the plinth, and the glare off it.
	r.push(...glow(x - 2, y - 2, 4, 2, 3))
	r.push([x - 3, y - 1, 6, 3, GRANITE_SHADE])
	r.push([x - 2, y - 2, 4, 1, WARM_LIT])
	return r
}

/** A copper dome, `hw` at its widest, from `top` down to `bottom`, ribbed, lit on its left. */
const dome = (
	mid: number,
	top: number,
	bottom: number,
	widest: number,
	ribs: number[],
): PixelRect[] => {
	const r: PixelRect[] = []
	const tall = bottom - top
	for (let y = top; y < bottom; y++) {
		const hw = Math.round(
			widest * 0.22 + widest * 0.78 * Math.sqrt((y - top + 1) / tall),
		)
		r.push([mid - hw, y, hw * 2, 1, COPPER])
		r.push([mid - hw, y, Math.ceil(hw * 0.55), 1, COPPER_LIT])
		r.push([
			mid + hw - Math.ceil(hw * 0.35),
			y,
			Math.ceil(hw * 0.35),
			1,
			COPPER_SHADE,
		])
		if (y > top + 2)
			for (const rib of ribs)
				r.push([mid + Math.round(hw * rib), y, 1, 1, COPPER_SHADE])
	}
	r.push([mid - widest, bottom - 1, widest * 2, 1, COPPER_SHADE])
	return r
}

/** A lantern on top of a dome, `w` wide, its windows lit, and a gilt cross over it, its foot at `bottom`. */
const lantern = (mid: number, bottom: number, w: number): PixelRect[] => {
	const h = Math.round(w * 1.1)
	const top = bottom - h
	return [
		...glow(mid - w / 4, top + 3, w / 2, h - 5, 3),
		[mid - w / 2, top, w, h, COPPER],
		[mid - w / 2, top, 2, h, COPPER_LIT],
		[mid - w / 4, top + 3, w / 2, h - 5, WARM],
		[mid - w / 4, top + 3, w / 2, 1, WARM_LIT],
		[mid - 1, top + 3, 1, h - 5, WARM_SHADE],
		[mid - w / 2 - 2, top - 1, w + 4, 2, COPPER_LIT],
		[mid - w / 2, top - 3, w, 2, COPPER],
		[mid - w / 4, top - 5, w / 2, 2, COPPER],
		// The cross, gilt, catching the floodlights.
		[mid - 1, top - 5 - w, 2, w, GILT],
		[
			mid - Math.round(w / 3),
			top - 5 - Math.round(w * 0.7),
			Math.round(w / 3) * 2,
			2,
			GILT,
		],
	]
}

/**
 * Sofiakyrkan, on the top of Vita bergen: pale plaster, national romantic,
 * 1906, floodlit for the race. Its great gable faces the park, a rose
 * window in it, and under that a tall window glowing over its doors, open,
 * warm light spilling down its steps. Its wings either side under copper
 * roofs, a corner tower at each end with a dome of its own; and over it all
 * its big tower, a belfry, a drum of lit windows, a great ribbed copper
 * dome, and a lantern on top under a gilt cross. Floodlights along its
 * plinth wash light up its walls. 280 by 240.
 */
/** How tall it is, in cells: for the camera to look up to the top of it. */
export const SOFIA_KYRKAN_HEIGHT = 240

export const sofiaKyrkan = (() => {
	const W = 280
	const H = SOFIA_KYRKAN_HEIGHT
	const mid = W / 2
	const r: PixelRect[] = []

	// The great dome, its lantern and cross.
	r.push(...lantern(mid, 30, 16))
	r.push(...dome(mid, 30, 76, 44, [-0.72, -0.36, 0, 0.36, 0.72]))
	// Its drum, a ring of lit windows between pilasters, a cornice over it.
	r.push([96, 74, 88, 3, PLASTER_LIT])
	r.push([96, 77, 88, 1, PLASTER_SHADE])
	r.push([100, 78, 80, 32, PLASTER])
	r.push([100, 78, 3, 32, PLASTER_LIT])
	r.push([177, 78, 3, 32, PLASTER_SHADE])
	for (const x of [106, 124, 148, 166])
		r.push(...churchWindow(x, 84, 8, 18, [4], []))
	for (const x of [118, 140, 160]) r.push([x, 80, 2, 28, PLASTER_LIT])

	// The tower, square, under its cornice, copper spires on its corners.
	r.push([96, 112, 88, 46, PLASTER])
	r.push([96, 112, 4, 46, PLASTER_LIT])
	r.push([180, 112, 4, 46, PLASTER_SHADE])
	r.push([92, 108, 96, 3, PLASTER_LIT])
	r.push([92, 111, 96, 1, PLASTER_SHADE])
	for (const x of [92, 178]) {
		r.push([x, 96, 10, 12, COPPER])
		r.push([x + 2, 90, 6, 6, COPPER])
		r.push([x + 4, 84, 2, 6, COPPER])
		r.push([x, 96, 3, 12, COPPER_LIT])
		r.push([x + 2, 90, 2, 6, COPPER_LIT])
		r.push([x + 4, 82, 2, 2, GILT])
	}
	// Its belfry, an arched opening either side, louvred.
	for (const x of [106, 160]) {
		r.push(...arch(x, 116, 14, 30, LOUVRE))
		for (let y = 121; y < 146; y += 3) r.push([x, y, 14, 1, LOUVRE_SLAT])
		r.push([x - 2, 146, 18, 2, PLASTER_LIT])
	}

	// The corner towers, one at each end, each with its own dome.
	for (const cx of [32, 248]) {
		r.push(...lantern(cx, 62, 8))
		r.push(...dome(cx, 62, 90, 20, [-0.5, 0.2]))
		r.push([cx - 20, 89, 40, 3, PLASTER_LIT])
		r.push([cx - 18, 92, 36, 120, PLASTER])
		r.push([cx - 18, 92, 3, 120, PLASTER_LIT])
		r.push([cx + 15, 92, 3, 120, PLASTER_SHADE])
		r.push(...churchWindow(cx - 5, 100, 10, 26, [5], [13]))
		r.push(...churchWindow(cx - 5, 150, 10, 34, [5], [17]))
	}

	// The wings' roof, copper, going on behind the gable.
	for (let y = 124; y < 150; y++) {
		const inset = Math.round((149 - y) * 0.4)
		r.push([50 + inset, y, 180 - 2 * inset, 1, y === 124 ? COPPER_LIT : COPPER])
		r.push([50 + inset, y, 3, 1, COPPER_LIT])
	}
	r.push([50, 149, 180, 1, COPPER_SHADE])
	// The wings' walls, a shadow under their eaves, two tall windows a wing.
	r.push([50, 150, 180, 62, PLASTER])
	r.push([50, 150, 180, 2, PLASTER_SHADE])
	for (const x of [58, 76, 194, 212])
		r.push(...churchWindow(x, 162, 10, 38, [5], [14, 26]))

	// The great gable, stepping up to its point, its coping lit, a stone
	// finial and a cross on top.
	const peak = 92
	const eaves = 146
	for (let y = peak; y < eaves; y++) {
		const hw = Math.round(8 + ((y - peak) * 40) / (eaves - peak))
		r.push([mid - hw, y, hw * 2, 1, PLASTER])
		r.push([mid - hw, y, 3, 1, PLASTER_LIT])
		r.push([mid + hw - 3, y, 3, 1, PLASTER_LIT])
	}
	r.push([mid - 8, peak, 16, 2, PLASTER_LIT])
	r.push([mid - 4, 84, 8, 8, PLASTER_LIT])
	r.push([mid - 1, 74, 2, 10, GILT])
	r.push([mid - 4, 77, 8, 2, GILT])
	// Its rose window, round, lit, its tracery a cross and a ring.
	const rose = { x: mid, y: 122, r: 13 }
	r.push(...glow(rose.x - rose.r, rose.y - rose.r, rose.r * 2, rose.r * 2, 4))
	for (let dy = -rose.r - 2; dy <= rose.r + 2; dy++) {
		const outer = Math.round(
			Math.sqrt(Math.max(0, (rose.r + 2) ** 2 - dy * dy)),
		)
		const inner = Math.round(Math.sqrt(Math.max(0, rose.r ** 2 - dy * dy)))
		r.push([rose.x - outer, rose.y + dy, outer * 2, 1, REVEAL])
		if (Math.abs(dy) <= rose.r)
			r.push([
				rose.x - inner,
				rose.y + dy,
				inner * 2,
				1,
				dy < -6 ? WARM_LIT : WARM,
			])
	}
	r.push([rose.x - 1, rose.y - rose.r, 2, rose.r * 2, WARM_SHADE])
	r.push([rose.x - rose.r, rose.y - 1, rose.r * 2, 2, WARM_SHADE])
	for (let a = 0; a < 16; a++) {
		const t = (a / 16) * Math.PI * 2
		r.push([
			Math.round(rose.x + Math.cos(t) * 7),
			Math.round(rose.y + Math.sin(t) * 7),
			1,
			1,
			WARM_SHADE,
		])
	}
	r.push([rose.x - 3, rose.y - 3, 6, 6, FLAME_CORE])
	// The gable's wall, standing out from the wings, its shadow on the right-hand one.
	r.push([92, eaves, 96, 66, PLASTER])
	r.push([92, eaves, 3, 66, PLASTER_LIT])
	r.push([185, eaves, 3, 66, PLASTER_SHADE])
	r.push([188, 150, 4, 62, PLASTER_SHADE])
	// Its great window: four lights, a bar across.
	r.push(...churchWindow(mid - 14, 150, 28, 30, [7, 14, 21], [14]))

	// The plinth, granite, its courses.
	r.push([8, 212, W - 16, 28, GRANITE])
	r.push([8, 212, W - 16, 2, GRANITE_LIT])
	r.push([8, 224, W - 16, 1, GRANITE_SHADE])
	r.push([8, 232, W - 16, 1, GRANITE_SHADE])
	// The doors, open, in a deep granite portal: warm light inside.
	r.push(...glow(mid - 12, 192, 24, 32, 5))
	r.push(...arch(mid - 18, 186, 36, 38, GRANITE_LIT))
	r.push(...arch(mid - 15, 189, 30, 35, GRANITE))
	r.push(...arch(mid - 12, 192, 24, 32, WARM))
	r.push([mid - 10, 192, 20, 2, WARM_LIT])
	r.push([mid - 11, 194, 22, 4, WARM_LIT])
	r.push([mid - 12, 198, 4, 26, DOOR])
	r.push([mid + 8, 198, 4, 26, DOOR])
	r.push([mid - 8, 220, 16, 4, WARM_SHADE])
	// The steps down from them, the light spilling down them.
	for (const [k, w] of [
		[0, 40],
		[1, 52],
		[2, 64],
		[3, 76],
	] as const) {
		const y = 224 + k * 4
		r.push([mid - w / 2, y, w, 4, STEP])
		r.push([mid - w / 2, y, w, 1, STEP_LIT])
		r.push([mid - w / 2 + 4, y, w - 8, 4, GLOW])
	}

	// Floodlit: lamps along the plinth, their light fanning up the walls,
	// and a warm wash over the lot.
	for (const x of [32, 248]) r.push(...floodlight(x, 212, 120, 16))
	for (const x of [71, 209]) r.push(...floodlight(x, 212, 60, 19))
	for (const x of [114, 166]) r.push(...floodlight(x, 212, 64, 20))
	r.push([14, 150, W - 28, 62, '#ffd88a0c'])
	return pixelArt(W, H, r)
})()

/* -------------------------------------------------------------------------- */
/* The choir                                                                   */
/* -------------------------------------------------------------------------- */

/** Their gowns, white, lit warm by their candles; a gold stole over them. */
const ROBE = '#e6e1ea'
const ROBE_LIT = '#fffaf0'
const ROBE_SHADE = '#b9b2c6'
const COLLAR = '#d9b45a'
/** The light on them all, a soft warm halo round the choir. */
const HALO = '#ffd88a12'
/** A dome of light, `hw` either side of `mid` and `h` up from `bottom`, a row at a time, rounded off. */
const halo = (mid: number, bottom: number, hw: number, h: number) =>
	Array.from({ length: h }, (_, k): PixelRect => {
		const w = Math.round(hw * Math.sqrt(1 - ((k + 1) / (h + 1)) ** 2))
		return [mid - w, bottom - h + (h - 1 - k), w * 2, 1, HALO]
	})
const FOLDER = '#1d1d24'
const FOLDER_LIT = '#34343e'
const SKIN = '#a98069'
const SKIN_SHADE = '#866250'
/** A face lit by the candle it's holding. */
const SKIN_WARM = '#d29f78'
const MOUTH = '#3a1618'
const CANDLE = '#d7d0b8'
const HAIRS = ['#2a201c', '#5c4a34', '#3f2c22', '#77726a', '#1f1c1f', '#6b4a2c']
const STONE = '#4a4952'
const STONE_LIT = '#5f5e69'

/**
 * A singer, facing out, 8 wide, their head's top at `top`, standing on
 * `feet`: their robe, its collar, their hair short or long, their mouth
 * wide open, singing, and in their hands their folder of music, or a
 * candle, alight, lighting their face.
 */
const singer = (
	x: number,
	top: number,
	feet: number,
	hair: string,
	long: boolean,
	candle: boolean,
): PixelRect[] => {
	const skin = candle ? SKIN_WARM : SKIN
	const r: PixelRect[] = [
		// The gown, lit down its left, in shade down its right, its folds,
		// and the stole hanging down its front.
		[x, top + 8, 8, feet - top - 8, ROBE],
		[x, top + 9, 2, feet - top - 9, ROBE_LIT],
		[x + 7, top + 9, 1, feet - top - 9, ROBE_SHADE],
		[x + 4, top + 16, 1, feet - top - 16, ROBE_SHADE],
		[x, top + 8, 8, 1, ROBE_LIT],
		[x + 2, top + 8, 1, feet - top - 10, COLLAR],
		[x + 5, top + 8, 1, feet - top - 10, COLLAR],
		// The head: hair, a face, eyes, and the mouth open.
		[x + 1, top, 6, 2, hair],
		[x + 1, top + 2, 6, 5, skin],
		[x + 2, top + 7, 4, 1, SKIN_SHADE],
		[x + 1, top + 2, 1, 2, hair],
		[x + 6, top + 2, 1, 2, hair],
		[x + 2, top + 3, 1, 1, INK],
		[x + 5, top + 3, 1, 1, INK],
		[x + 3, top + 5, 2, 2, MOUTH],
	]
	// Long hair, down past the ears.
	if (long) r.push([x, top + 1, 1, 7, hair], [x + 7, top + 1, 1, 7, hair])
	if (candle)
		r.push(
			...glow(x + 3, top + 9, 2, 3, 2),
			[x + 3, top + 12, 2, 4, CANDLE],
			[x + 3, top + 10, 2, 2, FLAME],
			[x + 3, top + 11, 1, 1, FLAME_CORE],
			[x + 3, top + 9, 1, 1, FLAME_TIP],
			[x + 2, top + 15, 4, 2, skin],
		)
	else
		r.push(
			[x + 2, top + 11, 4, 3, FOLDER],
			[x + 2, top + 11, 4, 1, FOLDER_LIT],
			[x + 1, top + 12, 1, 2, SKIN_SHADE],
			[x + 6, top + 12, 1, 2, SKIN_SHADE],
		)
	return r
}

/**
 * The choir, out on the church's steps in white gowns, gold stoles over
 * them, singing: two rows, the back one a step up, between the heads of
 * the front one; folders of music, and most of them a candle, alight,
 * the lot of them glowing in its light. 80 by 36.
 */
export const choir = (() => {
	const r: PixelRect[] = [
		// The light round them, warm, a dome of it softening out.
		...halo(40, 36, 40, 34),
		...halo(40, 36, 30, 28),
		...halo(40, 36, 20, 22),
		// The steps they're stood on, lit.
		[4, 28, 72, 4, STONE],
		[4, 28, 72, 1, STONE_LIT],
		[0, 32, 80, 4, STONE],
		[0, 32, 80, 1, STONE_LIT],
		[6, 28, 68, 8, GLOW],
	]
	for (let i = 0; i < 6; i++)
		r.push(
			...singer(
				9 + i * 11,
				3,
				29,
				HAIRS[(i + 3) % HAIRS.length],
				i % 3 === 1,
				i % 2 === 1,
			),
		)
	for (let i = 0; i < 7; i++)
		r.push(
			...singer(
				3 + i * 11,
				10,
				33,
				HAIRS[i % HAIRS.length],
				i % 2 === 0,
				i % 3 !== 2,
			),
		)
	return pixelArt(80, 36, r)
})()
