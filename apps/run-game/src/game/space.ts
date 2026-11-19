import type { Boss, Course, Obstacle } from '../courses/types'
import type { RaceFrame } from '../multiplayer/protocol'
import { play } from '../sfx'
import {
	DUCK_HEIGHT,
	HAZARD_POINTS,
	HITBOX_HALF_WIDTH,
	STUMBLE_TICKS,
	VIEW_WIDTH,
} from './constants'
import { bounceOff } from './pack'
import { greetFound, scored, shielded } from './step'
import {
	type Body,
	type ObstacleState,
	type Racer,
	type World,
	bodyHeight,
} from './world'

/**
 * Rocket Launch's goings-on, beyond the swimming (space is Deep Water, see
 * `swim.ts`) and the rocket (a Portal, see `portals.ts`): low gravity on
 * its planet; its aliens, firing slow plasma bolts at whoever's coming, to
 * be jumped or ducked, and knocked out landing on their heads; the cage a
 * prisoner hangs in, high up, to be landed on and dropped; and the giant
 * alien in its own room at the end, to be bounced on till it's beaten.
 *
 * Plain state on the world (`space`), set here and read by the drawing; a
 * Remote Player gets it in the frame (see `RaceFrame`'s `space`).
 */

// --- Low gravity -------------------------------------------------------------

/** The low gravity at `x`, if there is any there. */
export function lowGravityAt(course: Pick<Course, 'lowGravity'>, x: number) {
	const low = course.lowGravity
	return low && x >= low.from && x < low.to ? low : undefined
}

/** How strong gravity is at `x`, of the usual. */
export const gravityAt = (course: Pick<Course, 'lowGravity'>, x: number) =>
	lowGravityAt(course, x)?.scale ?? 1

/**
 * How much faster to take off at `x`, for a jump (or a vent's puff) to go
 * `lift` times as high as usual in its gravity: slower than usual, a
 * floaty one, but higher, and far longer about it.
 */
export function liftAt(course: Pick<Course, 'lowGravity'>, x: number) {
	const low = lowGravityAt(course, x)
	return low ? Math.sqrt(low.lift * low.scale) : 1
}

// --- Plasma bolts --------------------------------------------------------------

/** A plasma bolt, flying: where its middle is, how fast, and when it was fired. */
export interface Bolt {
	id: number
	x: number
	y: number
	vx: number
	vy: number
	born: number
	/** One of the boss's: bigger. */
	big?: boolean
}

/** How big a bolt is, either side of its middle; the boss's. */
export const BOLT_RADIUS = 6
export const BIG_BOLT_RADIUS = 10
/** How fast an alien's bolts go: slow enough to see coming, and get over. */
const BOLT_SPEED = 2.6
/** Hit by one: how long they stagger, and how much of their speed they keep. */
const ZAP_TICKS = 14
const ZAP_KEEP = 0.6
/** How long a bolt flies before it fizzles out. */
const BOLT_LIFE = 520

// --- Aliens --------------------------------------------------------------------

/**
 * An alien trooper: how wide and tall, stood and kneeling; how high its
 * gun's muzzle is over its feet, either way, and how far out in front of it.
 */
export const ALIEN = {
	width: 34,
	height: 46,
	kneeling: 32,
	gun: 36,
	kneelingGun: 16,
	muzzle: 20,
}
/** How far ahead it sees anyone coming, and above or below it. */
const ALIEN_SIGHT = 620
const ALIEN_SIGHT_UP = 260
/** How often it fires, and how long it takes aim before each, its gun glowing. */
export const ALIEN_FIRE_EVERY = 120
export const ALIEN_AIM = 24
/** How much leeway landing on its head gets: down onto it from this far up into it. */
const ALIEN_GIVE = 14

/** Where an alien's feet are. */
export const alienFeet = (
	world: Pick<World, 'terrain'>,
	o: Extract<Obstacle, { kind: 'alien' }>,
) => world.terrain.groundY(o.x) - o.height

/** How tall an alien is, stood or kneeling. */
export const alienHeight = (o: Extract<Obstacle, { kind: 'alien' }>) =>
	o.kneeling ? ALIEN.kneeling : ALIEN.height

