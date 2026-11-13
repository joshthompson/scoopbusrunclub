import { GIANT_FACE, facePaint, faceProfile } from './bodyScenery'
import { paintedArt, pixelArt } from './pixelArt'

/**
 * The giant's mouth, opening (see `CourseLook['mouth']`): its jaw, cut out
 * of the face as it's painted, to drop; the dark inside of it, its teeth;
 * and its tongue, rolling out over the bench to be run up. In 4-pixel
 * cells, as the face is, in world pixels from the face's top left.
 */

const CELL = 4
/** Its jaw: from just under the line between its lips, down to under its chin. */
export const JAW_FROM = Math.ceil(GIANT_FACE.mouth / CELL) * CELL
const JAW_TO = 900
/** How far the jaw drops, open: enough for a runner to go in standing. */
export const JAW_DROP = 104

/** The jaw, its lower lip and chin, as the face has them. */
export const JAW = paintedArt(
	GIANT_FACE.width / CELL,
	(JAW_TO - JAW_FROM) / CELL,
	(x, y) => facePaint(x * CELL, JAW_FROM + y * CELL),
)

/** Where the front of its lips is, at the line between them. */
export const LIPS_FRONT =
	Math.floor(faceProfile(GIANT_FACE.mouth) / CELL) * CELL

const INSIDE = '#5a1f24'
const INSIDE_DEEP = '#3a1014'
const TOOTH = '#fbf6ec'
const TOOTH_SHADE = '#e2d8c6'

/** Teeth along the top of the mouth, under the upper lip: a cell to 4 px, `width` across. */
function teeth(width: number, upper: boolean) {
	const columns = width / CELL
	const rects: [number, number, number, number, string][] = []
	for (let x = 2; x < columns - 1; x += 4) {
		rects.push([x, 0, 3, 3, TOOTH])
		rects.push([x, upper ? 2 : 0, 3, 1, TOOTH_SHADE])
	}
	return pixelArt(columns, 3, rects)
}

/** The inside of the mouth, behind its teeth: dark, darker at the back. */
export const MOUTH_WIDTH = GIANT_FACE.width - LIPS_FRONT
export const MOUTH_INSIDE = `linear-gradient(to right, ${INSIDE}, ${INSIDE} 60%, ${INSIDE_DEEP})`
export const UPPER_TEETH = teeth(MOUTH_WIDTH - 8, true)
export const LOWER_TEETH = teeth(MOUTH_WIDTH - 8, false)

const TONGUE = '#e0707e'
const TONGUE_LIT = '#f4a0aa'
const TONGUE_SHADE = '#c25462'
const TONGUE_GROOVE = '#d4606e'
/** How thick the tongue is. */
const TONGUE_THICK = 28

/**
 * The tongue, out of the mouth and down over the edge of the bench, its top
 * the Ground everyone runs up: `length` along, its top at `top(x)`, a y in
 * the world, `x` from its tip. Its tip rounded, a groove down the middle of
 * it, lit along its top. Its picture's top is at `top`, a y in the world.
 */
export function tongue(length: number, top: (x: number) => number) {
	const highest = Math.min(top(0), top(length))
	const lowest = Math.max(top(0), top(length))
	const height = Math.ceil((lowest - highest + TONGUE_THICK) / CELL)
	return {
		asset: paintedArt(Math.ceil(length / CELL), height, (cx, cy) => {
			const x = cx * CELL
			const y = cy * CELL + highest
			const surface = top(x)
			const into = y - surface
			// Its tip, rounded off.
			const tip = x < 24 ? Math.sqrt(1 - ((24 - x) / 24) ** 2) : 1
			const thick = TONGUE_THICK * tip
			if (into < -2 || into > thick) return undefined
			if (into < 4) return TONGUE_LIT
			if (into > thick - 6) return TONGUE_SHADE
			if (x > 24 && Math.abs(into - thick / 2) < 2 && (cx + 1) % 6 < 4)
				return TONGUE_GROOVE
			return TONGUE
		}),
		width: Math.ceil(length / CELL) * CELL,
		height: height * CELL,
		top: highest,
	}
}
