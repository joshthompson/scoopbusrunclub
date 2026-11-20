import { letterArt, paintedArt } from '../../courses/kit/pixelArt'

/**
 * Fruit Kebab's fruit, fired out of its cannons to be skewered (see
 * `minigames/fruitKebab`): a banana, a pineapple, an orange, a strawberry
 * and an apple. Each a few colours, lit from above, its stalk or leaves on
 * top: the same in the air and on a sword, where it's drawn smaller.
 */

const CELL = 2

export type FruitKind =
	| 'banana'
	| 'pineapple'
	| 'orange'
	| 'strawberry'
	| 'apple'
export const FRUIT_KINDS: FruitKind[] = [
	'banana',
	'pineapple',
	'orange',
	'strawberry',
	'apple',
]

export interface FruitArt {
	src: string
	width: number
	height: number
}

const art = (rows: string[], colours: Record<string, string>): FruitArt => ({
	src: letterArt(rows, colours),
	width: rows[0].length * CELL,
	height: rows.length * CELL,
})

/** A banana, curved like a smile, its ends brown. */
const BANANA = art(
	[
		'B........B',
		'YY......YY',
		'yYY....YYy',
		'.yYYYYYYy.',
		'..dyyyyd..',
		'....dd....',
	],
	{ B: '#5a3a1a', Y: '#ffe066', y: '#f2c12e', d: '#c9971c' },
)

/** A pineapple: its crown of spiky leaves, and its criss-crossed skin. */
const PINEAPPLE = art(
	[
		'.G...G.',
		'..GgG..',
		'.GGgGG.',
		'.YyYyY.',
		'yYyYyYy',
		'YyYyYyY',
		'yYyYyYy',
		'YyYyYyY',
		'.dYdYd.',
	],
	{ G: '#3fa34d', g: '#2a7a37', Y: '#f2c12e', y: '#b9801c', d: '#8a5a12' },
)

/** An orange: round, a leaf on its stalk, a glint on it. */
const ORANGE = art(
	[
		'...gG...',
		'.OOOOOO.',
		'OoOOOOOO',
		'OoOOOOOO',
		'OOOOOOOO',
		'OOOOOOdO',
		'.OOOddO.',
		'..dddd..',
	],
	{ G: '#3fa34d', g: '#5a3a1a', O: '#f28c28', o: '#ffc58a', d: '#c9601a' },
)

/** A strawberry: its green top, red, and its seeds. */
const STRAWBERRY = art(
	[
		'.GGgGG.',
		'GRRgRRG',
		'RrRyRRR',
		'RRyRRyR',
		'RyRRRRR',
		'.RRyRd.',
		'..RRd..',
		'...d...',
	],
	{
		G: '#3fa34d',
		g: '#2a7a37',
		R: '#e0303a',
		r: '#ff7a80',
		y: '#ffe08a',
		d: '#a8182a',
	},
)

/** An apple: red, its stalk and a leaf, and a glint. */
const APPLE = art(
	[
		'...bL...',
		'...b....',
		'.RRRRRR.',
		'RrRRRRRR',
		'RrRRRRRR',
		'RRRRRRRd',
		'RRRRRRdd',
		'.RRRddd.',
	],
	{ b: '#5a3a1a', L: '#3fa34d', R: '#d8342c', r: '#f47a70', d: '#9c1f1a' },
)

export const FRUIT_ART: Record<FruitKind, FruitArt> = {
	banana: BANANA,
	pineapple: PINEAPPLE,
	orange: ORANGE,
	strawberry: STRAWBERRY,
	apple: APPLE,
}

/** How much smaller fruit's drawn skewered on a sword, than flying. */
export const SKEWERED_SCALE = 0.75
/** How far apart pieces skewered on a sword are, up it, in px. */
export const SKEWERED_GAP = 12

const IRON = '#2b2f36'
const IRON_LIT = '#4a525e'
const IRON_SHADE = '#1a1d22'
const WOOD = '#8a5a2a'
const WOOD_LIT = '#b07a3e'
const WOOD_SHADE = '#5a3a1a'
const RIM = '#c9971c'

/** A cannon's size, in cells, and how its barrel's tipped up, facing right. */
const CANNON_COLUMNS = 26
const CANNON_ROWS = 22
const BARREL_FROM = { x: 8, y: 14 }
const BARREL_LENGTH = 17
const BARREL_RADIUS = 3
export const CANNON_ANGLE = (52 * Math.PI) / 180

/**
 * A cannon, facing right, its barrel tipped up: black iron, a brass ring
 * round its mouth, on a wooden carriage with two wheels. Fruit Kebab's,
 * one either side, firing fruit up over the path.
 */
export const CANNON = paintedArt(CANNON_COLUMNS, CANNON_ROWS, (x, y) => {
	const ax = Math.cos(CANNON_ANGLE)
	const ay = -Math.sin(CANNON_ANGLE)
	const dx = x - BARREL_FROM.x
	const dy = y - BARREL_FROM.y
	const along = dx * ax + dy * ay
	const across = dx * -ay + dy * ax
	// Its wheels: iron rims, wooden hubs.
	for (const wheel of [6, 13]) {
		const d = Math.hypot(x - wheel, y - 18)
		if (d < 1.2) return WOOD_SHADE
		if (d < 2.4) return WOOD
		if (d < 3.6) return d < 3 && y < 18 ? IRON_LIT : IRON
	}
	// The barrel, tipped up, a ring round its mouth and a knob on its end.
	if (along > -2 && along < BARREL_LENGTH && Math.abs(across) < BARREL_RADIUS) {
		if (along > BARREL_LENGTH - 2) return RIM
		if (along > BARREL_LENGTH - 3 && Math.abs(across) < 1.6) return IRON_SHADE
		return across < -1.2 ? IRON_LIT : across > 1.6 ? IRON_SHADE : IRON
	}
	if (Math.hypot(dx + ax * 3, dy + ay * 3) < 1.6) return IRON
	// The carriage it sits on.
	if (y >= 13 && y < 17 && x >= 3 && x < 16)
		return y < 14 ? WOOD_LIT : y >= 16 ? WOOD_SHADE : WOOD
	return undefined
})
export const CANNON_WIDTH = CANNON_COLUMNS * CELL
export const CANNON_HEIGHT = CANNON_ROWS * CELL
/** Where its mouth is, from the picture's top left, facing right, in px. */
export const CANNON_MOUTH = {
	x: (BARREL_FROM.x + Math.cos(CANNON_ANGLE) * BARREL_LENGTH) * CELL,
	y: (BARREL_FROM.y - Math.sin(CANNON_ANGLE) * BARREL_LENGTH) * CELL,
}

/** A puff of smoke's size, in cells, and the blobs it's made of: [x, y, radius]. */
const PUFF_CELLS = 11
const PUFF_BLOBS = [
	[5.5, 4.5, 3.6],
	[3, 6.5, 2.6],
	[8, 6.5, 2.8],
	[5.5, 7.5, 2.6],
]

/**
 * A puff of smoke out of a cannon's mouth, firing: a little cloud of it,
 * white on top, grey underneath. Air, so a little see-through.
 */
export const PUFF = paintedArt(PUFF_CELLS, PUFF_CELLS, (x, y) => {
	if (!PUFF_BLOBS.some(([bx, by, r]) => Math.hypot(x - bx, y - by) <= r))
		return undefined
	return y < 5
		? 'rgba(255,255,255,0.95)'
		: y < 8
			? 'rgba(236,236,236,0.9)'
			: 'rgba(200,200,206,0.85)'
})
export const PUFF_SIZE = PUFF_CELLS * CELL
