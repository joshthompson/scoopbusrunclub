import type { SecretProp } from '../types'
import {
	type PixelRect,
	pixelArt,
	pixelText,
	pixelTextWidth,
	svgUrl,
} from './pixelArt'

/**
 * The fittings of Scoop Cruises' ferry below decks, drawn in code, in cells
 * twice the size of a screen pixel: along the service passage under the
 * stairs, a poster for the muster station, a stencil for the engine room, a
 * ladder to a hatch; and in the low engine room under the shop, a pump on
 * its bedplate, drums of oil, a workbench with its vice, a board of tools
 * each painted round, a fuse box, a fan, a caged lamp, a hose reel, a
 * pipe joint hissing steam, and, nowhere near the fire, a sign that says no
 * smoking.
 */

const CELL = 2

/** Steel, lit and in shadow, and ink for the small details. */
const STEEL = '#8d949b'
const STEEL_LIT = '#b9c0c6'
const STEEL_DARK = '#5d646b'
const STEEL_DEEP = '#3f464c'
const INK = '#1e2328'
const BRASS = '#c9a24a'
const BRASS_LIT = '#e8c66a'
const RED = '#c8312b'
const RED_LIT = '#e35a4b'
const RED_DARK = '#8f1f1b'
const HAZARD = '#f0c419'
const WHITE = '#f1efe6'

const prop = (
	columns: number,
	rows: number,
	rects: PixelRect[][],
	more: Partial<SecretProp> = {},
): SecretProp => ({
	frames: rects.map((frame) => pixelArt(columns, rows, frame)),
	width: columns * CELL,
	height: rows * CELL,
	...more,
})

/**
 * Cells painted by `paint`, the colour it gives for each cell (or none),
 * as rects: a row's runs of one colour joined.
 */
function paintRects(
	width: number,
	height: number,
	paint: (x: number, y: number) => string | undefined,
): PixelRect[] {
	const out: PixelRect[] = []
	for (let y = 0; y < height; y++) {
		let from = 0
		let run = paint(0, y)
		for (let x = 1; x <= width; x++) {
			const now = x < width ? paint(x, y) : undefined
			if (now === run && x < width) continue
			if (run) out.push([from, y, x - from, 1, run])
			from = x
			run = now
		}
	}
	return out
}

/** How far the middle of cell `x`, `y` is from the point `cx`, `cy`. */
const away = (x: number, y: number, cx: number, cy: number) =>
	Math.hypot(x + 0.5 - cx, y + 0.5 - cy)

/** A round thing's cells, `radius` round `cx`, `cy`: lit along its top, in shade along its foot. */
function disc(
	cx: number,
	cy: number,
	radius: number,
	base: string,
	lit: string,
	shade: string,
): PixelRect[] {
	const size = Math.ceil(radius * 2) + 2
	const left = Math.floor(cx - radius) - 1
	const top = Math.floor(cy - radius) - 1
	return paintRects(size, size, (x, y) => {
		const d = away(x + left, y + top, cx, cy)
		if (d > radius) return undefined
		const up = (cy - (y + top + 0.5)) / radius
		return up > 0.6 ? lit : up < -0.55 ? shade : base
	}).map(([x, y, w, h, fill]) => [x + left, y + top, w, h, fill])
}

// --- The pump -------------------------------------------------------------------

/** A motor, blue-grey, lit and in shadow: not the engine room's green-grey. */
const MOTOR = '#5f7f9a'
const MOTOR_LIT = '#86a6bf'
const MOTOR_SHADE = '#46627a'

/**
 * A centrifugal pump on its bedplate, driven by a motor: the motor, blue-grey,
 * finned, a terminal box on its back; the yellow guard over the coupling; the
 * red volute casing, its bolted eye, the suction flange; and the discharge
 * pipe up out of it, flanged, a handwheel on its valve. 34 by 22.
 */
