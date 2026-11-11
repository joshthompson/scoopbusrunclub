import type { RunnerName } from '@/data/runners'
import oldTownChurches from '../assets/horizons/old-town-churches.png'
import oldTownFar from '../assets/horizons/old-town-far.png'
import oldTownNear from '../assets/horizons/old-town-near.png'
import lamp from '../assets/scenery/lamp.png'
import pigDuck from '../assets/scenery/pig-duck.png'
import quayWall from '../assets/scenery/quay-wall.png'
import {
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	START_X,
	VERGE,
} from '../game/constants'
import { FERRY_FIKA, type FikaItem, TURKU_FIKA } from '../game/fika'
import { type Gap, type Terrain, withGaps } from '../game/terrain'
import {
	BUFFET_HEIGHT,
	CAR_HEIGHT,
	CAR_WIDTH,
	FERRY_WHITE,
	FUNNEL_HEIGHT,
	FUNNEL_WIDTH,
	HULL_TILE,
	LIFEBOAT_HEIGHT,
	LIFEBOAT_TOP,
	LIFEBOAT_WIDTH,
	NAME_HEIGHT,
	NAME_WIDTH,
	SKYLIGHT_HEIGHT,
	SKYLIGHT_ROOF,
	SKYLIGHT_WIDTH,
	STAGE_HEIGHT,
	STERN_WIDTH,
	TABLE_HEIGHT,
	TABLE_WIDTH,
	TRAILER_HEIGHT,
	VISOR_HEIGHT,
	VISOR_WIDTH,
	WALKWAY_HEIGHT,
	WALKWAY_TOP,
	WATERLINE,
	WHEELHOUSE_HEIGHT,
	WHEELHOUSE_WIDTH,
	type Wall,
	barWall,
	beerCrates,
	bollard,
	bowHallWall,
	bowVisor,
	buffetCounter,
	buffetWall,
	car,
	carDeckWall,
	corridorWall,
	deckSign,
	diningTable,
	funnel,
	lifeboat,
	lifeboatOnDavits,
	lifebuoy,
	lineName,
	lounger,
	roofWalkway,
	rucksack,
	shipName,
	shopShelf,
	shopWall,
	skylight,
	stage,
	sternEdge,
	sternFlag,
	suitcase,
	taxFreeBag,
	terminalSignLettered,
	tippedGlass,
	trailer,
	ventilator,
	wheelhouse,
} from './kit/ferryScenery'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import { swing } from './kit/swing'
import {
	FORI_DECK,
	FORI_HEIGHT,
	FORI_WIDTH,
	bench,
	finnishFlag,
	fori,
	foriSign,
	linden,
	parkedBike,
	posankkaLawn,
} from './kit/turkuScenery'
import {
	RIVER,
	SEA,
	SEA_FAR,
	archipelagoFar,
	archipelagoNear,
	openSeaFar,
	openSeaNear,
	turkuFar,
	turkuNear,
	turkuSpires,
} from './kit/voyageHorizons'
import type {
	Boost,
	Cave,
	Course,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
} from './types'

/**
 * Scoop Cruises: along the quay at Slussen, to Scoop Cruises' ferry,
 * up its stern ramp and on board, the ferry opening up around you: the car
 * deck, the cabins' corridor, the tax-free shop, out up the stairs onto
 * the sun deck, back in to the buffet and the dance bar, all the while
 * sailing out through the archipelago and over the sea to Turku. Off at
 * the bow, and the last km along the river Aura, over it on the Föri, to
 * Posankka, Turku's great pink pig-duck, at the finish.
 */

const CHEERERS: RunnerName[] = [
	'eline',
	'anna',
	'josh',
	'keith',
	'rick',
	'lyra',
	'august',
]

const DISTANCE_M = 5000
const FINISH = START_X + DISTANCE_M * PX_PER_M

/** The quays, at Slussen and in Turku: the lowest the course goes. */
const QUAY = GROUND_Y
/**
 * The ferry's decks: the car deck and the bow hall, low down; the shop,
 * the buffet and the bar, a deck up; and the sun deck, right up on top.
 */
const DECK_A = QUAY - 70
const DECK_B = DECK_A - 140
const DECK_C = DECK_B - 220
/** The ferry's roof, level with the back of the sun deck, on top of it. */
const ROOF = DECK_C - PATH_BACK

/** Off the end of Slussen's quay, up the stern ramp, the ferry from its stern. */
const QUAY_END = START_X + 1200
const STERN = QUAY_END + 400

