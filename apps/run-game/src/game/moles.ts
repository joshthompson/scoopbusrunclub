import { rideLook } from '../draw/rideLook'
import { STAND_HEIGHT } from './constants'
import { platformAt } from './platforms'
import type { Body, World } from './world'

/**
 * The Caves' moles: a Ride, sat on the path waiting like any other (see
 * `corgis`), but once you're on, it hops, over and over, by itself, and
 * where there's rock in the way, it digs on through it, along the very
 * line it was hopping, rather than stopping: up into the roof and back
 * down, through a shelf of rock, along a Tunnel too low to stand in. Its
 * way through is left behind it in the rock (see `createMoleTrails`). It
 * keeps going till it's out of the rock, however long that is.
 */

/** How hard a mole hops: a jump's worth, each time it's down. */
export const MOLE_HOP = 9.5

/** Whether `b` is on a mole, digging along. */
export const onMole = (world: Pick<World, 'course'>, b: Body) =>
	world.course.ride === 'mole' && b.mount > 0

/**
 * How much of a mole and its rider is in the rock at `x`, their feet at
 * `feetY`: whether any of them is, from the mole's feet to the top of
 * whoever's on it. Up into the Cave's roof, or a solid shelf of rock.
 */
export function inRock(
	world: Pick<World, 'course' | 'terrain' | 'platforms' | 'ticks'>,
	x: number,
	feetY: number,
) {
	const top = feetY - rideLook(world.course).saddle - STAND_HEIGHT
	const ceiling = world.course.cave?.ceiling(x)
	if (ceiling !== undefined && top < ceiling) return true
	const ticks = world.ticks()
	return world.platforms.some((platform) => {
		if (!platform.solid) return false
		const at = platformAt(world.terrain, platform, ticks)
		return (
			x >= at.left &&
			x <= at.right &&
			top < at.top + platform.solid &&
			feetY > at.top
		)
	})
}

/** On a mole, and in the rock: it won't stop now, nor can they get off. */
export const burrowing = (world: World, b: Body) =>
	onMole(world, b) && inRock(world, b.x, b.feetY)
