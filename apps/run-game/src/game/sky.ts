import type { Obstacle } from '../courses/types'

/**
 * The Cliff's sky: what's in the way out over the sea, and where, worked
 * out from the tick, so it's the same on every screen. Each says where its
 * parts are, to fly into and to draw. `line` is the sea's surface under
 * it: heights are over that.
 */

type Of<K extends Obstacle['kind']> = Extract<Obstacle, { kind: K }>

/** Left, right, top and bottom. */
export interface Box {
	left: number
	right: number
	top: number
	bottom: number
}

/** Each on its own beat, out of step with the rest: from where it is. */
const offset = (x: number, every: number) => Math.round(x * 7.31) % every

// --- Gulls -----------------------------------------------------------------

export const GULL_WIDTH = 24
export const GULL_HEIGHT = 14
/** How far apart a flock's gulls wheel about. */
const GULL_GAP = 34
/** Scattered: how fast they're off, up and back, and how far before they're gone. */
const GULL_SCATTER_UP = 4
const GULL_SCATTER_BACK = 2
export const GULL_SCATTER_TICKS = 90

export interface Gull {
	x: number
	y: number
	/** Wings up. */
	flap: boolean
}

/**
 * Each of a flock's gulls, its middle, wheeling about where they are; or,
 * scattered `flown` ticks ago, flying off up and away.
 */
export function gullsAt(
	o: Of<'gulls'>,
	line: number,
	now: number,
	flown?: number,
): Gull[] {
	const gulls: Gull[] = []
	for (let i = 0; i < o.count; i++) {
		let x =
			o.x +
			(i - (o.count - 1) / 2) * GULL_GAP +
			Math.sin(now / 50 + i * 1.7) * 14
		let y =
			line - o.height + (i % 2 ? 12 : -4) + Math.sin(now / 23 + i * 2.3) * 8
		let flap = Math.floor(now / 7 + i) % 2 === 0
		if (flown !== undefined) {
			const t = now - flown
			x -= t * GULL_SCATTER_BACK * (1 + (i % 3) * 0.4)
			y -= t * GULL_SCATTER_UP * (1 + (i % 2) * 0.3)
			flap = Math.floor(now / 3 + i) % 2 === 0
		}
		gulls.push({ x, y, flap })
	}
	return gulls
}

// --- Hot-air balloons --------------------------------------------------------

export const BALLOON_WIDTH = 72
export const BALLOON_ENVELOPE = 80
export const BALLOON_ROPES = 14
export const BALLOON_BASKET = 18
export const BALLOON_HEIGHT = BALLOON_ENVELOPE + BALLOON_ROPES + BALLOON_BASKET
/** How long one takes to drift up and back down. */
const BALLOON_DRIFT = 420

/** Where a balloon's top is, drifting, and what of it there is to bump into. */
export function balloonAt(o: Of<'balloon'>, line: number, now: number) {
	const t = ((now + offset(o.x, BALLOON_DRIFT)) / BALLOON_DRIFT) * Math.PI * 2
	const height = o.low + (o.high - o.low) * (0.5 - 0.5 * Math.cos(t))
	const top = line - height - BALLOON_HEIGHT / 2
	const basketTop = top + BALLOON_ENVELOPE + BALLOON_ROPES
	return {
		top,
		parts: [
			// Its envelope, a little in from its corners: it's round.
			{
				left: o.x - BALLOON_WIDTH / 2 + 6,
				right: o.x + BALLOON_WIDTH / 2 - 6,
				top: top + 6,
				bottom: top + BALLOON_ENVELOPE - 4,
			},
			{
				left: o.x - 12,
				right: o.x + 12,
				top: basketTop,
				bottom: basketTop + BALLOON_BASKET,
			},
		] satisfies Box[],
	}
}

// --- Storm Clouds -----------------------------------------------------------

export const STORM_WIDTH = 160
export const STORM_HEIGHT = 64
/** How long between strikes; when, in that, it starts flickering; and how long a strike lasts. */
const STORM_EVERY = 210
const STORM_BREWS = 120
const STORM_STRIKES = 170
const STORM_STRIKE_TICKS = 26
/** How wide a bolt is to fly into. */
const BOLT_REACH = 12

/**
 * A Storm Cloud, `now`: which of its strikes it's on, whether it's brewing
 * one, flickering, or striking, and what of it there is to fly into.
 */
