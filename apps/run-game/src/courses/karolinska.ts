import type { RunnerName } from '@/data/runners'
import {
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	START_X,
	VERGE,
} from '../game/constants'
import { type Terrain, withGaps } from '../game/terrain'
import {
	ALVEOLUS,
	ARTERY_TILES,
	CLOT,
	CRUMB,
	GIANT_FACE,
	GIANT_LAB,
	HEART_TILES,
	LUNG_TILES,
	NOSE_HAIR,
	NOSE_TILES,
	TRACHEA_TILES,
	alveoli,
	bronchus,
	capillaries,
	cilia,
	dustMite,
	floatingCells,
	heartPillar,
	petriDish,
	pipetteTip,
	waterDroplet,
	whiteCell,
} from './kit/bodyScenery'
import { JAW_DROP, LIPS_FRONT } from './kit/giantMouth'
import { withHat } from './kit/hats'
import {
	ENTRANCE as ENTRANCE_ART,
	ESCALATOR_DOWN,
	ESCALATOR_UP,
	GURNEY,
	HOSPITAL_TILES,
	IV_STAND,
	SHRINK_RAY_BACK,
	SHRINK_RAY_FRONT,
	SNEEZER,
	SOLNA_FAR,
	SOLNA_FILL,
	SOLNA_NEAR,
	WET_FLOOR,
	ambulance,
	bench,
	bikeRack,
	birch,
	cafeCounter,
	centrifuge,
	exitSign,
	fireExtinguisher,
	fumeHood,
	karolinskaSign,
	labBench,
	labFridge,
	lampPost,
	noticeBoard,
	operator,
	parkedWheelchair,
	pottedPlant,
	receptionDesk,
	revolvingDoor,
	skeletonModel,
	vendingMachine,
	waitingChairs,
	wardDoor,
	wayfindingSign,
	whiteboard,
} from './kit/karolinskaScenery'
import type {
	Boost,
	Cave,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
	Portal,
	Scenery,
} from './types'

/**
 * Karolinska: in off the street, through the doors of the hospital (the
 * building opening up as you go in), past reception and up the escalator,
 * along a corridor and into a lab. There, a shrink ray: everyone in it,
 * it goes off, and the camera dives in after you, down to the size of a
 * speck on a lab bench. At its edge, the scientist leaning over it opens
 * their mouth, their tongue rolling out over the bench, and you run up it
 * and on into them: down
 * their windpipe, into their lungs, breathing; through their heart, its
 * valves firing you up over it on the beat; and up an artery on a red
 * blood cell, Germs bobbing about all the way, there to be popped. Then
 * back up into their nose, "Ah... Ah... CHOO!", sneezed out, back to your
 * size, and out of the hospital to the finish.
 */

const CHEERERS: RunnerName[] = [
	'anna',
	'keith',
	'eline',
	'rick',
	'lyra',
	'august',
	'josh',
]

const DISTANCE_M = 5000
const FINISH = START_X + DISTANCE_M * PX_PER_M

/** The street, and the ground floor; and the floor up the escalator, where the lab is. */
const G0 = GROUND_Y
const G1 = GROUND_Y - 240

// --- Along the course, in order -------------------------------------------

/** The hospital's way in, and where its vestibule opens up into the atrium. */
const ENTRANCE = 1700
const VESTIBULE = 1880
/** The escalator up, from the ground floor to the next. */
const ESCALATOR = { from: 2900, to: 3400 }
const CORRIDOR = 3400
const LAB = 4600
/** The shrink ray's way in, and the middle of its plate, where everyone's shrunk to. */
const SHRINK_IN = 5300
const PLATE = SHRINK_IN + 40
/**
 * Where it's drawn as the lab bench, shrunk, from: on past the ray, out of
 * sight (see `SHRINK_OUT`), and where everyone comes out on it.
 */
const MICRO_FROM = 6100
const SHRINK_OUT = 6900
/**
 * The bench's edge, and the giant's face over it, leaning in: from its left
 * to where it's cut away, and the inside of them starts, `INSIDE`.
 */