/** Its gun's height over its feet. */
const gunOf = (o: Extract<Obstacle, { kind: 'alien' }>) =>
	o.kneeling ? ALIEN.kneelingGun : ALIEN.gun

/** When in its round an alien fires: each its own, so they don't all at once. */
const alienBeat = (x: number) => (x * 7) % ALIEN_FIRE_EVERY

/**
 * Which way an alien faces, and whether it's seen anyone: at whoever's
 * nearest still racing, in sight, ahead or just past it.
 */
export function alienSees(world: World, state: ObstacleState) {
	const o = state.obstacle as Extract<Obstacle, { kind: 'alien' }>
	const feet = alienFeet(world, o)
	let nearest: Body | undefined
	for (const r of world.racers) {
		if (r.out) continue
		const b = r.body
		const along = o.x - b.x
		if (along > ALIEN_SIGHT || along < -ALIEN_SIGHT / 2) continue
		if (Math.abs(b.feetY - feet) > ALIEN_SIGHT_UP) continue
		if (!nearest || Math.abs(b.x - o.x) < Math.abs(nearest.x - o.x)) nearest = b
	}
	return {
		facing: (nearest && nearest.x > o.x ? 1 : -1) as 1 | -1,
		sees: !!nearest,
	}
}

/** Ticks till an alien next fires, from 0 (now) to `ALIEN_FIRE_EVERY`. */
export const alienCountdown = (x: number, ticks: number) =>
	(alienBeat(x) - (ticks % ALIEN_FIRE_EVERY) + ALIEN_FIRE_EVERY) %
	ALIEN_FIRE_EVERY

/** Every alien still up, firing on its beat at whoever's in sight. */
function fireAliens(world: World) {
	const now = world.ticks()
	for (const state of world.obstacles) {
		const o = state.obstacle
		if (o.kind !== 'alien' || state.used || state.scooped) continue
		if (alienCountdown(o.x, now) !== 0) continue
		const { facing, sees } = alienSees(world, state)
		if (!sees) continue
		fire(world, {
			x: o.x + facing * ALIEN.muzzle,
			y: alienFeet(world, o) - gunOf(o),
			vx: facing * BOLT_SPEED,
			vy: 0,
		})
	}
}

/** A bolt fired. Heard, if it's in view. */
function fire(world: World, bolt: Omit<Bolt, 'id' | 'born'>, sound = true) {
	const { space } = world
	space.bolts.push({ ...bolt, id: space.nextBolt++, born: world.ticks() })
	const camera = world.camera()
	if (sound && bolt.x > camera - 40 && bolt.x < camera + world.viewWidth() + 40)
		play('zap')
}

/** How big a bolt is. */
export const boltRadius = (bolt: Pick<Bolt, 'big'>) =>
	bolt.big ? BIG_BOLT_RADIUS : BOLT_RADIUS

/**
 * Every bolt on, and into whoever it gets to: a stumble, and it's gone.
 * Into the floor, or old, it fizzles out.
 */
function flyBolts(world: World) {
	const { space, terrain } = world
	const now = world.ticks()
	space.bolts = space.bolts.filter((bolt) => {
		bolt.x += bolt.vx
		bolt.y += bolt.vy
		const r = boltRadius(bolt)
		if (now - bolt.born > BOLT_LIFE) return false
		if (bolt.y + r > terrain.groundY(bolt.x) + 4) return false
		const roof = world.course.cave?.ceiling(bolt.x)
		if (roof !== undefined && bolt.y - r < roof) return false
		for (const racer of world.racers) {
			if (racer.out) continue
			const b = racer.body
			const top = b.feetY - bodyHeight(b)
			if (
				b.x + HITBOX_HALF_WIDTH > bolt.x - r &&
				b.x - HITBOX_HALF_WIDTH < bolt.x + r &&
				b.feetY > bolt.y - r &&
				top < bolt.y + r
			) {
				zapped(world, b, bolt)
				return false
			}
		}
		return true
	})
}

