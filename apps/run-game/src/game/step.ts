import {
	GEESE_REACH_UP,
	geeseLeft,
	geeseWidth,
	gooseSpan,
} from '../draw/art/geese'
import { KIDS_REACH_UP, kidsWidth } from '../draw/art/kids'
import { TOURISTS_HEIGHT, touristsWidth } from '../draw/art/tourists'
import { TALL_HURDLE_CLEAR, TALL_HURDLE_HEIGHT } from '../draw/art/track'
import { flyerLook } from '../draw/flyerLook'
import { rideLook } from '../draw/rideLook'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { ceilingAt, inTunnel, rockOver } from './cave'
import { PICKUP_WORD } from './collectables'
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
	GATE_BOOST,
	GATE_POINTS,
	GLIDER_KNOCK_DROP,
	GLIDER_KNOCK_SPEED,
	GLIDER_WING,
	GOOSE_CARRY_HEIGHT,
	GOOSE_CARRY_SPEED,
	GRAVITY,
	HAZARD_POINTS,
	HILL_PULL,
	HITBOX_HALF_WIDTH,
	JUMP_CUT,
	JUMP_SPEED,
	MUD_TOP_SPEED,
	PATH_FRONT,
	PUMPKIN_BOOST,
	PUMPKIN_POINTS,
	PUMPKIN_SPEED,
	PX_PER_M,
	RIDE_LEAP,
	RING_BOOST,
	RING_POINTS,
	ROUND_BUS_LEASH_MAX,
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
	topSpeed,
} from './constants'
import { MUMMY_HEIGHT } from './constants'
import { scoopCorgis, stepCorgis } from './corgis'
import { cyclistAt } from './cyclists'
import { FIKA_SIZE } from './fika'
import { carryHeight, glide, stepFlyers } from './flyers'
import { scoopFurbies, stepFurbies } from './furbies'
import { atSea, glidingBox, stepGliding } from './gliders'
import { mummyAt } from './mummies'
import { scoopPack, stepPack } from './pack'
import { landingOn, platformAt, platformMove } from './platforms'
import {
	HANDS_HOLD,
	HANDS_REACH,
	SEWAGE_FALL,
	SEWAGE_REACH,
	SWAMP_HEIGHT,
	SWAMP_REACH,
	sewageAt,
	swampManAt,
} from './sewer'
import { stepSkiing } from './skis'
import {
	GULL_HEIGHT,
	GULL_WIDTH,
	RING_ROOM,
	balloonAt,
	gullsAt,
	overlap,
	stormAt,
	turbineAt,
	turbineHits,
	whaleAt,
} from './sky'
import { steamFires } from './steam'
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
/** How long a Ring stays lit up, flown through. */
const RING_GLOW_TICKS = 30
/** Speed bleeds back down to top speed this much slower than it builds, so a boost lasts. */
export const OVERSPEED_GRIP = 0.008
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
		const pace = Math.max(
			BUS_START_SPEED + (BUS_TOP_SPEED - BUS_START_SPEED) * ramp,
			seaPace(world, x),
		)
		// Its own pace, as it goes up and down: on a ski slope, quicker down
		// it, up to the most anyone can go.
		x += world.course.busDownhill
			? Math.min(pace * busHill(world, x), topSpeed(world) - ROUND_SEA_SLACK)
			: pace
		ticks++
	}
	return ticks
}

/**
 * How fast the bus goes out at sea, at `x`, at least: none, on land. In a
 * Round, a little under its top speed, whatever the sea's, so a Player
 * going all out can still keep ahead of it.
 */
