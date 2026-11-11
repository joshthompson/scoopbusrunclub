import type { RunnerName } from '@/data/runners'
import facade1 from '../assets/buildings/facade-1.png'
import facade2 from '../assets/buildings/facade-2.png'
import facade3 from '../assets/buildings/facade-3.png'
import facade4 from '../assets/buildings/facade-4.png'
import cityFar from '../assets/horizons/city-far.png'
import cityNear from '../assets/horizons/city-near.png'
import cityNearer from '../assets/horizons/city-nearer.png'
import cityNearest from '../assets/horizons/city-nearest.png'
import antenna from '../assets/rooftop/antenna.png'
import chimney1 from '../assets/rooftop/chimney-1.png'
import chimney2 from '../assets/rooftop/chimney-2.png'
import chimney3 from '../assets/rooftop/chimney-3.png'
import chimney4 from '../assets/rooftop/chimney-4.png'
import dish from '../assets/rooftop/dish.png'
import waterTower from '../assets/rooftop/water-tower.png'
import { GROUND_Y, START_X } from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { type Block, createRooftops } from '../game/terrain'
import { seeded } from './kit/seeded'
import { swing } from './kit/swing'
import type {
	Boost,
	Course,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
} from './types'

/**
 * City Rooftop: roof to roof across a city at sunset, and the hardest course
 * there is. Gaps to jump, with nothing under them but the street; roofs a
 * step up or a long drop down; walls too high to jump, to be got up by a
 * girder on a crane, or scaffolding; and gaps too wide to jump at all, only
 * to be crossed on a girder swinging across them. Wider and quicker the
 * further round.
 */

const CHEERERS: RunnerName[] = [
	'josh',
	'eline',
	'lyra',
	'rick',
	'keith',
	'anna',
	'august',
]

const DISTANCE_M = 5000
const FINISH_X = START_X + DISTANCE_M * 4

/** How low and how high a roof can be, over the lowest the ground goes. */
const LOWEST = 40
const HIGHEST = 430

/** A lift's width, and a girder's that swings across a Gap: wider, to land on. */
const GIRDER = 110
const CROSSING_GIRDER = 180

/** How far round, out of 1, it's only hops and steps. */
const EASY_START = 0.12

/** A building, and what's needed to get from it onto the next. */
interface Plan {
	blocks: Block[]
	platforms: PlatformDefinition[]
}

const top = (height: number) => GROUND_Y - height

