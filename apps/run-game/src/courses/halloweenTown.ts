import batAsset from '@/assets/halloween/bat.png'
import ghost1 from '@/assets/halloween/ghost1.png'
import ghost2 from '@/assets/halloween/ghost2.png'
import ghost3 from '@/assets/halloween/ghost3.png'
import ghost4 from '@/assets/halloween/ghost4.png'
import skeletonSit from '@/assets/halloween/skeleton-sit.png'
import tombstone from '@/assets/halloween/tombstone.png'
import shrub1 from '@/assets/misc/shrub1.png'
import tree1Halloween from '@/assets/misc/tree1-halloween.png'
import tree2Halloween from '@/assets/misc/tree2-halloween.png'
import type { RunnerName } from '@/data/runners'
import purpleSignHalloween from '../assets/signs/purple-sign-halloween.png'
import { PATH_BACK, PATH_FRONT, START_X, VERGE } from '../game/constants'
import { HALLOWEEN_FIKA } from '../game/fika'
import { type Gap, createTerrain, withGaps } from '../game/terrain'
import { SKELETON } from '../runners/bonus'
import { fullMoon } from './kit/fullMoon'
import {
	celticCross,
	graveLantern,
	ironRailings,
	leaningStone,
	mausoleum,
	sunkStone,
} from './kit/graveyard'
import {
	BANISTER,
	BOOKCASE,
	CHANDELIER,
	CHIMNEY,
	FRONT_DOOR,
	HALL_TILES,
	HOUSE_GHOST,
	PARLOUR_TILES,
	PORTRAIT,
	ROOF_BANDS,
	STAIRWELL_TILES,
	TOPPLED_CHAIR,
	TURRET,
	UPPER_TILES,
	armchair,
	bed,
	candelabra,
	fireplace,
	grandfatherClock,
	rockingHorse,
	trunk,
	wardrobe,
} from './kit/hauntedHouse'
import { seeded } from './kit/seeded'
import type {
	Boost,
	Cave,
	Course,
	CourseDefinition,
	HauntedHouse,
	Obstacle,
	PlatformDefinition,
	Scenery,
	SkyFlyer,
} from './types'

/**
 * Halloween Town: under a blood moon, through a graveyard. Open graves to
 * jump, tombstones with runners' names on, dead trees' branches, and
 * Zombies, club members risen from the grave, coming the wrong way, with
 * skeletons out running among everyone else. Pumpkins to wear, for speed,
 * each taking a knock for you.
 * Up on a hill, a haunted house, dark till you're in it: bats bursting out
 * of its door at you, and ghosts in every room, through the hall and the
 * parlour, up the stairs, and on along the upper floor, out through its
 * window, smashing it. Anyone who climbs on up into its attic, though,
 * meets what lives up there: and comes back up out of a grave past the
 * house, a ghost.
 * The Spook Bus behind.
 */

const CHEERERS: RunnerName[] = [
	'august',
	'lyra',
	'keith',
	'anna',
	'josh',
	'rick',
	'eline',
]

const STEP_M = 10
const DISTANCE_M = 5000
/** Made up: low, rolling ground, a little lumpy. */
const heights = Array.from({ length: DISTANCE_M / STEP_M + 1 }, (_, i) => {
	const m = i * STEP_M
	return 5 + 4 * Math.sin(m / 380 - 1.2) + 1.5 * Math.sin(m / 120)
})

/** Open graves, every so often, wider further round. */
function digGraves(): Gap[] {
	const random = seeded(1031)
	const graves: Gap[] = []
	for (let x = START_X + 1800; x < START_X + DISTANCE_M * 4 - 1200; ) {
		const progress = (x - START_X) / (DISTANCE_M * 4)
		const width = Math.round(100 + progress * 50 + random() * 30)
		graves.push({ from: x, to: x + width })
		x += 1900 + random() * 1400
	}
	return graves
}

// --- The haunted house, along the course ------------------------------------

