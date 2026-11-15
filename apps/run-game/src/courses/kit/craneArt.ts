import { type PixelRect, pixelArt } from './pixelArt'

/**
 * A tower crane, stood on a roof, `mast` cells tall to its jib: a yellow
 * lattice mast, its cab at the top, its jib out to the left, the way the
 * course goes, its counter-jib back to the right with its concrete
 * weights, and its trolley's line hanging from near the jib's tip. Drawn a
 * pixel a cell, for scenery at twice that. `JIB_LEFT` cells left of its
 * mast's middle is the jib's tip.
 */

const STEEL = '#f0b52a'
const STEEL_DARK = '#a8761a'
const STEEL_DEEP = '#6e4c10'
const CAB = '#e8e2d2'
const GLASS = '#7fb7d8'
const WEIGHT = '#8c8c94'
const LINE = '#25252c'

/** How far its jib reaches left, and its counter-jib right, of its mast's middle. */
export const JIB_LEFT = 54
const JIB_RIGHT = 20
/** Its mast, how wide; its jib, how far down from the top of the picture, and how deep. */
const MAST = 6
export const JIB_TOP = 6
export const JIB = 4

export function towerCrane(mast: number) {
	const w = JIB_LEFT + JIB_RIGHT + 2
	const mid = JIB_LEFT
	const jibY = JIB_TOP
	const h = jibY + JIB + mast
	const rects: PixelRect[] = []
	// The mast: its two sides, and its lattice, a cross every few rows.
	const left = mid - MAST / 2
	rects.push([left, jibY, 1, h - jibY, STEEL])
	rects.push([left + MAST - 1, jibY, 1, h - jibY, STEEL_DARK])
	for (let y = jibY + JIB; y < h - 1; y += 6) {
		rects.push([left, y, MAST, 1, STEEL_DARK])
		for (let k = 1; k < 5; k++) {
			rects.push([left + k, y + k, 1, 1, STEEL])
			rects.push([left + MAST - 1 - k, y + k, 1, 1, STEEL_DEEP])
		}
	}
	// Its foot, bolted down.
	rects.push([left - 2, h - 2, MAST + 4, 2, STEEL_DEEP])
	// The jib, out to the left, and the counter-jib, back to the right: a
	// beam top and bottom, triangles of lattice between.
	rects.push([0, jibY, w, 1, STEEL])
	rects.push([0, jibY + JIB - 1, w, 1, STEEL_DARK])
	for (let x = 1; x < w - 1; x += 4) {
		rects.push([x, jibY + 1, 1, 1, STEEL_DARK])
		rects.push([x + 1, jibY + 2, 1, 1, STEEL_DARK])
	}
	// Its peak over the mast, and the ties out to either end.
	rects.push([mid - 1, 0, 2, jibY, STEEL_DARK])
	for (let x = 2; x < mid - 1; x++) {
		const y = Math.round(((mid - 1 - x) / (mid - 3)) * (jibY - 1))
		rects.push([x, y, 1, 1, LINE])
	}
	for (let x = mid + 1; x < w - 2; x++) {
		const y = Math.round(((x - mid - 1) / (JIB_RIGHT - 1)) * (jibY - 1))
		rects.push([x, y, 1, 1, LINE])
	}
	// The concrete weights on the counter-jib, and the cab under the jib.
	rects.push([w - 8, jibY + JIB, 6, 5, WEIGHT])
	rects.push([w - 8, jibY + JIB, 6, 1, '#a9a9b1'])
	rects.push([left - 3, jibY + JIB, 4, 4, CAB])
	rects.push([left - 3, jibY + JIB + 1, 2, 2, GLASS])
	// Its trolley, near the tip, and its line down, out of sight.
	rects.push([3, jibY + JIB, 3, 2, STEEL_DEEP])
	return { asset: pixelArt(w, h, rects), width: w, height: h }
}
