import { STAND_HEIGHT } from './constants'
import { platformAt } from './platforms'
import { sagOf } from './ropeBridge'
import type { World } from './world'

/**
 * A Cave's Ceiling, and the solid Platforms' undersides: what's over
 * whoever's in a Cave, to hit their head on, and too low, to duck under.
 */

type Overhead = Pick<
	World,
	'course' | 'terrain' | 'platforms' | 'ropeBridges' | 'ticks'
>

/**
 * Where solid Platform `index` is at `x`: its ends, and its top and its
 * underside, down as far as it's sagged there if it's a rope bridge, with
 * whoever's on it. Stood on one, sagging under them, it's under them.
 */
function shelfAt(world: Overhead, index: number, x: number) {
	const platform = world.platforms[index]
	const at = platformAt(world.terrain, platform, world.ticks())
	const top = at.top + sagOf(world.ropeBridges, index, x)
	return { ...at, top, under: top + (platform.solid ?? 0) }
}

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
	for (const [index, platform] of world.platforms.entries()) {
		if (!platform.solid || platform.broken) continue
		const { left, right, under } = shelfAt(world, index, x)
		if (x < left || x > right) continue
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
	for (const [index, platform] of world.platforms.entries()) {
		if (!platform.solid || platform.broken) continue
		const { left, right, top, under } = shelfAt(world, index, x)
		if (x < left || x > right || top >= feetY - 1) continue
		if (ceiling === undefined || under > ceiling) ceiling = under
	}
	return ceiling
}

/** Whether, stood at `feetY` at `x`, the rock's too low to stand up: in a Tunnel. */
export function inTunnel(world: Overhead, x: number, feetY: number) {
	const rock = rockOver(world, x, feetY)
	return rock !== undefined && rock > feetY - STAND_HEIGHT
}
