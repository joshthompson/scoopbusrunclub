import type { SecretProp } from '../types'
import { type PixelRect, pixelArt } from './pixelArt'

/**
 * The engine hall, below decks on Scoop Cruises' ferry, drawn in code, in
 * cells twice the size of a screen pixel: the tall room under the sun deck
 * where the main engine stands, great and green, one of them burning; its
 * exhaust uptake, up to the deck; an overhead crane's hook, a telegraph,
 * a gauge board and a red beacon turning on the wall; and the black smoke
 * rolling up off the fire.
 */

const CELL = 2

/** Engine green-grey, lit and in shadow; steel, lagging and ink for the small details. */
const ENGINE = '#4f6b5e'
const ENGINE_LIT = '#6a8a7b'
const ENGINE_SHADE = '#3c5248'
const ENGINE_GLINT = '#8fb0a0'
const STEEL = '#8d949b'
const STEEL_LIT = '#b9c0c6'
const STEEL_DARK = '#5d646b'
const LAGGING = '#9aa1a8'
const LAGGING_LIT = '#c4cacf'
const LAGGING_SHADE = '#6d747a'
const INK = '#1e2328'
const BRASS = '#c9a24a'
const BRASS_LIT = '#e8c66a'
const BRASS_SHADE = '#8f7230'
const HAZARD = '#f0c419'
const HAZARD_LIT = '#ffe066'
const HAZARD_DARK = '#b88f10'
const FUEL = '#d8a62a'
const GLASS = '#e8f0e0'
const NEEDLE = '#c8312b'
const RED = '#c8312b'
const RED_LIT = '#e35a4b'
const RED_DARK = '#8f1f1b'
const GREEN_LAMP = '#3fbf5a'
/** Fire: its heart, yellow-white; then orange; then red at its tips; and soot. */
const FIRE_CORE = '#fff2a8'
const FIRE_YELLOW = '#ffc44a'
const FIRE_RED = '#d8341b'
const SOOT = '#2b2522'

const prop = (
	columns: number,
	rows: number,
	frames: PixelRect[][],
	more: Partial<SecretProp> = {},
): SecretProp => ({
	frames: frames.map((rects) => pixelArt(columns, rows, rects)),
	width: columns * CELL,
	height: rows * CELL,
	...more,
})

/**
 * Paints every cell in a box that `colour` gives a colour to, merging
 * runs of the same colour along a row into one rect. For anything round.
 */
function paint(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	colour: (x: number, y: number) => string | undefined,
): PixelRect[] {
	const out: PixelRect[] = []
	for (let y = y0; y < y1; y++) {
		let start = x0
		let run: string | undefined
		for (let x = x0; x <= x1; x++) {
			const here = x < x1 ? colour(x, y) : undefined
			if (here !== run) {
				if (run) out.push([start, y, x - start, 1, run])
				start = x
				run = here
			}
		}
	}
	return out
}

/** A filled ellipse, centred on (cx, cy) in cells, coloured cell by cell from `colour(dx, dy)`. */
function ellipse(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	colour: (x: number, y: number, dx: number, dy: number) => string | undefined,
): PixelRect[] {
	return paint(
		Math.floor(cx - rx),
		Math.floor(cy - ry),
		Math.ceil(cx + rx),
		Math.ceil(cy + ry),
		(x, y) => {
			const dx = (x + 0.5 - cx) / rx
			const dy = (y + 0.5 - cy) / ry
			if (dx * dx + dy * dy > 1) return undefined
			return colour(x, y, dx, dy)
		},
	)
}

