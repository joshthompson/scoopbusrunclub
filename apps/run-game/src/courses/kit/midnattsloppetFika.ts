import { pixelArt } from './pixelArt'

/**
 * Midnattsloppet's fika, each a cell to a pixel, drawn twice the size, as
 * fika is: off the drinks station's tables, a paper cup of water and a
 * cup of warm blueberry soup; and from a kiosk, a slice of pizza.
 */

const STEAM = 'rgba(255,255,255,0.85)'

const PAPER_LIT = '#ffffff'
const PAPER = '#e9edf2'
const PAPER_SHADE = '#c3cbd5'
const RACE_BLUE = '#1f6bff'
const RACE_BLUE_SHADE = '#1650c4'

/**
 * A paper cup of water, from the drinks station: white, the race's blue
 * band round it, the water in it catching the light. 8 by 10.
 */
export const waterCup = pixelArt(8, 10, [
	// Its rim, round, and the water in it.
	[1, 0, 6, 1, PAPER],
	[0, 1, 8, 1, PAPER],
	[1, 1, 6, 1, '#6fb8ec'],
	[2, 1, 2, 1, '#c8ecff'],
	[0, 2, 8, 1, PAPER_LIT],
	// The cup, narrowing down to its foot, lit down its left.
	[1, 3, 6, 6, PAPER],
	[1, 3, 1, 6, PAPER_LIT],
	[6, 3, 1, 6, PAPER_SHADE],
	[2, 9, 4, 1, PAPER_SHADE],
	// The race's blue band round it.
	[1, 5, 6, 2, RACE_BLUE],
	[6, 5, 1, 2, RACE_BLUE_SHADE],
])

const KRAFT_LIT = '#e0b583'
const KRAFT = '#c4935e'
const KRAFT_SHADE = '#9a6c3e'
const SOUP = '#4a2f8c'
const SOUP_LIT = '#7d63cf'

/**
 * A paper cup of warm blueberry soup, blåbärssoppa, as every Swedish race
 * hands out: a squat brown cup for something hot, full to its rim with
 * soup, deep purple-blue, and a wisp of steam curling up off it. 8 by 10.
 */
export const blueberrySoup = pixelArt(8, 10, [
	// Steam.
	[4, 0, 1, 1, STEAM],
	[3, 1, 1, 1, STEAM],
	[4, 2, 1, 1, STEAM],
	// Its rim, and the soup, full up to it.
	[1, 3, 6, 1, KRAFT],
	[0, 4, 8, 1, KRAFT],
	[1, 4, 6, 1, SOUP],
	[2, 4, 2, 1, SOUP_LIT],
	[0, 5, 8, 1, KRAFT_LIT],
	// The cup, lit down its left.
	[1, 6, 6, 3, KRAFT],
	[1, 6, 1, 3, KRAFT_LIT],
	[6, 6, 1, 3, KRAFT_SHADE],
	[2, 9, 4, 1, KRAFT_SHADE],
])

const CRUST_LIT = '#f0c27e'
const CRUST = '#d49a52'
const CRUST_SHADE = '#a46c34'
const CHEESE_LIT = '#ffe9a6'
const CHEESE = '#f7d46c'
const CHEESE_SHADE = '#d6a948'
const SAUCE = '#c7452b'
const BASIL = '#3f8f3a'
const BASIL_LIT = '#5fb252'
const OLIVE = '#2b2722'

/**
 * A slice of pizza, a margherita's: its crust along the top, lit, the
 * cheese melting down to its tip, tomato sauce showing at its edges, and
 * basil and an olive on it. Nothing meaty. 12 by 12.
 */
export const pizzaSlice = pixelArt(12, 12, [
	// The crust, along the top, lit, shaded under.
	[0, 0, 12, 1, CRUST_LIT],
	[0, 1, 12, 1, CRUST],
	[1, 2, 10, 1, CRUST_SHADE],
	// The cheese, narrowing to the tip, a row at a time, sauce at its edges.
	...Array.from(
		{ length: 9 },
		(_, k): [number, number, number, number, string][] => {
			const y = 3 + k
			const half = Math.max(0, Math.round(5 - k * 0.6))
			const left = 6 - half - 1
			const width = half * 2 + 1
			return [
				[left, y, width, 1, CHEESE],
				[left, y, 1, 1, SAUCE],
				[left + width - 1, y, 1, 1, CHEESE_SHADE],
			]
		},
	).flat(),
	[3, 3, 5, 1, CHEESE_LIT],
	// A drip of cheese, down from it.
	[5, 11, 1, 1, CHEESE_SHADE],
	// Basil leaves, and an olive.
	[3, 4, 2, 1, BASIL_LIT],
	[3, 5, 2, 1, BASIL],
	[6, 6, 2, 1, BASIL],
	[7, 4, 1, 1, OLIVE],
	[5, 8, 1, 1, SAUCE],
])
