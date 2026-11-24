import {
	PIPE_UNDER_Y,
	SINK_TAPS,
	SPOUTS_X,
	SPOUT_Y,
	TOILET_BOWL,
	URINAL_PIPE,
} from '../courses/kit/bathroomScenery'
import {
	GROUND_Y,
	RUNNER_SCALE,
	RUN_TOP_SPEED,
	STAND_HEIGHT,
	TICK_MS,
	VIEW_HEIGHT,
} from '../game/constants'
import { type Racer, type World, bodyHeight } from '../game/world'
import type { Controls } from '../input'
import { play } from '../sfx'
import { ARENA_LEFT, ARENA_WALLS, arenaCourse, inRandomOrder } from './arena'
import { clock } from './clock'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Jughead: a badly kept public bathroom, a high ceiling, rusty pipes along
 * it, and everyone with a big glass jug on their head, its mouth up. Water
 * comes out of the pipes' spouts, a stream here and a drip there, starting
 * and stopping and moving on to another spout; stand under a stream with
 * your jug's mouth in it to fill it. Whoever's jug's highest under a
 * stream gets all of it: jump into someone else's to steal it.
 *
 * The water in the jug sloshes, a damped spring, set going by speeding up,
 * stopping and turning, jumping and landing, and being bounced on; slosh
 * it up over the rim and it spills, more easily the fuller it is. Run flat
 * out and stop dead, and there it goes; edge along gently, and it doesn't.
 * Duck, and it tips forward.
 *
 * Bumping into each other, they're pushed apart, a little: crowding
 * someone off a stream's a shove, and a slosh.
 *
 * Now and then something gives: the toilet erupts in a fountain, a sink
 * bursts, the broken urinal squirts, a pipe bursts and gushes; each an arc
 * of water to get under, where it comes down. They come more often and
 * bigger as it goes on, the streams move on quicker, and near the end
 * the cistern goes. And all the while the floor's flooding, slowly, the
 * quicker the more water's coming down on it, up to their waists: a few
 * px deep, they're wading, slower, and their jugs slosh no less for it.
 * The first to fill their jug wins; after a minute and a bit, whoever's
 * fullest.
 */

/** How long it goes on, at most: a minute and ten seconds. */
export const JUG_TICKS = Math.round(70_000 / TICK_MS)
/** How long a mishap's said, big, as it starts. */
const ANNOUNCED_FOR = 90

// --- The jug ------------------------------------------------------------------

/**
 * The jug, its rows top to bottom, how wide each is in cells (2 px): its
 * lip, its neck, its shoulders, its body, its foot. Its walls are a cell
 * thick; inside them, the water.
 */
export const JUG_ROWS = [
	9, 7, 7, 9, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 11,
]
export const JUG_CELL = 2
export const JUG_TALL = JUG_ROWS.length * JUG_CELL
/** How far down over the top of their head its foot sits: on their hair. */
export const JUG_SINK = 6
/** How far either side of its mouth's middle it catches water. */
export const MOUTH_HALF = 8

/** Where the top of `racer`'s head is, as they're stood (or ducked) just now. */
export function headTop(racer: Racer) {
	const b = racer.body
	return (
		b.feetY -
		racer.runner.sprite.height * RUNNER_SCALE * (bodyHeight(b) / STAND_HEIGHT)
	)
}

/**
 * Where each racer's head's drawn just now, from their feet, if it's been
 * drawn: handed over by the drawing (see `draw/jughead`), so the jug's
 * where it's seen, and water goes into it there, whoever's sprite it is.
 */
type HeadFinder = (racer: Racer) => { x: number; y: number } | undefined
let drawnHead: HeadFinder | undefined
export const findHeadsBy = (find: HeadFinder | undefined) => {
	drawnHead = find
}

/** The foot of `racer`'s jug, its middle: on their head as it's drawn, or (till it is) where it'd be. */
export function jugFootOf(racer: Racer) {
	const b = racer.body
	const head = drawnHead?.(racer)
	// On the 2 px grid, as it's drawn, so water stops right at its lip.
	const y = (head ? b.feetY + head.y : headTop(racer)) + JUG_SINK
	return { x: head ? b.x + head.x : b.x, y: Math.round(y / 2) * 2 }
}

/** Where `racer`'s jug's mouth is, its middle: up on top of it, on their head. */
export function mouthOf(racer: Racer) {
	const foot = jugFootOf(racer)
	return { x: foot.x, y: foot.y - JUG_TALL }
}

// --- Its water ----------------------------------------------------------------

/**
 * Its slosh: a damped spring, the water's surface's tilt (how much higher
 * one side is than the middle, as a share of the jug's height), pulled
 * back level, slowed, and pushed by how quickly they speed up or slow down.
 */
