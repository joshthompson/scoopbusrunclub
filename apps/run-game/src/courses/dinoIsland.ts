import type { RunnerName } from '@/data/runners'
import palm from '../assets/scenery/palm.png'
import {
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	RUN_TOP_SPEED,
	START_X,
	VERGE,
} from '../game/constants'
import { type Terrain, withGaps } from '../game/terrain'
import { HATCHLING } from '../runners/bonus'
import { SEA_FAR, SEA_NEAR, seaFar, seaNear } from './kit/cliffScenery'
import {
	DEAD_TREES,
	FLORA,
	FLORA_MORE,
	NEST_EMPTY,
	PARASAUR,
	PTERODACTYL_FAR,
	RAPTOR,
	TRIBUTE_RAPTOR,
	TRICERATOPS,
} from './kit/dinoForest'
import {
	DINO_ASH,
	DINO_CLIFF,
	DINO_FOREST_FLOOR,
	DINO_FOREST_LAND,
	DINO_SAND,
	DINO_TRAIL,
} from './kit/dinoGround'
import {
	DIPLODOCUS,
	DIPLODOCUS_BODY,
	DIPLODOCUS_BODY_HEIGHT,
	DIPLODOCUS_HEAD,
	DIVING_BOARD,
	JUNGLE_HORIZON,
	VOLCANO_HORIZON,
	diplodocusBack,
} from './kit/dinoIslandScenery'
import {
	AMMONITE,
	ANEMONE,
	BARNACLE_ROCK,
	BEACH,
	CORAL,
	FISH_SCHOOL,
	KELP,
	OCTOPUS,
	REEF,
	SEABED_BITS,
	SEAGRASS,
	SHELF_TILES,
	SUNKEN_LOG,
} from './kit/dinoSea'
import { withHat } from './kit/hats'
import { ropeBridgeArt } from './kit/machuPicchuScenery'
import { seeded } from './kit/seeded'
import type {
	Boost,
	Cave,
	CourseDefinition,
	Herd,
	Obstacle,
	PlatformDefinition,
	Scenery,
} from './types'

/**
 * Dino Island: through a steaming forest, dinosaurs running with you and
 * pterodactyls overhead, triceratops in the way to bounce off; up the tail
 * of a diplodocus, along its back and onto its head, which it lifts high,
 * and off it into a pond; up an active volcano, across its crater on a
 * rope bridge, lava bubbling under it. As the last of you crosses it, it erupts:
 * the sky burns red, and it's a race down the far side, everything black
 * against it, a little yellow raptor running for its life alongside, to a
 * cliff, a diving board, and a dive into the sea. Then a swim, the bus
 * coming after on a turbine, past octopuses and coral, round jellyfish,
 * down under a shelf of rock and through, and up onto the beach to the
 * finish.
 */

const CHEERERS: RunnerName[] = [
	'august',
	'lyra',
	'rick',
	'eline',
	'keith',
	'anna',
	'josh',
]

const DISTANCE_M = 5000
const FINISH = START_X + DISTANCE_M * PX_PER_M

// --- Along the course, in order -------------------------------------------------

/** The sea: its surface, and the seabed under it. */
const SEABED = GROUND_Y - 30
const SURFACE = SEABED - 990
/** The cliff top, at the bottom of the volcano, high over the sea. */
const CLIFF_Y = SURFACE - 210
/** The forest floor, where it starts. */
const Y0 = SURFACE - 210 - 360 + 600 + 150
/** The diplodocus: its tail's tip, and its shoulders, where its neck goes up. */
const DIPLO = 4300
const SHOULDER = DIPLO + DIPLODOCUS.shoulder.x
/** Where its tail's up off the forest floor, and there's only its back to run on. */
const ON_DIPLO = DIPLO + 40
/** Its head, the lift: as wide as it, from its shoulders on out; and how far it lifts. */
const HEAD_WIDTH = DIPLODOCUS_HEAD.width
const HEAD_LIFT = 150
const HEAD_REACH = 110
/** The pond under its head, to jump down into: shallow, to wade out of. */
const POND = {
	from: SHOULDER + HEAD_WIDTH + 40,
	to: SHOULDER + HEAD_WIDTH + 560,
}
const POND_DEPTH = 22
const POND_BANK = 90
/** Past the pond, gently up to the volcano's foot. */
const FOOTHILLS = { from: POND.to + 300, to: 8200 }
const RIM_Y = CLIFF_Y - 360
const FOOT_Y = RIM_Y + 600
/** Up the volcano to its rim, and its crater. */
const VOLCANO = { from: 8200, to: 11100 }
const CRATER = { from: 11100, to: 11460 }
/**
 * Level at the rim for this far before the crater: whoever steps off it onto
 * the bridge, however fast, steps off level with the bridge, not a pixel or
 * two under it (the climb's steepest at its top), to pass under it and fall.
 */
const RIM_LIP = 60
/** Down its far side, steep and then easing out into the forest at its foot. */
const DESCENT = { from: CRATER.to, to: 14200 }
/** The cliff's edge, a diving board out over it. */
const CLIFF = 15200
/**
 * Down the volcano's far side, blown, everything black against the
 * burning sky: where the path's up on the skyline, everyone on it against
 * the sky, the camera keeping them low on the screen (see `skyline`). From
 * the crater's far rim, a ridge down its side, right to the cliff's edge,
 * so there's no step up or down onto it.
 */
