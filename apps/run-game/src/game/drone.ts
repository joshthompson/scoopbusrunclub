import { play } from '../sfx'
import { GRAVITY, HITBOX_HALF_WIDTH, STOMP_BOUNCE } from './constants'
import { LONG_JUMP_PX_PER_M, PIT_FROM, TAKEOFF_ZONE } from './longJump'
import { type Racer, type World, bodyHeight } from './world'

/**
 * Kristineberg's drone (see `CourseLook['bigScreen']`), filming whoever's
 * leading for the big screen: parked out of sight till they get to
 * `droneFrom`, then flown in to hover over them, a bit ahead, all the way
 * in, over the line and dancing. Drawn, and what it films shown, by
 * `draw/bigScreen.ts`.
 *
 * It keeps out of reach: higher than anyone can jump, so a jump up into it
 * only bumps their head on it, and back down they go. Only bouncing up
 * off someone's head gets anyone high enough to come down on top of it,
 * and that takes someone else there to bounce off: whoever's second,
 * close behind the leader, say. Come down on it, and they bounce off it,
 * and it's knocked out of the sky: it tumbles down and smashes on the
 * track.
 *
 * Stepped with the world, on the Host, so it can bounce people about; and
 * brought up to the tick wherever it's drawn, so a Remote Player's screen,
 * whose world isn't stepped, has it too, worked out from where everyone is.
 */

/**
 * Where it keeps itself over whoever it's following: this high over the
 * ground they last stood on (not climbing as they jump), its middle; a bit
 * ahead, ahead more the faster they go, and stood still, right over them.
 */
const OVER_GROUND = 120
const AHEAD = 44
const LEAD_TICKS = 6
/** How fast they have to be going for it to keep all the way ahead. */
const AHEAD_FROM_SPEED = 4
/** How it gets there: pulled towards it, and how much speed it keeps a tick; and its fastest. */
const PULL = 0.03
const KEEP = 0.82
const FASTEST = 16
/** Where it flies in from: off the left of the screen, high up. */
const FLIES_IN_BEHIND = 60
const FLIES_IN_HIGH = 260
/** The most ticks it catches up on at once, if it's not been looked at for a while. */
const CATCH_UP = 120
/** How much of it there is to hit, either side of its middle. */
const HIT_HALF_WIDTH = 14
export const DRONE_HALF_HEIGHT = 9
/** Bumped from below: how fast they're sent back down, and how hard it's jolted up and aside. */
const BUMPED_DOWN = 2
const JOLT_UP = 2.5
const JOLT_ASIDE = 1.5
/** Knocked out: how fast it tumbles over, degrees a tick, and what it keeps of its speed along, falling. */
const TUMBLE = 14
const FALL_KEEP = 0.99

/**
 * The drone, as it is, as of tick `at`: parked out of sight, flying,
 * knocked out and falling, or down, in pieces on the track; where, how
 * fast, how far it's tumbled over; when it came down; who it's following;
 * and the long jump: whoever's in the air off the board just now, and the
 * leader's, landed in the sand, how far, when they took off and landed.
 */
export interface Drone {
	state: 'parked' | 'flying' | 'falling' | 'down'
	x: number
	y: number
	vx: number
	vy: number
	spin: number
	turning: number
	at: number
	downAt: number
	leader?: Racer
	flight?: { racer: string; from: number; x: number }
	jump?: { racer: string; metres: number; from: number; at: number }
	/** Who's had their go at the long jump; and who was on the ground last tick. */
	tried: Set<string>
	wasDown: Map<string, boolean>
}
const drones = new WeakMap<World, Drone>()

/** Whoever's furthest on, of those still racing or over the line. */
function leaderOf(world: World) {
	let leader: Racer | undefined
	for (const racer of world.racers)
		if (
			(!racer.out || racer.out === 'finished') &&
			(!leader || racer.body.x > leader.body.x)
		)
			leader = racer
	return leader
}

/**
 * The leader's long jump, worked out from where they are, as the game
 * measures it (see `game/longJump`), so a Remote Player's screen, which
 * isn't told, can too: off the ground near enough the board, their go; down
 * again in the sand, having taken off before the board, how far it was.
 */
function watchJump(world: World, d: Drone, leader: Racer, t: number) {
	const board = world.course.longJump?.board
	const b = leader.body
	const was = d.wasDown.get(leader.id) ?? true
	d.wasDown.set(leader.id, b.grounded)
	if (board === undefined) return
	// Seen in the air a tick after they took off: where they took off from,
	// as the game has it, back where they were before that tick's step.
	const launch = b.x - b.vx
	if (
		!d.flight &&
		was &&
		!b.grounded &&
		!d.tried.has(leader.id) &&
		launch >= board - TAKEOFF_ZONE &&
		launch < board + PIT_FROM
	) {
		d.flight = { racer: leader.id, from: t, x: launch }
		d.tried.add(leader.id)
	}
	const flight = d.flight
	if (!flight || flight.racer !== leader.id || !b.grounded) return
	d.flight = undefined
	if (flight.x > board || b.x < board + PIT_FROM) return
	const metres = Math.round(((b.x - board) / LONG_JUMP_PX_PER_M) * 10) / 10
	d.jump = { racer: leader.id, metres, from: flight.from, at: t }
}

