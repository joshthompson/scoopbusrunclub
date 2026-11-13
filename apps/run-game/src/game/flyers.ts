import { flyerLook } from '../draw/flyerLook'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { PICKUP_WORD } from './collectables'
import {
	GOOSE_ALTITUDES,
	GOOSE_CARRY_HEIGHT,
	GOOSE_CARRY_TICKS,
	GOOSE_FLY_SPEED,
	GOOSE_POINTS,
	GRAVITY,
	HITBOX_HALF_WIDTH,
	PATH_BACK,
	RUNNER_SCALE,
	STAND_HEIGHT,
} from './constants'
import { scored } from './step'
import { TOWER_DOOR, TOWER_HEIGHT, TOWER_MERLON, towerSpan } from './towers'
import type { Body, Flyer, Pacer, Racer, World } from './world'

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

/**
 * A dragon's own heights over the ground, its feet: low, its back where a
 * jump comes down onto it.
 */
const DRAGON_ALTITUDES = [24, 34, 44]
/**
 * Ridden through a tower's doorway, how far over the ground there whoever's
 * sat on a dragon has their feet: low enough that, sat up, they clear the
 * top of it.
 */
const SEATED_THROUGH_DOOR = 56

/** A tick's glide from `from` towards `to`. */
export const glide = (from: number, to: number, rate = GLIDE) =>
	Math.max(-GLIDE_MAX, Math.min(GLIDE_MAX, (to - from) * rate))

/** How far before a tower a flyer's down at its doorway, and after it, before climbing back up. */
const DOOR_AHEAD = 260
const DOOR_AFTER = 40
/** How far before a tower a dragon carrying someone is up as high over it as over the ground. */
const TOWER_APPROACH = 700

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
				const altitudes = flyerLook(world.course).seat
					? DRAGON_ALTITUDES
					: GOOSE_ALTITUDES
				const altitude = altitudes[i % altitudes.length]
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

	// Off a Leap: a condor for each who's gone over, swooping in to catch them.
	if (world.course.leap) sendCondors(world)

	for (const goose of flyers) {
		if (goose.state === 'swooping') {
			swoop(world, goose)
			continue
		}
		if (goose.state === 'carrying' && goose.pacer !== undefined) {
			const p = world.pack.find((p) => p.id === goose.pacer)
			if (!p?.condorFrom || p.scooped) {
				goose.state = 'leaving'
				goose.pacer = undefined
				goose.vy = -1
			} else {
				const { seat } = flyerLook(world.course)
				goose.x = p.x - (seat?.ahead ?? 0)
				goose.feetY = p.feetY + (seat ? seat.back(0) - seat.sink : 0)
				continue
			}
		}
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
					// Sat astride its back, at its seat: it ripples along under them,
					// its back there always under their feet. Its ripple's as it's
					// drawn, `now` ticks in.
					const now = world.ticks() + goose.id * 3
					goose.x = b.x - look.seat.ahead
					goose.feetY = b.feetY + look.seat.back(now) - look.seat.sink
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
			goose.state !== 'swooping' &&
			(goose.x > right || goose.feetY < GONE_ABOVE)
		)
			flyers.splice(i, 1)
	}

	if (!running) return
	for (const racer of racing)
		if (racer.body.carried === 0 && racer.body.mount === 0) grab(world, racer)
}

/**
 * Where whoever's being carried has their feet: up over everything coming
 * on a goose; on a dragon, through a tower's doorway, low, and otherwise
 * that high over the ground.
 */
export function carryHeight(world: World, x: number) {
	if (!flyerLook(world.course).seat)
		return flightFloor(world, x) - GOOSE_CARRY_HEIGHT
	const tower = towerAt(world, x)
	if (tower !== undefined)
		return world.terrain.groundY(tower) - SEATED_THROUGH_DOOR
	const height = flightFloor(world, x, false) - GOOSE_CARRY_HEIGHT
	// Coming up to one, uphill, as high over it as over the ground, so
	// jumping off can still land on its roof.
	const coming = towerAt(world, x, TOWER_APPROACH)
	return coming === undefined
		? height
		: Math.min(height, world.terrain.groundY(coming) - GOOSE_CARRY_HEIGHT)
}

