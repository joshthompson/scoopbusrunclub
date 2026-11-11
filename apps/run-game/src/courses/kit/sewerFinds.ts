import { pixelArt } from './pixelArt'

/**
 * What's been lost down the Sewers' drains, found along them: in place of
 * fika down there, each a cell to a pixel, drawn twice the size, as fika is.
 */

const YELLOW = '#ffd23f'
const YELLOW_SHADE = '#e0a800'
const GOLD = '#f2c200'
const GOLD_SHADE = '#b8860b'
const GOLD_SHINE = '#fff1a8'

/** A rubber duck, bobbing: 11 by 10. */
export const rubberDuck = pixelArt(11, 10, [
	// Its head, its beak, its eye.
	[4, 0, 4, 1, YELLOW],
	[3, 1, 6, 3, YELLOW],
	[9, 2, 2, 2, '#f28c28'],
	[6, 1, 1, 1, '#1d1d1d'],
	[4, 1, 1, 1, '#fff6c4'],
	// Its body, its tail up behind, and its wing.
	[0, 3, 2, 1, YELLOW],
	[0, 4, 10, 4, YELLOW],
	[1, 8, 8, 1, YELLOW_SHADE],
	[3, 5, 4, 2, YELLOW_SHADE],
	[9, 4, 1, 3, YELLOW_SHADE],
	// The water it's bobbing on.
	[0, 9, 11, 1, '#6fb3d8'],
])

/** A gold ring, a stone set in it: 9 by 9. */
export const goldRing = pixelArt(9, 9, [
	[3, 0, 3, 2, '#7fd8ff'],
	[4, 0, 1, 1, '#ffffff'],
	[2, 2, 5, 1, GOLD],
	[1, 3, 1, 4, GOLD],
	[7, 3, 1, 4, GOLD_SHADE],
	[2, 7, 5, 1, GOLD_SHADE],
	[1, 3, 1, 1, GOLD_SHINE],
])

/** An old coin, a crown stamped on it: 9 by 9. */
export const oldCoin = pixelArt(9, 9, [
	[2, 0, 5, 1, GOLD],
	[1, 1, 7, 1, GOLD],
	[0, 2, 9, 5, GOLD],
	[1, 7, 7, 1, GOLD],
	[2, 8, 5, 1, GOLD_SHADE],
	[8, 3, 1, 4, GOLD_SHADE],
	[7, 7, 1, 1, GOLD_SHADE],
	[2, 1, 2, 1, GOLD_SHINE],
	[1, 2, 1, 2, GOLD_SHINE],
	// Its crown.
	[3, 3, 1, 1, GOLD_SHADE],
	[5, 3, 1, 1, GOLD_SHADE],
	[4, 2, 1, 2, GOLD_SHADE],
	[3, 4, 3, 2, GOLD_SHADE],
])

/** Someone's phone, dropped down a drain, its screen still lit, cracked: 7 by 12. */
export const lostPhone = pixelArt(7, 12, [
	[0, 0, 7, 12, '#2b2b33'],
	[1, 1, 5, 8, '#7fd8ff'],
	[2, 2, 3, 1, '#d9f4ff'],
	[2, 4, 2, 1, '#d9f4ff'],
	// The crack across it.
	[4, 3, 1, 1, '#ffffff'],
	[3, 4, 1, 1, '#ffffff'],
	[3, 5, 1, 1, '#ffffff'],
	[2, 6, 1, 1, '#ffffff'],
	[3, 10, 1, 1, '#8a8f94'],
])