/** A brass-rimmed dial, `size` cells across, its face pale, a needle from its hub to (tx, ty). */
function dial(
	x: number,
	y: number,
	size: number,
	tx: number,
	ty: number,
): PixelRect[] {
	const c = size / 2
	const out = ellipse(x + c, y + c, c, c, (_, py, __, dy) =>
		dy < -0.55 ? BRASS_LIT : py > y + size - 2 ? BRASS_SHADE : BRASS,
	)
	out.push(
		...ellipse(x + c, y + c, c - 1, c - 1, (_, py) =>
			py === y + 1 ? '#fffbe8' : GLASS,
		),
	)
	// Its needle, stepped from the hub out.
	const steps = Math.max(Math.abs(tx), Math.abs(ty))
	for (let i = 1; i <= steps; i++)
		out.push([
			Math.floor(x + c - 0.5 + (tx * i) / steps),
			Math.floor(y + c - 0.5 + (ty * i) / steps),
			1,
			1,
			NEEDLE,
		])
	out.push([Math.floor(x + c - 0.5), Math.floor(y + c - 0.5), 1, 1, INK])
	return out
}

// --- The great engine ---------------------------------------------------------

const HEAD_XS = [0, 1, 2, 3, 4, 5].map((i) => 14 + i * 13)

/**
 * A marine diesel, side on, 110 by 80, standing in the rects it's drawn
 * with: its block, engine green; six cylinder heads along its top, each
 * with a rocker cover lit along its top and a yellow fuel rail across
 * them; the lagged exhaust manifold over them, strapped, and the
 * turbocharger's snail shell at its right end, its outlet up to the
 * uptake; its crankcase doors along its side, bolted, and its gauges, and
 * a brass name plate under; a yellow catwalk rail along it on stanchions;
 * the flywheel and its turning gear at its left end; a steel bed under it all.
 */
