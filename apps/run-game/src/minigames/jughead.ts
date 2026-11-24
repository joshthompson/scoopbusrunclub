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
	START_X,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import { type Racer, type World, bodyHeight, startingBody } from '../game/world'
import type { Controls } from '../input'
import { CLUB } from '../runners/playable'
import { play } from '../sfx'
import { ARENA_LEFT, ARENA_WALLS, arenaCourse, inRandomOrder } from './arena'
import { TEAM_NAMES } from './beachVolleyball'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Jughead: a badly kept public bathroom, a high ceiling, rusty pipes along
 * it, and everyone with a big glass jug on their head, its mouth up, in two
 * teams, Red and Blue, their jugs strapped on in their team's colour. Water
 * comes out of the pipes' spouts, a stream here and a drip there, starting
 * and stopping and moving on to another spout; stand under a stream with
 * your jug's mouth in it to fill it. Whoever's jug's highest under a
 * stream gets all of it: jump into someone else's to steal it.
 *
 * Each team's tank stands at their end of the room, Red's on the left,
 * Blue's on the right, a pipe from its top over to a sucker hanging just
 * in from the wall: stand under your team's with your jug, and it sucks it
 * empty, up the pipe, into the tank. A line on the tank says how much fills
 * it: a jug for everyone on the team. The teams are always even, four
 * players at least: bots make them up.
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
 * The first team to fill their tank to the line wins; after a minute and a
 * bit, whichever's fuller.
 */

/** How long it goes on, at most: a minute and ten seconds. */
export const JUG_TICKS = Math.round(70_000 / TICK_MS)
/** How long a mishap's said, big, as it starts. */
const ANNOUNCED_FOR = 90

// --- The teams' tanks ----------------------------------------------------------

/** Each team's colour, as text on the HUD: Red's and Blue's, light enough to read on its dark board. */
const TEAM_TEXT = ['#ff6f66', '#7aa2ff']
/** The fewest playing: bots make it up to this, and to an even number, so the teams are even. */
const FEWEST = 4
/** The bots that make the teams up: their ids, `jug-bot-0` on, so every screen finds them. */
const TEAM_BOT = 'jug-bot'
/**
 * Each team's tank, down at their end of the room, past the wall, stood on
 * the floor: how far in from the screen's edge, how wide and how high up
 * its top is, down the screen. Its frame's this thick; its cap and its
 * plinth this tall.
 */
export const TANK_IN = 10
export const TANK_WIDE = 44
export const TANK_TOP = 220
export const TANK_FRAME = 4
export const TANK_CAP = 8
export const TANK_PLINTH = 12
/** How much more it holds than the line on it, the line's share of the way up it: room over it. */
export const TANK_ROOM = 1.25
/**
 * The sucker, each team's, hanging just in from their wall, its pipe up
 * from it, over and down into their tank: how far in from the wall, down
 * the screen its mouth is, and how far either side of its middle it sucks.
 * A jug's mouth sucks from as far under it as anyone stood up's is, and
 * from up in it, jumping.
 */
export const HOOD_IN = 22
export const HOOD_BOTTOM = 384
const SUCK_HALF = 16
const SUCK_UNDER = 56
const SUCK_OVER = 24
/** How much of a jug it sucks out a tick: a full one in a second and a half. */
const SUCK_RATE = 0.012
/**
 * The sucker's hose: how much of the way it comes down into a jug a tick,
 * and goes back up; and how far down into the jug, past its mouth, it goes.
 */
const NOZZLE_DOWN = 0.1
const NOZZLE_UP = 0.2
export const NOZZLE_IN = 12
/** A bot getting no nearer where it's going for this long is hemmed in: it keeps clear of there this long. */
const STUCK_TICKS = 60
const AVOID_TICKS = 180
/** Hemmed in on its way home, a bot jumps, holding the way, this long: over them. */
const JUMP_OVER_TICKS = 10
/** Where, across the screen, team `team`'s tank's left edge is. */
export const tankLeft = (team: number) =>
	team === 0 ? TANK_IN : VIEW_WIDTH - TANK_IN - TANK_WIDE
/** Where, along the world, team `team`'s sucker hangs. */
export const hoodX = (team: number) =>
	team === 0 ? ARENA_WALLS.left + HOOD_IN : ARENA_WALLS.right - HOOD_IN

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

