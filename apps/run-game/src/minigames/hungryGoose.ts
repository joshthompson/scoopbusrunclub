import {
	FARM_GRASS,
	FARM_GRASS_SHADE,
	FARM_PATH,
	FARM_PATH_SHADE,
	FARM_SKY_BOTTOM,
	FARM_SKY_TOP,
	GOOSE_HEIGHT,
	GOOSE_REAR,
	GOOSE_WIDTH,
} from '../courses/kit/farmScenery'
import {
	GROUND_Y,
	HITBOX_HALF_WIDTH,
	RUNNER_SCALE,
	START_X,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import { TEAM_COLOURS, teamHat } from '../game/teams'
import type { Terrain } from '../game/terrain'
import { type Racer, type World, bodyHeight, startingBody } from '../game/world'
import type { Controls } from '../input'
import { CLUB } from '../runners/playable'
import { play } from '../sfx'
import { type Arena, arenaCourse, inRandomOrder } from './arena'
import { TEAM_NAMES } from './beachVolleyball'
import { collectTeamHats, isBot } from './teams'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Hungry Hungry Goose: a wide, lumpy field on a farm, seen zoomed out, a
 * giant goose stood on a mound in the middle of it, laying eggs, one after
 * another. Two teams, Red and Blue, a nest each, at either end of the
 * field.
 *
 * The eggs are things in the world: each pops out behind the goose, bounces
 * and rolls off down the lumps, knocks into the others, and piles up with
 * them. Run into one with your hands free to pick it up; carry it home and
 * it's dropped in your nest, to lie there with the rest. What's lying in a
 * nest is that team's: so run into the other team's nest and you can take
 * one of theirs, and run through it carrying one and you'll knock theirs
 * about, maybe out. Your own nest's eggs you leave be. Carrying one slows
 * you; come down on the head of someone carrying one, and they drop it. Occasionally
 * an egg's golden, worth three.
 *
 * She lays quicker and quicker, and the last 10 seconds are an egg frenzy.
 * After a minute, the team with the most in their nest wins; level, the
 * first to be ahead again.
 */

/** How long it goes on: a minute; then, level, how long more for one to get ahead, before it's a draw. */
export const GOOSE_TICKS = Math.round(60_000 / TICK_MS)
const EXTRA_TICKS = Math.round(20_000 / TICK_MS)
/** The last 10 seconds: an egg frenzy. */
const FRENZY_TICKS = Math.round(10_000 / TICK_MS)
/** How long between eggs, to begin with, by the end, and in the frenzy. */
const LAY_FIRST = 70
const LAY_LAST = 30
const LAY_FRENZY = 14
/** How many eggs there can be about the field, not in a nest, at once: she waits, past that. */
const LOOSE_MOST = 24
/** How often an egg's golden, and what a golden one's worth. */
const GOLDEN = 1 / 8
export const GOLDEN_WORTH = 3
/** How long the goose flaps, laying, after each egg. */
export const LAY_FLAP = 24
/** How long "Egg frenzy!" and "Next lead wins!" are up, big. */
const ANNOUNCED_FOR = 100

/** The teams' colours, for their nests' boards, Red's and Blue's as their hats (see `game/teams`). */
export const NEST_COLOURS = TEAM_COLOURS
/** The bot added to a team that's a Player short: its id, so every screen finds it. */
const TEAM_BOT = 'goose-bot'

// --- The field ---------------------------------------------------------------
/** How far zoomed out it's seen: twice as wide. */
const ZOOM = 2
export const SEEN_WIDTH = VIEW_WIDTH * ZOOM
/** The screen's left edge and its top, along and up the world: the goose in its middle, the field at its bottom. */
export const FIELD_LEFT = START_X - SEEN_WIDTH / 2
export const FIELD_TOP = VIEW_HEIGHT * (1 - ZOOM)
/** Where the goose stands: on the mound in the middle. */
export const GOOSE_X = START_X
const ARENA: Arena = {
	left: FIELD_LEFT,
	cameraY: 0,
	walls: { left: FIELD_LEFT + 100, right: FIELD_LEFT + SEEN_WIDTH - 100 },
	zoom: ZOOM,
}
const { left: LEFT, right: RIGHT } = ARENA.walls
/** The nests, either end: how wide, from the wall in, and how high their rims are. */
export const NEST_WIDTH = 240
export const RIM = 52
export const nestSpan = (team: number) =>
	team === 0
		? { from: LEFT, to: LEFT + NEST_WIDTH }
		: { from: RIGHT - NEST_WIDTH, to: RIGHT }
/** The lumps: [how far from the middle, how far either side of that they go, how high]. The first's the goose's mound. */
const LUMPS: [number, number, number][] = [
	[0, 230, 70],
	[-340, 90, 26],
	[340, 90, 26],
	[-540, 80, 20],
	[540, 80, 20],
]
const lumpAt = (x: number) =>
	LUMPS.reduce((h, [at, half, high]) => {
		const d = Math.abs(x - GOOSE_X - at) / half
		return d >= 1 ? h : h + high * Math.cos((d * Math.PI) / 2) ** 2
	}, 0)
export const groundY = (x: number) => GROUND_Y - lumpAt(x)
const slopeAt = (x: number) => (groundY(x + 2) - groundY(x - 2)) / 4

/** The field, as the engine sees it: lumpy, and no further than it need be. */
const terrain: Terrain = {
	length: 2000,
	finishX: START_X + 2000,
	groundY,
	slope: slopeAt,
	gaps: [],
	inGap: () => false,
	walls: [],
}
/** Where the goose's feet are: the top of her mound. */
export const GOOSE_STANDS = groundY(GOOSE_X)

// --- Eggs ----------------------------------------------------------------------
/** How big an egg is, as the physics has it: round, this far across from its middle. */
export const EGG_R = 7
/** How eggs fall, bounce off the ground, and roll (what they keep of their speed along it, a tick). */
const FALL = 0.4
const GROUND_BOUNCE = 0.3
const ROLL_KEEP = 0.988
/** How much eggs bounce off each other, and how many times a tick they're pushed apart, piled up. */
const EGG_BOUNCE = 0.2
const SETTLES = 4
/** How hard someone running into an egg knocks it, for how fast they're going, and up. */
const KNOCK = 1.1
const KNOCK_UP = 0.35
/** How fast anyone carrying an egg can go; and one stolen, slower still. */
const CARRY_SPEED = 5.2
const STOLEN_SPEED = 4.4
/**
 * How long it takes to get an egg out of the other team's nest: stood at
 * it, hands free, rummaging in the straw, open to a bounce on the head.
 */
export const STEAL_TICKS = 40
/** How far over a carrier's head an egg's held. */
export const HELD_OVER = 10
/** How far up from the ground an egg can be and still be in a nest: piled up in it. */
const NEST_DEEP = 90

/** An egg: where it is, how fast it's going and how far it's turned; whose it is, if anyone's carrying it; golden or not. */
export interface Egg {
	id: number
	x: number
	y: number
	vx: number
	vy: number
	spin: number
	golden: boolean
	/** Who's carrying it, by their place in the racers. */
	carrier?: number
	/** Which team it was last carried home by: carried home again, it's not counted to whoever did. On the Host only. */
	home?: number
}

/** What's to be drawn of a game of Hungry Hungry Goose. */
export interface GooseShow {
	eggs: Egg[]
	/** What each nest's got: its eggs, golden ones counted three. */
	nests: [number, number]
	/** When the goose last laid, by the world's ticks, and which way she was facing (1 right, -1 left). */
	laidAt: number
	facing: 1 | -1
	/** Who's stealing an egg out of the other team's nest, by their place in the racers, and since when, by the world's ticks. */
	stealing: Map<number, number>
}
const shows = new WeakMap<World, GooseShow>()
/** `world`'s game of Hungry Hungry Goose, for drawing, if it's one. */
export const gooseOf = (world: World) => shows.get(world)

/** Whose nest egg `egg`'s lying in, if it's in one: 0 or 1. */
export function nestOf(egg: Egg) {
	if (egg.carrier !== undefined) return undefined
	for (const team of [0, 1]) {
		const { from, to } = nestSpan(team)
		if (egg.x > from && egg.x < to && egg.y > groundY(egg.x) - NEST_DEEP)
			return team
	}
	return undefined
}

/** Where the egg `racer` carries is held: up over their head. */
export function heldAt(racer: Racer) {
	const b = racer.body
	const tall =
		racer.runner.sprite.height * RUNNER_SCALE * (b.ducking ? 0.55 : 1)
	return { x: b.x, y: b.feetY - tall - HELD_OVER }
}

export const hungryGoose: Minigame = {
	id: 'hungry-goose',
	name: 'Hungry Hungry Goose',
	tagline: 'Egg heist, team against team',
	blurb:
		'A giant goose is laying eggs! Carry them home to your team’s nest, or steal them from theirs. Bounce on a carrier to make them drop it. Golden eggs are worth 3. Most eggs in your nest after a minute wins!',
	tune: 'haga',
	// The nests' boards say it all.
	pills: false,
	collectables: ['hat:redTeamHat', 'hat:blueTeamHat'],
	course: {
		...arenaCourse(
			'hungry-goose',
			'Hungry Hungry Goose',
			'Carry the goose’s eggs home, and steal theirs. Most eggs wins!',
			// A field on a farm: a barn and its silo, a windmill, a fence, hay
			// bales (see `arenaSets`).
			{
				palette: {
					'--sky-blue-top': FARM_SKY_TOP,
					'--sky-blue-bottom': FARM_SKY_BOTTOM,
					'--grass-green': FARM_GRASS,
					'--grass-dark-green': FARM_GRASS_SHADE,
					'--grass-darker-green': FARM_GRASS_SHADE,
					'--dirt-brown': FARM_PATH,
					'--dirt-dark-brown': FARM_PATH_SHADE,
					'--dirt-darker-brown': FARM_PATH_SHADE,
				},
				far: [],
				near: [],
				horizonTrees: false,
			},
		),
		terrain,
	},
	arena: ARENA,
	start: startHungryGoose,
}

/** A club member not playing, for a team that's a Player short: the same on every screen. */
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

/** An egg, a tick, on its own: falling, bouncing off the ground and rolling down the lumps, off the walls and the nests' rims. */
function move(egg: Egg) {
	egg.vy += FALL
	egg.x += egg.vx
	egg.y += egg.vy
	// The ground: out of it, and its speed into it bounced back, some of it,
	// and along it, rolling, a little lost.
	const pen = egg.y + EGG_R - groundY(egg.x)
	if (pen > 0) {
		const s = slopeAt(egg.x)
		const len = Math.hypot(s, 1)
		const nx = s / len
		const ny = -1 / len
		egg.y -= pen
		const into = egg.vx * nx + egg.vy * ny
		if (into < 0) {
			egg.vx -= (1 + GROUND_BOUNCE) * into * nx
			egg.vy -= (1 + GROUND_BOUNCE) * into * ny
		}
		egg.vx *= ROLL_KEEP
		egg.spin += egg.vx / EGG_R
	}
	// The field's ends, and the nests' rims, low walls to roll into: over
	// them only bouncing high enough.
	const walls = [
		{ at: LEFT, side: 1 },
		{ at: RIGHT, side: -1 },
		{ at: nestSpan(0).to, side: 0 },
		{ at: nestSpan(1).from, side: 0 },
	]
	for (const { at, side } of walls) {
		const low = egg.y + EGG_R > groundY(at) - RIM
		if (side !== 0) {
			if ((egg.x - at) * side < EGG_R) {
				egg.x = at + side * EGG_R
				egg.vx = side * Math.abs(egg.vx) * 0.5
			}
			continue
		}
		if (!low || Math.abs(egg.x - at) >= EGG_R) continue
		// Off whichever side of the rim it's on.
		const from = egg.x - egg.vx < at ? -1 : 1
		egg.x = at + from * EGG_R
		egg.vx = from * Math.abs(egg.vx) * 0.5
	}
}

/** Eggs touching, pushed apart, their speeds towards each other bounced back a little: piling up. */
function settle(eggs: Egg[]) {
	const loose = eggs.filter((e) => e.carrier === undefined)
	loose.sort((a, b) => a.x - b.x)
	const reach = EGG_R * 2
	for (let pass = 0; pass < SETTLES; pass++)
		for (let i = 0; i < loose.length; i++) {
			const a = loose[i]
			for (let j = i + 1; j < loose.length; j++) {
				const b = loose[j]
				if (b.x - a.x >= reach) break
				const dx = b.x - a.x
				const dy = b.y - a.y
				const d = Math.hypot(dx, dy)
				if (d >= reach || d === 0) continue
				const nx = dx / d
				const ny = dy / d
				const push = (reach - d) / 2
				a.x -= nx * push
				a.y -= ny * push
				b.x += nx * push
				b.y += ny * push
				if (pass > 0) continue
				const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
				if (closing >= 0) continue
				const j2 = (-(1 + EGG_BOUNCE) * closing) / 2
				a.vx -= j2 * nx
				a.vy -= j2 * ny
				b.vx += j2 * nx
				b.vy += j2 * ny
			}
		}
	// Not pushed into the ground.
	for (const e of loose) {
		const floor = groundY(e.x) - EGG_R
		if (e.y > floor) e.y = floor
	}
}

function startHungryGoose(world: World): MinigameRun {
	const { racers } = world

	// A team a Player short: a bot added to it, to make it even. On a phone,
	// already there, sent with everyone else.
	let teamBot = racers.find((r) => r.id === TEAM_BOT)
	if (!teamBot && racers.length % 2 === 1) {
		teamBot = {
			id: TEAM_BOT,
			runner: pickBot(racers),
			body: startingBody(terrain, START_X),
			controls: () => (teamBot ? run.bot(teamBot) : IDLE),
			colour: '#8a96a0',
			number: racers.length + 1,
			outAt: 0,
		}
		racers.push(teamBot)
	}
	/** Which team each's on, 0 Red, the left, 1 Blue, the right: shuffled, then taken in turns. */
	const teams = new Map<string, number>()
	inRandomOrder(racers.filter((r) => r !== teamBot)).forEach((racer, i) =>
		teams.set(racer.id, i % 2),
	)
	if (teamBot) {
		const reds = [...teams.values()].filter((t) => t === 0).length
		teams.set(teamBot.id, reds * 2 < racers.length ? 0 : 1)
	}
	const teamOf = (racer: Racer) => teams.get(racer.id) ?? 0
	/** Each team's hat kept, once teams are known: on the Host, on the first tick; on a phone, once it's told. */
	let hatsKept = false
	const keepHats = () => {
		if (hatsKept) return
		hatsKept = true
		collectTeamHats(world, teamOf, (r) => isBot(r, TEAM_BOT))
	}
	const teamMates = (team: number) => racers.filter((r) => teamOf(r) === team)
	/** The middle of `team`'s nest. */
	const nestMiddle = (team: number) => {
		const { from, to } = nestSpan(team)
		return (from + to) / 2
	}

	// Each by their own nest, spread out, facing the goose, in their team's
	// hat.
	for (const racer of racers) {
		const team = teamOf(racer)
		const mates = teamMates(team)
		const b = racer.body
		const at = mates.indexOf(racer)
		const { from, to } = nestSpan(team)
		b.x = Math.round(team === 0 ? to + 40 + at * 40 : from - 40 - at * 40)
		b.feetY = groundY(b.x)
		b.floor = b.feetY
		b.grounded = true
		b.facing = team === 0 ? 1 : -1
		b.hat = teamHat(team)
		b.celebrating = false
	}

	const show: GooseShow = {
		eggs: [],
		nests: [0, 0],
		laidAt: Number.NEGATIVE_INFINITY,
		facing: -1,
		stealing: new Map(),
	}
	shows.set(world, show)
	let nextId = 0
	let nextLay = 60
	/** How many eggs each racer's carried home, and taken from the other nest, by their place in the racers. */
	const carried = racers.map(() => 0)
	const stolen = racers.map(() => 0)
	/** Where each egg being carried was taken from: the other team's nest, if it was. */
	const takenFrom = new Map<number, number>()
	/** How long each racer's been guarded from another bounce, last tick: up, they've just been bounced on. */
	const guarded = racers.map(() => 0)
	/** Who won, once it's decided: a team, or -1 for a draw. */
	let winner: number | undefined

	const solo = racers.length - (teamBot ? 1 : 0) === 1
	const ticksLeft = () => Math.max(0, GOOSE_TICKS - world.raceTicks())
	const suddenDeath = () =>
		world.raceTicks() >= GOOSE_TICKS && winner === undefined
	const frenzy = () => world.raceTicks() >= GOOSE_TICKS - FRENZY_TICKS
	const won = (racer: Racer) =>
		winner !== undefined && (winner < 0 || winner === teamOf(racer))
	const holding = (i: number) => show.eggs.find((e) => e.carrier === i)
	/** "7–4", their team's first. */
	const score = (racer: Racer) =>
		`${show.nests[teamOf(racer)]}–${show.nests[1 - teamOf(racer)]}`
	const worth = (egg: Egg) => (egg.golden ? GOLDEN_WORTH : 1)

	/** The goose lays: an egg out from under her tail, off down the mound, the way she's not facing. */
	function lay() {
		const facing: 1 | -1 = Math.random() < 0.5 ? 1 : -1
		show.facing = facing
		show.laidAt = world.ticks()
		const back = -facing
		show.eggs.push({
			id: nextId++,
			x: GOOSE_X + back * (GOOSE_REAR.x - GOOSE_WIDTH / 2),
			y: GOOSE_STANDS - (GOOSE_HEIGHT - GOOSE_REAR.y),
			vx: back * (1.5 + Math.random() * 4.5),
			vy: -(1.5 + Math.random() * 3.5),
			spin: 0,
			golden: Math.random() < GOLDEN,
		})
		play('honk')
	}

	/** Each nest's eggs, counted: what's lying in it. */
	function count() {
		const nests: [number, number] = [0, 0]
		for (const egg of show.eggs) {
			const team = nestOf(egg)
			if (team !== undefined) nests[team] += worth(egg)
		}
		show.nests = nests
	}

	/**
	 * Everyone and the eggs: picked up, by anyone running into one with their
	 * hands free, but out of their own nest; or knocked, by anyone carrying
	 * one, but in their own nest, which they leave be.
	 */
	function touch() {
		const now = world.ticks()
		racers.forEach((racer, i) => {
			const b = racer.body
			let rummaging = false
			if (b.knockedDown > 0) {
				show.stealing.delete(i)
				return
			}
			const team = teamOf(racer)
			const top = b.feetY - bodyHeight(b)
			for (const egg of show.eggs) {
				if (egg.carrier !== undefined) continue
				const dx = egg.x - b.x
				if (Math.abs(dx) >= HITBOX_HALF_WIDTH + EGG_R) continue
				if (egg.y + EGG_R < top - 4 || egg.y - EGG_R > b.feetY) continue
				const nest = nestOf(egg)
				if (nest === team) continue
				if (!holding(i)) {
					// Out of the other team's nest: only after a while at it.
					if (nest !== undefined) {
						rummaging = true
						const since = show.stealing.get(i) ?? now
						show.stealing.set(i, since)
						if (now - since < STEAL_TICKS) continue
						show.stealing.delete(i)
						takenFrom.set(egg.id, nest)
						world.popup('Stolen!', egg.x, egg.y - 60)
					}
					egg.carrier = i
					play('fika')
					continue
				}
				// Knocked: out of their way, the way they're going, and up a little.
				const side = Math.sign(dx) || b.facing
				egg.x = b.x + side * (HITBOX_HALF_WIDTH + EGG_R)
				egg.vx = b.vx * KNOCK + side * 0.8
				egg.vy = Math.min(egg.vy, -Math.abs(b.vx) * KNOCK_UP)
			}
			// Away from it, or got one: starting again.
			if (!rummaging) show.stealing.delete(i)
		})
	}

	function decide(team: number) {
		if (world.order()) return
		winner = team
		const order =
			team < 0
				? racers.filter((r) => r !== teamBot)
				: [...teamMates(team), ...teamMates(1 - team)].filter(
						(r) => r !== teamBot,
					)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const said =
			team < 0
				? 'It’s a draw!'
				: solo && won(racers[0])
					? 'You win!'
					: `${TEAM_NAMES[team]} win!`
		world.popup(said, GOOSE_X, GOOSE_STANDS - GOOSE_HEIGHT - 40)
		play('finished')
	}

	// --- The bot --------------------------------------------------------------
	const skills = new Map<string, number>()
	const skillOf = (racer: Racer) => {
		let skill = skills.get(racer.id)
		if (skill === undefined) {
			skill = 0.3 + Math.random() * 0.7
			skills.set(racer.id, skill)
		}
		return skill
	}
	/** What each bot's after, and till when, by the world's ticks. */
	const after = new Map<
		string,
		{ egg?: number; chase?: number; until: number }
	>()
	const jumps = new Map<string, number>()
	const stuck = new Map<string, { x: number; ticks: number }>()

	function bot(racer: Racer): Controls {
		if (world.order()) return IDLE
		const b = racer.body
		const i = racers.indexOf(racer)
		const team = teamOf(racer)
		const now = world.ticks()
		const jump = () => {
			if (b.grounded && now > (jumps.get(racer.id) ?? 0) + 3)
				jumps.set(racer.id, now + 10 + Math.floor(Math.random() * 10))
		}
		let aim: number
		if (holding(i)) aim = nestMiddle(team)
		else {
			let plan = after.get(racer.id)
			if (!plan || now >= plan.until) {
				// An egg, near and golden, not one a team mate's already after,
				// and not one already home; theirs, in their nest, worth going
				// for too. Or occasionally, someone on the other team carrying
				// one, to bounce on.
				const mates = teamMates(team).filter((r) => r !== racer)
				const taken = new Set(mates.map((m) => after.get(m.id)?.egg))
				let best: { egg?: number; chase?: number; score: number } = {
					score: Number.NEGATIVE_INFINITY,
				}
				for (const egg of show.eggs) {
					if (egg.carrier !== undefined) continue
					const nest = nestOf(egg)
					if (nest === team) continue
					const score =
						worth(egg) * 100 +
						(nest === undefined ? 0 : 40 * skillOf(racer)) -
						Math.abs(egg.x - b.x) * 0.25 -
						(taken.has(egg.id) ? 120 : 0) +
						Math.random() * 40
					if (score > best.score) best = { egg: egg.id, score }
				}
				racers.forEach((other, j) => {
					if (teamOf(other) === team || !holding(j)) return
					const score =
						60 + skillOf(racer) * 60 - Math.abs(other.body.x - b.x) * 0.4
					if (score > best.score) best = { chase: j, score }
				})
				plan = {
					egg: best.egg,
					chase: best.chase,
					until: now + 20 + Math.random() * 30 + (1 - skillOf(racer)) * 30,
				}
				after.set(racer.id, plan)
			}
			const egg = show.eggs.find(
				(e) => e.id === plan.egg && e.carrier === undefined,
			)
			const chased = plan.chase === undefined ? undefined : racers[plan.chase]
			if (chased && holding(plan.chase as number)) {
				// After a carrier: up and onto their head.
				aim = chased.body.x + chased.body.vx * 8
				if (Math.abs(chased.body.x - b.x) < 60) jump()
			} else if (egg) aim = egg.x
			else {
				// Nothing to be after: waiting by the goose, on their side.
				aim = GOOSE_X + (team === 0 ? -200 : 200)
				plan.until = Math.min(plan.until, now + 10)
			}
		}
		const dx = aim - b.x
		const go = Math.abs(dx) > 6 ? Math.sign(dx) : 0
		// Up against a lump, or something: over it.
		const was = stuck.get(racer.id)
		if (go && was && Math.abs(b.x - was.x) < 0.5) {
			was.ticks++
			if (was.ticks > 6) jump()
		} else stuck.set(racer.id, { x: b.x, ticks: 0 })
		if (was) was.x = b.x
		// Hopping over the lumps occasionally, as people do.
		if (go && Math.random() < 0.01) jump()
		return {
			left: go < 0,
			right: go > 0,
			up: now < (jumps.get(racer.id) ?? 0),
			down: false,
		}
	}

	const run: MinigameRun = {
		id: 'hungry-goose',
		ticksLeft,
		chip: (racer) =>
			`${TEAM_NAMES[teamOf(racer)]} ${show.nests[teamOf(racer)]}`,
		score: (racer) =>
			show.nests[teamOf(racer)] * 1000 + carried[racers.indexOf(racer)],
		note: (racer) => {
			const i = racers.indexOf(racer)
			const n = carried[i]
			const eggs = `${n} egg${n === 1 ? '' : 's'} home${stolen[i] ? `, ${stolen[i]} stolen` : ''}`
			if (winner === undefined) return `${TEAM_NAMES[teamOf(racer)]} · ${eggs}`
			if (winner < 0) return `Drew ${score(racer)} · ${eggs}`
			return `${won(racer) ? 'Won' : 'Lost'} ${score(racer)} · ${eggs}`
		},
		timeNote: (racer) =>
			winner === undefined
				? undefined
				: winner < 0
					? `Drew ${score(racer)}`
					: `${won(racer) ? 'Won' : 'Lost'} ${score(racer)}`,
		placeOf: (racer) => {
			if (winner === undefined || winner < 0) return 1
			const order = world.order() ?? []
			const winners = order.filter((r) => won(r)).length
			return won(racer) ? 1 : winners + 1
		},
		done: won,
		out: () => false,
		announce: () => {
			if (world.order()) return undefined
			const t = world.raceTicks()
			if (t >= GOOSE_TICKS)
				return t - GOOSE_TICKS < ANNOUNCED_FOR ? 'Next lead wins!' : undefined
			const into = t - (GOOSE_TICKS - FRENZY_TICKS)
			return into >= 0 && into < ANNOUNCED_FOR ? 'Egg frenzy!' : undefined
		},
		bot,
		step() {
			keepHats()
			if (world.phase() !== 'running') return
			// Nobody past the walls; anyone carrying an egg, slowed by it.
			racers.forEach((racer, i) => {
				const b = racer.body
				if (b.x < LEFT) {
					b.x = LEFT
					b.vx = Math.max(0, b.vx)
				} else if (b.x > RIGHT) {
					b.x = RIGHT
					b.vx = Math.min(0, b.vx)
				}
				const egg = holding(i)
				if (egg) {
					const most = takenFrom.has(egg.id) ? STOLEN_SPEED : CARRY_SPEED
					b.vx = Math.max(-most, Math.min(most, b.vx))
				}
				b.celebrating = won(racer)
			})

			if (!world.order()) {
				// Bounced on: whatever they're carrying, dropped.
				racers.forEach((racer, i) => {
					const bounced = racer.body.stomped > guarded[i]
					guarded[i] = racer.body.stomped
					const egg = bounced ? holding(i) : undefined
					if (!egg) return
					const at = heldAt(racer)
					egg.carrier = undefined
					egg.x = at.x
					egg.y = at.y
					egg.vx = (Math.random() - 0.5) * 5
					egg.vy = -4
					takenFrom.delete(egg.id)
					world.popup('Dropped it!', at.x, at.y - 30)
					play('stomp')
				})

				// The goose laying, quicker as it goes on, and quickest at the end.
				const t = world.raceTicks()
				if (t >= nextLay) {
					const loose = show.eggs.filter(
						(e) => e.carrier === undefined && nestOf(e) === undefined,
					).length
					if (loose < LOOSE_MOST) lay()
					const share = Math.min(1, t / (GOOSE_TICKS - FRENZY_TICKS))
					const every =
						frenzy() || suddenDeath()
							? LAY_FRENZY
							: LAY_FIRST + (LAY_LAST - LAY_FIRST) * share
					nextLay = t + Math.round(every * (0.7 + Math.random() * 0.6))
				}
				touch()

				// Home: carried into their own nest, and let go of, into it.
				racers.forEach((racer, i) => {
					const egg = holding(i)
					if (!egg) return
					const team = teamOf(racer)
					const { from, to } = nestSpan(team)
					if (racer.body.x < from || racer.body.x > to - 12) return
					egg.carrier = undefined
					egg.vx = (nestMiddle(team) - racer.body.x) * 0.03
					egg.vy = -1
					if (egg.home !== team) carried[i] += worth(egg)
					egg.home = team
					if (takenFrom.get(egg.id) === 1 - team) stolen[i]++
					takenFrom.delete(egg.id)
					world.popup(`+${worth(egg)}`, racer.body.x, racer.body.feetY - 90)
					play(egg.golden ? 'cheer' : 'scan')
				})
			}

			// Every egg: carried, held over their head; or loose, moving, and
			// all of them piling up.
			for (const egg of show.eggs) {
				if (egg.carrier === undefined) {
					move(egg)
					continue
				}
				const at = heldAt(racers[egg.carrier])
				egg.x = at.x
				egg.y = at.y
				egg.vx = racers[egg.carrier].body.vx
				egg.vy = 0
			}
			settle(show.eggs)
			count()

			// Over: at the minute, unless it's level; then the first to be
			// ahead, or a draw, if neither is in time.
			if (world.order()) return
			const t = world.raceTicks()
			const [red, blue] = show.nests
			if (t >= GOOSE_TICKS && red !== blue) decide(red > blue ? 0 : 1)
			else if (t >= GOOSE_TICKS + EXTRA_TICKS) decide(-1)
		},
		frame(): MinigameFrame {
			return {
				eggs: show.eggs.map((e) => [
					e.id,
					Math.round(e.x * 10) / 10,
					Math.round(e.y * 10) / 10,
					Math.round(e.spin * 10) / 10,
					e.carrier ?? -1,
					e.golden ? 1 : 0,
				]),
				nests: [...show.nests],
				teams: racers.map(teamOf),
				laidAt: [show.laidAt, show.facing],
				winner: winner ?? -2,
				stealing: [...show.stealing],
			}
		},
		apply(a, b, share) {
			const next = new Map((b?.eggs ?? []).map((e) => [e[0], e]))
			show.eggs = (a.eggs ?? []).map(([id, x, y, spin, carrier, golden]) => {
				const to = next.get(id)
				const mix = (from: number, i: number) =>
					to ? from + ((to[i] as number) - from) * share : from
				return {
					id,
					x: mix(x, 1),
					y: mix(y, 2),
					vx: 0,
					vy: 0,
					spin: mix(spin, 3),
					golden: golden === 1,
					carrier: carrier < 0 ? undefined : carrier,
				}
			})
			if (a.nests) show.nests = [a.nests[0], a.nests[1]]
			if (a.laidAt) {
				show.laidAt = a.laidAt[0]
				show.facing = a.laidAt[1] < 0 ? -1 : 1
			}
			// The Host's teams, and their hats to go with them.
			a.teams?.forEach((team, i) => {
				const racer = racers[i]
				if (!racer) return
				teams.set(racer.id, team)
				racer.body.hat = teamHat(team)
			})
			if (a.teams) keepHats()
			winner = a.winner === undefined || a.winner < -1 ? undefined : a.winner
			show.stealing = new Map(a.stealing ?? [])
			for (const racer of racers) racer.body.celebrating = won(racer)
		},
	}
	return run
}
