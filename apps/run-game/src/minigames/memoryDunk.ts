import { START_X, VIEW_WIDTH } from '../game/constants'
import type { Terrain } from '../game/terrain'
import type { Racer, World } from '../game/world'
import { play } from '../sfx'
import { ARENA_LEFT, ARENA_WALLS, arenaCourse, inRandomOrder } from './arena'
import { poseInWater, treadWater, waterBot } from './treadWater'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Memory Dunk: four platforms in a row over the sea, red, blue, yellow
 * and green, each with its shape painted on it (a square, a circle, a
 * triangle, a diamond), so it's no use being colour blind. A board shows a
 * sequence of shapes, one at a time. Then, for each shape in turn, you have
 * a few seconds to be on its platform: every other platform's trapdoors
 * swing open, and whoever's on one drops into the sea, out. Then they
 * close, and it's on to the next shape, quickly. Get through them all, and
 * there's a new sequence, one shape longer, and the time for each shape
 * shorter. The last one still dry wins.
 *
 * Everything on the clock is a fixed timeline from "Go!" (see `momentAt`),
 * and the sequence is worked out from a seed, so Remote Players' screens
 * need only the seed and who's in the sea.
 */

/** The platforms: how wide, how far apart, and how many; the floor everyone stands on, and the sea's surface. */
export const PLATFORM_COUNT = 4
export const PLATFORM_WIDTH = 128
export const PLATFORM_GAP = 100
export const FLOOR = 330
export const WATERLINE = 400
/** Where the first platform's left edge is, along the world: they fill the screen between the walls. */
const FIRST_LEFT =
	ARENA_LEFT +
	(960 -
		(PLATFORM_COUNT * PLATFORM_WIDTH + (PLATFORM_COUNT - 1) * PLATFORM_GAP)) /
		2
export const platformLeft = (i: number) =>
	FIRST_LEFT + i * (PLATFORM_WIDTH + PLATFORM_GAP)
export const platformMiddle = (i: number) =>
	platformLeft(i) + PLATFORM_WIDTH / 2
/** Which platform is `x` over, or -1 for open water between them. */
export const platformAtX = (x: number) => {
	const i = Math.floor((x - FIRST_LEFT) / (PLATFORM_WIDTH + PLATFORM_GAP))
	if (i < 0 || i >= PLATFORM_COUNT) return -1
	return x - platformLeft(i) <= PLATFORM_WIDTH ? i : -1
}
/** In the sea, how near the screen's edges they can swim. */
const SWIM_IN = 24

// --- The timeline, in ticks from "Go!" ------------------------------------
/** Before the first sequence. */
const READY = 70
/** Round `r` (from 1) has `r + 2` shapes; the most rounds before it's called a draw. */
export const MAX_ROUND = 30
/** How long the doors are open, swinging open and shut at either end, shut physically for the first and last few ticks. */
export const OPEN = 40
const SWING = 8
const OPEN_FROM = 6
const OPEN_TO = OPEN - 6
/** How long, at the end of a shape's time, the doors rattle, a warning. */
export const WARNING = 24
/** "Watch!" before a sequence, then each shape shown for `on` and blank for `off`, and the pause after the last one. */
const LEAD = 36
const OFF = 14
/** After the last shape's doors: "Clear!" */
const CLEAR = 40

export const shapesIn = (round: number) => round + 2
const shownFor = (round: number) => Math.max(22, 42 - 3 * round)
/** How long there is to get to a shape's platform, in round `round`: shorter and shorter, to a floor nobody can cross the whole way in. */
export const windowFor = (round: number) => Math.max(80, 200 - 16 * (round - 1))

interface RoundSpec {
	n: number
	on: number
	watch: number
	window: number
	total: number
}
const specOf = (round: number): RoundSpec => {
	const n = shapesIn(round)
	const on = shownFor(round)
	const window = windowFor(round)
	const watch = LEAD + n * (on + OFF)
	return { n, on, watch, window, total: watch + n * (window + OPEN) + CLEAR }
}
const starts: number[] = [0, READY]
const startOf = (round: number) => {
	while (starts.length <= round)
		starts.push(starts[starts.length - 1] + specOf(starts.length - 1).total)
	return starts[round]
}

