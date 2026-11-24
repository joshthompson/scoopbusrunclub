import type { Course } from '../courses/types'
import type { Collectable } from '../game/collectables'
import type { Racer, World } from '../game/world'
import type { Controls } from '../input'
import type { Arena } from './arena'

/**
 * Minigames: Multi Player Rounds that aren't races. Everyone on one screen,
 * running and jumping as on any course, on each other's heads too, but at
 * something else: catching fruit on a sword, so far. A Room plays them
 * instead of its courses, or mixed in with them (see `RoundKind`).
 */

export type MinigameId =
	| 'fruit-kebab'
	| 'potato-rain'
	| 'jump-rope'
	| 'pogo-sticks'
	| 'iceberg-bump'
	| 'beach-volleyball'
	| 'red-light-green-light'
	| 'memory-dunk'
	| 'paintbrush'
	| 'hungry-goose'
	| 'bomb-hat'
	| 'lollapascoopza'
	| 'mr-claws'
	| 'fika-defence'
	| 'skate-jam'
	| 'jughead'

export interface Minigame {
	id: MinigameId
	name: string
	/** What it's about, a line, where it's picked and on its start screen. */
	blurb: string
	/** The most Players it's for: any more, and it's left out. Any, if not said. */
	maxPlayers?: number
	/**
	 * Whether there's a leaderboard up in the top right corner, everyone
	 * ranked by their `score`, best first, with their chip, as the Podium's
	 * Standings are: not if the game says it all already (a scoreboard) or
	 * has something of its own there. Shown, if not said.
	 */
	pills?: boolean
	/** One of the courses' tunes, to play it to. */
	tune: string
	/** What's to be had playing it, for the Collectables screen to say so. */
	collectables: Collectable[]
	/** Where it's played: an arena, kept still on the screen (see `arenaCourse`, `courseArena`). */
	course: Course
	/** Where on `course` the screen's kept: a plain arena's, if not said (see `PLAIN_ARENA`). */
	arena?: Arena
	/** It, under way in `world`: its own goings-on on top of everyone running about. */
	start(world: World): MinigameRun
}

/**
 * A minigame being played. The world's physics moves everyone; this does the
 * rest, a tick at a time, after them, and decides the Round, setting its
 * order (`world.setOrder`) when it's over.
 */
export interface MinigameRun {
	id: MinigameId
	/** A tick of it, after everyone's moved. On the Host only. */
	step(): void
	/**
	 * How much higher than usual `racer`'s name tag goes, in px: over
	 * whatever the game's put on their head (Bomb Hat's bomb). None, if not said.
	 */
	tagRise?(racer: Racer): number
	/**
	 * What `racer` holding `held` comes to, for running about: Mr Claws'
	 * up is a Pinch, not a jump, so the engine's told it's not held. As
	 * held, if not said. On the Host only.
	 */
	controls?(racer: Racer, held: Controls): Controls
	/** Ticks left on its clock, which starts on "Go!", by the race's ticks. */
	ticksLeft(): number
	/** How `racer`'s doing, in a word or two, on the HUD: "2/4", "Out". */
	chip(racer: Racer): string
	/** How `racer`'s doing, as a number, for ranking them on the leaderboard (see `Minigame['pills']`): more is better. In the order they're in, if not said. */
	score?(racer: Racer): number
	/** What `racer` did, in a few words, for the Results: "3 fruit". */
	note(racer: Racer): string
	/** Whether `racer`'s done all there is to do: they dance, stood still. */
	done(racer: Racer): boolean
	/** Whether `racer`'s out of it, still to see it through: buried, in Potato Rain. */
	out(racer: Racer): boolean
	/**
	 * Something big to say across the screen just now, if anything: "Penguins!".
	 * Worked out from what every screen has, the race's ticks, so phones say it too.
	 */
	announce?(): string | undefined
	/**
	 * A bot's controls, playing it as `racer`: not that good, but trying.
	 * For Single Player, where you play against them. On the Host only.
	 */
	bot(racer: Racer): Controls
	/** How long `racer` took, or lasted, if that's said: "Lasted 0:37", for the Single Player result. */
	timeNote(racer: Racer): string | undefined
	/**
	 * Where `racer` came, 1 the first, in a game where places are shared: a
	 * team game's, everyone on the winning team first. Their place in the
	 * order, if not said.
	 */
	placeOf?(racer: Racer): number
	/** Its state, for Remote Players' screens, and put back from it there. */
	frame(): MinigameFrame
	apply(a: MinigameFrame, b: MinigameFrame | undefined, share: number): void
}

