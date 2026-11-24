import { type PixelRect, letterArt, pixelArt } from '../../courses/kit/pixelArt'

/**
 * Fika Defence's raiders, after the fika on the tables (the geese are
 * Haga's own, `assets/flyers`): a herring gull, flying, its wings up and
 * down, and swept back in a dive; a red squirrel, running, stretched out
 * and bunched up; and a moose, an älg, plodding along on its long pale
 * legs, and with its head down over a table, munching. All facing left.
 */

const CELL = 2
const INK = '#1c1c1c'

// --- The gull -------------------------------------------------------------------

/** A gull, flying, 18 by 12 cells. */
export const GULL_WIDTH = 18 * CELL
export const GULL_HEIGHT = 12 * CELL

const GULL_COLOURS = {
	w: '#f6f6f2',
	s: '#d6dadd',
	g: '#a9b2ba',
	l: '#c3cad0',
	k: '#2a2a2a',
	y: '#f2c430',
	r: '#d8443a',
	e: INK,
}

/**
 * A herring gull, as at the ferry, but flying: white, pale grey wings with
 * black tips, a yellow beak with its red spot. Its wings up over its back,
 * down under it, and folded back along it, diving.
 */
export const GULL = {
	up: letterArt(
		[
			'..........kk......',
			'.........kgk......',
			'.........lgg......',
			'........lggg......',
			'........lgg.......',
			'..ww...lgg........',
			'.wwew.lggww.......',
			'yywwwwwwwwwwwwkkg.',
			'.rwwwwwwwwwwwwssg.',
			'....swwwwwwwss....',
			'......ssss........',
			'..................',
		],
		GULL_COLOURS,
	),
	down: letterArt(
		[
			'..................',
			'..................',
			'..................',
			'..................',
			'..ww..............',
			'.wwew.............',
			'yywwwwwwwwwwwwkkg.',
			'.rwwwwwwlwwwwwssg.',
			'....swwlggwwss....',
			'......lgggs.......',
			'.......lgg........',
			'........kk........',
		],
		GULL_COLOURS,
	),
	dive: letterArt(
		[
			'..................',
			'..................',
			'..................',
			'..................',
			'..ww..............',
			'.wwew.............',
			'yywwwwllllgggkkk..',
			'.rwwwwwwlllggg....',
			'....swwwwwwwwssg..',
			'......sssss.......',
			'..................',
			'..................',
		],
		GULL_COLOURS,
	),
}
/** Where a gull's beak is in its picture, in px from its top left: what it carries hangs there. */
export const GULL_BEAK = { x: 1 * CELL, y: 8 * CELL }

// --- The squirrel -----------------------------------------------------------------

/** A squirrel, running, 16 by 12 cells. */
export const SQUIRREL_WIDTH = 16 * CELL
export const SQUIRREL_HEIGHT = 12 * CELL

const SQUIRREL_COLOURS = {
	r: '#c4551e',
	l: '#e8843a',
	s: '#9a3c1a',
	f: '#f0dcc0',
	t: '#7a3a1a',
	d: '#6e2c14',
	e: INK,
	n: INK,
}

/**
 * The autumn forest's red squirrel, off at a run: low and stretched out,
 * then bunched up, its big tail curled up over its back, ear tufts back.
 */
export const SQUIRREL = {
	stretch: letterArt(
		[
			'.........llll...',
			'........lrrrrl..',
			'........rs..rrs.',
			'..t.....s....rs.',
			'.trr.........rs.',
			'nerrr.......rrs.',
			'ffrrrrrrrrrrrs..',
			'.ffrrrrrrrrrs...',
			'..ffrrrrrrss....',
			'.d.fff...ssd....',
			'dd.........dd...',
			'................',
		],
		SQUIRREL_COLOURS,
	),
	bunch: letterArt(
		[
			'.......llll.....',
			'......lrrrrl....',
			'......rs..rrs...',
			'..t...s....rs...',
			'.trr.......rs...',
			'nerrr.....rrs...',
			'ffrrrrrrrrrs....',
			'.ffrrrrrrrrs....',
			'..ffrrrrrss.....',
			'...ffdrdds......',
			'....dd.dd.......',
			'................',
		],
		SQUIRREL_COLOURS,
	),
}
/** Where a squirrel's mouth is, in px from its top left: what it carries is held there. */
export const SQUIRREL_MOUTH = { x: 0, y: 7 * CELL }

// --- The moose --------------------------------------------------------------------

/** A moose, 44 by 46 cells. */
export const MOOSE_WIDTH = 44 * CELL
export const MOOSE_HEIGHT = 46 * CELL

const HIDE = '#4a3426'
const HIDE_LIT = '#674832'
const HIDE_SHADE = '#33241a'
const LEG = '#b3a48c'
const LEG_SHADE = '#8a7c66'
const HOOF = '#3a3029'
const ANTLER = '#e0d2ac'
const ANTLER_SHADE = '#b9a97f'
const MUZZLE = '#5a4030'
const NOSE = '#241912'

/**
 * Its antlers: broad, flat palms, tines along their tops, one each side of
 * its head, the far one darker behind the near one. `dx`, `dy` where its
 * head is.
 */
