import {
	PLAY_PATH,
	PLAY_PATH_SHADE,
	PLAY_SAND,
	PLAY_SAND_SHADE,
	PLAY_SKY_BOTTOM,
	PLAY_SKY_TOP,
} from '../courses/kit/redLightScenery'
import { seeded } from '../courses/kit/seeded'
import { TICK_MS } from '../game/constants'
import type { Racer, World } from '../game/world'
import type { Controls } from '../input'
import { play } from '../sfx'
import { ARENA_LEFT, arenaCourse } from './arena'
import { clock } from './clock'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Red Light, Green Light: a big painted playground, a giant rag doll
 * standing at the far end with her back turned, singing. Everyone starts
 * at the left, and runs for the finish line painted across the floor
 * while she sings (green light). Then she turns round, quicker and
 * quicker (the warning), and glares (red light): anyone she sees moving,
 * running, still sliding on, or jumping, after a short grace, she spits a
 * ball at, out of her mouth, and it knocks them flat: out, lying where
 * they fell. She turns back, sings again, and on it goes, the greens
 * shorter and her turns quicker the longer it lasts, and occasionally a
 * fake-out: she starts to turn and doesn't. Over the line you're safe,
 * and dance. First across wins, then whoever got furthest, then whoever
 * lasted longest; or it's over when everyone's across or out, or after a
 * minute, when anyone not across is out.
 */

/** How long it goes on, at most: a minute. */
export const LIGHTS_TICKS = Math.round(60_000 / TICK_MS)

/** Across the screen, where everything is: the start and finish lines, the doll. */
export const START_LINE_X = ARENA_LEFT + 110
export const FINISH_X = ARENA_LEFT + 790
export const DOLL_X = ARENA_LEFT + 870
/** How far anyone can go, either way: back from the start line, and on past the finish, short of the doll. */
const WALLS = { left: ARENA_LEFT + 40, right: ARENA_LEFT + 802 }
/** Where everyone starts, all together, just behind the start line. */
const STARTS_AT = START_LINE_X - 12

/** How big everyone's drawn: small, far off down the field, the doll huge. */
const FAR = 0.5
/**
 * How fast anyone can run in it: a jog, not a sprint, and slower than that,
 * small and far off as they are. The track's short,
 * and flat out they'd be across in two seconds; and a jog's a speed they
 * can stop from, coasting, in the time she gives them.
 */
const JOG = 1.3
/** How fast is moving: slower than this, on the ground, is stood still. */
const MOVING = 0.45
/** How long a ball takes to fly from her mouth to whoever it's after. */
export const BALL_TICKS = 22
/** How long she keeps her mouth open after a shot, and the least time between two. */
export const FIRE_TICKS = 16
const FIRE_GAP = 9
/** How hard whoever's hit is knocked back, and up. */
const KNOCK_BACK = -2.5
const KNOCK_UP = -3

/** How far through it is, 0 to 1, by the ramp: all of it takes 15 seconds. */
const RAMP_TICKS = Math.round(15_000 / TICK_MS)
/** How long she sings, with her back turned, to begin with and at the quickest. */
const GREEN_FIRST = 52
const GREEN_LAST = 30
/** The very first green: a long one, to get going. */
const GREEN_START = 46
/** How long her turn round takes, the warning, to begin with and at the quickest. */
const TURN_FIRST = 58
const TURN_LAST = 26
/** How long she's glaring before she'll spot anyone, to begin with and at the least. */
const GRACE_FIRST = 12
const GRACE_LAST = 5
/** How long she watches for, at least and at most. */
const RED_LEAST = 50
const RED_MOST = 100
/** How long she takes to turn back round. */
const AWAY = 20
/** A fake-out: how long she's half turned, and how often, to begin with and at the most. */
const FAKE_TICKS = 18
const FAKE_FIRST = 0.15
const FAKE_LAST = 0.45

