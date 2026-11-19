import type { Course } from '../courses/types'
import { play } from '../sfx'
import { HAZARD_POINTS, STUMBLE_TICKS } from './constants'
import { HAT_RULES } from './hats'
import { OVERSPEED_GRIP, scored, shielded } from './step'
import type { Body, Pacer, Racer, World } from './world'

/**
 * The sea, swum through (see `Course['deepWater']`): off the land and down into
 * it, and you're swimming, on along under the water as you hold right, up
 * and down as you hold up or down, slowly floating up if neither; under its
 * rock and through what's in it, and up out of it onto the shore the far
 * side as soon as it's shallow enough to stand.
 *
 * Swimming, `feetY` is the bottom of them, lying along in the water, and
 * `SWIM_TALL` the depth of them: what's to run into, and what can't go up
 * into the rock.
 */

/** How deep a swimmer is, lying along, and how far either side of their middle they reach. */
export const SWIM_TALL = 30
export const SWIM_HALF = 26
/** How far over the surface a swimmer's back can be: their head up out of it, breathing. */
const SURFACE_OUT = 8
/** How fast they swim, holding right; back the other way, a bit slower; and how quickly they get to it. */
export const SWIM_SPEED = 6
const SWIM_BACK = 3.5
const SWIM_GRIP = 0.04
/** Holding nothing, how much of their speed they keep a tick: gliding on. */
const SWIM_COAST = 0.985
/** How fast they swim up or down, held, and how quickly they turn to it; and how fast they float up, left to it. */
const SWIM_DIVE = 3.6
const SWIM_STEER = 0.1
const SWIM_FLOAT = 0.7
/** Holding down, diving: how fast they go down, and how quickly they get to it. Quicker than up. */
const SWIM_DOWN = 6
const SWIM_DOWN_STEER = 0.16
/** Diving in: how much of how fast they hit the water they keep, down and on. */
const DIVE_KEEP_DOWN = 0.45
const DIVE_KEEP_ON = 0.8
/** Diving into the seabed this fast or faster: a bonk, as running into a wall is. Holding down a good while gets there; a gentle swim down doesn't. */
const SEABED_BONK = 5
/** How shallow it has to be, the seabed under the surface, to stand up out of it. */
const SHALLOW = 40

/** Whether `x` is in the sea, if the course has one. */
export function inDeepWater(
	world: { course: Pick<Course, 'deepWater'> },
	x: number,
) {
	const { deepWater } = world.course
	return !!deepWater && x >= deepWater.from && x < deepWater.to
}

/** The highest a swimmer's bottom can be, their back just out of the water. */
export function surfaceFloor(world: { course: Pick<Course, 'deepWater'> }) {
	return (world.course.deepWater?.surface ?? 0) + SWIM_TALL - SURFACE_OUT
}

/**
 * Whether someone at `x`, `feetY`, off the ground, is in the water,
 * swimming: under the surface, in the sea. What a Remote Player's screen
 * draws them by, as well as what puts them in it.
 */
export function underwater(
	world: Pick<World, 'course'>,
	x: number,
	feetY: number,
) {
	return inDeepWater(world, x) && feetY >= surfaceFloor(world) - 2
}

/** What of a swimmer there is to swim into things: lying along, head first. */
export function swimmingBox(b: Pick<Body, 'x' | 'feetY'>) {
	return {
		left: b.x - SWIM_HALF,
		right: b.x + SWIM_HALF,
		top: b.feetY - SWIM_TALL,
		bottom: b.feetY,
	}
}

/**
 * The underside of the rock at `x`, if there's rock there to swim into: a
 * shelf of it, out over the seabed, a Cave's.
 */
function rockUnder(world: World, x: number) {
	return world.course.cave?.ceiling(x)
}

/** Whether a swimmer at `x`, its top at `top`, is in the rock. */
const inRock = (world: World, x: number, top: number) => {
	const under = rockUnder(world, x)
	return under !== undefined && top < under
}

/** Into the water, off the land: diving in, slowed by it, and swimming. */
export function diveIn(world: World, b: Body) {
	b.swimming = true
	b.grounded = false
	b.on = undefined
	b.jumping = false
	b.ducking = false
	b.mount = 0
	b.vy = Math.max(0, b.vy) * DIVE_KEEP_DOWN
	b.vx *= DIVE_KEEP_ON
	world.popup('Splash!', b.x, b.feetY - 60)
}

/**
 * A tick swimming: on as they hold right, up and down as they hold up or
 * down, floating up if neither; never out of the top of the water, nor
 * into the seabed or the rock. Shallow enough to stand, out of it: true,
 * if they're out.
 */
