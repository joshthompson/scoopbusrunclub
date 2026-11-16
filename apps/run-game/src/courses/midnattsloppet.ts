import moon from '@/assets/background/moon8.png'
import type { RunnerName } from '@/data/runners'
import bananaGirlDance from '../assets/runners/banana-girl/dance.png'
import lamp from '../assets/scenery/lamp.png'
import tree1 from '../assets/scenery/tree1.png'
import tree2 from '../assets/scenery/tree2.png'
import {
	GROUND_Y,
	HITBOX_HALF_WIDTH,
	LEFT_EDGE,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	SCENERY_SET_BACK,
	START_X,
	TICK_MS,
	VERGE,
} from '../game/constants'
import { type FikaItem, MIDNATTSLOPPET_FIKA } from '../game/fika'
import { type Terrain, withGaps } from '../game/terrain'
import { BANANA_GIRL } from '../runners/bonus'
import { DANCES, danceLength } from '../runners/dance'
import {
	SOFIA_KYRKAN_HEIGHT,
	WOODEN_HOUSES,
	choir,
	marschall,
	parkSign,
	sofiaKyrkan,
} from './kit/midnattsloppetChurch'
import {
	BOLLARD,
	MONITOR,
	SPEAKER_STACK,
	STAGE_FRAMES,
	STAGE_FRAME_TICKS,
	mooredBoat,
} from './kit/midnattsloppetDocks'
import {
	HAMMARBY_FAR,
	HAMMARBY_FILL,
	HAMMARBY_NEAR,
	HAMMARBY_WATER,
	HAMMARBY_WATER_FILL,
	SODER_FAR,
	SODER_FILL,
	SODER_NEAR,
	VITA_BERGEN_FAR,
	VITA_BERGEN_FILL,
	VITA_BERGEN_NEAR,
} from './kit/midnattsloppetHorizons'
import {
	BANANA_SKIN,
	PAPER_CUP,
	SHOWER,
	bananaStand,
	crowd,
	drinksStation,
	korvKiosk,
} from './kit/midnattsloppetStations'
import {
	ASPHALT,
	PAVEMENT,
	SODER_BLOCKS,
	lightRig,
	ringen,
	smokeMachine,
	trafficLight,
} from './kit/midnattsloppetStreet'
import { seeded } from './kit/seeded'
import type {
	Boost,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
	Scenery,
} from './types'

/**
 * Midnattsloppet: Stockholm's midnight race, down Södermalm in the dark,
 * squeezed from its 10 km into 5. Fire bursting up at the start, then
 * everyone in the race's blue T-shirt, more of them than ever, down
 * Ringvägen past Ringen to the docks at Hammarby, where a rock band's
 * playing; up past Vita bergen's old wooden houses and through the park,
 * marschaller burning up the steep path to Sofiakyrkan, its choir singing
 * on the steps; down again into the streets, through the drinks station,
 * the showers and past the banana stand, its supporters dancing in banana
 * suits (pick up every banana on the way, and one of them, Banana Girl, is
 * yours to run as); and the sprint down Hornsgatan
 * between the crowds to the finish. Searchlights and smoke all the way, and
 * the music changing with it: the DJ's, the band's, the choir's.
 */

const CHEERERS: RunnerName[] = [
	'eline',
	'josh',
	'keith',
	'lyra',
	'anna',
	'rick',
	'august',
]

const DISTANCE_M = 5000
const FINISH = START_X + DISTANCE_M * PX_PER_M

/** The race's T-shirt: Midnattsloppet 2026's blue. */
const RACE_BLUE = '#1f6bff'

// --- Along the course, in order -------------------------------------------

