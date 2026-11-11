import type { RunnerName } from '@/data/runners'
import busAsset from '../assets/bus/bus.png'
import scoopAsset from '../assets/bus/scoop.png'
import windowAsset from '../assets/bus/windows.png'
import { PATH_BACK, PATH_FRONT, START_X, VERGE } from '../game/constants'
import { EVEREST_FIKA } from '../game/fika'
import { type Gap, type Terrain, withGaps } from '../game/terrain'
import {
	EVEREST_FACE,
	EVEREST_HORIZONS,
	boulder,
	cairn,
	campSign,
	chorten,
	everestStrips,
	maniWall,
	pine,
	prayerFlags,
	rhododendron,
	serac,
	tent,
	yak,
} from './kit/everestScenery'
import { nearGap, scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import type { Course, CourseDefinition, Obstacle, Scenery } from './types'

/**
 * Everest: up, and up, and up, to the top of the world. The first course
 * that climbs the whole way, steeper than any, a few flat camps on the way
 * to get your breath back, and the finish on the summit.
 *
 * On the trek in, up through the pines and rhododendrons, past chortens and
 * mani walls, yaks grazing, prayer flags strung over the path. Up the
 * moraine to Base Camp, its tents. Into the Icefall, crevasses to jump,
 * seracs leaning over. Then the snow: the Western Cwm, up the Lhotse Face,
 * the camps clinging to it, the Yellow Band, a step of rock up it, the South
 * Col, and the ridge, the Hillary Step, and the summit, snow falling, the
 * sky gone a deep blue over the clouds.
 *
 * Mountain goats to ride, sure-footed, up anything; Kendal Mint Cake and
 * butter tea for a boost. The bus has legs for it, a spider's, and crawls
 * up after you.
 */

const CHEERERS: RunnerName[] = [
	'josh',
	'keith',
	'anna',
	'rick',
	'eline',
	'lyra',
	'august',
]

/** How long it is, start line to finish line: as far as any course. */
const LENGTH = 20000
/** Where the finish is: on the summit. */
const FINISH = START_X + LENGTH

/**
 * How much of the slope it's drawn at that it is to run up: drawn steep,
 * a mountain, but no harder going than a big hill. The steeper it gets,
 * the less more it slows you, so even up a headwall near enough straight
 * up, you're still going: at about half your speed.
 */
const SPEED_SHARE = 0.4
const SPEED_EASING = 0.6
const speedSlope = (tilt: number) =>
	(tilt * SPEED_SHARE) / (1 + Math.abs(tilt) * SPEED_EASING)

/**
 * How high it's climbed, `along` the course from the start line: a point
 * at each change in it, a smooth climb between. Level ones, a flat: the
 * start, the camps, the summit.
 */
const CLIMB: [along: number, rise: number][] = [
	[-1600, 0],
	[0, 0],
	[500, 0],
	// The trek in: up through the forest, and a flight of stone stairs.
	[1300, 140],
	[1900, 300],
	[2200, 520],
	[2500, 580],
	// Namche: a shelf to get your breath back.
	[2900, 620],
	[3300, 630],
	// Up the moraine, and a headwall of it.
	[4000, 830],
	[4400, 1150],
	[5000, 1260],
	[6000, 1420],
	[6600, 1560],
	// Base Camp.
	[6900, 1580],
	[7700, 1590],
	// The Icefall: a wall of ice, crevasses and seracs.
	[8300, 1800],
	[8700, 2140],
	[9800, 2420],
	[10300, 2480],
	[11400, 2800],
	// Camp 2, in the Western Cwm.
	[11800, 2840],
	[12600, 2860],
	// The Lhotse Face: the steepest of it, near enough straight up.
	[13200, 3060],
	[13700, 3560],
	[14400, 3800],
	// Camp 3, a ledge cut into it.
	[14750, 3840],
	[15100, 3850],
	// The Yellow Band, and a step of rock up it.
	[15600, 4030],
	[15800, 4036],
	[16300, 4210],
	// The South Col: Camp 4.
	[16700, 4250],
	[17300, 4260],
	// The ridge: up to the Balcony, steep, and on to the South Summit.
	[17900, 4420],
	[18300, 4760],
	[18700, 4800],
	// The Hillary Step.
	[18800, 4806],
	[19000, 4812],
	[19500, 4880],
	// The summit ridge, and the summit.
	[19800, 4906],
	[LENGTH, 4910],
	[LENGTH + 2000, 4910],
]

/** Steps up the rock, sheer: `rise` px up at `along`. A Ledge each, to jump up. */
const STEPS: [along: number, rise: number][] = [
	// In the Yellow Band.
	[15700, 34],
	// The Hillary Step.
	[18900, 58],
]

/** Crevasses across the Icefall, `along` the course, each `width` across: jump them. */
const CREVASSES: [along: number, width: number][] = [
	[8250, 72],
	[9050, 88],
	[9450, 96],
	[10650, 88],
	[11100, 104],
]

/** Where the camps are, and their flats, along the course, and their signs. */
const CAMPS: { from: number; to: number; name: string; height: string }[] = [
	{ from: 2900, to: 3300, name: 'Namche', height: '3440 m' },
	{ from: 6900, to: 7700, name: 'Base Camp', height: '5364 m' },
	{ from: 11800, to: 12600, name: 'Camp 2', height: '6400 m' },
	{ from: 14750, to: 15100, name: 'Camp 3', height: '7162 m' },
	{ from: 16700, to: 17300, name: 'South Col', height: '7906 m' },
]

/**
 * Where the mountain changes, along the course: the trek's green gives way
 * to the moraine's bare rock, and that to the snow.
 */
const MORAINE = 4500
const SNOW_LINE = 8500
/** Where the sky's gone deep blue, over the clouds; and where it's snowing hardest. */
const HIGH = 12000
const BLIZZARD = 15500

/**
 * A smooth climb through `points`, never overshooting between them, so a
 * flat stays flat: a monotone cubic.
 */
function smoothThrough(points: [number, number][]) {
	const n = points.length
	const xs = points.map(([x]) => x)
	const ys = points.map(([, y]) => y)
	const d: number[] = []
	for (let i = 0; i < n - 1; i++)
		d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
	const m: number[] = [d[0]]
	for (let i = 1; i < n - 1; i++)
		m.push(d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]))
	m.push(d[n - 2])
	return (x: number) => {
		if (x <= xs[0]) return ys[0]
		if (x >= xs[n - 1]) return ys[n - 1]
		let i = 0
		while (x > xs[i + 1]) i++
		const h = xs[i + 1] - xs[i]
		const t = (x - xs[i]) / h
		const t2 = t * t
		const t3 = t2 * t
		return (
			(2 * t3 - 3 * t2 + 1) * ys[i] +
			(t3 - 2 * t2 + t) * h * m[i] +
			(-2 * t3 + 3 * t2) * ys[i + 1] +
			(t3 - t2) * h * m[i + 1]
		)
	}
}

