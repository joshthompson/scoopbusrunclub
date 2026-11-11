import { rideLook } from '../draw/rideLook'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { PICKUP_WORD } from './collectables'
import {
	CORGI_CALL,
	CORGI_POINTS,
	CORGI_RIDE_TICKS,
	GRAVITY,
	HITBOX_HALF_WIDTH,
	RUNNER_SCALE,
	VIEW_HEIGHT,
} from './constants'
import { grabGlider, grabPacerGlider, pacerRider } from './gliders'
import { SCOOP_HEARD } from './pack'
import { scored } from './step'
import type { Racer, World } from './world'

/**
 * Gamla Stan's corgis: sat on the path, barking for someone to hop on. Land
 * on one's back and you ride it a few seconds, galloping, over everything in
 * the way (see `stepRunner` and `collide`). Jump and it leaps, with you on
 * it; duck to get off early. Every course's Rides, llamas, camels and deer
 * too; and on The Cliff, its gliders (see `gliders`).
 */

/** Landing this far into its back still counts as on it. */
const BACK_GIVE = 8
/** And this far either side of the middle of it. */
const backReach = (width: number) => width / 2 + HITBOX_HALF_WIDTH - 4
/**
 * Where a glider is over whoever's riding it, lying along under its wing:
 * its bar this far ahead of their middle, under their shoulders, and this
 * far down from it.
 */
const GLIDER_AHEAD = 12
const GLIDER_BAR_DOWN = 14
/** A glider that's come down with no one on it: flying on, and how long before it's gone. */
const ADRIFT_SPEED = 6
const ADRIFT_CLIMB = 1.2
const ADRIFT_TICKS = 400

export function stepCorgis(world: World) {
	const { corgis, terrain } = world
	if (!corgis.length) return
	const running = world.phase() === 'running'
	const racing = world.racers.filter((r) => !r.out)
	const gliders = world.course.ride === 'glider'

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
			const rider = riderOf(world, c.rider)
			// Off: worn out, jumped off, or scooped; a glider, come down.
			if (!rider || !rider.on || (!gliders && !running) || rider.out) {
				c.rider = undefined
				c.vy = 0
				c.adrift = 0
				c.state = 'tired'
				// Crashed into the sea: it goes down with them.
				if (gliders && rider?.crashed) {
					c.state = 'scooped'
					c.vx = 2
					c.vy = 1
					c.spin = 0
				}
			} else {
				c.x = rider.x
				c.facing = rider.facing
				// Its feet are theirs, up off the ground in a leap too; a
				// glider over them, lying under it, its bar in their hands.
				if (gliders) {
					c.x += GLIDER_AHEAD
					c.feetY = rider.feetY - rider.height / 2 + GLIDER_BAR_DOWN
				} else c.feetY = rider.feetY
				continue
			}
		}
		if (c.state === 'tired' && gliders) {
			// Come down with no one on it: on, and up, and away.
			if ((c.adrift ?? 0) < ADRIFT_TICKS) {
				c.adrift = (c.adrift ?? 0) + 1
				c.x += ADRIFT_SPEED
				c.feetY -= ADRIFT_CLIMB
			}
			continue
		}
		const ground = terrain.groundY(c.x)
		// Got off in the air: down, onto its feet.
		if (c.state === 'tired' && c.feetY < ground) {
			c.vy += GRAVITY
			c.feetY = Math.min(ground, c.feetY + c.vy)
		} else c.feetY = ground
		// Barking at whoever's nearest. Gliders don't.
		let dx = Number.POSITIVE_INFINITY
		for (const r of racing)
			if (Math.abs(r.body.x - c.x) < Math.abs(dx)) dx = r.body.x - c.x
		c.barking =
			!gliders && running && c.state === 'waiting' && Math.abs(dx) < CORGI_CALL
		// Watching you come, and go.
		if (c.barking) c.facing = dx >= 0 ? 1 : -1
	}

	if (!running) return
	for (const racer of racing) {
		if (gliders) grabGlider(world, racer)
		else if (racer.body.mount === 0) mount(world, racer)
	}
	// The pack takes gliders too, those that get to them.
	if (gliders)
		for (const pacer of world.pack)
			if (!pacer.scooped && !pacer.gliding) grabPacerGlider(world, pacer)
}

/**
 * Whoever's riding a Ride, by their id: a racer's, or one of the pack's
 * (see `pacerRider`), on a glider. Where they are, how tall, whether
 * they're on it still, and whether they're out, crashed into the sea.
 */
function riderOf(world: World, id: string | undefined) {
	if (id === undefined) return undefined
	const racer = world.racers.find((r) => r.id === id)
	if (racer) {
		const b = racer.body
		return {
			x: b.x,
			feetY: b.feetY,
			facing: b.facing,
			height: racer.runner.sprite.height * RUNNER_SCALE,
			on: world.course.ride === 'glider' ? b.gliding : b.mount > 0,
			out: !!racer.out,
			crashed: racer.out === 'fallen',
		}
	}
	const pacer = world.pack.find((p) => pacerRider(p) === id)
	if (!pacer) return undefined
	return {
		x: pacer.x,
		feetY: pacer.feetY,
		facing: 1 as const,
		height: pacer.sprite.height * RUNNER_SCALE,
		on: !!pacer.gliding,
		out: pacer.scooped,
		crashed: false,
	}
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
		const kind =
			c.rare && ride.rare ? ride.rare.kind : (world.course.ride ?? 'corgi')
		collect(`ride:${kind}`)
		b.combo = 0
		// Sat on its back: its feet are theirs now.
		b.x = c.x
		b.feetY = world.terrain.groundY(b.x)
		b.vy = 0
		b.grounded = true
		b.stumble = 0
		b.facing = 1
		world.addBonus('corgis', CORGI_POINTS)
		world.popup(
			scored(world, PICKUP_WORD[`ride:${kind}`], `+${CORGI_POINTS}`),
			b.x,
			back - 40,
		)
		play(ride.sound)
		return
	}
}

/** Whichever corgis the bus has caught up with go flying, the same as anyone. */
export function scoopCorgis(world: World) {
	const { bus } = world
	const camera = world.camera()
	const { width } = rideLook(world.course)
	const gliders = world.course.ride === 'glider'
	for (const c of world.corgis) {
		if (c.state === 'scooped' || bus.frontX < c.x - width / 2) continue
		// Ridden, it goes when its rider does; a glider come down with no one
		// on it is off, up out of reach.
		if (c.state === 'ridden' || (gliders && c.state === 'tired')) continue
		c.state = 'scooped'
		c.vx = Math.max(bus.speed, 2) + 2 + Math.random() * 2
		c.vy = -12 - Math.random() * 3
		c.spin = 0
		bus.scooping = 10
		if (c.x > camera - SCOOP_HEARD && c.x < camera + world.viewWidth())
			play('whoosh')
	}
}