const SKYLINE = { from: CRATER.to, to: CLIFF }
/** The shelf of rock out over the seabed, to swim down under. */
const SHELF = { from: 16500, to: 17300 }
const TUNNEL = 120
/**
 * After the shelf, open water again, a long way, the seabed rising up a
 * reef towards the shore from `rise`; and the shore, up out of the sea,
 * right at the finish line, onto the beach.
 */
const SHORE = { rise: 18600, from: 19600, to: FINISH - 100 }
/** How far under the surface the reef's risen to, at the foot of the shore. */
const REEF_TOP = 170
const BEACH_Y = SURFACE - 24

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const within = (x: number, span: { from: number; to: number }) =>
	x >= span.from && x < span.to

/** The forest floor's own ups and downs, gentle, nothing near the start. */
const rolling = (x: number) =>
	Math.round(
		(10 * Math.sin(x / 210) + 6 * Math.sin(x / 83 + 1.1)) *
			ease((x - START_X - 300) / 400),
	)

/** The seabed: down off the cliff, a reef of ups and downs, and up the shore. */
function seabed(x: number) {
	const reef = 26 * Math.sin(x / 260) + 14 * Math.sin(x / 97 + 0.4)
	if (x < SHORE.rise) {
		// Down from the cliff's foot, deeper out in the middle.
		const deep = lerp(SEABED - 120, SEABED, ease((x - CLIFF) / 900))
		return Math.round(Math.min(SEABED, deep + reef))
	}
	// Up the reef towards the shore.
	if (x < SHORE.from)
		return Math.round(
			Math.min(
				SEABED,
				lerp(
					SEABED,
					SURFACE + REEF_TOP,
					ease((x - SHORE.rise) / (SHORE.from - SHORE.rise)),
				) +
					reef * 0.6,
			),
		)
	return Math.round(
		lerp(
			SURFACE + REEF_TOP,
			BEACH_Y,
			ease((x - SHORE.from) / (SHORE.to - SHORE.from)),
		),
	)
}

function groundY(x: number): number {
	if (x < DIPLO) return Y0 + rolling(x)
	// Up its tail and along its back.
	if (x < SHOULDER) return Y0 + rolling(DIPLO) - diplodocusBack(x - DIPLO)
	// The pond: the path wading on down into it off its shore, gently,
	// and back up out of it the far side.
	if (x < POND.from) return Y0 + rolling(DIPLO)
	if (x < POND.to) {
		const into = Math.min(x - POND.from, POND.to - x)
		return Y0 + rolling(DIPLO) + Math.round(POND_DEPTH * ease(into / POND_BANK))
	}
	if (x < FOOTHILLS.to) {
		const base = Y0 + rolling(DIPLO)
		return Math.round(
			lerp(
				base,
				FOOT_Y,
				ease((x - FOOTHILLS.from) / (FOOTHILLS.to - FOOTHILLS.from)),
			) +
				rolling(x) * 0.5,
		)
	}
	// Up the volcano, steeper and steeper.
	if (x < VOLCANO.to - RIM_LIP) {
		const t = (x - VOLCANO.from) / (VOLCANO.to - RIM_LIP - VOLCANO.from)
		return Math.round(lerp(FOOT_Y, RIM_Y, t ** 1.3))
	}
	if (x < CRATER.to) return RIM_Y
	// Down its far side: steep, and easing out.
	if (x < DESCENT.to) {
		const t = (x - DESCENT.from) / (DESCENT.to - DESCENT.from)
		return Math.round(lerp(RIM_Y, CLIFF_Y, 1 - (1 - t) ** 1.6))
	}
	if (x < CLIFF) return CLIFF_Y + Math.round(rolling(x) * 0.4)
	if (x < SHORE.to) return seabed(x)
	return BEACH_Y
}

/** How steep it really is at `x`. */
const steepness = (x: number) => (groundY(x + 4) - groundY(x - 4)) / 8

const terrain: Terrain = withGaps(
	{
		length: FINISH - START_X,
		finishX: FINISH,
		groundY,
		// Up the diplodocus's tail, and the volcano: drawn steep, but not as
		// hard going as it looks.
		slope: (x) =>
			x >= DIPLO && x < SHOULDER
				? steepness(x) * 0.5
				: within(x, VOLCANO)
					? steepness(x) * 0.7
					: steepness(x),
		tilt: steepness,
	},
	// The crater, lava down it.
	[CRATER],
	// The diplodocus's shoulders, a step down off them; the cliff, a drop.
	[SHOULDER, CLIFF],
)

// --- Platforms --------------------------------------------------------------------------