/**
 * Jumping into a goose: it grabs you, and off you go. A dragon you come
 * down onto, onto its back, and sit on.
 */
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
		if (look.seat) {
			// Coming down onto its back, from over it.
			const back = goose.feetY - look.seat.back(world.ticks() + goose.id * 3)
			if (b.vy <= 0 || b.feetY < back - 4 || b.feetY - b.vy > back + 10)
				continue
		}
		// Their head, or their hands above it, up into it.
		else if (top > goose.feetY + 6 || b.feetY < goose.feetY - look.height)
			continue

		goose.state = 'carrying'
		goose.rider = racer.id
		b.carried = GOOSE_CARRY_TICKS
		const kind = `ride:${world.course.flyer ?? 'goose'}` as const
		collect(kind)
		b.combo = 0
		b.stumble = 0
		b.facing = 1
		b.ducking = false
		world.addBonus('geese', GOOSE_POINTS)
		world.popup(
			scored(world, PICKUP_WORD[kind], `+${GOOSE_POINTS}`),
			b.x,
			goose.feetY - look.height - 10,
		)
		play(look.sound)
		return
	}
}

// --- Off a Leap: condors ------------------------------------------------------

/**
 * How fast a condor carries someone down to the valley floor, along: a
 * little slower than anyone runs, gliding, so the ride down lasts.
 */
export const CONDOR_SPEED = 5
/** How quickly whoever it's caught gets up to its speed, a share a tick. */
const CONDOR_GRIP = 0.06
/** How far back and up from whoever's going over a condor sets off from: off the screen, up behind them. */
const SWOOP_BEHIND = 520
const SWOOP_ABOVE = 140
/** How far below the Leap's edge someone's gone over it, for a condor to set off. */
const OVER_EDGE = 12
/** How little room a condor takes to carry someone down, along, at least. */
const CONDOR_GLIDE_MIN = 600

/** Whether `x` is past a Leap's edge, before the valley floor's where they'd be let go. */
const pastEdge = (world: World, x: number) => {
	const { leap } = world.course
	return !!leap && x > leap.edge && x < leap.land + 400
}

/** How high the top of a Leap is: the Ground just before its edge. */
const leapTop = (world: World) => {
	const { leap } = world.course
	return leap ? world.terrain.groundY(leap.edge - 1) : 0
}

/** The line a condor catches anyone at, falling: `catchAt` down the Leap. */
export const catchLine = (world: World) => {
	const { leap } = world.course
	if (!leap) return 0
	const top = leapTop(world)
	return top + (world.terrain.groundY(leap.land) - top) * leap.catchAt
}

/**
 * Where a condor's carrying someone it caught at `from`, `x` along: down
 * onto the valley floor by `land`, swooping down steep at first with all
 * they had falling, then levelling out to come in gently.
 */
export function condorPath(
	world: World,
	from: { x: number; y: number },
	x: number,
) {
	const { leap } = world.course
	if (!leap) return from.y
	const land = Math.max(leap.land, from.x + CONDOR_GLIDE_MIN)
	const floor = world.terrain.groundY(land)
	const t = Math.max(0, Math.min(1, (x - from.x) / (land - from.x)))
	return from.y + (floor - from.y) * (1 - (1 - t) ** 2)
}

/**
 * Carried down by a condor, `b`, along its way: whatever's held, faster
 * than anyone runs, till they're down on the valley floor, where it lets
 * go. Returns whether it has.
 */
export function rideCondor(
	world: World,
	b: Pick<Body, 'x' | 'vx' | 'vy' | 'feetY' | 'condorFrom'>,
) {
	const from = b.condorFrom
	if (!from) return true
	b.vx += (CONDOR_SPEED - b.vx) * CONDOR_GRIP
	b.x += b.vx
	const y = condorPath(world, from, b.x)
	b.vy = y - b.feetY
	b.feetY = y
	const ground = world.terrain.groundY(b.x)
	if (b.feetY < ground - 1) return false
	b.feetY = ground
	b.vy = 0
	b.condorFrom = undefined
	return true
}

