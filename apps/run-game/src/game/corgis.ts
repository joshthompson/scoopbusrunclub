import { rideLook } from '../draw/rideLook'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import {
	CORGI_CALL,
	CORGI_POINTS,
	CORGI_RIDE_TICKS,
	GRAVITY,
	HITBOX_HALF_WIDTH,
	VIEW_HEIGHT,
} from './constants'
import { SCOOP_HEARD } from './pack'
import { scored } from './step'
import type { Racer, World } from './world'

/**
 * Furby Fields' corgis: sat on the path, barking for someone to hop on. Land
 * on one's back and you ride it a few seconds, galloping, over everything in
 * the way (see `stepRunner` and `collide`). Jump to get off early.
 */

/** Landing this far into its back still counts as on it. */
const BACK_GIVE = 8
/** And this far either side of the middle of it. */
const backReach = (width: number) => width / 2 + HITBOX_HALF_WIDTH - 4

export function stepCorgis(world: World) {
	const { corgis, terrain } = world
	if (!corgis.length) return
	const running = world.phase() === 'running'
	const racing = world.racers.filter((r) => !r.out)

	for (const c of corgis) {
		if (c.state === 'scooped') {
			if (c.feetY > VIEW_HEIGHT + 300) continue
			c.x += c.vx
			c.vy += GRAVITY
			c.feetY += c.vy
			c.spin++
			continue
		}
		if (c.state === 'ridden') {
			const rider = world.racers.find((r) => r.id === c.rider)
			// Off: worn out, jumped off, or scooped.
			if (!rider || rider.body.mount === 0 || !running || rider.out) {
				c.state = 'tired'
				c.rider = undefined
			} else {
				c.x = rider.body.x
				c.facing = rider.body.facing
			}
		}
		c.feetY = terrain.groundY(c.x)
		// Barking at whoever's nearest.
		let dx = Number.POSITIVE_INFINITY
		for (const r of racing)
			if (Math.abs(r.body.x - c.x) < Math.abs(dx)) dx = r.body.x - c.x
		c.barking = running && c.state === 'waiting' && Math.abs(dx) < CORGI_CALL
		// Watching you come, and go.
		if (c.barking) c.facing = dx >= 0 ? 1 : -1
	}

	if (!running) return
	for (const racer of racing) if (racer.body.mount === 0) mount(world, racer)
}

/** Coming down on a waiting corgi's back: on it, and off you go. */
function mount(world: World, racer: Racer) {
	const b = racer.body
	if (b.grounded || b.vy <= 0) return
	/** Where their feet were last tick. */
	const was = b.feetY - b.vy

	const ride = rideLook(world.course)
	for (const c of world.corgis) {
		if (c.state !== 'waiting') continue
		if (Math.abs(b.x - c.x) > backReach(ride.width)) continue
		const back = c.feetY - ride.back + BACK_GIVE
		if (was > back || b.feetY < back) continue

		c.state = 'ridden'
		c.rider = racer.id
		c.barking = false
		b.mount = CORGI_RIDE_TICKS
		collect(`ride:${world.course.ride ?? 'corgi'}`)
		b.combo = 0
		// Sat on its back: its feet are theirs now.
		b.x = c.x
		b.feetY = world.terrain.groundY(b.x)
		b.vy = 0
		b.grounded = true
		b.stumble = 0
		b.facing = 1
		world.addBonus('corgis', CORGI_POINTS)
		world.popup(scored(world, 'Giddy up!', `+${CORGI_POINTS}`), b.x, back - 40)
		play(ride.sound)
		return
	}
}

/** Whichever corgis the bus has caught up with go flying, the same as anyone. */
export function scoopCorgis(world: World) {
	const { bus } = world
	const camera = world.camera()
	const { width } = rideLook(world.course)
	for (const c of world.corgis) {
		if (c.state === 'scooped' || bus.frontX < c.x - width / 2) continue
		c.state = 'scooped'
		c.vx = Math.max(bus.speed, 2) + 2 + Math.random() * 2
		c.vy = -12 - Math.random() * 3
		c.spin = 0
		bus.scooping = 10
		if (c.x > camera - SCOOP_HEARD && c.x < camera + world.viewWidth())
			play('whoosh')
	}
}