export type Phase = 'ready' | 'watch' | 'move' | 'open' | 'clear'

/** Where the game is at a tick: which round, which shape, which part of it, and how far in. */
export interface Moment {
	round: number
	n: number
	phase: Phase
	/** Which shape of the sequence it's on, from 0. */
	step: number
	/** Ticks into the phase, and how long the phase is. */
	t: number
	length: number
	/** In `watch`: which shape is up on the board, or -1 between them. */
	shown: number
	/** In `watch`: how many shapes have been shown, up to and including the one up. */
	seen: number
}

/** Where the game is `tick` ticks after "Go!". */
export function momentAt(tick: number): Moment {
	if (tick < READY)
		return {
			round: 1,
			n: shapesIn(1),
			phase: 'ready',
			step: 0,
			t: tick,
			length: READY,
			shown: -1,
			seen: 0,
		}
	let round = 1
	while (round <= MAX_ROUND && tick >= startOf(round + 1)) round++
	const spec = specOf(round)
	const t = tick - startOf(round)
	const base = { round, n: spec.n, shown: -1, seen: 0 }
	if (t < spec.watch) {
		const into = t - LEAD
		const step = Math.max(0, Math.floor(into / (spec.on + OFF)))
		const inStep = into - step * (spec.on + OFF)
		return {
			...base,
			phase: 'watch',
			step,
			t,
			length: spec.watch,
			shown: into >= 0 && inStep < spec.on ? step : -1,
			seen: into < 0 ? 0 : step + 1,
		}
	}
	const steps = t - spec.watch
	const each = spec.window + OPEN
	if (steps < spec.n * each) {
		const step = Math.floor(steps / each)
		const inStep = steps - step * each
		return inStep < spec.window
			? { ...base, phase: 'move', step, t: inStep, length: spec.window }
			: {
					...base,
					phase: 'open',
					step,
					t: inStep - spec.window,
					length: OPEN,
				}
	}
	return {
		...base,
		phase: 'clear',
		step: spec.n - 1,
		t: steps - spec.n * each,
		length: CLEAR,
	}
}

// --- The sequence, from a seed ----------------------------------------------
const mulberry = (seed: number) => {
	let a = seed >>> 0
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = a
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}
const sequences = new Map<string, number[]>()
/**
 * Round `round`'s shapes, as platform numbers, for `seed`: a new sequence
 * every round, not the last one with one more on the end; every shape a
 * different platform from the one before, so there's always somewhere to
 * run to.
 */
export function sequenceOf(seed: number, round: number) {
	const key = `${seed}:${round}`
	let seq = sequences.get(key)
	if (!seq) {
		const next = mulberry((seed + Math.imul(round, 0x9e3779b1)) >>> 0)
		seq = [Math.floor(next() * PLATFORM_COUNT)]
		for (let i = 1; i < shapesIn(round); i++)
			seq.push(
				(seq[i - 1] + 1 + Math.floor(next() * (PLATFORM_COUNT - 1))) %
					PLATFORM_COUNT,
			)
		sequences.set(key, seq)
	}
	return seq
}

/**
 * How far open platform `p`'s doors are at `moment`, 0 shut to 1 hanging
 * open: every platform but the shape's, while the doors are open.
 */
export function swingOf(moment: Moment, p: number, seq: number[]) {
	if (moment.phase !== 'open' || seq[moment.step] === p) return 0
	if (moment.t < SWING) return moment.t / SWING
	if (moment.t >= OPEN - SWING) return (OPEN - moment.t) / SWING
	return 1
}
/** Whether platform `p` has no floor to it at `moment`: the doors open far enough to fall through. */
const droppedAt = (moment: Moment, p: number, seq: number[]) =>
	moment.phase === 'open' &&
	seq[moment.step] !== p &&
	moment.t >= OPEN_FROM &&
	moment.t < OPEN_TO

// --- Drawing's state ----------------------------------------------------------
/** Where water's been splashed up, and when, by the world's ticks. */
export interface Splash {
	x: number
	at: number
}
export const SPLASH_TICKS = 40