/** Up the hill to it, from here, to its front door. */
const HILL_UP = 12100
const DOOR = 13100
/** Its rooms, one after another: the hall, from its door, then the parlour. */
const PARLOUR = 13600
/** Up the stairs, to its upper floor, and the landing at the top of them. */
const STAIRS = { from: 14100, to: 14400 }
const LANDING = STAIRS.to
/** The attic, over the upper floor's bedroom and nursery. */
const ATTIC = { from: 14600, to: 15400 }
const NURSERY = 15100
/** Its window, at the end of the upper floor: the way out. */
const WINDOW = 15500
/** The grave a ghost comes up out of, past the house. */
const GRAVE = WINDOW + 300
/** Down the hill again, from here to here. */
const HILL_DOWN = { from: WINDOW + 450, to: WINDOW + 1350 }

/** The hilltop, and the ground floor; and the upper floor. */
const G0 = 300
const G1 = G0 - 120
/** The ground floor's ceiling. */
const HALL_CEILING = G0 - 160
/** How high the attic's floor is over the upper floor, and how thick. */
const ATTIC_HEIGHT = 100
const ATTIC_FLOOR = 16
const ATTIC_TOP = G1 - ATTIC_HEIGHT
/** The roof, over the attic and the stairwell. */
const ROOF_IN = ATTIC_TOP - 140
/** Its roof's edge, over it all, at its highest, and at its ends. */
const EAVES = ROOF_IN - 50
const EAVES_END = HALL_CEILING - 120
/** How far in from its ends its roof rises to its highest. */
const ROOF_RISE = 140
/** How far down under the path its foundations go. */
const FOUNDATIONS = G0 + 44
/** Steps, this high each, up the stairs: low enough to run up. */
const STAIR_STEP = 8

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** The graveyard's own rolling ground, before the hill's put on it. */
const rolling = createTerrain(heights, STEP_M, DISTANCE_M)

/** The Ground: the graveyard's, and up the hill, and through the house on it. */
function groundY(x: number) {
	if (x < HILL_UP || x >= HILL_DOWN.to) return rolling.groundY(x)
	if (x < DOOR)
		return mix(rolling.groundY(x), G0, ease((x - HILL_UP) / (DOOR - HILL_UP)))
	if (x < STAIRS.from) return G0
	if (x < STAIRS.to) {
		const t = (x - STAIRS.from) / (STAIRS.to - STAIRS.from)
		return G0 - Math.round(((G0 - G1) * t) / STAIR_STEP) * STAIR_STEP
	}
	if (x < WINDOW) return G1
	if (x < HILL_DOWN.from) return G0
	return mix(
		G0,
		rolling.groundY(x),
		ease((x - HILL_DOWN.from) / (HILL_DOWN.to - HILL_DOWN.from)),
	)
}

/** How steep it really is at `x`. */
const steepness = (x: number) => (groundY(x + 4) - groundY(x - 4)) / 8
const onStairs = (x: number) => x >= STAIRS.from && x < STAIRS.to
/** Up and down the hill: steep to look at, but no harder going than the graveyard. */
const onHill = (x: number) =>
	(x >= HILL_UP && x < DOOR) || (x >= HILL_DOWN.from && x < HILL_DOWN.to)

/**
 * Open graves, but none on the hill, or near it: bar one at its foot, past
 * the house, for the Zombies past it to walk into, rather than on up the
 * hill and in through its window.
 */
const graves = [
	...digGraves().filter(
		(g) => g.to < HILL_UP - 600 || g.from > HILL_DOWN.to + 600,
	),
	{ from: HILL_DOWN.to + 360, to: HILL_DOWN.to + 490 },
].sort((a, b) => a.from - b.from)
const terrain = withGaps(
	{
		length: rolling.length,
		finishX: rolling.finishX,
		groundY,
		// Up the stairs, a little pull back, not every step's; and no slope
		// at all off the window's sill, only the drop.
		slope: (x) =>
			onStairs(x)
				? -0.05
				: Math.abs(x - WINDOW) < 6
					? 0
					: onHill(x)
						? steepness(x) * 0.7
						: steepness(x),
		tilt: (x) =>
			onStairs(x) ? -0.1 : Math.abs(x - WINDOW) < 6 ? 0 : steepness(x),
	},
	graves,
	[WINDOW],
)

