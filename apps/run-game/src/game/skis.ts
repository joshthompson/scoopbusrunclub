import type { Rail } from '../courses/types'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { boardOf } from './boards'
import { PICKUP_WORD } from './collectables'
import {
	AIR_PUSH,
	CORGI_POINTS,
	DAZED_SPEED,
	GRAVITY,
	GRIND_DRAG,
	GRIND_POINTS,
	GRIND_POINTS_MAX,
	GRIND_POINTS_TICK,
	HAZARD_POINTS,
	HITBOX_HALF_WIDTH,
	JUMP_SPEED,
	LEFT_EDGE,
	PACER_FASTEST,
	PACER_SLOWEST,
	PX_PER_M,
	SKI_BRAKE,
	SKI_DRAG,
	SKI_JUMP_K_BONUS,
	SKI_JUMP_POINTS_M,
	SKI_JUMP_POINTS_MAX,
	SKI_JUMP_POP,
	SKI_JUMP_TABLE,
	SKI_LAUNCH_GIVE,
	SKI_LAUNCH_MAX,
	SKI_POLE_PUSH,
	SKI_POP,
	SKI_PULL,
	SKI_PUSH,
	SKI_PUSH_TO,
	SKI_TUCK_DRAG,
	SKI_TUCK_OVER,
	SKI_TUCK_OVER_ROUND,
	STAND_HEIGHT,
	TRICK_BOOST,
	TRICK_LAND_GIVE,
	TRICK_POINTS,
	TRICK_POINTS_MAX,
	WIPEOUT_KEEP,
	WIPEOUT_TICKS,
	topSpeed,
} from './constants'
import { boost, scored, shielded } from './step'
import type { Body, Pacer, Racer, TrickKind, World } from './world'

/**
 * The Slopes' skis and snowboards: a rack of them, stood up in the snow at
 * the top, one for everyone and more. Run into a pair and they're yours, the
 * whole way down. Downhill, the snow carries you on, faster the steeper it
 * is; tuck down for more, pole along the flat, snowplough to slow. Off a
 * kicker's lip you fly;
 * press a way in the air for a trick, up a forward roll, left a backflip,
 * right a 360, down a grab, held as long as down is, and land it, for
 * points and speed, or land in the middle of a flip or a spin and wipe out;
 * a grab, they can land still holding. Come down on a rail and grind it.
 */

/** How near a pair stood up in the rack has to be to run into it, and how tall it is to jump clean over. */
const RACK_REACH = HITBOX_HALF_WIDTH + 8
const RACK_TALL = 44

/** Into a pair stood up in the snow: on them, and off down the hill. */
export function grabBoard(world: World, racer: Racer) {
	const b = racer.body
	if (b.board) return
	for (const c of world.corgis) {
		if (c.state !== 'waiting') continue
		if (Math.abs(b.x - c.x) > RACK_REACH) continue
		// Jumped clean over them: not had.
		if (b.feetY < c.feetY - RACK_TALL) continue
		c.state = 'ridden'
		c.rider = racer.id
		b.board = c.id + 1
		b.ducking = false
		b.stumble = 0
		b.vy = 0
		const { kind } = boardOf(b.board)
		collect(`ride:${kind}`)
		world.addBonus('corgis', CORGI_POINTS)
		world.popup(
			scored(world, PICKUP_WORD[`ride:${kind}`], `+${CORGI_POINTS}`),
			b.x,
			b.feetY - STAND_HEIGHT - 40,
		)
		play('whoosh')
		return
	}
}

/**
 * One of the pack, into a pair in the rack: as anyone, but only one going
 * spare, with one still left for every Player who hasn't got one.
 */
export function grabPacerBoard(world: World, p: Pacer) {
	if (p.board || !p.grounded) return
	const waiting = world.corgis.filter((c) => c.state === 'waiting')
	const needing = world.racers.filter((r) => !r.out && !r.body.board).length
	if (waiting.length <= needing) return
	const c = waiting.find((c) => Math.abs(p.x - c.x) < RACK_REACH)
	if (!c) return
	c.state = 'ridden'
	c.rider = `pacer:${p.id}`
	p.board = c.id + 1
}

// --- Tricks -----------------------------------------------------------------

