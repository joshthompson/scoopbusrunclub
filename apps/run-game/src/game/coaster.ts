import type { Coaster } from '../courses/types'
import { play } from '../sfx'
import type { Cart } from './carts'
import { GRAVITY, STUMBLE_TICKS } from './constants'
import type { Racer, World } from './world'

/**
 * A Secret's mine cart ride (see `Coaster`): along its track, up, down and
 * round its loop. Its carts are the world's carts too (`coaster` set on
 * them), boarded the way any mine cart is; here's how they go once someone
 * is in one. How fast is by how high it is: a kick to start it, slowing
 * as it climbs and speeding up as it drops, like a roller coaster, never
 * so slow it stops.
 *
 * A cart on it has `along`, how far along the track it is, and `spin`, the
 * way it's heading, in degrees, clockwise from going right: round the loop
 * that goes on round, -360 at the bottom again, so it's never a jump from
 * one side to the other, mixing it between frames on a Remote Player's
 * screen.
 */

/**
 * How fast it's going on the floor, kicked off; how much a pixel's climb
 * slows it; and the slowest it goes. All of it at `PACE`: the same ride,
 * up and down and round, only slower.
 */
const KICK = 14
const CLIMB = 0.3
const SLOWEST = 5
const PACE = 0.75
/** How far up off the rail whoever's in it sits: as in a mine's carts. */
const SEAT = 12
/** Out at the end: thrown up and on out of it. */
const HOP = 6
const ON = 6
/**
 * Jumped: how hard the cart hops up off its rail; the steepest the track
 * can be, either way, for it to: any steeper, up a slope or round the
 * loop, and whoever's in it is thrown out instead; and how steep it can get
 * under it, while it's up, before they are: up the hill's fine, into the
 * loop isn't.
 */
const CART_HOP = 7
const STEEPEST = 25
const STEEPEST_UP = 60
/**
 * Off the end of a leap's rail, unjumped: how far down the pit under it
 * the cart's gone before whoever's in it's out of it, falling on their
 * own; and how far down it comes to rest, out of sight.
 */
const LET_GO = 24
const PIT_BOTTOM = 400
/**
 * How far along before a leap's run-up whoever's in a cart is told to jump
 * it: at its foot, not before, on the steep down into it, where a jump's a
 * crash.
 */
const LEAP_TOLD = 10

/** A track, measured: how far along it each of its points is. */
interface Measured {
	track: [number, number][]
	along: number[]
	length: number
}

const measured = new WeakMap<Coaster, Measured>()

/** A coaster's track, measured once. */
function measure(coaster: Coaster): Measured {
	const known = measured.get(coaster)
	if (known) return known
	const { track } = coaster
	const along = [0]
	for (let i = 1; i < track.length; i++)
		along.push(
			along[i - 1] +
				Math.hypot(
					track[i][0] - track[i - 1][0],
					track[i][1] - track[i - 1][1],
				),
		)
	const out = { track, along, length: along[along.length - 1] }
	measured.set(coaster, out)
	return out
}

/** How long a coaster's track is. */
export const trackLength = (coaster: Coaster) => measure(coaster).length

/**
 * Where on a coaster's track `s` along it is, and which way it's heading
 * there, in degrees clockwise from going right (between -180 and 180).
 */
export function trackAt(coaster: Coaster, s: number) {
	const { track, along, length } = measure(coaster)
	const at = Math.max(0, Math.min(length, s))
	let lo = 0
	let hi = along.length - 1
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1
		if (along[mid] <= at) lo = mid
		else hi = mid
	}
	const [x0, y0] = track[lo]
	const [x1, y1] = track[hi]
	const t = (at - along[lo]) / Math.max(0.0001, along[hi] - along[lo])
	return {
		x: x0 + (x1 - x0) * t,
		y: y0 + (y1 - y0) * t,
		heading: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI,
	}
}

/** Whether `s` along a coaster's track is in the air: a jump, no rail under it. */
export const inAir = (coaster: Coaster, s: number) =>
	!!coaster.air?.some(([from, to]) => s > from && s < to)

/** `heading` turned to be the nearest to `was`, so it turns on round rather than back. */
const unwrap = (heading: number, was: number) =>
	heading + 360 * Math.round((was - heading) / 360)