function seaPace(world: World, x: number) {
	const { sea } = world.course
	if (!sea || !atSea(world, x)) return 0
	return Math.min(sea.busSpeed, topSpeed(world) - ROUND_SEA_SLACK)
}
/** How much slower than anyone can go the bus goes at sea, in a Round. */
const ROUND_SEA_SLACK = 0.6

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
	// Held by a Swamp Man: nothing they press does anything till he lets go.
	const grabbed = racing && b.held > 0
	if (grabbed) b.held--
	const held = racing && !grabbed ? racer.controls() : undefined
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
	// A Ride wears out as it goes, leaping too, so it's only ever a while:
	// worn out in the air, they're off it, from its saddle, falling.
	if (b.mount > 0 && racing) {
		b.mount--
		if (b.mount === 0 && !b.grounded) b.feetY -= rideLook(world.course).saddle
	}

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
		// Up over whatever's coming, as a goose flies; through a tower's
		// doorway, low, on a dragon.
		b.vy = glide(b.feetY, carryHeight(world, b.x), CARRY_LIFT)
		const carriedFrom = b.x
		b.x += b.vx
		// Carried into a tower's side: knocked off, and down. Not on a
		// dragon: it takes you through.
		if (racing && !flyerLook(world.course).seat)
			hitTower(world, racer, carriedFrom)
		b.feetY += b.vy
		// Let go: falling from here, not still rising.
		if (b.carried === 0) b.vy = Math.max(0, b.vy)
		b.wasUp = up
		return
	}
	if (b.gliding) {
		// On a glider: up and down as they steer it, till it comes down.
		const crashed = stepGliding(world, racer, { up, down, left, right })
		b.wasUp = up
		if (crashed && racing) fall(world, racer)
		return
	}
	if (b.board) {
		// On skis or a snowboard: down the hill, the whole way.
		const fell = stepSkiing(world, racer, { up, down, left, right }, racing)
		b.wasUp = up
		b.wasLeft = left
		b.wasRight = right
		b.wasDown = down
		if (fell) fall(world, racer)
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
		// Ducking, off a Ride: slid off its back, going as fast as it was.
		if (b.mount > 0 && down) b.mount = 0

		if (b.mount > 0) {
			// On a corgi: galloping on, whatever's held.
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
			// On a Ride, it leaps, with them on its back; otherwise, a jump.
			jump(b, b.mount > 0 ? RIDE_LEAP : JUMP_SPEED)
			b.ducking = false
			b.on = undefined
		}
	} else {
		// Ducking off a Ride, even with it in the air: from its saddle, falling.
		if (down && b.mount > 0) {
			b.feetY -= rideLook(world.course).saddle
			b.mount = 0
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

	const top = topSpeed(world)
	b.vx = grabbed ? 0 : Math.max(-top, Math.min(top, b.vx))

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
		} else if (
			racing &&
			b.feetY > ground + (atSea(world, b.x) ? 0 : FALL_DEPTH)
		)
			// Down a Gap, out of sight; into the sea, as they hit it.
			fall(world, racer)
	}
	if (b.grounded) b.floor = b.feetY
}

/** A Pumpkin knocked off someone's head, flying. */
function loseHat(world: World, b: Body) {
	b.lostPumpkin = { carving: b.pumpkin, at: world.ticks() }
	b.pumpkin = 0
}

/**
 * A jump, off the ground or off a goose, or a Ride's leap with them on it,
 * `speed` up: a tap's a hop, held it's the whole jump.
 */
function jump(b: Body, speed = JUMP_SPEED) {
	b.vy = -speed
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
 * side of a Gap they've dropped into. Thrown back off it, stumbling; or, a
 * Ledge, just stopped.
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
		// A Ledge just stops them against it, to jump up.
		if (terrain.ledges?.includes(w)) {
			b.x = w - dir * (HITBOX_HALF_WIDTH + 1)
			b.vx = 0
		} else thud(world, b, dir, w)
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
	const crashed = b.gliding
	b.mount = 0
	b.carried = 0
	b.gliding = false
	b.ducking = false
	b.trick = undefined
	b.turn = 0
	b.grind = undefined
	racer.out = 'fallen'
	racer.outAt = world.ticks()
	if (!world.round) world.setPhase('fallen')
	play('fallen')
	world.popup(
		crashed
			? `Splash! ${racer.runner.name} crashed!`
			: atSea(world, b.x)
				? `Splash! ${racer.runner.name} fell in!`
				: `${racer.runner.name} fell!`,
		b.x,
		world.terrain.groundY(b.x) - 80,
	)
}

/** How quickly a goose lifts whoever it's carrying up to its height, a share a tick. */
const CARRY_LIFT = 0.05

/** As far back as the ground goes (see `Ground`). */
const LEFT_EDGE = START_X - 1300