const climb = smoothThrough(CLIMB)

/** Rough going, up and down a little, where it's climbing, not on a flat. */
function rough(along: number) {
	const steep = Math.abs(climb(along + 20) - climb(along - 20)) / 40
	const amount = Math.min(1, steep / 0.2)
	return (6 * Math.sin(along / 83) + 4 * Math.sin(along / 29 + 1.7)) * amount
}

/** How high the ground is `along` the course, but for its steps. */
const slopeOf = (along: number) => climb(along) + rough(along)

/** The ground's line at `x`, as a y on the screen: up the mountain, and up its steps. */
function groundY(x: number) {
	const along = x - START_X
	let rise = slopeOf(along)
	for (const [at, step] of STEPS) if (along >= at) rise += step
	return 490 - rise
}

/** How steep it looks at `x`: how far down for every pixel along, negative uphill. */
const tilt = (x: number) =>
	-(slopeOf(x - START_X + 4) - slopeOf(x - START_X - 4)) / 8

const gaps: Gap[] = CREVASSES.map(([along, width]) => ({
	from: START_X + along,
	to: START_X + along + width,
}))
const ledges = STEPS.map(([along]) => START_X + along)

const terrain: Terrain = withGaps(
	{
		length: LENGTH,
		finishX: FINISH,
		groundY,
		slope: (x) => speedSlope(tilt(x)),
		tilt,
	},
	gaps,
	[],
	ledges,
)

/** Whether `along` is in a camp, or just either side of one. */
const inCamp = (along: number, room = 0) =>
	CAMPS.some((c) => along > c.from - room && along < c.to + room)
/** Near a Ledge's foot, or its top. */
const nearStep = (along: number, room = 220) =>
	STEPS.some(([at]) => along > at - room && along < at + room)

/** Mountain goats, waiting on the path to be ridden. */
const GOATS = [1500, 3150, 5300, 7350, 12250, 14950, 17050].map(
	(along) => START_X + along,
)

/** Whether `x` is up a headwall: too steep to stand anything on, or put anything in the way. */
const sheer = (x: number) => Math.abs(tilt(x)) > 0.5

