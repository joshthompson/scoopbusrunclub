import type { RunnerName } from '@/data/runners'
import oldTownChurches from '../assets/horizons/old-town-churches.png'
import oldTownFar from '../assets/horizons/old-town-far.png'
import oldTownNear from '../assets/horizons/old-town-near.png'
import katarinahissen from '../assets/scenery/katarinahissen.png'
import lamp from '../assets/scenery/lamp.png'
import quayWall from '../assets/scenery/quay-wall.png'
import {
	CAMERA_PAST_FINISH,
	PATH_BACK,
	PATH_FRONT,
	START_X,
	VERGE,
} from '../game/constants'
import { GAMLA_STAN_FIKA } from '../game/fika'
import { type Terrain, createTerrain, withGaps } from '../game/terrain'
import {
	GAMLA_STAN_COBBLES,
	GAMLA_STAN_SIDE_COBBLES,
	GRANITE_SLABS,
} from './kit/cobbles'
import {
	DROTTNINGGATAN,
	ROSENBAD_WIDTH,
	oldTownAlley,
	oldTownHouse,
	ragAndBone,
	riksdag,
	rosenbad,
} from './kit/gamlaStanScenery'
import { withHat } from './kit/hats'
import { type PixelRect, pixelArt } from './kit/pixelArt'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import type {
	Boost,
	BridgeLook,
	Course,
	CourseDefinition,
	Obstacle,
} from './types'

/**
 * Gamla Stan, a placeholder: from the bottom of Drottninggatan, past the
 * homeless fox by Rosenbad, over Riksbron onto Helgeandsholmen, by the
 * Riksdag, and over Stallbron into Stockholm's old town; on the cobbles
 * between its coloured houses, its churches' spires over them. Tourists,
 * pigeons, steam from the street's grates, and a café on every corner; and
 * over Guldbron at the end, cyclists coming the other way.
 */

const CHEERERS: RunnerName[] = [
	'keith',
	'josh',
	'eline',
	'anna',
	'lyra',
	'rick',
	'august',
]

const STEP_M = 10
const DISTANCE_M = 5000
/** Made up: the island's gentle rise and fall. */
const heights = Array.from({ length: DISTANCE_M / STEP_M + 1 }, (_, i) => {
	const m = i * STEP_M
	return 4 + 3 * Math.sin(m / 330 + 0.5) + 1.5 * Math.sin(m / 110)
})

const island = createTerrain(heights, STEP_M, DISTANCE_M)

/**
 * The way in, from the start: the end of Drottninggatan, then Riksbron
 * over Norrström to Helgeandsholmen, Riksgatan across it past the Riksdag,
 * and Stallbron, short, off it into Gamla Stan.
 */
const RIKSBRON = START_X + 260
const RIKSBRON_END = START_X + 700
const STALLBRON = START_X + 1460
const STALLBRON_END = START_X + 1700
/**
 * Rag and Bone, the homeless fox, on the corner just behind the start, and
 * Rosenbad behind it, its corner tower by the bridge: their middles. Their
 * art's a cell a pixel, drawn at 2.
 */
const FOX = START_X - 28
const ROSENBAD = RIKSBRON - 40 - ROSENBAD_WIDTH
/**
 * Drottninggatan's buildings up the street from Rosenbad, side by side
 * back from it: each at its middle.
 */
const drottninggatan = () => {
	let right = ROSENBAD - ROSENBAD_WIDTH
	return DROTTNINGGATAN.toReversed().map(({ width, asset }) => {
		right -= width * 2
		return { x: right + width, asset, scale: 2 }
	})
}
/**
 * The old town's houses along the street from Stallbron to Guldbron,
 * shops in their ground floors, side by side, an alley off between them
 * now and then: each on the street where it is, up and down with it.
 * Laid out with their own seed, so the course's own layout's as it was.
 */
const oldTownStreet = () => {
	const random = seeded(1259)
	const pieces: Course['scenery'] = []
	let alleyBefore = true
	for (let left = STALLBRON_END + 40, n = 0; ; n++) {
		const alley: boolean = !alleyBefore && random() < 0.22
		const { asset, width } = alley
			? oldTownAlley(1260 + n)
			: oldTownHouse(1260 + n)
		if (left + width * 2 > BRIDGE - 140) break
		pieces.push({ x: left + width, asset, scale: 2, footing: true })
		left += width * 2
		alleyBefore = alley
	}
	return pieces
}
/** The Riksdag, across the middle of Helgeandsholmen. */
const RIKSDAG = (RIKSBRON_END + STALLBRON) / 2