const EDGE = 8100
const INSIDE = 8500
const FACE_LEFT = INSIDE - GIANT_FACE.width
/** The line between its lips, a y; and the floor of its mouth, its tongue, open. */
const LIPS_Y = G1 - 128
const MOUTH_Y = LIPS_Y + JAW_DROP - 12
const FACE_TOP = LIPS_Y - GIANT_FACE.mouth
/** Where its lips are, and where its tongue's tip lies, on the bench. */
const LIPS_X = FACE_LEFT + LIPS_FRONT
const TONGUE_TIP = EDGE - 40
/** Down the windpipe, from the back of the nose to the lungs. */
const TRACHEA = { from: 9300, to: 10100 }
const LUNG_Y = GROUND_Y - 20
const LUNGS = { from: 10100, to: 11900 }
const HEART = { from: 11900, to: 12900 }
/** Up an artery, from the heart back up to the head. */
const ARTERY = { from: 12900, to: 14700 }
const SINUS_Y = G1
/** Into the nose again, where the sneeze is. */
const GROW_IN = 15200
/** Where it's the lab again, full size, from: out of sight of the nose. */
const MACRO_FROM = 16100
/** Where everyone's sneezed out onto the lab's floor. */
const GROW_OUT = 16900
const CORRIDOR_2 = 17500
const ESCALATOR_2 = { from: 18000, to: 18500 }
const EXIT = 19300

/** The heart's ridges, between its chambers: too high to jump, but not to be fired over off a valve. */
const RIDGE = 150
const RIDGES = [HEART.from + 300, HEART.from + 700]
const RIDGE_WIDTH = 80
/** A ridge's picture: a little wider than it, from the back of its top down to the floor's front edge. */
const PILLAR = {
	width: RIDGE_WIDTH + 16,
	height: RIDGE + PATH_BACK + PATH_FRONT + 4,
}
/** How far before each ridge its valve's middle is: right up against it, the whole of it clear of it. */
const VALVE_BEFORE = 52

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/** Steps, `STEP` up each, up the escalator: low enough to run up. */
const STEP = 8

function groundY(x: number) {
	if (x < ESCALATOR.from) return G0
	if (x < ESCALATOR.to) {
		const t = (x - ESCALATOR.from) / (ESCALATOR.to - ESCALATOR.from)
		return G0 - Math.round(((G0 - G1) * t) / STEP) * STEP
	}
	if (x < TONGUE_TIP) return G1
	// Up the tongue, out over the bench's edge, and into the mouth.
	if (x < LIPS_X)
		return G1 + ((MOUTH_Y - G1) * (x - TONGUE_TIP)) / (LIPS_X - TONGUE_TIP)
	if (x < TRACHEA.from) return MOUTH_Y
	if (x < TRACHEA.to)
		return (
			MOUTH_Y +
			(LUNG_Y - MOUTH_Y) *
				ease((x - TRACHEA.from) / (TRACHEA.to - TRACHEA.from))
		)
	if (x < ARTERY.from) {
		if (RIDGES.some((r) => x >= r && x < r + RIDGE_WIDTH)) return LUNG_Y - RIDGE
		return LUNG_Y
	}
	if (x < ARTERY.to)
		return (
			LUNG_Y +
			(SINUS_Y - LUNG_Y) * ease((x - ARTERY.from) / (ARTERY.to - ARTERY.from))
		)
	if (x < ESCALATOR_2.from) return G1
	if (x < ESCALATOR_2.to) {
		const t = (x - ESCALATOR_2.from) / (ESCALATOR_2.to - ESCALATOR_2.from)
		return G1 + Math.round(((G0 - G1) * t) / STEP) * STEP
	}
	return G0
}

const within = (x: number, span: { from: number; to: number }) =>
	x >= span.from && x < span.to

/** How steep it really is at `x`. */
const steepness = (x: number) => (groundY(x + 4) - groundY(x - 4)) / 8