const SLOSH_K = 0.02
const SLOSH_DAMP = 0.035
const SLOSH_PUSH = 0.025
/** Running along, it jiggles a little, more the faster; wading, more, more the faster they're going for how fast they can. */
const JIGGLE = 0.0013
const WADE_ROCK = 0.006
/** Jumping, it's jolted; landing, more the faster they came down, and a full one slops over. */
const TAKE_OFF_JOLT = 0.04
const LAND_JOLT = 0.015
const LAND_MOST = 0.14
const SLOP_FROM = 0.82
const SLOP_RATE = 0.01
/** Ducked: it tips forward, the way they face. */
const DUCK_TIP = 0.35
const DUCK_PULL = 0.02
/** Bounced on: a good share of what's in it knocked out, and a big slosh. */
const BOUNCED_SPILL = 0.4
const BOUNCED_SLOSH = 0.25
/**
 * How far its surface's tilt reaches up its sides, and less up in its
 * narrow neck, from how full; and how quickly what's over the rim spills
 * out, a tick.
 */
const TILT_REACH = 0.68
const NECK_FROM = 0.8
const NECK_REACH = 0.45
const SPILL_RATE = 0.055
/** Shoved by someone: sloshed as by speeding up that much. */
const SHOVE_SLOSH = 0.3
/**
 * Spilling a lot at once, it's said, over them: how much, of what's been
 * spilt lately (kept a share of a tick), and not again for a while.
 */
const SPLOSH_FROM = 0.05
const SPLOSH_KEEP = 0.95
const SPLOSH_EVERY = 90
const SPLOSHES = ['Sploosh!', 'Splash!', 'Slosh!', 'Whoops!']
/** Stood in each other's way: how close they're pushed apart from, and how much of how far in they are, a tick. */
const SHOVE_NEAR = 18
const SHOVE = 0.09
/** Going into someone, slowed this much a tick. */
const SHOVE_DRAG = 0.9
/** How far up or down off each other they can be and still push: not one on the other's head. */
const SHOVE_HIGH = 24

/** A jug of water, as it is: how full, its surface's tilt and how fast it's tipping, and when it was filled. */
export interface Jug {
	fill: number
	tilt: number
	spin: number
	filledAt?: number
	/** What's been spilt out of it, all told. */
	spilt: number
	/** What's been spilt lately, fading; and when a spill was last said. */
	lately?: number
	saidAt?: number
}

// --- The water ----------------------------------------------------------------

/**
 * Where water comes from: `stream`s, `drip`s and `gush`es out of the
 * pipes' spouts, straight down, and `seep`s, a seam along the big pipe
 * leaking, dripping all along it, wide; and arcs, the mishaps: a `fountain` out of
 * the toilet, a `spray` off a burst sink, a `squirt` out of the urinal.
 */
export type JetKind =
	| 'drip'
	| 'stream'
	| 'gush'
	| 'fountain'
	| 'spray'
	| 'squirt'
	| 'seep'
export const JET_KINDS: JetKind[] = [
	'drip',
	'stream',
	'gush',
	'fountain',
	'spray',
	'squirt',
	'seep',
]
/** How much of a jug each fills a tick, caught. */
const JET_RATE: Record<JetKind, number> = {
	drip: 0.00015,
	stream: 0.00095,
	gush: 0.0013,
	fountain: 0.0022,
	spray: 0.0009,
	squirt: 0.0008,
	seep: 0.0005,
}
/** How wide each is, either side of its middle, in px. */
export const JET_HALF: Record<JetKind, number> = {
	drip: 1,
	stream: 5,
	gush: 9,
	fountain: 8,
	spray: 4,
	squirt: 3,
	seep: 16,
}
/** How fast water falls, a tick. */
export const WATER_FALL = 0.3

/**
 * A jet of water, going from tick `from` to `until`, by the race's ticks:
 * out of `x`, `y` at `vx`, `vy`, falling as it goes; how much more it
 * gives than usual; and, a mishap, what's said as it starts (its place in
 * `MISHAPS`).
 */
export interface Jet {
	id: number
	kind: JetKind
	x: number
	y: number
	vx: number
	vy: number
	from: number
	until: number
	strength: number
	says?: number
}
/** What's said as each mishap starts. */
export const MISHAPS = [
	'The toilet’s erupting!',
	'A sink’s burst!',
	'The urinal’s squirting!',
	'A pipe’s burst!',
	'The cistern’s gone!',
]

