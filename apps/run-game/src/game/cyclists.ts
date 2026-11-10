import type { Obstacle } from '../courses/types'
import { START_X } from './constants'
import type { ObstacleState, World } from './world'

type Cyclist = Extract<Obstacle, { kind: 'cyclist' }>

/** How fast a cyclist rides, towards the start, in pixels a tick. */
export const CYCLIST_SPEED = 3.6

/**
 * Without a loop, a cyclist sets off as someone running this fast, in pixels
 * a tick, from "Go!" would get this far off it: the same on every screen,
 * as a Zombie.
 */
const SET_OFF_PACE = 5
const SET_OFF_AHEAD = 1400

/**
 * Where a cyclist is: riding towards the start, the same on every screen
 * for the same tick. Round its loop, from its far end to its near one and
 * back to the far end again, `lap` times round; or from its `x`, once it's
 * set off. Or where the bus scooped it.
 */
export function cyclistAt(
	world: Pick<World, 'raceTicks'>,
	state: Pick<ObstacleState, 'scooped'> & { obstacle: Cyclist },
) {
	const { obstacle } = state
	if (state.scooped?.x !== undefined)
		return { x: state.scooped.x, riding: false, lap: 0 }
	const ticks = Math.max(0, world.raceTicks())
	if (obstacle.loop) {
		const [from, to] = obstacle.loop
		const span = to - from
		const ridden = CYCLIST_SPEED * ticks + (to - obstacle.x)
		return {
			x: to - (ridden % span),
			riding: true,
			lap: Math.floor(ridden / span),
		}
	}
	const setsOff =
		Math.max(0, obstacle.x - START_X - SET_OFF_AHEAD) / SET_OFF_PACE
	const ridden = CYCLIST_SPEED * Math.max(0, ticks - setsOff)
	return { x: obstacle.x - ridden, riding: ridden > 0, lap: 0 }
}
