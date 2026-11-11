import type { RunnerName } from '@/data/runners'
import busBody from '../assets/bus/bus.png'
import drill1 from '../assets/bus/drill-1.png'
import drill2 from '../assets/bus/drill-2.png'
import scoop from '../assets/bus/scoop.png'
import windows from '../assets/bus/windows.png'
import oldTownFar from '../assets/horizons/old-town-far.png'
import oldTownNear from '../assets/horizons/old-town-near.png'
import lamp from '../assets/scenery/lamp.png'
import {
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	START_X,
	VERGE,
} from '../game/constants'
import { SEWER_FINDS } from '../game/fika'
import { type Gap, type Terrain, withGaps } from '../game/terrain'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import {
	DUCK_SIGN_HEIGHT,
	DUCK_SIGN_WIDTH,
	ROAD_BLOCK_HEIGHT,
	ROAD_BLOCK_WIDTH,
	archway,
	cone,
	crates,
	drumFire,
	duckSign,
	houses,
	lanternPole,
	manholeShaft,
	pipes,
	roadBlock,
	roadworksSign,
	scaffolding,
	shack,
	stall,
	tallShack,
	ventShaft,
} from './kit/sewerScenery'
import { swing } from './kit/swing'
import type {
	Boost,
	Cave,
	Course,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
} from './types'

/**
 * The Sewers: along a street on a bright day, till a road block, and the
 * only way on is down an open manhole, the bus digging down through the road
 * after you. Under the street, the sewer's tunnels, Tunnels to slide
 * through, and then the caverns: a building site and a whole town gone underground, catwalks to
 * run along at different levels, girders swinging across on cables, Swamp
 * Men rising out of the sludge to grab you, and Sewage Drains pouring what's
 * washed down off the street, in waves. Out of it at last up a Giant Vent,
 * which fires you back up onto the road to the finish.
 */

const CHEERERS: RunnerName[] = [
	'august',
	'lyra',
	'keith',
	'anna',
	'rick',
	'eline',
	'josh',
]

const DISTANCE_M = 5000
const FINISH = START_X + DISTANCE_M * PX_PER_M

/**
 * The sewer's floor, the lowest the course goes, and the street, this far
 * over it: deep enough that, down there, the street's out of sight overhead.
 */
const FLOOR = GROUND_Y
const DEPTH = 700
const STREET = FLOOR - DEPTH

/** The manhole: where the street drops away, and how wide it's open. */
const MANHOLE = START_X + 1200
const HOLE = 220
/** Where the sewer starts, the far side of the manhole, under the road block. */
const MOUTH = MANHOLE + HOLE
/** How thick the street is, at its thinnest, over the sewer. */
const CRUST = 44

/** How high the rock is over the floor: in a tunnel, a Tunnel, and in a cavern. */
const TUNNEL = 240
const SLIDE = 30
const CAVERN = 560
/** Right up under the street, under the manhole and before the Giant Vent. */
const HALL = DEPTH - CRUST
/** How far a cavern's roof takes to rise from a tunnel's, and fall back. */
const CAVERN_RAMP = 260
/**
 * Under the manhole, how long its hall stays high, for falling into, before
 * it comes down to a tunnel's; and how long that takes, there and back up
 * before the Giant Vent.
 */
const LANDING = 500
const HALL_RAMP = 400

type Kind = 'hall' | 'tunnel' | 'slide' | 'cavern'
interface Section {
	kind: Kind
	from: number
	to: number
}

/** The sewer, one stretch after another, from under the manhole to the Giant Vent. */
const SECTIONS: Section[] = (() => {
	const plan: [Kind, number][] = [
		['hall', LANDING + HALL_RAMP],
		['tunnel', 900],
		['slide', 320],
		['tunnel', 800],
		['cavern', 4600],
		['tunnel', 700],
		['slide', 420],
		['tunnel', 700],
		['cavern', 5200],
		['tunnel', 900],
		['hall', HALL_RAMP + 100],
	]
	let at = MOUTH
	return plan.map(([kind, length]) => {
		const from = at
		at += length
		return { kind, from, to: at }
	})
})()
const sectionAt = (x: number) => SECTIONS.find((s) => x >= s.from && x < s.to)
const [CAVERN_A, CAVERN_B] = SECTIONS.filter((s) => s.kind === 'cavern')

