import { flyerLook } from '../draw/flyerLook'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import {
	GOOSE_ALTITUDES,
	GOOSE_CARRY_TICKS,
	GOOSE_FLY_SPEED,
	GOOSE_POINTS,
	HITBOX_HALF_WIDTH,
	PATH_BACK,
	RUNNER_SCALE,
	STAND_HEIGHT,
} from './constants'
import { scored } from './step'
import { TOWER_DOOR, TOWER_HEIGHT, TOWER_MERLON, towerSpan } from './towers'
import type { Flyer, Racer, World } from './world'

/**
 * Geese flying over Haga: a few at a time, from behind, faster than anyone
 * runs, low enough to jump into. Jump into one and it grabs you and carries
 * you on, up in the air, over everything, for a while (see `stepRunner`).
 */

/** How far apart a flock flies, along and up. */
const FLOCK_GAP = 52
/** Where a flock comes in: just off the left of the screen. */
const ENTER_BEHIND = 70
/** How quickly one climbs away, having let go. */
const CLIMB = 0.06
/** Gone, this far off the right of the screen, or this high. */
const GONE_AHEAD = 300
const GONE_ABOVE = -900

/** How far ahead, and back for its tail, a flyer keeps above the ground: up steps before it gets to them. */
const GROUND_AHEAD = 160
const GROUND_BEHIND = 60
/** How far ahead it sees a tower coming, to be up over it in time. */
const TOWER_AHEAD = 600
const TOWER_BEHIND = 120
/** How much room it leaves over a tower's battlements. */
const ROOF_ROOM = 24
/** How quickly it glides up or down to its height, of the way there each tick... */
const GLIDE = 0.08
/** ...but never steeper than this, in pixels a tick: a glide, not a leap. */
export const GLIDE_MAX = 6

/** A tick's glide from `from` towards `to`. */
export const glide = (from: number, to: number, rate = GLIDE) =>
	Math.max(-GLIDE_MAX, Math.min(GLIDE_MAX, (to - from) * rate))

/** How far before a tower a flyer's down at its doorway, and after it, before climbing back up. */
const DOOR_AHEAD = 260
const DOOR_AFTER = 40

/**
 * The tower a flyer at `x` is going through, if it's anywhere near one:
 * from a little before its nose reaches the doorway until its tail's out
 * the far side.
 */
function towerAt(world: World, x: number, ahead = DOOR_AHEAD) {
	const half = flyerLook(world.course).width / 2
	return world.course.towers?.find((t) => {
		const { left, right } = towerSpan(t)
		return x + half > left - ahead && x - half < right + DOOR_AFTER
	})
}

/**
 * Where a flyer with no one on it flies: through a guard tower's doorway,
 * as runners go, down in the middle of it, or at its own height over the
 * ground.
 */
function cruiseHeight(world: World, goose: Flyer) {
	const tower = towerAt(world, goose.x)
	if (tower === undefined)
		return flightFloor(world, goose.x, false) - goose.altitude
	const { height } = flyerLook(world.course)
	return world.terrain.groundY(tower) - (TOWER_DOOR - height) / 2
}

/**
 * What a flyer at `x` has to keep above: the highest the ground gets just
 * round it, or (`overTowers`, carrying someone) a guard tower's
 * battlements, all of it, back to front, from further off. Over it, it
 * never goes through anything, and never jumps up or down a step: it
 * glides there.
 */
export function flightFloor(world: World, x: number, overTowers = true) {
	const { terrain } = world
	let floor = Number.POSITIVE_INFINITY
	for (let at = x - GROUND_BEHIND; at <= x + GROUND_AHEAD; at += 20)
		floor = Math.min(floor, terrain.groundY(at))
	if (!overTowers) return floor
	for (const t of world.course.towers ?? []) {
		const { left, right } = towerSpan(t)
		if (right < x - TOWER_BEHIND || left > x + TOWER_AHEAD) continue
		const roof =
			terrain.groundY(t) - PATH_BACK - TOWER_HEIGHT - TOWER_MERLON - ROOF_ROOM
		floor = Math.min(floor, roof)
	}
	return floor
}