export type LightKind = 'green' | 'fake' | 'turn' | 'red' | 'away'
/** One stretch of her cycle: from `from` (the race's ticks) for `ticks`. */
export interface LightSegment {
	from: number
	kind: LightKind
	ticks: number
	/** Of watching, how long she's glaring before she spots anyone. */
	grace: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Her whole game, as a list of stretches: the same for everyone, worked out from a seed. */
function makeSchedule(seed: number) {
	const random = seeded(seed)
	const segments: LightSegment[] = []
	let t = 0
	const add = (kind: LightKind, ticks: number, grace = 0) => {
		const n = Math.max(1, Math.round(ticks))
		segments.push({ from: t, kind, ticks: n, grace })
		t += n
	}
	for (let cycle = 0; t < LIGHTS_TICKS + 600; cycle++) {
		const p = Math.min(1, t / RAMP_TICKS)
		const green =
			cycle === 0
				? GREEN_START
				: lerp(GREEN_FIRST, GREEN_LAST, p) * (0.75 + random() * 0.5)
		if (cycle >= 2 && random() < lerp(FAKE_FIRST, FAKE_LAST, p)) {
			const before = Math.max(20, green * (0.35 + random() * 0.3))
			add('green', before)
			add('fake', FAKE_TICKS)
			add('green', Math.max(24, green - before))
		} else add('green', green)
		add('turn', lerp(TURN_FIRST, TURN_LAST, p) * (0.92 + random() * 0.16))
		add(
			'red',
			RED_LEAST + random() * (RED_MOST - RED_LEAST),
			Math.round(lerp(GRACE_FIRST, GRACE_LAST, p)),
		)
		add('away', AWAY)
	}
	return segments
}

/** What she's doing at race tick `t`: which stretch, how far into it, and how long it lasts. */
export interface Light {
	kind: LightKind
	since: number
	ticks: number
	grace: number
	/** Which stretch, in all, for telling one from the next. */
	index: number
}

/** What's to be drawn of a game of it: where she is in her cycle, and her shots. */
export interface LightsShow {
	racers: Racer[]
	/** What she's doing at race tick `t`. */
	lightAt(t: number): Light
	/** Each ball, [who's it after (their place in `racers`), when it was fired (the race's ticks)]. */
	spots: [number, number][]
	/** When each racer crossed the line, by id. */
	crossedAt: Map<string, number>
}
const shows = new WeakMap<World, LightsShow>()

/** `world`'s game of Red Light, Green Light, for drawing, if it's one. */
export const lightsOf = (world: World) => shows.get(world)

export const redLightGreenLight: Minigame = {
	id: 'red-light-green-light',
	name: 'Red Light, Green Light',
	tagline: 'Freeze when she turns',
	blurb:
		'Run for the line while the doll sings, and freeze the moment she turns round! If she sees you move, you get a ball in the face. First across wins!',
	tune: 'haga',
	collectables: [],
	course: arenaCourse(
		'red-light-green-light',
		'Red Light, Green Light',
		'Run while she sings. Freeze when she turns!',
		// A big painted playground, sand underfoot (see `redLightScenery`).
		{
			palette: {
				'--sky-blue-top': PLAY_SKY_TOP,
				'--sky-blue-bottom': PLAY_SKY_BOTTOM,
				'--grass-green': PLAY_SAND,
				'--grass-dark-green': PLAY_SAND_SHADE,
				'--grass-darker-green': PLAY_SAND_SHADE,
				'--dirt-brown': PLAY_PATH,
				'--dirt-dark-brown': PLAY_PATH_SHADE,
				'--dirt-darker-brown': PLAY_PATH_SHADE,
			},
			far: [],
			near: [],
			horizonTrees: false,
		},
	),
	start: startRedLight,
}

function startRedLight(world: World): MinigameRun {
	const { racers } = world
	const walls = WALLS
	const seed =
		racers
			.map((r) => r.id)
			.join('')
			.split('')
			.reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 99991, 17) + 1
	const schedule = makeSchedule(seed)
	let cursor = 0
	const lightAt = (t: number): Light => {
		const now = Math.max(0, t)
		if (cursor >= schedule.length || schedule[cursor].from > now) cursor = 0
		while (cursor < schedule.length - 1 && schedule[cursor + 1].from <= now)
			cursor++
		const s = schedule[cursor]
		return {
			kind: s.kind,
			since: now - s.from,
			ticks: s.ticks,
			grace: s.grace,
			index: cursor,
		}
	}
	const show: LightsShow = {
		racers,
		lightAt,
		spots: [],
		crossedAt: new Map(),
	}
	shows.set(world, show)

