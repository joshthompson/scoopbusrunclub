import type { Course } from '../courses/types'
import { MAN_BEAR_PIG } from '../runners/bonus'
import { unlockRunner } from '../saved/unlocked'
import { play } from '../sfx'
import {
	BUS_TOP_SPEED,
	GRAVITY,
	HILL_PULL,
	HITBOX_HALF_WIDTH,
	MAX_SPEED,
	PATH_BACK,
	PATH_FRONT,
	STUMBLE_TICKS,
	VIEW_HEIGHT,
	hillPull,
} from './constants'
import { bounceOff } from './pack'
import { isHeld } from './portals'
import { OVERSPEED_GRIP, flungOut } from './step'
import { BABY_BUS_PARKED, type Racer, type World } from './world'

/**
 * Huddinge's wild boar, and what it really is (see `Course['manBearPig']`).
 *
 * As whoever's racing in front comes up to it, a boar bursts out of the
 * trees behind the path, onto it, and trots along it, slower than anyone
 * runs: run into it and you trip over it. Past `leaves`, it bolts off the
 * front of the path and away. Land on its back, though, and everything
 * stops, a cut scene: the camera onto it, and in a puff of smoke it's
 * ManBearPig, roaring at whoever woke it, the screen shaking; then it's
 * after them, faster than the bus, and never far behind them, always on the
 * screen. Anyone it catches it smashes, flung out as out of the
 * bus's scoop; only coming down on its head, as it catches you up, stops
 * it a moment, dazed. Get over the finish line with it still after you,
 * and the first time, it's yours to run as. Once it's done chasing, it
 * stands there roaring, till the bus gets to it.
 *
 * Plain state, stepped on the Host, sent to a Room's screens as it is (see
 * `beastFrame`), and drawn by `draw/manBearPig.ts`.
 */

/**
 * - `waiting`: in the trees, not yet out
 * - `boar`: out on the path, trotting along it
 * - `fled`: bolted off the front of the path, and away
 * - `poof`: jumped on: a puff of smoke, and it's changing
 * - `roar`: ManBearPig, stood roaring
 * - `chase`: after whoever woke it
 * - `dazed`: come down on its head: stood, seeing stars
 * - `smash`: caught someone, smashing them
 * - `done`: the chase over, stood roaring where it stopped
 * - `scooped`: by the bus, at last, flying
 */
export const BEAST_STATES = [
	'waiting',
	'boar',
	'fled',
	'poof',
	'roar',
	'chase',
	'dazed',
	'smash',
	'done',
	'scooped',
] as const
export type BeastState = (typeof BEAST_STATES)[number]

export interface Beast {
	state: BeastState
	/** The middle of its feet. */
	x: number
	feetY: number
	/**
	 * How far off the path's line it is, down the screen: behind the path
	 * (negative), coming out of the trees; in front (positive), bolting.
	 */
	depth: number
	/** The tick its state began. */
	since: number
	/** How fast it's going along. */
	vx: number
	/** Flying, scooped: up and down, and its spin, in degrees. */
	vy: number
	spin: number
	/** How far it's run, for its stride. */
	ran: number
	/** Whoever woke it, by racer id: who it's after. */
	target?: string
	/** Whoever's tripped over it, as a boar, by racer id: once each. */
	tripped: string[]
	/**
	 * Its cut scene: jumped on, everything's held still while it changes and
	 * roars at whoever woke it (see `beastHolding`), till it's after them.
	 */
	cutscene: boolean
}

/** How near whoever's in front gets before the boar comes out: just on the screen ahead of them. */
const BOAR_WAKE = 420
/** How long it takes coming out of the trees onto the path. */
const BOAR_EMERGE_TICKS = 24
/** How fast it trots along the path: slower than anyone runs, to be caught up with. */
const BOAR_SPEED = 2.2
/** How fast it bolts, off the path, and how quickly it veers off it. */
const BOAR_BOLT_SPEED = 8
const BOAR_BOLT_ASIDE = 1.5
/** How far off the front of the path it bolts to. */
const BOAR_BOLT_DEPTH = PATH_FRONT + 26
/** The top of its back, over its feet; and how far either side of its middle it is. */
export const BOAR_BACK = 24
const BOAR_HALF = 22
/** Landing this far into its back still counts as on it. */
const BACK_GIVE = 8