/**
 * Hit by a bolt: a jolt, not a fall. A short stagger, and some of their
 * speed lost, rather than a stumble's stop.
 */
function zapped(world: World, b: Body, _bolt: Bolt) {
	if (b.stumble > 0) return
	if (shielded(world, b)) return
	play('stumble')
	b.stumble = ZAP_TICKS
	b.vx *= ZAP_KEEP
	world.addBonus('hazards', -HAZARD_POINTS)
	world.popup(
		scored(world, 'Zapped!', `-${HAZARD_POINTS}`),
		b.x,
		b.feetY - bodyHeight(b),
	)
}

/**
 * Landing on an alien's head: knocked down and out, and a bounce off it,
 * as off a head. Whether they did.
 */
export function stompAlien(world: World, racer: Racer, state: ObstacleState) {
	const o = state.obstacle as Extract<Obstacle, { kind: 'alien' }>
	const b = racer.body
	if (state.used || state.scooped || b.vy <= 0) return false
	const head = alienFeet(world, o) - alienHeight(o)
	if (Math.abs(b.x - o.x) > ALIEN.width / 2 + 4) return false
	if (b.feetY < head - 2 || b.feetY - b.vy > head + ALIEN_GIVE) return false
	state.used = true
	state.flown = world.ticks()
	bounceOff(world, racer, head, o.x)
	world.popup('Bonk!', o.x, head - 30)
	return true
}

/** Whether someone's run into an alien, still up: not landing on it. */
export function intoAlien(
	world: World,
	b: Body,
	o: Extract<Obstacle, { kind: 'alien' }>,
) {
	const feet = alienFeet(world, o)
	const top = feet - alienHeight(o) + 6
	return (
		b.x + HITBOX_HALF_WIDTH > o.x - ALIEN.width / 2 + 6 &&
		b.x - HITBOX_HALF_WIDTH < o.x + ALIEN.width / 2 - 6 &&
		b.feetY > top &&
		b.feetY - bodyHeight(b) < feet
	)
}

// --- Asteroids -----------------------------------------------------------------

/** How big an asteroid is, either side of its middle; a big one. */
export const ASTEROID_RADIUS = 18
export const BIG_ASTEROID_RADIUS = 34
/** How long an asteroid takes to drift down and back up. */
const ASTEROID_DRIFT = 300

export const asteroidRadius = (o: { big?: boolean }) =>
	o.big ? BIG_ASTEROID_RADIUS : ASTEROID_RADIUS

/** How high an asteroid's middle is over the Ground, `ticks` in: drifting, each its own. */
export function asteroidHeight(
	o: Extract<Obstacle, { kind: 'asteroid' }>,
	ticks: number,
) {
	const phase = (o.x * 0.013) % (Math.PI * 2)
	const swing =
		0.5 + 0.5 * Math.sin((ticks / ASTEROID_DRIFT) * Math.PI * 2 + phase)
	return o.low + (o.high - o.low) * swing
}

/** How far either side of its middle an asteroid (or a satellite) can be hit: along, and up and down. */
export function asteroidReach(o: { big?: boolean; satellite?: boolean }) {
	if (o.satellite)
		return { along: SATELLITE.width / 2 - 6, across: SATELLITE.height / 2 - 4 }
	const r = asteroidRadius(o) - 4
	return { along: r, across: r }
}

/** A satellite's size on the screen. */
export const SATELLITE = { width: 96, height: 40 }

/** How far a satellite's tilted, `ticks` in, in degrees: rocking slowly, each its own. */
export const satelliteTilt = (o: { x: number }, ticks: number) =>
	Math.round(Math.sin(ticks / 70 + o.x * 0.01) * 12)

/** How much slower than its own pace the bus goes at `x`: 1, not at all. */
export function busSlowAt(course: Pick<Course, 'busSlow'>, x: number) {
	return course.busSlow?.find((s) => x >= s.from && x < s.to)?.pace ?? 1
}

/** How far round an asteroid's turned, `ticks` in: a quarter turn at a time, it's pixel art. */
export const asteroidTurn = (o: { x: number }, ticks: number) =>
	Math.floor((ticks + o.x) / 40) % 4