/** Room left clear either side of a grave, to jump it from and land past it. */
const GRAVE_ROOM = 240
const nearGrave = (x: number) =>
	graves.some((g) => x > g.from - GRAVE_ROOM && x < g.to + GRAVE_ROOM)

/** Room left clear of Zombies either side of a branch. */
const BRANCH_ROOM = 600

/**
 * The panel on a tombstone's face, under its RIP, where a name goes: as the
 * website's tombstone sign has it, in the stone's own pixels.
 */
const TOMBSTONE_PANEL: [number, number, number, number] = [9, 22, 22, 22]

/** Leaves and grass in the dark: grey, dead, and hardly lit. */
const DEAD = 'grayscale(0.7) sepia(0.35) brightness(0.45)'

/** Room left clear up to the hill, and down off it: for a Zombie, plenty, as they walk. */
const HOUSE_ROOM = 200
const ZOMBIE_ROOM = 600
/** Whether `x` is on the hill, in the house, or near it, `room` either side. */
const nearHouse = (x: number, room = HOUSE_ROOM) =>
	x > HILL_UP - room && x < HILL_DOWN.from + room

// --- In the house -------------------------------------------------------------

/** The house as a Cave: dark till you're in, and then all of it, every floor, at once. */
function ceiling(x: number): number | undefined {
	if (x < DOOR || x >= WINDOW) return undefined
	if (x < STAIRS.from) return HALL_CEILING
	// Up the stairwell, and over the attic: the roof.
	if (x < ATTIC.to) return ROOF_IN
	// The nursery's end, past the attic: under the attic's floor, as the rest of it.
	return ATTIC_TOP + ATTIC_FLOOR
}

/** Its roof's edge: up steep from either end, flat along the top. */
function roof(x: number): number | undefined {
	if (x < DOOR || x >= WINDOW) return undefined
	const fromEnd = Math.min(x - DOOR, WINDOW - x)
	return Math.round(mix(EAVES_END, EAVES, ease(fromEnd / ROOF_RISE)) / 2) * 2
}

/** Where a feature's top is to go, `top`, for one stood behind the path at `x`, `height` tall. */
const behind = (x: number, height: number, top: number) =>
	top - groundY(x) + PATH_BACK + height

/** Something hung on the wall, `art`'s top at `top`, its middle at `x`. */
const hung =
	(art: { asset: string; width: number; height: number }) =>
	(x: number, top: number) => ({
		asset: art.asset,
		x,
		width: art.width,
		height: art.height,
		on: 'behind' as const,
		sink: behind(x, art.height, top),
	})
const portrait = hung(PORTRAIT)

const house: Cave = {
	from: DOOR,
	to: WINDOW,
	ceiling,
	surface: roof,
	foot: (x) => (x >= DOOR && x < WINDOW ? FOUNDATIONS : undefined),
	features: [
		// Its front door, seen from outside, and gone once someone's in.
		{
			asset: FRONT_DOOR.asset,
			x: DOOR + FRONT_DOOR.width / 2 + 8,
			width: FRONT_DOOR.width,
			height: FRONT_DOOR.height,
			on: 'behind',
			sink: behind(
				DOOR + 40,
				FRONT_DOOR.height,
				G0 - PATH_BACK - FRONT_DOOR.height,
			),
			outside: true,
		},
		// On its roof: a turret over the stairwell, a chimney over the parlour.
		{
			asset: TURRET.asset,
			x: (STAIRS.from + STAIRS.to) / 2,
			width: TURRET.width,
			height: TURRET.height,
			on: 'surface',
			sink: 8,
		},
		{
			asset: CHIMNEY.asset,
			x: PARLOUR + 260,
			width: CHIMNEY.width,
			height: CHIMNEY.height,
			on: 'surface',
			sink: 8,
		},
		// Up the stairs, its banister; a chandelier over them.
		{
			asset: BANISTER.asset,
			x: (STAIRS.from + STAIRS.to) / 2,
			width: BANISTER.width,
			height: BANISTER.height,
			on: 'behind',
			sink: behind(
				(STAIRS.from + STAIRS.to) / 2,
				BANISTER.height,
				G0 - PATH_BACK - BANISTER.height,
			),
		},
		hung(CHANDELIER)(LANDING - 60, ROOF_IN + 4),
		// Portraits, the family's, all the way along.
		portrait(DOOR + 330, HALL_CEILING + 30),
		portrait(PARLOUR + 120, HALL_CEILING + 30),
		portrait(PARLOUR + 380, HALL_CEILING + 30),
		portrait(STAIRS.from + 60, G0 - 160),
		portrait(LANDING + 140, G1 - 150),
		portrait(NURSERY + 60, G1 - 72),
	],
}