export const PUMP: SecretProp = prop(34, 22, [
	[
		// The bedplate, bolted down.
		[0, 19, 34, 3, STEEL_DARK],
		[0, 19, 34, 1, STEEL],
		...[2, 15, 19, 31].map((x): PixelRect => [x, 20, 1, 1, INK]),
		// The motor, round-shouldered, its feet, its fins, its plate.
		[3, 17, 3, 2, STEEL_DARK],
		[11, 17, 3, 2, STEEL_DARK],
		[1, 7, 14, 10, MOTOR],
		[2, 6, 12, 1, MOTOR_LIT],
		[1, 7, 14, 1, MOTOR_LIT],
		[1, 14, 14, 3, MOTOR_SHADE],
		...[3, 5, 7, 9, 11, 13].map((x): PixelRect => [x, 8, 1, 7, MOTOR_SHADE]),
		[0, 9, 1, 6, MOTOR_SHADE],
		[2, 11, 1, 2, BRASS],
		// A terminal box on its back, and its cable.
		[8, 3, 5, 3, STEEL],
		[8, 3, 5, 1, STEEL_LIT],
		[10, 0, 1, 3, STEEL_DARK],
		// The coupling, and its yellow guard.
		[15, 11, 4, 3, STEEL_DARK],
		[15, 9, 4, 8, HAZARD],
		[15, 9, 4, 1, '#f7dc5a'],
		[16, 12, 2, 1, INK],
		// The volute casing, red, round, its foot.
		[21, 18, 8, 1, RED_DARK],
		...disc(25, 14, 6, RED, RED_LIT, RED_DARK),
		// Its eye: a bolted cover, steel.
		...disc(25, 14, 3, RED_DARK, RED_DARK, RED_DARK),
		...disc(25, 14, 2, STEEL, STEEL_LIT, STEEL_DARK),
		[25, 14, 1, 1, INK],
		// The suction flange, to the right of it.
		[30, 12, 2, 4, RED_DARK],
		[32, 10, 2, 8, STEEL],
		[32, 10, 2, 1, STEEL_LIT],
		[32, 17, 2, 1, STEEL_DARK],
		[33, 12, 1, 1, INK],
		[33, 15, 1, 1, INK],
		// The discharge pipe, up out of its top: red, flanged top and foot.
		[24, 0, 4, 8, RED],
		[24, 0, 1, 8, RED_LIT],
		[27, 0, 1, 8, RED_DARK],
		[23, 0, 6, 2, STEEL],
		[23, 0, 6, 1, STEEL_LIT],
		[23, 7, 6, 1, STEEL_DARK],
		// Its valve, a stem out to the left, and the handwheel on it, brass, seen face on.
		[22, 3, 8, 3, STEEL_DARK],
		[22, 3, 8, 1, STEEL],
		[19, 5, 3, 1, STEEL_DARK],
		...paintRects(7, 7, (x, y) => {
			const d = away(x, y, 3.5, 3.5)
			if (d > 3.6) return undefined
			if (d < 1) return BRASS_LIT
			if (d < 2.4) return x === 3 || y === 3 ? BRASS : undefined
			return y < 2 ? BRASS_LIT : BRASS
		}).map(([x, y, w, h, fill]): PixelRect => [x + 16, y + 2, w, h, fill]),
	],
])

// --- Oil ------------------------------------------------------------------------

const DRUM_BLUE = '#2f6ea8'
const DRUM_BLUE_LIT = '#5a95cc'
const DRUM_BLUE_SHADE = '#1f4d7a'
const OIL = '#262b36'
const OIL_SHINE = '#8fa3c0'

/** A standing drum: its lid lit, ribbed round its waist, its bung, its shaded side and foot. */
function drum(
	x: number,
	y: number,
	w: number,
	h: number,
	base: string,
	lit: string,
	shade: string,
): PixelRect[] {
	return [
		[x, y + 1, w, h - 1, base],
		[x + 1, y, w - 2, 1, lit],
		[x, y + 1, w, 1, lit],
		[x + 1, y + 2, w - 2, 1, lit],
		[x + w - 3, y + 1, 2, 1, INK],
		// Two ribs: a lit shoulder over a dark underside.
		...[4, h - 5].flatMap((at): PixelRect[] => [
			[x, y + at, w, 1, lit],
			[x, y + at + 1, w, 1, shade],
		]),
		// The side away from the light, and the foot.
		[x + w - 1, y + 3, 1, h - 3, shade],
		[x, y + h - 1, w, 1, shade],
	]
}

