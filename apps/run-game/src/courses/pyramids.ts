import type { RunnerName } from '@/data/runners'
import pyramidsFar from '../assets/horizons/pyramids-far.png'
import pyramidsNear from '../assets/horizons/pyramids-near.png'
import palm from '../assets/scenery/palm.png'
import sphinxEntrance from '../assets/sphinx/entrance.png'
import sarcophagus from '../assets/sphinx/sarcophagus.png'
import { START_X } from '../game/constants'
import { PATH_BACK, PATH_FRONT, VERGE } from '../game/constants'
import { PYRAMIDS_FIKA } from '../game/fika'
import { type Terrain, createTerrain, withGaps } from '../game/terrain'
import { MS_CROCODILE } from '../runners/bonus'
import { nearDunes } from './kit/backdrops'
import { duckPost } from './kit/duckSigns'
import { bush, papyrus, reeds } from './kit/nileScenery'
import { SAND_FAR_RIPPLES, SAND_RIPPLES, SAND_TRACK } from './kit/sand'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import {
	SPHINX_HAUNCH_HEIGHT,
	SPHINX_HAUNCH_WIDTH,
	SPHINX_HEAD_HEIGHT,
	SPHINX_HEAD_WIDTH,
	SPHINX_LEG_HEIGHT,
	SPHINX_LEG_WIDTH,
	SPHINX_SHOULDER_HEIGHT,
	SPHINX_SHOULDER_WIDTH,
	sphinxFarLeg,
	sphinxHaunch,
	sphinxHead,
	sphinxLeg,
	sphinxShoulder,
} from './kit/sphinxArt'
import type {
	Cave,
	Course,
	CourseDefinition,
	PlatformDefinition,
} from './types'

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

/**
 * The Nile, across the way soon after the start, before the first pyramid:
 * wide, the dunes levelling out down to its banks either side. Its bed's a
 * little under its water, its banks sloping down to it: whoever misses its
 * crocodiles is in up to their shins, wading.
 */
const NILE_FROM = START_X + 700
const NILE_TO = NILE_FROM + 1250
const NILE_LEVEL = Math.round(dunes.groundY((NILE_FROM + NILE_TO) / 2))
/** How far either side of it the dunes take to level out to its banks. */
const NILE_LEVELS = 300
/** How deep its bed is under its water, and how far in its banks take to slope down to that. */
const NILE_DEPTH = 22
const NILE_BANK = 24
/**
 * How much of its banks' steepness holds back anyone wading out up one:
 * drawn as steep as they are, but climbed like a gentle slope, or out of
 * the water would be a crawl (as the Sphinx's passage out).
 */
const NILE_BANK_PULL = 0.15
/**
 * Its crocodiles, from its near bank, each a bounce on from the last at a
 * run, steered in the air: a short hop, held back; a long one, holding
 * on; and one between. Holding on all the way, or letting go, won't do.
 */
const CROCODILES = [200, 430, 710, 965].map((at) => NILE_FROM + at)

/** The Ground, by the Nile: levelled out to its banks, and down to its bed in it. None away from it. */
function nile(x: number) {
	if (x <= NILE_FROM - NILE_LEVELS || x >= NILE_TO + NILE_LEVELS)
		return undefined
	if (x < NILE_FROM || x > NILE_TO) {
		const off = x < NILE_FROM ? NILE_FROM - x : x - NILE_TO
		const level = ease(1 - off / NILE_LEVELS)
		return dunes.groundY(x) + (NILE_LEVEL - dunes.groundY(x)) * level
	}
	const into = Math.min(x - NILE_FROM, NILE_TO - x)
	return NILE_LEVEL + NILE_DEPTH * ease(Math.min(1, into / NILE_BANK))
}

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
 * enough to stand in, and a passage up and out of its back, tall enough to
 * run up: dodging the Mummies leaves you slow, and a Tunnel would keep you
 * that slow all the way up.
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
/** How high the passage up out of the tomb is: room to stand and run, not to jump. */
const EXIT_ROOM = 68
/**
 * How much of the passage's steepness holds a runner back: drawn as steep as
 * it is, but run up like a gentle one, or it'd near stop them (as Scoop
 * Cruises' stairs).
 */
