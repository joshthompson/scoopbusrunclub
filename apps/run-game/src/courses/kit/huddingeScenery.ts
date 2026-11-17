import { type PixelRect, letterArt, pixelArt } from './pixelArt'

/**
 * Huddinge's forest life, drawn in code: a family of wild boar, a sow and
 * her striped piglets, and a forest harvester, felling a pine and cutting
 * it into logs. Only to be seen: see `draw/boars.ts` and
 * `draw/harvester.ts`.
 */

/** A cell's size, in screen pixels. */
export const CELL = 2

// --- Wild boar -----------------------------------------------------------------

const BOAR = {
	m: '#2a201a',
	B: '#6b5848',
	b: '#4a3b30',
	d: '#2f251e',
	E: '#3a2e25',
	e: '#111111',
	t: '#3a2e25',
	n: '#8a6a58',
	p: '#c79a8a',
	w: '#f3efe4',
	k: '#1d1d1d',
}

/** The sow's body, facing right: a high, bristly back over her shoulders, her head low, her snout and a tusk at its end. */
const SOW_BODY = [
	'..........m.m.m.........',
	'......BBBmmmmmmmB.E.....',
	'...bBBBBBBBBBBBBbEE.....',
	'..bbbbbbbbbbbbbbbbbeb...',
	'.tbbbbbbbbbbbbbbbbbbbb..',
	't.bbbbbbbbbbbbbbbbbbbbb.',
	'..dbbbbbbbbbbbbbbbbbbnnp',
	'..ddbbbbbbbbbbbbbbbbwnnp',
	'...dddbbbbbbbbbbbbddd...',
	'....ddddddddddddddd.....',
]

/** Her legs, in each frame of her run: stretched out, coming in, gathered under her. */
const SOW_LEGS = [
	[
		'.....dd.dd.....dd.dd....',
		'....dd...dd...dd...dd...',
		'...dd.....dd.dd.....dd..',
		'...kk.....kk.kk.....kk..',
	],
	[
		'.....dd.dd.....dd.dd....',
		'.....dd..dd....dd..dd...',
		'....dd....dd..dd....dd..',
		'....kk....kk..kk....kk..',
	],
	[
		'......dddd......dddd....',
		'......dddd......dddd....',
		'......d..d......d..d....',
		'......k..k......k..k....',
	],
]

/**
 * A wild boar sow, running: dark and bristly, her back high over her
 * shoulders, her head low and her snout out in front. Facing right, 24 by
 * 14, her run four frames, stretched, coming in, gathered, coming in.
 */
export const SOW_FRAMES = [0, 1, 2, 1].map((legs) =>
	letterArt([...SOW_BODY, ...SOW_LEGS[legs]], BOAR),
)
export const SOW_WIDTH = 24 * CELL
export const SOW_HEIGHT = 14 * CELL

const PIGLET = {
	b: '#9a6a3e',
	s: '#e8c48a',
	d: '#5e3e22',
	n: '#c08a6a',
	e: '#111111',
	k: '#1d1d1d',
}

/** A piglet's body, facing right: ginger, cream stripes along its length, as a wild boar's young have. */
const PIGLET_BODY = [
	'...bbbbbbb..',
	'..sssssssbeb',
	'.bbbbbbbbbbn',
	'.sssssssbbdn',
	'..ddddddddd.',
]

const PIGLET_LEGS = [
	['..d.d...d.d.', '.d...d.d...d', '.k...k.k...k'],
	['..d.d...d.d.', '..d..d..d..d', '..k..k..k..k'],
	['...dd...dd..', '...dd...dd..', '...kk...kk..'],
]

/** A wild boar piglet, striped like a humbug, running after its mother: 12 by 8, four frames as hers. */
export const PIGLET_FRAMES = [0, 1, 2, 1].map((legs) =>
	letterArt([...PIGLET_BODY, ...PIGLET_LEGS[legs]], PIGLET),
)
export const PIGLET_WIDTH = 12 * CELL
export const PIGLET_HEIGHT = 8 * CELL

// --- The harvester -------------------------------------------------------------

const YELLOW = '#e8b42a'
const YELLOW_LIT = '#ffd35a'
const YELLOW_SHADE = '#b5851a'
const GLASS = '#2c3a44'
const GLASS_LIT = '#6f8ea0'
const TYRE = '#2b2b2b'
const HUB = '#8a8a8a'
const STEEL = '#6c7378'
const BEACON = '#ff8a2a'
const INK = '#1d1d1d'

/** The harvester's size, in cells: its wheels on its bottom row. */
export const HARVESTER_WIDTH = 66
export const HARVESTER_HEIGHT = 36

/** Where its head hangs, off the end of its crane, its top left, in cells: see `HARVESTER_HEAD`. */
export const HEAD_AT = { x: 55, y: 22 }
/** Where the tree it's felling stands, in cells along: through its head. */
export const TREE_AT = 60
/** Where its exhaust pipe's top is, in cells: smoke comes out of it. */
export const EXHAUST_AT = { x: 10, y: 6 }
/** Where its pile of logs is, in cells along: on the ground under its crane. */
export const PILE_AT = 36

/** A tyre, `x` along, its top `y` down: 8 cells across, a hub in its middle. */
const tyre = (x: number, y: number): PixelRect[] => [
	[x + 2, y, 4, 1, TYRE],
	[x + 1, y + 1, 6, 1, TYRE],
	[x, y + 2, 8, 6, TYRE],
	[x + 1, y + 8, 6, 1, TYRE],
	[x + 2, y + 9, 4, 1, TYRE],
	[x + 3, y + 4, 2, 2, HUB],
]