/**
 * Where Guldbron starts, the gold bridge over to Slussen, with the finish
 * on it, and where it comes down at Slussen, just past the finish.
 */
const BRIDGE = island.finishX - 1700
const BRIDGE_END = island.finishX + 260
/**
 * Katarinahissen, at Slussen, just off the end of the bridge: its middle.
 * Its lift tower's on the picture's left, its walkway across to the right,
 * to the building at its end. Far enough along that, where the camera stops
 * (`CAMERA_PAST_FINISH` past the finish), its tower's in view and its
 * walkway runs on off the edge of the screen, the building past it.
 */
const KATARINAHISSEN = island.finishX + CAMERA_PAST_FINISH - 48
/** Where its walkway's building is, along the picture, and how far the walkway goes on past it. */
const WALKWAY_ON_FROM = 75
const WALKWAY_ON = 1200
/**
 * Katarinahissen's walkway, going on: its rail over its lattice, as in its
 * picture, `WALKWAY_ON` long, as tall as the picture, so it lines up with it.
 */
const walkwayOn = (() => {
	const rects: PixelRect[] = [
		[0, 20, WALKWAY_ON, 2, '#c9ccd6'],
		[0, 22, WALKWAY_ON, 8, '#3d4148'],
		[0, 22, WALKWAY_ON, 2, '#c9ccd6'],
	]
	for (let x = 2; x < WALKWAY_ON; x += 8) rects.push([x, 22, 2, 8, '#6a707a'])
	return pixelArt(WALKWAY_ON, 240, rects)
})()

/** How steeply it rises on over the water to Slussen: a little. */
const BRIDGE_RISE = 0.03

/** The island, and the bridge off it at the end, rising a little, to Slussen, level. */
const terrain: Terrain = withGaps({
	length: island.length,
	finishX: island.finishX,
	groundY: (x) =>
		island.groundY(BRIDGE) -
		(x < BRIDGE
			? island.groundY(BRIDGE) - island.groundY(x)
			: (Math.min(x, BRIDGE_END) - BRIDGE) * BRIDGE_RISE),
	slope: (x) =>
		x < BRIDGE ? island.slope(x) : x < BRIDGE_END ? -BRIDGE_RISE : 0,
})

/**
 * Its stretches, each with its own way of being in the way, as a share of
 * the way to the bridge: Västerlånggatan, full of tourists; Stortorget, its
 * pigeons and its cafés; the lanes, steam rising from their grates; and the
 * quay, Skeppsbron, a bit of everything.
 */
type Stretch = 'västerlånggatan' | 'stortorget' | 'lanes' | 'skeppsbron'
const stretchAt = (x: number): Stretch => {
	const along = (x - START_X) / (BRIDGE - START_X)
	return along < 0.22
		? 'västerlånggatan'
		: along < 0.45
			? 'stortorget'
			: along < 0.72
				? 'lanes'
				: 'skeppsbron'
}

/**
 * Where fika goes over a Steam Vent: as far on past it, and as high, as
 * anyone fired up off it at a run is at the top of the jump, however fast
 * they were going, from a jog to boosted.
 */
const VENT_FIKA_AHEAD = 130
/** How much room a corgi waits in, clear of anything else either side. */
const CORGI_ROOM = 160
const VENT_FIKA_HEIGHT = 200

/** How likely each thing is, in each stretch: tourists, pigeons, a steam vent, fika; and the rest, a cheer. */
const MIX: Record<Stretch, [number, number, number, number]> = {
	västerlånggatan: [0.55, 0.12, 0, 0.2],
	stortorget: [0.15, 0.35, 0, 0.35],
	lanes: [0.3, 0.05, 0.4, 0.15],
	skeppsbron: [0.25, 0.22, 0.25, 0.18],
}

/**
 * Cyclists on Guldbron, coming over it from Slussen towards you, and back
 * and forth between Slussen and the far side of it, turning round at either
 * end, as in Turku: always on their way, never vanishing.
 */
