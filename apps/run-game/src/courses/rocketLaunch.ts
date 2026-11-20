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
import { TINA } from '../runners/bonus'
import {
	BASE_PATH,
	BASE_UNDER,
	CHAMBER_TILES,
	DOME_FAR,
	DOME_FILL,
	DOME_NEAR,
	DOME_RIB,
	DOME_SKY,
	DOME_TILES,
	alienSign,
	backTreeSilhouette,
	backTreeSilhouette2,
	blasterRack,
	bulbTree,
	consoleDesk,
	crates,
	eyeStalks,
	frondTree,
	glowMushrooms,
	hangingVines,
	holoTable,
	pipeRun,
	podPlant,
	specimenTank,
	spiralFern,
	tentacleBush,
} from './kit/alienBaseScenery'
import { BOSS } from './kit/alienCreatures'
import { withHat } from './kit/hats'
import {
	GANTRY,
	LAUNCH_FAR,
	LAUNCH_FILL,
	LAUNCH_NEAR,
	PAD_PATH,
	PAD_UNDER,
	ROCKET,
	SPACE_FAR,
	SPACE_FILL,
	SPACE_NEAR,
	SPACE_NEARER,
	SPACE_SKY,
	astronautJunk,
	comet,
	controlBunker,
	countdownClock,
	flags,
	floodlight,
	fuelTank,
	fuelTruck,
	launchPad,
	launchSign,
	probe,
	radarDish,
	ringedPlanet,
	spaceStation,
	spectators,
	viewingStand,
	waterTower,
} from './kit/rocketLaunchScenery'
import {
	PLANET_DUST,
	PLANET_FAR,
	PLANET_FILL,
	PLANET_NEAR,
	PLANET_NEARER,
	PLANET_PATH,
	PLANET_ROCK,
	PLANET_SKY,
	PLANET_UNDER,
	alienFlag,
	alienFlowers,
	alienFlowers2,
	bulbPlant,
	crashedRocket,
	crystals,
	giantBones,
	landedSaucer,
	monolith,
	rockArch,
	smallCrystals,
	spineCactus,
	wavingAlien,
	wavingAlien2,
} from './kit/rocketPlanetScenery'
import { seeded } from './kit/seeded'
import type {
	Boost,
	Boss,
	Cave,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
	Portal,
	Scenery,
} from './types'

/**
 * Rocket Launch: down the launch site to the rocket on its pad, up the
 * gantry's stairs and in through its door. Once everyone's aboard it
 * takes off, the camera following it up into space, everyone at its
 * windows, till it blows up, and they're thrown out into space, space
 * helmets on. On through it, swimming, dodging asteroids, the bus in
 * rocket mode behind, till a planet's gravity pulls everyone down onto it:
 * low gravity, slow floating jumps, craters, geysers, and space buddies to
 * ride. Then into the aliens' base, under its glass domes, gravity back to
 * normal, and its troopers firing slow plasma bolts at everyone: over
 * them, under them, up on platforms and onto their heads. A prisoner
 * hangs in a cage up high, to be dropped and freed. And at the end, the
 * giant alien in its chamber, the bus waiting outside, to be bounced on
 * till it's beaten, and out to the finish.
 */

const CHEERERS: RunnerName[] = [
	'august',
	'lyra',
	'rick',
	'eline',
	'josh',
	'keith',
	'anna',
]

const DISTANCE_M = 5000
const FINISH = START_X + DISTANCE_M * PX_PER_M

const G0 = GROUND_Y

// --- Along the course, in order -------------------------------------------

/**
 * The gantry's stairs, up to the walkway out to the rocket's door, high
 * over the pad; the door itself, the rocket's Portal; and where the pad
 * is, under the rocket.
 */
const STAIRS = { from: 1080, to: 1330 }
/** The walkway's height: the rocket's door's sill, the rocket stood on the ground. */
const WALKWAY = G0 - (ROCKET.height - ROCKET.door.y)
const DOOR = 1420
const WALKWAY_END = DOOR + 24
/** Where the rocket's middle is, its door on its left at `DOOR`. */
const ROCKET_X = DOOR - ROCKET.door.x + ROCKET.width / 2
/**
 * Space: from out of sight past the pad, to the planet. Its top, as high as
 * anyone can swim; its Ground, as low, `G0`. Everyone's thrown out of the
 * rocket into it at `THROWN_OUT`.
 */
const SPACE_TOP = 30
const THROWN_OUT = 2800
/**
 * The planet: its plain's height, high up; and its edge, coming up under
 * space, curved, as a planet's is, a circle `PLANET_RADIUS` round, rising to
 * its plain at `PLANET_TOP`. Where it comes up through space's floor,
 * `PLANET_EDGE`, space ends, and its gravity has you.
 */