type Room =
	| 'carDeck'
	| 'corridor'
	| 'stairsUp'
	| 'shop'
	| 'deckStairsUp'
	| 'sunDeck'
	| 'deckStairsDown'
	| 'buffet'
	| 'bar'
	| 'stairsDown'
	| 'bowHall'

interface Section {
	room: Room
	from: number
	to: number
}

/** The ferry, stern to bow, one room after another. */
const SECTIONS: Section[] = (() => {
	const plan: [Room, number][] = [
		['carDeck', 1000],
		['corridor', 1800],
		['stairsUp', 400],
		['shop', 2200],
		['deckStairsUp', 500],
		['sunDeck', 2400],
		['deckStairsDown', 500],
		['buffet', 2200],
		['bar', 1400],
		['stairsDown', 400],
		['bowHall', 1200],
	]
	let at = STERN
	return plan.map(([room, length]) => {
		const from = at
		at += length
		return { room, from, to: at }
	})
})()
const room = (name: Room) => SECTIONS.find((s) => s.room === name) as Section
const sectionAt = (x: number) => SECTIONS.find((s) => x >= s.from && x < s.to)

/** Its bow, the way off, down its ramp onto the quay in Turku. */
const BOW = SECTIONS[SECTIONS.length - 1].to
const TURKU = BOW + 400

/** Each room's floor, and how high it is to its Ceiling: none, out on deck. */
const FLOOR: Partial<Record<Room, number>> = {
	carDeck: DECK_A,
	corridor: DECK_A,
	shop: DECK_B,
	sunDeck: DECK_C,
	buffet: DECK_B,
	bar: DECK_B,
	bowHall: DECK_A,
}
const STAIRS: Partial<Record<Room, [from: number, to: number]>> = {
	stairsUp: [DECK_A, DECK_B],
	deckStairsUp: [DECK_B, DECK_C],
	deckStairsDown: [DECK_C, DECK_B],
	stairsDown: [DECK_B, DECK_A],
}
/** Up to deck B's rooms' Ceilings, under the sun deck's roof: high enough for the bus. */
const B_CEILING = ROOF + 30
const CEILING: Partial<Record<Room, number>> = {
	carDeck: DECK_A - 250,
	corridor: DECK_A - 190,
	stairsUp: B_CEILING,
	shop: B_CEILING,
	buffet: B_CEILING,
	bar: B_CEILING,
	stairsDown: B_CEILING,
	bowHall: DECK_A - 240,
}

/** How high each stair is. */
const STAIR = 8
/**
 * How much a flight of stairs slows you, for its slope: taken a stair at a
 * time at a run, steep as they are, no more than a gentle hill would.
 */
const STAIR_PULL = 0.35

/** Along a ramp, from `y0` at `x0` to `y1` at `x1`. */
const ramp = (x: number, x0: number, x1: number, y0: number, y1: number) =>
	y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)

/** The Ground at `x`, and its slope: smooth up a ramp, a stair at a time up the stairs. */
function floor(x: number): { y: number; slope: number } {
	if (x < QUAY_END) return { y: QUAY, slope: 0 }
	if (x < STERN)
		return {
			y: ramp(x, QUAY_END, STERN, QUAY, DECK_A),
			slope: (DECK_A - QUAY) / (STERN - QUAY_END),
		}
	if (x >= TURKU) return { y: QUAY, slope: 0 }
	if (x >= BOW)
		return {
			y: ramp(x, BOW, TURKU, DECK_A, QUAY),
			slope: (QUAY - DECK_A) / (TURKU - BOW),
		}
	const section = sectionAt(x) as Section
	const stairs = STAIRS[section.room]
	if (!stairs) return { y: FLOOR[section.room] ?? DECK_A, slope: 0 }
	const [y0, y1] = stairs
	const y = ramp(x, section.from, section.to, y0, y1)
	return {
		y: Math.round(y / STAIR) * STAIR,
		slope: ((y1 - y0) / (section.to - section.from)) * STAIR_PULL,
	}
}

/** The river Aura, in Turku, too wide to jump: the Föri across it. */
const RIVER_FROM = FINISH - 2100
const RIVER_WIDTH = 420
const AURA: Gap = { from: RIVER_FROM, to: RIVER_FROM + RIVER_WIDTH }

const terrain: Terrain = withGaps(
	{
		length: FINISH - START_X,
		finishX: FINISH,
		groundY: (x) => floor(x).y,
		slope: (x) => floor(x).slope,
	},
	[AURA],
)

