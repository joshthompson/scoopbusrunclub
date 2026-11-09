import type { RunnerName } from '@/data/runners'
import { type Accessor, createSignal } from 'solid-js'
import type { Controls } from '../input'
import type { Level, Obstacle } from '../levels/types'
import type { Avatar } from '../looks'
import type { Playable } from '../playable'
import {
	BUS_START_X,
	PACK_SIZE,
	START_LEAD,
	START_X,
	VIEW_WIDTH,
} from './constants'
import { lineUp } from './pack'
import type { Terrain } from './terrain'

/**
 * - `countdown`: the run director's "3, 2, 1", nobody moving yet
 * - `running`: "Go!", and the bus is coming
 * - `scooped`: the bus caught up
 * - `finished`: over the line ahead of it
 */
export type Phase = 'countdown' | 'running' | 'scooped' | 'finished'

/**
 * Out of the race: caught by the bus, or over the line. Someone still running
 * when a multiplayer Round's decided isn't out: they won it.
 */
export type Out = 'scooped' | 'finished'

/**
 * One runner in the race, steered by a person: the only one in single player,
 * or each of a Room's Players in a Round.
 */
export interface Racer {
	/** In a Round, the Player's seat. */
	id: string
	runner: Playable
	body: Body
	/** What they're holding, read once a tick. */
	controls: () => Controls
	/** Their colour and Player number in a Round, for telling them apart. */
	colour?: string
	number?: number
	/** Plain state, like the body: why they stopped, and the tick they did. */
	out?: Out
	outAt: number
}

/** Who's racing, as the game's given them. */
export type RacerEntry = Pick<
	Racer,
	'id' | 'runner' | 'controls' | 'colour' | 'number'
>

/** The runner, as the physics sees them: `x` is the middle of their feet. */
export interface Body {
	x: number
	feetY: number
	vx: number
	vy: number
	grounded: boolean
	ducking: boolean
	/** Ticks left of a stumble, during which they can't speed up. */
	stumble: number
	muddy: boolean
	/** Which way they last ran: 1 right, -1 left. */
	facing: 1 | -1
	/** Up was held last tick, so holding it doesn't keep jumping. */
	wasUp: boolean
	/** Degrees, while flying out of the scoop. */
	spin: number
	/** Heads bounced off since last on the ground, for doubling the points. */
	combo: number
	/** Ticks left riding a corgi. */
	mount: number
	/** Ticks left being carried by a flying goose. */
	carried: number
	/** Ticks before another Player can bounce on their head again. */
	stomped: number
}

/**
 * Someone else out running: anyone at all, or now and then a club member.
 * Like the runner's body, `x` is the middle of their feet.
 */
export interface Pacer {
	id: number
	name: string
	member?: RunnerName
	/** One of the club's guests, by their `Playable`'s id. */
	guest?: string
	/** Anyone else's look, made up for them. */
	look?: Avatar
	sprite: Playable['sprite']
	x: number
	feetY: number
	vx: number
	vy: number
	grounded: boolean
	/** How fast they go, left to it. */
	pace: number
	/** Ticks left of being dazed, after being bounced on. */
	dazed: number
	/** Flying out of the scoop, spinning `spin` degrees. */
	scooped: boolean
	spin: number
}

/**
 * - `hopping`: hopping about the path, at you if you're near
 * - `riding`: on your head
 * - `dazed`: bounced on, and can't be again for a moment
 * - `scooped`: flying out of the scoop
 */
export type FurbyState = 'hopping' | 'riding' | 'dazed' | 'scooped'

/** A furby on the course, in Furby Fields. `x` is the middle of its feet. */
export interface Furby {
	id: number
	asset: string
	/** Where it hops about. */
	home: number
	x: number
	feetY: number
	vx: number
	vy: number
	grounded: boolean
	facing: 1 | -1
	state: FurbyState
	/** Ticks left of resting before the next hop, riding, or being dazed. */
	timer: number
	/** Ticks since it last landed, for its squash. */
	landed: number
	/** Degrees, while flying out of the scoop. */
	spin: number
	/** Whose head it's on, while `riding`. */
	rider?: string
}

/**
 * - `waiting`: sat on the path, barking for you to hop on when you're near
 * - `ridden`: galloping along with you on its back
 * - `tired`: had enough, and sat down where you got off
 * - `scooped`: flying out of the scoop
 */
export type CorgiState = 'waiting' | 'ridden' | 'tired' | 'scooped'

/** A corgi, in Furby Fields, to ride. `x` is the middle of its feet. */
export interface Corgi {
	id: number
	x: number
	feetY: number
	vx: number
	vy: number
	facing: 1 | -1
	state: CorgiState
	barking: boolean
	/** Degrees, while flying out of the scoop. */
	spin: number
	/** Who's on its back, while `ridden`. */
	rider?: string
}

