import type { Course } from '../courses/types'
import { geeseWidth } from '../draw/art/geese'
import { kidsWidth } from '../draw/art/kids'
import { touristsWidth } from '../draw/art/tourists'
import { guests } from '../runners/guests'
import { DEFAULT_AVATAR, pickAny, randomAvatar } from '../runners/looks'
import { MEMBERS, type Playable, lookSprite } from '../runners/playable'
import { SKELETON_SPRITE } from '../runners/skeleton'
import { play } from '../sfx'
import { BOARDS } from './boards'
import { ceilingAt, inTunnel, rockOver } from './cave'
import {
	BUS_LEASH_MAX,
	CAMERA_LEAD,
	DAZED_SPEED,
	DAZED_TICKS,
	DUCK_HEIGHT,
	GRAVITY,
	HILL_PULL,
	HITBOX_HALF_WIDTH,
	JUMP_SPEED,
	MEMBER_SHARE,
	PACER_EVERY_SPREAD,
	PACER_EVERY_TICKS,
	PACER_FASTEST,
	PACER_SLOWEST,
	RUNNER_SCALE,
	STAND_HEIGHT,
	START_X,
	STOMP_BOOST,
	STOMP_BOUNCE,
	STOMP_BOUNCE_HELD,
	STOMP_POINTS,
	STOMP_POINTS_MAX,
	VIEW_HEIGHT,
	VIEW_WIDTH,
	hillPull,
} from './constants'
import { cyclistAt } from './cyclists'
import { rideCondor } from './flyers'
import { atSea, flyPacer } from './gliders'
import { mummyAt } from './mummies'
import { landingOn, platformAt, platformMove } from './platforms'
import { isHeld, shrunkAt } from './portals'
import { swampManAt } from './sewer'
import { skiPacer } from './skis'
import { steamFires } from './steam'
import { boost } from './step'
import type { Terrain } from './terrain'
import { type Pacer, type Racer, START_GAP, type World } from './world'
import { zombieAt } from './zombies'

/**
 * The pack: everyone else out running Haga. They plod along slower than you,
 * hop the rocks and the mud, and get scooped if the bus catches them. Land on
 * one's head and you bounce off it, faster, for points.
 */

/** For anyone who isn't a club member. Nothing the pixel font can't letter. */
const NAMES = [
	'Anders',
	'Astrid',
	'Axel',
	'Ebba',
	'Elsa',
	'Erik',
	'Freja',
	'Frida',
	'Gustav',
	'Hanna',
	'Hugo',
	'Ida',
	'Ingrid',
	'Johan',
	'Karin',
	'Klara',
	'Lars',
	'Linnea',
	'Magnus',
	'Maja',
	'Nils',
	'Olof',
	'Oskar',
	'Saga',
	'Sven',
	'Tove',
	'Ulla',
	'Viktor',
	'Wilma',
]

/** How hard they hop a rock or a puddle. */
const HOP_SPEED = 8
/** How far ahead they see one coming, and hop. */
const HOP_LOOKAHEAD = 28
/** How quickly they get up to their pace. */
const PACER_GRIP = 0.05
/** Hills slow them down and speed them up, a bit: they're used to Haga. */
const PACER_HILL_PULL = HILL_PULL * 0.5
/** Landing this far into someone's head still counts as on top of it. */
const HEAD_GIVE = 6
/** And this far either side of the middle of them. */
const HEAD_REACH = HITBOX_HALF_WIDTH + 10
/**
 * How far off the left of the screen someone being scooped is still heard:
 * as far back as the bus ever gets (`BUS_LEASH_MAX`, less the runner's lead).
 */
export const SCOOP_HEARD = BUS_LEASH_MAX - VIEW_WIDTH * CAMERA_LEAD + 50

/** What `lineUp` needs: the world's still being made when it's called. */
interface Lineup {
	course: Pick<Course, 'skeletons' | 'ride'>
	racers: { runner: Playable }[]
	terrain: Terrain
	pack: Pacer[]
	packSize: number
	packState: { nextId: number; nextJoin: number }
}

/**
 * Someone to join: now and then someone the club knows, a member or one of
 * its guests, as long as they're not running already (or racing).
 */