/** A picture on the ferry with its top at `top`, its middle at `x`: however high the floor is under it. */
function placed(
	asset: string,
	x: number,
	top: number,
	width: number,
	height: number,
): NonNullable<Cave['features']>[number] {
	const ground = Math.round(terrain.groundY(x) / 2) * 2
	return {
		asset,
		x: Math.round(x),
		width,
		height,
		on: 'behind',
		sink: top - ground + PATH_BACK + height,
	}
}

/** Each room's walls. */
const WALLS: Partial<Record<Room, Wall>> = {
	carDeck: carDeckWall,
	corridor: corridorWall,
	shop: shopWall,
	buffet: buffetWall,
	bar: barWall,
	bowHall: bowHallWall,
}
/** How wide each panel of a room's wall is. */
const PANEL = 480

function features(): NonNullable<Cave['features']> {
	const out: NonNullable<Cave['features']> = []
	for (const section of SECTIONS) {
		const wall = WALLS[section.room]
		const ceiling = CEILING[section.room]
		const ground = FLOOR[section.room]
		if (!wall || ceiling === undefined || ground === undefined) continue
		const height = ground - PATH_BACK - ceiling
		let n = 0
		for (let at = section.from; at < section.to; at += PANEL) {
			const width = Math.min(PANEL, section.to - at)
			out.push({
				asset: wall(width, height, n++),
				x: at + width / 2,
				width,
				height,
				on: 'behind',
			})
		}
	}
	// The stairwells' signs: the deck they go up to.
	for (const [name, deck] of [
		['stairsUp', 7],
		['stairsDown', 5],
	] as const) {
		const s = room(name)
		out.push(
			placed(deckSign(deck), (s.from + s.to) / 2, B_CEILING + 24, 44, 44),
		)
	}
	// SCOOP CRUISES down its side, over the car deck, the corridor and the bow hall.
	for (const [name, along] of [
		['corridor', 0.5],
		['bowHall', 0.45],
	] as const) {
		const s = room(name)
		const ceiling = CEILING[name] as number
		out.push(
			placed(
				lineName,
				s.from + (s.to - s.from) * along,
				Math.round((ROOF + ceiling) / 2 - NAME_HEIGHT / 2 + 6),
				NAME_WIDTH,
				NAME_HEIGHT,
			),
		)
	}
	// Its name by its bow, and its port of registry by its stern.
	const name = 'SCOOPELLA'
	out.push(
		placed(shipName(name), BOW - 160, ROOF + 18, name.length * 12 - 2, 14),
	)
	out.push(
		placed(shipName('MARIEHAMN'), STERN + 140, ROOF + 22, 9 * 12 - 2, 14),
	)
	// The stern's edge, over its door and under it.
	const carDeckCeiling = CEILING.carDeck as number
	out.push(
		placed(
			sternEdge(carDeckCeiling - ROOF),
			STERN + STERN_WIDTH / 2,
			ROOF,
			STERN_WIDTH,
			carDeckCeiling - ROOF,
		),
	)
	const under = DECK_A + PATH_FRONT + 2
	out.push(
		placed(
			sternEdge(WATERLINE - under),
			STERN + STERN_WIDTH / 2,
			under,
			STERN_WIDTH,
			WATERLINE - under,
		),
	)
	// Up top: the bridge over the bow, lifeboats along the roof (and more
	// over the buffet and the bar: see `ROOF_LIFEBOATS`), and the flag at
	// the stern.
	out.push({
		asset: wheelhouse,
		x: BOW - 420,
		width: WHEELHOUSE_WIDTH,
		height: WHEELHOUSE_HEIGHT,
		sink: 2,
	})
	for (const x of [
		room('corridor').from + 220,
		room('corridor').to - 260,
		room('bowHall').from + 300,
	])
		out.push({
			asset: lifeboat,
			x,
			width: LIFEBOAT_WIDTH,
			height: LIFEBOAT_HEIGHT,
			sink: 2,
		})
	out.push({ asset: sternFlag, x: STERN + 40, width: 40, height: 80, sink: 2 })
	// The funnel, on the sun deck.
	out.push({
		asset: funnel,
		x: room('sunDeck').from + 1150,
		width: FUNNEL_WIDTH,
		height: FUNNEL_HEIGHT,
		on: 'behind',
		sink: 4,
	})
	// The skylight the roof's Route ends at, open, down into the bar.
	out.push(
		placed(
			skylight,
			ROOF_TO + SKYLIGHT_WIDTH / 2,
			ROOF - SKYLIGHT_ROOF,
			SKYLIGHT_WIDTH,
			SKYLIGHT_HEIGHT,
		),
	)
	// The bow visor, swung up, over the way off.
	out.push(
		placed(
			bowVisor,
			BOW + VISOR_WIDTH / 2 - 30,
			ROOF - 70,
			VISOR_WIDTH,
			VISOR_HEIGHT,
		),
	)
	return out
}