/** Which bit of the mountain `along` is on: what grows there, what's lying about. */
const zoneOf = (along: number) =>
	along < MORAINE ? 'trek' : along < SNOW_LINE ? 'moraine' : 'snow'

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(8849)
	let fika = 0
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		clear: (x) => {
			const along = x - START_X
			return (
				!nearGap(terrain, x, 200) &&
				!nearStep(along) &&
				!GOATS.some((g) => Math.abs(g - x) < 180)
			)
		},
		pick: (x) => {
			const along = x - START_X
			const zone = zoneOf(along)
			// Up a headwall, nothing in the way: only something to grab.
			if (sheer(x))
				return {
					kind: 'fika',
					x,
					height: 26,
					item: EVEREST_FIKA[fika++ % EVEREST_FIKA.length],
				}
			const roll = random()
			if (roll < 0.38) return { kind: 'rock', x }
			// Trekkers, on the way up to Base Camp.
			if (roll < 0.48 && zone !== 'snow' && !inCamp(along, 200))
				return { kind: 'tourists', x, count: 2 }
			if (roll < 0.8)
				return {
					kind: 'fika',
					x,
					// Up the steepest of it, low, to run through; on a flat, up high, to jump for.
					height: inCamp(along) ? 95 : random() < 0.6 ? 26 : 80,
					item: EVEREST_FIKA[fika++ % EVEREST_FIKA.length],
				}
			return {
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			}
		},
	})
	return { obstacles, boosts, scenery: scenery(obstacles) }
}

/** What stands along the path: each bit of the mountain its own. */
function scenery(obstacles: Obstacle[]): Scenery[] {
	const random = seeded(1953)
	const out: Scenery[] = []
	const taken = (x: number, room: number) =>
		out.some((s) => Math.abs(s.x - x) < room)
	/** Clear of what's in the way, so it isn't hidden behind it. */
	const clearOf = (x: number) =>
		!obstacles.some((o) => o.kind === 'tourists' && Math.abs(o.x - x) < 60)

	// The camps: their tents, prayer flags, and a sign.
	const flies: [string, string][] = [
		['#f2a531', '#c97f1a'],
		['#e8483c', '#b8352c'],
		['#f5d33a', '#c9a82a'],
		['#3a7ad8', '#2b5ca8'],
	]
	for (const camp of CAMPS) {
		const from = START_X + camp.from
		const to = START_X + camp.to
		out.push({
			x: from + 60,
			asset: campSign(camp.name, camp.height),
			scale: 2,
			setBack: 4,
		})
		for (let x = from + 170; x < to - 60; x += 90 + random() * 70) {
			const [fly, shade] = flies[Math.floor(random() * flies.length)]
			out.push({ x: Math.round(x), asset: tent(fly, shade), scale: 2 })
		}
		out.push({
			x: Math.round((from + to) / 2),
			asset: prayerFlags,
			scale: 2,
			setBack: 2,
			onFloor: true,
		})
	}

	// Along the way: what grows, and what's been built, the higher, the barer.
	for (let x = -300; x < FINISH + 900; x += 120 + random() * 220) {
		const along = x - START_X
		if (
			taken(x, 70) ||
			!clearOf(x) ||
			inCamp(along, 60) ||
			sheer(x - 30) ||
			sheer(x + 30)
		)
			continue
		const zone = zoneOf(along)
		const roll = random()
		let piece: Scenery | undefined
		if (zone === 'trek') {
			if (roll < 0.34) piece = { x, asset: pine, scale: 2 }
			else if (roll < 0.58) piece = { x, asset: rhododendron, scale: 2 }
			else if (roll < 0.68) piece = { x, asset: chorten, scale: 2 }
			else if (roll < 0.78) piece = { x, asset: maniWall, scale: 2 }
			else if (roll < 0.9)
				piece = { x, asset: prayerFlags, scale: 2, setBack: 2, onFloor: true }
			else piece = { x, asset: yak, scale: 2 }
		} else if (zone === 'moraine') {
			if (roll < 0.4) piece = { x, asset: boulder(false), scale: 2 }
			else if (roll < 0.62) piece = { x, asset: cairn, scale: 2 }
			else if (roll < 0.78)
				piece = { x, asset: prayerFlags, scale: 2, setBack: 2, onFloor: true }
			else if (roll < 0.88) piece = { x, asset: yak, scale: 2 }
			else piece = { x, asset: maniWall, scale: 2 }
		} else {
			const icefall = along < 11600
			if (roll < (icefall ? 0.5 : 0.18))
				piece = { x, asset: serac, scale: 2, onFloor: true }
			else if (roll < 0.7) piece = { x, asset: boulder(true), scale: 2 }
			else if (roll < 0.82)
				piece = { x, asset: prayerFlags, scale: 2, setBack: 2, onFloor: true }
			else if (roll < 0.92) piece = { x, asset: cairn, scale: 2 }
		}
		if (piece) out.push({ ...piece, x: Math.round(x) })
	}

	// The summit: prayer flags, all over it.
	for (const along of [LENGTH - 120, LENGTH + 60, LENGTH + 220])
		out.push({
			x: START_X + along,
			asset: prayerFlags,
			scale: 2,
			setBack: 2,
			onFloor: true,
		})
	out.push({
		x: START_X + LENGTH - 260,
		asset: campSign('Summit', '8849 m'),
		scale: 2,
		setBack: 4,
	})
	return out.sort((a, b) => a.x - b.x)
}