function newcomer(
	world: Lineup,
): Pick<Pacer, 'name' | 'member' | 'guest' | 'look' | 'sprite' | 'skeleton'> {
	if (Math.random() < (world.course.skeletons ?? 0))
		return { name: 'Skeleton', skeleton: true, sprite: SKELETON_SPRITE }
	const members = [...MEMBERS, ...guests()].filter(
		(m) =>
			!world.racers.some(
				(r) => r.runner.id === m.id || r.runner.name === m.name,
			) && !world.pack.some((p) => p.name === m.name),
	)
	if (members.length && Math.random() < MEMBER_SHARE) {
		const { id, name, member, sprite } = pickAny(members)
		return {
			name,
			member,
			guest: id.startsWith('guest:') ? id : undefined,
			sprite,
		}
	}
	const look = randomAvatar(DEFAULT_AVATAR)
	return { name: pickAny(NAMES), look, sprite: lookSprite(look) }
}

/**
 * Someone joining at `x`. Down The Slopes, part way down, they're on skis
 * or a snowboard already: those lined up at the start take them from the
 * rack, as anyone.
 */
function join(world: Lineup, x: number, skiing = false) {
	world.pack.push({
		board: skiing ? 1 + Math.floor(Math.random() * BOARDS.length) : undefined,
		id: world.packState.nextId++,
		...newcomer(world),
		x,
		feetY: world.terrain.groundY(x),
		vx: 0,
		vy: 0,
		grounded: true,
		pace: PACER_SLOWEST + Math.random() * (PACER_FASTEST - PACER_SLOWEST),
		dazed: 0,
		scooped: false,
		spin: 0,
	})
}

/**
 * A few lined up behind you at the start, or behind the last Player in a
 * Round: nobody gets ahead of the line.
 */
export function lineUp(world: Lineup) {
	const last = START_X - (world.racers.length - 1) * START_GAP
	for (const offset of [-36, -72, -108, -150, -195].slice(0, world.packSize))
		join(world, last + offset + Math.round(Math.random() * 16))
	world.packState.nextJoin = PACER_EVERY_TICKS
}

/** One tick of the pack: joining, running, being bounced on, and leaving. */
export function stepPack(world: World) {
	const { pack, terrain, packState } = world
	const phase = world.phase()
	// On the start line until "Go!", like everyone.
	if (phase === 'countdown') return

	if (phase === 'running' && --packState.nextJoin <= 0) {
		packState.nextJoin = PACER_EVERY_TICKS + Math.random() * PACER_EVERY_SPREAD
		// Just off the screen ahead, to be caught up with: on the Ground, not
		// over a Gap, nor out at sea.
		const x = world.camera() + world.viewWidth() + 80
		const running = pack.filter((p) => !p.scooped).length
		if (
			running < world.packSize &&
			x < terrain.finishX - 300 &&
			!terrain.inGap(x) &&
			!shrunkAt(world.course, x)
		)
			join(world, x, world.course.ride === 'skis')
	}

	for (const pacer of pack) movePacer(world, pacer)
	for (const racer of world.racers) {
		if (phase === 'running' && !racer.out && !isHeld(world, racer))
			bounceOffHeads(world, racer)
		if (racer.body.grounded) racer.body.combo = 0
	}

	// Gone: fallen off the bottom out of the scoop, or long over the line.
	// Anyone left behind stays until the bus gets them, on the screen or not.
	for (let i = pack.length - 1; i >= 0; i--) {
		const p = pack[i]
		if (
			p.feetY > VIEW_HEIGHT + 300 ||
			p.x > terrain.finishX + 700 ||
			// Into a shrink ray: gone, nobody else is shrunk.
			(!p.scooped && shrunkAt(world.course, p.x))
		)
			pack.splice(i, 1)
	}
}

