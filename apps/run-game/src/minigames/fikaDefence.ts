import {
	STUGA_GRASS,
	STUGA_GRASS_SHADE,
	STUGA_PATH,
	STUGA_PATH_SHADE,
	STUGA_SKY_BOTTOM,
	STUGA_SKY_TOP,
	TABLES,
	TABLE_HEIGHT,
	TABLE_WIDTH,
} from '../courses/kit/stugaScenery'
import type { PlatformDefinition } from '../courses/types'
import {
	GROUND_Y,
	HITBOX_HALF_WIDTH,
	RUNNER_SCALE,
	START_X,
	STOMP_BOUNCE,
	STOMP_BOUNCE_HELD,
	TICK_MS,
	VIEW_WIDTH,
} from '../game/constants'
import type { FikaItem } from '../game/fika'
import { teamHat } from '../game/teams'
import { type Racer, type World, bodyHeight, startingBody } from '../game/world'
import type { Controls } from '../input'
import { CLUB } from '../runners/playable'
import { play } from '../sfx'
import { ARENA_LEFT, ARENA_WALLS, arenaCourse, inRandomOrder } from './arena'
import { TEAM_NAMES } from './beachVolleyball'
import { collectTeamHats, isBot } from './teams'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Fika Defence: a summer's afternoon on an island in the archipelago, on
 * the lawn in front of a red stuga, and two teams, Red and Blue, each with
 * a garden table at their end of it, laid for fika. Everything else on the
 * island wants it too:
 *
 * - **Geese** waddle in along the lawn, stand at the end of a table,
 *   pecking at it, and waddle off with something. Sturdy: run into one and
 *   it hisses and shoves you back. Bounce on its head, and it's off.
 * - **Gulls** fly over, circle a table (their shadow on it the warning),
 *   then dive down onto it and snatch something, up and away. Jump up into
 *   one, or be up on the table when it comes.
 * - **Squirrels** dart in, up a table leg and onto it, grab something and
 *   off. Quick: they hop right over anyone running at them on the ground.
 *   Catch one in the air, or up on the table.
 * - **A moose**, twice a game, plods up to the richer table and eats what's
 *   on it, a cake at a time. Shove it, all of you at once, or bounce on its
 *   back, till it's had enough and goes.
 *
 * Whatever's snatched is dropped, if the thief's seen off, and lies on the
 * lawn: run into it, hands free, and carry it home to your own table,
 * whichever table it came off. Anyone carrying something's slower, and
 * bounced on, drops it. Thieves go after the table that's least defended,
 * and the one with the most on it.
 *
 * They come quicker and quicker, and the last 15 seconds are a fika
 * frenzy, gulls everywhere. A table stripped bare loses there and then;
 * otherwise, after a minute, the team with the most fika on their table
 * wins; level, the next to change it.
 */

/** How long it goes on: a minute; then, level, how long more for one to get ahead, before it's a draw. */
const DEFENCE_TICKS = Math.round(60_000 / TICK_MS)
const EXTRA_TICKS = Math.round(20_000 / TICK_MS)
/** The last 15 seconds: a fika frenzy. */
const FRENZY_TICKS = Math.round(15_000 / TICK_MS)
/** How long between raiders, to begin with, by the end, and in the frenzy. */
const RAID_FIRST = 190
const RAID_LAST = 100
const RAID_FRENZY = 60
/** When gulls start coming, and squirrels, by the race's ticks. */
const GULLS_FROM = 480
const SQUIRRELS_FROM = 1080
/** When each moose comes, by the race's ticks: once, two-thirds of the way in, and again in the frenzy. */
const MOOSE_AT = [Math.round(31_000 / TICK_MS), Math.round(47_000 / TICK_MS)]
/** How long anything big's said across the screen. */
const ANNOUNCED_FOR = 100

/** The bot added to a team that's a Player short: its id, so every screen finds it. */
const TEAM_BOT = 'fika-bot'

// --- The tables ----------------------------------------------------------------

/** Each table: where it starts, along the world, how wide it is, and how high its top. */
export const TABLE_W = TABLE_WIDTH
export const TABLE_UP = TABLE_HEIGHT
/** How far in from the screen's edge each table is. */
const TABLE_IN = 140
export const tableSpan = (team: number) => {
	const from =
		team === 0
			? ARENA_LEFT + TABLE_IN
			: ARENA_LEFT + VIEW_WIDTH - TABLE_IN - TABLE_W
	return { from, to: from + TABLE_W }
}
export const tableMiddle = (team: number) => tableSpan(team).from + TABLE_W / 2
/** The top of a table, where the fika stands. */
export const TABLE_TOP = GROUND_Y - TABLE_UP

/** What's laid out on the tables, by its place here. */
export const SPREAD: FikaItem[] = [
	'kanelbulle',
	'chokladboll',
	'prinsesstarta',
	'semla',
	'kardemummabulle',
	'dammsugare',
	'coffee',
]
/** How many places there are on a table, in two rows, front and back, and how many are laid to begin with. */
const ROW = 8
export const SLOTS = ROW * 2
const LAID = 12
/** Where place `slot` is on team `team`'s table: its middle across, and how far up off the top it's stood (the back row's further back, so higher). */
export function slotAt(team: number, slot: number) {
	const { from } = tableSpan(team)
	const back = slot >= ROW
	const k = slot % ROW
	return {
		x: from + 20 + k * 24 + (back ? 12 : 0),
		y: TABLE_TOP + (back ? -5 : 1),
		back,
	}
}

// --- The raiders -------------------------------------------------------------------

export type RaiderKind = 'goose' | 'gull' | 'squirrel' | 'moose'
export const RAIDER_KINDS: RaiderKind[] = ['goose', 'gull', 'squirrel', 'moose']
export type RaiderStage =
	| 'coming'
	| 'circling'
	| 'diving'
	| 'climbing'
	| 'stealing'
	| 'leaving'
	| 'fleeing'
export const RAIDER_STAGES: RaiderStage[] = [
	'coming',
	'circling',
	'diving',
	'climbing',
	'stealing',
	'leaving',
	'fleeing',
]