/** How long a stream warns, dripping, before it runs; how long one runs, to begin with and at the end: not long, so they keep moving. */
export const WARN_TICKS = 45
const STREAM_FIRST = Math.round(4_000 / TICK_MS)
const STREAM_LAST = Math.round(2_800 / TICK_MS)
/** How long after a spout stops it's left alone: the next starts somewhere else. */
const SPOUT_REST = 90
/** How many streams at once, to begin with and from halfway; and how many playing is a crowd, with one more. */
const STREAMS_FIRST = 2
const STREAMS_LATER = 3
const CROWD = 5
/** How many spouts drip, besides; and seams along the pipe seep, to begin with and from halfway, and how long each. */
const DRIPS = 2
const SEEPS_FIRST = 1
const SEEPS_LATER = 2
const SEEP_TICKS = 300
/** Where along the pipe a seam can leak, across the screen; and how far apart two are, at least. */
const SEEP_FROM = 60
const SEEP_TO = 900
const SEEP_APART = 90
/** When the first mishap is, and how long between them, to begin with and at the end; how long one goes on. */
const FIRST_MISHAP = Math.round(9_000 / TICK_MS)
const MISHAP_EVERY_FIRST = Math.round(14_000 / TICK_MS)
const MISHAP_EVERY_LAST = Math.round(7_000 / TICK_MS)
const MISHAP_TICKS = Math.round(5_000 / TICK_MS)
/** When the cistern goes, and for how long. */
const CISTERN_AT = Math.round(52_000 / TICK_MS)
const CISTERN_TICKS = Math.round(7_000 / TICK_MS)

/**
 * How far the toilet's fountains sway, back and forth, for how strong
 * they are: its sideways speed swinging this much either way, two slow
 * waves mixed, at their own pace and from their own start, picked from the
 * jet's id, so every screen has the same sway, unpredictably.
 */
const FOUNTAIN_SWAY = 0.85
const swayOf = (jet: Jet) =>
	jet.kind === 'fountain' ? FOUNTAIN_SWAY * jet.strength : 0
/** A number from 0 to 1, from `n`: the same everywhere. */
const unit = (n: number) => {
	const v = Math.sin(n * 12.9898) * 43758.5453
	return v - Math.floor(v)
}
/** `jet`'s sideways speed, leaving its spout at race tick `at`: swaying, a fountain. */
export function jetVx(jet: Jet, at: number) {
	const sway = swayOf(jet)
	if (!sway) return jet.vx
	const slow = 0.017 + unit(jet.id + 1) * 0.012
	const quick = 0.043 + unit(jet.id + 2) * 0.025
	const wave =
		0.65 * Math.sin(at * slow + unit(jet.id + 3) * Math.PI * 2) +
		0.35 * Math.sin(at * quick + unit(jet.id + 4) * Math.PI * 2)
	return jet.vx + sway * wave
}

/**
 * Where a jet is `t` ticks out of its spout, at race tick `now`: what left
 * it then, `t` ticks ago, as sideways as it was then, so a swaying
 * fountain bends like a hose swung, not swinging stiff.
 */
export const jetAt = (jet: Jet, t: number, now?: number) => ({
	x: jet.x + (now === undefined ? jet.vx : jetVx(jet, now - t)) * t,
	y: jet.y + jet.vy * t + (WATER_FALL * t * t) / 2,
})

/** How long a jet takes to come down to `y`, if it gets there, coming down. */
export function jetReaches(jet: Jet, y: number) {
	const a = WATER_FALL / 2
	const c = jet.y - y
	const d = jet.vy * jet.vy - 4 * a * c
	if (d < 0) return undefined
	const t = (-jet.vy + Math.sqrt(d)) / (2 * a)
	return t > 0 ? t : undefined
}

/** The floor, where water that's not caught lands. */
export const FLOOR_Y = GROUND_Y

/**
 * The flood: how deep it gets, at most, up to their waists; how fast it
 * rises a tick, on its own, and for every jet coming down into it (more
 * for the big ones). Till it's `PUDDLES_TILL` deep it's puddles,
 * spreading, joining up; then it comes up from the bottom of the screen,
 * past their feet, and by `RISEN_AT` it's level, coming up their legs.
 * How deep it is round their legs before it slows them, and how fast they
 * can go in it at its deepest.
 */
export const FLOOD_MOST = 24
const FLOOD_RISE = 0.0045
const FLOOD_PER_JET = 0.0016
const FLOOD_BIG_JET = 2.5
export const PUDDLES_TILL = 4
export const RISEN_AT = 10
const WADE_FROM = 4
const WADE_TOP = 3.2

/**
 * Where `jet` ends, just now: in the first jug it comes down into (its
 * mouth under it, highest first, straight down; the first along it, an
 * arc), or on the floor (the flood's top, `floor`); and whose jug, if
 * it's caught.
 */