function movePacer(world: World, p: Pacer) {
	const { terrain } = world
	if (p.scooped) {
		p.x += p.vx
		p.feetY += p.vy
		p.vy += GRAVITY
		p.spin++
		return
	}

	// On a condor's back, off a Leap, carried down to the valley floor.
	if (p.condorFrom) {
		if (rideCondor(world, p)) {
			p.grounded = true
			p.on = undefined
		}
		return
	}
	// On a glider, out over the sea.
	if (p.gliding) return flyPacer(world, p)
	// On skis, down The Slopes.
	if (p.board) return skiPacer(world, p, (x) => hopAhead(world, x))
	const ticks = world.ticks()
	if (p.dazed > 0) p.dazed--
	if (p.grounded) {
		const pace = p.dazed > 0 ? DAZED_SPEED : p.pace
		const slope = p.on === undefined ? terrain.slope(p.x) : 0
		p.vx += (pace - p.vx) * PACER_GRIP + hillPull(slope) * PACER_HILL_PULL
		// Carried along by a Moving Platform.
		if (p.on !== undefined)
			p.x += platformMove(terrain, world.platforms[p.on], ticks).x
		// Onto a Steam Vent: it puffs, and fires them up, as anyone.
		const vent = world.obstacles.find(
			({ obstacle: o }) =>
				o.kind === 'steam' && Math.abs(p.x - o.x) < steamFires(o).reach,
		)
		if (vent && vent.obstacle.kind === 'steam') {
			const fires = steamFires(vent.obstacle)
			vent.flown = ticks
			p.vy = -fires.up
			p.vx = Math.max(p.vx, fires.on)
			p.grounded = false
			p.on = undefined
		}
		// In a Tunnel, down and through it no slower than they went in, as
		// anyone is: nothing to decide till they're out.
		else if (inTunnel(world, p.x, p.feetY)) {
			p.tunnelSpeed ??= p.vx
			p.vx = Math.max(p.vx, p.tunnelSpeed)
		} else {
			p.tunnelSpeed = undefined
			decide(world, p)
		}
	}
	// Under a low branch, or a tall hurdle: ducked, sliding under it.
	p.ducking = p.grounded && duckUnder(world, p.x)
	const from = p.x
	p.x += p.vx
	// Never through a Wall: stopped at its foot, like anyone.
	const wall = wallCrossed(world, from, p.x, p.feetY)
	if (wall !== undefined) {
		p.x = wall - 12
		p.vx = 0
	}
	// Nor into a Cave's rock with no room under it even ducking: a terrace's
	// face. Stopped at it, to climb up it.
	const rock = rockOver(world, p.x + 12, p.feetY)
	if (rock !== undefined && rock > p.feetY - DUCK_HEIGHT && p.x > from) {
		p.x = from
		p.vx = 0
	}

	const ground = terrain.groundY(p.x)
	if (p.grounded) {
		if (p.on !== undefined) {
			const at = platformAt(terrain, world.platforms[p.on], ticks)
			if (p.x < at.left || p.x > at.right) {
				// Off the end of it.
				p.on = undefined
				p.grounded = false
				p.vy = 0
			} else p.feetY = at.top
		} else if (
			(ground - p.feetY > STEP_DOWN && !terrain.inGap(p.x)) ||
			atSea(world, p.x)
		) {
			// Off a roof, down onto a lower one; or off the cliff, with no
			// glider, down into the sea.
			p.grounded = false
			p.vy = 0
		} else p.feetY = ground
	}
	if (!p.grounded) {
		const wasFeetY = p.feetY
		p.vy += GRAVITY
		p.feetY += p.vy
		// Up into a Ceiling: no higher.
		if (p.vy < 0) {
			const ceiling = ceilingAt(world, p.x, wasFeetY - STAND_HEIGHT)
			if (ceiling !== undefined && p.feetY - STAND_HEIGHT < ceiling) {
				p.feetY = ceiling + STAND_HEIGHT
				p.vy = 0
			}
		}
		const platform =
			p.vy >= 0
				? landingOn(terrain, world.platforms, ticks, p.x, wasFeetY, p.feetY)
				: undefined
		if (platform && platform.top <= ground) {
			p.feetY = platform.top
			p.on = platform.index
			p.vy = 0
			p.grounded = true
		} else if (p.feetY >= ground && p.vy >= 0 && !atSea(world, p.x)) {
			// Over a Gap too: Pacers never fall. Into the sea, they do: down,
			// out of sight, and gone.
			p.feetY = ground
			p.on = undefined
			p.vy = 0
			p.grounded = true
		}
	}
}

/**
 * What a Pacer does next, stood on something: as a runner would. Hop what's
 * in the way; leap a Gap they can; jump a step up they can. A Gap too wide, or
 * a Wall too high, they wait at, for a girder or a lift to take them, or climb
 * scaffolding a plank at a time. Waiting on one, they get off once it's
 * somewhere they can.
 */