export const everest: CourseDefinition = {
	id: 'everest',
	name: 'Everest',
	blurb:
		'Up and up to the top of the world: mountain goats to ride, crevasses to jump, mint cake at the top.',
	terrain,
	corgis: GOATS,
	ride: 'goat',
	// Up the climb ahead, so it's in view.
	lookAhead: 480,
	// On its legs, the bus grips: the steepest of it slows it half as much
	// as it slows you, so that's where it gains on you.
	busHillPull: 0.5,
	runDirectors: ['rick', 'eline'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#5aa6e8',
			'--sky-blue-bottom': '#dcf0fb',
			'--grass-green': '#6fa04a',
			'--grass-dark-green': '#4f7d38',
			'--grass-darker-green': '#2f5224',
			'--dirt-brown': '#a8875a',
			'--dirt-dark-brown': '#86683f',
			'--dirt-darker-brown': '#5a4428',
		},
		horizon: EVEREST_HORIZONS.TREK,
		voyage: [
			{ from: START_X + MORAINE + 600, horizon: EVEREST_HORIZONS.MORAINE },
			{ from: START_X + HIGH, horizon: EVEREST_HORIZONS.SUMMITS },
		],
		// Rising with you as you climb, so it's still there over the path.
		horizonRise: 110,
		horizonTrees: false,
		ground: [
			[-PATH_BACK - VERGE, 'url(#everest-verge)'],
			[-PATH_BACK, 'url(#everest-path-edge)'],
			[-PATH_BACK + 5, 'url(#everest-path)'],
			[PATH_FRONT, 'url(#everest-edge)'],
			[PATH_FRONT + 2, 'url(#everest-rock)'],
			[PATH_FRONT + 14, 'url(#everest-face)'],
			// Darker the further down the mountain's face, in bands, for depth:
			// smoothed, so its steps and corners don't show right down it.
			[PATH_FRONT + 80, 'rgba(20, 34, 64, 0.06)', true],
			[PATH_FRONT + 190, 'rgba(20, 34, 64, 0.07)', true],
			[PATH_FRONT + 330, 'rgba(20, 34, 64, 0.08)', true],
		],
		// Grass, then bare rock past the trees, then snow past the snow line,
		// each blending into the next.
		strips: everestStrips({
			rock: START_X + MORAINE,
			snow: START_X + SNOW_LINE,
		}),
		groundDefs: EVEREST_FACE,
		// Its steps up, a buttress of granite each, snow on top, and a fixed
		// rope down it; a ladder up the Hillary Step.
		ledgeRock: {
			rock: '#86817b',
			shade: '#625d58',
			lit: '#b8b2aa',
			snow: '#f6f9fc',
			rope: '#e2432f',
			ladder: '#c9ced4',
		},
		// Down into a crevasse: blue ice, darker the deeper.
		gap: 'linear-gradient(to bottom, #b9d4ee, #7fa6d0 30px, #3d6699 90px, #10223f 170px)',
		// Its walls: ice, lit blue-white on the far side, in blue shadow on
		// the near, cracked; snow over its lips, icicles hanging off them.
		pit: {
			wall: '#d6e8f7',
			shade: '#7d9fc6',
			seams: 'rgba(40, 80, 140, 0.35)',
			ice: { snow: '#f6f9fc', icicle: '#cfe4f7' },
		},
		snow: { from: START_X + HIGH, full: START_X + BLIZZARD },
		rock: 'brightness(0.95) saturate(0.6)',
		bus: {
			body: busAsset,
			windows: windowAsset,
			scoop: scoopAsset,
			legs: {
				metal: '#9aa3ad',
				shade: '#5d646d',
				bolt: '#f5c518',
				foot: '#2b2b2b',
			},
		},
	},
	...layOut(),
}