const terrain: Terrain = withGaps(
	{
		length: FINISH - START_X,
		finishX: FINISH,
		groundY,
		// Up the escalator, carried, not climbing: a little push on, rather
		// than its steps' pull back. Down it, faster still. Up the artery,
		// carried along with the blood.
		slope: (x) =>
			within(x, ESCALATOR)
				? 0.06
				: within(x, ESCALATOR_2)
					? 0.1
					: within(x, ARTERY)
						? 0.03
						: steepness(x),
		// Stood up straight on an escalator's step.
		tilt: (x) =>
			within(x, ESCALATOR) || within(x, ESCALATOR_2) ? 0 : steepness(x),
	},
	[],
	RIDGES.map((r) => r + RIDGE_WIDTH),
	RIDGES,
)

// --- The building, and the body: one Cave -----------------------------------

/** How high the rock is over the floor, inside, at `x`: none where it's open. */
function ceiling(x: number): number | undefined {
	if (x < ENTRANCE || x >= EXIT) return undefined
	if (x < VESTIBULE) return G0 - 170
	// A double-height atrium, over reception and the escalator.
	if (x < CORRIDOR) return G1 - 200
	if (x < LAB) return G1 - 180
	if (x < MICRO_FROM) return G1 - 230
	// The lab bench, shrunk, and the tongue: open, the lab over it.
	if (x < LIPS_X) return undefined
	// In the mouth, its upper lip over it; and on in, the roof of it.
	if (x < INSIDE) return LIPS_Y
	if (x < TRACHEA.from) return MOUTH_Y - 210
	if (x < TRACHEA.to) return groundY(x) - 170
	if (x < LUNGS.to) {
		// The lungs: a cavern, rising from the windpipe's height, and back down.
		const rise = Math.min(x - LUNGS.from, LUNGS.to - x) / 300
		return Math.round((LUNG_Y - 170 - 390 * ease(rise)) / 4) * 4
	}
	if (x < HEART.to) return LUNG_Y - 440
	if (x < ARTERY.to) return Math.round((groundY(x) - 210) / 2) * 2
	if (x < MACRO_FROM) return SINUS_Y - 210
	if (x < CORRIDOR_2) return G1 - 230
	if (x < ESCALATOR_2.from) return G1 - 180
	return G1 - 200
}

/** Where a feature's top is to go, `top`, for one stood behind the path at `x`, `height` tall. */
const behind = (x: number, height: number, top: number) =>
	top - groundY(x) + PATH_BACK + height

const FACE_X = FACE_LEFT + GIANT_FACE.width / 2

const building: Cave = {
	from: ENTRANCE,
	to: EXIT,
	mouth: 120,
	ceiling,
	surface: () => undefined,
	foot: (x) =>
		x >= ENTRANCE && x < EXIT && (x < MICRO_FROM || x >= INSIDE)
			? 900
			: undefined,
	features: [
		// Over the way in: its canopy, and its name.
		{
			asset: ENTRANCE_ART.asset,
			x: ENTRANCE + 60,
			width: ENTRANCE_ART.width,
			height: ENTRANCE_ART.height,
			on: 'behind',
			sink: behind(
				ENTRANCE + 60,
				ENTRANCE_ART.height,
				G0 - 170 - ENTRANCE_ART.height,
			),
		},
		// The escalators' sides, up, and back down.
		{
			asset: ESCALATOR_UP.asset,
			x: (ESCALATOR.from + ESCALATOR.to) / 2,
			width: ESCALATOR_UP.width,
			height: ESCALATOR_UP.height,
			on: 'behind',
			sink: behind(
				(ESCALATOR.from + ESCALATOR.to) / 2,
				ESCALATOR_UP.height,
				G0 - PATH_BACK - ESCALATOR_UP.height,
			),
		},
		{
			asset: ESCALATOR_DOWN.asset,
			x: (ESCALATOR_2.from + ESCALATOR_2.to) / 2,
			width: ESCALATOR_DOWN.width,
			height: ESCALATOR_DOWN.height,
			on: 'behind',
			sink: behind(
				(ESCALATOR_2.from + ESCALATOR_2.to) / 2,
				ESCALATOR_DOWN.height,
				G0 - PATH_BACK - ESCALATOR_DOWN.height,
			),
		},
		// The heart's ridges: columns of muscle.
		...RIDGES.map((r) => ({
			asset: heartPillar(PILLAR.width, PILLAR.height),
			x: r + RIDGE_WIDTH / 2,
			width: PILLAR.width,
			height: PILLAR.height,
			on: 'path' as const,
			sink: PILLAR.height - PATH_FRONT - PATH_BACK - 4,
		})),
		// The giant's face, leaning over the bench, its nostril at the
		// start of the inside of its nose.
		{
			asset: GIANT_FACE.asset,
			x: FACE_X,
			width: GIANT_FACE.width,
			height: GIANT_FACE.height,
			on: 'behind',
			sink: behind(FACE_X, GIANT_FACE.height, FACE_TOP),
		},
	],
}