/** What's sent of a minigame to Remote Players, a frame at a time. */
export interface MinigameFrame {
	/**
	 * Fruit Kebab's fruit in the air: [id, kind (its place in
	 * `FRUIT_KINDS`), x, y, spin, splatted at (-1 not)].
	 */
	fruit?: [number, number, number, number, number, number][]
	/** Each racer's skewered fruit, in order, by kind, and when each finished (-1 not). */
	skewers?: number[][]
	doneAt?: number[]
	/** When each cannon, left and right, last fired. */
	fired?: [number, number]
	/** Potato Rain's potatoes: [id, x, shown at, lands at, landed at (-1 not)]. */
	potatoes?: [number, number, number, number, number][]
	/** When each racer was buried, by the race's ticks (-1 not). */
	buried?: number[]
	/** Potato Rain's tulips: [id, x, planted at, colour]. */
	tulips?: [number, number, number, number][]
	/** How many tulips each racer's picked. */
	picked?: number[]
	/** When Potato Rain's last one standing's bonus ends, by the race's ticks (-1 not begun). */
	bonusEnd?: number
	/** Jump Rope's rope, how far round it is; when each racer tripped (-1 not), and their jumps. */
	rope?: number
	tripped?: number[]
	jumps?: number[]
	/** Pogo Sticks: each racer's [x, y, lean, squash, fell at (-1 not), fell to]. */
	pogos?: [number, number, number, number, number, number][]
	/** Iceberg Bump: the iceberg's [tilt, bob], and when each racer went in the sea (-1 not). */
	berg?: [number, number]
	inSea?: number[]
	/** Its penguins: [id, x, y, vx, vy, stage (0 leaping, 1 sliding, 2 diving), emperor (1)]; and splashes, [x, at]. */
	penguins?: [number, number, number, number, number, number, number?][]
	splashes?: [number, number][]
	/**
	 * Beach Volleyball's ball, [x, y, radius, spin]; each team's points; each
	 * racer's team; when the point began; and who scored it, and when ([-1, -1]
	 * not yet).
	 */
	ball?: [number, number, number, number]
	points?: [number, number]
	teams?: number[]
	pointAt?: number
	scored?: [number, number]
	// Red Light, Green Light's fields, below this line.
	/** Red Light, Green Light's balls: [who it's after (their place in the racers), when it was fired (the race's ticks)]. */
	spots?: [number, number][]
	// Memory Dunk's fields, below this line.
	/** Memory Dunk: the sequence's seed; the tick its timeline stopped at once decided (-1 not); and where each racer fell (round * 1000 + shape, -1 not). */
	dunkSeed?: number
	dunkEnd?: number
	dunkFell?: number[]
	// Paintbrush's fields, below this line.
	/**
	 * Paintbrush: the tick this frame was made, and its brush strokes from
	 * `strokesFrom` on, [tick, racer (their place in the racers), x0, y0, x1,
	 * y1 (px across and down the wall), big (1)], in the order they were
	 * painted; and occasionally the whole wall, [tick, its cells run-length
	 * coded], for a screen that's missed some.
	 */
	paintAt?: number
	strokesFrom?: number
	strokes?: [number, number, number, number, number, number, number][]
	wall?: [number, string]
	/** Its paint cans, [id, x, y, since]; till when each racer has a big brush; each rotten plank's [stood on since, gone at] (-1 not); and bursts of paint off heads, [whose, x, y, at]. */
	paintCans?: [number, number, number, number][]
	bigUntil?: number[]
	planks?: [number, number][]
	splats?: [number, number, number, number][]
	// Hungry Hungry Goose's fields, below this line.
	/**
	 * Its eggs, in the nests too: [id, x, y, spin, carried by (their place
	 * in the racers, -1 not), golden (1)]; each nest's eggs, worth and all;
	 * when the goose last laid, and which way she faced; and who won (a
	 * team, -1 a draw, -2 not yet).
	 */
	eggs?: [number, number, number, number, number, number][]
	nests?: [number, number]
	laidAt?: [number, number]
	winner?: number
	/** Who's stealing from the other team's nest: [their place in the racers, since when]. */
	stealing?: [number, number][]
	// Bomb Hat's fields, below this line.
	/**
	 * Bomb Hat's bomb: [on whose head (their place in the racers, -1 none),
	 * lit at, which creature, passed from (-1 nobody), passed at, how many
	 * lit, the next lit at (-1 not due)], by the race's ticks; when each
	 * racer was blown up (-1 not), and how many times they've passed it on;
	 * and its blasts, [x, y, at, creature].
	 */
	bomb?: [number, number, number, number, number, number, number]
	blown?: number[]
	tags?: number[]
	blasts?: [number, number, number, number][]
	// Lollapascoopza's fields, below this line.
	/**
	 * Lollapascoopza: each racer's [track and podium x, Rock Meter (out of
	 * 1000), points, notes hit, notes there were, combo, booed off at (-1
	 * not), last grade, graded at, last arrow pressed, pressed at], by the
	 * race's ticks; the steps of the notes each has played lately; which
	 * song it is (its place in `SONGS`); and when it was decided (-1 not yet).
	 */
	rock?: number[][]
	rockHits?: number[][]
	rockSong?: number
	rockEnd?: number
	// Mr Claws' fields, below this line.
	/**
	 * Mr Claws: each racer's [Pinch begun at (-1 not), who they're carrying
	 * (their place in the racers, -1 nobody), carrying since, Struggle
	 * (out of 100), in the Sea at (-1 not), how many they've sent in,
	 * safe till, Guard left (out of 100), Guard broken (1)], by the race's
	 * ticks; and Clashes, [x, y, at]; and
	 * splashes, [x, at].
	 */
	claws?: number[][]
	clashes?: [number, number, number][]
	clawSplashes?: [number, number][]
	// Fika Defence's fields, below this line.
	/** Fika Defence: each table's places, what's on each (its place in `SPREAD`, -1 nothing). */
	fikaTables?: [number[], number[]]
	/**
	 * Its raiders: [id, kind (its place in `RAIDER_KINDS`), x, y, stage (its
	 * place in `RAIDER_STAGES`), since (the world's ticks), facing, what it's
	 * carrying off (-1 nothing), how shoved a moose is].
	 */
	fikaRaiders?: [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	][]
	/** Fika dropped, or being carried: [id, what (its place in `SPREAD`), x, y, carried by (their place in the racers, -1 not)]. */
	fikaLoose?: [number, number, number, number, number][]
	// Skate Jam's fields, below this line.
	/**
	 * Skate Jam: each racer's [x, y, in the air (1), turned in the air,
	 * facing, board trick (its place in `SKATE_TRICKS`; -1 none), ticks
	 * into it, wipeout ticks left, grinding since (-1 not), points banked,
	 * combo's points, combo's times, last landed at, won and dancing (1),
	 * grabbing till, manual's balance
	 * (out of 100; -999 not in one), on its nose (1)], by the world's ticks.
	 */
	skaters?: number[][]
	// Jughead's fields, below this line.
	/** Jughead: each racer's jug, [how full (out of 1000), its surface's tilt (out of 1000), filled at (-1 not)]. */
	jugs?: [number, number, number][]
	/** Its jets of water, [id, kind (its place in `JET_KINDS`), x, y, vx and vy (out of 100), from, until, strength (out of 100), what's said (its place in `MISHAPS`, -1 nothing)]. */
	jets?: [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	][]
	/** Jughead: how deep the floor's flooded, in px (out of 100). */
	flood?: number
}

/** Nothing held: what a bot holds with nothing to do. */
export const IDLE: Controls = {
	left: false,
	right: false,
	up: false,
	down: false,
}
