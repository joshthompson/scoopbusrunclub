import type { PlatformDefinition } from '../courses/types'
import type { Terrain } from './terrain'
import type { World } from './world'

/** Where a Platform is on a tick: its left and right ends, and its top. */
export interface PlatformAt {
	left: number
	right: number
	top: number
}

/**
 * How far out a Moving Platform is `ticks` into the race, out of 1. It eases
 * out to its furthest and back, round and round, so it's where it was
 * written at the start of each swing, and the same on every screen for the
 * same tick. One that `waits` is still till someone's stood on it that
 * long (since its `since`), then swings out and back the once.
 */
function swingOut(platform: PlatformDefinition, ticks: number) {
	const { move } = platform
	if (!move) return 0
	if (move.waits) {
		if (move.since === undefined) return 0
		const through = (ticks - move.since - move.waits) / move.ticks
		return through > 0 && through < 1
			? (1 - Math.cos(2 * Math.PI * through)) / 2
			: 0
	}
	return (
		(1 - Math.cos(2 * Math.PI * (ticks / move.ticks + (move.phase ?? 0)))) / 2
	)
}

/** Where `platform` is, `out` of the way through its swing, out of 1. */
export function platformOut(
	terrain: Terrain,
	platform: PlatformDefinition,
	out: number,
): PlatformAt {
	const { move } = platform
	const left = platform.x + (move?.x ?? 0) * out
	return {
		left,
		right: left + platform.width,
		top: terrain.groundY(platform.x) - platform.height - (move?.y ?? 0) * out,
	}
}

/** Where `platform` is `ticks` into the race. */
export const platformAt = (
	terrain: Terrain,
	platform: PlatformDefinition,
	ticks: number,
): PlatformAt => platformOut(terrain, platform, swingOut(platform, ticks))

/**
 * A race's own Platforms: its own copy of each that changes as it goes, one
 * that `waits`, to keep when it was set off, and a rope bridge, to keep
 * whether it's broken; not the course's, shared by every race.
 */
export const racePlatforms = (platforms: PlatformDefinition[]) =>
	platforms.map((platform) =>
		platform.move?.waits || platform.rope
			? {
					...platform,
					move: platform.move && { ...platform.move, since: undefined },
					broken: undefined,
				}
			: platform,
	)

/**
 * Each Platform that `waits`, waiting, set off by a Player stood on it: from
 * when they got on (its `since`), and off it goes once they've stood there
 * long enough, not just run across it. Back where it started, it waits
 * again, or sets off again with someone still on it.
 */
export function setOffPlatforms(world: World) {
	const ticks = world.ticks()
	world.platforms.forEach((platform, index) => {
		const { move } = platform
		if (!move?.waits) return
		const on = world.racers.some(
			(r) => !r.out && r.body.grounded && r.body.on === index,
		)
		if (move.since === undefined) {
			if (on) move.since = ticks
			return
		}
		const since = ticks - move.since
		// Got off again before it went.
		if (since < move.waits) {
			if (!on) move.since = undefined
			return
		}
		// On its way, or back.
		if (since < move.waits + move.ticks) return
		move.since = on ? ticks : undefined
	})
}

/** How far `platform` moves from one tick to the next: what it carries whoever's on it. */
export function platformMove(
	terrain: Terrain,
	platform: PlatformDefinition,
	ticks: number,
) {
	if (!platform.move) return { x: 0, y: 0 }
	const now = platformAt(terrain, platform, ticks)
	const before = platformAt(terrain, platform, ticks - 1)
	return { x: now.left - before.left, y: now.top - before.top }
}

/**
 * The Platform someone lands on, falling from `wasFeetY` to `feetY` at `x`:
 * the highest whose top they've come down through, if any. Not `skip`, the
 * one they're dropping through.
 */
export function landingOn(
	terrain: Terrain,
	platforms: PlatformDefinition[],
	ticks: number,
	x: number,
	wasFeetY: number,
	feetY: number,
	skip?: number,
	/**
	 * How far either side of `x` they reach: a solid shelf of rock catches
	 * them on its corner by that much, or they'd come down past it with
	 * their front inside it.
	 */
	reach = 0,
	/** How far down a Platform's sagged at `x`: a rope bridge (see `ropeBridge`). */
	sag: (index: number, x: number) => number = () => 0,
) {
	let best: { index: number; top: number } | undefined
	platforms.forEach((platform, index) => {
		if (index === skip || platform.broken) return
		const at = platformAt(terrain, platform, ticks)
		const edge = platform.solid ? reach : 0
		if (x < at.left - edge || x > at.right + edge) return
		// From above it, or level with it, where it was last tick: never up
		// through it. A lift rising to meet someone coming down passes their
		// feet between one tick and the next, and still catches them.
		const down = sag(index, x)
		const top = at.top + down
		const before = platformAt(terrain, platform, ticks - 1).top + down
		if (wasFeetY > Math.max(top, before) + 1 || feetY < top) return
		if (!best || top < best.top) best = { index, top }
	})
	return best
}

/** A race's Platforms that wait to be set off, in order: for the Host to tell the phones about. */
export const waitingLifts = (world: Pick<World, 'platforms'>) =>
	world.platforms.filter((platform) => platform.move?.waits)