function engineRects(): PixelRect[] {
	const out: PixelRect[] = [
		// Its bed, on the floor, and its feet.
		[4, 72, 102, 8, STEEL_DARK],
		[4, 72, 102, 1, STEEL],
		...[8, 30, 52, 74, 96].map((x): PixelRect => [x, 77, 8, 3, INK]),
		...[10, 32, 54, 76, 98].map((x): PixelRect => [x, 74, 2, 2, STEEL]),
		// The turbo's stand and its air intake, down to the bed.
		[99, 36, 8, 36, STEEL_DARK],
		[99, 36, 8, 1, STEEL],
		[98, 52, 10, 3, STEEL],
		[98, 52, 10, 1, STEEL_LIT],
		[97, 62, 12, 2, STEEL],
		// Its block.
		[12, 36, 84, 36, ENGINE],
		[12, 36, 84, 2, ENGINE_LIT],
		[12, 66, 84, 6, ENGINE_SHADE],
		// The name plate, brass, under the rail.
		[42, 66, 26, 4, BRASS_SHADE],
		[43, 66, 24, 3, BRASS],
		[43, 66, 24, 1, BRASS_LIT],
		...[45, 49, 53, 57, 61].map((x): PixelRect => [x, 67, 2, 1, INK]),
		// Its crankcase doors, bolted at the corners.
		...[36, 48, 60, 72, 84].flatMap((x): PixelRect[] => [
			[x, 41, 10, 13, ENGINE_SHADE],
			[x + 1, 42, 8, 11, ENGINE],
			[x + 1, 42, 8, 1, ENGINE_LIT],
			[x + 1, 42, 1, 1, STEEL_LIT],
			[x + 8, 42, 1, 1, STEEL_LIT],
			[x + 1, 51, 1, 1, STEEL_LIT],
			[x + 8, 51, 1, 1, STEEL_LIT],
			[x + 4, 46, 2, 3, STEEL],
			[x + 4, 46, 2, 1, STEEL_LIT],
		]),
		// A little gauge panel at its left end of the doors: three dials, a lamp.
		[14, 40, 20, 14, ENGINE_SHADE],
		[15, 41, 18, 12, STEEL_DARK],
		[15, 41, 18, 1, STEEL],
		...dial(16, 43, 5, 1, -1),
		...dial(22, 43, 5, 0, -2),
		...dial(28, 43, 5, -1, 1),
		[17, 50, 2, 2, GREEN_LAMP],
		[22, 50, 2, 2, FIRE_RED],
		[27, 50, 5, 2, INK],
		// The cylinder heads along its top, and the rocker covers on them.
		...HEAD_XS.flatMap((x): PixelRect[] => [
			[x, 24, 11, 12, ENGINE],
			[x, 24, 11, 1, ENGINE_LIT],
			[x, 33, 11, 3, ENGINE_SHADE],
			[x + 2, 29, 1, 1, STEEL_LIT],
			[x + 8, 29, 1, 1, STEEL_LIT],
			[x + 1, 18, 9, 6, ENGINE_LIT],
			[x + 1, 18, 9, 1, ENGINE_GLINT],
			[x + 1, 22, 9, 2, ENGINE],
			[x + 3, 20, 1, 1, STEEL_LIT],
			[x + 7, 20, 1, 1, STEEL_LIT],
		]),
		// Their fuel rail, yellow, across them.
		[12, 31, 84, 2, FUEL],
		[12, 31, 84, 1, HAZARD_LIT],
		// The exhaust manifold, lagged, along over them, a riser from each head.
		...HEAD_XS.map((x): PixelRect => [x + 3, 15, 5, 3, STEEL_DARK]),
		[12, 6, 86, 10, LAGGING],
		[12, 6, 86, 2, LAGGING_LIT],
		[12, 13, 86, 3, LAGGING_SHADE],
		...[18, 26, 34, 42, 50, 58, 66, 74, 82, 90].map(
			(x): PixelRect => [x, 6, 1, 10, STEEL_DARK],
		),
		// Its flange, to the turbo.
		[96, 4, 2, 14, STEEL_DARK],
		[97, 4, 1, 14, STEEL],
		// The turbo: its snail shell, round, lit above, a scroll in it, its hub brass;
		// its outlet up to the uptake, flanged.
		[100, 0, 6, 22, LAGGING],
		[100, 0, 6, 22, LAGGING],
		[100, 0, 2, 22, LAGGING_LIT],
		[104, 0, 2, 22, LAGGING_SHADE],
		[99, 0, 8, 2, STEEL_DARK],
		[99, 0, 8, 1, STEEL],
		[99, 10, 8, 1, STEEL_DARK],
		...ellipse(103, 29, 8, 8, (_, y, _dx, dy) =>
			dy < -0.6 ? LAGGING_LIT : y > 33 ? LAGGING_SHADE : LAGGING,
		),
		...ellipse(103, 29, 4.5, 4.5, (_, __, dx, dy) =>
			dx + dy < -0.2 ? STEEL : STEEL_DARK,
		),
		...ellipse(103, 29, 2, 2, (_, __, dx, dy) =>
			dx + dy < 0 ? BRASS_LIT : BRASS,
		),
		// The flywheel and turning gear at its left end, edge-on and rounded:
		// a toothed rim, white marks on it, a face and a brass hub.
		...ellipse(7, 55, 7, 20, (x, y, _dx, dy) =>
			Math.abs(x + 0.5 - 7) > 5.2 && y % 2 === 0
				? STEEL
				: dy < -0.4
					? STEEL_LIT
					: STEEL_DARK,
		),
		...ellipse(7.5, 55, 5, 17, (_, y, _dx, dy) =>
			dy < -0.5 ? STEEL : y > 64 ? STEEL_DARK : '#737a81',
		),
		...[39, 45, 51, 59, 65, 71].map((y): PixelRect => [4, y, 7, 1, STEEL_DARK]),
		...ellipse(7.5, 55, 2.5, 5, (_, __, ___, dy) =>
			dy < -0.2 ? BRASS_LIT : BRASS,
		),
		[7, 54, 1, 2, INK],
		...[41, 49, 62, 70].map((y): PixelRect => [1, y, 1, 2, '#f3f1e8']),
		// The catwalk's rail, yellow, along its side, on stanchions.
		[14, 55, 82, 2, HAZARD],
		[14, 55, 82, 1, HAZARD_LIT],
		[14, 62, 82, 1, HAZARD_DARK],
		...[14, 34, 54, 74, 94].map((x): PixelRect => [x, 55, 2, 17, HAZARD]),
		...[14, 34, 54, 74, 94].map(
			(x): PixelRect => [x + 1, 57, 1, 15, HAZARD_DARK],
		),
	]
	return out
}