/** Where the sewer ends: its last hall opening into the Giant Vent's shaft. */
const SEWER_END = SECTIONS[SECTIONS.length - 1].to
/** The Giant Vent, and the street's edge it fires you up and over. */
const VENT = SEWER_END + 160
const EXIT = VENT + 400

/**
 * Channels of sludge across the second cavern's floor: one to jump, two
 * too wide to, with a girder swinging across each, or ways over them up on
 * the catwalks.
 */
const CHANNELS: Gap[] = [
	[700, 140],
	[1500, 380],
	[3000, 400],
].map(([at, width]) => ({
	from: CAVERN_B.from + at,
	to: CAVERN_B.from + at + width,
}))

/**
 * The street, flat, and the sewer's floor, flat, under it: the manhole a
 * drop down, and the street's edge past the Giant Vent a Wall up.
 */
const terrain: Terrain = withGaps(
	{
		length: FINISH - START_X,
		finishX: FINISH,
		groundY: (x) => (x < MANHOLE || x >= EXIT ? STREET : FLOOR),
		slope: () => 0,
	},
	CHANNELS,
	[MANHOLE, EXIT],
)

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/** How high the rock is over the floor at `x`: none outside the sewer. */
function headroom(x: number) {
	const section = sectionAt(x)
	if (!section) return undefined
	const { kind, from, to } = section
	if (kind === 'slide') return SLIDE
	// Brick, level all the way.
	if (kind === 'tunnel') return TUNNEL
	if (kind === 'hall') {
		// Under the manhole, down to a tunnel's; before the Giant Vent, up from it.
		const t =
			from === MOUTH
				? (x - from - LANDING) / HALL_RAMP
				: 1 - (x - from) / HALL_RAMP
		return Math.round((HALL - (HALL - TUNNEL) * ease(t)) / 4) * 4
	}
	const rise = Math.min(x - from, to - x) / CAVERN_RAMP
	return Math.round((TUNNEL + (CAVERN - TUNNEL) * ease(rise)) / 8) * 8
}

/** The road over the sewer: its pavement, its road, and its kerb, as the street's own. */
const PAVEMENT = '#a7a49b'
const ROAD_EDGE = '#3d3f45'
const ROAD = '#55585f'
const KERB = '#c2c0b8'
/** The sewer's bricks, their mortar, and the light catching their top edges. */
const BRICK = '#7a4a36'
const MORTAR = '#3b2a22'
const BRICK_LIT = '#93604a'

const sewer: Cave = {
	from: MOUTH,
	to: SEWER_END,
	ceiling: (x) => {
		const room = headroom(x)
		return room === undefined ? undefined : FLOOR - room
	},
	// The street over it, the back of its pavement.
	surface: (x) =>
		x >= MOUTH && x < SEWER_END ? STREET - PATH_BACK - VERGE : undefined,
	// Brick all the way down in front of it.
	foot: (x) => (x >= MOUTH && x < SEWER_END ? FLOOR + 200 : undefined),
	features: [
		// The road block across the street, just past the manhole.
		{
			asset: roadBlock,
			x: MOUTH + ROAD_BLOCK_WIDTH / 2 + 10,
			width: ROAD_BLOCK_WIDTH,
			height: ROAD_BLOCK_HEIGHT,
			sink: VERGE + PATH_BACK,
		},
		// Down the manhole: brick, and a ladder.
		{
			asset: manholeShaft(HOLE, DEPTH),
			x: MANHOLE + HOLE / 2,
			width: HOLE,
			height: DEPTH,
			on: 'behind',
		},
		// Up the Giant Vent: a great duct, up to the street.
		{
			asset: ventShaft(EXIT - SEWER_END, DEPTH),
			x: (SEWER_END + EXIT) / 2,
			width: EXIT - SEWER_END,
			height: DEPTH,
			on: 'behind',
		},
		// Over each Tunnel's way in: a striped lintel and a sign, DUCK!
		...SECTIONS.filter((s) => s.kind === 'slide').map((slide) => ({
			asset: duckSign(SLIDE + PATH_FRONT),
			x: slide.from + DUCK_SIGN_WIDTH / 2,
			width: DUCK_SIGN_WIDTH,
			height: DUCK_SIGN_HEIGHT,
			on: 'path' as const,
		})),
	],
}

