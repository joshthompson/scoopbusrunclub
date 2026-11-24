import { GROUND_Y, START_X, VIEW_WIDTH } from '../game/constants'

/**
 * Skate Jam's mini ramp, side on, filling the screen: a quarter pipe at
 * either end, curving up from the flat bottom to most of the way upright,
 * a steel coping at its lip, and a deck behind it; and a grind rail along
 * the flat. What the skaters ride (`skateJam`), and what's drawn
 * (`courses/kit/skateJamScenery`), on its own so both can have it.
 */

/** The flat bottom's height on the screen, and the middle of the ramp. */
export const FLOOR = GROUND_Y
export const MIDDLE = START_X
/** The screen's left edge, the ramp filling it. */
export const RAMP_LEFT = MIDDLE - VIEW_WIDTH / 2
/** How wide each deck is, at the top, behind the coping. */
export const DECK = 56
/** A quarter pipe's radius, and how far along it the curve goes before the coping: most of the way to upright. */
const RADIUS = 260
const REACH = 244
/** How high the coping is over the flat bottom. */
export const RAMP_HIGH = Math.round(
	RADIUS - Math.sqrt(RADIUS ** 2 - REACH ** 2),
)
/** Where each coping is, along, and where each curve starts, out of the flat. */
export const LIP_LEFT = RAMP_LEFT + DECK
export const LIP_RIGHT = RAMP_LEFT + VIEW_WIDTH - DECK
export const FLAT_LEFT = LIP_LEFT + REACH
export const FLAT_RIGHT = LIP_RIGHT - REACH
/** The coping's height on the screen: the deck's top. */
export const LIP_Y = FLOOR - RAMP_HIGH

/** How far up the curve `d` along it from the flat goes. */
const rise = (d: number) =>
	d <= 0 ? 0 : d >= REACH ? RAMP_HIGH : RADIUS - Math.sqrt(RADIUS ** 2 - d ** 2)
/** How steep it is `d` along it from the flat: up for every px along. */
const steep = (d: number) =>
	d <= 0 || d >= REACH ? 0 : d / Math.sqrt(RADIUS ** 2 - d ** 2)

/** The ramp's surface at `x`, as a y on the screen: the decks' tops past the copings. */
export function rampY(x: number) {
	if (x < FLAT_LEFT) return FLOOR - rise(FLAT_LEFT - x)
	if (x > FLAT_RIGHT) return FLOOR - rise(x - FLAT_RIGHT)
	return FLOOR
}

/** Its slope at `x`: how far down it goes for every px along, so the left quarter pipe's is positive. */
export function rampSlope(x: number) {
	if (x < FLAT_LEFT) return steep(FLAT_LEFT - x)
	if (x > FLAT_RIGHT) return -steep(x - FLAT_RIGHT)
	return 0
}

/** The grind rail along the flat: from, to, and its top. */
export const RAIL_FROM = MIDDLE - 70
export const RAIL_TO = MIDDLE + 70
export const RAIL_Y = FLOOR - 30
