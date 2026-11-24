import {
	BEACH_SAND,
	BEACH_SAND_SHADE,
	BEACH_SAND_TEXTURE,
	BEACH_SEA_FAR,
	BEACH_WET_SAND,
	beachSeaFar,
	beachSeaNear,
} from '../courses/kit/beachScenery'
import {
	CANNON_HEIGHT,
	CANNON_MOUTH,
	FRUIT_KINDS,
	type FruitKind,
} from '../draw/art/fruit'
import { SWORD_TIP_OVER_HEAD } from '../draw/art/hats'
import { RUNNER_SCALE, START_X, TICK_MS, VIEW_WIDTH } from '../game/constants'
import type { Racer, World } from '../game/world'
import { collect } from '../saved/collected'
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
 * Fruit Kebab: everyone in a sword hat, a long sword sticking straight up
 * off their head, and a cannon either side firing fruit up into the air.
 * Get under it, or jump up into it, to skewer it on your sword's point: it
 * slides down the blade. The first to four, a whole kebab, wins; then the
 * next to, and so on. Whoever's not got there in a minute, the most fruit
 * first. With a whole kebab, stood still, they dance.
 */

/**
 * Where the beach's sand starts, up from the line everyone runs along: at
 * the water's edge, under the sea's near band (see `arenaSets`).
 */
const BEACH_FROM = -160

/** How long it goes on: a minute. */
export const KEBAB_TICKS = Math.round(60_000 / TICK_MS)
/** How many pieces of fruit make a kebab. */
export const KEBAB = 4

/** How fast fruit falls: floatier than anyone jumping, so it can be got under. */
const FRUIT_GRAVITY = 0.16
/** How big a piece of fruit is, round, for skewering. */
const FRUIT_RADIUS = 8
/** How near the sword's point has to get to the middle of a piece, to skewer it. */
const POINT_REACH = FRUIT_RADIUS + 5
/**
 * How long fruit lies splatted on the path with the fruit in the air,
 * sent to phones, before it's left lying there for the rest of the game:
 * each screen keeps its own, then, with nothing more to send.
 */
export const SPLAT_TICKS = 45
/** How many pieces can lie on the path at once: the oldest go, past that. */
const LYING_MOST = 80
/** How far down from the top of someone's picture the top of their head is, roughly. */
const HEAD_DOWN = 2

/** How far in from the edge of the screen each cannon is. */
export const CANNON_IN = 4
/** How long after "Go!" each cannon first fires, left then right. */
const FIRST_SHOTS: [number, number] = [20, 80]
/** How long between one cannon's shots, at most and at least: sooner the more there are playing. */
const SHOT_EVERY = (players: number) => Math.max(60, 150 - players * 10)
const SHOT_SPREAD = 30
/** At most this many pieces in the air at once, and more for each Player. */
const MOST_IN_AIR = 3
/** How high fruit goes, its highest, up from the path: between these. */
const APEX_LOW = 290
const APEX_HIGH = 420
/** How high it's aimed to come down to, over the path: about where a sword's point is. */
const AIM_AT = 120

/** A piece of fruit, fired out of a cannon. `x`, `y` its middle. */
export interface Fruit {
	id: number
	kind: FruitKind
	x: number
	y: number
	vx: number
	vy: number
	/** Degrees, turning as it flies. */
	spin: number
	/** Bounced off the path once already: next time, it splats. */
	bounced?: boolean
	/** When it splatted on the path, lying there a while. */
	splatAt?: number
}

/** Where a cannon's mouth is, `side` 0 the left one, 1 the right, firing up and in. */
export function cannonMouth(world: World, side: 0 | 1) {
	const ground = world.terrain.groundY(START_X)
	const y = ground - CANNON_HEIGHT + CANNON_MOUTH.y
	const x =
		side === 0
			? ARENA_LEFT + CANNON_IN + CANNON_MOUTH.x
			: ARENA_LEFT + VIEW_WIDTH - CANNON_IN - CANNON_MOUTH.x
	return { x, y }
}

/** Where the point of `racer`'s sword is: up over their head, lower ducking. */
export function swordPoint(racer: Racer) {
	const b = racer.body
	const tall = racer.runner.sprite.height * RUNNER_SCALE
	const head = b.feetY - (b.ducking ? tall * 0.55 : tall) + HEAD_DOWN
	return { x: b.x, y: head - SWORD_TIP_OVER_HEAD }
}

