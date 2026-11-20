import {
	TULIP_COLOURS,
	TULIP_GRASS,
	TULIP_GRASS_SHADE,
	TULIP_PATH,
	TULIP_PATH_SHADE,
} from '../courses/kit/tulipScenery'
import { POTATO_HEIGHT, POTATO_WIDTH } from '../draw/art/potato'
import {
	HITBOX_HALF_WIDTH,
	RUNNER_SCALE,
	START_X,
	TICK_MS,
} from '../game/constants'
import { type Racer, type World, bodyHeight } from '../game/world'
import type { Controls } from '../input'
import { play } from '../sfx'
import { ARENA_WALLS, arenaCourse, inRandomOrder } from './arena'
import { clock } from './clock'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Potato Rain: giant jacket potatoes dropping out of the sky onto a path
 * where tulips grow. Each potato's shadow shows on the path first, growing
 * and darkening, and only at the last moment does the potato itself come
 * down, fast, onto it: the shadow's all the warning there is. Hit by one,
 * and you're knocked into the ground up to your waist, stuck there, picking
 * no more. Tulips come up out of the path, a shoot, a bud, then in flower,
 * when they can be picked, by running over them; a potato landing on one
 * squashes it. Potatoes come quicker, with less warning, the longer it goes
 * on. Whoever's picked the most tulips wins. Once everyone else is buried,
 * the last one standing has 5 seconds more, no more potatoes coming, to
 * pick a few more. Or it's over after a minute.
 */

/** How long it goes on: a minute. */
export const POTATO_TICKS = Math.round(60_000 / TICK_MS)

/** How high over the path a potato starts falling: off the top of the screen. */
const DROP_FROM = 600
/** How fast it falls, once it does: fast. */
export const FALL_SPEED = 18
/** How long it's falling, on the screen, before it lands. */
export const FALL_TICKS = Math.ceil(DROP_FROM / FALL_SPEED)
/**
 * How long its shadow's on the path before it lands, to begin with and by
 * the end: the warning, shorter as it goes on.
 */
const WARNING_FIRST = 110
const WARNING_LAST = 55
/** How long between potatoes, to begin with and by the end, with a few Players. */
const EVERY_FIRST = 60
const EVERY_LAST = 13
/** How much of a potato's width can brush someone without it counting. */
const GIVE = 12
/** How long a landed potato lies smashed on the path, then fades away over. */
export const SPLIT_LIES = 150
export const SPLIT_FADES = 40
/** How far into the ground someone hit goes: up to their waist. */
const BURIED = 0.4
/** How often a potato's dropped right over someone, rather than anywhere. */
const AIMED = 0.5
/** How high off the path someone can be, jumping, and still pick a tulip. */
const PICK_HIGH = 30
/** How much a bot's drawn to tulips, against how much it fears potatoes. */
const BOT_TULIP_PULL = 0.005
/** How near a tulip a spot has to be to draw a bot there, how far off it looks for them, and how fast it reckons it runs. */
const BOT_TULIP_NEAR = 60
const BOT_LOOKS = 260
const BOT_RUNS = 4

/** How long a tulip takes to grow, from a shoot to in flower, when it can be picked. */
export const TULIP_GROWS = 100
/** How many tulips there are out at once, at most: two for each Player, and a few more. */
const TULIPS_EACH = 2
const TULIPS_MORE = 4
/** How long between new tulips coming up, while there's room for another, and how much later at random. */
const TULIP_EVERY = 20
const TULIP_LATER = 10
/** How close two tulips can come up. */
const TULIP_APART = 40
/** How close someone's middle has to come to one to pick it, on their feet. */
const PICK_REACH = HITBOX_HALF_WIDTH + 6
/** The last one standing's time to pick a few more, once the rest are all buried: 5 seconds. */
const BONUS_TICKS = Math.round(5000 / TICK_MS)
/** How long "Bonus time!" is up, big, as it starts. */
const ANNOUNCED_FOR = 120