/** Ringvägen, from the start, smooth and very slightly downhill. */
const RINGEN = 3200
/** The crossroads just past Ringen, where Götgatan crosses. */
const CROSSROADS = 3650
/** Down onto Hammarby kaj, along the water, and off it again. */
const DOCKS = 4400
const DOCKS_END = 8000
/** The rock band's stage, its middle, by the road at the docks. */
const BAND = 6500
/** Up the old street of wooden houses, towards Vita bergen. */
const OLD_STREET = DOCKS_END
/** Into Vitabergsparken, and up the steep path to Sofiakyrkan. */
const PARK = 9600
const CLIMB = 10380
const CHURCH = 11000
/** Sofiakyrkan's middle, on top, and its choir on the steps before it. */
const KYRKAN = 11600
const CHOIR = 11250
/** Off the top, and down into central Södermalm's streets. */
const DOWNHILL = 12200
const CENTRAL = 13400
/** The drinks station's table, the showers, the korv kiosk, and the banana stand. */
const DRINKS = 14200
const SHOWERS = [15300, 15560, 15820]
const KIOSK = 16400
const BANANAS = 17000
/** Hornsgatan, the last straight, to the finish. */
const HORNSGATAN = 17800

// --- The ground ------------------------------------------------------------

/** Ringvägen's top, at the start; the docks', the lowest; Sofiakyrkan's, the highest. */
const START_Y = GROUND_Y - 70
const DOCK_Y = GROUND_Y
const PARK_Y = GROUND_Y - 50
const CHURCH_Y = GROUND_Y - 215
const CENTRAL_Y = GROUND_Y - 90
const FINISH_Y = GROUND_Y - 60

/** Where the ground's at, along it, eased from each to the next. */
const KNOTS: [x: number, y: number][] = [
	[START_X - 1400, START_Y],
	[START_X + 300, START_Y],
	[DOCKS, DOCK_Y],
	[OLD_STREET, DOCK_Y],
	[PARK, PARK_Y],
	[CLIMB, PARK_Y - 8],
	[CHURCH, CHURCH_Y],
	[DOWNHILL, CHURCH_Y],
	[CENTRAL, CENTRAL_Y],
	[HORNSGATAN, CENTRAL_Y],
	[FINISH, FINISH_Y],
	[FINISH + 2000, FINISH_Y],
]

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/** Central Södermalm's streets, rising and falling a little. */
const roll = (x: number) =>
	x > CENTRAL + 200 && x < HORNSGATAN - 200
		? 10 * Math.sin((x - CENTRAL) / 260) * Math.min(1, (x - CENTRAL) / 600)
		: 0

/**
 * Steady, from `t` 0 to 1, rather than eased all the way: the same
 * steepness all up the path to the church, eased only over `room` px at
 * either end of its `length`.
 */
function steady(t: number, length: number, room = 90) {
	const r = Math.min(0.45, room / length)
	const c = Math.max(0, Math.min(1, t))
	if (c < r) return (c * c) / (2 * r * (1 - r))
	if (c > 1 - r) return 1 - ((1 - c) * (1 - c)) / (2 * r * (1 - r))
	return (c - r / 2) / (1 - r)
}

/** The ground's height at `x`, to a fraction of a pixel, for its slope. */
function exactY(x: number) {
	let i = 0
	while (i < KNOTS.length - 2 && x > KNOTS[i + 1][0]) i++
	const [x0, y0] = KNOTS[i]
	const [x1, y1] = KNOTS[i + 1]
	const t = (x - x0) / (x1 - x0)
	const along = x0 === CLIMB ? steady(t, x1 - x0) : ease(t)
	return y0 + (y1 - y0) * along + roll(x)
}

const groundY = (x: number) => Math.round(exactY(x))

/**
 * How much of the climb's steepness is felt, running up it: the path's
 * drawn steep, but no harder going than a stiff hill, or nobody would get
 * up it with the bus behind them.
 */
const CLIMB_FELT = 0.55

const drawnSlope = (x: number) => (exactY(x + 4) - exactY(x - 4)) / 8

const terrain: Terrain = withGaps({
	length: FINISH - START_X,
	finishX: FINISH,
	groundY,
	slope: (x) =>
		x > PARK && x < CHURCH ? drawnSlope(x) * CLIMB_FELT : drawnSlope(x),
	tilt: drawnSlope,
})

