import { type PixelRect, pixelArt } from './pixelArt'

/**
 * Karolinska's fika, each a cell to a pixel, drawn twice the size, as
 * fika is: grapes, as brought to anyone in hospital; and inside someone,
 * a bubble of oxygen, and a vitamin capsule.
 */

const GRAPE = '#8cc63f'
const GRAPE_LIT = '#d2ef8a'
const GRAPE_SHADE = '#5f9a2a'

/** A grape, 2 by 2 cells, its top left at `x`, `y`: lit on top, shaded under. */
const grape = (x: number, y: number): PixelRect[] => [
	[x, y, 2, 2, GRAPE],
	[x, y, 1, 1, GRAPE_LIT],
	[x + 1, y + 1, 1, 1, GRAPE_SHADE],
]

/**
 * A bunch of green grapes on a paper plate, its stalk and a leaf: what's
 * brought in for anyone in hospital. 12 by 12.
 */
export const grapes = pixelArt(12, 12, [
	// Its stalk, and a leaf off it.
	[6, 0, 1, 2, '#6a4a2a'],
	[7, 0, 3, 1, '#4f8a2a'],
	[8, 1, 2, 1, '#3c6e20'],
	// The grapes, back rows first, the front ones over them.
	...grape(4, 2),
	...grape(6, 2),
	...grape(3, 4),
	...grape(5, 4),
	...grape(7, 4),
	...grape(2, 6),
	...grape(4, 6),
	...grape(6, 6),
	...grape(8, 6),
	...grape(4, 8),
	...grape(6, 8),
	// The paper plate under them, its rim catching the light.
	[1, 10, 10, 1, '#f6f4ee'],
	[0, 10, 1, 1, '#dcd8cc'],
	[11, 10, 1, 1, '#dcd8cc'],
	[2, 11, 8, 1, '#cfcabd'],
])

const BUBBLE_RIM = '#8fd0f4'
const BUBBLE_DARK = '#5aa6d6'
/** Air: see through, as air is. */
const BUBBLE_AIR = 'rgba(214,240,255,0.6)'
const BUBBLE_INK = '#2a6aa8'

/** A bubble of oxygen, shining, O2 inside it: 11 by 11. */
export const oxygen = pixelArt(11, 11, [
	// Its skin, round, darker underneath.
	[3, 0, 5, 1, BUBBLE_RIM],
	[1, 1, 2, 1, BUBBLE_RIM],
	[8, 1, 2, 1, BUBBLE_RIM],
	[0, 3, 1, 5, BUBBLE_RIM],
	[1, 2, 1, 1, BUBBLE_RIM],
	[9, 2, 1, 1, BUBBLE_RIM],
	[10, 3, 1, 5, BUBBLE_DARK],
	[9, 8, 1, 1, BUBBLE_DARK],
	[1, 8, 1, 1, BUBBLE_RIM],
	[1, 9, 2, 1, BUBBLE_DARK],
	[8, 9, 2, 1, BUBBLE_DARK],
	[3, 10, 5, 1, BUBBLE_DARK],
	// The air in it.
	[3, 1, 5, 1, BUBBLE_AIR],
	[2, 2, 7, 1, BUBBLE_AIR],
	[1, 3, 9, 5, BUBBLE_AIR],
	[2, 8, 7, 1, BUBBLE_AIR],
	[3, 9, 5, 1, BUBBLE_AIR],
	// The shine on it.
	[2, 2, 2, 1, '#ffffff'],
	[2, 3, 1, 1, '#ffffff'],
	// O
	[2, 4, 3, 1, BUBBLE_INK],
	[2, 7, 3, 1, BUBBLE_INK],
	[2, 5, 1, 2, BUBBLE_INK],
	[4, 5, 1, 2, BUBBLE_INK],
	// 2, small, down beside it.
	[6, 5, 2, 1, BUBBLE_INK],
	[7, 6, 1, 1, BUBBLE_INK],
	[6, 7, 1, 1, BUBBLE_INK],
	[6, 8, 2, 1, BUBBLE_INK],
])

/** A vitamin capsule, half orange, half yellow, its seam between, shining: 12 by 7. */
export const vitamin = pixelArt(12, 7, [
	// Its orange half.
	[2, 0, 4, 1, '#f08a24'],
	[1, 1, 5, 5, '#f08a24'],
	[0, 2, 1, 3, '#f08a24'],
	[1, 5, 5, 1, '#c86a14'],
	[2, 6, 4, 1, '#c86a14'],
	// Its yellow half.
	[6, 0, 4, 1, '#f6d23a'],
	[6, 1, 5, 5, '#f6d23a'],
	[11, 2, 1, 3, '#f6d23a'],
	[6, 5, 5, 1, '#d6b02a'],
	[6, 6, 4, 1, '#d6b02a'],
	// The seam where they meet.
	[6, 1, 1, 5, '#e8a830'],
	// The shine along its top.
	[2, 1, 3, 1, '#ffd0a0'],
	[7, 1, 3, 1, '#fff6c0'],
])
