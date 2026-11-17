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

/**
 * How far under a bridged Gap's deck someone has to be to be on their way
 * in: through it at all, or they'd be across it, going fast, before
 * they'd fallen as far as its lip.
 */
const UNDER_BRIDGE = 4

/** Gone down the Secret's Gap past its lip, this tick: on their way in. */
export function goingIn(world: World, b: Body) {
	const lip = world.course.secret?.bridged ? UNDER_BRIDGE : LIP
	return (
		!b.secret &&
		!b.grounded &&
		inShaft(world, b.x) &&
		b.feetY > world.terrain.groundY(b.x) + lip
	)
}

/**
 * Kept in the Secret: down its shaft, between its sides, for as long as
 * any of them's up over its roof, however fast they were going in (they
 * were in it to go in, so they're kept in it); once under its roof,
 * between the cavern's ends.
 */
export function keepIn(world: World, b: Body, height: number) {
	const secret = world.course.secret
	if (!secret) return
	const [left, right] =
		b.feetY - height < secretRoof(world)
			? [secret.gap.from, secret.gap.to]
			: [secret.from, secret.to]
	// Down a pit in its floor: between its walls.
	const pit = secret.coaster?.leap?.pit
	const [from, to] =
		pit && b.feetY > secret.floor + 2 && b.x > pit[0] - 20 && b.x < pit[1] + 20
			? [pit[0] + HITBOX_HALF_WIDTH, pit[1] - HITBOX_HALF_WIDTH]
			: [left + HITBOX_HALF_WIDTH, right - HITBOX_HALF_WIDTH]
	const kept = Math.max(from, Math.min(to, b.x))
	// Into a wall: stopped by it, not still going, to fly on along under
	// the roof the moment they're down past it.
	if (kept !== b.x) b.vx = 0
	b.x = kept
}

/** How far inside a manhole's rim someone's middle has to be to go down it. */
const RIM = 6
/**
 * How slow someone has to be going to go down a manhole: about half
 * running speed. Any faster and they're over it before they can fall in,
 * so it takes letting go and slowing down for it, with the bus coming.
 */
const MANHOLE_SLOW = 3.5

/**
 * Run onto a Secret's open manhole this tick (see `Secret['manhole']`), on
 * the street, not jumping over it, and slowly: on their way down it. Not
 * on a Ride, nor carried, nor in a cart: they'd only ride on over it.
 */
export function dropsIn(world: World, b: Body) {
	const secret = world.course.secret
	if (!secret?.manhole || b.secret) return false
	if (b.mount > 0 || b.carried > 0 || b.cart !== undefined) return false
	if (b.on !== undefined || b.bed) return false
	if (Math.abs(b.vx) > MANHOLE_SLOW) return false
	const { gap } = secret
	return (
		b.x > gap.from + RIM &&
		b.x < gap.to - RIM &&
		b.feetY >= world.terrain.groundY(b.x) - 2
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
 * Whether someone's down in the Secret, coming up to whoever's at its far
 * end, near enough for them to call out (see `Secret['greets']`): by where
 * they are, so a Remote Player's screen knows it too.
 */
export function comingAtLaunch(world: World, b: Pick<Body, 'x' | 'feetY'>) {
	const secret = world.course.secret
	if (!secret?.greets || !underground(world, b)) return false
	return b.x >= secret.launch - secret.greets.near && b.x < secret.launch
}

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
	// Up a duct, up the middle of it.
	if (secret.duct) b.x = secret.launch
	b.vx = secret.duct ? 0 : (secret.land - b.x) / (up / GRAVITY + down)
	b.facing = 1
}

/**
 * Flying, thrown: no getting in the way of it, through the rock and up
 * over the course, till they're over it again and on their way down onto
 * it. From there, they're falling as anyone is, to land wherever they come
 * down. Whether that's now: out of it.
 */
export function flyOut(world: World, b: Body) {
	const secret = world.course.secret
	// Blown up a duct: straight up it, till they're out of the grate at its
	// top; then on, over to where they're to come down.
	if (secret?.duct) {
		const { groundY } = world.terrain
		const out = b.feetY < groundY(b.x)
		const drop = groundY(secret.land) - b.feetY
		const time = (-b.vy + Math.sqrt(b.vy * b.vy + 2 * GRAVITY * drop)) / GRAVITY
		b.vx = out ? (secret.land - b.x) / Math.max(1, time) : 0
	}
	b.x += b.vx
	b.vy += GRAVITY
	b.feetY += b.vy
	if (b.vy <= 0 || b.feetY >= world.terrain.groundY(b.x)) return false
	b.secret = undefined
	return true
}

/**
 * Whether `x` is over a pit in the Secret's floor, its coaster's (see
 * `Coaster['leap']`): no floor under it, a Gap, down there.
 */
export function inPit(world: World, x: number) {
	const pit = world.course.secret?.coaster?.leap?.pit
	return !!pit && x > pit[0] && x < pit[1]
}