const CYCLE_SHUTTLE: [number, number] = [BRIDGE - 400, BRIDGE_END + 500]
const CYCLISTS = [0, 0.25, 0.5, 0.75].map(
	(along) => CYCLE_SHUTTLE[0] + (CYCLE_SHUTTLE[1] - CYCLE_SHUTTLE[0]) * along,
)

/**
 * Granite slabs on Drottninggatan and Helgeandsholmen, cobbles in Gamla
 * Stan, and the bridges' decks plain: each pushed down out of sight
 * where it isn't.
 */
const OUT_OF_SIGHT = 1000
const slabsOff = (x: number) =>
	x < RIKSBRON || (x >= RIKSBRON_END && x < STALLBRON) ? 0 : OUT_OF_SIGHT
const cobblesOff = (x: number) =>
	x < STALLBRON_END || (x > BRIDGE && x < BRIDGE_END) ? OUT_OF_SIGHT : 0

/** Riksbron and Stallbron: granite, grey, over Norrström's water. */
const GRANITE_BRIDGE = {
	underside: '#9a958d',
	highlight: '#c2bdb4',
	underbelly: '#5f5b55',
	water: '#3f6f8f',
	rail: '#2b3036',
	quay: quayWall,
} satisfies Partial<BridgeLook>

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery' | 'corgis'> {
	const random = seeded(1252)
	let fika = 0
	const nextFika = () => GAMLA_STAN_FIKA[fika++ % GAMLA_STAN_FIKA.length]
	const extra: Boost[] = []
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		// Nothing on the bridge but the cyclists.
		clear: (x) => x < BRIDGE - 200,
		pick: (x): Obstacle | Boost => {
			const [tourists, pigeons, steam, cafe] = MIX[stretchAt(x)]
			const roll = random()
			if (roll < tourists)
				return { kind: 'tourists', x, count: 2 + Math.floor(random() * 3) }
			if (roll < tourists + pigeons)
				return { kind: 'geese', x, count: 2 + Math.floor(random() * 3) }
			if (roll < tourists + pigeons + steam) {
				// Fika up past some of them, for whoever's fired up to it: where
				// they'll be at the top of the jump, running on, quick or slow.
				if (random() < 0.5)
					extra.push({
						kind: 'fika',
						x: x + VENT_FIKA_AHEAD,
						height: VENT_FIKA_HEIGHT,
						item: nextFika(),
					})
				return { kind: 'steam', x }
			}
			// A café on every corner.
			if (roll < tourists + pigeons + steam + cafe)
				return {
					kind: 'fika',
					x,
					height: random() < 0.5 ? 26 : 95,
					item: nextFika(),
				}
			return {
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			}
		},
	})
	boosts.push(...extra)
	boosts.sort((a, b) => a.x - b.x)
	obstacles.push(
		...CYCLISTS.map(
			(x): Obstacle => ({
				kind: 'cyclist',
				x: Math.round(x),
				shuttle: CYCLE_SHUTTLE,
			}),
		),
	)
	// Drottninggatan, Rosenbad, the Riksdag, the fox, and the old town's
	// streets, behind the lamps.
	const scenery: Course['scenery'] = [
		...drottninggatan(),
		...oldTownStreet(),
		{ x: ROSENBAD, asset: rosenbad, scale: 2 },
		{ x: RIKSDAG, asset: riksdag, scale: 2 },
		{ x: FOX, asset: ragAndBone, scale: 2 },
	]
	// Street lamps along the way, as far as the bridge, and on again at
	// Slussen, past it, by Katarinahissen: none by the fox.
	for (let at = -300; at < terrain.finishX + 1600; at += 300 + random() * 120)
		if (
			(at < BRIDGE - 60 || at > BRIDGE_END + 40) &&
			Math.abs(at - KATARINAHISSEN) > 100 &&
			Math.abs(at - FOX) > 60
		)
			scenery.push({ x: Math.round(at), asset: lamp })
	scenery.push({ x: KATARINAHISSEN, asset: katarinahissen })
	// Its walkway, on past the building, so it's never left in mid-air,
	// however far the camera's zoomed out.
	scenery.push({
		x: KATARINAHISSEN + WALKWAY_ON_FROM + WALKWAY_ON / 2,
		asset: walkwayOn,
	})
	// Corgis, out for a walk in the old town, waiting to be ridden: in a
	// clear bit of street, each, well before the bridge.
	const corgis: number[] = []
	for (const share of [0.18, 0.47, 0.76]) {
		let x = START_X + (BRIDGE - START_X) * share
		while (
			[...obstacles, ...boosts].some((o) => Math.abs(o.x - x) < CORGI_ROOM)
		)
			x += 20
		corgis.push(Math.round(x))
	}
	return { obstacles, boosts, scenery, corgis }
}

