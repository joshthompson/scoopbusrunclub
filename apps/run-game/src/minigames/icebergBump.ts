import {
	ARCTIC_SEA,
	ARCTIC_SEA_FAR,
	ARCTIC_SKY_BOTTOM,
	ARCTIC_SKY_TOP,
	arcticFar,
	arcticNear,
} from '../courses/kit/arcticScenery'
import { START_X, TICK_MS, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { Terrain } from '../game/terrain'
import type { Racer, World } from '../game/world'
import { play } from '../sfx'
import { ARENA_LEFT, arenaCourse, inRandomOrder } from './arena'
import { clock } from './clock'
import { poseInWater, treadWater, waterBot } from './treadWater'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Iceberg Bump: everyone on one big iceberg, out in the middle of the
 * Arctic Ocean, bobbing. It's icy (see `game/ice`): slow to get going,
 * sliding on. And it tips towards wherever the weight is, everyone on it
 * sliding down it as it does, till it rocks back. Bump each other about,
 * bounce on each other's heads; off the edge, and you're in the sea, out,
 * with a splash. It gets tippier as it goes on, and with half a minute to
 * go, penguins leap up onto it out of the sea and toboggan along it on
 * their bellies: jump them, or they trip you up. The last one still on it
 * wins; or after a minute, whoever still is.
 */

/** How long it goes on, at most: a minute. */
export const ICEBERG_TICKS = Math.round(60_000 / TICK_MS)

/** Where the iceberg is: its middle, its flat top's height at rest, and half its width. */
export const BERG_MIDDLE = START_X
export const BERG_TOP = 470
export const BERG_HALF = 280
/** How far down its sides the sea comes: the waterline, under its top. */
export const WATERLINE = BERG_TOP + 26
/** In the sea, how near the screen's edges they can swim. */
const SWIM_IN = 24
/** Won, how much of its tilt the iceberg keeps a tick, settling level; and the winner's speed, stopping. */
const SETTLES = 0.9

/**
 * How it tips: each one stood on it turns it this much towards them, for
 * how far out they are (`WEIGHT`); it rights itself, harder the further
 * over it is (`RIGHTING_…`, less so as it goes on), steadied by `STEADY`,
 * and never further over than `MOST_TILT`.
 */
const WEIGHT = 6e-7
const RIGHTING_FIRST = 0.0009
const RIGHTING_LAST = 0.00042
const STEADY = 0.012
const MOST_TILT = 0.5
/** How the sea moves it of its own accord: its bob, up and down, and a nudge occasionally. */
const BOB_FIRST = 2
const BOB_LAST = 5
const BOB_TICKS = 170
const SWELL = 0.00003

/** When the penguins start coming: with this long left. And emperor penguins too, with this long. */
const PENGUINS_LEFT = Math.round(45_000 / TICK_MS)
const EMPERORS_LEFT = Math.round(20_000 / TICK_MS)
/**
 * How long between penguins, at first and by the end, give or take a
 * little; and how likely, by the end, one comes from the other end at the
 * same time.
 */
const PENGUIN_EVERY_FIRST = 260
const PENGUIN_EVERY_LAST = 80
const PENGUIN_PAIRS = 0.5
/** Once they're coming, how likely each penguin's an emperor, at first and by the end. */
const EMPERORS_FIRST = 0.3
const EMPERORS_LAST = 0.6
/**
 * An emperor penguin: bigger, so it takes a higher jump to clear, quicker
 * along the ice, and knocking whoever it hits flying, up and away, for
 * longer: likely off into the sea.
 */
const EMPEROR_SLIDE = 5.4
const EMPEROR_REACH = 24
const EMPEROR_TALL = 22
const EMPEROR_SHOVE = 1.7
const EMPEROR_THROW = 5
const EMPEROR_TRIPS = 70
/** How a penguin leaps up out of the sea, and how fast it toboggans, and more so downhill. */
const PENGUIN_LEAP = 9.5
const PENGUIN_LEAP_ACROSS = 3
const PENGUIN_SLIDE = 4.2
const PENGUIN_DOWNHILL = 1.2
const PENGUIN_GRAVITY = 0.45
/** How long "Penguins!" is up on the screen, as they start. */
const ANNOUNCED_FOR = 150
/** How close a penguin has to come to someone's feet to trip them, and how long they stumble. */
const PENGUIN_REACH = 16
const TRIPPED_TICKS = 40

/**
 * A penguin: leaping up out of the sea onto the iceberg, tobogganing along
 * it on its belly, then diving off the far end. `x`, `y` its middle, at
 * the bottom.
 */
export interface Penguin {
	id: number
	x: number
	y: number
	vx: number
	vy: number
	stage: 'leap' | 'slide' | 'dive'
	/** An emperor penguin: bigger, and much more powerful (see `EMPEROR_SLIDE`). */
	emperor?: boolean
	/** Who it's tripped already: once each. */
	tripped: Set<string>
}

/** Where water's been splashed up, and when, by the world's ticks: someone, or a penguin, going in. */
export interface Splash {
	x: number
	at: number
}

/** What's to be drawn of a game of Iceberg Bump, besides the iceberg itself. */
export interface BergShow {
	penguins: Penguin[]
	splashes: Splash[]
}
const shows = new WeakMap<World, BergShow>()

/** `world`'s game of Iceberg Bump, for drawing its penguins and splashes, if it's one. */
export const bergShowOf = (world: World) => shows.get(world)
/** How long a splash is drawn for. */
export const SPLASH_TICKS = 40

/**
 * How it's lying now, for the ground to be where it is: shared, one
 * iceberg at a time (there's only ever one game on a screen).
 */
export const berg = { tilt: 0, turning: 0, bob: 0 }

/** Its top's height `x` along, as it's tipped and bobbing: what everyone stands on. */
const bergTop = (x: number) =>
	BERG_TOP + berg.bob + (x - BERG_MIDDLE) * Math.tan(berg.tilt)

/**
 * The ground, as the engine sees it: the iceberg's top, tipped and bobbing,
 * and either side of it, nothing, down into the sea. Never a wall: off the
 * edge you go.
 */
const terrain: Terrain = {
	// A finish line off past the far side of the screen: nobody gets near
	// it, and the ground's drawn (none of it) only so far.
	length: 3000,
	finishX: BERG_MIDDLE + 3000,
	groundY: bergTop,
	slope: () => Math.tan(berg.tilt),
	gaps: [],
	inGap: (x) => Math.abs(x - BERG_MIDDLE) > BERG_HALF * Math.cos(berg.tilt),
	walls: [],
}

export const icebergBump: Minigame = {
	id: 'iceberg-bump',
	name: 'Iceberg Bump',
	tagline: 'Last one on the iceberg',
	blurb:
		'Stay on the iceberg! It tips wherever everyone stands, and it’s slippy. Bump the others into the sea. Last one on wins!',
	tune: 'slopes',
	collectables: [],
	course: {
		...arenaCourse(
			'iceberg-bump',
			'Iceberg Bump',
			'Stay on the tipping iceberg. Last one on wins!',
			// Out in the middle of the Arctic Ocean: far-off icebergs and a
			// glacier, floes, and sea all the way down, no ground at all.
			{
				palette: {
					'--sky-blue-top': ARCTIC_SKY_TOP,
					'--sky-blue-bottom': ARCTIC_SKY_BOTTOM,
					'--grass-green': ARCTIC_SEA,
				},
				horizon: { far: arcticFar, near: arcticNear, fill: ARCTIC_SEA_FAR },
				far: [],
				near: [],
				horizonTrees: false,
				ground: [],
			},
		),
		terrain,
		// All of it icy.
		ice: [{ from: -1_000_000, to: 1_000_000 }],
	},
	start: startIcebergBump,
}

function startIcebergBump(world: World): MinigameRun {
	const { racers } = world
	berg.tilt = 0
	berg.turning = 0
	berg.bob = 0
	/** When each went in the sea, by the race's ticks. */
	const inSeaAt = new Map<string, number>()
	const show: BergShow = { penguins: [], splashes: [] }
	shows.set(world, show)
	let nextPenguin = ICEBERG_TICKS - PENGUINS_LEFT
	let penguinId = 0
	const splash = (x: number) => {
		show.splashes.push({ x, at: world.ticks() })
		play('splash')
	}

	// Everyone on it, spread out across its top, facing in.
	// Spread out along it, in no particular order.
	inRandomOrder(racers).forEach((racer, i) => {
		const b = racer.body
		const x = BERG_MIDDLE - 200 + (400 * (i + 0.5)) / racers.length
		b.x = Math.round(x)
		b.feetY = bergTop(b.x)
		b.floor = b.feetY
		b.facing = x < BERG_MIDDLE ? 1 : -1
	})

	const ticksLeft = () => Math.max(0, ICEBERG_TICKS - world.raceTicks())
	const inSea = (racer: Racer) => inSeaAt.has(racer.id) || !!racer.out
	const onBerg = () => racers.filter((r) => !inSea(r))
	const solo = racers.length === 1
	const progress = () => Math.min(1, world.raceTicks() / ICEBERG_TICKS)

	/** Over: one left on it (or none, on your own), or time's up. */
	function decide() {
		if (world.order()) return
		const on = onBerg().length
		const over = ticksLeft() <= 0 || on === 0 || (racers.length > 1 && on <= 1)
		if (!over) return
		const order = [...racers].sort(
			(a, b) =>
				(inSeaAt.get(b.id) ?? Number.POSITIVE_INFINITY) -
				(inSeaAt.get(a.id) ?? Number.POSITIVE_INFINITY),
		)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const winner = order[0]
		const at = inSeaAt.get(winner.id)
		world.popup(
			solo
				? at === undefined
					? 'Stayed on the minute!'
					: `Lasted ${clock(at, 'down')}`
				: `${winner.runner.name} wins!`,
			winner.body.x,
			winner.body.feetY - 120,
		)
		play('finished')
	}

	/** In the sea: treading water, swimming about with left and right, hopping up out of it. */
	function swim(racer: Racer) {
		const b = racer.body
		if (!inSeaAt.has(racer.id)) {
			inSeaAt.set(racer.id, world.raceTicks())
			world.popup(
				solo ? `Lasted ${clock(world.raceTicks(), 'down')}` : 'Splash!',
				b.x,
				WATERLINE - 70,
			)
			splash(b.x)
		}
		// Treading water, swimming about, hopping up out of it.
		treadWater(world, racer, {
			waterline: WATERLINE,
			left: ARENA_LEFT + SWIM_IN,
			right: ARENA_LEFT + VIEW_WIDTH - SWIM_IN,
			splash: (x) => show.splashes.push({ x, at: world.ticks() }),
			// Diving: no deeper than still shows, at the bottom of the screen.
			bottom: VIEW_HEIGHT,
		})
	}

	const done = (racer: Racer) => !!world.order() && !inSea(racer)
	/** Which way each bot's decided to go, and till when: it only looks occasionally. */
	const choices = new Map<
		string,
		{ go: number; jumpTill: number; until: number }
	>()
	/** Whether each bot's noticed each penguin, decided once, the first time it looks. */
	const notices = new Map<string, boolean>()
	const noticed = (bot: string, penguin: number) => {
		const key = `${bot}:${penguin}`
		if (!notices.has(key)) notices.set(key, Math.random() < 0.65)
		return notices.get(key)
	}

	/**
	 * The penguins: one out of the sea every so often, from one end or the
	 * other, once there's `PENGUINS_LEFT` to go, leaping up onto the
	 * iceberg, tobogganing along it, tripping up anyone stood in its way,
	 * and diving off the far end.
	 */
	function stepPenguins() {
		const now = world.raceTicks()
		if (!world.order() && now >= nextPenguin) {
			const late = Math.min(
				1,
				(now - (ICEBERG_TICKS - PENGUINS_LEFT)) / PENGUINS_LEFT,
			)
			// Emperors too, near the end, more and more of them.
			const emperorsFor = now - (ICEBERG_TICKS - EMPERORS_LEFT)
			const emperors =
				emperorsFor < 0
					? 0
					: EMPERORS_FIRST +
						(EMPERORS_LAST - EMPERORS_FIRST) *
							Math.min(1, emperorsFor / EMPERORS_LEFT)
			/** One out of the sea at end `from`, up onto the iceberg. */
			const leap = (from: number) => {
				const x = BERG_MIDDLE + from * (BERG_HALF + 50)
				show.penguins.push({
					id: penguinId++,
					x,
					y: WATERLINE + 6,
					vx: -from * PENGUIN_LEAP_ACROSS,
					vy: -PENGUIN_LEAP,
					stage: 'leap',
					emperor: Math.random() < emperors || undefined,
					tripped: new Set(),
				})
				splash(x)
			}
			const from = Math.random() < 0.5 ? -1 : 1
			leap(from)
			// Later on, occasionally, two at once, one from each end.
			if (Math.random() < PENGUIN_PAIRS * late) leap(-from)
			nextPenguin =
				now +
				Math.round(
					(PENGUIN_EVERY_FIRST +
						(PENGUIN_EVERY_LAST - PENGUIN_EVERY_FIRST) * late) *
						(0.8 + Math.random() * 0.4),
				)
		}
		for (const p of show.penguins) {
			const over =
				Math.abs(p.x - BERG_MIDDLE) <= BERG_HALF * Math.cos(berg.tilt)
			if (p.stage === 'slide') {
				// On its belly, along the top, quicker downhill.
				p.vx += Math.tan(berg.tilt) * PENGUIN_DOWNHILL
				const slide = p.emperor ? EMPEROR_SLIDE : PENGUIN_SLIDE
				if (Math.abs(p.vx) < slide) p.vx = Math.sign(p.vx || 1) * slide
				p.x += p.vx
				p.y = bergTop(p.x)
				if (!over) {
					p.stage = 'dive'
					p.vy = -2
				}
				// Anyone stood in its way: tripped up, and shoved along with it.
				// By an emperor: knocked flying.
				for (const racer of onBerg()) {
					const b = racer.body
					if (p.tripped.has(racer.id) || world.order()) continue
					const reach = p.emperor ? EMPEROR_REACH : PENGUIN_REACH
					if (Math.abs(b.x - p.x) > reach) continue
					if (b.feetY < bergTop(b.x) - (p.emperor ? EMPEROR_TALL : 6)) continue
					p.tripped.add(racer.id)
					if (p.emperor) {
						b.stumble = Math.max(b.stumble, EMPEROR_TRIPS)
						b.vx = p.vx * EMPEROR_SHOVE
						b.vy = -EMPEROR_THROW
						b.grounded = false
						world.popup('Whack!', b.x, b.feetY - 80)
						play('stomp')
					} else {
						b.stumble = Math.max(b.stumble, TRIPPED_TICKS)
						b.vx = p.vx * 0.8
						world.popup('Tripped!', b.x, b.feetY - 80)
						play('stumble')
					}
				}
				continue
			}
			// In the air: up out of the sea, or off the end and down into it.
			p.vy += PENGUIN_GRAVITY
			p.x += p.vx
			p.y += p.vy
			if (p.stage === 'leap' && p.vy > 0 && over && p.y >= bergTop(p.x)) {
				p.stage = 'slide'
				p.y = bergTop(p.x)
				p.vx = Math.sign(p.vx) * PENGUIN_SLIDE
			}
		}
		// Gone: down into the sea, with a splash; and splashes, long since.
		for (let i = show.penguins.length - 1; i >= 0; i--) {
			const p = show.penguins[i]
			if (p.stage !== 'slide' && p.vy > 0 && p.y > WATERLINE + 10) {
				splash(p.x)
				show.penguins.splice(i, 1)
			}
		}
		const tick = world.ticks()
		show.splashes = show.splashes.filter((s) => tick - s.at < SPLASH_TICKS)
	}

	return {
		id: 'iceberg-bump',
		ticksLeft,
		chip: (racer) => (inSea(racer) ? 'Out' : 'On'),
		// Still on it; then whoever lasted longest.
		score: (racer) =>
			inSea(racer) ? (inSeaAt.get(racer.id) ?? 0) : Number.POSITIVE_INFINITY,
		timeNote: (racer) => {
			const at = inSeaAt.get(racer.id)
			if (at !== undefined) return `Lasted ${clock(at, 'down')}`
			return world.order()
				? `Stayed on ${clock(ICEBERG_TICKS, 'down')}!`
				: undefined
		},
		// A bot: making for a spot of its own near the middle, uphill when it
		// tips; and near an edge, or sliding fast towards one, running back
		// from it, occasionally jumping too, since it can turn round in the
		// air quicker than on the ice. Slow to look, so not always in time.
		bot: (racer) => {
			if (inSea(racer)) return waterBot(world, racer)
			const b = racer.body
			// A penguin coming at it: jumped, if it's noticed it, as it does
			// about two in three.
			const penguin = show.penguins.some(
				(p) =>
					p.stage === 'slide' &&
					Math.abs(p.x - b.x) < (p.emperor ? 90 : 70) &&
					Math.sign(b.x - p.x) === Math.sign(p.vx) &&
					noticed(racer.id, p.id),
			)
			const now = world.ticks()
			const was = choices.get(racer.id)
			if (!was || now >= was.until) {
				const from = b.x - BERG_MIDDLE
				const side = Math.sign(from)
				// How close to its edge, and how soon it'll be over, going as it is.
				const edge = BERG_HALF - Math.abs(from)
				const outwards = b.vx * side
				const soon = outwards > 0.2 ? edge / outwards : Number.POSITIVE_INFINITY
				const danger = edge < BERG_HALF * 0.35 || soon < 70
				let go: number
				let jumpTill = 0
				if (danger) {
					// Away from the side, hard; and a jump, about half the time,
					// heading out, to turn round in the air.
					go = -side
					if (b.grounded && outwards > 0.6 && Math.random() < 0.5)
						jumpTill = now + 14
				} else {
					// Its own spot, spread out across the iceberg from the others'.
					const spot =
						BERG_MIDDLE + ((((racer.number ?? 1) * 97) % 300) - 150) * 0.8
					// Climbing up out of the low side, once it's properly tipped.
					const low = side === Math.sign(berg.tilt)
					const uphill =
						Math.abs(berg.tilt) > 0.12 && low ? -Math.sign(berg.tilt) : 0
					// On ice, it's speed that's steered: as fast as it wants to be
					// going, towards its spot, braking by pushing the other way.
					const wants = uphill
						? uphill * 2.5
						: Math.max(-2, Math.min(2, (spot - b.x) * 0.03))
					const off = wants - b.vx
					go = Math.abs(off) > 0.3 ? Math.sign(off) : 0
				}
				choices.set(racer.id, {
					go,
					jumpTill,
					until:
						now + (danger ? 8 + Math.random() * 10 : 14 + Math.random() * 18),
				})
			}
			const choice = choices.get(racer.id)
			const go = choice?.go ?? 0
			// Jumping: pressed, and held while it's going up, for the whole jump.
			const jumping =
				!!choice && now < choice.jumpTill && (b.grounded || b.vy < 0)
			return {
				left: go < 0,
				right: go > 0,
				up: penguin || jumping,
				down: false,
			}
		},
		note: (racer) => {
			const at = inSeaAt.get(racer.id)
			if (solo)
				return at === undefined
					? `Stayed on ${clock(ICEBERG_TICKS, 'down')}!`
					: `Lasted ${clock(at, 'down')}`
			if (world.order()?.[0] === racer) return 'Last one on'
			return at !== undefined ? 'In the sea' : 'Still on'
		},
		done,
		out: inSea,
		// "Penguins!", big, as they start coming.
		announce: () => {
			if (world.order()) return undefined
			const since = world.raceTicks() - (ICEBERG_TICKS - PENGUINS_LEFT)
			// Not the emperors: they're just more penguins, bigger.
			return since >= 0 && since < ANNOUNCED_FOR ? 'Penguins!' : undefined
		},
		step() {
			if (world.phase() !== 'running') return
			// Won: the iceberg settling level, and whoever's still on it
			// stopping where they are, to dance, not sliding off.
			const decided = !!world.order()
			// Tipped by whoever's stood on it, towards them, and righting
			// itself, less and less as it goes on; nudged by the swell.
			const righting =
				RIGHTING_FIRST + (RIGHTING_LAST - RIGHTING_FIRST) * progress()
			// Each a little lighter the more there are: a crowd tips it more
			// than one does, but not as many times as there are of them.
			const each = (WEIGHT * 3) / (racers.length + 2)
			let weight = 0
			for (const racer of onBerg()) {
				const b = racer.body
				if (b.grounded) weight += (b.x - BERG_MIDDLE) * each
			}
			berg.turning +=
				weight -
				berg.tilt * righting -
				berg.turning * STEADY +
				(Math.random() - 0.5) * SWELL * (1 + progress())
			berg.tilt += berg.turning
			if (decided) {
				berg.turning = 0
				berg.tilt *= SETTLES
			}
			if (Math.abs(berg.tilt) > MOST_TILT) {
				berg.tilt = Math.sign(berg.tilt) * MOST_TILT
				berg.turning = 0
			}
			const bob = BOB_FIRST + (BOB_LAST - BOB_FIRST) * progress()
			berg.bob = bob * Math.sin((world.raceTicks() * Math.PI * 2) / BOB_TICKS)

			stepPenguins()

			// Anyone gone in: in the sea, out.
			for (const racer of racers) {
				const b = racer.body
				const under = b.feetY > WATERLINE + 8 && !b.grounded
				if (racer.out || inSeaAt.has(racer.id) || under) {
					// Not down out of sight, as down a Gap: in the sea, floating.
					racer.out ??= 'fallen'
					swim(racer)
					continue
				}
				b.celebrating = done(racer)
				if (decided) b.vx *= SETTLES
			}
			decide()
		},
		frame(): MinigameFrame {
			return {
				berg: [
					Math.round(berg.tilt * 10000) / 10000,
					Math.round(berg.bob * 100) / 100,
				],
				inSea: racers.map((r) => inSeaAt.get(r.id) ?? -1),
				penguins: show.penguins.map((p) => [
					p.id,
					Math.round(p.x * 10) / 10,
					Math.round(p.y * 10) / 10,
					Math.round(p.vx * 10) / 10,
					Math.round(p.vy * 10) / 10,
					p.stage === 'leap' ? 0 : p.stage === 'slide' ? 1 : 2,
					p.emperor ? 1 : 0,
				]),
				splashes: show.splashes.map((s) => [Math.round(s.x), s.at]),
			}
		},
		apply(a, b, share) {
			const from = a.berg ?? [berg.tilt, berg.bob]
			const to = b?.berg ?? from
			berg.tilt = from[0] + (to[0] - from[0]) * share
			berg.bob = from[1] + (to[1] - from[1]) * share
			const next = new Map((b?.penguins ?? []).map((p) => [p[0], p]))
			const mix = (x: number, y: number) => x + (y - x) * share
			show.penguins = (a.penguins ?? []).map((p) => {
				const q = next.get(p[0]) ?? p
				return {
					id: p[0],
					x: mix(p[1], q[1]),
					y: mix(p[2], q[2]),
					vx: p[3],
					vy: p[4],
					stage: p[5] === 0 ? 'leap' : p[5] === 1 ? 'slide' : 'dive',
					emperor: p[6] === 1 || undefined,
					tripped: new Set<string>(),
				}
			})
			show.splashes = (a.splashes ?? []).map(([x, at]) => ({ x, at }))
			racers.forEach((racer, i) => {
				const at = a.inSea?.[i] ?? -1
				if (at < 0) inSeaAt.delete(racer.id)
				else inSeaAt.set(racer.id, at)
				racer.body.celebrating = done(racer)
				// In the sea: treading water, swimming about, or hopping.
				if (at >= 0) poseInWater(world, racer, WATERLINE)
			})
		},
	}
}