/** A ghost, bobbing between `low` and `high` over the Ground (its bottom): a Germ, drawn as one (see `look.germ`). */
const ghostAt = (x: number, low = 4, high = 84): Obstacle => ({
	kind: 'germ',
	x,
	low,
	high,
})
/** Under the attic's floor, low enough to duck under, no higher than there's room. */
const UNDER_ATTIC = [34, 42] as const
/** Up in the attic, over its floor. */
const IN_ATTIC = [ATTIC_HEIGHT + 4, ATTIC_HEIGHT + 64] as const

const HOUSE_OBSTACLES: Obstacle[] = [
	// The hall.
	ghostAt(DOOR + 240),
	{ kind: 'rock', x: DOOR + 420 },
	// The parlour.
	ghostAt(PARLOUR + 160),
	{ kind: 'rock', x: PARLOUR + 290 },
	ghostAt(PARLOUR + 420, 44, 100),
	// Up the stairs.
	ghostAt(STAIRS.from + 170, 8, 80),
	// The bedroom, and the nursery, under the attic.
	ghostAt(ATTIC.from + 140, ...UNDER_ATTIC),
	{ kind: 'rock', x: ATTIC.from + 330 },
	ghostAt(NURSERY + 120, ...UNDER_ATTIC),
	// Up in the attic: more of them, on the way to what's at the end of it.
	ghostAt(ATTIC.from + 160, ...IN_ATTIC),
	ghostAt(ATTIC.from + 400, ...IN_ATTIC),
]

const HOUSE_BOOSTS: Boost[] = [
	{ kind: 'fika', x: DOOR + 120, height: 26, item: 'toffeeApple' },
	{ kind: 'fika', x: PARLOUR + 220, height: 95, item: 'spiderCupcake' },
	{ kind: 'fika', x: STAIRS.from + 240, height: 60, item: 'candyfloss' },
	{ kind: 'fika', x: NURSERY + 260, height: 26, item: 'chokladboll' },
	// Up in the attic, to lure you on up.
	{
		kind: 'fika',
		x: ATTIC.from + 280,
		height: ATTIC_HEIGHT + 26,
		item: 'spiderCupcake',
	},
	{
		kind: 'fika',
		x: ATTIC.from + 520,
		height: ATTIC_HEIGHT + 26,
		item: 'toffeeApple',
	},
]

/**
 * Three bookcases on the landing, side by side, right up against the
 * attic's floor, to climb up into it by; and the attic's floor, over the
 * upper floor.
 */
const HOUSE_PLATFORMS: PlatformDefinition[] = [
	...[3, 2, 1].map((n) => ({
		x: ATTIC.from - n * BOOKCASE.width,
		width: BOOKCASE.width,
		height: BOOKCASE.height - BOOKCASE.top,
		art: BOOKCASE,
	})),
	{
		x: ATTIC.from,
		width: ATTIC.to - ATTIC.from,
		height: ATTIC_HEIGHT,
		solid: ATTIC_FLOOR,
		depth: ATTIC_FLOOR,
	},
]

