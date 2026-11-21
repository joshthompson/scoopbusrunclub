import {
	CAR_PARK_ASPHALT,
	CAR_PARK_ASPHALT_LIGHT,
	CAR_PARK_ASPHALT_SHADE,
	CAR_PARK_SKY_BOTTOM,
	CAR_PARK_SKY_TOP,
	carParkFar,
	carParkNear,
} from '../courses/kit/carParkScenery'
import { GRAVITY, RUNNER_SCALE, START_X, TICK_MS } from '../game/constants'
import type { Racer, World } from '../game/world'
import { collect } from '../saved/collected'
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
 * Pogo Sticks: everyone on a pogo stick in a near-empty car park, bouncing
 * on the spot, stood up straight. Nobody's ever quite balanced: they tip,
 * a little at first, then the further over they are the quicker they go,
 * till they've fallen off, unless they lean back the other way in time.
 * Leaning goes that way too, and bumping into each other knocks them both
 * off balance. Holding jump as they land, they squash the spring right
 * down and go up high, to come down on someone's head and knock them over,
 * though it jolts them, landing. Gone too far over, they topple, stick and
 * all, over its foot, faster and faster, onto the tarmac, bouncing and
 * sliding to a stop. The last one still up wins; or after a minute,
 * whoever still is.
 */

/** How long it goes on, at most: a minute. */
export const POGO_TICKS = Math.round(60_000 / TICK_MS)

/** How far under their feet the stick's spring reaches, sprung right out. */
export const SPRING = 24
/** How far it squashes, landing, at most, and for how long it's down: further, holding jump. */
const SQUASH = 12
const SQUASH_BIG = 18
const CONTACT_TICKS = 10
/**
 * How fast it throws them back up off the ground; holding jump, a big
 * one, over anyone's head; and off someone's head.
 */
const BOUNCE = 6.4
const BOUNCE_BIG = 11.6
const BOUNCE_HEAD = 8.6
/** How much coming down hard jolts their balance, for how fast they land past a bounce's own. */
const LANDING_JOLT = 0.0035

/**
 * How they tip, a tick at a time, in radians: the further over, the
 * quicker (`UNSTABLE_…`, more so as it goes on); and how much leaning the other way against it puts
 * them back (`LEAN`), steadied by `STEADY`.
 */
const UNSTABLE_FIRST = 0.0012
const UNSTABLE_LAST = 0.0044
const LEAN = 0.0021
const STEADY = 0.965
/** How much they wobble of their own accord, to begin with and by the end. */
const WOBBLE_FIRST = 0.0006
const WOBBLE_LAST = 0.0036
/** How far over they can go before they're off it: they topple from there. */
const FALLS_AT = 0.8
/** How hard they topple, over the stick's foot, the further over the harder. */
const TOPPLE = 0.006
/** Hitting the tarmac: how much of the speed they hit it at they bounce, and how much they keep sliding. */
const LANDS_BOUNCE = 0.3
const SLIDES = 0.86
/** How far leaning moves them across, a tick, and how much that keeps. */
const LEAN_DRIFT = 0.14
const DRIFT_KEEPS = 0.96
const DRIFT_MOST = 4

/** How late a bot sees how it's leaning, in ticks: as a person would. */
const BOT_SEES_LATE = 12
/** How far over a bot leans, at most, to drift over to someone. */
const BOT_LEANS_IN = 0.12
/** How close two can be before they bump, and how hard it tips them. */
const BUMP_REACH = 24
const BUMP_TIP = 0.008
/** How hard coming down on someone's head tips them over. */
const HEAD_TIP = 0.035
/** How close over someone their stick has to come down, for their head. */
const HEAD_REACH = 20

/** How each of them is doing, on their stick. `y` is their feet, on its footrests. */
export interface Pogo {
	x: number
	y: number
	vx: number
	vy: number
	/** How far over they are, in radians: right's positive. And how fast they're going over. */
	lean: number
	leanV: number
	/** On the ground, squashing the spring: how far into it, in ticks. */
	contact?: number
	/** How far the spring's squashed, in px. */
	squash: number
	/** When they fell off, by the race's ticks, and which way: -1 left, 1 right. */
	fellAt?: number
	fellTo?: 1 | -1
	/**
	 * Falling off: toppling over the stick's foot, `tipX`, `tipY` (still
	 * coming down to the ground, `tipVy`, if they were in the air); then
	 * `down` on the tarmac, bouncing and sliding. Their middle's `cx`, `cy`
	 * all the way, and how they're turned, `lean`.
	 */
	fall?: {
		tipX: number
		tipY: number
		tipVy: number
		down: boolean
		cx: number
		cy: number
		cvx: number
		cvy: number
	}
	/** When they last bumped someone, so it's heard once. */
	bumpedAt: number
}