/**
 * Three oil drums: a blue one, stencilled; a red one, with a yellow
 * flammable diamond; and a blue one lying on its side, leaking, a shine of
 * oil on the floor at their feet. 34 by 22.
 */
export const OIL_DRUMS: SecretProp = prop(34, 22, [
	[
		...drum(0, 6, 9, 16, DRUM_BLUE, DRUM_BLUE_LIT, DRUM_BLUE_SHADE),
		// Stencilled, in white.
		[2, 12, 5, 1, WHITE],
		[2, 14, 3, 1, WHITE],
		...drum(10, 6, 9, 16, RED, RED_LIT, RED_DARK),
		// Its diamond: yellow, a flame on it.
		[14, 11, 1, 1, HAZARD],
		[13, 12, 3, 1, HAZARD],
		[12, 13, 5, 1, HAZARD],
		[13, 14, 3, 1, HAZARD],
		[14, 15, 1, 1, HAZARD],
		[14, 13, 1, 1, RED_DARK],
		// The one on its side: round ends, ribs across it, its bung up.
		[21, 12, 13, 10, DRUM_BLUE],
		[22, 11, 11, 1, DRUM_BLUE_LIT],
		[21, 12, 13, 2, DRUM_BLUE_LIT],
		[21, 20, 13, 2, DRUM_BLUE_SHADE],
		[33, 14, 1, 6, DRUM_BLUE_SHADE],
		...[24, 29].flatMap((x): PixelRect[] => [
			[x, 12, 1, 10, DRUM_BLUE_LIT],
			[x + 1, 14, 1, 7, DRUM_BLUE_SHADE],
		]),
		[21, 14, 1, 6, DRUM_BLUE_SHADE],
		[26, 14, 2, 1, INK],
		// The oil that's got out of it, across the floor, and its shine.
		[14, 21, 17, 1, OIL],
		[17, 20, 7, 1, OIL],
		[19, 21, 4, 1, OIL_SHINE],
		[18, 20, 2, 1, OIL_SHINE],
		[27, 21, 2, 1, OIL_SHINE],
	],
])

// --- The workbench --------------------------------------------------------------

const BENCH = '#3f5468'
const BENCH_LIT = '#5a7590'
const BENCH_SHADE = '#2c3d4d'
const VICE = '#3a3f4a'
const VICE_LIT = '#5d6573'

/**
 * A steel workbench, blue-grey: a vice at one end, a red toolbox, a spanner
 * lying on its top; a drawer unit under it, and a shelf with a tin of grease
 * and a can. 44 by 24.
 */
