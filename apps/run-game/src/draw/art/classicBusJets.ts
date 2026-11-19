import { paintedArt } from '../../courses/kit/pixelArt'
import { type BusJets, jetsBehind } from './busJets'

/**
 * The classic bus's wings and jets (see `BusJets`): drawn as it is,
 * three-quarters on, its edges dark as the bus's are. A wing out of its
 * near side under its windows, swept back and down; a fin up off its roof
 * at the back, behind it; and its booster under its back. In cells of 2,
 * in the bus's own pixels, from its top left.
 */

const YELLOW = '#f4b221'
const YELLOW_LIT = '#f9cf43'
const YELLOW_SHADE = '#c48717'
const EDGE = '#212020'
const STRIPE = '#c92128'

/** Whether `(x, y)` is inside the polygon `points`. */
function inside(points: [number, number][], x: number, y: number) {
	let hit = false
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const [xi, yi] = points[i]
		const [xj, yj] = points[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
			hit = !hit
	}
	return hit
}

/** A flat, swept shape, `points` its corners: dark round its edge, lit along its top, in shade along its bottom, a stripe along it. */
function plate(
	width: number,
	height: number,
	points: [number, number][],
	stripe: (x: number, y: number) => boolean,
) {
	return paintedArt(width, height, (x, y) => {
		if (!inside(points, x, y)) return undefined
		const edge = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1],
		].some(([dx, dy]) => !inside(points, x + dx, y + dy))
		if (edge) return EDGE
		if (!inside(points, x, y - 2)) return YELLOW_LIT
		if (!inside(points, x, y + 3)) return YELLOW_SHADE
		if (stripe(x, y)) return STRIPE
		return YELLOW
	})
}

export const CLASSIC_BUS_JETS: BusJets = {
	wing: {
		asset: plate(
			62,
			22,
			[
				[22, 0],
				[61, 0],
				[18, 21],
				[0, 21],
			],
			(x, y) => Math.abs(x + y * 1.95 - 54) < 2,
		),
		width: 124,
		height: 44,
		at: { x: 78, y: 102 },
	},
	fin: {
		asset: plate(
			24,
			20,
			[
				[0, 0],
				[7, 0],
				[23, 19],
				[0, 19],
			],
			(x, y) => Math.abs(x - y * 0.8 - 4) < 1.5 && y > 4,
		),
		width: 48,
		height: 40,
		at: { x: 6, y: -18 },
	},
	finOver: false,
	...jetsBehind({ x: -36, y: 66 }),
}
