import type { RunnerName } from '@/data/runners'
import { type Accessor, createSignal } from 'solid-js'
import type { Boost, Course, Obstacle } from '../courses/types'
import type { BusRide } from '../draw/busRide'
import { rideLook } from '../draw/rideLook'
import type { Controls } from '../input'
import type { Avatar } from '../runners/looks'
import type { Playable } from '../runners/playable'
import { createCarts } from './carts'
import {
	BUS_START_X,
	DUCK_HEIGHT,
	GROUND_Y,
	PACK_SIZE,
	SQUASHED,
	STAND_HEIGHT,
	START_LEAD,
	START_X,
	VIEW_WIDTH,
} from './constants'
import { createFootball } from './football'
import type { Hat } from './hats'
import { lineUp } from './pack'
import type { PortalRun } from './portals'
import type { Terrain } from './terrain'

/**
 * - `countdown`: the run director's "3, 2, 1", nobody moving yet
 * - `running`: "Go!", and the bus is coming
 * - `scooped`: the bus caught up
 * - `fallen`: down a Gap
 * - `finished`: over the line ahead of it
 */
export type Phase = 'countdown' | 'running' | 'scooped' | 'fallen' | 'finished'

/**
 * Out of the race: caught by the bus, down a Gap, or over the line. Someone
 * still running when a multiplayer Round's decided isn't out: they won it.
 */
export type Out = 'scooped' | 'fallen' | 'finished'

/** Out, and not by finishing: Scooped or Fallen, which count the same. */
export const isCaught = (out: Out | undefined) =>
	out === 'scooped' || out === 'fallen'

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

/**
 * Who's racing, as the game's given them: and the hat they've still got on
 * from the course before, in Endless, or the Round before.
 */
export type RacerEntry = Pick<
	Racer,
	'id' | 'runner' | 'controls' | 'colour' | 'number'
> & { hat?: Hat }

/** The runner, as the physics sees them: `x` is the middle of their feet. */
/** How tall someone is, for running into things: ducking or not, squashed or not. */
export const bodyHeight = (b: Body) =>
	(b.ducking ? DUCK_HEIGHT : STAND_HEIGHT) * (b.squashed > 0 ? SQUASHED : 1)

export interface Body {
	x: number
	feetY: number
	vx: number
	vy: number
	grounded: boolean
	ducking: boolean
	/** How fast they went into the Tunnel they're in: they go through it no slower. */
	tunnelSpeed?: number
	/** Ticks left of a stumble, during which they can't speed up. */
	stumble: number
	/** Ticks left of being squashed by a furby: half their height, and slower. */
	squashed: number
	/** Ticks left of being held still by a Swamp Man. */
	held: number
	muddy: boolean
	/** The hat they're wearing, if any: a Pumpkin, a helmet (see `hats`). */
	hat?: Hat
	/** The last one knocked off, flying, and when. */
	lostHat?: { hat: Hat; at: number }
	/** Which way they last ran: 1 right, -1 left. */
	facing: 1 | -1
	/** Up was held last tick, so holding it doesn't keep jumping. */
	wasUp: boolean
	/** And left, right and down, on skis: a trick's each pressed in the air, not held into it. */
	wasLeft: boolean
	wasRight: boolean
	wasDown: boolean
	/** On the way up from a jump of their own: letting go of up cuts it short. */
	jumping: boolean
	/** Floating down, holding jump, in a propeller beanie. */
	floating?: boolean
	/** Degrees, while flying out of the scoop. */
	spin: number
	/** Heads bounced off since last on the ground, for doubling the points. */
	combo: number
	/** Ticks left riding a corgi. */
	mount: number
	/** The mine cart they're riding, by its index, in The Caves (see `carts`). */
	cart?: number
	/**
	 * On a glider, out over the sea, steering it up and down, until it comes
	 * down on the island.
	 */
	gliding: boolean
	/** Ticks left being carried by a flying goose. */
	carried: number
	/**
	 * Caught by a condor, falling off a Leap, here: being carried down from
	 * it, along its way down to the valley floor (see `rideCondor`).
	 */
	condorFrom?: { x: number; y: number }
	/** Ticks before another Player can bounce on their head again. */
	stomped: number
	/** The Platform they're stood on, by its index: on the Ground if none. */
	on?: number
	/** Ticks left of dropping through `on`'s Platform, ducked off it. */
	dropping: number
	/** Which one that is. */
	droppingFrom?: number
	/** The height they last stood at: what the camera follows, not every jump. */
	floor: number
	/**
	 * On skis or a snowboard, the whole way down The Slopes: which of the
	 * rack's they took, from 1 (see `BOARDS`); 0, on foot.
	 */
	board: number
	/** The trick they're in the middle of, in the air, if any, and how far through it, in ticks. */
	trick?: TrickKind
	trickTicks: number
	/** How far round they've turned in it, in degrees: what it's drawn by. */
	turn: number
	/** The tricks done since leaving the snow, to be scored on landing. */
	airTricks: TrickKind[]
	/** The Rail they're grinding along, by its index, if any; and for how long. */
	grind?: number
	grindTicks: number
	/** Ticks left lying in the snow after a wipeout. */
	wipeout: number
	/**
	 * Where they took off from, if it was the ski jump, or the long jump's
	 * board: for how far they flew.
	 */
	launchX?: number
	/** Had their go at the long jump, this course: one each. */
	longJumped?: boolean
	/** Where they landed in its sand, if they did: their mark in it. */
	longJumpMark?: number
	/** The hats they had on getting onto a Ride, by kind: one each time. */
	rodeWearing?: string[]
	/** Been up on top of a guard tower: the Great Wall's special goal. */
	toppedTower?: boolean
	/** Germs popped, landing on them: Karolinska's special goal. */
	germsPopped?: number
}

