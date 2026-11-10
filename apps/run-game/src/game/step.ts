import {
	GEESE_REACH_UP,
	geeseLeft,
	geeseWidth,
	gooseSpan,
} from '../draw/art/geese'
import { KIDS_REACH_UP, kidsWidth } from '../draw/art/kids'
import { TOURISTS_HEIGHT, touristsWidth } from '../draw/art/tourists'
import { TALL_HURDLE_CLEAR, TALL_HURDLE_HEIGHT } from '../draw/art/track'
import { rideLook } from '../draw/rideLook'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { ceilingAt, inTunnel, rockOver } from './cave'
import {
	AIR_PUSH,
	BARCODE_BOOST,
	BARCODE_POINTS,
	BARCODE_TALL,
	BARCODE_WIDTH,
	BUS_HILL_PULL,
	BUS_HOLD_TICKS,
	BUS_LEASH_FULL,
	BUS_LEASH_GROWTH,
	BUS_LEASH_LATE_GROWTH,
	BUS_LEASH_MAX,
	BUS_RAMP_TICKS,
	BUS_START_SPEED,
	BUS_START_X,
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
	GOOSE_CARRY_HEIGHT,
	GOOSE_CARRY_SPEED,
	GRAVITY,
	HAZARD_POINTS,
	HILL_PULL,
	HITBOX_HALF_WIDTH,
	JUMP_CUT,
	JUMP_SPEED,
	MAX_SPEED,
	MUD_TOP_SPEED,
	PATH_FRONT,
	PUMPKIN_BOOST,
	PUMPKIN_POINTS,
	PUMPKIN_SPEED,
	PX_PER_M,
	RUN_GRIP,
	RUN_TOP_SPEED,
	SLIDE_KEEP,
	SPEED_POINTS,
	SQUASHED_TOP_SPEED,
	STAND_HEIGHT,
	START_LEAD,
	START_X,
	STUMBLE_SPEED,
	STUMBLE_TICKS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
	hillPull,
} from './constants'
import { scoopCorgis, stepCorgis } from './corgis'
import { cyclistAt } from './cyclists'
import { FIKA_SIZE, FIKA_WORD } from './fika'
import { flightFloor, glide, stepFlyers } from './flyers'
import { scoopFurbies, stepFurbies } from './furbies'
import { scoopPack, stepPack } from './pack'
import { landingOn, platformAt, platformMove } from './platforms'
import { STEAM_LAUNCH, STEAM_REACH } from './steam'
import { TOWER_DOOR, TOWER_HEIGHT, towerSpan } from './towers'
import {
	type Body,
	type BoostState,
	type ObstacleState,
	type Racer,
	type World,
	bodyHeight,
	isCaught,
} from './world'
import { zombieAt } from './zombies'

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
/** How far down a Gap, below the Ground's line, a runner's Fallen. */
const FALL_DEPTH = 160
/** How long the runner falls before the result shows. */
const FALLEN_TICKS = 60
/** How long ducking drops through a Platform for, before it can be landed on again. */
const DROP_TICKS = 14
/**
 * How far below the top of a Wall a runner's feet can be and still get up
 * onto it, rather than run into it.
 */
const WALL_STEP = 10
/** How fast a Wall throws a runner back. */
const WALL_BOUNCE = 1
/** How fast into a Wall a runner has to be going for it to throw them back. */
const WALL_BOUNCE_SPEED = 4
/** How far a step down the Ground can be before running off it is a drop, not a step. */
const STEP_DOWN = 12

/**
 * One tick of the whole game, in order: the phase, the runner, everyone else,
 * the furbies, corgis and flying geese, what they hit, the bus, the camera.
 */
export function stepWorld(world: World) {
	world.setTicks(world.ticks() + 1)
	stepPhase(world)
	for (const racer of world.racers) stepRunner(world, racer)
	stepPack(world)
	stepFurbies(world)
	stepCorgis(world)
	stepFlyers(world)
	for (const racer of world.racers) collide(world, racer)
	stepBus(world)
	if (world.round) {
		decideRound(world)
		frameEveryone(world)
	} else stepCamera(world)

	// Not while flying out of the scoop: how far they got is where it got them.
	if (!isCaught(world.racers[0].out)) world.setPlayerX(world.body.x)
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
				speedBonus(world, racer)
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
	if (
		phase === 'fallen' &&
		!world.result() &&
		world.ticks() - world.racers[0].outAt > FALLEN_TICKS
	)
		world.setResult({
			kind: 'fallen',
			distance: Math.max(0, world.playerX() - START_X),
			busGap: 0,
		})
}

