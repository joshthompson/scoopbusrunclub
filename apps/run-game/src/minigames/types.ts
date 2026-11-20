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

export interface Minigame {
	id: MinigameId
	name: string
	/** What it's about, a line, where it's picked and on its start screen. */
	blurb: string
	/** The most Players it's for: any more, and it's left out. Any, if not said. */
	maxPlayers?: number
	/**
	 * Whether each Player's chip's shown under the clock: not if the game
	 * says it all already (a scoreboard) or has something of its own
	 * there. Shown, if not said.
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
	/** Ticks left on its clock, which starts on "Go!", by the race's ticks. */
	ticksLeft(): number
	/** How `racer`'s doing, in a word or two, on the HUD: "2/4", "Out". */
	chip(racer: Racer): string
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
}

/** Nothing held: what a bot holds with nothing to do. */
export const IDLE: Controls = {
	left: false,
	right: false,
	up: false,
	down: false,
}