function decide(world: World, p: Pacer) {
	const { terrain } = world
	const ticks = world.ticks()
	const jump = (rise: number) => {
		p.vy = -jumpSpeed(rise)
		p.grounded = false
		p.on = undefined
	}

	// Something to get up onto, right here: a Platform within a jump.
	const board = world.platforms.findIndex((platform, i) => {
		if (i === p.on) return false
		const at = platformAt(terrain, platform, ticks)
		return (
			at.top < p.feetY - 3 &&
			at.top > p.feetY - PACER_REACH &&
			p.x + 50 >= at.left + 8 &&
			p.x + 10 <= at.right - 8
		)
	})
	if (board >= 0) {
		const at = platformAt(terrain, world.platforms[board], ticks)
		p.vx = Math.min(p.vx, 2.5)
		return jump(p.feetY - at.top)
	}

	if (p.on !== undefined) {
		// Off the end, once that's somewhere to go; till then, along for the ride.
		const at = platformAt(terrain, world.platforms[p.on], ticks)
		// Along to the end of it, at most: for the next plank up, or ready.
		if (!canStepOff(world, at.right, at.top))
			p.vx = Math.max(0, Math.min(p.vx, at.right - 12 - p.x))
		// Off, at a run: enough to carry them onto what's ahead.
		else p.vx = Math.max(p.vx, p.pace)
		return
	}

	const gap = terrain.gaps.find(
		(g) => g.from > p.x && g.from - p.x < LOOKAHEAD + p.vx,
	)
	// The cliff, with no glider: they run on, off it, and they're gone.
	if (gap && atSea(world, gap.from + 1)) return
	if (gap) {
		const far = terrain.groundY(gap.to + 1)
		if (gap.to - gap.from <= LEAP_WIDTH && far > p.feetY - PACER_REACH + 20) {
			// Well up, and fast enough to come down past its far side.
			const rise = Math.max(0, p.feetY - far)
			const vy = jumpSpeed(rise)
			const airborne = (vy + Math.sqrt(vy * vy - 2 * GRAVITY * rise)) / GRAVITY
			p.vy = -vy
			p.vx = Math.max(p.vx, (gap.to + LEAP_PAST - p.x) / airborne)
			p.grounded = false
			return
		}
		// A girder level with them, there against its edge: on, and across.
		const level = world.platforms.findIndex((platform) => {
			const at = platformAt(terrain, platform, ticks)
			return (
				Math.abs(at.top - p.feetY) < 3 &&
				at.left <= gap.from + 4 &&
				at.right > gap.from + 40
			)
		})
		if (level >= 0) {
			if (p.x >= gap.from - 4) p.on = level
			return
		}
		// Too wide: waiting at its edge, for a girder.
		if (p.x + p.vx >= gap.from - 8) p.vx = Math.max(0, gap.from - 8 - p.x)
		return
	}

	const wall = terrain.walls.find(
		(w) =>
			w > p.x &&
			w - p.x < WALL_LOOKAHEAD &&
			!terrain.inGap(w + 1) &&
			terrain.groundY(w + 1) < p.feetY - WALL_STEP,
	)
	if (wall !== undefined) {
		const rise = p.feetY - terrain.groundY(wall + 1)
		if (rise < PACER_REACH - 10) {
			// Off in time to be up over its top as they get to it.
			const vy = jumpSpeed(rise)
			const over = rise + WALL_CLEAR
			const rising = (vy - Math.sqrt(vy * vy - 2 * GRAVITY * over)) / GRAVITY
			if (wall - 12 - p.x <= Math.max(p.vx, 2) * rising) jump(rise)
			else if (p.dazed === 0 && hopAhead(world, p.x)) {
				p.vy = -HOP_SPEED
				p.grounded = false
			}
			return
		}
		// Too high: under a lift up it, to wait for it, or the lowest plank of
		// scaffolding up it within a jump, to climb; or at its foot.
		const near = world.platforms.filter(
			(platform) =>
				platform.x + platform.width <= wall + 4 &&
				platform.x + platform.width > wall - 560,
		)
		const lift = near.find((platform) => platform.move?.y)
		const plank = near
			.map((platform) => ({
				platform,
				top: platformAt(terrain, platform, ticks).top,
			}))
			.filter(({ top }) => top > p.feetY - PACER_REACH)
			.sort((a, b) => b.top - a.top)[0]?.platform
		const waitAt = lift
			? lift.x + lift.width - 30
			: plank
				? plank.x + plank.width / 2
				: wall - 14
		// Under it, then: back a step, if they've gone past it.
		if (p.x > waitAt + 4) p.vx = -1.2
		else if (p.x + p.vx >= waitAt) p.vx = Math.max(0, waitAt - p.x)
		return
	}

	if (p.dazed === 0 && hopAhead(world, p.x)) {
		p.vy = -HOP_SPEED
		p.grounded = false
	}
}