export const pogoSticks: Minigame = {
	id: 'pogo-sticks',
	name: 'Pogo Sticks',
	blurb:
		'Keep your balance on a pogo stick: lean the other way when you tip. Bump the others over! Last one standing wins!',
	tune: 'city-rooftop',
	// Its pogo stick: everyone's on one, playing it.
	collectables: ['ride:pogoStick'],
	course: arenaCourse(
		'pogo-sticks',
		'Pogo Sticks',
		'Stay up on your pogo stick. Last one standing wins!',
		// A near-empty car park, a supermarket at the back of it, the town
		// beyond (see `arenaSets`): tarmac all over.
		{
			palette: {
				'--sky-blue-top': CAR_PARK_SKY_TOP,
				'--sky-blue-bottom': CAR_PARK_SKY_BOTTOM,
				'--grass-green': CAR_PARK_ASPHALT,
				'--grass-dark-green': CAR_PARK_ASPHALT_SHADE,
				'--grass-darker-green': CAR_PARK_ASPHALT_SHADE,
				'--dirt-brown': CAR_PARK_ASPHALT_LIGHT,
				'--dirt-dark-brown': CAR_PARK_ASPHALT_SHADE,
				'--dirt-darker-brown': CAR_PARK_ASPHALT_SHADE,
			},
			horizon: { far: carParkFar, near: carParkNear, fill: CAR_PARK_ASPHALT },
			far: [],
			near: [],
			horizonTrees: false,
		},
	),
	start: startPogoSticks,
}

/** What's to be drawn of a game of Pogo Sticks: each of them on their stick, by id. */
export interface PogoShow {
	pogos: Map<string, Pogo>
	ground: number
}
const shows = new WeakMap<World, PogoShow>()

/** `world`'s game of Pogo Sticks, for drawing, if it's one. */
export const pogoOf = (world: World) => shows.get(world)

/** How tall someone's drawn, for where their head is. */
const tallOf = (racer: Racer) => racer.runner.sprite.height * RUNNER_SCALE
const wideOf = (racer: Racer) => racer.runner.sprite.width * RUNNER_SCALE

