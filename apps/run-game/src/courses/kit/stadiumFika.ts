import { type PixelRect, pixelArt } from './pixelArt'

/**
 * Kristineberg's, drawn in code: not fika, but what's had at the side of a
 * running track. An energy drink, a sports gel and a banana.
 */

/** A tall can of energy drink: black, a lime band, a yellow bolt down it, 8 by 13. */
export const energyDrink = pixelArt(8, 13, [
	// The ring pull and the can's top, silver.
	[3, 0, 2, 1, '#9aa1a6'],
	[1, 1, 6, 1, '#d7dbde'],
	[1, 1, 1, 1, '#b5bbbf'],
	// The can: black, catching the light down its left.
	[0, 2, 8, 10, '#1d2226'],
	[1, 2, 1, 10, '#3a434a'],
	// A lime band round it, and a bolt of lightning down it, over the band.
	[0, 4, 8, 2, '#8fe33a'],
	[0, 9, 8, 1, '#8fe33a'],
	[4, 3, 2, 1, '#ffe14d'],
	[3, 4, 2, 1, '#ffe14d'],
	[2, 5, 4, 1, '#ffe14d'],
	[4, 6, 2, 1, '#ffe14d'],
	[3, 7, 2, 1, '#ffe14d'],
	[3, 8, 1, 1, '#ffe14d'],
	// Its foot, silver.
	[1, 12, 6, 1, '#b5bbbf'],
])

/** Pixel art from rows of letters, each a colour in `colours`; `.` left clear. */
function grid(rows: string[], colours: Record<string, string>) {
	const rects: PixelRect[] = []
	rows.forEach((row, y) => {
		for (let x = 0; x < row.length; x++)
			if (row[x] !== '.') rects.push([x, y, 1, 1, colours[row[x]]])
	})
	return pixelArt(rows[0].length, rows.length, rects)
}

/** A sports gel, a foil sachet, orange, its tear-off tab at the top, a drop of gel on it, 7 by 12. */
export const sportsGel = grid(
	[
		'..ggg..',
		'..gGg..',
		'.ccccc.',
		'ccccccc',
		'oLooooo',
		'oLooooo',
		'oLowooo',
		'oLwwwoo',
		'oLwwwoo',
		'oLLwLoo',
		'oLooooo',
		'ccccccc',
	],
	{
		g: '#c3c9cd',
		w: '#fff6ea',
		c: '#c95a12',
		o: '#f07f1f',
		L: '#ffb15e',
		G: '#8d959a',
	},
)

/** A banana, ripe, curving up to its stalk at one end and its tip at the other, 12 by 9. */
export const banana = grid(
	[
		'..........b.',
		'.........yb.',
		't........yyd',
		'ly.......lyd',
		'lyy.....lyyd',
		'.lyyyyyyyyd.',
		'.llyyyfyydd.',
		'..dyyyyydd..',
		'...dddddd...',
	],
	{
		t: '#4f3714',
		b: '#6b4a1e',
		y: '#f5d23a',
		l: '#fff08a',
		d: '#c99a1c',
		f: '#a07418',
	},
)
