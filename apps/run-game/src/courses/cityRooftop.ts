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
import { GROUND_Y, PATH_BACK, START_X } from '../game/constants'
import { ROOFTOP_FIKA } from '../game/fika'
import { type Block, createRooftops } from '../game/terrain'
import { BAT_PERSON } from '../runners/bonus'
import { JIB, JIB_LEFT, JIB_TOP, towerCrane } from './kit/craneArt'
import { withHat } from './kit/hats'
import { neonSign, roofGarden, washingLine } from './kit/rooftopLife'
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

/** How far the hideout's lift goes up, over its roof. */
const HIDEOUT_RISE = 420
/** How long it takes to go up and back down again: half that, up. */
const HIDEOUT_LIFT_TICKS = 160
/** How long someone has to stand on it for it to go: longer than running across it takes. */
const HIDEOUT_LIFT_WAIT = 24
/** Its walkway's girders, along, and the gap before each but the first, and how much higher each is. */
const WALKWAY = [
	{ width: 240, gap: 0, up: 0 },
	{ width: 240, gap: 80, up: 30 },
	{ width: 260, gap: 90, up: -10 },
	{ width: 220, gap: 70, up: 20 },
	{ width: 260, gap: 80, up: 0 },
]
/** How far over the walkway the cranes' jibs are, its girders hung from them. */
const JIB_OVER = 70
/** How far back a crane stands on its roof. */
const CRANE_SET_BACK = 8
/** A crane's picture: half its width, and how far right of its middle its mast is. */
const CRANE_HALF = towerCrane(1).width
const CRANE_OFF_MIDDLE = (JIB_LEFT - towerCrane(1).width / 2) * 2

/**
 * Bat Person's hideout: a girder on a crane, on a long flat roof a little
 * under halfway round, where there's nothing to climb, so it looks no use;
 * but stand on it and it waits no more: up it goes, over the roofs, to a row
 * of girders hung off the cranes up there, a hop from one to the next, and at the end of them, him,
 * waiting to be found. Off the end, it's a drop back down onto a roof.
 */
const HIDEOUT = (() => {
	const after = START_X + (FINISH_X - START_X) * 0.45
	const free = (b: Block) =>
		!platforms.some(
			(p) =>
				p.x < b.to + 120 &&
				p.x + p.width + Math.max(0, p.move?.x ?? 0) > b.from - 120,
		)
	const roof = blocks.find(
		(b) => b.from > after && b.to - b.from >= 560 && free(b),
	)
	if (!roof) return undefined
	const liftX = roof.from + 220
	const lift: PlatformDefinition = {
		x: liftX,
		width: GIRDER,
		height: 16,
		// Waiting for whoever gets to it, to go up: not swinging up and down
		// on its own, to be caught just right with the bus behind.
		move: {
			y: HIDEOUT_RISE,
			ticks: HIDEOUT_LIFT_TICKS,
			waits: HIDEOUT_LIFT_WAIT,
		},
	}
	const deck = terrain.groundY(liftX) - 16 - HIDEOUT_RISE
	const walkway: PlatformDefinition[] = []
	let x = liftX + GIRDER
	let level = deck
	for (const girder of WALKWAY) {
		x += girder.gap
		level -= girder.up
		walkway.push({
			x,
			width: girder.width,
			height: terrain.groundY(x) - level,
			// Hung off a crane, still: its cable up to it.
			move: { y: 0, ticks: 600 },
		})
		x += girder.width
	}
	// The last one out over a roof, a good way in: off its end, down onto it.
	const last = walkway[walkway.length - 1]
	const overRoof = (at: number) =>
		blocks.some((b) => at > b.from + 60 && at + 160 < b.to)
	while (!overRoof(last.x + last.width) && last.width < 700) {
		last.width += 20
	}
	const end = last.x + last.width
	return {
		platforms: [lift, ...walkway],
		found: {
			runner: BAT_PERSON.id,
			x: end - 50,
			y: terrain.groundY(last.x) - last.height,
			says: 'Na na na na na!',
			toSelf: 'Greetings bat brother',
		},
		// Cranes on the roofs behind, each wholly on one roof, its jib out
		// over the walkway, just over a girder, and reaching over its cable,
		// which it hangs from.
		cranes: walkway.flatMap((girder) => {
			const cable = girder.x + girder.width / 2
			const jibTop = terrain.groundY(girder.x) - girder.height - JIB_OVER
			for (
				let mast = cable + JIB_LEFT * 2 - 12;
				mast >= cable - 30;
				mast -= 10
			) {
				const middle = mast - CRANE_OFF_MIDDLE
				if (
					!blocks.some(
						(b) => middle - CRANE_HALF > b.from && middle + CRANE_HALF < b.to,
					)
				)
					continue
				const foot = terrain.groundY(middle) - PATH_BACK - CRANE_SET_BACK
				const art = towerCrane(
					Math.max(40, Math.round((foot - jibTop) / 2) - JIB),
				)
				girder.hook = foot - art.height * 2 + (JIB_TOP + JIB) * 2
				return [{ x: Math.round(middle), art }]
			}
			return []
		}),
	}
})()
if (HIDEOUT) platforms.push(...HIDEOUT.platforms)

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
/**
 * Past a Steam Vent, where you come down on the roof it fires you onto, and
 * where you've found your feet again after: nothing to jump between the two.
 */