/** The diplodocus's head: at its shoulders' height, lifting as someone's on it. */
const HEAD: PlatformDefinition = {
	x: SHOULDER,
	width: HEAD_WIDTH,
	height: groundY(SHOULDER) - groundY(SHOULDER - 1),
	art: DIPLODOCUS_HEAD,
	// Up and forward, as a neck lifts a head.
	move: { x: HEAD_REACH, y: HEAD_LIFT, ticks: 76, waits: 4 },
}
/** The rope bridge over the crater. */
const BRIDGE: PlatformDefinition = {
	x: CRATER.from,
	width: CRATER.to - CRATER.from,
	height: 0,
	solid: 6,
	art: ropeBridgeArt(CRATER.to - CRATER.from),
	rope: { give: 14 },
}
/** The diving board, out over the cliff's edge. */
const BOARD: PlatformDefinition = {
	x: CLIFF - 20,
	width: DIVING_BOARD.width,
	height: 8,
	art: DIVING_BOARD,
}
const PLATFORMS = [HEAD, BRIDGE, BOARD]

// --- The rock under the sea: a Cave ------------------------------------------------

const shelf: Cave = {
	from: SHELF.from,
	to: SHELF.to,
	ceiling: (x) => {
		if (!within(x, SHELF)) return undefined
		// Round at its ends, the tunnel through it low.
		const inTo = Math.min(x - SHELF.from, SHELF.to - x)
		return (
			Math.round(lerp(SURFACE + 30, seabed(x) - TUNNEL, ease(inTo / 140)) / 4) *
			4
		)
	},
	surface: (x) => (within(x, SHELF) ? SURFACE - 40 : undefined),
	foot: () => undefined,
}

// --- What's in the way, and what's to be had --------------------------------------

/**
 * The nest, on the path short of the diplodocus, its egg in it: to kick on
 * up its tail and off its shoulders, to hatch (see `egg`).
 */
const NEST_X = DIPLO - 650

/** Where the snorkel mask lies, on the seabed. */
const SNORKEL_X = 16120

const cheer = (x: number, member: RunnerName): Boost => ({
	kind: 'cheer',
	x,
	member,
})

function layOut(): Pick<CourseDefinition, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(6500)
	const obstacles: Obstacle[] = [
		// The forest: rocks, branches, and triceratops wandering to and fro.
		{ kind: 'rock', x: 900 },
		{ kind: 'branch', x: 1250 },
		{ kind: 'spider', x: 1700, range: [1550, 1950] },
		{ kind: 'rock', x: 2250 },
		{ kind: 'spider', x: 2600, range: [2450, 2800] },
		{ kind: 'branch', x: 3300 },
		// Clear of the nest, so the egg's first kicks aren't a fight.
		{ kind: 'spider', x: 3100, range: [3000, 3330] },
		// The foothills.
		{ kind: 'rock', x: POND.to + 400 },
		{ kind: 'mud', x: 6800, width: 90 },
		{ kind: 'rock', x: 7300 },
		{ kind: 'rock', x: 7700 },
		// Up the volcano: lava rocks.
		{ kind: 'rock', x: 8800 },
		{ kind: 'rock', x: 9600 },
		{ kind: 'rock', x: 10400 },
		// Down it, and through the forest at its foot.
		{ kind: 'rock', x: 12300 },
		{ kind: 'rock', x: 13100 },
		{ kind: 'rock', x: 13900 },
		{ kind: 'rock', x: 14400 },
		// The sea: jellyfish.
		// A shark, lurking deep in the open water past the shelf: after
		// whoever's nearest, as they swim by, once.
		{ kind: 'shark', x: 18150, height: 360 },
		// Drifting up and down all through its depths.
		...[15800, 16250, 17650, 18050, 18450, 18900, 19300].map((x): Obstacle => {
			const low = 120 + Math.round(random() * 560)
			return {
				kind: 'jellyfish',
				x,
				low,
				high: low + 160 + Math.round(random() * 160),
			}
		}),
	]
	const boosts: Boost[] = [
		cheer(START_X + 500, CHEERERS[0]),
		cheer(1600, CHEERERS[5]),
		{ kind: 'fika', x: 1100, height: 26, item: 'fossilPops' },
		{ kind: 'fika', x: 2000, height: 95, item: 'coffee' },
		cheer(2500, CHEERERS[1]),
		{ kind: 'fika', x: 3200, height: 26, item: 'fossilPops' },
		// Along the diplodocus's back.
		{ kind: 'fika', x: DIPLO + 820, height: 26, item: 'kanelbulle' },
		cheer(POND.to + 200, CHEERERS[2]),
		{ kind: 'fika', x: 7000, height: 95, item: 'fossilPops' },
		// Up the volcano.
		{ kind: 'fika', x: 9200, height: 26, item: 'lavaCake' },
		cheer(8600, CHEERERS[4]),
		cheer(10000, CHEERERS[3]),
		{ kind: 'fika', x: 10800, height: 26, item: 'lavaCake' },
		// Over the crater, off the rope bridge.
		{
			kind: 'fika',
			x: (CRATER.from + CRATER.to) / 2,
			height: 95,
			item: 'coffee',
		},
		// Down it.
		{ kind: 'fika', x: 12700, height: 26, item: 'lavaCake' },
		// Under the sea: up in it, and deep, down the tunnel.
		{ kind: 'fika', x: 16050, height: 700, item: 'coffee' },
		{ kind: 'fika', x: SHELF.from + 450, height: 40, item: 'kanelbulle' },
		{ kind: 'fika', x: 18250, height: 520, item: 'coconut' },
		{ kind: 'fika', x: 19200, height: 300, item: 'coconut' },
		{ kind: 'fika', x: SHORE.to - 60, height: 26, item: 'coconut' },
	]
	// Nothing close up in front of the path where there's something in
	// the way, or to be had: it'd hide it.
	const clearOf = [
		...obstacles.flatMap((o) =>
			o.kind === 'spider' ? [o.range[0], o.x, o.range[1]] : [o.x],
		),
		...boosts.map((b) => b.x),
		NEST_X,
	]
	return { obstacles, boosts, scenery: scenery(random, clearOf) }
}