/**
 * Something after the fika: where it is (its feet, or a gull's middle
 * bottom), how fast it's going, what it's up to and since when (by the
 * world's ticks), which table it's after, which edge of the screen it
 * came in from (-1 the left), which way it faces, what it's got, if
 * anything, and a moose's how fed up it is with being shoved.
 */
export interface Raider {
	id: number
	kind: RaiderKind
	x: number
	y: number
	vx: number
	vy: number
	stage: RaiderStage
	since: number
	table: number
	side: 1 | -1
	facing: 1 | -1
	/** What it's carrying off, by its place in `SPREAD`, and which table it came off. On the Host only, the table. */
	loot?: number
	lootFrom?: number
	/** A moose's: how much it's been shoved, out of `MOOSE_FED_UP`. */
	shoo: number
	/** A gull's: where it's diving to and from. On the Host only. */
	dive?: { x0: number; y0: number; x1: number; y1: number }
	/** A goose's or a squirrel's: when it last hissed, or hopped. On the Host only. */
	last?: number
}

/** How big each is, as the game has it: half its width, and how tall. */
export const RAIDER_SIZE: Record<RaiderKind, { half: number; tall: number }> = {
	goose: { half: 14, tall: 28 },
	gull: { half: 16, tall: 18 },
	squirrel: { half: 12, tall: 18 },
	moose: { half: 40, tall: 66 },
}
/** How fast each walks in, and off. */
const GOOSE_IN = 1.8
const GOOSE_OUT = 1.4
const SQUIRREL_IN = 3.4
const SQUIRREL_OUT = 4.2
const SQUIRREL_FLEE = 6
const MOOSE_IN = 0.8
const MOOSE_OUT = 1.8
const GULL_IN = 3.6
/** How long each takes about it: pecking, climbing, grabbing, circling, diving, and between a moose's mouthfuls. */
const GOOSE_PECKS = 70
const SQUIRREL_CLIMBS = 18
const SQUIRREL_GRABS = 22
const GULL_CIRCLES = 70
const GULL_DIVES = 40
export const MOOSE_MUNCHES = 100
/** How fed up a moose gets, shoved, before it goes; a tick of each shoving it, and a bounce on its back; and how quickly it gets over it. */
export const MOOSE_FED_UP = 150
const MOOSE_SHOVE = 1
const MOOSE_BOUNCE = 45
const MOOSE_CALMS = 0.25
/** How near a squirrel lets someone running at it come, on the ground, before it hops over them. */
const SQUIRREL_SHY = 64
/** How hard a goose shoves back whoever runs into it. */
const GOOSE_SHOVE = 5

// --- Fika dropped ------------------------------------------------------------------

/** Fika dropped on the lawn, or being carried: what it is, where, and who's carrying it. */
export interface Loose {
	id: number
	item: number
	x: number
	y: number
	vx: number
	vy: number
	/** Who's carrying it, by their place in the racers. */
	carrier?: number
	/** Which table it came off. On the Host only. */
	from?: number
}
const FALL = 0.4
const GROUND_BOUNCE = 0.3
const ROLL_KEEP = 0.9
/** How fast anyone carrying fika can go. */
const CARRY_SPEED = 5.4
/** How far over a carrier's head it's held. */
const HELD_OVER = 8

/** What's to be drawn of a game of Fika Defence. */
export interface DefenceShow {
	/** Each table's places, what's in each, by its place in `SPREAD` (-1 nothing). */
	tables: [number[], number[]]
	raiders: Raider[]
	loose: Loose[]
}
const shows = new WeakMap<World, DefenceShow>()
/** `world`'s game of Fika Defence, for drawing, if it's one. */
export const defenceOf = (world: World) => shows.get(world)

/** How much is on team `team`'s table. */
export const onTable = (show: DefenceShow, team: number) =>
	show.tables[team].filter((s) => s >= 0).length

/** Where what `racer` carries is held: up over their head. */
export function heldAt(racer: Racer) {
	const b = racer.body
	const tall =
		racer.runner.sprite.height * RUNNER_SCALE * (b.ducking ? 0.55 : 1)
	return { x: b.x, y: b.feetY - tall - HELD_OVER }
}

const TABLE_PLATFORMS: PlatformDefinition[] = [0, 1].map((team) => ({
	x: tableSpan(team).from,
	width: TABLE_W,
	height: TABLE_UP,
	art: {
		asset: TABLES[team],
		width: TABLE_WIDTH,
		height: TABLE_HEIGHT,
		top: 0,
	},
}))

export const fikaDefence: Minigame = {
	id: 'fika-defence',
	name: 'Fika Defence',
	tagline: 'Guard your team’s fika',
	blurb:
		'Geese, gulls, squirrels and a moose are after your team’s fika! Bounce on geese, jump into gulls, catch squirrels, shove the moose. Carry dropped fika home. Most fika on your table after a minute wins!',
	tune: 'haga',
	// The tables' boards say it all.
	pills: false,
	collectables: ['hat:redTeamHat', 'hat:blueTeamHat'],
	course: {
		...arenaCourse(
			'fika-defence',
			'Fika Defence',
			'Keep the geese, gulls, squirrels and moose off your fika!',
			// A lawn by a red stuga, the sea behind (see `draw/fikaDefence`).
			{
				palette: {
					'--sky-blue-top': STUGA_SKY_TOP,
					'--sky-blue-bottom': STUGA_SKY_BOTTOM,
					'--grass-green': STUGA_GRASS,
					'--grass-dark-green': STUGA_GRASS_SHADE,
					'--grass-darker-green': STUGA_GRASS_SHADE,
					'--dirt-brown': STUGA_PATH,
					'--dirt-dark-brown': STUGA_PATH_SHADE,
					'--dirt-darker-brown': STUGA_PATH_SHADE,
				},
				far: [],
				near: [],
				horizonTrees: false,
			},
		),
		platforms: TABLE_PLATFORMS,
	},
	start: startFikaDefence,
}

