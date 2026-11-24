import type { Racer, World } from '../game/world'
import type { Controls } from '../input'
import { play } from '../sfx'
import { IDLE } from './types'

/**
 * Out of a minigame and in the water (Iceberg Bump's sea, Memory Dunk's,
 * Mr Claws'): treading water, upright, head and shoulders out, bobbing;
 * holding a way, off swimming along the surface, lying along, head first,
 * in their swim pose, turning over into it and back up out of it; holding
 * down, a dive, a meter or so under, swimming about down there till they
 * let go and come back up; and up, a little hop up out of it, a splash as
 * they go and another as they land back in. Out, but not still: something
 * to do while they watch.
 */

/** Treading water: how far under the surface their feet are, so their chest's at it, and how much they bob. */
const TREAD_DEPTH = 26
const TREAD_BOB = 2
/** Swimming along: how far under the surface their bottom is, lying along, their back and head out (see `SWIM_TALL`). */
const PADDLE_DEPTH = 9
/** How quickly they go from treading to swimming, and back, down or up in the water. */
const SETTLE = 0.25
/** Holding down, diving: how far under the surface their bottom goes, lying along, a meter or so under; and how quickly they go down to it, and back up. */
const DIVE_DEPTH = 58
const DIVE_SETTLE = 0.1
/** Diving, how far over the bottom of the screen their bottom stays, so all of them shows. */
const DIVE_ROOM = 6
/** How deep, below treading water, counts as under, diving: lying along, and no hopping from there. */
const UNDER = TREAD_DEPTH + TREAD_BOB + 4
/** How quickly they turn over, stood up to lying along and back, a share of the way a tick. */
const TURN = 0.14
/** Going up or down faster than this a tick, they're on their way somewhere: turned as they were till they get there. */
const MOVING = 0.6
/** Under, how far they point nose down going down, or up coming up, at most; and how quickly they turn to it. */
const STEEPEST = 55
const PITCH_GRIP = 0.15
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
	/** The bottom of the screen: diving, they go no deeper than still shows over it. As deep as a dive goes, if not said. */
	bottom?: number
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
		const under = b.feetY - water.waterline > UNDER
		// Up: a hop up out of it, with a splash; not from under, diving.
		if (
			held.up &&
			!t.wasUp &&
			!held.down &&
			!under &&
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
			// Treading water, or swimming along, holding a way; or, holding
			// down, diving, and swimming along under.
			const target = way * SWIM_SPEED
			// The engine slows anyone out a little each tick: set it as it's to be.
			b.vx += (target - b.vx) * SWIM_GRIP
			if (way) b.facing = way > 0 ? 1 : -1
			b.vy = 0
			const depth = held.down
				? Math.min(
						DIVE_DEPTH,
						(water.bottom ?? Number.POSITIVE_INFINITY) -
							DIVE_ROOM -
							water.waterline,
					)
				: way
					? PADDLE_DEPTH
					: TREAD_DEPTH
			const bob = way || held.down ? 0 : Math.sin((now + b.x) / 23) * TREAD_BOB
			const to = water.waterline + depth + bob
			b.feetY += (to - b.feetY) * (held.down || under ? DIVE_SETTLE : SETTLE)
		}
	}
	t.wasUp = held.up
	b.x = Math.max(water.left, Math.min(water.right, b.x))
	poseInWater(world, racer, water.waterline)
}

/** How someone in the water's turned, as drawn on this screen, kept between ticks: how far over, nose up or down, where they were and when. */
interface Pose {
	lie: number
	pitch: number
	feetY: number
	at: number
}
const poses = new WeakMap<World, Map<string, Pose>>()

/**
 * How `racer`, in the water, looks, from where they are in it, and where
 * they were: up out of it, hopping; near its surface, lying along it,
 * swimming; lower, upright, treading water, rocking with the waves;
 * under, lying along, diving, nose down going down and up coming up.
 * Turning over from stood up to lying along, and back, a little at a
 * time: on their way up or down between, turned as they were till they're
 * there. On every screen.
 */
export function poseInWater(world: World, racer: Racer, waterline: number) {
	const b = racer.body
	const now = world.ticks()
	let all = poses.get(world)
	if (!all) {
		all = new Map()
		poses.set(world, all)
	}
	let pose = all.get(racer.id)
	if (!pose) {
		pose = { lie: 0, pitch: 0, feetY: b.feetY, at: now }
		all.set(racer.id, pose)
	}
	const ticks = Math.max(1, Math.min(10, now - pose.at))
	const dy = (b.feetY - pose.feetY) / ticks
	pose.feetY = b.feetY
	pose.at = now
	const depth = b.feetY - waterline
	if (depth < PADDLE_DEPTH - 2) {
		// Hopping: as anyone in the air, stood up.
		pose.lie = 0
		pose.pitch = 0
		b.paddling = false
		b.lie = undefined
		b.standStill = undefined
		b.tilt = undefined
		return
	}
	// Lying along under, diving; and along the surface, swimming, unless
	// they're on their way down from it. Stood up treading water, once
	// they've stopped there.
	const lying =
		depth > UNDER
			? true
			: depth < (PADDLE_DEPTH + TREAD_DEPTH) / 2
				? dy <= MOVING
					? true
					: undefined
				: Math.abs(dy) <= MOVING
					? false
					: undefined
	if (lying !== undefined) {
		const share = 1 - (1 - TURN) ** ticks
		pose.lie += (Number(lying) - pose.lie) * share
		if (Math.abs(Number(lying) - pose.lie) < 0.01) pose.lie = Number(lying)
	}
	// Under: pointing the way they're going, nose down diving, up rising.
	const steer =
		depth > TREAD_DEPTH
			? Math.max(
					-STEEPEST,
					Math.min(
						STEEPEST,
						(Math.atan2(dy, Math.max(Math.abs(b.vx), 1.2)) * 180) / Math.PI,
					),
				)
			: 0
	pose.pitch += (steer - pose.pitch) * PITCH_GRIP
	const rock = Math.sin((now + b.x) / 31) * 6
	b.lie = pose.lie
	b.paddling = pose.lie >= 0.5
	b.standStill = b.paddling ? undefined : true
	// Rocking with the waves, stood up; nose up or down, lying along.
	b.tilt = rock * (1 - pose.lie) + pose.pitch * b.facing * pose.lie
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