/** A jug of water, as it is: how full, its surface's tilt and how fast it's tipping, and whether it's been said it's full. */
export interface Jug {
	fill: number
	tilt: number
	spin: number
	fullSaid?: boolean
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
/** How much of a jug each fills a tick, caught: a stream, a full one in twelve seconds. */
const JET_RATE: Record<JetKind, number> = {
	drip: 0.0002,
	stream: 0.0014,
	gush: 0.0018,
	fountain: 0.003,
	spray: 0.0013,
	squirt: 0.0011,
	seep: 0.0007,
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
/** How many streams at once, to begin with and from halfway, for four playing; and three more for every four more, their tanks as much bigger. */
const STREAMS_FIRST = 2
const STREAMS_LATER = 3
const STREAMS_FROM = 4
/** How many spouts drip, besides; and seams along the pipe seep, to begin with and from halfway, and how long each. */
const DRIPS = 2
const SEEPS_FIRST = 1
const SEEPS_LATER = 2
const SEEP_TICKS = 300
/** Where along the pipe a seam can leak, across the screen: well in from the suckers, so nobody's filling up beside one; and how far apart two are, at least. */
const SEEP_FROM = 150
const SEEP_TO = 810
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
	/** Which team each's on, by their id: 0 Red, the left, 1 Blue, the right. */
	teams: Map<string, number>
	/** How full each team's tank is, in jugs; and the line on it, how many fill it: a jug for everyone on the team. */
	tanks: [number, number]
	target: number
	/** Whose jugs are being sucked empty just now, by their ids. */
	sucking: Set<string>
	/**
	 * Each team's sucker: whose jug its hose is down in, or on its way down
	 * into or back up out of; how far down it is, 0 up in the hood to 1 in
	 * their jug; and whether it's letting go, coming back up.
	 */
	docks: Dock[]
}
export interface Dock {
	id?: string
	reach: number
	letGo: boolean
}
/** Team `team`'s tank: how much it holds, all told, in jugs, more than the line on it. */
export const capacityOf = (show: JugShow) => show.target * TANK_ROOM
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
	tagline: 'Fill your team’s tank',
	blurb:
		'Red against Blue! Fill the jug on your head under the leaky pipes, then carry it to your team’s tank and stand under the sucker to empty it in. Run too fast or stop too hard and it sloshes out. Bounce on the other team’s heads to spill theirs. First team to fill their tank to the line wins!',
	tune: 'sewers',
	evenTeamsOf: FEWEST,
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

/** Whether `racer`'s one of the bots that make the teams up. */
const teamBot = (racer: Racer) => racer.id.startsWith(TEAM_BOT)

/** A club member not playing, to make a team up: the same on every screen. */
function pickBot(racers: Racer[]) {
	const playing = new Set(racers.map((r) => r.runner.id))
	const free = CLUB.filter((m) => !playing.has(m.id))
	const seed = racers
		.map((r) => r.id)
		.join('')
		.split('')
		.reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7)
	return free[seed % free.length] ?? CLUB[0]
}

