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

export function startRide(world: World, middle: number): BusRide {
	return {
		y: world.terrain.groundY(middle),
		vy: 0,
		grounded: true,
		front: world.bus.frontX,
	}
}

/**
 * One tick of the bus's ride, its wheels at `middle`: up onto higher Ground in
 * a jump, timed to clear it as its front gets there, off lower Ground in a
 * drop, and across a Gap in little hops.
 */
export function rideBus(world: World, ride: BusRide, middle: number) {
	const { terrain } = world
	const front = world.bus.frontX
	const speed = Math.max(0, front - ride.front)
	ride.front = front
	const floor = terrain.groundY(middle)

	if (ride.grounded) {
		// Higher Ground ahead: jumped, in time to be up there when it arrives.
		const up = terrain.walls.find(
			(w) =>
				w > middle &&
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
		if (ride.grounded && speed > 0 && terrain.inGap(middle)) {
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
