import type { RunnerName } from '@/data/runners'
import tree2 from '../assets/scenery/tree2.png'
import { PATH_BACK, START_X } from '../game/constants'
import { HUDDINGE_FIKA } from '../game/fika'
import { createTerrain } from '../game/terrain'
import { pinesFar, pinesNear } from './kit/backdrops'
import {
	HUDDINGE_FLOOR,
	HUDDINGE_TRAIL,
	texturedGround,
} from './kit/groundTextures'
import { withHat } from './kit/hats'
import { huddingeLedgeArt } from './kit/huddinge-ledge'
import { STEP_M, heights } from './kit/huddinge-profile'
import {
	anthill,
	blueberryBush,
	fern,
	mossyBoulder,
	scotsPine,
	spruceA,
	spruceB,
} from './kit/huddingeForest'
import { seeded } from './kit/seeded'
import type {
	BackdropPiece,
	Boost,
	Course,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
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

/**
 * A forest harvester at work, behind the path, on the level stretch at the
 * top of the climb out of the first big loop's dip, clear of the low
 * branches: where the pine it fells stands. The forest's cleared round it.
 */
const HARVESTER_X = START_X + 7700
const nearHarvester = (x: number) =>
	x > HARVESTER_X - 300 && x < HARVESTER_X + 300

/**
 * Where a family of wild boar comes out and runs along with whoever's in
 * front: past the second deer, on the way down into the second loop's dip.
 */
const BOARS_FROM = START_X + 12900

/** A couple of deer, lying in the bracken by the path, waiting to be ridden. */
const DEER = [START_X + 3600, START_X + 11600]
/** How far either side of a deer the path's kept clear, to hop on and get going. */
const DEER_ROOM = 180
const nearDeer = (x: number) => DEER.some((d) => Math.abs(d - x) < DEER_ROOM)

/**
 * A granite ledge up over the path, its end just short of the second deer:
 * jump up onto it for the antlers near its end, then run off it and drop
 * onto the deer's back, wearing them.
 */
const LEDGE: PlatformDefinition = {
	x: DEER[1] - 340,
	width: 230,
	height: 70,
	// A boulder, behind the path: down to its back edge.
	depth: 70 - (PATH_BACK - 2),
}
/** How far back from the ledge's end its antlers are. */
const ANTLERS_BACK = 40
/** Clear under the ledge and round it, so it's a clean jump up. */
const nearLedge = (x: number) =>
	x > LEDGE.x - 160 && x < LEDGE.x + LEDGE.width + 40

/**
 * An anthill occasionally, by the path: their own random numbers, so
 * everything else is where it was.
 */
function anthills(): Course['scenery'] {
	const random = seeded(4519)
	const out: Course['scenery'] = []
	for (
		let at = START_X + 900;
		at < terrain.finishX;
		at += 1400 + random() * 1600
	)
		if (!nearHarvester(at))
			out.push({ x: Math.round(at), asset: anthill, scale: 2, filter: SHADE })
	return out
}

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
				item: HUDDINGE_FIKA[fika++ % HUDDINGE_FIKA.length],
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

	// Spruce, mostly, close together along the path, a pine here and there,
	// and the forest floor: as many kinds as ever, so the same random
	// numbers place them.
	let scenery: Course['scenery'] = []
	const plants = [
		spruceA,
		spruceB,
		spruceA,
		scotsPine,
		spruceB,
		mossyBoulder,
		blueberryBush,
		fern,
	]
	for (let at = -400; at < terrain.finishX + 900; at += 50 + random() * 120) {
		const asset = plants[Math.floor(random() * plants.length)]
		scenery.push({
			x: Math.round(at),
			asset,
			scale: 2,
			// Some in deeper shade than others, so they don't all look one tree.
			filter: random() < 0.4 ? DEEP_SHADE : SHADE,
		})
	}
	// A clearing round the harvester: the trees round it left out once
	// they're all placed, so where everything else is doesn't change.
	scenery = scenery.filter((s) => !nearHarvester(s.x))
	scenery.push(...anthills())
	const kept = {
		obstacles: obstacles.filter((o) => !nearDeer(o.x) && !nearLedge(o.x)),
		boosts: boosts.filter((b) => !nearDeer(b.x) && !nearLedge(b.x)),
	}
	return { ...kept, boosts: withBadMushroom(kept), scenery }
}

