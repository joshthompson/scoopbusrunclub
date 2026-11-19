import { busCell, paintedBitmap } from './bus'

/**
 * The bus's wings and jets, for flying (see `CourseLook['busJets']`): shrunk
 * down and inside someone, or under the sea, there's no road to drive on,
 * so it sprouts a wing out of its near side, level and swept back, a fin
 * up off the middle of its roof, and a rocket booster under its back,
 * roaring. Drawn as the bus is, going back across the path at its slant.
 * Its own yellow, lit along their tops, in shade along their undersides,
 * a red stripe down them like its lettering. In cells of 2, in the bus's
 * own pixels, from its top left.
 */

const CELL = 2
const YELLOW = '#f4b221'
const YELLOW_LIT = '#f9cf43'
const YELLOW_SHADE = '#c48717'
const STRIPE = '#c92128'
const within = (n: number, from: number, to: number) => n >= from && n < to
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

/**
 * A flat, swept shape, its corners where they are on the bus (see
 * `busCell`): lit along its top edge, in shade along its bottom, a red
 * stripe where `stripe` says, in cells on the bus. Its picture, and where
 * it goes on the bus's.
 */
function plate(
	corners: { x: number; y: number }[],
	stripe: (x: number, y: number) => boolean,
	/** Its colour: lit, for one lying level, its top to the sky. */
	fill = YELLOW,
) {
	const left = Math.floor(Math.min(...corners.map((c) => c.x)))
	const top = Math.floor(Math.min(...corners.map((c) => c.y)))
	const width = Math.ceil(Math.max(...corners.map((c) => c.x))) - left
	const height = Math.ceil(Math.max(...corners.map((c) => c.y))) - top
	const points = corners.map((c): [number, number] => [c.x - left, c.y - top])
	return {
		asset: paintedBitmap(width, height, (x, y) => {
			if (!inside(points, x, y)) return undefined
			if (!inside(points, x, y - 1))
				return fill === YELLOW ? YELLOW_LIT : YELLOW
			if (!inside(points, x, y + 1)) return YELLOW_SHADE
			if (stripe(x + left, y + top)) return STRIPE
			return fill
		}),
		width: width * CELL,
		height: height * CELL,
		at: { x: left * CELL, y: top * CELL },
	}
}

/**
 * A wing, out of its near side under its name: level, so seen from above,
 * coming out towards us and swept back; a stripe along it behind its
 * leading edge.
 */
const WING_UP = 14
const WING_OUT = -22
const BUS_WING = plate(
	[
		busCell(30, WING_UP),
		busCell(74, WING_UP),
		busCell(40, WING_UP, WING_OUT),
		busCell(24, WING_UP, WING_OUT),
	],
	(x, y) => {
		// Along it, back from its leading edge: the edge from its root's
		// front to its tip's.
		const root = busCell(74, WING_UP)
		const tip = busCell(40, WING_UP, WING_OUT)
		const t = (y - root.y) / (tip.y - root.y)
		const edge = root.x + (tip.x - root.x) * t
		return within(edge - x, 4, 6)
	},
	YELLOW_LIT,
)

/** A fin, up off the middle of its roof at the back, swept back, a stripe up it. */
const BUS_FIN = plate(
	[busCell(2, 50, 8), busCell(24, 50, 8), busCell(9, 64, 8), busCell(2, 64, 8)],
	(x, y) => {
		const base = busCell(0, 50, 8)
		const up = base.y - y
		const along = x - base.x
		return within(along - (24 - up * 1.1), -6, -4) && up > 2
	},
)

/** Where the booster is: its picture's top left, its nozzle's end out behind the bus, low, a little way back across the path. */
const BOOSTER_AT = busCell(-22, 12 + 6.5, 4)

/** A rocket booster, slung under its back, its nozzle out behind. */
const BOOSTER = paintedBitmap(34, 13, (x, y) => {
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
})

/**
 * Its booster's flame, roaring out behind it: three frames, flickering, a
 * white-hot core in yellow, then orange, then red at its ragged tip. Out
 * to the left of the booster's nozzle.
 */