/**
 * A trick in the air, on skis or a snowboard: spun round, flipped back or
 * forward, or a grab.
 */
export type TrickKind = 'spin' | 'backflip' | 'frontflip' | 'grab'
export const TRICK_KINDS: TrickKind[] = [
	'spin',
	'backflip',
	'frontflip',
	'grab',
]

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
	/** Not anyone at all: a skeleton, running with you. */
	skeleton?: boolean
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
	/** The Platform they're stood on, by its index: on the Ground if none. */
	on?: number
	/** How fast they went into the Tunnel they're in: they go through it no slower. */
	tunnelSpeed?: number
	/** Ducked under a low branch or a tall hurdle, as anyone: see `duckUnder`. */
	ducking?: boolean
	/** On a glider, out over the sea, as anyone: see `flyPacer`. */
	gliding?: boolean
	/** On skis or a snowboard, down The Slopes, as anyone: see `skiPacer`. */
	board?: number
	/** A trick they're doing in the air, and how far round they've turned in it. */
	trick?: TrickKind
	trickTicks?: number
	turn?: number
	/** The Rail they're grinding along, if any. */
	grind?: number
	/** Caught by a condor, off a Leap, here: being carried down from it, as anyone. */
	condorFrom?: { x: number; y: number }
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

/**
 * A Ride, a corgi or whatever the course's are, waiting to be ridden. `x` is
 * the middle of its feet; a glider's, the middle of its control bar.
 */
export interface Corgi {
	id: number
	x: number
	/** How high over the Ground it waits, up on a ledge, if it's not on the Ground. */
	up?: number
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
	/** The rarer one of them, if the course's Rides have one: see `RideLook`. */
	rare?: boolean
	/** A glider's, flying off with no one on it: how long it's been going. */
	adrift?: number
}

/**
 * - `flying`: over the course, from behind, low enough to jump into
 * - `swooping`: a condor, in to catch whoever's falling off a Leap
 * - `carrying`: someone, hanging on underneath
 * - `leaving`: let them go, and off up and away
 */
export type FlyerState = 'flying' | 'swooping' | 'carrying' | 'leaving'

/** A goose flying over the course, at Haga. `feetY` is the bottom of it. */
export interface Flyer {
	id: number
	x: number
	feetY: number
	/** How high it flies, its feet off the ground. */
	altitude: number
	/** Where its feet are, flying along, before it bobs: gliding to `altitude` over what's below. */
	cruise: number
	/** Climbing away, once it's let go. */
	vy: number
	state: FlyerState
	/** Who it's carrying, or swooping in to catch. */
	rider?: string
	/** Or which Pacer, by their id. */
	pacer?: number
}

export interface Bus {
	/** The front of the scoop. */
	frontX: number
	speed: number
	/** Ticks left of the scoop's flick, after scooping someone. */
	scooping: number
	/** How far behind the runner it's allowed to get: see `BUS_LEASH_FULL`. */
	leash: number
	/**
	 * How far up its Scoop Arm reaches, from the Ground's line, for someone
	 * up on a Platform or a rooftop: negative is down.
	 */
	reach: number
	/** How it's drawn going up and down: see `rideBus`. */
	ride?: BusRide
}

/**
 * An obstacle and what's happened to it. Some are there for everyone: a rock
 * trips up each racer who runs into it, once. Others are used up by the first
 * to get to it: a hurdle knocked over, geese flown off.
 */