/** A main engine, quiet. 110 by 80. */
export const HALL_ENGINE: SecretProp = prop(110, 80, [engineRects()])

// --- Fire ---------------------------------------------------------------------

/** How much room over a burning engine its flames get, in cells. */
const FLAMES_OVER = 30

/**
 * The engine on fire: the fourth head blown open, its rocker cover thrown
 * back over it, bent, soot up the manifold and down the block, white-hot in
 * the hole. Its flames are fire of their own (see `kit/fire.ts`), placed
 * over it by `BURNING_FIRES`.
 */
function burningRects(): PixelRect[] {
	const down = ([x, y, w, h, c]: PixelRect): PixelRect => [
		x,
		y + FLAMES_OVER,
		w,
		h,
		c,
	]
	const head = HEAD_XS[3]
	const out: PixelRect[] = [
		...engineRects().map(down),
		// The head, blown open: its rocker cover gone, a hole in it, black.
		...[
			[head - 1, 18, 13, 18, SOOT],
			[head - 2, 26, 3, 10, SOOT],
			[head + 10, 24, 3, 12, SOOT],
			[head + 2, 22, 7, 14, INK],
			[head + 3, 14, 5, 5, SOOT],
			// Torn edges of the head, jagged, lit.
			[head - 1, 16, 2, 2, ENGINE_LIT],
			[head + 10, 18, 2, 2, ENGINE_LIT],
			[head - 3, 30, 2, 1, ENGINE],
		].map((r) => down(r as PixelRect)),
		// Soot, up the manifold and down the block.
		...(
			[
				[head - 6, 6, 24, 10, LAGGING_SHADE],
				[head - 4, 6, 20, 4, SOOT],
				[head - 2, 10, 16, 6, STEEL_DARK],
				[head - 8, 36, 28, 14, '#2f3a35'],
				[head - 4, 36, 20, 8, SOOT],
			] as PixelRect[]
		).map(down),
		// Its rocker cover, thrown, bent, against the next head.
		...(
			[
				[head + 13, 12, 8, 3, ENGINE_LIT],
				[head + 15, 9, 6, 3, ENGINE],
				[head + 13, 12, 8, 1, ENGINE_GLINT],
			] as PixelRect[]
		).map(down),
	]
	// Its heart, white-hot, glowing in the hole.
	out.push(
		down([head + 2, 24, 7, 6, FIRE_YELLOW]),
		down([head + 3, 26, 5, 4, FIRE_CORE]),
	)
	return out
}

/**
 * The engine on fire, 110 by 110: the same engine, standing at the foot of
 * its picture, with room over it for the flames pouring up out of its
 * blown head (see `BURNING_FIRES`).
 */
export const HALL_ENGINE_BURNING: SecretProp = prop(110, 80 + FLAMES_OVER, [
	burningRects(),
])

/**
 * Where the burning engine's fires are, from its middle along and up from
 * its foot, in px: up out of the blown head, and licking along the
 * manifold either side of it, off it.
 */
export const BURNING_FIRES = {
	head: { x: 6, up: 84 },
	manifold: [
		{ x: -16, up: 144 },
		{ x: 32, up: 144 },
	],
}

// --- The uptake ---------------------------------------------------------------

const UPTAKE_ROWS = 140

/**
 * An exhaust uptake, 22 by 140: a fat trunk of lagged pipe rising from
 * engine-top height straight up and off the top of its picture, to the
 * deck. Flanged where it joins, with an expansion bellows in it, pleated, and
 * a silencer drum, steel, banded, a little way up; its foot flared, to
 * sit down on a turbo's outlet. Hung 150 from the floor.
 */
