import { DINO, dinoIsland } from '../courses/dinoIsland'
import { TICK_MS } from '../game/constants'
import { platformAt } from '../game/platforms'
import { type Racer, type World, startingBody } from '../game/world'
import { CLUB } from '../runners/playable'
import { play } from '../sfx'
import { courseArena, inRandomOrder } from './arena'
import { clock } from './clock'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Jump Rope: on the rope bridge over Dino Island's crater, the lava
 * churning far below. Two club members nobody's playing as stand up on
 * stands on the rims either end, turning a long rope, and everyone else is
 * in the middle, jumping it. It just brushes the bridge at the bottom of
 * each turn: not over it as it comes round under you, and you're tripped,
 * down on your bottom, out. Each turn's quicker than the last. The last one
 * still jumping wins; or after a minute, whoever still is.
 */

/** How long it goes on, at most: a minute. */
export const ROPE_TICKS = Math.round(60_000 / TICK_MS)
/** How long the rope takes to go round, to begin with, and at its quickest. */
const TURN_FIRST = 100
const TURN_QUICKEST = 16
/**
 * How much quicker each turn is than the last: enough to feel it, turn by
 * turn, on down to quicker than anyone can keep up with, so it always ends.
 */
const TURN_SPEEDUP = 0.975
/**
 * Getting going, from "Go!": the rope starts still, lying slack along the
 * bridge, and they wind it up to speed over this long, round the top and
 * down into the first jump, a turn later.
 */
const WIND_UP = 100
/** How much slacker than taut the rope is, lying there, at its middle: less as it's swung up to the top. */
const SLACK = 14
/**
 * How often the worst bot misjudges a jump, to begin with, and how much
 * more often the quicker the rope's going (as its pace to this power).
 */
const BOT_BLUNDERS = 0.05
const BOT_FLUSTERED = 1.5
/** How far over the rope someone's feet have to be, as it comes under them, to clear it. */
const CLEARANCE = 6
/** How high the holders' hands are, over their feet. */
const HANDS_UP = 30
/** How far in from them their hands are. */
const HANDS_IN = 10
/** How high their stands are, the lower of the two: the other's taller, level with it. */
const STAND_HEIGHT = 44

const { CRATER } = DINO
/** Where the holders stand: on the rims, either end of the bridge. */
const HOLDERS_AT = [CRATER.from - 34, CRATER.to + 26] as const
/** The bridge's deck, level with the rims: the floor everyone's jumping on. */
const FLOOR = dinoIsland.terrain.groundY(CRATER.from - 1)
/** The tops of their stands, level, and so their hands. */
const STAND_TOP =
	Math.min(...HOLDERS_AT.map((x) => dinoIsland.terrain.groundY(x))) -
	STAND_HEIGHT
const HANDS_Y = STAND_TOP - HANDS_UP
/**
 * How far the rope swings out from between their hands, at its middle:
 * just down to the bridge, brushing it at the bottom of each turn, not
 * lying along it.
 */
export const ROPE_SWING = FLOOR - HANDS_Y + 2
/** The rope's middle, and how far it is to either end, between their hands. */
const ROPE_MIDDLE = (HOLDERS_AT[0] + HOLDERS_AT[1]) / 2
const ROPE_HALF = (HOLDERS_AT[1] - HOLDERS_AT[0]) / 2 - HANDS_IN
/**
 * How far out along the rope anyone can go, as a share of the way to its
 * end: in where it still swings down low, under knee height.
 */
const REACH = 0.6

const place = courseArena(
	dinoIsland,
	'jump-rope',
	'Jump Rope',
	'Jump the rope as it comes round. Last one jumping wins!',
	{
		middle: ROPE_MIDDLE,
		walls: {
			left: ROPE_MIDDLE - ROPE_HALF * REACH,
			right: ROPE_MIDDLE + ROPE_HALF * REACH,
		},
		// Up the screen, so the lava in the crater shows under the bridge.
		floorOnScreen: 400,
	},
)

/**
 * Its bridge kept rigid, not giving under whoever's on it: everyone jumping
 * at once, coming down hard as it springs back up, would go through it.
 */
const course = {
	...place.course,
	platforms: place.course.platforms?.map(({ rope, ...platform }) => platform),
}

export const jumpRope: Minigame = {
	id: 'jump-rope',
	name: 'Jump Rope',
	tagline: 'Don’t trip on the rope',
	blurb:
		'Jump the rope as it comes round under you. It gets faster! Last one jumping wins!',
	tune: 'dino-island:volcano',
	collectables: [],
	course,
	arena: place.arena,
	start: startJumpRope,
}

/**
 * How far down from between the holders' hands the rope is at `x`, at
 * angle `turn`: all of its swing at the middle, none at their hands,
 * downwards at the bottom of its turn (`turn` 0), up over the top at half.
 * Slack to begin with, lying along the bridge, till it's swung up taut.
 */
export function ropeDrop(x: number, turn: number) {
	const u = (x - ROPE_MIDDLE) / ROPE_HALF
	const slack = SLACK * Math.max(0, 1 - turn / Math.PI)
	return (ROPE_SWING * Math.cos(turn) + slack) * Math.max(0, 1 - u * u)
}

