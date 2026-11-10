import type { Obstacle } from '../courses/types'
import { START_X, ZOMBIE_SPEED } from './constants'
import type { ObstacleState, World } from './world'

type Zombie = Extract<Obstacle, { kind: 'zombie' }>

/**
 * A Zombie wakes, and starts walking, as someone running this fast, in
 * pixels a tick, from "Go!" would get this far off it: the same on every
 * screen, and well ahead of anyone running at all well.
 */
const WAKE_PACE = 5
const WAKE_AHEAD = 1100

/** How far into an open grave a Zombie walks before it drops. */
const INTO_GRAVE = 14
/** How fast it sinks, once it does, and how far before it's gone. */
const SINK_SPEED = 3
const SINK_GONE = 70

/**
 * Where a Zombie is: walking towards the start from its `x`, once it's
 * woken, the same on every screen for the same tick. Where the bus scooped
 * it, if it did. Walked into an open grave, it sinks out of sight: `sunk`
 * how far.
 */
export function zombieAt(
	world: Pick<World, 'terrain' | 'raceTicks'>,
	state: Pick<ObstacleState, 'scooped'> & { obstacle: Zombie },
) {
	const { obstacle } = state
	if (state.scooped?.x !== undefined)
		return { x: state.scooped.x, sunk: 0, walking: false }
	const wakes = Math.max(0, obstacle.x - START_X - WAKE_AHEAD) / WAKE_PACE
	const walked =
		obstacle.x - ZOMBIE_SPEED * Math.max(0, world.raceTicks() - wakes)
	// The first open grave on its way.
	const grave = [...world.terrain.gaps]
		.reverse()
		.find((gap) => gap.to <= obstacle.x)
	const edge = grave ? grave.to - INTO_GRAVE : Number.NEGATIVE_INFINITY
	const walking = walked < obstacle.x
	if (walked >= edge) return { x: walked, sunk: 0, walking }
	return {
		x: edge,
		sunk: ((edge - walked) / ZOMBIE_SPEED) * SINK_SPEED,
		walking,
	}
}

export { SINK_GONE as ZOMBIE_SINK_GONE }
