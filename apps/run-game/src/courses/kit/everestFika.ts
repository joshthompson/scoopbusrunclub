import { pixelArt } from './pixelArt'

/**
 * Everest's fika, drawn in code: Kendal Mint Cake, as went up it in 1953,
 * and a bowl of Sherpa butter tea.
 */

/** A bar of Kendal Mint Cake, its wrapper torn back off its end: white, sugary, 12 by 8. */
export const mintCake = pixelArt(12, 8, [
	// The bar, poking out of its wrapper, sugar glinting on it.
	[0, 1, 5, 6, '#f6f7f2'],
	[0, 6, 5, 1, '#d6dbd2'],
	[1, 2, 1, 1, '#ffffff'],
	[3, 4, 1, 1, '#ffffff'],
	[2, 5, 1, 1, '#c6e8d4'],
	[0, 1, 1, 1, '#d6dbd2'],
	// Its wrapper: red, a white band, a blue end.
	[5, 0, 7, 8, '#c8322b'],
	[5, 0, 1, 8, '#9e2420'],
	[7, 2, 4, 4, '#f3efe4'],
	[8, 3, 2, 1, '#2b5aa6'],
	[8, 4, 2, 1, '#2f9b4a'],
	[11, 0, 1, 8, '#2b5aa6'],
	// Torn back, the foil.
	[5, 0, 1, 1, '#d7d9db'],
	[5, 7, 1, 1, '#d7d9db'],
])

/** A wooden bowl of butter tea, creamy, steam curling off it, 11 by 11. */
export const butterTea = pixelArt(11, 11, [
	// Steam.
	[3, 0, 1, 2, 'rgba(255,255,255,0.85)'],
	[4, 2, 1, 1, 'rgba(255,255,255,0.85)'],
	[6, 1, 1, 2, 'rgba(255,255,255,0.85)'],
	[7, 0, 1, 1, 'rgba(255,255,255,0.85)'],
	// The tea, its surface, buttery.
	[1, 4, 9, 1, '#e8cf9a'],
	[3, 4, 2, 1, '#f6e4b8'],
	// The bowl, turned wood, a silver rim.
	[0, 3, 11, 1, '#c9ccd0'],
	[0, 5, 11, 2, '#8a5a2b'],
	[1, 7, 9, 1, '#7a4c22'],
	[2, 8, 7, 1, '#6a3f1a'],
	[0, 5, 1, 1, '#a0703c'],
	[2, 5, 1, 1, '#a0703c'],
	// Its foot.
	[4, 9, 3, 1, '#5b3416'],
	[3, 10, 5, 1, '#c9ccd0'],
])