/**
 * Where the bus digs its own way: down through the road from just past the
 * start, after whoever's about to go down the manhole, its drill on; and
 * back up through it again past the Giant Vent.
 */
const DIG_FROM = START_X - 100
const DIG_DOWN = MANHOLE + 60
const DIG_UP = 1400
function busFloor(x: number) {
	if (x >= DIG_FROM && x < MOUTH)
		return STREET + DEPTH * ease((x - DIG_FROM) / (DIG_DOWN - DIG_FROM))
	if (x >= EXIT && x < EXIT + DIG_UP)
		return FLOOR - DEPTH * ease((x - EXIT) / DIG_UP)
	return undefined
}

/**
 * How high each catwalk is over the floor, one over another: near enough
 * together to jump up from one onto the next.
 */
const LEVEL = 80
const LEVEL_1 = LEVEL
const LEVEL_2 = LEVEL * 2
const LEVEL_3 = LEVEL * 3
const LEVEL_4 = LEVEL * 4
const LEVEL_5 = LEVEL * 5
/** A girder, swinging across a gap, and a lift, going up and down. */
const GIRDER = 160
const LIFT = 110
/**
 * How long a girder takes to swing across and back, or a lift up and down;
 * quicker just over the floor, where there's no other way across.
 */
const SWING = 190
const LOW_SWING = 150

/** A catwalk, `height` over the floor, from `from` to `to`. */
const catwalk = (
	from: number,
	to: number,
	height: number,
): PlatformDefinition => ({ x: from, width: to - from, height })
/** A girder swinging across from `from` to `to`, `height` up, timed for whoever's coming. */
const girder = (
	from: number,
	to: number,
	height: number,
): PlatformDefinition => ({
	x: from,
	width: GIRDER,
	height,
	move: swing(
		from,
		{ x: to - from - GIRDER },
		height < LEVEL_1 / 2 ? LOW_SWING : SWING,
	),
})
/** A lift at `x`, from `from` up to `to`, and down again, timed for whoever's coming. */
const lift = (x: number, from: number, to: number): PlatformDefinition => ({
	x,
	width: LIFT,
	height: from,
	move: swing(x, { y: to - from + 6 }, SWING),
})

/**
 * The first cavern, a building site: the floor, with its Swamp Men and
 * Sewage Drains; or up off it onto the catwalks, a jump at a time, five
 * high, staggered so there's always one to jump up onto, or drop down to. A
 * girder swinging across a gap in the lowest, and a lift up two at once.
 */
function cavernA(at: number): PlatformDefinition[] {
	return [
		catwalk(at + 300, at + 1500, LEVEL_1),
		girder(at + 1500, at + 1900, LEVEL_1),
		catwalk(at + 1900, at + 2900, LEVEL_1),
		lift(at + 2900, LEVEL_1, LEVEL_3),
		catwalk(at + 700, at + 1300, LEVEL_2),
		catwalk(at + 2100, at + 2700, LEVEL_2),
		catwalk(at + 3010, at + 3900, LEVEL_2),
		catwalk(at + 1100, at + 1900, LEVEL_3),
		catwalk(at + 2500, at + 3400, LEVEL_3),
		catwalk(at + 1500, at + 2300, LEVEL_4),
		catwalk(at + 3100, at + 3700, LEVEL_4),
		// Right up at the top, where the fika is.
		catwalk(at + 1900, at + 2700, LEVEL_5),
	]
}

/**
 * The second cavern, a town underground: channels of sludge across its
 * floor, girders swinging across the wide ones level with it; or up over
 * them, a jump at a time onto the catwalks, and a girder swinging high over
 * the second; or up the scaffolding to one lower down.
 */
