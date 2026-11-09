import { play } from '../sfx'
import {
	GOOSE_ALTITUDES,
	GOOSE_CARRY_TICKS,
	GOOSE_FLY_SPEED,
	GOOSE_POINTS,
	HITBOX_HALF_WIDTH,
	RUNNER_SCALE,
	STAND_HEIGHT,
} from './constants'
import { FLYING_GOOSE_HEIGHT, FLYING_GOOSE_WIDTH } from './geeseArt'
import { scored } from './step'
import type { Racer, World } from './world'

/**
 * Geese flying over Haga: a few at a time, from behind, faster than anyone
 * runs, low enough to jump into. Jump into one and it grabs you and carries
 * you on, up in the air, over everything, for a while (see `stepRunner`).
 */

/** How far apart a flock flies, along and up. */
const FLOCK_GAP = 52
/** Where a flock comes in: just off the left of the screen. */
const ENTER_BEHIND = 70
/** How far down over the top of someone the goose's feet grip them. */
const GRIP = 10
/** How quickly one climbs away, having let go. */
const CLIMB = 0.06
/** Gone, this far off the right of the screen, or this high. */
const GONE_AHEAD = 300
const GONE_ABOVE = -900

export function stepFlyers(world: World) {
	const { flyers, terrain } = world
	const flyovers = world.level.flyovers ?? []
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
				flyers.push({
					id: world.flyerState.nextId++,
					x,
					feetY: terrain.groundY(x) - altitude,
					altitude,
					vy: 0,
					state: 'flying',
				})
			}
			// Heard coming, from behind.
			play('honk')
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
				// Hanging on underneath it, arms up.
				const b = rider.body
				goose.x = b.x
				goose.feetY = b.feetY - rider.runner.sprite.height * RUNNER_SCALE + GRIP
				continue
			}
		}
		goose.x += GOOSE_FLY_SPEED
		if (goose.state === 'leaving') {
			goose.vy -= CLIMB
			goose.feetY += goose.vy
		} else {
			// Following the lie of the land, bobbing as it flaps.
			goose.feetY =
				terrain.groundY(goose.x) -
				goose.altitude +
				Math.sin((world.ticks() + goose.id * 9) / 6) * 2
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
	const reach = FLYING_GOOSE_WIDTH / 2 + HITBOX_HALF_WIDTH
	for (const goose of world.flyers) {
		if (goose.state !== 'flying') continue
		if (Math.abs(b.x - goose.x) > reach) continue
		// Their head, or their hands above it, up into it.
		if (top > goose.feetY + 6 || b.feetY < goose.feetY - FLYING_GOOSE_HEIGHT)
			continue

		goose.state = 'carrying'
		goose.rider = racer.id
		b.carried = GOOSE_CARRY_TICKS
		b.combo = 0
		b.stumble = 0
		b.facing = 1
		b.ducking = false
		world.addBonus('geese', GOOSE_POINTS)
		world.popup(
			scored(world, 'Honk honk!', `+${GOOSE_POINTS}`),
			b.x,
			goose.feetY - FLYING_GOOSE_HEIGHT - 10,
		)
		play('honk')
		return
	}
}