const EXIT_PULL = 0.15
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
		if (pyramid) return pyramid.face(x)
		return nile(x) ?? dunes.groundY(x) - dune(x) + sunk(x)
	},
	slope: (x) => {
		const pyramid = pyramidAt(x)
		if (pyramid) {
			if (Math.abs(x - pyramid.x) <= SUMMIT) return 0
			return x < pyramid.x ? -CLIMB_SLOPE : FACE_SLOPE
		}
		if (nile(x) !== undefined) {
			const slope = (terrain.groundY(x + 4) - terrain.groundY(x - 4)) / 8
			return x > NILE_FROM && x < NILE_TO ? slope * NILE_BANK_PULL : slope
		}
		if (x > DUNE_FROM && x < DUNE_TO) {
			const slope = (terrain.groundY(x + 4) - terrain.groundY(x - 4)) / 8
			return x >= TOMB_TO && x < SPHINX_END ? slope * EXIT_PULL : slope
		}
		return dunes.slope(x)
	},
})

/** How high the rock is over the floor in the Sphinx, `x` along. */
function headroom(x: number) {
	if (x < SPHINX - PORCH || x >= SPHINX_END) return undefined
	if (x < TOMB_FROM) return SLIDE
	if (x >= TOMB_TO) return EXIT_ROOM
	const rise = Math.min(1, (x - TOMB_FROM) / TOMB_RAMP)
	const fall = Math.min(1, (TOMB_TO - x) / TOMB_RAMP)
	// Down to a Tunnel's on the way in, and to the passage's on the way out.
	const low = rise < fall ? SLIDE : EXIT_ROOM
	return (
		Math.round((low + (TOMB_ROOM - low) * ease(Math.min(rise, fall))) / 4) * 4
	)
}

/**
 * How high the Sphinx's back is over the sand, `x` along: a lion's, lying
 * down. Its chest, over the way in, tall enough for its doorway, and as
 * tall as someone on its porch's roof can't jump; up its neck to under its
 * head; its shoulders, down to its long back; the round of its haunch; and
 * down its rump, over the passage out, rock over its doorway to the end.
 */
function sphinxHeight(x: number) {
	const t = x - SPHINX
	const length = SPHINX_END - SPHINX
	if (t < 40) return 85
	if (t < 70) return 85 + ((t - 40) / 30) * 27
	if (t < 170) return 112
	if (t < 300) return 112 - ((t - 170) / 130) * 12
	const haunch = length - 520
	if (t < haunch) return 100 - ((t - 300) / (haunch - 300)) * 6
	if (t < length - 220) {
		const u = (t - haunch) / 300
		return 94 + u + 16 * Math.sin(Math.PI * u)
	}
	return EXIT_ROOM + 16 + (95 - EXIT_ROOM - 16) * ease((length - t) / 220)
}

/** Where along it its head, its shoulder and its haunch are, from its chest. */
const HEAD_AT = 70
const SHOULDER_AT = 100
const HAUNCH_AT = SPHINX_END - SPHINX - 360

/**
 * How far down into its body from its back a carving on its side sinks, at
 * `t` along, for its bottom to be on the sand at its foot: as far as its
 * side goes down, from its back to the sand.
 */