const PLAIN = G0 - 220
const PLANET_TOP = 8300
const PLANET_RADIUS = 1600
const PLANET_EDGE = Math.round(
	PLANET_TOP -
		Math.sqrt(PLANET_RADIUS ** 2 - (PLANET_RADIUS - (G0 - PLAIN)) ** 2),
)
/**
 * How far down off the bottom of the screen its edge is drawn, curving on
 * down, rather than cut off at space's floor; and where that is along.
 */
const PLANET_DEEPEST = G0 + 90
const PLANET_FOOT = Math.round(
	PLANET_TOP -
		Math.sqrt(
			PLANET_RADIUS ** 2 - (PLANET_RADIUS - (PLANET_DEEPEST - PLAIN)) ** 2,
		),
)
const SPACE = { from: 2200, to: PLANET_EDGE }
/** The planet, in low gravity, to the base. */
const PLANET = { from: PLANET_EDGE, to: 12100 }
/** Down a long ramp into the base, its floor at `G0`. */
const RAMP = { from: 11800, to: 12250 }
/** Out of the chamber at the end, up onto a lower stretch of plain, to the finish. */
const EXIT_PLAIN = G0 - 60
/** The base: three domes, one after another. */
const DOMES = [
	{ from: 12300, to: 14300 },
	{ from: 14300, to: 16400 },
	{ from: 16400, to: 18700 },
]
const BASE = { from: DOMES[0].from, to: DOMES[2].to }
/** The boss's chamber. */
const ROOM = { from: 18800, to: 19800 }
const BOSS_X = 19300
/** Half the boss's body, across: solid, to its head. */
const BOSS_HALF = (BOSS.width - 40) / 2
const ROOM_HEIGHT = 520

/** Craters in the plain: their middles, how wide, how deep, and whether there's a geyser in them. */
const CRATERS = [
	{ x: 8900, width: 320, depth: 46 },
	{ x: 9700, width: 300, depth: 56, geyser: true },
	{ x: 10500, width: 420, depth: 60, geyser: true },
	{ x: 11300, width: 260, depth: 40 },
]

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/** Steps up the gantry's stairs, `STEP` each. */
const STEP = 8

/** How far down into a crater the ground is at `x`, its rim a little proud of the plain. */
function crater(x: number) {
	for (const c of CRATERS) {
		const t = (x - (c.x - c.width / 2)) / c.width
		if (t < -0.12 || t > 1.12) continue
		if (t < 0 || t > 1) {
			// Its rim: a lip of dust thrown up round it.
			const out = t < 0 ? -t : t - 1
			return -10 * Math.sin((out / 0.12) * Math.PI)
		}
		return c.depth * Math.sin(Math.PI * t) ** 1.4
	}
	return 0
}

function groundY(x: number) {
	if (x < STAIRS.from) return G0
	if (x < STAIRS.to) {
		const t = (x - STAIRS.from) / (STAIRS.to - STAIRS.from)
		return G0 - Math.round(((G0 - WALKWAY) * t) / STEP) * STEP
	}
	if (x < WALKWAY_END) return WALKWAY
	// Space's floor; and the planet's edge, curving up through it.
	if (x < PLANET_TOP) {
		const along = PLANET_TOP - x
		if (along >= PLANET_RADIUS) return G0
		const curve =
			PLAIN + PLANET_RADIUS - Math.sqrt(PLANET_RADIUS ** 2 - along ** 2)
		return Math.min(
			along < PLANET_TOP - PLANET_FOOT ? PLANET_DEEPEST : G0,
			curve,
		)
	}
	if (x < RAMP.from) return PLAIN + crater(x)
	if (x < RAMP.to)
		return PLAIN + (G0 - PLAIN) * ease((x - RAMP.from) / (RAMP.to - RAMP.from))
	if (x < ROOM.to + 100) return G0
	// Out of the chamber, back up onto the planet's plain, and to the finish.
	return G0 + (EXIT_PLAIN - G0) * ease((x - ROOM.to - 100) / 200)
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
		// Up the gantry's stairs, at a run, not a crawl. In and out of the
		// craters, gentler than they look: in low gravity it's no great climb.
		slope: (x) =>
			within(x, STAIRS)
				? -0.05
				: within(x, PLANET)
					? steepness(x) * 0.3
					: steepness(x),
		tilt: (x) => (within(x, STAIRS) ? 0 : steepness(x)),
	},
	[],
	[],
	[],
)

// --- The base, and the chamber: one Cave ------------------------------------

/**
 * How high a vault is over the floor at `x`, from `from` to `to`: `ends`
 * at either end, rising to `crown` in its middle, round, its shoulders full.
 */