/**
 * Its cut scene, jumped on: the boar shaking, `POOF_SHAKE` ticks; the smoke
 * billowing up round it, and at `POOF_CHANGE` it's ManBearPig in it, the
 * smoke clearing by `POOF_TICKS`; then roaring at whoever woke it, the
 * screen shaking, for `CUTSCENE_ROAR_TICKS`.
 */
export const POOF_SHAKE = 16
export const POOF_CHANGE = 30
export const POOF_TICKS = 50
export const CUTSCENE_ROAR_TICKS = 80
/** How long it roars, jumped clean over, before it's after them again. */
export const ROAR_TICKS = 34
/** How long a smash takes, and how long it's dazed for. */
export const SMASH_TICKS = 30
export const DAZED_TICKS = 40
/**
 * Where whoever landed on it is held, all through its cut scene: bounced
 * off it, up in the air in front of its snout, to be roared at.
 */
const TOSSED_AHEAD = 58
const TOSSED_UP = 34
/**
 * How far behind whoever it's after it ever gets, chasing: dragged along
 * by it, it's always on the screen, close behind them. And never off the
 * screen's left edge, however far the camera's out ahead of them: at
 * least `EDGE_IN` of it showing.
 */
const LEASH = 230
const EDGE_IN = 40
/**
 * How fast it runs on the flat: faster than the bus, and faster than anyone
 * runs without a boost. Hills pull at it as at anyone (`HILL_PULL`): down
 * one, it gathers speed, and keeps it, as anyone does, losing it no faster
 * than `OVERSPEED_GRIP`; up one, it slows, but it's back up to its own
 * speed far quicker than anyone, by `CHASE_GRIP`. From standing, it's off
 * by `CHASE_PICKUP` a tick. Never faster than `CHASE_MOST`: a touch faster
 * than anyone at all.
 */
export const CHASE_SPEED = BUS_TOP_SPEED + 1.3
const CHASE_PICKUP = 0.35
const CHASE_GRIP = 0.05
const CHASE_MOST = MAX_SPEED + 0.5
/**
 * The top of it, over its feet, to come down on: its hunched shoulders and
 * the back of its head, a little under the top of its ears.
 */
export const BEAST_TOP = 72
/** How far ahead of its middle it reaches, catching someone; and behind, to be past them. */
const BEAST_REACH = 16
const BEAST_BEHIND = 26
/** How far past whoever it's after it gets, jumped over, before it's stopped to turn. */
const OVERSHOT = 60
/** How far either side of its middle its head is, to come down on. */
const HEAD_HALF = 26
const HEAD_GIVE = 8
/** How far it's flung someone it's smashed: further than the bus does. */
const SMASH_VX = 13
const SMASH_VY = -17
/** Its run's stride, a frame of it each. */
const BEAST_STRIDE = 13
const BOAR_STRIDE = 9

/** The course's boar, waiting in the trees, if it has one. */
export function createBeast(
	course: Pick<Course, 'manBearPig'>,
): Beast | undefined {
	const at = course.manBearPig
	if (!at) return undefined
	return {
		state: 'waiting',
		x: at.x,
		feetY: 0,
		depth: -PATH_BACK,
		since: 0,
		vx: 0,
		vy: 0,
		spin: 0,
		ran: 0,
		tripped: [],
		cutscene: false,
	}
}

/**
 * Its speed, on from `vx`, chasing, at `x`: pulled by the hill there, and
 * back towards its own speed, quickly from under it and slowly from over.
 */
function chasePace(world: World, vx: number, x: number) {
	const pulled = vx + hillPull(world.terrain.slope(x)) * HILL_PULL
	const grip = pulled < CHASE_SPEED ? CHASE_GRIP : OVERSPEED_GRIP
	return Math.max(
		1,
		Math.min(CHASE_MOST, pulled + (CHASE_SPEED - pulled) * grip),
	)
}

/** Whether `racer` is running, and there to be caught, tripped or landed on. */
const about = (world: World, racer: Racer) =>
	!racer.out && !isHeld(world, racer) && !racer.body.bubble