const onItsSide = (t: number) => sphinxHeight(SPHINX + t) - PATH_BACK

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
		// Its far foreleg, behind its porch, its paw just showing past it.
		{
			asset: sphinxFarLeg,
			x: SPHINX - 46,
			width: SPHINX_LEG_WIDTH,
			height: SPHINX_LEG_HEIGHT,
			sink: 4,
			on: 'behind',
		},
		// Carved into its side: its shoulder, down to its elbow; its haunch,
		// its hind leg tucked under it, and its tail.
		{
			asset: sphinxShoulder,
			x: SPHINX + SHOULDER_AT,
			width: SPHINX_SHOULDER_WIDTH,
			height: SPHINX_SHOULDER_HEIGHT,
			sink: onItsSide(SHOULDER_AT),
		},
		{
			asset: sphinxHaunch,
			x: SPHINX + HAUNCH_AT,
			width: SPHINX_HAUNCH_WIDTH,
			height: SPHINX_HAUNCH_HEIGHT,
			sink: onItsSide(HAUNCH_AT),
		},
		// Its head, side on, facing whoever's coming, over its chest.
		{
			asset: sphinxHead,
			x: SPHINX + HEAD_AT,
			width: SPHINX_HEAD_WIDTH,
			height: SPHINX_HEAD_HEIGHT,
			sink: 42,
		},
		// Its way in: a porch along the path, open, dark inside, over the
		// path itself, so it reads as a way in, however the perspective goes.
		{
			asset: sphinxEntrance,
			x: SPHINX - PORCH / 2,
			width: PORCH,
			height: PORCH_TOP + PATH_FRONT,
			on: 'path',
		},
		// Its near foreleg, out along the near side of its porch, its elbow
		// at its chest and its paw out at the front.
		{
			asset: sphinxLeg,
			x: SPHINX - 46,
			width: SPHINX_LEG_WIDTH,
			height: SPHINX_LEG_HEIGHT,
			sink: 8,
			on: 'in front',
		},
	],
}

/** The tomb's Mummies: where each shuffles about, and how far. */
const MUMMIES = [
	{ x: TOMB_FROM + 230, pace: 50 },
	{ x: TOMB_FROM + 470, pace: 60 },
]

/** Nothing on the pyramids, or near their feet: they're climb enough. Nor in or near the Sphinx, nor the Nile. */
const clear = (x: number) =>
	!PYRAMIDS.some(
		({ feet: [left, right] }) => x > left - 200 && x < right + 200,
	) &&
	!(x > DUNE_FROM - 200 && x < DUNE_TO + 100) &&
	!(x > NILE_FROM - 250 && x < NILE_TO + 250)

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
	// In the Sphinx's tomb, between its Mummies, by the sarcophagus: a
	// pharaoh's headdress, to jump for.
	boosts.push({ kind: 'hat', x: TOMB_FROM + 350, height: 64, hat: 'pharaoh' })
	boosts.sort((a, b) => a.x - b.x)
	// The tomb's Mummies.
	for (const mummy of MUMMIES) obstacles.push({ kind: 'mummy', ...mummy })
	// The Nile's crocodiles.
	for (const x of CROCODILES) obstacles.push({ kind: 'crocodile', x })
	obstacles.sort((a, b) => a.x - b.x)
	// A palm now and then, an oasis, but not on a pyramid, nor by the
	// Sphinx, nor in the Nile.
	const scenery: Course['scenery'] = []
	for (let at = -300; at < terrain.finishX + 900; at += 300 + random() * 700)
		if (
			!pyramidAt(at) &&
			!(at > SPHINX - 300 && at < SPHINX_END + 100) &&
			!(at > NILE_FROM - 80 && at < NILE_TO + 80)
		)
			scenery.push({ x: Math.round(at), asset: palm })
	scenery.push(...nileBanks())
	// The sarcophagus in the Sphinx's tomb, stood against the wall.
	scenery.push({
		x: TOMB_FROM + TOMB / 2 + 40,
		asset: sarcophagus,
		scale: 2,
		setBack: 0,
		onFloor: true,
	})
	// A signpost on the sand before its way in, telling you to duck.
	scenery.push({ x: SPHINX - PORCH - 80, asset: duckPost, setBack: 0 })
	return { obstacles, boosts, scenery, corgis }
}

/**
 * Along the Nile's banks: papyrus and reeds, a bush or two, behind the path
 * and in front of it, either side of the water. Bunched up by the water,
 * thinning out away from it.
 */
/** Where the near bank's reeds stand: in the sand a little in front of the path. */
const NEAR_SIDE = -PATH_BACK - PATH_FRONT - 12

