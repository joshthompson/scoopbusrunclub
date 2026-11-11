import type { RunnerName } from '@/data/runners'
import pyramidsFar from '../assets/horizons/pyramids-far.png'
import pyramidsNear from '../assets/horizons/pyramids-near.png'
import palm from '../assets/scenery/palm.png'
import sphinxEntrance from '../assets/sphinx/entrance.png'
import sphinxHead from '../assets/sphinx/head.png'
import sphinxPaw from '../assets/sphinx/paw.png'
import sarcophagus from '../assets/sphinx/sarcophagus.png'
import { START_X } from '../game/constants'
import { PATH_BACK, PATH_FRONT } from '../game/constants'
import { PYRAMIDS_FIKA } from '../game/fika'
import { type Terrain, createTerrain, withGaps } from '../game/terrain'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import type { Cave, Course, CourseDefinition } from './types'

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
 * How steep a pyramid's face is, for running down it, and up it: much less
 * than it looks, or up it would be a crawl, but up it, a hard slog.
 */
const FACE_SLOPE = 0.25
const CLIMB_SLOPE = 0.32

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

/**
 * The Sphinx, between the second pyramid and the third: a slot between its
 * paws to slide into, a Tunnel sliding down into its tomb, the tomb, tall
 * enough to stand in, and a Tunnel sliding back up and out of its back.
 */
const SPHINX = START_X + 11400
/**
 * Its way in, a porch along the path into its chest, between its paws: its
 * roof as low as a Tunnel's, for sliding in under, and how high its top is.
 */
const PORCH = 150
const PORCH_TOP = 56
/** Each stretch of the way through, in turn, how long. */
const SLOT = 60
const SLIDE_DOWN = 500
const TOMB = 760
const SLIDE_UP = 500
const SPHINX_END = SPHINX + SLOT + SLIDE_DOWN + TOMB + SLIDE_UP + SLOT
const TOMB_FROM = SPHINX + SLOT + SLIDE_DOWN
const TOMB_TO = TOMB_FROM + TOMB
/**
 * The dune the Sphinx lies on, rising out of the sand before it and back
 * down after: as high as the tomb's dug down into it, so the tomb's floor
 * is the desert's.
 */
const DUNE = 150
const DUNE_RISE = 600
const DUNE_FROM = SPHINX - 100 - DUNE_RISE
const DUNE_TO = SPHINX_END + 100 + DUNE_RISE
/** How far down the tomb is, under the dune's top. */
const TOMB_DEPTH = DUNE
/** How high the rock is over the floor: in a Tunnel, and in the tomb. */
const SLIDE = 30
const TOMB_ROOM = 190
/** How far the tomb's roof takes to rise from a Tunnel's, and fall back. */
const TOMB_RAMP = 120

const ease = (t: number) => t * t * (3 - 2 * t)

/** How high the Sphinx's dune is, `x` along. */
function dune(x: number) {
	if (x <= DUNE_FROM || x >= DUNE_TO) return 0
	const up = Math.min(1, (x - DUNE_FROM) / DUNE_RISE)
	const down = Math.min(1, (DUNE_TO - x) / DUNE_RISE)
	return DUNE * ease(Math.min(up, down))
}

/** How far down under the dune's top the floor is, `x` along: none outside the Sphinx. */
function sunk(x: number) {
	if (x < SPHINX + SLOT || x >= SPHINX_END - SLOT) return 0
	if (x < TOMB_FROM) return TOMB_DEPTH * ease((x - SPHINX - SLOT) / SLIDE_DOWN)
	if (x < TOMB_TO) return TOMB_DEPTH
	return TOMB_DEPTH * (1 - ease((x - TOMB_TO) / SLIDE_UP))
}

/** The dunes, with the pyramids stood on them, and the way down through the Sphinx. */
const terrain: Terrain = withGaps({
	length: dunes.length,
	finishX: dunes.finishX,
	groundY: (x) => {
		const pyramid = pyramidAt(x)
		return pyramid ? pyramid.face(x) : dunes.groundY(x) - dune(x) + sunk(x)
	},
	slope: (x) => {
		const pyramid = pyramidAt(x)
		if (pyramid) {
			if (Math.abs(x - pyramid.x) <= SUMMIT) return 0
			return x < pyramid.x ? -CLIMB_SLOPE : FACE_SLOPE
		}
		if (x > DUNE_FROM && x < DUNE_TO)
			return (terrain.groundY(x + 4) - terrain.groundY(x - 4)) / 8
		return dunes.slope(x)
	},
})

/** How high the rock is over the floor in the Sphinx, `x` along. */
function headroom(x: number) {
	if (x < SPHINX - PORCH || x >= SPHINX_END) return undefined
	if (x < TOMB_FROM || x >= TOMB_TO) return SLIDE
	const rise = Math.min(1, (x - TOMB_FROM) / TOMB_RAMP)
	const fall = Math.min(1, (TOMB_TO - x) / TOMB_RAMP)
	return (
		Math.round((SLIDE + (TOMB_ROOM - SLIDE) * ease(Math.min(rise, fall))) / 4) *
		4
	)
}

