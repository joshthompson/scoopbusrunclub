import {
	AUTUMN_FAR_FILL,
	AUTUMN_GRASS,
	AUTUMN_GRASS_SHADE,
	AUTUMN_PATH,
	AUTUMN_PATH_SHADE,
	AUTUMN_SKY_BOTTOM,
	AUTUMN_SKY_TOP,
	type LadderArt,
	autumnBranch,
	autumnFar,
	autumnLadder,
	autumnNear,
} from '../courses/kit/autumnForestScenery'
import type { PlatformDefinition } from '../courses/types'
import { BOMB_HEADS } from '../draw/art/bombHeads'
import {
	GROUND_Y,
	HITBOX_HALF_WIDTH,
	RUN_TOP_SPEED,
	TICK_MS,
} from '../game/constants'
import type { Hat } from '../game/hats'
import { type Racer, type World, bodyHeight } from '../game/world'
import type { Controls } from '../input'
import { play } from '../sfx'
import { ARENA_LEFT, ARENA_WALLS, arenaCourse, inRandomOrder } from './arena'
import { clock } from './clock'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Bomb Hat: a clearing in an autumn forest, and one of them, picked at
 * random, wearing a gigantic papier-mâché bomb for a head, a creature's
 * face painted on it, blinking, and its fuse lit. Whoever has it on is a
 * little slower, and has till the fuse burns down to touch someone else
 * with it: it jumps onto their head, fuse and all, still burning. Nobody
 * can pass it straight back. When it burns down, it goes off, and whoever
 * has it on is blown up: out, sat in the leaves, smoking. Then a new bomb,
 * a different creature, on someone else still in, its fuse lit afresh. Up
 * a ladder there's a branch to run along either side, and a higher one in
 * the middle to jump up to, for more room to get away. The
 * last one not blown up wins.
 */

/** How long a bomb's fuse burns: 15 seconds, however many heads it's on in that time. */
export const FUSE_TICKS = Math.round(15_000 / TICK_MS)
/** How long between one bomb going off and the next being lit, on someone else. */
const BETWEEN_TICKS = 120
/** How long before the first bomb's lit, after "Go!": everyone sees who's got it first. */
const FIRST_LIT = 30
/** How long a bomb takes, hopping from one head to the next. */
export const HOP_TICKS = 12
/** How long after it's passed it can't be again: no passing it straight back. */
const PASS_COOLDOWN = 40
/**
 * How fast whoever's got it on can run, at most, as a share of everyone
 * else's: a little slower, to begin with, and less so as fewer are left,
 * so it's a closer chase.
 */
const SLOW_FIRST = 0.8
const SLOW_LAST = 0.9
/** How much bigger than them their touch is, with the bomb on: it's huge. */
const BOMB_WIDER = 10
const BOMB_TALLER = 16
/** How far down over the top of someone's head counts as on top of it: a bonk, not a touch. */
const ON_TOP = 6
/** How hard the blast throws whoever it was on: up, and back. */
const BLAST_UP = 7
const BLAST_BACK = 2.2
/** How far down from the top of their head the bomb's neck hole sits: over their shoulders. */
export const NECK_DOWN = 20
/** How high its fuse stands up out of its collar, unburnt, in px (see `draw/bombHat`). */
export const FUSE_TALL = 42
/** How far its spark reaches up over the fuse's end, not counting its glow. */
const SPARK_REACH = 8
/** How fast anyone goes up or down a ladder, a tick; and with the bomb on, as a share of that. */
const CLIMB = 2.4
const CLIMB_WITH_BOMB = 0.8
/** How near a ladder's middle someone has to be to get on it. */
const LADDER_REACH = 14
/** How high the branches are over the ground: the low ones, too high to jump onto, and the one in the middle. */
const LOW = 112
const HIGH = 204

/**
 * The branches to run along, by where they are across the screen, off the
 * two great trees right in front either side (see `autumnNearTrunk`),
 * coming out from behind them: a low one each, up a ladder, and a long
 * high one off the left one, out over the middle, to jump up to.
 */
