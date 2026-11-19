import { play } from '../sfx'
import { FOOTBALL_RADIUS } from './football'
import { atSea } from './gliders'
import { inRiver } from './river'
import { inDeepWater } from './swim'
import type { World } from './world'

/**
 * Into the water: the sea, a River or a pond, deep water to swim in, or
 * the sea under a ship's side. Whoever, or whatever, goes in splashes:
 * drawn on every screen from where they are (see `createSplashes`), and
 * heard, for the pack, the egg (or a football) and the hatchling, by the
 * Host (see `soundSplashes`). Racers make their own splash as they go in
 * (see `step`).
 */

/** How far under the surface feet go in, for a splash. */
const SPLASH_DEPTH = 14
/** How long before the same one splashes again: not every bounce in the shallows. */
const SPLASH_AGAIN = 30
/** How long after one splash's heard till the next is: a whole pack diving in is one splash, not a din. */
const HEARD_AGAIN = 10

/** Whether the course has any water to go into. */
export function hasWater(world: World) {
	const { sea, river, deepWater, secret } = world.course
	return !!(sea || river || deepWater || secret?.lifeboat)
}

/** The water's surface at `x`, if there's water there. */
export function waterSurface(world: World, x: number) {
	const { sea, river, deepWater } = world.course
	const overboard = world.course.secret?.lifeboat
	if (sea && atSea(world, x)) return sea.level
	if (river && inRiver(world, x)) return river.level
	if (deepWater && inDeepWater(world, x)) return deepWater.surface
	if (overboard && x > overboard.hole.from - 20 && x < overboard.hole.to + 20)
		return overboard.water
	return undefined
}

/**
 * Something going into the water, called each tick with where its feet
 * are: the surface it's gone in at, if it went in this tick and isn't
 * flying over it. One for everything that might, kept tick to tick.
 */
export function splashWatch(world: World) {
	/** Where everyone's feet were last tick, and when each last splashed. */
	const was = new Map<string, number>()
	const last = new Map<string, number>()
	return (key: string, x: number, feetY: number, flying: boolean) => {
		const before = was.get(key)
		was.set(key, feetY)
		const level = waterSurface(world, x)
		if (flying || before === undefined || level === undefined) return undefined
		const line = level + SPLASH_DEPTH
		if (before >= line || feetY < line) return undefined
		const now = world.ticks()
		const at = last.get(key)
		if (at !== undefined && now - at < SPLASH_AGAIN) return undefined
		last.set(key, now)
		return level
	}
}

/** All that splashes that isn't a racer: the pack, the egg (or a football) and the Followers. */
export function otherSplashers(world: World) {
	const all: { key: string; x: number; feetY: number; flying: boolean }[] = []
	for (const p of world.pack)
		all.push({
			key: `pacer-${p.id}`,
			x: p.x,
			feetY: p.feetY,
			flying: !!p.gliding || p.scooped,
		})
	const ball = world.ball
	if (ball)
		all.push({
			key: 'ball',
			x: ball.x,
			feetY: ball.y + FOOTBALL_RADIUS,
			flying: ball.out === 'scooped' || ball.out === 'hatched',
		})
	for (const f of world.followers)
		all.push({
			key: `follower-${f.owner}-${f.kind}`,
			x: f.x,
			feetY: f.feetY,
			flying: f.carried || f.out === 'scooped',
		})
	return all
}

/** Each race's watch on the pack, the egg and the Followers, and when a splash of theirs was last heard. */
const watches = new WeakMap<
	World,
	{ watch: ReturnType<typeof splashWatch>; heard: number }
>()

/**
 * The pack, the egg (or a football) and the Hatchling going into the
 * water: a splash, quieter than your own, heard if it's in sight.
 */
export function soundSplashes(world: World) {
	if (!hasWater(world)) return
	let state = watches.get(world)
	if (!state) {
		state = { watch: splashWatch(world), heard: Number.NEGATIVE_INFINITY }
		watches.set(world, state)
	}
	const camera = world.camera()
	const now = world.ticks()
	for (const { key, x, feetY, flying } of otherSplashers(world)) {
		if (state.watch(key, x, feetY, flying) === undefined) continue
		if (x < camera || x > camera + world.viewWidth()) continue
		if (now - state.heard < HEARD_AGAIN) continue
		state.heard = now
		play('splashOther')
	}
}