/** Its states woken, and after whoever woke it, still. */
const AFTER_SOMEONE: ReadonlySet<BeastState> = new Set([
	'poof',
	'roar',
	'chase',
	'dazed',
	'smash',
])

/** Its state from now. */
function become(world: World, beast: Beast, state: BeastState) {
	beast.state = state
	beast.since = world.ticks()
}

export function stepBeast(world: World) {
	const beast = world.beast
	const at = world.course.manBearPig
	if (!beast || !at) return
	const now = world.ticks()
	const t = now - beast.since
	const running = world.phase() === 'running' || world.round

	switch (beast.state) {
		case 'waiting': {
			if (world.phase() !== 'running') return
			const near = world.racers.some(
				(r) => !r.out && r.body.x > at.x - BOAR_WAKE,
			)
			if (!near) return
			become(world, beast, 'boar')
			beast.x = at.x
			beast.depth = -PATH_BACK
			play('squeal')
			break
		}
		case 'boar': {
			// Out of the trees behind the path, onto it; along it; and off
			// the front of it, bolting, once it's far enough.
			beast.depth = Math.min(0, -PATH_BACK * (1 - t / BOAR_EMERGE_TICKS))
			beast.vx = BOAR_SPEED
			if (beast.x > at.leaves) {
				become(world, beast, 'fled')
				play('squeal')
			}
			break
		}
		case 'fled':
			beast.vx = BOAR_BOLT_SPEED
			beast.depth = Math.min(BOAR_BOLT_DEPTH, beast.depth + BOAR_BOLT_ASIDE)
			break
		case 'poof':
			beast.vx = 0
			if (t >= POOF_TICKS) {
				become(world, beast, 'roar')
				play('manBearPigRoar')
				world.popup('ManBearPig!', beast.x, beast.feetY - BEAST_TOP - 30)
			}
			break
		case 'roar':
		case 'dazed':
		case 'smash':
			beast.vx = 0
			if (
				t >=
				(beast.state === 'roar'
					? beast.cutscene
						? CUTSCENE_ROAR_TICKS
						: ROAR_TICKS
					: beast.state === 'dazed'
						? DAZED_TICKS
						: SMASH_TICKS)
			) {
				// Its cut scene over: everyone's off again, it after them.
				beast.cutscene = false
				become(world, beast, targetRunning(world, beast) ? 'chase' : 'done')
			}
			break
		case 'chase':
			// Off from standing, then running as the hills let it.
			beast.vx =
				beast.vx < CHASE_SPEED - CHASE_PICKUP
					? beast.vx + CHASE_PICKUP
					: chasePace(world, beast.vx, beast.x)
			break
		case 'done': {
			beast.vx *= 0.85
			// The bus gets to it, at last: scooped up and flung off, gone.
			const { bus } = world
			if (bus.frontX !== BABY_BUS_PARKED && bus.frontX > beast.x - BOAR_HALF) {
				become(world, beast, 'scooped')
				beast.vx = Math.max(bus.speed, 2) + 3
				beast.vy = -14
				beast.spin = 0
				bus.scooping = 10
				play('whoosh')
			}
			break
		}
		case 'scooped':
			if (beast.feetY > VIEW_HEIGHT + 400) return
			beast.x += beast.vx
			beast.vy += GRAVITY
			beast.feetY += beast.vy
			beast.spin += 8
			return
	}

	beast.x += beast.vx
	beast.ran += beast.vx
	if (beast.state === 'chase' || beast.state === 'dazed')
		keepClose(world, beast)
	beast.feetY = world.terrain.groundY(beast.x)

	if (AFTER_SOMEONE.has(beast.state)) {
		// Whoever's after it, home with it still after them: theirs, now.
		// Over the line ends single player's race, so before that's looked at.
		const target = world.racers.find((r) => r.id === beast.target)
		if (target?.out === 'finished') {
			survived(world, target)
			become(world, beast, 'done')
			return
		}
		if (!target || target.out) {
			if (beast.state === 'chase') become(world, beast, 'done')
			return
		}
	}
	if (!running) return
	if (beast.state === 'boar') {
		for (const racer of world.racers)
			if (about(world, racer)) meetBoar(world, beast, racer)
		return
	}
	if (beast.state === 'chase') {
		for (const racer of world.racers)
			if (about(world, racer) && meetBeast(world, beast, racer)) return
		smashPack(world, beast)
		// Run on under whoever it's after, jumped clean over: it skids to a
		// stop, roaring, and comes on after them again.
		const target = world.racers.find((r) => r.id === beast.target)
		if (target && target.body.x < beast.x - OVERSHOT) {
			become(world, beast, 'roar')
			beast.vx = 0
			play('beastRoar')
		}
	}
}

