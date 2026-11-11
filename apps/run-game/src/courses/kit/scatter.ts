import { START_X } from '../../game/constants'
import type { Terrain } from '../../game/terrain'
import type { Boost, Obstacle } from '../types'

/**
 * Obstacles and Boosts along a course, as the courses lay them out: clear
 * of the start and the finish, further apart early on and closer together
 * towards the end, `pick` choosing what goes at each place, if anything.
 */
export function scatter(options: {
	terrain: Terrain
	random: () => number
	pick: (x: number) => Obstacle | Boost | undefined
	/** Whether anything can go at `x`: not on the edge of a Gap, say. */
	clear?: (x: number) => boolean
}) {
	const { terrain, random, pick, clear = () => true } = options
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	for (let x = START_X + 700; x < terrain.finishX - 500; ) {
		const placed = clear(x) && !terrain.inGap(x) ? pick(x) : undefined
		if (placed) {
			if (
				placed.kind === 'fika' ||
				placed.kind === 'cheer' ||
				placed.kind === 'pumpkin' ||
				placed.kind === 'barcode' ||
				placed.kind === 'ring'
			)
				boosts.push(placed)
			else obstacles.push(placed)
		}
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (520 - progress * 260)
	}
	return { obstacles, boosts }
}

/** Whether `x` is within `room` of a Gap's edge. */
export const nearGap = (terrain: Terrain, x: number, room = 240) =>
	terrain.gaps.some((g) => x > g.from - room && x < g.to + room)
