import { rideLook } from '../draw/rideLook'
import { LINK_ID } from '../runners/playable'
import { collect } from '../saved/collected'
import { unlockRunner } from '../saved/unlocked'
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
import { platformAt } from './platforms'
import { sagOf } from './ropeBridge'
import { grabBoard, grabPacerBoard } from './skis'
import { scored } from './step'
import type { Racer, World } from './world'

/**
 * Kristineberg's corgis: sat on the track, barking for someone to hop on. Land
 * on one's back and you ride it a few seconds, galloping, over everything in
 * the way (see `stepRunner` and `collide`). Jump and it leaps, with you on
 * it; duck to get off early. Every course's Rides, llamas, camels, deer and
 * Gamla Stan's horses too; and on The Cliff, its gliders (see `gliders`).
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
/** A spent Ride stays on a Platform whose top it's no more than this far under: a rope bridge springs back up past its feet. */
const PERCH_GIVE = 40

/**
 * What a spent Ride, at `x` with its feet at `feetY`, is on or above, if
 * it's on a Platform: the top of the highest one that's under it (its rope
 * bridge sagged where it is), or level with it. A Platform broken, or a
 * shelf of rock it's inside, doesn't hold it.
 */
function perchAt(world: World, x: number, feetY: number) {
	const ticks = world.ticks()
	let best: number | undefined
	world.platforms.forEach((platform, index) => {
		if (platform.broken) return
		const at = platformAt(world.terrain, platform, ticks)
		if (x < at.left || x > at.right) return
		const top = at.top + sagOf(world.ropeBridges, index, x)
		if (feetY > top + (platform.solid && !platform.rope ? 1 : PERCH_GIVE))
			return
		if (best === undefined || top < best) best = top
	})
	return best
}

export function stepCorgis(world: World) {
	const { corgis, terrain } = world
	if (!corgis.length) return
	const running = world.phase() === 'running'
	const racing = world.racers.filter((r) => !r.out)
	const gliders = world.course.ride === 'glider'
	/** Skis and snowboards: once taken, theirs the whole way down, drawn on them. */
	const skis = world.course.ride === 'skis'
	/** A trick its Rides do, jumped: a skateboard's kickflip; and what they call out, if anything. */
	const { trick, call } = rideLook(world.course)

	for (const c of corgis) {
		if (c.state === 'scooped') {
			if (c.feetY > VIEW_HEIGHT + 300) continue
			c.x += c.vx
			c.vy += GRAVITY
			c.feetY += c.vy
			c.spin++
			continue
		}
		if (c.state === 'ridden' && skis) continue
		if (c.state === 'ridden') {
			const rider = riderOf(world, c.rider)
			// Off: worn out, jumped off, or scooped; a glider, come down.
			if (!rider || !rider.on || (!gliders && !running) || rider.out) {
				c.rider = undefined
				c.vy = 0
				c.adrift = 0
				c.state = 'tired'
				// Crashed into the sea, or fallen down a Gap: it goes down with them.
				if (rider?.crashed) {
					c.state = 'scooped'
					c.vx = 2
					c.vy = 1
					c.spin = 0
				}
			} else {
				c.x = rider.x
				c.facing = rider.facing
				// Up off the ground with them: a skateboard's kickflip.
				if (trick && !c.aloft && !rider.grounded) {
					world.popup(trick.word, rider.x, rider.feetY - 70)
					play('trick')
				}
				c.aloft = !rider.grounded
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
		// Got off on a Platform (a rope bridge over a Gap, a terrace): it
		// stays there, riderless, rather than going down with the ground.
		const perch = c.state === 'tired' ? perchAt(world, c.x, c.feetY) : undefined
		// Got off over a Gap: down it, and gone.
		if (c.state === 'tired' && perch === undefined && terrain.inGap(c.x)) {
			c.state = 'scooped'
			c.vx = 1
			c.vy = Math.max(0, c.vy)
			c.spin = 0
			continue
		}
		// The highest of what's under it: the Platform, or the Ground, if it's not a Gap.
		const ground = Math.min(
			perch ?? Number.POSITIVE_INFINITY,
			c.state === 'tired' && terrain.inGap(c.x)
				? Number.POSITIVE_INFINITY
				: terrain.groundY(c.x),
		)
		// Got off in the air: down, onto its feet.
		if (c.state === 'tired' && c.feetY < ground) {
			c.vy += GRAVITY
			c.feetY = Math.min(ground, c.feetY + c.vy)
			if (c.feetY === ground) c.vy = 0
		} else c.feetY = ground - (c.state === 'waiting' ? (c.up ?? 0) : 0)
		// Barking at whoever's nearest. Gliders don't.
		let dx = Number.POSITIVE_INFINITY
		for (const r of racing)
			if (Math.abs(r.body.x - c.x) < Math.abs(dx)) dx = r.body.x - c.x
		c.barking =
			!gliders &&
			!skis &&
			!!call &&
			running &&
			c.state === 'waiting' &&
			Math.abs(dx) < CORGI_CALL
		// Watching you come, and go.
		if (c.barking) c.facing = dx >= 0 ? 1 : -1
	}

	if (!running) return
	for (const racer of racing) {
		if (gliders) grabGlider(world, racer)
		else if (skis) grabBoard(world, racer)
		else if (racer.body.mount === 0) mount(world, racer)
	}
	if (skis)
		for (const pacer of world.pack)
			if (!pacer.scooped) grabPacerBoard(world, pacer)
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
			grounded: b.grounded,
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
		grounded: pacer.grounded,
		out: pacer.scooped,
		crashed: false,
	}
}

/**
 * Coming down on a waiting corgi's back: on it, and off you go. A mole,
 * down in a tunnel with no room to jump onto it, you just run into.
 */
function mount(world: World, racer: Racer) {
	const b = racer.body
	const ride = rideLook(world.course)
	const runInto = !!ride.runInto
	if (!runInto && (b.grounded || b.vy <= 0)) return
	/** Where their feet were last tick. */
	const was = b.feetY - b.vy

	for (const c of world.corgis) {
		if (c.state !== 'waiting') continue
		if (Math.abs(b.x - c.x) > backReach(ride.width)) continue
		const back = c.feetY - ride.back + BACK_GIVE
		// Run into, it's from beside it, level with it: not from under its ledge.
		if (
			runInto
				? b.feetY < back || b.feetY > c.feetY + BACK_GIVE
				: was > back || b.feetY < back
		)
			continue

		c.state = 'ridden'
		c.rider = racer.id
		c.barking = false
		b.mount = ride.ticks ?? CORGI_RIDE_TICKS
		// Got on in a hat: for a special goal (Huddinge's, in antlers).
		if (b.hat) b.rodeWearing = [...(b.rodeWearing ?? []), b.hat.kind]
		const kind =
			c.rare && ride.rare ? ride.rare.kind : (world.course.ride ?? 'corgi')
		collect(`ride:${kind}`)
		b.combo = 0
		// Sat on its back: its feet are theirs now.
		b.x = c.x
		b.feetY = c.feetY
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
		if (kind === 'corgi') rodeCorgi(world, racer)
		return
	}
}

/** The first corgi ever ridden: Link, the club's dog, is theirs to run as. */
function rodeCorgi(world: World, racer: Racer) {
	const b = racer.body
	if (!unlockRunner(LINK_ID)) return
	b.unlocked = LINK_ID
	play('cheer')
	world.popup('Link unlocked!', b.x, b.feetY - 110)
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
