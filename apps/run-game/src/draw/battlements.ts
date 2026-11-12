import { DEPTH_SLANT, PATH_BACK, PATH_FRONT } from '../game/constants'
import type { Terrain } from '../game/terrain'

/** How wide a merlon is, and the gap between two: one of each, over and over. */
export const MERLON = 12
/** How tall a merlon stands over its parapet, and how tall the parapet in front is. */
export const MERLON_HEIGHT = 8
export const PARAPET = 12

/** Whether there's a merlon at `x` along: every other `MERLON`. */
export const isMerlon = (x: number) => Math.floor(x / MERLON) % 2 === 0

/**
 * A parapet along the path's near edge, in front of the runners, with its
 * merlons, as an SVG path: from `from` to `to`, `step` px at a time, its
 * coordinates the world's less `from`. None over a Gap.
 */
export function frontParapet(
	terrain: Terrain,
	from: number,
	to: number,
	step: number,
) {
	let d = ''
	for (let x = from; x < to; x += step) {
		const middle = x + step / 2
		if (terrain.inGap(middle)) continue
		const line = Math.round(terrain.groundY(middle) / 2) * 2
		const top = line + PATH_FRONT - 4 - (isMerlon(x) ? MERLON_HEIGHT : 0)
		const bottom = line + PATH_FRONT + PARAPET - 4
		d += ` M${x - from},${top} h${step} V${bottom} h${-step} Z`
	}
	return d
}

/** And the merlons along the top of the parapet behind it, which the ground draws. */
export function backMerlons(
	terrain: Terrain,
	from: number,
	to: number,
	step: number,
	parapet: number,
) {
	let d = ''
	for (let x = from; x < to; x += step) {
		const middle = x + step / 2
		if (terrain.inGap(middle) || !isMerlon(x + DEPTH_SLANT)) continue
		const line = Math.round(terrain.groundY(middle) / 2) * 2
		const top = line - PATH_BACK - parapet - MERLON_HEIGHT
		d += ` M${x - from},${top} h${step} V${top + MERLON_HEIGHT} h${-step} Z`
	}
	return d
}

/**
 * Along the tops of the parapet in front and its merlons, `cap` px deep, as
 * one path: where the light catches them.
 */
export function frontParapetCaps(
	terrain: Terrain,
	from: number,
	to: number,
	step: number,
	cap: number,
) {
	let d = ''
	for (let x = from; x < to; x += step) {
		const middle = x + step / 2
		if (terrain.inGap(middle)) continue
		const line = Math.round(terrain.groundY(middle) / 2) * 2
		const top = line + PATH_FRONT - 4 - (isMerlon(x) ? MERLON_HEIGHT : 0)
		d += ` M${x - from},${top} h${step} v${cap} h${-step} Z`
	}
	return d
}

/** And the tops of the merlons behind. */
export function backMerlonCaps(
	terrain: Terrain,
	from: number,
	to: number,
	step: number,
	parapet: number,
	cap: number,
) {
	let d = ''
	for (let x = from; x < to; x += step) {
		const middle = x + step / 2
		if (terrain.inGap(middle) || !isMerlon(x + DEPTH_SLANT)) continue
		const line = Math.round(terrain.groundY(middle) / 2) * 2
		const top = line - PATH_BACK - parapet - MERLON_HEIGHT
		d += ` M${x - from},${top} h${step} v${cap} h${-step} Z`
	}
	return d
}