function cavernB(at: number): PlatformDefinition[] {
	const [, second, third] = CHANNELS
	return [
		// Low, across the channels, level with the floor: onto one while
		// it's there, or wait for it.
		girder(second.from, second.to, 0),
		girder(third.from, third.to, 0),
		// Up over the first wide one, and on up.
		catwalk(at + 1150, at + 2300, LEVEL_1),
		catwalk(at + 1700, at + 2600, LEVEL_2),
		catwalk(at + 2200, third.from, LEVEL_3),
		// High over the second.
		girder(third.from, third.to + 160, LEVEL_3),
		catwalk(third.to + 160, third.to + 900, LEVEL_3),
		// Or up the scaffolding, a plank at a time, and across it lower down.
		catwalk(third.from - 340, third.from - 240, LEVEL_1),
		catwalk(third.from - 230, third.from - 120, LEVEL_2),
		girder(third.from - 110, third.to + 10, LEVEL_2),
		catwalk(third.to + 10, third.to + 520, LEVEL_2),
	]
}

const PLATFORMS = [...cavernA(CAVERN_A.from), ...cavernB(CAVERN_B.from)]

/** The first cavern's Swamp Men and Sewage Drains, along its floor; and the second's. */
const SWAMP_MEN = [
	...[700, 1300, 2100, 2700, 3400, 4000].map((x) => CAVERN_A.from + x),
	...[400, 1000, 2450, 3750, 4250, 4750].map((x) => CAVERN_B.from + x),
]
const DRAINS = [
	...[1100, 2400, 3200, 4200].map((x) => CAVERN_A.from + x),
	...[2050, 3650, 4500].map((x) => CAVERN_B.from + x),
]

/** On the street, before the roadworks or after the Giant Vent, clear of both. */
const onStreet = (x: number) =>
	x < MANHOLE - 420 || (x > EXIT + 400 && x < FINISH - 400)

/** In a plain tunnel, well clear of a Tunnel's mouth and the caverns either end. */
const inTunnel = (x: number) => {
	const section = sectionAt(x)
	if (section?.kind !== 'tunnel') return false
	// Further from a Tunnel coming up: jumping something at speed, they'd
	// come down in its mouth, too low to stand in.
	const next = SECTIONS[SECTIONS.indexOf(section) + 1]
	const before = next?.kind === 'slide' ? 480 : 220
	return x > section.from + 220 && x < section.to - before
}

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(1984)
	let fika = 0
	// Not fika down here: what's been lost down the drains.
	const nextFika = () => SEWER_FINDS[fika++ % SEWER_FINDS.length]
	const cheer = (x: number): Boost => ({
		kind: 'cheer',
		x,
		member: CHEERERS[Math.floor(random() * CHEERERS.length)],
	})
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		clear: (x) => onStreet(x) || inTunnel(x),
		pick: (x): Obstacle | Boost => {
			const roll = random()
			if (onStreet(x)) {
				if (roll < 0.28)
					return { kind: 'pothole', x, width: 50 + Math.round(random() * 30) }
				if (roll < 0.44)
					return { kind: 'geese', x, count: 2 + Math.floor(random() * 3) }
				if (roll < 0.56) {
					// Round and round the street they're on, never down the manhole.
					const [from, to] =
						x < MANHOLE ? [START_X + 300, MANHOLE - 200] : [EXIT + 200, FINISH]
					return {
						kind: 'cyclist',
						x,
						loop: [Math.max(from, x - 700), Math.min(to, x + 400)],
					}
				}
				// Steam off the sewers, up through a grate.
				if (roll < 0.66) return { kind: 'steam', x }
				if (roll < 0.86)
					return {
						kind: 'fika',
						x,
						height: random() < 0.5 ? 26 : 95,
						item: nextFika(),
					}
				return cheer(x)
			}
			// Rubble, puddles of sludge, and now and then a Swamp Man.
			if (roll < 0.34) return { kind: 'rock', x }
			if (roll < 0.58)
				return { kind: 'mud', x, width: 70 + Math.round(random() * 50) }
			if (roll < 0.68) return { kind: 'swampman', x }
			if (roll < 0.88) return { kind: 'fika', x, height: 26, item: nextFika() }
			return cheer(x)
		},
	})

	for (const x of SWAMP_MEN) obstacles.push({ kind: 'swampman', x })
	for (const x of DRAINS) obstacles.push({ kind: 'sewage', x })
	obstacles.push({ kind: 'steam', x: VENT, giant: true })
	obstacles.sort((a, b) => a.x - b.x)

	// Fika up on the catwalks, for whoever goes the high way; and down in the
	// market, and the folk who live down here out cheering.
	for (const p of PLATFORMS)
		if (!p.move && p.width >= 600 && p.height >= LEVEL_2)
			boosts.push({
				kind: 'fika',
				x: Math.round(p.x + p.width / 2),
				height: p.height + 26,
				item: nextFika(),
			})
	for (const x of [2000, 3000].map((x) => CAVERN_A.from + x))
		boosts.push(cheer(x))
	for (const x of [3500, 3850].map((x) => CAVERN_B.from + x))
		boosts.push(cheer(x))
	boosts.push({
		kind: 'fika',
		x: CAVERN_B.from + 3600,
		height: 26,
		item: nextFika(),
	})
	boosts.sort((a, b) => a.x - b.x)

	return { obstacles, boosts, scenery: scenery(random) }
}

