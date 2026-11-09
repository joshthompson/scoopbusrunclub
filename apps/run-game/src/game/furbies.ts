import { play } from '../sfx'
import {
	DAZED_TICKS,
	DUCK_HEIGHT,
	FURBY_AIM,
	FURBY_AIM_ERROR,
	FURBY_HOP,
	FURBY_REACH,
	FURBY_REST_SPREAD,
	FURBY_REST_TICKS,
	FURBY_RIDE_TICKS,
	FURBY_ROAM,
	FURBY_SPOT,
	FURBY_STEER,
	FURBY_WANDER,
	GRAVITY,
	HAZARD_POINTS,
	HITBOX_HALF_WIDTH,
	STAND_HEIGHT,
	STUMBLE_SPEED,
	VIEW_HEIGHT,
} from './constants'
import { SCOOP_HEARD, bounceOff } from './pack'
import { scored } from './step'
import type { Furby, Racer, World } from './world'

/** Whoever a furby's after: the nearest racer still running. */
function nearest(world: World, x: number): Racer | undefined {
	let best: Racer | undefined
	for (const r of world.racers) {
		if (r.out) continue
		if (!best || Math.abs(r.body.x - x) < Math.abs(best.body.x - x)) best = r
	}
	return best
}

/**
 * Furby Fields' furbies, hopping about the path all the time. Near you, they
 * hop at you, aiming for where you'll be, not very well, and lean your way in
 * the air. Come down on your head and one sits there a while, slowing you
 * right down. Come down on its head first and you bounce off it for points,
 * the same as off a runner's.
 */

/** Furbies are drawn at twice their pixel size: 50 wide, 56 tall. */
export const FURBY_WIDTH = 50
export const FURBY_HEIGHT = 56
/** To the top of its head, not counting its tuft: what you bounce off. */
const FURBY_HEAD = 46
/** Landing this far into its head still counts as on top of it. */
const HEAD_GIVE = 8
/** And this far either side of the middle of it. */
const HEAD_REACH = FURBY_WIDTH / 2 + HITBOX_HALF_WIDTH - 8
/** It comes down on you if its feet are this near the middle of you. */
const LANDING_REACH = HITBOX_HALF_WIDTH + 14
/** Hopping off your head: up, and back the way you came. */
const HOP_OFF_UP = 7
const HOP_OFF_BACK = 2.5

export function stepFurbies(world: World) {
	const { furbies, terrain } = world
	if (!furbies.length) return
	const running = world.phase() === 'running'

	for (const f of furbies) {
		if (f.state === 'scooped') {
			// Gone off the bottom: left there.
			if (f.feetY > VIEW_HEIGHT + 300) continue
			f.x += f.vx
			f.vy += GRAVITY
			f.feetY += f.vy
			f.spin++
			continue
		}

		if (f.state === 'riding') {
			const rider = world.racers.find((r) => r.id === f.rider)
			const b = (rider ?? world.racers[0]).body
			f.x = b.x
			f.feetY = b.feetY - (b.ducking ? DUCK_HEIGHT : STAND_HEIGHT)
			f.facing = b.facing
			if (--f.timer <= 0 || !running || rider?.out) {
				f.state = 'hopping'
				f.rider = undefined
				f.grounded = false
				f.vy = -HOP_OFF_UP
				f.vx = -b.facing * HOP_OFF_BACK
				f.home = f.x
			}
			continue
		}

		if (f.timer > 0) f.timer--
		f.landed++
		if (f.grounded) {
			if (f.state === 'dazed' && f.timer === 0) f.state = 'hopping'
			f.feetY = terrain.groundY(f.x)
			// Hopping about from the start, not just once it's "Go!".
			if (f.state === 'hopping' && f.timer === 0) hop(world, f, running)
			continue
		}

		// A little lean your way in the air, if it's after you.
		const target = nearest(world, f.x)
		const dx = target ? target.body.x - f.x : Number.POSITIVE_INFINITY
		if (running && f.state === 'hopping' && Math.abs(dx) < FURBY_SPOT) {
			f.vx += Math.sign(dx) * FURBY_STEER
			f.vx = Math.max(-FURBY_REACH, Math.min(FURBY_REACH, f.vx))
		}
		f.vy += GRAVITY
		f.x += f.vx
		f.feetY += f.vy
		if (Math.abs(f.vx) > 0.3) f.facing = f.vx > 0 ? 1 : -1
		const ground = terrain.groundY(f.x)
		if (f.feetY >= ground && f.vy >= 0) {
			f.feetY = ground
			f.vx = 0
			f.vy = 0
			f.grounded = true
			f.landed = 0
			if (f.state === 'hopping')
				f.timer =
					FURBY_REST_TICKS + Math.round(Math.random() * FURBY_REST_SPREAD)
		}
	}

	if (!running) return
	for (const racer of world.racers) {
		if (racer.out || racer.body.mount > 0 || racer.body.carried > 0) continue
		stompFurbies(world, racer)
		landOnRunner(world, racer)
	}
}

