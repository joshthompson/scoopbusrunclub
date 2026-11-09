import { isHeld } from '../input'
import { play } from '../sfx'
import {
	AIR_PUSH,
	BUS_HOLD_TICKS,
	BUS_MAX_GAP,
	BUS_RAMP_TICKS,
	BUS_START_SPEED,
	BUS_TOP_SPEED,
	CAMERA_LEAD,
	CAMERA_TURN,
	CHEER_BOOST,
	CHEER_POINTS,
	COAST_KEEP,
	CORGI_GALLOP,
	CORGI_GRIP,
	COUNTDOWN_STEP_TICKS,
	DUCK_HEIGHT,
	FIKA_BOOST,
	FIKA_POINTS,
	GRAVITY,
	HAZARD_POINTS,
	HILL_PULL,
	HITBOX_HALF_WIDTH,
	JUMP_SPEED,
	MAX_SPEED,
	MUD_TOP_SPEED,
	PX_PER_M,
	RUN_GRIP,
	RUN_TOP_SPEED,
	SLIDE_KEEP,
	STAND_HEIGHT,
	START_X,
	STUMBLE_SPEED,
	STUMBLE_TICKS,
	VIEW_WIDTH,
} from './constants'
import { scoopCorgis, stepCorgis } from './corgis'
import { FIKA_ART } from './fika'
import { scoopFurbies, stepFurbies } from './furbies'
import { scoopPack, stepPack } from './pack'
import type { World } from './world'

/** How long a popup stays up. */
export const POPUP_TICKS = 45
/** How long a cheerer's bubble stays up. */
const CHEER_TICKS = 70
/** Speed bleeds back down to top speed this much slower than it builds, so a boost lasts. */
const OVERSPEED_GRIP = 0.008
/** Running on over the finish line, and off the right of the screen. */
const RUN_OFF_SPEED = 6
/** How far past the right of the screen they get before the summary comes up. */
const RUN_OFF_PAST = 60
/** How long the runner flies after being scooped before the result shows. */
const SCOOPED_TICKS = 70

/**
 * One tick of the whole game, in order: the phase, the runner, everyone else,
 * the furbies and corgis, what they hit, the bus, the camera.
 */
export function stepWorld(world: World) {
	world.setTicks(world.ticks() + 1)
	stepPhase(world)
	stepRunner(world)
	stepPack(world)
	stepFurbies(world)
	stepCorgis(world)
	collide(world)
	stepBus(world)
	stepCamera(world)

	// Not while flying out of the scoop: how far they got is where it got them.
	if (world.phase() !== 'scooped') world.setPlayerX(world.body.x)
	// A point a metre, for the furthest they've got round.
	const metres = Math.floor(
		Math.min(world.terrain.length, world.playerX() - START_X) / PX_PER_M,
	)
	if (metres > world.metres()) world.setMetres(metres)
	world.setBusX(world.bus.frontX)
	const now = world.ticks()
	if (world.popups().some((p) => now - p.born > POPUP_TICKS))
		world.setPopups((all) => all.filter((p) => now - p.born <= POPUP_TICKS))
}

function stepPhase(world: World) {
	const phase = world.phase()
	if (phase === 'countdown') {
		// A beep for each of "3", "2", "1", then a higher one for "Go!".
		if ((world.ticks() - 1) % COUNTDOWN_STEP_TICKS === 0) play('count')
		if (world.ticks() >= COUNTDOWN_STEP_TICKS * 3) {
			world.setPhase('running')
			play('go')
		}
		return
	}
	if (phase === 'running') {
		world.setRaceTicks(world.raceTicks() + 1)
		if (world.body.x >= world.terrain.finishX) {
			world.setPhase('finished')
			play('finished')
			world.finish.busGap = world.body.x - world.bus.frontX
		}
		return
	}
	// Over the line: the summary once they've run off the screen.
	if (
		phase === 'finished' &&
		!world.result() &&
		world.body.x > world.camera() + VIEW_WIDTH + RUN_OFF_PAST
	)
		world.setResult({
			kind: 'finished',
			distance: world.terrain.length,
			busGap: world.finish.busGap,
		})
	if (phase === 'scooped' && !world.result()) {
		world.body.spin += 1
		if (world.body.spin > SCOOPED_TICKS)
			world.setResult({
				kind: 'scooped',
				distance: Math.max(0, world.playerX() - START_X),
				busGap: 0,
			})
	}
}

/** The countdown's word, if one's being said: "3", "2", "1", then "Go!" for a moment after. */
export function countdownWord(world: World) {
	const step = Math.floor(world.ticks() / COUNTDOWN_STEP_TICKS)
	return ['3', '2', '1', 'Go!'][step]
}