/** A tulip, coming up out of the path at `x` from `plantedAt` (the world's ticks), in colour `colour` (see `TULIP_COLOURS`). */
export interface Tulip {
	id: number
	x: number
	plantedAt: number
	colour: number
}

/** How far grown tulip `t` is, `now`: 0 a shoot just up, 1 in flower, ready to pick. */
export const tulipGrowth = (t: Tulip, now: number) =>
	Math.max(0, Math.min(1, (now - t.plantedAt) / TULIP_GROWS))

/**
 * A potato, by the world's ticks: its shadow on the path from `shownAt`,
 * where it lands at `landsAt`, falling for the `FALL_TICKS` before; and
 * when it did, split open there.
 */
export interface Potato {
	id: number
	x: number
	shownAt: number
	landsAt: number
	landedAt?: number
}

/**
 * Where potato `p` is, `now`: how near it is to landing, 0 to 1, for its
 * shadow; whether it's falling, on the screen; and if so, the middle of it.
 */
export function potatoAt(p: Potato, ground: number, now: number) {
	const near = Math.max(
		0,
		Math.min(1, (now - p.shownAt) / Math.max(1, p.landsAt - p.shownAt)),
	)
	const left = p.landsAt - now
	const falling = p.landedAt === undefined && left <= FALL_TICKS && left >= 0
	const y = ground - POTATO_HEIGHT / 2 - Math.max(0, left) * FALL_SPEED
	return { near, falling, y }
}

/** How far down into the ground someone's been knocked, in px: none, if they're still up. */
export const buriedDepth = (racer: Racer) =>
	racer.body.buriedAt === undefined
		? 0
		: Math.round(racer.runner.sprite.height * RUNNER_SCALE * BURIED)

export const potatoRain: Minigame = {
	id: 'potato-rain',
	name: 'Potato Rain',
	blurb:
		'Pick the tulips as they flower, and keep out from under the falling potatoes: watch for their shadows! Most tulips wins. The last one standing gets 5 seconds more to pick.',
	tune: 'cliff',
	collectables: [],
	course: arenaCourse(
		'potato-rain',
		'Potato Rain',
		'Pick tulips, dodge the falling potatoes. Most tulips wins!',
		// A clearing in a tulip field, in spring (see `arenaSets`).
		{
			palette: {
				'--sky-blue-top': '#7cc8f0',
				'--sky-blue-bottom': '#d8f0ff',
				'--grass-green': TULIP_GRASS,
				'--grass-dark-green': TULIP_GRASS_SHADE,
				'--dirt-brown': TULIP_PATH,
				'--dirt-dark-brown': TULIP_PATH_SHADE,
			},
			far: [],
			near: [],
			horizonTrees: false,
		},
	),
	start: startPotatoRain,
}