/** A beam from one point to another, 3 cells thick, lit along its top, shaded under it. */
function beam(x0: number, y0: number, x1: number, y1: number): PixelRect[] {
	const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
	const rects: PixelRect[] = []
	for (let i = 0; i <= steps; i++) {
		const x = Math.round(x0 + ((x1 - x0) * i) / steps)
		const y = Math.round(y0 + ((y1 - y0) * i) / steps)
		rects.push([x, y, 3, 3, YELLOW])
	}
	for (let i = 0; i <= steps; i++) {
		const x = Math.round(x0 + ((x1 - x0) * i) / steps)
		const y = Math.round(y0 + ((y1 - y0) * i) / steps)
		rects.push([x, y, 1, 1, YELLOW_LIT], [x + 2, y + 2, 1, 1, YELLOW_SHADE])
	}
	return rects
}

/**
 * A forest harvester, a big yellow six-wheeler: its engine at the back, its
 * exhaust pipe up off it, its cab at the front, all glass, a beacon on its
 * roof, and its crane up off its back and out over the front, reaching
 * down to where its head grips the tree. Facing right, 66 by 36.
 */
export const harvester = pixelArt(HARVESTER_WIDTH, HARVESTER_HEIGHT, [
	// The crane: up from its pedestal, out over the cab, and down to the head.
	...beam(14, 13, 40, 3),
	...beam(40, 3, 58, 20),
	// Its hydraulic ram, along under the boom.
	...beam(17, 16, 31, 10).map(
		([x, y]): PixelRect => [x + 1, y + 2, 1, 1, STEEL],
	),
	// The exhaust pipe.
	[10, 6, 2, 8, INK],
	[9, 6, 4, 1, STEEL],
	// The engine, at the back, a grille down its end.
	[0, 13, 14, 8, YELLOW],
	[0, 13, 14, 1, YELLOW_LIT],
	[1, 15, 1, 4, YELLOW_SHADE],
	[3, 15, 1, 4, YELLOW_SHADE],
	// The crane's pedestal.
	[13, 12, 5, 9, YELLOW_SHADE],
	[14, 12, 3, 1, YELLOW],
	// The cab: its frame, its glass, the light on it, its roof and beacon.
	[18, 6, 15, 15, YELLOW],
	[20, 8, 11, 9, GLASS],
	[21, 9, 2, 2, GLASS_LIT],
	[23, 11, 1, 1, GLASS_LIT],
	[17, 5, 17, 2, YELLOW_SHADE],
	[24, 3, 3, 2, BEACON],
	// The chassis, and its bogies' shade.
	[0, 21, 35, 4, YELLOW],
	[0, 21, 35, 1, YELLOW_LIT],
	[0, 24, 35, 1, YELLOW_SHADE],
	// Its wheels: one at the back, a bogie of two at the front.
	...tyre(2, 25),
	...tyre(15, 25),
	...tyre(26, 25),
])

/** Its head's colours: yellow, steel, its knives and rollers dark, a light on it. */
const HEAD = {
	g: STEEL,
	G: '#9aa1a6',
	y: YELLOW,
	Y: YELLOW_LIT,
	d: YELLOW_SHADE,
	k: INK,
	o: BEACON,
	s: '#c9ccd0',
}

/**
 * Its head, gripping the tree: its rotator on top, under the crane, its
 * rollers either side, its knives round the trunk. 10 by 10. As it is;
 * sawing, its chain bar out across the trunk, in two frames; and feeding
 * the trunk through, its rollers turning, in two more.
 */
const headArt = (bottom: [string, string]) =>
	letterArt(
		[
			'...gggg...',
			'...gGGg...',
			'yyYYYYYYyy',
			'yYYYYYYYYy',
			'ykyyyyyyky',
			'ykyyyyyyky',
			'yyyyoyyyyy',
			'dddddddddd',
			...bottom,
		],
		HEAD,
	)
export const HARVESTER_HEAD = headArt(['.k......k.', 'kk......kk'])
export const HARVESTER_SAWING = [
	headArt(['.k......k.', 'kksssssskk']),
	headArt(['.k......k.', 'kkssssss.k']),
]
export const HARVESTER_FEEDING = [
	headArt(['.kk....kk.', 'kk......kk']),
	headArt(['.k.k..k.k.', 'kk......kk']),
]

const BARK = '#6a4a2a'
const BARK_SHADE = '#4e3520'
const WOOD = '#e8c48a'
const RINGS = '#c99a5a'

/** A log, cut, lying along: bark down its length, its ends pale and ringed. 12 by 4. */
export const log = pixelArt(12, 4, [
	[0, 0, 12, 4, BARK],
	[1, 0, 10, 1, '#8a6a42'],
	[0, 3, 12, 1, BARK_SHADE],
	[11, 0, 1, 4, WOOD],
	[11, 1, 1, 2, RINGS],
])

/** Its stump, left cut off flat, once the tree's down. 6 by 3. */
export const stump = pixelArt(6, 3, [
	[0, 0, 6, 1, WOOD],
	[2, 0, 2, 1, RINGS],
	[0, 1, 6, 2, BARK],
	[0, 2, 6, 1, BARK_SHADE],
])

/** Where each log goes on its pile, its top left up from the pile's bottom left, in cells: each on the last, a little along. */
export const PILE: { x: number; y: number }[] = [
	{ x: 0, y: 4 },
	{ x: 2, y: 8 },
	{ x: 4, y: 12 },
]