function vault(
	x: number,
	from: number,
	to: number,
	ends: number,
	crown: number,
) {
	const t = Math.max(0, Math.min(1, (x - from) / (to - from)))
	const u = Math.abs(2 * t - 1)
	const round = Math.max(0, 1 - u ** 2.4) ** (1 / 2.4)
	return ends + (crown - ends) * round
}
/** To a whole number of 4 px cells, as the glass is drawn. */
const fourth = (y: number) => Math.round(y / 4) * 4

/** How high the glass is over the floor, inside, at `x`. */
function ceiling(x: number): number | undefined {
	if (x < BASE.from || x >= ROOM.to) return undefined
	for (const dome of DOMES)
		if (within(x, dome))
			return fourth(G0 - vault(x, dome.from, dome.to, 190, 480))
	// The way into the chamber, and the chamber itself, its roof high over
	// the boss.
	if (x < ROOM.from) return G0 - 190
	return G0 - ROOM_HEIGHT
}

const BOSS_DEF: Boss = {
	room: ROOM,
	x: BOSS_X,
	width: BOSS_HALF * 2,
	height: BOSS.height - 20,
	// The whole of its round top: landed on anywhere, it's a hit.
	head: BOSS_HALF * 2,
	hp: 15,
	stompEvery: 5,
}

const base: Cave = {
	from: BASE.from,
	to: ROOM.to,
	mouth: 120,
	ceiling,
	surface: () => undefined,
	// No rock under its floor: the planet's ground, as anywhere else.
	foot: () => undefined,
	parts: [
		{ from: BASE.from, to: ROOM.from },
		{ from: ROOM.from, to: ROOM.to },
	],
	// The chamber's doors are the boss's (see `draw/space.tsx`): shut, and opening.
}

// --- Portals ----------------------------------------------------------------

const PORTALS: Portal[] = [
	{
		kind: 'launch',
		in: DOOR,
		out: THROWN_OUT,
		// The rocket's middle, stood on its pad.
		focus: { x: ROCKET_X, y: G0 - ROCKET.height / 2 },
	},
]

// --- Platforms --------------------------------------------------------------

/** How far up each of the chamber's girders is over the last: an easy hop, not a full jump. */
const GIRDER_STEP = 68

/**
 * The chamber's girders, up either side of the boss, zigzagging, the top
 * ones right up against it, just under its head: a jump up off them, onto
 * it. Low steps, so it's a climb anyone can make, a Round's slower runners
 * too, not a test of a whole held jump each time.
 */
const CHAMBER_GIRDERS: PlatformDefinition[] = [
	{ x: ROOM.from + 60, width: 130, height: GIRDER_STEP },
	{ x: ROOM.from + 170, width: 150, height: GIRDER_STEP * 2 },
	{ x: ROOM.from + 60, width: 130, height: GIRDER_STEP * 3 },
	{ x: ROOM.from + 170, width: 150, height: GIRDER_STEP * 4 },
	{ x: BOSS_X - BOSS_HALF - 140, width: 130, height: GIRDER_STEP * 5 },
	{ x: ROOM.to - 190, width: 130, height: GIRDER_STEP },
	{ x: ROOM.to - 320, width: 150, height: GIRDER_STEP * 2 },
	{ x: ROOM.to - 190, width: 130, height: GIRDER_STEP * 3 },
	{ x: ROOM.to - 320, width: 150, height: GIRDER_STEP * 4 },
	{ x: BOSS_X + BOSS_HALF + 10, width: 130, height: GIRDER_STEP * 5 },
]

const PLATFORMS: PlatformDefinition[] = [
	// The first dome: a ledge, an alien up on it, then two up a step.
	{ x: 12700, width: 160, height: 85 },
	{ x: 13250, width: 200, height: 85 },
	{ x: 13500, width: 160, height: 170 },
	// The second dome: up and up, to where the cage hangs, off the top.
	{ x: 14500, width: 180, height: 85 },
	{ x: 14720, width: 160, height: 170 },
	{ x: 14940, width: 160, height: 255 },
	{ x: 15700, width: 200, height: 85 },
	// The third: up to the antennae, over everything.
	{ x: 16600, width: 160, height: 85 },
	{ x: 16820, width: 160, height: 170 },
	{ x: 17040, width: 180, height: 255 },
	{ x: 17300, width: 120, height: 340 },
	{ x: 17800, width: 200, height: 85 },
	{ x: 18250, width: 160, height: 110 },
	...CHAMBER_GIRDERS,
]

/** The top of the cage dome's climb, and the antennae's perch. */
const CAGE_LEDGE = PLATFORMS[5]
const ANTENNAE_PERCH = PLATFORMS[10]
/** Where the cage hangs: just on past the top ledge, a jump off its end onto it. */
const CAGE_X = CAGE_LEDGE.x + CAGE_LEDGE.width + 90
const CAGE_TOP = G0 - 330