// --- What's on it ------------------------------------------------------------

/**
 * The band's gear, stacked up by the stage: flight cases to jump up onto,
 * and off them, a wall of speaker stacks, the disco ball on top of it.
 * Wide enough, each, to land on at a run: a jump at full speed covers
 * about 270 px.
 */
const CASES_X = BAND - 520
const CASES = 2
const STACKS_X = CASES_X + CASES * MONITOR.width + 26
const STACKS = 3
const platforms: PlatformDefinition[] = [
	...Array.from({ length: CASES }, (_, i) => ({
		x: CASES_X + i * MONITOR.width,
		width: MONITOR.width,
		height: MONITOR.height,
		art: { ...MONITOR, top: 0 },
	})),
	...Array.from({ length: STACKS }, (_, i) => ({
		x: STACKS_X + i * SPEAKER_STACK.width,
		width: SPEAKER_STACK.width,
		height: SPEAKER_STACK.height,
		art: { ...SPEAKER_STACK, top: 0 },
	})),
]

/** The stretches, each with its own sort of thing in the way. */
type Stretch =
	| 'ringvägen'
	| 'docks'
	| 'oldStreet'
	| 'park'
	| 'climb'
	| 'church'
	| 'downhill'
	| 'central'
	| 'hornsgatan'
const stretchAt = (x: number): Stretch =>
	x < DOCKS
		? 'ringvägen'
		: x < OLD_STREET
			? 'docks'
			: x < PARK
				? 'oldStreet'
				: x < CLIMB
					? 'park'
					: x < CHURCH
						? 'climb'
						: x < DOWNHILL
							? 'church'
							: x < CENTRAL
								? 'downhill'
								: x < HORNSGATAN
									? 'central'
									: 'hornsgatan'

/** Kept clear for a set piece, and the room either side of it. */
const SET_PIECES: [from: number, to: number][] = [
	[RINGEN - 100, RINGEN + 100],
	[CASES_X - 200, BAND + 420],
	[CLIMB - 100, CHURCH + 100],
	[CHOIR - 200, KYRKAN + 300],
	[DRINKS - 200, DRINKS + 900],
	[SHOWERS[0] - 200, SHOWERS[2] + 200],
	[KIOSK - 150, KIOSK + 150],
	[BANANAS - 150, BANANAS + 700],
]
const inSetPiece = (x: number) =>
	SET_PIECES.some(([from, to]) => x > from && x < to)

/**
 * How likely each thing is, in each stretch: cones (lining a race's
 * course, plenty of them), potholes, geese, branches, fika.
 */
const MIX: Record<Stretch, [number, number, number, number, number]> = {
	ringvägen: [0.5, 0.2, 0, 0, 0.2],
	docks: [0.25, 0, 0.3, 0, 0.2],
	oldStreet: [0.35, 0.35, 0, 0, 0.2],
	park: [0, 0, 0, 0.7, 0.25],
	climb: [0, 0, 0, 0, 0],
	church: [0, 0, 0, 0, 0],
	downhill: [0.5, 0.1, 0, 0, 0.2],
	central: [0.55, 0.25, 0, 0, 0.15],
	hornsgatan: [0.5, 0, 0, 0, 0.1],
}

/**
 * What goes at `x`, if anything, for a `roll` of the dice: by how likely
 * each thing is in its stretch (see `MIX`), and on the docks, among the
 * rest, quay bollards.
 */
function pick(
	x: number,
	roll: number,
	random: () => number,
	nextFika: () => FikaItem,
): Obstacle | Extract<Boost, { kind: 'fika' }> | undefined {
	const stretch = stretchAt(x)
	const kinds = [
		() => ({ kind: 'cone', x }) as const,
		() =>
			({ kind: 'pothole', x, width: 40 + Math.round(random() * 24) }) as const,
		() => ({ kind: 'geese', x, count: 2 + Math.floor(random() * 3) }) as const,
		() => ({ kind: 'branch', x }) as const,
		() =>
			({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				item: nextFika(),
			}) as const,
	]
	let below = 0
	for (const [i, chance] of MIX[stretch].entries()) {
		below += chance
		if (roll < below) return kinds[i]()
	}
	if (stretch === 'docks' && random() < 0.6) return { kind: 'rock', x }
	return undefined
}

