import type { RunnerName } from '@/data/runners'
import { type Accessor, createSignal } from 'solid-js'
import type { Level, Obstacle } from '../levels/types'
import type { Playable } from '../playable'
import { BUS_START_X, START_LEAD, START_X, VIEW_WIDTH } from './constants'
import { lineUp } from './pack'
import type { Terrain } from './terrain'

/**
 * - `countdown`: the run director's "3, 2, 1", nobody moving yet
 * - `running`: "Go!", and the bus is coming
 * - `scooped`: the bus caught up
 * - `finished`: over the line ahead of it
 */
export type Phase = 'countdown' | 'running' | 'scooped' | 'finished'

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
}

/**
 * Someone else out running: anyone at all, or now and then a club member.
 * Like the runner's body, `x` is the middle of their feet.
 */
export interface Pacer {
	id: number
	name: string
	member?: RunnerName
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

/** An obstacle and what's happened to it: a rock's been tripped over, a fika had. */
export interface ObstacleState {
	obstacle: Obstacle
	used: boolean
	/** Scooped up by the bus, when, and how fast it flew off: rocks, and children. */
	scooped?: { at: number; vx: number }
	/** Ticks left of a cheerer's "Go!" bubble. */
	cheering: Accessor<number>
	setCheering: (ticks: number) => void
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
export type BonusKind = 'heads' | 'fika' | 'cheers' | 'corgis' | 'hazards'

export interface Result {
	kind: 'scooped' | 'finished'
	/** How far the runner got, in world pixels from the start line. */
	distance: number
	/** For a finish, how far back the bus was. */
	busGap: number
}

/**
 * Everything about one attempt at a level. The physics is plain mutable state,
 * stepped once a tick by the game controller; the signals are what the HUD and
 * the sprites follow.
 */
export function createWorld(level: Level, runner: Playable, startScore = 0) {
	const terrain: Terrain = level.terrain
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
		hazards: { count: 0, points: 0 },
	}
	const addBonus = (kind: BonusKind, points: number) => {
		bonuses[kind].count++
		bonuses[kind].points += points
		setBonus(bonus() + points)
	}
	/** This course's points: a point a metre, and the bonuses, less the hazards. Never below 0. */
	const courseScore = () => Math.max(0, metres() + bonus())

	const body: Body = {
		x: START_X,
		feetY: terrain.groundY(START_X),
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
	}
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
		if (member !== runner.member) return member
		const { volunteers } = level
		const at = volunteers.indexOf(member)
		for (let i = 1; i <= volunteers.length; i++) {
			const next = volunteers[(at + i) % volunteers.length]
			if (next !== runner.member) return next
		}
		return member
	}
	const runDirector =
		level.runDirectors.find((member) => member !== runner.member) ??
		level.runDirectors[0]

	const obstacles: ObstacleState[] = level.obstacles.map((placed) => {
		const obstacle =
			placed.kind === 'cheer'
				? { ...placed, member: notRunner(placed.member) }
				: placed
		const [cheering, setCheering] = createSignal(0)
		return { obstacle, used: false, cheering, setCheering }
	})

	let popupId = 0
	const popup = (text: string, x: number, y: number) =>
		setPopups((all) => [...all, { id: popupId++, text, x, y, born: ticks() }])

	const world = {
		level,
		runner,
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
