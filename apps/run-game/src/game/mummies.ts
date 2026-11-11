import type { Obstacle } from '../courses/types'
import type { ObstacleState, World } from './world'

type Mummy = Extract<Obstacle, { kind: 'mummy' }>

/** How many ticks a Mummy takes to shuffle there and back again. */
const MUMMY_ROUND = 420

/**
 * Where a Mummy is: shuffling to and fro either side of its `x`, the same
 * on every screen for the same tick, each on its own beat; facing the way
 * it's going. Where the bus scooped it, if it did.
 */
export function mummyAt(
	world: Pick<World, 'ticks'>,
	state: Pick<ObstacleState, 'scooped'> & { obstacle: Mummy },
) {
	const { obstacle: o } = state
	if (state.scooped?.x !== undefined)
		return { x: state.scooped.x, facing: -1 as const }
	const phase = (world.ticks() / MUMMY_ROUND + o.x / 997) * Math.PI * 2
	return {
		x: o.x + Math.sin(phase) * o.pace,
		// Its way, by which way the swing's going.
		facing: Math.cos(phase) >= 0 ? (1 as const) : (-1 as const),
	}
}