// --- The cage --------------------------------------------------------------------

/** How long the cage takes to fall to the floor, and how long after it's open its door swings. */
export const CAGE_FALL = 34
/** How wide and tall it is, its top at the course's `cage.top`. */
export const CAGE = { width: 56, height: 70 }

/** Where the cage is, `ticks` in: its top, hanging or falling, and whether it's down and open. */
export function cageAt(world: Pick<World, 'course' | 'space'>, ticks: number) {
	const cage = world.course.cage
	if (!cage) return undefined
	const dropped = world.space.cage?.droppedAt
	if (dropped === undefined)
		return { top: cage.top, open: false, falling: false }
	const t = Math.min(1, Math.max(0, ticks - dropped) / CAGE_FALL)
	const bottom = cage.floor
	const top = cage.top + (bottom - CAGE.height - cage.top) * t * t
	return { top, open: t >= 1, falling: t < 1 }
}

/** Landing on top of the cage, hanging: it falls. Whether they did. */
function dropCage(world: World, racer: Racer) {
	const cage = world.course.cage
	const b = racer.body
	if (!cage || world.space.cage || b.vy <= 0) return false
	if (Math.abs(b.x - cage.x) > CAGE.width / 2 + 2) return false
	if (b.feetY < cage.top - 2 || b.feetY - b.vy > cage.top + 14) return false
	world.space.cage = { droppedAt: world.ticks(), by: racer.id }
	b.freedPrisoner = true
	bounceOff(world, racer, cage.top, cage.x)
	play('smash')
	world.popup('Crack!', cage.x, cage.top - 30)
	return true
}

/** The cage down on the floor: smashed open, and whoever dropped it has set them free. */
function openCage(world: World) {
	const cage = world.course.cage
	const dropped = world.space.cage
	if (!cage || !dropped || world.ticks() !== dropped.droppedAt + CAGE_FALL)
		return
	play('rubble')
	const found = world.course.found
	world.popup(cage.says, found?.x ?? cage.x, cage.floor - 90)
	const racer = world.racers.find((r) => r.id === dropped.by)
	if (racer && !racer.out) greetFound(world, racer, true, true)
}

/** Whether the course's found runner can be got to yet: not while they're caged. */
export const foundFree = (world: Pick<World, 'course' | 'space' | 'ticks'>) =>
	!world.course.cage ||
	(world.space.cage !== undefined &&
		world.ticks() >= world.space.cage.droppedAt + CAGE_FALL)

// --- The boss ----------------------------------------------------------------

/** The boss as it goes: see `Boss`. */
export interface BossRun {
	/** When it woke, everyone in its room. */
	awake?: number
	hp: number
	max: number
	/** Hits since it last stomped. */
	hits: number
	/** When it was last hit: it can't be again for `BOSS_HURT` ticks. */
	hurtAt?: number
	/** When it's stomping next, winding up to it till then. */
	stompAt?: number
	/** When it went down, beaten. */
	downAt?: number
	/** How many volleys it's fired, for which comes next. */
	volleys: number
	/** When it next fires. */
	nextVolley: number
}

/** How long after one hit the boss can be hit again. */
export const BOSS_HURT = 24
/** How long it winds up to a stomp, a foot raised, and how long the room shakes after. */
export const STOMP_WIND = 40
export const STOMP_SHAKE = 36
/** How long it takes to fall, beaten, and for the door out to open. */
export const BOSS_FALL = 120
/** How far into its room everyone has to be for it to wake, the door shut behind them. */
const DOOR_IN = 50
/** How close to its walls anyone can get. */
const WALL = 14
/** How far from its door the bus waits outside. */
const BUS_WAITS = 80
/** How often it fires, full of fight, and nearly beaten: faster as it goes. */
const VOLLEY_SLOWEST = 130
const VOLLEY_FASTEST = 70
/** How fast its bolts go. */
const BOSS_BOLT_SPEED = 2.8
/** How much leeway landing on its head gets. */
const HEAD_GIVE = 18

