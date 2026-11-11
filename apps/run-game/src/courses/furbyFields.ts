import type { RunnerName } from '@/data/runners'
import { PATH_FRONT, PX_PER_M, STAND_HEIGHT, START_X } from '../game/constants'
import { FURBY_FIKA } from '../game/fika'
import { type Terrain, createTerrain, withGaps } from '../game/terrain'
import {
	FIELD,
	GIANT_FUR,
	GIANT_FUR_DARK,
	GIANT_FUR_LIGHT,
	MOUNTAIN_FILL,
	batteries,
	candyCane,
	candyMountains,
	candyflossTree,
	circuitBoard,
	gear,
	giantEar,
	giantTail,
	lollipopTree,
	rainbowFlower,
	speaker,
	sweetHills,
	toadstool,
	wires,
} from './kit/furbyScenery'
import { seeded } from './kit/seeded'
import type {
	Boost,
	Cave,
	Course,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
} from './types'

/**
 * Furby Fields: where the furbies live, in a land made of sweets. Candy
 * hills, lollipop trees, furbies hopping about the path and onto whoever
 * runs by, and unicorns to ride. A garden of bouncy toadstools with
 * candyfloss clouds over it; a Giant Furby, its mouth opening as you come,
 * to run in through its insides and out the back; clouds to hop along; and
 * a rainbow, up and over.
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

const CHEERERS: RunnerName[] = [
	'keith',
	'eline',
	'josh',
	'lyra',
	'rick',
	'anna',
	'august',
]

/** Where things are along it: metres in. */
const at = (m: number) => START_X + m * PX_PER_M

/** The bouncy toadstool garden, with its candyfloss clouds over it. */
const GARDEN = at(1000)
const GARDEN_END = at(1450)
/** The Giant Furby: its mouth, the way in, and how long its head is. */
const GIANT = at(2400)
const GIANT_LENGTH = 1100
const GIANT_END = GIANT + GIANT_LENGTH
/** How high it is inside, over the floor: a hall, plenty to stand in. */
const GIANT_ROOM = 210
/** How much of its mouth shows, from outside, in front of its face. */
const GIANT_MOUTH = 210
/** Clouds to hop along, before the rainbow. */
const CLOUDS = at(3200)
const CLOUDS_END = at(3650)
/** The rainbow: up and over, this high, from foot to foot. */
const RAINBOW = at(3780)
const RAINBOW_LENGTH = 2400
const RAINBOW_END = RAINBOW + RAINBOW_LENGTH
/** Low and long enough to run up at a run, steepest a quarter of the way up. */
const RAINBOW_HEIGHT = 180

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
	// sharpens it further: short, steep climbs, and steep drops after.
	const peakHeight = 2 + 4 * Math.min(1, m / 2500)
	const peaks = peakHeight * (1 - Math.abs(Math.sin(m / 45 + 2))) ** 1.8
	return Math.max(0, (rolling + peaks) * rise)
})

const hills = createTerrain(heights, STEP_M, DISTANCE_M)

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/**
 * How long the hills take to come down flat, and go back up: long enough
 * that it's never steeper than the hills themselves, to run up.
 */
const FLAT_RAMP = 1000
/** Where the hills go flat, for what's built on them, from and to, eased in and out over `ramp`. */
const FLATS: [from: number, to: number, ramp: number][] = [
	[GARDEN - 200, GARDEN_END + 200, FLAT_RAMP],
	[GIANT - 400, GIANT_END + 200, FLAT_RAMP],
	[CLOUDS - 100, RAINBOW_END + 100, FLAT_RAMP],
]
/** The ground, flattened where something's built on it: as high as the hills are at its middle. */
function base(x: number) {
	let y = hills.groundY(x)
	for (const [from, to, ramp] of FLATS) {
		const level = hills.groundY((from + to) / 2)
		const w = ease(Math.min((x - from + ramp) / ramp, (to + ramp - x) / ramp))
		y += (level - y) * w
	}
	return y
}
/** How high the rainbow is over the ground, `x` along. */
const arch = (x: number) => {
	if (x <= RAINBOW || x >= RAINBOW_END) return 0
	return (
		RAINBOW_HEIGHT * Math.sin(((x - RAINBOW) / RAINBOW_LENGTH) * Math.PI) ** 2
	)
}