// --- What's in the way, and what's to be had --------------------------------

/** An alien, on the floor, or up on a Platform. */
const alien = (x: number, height = 0, kneeling = false): Obstacle => ({
	kind: 'alien',
	x,
	height,
	kneeling: kneeling || undefined,
})

/** An asteroid, drifting from `low` to `high` over space's floor. */
const asteroid = (
	x: number,
	low: number,
	high: number,
	big = false,
): Obstacle => ({
	kind: 'asteroid',
	x,
	low,
	high,
	big: big || undefined,
})

const on = (p: PlatformDefinition, along = 0.5) => ({
	x: Math.round(p.x + p.width * along),
	height: p.height,
})

function obstacles(): Obstacle[] {
	const list: Obstacle[] = [
		// The launch site: a clear run to the rocket, but for a rock.
		{ kind: 'rock', x: 760 },
	]
	// Space: asteroids, more and bigger the further out.
	const ASTEROIDS: [number, number, number, boolean?][] = [
		[3200, 180, 300],
		[3500, 60, 160],
		[3800, 260, 400, true],
		[4100, 120, 220],
		[4350, 300, 420],
		[4600, 40, 200, true],
		[4900, 200, 340],
		[5150, 80, 160],
		[5300, 300, 420, true],
		[5600, 140, 260],
		[5850, 40, 120],
		[6000, 220, 400, true],
		[6300, 100, 240],
		[6500, 320, 420],
		[6700, 40, 180, true],
		[6950, 200, 340],
		[7200, 100, 220, true],
		[7330, 300, 420],
	]
	for (const [x, low, high, big] of ASTEROIDS)
		list.push(asteroid(x, low, high, big))
	// And dead satellites, drifting among them, rocking: wider, to get round.
	for (const [x, low, high] of [
		[3650, 200, 320],
		[4480, 60, 170],
		[5020, 280, 400],
		[6150, 140, 260],
		[6820, 300, 400],
		[7090, 60, 180],
	])
		list.push({ kind: 'asteroid', x, low, high, satellite: true })
	// The planet: its rocks, and geysers in some craters.
	for (const x of [8550, 9250, 10050, 10900, 11650])
		list.push({ kind: 'rock', x })
	for (const c of CRATERS) if (c.geyser) list.push({ kind: 'steam', x: c.x })
	// The base: aliens, on the floor, kneeling, and up on the Platforms.
	const P = PLATFORMS
	list.push(
		alien(on(P[0]).x, P[0].height),
		alien(13000),
		alien(on(P[2], 0.6).x, P[2].height),
		alien(13900, 0, true),
		{ kind: 'steam', x: 14420 },
		alien(on(P[5], 0.4).x, P[5].height),
		alien(15500),
		alien(on(P[6]).x, P[6].height),
		alien(16100, 0, true),
		alien(16700),
		alien(17200, 0, true),
		{ kind: 'steam', x: 17500 },
		alien(17620),
		alien(on(P[11]).x, P[11].height),
		alien(18100),
		alien(18450, 0, true),
		// The chamber: on its girders.
		alien(on(CHAMBER_GIRDERS[1], 0.4).x, CHAMBER_GIRDERS[1].height),
		alien(on(CHAMBER_GIRDERS[7], 0.6).x, CHAMBER_GIRDERS[7].height),
	)
	return list
}

const cheer = (x: number, member: RunnerName): Boost => ({
	kind: 'cheer',
	x,
	member,
})

