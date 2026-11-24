import {
	SEA_STACK_SEA,
	SEA_STACK_SEA_FAR,
	SEA_STACK_SKY_BOTTOM,
	SEA_STACK_SKY_TOP,
	seaStackFar,
	seaStackNear,
} from '../courses/kit/seaStackScenery'
import {
	RUNNER_SCALE,
	RUN_TOP_SPEED,
	START_X,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import type { CrabPose } from '../game/hats'
import type { Terrain } from '../game/terrain'
import type { Racer, World } from '../game/world'
import type { Controls } from '../input'
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
 * Mr Claws: everyone on top of a sea stack, sheer cliffs down to the Sea
 * on both sides, in a Crab Hat. There's no jumping: up's a Pinch, both
 * claws snapping out sideways, and an unGuarded runner in reach is
 * Grabbed, held up in the claws, to be carried to the edge and Dropped in.
 * Down's Guard: claws crossed, no Pinch gets you, but each one shoves you
 * back a step; and it wears out, the crab fading to grey, coming back
 * slowly once you let go. Two Pinches at once Clash, and shove both apart. Grabbed,
 * mash to Struggle free: easier the longer you're held. In the last half
 * minute the edges crumble away, a slice at a time. The last one on top
 * wins; or after a minute, whoever's still on top, by how many they've
 * sent into the Sea.
 */

/** How long it goes on, at most: a minute. */
export const CLAWS_TICKS = Math.round(60_000 / TICK_MS)

/** The sea stack: its middle, the height of its top (everyone's feet), and the Sea's surface under it. */
export const STACK_MIDDLE = START_X
export const STACK_TOP = 350
export const WATERLINE = 488
/** How far out its top goes either side at first: a core that never crumbles, then slices that do. */
export const CORE_HALF = 100
export const SLICE = 40
export const SLICES = 5
export const STACK_HALF = CORE_HALF + SLICE * SLICES
/**
 * How far in from its drawn edge the top gives way: stood any further out,
 * hanging over it more than about half, they're off. Not, as on a Course,
 * hanging on by their middle.
 */
const EDGE_GIVE = 12

/**
 * The crumbling: from this long before the end, one slice off each side
 * every `SLICE_EVERY`, the outermost first, each wobbling for
 * `WOBBLE_TICKS` before it goes.
 */
export const CRUMBLE_LEFT = Math.round(30_000 / TICK_MS)
const SLICE_EVERY = Math.round(6_000 / TICK_MS)
export const WOBBLE_TICKS = 90
/** How long "Crumbling!" is up on the screen, as it starts. */
const ANNOUNCED_FOR = 150

/**
 * A Pinch: the claws open for `WINDUP` ticks, then snap shut and shoot
 * out, over `SHOOT` ticks, a step at a time, landing once they're right
 * out (`LANDS`), out to `REACH` either side of the middle of you, at about
 * your height; held out `HELD_OUT`, then back in over `RETRACT`. The next
 * can't be till `PINCH_EVERY` after the last began.
 */
const WINDUP = 4
const SHOOT = 4
const LANDS = WINDUP + SHOOT
const HELD_OUT = 6
const RETRACT = 6
const REACH = 64
const REACH_HIGH = 40
const PINCH_EVERY = 26
/**
 * Guard wears out: a full one lasts `GUARD_LASTS` ticks held, and each
 * Pinch it blocks takes `GUARD_BLOCK` of it. Not Guarding, it comes back,
 * empty to full in `GUARD_REFILL`. Run right out, it's broken: no
 * Guarding till it's back to `GUARD_BACK`.
 */
const GUARD_LASTS = 120
const GUARD_BLOCK = 0.2
const GUARD_REFILL = 360
const GUARD_BACK = 0.4
/** A shove, off a Guard or a Clash: how fast, how quickly it dies away, and for how long it's theirs to have. */
const SHOVE_SPEED = 5.5
const SHOVE_KEEP = 0.84
const SHOVE_TICKS = 14
/** Sent into the Sea within this long of a Drop or shove: theirs who did it. */
const CREDIT_TICKS = 180
/** Guarding: how fast they can shuffle along. */
const GUARD_SHUFFLE = 1.2
/** Carrying someone: how much of top speed, and how quickly they stop, heavy. */
const CARRY_SPEED = 0.5
const CARRY_STOPS = 0.85
/** Where the one carried is held: this far out in front, and their middle this far over the carrier's head. */
export const CARRY_OUT = 34
export const CARRY_OVER = 22
/** Let go of, Struggled free, or let go of by a carrier Grabbed: this long before they can be Grabbed again. */
const SAFE_TICKS = 60
/**
 * Struggling: each press of any direction adds `PRESS` to it, more the
 * longer they've been held (up to `PRESS_LATER` more by `HELD_MOST`); and
 * it fills by itself too, faster the longer it's been, full by
 * `HELD_MOST` without a press.
 */
const PRESS = 0.17
const PRESS_LATER = 0.2
const HELD_MOST = Math.round(4_000 / TICK_MS)
/** In the Sea, how near the screen's edges they can swim. */
const SWIM_IN = 24
/** How long a splash or a Clash is drawn for. */
export const SPLASH_TICKS = 40
export const CLASH_TICKS = 24

/** Where each slice is, `side` -1 left or 1 right, `i` 0 against the core to 4 at the edge: its inner and outer x. */
export function sliceSpan(side: number, i: number) {
	const inner = STACK_MIDDLE + side * (CORE_HALF + SLICE * i)
	const outer = inner + side * SLICE
	return { from: Math.min(inner, outer), to: Math.max(inner, outer) }
}

/** When slice `i` (on either side, both at once) starts to wobble, by the race's ticks: the outermost first. */
export const wobblesAt = (i: number) =>
	CLAWS_TICKS - CRUMBLE_LEFT + (SLICES - 1 - i) * SLICE_EVERY
/** And when it goes, falling into the Sea. */
export const fallsAt = (i: number) => wobblesAt(i) + WOBBLE_TICKS

/** How far out the top goes either side at race tick `now`: the slices still there, from the core out. */
export function halfAt(now: number) {
	let half = CORE_HALF
	for (let i = 0; i < SLICES; i++) {
		if (now >= fallsAt(i)) break
		half += SLICE
	}
	return half
}

/**
 * How far out the top goes just now, for the ground to be where it is:
 * shared, one sea stack at a time (there's only ever one game on a screen).
 */
const stack = { half: STACK_HALF }

/** The ground, as the engine sees it: the stack's flat top, and either side of it, nothing, down into the Sea. */
const terrain: Terrain = {
	// A finish line off past the far side of the screen: nobody gets near
	// it, and the ground's drawn (none of it) only so far.
	length: 3000,
	finishX: STACK_MIDDLE + 3000,
	groundY: () => STACK_TOP,
	slope: () => 0,
	gaps: [],
	inGap: (x) => Math.abs(x - STACK_MIDDLE) > stack.half - EDGE_GIVE,
	walls: [],
}

/** Where someone is in a game of Mr Claws, besides where they are. */
export interface Claw {
	/** When their last Pinch began, by the race's ticks (-1 never); and whether it's snapped yet. */
	pinchAt: number
	snapped: boolean
	/** Who they're carrying, Grabbed, and since when. */
	carrying?: Racer
	carryingSince: number
	/** Who's carrying them. */
	carriedBy?: Racer
	/** How near Struggling free they are, 0 to 1. */
	struggle: number
	/** When they went into the Sea (-1 not). */
	inSeaAt: number
	/** How many they've sent into it. */
	drops: number
	/** Not to be Grabbed till then. */
	safeTill: number
	/** How much Guard they've left, 0 to 1; and whether it's broken, run right out, till it's back to `GUARD_BACK`. */
	guard: number
	broken: boolean
	/** Being shoved: how fast, now, and till when. */
	shove: number
	shovedTill: number
	/** Who'd have it, if they went in now, and till when. */
	creditTo?: Racer
	creditTill: number
	/** Who they went off the edge with, carried or carrying: in the Sea at the same moment, sharing a place. */
	with?: Racer
	/** What they held last tick, for a press to be a new one. */
	was: Controls
}

/** What's to be drawn of a game of Mr Claws. */
export interface ClawsShow {
	claws: Map<string, Claw>
	clashes: { x: number; y: number; at: number }[]
	splashes: { x: number; at: number }[]
}
const shows = new WeakMap<World, ClawsShow>()

/** `world`'s game of Mr Claws, for drawing, if it's one. */
export const clawsOf = (world: World) => shows.get(world)

export const mrClaws: Minigame = {
	id: 'mr-claws',
	name: 'Mr Claws',
	tagline: 'Pinch them into the sea',
	blurb:
		'Crab on your head: up to Pinch, down to Guard. Grab someone and Drop them in the Sea! Last one on top wins.',
	tune: 'dino-island:sea',
	collectables: [],
	course: {
		...arenaCourse(
			'mr-claws',
			'Mr Claws',
			'Grab someone and Drop them in the Sea. Last one on top wins!',
			// Out at sea at sundown, other stacks off on the horizon, and sea
			// all the way down: no ground but the stack's top.
			{
				palette: {
					'--sky-blue-top': SEA_STACK_SKY_TOP,
					'--sky-blue-bottom': SEA_STACK_SKY_BOTTOM,
					'--grass-green': SEA_STACK_SEA,
				},
				horizon: {
					far: seaStackFar,
					near: seaStackNear,
					fill: SEA_STACK_SEA_FAR,
				},
				// No sun of its own up in the sky: the one going down on the
				// horizon's it. The clouds lit pink by it.
				sun: 'opacity(0)',
				clouds: 'sepia(0.5) hue-rotate(-25deg) saturate(1.6) brightness(0.92)',
				far: [],
				near: [],
				horizonTrees: false,
				ground: [],
			},
		),
		terrain,
	},
	start: startMrClaws,
}

function startMrClaws(world: World): MinigameRun {
	const { racers } = world
	stack.half = STACK_HALF
	const claws = new Map<string, Claw>()
	const show: ClawsShow = { claws, clashes: [], splashes: [] }
	shows.set(world, show)
	const clawOf = (racer: Racer) => claws.get(racer.id) as Claw
	const now = () => world.raceTicks()
	const solo = racers.length === 1

	// Everyone on top, spread out across it, facing in, in a Crab Hat (the
	// Room puts back whatever they had on, after).
	inRandomOrder(racers).forEach((racer, i) => {
		const b = racer.body
		const x =
			STACK_MIDDLE - 230 + (460 * (i + 0.5)) / Math.max(racers.length, 1)
		b.x = Math.round(x)
		b.feetY = STACK_TOP
		b.floor = STACK_TOP
		b.facing = x < STACK_MIDDLE ? 1 : -1
		b.hat = { kind: 'crabHat' }
		claws.set(racer.id, {
			pinchAt: -1,
			snapped: true,
			carryingSince: -1,
			struggle: 0,
			inSeaAt: -1,
			drops: 0,
			safeTill: -1,
			guard: 1,
			broken: false,
			shove: 0,
			shovedTill: -1,
			creditTill: -1,
			was: { ...IDLE },
		})
	})

	const ticksLeft = () => Math.max(0, CLAWS_TICKS - now())
	const inSea = (racer: Racer) => clawOf(racer).inSeaAt >= 0
	const onTop = () => racers.filter((r) => !inSea(r))
	const guarding = (racer: Racer) => {
		const b = racer.body
		const c = clawOf(racer)
		return (
			b.ducking && b.grounded && !c.carrying && !c.carriedBy && !inSea(racer)
		)
	}
	/** How tall `racer` is, drawn: their sprite, stood up. */
	const tall = (racer: Racer) => racer.runner.sprite.height * RUNNER_SCALE

	/** `racer` shoved `dir`, by `by`, theirs if it puts them in. */
	function shove(racer: Racer, dir: number, by: Racer) {
		const c = clawOf(racer)
		c.shove = dir * SHOVE_SPEED
		c.shovedTill = now() + SHOVE_TICKS
		c.creditTo = by
		c.creditTill = now() + CREDIT_TICKS
		racer.body.facing = dir > 0 ? -1 : 1
	}

	/** `racer`, carried, let go of: off they go, at `vx`, safe for a moment, and theirs who let go, if it's into the Sea. */
	function letGo(racer: Racer, vx: number, by?: Racer) {
		const c = clawOf(racer)
		const carrier = c.carriedBy
		if (carrier) {
			const k = clawOf(carrier)
			k.carrying = undefined
			k.carryingSince = -1
		}
		c.carriedBy = undefined
		c.struggle = 0
		c.safeTill = now() + SAFE_TICKS
		if (by) {
			c.creditTo = by
			c.creditTill = now() + CREDIT_TICKS
		}
		const b = racer.body
		b.held = 0
		b.vx = vx
		b.vy = 0
		b.grounded = false
		b.tilt = undefined
		b.standStill = undefined
	}

	/** `by` Grabbing `racer`: up into their claws; and anyone `racer` was carrying, let go. */
	function grab(by: Racer, racer: Racer) {
		const c = clawOf(racer)
		if (c.carrying) {
			const dropped = c.carrying
			dropped.body.x = racer.body.x
			letGo(dropped, 0)
		}
		c.carriedBy = by
		c.struggle = 0
		c.snapped = true
		c.shovedTill = -1
		const k = clawOf(by)
		k.carrying = racer
		k.carryingSince = now()
		world.popup('Grabbed!', racer.body.x, racer.body.feetY - 90)
	}

	/** `racer`'s Pinch, its claws right out: a Clash, a Guard shoved, a Grab, or nothing. */
	function snap(racer: Racer) {
		const c = clawOf(racer)
		c.snapped = true
		const b = racer.body
		play('pinch')
		let target: Racer | undefined
		let nearest = Number.POSITIVE_INFINITY
		for (const other of onTop()) {
			if (other === racer) continue
			const o = other.body
			const k = clawOf(other)
			if (k.carriedBy || !o.grounded) continue
			const dx = Math.abs(o.x - b.x)
			if (dx > REACH || Math.abs(o.feetY - b.feetY) > REACH_HIGH) continue
			if (dx < nearest) {
				nearest = dx
				target = other
			}
		}
		if (!target) return
		const o = target.body
		const k = clawOf(target)
		const away = Math.sign(o.x - b.x) || -b.facing
		if (!k.snapped && k.pinchAt >= 0) {
			// Claw on claw: a Clash. Both shoved apart, both free to go again.
			k.snapped = true
			shove(target, away, racer)
			shove(racer, -away, target)
			c.pinchAt = -1
			k.pinchAt = -1
			const y = Math.min(b.feetY - tall(racer), o.feetY - tall(target))
			show.clashes.push({ x: (b.x + o.x) / 2, y, at: world.ticks() })
			world.popup('Clash!', (b.x + o.x) / 2, y - 40)
			play('clash')
			return
		}
		if (guarding(target)) {
			// Guarded: no Grab, but shoved back a step, and Guard worn down.
			shove(target, away, racer)
			k.guard -= GUARD_BLOCK
			if (k.guard <= 0) breakGuard(target)
			else world.popup('Blocked!', o.x, o.feetY - 70)
			play('stomp')
			return
		}
		if (now() < k.safeTill) return
		grab(racer, target)
	}

	/** `racer`'s Guard run right out: broken, till it's come back some. */
	function breakGuard(racer: Racer) {
		const c = clawOf(racer)
		c.guard = 0
		c.broken = true
		world.popup('Guard broken!', racer.body.x, racer.body.feetY - 70)
		play('smash')
	}

	/** Whether `racer` can Guard: not carrying anyone, and some Guard left, not broken. */
	const canGuard = (racer: Racer) => {
		const c = clawOf(racer)
		return !c.carrying && !c.broken && c.guard > 0
	}

	/** How worn out `racer`'s Guard is, for their Crab Hat's colour: 0 fresh to 3 spent. */
	function tiredOf(racer: Racer) {
		const c = clawOf(racer)
		if (c.broken) return 3
		return c.guard >= 0.75 ? 0 : c.guard >= 0.5 ? 1 : c.guard >= 0.25 ? 2 : 3
	}

	/** How `racer`'s Crab Hat's claws are, just now. */
	function poseOf(racer: Racer): CrabPose {
		const c = clawOf(racer)
		const b = racer.body
		if (c.carrying) return 'carry'
		if (b.ducking && b.grounded && !c.carriedBy && !inSea(racer)) return 'guard'
		const since = c.pinchAt < 0 ? Number.POSITIVE_INFINITY : now() - c.pinchAt
		if (since < WINDUP) return 'open'
		// Shooting out, a step at a time; held right out; and back in.
		if (since < LANDS) return since < WINDUP + SHOOT / 2 ? 'snap1' : 'snap2'
		if (since < LANDS + HELD_OUT) return 'snap'
		const back = since - LANDS - HELD_OUT
		if (back < RETRACT) return back < RETRACT / 2 ? 'snap2' : 'snap1'
		return 'rest'
	}

	/** Splash! `racer` into the Sea: out, and theirs who put them there. */
	function intoSea(racer: Racer) {
		const c = clawOf(racer)
		const b = racer.body
		const partner = c.with && clawOf(c.with)
		c.inSeaAt = partner && partner.inSeaAt >= 0 ? partner.inSeaAt : now()
		if (c.creditTo && now() <= c.creditTill && c.creditTo !== racer)
			clawOf(c.creditTo).drops++
		show.splashes.push({ x: b.x, at: world.ticks() })
		world.popup(
			solo ? `Lasted ${clock(now(), 'down')}` : 'Splash!',
			b.x,
			WATERLINE - 70,
		)
		play('splash')
	}

	/** In the Sea: treading water, swimming about (round the stack, not through it), hopping up out of it. */
	function swim(racer: Racer) {
		const b = racer.body
		// The stack's foot, as far out as it still goes: rock, not to swim through.
		const foot = halfAt(now()) + 16
		const left = b.x < STACK_MIDDLE
		treadWater(world, racer, {
			waterline: WATERLINE,
			left: left ? ARENA_LEFT + SWIM_IN : STACK_MIDDLE + foot,
			right: left ? STACK_MIDDLE - foot : ARENA_LEFT + VIEW_WIDTH - SWIM_IN,
			splash: (x) => show.splashes.push({ x, at: world.ticks() }),
			// Diving: no deeper than still shows, at the bottom of the screen.
			bottom: VIEW_HEIGHT,
		})
	}

	/** Where places are shared: on top, by how many sent in; in the Sea, by how long they lasted. */
	function placeOf(racer: Racer) {
		const top = onTop()
		const c = clawOf(racer)
		if (!inSea(racer))
			return 1 + top.filter((r) => clawOf(r).drops > c.drops).length
		return (
			1 +
			top.length +
			racers.filter((r) => inSea(r) && clawOf(r).inSeaAt > c.inSeaAt).length
		)
	}

	/** On their way down off the edge, not in the Sea yet. */
	const falling = (racer: Racer) =>
		!inSea(racer) &&
		!clawOf(racer).carriedBy &&
		!racer.body.grounded &&
		terrain.inGap(racer.body.x)

	/** Over: one left on top (or none, on your own), or time's up; not with anyone still on their way down. */
	function decide() {
		if (world.order()) return
		if (racers.some(falling)) return
		const on = onTop().length
		const over = ticksLeft() <= 0 || on === 0 || (!solo && on <= 1)
		if (!over) return
		// Anyone still up in someone's claws: put down, where they are.
		for (const racer of racers) if (clawOf(racer).carriedBy) letGo(racer, 0)
		const order = [...racers].sort((a, b) => placeOf(a) - placeOf(b))
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const winner = order[0]
		const shared = order.filter((r) => placeOf(r) === 1).length > 1
		world.popup(
			solo
				? inSea(winner)
					? `Lasted ${clock(clawOf(winner).inSeaAt, 'down')}`
					: 'Survived the minute!'
				: shared
					? 'Draw!'
					: `${winner.runner.name} wins!`,
			winner.body.x,
			winner.body.feetY - 120,
		)
		play('finished')
	}

	/** Whether `held` has a direction pressed that wasn't last tick: a mash. */
	const mashed = (held: Controls, was: Controls) =>
		(held.left && !was.left) ||
		(held.right && !was.right) ||
		(held.up && !was.up) ||
		(held.down && !was.down)

	/** One tick of `racer`, on top or carried or falling. */
	function stepRacer(racer: Racer, decided: boolean) {
		const b = racer.body
		const c = clawOf(racer)
		const held = decided ? IDLE : racer.controls()
		const t = now()

		// Guarding wears it out; not Guarding, it comes back, slowly.
		if (guarding(racer)) {
			c.guard -= 1 / GUARD_LASTS
			if (c.guard <= 0) breakGuard(racer)
		} else {
			c.guard = Math.min(1, c.guard + 1 / GUARD_REFILL)
			if (c.broken && c.guard >= GUARD_BACK) c.broken = false
		}

		if (c.carriedBy) {
			// Carried: up in the claws, out in front, lying across them,
			// Struggling.
			const carrier = c.carriedBy
			const a = carrier.body
			const k = clawOf(carrier)
			const since = t - k.carryingSince
			const later = Math.min(1, since / HELD_MOST)
			if (mashed(held, c.was)) c.struggle += PRESS + PRESS_LATER * later
			c.struggle += (2 * since) / (HELD_MOST * HELD_MOST)
			if (c.struggle >= 1 && !decided) {
				// Free: down behind them, towards the middle, safe a moment.
				const inwards = Math.sign(STACK_MIDDLE - a.x) || -a.facing
				b.x = a.x
				letGo(racer, inwards * 2.5)
				b.vy = -3
				world.popup('Free!', b.x, b.feetY - 60)
				play('pop')
				return
			}
			b.held = 2
			b.x = a.x + a.facing * CARRY_OUT
			b.feetY = a.feetY - tall(carrier) - CARRY_OVER + tall(racer) / 2
			b.vx = a.vx
			b.vy = 0
			b.facing = a.facing
			b.ducking = false
			b.standStill = true
			b.tilt = 90 * a.facing
			return
		}

		// Off the edge, going down: no getting back on. Kept out past it, as
		// the engine would land them again on the top if they turned back.
		if (!b.grounded && terrain.inGap(b.x) && b.feetY > STACK_TOP + 0.5) {
			const side = Math.sign(b.x - STACK_MIDDLE) || 1
			const out = stack.half - EDGE_GIVE + 2
			if (Math.abs(b.x - STACK_MIDDLE) < out) b.x = STACK_MIDDLE + side * out
			if (b.vx * side < 0) b.vx = 0
		}

		// Shoved: going the way they were shoved, whatever's held.
		if (t < c.shovedTill) {
			b.vx = c.shove
			c.shove *= SHOVE_KEEP
		}

		if (c.carrying) {
			// Heavy: slower, and quick to stop.
			const most = RUN_TOP_SPEED * CARRY_SPEED
			b.vx = Math.max(-most, Math.min(most, b.vx))
			if (!held.left && !held.right) b.vx *= CARRY_STOPS
			// Off the edge with them: both into the Sea, together.
			if (!b.grounded && terrain.inGap(b.x)) {
				const dropped = c.carrying
				letGo(dropped, b.vx, racer)
				c.with = dropped
				clawOf(dropped).with = racer
				return
			}
			// Up: Dropped, out in front, wherever that is.
			if (held.up && !c.was.up && !decided) {
				const dropped = c.carrying
				letGo(dropped, b.vx * 0.8 + b.facing, racer)
				world.popup('Drop!', dropped.body.x, dropped.body.feetY - 50)
				return
			}
			return
		}

		if (guarding(racer) && t >= c.shovedTill)
			b.vx = Math.max(-GUARD_SHUFFLE, Math.min(GUARD_SHUFFLE, b.vx))

		// Up: a Pinch, if one's due.
		const ready = c.pinchAt < 0 || t - c.pinchAt >= PINCH_EVERY
		if (
			held.up &&
			!c.was.up &&
			ready &&
			!decided &&
			b.grounded &&
			!guarding(racer) &&
			b.stumble === 0
		) {
			c.pinchAt = t
			c.snapped = false
		}
		if (!c.snapped && t - c.pinchAt >= LANDS) snap(racer)
	}

	/** Slices off the edges, once it's their time: anyone stood on one, theirs alone if they go in. */
	function crumble() {
		const t = now()
		stack.half = halfAt(t)
		for (let i = 0; i < SLICES; i++) {
			if (t !== fallsAt(i)) continue
			for (const side of [-1, 1]) {
				const { from, to } = sliceSpan(side, i)
				for (const racer of onTop()) {
					const x = racer.body.x
					if (x < from || x > to) continue
					clawOf(racer).creditTo = undefined
				}
			}
			play('rubble')
		}
	}

	/** A bot's choice, held a while: it only looks occasionally. */
	const choices = new Map<
		string,
		{ held: Controls; from: number; until: number }
	>()
	/** Whether each bot's noticed each Pinch coming, decided once. */
	const notices = new Map<string, boolean>()

	function bot(racer: Racer): Controls {
		const c = clawOf(racer)
		if (inSea(racer)) return waterBot(world, racer)
		if (world.order()) return IDLE
		const b = racer.body
		const t = world.ticks()
		// Keeping off a slice that's wobbling: as good as gone.
		const half = halfAt(now() + WOBBLE_TICKS) - EDGE_GIVE
		const side = Math.sign(b.x - STACK_MIDDLE) || 1
		const toEdge = half - Math.abs(b.x - STACK_MIDDLE)

		if (c.carriedBy) {
			// Grabbed: mashing, about as fast as a person, a little unevenly.
			const every = 7 + ((racer.number ?? 1) % 3)
			const phase = Math.floor(t / every) % 2 === 0
			return { ...IDLE, left: phase, right: !phase }
		}
		if (c.carrying) {
			// To the nearer edge, slowing as it gets there, and Drop them
			// once they're held out over it.
			if (toEdge < CARRY_OUT - 4 && b.facing === side)
				return { ...IDLE, up: t % 4 < 2 }
			if (toEdge < 40 && b.vx * side > 0.8) return IDLE
			return { ...IDLE, left: side < 0, right: side > 0 }
		}

		// A Pinch coming at it: Guarded, if it's noticed, as it does a little under half the time.
		for (const other of onTop()) {
			if (other === racer) continue
			const k = clawOf(other)
			if (k.snapped || k.pinchAt < 0) continue
			if (Math.abs(other.body.x - b.x) > REACH + 12) continue
			const key = `${racer.id}:${other.id}:${k.pinchAt}`
			if (!notices.has(key)) notices.set(key, Math.random() < 0.45)
			if (notices.get(key) && canGuard(racer) && clawOf(racer).guard > 0.25)
				choices.set(racer.id, {
					held: { ...IDLE, down: true },
					from: t,
					until: t + 18,
				})
		}
		const choice = choices.get(racer.id)
		if (choice && t < choice.until)
			// A Pinch is a press, not a hold: up for a moment, then let go.
			return choice.held.up && t - choice.from >= 3
				? { ...choice.held, up: false }
				: choice.held

		let held: Controls = { ...IDLE }
		if (toEdge < 40) {
			// Too near the edge: back in.
			held = { ...IDLE, left: side > 0, right: side < 0 }
		} else {
			// After the nearest it can get, Pinching once it's close enough.
			let prey: Racer | undefined
			let nearest = Number.POSITIVE_INFINITY
			for (const other of onTop()) {
				if (other === racer || clawOf(other).carriedBy) continue
				const d = Math.abs(other.body.x - b.x)
				if (d < nearest) {
					nearest = d
					prey = other
				}
			}
			if (prey) {
				const dx = prey.body.x - b.x
				const ready = c.pinchAt < 0 || now() - c.pinchAt >= PINCH_EVERY
				if (Math.abs(dx) < REACH - 6 && ready && Math.random() < 0.35)
					held = { ...IDLE, up: true }
				else if (Math.abs(dx) > REACH - 16)
					held = { ...IDLE, left: dx < 0, right: dx > 0 }
			}
		}
		choices.set(racer.id, {
			held,
			from: t,
			until: t + 10 + Math.floor(Math.random() * 10),
		})
		return held
	}

	return {
		id: 'mr-claws',
		ticksLeft,
		// Up's a Pinch or a Drop, never a jump; carrying, or with no Guard
		// left, there's no Guarding.
		controls: (racer, held) => ({
			...held,
			up: false,
			down: held.down && canGuard(racer),
		}),
		tagRise: (racer) => (clawOf(racer).carrying ? 74 : 16),
		chip: (racer) => (inSea(racer) ? 'Out' : String(clawOf(racer).drops)),
		score: (racer) =>
			inSea(racer) ? clawOf(racer).inSeaAt : 1_000_000 + clawOf(racer).drops,
		placeOf,
		timeNote: (racer) => {
			const c = clawOf(racer)
			if (inSea(racer)) return `Lasted ${clock(c.inSeaAt, 'down')}`
			if (!world.order()) return undefined
			return `${placeOf(racer) === 1 ? 'Won' : 'Survived'}, dropped ${c.drops}`
		},
		bot,
		note: (racer) => {
			const c = clawOf(racer)
			if (solo)
				return inSea(racer)
					? `Lasted ${clock(c.inSeaAt, 'down')}`
					: `Survived ${clock(CLAWS_TICKS, 'down')}!`
			return `Dropped ${c.drops}`
		},
		done: (racer) => !!world.order() && !inSea(racer),
		out: inSea,
		announce: () => {
			if (world.order()) return undefined
			const since = now() - (CLAWS_TICKS - CRUMBLE_LEFT)
			return since >= 0 && since < ANNOUNCED_FOR ? 'Crumbling!' : undefined
		},
		step() {
			if (world.phase() !== 'running') return
			const decided = !!world.order()
			crumble()
			for (const racer of racers) {
				const b = racer.body
				const c = clawOf(racer)
				const under = b.feetY > WATERLINE + 8 && !b.grounded
				if (inSea(racer) || racer.out || under) {
					// Not down out of sight, as down a Gap: in the Sea, floating.
					if (!inSea(racer)) intoSea(racer)
					racer.out ??= 'fallen'
					swim(racer)
					c.was = racer.controls()
					continue
				}
				stepRacer(racer, decided)
				b.celebrating = decided && !inSea(racer)
				c.was = decided ? { ...IDLE } : racer.controls()
			}
			for (const racer of racers)
				racer.body.hat = {
					kind: 'crabHat',
					pose: poseOf(racer),
					tired: tiredOf(racer),
				}
			const tick = world.ticks()
			show.splashes = show.splashes.filter((s) => tick - s.at < SPLASH_TICKS)
			show.clashes = show.clashes.filter((s) => tick - s.at < CLASH_TICKS)
			decide()
		},
		frame(): MinigameFrame {
			const index = (racer: Racer | undefined) =>
				racer ? racers.indexOf(racer) : -1
			return {
				claws: racers.map((racer) => {
					const c = clawOf(racer)
					return [
						c.pinchAt,
						index(c.carrying),
						c.carryingSince,
						Math.round(c.struggle * 100),
						c.inSeaAt,
						c.drops,
						c.safeTill,
						Math.round(c.guard * 100),
						c.broken ? 1 : 0,
					]
				}),
				clashes: show.clashes.map((s) => [
					Math.round(s.x),
					Math.round(s.y),
					s.at,
				]),
				clawSplashes: show.splashes.map((s) => [Math.round(s.x), s.at]),
			}
		},
		apply(a) {
			stack.half = halfAt(now())
			for (const racer of racers) clawOf(racer).carriedBy = undefined
			racers.forEach((racer, i) => {
				const c = clawOf(racer)
				const [
					pinchAt,
					carrying,
					since,
					struggle,
					inSeaAt,
					drops,
					safeTill,
					guard,
					broken,
				] = a.claws?.[i] ?? []
				c.pinchAt = pinchAt ?? -1
				c.snapped = c.pinchAt < 0 || now() - c.pinchAt >= LANDS
				c.carrying = carrying !== undefined ? racers[carrying] : undefined
				c.carryingSince = since ?? -1
				c.struggle = (struggle ?? 0) / 100
				c.inSeaAt = inSeaAt ?? -1
				c.drops = drops ?? 0
				c.safeTill = safeTill ?? -1
				c.guard = (guard ?? 100) / 100
				c.broken = broken === 1
			})
			for (const racer of racers) {
				const c = clawOf(racer)
				if (c.carrying) {
					clawOf(c.carrying).carriedBy = racer
					c.carrying.body.standStill = true
					c.carrying.body.tilt = 90 * racer.body.facing
				}
				racer.body.celebrating = !!world.order() && !inSea(racer)
				racer.body.hat = {
					kind: 'crabHat',
					pose: poseOf(racer),
					tired: tiredOf(racer),
				}
				if (inSea(racer)) poseInWater(world, racer, WATERLINE)
				else if (!c.carriedBy) {
					racer.body.standStill = undefined
					racer.body.tilt = undefined
				}
			}
			show.clashes = (a.clashes ?? []).map(([x, y, at]) => ({ x, y, at }))
			show.splashes = (a.clawSplashes ?? []).map(([x, at]) => ({ x, at }))
		},
	}
}
