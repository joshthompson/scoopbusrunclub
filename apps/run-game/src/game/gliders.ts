import { rideLook } from '../draw/rideLook'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { PICKUP_WORD } from './collectables'
import {
	CORGI_POINTS,
	GLIDER_BOOST_GRIP,
	GLIDER_BRAKE,
	GLIDER_CLEARANCE,
	GLIDER_CLIMB,
	GLIDER_CLIMB_DRAG,
	GLIDER_DIVE,
	GLIDER_GRIP,
	GLIDER_PUSH,
	GLIDER_SINK,
	GLIDER_SPEED,
	GLIDER_STEER,
	HITBOX_HALF_WIDTH,
	PACER_FASTEST,
	PACER_SLOWEST,
	STAND_HEIGHT,
	topSpeed,
} from './constants'
import { scored } from './step'
import type { Pacer, Racer, World } from './world'

/**
 * The Cliff's gliders: parked along the top of the cliff, one for everyone
 * and more. Run into one and you're off on it, out over the sea, steering
 * it up and down, for good: it only comes down once it's over the island,
 * and they're off it, landing.
 */

/** Whether `x` is out over the sea. */
export function atSea(world: Pick<World, 'course'>, x: number) {
	const { sea } = world.course
	return !!sea && x >= sea.from && x < sea.to
}

/** The wind out at sea: a breeze behind you just over the waves, and how high that is, its feet over the sea... */
export const TAILWIND = 0.8
const TAILWIND_BELOW = 120
/** ...and a headwind against you up high, and how high it's at its strongest. */
export const HEADWIND = 2.4
const HEADWIND_ABOVE = 480

/**
 * How much faster, or slower, the wind out at sea makes a glider at
 * `feetY`, over `x`: a sea breeze behind it down low, a headwind against it
 * up high. Up there's no shortcut: it's the slow way.
 */
export function windAt(world: Pick<World, 'course'>, x: number, feetY: number) {
	const { sea } = world.course
	if (!sea || !atSea(world, x)) return 0
	const height = sea.level - feetY
	const t = Math.max(
		0,
		Math.min(1, (height - TAILWIND_BELOW) / (HEADWIND_ABOVE - TAILWIND_BELOW)),
	)
	return TAILWIND - (TAILWIND + HEADWIND) * t
}

/** How far ahead a glider sees what's under it coming, to be up over it in time. */
const FLOOR_AHEAD = 220
/** How fast it's lifted up over what's under it, at most. */
const LIFT_MAX = 5

/**
 * The lowest a glider's rider's feet can be at `x`: over the Ground, or
 * anything higher coming up, by `GLIDER_CLEARANCE`. Not over the sea: down
 * into that, they crash.
 */
export function gliderFloor(
	world: Pick<World, 'terrain' | 'course'>,
	x: number,
) {
	let floor = Number.POSITIVE_INFINITY
	for (let at = x - 20; at <= x + FLOOR_AHEAD; at += 20)
		if (!atSea(world, at)) floor = Math.min(floor, world.terrain.groundY(at))
	return floor - GLIDER_CLEARANCE
}

/**
 * How far down from a glider's rider's feet their middle is, lying along
 * under its wing; and how far either side of it, along, they and the wing
 * reach, and up over it and down under it. What flies into things.
 */
export const GLIDING_MIDDLE = STAND_HEIGHT / 2
export const GLIDING_BACK = 30
export const GLIDING_FRONT = 30
export const GLIDING_UP = 34
export const GLIDING_DOWN = 14

/** What of someone on a glider there is to fly into things: them and its wing. */
export function glidingBox(b: Pick<Racer['body'], 'x' | 'feetY'>) {
	const middle = b.feetY - GLIDING_MIDDLE
	return {
		left: b.x - GLIDING_BACK,
		right: b.x + GLIDING_FRONT,
		top: middle - GLIDING_UP,
		bottom: middle + GLIDING_DOWN,
	}
}

/** Into a parked glider: on it, and off. */
export function grabGlider(world: World, racer: Racer) {
	const b = racer.body
	if (b.gliding) return
	const look = rideLook(world.course)
	const top = b.feetY - STAND_HEIGHT
	for (const glider of world.corgis) {
		if (glider.state !== 'waiting') continue
		if (Math.abs(b.x - glider.x) > look.width / 2 + HITBOX_HALF_WIDTH - 12)
			continue
		// Its wing over their head, its bar down to the ground.
		if (b.feetY < glider.feetY - look.height || top > glider.feetY) continue

		glider.state = 'ridden'
		glider.rider = racer.id
		b.gliding = true
		b.mount = 0
		b.grounded = false
		b.on = undefined
		b.ducking = false
		b.jumping = false
		b.stumble = 0
		b.facing = 1
		b.combo = 0
		// Lifted off their feet.
		b.vy = -1.5
		collect('ride:glider')
		world.addBonus('corgis', CORGI_POINTS)
		world.popup(
			scored(world, PICKUP_WORD['ride:glider'], `+${CORGI_POINTS}`),
			b.x,
			b.feetY - STAND_HEIGHT - 40,
		)
		play(look.sound)
		return
	}
}

/**
 * A tick on a glider: on along at its own speed, faster or slower as they
 * hold right or left, quicker diving, slower climbing, up or down as they
 * hold, gently sinking if neither; never over the sky, nor down near the
 * Ground. Over the island, it comes down. Down into the sea, they crash:
 * true, if they have.
 */
