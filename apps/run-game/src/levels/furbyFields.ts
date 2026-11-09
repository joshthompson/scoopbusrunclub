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
import { seeded } from './seeded'
import type { BackdropPiece, Level, LevelDefinition, Obstacle } from './types'

/**
 * Furby Fields: where the furbies live, in their colours, hopping about the
 * path and onto whoever runs by. Hillier than Haga, and more in the way, but
 * there are corgis to ride.
 */

/** The website's furbies, every one of them, in order. */
const FURBIES = Object.entries(
	import.meta.glob('@/assets/furbys/*.png', {
		eager: true,
		import: 'default',
	}) as Record<string, string>,
)
	.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
	.map(([, url]) => url)

/** Their art's height: they're all 28 px but one, which is 24. */
const FURBY_HEIGHT = 28

/** Trees, shrubs and leaves turned the furbies' pinks and purples. */
const FOLIAGE = 'hue-rotate(205deg) saturate(1.5) brightness(1.08)'

const VOLUNTEERS: RunnerName[] = [
	'keith',
	'eline',
	'josh',
	'lyra',
	'rick',
	'anna',
	'august',
]

/**
 * Made up rather than from a GPS track: sharp peaks one after another, on top
 * of big rolling hills, and flat at either end.
 */
const STEP_M = 10
const DISTANCE_M = 5000
const heights = Array.from({ length: DISTANCE_M / STEP_M + 1 }, (_, i) => {
	const m = i * STEP_M
	/** 0 at the start and the finish, building up over the first 600 m. */
	const rise = Math.min(1, m / 600, (DISTANCE_M - m) / 300)
	const rolling = 10 + 7 * Math.sin(m / 300 - 1.6)
	// 1 - |sin| comes to a point at the top, every 140 m or so, and the power
	// sharpens it further: short, steep climbs, and steep drops after. Low
	// enough to get over at a run without stalling near the top, and smaller
	// to begin with, while the bus is close behind: 2 m, up to 6 m by 2.5 km.
	const peakHeight = 2 + 4 * Math.min(1, m / 2500)
	const peaks = peakHeight * (1 - Math.abs(Math.sin(m / 45 + 2))) ** 1.8
	return Math.max(0, (rolling + peaks) * rise)
})

const terrain = createTerrain(heights, STEP_M, DISTANCE_M)

function layOut(): Pick<Level, 'obstacles' | 'scenery' | 'furbies' | 'corgis'> {
	const random = seeded(1998)
	const obstacles: Obstacle[] = []
	let fika = 0
	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		const roll = random()
		if (roll < 0.3) obstacles.push({ kind: 'rock', x })
		else if (roll < 0.52) obstacles.push({ kind: 'branch', x })
		else if (roll < 0.7)
			obstacles.push({ kind: 'mud', x, width: 80 + Math.round(random() * 60) })
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
		// As far apart as Haga's to begin with, while the bus is close behind,
		// and a lot closer together by the end.
		const progress = (x - START_X) / terrain.length
		x += 360 + random() * (520 - progress * 340)
	}

	// Furbies, hopping about between everything else, more of them the
	// further round.
	const furbies: Level['furbies'] = []
	for (let at = START_X + 1400; at < terrain.finishX - 600; ) {
		furbies.push({
			x: Math.round(at),
			asset: FURBIES[Math.floor(random() * FURBIES.length)],
		})
		const progress = (at - START_X) / terrain.length
		at += 560 + random() * (600 - progress * 300)
	}

	// A corgi to ride every so often.
	const corgis: number[] = []
	for (let at = START_X + 1500; at < terrain.finishX - 900; ) {
		corgis.push(Math.round(at))
		at += 1700 + random() * 1300
	}

	const scenery: Level['scenery'] = []
	const plants = [tree1, tree2, tree1, shrub1, shrub2, flower1, flower2]
	for (let at = -400; at < terrain.finishX + 900; at += 90 + random() * 240) {
		// Fewer at the side than in the backdrop: the ones to watch are on the path.
		if (random() < 0.15)
			scenery.push({
				x: Math.round(at),
				asset: FURBIES[Math.floor(random() * FURBIES.length)],
				scale: 2,
				hops: true,
			})
		else
			scenery.push({
				x: Math.round(at),
				asset: plants[Math.floor(random() * plants.length)],
				filter: FOLIAGE,
			})
	}
	return { obstacles, scenery, furbies, corgis }
}

const furby = (asset: string): BackdropPiece => ({
	asset,
	height: FURBY_HEIGHT,
	scale: 2,
})

export const furbyFields: LevelDefinition = {
	id: 'furby-fields',
	name: 'Furby Fields',
	blurb: 'Spiky hills, furbies hopping on your head, and corgis to ride.',
	difficulty: 3,
	terrain,
	runDirectors: ['eline', 'claire'],
	volunteers: VOLUNTEERS,
	look: {
		palette: {
			'--sky-blue-top': '#ffe3f6',
			'--sky-blue-bottom': '#c69cff',
			'--grass-green': '#27d8c3',
			'--grass-dark-green': '#1fae9c',
			'--grass-darker-green': '#146e63',
			'--dirt-brown': '#f2a8d8',
			'--dirt-dark-brown': '#c77cc0',
			'--dirt-darker-brown': '#5a2f6e',
		},
		// The near band runs down into the field: turned the grass's teal.
		hills: [
			'hue-rotate(200deg) saturate(1.3)',
			'hue-rotate(150deg) saturate(1.3)',
			'hue-rotate(70deg) saturate(1.9) brightness(1.2)',
		],
		sun: 'hue-rotate(280deg) saturate(1.6)',
		foliage: FOLIAGE,
		mud: 'hue-rotate(250deg) saturate(1.6)',
		// Just their ears and eyes, over the hills.
		far: FURBIES.map(furby),
		near: [
			...FURBIES.slice(0, 4).map(furby),
			{ asset: tree1, height: 120, filter: FOLIAGE },
			{ asset: tree2, height: 110, filter: FOLIAGE },
			{ asset: tree1, height: 120, filter: FOLIAGE },
		],
	},
	...layOut(),
}