// --- What's on it -------------------------------------------------------------------

/**
 * How far back on the path what's on a deck's floor stands: a lorry, a
 * shelf, a table. Its picture's raised this much, its foot back where
 * the cheerers stand, so whoever's in front of it is plainly in front.
 */
const STOOD_BACK = 10

/** A Platform, `width` from `x`, its picture's top on its own. */
const platform = (
	x: number,
	width: number,
	height: number,
	asset: string,
	art: { width?: number; height?: number; top?: number } = {},
): PlatformDefinition => ({
	x: Math.round(x),
	width,
	height,
	art: {
		asset,
		width: art.width ?? width,
		height: art.height ?? height,
		top: art.top ?? STOOD_BACK,
	},
})

/** How high a shelf is, low and high: jump onto the low one, then the high one. */
const SHELF_LOW = 70
const SHELF_HIGH = 140
/** How high a lifeboat hangs over the sun deck, on its davits. */
const LIFEBOAT_UP = 90

/**
 * The Route along the roof: off the end of the sun deck, a long jump, held,
 * and quick, a boost behind it, right over the stairs down onto the end of
 * the buffet's awning, as high as the sun deck;
 * and on along the top of the buffet and the dance bar, to a skylight just
 * past the karaoke, open, and down through it into the bar. Duck, and
 * you're down through the roof any time.
 */
const AWNING = 120
const ROOF_FROM = room('deckStairsDown').to - AWNING
/**
 * Fika on the sun deck, this far before its end, for the speed to make
 * that jump: only boosted, and timed just right, does anyone get across.
 */
const RUN_UP_FIKA = room('sunDeck').to - 330
const ROOF_TO = room('bar').from + 640
/** Lifeboats up there, this high over it, to hop onto: a captain's hat on one. */
const ROOF_LIFEBOATS = [
	room('buffet').from + 600,
	room('buffet').from + 1500,
	room('bar').from + 200,
]
const ROOF_LIFEBOAT_UP = 70
const HAT_ON = ROOF_LIFEBOATS[1]
/** The lifeboats on their davits, down to the sun deck, and down to the roof. */
const SUN_DECK_DAVITS = lifeboatOnDavits(LIFEBOAT_UP)
const ROOF_DAVITS = lifeboatOnDavits(ROOF_LIFEBOAT_UP)
/** How high over the Ground at `x` something `up` over the roof's Route is. */
const overRoof = (x: number, up = 0) => terrain.groundY(x) - DECK_C + up

/** The Föri: how long it takes there and back, timed for whoever's coming. */
const FORI_SWING = 180

const PLATFORMS: PlatformDefinition[] = (() => {
	const out: PlatformDefinition[] = []
	// The car deck: cars, and a lorry's trailer, onto a car's roof and up.
	const carDeck = room('carDeck').from
	out.push(platform(carDeck + 180, CAR_WIDTH, CAR_HEIGHT, car('#2f6fd1')))
	out.push(
		platform(
			carDeck + 340,
			340,
			TRAILER_HEIGHT,
			trailer(340, '#1d3c6e', 'SCOOP FREIGHT'),
		),
	)
	out.push(platform(carDeck + 720, CAR_WIDTH, CAR_HEIGHT, car('#c8312b')))
	// The tax-free shop's shelves, low and high.
	const shop = room('shop').from
	for (const [at, width, height] of [
		[220, 200, SHELF_LOW],
		[480, 200, SHELF_HIGH],
		[760, 220, SHELF_LOW],
		[1120, 240, SHELF_LOW],
		[1400, 200, SHELF_HIGH],
		[1680, 220, SHELF_LOW],
	])
		out.push(platform(shop + at, width, height, shopShelf(width, height, at)))
	// Lifeboats on their davits, over the sun deck.
	const sunDeck = room('sunDeck').from
	for (const at of [420, 1500, 1900])
		out.push(
			platform(sunDeck + at, 140, LIFEBOAT_UP, SUN_DECK_DAVITS.asset, {
				width: LIFEBOAT_WIDTH,
				height: SUN_DECK_DAVITS.height,
				top: LIFEBOAT_TOP,
			}),
		)
	// The buffet: its counters, and the tables, to hop along.
	const buffet = room('buffet').from
	out.push(platform(buffet + 260, 300, BUFFET_HEIGHT, buffetCounter(300)))
	for (const at of [800, 1040, 1280, 1520])
		out.push(platform(buffet + at, TABLE_WIDTH, TABLE_HEIGHT, diningTable))
	out.push(platform(buffet + 1800, 260, BUFFET_HEIGHT, buffetCounter(260)))
	// The dance bar's stage.
	const bar = room('bar').from
	out.push(platform(bar + 500, 400, STAGE_HEIGHT, stage(400)))
	// Up on the roof: the walkway, and lifeboats over it.
	out.push(
		platform(
			ROOF_FROM,
			ROOF_TO - ROOF_FROM,
			overRoof(ROOF_FROM),
			roofWalkway(ROOF_TO - ROOF_FROM, AWNING),
			{ height: WALKWAY_HEIGHT, top: WALKWAY_TOP },
		),
	)
	for (const x of ROOF_LIFEBOATS)
		out.push(
			platform(x - 70, 140, overRoof(x, ROOF_LIFEBOAT_UP), ROOF_DAVITS.asset, {
				width: LIFEBOAT_WIDTH,
				height: ROOF_DAVITS.height,
				top: LIFEBOAT_TOP,
			}),
		)
	// The Föri, across the Aura.
	out.push({
		...platform(AURA.from, FORI_WIDTH, 0, fori, {
			height: FORI_HEIGHT,
			top: FORI_DECK,
		}),
		move: swing(AURA.from, { x: RIVER_WIDTH - FORI_WIDTH }, FORI_SWING),
	})
	return out
})()

