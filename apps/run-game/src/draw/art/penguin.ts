import { letterArt } from '../../courses/kit/pixelArt'

/**
 * A penguin tobogganing on its belly, facing right: its black back lit
 * along the top, its white front underneath, flippers out, an orange beak
 * up front and its feet trailing behind. Iceberg Bump's, sliding along the
 * iceberg (or leaping, nose first). 16 by 7 cells.
 */
export const PENGUIN = letterArt(
	[
		'..........kkk...',
		'...kkkkkkkkKKkK.',
		'.kkKKKKKKKKKWKOO',
		'KKKKKKKKKKKKKKO.',
		'KKWWWWWWWWWWWK..',
		'.WWWWWWWWWWWW...',
		'OO.....KK.......',
	],
	{
		k: '#3a4656',
		K: '#1d2530',
		W: '#f4f8fb',
		O: '#f29a2e',
	},
)
export const PENGUIN_WIDTH = 16 * 2
export const PENGUIN_HEIGHT = 7 * 2

/**
 * An emperor penguin, tobogganing on its belly, facing right: bigger than
 * the others, its back slate, the gold patch behind its eye running down
 * into a pale yellow chest, its beak long, a stripe of orange along it.
 * Iceberg Bump's, near the end. 24 by 10 cells.
 */
export const EMPEROR_PENGUIN = letterArt(
	[
		'..............kkkkkk....',
		'......kkkkkkkkKKKKKKk...',
		'...kkkKKKKKKKKKKKKKYKk..',
		'..kKKKKKKKKKKKKKKKYYKKOK',
		'.kKKKKKKKKKKKKKKKKYyWKK.',
		'KKKKKKKKKKKKKKKKKKKyWW..',
		'KKWWWWWWWWWWWWWWWWyyW...',
		'.KWWWWWWWWWWWWWWWWWW....',
		'..WWWWWWWWWWWWWWWWW.....',
		'KK.......KKK............',
	],
	{
		k: '#4d5d74',
		K: '#1b2230',
		W: '#f4f8fb',
		Y: '#f2b632',
		y: '#f7e39a',
		O: '#e0702a',
	},
)
export const EMPEROR_PENGUIN_WIDTH = 24 * 2
export const EMPEROR_PENGUIN_HEIGHT = 10 * 2