const antlers = (dx: number, dy: number): PixelRect[] => [
	// The far one, behind.
	[dx + 8, dy + 1, 9, 3, ANTLER_SHADE],
	[dx + 9, dy - 1, 1, 2, ANTLER_SHADE],
	[dx + 12, dy - 1, 1, 2, ANTLER_SHADE],
	[dx + 15, dy - 1, 1, 2, ANTLER_SHADE],
	// The near one: its palm, and tines up off it.
	[dx + 1, dy + 3, 12, 3, ANTLER],
	[dx + 1, dy + 5, 12, 1, ANTLER_SHADE],
	[dx + 1, dy + 1, 1, 2, ANTLER],
	[dx + 4, dy + 1, 1, 2, ANTLER],
	[dx + 7, dy + 1, 1, 2, ANTLER],
	[dx + 10, dy + 2, 1, 1, ANTLER],
	[dx + 11, dy + 6, 2, 2, ANTLER_SHADE],
]

/**
 * Its head, long and heavy, hanging down off its neck to an overhanging
 * muzzle, a dark nose, an eye high up, ears back, and its bell, a flap of
 * hide, hanging under its throat. `dx`, `dy` where its brow is.
 */
const head = (dx: number, dy: number): PixelRect[] => [
	...antlers(dx - 1, dy - 7),
	// Ears.
	[dx + 9, dy - 1, 3, 2, HIDE_SHADE],
	// The head: brow to muzzle, sloping down forwards.
	[dx + 3, dy, 9, 4, HIDE],
	[dx + 1, dy + 3, 10, 4, HIDE],
	[dx, dy + 6, 8, 4, MUZZLE],
	[dx + 3, dy, 8, 1, HIDE_LIT],
	// The muzzle overhanging, and its nostril.
	[dx - 1, dy + 7, 3, 3, MUZZLE],
	[dx - 1, dy + 8, 1, 1, NOSE],
	[dx, dy + 10, 6, 1, HIDE_SHADE],
	// Its eye.
	[dx + 6, dy + 2, 1, 1, INK],
	// The bell, under its throat.
	[dx + 8, dy + 8, 3, 5, HIDE_SHADE],
	[dx + 9, dy + 13, 1, 2, HIDE_SHADE],
]

/**
 * A leg: a long pale one, darker behind, its knee a little thicker, a dark
 * hoof. `x` its left, from `top` down to the ground, `bend` cells forward
 * at the knee.
 */
const leg = (
	x: number,
	top: number,
	bend: number,
	far: boolean,
): PixelRect[] => {
	const fill = far ? LEG_SHADE : LEG
	const knee = top + 7
	return [
		[x, top, 3, 8, far ? HIDE_SHADE : HIDE],
		[x + bend, knee, 3, 44 - knee, fill],
		[x + bend, knee, 1, 44 - knee, LEG_SHADE],
		[x + bend - (bend < 0 ? 0 : 0), 44, 3, 2, HOOF],
	]
}

/**
 * The moose, plodding left: its body, the hump over its shoulders, its
 * stubby tail, its legs in `step` (0 or 1, the pairs swapped), and its
 * head up, or down over the table, munching.
 */
function moose(step: number, eating: boolean): string {
	const front = step === 0 ? [-1, 1] : [1, -1]
	const back = step === 0 ? [1, -1] : [-1, 1]
	const headAt = eating ? { x: 1, y: 16 } : { x: 2, y: 11 }
	return pixelArt(44, 46, [
		// Far legs, behind the body.
		...leg(16, 25, front[1], true),
		...leg(35, 24, back[1], true),
		// The body: deep chested, its back sloping down from the hump to the rump.
		[13, 12, 28, 14, HIDE],
		[12, 14, 4, 10, HIDE],
		[13, 9, 10, 4, HIDE],
		[15, 8, 6, 1, HIDE],
		[23, 11, 12, 1, HIDE],
		[34, 12, 7, 1, HIDE],
		// Lit along its back, shaded under its belly and round its rump.
		[15, 8, 6, 1, HIDE_LIT],
		[13, 9, 2, 1, HIDE_LIT],
		[21, 10, 2, 1, HIDE_LIT],
		[23, 11, 12, 1, HIDE_LIT],
		[35, 12, 6, 1, HIDE_LIT],
		[14, 24, 26, 2, HIDE_SHADE],
		[38, 13, 3, 12, HIDE_SHADE],
		// Its tail.
		[41, 13, 1, 3, HIDE_SHADE],
		// The neck, thick, down to the head.
		[8, headAt.y - 1, 8, 7, HIDE],
		[9, headAt.y - 2, 6, 1, HIDE_LIT],
		...head(headAt.x, headAt.y),
		// Near legs, in front of it.
		...leg(13, 24, front[0], false),
		...leg(33, 24, back[0], false),
	])
}

export const MOOSE = {
	walk: [moose(0, false), moose(1, false)],
	eat: moose(0, true),
}
/** Where a moose's mouth is, in px from its top left, head down, eating. */
export const MOOSE_MOUTH = { x: 2 * CELL, y: 25 * CELL }
