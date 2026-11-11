import flower1 from '@/assets/misc/flower1.png'
import shrub1 from '@/assets/misc/shrub1.png'
import shrub2 from '@/assets/misc/shrub2.png'
import type { RunnerName } from '@/data/runners'
import tree1 from '../assets/scenery/tree1.png'
import tree2 from '../assets/scenery/tree2.png'
import { START_X } from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { createTerrain } from '../game/terrain'
import { STEP_M, heights } from './kit/huddinge-profile'
import { seeded } from './kit/seeded'
import type {
	BackdropPiece,
	Boost,
	Course,
	CourseDefinition,
	Obstacle,
} from './types'

/**
 * Huddinge: Haga's kind of parkrun, but deep in the forest. Its own hills,
 * twice Haga's climb, through pines on every side, and branches everywhere.
 * No geese out here, but the mud Haga doesn't have.
 */

/** Members with a volunteer sprite to stand and cheer in: the cheerers. */
const CHEERERS: RunnerName[] = [
	'rick',
	'anna',
	'keith',
	'lyra',
	'august',
	'eline',
	'josh',
]

/** A parkrun is 5 km. Huddinge's GPS track came out at 5.40. */
const terrain = createTerrain(heights, STEP_M, 5000)

/** Darker under the trees: the leaves and the grass in their shade. */
const SHADE = 'brightness(0.78) saturate(1.15)'
const DEEP_SHADE = 'brightness(0.62) saturate(1.2) hue-rotate(-8deg)'

/** A couple of deer, lying in the bracken by the path, waiting to be ridden. */
const DEER = [START_X + 3600, START_X + 11600]
/** How far either side of a deer the path's kept clear, to hop on and get going. */
const DEER_ROOM = 180
const nearDeer = (x: number) => DEER.some((d) => Math.abs(d - x) < DEER_ROOM)

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(1410)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	// A clear run off the start, and a clear run-in to the finish.
	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		const roll = random()
		// The forest's low branches, more than anything.
		if (roll < 0.26) obstacles.push({ kind: 'rock', x })
		else if (roll < 0.56) obstacles.push({ kind: 'branch', x })
		else if (roll < 0.72)
			obstacles.push({ kind: 'mud', x, width: 70 + Math.round(random() * 60) })
		else if (roll < 0.88)
			boosts.push({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
			})
		else
			boosts.push({
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			})
		// Further apart early on, closer together towards the end, as at Haga.
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (500 - progress * 260)
	}

	// Pines, mostly, close together along the path.
	const scenery: Course['scenery'] = []
	const plants = [tree2, tree2, tree2, tree1, tree2, shrub1, shrub2, flower1]
	for (let at = -400; at < terrain.finishX + 900; at += 50 + random() * 120) {
		const asset = plants[Math.floor(random() * plants.length)]
		scenery.push({
			x: Math.round(at),
			asset,
			// Some in deeper shade than others, so they don't all look one tree.
			filter: random() < 0.4 ? DEEP_SHADE : SHADE,
		})
	}
	return {
		obstacles: obstacles.filter((o) => !nearDeer(o.x)),
		boosts: boosts.filter((b) => !nearDeer(b.x)),
		scenery,
	}
}

const piece = (
	asset: string,
	height: number,
	filter: string,
): BackdropPiece => ({ asset, height, filter })

export const huddinge: CourseDefinition = {
	id: 'huddinge',
	name: 'Huddinge',
	blurb: 'Deep in the forest, up and down: branches, rocks and mud.',
	parkrun: true,
	terrain,
	runDirectors: ['rick', 'keith'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#bfe3e6',
			'--sky-blue-bottom': '#e4f1dc',
			'--grass-green': '#4d7a3c',
			'--grass-dark-green': '#3b6230',
			'--grass-darker-green': '#28441f',
			'--dirt-brown': '#a87d55',
			'--dirt-dark-brown': '#7d5937',
			'--dirt-darker-brown': '#4e3520',
		},
		// The hills under the forest: darker and greener the nearer they are.
		hills: [
			'brightness(0.85) saturate(1.1)',
			'brightness(0.72) saturate(1.2)',
			'brightness(0.66) saturate(1.3) hue-rotate(-6deg)',
		],
		foliage: SHADE,
		// A wall of pines over the hills.
		far: [
			piece(tree2, 110, 'brightness(0.7)'),
			piece(tree2, 110, 'brightness(0.6)'),
			piece(tree2, 110, 'brightness(0.75) saturate(1.2)'),
		],
		// And thick on the field behind the path.
		near: [
			piece(tree2, 110, SHADE),
			piece(tree2, 110, DEEP_SHADE),
			piece(tree1, 120, SHADE),
			piece(tree2, 110, SHADE),
		],
		nearGap: [24, 90],
	},
	...layOut(),
	corgis: DEER,
	ride: 'deer',
}