/** The cheering, a club member at each: the start, the docks, the church, the streets, and Hornsgatan. */
const CHEERS = [
	START_X + 1300,
	RINGEN + 300,
	DOCKS + 700,
	KYRKAN + 520,
	CENTRAL + 300,
	HORNSGATAN + 500,
	HORNSGATAN + 1200,
	FINISH - 500,
]

/** Where the skateboards lie, waiting to be stepped on: on Ringvägen, and up the old street. */
const CORGIS = [START_X + 2300, OLD_STREET + 800]

/**
 * Bananas, dropped all along the way before the stand, seven of them, to
 * make ten with the stand's three: had every one in one go, and Banana
 * Girl's yours to run as (see `hunt`). Held up high on Ringvägen, on top of
 * the band's first flight case, up the old street, in the park, halfway up
 * the climb to the church, and over central Södermalm's streets.
 */
const BANANA_TRAIL: { x: number; height: number }[] = [
	{ x: START_X + 1650, height: 95 },
	{ x: CROSSROADS + 150, height: 26 },
	{ x: CASES_X + MONITOR.width / 2, height: MONITOR.height + 26 },
	{ x: OLD_STREET + 1300, height: 95 },
	{ x: PARK + 450, height: 26 },
	{ x: CLIMB + 300, height: 95 },
	{ x: CENTRAL + 1100, height: 95 },
]

function layOut() {
	const random = seeded(2026)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	const nextFika = () =>
		MIDNATTSLOPPET_FIKA[fika++ % MIDNATTSLOPPET_FIKA.length]
	const taken = (x: number, room: number) =>
		[...obstacles, ...boosts].some((o) => Math.abs(o.x - x) < room) ||
		CORGIS.some((c) => Math.abs(c - x) < 160) ||
		BANANA_TRAIL.some((b) => Math.abs(b.x - x) < 120) ||
		CHEERS.some((c) => Math.abs(c - x) < 120)

	// Along the way, by stretch: nothing in the set pieces, laid out by hand.
	for (let x = START_X + 700; x < FINISH - 500; ) {
		if (!inSetPiece(x) && !taken(x, 120)) {
			const placed = pick(x, random(), random, nextFika)
			if (placed?.kind === 'fika') boosts.push(placed)
			else if (placed) obstacles.push(placed)
		}
		const progress = (x - START_X) / terrain.length
		x += 320 + random() * (440 - progress * 180)
	}

	// The drinks station: water and blueberry soup along its table, to run
	// along grabbing; and the cups dropped on the road past it.
	const drinks: FikaRow = [
		'waterCup',
		'blueberrySoup',
		'waterCup',
		'blueberrySoup',
		'waterCup',
	]
	drinks.forEach((item, i) =>
		boosts.push({ kind: 'fika', x: DRINKS + 40 + i * 50, height: 26, item }),
	)
	for (const x of [DRINKS + 420, DRINKS + 560, DRINKS + 760])
		obstacles.push({ kind: 'rock', x })
	// The showers, one after another over the road.
	for (const x of SHOWERS) boosts.push({ kind: 'gate', x, colour: 'red' })
	// A slice of pizza from the kiosk, held out high.
	boosts.push({ kind: 'fika', x: KIOSK, height: 95, item: 'pizzaSlice' })
	// Bananas, off the stand: two along its front, and one held up past it,
	// to jump for, and over the first skin with it; and their skins,
	// dropped past it. All three in one go, for Banana Girl (see `hunt`).
	for (const [dx, height] of [
		[20, 26],
		[80, 26],
		[250, 95],
	])
		boosts.push({ kind: 'fika', x: BANANAS + dx, height, item: 'banana' })
	for (const x of [BANANAS + 330, BANANAS + 640])
		obstacles.push({ kind: 'rock', x })
	// And the rest of the ten, along the way to it.
	for (const { x, height } of BANANA_TRAIL)
		boosts.push({ kind: 'fika', x, height, item: 'banana' })
	// Cheering, at the same places every time.
	CHEERS.forEach((x, i) =>
		boosts.push({ kind: 'cheer', x, member: CHEERERS[i % CHEERERS.length] }),
	)
	// The disco ball, on top of the wall of speakers by the stage, over
	// its far end: up onto the flight cases, and up again. Out of reach of
	// any jump off the road.
	boosts.push({
		kind: 'hat',
		x: STACKS_X + (STACKS - 0.5) * SPEAKER_STACK.width - 20,
		height: SPEAKER_STACK.height + 36,
		hat: 'discoBall',
	})
	obstacles.sort((a, b) => a.x - b.x)
	boosts.sort((a, b) => a.x - b.x)
	return { obstacles, boosts, scenery: scenery(random) }
}
type FikaRow = Extract<Boost, { kind: 'fika' }>['item'][]