/** What's to be drawn of a game of Memory Dunk. */
export interface DunkShow {
	seed: number
	/** Once it's decided: the tick, from "Go!", the timeline's stopped at, when the doors are shut again. */
	frozen?: number
	splashes: Splash[]
	/** When each went in the sea (by the race's ticks), and where in the sequence (see `fellCode`). */
	fell: Map<string, { at: number; round: number; step: number }>
}
const shows = new WeakMap<World, DunkShow>()
/** `world`'s game of Memory Dunk, if it's one. */
export const dunkShowOf = (world: World) => shows.get(world)

/** Where the timeline is now: the race's ticks, or where it was stopped. */
export const timelineOf = (world: World, show: DunkShow) =>
	Math.min(world.raceTicks(), show.frozen ?? Number.POSITIVE_INFINITY)

/** Which platforms have no floor right now: shared, one game at a time on a screen. */
const dropped = [false, false, false, false]

const terrain: Terrain = {
	length: 3000,
	finishX: START_X + 3000,
	groundY: () => FLOOR,
	slope: () => 0,
	gaps: [],
	// A floor on a platform whose doors are shut; the open sea, anywhere else.
	inGap: (x) => {
		const p = platformAtX(x)
		return p < 0 || dropped[p]
	},
	walls: [],
}

export const memoryDunk: Minigame = {
	id: 'memory-dunk',
	name: 'Memory Dunk',
	blurb:
		'Remember the shapes! Be on the right platform when the trapdoors open, or it’s a dunk in the sea. Every round’s one shape longer.',
	tune: 'haga',
	// Its board's up top, and who's in the sea says who's out.
	pills: false,
	collectables: [],
	course: {
		...arenaCourse(
			'memory-dunk',
			'Memory Dunk',
			'Be on the right platform, or drop into the sea. Last one dry wins!',
			// Seaside: the sky, and the sea all the way down; the rest is drawn.
			{
				palette: {
					'--sky-blue-top': '#6fc0ec',
					'--sky-blue-bottom': '#d3ecf6',
					'--grass-green': '#2f89b0',
				},
				far: [],
				near: [],
				horizonTrees: false,
				ground: [],
			},
		),
		terrain,
	},
	start: startMemoryDunk,
}

/** How a fall's kept, for Remote Players: its round and shape (0 while watching), or -1. */
const fellCode = (fell?: { round: number; step: number }) =>
	fell ? fell.round * 1000 + fell.step + 1 : -1