/** How long each trick takes, in ticks: one jump off the flat's only just long enough for one. */
export const TRICK_TICKS: Record<TrickKind, number> = {
	spin: 28,
	backflip: 32,
	frontflip: 32,
	grab: 18,
}

/** Smoothly from 0 to 1: slow in, quick through the middle, slow out. */
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * How far round someone is `ticks` into a trick, in degrees: right round
 * for a spin, back over for a backflip, forward, curled up, for a forward
 * roll. A grab doesn't turn them; it's a pose.
 */
export function trickTurn(kind: TrickKind, ticks: number) {
	const t = ease(Math.min(1, ticks / TRICK_TICKS[kind]))
	if (kind === 'spin') return 360 * t
	if (kind === 'backflip') return -360 * t
	if (kind === 'frontflip') return 360 * t
	return 0
}

/**
 * What a run of tricks in one go in the air is called: the same one
 * again and again said once, doubled up. Two spins are a 720.
 */
export function trickName(tricks: TrickKind[], board: number) {
	const names: string[] = []
	let i = 0
	while (i < tricks.length) {
		const kind = tricks[i]
		let n = 1
		while (tricks[i + n] === kind) n++
		i += n
		const times =
			n === 1 ? '' : n === 2 ? 'Double ' : n === 3 ? 'Triple ' : `${n}× `
		if (kind === 'spin') names.push(`${360 * n}`)
		else if (kind === 'backflip') names.push(`${times}backflip`)
		else if (kind === 'frontflip') names.push(`${times}forward roll`)
		else names.push(`${times}grab`)
	}
	const said = names.join(' + ')
	return said.charAt(0).toUpperCase() + said.slice(1)
}

/**
 * Which trick a way pressed in the air does, if one's just been pressed:
 * up a forward roll, left a backflip, right a 360, down a grab.
 */
function trickPressed(b: Body, held: Held): TrickKind | undefined {
	if (held.up && !b.wasUp) return 'frontflip'
	if (held.left && !b.wasLeft) return 'backflip'
	if (held.right && !b.wasRight) return 'spin'
	if (held.down && !b.wasDown) return 'grab'
	return undefined
}

/** Into a trick, in the air, if they're not in one already. */
function startTrick(b: Body, kind: TrickKind) {
	if (b.trick || b.wipeout > 0) return
	b.trick = kind
	b.trickTicks = 0
	play('whoosh')
}

/** A tick of a trick: on round, and done, once it's all the way. */
function turnTrick(world: World, racer: Racer, held: Held) {
	const b = racer.body
	if (!b.trick) return
	b.trickTicks++
	b.turn = trickTurn(b.trick, b.trickTicks)
	if (b.trickTicks < TRICK_TICKS[b.trick]) return
	// A grab's held as long as down is: done once it's let go.
	if (b.trick === 'grab' && held.down) return
	b.airTricks.push(b.trick)
	world.popup(
		`${trickName([b.trick], b.board)}!`,
		b.x,
		b.feetY - STAND_HEIGHT - 24,
	)
	b.trick = undefined
	b.turn = 0
}

/** How long a grab has to be held to count, landed still holding it. */
const GRAB_LANDS = 8

/**
 * Whether they're in the middle of a trick, too far from done to land it:
 * a flip or a spin. Never a grab: they can land still holding that.
 */
const midTrick = (b: Body) =>
	!!b.trick &&
	b.trick !== 'grab' &&
	b.trickTicks < TRICK_TICKS[b.trick] - TRICK_LAND_GIVE

/** Down still holding a grab: it counts, if they've held it long enough, and they let go. */
function landGrab(world: World, b: Body) {
	if (b.trick !== 'grab') return
	if (b.trickTicks >= GRAB_LANDS) {
		b.airTricks.push('grab')
		world.popup('Grab!', b.x, b.feetY - STAND_HEIGHT - 24)
	}
	b.trick = undefined
	b.turn = 0
}

/**
 * Down in the middle of a trick: in a heap in the snow, slowed right
 * down, and the tricks done this go lost.
 */
function wipeout(world: World, racer: Racer) {
	const b = racer.body
	b.trick = undefined
	b.turn = 0
	b.airTricks = []
	b.launchX = undefined
	// A helmet takes the knock: down on their skis after all, and it's off.
	if (shielded(world, b)) return
	b.wipeout = WIPEOUT_TICKS
	b.stumble = WIPEOUT_TICKS
	b.ducking = false
	b.vx *= WIPEOUT_KEEP
	play('stumble')
	world.addBonus('hazards', -HAZARD_POINTS)
	world.popup(
		scored(world, 'Wipeout!', `-${HAZARD_POINTS}`),
		b.x,
		b.feetY - STAND_HEIGHT,
	)
}