/** A club member not playing, for a team that's a Player short: the same on every screen. */
function pickBot(racers: Racer[]) {
	const playing = new Set(racers.map((r) => r.runner.id))
	const free = CLUB.filter((m) => !playing.has(m.id))
	const seed = racers
		.map((r) => r.id)
		.join('')
		.split('')
		.reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 11)
	return free[seed % free.length] ?? CLUB[0]
}

/** Off the screen, either side, far enough to be gone. */
const offScreen = (x: number) =>
	x < ARENA_LEFT - 70 || x > ARENA_LEFT + VIEW_WIDTH + 70
/** Just off the screen on side `side`. */
const edgeX = (side: number) =>
	side < 0 ? ARENA_LEFT - 50 : ARENA_LEFT + VIEW_WIDTH + 50

function startFikaDefence(world: World): MinigameRun {
	const { racers } = world
	const { left: LEFT, right: RIGHT } = ARENA_WALLS

	// A team a Player short: a bot added to it, to make it even. On a phone,
	// already there, sent with everyone else.
	let teamBot = racers.find((r) => r.id === TEAM_BOT)
	if (!teamBot && racers.length % 2 === 1) {
		teamBot = {
			id: TEAM_BOT,
			runner: pickBot(racers),
			body: startingBody(world.terrain, START_X),
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
	let hatsKept = false
	const keepHats = () => {
		if (hatsKept) return
		hatsKept = true
		collectTeamHats(world, teamOf, (r) => isBot(r, TEAM_BOT))
	}
	const teamMates = (team: number) => racers.filter((r) => teamOf(r) === team)
	const players = racers.filter((r) => !isBot(r, TEAM_BOT))
	const solo = players.length === 1

	// Each by their own table, spread out round it, facing in, in their
	// team's hat.
	for (const racer of racers) {
		const team = teamOf(racer)
		const mates = teamMates(team)
		const at = mates.indexOf(racer)
		const b = racer.body
		const { from, to } = tableSpan(team)
		const spots = [to + 36, from + 60, to - 40, from - 30, to + 80]
		b.x = Math.round(
			team === 0
				? spots[at % spots.length]
				: from + to - spots[at % spots.length],
		)
		b.x = Math.max(LEFT, Math.min(RIGHT, b.x))
		b.feetY = GROUND_Y
		b.floor = GROUND_Y
		b.grounded = true
		b.on = undefined
		b.facing = team === 0 ? 1 : -1
		b.hat = teamHat(team)
		b.celebrating = false
	}

	// Each table laid: the front row first, then a couple at the back, a
	// different spread on each.
	const laid = (team: number) =>
		Array.from({ length: SLOTS }, (_, slot) => {
			const order = slot < ROW ? slot : slot - ROW
			const used = slot < ROW || order < LAID - ROW
			return used
				? (slot * 3 + team * 2 + (slot >= ROW ? 1 : 0)) % SPREAD.length
				: -1
		})
	const show: DefenceShow = {
		tables: [laid(0), laid(1)],
		raiders: [],
		loose: [],
	}
	shows.set(world, show)
	let nextId = 0
	let nextRaid = 90
	let moosesSent = 0
	/** What each racer's done, by their place in the racers: thieves seen off, fika carried home, and of it, the other team's. */
	const shooed = racers.map(() => 0)
	const saved = racers.map(() => 0)
	const poached = racers.map(() => 0)
	/** How many times each's been bounced on, last tick: up, they've just been bounced on again. */
	const guarded = racers.map(() => 0)
	/** Where each's feet were, last tick: for coming down onto a goose's head, or a moose's back. */
	const lastFeet = racers.map((r) => r.body.feetY)
	/** Who won, once it's decided: a team, or -1 for a draw; and what each table had on it then. */
	let winner: number | undefined
	let final: readonly [number, number] | undefined

	const ticksLeft = () => Math.max(0, DEFENCE_TICKS - world.raceTicks())
	const suddenDeath = () =>
		world.raceTicks() >= DEFENCE_TICKS && winner === undefined
	const frenzy = () => world.raceTicks() >= DEFENCE_TICKS - FRENZY_TICKS
	const won = (racer: Racer) =>
		winner !== undefined && (winner < 0 || winner === teamOf(racer))
	const counts = () => [onTable(show, 0), onTable(show, 1)] as const
	/** "7–4", their team's first: as it was when it was decided, once it is. */
	const score = (racer: Racer) => {
		const c = final ?? counts()
		return `${c[teamOf(racer)]}–${c[1 - teamOf(racer)]}`
	}
	const holding = (i: number) => show.loose.find((l) => l.carrier === i)
	/** The top of `racer`, and whether they're up in the air. */
	const topOf = (racer: Racer) => racer.body.feetY - bodyHeight(racer.body)

	// --- Taking and putting fika -------------------------------------------------------

	/** Something off team `team`'s table, the nearest to `x`, if there's anything on it. */
	function takeFrom(team: number, x: number) {
		const slots = show.tables[team]
		let best = -1
		let bestD = Number.POSITIVE_INFINITY
		slots.forEach((item, slot) => {
			if (item < 0) return
			const d =
				Math.abs(slotAt(team, slot).x - x) + (slotAt(team, slot).back ? 6 : 0)
			if (d < bestD) {
				bestD = d
				best = slot
			}
		})
		if (best < 0) return undefined
		const item = slots[best]
		slots[best] = -1
		return item
	}
	/** `item` put back on team `team`'s table, in the first free place, front row first. True if there was room. */
	function putOn(team: number, item: number) {
		const slots = show.tables[team]
		const free = slots.indexOf(-1)
		if (free < 0) return false
		slots[free] = item
		return true
	}
	/** Something dropped, at `x`, `y`, off to one side or other. */
	function drop(
		item: number,
		from: number | undefined,
		x: number,
		y: number,
		vx = 0,
	) {
		show.loose.push({
			id: nextId++,
			item,
			x,
			y,
			vx: vx + (Math.random() - 0.5) * 3,
			vy: -3,
			from,
		})
	}

	// --- Raiders ---------------------------------------------------------------------

	/** How many of each team are near their table, defending it. */
	function defenders(team: number) {
		const mid = tableMiddle(team)
		return teamMates(team).filter((r) => Math.abs(r.body.x - mid) < 260).length
	}
	/** The table a new raider goes after: the less defended, the more on it. */
	function pickTable() {
		const c = counts()
		if (c[0] === 0 && c[1] === 0) return Math.random() < 0.5 ? 0 : 1
		if (c[0] === 0) return 1
		if (c[1] === 0) return 0
		const w = [0, 1].map((t) => (c[t] + 2) / (1 + defenders(t)))
		return Math.random() * (w[0] + w[1]) < w[0] ? 0 : 1
	}

	function send(kind: RaiderKind, table = pickTable()) {
		const outer: 1 | -1 = table === 0 ? -1 : 1
		const side: 1 | -1 =
			kind === 'moose' || Math.random() < 0.65 ? outer : (-outer as 1 | -1)
		const x = edgeX(side)
		const raider: Raider = {
			id: nextId++,
			kind,
			x,
			y: kind === 'gull' ? 70 + Math.random() * 80 : GROUND_Y,
			vx: 0,
			vy: 0,
			stage: 'coming',
			since: world.ticks(),
			table,
			side,
			facing: side < 0 ? 1 : -1,
			shoo: 0,
		}
		show.raiders.push(raider)
		if (kind === 'goose') play('honk')
	}

	/** Raider `r` seen off by `racer` (their place in the racers): whatever it had dropped, and off it goes. */
	function shoo(r: Raider, i: number) {
		if (r.stage === 'fleeing') return
		if (r.loot !== undefined) {
			drop(
				r.loot,
				r.lootFrom,
				r.x,
				r.y - RAIDER_SIZE[r.kind].tall / 2,
				r.vx * 0.3,
			)
			r.loot = undefined
		}
		r.stage = 'fleeing'
		r.since = world.ticks()
		// Off the way it came, or away from whoever saw it off.
		const away = Math.sign(r.x - racers[i].body.x) || r.side
		r.side = away < 0 ? -1 : 1
		r.facing = r.side
		if (i >= 0) shooed[i]++
		const said = {
			goose: 'Honk!',
			gull: 'Squawk!',
			squirrel: 'Eek!',
			moose: 'Hmph!',
		}[r.kind]
		world.popup(said, r.x, r.y - RAIDER_SIZE[r.kind].tall - 30)
		play(r.kind === 'goose' ? 'honk' : 'stomp')
	}

	/** Off a raider's head or back, whose top is at `top`: up, as off anyone's. */
	function bounce(racer: Racer, top: number) {
		const b = racer.body
		b.feetY = top
		b.vy = -(racer.controls().up ? STOMP_BOUNCE_HELD : STOMP_BOUNCE)
		b.jumping = false
		b.grounded = false
		b.on = undefined
		b.launchX = undefined
	}

	/** Whether `racer` overlaps raider `r`. */
	function touching(racer: Racer, r: Raider) {
		const b = racer.body
		const { half, tall } = RAIDER_SIZE[r.kind]
		if (Math.abs(b.x - r.x) >= HITBOX_HALF_WIDTH + half) return false
		return b.feetY > r.y - tall && topOf(racer) < r.y
	}

	/** Whether `racer`'s just come down onto raider `r`'s top, from over it. */
	function landedOn(racer: Racer, i: number, r: Raider) {
		const b = racer.body
		const { half, tall } = RAIDER_SIZE[r.kind]
		if (b.vy <= 0 || Math.abs(b.x - r.x) >= HITBOX_HALF_WIDTH + half - 2)
			return false
		const top = r.y - tall
		return lastFeet[i] <= top + 4 && b.feetY >= top - 2
	}

	/** A tick of raider `r`, on its own: coming, stealing, off. False once it's gone. */
	function moveRaider(r: Raider) {
		const now = world.ticks()
		// It's over: everything off home, empty handed or not.
		if (world.order() && r.stage !== 'leaving' && r.stage !== 'fleeing') {
			r.stage = 'leaving'
			r.since = now
			r.side = r.x < START_X ? -1 : 1
			if (r.kind === 'gull') {
				r.vx = r.side * 2
				r.vy = -1
			}
		}
		const age = now - r.since
		const { from, to } = tableSpan(r.table)
		const toward = (x: number, speed: number) => {
			const d = x - r.x
			r.vx = Math.abs(d) <= speed ? d : Math.sign(d) * speed
			if (r.vx) r.facing = r.vx > 0 ? 1 : -1
			r.x += r.vx
			return Math.abs(d) <= speed
		}
		const steal = () => {
			const item = takeFrom(r.table, r.x)
			if (item !== undefined) {
				r.loot = item
				r.lootFrom = r.table
			}
			r.stage = 'leaving'
			r.since = now
		}
		const setStage = (stage: RaiderStage) => {
			r.stage = stage
			r.since = now
		}
		switch (r.kind) {
			case 'goose': {
				if (r.stage === 'coming') {
					// Picking up anything dropped on the way.
					const found = show.loose.find(
						(l) =>
							l.carrier === undefined &&
							Math.abs(l.x - r.x) < 14 &&
							l.y > GROUND_Y - 12,
					)
					if (found) {
						show.loose.splice(show.loose.indexOf(found), 1)
						r.loot = found.item
						r.lootFrom = found.from
						setStage('leaving')
						break
					}
					const stop = r.side < 0 ? from - 16 : to + 16
					if (toward(stop, GOOSE_IN)) setStage('stealing')
				} else if (r.stage === 'stealing') {
					r.facing = r.x < from ? 1 : -1
					if (age >= GOOSE_PECKS) steal()
				} else if (r.stage === 'leaving') toward(edgeX(r.side), GOOSE_OUT)
				else {
					// Flapping off, up and away.
					r.vy = Math.max(-4, r.vy - 0.18)
					r.vx = r.side * Math.min(4, 1 + age * 0.08)
					r.x += r.vx
					r.y += r.vy
				}
				break
			}
			case 'squirrel': {
				const leg = r.side < 0 ? from + 8 : to - 8
				const grounded = r.y >= GROUND_Y
				// Shy, on the ground: anyone running at it close, and it hops over them.
				if (
					grounded &&
					(r.stage === 'coming' || r.stage === 'leaving') &&
					now - (r.last ?? -99) > 30 &&
					racers.some((racer) => {
						const b = racer.body
						const dx = b.x - r.x
						return (
							b.grounded &&
							Math.abs(dx) < SQUIRREL_SHY &&
							Math.sign(dx) === r.facing &&
							b.knockedDown === 0
						)
					})
				) {
					r.vy = -7.5
					r.last = now
				}
				const onTop = r.stage === 'climbing' || r.stage === 'stealing'
				if (!onTop && (!grounded || r.vy < 0)) {
					r.vy += FALL * 1.1
					r.y = Math.min(GROUND_Y, r.y + r.vy)
					if (r.y >= GROUND_Y) r.vy = 0
				}
				if (r.stage === 'coming') {
					const found = show.loose.find(
						(l) =>
							l.carrier === undefined &&
							Math.abs(l.x - r.x) < 14 &&
							l.y > GROUND_Y - 12,
					)
					if (found && grounded) {
						show.loose.splice(show.loose.indexOf(found), 1)
						r.loot = found.item
						r.lootFrom = found.from
						setStage('leaving')
						break
					}
					if (toward(leg, SQUIRREL_IN) && grounded) setStage('climbing')
				} else if (r.stage === 'climbing') {
					r.y =
						GROUND_Y -
						(TABLE_UP * Math.min(age, SQUIRREL_CLIMBS)) / SQUIRREL_CLIMBS
					if (age >= SQUIRREL_CLIMBS) {
						r.y = TABLE_TOP
						setStage('stealing')
					}
				} else if (r.stage === 'stealing') {
					// Along the table a little, and grabbing.
					toward(r.side < 0 ? from + 30 : to - 30, 2)
					if (age >= SQUIRREL_GRABS) {
						steal()
						r.vy = -3
					}
				} else if (r.stage === 'leaving' || r.stage === 'fleeing') {
					// Off, down off the table if it's on it, and away.
					toward(
						edgeX(r.side),
						r.stage === 'fleeing' ? SQUIRREL_FLEE : SQUIRREL_OUT,
					)
				}
				break
			}
			case 'gull': {
				if (r.stage === 'coming') {
					const above = tableMiddle(r.table) + ((r.id * 37) % 80) - 40
					const d = Math.hypot(above - r.x, 150 - r.y)
					if (d < GULL_IN) setStage('circling')
					else {
						r.vx = ((above - r.x) / d) * GULL_IN
						r.vy = ((150 - r.y) / d) * GULL_IN
						r.facing = r.vx > 0 ? 1 : -1
						r.x += r.vx
						r.y += r.vy
					}
				} else if (r.stage === 'circling') {
					// Wheeling round over the table, screeching.
					const a = age * 0.09
					r.vx = Math.cos(a) * 2.6
					r.vy = Math.sin(a * 2) * 0.6
					r.facing = r.vx > 0 ? 1 : -1
					r.x += r.vx
					r.y += r.vy
					if (age >= GULL_CIRCLES) {
						// Onto whatever's on the table nearest under it; or the table, if it's bare.
						const slots = show.tables[r.table]
						let target = tableMiddle(r.table)
						let bestD = Number.POSITIVE_INFINITY
						slots.forEach((item, slot) => {
							const at = slotAt(r.table, slot)
							const d = Math.abs(at.x - r.x)
							if (item >= 0 && d < bestD) {
								bestD = d
								target = at.x
							}
						})
						r.dive = { x0: r.x, y0: r.y, x1: target, y1: TABLE_TOP + 2 }
						setStage('diving')
						play('whoosh')
					}
				} else if (r.stage === 'diving' && r.dive) {
					const u = Math.min(1, age / GULL_DIVES)
					const { x0, y0, x1, y1 } = r.dive
					const nx = x0 + (x1 - x0) * u
					const ny = y0 + (y1 - y0) * Math.sin((u * Math.PI) / 2)
					r.vx = nx - r.x
					r.vy = ny - r.y
					if (Math.abs(r.vx) > 0.2) r.facing = r.vx > 0 ? 1 : -1
					r.x = nx
					r.y = ny
					if (u >= 1) {
						steal()
						r.side = Math.random() < 0.5 ? -1 : 1
						r.vx = r.side * 2.5
						r.vy = -1
					}
				} else {
					// Up and away, climbing as it goes.
					r.vy = Math.max(-5, r.vy - (r.stage === 'fleeing' ? 0.3 : 0.12))
					r.vx += (r.side * 4.5 - r.vx) * 0.06
					r.facing = r.vx > 0 ? 1 : -1
					r.x += r.vx
					r.y += r.vy
					if (r.y < -60) return false
				}
				break
			}
			case 'moose': {
				r.shoo = Math.max(0, r.shoo - MOOSE_CALMS)
				// Its head over the table's end, from whichever side it's come.
				const stop = r.side < 0 ? from - 10 : to + 10
				if (r.stage === 'coming') {
					if (toward(stop, MOOSE_IN)) setStage('stealing')
				} else if (r.stage === 'stealing') {
					r.facing = r.side < 0 ? 1 : -1
					if (age > 0 && age % MOOSE_MUNCHES === 0) {
						const mouth = r.x + r.facing * 38
						const item = takeFrom(r.table, mouth)
						if (item === undefined) setStage('leaving')
						else {
							world.popup('Munch!', mouth, TABLE_TOP - 70)
							play('fika')
						}
					}
				} else toward(edgeX(r.side), MOOSE_OUT)
				break
			}
		}
		if (offScreen(r.x) && (r.stage === 'leaving' || r.stage === 'fleeing')) {
			if (r.loot !== undefined)
				world.popup(
					'Gone!',
					r.side < 0 ? ARENA_LEFT + 80 : ARENA_LEFT + VIEW_WIDTH - 80,
					GROUND_Y - 120,
				)
			return false
		}
		return true
	}

	/** Everyone and the raiders: seen off, bounced on, shoving a moose, shoved by a goose. */
	function meet() {
		const now = world.ticks()
		racers.forEach((racer, i) => {
			const b = racer.body
			if (b.knockedDown > 0) return
			for (const r of show.raiders) {
				if (r.stage === 'fleeing') continue
				if (r.kind === 'moose') {
					if (r.stage === 'leaving') continue
					if (landedOn(racer, i, r)) {
						bounce(racer, r.y - RAIDER_SIZE.moose.tall)
						r.shoo += MOOSE_BOUNCE
						world.popup('Shoo!', r.x, r.y - 110)
						play('stomp')
					} else if (touching(racer, r)) r.shoo += MOOSE_SHOVE
					if (r.shoo >= MOOSE_FED_UP) {
						r.stage = 'leaving'
						r.since = now
						r.side = r.x < START_X ? -1 : 1
						shooed[i]++
						world.popup('Off it goes!', r.x, r.y - 120)
						play('cheer')
					}
					continue
				}
				if (r.kind === 'goose') {
					if (r.stage === 'leaving' && r.loot === undefined) continue
					if (landedOn(racer, i, r)) {
						bounce(racer, r.y - RAIDER_SIZE.goose.tall)
						shoo(r, i)
					} else if (
						touching(racer, r) &&
						b.grounded &&
						now - (r.last ?? -99) > 30
					) {
						// Sturdy: it hisses, and shoves them back.
						r.last = now
						const away = Math.sign(b.x - r.x) || -r.facing
						b.vx = away * GOOSE_SHOVE
						b.x = r.x + away * (HITBOX_HALF_WIDTH + RAIDER_SIZE.goose.half)
						world.popup('Hiss!', r.x, r.y - 50)
					}
					continue
				}
				// Gulls and squirrels: just catch them.
				if (touching(racer, r)) shoo(r, i)
			}
		})
	}

	/** Dropped fika, a tick: falling, bouncing on the lawn, rolling to a stop; or carried, up over a head. */
	function moveLoose() {
		for (const l of [...show.loose]) {
			if (l.carrier !== undefined) {
				const at = heldAt(racers[l.carrier])
				l.x = at.x
				l.y = at.y
				l.vx = 0
				l.vy = 0
				continue
			}
			const wasY = l.y
			l.vy += FALL
			l.x += l.vx
			l.y += l.vy
			l.x = Math.max(
				ARENA_LEFT + 20,
				Math.min(ARENA_LEFT + VIEW_WIDTH - 20, l.x),
			)
			// Onto a table, from over it: back on it, if there's room.
			for (const team of [0, 1]) {
				const { from, to } = tableSpan(team)
				if (l.x > from && l.x < to && wasY <= TABLE_TOP && l.y >= TABLE_TOP) {
					if (putOn(team, l.item)) {
						show.loose.splice(show.loose.indexOf(l), 1)
						world.popup('Saved!', l.x, TABLE_TOP - 40)
					} else {
						l.y = TABLE_TOP
						l.vy = 0
					}
				}
			}
			if (l.y >= GROUND_Y) {
				l.y = GROUND_Y
				l.vy = l.vy > 1.5 ? -l.vy * GROUND_BOUNCE : 0
				l.vx *= ROLL_KEEP
			}
		}
	}

	/** Everyone and the fika lying about: picked up, hands free; carried home, put on the table. */
	function pickUp() {
		racers.forEach((racer, i) => {
			const b = racer.body
			if (b.knockedDown > 0) return
			const held = holding(i)
			if (held) {
				const team = teamOf(racer)
				const { from, to } = tableSpan(team)
				if (b.x < from || b.x > to) return
				if (!putOn(team, held.item)) return
				show.loose.splice(show.loose.indexOf(held), 1)
				saved[i]++
				if (held.from === 1 - team) poached[i]++
				world.popup(
					held.from === 1 - team ? 'Poached!' : '+1',
					b.x,
					b.feetY - 100,
				)
				play('scan')
				return
			}
			const top = topOf(racer)
			const found = show.loose.find(
				(l) =>
					l.carrier === undefined &&
					Math.abs(l.x - b.x) < HITBOX_HALF_WIDTH + 10 &&
					l.y > top - 6 &&
					l.y - 16 < b.feetY,
			)
			if (!found) return
			found.carrier = i
			play('fika')
		})
	}

	function decide(team: number) {
		if (world.order()) return
		winner = team
		final = counts()
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
				: solo
					? won(players[0])
						? 'You win!'
						: `${TEAM_NAMES[team]} win!`
					: `${TEAM_NAMES[team]} win!`
		world.popup(said, START_X, GROUND_Y - 260)
		play('finished')
	}

	// --- The bot --------------------------------------------------------------------
	const skills = new Map<string, number>()
	const skillOf = (racer: Racer) => {
		let skill = skills.get(racer.id)
		if (skill === undefined) {
			skill = 0.35 + Math.random() * 0.65
			skills.set(racer.id, skill)
		}
		return skill
	}
	/** What each bot's after, and till when, by the world's ticks. */
	const after = new Map<
		string,
		{ raider?: number; loose?: number; until: number }
	>()
	const jumps = new Map<string, number>()

	function bot(racer: Racer): Controls {
		if (world.order()) return IDLE
		const b = racer.body
		const i = racers.indexOf(racer)
		const team = teamOf(racer)
		const now = world.ticks()
		const skill = skillOf(racer)
		const jump = (hold = 8) => {
			if (b.grounded && now > (jumps.get(racer.id) ?? 0) + 4)
				jumps.set(racer.id, now + hold)
		}
		const mid = tableMiddle(team)
		let aim = mid
		let down = false
		if (holding(i)) aim = mid
		else {
			let plan = after.get(racer.id)
			if (!plan || now >= plan.until) {
				// The worst thief near their table, what's lying about, a thief
				// running off with the other team's: whichever's best worth it.
				const mates = teamMates(team).filter((r) => r !== racer)
				const taken = new Set(mates.map((m) => after.get(m.id)?.raider))
				let best: { raider?: number; loose?: number; score: number } = {
					score: 40,
				}
				for (const r of show.raiders) {
					if (r.stage === 'fleeing') continue
					if (r.kind === 'moose' && r.stage === 'leaving') continue
					const ours = r.table === team && r.loot === undefined
					const ourLoot = r.loot !== undefined && r.lootFrom === team
					const theirs = r.loot !== undefined && r.lootFrom !== team
					if (!ours && !ourLoot && !(theirs && skill > 0.6)) continue
					if (r.kind === 'gull' && r.stage === 'coming') continue
					const score =
						180 +
						(r.kind === 'moose' ? 90 : 0) +
						(ourLoot ? 60 : 0) +
						(theirs ? -40 : 0) -
						Math.abs(r.x - b.x) * 0.35 -
						(taken.has(r.id) && r.kind !== 'moose' ? 90 : 0) +
						Math.random() * 30
					if (score > best.score) best = { raider: r.id, score }
				}
				for (const l of show.loose) {
					if (l.carrier !== undefined) continue
					const score = 150 - Math.abs(l.x - b.x) * 0.3 + Math.random() * 20
					if (score > best.score) best = { loose: l.id, score }
				}
				plan = {
					raider: best.raider,
					loose: best.loose,
					until: now + 10 + Math.random() * 14 + (1 - skill) * 24,
				}
				after.set(racer.id, plan)
			}
			const r = show.raiders.find((x) => x.id === plan.raider)
			const l = show.loose.find(
				(x) => x.id === plan.loose && x.carrier === undefined,
			)
			if (r && r.stage !== 'fleeing') {
				const dx = r.x - b.x
				aim = r.x
				switch (r.kind) {
					case 'goose':
						// Right up to it, and straight up, to come down on its head.
						if (Math.abs(dx) < 16 + (1 - skill) * 10) jump(14)
						if (!b.grounded) aim = r.x + r.vx * 6
						break
					case 'squirrel':
						// Up on the table after it, or a jump as it comes, to catch it in the air.
						if (r.y < GROUND_Y - 20 && Math.abs(dx) < 70) jump(14)
						else if (Math.abs(dx) < 46 + skill * 20) jump(10)
						break
					case 'gull': {
						// Under it, and up into it as it comes down.
						const reach = b.feetY - 150
						if (r.stage === 'circling') {
							aim = r.x
							// Up on the table to meet it, the keen ones.
							if (
								skill > 0.55 &&
								b.on === undefined &&
								Math.abs(dx) < 60 &&
								Math.abs(b.x - mid) < TABLE_W / 2
							)
								jump(12)
						}
						if (r.y > reach && Math.abs(dx) < 70) jump(14)
						break
					}
					case 'moose':
						// Shoving it, and up onto its back now and again.
						aim = r.x
						if (Math.abs(dx) < 50 && Math.random() < 0.02 + skill * 0.03)
							jump(16)
						break
				}
			} else if (l) {
				aim = l.x
				if (l.y < b.feetY - 60 && Math.abs(l.x - b.x) < 30) jump(10)
			} else {
				// Nothing to be after: on guard round their table, spread out.
				const mates = teamMates(team)
				const k = mates.indexOf(racer)
				const { from, to } = tableSpan(team)
				const posts = [from + 50, to + 40, to - 50, from - 30]
				aim =
					team === 0
						? posts[k % posts.length]
						: from + to - posts[k % posts.length]
				aim += Math.sin(now / 50 + k) * 16
				// Down off the table, if they're stood on it with nothing to do.
				if (b.on !== undefined && Math.random() < 0.02) down = true
			}
		}
		const dx = aim - b.x
		const go = Math.abs(dx) > 6 ? Math.sign(dx) : 0
		return {
			left: go < 0,
			right: go > 0,
			up: now < (jumps.get(racer.id) ?? 0),
			down,
		}
	}

	const run: MinigameRun = {
		id: 'fika-defence',
		ticksLeft,
		chip: (racer) => `${TEAM_NAMES[teamOf(racer)]} ${counts()[teamOf(racer)]}`,
		score: (racer) => {
			const i = racers.indexOf(racer)
			return counts()[teamOf(racer)] * 1000 + shooed[i] * 10 + saved[i]
		},
		note: (racer) => {
			const i = racers.indexOf(racer)
			const bits = [`${shooed[i]} shooed`]
			if (saved[i]) bits.push(`${saved[i]} saved`)
			if (poached[i]) bits.push(`${poached[i]} poached`)
			const did = bits.join(', ')
			if (winner === undefined) return `${TEAM_NAMES[teamOf(racer)]} · ${did}`
			if (winner < 0) return `Drew ${score(racer)} · ${did}`
			return `${won(racer) ? 'Won' : 'Lost'} ${score(racer)} · ${did}`
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
		tagRise: (racer) => (holding(racers.indexOf(racer)) ? 26 : 0),
		announce: () => {
			if (world.order()) return undefined
			const t = world.raceTicks()
			if (t >= DEFENCE_TICKS)
				return t - DEFENCE_TICKS < ANNOUNCED_FOR
					? 'Next change wins!'
					: undefined
			for (const at of MOOSE_AT)
				if (t >= at && t - at < ANNOUNCED_FOR) return 'Moose!'
			const into = t - (DEFENCE_TICKS - FRENZY_TICKS)
			return into >= 0 && into < ANNOUNCED_FOR ? 'Fika frenzy!' : undefined
		},
		bot,
		step() {
			keepHats()
			if (world.phase() !== 'running') return
			// Nobody past the walls; anyone carrying, slowed by it.
			racers.forEach((racer, i) => {
				const b = racer.body
				if (b.x < LEFT) {
					b.x = LEFT
					b.vx = Math.max(0, b.vx)
				} else if (b.x > RIGHT) {
					b.x = RIGHT
					b.vx = Math.min(0, b.vx)
				}
				if (holding(i))
					b.vx = Math.max(-CARRY_SPEED, Math.min(CARRY_SPEED, b.vx))
				b.celebrating = won(racer)
			})

			if (!world.order()) {
				// Bounced on: whatever they're carrying, dropped.
				racers.forEach((racer, i) => {
					const bounced = racer.body.stomped > guarded[i]
					guarded[i] = racer.body.stomped
					const held = bounced ? holding(i) : undefined
					if (!held) return
					held.carrier = undefined
					held.vx = (Math.random() - 0.5) * 5
					held.vy = -4
					world.popup('Dropped it!', held.x, held.y - 30)
					play('stomp')
				})

				// More raiders, quicker as it goes on, and quickest at the end.
				const t = world.raceTicks()
				if (t >= nextRaid) {
					const busy = show.raiders.filter(
						(r) =>
							r.kind !== 'moose' &&
							r.stage !== 'leaving' &&
							r.stage !== 'fleeing',
					).length
					const most = 2 + Math.ceil(racers.length / 2) + (frenzy() ? 2 : 0)
					if (busy < most) {
						const kinds: [RaiderKind, number][] = [
							['goose', 4],
							['gull', t >= GULLS_FROM ? (frenzy() ? 6 : 3) : 0],
							['squirrel', t >= SQUIRRELS_FROM ? 3 : 0],
						]
						const all = kinds.reduce((n, [, w]) => n + w, 0)
						const pick = Math.random() * all
						let sum = 0
						const kind =
							kinds.find(([, w]) => {
								sum += w
								return pick < sum
							})?.[0] ?? 'goose'
						send(kind)
						// In the frenzy, gulls come in twos.
						if (frenzy() && kind === 'gull' && Math.random() < 0.5) send('gull')
					}
					const share = Math.min(1, t / (DEFENCE_TICKS - FRENZY_TICKS))
					const every =
						frenzy() || suddenDeath()
							? RAID_FRENZY
							: RAID_FIRST + (RAID_LAST - RAID_FIRST) * share
					// More of them, the more there are to see them off.
					const crowd = (4 / Math.max(4, racers.length)) ** 0.7
					nextRaid = t + Math.round(every * crowd * (0.7 + Math.random() * 0.6))
				}
				// A moose, at its time, at the richer table; the next, at the other.
				if (moosesSent < MOOSE_AT.length && t >= MOOSE_AT[moosesSent]) {
					const c = counts()
					const table =
						moosesSent === 0
							? c[0] === c[1]
								? Math.random() < 0.5
									? 0
									: 1
								: c[0] > c[1]
									? 0
									: 1
							: 1 -
								(show.raiders.find((r) => r.kind === 'moose')?.table ??
									(c[0] > c[1] ? 1 : 0))
					send('moose', table)
					moosesSent++
				}
			}

			show.raiders = show.raiders.filter(moveRaider)
			if (!world.order()) {
				meet()
				pickUp()
			}
			moveLoose()
			racers.forEach((racer, i) => {
				lastFeet[i] = racer.body.feetY
			})

			// Over: at the minute, unless it's level; then the first to be
			// ahead, or a draw, if neither is in time.
			if (world.order()) return
			const t = world.raceTicks()
			const [red, blue] = counts()
			// A table stripped bare, and it's over there and then.
			if (red === 0 && blue > 0) decide(1)
			else if (blue === 0 && red > 0) decide(0)
			else if (t >= DEFENCE_TICKS && red !== blue) decide(red > blue ? 0 : 1)
			else if (t >= DEFENCE_TICKS + EXTRA_TICKS) decide(-1)
		},
		frame(): MinigameFrame {
			const r1 = (n: number) => Math.round(n * 10) / 10
			return {
				fikaTables: [[...show.tables[0]], [...show.tables[1]]],
				fikaRaiders: show.raiders.map((r) => [
					r.id,
					RAIDER_KINDS.indexOf(r.kind),
					r1(r.x),
					r1(r.y),
					RAIDER_STAGES.indexOf(r.stage),
					r.since,
					r.facing,
					r.loot ?? -1,
					Math.round(r.shoo),
				]),
				fikaLoose: show.loose.map((l) => [
					l.id,
					l.item,
					r1(l.x),
					r1(l.y),
					l.carrier ?? -1,
				]),
				teams: racers.map(teamOf),
				winner: winner ?? -2,
			}
		},
		apply(a, b, share) {
			const mixer = <T extends number[]>(list: T[] | undefined) => {
				const next = new Map((list ?? []).map((e) => [e[0], e]))
				return (id: number, from: number, i: number) => {
					const to = next.get(id)
					return to ? from + ((to[i] as number) - from) * share : from
				}
			}
			if (a.fikaTables)
				show.tables = [[...a.fikaTables[0]], [...a.fikaTables[1]]]
			const mixR = mixer(b?.fikaRaiders)
			show.raiders = (a.fikaRaiders ?? []).map(
				([id, kind, x, y, stage, since, facing, loot, shooed]) => ({
					id,
					kind: RAIDER_KINDS[kind] ?? 'goose',
					x: mixR(id, x, 2),
					y: mixR(id, y, 3),
					vx: 0,
					vy: 0,
					stage: RAIDER_STAGES[stage] ?? 'coming',
					since,
					table: 0,
					side: facing < 0 ? -1 : 1,
					facing: facing < 0 ? -1 : 1,
					loot: loot < 0 ? undefined : loot,
					shoo: shooed,
				}),
			)
			const mixL = mixer(b?.fikaLoose)
			show.loose = (a.fikaLoose ?? []).map(([id, item, x, y, carrier]) => ({
				id,
				item,
				x: mixL(id, x, 2),
				y: mixL(id, y, 3),
				vx: 0,
				vy: 0,
				carrier: carrier < 0 ? undefined : carrier,
			}))
			// The Host's teams, and their hats to go with them.
			a.teams?.forEach((team, i) => {
				const racer = racers[i]
				if (!racer) return
				teams.set(racer.id, team)
				racer.body.hat = teamHat(team)
			})
			if (a.teams) keepHats()
			winner = a.winner === undefined || a.winner < -1 ? undefined : a.winner
			for (const racer of racers) racer.body.celebrating = won(racer)
		},
	}
	return run
}