/** How far back from the path the pond's far bank is: where what's round it stands. */
const POND_BACK = VERGE + 44
/** What grows close up, in front of the path: big, drawn three or four times its size. */
const FOREGROUND = [
	{ asset: FLORA[2], scale: 4 },
	{ asset: FLORA[0], scale: 3 },
	{ asset: FLORA[3], scale: 4 },
	{ asset: FLORA[1], scale: 3 },
]
/** What grows on the skyline, through the forest at the volcano's foot: the course's own, drawn to stand right on it. */
const SKYLINE_FOREST = [FLORA[1], FLORA[0], FLORA[2], FLORA[1], FLORA[3]]
/** How far into the ground what's up on the skyline is sunk. */
const SKYLINE_SINK = 6

/** How far from anything in the way, or to be had, what's close up in front of the path stands. */
const FOREGROUND_CLEAR = 160

function scenery(random: () => number, clearOf: number[]): Scenery[] {
	const pieces: Scenery[] = []
	const art = (x: number, asset: string, setBack = 4): Scenery => ({
		x: Math.round(x),
		asset,
		scale: 2,
		setBack,
	})
	// The forest, thick with tree ferns, cycads, ferns and horsetails.
	const [monkeyPuzzle, ginkgo, horsetails, coneCycad, sapling, fallenLog] =
		FLORA_MORE
	const forest = [
		FLORA[0],
		FLORA[1],
		FLORA[2],
		monkeyPuzzle,
		FLORA[3],
		coneCycad,
		FLORA[1],
		ginkgo,
		sapling,
		horsetails,
		FLORA[0],
		FLORA[2],
	]
	let n = 0
	// Further back, a darker row of them, thick: the forest going on back.
	for (let x = -800; x < VOLCANO.from + 400; x += 40 + random() * 70) {
		if (x > DIPLO - 200 && x < POND.to + 200) continue
		pieces.push({
			...art(x, [FLORA[1], monkeyPuzzle, FLORA[0], ginkgo][n++ % 4]),
			setBack: Math.round(46 + random() * 24),
			filter: 'brightness(0.7) saturate(0.85)',
		})
	}
	for (let x = -800; x < VOLCANO.from + 700; x += 34 + random() * 80) {
		// None up on the diplodocus, nor in the pond.
		if (x > DIPLO - 40 && x < POND.to + 40) continue
		pieces.push(art(x, forest[n++ % forest.length]))
	}
	// Round the pond's far side, behind its mud bank: trees, and bushes
	// along the bank in front of them.
	n = 0
	for (let x = POND.from - 30; x < POND.to + 60; x += 70 + random() * 60) {
		pieces.push(
			art(
				x,
				[FLORA[1], ginkgo, FLORA[0], monkeyPuzzle][n++ % 4],
				POND_BACK + 10,
			),
		)
	}
	for (let x = POND.from - 10; x < POND.to + 20; x += 34 + random() * 30)
		pieces.push(art(x, FLORA[n++ % 2 ? 2 : 3], POND_BACK - 2))
	// Now and then a mossy log fallen by the path, in the forest.
	for (const x of [900, 2150, 3400, 6600, 7900])
		pieces.push(art(x, fallenLog, 2))
	// Close up, in front of everyone on the path, now and then: a big fern
	// or a cycad, going by.
	n = 0
	for (let x = START_X + 600; x < VOLCANO.from; x += 520 + random() * 520) {
		if (x > DIPLO - 300 && x < POND.to + 300) continue
		if (clearOf.some((at) => Math.abs(at - x) < FOREGROUND_CLEAR)) continue
		const asset = FOREGROUND[n++ % FOREGROUND.length]
		pieces.push({
			x: Math.round(x),
			asset: asset.asset,
			scale: asset.scale,
			setBack: -(PATH_BACK + PATH_FRONT + 34),
			front: true,
		})
	}
	// Burnt bare up the volcano and down its far side, and the forest again at its foot.
	n = 0
	for (let x = VOLCANO.from + 700; x < CLIFF - 100; x += 140 + random() * 220) {
		if (x > VOLCANO.to - 500 && x < DESCENT.from + 300) continue
		const burnt = x < DESCENT.to - 400
		const ridge = within(x, SKYLINE)
		// Up on the skyline, only what's drawn for the course, its foot
		// right on the ground (the tree pictures stand off it, on a verge).
		const grown = ridge ? SKYLINE_FOREST : forest
		const piece = burnt
			? art(x, DEAD_TREES[n++ % DEAD_TREES.length])
			: art(x, grown[n++ % grown.length])
		// Up on the skyline, stood right on the line everyone runs along, as
		// there's nothing behind it to stand on, sunk into it a little:
		// black against the sky.
		pieces.push(
			ridge
				? { ...piece, setBack: -PATH_BACK - SKYLINE_SINK, onFloor: true }
				: piece,
		)
	}
	// The nest, on the path, its egg kicked out of it (see `egg`).
	pieces.push({ ...art(NEST_X, NEST_EMPTY), setBack: -PATH_BACK - 3 })
	// Under the sea: coral, kelp swaying, octopuses and fish, on the seabed.
	n = 0
	for (let x = CLIFF + 260; x < SHORE.from; x += 90 + random() * 150) {
		if (within(x, { from: SHELF.from - 60, to: SHELF.to + 60 })) continue
		const which = n++ % 6
		const at = { x: Math.round(x), scale: 2, setBack: 2, onFloor: true }
		if (which === 1)
			pieces.push({
				...at,
				asset: KELP.asset,
				strip: { count: KELP.count, from: n % 2 },
				frameTicks: 30,
			})
		else if (which === 3)
			pieces.push({
				...at,
				asset: OCTOPUS.asset,
				strip: { count: OCTOPUS.count },
				frameTicks: 24,
			})
		else if (which === 5)
			pieces.push({
				...at,
				asset: FISH_SCHOOL.asset,
				strip: { count: FISH_SCHOOL.count, from: n % 2 },
				frameTicks: 20,
			})
		else if (which === 4)
			pieces.push(
				n % 3
					? { ...at, asset: SEABED_BITS[n % SEABED_BITS.length] }
					: { ...at, asset: n % 2 ? ANEMONE : BARNACLE_ROCK },
			)
		else if (which === 2 && n % 2)
			pieces.push({
				...at,
				asset: SEAGRASS.asset,
				strip: { count: SEAGRASS.count, from: n % 2 },
				frameTicks: 34,
			})
		else pieces.push({ ...at, asset: CORAL[n % CORAL.length] })
	}
	// Landmarks on the seabed: a fossil ammonite, deep in the first open
	// water; and a sunken log, where the shark lurks.
	pieces.push({
		x: 15900,
		asset: AMMONITE,
		scale: 2,
		setBack: 2,
		onFloor: true,
	})
	pieces.push({
		x: 18300,
		asset: SUNKEN_LOG,
		scale: 2,
		setBack: 2,
		onFloor: true,
	})
	// Up the reef towards the shore: coral, thicker and thicker.
	n = 0
	for (let x = SHORE.rise + 200; x < SHORE.from + 200; x += 110 + random() * 90)
		pieces.push({
			x: Math.round(x),
			asset: REEF[n++ % REEF.length],
			scale: 2,
			setBack: 2,
			onFloor: true,
		})
	// The beach at the finish: tiki torches either side of the line, a
	// surfboard and coconuts by it, a beach hut, and palms.
	for (const [x, asset, setBack] of [
		[FINISH - 70, BEACH[0], 6],
		[FINISH + 70, BEACH[0], 6],
		[FINISH - 160, BEACH[1], 10],
		[FINISH + 150, BEACH[3], 8],
		[FINISH + 330, BEACH[2], 24],
	] as const)
		pieces.push({ x, asset, scale: 2, setBack })
	for (let x = SHORE.to + 100; x < FINISH + 900; x += 160 + random() * 200)
		if (Math.abs(x - (FINISH + 330)) > 120)
			pieces.push({ x: Math.round(x), asset: palm, setBack: 4 })
	return pieces
}