/**
 * Lamps along the street, and roadworks before the manhole. Down below,
 * pipes and crates along the tunnels; in the caverns, the building site's
 * clutter, and the town: shacks, stalls, fires in drums, lanterns.
 */
/** Where each km sign stands (see `createKmSigns`), and how far either side of it to keep clear. */
const KM = (km: number) => START_X + km * 1000 * PX_PER_M
const KM_SIGN_ROOM = 110

function scenery(random: () => number): Course['scenery'] {
	const pieces: Course['scenery'] = []
	/** Stood on the floor, against the sewer's wall. */
	const below = (x: number, asset: string, scale = 2) =>
		pieces.push({ x: Math.round(x), asset, scale, setBack: -2, onFloor: true })
	// The street's houses, shoulder to shoulder, behind the pavement; not
	// over the manhole, nor the Giant Vent's shaft.
	let h = 0
	for (let x = -700; x < FINISH + 900; ) {
		const { asset, width: cells } = houses[h++ % houses.length]
		const width = cells * 2
		const middle = x + width / 2
		if (middle + width / 2 < MANHOLE - 10 || middle - width / 2 > EXIT + 10)
			pieces.push({ x: middle, asset, scale: 2, setBack: 0 })
		x += width
	}
	// The street's lamps.
	for (let x = -300; x < FINISH + 900; x += 420)
		if (x < MANHOLE - 60 || x > EXIT + 60)
			// Stood on the pavement's edge, by the road: in front of the houses.
			pieces.push({ x, asset: lamp, setBack: -2 })
	// Roadworks, before the manhole: a sign, and cones along the road to it.
	pieces.push({ x: MANHOLE - 520, asset: roadworksSign, scale: 2, setBack: -2 })
	for (let x = MANHOLE - 360; x < MANHOLE - 20; x += 70)
		pieces.push({ x, asset: cone, scale: 2, setBack: -14 })
	// Under the street.
	const tunnelBits = [pipes, archway, crates, pipes, lanternPole, archway]
	const site = [
		scaffolding,
		crates,
		pipes,
		lanternPole,
		scaffolding,
		drumFire,
		archway,
	]
	const town = [
		shack,
		stall,
		tallShack,
		drumFire,
		lanternPole,
		archway,
		stall,
		tallShack,
		crates,
	]
	let n = 0
	for (let at = MOUTH + 120; at < SEWER_END - 100; ) {
		const x = at
		const section = sectionAt(x)
		// Busier in the caverns.
		at +=
			section?.kind === 'cavern' ? 110 + random() * 120 : 170 + random() * 220
		if (!section || section.kind === 'slide') continue
		const pick =
			section === CAVERN_A ? site : section === CAVERN_B ? town : tunnelBits
		// Not over a channel of sludge; nor by a Tunnel's way in, where an
		// archway would look like the way in.
		if (CHANNELS.some((g) => x > g.from - 60 && x < g.to + 60)) continue
		const slides = SECTIONS.filter((s) => s.kind === 'slide')
		if (slides.some((s) => x > s.from - 260 && x < s.to + 120)) continue
		// Nor behind a km sign, hidden by it.
		if ([1, 2, 3, 4].some((km) => Math.abs(x - KM(km)) < KM_SIGN_ROOM)) continue
		below(x, pick[n++ % pick.length])
	}
	return pieces
}

