import flower1 from '@/assets/misc/flower1.png'
import flower2 from '@/assets/misc/flower2.png'
import shrub1 from '@/assets/misc/shrub1.png'
import shrub2 from '@/assets/misc/shrub2.png'
import type { RunnerName } from '@/data/runners'
import palm from '../assets/scenery/palm.png'
import {
	GLIDER_CLEARANCE,
	GLIDER_WING,
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	STAND_HEIGHT,
	START_X,
	VERGE,
} from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { RING_ROOM } from '../game/sky'
import { withGaps } from '../game/terrain'
import {
	SEA_FAR,
	SEA_NEAR,
	deckchair,
	lighthouse,
	sandcastle,
	seaFar,
	seaNear,
	umbrella,
	windsock,
} from './kit/cliffScenery'
import { withHat } from './kit/hats'
import { seeded } from './kit/seeded'
import type { Boost, Course, CourseDefinition, Obstacle } from './types'

/**
 * The Cliff: a short run across a field on a cliff top, to a row of gliders
 * at its edge. Run into one, and off the cliff you go, out over the sea, for
 * good: steer it up and down through Rings for a boost, round gulls,
 * hot-air balloons, wind turbines, Storm Clouds and whales spouting. 4.5
 * km out, over a desert island, it comes down, and it's a sprint along the
 * beach to the finish. The bus drives off the cliff after you, and floats.
 */

const CHEERERS: RunnerName[] = [
	'rick',
	'eline',
	'lyra',
	'keith',
	'anna',
	'august',
	'josh',
]

const DISTANCE_M = 5000
const FINISH = START_X + DISTANCE_M * PX_PER_M

/** The sea's surface, the lowest the course goes, and the cliff top, this high over it. */
const SEA = GROUND_Y
const CLIFF_TOP = SEA - 300
/** The cliff's edge: a short run from the start. */
const CLIFF = START_X + 1100
/** The island, 4.5 km round, its beach this far over the sea. */
const ISLAND = START_X + 4500 * PX_PER_M
const BEACH = SEA - 34
/** How high a glider can go: its rider's feet, well over the cliff top. */
const SKY = CLIFF_TOP - 260

/** The gliders, parked along the cliff top: more than a Room's 8 Players. */
const GLIDERS = Array.from({ length: 10 }, (_, i) => CLIFF - 60 - i * 56).sort(
	(a, b) => a - b,
)

/** The island's dunes, gentle, past a flat beach to land on. */
const LANDING = 300
const dune = (x: number) =>
	x < ISLAND + LANDING ? 0 : 8 * Math.sin((x - ISLAND - LANDING) / 180) ** 2

/**
 * A flat field on the cliff top; the sea, a Gap, its surface the line
 * across it; and the island's beach.
 */
const terrain = withGaps(
	{
		length: FINISH - START_X,
		finishX: FINISH,
		groundY: (x) =>
			x < CLIFF ? CLIFF_TOP : x < ISLAND ? SEA : BEACH - dune(x),
		// Only the island's dunes slope, and only on the island: not across
		// the cliff's edge, nor its shore.
		slope: (x) => {
			if (x < ISLAND + 4) return 0
			return (BEACH - dune(x + 4) - (BEACH - dune(x - 4))) / 8
		},
	},
	[{ from: CLIFF, to: ISLAND }],
)

// --- The sky over the sea -------------------------------------------------------

/**
 * How high over the sea a glider can fly, its rider's middle: from just over
 * the waves to just under the sky. What's in the sky is laid out in this.
 */
const LOWEST = GLIDER_CLEARANCE + (STAND_HEIGHT + GLIDER_WING) / 2
const HIGHEST = SEA - SKY - 10
/** Where Rings go, at most and least, so they're always in reach. */
const RING_LOW = LOWEST + 20
const RING_HIGH = HIGHEST - RING_ROOM

/**
 * The sky's three lanes, by where a Ring goes in each, its middle over the
 * sea: just over the waves, halfway up, and right up under the sky. Each
 * wall of what's in the way across the sky leaves one of them open.
 */
type Lane = 'low' | 'middle' | 'high'
const LANE_RING: Record<Lane, [number, number]> = {
	low: [RING_LOW + 10, RING_LOW + 60],
	middle: [290, 330],
	high: [RING_HIGH - 30, RING_HIGH],
}
/** How often each is the way through: low, most of all. */
const LANE_ODDS: [Lane, number][] = [
	['low', 0.45],
	['middle', 0.3],
	['high', 0.25],
]

/** How the sky changes, as it goes out to sea: a share of the way, and what its walls are. */
type Zone = 'open' | 'balloons' | 'turbines' | 'storm' | 'whales'
const ZONES: [until: number, zone: Zone][] = [
	[0.14, 'open'],
	[0.34, 'balloons'],
	[0.56, 'turbines'],
	[0.78, 'storm'],
	[1, 'whales'],
]
/** Where the sky's things start, once everyone's off the cliff, and where they stop, short of the island. */
const SKY_FROM = CLIFF + 800
/** How close together Rings can be, at closest. */
const RING_GAP = 200
const SKY_TO = ISLAND - 600