	// Everyone together just behind the start line, facing the doll:
	// small, far off down the field from her.
	for (const racer of racers) {
		const b = racer.body
		b.scale = FAR
		b.trippedAt = undefined
		b.tilt = undefined
		b.x = STARTS_AT
		b.feetY = world.terrain.groundY(b.x)
		b.floor = b.feetY
		b.grounded = true
		b.facing = 1
	}

	const solo = racers.length === 1
	const ticksLeft = () => Math.max(0, LIGHTS_TICKS - world.raceTicks())
	const crossed = (racer: Racer) => show.crossedAt.has(racer.id)
	/** Knocked down by a ball, and when, by id. */
	const outAt = new Map<string, number>()
	/** Out of time: not across when it ended. */
	const timedOut = new Set<string>()
	const spotted = (racer: Racer) =>
		outAt.has(racer.id) || racer.body.trippedAt !== undefined
	const out = (racer: Racer) =>
		spotted(racer) || timedOut.has(racer.id) || !!racer.out
	/** Who's got a ball on the way, or has had. */
	const targeted = new Set<string>()
	/** Whose ball's been dealt with. */
	const landed = new Set<number>()
	let lastFire = Number.NEGATIVE_INFINITY

	/**
	 * How far along someone's got, start line to finish line, as a share:
	 * none till they're over the start line, never quite the whole of it
	 * till they're over the finish.
	 */
	const progressOf = (racer: Racer) =>
		crossed(racer)
			? 1
			: Math.max(
					0,
					Math.min(
						0.99,
						(racer.body.x - START_LINE_X) / (FINISH_X - START_LINE_X),
					),
				)
	const percent = (racer: Racer) => `${Math.floor(progressOf(racer) * 100)}%`
	const took = (racer: Racer) =>
		clock(show.crossedAt.get(racer.id) ?? world.raceTicks(), 'down')

	/** Someone's moving, if they're not stood still on the ground. */
	const moving = (racer: Racer) =>
		!racer.body.grounded || Math.abs(racer.body.vx) > MOVING

	/** Lying where they fell, on their back, as a pose. */
	function lie(racer: Racer) {
		const b = racer.body
		const at = b.trippedAt
		if (at === undefined) return
		const age = Math.max(0, world.raceTicks() - at)
		b.ducking = true
		b.held = 2
		const fall = Math.min(1, age / 9)
		b.tilt = -80 * fall * (b.facing === 1 ? 1 : -1)
	}

	function knock(racer: Racer) {
		const b = racer.body
		b.trippedAt = world.raceTicks()
		outAt.set(racer.id, b.trippedAt)
		b.vx = KNOCK_BACK
		b.vy = KNOCK_UP
		b.grounded = false
		world.popup(
			solo ? `Spotted at ${clock(b.trippedAt, 'down')}` : 'Spotted!',
			b.x,
			b.feetY - 100,
		)
		play('stomp')
	}

	function fire(racer: Racer, now: number) {
		show.spots.push([racers.indexOf(racer), now])
		targeted.add(racer.id)
		lastFire = now
		play('pop')
	}