export const WORKBENCH: SecretProp = prop(44, 24, [
	[
		// Its legs, and the shelf between them.
		[1, 12, 2, 12, BENCH],
		[1, 12, 1, 12, BENCH_LIT],
		[3, 13, 25, 2, BENCH_SHADE],
		[3, 19, 25, 2, BENCH],
		[3, 19, 25, 1, BENCH_LIT],
		// A tin of grease on the shelf, and a can of oil.
		[6, 15, 6, 4, BRASS],
		[6, 15, 6, 1, BRASS_LIT],
		[6, 17, 6, 1, WHITE],
		[15, 14, 3, 5, DRUM_BLUE],
		[15, 14, 3, 1, DRUM_BLUE_LIT],
		[18, 15, 2, 1, STEEL_DARK],
		// The drawer unit: two drawers, handles, a keyhole.
		[28, 12, 15, 12, BENCH],
		[28, 12, 1, 12, BENCH_LIT],
		[42, 12, 1, 12, BENCH_SHADE],
		[30, 13, 11, 5, BENCH_LIT],
		[30, 17, 11, 1, BENCH_SHADE],
		[30, 19, 11, 4, BENCH_LIT],
		[30, 22, 11, 1, BENCH_SHADE],
		[33, 15, 5, 1, STEEL_LIT],
		[33, 20, 5, 1, STEEL_LIT],
		[39, 14, 1, 1, INK],
		// Its top, steel, lit along its edge, shaded under it.
		[0, 10, 44, 2, STEEL],
		[0, 10, 44, 1, STEEL_LIT],
		[0, 12, 44, 1, STEEL_DARK],
		// The vice, bolted to it: body, fixed jaw, moving jaw, its handle.
		[4, 7, 7, 3, VICE],
		[4, 7, 7, 1, VICE_LIT],
		[8, 4, 3, 3, VICE],
		[8, 4, 3, 1, VICE_LIT],
		[4, 5, 3, 2, VICE_LIT],
		[0, 8, 4, 1, STEEL_LIT],
		[0, 7, 1, 3, STEEL],
		// The toolbox: red, its lid line, handle and latches.
		[14, 5, 13, 5, RED],
		[14, 5, 13, 1, RED_LIT],
		[14, 7, 13, 1, RED_DARK],
		[14, 9, 13, 1, RED_DARK],
		[18, 3, 5, 1, STEEL_DARK],
		[18, 3, 1, 2, STEEL_DARK],
		[22, 3, 1, 2, STEEL_DARK],
		[16, 7, 2, 2, STEEL_LIT],
		[23, 7, 2, 2, STEEL_LIT],
		// A spanner, lying on it: an open jaw, a ring.
		[30, 8, 3, 2, STEEL_LIT],
		[30, 9, 2, 1, STEEL_DARK],
		[33, 9, 7, 1, STEEL_LIT],
		[39, 8, 3, 2, STEEL],
		[40, 8, 1, 1, STEEL_DARK],
	],
])

// --- The tool board -------------------------------------------------------------

const PEG = '#9a7b52'
const PEG_LIT = '#b79a6e'
const PEG_SHADE = '#745a39'
const PEG_HOLE = '#5f4a2f'
const PAINT = '#e6dec4'
const GRIP = '#b0763a'

/** The tools, each as rects at `x`, `y`, 6 wide by 14 tall: a spanner, a hammer, an adjustable wrench, a screwdriver. */
const tools: Record<string, (x: number, y: number) => PixelRect[]> = {
	spanner: (x, y) => [
		[x + 1, y, 1, 4, STEEL_LIT],
		[x + 4, y, 1, 4, STEEL],
		[x + 1, y + 3, 4, 1, STEEL],
		[x + 2, y + 4, 2, 7, STEEL],
		[x + 2, y + 4, 1, 7, STEEL_LIT],
		[x + 1, y + 11, 4, 3, STEEL],
		[x + 1, y + 11, 4, 1, STEEL_LIT],
		[x + 2, y + 12, 2, 1, PEG_SHADE],
	],
	hammer: (x, y) => [
		[x + 1, y, 4, 4, STEEL_DARK],
		[x + 1, y, 4, 1, STEEL_LIT],
		[x + 2, y + 4, 2, 10, GRIP],
		[x + 2, y + 4, 1, 10, '#cf9250'],
		[x + 2, y + 13, 2, 1, PEG_SHADE],
	],
	wrench: (x, y) => [
		[x + 1, y, 4, 5, STEEL],
		[x + 1, y, 4, 1, STEEL_LIT],
		[x + 2, y, 2, 3, PEG_SHADE],
		[x + 4, y + 3, 1, 2, BRASS],
		[x + 2, y + 5, 2, 9, STEEL],
		[x + 2, y + 5, 1, 9, STEEL_LIT],
		[x + 2, y + 9, 2, 5, RED],
		[x + 2, y + 9, 1, 5, RED_LIT],
	],
	screwdriver: (x, y) => [
		[x + 2, y, 2, 5, STEEL],
		[x + 3, y + 5, 1, 8, STEEL],
	],
}

/**
 * A pegboard on the wall, tools hung on it, each tool's outline painted
 * round where it goes: a spanner, a hammer, an adjustable wrench, and, its
 * outline empty, nobody's put back the screwdriver. 32 by 20.
 */