/**
 * Chasing, or dazed: never further behind whoever it's after than its
 * leash, nor off the left of the screen, dragged along if it would be; at
 * their speed, at least, so it's on them again as soon as it's able.
 */
function keepClose(world: World, beast: Beast) {
	const target = world.racers.find((r) => r.id === beast.target)
	if (!target) return
	const behind = Math.max(target.body.x - LEASH, world.camera() + EDGE_IN)
	// Not past them, though, dragged: only ever up behind them.
	const back = Math.min(
		behind,
		target.body.x - BEAST_BEHIND - HITBOX_HALF_WIDTH,
	)
	if (beast.x >= back) return
	beast.ran += back - beast.x
	beast.x = back
	if (beast.state === 'chase') beast.vx = Math.max(beast.vx, target.body.vx)
}

/**
 * Whether its cut scene's on: everything held still (the race's clock, the
 * bus, everyone in it) but it, changing and roaring (see `stepWorld`).
 */
export const beastHolding = (world: Pick<World, 'beast'>) =>
	!!world.beast?.cutscene

/**
 * The camera, in its cut scene: swung round onto it, and on whoever it's
 * roaring at. Whether it's had the camera.
 */
export function beastCamera(world: World) {
	const beast = world.beast
	if (!beast?.cutscene) return false
	const ease = 0.12
	const middle = beast.x + TOSSED_AHEAD / 2
	const camera = middle - world.viewWidth() / 2
	world.setCamera(world.camera() + (camera - world.camera()) * ease)
	return true
}

/** How hard it's shaking the screen, roaring in its cut scene: px either way, across and up and down. */
const SHAKE = 12
export function beastShake(world: Pick<World, 'beast' | 'ticks'>) {
	const beast = world.beast
	if (!beast?.cutscene || beast.state !== 'roar') return { x: 0, y: 0 }
	const t = world.ticks() - beast.since
	const fade = Math.max(0, 1 - t / CUTSCENE_ROAR_TICKS)
	// Hardest as it starts, a roar's first blast, dying away.
	const strength = Math.round(SHAKE * (t < 30 ? 1 : fade * 1.6))
	return {
		x: (t % 4 < 2 ? 1 : -1) * strength,
		y: (t % 6 < 3 ? 1 : -1) * Math.round(strength * 0.6),
	}
}

/** Whether whoever it's after is still running. */
function targetRunning(world: World, beast: Beast) {
	const target = world.racers.find((r) => r.id === beast.target)
	return !!target && !target.out
}

/**
 * Coming down on the boar's back: it's ManBearPig, in a puff of smoke, and
 * it's after them. Running into it, they trip over it.
 */
function meetBoar(world: World, beast: Beast, racer: Racer) {
	// Not till it's out of the trees, onto the path.
	if (beast.depth < -4) return
	const b = racer.body
	const dx = b.x - beast.x
	const back = beast.feetY - BOAR_BACK
	const was = b.feetY - b.vy
	if (
		b.vy > 0 &&
		Math.abs(dx) < BOAR_HALF + HITBOX_HALF_WIDTH - 4 &&
		was <= back + BACK_GIVE &&
		b.feetY >= back
	) {
		bounceOff(world, racer, back, beast.x)
		// Off it, up in front of its snout, held there while it changes.
		b.x = beast.x + TOSSED_AHEAD
		b.feetY = beast.feetY - TOSSED_UP
		b.facing = 1
		beast.target = racer.id
		beast.vx = 0
		beast.cutscene = true
		become(world, beast, 'poof')
		play('squeal')
		return
	}
	if (
		Math.abs(dx) < BOAR_HALF / 2 + HITBOX_HALF_WIDTH &&
		b.feetY > back + 4 &&
		b.mount === 0 &&
		!beast.tripped.includes(racer.id)
	) {
		beast.tripped.push(racer.id)
		b.stumble = Math.max(b.stumble, STUMBLE_TICKS)
		play('squeal')
		play('stumble')
	}
}