export const fruitKebab: Minigame = {
	id: 'fruit-kebab',
	name: 'Fruit Kebab',
	tagline: 'Skewer the flying fruit',
	blurb:
		'Cannons fire fruit into the air: catch it on the sword on your head. First to four wins!',
	tune: 'furby-fields',
	// Its sword hat: everyone's put in one, playing it.
	collectables: ['hat:swordHat'],
	course: arenaCourse(
		'fruit-kebab',
		'Fruit Kebab',
		'Catch fruit on your sword. First to four wins!',
		// On a beach: the sea out to the horizon, coming in over the sand
		// (see `arenaSets`), and a path of sand too.
		{
			palette: {
				'--sky-blue-top': '#5ec8f2',
				'--sky-blue-bottom': '#c9f1ff',
				'--grass-green': BEACH_SAND,
				'--grass-dark-green': BEACH_SAND_SHADE,
				'--grass-darker-green': BEACH_WET_SAND,
				'--dirt-brown': BEACH_SAND,
				'--dirt-dark-brown': BEACH_SAND_SHADE,
				'--dirt-darker-brown': BEACH_WET_SAND,
			},
			horizon: { far: beachSeaFar, near: beachSeaNear, fill: BEACH_SEA_FAR },
			// Sand, textured, all the way from the water's edge down: no path
			// marked out through it.
			ground: [
				[BEACH_FROM, 'var(--grass-green)'],
				[BEACH_FROM, 'url(#beach-sand)'],
			],
			groundDefs: BEACH_SAND_TEXTURE,
			far: [],
			near: [],
			horizonTrees: false,
		},
	),
	start: startFruitKebab,
}

