import {
	ROCK,
	ROCK_DARK,
	ROCK_LIGHTEST,
	ROCK_LIT,
	SEAM,
} from '../../courses/kit/caveScenery'
import { letterArt, paintedArt } from '../../courses/kit/pixelArt'

/**
 * A stalactite that comes down, in The Caves: a long spike of rock off
 * the roof, like the ones hanging all along it, flat on top where it
 * grew out of it, ringed where it grew, lit down its left and shadowed
 * down its right, as the stalagmites are. Come near and it shakes, cracks
 * across where it joins the roof, chips flaking off it, and drops; and
 * smashes on the floor, a puff of dust going up, leaving a heap of broken
 * rock and its snapped-off tip, low enough to run over. In cells twice
 * the size of a screen pixel, as the runners are.
 */

const CELL = 2
const COLUMNS = 12
const ROWS = 30

export const STALACTITE_WIDTH = COLUMNS * CELL
export const STALACTITE_HEIGHT = ROWS * CELL

/** A glint down its lit side, wet. */
const GLINT = '#a88c74'
/** Dust, hanging in the air: pale, and thinner the further it's spread. */
const DUST = '#b8a08a'
const DUST_LIT = '#d6c3ae'

/** How far either side of its middle it reaches, `y` cells down from its top. */
function halfAt(y: number) {
	const down = y / ROWS
	// Tapering to its tip, a little hollow-sided, and ringed where it grew.
	const ring = Math.abs(y - 9) < 1 || Math.abs(y - 17) < 1 ? 0.6 : 0
	return 6 * (1 - down) ** 0.85 + ring
}

/** The stalactite, painted cell by cell; `cracked` gives it its cracks and chips. */
function stalactite(cracked: boolean) {
	const cx = COLUMNS / 2
	// Cracks, zigzagging across it where it'll break, and one running down.
	const crack = new Set(
		cracked
			? [
					'0,4',
					'1,4',
					'2,5',
					'3,5',
					'4,4',
					'5,4',
					'6,5',
					'7,5',
					'8,6',
					'9,6',
					'10,5',
					'11,5',
					'6,6',
					'6,7',
					'5,8',
					'5,9',
					'5,10',
					'6,11',
					'7,12',
					'7,13',
					'4,17',
					'5,17',
					'6,18',
				]
			: [],
	)
	// Chips flaked off its edges.
	const chipped = new Set(cracked ? ['0,3', '11,7', '1,12', '9,15'] : [])
	return paintedArt(COLUMNS, ROWS, (x, y) => {
		const half = halfAt(y)
		if (Math.abs(x - cx) > half) return undefined
		const key = `${Math.floor(x)},${Math.floor(y)}`
		if (chipped.has(key)) return undefined
		if (crack.has(key)) return SEAM
		// Lit along under a crack, where it's split.
		if (crack.has(`${Math.floor(x)},${Math.floor(y) - 1}`)) return ROCK_LIGHTEST
		// Its flat top, where it grew out of the roof.
		if (y < 1) return ROCK_DARK
		// Its rings, a shadow under each.
		if (Math.abs(y - 10) < 0.5 || Math.abs(y - 18) < 0.5)
			return x > cx ? ROCK_DARK : ROCK
		if (x < cx - half / 3)
			return x > cx - half / 3 - 1 && y > 2 && y < 24 ? GLINT : ROCK_LIGHTEST
		return x > cx + half / 2 ? ROCK : ROCK_LIT
	})
}

/** Hanging off the roof, whole. */
export const STALACTITE = stalactite(false)

/** Shaking loose: cracked across where it joins the roof, chips gone off its edges. */
export const STALACTITE_CRACKED = stalactite(true)

const RUBBLE_COLUMNS = 16
const RUBBLE_ROWS = 6

export const RUBBLE_WIDTH = RUBBLE_COLUMNS * CELL
export const RUBBLE_HEIGHT = RUBBLE_ROWS * CELL

/**
 * What's left of it, smashed on the floor: a low heap of broken rock,
 * each lump lit along its top and shadowed down its right, and its tip,
 * snapped off, stuck up out of it at a slant.
 */
export const STALACTITE_RUBBLE = letterArt(
	[
		'.............L..',
		'............Llr.',
		'..LLl......Llrd.',
		'.Llrrd.LLlLlrdLl',
		'LlrrrdLlrrLlrdlr',
		'sddddsdddddddsds',
	],
	{ L: ROCK_LIGHTEST, l: ROCK_LIT, r: ROCK, d: ROCK_DARK, s: SEAM },
)

const DUST_COLUMNS = 24
const DUST_ROWS = 12

export const DUST_WIDTH = DUST_COLUMNS * CELL
export const DUST_HEIGHT = DUST_ROWS * CELL

/**
 * Puffs of dust, `[middle across, middle down, how big]`, as it smashes:
 * thick, low and tight; billowing up and out; then spread wide, breaking
 * up into wisps.
 */
const PUFFS: [number, number, number][][] = [
	[
		[12, 10, 3.4],
		[8.5, 10.5, 2.6],
		[15.5, 10.5, 2.6],
		[10.5, 8, 2],
		[14, 8.5, 1.8],
	],
	[
		[12, 8.5, 3.4],
		[12, 10, 4],
		[7.5, 9.5, 2.8],
		[16.5, 10, 2.6],
		[4, 10.5, 2],
		[20, 11, 2],
		[10, 6, 2.4],
		[14.5, 6.5, 2],
	],
	[
		[12, 7, 3],
		[12.5, 7.5, 3.6],
		[12, 10, 3.6],
		[6.5, 8, 2.8],
		[17.5, 8.5, 2.6],
		[2.8, 10, 2.2],
		[21.2, 10.5, 2],
		[9, 4.5, 2],
		[15, 4, 2.2],
		[10, 10.5, 2.2],
		[14.5, 10.5, 2.2],
	],
]

/**
 * A puff of dust, `step` 0 to 2 of the way through, lit along the tops of
 * its billows, thinning as it spreads. It's air, so see-through.
 */
function dust(step: number) {
	const alpha = ['e0', 'a8', '58'][step]
	const inPuff = (x: number, y: number) =>
		PUFFS[step].some(([px, py, r]) => Math.hypot(x - px, y - py) < r)
	return paintedArt(DUST_COLUMNS, DUST_ROWS, (x, y) => {
		if (!inPuff(x, y)) return undefined
		return `${inPuff(x, y - 1) ? DUST : DUST_LIT}${alpha}`
	})
}

/** The puff of dust as it smashes, three frames: thick, spreading, thinning away. */
export const DUST_FRAMES: string[] = [0, 1, 2].map(dust)
