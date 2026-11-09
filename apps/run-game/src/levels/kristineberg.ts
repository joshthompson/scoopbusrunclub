import type { RunnerName } from '@/data/runners'
import { TRACK_GROUND } from '../game/Stadium'
import { START_X } from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { createTerrain } from '../game/terrain'
import { seeded } from './seeded'
import type { Level, LevelDefinition, Obstacle } from './types'

/**
 * Kristineberg: round and round the running track at Kristinebergs IP, dead
 * flat, past the grandstand once a lap. No trees, no mud: hurdles to clear,
 * potholes in the track, and children playing football on it.
 */

const VOLUNTEERS: RunnerName[] = [
	'anna',
	'rick',
	'lyra',
	'august',
	'keith',
	'josh',
	'eline',
]

/** Flat all the way: 5 km is 12½ laps. */
const terrain = createTerrain([0, 0], 5000, 5000, { bumps: false })

/** Hurdles in a row are this far apart: a jump each, landing in between. */
const HURDLE_GAP = 300

function layOut(): Pick<Level, 'obstacles' | 'scenery'> {
	const random = seeded(400)
	const obstacles: Obstacle[] = []
	let fika = 0
	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		const roll = random()
		if (roll < 0.38) {
			// A flight of one to three hurdles.
			const count = 1 + Math.floor(random() * 3)
			for (let i = 0; i < count; i++)
				obstacles.push({ kind: 'hurdle', x: x + i * HURDLE_GAP })
			x += (count - 1) * HURDLE_GAP
		} else if (roll < 0.55)
			obstacles.push({
				kind: 'pothole',
				x,
				width: 40 + Math.round(random() * 14) * 2,
			})
		else if (roll < 0.7)
			obstacles.push({ kind: 'kids', x, count: random() < 0.5 ? 2 : 3 })
		else if (roll < 0.86)
			obstacles.push({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
			})
		else
			obstacles.push({
				kind: 'cheer',
				x,
				member: VOLUNTEERS[Math.floor(random() * VOLUNTEERS.length)],
			})
		// Further apart early on, closer together towards the end, as at Haga.
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (520 - progress * 260)
	}
	// Nothing at the side of a track: the stadium's behind it.
	return { obstacles, scenery: [] }
}

export const kristineberg: LevelDefinition = {
	id: 'kristineberg',
	name: 'Kristineberg',
	blurb:
		'Round and round the track, dead flat: hurdles, potholes, and children playing football.',
	difficulty: 2,
	terrain,
	runDirectors: ['keith', 'claire'],
	volunteers: VOLUNTEERS,
	look: {
		stadium: true,
		ground: TRACK_GROUND,
	},
	...layOut(),
}