// --- Portals ----------------------------------------------------------------

/** How far left of its middle the sneezer stands, from the nose out. */
const SNEEZER_X = GROW_OUT - 150
/** How far back the sneezer stands, behind the path's back edge. */
const SNEEZER_BACK = 2

const PORTALS: Portal[] = [
	{
		kind: 'shrink',
		in: SHRINK_IN,
		out: SHRINK_OUT,
		focus: { x: PLATE, y: G1 },
	},
	{
		kind: 'grow',
		in: GROW_IN,
		out: GROW_OUT,
		focus: {
			x: SNEEZER_X - SNEEZER.width / 2 + SNEEZER.nose.x,
			y: G1 - PATH_BACK - SNEEZER_BACK - SNEEZER.height + SNEEZER.nose.y,
		},
	},
]

/** Where a picture's to stand, `setBack`, for its `plate` to be at the runners' feet. */
const plateSetBack = (art: { height: number; plate: { y: number } }) =>
	art.plate.y - art.height - PATH_BACK

// --- Platforms --------------------------------------------------------------

/** The lungs breathing, in and out: how long a breath takes, and how far it lifts what's in them. */
const BREATHING = { ticks: 240, lift: 50 }
const breathing = (
	x: number,
	width: number,
	height: number,
): PlatformDefinition => ({
	x,
	width,
	height,
	move: { y: -BREATHING.lift, ticks: BREATHING.ticks, phase: 0 },
})

const L = LUNGS.from
const PLATFORMS: PlatformDefinition[] = [
	// The lungs' airways, branching, one up over another; some of them
	// rising and falling with every breath.
	{ x: L + 250, width: 300, height: 90 },
	breathing(L + 520, 240, 180),
	{ x: L + 800, width: 280, height: 260 },
	breathing(L + 1090, 200, 340),
	{ x: L + 1320, width: 280, height: 220 },
	breathing(L + 1560, 200, 120),
]

/** The highest airway, breathing: the head mirror up on it. */
const TOP_AIRWAY = PLATFORMS[3]

// --- What's in the way, and what's to be had --------------------------------

const germ = (x: number, low = 4, high = 84): Obstacle => ({
	kind: 'germ',
	x,
	low,
	high,
})

const OBSTACLES: Obstacle[] = [
	// Outside: pigeons, and visitors stood about.
	{ kind: 'geese', x: 1000, count: 3 },
	{ kind: 'tourists', x: 1380, count: 3 },
	// Reception: wet floor, and a queue.
	{ kind: 'rock', x: 2060 },
	{ kind: 'tourists', x: 2360, count: 2 },
	{ kind: 'rock', x: 2680 },
	// The corridor: beds being wheeled up and down it, drip stands.
	{ kind: 'cyclist', x: 4300, shuttle: [3560, 4520] },
	{ kind: 'rock', x: 3720 },
	{ kind: 'rock', x: 4040 },
	// The lab.
	{ kind: 'rock', x: 4900 },
	// Shrunk: crumbs on the bench, and Germs.
	{ kind: 'rock', x: 7150 },
	germ(7450),
	{ kind: 'rock', x: 7700 },
	germ(7930),
	// Up the nose: hairs, snot, a Germ.
	{ kind: 'rock', x: 8720 },
	{ kind: 'mud', x: 8880, width: 100 },
	germ(9040),
	{ kind: 'rock', x: 9180 },
	// The lungs: Germs along the floor, and air sacs to bounce off.
	germ(L + 180),
	{ kind: 'steam', x: L + 400 },
	germ(L + 700, 10, 120),
	{ kind: 'steam', x: L + 1000 },
	germ(L + 1220),
	{ kind: 'steam', x: L + 1480 },
	germ(L + 1720, 10, 120),
	// The heart: valves before each ridge, and Germs.
	germ(HEART.from + 140),
	{ kind: 'valve', x: RIDGES[0] - VALVE_BEFORE },
	germ(HEART.from + 500),
	{ kind: 'valve', x: RIDGES[1] - VALVE_BEFORE },
	germ(HEART.from + 900),
	// The artery: clots, and Germs in the blood.
	{ kind: 'rock', x: 13300 },
	germ(13450, 20, 130),
	{ kind: 'rock', x: 13850 },
	germ(14000, 20, 130),
	{ kind: 'rock', x: 14400 },
	germ(14550, 20, 130),
	// Back up the nose.
	germ(14800),
	{ kind: 'rock', x: 14900 },
	{ kind: 'mud', x: 15040, width: 80 },
	// Full size again: the lab, the corridor and the beds, down to the lobby.
	{ kind: 'rock', x: 17360 },
	{ kind: 'cyclist', x: 17900, shuttle: [17560, 17980] },
	{ kind: 'tourists', x: 18780, count: 2 },
	{ kind: 'rock', x: 19060 },
	// Out on the street again.
	{ kind: 'geese', x: 19700, count: 3 },
]