/**
 * Down from the air with the tricks done in it: points for each, doubling
 * for each more, and faster for each. A trick all but done counts.
 */
function landTricks(world: World, racer: Racer) {
	const b = racer.body
	if (b.trick && b.trickTicks >= TRICK_TICKS[b.trick] - TRICK_LAND_GIVE)
		b.airTricks.push(b.trick)
	b.trick = undefined
	b.turn = 0
	const tricks = b.airTricks
	b.airTricks = []
	if (!tricks.length) return
	let points = 0
	tricks.forEach((_, i) => {
		const each = Math.min(TRICK_POINTS_MAX, TRICK_POINTS * 2 ** i)
		world.addBonus('tricks', each)
		points += each
	})
	b.vx = boost(world, b.vx, 1, TRICK_BOOST * tricks.length)
	const combo = tricks.length > 1 ? ` ×${tricks.length}` : ''
	world.popup(
		world.round ? `Landed!${combo}` : `Landed! +${points}${combo}`,
		b.x,
		b.feetY - STAND_HEIGHT - 44,
	)
	play('trick')
}

// --- Rails ------------------------------------------------------------------

/** The top of a Rail at `x`: its height over the Ground there. */
export const railTop = (world: Pick<World, 'terrain'>, rail: Rail, x: number) =>
	world.terrain.groundY(x) - rail.height

/** Which Rail, if any, someone coming down from `fromY` at `fromX` to `toY` at `toX` lands on. */
function railUnder(
	world: World,
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
) {
	const rails = world.course.rails ?? []
	return rails.findIndex(
		(rail) =>
			toX >= rail.from &&
			toX <= rail.to &&
			fromY <= railTop(world, rail, Math.max(rail.from, fromX)) + 2 &&
			toY >= railTop(world, rail, toX),
	)
}

/** Whether Rail `i` is a roof, to ski along, not grind. */
const onRoof = (world: World, i: number | undefined) =>
	i !== undefined && world.course.rails?.[i]?.look === 'roof'

/**
 * Up into a roof from under it, going up: a bump on the head, and no
 * higher. `fromY` was where their feet were, under its top.
 */
function underRoof(world: World, b: Body, fromY: number) {
	for (const rail of world.course.rails ?? []) {
		if (rail.look !== 'roof' || b.x < rail.from || b.x > rail.to) continue
		const top = railTop(world, rail, b.x)
		const under = top + (rail.thick ?? 0)
		if (fromY > top && b.feetY - STAND_HEIGHT < under) {
			b.feetY = under + STAND_HEIGHT
			b.vy = Math.max(0, b.vy)
		}
	}
}

/** Off the end of a Rail, or jumped or dropped off it: points for how long they ground it. */
function endGrind(world: World, racer: Racer) {
	const b = racer.body
	if (b.grind === undefined) return
	const roof = onRoof(world, b.grind)
	b.grind = undefined
	// Off a roof: nothing ground.
	if (roof) {
		b.grindTicks = 0
		return
	}
	const points = Math.min(
		GRIND_POINTS_MAX,
		GRIND_POINTS + b.grindTicks * GRIND_POINTS_TICK,
	)
	b.grindTicks = 0
	world.addBonus('grinds', points)
	world.popup(
		scored(world, 'Grind!', `+${points}`),
		b.x,
		b.feetY - STAND_HEIGHT - 30,
	)
	b.vx = boost(world, b.vx, 1, 0.6)
}

// --- On skis ----------------------------------------------------------------

interface Held {
	up: boolean
	down: boolean
	left: boolean
	right: boolean
}

/** How far down a Gap they're gone, under the Ground's line: Fallen. */
const FALL_DEPTH = 160
/** How far under the far side of a Gap's edge they can come down and still land on it. */
const WALL_GIVE = 14
/** How fast they glide on, over the line, and how quickly they settle to it. */
const RUN_OFF_SPEED = 6

/**
 * Off the snow, into the air: where they took off from, if it's the ski
 * jump, so how far they fly can be measured.
 */