/**
 * Banana Girl's dance (see `runners/dance.ts`), as the banana stand's
 * supporters dance it: its strip, how many frames, and how long each, in
 * ticks.
 */
const BANANA_GIRL_DANCE = bananaGirlDance
const BANANA_DANCE_FRAMES = danceLength('banana')
const BANANA_DANCE_TICKS = Math.round(DANCES.banana.interval / TICK_MS)
/** Out by the roadside at midnight, not lit up as the runners are. */
const SUPPORTERS_AT_NIGHT = 'brightness(0.88) saturate(0.9)'
/**
 * The banana stand's supporters, in banana suits, dancing Banana Girl's
 * dance either side of it: each where it is from the stand's left, and
 * how many frames into the dance it's started, two of them in step. The
 * blocks behind are left out, round them, so they're not lost behind one.
 */
const SUPPORTERS: [dx: number, from: number][] = [
	[-70, 0],
	[-25, 4],
	[175, 2],
	[215, 2],
]

/** Leaves and grass in the dark, under street lights. */
const NIGHT_TREE = 'brightness(0.42) saturate(0.7) hue-rotate(18deg)'

/** Everything along the way, behind it, and here and there in front. */
function scenery(random: () => number): Scenery[] {
	const pieces: Scenery[] = []
	const at = (x: number, asset: string, extra: Partial<Scenery> = {}) =>
		pieces.push({ x: Math.round(x), asset, scale: 2, ...extra })

	/** Södermalm's blocks, side by side, `from` to `to`, leaving room for `skip`. */
	const blocks = (
		from: number,
		to: number,
		seed: number,
		skip: number[] = [],
	) => {
		const pick = seeded(seed)
		for (let left = from; ; ) {
			const block = SODER_BLOCKS[Math.floor(pick() * SODER_BLOCKS.length)]
			const width = block.width * 2
			if (left + width > to) break
			if (!skip.some((s) => s > left - 60 && s < left + width + 60))
				at(left + width / 2, block.asset)
			left += width + (pick() < 0.25 ? 40 : 0)
		}
	}
	blocks(START_X - 1300, RINGEN - 160, 11, [START_X])
	at(RINGEN, ringen)
	blocks(RINGEN + 160, DOCKS - 300, 12, [CROSSROADS])
	at(CROSSROADS - 70, trafficLight)
	at(CROSSROADS + 70, trafficLight)

	// The docks: boats moored along the quay, the band's stage by the road.
	for (let x = DOCKS + 200; x < DOCKS_END - 200; x += 520 + random() * 300)
		if (Math.abs(x - BAND) > 600) at(x, mooredBoat, { setBack: 30 })
	at(BAND, STAGE_FRAMES[0], {
		frames: STAGE_FRAMES,
		frameTicks: STAGE_FRAME_TICKS,
	})

	// The old street's wooden houses, up to the park.
	for (let left = OLD_STREET + 60, n = 0; left < PARK - 140; n++) {
		const house = WOODEN_HOUSES[n % WOODEN_HOUSES.length]
		at(left + house.width, house.asset)
		left += house.width * 2 + 20 + random() * 30
	}
	at(PARK + 30, parkSign)
	// Vitabergsparken's trees: a few among the last of the houses, thick
	// round the path and up the hill, and on down it the other side,
	// thinning out to the streets at the bottom.
	const tree = (x: number) =>
		pieces.push({
			x: Math.round(x),
			asset: random() < 0.5 ? tree1 : tree2,
			filter: NIGHT_TREE,
		})
	for (let x = PARK_IN[0] - 160; x < PARK + 120; x += 150 + random() * 120)
		if (Math.abs(x - (PARK + 30)) > 70) tree(x)
	for (let x = PARK + 120; x < CHURCH - 100; x += 110 + random() * 130) tree(x)
	for (let x = KYRKAN + 360; x < PARK_OUT[1]; ) {
		tree(x)
		x += 120 + random() * 120 + ((x - DOWNHILL) / (CENTRAL - DOWNHILL)) * 120
	}
	// Marschaller, lining the path up to the church on either side: along
	// its back edge, and along its near edge, in front of everyone on it.
	for (let x = CLIMB - 120; x < CHURCH + 60; x += 60) {
		at(x, marschall, { onFloor: true, setBack: 0 })
		at(x + 30, marschall, {
			onFloor: true,
			front: true,
			setBack: -(PATH_BACK + PATH_FRONT),
		})
	}
	at(KYRKAN, sofiaKyrkan)
	at(CHOIR, choir)

	// Central Södermalm, the drinks station, the kiosk, the bananas.
	blocks(PARK_OUT[0] + 120, HORNSGATAN + 2400, 13, [
		DRINKS + 120,
		KIOSK,
		BANANAS + 60,
		...SUPPORTERS.map(([dx]) => BANANAS + dx),
	])
	at(DRINKS + 140, drinksStation)
	at(KIOSK, korvKiosk)
	at(BANANAS + 60, bananaStand)
	for (const [dx, from] of SUPPORTERS)
		at(BANANAS + dx, BANANA_GIRL_DANCE, {
			strip: { count: BANANA_DANCE_FRAMES, from },
			frameTicks: BANANA_DANCE_TICKS,
			filter: SUPPORTERS_AT_NIGHT,
		})
	// Hornsgatan's crowds, behind the barriers, all the way to the line.
	for (let x = HORNSGATAN + 100; x < FINISH + 400; x += 200) at(x, crowd)

	// The race's show: lighting rigs and smoke machines along the way, and
	// street lamps.
	for (const x of RIGS) at(x, lightRig)
	for (const x of SMOKE) at(x + 18, smokeMachine)
	for (let x = START_X - 1200; x < FINISH + 600; x += 340)
		if (
			!(x > CLIMB - 140 && x < KYRKAN + 300) &&
			!inSetPiece(x) &&
			!(x > HORNSGATAN && x < FINISH + 400)
		)
			pieces.push({ x, asset: lamp, filter: 'brightness(0.8)' })
	return pieces.sort((a, b) => a.x - b.x)
}