export interface ObstacleState {
	obstacle: Obstacle
	/** Used up for everyone: by the first racer, or by the bus. */
	used: boolean
	/** Which racers it's had its go at, for the ones that are there for everyone. */
	hit: Set<string>
	/** Scooped up by the bus, when, and how fast it flew off: rocks, and children. */
	scooped?: { at: number; vx: number; x?: number }
	/**
	 * Geese, disturbed: when they took off (see `gooseTakeoff`). A Steam
	 * Vent: when it last puffed.
	 */
	flown?: number
	/** A cyclist riding round a loop: how many times round it's been. */
	lap?: number
}

/**
 * A boost and what's happened to it. A fika's had by the first to get to it;
 * a cheerer cheers on everyone who passes, once each.
 */
export interface BoostState {
	boost: Boost
	/** Had, by the first racer to it. */
	used: boolean
	/** Which racers it's cheered on. */
	hit: Set<string>
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
	/** The Caves' mine carts: rides too, but not the course's Ride. */
	| 'carts'
	| 'cones'
	/** Haga's football, kicked all the way over the finish line. */
	| 'football'
	| 'geese'
	| 'pumpkins'
	| 'hats'
	| 'barcodes'
	| 'rings'
	| 'tricks'
	| 'grinds'
	| 'gates'
	| 'jumps'
	| 'speed'
	| 'hazards'

export interface Result {
	kind: 'scooped' | 'fallen' | 'finished'
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
	/**
	 * A Round in Baby Mode: no bus, a fall's not out (back on your feet just
	 * past the Gap), and anyone left behind is carried along faster.
	 */
	baby?: boolean
}

/** Where the bus is in Baby Mode: parked well out of the way, off the course. */
export const BABY_BUS_PARKED = -100_000

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
		squashed: 0,
		held: 0,
		muddy: false,
		facing: 1,
		wasUp: false,
		wasLeft: false,
		wasRight: false,
		wasDown: false,
		jumping: false,
		spin: 0,
		combo: 0,
		mount: 0,
		gliding: false,
		carried: 0,
		stomped: 0,
		dropping: 0,
		floor: terrain.groundY(x),
		board: 0,
		trickTicks: 0,
		turn: 0,
		airTricks: [],
		grindTicks: 0,
		wipeout: 0,
	}
}

/** How far apart Players line up on the start line, one behind the other. */
export const START_GAP = 26

/**
 * Everything about one attempt at a course. The physics is plain mutable state,
 * stepped once a tick by the game controller; the signals are what the HUD and
 * the sprites follow.
 *
 * Everyone in `entries` races; the first of them is who single player's HUD,
 * score and summary are about.
 */