export const TOOL_BOARD: SecretProp = prop(
	32,
	20,
	[
		[
			// The board, a rim shaded to its foot.
			[0, 0, 32, 20, PEG],
			[0, 0, 32, 1, PEG_LIT],
			[0, 0, 1, 20, PEG_LIT],
			[31, 0, 1, 20, PEG_SHADE],
			[0, 19, 32, 1, PEG_SHADE],
			// Its holes, a few.
			...[2, 6, 10, 14, 18, 22, 26, 30].flatMap((x) =>
				[2, 10, 18].map((y): PixelRect => [x, y, 1, 1, PEG_HOLE]),
			),
			// Each tool's outline, painted, one cell bigger all round, and the tool on it.
			...(['spanner', 'hammer', 'wrench', 'screwdriver'] as const).flatMap(
				(name, i): PixelRect[] => {
					const x = 2 + i * 7
					const y = 3
					const tool = tools[name](x, y)
					const outline = tool.map(
						([tx, ty, tw, th]): PixelRect => [
							tx - 1,
							ty - 1,
							tw + 2,
							th + 2,
							PAINT,
						],
					)
					return name === 'screwdriver' ? outline : [...outline, ...tool]
				},
			),
		],
	],
	{ hung: 52 },
)

// --- The fuse box ---------------------------------------------------------------

const BOX = '#9aa0a6'
const BOX_LIT = '#c1c7cc'
const BOX_SHADE = '#6f767d'

/**
 * A fuse box, grey, on the wall: a hazard triangle on its door, a lamp, a
 * handle; and its conduit, up out of it, clipped to the wall. 16 by 26.
 */
export const FUSE_BOX: SecretProp = prop(
	16,
	26,
	[
		[
			// The conduit, and its clips.
			[7, 0, 2, 12, STEEL],
			[7, 0, 1, 12, STEEL_LIT],
			...[2, 7].map((y): PixelRect => [6, y, 4, 1, STEEL_DARK]),
			// The box, and its door.
			[0, 11, 16, 15, BOX],
			[0, 11, 16, 1, BOX_LIT],
			[0, 24, 16, 2, BOX_SHADE],
			[15, 12, 1, 12, BOX_SHADE],
			[2, 13, 12, 11, '#868d94'],
			[2, 13, 12, 1, BOX_LIT],
			[13, 14, 1, 10, BOX_SHADE],
			// The hazard triangle: yellow, ink along its foot, a bar and a dot.
			[7, 14, 2, 2, HAZARD],
			[6, 16, 4, 2, HAZARD],
			[5, 18, 6, 2, HAZARD],
			[4, 20, 8, 2, HAZARD],
			[4, 21, 8, 1, INK],
			[7, 16, 2, 2, INK],
			[7, 19, 2, 1, INK],
			// A lamp, red, and a handle.
			[3, 14, 2, 2, RED_LIT],
			[12, 17, 1, 4, INK],
			// Its hinges.
			[2, 14, 1, 2, STEEL_DARK],
			[2, 21, 1, 2, STEEL_DARK],
		],
	],
	{ hung: 44 },
)

// --- The fan --------------------------------------------------------------------

/**
 * A ventilation fan, in its square housing on the wall, by `frame`: three
 * curved blades, a third of a turn between frames, so the three of them loop
 * round without a jump. 22 by 22.
 */
const fanRects = (frame: number): PixelRect[] => [
	// The housing, bolted at its corners.
	[0, 0, 22, 22, STEEL],
	[0, 0, 22, 1, STEEL_LIT],
	[0, 21, 22, 1, STEEL_DARK],
	[21, 1, 1, 20, STEEL_DARK],
	...[1, 20].flatMap((x) =>
		[1, 19].map((y): PixelRect => [x, y, 1, 1, STEEL_DEEP]),
	),
	...paintRects(22, 22, (x, y) => {
		const d = away(x, y, 11, 11)
		if (d > 10.3) return undefined
		// The guard ring, round the opening.
		if (d > 9.3) return y < 11 ? STEEL_LIT : STEEL_DARK
		if (d < 2.2) return d < 1.1 ? STEEL_LIT : STEEL_DARK
		// The blades: each a curved sweep of 60 degrees in 120, turning.
		const angle =
			(Math.atan2(y + 0.5 - 11, x + 0.5 - 11) * 180) / Math.PI +
			frame * 40 -
			d * 7
		const sweep = ((angle % 120) + 120) % 120
		if (sweep < 62) return y < 11 ? '#c4cbd1' : '#aab2b9'
		return '#232a30'
	}),
]