// --- Herds, running with you -------------------------------------------------------

const herd = (
	from: number,
	speed: number,
	look: { frames: string[]; width: number; height: number },
	count: number,
	over = false,
): Herd => ({
	from,
	speed,
	over,
	members: Array.from({ length: count }, (_, i) => ({
		...look,
		behind: i * (look.width + 30),
		down: over ? 0 : 18 + ((i * 17) % 26),
		stride: 10,
	})),
})

const HERDS: Herd[] = [
	herd(1100, RUN_TOP_SPEED + 2.2, RAPTOR, 3),
	herd(2600, RUN_TOP_SPEED + 1.6, PARASAUR, 2),
	herd(6200, RUN_TOP_SPEED + 2.4, RAPTOR, 4),
	// A little yellow raptor, running for its life down the volcano with
	// you, as the sky burns: a tribute.
	herd(DESCENT.from + 300, RUN_TOP_SPEED + 0.6, TRIBUTE_RAPTOR, 1, true),
	// And everything else fleeing it too, along the skyline, black against
	// the burning sky: packs of raptors, and parasaurolophuses loping by.
	herd(DESCENT.from + 700, RUN_TOP_SPEED + 2.6, RAPTOR, 4, true),
	herd(DESCENT.from + 1300, RUN_TOP_SPEED + 1.8, PARASAUR, 3, true),
	herd(DESCENT.from + 2100, RUN_TOP_SPEED + 3, RAPTOR, 5, true),
]

// --- Its ground, stretch by stretch ---------------------------------------------------------