export function createWorld(
	course: Course,
	entries: RacerEntry[],
	options: WorldOptions = {},
) {
	const { startScore = 0, round = false, baby = false } = options
	const terrain: Terrain = course.terrain
	const racers: Racer[] = entries.map(({ hat, ...entry }, i) => ({
		...entry,
		body: { ...startingBody(terrain, START_X - i * START_GAP), hat },
		outAt: 0,
	}))
	const runner = racers[0].runner
	/** Nobody's out cheering or directing who's running. */
	const running = new Set(racers.map((r) => r.runner.member).filter(Boolean))
	const [phase, setPhase] = createSignal<Phase>('countdown')
	const [ticks, setTicks] = createSignal(0)
	const [raceTicks, setRaceTicks] = createSignal(0)
	const [camera, setCamera] = createSignal(START_X - VIEW_WIDTH * START_LEAD)
	/**
	 * How far up the camera's looking, from where the course's lowest is:
	 * negative is up. Starting at the top of a mountain, off the top of the
	 * screen, looking up at the start line from the first tick, as at the
	 * foot of any other course.
	 */
	const startY = terrain.groundY(START_X)
	const [cameraY, setCameraY] = createSignal(
		startY < 0 ? Math.round(startY - GROUND_Y) : 0,
	)
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
		carts: { count: 0, points: 0 },
		cones: { count: 0, points: 0 },
		football: { count: 0, points: 0 },
		geese: { count: 0, points: 0 },
		pumpkins: { count: 0, points: 0 },
		hats: { count: 0, points: 0 },
		barcodes: { count: 0, points: 0 },
		rings: { count: 0, points: 0 },
		tricks: { count: 0, points: 0 },
		grinds: { count: 0, points: 0 },
		gates: { count: 0, points: 0 },
		jumps: { count: 0, points: 0 },
		speed: { count: 0, points: 0 },
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
		frontX: baby ? BABY_BUS_PARKED : BUS_START_X,
		speed: 0,
		scooping: 0,
		leash: START_X - BUS_START_X,
		reach: 0,
	}
	/** How far across the screen the camera keeps the runner, swinging round as they turn. */
	const view = { lead: START_LEAD }

	const runDirector =
		course.runDirectors.find((member) => !running.has(member)) ??
		course.runDirectors[0]
	/**
	 * Nobody's out cheering for themselves, they're the one running; nor
	 * the run director, who's at the start, counting everyone down.
	 */
	const busy = (member: RunnerName) =>
		running.has(member) || member === runDirector
	const notRunner = (member: RunnerName) => {
		if (!busy(member)) return member
		const { cheerers } = course
		const at = cheerers.indexOf(member)
		for (let i = 1; i <= cheerers.length; i++) {
			const next = cheerers[(at + i) % cheerers.length]
			if (!busy(next)) return next
		}
		return member
	}

	/**
	 * Which of the course's Rides is the rarer one, this time, if its Rides
	 * have one and it's turned up: now and then, one in place of any of them.
	 * A Remote Player's is the Host's, sent with the rest (see `Mirror`).
	 */
	const share = rideLook(course).rare?.share ?? 0
	const rides = course.corgis?.length ?? 0
	const rareAt =
		rides && Math.random() < share ? Math.floor(Math.random() * rides) : -1

	const obstacles: ObstacleState[] = course.obstacles.map((obstacle) => ({
		obstacle,
		used: false,
		hit: new Set<string>(),
	}))
	const boosts: BoostState[] = course.boosts.map((placed) => {
		const boost =
			placed.kind === 'cheer'
				? { ...placed, member: notRunner(placed.member) }
				: placed
		const [cheering, setCheering] = createSignal(0)
		return {
			boost,
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

	/** How much of the course the camera shows: 1, or up to `MAX_ZOOM` zoomed out to frame a Round. */
	const [zoom, setZoom] = createSignal(1)
	/** Who's won a Round, and in what order everyone came, once it's decided. */
	const [order, setOrder] = createSignal<Racer[]>()

	const world = {
		course,
		/** Single player's runner, and their body: the first racer's. */
		runner,
		racers,
		round,
		/** Baby Mode: see `WorldOptions`. */
		baby: round && baby,
		runDirector,
		terrain,
		body,
		bus,
		view,
		obstacles,
		boosts,
		phase,
		setPhase,
		/** Ticks since the course loaded. */
		ticks,
		setTicks,
		/** Ticks since "Go!". */
		raceTicks,
		setRaceTicks,
		camera,
		setCamera,
		cameraY,
		setCameraY,
		zoom,
		setZoom,
		/** How wide the camera's view is, in world pixels. */
		viewWidth: () => VIEW_WIDTH * zoom(),
		order,
		setOrder,
		/** The tick a Round was decided. */
		decidedAt: 0,
		/** Since when only one Player's been left running, if only one is. */
		aloneSince: undefined as number | undefined,
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
		finish: { busGap: 0, ahead: 0 },
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
		/** The course's furbies and corgis, if it has any. Plain state, like the body. */
		furbies: (course.furbies ?? []).map(
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
		/** Geese flying over, and which of the course's flyovers is next. Plain state. */
		flyers: [] as Flyer[],
		flyerState: { next: 0, nextId: 0 },
		/** The course's mine carts, if it has a mine. Plain state, like the body. */
		carts: createCarts({ course, terrain }),
		/** Its football, if it has one: see `Football`. Plain state, like the body. */
		ball: createFootball({ football: course.football, terrain }),
		/** The course's Platforms, which move with the tick: see `platformAt`. */
		platforms: course.platforms ?? [],
		/** A Portal at work, if one is: see `portals`. Plain state, like the body. */
		portal: undefined as PortalRun | undefined,
		/** The course's Portals that have gone off, and let everyone through, by index. */
		portalsDone: new Set<number>(),
		corgis: (course.corgis ?? []).map(
			(x, id): Corgi => ({
				id,
				x,
				up: course.corgisUp?.[id],
				feetY: terrain.groundY(x) - (course.corgisUp?.[id] ?? 0),
				vx: 0,
				vy: 0,
				facing: -1,
				state: 'waiting',
				barking: false,
				spin: 0,
				rare: id === rareAt || undefined,
			}),
		),
	}
	lineUp(world)
	return world
}

export type World = ReturnType<typeof createWorld>