const cheer = (x: number, member: RunnerName): Boost => ({
	kind: 'cheer',
	x,
	member,
})

const BOOSTS: Boost[] = [
	{ kind: 'fika', x: 820, height: 26, item: 'grapes' },
	cheer(1180, 'anna'),
	{ kind: 'fika', x: 1530, height: 95, item: 'coffee' },
	{ kind: 'fika', x: 2200, height: 95, item: 'kanelbulle' },
	cheer(2520, 'keith'),
	{ kind: 'fika', x: 2820, height: 26, item: 'grapes' },
	// Halfway up the escalator, over it.
	{ kind: 'fika', x: 3150, height: 70, item: 'coffee' },
	{ kind: 'fika', x: 3860, height: 95, item: 'grapes' },
	cheer(4220, 'eline'),
	{ kind: 'fika', x: 4760, height: 26, item: 'coffee' },
	// Shrunk.
	{ kind: 'fika', x: 7300, height: 95, item: 'vitamin' },
	{ kind: 'fika', x: 8800, height: 95, item: 'oxygen' },
	// Down the windpipe, to grab sliding.
	{ kind: 'fika', x: 9700, height: 24, item: 'oxygen' },
	{ kind: 'fika', x: 9960, height: 24, item: 'vitamin' },
	// Up on the lungs' airways.
	{
		kind: 'fika',
		x: PLATFORMS[2].x + 140,
		height: PLATFORMS[2].height + 26,
		item: 'oxygen',
	},
	{
		kind: 'fika',
		x: PLATFORMS[4].x + 200,
		height: PLATFORMS[4].height + 26,
		item: 'oxygen',
	},
	// Flying over the heart's ridges.
	{ kind: 'fika', x: RIDGES[0] + 40, height: RIDGE + 70, item: 'oxygen' },
	{ kind: 'fika', x: RIDGES[1] + 40, height: RIDGE + 70, item: 'vitamin' },
	{ kind: 'fika', x: 13700, height: 95, item: 'vitamin' },
	{ kind: 'fika', x: 14980, height: 95, item: 'oxygen' },
	// Full size again.
	{ kind: 'fika', x: 17140, height: 26, item: 'coffee' },
	cheer(18640, 'rick'),
	{ kind: 'fika', x: 18900, height: 95, item: 'grapes' },
	cheer(19160, 'lyra'),
	{ kind: 'fika', x: 19500, height: 26, item: 'kanelbulle' },
	cheer(19980, 'august'),
]

/** How many Germs there are, all told: popping every one's the special goal. */
const GERM_COUNT = OBSTACLES.filter((o) => o.kind === 'germ').length

// --- Scenery ----------------------------------------------------------------