/** Where the voyage's view changes: out of Stockholm, out to sea, and back in to Turku. */
const ARCHIPELAGO = STERN + 2400
const OPEN_SEA = room('sunDeck').from + 1900
const TURKU_ARCHIPELAGO = room('buffet').from + 1600
const TURKU_VIEW = BOW - 400

/** Which stretch `x` is in, for what's in the way there. */
type Stretch = Room | 'slussen' | 'turku' | 'ramp'
const stretchAt = (x: number): Stretch => {
	if (x < QUAY_END) return 'slussen'
	if (x >= TURKU) return 'turku'
	return sectionAt(x)?.room ?? 'ramp'
}

/**
 * How likely each thing is, in each stretch: passengers (Tourists),
 * gulls (geese), luggage (a rock), spilt drink (mud), a vent (steam), a
 * cyclist, fika; and the rest, a cheer.
 */
const MIX: Partial<Record<Stretch, number[]>> = {
	slussen: [0.4, 0.25, 0.2, 0, 0, 0, 0.1],
	carDeck: [0.2, 0, 0.45, 0, 0, 0, 0.15],
	corridor: [0.35, 0, 0.3, 0.1, 0, 0, 0.12],
	shop: [0.35, 0, 0.3, 0, 0, 0, 0.18],
	sunDeck: [0.1, 0.25, 0, 0, 0.2, 0, 0.2],
	buffet: [0.3, 0, 0.05, 0.25, 0, 0, 0.22],
	bar: [0.4, 0, 0, 0.2, 0.2, 0, 0.1],
	bowHall: [0.45, 0, 0.3, 0, 0, 0, 0.1],
	turku: [0.2, 0.2, 0.1, 0, 0, 0.3, 0.12],
}

/** The most fika and cheers it can have: the backend takes no more than 22 and 8. */
const MOST_FIKA = 18
const MOST_CHEERS = 6