function takeOff(world: World, b: Body) {
	b.grounded = false
	// Up off the snow, out of a tuck: down again, in the air, for a grab.
	b.ducking = false
	b.airTricks = []
	const jump = world.course.skiJump
	b.launchX =
		jump && Math.abs(b.x - jump.takeoff) < 50 && b.vx > 4 ? b.x : undefined
}

/**
 * Down onto the snow, from the air: tricks landed, or a wipeout, and how
 * far they flew off the ski jump.
 */
function land(world: World, racer: Racer, ground: number) {
	const b = racer.body
	b.feetY = ground
	b.grounded = true
	b.jumping = false
	// Following the snow from here.
	b.vy = world.terrain.groundY(b.x + b.vx) - ground
	const from = b.launchX
	b.launchX = undefined
	if (midTrick(b)) return wipeout(world, racer)
	landGrab(world, b)
	landTricks(world, racer)
	if (from !== undefined) measureJump(world, racer, from)
}

/** Off the ski jump and down: how far, in metres, a tenth at a time, and points for it. */
function measureJump(world: World, racer: Racer, from: number) {
	const b = racer.body
	const jump = world.course.skiJump
	if (!jump) return
	const metres = Math.round(((b.x - from) / PX_PER_M) * 10) / 10
	if (metres < 20) return
	const k = jump.k / PX_PER_M
	const past = metres >= k
	const points = Math.min(
		SKI_JUMP_POINTS_MAX,
		Math.round(metres * SKI_JUMP_POINTS_M + (past ? SKI_JUMP_K_BONUS : 0)),
	)
	world.addBonus('jumps', points)
	world.popup(
		world.round
			? `${metres.toFixed(1)} m!`
			: `${metres.toFixed(1)} m! +${points}`,
		b.x,
		b.feetY - STAND_HEIGHT - 70,
	)
	if (past) world.popup('Past the K-point!', b.x, b.feetY - STAND_HEIGHT - 100)
	play('cheer')
}

/**
 * A tick on skis or a snowboard: carried on down the hill, tucked, poling
 * or snowploughing; off the snow and into the air off a kicker's lip, or
 * a jump, a trick in the air, and down again, landing it or not; or along
 * a Rail. True if they've gone down a Gap.
 */