function uptakeRects(): PixelRect[] {
	const out: PixelRect[] = []
	// The trunk's lagging: lit on the left, shaded on the right, strapped.
	out.push(
		[5, 0, 12, UPTAKE_ROWS, LAGGING],
		[5, 0, 3, UPTAKE_ROWS, LAGGING_LIT],
		[14, 0, 3, UPTAKE_ROWS, LAGGING_SHADE],
		...[8, 28, 44, 100].map((y): PixelRect => [5, y, 12, 1, STEEL_DARK]),
	)
	// The foot, flared, and its flange to the turbo.
	out.push(
		[3, 128, 16, 4, LAGGING],
		[3, 128, 16, 1, LAGGING_LIT],
		[1, 132, 20, 3, STEEL_DARK],
		[1, 132, 20, 1, STEEL],
		[2, 135, 18, 5, LAGGING_SHADE],
		[2, 135, 18, 1, LAGGING],
	)
	// Flanged joints, bolted.
	for (const y of [18, 60, 80, 124]) {
		out.push(
			[3, y, 16, 3, STEEL_DARK],
			[3, y, 16, 1, STEEL],
			...[4, 8, 12, 16].map((x): PixelRect => [x, y + 1, 1, 1, STEEL_LIT]),
		)
	}
	// The expansion bellows: pleats, bare steel between lagged runs.
	out.push([5, 63, 12, 15, STEEL_DARK])
	for (let y = 63; y < 78; y += 3)
		out.push([4, y, 14, 2, STEEL], [4, y, 14, 1, STEEL_LIT])
	// A silencer drum, fat, with domed ends, on the trunk.
	out.push(
		[1, 86, 20, 32, LAGGING],
		[1, 86, 20, 3, LAGGING_LIT],
		[1, 112, 20, 6, LAGGING_SHADE],
		[3, 84, 16, 2, STEEL],
		[4, 83, 14, 1, STEEL_LIT],
		[3, 118, 16, 2, STEEL_DARK],
		// Its straps and its inspection plate, bolted.
		[1, 94, 20, 1, STEEL_DARK],
		[1, 108, 20, 1, STEEL_DARK],
		[7, 98, 8, 8, STEEL_DARK],
		[8, 99, 6, 6, STEEL],
		[8, 99, 6, 1, STEEL_LIT],
		[8, 99, 1, 1, INK],
		[13, 99, 1, 1, INK],
		[8, 104, 1, 1, INK],
		[13, 104, 1, 1, INK],
	)
	// A drain cock and a soot-streak under the join.
	out.push([18, 120, 3, 2, BRASS], [19, 122, 1, 3, BRASS_SHADE])
	// Heat-blistered paint at the bottom of the trunk.
	out.push([7, 120, 8, 4, SOOT], [9, 116, 4, 4, '#3a3532'])
	return out
}

export const UPTAKE: SecretProp = prop(22, UPTAKE_ROWS, [uptakeRects()], {
	hung: 150,
})

// --- The crane ----------------------------------------------------------------

/**
 * An overhead crane's trolley and hook, 40 by 70, hung from the deck: a
 * stub of I-beam rail across the top, the trolley's wheels running on its
 * lower flange, its motor and its box, a chain of links hanging down from it,
 * and a hook block, steel, hazard-striped, with a hook in yellow and black.
 * Hung so its top touches the deck, 198 up from the floor.
 */