/**
 * - `flying`: over the course, from behind, low enough to jump into
 * - `carrying`: someone, hanging on underneath
 * - `leaving`: let them go, and off up and away
 */
export type FlyerState = 'flying' | 'carrying' | 'leaving'

/** A goose flying over the course, at Haga. `feetY` is the bottom of it. */
export interface Flyer {
	id: number
	x: number
	feetY: number
	/** How high it flies, its feet off the ground. */
	altitude: number
	/** Climbing away, once it's let go. */
	vy: number
	state: FlyerState
	/** Who it's carrying. */
	rider?: string
}

export interface Bus {
	/** The front of the scoop. */
	frontX: number
	speed: number
	/** Ticks left of the scoop's flick, after scooping someone. */
	scooping: number
	/** How far behind the runner it's allowed to get: see `BUS_LEASH_FULL`. */
	leash: number
}

/**
 * An obstacle and what's happened to it. Some are there for everyone: a rock
 * trips up each racer who runs into it, once. Others are used up by the first
 * to get to it: a hurdle knocked over, a fika had, geese flown off.
 */
export interface ObstacleState {
	obstacle: Obstacle
	/** Used up for everyone: by the first racer, or by the bus. */
	used: boolean
	/** Which racers it's had its go at, for the ones that are there for everyone. */
	hit: Set<string>
	/** Scooped up by the bus, when, and how fast it flew off: rocks, and children. */
	scooped?: { at: number; vx: number }
	/** Geese, flying off, and when they took off. */
	flown?: number
	/** Ticks left of a cheerer's "Go!" bubble. */
	cheering: Accessor<number>
	setCheering: (ticks: number) => void
	/** Who they're cheering on: whoever passed them. */
	cheered: string
}

/** Words popping up over the runner: "Ouch!", "Fika!". */
export interface Popup {
	id: number
	text: string
	x: number
	y: number
	born: number
}

/**
 * What bonus points are for, on top of a point a metre, and what loses
 * them: `hazards`, whose points are negative.
 */
export type BonusKind =
	| 'heads'
	| 'fika'
	| 'cheers'
	| 'corgis'
	| 'geese'
	| 'hazards'

export interface Result {
	kind: 'scooped' | 'finished'
	/** How far the runner got, in world pixels from the start line. */
	distance: number
	/** For a finish, how far back the bus was. */
	busGap: number
}

export interface WorldOptions {
	/** Points carried on from earlier courses, in Endless. */
	startScore?: number
	/**
	 * A multiplayer Round: the camera frames everyone, nobody scores, and it's
	 * decided when one Player's left.
	 */
	round?: boolean
}

/** A body on the start line at `x`. */
export function startingBody(terrain: Terrain, x: number): Body {
	return {
		x,
		feetY: terrain.groundY(x),
		vx: 0,
		vy: 0,
		grounded: true,
		ducking: false,
		stumble: 0,
		muddy: false,
		facing: 1,
		wasUp: false,
		spin: 0,
		combo: 0,
		mount: 0,
		carried: 0,
		stomped: 0,
	}
}

/** How far apart Players line up on the start line, one behind the other. */
export const START_GAP = 26

/**
 * Everything about one attempt at a level. The physics is plain mutable state,
 * stepped once a tick by the game controller; the signals are what the HUD and
 * the sprites follow.
 *
 * Everyone in `entries` races; the first of them is who single player's HUD,
 * score and summary are about.
 */