const terrain: Terrain = withGaps({
	length: hills.length,
	finishX: hills.finishX,
	groundY: (x) => base(x) - arch(x),
	slope: (x) => (base(x + 4) - arch(x + 4) - (base(x - 4) - arch(x - 4))) / 8,
})

// --- The Giant Furby ---------------------------------------------------------------

/**
 * How tall its head is over the ground, `x` along: its face, a flat front
 * a little taller than its mouth; up over its crown, and down its back.
 */
function head(x: number) {
	const t = (x - GIANT) / GIANT_LENGTH
	const round = 1 - ((t - 0.42) / 0.62) ** 2
	return Math.round(GIANT_ROOM + 50 + 190 * Math.max(0, round))
}

const giantFurby: Cave = {
	from: GIANT,
	to: GIANT_END,
	mouth: GIANT_MOUTH,
	ceiling: (x) =>
		x >= GIANT && x < GIANT_END ? terrain.groundY(x) - GIANT_ROOM : undefined,
	surface: (x) =>
		x >= GIANT && x < GIANT_END ? terrain.groundY(x) - head(x) : undefined,
	// Its near side, down in front of the path, to its chin on the field.
	foot: (x) =>
		x >= GIANT && x < GIANT_END
			? terrain.groundY(x) + PATH_FRONT + 44
			: undefined,
	features: [
		// Its ears, tall on its crown, and its tail, out the back.
		{ asset: giantEar, x: GIANT + 360, width: 60, height: 132, sink: 24 },
		{ asset: giantEar, x: GIANT + 520, width: 60, height: 132, sink: 30 },
		{
			asset: giantTail,
			x: GIANT_END + 30,
			width: 96,
			height: 80,
			sink: -30,
			on: 'behind',
		},
		// Inside: its workings, along the back of it, for whoever's in there.
		{
			asset: wires,
			x: GIANT + 470,
			width: 240,
			height: 48,
			sink: -140,
			on: 'behind',
		},
		{
			asset: gear(48, '#c9b6e8'),
			x: GIANT + 330,
			width: 96,
			height: 96,
			sink: -20,
			on: 'behind',
		},
		{
			asset: gear(24, '#ffd23f'),
			x: GIANT + 400,
			width: 48,
			height: 48,
			sink: -84,
			on: 'behind',
		},
		{
			asset: circuitBoard,
			x: GIANT + 600,
			width: 120,
			height: 78,
			sink: -40,
			on: 'behind',
		},
		{
			asset: speaker,
			x: GIANT + 760,
			width: 66,
			height: 66,
			sink: -60,
			on: 'behind',
		},
		{
			asset: gear(36, '#7be0a0'),
			x: GIANT + 850,
			width: 72,
			height: 72,
			sink: -10,
			on: 'behind',
		},
		{
			asset: batteries,
			x: GIANT + 950,
			width: 72,
			height: 48,
			sink: -30,
			on: 'behind',
		},
	],
}

// --- Clouds over the garden, and along to the rainbow ---------------------------------

/** A candyfloss cloud, `width` across from `x`, `height` up, drifting up and down `drift`, if it does. */
const cloud = (
	x: number,
	width: number,
	height: number,
	drift = 0,
	phase = 0,
): PlatformDefinition => ({
	x,
	width,
	height,
	...(drift ? { move: { y: drift, ticks: 240, phase } } : {}),
})

/** The garden's bouncy toadstools, along it. */
const BOUNCERS = [0, 420, 840, 1260].map((along) => GARDEN + along)
/**
 * Where someone fired up off a toadstool at a run comes back down, past it,
 * onto a cloud there: its left end, and how high it is.
 */
const LANDS_PAST = 150
const LANDS_HEIGHT = 165

/** Over the garden, one past each toadstool, for it to fire you up onto; and a run of them along to the rainbow, a jump apart. */
const PLATFORMS: PlatformDefinition[] = [
	...BOUNCERS.map((x, i) =>
		cloud(x + LANDS_PAST, 220, LANDS_HEIGHT, i % 2 ? 20 : 0, i * 0.3),
	),
	cloud(CLOUDS, 200, 80),
	cloud(CLOUDS + 300, 180, 140, 30, 0),
	cloud(CLOUDS + 620, 200, 190),
	cloud(CLOUDS + 940, 180, 140, 30, 0.5),
	cloud(CLOUDS + 1260, 220, 100),
]