function startFruitKebab(world: World): MinigameRun {
	const { racers } = world
	const fruit: Fruit[] = []
	let nextId = 0
	const nextShot: [number, number] = [...FIRST_SHOTS]
	const fired: [number, number] = [-1, -1]
	/** Fruit splatted on the path a while ago, left lying there. */
	const lying: Fruit[] = []
	shows.set(world, { fruit, fired, lying })
	/** Left lying on the path: the oldest gone, past the most there can be. */
	const leave = (f: Fruit) => {
		lying.push(f)
		if (lying.length > LYING_MOST) lying.shift()
	}
	/** When each racer got their kebab, and their latest piece, by id. */
	const doneAt = new Map<string, number>()
	const lastAt = new Map<string, number>()

	// Everyone in a sword hat, spread out along the path, facing in.
	const { left, right } = ARENA_WALLS
	// Spread out along it, in no particular order.
	inRandomOrder(racers).forEach((racer, i) => {
		const b = racer.body
		b.hat = { kind: 'swordHat' }
		b.skewered = []
		b.celebrating = false
		const x = left + 60 + ((right - left - 120) * (i + 0.5)) / racers.length
		b.x = Math.round(x)
		b.feetY = world.terrain.groundY(b.x)
		b.floor = b.feetY
		b.facing = x < (left + right) / 2 ? 1 : -1
	})
	// Found, by playing it: not by watching its preview.
	if (!world.preview) collect('hat:swordHat')

	const ticksLeft = () => Math.max(0, KEBAB_TICKS - world.raceTicks())
	const count = (racer: Racer) => racer.body.skewered?.length ?? 0
	const done = (racer: Racer) => count(racer) >= KEBAB
	/** How far off each bot aims, changing occasionally: they're not that good. */
	const aims = new Map<string, { off: number; until: number }>()
	const botAim = (id: string) => {
		const now = world.ticks()
		const was = aims.get(id)
		if (was && now < was.until) return was.off
		const off = (Math.random() - 0.5) * 50
		aims.set(id, { off, until: now + 60 + Math.random() * 90 })
		return off
	}
	const solo = racers.length === 1

	function fire(side: 0 | 1) {
		const ground = world.terrain.groundY(START_X)
		const from = cannonMouth(world, side)
		const apex = ground - (APEX_LOW + Math.random() * (APEX_HIGH - APEX_LOW))
		const aim = ground - AIM_AT
		// Down anywhere along the path between the walls, a little in from them.
		const to = left + 30 + Math.random() * (right - left - 60)
		const vy = -Math.sqrt(2 * FRUIT_GRAVITY * (from.y - apex))
		const flight =
			-vy / FRUIT_GRAVITY + Math.sqrt((2 * (aim - apex)) / FRUIT_GRAVITY)
		fruit.push({
			id: nextId++,
			kind: FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)],
			x: from.x,
			y: from.y,
			vx: (to - from.x) / flight,
			vy,
			spin: 0,
		})
		fired[side] = world.ticks()
		play('whoosh')
	}

	function skewer(racer: Racer, piece: Fruit) {
		const b = racer.body
		b.skewered = [...(b.skewered ?? []), piece.kind]
		lastAt.set(racer.id, world.raceTicks())
		const point = swordPoint(racer)
		if (done(racer)) {
			doneAt.set(racer.id, world.raceTicks())
			world.popup(
				solo ? `Kebab in ${clock(world.raceTicks(), 'down')}!` : 'Kebab!',
				point.x,
				point.y - 10,
			)
			play('finished')
		} else {
			world.popup(`${count(racer)}/${KEBAB}`, point.x, point.y - 10)
			play('fika')
		}
	}

	/** Over: everyone's got a kebab, or all but one have, or time's up. */
	function decide() {
		if (world.order()) return
		const toGo = racers.filter((r) => !done(r)).length
		const over =
			ticksLeft() <= 0 || toGo === 0 || (racers.length > 1 && toGo <= 1)
		if (!over) return
		const order = racers
			.map((racer, i) => ({ racer, i }))
			.sort(
				(a, b) =>
					(doneAt.get(a.racer.id) ?? Number.POSITIVE_INFINITY) -
						(doneAt.get(b.racer.id) ?? Number.POSITIVE_INFINITY) ||
					count(b.racer) - count(a.racer) ||
					(lastAt.get(a.racer.id) ?? Number.POSITIVE_INFINITY) -
						(lastAt.get(b.racer.id) ?? Number.POSITIVE_INFINITY) ||
					a.i - b.i,
			)
			.map(({ racer }) => racer)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const winner = order[0]
		const point = swordPoint(winner)
		// On your own, nobody to beat: the time it took said already, or not done.
		if (!solo) world.popup(`${winner.runner.name} wins!`, point.x, point.y - 40)
		else if (!done(winner))
			world.popup(`${count(winner)} fruit`, point.x, point.y - 40)
		if (ticksLeft() <= 0) play('finished')
	}

	return {
		id: 'fruit-kebab',
		ticksLeft,
		chip: (racer) => `${count(racer)}/${KEBAB}`,
		// Most fruit; of those done, whoever was first.
		score: (racer) => {
			const at = doneAt.get(racer.id)
			return count(racer) + (at === undefined ? 0 : 1 / (1 + at))
		},
		timeNote: (racer) => {
			const at = doneAt.get(racer.id)
			return at === undefined ? undefined : `Kebab in ${clock(at, 'down')}`
		},
		// A bot: under whichever fruit's coming down nearest, a little off
		// as often as not, and jumping up into it as it comes.
		bot: (racer) => {
			if (done(racer)) return IDLE
			const b = racer.body
			const point = swordPoint(racer)
			const aim = botAim(racer.id)
			let best: Fruit | undefined
			for (const f of fruit) {
				if (f.splatAt !== undefined || f.vy < -1) continue
				if (!best || Math.abs(f.x - b.x) < Math.abs(best.x - b.x)) best = f
			}
			if (!best) return IDLE
			const dx = best.x + aim - b.x
			const above = point.y - best.y
			return {
				left: dx < -8,
				right: dx > 8,
				up: Math.abs(dx) < 40 && above > 0 && above < 110,
				down: false,
			}
		},
		note: (racer) => {
			const at = doneAt.get(racer.id)
			// On your own: how long it took.
			if (solo && at !== undefined) return `Kebab in ${clock(at, 'down')}`
			return done(racer) ? 'Full kebab!' : `${count(racer)} fruit`
		},
		done,
		// Nobody's out: they can catch fruit till it's over.
		out: () => false,
		step() {
			if (world.phase() !== 'running') return
			const now = world.ticks()
			const ground = world.terrain.groundY(START_X)

			// Nobody off either end: the walls.
			for (const racer of racers) {
				const b = racer.body
				if (b.x < left) {
					b.x = left
					b.vx = Math.max(0, b.vx)
				} else if (b.x > right) {
					b.x = right
					b.vx = Math.min(0, b.vx)
				}
				// Done, or the winner at the whistle: dancing.
				b.celebrating = done(racer) || world.order()?.[0] === racer
			}

			// The cannons, one then the other, till it's decided.
			if (!world.order()) {
				const flying = fruit.filter((f) => f.splatAt === undefined).length
				for (const side of [0, 1] as const) {
					if (world.raceTicks() < nextShot[side]) continue
					if (flying >= MOST_IN_AIR + racers.length) continue
					fire(side)
					nextShot[side] =
						world.raceTicks() +
						SHOT_EVERY(racers.length) +
						Math.round((Math.random() - 0.5) * 2 * SHOT_SPREAD)
				}
			}

			// The fruit, flying, bouncing once, then splatting.
			for (const f of fruit) {
				if (f.splatAt !== undefined) continue
				f.vy += FRUIT_GRAVITY
				f.x += f.vx
				f.y += f.vy
				f.spin += f.vx * 5
				if (f.y + FRUIT_RADIUS < ground) continue
				f.y = ground - FRUIT_RADIUS
				if (!f.bounced) {
					f.bounced = true
					f.vy *= -0.35
					f.vx *= 0.5
				} else {
					f.splatAt = now
					f.vx = 0
					f.vy = 0
					play('squelch')
				}
			}

			// Skewered: on the point of anyone's sword, falling onto it or
			// jumped up into.
			for (const racer of racers) {
				if (done(racer) || racer.out) continue
				const point = swordPoint(racer)
				const at = fruit.findIndex(
					(f) =>
						f.splatAt === undefined &&
						Math.hypot(f.x - point.x, f.y - point.y) < POINT_REACH,
				)
				if (at < 0) continue
				skewer(racer, fruit[at])
				fruit.splice(at, 1)
			}

			// Gone: off the screen; or splatted a while ago, left lying there.
			for (let i = fruit.length - 1; i >= 0; i--) {
				const f = fruit[i]
				const splatted =
					f.splatAt !== undefined && now - f.splatAt > SPLAT_TICKS
				const off = f.x < ARENA_LEFT - 40 || f.x > ARENA_LEFT + VIEW_WIDTH + 40
				if (splatted) leave(f)
				if (splatted || off) fruit.splice(i, 1)
			}

			decide()
		},
		frame(): MinigameFrame {
			return {
				fruit: fruit.map((f) => [
					f.id,
					FRUIT_KINDS.indexOf(f.kind),
					Math.round(f.x * 10) / 10,
					Math.round(f.y * 10) / 10,
					Math.round(f.spin),
					f.splatAt ?? -1,
				]),
				skewers: racers.map((r) =>
					(r.body.skewered ?? []).map((k) => FRUIT_KINDS.indexOf(k)),
				),
				doneAt: racers.map((r) => doneAt.get(r.id) ?? -1),
				fired: [...fired],
			}
		},
		apply(a, b, share) {
			const next = new Map((b?.fruit ?? []).map((f) => [f[0], f]))
			const mix = (from: number, to: number) => from + (to - from) * share
			// Splatted, and no longer sent: left lying there, as the Host does.
			const sent = new Set((a.fruit ?? []).map((f) => f[0]))
			for (const f of fruit)
				if (f.splatAt !== undefined && !sent.has(f.id)) leave(f)
			fruit.length = 0
			for (const from of a.fruit ?? []) {
				const to = next.get(from[0]) ?? from
				fruit.push({
					id: from[0],
					kind: FRUIT_KINDS[from[1]] ?? 'apple',
					x: mix(from[2], to[2]),
					y: mix(from[3], to[3]),
					vx: 0,
					vy: 0,
					spin: mix(from[4], to[4]),
					splatAt: from[5] < 0 ? undefined : from[5],
				})
			}
			racers.forEach((racer, i) => {
				const kinds = (a.skewers?.[i] ?? []).map(
					(k) => FRUIT_KINDS[k] ?? 'apple',
				)
				racer.body.skewered = kinds
				racer.body.celebrating =
					kinds.length >= KEBAB || world.order()?.[0] === racer
				const at = a.doneAt?.[i] ?? -1
				if (at < 0) doneAt.delete(racer.id)
				else doneAt.set(racer.id, at)
			})
			if (a.fired) {
				fired[0] = a.fired[0]
				fired[1] = a.fired[1]
			}
		},
	}
}

/** What's to be drawn of a game of Fruit Kebab: its fruit in the air, when its cannons fired, and the fruit left lying on the path. */
export interface KebabShow {
	fruit: Fruit[]
	fired: [number, number]
	lying: Fruit[]
}
const shows = new WeakMap<World, KebabShow>()

/** `world`'s game of Fruit Kebab, for drawing, if it's one. */
export const kebabOf = (world: World) => shows.get(world)