export function stormAt(o: Of<'storm'>, line: number, now: number) {
	const t = now + offset(o.x, STORM_EVERY)
	const round = Math.floor(t / STORM_EVERY)
	const at = t % STORM_EVERY
	const top = line - o.height - STORM_HEIGHT / 2
	const bottom = top + STORM_HEIGHT
	const striking =
		at >= STORM_STRIKES && at < STORM_STRIKES + STORM_STRIKE_TICKS
	const cloud: Box = {
		left: o.x - STORM_WIDTH / 2 + 14,
		right: o.x + STORM_WIDTH / 2 - 14,
		top: top + 12,
		bottom: bottom - 8,
	}
	const bolt: Box = {
		left: o.x - BOLT_REACH,
		right: o.x + BOLT_REACH,
		top: bottom - 8,
		bottom: line,
	}
	return {
		round,
		top,
		bottom,
		brewing: at >= STORM_BREWS && at < STORM_STRIKES,
		striking,
		parts: striking ? [cloud, bolt] : [cloud],
	}
}

// --- Wind turbines -----------------------------------------------------------

export const TURBINE_BLADE = 118
export const TURBINE_TOWER = 12
/** How long its blades take to go round once. */
const TURBINE_TURN = 360
/** How thick a blade is, either side of its middle, to fly into. */
const BLADE_REACH = 5

/** A turbine's hub, and its blades' angles, in radians, `now`. */
export function turbineAt(o: Of<'turbine'>, line: number, now: number) {
	const turn = ((now + offset(o.x, TURBINE_TURN)) / TURBINE_TURN) * Math.PI * 2
	return {
		hub: { x: o.x, y: line - o.height },
		angles: [0, 1, 2].map((i) => turn + (i * Math.PI * 2) / 3),
		tower: {
			left: o.x - TURBINE_TOWER / 2,
			right: o.x + TURBINE_TOWER / 2,
			top: line - o.height + 10,
			bottom: line,
		} satisfies Box,
	}
}

/** Whether any of a turbine's blades, or its tower, is in `box`. */
export function turbineHits(turbine: ReturnType<typeof turbineAt>, box: Box) {
	if (overlap(turbine.tower, box)) return true
	const { hub } = turbine
	for (const angle of turbine.angles) {
		const dx = Math.cos(angle)
		const dy = Math.sin(angle)
		for (let r = 10; r <= TURBINE_BLADE; r += 6) {
			const x = hub.x + dx * r
			const y = hub.y + dy * r
			if (
				x > box.left - BLADE_REACH &&
				x < box.right + BLADE_REACH &&
				y > box.top - BLADE_REACH &&
				y < box.bottom + BLADE_REACH
			)
				return true
		}
	}
	return false
}

// --- Whales -------------------------------------------------------------------

/** How long between spouts; and, in that, when it surfaces, blows, and dives again. */
const WHALE_EVERY = 330
const WHALE_SURFACES = 40
const WHALE_BLOWS = 150
const SPOUT_RISE = 18
const SPOUT_HOLD = 40
const SPOUT_FALL = 18
const WHALE_DIVES = 270
/** How wide the spout is, to fly into. */
const SPOUT_REACH = 14
/** Where its blowhole is, ahead of its middle: it faces left, towards whoever's coming. */
export const BLOWHOLE = -20

/**
 * A whale, `now`: which of its spouts it's on, how far up out of the sea
 * it is (0 to 1), how high its spout's got (0 to 1), and what of that
 * there is to fly into.
 */
export function whaleAt(o: Of<'whale'>, line: number, now: number) {
	const t = now + offset(o.x, WHALE_EVERY)
	const round = Math.floor(t / WHALE_EVERY)
	const at = t % WHALE_EVERY
	const ease = (n: number) => Math.max(0, Math.min(1, n))
	const up =
		at < WHALE_DIVES
			? ease((at - WHALE_SURFACES) / 30)
			: 1 - ease((at - WHALE_DIVES) / 30)
	const blowing = at - WHALE_BLOWS
	const spout =
		blowing < 0
			? 0
			: blowing < SPOUT_RISE
				? blowing / SPOUT_RISE
				: blowing < SPOUT_RISE + SPOUT_HOLD
					? 1
					: ease(1 - (blowing - SPOUT_RISE - SPOUT_HOLD) / SPOUT_FALL)
	const x = o.x + BLOWHOLE
	return {
		round,
		up,
		spout,
		/** Bubbles coming up just before it blows. */
		bubbling: blowing > -40 && blowing < 0,
		parts:
			spout > 0.15
				? [
						{
							left: x - SPOUT_REACH,
							right: x + SPOUT_REACH,
							top: line - o.height * spout,
							bottom: line,
						} satisfies Box,
					]
				: [],
	}
}

// --- Rings ---------------------------------------------------------------------

/** A Ring's size, seen almost edge on, and its middle's room to fly through. */
export const RING_WIDTH = 28
export const RING_HEIGHT = 84
export const RING_ROOM = RING_HEIGHT / 2 - 10

export function overlap(a: Box, b: Box) {
	return (
		a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom
	)
}