function scenery(): Scenery[] {
	const pieces: Scenery[] = []
	/** Out on the plaza, behind the path. */
	const out = (x: number, asset: string, setBack = 6) =>
		pieces.push({ x, asset, scale: 2, setBack })
	/** Inside, stood on the floor against the wall. */
	const inside = (x: number, asset: string) =>
		pieces.push({ x, asset, scale: 2, setBack: -2, onFloor: true })

	// The plaza, before the hospital, and after.
	for (const x of [-500, 260, 1500, 19700]) out(x, birch, 12)
	for (const x of [-200, 640, 1240, 19480, 20400]) out(x, lampPost, 2)
	out(-350, bench)
	out(560, bikeRack)
	out(900, karolinskaSign, 4)
	out(1350, ambulance, 2)
	out(19900, bench)
	out(20250, bikeRack)
	inside(ENTRANCE + 50, revolvingDoor)
	inside(EXIT - 50, revolvingDoor)

	// Reception.
	inside(1990, pottedPlant)
	inside(2200, receptionDesk)
	inside(2450, waitingChairs)
	inside(2620, vendingMachine)
	inside(2760, wayfindingSign)
	// The corridor.
	for (const [x, asset] of [
		[3520, wardDoor],
		[3640, fireExtinguisher],
		[3860, noticeBoard],
		[4060, wardDoor],
		[4200, parkedWheelchair],
		[4420, wardDoor],
		[4540, exitSign],
	] as const)
		inside(x, asset)
	// The lab, and the shrink ray, its operator at its controls.
	inside(4700, fumeHood)
	inside(4860, labBench)
	inside(5000, centrifuge)
	inside(5110, whiteboard)
	pieces.push({
		x: PLATE - SHRINK_RAY_BACK.plate.x + SHRINK_RAY_BACK.width / 2,
		asset: SHRINK_RAY_BACK.asset,
		scale: SHRINK_RAY_BACK.width / pixels(SHRINK_RAY_BACK.asset).width,
		setBack: plateSetBack(SHRINK_RAY_BACK),
	})
	pieces.push({
		x: PLATE - SHRINK_RAY_FRONT.plate.x + SHRINK_RAY_FRONT.width / 2,
		asset: SHRINK_RAY_FRONT.asset,
		scale: SHRINK_RAY_FRONT.width / pixels(SHRINK_RAY_FRONT.asset).width,
		setBack: plateSetBack(SHRINK_RAY_FRONT),
		front: true,
	})
	inside(PLATE + 150, operator)
	inside(5600, labFridge)
	inside(5800, skeletonModel)

	// Shrunk, on the bench.
	for (const [x, asset] of [
		[6200, petriDish],
		[6600, pipetteTip],
		[7020, dustMite],
		[7560, waterDroplet],
		[7820, petriDish],
	] as const)
		pieces.push({ x, asset, scale: 2, setBack: 4 })

	// Inside the nose.
	for (const x of [8620, 8960, 9240]) inside(x, cilia)
	// The lungs.
	for (const x of [L + 80, L + 620, L + 960, L + 1400, L + 1760])
		inside(x, alveoli)
	for (const x of [L + 300, L + 1180]) inside(x, bronchus)
	// The heart, and the artery.
	for (const x of [HEART.from + 60, HEART.from + 560, HEART.from + 960])
		inside(x, capillaries)
	for (const x of [13150, 13650, 14250]) inside(x, floatingCells)
	inside(13980, whiteCell)
	// Back in the nose.
	for (const x of [14760, 15100]) inside(x, cilia)

	// Full size again: the lab, and the scientist sneezing.
	inside(16300, labFridge)
	inside(16500, labBench)
	pieces.push({
		x: SNEEZER_X,
		asset: SNEEZER.asset,
		scale: SNEEZER.width / pixels(SNEEZER.asset).width,
		setBack: SNEEZER_BACK,
	})
	inside(17120, fumeHood)
	inside(17380, whiteboard)
	for (const [x, asset] of [
		[17620, wardDoor],
		[17760, noticeBoard],
		[17900, wardDoor],
		[18620, pottedPlant],
		[18820, cafeCounter],
		[19060, waitingChairs],
		[19200, wayfindingSign],
	] as const)
		inside(x, asset)
	return pieces
}

