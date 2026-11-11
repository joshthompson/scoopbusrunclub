import { STAND_HEIGHT } from './constants'
import { platformAt } from './platforms'
import type { World } from './world'

/**
 * A Cave's Ceiling, and the solid Platforms' undersides: what's over
 * whoever's in a Cave, to hit their head on, and too low, to duck under.
 */

type Overhead = Pick<World, 'course' | 'terrain' | 'platforms' | 'ticks'>

/**
 * The Ceiling at `x`, if it's over `y`: not if they're up over it, on a
 * Route along the top of the rock (a ferry's roof), where it's under them.
 */
function overhead(world: Overhead, x: number, y: number) {
	const ceiling = world.course.cave?.ceiling(x)
	return ceiling !== undefined && ceiling <= y + 1 ? ceiling : undefined
}

/**
 * The lowest thing over `head` at `x`: the Ceiling, or the underside of a
 * solid Platform, if one's over them. Not one they're already above: that
 * one's under them.
 */
export function ceilingAt(world: Overhead, x: number, head: number) {
	let ceiling = overhead(world, x, head)
	const ticks = world.ticks()
	for (const platform of world.platforms) {
		if (!platform.solid) continue
		const at = platformAt(world.terrain, platform, ticks)
		if (x < at.left || x > at.right) continue
		const under = at.top + platform.solid
		if (under > head + 1) continue
		if (ceiling === undefined || under > ceiling) ceiling = under
	}
	return ceiling
}

/**
 * The lowest rock over anyone stood at `feetY` at `x`: the Ceiling, or the
 * underside of a solid Platform whose top's over them, however low that
 * comes. Lower than their head, they can't stand there: run into it
 * standing, and it's a wall.
 */
export function rockOver(world: Overhead, x: number, feetY: number) {
	let ceiling = overhead(world, x, feetY - 1)
	const ticks = world.ticks()
	for (const platform of world.platforms) {
		if (!platform.solid) continue
		const at = platformAt(world.terrain, platform, ticks)
		if (x < at.left || x > at.right || at.top >= feetY - 1) continue
		const under = at.top + platform.solid
		if (ceiling === undefined || under > ceiling) ceiling = under
	}
	return ceiling
}

/** Whether, stood at `feetY` at `x`, the rock's too low to stand up: in a Tunnel. */
export function inTunnel(world: Overhead, x: number, feetY: number) {
	const rock = rockOver(world, x, feetY)
	return rock !== undefined && rock > feetY - STAND_HEIGHT
}