/**
 * Another hop. Near the runner, partly at where they'll be when it comes back
 * down to their head height, if they keep going as they are; otherwise about
 * its patch of the path.
 */
function hop(world: World, f: Furby, running: boolean) {
	/** About its patch, drifting back towards home. */
	const wander =
		(Math.random() * 2 - 1) * FURBY_WANDER +
		Math.max(-1, Math.min(1, (f.home - f.x) / FURBY_ROAM)) * FURBY_WANDER
	let vx = wander
	const target = nearest(world, f.x)
	const b = target?.body
	if (b && running && Math.abs(b.x - f.x) < FURBY_SPOT) {
		const head = b.feetY - STAND_HEIGHT
		const ticks = ticksToFall(f.feetY, -FURBY_HOP, head) ?? 40
		const aim = b.x + b.vx * ticks + (Math.random() * 2 - 1) * FURBY_AIM_ERROR
		const aimed = (aim - f.x) / ticks
		vx = aimed * FURBY_AIM + wander * (1 - FURBY_AIM)
	}
	f.vx = Math.max(-FURBY_REACH, Math.min(FURBY_REACH, vx))
	f.vy = -FURBY_HOP * (0.85 + Math.random() * 0.15)
	f.grounded = false
}

/**
 * Ticks until feet at `feetY`, going at `vy`, come down through `line`,
 * stepped just as a furby in the air is. Undefined if they never get above it.
 */
function ticksToFall(feetY: number, vy: number, line: number) {
	let y = feetY
	let speed = vy
	for (let tick = 1; tick <= 120; tick++) {
		speed += GRAVITY
		const from = y
		y += speed
		if (speed > 0) {
			if (from >= line) return undefined
			if (y >= line) return tick
		}
	}
	return undefined
}

/** Coming down on a furby's head: bounced off, and it's dazed. */
function stompFurbies(world: World, racer: Racer) {
	const b = racer.body
	if (b.grounded || b.vy <= 0) return
	/** Where their feet were last tick. */
	const was = b.feetY - b.vy

	for (const f of world.furbies) {
		if (f.state !== 'hopping') continue
		if (Math.abs(b.x - f.x) > HEAD_REACH) continue
		const head = f.feetY - FURBY_HEAD + HEAD_GIVE
		if (was > head || b.feetY < head) continue

		bounceOff(world, racer, head, f.x)
		f.state = 'dazed'
		f.timer = DAZED_TICKS
		// Knocked out of the air, if it was up there.
		if (!f.grounded) {
			f.vx *= 0.3
			f.vy = Math.max(f.vy, 3)
		}
		return
	}
}

/** A furby coming down on a racer's head: it sits there, and slows them right down. */
function landOnRunner(world: World, racer: Racer) {
	const b = racer.body
	// Only one on their head at once, and not while they're still reeling.
	if (
		b.stumble > 0 ||
		world.furbies.some((f) => f.state === 'riding' && f.rider === racer.id)
	)
		return
	const top = b.feetY - (b.ducking ? DUCK_HEIGHT : STAND_HEIGHT)

	for (const f of world.furbies) {
		if (f.state !== 'hopping' || f.grounded || f.vy <= 0) continue
		if (Math.abs(f.x - b.x) > LANDING_REACH) continue
		/** Where its feet were last tick. */
		const was = f.feetY - f.vy
		if (was > top || f.feetY < top) continue

		f.state = 'riding'
		f.rider = racer.id
		f.timer = FURBY_RIDE_TICKS
		f.vx = 0
		f.vy = 0
		b.stumble = FURBY_RIDE_TICKS
		b.vx = Math.sign(b.vx) * Math.min(Math.abs(b.vx), STUMBLE_SPEED)
		world.addBonus('hazards', -HAZARD_POINTS)
		world.popup(
			scored(world, 'Furby!', `-${HAZARD_POINTS}`),
			b.x,
			top - FURBY_HEIGHT,
		)
		play('furby')
		return
	}
}

/** Whichever furbies the bus has caught up with go flying, the same as anyone. */
export function scoopFurbies(world: World) {
	const { bus } = world
	const camera = world.camera()
	for (const f of world.furbies) {
		if (f.state === 'scooped' || bus.frontX < f.x - FURBY_WIDTH / 2) continue
		f.state = 'scooped'
		f.grounded = false
		f.vx = Math.max(bus.speed, 2) + 2 + Math.random() * 2
		f.vy = -12 - Math.random() * 3
		f.spin = 0
		bus.scooping = 10
		if (f.x > camera - SCOOP_HEARD && f.x < camera + world.viewWidth())
			play('whoosh')
	}
}

/** About to hop: squashed down. Just landed: squashed too. */
export function furbySquash(f: Furby) {
	if (f.state !== 'hopping' && f.state !== 'dazed') return 0
	if (!f.grounded) return 0
	if (f.landed < 6) return 0.25 * (1 - f.landed / 6)
	if (f.state === 'hopping' && f.timer < 6) return 0.15
	return 0
}