function boosts(): Boost[] {
	return [
		// The launch site.
		{ kind: 'fika', x: 520, height: 26, item: 'coffee' },
		cheer(760, 'august'),
		{ kind: 'fika', x: 920, height: 95, item: 'kanelbulle' },
		cheer(1040, 'lyra'),
		// Up the stairs.
		{ kind: 'fika', x: 1240, height: 60, item: 'astronautIceCream' },
		// Space: floating about, between the asteroids.
		{ kind: 'fika', x: 3050, height: 240, item: 'spaceTube' },
		{ kind: 'fika', x: 3650, height: 360, item: 'astronautIceCream' },
		{ kind: 'fika', x: 4250, height: 80, item: 'spaceTube' },
		{ kind: 'fika', x: 4750, height: 300, item: 'astronautIceCream' },
		{ kind: 'fika', x: 5450, height: 200, item: 'spaceTube' },
		{ kind: 'fika', x: 6150, height: 100, item: 'astronautIceCream' },
		{ kind: 'fika', x: 6850, height: 380, item: 'spaceTube' },
		{ kind: 'fika', x: 7500, height: 200, item: 'astronautIceCream' },
		// The planet: starfruit, some high up, for a floaty jump.
		{ kind: 'fika', x: 8700, height: 26, item: 'starfruit' },
		{ kind: 'fika', x: 9700, height: 260, item: 'starfruit' },
		{ kind: 'fika', x: 10500, height: 300, item: 'starfruit' },
		{ kind: 'fika', x: 11500, height: 140, item: 'starfruit' },
		// The base: alien jellies, some up on the Platforms.
		{ kind: 'fika', x: 12550, height: 26, item: 'alienJelly' },
		{
			kind: 'fika',
			x: on(PLATFORMS[1]).x,
			height: PLATFORMS[1].height + 26,
			item: 'alienJelly',
		},
		{
			kind: 'fika',
			x: on(PLATFORMS[4]).x,
			height: PLATFORMS[4].height + 26,
			item: 'alienJelly',
		},
		{
			kind: 'fika',
			x: on(PLATFORMS[9]).x,
			height: PLATFORMS[9].height + 26,
			item: 'alienJelly',
		},
		{ kind: 'fika', x: 17950, height: 95, item: 'alienJelly' },
		// Out of the chamber, to the finish.
		cheer(19920, 'rick'),
		{ kind: 'fika', x: 20000, height: 26, item: 'coffee' },
		cheer(20080, 'eline'),
	]
}

// --- Scenery ----------------------------------------------------------------

function scenery(): Scenery[] {
	const pieces: Scenery[] = []
	/** Out on the ground, behind the path. */
	const out = (x: number, asset: string, setBack = 6) =>
		pieces.push({ x, asset, scale: 2, setBack })
	/** Inside, stood on the floor against the glass. */
	const inside = (x: number, asset: string) =>
		pieces.push({ x, asset, scale: 2, setBack: -2, onFloor: true })

	// The launch site.
	out(-400, controlBunker, 60)
	out(-120, radarDish, 40)
	for (const x of [-250, 300, 1700]) out(x, floodlight, 20)
	out(-560, waterTower, 70)
	out(160, countdownClock, 30)
	out(330, launchSign, 14)
	out(420, spectators, 4)
	out(620, viewingStand, 24)
	out(1820, fuelTruck, 10)
	out(700, flags, 4)
	out(900, fuelTank, 40)
	out(1900, fuelTank, 30)
	out(2100, radarDish, 40)
	// The gantry, its stairs up its side; and the rocket on its pad, its
	// door at the top of them.
	pieces.push({
		x: (STAIRS.from + WALKWAY_END) / 2,
		asset: GANTRY.asset,
		scale: GANTRY.scale,
		setBack: -PATH_BACK - (G0 - groundY((STAIRS.from + WALKWAY_END) / 2)),
	})
	// Stood on the ground, not up on the walkway its left edge is over:
	// scenery stands on the highest ground under it.
	const onPad = -PATH_BACK - (G0 - WALKWAY)
	pieces.push({ x: ROCKET_X, asset: launchPad, scale: 2, setBack: onPad })
	// The rocket on it is its own: see `draw/rocketLaunch.tsx`.

	// Space: far off behind the swimmers, high up, a landmark or two along
	// the way, and junk drifting. Silhouettes, flat and dark, so nothing
	// back there looks like something to swim into.
	for (const [x, asset, up] of [
		[3700, comet, 380],
		[4500, spaceStation, 290],
		[5100, astronautJunk, 140],
		[5750, ringedPlanet, 340],
		[6450, probe, 210],
		[6950, astronautJunk, 320],
	] as const)
		pieces.push({ x, asset: farOff(asset), scale: 2, setBack: up })

	// The planet: a landmark every so often, and its plants, crystals and
	// friendly aliens scattered between, no two stretches alike.
	// Close behind the path, on its verge: any further back, and it's up
	// over the backdrop, floating.
	out(8700, crashedRocket, 16)
	out(9350, giantBones, 14)
	out(10150, rockArch, 14)
	out(10720, monolith, 12)
	out(11640, landedSaucer, 12)
	out(11530, alienFlag, 8)
	const planet = seeded(5150)
	const PLANET_BITS = [
		spineCactus,
		crystals,
		bulbPlant,
		alienFlowers,
		alienFlowers2,
		smallCrystals,
		alienFlowers,
	]
	for (let x = PLANET_TOP - 300; x < RAMP.from - 100; ) {
		const asset = PLANET_BITS[Math.floor(planet() * PLANET_BITS.length)]
		out(x, asset, 2 + Math.round(planet() * 6) * 2)
		x += 90 + Math.round(planet() * 200)
	}
	for (const [x, asset] of [
		[9050, wavingAlien],
		[9920, wavingAlien2],
		[11400, wavingAlien],
	] as const)
		out(x, asset, 6)

	// The base. At the back, against the glass, its white ribs, and the
	// dark shapes of trees deep in the jungle; vines hanging off the glass
	// where it's high; and along the floor, its plants, every kind, never in
	// step, and the aliens' kit by each dome's console.
	const base = seeded(7340)
	for (const dome of DOMES)
		for (let x = dome.from + 60; x < dome.to; x += 460)
			pieces.push({
				x,
				asset: DOME_RIB.asset,
				scale: 2,
				setBack: RIB_BACK,
			})
	for (let x = BASE.from + 200; x < ROOM.from - 100; ) {
		pieces.push({
			x,
			asset: base() < 0.5 ? backTreeSilhouette : backTreeSilhouette2,
			scale: 2,
			setBack: RIB_BACK - 4,
		})
		x += 260 + Math.round(base() * 320)
	}
	for (let x = BASE.from + 300; x < ROOM.from - 200; ) {
		const roof = ceiling(x)
		// Only where the glass is high, over the floor: not down at a neck.
		if (roof !== undefined && G0 - roof > 360)
			pieces.push({
				x,
				asset: hangingVines,
				scale: 2,
				setBack: G0 - PATH_BACK - (roof + VINE_HEIGHT - 8),
			})
		x += 340 + Math.round(base() * 420)
	}
	const PLANTS = [
		frondTree,
		podPlant,
		tentacleBush,
		spiralFern,
		glowMushrooms,
		bulbTree,
		eyeStalks,
		frondTree,
		spiralFern,
	]
	for (let x = BASE.from + 120; x < ROOM.from - 120; ) {
		inside(x, PLANTS[Math.floor(base() * PLANTS.length)])
		x += 110 + Math.round(base() * 230)
	}
	for (const [x, asset] of [
		[12400, consoleDesk],
		[12520, specimenTank],
		[12900, pipeRun],
		[14400, consoleDesk],
		[14560, crates],
		[15560, holoTable],
		[16500, consoleDesk],
		[16660, blasterRack],
		[17420, specimenTank],
		[17460, specimenTank],
		[18300, crates],
		[18560, pipeRun],
	] as const)
		inside(x, asset)
	for (const x of [12340, 14340, 16440, ROOM.from - 60]) inside(x, alienSign)

	// Outside again, to the finish, the locals out to cheer everyone home.
	out(FINISH - 260, alienFlag, 6)
	out(FINISH - 140, flags, 4)
	out(FINISH - 60, wavingAlien2, 8)
	out(FINISH + 70, alienFlag, 6)
	out(FINISH + 120, wavingAlien, 6)
	out(FINISH + 190, wavingAlien2, 10)
	out(FINISH + 330, landedSaucer, 12)
	out(FINISH + 260, alienFlowers, 2)
	return pieces
}

