import type { RunnerName } from '@/data/runners'
import pyramidsFar from '../assets/horizons/pyramids-far.png'
import pyramidsNear from '../assets/horizons/pyramids-near.png'
import palm from '../assets/scenery/palm.png'
import { START_X } from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { type Terrain, createTerrain, withGaps } from '../game/terrain'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import type { Course, CourseDefinition } from './types'

/**
 * The Pyramids, a placeholder: across the sand at Giza, over the dunes, and
 * up and over three pyramids, the Great Pyramid last, with fika on top of
 * each. Stones to jump, and quicksand to bog you down.
 */

const CHEERERS: RunnerName[] = [
	'anna',
	'august',
	'rick',
	'keith',
	'lyra',
	'josh',
	'eline',
]

const STEP_M = 10
const DISTANCE_M = 5000
/** Made up: dunes, rolling. */
const heights = Array.from({ length: DISTANCE_M / STEP_M + 1 }, (_, i) => {
	const m = i * STEP_M
	return 6 + 5 * Math.sin(m / 260) + 3 * Math.sin(m / 90 + 1)
})

const dunes = createTerrain(heights, STEP_M, DISTANCE_M, { bumps: false })

/** Each pyramid's steps: low enough to run up, a block at a time. */
const RISER = 10
const TREAD = 12
/** The flat on top, either side of its peak. */
const SUMMIT = 20
/**
 * How steep a pyramid's face is, for running up or down it: much less than
 * it looks, or up it would be a crawl.
 */
const FACE_SLOPE = 0.25

/** Where each pyramid's peak is along the course, and how high it is. */
const PYRAMIDS = [
	{ x: START_X + 3200, height: 180 },
	{ x: START_X + 9000, height: 260 },
	{ x: START_X + 15000, height: 340 },
].map(({ x, height }) => {
	// Its top on a step, as all its steps are.
	const top = Math.round((dunes.groundY(x) - height) / RISER) * RISER
	/** Its face, stepped, `x` along: up from its foot, over, and down. */
	const face = (at: number) => {
		const out = Math.max(0, Math.abs(at - x) - SUMMIT)
		return top + Math.floor(out / TREAD) * RISER
	}
	// Its feet, where its faces meet the sand.
	let left = x
	while (face(left) < dunes.groundY(left)) left -= 2
	let right = x
	while (face(right) < dunes.groundY(right)) right += 2
	return { x, face, feet: [left, right] as [number, number] }
})

/** The pyramid at `x`, if one's there. */
const pyramidAt = (x: number) =>
	PYRAMIDS.find(({ feet: [left, right] }) => x > left && x < right)

/** The dunes, with the pyramids stood on them. */
const terrain: Terrain = withGaps({
	length: dunes.length,
	finishX: dunes.finishX,
	groundY: (x) => {
		const pyramid = pyramidAt(x)
		return pyramid ? pyramid.face(x) : dunes.groundY(x)
	},
	slope: (x) => {
		const pyramid = pyramidAt(x)
		if (!pyramid) return dunes.slope(x)
		if (Math.abs(x - pyramid.x) <= SUMMIT) return 0
		return x < pyramid.x ? -FACE_SLOPE : FACE_SLOPE
	},
})

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(2560)
	let fika = 0
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		// Nothing on the pyramids, or near their feet: they're climb enough.
		clear: (x) =>
			!PYRAMIDS.some(
				({ feet: [left, right] }) => x > left - 200 && x < right + 200,
			),
		pick: (x) => {
			const roll = random()
			if (roll < 0.38) return { kind: 'rock', x }
			if (roll < 0.66)
				return { kind: 'mud', x, width: 80 + Math.round(random() * 60) }
			if (roll < 0.86)
				return {
					kind: 'fika',
					x,
					height: random() < 0.5 ? 26 : 95,
					item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
				}
			return {
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			}
		},
	})
	// Fika on top of each pyramid, for whoever gets up there.
	for (const pyramid of PYRAMIDS)
		boosts.push({
			kind: 'fika',
			x: pyramid.x,
			height: 26,
			item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
		})
	boosts.sort((a, b) => a.x - b.x)
	// A palm now and then, an oasis, but not on a pyramid.
	const scenery: Course['scenery'] = []
	for (let at = -300; at < terrain.finishX + 900; at += 300 + random() * 700)
		if (!pyramidAt(at)) scenery.push({ x: Math.round(at), asset: palm })
	return { obstacles, boosts, scenery }
}

export const pyramids: CourseDefinition = {
	id: 'pyramids',
	name: 'Pyramids',
	blurb:
		'Across the sand at Giza and up and over the pyramids: stones, and quicksand to bog you down.',
	terrain,
	runDirectors: ['anna', 'august'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#4fb0e8',
			'--sky-blue-bottom': '#fde3a8',
			'--grass-green': '#e3b965',
			'--grass-dark-green': '#c99b4a',
			'--grass-darker-green': '#9a7230',
			'--dirt-brown': '#cfa260',
			'--dirt-dark-brown': '#ad8044',
			'--dirt-darker-brown': '#6e4f26',
		},
		sun: 'saturate(1.3) brightness(1.05)',
		horizon: {
			far: pyramidsFar,
			near: pyramidsNear,
			fill: '#ecc985',
		},
		horizonTrees: false,
		pyramids: {
			feet: PYRAMIDS.map((p) => p.feet),
			block: '#d9b779',
			mortar: '#a8834a',
		},
		// Quicksand, not mud.
		mud: 'sepia(1) saturate(1.3) brightness(1.55) hue-rotate(-8deg)',
	},
	...layOut(),
}
