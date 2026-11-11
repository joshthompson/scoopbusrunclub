import { COUNTDOWN_STEP_TICKS, START_X } from '../../game/constants'
import type { PlatformDefinition } from '../types'

/** How far along a runner's likely got, a tick, from "Go!", and when "Go!" is. */
const LIKELY_PACE = 5.5
const GO_TICKS = COUNTDOWN_STEP_TICKS * 3

/**
 * A Moving Platform's swing, timed to be back at its start, ready, as
 * someone running about as fast as most do gets to `x`: so it's there for
 * them, and missing it means a shorter wait the quicker it swings.
 */
export function swing(
	x: number,
	by: { x?: number; y?: number },
	ticks: number,
): NonNullable<PlatformDefinition['move']> {
	const arrives = GO_TICKS + (x - START_X) / LIKELY_PACE
	return { ...by, ticks, phase: 1 - ((arrives / ticks) % 1) }
}