function craneRects(): PixelRect[] {
	const out: PixelRect[] = [
		// The rail: an I-beam, flanges and web, bolt heads on the web.
		[0, 0, 40, 2, STEEL],
		[0, 0, 40, 1, STEEL_LIT],
		[14, 2, 12, 3, STEEL_DARK],
		[0, 5, 40, 2, STEEL_DARK],
		[0, 5, 40, 1, STEEL],
		...[2, 10, 30, 36].map((x): PixelRect => [x, 3, 2, 1, STEEL_LIT]),
		// The trolley: wheels on the lower flange, its frame and motor.
		...[8, 28].map((x): PixelRect => [x, 7, 4, 3, INK]),
		...[8, 28].map((x): PixelRect => [x + 1, 7, 2, 1, STEEL]),
		[6, 9, 28, 9, '#c9531f'],
		[6, 9, 28, 1, '#e7803f'],
		[6, 15, 28, 3, '#9a3a14'],
		[10, 11, 8, 4, STEEL_DARK],
		[10, 11, 8, 1, STEEL],
		[22, 11, 8, 4, INK],
		[24, 12, 4, 1, HAZARD],
		[17, 18, 6, 2, STEEL_DARK],
	]
	// The chain: links, side on and end on, one after the next.
	for (let y = 20; y < 40; y += 2)
		out.push(
			y % 4 === 0 ? [18, y, 4, 2, STEEL] : [19, y, 2, 2, STEEL_DARK],
			...(y % 4 === 0 ? [[19, y, 2, 1, INK] as PixelRect] : []),
		)
	// The hook block: steel, striped with hazard across its middle, a sheave.
	out.push(
		[14, 40, 12, 14, STEEL_DARK],
		[14, 40, 12, 2, STEEL],
		[14, 40, 12, 1, STEEL_LIT],
		[14, 52, 12, 2, INK],
		...[14, 18, 22].map((x): PixelRect => [x, 44, 2, 5, HAZARD]),
		...[16, 20, 24].map((x): PixelRect => [x, 44, 2, 5, INK]),
		...ellipse(20, 47, 2.5, 2.5, () => STEEL_LIT).slice(0, 0),
		[18, 46, 4, 2, STEEL],
		[19, 46, 2, 1, STEEL_LIT],
		[17, 54, 6, 2, STEEL_DARK],
	)
	// The hook: a shank down, the bend and its tip back up, striped yellow and black.
	const hook = new Set<string>()
	const cell = (x: number, y: number, w = 1, h = 1) => {
		for (let i = 0; i < w; i++)
			for (let j = 0; j < h; j++) hook.add(`${x + i},${y + j}`)
	}
	cell(19, 56, 3, 6)
	cell(18, 62, 5, 2)
	cell(17, 64, 6, 2)
	cell(16, 66, 6, 2)
	cell(16, 68, 5, 1)
	cell(15, 62, 2, 4)
	cell(15, 60, 1, 2)
	out.push(
		...paint(14, 56, 26, 70, (x, y) =>
			hook.has(`${x},${y}`) ? ((x + y) % 4 < 2 ? HAZARD : INK) : undefined,
		),
		// The safety catch, across the hook's mouth.
		[17, 61, 2, 1, STEEL],
	)
	return out
}

export const CRANE: SecretProp = prop(40, 70, [craneRects()], {
	hung: 338 - 140,
})

// --- The beacon ---------------------------------------------------------------

/**
 * A rotating alarm beacon, red, on a bracket off the wall: 10 by 12. Its
 * light sweeps, `frame` (0 to 3): the bright side of its lens one side, then
 * the other and back, its reflector turning in it. Its glow, red, all round.
 */
function beaconRects(frame: number): PixelRect[] {
	// Where the reflector's bright slice is, across the lens, by frame.
	const at = [1, 3, 5, 3][frame]
	const out: PixelRect[] = [
		// Its bracket, to the wall, and its base.
		[0, 6, 2, 6, STEEL_DARK],
		[0, 6, 1, 6, STEEL],
		[2, 9, 6, 3, STEEL_DARK],
		[2, 9, 6, 1, STEEL],
		// Its lens, a dome, red.
		...ellipse(5, 6.5, 4.5, 5.5, (_, __, ___, dy) =>
			dy < -0.5 ? RED_LIT : RED,
		),
		[1, 7, 8, 2, RED],
		[1, 7, 8, 1, RED_LIT],
		[1, 8, 8, 1, RED_DARK],
		// Its reflector, turning, a bright slice in it.
		[at + 1, 3, 2, 5, '#ffd1c0'],
		[at + 1, 3, 2, 1, '#fff2e6'],
		[at + 2 > 8 ? 8 : at + 2, 4, 1, 3, FIRE_CORE],
		// The foot of the lens, under it.
		[2, 8, 6, 1, RED_DARK],
		// Its cap.
	]
	return out
}