/**
 * Two club members to hold the rope: nobody anyone's playing as, picked by
 * who's playing, so every screen picks the same two.
 */
function pickHolders(racers: Racer[]) {
	const playing = new Set(racers.map((r) => r.runner.id))
	const free = CLUB.filter((m) => !playing.has(m.id))
	const seed = racers
		.map((r) => r.id)
		.join('')
		.split('')
		.reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7)
	const first = free[seed % free.length]
	const second = free.filter((m) => m !== first)[(seed * 7) % (free.length - 1)]
	return [first, second]
}

/** What's to be drawn of a game of Jump Rope: its holders, its rope and its hands. */
export interface RopeShow {
	holders: Racer[]
	/** What they're stood on: each stand's middle, top and the ground under it. */
	stands: { x: number; top: number; ground: number }[]
	/** The bridge's deck, which the rope comes down to. */
	floor: number
	/** How far round the rope is: 0 at the bottom of each turn, on up and round from there. */
	turn: number
	hands: { left: number; right: number; y: number }
}
const shows = new WeakMap<World, RopeShow>()

/** `world`'s game of Jump Rope, for drawing, if it's one. */
export const ropeOf = (world: World) => shows.get(world)

function startJumpRope(world: World): MinigameRun {
	const { racers, terrain } = world
	const { walls } = place.arena
	// The holders, either end, facing in, stood still: not racers, just there.
	const holders = pickHolders(racers).map((runner, i): Racer => {
		const x = HOLDERS_AT[i]
		const body = startingBody(terrain, x)
		// Up on their stands.
		body.feetY = STAND_TOP
		body.floor = STAND_TOP
		body.facing = i === 0 ? 1 : -1
		return {
			id: `holder-${i}`,
			runner,
			body,
			controls: () => ({ left: false, right: false, up: false, down: false }),
			outAt: 0,
		}
	})
	const show: RopeShow = {
		holders,
		stands: HOLDERS_AT.map((x) => ({
			x,
			top: STAND_TOP,
			ground: terrain.groundY(x),
		})),
		floor: FLOOR,
		// Lying slack along the bridge to begin with, to be wound up on "Go!".
		turn: 0,
		hands: {
			left: HOLDERS_AT[0] + HANDS_IN,
			right: HOLDERS_AT[1] - HANDS_IN,
			y: HANDS_Y,
		},
	}
	shows.set(world, show)

	// Everyone on the bridge, spread out between the walls.
	// Spread out along it, in no particular order.
	inRandomOrder(racers).forEach((racer, i) => {
		const b = racer.body
		b.trippedAt = undefined
		const x =
			walls.left +
			20 +
			((walls.right - walls.left - 40) * (i + 0.5)) / racers.length
		b.x = Math.round(x)
		// Stood on the bridge, not hanging over the crater above it till "Go!".
		const bridge = world.platforms.findIndex(
			(p) => b.x >= p.x && b.x <= p.x + p.width,
		)
		b.feetY =
			bridge >= 0
				? platformAt(terrain, world.platforms[bridge], 0).top
				: terrain.groundY(b.x)
		b.on = bridge >= 0 ? bridge : undefined
		b.grounded = true
		b.floor = b.feetY
		b.facing = x < ROPE_MIDDLE ? 1 : -1
	})

	/** How many times each's jumped it, by id. */
	const jumps = new Map<string, number>()
	const jumped = (racer: Racer) => jumps.get(racer.id) ?? 0
	const ticksLeft = () => Math.max(0, ROPE_TICKS - world.raceTicks())
	const tripped = (racer: Racer) =>
		racer.body.trippedAt !== undefined || !!racer.out
	const jumping = () => racers.filter((r) => !tripped(r))
	const solo = racers.length === 1
	/** How long a turn takes now: quicker every time it comes round. */
	let turnTicks = TURN_FIRST

	function trip(racer: Racer) {
		const b = racer.body
		b.trippedAt = world.raceTicks()
		b.vx = 0
		world.popup(
			solo ? `Lasted ${clock(b.trippedAt, 'down')}` : 'Tripped!',
			b.x,
			b.feetY - 90,
		)
		play('stumble')
	}

	/** Over: one left jumping (or none, on your own), or time's up. */
	function decide() {
		if (world.order()) return
		const left = jumping().length
		const over =
			ticksLeft() <= 0 || left === 0 || (racers.length > 1 && left <= 1)
		if (!over) return
		// Still jumping first, then whoever lasted longest, then the most jumps.
		const order = [...racers].sort(
			(a, b) =>
				(b.body.trippedAt ?? Number.POSITIVE_INFINITY) -
					(a.body.trippedAt ?? Number.POSITIVE_INFINITY) ||
				jumped(b) - jumped(a),
		)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const winner = order[0]
		world.popup(
			solo
				? tripped(winner)
					? `${jumped(winner)} jumps!`
					: 'Jumped the minute!'
				: `${winner.runner.name} wins!`,
			winner.body.x,
			winner.body.feetY - 120,
		)
		play('finished')
	}

	const done = (racer: Racer) => !!world.order() && !tripped(racer)
	/** How early each bot jumps this turn, before the rope comes round under them: never, a blunder. */
	const leads = new Map<string, { turn: number; by: number }>()
	/** How good each bot is, this game, 0 to 1: some hopeless, some hard to beat. */
	const skills = new Map<string, number>()
	const skillOf = (racer: Racer) => {
		let skill = skills.get(racer.id)
		if (skill === undefined) {
			skill = Math.random()
			skills.set(racer.id, skill)
		}
		return skill
	}

	return {
		id: 'jump-rope',
		ticksLeft,
		chip: (racer) => (tripped(racer) ? 'Out' : `${jumped(racer)}`),
		// Still jumping; then most jumps.
		score: (racer) => (tripped(racer) ? 0 : 1e6) + jumped(racer),
		timeNote: (racer) => {
			const at = racer.body.trippedAt
			const n = `${jumped(racer)} jumps`
			return at === undefined ? n : `Lasted ${clock(at, 'down')} · ${n}`
		},
		// A bot: jumping as the rope comes round, each turn a little early
		// or late, by a different amount; quick enough, it misses. And occasionally
		// it misjudges one altogether, and doesn't jump: the worse
		// it is, the more often, and more often the quicker it's going.
		bot: (racer) => {
			if (tripped(racer)) return IDLE
			const turn = Math.floor(show.turn / (Math.PI * 2))
			let lead = leads.get(racer.id)
			if (!lead || lead.turn !== turn) {
				const pace = TURN_FIRST / turnTicks
				const blunders =
					(1 - skillOf(racer)) * BOT_BLUNDERS * pace ** BOT_FLUSTERED
				lead = {
					turn,
					by:
						Math.random() < blunders
							? Number.NEGATIVE_INFINITY
							: 0.7 + Math.random() * 0.9,
				}
				leads.set(racer.id, lead)
			}
			const round = show.turn - turn * Math.PI * 2
			return { ...IDLE, up: round > Math.PI * 2 - lead.by }
		},
		note: (racer) => {
			const n = jumped(racer)
			const at = racer.body.trippedAt
			if (solo)
				return at === undefined
					? `Jumped the minute! · ${n} jumps`
					: `Lasted ${clock(at, 'down')} · ${n} jumps`
			if (world.order()?.[0] === racer) return `Last jumping · ${n} jumps`
			return at !== undefined ? `Tripped · ${n} jumps` : `Still jumping · ${n}`
		},
		done,
		out: tripped,
		step() {
			if (world.phase() !== 'running') return
			// Nobody off the bridge; anyone tripped, sat where they fell.
			for (const racer of racers) {
				const b = racer.body
				// Out some other way, off the bridge: as good as tripped.
				if (racer.out && b.trippedAt === undefined)
					b.trippedAt = world.raceTicks()
				if (b.trippedAt !== undefined) {
					b.held = 2
					b.vx = 0
					b.ducking = true
					continue
				}
				if (b.x < walls.left) {
					b.x = walls.left
					b.vx = Math.max(0, b.vx)
				} else if (b.x > walls.right) {
					b.x = walls.right
					b.vx = Math.min(0, b.vx)
				}
				b.celebrating = done(racer)
			}

			// Round it goes, quicker and quicker.
			const was = show.turn
			// Wound up from still, to begin with.
			const windUp = Math.min(1, (world.raceTicks() + 1) / WIND_UP)
			show.turn += ((Math.PI * 2) / turnTicks) * windUp
			const turns = Math.floor(show.turn / (Math.PI * 2))
			if (turns > Math.floor(was / (Math.PI * 2)) && !world.order()) {
				// Under everyone: anyone whose feet aren't up over it, where they
				// are, is tripped; anyone's that are has jumped it. Lowest in the
				// middle, so out towards the ends it takes less of a jump.
				play('whoosh')
				turnTicks = Math.max(TURN_QUICKEST, turnTicks * TURN_SPEEDUP)
				for (const racer of jumping()) {
					// At the bottom, a turn on: taut.
					const under = HANDS_Y + ropeDrop(racer.body.x, Math.PI * 2)
					if (racer.body.feetY > under - CLEARANCE) trip(racer)
					else jumps.set(racer.id, jumped(racer) + 1)
				}
			}
			decide()
		},
		frame(): MinigameFrame {
			return {
				rope: Math.round(show.turn * 1000) / 1000,
				tripped: racers.map((r) => r.body.trippedAt ?? -1),
				jumps: racers.map(jumped),
			}
		},
		apply(a, b, share) {
			const from = a.rope ?? show.turn
			const to = b?.rope ?? from
			show.turn = from + (to - from) * share
			racers.forEach((racer, i) => {
				const at = a.tripped?.[i] ?? -1
				racer.body.trippedAt = at < 0 ? undefined : at
				jumps.set(racer.id, a.jumps?.[i] ?? 0)
				racer.body.celebrating = done(racer)
			})
		},
	}
}