export const VENT_FAN: SecretProp = prop(
	22,
	22,
	[0, 1, 2].map((frame) => fanRects(frame)),
	{ hung: 60 },
)

// --- The lamp -------------------------------------------------------------------

const LAMP_GLASS = '#ffd76a'
const LAMP_CORE = '#fff4c0'

/** A caged bulkhead lamp, `lit` or flickering: the bracket, the dome, the wire cage over it. */
const lampRects = (glass: string, core: string): PixelRect[] => [
	// Its bracket, and cap.
	[3, 0, 2, 1, STEEL_DARK],
	[2, 1, 4, 1, STEEL],
	// The dome, glowing.
	[2, 2, 4, 1, glass],
	[1, 3, 6, 3, glass],
	[3, 3, 2, 2, core],
	// The cage: two wires over it, a hoop.
	[2, 2, 1, 4, STEEL_DEEP],
	[5, 2, 1, 4, STEEL_DEEP],
	[1, 4, 6, 1, STEEL_DEEP],
	// Its base plate.
	[1, 6, 6, 2, STEEL_DARK],
	[1, 6, 6, 1, STEEL],
]

/**
 * A bulkhead lamp, a dome in a wire cage on its bracket, warm, and now and
 * then not quite. 8 by 8, light all round it.
 */
export const BULKHEAD_LAMP: SecretProp = prop(
	8,
	8,
	[lampRects(LAMP_GLASS, LAMP_CORE), lampRects('#d9a94a', LAMP_GLASS)],
	{ hung: 90, glow: { x: 0, y: 98, reach: 70, colour: '#ffd76a' } },
)

// --- The hose reel --------------------------------------------------------------

/**
 * A fire hose reel, on the wall: a red drum, the hose wound round in black
 * rubber, a brass hub, and its brass nozzle in its clip below. 16 by 18.
 */
export const HOSE_REEL: SecretProp = prop(
	16,
	18,
	[
		[
			// The nozzle, hanging at its foot, in its clip.
			[6, 15, 4, 3, BRASS],
			[6, 15, 4, 1, BRASS_LIT],
			[5, 15, 6, 1, STEEL_DARK],
			// The reel: red rims, the hose wound in rings, the hub.
			...paintRects(16, 16, (x, y) => {
				const d = away(x, y, 8, 8)
				if (d > 8) return undefined
				const up = 8 - (y + 0.5)
				if (d > 6.6) return up > 4.5 ? RED_LIT : up < -4.5 ? RED_DARK : RED
				if (d > 3.4) {
					const ring = Math.floor(d - 3.4)
					return ring % 2 === 0 ? '#8c866f' : up > 0 ? '#d6cfb6' : '#b8b199'
				}
				if (d > 1.9) return up > 0 ? RED_LIT : RED_DARK
				return d > 1 ? BRASS : BRASS_LIT
			}),
		],
	],
	{ hung: 48 },
)

// --- The ladder -----------------------------------------------------------------

/**
 * A steel ladder up the wall to a hatch in the deck: two rails, rungs
 * between them, brackets to the wall, and at its top the hatch, a dark
 * square ringed with yellow and black, the rails going in. 12 by 52.
 */
