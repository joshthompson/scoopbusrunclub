import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'

/**
 * A roadblock, across the way back at the far left of every course, where
 * it stops anyone running the wrong way: two boards striped red and white
 * on a pair of A-frame legs, an amber lamp on each end. Drawn a cell to two
 * screen pixels, as the runners are.
 */

const COLUMNS = 30
const ROWS = 24
const CELL = 2

export const ROADBLOCK_WIDTH = COLUMNS * CELL
export const ROADBLOCK_HEIGHT = ROWS * CELL

const RED = '#d8342c'
const WHITE = '#f4f4f4'
const LEG = '#5a5f68'
const LEG_DARK = '#3a3e45'

/** A board across it, `y` down, striped on the slant. */
const board = (y: number): PixelRect[] => {
	const rects: PixelRect[] = [[1, y, COLUMNS - 2, 4, WHITE]]
	for (let x = 1; x < COLUMNS - 1; x++)
		for (let dy = 0; dy < 4; dy++)
			if ((x + dy) % 8 < 4) rects.push([x, y + dy, 1, 1, RED])
	rects.push([1, y + 4, COLUMNS - 2, 1, '#8c2019'])
	return rects
}

/** A leg, an A-frame, at `x`. */
const leg = (x: number): PixelRect[] => [
	[x, 4, 2, 20, LEG],
	[x + 1, 4, 1, 20, LEG_DARK],
	[x - 2, 20, 2, 4, LEG],
	[x + 2, 20, 2, 4, LEG_DARK],
]

export const ROADBLOCK = pixelArt(COLUMNS, ROWS, [
	...leg(5),
	...leg(23),
	...board(6),
	...board(13),
	// Its lamps, lit, on top of each leg.
	[4, 1, 4, 3, '#2b2b2b'],
	[5, 1, 2, 2, '#ffb02e'],
	[5, 1, 1, 1, '#fff0b0'],
	[22, 1, 4, 3, '#2b2b2b'],
	[23, 1, 2, 2, '#ffb02e'],
	[23, 1, 1, 1, '#fff0b0'],
])