/** Lighting rigs, by the road, every so often. */
const RIGS = [
	START_X + 600,
	START_X + 1900,
	CROSSROADS + 250,
	CASES_X - 260,
	BAND + 380,
	CENTRAL + 700,
	HORNSGATAN + 50,
	FINISH - 150,
]
/**
 * Searchlights, at the road's edge every so often: not in the park, where
 * it's candles, nor by the stage, which has its own lamps, nor by the
 * start and finish banners.
 */
const SEARCHLIGHTS = Array.from(
	{ length: Math.floor((FINISH + 600 - START_X) / 900) },
	(_, i) => START_X + 450 + i * 900,
).filter(
	(x) =>
		!(x > PARK - 300 && x < DOWNHILL + 200) &&
		!(x > CASES_X - 150 && x < BAND + 300) &&
		Math.abs(x - FINISH) > 250,
)

/** Smoke machines, smoke rolling back across the road from each. */
const SMOKE = [
	START_X + 380,
	START_X + 2700,
	DOCKS + 1300,
	BAND + 300,
	OLD_STREET + 1200,
	CENTRAL + 1500,
	HORNSGATAN + 1600,
]

/**
 * Through Vitabergsparken, from the old street, up to the church and down
 * the hill again to the streets: the road fading into the park's gravel
 * path, and the pavement either side into its grass, at its way in
 * (`PARK_IN`, from and to), and back again at its way out (`PARK_OUT`).
 */
