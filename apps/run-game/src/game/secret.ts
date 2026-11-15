import { GRAVITY, HITBOX_HALF_WIDTH } from './constants'
import type { Body, World } from './world'

/**
 * A Secret (see `Secret`): down one of the course's Gaps, not a fall but a
 * way in, down its shaft into a cavern under the course. Whoever's in it
 * runs along its floor, as their Ground, under everything on the course
 * over it, to its far end, where someone's waiting to throw them back up
 * onto the course, high over it.
 *
 * It's under the course where it is: someone in it is as far along as
 * anyone over them, for the bus, the camera and the finish.
 */

/** How far down its Gap someone's gone, under its lip, before they're on their way down into it. */
const LIP = 40
/** How near its far end someone gets before they're thrown. */
const REACH = 14

/** Where the Secret's shaft is: its Gap, from its lip down to the cavern's roof. */
const inShaft = (world: World, x: number) => {
	const gap = world.course.secret?.gap
	return !!gap && x > gap.from && x < gap.to
}

/** The cavern's roof, over its floor. */
export const secretRoof = (world: World) => {
	const secret = world.course.secret
	return secret ? secret.floor - secret.room : 0
}

/**
 * Whether someone's down in the Secret, by where they are, not how they
 * got there: so a Remote Player's screen knows it too, without being told.
 */
export function underground(world: World, b: Pick<Body, 'x' | 'feetY'>) {
	const secret = world.course.secret
	if (!secret || b.x < secret.from || b.x > secret.to) return false
	return b.feetY > world.terrain.groundY(b.x) + LIP
}

/** Gone down the Secret's Gap past its lip, this tick: on their way in. */
export function goingIn(world: World, b: Body) {
	return (
		!b.secret &&
		!b.grounded &&
		inShaft(world, b.x) &&
		b.feetY > world.terrain.groundY(b.x) + LIP
	)
}

/**
 * Kept in the Secret: down its shaft, between its sides; once under its
 * roof, between the cavern's ends.
 */
export function keepIn(world: World, b: Body, height: number) {
	const secret = world.course.secret
	if (!secret) return
	const [left, right] =
		b.feetY - height < secretRoof(world) && inShaft(world, b.x)
			? [secret.gap.from, secret.gap.to]
			: [secret.from, secret.to]
	b.x = Math.max(
		left + HITBOX_HALF_WIDTH,
		Math.min(right - HITBOX_HALF_WIDTH, b.x),
	)
}

/** The cavern's roof over `x`, to bump a head on, jumping: none under its shaft. */
export const secretCeiling = (world: World, x: number) =>
	inShaft(world, x) ? undefined : secretRoof(world)

/** Whether someone in the Secret has got to whoever's waiting at its far end. */
export const atLaunch = (world: World, b: Body) =>
	b.secret === 'in' &&
	!!world.course.secret &&
	b.x >= world.course.secret.launch - REACH

/**
 * Thrown: straight up, far enough to clear the course over them by the
 * Secret's `peak`, and on, to come down on it about its `land` along.
 */
export function fling(world: World, b: Body) {
	const secret = world.course.secret
	if (!secret) return
	const { groundY } = world.terrain
	const top = Math.min(groundY(b.x), groundY(secret.land)) - secret.peak
	const up = Math.sqrt(2 * GRAVITY * (b.feetY - top))
	const down = Math.sqrt((2 * (groundY(secret.land) - top)) / GRAVITY)
	b.secret = 'flung'
	b.grounded = false
	b.jumping = false
	b.ducking = false
	b.on = undefined
	b.bed = undefined
	b.vy = -up
	b.vx = (secret.land - b.x) / (up / GRAVITY + down)
	b.facing = 1
}

/**
 * Flying, thrown: no getting in the way of it, through the rock and up
 * over the course, till they're over it again and on their way down onto
 * it. From there, they're falling as anyone is, to land wherever they come
 * down. Whether that's now: out of it.
 */
export function flyOut(world: World, b: Body) {
	b.x += b.vx
	b.vy += GRAVITY
	b.feetY += b.vy
	if (b.vy <= 0 || b.feetY >= world.terrain.groundY(b.x)) return false
	b.secret = undefined
	return true
}