export function stepGliding(
	world: World,
	racer: Racer,
	held: { up: boolean; down: boolean; left: boolean; right: boolean },
) {
	const { up, down, left, right } = held
	const b = racer.body
	b.grounded = false
	b.ducking = false
	b.on = undefined
	b.jumping = false
	b.facing = 1
	if (b.stumble > 0) b.stumble--

	const steer = Number(down) - Number(up)
	const cruise =
		GLIDER_SPEED +
		(steer > 0 ? GLIDER_DIVE : steer < 0 ? -GLIDER_CLIMB_DRAG : 0) +
		(right && !left ? GLIDER_PUSH : 0) -
		(left && !right ? GLIDER_BRAKE : 0) +
		windAt(world, b.x, b.feetY)
	// Boosted past it, by a Ring: a burst, bleeding away.
	b.vx += (cruise - b.vx) * (b.vx > cruise ? GLIDER_BOOST_GRIP : GLIDER_GRIP)
	b.vx = Math.min(topSpeed(world), b.vx)
	b.vy += ((steer ? steer * GLIDER_CLIMB : GLIDER_SINK) - b.vy) * GLIDER_STEER
	b.x += b.vx
	b.feetY += b.vy

	const { sky, sea } = world.course
	if (sky !== undefined && b.feetY < sky) {
		b.feetY = sky
		b.vy = Math.max(0, b.vy)
	}
	const floor = gliderFloor(world, b.x)
	if (b.feetY > floor) {
		b.feetY = Math.max(floor, b.feetY - LIFT_MAX)
		b.vy = Math.min(0, b.vy)
	}
	// What the camera follows: wherever they're flying.
	b.floor = b.feetY

	if (sea && b.x >= sea.to) {
		b.gliding = false
		b.vy = 0
		world.popup('Land ahoy!', b.x, b.feetY - STAND_HEIGHT - 30)
		play('whoosh')
	}
	// Into the water, under them: crashed.
	return (
		!!sea &&
		atSea(world, b.x) &&
		b.feetY - GLIDING_MIDDLE + GLIDING_DOWN >= sea.level
	)
}

// --- The pack, on gliders ------------------------------------------------------

/** Whose a glider is, one of the pack's: by their id, apart from the racers'. */
export const pacerRider = (p: Pacer) => `pacer:${p.id}`

/**
 * One of the pack, into a parked glider: on it, and off, as anyone; but only
 * one going spare, with one still left for every Player who hasn't got one.
 * Those that don't get one run on, off the cliff, into the sea.
 */
export function grabPacerGlider(world: World, p: Pacer) {
	if (!p.grounded) return
	const waiting = world.corgis.filter((g) => g.state === 'waiting')
	const needing = world.racers.filter((r) => !r.out && !r.body.gliding).length
	if (waiting.length <= needing) return
	const { width } = rideLook(world.course)
	const glider = waiting.find(
		(g) => Math.abs(p.x - g.x) < width / 2 + HITBOX_HALF_WIDTH - 12,
	)
	if (!glider) return
	glider.state = 'ridden'
	glider.rider = pacerRider(p)
	p.gliding = true
	p.grounded = false
	p.on = undefined
	p.vy = -1.5
}

/** How fast the pack glide, the slowest of them and the quickest. */
const PACER_GLIDE_SLOWEST = 7.4
const PACER_GLIDE_FASTEST = 9
/** How quickly one of the pack steers up or down to the height they're after. */
const PACER_STEER = 0.04
/** How high they cruise, with no Ring ahead: their feet, over the sea. */
const PACER_CRUISE = 300

/**
 * A tick of one of the pack on a glider: on at their own pace, slower than
 * a Player's cruise, up or down for the next Ring, as the way through; never
 * into the sea. Over the island, it comes down, and they land and run on.
 */
export function flyPacer(world: World, p: Pacer) {
	const { sea, sky } = world.course
	// The quickest of them about as fast as the bus at sea; the slowest, not.
	const speed =
		PACER_GLIDE_SLOWEST +
		((p.pace - PACER_SLOWEST) / (PACER_FASTEST - PACER_SLOWEST)) *
			(PACER_GLIDE_FASTEST - PACER_GLIDE_SLOWEST) +
		windAt(world, p.x, p.feetY)
	p.vx += (speed - p.vx) * GLIDER_GRIP
	const ring = world.boosts.find(
		(state) => state.boost.kind === 'ring' && state.boost.x > p.x + 40,
	)?.boost
	const want = ring
		? world.terrain.groundY(ring.x) -
			(ring.kind === 'ring' ? ring.height : 0) +
			GLIDING_MIDDLE
		: (sea?.level ?? world.terrain.groundY(p.x)) - PACER_CRUISE
	const climb = Math.max(
		-GLIDER_CLIMB,
		Math.min(GLIDER_CLIMB, (want - p.feetY) * PACER_STEER),
	)
	p.vy += (climb - p.vy) * GLIDER_STEER
	p.x += p.vx
	p.feetY += p.vy
	if (sky !== undefined) p.feetY = Math.max(sky, p.feetY)
	const lowest = Math.min(
		gliderFloor(world, p.x),
		(sea?.level ?? Number.POSITIVE_INFINITY) - GLIDER_CLEARANCE,
	)
	if (p.feetY > lowest) p.feetY = Math.max(lowest, p.feetY - LIFT_MAX)
	if (sea && p.x >= sea.to) {
		p.gliding = false
		p.vy = 0
	}
}