function startPotatoRain(world: World): MinigameRun {
	const { racers } = world
	const potatoes: Potato[] = []
	const tulips: Tulip[] = []
	let nextId = 0
	/** When the next potato's due, and the next tulip, by the race's ticks. */
	let nextDrop = 30
	let nextTulip = 0
	/** How many tulips each Player's picked, by their place in `racers`. */
	const picked = racers.map(() => 0)
	/** When the last one standing's time to pick a few more ends, by the race's ticks, once it's begun. */
	let bonusEnd: number | undefined
	shows.set(world, { potatoes, tulips })

	// Everyone spread out along the path, facing in.
	const { left, right } = ARENA_WALLS
	// Spread out along it, in no particular order.
	inRandomOrder(racers).forEach((racer, i) => {
		const b = racer.body
		b.buriedAt = undefined
		const x = left + 60 + ((right - left - 120) * (i + 0.5)) / racers.length
		b.x = Math.round(x)
		b.feetY = world.terrain.groundY(b.x)
		b.floor = b.feetY
		b.facing = x < (left + right) / 2 ? 1 : -1
	})

	const ticksLeft = () =>
		Math.max(
			0,
			Math.min(POTATO_TICKS, bonusEnd ?? POTATO_TICKS) - world.raceTicks(),
		)
	const buried = (racer: Racer) => racer.body.buriedAt !== undefined
	const tulipsOf = (racer: Racer) => picked[racers.indexOf(racer)] ?? 0
	/** "3 tulips", or "1 tulip". */
	const counted = (racer: Racer) => {
		const n = tulipsOf(racer)
		return `${n} tulip${n === 1 ? '' : 's'}`
	}
	const standing = () => racers.filter((r) => !buried(r))
	const solo = racers.length === 1
	/** How far through it is, 0 to 1: they come quicker, and fall faster, as it goes. */
	const progress = () => Math.min(1, world.raceTicks() / POTATO_TICKS)

	function drop() {
		const up = standing()
		// Right over someone, now and then, so nobody can stand still.
		const over =
			up.length && Math.random() < AIMED
				? up[Math.floor(Math.random() * up.length)].body.x +
					(Math.random() - 0.5) * 80
				: left + Math.random() * (right - left)
		const now = world.ticks()
		const warning = WARNING_FIRST + (WARNING_LAST - WARNING_FIRST) * progress()
		potatoes.push({
			id: nextId++,
			x: Math.round(Math.max(left, Math.min(right, over))),
			shownAt: now,
			landsAt: now + Math.round(warning),
		})
	}

	/** A tulip coming up somewhere on the path clear of the others. */
	function plant() {
		const now = world.ticks()
		for (let tries = 0; tries < 12; tries++) {
			const x = Math.round(left + 20 + Math.random() * (right - left - 40))
			if (tulips.some((t) => Math.abs(t.x - x) < TULIP_APART)) continue
			tulips.push({
				id: nextId++,
				x,
				plantedAt: now,
				colour: Math.floor(Math.random() * TULIP_COLOURS.length),
			})
			return
		}
	}

	function bury(racer: Racer) {
		const b = racer.body
		b.buriedAt = world.raceTicks()
		b.vx = 0
		b.vy = 0
		b.feetY = world.terrain.groundY(b.x)
		b.grounded = true
		b.ducking = false
		world.popup(
			solo ? `Lasted ${clock(b.buriedAt, 'down')}` : 'Bonk!',
			b.x,
			b.feetY - 90,
		)
		play('stomp')
	}

	/**
	 * Down to the last one standing: their 5 seconds to pick a few more,
	 * begun. Over: everyone buried, or time's up.
	 */
	function decide() {
		if (world.order()) return
		const up = standing().length
		if (racers.length > 1 && up === 1 && bonusEnd === undefined) {
			bonusEnd = world.raceTicks() + BONUS_TICKS
		}
		if (ticksLeft() > 0 && up > 0) return
		// Most tulips first; between those with as many, whoever lasted longer.
		const order = [...racers].sort(
			(a, b) =>
				tulipsOf(b) - tulipsOf(a) ||
				(b.body.buriedAt ?? Number.POSITIVE_INFINITY) -
					(a.body.buriedAt ?? Number.POSITIVE_INFINITY),
		)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const winner = order[0]
		const said = solo ? `${counted(winner)}!` : `${winner.runner.name} wins!`
		world.popup(said, winner.body.x, winner.body.feetY - 120)
		play('finished')
	}

	/** The winner, once it's over, up on their feet to dance. */
	const done = (racer: Racer) => world.order()?.[0] === racer && !buried(racer)
	/** What each bot's decided to hold, and till when: it only looks now and then. */
	const choices = new Map<string, { held: Controls; until: number }>()

	return {
		id: 'potato-rain',
		ticksLeft,
		chip: (racer) =>
			buried(racer) ? `${tulipsOf(racer)} Out` : `${tulipsOf(racer)}`,
		timeNote: (racer) => {
			const at = racer.body.buriedAt
			return at !== undefined
				? `${counted(racer)} · Lasted ${clock(at, 'down')}`
				: counted(racer)
		},
		announce: () =>
			bonusEnd !== undefined &&
			!world.order() &&
			world.raceTicks() - (bonusEnd - BONUS_TICKS) < ANNOUNCED_FOR
				? 'Bonus time!'
				: undefined,
		// A bot: every so often, off towards whichever spot near it has the
		// fewest shadows about to land and the most tulips in flower, or
		// that will be by the time it's there, away from the walls. Slow to
		// see one coming down right on it. In the bonus, with nothing to
		// fear, after every tulip there is.
		bot: (racer) => {
			if (buried(racer)) return IDLE
			const b = racer.body
			const now = world.ticks()
			const was = choices.get(racer.id)
			if (was && now < was.until) return was.held
			const bonus = bonusEnd !== undefined
			const danger = (x: number) =>
				(bonus
					? 0
					: potatoes.reduce(
							(d, p) =>
								p.landedAt === undefined &&
								Math.abs(p.x - x) < POTATO_WIDTH * 0.7
									? d + 1 / Math.max(4, p.landsAt - now)
									: d,
							0,
						)) + (x < left + 20 || x > right - 20 ? 1 : 0)
			const pull = (x: number) =>
				tulips.reduce(
					(d, t) =>
						d +
						tulipGrowth(t, now + Math.abs(t.x - b.x) / BOT_RUNS) *
							Math.max(0, 1 - Math.abs(t.x - x) / BOT_TULIP_NEAR),
					0,
				) * BOT_TULIP_PULL
			// Any of a few steps either way, or right to a tulip: near it, or
			// in the bonus, anywhere.
			const ways = [
				-130,
				-70,
				0,
				70,
				130,
				...tulips
					.map((t) => t.x - b.x)
					.filter((dx) => bonus || Math.abs(dx) < BOT_LOOKS),
			].map((dx) => ({
				dx,
				d: danger(b.x + dx) - pull(b.x + dx) + Math.abs(dx) * 0.00002,
			}))
			const go = ways.reduce((a, c) => (c.d < a.d ? c : a)).dx
			const held = { ...IDLE, left: go < -6, right: go > 6 }
			choices.set(racer.id, { held, until: now + 5 + Math.random() * 8 })
			return held
		},
		note: (racer) => {
			const at = racer.body.buriedAt
			if (at === undefined) return counted(racer)
			return solo
				? `${counted(racer)} · Lasted ${clock(at, 'down')}`
				: `${counted(racer)} · Buried`
		},
		done,
		out: buried,
		step() {
			if (world.phase() !== 'running') return
			const now = world.ticks()
			const ground = world.terrain.groundY(START_X)

			// Nobody off either end; and anyone buried, stuck where they are.
			for (const racer of racers) {
				const b = racer.body
				if (buried(racer)) {
					b.held = 2
					b.vx = 0
					b.feetY = ground
					continue
				}
				if (b.x < left) {
					b.x = left
					b.vx = Math.max(0, b.vx)
				} else if (b.x > right) {
					b.x = right
					b.vx = Math.min(0, b.vx)
				}
				b.celebrating = done(racer)
			}

			// More potatoes, quicker the longer it's gone on, and the more
			// there are; none, in the bonus.
			if (
				!world.order() &&
				bonusEnd === undefined &&
				world.raceTicks() >= nextDrop
			) {
				drop()
				const every = EVERY_FIRST + (EVERY_LAST - EVERY_FIRST) * progress()
				const crowd = 1 + 0.12 * Math.max(0, racers.length - 2)
				nextDrop =
					world.raceTicks() +
					Math.round((every / crowd) * (0.7 + Math.random() * 0.6))
			}

			for (const p of potatoes) {
				if (p.landedAt !== undefined) continue
				const at = potatoAt(p, ground, now)
				if (!at.falling) continue
				// Onto anyone still up under it: anywhere it's come down past
				// since last tick, it's that fast.
				const bottom = at.y + POTATO_HEIGHT / 2
				const was = bottom - FALL_SPEED - POTATO_HEIGHT
				// Not in the bonus: the last one standing's safe, then.
				if (!world.order() && bonusEnd === undefined)
					for (const racer of racers) {
						if (buried(racer)) continue
						const b = racer.body
						const reach = POTATO_WIDTH / 2 + HITBOX_HALF_WIDTH - GIVE
						if (Math.abs(b.x - p.x) > reach) continue
						if (bottom < b.feetY - bodyHeight(b) || was > b.feetY) continue
						bury(racer)
					}
				// Onto the path: smashed, its mash splattered out, any tulip
				// under it squashed.
				if (now >= p.landsAt) {
					p.landedAt = now
					play('squelch')
					for (let i = tulips.length - 1; i >= 0; i--)
						if (Math.abs(tulips[i].x - p.x) < POTATO_WIDTH / 2)
							tulips.splice(i, 1)
				}
			}
			// Gone, a while after landing.
			for (let i = potatoes.length - 1; i >= 0; i--) {
				const at = potatoes[i].landedAt
				if (at !== undefined && now - at > SPLIT_LIES + SPLIT_FADES)
					potatoes.splice(i, 1)
			}

			// Tulips coming up, while there's room for more.
			if (!world.order() && world.raceTicks() >= nextTulip) {
				if (tulips.length < racers.length * TULIPS_EACH + TULIPS_MORE) plant()
				nextTulip =
					world.raceTicks() +
					TULIP_EVERY +
					Math.round(Math.random() * TULIP_LATER)
			}
			// Picked, in flower, by anyone up running over it.
			if (!world.order())
				racers.forEach((racer, i) => {
					if (buried(racer)) return
					const b = racer.body
					if (b.feetY < ground - PICK_HIGH) return
					for (let t = tulips.length - 1; t >= 0; t--) {
						const tulip = tulips[t]
						if (tulipGrowth(tulip, now) < 1) continue
						if (Math.abs(tulip.x - b.x) > PICK_REACH) continue
						tulips.splice(t, 1)
						picked[i]++
						world.popup('+1', tulip.x, ground - 70)
						play('fika')
					}
				})

			decide()
		},
		frame(): MinigameFrame {
			return {
				potatoes: potatoes.map((p) => [
					p.id,
					p.x,
					p.shownAt,
					p.landsAt,
					p.landedAt ?? -1,
				]),
				buried: racers.map((r) => r.body.buriedAt ?? -1),
				tulips: tulips.map((t) => [t.id, t.x, t.plantedAt, t.colour]),
				picked: [...picked],
				bonusEnd: bonusEnd ?? -1,
			}
		},
		apply(a) {
			// Where each is goes by the tick: nothing to tween.
			potatoes.length = 0
			for (const [id, x, shownAt, landsAt, landedAt] of a.potatoes ?? [])
				potatoes.push({
					id,
					x,
					shownAt,
					landsAt,
					landedAt: landedAt < 0 ? undefined : landedAt,
				})
			tulips.length = 0
			for (const [id, x, plantedAt, colour] of a.tulips ?? [])
				tulips.push({ id, x, plantedAt, colour })
			racers.forEach((racer, i) => {
				const at = a.buried?.[i] ?? -1
				racer.body.buriedAt = at < 0 ? undefined : at
				picked[i] = a.picked?.[i] ?? 0
				racer.body.celebrating = done(racer)
			})
			bonusEnd = (a.bonusEnd ?? -1) < 0 ? undefined : a.bonusEnd
		},
	}
}

/** What's to be drawn of a game of Potato Rain: its potatoes, and its tulips. */
export interface PotatoShow {
	potatoes: Potato[]
	tulips: Tulip[]
}
const shows = new WeakMap<World, PotatoShow>()

/** `world`'s game of Potato Rain, for drawing, if it's one. */
export const potatoesOf = (world: World) => shows.get(world)