// --- The course -------------------------------------------------------------

/** A ground layer only where `where` is: pushed off down out of sight everywhere else. */
const only = (where: (x: number) => boolean) => (x: number) =>
	where(x) ? 0 : 99999
/** On the planet's dust, outside: its edge and plain, and out to the finish. */
const onPlanet = (x: number) =>
	(x >= PLANET_FOOT && x < BASE.from) || x >= ROOM.to

/** On the launch site's concrete: not its gantry's steel stairs. */
const onPad = (x: number) =>
	x < STAIRS.from || (x >= WALKWAY_END && x < SPACE.from)

/** How far back the dome's ribs stand, against its glass, and how long its vines hang. */
const RIB_BACK = 60
const VINE_HEIGHT = 120

/** In the domes, on their deck: not the chamber's. */
const inDomes = (x: number) => x >= BASE.from && x < ROOM.from

/**
 * Far off in space: a silhouette of `asset`, every cell of it one flat dark
 * blue, a little lighter than space, so nothing back there looks like
 * something to swim into.
 */
function farOff(asset: string) {
	const prefix = 'data:image/svg+xml,'
	if (!asset.startsWith(prefix)) return asset
	const svg = decodeURIComponent(asset.slice(prefix.length)).replace(
		/fill="(?!none)[^"]*"/g,
		`fill="${FAR_OFF}"`,
	)
	return `${prefix}${encodeURIComponent(svg).replace(
		/[()'!*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	)}`
}
const FAR_OFF = '#1d1b3c'

/** How thick the planet's atmosphere glows over its edge. */
const ATMOSPHERE = 28