export const LADDER: SecretProp = prop(
	12,
	52,
	[
		[
			// The hatch, up in the deck.
			[0, 0, 12, 7, HAZARD],
			...[0, 4, 8].map((x): PixelRect => [x, 0, 2, 7, INK]),
			[2, 1, 8, 5, '#14181c'],
			[2, 1, 8, 1, '#2a3036'],
			// The rails, and the rungs between them, a lit edge on each.
			[1, 7, 2, 45, STEEL],
			[1, 7, 1, 45, STEEL_LIT],
			[9, 7, 2, 45, STEEL_DARK],
			[9, 7, 1, 45, STEEL],
			...Array.from({ length: 9 }, (_, i): PixelRect[] => [
				[3, 10 + i * 5, 6, 1, STEEL_LIT],
				[3, 11 + i * 5, 6, 1, STEEL_DARK],
			]).flat(),
			// Brackets to the wall.
			...[16, 36].map((y): PixelRect => [0, y, 12, 1, STEEL_DEEP]),
			// The foot of each rail, bolted.
			[1, 51, 2, 1, STEEL_DARK],
			[9, 51, 2, 1, STEEL_DEEP],
		],
	],
	{ hung: 6 },
)

// --- Signs ----------------------------------------------------------------------

const SIGN_RED = '#d02a22'
const CIGARETTE = '#9096a0'
const EMBER = '#e5532a'
const FILTER = '#d98a3a'

/**
 * NO SMOKING: a white sign, a red ring and bar over a cigarette, its ember
 * lit. The next room is on fire. 14 by 14.
 */
export const NO_SMOKING: SecretProp = prop(
	14,
	14,
	[
		[
			[1, 0, 12, 14, WHITE],
			[0, 1, 14, 12, WHITE],
			[1, 13, 12, 1, '#cfccc0'],
			// The cigarette: its filter, its paper, its ember.
			[3, 7, 3, 2, FILTER],
			[6, 7, 5, 2, CIGARETTE],
			[11, 7, 1, 2, EMBER],
			[3, 7, 8, 1, '#b4b9c0'],
			// The ring and its bar, over it.
			...paintRects(14, 14, (x, y) => {
				const d = away(x, y, 7, 7)
				if (d <= 6.2 && d >= 4.4) return SIGN_RED
				if (d < 4.4 && Math.abs(x - y) <= 1) return SIGN_RED
				return undefined
			}),
		],
	],
	{ hung: 70 },
)

const STENCIL = 'ENGINE ROOM 2 →'
const STENCIL_WIDTH = pixelTextWidth(STENCIL, CELL) + 16
const STENCIL_HEIGHT = 7 * CELL + 14

/**
 * A stencilled wall marking, ENGINE ROOM 2 and an arrow, in yellow paint on
 * a dark band, the way it's done below decks. 97 by 14 cells.
 */
export const DECK_STENCIL: SecretProp = {
	frames: [
		svgUrl(
			STENCIL_WIDTH,
			STENCIL_HEIGHT,
			[
				`<rect width="${STENCIL_WIDTH}" height="${STENCIL_HEIGHT}" fill="#2c322f"/>`,
				`<rect width="${STENCIL_WIDTH}" height="2" fill="#434a46"/>`,
				`<rect y="${STENCIL_HEIGHT - 2}" width="${STENCIL_WIDTH}" height="2" fill="#1e2321"/>`,
				pixelText(STENCIL, 8, 7, CELL, '#e0b72a'),
			].join(''),
		),
	],
	width: STENCIL_WIDTH,
	height: STENCIL_HEIGHT,
	hung: 70,
}

// --- The muster poster ----------------------------------------------------------

const POSTER_FRAME = '#6b6357'
const POSTER_GREEN = '#2e8b57'
const POSTER_WAVE = '#a8d8bc'

/** Three by five letters, for a poster too small for the five by seven ones: only the ones it needs. */
const TINY: Record<string, string[]> = {
	M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
	U: ['#.#', '#.#', '#.#', '#.#', '###'],
	S: ['###', '#..', '###', '..#', '###'],
	T: ['###', '.#.', '.#.', '.#.', '.#.'],
	E: ['###', '#..', '##.', '#..', '###'],
	R: ['##.', '#.#', '##.', '#.#', '#.#'],
	A: ['.#.', '#.#', '###', '#.#', '#.#'],
	I: ['###', '.#.', '.#.', '.#.', '###'],
	O: ['###', '#.#', '#.#', '#.#', '###'],
	N: ['###', '#.#', '#.#', '#.#', '#.#'],
}