/**
 * Who's gone over a Leap's edge, falling, with no condor yet: one each,
 * Pacers too, setting off from up behind them, off the screen.
 */
function sendCondors(world: World) {
	const top = leapTop(world)
	const coming = (x: number, feetY: number) =>
		pastEdge(world, x) && feetY > top + OVER_EDGE
	const send = (
		x: number,
		feetY: number,
		who: Pick<Flyer, 'rider' | 'pacer'>,
	) => {
		world.flyers.push({
			id: world.flyerState.nextId++,
			x: x - SWOOP_BEHIND,
			feetY: feetY - SWOOP_ABOVE,
			cruise: 0,
			altitude: 0,
			vy: 0,
			state: 'swooping',
			...who,
		})
		play('whoosh')
	}
	const sent = (who: Pick<Flyer, 'rider' | 'pacer'>) =>
		world.flyers.some(
			(f) =>
				(who.rider !== undefined && f.rider === who.rider) ||
				(who.pacer !== undefined && f.pacer === who.pacer),
		)
	for (const racer of world.racers) {
		const b = racer.body
		if (racer.out || b.grounded || b.condorFrom) continue
		if (!coming(b.x, b.feetY) || sent({ rider: racer.id })) continue
		send(b.x, b.feetY, { rider: racer.id })
	}
	for (const p of world.pack) {
		if (p.scooped || p.grounded || p.condorFrom) continue
		if (!coming(p.x, p.feetY) || sent({ pacer: p.id })) continue
		send(p.x, p.feetY, { pacer: p.id })
	}
}

/**
 * A condor swooping in, beating its wings, to be just under whoever it's
 * after, its back under them, as they fall to the line it catches them
 * at: there just as they are. Caught, they're on its back.
 */
function swoop(world: World, condor: Flyer) {
	const line = catchLine(world)
	const { seat } = flyerLook(world.course)
	const ahead = seat?.ahead ?? 0
	const under = seat ? seat.back(0) - seat.sink : 0
	const racer = world.racers.find((r) => r.id === condor.rider)
	const pacer = world.pack.find((p) => p.id === condor.pacer)
	const who =
		racer && !racer.out
			? racer.body
			: pacer && !pacer.scooped
				? pacer
				: undefined
	if (!who || who.grounded) {
		// Gone, or landed somehow: off it goes.
		condor.state = 'leaving'
		condor.rider = undefined
		condor.pacer = undefined
		condor.vy = -1
		return
	}
	if (who.feetY >= line) {
		catchFaller(world, condor, who, racer)
		return
	}
	// How long till they're down at the line, falling as they are.
	const v = who.vy
	const left =
		(-v + Math.sqrt(v * v + 2 * GRAVITY * (line - who.feetY))) / GRAVITY
	const toX = who.x + who.vx * left - ahead
	const toY = line + under
	const steps = Math.max(1, left)
	condor.x += (toX - condor.x) / steps
	condor.feetY += (toY - condor.feetY) / steps
}

/** Caught, on a condor's back: carried down from here. */
function catchFaller(
	world: World,
	condor: Flyer,
	who: Body | Pacer,
	racer: Racer | undefined,
) {
	const { seat } = flyerLook(world.course)
	condor.state = 'carrying'
	who.condorFrom = { x: who.x, y: who.feetY }
	condor.x = who.x - (seat?.ahead ?? 0)
	condor.feetY = who.feetY + (seat ? seat.back(0) - seat.sink : 0)
	if (!racer) return
	const b = racer.body
	// Carried till it lets go of them, on the valley floor.
	b.carried = Number.MAX_SAFE_INTEGER
	collect('ride:condor')
	b.combo = 0
	b.stumble = 0
	b.facing = 1
	b.ducking = false
	world.addBonus('geese', GOOSE_POINTS)
	world.popup(
		scored(world, PICKUP_WORD['ride:condor'], `+${GOOSE_POINTS}`),
		b.x,
		b.feetY - 90,
	)
	play('whoosh')
}