/** The boss as it starts: asleep. */
export function bossStart(boss: Boss | undefined): BossRun | undefined {
	return (
		boss && { hp: boss.hp, max: boss.hp, hits: 0, volleys: 0, nextVolley: 0 }
	)
}

/** Its head's top, a y: where it's landed on. */
export const bossHead = (world: Pick<World, 'terrain'>, boss: Boss) =>
	world.terrain.groundY(boss.x) - boss.height

/** Whether the boss has the room shut: awake and not yet beaten. */
export function bossFighting(world: Pick<World, 'space'>) {
	const run = world.space.boss
	return !!run && run.awake !== undefined && run.downAt === undefined
}

/**
 * Where the bus is kept waiting outside the boss's room: till it's beaten,
 * and down, everyone with a head start out the far door.
 */
export function busWaits(world: World) {
	const { boss } = world.course
	const run = world.space.boss
	if (!boss || !run) return undefined
	if (run.downAt !== undefined && world.ticks() >= run.downAt + BOSS_FALL)
		return undefined
	return boss.room.from - BUS_WAITS
}

/**
 * Where the camera's left edge is held, someone at `x` in a boss's room
 * before it's beaten: its middle in the middle of the screen.
 */
export function bossArena(world: Pick<World, 'course' | 'space'>, x: number) {
	const boss = world.course.boss
	const run = world.space.boss
	if (!boss || !run || run.downAt !== undefined) return undefined
	if (x < boss.room.from || x > boss.room.to) return undefined
	return (boss.room.from + boss.room.to) / 2 - VIEW_WIDTH / 2
}

/**
 * Whether the bus is parked outside a boss's room with whoever's playing
 * shut in it: how far back it is isn't worth saying.
 */
export function busParkedFor(world: World) {
	const boss = world.course.boss
	return (
		!!boss && busWaits(world) !== undefined && world.body.x >= boss.room.from
	)
}

/** How hard the room's shaking, a stomp just come down: px either way. */
export function bossShake(world: Pick<World, 'space' | 'ticks'>) {
	const at = world.space.boss?.stompAt
	if (at === undefined) return 0
	const since = world.ticks() - at
	if (since < 0 || since > STOMP_SHAKE) return 0
	return (since % 4 < 2 ? 1 : -1) * Math.round(10 * (1 - since / STOMP_SHAKE))
}

function stepBoss(world: World) {
	const boss = world.course.boss
	const run = world.space.boss
	if (!boss || !run || world.phase() !== 'running') return
	if (run.downAt !== undefined) return
	const now = world.ticks()
	const racing = world.racers.filter((r) => !r.out)
	const { room } = boss
	const floor = world.terrain.groundY(boss.x)
	const head = bossHead(world, boss)
	const half = boss.width / 2
	const awake = run.awake !== undefined

	for (const racer of racing) {
		const b = racer.body
		if (b.x < room.from - HITBOX_HALF_WIDTH) continue
		// Shut in: the way out's shut till it's beaten, and once it's awake,
		// the way in behind them.
		if (awake && b.x < room.from + WALL) {
			b.x = room.from + WALL
			b.vx = Math.max(0, b.vx)
		}
		if (b.x > room.to - WALL) {
			b.x = room.to - WALL
			b.vx = Math.min(0, b.vx)
		}
		// Down onto its head: a hit, and a bounce off it. Asleep, a bounce.
		if (
			b.vy > 0 &&
			Math.abs(b.x - boss.x) < boss.head / 2 + HITBOX_HALF_WIDTH &&
			b.feetY >= head - 2 &&
			b.feetY - b.vy <= head + HEAD_GIVE
		) {
			bounceOff(world, racer, head, b.x)
			if (awake && now - (run.hurtAt ?? -BOSS_HURT) >= BOSS_HURT)
				hit(world, run, boss)
			continue
		}
		// Its body's solid, awake or asleep: anyone into it is put back out
		// beside it, on whichever side they're nearer.
		if (b.feetY > head + HEAD_GIVE && Math.abs(b.x - boss.x) < half) {
			const side = b.x < boss.x ? -1 : 1
			b.x = boss.x + side * half
			if (b.vx * side < 0) b.vx = 0
		}
	}

	if (!awake) {
		if (
			!racing.length ||
			!racing.every((r) => r.body.x > room.from + DOOR_IN && r.body.x < room.to)
		)
			return
		// Everyone in: the door shuts behind them, and it wakes. In a Round,
		// as much more to it as there are of them.
		run.awake = now
		run.max = run.hp = boss.hp * (world.round ? racing.length : 1)
		run.nextVolley = now + 90
		play('roar')
		world.popup('Uh oh...', boss.x, head - 40)
		return
	}
	if (run.downAt !== undefined) return

	// A stomp: winding up, and down it comes, everyone shaken off whatever
	// they're up on, down to the floor.
	if (run.stompAt === now) stomp(world, boss, floor)

	if (now >= run.nextVolley && (run.stompAt ?? -1) <= now - STOMP_SHAKE) {
		volley(world, run, boss, floor)
		const left = run.hp / run.max
		run.nextVolley =
			now +
			Math.round(VOLLEY_FASTEST + (VOLLEY_SLOWEST - VOLLEY_FASTEST) * left)
	}
}