export function stepFlyers(world: World) {
	const { flyers, terrain } = world
	const flyovers = world.course.flyovers ?? []
	const running = world.phase() === 'running'
	const racing = world.racers.filter((r) => !r.out)

	// The next flock, once whoever's in front gets to it.
	const next = flyovers[world.flyerState.next]
	if (running && next && racing.length) {
		const leader = Math.max(...racing.map((r) => r.body.x))
		if (leader >= next.x) {
			world.flyerState.next++
			for (let i = 0; i < next.count; i++) {
				const x = world.camera() - ENTER_BEHIND - i * FLOCK_GAP
				const altitude = GOOSE_ALTITUDES[i % GOOSE_ALTITUDES.length]
				const cruise = flightFloor(world, x, false) - altitude
				flyers.push({
					id: world.flyerState.nextId++,
					x,
					feetY: cruise,
					cruise,
					altitude,
					vy: 0,
					state: 'flying',
				})
			}
			// Heard coming, from behind.
			play(flyerLook(world.course).sound)
		}
	}

	for (const goose of flyers) {
		if (goose.state === 'carrying') {
			const rider = world.racers.find((r) => r.id === goose.rider)
			if (!rider || rider.body.carried === 0 || rider.out) {
				goose.state = 'leaving'
				goose.rider = undefined
				goose.vy = -1
			} else {
				const b = rider.body
				const look = flyerLook(world.course)
				if (look.seat) {
					// Sat on its back, at its seat: it ripples along under them,
					// its back there always under their feet. Its ripple's as it's
					// drawn, `now` ticks in.
					const now = world.ticks() + goose.id * 3
					goose.x = b.x - look.seat.ahead
					goose.feetY = b.feetY + look.seat.back(now)
				} else {
					// Hanging on underneath it, arms up.
					goose.x = b.x
					goose.feetY =
						b.feetY - rider.runner.sprite.height * RUNNER_SCALE + look.grip
				}
				continue
			}
		}
		goose.x += GOOSE_FLY_SPEED
		if (goose.state === 'leaving') {
			goose.vy -= CLIMB
			goose.feetY += goose.vy
		} else {
			// Gliding along over the lie of the land, bobbing as it flaps.
			goose.cruise += glide(goose.cruise, cruiseHeight(world, goose))
			goose.feetY =
				goose.cruise + Math.sin((world.ticks() + goose.id * 9) / 6) * 2
		}
	}

	const right = world.camera() + world.viewWidth() + GONE_AHEAD
	for (let i = flyers.length - 1; i >= 0; i--) {
		const goose = flyers[i]
		if (
			goose.state !== 'carrying' &&
			(goose.x > right || goose.feetY < GONE_ABOVE)
		)
			flyers.splice(i, 1)
	}

	if (!running) return
	for (const racer of racing)
		if (racer.body.carried === 0 && racer.body.mount === 0) grab(world, racer)
}

/** Jumping into a goose: it grabs you, and off you go. */
function grab(world: World, racer: Racer) {
	const b = racer.body
	if (b.grounded) return
	const top = b.feetY - STAND_HEIGHT
	const look = flyerLook(world.course)
	const reach = look.width / 2 + HITBOX_HALF_WIDTH
	for (const goose of world.flyers) {
		if (goose.state !== 'flying') continue
		if (Math.abs(b.x - goose.x) > reach) continue
		// Not in a tower's doorway: there's no flying up out of it.
		if (towerAt(world, goose.x, 0) !== undefined) continue
		// Their head, or their hands above it, up into it.
		if (top > goose.feetY + 6 || b.feetY < goose.feetY - look.height) continue

		goose.state = 'carrying'
		goose.rider = racer.id
		b.carried = GOOSE_CARRY_TICKS
		collect(`ride:${world.course.flyer ?? 'goose'}`)
		b.combo = 0
		b.stumble = 0
		b.facing = 1
		b.ducking = false
		world.addBonus('geese', GOOSE_POINTS)
		world.popup(
			scored(world, look.word, `+${GOOSE_POINTS}`),
			b.x,
			goose.feetY - look.height - 10,
		)
		play(look.sound)
		return
	}
}
