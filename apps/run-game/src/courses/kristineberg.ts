import type { RunnerName } from '@/data/runners'
import { TRACK_GROUND } from '../draw/Stadium'
import { START_X } from '../game/constants'
import { KRISTINEBERG_FIKA } from '../game/fika'
import { createTerrain } from '../game/terrain'
import { withHat } from './kit/hats'
import { seeded } from './kit/seeded'
import type { Boost, Course, CourseDefinition, Obstacle } from './types'

/**
 * Kristineberg: round and round the running track at Kristinebergs IP, dead
 * flat, past the grandstand once a lap. No trees, no mud: hurdles to clear, tall ones to slide under,
 * potholes in the track, and children playing football on it, and corgis
 * sat on it, out with their owners, to ride. And at the end, the long
 * jump: off the board into the sand, for points the further.
 */

const CHEERERS: RunnerName[] = [
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

/**
 * The long jump pit, across the track near the finish: its take-off board
 * here, the sand just past it, and the run in to the line after it.
 */
const BOARD = terrain.finishX - 1000
/** Nothing on the track this close before the board: the run-up's clear. */
const RUN_UP = 450

/** Hurdles in a row are this far apart: a jump each, landing in between. */
const HURDLE_GAP = 300
/**
 * Tall hurdles, to slide under, are harder: none till this far round, so
 * the plain ones come first, and from then on, every other flight.
 */
const TALL_FROM = 0.4
/** How much room a corgi waits in, clear of anything else either side. */
const CORGI_ROOM = 160

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery' | 'corgis'> {
	const random = seeded(400)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	let flightsLater = 0
	let x = START_X + 700
	while (x < BOARD - RUN_UP - 2 * HURDLE_GAP) {
		const roll = random()
		if (roll < 0.38) {
			// A flight of one to three hurdles: later on, some flights tall.
			const count = 1 + Math.floor(random() * 3)
			const later = (x - START_X) / terrain.length >= TALL_FROM
			const tall = later && flightsLater++ % 2 === 0
			for (let i = 0; i < count; i++)
				obstacles.push({ kind: 'hurdle', x: x + i * HURDLE_GAP, tall })
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
			boosts.push({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				item: KRISTINEBERG_FIKA[fika++ % KRISTINEBERG_FIKA.length],
			})
		else
			boosts.push({
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			})
		// Further apart early on, closer together towards the end, as at Haga.
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (520 - progress * 260)
	}
	// Corgis, out with their owners, sat on the track waiting to be ridden:
	// in a clear bit of it, each, well before the long jump's run-up.
	const corgis: number[] = []
	for (const share of [0.2, 0.48, 0.76]) {
		let at = START_X + (BOARD - RUN_UP - START_X) * share
		while (
			[...obstacles, ...boosts].some((o) => Math.abs(o.x - at) < CORGI_ROOM)
		)
			at += 20
		corgis.push(Math.round(at))
	}
	// Nothing at the side of a track: the stadium's behind it.
	return { obstacles, boosts, scenery: [], corgis }
}

export const kristineberg: CourseDefinition = {
	id: 'kristineberg',
	name: 'Kristineberg',
	blurb:
		'Round and round the track, dead flat: hurdles to jump, tall ones to slide under, potholes, children playing football, corgis to ride, and the long jump at the end.',
	terrain,
	runDirectors: ['keith', 'claire'],
	longJump: { board: BOARD },
	// A long jump of 10 m or more: a full jump off the board, flat out,
	// only gets 8 or 9; it takes speed carried into it, a boost or two.
	special: {
		goal: 'Long jump 10 m',
		done: (run) => (run.longJump ?? 0) >= 10,
	},
	cheerers: CHEERERS,
	look: {
		stadium: true,
		ground: TRACK_GROUND,
		// The big screen, between the grandstands before the line, and the
		// drone filming whoever's leading for it from the long jump's run-up.
		bigScreen: { x: BOARD + 700, droneFrom: BOARD - RUN_UP },
	},
	// A sweatband, high over a hurdle past halfway: too high to jump for,
	// only got by bouncing up off someone's head.
	...withHat(
		layOut(),
		'sweatband',
		({ obstacles }) => {
			const hurdle = obstacles.find(
				(o) =>
					o.kind === 'hurdle' &&
					!o.tall &&
					o.x > START_X + terrain.length * 0.55,
			)
			return { x: hurdle?.x ?? START_X + 12000, height: 180 }
		},
		0,
	),
}