// --- What's along it ------------------------------------------------------------------

/** Where nothing else goes: in and around what's built, and in the run-in to the finish. */
const busy = (x: number) =>
	(x > GARDEN - 260 && x < GARDEN_END + 200) ||
	(x > GIANT - 400 && x < GIANT_END + 200) ||
	(x > CLOUDS - 260 && x < RAINBOW_END + 160)

function layOut(): Pick<
	Course,
	'obstacles' | 'boosts' | 'scenery' | 'furbies' | 'corgis'
> {
	const random = seeded(1998)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	const treat = (x: number, height: number): Boost => ({
		kind: 'fika',
		x: Math.round(x),
		height,
		item: FURBY_FIKA[fika++ % FURBY_FIKA.length],
	})

	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		if (!busy(x)) {
			const roll = random()
			// Gumdrops (rocks), candy trees' low branches, chocolate puddles
			// (mud), flamingos (geese), bouncy toadstools; treats, and cheers.
			if (roll < 0.2) obstacles.push({ kind: 'rock', x })
			else if (roll < 0.34) obstacles.push({ kind: 'branch', x })
			else if (roll < 0.46)
				obstacles.push({
					kind: 'mud',
					x,
					width: 80 + Math.round(random() * 60),
				})
			else if (roll < 0.58)
				obstacles.push({
					kind: 'geese',
					x,
					count: 2 + Math.floor(random() * 3),
				})
			else if (roll < 0.66) obstacles.push({ kind: 'steam', x })
			else if (roll < 0.84 && fika < 12)
				boosts.push(treat(x, random() < 0.5 ? 26 : 95))
			else
				boosts.push({
					kind: 'cheer',
					x,
					member: CHEERERS[Math.floor(random() * CHEERERS.length)],
				})
		}
		// As far apart as Haga's to begin with, while the bus is close behind,
		// and a lot closer together by the end.
		const progress = (x - START_X) / terrain.length
		x += 360 + random() * (520 - progress * 340)
	}

	// The garden: bouncy toadstools, each under a cloud, and treats up on them.
	for (const x of BOUNCERS) obstacles.push({ kind: 'steam', x })
	for (const p of PLATFORMS.filter((p) => p.x < GARDEN_END + 400))
		boosts.push(treat(p.x + p.width / 2, p.height + 30))
	// Inside the Giant Furby: a tiny furby or two, for the way through.
	boosts.push(
		{ kind: 'fika', x: GIANT + 450, height: 26, item: 'tinyFurby' },
		{ kind: 'fika', x: GIANT + 800, height: 95, item: 'tinyFurby' },
	)
	// Clouds to hop along: a toadstool to get up onto the first, and treats.
	obstacles.push({ kind: 'steam', x: CLOUDS - 200 })
	for (const p of PLATFORMS.filter((p) => p.x >= CLOUDS).filter(
		(_, i) => i % 2,
	))
		boosts.push(treat(p.x + p.width / 2, p.height + 30))
	// Over the top of the rainbow: the best of them.
	boosts.push({
		kind: 'fika',
		x: RAINBOW + RAINBOW_LENGTH / 2,
		height: 95,
		item: 'rainbowCake',
	})
	obstacles.sort((a, b) => a.x - b.x)
	boosts.sort((a, b) => a.x - b.x)

	// Furbies, hopping about between everything else, more of them the
	// further round: not inside the Giant Furby, nor on the rainbow.
	const furbies: Course['furbies'] = []
	for (let at = START_X + 1400; at < terrain.finishX - 600; ) {
		if (
			!(at > GIANT - 200 && at < GIANT_END + 100) &&
			!(at > RAINBOW && at < RAINBOW_END)
		)
			furbies.push({
				x: Math.round(at),
				asset: FURBIES[Math.floor(random() * FURBIES.length)],
			})
		const progress = (at - START_X) / terrain.length
		at += 560 + random() * (600 - progress * 300)
	}

	// A unicorn to ride every so often: not waiting in anything built.
	const corgis: number[] = []
	for (let at = START_X + 1500; at < terrain.finishX - 900; ) {
		if (!busy(at)) corgis.push(Math.round(at))
		at += 1500 + random() * 1200
	}

	return { obstacles, boosts, scenery: scenery(random), furbies, corgis }
}

