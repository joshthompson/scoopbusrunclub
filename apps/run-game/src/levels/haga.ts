import flower1 from '@/assets/misc/flower1.png'
import flower2 from '@/assets/misc/flower2.png'
import shrub1 from '@/assets/misc/shrub1.png'
import shrub2 from '@/assets/misc/shrub2.png'
import tree1 from '@/assets/misc/tree1.png'
import tree2 from '@/assets/misc/tree2.png'
import type { RunnerName } from '@/data/runners'
import { START_X } from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { createTerrain } from '../game/terrain'
import { STEP_M, heights } from './haga-profile'
import { seeded } from './seeded'
import type { Level, LevelDefinition, Obstacle } from './types'

/** Members with a volunteer sprite to stand and cheer in. */
const VOLUNTEERS: RunnerName[] = [
	'lyra',
	'anna',
	'rick',
	'august',
	'keith',
	'josh',
	'eline',
]

/** A parkrun is 5 km. Haga's GPS track came out at 5.03. */
const terrain = createTerrain(heights, STEP_M, 5000)

function layOut(): Pick<Level, 'obstacles' | 'scenery'> {
	const random = seeded(5032)
	const obstacles: Obstacle[] = []
	let fika = 0
	// A clear run off the start, and a clear run-in to the finish.
	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		const roll = random()
		if (roll < 0.34) obstacles.push({ kind: 'rock', x })
		else if (roll < 0.56) obstacles.push({ kind: 'branch', x })
		else if (roll < 0.72)
			obstacles.push({ kind: 'mud', x, width: 70 + Math.round(random() * 50) })
		else if (roll < 0.88)
			obstacles.push({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				// Each in turn: picking at random would reshuffle the rest of the course.
				item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
			})
		else
			obstacles.push({
				kind: 'cheer',
				x,
				member: VOLUNTEERS[Math.floor(random() * VOLUNTEERS.length)],
			})
		// Further apart early on, closer together towards the end.
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (520 - progress * 260)
	}

	addGeese(obstacles)

	const scenery: Level['scenery'] = []
	const assets = [tree1, tree2, tree1, shrub1, shrub2, flower1, flower2]
	for (let at = -400; at < terrain.finishX + 900; at += 90 + random() * 260) {
		scenery.push({
			x: Math.round(at),
			asset: assets[Math.floor(random() * assets.length)],
		})
	}
	return { obstacles, scenery }
}

/** Room either side of geese, to land a jump between them and whatever's next. */
const GEESE_ROOM = 320

/**
 * Geese, off Brunnsviken, standing about in the wider gaps between
 * everything else. Their own random numbers, so the rest of the course is
 * laid out the same as ever.
 */
function addGeese(obstacles: Obstacle[]) {
	const random = seeded(1957)
	const placed: Obstacle[] = []
	for (let i = 1; i < obstacles.length; i++) {
		const before = obstacles[i - 1]
		const after = obstacles[i]
		const behind = before.x + ('width' in before ? before.width / 2 : 30)
		const ahead = after.x - ('width' in after ? after.width / 2 : 30)
		if (ahead - behind < GEESE_ROOM * 2 || random() > 0.5) continue
		placed.push({
			kind: 'geese',
			x: Math.round((behind + ahead) / 2),
			count: 1 + Math.floor(random() * 3),
		})
	}
	obstacles.push(...placed)
	obstacles.sort((a, b) => a.x - b.x)
}

/** How many flocks fly over, spread round the course. */
const FLYOVERS = 6

/**
 * Geese flying over from behind, now and then: their own random numbers
 * too, to leave everything else where it was.
 */
function flyOvers(): NonNullable<Level['flyovers']> {
	const random = seeded(2024)
	const from = START_X + 1200
	const spacing = (terrain.finishX - 900 - from) / FLYOVERS
	return Array.from({ length: FLYOVERS }, (_, i) => ({
		x: Math.round(from + spacing * (i + random() * 0.6)),
		count: 1 + Math.floor(random() * 3),
	}))
}

export const haga: LevelDefinition = {
	id: 'haga',
	name: 'Haga',
	blurb: 'The home course. Rocks, branches, mud, and geese to catch a ride on.',
	difficulty: 1,
	terrain,
	runDirectors: ['claire', 'eline'],
	volunteers: VOLUNTEERS,
	...layOut(),
	flyovers: flyOvers(),
}
