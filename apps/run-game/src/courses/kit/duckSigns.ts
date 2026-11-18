import { pixelText, pixelTextWidth, rectsMarkup, svgUrl } from './pixelArt'

/**
 * Signs by a Tunnel's way in, telling whoever's coming to duck: each
 * course's own, to go with it. (The Sewers' is in `sewerScenery`.)
 */

const CELL = 2
const WOOD = '#b07a42'
const WOOD_LIT = '#c99257'
const WOOD_GRAIN = '#8a5c2e'
const WOOD_DARK = '#5a3b1e'
const INK = '#2b1a0c'
const SAND = '#c99b55'

/** Its board's size, in cells: room for DUCK! and an arrow, a little either side. */
const BOARD_WIDTH = 42
const BOARD_HEIGHT = 15
const POST_HEIGHT = 20

/**
 * A signpost on the sand before the Sphinx's way in: a board of planks on
 * a post, bound top and bottom, lit along its top; DUCK! painted on it in
 * big letters, and an arrow, down. Drawn on the 2 px grid, 84 by 72.
 */
export const duckPost = (() => {
	const width = BOARD_WIDTH * CELL
	const height = (BOARD_HEIGHT + POST_HEIGHT + 1) * CELL
	const c = (n: number) => n * CELL
	const words = 'DUCK!'
	const wordsWidth = pixelTextWidth(words, CELL)
	const arrowWidth = c(5)
	const left =
		Math.round((width - wordsWidth - c(2) - arrowWidth) / 2 / CELL) * CELL
	const top = c(4)
	const arrowLeft = left + wordsWidth + c(2)
	return svgUrl(
		width,
		height,
		[
			// Its post, lit down its left, and its foot in the sand.
			rectsMarkup([
				[c(19), c(BOARD_HEIGHT), c(4), c(POST_HEIGHT), WOOD_GRAIN],
				[c(19), c(BOARD_HEIGHT), c(1), c(POST_HEIGHT), WOOD],
				[c(16), c(BOARD_HEIGHT + POST_HEIGHT - 1), c(10), c(2), SAND],
				// Its board: planks, their joins, lit along its top.
				[0, c(1), width, c(BOARD_HEIGHT - 2), WOOD],
				[0, c(1), width, c(1), WOOD_LIT],
				[0, c(5), width, c(1), WOOD_GRAIN],
				[0, c(10), width, c(1), WOOD_GRAIN],
				[0, c(6), width, c(1), WOOD_LIT],
				[0, c(11), width, c(1), WOOD_LIT],
				// Bound top and bottom, darker.
				[0, 0, width, c(1), WOOD_DARK],
				[0, c(BOARD_HEIGHT - 1), width, c(1), WOOD_DARK],
				// A nail at either end.
				[c(1), c(2), c(1), c(1), WOOD_DARK],
				[width - c(2), c(2), c(1), c(1), WOOD_DARK],
				[c(1), c(BOARD_HEIGHT - 3), c(1), c(1), WOOD_DARK],
				[width - c(2), c(BOARD_HEIGHT - 3), c(1), c(1), WOOD_DARK],
				// The arrow, down, as tall as the letters: its stem, and its head.
				[arrowLeft + c(2), top, c(1), c(4), INK],
				[arrowLeft, top + c(4), c(5), c(1), INK],
				[arrowLeft + c(1), top + c(5), c(3), c(1), INK],
				[arrowLeft + c(2), top + c(6), c(1), c(1), INK],
			]),
			pixelText(words, left, top, CELL, INK),
		].join(''),
	)
})()