/** What's in the house, stood on its floors against its walls. */
function houseScenery(): Scenery[] {
	const pieces: Scenery[] = []
	const inside = (x: number, asset: string) =>
		pieces.push({ x, asset, scale: 2, setBack: -2, onFloor: true })
	// The hall.
	inside(DOOR + 80, grandfatherClock)
	inside(DOOR + 340, candelabra)
	// The parlour.
	inside(PARLOUR + 80, armchair)
	inside(PARLOUR + 240, fireplace)
	inside(PARLOUR + 460, candelabra)
	// The bedroom, and the nursery.
	inside(ATTIC.from + 60, wardrobe)
	inside(ATTIC.from + 220, bed)
	inside(NURSERY + 40, rockingHorse)
	inside(NURSERY + 200, armchair)
	// The attic: old trunks.
	pieces.push({
		x: ATTIC.from + 60,
		asset: trunk,
		scale: 2,
		setBack: -2 + ATTIC_HEIGHT,
	})
	// Past it: the grave a ghost comes back up out of, its stone over it.
	pieces.push({
		x: GRAVE + 20,
		asset: tombstone,
		scale: 2,
		carved: TOMBSTONE_PANEL,
		filter: 'brightness(0.8)',
	})
	return pieces
}

/** The house, for its moving parts and its monster (see `HauntedHouse`). */
const HAUNTED: HauntedHouse = {
	door: DOOR,
	bats: 260,
	window: { x: WINDOW, floor: G1 },
	monster: { x: ATTIC.to - 90, floor: ATTIC_TOP, reach: 80 },
	grave: GRAVE,
}

/** A stretch this long without a Zombie gets one more, in its middle. */
const LONG_WITHOUT_ZOMBIES = 1340
/** How far short of a grave a Zombie turns round. */
const ZOMBIE_TURN = 40

/**
 * Where a Zombie rising at `x` walks, to and fro: between the graves either
 * side of it, and short of the hill, if it's before the house. `_skeleton`
 * is the random number that once made one in five of them skeletons: drawn
 * still, so every Zombie after it stays where it was.
 */