function startJughead(world: World): MinigameRun {
	const { racers } = world
	// The teams made up, even and four at least, with bots. On a phone,
	// they're there already, sent with everyone else.
	const players = racers.filter((r) => !teamBot(r))
	const want = Math.max(FEWEST, players.length + (players.length % 2))
	for (let k = 0; racers.length < want; k++) {
		const id = `${TEAM_BOT}-${k}`
		if (racers.some((r) => r.id === id)) continue
		const extra: Racer = {
			id,
			runner: pickBot(racers),
			body: startingBody(world.terrain, START_X),
			controls: () => run.bot(extra),
			colour: '#8a96a0',
			number: racers.length + 1,
			outAt: 0,
		}
		racers.push(extra)
	}
	const solo = players.length === 1
	const jugs = new Map<string, Jug>()
	const show: JugShow = {
		racers,
		jugs,
		jets: [],
		flood: 0,
		teams: new Map(),
		tanks: [0, 0],
		// A jug for everyone on a team.
		target: racers.length / 2,
		sucking: new Set(),
		docks: [
			{ reach: 0, letGo: false },
			{ reach: 0, letGo: false },
		],
	}
	shows.set(world, show)
	// The Players shuffled and taken in turns; the bots onto whichever's short.
	const { teams } = show
	inRandomOrder(players).forEach((racer, i) => teams.set(racer.id, i % 2))
	for (const extra of racers.filter(teamBot)) {
		const reds = [...teams.values()].filter((t) => t === 0).length
		teams.set(extra.id, reds * 2 <= teams.size ? 0 : 1)
	}
	const teamOf = (racer: Racer) => teams.get(racer.id) ?? 0
	const mates = (team: number) => racers.filter((r) => teamOf(r) === team)

	// Each team spread out over their own half, facing in, their hats off:
	// the jug's on their head.
	const { left: LEFT, right: RIGHT } = ARENA_WALLS
	const HALF = (RIGHT - LEFT) / 2
	for (const team of [0, 1]) {
		const on = mates(team)
		on.forEach((racer, i) => {
			const b = racer.body
			b.x = Math.round(
				LEFT + team * HALF + 40 + ((HALF - 80) * (i + 0.5)) / on.length,
			)
			b.feetY = world.terrain.groundY(b.x)
			b.floor = b.feetY
			b.grounded = true
			b.facing = team === 0 ? 1 : -1
			b.hat = undefined
			b.celebrating = false
		})
	}
	for (const racer of racers)
		jugs.set(racer.id, { fill: 0, tilt: 0, spin: 0, spilt: 0 })
	const jugOf = (racer: Racer) => jugs.get(racer.id) as Jug
	/** How much each's poured into their team's tank, all told. */
	const poured = new Map(racers.map((r) => [r.id, 0]))
	/** Who won, once it's decided: a team, or -1 for a draw. */
	let winner: number | undefined
	const won = (racer: Racer) =>
		winner !== undefined && (winner < 0 || winner === teamOf(racer))
	/** What each racer was doing last tick, for how they've sped up, landed, been bounced on. */
	const was = new Map(
		racers.map((r) => [r.id, { vx: 0, vy: 0, grounded: true, stomped: 0 }]),
	)

	let nextJet = 0
	const t = () => world.raceTicks()
	const progress = () => Math.min(1, t() / JUG_TICKS)
	const over = () => !!world.order()
	const ticksLeft = () => Math.max(0, JUG_TICKS - t())
	/** `jugs` of water, as a share of a tank's line, in percent: 100, filled to it, and no more. */
	const pctOf = (jugs: number) => Math.min(100, (jugs / show.target) * 100)
	/** "100%–72%", how far each team's tank is to its line, their team's first: to a tenth of a percent, if that's all between them. */
	const tanksSaid = (racer: Racer) => {
		const [mine, theirs] = [
			pctOf(show.tanks[teamOf(racer)]),
			pctOf(show.tanks[1 - teamOf(racer)]),
		]
		const close = Math.floor(mine) === Math.floor(theirs) && mine !== theirs
		const said = (n: number) =>
			close ? (Math.floor(n * 10) / 10).toFixed(1) : `${Math.floor(n)}`
		return `${said(mine)}%–${said(theirs)}%`
	}
	/** What `racer`'s poured into their team's tank, as a share of its line: "34%". */
	const pouredSaid = (racer: Racer) =>
		`${Math.floor(pctOf(poured.get(racer.id) ?? 0))}%`

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
			Math.max(0, Math.floor(((racers.length - STREAMS_FROM) * 3) / 4))
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

	/**
	 * `a` and `b` in each other's way, on different teams: pushed apart a
	 * little, their jugs sloshed, and slowed going into each other.
	 * Teammates make way for each other, so they're never stuck behind one.
	 */
	function shove(a: Racer, b: Racer) {
		const ba = a.body
		const bb = b.body
		if (teamOf(a) === teamOf(b)) return
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
			if (jug.fill > 0) {
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
		const lost = Math.min(jug.fill, amount)
		jug.fill -= lost
		jug.spilt += lost
		jug.lately = (jug.lately ?? 0) + lost
	}

	/**
	 * Under their team's sucker, with something in their jug: sucked out of
	 * it, a little a tick, up the pipe into the tank.
	 */
	function suck(racer: Racer) {
		const team = teamOf(racer)
		const jug = jugOf(racer)
		const took = Math.min(jug.fill, SUCK_RATE)
		jug.fill -= took
		show.tanks[team] += took
		poured.set(racer.id, (poured.get(racer.id) ?? 0) + took)
		if (jug.fill <= 0) {
			jug.fill = 0
			jug.fullSaid = false
		}
	}

	/** Whether `racer`'s jug's mouth is under their team's sucker. */
	function underHood(racer: Racer) {
		const mouth = mouthOf(racer)
		return (
			Math.abs(mouth.x - hoodX(teamOf(racer))) <= SUCK_HALF &&
			mouth.y <= HOOD_BOTTOM + SUCK_UNDER &&
			mouth.y >= HOOD_BOTTOM - SUCK_OVER
		)
	}

	/**
	 * A tick of team `team`'s sucker. Up in its hood, it waits for a
	 * teammate stood under it with water in their jug; then its hose comes
	 * down into their jug, holding them where they are, and once it's in,
	 * sucks it empty; then it lets go, coming back up, and they're free.
	 * Knocked out from under it, it lets go of them there and then.
	 */
	function stepDock(team: number) {
		const dock = show.docks[team]
		const racer = racers.find((r) => r.id === dock.id)
		if (!racer) {
			dock.id = undefined
			dock.reach = Math.max(0, dock.reach - NOZZLE_UP)
			// Back up: the next under it, standing, with water to give.
			const next =
				!over() &&
				dock.reach === 0 &&
				racers.find(
					(r) =>
						teamOf(r) === team &&
						r.body.grounded &&
						jugOf(r).fill > 0.02 &&
						underHood(r),
				)
			if (next) {
				dock.id = next.id
				dock.letGo = false
				play('whoosh')
			}
			return
		}
		if (!underHood(racer)) {
			// Knocked out from under it: let go, there and then.
			dock.id = undefined
			show.sucking.delete(racer.id)
			return
		}
		// Held where they are, the hose in their jug.
		const b = racer.body
		b.held = 2
		b.vx = 0
		if (dock.letGo) {
			// Emptied: coming back up out of it; free once it's out.
			show.sucking.delete(racer.id)
			dock.reach = Math.max(0, dock.reach - NOZZLE_UP)
			if (dock.reach === 0) {
				dock.id = undefined
				b.held = 0
			}
			return
		}
		if (dock.reach < 1) {
			// On its way down into it.
			dock.reach = Math.min(1, dock.reach + NOZZLE_DOWN)
			if (dock.reach === 1) play('squelch')
			return
		}
		show.sucking.add(racer.id)
		suck(racer)
		if (jugOf(racer).fill <= 0) {
			dock.letGo = true
			play('whoosh')
		}
	}

	/** Over: `team` won (-1, a draw), everyone on it first. The bots making the teams up have no place. */
	function decide(team: number) {
		if (over()) return
		winner = team
		show.sucking.clear()
		for (const dock of show.docks) dock.letGo = true
		const order = (
			team < 0 ? racers : [...mates(team), ...mates(1 - team)]
		).filter((r) => !teamBot(r))
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const filledIt = team >= 0 && show.tanks[team] >= show.target
		const said =
			team < 0
				? 'It’s a draw!'
				: solo
					? won(players[0])
						? 'You win!'
						: 'You lose!'
					: filledIt
						? `${TEAM_NAMES[team]} filled their tank!`
						: `${TEAM_NAMES[team]} wins!`
		// Over the winners' end, in from their tank.
		const x =
			team < 0
				? START_X
				: ARENA_LEFT +
					tankLeft(team) +
					TANK_WIDE / 2 +
					(team === 0 ? 120 : -120)
		world.popup(said, x, TANK_TOP - 30)
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
	/**
	 * Where each bot's going, whether it's home to their tank, and till
	 * when it'll think again; and the nearest it's got, and when, to see if
	 * it's getting anywhere.
	 */
	interface Plan {
		to: number
		home: boolean
		until: number
		closest: number
		since: number
		/** How full their jug's got, since `since`: filling's getting somewhere too. */
		filled: number
		/** Hemmed in going home: jumping over whoever's in the way, till this tick. */
		jumpTill: number
	}
	const plans = new Map<string, Plan>()
	/** A spot each bot couldn't get to, hemmed in, kept clear of a while. */
	const avoiding = new Map<string, { x: number; until: number }>()

	/**
	 * The best place for `racer` to stand just now: under the jet that'll
	 * fill them most, near enough, not too crowded, nor where a teammate's
	 * already going, nor somewhere they couldn't get to just now.
	 */
	function bestSpot(racer: Racer) {
		const now = t()
		const me = mouthOf(racer)
		const team = teamOf(racer)
		const avoid = avoiding.get(racer.id)
		let best: { x: number; score: number } | undefined
		for (const jet of show.jets) {
			if (jet.until <= now + 30 || jet.from > now + WARN_TICKS) continue
			const reach = jetReaches(jet, me.y)
			if (reach === undefined) continue
			const x = jetAt(jet, reach, now).x
			if (x < ARENA_WALLS.left || x > ARENA_WALLS.right) continue
			if (avoid && world.ticks() < avoid.until && Math.abs(x - avoid.x) < 30)
				continue
			const far = Math.abs(x - racer.body.x)
			// Crowded: the other team's in the way; their own, worse, it's
			// only their own team's water they'd be taking, and worse again
			// where a teammate's on their way.
			const near = racers.filter(
				(o) => o !== racer && Math.abs(o.body.x - x) < 24,
			)
			const mine = near.filter((o) => teamOf(o) === team).length
			const claimed = racers.filter((o) => {
				const plan = plans.get(o.id)
				return (
					o !== racer &&
					teamOf(o) === team &&
					!!plan &&
					!plan.home &&
					Math.abs(plan.to - x) < 24
				)
			}).length
			const score =
				(JET_RATE[jet.kind] * jet.strength * 1000) / (1 + far / 220) -
				(near.length - mine) * 0.5 -
				mine * 1.4 -
				claimed * 1.2 +
				Math.random() * 0.3
			if (!best || score > best.score) best = { x, score }
		}
		return best?.x
	}

	/**
	 * Whether `racer`'s bot's taking what's in their jug to their team's
	 * tank: full enough, for how good they are; or near the end, with any to
	 * speak of; or enough in it to win; or being sucked out, till it's empty.
	 */
	function goingHome(racer: Racer) {
		const jug = jugOf(racer)
		const team = teamOf(racer)
		if (show.sucking.has(racer.id)) return jug.fill > 0.01
		return (
			jug.fill >= 0.3 + skillOf(racer) * 0.3 ||
			(ticksLeft() < 360 && jug.fill > 0.12) ||
			(jug.fill > 0.05 && show.tanks[team] + jug.fill >= show.target)
		)
	}

	function bot(racer: Racer): Controls {
		if (over()) return IDLE
		const b = racer.body
		const now = world.ticks()
		const skill = skillOf(racer)
		const jug = jugOf(racer)
		const was = plans.get(racer.id)
		let plan = was
		const fresh = (to: number, home: boolean): Plan => ({
			to,
			home,
			until: home
				? Number.POSITIVE_INFINITY
				: now + 12 + Math.round((1 - skill) * 40 + Math.random() * 20),
			closest: Number.POSITIVE_INFINITY,
			since: now,
			filled: jug.fill,
			jumpTill: 0,
		})
		if (goingHome(racer)) {
			// Under their team's sucker, their jug's mouth under its middle.
			const mouth = mouthOf(racer)
			const to = hoodX(teamOf(racer)) + (b.x - mouth.x)
			if (plan?.home) plan.to = to
			else plan = fresh(to, true)
		} else if (!plan || plan.home || now >= plan.until) {
			plan = fresh(bestSpot(racer) ?? b.x, false)
			// The same spot as before: still waiting on it, not started over.
			if (was && !was.home && Math.abs(was.to - plan.to) < 24) {
				plan.closest = was.closest
				plan.since = was.since
				plan.filled = was.filled
			}
		}
		plans.set(racer.id, plan)
		const dx = plan.to - b.x
		// Getting nowhere a while: no nearer, and their jug no fuller. Going
		// home, someone's in the way: over them. After water, it's no good
		// there: off somewhere else for a bit, out of the way.
		if (Math.abs(dx) < plan.closest - 3 || jug.fill > plan.filled + 0.02) {
			plan.closest = Math.min(plan.closest, Math.abs(dx))
			plan.filled = Math.max(plan.filled, jug.fill)
			plan.since = now
		} else if (now - plan.since > STUCK_TICKS) {
			plan.since = now
			if (plan.home) {
				// Waiting their turn under it, they wait.
				if (Math.abs(dx) >= 4) plan.jumpTill = now + JUMP_OVER_TICKS
			} else {
				avoiding.set(racer.id, { x: plan.to, until: now + AVOID_TICKS })
				plan.until = now
			}
		}
		if (now < plan.jumpTill) {
			const way = Math.sign(dx)
			return { left: way < 0, right: way > 0, up: true, down: false }
		}
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
		ticksLeft,
		// On the leaderboard: what each's poured in, most first, their name
		// in their team's colour.
		chip: pouredSaid,
		score: (racer) => poured.get(racer.id) ?? 0,
		nameColour: (racer) => TEAM_TEXT[teamOf(racer)],
		// Only the other team's heads to bounce on, and their jugs to spill:
		// jumping onto a teammate, they go past.
		bounces: (racer, other) => teamOf(racer) !== teamOf(other),
		note: (racer) => {
			const mine = `poured ${pouredSaid(racer)}`
			if (winner === undefined) return `${TEAM_NAMES[teamOf(racer)]} · ${mine}`
			if (winner < 0) return `Drew ${tanksSaid(racer)} · ${mine}`
			return `${won(racer) ? 'Won' : 'Lost'} ${tanksSaid(racer)} · ${mine}`
		},
		timeNote: (racer) =>
			winner === undefined
				? undefined
				: winner < 0
					? `Drew ${tanksSaid(racer)}`
					: `${won(racer) ? 'Won' : 'Lost'} ${tanksSaid(racer)}`,
		placeOf: (racer) => {
			if (winner === undefined || winner < 0) return 1
			const order = world.order() ?? []
			const winners = order.filter((r) => won(r)).length
			return won(racer) ? 1 : winners + 1
		},
		done: won,
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
				b.celebrating = won(racer)
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
			// Decided: the jugs left as they are, the suckers' hoses coming back up.
			if (over()) {
				for (const team of [0, 1]) stepDock(team)
				return
			}
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
				jug.fill = Math.min(1, jug.fill + JET_RATE[jet.kind] * jet.strength)
				// Full: said, once, till it's been emptied.
				if (jug.fill >= 1 && !jug.fullSaid) {
					jug.fullSaid = true
					world.popup('Full!', racer.body.x, headTop(racer) - JUG_TALL - 20)
					play('cheer')
				}
			}
			show.flood = Math.min(FLOOD_MOST, show.flood + rise)
			// Into the tanks, from under the suckers.
			for (const team of [0, 1]) stepDock(team)
			// A tank filled to its line: that team's won; both at once, or at
			// the end, the fuller.
			const [red, blue] = show.tanks
			const fuller = Math.abs(red - blue) < 0.001 ? -1 : red > blue ? 0 : 1
			const redFull = red >= show.target
			const blueFull = blue >= show.target
			if (redFull !== blueFull) decide(redFull ? 0 : 1)
			else if (redFull || now >= JUG_TICKS) decide(fuller)
		},
		frame(): MinigameFrame {
			return {
				jugs: racers.map((r) => {
					const jug = jugOf(r)
					return [
						Math.round(jug.fill * 1000),
						Math.round(jug.tilt * 1000),
						show.sucking.has(r.id) ? 1 : 0,
						Math.round((poured.get(r.id) ?? 0) * 1000),
					]
				}),
				tanks: [
					Math.round(show.tanks[0] * 1000),
					Math.round(show.tanks[1] * 1000),
				],
				teams: racers.map(teamOf),
				winner: winner ?? -2,
				docks: show.docks.map((d) => [
					d.id === undefined ? -1 : racers.findIndex((r) => r.id === d.id),
					Math.round(d.reach * 100),
					d.letGo ? 1 : 0,
				]),
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
				poured.set(racer.id, (from[3] ?? 0) / 1000)
				if (from[2] === 1) show.sucking.add(racer.id)
				else show.sucking.delete(racer.id)
				racer.body.hat = undefined
			})
			// The Host's teams; the tanks, filling.
			a.teams?.forEach((team, i) => {
				const racer = racers[i]
				if (racer) teams.set(racer.id, team)
			})
			if (a.tanks) {
				const to = b?.tanks ?? a.tanks
				show.tanks = [
					(a.tanks[0] + (to[0] - a.tanks[0]) * share) / 1000,
					(a.tanks[1] + (to[1] - a.tanks[1]) * share) / 1000,
				]
			}
			winner = a.winner === undefined || a.winner < -1 ? undefined : a.winner
			// The suckers' hoses, coming down and going up.
			a.docks?.forEach(([i, reach, letGo], team) => {
				const to = b?.docks?.[team]
				const dock = show.docks[team]
				if (!dock) return
				dock.id = i < 0 ? undefined : racers[i]?.id
				dock.reach =
					(reach + ((to && to[0] === i ? to[1] : reach) - reach) * share) / 100
				dock.letGo = letGo === 1
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
			for (const racer of racers) racer.body.celebrating = won(racer)
		},
	}
	return run
}