/**
 * Whether stepping off a Platform's right end, at its height, gets anywhere:
 * Ground just past it no higher than they are, and nothing past that too
 * high to get up.
 */
function canStepOff(world: World, right: number, top: number) {
	const { terrain } = world
	/** The highest they'd come down on, going off it. */
	let landing: number | undefined
	for (let x = right + 6; x <= right + 60; x += 6) {
		if (terrain.inGap(x)) continue
		const y = terrain.groundY(x)
		// Nothing higher than their feet: a lift goes all the way up first.
		if (y < top - 1) return false
		landing = Math.min(landing ?? y, y)
	}
	if (landing === undefined) return false
	// And from there, on: not straight into a Wall they can't get up.
	for (let x = right + 66; x <= right + 220; x += 6) {
		if (terrain.inGap(x)) continue
		if (terrain.groundY(x) < landing - PACER_REACH + 10) return false
	}
	return true
}

/** A Wall `from` to `to` runs into, at `feetY`: where, if it does. */
function wallCrossed(world: World, from: number, to: number, feetY: number) {
	const { terrain } = world
	if (to <= from) return undefined
	return terrain.walls.find(
		(w) =>
			w > from + 10 &&
			w <= to + 10 &&
			!terrain.inGap(w + 1) &&
			feetY > terrain.groundY(w + 1) + WALL_STEP,
	)
}

/** How high a Pacer gets jumping, near enough: what they'll jump up onto. */
const PACER_REACH = 92
/** How far ahead they look for a Gap or a Wall. */
const LOOKAHEAD = HOP_LOOKAHEAD
/** How high over a Wall's top a Pacer means to be as they get to it. */
const WALL_CLEAR = 16

/**
 * How hard a Pacer jumps to get `rise` up: well over it, as anyone does, not
 * just enough, and at least as hard as a runner jumps.
 */
const jumpSpeed = (rise: number) =>
	Math.max(JUMP_SPEED, Math.sqrt(2 * GRAVITY * (rise + 48)))

/** How far ahead they see a Wall: far enough to wait under whatever goes up it, or go back to scaffolding up it. */
const WALL_LOOKAHEAD = 600
/** The widest Gap they'll leap: wider, they wait for a girder. */
const LEAP_WIDTH = 240
/** As for a runner: how far below a Wall's top they can still get up it, and a step down that's a drop. */
const WALL_STEP = 10
const STEP_DOWN = 12

/** How far past a Gap they land. */
const LEAP_PAST = 40

/** How far before a low branch or a tall hurdle a Pacer ducks, and how far past it they get up again. */
const DUCK_BEFORE = 30
const DUCK_PAST = 22

/**
 * A low branch or a tall hurdle (still standing) over `x`, or just ahead:
 * something to duck under, as anyone does, rather than run through.
 */
function duckUnder(world: World, x: number) {
	return world.obstacles.some(({ obstacle: o, used, scooped }) => {
		if (scooped) return false
		const low = o.kind === 'branch' || (o.kind === 'hurdle' && o.tall && !used)
		return low && x > o.x - DUCK_BEFORE && x < o.x + DUCK_PAST
	})
}

/**
 * A rock, a hurdle, a puddle, a pothole or geese just ahead of `x`. Branches
 * and tall hurdles they duck under instead (see `duckUnder`).
 */
function hopAhead(world: World, x: number) {
	return world.obstacles.some((state) => {
		const { obstacle: o, used } = state
		const edge =
			o.kind === 'rock' ||
			o.kind === 'tombstone' ||
			o.kind === 'vent' ||
			(o.kind === 'snowman' && !used && !state.scooped)
				? o.x - 20
				: o.kind === 'zombie'
					? zombieAt(world, { ...state, obstacle: o }).x - 14
					: o.kind === 'mummy' && !state.scooped
						? mummyAt(world, { ...state, obstacle: o }).x - 14
						: o.kind === 'hurdle' && !o.tall
							? o.x - 16
							: o.kind === 'mud' || o.kind === 'pothole'
								? o.x - o.width / 2
								: o.kind === 'kids'
									? o.x - kidsWidth(o.count) / 2
									: o.kind === 'geese' && !used
										? o.x - geeseWidth(o.count) / 2
										: o.kind === 'tourists' && !state.scooped
											? o.x - touristsWidth(o.count) / 2
											: o.kind === 'cyclist' && !state.scooped
												? cyclistAt(world, { ...state, obstacle: o }).x - 30
												: // Over Hands under a graveyard, or a Swamp Man coming up out of his sludge.
													o.kind === 'hands'
													? o.x - 16
													: o.kind === 'swampman' &&
															swampManAt(o.x, world.ticks()).rise > 0
														? o.x - 20
														: undefined
		return edge !== undefined && edge > x && edge - x < HOP_LOOKAHEAD
	})
}