/**
 * What blocks one lane, at `x`, in the course's `zone`: turbines and whales
 * down low, gulls and balloons halfway up, Storm Clouds and balloons up
 * under the sky, and gulls anywhere.
 */
function block(
	lane: Lane,
	zone: Zone,
	x: number,
	random: () => number,
): Obstacle[] {
	const jiggle = (n: number) => Math.round(n + (random() - 0.5) * 20)
	const gulls = (height: number, at = x): Obstacle => ({
		kind: 'gulls',
		x: at,
		height: jiggle(height),
		count: 3 + Math.floor(random() * 3),
	})
	if (zone === 'open') {
		// Just gulls, to begin with: one flock, in the way.
		return [gulls(lane === 'low' ? 150 : lane === 'middle' ? 300 : 470)]
	}
	const balloons = zone === 'balloons' || random() < 0.25
	switch (lane) {
		case 'low':
			if (zone === 'turbines' || (zone !== 'whales' && random() < 0.3))
				return [{ kind: 'turbine', x, height: jiggle(140) }]
			if (zone === 'whales' || random() < 0.4)
				return [{ kind: 'whale', x, height: jiggle(270) }, gulls(70, x + 70)]
			return [{ kind: 'balloon', x, low: 110, high: 170 }, gulls(60, x - 80)]
		case 'middle':
			if (balloons)
				return [{ kind: 'balloon', x, low: 280, high: 340 }, gulls(230, x + 90)]
			return [gulls(260, x - 40), gulls(360, x + 40)]
		case 'high':
			if (zone === 'storm' || (!balloons && random() < 0.5))
				return [{ kind: 'storm', x, height: HIGHEST - 40 }, gulls(425, x - 60)]
			return [{ kind: 'balloon', x, low: 440, high: 490 }, gulls(520, x + 80)]
	}
}

const clampRing = (height: number) =>
	Math.round(Math.max(RING_LOW, Math.min(RING_HIGH, height)))

const LANES: Lane[] = ['low', 'middle', 'high']

/** A lane, by its odds, for `roll`, 0 to 1. */
function pickLane(roll: number): Lane {
	let odds = 0
	for (const [lane, share] of LANE_ODDS) {
		odds += share
		if (roll < odds) return lane
	}
	return 'low'
}

function skyLayOut(random: () => number) {
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let last = 240
	let lastLane: Lane = 'middle'
	let fika = 0
	/** Where the last Ring went: none closer than `RING_GAP` after it. */
	let lastRing = Number.NEGATIVE_INFINITY
	const ring = (x: number, height: number) => {
		if (x - lastRing < RING_GAP) return
		boosts.push({ kind: 'ring', x, height: clampRing(height) })
		lastRing = x
	}
	// Off the cliff: a couple of Rings to show the way, down and on.
	ring(CLIFF + 260, 300)
	ring(CLIFF + 480, 240)

	for (let x = SKY_FROM; x < SKY_TO; ) {
		const progress = (x - CLIFF) / (ISLAND - CLIFF)
		const zone = (ZONES.find(([until]) => progress < until) ?? ZONES[4])[1]
		// Which lane's the way through: low, most of all.
		const lane = pickLane(random())
		// A wall across the other two; at first, only across one of them.
		const closed = LANES.filter((other) => other !== lane)
		const walls = zone === 'open' ? [closed[Math.floor(random() * 2)]] : closed
		for (const other of walls) obstacles.push(...block(other, zone, x, random))
		// A Ring in the way through, and now and then one leading to it.
		const [lo, hi] = LANE_RING[lane]
		const through = lo + random() * (hi - lo)
		if (random() < 0.4) ring(x - 300, (last + through) / 2)
		ring(x, through)
		last = through
		// Now and then, a fika, up here: a snack on the way.
		if (random() < 0.12 && fika < 4)
			boosts.push({
				kind: 'fika',
				x: x + 320,
				height: clampRing(last) - 20,
				item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
			})
		// Room to get from one lane to the next, more the further apart they
		// are; and closer together further out.
		const jump = Math.abs(LANES.indexOf(lane) - LANES.indexOf(lastLane))
		lastLane = lane
		x += 640 + jump * 180 + random() * (300 - progress * 160)
	}
	return { obstacles, boosts }
}