export function createWorld(
	level: Level,
	entries: RacerEntry[],
	options: WorldOptions = {},
) {
	const { startScore = 0, round = false } = options
	const terrain: Terrain = level.terrain
	const racers: Racer[] = entries.map((entry, i) => ({
		...entry,
		body: startingBody(terrain, START_X - i * START_GAP),
		outAt: 0,
	}))
	const runner = racers[0].runner
	/** Nobody's out cheering or directing who's running. */
	const running = new Set(racers.map((r) => r.runner.member).filter(Boolean))
	const [phase, setPhase] = createSignal<Phase>('countdown')
	const [ticks, setTicks] = createSignal(0)
	const [raceTicks, setRaceTicks] = createSignal(0)
	const [camera, setCamera] = createSignal(START_X - VIEW_WIDTH * START_LEAD)
	const [playerX, setPlayerX] = createSignal(START_X)
	const [busX, setBusX] = createSignal(BUS_START_X)
	const [popups, setPopups] = createSignal<Popup[]>([])
	const [result, setResult] = createSignal<Result>()
	/** How far round they've got, in whole metres: a point each. */
	const [metres, setMetres] = createSignal(0)
	const [bonus, setBonus] = createSignal(0)
	/** Each kind of bonus, how many and for how much, for the summary. */
	const bonuses: Record<BonusKind, { count: number; points: number }> = {
		heads: { count: 0, points: 0 },
		fika: { count: 0, points: 0 },
		cheers: { count: 0, points: 0 },
		corgis: { count: 0, points: 0 },
		geese: { count: 0, points: 0 },
		hazards: { count: 0, points: 0 },
	}
	const addBonus = (kind: BonusKind, points: number) => {
		bonuses[kind].count++
		bonuses[kind].points += points
		setBonus(bonus() + points)
	}
	/** This course's points: a point a metre, and the bonuses, less the hazards. Never below 0. */
	const courseScore = () => Math.max(0, metres() + bonus())

	const body = racers[0].body
	const bus: Bus = {
		frontX: BUS_START_X,
		speed: 0,
		scooping: 0,
		leash: START_X - BUS_START_X,
	}
	/** How far across the screen the camera keeps the runner, swinging round as they turn. */
	const view = { lead: START_LEAD }

	/** Nobody's out cheering for themselves: they're the one running. */
	const notRunner = (member: RunnerName) => {
		if (!running.has(member)) return member
		const { volunteers } = level
		const at = volunteers.indexOf(member)
		for (let i = 1; i <= volunteers.length; i++) {
			const next = volunteers[(at + i) % volunteers.length]
			if (!running.has(next)) return next
		}
		return member
	}
	const runDirector =
		level.runDirectors.find((member) => !running.has(member)) ??
		level.runDirectors[0]

	const obstacles: ObstacleState[] = level.obstacles.map((placed) => {
		const obstacle =
			placed.kind === 'cheer'
				? { ...placed, member: notRunner(placed.member) }
				: placed
		const [cheering, setCheering] = createSignal(0)
		return {
			obstacle,
			used: false,
			hit: new Set<string>(),
			cheering,
			setCheering,
			cheered: '',
		}
	})

	let popupId = 0
	const popup = (text: string, x: number, y: number) =>
		setPopups((all) => [...all, { id: popupId++, text, x, y, born: ticks() }])

	/** How much of the course the camera shows: 1, or up to 2 zoomed out to frame a Round. */
	const [zoom, setZoom] = createSignal(1)
	/** Who's won a Round, and in what order everyone came, once it's decided. */
	const [order, setOrder] = createSignal<Racer[]>()

	const world = {
		level,
		/** Single player's runner, and their body: the first racer's. */
		runner,
		racers,
		round,
		runDirector,
		terrain,
		body,
		bus,
		view,
		obstacles,
		phase,
		setPhase,
		/** Ticks since the level loaded. */
		ticks,
		setTicks,
		/** Ticks since "Go!". */
		raceTicks,
		setRaceTicks,
		camera,
		setCamera,
		zoom,
		setZoom,
		/** How wide the camera's view is, in world pixels. */
		viewWidth: () => VIEW_WIDTH * zoom(),
		order,
		setOrder,
		/** The tick a Round was decided. */
		decidedAt: 0,
		/** The body's and the bus's positions, as signals, for the HUD. */
		playerX,
		setPlayerX,
		busX,
		setBusX,
		popups,
		setPopups,
		popup,
		result,
		setResult,
		/** How far back the bus was as they crossed the line, for the summary once they've run off. */
		finish: { busGap: 0 },
		/** Everyone else on the path. Plain state, like the body. */
		pack: [] as Pacer[],
		/** At most this many of them: in a Round, fewer the more Players there are. */
		packSize: round ? Math.max(0, PACK_SIZE - racers.length) : PACK_SIZE,
		/** Who's next to join the pack, and when. */
		packState: { nextId: 0, nextJoin: 0 },
		metres,
		setMetres,
		bonuses,
		addBonus,
		courseScore,
		/** The points so far, with any carried on from earlier courses in Endless. */
		score: () => startScore + courseScore(),
		/** The level's furbies and corgis, if it has any. Plain state, like the body. */
		furbies: (level.furbies ?? []).map(
			({ x, asset }, id): Furby => ({
				id,
				asset,
				home: x,
				x,
				feetY: terrain.groundY(x),
				vx: 0,
				vy: 0,
				grounded: true,
				facing: -1,
				state: 'hopping',
				// Not all hopping in step.
				timer: (id * 13) % 40,
				landed: 99,
				spin: 0,
			}),
		),
		/** Geese flying over, and which of the level's flyovers is next. Plain state. */
		flyers: [] as Flyer[],
		flyerState: { next: 0, nextId: 0 },
		corgis: (level.corgis ?? []).map(
			(x, id): Corgi => ({
				id,
				x,
				feetY: terrain.groundY(x),
				vx: 0,
				vy: 0,
				facing: -1,
				state: 'waiting',
				barking: false,
				spin: 0,
			}),
		),
	}
	lineUp(world)
	return world
}

export type World = ReturnType<typeof createWorld>