/** A hit on its head: one less to go, and every so many, it stomps. Beaten, it falls. */
function hit(world: World, run: BossRun, boss: Boss) {
	const now = world.ticks()
	run.hurtAt = now
	run.hp--
	run.hits++
	play('stomp')
	if (run.hp <= 0) {
		run.hp = 0
		run.downAt = now
		world.space.bolts = []
		// Its troopers go down with it, out cold on their girders.
		for (const state of world.obstacles) {
			const o = state.obstacle
			if (o.kind !== 'alien' || state.used) continue
			if (o.x < boss.room.from || o.x > boss.room.to) continue
			state.used = true
			state.flown = now
		}
		play('roar')
		world.popup('Beaten!', boss.x, bossHead(world, boss) - 60)
		return
	}
	if (run.hits >= boss.stompEvery) {
		run.hits = 0
		run.stompAt = now + STOMP_WIND
		world.popup('It’s angry!', boss.x, bossHead(world, boss) - 60)
	}
}

/** Down comes its foot: everyone up on something shaken off it, onto the floor; on it, knocked. */
function stomp(world: World, boss: Boss, floor: number) {
	play('timber')
	world.popup('STOMP!', boss.x, floor - boss.height / 2)
	for (const racer of world.racers) {
		if (racer.out) continue
		const b = racer.body
		if (b.x < boss.room.from || b.x > boss.room.to) continue
		const away = b.x < boss.x ? -1 : 1
		b.on = undefined
		b.grounded = false
		b.jumping = false
		b.flungDown = true
		if (b.feetY < floor - 2) {
			// Up on a girder, or its head, or jumping: down to the floor.
			b.vy = Math.max(b.vy, 6)
			b.vx = away * 3
		} else {
			// On the floor: knocked off their feet, a hop.
			b.vy = -4
			b.vx = away * 2
		}
		if (!shielded(world, b)) b.stumble = STUMBLE_TICKS
	}
}

/**
 * One of its volleys, in turn: a fan of bolts out of its mouth; two along
 * the floor, one low, to jump, and one to duck; or a row across, one at
 * each height of its girders. At whoever's on either side of it.
 */
function volley(world: World, run: BossRun, boss: Boss, floor: number) {
	const kind = run.volleys++ % 3
	const sides = new Set<number>()
	for (const r of world.racers)
		if (!r.out) sides.add(r.body.x < boss.x ? -1 : 1)
	const mouth = floor - boss.height * 0.55
	for (const side of sides) {
		const x = boss.x + side * (boss.width / 2 - 10)
		if (kind === 0) {
			for (let i = 0; i < 6; i++) {
				const angle = -0.9 + i * 0.32
				fire(
					world,
					{
						x,
						y: mouth,
						vx: side * Math.cos(angle) * BOSS_BOLT_SPEED,
						vy: Math.sin(angle) * BOSS_BOLT_SPEED,
						big: true,
					},
					i === 0,
				)
			}
		} else if (kind === 1) {
			fire(world, {
				x,
				y: floor - 14,
				vx: side * BOSS_BOLT_SPEED,
				vy: 0,
				big: true,
			})
			fire(
				world,
				{
					x: x + side * 120,
					y: floor - DUCK_HEIGHT - BIG_BOLT_RADIUS - 6,
					vx: side * BOSS_BOLT_SPEED,
					vy: 0,
					big: true,
				},
				false,
			)
		} else {
			for (let y = floor - 60; y > floor - boss.height; y -= 85)
				fire(
					world,
					{ x, y, vx: side * BOSS_BOLT_SPEED * 0.8, vy: 0, big: true },
					y === floor - 60,
				)
		}
	}
}

