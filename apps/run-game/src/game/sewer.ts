/**
 * What grabs you and holds you still: the Sewers' Swamp Men rising out of
 * their sludge, and Halloween Town's Hands under its graveyard. And the
 * Sewers' Sewage Drains, pouring out what's washed down off the street, in
 * waves. All go by the tick, so they're the same on every screen.
 */

/** How long a Swamp Man's round takes: under the sludge, rising, up, and sinking. */
const SWAMP_UNDER = 120
const SWAMP_RISE = 18
const SWAMP_UP = 100
const SWAMP_SINK = 18
const SWAMP_ROUND = SWAMP_UNDER + SWAMP_RISE + SWAMP_UP + SWAMP_SINK

/** How tall a Swamp Man stands, all the way up, and how far either side of him he reaches. */
export const SWAMP_HEIGHT = 54
export const SWAMP_REACH = 18
/** How far out of his sludge he has to be to grab anyone. */
const SWAMP_GRABS = 0.6
/** How long he holds someone still, at most: he lets go as he sinks. */
const SWAMP_HOLD = 45
/** How long he holds on, at least, grabbing them just as he's going under. */
const SWAMP_HOLD_LEAST = 20

/** Each on his own beat. */
const swampTick = (x: number, ticks: number) =>
	(((ticks + Math.round(x * 0.37)) % SWAMP_ROUND) + SWAMP_ROUND) % SWAMP_ROUND

/**
 * A Swamp Man at `x`, `ticks` into the race: how far out of his sludge he
 * is, out of 1; which round it is, to grab anyone once a round; and, up,
 * how long he'd hold someone grabbed now, till he sinks.
 */
export function swampManAt(x: number, ticks: number) {
	const t = swampTick(x, ticks)
	const round = Math.floor((ticks + Math.round(x * 0.37)) / SWAMP_ROUND)
	const up = SWAMP_UNDER + SWAMP_RISE
	const rise =
		t < SWAMP_UNDER
			? 0
			: t < up
				? (t - SWAMP_UNDER) / SWAMP_RISE
				: t < up + SWAMP_UP
					? 1
					: 1 - (t - up - SWAMP_UP) / SWAMP_SINK
	return {
		rise,
		round,
		grabs: rise >= SWAMP_GRABS,
		hold: Math.min(
			SWAMP_HOLD,
			Math.max(SWAMP_HOLD_LEAST, up + SWAMP_UP + SWAMP_SINK / 2 - t),
		),
	}
}

/** How long Hands under a graveyard hold someone by the ankles, and how far either side of them they reach. */
export const HANDS_HOLD = 45
export const HANDS_REACH = 14

/**
 * A Sewage Drain's round: quiet, then dripping, a warning, then pouring.
 * Long enough quiet to get through it at a run, if it's timed right.
 */
const SEWAGE_QUIET = 110
const SEWAGE_DRIP = 45
export const SEWAGE_POUR = 75
const SEWAGE_ROUND = SEWAGE_QUIET + SEWAGE_DRIP + SEWAGE_POUR

/** How far either side of a drain what it pours out lands. */
export const SEWAGE_REACH = 22
/** How fast what it pours out falls, from its grate, in pixels a tick. */
export const SEWAGE_FALL = 20

/**
 * A Sewage Drain at `x`, `ticks` into the race: dripping, a wave on its
 * way, or pouring, and how far into that it is; and which wave it is, to
 * splatter anyone once a wave.
 */
export function sewageAt(x: number, ticks: number) {
	const shifted = ticks + Math.round(x * 0.61)
	const t = ((shifted % SEWAGE_ROUND) + SEWAGE_ROUND) % SEWAGE_ROUND
	const pourFrom = SEWAGE_QUIET + SEWAGE_DRIP
	return {
		dripping: t >= SEWAGE_QUIET && t < pourFrom,
		pouring: t >= pourFrom,
		/** Ticks into its pour, while it's pouring. */
		poured: t - pourFrom,
		wave: Math.floor(shifted / SEWAGE_ROUND),
	}
}