export const BEACON: SecretProp = prop(10, 12, [0, 1, 2, 3].map(beaconRects), {
	hung: 260,
	glow: { x: 0, y: 260 + 12, reach: 60, colour: '#ff3a2a' },
})

// --- Smoke --------------------------------------------------------------------

const SMOKE_COLUMNS = 50
const SMOKE_ROWS = 70

/** A fixed scatter in 0 to 1 for a cell, so a lump's edge doesn't boil. */
const scatter = (x: number, y: number) => {
	const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
	return n - Math.floor(n)
}

const hex2 = (n: number) =>
	Math.max(0, Math.min(255, Math.round(n)))
		.toString(16)
		.padStart(2, '0')

/**
 * Smoke, rolling up, `frame` (0 to 2), 50 by 70: lumps of it climbing in a
 * column, swelling and drifting as they go; black and near solid low down,
 * greyer and thinner and more ragged high up, where it's all but gone. Lit
 * a little along the top of each lump. Translucent: it's air.
 */
function smokeRects(frame: number): PixelRect[] {
	const blobs: [number, number, number][] = []
	for (let i = 0; i < 11; i++) {
		const t = i / 10
		blobs.push([
			24 + Math.sin(i * 1.4 + frame * 2.09) * (3 + i * 1.1) + t * 6,
			SMOKE_ROWS - 8 - i * 6 - ((frame * 2) % 3),
			8.5 + i * 0.9,
		])
	}
	// A few lumps the side of the column, shifting from frame to frame.
	blobs.push(
		[14 + frame * 2, 54 - frame * 2, 6],
		[36 - frame * 2, 42 + frame, 7],
		[18 + frame, 28 - frame * 2, 6],
	)
	const density = (x: number, y: number) => {
		let d = 0
		for (const [bx, by, r] of blobs) {
			const dist = Math.hypot(x + 0.5 - bx, (y + 0.5 - by) * 1.1)
			d = Math.max(d, 1 - dist / r)
		}
		return d
	}
	const filled = (x: number, y: number) => {
		const height = 1 - y / SMOKE_ROWS
		// Thinner and more ragged with height: more of its cells let go.
		return density(x, y) > 0.05 + height * 0.3 * scatter(x, y) + height * 0.08
	}
	return paint(0, 0, SMOKE_COLUMNS, SMOKE_ROWS, (x, y) => {
		if (!filled(x, y)) return undefined
		const height = 1 - y / SMOKE_ROWS
		const top = !filled(x, y - 1)
		const grey = 26 + height * 95 + (top ? 26 : 0)
		const alpha = 0.92 - height * 0.62
		return `#${hex2(grey)}${hex2(grey - 2)}${hex2(grey - 2)}${hex2(alpha * 255)}`
	})
}

export const SMOKE: SecretProp = prop(
	SMOKE_COLUMNS,
	SMOKE_ROWS,
	[0, 1, 2].map(smokeRects),
	{ hung: 170 },
)

// --- The gauge board ----------------------------------------------------------

/**
 * A gauge board, bolted to the wall, 44 by 26: a row of five dials, brass-
 * rimmed, their needles at different readings, a red lamp and a green over
 * a row of switches, and a label plate along its foot.
 */