export const BRANCH_SPOTS: {
	from: number
	cells: number
	height: number
	side: 'left' | 'right'
	tones: number
}[] = [
	{ from: 40, cells: 114, height: LOW, side: 'left', tones: 0 },
	{ from: 40, cells: 280, height: HIGH, side: 'left', tones: 0 },
	{ from: 660, cells: 130, height: LOW, side: 'right', tones: 2 },
]
const BRANCHES: PlatformDefinition[] = BRANCH_SPOTS.map((b, i) => {
	const art = autumnBranch(b.cells, b.side, b.tones, i + 3)
	return {
		x: ARENA_LEFT + b.from,
		width: art.width,
		height: b.height,
		art: { asset: art.src, width: art.width, height: art.height, top: art.top },
	}
})

/** A ladder: its middle across the world, up to the top of the branch it's against, and its picture. */
export interface Ladder {
	x: number
	top: number
	branch: number
	art: LadderArt
}
/** How far a ladder's top stands up over its branch, in px: hooked over it. */
const LADDER_OVER = 10
/** The ladders, up to each low branch, near their tips. */
export const LADDERS: Ladder[] = [
	{ x: ARENA_LEFT + 236, branch: 0 },
	{ x: ARENA_LEFT + 708, branch: 2 },
].map(({ x, branch }) => ({
	x,
	branch,
	top: GROUND_Y - BRANCHES[branch].height,
	art: autumnLadder(Math.round((BRANCHES[branch].height + LADDER_OVER) / 2)),
}))

/** How long "Owl bomb!" is up, big, as each bomb's lit. */
const ANNOUNCED_FOR = 70

/**
 * The creatures the bombs are made as, one after another, in a different
 * order every game: their faces are `BOMB_HEADS` (see `draw/art/bombHeads`),
 * in this order.
 */
export const BOMB_KINDS = [
	'Frog',
	'Owl',
	'Pig',
	'Fox',
	'Ladybird',
	'Hedgehog',
	'Cat',
	'Octopus',
	'Llama',
	'Mountain goat',
	'Axolotl',
] as const

/** A bomb going off, where and when (the race's ticks), and which creature it was. */
export interface Blast {
	x: number
	y: number
	at: number
	kind: number
}

/**
 * The bomb, as it is: on whose head, by their place in the racers (-1 none,
 * between bombs); when its fuse was lit (the race's ticks); which creature
 * it is; who it was passed from last (-1 nobody), and when; how many have
 * been lit; and when the next is to be, between bombs.
 */
export interface Bomb {
	holder: number
	litAt: number
	kind: number
	from: number
	passedAt: number
	count: number
	nextAt: number
}

/** What's to be drawn of a game of Bomb Hat: the bomb, the blasts, and who's been blown up, when, by id. */
export interface BombShow {
	bomb: Bomb
	blasts: Blast[]
	blownAt: Map<string, number>
	racers: Racer[]
	/** Whether the fuse is burning: from its lighting, till it goes off. */
	burning: () => boolean
	/** How much of the fuse is left, 1 to 0. */
	fuseLeft: () => number
}
const shows = new WeakMap<World, BombShow>()

/** `world`'s game of Bomb Hat, for drawing, if it's one. */
export const bombOf = (world: World) => shows.get(world)

export const bombHat: Minigame = {
	id: 'bomb-hat',
	name: 'Bomb Hat',
	blurb:
		"Got the bomb on your head? Touch someone to pass it on before the fuse burns down! It's heavy: you're a little slower. Last one not blown up wins!",
	tune: 'huddinge',
	collectables: [],
	course: {
		...arenaCourse(
			'bomb-hat',
			'Bomb Hat',
			'Pass the bomb on before it goes off. Last one standing wins!',
			// A clearing in a forest in autumn, the leaves turning and falling
			// (see `arenaSets`).
			{
				palette: {
					'--sky-blue-top': AUTUMN_SKY_TOP,
					'--sky-blue-bottom': AUTUMN_SKY_BOTTOM,
					'--grass-green': AUTUMN_GRASS,
					'--grass-dark-green': AUTUMN_GRASS_SHADE,
					'--grass-darker-green': AUTUMN_GRASS_SHADE,
					'--dirt-brown': AUTUMN_PATH,
					'--dirt-dark-brown': AUTUMN_PATH_SHADE,
					'--dirt-darker-brown': AUTUMN_PATH_SHADE,
				},
				horizon: { far: autumnFar, near: autumnNear, fill: AUTUMN_FAR_FILL },
				far: [],
				near: [],
				horizonTrees: false,
			},
		),
		platforms: BRANCHES,
	},
	start: startBombHat,
}