/** Where the floor's colours change along it: see `strips`. */
const FLOORS: [x: number, floor: Floor][] = [
	[-2000, 'pad'],
	[STAIRS.from, 'steel'],
	[WALKWAY_END, 'pad'],
	[SPACE.from, 'space'],
	[PLANET_FOOT, 'dust'],
	[BASE.from, 'base'],
	[ROOM.from, 'chamber'],
	[ROOM.to, 'dust'],
]
type Floor = 'pad' | 'steel' | 'space' | 'dust' | 'base' | 'chamber'
/** Each floor's colours: behind the path, the path's back edge, the path, its front edge, and under it. */
const FLOOR_COLOURS: Record<Floor, [string, string, string, string, string]> = {
	pad: ['#b5b09f', '#a39e8e', '#c9c4b4', '#8f8a7c', '#6f6a5e'],
	steel: ['#9a3a2a', '#7e2f22', '#b0b4b8', '#d8dce0', '#5c6064'],
	// Nothing: it's space, the floor's only as low as anyone can go.
	space: [
		'transparent',
		'transparent',
		'transparent',
		'transparent',
		'transparent',
	],
	dust: ['#8d6fb3', '#7a5ea0', '#b392c9', '#d2b6e2', '#5d4580'],
	base: ['#3d6e66', '#335c55', '#7fb8ae', '#b6e6dc', '#24443e'],
	chamber: ['#3a3d4c', '#30333f', '#5c6072', '#8a8fa4', '#1f212b'],
}

const strip = (id: string, layer: number) => ({
	id,
	stops: FLOORS.map(([x, floor]): [number, string] => [
		x,
		FLOOR_COLOURS[floor][layer],
	]),
})

const LAID_OUT = withHat(
	{ obstacles: obstacles(), boosts: boosts() },
	'antennae',
	() => ({
		x: ANTENNAE_PERCH.x + ANTENNAE_PERCH.width / 2,
		height: ANTENNAE_PERCH.height + 12,
	}),
	0,
)