export const sewers: CourseDefinition = {
	id: 'sewers',
	name: 'The Sewers',
	blurb:
		'Down the manhole and through the sewers: catwalks and swinging girders, Swamp Men in the sludge, and sewage pouring down in waves.',
	terrain,
	cave: sewer,
	platforms: PLATFORMS,
	busFloor,
	runDirectors: ['august', 'lyra'],
	cheerers: CHEERERS,
	look: {
		palette: {
			// A bright day up on the street: the sky's Haga's own.
			'--grass-green': '#a49a8e',
			'--grass-dark-green': '#857b70',
			'--grass-darker-green': '#5e564d',
			// Light words, outlined, to read against the sky and the sewer both.
			'--hud-ink': '#fff4e6',
			'--hud-shadow':
				'2px 0 #2b1d16, -2px 0 #2b1d16, 0 2px #2b1d16, 0 -2px #2b1d16',
		},
		horizon: {
			far: oldTownFar,
			near: oldTownNear,
			fill: '#b98a5a',
		},
		horizonTrees: false,
		// The street: its pavement, its road, its kerb, and the brick under it.
		ground: [
			[-PATH_BACK - VERGE, PAVEMENT],
			[-PATH_BACK, ROAD_EDGE],
			[-PATH_BACK + 5, ROAD],
			[PATH_FRONT, KERB],
			// The sewer's own bricks (see `cave`), laid under the street too.
			[PATH_FRONT + 4, 'url(#cave-rock)'],
		],
		cave: {
			bricks: true,
			rock: BRICK,
			seam: MORTAR,
			edge: BRICK_LIT,
			// Its back wall: the same brick, in shadow.
			wall: '#4a2c20',
			grass: PAVEMENT,
			road: [
				[VERGE, PAVEMENT],
				[5, ROAD_EDGE],
				[PATH_BACK + PATH_FRONT - 5, ROAD],
				[4, KERB],
			],
		},
		// Down a channel: its brick going on down into the dark, slime
		// running down it, and the sludge, glinting, a long way down.
		gap: 'linear-gradient(to bottom, #4a2c20, #2a1912 60px, #0c0806 140px)',
		pit: {
			wall: BRICK,
			shade: '#5a3424',
			seams: 'rgba(0, 0, 0, 0.35)',
			slime: { drip: '#6f9a2a', sludge: '#1f2c0e', shine: '#7fae34' },
		},
		// Puddles of sludge, green, not mud.
		mud: 'hue-rotate(55deg) saturate(1.2) brightness(0.8)',
		// Rubble, not rocks.
		rock: 'grayscale(0.7) brightness(0.7)',
		// Potholes in the road: broken asphalt, rain lying in them.
		pothole: {
			rim: '#7a7d84',
			hole: '#2a2b30',
			deep: '#17181b',
			water: '#4d6a7e',
			shine: '#9fc7de',
		},
		// Pigeons, not geese.
		geese: 'grayscale(1) brightness(0.9)',
		// Girders, painted steel, on cables: bright against the brick.
		platform: {
			top: '#6fb3ad',
			face: 'repeating-linear-gradient(90deg, #3f7d7a 0 14px, #2a5654 14px 16px)',
			edge: '#173634',
			depth: 14,
			cable: '#262626',
		},
		bus: {
			body: busBody,
			windows,
			scoop,
			drill: [drill1, drill2],
			drillFrom: DIG_FROM + 160,
		},
	},
	...layOut(),
}