export function jetEnds(
	jet: Jet,
	racers: Racer[],
	now?: number,
	floor = FLOOR_Y,
) {
	let best: { t: number; racer: Racer } | undefined
	for (const racer of racers) {
		const mouth = mouthOf(racer)
		if (mouth.y <= jet.y && jet.vy >= 0 && jet.vx === 0) continue
		const t = jetReaches(jet, mouth.y)
		if (t === undefined) continue
		const at = jetAt(jet, t, now)
		if (Math.abs(at.x - mouth.x) > MOUTH_HALF + JET_HALF[jet.kind]) continue
		if (!best || t < best.t) best = { t, racer }
	}
	const t = best?.t ?? jetReaches(jet, floor) ?? 0
	return { t, at: jetAt(jet, t, now), racer: best?.racer }
}

/** Whether `jet`'s running at race tick `t`. */
export const running = (jet: Jet, t: number) => t >= jet.from && t < jet.until

/** What's to be drawn of a game of Jughead. */
export interface JugShow {
	racers: Racer[]
	jugs: Map<string, Jug>
	jets: Jet[]
	/** How deep the floor's flooded, in px. */
	flood: number
}
/**
 * The flood's top, down the screen, as it's seen: off the bottom of it,
 * puddles; coming up from there to level, past their feet; then level, up
 * their legs.
 */
export function floodTopOf(show: JugShow) {
	const deep = show.flood
	if (deep < PUDDLES_TILL) return VIEW_HEIGHT
	if (deep < RISEN_AT)
		return (
			VIEW_HEIGHT +
			((FLOOR_Y - RISEN_AT - VIEW_HEIGHT) * (deep - PUDDLES_TILL)) /
				(RISEN_AT - PUDDLES_TILL)
		)
	return FLOOR_Y - deep
}
/** Where water lands just now: on the floor, or the flood's top, once it's over their feet. */
export const surfaceOf = (show: JugShow) => Math.min(FLOOR_Y, floodTopOf(show))
/** How deep `racer`'s in the flood, in px, if they're in it: their feet under its top. */
export const depthIn = (show: JugShow, racer: Racer) =>
	Math.max(0, racer.body.feetY - surfaceOf(show))
const shows = new WeakMap<World, JugShow>()
/** `world`'s game of Jughead, for drawing, if it's one. */
export const jugheadOf = (world: World) => shows.get(world)

export const jughead: Minigame = {
	id: 'jughead',
	name: 'Jughead',
	blurb:
		'Fill the glass jug on your head! Stand under the water pouring from the pipes, and catch the toilet when it erupts. Run too fast or stop too hard and it sloshes out. Bounce on heads to spill theirs. First to fill it wins!',
	tune: 'sewers',
	collectables: [],
	course: arenaCourse(
		'jughead',
		'Jughead',
		'Fill your jug under the leaky pipes. Careful: it sloshes!',
		// A badly kept public bathroom, drawn whole (see `draw/jughead`).
		{ far: [], near: [], horizonTrees: false, ground: [] },
	),
	start: startJughead,
}

/** `x` across the screen, along the world. */
const screenToWorld = (x: number) => ARENA_LEFT + x

