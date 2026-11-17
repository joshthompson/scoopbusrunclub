import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * The bus's wings and jets, for flying (see `CourseLook['busJets']`): shrunk
 * down and inside someone, there's no road to drive on, so it sprouts a
 * wing out of each side, swept back, a fin up off its roof, and a rocket
 * booster under its back, roaring. Its own yellow, its edges dark as the
 * bus's are, a red stripe down them like its lettering. In cells of 2, in
 * the bus's own pixels, from its top left.
 */

const YELLOW = '#f4b221'
const YELLOW_LIT = '#f9cf43'
const YELLOW_SHADE = '#c48717'
const EDGE = '#212020'
const STRIPE = '#c92128'
const METAL = '#8f989e'
const METAL_LIT = '#c3cacd'
const METAL_SHADE = '#5c656b'
const NOZZLE = '#3a3f44'

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

/** A wing, out of its near side under its windows, swept back and down. */
export const BUS_WING = {
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
}

/** A fin, up off its roof at the back, swept back. */
export const BUS_FIN = {
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
}

/** A rocket booster, slung under its back, its nozzle out behind. */
export const BUS_BOOSTER = {
	asset: paintedArt(34, 13, (x, y) => {
		// Its nose, round, to the right; its body; its nozzle, flared, to the left.
		const body =
			(x >= 6 &&
				y >= 1 &&
				y < 12 &&
				((x - 27) / 7) ** 2 + ((y - 6.5) / 5.5) ** 2 <= 1) ||
			(x >= 6 && x < 27 && y >= 1 && y < 12)
		const nozzle = x < 7 && Math.abs(y - 6.5) < 3.5 + (7 - x) * 0.4
		if (nozzle) return x < 2 ? '#1d1d1d' : NOZZLE
		if (!body) return undefined
		if (y < 2.5) return METAL_LIT
		if (y > 10) return METAL_SHADE
		// Red bands round it, and its fins' roots.
		if (Math.floor(x) === 10 || Math.floor(x) === 11) return STRIPE
		return y < 5 ? METAL_LIT : METAL
	}),
	width: 68,
	height: 26,
	at: { x: -36, y: 66 },
}

/**
 * Its booster's flame, roaring out behind it: three frames, flickering, a
 * white-hot core in yellow, then orange, then red at its ragged tip. Out
 * to the left of the booster's nozzle.
 */
function flame(frame: number) {
	const lengths = [26, 21, 24]
	const length = lengths[frame]
	return paintedArt(30, 13, (x, y) => {
		const from = 30 - x
		const along = from / length
		if (along > 1) return undefined
		const half =
			5.5 * (1 - along * 0.85) + Math.sin(from * 0.9 + frame * 2) * 0.8
		const d = Math.abs(y - 6.5)
		if (d > half) return undefined
		if (along < 0.25 && d < half * 0.5) return '#fffbe8'
		if (along < 0.55 && d < half * 0.75) return '#ffd84a'
		if (along < 0.8) return '#ff8a1e'
		return '#e0402a'
	})
}
export const BUS_FLAME = {
	frames: [flame(0), flame(1), flame(2)],
	width: 60,
	height: 26,
	at: { x: BUS_BOOSTER.at.x - 58, y: BUS_BOOSTER.at.y },
}