function startBombHat(world: World): MinigameRun {
	const { racers } = world
	const { left, right } = ARENA_WALLS
	const solo = racers.length === 1
	/** When each was blown up, by the race's ticks, by id. */
	const blownAt = new Map<string, number>()
	const blasts: Blast[] = []
	/** The creatures, in this game's order. */
	const kinds = inRandomOrder(BOMB_KINDS.map((_, i) => i))
	/** How many times each has passed the bomb on, by their place in the racers. */
	const tags = racers.map(() => 0)
	/** The hat each had on, put by while the bomb's on them, by id. */
	const putBy = new Map<string, Hat>()

	// Everyone spread out across the clearing, in no particular order, facing in.
	inRandomOrder(racers).forEach((racer, i) => {
		const b = racer.body
		const x = left + 60 + ((right - left - 120) * (i + 0.5)) / racers.length
		b.x = Math.round(x)
		b.feetY = world.terrain.groundY(b.x)
		b.floor = b.feetY
		b.facing = x < (left + right) / 2 ? 1 : -1
		b.ducking = false
	})

	const bomb: Bomb = {
		holder: -1,
		litAt: FIRST_LIT,
		kind: kinds[0],
		from: -1,
		passedAt: -99,
		count: 0,
		nextAt: -1,
	}

	const blown = (racer: Racer) => blownAt.has(racer.id)
	const standing = () => racers.filter((r) => !blown(r))
	const holderOf = () =>
		bomb.holder < 0 ? undefined : (racers[bomb.holder] as Racer | undefined)
	const burning = () =>
		bomb.holder >= 0 && world.raceTicks() >= bomb.litAt && !world.order()
	const fuseTicksLeft = () =>
		Math.max(0, FUSE_TICKS - Math.max(0, world.raceTicks() - bomb.litAt))
	const fuseLeft = () => fuseTicksLeft() / FUSE_TICKS

	shows.set(world, {
		bomb,
		blasts,
		blownAt,
		racers,
		burning,
		fuseLeft,
	})

	/** The bomb onto `racer`'s head: their own hat put by while it's on. */
	function wear(racer: Racer) {
		const b = racer.body
		if (b.hat) {
			putBy.set(racer.id, b.hat)
			b.hat = undefined
		}
	}
	/** Off `racer`'s head: their own hat back on. */
	function unwear(racer: Racer) {
		const hat = putBy.get(racer.id)
		if (!hat) return
		racer.body.hat = hat
		putBy.delete(racer.id)
	}

	/** A new bomb, a different creature, on someone still in, picked at random, lit at `at`. */
	function light(at: number) {
		const up = standing()
		if (!up.length) return
		const who = up[Math.floor(Math.random() * up.length)]
		bomb.holder = racers.indexOf(who)
		bomb.litAt = at
		bomb.kind = kinds[bomb.count % kinds.length]
		bomb.from = -1
		bomb.passedAt = -99
		bomb.count++
		bomb.nextAt = -1
		wear(who)
	}
	// The first, on someone from the start, there under the start screen.
	light(FIRST_LIT)

	/** How fast the one with it on can go: slower, less so with fewer left. */
	function bombSpeed() {
		const gone = racers.length > 2 ? blownAt.size / (racers.length - 2) : 1
		const share = SLOW_FIRST + (SLOW_LAST - SLOW_FIRST) * Math.min(1, gone)
		return RUN_TOP_SPEED * share
	}

	/**
	 * Whether `a`, the one with the bomb on, is touching `b`: the bomb's
	 * huge, so they're bigger. Not `b` coming down on top of them, on their
	 * head or the bomb: that's a bonk, and it's not passed on to whoever
	 * does it. Coming down on `b`'s head with it on, though, is.
	 */
	function touching(a: Racer, b: Racer) {
		const ab = a.body
		const bb = b.body
		const reach = HITBOX_HALF_WIDTH * 2 + BOMB_WIDER
		if (Math.abs(ab.x - bb.x) > reach) return false
		const head = ab.feetY - bodyHeight(ab)
		// Over their head, or on top of the bomb: a bonk on them.
		if (bb.feetY <= head + ON_TOP) return false
		const aTop = head - BOMB_TALLER
		const bTop = bb.feetY - bodyHeight(bb)
		// Down on `b`'s head, their feet just on it: touching.
		return aTop < bb.feetY && bTop <= ab.feetY + ON_TOP
	}

	function pass(from: Racer, to: Racer) {
		unwear(from)
		wear(to)
		bomb.from = bomb.holder
		tags[bomb.holder]++
		bomb.holder = racers.indexOf(to)
		bomb.passedAt = world.raceTicks()
		world.popup('Tag!', to.body.x, to.body.feetY - 110)
		play('pop')
	}

	/** Who's on a ladder: which, and how high up it their feet are. */
	const climbing = new Map<string, { ladder: number; y: number }>()
	const groundAt = (x: number) => world.terrain.groundY(x)
	/** The top of ladder `l`'s branch, where it's climbed to. */
	const topOf = (l: Ladder) =>
		groundAt(l.x) - (world.platforms[l.branch]?.height ?? LOW)
	/** Which level someone's on: 0 the ground, 1 a low branch (or on the way up), 2 the high one. */
	const levelOf = (racer: Racer) => {
		const up = groundAt(racer.body.x) - racer.body.feetY
		return up > (LOW + HIGH) / 2 ? 2 : up > LOW / 2 ? 1 : 0
	}

	function grab(racer: Racer, ladder: number, y: number) {
		const b = racer.body
		climbing.set(racer.id, { ladder, y })
		b.vx = 0
		b.vy = 0
		b.grounded = false
		b.on = undefined
		b.ducking = false
		b.jumping = false
	}

	/**
	 * Ladders, a tick: on one, holding up or down to go up or down it, and
	 * stepping off it either way; off the top onto its branch, off the
	 * bottom onto the ground. Or getting on one: holding up at it, or down
	 * at its top.
	 */
	function climb(racer: Racer) {
		const b = racer.body
		const held = racer.controls()
		const on = climbing.get(racer.id)
		if (!on) {
			if (!held.up && !held.down) return
			const index = LADDERS.findIndex((l) => Math.abs(b.x - l.x) < LADDER_REACH)
			if (index < 0) return
			const l = LADDERS[index]
			const top = topOf(l)
			// Up it, from anywhere below its top; down it, from at its top.
			if (held.up && b.feetY > top + 4 && b.feetY <= groundAt(l.x) + 1)
				grab(racer, index, b.feetY)
			else if (held.down && Math.abs(b.feetY - top) < 14)
				grab(racer, index, Math.max(top, b.feetY))
			return
		}
		const l = LADDERS[on.ladder]
		const top = topOf(l)
		const ground = groundAt(l.x)
		// Stepping off it, sideways: dropping off.
		if (held.left !== held.right && !held.up && !held.down) {
			climbing.delete(racer.id)
			b.vx = held.right ? 2 : -2
			b.vy = 0
			return
		}
		const way = Number(!!held.down) - Number(!!held.up)
		on.y += way * CLIMB * (holderOf() === racer ? CLIMB_WITH_BOMB : 1)
		b.x += (l.x - b.x) * 0.5
		b.vx = 0
		b.vy = 0
		b.grounded = false
		b.on = undefined
		b.jumping = false
		b.ducking = false
		// Up onto its branch: just over it, to land on it.
		if (on.y <= top - 2) {
			climbing.delete(racer.id)
			b.feetY = top - 2
			b.vy = 1
			return
		}
		// Down onto the ground.
		if (on.y >= ground) {
			climbing.delete(racer.id)
			b.feetY = ground - 1
			b.vy = 1
			return
		}
		b.feetY = on.y
		// Hand over hand: turning one way then the other as they go.
		if (way) b.facing = Math.floor(on.y / 14) % 2 ? 1 : -1
	}

	function explode(racer: Racer) {
		climbing.delete(racer.id)
		const b = racer.body
		const at = world.raceTicks()
		blownAt.set(racer.id, at)
		blasts.push({
			x: b.x,
			y: b.feetY - bodyHeight(b) + 6,
			at,
			kind: bomb.kind,
		})
		// Their own hat blown off them, flying.
		const hat = putBy.get(racer.id)
		putBy.delete(racer.id)
		if (hat) b.lostHat = { hat, at: world.ticks() }
		// Thrown up and back by it.
		b.vy = -BLAST_UP
		b.vx = -b.facing * BLAST_BACK
		b.grounded = false
		bomb.holder = -1
		bomb.from = -1
		bomb.nextAt = at + BETWEEN_TICKS
		world.popup(
			solo ? `Lasted ${clock(at, 'down')}` : 'BOOM!',
			b.x,
			b.feetY - 120,
		)
		play('meteorHit')
	}

	/** Over: one left not blown up (or none, on your own). */
	function decide() {
		if (world.order()) return
		const up = standing().length
		if (!(up === 0 || (!solo && up <= 1))) return
		const order = [...racers].sort(
			(a, b) =>
				(blownAt.get(b.id) ?? Number.POSITIVE_INFINITY) -
				(blownAt.get(a.id) ?? Number.POSITIVE_INFINITY),
		)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		climbing.clear()
		const winner = order[0]
		// The winner's hat back on, to dance in.
		if (!blown(winner)) unwear(winner)
		bomb.holder = -1
		world.popup(
			solo
				? `Lasted ${clock(blownAt.get(winner.id) ?? 0, 'down')}`
				: `${winner.runner.name} wins!`,
			winner.body.x,
			winner.body.feetY - 120,
		)
		play('finished')
	}

	/** ", 3 tags", or nothing, none. */
	const tagged = (racer: Racer) => {
		const n = tags[racers.indexOf(racer)] ?? 0
		return n ? ` · ${n} tag${n === 1 ? '' : 's'}` : ''
	}

	const done = (racer: Racer) => !!world.order() && !blown(racer)
	/** What each bot's decided to hold, and till when: it only looks so often. */
	const choices = new Map<string, { held: Controls; until: number }>()

	/** Whoever's nearest `racer`, of `others`, and how far off (right's positive). */
	function nearest(racer: Racer, others: Racer[]) {
		let best: Racer | undefined
		let dx = 0
		let far = Number.POSITIVE_INFINITY
		for (const other of others) {
			if (other === racer) continue
			const d = other.body.x - racer.body.x
			// Up a level's further off than it looks: there's a ladder in the way.
			const off = Math.abs(d) + Math.abs(levelOf(other) - levelOf(racer)) * 200
			if (off < far) {
				best = other
				dx = d
				far = off
			}
		}
		return best && { racer: best, dx }
	}

	/**
	 * A bot with the bomb on: after whoever's nearest, jumping as they
	 * near them if they're jumping, or might jump over; a little late, and
	 * occasionally not at all.
	 */
	function chase(racer: Racer): Controls {
		const near =
			nearest(
				racer,
				standing().filter((r) => racers.indexOf(r) !== bomb.from),
			) ?? nearest(racer, standing())
		if (!near) return IDLE
		const b = racer.body
		const t = near.racer.body
		const way = Math.sign(near.dx) || 1
		const close = Math.abs(near.dx)
		const mine = levelOf(racer)
		const theirs = climbing.has(near.racer.id) ? 1 : levelOf(near.racer)
		// On a ladder: up it after them, or down.
		if (climbing.has(racer.id))
			return { ...IDLE, up: theirs >= 1, down: theirs < 1 }
		// They're up a branch: to the nearest ladder, and up it.
		if (mine === 0 && theirs >= 1 && t.grounded) {
			const ladder = LADDERS.reduce((a, l) =>
				Math.abs(l.x - b.x) < Math.abs(a.x - b.x) ? l : a,
			)
			const to = ladder.x - b.x
			if (Math.abs(to) < LADDER_REACH - 4) return { ...IDLE, up: true }
			return { ...IDLE, left: to < 0, right: to > 0 }
		}
		// Up on the high one: jumping up to it, near enough under it.
		if (mine === 1 && theirs === 2)
			return {
				left: way < 0,
				right: way > 0,
				up: close < 150 && b.grounded,
				down: false,
			}
		// They're below: dropping down onto them, over them.
		if (mine > theirs && b.grounded)
			return {
				left: way < 0 && close > 20,
				right: way > 0 && close > 20,
				up: false,
				down: close < 60,
			}
		const coming = t.vx * -way > 1
		const up =
			close < 120 &&
			((!t.grounded && t.vy < 0) ||
				(coming && close < 80 && Math.random() < 0.5) ||
				Math.random() < 0.05)
		return {
			left: way < 0,
			right: way > 0,
			up: up && b.grounded,
			down: false,
		}
	}

	/**
	 * A bot without it: off away from whoever has, unless it's cornered
	 * against a wall, when it runs at them and jumps, to get over; and if
	 * the bomb's nowhere near, ambling about.
	 */
	function flee(racer: Racer): Controls {
		const holder = holderOf()
		const b = racer.body
		if (!holder || holder === racer) {
			const drift = Math.sin(world.ticks() / 70 + racers.indexOf(racer) * 2)
			return { ...IDLE, left: drift < -0.6, right: drift > 0.6 }
		}
		const h = holder.body
		const dx = b.x - h.x
		const away = Math.sign(dx) || (b.x < (left + right) / 2 ? 1 : -1)
		const close = Math.abs(dx)
		if (close > 320) {
			const middle = (left + right) / 2
			return { ...IDLE, left: b.x > middle + 200, right: b.x < middle - 200 }
		}
		// On a ladder: on up it, away from them below; down, if they're above.
		if (climbing.has(racer.id)) {
			const above = h.feetY < b.feetY - 20
			return { ...IDLE, up: !above, down: above }
		}
		// Up a ladder, if there's one handy and they're coming.
		if (levelOf(racer) === 0 && levelOf(holder) === 0 && close < 220) {
			const ladder = LADDERS.find(
				(l) => Math.abs(l.x - b.x) < 70 && Math.sign(l.x - b.x) !== -away,
			)
			if (ladder) {
				const to = ladder.x - b.x
				if (Math.abs(to) < LADDER_REACH - 4) return { ...IDLE, up: true }
				return { ...IDLE, left: to < 0, right: to > 0 }
			}
		}
		const room = away > 0 ? right - b.x : b.x - left
		const cornered = room < 90 && close < 200
		if (cornered) {
			// Over them: at them, and up, near enough.
			const jump = close < 95 && b.grounded && Math.random() < 0.8
			return {
				left: away > 0,
				right: away < 0,
				up: jump || (!b.grounded && b.vy < 0),
				down: false,
			}
		}
		// Jumping out of the way of them jumping at it.
		const leaping = !h.grounded && close < 90 && Math.random() < 0.3
		return {
			left: away < 0,
			right: away > 0,
			up: leaping && b.grounded,
			down: false,
		}
	}

	return {
		id: 'bomb-hat',
		// The bomb's on their head: their name up over it, fuse, spark and all,
		// so it never hides how much is left.
		tagRise: (racer) => {
			if (holderOf() !== racer) return 0
			const head = BOMB_HEADS[bomb.kind % BOMB_HEADS.length]
			return head.neck.y - NECK_DOWN - head.fuse.y + FUSE_TALL + SPARK_REACH
		},
		// The bomb's fuse; between bombs, the next one's, all of it.
		ticksLeft: () =>
			world.order() ? 0 : bomb.holder < 0 ? FUSE_TICKS : fuseTicksLeft(),
		chip: (racer) =>
			blown(racer) ? 'Out' : holderOf() === racer ? 'Bomb' : 'In',
		// Still in; then whoever lasted longest.
		score: (racer) => blownAt.get(racer.id) ?? Number.POSITIVE_INFINITY,
		timeNote: (racer) => {
			const at = blownAt.get(racer.id)
			if (at !== undefined) return `Lasted ${clock(at, 'down')}`
			return world.order() ? 'Never blown up!' : undefined
		},
		announce: () => {
			if (world.order() || bomb.holder < 0) return undefined
			const since = world.raceTicks() - bomb.litAt
			return since >= 0 && since < ANNOUNCED_FOR
				? `${BOMB_KINDS[bomb.kind]} bomb!`
				: undefined
		},
		bot: (racer) => {
			if (blown(racer) || world.order()) return IDLE
			const now = world.ticks()
			const was = choices.get(racer.id)
			if (was && now < was.until) return was.held
			const held = holderOf() === racer ? chase(racer) : flee(racer)
			// Held a while, decided again only occasionally: a jump held
			// right up, as letting go cuts it short.
			choices.set(racer.id, {
				held,
				until: now + (held.up ? 22 : 5 + Math.floor(Math.random() * 9)),
			})
			return held
		},
		note: (racer) => {
			const at = blownAt.get(racer.id)
			if (solo)
				return at === undefined
					? 'Never blown up!'
					: `Lasted ${clock(at, 'down')}`
			if (world.order()?.[0] === racer)
				return `Last one standing${tagged(racer)}`
			return `${at === undefined ? 'Still in' : 'Blown up'}${tagged(racer)}`
		},
		done,
		out: (racer) => blown(racer) || !!racer.out,
		step() {
			const now = world.raceTicks()
			const holder = holderOf()
			for (const racer of racers) {
				const b = racer.body
				// Blown up: sat in the leaves where they came down.
				if (blown(racer)) {
					if (b.grounded) {
						b.held = 2
						b.vx = 0
						b.ducking = true
					}
				} else if (b.x < left) {
					b.x = left
					b.vx = Math.max(0, b.vx)
				} else if (b.x > right) {
					b.x = right
					b.vx = Math.min(0, b.vx)
				}
				b.celebrating = done(racer)
			}
			if (world.phase() !== 'running' || world.order()) return

			// The bomb's heavy: whoever has it on can't go quite so fast.
			if (holder) {
				const most = bombSpeed()
				holder.body.vx = Math.max(-most, Math.min(most, holder.body.vx))
			}

			// Up and down the ladders.
			for (const racer of standing()) climb(racer)

			// Passed on, touching someone; not straight back, and not again
			// till it's landed and settled.
			if (
				holder &&
				!blown(holder) &&
				now >= bomb.litAt - FIRST_LIT &&
				now - bomb.passedAt >= PASS_COOLDOWN
			) {
				const to = standing().find(
					(r) =>
						r !== holder &&
						!r.out &&
						racers.indexOf(r) !== bomb.from &&
						touching(holder, r),
				)
				if (to) pass(holder, to)
			}
			// Let the one it came from be tagged again, once it's settled.
			if (bomb.from >= 0 && now - bomb.passedAt >= PASS_COOLDOWN * 2)
				bomb.from = -1

			// Burnt down: it goes off.
			const on = holderOf()
			if (on && now >= bomb.litAt && fuseTicksLeft() <= 0) explode(on)
			// The fuse's last seconds, ticking.
			else if (on && now >= bomb.litAt) {
				const fuse = fuseTicksLeft()
				if (fuse <= 180 && fuse % 60 === 0) play('count')
			}
			// A new bomb, on someone else, once the last's cleared.
			if (bomb.holder < 0 && bomb.nextAt >= 0 && now >= bomb.nextAt) {
				if (standing().length > (solo ? 0 : 1)) light(now)
			}

			// Whoever fell off the arena, somehow, is out as if blown up.
			for (const racer of racers)
				if (racer.out && !blown(racer)) {
					blownAt.set(racer.id, now)
					if (holderOf() === racer) {
						bomb.holder = -1
						bomb.nextAt = now + BETWEEN_TICKS
					}
				}

			decide()
		},
		frame(): MinigameFrame {
			return {
				bomb: [
					bomb.holder,
					bomb.litAt,
					bomb.kind,
					bomb.from,
					bomb.passedAt,
					bomb.count,
					bomb.nextAt,
				],
				blown: racers.map((r) => blownAt.get(r.id) ?? -1),
				tags: [...tags],
				blasts: blasts.map((b) => [
					Math.round(b.x),
					Math.round(b.y),
					b.at,
					b.kind,
				]),
			}
		},
		apply(a) {
			// Where everything is goes by the tick: nothing to tween.
			const [holder, litAt, kind, from, passedAt, count, nextAt] = a.bomb ?? [
				-1, 0, 0, -1, -99, 0, -1,
			]
			Object.assign(bomb, {
				holder,
				litAt,
				kind,
				from,
				passedAt,
				count,
				nextAt,
			})
			racers.forEach((racer, i) => {
				const at = a.blown?.[i] ?? -1
				if (at < 0) blownAt.delete(racer.id)
				else blownAt.set(racer.id, at)
				tags[i] = a.tags?.[i] ?? 0
				racer.body.celebrating = done(racer)
			})
			blasts.length = 0
			for (const [x, y, at, k] of a.blasts ?? [])
				blasts.push({ x, y, at, kind: k })
		},
	}
}