function stepRunner(world: World) {
	const { body: b, terrain } = world
	const phase = world.phase()

	if (phase === 'scooped') {
		b.x += b.vx
		b.feetY += b.vy
		b.vy += GRAVITY
		return
	}

	// On the start line until "Go!": Haga climbs from the start, and the hill
	// would otherwise pull them back down it.
	if (phase === 'countdown') return

	const racing = phase === 'running'
	const finished = phase === 'finished'
	const right = racing && isHeld('right')
	const left = racing && isHeld('left')
	const up = racing && isHeld('up')
	const down = racing && isHeld('down')
	if (!racing) b.mount = 0

	if (b.grounded) {
		const slope = terrain.slope(b.x)
		b.ducking = down
		if (b.stumble > 0) b.stumble--
		const canDrive = b.stumble === 0

		if (b.mount > 0) {
			// On a corgi: galloping on, whatever's held.
			b.mount--
			b.ducking = false
			b.facing = 1
			b.vx += (CORGI_GALLOP - b.vx) * CORGI_GRIP
		} else if (b.ducking) {
			// A slide: hardly slows on the flat, and gathers speed downhill.
			b.vx *= SLIDE_KEEP
			b.vx += slope * HILL_PULL * (slope > 0 ? 2 : 1)
		} else {
			const top = b.muddy ? MUD_TOP_SPEED : RUN_TOP_SPEED
			// Holding both is standing still.
			const drive = canDrive ? Number(right) - Number(left) : 0
			if (finished) b.vx += (RUN_OFF_SPEED - b.vx) * RUN_GRIP * 2
			else if (drive) {
				const target = drive * top
				// Boosted past top speed the way they're going: let it last.
				const boosted = b.vx * drive > top
				b.vx += (target - b.vx) * (boosted ? OVERSPEED_GRIP : RUN_GRIP)
			} else b.vx *= COAST_KEEP
			b.vx += slope * HILL_PULL
			if (b.muddy && Math.abs(b.vx) > MUD_TOP_SPEED) b.vx *= 0.93
		}

		if (up && !b.wasUp) {
			// Jumping off a corgi, if on one.
			b.mount = 0
			b.vy = -JUMP_SPEED
			play('jump')
			b.grounded = false
			b.ducking = false
		}
	} else {
		b.vy += GRAVITY
		if (right) b.vx += AIR_PUSH
		if (left) b.vx -= AIR_PUSH
	}
	b.wasUp = up
	if (b.vx > 0.5) b.facing = 1
	else if (b.vx < -0.5) b.facing = -1

	b.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, b.vx))
	// The bus is in the way long before this, but the ground runs out here.
	b.x = Math.max(LEFT_EDGE, b.x + b.vx)

	const ground = terrain.groundY(b.x)
	if (b.grounded) b.feetY = ground
	else {
		b.feetY += b.vy
		if (b.feetY >= ground && b.vy >= 0) {
			b.feetY = ground
			b.vy = 0
			b.grounded = true
		}
	}
}

/** As far back as the ground goes (see `Ground`). */
const LEFT_EDGE = START_X - 1300

/** `speed` faster the way they're going, up to `MAX_SPEED`. */
export function boost(vx: number, facing: 1 | -1, speed: number) {
	const along = Math.max(0, vx * facing)
	return facing * Math.min(MAX_SPEED, along + speed)
}

