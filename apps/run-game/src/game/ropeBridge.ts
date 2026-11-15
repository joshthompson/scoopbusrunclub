import type { PlatformDefinition } from '../courses/types'
import { platformAt } from './platforms'
import type { Terrain } from './terrain'

/**
 * A rope bridge (a Platform with `rope`): it gives under whoever's on it,
 * runners and Pacers alike, sagging most under each, and more the nearer
 * the middle they are; and springs back, bouncing, as they come and go.
 *
 * It's a row of points along its floor, `NODE` apart, its ends tied to the
 * banks: each pulled down towards how far it'd sag under everyone on it
 * now, springy, held back a little, and pulled level with its neighbours,
 * so a dip runs along it. Who's on it goes by where their feet are, not by
 * what they've landed on, so a screen only shown the race can work it out
 * the same.
 */

/** How far apart its points are, along it. */
const NODE = 8
/** How hard each point's pulled towards how far down it'd sag. */
const PULL = 0.08
/** How hard each point's pulled level with its neighbours. */
const TAUT = 0.12
/** How much of its speed each point keeps, a tick: it settles, after a bounce. */
const KEEP = 0.86
/** How near its floor someone's feet are, for them to be stood on it. */
const ON = 6

export interface RopeBridge {
	/** The Platform it is, in the world's. */
	index: number
	left: number
	right: number
	/** How far down each point is, and how fast it's going. */
	sag: number[]
	speed: number[]
}

/** The world's rope bridges, still: one for each Platform that's one. */
export function createRopeBridges(platforms: PlatformDefinition[]) {
	return platforms.flatMap((platform, index): RopeBridge[] => {
		if (!platform.rope) return []
		const count = Math.max(2, Math.ceil(platform.width / NODE) + 1)
		return [
			{
				index,
				left: platform.x,
				right: platform.x + platform.width,
				sag: Array(count).fill(0),
				speed: Array(count).fill(0),
			},
		]
	})
}

/**
 * How far down a bridge has sagged at `x`, between its points: nothing at
 * its ends, nor off it.
 */
export function bridgeSag(bridge: RopeBridge, x: number) {
	if (x <= bridge.left || x >= bridge.right) return 0
	const at = (x - bridge.left) / NODE
	const i = Math.min(bridge.sag.length - 2, Math.floor(at))
	const t = at - i
	return bridge.sag[i] * (1 - t) + bridge.sag[i + 1] * t
}

/** How far down Platform `index` has sagged at `x`: none, if it's not a rope bridge. */
export function sagOf(bridges: RopeBridge[], index: number, x: number) {
	const bridge = bridges.find((b) => b.index === index)
	return bridge ? bridgeSag(bridge, x) : 0
}

/**
 * A tick of each bridge: who's on it, by where their feet are, and each
 * point pulled down under them, springing, and level with its neighbours.
 */
export function stepRopeBridges(
	bridges: RopeBridge[],
	platforms: PlatformDefinition[],
	terrain: Terrain,
	ticks: number,
	feet: { x: number; y: number }[],
) {
	for (const bridge of bridges) {
		const platform = platforms[bridge.index]
		if (platform.broken) continue
		const give = platform.rope?.give ?? 0
		const top = platformAt(terrain, platform, ticks).top
		const span = bridge.right - bridge.left
		const loads = feet
			.filter(
				(f) =>
					f.x > bridge.left &&
					f.x < bridge.right &&
					Math.abs(f.y - (top + bridgeSag(bridge, f.x))) <= ON,
			)
			.map((f) => f.x - bridge.left)
		const { sag, speed } = bridge
		const last = sag.length - 1
		for (let i = 1; i < last; i++) {
			const x = Math.min(span, i * NODE)
			// Under each of them, as a rope under a weight: down in a V to
			// where they are, deepest with them in the middle.
			let want = 0
			for (const at of loads) {
				const deepest = (4 * at * (span - at)) / (span * span)
				const share = x < at ? x / at : (span - x) / (span - at)
				want += give * deepest * share
			}
			want = Math.min(want, give * 1.8)
			speed[i] += (want - sag[i]) * PULL
			speed[i] += (sag[i - 1] + sag[i + 1] - 2 * sag[i]) * TAUT
			speed[i] *= KEEP
		}
		for (let i = 1; i < last; i++) sag[i] += speed[i]
	}
}

/** How long a broken bridge's halves take to swing down to hang from the banks. */
export const BRIDGE_SWING = 28

/**
 * One half of a broken rope bridge, `near` (from its left bank) or `far`
 * (from its right), `ticks` into the race: swung down from where it broke
 * to hang from its bank, and swaying back a little, settling. Where it
 * hangs from, how long it is, how far it's turned down (a quarter turn,
 * hanging straight down), and where its end is, for whoever's hanging on.
 */
export function brokenHalf(
	terrain: Terrain,
	platform: PlatformDefinition,
	side: 'near' | 'far',
	ticks: number,
) {
	const broken = platform.broken
	const top = platformAt(terrain, platform, ticks).top
	const left = platform.x
	const right = platform.x + platform.width
	const at = broken?.x ?? left
	const length = side === 'near' ? at - left : right - at
	const since = broken ? ticks - broken.at : 0
	const down = Math.min(1, since / BRIDGE_SWING)
	// Down, faster and faster, as it falls; then a sway back out over the
	// gorge, and back, dying away.
	const after = Math.max(0, since - BRIDGE_SWING)
	const sway = 0.22 * Math.abs(Math.sin(after * 0.12)) * Math.exp(-after / 40)
	const angle = broken ? (Math.PI / 2) * down * down - sway : 0
	const pivot = side === 'near' ? left : right
	const dir = side === 'near' ? 1 : -1
	return {
		pivot,
		top,
		length,
		/** Turned down from lying across the gorge, clockwise for the near half. */
		angle: dir * angle,
		end: {
			x: pivot + dir * length * Math.cos(angle),
			y: top + length * Math.sin(angle),
		},
		settled: since >= BRIDGE_SWING,
	}
}
