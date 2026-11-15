import { pixelArt } from './pixelArt'

/**
 * Midnattsloppet's fika, each a cell to a pixel, drawn twice the size, as
 * fika is: off the drinks station's tables, a paper cup of water and a
 * cup of warm blueberry soup; and from a kiosk, a korv med bröd.
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

const BUN_LIT = '#f3c987'
const BUN = '#dfa25a'
const BUN_SHADE = '#b2763a'
const KORV_LIT = '#d9705a'
const KORV = '#b4432f'
const KORV_SHADE = '#86301f'
const KETCHUP = '#d8232a'
const MUSTARD = '#f5cb1f'

/**
 * A korv med bröd: a sausage in a bun, poking out of it at both ends,
 * ketchup and mustard zigzagged along it. 14 by 7.
 */
export const hotDog = pixelArt(14, 7, [
	// The bun, behind it.
	[3, 0, 8, 1, BUN_LIT],
	[2, 1, 10, 1, BUN],
	// The sausage, lit along its top, rounded at its ends.
	[1, 2, 12, 2, KORV],
	[0, 3, 14, 1, KORV],
	[1, 2, 12, 1, KORV_LIT],
	[0, 4, 1, 1, KORV_SHADE],
	[13, 4, 1, 1, KORV_SHADE],
	// Ketchup and mustard, zigzagged along it.
	...[3, 5, 7, 9].flatMap((x): [number, number, number, number, string][] => [
		[x, 2, 1, 1, KETCHUP],
		[x + 1, 3, 1, 1, KETCHUP],
		[x + 1, 2, 1, 1, MUSTARD],
	]),
	// The bun, in front of it.
	[1, 4, 12, 1, BUN_LIT],
	[1, 5, 12, 1, BUN],
	[2, 6, 10, 1, BUN_SHADE],
])