const PARK_IN: [number, number] = [PARK - 200, PARK + 40]
const PARK_OUT: [number, number] = [CENTRAL - 450, CENTRAL - 150]
const ASPHALT_FILL = '#2b2d36'
const GRAVEL = '#5b5246'
const PAVEMENT_FILL = '#4a4a55'
const GRASS = '#1d2a1f'
const KERB = '#24242c'
const PARK_EDGE = '#141c16'
/** A colour fading from `road` to `park` over the way in, and back over the way out. */
const intoPark = (id: string, road: string, park: string) => ({
	id,
	blend: true,
	stops: [
		[LEFT_EDGE, road],
		[PARK_IN[0], road],
		[PARK_IN[1], park],
		[PARK_OUT[0], park],
		[PARK_OUT[1], road],
	] as [number, string][],
})
/** The road's and the pavement's hints of texture: none in the park, gone as it fades in. */
const OUT_OF_SIGHT = 1000
const roadOff = (x: number) =>
	x > PARK_IN[0] && x < PARK_OUT[1] ? OUT_OF_SIGHT : 0

export const midnattsloppet: CourseDefinition = {
	id: 'midnattsloppet',
	name: 'Midnattsloppet',
	blurb:
		'Södermalm at midnight, in the race’s blue T-shirt: fire, a rock band at the docks, a choir up at Sofiakyrkan, and the crowds on Hornsgatan.',
	terrain,
	platforms,
	runDirectors: ['josh', 'eline'],
	cheerers: CHEERERS,
	corgis: CORGIS,
	// Every banana, the stand's and the ones dropped on the way to it: for
	// Banana Girl.
	hunt: { item: 'banana', runner: BANANA_GIRL.id },
	// Skateboards, left lying on the road: step on and roll; jump, and kickflip.
	ride: 'skateboard',
	raceShirt: RACE_BLUE,
	// A crowd: thick at the start, thinning out by the docks.
	crowd: (x) => (x < DOCKS ? 26 : x < CHURCH ? 14 : 12),
	// Up top, looking up at Sofiakyrkan: the whole of it, dome and cross.
	lookUp: [
		{
			from: CHURCH,
			to: DOWNHILL,
			top:
				CHURCH_Y - PATH_BACK - SCENERY_SET_BACK - SOFIA_KYRKAN_HEIGHT * 2 - 8,
		},
	],
	// Well before each set piece: a new version waits for the next bar and
	// takes two more to fade in, by which time anyone quick has gone a
	// couple of thousand px. The band's from the docks till the choir, up
	// the old street, and the choir's on down the hill to the streets.
	tunes: [
		{ from: DOCKS - 600, tune: 'midnattsloppet:rock' },
		{ from: OLD_STREET + 700, tune: 'midnattsloppet:choir' },
		{ from: CENTRAL, tune: 'midnattsloppet' },
	],
	// Over everyone else in the crowd, and plenty of them to go at.
	special: {
		goal: 'Bounce on 20 heads',
		done: (run) => run.finished && (run.counts.heads ?? 0) >= 20,
	},
	look: {
		palette: {
			'--sky-blue-top': '#04061a',
			'--sky-blue-bottom': '#1b2152',
			// The pavement, either side of the road.
			'--grass-green': '#4a4a55',
			'--grass-dark-green': '#383842',
			'--grass-darker-green': '#24242c',
			// The road.
			'--dirt-brown': '#2b2d36',
			'--dirt-dark-brown': '#1f2129',
			'--dirt-darker-brown': '#14151b',
			'--hud-ink': '#eef2ff',
			'--hud-shadow':
				'2px 0 #0b0e2a, -2px 0 #0b0e2a, 0 2px #0b0e2a, 0 -2px #0b0e2a',
		},
		sunAsset: moon,
		sunScale: 2,
		sun: 'brightness(1.1) drop-shadow(0 0 8px #cfd8ff)',
		clouds: 'brightness(0.25) saturate(0.6)',
		horizon: { far: SODER_FAR, near: SODER_NEAR, fill: SODER_FILL },
		voyage: [
			{
				from: DOCKS - 900,
				// Across the water to Hammarby Sjöstad, the water right up to
				// the quay under the road.
				horizon: {
					far: HAMMARBY_FAR,
					near: HAMMARBY_NEAR,
					fill: HAMMARBY_FILL,
					nearer: [
						{
							asset: HAMMARBY_WATER,
							height: 160,
							fill: HAMMARBY_WATER_FILL,
						},
					],
				},
			},
			{
				from: OLD_STREET - 300,
				horizon: {
					far: VITA_BERGEN_FAR,
					near: VITA_BERGEN_NEAR,
					fill: VITA_BERGEN_FILL,
				},
			},
			{
				from: DOWNHILL + 300,
				horizon: { far: SODER_FAR, near: SODER_NEAR, fill: SODER_FILL },
			},
		],
		horizonTrees: false,
		// The pavement, a kerb, the road, a kerb, and the pavement: through
		// the park, grass, its edges, the gravel path, its edges, and grass.
		ground: [
			[-PATH_BACK - VERGE, 'url(#midnatt-verge)'],
			[-PATH_BACK - VERGE, 'url(#midnatt-pavement)', false, roadOff],
			[-PATH_BACK, 'url(#midnatt-kerb)'],
			[-PATH_BACK + 2, 'url(#midnatt-path)'],
			[-PATH_BACK + 2, 'url(#midnatt-asphalt)', false, roadOff],
			[PATH_FRONT, 'url(#midnatt-kerb)'],
			[PATH_FRONT + 4, 'url(#midnatt-verge)'],
			[PATH_FRONT + 4, 'url(#midnatt-pavement)', false, roadOff],
		],
		strips: [
			intoPark('midnatt-verge', PAVEMENT_FILL, GRASS),
			intoPark('midnatt-kerb', KERB, PARK_EDGE),
			intoPark('midnatt-path', ASPHALT_FILL, GRAVEL),
		],
		groundDefs: ASPHALT + PAVEMENT,
		pothole: { rim: '#3a3c46', hole: '#0e0f14', deep: '#07080b' },
		foliage: NIGHT_TREE,
		geese: 'brightness(0.6) saturate(0.6)',
		rocks: [
			{ ...BOLLARD, from: DOCKS, to: DOCKS_END },
			{ ...PAPER_CUP, from: DRINKS, to: DRINKS + 900 },
			{ ...BANANA_SKIN, from: BANANAS, to: BANANAS + 800 },
		],
		gate: { ...SHOWER, name: 'Showers', word: 'Splash!' },
		// On the start line, where its banner is (see `createRaceScene`).
		pyro: [START_X + HITBOX_HALF_WIDTH + 4],
		searchlights: {
			at: SEARCHLIGHTS,
			colours: ['#4f8bff', '#ff4fd8', '#5ae2ff', '#ffffff'],
		},
		smoke: SMOKE,
		previewFrom: BAND - 500,
	},
	...layOut(),
}
