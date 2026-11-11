import type { RunnerName } from '@/data/runners'
import incaHouse1 from '../assets/buildings/inca-house-1.png'
import incaHouse2 from '../assets/buildings/inca-house-2.png'
import incaHouse3 from '../assets/buildings/inca-house-3.png'
import incaHouse4 from '../assets/buildings/inca-house-4.png'
import huaynaPicchu from '../assets/horizons/huayna-picchu.png'
import incaTerraces from '../assets/horizons/inca-terraces.png'
import tree1 from '../assets/scenery/tree1.png'
import tree2 from '../assets/scenery/tree2.png'
import { PATH_BACK, START_X } from '../game/constants'
import { createTerrain } from '../game/terrain'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import type {
	Boost,
	Course,
	CourseDefinition,
	PlatformDefinition,
} from './types'

/**
 * Machu Picchu, a placeholder: up the mountain on the Incas' stone stairs,
 * past their houses and up their terraces, with Huayna Picchu over it all.
 * Llamas to ride, and cans of Inca Cola for a boost: the best of them on top
 * of the terraces, for whoever climbs them.
 */

const CHEERERS: RunnerName[] = [
	'eline',
	'rick',
	'anna',
	'lyra',
	'keith',
	'josh',
	'august',
]

const STEP_M = 10
const DISTANCE_M = 5000
/** Made up: up the mountain all the way, rolling as it goes. */
const heights = Array.from({ length: DISTANCE_M / STEP_M + 1 }, (_, i) => {
	const m = i * STEP_M
	const rise = Math.min(1, m / 400)
	return (
		(2 +
			22 * (m / DISTANCE_M) +
			5 * Math.sin(m / 380 - 1.2) +
			2 * Math.sin(m / 120)) *
		rise
	)
})

/** Stone stairs, all the way, in steps low enough to run up. */
const terrain = createTerrain(heights, STEP_M, DISTANCE_M, {
	bumps: false,
	stairs: 8,
})

/** How far apart a flight of terraces' steps are, and how much higher each. */
const TERRACE_STEP = 140
const TERRACE_RISE = 56
const TERRACE_WIDTH = 160

/**
 * Flights of terraces beside the path, each step up a jump from the last,
 * and on top of each flight, a can of Inca Cola: worth the climb.
 */
function terraces() {
	const random = seeded(1450)
	const platforms: PlatformDefinition[] = []
	const cans: Boost[] = []
	for (let x = START_X + 1600; x < terrain.finishX - 1500; ) {
		const steps = 2 + Math.floor(random() * 3)
		for (let i = 0; i < steps; i++) {
			const height = TERRACE_RISE * (i + 1)
			platforms.push({
				x: x + i * TERRACE_STEP,
				width: TERRACE_WIDTH,
				height,
				// A wall of stone, down to the back of the path: it stands
				// beside it, to jump up onto, not across it.
				depth: height - PATH_BACK + 4,
			})
		}
		const top = platforms[platforms.length - 1]
		const middle = top.x + TERRACE_WIDTH / 2
		const topY = terrain.groundY(top.x) - top.height
		cans.push({
			kind: 'fika',
			x: middle,
			// Sat up there: out of reach from the path.
			height: terrain.groundY(middle) - topY + 6,
			item: 'incaCola',
		})
		x += steps * TERRACE_STEP + 1800 + random() * 1200
	}
	return { platforms, cans }
}

const { platforms, cans } = terraces()
/** Clear of the terraces, so nothing's under them. */
const clear = (x: number) =>
	!platforms.some((p) => x > p.x - 140 && x < p.x + p.width + 140)

/** Llamas, waiting on the path to be ridden, every so often. */
function llamas() {
	const random = seeded(1532)
	const at: number[] = []
	for (let x = START_X + 2200; x < terrain.finishX - 1200; ) {
		if (clear(x)) at.push(Math.round(x))
		x += 1600 + random() * 1400
	}
	return at
}

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery' | 'corgis'> {
	const random = seeded(1911)
	const corgis = llamas()
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		clear: (x) => clear(x) && !corgis.some((c) => Math.abs(c - x) < 160),
		pick: (x) => {
			const roll = random()
			if (roll < 0.45) return { kind: 'rock', x }
			if (roll < 0.6) return { kind: 'branch', x }
			if (roll < 0.85)
				return {
					kind: 'fika',
					x,
					height: random() < 0.5 ? 26 : 95,
					item: 'incaCola',
				}
			return {
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			}
		},
	})
	boosts.push(...cans)
	boosts.sort((a, b) => a.x - b.x)

	// The Incas' houses beside the path, and trees. (Llamas are for riding.)
	const scenery: Course['scenery'] = []
	const houses = [incaHouse1, incaHouse2, incaHouse3, incaHouse4]
	for (let at = -300; at < terrain.finishX + 900; at += 160 + random() * 300) {
		const roll = random()
		scenery.push({
			x: Math.round(at),
			asset:
				roll < 0.5
					? houses[Math.floor(random() * houses.length)]
					: random() < 0.5
						? tree1
						: tree2,
		})
	}
	return { obstacles, boosts, scenery, corgis }
}

export const machuPicchu: CourseDefinition = {
	id: 'machu-picchu',
	name: 'Machu Picchu',
	blurb:
		'Up the Incas’ stone stairs and terraces: llamas to ride, and Inca Cola for whoever climbs.',
	terrain,
	platforms,
	ride: 'llama',
	runDirectors: ['eline', 'rick'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#9fd2ee',
			'--sky-blue-bottom': '#eef6f2',
			'--grass-green': '#6fa04a',
			'--grass-dark-green': '#4f7d38',
			'--grass-darker-green': '#2f5224',
			// The path: stone.
			'--dirt-brown': '#aaa493',
			'--dirt-dark-brown': '#878170',
			'--dirt-darker-brown': '#56523f',
		},
		horizon: {
			far: huaynaPicchu,
			near: incaTerraces,
			fill: '#8fb1aa',
		},
		platform: {
			top: '#6fa04a',
			// Courses of dry stone, its face.
			face: 'repeating-linear-gradient(to bottom, #8e8a7c 0 8px, #6e6a5e 8px 10px)',
			edge: '#55513f',
		},
	},
	...layOut(),
}