function plan(): Plan {
	const random = seeded(5150)
	const between = (from: number, to: number) => from + random() * (to - from)
	const blocks: Block[] = [
		{ from: START_X - 1500, to: START_X + 900, height: 120 },
	]
	/** Where each girder goes, by the roof under it: placed once the terrain's made. */
	const platforms: PlatformDefinition[] = []
	let height = 120
	let x = START_X + 900
	while (x < FINISH_X - 1600) {
		const progress = (x - START_X) / (FINISH_X - START_X)
		// Only hops and steps to begin with, while the bus is close behind:
		// nothing to wait for.
		const roll = progress < EASY_START ? random() * 0.5 : random()
		let gap = 0
		let next = height
		if (roll < 0.34) {
			// A hop across, up a little or down some.
			gap = Math.round(between(70, 130 + 90 * progress))
			next = height + Math.round(between(-120, 60))
		} else if (roll < 0.5) {
			// Straight onto the next roof: a step up, or a drop.
			next =
				random() < 0.45
					? height + Math.round(between(40, 70))
					: height - Math.round(between(80, 200))
		} else if (roll < 0.7) {
			// Too far to jump: a girder swings across, from right up against
			// this roof to right up against the next, nothing to fall down
			// between it and either.
			gap = Math.round(between(300, 380 + 80 * progress))
			next = height + Math.round(between(-30, 30))
			const level = top(Math.max(height, next)) - 14
			platforms.push({
				x,
				width: CROSSING_GIRDER,
				// Its height over the line at `x`, which is this roof's edge.
				height: top(height) - level,
				move: swing(
					x,
					{ x: gap - CROSSING_GIRDER },
					Math.round(220 - 50 * progress),
				),
			})
		} else if (roll < 0.85 && height + 230 <= HIGHEST) {
			// Too high to jump: a girder lifts you up to it.
			const rise = Math.round(between(170, 230))
			next = height + rise
			// Right up against the wall it goes up.
			platforms.push({
				x: x - GIRDER,
				width: GIRDER,
				height: 16,
				move: swing(x, { y: rise + 6 }, Math.round(200 - 40 * progress)),
			})
		} else if (height + 240 <= HIGHEST) {
			// Too high to jump: scaffolding up the side of it, a plank at a time.
			const rise = Math.round(between(150, 240))
			next = height + rise
			const planks = Math.ceil(rise / 75)
			// All on this roof, however short it is.
			const roof = blocks[blocks.length - 1]
			const spacing = Math.min(120, (roof.to - roof.from - 140) / planks)
			// The top one right up against the wall, level with the roof: off
			// it and on.
			for (let i = 1; i <= planks; i++)
				platforms.push({
					x: Math.round(x - 96 - (planks - i) * spacing),
					width: 96,
					height: Math.round((rise * i) / planks),
				})
		} else {
			// No room to climb any higher: a long drop instead.
			next = height - Math.round(between(150, 260))
		}
		// Kept between the lowest and highest a roof goes: a smaller step up or
		// down, never the other way, which could make a jump too high.
		next = Math.max(LOWEST, Math.min(HIGHEST, next))
		// Wide enough for a run-up, and narrower the further round.
		const width = Math.round(between(360, 900 - 300 * progress))
		blocks.push({ from: x + gap, to: x + gap + width, height: next })
		x += gap + width
		height = next
	}
	// A long last roof, flat over the finish.
	blocks.push({ from: x, to: FINISH_X + 1800, height })
	return { blocks, platforms }
}

const { blocks, platforms } = plan()
const terrain = createRooftops(blocks, DISTANCE_M)

/** Room kept clear at either end of a roof, for jumping off it and landing. */
const EDGE_ROOM = 160

/** Whether `x` is on a roof, clear of its ends and of anything to climb. */
const clear = (x: number) =>
	blocks.some((b) => x > b.from + EDGE_ROOM && x < b.to - EDGE_ROOM) &&
	!platforms.some(
		(p) => x > p.x - 120 && x < p.x + p.width + (p.move?.x ?? 0) + 120,
	)

/** How far short of a higher roof's wall a Steam Vent is, to be fired up onto it from. */
const STEAM_SHORT = 80

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(2501)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	for (let x = START_X + 700; x < terrain.finishX - 500; ) {
		if (clear(x)) {
			const roll = random()
			if (roll < 0.32) obstacles.push({ kind: 'vent', x })
			else if (roll < 0.5)
				obstacles.push({
					kind: 'geese',
					x,
					count: 2 + Math.floor(random() * 3),
				})
			else if (roll < 0.78)
				boosts.push({
					kind: 'fika',
					x,
					height: random() < 0.5 ? 26 : 95,
					item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
				})
			else
				boosts.push({
					kind: 'cheer',
					x,
					member: CHEERERS[Math.floor(random() * CHEERERS.length)],
				})
			x += 340 + random() * 260
		} else x += 40
	}

	// Steam Vents on the roofs, just short of a higher roof: fired up onto
	// it, another way up than its girder or its lift. Where nothing else is.
	for (const wall of terrain.walls) {
		const x = wall - STEAM_SHORT
		const rise = terrain.groundY(wall - 1) - terrain.groundY(wall + 1)
		if (rise < 40 || terrain.inGap(x)) continue
		if (terrain.gaps.some((g) => g.from > x - 120 && g.from < wall)) continue
		if ([...obstacles, ...boosts].some((o) => Math.abs(o.x - x) < 90)) continue
		obstacles.push({ kind: 'steam', x })
	}
	obstacles.sort((a, b) => a.x - b.x)

	// What's on a city's roofs: aerials, water tanks, chimneys, dishes. Only
	// where it's wholly on one roof, and a chimney's built of what that
	// building is.
	const scenery: Course['scenery'] = []
	const clutter = [antenna, antenna, waterTower, 'chimney', 'chimney', dish]
	for (let at = -400; at < terrain.finishX + 900; at += 120 + random() * 320) {
		const x = Math.round(at)
		const piece = clutter[Math.floor(random() * clutter.length)]
		const on = blocks.findIndex(
			(b) => x - CLUTTER_ROOM > b.from && x + CLUTTER_ROOM < b.to,
		)
		if (on < 0) continue
		scenery.push({
			x,
			asset: piece === 'chimney' ? CHIMNEYS[on % CHIMNEYS.length] : piece,
			// Stood on the roof, a little in from its far edge: the roof
			// ends there, with nothing behind it to stand on.
			setBack: -ON_ROOF,
		})
	}
	return { obstacles, boosts, scenery }
}