const STEAM_LANDS = 300
const STEAM_CLEAR = 750

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
					item: ROOFTOP_FIKA[fika++ % ROOFTOP_FIKA.length],
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
	// Nothing to jump just where a Steam Vent lands you, still going fast
	// from it: on past there, once you've found your feet. (Anything under
	// the way you fly is fine: you're over it.)
	for (const steam of obstacles.filter((o) => o.kind === 'steam')) {
		for (const o of obstacles) {
			if (o.kind === 'steam') continue
			if (o.x < steam.x + STEAM_LANDS || o.x >= steam.x + STEAM_CLEAR) continue
			let x = steam.x + STEAM_CLEAR
			while (
				x < terrain.finishX - 500 &&
				(!clear(x) ||
					[...obstacles, ...boosts].some(
						(p) => p !== o && Math.abs(p.x - x) < 200,
					))
			)
				x += 40
			o.x = x
		}
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
	scenery.push(...rooftopLife(blocks))
	// The cranes over the hideout, each stood on a roof behind.
	for (const crane of HIDEOUT?.cranes ?? [])
		scenery.push({
			x: crane.x,
			asset: crane.art.asset,
			scale: 2,
			setBack: CRANE_SET_BACK,
			onFloor: true,
		})
	return { obstacles, boosts, scenery }
}

/**
 * Washing lines, roof gardens, and occasionally a neon sign, each wholly on
 * one roof: their own random numbers, so everything else is where it was.
 */
function rooftopLife(blocks: Block[]): Course['scenery'] {
	const random = seeded(1313)
	const out: Course['scenery'] = []
	let n = 0
	for (let at = 300; at < terrain.finishX; at += 500 + random() * 600) {
		const x = Math.round(at)
		const asset =
			n++ % 5 === 2 ? neonSign : random() < 0.5 ? washingLine : roofGarden
		const half = asset === neonSign ? 70 : 42
		if (!blocks.some((b) => x - half > b.from && x + half < b.to)) continue
		out.push({ x, asset, scale: 2, setBack: -ON_ROOF })
	}
	return out
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

/**
 * Where its course select preview looks: a gap between roofs, a third of
 * the way along, to jump.
 */
const PREVIEW_FROM = (() => {
	const third = START_X + terrain.length / 3
	const gap = blocks.find(
		(b, i) => b.from > third && blocks[i + 1] && blocks[i + 1].from > b.to,
	)
	return (gap?.to ?? third) - 520
})()

/** How far either side of something on a roof has to be roof too. */
const CLUTTER_ROOM = 40
export const cityRooftop: CourseDefinition = {
	id: 'city-rooftop',
	name: 'City Rooftop',
	blurb:
		'Roof to roof over the city: drops, high walls, and girders swinging off cranes. The hardest one.',
	terrain,
	platforms,
	found: HIDEOUT?.found,
	special: {
		goal: 'Find Bat Person',
		done: (run) => !!run.metFound,
	},
	runDirectors: ['josh', 'eline'],
	cheerers: CHEERERS,
	look: {
		previewFrom: PREVIEW_FROM,
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
	// A chimney sweep's top hat, high over a vent on a roof: stop on it,
	// and it fires you straight up to it; running on over it, you're
	// carried on past under it.
	...withHat(
		layOut(),
		'topHat',
		({ obstacles }) => {
			const vents = obstacles.filter((o) => o.kind === 'steam')
			const vent = vents[Math.min(3, vents.length - 1)]
			return { x: vent?.x ?? START_X + 8000, height: 240 }
		},
		0,
	),
}