/**
 * ManBearPig catching up with someone: come down on its head, they're off
 * it, and it's dazed a moment; otherwise, smashed. Whether it got to them.
 */
function meetBeast(world: World, beast: Beast, racer: Racer) {
	const b = racer.body
	const dx = b.x - beast.x
	const top = beast.feetY - BEAST_TOP
	const was = b.feetY - b.vy
	if (
		b.vy > 0 &&
		Math.abs(dx) < HEAD_HALF + HITBOX_HALF_WIDTH &&
		was <= top + HEAD_GIVE &&
		b.feetY >= top
	) {
		bounceOff(world, racer, top, beast.x)
		become(world, beast, 'dazed')
		beast.vx = 0
		world.popup('Dazed!', beast.x, top - 30)
		return true
	}
	// Over its head, still: it runs on under them.
	if (b.feetY < top + HEAD_GIVE) return false
	if (
		dx - HITBOX_HALF_WIDTH > BEAST_REACH ||
		dx + HITBOX_HALF_WIDTH < -BEAST_BEHIND
	)
		return false
	become(world, beast, 'smash')
	beast.vx = 0
	play('pound')
	b.smashed = true
	flungOut(world, racer, SMASH_VX, SMASH_VY, 'Smashed by ManBearPig!')
	return true
}

/** Everyone else out running that it gets to: smashed out of its way. */
function smashPack(world: World, beast: Beast) {
	for (const p of world.pack) {
		if (p.scooped || p.shrink !== undefined) continue
		const dx = p.x - beast.x
		if (dx > BEAST_REACH + HITBOX_HALF_WIDTH || dx < -BEAST_BEHIND) continue
		p.scooped = true
		p.grounded = false
		p.vx = SMASH_VX - 2 + Math.random() * 3
		p.vy = SMASH_VY + Math.random() * 3
		p.spin = 0
		play('pound')
	}
}

/** Over the line with ManBearPig after them, and the first time, it's theirs to run as. */
function survived(world: World, racer: Racer) {
	const b = racer.body
	if (!world.preview && unlockRunner(MAN_BEAR_PIG.id)) {
		b.unlocked = MAN_BEAR_PIG.id
		play('cheer')
		world.popup(`${MAN_BEAR_PIG.name} unlocked!`, b.x, b.feetY - 110)
	} else world.popup('Survived!', b.x, b.feetY - 110)
}

/**
 * What a Room's screens need to draw it: [state, x, feetY, depth, since,
 * ran, spin, in its cut scene: 1 or 0].
 */
export type BeastFrame = [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
]

export const beastFrame = (beast: Beast): BeastFrame => [
	BEAST_STATES.indexOf(beast.state),
	Math.round(beast.x * 10) / 10,
	Math.round(beast.feetY * 10) / 10,
	Math.round(beast.depth),
	beast.since,
	Math.round(beast.ran),
	Math.round(beast.spin),
	beast.cutscene ? 1 : 0,
]

export function applyBeastFrame(beast: Beast, frame: BeastFrame) {
	const [state, x, feetY, depth, since, ran, spin, cutscene] = frame
	beast.state = BEAST_STATES[state] ?? 'waiting'
	beast.x = x
	beast.feetY = feetY
	beast.depth = depth
	beast.since = since
	beast.ran = ran
	beast.spin = spin
	beast.cutscene = cutscene === 1
}

/** Which of its run frames it's on: the boar's four, or ManBearPig's. */
export const boarStride = (beast: Beast) => Math.floor(beast.ran / BOAR_STRIDE)
export const beastStride = (beast: Beast) =>
	Math.floor(beast.ran / BEAST_STRIDE)
