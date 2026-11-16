import { play } from '../sfx'
import type { Body, Racer, World } from './world'

/**
 * A haunted house (see `HauntedHouse`): bats bursting out of its door as
 * someone gets near, and its window smashing as they jump out of it. And up
 * in its attic, a monster: anyone who gets up there is caught, held in its
 * clutches a moment, and killed; and then they come back up out of a grave
 * past the house, a ghost, and on they run, a ghost to the end.
 *
 * What's drawn of it all goes by where everyone is, not by this, so a
 * Remote Player's screen draws the same without being told: only who's a
 * ghost goes in the frame.
 */

/** How long the monster holds someone before they're dead, and gone. */
export const CAUGHT_TICKS = 80
/** How long they take to come up out of the grave, and how far down it they start. */
export const RISE_TICKS = 70
export const RISE_DEPTH = 56
/** How fast they're off, up out of it. */
const OUT_SPEED = 3

/** Whether someone's up in the attic, in reach of the monster: caught, if they're not dead already. */
export function inClutches(world: Pick<World, 'course'>, b: Body) {
	const house = world.course.haunted
	if (!house || b.ghost) return false
	const { monster, window } = house
	return (
		b.x >= monster.x - monster.reach &&
		b.x < window.x &&
		b.feetY <= monster.floor + 4
	)
}

/**
 * How far up out of the grave a ghost is, 0 to 1, while they're coming up
 * out of it: by where they are, so a Remote Player's screen knows too.
 * Undefined, if they're not.
 */
export function risingFromGrave(
	world: Pick<World, 'course' | 'terrain'>,
	b: Pick<Body, 'x' | 'feetY' | 'ghost'>,
) {
	const house = world.course.haunted
	if (!house || !b.ghost || Math.abs(b.x - house.grave) > 2) return
	const sunk = b.feetY - world.terrain.groundY(house.grave)
	if (sunk <= 0.5) return
	return Math.max(0, 1 - sunk / RISE_DEPTH)
}

/**
 * The monster's got them, or they're on their way back up out of the
 * grave: nothing they press does anything. Whether it has: caught this
 * tick, or already.
 */
export function stepHaunt(world: World, racer: Racer) {
	const b = racer.body
	const house = world.course.haunted
	if (!house) return false
	const now = world.ticks()
	if (!b.haunt) {
		if (!inClutches(world, b)) return false
		b.haunt = { stage: 'caught', at: now }
		b.ducking = false
		b.mount = 0
		play('roar')
		world.popup('ROAR!', house.monster.x, house.monster.floor - 130)
	}
	b.vx = 0
	b.vy = 0
	b.jumping = false
	if (b.haunt.stage === 'caught') {
		// Held fast, kicking, till it's done with them.
		if (now - b.haunt.at < CAUGHT_TICKS) return true
		// Dead: and down in a grave past the house, on their way back up.
		const ground = world.terrain.groundY(house.grave)
		b.haunt = { stage: 'rising', at: now }
		b.ghost = true
		b.x = house.grave
		b.feetY = ground + RISE_DEPTH
		b.on = undefined
		b.bed = undefined
		b.grounded = false
		b.facing = 1
		b.hat = undefined
		play('groan')
		return true
	}
	const ground = world.terrain.groundY(house.grave)
	const t = Math.min(1, (now - b.haunt.at) / RISE_TICKS)
	b.feetY = ground + RISE_DEPTH * (1 - t)
	if (t < 1) return true
	// Up, and off: a ghost.
	b.haunt = undefined
	b.feetY = ground
	b.floor = ground
	b.grounded = true
	b.vx = OUT_SPEED
	world.popup(`${racer.runner.name} is a ghost!`, b.x, ground - 90)
	return true
}

/** How far under the window's floor someone can be, going past it, and still have gone through it. */
const SMASH_UNDER = 20

/**
 * The house's sounds, by where someone's got to this tick, from `wasX`:
 * the bats, the first time anyone's near its door, and the glass, the
 * first time anyone's through its window.
 */
export function hearHouse(world: World, racer: Racer, wasX: number) {
	const house = world.course.haunted
	if (!house || racer.out) return
	const b = racer.body
	if (world.house.batsAt === undefined && b.x >= house.door - house.bats) {
		world.house.batsAt = world.ticks()
		play('bats')
		world.popup('Bats!', b.x, b.feetY - 80)
	}
	const { window } = house
	if (
		world.house.smashedAt === undefined &&
		wasX < window.x &&
		b.x >= window.x &&
		b.feetY < window.floor + SMASH_UNDER
	) {
		world.house.smashedAt = world.ticks()
		play('smash')
		world.popup('Smash!', window.x, window.floor - 70)
	}
}
