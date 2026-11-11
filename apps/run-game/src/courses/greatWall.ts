import type { RunnerName } from '@/data/runners'
import wallFar from '../assets/horizons/great-wall-far.png'
import wallNear from '../assets/horizons/great-wall-near.png'
import lantern from '../assets/scenery/lantern.png'
import { PATH_BACK, PATH_FRONT, START_X } from '../game/constants'
import { GREAT_WALL_FIKA } from '../game/fika'
import {
	type Gap,
	type Terrain,
	createTerrain,
	withGaps,
} from '../game/terrain'
import { towerSpan } from '../game/towers'
import { nearGap, scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import type { Course, CourseDefinition } from './types'

/**
 * The Great Wall of China, a placeholder: along the top of the wall, up and
 * down the mountains it follows. Rubble to jump, and gaps where it's
 * crumbled away.
 */

const CHEERERS: RunnerName[] = [
	'lyra',
	'josh',
	'keith',
	'anna',
	'rick',
	'eline',
	'august',
]

const STEP_M = 10
const DISTANCE_M = 5000
/** Made up: long climbs and drops, as the wall goes over the mountains. */
const heights = Array.from({ length: DISTANCE_M / STEP_M + 1 }, (_, i) => {
	const m = i * STEP_M
	const rise = Math.min(1, m / 400, (DISTANCE_M - m) / 300)
	return (12 + 11 * Math.sin(m / 520 - 1.6) + 3 * Math.sin(m / 140)) * rise
})

/** Where the wall's crumbled away: a gap to jump, every so often. */
function crumble(): Gap[] {
	const random = seeded(221)
	const gaps: Gap[] = []
	for (let x = START_X + 2600; x < START_X + DISTANCE_M * 4 - 1500; ) {
		const width = Math.round(80 + random() * 60)
		gaps.push({ from: x, to: x + width })
		x += 2800 + random() * 2400
	}
	return gaps
}

/** The wall over the mountains, before its staircase is built into it. */
const hills = createTerrain(heights, STEP_M, DISTANCE_M, {
	bumps: false,
	gaps: crumble(),
})

/** Where the guard towers stand, over the walkway: every so often, clear of the gaps. */
const TOWERS = (() => {
	const random = seeded(1421)
	const at: number[] = []
	for (let x = START_X + 1400; x < hills.finishX - 900; ) {
		if (!nearGap(hills, x, 300)) at.push(Math.round(x))
		x += 2200 + random() * 1600
	}
	return at
})()

/**
 * The staircase: steps too high to run up, hopped one at a time. Each is a
 * Ledge: it stops you, but never throws you back.
 */
const STAIRS = 11
const TREAD = 44
const RISER = 20
/** Flat at the top, past the tower, then easing back down to the wall's line over this far. */
const TOP_PAST_TOWER = 260
const EASE_DOWN = 1600

/**
 * One of the wall's super-steep staircases, as it has at points, built in
 * before a tower, at the top, as the towers are: up from just before it,
 * flat round it, and easing back down after.
 */
function withStaircase(ground: Terrain, tower: number): Terrain {
	const top = tower + TOP_PAST_TOWER
	const end = tower - 220
	const start = end - STAIRS * TREAD
	const eased = top + EASE_DOWN
	const foot = ground.groundY(start)
	const summit = foot - STAIRS * RISER
	const groundY = (x: number) => {
		if (x < start || x >= eased) return ground.groundY(x)
		if (x < end) return foot - (Math.floor((x - start) / TREAD) + 1) * RISER
		if (x < top) return summit
		const t = (x - top) / EASE_DOWN
		return summit + (ground.groundY(x) - summit) * t * t * (3 - 2 * t)
	}
	const slope = (x: number) =>
		x < start || x >= eased
			? ground.slope(x)
			: x < top
				? 0
				: (groundY(x + 4) - groundY(x - 4)) / 8
	const steps = Array.from({ length: STAIRS }, (_, k) => start + k * TREAD)
	return withGaps(
		{ length: ground.length, finishX: ground.finishX, groundY, slope },
		ground.gaps,
		[],
		steps,
	)
}

/** The tower the staircase leads up to: the first with no gap anywhere near. */
const STAIR_TOWER = TOWERS.find(
	(x) =>
		x > START_X + 3000 &&
		!hills.gaps.some(
			(g) =>
				g.to > x - 220 - STAIRS * TREAD - 300 &&
				g.from < x + TOP_PAST_TOWER + EASE_DOWN + 300,
		),
)
const terrain = STAIR_TOWER ? withStaircase(hills, STAIR_TOWER) : hills
/** Kept clear of anything in the way: the staircase, and the top of it. */
const onStairs = (x: number) =>
	!!STAIR_TOWER &&
	x > STAIR_TOWER - 220 - STAIRS * TREAD - 160 &&
	x < STAIR_TOWER + TOP_PAST_TOWER
/** Dragons flying over, now and then, one at a time. */
function dragons(): NonNullable<Course['flyovers']> {
	const random = seeded(1949)
	const from = START_X + 1800
	const spacing = (terrain.finishX - 1200 - from) / 4
	return Array.from({ length: 4 }, (_, i) => ({
		x: Math.round(from + spacing * (i + random() * 0.6)),
		count: 1,
	}))
}

/** In a guard tower, or near enough that nothing in the way should be. */
const inTower = (x: number) =>
	TOWERS.some((t) => {
		const { left, right } = towerSpan(t)
		return x > left - 120 && x < right + 120
	})

/** Room either side of a tower, kept clear of lanterns. */
const nearTower = (x: number) => TOWERS.some((t) => Math.abs(t - x) < 120)

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(1368)
	let fika = 0
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		clear: (x) => !nearGap(terrain, x) && !onStairs(x) && !inTower(x),
		pick: (x) => {
			const roll = random()
			if (roll < 0.55) return { kind: 'rock', x }
			if (roll < 0.82)
				return {
					kind: 'fika',
					x,
					height: random() < 0.5 ? 26 : 95,
					item: GREAT_WALL_FIKA[fika++ % GREAT_WALL_FIKA.length],
				}
			return {
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			}
		},
	})
	// Red lanterns along the walkway.
	const scenery: Course['scenery'] = []
	for (let at = -300; at < terrain.finishX + 900; at += 260 + random() * 200)
		if (!nearTower(at)) scenery.push({ x: Math.round(at), asset: lantern })
	return { obstacles, boosts, scenery }
}

