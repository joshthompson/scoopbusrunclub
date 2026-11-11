import flower1 from '@/assets/misc/flower1.png'
import flower2 from '@/assets/misc/flower2.png'
import shrub1 from '@/assets/misc/shrub1.png'
import shrub2 from '@/assets/misc/shrub2.png'
import type { RunnerName } from '@/data/runners'
import copperTents from '../assets/scenery/copper-tents.png'
import tree1 from '../assets/scenery/tree1.png'
import tree2 from '../assets/scenery/tree2.png'
import { START_X } from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { createTerrain } from '../game/terrain'
import { STEP_M, heights } from './kit/haga-profile'
import { seeded } from './kit/seeded'
import type { Boost, Course, CourseDefinition, Obstacle } from './types'

/** Members with a volunteer sprite to stand and cheer in: the cheerers. */
const CHEERERS: RunnerName[] = [
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

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(5032)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	// A clear run off the start, and a clear run-in to the finish.
	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		const roll = random()
		// No mud at Haga: rocks and branches.
		if (roll < 0.42) obstacles.push({ kind: 'rock', x })
		else if (roll < 0.72) obstacles.push({ kind: 'branch', x })
		else if (roll < 0.88)
			boosts.push({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				// Each in turn: picking at random would reshuffle the rest of the course.
				item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
			})
		else
			boosts.push({
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			})
		// Further apart early on, closer together towards the end.
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (520 - progress * 260)
	}

	addGeese(obstacles, boosts)

	const scenery: Course['scenery'] = []
	const assets = [tree1, tree2, tree1, shrub1, shrub2, flower1, flower2]
	for (let at = -400; at < terrain.finishX + 900; at += 90 + random() * 260) {
		// Nothing in front of the Copper Tents.
		if (Math.abs(at - TENTS_X) < TENTS_ROOM) continue
		scenery.push({
			x: Math.round(at),
			asset: assets[Math.floor(random() * assets.length)],
		})
	}
	// Koppartälten, the Copper Tents, at the top of the hill.
	scenery.push({ x: TENTS_X, asset: copperTents, setBack: 18 })
	return { obstacles, boosts, scenery }
}

/** How far short of the top the Copper Tents stand. */
const TENTS_SHORT = 160
/**
 * Where the Copper Tents stand, back from the path: just short of where the
 * course is highest, on the field, not out past its brow where the field
 * behind falls away.
 */
const TENTS_X = (() => {
	let top = START_X
	for (let x = START_X; x < terrain.finishX; x += 10)
		if (terrain.groundY(x) < terrain.groundY(top)) top = x
	return top - TENTS_SHORT
})()
/** Half the Copper Tents' width, and a little more: no trees in front of them. */
const TENTS_ROOM = 150

/** Room either side of geese, to land a jump between them and whatever's next. */
const GEESE_ROOM = 320

/**
 * Geese, off Brunnsviken, standing about in the wider gaps between
 * everything else. Their own random numbers, so the rest of the course is
 * laid out the same as ever.
 */
function addGeese(obstacles: Obstacle[], boosts: Boost[]) {
	const random = seeded(1957)
	const placed: Obstacle[] = []
	const everything = [...obstacles, ...boosts].sort((a, b) => a.x - b.x)
	for (let i = 1; i < everything.length; i++) {
		const before = everything[i - 1]
		const after = everything[i]
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
function flyOvers(): NonNullable<Course['flyovers']> {
	const random = seeded(2024)
	const from = START_X + 1200
	const spacing = (terrain.finishX - 900 - from) / FLYOVERS
	return Array.from({ length: FLYOVERS }, (_, i) => ({
		x: Math.round(from + spacing * (i + random() * 0.6)),
		count: 1 + Math.floor(random() * 3),
	}))
}

export const haga: CourseDefinition = {
	id: 'haga',
	name: 'Haga',
	blurb: 'The home course. Rocks, branches, and geese to catch a ride on.',
	parkrun: true,
	terrain,
	runDirectors: ['claire', 'eline'],
	cheerers: CHEERERS,
	...layOut(),
	flyovers: flyOvers(),
}