export function stepSkiing(
	world: World,
	racer: Racer,
	held: Held,
	racing: boolean,
) {
	const { terrain } = world
	const b = racer.body
	const { up, down, left, right } = held
	b.on = undefined
	b.mount = 0
	if (b.stumble > 0) b.stumble--
	if (b.wipeout > 0) b.wipeout--
	const canDrive = b.stumble === 0
	const pressed = up && !b.wasUp
	const rails = world.course.rails ?? []

	if (b.grounded) {
		// On a rail, grinding it; along a roof, just skiing.
		const grinding = b.grind !== undefined && !onRoof(world, b.grind)
		const slope = terrain.slope(b.x)
		// Down on the snow, tucked: lower, and faster; not grinding a rail,
		// where down's off it.
		b.ducking = racing && down && !grinding && b.wipeout === 0
		if (!racing) {
			// Over the line: gliding on, stood up, settling to an easy pace.
			b.vx += (RUN_OFF_SPEED - b.vx) * 0.03
		} else if (b.wipeout > 0) {
			// In a heap in the snow: sliding to a stop, then up again.
			b.vx *= 0.95
		} else {
			b.vx += slope * SKI_PULL
			if (right && canDrive && b.vx < SKI_PUSH_TO)
				b.vx = Math.min(SKI_PUSH_TO, b.vx + SKI_PUSH)
			// Down tapped, going slowly: a push off the poles, skis or board.
			if (down && !b.wasDown && canDrive && !grinding && b.vx < SKI_PUSH_TO)
				b.vx = Math.min(SKI_PUSH_TO, Math.max(0, b.vx) + SKI_POLE_PUSH)
			if (left && canDrive)
				b.vx = b.vx > 0.4 ? b.vx * SKI_BRAKE : Math.max(-2, b.vx - 0.08)
			b.vx -=
				b.vx * (grinding ? GRIND_DRAG : b.ducking ? SKI_TUCK_DRAG : SKI_DRAG)
		}
		if (racing && down && grinding) {
			// Off the side of the Rail, down onto the snow.
			endGrind(world, racer)
			b.grounded = false
			b.vy = 1
		} else if (racing && pressed && b.wipeout === 0) {
			// A jump: higher, going up a kicker, popped off it; on the ski
			// jump's table, a ski jumper's pop.
			endGrind(world, racer)
			const jump = world.course.skiJump
			const table =
				jump && b.x > jump.takeoff - SKI_JUMP_TABLE && b.x <= jump.takeoff
			b.vy = table
				? Math.min(b.vy, 0) - SKI_JUMP_POP
				: Math.max(-SKI_LAUNCH_MAX, -JUMP_SPEED + Math.min(0, b.vy) * SKI_POP)
			b.ducking = false
			takeOff(world, b)
			play('jump')
		}
	} else {
		b.vy += GRAVITY
		if (right) b.vx += AIR_PUSH
		if (left) b.vx -= AIR_PUSH
		// A way pressed in the air, a trick.
		const trick = racing ? trickPressed(b, held) : undefined
		if (trick) startTrick(b, trick)
		turnTrick(world, racer, held)
	}
	// Tucked, a little faster than anyone else can go.
	const tuck = b.ducking
		? world.round
			? SKI_TUCK_OVER_ROUND
			: SKI_TUCK_OVER
		: 0
	const top = topSpeed(world) + tuck
	b.vx = Math.max(-top, Math.min(top, b.vx))
	b.facing = b.vx < -0.5 ? -1 : 1

	const fromX = b.x
	const fromY = b.feetY
	b.x = Math.max(LEFT_EDGE, b.x + b.vx)
	const ground = terrain.groundY(b.x)
	const overGap = terrain.inGap(b.x)

	if (b.grounded) {
		const rail = b.grind !== undefined ? rails[b.grind] : undefined
		if (rail) {
			if (b.x < rail.from || b.x > rail.to) {
				// Off its end: on, the way it was going.
				endGrind(world, racer)
				b.feetY = fromY + b.vy
				takeOff(world, b)
			} else {
				const y = railTop(world, rail, b.x)
				b.vy = y - fromY
				b.feetY = y
				b.grindTicks++
			}
		} else if (overGap) {
			b.feetY = fromY + b.vy
			takeOff(world, b)
		} else if (ground > fromY + b.vy + GRAVITY + SKI_LAUNCH_GIVE) {
			// The snow's dropped away under them faster than they'd fall: off
			// it, flying, still going up if they were going up a kicker.
			b.vy = Math.max(-SKI_LAUNCH_MAX, b.vy)
			b.feetY = fromY + b.vy
			takeOff(world, b)
		} else {
			b.vy = ground - fromY
			b.feetY = ground
		}
	} else {
		b.feetY += b.vy
		if (b.vy < 0) underRoof(world, b, fromY)
		const onto = b.vy >= 0 ? railUnder(world, fromX, fromY, b.x, b.feetY) : -1
		if (onto >= 0 && racing) {
			const rail = rails[onto]
			if (midTrick(b)) {
				// Onto a rail mid-trick: off it, in a heap.
				wipeout(world, racer)
			} else {
				b.launchX = undefined
				landGrab(world, b)
				landTricks(world, racer)
				b.grind = onto
				b.grindTicks = 0
				b.grounded = true
				b.feetY = railTop(world, rail, b.x)
				b.vy = 0
				if (rail.look !== 'roof') play('grind')
			}
		} else if (!overGap && b.feetY >= ground) {
			// Come up short, down in a creek: into its far wall, and on down.
			const creek = terrain.gaps.find((g) => fromX >= g.from && fromX < g.to)
			if (creek && b.feetY > ground + WALL_GIVE) {
				b.x = creek.to - HITBOX_HALF_WIDTH - 1
				b.vx = 0
			} else land(world, racer, ground)
		} else if (overGap && b.feetY > ground + FALL_DEPTH) return racing
	}
	if (b.grounded) b.floor = b.feetY
	return false
}

// --- The pack, on skis --------------------------------------------------------

/** How fast the pack ski, the slowest of them and the quickest, on the flat; faster downhill. */
const PACER_SKI_SLOWEST = 5
const PACER_SKI_FASTEST = 7.6
/** How much faster they let themselves go for a slope's steepness, at most. */
const PACER_SKI_SLOPE = 7
const PACER_SKI_STEEPEST = 3
/** How quickly they get to it. */
const PACER_SKI_GRIP = 0.04
/** How far past a Gap the pack mean to come down, leaping it. */
const PACER_GAP_PAST = 60
/** How often they try a trick, in the air long enough for one. */
const PACER_TRICKS = 0.7