export function stepSwimming(
	world: World,
	racer: Racer,
	held: { up: boolean; down: boolean; left: boolean; right: boolean },
	racing: boolean,
) {
	const { up, down, left, right } = held
	const b = racer.body
	b.grounded = false
	b.ducking = false
	b.on = undefined
	b.jumping = false
	b.airBase = undefined
	if (b.stumble > 0) b.stumble--
	const canDrive = b.stumble === 0
	const drive = canDrive ? Number(right) - Number(left) : 0
	const fast = SWIM_SPEED + (b.hat ? HAT_RULES[b.hat.kind].speed : 0)
	if (!racing) b.vx += (fast - b.vx) * SWIM_GRIP * 2
	else if (drive) {
		const target = drive > 0 ? fast : -SWIM_BACK
		// Boosted past it the way they're going: let it last, as on land.
		const boosted = b.vx * drive > Math.abs(target)
		b.vx += (target - b.vx) * (boosted ? OVERSPEED_GRIP : SWIM_GRIP)
	} else b.vx *= SWIM_COAST
	const steer = racing ? Number(down) - Number(up) : 0
	b.vy +=
		((steer > 0 ? SWIM_DOWN : steer < 0 ? -SWIM_DIVE : -SWIM_FLOAT) - b.vy) *
		(steer > 0 ? SWIM_DOWN_STEER : SWIM_STEER)
	if (b.vx > 0.5) b.facing = 1
	else if (b.vx < -0.5) b.facing = -1

	// On, unless the rock's in the way: bumped to a stop against it, to swim
	// down under it.
	const x = b.x + b.vx
	const front = x + Math.sign(b.vx) * SWIM_HALF
	if (inRock(world, front, b.feetY - SWIM_TALL)) b.vx = 0
	else b.x = x

	b.feetY += b.vy
	// Never up out of the water, but for their back...
	const top = surfaceFloor(world)
	if (b.feetY < top) {
		b.feetY = top
		b.vy = Math.max(0, b.vy)
	}
	// ...nor up into the rock over them...
	const under = rockUnder(world, b.x)
	if (under !== undefined && b.feetY - SWIM_TALL < under) {
		b.feetY = under + SWIM_TALL
		b.vy = Math.max(0, b.vy)
	}
	// ...nor down into the seabed.
	const ground = world.terrain.groundY(b.x)
	if (b.feetY > ground) {
		// Hard enough, and it's a bonk: a stumble, as into a wall, unless a
		// helmet takes the knock.
		if (
			racing &&
			b.vy >= SEABED_BONK &&
			b.stumble === 0 &&
			!shielded(world, b)
		) {
			play('stumble')
			b.stumble = STUMBLE_TICKS
			world.addBonus('hazards', -HAZARD_POINTS)
			world.popup(
				scored(world, 'Bonk!', `-${HAZARD_POINTS}`),
				b.x,
				b.feetY - SWIM_TALL,
			)
		}
		b.feetY = ground
		b.vy = Math.min(0, b.vy)
	}
	// What the camera follows: wherever they're swimming.
	b.floor = b.feetY

	// Shallow enough to stand, or out the far side: up on their feet.
	const { deepWater } = world.course
	if (
		!deepWater ||
		b.x >= deepWater.to ||
		ground - deepWater.surface < SHALLOW
	) {
		b.swimming = false
		b.feetY = ground
		b.vy = 0
		b.grounded = true
		b.floor = ground
		if (racing) world.popup('Land ahoy!', b.x, b.feetY - 80)
		return true
	}
	return false
}

// --- The pack, swimming ------------------------------------------------------

/** How far ahead one of the pack looks for where to swim. */
const PACER_LOOK = 160
/** How quickly they steer to it. */
const PACER_STEER = 0.04
/** How much slower than they run they swim. */
const PACER_SWIM = 0.9

/**
 * A tick of one of the pack swimming: on at their own pace, a little slower
 * than they run, keeping to the middle of the water ahead of them, between
 * the surface (or the rock over it) and the seabed: so down under a shelf
 * of rock, and through. Up on the shore, out and running on.
 */
export function swimPacer(world: World, p: Pacer) {
	const { deepWater } = world.course
	if (!deepWater) return
	p.grounded = false
	p.on = undefined
	p.ducking = false
	p.vx += (p.pace * PACER_SWIM - p.vx) * SWIM_GRIP
	let roof = surfaceFloor(world)
	let floor = Number.POSITIVE_INFINITY
	for (let at = p.x; at <= p.x + PACER_LOOK; at += 20) {
		const under = world.course.cave?.ceiling(at)
		if (under !== undefined) roof = Math.max(roof, under + SWIM_TALL)
		floor = Math.min(floor, world.terrain.groundY(at))
	}
	const want = (roof + floor) / 2
	const climb = Math.max(
		-SWIM_DIVE,
		Math.min(SWIM_DIVE, (want - p.feetY) * PACER_STEER),
	)
	p.vy += (climb - p.vy) * SWIM_STEER
	p.x += p.vx
	p.feetY = Math.max(surfaceFloor(world), p.feetY + p.vy)
	const ground = world.terrain.groundY(p.x)
	p.feetY = Math.min(ground, p.feetY)
	if (p.x >= deepWater.to || ground - deepWater.surface < SHALLOW) {
		p.swimming = false
		p.grounded = true
		p.feetY = ground
		p.vy = 0
	}
}

/** One of the pack, falling into the sea: swimming. */
export function pacerDivesIn(world: World, p: Pacer) {
	if (p.grounded || p.swimming || !underwater(world, p.x, p.feetY)) return
	p.swimming = true
	p.vy *= DIVE_KEEP_DOWN
}
