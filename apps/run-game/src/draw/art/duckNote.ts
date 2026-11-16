import { pixelArt } from '../../courses/kit/pixelArt'

/**
 * A sheet of paper pinned to a low branch's tree, on its trunk just over
 * where its limb comes off it, an arrow drawn on it in red marker, pointing
 * down: duck, and slide under. Drawn by hand, in thin strokes, one side of
 * its head a bit longer than the other.
 */

const CELL = 2
const PAPER = '#f6f4ee'
const LIT = '#ffffff'
const SHADE = '#d8d2c2'
const MARKER = '#d63a2f'
const PIN = '#3a78c9'
const PIN_LIT = '#8fbdf0'

const COLUMNS = 11
const ROWS = 10
export const DUCK_NOTE_WIDTH = COLUMNS * CELL
export const DUCK_NOTE_HEIGHT = ROWS * CELL

export const duckNote = pixelArt(COLUMNS, ROWS, [
	// The sheet: lit along its top, shaded down its far side and along its
	// bottom, its bottom corner curling up off the bark.
	[0, 1, 11, 9, PAPER],
	[0, 1, 10, 1, LIT],
	[10, 1, 1, 8, SHADE],
	[0, 9, 10, 1, SHADE],
	[9, 8, 1, 1, SHADE],
	// The arrow, down, in strokes of marker: its shaft...
	[5, 2, 1, 6, MARKER],
	// ...and its head, a stroke each side down to its point, the far one
	// drawn a bit long.
	[3, 6, 1, 1, MARKER],
	[4, 7, 1, 1, MARKER],
	[5, 8, 1, 1, MARKER],
	[6, 7, 1, 1, MARKER],
	[7, 6, 1, 1, MARKER],
	[8, 5, 1, 1, MARKER],
	// Its drawing pin, at the top.
	[4, 0, 3, 2, PIN],
	[4, 0, 1, 1, PIN_LIT],
])