/** Clear of stairs, ramps, the river's banks and the Föri's stops. */
const clear = (x: number) => {
	const stretch = stretchAt(x)
	if (stretch === 'ramp') return false
	if (STAIRS[stretch as Room]) return false
	const section = sectionAt(x)
	// Not in a doorway, between one room and the next.
	if (section && (x < section.from + 120 || x > section.to - 120)) return false
	if (x > AURA.from - 260 && x < AURA.to + 260) return false
	if (x > STERN - 120 && x < STERN + 60) return false
	return true
}

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(1959)
	let fika = 0
	let cheers = 0
	const nextFika = (x: number): FikaItem => {
		const items = x >= TURKU ? TURKU_FIKA : FERRY_FIKA
		return items[fika++ % items.length]
	}
	const extra: Boost[] = []
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		clear,
		pick: (x): Obstacle | Boost | undefined => {
			const mix = MIX[stretchAt(x)]
			if (!mix) return undefined
			const [people, gulls, luggage, spilt, vent, cyclist, cafe] = mix
			/** Which of them the roll lands in, each after the one before. */
			const roll = random()
			let upTo = 0
			const lands = (share: number) => {
				upTo += share
				return roll < upTo
			}
			if (lands(people))
				return { kind: 'tourists', x, count: 2 + Math.floor(random() * 3) }
			if (lands(gulls))
				return { kind: 'geese', x, count: 2 + Math.floor(random() * 3) }
			if (lands(luggage)) return { kind: 'rock', x }
			if (lands(spilt))
				return { kind: 'mud', x, width: 60 + Math.round(random() * 40) }
			if (lands(vent)) {
				// Fika up over some of them, for whoever's fired up to it.
				if (random() < 0.5 && fika < MOST_FIKA)
					extra.push({
						kind: 'fika',
						x: x + 130,
						height: 200,
						item: nextFika(x),
					})
				return { kind: 'steam', x }
			}
			// Setting off as you come, and riding on past you, off the way you
			// came: on this side of the river, never into it.
			if (lands(cyclist))
				return x < AURA.from
					? {
							kind: 'cyclist',
							x,
							// Up and down the near bank, turning round at either end.
							shuttle: [TURKU + 150, AURA.from - 150],
						}
					: { kind: 'geese', x, count: 2 + Math.floor(random() * 3) }
			if (lands(cafe) || cheers >= MOST_CHEERS) {
				if (fika >= MOST_FIKA) return undefined
				return {
					kind: 'fika',
					x,
					height: random() < 0.5 ? 26 : 95,
					item: nextFika(x),
				}
			}
			cheers++
			return {
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			}
		},
	})
	// On the sun deck, just before its end: the boost for the jump to the roof.
	extra.push({
		kind: 'fika',
		x: RUN_UP_FIKA,
		height: 26,
		item: nextFika(RUN_UP_FIKA),
	})
	// Up on the roof, on a lifeboat: a captain's hat.
	extra.push({
		kind: 'fika',
		x: HAT_ON,
		height: overRoof(HAT_ON, ROOF_LIFEBOAT_UP + 30),
		item: 'captainsHat',
	})
	fika++
	// Fika up on the high shelves, and on the stage.
	for (const p of PLATFORMS)
		if (
			!p.move &&
			(p.height === SHELF_HIGH ||
				p.height === STAGE_HEIGHT ||
				p.height === LIFEBOAT_UP) &&
			fika < MOST_FIKA
		)
			extra.push({
				kind: 'fika',
				x: Math.round(p.x + p.width / 2),
				height: p.height + 26,
				item: nextFika(p.x),
			})
	// And the club out cheering: by the terminal, in a cabin's doorway, in
	// the dance bar, and off the Föri, on the far bank.
	for (const spot of [
		QUAY_END - 520,
		room('corridor').from + 900,
		room('bar').from + 1100,
		AURA.to + 380,
	]) {
		if (cheers >= MOST_CHEERS) break
		let x = spot
		while (
			[...obstacles, ...boosts, ...extra].some((o) => Math.abs(o.x - x) < 90)
		)
			x += 30
		cheers++
		extra.push({
			kind: 'cheer',
			x,
			member: CHEERERS[cheers % CHEERERS.length],
		})
	}
	boosts.push(...extra)
	// Cheerers stand at the back of the path, as far back as what's on the
	// floor does: none in front of a shelf, a lorry or a table, stood on
	// nothing. Along past it.
	for (const boost of boosts)
		if (boost.kind === 'cheer') boost.x = clearOfFloorPlatforms(boost.x)
	boosts.sort((a, b) => a.x - b.x)
	// Nothing in the way of the Föri, nor on it.
	// Nor on the run-up to the jump onto the roof, from its fika on.
	const kept = obstacles.filter(
		(o) =>
			(o.x < AURA.from - 200 || o.x > AURA.to + 200) &&
			(o.x < RUN_UP_FIKA - 150 || o.x > room('sunDeck').to),
	)
	if (fika > MOST_FIKA + 4) console.error(`Scoop Cruises has ${fika} fika`)
	// By each spilt drink, its glass, knocked over, lying at its far end.
	const glasses = kept.flatMap((o): Course['scenery'] =>
		o.kind === 'mud'
			? [
					{
						x: Math.round(o.x + o.width / 2 + 16),
						asset: tippedGlass,
						scale: 2,
						setBack: -PATH_BACK,
					},
				]
			: [],
	)
	return {
		obstacles: kept,
		boosts,
		scenery: [...scenery(random), ...glasses].sort((a, b) => a.x - b.x),
	}
}

/** How far clear of what's on a deck's floor a cheerer stands. */
const CHEERER_ROOM = 40

/** On the floor, where its picture stands back on the path: not hung, not moving, not up on the roof. */
const onFloor = (p: PlatformDefinition) => !p.move && p.art?.top === STOOD_BACK