/** How far a bad mushroom's kept from anything else on the path, so it's plain to see. */
const BAD_MUSHROOM_CLEAR = 200

/**
 * The course's `boosts`, and among them, on the path about halfway round,
 * where there's nothing else near it, a bad mushroom: run into it without
 * thinking, and the screen goes funny for a moment (see `TRIP_TICKS`).
 * Jump it, if you know.
 */
function withBadMushroom(layout: { obstacles: Obstacle[]; boosts: Boost[] }) {
	const busy = (x: number) =>
		nearDeer(x) ||
		nearLedge(x) ||
		[...layout.obstacles, ...layout.boosts].some(
			(o) => Math.abs(o.x - x) < BAD_MUSHROOM_CLEAR,
		)
	let x = Math.round((START_X + terrain.finishX) / 2)
	while (busy(x) && x < terrain.finishX - 500) x += 20
	const bad: Boost = { kind: 'fika', x, height: 26, item: 'badMushroom' }
	return [...layout.boosts, bad].sort((a, b) => a.x - b.x)
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
	runDirectors: ['adam', 'keith'],
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
		harvester: { x: HARVESTER_X, tree: tree2, filter: SHADE },
		boars: { from: BOARS_FROM },
		// Ridges of pines, one behind another: far off and blue in the haze
		// over the far hills, then a dark wall of them over the middle ones.
		hillBands: [
			{ asset: pinesFar, top: 118, height: 100, parallax: 0.15, over: 'far' },
			{
				asset: pinesNear,
				top: 140,
				height: 120,
				parallax: 0.25,
				over: 'middle',
			},
		],
		// Its forest floor, moss and needles and fallen leaves, and needles
		// and roots across its trail.
		ground: texturedGround('huddinge-floor', 'huddinge-trail'),
		groundDefs: HUDDINGE_FLOOR + HUDDINGE_TRAIL,
		// A wall of pines over the hills.
		far: [
			piece(spruceA, 116, 'brightness(0.7)'),
			piece(spruceB, 116, 'brightness(0.6)'),
			piece(spruceA, 116, 'brightness(0.75) saturate(1.2)'),
		],
		// And thick on the field behind the path.
		near: [
			piece(spruceA, 116, SHADE),
			piece(spruceB, 116, DEEP_SHADE),
			piece(spruceB, 116, SHADE),
			piece(spruceA, 116, DEEP_SHADE),
		],
		nearGap: [12, 56],
		// Granite, grey and mossy, as the forest's boulders are.
		platform: {
			top: '#8e8b80',
			face: 'linear-gradient(to bottom, #7d796f, #5b5850)',
			edge: '#36342f',
			depth: 16,
			rock: { lit: '#b8b4a7', moss: '#5f8a45', drip: '#6c685f' },
		},
	},
	// Antlers, up on the ledge before the second deer: off its end, down
	// onto the deer, in them.
	...withHat(
		layOut(),
		'antlers',
		() => {
			const x = LEDGE.x + LEDGE.width - ANTLERS_BACK
			// On its top: as high over the Ground there as the top is, and a hat's height up.
			const top = terrain.groundY(LEDGE.x) - LEDGE.height
			return { x, height: Math.round(terrain.groundY(x) - top + 26) }
		},
		0,
	),
	platforms: [{ ...LEDGE, art: huddingeLedgeArt(terrain, LEDGE) }],
	special: {
		goal: 'Deer riding deer',
		done: (run) => !!run.rodeWearing?.includes('antlers'),
	},
	corgis: DEER,
	ride: 'deer',
}