/** A picture drawn in code's size, in its cells, read off its SVG. */
function pixels(asset: string) {
	const svg = decodeURIComponent(asset)
	const width = Number(/width="(\d+)"/.exec(svg)?.[1] ?? 1)
	const height = Number(/height="(\d+)"/.exec(svg)?.[1] ?? 1)
	return { width, height }
}

// --- The course -------------------------------------------------------------

/** Where the floor's colours change, along the course: see `strips`. */
const FLOORS: [x: number, floor: Floor][] = [
	[-2000, 'plaza'],
	[ENTRANCE, 'lino'],
	[ESCALATOR.from, 'steps'],
	[ESCALATOR.to, 'corridor'],
	[LAB, 'lab'],
	[MICRO_FROM, 'bench'],
	[EDGE, 'tongue'],
	[INSIDE, 'nose'],
	[LUNGS.from, 'lung'],
	[HEART.from, 'heart'],
	[ARTERY.from, 'artery'],
	[ARTERY.to, 'nose'],
	[MACRO_FROM, 'lab'],
	[CORRIDOR_2, 'corridor'],
	[ESCALATOR_2.from, 'steps'],
	[ESCALATOR_2.to, 'lino'],
	[EXIT, 'plaza'],
]
type Floor =
	| 'plaza'
	| 'lino'
	| 'steps'
	| 'corridor'
	| 'lab'
	| 'bench'
	| 'tongue'
	| 'nose'
	| 'lung'
	| 'heart'
	| 'artery'
/** Each floor's colours: behind the path, the path's back edge, the path, its front edge, and under it. */
const FLOOR_COLOURS: Record<Floor, [string, string, string, string, string]> = {
	plaza: ['#9fb07a', '#a8a39a', '#c9c4ba', '#8f8a82', '#6f6a62'],
	lino: ['#c3d0d6', '#a9b9c1', '#cbd8de', '#f2f5f6', '#8d949a'],
	steps: ['#7e888e', '#6d767c', '#a2abb1', '#c9d0d4', '#596167'],
	corridor: ['#c9d6c4', '#b1c2ab', '#d3dece', '#f2f5f0', '#8d949a'],
	lab: ['#d5dbde', '#bcc5ca', '#e1e6e8', '#ffffff', '#8d949a'],
	bench: ['#e4e8e6', '#d3d9d6', '#f1f3f2', '#ffffff', '#a4ada9'],
	// Nothing: the tongue's drawn on its own (see `mouth`), the air under it.
	tongue: [
		'transparent',
		'transparent',
		'transparent',
		'transparent',
		'transparent',
	],
	nose: ['#d97a86', '#c96876', '#e8909a', '#f4b0b8', '#b85560'],
	lung: ['#e48d9b', '#d27a89', '#efa2ae', '#f8c0c8', '#c26a76'],
	heart: ['#9a2436', '#86192b', '#b3344a', '#cf5266', '#6a1625'],
	artery: ['#b02c3e', '#981f31', '#c63e50', '#e05a6a', '#7a1a28'],
}

const strip = (id: string, layer: number) => ({
	id,
	stops: FLOORS.map(([x, floor]): [number, string] => [
		x,
		FLOOR_COLOURS[floor][layer],
	]),
})

const LAID_OUT = withHat(
	{ obstacles: OBSTACLES, boosts: BOOSTS },
	'headMirror',
	() => ({
		x: TOP_AIRWAY.x + TOP_AIRWAY.width / 2,
		height: TOP_AIRWAY.height + 12,
	}),
	0,
)