/** `x`, or along past whatever's on the floor there, clear of it. */
function clearOfFloorPlatforms(x: number) {
	let at = x
	for (;;) {
		const over = PLATFORMS.find(
			(p) =>
				onFloor(p) &&
				at > p.x - CHEERER_ROOM &&
				at < p.x + p.width + CHEERER_ROOM,
		)
		if (!over) return at
		at = over.x + over.width + CHEERER_ROOM
	}
}

/** Where each km sign stands, and how far either side of it to keep clear. */
const KM = (km: number) => START_X + km * 1000 * PX_PER_M
const nearKm = (x: number) =>
	[1, 2, 3, 4].some((km) => Math.abs(x - KM(km)) < 100)

function scenery(random: () => number): Course['scenery'] {
	const pieces: Course['scenery'] = []
	const add = (x: number, asset: string, scale = 2, setBack?: number) => {
		if (!nearKm(x)) pieces.push({ x: Math.round(x), asset, scale, setBack })
	}
	// Slussen: lamps along the quay, the terminal's sign, and bollards
	// along the quay's end.
	for (let x = START_X - 700; x < QUAY_END - 100; x += 300 + random() * 80)
		if (Math.abs(x - (QUAY_END - 300)) > 80)
			pieces.push({ x: Math.round(x), asset: lamp })
	add(QUAY_END - 300, terminalSignLettered, 1)
	for (const x of [QUAY_END - 120, QUAY_END - 40]) add(x, bollard, 2, -4)
	// On board: indoors, nothing in the way of the walls; out on the sun
	// deck, loungers, vents and lifebuoys.
	const sunDeck = room('sunDeck')
	const deckBits = [lounger, ventilator, lounger, lifebuoy, lounger]
	let n = 0
	for (
		let x = sunDeck.from + 160;
		x < sunDeck.to - 120;
		x += 190 + random() * 140
	) {
		// Clear of the funnel.
		if (Math.abs(x - (sunDeck.from + 1150)) < 110) continue
		add(x, deckBits[n++ % deckBits.length], 2, -2)
	}
	// Turku, along the Aura: lindens, lamps, benches and bikes, and the
	// Föri's stop either bank; and past the finish, Posankka.
	// Finland's flags, flying along the quay, to welcome everyone off.
	const flagsTo = TURKU + 640
	for (let x = TURKU + 130; x < flagsTo; x += 150) add(x, finnishFlag)
	const turkuBits = [linden, lamp, bench, linden, parkedBike, lamp]
	n = 0
	for (let x = flagsTo + 60; x < FINISH + 900; x += 150 + random() * 120) {
		if (x > AURA.from - 140 && x < AURA.to + 140) continue
		if (x > FINISH + 60 && x < FINISH + 380) continue
		const asset = turkuBits[n++ % turkuBits.length]
		if (asset === lamp) pieces.push({ x: Math.round(x), asset })
		else add(x, asset)
	}
	add(AURA.from - 70, foriSign, 1, -2)
	add(AURA.to + 70, foriSign, 1, -2)
	const posankkaAt = FINISH + 220
	add(posankkaAt, posankkaLawn, 4)
	add(posankkaAt, pigDuck, 2, 10 + 24 - 4)
	pieces.sort((a, b) => a.x - b.x)
	return pieces
}

/** The ferry's floors, and the quays': carpet, decking, steel, granite. */
const GRANITE = '#9a958d'
const GRANITE_DARK = '#7f7a72'
const STEEL = '#7d848b'
const floors = (pick: (look: [string, string]) => string) => {
	const looks: Record<Room, [string, string]> = {
		carDeck: ['#6f7d74', '#56625a'],
		corridor: ['#34558e', '#26406c'],
		stairsUp: ['#8a7a6a', '#6a5c4e'],
		shop: ['#d8d0c0', '#b8ae9c'],
		deckStairsUp: ['#b98a56', '#946a3e'],
		sunDeck: ['#c49660', '#9a7044'],
		deckStairsDown: ['#b98a56', '#946a3e'],
		buffet: ['#8a2a3a', '#6a1e2c'],
		bar: ['#3a2a4a', '#2a1d36'],
		stairsDown: ['#8a7a6a', '#6a5c4e'],
		bowHall: ['#34558e', '#26406c'],
	}
	return [
		[-2000, pick([GRANITE, GRANITE_DARK])],
		[QUAY_END, pick([STEEL, '#5d646c'])],
		...SECTIONS.map((s): [number, string] => [s.from, pick(looks[s.room])]),
		[BOW, pick([STEEL, '#5d646c'])],
		[TURKU, pick(['#b8ab98', '#978a78'])],
	] as [number, string][]
}

