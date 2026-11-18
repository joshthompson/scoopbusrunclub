import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * A shark, in the sea off Dino Island (see `Obstacle`'s `shark`): side on,
 * facing left, its blunt snout first, slate blue-grey over a white belly,
 * a tall dorsal fin on its back, a pectoral fin under it, its gill slits,
 * a dark eye and a toothy grin; and its tail, a crescent, sweeping, a frame
 * up and a frame down. Lit along its back, as everything is. In cells of 2.
 */

const CELL = 2
const COLUMNS = 48
const ROWS = 22

export const SHARK_WIDTH = COLUMNS * CELL
export const SHARK_HEIGHT = ROWS * CELL

const BACK = '#5d7486'
const BACK_LIT = '#7e95a6'
const BACK_SHADE = '#465a6a'
const BELLY = '#e8eef0'
const BELLY_SHADE = '#c6d0d4'
const INK = '#1d1d1d'
const TOOTH = '#ffffff'
const GILL = '#3d4e5c'

type Point = [number, number]

/** Whether `(x, y)` is inside the polygon `points`. */
function inside(points: Point[], x: number, y: number) {
	let hit = false
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const [xi, yi] = points[i]
		const [xj, yj] = points[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
			hit = !hit
	}
	return hit
}

/** Its body, a torpedo, snout at the left. */
const BODY: Point[] = [
	[1, 12],
	[4, 8],
	[12, 6],
	[26, 6],
	[36, 9],
	[40, 11],
	[36, 14],
	[24, 17],
	[10, 17],
	[3, 15],
]
const DORSAL: Point[] = [
	[18, 7],
	[25, 0],
	[27, 1],
	[26, 7],
]
const PECTORAL: Point[] = [
	[14, 15],
	[20, 21],
	[21, 20],
	[20, 15],
]
/** Its tail, up or down: a crescent off the end of it. */
const tail = (up: boolean): Point[] =>
	up
		? [
				[38, 10],
				[46, 2],
				[47, 4],
				[43, 11],
				[47, 18],
				[45, 18],
				[38, 13],
			]
		: [
				[38, 10],
				[45, 4],
				[47, 4],
				[43, 11],
				[47, 20],
				[45, 21],
				[38, 13],
			]

function shark(up: boolean) {
	const fin = tail(up)
	return paintedArt(COLUMNS, ROWS, (x, y) => {
		const body = inside(BODY, x, y)
		// Its eye, its grin, teeth along it, and its gills.
		if (x === 7.5 && y === 10.5) return INK
		if (body && y === 13.5 && x > 2 && x < 10) return x % 2 < 1 ? TOOTH : INK
		if (body && x > 12 && x < 18 && (x - 12.5) % 2 === 0 && y > 9 && y < 14)
			return GILL
		if (body) {
			// White underneath, from its grin back.
			if (y > 12.5 + (x > 24 ? (x - 24) * 0.1 : 0))
				return y > 15.5 ? BELLY_SHADE : BELLY
			if (!inside(BODY, x, y - 1)) return BACK_LIT
			return BACK
		}
		if (inside(DORSAL, x, y)) return x < 21 ? BACK_LIT : BACK
		if (inside(fin, x, y)) return BACK_SHADE
		if (inside(PECTORAL, x, y)) return BACK_SHADE
		return undefined
	})
}

/** Its two frames, its tail up and down: swimming. */
export const SHARK_FRAMES = [shark(true), shark(false)]