/** Lollipop trees, candyfloss trees, toadstools, candy canes and rainbow flowers; and furbies, hopping about. */
function scenery(random: () => number): Course['scenery'] {
	const pieces: Course['scenery'] = []
	const lollipops = ['#ff6fa8', '#6bc4ff', '#b48bff', '#ffb86b'].map(
		lollipopTree,
	)
	const caps = ['#ff5f7e', '#b48bff', '#4fb3ff'].map(toadstool)
	const kinds = [
		() => lollipops[Math.floor(random() * lollipops.length)],
		() => candyflossTree,
		() => caps[Math.floor(random() * caps.length)],
		() => candyCane,
		() => rainbowFlower,
		() => rainbowFlower,
	]
	for (let x = -400; x < terrain.finishX + 900; x += 80 + random() * 200) {
		// Nothing in the Giant Furby, nor under the rainbow.
		if (x > GIANT - 60 && x < GIANT_END + 140) continue
		if (x > RAINBOW - 40 && x < RAINBOW_END + 40) continue
		if (random() < 0.14)
			pieces.push({
				x: Math.round(x),
				asset: FURBIES[Math.floor(random() * FURBIES.length)],
				scale: 2,
				hops: true,
			})
		else
			pieces.push({
				x: Math.round(x),
				asset: kinds[Math.floor(random() * kinds.length)](),
				scale: 2,
			})
	}
	return pieces
}

export const furbyFields: CourseDefinition = {
	id: 'furby-fields',
	name: 'Furby Fields',
	blurb:
		'A land made of sweets: bouncy toadstools, a Giant Furby to run through, a rainbow to run over, and unicorns to ride.',
	terrain,
	runDirectors: ['eline', 'claire'],
	cheerers: CHEERERS,
	platforms: PLATFORMS,
	cave: giantFurby,
	giantFurby: { x: GIANT, to: GIANT_END },
	ride: 'unicorn',
	look: {
		palette: {
			'--sky-blue-top': '#ffe3f6',
			'--sky-blue-bottom': '#c69cff',
			'--grass-green': FIELD,
			'--grass-dark-green': '#6fd1ab',
			'--grass-darker-green': '#3fa080',
			// The path: pink sugar.
			'--dirt-brown': '#f7b6dc',
			'--dirt-dark-brown': '#e08cc4',
			'--dirt-darker-brown': '#7a3f78',
		},
		horizon: { far: candyMountains, near: sweetHills, fill: MOUNTAIN_FILL },
		horizonTrees: false,
		sun: 'hue-rotate(280deg) saturate(1.6)',
		// Candy trees' low branches: trunk and leaves alike, candy pink.
		foliage: 'sepia(0.8) hue-rotate(270deg) saturate(2.2) brightness(1.15)',
		// Chocolate, not mud.
		mud: 'sepia(1) saturate(2.2) hue-rotate(-20deg) brightness(0.7)',
		// Gumdrops, not rocks.
		rock: 'sepia(1) saturate(4) hue-rotate(280deg) brightness(1.3)',
		// Flamingos, not geese.
		geese: 'sepia(1) saturate(4) hue-rotate(290deg) brightness(1.4)',
		bouncers: true,
		rainbow: { from: RAINBOW, to: RAINBOW_END, base },
		platform: {
			top: '#fff0fa',
			face: '#ffd1ec',
			edge: '#e8a6cf',
			depth: 16,
			cloud: true,
		},
		// The Giant Furby: its fur, its fur's light, and dark inside it.
		cave: {
			rock: GIANT_FUR,
			seam: GIANT_FUR_DARK,
			edge: GIANT_FUR_LIGHT,
			wall: '#2a1840',
			grass: GIANT_FUR_LIGHT,
		},
	},
	...layOut(),
}

/** Tall enough inside to stand: no Tunnel in it. */
if (GIANT_ROOM < STAND_HEIGHT * 2)
	console.error('The Giant Furby is too low inside')
