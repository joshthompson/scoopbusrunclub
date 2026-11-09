import { play } from '../sfx'
import {
	AIR_PUSH,
	BUS_HOLD_TICKS,
	BUS_LEASH_FULL,
	BUS_LEASH_GROWTH,
	BUS_LEASH_LATE_GROWTH,
	BUS_LEASH_MAX,
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
	START_LEAD,
	START_X,
	STUMBLE_SPEED,
	STUMBLE_TICKS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from './constants'
import { scoopCorgis, stepCorgis } from './corgis'
import { FIKA_ART } from './fika'
import { scoopFurbies, stepFurbies } from './furbies'
import { KIDS_REACH_UP, kidsWidth } from './kidsArt'
import { scoopPack, stepPack } from './pack'
import type { Body, Racer, World } from './world'

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
	for (const racer of world.racers) stepRunner(world, racer)
	stepPack(world)
	stepFurbies(world)
	stepCorgis(world)
	for (const racer of world.racers) collide(world, racer)
	stepBus(world)
	if (world.round) {
		decideRound(world)
		frameEveryone(world)
	} else stepCamera(world)

	// Not while flying out of the scoop: how far they got is where it got them.
	if (world.racers[0].out !== 'scooped') world.setPlayerX(world.body.x)
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
		for (const racer of world.racers) {
			if (racer.out || racer.body.x < world.terrain.finishX) continue
			racer.out = 'finished'
			racer.outAt = world.ticks()
			play('finished')
			if (racer === world.racers[0] && !world.round) {
				world.setPhase('finished')
				world.finish.busGap = racer.body.x - world.bus.frontX
			}
		}
		return
	}
	if (world.round) return
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
	if (phase === 'scooped' && !world.result() && world.body.spin > SCOOPED_TICKS)
		world.setResult({
			kind: 'scooped',
			distance: Math.max(0, world.playerX() - START_X),
			busGap: 0,
		})
}

/**
 * How long the Round's winner runs on, and the last of anyone scooped flies,
 * before the Round's over.
 */
const WINNER_RUN_TICKS = 150

/**
 * A Round's decided once nobody's left running, or only one Player is and
 * nobody's beaten the bus to the line: they've outlasted everyone. In order,
 * then: over the line first, then whoever was still running, then the
 * scooped, the last to go first.
 */
function decideRound(world: World) {
	const { racers } = world
	if (world.phase() !== 'running' || world.order()) return
	const running = racers.filter((r) => !r.out)
	const someoneFinished = racers.some((r) => r.out === 'finished')
	const lastStanding =
		racers.length > 1 && running.length === 1 && !someoneFinished
	if (running.length > 0 && !lastStanding) return

	const rank = (r: Racer) =>
		r.out === 'finished' ? 0 : r.out === 'scooped' ? 2 : 1
	world.setOrder(
		[...racers].sort(
			(a, b) =>
				rank(a) - rank(b) ||
				(a.out === 'finished'
					? a.outAt - b.outAt
					: a.out === 'scooped'
						? b.outAt - a.outAt
						: 0) ||
				b.body.x - a.body.x,
		),
	)
	world.decidedAt = world.ticks()
	world.setPhase('finished')
	if (lastStanding) {
		play('finished')
		world.popup(
			`${running[0].runner.name} wins!`,
			running[0].body.x,
			running[0].body.feetY - 90,
		)
	}
}

/** Whether a decided Round's done with: the winner's run on, and the last scooped landed. */
export function roundOver(world: World) {
	return !!world.order() && world.ticks() - world.decidedAt > WINNER_RUN_TICKS
}

/** The countdown's word, if one's being said: "3", "2", "1", then "Go!" for a moment after. */
export function countdownWord(world: World) {
	const step = Math.floor(world.ticks() / COUNTDOWN_STEP_TICKS)
	return ['3', '2', '1', 'Go!'][step]
}