export const rocketLaunch: CourseDefinition = {
	id: 'rocket-launch',
	name: 'Rocket Launch',
	blurb:
		'Up the gantry and into the rocket, up into space, and out of it, fast. Swim the asteroids, float down onto an alien planet, and fight your way through their base to the giant at its heart.',
	terrain,
	cave: base,
	platforms: PLATFORMS,
	portals: PORTALS,
	deepWater: {
		from: SPACE.from,
		to: SPACE.to,
		surface: SPACE_TOP,
		busPace: 0.85,
		space: true,
		floor: G0,
	},
	// Slower through the aliens' base, so there's time to climb about,
	// stomp aliens and free the prisoner.
	busSlow: [{ from: BASE.from, to: ROOM.from, pace: 0.7 }],
	lowGravity: { from: PLANET.from, to: PLANET.to, scale: 0.35, lift: 1.6 },
	boss: BOSS_DEF,
	cage: { x: CAGE_X, top: CAGE_TOP, floor: G0, says: 'I’m free!' },
	// Signs out in space would float about on nothing: the first on the
	// launch site, a little out.
	kmSignsAt: { 1: 2100 },
	// Looking up: at the cage hanging high in its dome, and at the boss, the
	// whole of its chamber in view, girders and all.
	lookUp: [
		{ from: CAGE_LEDGE.x - 200, to: CAGE_X + 200, top: CAGE_TOP - 60 },
		{ from: ROOM.from - 40, to: ROOM.to, top: G0 - ROOM_HEIGHT },
	],
	// Its tune, floaty out in space and on the planet, and hard-driving
	// through the aliens' base to the boss; its own again out to the finish.
	tunes: [
		{ from: SPACE.from, tune: 'rocket-launch:space' },
		{ from: BASE.from - 300, tune: 'rocket-launch:boss' },
		{ from: ROOM.to, tune: 'rocket-launch' },
	],
	ride: 'spaceBuddy',
	corgis: [8800, 10250, 11450],
	runDirectors: ['anna', 'keith'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--grass-green': '#a8a38f',
			'--grass-dark-green': '#938e7a',
			'--grass-darker-green': '#7a7563',
			'--hud-ink': '#f4f8ff',
			'--hud-shadow':
				'2px 0 #14102a, -2px 0 #14102a, 0 2px #14102a, 0 -2px #14102a',
		},
		horizon: { far: LAUNCH_FAR, near: LAUNCH_NEAR, fill: LAUNCH_FILL },
		voyage: [
			{
				// Into the dark as the rocket turns away along the course: just
				// past where anyone stood at its door sees, fading in over the
				// voyage's 700.
				from: DOOR + 400,
				horizon: {
					far: SPACE_FAR,
					near: SPACE_NEAR,
					fill: SPACE_FILL,
					nearer: [{ asset: SPACE_NEARER, height: 80, fill: SPACE_FILL }],
					// Down to the fill's black, so there's no line where it starts.
					sky: [SPACE_SKY[0], SPACE_FILL],
				},
			},
			{
				// Only once you're down on it: coming in, it's its edge, curved,
				// against the stars.
				from: PLANET_TOP - 400,
				horizon: {
					far: PLANET_FAR,
					near: PLANET_NEAR,
					fill: PLANET_FILL,
					nearer: [{ asset: PLANET_NEARER, height: 80, fill: PLANET_DUST }],
					sky: PLANET_SKY,
				},
			},
			{
				// Inside, where it's only seen through the glass: outside on the
				// ramp down, still the planet's.
				from: BASE.from + 500,
				horizon: {
					far: DOME_FAR,
					near: DOME_NEAR,
					fill: DOME_FILL,
					sky: DOME_SKY,
				},
			},
			{
				// Faded in while everyone's shut in the chamber, so it's the
				// planet's sky through its far door as it opens.
				from: ROOM.from + 50,
				horizon: {
					far: PLANET_FAR,
					near: PLANET_NEAR,
					fill: PLANET_FILL,
					nearer: [{ asset: PLANET_NEARER, height: 80, fill: PLANET_DUST }],
					sky: PLANET_SKY,
				},
			},
		],
		horizonTrees: false,
		groundDefs:
			PAD_PATH +
			PAD_UNDER +
			PLANET_PATH +
			PLANET_UNDER +
			BASE_PATH +
			BASE_UNDER,
		strips: [
			strip('rl-verge', 0),
			strip('rl-back', 1),
			strip('rl-path', 2),
			strip('rl-edge', 3),
			strip('rl-under', 4),
		],
		ground: [
			// Its atmosphere, a glow along the planet's curved edge, against
			// the stars.
			[
				-PATH_BACK - VERGE - ATMOSPHERE,
				'rgba(120, 230, 200, 0.28)',
				false,
				(x) =>
					within(x, { from: PLANET_EDGE, to: PLANET_TOP + 200 }) ? 0 : 99999,
			],
			[
				-PATH_BACK - VERGE - ATMOSPHERE / 2,
				'rgba(150, 240, 215, 0.3)',
				false,
				(x) =>
					within(x, { from: PLANET_EDGE, to: PLANET_TOP + 200 }) ? 0 : 99999,
			],
			[-PATH_BACK - VERGE, 'url(#rl-verge)'],
			[-PATH_BACK, 'url(#rl-back)'],
			[-PATH_BACK + 4, 'url(#rl-path)'],
			[-PATH_BACK + 4, 'url(#rl-dust-path)', false, only(onPlanet)],
			[-PATH_BACK + 4, 'url(#rl-pad-path)', false, only(onPad)],
			[-PATH_BACK + 4, 'url(#rl-base-path)', false, only(inDomes)],
			[PATH_FRONT, 'url(#rl-edge)'],
			[PATH_FRONT + 4, 'url(#rl-under)'],
			[PATH_FRONT + 4, 'url(#rl-dust-under)', false, only(onPlanet)],
			[PATH_FRONT + 4, 'url(#rl-pad-under)', false, only(onPad)],
			[PATH_FRONT + 4, 'url(#rl-base-under)', false, only(inDomes)],
		],
		// The gantry's stairs and walkway: steel, open under; and space,
		// nothing under it at all.
		ridge: (x) =>
			within(x, { from: STAIRS.from, to: WALKWAY_END })
				? groundY(x) + PATH_FRONT + 6
				: within(x, { from: SPACE.from, to: PLANET_FOOT })
					? groundY(x) + PATH_FRONT + 2
					: undefined,
		cave: {
			rock: '#9fd7d2',
			seam: '#e8fbf8',
			edge: 'rgba(10, 30, 30, 0.3)',
			wall: '#2b6156',
			grass: '#7fb8ae',
			tiles: DOME_TILES,
			zones: [{ from: ROOM.from - 100, tiles: CHAMBER_TILES }],
			bore: false,
		},
		rocks: [{ ...PLANET_ROCK, from: PLANET.from, to: PLANET.to }],
		geyser: { from: PLANET.from, to: PLANET.to },
		busJets: { from: SPACE.from, to: SPACE.to },
		platform: {
			top: '#b6e6dc',
			face: '#3d6e66',
			edge: '#1f3d37',
			depth: 12,
		},
		previewFrom: STAIRS.from - 400,
	},
	scenery: scenery(),
	...LAID_OUT,
	// The alien prisoner, in the cage, till it's dropped and smashed open.
	found: {
		runner: TINA.id,
		x: CAGE_X,
		y: G0,
		says: 'I’m free!',
		toSelf: 'Another one of me?',
	},
	special: {
		goal: 'Free the prisoner',
		done: (run) => !!run.freedPrisoner,
	},
}