function gaugeBoardRects(): PixelRect[] {
	const readings: [number, number][] = [
		[2, -2],
		[0, -3],
		[-2, -1],
		[3, 0],
		[-1, 2],
	]
	return [
		// The board: steel, lit along its top, bolted at the corners.
		[0, 0, 44, 26, STEEL_DARK],
		[0, 0, 44, 2, STEEL],
		[0, 0, 44, 1, STEEL_LIT],
		[0, 24, 44, 2, INK],
		...[2, 40].flatMap((x): PixelRect[] => [
			[x, 2, 2, 2, STEEL],
			[x, 22, 2, 2, STEEL],
		]),
		// A panel in it, a shade darker.
		[4, 4, 36, 18, '#4b5258'],
		[4, 4, 36, 1, '#6a7178'],
		// Its dials.
		...readings.flatMap(([tx, ty], i) => dial(6 + i * 7, 6, 6, tx, ty)),
		// Lamps: red, and green; two switches.
		[6, 15, 3, 3, FIRE_RED],
		[6, 15, 3, 1, RED_LIT],
		[11, 15, 3, 3, GREEN_LAMP],
		[11, 15, 3, 1, '#7ee08c'],
		...[18, 22].flatMap((x): PixelRect[] => [
			[x, 15, 3, 4, INK],
			[x + 1, 14, 1, 3, STEEL_LIT],
		]),
		// A label plate along its foot, brass, its engraving in ink.
		[26, 15, 12, 4, BRASS_SHADE],
		[26, 15, 12, 3, BRASS],
		[26, 15, 12, 1, BRASS_LIT],
		...[28, 30, 32, 34, 36].map((x): PixelRect => [x, 16, 1, 1, INK]),
		...[28, 31, 34].map((x): PixelRect => [x, 17, 2, 1, BRASS_SHADE]),
		// A cable gland under it, and its pipes' unions.
		[20, 22, 4, 2, STEEL],
		[8, 22, 4, 2, STEEL],
	]
}

export const GAUGE_BOARD: SecretProp = prop(44, 26, [gaugeBoardRects()], {
	hung: 190,
})

// --- The telegraph ------------------------------------------------------------

/**
 * A ship's engine order telegraph on its pedestal, brass, 16 by 40: the
 * round dial at its top, a white face, red and black sectors round it, the
 * pointer at FULL AHEAD; its handle, a rod with a knob, out of its side; its
 * pedestal, flared at the foot, bolted down.
 */
function telegraphRects(): PixelRect[] {
	const cx = 8
	const cy = 7.5
	const dialFace = (x: number, y: number) => {
		const dx = x + 0.5 - cx
		const dy = y + 0.5 - cy
		const r = Math.hypot(dx, dy)
		if (r > 7.4) return undefined
		if (r > 6.1) return dy < -2.5 ? BRASS_LIT : dy > 3 ? BRASS_SHADE : BRASS
		// The ring of sectors: red to starboard, black to port, white between.
		const angle = (Math.atan2(-dy, dx) * 180) / Math.PI
		if (r > 4.1) {
			if (angle > 15 && angle < 80) return RED
			if (angle > 100 && angle < 165) return INK
			if (angle < -15 && angle > -80) return RED_DARK
			if (angle < -100 && angle > -165) return '#3a4046'
			return '#f3f1e8'
		}
		return '#f3f1e8'
	}
	return [
		// Its pedestal: a column, flared at the foot, bolted.
		[6, 15, 4, 20, BRASS],
		[6, 15, 1, 20, BRASS_LIT],
		[9, 15, 1, 20, BRASS_SHADE],
		[4, 33, 8, 3, BRASS],
		[4, 33, 8, 1, BRASS_LIT],
		[2, 36, 12, 4, BRASS_SHADE],
		[2, 36, 12, 1, BRASS],
		[3, 38, 1, 1, INK],
		[12, 38, 1, 1, INK],
		// A collar on the column.
		[5, 24, 6, 2, BRASS_LIT],
		[5, 25, 6, 1, BRASS_SHADE],
		// The handle: a rod out of its side, a knob on it.
		[10, 18, 4, 2, BRASS],
		[10, 18, 4, 1, BRASS_LIT],
		[13, 16, 3, 6, BRASS],
		[13, 16, 3, 1, BRASS_LIT],
		[13, 21, 3, 1, BRASS_SHADE],
		// The dial.
		...paint(0, 0, 16, 16, dialFace),
		// Its pointer, hub to FULL AHEAD, upper right; a hub.
		[9, 6, 1, 1, INK],
		[10, 5, 1, 1, INK],
		[11, 4, 1, 1, INK],
		[12, 3, 1, 1, NEEDLE],
		[8, 7, 2, 2, INK],
	]
}

export const TELEGRAPH: SecretProp = prop(16, 40, [telegraphRects()])
