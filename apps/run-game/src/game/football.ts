import type { Course } from '../courses/types'
import { play } from '../sfx'
import { GRAVITY, HITBOX_HALF_WIDTH, LEFT_EDGE, VIEW_HEIGHT } from './constants'
import { createFollower } from './followers'
import { scored } from './step'
import type { Terrain } from './terrain'
import type { Racer, World } from './world'
import { bodyHeight } from './world'

/**
 * A football, left lying on the path (see `Course['football']`): run into
 * it and you kick it on ahead, the faster you're going the further, and it
 * rolls and bounces along, on down the hills, back down them if it's not
 * kicked hard enough to get up over them. Kick it all the way over the
 * finish line, and it's a goal. Let the bus get to it, and it's gone.
 */
export interface Football {
	/** Its middle. */
	x: number
	y: number
	vx: number
	vy: number
	/** How far round it's rolled, in degrees: what it's drawn turned by. */
	spin: number
	/**
	 * Over the finish line, a goal; or scooped up by the bus, flying; or
	 * an egg, hatched, and running on its own two legs.
	 */
	out?: 'home' | 'scooped' | 'hatched'
	/**
	 * An egg, rather than a football: it cracks, kicked, and hatches,
	 * landing past `hatchFrom` (see `Course['egg']`).
	 */
	egg?: NonNullable<Course['egg']>
	/** How many times it's been kicked. */
	kicks: number
	/** An egg's cracks, 0 to `EGG_STAGES - 1`, the further it's come (see `eggStage`). */
	stage: number
	/** Who last kicked it, by their racer id. */
	kickedBy?: string
	/** The tick each racer last kicked it, by their id: not every tick they're touching it. */
	kicked: Record<string, number>
}

/** How big it is: half across. */
export const FOOTBALL_RADIUS = 11
/** How much of its speed it keeps rolling along the ground, and flying, a tick. */
const ROLL_KEEP = 0.986
const AIR_KEEP = 0.998
/** How much of its speed down it bounces back up with. */
const BOUNCE = 0.5
/** How hard the slope it's on pulls it down it. */
const ROLL_PULL = 0.12
/** How hard a kick is, for how fast the kicker was going; and at least. */
const KICK = 1.6
const KICK_LEAST = 5
/** How much a kick lifts it, and more for a faster one. */
const KICK_LIFT = 2.5
const KICK_LIFT_SPEED = 0.35
/** How far under a jumping racer's feet they still get a toe to it. */
const TOE_REACH = 14
/** How long before the same racer can kick it again. */
const KICK_AGAIN = 8
/** How near someone has to be for an egg to hatch: right by it, so it's seen, never off ahead out of sight. */
const HATCH_NEAR = 160
/** What getting it over the line is worth. */
export const GOAL_POINTS = 500

/** A course's football, lying on the path where it says, if it has one. */
export function createFootball(course: {
	football?: Course['football']
	egg?: Course['egg']
	terrain: Terrain
}): Football | undefined {
	const x = course.football ?? course.egg?.x
	if (x === undefined) return undefined
	return {
		x,
		y: course.terrain.groundY(x) - FOOTBALL_RADIUS,
		vx: 0,
		vy: 0,
		spin: 0,
		kicked: {},
		kicks: 0,
		stage: 0,
		egg: course.football === undefined ? course.egg : undefined,
	}
}

/**
 * A tick of the football: kicked by anyone running into it; rolling,
 * bouncing and down the slopes; a goal over the finish line; scooped up by
 * the bus if it gets to it.
 */