	function decide() {
		if (world.order()) return
		const waiting = racers.filter((r) => !crossed(r) && !out(r))
		const over = ticksLeft() <= 0 || waiting.length === 0
		if (!over) return
		const timeUp = waiting.length > 0
		// First across first, then those still going by how far, then the
		// out, the later out the better.
		const rank = (r: Racer) => (crossed(r) ? 0 : out(r) ? 2 : 1)
		const order = [...racers].sort((a, b) => {
			const ra = rank(a)
			const rb = rank(b)
			if (ra !== rb) return ra - rb
			if (ra === 0)
				return (show.crossedAt.get(a.id) ?? 0) - (show.crossedAt.get(b.id) ?? 0)
			if (ra === 1) return b.body.x - a.body.x
			return (outAt.get(b.id) ?? 0) - (outAt.get(a.id) ?? 0)
		})
		world.setOrder(order)
		world.decidedAt = world.ticks()
		for (const r of waiting) timedOut.add(r.id)
		const winner = order[0]
		world.popup(
			solo
				? crossed(winner)
					? `Crossed in ${took(winner)}!`
					: timeUp
						? "Time's up!"
						: 'Spotted!'
				: crossed(winner)
					? `${winner.runner.name} wins!`
					: 'Nobody made it!',
			winner.body.x,
			winner.body.feetY - 120,
		)
		play('finished')
	}

	const done = (racer: Racer) => crossed(racer)

	// A bot: runs when she's singing, lets go when she starts to turn, a
	// little late, by a different amount each time. The more skilled brake
	// with a tap the other way; the hopeless are slow on every turn, and so
	// get caught. And occasionally it's taken in by a fake-out.
	const bots = new Map<
		string,
		{
			skill: number
			index: number
			react: number
			fooled: boolean
			stopping: boolean
			changedAt: number
		}
	>()
	const botOf = (racer: Racer) => {
		let bot = bots.get(racer.id)
		if (!bot) {
			bot = {
				skill: Math.random(),
				index: -1,
				react: 0,
				fooled: true,
				stopping: false,
				changedAt: 0,
			}
			bots.set(racer.id, bot)
		}
		return bot
	}