function flame(frame: number) {
	const lengths = [26, 21, 24]
	const length = lengths[frame]
	return paintedBitmap(30, 13, (x, y) => {
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
const FLAME = [flame(0), flame(1), flame(2)]

/**
 * Under the sea, a turbine in place of the booster's flame (see
 * `CourseLook['busJets']`'s `turbine`): a propeller out behind its nozzle,
 * turning, seen side on, its blades sweeping round, a frame each, in a
 * ring of a duct; and a stream of bubbles churned out behind it.
 */
function propeller(frame: number) {
	// How far up and down its blades reach this frame, as they turn.
	const reach = [11, 6, 2][frame]
	const other = [2, 6, 11][frame]
	return paintedBitmap(12, 26, (x, y) => {
		// The duct round it: a ring, side on, its top and bottom.
		if (x >= 2 && x < 10 && (y < 2 || y >= 24))
			return y < 1 || y >= 25 ? METAL_SHADE : METAL
		// Its hub, on its shaft.
		if (x >= 8 && Math.abs(y - 13) < 2) return NOZZLE
		if (x >= 4 && x < 8 && Math.abs(y - 13) < 2.5) return '#1d1d1d'
		// Its blades: one sweeping up and down, the other across.
		const d = y - 13
		if (x >= 5 && x < 7 && Math.abs(d) < reach)
			return d < 0 ? YELLOW_LIT : YELLOW
		if (x >= 4 && x < 8 && Math.abs(d) < other && Math.abs(d) > 1)
			return d < 0 ? YELLOW : YELLOW_SHADE
		return undefined
	})
}
const PROPELLER = [propeller(0), propeller(1), propeller(2)]

/** Bubbles, churned out behind it, streaming away: three frames, each a little further on. */
function bubbles(frame: number) {
	const BUBBLE = '#e6f8ff'
	const RIM = '#9fd6ee'
	const all: [x: number, y: number, r: number][] = [
		[26, 6, 1.5],
		[20, 4, 1],
		[16, 8, 2],
		[10, 5, 1.2],
		[6, 9, 1.6],
		[2, 3, 1],
		[23, 10, 1],
		[13, 2, 1],
	]
	return paintedBitmap(30, 13, (x, y) => {
		for (const [bx, by, r] of all) {
			const cx = bx - frame * 3
			const cy = by - frame
			const d = Math.hypot(x - cx, y - cy)
			if (d < r + 0.6) return d > r - 0.4 ? RIM : BUBBLE
		}
		return undefined
	})
}
const BUBBLES = [bubbles(0), bubbles(1), bubbles(2)]

/** A picture of a part, and where it goes on the bus's: a sheet of frames, if it moves. */
export interface JetPart {
	asset: string
	frames?: string[]
	width: number
	height: number
	at: { x: number; y: number }
}

/** A bus's wings and jets: its wing, its fin (and whether it's drawn over its body), and what's out behind. */
export interface BusJets {
	wing: JetPart
	fin: JetPart
	finOver: boolean
	booster: JetPart
	flame: JetPart
	propeller: JetPart
	bubbles: JetPart
}

/** The booster, its picture's top left `at` on the bus's, and its flame, or its propeller and bubbles, out behind it. */
export function jetsBehind(at: { x: number; y: number }) {
	const propellerAt = { x: at.x - 22, y: at.y - 13 }
	const sheet = (
		frames: string[],
		width: number,
		height: number,
		at: { x: number; y: number },
	): JetPart => ({
		asset: frames[0],
		frames,
		width,
		height,
		at,
	})
	return {
		booster: { asset: BOOSTER, width: 68, height: 26, at },
		flame: sheet(FLAME, 60, 26, { x: at.x - 58, y: at.y }),
		propeller: sheet(PROPELLER, 24, 52, propellerAt),
		bubbles: sheet(BUBBLES, 60, 26, { x: propellerAt.x - 60, y: at.y - 2 }),
	}
}

/** The new bus's: its booster low, a little way back across the path; its fin on its roof, over it. */
export const NEW_BUS_JETS: BusJets = {
	wing: BUS_WING,
	fin: BUS_FIN,
	finOver: true,
	...jetsBehind({
		x: Math.round(BOOSTER_AT.x) * CELL,
		y: Math.round(BOOSTER_AT.y) * CELL,
	}),
}