function startJughead(world: World): MinigameRun {
	const { racers } = world
	const solo = racers.length === 1
	const jugs = new Map<string, Jug>()
	const show: JugShow = { racers, jugs, jets: [], flood: 0 }
	shows.set(world, show)

	// Everyone spread out across the floor, facing in, their hats off: the
	// jug's on their head.
	const { left: LEFT, right: RIGHT } = ARENA_WALLS
	inRandomOrder(racers).forEach((racer, i) => {
		const b = racer.body
		b.x = Math.round(
			LEFT + 40 + ((RIGHT - LEFT - 80) * (i + 0.5)) / racers.length,
		)
		b.feetY = world.terrain.groundY(b.x)
		b.floor = b.feetY
		b.grounded = true
		b.facing = b.x < (LEFT + RIGHT) / 2 ? 1 : -1
		b.hat = undefined
		b.celebrating = false
		jugs.set(racer.id, { fill: 0, tilt: 0, spin: 0, spilt: 0 })
	})
	const jugOf = (racer: Racer) => jugs.get(racer.id) as Jug
	/** What each racer was doing last tick, for how they've sped up, landed, been bounced on. */
	const was = new Map(
		racers.map((r) => [r.id, { vx: 0, vy: 0, grounded: true, stomped: 0 }]),
	)

	let nextJet = 0
	const t = () => world.raceTicks()
	const progress = () => Math.min(1, t() / JUG_TICKS)
	const over = () => !!world.order()
	const filled = (racer: Racer) => jugOf(racer).filledAt !== undefined
	const pct = (racer: Racer) => Math.floor(jugOf(racer).fill * 100)

	// --- The water's comings and goings ------------------------------------------
	let nextMishap = FIRST_MISHAP
	/** Streams lately stopped: their spouts left alone a while. */
	let stopped: Jet[] = []
	let cisternGone = false
	/** A spout not running just now, nor about to. */
	function freeSpout(now: number) {
		// Not one running, nor about to, nor that's only just stopped.
		const busy = new Set(
			[...show.jets, ...stopped]
				.filter((j) => j.until > now - SPOUT_REST && j.kind !== 'gush')
				.map((j) => j.x),
		)
		const free = SPOUTS_X.map(screenToWorld).filter((x) => !busy.has(x))
		return free[Math.floor(Math.random() * free.length)]
	}
	function addJet(jet: Omit<Jet, 'id'>) {
		show.jets.push({ ...jet, id: nextJet++ })
	}
	/** Streams and drips kept going: as one stops, another starts, at another spout, warning first. */
	function keepFlowing(now: number) {
		const p = progress()
		const streams = show.jets.filter(
			(j) => j.kind === 'stream' && j.until > now,
		).length
		// One more, for a crowd.
		const want =
			(p < 0.5 ? STREAMS_FIRST : STREAMS_LATER) +
			(racers.length >= CROWD ? 1 : 0)
		if (streams < want) {
			const x = freeSpout(now)
			if (x !== undefined) {
				const long = STREAM_FIRST + (STREAM_LAST - STREAM_FIRST) * p
				const from = now + WARN_TICKS
				addJet({
					kind: 'stream',
					x,
					y: SPOUT_Y,
					vx: 0,
					vy: 0,
					from,
					until: from + Math.round(long * (0.8 + Math.random() * 0.4)),
					strength: 1,
				})
			}
		}
		const drips = show.jets.filter(
			(j) => j.kind === 'drip' && j.until > now,
		).length
		if (drips < DRIPS) {
			const x = freeSpout(now)
			if (x !== undefined)
				addJet({
					kind: 'drip',
					x,
					y: SPOUT_Y,
					vx: 0,
					vy: 0,
					from: now,
					until: now + 150 + Math.floor(Math.random() * 150),
					strength: 1,
				})
		}
		const seeps = show.jets.filter((j) => j.kind === 'seep' && j.until > now)
		if (seeps.length < (p < 0.5 ? SEEPS_FIRST : SEEPS_LATER)) {
			const x = screenToWorld(SEEP_FROM + Math.random() * (SEEP_TO - SEEP_FROM))
			if (seeps.every((j) => Math.abs(j.x - x) > SEEP_APART))
				addJet({
					kind: 'seep',
					x: Math.round(x),
					y: PIPE_UNDER_Y,
					vx: 0,
					vy: 0,
					from: now,
					until: now + Math.round(SEEP_TICKS * (0.8 + Math.random() * 0.6)),
					strength: 1,
				})
		}
	}
	/** Something gives: the toilet, a sink, the urinal or a pipe. Bigger, later. */
	function mishap(now: number) {
		const strength = 1 + progress() * 0.4
		const kind = Math.floor(Math.random() * 4)
		const until = now + MISHAP_TICKS
		const toCentre = (x: number) =>
			screenToWorld(x) < (LEFT + RIGHT) / 2 ? 1 : -1
		if (kind === 0)
			addJet({
				kind: 'fountain',
				x: screenToWorld(TOILET_BOWL.x),
				y: TOILET_BOWL.y,
				vx: -(0.8 + Math.random() * 1.4),
				vy: -(9 + Math.random() * 2),
				from: now,
				until,
				strength,
				says: 0,
			})
		else if (kind === 1) {
			const tap = SINK_TAPS[Math.floor(Math.random() * SINK_TAPS.length)]
			const side = Math.random() < 0.5 ? -1 : 1
			addJet({
				kind: 'spray',
				x: screenToWorld(tap.x),
				y: tap.y,
				vx: side * (2.5 + Math.random() * 1.5),
				vy: -(4 + Math.random() * 2),
				from: now,
				until,
				strength,
				says: 1,
			})
		} else if (kind === 2)
			addJet({
				kind: 'squirt',
				x: screenToWorld(URINAL_PIPE.x),
				y: URINAL_PIPE.y,
				vx: toCentre(URINAL_PIPE.x) * (2 + Math.random() * 1.5),
				vy: -(3 + Math.random() * 2),
				from: now,
				until,
				strength,
				says: 2,
			})
		else {
			const between = SPOUTS_X.map(screenToWorld)
			const i = Math.floor(Math.random() * (between.length - 1))
			addJet({
				kind: 'gush',
				x: Math.round((between[i] + between[i + 1]) / 2),
				y: SPOUT_Y - 10,
				vx: 0,
				vy: 0,
				from: now,
				until,
				strength,
				says: 3,
			})
		}
		play('splash')
	}
	/** Near the end: the cistern goes, the toilet a great fountain, for a while. */
	function cistern(now: number) {
		addJet({
			kind: 'fountain',
			x: screenToWorld(TOILET_BOWL.x),
			y: TOILET_BOWL.y,
			vx: -1.6,
			vy: -11,
			from: now,
			until: now + CISTERN_TICKS,
			strength: 1.6,
			says: 4,
		})
	}

	// --- The flood --------------------------------------------------------------------
	/** How fast `racer` can go just now, wading the flood, if it's deep enough to slow them. */
	function wadeTopOf(racer: Racer) {
		const deep = depthIn(show, racer)
		if (deep < WADE_FROM) return undefined
		const share = Math.min(1, (deep - WADE_FROM) / (FLOOD_MOST - WADE_FROM))
		return RUN_TOP_SPEED - (RUN_TOP_SPEED - WADE_TOP) * share
	}
	/** How much a jet coming down into the flood raises it: the big ones more, drips less. */
	const floods = (jet: Jet) =>
		FLOOD_PER_JET *
		jet.strength *
		(jet.kind === 'fountain' || jet.kind === 'gush'
			? FLOOD_BIG_JET
			: jet.kind === 'drip' || jet.kind === 'seep'
				? 0.4
				: 1)

	/** `a` and `b` in each other's way: pushed apart a little, their jugs sloshed, and slowed going into each other. */
	function shove(a: Racer, b: Racer) {
		const ba = a.body
		const bb = b.body
		if (Math.abs(ba.feetY - bb.feetY) > SHOVE_HIGH) return
		const dx = bb.x - ba.x
		const apart = Math.abs(dx)
		if (apart >= SHOVE_NEAR) return
		const way = dx > 0 ? 1 : dx < 0 ? -1 : a.id < b.id ? 1 : -1
		const push = (SHOVE_NEAR - apart) * SHOVE
		ba.x -= way * push
		bb.x += way * push
		if (ba.vx * way > 0) ba.vx *= SHOVE_DRAG
		if (bb.vx * way < 0) bb.vx *= SHOVE_DRAG
		jugOf(a).spin += way * push * SLOSH_PUSH * SHOVE_SLOSH
		jugOf(b).spin -= way * push * SLOSH_PUSH * SHOVE_SLOSH
	}

	// --- The jugs ----------------------------------------------------------------
	/** A tick of `racer`'s jug: sloshed by how they've moved, spilt over its rim, and filled by what it's caught. */
	function slosh(racer: Racer) {
		const b = racer.body
		const jug = jugOf(racer)
		const before = was.get(racer.id) as {
			vx: number
			vy: number
			grounded: boolean
			stomped: number
		}
		// Wading, slower: it sloshes nearly as much, for how fast they can go.
		const top = wadeTopOf(racer)
		const pace = Math.sqrt(RUN_TOP_SPEED / (top ?? RUN_TOP_SPEED))
		const a = (b.vx - before.vx) * pace
		jug.spin += -SLOSH_K * jug.tilt - SLOSH_DAMP * jug.spin - a * SLOSH_PUSH
		const going = Math.abs(b.vx) * pace
		if (b.grounded && going > 2)
			jug.spin += (Math.random() - 0.5) * JIGGLE * going
		// Wading: every step through it rocks it.
		if (top !== undefined && going > 1)
			jug.spin += (Math.random() - 0.5) * WADE_ROCK * (going / RUN_TOP_SPEED)
		const side = Math.random() < 0.5 ? -1 : 1
		if (before.grounded && !b.grounded) jug.spin += side * TAKE_OFF_JOLT
		if (!before.grounded && b.grounded) {
			const hard = Math.max(0, before.vy)
			jug.spin += side * Math.min(LAND_MOST, hard * LAND_JOLT)
			spill(jug, Math.max(0, jug.fill - SLOP_FROM) * hard * SLOP_RATE)
		}
		if (b.ducking && b.grounded)
			jug.spin += (DUCK_TIP * b.facing - jug.tilt) * DUCK_PULL
		// Bounced on: a lot of it knocked out, and said.
		if (b.stomped > before.stomped) {
			spill(jug, jug.fill * BOUNCED_SPILL)
			jug.spin += side * BOUNCED_SLOSH
			play('stumble')
			if (jug.fill > 0 && jug.filledAt === undefined) {
				jug.saidAt = t()
				world.popup('Sploosh!', b.x, headTop(racer) - JUG_TALL - 20)
			}
		}
		jug.tilt += jug.spin
		// Over the rim, out it goes.
		const reach = jug.fill > NECK_FROM ? NECK_REACH : TILT_REACH
		const high = jug.fill + Math.abs(jug.tilt) * reach
		if (high > 1) spill(jug, (high - 1) * SPILL_RATE)
		// A lot out at once: said, over them.
		const now = t()
		if (
			(jug.lately ?? 0) > SPLOSH_FROM &&
			now - (jug.saidAt ?? -SPLOSH_EVERY) >= SPLOSH_EVERY
		) {
			jug.saidAt = now
			world.popup(
				SPLOSHES[Math.floor(Math.random() * SPLOSHES.length)],
				b.x,
				headTop(racer) - JUG_TALL - 20,
			)
		}
		jug.lately = (jug.lately ?? 0) * SPLOSH_KEEP
		was.set(racer.id, {
			vx: b.vx,
			vy: b.vy,
			grounded: b.grounded,
			stomped: b.stomped,
		})
	}
	function spill(jug: Jug, amount: number) {
		if (jug.filledAt !== undefined) return
		const lost = Math.min(jug.fill, amount)
		jug.fill -= lost
		jug.spilt += lost
		jug.lately = (jug.lately ?? 0) + lost
	}

	/** Over: in the order they filled up, then fullest first. */
	function decide() {
		if (over()) return
		const order = [...racers].sort((a, b) => {
			const ja = jugOf(a)
			const jb = jugOf(b)
			if (ja.filledAt !== undefined || jb.filledAt !== undefined)
				return (
					(ja.filledAt ?? Number.POSITIVE_INFINITY) -
					(jb.filledAt ?? Number.POSITIVE_INFINITY)
				)
			return jb.fill - ja.fill
		})
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const first = order[0]
		const said = filled(first)
			? solo
				? 'Full!'
				: `${first.runner.name} filled it!`
			: solo
				? `${pct(first)}% full`
				: `${first.runner.name} wins!`
		world.popup(said, first.body.x, headTop(first) - JUG_TALL - 40)
		play('finished')
	}

	// --- The bots ------------------------------------------------------------------
	const skills = new Map<string, number>()
	const skillOf = (racer: Racer) => {
		let skill = skills.get(racer.id)
		if (skill === undefined) {
			skill = 0.35 + Math.random() * 0.6
			skills.set(racer.id, skill)
		}
		return skill
	}
	/** Where each bot's going, and till when it'll think again. */
	const plans = new Map<string, { to: number; until: number }>()

	/** The best place for `racer` to stand just now: under the jet that'll fill them most, near enough, not too crowded. */
	function bestSpot(racer: Racer) {
		const now = t()
		const me = mouthOf(racer)
		let best: { x: number; score: number } | undefined
		for (const jet of show.jets) {
			if (jet.until <= now + 30 || jet.from > now + WARN_TICKS) continue
			const reach = jetReaches(jet, me.y)
			if (reach === undefined) continue
			const x = jetAt(jet, reach, now).x
			if (x < ARENA_WALLS.left || x > ARENA_WALLS.right) continue
			const far = Math.abs(x - racer.body.x)
			const crowd = racers.filter(
				(o) => o !== racer && Math.abs(o.body.x - x) < 24,
			).length
			const score =
				(JET_RATE[jet.kind] * jet.strength * 1000) / (1 + far / 220) -
				crowd * 0.5 +
				Math.random() * 0.3
			if (!best || score > best.score) best = { x, score }
		}
		return best?.x
	}

	function bot(racer: Racer): Controls {
		if (over() || filled(racer)) return IDLE
		const b = racer.body
		const now = world.ticks()
		const skill = skillOf(racer)
		let plan = plans.get(racer.id)
		if (!plan || now >= plan.until) {
			const to = bestSpot(racer) ?? b.x
			plan = {
				to,
				until: now + 12 + Math.round((1 - skill) * 40 + Math.random() * 20),
			}
			plans.set(racer.id, plan)
		}
		const dx = plan.to - b.x
		const jug = jugOf(racer)
		// Fuller, the more careful: closer in, it taps along, not runs.
		const careful = 30 + jug.fill * 70 * skill
		const way = Math.sign(dx)
		if (Math.abs(dx) < 4) return IDLE
		const tapping = Math.abs(dx) < careful
		const go = tapping ? now % (skill > 0.6 ? 4 : 3) === 0 : true
		// Too fast, closing in: let it coast.
		if (tapping && Math.abs(b.vx) > 2.5 - jug.fill) return IDLE
		return { left: go && way < 0, right: go && way > 0, up: false, down: false }
	}

	const run: MinigameRun = {
		id: 'jughead',
		// Their name over their jug.
		tagRise: () => JUG_TALL - JUG_SINK + 2,
		ticksLeft: () => Math.max(0, JUG_TICKS - t()),
		chip: (racer) => (filled(racer) ? 'Full' : `${pct(racer)}%`),
		score: (racer) => (filled(racer) ? 2 : jugOf(racer).fill),
		note: (racer) => {
			const jug = jugOf(racer)
			if (jug.filledAt !== undefined)
				return `Filled in ${clock(jug.filledAt, 'down')}`
			return `${pct(racer)}% full`
		},
		timeNote: (racer) => {
			if (!over()) return undefined
			const jug = jugOf(racer)
			return jug.filledAt !== undefined
				? `Filled in ${clock(jug.filledAt, 'down')}`
				: `${pct(racer)}% full`
		},
		done: filled,
		out: () => false,
		announce: () => {
			if (over()) return undefined
			const now = t()
			const said = show.jets.find(
				(j) =>
					j.says !== undefined && now >= j.from && now - j.from < ANNOUNCED_FOR,
			)
			return said?.says === undefined ? undefined : MISHAPS[said.says]
		},
		bot,
		step() {
			if (world.phase() !== 'running') return
			const now = t()
			// In each other's way: pushed apart.
			if (!over())
				for (let i = 0; i < racers.length; i++)
					for (let j = i + 1; j < racers.length; j++)
						shove(racers[i], racers[j])
			// Nobody past the walls; the filled dance; wading, slowed.
			for (const racer of racers) {
				const b = racer.body
				if (b.x < LEFT) {
					b.x = LEFT
					b.vx = Math.max(0, b.vx)
				} else if (b.x > RIGHT) {
					b.x = RIGHT
					b.vx = Math.min(0, b.vx)
				}
				b.celebrating = filled(racer)
				b.wadeTop = wadeTopOf(racer)
			}
			if (!over()) {
				keepFlowing(now)
				if (now >= nextMishap) {
					mishap(now)
					const p = progress()
					nextMishap =
						now +
						Math.round(
							(MISHAP_EVERY_FIRST +
								(MISHAP_EVERY_LAST - MISHAP_EVERY_FIRST) * p) *
								(0.8 + Math.random() * 0.4),
						)
				}
				if (!cisternGone && now >= CISTERN_AT) {
					cisternGone = true
					cistern(now)
				}
			}
			stopped = [
				...stopped.filter((j) => j.until > now - SPOUT_REST),
				...show.jets.filter((j) => j.until <= now),
			]
			show.jets = show.jets.filter((j) => j.until > now)
			// Decided: the jugs left as they are.
			if (over()) return
			for (const racer of racers) slosh(racer)
			// Filling: each jet into whoever's jug it comes down in first, or
			// into the flood, rising.
			let rise = FLOOD_RISE
			for (const jet of show.jets) {
				if (!running(jet, now)) continue
				const { racer } = jetEnds(jet, racers, now, surfaceOf(show))
				if (!racer) {
					rise += floods(jet)
					continue
				}
				const jug = jugOf(racer)
				if (jug.filledAt !== undefined) continue
				jug.fill = Math.min(1, jug.fill + JET_RATE[jet.kind] * jet.strength)
				if (jug.fill >= 1 && !over()) {
					jug.filledAt = now
					play('cheer')
				}
			}
			show.flood = Math.min(FLOOD_MOST, show.flood + rise)
			if (racers.some(filled) || now >= JUG_TICKS) decide()
		},
		frame(): MinigameFrame {
			return {
				jugs: racers.map((r) => {
					const jug = jugOf(r)
					return [
						Math.round(jug.fill * 1000),
						Math.round(jug.tilt * 1000),
						jug.filledAt ?? -1,
					]
				}),
				jets: show.jets.map((j) => [
					j.id,
					JET_KINDS.indexOf(j.kind),
					Math.round(j.x),
					Math.round(j.y),
					Math.round(j.vx * 100),
					Math.round(j.vy * 100),
					j.from,
					j.until,
					Math.round(j.strength * 100),
					j.says ?? -1,
				]),
				flood: Math.round(show.flood * 100),
			}
		},
		apply(a, b, share) {
			racers.forEach((racer, i) => {
				const from = a.jugs?.[i]
				if (!from) return
				const to = b?.jugs?.[i] ?? from
				const jug = jugOf(racer)
				jug.fill = (from[0] + (to[0] - from[0]) * share) / 1000
				jug.tilt = (from[1] + (to[1] - from[1]) * share) / 1000
				jug.filledAt = from[2] < 0 ? undefined : from[2]
				racer.body.hat = undefined
			})
			show.jets = (a.jets ?? []).map(
				([id, kind, x, y, vx, vy, from, until, strength, says]) => ({
					id,
					kind: JET_KINDS[kind] ?? 'stream',
					x,
					y,
					vx: vx / 100,
					vy: vy / 100,
					from,
					until,
					strength: strength / 100,
					says: says < 0 ? undefined : says,
				}),
			)
			const flood = a.flood ?? 0
			show.flood = (flood + ((b?.flood ?? flood) - flood) * share) / 100
			for (const racer of racers) racer.body.celebrating = filled(racer)
		},
	}
	return run
}
