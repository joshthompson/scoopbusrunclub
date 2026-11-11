import { GRAVITY } from '../game/constants'
import type { World } from '../game/world'

/**
 * How the bus is drawn going up and down: its wheels' height, as drawn, and
 * how fast that's changing. Only for drawing, worked out from how far along
 * the bus is, the same on every screen: where it scoops is all the race goes
 * by.
 */
export interface BusRide {
	y: number
	vy: number
	grounded: boolean
	/** Where its front was last tick, for how fast it's going. */
	front: number
}

/** A hop across a Gap: small, and again if it's still over it when it comes down. */
const GAP_HOP = 4.2
/** How much higher than it has to, it jumps up onto higher Ground. */
const JUMP_SPARE = 40
/** A step down this much or less, it drives down; more, it drops. */
const STEP_DOWN = 12
/** Whether `x` is out over the sea, where it glides, rather than hopping across a Gap. */
export function atSea(world: Pick<World, 'course'>, x: number) {
	const { sea } = world.course
	return !!sea && x >= sea.from && x < sea.to
}

/** On its glider: how fast it climbs or dives at most, and how quickly it turns to. */
const GLIDE_CLIMB = 4
const GLIDE_STEER = 0.08
/** How far under whoever it's after its wheels fly, swooping at them. */
const GLIDE_UNDER = 30
/** Its height, with no one ahead to go after; and how near the sky and the sea it goes, at most. */
const GLIDE_CRUISE = 260
const GLIDE_SKY_ROOM = 60
const GLIDE_SEA_ROOM = 40

/**
 * Where the bus's wheels fly, gliding across the sea: just under whoever's
 * nearest ahead of it, its scoop at them; never into the sea, nor up out
 * of the sky.
 */
function glideHeight(world: World) {
	const { sea, sky } = world.course
	if (!sea) return 0
	const front = world.bus.frontX
	const ahead = world.racers
		.filter((r) => !r.out && r.body.x > front - 20)
		.sort((a, b) => a.body.x - b.body.x)[0]
	const y = ahead ? ahead.body.feetY + GLIDE_UNDER : sea.level - GLIDE_CRUISE
	return Math.max(
		(sky ?? Number.NEGATIVE_INFINITY) + GLIDE_SKY_ROOM,
		Math.min(sea.level - GLIDE_SEA_ROOM, y),
	)
}

export function startRide(world: World, middle: number): BusRide {
	return {
		y: world.course.busFloor?.(middle) ?? world.terrain.groundY(middle),
		vy: 0,
		grounded: true,
		front: world.bus.frontX,
	}
}

/**
 * One tick of the bus's ride, its wheels at `middle`: up onto higher Ground in
 * a jump, timed to clear it as its front gets there, off lower Ground in a
 * drop, and across a Gap in little hops; or off a cliff, on its own glider,
 * across the sea, and down onto the island the far side.
 */
export function rideBus(world: World, ride: BusRide, middle: number) {
	const { terrain } = world
	const front = world.bus.frontX
	const speed = Math.max(0, front - ride.front)
	ride.front = front
	// Digging its own way: down it, or up it, wherever it goes.
	const dug = world.course.busFloor?.(middle)
	if (dug !== undefined) {
		ride.y = dug
		ride.vy = 0
		ride.grounded = true
		return
	}
	// Off the cliff, on its own glider, across the sea after everyone.
	if (atSea(world, middle)) {
		const want = Math.max(
			-GLIDE_CLIMB,
			Math.min(GLIDE_CLIMB, (glideHeight(world) - ride.y) * 0.04),
		)
		ride.vy += (want - ride.vy) * GLIDE_STEER
		ride.y += ride.vy
		ride.grounded = false
		return
	}
	const floor = terrain.groundY(middle)

	if (ride.grounded) {
		// Higher Ground ahead: jumped, in time to be up there when it arrives.
		// Not where it'll be digging its own way up instead.
		const up = terrain.walls.find(
			(w) =>
				w > middle &&
				world.course.busFloor?.(w + 1) === undefined &&
				!terrain.inGap(w + 1) &&
				terrain.groundY(w + 1) < ride.y - STEP_DOWN,
		)
		if (up !== undefined && speed > 0) {
			const rise = ride.y - terrain.groundY(up + 1)
			const vy = Math.sqrt(2 * GRAVITY * (rise + JUMP_SPARE))
			const lead = speed * (vy / GRAVITY) * 0.75
			if (up - front < lead) {
				ride.vy = -vy
				ride.grounded = false
			}
		}
		if (
			ride.grounded &&
			speed > 0 &&
			terrain.inGap(middle) &&
			!atSea(world, middle)
		) {
			ride.vy = -GAP_HOP
			ride.grounded = false
		}
		if (ride.grounded) {
			if (floor - ride.y > STEP_DOWN) {
				// Off the edge: down it goes.
				ride.grounded = false
				ride.vy = 0
			} else ride.y = floor
		}
	}
	if (!ride.grounded) {
		ride.vy += GRAVITY
		ride.y += ride.vy
		if (ride.vy >= 0 && ride.y >= floor) {
			ride.y = floor
			ride.vy = 0
			ride.grounded = true
		}
	}
}