/** Where its seat is, for a cart at `x`, `y` on the rail heading `spin`: up off the rail, square to it. */
export function seatOf(x: number, y: number, spin: number) {
	const turned = (spin * Math.PI) / 180
	return { x: x + SEAT * Math.sin(turned), y: y - SEAT * Math.cos(turned) }
}

/** A coaster's cart, along `s`: put where that is on its track, heading on round from where it was. */
export function placeCart(coaster: Coaster, cart: Cart, s: number) {
	const at = trackAt(coaster, s)
	cart.along = s
	cart.x = at.x
	cart.feetY = at.y
	cart.spin = unwrap(at.heading, cart.spin)
}

/** How fast a cart goes on a coaster at a height `y` (on the screen), the floor at `floor`. */
const speedAt = (y: number, floor: number) =>
	PACE *
	Math.max(
		SLOWEST,
		Math.sqrt(Math.max(0, KICK * KICK - 2 * CLIMB * (floor - y))),
	)

/**
 * A coaster's cart on along its track by a tick, whether anyone's in it
 * or not: whether it's got to the end.
 */
export function rollCart(world: World, cart: Cart) {
	const secret = world.course.secret
	const coaster = secret?.coaster
	if (!secret || !coaster) return true
	const floor = secret.floor
	// By the track's height, not the cart's: it might be hopping.
	const here = trackAt(coaster, cart.along ?? 0).y
	const s = (cart.along ?? 0) + speedAt(here, floor)
	placeCart(coaster, cart, s)
	cart.vx = speedAt(cart.feetY, floor)
	return s >= trackLength(coaster)
}

/** Whether a coaster's track is no steeper than `most` degrees at `s` along it, either way. */
const levelAt = (coaster: Coaster, s: number, most = STEEPEST) => {
	const { heading } = trackAt(coaster, s)
	return Math.min(Math.abs(heading), 180 - Math.abs(heading)) <= most
}

/**
 * Thrown out of a coaster's cart, jumping in it where it's too steep to:
 * flying off the way it was going, and down, a crash; the cart on along
 * the track without them.
 */
function crash(world: World, racer: Racer, cart: Cart) {
	const b = racer.body
	const turned = (cart.spin * Math.PI) / 180
	cart.rider = undefined
	cart.air = false
	cart.lift = 0
	b.cart = undefined
	b.ducking = false
	b.grounded = false
	b.jumping = false
	b.on = undefined
	b.vx = cart.vx * Math.cos(turned)
	b.vy = cart.vx * Math.sin(turned) - 3
	b.stumble = STUMBLE_TICKS
	play('stumble')
	world.popup('Crash!', b.x, b.feetY - 80)
}

/**
 * A coaster's cart on by a tick, whether anyone's in it or not: along its
 * track; and coming to its leap's gap, across it, if it was jumped (or is
 * hopping as it gets there), or off the end of the rail if it wasn't, and
 * falling, down the pit. Whether it's at the end of the track.
 */
export function moveCoasterCart(world: World, cart: Cart) {
	const coaster = world.course.secret?.coaster
	if (!coaster) return true
	if (cart.off) {
		fallOff(world, cart)
		return false
	}
	const gap = coaster.leap && coaster.air?.[0]?.[0]
	const was = cart.along ?? 0
	const done = rollCart(world, cart)
	if (gap !== undefined && was < gap && (cart.along ?? 0) >= gap) {
		if (cart.air) {
			cart.launched = true
			cart.air = false
			cart.lift = 0
		}
		if (!cart.launched) goOff(coaster, cart, gap)
	}
	// Across, and down on the far side: that leap's done with.
	const landed = coaster.air?.[0]?.[1]
	if (landed !== undefined && was < landed && (cart.along ?? 0) >= landed)
		cart.launched = false
	return done
}

/** Off the end of the rail at `gap` along, going the way it was, as fast. */
function goOff(coaster: Coaster, cart: Cart, gap: number) {
	placeCart(coaster, cart, gap)
	const turned = (cart.spin * Math.PI) / 180
	const speed = cart.vx
	cart.off = true
	cart.vx = speed * Math.cos(turned)
	cart.vy = speed * Math.sin(turned)
	play('whoosh')
}