// --- The cliff top and the island ------------------------------------------------

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(4500)
	const sky = skyLayOut(random)
	const obstacles: Obstacle[] = [
		...sky.obstacles,
		// Along the beach: rocks, and gulls on the sand.
		{ kind: 'rock', x: ISLAND + 520 },
		{ kind: 'geese', x: ISLAND + 900, count: 3 },
		{ kind: 'rock', x: ISLAND + 1300 },
		{ kind: 'rock', x: ISLAND + 1650 },
	]
	const boosts: Boost[] = [
		// Off you go, across the field.
		{ kind: 'cheer', x: START_X + 520, member: CHEERERS[0] },
		...sky.boosts,
		{ kind: 'fika', x: ISLAND + 760, height: 95, item: 'kanelbulle' },
		{ kind: 'cheer', x: ISLAND + 1100, member: CHEERERS[1] },
		{ kind: 'fika', x: ISLAND + 1480, height: 26, item: 'coffee' },
		{ kind: 'cheer', x: FINISH - 300, member: CHEERERS[2] },
	]
	obstacles.sort((a, b) => a.x - b.x)
	boosts.sort((a, b) => a.x - b.x)
	return { obstacles, boosts, scenery: scenery(random) }
}

function scenery(random: () => number): Course['scenery'] {
	const pieces: Course['scenery'] = []
	// The field: flowers and shrubs, a lighthouse behind it, and a windsock
	// by the gliders.
	const field = [flower1, flower2, shrub1, flower1, shrub2, flower2]
	let n = 0
	for (let x = -600; x < GLIDERS[0] - 80; x += 70 + random() * 140)
		pieces.push({ x: Math.round(x), asset: field[n++ % field.length] })
	pieces.push({ x: START_X - 420, asset: lighthouse, scale: 2, setBack: 22 })
	pieces.push({ x: GLIDERS[0] - 50, asset: windsock, scale: 2 })
	// The island: palms, and the beach's things.
	const beach = [palm, umbrella, palm, sandcastle, palm, deckchair, palm]
	n = 0
	for (let x = ISLAND + 140; x < FINISH + 900; x += 130 + random() * 200) {
		const asset = beach[n++ % beach.length]
		pieces.push({
			x: Math.round(x),
			asset,
			...(asset === palm ? { setBack: 4 } : { scale: 2, setBack: 2 }),
		})
	}
	return pieces
}

// --- Its look ------------------------------------------------------------------------

const GRASS = '#6cbf4a'
const GRASS_DARK = '#4e9a36'
const DIRT = '#c9a46a'
const DIRT_DARK = '#a8824a'

/** How far round the flying helmet the sky's kept clear, and how far under its top it is. */
const HELMET_CLEAR = 240
const HELMET_UNDER_SKY = 10

/** How many Rings it has: the backend takes no more than 50 a course. */
const MOST_RINGS = 50

/**
 * A flying helmet, high in the sky, right up under its top, where nothing
 * else is: only got to by climbing a glider all the way up to it.
 */
const laidOut = withHat(
	layOut(),
	'flyingHelmet',
	({ obstacles, boosts }) => {
		const clear = (x: number) =>
			[...obstacles, ...boosts].every((o) => Math.abs(o.x - x) > HELMET_CLEAR)
		let x = CLIFF + 2600
		while (x < ISLAND - 2000 && !clear(x)) x += 20
		return { x, height: SEA - SKY + HELMET_UNDER_SKY }
	},
	0,
)
const rings = laidOut.boosts.filter((b) => b.kind === 'ring').length
if (rings > MOST_RINGS)
	console.error(`The Cliff has ${rings} Rings: more than ${MOST_RINGS}`)

export const cliff: CourseDefinition = {
	id: 'cliff',
	name: 'The Cliff',
	blurb:
		'Grab a glider and off the cliff! Steer up and down through the Rings, round the balloons, gulls and storms, to the island.',
	terrain,
	corgis: GLIDERS,
	ride: 'glider',
	// The bus crosses it as fast as a glider held flat out: hold right, and
	// take the Rings, to stay ahead of it.
	sea: { from: CLIFF, to: ISLAND, level: SEA, busSpeed: 8.6 },
	sky: SKY,
	runDirectors: ['rick', 'eline'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#3f9fe2',
			'--sky-blue-bottom': '#c4e9ff',
			// Under the horizon, it's all sea.
			'--grass-green': SEA_NEAR,
		},
		horizon: { far: seaFar, near: seaNear, fill: SEA_FAR },
		horizonTrees: false,
		// The field on the cliff top, its path, and the cliff's chalky face
		// on down under it (see `SeaGround`).
		ground: [
			[-PATH_BACK - VERGE, GRASS],
			[-PATH_BACK, DIRT_DARK],
			[-PATH_BACK + 5, DIRT],
			[PATH_FRONT, GRASS_DARK],
			[PATH_FRONT + 2, GRASS],
			[PATH_FRONT + 12, 'url(#cliff-rock)'],
		],
		// Down off the cliff, into the sea: drawn as the sea, not a pit.
		gap: 'none',
		sea: {
			water: '#2f86c4',
			light: 'rgba(255, 255, 255, 0.3)',
			deep: '#0d3a63',
			foam: '#eef8ff',
			sand: '#f1d9a0',
			path: '#e2c487',
			wet: '#c9a96a',
		},
		// Gulls on the beach, not geese.
		geese: 'grayscale(1) brightness(1.5)',
		rock: 'sepia(0.4) brightness(1.1)',
	},
	...laidOut,
}
