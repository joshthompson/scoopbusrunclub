import { letterArt } from '../../courses/kit/pixelArt'

/**
 * Puffins, for Mr Claws' sea stack: black back, white face and front, a
 * big striped beak, orange feet. Facing left, at a cell a pixel, so drawn
 * at twice their size: stood on a ledge (and blinking, and stretching its
 * wings), flying (wings up, and down), and bobbing on the water. And a
 * gull, far off, tiny, against the sky: wings up, level, and down.
 */

/** A puffin's colours: back, white face and front, face's shade, beak and its base, eye, feet. */
const COLOURS = {
	K: '#262636',
	W: '#f4f0ea',
	G: '#cfcfda',
	O: '#f0623a',
	Y: '#f2b43a',
	E: '#1d1d1d',
	B: '#f0623a',
}

/** Stood up, 12 by 9 cells, its feet on the bottom row. */
const STAND = [
	'....KKKK....',
	'...KKKKKK...',
	'..YGGEGKKK..',
	'.OOGGGGKKK..',
	'..OWWWWKKK..',
	'...WWWWWKK..',
	'...WWWWWKK..',
	'...WWWWWK...',
	'...B.B......',
]
/** Eyes shut. */
const BLINK = STAND.map((row) => row.replace('E', 'G'))
/** A stretch: its wing up off its back. */
const STRETCH = [
	'....KKKK....',
	'...KKKKKK.K.',
	'..YGGEGKKKKK',
	'.OOGGGGKKKK.',
	'..OWWWWKKK..',
	'...WWWWWKK..',
	'...WWWWWKK..',
	'...WWWWWK...',
	'...B.B......',
]
/** Flying, 12 by 8: wings up. */
const FLY_UP = [
	'......KK....',
	'......KKK...',
	'..KKK..KK...',
	'.YGEKKKKKKK.',
	'OOGGWWWWKKKK',
	'.OWWWWWWWKBB',
	'............',
	'............',
]
/** And down. */
const FLY_DOWN = [
	'............',
	'............',
	'..KKK.......',
	'.YGEKKKKKKK.',
	'OOGGWWWWKKKK',
	'.OWWWWKKKKBB',
	'......KKK...',
	'.......KK...',
]
/** On the water, 12 by 5: sat low, its front under the surface along the bottom row. */
const SWIM = [
	'...KKK......',
	'..KGGK......',
	'OYGEGKKKKKK.',
	'.OWWWKKKKKKK',
	'..WWWWWWKKK.',
]

const art = (rows: string[]) => letterArt(rows, COLOURS)

/** A puffin stood up, `PUFFIN_STAND_WIDTH` by `PUFFIN_STAND_HEIGHT` px drawn. */
export const PUFFIN_STAND = art(STAND)
export const PUFFIN_BLINK = art(BLINK)
export const PUFFIN_STRETCH = art(STRETCH)
export const PUFFIN_STAND_WIDTH = STAND[0].length * 2
export const PUFFIN_STAND_HEIGHT = STAND.length * 2
/** Flying: its two frames, wings up and down. */
export const PUFFIN_FLY = [art(FLY_UP), art(FLY_DOWN)]
export const PUFFIN_FLY_WIDTH = FLY_UP[0].length * 2
export const PUFFIN_FLY_HEIGHT = FLY_UP.length * 2
/** Bobbing on the water. */
export const PUFFIN_SWIM = art(SWIM)
export const PUFFIN_SWIM_WIDTH = SWIM[0].length * 2
export const PUFFIN_SWIM_HEIGHT = SWIM.length * 2

/** A gull, far off: dark against the evening sky. */
const GULL = { K: '#3a2b55' }
/** Its wings up, level, and down: 5 by 3 cells. */
export const GULL_FRAMES = [
	['K...K', '.K.K.', '..K..'],
	['.....', 'KK.KK', '..K..'],
	['.....', '.KKK.', 'K...K'],
].map((rows) => letterArt(rows, GULL))
export const GULL_WIDTH = 10
export const GULL_HEIGHT = 6