export const gamlaStan: CourseDefinition = {
	id: 'gamla-stan',
	name: 'Gamla Stan',
	blurb:
		'Through Stockholm’s old town and over Guldbron: tourists, pigeons, steam vents, corgis to ride, and cyclists on the bridge.',
	terrain,
	runDirectors: ['keith', 'josh'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#9fd3f0',
			'--sky-blue-bottom': '#e6f2fa',
			// The pavement, and the houses' feet, in place of the grass.
			'--grass-green': '#a49a8e',
			'--grass-dark-green': '#857b70',
			'--grass-darker-green': '#5e564d',
			// The cobbles.
			'--dirt-brown': '#8f8880',
			'--dirt-dark-brown': '#6f6962',
			'--dirt-darker-brown': '#47423d',
		},
		horizon: {
			far: oldTownFar,
			near: oldTownNear,
			fill: '#b98a5a',
			spires: oldTownChurches,
		},
		// Plain grey, cobbles only hinted at here and there: paler either side, a
		// kerb, and the street down the middle.
		ground: [
			[-PATH_BACK - VERGE, 'var(--grass-green)'],
			[-PATH_BACK - VERGE, 'url(#gamla-stan-side-cobbles)'],
			[-PATH_BACK, 'var(--grass-darker-green)'],
			// The bridges' decks, plain, granite slabs either side of Riksbron,
			// and cobbles from Stallbron on.
			[-PATH_BACK + 2, 'var(--dirt-brown)'],
			[-PATH_BACK + 2, 'url(#granite-slabs)', false, slabsOff],
			[-PATH_BACK + 2, 'url(#gamla-stan-cobbles)', false, cobblesOff],
			[PATH_FRONT, 'var(--grass-darker-green)'],
			[PATH_FRONT + 2, 'var(--grass-dark-green)'],
			[PATH_FRONT + 4, 'var(--grass-green)'],
			[PATH_FRONT + 4, 'url(#gamla-stan-side-cobbles)'],
		],
		groundDefs: GAMLA_STAN_COBBLES + GAMLA_STAN_SIDE_COBBLES + GRANITE_SLABS,
		bridges: [
			// Riksbron, onto Helgeandsholmen: its quay's stone under the path
			// all across the island, to Stallbron.
			{
				...GRANITE_BRIDGE,
				from: RIKSBRON,
				to: RIKSBRON_END,
				stoneUntil: STALLBRON,
			},
			// Stallbron, off it, into Gamla Stan: no quay's stone past it, the
			// old town's cobbles.
			{
				...GRANITE_BRIDGE,
				from: STALLBRON,
				to: STALLBRON_END,
				stoneUntil: STALLBRON_END,
			},
			// Guldbron: gold underneath, over Riddarfjärden's water.
			{
				from: BRIDGE,
				to: BRIDGE_END,
				underside: '#e8b52a',
				highlight: '#ffe58a',
				underbelly: '#9c6b12',
				quay: quayWall,
				water: '#3f6f8f',
				rail: '#2b3036',
			},
		],
		horizonTrees: false,
		geese: 'grayscale(1) brightness(0.9)',
	},
	// A Royal Guard's helmet, high over a steam vent: stop on it, and it
	// fires you straight up to it; running on over it, you're carried on
	// past under it.
	...withHat(
		layOut(),
		'guardHelmet',
		({ obstacles }) => {
			const vents = obstacles.filter((o) => o.kind === 'steam')
			const vent = vents[Math.min(2, vents.length - 1)]
			return { x: vent?.x ?? START_X + 13000, height: 240 }
		},
		0,
	),
}