function startMemoryDunk(world: World): MinigameRun {
	const { racers } = world
	const solo = racers.length === 1
	const show: DunkShow = {
		seed: Math.floor(Math.random() * 2 ** 31),
		splashes: [],
		fell: new Map(),
	}
	shows.set(world, show)
	dropped.fill(false)
	const seq = () => sequenceOf(show.seed, moment().round)
	const moment = () => momentAt(timelineOf(world, show))

	// Spread over the platforms, in no particular order, facing in.
	const mid = platformMiddle(1) / 2 + platformMiddle(2) / 2
	const on: Racer[][] = [[], [], [], []]
	inRandomOrder(racers).forEach((racer, i) =>
		on[i % PLATFORM_COUNT].push(racer),
	)
	on.forEach((group, p) => {
		group.forEach((racer, k) => {
			const b = racer.body
			b.x = Math.round(platformMiddle(p) + (k - (group.length - 1) / 2) * 44)
			b.feetY = FLOOR
			b.floor = FLOOR
			b.facing = b.x < mid ? 1 : -1
		})
	})

	const inSea = (racer: Racer) => show.fell.has(racer.id) || !!racer.out
	const dry = () => racers.filter((r) => !inSea(r))
	const fellOf = (racer: Racer) => show.fell.get(racer.id)
	const done = (racer: Racer) => !!world.order() && !inSea(racer)

	/** The doors, as the floor: open where the timeline says. */
	function setDoors() {
		const m = moment()
		const s = seq()
		for (let p = 0; p < PLATFORM_COUNT; p++) dropped[p] = droppedAt(m, p, s)
	}

	let opened = ''
	function decide() {
		if (world.order()) return
		const left = dry().length
		const m = moment()
		const over =
			left === 0 || (racers.length > 1 && left <= 1) || m.round >= MAX_ROUND
		if (!over) return
		// Whoever fell last came furthest; the dry first of all.
		const order = [...racers].sort(
			(a, b) =>
				(fellOf(b)?.at ?? Number.POSITIVE_INFINITY) -
				(fellOf(a)?.at ?? Number.POSITIVE_INFINITY),
		)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		// Stopped there, once any open doors have closed: nobody drops after.
		const now = world.raceTicks()
		show.frozen = m.phase === 'open' ? now - m.t + OPEN : now
		const winner = order[0]
		world.popup(
			solo
				? `Sequence of ${m.n}!`
				: left === 1
					? `${winner.runner.name} wins!`
					: 'Nobody’s dry!',
			winner.body.x,
			winner.body.feetY - 120,
		)
		play('finished')
	}

	/** In the sea: treading water where they went in, swimming about, hopping up out of it. */
	function swim(racer: Racer, m: Moment) {
		const b = racer.body
		if (!show.fell.has(racer.id)) {
			const watching = m.phase === 'watch' || m.phase === 'ready'
			show.fell.set(racer.id, {
				at: world.raceTicks(),
				round: m.round,
				step: watching ? -1 : m.step,
			})
			world.popup(solo ? `Sequence of ${m.n}` : 'Splash!', b.x, WATERLINE - 70)
			show.splashes.push({ x: b.x, at: world.ticks() })
			play('splash')
		}
		// Treading water, swimming about, hopping up out of it.
		treadWater(world, racer, {
			waterline: WATERLINE,
			left: ARENA_LEFT + SWIM_IN,
			right: ARENA_LEFT + VIEW_WIDTH - SWIM_IN,
			splash: (x) => show.splashes.push({ x, at: world.ticks() }),
			// Not under a platform: there's no room, it's that low over the water.
			canHop: (x) => platformAtX(x) < 0,
		})
	}

	// --- The bot --------------------------------------------------------------
	const skills = new Map<string, number>()
	const skillOf = (racer: Racer) => {
		let skill = skills.get(racer.id)
		if (skill === undefined) {
			skill = Math.random()
			skills.set(racer.id, skill)
		}
		return skill
	}
	/** What each bot remembers of this round's sequence: a guess, where it's forgotten one. */
	const memories = new Map<string, { round: number; guess: number[] }>()
	/** How long each bot dithers at the start of a shape's time, and till when it's holding jump. */
	const delays = new Map<string, { key: string; delay: number }>()
	const jumps = new Map<string, number>()

	/**
	 * How likely a bot is to forget one shape of a sequence of `n`: a little
	 * always, a lot more with a long sequence, and more for the worse ones.
	 */
	const forgets = (skill: number, n: number) =>
		Math.min(0.75, 0.01 + (1 - skill) * 0.05 * (n - 2) + 0.004 * n * n * 0.1)

	function bot(racer: Racer) {
		if (inSea(racer)) return waterBot(world, racer)
		const m = moment()
		if (m.phase !== 'move') return IDLE
		const skill = skillOf(racer)
		let memory = memories.get(racer.id)
		if (!memory || memory.round !== m.round) {
			memory = {
				round: m.round,
				guess: seq()
					.slice(0, m.n)
					.map((p) =>
						Math.random() < forgets(skill, m.n)
							? Math.floor(Math.random() * PLATFORM_COUNT)
							: p,
					),
			}
			memories.set(racer.id, memory)
		}
		const key = `${m.round}:${m.step}`
		let wait = delays.get(racer.id)
		if (wait?.key !== key) {
			wait = { key, delay: 6 + Math.random() * (10 + (1 - skill) * 50) }
			delays.set(racer.id, wait)
		}
		if (m.t < wait.delay) return IDLE
		const b = racer.body
		const target = memory.guess[m.step]
		const dx = platformMiddle(target) - b.x
		const heading = Math.sign(dx)
		const now = world.ticks()
		// Going into the air off an edge, towards a platform: a jump, held a few ticks.
		const edgeAhead =
			b.grounded &&
			Math.abs(b.vx) > 1.5 &&
			Math.sign(b.vx) === heading &&
			platformAtX(b.x + heading * 22) < 0
		if (edgeAhead && now >= (jumps.get(racer.id) ?? 0))
			jumps.set(racer.id, now + 7 + Math.floor(Math.random() * 3))
		const jumping = now < (jumps.get(racer.id) ?? 0)
		// Steering: braked in time for its platform's middle, else heading for it.
		let go: number
		if (Math.abs(dx) < 12 && Math.abs(b.vx) < 1.5) go = 0
		else if (Math.sign(b.vx) === heading && Math.abs(b.vx) * 12 > Math.abs(dx))
			go = -heading
		else go = heading
		return {
			left: go < 0,
			right: go > 0,
			up: jumping,
			down: false,
		}
	}

	return {
		id: 'memory-dunk',
		ticksLeft: () => {
			const m = moment()
			return m.phase === 'move' || m.phase === 'watch' || m.phase === 'ready'
				? Math.max(0, m.length - m.t)
				: 0
		},
		chip: (racer) => (inSea(racer) ? 'Out' : 'Dry'),
		note: (racer) => {
			const fell = fellOf(racer)
			if (!fell)
				return world.order()
					? solo
						? `Survived ${shapesIn(momentAt(timelineOf(world, show)).round)} shapes`
						: 'Last one dry'
					: 'Still dry'
			if (solo) return `Reached a sequence of ${shapesIn(fell.round)}`
			return fell.step < 0
				? `Fell in round ${fell.round}`
				: `Fell on shape ${fell.step + 1} of ${shapesIn(fell.round)}`
		},
		done,
		out: inSea,
		bot,
		timeNote: (racer) => {
			const fell = fellOf(racer)
			if (fell) return `Reached a sequence of ${shapesIn(fell.round)}`
			return world.order()
				? `Survived ${shapesIn(momentAt(timelineOf(world, show)).round)} shapes`
				: undefined
		},
		step() {
			if (world.phase() !== 'running') return
			setDoors()
			const m = moment()
			const key = `${m.round}:${m.step}`
			if (m.phase === 'open' && m.t === 0 && key !== opened) {
				opened = key
				play('whoosh')
			}
			for (const racer of racers) {
				const b = racer.body
				const under = b.feetY > WATERLINE + 8 && !b.grounded
				if (racer.out || show.fell.has(racer.id) || under) {
					racer.out ??= 'fallen'
					swim(racer, m)
					continue
				}
				b.x = Math.max(ARENA_WALLS.left, Math.min(ARENA_WALLS.right, b.x))
				b.celebrating = done(racer)
			}
			const tick = world.ticks()
			show.splashes = show.splashes.filter((s) => tick - s.at < SPLASH_TICKS)
			decide()
		},
		frame(): MinigameFrame {
			return {
				dunkSeed: show.seed,
				dunkEnd: show.frozen ?? -1,
				inSea: racers.map((r) => show.fell.get(r.id)?.at ?? -1),
				dunkFell: racers.map((r) => fellCode(show.fell.get(r.id))),
				splashes: show.splashes.map((s) => [Math.round(s.x), s.at]),
			}
		},
		apply(a) {
			show.seed = a.dunkSeed ?? show.seed
			show.frozen =
				a.dunkEnd !== undefined && a.dunkEnd >= 0 ? a.dunkEnd : undefined
			show.splashes = (a.splashes ?? []).map(([x, at]) => ({ x, at }))
			racers.forEach((racer, i) => {
				const at = a.inSea?.[i] ?? -1
				const code = a.dunkFell?.[i] ?? -1
				if (at < 0) show.fell.delete(racer.id)
				else
					show.fell.set(racer.id, {
						at,
						round: Math.floor(code / 1000),
						step: (code % 1000) - 1,
					})
				racer.body.celebrating = done(racer)
				// In the sea: treading water, swimming about, or hopping.
				if (at >= 0) poseInWater(world, racer, WATERLINE)
			})
			setDoors()
		},
	}
}