/** `text` in the tiny letters, as rects, its top left at `x`, `y`, white. */
function tinyText(text: string, x: number, y: number): PixelRect[] {
	const out: PixelRect[] = []
	let at = x
	for (const char of text) {
		const rows = TINY[char]
		rows.forEach((row, r) => {
			for (let c = 0; c < row.length; c++)
				if (row[c] === '#') out.push([at + c, y + r, 1, 1, WHITE])
		})
		at += rows[0].length + 1
	}
	return out
}

/**
 * A safety poster, framed, for the cream passage: MUSTER STATION in white on
 * safety green, a lifeboat on the waves, and an arrow to it. 32 by 22.
 */
export const PASSAGE_POSTER: SecretProp = prop(
	32,
	22,
	[
		[
			[0, 0, 32, 22, POSTER_FRAME],
			[1, 1, 30, 20, POSTER_GREEN],
			[1, 1, 30, 1, '#3da368'],
			...tinyText('MUSTER', 3, 3),
			...tinyText('STATION', 2, 9),
			// A lifeboat: its hull, its canopy, its windows; on a wave.
			[3, 18, 15, 1, WHITE],
			[4, 19, 13, 1, WHITE],
			[6, 16, 9, 2, WHITE],
			...[8, 10, 12].map((x): PixelRect => [x, 17, 1, 1, POSTER_GREEN]),
			...[3, 7, 11, 15].map((x): PixelRect => [x, 20, 2, 1, POSTER_WAVE]),
			// And an arrow, pointing the way.
			[21, 18, 7, 1, WHITE],
			[26, 16, 1, 5, WHITE],
			[27, 17, 1, 3, WHITE],
			[28, 18, 1, 1, WHITE],
		],
	],
	{ hung: 46 },
)

// --- Steam ----------------------------------------------------------------------

const PIPE_YELLOW = '#d8a62a'
const PIPE_YELLOW_LIT = '#f0c84a'
const PIPE_YELLOW_SHADE = '#a67c1c'

/**
 * A pipe, yellow, flanged at a joint, by `frame`: steam hissing up out of the
 * gasket, puffs of it rising, spreading and thinning out, three of them a
 * frame apart, so they loop. The frame (0 to 2) is how far they've risen.
 */
const steamRects = (frame: number): PixelRect[] => {
	const out: PixelRect[] = [
		// The pipe, across the foot, and its two flanges either side of the gap.
		[0, 12, 20, 4, PIPE_YELLOW],
		[0, 12, 20, 1, PIPE_YELLOW_LIT],
		[0, 15, 20, 1, PIPE_YELLOW_SHADE],
		[7, 11, 1, 6, STEEL],
		[10, 11, 1, 6, STEEL],
		[7, 11, 1, 1, STEEL_LIT],
		[10, 11, 1, 1, STEEL_LIT],
		[8, 12, 2, 4, INK],
		[8, 11, 2, 1, '#ffffff'],
	]
	for (let i = 0; i < 3; i++) {
		const t = ((i + frame) % 3) / 3
		const cx = 9 + Math.round(t * 4 + Math.sin(t * 6) * 1.2)
		const cy = 10 - Math.round(t * 9)
		const radius = 1.8 + t * 3.4
		const alpha = t < 0.1 ? 0.9 : 0.85 - t * 0.55
		out.push(
			...paintRects(14, 14, (x, y) =>
				away(x, y, radius + 0.5, radius + 0.5) <= radius
					? `rgba(255,255,255,${alpha.toFixed(2)})`
					: undefined,
			).map(
				([x, y, w, h, fill]): PixelRect => [
					x + cx - Math.round(radius),
					y + cy - Math.round(radius),
					w,
					h,
					fill,
				],
			),
		)
	}
	return out
}

export const STEAM_LEAK: SecretProp = prop(
	20,
	16,
	[0, 1, 2].map((frame) => steamRects(frame)),
	{ hung: 76 },
)