function stepRunner(world: World, racer: Racer) {
	const { terrain } = world
	const b = racer.body
	const phase = world.phase()

	if (racer.out === 'scooped') {
		b.x += b.vx
		b.feetY += b.vy
		b.vy += GRAVITY
		b.spin += 1
		return
	}

	// On the start line until "Go!": Haga climbs from the start, and the hill
	// would otherwise pull them back down it.
	if (phase === 'countdown') return

	const racing = phase === 'running' && !racer.out
	// Over the line, or the last one standing: running on.
	const finished = !racing
	const held = racing ? racer.controls() : undefined
	const right = !!held?.right
	const left = !!held?.left
	const up = !!held?.up
	const down = !!held?.down
	if (!racing) b.mount = 0
	if (b.stomped > 0) b.stomped--

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

/**
 * A popup's words, with the points on the end, unless it's a Round: nobody
 * scores in one.
 */
export const scored = (world: World, words: string, points: string) =>
	world.round ? words : words ? `${words} ${points}` : points

/** What a racer's run into this tick, and what it does to them. */
function collide(world: World, racer: Racer) {
	const { terrain } = world
	const b = racer.body
	if (world.phase() !== 'running' || racer.out) return

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
		world.popup(scored(world, word, `-${HAZARD_POINTS}`), b.x, top)
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
			(o.kind === 'rock' ||
				o.kind === 'branch' ||
				o.kind === 'mud' ||
				o.kind === 'hurdle' ||
				o.kind === 'pothole' ||
				o.kind === 'kids')
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
			case 'hurdle':
				// Solid all the way down: over it, not under it.
				if (
					!state.used &&
					b.stumble === 0 &&
					overlaps(o.x - 14, o.x + 14, ground - 40, ground)
				) {
					state.used = true
					stumble('Clonk!')
				}
				break
			case 'kids': {
				const half = kidsWidth(o.count) / 2 - 6
				if (
					!state.used &&
					b.stumble === 0 &&
					overlaps(o.x - half, o.x + half, ground - KIDS_REACH_UP, ground)
				) {
					state.used = true
					stumble('Oof!')
				}
				break
			}
			case 'pothole':
				// Only underfoot, a little way in from its edges.
				if (
					!state.used &&
					b.stumble === 0 &&
					b.grounded &&
					Math.abs(b.x - o.x) < o.width / 2 - 4
				) {
					state.used = true
					stumble('Ouch!')
				}
				break
			case 'mud':
				if (b.grounded && Math.abs(b.x - o.x) < o.width / 2) {
					if (!b.muddy && !state.used) {
						state.used = true
						world.addBonus('hazards', -HAZARD_POINTS)
						world.popup(
							scored(world, 'Squelch!', `-${HAZARD_POINTS}`),
							b.x,
							top,
						)
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
					world.popup(scored(world, 'Fika!', `+${FIKA_POINTS}`), b.x, top)
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
					state.cheered = racer.runner.name
					state.setCheering(CHEER_TICKS)
					play('cheer')
					b.vx = boost(b.vx, b.facing, CHEER_BOOST)
					world.addBonus('cheers', CHEER_POINTS)
					world.popup(
						scored(world, world.round ? 'Go!' : '', `+${CHEER_POINTS}`),
						b.x,
						top,
					)
				}
				break
		}
	}
}

function stepBus(world: World) {
	const { bus } = world
	const phase = world.phase()
	if (bus.scooping > 0) bus.scooping--
	// Cheerers' bubbles run down here, once a tick, whoever set them going.
	for (const state of world.obstacles)
		if (state.cheering() > 0) state.setCheering(state.cheering() - 1)

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
	knockOver(world)

	if (phase !== 'running') return
	const running = world.racers.filter((r) => !r.out)
	if (!running.length) return
	// Never more than its leash behind, however far ahead the runner gets:
	// pulled along at the end of it, which lets it out a little. In a Round,
	// it's the leader that pulls it, and anyone that far back is scooped.
	const leader = Math.max(...running.map((r) => r.body.x))
	if (leader - bus.frontX > bus.leash) {
		bus.leash += leashGrowth(bus.leash)
		bus.frontX = leader - bus.leash
	}

	for (const racer of running) {
		const body = racer.body
		if (bus.frontX < body.x - HITBOX_HALF_WIDTH) continue
		scoop(world, racer, body)
	}
}

/** Caught by the bus: flung up out of the scoop, and out. */
function scoop(world: World, racer: Racer, body: Body) {
	const { bus } = world
	bus.scooping = 10
	body.mount = 0
	body.grounded = false
	body.ducking = false
	body.vx = Math.max(bus.speed, 2) + 2
	body.vy = -15
	body.spin = 0
	racer.out = 'scooped'
	racer.outAt = world.ticks()
	if (!world.round) world.setPhase('scooped')
	play('scooped')
	world.popup(`Scooped ${racer.runner.name}!`, body.x, body.feetY - 80)
}

/**
 * What the bus does to what's in the way as its scoop reaches it. Hurdles it
 * knocks over, left lying on the track; rocks and children playing football
 * it scoops up, flying off like anyone else. Either way they're harmless
 * after. Potholes, mud and the rest it just drives over. A hurdle here is the
 * runner's lane's; the rest of the row go over as the scoop reaches them
 * (see the hurdle's sprite).
 */