export const karolinska: CourseDefinition = {
	id: 'karolinska',
	name: 'Karolinska',
	blurb:
		'Into the hospital and up to the lab, where a shrink ray makes you tiny: up a giant’s tongue, and on through them, nose, lungs, heart and all, till they sneeze you out.',
	terrain,
	cave: building,
	platforms: PLATFORMS,
	portals: PORTALS,
	ride: 'bloodCell',
	corgis: [ARTERY.from + 150, ARTERY.from + 700, ARTERY.from + 1250],
	runDirectors: ['anna', 'keith'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--grass-green': '#b9b5ad',
			'--grass-dark-green': '#a29e96',
			'--grass-darker-green': '#86827a',
			'--hud-ink': '#fff8f4',
			'--hud-shadow':
				'2px 0 #3a1820, -2px 0 #3a1820, 0 2px #3a1820, 0 -2px #3a1820',
		},
		horizon: { far: SOLNA_FAR, near: SOLNA_NEAR, fill: SOLNA_FILL },
		voyage: [
			{ from: MICRO_FROM - 400, horizon: GIANT_LAB },
			{
				from: EXIT - 700,
				horizon: { far: SOLNA_FAR, near: SOLNA_NEAR, fill: SOLNA_FILL },
			},
		],
		horizonTrees: false,
		strips: [
			strip('k-verge', 0),
			strip('k-back', 1),
			strip('k-path', 2),
			strip('k-edge', 3),
			strip('k-under', 4),
		],
		ground: [
			[-PATH_BACK - VERGE, 'url(#k-verge)'],
			[-PATH_BACK, 'url(#k-back)'],
			[-PATH_BACK + 4, 'url(#k-path)'],
			[PATH_FRONT, 'url(#k-edge)'],
			[PATH_FRONT + 4, 'url(#k-under)'],
		],
		// Under the tongue: nothing, the air off the edge of the bench.
		ridge: (x) =>
			x >= EDGE && x < INSIDE ? groundY(x) + PATH_FRONT + 2 : undefined,
		mouth: {
			face: { x: FACE_LEFT, y: FACE_TOP },
			tip: TONGUE_TIP,
			inside: INSIDE,
			opens: 620,
		},
		cave: {
			rock: '#dfe3e6',
			seam: '#9aa6ad',
			// A shadow along the ceiling: a hospital's, or the body's.
			edge: 'rgba(40, 10, 20, 0.28)',
			wall: '#e8efe6',
			grass: '#b9b5ad',
			tiles: HOSPITAL_TILES,
			zones: [
				{ from: MICRO_FROM, tiles: NOSE_TILES },
				{ from: TRACHEA.from, tiles: TRACHEA_TILES },
				{ from: LUNGS.from, tiles: LUNG_TILES },
				{ from: HEART.from, tiles: HEART_TILES },
				{ from: ARTERY.from, tiles: ARTERY_TILES },
				{ from: ARTERY.to, tiles: NOSE_TILES },
				{ from: MACRO_FROM, tiles: HOSPITAL_TILES },
			],
			bore: false,
		},
		rocks: [
			{ ...WET_FLOOR, from: ENTRANCE, to: CORRIDOR },
			{ ...IV_STAND, from: CORRIDOR, to: MICRO_FROM },
			// Crumbs on the bench, and in the mouth: breakfast.
			{ ...CRUMB, from: MICRO_FROM, to: TRACHEA.from },
			{ ...NOSE_HAIR, from: TRACHEA.from, to: ARTERY.from },
			{ ...CLOT, from: ARTERY.from, to: ARTERY.to },
			{ ...NOSE_HAIR, from: ARTERY.to, to: MACRO_FROM },
			{ ...IV_STAND, from: MACRO_FROM, to: ESCALATOR_2.from },
			{ ...WET_FLOOR, from: ESCALATOR_2.from, to: EXIT },
		],
		cyclist: GURNEY,
		bouncers: true,
		bouncer: ALVEOLUS,
		heartbeat: { from: HEART.from - 200, to: HEART.to + 200 },
		// Snot, not mud.
		mud: 'hue-rotate(40deg) saturate(1.4) brightness(1.15)',
		mudWord: 'Slime!',
		// Visitors' pigeons.
		geese: 'grayscale(1) brightness(0.9)',
		// The lungs' airways: pink, soft.
		platform: {
			top: '#f6b3bd',
			face: '#b85a6c',
			edge: '#7a3040',
			depth: 14,
			// Soft and wet, not slabs: cilia along their tops, mucus dripping.
			rock: { lit: '#ffd3da', moss: '#fde6ea', drip: '#c26a76' },
		},
		previewFrom: ENTRANCE - 300,
	},
	scenery: scenery(),
	...LAID_OUT,
	special: {
		goal: 'Pop every germ',
		done: (run) => (run.germsPopped ?? 0) >= GERM_COUNT,
	},
}
