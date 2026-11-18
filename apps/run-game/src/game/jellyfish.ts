import type { Obstacle } from '../courses/types'

/**
 * The sea's jellyfish (see `Obstacle`'s `jellyfish`): drifting slowly up
 * and down, each in its own time, by the race's clock, so the same on every
 * screen.
 */

type Jellyfish = Extract<Obstacle, { kind: 'jellyfish' }>

/** How long a drift up and back takes, in ticks. */
const DRIFT = 300

/** How far over the seabed its bell's bottom is, `ticks` in. */
export function jellyfishHeight(o: Jellyfish, ticks: number) {
	const t = ticks / DRIFT + o.x / 311
	return o.low + (o.high - o.low) * (0.5 - 0.5 * Math.cos(t * Math.PI * 2))
}

/** How far either side of its middle its bell stings, and its tentacles, and how far down they hang. */
export const JELLYFISH_REACH = 13
export const TENTACLE_REACH = 8
export const TENTACLE_DOWN = 26
/** How far up from its bell's bottom its bell goes. */
export const BELL_UP = 16
