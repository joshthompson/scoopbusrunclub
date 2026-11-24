import type { Racer, World } from '../game/world'
import type { Controls } from '../input'
import { play } from '../sfx'
import { IDLE } from './types'

/**
 * Out of a minigame and in the water (Iceberg Bump's sea, Memory Dunk's,
 * Mr Claws'): treading water, upright, head and shoulders out, bobbing;
 * holding a way, off swimming along the surface, lying along, head first,
 * in their swim pose; and up, a little hop up out of it, a splash as they
 * go and another as they land back in. Out, but not still: something to do
 * while they watch.
 */

/** Treading water: how far under the surface their feet are, so their chest's at it, and how much they bob. */
const TREAD_DEPTH = 26
const TREAD_BOB = 2
/** Swimming along: how far under the surface their bottom is, lying along, their back and head out (see `SWIM_TALL`). */
const PADDLE_DEPTH = 9
/** How quickly they go from treading to swimming, and back, down or up in the water. */
const SETTLE = 0.25
/** How fast they swim, and how quickly they get going. */
const SWIM_SPEED = 1.7
const SWIM_GRIP = 0.12
/** A hop up out of the water: how fast up, how much they can steer it, and how soon the next. */
const HOP = 5
const HOP_STEER = 1.2
const HOP_EVERY = 24

/** What's kept of someone in the water between ticks: up held, and when they last hopped, by the world's ticks. */
interface Treader {
	wasUp: boolean
	hopAt: number
	inAir: boolean
}
const treaders = new WeakMap<World, Map<string, Treader>>()
function treaderOf(world: World, racer: Racer) {
	let all = treaders.get(world)
	if (!all) {
		all = new Map()
		treaders.set(world, all)
	}
	let t = all.get(racer.id)
	if (!t) {
		t = { wasUp: false, hopAt: -HOP_EVERY, inAir: false }
		all.set(racer.id, t)
	}
	return t
}

/** The water they're in: its surface, how far either way they can go, and a splash drawn at `x`. */
export interface Water {
	waterline: number
	left: number
	right: number
	splash: (x: number) => void
	/** Whether there's room to hop up out of it at `x`: not under a platform. Anywhere, if not said. */
	canHop?: (x: number) => boolean
}

/**
 * One tick of `racer` in `water`, out, after the engine's moved them
 * (falling, as anyone out does: a hop's rise and fall is its doing). On
 * the Host only; Remote Players' screens pose them with `poseInWater`.
 */
export function treadWater(world: World, racer: Racer, water: Water) {
	const b = racer.body
	const t = treaderOf(world, racer)
	const held = racer.controls()
	const way = Number(held.right) - Number(held.left)
	const now = world.ticks()
	const surface = water.waterline + PADDLE_DEPTH
	b.held = 2

	if (t.inAir) {
		// Up out of the water, a hop: steering a little, till they're back in it.
		if (way) b.vx = way * HOP_STEER
		if (b.vy > 0 && b.feetY >= surface) {
			t.inAir = false
			water.splash(b.x)
			play('splashOther')
		}
	}
	if (!t.inAir) {
		// Up: a hop up out of it, with a splash.
		if (
			held.up &&
			!t.wasUp &&
			now - t.hopAt >= HOP_EVERY &&
			(water.canHop?.(b.x) ?? true)
		) {
			t.inAir = true
			t.hopAt = now
			b.vy = -HOP
			b.feetY = Math.min(b.feetY, surface) - 1
			water.splash(b.x)
			play('splashOther')
		} else {
			// Treading water, or swimming along, holding a way.
			const target = way * SWIM_SPEED
			// The engine slows anyone out a little each tick: set it as it's to be.
			b.vx += (target - b.vx) * SWIM_GRIP
			if (way) b.facing = way > 0 ? 1 : -1
			b.vy = 0
			const depth = way ? PADDLE_DEPTH : TREAD_DEPTH
			const bob = way ? 0 : Math.sin((now + b.x) / 23) * TREAD_BOB
			const to = water.waterline + depth + bob
			b.feetY += (to - b.feetY) * SETTLE
		}
	}
	t.wasUp = held.up
	b.x = Math.max(water.left, Math.min(water.right, b.x))
	poseInWater(world, racer, water.waterline)
}

/**
 * How `racer`, in the water, looks, from where they are in it: up out of
 * it, hopping; near its surface, lying along it, swimming; lower, upright,
 * treading water, rocking with the waves. On every screen.
 */
export function poseInWater(world: World, racer: Racer, waterline: number) {
	const b = racer.body
	const depth = b.feetY - waterline
	if (depth < PADDLE_DEPTH - 2) {
		// Hopping: as anyone in the air.
		b.paddling = false
		b.standStill = undefined
		b.tilt = undefined
		return
	}
	const swimming = depth < (PADDLE_DEPTH + TREAD_DEPTH) / 2
	b.paddling = swimming
	b.standStill = swimming ? undefined : true
	b.tilt = swimming ? undefined : Math.sin((world.ticks() + b.x) / 31) * 6
}

/** A bot, out in the water: swimming about a bit, now and then, and now and then a hop. */
export function waterBot(world: World, racer: Racer): Controls {
	const now = world.ticks()
	const seed = (racer.number ?? 1) * 131
	const spell = Math.floor((now + seed) / 70)
	const pick = (spell * 7919 + seed) % 10
	const way = pick < 2 ? -1 : pick < 4 ? 1 : 0
	return {
		...IDLE,
		left: way < 0,
		right: way > 0,
		up: pick === 9 && (now + seed) % 70 < 3,
	}
}
