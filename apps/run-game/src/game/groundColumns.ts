import { START_X } from './constants'
import type { Terrain } from './terrain'

/**
 * The Ground's drawn in columns, from a little behind the start: these say
 * where they are, and where its top is in each, so a course's own art can
 * line up with it exactly.
 */

/** Drawn from this far behind the start, for the bus to drive out of. */
export const DRAWN_FROM = START_X - 1400
/** How wide each column is, so its slopes come out as pixel art. */
export const GROUND_STEP = 4
/** How many columns either way a smoothed layer of the ground's averaged over. */
export const SMOOTH_COLUMNS = 30

/** The middle of column `i`. */
export const columnMiddle = (i: number) =>
	DRAWN_FROM + i * GROUND_STEP + GROUND_STEP / 2

/** The ground's top in column `i`: none over a Gap. */
export function columnTop(terrain: Terrain, i: number) {
	const middle = columnMiddle(i)
	return terrain.inGap(middle)
		? undefined
		: Math.round(terrain.groundY(middle) / 2) * 2
}

/**
 * The top in column `i` of `tops`, smoothed: averaged with the columns
 * either side, those not over a Gap. Deep under the path, so its steps
 * don't show right down through it.
 */
export function smoothedTop(tops: (number | undefined)[], i: number) {
	if (tops[i] === undefined) return undefined
	let sum = 0
	let count = 0
	for (let k = i - SMOOTH_COLUMNS; k <= i + SMOOTH_COLUMNS; k++) {
		const near = tops[k]
		if (near === undefined) continue
		sum += near
		count++
	}
	return Math.round(sum / count / 2) * 2
}