function zombieRange(x: number, _skeleton?: number): [number, number] {
	const before = graves.filter((g) => g.to <= x).at(-1)
	const after = graves.find((g) => g.from >= x)
	const from = before ? before.to + ZOMBIE_TURN : START_X
	let to = after ? after.from - ZOMBIE_TURN : terrain.finishX
	if (x < HILL_UP) to = Math.min(to, HILL_UP - ZOMBIE_ROOM)
	return [Math.round(from), Math.round(to)]
}

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(3110)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		const roll = random()
		if (nearGrave(x)) {
			// Nothing on the edge of a grave: on past it.
		} else if (roll < 0.28) obstacles.push({ kind: 'tombstone', x })
		else if (roll < 0.42) obstacles.push({ kind: 'branch', x })
		else if (roll < 0.74)
			boosts.push({ kind: 'pumpkin', x, carving: 1 + Math.floor(random() * 5) })
		else if (roll < 0.86)
			boosts.push({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				item: HALLOWEEN_FIKA[fika++ % HALLOWEEN_FIKA.length],
			})
		else
			boosts.push({
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			})
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (520 - progress * 260)
	}
	// Not the last Pumpkin: it was so near the line, past the last Zombie,
	// that finishing in one (the special goal, before the haunted house)
	// was hardly a challenge.
	for (let i = boosts.length - 1; i >= 0; i--)
		if (boosts[i].kind === 'pumpkin') {
			boosts.splice(i, 1)
			break
		}

	// Zombies, every so often, more the further round: their own random
	// numbers, so the rest stays where it is. Where they rise: they walk
	// towards you once you're near, and turn round short of a grave, to and
	// fro (see `zombieAt`); and short of the hill, any before the house.
	// None by a branch: jumping one and ducking the other at once is too
	// much.
	const shamble = seeded(1313)
	const nearBranch = (x: number) =>
		obstacles.some(
			(o) => o.kind === 'branch' && Math.abs(o.x - x) < BRANCH_ROOM,
		)
	for (let at = START_X + 1500; at < terrain.finishX; ) {
		if (!nearGrave(at) && !nearBranch(at) && !nearHouse(at, ZOMBIE_ROOM))
			obstacles.push({
				kind: 'zombie',
				x: Math.round(at),
				// Some club member, risen.
				who: Math.floor(shamble() * 1000),
				range: zombieRange(at, shamble()),
			})
		const progress = (at - START_X) / terrain.length
		at += 1300 + shamble() * (800 - progress * 300)
	}
	// Hands under the graveyard, here and there: their own random numbers
	// too, and clear of the graves and of anything else in the way.
	const grasp = seeded(1666)
	for (let at = START_X + 2400; at < terrain.finishX - 800; ) {
		const x = Math.round(at)
		const crowded = [...obstacles, ...boosts].some(
			(o) => Math.abs(o.x - x) < 100,
		)
		if (!nearGrave(x) && !crowded && !nearHouse(x))
			obstacles.push({ kind: 'hands', x })
		at += 900 + grasp() * 900
	}
	// More Zombies, in place of the skeletons there were among them: one in
	// the middle of each long stretch without one (either side of the
	// house), at the nearest spot there that's clear of the graves, the
	// branches and anything else in the way. Their own random numbers for
	// who they were, so nothing else moves.
	const rise = seeded(1919)
	const clear = (x: number) =>
		!nearGrave(x) &&
		!nearBranch(x) &&
		!nearHouse(x, ZOMBIE_ROOM) &&
		![...obstacles, ...boosts].some((o) => Math.abs(o.x - x) < 80)
	const risen = obstacles.filter((o) => o.kind === 'zombie').map((o) => o.x)
	const ends = [
		START_X + 1500,
		...risen,
		HILL_UP - ZOMBIE_ROOM,
		HILL_DOWN.to + ZOMBIE_ROOM,
		terrain.finishX - 600,
	].sort((a, b) => a - b)
	for (const [i, from] of ends.entries()) {
		const to = ends[i + 1]
		if (to === undefined || to - from < LONG_WITHOUT_ZOMBIES) continue
		if (from >= HILL_UP - ZOMBIE_ROOM && to <= HILL_DOWN.to + ZOMBIE_ROOM)
			continue
		const middle = Math.round((from + to) / 2)
		const x = Array.from(
			{ length: 41 },
			(_, k) => middle + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 20,
		).find(clear)
		if (x !== undefined)
			obstacles.push({
				kind: 'zombie',
				x,
				who: Math.floor(rise() * 1000),
				range: zombieRange(x),
			})
	}

	// Nothing of the graveyard's up the hill, or in the house.
	const outside = <T extends { x: number }>(all: T[]) =>
		all.filter((o) => !nearHouse(o.x))
	const laidOut = {
		obstacles: [...outside(obstacles), ...HOUSE_OBSTACLES].sort(
			(a, b) => a.x - b.x,
		),
		boosts: [...outside(boosts), ...HOUSE_BOOSTS].sort((a, b) => a.x - b.x),
	}

	// A graveyard along the path: dead trees, headstones, and occasionally a
	// skeleton sat down for a rest. No pumpkins: they're to be worn, so none
	// back here to be mistaken for one.
	const scenery: Course['scenery'] = []
	const pieces = [
		{ asset: tree1Halloween, filter: 'brightness(0.7)' },
		{ asset: tree2Halloween, filter: 'brightness(0.6)' },
		{ asset: tree2Halloween, filter: 'brightness(0.7)' },
		// Twice the size of the ones on the path, with someone's name on.
		{
			asset: tombstone,
			scale: 2,
			carved: TOMBSTONE_PANEL,
			filter: 'brightness(0.8)',
		},
		{
			asset: tombstone,
			scale: 2,
			carved: TOMBSTONE_PANEL,
			filter: 'brightness(0.68)',
		},
		{ asset: shrub1, filter: DEAD },
		{ asset: skeletonSit, scale: 2 },
	]
	for (let at = -400; at < terrain.finishX + 900; at += 70 + random() * 200) {
		const piece = pieces[Math.floor(random() * pieces.length)]
		// None in the house, nor in the way of the grave past it.
		const x = Math.round(at)
		if ((x > DOOR - 60 && x < WINDOW + 60) || Math.abs(x - GRAVE) < 60) continue
		scenery.push({ x, ...piece })
	}
	return {
		...laidOut,
		scenery: [...scenery, ...moreGraveyard(), ...houseScenery()],
	}
}