/**
 * How high the Sphinx's back is over the sand, `x` along: up from its
 * chest over the slot to its head, along its back, and down its haunches.
 */
function sphinxHeight(x: number) {
	const t = x - SPHINX
	const length = SPHINX_END - SPHINX
	// Its chest, tall enough over the way in for its doorway.
	if (t < 40) return 85
	if (t < 100) return 85 + ((t - 40) / 60) * 35
	if (t < 320) return 120
	if (t < length - 260) return 110 - ((t - 320) / (length - 580)) * 15
	return 50 + 45 * ease((length - t) / 260)
}

/** The Sphinx, as a Cave: its body over the way through it. */
const sphinx: Cave = {
	from: SPHINX - PORCH,
	// Its porch all showing, from outside.
	mouth: PORCH + 30,
	to: SPHINX_END,
	ceiling: (x) => {
		const room = headroom(x)
		return room === undefined ? undefined : terrain.groundY(x) - room
	},
	surface: (x) => {
		if (x < SPHINX - PORCH || x >= SPHINX_END) return undefined
		// Its porch's roof, out in front of its chest.
		if (x < SPHINX) return terrain.groundY(x) - PORCH_TOP
		return dunes.groundY(x) - dune(x) - sphinxHeight(x)
	},
	// Nothing in front of the path but the sand, to the path's near edge.
	foot: (x) => {
		if (x < SPHINX - PORCH || x >= SPHINX_END) return undefined
		return terrain.groundY(x) + PATH_FRONT + 2
	},
	// Dug down into the dune, under the Sphinx.
	sand: (x) => {
		if (x < SPHINX || x >= SPHINX_END) return undefined
		return dunes.groundY(x) - dune(x) - PATH_BACK
	},
	features: [
		// Its head, forward over its chest.
		{ asset: sphinxHead, x: SPHINX + 170, width: 120, height: 130, sink: 14 },
		// Its way in: a porch along the path, open, dark inside, over the
		// path itself, so it reads as a way in, however the perspective goes.
		{
			asset: sphinxEntrance,
			x: SPHINX - PORCH / 2,
			width: PORCH,
			height: PORCH_TOP + PATH_FRONT,
			on: 'path',
		},
		// Its paw, out along the near side of its porch: the far one's
		// behind it.
		{
			asset: sphinxPaw,
			x: SPHINX - 90,
			width: 180,
			height: 18,
			sink: 6,
			on: 'in front',
		},
	],
}

/** The tomb's Mummies: where each shuffles about, and how far. */
const MUMMIES = [
	{ x: TOMB_FROM + 230, pace: 50 },
	{ x: TOMB_FROM + 470, pace: 60 },
]

/** Nothing on the pyramids, or near their feet: they're climb enough. Nor in or near the Sphinx. */
const clear = (x: number) =>
	!PYRAMIDS.some(
		({ feet: [left, right] }) => x > left - 200 && x < right + 200,
	) && !(x > DUNE_FROM - 200 && x < DUNE_TO + 100)

/** A couple of camels, knelt on the sand waiting to be ridden: one before each of the first two pyramids, to ride up over it. */
function camels() {
	const at: number[] = []
	for (const from of [START_X + 1800, START_X + 6000])
		for (let x = from; x < terrain.finishX - 1200; x += 100)
			if (clear(x - 200) && clear(x + 200)) {
				at.push(x)
				break
			}
	return at
}

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery' | 'corgis'> {
	const random = seeded(2560)
	let fika = 0
	const corgis = camels()
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		clear: (x) => clear(x) && !corgis.some((c) => Math.abs(c - x) < 160),
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
					item: PYRAMIDS_FIKA[fika++ % PYRAMIDS_FIKA.length],
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
			item: PYRAMIDS_FIKA[fika++ % PYRAMIDS_FIKA.length],
		})
	boosts.sort((a, b) => a.x - b.x)
	// The tomb's Mummies.
	for (const mummy of MUMMIES) obstacles.push({ kind: 'mummy', ...mummy })
	obstacles.sort((a, b) => a.x - b.x)
	// A palm now and then, an oasis, but not on a pyramid, nor by the Sphinx.
	const scenery: Course['scenery'] = []
	for (let at = -300; at < terrain.finishX + 900; at += 300 + random() * 700)
		if (!pyramidAt(at) && !(at > SPHINX - 300 && at < SPHINX_END + 100))
			scenery.push({ x: Math.round(at), asset: palm })
	// The sarcophagus in the Sphinx's tomb, stood against the wall.
	scenery.push({
		x: TOMB_FROM + TOMB / 2 + 40,
		asset: sarcophagus,
		scale: 2,
		setBack: 0,
		onFloor: true,
	})
	return { obstacles, boosts, scenery, corgis }
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
		// Sandstone, not grey granite.
		rock: 'sepia(0.8) saturate(1.5) hue-rotate(-10deg) brightness(1.08)',
		// The Sphinx: sandstone, its tomb dark inside.
		cave: {
			rock: '#c99b55',
			seam: '#a87b3c',
			edge: '#e2bd7a',
			wall: '#3f2c1a',
			grass: '#e8c983',
		},
	},
	cave: sphinx,
	...layOut(),
	ride: 'camel',
}