// --- All of it, a tick -------------------------------------------------------

/** Rocket Launch's state, on the world. */
export interface SpaceRun {
	bolts: Bolt[]
	nextBolt: number
	boss?: BossRun
	/** The cage, dropped: when, and by whom. */
	cage?: { droppedAt: number; by: string }
	/** When the rocket blew up, everyone thrown out of it into space. */
	boomAt?: number
}

export function createSpace(course: Course): SpaceRun {
	return { bolts: [], nextBolt: 0, boss: bossStart(course.boss) }
}

/** Whether the course has any of this. */
export const hasSpace = (course: Course) =>
	!!(
		course.portals?.some((p) => p.kind === 'launch') ||
		course.boss ||
		course.cage ||
		course.obstacles.some((o) => o.kind === 'alien')
	)

// --- To Remote Players -------------------------------------------------------

/** What's sent of it to Remote Players: see `RaceFrame`'s `space`. */
export function spaceFrame(world: World): NonNullable<RaceFrame['space']> {
	const { space } = world
	const tenth = (n: number) => Math.round(n * 10) / 10
	const boss = space.boss
	const not = (n: number | undefined) => n ?? -1
	return [
		space.bolts.map((b) => [
			b.id,
			tenth(b.x),
			tenth(b.y),
			tenth(b.vx),
			tenth(b.vy),
			b.big ? 1 : 0,
		]),
		boss
			? [
					not(boss.awake),
					boss.hp,
					boss.max,
					not(boss.hurtAt),
					not(boss.stompAt),
					not(boss.downAt),
				]
			: 0,
		space.cage
			? [
					space.cage.droppedAt,
					world.racers.findIndex((r) => r.id === space.cage?.by),
				]
			: 0,
		space.boomAt ?? -1,
	]
}

/** And back, on a Remote Player's screen, `ahead` ticks on from when it was sent. */
export function applySpaceFrame(
	world: World,
	[bolts, boss, cage, boom]: NonNullable<RaceFrame['space']>,
	ahead: number,
) {
	const { space } = world
	space.bolts = bolts.map(([id, x, y, vx, vy, big]) => ({
		id,
		x: x + vx * ahead,
		y: y + vy * ahead,
		vx,
		vy,
		born: 0,
		big: big === 1 || undefined,
	}))
	const was = (n: number) => (n < 0 ? undefined : n)
	if (boss && space.boss) {
		const [awake, hp, max, hurtAt, stompAt, downAt] = boss
		Object.assign(space.boss, {
			awake: was(awake),
			hp,
			max,
			hurtAt: was(hurtAt),
			stompAt: was(stompAt),
			downAt: was(downAt),
		})
	}
	space.cage = cage
		? { droppedAt: cage[0], by: world.racers[cage[1]]?.id ?? '' }
		: undefined
	space.boomAt = boom < 0 ? undefined : boom
}

/** A tick of it, after everyone's moved. */
export function stepSpace(world: World) {
	if (!hasSpace(world.course) || world.phase() !== 'running') return
	for (const racer of world.racers)
		if (!racer.out && !racer.body.grounded) dropCage(world, racer)
	openCage(world)
	fireAliens(world)
	stepBoss(world)
	flyBolts(world)
	const waits = busWaits(world)
	if (waits !== undefined && world.bus.frontX > waits) {
		world.bus.frontX = waits
		world.bus.speed = 0
	}
}