/**
 * How long the bus takes to drive from where it starts to the finish, at
 * its own pace, held at the start, then speeding up, as it does when nobody's
 * so far ahead it's pulled along: the time to beat.
 */
function busTicksToFinish(world: World) {
	let x = BUS_START_X
	let ticks = BUS_HOLD_TICKS
	while (x < world.terrain.finishX) {
		const ramp = Math.min(1, (ticks - BUS_HOLD_TICKS) / BUS_RAMP_TICKS)
		x += BUS_START_SPEED + (BUS_TOP_SPEED - BUS_START_SPEED) * ramp
		ticks++
	}
	return ticks
}

/**
 * Over the line: points for how much quicker round than the bus they were,
 * so the quicker the better, not just getting there.
 */
function speedBonus(world: World, racer: Racer) {
	const ahead = busTicksToFinish(world) - world.raceTicks()
	world.finish.ahead = ahead
	if (ahead <= 0) return
	const points = Math.round(ahead * SPEED_POINTS)
	world.addBonus('speed', points)
	world.popup(`Speedy! +${points}`, racer.body.x, racer.body.feetY - 90)
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
		r.out === 'finished' ? 0 : isCaught(r.out) ? 2 : 1
	world.setOrder(
		[...racers].sort(
			(a, b) =>
				rank(a) - rank(b) ||
				(a.out === 'finished'
					? a.outAt - b.outAt
					: isCaught(a.out)
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
	if (racer.out === 'fallen') {
		// On down, out of sight.
		b.vx *= 0.9
		b.x += b.vx
		b.vy = Math.min(b.vy + GRAVITY, 14)
		b.feetY += b.vy
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
	if (!racing) {
		b.mount = 0
		b.carried = 0
	}
	if (b.stomped > 0) b.stomped--
	// A stumble knocks a Pumpkin off.
	if (b.stumble > 0 && b.pumpkin) loseHat(world, b)
	if (b.dropping > 0) b.dropping--

	if (b.carried > 0 && up && !b.wasUp) {
		// Jumping off a goose, or a dragon: up off it, as off the ground.
		b.carried = 0
		jump(b)
		b.wasUp = up
		return
	}
	if (b.carried > 0) {
		// Carried by a goose: up and on, whatever's held, until it lets go,
		// or they do, with down.
		b.carried = down ? 0 : b.carried - 1
		b.grounded = false
		b.ducking = false
		b.facing = 1
		b.vx += (GOOSE_CARRY_SPEED - b.vx) * CORGI_GRIP
		// Up over whatever's coming, as the goose flies.
		b.vy = glide(
			b.feetY,
			flightFloor(world, b.x) - GOOSE_CARRY_HEIGHT,
			CARRY_LIFT,
		)
		const carriedFrom = b.x
		b.x += b.vx
		// Carried into a tower's side: knocked off, and down.
		if (racing) hitTower(world, racer, carriedFrom)
		b.feetY += b.vy
		// Let go: falling from here, not still rising.
		if (b.carried === 0) b.vy = Math.max(0, b.vy)
		b.wasUp = up
		return
	}

	// Ducking on a Platform: down through it, unless it's solid rock.
	if (
		b.grounded &&
		b.on !== undefined &&
		!world.platforms[b.on].solid &&
		down &&
		b.mount === 0
	) {
		b.droppingFrom = b.on
		b.dropping = DROP_TICKS
		b.on = undefined
		b.grounded = false
		b.vy = 1
	}

	if (b.grounded) {
		// Platforms are flat.
		const slope = b.on === undefined ? terrain.slope(b.x) : 0
		// In a Tunnel: kept down in it, ducking or not, and going through it
		// no slower than they went in.
		const low = inTunnel(world, b.x, b.feetY)
		if (!low) b.tunnelSpeed = undefined
		else b.tunnelSpeed ??= Math.abs(b.vx)
		b.ducking = down || low
		if (b.stumble > 0) b.stumble--
		if (b.squashed > 0) b.squashed--
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
			b.vx += hillPull(slope) * HILL_PULL * (slope > 0 ? 2 : 1)
			// Holding a way too: crawling along that way, slowly, if they're
			// not sliding any faster.
			const crawl = canDrive ? Number(right) - Number(left) : 0
			if (crawl && b.vx * crawl < CRAWL_SPEED)
				b.vx += (crawl * CRAWL_SPEED - b.vx) * CRAWL_GRIP
			if (b.tunnelSpeed !== undefined) {
				// Through a Tunnel no slower than they went in, and holding a
				// way, pushing on slowly up to a fair pace, however slowly
				// they started.
				if (crawl && b.tunnelSpeed < TUNNEL_PUSH_TO)
					b.tunnelSpeed = Math.min(TUNNEL_PUSH_TO, b.tunnelSpeed + TUNNEL_PUSH)
				b.vx = (b.vx < 0 ? -1 : 1) * Math.max(Math.abs(b.vx), b.tunnelSpeed)
			}
		} else {
			const running = b.muddy
				? MUD_TOP_SPEED
				: RUN_TOP_SPEED + (b.pumpkin ? PUMPKIN_SPEED : 0)
			// Squashed by a furby: slower, till they spring back up.
			const top =
				b.squashed > 0 ? Math.min(running, SQUASHED_TOP_SPEED) : running
			// Holding both is standing still.
			const drive = canDrive ? Number(right) - Number(left) : 0
			if (finished) b.vx += (RUN_OFF_SPEED - b.vx) * RUN_GRIP * 2
			else if (drive) {
				const target = drive * top
				// Boosted past top speed the way they're going: let it last.
				const boosted = b.vx * drive > top
				b.vx += (target - b.vx) * (boosted ? OVERSPEED_GRIP : RUN_GRIP)
			} else b.vx *= COAST_KEEP
			b.vx += hillPull(slope) * HILL_PULL
			if (b.muddy && Math.abs(b.vx) > MUD_TOP_SPEED) b.vx *= 0.93
			if (b.squashed > 0 && Math.abs(b.vx) > SQUASHED_TOP_SPEED) b.vx *= 0.95
		}

		if (up && !b.wasUp && !low) {
			// Off a corgi or a llama, if on one: up from its saddle.
			if (b.mount > 0) b.feetY -= rideLook(world.course).saddle
			b.mount = 0
			jump(b)
			b.ducking = false
			b.on = undefined
		}
	} else {
		// Off a corgi or a llama even with it in the air, up from its saddle.
		if (up && !b.wasUp && b.mount > 0) {
			b.feetY -= rideLook(world.course).saddle
			b.mount = 0
			jump(b)
		}
		b.vy += GRAVITY
		// Let go of jump on the way up: cut short, a hop. Held: the whole jump.
		if (b.jumping && !up && b.vy < -JUMP_CUT) b.vy = -JUMP_CUT
		if (b.vy >= 0) b.jumping = false
		if (right) b.vx += AIR_PUSH
		if (left) b.vx -= AIR_PUSH
	}
	b.wasUp = up
	if (b.vx > 0.5) b.facing = 1
	else if (b.vx < -0.5) b.facing = -1

	b.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, b.vx))

	// Carried along by a Moving Platform.
	const ticks = world.ticks()
	if (b.grounded && b.on !== undefined)
		b.x += platformMove(terrain, world.platforms[b.on], ticks).x

	// The bus is in the way long before this, but the ground runs out here.
	const from = b.x
	b.x = Math.max(LEFT_EDGE, b.x + b.vx)
	if (racing) {
		hitWall(world, racer, from)
		hitTower(world, racer, from)
		hitRockFace(world, racer, from)
	}

	const ground = terrain.groundY(b.x)
	const overGap = terrain.inGap(b.x)
	if (b.grounded) {
		if (b.on !== undefined) {
			const at = platformAt(terrain, world.platforms[b.on], ticks)
			// Run off the end of it.
			if (b.x < at.left || b.x > at.right) leaveFooting(b)
			else b.feetY = at.top
		} else if (overGap || stepsDown(world, from, b.x, ground - b.feetY))
			leaveFooting(b)
		else b.feetY = ground
	}
	if (!b.grounded) {
		const wasFeetY = b.feetY
		b.feetY += b.vy
		// Up into a Ceiling: a bump on the head, and no higher.
		if (b.vy < 0) {
			const height = bodyHeight(b)
			const ceiling = ceilingAt(world, b.x, wasFeetY - height)
			if (ceiling !== undefined && b.feetY - height < ceiling) {
				b.feetY = ceiling + height
				b.vy = 0
				b.jumping = false
			}
		}
		const platform =
			b.vy >= 0
				? landingOn(
						terrain,
						world.platforms,
						ticks,
						b.x,
						wasFeetY,
						b.feetY,
						b.dropping > 0 ? b.droppingFrom : undefined,
					)
				: undefined
		if (platform && (overGap || platform.top <= ground)) {
			b.feetY = platform.top
			b.on = platform.index
			land(b)
		} else if (!overGap && b.feetY >= ground && b.vy >= 0) {
			b.feetY = ground
			b.on = undefined
			land(b)
		} else if (racing && b.feetY > ground + FALL_DEPTH) fall(world, racer)
	}
	if (b.grounded) b.floor = b.feetY
}

/** A Pumpkin knocked off someone's head, flying. */
function loseHat(world: World, b: Body) {
	b.lostPumpkin = { carving: b.pumpkin, at: world.ticks() }
	b.pumpkin = 0
}

/** A jump, off the ground or off a ride: a tap's a hop, held it's the whole jump. */
function jump(b: Body) {
	b.vy = -JUMP_SPEED
	b.jumping = true
	b.grounded = false
	play('jump')
}

/** Off whatever they were stood on, and falling. */
function leaveFooting(b: Body) {
	b.on = undefined
	b.grounded = false
	b.vy = 0
}

function land(b: Body) {
	b.vy = 0
	b.grounded = true
	b.jumping = false
}

/** Whether going from `from` to `to` crosses a step down in the Ground more than `drop` deep. */
function stepsDown(world: World, from: number, to: number, drop: number) {
	if (drop <= STEP_DOWN) return false
	const [lo, hi] = from < to ? [from, to] : [to, from]
	return world.terrain.walls.some((w) => w > lo && w <= hi)
}

/**
 * Run into a Wall going from `from`: the side of higher Ground, or the far
 * side of a Gap they've dropped into. Thrown back off it, stumbling.
 */
function hitWall(world: World, racer: Racer, from: number) {
	const { terrain } = world
	const b = racer.body
	const dir = Math.sign(b.x - from)
	if (!dir) return
	const front = (x: number) => x + dir * HITBOX_HALF_WIDTH
	const [lo, hi] =
		dir > 0 ? [front(from), front(b.x)] : [front(b.x), front(from)]
	for (const w of terrain.walls) {
		if (w <= lo || w > hi) continue
		// The Ground just past it, if there is any.
		const beyond = w + dir
		if (terrain.inGap(beyond)) continue
		if (b.feetY <= terrain.groundY(beyond) + WALL_STEP) continue
		thud(world, b, dir, w)
		return
	}
}

/**
 * Into something solid at `edge`, going `dir`: stopped against it, and at a
 * run thrown back off it, stumbling. Off whatever was carrying them, too.
 */
function thud(world: World, b: Body, dir: number, edge: number) {
	b.x = edge - dir * (HITBOX_HALF_WIDTH + 1)
	b.carried = 0
	// Walked into, it just stops them: only at a run does it throw them back.
	const fast = Math.abs(b.vx) >= WALL_BOUNCE_SPEED
	b.vx = fast ? -dir * WALL_BOUNCE : 0
	if (fast && b.stumble === 0) {
		play('stumble')
		b.stumble = STUMBLE_TICKS
		world.addBonus('hazards', -HAZARD_POINTS)
		world.popup(
			scored(world, 'Thud!', `-${HAZARD_POINTS}`),
			b.x,
			b.feetY - STAND_HEIGHT,
		)
	}
}

/**
 * A guard tower's walls: solid, all but its doorways. Into its side above
 * the doorway, it stops them as a Wall does; jumping inside it, they hit
 * their head on the top of the doorway. Over its top, nothing.
 */
function hitTower(world: World, racer: Racer, from: number) {
	const b = racer.body
	const head = b.feetY - bodyHeight(b)
	const dir = Math.sign(b.x - from)
	for (const x of world.course.towers ?? []) {
		const { left, right } = towerSpan(x)
		const line = world.terrain.groundY(x)
		const doorTop = line - TOWER_DOOR
		const top = line + PATH_FRONT - TOWER_HEIGHT
		if (b.feetY < top || head >= doorTop) continue
		const front = b.x + dir * HITBOX_HALF_WIDTH
		const was = from + dir * HITBOX_HALF_WIDTH
		if (dir > 0 && was <= left && front > left) return thud(world, b, 1, left)
		if (dir < 0 && was >= right && front < right)
			return thud(world, b, -1, right)
		// In it, jumping: the top of the doorway. (Carried, they're flown up
		// over it, not into it.)
		if (b.x > left && b.x < right && b.vy < 0 && b.carried === 0) {
			b.feetY = doorTop + (b.feetY - head)
			b.vy = 0
			play('stumble')
		}
	}
}

/**
 * Into a Cave's rock lower than their head, going along: a Tunnel's mouth,
 * run into standing up, or the rock over it, jumped into. Ducking, they go
 * on under it.
 */
function hitRockFace(world: World, racer: Racer, from: number) {
	const cave = world.course.cave
	const b = racer.body
	const dir = Math.sign(b.x - from)
	if (!cave || !dir) return
	const height = bodyHeight(b)
	/** Whether, at `x`, their front's into the rock. */
	const into = (x: number) => {
		const front = x + dir * HITBOX_HALF_WIDTH
		const feet =
			b.grounded && b.on === undefined ? world.terrain.groundY(front) : b.feetY
		const rock = rockOver(world, front, feet)
		return rock !== undefined && rock > feet - height + 1
	}
	if (into(from) || !into(b.x)) return
	let edge = from
	while (!into(edge + dir)) edge += dir
	thud(world, b, dir, edge + dir * (HITBOX_HALF_WIDTH + 1))
}

/** Down a Gap, and out. */
function fall(world: World, racer: Racer) {
	const b = racer.body
	b.mount = 0
	b.carried = 0
	b.ducking = false
	racer.out = 'fallen'
	racer.outAt = world.ticks()
	if (!world.round) world.setPhase('fallen')
	play('fallen')
	world.popup(
		`${racer.runner.name} fell!`,
		b.x,
		world.terrain.groundY(b.x) - 80,
	)
}

/** How quickly a goose lifts whoever it's carrying up to its height, a share a tick. */
const CARRY_LIFT = 0.05

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
	const top = b.feetY - bodyHeight(b)
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
	/** On a corgi, over rocks, under branches and through the mud. Or carried over them. */
	const riding = b.mount > 0 || b.carried > 0
	/**
	 * Not yet had its go at them. A rock, a branch, a pothole, mud and the
	 * children are there for everyone, once each; a hurdle and geese only for
	 * whoever gets to them first (see `firstTo`). Either way, not
	 * once the bus has been through.
	 */
	const freshFor = (state: ObstacleState) =>
		!state.used && !state.hit.has(racer.id)
	const hits = (state: ObstacleState | BoostState) => state.hit.add(racer.id)
	for (const state of riding ? [] : world.obstacles) {
		const o = state.obstacle
		// Only what's near enough to touch: where it is now, for a cyclist
		// or a Zombie on the move.
		const at =
			o.kind === 'cyclist'
				? cyclistAt(world, { ...state, obstacle: o }).x
				: o.kind === 'zombie'
					? zombieAt(world, { ...state, obstacle: o }).x
					: o.x
		if (Math.abs(at - b.x) > 200) continue
		const ground = terrain.groundY(o.x)

		switch (o.kind) {
			case 'rock':
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					overlaps(o.x - 20, o.x + 20, ground - 22, ground)
				) {
					hits(state)
					stumble('Ouch!')
				}
				break
			case 'branch':
				if (
					!state.scooped &&
					freshFor(state) &&
					b.stumble === 0 &&
					// Only where its limb crosses the line everyone runs along:
					// either side of that, it's nearer or further than them.
					overlaps(o.x - 16, o.x + 16, ground - 62, ground - 34)
				) {
					hits(state)
					stumble('Bonk!')
				}
				break
			case 'vent':
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					overlaps(o.x - 18, o.x + 18, ground - 26, ground)
				) {
					hits(state)
					stumble('Clang!')
				}
				break
			case 'tombstone':
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					overlaps(o.x - 16, o.x + 16, ground - 48, ground)
				) {
					hits(state)
					stumble('Clunk!')
				}
				break
			case 'steam':
				// Onto it: it puffs, and fires them up into the air, as from a
				// jump, but much higher.
				if (b.grounded && Math.abs(b.x - o.x) < STEAM_REACH) {
					state.flown = world.ticks()
					b.vy = -STEAM_LAUNCH
					b.grounded = false
					b.jumping = false
					b.on = undefined
					play('whoosh')
				}
				break
			case 'tourists': {
				const half = touristsWidth(o.count) / 2 - 4
				if (
					freshFor(state) &&
					!state.scooped &&
					b.stumble === 0 &&
					overlaps(o.x - half, o.x + half, ground - TOURISTS_HEIGHT, ground)
				) {
					hits(state)
					stumble('Excuse me!')
				}
				break
			}
			case 'cyclist': {
				const cyclist = cyclistAt(world, { ...state, obstacle: o })
				// Round again: there to be run into again.
				if (cyclist.lap !== (state.lap ?? 0)) {
					state.lap = cyclist.lap
					state.hit.clear()
				}
				const at = terrain.groundY(cyclist.x)
				if (
					freshFor(state) &&
					!state.scooped &&
					b.stumble === 0 &&
					overlaps(cyclist.x - 20, cyclist.x + 20, at - 40, at)
				) {
					hits(state)
					play('honk')
					stumble('Ding ding!')
				}
				break
			}
			case 'zombie': {
				const zombie = zombieAt(world, { ...state, obstacle: o })
				const zombieGround = terrain.groundY(zombie.x)
				if (
					freshFor(state) &&
					!state.scooped &&
					zombie.sunk === 0 &&
					b.stumble === 0 &&
					overlaps(
						zombie.x - 12,
						zombie.x + 12,
						zombieGround - 52,
						zombieGround,
					)
				) {
					hits(state)
					play('groan')
					stumble('Braaains!')
				}
				break
			}
			case 'hurdle':
				// Solid all the way down: over it, not under it. A tall one's
				// board stops short: under it, sliding. Knocked over by whoever
				// runs into it first, and lying flat for the rest.
				if (
					!state.used &&
					b.stumble === 0 &&
					(o.tall
						? overlaps(
								o.x - 14,
								o.x + 14,
								ground - TALL_HURDLE_HEIGHT,
								ground - TALL_HURDLE_CLEAR,
							)
						: overlaps(o.x - 14, o.x + 14, ground - 40, ground))
				) {
					state.used = true
					stumble('Clonk!')
				}
				break
			case 'kids': {
				const half = kidsWidth(o.count) / 2 - 6
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					overlaps(o.x - half, o.x + half, ground - KIDS_REACH_UP, ground)
				) {
					hits(state)
					stumble('Oof!')
				}
				break
			}
			case 'geese': {
				if (state.used || b.stumble > 0) break
				// Into the ones still on the path: some of them are off, and into
				// those left, the rest. Till they're all gone, they're still in
				// everyone else's way.
				const left = geeseLeft(o.x, o.count, state.flown, state.flownAll)
				const into = left.some((i) => {
					const goose = gooseSpan(o.x, o.count, i)
					return overlaps(
						goose.left + 4,
						goose.right - 4,
						ground - GEESE_REACH_UP,
						ground,
					)
				})
				if (into) {
					if (state.flown === undefined) state.flown = world.ticks()
					else state.flownAll = world.ticks()
					if (!geeseLeft(o.x, o.count, state.flown, state.flownAll).length)
						state.used = true
					play('honk')
					stumble('Honk!')
				}
				break
			}
			case 'pothole':
				// Only underfoot, a little way in from its edges.
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					b.grounded &&
					b.on === undefined &&
					Math.abs(b.x - o.x) < o.width / 2 - 4
				) {
					hits(state)
					stumble('Ouch!')
				}
				break
			case 'mud':
				// Bogging everyone down, and costing each of them once.
				if (
					b.grounded &&
					b.on === undefined &&
					Math.abs(b.x - o.x) < o.width / 2
				) {
					if (!b.muddy && freshFor(state)) {
						hits(state)
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
		}
	}

	for (const state of world.boosts) {
		const o = state.boost
		if (Math.abs(o.x - b.x) > 200) continue
		const ground = terrain.groundY(o.x)
		switch (o.kind) {
			case 'fika': {
				const { width, height } = FIKA_SIZE[o.item]
				const y = ground - o.height
				// A little bigger than the art, so grabbing it isn't fiddly.
				const reach = width / 2 + 4
				if (
					!state.used &&
					overlaps(o.x - reach, o.x + reach, y - height - 2, y)
				) {
					state.used = true
					collect(`fika:${o.item}`)
					b.vx = boost(b.vx, b.facing, FIKA_BOOST)
					world.addBonus('fika', FIKA_POINTS)
					world.popup(
						scored(world, FIKA_WORD[o.item] ?? 'Fika!', `+${FIKA_POINTS}`),
						b.x,
						top,
					)
					play('fika')
				}
				break
			}
			case 'barcode': {
				const y = ground - o.height
				const reach = BARCODE_WIDTH / 2 + 4
				if (
					!state.used &&
					overlaps(o.x - reach, o.x + reach, y - BARCODE_TALL - 2, y)
				) {
					state.used = true
					collect('barcode')
					b.vx = boost(b.vx, b.facing, BARCODE_BOOST)
					world.addBonus('barcodes', BARCODE_POINTS)
					world.popup(scored(world, 'Scanned!', `+${BARCODE_POINTS}`), b.x, top)
					play('scan')
				}
				break
			}
			case 'pumpkin':
				// Only with nothing on your head already.
				if (
					!state.used &&
					!b.pumpkin &&
					b.stumble === 0 &&
					overlaps(o.x - 16, o.x + 16, ground - 30, ground)
				) {
					state.used = true
					collect('pumpkin')
					b.pumpkin = o.carving
					b.vx = boost(b.vx, b.facing, PUMPKIN_BOOST)
					world.addBonus('pumpkins', PUMPKIN_POINTS)
					world.popup(
						scored(world, 'Pumpkin head!', `+${PUMPKIN_POINTS}`),
						b.x,
						top,
					)
					play('fika')
				}
				break
			case 'cheer':
				// Passing them, either way: they cheer on everyone, once each.
				if (
					!state.hit.has(racer.id) &&
					b.x - o.x !== 0 &&
					b.x - o.x > 0 !== wasAt - o.x > 0
				) {
					hits(state)
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

/** How far behind the scoop's front the middle of the bus is, where it feels the hill. */
const BUS_MIDDLE_BEHIND = 145

/** How fast holding a way in a Tunnel gets someone going through it, and how quickly. */
const TUNNEL_PUSH_TO = 4
const TUNNEL_PUSH = 0.04

/** How fast someone crawls, ducking and holding a way, and how quickly they get going. */
const CRAWL_SPEED = 1.6
const CRAWL_GRIP = 0.2

function stepBus(world: World) {
	const { bus } = world
	const phase = world.phase()
	if (bus.scooping > 0) bus.scooping--
	// Cheerers' bubbles run down here, once a tick, whoever set them going.
	for (const state of world.boosts)
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
		// Slowed going uphill, as everyone is: its wheels' slope.
		const slope = world.terrain.slope(bus.frontX - BUS_MIDDLE_BEHIND)
		const uphill = Math.min(0, hillPull(slope)) * BUS_HILL_PULL
		bus.frontX += bus.speed * Math.max(0.3, 1 + uphill)
	}
	scoopPack(world)
	scoopFurbies(world)
	scoopCorgis(world)
	knockOver(world)

	if (phase !== 'running') {
		// Back in, once there's no one to reach for.
		bus.reach *= 1 - ARM_EASE
		return
	}
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

	reachFor(world, running)
	for (const racer of running) {
		const body = racer.body
		if (bus.frontX < body.x - HITBOX_HALF_WIDTH) continue
		scoop(world, racer, body)
	}
}

/** How far ahead of the bus the Scoop Arm starts reaching for someone. */
const ARM_RANGE = 320
/** How far off the Ground's line someone has to be to be reached for: less, and the scoop gets them as it is. */
const ARM_FROM = 40
/** How quickly the arm stretches or shrinks, a share a tick. */
const ARM_EASE = 0.12

/**
 * The Scoop Arm, reaching up (or down) for the nearest racer ahead of the
 * bus that's off the Ground's line: up on a Platform or a rooftop. The bus
 * scoops whoever it reaches, whatever their height; this is how.
 */
function reachFor(world: World, running: Racer[]) {
	const { bus, terrain } = world
	let target = 0
	let nearest = ARM_RANGE
	for (const racer of running) {
		const ahead = racer.body.x - bus.frontX
		if (ahead < -HITBOX_HALF_WIDTH || ahead > nearest) continue
		const off = (bus.ride?.y ?? terrain.groundY(bus.frontX)) - racer.body.feetY
		nearest = ahead
		target = Math.abs(off) > ARM_FROM ? off : 0
	}
	bus.reach += (target - bus.reach) * ARM_EASE
}

/** Caught by the bus: flung up out of the scoop, and out. */
function scoop(world: World, racer: Racer, body: Body) {
	const { bus } = world
	bus.scooping = 10
	body.mount = 0
	body.carried = 0
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
 * after. Geese fly off before it gets to them. Potholes, mud and the rest it
 * just drives over. A hurdle here is the
 * runner's lane's; the rest of the row go over as the scoop reaches them
 * (see the hurdle's sprite).
 */
function knockOver(world: World) {
	const { bus } = world
	for (const state of world.obstacles) {
		const o = state.obstacle
		// Zombies walk into it: scooped, where they are, like anyone else.
		if (o.kind === 'cyclist') {
			if (state.scooped) continue
			const cyclist = cyclistAt(world, { ...state, obstacle: o })
			if (bus.frontX < cyclist.x - 16) continue
			state.used = true
			state.scooped = {
				at: world.ticks(),
				vx: Math.max(bus.speed, 2) + 2 + Math.random() * 2,
				x: cyclist.x,
			}
			bus.scooping = 10
			continue
		}
		if (o.kind === 'zombie') {
			if (state.scooped) continue
			const zombie = zombieAt(world, { ...state, obstacle: o })
			if (zombie.sunk > 0 || bus.frontX < zombie.x - 12) continue
			state.used = true
			state.scooped = {
				at: world.ticks(),
				vx: Math.max(bus.speed, 2) + 2 + Math.random() * 2,
				x: zombie.x,
			}
			bus.scooping = 10
			const camera = world.camera()
			if (zombie.x > camera && zombie.x < camera + world.viewWidth())
				play('whoosh')
			continue
		}
		// Geese see it coming, and are off before it gets to them.
		if (
			o.kind === 'geese' &&
			state.flownAll === undefined &&
			bus.frontX > o.x - geeseWidth(o.count) / 2 - GEESE_SCARE
		) {
			state.used = true
			state.flownAll = world.ticks()
			const camera = world.camera()
			if (o.x > camera && o.x < camera + world.viewWidth()) play('honk')
		}
		if (state.scooped || bus.frontX < o.x - 14) continue
		if (o.kind === 'hurdle') state.used = true
		if (
			o.kind === 'rock' ||
			// A low branch's limb, knocked off its tree.
			o.kind === 'branch' ||
			o.kind === 'kids' ||
			o.kind === 'tombstone' ||
			o.kind === 'tourists'
		) {
			state.used = true
			state.scooped = {
				at: world.ticks(),
				vx: Math.max(bus.speed, 2) + 2 + Math.random() * 2,
			}
			bus.scooping = 10
			const camera = world.camera()
			if (
				(o.kind === 'kids' || o.kind === 'tourists') &&
				o.x > camera &&
				o.x < camera + VIEW_WIDTH
			)
				play('whoosh')
		}
	}
}

/** How near the bus gets to geese before they fly off. */
const GEESE_SCARE = 140

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

/**
 * The camera keeps the height someone last stood at at least this far down
 * from the top of the screen, looking up once they're higher: and their feet
 * this far up from the bottom, looking down.
 */
export const CAMERA_HEADROOM = 230
export const CAMERA_FOOTROOM = 40
/** How quickly the camera looks up or down, a share a tick. */
const CAMERA_LIFT = 0.08

/**
 * How far up the camera wants to look for floors from `high` to `low`, at
 * `zoom`: no further down than where it starts, which is the course's
 * lowest.
 */
function cameraYFor(high: number, low: number, zoom = 1) {
	const up = high - CAMERA_HEADROOM - VIEW_HEIGHT * (1 - zoom)
	const down = low + CAMERA_FOOTROOM - VIEW_HEIGHT
	return Math.min(0, Math.max(up, down))
}

function stepCamera(world: World) {
	// Left where it is: to watch them fly off, fall, or run off.
	const phase = world.phase()
	if (phase === 'scooped' || phase === 'fallen' || phase === 'finished') return
	const b = world.body
	const targetY = cameraYFor(b.floor, Math.max(b.floor, b.feetY))
	const cameraY = world.cameraY()
	if (targetY !== cameraY)
		world.setCameraY(cameraY + (targetY - cameraY) * CAMERA_LIFT)
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
	// And up and down: from the highest anyone's stood to the lowest.
	const floors = running.map((r) => r.body.floor)
	const high = Math.min(...floors)
	const low = Math.max(...floors)
	const tall = (low + CAMERA_FOOTROOM - (high - CAMERA_HEADROOM)) / VIEW_HEIGHT
	const want = Math.max(
		1,
		Math.min(MAX_ZOOM, Math.max((front - back) / VIEW_WIDTH, tall)),
	)
	const zoom = world.zoom() + (want - world.zoom()) * ZOOM_EASE
	world.setZoom(zoom)
	const targetY = cameraYFor(high, low, zoom)
	world.setCameraY(world.cameraY() + (targetY - world.cameraY()) * CAMERA_LIFT)
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

/**
 * Where a point in the world is on the screen, with the camera's zoom and
 * how far up it's looking: it zooms out from the bottom left.
 */
export function onScreen(world: World, x: number, y: number) {
	const zoom = world.zoom()
	return {
		x: (x - world.camera()) / zoom,
		y: VIEW_HEIGHT - (VIEW_HEIGHT - (y - world.cameraY())) / zoom,
	}
}