/** `speed` faster the way they're going, up to the top speed (lower in a Round). */
export function boost(world: World, vx: number, facing: 1 | -1, speed: number) {
	const along = Math.max(0, vx * facing)
	return facing * Math.min(topSpeed(world), along + speed)
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

	// On a glider: lying along under its wing, it over them.
	const box = b.gliding
		? glidingBox(b)
		: {
				left: b.x - HITBOX_HALF_WIDTH,
				right: b.x + HITBOX_HALF_WIDTH,
				top: b.feetY - bodyHeight(b),
				bottom: b.feetY,
			}
	const { top } = box
	/** Where they were last tick. */
	const wasAt = b.x - b.vx
	const overlaps = (x0: number, x1: number, y0: number, y1: number) =>
		box.right > x0 && box.left < x1 && box.bottom > y0 && box.top < y1

	const stumble = (word: string) => {
		play('stumble')
		b.stumble = STUMBLE_TICKS
		if (b.gliding) {
			// Knocked about on a glider: slowed, and down a little, but flying on.
			b.vx = Math.min(b.vx, GLIDER_KNOCK_SPEED)
			b.vy += GLIDER_KNOCK_DROP
		} else b.vx = Math.sign(b.vx) * Math.min(Math.abs(b.vx), STUMBLE_SPEED)
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
		// Only what's near enough to touch: where it is now, for a cyclist,
		// a Zombie or a Mummy on the move.
		const at =
			o.kind === 'cyclist'
				? cyclistAt(world, { ...state, obstacle: o }).x
				: o.kind === 'zombie'
					? zombieAt(world, { ...state, obstacle: o }).x
					: o.kind === 'mummy'
						? mummyAt(world, { ...state, obstacle: o }).x
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
			case 'snowman':
				// Into one: it bursts, and it's gone, for everyone.
				if (
					!state.used &&
					!state.scooped &&
					b.stumble === 0 &&
					overlaps(o.x - 13, o.x + 13, ground - SNOWMAN_HEIGHT, ground)
				) {
					state.used = true
					state.flown = world.ticks()
					play('squelch')
					stumble('Poof!')
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
			case 'steam': {
				// Onto it: it puffs, and fires them up into the air, as from a
				// jump, but much higher. A Giant Vent, on too, out of the sewer.
				const fires = steamFires(o)
				if (b.grounded && Math.abs(b.x - o.x) < fires.reach) {
					state.flown = world.ticks()
					b.vy = -fires.up
					if (fires.on) {
						b.vx = Math.max(b.vx, fires.on)
						b.facing = 1
					}
					b.grounded = false
					b.jumping = false
					b.on = undefined
					play('whoosh')
				}
				break
			}
			case 'swampman': {
				// Up out of his sludge, he grabs whoever's in reach, once a
				// round, and holds them still till he sinks back.
				const man = swampManAt(o.x, world.ticks())
				if (man.round !== (state.lap ?? 0)) {
					state.lap = man.round
					state.hit.clear()
				}
				if (
					man.grabs &&
					freshFor(state) &&
					b.held === 0 &&
					overlaps(
						o.x - SWAMP_REACH,
						o.x + SWAMP_REACH,
						ground - SWAMP_HEIGHT * man.rise,
						ground,
					)
				) {
					hits(state)
					play('groan')
					b.held = man.hold
					b.vx = 0
					b.ducking = false
					b.stumble = 0
					world.addBonus('hazards', -HAZARD_POINTS)
					world.popup(scored(world, 'Gotcha!', `-${HAZARD_POINTS}`), b.x, top)
				}
				break
			}
			case 'hands':
				// Stepped on: they burst up and grab their ankles, once each.
				if (
					b.grounded &&
					b.on === undefined &&
					b.held === 0 &&
					freshFor(state) &&
					Math.abs(b.x - o.x) < HANDS_REACH
				) {
					hits(state)
					state.flown = world.ticks()
					play('groan')
					b.held = HANDS_HOLD
					// Pulled into their grip, between them.
					b.x = o.x
					b.vx = 0
					b.ducking = false
					b.stumble = 0
					world.addBonus('hazards', -HAZARD_POINTS)
					world.popup(scored(world, 'Grabbed!', `-${HAZARD_POINTS}`), b.x, top)
				}
				break
			case 'sewage': {
				// Under it while it's pouring, anywhere from the grate down:
				// splattered, once a wave.
				const drain = sewageAt(o.x, world.ticks())
				if (drain.wave !== (state.lap ?? 0)) {
					state.lap = drain.wave
					state.hit.clear()
				}
				// From its grate, as far down as the pour's got.
				const grate = world.course.cave?.ceiling(o.x) ?? ground - 400
				const reached = Math.min(
					ground,
					grate + (drain.poured + 1) * SEWAGE_FALL,
				)
				if (
					drain.pouring &&
					freshFor(state) &&
					b.stumble === 0 &&
					overlaps(o.x - SEWAGE_REACH, o.x + SEWAGE_REACH, grate, reached)
				) {
					hits(state)
					play('squelch')
					stumble('Splat!')
				}
				break
			}
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
			case 'mummy': {
				const mummy = mummyAt(world, { ...state, obstacle: o })
				const floor = terrain.groundY(mummy.x)
				if (
					freshFor(state) &&
					!state.scooped &&
					b.stumble === 0 &&
					overlaps(mummy.x - 12, mummy.x + 12, floor - MUMMY_HEIGHT, floor)
				) {
					hits(state)
					play('groan')
					stumble('Mmmf!')
				}
				break
			}
			case 'gulls':
				// Into a flock: they scatter, for whoever comes after too.
				if (
					!state.used &&
					b.stumble === 0 &&
					gullsAt(o, ground, world.ticks()).some((g) =>
						overlaps(
							g.x - GULL_WIDTH / 2 + 3,
							g.x + GULL_WIDTH / 2 - 3,
							g.y - GULL_HEIGHT / 2,
							g.y + GULL_HEIGHT / 2,
						),
					)
				) {
					state.used = true
					state.flown = world.ticks()
					play('honk')
					stumble('Squawk!')
				}
				break
			case 'balloon':
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					balloonAt(o, ground, world.ticks()).parts.some((part) =>
						overlap(part, box),
					)
				) {
					hits(state)
					stumble('Bump!')
				}
				break
			case 'storm': {
				// Its cloud, and a bolt out of it as it strikes: once a strike.
				const storm = stormAt(o, ground, world.ticks())
				if (storm.round !== (state.lap ?? 0)) {
					state.lap = storm.round
					state.hit.clear()
				}
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					storm.parts.some((part) => overlap(part, box))
				) {
					hits(state)
					stumble('Zap!')
				}
				break
			}
			case 'turbine':
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					turbineHits(turbineAt(o, ground, world.ticks()), box)
				) {
					hits(state)
					stumble('Clang!')
				}
				break
			case 'whale': {
				// Its spout, as it blows: once a spout.
				const whale = whaleAt(o, ground, world.ticks())
				if (whale.round !== (state.lap ?? 0)) {
					state.lap = whale.round
					state.hit.clear()
				}
				if (
					freshFor(state) &&
					b.stumble === 0 &&
					whale.parts.some((part) => overlap(part, box))
				) {
					hits(state)
					play('squelch')
					stumble('Splosh!')
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
				// Once each: having run into a flock, the rest of it, flown or
				// not, doesn't trip them again.
				if (state.used || b.stumble > 0 || state.hit.has(racer.id)) break
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
					hits(state)
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
							scored(
								world,
								world.course.look?.mudWord ?? 'Squelch!',
								`-${HAZARD_POINTS}`,
							),
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
				// Had already: by anyone, or, if it's there for everyone, by them.
				const had = o.everyone ? state.hit.has(racer.id) : state.used
				if (!had && overlaps(o.x - reach, o.x + reach, y - height - 2, y)) {
					if (o.everyone) {
						hits(state)
						// Gone, once everyone racing's had theirs.
						state.used = world.racers.every((r) => state.hit.has(r.id))
					} else state.used = true
					collect(`fika:${o.item}`)
					b.vx = boost(world, b.vx, b.facing, FIKA_BOOST)
					world.addBonus('fika', FIKA_POINTS)
					world.popup(
						scored(world, PICKUP_WORD[`fika:${o.item}`], `+${FIKA_POINTS}`),
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
					b.vx = boost(world, b.vx, b.facing, BARCODE_BOOST)
					world.addBonus('barcodes', BARCODE_POINTS)
					world.popup(
						scored(world, PICKUP_WORD.barcode, `+${BARCODE_POINTS}`),
						b.x,
						top,
					)
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
					b.vx = boost(world, b.vx, b.facing, PUMPKIN_BOOST)
					world.addBonus('pumpkins', PUMPKIN_POINTS)
					world.popup(
						scored(world, PICKUP_WORD.pumpkin, `+${PUMPKIN_POINTS}`),
						b.x,
						top,
					)
					play('fika')
				}
				break
			case 'ring': {
				// Through it, either way, their middle through its: faster,
				// once each. It lights up.
				const middle = ground - o.height
				if (
					!state.hit.has(racer.id) &&
					b.x - o.x !== 0 &&
					b.x - o.x > 0 !== wasAt - o.x > 0 &&
					Math.abs(b.feetY - bodyHeight(b) / 2 - middle) < RING_ROOM
				) {
					hits(state)
					state.setCheering(RING_GLOW_TICKS)
					b.vx = boost(world, b.vx, b.facing, RING_BOOST)
					world.addBonus('rings', RING_POINTS)
					world.popup(scored(world, 'Ring!', `+${RING_POINTS}`), b.x, top)
					play('scan')
				}
				break
			}
			case 'gate':
				// Through it, either way, on the snow or over it: faster, once
				// each. Its flag flaps.
				if (
					!state.hit.has(racer.id) &&
					b.x - o.x !== 0 &&
					b.x - o.x > 0 !== wasAt - o.x > 0 &&
					b.feetY > ground - GATE_HEIGHT
				) {
					hits(state)
					state.setCheering(GATE_FLAP_TICKS)
					b.vx = boost(world, b.vx, b.facing, GATE_BOOST)
					world.addBonus('gates', GATE_POINTS)
					world.popup(scored(world, 'Gate!', `+${GATE_POINTS}`), b.x, top)
					play('scan')
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
					b.vx = boost(world, b.vx, b.facing, CHEER_BOOST)
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

/** Over the line ahead of it, how far past the finish the bus pulls up, its scoop's front. */
const BUS_PARKS_PAST = 220
/** And how quickly it slows to a stop there: a share of the way left, a tick. */
const BUS_PARKING = 0.05

/** How tall a snowman is, to ski into. */
export const SNOWMAN_HEIGHT = 44
/** How tall a slalom gate is: through it, or clean over it. */
export const GATE_HEIGHT = 110
/** How long a slalom gate's flag flaps, gone through. */
const GATE_FLAP_TICKS = 30

/**
 * How much the hill at `x` changes the bus's pace, out of its own: slowed
 * going up it, as everyone is; and down a ski slope, on skis, faster.
 */
function busHill(world: World, x: number) {
	const slope = world.terrain.slope(x - BUS_MIDDLE_BEHIND)
	const uphill =
		Math.min(0, hillPull(slope)) *
		BUS_HILL_PULL *
		(world.course.busHillPull ?? 1)
	const downhill = Math.max(0, slope) * (world.course.busDownhill ?? 0)
	return Math.max(0.3, 1 + uphill) * (1 + downhill)
}

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
	if (phase === 'finished' && !world.round) {
		// Beaten to the line: it comes on in to the finish anyway, however far
		// back it is, and pulls up just past the line, in view behind the
		// summary, rather than stopping wherever it was.
		const left = world.terrain.finishX + BUS_PARKS_PAST - bus.frontX
		bus.speed = Math.max(
			0,
			Math.min(Math.max(bus.speed, BUS_TOP_SPEED), left * BUS_PARKING),
		)
		bus.frontX += Math.min(left, bus.speed * busHill(world, bus.frontX))
	} else if (driving >= 0) {
		if (phase === 'finished') bus.speed *= 0.97
		else {
			const ramp = Math.min(1, driving / BUS_RAMP_TICKS)
			// Out at sea, it's under full steam, whatever its pace on land.
			bus.speed = Math.max(
				BUS_START_SPEED + (BUS_TOP_SPEED - BUS_START_SPEED) * ramp,
				seaPace(world, bus.frontX),
			)
		}
		// Slowed going uphill, as everyone is: its wheels' slope. Down a ski
		// slope, faster, but never faster than anyone can go.
		const pace = bus.speed * busHill(world, bus.frontX)
		bus.frontX += world.course.busDownhill
			? Math.min(pace, topSpeed(world) - ROUND_SEA_SLACK)
			: pace
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
		bus.leash += leashGrowth(
			bus.leash,
			world.round ? ROUND_BUS_LEASH_MAX : BUS_LEASH_MAX,
		)
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
	body.gliding = false
	body.grounded = false
	body.ducking = false
	body.trick = undefined
	body.turn = 0
	body.grind = undefined
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
		if (o.kind === 'mummy') {
			if (state.scooped) continue
			const mummy = mummyAt(world, { ...state, obstacle: o })
			if (bus.frontX < mummy.x - 12) continue
			state.used = true
			state.scooped = {
				at: world.ticks(),
				vx: Math.max(bus.speed, 2) + 2 + Math.random() * 2,
				x: mummy.x,
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
			o.kind === 'tourists' ||
			// A snowman, still stood up.
			(o.kind === 'snowman' && !state.used)
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
 * `BUS_LEASH_FULL`, then less and less, to nothing at `max` (longer in a Round).
 */
function leashGrowth(leash: number, max: number) {
	if (leash < BUS_LEASH_FULL) return BUS_LEASH_GROWTH
	const range = max - BUS_LEASH_FULL
	const left = Math.max(0, (max - leash) / range)
	// A longer leash lets out faster too, to get there in the same time.
	const faster = range / (BUS_LEASH_MAX - BUS_LEASH_FULL)
	return BUS_LEASH_LATE_GROWTH * faster * left * left
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
 * How far over where they last stood someone can be in the air before the
 * camera looks up after them, rather than at where they stood: higher than
 * any jump, or a Steam Vent, goes; up a Giant Vent, out of a sewer. Flying
 * that high, it keeps them this far under the top of the screen, as if
 * they were stood this far under where they are.
 */
const CAMERA_FLY_ROOM = 220
const CAMERA_FLY_UNDER = 120
/** How far under where they last stood someone can drop before the camera hurries down after them. */
const CAMERA_DROP_ROOM = 60
/** How quickly it looks up, after someone flying that high: quick enough to keep up. */
const CAMERA_FLY_LIFT = 0.25
/** Whether someone's flying high, over where they last stood: see `CAMERA_FLY_ROOM`. */
const flyingHigh = (b: Body) => b.feetY < b.floor - CAMERA_FLY_ROOM
/**
 * What the camera keeps in view, for someone, highest and lowest: where they
 * last stood, and their feet, falling; or up after them, flying high,
 * leaving where they stood behind.
 */
const lookAt = (b: Body) =>
	flyingHigh(b)
		? { high: b.feetY + CAMERA_FLY_UNDER, low: b.feetY + CAMERA_FLY_UNDER }
		: { high: b.floor, low: Math.max(b.floor, b.feetY) }

/**
 * The highest the Ground goes from `x` to the course's `lookAhead` past it,
 * the way they're facing: up a mountain, what the camera looks up to, so
 * the climb ahead's in view. Where they stood, `high`, otherwise.
 */
function upAhead(world: World, x: number, facing: number, high: number) {
	const ahead = world.course.lookAhead
	if (!ahead) return high
	const { terrain } = world
	let top = high
	for (let along = 40; along <= ahead; along += 40) {
		const at = x + along * facing
		if (!terrain.inGap(at)) top = Math.min(top, terrain.groundY(at))
	}
	return top
}

/**
 * How far below someone the camera looks, at most, down the slope ahead:
 * so they're still well down from the top of the screen.
 */
const LOOK_DOWN_MOST = 330

/**
 * The lowest the Ground goes from `b` to the course's `lookDown` past it,
 * the way they're facing, down a mountain: what the camera looks down to,
 * so the slope ahead's in view, off a ski jump too; but never so far it
 * loses them off the top. `low`, otherwise.
 */
function downAhead(world: World, b: Body, low: number) {
	const ahead = world.course.lookDown
	if (!ahead) return low
	const { terrain } = world
	let bottom = low
	for (let along = 40; along <= ahead; along += 40) {
		const at = b.x + along * b.facing
		if (!terrain.inGap(at)) bottom = Math.max(bottom, terrain.groundY(at))
	}
	return Math.max(low, Math.min(bottom, b.feetY + LOOK_DOWN_MOST))
}

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

/** How much sky over a glider's highest, and sea under the surface, the camera shows gliding. */
const GLIDE_SKY_ROOM = 90
const GLIDE_SEA_ROOM = 40

/**
 * Out over the sea on a glider, the whole sky's in view, from the waves up
 * to as high as a glider goes, so whichever way through is open can be
 * seen coming: the highest and lowest a camera looking up from `high` to
 * `low` would show it, zoomed out to fit.
 */
function glideView(world: World) {
	const { sea, sky } = world.course
	if (!sea || sky === undefined) return undefined
	const top = sky - GLIDE_SKY_ROOM
	const bottom = sea.level + GLIDE_SEA_ROOM
	return {
		high: top + CAMERA_HEADROOM,
		low: bottom - CAMERA_FOOTROOM,
		zoom: Math.min(MAX_ZOOM, Math.max(1, (bottom - top) / VIEW_HEIGHT)),
	}
}

function stepCamera(world: World) {
	// Left where it is: to watch them fly off, fall, or run off.
	const phase = world.phase()
	if (phase === 'scooped' || phase === 'fallen' || phase === 'finished') return
	const b = world.body
	// Zoomed out to the whole sky, gliding; back in, once down.
	const gliding = b.gliding ? glideView(world) : undefined
	const zoom = world.zoom()
	const wantZoom = gliding?.zoom ?? 1
	if (Math.abs(wantZoom - zoom) > 0.001)
		world.setZoom(zoom + (wantZoom - zoom) * ZOOM_EASE)
	const view = gliding ?? lookAt(b)
	// Up a mountain, up the climb ahead too; down one, down the slope ahead.
	if (!gliding && !flyingHigh(b))
		view.high = upAhead(world, b.x, b.facing, view.high)
	if (!gliding) view.low = downAhead(world, b, view.low)
	const targetY = cameraYFor(view.high, view.low, world.zoom())
	const cameraY = world.cameraY()
	// Quick after them, flying high, or dropping a long way.
	const dropping = b.feetY > b.floor + CAMERA_DROP_ROOM
	const lift = flyingHigh(b) || dropping ? CAMERA_FLY_LIFT : CAMERA_LIFT
	if (targetY !== cameraY) {
		const eased = cameraY + (targetY - cameraY) * lift
		// And never so slow their feet go off the bottom of the screen.
		const keepFeet = b.feetY + CAMERA_FOOTROOM - VIEW_HEIGHT
		world.setCameraY(Math.min(0, Math.max(eased, keepFeet)))
	}
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
export const MAX_ZOOM = 3
/** How quickly it zooms, a share a tick. */
const ZOOM_EASE = 0.04

/**
 * A Round's camera: everyone still running in view, zoomed out up to
 * `MAX_ZOOM` to fit them all, the leader with room ahead. Anyone further
 * back than that, the bus has got (see `ROUND_BUS_LEASH_MAX`). Through the
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
	// And up and down: from the highest anyone's stood to the lowest; the
	// whole sky, with anyone gliding.
	const glide = running.some((r) => r.body.gliding)
		? glideView(world)
		: undefined
	const high = Math.min(
		glide?.high ?? Number.POSITIVE_INFINITY,
		...running.map((r) =>
			flyingHigh(r.body)
				? lookAt(r.body).high
				: upAhead(world, r.body.x, r.body.facing, lookAt(r.body).high),
		),
	)
	const low = Math.max(
		glide?.low ?? Number.NEGATIVE_INFINITY,
		...running.map((r) =>
			downAhead(
				world,
				r.body,
				flyingHigh(r.body) ? lookAt(r.body).low : r.body.floor,
			),
		),
	)
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
