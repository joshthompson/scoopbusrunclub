import { pixelArt } from '../../courses/kit/pixelArt'

/**
 * A sheet of paper taped to the top of a low branch's limb, a big red arrow
 * on it, pointing down: duck, and slide under. Its tape's along its
 * bottom, stuck down over the limb.
 */

const CELL = 2
const PAPER = '#f6f4ee'
const LIT = '#ffffff'
const SHADE = '#d8d2c2'
const ARROW = '#d63a2f'
const TAPE = '#e6d98f'

const COLUMNS = 13
const ROWS = 15
export const DUCK_NOTE_WIDTH = COLUMNS * CELL
export const DUCK_NOTE_HEIGHT = ROWS * CELL
/** How far down its bottom goes over the top of the limb: its tape. */
export const DUCK_NOTE_TAPED = 3 * CELL

export const duckNote = pixelArt(COLUMNS, ROWS, [
	// The sheet: lit along its top, shaded down its far side and along its
	// bottom, its top corner curling.
	[0, 0, 13, 13, PAPER],
	[0, 0, 12, 1, LIT],
	[12, 1, 1, 12, SHADE],
	[0, 12, 13, 1, SHADE],
	[12, 0, 1, 1, SHADE],
	// The arrow, down.
	[5, 2, 3, 5, ARROW],
	[2, 7, 9, 1, ARROW],
	[3, 8, 7, 1, ARROW],
	[4, 9, 5, 1, ARROW],
	[5, 10, 3, 1, ARROW],
	[6, 11, 1, 1, ARROW],
	// Its tape, over the limb.
	[4, 12, 5, 3, TAPE],
])