function startPogoSticks(world: World): MinigameRun {
	const { racers } = world
	const ground = world.terrain.groundY(START_X)
	const { left, right } = ARENA_WALLS
	const pogos = new Map<string, Pogo>()
	shows.set(world, { pogos, ground })
	// Found, by playing it: not by watching its preview.
	if (!world.preview) collect('ride:pogoStick')

	// Everyone on their stick, spread out across the car park in no
	// particular order, a little off true each, so nobody's in step; and
	// there from the first, under the start screen.
	inRandomOrder(racers).forEach((racer, i) => {
		const x = left + 60 + ((right - left - 120) * (i + 0.5)) / racers.length
		const pogo: Pogo = {
			x: Math.round(x),
			y: ground - SPRING - (i % 3) * 8,
			vx: 0,
			vy: 0,
			lean: (Math.random() - 0.5) * 0.02,
			leanV: 0,
			squash: 0,
			bumpedAt: -99,
		}
		pogos.set(racer.id, pogo)
		racer.body.facing = x < (left + right) / 2 ? 1 : -1
		place(racer, pogo)
	})

	const ticksLeft = () => Math.max(0, POGO_TICKS - world.raceTicks())
	const pogoOfRacer = (racer: Racer) => pogos.get(racer.id) as Pogo
	const fallen = (racer: Racer) => pogoOfRacer(racer).fellAt !== undefined
	const standing = () => racers.filter((r) => !fallen(r))
	const solo = racers.length === 1
	const progress = () => Math.min(1, world.raceTicks() / POGO_TICKS)

	/** How far from the stick's foot their middle is, along it. */
	const reachOf = (racer: Racer, p: Pogo) =>
		tallOf(racer) / 2 + SPRING - p.squash

	function fall(racer: Racer, p: Pogo) {
		p.fellAt = world.raceTicks()
		p.fellTo = p.lean < 0 ? -1 : 1
		// Over the stick's foot, wherever it is: on the ground, or still coming down.
		const reach = reachOf(racer, p)
		const cx = p.x
		const cy = p.y - tallOf(racer) / 2
		p.fall = {
			tipX: cx - Math.sin(p.lean) * reach,
			tipY: cy + Math.cos(p.lean) * reach,
			tipVy: p.contact === undefined ? p.vy : 0,
			down: false,
			cx,
			cy,
			cvx: 0,
			cvy: 0,
		}
		world.popup(
			solo ? `Lasted ${clock(p.fellAt, 'down')}` : 'Timber!',
			p.x,
			p.y - 90,
		)
		play('stumble')
	}

	/** Pushes `a` and `b` apart if they've bumped, each tipped away from the other. */
	function bump(a: Pogo, b: Pogo) {
		const dx = b.x - a.x
		if (Math.abs(dx) >= BUMP_REACH || Math.abs(a.y - b.y) > 50) return
		const to = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx)
		const overlap = (BUMP_REACH - Math.abs(dx)) / 2
		a.x -= to * overlap
		b.x += to * overlap
		const closing = (a.vx - b.vx) * to
		if (closing <= 0) return
		// Off each other, as two balls would: and both knocked off balance, away.
		const was = a.vx
		a.vx = b.vx
		b.vx = was
		const knock = BUMP_TIP * (0.6 + closing)
		a.leanV -= to * knock
		b.leanV += to * knock
		const now = world.ticks()
		if (now - a.bumpedAt > 12 && now - b.bumpedAt > 12) {
			play('stomp')
			world.popup('Bump!', (a.x + b.x) / 2, Math.min(a.y, b.y) - 70)
		}
		a.bumpedAt = now
		b.bumpedAt = now
	}

	/** Over: one left up (or none, on your own), or time's up. */
	function decide() {
		if (world.order()) return
		const up = standing().length
		const over = ticksLeft() <= 0 || up === 0 || (racers.length > 1 && up <= 1)
		if (!over) return
		const order = [...racers].sort(
			(a, b) =>
				(pogoOfRacer(b).fellAt ?? Number.POSITIVE_INFINITY) -
				(pogoOfRacer(a).fellAt ?? Number.POSITIVE_INFINITY),
		)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const winner = order[0]
		const p = pogoOfRacer(winner)
		world.popup(
			solo
				? fallen(winner)
					? `Lasted ${clock(p.fellAt ?? 0, 'down')}`
					: 'Bounced the minute!'
				: `${winner.runner.name} wins!`,
			p.x,
			p.y - 120,
		)
		play('finished')
	}

	/** Their body put where their pogo is, for drawing and everything else. */
	function place(racer: Racer, p: Pogo) {
		const b = racer.body
		b.held = 2
		// Never on the ground as the engine sees it: no bouncing on heads but ours.
		b.grounded = true
		b.vx = 0
		b.vy = 0
		b.tilt = (p.lean * 180) / Math.PI
		b.standStill = true
		if (!p.fall) {
			b.x = p.x
			b.feetY = p.y
			return
		}
		// Falling off, or fallen: by their middle.
		b.x = p.fall.cx
		b.feetY = p.fall.cy + tallOf(racer) / 2
	}

	/** Falling off, a tick: toppling over the stick's foot, then on the tarmac, bouncing and sliding. */
	function topple(racer: Racer, p: Pogo) {
		const f = p.fall
		if (!f) return
		const lying = ground - wideOf(racer) / 2
		if (!f.down) {
			const reach = reachOf(racer, p)
			// Still in the air: the stick's foot coming down to the ground.
			if (f.tipY < ground) {
				f.tipVy += GRAVITY
				f.tipY = Math.min(ground, f.tipY + f.tipVy)
				f.tipX += p.vx
			}
			// Over it, faster the further over, as anything tall toppling does.
			p.leanV += Math.sin(p.lean) * TOPPLE
			p.lean += p.leanV
			f.cx = f.tipX + Math.sin(p.lean) * reach
			f.cy = f.tipY - Math.cos(p.lean) * reach
			// On the tarmac: down, as fast as they were going over.
			if (f.cy >= lying || Math.abs(p.lean) >= Math.PI / 2) {
				const to = p.fellTo ?? 1
				const speed = Math.abs(p.leanV) * reach
				f.down = true
				f.cy = lying
				f.cvy = -speed * LANDS_BOUNCE
				f.cvx = p.vx * 0.6 + to * speed * 0.5
				p.lean = (to * Math.PI) / 2
				p.leanV = 0
				play('stomp')
			}
			return
		}
		// Bouncing, and sliding to a stop.
		f.cvy += GRAVITY
		f.cy += f.cvy
		if (f.cy >= lying) {
			f.cy = lying
			f.cvy = Math.abs(f.cvy) > 1.5 ? -f.cvy * LANDS_BOUNCE : 0
			f.cvx *= SLIDES
		}
		f.cx = Math.max(left, Math.min(right, f.cx + f.cvx))
	}

	const done = (racer: Racer) => !!world.order() && !fallen(racer)
	/** How each bot's been leaning, as it sees it: a little late. */
	const seen = new Map<string, number[][]>()
	/** Whether each bot's going for a big bounce, this time it's landed. */
	const bigs = new Map<string, boolean>()

	return {
		id: 'pogo-sticks',
		ticksLeft,
		chip: (racer) => (fallen(racer) ? 'Out' : 'Up'),
		// Still up; then whoever lasted longest.
		score: (racer) => pogoOfRacer(racer).fellAt ?? Number.POSITIVE_INFINITY,
		timeNote: (racer) => {
			const at = pogoOfRacer(racer).fellAt
			if (at !== undefined) return `Lasted ${clock(at, 'down')}`
			return world.order() ? `Bounced ${clock(POGO_TICKS, 'down')}!` : undefined
		},
		// A bot: leaning back against how it's tipping, as it saw it a fifth
		// of a second ago, a little shakily; and out for someone, the nearest
		// still up: leaning their way, to drift over to them, and as it
		// lands, near them, more often than not, a big bounce, to come down
		// on their head.
		bot: (racer) => {
			const p = pogoOfRacer(racer)
			if (p.fall) return IDLE
			const past = seen.get(racer.id) ?? []
			past.push([p.lean, p.leanV])
			seen.set(racer.id, past)
			const [lean, leanV] =
				past.length > BOT_SEES_LATE ? (past.shift() as number[]) : past[0]
			const mark = standing()
				.filter((other) => other !== racer)
				.map((other) => pogoOfRacer(other).x - p.x)
				.reduce<number | undefined>(
					(near, dx) =>
						near === undefined || Math.abs(dx) < Math.abs(near) ? dx : near,
					undefined,
				)
			const towards =
				mark === undefined
					? 0
					: Math.max(-BOT_LEANS_IN, Math.min(BOT_LEANS_IN, mark * 0.0015))
			const steer = lean - towards + leanV * 14 + (Math.random() - 0.5) * 0.02
			// A big bounce or not, decided the once as it lands.
			if (p.contact === undefined) bigs.delete(racer.id)
			else if (!bigs.has(racer.id))
				bigs.set(
					racer.id,
					mark !== undefined && Math.abs(mark) < 130 && Math.random() < 0.6,
				)
			return {
				left: steer > 0.02,
				right: steer < -0.02,
				up: !!bigs.get(racer.id),
				down: false,
			}
		},
		note: (racer) => {
			const at = pogoOfRacer(racer).fellAt
			if (solo)
				return at === undefined
					? `Bounced ${clock(POGO_TICKS, 'down')}!`
					: `Lasted ${clock(at, 'down')}`
			if (world.order()?.[0] === racer) return 'Last standing'
			return at !== undefined ? 'Fell off' : 'Still bouncing'
		},
		done,
		out: fallen,
		step() {
			if (world.phase() !== 'running') {
				for (const racer of racers) place(racer, pogoOfRacer(racer))
				return
			}
			// Tippier and wobblier, the longer it goes on.
			const wobble = WOBBLE_FIRST + (WOBBLE_LAST - WOBBLE_FIRST) * progress()
			const unstable =
				UNSTABLE_FIRST + (UNSTABLE_LAST - UNSTABLE_FIRST) * progress()
			const up = standing()

			for (const racer of up) {
				const p = pogoOfRacer(racer)
				const held = world.order() ? undefined : racer.controls()
				// Tipping: further the further over, a wobble of its own, and
				// leaning back against it, held.
				p.leanV += p.lean * unstable + (Math.random() - 0.5) * wobble
				// Leaning back works less the further over they are: far gone,
				// it's hard to save.
				const saving = 1 - 0.6 * Math.min(1, Math.abs(p.lean) / FALLS_AT)
				p.leanV +=
					(Number(!!held?.right) - Number(!!held?.left)) * LEAN * saving
				p.leanV *= STEADY
				// It's over, and they're still up: they steady themselves, upright.
				if (world.order()) {
					p.leanV *= 0.8
					p.lean *= 0.94
				}
				p.lean += p.leanV
				// Going the way they lean.
				p.vx = Math.max(
					-DRIFT_MOST,
					Math.min(DRIFT_MOST, (p.vx + p.lean * LEAN_DRIFT) * DRIFT_KEEPS),
				)
				p.x += p.vx
				// Off the walls.
				if (p.x < left || p.x > right) {
					p.x = Math.max(left, Math.min(right, p.x))
					p.vx = -p.vx * 0.5
				}
				// Up and down: in the air, then squashing the spring, and off it.
				if (p.contact === undefined) {
					p.vy += GRAVITY
					p.y += p.vy
					p.squash = 0
					if (p.y + SPRING >= ground) {
						p.y = ground - SPRING
						p.contact = 0
						// Coming down hard, from a big bounce: it jolts them.
						const hard = Math.max(0, p.vy - BOUNCE)
						p.leanV += (Math.random() - 0.5) * hard * LANDING_JOLT
					}
				} else {
					p.contact++
					// Holding jump: squashed right down, for a big bounce.
					const big = !!held?.up
					p.squash = Math.round(
						(big ? SQUASH_BIG : SQUASH) *
							Math.sin((Math.PI * p.contact) / CONTACT_TICKS),
					)
					p.y = ground - SPRING + p.squash
					if (p.contact >= CONTACT_TICKS) {
						p.contact = undefined
						p.vy = -(big ? BOUNCE_BIG : BOUNCE)
					}
				}
			}
			// Coming down on someone's head: off it, and them knocked right over.
			for (const racer of up) {
				const p = pogoOfRacer(racer)
				if (p.contact !== undefined || p.vy <= 0) continue
				for (const other of up) {
					if (other === racer) continue
					const o = pogoOfRacer(other)
					if (Math.abs(o.x - p.x) > HEAD_REACH) continue
					const head = o.y - tallOf(other)
					const tip = p.y + SPRING
					if (tip < head || tip - p.vy > head + 4) continue
					p.y = head - SPRING
					p.vy = -BOUNCE_HEAD
					const to = Math.sign(o.x - p.x) || (Math.random() < 0.5 ? -1 : 1)
					o.leanV += to * HEAD_TIP
					play('stomp')
					world.popup('Boing!', o.x, head - 20)
					break
				}
			}
			// Bumping into each other.
			for (let i = 0; i < up.length; i++)
				for (let j = i + 1; j < up.length; j++)
					bump(pogoOfRacer(up[i]), pogoOfRacer(up[j]))
			// Too far over: off.
			for (const racer of up) {
				const p = pogoOfRacer(racer)
				if (Math.abs(p.lean) >= FALLS_AT && !world.order()) fall(racer, p)
			}
			for (const racer of racers) {
				topple(racer, pogoOfRacer(racer))
				place(racer, pogoOfRacer(racer))
				racer.body.celebrating = false
			}
			decide()
		},
		frame(): MinigameFrame {
			return {
				pogos: racers.map((r) => {
					const p = pogoOfRacer(r)
					// Fallen off: where their middle is, instead.
					return [
						Math.round((p.fall ? p.fall.cx : p.x) * 10) / 10,
						Math.round((p.fall ? p.fall.cy : p.y) * 10) / 10,
						Math.round(p.lean * 1000) / 1000,
						p.squash,
						p.fellAt ?? -1,
						p.fellTo ?? 1,
					]
				}),
			}
		},
		apply(a, b, share) {
			const mix = (from: number, to: number) => from + (to - from) * share
			racers.forEach((racer, i) => {
				const from = a.pogos?.[i]
				if (!from) return
				const to = b?.pogos?.[i] ?? from
				const p = pogoOfRacer(racer)
				p.lean = mix(from[2], to[2])
				p.squash = from[3]
				p.fellAt = from[4] < 0 ? undefined : from[4]
				p.fellTo = from[5] < 0 ? -1 : 1
				if (p.fellAt === undefined) {
					p.fall = undefined
					p.x = mix(from[0], to[0])
					p.y = mix(from[1], to[1])
				} else
					p.fall = {
						tipX: 0,
						tipY: 0,
						tipVy: 0,
						down: true,
						cx: mix(from[0], to[0]),
						cy: mix(from[1], to[1]),
						cvx: 0,
						cvy: 0,
					}
				place(racer, p)
			})
		},
	}
}