/** The wall's stone, light on the walkway, darker down its face. */
const STONE = '#a59c8c'
const STONE_DARK = '#7a7265'

export const greatWall: CourseDefinition = {
	id: 'great-wall',
	name: 'Great Wall of China',
	blurb:
		'Along the top of the wall, over the mountains: rubble, and gaps where it has crumbled.',
	terrain,
	towers: TOWERS,
	// A dragon now and then, flying over from behind: jump into it for a ride.
	flyer: 'dragon',
	flyovers: dragons(),
	runDirectors: ['lyra', 'josh'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#bfe1ee',
			'--sky-blue-bottom': '#f3eedf',
			'--grass-green': '#4d7548',
		},
		horizon: {
			far: wallFar,
			near: wallNear,
			fill: '#86ab95',
		},
		horizonTrees: false,
		// The parapet behind, the walkway, the parapet in front, and the wall's face on down.
		ground: [
			[-PATH_BACK - 10, STONE_DARK],
			[-PATH_BACK - 4, STONE],
			[-PATH_BACK, '#c2b9a8'],
			[PATH_FRONT - 2, STONE_DARK],
			[PATH_FRONT + 8, '#8f8676'],
			[PATH_FRONT + 12, STONE_DARK],
		],
		gap: 'linear-gradient(to bottom, #6a6154, #2c3a28 110px)',
		battlements: { stone: '#b0a795', shade: STONE_DARK, floor: '#c2b9a8' },
	},
	...layOut(),
}