/**
 * More of the graveyard, in between: crosses, old stones leaning and sunk,
 * railings, lanterns, and occasionally a mausoleum. Their own random
 * numbers, so everything else is where it was.
 */
function moreGraveyard(): Course['scenery'] {
	const random = seeded(3110)
	const pieces = [
		{ asset: celticCross, filter: 'brightness(0.75)' },
		{ asset: leaningStone, filter: 'brightness(0.7)' },
		{ asset: sunkStone, filter: 'brightness(0.65)' },
		{ asset: ironRailings },
		{ asset: graveLantern },
		{ asset: leaningStone, filter: 'brightness(0.6)' },
		{ asset: sunkStone, filter: 'brightness(0.75)' },
	]
	const out: Course['scenery'] = []
	let n = 0
	for (let at = -200; at < terrain.finishX + 900; at += 120 + random() * 260) {
		const x = Math.round(at)
		if ((x > DOOR - 160 && x < WINDOW + 160) || Math.abs(x - GRAVE) < 120)
			continue
		const piece =
			n++ % 14 === 7
				? { asset: mausoleum, filter: 'brightness(0.75)' }
				: pieces[Math.floor(random() * pieces.length)]
		out.push({ x, scale: 2, ...piece })
	}
	return out
}

/**
 * The Ground's colours, outside and in: the graveyard's path (the course's
 * own colours, as the palette has them), and the house's floorboards, up
 * its stairs, and out again past it.
 */
const FLOORS: [x: number, colours: [string, string, string, string]][] = [
	[-2000, ['#2c3427', '#413126', '#5e4938', '#20271c']],
	[DOOR, ['#2c3427', '#2b1f19', '#5a4130', '#7a5a42']],
	[STAIRS.from, ['#2c3427', '#2b1f19', '#4a3426', '#7a5a42']],
	[STAIRS.to, ['#2c3427', '#2b1f19', '#5a4130', '#7a5a42']],
	[WINDOW, ['#2c3427', '#413126', '#5e4938', '#20271c']],
]
const strip = (id: string, layer: number) => ({
	id,
	stops: FLOORS.map(([x, colours]): [number, string] => [x, colours[layer]]),
})

const ghost = (asset: string): SkyFlyer => ({
	asset,
	width: 32,
	height: 50,
	count: 1,
	seconds: 34,
	bob: 18,
	band: [70, 190],
	opacity: 0.7,
})

