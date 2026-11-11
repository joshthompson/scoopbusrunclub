import type { JSX } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'

/**
 * A hang glider, The Cliff's Ride, side on and facing right, in cells
 * twice the size of a screen pixel: its wing, striped, over its frame, and
 * the bar at the bottom of that, which its rider hangs on to. Parked, its
 * bar's on the ground.
 */

const CELL = 2
const COLUMNS = 42
const ROWS = 22

export const GLIDER_WIDTH = COLUMNS * CELL
export const GLIDER_HEIGHT = ROWS * CELL

const STRIPES = ['#f7d117', '#7b3fb5', '#f7d117', '#e8613c']
const EDGE = '#2b2b2b'
const TUBE = '#9aa3ad'
const BAR = '#4a4f57'

/** Whether a cell's middle is inside `points`. */
function inside(points: [number, number][], x: number, y: number) {
	let into = false
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const [xi, yi] = points[i]
		const [xj, yj] = points[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
			into = !into
	}
	return into
}

/** A straight line of cells, from one to the other. */
function line(
	[x0, y0]: [number, number],
	[x1, y1]: [number, number],
	colour: string,
): PixelRect[] {
	const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
	const cells: PixelRect[] = []
	for (let i = 0; i <= steps; i++) {
		const t = steps ? i / steps : 0
		cells.push([
			Math.round(x0 + (x1 - x0) * t),
			Math.round(y0 + (y1 - y0) * t),
			1,
			1,
			colour,
		])
	}
	return cells
}

/** Its wing, seen from a little below: swept back from its nose, on the right. */
const WING: [number, number][] = [
	[1, 7],
	[18, 1],
	[41, 4],
	[21, 9],
]

function wing(): PixelRect[] {
	const cells: PixelRect[] = []
	for (let y = 0; y < 11; y++)
		for (let x = 0; x < COLUMNS; x++) {
			if (!inside(WING, x + 0.5, y + 0.5)) continue
			// Stripes across it, front to back.
			const band = Math.floor((x + y * 1.4) / 7) % STRIPES.length
			cells.push([x, y, 1, 1, STRIPES[band]])
		}
	return [
		...cells,
		// Its leading edge, and its keel down the middle.
		...line([18, 1], [41, 4], EDGE),
		...line([1, 7], [18, 1], EDGE),
		...line([3, 7], [38, 5], '#5b2c87'),
	]
}

const GLIDER = pixelArt(COLUMNS, ROWS, [
	...wing(),
	// Its frame: down from where it hangs to the bar, and the bar.
	...line([21, 7], [16, 20], TUBE),
	...line([21, 7], [27, 20], TUBE),
	...line([21, 7], [21, 12], TUBE),
	[15, 20, 13, 2, BAR],
	[14, 20, 1, 1, EDGE],
	[28, 20, 1, 1, EDGE],
])

/** An ink outline round its wing, as the corgi has, so it stands out against the sky. */
const OUTLINE: JSX.CSSProperties = {
	filter: 'drop-shadow(0 2px 0 rgba(0, 0, 0, 0.25))',
}

export function GliderArt() {
	return (
		<div style={OUTLINE}>
			<PixelArt src={GLIDER} width={GLIDER_WIDTH} height={GLIDER_HEIGHT} />
		</div>
	)
}

/**
 * The Scoop Bus's own glider, for going off a cliff after everyone: a great
 * wing in its own yellow and black, hazard stripes across it, a red keel,
 * and the club's roundel, on struts bolted to its roof. 150 by 34 cells.
 */
const BUS_COLUMNS = 150
const BUS_ROWS = 34
export const BUS_GLIDER_WIDTH = BUS_COLUMNS * CELL
export const BUS_GLIDER_HEIGHT = BUS_ROWS * CELL

const BUS_WING: [number, number][] = [
	[2, 15],
	[64, 1],
	[149, 7],
	[74, 21],
]
const HAZARD = ['#f7d117', '#f7d117', '#1d1d1d']

export const busGlider = (() => {
	const cells: PixelRect[] = []
	for (let y = 0; y < 23; y++)
		for (let x = 0; x < BUS_COLUMNS; x++) {
			if (!inside(BUS_WING, x + 0.5, y + 0.5)) continue
			const band = Math.floor((x - y * 1.5) / 4) % HAZARD.length
			cells.push([x, y, 1, 1, HAZARD[(band + HAZARD.length) % HAZARD.length]])
		}
	// The club's roundel, on the wing: red, a white ring, yellow in the middle.
	const roundel: PixelRect[] = [
		[94, 6, 10, 8, '#d22b2b'],
		[93, 7, 12, 6, '#d22b2b'],
		[95, 7, 8, 6, '#f6f7f8'],
		[96, 8, 6, 4, '#d22b2b'],
		[97, 9, 4, 2, '#f7d117'],
	]
	return pixelArt(BUS_COLUMNS, BUS_ROWS, [
		...cells,
		...roundel,
		// Its leading edge, its trailing edge, and its keel.
		...line([64, 1], [149, 7], EDGE),
		...line([2, 15], [64, 1], EDGE),
		...line([2, 15], [74, 21], EDGE),
		...line([4, 15], [146, 8], '#d22b2b'),
		// Struts, down to the roof, and their feet, bolted on.
		...line([60, 18], [44, 33], BAR),
		...line([61, 18], [45, 33], BAR),
		...line([84, 18], [100, 33], BAR),
		...line([85, 18], [101, 33], BAR),
		...line([72, 20], [72, 33], BAR),
		[40, 32, 10, 2, EDGE],
		[96, 32, 10, 2, EDGE],
		[68, 32, 9, 2, EDGE],
	])
})()
