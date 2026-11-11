import type { PlatformDefinition } from '../courses/types'
import type { Terrain } from './terrain'

/** Where a Platform is on a tick: its left and right ends, and its top. */
export interface PlatformAt {
	left: number
	right: number
	top: number
}

/**
 * Where `platform` is `ticks` into the race. A Moving Platform eases out to
 * its furthest and back, round and round, so it's where it was written at
 * the start of each swing, and the same on every screen for the same tick.
 */
export function platformAt(
	terrain: Terrain,
	platform: PlatformDefinition,
	ticks: number,
): PlatformAt {
	const { move } = platform
	const out = move
		? (1 - Math.cos(2 * Math.PI * (ticks / move.ticks + (move.phase ?? 0)))) / 2
		: 0
	const left = platform.x + (move?.x ?? 0) * out
	return {
		left,
		right: left + platform.width,
		top: terrain.groundY(platform.x) - platform.height - (move?.y ?? 0) * out,
	}
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
) {
	let best: { index: number; top: number } | undefined
	platforms.forEach((platform, index) => {
		if (index === skip) return
		const at = platformAt(terrain, platform, ticks)
		if (x < at.left || x > at.right) return
		// From above it, or level with it, where it was last tick: never up
		// through it. A lift rising to meet someone coming down passes their
		// feet between one tick and the next, and still catches them.
		const before = platformAt(terrain, platform, ticks - 1)
		if (wasFeetY > Math.max(at.top, before.top) + 1 || feetY < at.top) return
		if (!best || at.top < best.top) best = { index, top: at.top }
	})
	return best
}