/** How far in from a roof's far edge what's on it stands. */
const ON_ROOF = 8

/**
 * Each building in turn: its wall's colour, the front it's faced with (a
 * tile, repeated), and a chimney of the same brick or stone.
 */
const BUILDINGS = [
	{ wall: '#8a4b3a', facade: facade1, chimney: chimney1 },
	{ wall: '#6d7480', facade: facade2, chimney: chimney2 },
	{ wall: '#a7865c', facade: facade3, chimney: chimney3 },
	{ wall: '#3d5a7a', facade: facade4, chimney: chimney4 },
]
const CHIMNEYS = BUILDINGS.map((b) => b.chimney)

/** How far either side of something on a roof has to be roof too. */
const CLUTTER_ROOM = 40
export const cityRooftop: CourseDefinition = {
	id: 'city-rooftop',
	name: 'City Rooftop',
	blurb:
		'Roof to roof over the city: drops, high walls, and girders swinging off cranes. The hardest one.',
	terrain,
	platforms,
	runDirectors: ['josh', 'eline'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#2b2a5c',
			'--sky-blue-bottom': '#f2955f',
			// The haze over the streets, below the skyline.
			'--grass-green': '#5a4566',
			'--hud-ink': '#fff4e6',
			'--hud-shadow':
				'2px 0 #1b1530, -2px 0 #1b1530, 0 2px #1b1530, 0 -2px #1b1530',
		},
		sun: 'hue-rotate(-25deg) saturate(1.6)',
		sunScale: 1.6,
		clouds: 'sepia(0.5) hue-rotate(-30deg) saturate(1.6)',
		horizon: {
			far: cityFar,
			near: cityNear,
			fill: '#5a4f80',
			// The streets nearer, and nearer again, filling the haze down to
			// the rooftops.
			nearer: [
				{ asset: cityNearer, height: 200, fill: '#1f1833' },
				{ asset: cityNearest, height: 240, fill: '#150f25' },
			],
		},
		buildings: {
			roof: '#5b5e68',
			parapet: '#a3a7b1',
			facades: BUILDINGS.map((b) => `url("${b.facade}")`),
			walls: BUILDINGS.map((b) => b.wall),
		},
		// Nothing: between the buildings, the city behind.
		gap: 'none',
		platform: {
			top: '#f0b52a',
			face: 'repeating-linear-gradient(60deg, #d69a1c 0 6px, #7a5410 6px 9px)',
			edge: '#4a3208',
			depth: 16,
			cable: '#25252c',
		},
		horizonTrees: false,
		// Pigeons, not geese.
		geese: 'grayscale(1) brightness(0.9)',
	},
	...layOut(),
}