	return {
		id: 'red-light-green-light',
		ticksLeft,
		chip: (racer) =>
			crossed(racer) ? 'Safe' : out(racer) ? 'Out' : percent(racer),
		// Across, the first first; then those still going, furthest first;
		// then those out, furthest first.
		score: (racer) =>
			crossed(racer)
				? 3 - (show.crossedAt.get(racer.id) ?? 0) / 1e6
				: (out(racer) ? 0 : 1) + progressOf(racer),
		note: (racer) => {
			if (crossed(racer))
				return `${solo ? 'Crossed in' : 'Across at'} ${took(racer)}`
			if (spotted(racer))
				return `Spotted at ${clock(racer.body.trippedAt ?? 0, 'down')} · ${percent(racer)}`
			if (timedOut.has(racer.id)) return `Out of time · ${percent(racer)}`
			return `${percent(racer)} of the way`
		},
		timeNote: (racer) => {
			if (crossed(racer)) return `Crossed in ${took(racer)}`
			if (spotted(racer))
				return `Spotted after ${clock(racer.body.trippedAt ?? 0, 'down')} · ${percent(racer)} of the way`
			return `Out of time · ${percent(racer)} of the way`
		},
		done,
		out,
		announce: () => {
			if (world.phase() !== 'running' || world.order()) return undefined
			const light = lightAt(world.raceTicks())
			if (light.kind === 'green' && light.since < 50) return 'Green light!'
			if (
				(light.kind === 'turn' && light.since < 40) ||
				(light.kind === 'red' && light.since < 30)
			)
				return 'Red light!'
			return undefined
		},
		bot: (racer): Controls => {
			if (out(racer) || crossed(racer)) return IDLE
			const bot = botOf(racer)
			const b = racer.body
			const now = world.raceTicks()
			const light = lightAt(now)
			// A fake-out takes in some bots, the hopeless more.
			if (light.kind === 'fake' && bot.index !== light.index)
				bot.fooled = Math.random() < 0.15 + (1 - bot.skill) * 0.6
			bot.index = light.index
			const stop =
				light.kind === 'turn' ||
				light.kind === 'red' ||
				(light.kind === 'fake' && bot.fooled)
			// Every time it's to change what it's doing, a new moment's
			// notice of it: the hopeless are slow, every time.
			if (stop !== bot.stopping) {
				bot.stopping = stop
				bot.changedAt = now
				// Occasionally it's not paying attention at all, the more so the
				// worse it is.
				const lapse = Math.random() < (1 - bot.skill) * 0.3 ? 40 : 0
				bot.react = stop
					? 2 + Math.random() * (1 - bot.skill) * 40 + Math.random() * 4 + lapse
					: 4 + Math.random() * 20
			}
			if (stop) {
				// Still running, till it notices.
				if (now - bot.changedAt < bot.react) return { ...IDLE, right: true }
				// A tap the other way, to stop short, if it's any good.
				if (bot.skill > 0.45 && b.vx > MOVING * 0.8 && b.grounded)
					return { ...IDLE, left: true }
				return IDLE
			}
			// Singing, or turning back: off again, a moment after.
			return now - bot.changedAt >= bot.react ? { ...IDLE, right: true } : IDLE
		},
		step() {
			if (world.phase() !== 'running') return
			const now = world.raceTicks()
			const light = lightAt(now)
			// Anyone moving while she's watching, once she's had time to look.
			if (
				!world.order() &&
				light.kind === 'red' &&
				light.since >= light.grace &&
				now - lastFire >= FIRE_GAP
			)
				for (const racer of racers) {
					if (crossed(racer) || out(racer) || targeted.has(racer.id)) continue
					if (!moving(racer)) continue
					fire(racer, now)
					break
				}
			// Any ball that's landed.
			for (const [i, at] of show.spots) {
				if (now - at < BALL_TICKS || landed.has(at * 16 + i)) continue
				landed.add(at * 16 + i)
				const racer = racers[i]
				if (racer && !crossed(racer) && !spotted(racer)) knock(racer)
			}
			for (const racer of racers) {
				const b = racer.body
				// Clamped between the walls.
				if (b.x < walls.left) {
					b.x = walls.left
					b.vx = Math.max(0, b.vx)
				} else if (b.x > walls.right) {
					b.x = walls.right
					b.vx = Math.min(0, b.vx)
				}
				// A jog, not a sprint.
				if (!spotted(racer)) b.vx = Math.max(-JOG, Math.min(JOG, b.vx))
				if (!crossed(racer) && !spotted(racer) && b.x >= FINISH_X) {
					show.crossedAt.set(racer.id, now)
					world.popup(
						solo ? `Crossed in ${clock(now, 'down')}` : 'Safe!',
						b.x,
						b.feetY - 100,
					)
					play('cheer')
				}
				// Over the line, they stop, and dance.
				if (crossed(racer)) {
					b.held = 2
					b.vx *= 0.9
				}
				lie(racer)
				b.celebrating = done(racer)
			}
			decide()
		},
		frame(): MinigameFrame {
			return {
				spots: show.spots.map(([i, at]) => [i, at]),
				doneAt: racers.map((r) => show.crossedAt.get(r.id) ?? -1),
				tripped: racers.map((r) => r.body.trippedAt ?? -1),
			}
		},
		apply(a) {
			show.spots.length = 0
			for (const spot of a.spots ?? []) show.spots.push([spot[0], spot[1]])
			racers.forEach((racer, i) => {
				const crossedAt = a.doneAt?.[i] ?? -1
				if (crossedAt < 0) show.crossedAt.delete(racer.id)
				else show.crossedAt.set(racer.id, crossedAt)
				const fell = a.tripped?.[i] ?? -1
				racer.body.trippedAt = fell < 0 ? undefined : fell
				if (fell < 0) outAt.delete(racer.id)
				else outAt.set(racer.id, fell)
				// Time ran out on anyone neither across nor knocked down.
				if (world.order() && crossedAt < 0 && fell < 0) timedOut.add(racer.id)
				lie(racer)
				racer.body.celebrating = done(racer)
			})
		},
	}
}