/** What the runner's run into this tick, and what it does to them. */
function collide(world: World) {
	const { body: b, terrain } = world
	if (world.phase() !== 'running') return

	const left = b.x - HITBOX_HALF_WIDTH
	const right = b.x + HITBOX_HALF_WIDTH
	const bottom = b.feetY
	const top = b.feetY - (b.ducking ? DUCK_HEIGHT : STAND_HEIGHT)
	/** Where they were last tick. */
	const wasAt = b.x - b.vx
	const overlaps = (x0: number, x1: number, y0: number, y1: number) =>
		right > x0 && left < x1 && bottom > y0 && top < y1

	const stumble = (word: string) => {
		play('stumble')
		b.stumble = STUMBLE_TICKS
		b.vx = Math.sign(b.vx) * Math.min(Math.abs(b.vx), STUMBLE_SPEED)
		world.addBonus('hazards', -HAZARD_POINTS)
		world.popup(`${word} -${HAZARD_POINTS}`, b.x, top)
	}

	b.muddy = false
	/** On a corgi, over rocks, under branches and through the mud. */
	const riding = b.mount > 0
	for (const state of world.obstacles) {
		const o = state.obstacle
		// Only what's near enough to touch.
		if (Math.abs(o.x - b.x) > 200) continue
		if (
			riding &&
			(o.kind === 'rock' || o.kind === 'branch' || o.kind === 'mud')
		)
			continue
		const ground = terrain.groundY(o.x)

		switch (o.kind) {
			case 'rock':
				if (
					!state.used &&
					b.stumble === 0 &&
					overlaps(o.x - 20, o.x + 20, ground - 22, ground)
				) {
					state.used = true
					stumble('Ouch!')
				}
				break
			case 'branch':
				if (
					!state.used &&
					b.stumble === 0 &&
					overlaps(o.x - 30, o.x + 30, ground - 90, ground - 34)
				) {
					state.used = true
					stumble('Bonk!')
				}
				break
			case 'mud':
				if (b.grounded && Math.abs(b.x - o.x) < o.width / 2) {
					if (!b.muddy && !state.used) {
						state.used = true
						world.addBonus('hazards', -HAZARD_POINTS)
						world.popup(`Squelch! -${HAZARD_POINTS}`, b.x, top)
						play('squelch')
					}
					b.muddy = true
				}
				break
			case 'fika': {
				const { width, height } = FIKA_ART[o.item]
				const y = ground - o.height
				// A little bigger than the art, so grabbing it isn't fiddly.
				const reach = width / 2 + 4
				if (
					!state.used &&
					overlaps(o.x - reach, o.x + reach, y - height - 2, y)
				) {
					state.used = true
					b.vx = boost(b.vx, b.facing, FIKA_BOOST)
					world.addBonus('fika', FIKA_POINTS)
					world.popup(`Fika! +${FIKA_POINTS}`, b.x, top)
					play('fika')
				}
				break
			}
			case 'cheer':
				// Passing them, either way.
				if (
					!state.used &&
					b.x - o.x !== 0 &&
					b.x - o.x > 0 !== wasAt - o.x > 0
				) {
					state.used = true
					state.setCheering(CHEER_TICKS)
					play('cheer')
					b.vx = boost(b.vx, b.facing, CHEER_BOOST)
					world.addBonus('cheers', CHEER_POINTS)
					world.popup(`+${CHEER_POINTS}`, b.x, top)
				}
				break
		}
	}

	for (const state of world.obstacles)
		if (state.cheering() > 0) state.setCheering(state.cheering() - 1)
}

function stepBus(world: World) {
	const { bus, body } = world
	const phase = world.phase()
	if (bus.scooping > 0) bus.scooping--

	if (phase === 'countdown') return

	// Parked until a moment after "Go!", but run back into it and it'll still scoop.
	const driving = world.raceTicks() - BUS_HOLD_TICKS
	if (driving >= 0) {
		if (phase === 'finished') bus.speed *= 0.97
		else {
			const ramp = Math.min(1, driving / BUS_RAMP_TICKS)
			bus.speed = BUS_START_SPEED + (BUS_TOP_SPEED - BUS_START_SPEED) * ramp
		}
		bus.frontX += bus.speed
	}
	scoopPack(world)
	scoopFurbies(world)
	scoopCorgis(world)

	if (phase !== 'running') return
	// Never too far behind, however far ahead the runner gets.
	if (body.x - bus.frontX > BUS_MAX_GAP) bus.frontX = body.x - BUS_MAX_GAP

	if (bus.frontX >= body.x - HITBOX_HALF_WIDTH) {
		bus.scooping = 10
		body.mount = 0
		body.grounded = false
		body.ducking = false
		body.vx = Math.max(bus.speed, 2) + 2
		body.vy = -15
		body.spin = 0
		world.setPhase('scooped')
		play('scooped')
		world.popup(`Scooped ${world.runner.name}!`, body.x, body.feetY - 80)
	}
}

function stepCamera(world: World) {
	// Left where it is: to watch them fly off, or run off.
	if (world.phase() === 'scooped' || world.phase() === 'finished') return
	// More of the screen ahead, whichever way they're running.
	const lead = world.body.facing === 1 ? CAMERA_LEAD : 1 - CAMERA_LEAD
	world.view.lead += (lead - world.view.lead) * CAMERA_TURN
	const target = Math.max(
		LEFT_EDGE - VIEW_WIDTH * CAMERA_LEAD,
		Math.min(
			world.terrain.finishX + 500 - VIEW_WIDTH,
			world.body.x - VIEW_WIDTH * world.view.lead,
		),
	)
	const camera = world.camera()
	world.setCamera(camera + (target - camera) * 0.25)
}
