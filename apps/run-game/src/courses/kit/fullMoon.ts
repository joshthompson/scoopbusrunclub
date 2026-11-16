import { paintedArt } from './pixelArt'

/**
 * A full moon, the whole of it lit: pale, its seas (the maria) a little
 * darker, a crater or two, and its edge stepped round. 60 by 60, as the
 * website's moon phases are, so it takes the same `sunScale`; recoloured
 * by the course's `sun` filter. Halloween Town's, a blood moon.
 */

const FACE = '#fff5c4'
const LIT = '#fffbe2'
const SEA = '#e9dca4'
const CRATER = '#ddce92'

/** The seas, each a blob: its middle, and how far it reaches. */
const SEAS: [x: number, y: number, r: number][] = [
	[22, 20, 9],
	[34, 16, 6],
	[38, 30, 8],
	[26, 36, 6],
	[18, 42, 4],
]
/** Craters, small and round. */
const CRATERS: [x: number, y: number, r: number][] = [
	[44, 44, 3],
	[14, 28, 2],
	[32, 48, 2],
]

const within = (x: number, y: number, [cx, cy, r]: [number, number, number]) =>
	(x - cx) ** 2 + (y - cy) ** 2 <= r * r

export const fullMoon = paintedArt(60, 60, (x, y) => {
	const dx = x + 0.5 - 30
	const dy = y + 0.5 - 30
	if (dx * dx + dy * dy > 29 * 29) return undefined
	if (CRATERS.some((c) => within(x, y, c))) return CRATER
	if (SEAS.some((s) => within(x, y, s))) return SEA
	// Its rim lit a little brighter round its top left.
	return dx * dx + dy * dy > 25 * 25 && dx + dy < -12 ? LIT : FACE
})