/** How long a Player stumbles after another bounces on their head: a little. */
const STOMPED_TICKS = 18
/** And how long before anyone can bounce on them again. */
const STOMPED_GUARD = 60

/** Coming down on someone's head: bounce off it, faster, and score. */
function bounceOffHeads(world: World, racer: Racer) {
	const b = racer.body
	if (b.grounded || b.vy <= 0 || b.carried > 0 || b.gliding) return
	/** Where their feet were last tick. */
	const was = b.feetY - b.vy

	for (const p of world.pack) {
		if (p.scooped || p.dazed > 0 || p.gliding) continue
		if (Math.abs(b.x - p.x) > HEAD_REACH) continue
		const head = p.feetY - p.sprite.height * RUNNER_SCALE + HEAD_GIVE
		// From above it, onto it.
		if (was > head || b.feetY < head) continue

		p.dazed = DAZED_TICKS
		bounceOff(world, racer, head, p.x)
		// One head a tick.
		return
	}

	// Another Player's head: a bounce for you, a stumble for them.
	for (const other of world.racers) {
		const o = other.body
		if (
			other === racer ||
			other.out ||
			o.stomped > 0 ||
			o.mount > 0 ||
			o.carried > 0
		)
			continue
		if (Math.abs(b.x - o.x) > HEAD_REACH) continue
		const height = o.ducking
			? other.runner.sprite.height * RUNNER_SCALE * 0.55
			: other.runner.sprite.height * RUNNER_SCALE
		const head = o.feetY - height + HEAD_GIVE
		if (was > head || b.feetY < head) continue

		o.stomped = STOMPED_GUARD
		o.stumble = Math.max(o.stumble, STOMPED_TICKS)
		o.vx *= 0.5
		bounceOff(world, racer, head, o.x)
		return
	}
}

/**
 * Off a head whose top is at `head`, at `x`: up, faster, and points, doubling
 * for each more before landing. Corgis' heads too.
 */
export function bounceOff(world: World, racer: Racer, head: number, x: number) {
	const b = racer.body
	b.feetY = head
	b.vy = -(racer.controls().up ? STOMP_BOUNCE_HELD : STOMP_BOUNCE)
	// Off the ski jump, a bounce off someone isn't a jump of their own.
	b.launchX = undefined
	// A bounce, not a jump of their own: letting go doesn't cut it short.
	b.jumping = false
	b.vx = boost(world, b.vx, b.facing, STOMP_BOOST)

	const points = Math.min(STOMP_POINTS_MAX, STOMP_POINTS * 2 ** b.combo)
	b.combo++
	world.addBonus('heads', points)
	const combo = b.combo > 1 ? ` ×${b.combo}` : ''
	world.popup(
		world.round ? (combo ? `Boing!${combo}` : 'Boing!') : `+${points}${combo}`,
		x,
		head - 10,
	)
	play('stomp')
}

/** Whoever the bus has caught up with goes flying, the same as you would. */
export function scoopPack(world: World) {
	const { bus } = world
	const camera = world.camera()
	for (const p of world.pack) {
		if (p.scooped || bus.frontX < p.x - HITBOX_HALF_WIDTH) continue
		// Off the cliff with no glider, down into the sea: nothing to scoop.
		if (!p.gliding && atSea(world, p.x)) continue
		p.scooped = true
		p.grounded = false
		p.vx = Math.max(bus.speed, 2) + 2 + Math.random() * 2
		p.vy = -13 - Math.random() * 3
		p.spin = 0
		bus.scooping = 10
		// Heard, but not announced: "Scooped …!" is for players, not the pack.
		// Just off the screen behind still counts: the bus isn't far back.
		if (p.x > camera - SCOOP_HEARD && p.x < camera + world.viewWidth())
			play('whoosh')
	}
}