/**
 * A tick of one of the pack on skis: down the hill at their own pace,
 * hopping what's in the way and jumping what's too wide to ski over,
 * flying off kickers, and now and then a trick in the air, always landed.
 * Never down a Gap: Pacers never fall.
 */
export function skiPacer(
	world: World,
	p: Pacer,
	hopAhead: (x: number) => boolean,
) {
	const { terrain } = world
	if (p.dazed > 0) p.dazed--
	if (p.grounded) {
		const slope = terrain.slope(p.x)
		const pace =
			p.dazed > 0
				? DAZED_SPEED
				: PACER_SKI_SLOWEST +
					((p.pace - PACER_SLOWEST) / (PACER_FASTEST - PACER_SLOWEST)) *
						(PACER_SKI_FASTEST - PACER_SKI_SLOWEST)
		const want =
			pace +
			Math.max(
				-PACER_SKI_STEEPEST,
				Math.min(PACER_SKI_STEEPEST, slope * PACER_SKI_SLOPE),
			)
		p.vx += (want - p.vx) * PACER_SKI_GRIP
		const gap = terrain.gaps.find(
			(g) => g.from > p.x && g.from - p.x < 24 + p.vx,
		)
		if (gap || (p.dazed === 0 && hopAhead(p.x))) {
			p.grind = undefined
			p.vy = gap ? -JUMP_SPEED - 1 : -8
			// Across a Gap, however wide: fast enough to be over it by the time
			// they're back down to the height they left from.
			if (gap)
				p.vx = Math.max(
					p.vx,
					(gap.to + PACER_GAP_PAST - p.x) / ((2 * -p.vy) / GRAVITY),
				)
			p.grounded = false
			airborne(p)
		}
	} else {
		p.vy += GRAVITY
		if (p.trick) {
			p.trickTicks = (p.trickTicks ?? 0) + 1
			p.turn = trickTurn(p.trick, p.trickTicks)
			if (p.trickTicks >= TRICK_TICKS[p.trick]) {
				p.trick = undefined
				p.turn = 0
			}
		}
	}

	const fromX = p.x
	const fromY = p.feetY
	p.x += p.vx
	const ground = terrain.groundY(p.x)
	const rails = world.course.rails ?? []
	if (p.grounded) {
		const rail = p.grind !== undefined ? rails[p.grind] : undefined
		if (rail) {
			if (p.x > rail.to) {
				p.grind = undefined
				p.feetY = fromY + p.vy
				p.grounded = false
				airborne(p)
			} else {
				const y = railTop(world, rail, p.x)
				p.vy = y - fromY
				p.feetY = y
			}
		} else if (ground > fromY + p.vy + GRAVITY + SKI_LAUNCH_GIVE) {
			p.vy = Math.max(-SKI_LAUNCH_MAX, p.vy)
			p.feetY = fromY + p.vy
			p.grounded = false
			airborne(p)
		} else {
			p.vy = ground - fromY
			p.feetY = ground
		}
	} else {
		p.feetY += p.vy
		const onto = p.vy >= 0 ? railUnder(world, fromX, fromY, p.x, p.feetY) : -1
		if (onto >= 0) {
			p.grind = onto
			p.grounded = true
			p.feetY = railTop(world, rails[onto], p.x)
			p.vy = 0
			p.trick = undefined
			p.turn = 0
		} else if (p.feetY >= ground) {
			// Down, over a Gap too: always landed.
			p.feetY = ground
			p.grounded = true
			p.vy = terrain.groundY(p.x + p.vx) - ground
			p.trick = undefined
			p.turn = 0
		}
	}
}

/**
 * Off into the air, one of the pack: if it looks like they'll be up long
 * enough for one, now and then a trick.
 */
function airborne(p: Pacer) {
	if (p.vy > -5 || Math.random() > PACER_TRICKS) return
	const kinds: TrickKind[] = ['spin', 'backflip', 'frontflip', 'grab', 'spin']
	p.trick = kinds[Math.floor(Math.random() * kinds.length)]
	p.trickTicks = 0
	p.turn = 0
}