const ferry: Cave = {
	from: STERN,
	to: BOW,
	hull: true,
	ceiling: (x) => {
		const section = sectionAt(x)
		return section ? CEILING[section.room] : undefined
	},
	// The roof, over the rooms; open sky over the sun deck and up the
	// stairs to it.
	surface: (x) => {
		const section = sectionAt(x)
		return section && CEILING[section.room] !== undefined ? ROOF : undefined
	},
	foot: (x) => (x >= STERN && x < BOW ? WATERLINE : undefined),
	features: features(),
}

export const scoopLine: CourseDefinition = {
	id: 'scoop-line',
	name: 'Scoop Cruises',
	blurb:
		'From Slussen up the ramp onto the ferry to Turku: through its shop, buffet and dance bar, out on deck, and along the Aura to Posankka.',
	terrain,
	cave: ferry,
	platforms: PLATFORMS,
	runDirectors: ['eline', 'anna'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#7cc0ec',
			'--sky-blue-bottom': '#e4f4fc',
			// Under the horizon, it's all water: Riddarfjärden, the sea, the Aura.
			'--grass-green': SEA,
		},
		horizon: {
			far: oldTownFar,
			near: oldTownNear,
			fill: '#b98a5a',
			spires: oldTownChurches,
		},
		voyage: [
			{
				from: ARCHIPELAGO,
				horizon: { far: archipelagoFar, near: archipelagoNear, fill: SEA_FAR },
			},
			{
				from: OPEN_SEA,
				horizon: { far: openSeaFar, near: openSeaNear, fill: SEA_FAR },
			},
			{
				from: TURKU_ARCHIPELAGO,
				horizon: { far: archipelagoFar, near: archipelagoNear, fill: SEA_FAR },
			},
			{
				from: TURKU_VIEW,
				horizon: {
					far: turkuFar,
					near: turkuNear,
					fill: '#b8a68b',
					spires: turkuSpires,
				},
			},
		],
		// Up on the sun deck, the sea and its islands over the rail.
		horizonLift: -0.6,
		horizonTrees: false,
		strips: [
			{ id: 'ferry-floor', stops: floors(([lit]) => lit) },
			{ id: 'ferry-floor-edge', stops: floors(([, dark]) => dark) },
			{
				id: 'ferry-trim',
				stops: [
					[-2000, '#b3ab9f'],
					[QUAY_END, '#9aa1a8'],
					[STERN, FERRY_WHITE],
					[BOW, '#9aa1a8'],
					[TURKU, '#b3ab9f'],
				],
			},
		],
		ground: [
			[-PATH_BACK - VERGE, 'url(#ferry-floor-edge)'],
			[-PATH_BACK, 'url(#ferry-floor-edge)'],
			[-PATH_BACK + 5, 'url(#ferry-floor)'],
			[PATH_FRONT, 'url(#ferry-trim)'],
			[PATH_FRONT + 2, '#8a8278'],
		],
		// The water between the quays and the ferry, under it, and all
		// round it: open water, out at sea.
		bridge: {
			from: QUAY_END,
			to: TURKU,
			underside: '#6a7178',
			highlight: '#9aa1a8',
			underbelly: '#3a4047',
			water: SEA,
			rail: '#e8ecef',
			quay: quayWall,
			open: true,
			stoneBefore: true,
		},
		cave: {
			rock: FERRY_WHITE,
			seam: '#c9ced0',
			// The underside of each deck over a room: its ceiling's trim.
			edge: '#c9ced0',
			wall: '#d9d2c3',
			// Along the top of its roof, a white rail.
			grass: FERRY_WHITE,
			tiles: { rock: HULL_TILE, front: HULL_TILE },
			bore: false,
		},
		// Into the Aura.
		gap: `linear-gradient(to bottom, ${RIVER} 0 8px, #2f5a70 8px, #16303e 160px)`,
		// Luggage, not rocks.
		rocks: [
			{ asset: suitcase, width: 30, height: 26 },
			{ asset: rucksack, width: 24, height: 28 },
			{ asset: taxFreeBag, width: 26, height: 30 },
			{ asset: beerCrates, width: 30, height: 28 },
		],
		// Spilt drinks, not mud: a glass knocked over by each.
		mudWord: 'Spilt drink!',
		mud: 'sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.25)',
		// The preview, from the stern ramp: on board, the inside open.
		previewFrom: STERN - 300,
		// Stood a little nearer than the lorries' and the shelves' feet.
		touristsNearer: 6,
		// Gulls, not geese.
		geese: 'grayscale(1) brightness(1.5)',
	},
	...layOut(),
}