function knockOver(world: World) {
	const { bus } = world
	for (const state of world.obstacles) {
		const o = state.obstacle
		if (state.scooped || bus.frontX < o.x - 14) continue
		if (o.kind === 'hurdle') state.used = true
		if (o.kind === 'rock' || o.kind === 'kids') {
			state.used = true
			state.scooped = {
				at: world.ticks(),
				vx: Math.max(bus.speed, 2) + 2 + Math.random() * 2,
			}
			bus.scooping = 10
			const camera = world.camera()
			if (o.kind === 'kids' && o.x > camera && o.x < camera + VIEW_WIDTH)
				play('whoosh')
		}
	}
}

/** How fast something scooped is flung up, and how fast it spins, in degrees a tick. */
const SCOOP_FLING = 12
const SCOOP_SPIN = 14

/**
 * Where something scooped up is, `ticks` after: off along the course, up and
 * back down, spinning, from where it was. For drawing it.
 */
export function scoopFlight(scooped: { at: number; vx: number }, now: number) {
	const t = now - scooped.at
	return {
		x: scooped.vx * t,
		y: -SCOOP_FLING * t + (GRAVITY * t * t) / 2,
		spin: t * SCOOP_SPIN,
	}
}

/**
 * How much the leash lets out, a tick, pulled at the end of it: quickly up to
 * `BUS_LEASH_FULL`, then less and less, to nothing at `BUS_LEASH_MAX`.
 */
function leashGrowth(leash: number) {
	if (leash < BUS_LEASH_FULL) return BUS_LEASH_GROWTH
	const left = Math.max(
		0,
		(BUS_LEASH_MAX - leash) / (BUS_LEASH_MAX - BUS_LEASH_FULL),
	)
	return BUS_LEASH_LATE_GROWTH * left * left
}

function stepCamera(world: World) {
	// Left where it is: to watch them fly off, or run off.
	if (world.phase() === 'scooped' || world.phase() === 'finished') return
	// More of the screen ahead, whichever way they're running. Through the
	// countdown, the bus parked behind everyone is in view too.
	const lead =
		world.phase() === 'countdown'
			? START_LEAD
			: world.body.facing === 1
				? CAMERA_LEAD
				: 1 - CAMERA_LEAD
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

/** Room the camera keeps behind the last Player in a Round, for the bus coming, and ahead of the first. */
const ROUND_BEHIND = 220
const ROUND_AHEAD = 420
/** The bus is framed too once it's this near the last Player. */
const BUS_IN_VIEW = 520
/** How far the camera zooms out to keep everyone in, at most. */
export const MAX_ZOOM = 2
/** How quickly it zooms, a share a tick. */
const ZOOM_EASE = 0.04

/**
 * A Round's camera: everyone still running in view, zoomed out up to
 * `MAX_ZOOM` to fit them all, the leader with room ahead. Anyone further
 * back than that, the bus has got (see `BUS_LEASH_MAX`). Through the
 * countdown, the bus parked behind is in too.
 */
function frameEveryone(world: World) {
	const running = world.racers.filter((r) => !r.out)
	// Left where it is once everyone's out: to watch the last of them fly off.
	if (!running.length) return
	const xs = running.map((r) => r.body.x)
	if (world.phase() === 'countdown') xs.push(world.bus.frontX - 80)
	const last = Math.min(...xs)
	// The bus too, once it's closing in on the last of them: they see it coming.
	const back = Math.min(
		last - ROUND_BEHIND,
		Math.max(world.bus.frontX - 80, last - BUS_IN_VIEW),
	)
	const front = Math.max(...xs) + ROUND_AHEAD
	const want = Math.max(1, Math.min(MAX_ZOOM, (front - back) / VIEW_WIDTH))
	const zoom = world.zoom() + (want - world.zoom()) * ZOOM_EASE
	world.setZoom(zoom)
	const width = VIEW_WIDTH * zoom
	// Room to spare goes behind the leader, evenly either side of everyone.
	const spare = Math.max(0, width - (front - back))
	const target = Math.max(
		LEFT_EDGE - VIEW_WIDTH * CAMERA_LEAD,
		Math.min(
			world.terrain.finishX + 500 - width,
			front > back + width ? front - width : back - spare / 2,
		),
	)
	const camera = world.camera()
	world.setCamera(camera + (target - camera) * 0.25)
}

/** Where a point in the world is on the screen, with the camera's zoom: it zooms out from the bottom left. */
export function onScreen(world: World, x: number, y: number) {
	const zoom = world.zoom()
	return {
		x: (x - world.camera()) / zoom,
		y: VIEW_HEIGHT - (VIEW_HEIGHT - y) / zoom,
	}
}