export const halloweenTown: CourseDefinition = {
	id: 'halloween-town',
	name: 'Halloween Town',
	blurb:
		'Under a blood moon: open graves, Zombies coming at you, Pumpkins to wear, and a haunted house up on the hill.',
	terrain,
	cave: house,
	platforms: HOUSE_PLATFORMS,
	haunted: HAUNTED,
	// Up into the haunted house's attic, killed by what's up there, and
	// back up out of a grave as a ghost. And with that, the Skeleton's
	// yours to run as.
	special: {
		goal: 'Become a ghost',
		done: (run) => !!run.ghost,
		unlocks: SKELETON.id,
	},
	runDirectors: ['august', 'keith'],
	cheerers: CHEERERS,
	// Skeletons, out for a run with everyone else.
	skeletons: 0.3,
	look: {
		palette: {
			'--sky-blue-top': '#0a0617',
			'--sky-blue-bottom': '#41122d',
			'--grass-green': '#2c3427',
			'--grass-dark-green': '#20271c',
			'--grass-darker-green': '#12170f',
			'--dirt-brown': '#5e4938',
			'--dirt-dark-brown': '#413126',
			'--dirt-darker-brown': '#231a12',
			'--hud-ink': '#f3e9ff',
			'--hud-shadow':
				'2px 0 #1b1530, -2px 0 #1b1530, 0 2px #1b1530, 0 -2px #1b1530',
		},
		hills: [
			'brightness(0.28) saturate(0.6) hue-rotate(230deg)',
			'brightness(0.24) saturate(0.6) hue-rotate(260deg)',
			'brightness(0.42) saturate(0.45)',
		],
		// A blood moon, full, glowing.
		sunAsset: fullMoon,
		sunScale: 2,
		sun: 'brightness(0.62) sepia(1) saturate(9) hue-rotate(-42deg) drop-shadow(0 0 10px #ff2a12)',
		clouds: 'brightness(0.3) saturate(0.5)',
		lightning: true,
		skyFlyers: [
			{
				asset: batAsset,
				width: 13,
				height: 9,
				frames: 2,
				scale: 2,
				count: 8,
				seconds: 11,
				bob: 14,
				band: [60, 230],
			},
			ghost(ghost1),
			ghost(ghost2),
			ghost(ghost3),
			ghost(ghost4),
		],
		foliage: DEAD,
		// Open graves, down into hell: earth at their rim, then fire, glowing
		// brighter the further down.
		gap: 'linear-gradient(to bottom, #2a1d12 0 8px, #3a0805 8px, #8a1a08 34px, #e0480f 70px, #ff9a1f 110px)',
		pitFire: true,
		far: [
			{ asset: tree2Halloween, height: 110, filter: 'brightness(0.3)' },
			{ asset: tree1Halloween, height: 120, filter: 'brightness(0.3)' },
			{ asset: tree2Halloween, height: 110, filter: 'brightness(0.25)' },
		],
		near: [
			{ asset: tree1Halloween, height: 120, filter: 'brightness(0.5)' },
			{ asset: tree2Halloween, height: 110, filter: 'brightness(0.5)' },
			{ asset: tombstone, height: 67, filter: 'brightness(0.45)' },
		],
		horizonTrees: [tree1Halloween, tree2Halloween],
		// The haunted house: its siding, room by room its walls inside, and
		// its slate roof.
		cave: {
			rock: '#3d3448',
			seam: '#2c2535',
			edge: 'rgba(10, 4, 16, 0.45)',
			wall: '#33402f',
			grass: '#2a2233',
			road: ROOF_BANDS,
			tiles: HALL_TILES,
			zones: [
				{ from: PARLOUR, tiles: PARLOUR_TILES },
				{ from: STAIRS.from, tiles: STAIRWELL_TILES },
				{ from: ATTIC.from, tiles: UPPER_TILES },
			],
		},
		// Its floorboards, and the attic's.
		strips: [
			strip('h-verge', 0),
			strip('h-back', 1),
			strip('h-path', 2),
			strip('h-edge', 3),
		],
		ground: [
			[-PATH_BACK - VERGE, 'url(#h-verge)'],
			[-PATH_BACK, 'url(#h-back)'],
			[-PATH_BACK + 5, 'url(#h-path)'],
			[PATH_FRONT, 'url(#h-edge)'],
			[PATH_FRONT + 2, '#2c3427'],
		],
		platform: {
			top: '#6b4a33',
			face: '#3e2a1e',
			edge: '#22170f',
			depth: ATTIC_FLOOR,
		},
		// Ghosts, in place of Germs, and toppled chairs in place of rocks.
		germ: HOUSE_GHOST,
		rocks: [{ ...TOPPLED_CHAIR, from: DOOR, to: WINDOW }],
		sign: purpleSignHalloween,
		// Gold doesn't show on its orange: black, as on the website.
		signInk: '#1a1208',
		bus: { spooky: true },
	},
	...layOut(),
}
