import { type PixelRect, pixelArt } from './pixelArt'

/**
 * More of Halloween Town's graveyard, between its big headstones: a
 * Celtic cross, old stones leaning and sunk, a run of iron railings,
 * lanterns left burning on the graves, and a mausoleum to run past. No
 * pumpkins: they're to be worn. Drawn at scale 2, lit by the moon.
 */

const STONE = '#8a8f96'
const STONE_LIT = '#a9aeb5'
const STONE_SHADE = '#62676e'
const STONE_DARK = '#44484e'
const MOSS = '#4e6a3e'
const IRON = '#1c1a20'
const GLOW = '#ffcf5a'
const GLOW_HOT = '#fff2b0'

/** A Celtic cross: its ring, its arms, a tall shaft on a step, moss at the foot. 16 by 28. */
export const celticCross = pixelArt(16, 28, [
	// Its ring.
	[5, 1, 6, 1, STONE],
	[3, 2, 2, 2, STONE],
	[11, 2, 2, 2, STONE],
	[3, 7, 2, 2, STONE],
	[11, 7, 2, 2, STONE],
	[5, 9, 6, 1, STONE_SHADE],
	// Its arms and head.
	[6, 0, 4, 12, STONE],
	[0, 4, 16, 3, STONE],
	[0, 4, 16, 1, STONE_LIT],
	[6, 0, 1, 12, STONE_LIT],
	[9, 0, 1, 12, STONE_SHADE],
	// Its shaft.
	[6, 12, 4, 12, STONE],
	[6, 12, 1, 12, STONE_LIT],
	[9, 12, 1, 12, STONE_SHADE],
	[7, 15, 2, 1, STONE_DARK],
	[7, 18, 2, 1, STONE_DARK],
	// Its step, mossy.
	[3, 24, 10, 4, STONE_SHADE],
	[3, 24, 10, 1, STONE],
	[3, 26, 4, 2, MOSS],
])

/** An old stone, leaning over, its top rounded and chipped. 14 by 18. */
export const leaningStone = pixelArt(14, 18, [
	[5, 0, 5, 1, STONE],
	[4, 1, 7, 1, STONE],
	[3, 2, 8, 2, STONE],
	[3, 4, 8, 2, STONE],
	[2, 6, 8, 3, STONE],
	[2, 9, 8, 3, STONE],
	[1, 12, 8, 3, STONE],
	[3, 1, 2, 14, STONE_LIT],
	[8, 4, 2, 11, STONE_SHADE],
	// Worn letters.
	[4, 7, 4, 1, STONE_DARK],
	[4, 9, 3, 1, STONE_DARK],
	// A chip out of its top.
	[9, 1, 2, 2, STONE_DARK],
	// Sunk in the grass.
	[0, 15, 13, 3, MOSS],
])

/** A little stone, sunk nearly to its shoulders. 10 by 9. */
export const sunkStone = pixelArt(10, 9, [
	[2, 0, 6, 1, STONE],
	[1, 1, 8, 6, STONE],
	[1, 1, 2, 6, STONE_LIT],
	[7, 1, 2, 6, STONE_SHADE],
	[3, 3, 4, 1, STONE_DARK],
	[0, 6, 10, 3, MOSS],
])

/** A run of iron railings, spiked, one bent. 40 by 20. */
export const ironRailings = (() => {
	const rects: PixelRect[] = [
		[0, 6, 40, 1, IRON],
		[0, 16, 40, 1, IRON],
	]
	for (let x = 1; x < 40; x += 4) {
		const bent = x === 25
		rects.push([x, bent ? 4 : 2, 1, bent ? 16 : 18, IRON])
		rects.push([x - 1, bent ? 4 : 2, 3, 1, IRON])
		rects.push([x, bent ? 3 : 1, 1, 1, IRON])
		if (bent) rects.push([x + 1, 2, 1, 2, IRON])
	}
	// Its posts, thicker, a ball on top.
	rects.push([0, 0, 2, 20, IRON], [38, 0, 2, 20, IRON])
	return pixelArt(40, 20, rects)
})()

/** A lantern on a post, left burning on a grave. 8 by 28. */
export const graveLantern = pixelArt(8, 28, [
	// Its glow, round it.
	[0, 2, 8, 9, 'rgba(255, 207, 90, 0.18)'],
	[1, 1, 6, 11, 'rgba(255, 207, 90, 0.18)'],
	// The lantern.
	[3, 0, 2, 1, IRON],
	[2, 1, 4, 1, IRON],
	[2, 2, 4, 7, IRON],
	[3, 3, 2, 5, GLOW],
	[3, 4, 2, 2, GLOW_HOT],
	[2, 9, 4, 1, IRON],
	// Its post.
	[3, 10, 2, 16, IRON],
	[2, 26, 4, 2, IRON],
])

/**
 * A mausoleum: a little stone house for the dead, a pediment over columns,
 * an iron door, an urn either side of its steps. 56 by 52.
 */
export const mausoleum = (() => {
	const rects: PixelRect[] = [
		// Its pediment.
		[26, 0, 4, 1, STONE_LIT],
		[22, 1, 12, 2, STONE_LIT],
		[16, 3, 24, 2, STONE],
		[10, 5, 36, 2, STONE],
		[6, 7, 44, 2, STONE_SHADE],
		[25, 3, 6, 3, STONE_DARK],
		[4, 9, 48, 3, STONE_LIT],
		[4, 12, 48, 1, STONE_DARK],
		// Its walls.
		[6, 13, 44, 30, STONE_SHADE],
		// Its door, iron, barred.
		[21, 20, 14, 23, IRON],
		[22, 21, 12, 22, '#2a2830'],
		[24, 21, 1, 22, IRON],
		[27, 21, 1, 22, IRON],
		[30, 21, 1, 22, IRON],
		[22, 30, 12, 1, IRON],
		[21, 18, 14, 2, STONE_LIT],
		// A faint light inside.
		[25, 33, 6, 6, 'rgba(255, 207, 90, 0.35)'],
		// Its steps.
		[2, 43, 52, 3, STONE],
		[2, 43, 52, 1, STONE_LIT],
		[0, 46, 56, 3, STONE_SHADE],
		[0, 49, 56, 3, STONE_DARK],
		// Moss creeping up its corners.
		[6, 36, 3, 7, MOSS],
		[47, 32, 3, 11, MOSS],
		[44, 40, 3, 3, MOSS],
	]
	// Its columns.
	for (const x of [8, 15, 38, 45]) {
		rects.push([x, 13, 4, 30, STONE])
		rects.push([x, 13, 1, 30, STONE_LIT])
		rects.push([x + 3, 13, 1, 30, STONE_SHADE])
		rects.push([x - 1, 13, 6, 1, STONE_LIT])
	}
	// Urns either side of its steps.
	for (const x of [0, 51])
		rects.push(
			[x + 1, 37, 3, 1, STONE],
			[x, 38, 5, 4, STONE],
			[x + 1, 42, 3, 1, STONE_SHADE],
		)
	return pixelArt(56, 52, rects)
})()