export function stepFootball(world: World) {
	const ball = world.ball
	if (!ball) return
	const { terrain } = world
	if (ball.out === 'hatched') return
	if (ball.out === 'scooped') {
		if (ball.y > VIEW_HEIGHT + 400) return
		ball.vy += GRAVITY
		ball.x += ball.vx
		ball.y += ball.vy
		ball.spin += ball.vx * 6
		return
	}
	if (world.phase() !== 'countdown') kick(world, ball)

	const floor = terrain.groundY(ball.x) - FOOTBALL_RADIUS
	const grounded = ball.y >= floor - 0.5 && ball.vy >= 0
	if (grounded) {
		ball.y = floor
		ball.vy = 0
		ball.vx = ball.vx * ROLL_KEEP + terrain.slope(ball.x) * ROLL_PULL
		if (Math.abs(ball.vx) < 0.02) ball.vx = 0
	} else {
		ball.vy += GRAVITY
		ball.vx *= AIR_KEEP
	}
	ball.x = Math.max(LEFT_EDGE, ball.x + ball.vx)
	ball.y += ball.vy
	// Down onto the ground: bouncing back up, less each time.
	const under = terrain.groundY(ball.x) - FOOTBALL_RADIUS
	if (ball.y > under) {
		ball.y = under
		ball.vy = ball.vy > 2 ? -ball.vy * BOUNCE : 0
	}
	// An egg, cracking more the further it's come, and saying so.
	if (ball.egg && !ball.out) {
		const stage = eggStage(ball)
		if (stage > ball.stage) {
			ball.stage = stage
			play('stomp')
			world.popup(
				stage === EGG_STAGES - 1 ? 'It’s moving!' : 'Crack!',
				ball.x,
				ball.y - 40,
			)
		}
	}
	// An egg, kicked on as far as where it hatches, on the ground: it does,
	// once someone's caught up with it, there to see it.
	if (
		ball.egg &&
		!ball.out &&
		ball.x >= ball.egg.hatchFrom &&
		ball.y >= under - 1
	) {
		const by = nearBy(world, ball)
		if (by) {
			hatch(world, ball, ball.egg, by)
			return
		}
	}
	// Rolling along, turning as it goes: a radian for each radius it rolls.
	ball.spin += (ball.vx / FOOTBALL_RADIUS) * (180 / Math.PI)

	if (!ball.out && !ball.egg && ball.x >= terrain.finishX) {
		ball.out = 'home'
		play('cheer')
		world.addBonus('football', GOAL_POINTS)
		world.popup(scored(world, 'GOAL!', `+${GOAL_POINTS}`), ball.x, ball.y - 60)
	}
	// The bus gets to it: scooped up and flung off, gone.
	if (!ball.out && world.bus.frontX >= ball.x - FOOTBALL_RADIUS) {
		ball.out = 'scooped'
		ball.vx = Math.max(world.bus.speed, 2) + 4
		ball.vy = -12
		world.bus.scooping = 10
	}
}

/** Anyone running into it kicks it, on ahead the way they're going. */
function kick(world: World, ball: Football) {
	for (const racer of world.racers) {
		if (racer.out) continue
		const b = racer.body
		const dx = ball.x - b.x
		if (Math.abs(dx) > HITBOX_HALF_WIDTH + FOOTBALL_RADIUS) continue
		const top = b.feetY - bodyHeight(b)
		// Toed on with a jump only just over it, too.
		if (
			ball.y + FOOTBALL_RADIUS < top ||
			ball.y - FOOTBALL_RADIUS > b.feetY + TOE_REACH
		)
			continue
		const last = ball.kicked[racer.id]
		if (last !== undefined && world.ticks() - last < KICK_AGAIN) continue
		ball.kicked[racer.id] = world.ticks()
		ball.kicks++
		ball.kickedBy = racer.id
		// On ahead the way they're going, even run past its middle before
		// they got to kick it; nudged by someone standing about, away from them.
		const speed = Math.abs(b.vx)
		const dir = speed > 1 ? Math.sign(b.vx) : Math.sign(dx) || b.facing
		ball.vx = dir * Math.max(KICK_LEAST, speed * KICK)
		ball.vy = -(KICK_LIFT + speed * KICK_LIFT_SPEED)
		// Clear of their feet, so it's not kicked again at once.
		ball.x = b.x + dir * (HITBOX_HALF_WIDTH + FOOTBALL_RADIUS + 1)
		play('stomp')
	}
}

/** How many stages of cracking an egg goes through, from none to all over. */
export const EGG_STAGES = 4

/**
 * How cracked an egg is: more and more the further it's been kicked from
 * its nest towards where it hatches.
 */
export function eggStage(ball: Football) {
	if (!ball.egg) return 0
	const { x: nest, hatchFrom } = ball.egg
	const come = Math.max(0, Math.min(1, (ball.x - nest) / (hatchFrom - nest)))
	return Math.min(EGG_STAGES - 1, Math.floor(come * EGG_STAGES))
}

/**
 * Whoever's right by it, still racing: whoever kicked it last, if they
 * are, or else the nearest.
 */
function nearBy(world: World, ball: Football) {
	const near = world.racers
		.filter((r) => !r.out)
		.map((r) => ({
			r,
			d: Math.hypot(
				r.body.x - ball.x,
				r.body.feetY - bodyHeight(r.body) / 2 - ball.y,
			),
		}))
		.filter(({ d }) => d < HATCH_NEAR)
		.sort((a, b) => a.d - b.d)
	return (near.find(({ r }) => r.id === ball.kickedBy) ?? near[0])?.r
}

/** An egg, hatched: legs out, and off after `owner`, there to see it, following them. */
function hatch(
	world: World,
	ball: Football,
	egg: NonNullable<Course['egg']>,
	owner: Racer,
) {
	ball.out = 'hatched'
	ball.vx = 0
	ball.vy = 0
	world.followers.push(
		createFollower(egg.follower, owner, ball.x, ball.y + FOOTBALL_RADIUS),
	)
	play('pop')
	world.popup('It hatched!', ball.x, ball.y - 60)
}