/** Off the rail, falling: on, and down, nose first, to the bottom of the pit. */
function fallOff(world: World, cart: Cart) {
	const floor = world.course.secret?.floor ?? cart.feetY
	if (cart.feetY > floor + PIT_BOTTOM) {
		cart.state = 'parked'
		cart.vx = 0
		cart.vy = 0
		return
	}
	cart.x += cart.vx
	cart.vy += GRAVITY
	cart.feetY += cart.vy
	cart.spin = Math.min(
		80,
		(Math.atan2(cart.vy, Math.max(1, cart.vx)) * 180) / Math.PI,
	)
}

/**
 * In a coaster's cart: along the track, sat in it, turned with it. Jump
 * on the level and it hops, up off the rail and back down onto it; jump
 * anywhere steeper, or still up in the air as it gets steep under you, and
 * you're thrown out: a crash. At its end, thrown out of it, on their way.
 */
export function rideCoaster(
	world: World,
	racer: Racer,
	cart: Cart,
	jump: boolean,
) {
	const b = racer.body
	const coaster = world.course.secret?.coaster
	if (!coaster) return
	const along = cart.along ?? 0
	// Off the end of the rail, unjumped, down the pit: in it, till it's
	// too far down for them to hold on, and then falling on their own.
	if (cart.off) {
		moveCoasterCart(world, cart)
		const seat = seatOf(cart.x, cart.feetY, cart.spin)
		b.x = seat.x
		b.feetY = seat.y
		b.vx = cart.vx
		b.vy = cart.vy
		b.grounded = false
		b.on = undefined
		b.facing = 1
		const floor = world.course.secret?.floor ?? cart.feetY
		if (cart.feetY < floor + LET_GO) return
		cart.rider = undefined
		b.cart = undefined
		b.ducking = false
		world.popup('Aaargh!', b.x, floor - 60)
		return
	}
	const leap = coaster.leap
	const gap = coaster.air?.[0]?.[0]
	// Coming up to the leap: told to jump it.
	if (leap && !cart.told && along > leap.runUp - LEAP_TOLD) {
		cart.told = true
		world.popup('Jump the gap!', cart.x, cart.feetY - 100)
	}
	// On its run-up: jumped, across it.
	const runningUp =
		!!leap && gap !== undefined && along >= leap.runUp && along < gap
	if (jump && runningUp && !cart.launched) {
		cart.launched = true
		play('jump')
	} else if (jump && !cart.air && !cart.launched) {
		if (!levelAt(coaster, along) || inAir(coaster, along))
			return crash(world, racer, cart)
		cart.air = true
		cart.vy = -CART_HOP
		cart.lift = 0
		play('jump')
	}
	if (cart.air && !levelAt(coaster, along, STEEPEST_UP))
		return crash(world, racer, cart)
	const wasAir = inAir(coaster, along)
	const done = moveCoasterCart(world, cart)
	if (cart.off) return
	// Hopping: up off the rail, and back down onto it.
	if (cart.air) {
		cart.lift = (cart.lift ?? 0) - (cart.vy ?? 0)
		cart.vy += GRAVITY
		if (cart.lift <= 0) {
			cart.lift = 0
			cart.air = false
			play('stomp')
		}
		cart.feetY -= cart.lift
	}
	// Off the end of a rail into the air, and down onto the next: a clatter.
	if (wasAir !== inAir(coaster, cart.along ?? 0) && !done)
		play(wasAir ? 'stomp' : 'jump')
	const seat = seatOf(cart.x, cart.feetY, cart.spin)
	const turned = (cart.spin * Math.PI) / 180
	b.x = seat.x
	b.feetY = seat.y
	b.vx = cart.vx * Math.cos(turned)
	b.vy = 0
	b.grounded = true
	b.jumping = false
	b.on = undefined
	b.ducking = true
	b.facing = 1
	b.floor = b.feetY
	if (!done) return
	// The end: the cart stops dead, and out they're thrown, on their way.
	cart.state = 'parked'
	cart.rider = undefined
	cart.vx = 0
	b.cart = undefined
	b.ducking = false
	b.grounded = false
	b.vy = -HOP
	b.vx = ON
	play('jump')
}