type Floor =
	| 'forest'
	| 'dino'
	| 'ash'
	| 'rock'
	| 'skyline'
	| 'skylineForest'
	| 'skylineCliff'
	| 'cliff'
	| 'sand'
/**
 * Each floor's colours: behind the path, the path's back edge, the path,
 * its front edge, and under it; from the line everyone runs along on
 * down, the path again, but up on the skyline; and the land further back,
 * for what's set back from the path to stand on.
 */
type Colours = [string, string, string, string, string, string, string]
const FOREST: Colours = [
	'#4f7f34',
	'#735330',
	'#9a7448',
	'#3d6a2a',
	'#4f7f34',
	'#9a7448',
	'#3f6e2c',
]
const ROCK: Colours = [
	'#3e3532',
	'#2a2220',
	'#55473f',
	'#2a2220',
	'#2e2624',
	'#55473f',
	'#352d2a',
]
/**
 * A colour, clear: nothing drawn, but blending into the next as only its
 * opacity, not through a dark half-clear, as plain `transparent` does.
 */
const clear = (colour: string) => {
	const n = Number.parseInt(colour.slice(1), 16)
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`
}
const FLOOR_COLOURS: Record<Floor, Colours> = {
	forest: [
		'#4f7f34',
		'#735330',
		'#9a7448',
		'#3d6a2a',
		'#4f7f34',
		'#9a7448',
		'#3f6e2c',
	],
	// Up on the diplodocus: no path at all, just its back, its picture's
	// top the line everyone runs along (see `diplodocus`).
	dino: FOREST.map(clear) as Colours,
	ash: [
		'#6a6058',
		'#4a3f38',
		'#7a6c60',
		'#3e3530',
		'#4a403a',
		'#7a6c60',
		'#5e5550',
	],
	rock: [
		'#3e3532',
		'#2a2220',
		'#55473f',
		'#2a2220',
		'#2e2624',
		'#55473f',
		'#352d2a',
	],
	// Down the volcano, black against the burning sky: no path, nothing
	// behind it, the ground's top the line everyone runs along, so they're
	// up on the skyline, against the sky (see `SKYLINE`).
	skyline: [
		clear(ROCK[0]),
		clear(ROCK[1]),
		clear(ROCK[2]),
		'#2a2220',
		'#2e2624',
		'#2e2624',
		clear(ROCK[6]),
	],
	// And on, the same, through the forest at its foot, and along the cliff top.
	skylineForest: [
		clear(FOREST[0]),
		clear(FOREST[1]),
		clear(FOREST[2]),
		'#3d6a2a',
		'#4f7f34',
		'#4f7f34',
		clear(FOREST[6]),
	],
	skylineCliff: [
		clear(FOREST[0]),
		clear(FOREST[1]),
		clear(FOREST[2]),
		'#6e6a5e',
		'#8a8577',
		'#4f7f34',
		clear(FOREST[6]),
	],
	cliff: [
		'#4f7f34',
		'#735330',
		'#9a7448',
		'#6e6a5e',
		'#8a8577',
		'#9a7448',
		'#3f6e2c',
	],
	sand: [
		'#d9c690',
		'#c4ae74',
		'#e3d29c',
		'#c9b47c',
		'#b89c62',
		'#e3d29c',
		clear('#3f6e2c'),
	],
}
/** How far back the land behind the path goes, for what's set back from it to stand on. */
const LAND = 100
/** How far down its top is, `x` along: ragged with undergrowth, in 2 px steps. */
const landEdge = (x: number) =>
	Math.round(
		(6 * Math.abs(Math.sin(x / 29)) +
			5 * Math.abs(Math.sin(x / 11 + 2)) +
			10 * Math.abs(Math.sin(x / 97))) /
			2,
	) * 2

/** A ground layer's `edge` that's only there where `where` says: pushed off down out of sight anywhere else. */
const only =
	(where: (x: number) => boolean, edge?: (x: number) => number) =>
	(x: number) =>
		where(x) ? (edge?.(x) ?? 0) : 99999
/** Where each texture's laid: the forest, its trail, the volcano, the cliff, the sea. */
const offDiplodocus = (x: number) => x < ON_DIPLO || x > SHOULDER + 2
const forestLand = (x: number) => offDiplodocus(x) && x < VOLCANO.from + 500
const trail = (x: number) => offDiplodocus(x) && x < SKYLINE.from
const forestFloor = (x: number) =>
	(offDiplodocus(x) && x < VOLCANO.from + 500) ||
	(x > DESCENT.to - 200 && x < CLIFF - 300)
const ash = (x: number) => x >= VOLCANO.from + 500 && x <= DESCENT.to - 200
const cliffFace = (x: number) => x >= CLIFF - 300 && x < CLIFF
const sand = (x: number) => x >= CLIFF + 4

/** Where the ground changes, along: blended from one to the next. */
const FLOORS: [x: number, floor: Floor][] = [
	[-2000, 'forest'],
	[ON_DIPLO - 1, 'forest'],
	[ON_DIPLO, 'dino'],
	// Changing back just past its shoulders, down on the forest floor,
	// where the blend from one to the next can't show over its back.
	[SHOULDER + 1, 'dino'],
	[SHOULDER + 2, 'forest'],
	[FOOTHILLS.to - 600, 'forest'],
	[VOLCANO.from + 500, 'ash'],
	[VOLCANO.from + 1600, 'rock'],
	[SKYLINE.from - 1, 'rock'],
	[SKYLINE.from, 'skyline'],
	[DESCENT.to - 600, 'skyline'],
	[DESCENT.to - 200, 'skylineForest'],
	[CLIFF - 500, 'skylineForest'],
	[CLIFF - 300, 'skylineCliff'],
	[CLIFF + 2, 'skylineCliff'],
	[CLIFF + 4, 'sand'],
]
const strip = (id: string, layer: number) => ({
	id,
	blend: true,
	stops: FLOORS.map(([x, floor]): [number, string] => [
		x,
		FLOOR_COLOURS[floor][layer],
	]),
})

// --- The course -------------------------------------------------------------------------

export const dinoIsland: CourseDefinition = {
	id: 'dino-island',
	name: 'Dino Island',
	blurb:
		'Through the dinosaurs’ forest, up a diplodocus and over a volcano, before it blows: then dive off the cliff and swim for the shore.',
	terrain,
	platforms: PLATFORMS,
	cave: shelf,
	river: {
		from: POND.from,
		to: POND.to,
		level: Y0 + rolling(DIPLO) + 4,
		depth: POND_DEPTH - 4,
		pond: true,
	},
	deepWater: { from: CLIFF, to: SHORE.to, surface: SURFACE, busPace: 0.78 },
	flyer: 'pterodactyl',
	flyovers: [
		{ x: 1900, count: 2 },
		{ x: 6400, count: 2 },
		{ x: 13200, count: 2 },
	],
	// Its tune, a volcano's version as it blows, and the sea's under it.
	// Kept low on the screen, up on the skyline, till just short of the
	// cliff: there, looking down at the sea, to dive into.
	skyline: [{ from: SKYLINE.from, to: CLIFF - 260 }],
	// 3 km would be up on the skyline, with nothing behind it to stand on:
	// on the crater's near rim instead, just short of it.
	kmSignsAt: { 3: CRATER.from - 120 },
	tunes: [
		{ from: CRATER.to + 300, tune: 'dino-island:volcano' },
		{ from: CLIFF + 100, tune: 'dino-island:sea' },
		{ from: SHORE.to, tune: 'dino-island' },
	],
	runDirectors: ['august', 'lyra'],
	cheerers: CHEERERS,
	lookAhead: 360,
	lookDown: 360,
	busHillPull: 0.9,
	look: {
		palette: {
			'--sky-blue-top': '#9fd4c8',
			'--sky-blue-bottom': '#e6f2c8',
			'--grass-green': '#4f7f34',
			'--grass-dark-green': '#3d6a2a',
			'--grass-darker-green': '#2a4a1d',
			'--dirt-brown': '#9a7448',
			'--dirt-dark-brown': '#735330',
			'--dirt-darker-brown': '#4a3420',
		},
		// Each stretch's own ground: the forest's, the volcano's black rock
		// and ash, the cliff's face, and the seabed's sand.
		strips: [
			strip('d-land', 6),
			strip('d-verge', 0),
			strip('d-back', 1),
			strip('d-path', 2),
			strip('d-top', 5),
			strip('d-edge', 3),
			strip('d-under', 4),
		],
		ground: [
			// The land further back, the forest floor, its top ragged with
			// undergrowth: what's set back from the path stands on it.
			[-PATH_BACK - LAND, 'url(#d-land)', false, landEdge],
			[
				-PATH_BACK - LAND,
				'url(#dino-forest-land)',
				false,
				only(forestLand, landEdge),
			],
			[-PATH_BACK - VERGE, 'url(#d-verge)'],
			[-PATH_BACK, 'url(#d-back)'],
			[-PATH_BACK + 4, 'url(#d-path)'],
			[0, 'url(#d-top)'],
			// Its trail, grit and footprints in it, wherever there's a path.
			[-PATH_BACK + 4, 'url(#dino-trail)', false, only(trail)],
			[PATH_FRONT, 'url(#d-edge)'],
			[PATH_FRONT + 4, 'url(#d-under)'],
			// And on down under it, each stretch its own: the forest floor,
			// the volcano's ash, the cliff's face, and the sea's sand.
			[PATH_FRONT + 4, 'url(#dino-forest-floor)', false, only(forestFloor)],
			[PATH_FRONT + 4, 'url(#dino-ash)', false, only(ash)],
			[PATH_FRONT + 4, 'url(#dino-cliff)', false, only(cliffFace)],
			[-PATH_BACK, 'url(#dino-sand)', false, only(sand)],
		],
		groundDefs:
			DINO_FOREST_FLOOR +
			DINO_FOREST_LAND +
			DINO_TRAIL +
			DINO_ASH +
			DINO_CLIFF +
			DINO_SAND,
		// A prehistoric jungle, then the volcano, smoking, and out at sea.
		horizon: JUNGLE_HORIZON,
		voyage: [
			{ from: FOOTHILLS.from + 600, horizon: VOLCANO_HORIZON },
			{
				from: CLIFF - 400,
				horizon: {
					far: seaFar,
					near: seaNear,
					fill: SEA_FAR,
					// The sea on down to the cliff, not a field under it.
					nearer: [{ asset: seaNear, height: 60, fill: SEA_NEAR }],
				},
			},
		],
		horizonTrees: false,
		// Pterodactyls far off, crossing the sky.
		skyFlyers: [
			{
				...PTERODACTYL_FAR,
				scale: 2,
				count: 3,
				seconds: 26,
				bob: 6,
				band: [40, 140],
			},
		],
		horizonRise: 110,
		spider: TRICERATOPS,
		herds: HERDS,
		diplodocus: {
			head: 0,
			// Its feet on the forest floor, drawn as the path is either side.
			floor: {
				// From a little short of where its tail's off the forest floor,
				// over the join.
				from: ON_DIPLO - 8,
				// A little past its shoulders, over the Ground's step down there.
				to: SHOULDER + 8,
				y: Y0 + rolling(DIPLO),
				layers: [
					[-PATH_BACK - LAND, FLOOR_COLOURS.forest[6], landEdge],
					[-PATH_BACK - VERGE, FLOOR_COLOURS.forest[0]],
					[-PATH_BACK, FLOOR_COLOURS.forest[1]],
					[-PATH_BACK + 4, FLOOR_COLOURS.forest[2]],
					[0, FLOOR_COLOURS.forest[5]],
					[PATH_FRONT, FLOOR_COLOURS.forest[3]],
					[PATH_FRONT + 4, FLOOR_COLOURS.forest[4]],
				],
			},
			shoulder: {
				x: DIPLO + DIPLODOCUS.shoulder.x,
				y: Y0 + rolling(DIPLO) - DIPLODOCUS.shoulder.y,
			},
			body: {
				asset: DIPLODOCUS_BODY,
				x: DIPLO,
				y: Y0 + rolling(DIPLO) - DIPLODOCUS.height,
				width: DIPLODOCUS.width,
				height: DIPLODOCUS_BODY_HEIGHT,
			},
		},
		// Up on the diplodocus, only its back's under everyone: nothing else under it.
		ridge: (x) =>
			x >= ON_DIPLO && x < SHOULDER ? groundY(x) + PATH_FRONT + 4 : undefined,
		// The pond under the diplodocus's head: green and still.
		river: {
			water: '#4f9a8a',
			deep: '#2e6a5e',
			shine: '#c8eedd',
			// Its mud the path's own dirt, so the path runs on down into it.
			bank: '#9a7448',
			wet: '#735330',
		},
		// The crater's lava, well down under the bridge, churning.
		lava: [{ from: CRATER.from, to: CRATER.to, level: RIM_Y + 125 }],
		// The crater's walls: dark rock, cracked, in shadow on its near side.
		pit: { wall: '#3a2a24', shade: '#241a16', seams: '#4e3a30' },
		// And down them, glowing red near its lava.
		gap: 'linear-gradient(to bottom, #2a2220, #3a2420 90px, #8a2a12 150px)',
		eruption: {
			at: CRATER.to,
			crater: { x: (CRATER.from + CRATER.to) / 2, y: RIM_Y },
			silhouette: { from: CRATER.to + 300, to: CLIFF + 40 },
			clear: CLIFF + 900,
		},
		deepWater: {
			water: '#2f8fb8',
			deep: '#123f66',
			light: 'rgba(214, 246, 255, 0.3)',
			surface: '#bfeaff',
		},
		busJets: { from: CLIFF + 40, to: SHORE.to - 100, turbine: true },
		cave: {
			// The shelf of rock under the sea: basalt, barnacles and weed on
			// it. Under it, no back wall, but the open water on through,
			// a deep shadow along its underside: a way through, plain to see.
			tiles: { rock: SHELF_TILES.rock },
			rock: '#5d5a52',
			seam: '#45423c',
			edge: 'rgba(4, 12, 20, 0.6)',
			wall: 'rgba(6, 18, 28, 0)',
			grass: '#6b6a5e',
		},
		// Its course select preview: the forest, a triceratops in it.
		previewFrom: START_X + 1300,
	},
	// An egg, in its nest on the path: kicked on up the diplodocus's tail,
	// off its head, across the pond and on up the volcano, cracking more
	// all the way; halfway up, it cracks open, and runs on after you.
	egg: {
		x: NEST_X,
		hatchFrom: (VOLCANO.from + VOLCANO.to) / 2,
		follower: 'hatchling',
	},
	// Its special goal: the hatchling brought home with you, over the line.
	special: {
		goal: 'Hatch the egg and bring it home',
		done: (run) => !!run.followerHome,
		unlocks: HATCHLING.id,
	},
	// A snorkel mask, lost down on the seabed, deep between two jellyfish:
	// only got by diving right down for it.
	...withHat(layOut(), 'snorkel', () => ({ x: SNORKEL_X, height: 14 }), 0),
}

/** Where things are, for testing and placing art. */
export const DINO = {
	Y0,
	DIPLO,
	SHOULDER,
	POND,
	VOLCANO,
	CRATER,
	DESCENT,
	CLIFF,
	SURFACE,
	SEABED,
	SHELF,
	SHORE,
	PATH_BACK,
}