function nileBanks(): Course['scenery'] {
	const out: Course['scenery'] = []
	for (const [edge, side] of [
		[NILE_FROM, -1],
		[NILE_TO, 1],
	] as const) {
		const at = (off: number) => Math.round(edge + side * off)
		out.push(
			// Behind the path.
			{ x: at(26), asset: papyrus, scale: 2, setBack: 4 },
			{ x: at(70), asset: reeds, scale: 2, setBack: 10 },
			{ x: at(120), asset: bush, scale: 2, setBack: 6 },
			{ x: at(190), asset: reeds, scale: 2, setBack: 14 },
			// In front of it, in the sand on its near side.
			{ x: at(40), asset: reeds, scale: 2, setBack: NEAR_SIDE, front: true },
			{ x: at(96), asset: bush, scale: 2, setBack: NEAR_SIDE, front: true },
		)
	}
	return out
}

/** Nothing at all, to draw: the porch's roof is drawn as the Sphinx's own. */
const NOTHING =
	'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E'

/**
 * The porch's roof, solid, to stand on: jumped onto, it's the roof you're
 * on, not a way down through it into the slide under it, which is only
 * ever slid into.
 */
const PORCH_ROOF: PlatformDefinition = (() => {
	// The sand rises a little under it, and a Platform's flat: level with
	// the drawn roof halfway along, and thin enough to stay clear of the
	// slide's Ceiling under it all the way along.
	const near = terrain.groundY(SPHINX - PORCH)
	const far = terrain.groundY(SPHINX)
	const height = PORCH_TOP + Math.round((near - far) / 2)
	const top = near - height
	return {
		x: SPHINX - PORCH,
		width: PORCH,
		height,
		solid: Math.max(4, Math.floor(far - SLIDE - top) - 2),
		art: { asset: NOTHING, width: 1, height: 1, top: 0 },
	}
})()

export const pyramids: CourseDefinition = {
	id: 'pyramids',
	name: 'Pyramids',
	blurb:
		'Across the Nile on its crocodiles, then the sand at Giza and up and over the pyramids: stones, and quicksand to bog you down.',
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
			// The sand on back to the dunes: rippled, further off.
			field: SAND_FAR_RIPPLES,
			// And dunes nearer than the pyramids, a palm here and there.
			nearer: [{ asset: nearDunes, height: 100, fill: 'transparent' }],
		},
		// Rippled sand either side, and the path trodden flat through it.
		ground: [
			[-PATH_BACK - VERGE, 'var(--grass-green)'],
			[-PATH_BACK - VERGE, 'url(#sand-ripples)'],
			[-PATH_BACK, 'var(--dirt-dark-brown)'],
			[-PATH_BACK + 5, 'var(--dirt-brown)'],
			[-PATH_BACK + 5, 'url(#sand-track)'],
			[PATH_FRONT, 'var(--grass-dark-green)'],
			[PATH_FRONT + 2, 'var(--grass-green)'],
			[PATH_FRONT + 2, 'url(#sand-ripples)'],
		],
		groundDefs: SAND_RIPPLES + SAND_TRACK,
		horizonTrees: false,
		pyramids: {
			feet: PYRAMIDS.map((p) => p.feet),
			block: '#d9b779',
			mortar: '#a8834a',
		},
		// The Nile: green-blue, its banks wet sand.
		river: {
			water: '#3f8fae',
			deep: '#245f7a',
			shine: '#bfe8f2',
			bank: '#c99b4a',
			wet: '#8a6a32',
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
	platforms: [PORCH_ROOF],
	river: {
		from: NILE_FROM,
		to: NILE_TO,
		level: NILE_LEVEL,
		depth: NILE_DEPTH,
	},
	// Across the Nile, bouncing from each of its crocodiles to the next, in
	// turn, never touching down: and with that, Ms Crocodile's yours to run
	// as.
	special: {
		goal: 'Bounce across the crocodiles',
		done: (run) => (run.crocodiles ?? 0) >= CROCODILES.length,
		unlocks: MS_CROCODILE.id,
	},
	...layOut(),
	ride: 'camel',
}