/**
 * Anyone in the air at the drone: coming down on top of it, bounced off,
 * and it's knocked out of the sky; up into it from under, their head
 * bumped, and back down they go, it jolted.
 */
function touch(world: World, d: Drone) {
	const top = d.y - DRONE_HALF_HEIGHT
	const bottom = d.y + DRONE_HALF_HEIGHT
	for (const racer of world.racers) {
		const b = racer.body
		if (racer.out || b.grounded) continue
		if (Math.abs(b.x - d.x) >= HITBOX_HALF_WIDTH + HIT_HALF_WIDTH) continue
		const head = b.feetY - bodyHeight(b)
		const away = Math.sign(d.x - b.x) || 1
		// Down onto it from above: off it, and it's down.
		if (b.vy > 0 && b.feetY - b.vy <= top && b.feetY >= top) {
			b.feetY = top
			b.vy = -STOMP_BOUNCE
			d.state = 'falling'
			d.vx = b.vx * 0.5 + away * 1.5
			d.vy = 4
			d.turning = (d.vx >= 0 ? 1 : -1) * TUMBLE
			world.popup('Drone down!', d.x, top - 40)
			play('stomp')
			return
		}
		// Up into it from under: their head bumped, and back down.
		if (b.vy < 0 && head - b.vy >= bottom && head <= bottom) {
			b.feetY += bottom - head
			b.vy = BUMPED_DOWN
			d.vy -= JOLT_UP
			d.vx += away * JOLT_ASIDE
			play('stumble')
		}
	}
}

/**
 * Tick `t` of the drone: flying in, once the leader's far enough on, and
 * following them, keeping out of reach; knocked out, and falling; and down,
 * smashed on the track.
 */
function step(world: World, droneFrom: number, d: Drone, t: number) {
	const leader = leaderOf(world)
	if (leader) watchJump(world, d, leader, t)
	if (d.state === 'down') return
	if (d.state === 'falling') {
		d.vy += GRAVITY
		d.vx *= FALL_KEEP
		d.x += d.vx
		d.y += d.vy
		d.spin += d.turning
		const ground = world.terrain.groundY(d.x) - DRONE_HALF_HEIGHT
		if (d.y >= ground) {
			d.y = ground
			d.state = 'down'
			d.downAt = t
			play('smash')
		}
		return
	}
	if (!leader) return
	const b = leader.body
	if (d.state === 'parked') {
		if (b.x < droneFrom) return
		d.state = 'flying'
		d.x = world.camera() - FLIES_IN_BEHIND
		d.y = b.floor - FLIES_IN_HIGH
	}
	d.leader = leader
	const ahead = AHEAD * Math.min(1, Math.abs(b.vx) / AHEAD_FROM_SPEED)
	const tx = b.x + b.facing * ahead + b.vx * LEAD_TICKS
	const ty = b.floor - OVER_GROUND
	d.vx = (d.vx + (tx - d.x) * PULL) * KEEP
	d.vy = (d.vy + (ty - d.y) * PULL) * KEEP
	const speed = Math.hypot(d.vx, d.vy)
	if (speed > FASTEST) {
		d.vx *= FASTEST / speed
		d.vy *= FASTEST / speed
	}
	d.x += d.vx
	d.y += d.vy
	touch(world, d)
}

/**
 * `world`'s drone, if its course has one, brought up to its tick, a tick
 * at a time: by the world's step, on the Host, and by whatever draws it,
 * wherever, however many of them there are.
 */
export function droneOf(world: World) {
	const droneFrom = world.course.look?.bigScreen?.droneFrom
	if (droneFrom === undefined) return undefined
	const now = world.ticks()
	let d = drones.get(world)
	if (!d || now < d.at) {
		d = {
			state: 'parked',
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			spin: 0,
			turning: 0,
			at: now,
			downAt: 0,
			tried: new Set(),
			wasDown: new Map(),
		}
		drones.set(world, d)
	}
	const from = Math.max(d.at, now - CATCH_UP)
	for (let t = from + 1; t <= now; t++) step(world, droneFrom, d, t)
	d.at = now
	return d
}

/**
 * The long jump's slow-motion replay, on the big screen: how long after
 * the landing it starts, live till then; from how long before the take-off
 * to how long after the landing; and how many times slower than it was.
 */
const REPLAY_AFTER = 40
const REPLAY_BEFORE = 16
const REPLAY_PAST = 16
export const REPLAY_SLOW = 3

/**
 * When `jump`'s replay is: the first tick of it that's shown (`from`), when
 * it starts and ends, and when, played back, the landing is. Here, not
 * with the screen, so the reporter can wait for it (see `game/interview`).
 */
export function replayTimes(jump: NonNullable<Drone['jump']>) {
	const from = jump.from - REPLAY_BEFORE
	const start = jump.at + REPLAY_AFTER
	return {
		from,
		start,
		end: start + (jump.at + REPLAY_PAST - from) * REPLAY_SLOW,
		landing: start + (jump.at - from) * REPLAY_SLOW,
	}
}

/** A tick of the world, for its drone: stepped now, after everyone's moved, so it can bounce them about. */
export function stepDrone(world: World) {
	droneOf(world)
}
