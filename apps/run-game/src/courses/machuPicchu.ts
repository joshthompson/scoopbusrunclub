import type { RunnerName } from '@/data/runners'
import { PATH_BACK, PATH_FRONT, START_X, VERGE } from '../game/constants'
import { type Gap, type Terrain, withGaps } from '../game/terrain'
import { withHat } from './kit/hats'
import {
	BROKEN_BRIDGE,
	DOORWAY,
	GRANITE,
	MACHU_FACE,
	MACHU_PAVING,
	MACHU_PICCHU_HORIZONS,
	SUN_GATEWAY,
	bananaPlant,
	brokenBridge,
	carriage,
	citadelHouse,
	edgeSign,
	type gateway,
	houseArt,
	intihuatana,
	logArt,
	machuPicchuStrips,
	masonry,
	mossTree,
	orchids,
	ropeBridgeArt,
	roundRuin,
	ruinWall,
	ruinWallArt,
	sacredRockArt,
	skyCondors,
	sunGateWalls,
	templeArt,
	terraceArt,
	terraceSteps,
	thatchedHouse,
	townHouse,
	trailSign,
	treeFern,
} from './kit/machuPicchuScenery'
import { type PixelRect, pixelArt } from './kit/pixelArt'
import { nearGap, scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import { swing } from './kit/swing'
import type {
	Boost,
	Course,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
	Scenery,
} from './types'

/**
 * Machu Picchu. Up the Inca Trail, from the river at Km 82, on its stone
 * stairs, up and up through the cloud forest, past the ruins along the
 * way: Patallacta's terraces, a rope bridge over a gorge, Runkurakay's
 * walls to run along the tops of, Wiñay Wayna's great flight of terraces,
 * a drawbridge of logs on a sheer cliff, and at last the Gringo Killer,
 * fifty steps near enough straight up, to the Sun Gate.
 *
 * Through it, and there's the citadel, Huayna Picchu over it, the cloud
 * lying under it all, filling the valley, the fog settled in. Down its
 * terraces and through the ruins themselves: along the tops of its houses'
 * walls, through its trapezoid doorways, up onto the Temple of the Sun,
 * across the plaza with its llamas, and up to the Intihuatana.
 *
 * And then the edge, and no way on but off it: into the cloud, blind, and
 * falling, till a condor swoops in and catches you, and everyone else
 * going over, and carries you down to the valley floor, the Urubamba
 * roaring along it, for a sprint to the finish in Aguas Calientes. A giant
 * one carries the bus down after you.
 */

const CHEERERS: RunnerName[] = [
	'eline',
	'rick',
	'anna',
	'lyra',
	'keith',
	'josh',
	'august',
]

/** How long it is, start line to finish line. */
const LENGTH = 20000
const FINISH = START_X + LENGTH

/** Where the course changes, along it: the Sun Gate, the citadel, and its edge, 4.5 km in. */
const SUN_GATE = 13560
const CITADEL = 14000
const EDGE = 18000
/** Where a condor's brought everyone down to the valley floor, by: a long glide down, and a sprint to the line. */
const LAND = 19650
/** Where the giant condor's brought the bus down, by. */
const BUS_LAND = 19650

/**
 * How much of the slope it's drawn at that it is to run up: drawn steep,
 * stone stairs up a mountain, but no harder going than a big hill. As up
 * Everest.
 */
const SPEED_SHARE = 0.4
const SPEED_EASING = 0.6
const speedSlope = (tilt: number) =>
	(tilt * SPEED_SHARE) / (1 + Math.abs(tilt) * SPEED_EASING)

/**
 * How high it's climbed, `along` the course: a point at each change in it,
 * a smooth climb between. Level ones, a flat: across a gorge, by a ruin.
 * Its steps, up and down, are added on (see `STEPS`).
 */
const CLIMB: [along: number, rise: number][] = [
	[-1600, 0],
	[0, 0],
	[400, 0],
	// Up from the river, past Patallacta.
	[1400, 110],
	[1700, 130],
	[2300, 150],
	[2850, 236],
	// The gorge, and its rope bridge.
	[2950, 240],
	[3550, 240],
	[4300, 380],
	// Runkurakay, on its ridge.
	[4800, 420],
	[6600, 470],
	// Up the stairs to Sayacmarca.
	[7600, 640],
	[8000, 660],
	[8400, 670],
	[9000, 760],
	// Wiñay Wayna.
	[9200, 770],
	[10400, 800],
	[10900, 900],
	// The cliff path, and its drawbridge.
	[11000, 910],
	[11800, 910],
	[12700, 1060],
	// The Gringo Killer: a steep stone staircase, a few great steps in it
	// (see `STEPS`), and the Sun Gate at the top.
	[12800, 1070],
	[13240, 1218],
	[13700, 1218],
	// Down to the citadel.
	[14200, 1128],
	// The citadel, its terraces down, its houses, the temple, the plaza.
	[16000, 1108],
	// Up to the Intihuatana: a steep stone staircase, a couple of great
	// steps in it (see `STEPS`), and its hilltop, on to the edge.
	[16850, 1108],
	[17250, 1236],
	[LENGTH + 2000, 1236],
]

/**
 * Steps, sheer, `rise` px up (or down) at `along`. Up the Gringo Killer,
 * and up to the Intihuatana, a Ledge each, to jump up; and down the
 * citadel's terraces, a drop each.
 */
const GRINGO_KILLER = 12900
const GRINGO_STEPS = 3
const GRINGO_TREAD = 150
const GRINGO_RISER = 24
const TERRACES_DOWN = 14260
const INTIHUATANA = 16950
const STEPS: [along: number, rise: number][] = [
	...Array.from({ length: GRINGO_STEPS }, (_, i): [number, number] => [
		GRINGO_KILLER + i * GRINGO_TREAD,
		GRINGO_RISER,
	]),
	...[0, 1, 2, 3].map((i): [number, number] => [TERRACES_DOWN + i * 90, -30]),
	...[0, 1].map((i): [number, number] => [INTIHUATANA + i * 200, 32]),
]

/**
 * A smooth climb through `points`, never overshooting between them, so a
 * flat stays flat: a monotone cubic.
 */
function smoothThrough(points: [number, number][]) {
	const n = points.length
	const xs = points.map(([x]) => x)
	const ys = points.map(([, y]) => y)
	const d: number[] = []
	for (let i = 0; i < n - 1; i++)
		d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
	const m: number[] = [d[0]]
	for (let i = 1; i < n - 1; i++)
		m.push(d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]))
	m.push(d[n - 2])
	return (x: number) => {
		if (x <= xs[0]) return ys[0]
		if (x >= xs[n - 1]) return ys[n - 1]
		let i = 0
		while (x > xs[i + 1]) i++
		const h = xs[i + 1] - xs[i]
		const t = (x - xs[i]) / h
		const t2 = t * t
		const t3 = t2 * t
		return (
			(2 * t3 - 3 * t2 + 1) * ys[i] +
			(t3 - 2 * t2 + t) * h * m[i] +
			(-2 * t3 + 3 * t2) * ys[i + 1] +
			(t3 - t2) * h * m[i + 1]
		)
	}
}

const climb = smoothThrough(CLIMB)

/** The stairs up to the Intihuatana, from and to. */
const INTIHUATANA_STAIRS = [16850, 17250]

/** On the trail, its stone stairs: the climb in steps this high, low enough to run up. */
const STAIR = 8

/** The ground's line at `x`, as a y on the screen: up the mountain, its stairs and steps; and off the edge, the valley floor. */
function groundY(x: number) {
	const along = x - START_X
	if (along >= EDGE) return 490
	let rise = climb(along)
	if (
		along < SUN_GATE ||
		(along > INTIHUATANA_STAIRS[0] && along < INTIHUATANA_STAIRS[1])
	)
		rise = Math.round(rise / STAIR) * STAIR
	for (const [at, step] of STEPS) if (along >= at) rise += step
	return 490 - rise
}

/** How steep it looks at `x`: how far down for every pixel along, negative uphill. */
const tilt = (x: number) =>
	-(climb(x - START_X + 4) - climb(x - START_X - 4)) / 8

/** Gaps: a gorge, its rope bridge over it; and a gap in the cliff path, a log across it. */
const GORGE: Gap = { from: START_X + 3040, to: START_X + 3420 }
const BREAK: Gap = { from: START_X + 11250, to: START_X + 11560 }
/** Ravines across the trail, their bridges long since broken: narrow enough to jump. */
const RAVINES: Gap[] = [
	{ from: START_X + 8130, to: START_X + 8300 },
	{ from: START_X + 12060, to: START_X + 12240 },
]

const terrain: Terrain = withGaps(
	{
		length: LENGTH,
		finishX: FINISH,
		groundY,
		slope: (x) => (x - START_X >= EDGE ? 0 : speedSlope(tilt(x))),
		tilt: (x) => (x - START_X >= EDGE ? 0 : tilt(x)),
	},
	[GORGE, BREAK, ...RAVINES],
	[
		// The citadel's terraces, down; and the edge.
		...STEPS.filter(([, rise]) => rise < 0).map(([at]) => START_X + at),
		START_X + EDGE,
	],
	STEPS.filter(([, rise]) => rise > 0).map(([at]) => START_X + at),
)

const X = (along: number) => START_X + along

// --- Platforms -----------------------------------------------------------------

/** A terrace beside the path: grass on top, a wall of dry stone down to the path. */
const terrace = (
	x: number,
	width: number,
	height: number,
): PlatformDefinition => ({
	x,
	width,
	height,
	art: terraceArt(width, height, Math.round(x + height)),
})

/** A flight of terraces up from `x`, `count` of them, each `rise` higher. */
function flight(
	x: number,
	count: number,
	rise: number,
	step = 140,
	width = 160,
) {
	return Array.from({ length: count }, (_, i) =>
		terrace(x + i * step, width, rise * (i + 1)),
	)
}

/** A ruined wall to run along the top of, beside the path. */
const wall = (
	from: number,
	to: number,
	height: number,
	seed: number,
): PlatformDefinition => ({
	x: X(from),
	width: to - from,
	height,
	art: ruinWallArt(to - from, height, seed),
})

/** A house in the citadel, roofless, to run along the top of its long wall. */
const house = (from: number, to: number, seed: number): PlatformDefinition => ({
	x: X(from),
	width: to - from,
	height: HOUSE,
	art: houseArt(to - from, HOUSE, seed),
})
/** How high the citadel's houses' walls are. */
const HOUSE = 62

/** Patallacta: terraces up the hillside, Inca Cola on top. */
const PATALLACTA = flight(X(1760), 3, 50)

/** The rope bridge over the gorge: level with the path, still holding. */
const BRIDGE_ART = ropeBridgeArt(GORGE.to - GORGE.from)
const BRIDGE: PlatformDefinition = {
	x: GORGE.from,
	width: GORGE.to - GORGE.from,
	height: 0,
	// Solid: duck on it and you slide along it, not down through it.
	solid: 6,
	art: BRIDGE_ART,
}

/**
 * Runkurakay: its walls, ruined, beside the path, low ones and high ones,
 * staggered: up off the path onto a low one, up again onto a high one,
 * along them, and down. The path, under them, has its trekkers.
 */
const RUNKURAKAY = [
	wall(4960, 5200, 54, 261),
	wall(5120, 5420, 104, 262),
	wall(5500, 5720, 60, 263),
	wall(5660, 5980, 112, 264),
	wall(6060, 6260, 66, 265),
	wall(6200, 6460, 118, 266),
]

/** Wiñay Wayna: a great flight of terraces up beside the path, a long top one, and down. */
const WINAY_WAYNA = [
	...flight(X(9260), 5, 46),
	terrace(X(9260 + 5 * 140), 300, 5 * 46),
	...[4, 3, 2].map((n, i) =>
		terrace(X(9260 + 5 * 140 + 280 + i * 140), 160, n * 46),
	),
]

/** The drawbridge: a log, sliding across the gap in the cliff path, and back. */
const LOG = 150
const DRAWBRIDGE: PlatformDefinition = {
	x: BREAK.from,
	width: LOG,
	height: 0,
	move: swing(BREAK.from, { x: BREAK.to - BREAK.from - LOG }, 170),
	art: logArt(LOG),
}

/**
 * The citadel's houses, roofless, in a row along the path, a gap between
 * each to jump: along their tops, or through their doorways down below.
 */
const HOUSES = [
	house(14760, 14960, 271),
	house(15040, 15200, 272),
	house(15290, 15500, 273),
]

/** The Temple of the Sun, its curved wall on its rock: up onto the rock, and up again onto it. */
const TEMPLE_ROCK: PlatformDefinition = {
	x: X(15640),
	width: 240,
	height: 56,
	art: sacredRockArt(240, 56),
}
const TEMPLE: PlatformDefinition = {
	x: X(15700),
	width: 120,
	height: 128,
	art: templeArt(120, 128),
}

const PLATFORMS: PlatformDefinition[] = [
	...PATALLACTA,
	BRIDGE,
	...RUNKURAKAY,
	...WINAY_WAYNA,
	DRAWBRIDGE,
	...HOUSES,
	TEMPLE_ROCK,
	TEMPLE,
].sort((a, b) => a.x - b.x)

/** The top of a platform, as a fika's height over the Ground there. */
const onTop = (p: PlatformDefinition, x = p.x + p.width / 2) =>
	terrain.groundY(x) - (terrain.groundY(p.x) - p.height) + 26

/**
 * Inca Cola, up where it's worth the climb: on top of each flight of
 * terraces, along the high walls, on the houses and the temple.
 */
function highCans(): Boost[] {
	const can = (p: PlatformDefinition, x = p.x + p.width / 2): Boost => ({
		kind: 'fika',
		x: Math.round(x),
		height: Math.round(onTop(p, x)),
		item: 'incaCola',
	})
	return [
		can(PATALLACTA[PATALLACTA.length - 1]),
		...RUNKURAKAY.filter((p) => p.height > 100).map((p) => can(p)),
		can(WINAY_WAYNA[5], WINAY_WAYNA[5].x + 80),
		can(WINAY_WAYNA[5], WINAY_WAYNA[5].x + 220),
		...HOUSES.map((p) => can(p)),
		can(TEMPLE),
	]
}

// --- The Leap -----------------------------------------------------------------

/** How far down the Leap a condor catches whoever's falling: about a third of the way. */
const CATCH_AT = 0.3
const TOP = groundY(X(EDGE) - 1)
const CATCH_Y = TOP + (490 - TOP) * CATCH_AT

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/** The bus's way down, in the giant condor's talons: off the edge, gliding, and down. */
function busFloor(x: number) {
	const along = x - START_X
	if (along < EDGE || along >= BUS_LAND) return undefined
	return TOP + (490 - TOP) * ease((along - EDGE) / (BUS_LAND - EDGE))
}

/**
 * The cliff face at the edge: sheer granite, all the way down from the
 * path's front edge, ledges across it, ferns clinging on, the forest over
 * the mountain's face giving out into it on its left. 64 by as deep as it goes.
 */
const CLIFF_WIDTH = 64
const CLIFF_DEPTH = Math.round((490 - TOP) / 2) + 10
const cliffFace = (() => {
	const random = seeded(1911)
	const rects: PixelRect[] = []
	for (let y = 0; y < CLIFF_DEPTH; y += 2) {
		// Its left edge, ragged, where the forest gives out.
		const from = Math.round(18 + Math.sin(y / 9) * 6 + random() * 6)
		rects.push([
			from,
			y,
			CLIFF_WIDTH - from,
			2,
			y % 14 < 2 ? '#8f897a' : '#9a9483',
		])
		for (let x = from - 10; x < from; x += 2)
			if (random() < (x - from + 10) / 12) rects.push([x, y, 2, 2, '#8f897a'])
	}
	// Ledges across it, lit along their tops, ferns on some.
	for (let y = 4; y < CLIFF_DEPTH; y += 4 + Math.floor(random() * 10)) {
		const x = 20 + Math.floor(random() * 30)
		const w = 6 + Math.floor(random() * 16)
		rects.push([x, y, Math.min(w, CLIFF_WIDTH - x), 1, '#bdb6a4'])
		rects.push([x, y + 1, Math.min(w, CLIFF_WIDTH - x), 1, '#6a6556'])
		if (random() < 0.35)
			rects.push(
				[x + 2, y - 2, 3, 2, '#4c8a3e'],
				[x + 1, y - 1, 5, 1, '#3d7533'],
			)
	}
	// Cracks down it.
	for (let i = 0; i < 6; i++) {
		let x = 26 + Math.floor(random() * 34)
		for (let y = Math.floor(random() * CLIFF_DEPTH); y < CLIFF_DEPTH; y += 2) {
			rects.push([x, y, 1, 2, '#6a6556'])
			if (random() < 0.3) x += random() < 0.5 ? -1 : 1
			if (random() < 0.04) break
		}
	}
	// Its far side, round the corner, in shade.
	rects.push([CLIFF_WIDTH - 3, 0, 3, CLIFF_DEPTH, '#76705f'])
	return pixelArt(CLIFF_WIDTH, CLIFF_DEPTH, rects)
})()

/**
 * The bank of cloud the citadel stands over, and the Leap goes down into:
 * its top, and how deep it is. The condors catch whoever's falling in it,
 * near its bottom.
 */
const CLOUD_TOP = Math.round(CATCH_Y - 92)
const CLOUD_DEPTH = 120

/**
 * The citadel, up on its ridge: under its path the mountain goes down into
 * the bank of cloud and is lost in it, the sky under that. Not near the
 * edge: there, it's a cliff, all the way down.
 */
function ridge(x: number) {
	const along = x - START_X
	if (along < SUN_GATE + 200 || along > EDGE - 520) return undefined
	// Ragged along its underside, inside the cloud.
	return (
		CLOUD_TOP + 60 + Math.round(Math.sin(x / 37) * 6 + Math.sin(x / 11) * 3)
	)
}

// --- Along the course ---------------------------------------------------------

/** Llamas, waiting on the path to be ridden. */
const LLAMAS = [1150, 4550, 7700, 10560, 12420, 14660, 15960].map(X)

/** Whether `along` is somewhere nothing should be in the way: by a step, a gap, a gate, a platform's foot, or the edge. */
function busy(along: number) {
	const x = X(along)
	if (nearGap(terrain, x, 220)) return true
	if (STEPS.some(([at]) => along > at - 160 && along < at + 120)) return true
	if (Math.abs(along - SUN_GATE) < 260) return true
	if (along > EDGE - 420) return true
	if (LLAMAS.some((l) => Math.abs(l - x) < 160)) return true
	if (DOORWAYS.some((d) => Math.abs(d - along) < 120)) return true
	return false
}

/** The citadel's doorways, across the path, between its houses. */
const DOORWAYS = [15000, 15245, 16260]

/** Where the train's in, at Aguas Calientes: its first carriage. */
const TRAIN = 20250

/** Which bit of the course `along` is on. */
const zoneOf = (along: number) =>
	along < SUN_GATE ? 'trail' : along < EDGE ? 'citadel' : 'valley'

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(1911)
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		clear: (x) => !busy(x - START_X),
		pick: (x): Obstacle | Boost | undefined => {
			const along = x - START_X
			const zone = zoneOf(along)
			const roll = random()
			if (zone === 'valley') {
				if (along < LAND + 200) return undefined
				if (roll < 0.4) return { kind: 'rock', x }
				if (roll < 0.7) return { kind: 'fika', x, height: 26, item: 'incaCola' }
				return cheer(x)
			}
			if (zone === 'citadel') {
				// Tourists, everywhere, taking pictures.
				if (roll < 0.3)
					return { kind: 'tourists', x, count: 2 + Math.floor(random() * 2) }
				if (roll < 0.48) return { kind: 'rock', x }
				if (roll < 0.78)
					return {
						kind: 'fika',
						x,
						height: random() < 0.5 ? 26 : 95,
						item: 'incaCola',
					}
				return cheer(x)
			}
			// The trail: rocks, low branches in the cloud forest, trekkers.
			if (roll < 0.34) return { kind: 'rock', x }
			if (roll < 0.5) return { kind: 'branch', x }
			if (roll < 0.6) return { kind: 'tourists', x, count: 2 }
			if (roll < 0.84)
				return {
					kind: 'fika',
					x,
					height: random() < 0.55 ? 26 : 95,
					item: 'incaCola',
				}
			return cheer(x)
		},
	})
	function cheer(x: number): Boost {
		return {
			kind: 'cheer',
			x,
			member: CHEERERS[Math.floor(random() * CHEERERS.length)],
		}
	}
	boosts.push(...highCans())
	// Everyone out cheering at the Sun Gate, and in the plaza.
	boosts.push(cheer(X(SUN_GATE + 300)), cheer(X(16500)))
	boosts.sort((a, b) => a.x - b.x)
	obstacles.sort((a, b) => a.x - b.x)
	return { obstacles, boosts, scenery: scenery(obstacles) }
}

/** How wide a picture drawn in code is, in its own pixels: from its SVG's width. */
const artWidth = (asset: string) =>
	Number(/width%3D%22(\d+)%22/.exec(asset)?.[1] ?? 0)

/**
 * How much the Ground can rise or fall under something stood on it, for it
 * not to float: what it's stood back in the grass behind the path hides.
 */
const LEVEL = 12

/** Whether the Ground's near enough level from `x - half` to `x + half`, and there all the way. */
function level(x: number, half: number) {
	let low = Number.NEGATIVE_INFINITY
	let high = Number.POSITIVE_INFINITY
	for (let at = x - half; at <= x + half; at += 4) {
		if (terrain.inGap(at)) return false
		const y = terrain.groundY(at)
		low = Math.max(low, y)
		high = Math.min(high, y)
	}
	return low - high <= LEVEL
}

/** What stands along the course: the trail's forest and ruins, the citadel, the valley's town. */
function scenery(obstacles: Obstacle[]): Scenery[] {
	const random = seeded(1450)
	const out: Scenery[] = []
	const taken = (x: number, room: number) =>
		out.some((s) => !s.front && Math.abs(s.x - x) < room)
	/** Clear of tourists, so they aren't hidden behind it, and of the platforms' walls. */
	const clearOf = (x: number) =>
		!obstacles.some((o) => o.kind === 'tourists' && Math.abs(o.x - x) < 60) &&
		!PLATFORMS.some((p) => x > p.x - 40 && x < p.x + p.width + 40)
	/**
	 * A piece stood behind the path, only where the path's near enough level
	 * under the whole of it: on a slope, or across a step, it'd stand on the
	 * highest of it and float over the rest, the sky under it, up on the
	 * citadel's ridge. One that has to be about here, `settle`d, is moved
	 * along to the nearest level spot; any other's left out.
	 */
	const add = (piece: Scenery, settle = false) => {
		const at = (x: number) => ({ scale: 2, ...piece, x: Math.round(x) })
		if (piece.front || piece.onFloor) return out.push(at(piece.x))
		const half = (artWidth(piece.asset) * (piece.scale ?? 2)) / 2
		if (level(piece.x, half)) return out.push(at(piece.x))
		if (!settle) return
		for (let d = 20; d < 600; d += 20)
			for (const x of [piece.x + d, piece.x - d])
				if (level(x, half)) return out.push(at(x))
	}
	/**
	 * A gateway across the path at `along`: its far jamb behind the path, its
	 * near jamb and its lintel in front, over whoever's going through.
	 */
	const gate = (along: number, g: ReturnType<typeof gateway>) => {
		const left = X(along) - g.frontWidth / 2
		add({
			x: left + g.across + g.backWidth / 2,
			asset: g.back,
			setBack: 0,
			onFloor: true,
		})
		add({
			x: left + g.frontWidth / 2,
			asset: g.front,
			setBack: -PATH_BACK - PATH_FRONT,
			front: true,
			onFloor: true,
		})
	}

	// Signs, along the way.
	const signs: [number, string, string][] = [
		// Behind the start, between its sign and the bus, parked.
		[-360, 'KM 82', 'CAMINO INCA'],
		[1560, 'PATALLACTA', '2750 M'],
		[4720, 'RUNKURAKAY', '3760 M'],
		[9080, 'WINAY WAYNA', '2650 M'],
		[12700, 'INTI PUNKU', '2720 M'],
		[CITADEL + 120, 'MACHU PICCHU', '2430 M'],
		[19760, 'AGUAS CALIENTES', '2040 M'],
	]
	for (const [along, name, sub] of signs)
		add({ x: X(along), asset: trailSign(name, sub), setBack: 2 }, true)

	// The ruins along the trail.
	add({ x: X(4860), asset: roundRuin }, true)
	add({ x: X(2500), asset: thatchedHouse }, true)
	add({ x: X(8480), asset: thatchedHouse }, true)
	add({ x: X(8600), asset: ruinWall(40, 18, 291) }, true)
	// The rope bridge's near side, its handrail and posts, over whoever's on it.
	out.push({
		x: (GORGE.from + GORGE.to) / 2,
		asset: BRIDGE_ART.front,
		scale: 2,
		setBack: BRIDGE_ART.top - PATH_BACK - BRIDGE_ART.height,
		front: true,
	})
	// What's left of the bridges over the ravines, and the cliff path's
	// gap, hanging down either side.
	for (const gap of [BREAK, ...RAVINES]) {
		// Its floor's stub level with the path.
		const setBack = BROKEN_BRIDGE.deck - PATH_BACK - BROKEN_BRIDGE.height
		out.push(
			{ x: gap.from - 1, asset: brokenBridge('near'), scale: 2, setBack },
			{ x: gap.to + 1, asset: brokenBridge('far'), scale: 2, setBack },
		)
	}
	add({ x: X(10700), asset: thatchedHouse }, true)
	// The Sun Gate, and its walls up the ridge either side.
	gate(SUN_GATE, SUN_GATEWAY)
	add({ x: X(SUN_GATE - 90), asset: sunGateWalls, onFloor: true, setBack: 0 })
	// The citadel's doorways.
	for (const along of DOORWAYS) gate(along, DOORWAY)
	add({ x: X(17380), asset: intihuatana, onFloor: true })
	add({ x: X(EDGE - 120), asset: edgeSign, setBack: 0 }, true)
	// The cliff, sheer, down from the edge.
	out.push({
		x: X(EDGE) - CLIFF_WIDTH,
		asset: cliffFace,
		scale: 2,
		// From the path's front edge on down.
		setBack: -CLIFF_DEPTH * 2 - PATH_BACK - PATH_FRONT,
	})

	// Along the way: each part of it its own.
	for (let x = -300; x < FINISH + 900; x += 90 + random() * 170) {
		const along = x - START_X
		if (taken(x, 70) || !clearOf(x)) continue
		if (Math.abs(along - SUN_GATE) < 200) continue
		if (DOORWAYS.some((d) => Math.abs(d - along) < 100)) continue
		if (along > EDGE - 260 && along < EDGE + 200) continue
		const zone = zoneOf(along)
		const roll = random()
		if (zone === 'trail') {
			if (roll < 0.34) add({ x, asset: mossTree })
			else if (roll < 0.62) add({ x, asset: treeFern })
			else if (roll < 0.84) add({ x, asset: orchids })
			else if (roll < 0.94)
				add({
					x,
					asset: ruinWall(28 + Math.floor(random() * 20), 12, Math.floor(x)),
				})
		} else if (zone === 'citadel') {
			if (roll < 0.4)
				add({
					x,
					asset: citadelHouse(40 + Math.floor(random() * 30), Math.floor(x)),
				})
			else if (roll < 0.62) add({ x, asset: terraceSteps })
			else if (roll < 0.74) add({ x, asset: orchids })
		} else {
			if (along < LAND - 300) continue
			// Not in front of the train.
			if (along > TRAIN - 140 && along < TRAIN + 3 * 186 + 40) continue
			if (roll < 0.36)
				add({
					x,
					asset: townHouse(
						['#e8b04a', '#d96a4a', '#5aa6c8', '#e8e0cf', '#8bc06a'][
							Math.floor(random() * 5)
						],
						Math.floor(x),
					),
				})
			else if (roll < 0.6) add({ x, asset: bananaPlant })
			else if (roll < 0.75) add({ x, asset: treeFern })
		}
	}
	// The train, in at Aguas Calientes, at the platform behind the path.
	for (let i = 0; i < 3; i++)
		out.push({ x: X(TRAIN) + i * 186, asset: carriage, scale: 2, setBack: 4 })
	return out.sort((a, b) => a.x - b.x)
}

export const machuPicchu: CourseDefinition = {
	id: 'machu-picchu',
	name: 'Machu Picchu',
	blurb:
		'Up the Inca Trail, through the Sun Gate and the ruins in the fog, then off the edge: a condor will catch you.',
	terrain,
	platforms: PLATFORMS,
	ride: 'llama',
	corgis: LLAMAS,
	flyer: 'condor',
	leap: { edge: X(EDGE), catchAt: CATCH_AT, land: X(LAND) },
	busFloor,
	// Up the climb ahead, so it's in view.
	lookAhead: 360,
	// Up the Incas' stairs, the bus slows more than you do, so the climb up
	// the trail isn't where it catches you.
	busHillPull: 1.4,
	runDirectors: ['eline', 'rick'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--sky-blue-top': '#7fb6dc',
			'--sky-blue-bottom': '#e4f0ee',
			'--grass-green': '#5f9a48',
			'--grass-dark-green': '#4a7a35',
			'--grass-darker-green': '#2f5224',
			'--dirt-brown': '#a59f8c',
			'--dirt-dark-brown': '#6b6657',
			'--dirt-darker-brown': '#4a4639',
		},
		horizon: MACHU_PICCHU_HORIZONS.TRAIL,
		voyage: [
			{ from: X(SUN_GATE - 200), horizon: MACHU_PICCHU_HORIZONS.CITADEL },
			// Under the cloud, down in the valley.
			{ from: X(EDGE + 1000), horizon: MACHU_PICCHU_HORIZONS.VALLEY },
		],
		// Rising with you as you climb, so it's still there over the path.
		horizonRise: 110,
		horizonTrees: false,
		ground: [
			[-PATH_BACK - VERGE, 'url(#machu-verge)'],
			[-PATH_BACK, 'url(#machu-path-edge)'],
			[-PATH_BACK + 4, 'url(#machu-path)'],
			[-PATH_BACK + 4, 'url(#machu-paving)'],
			[PATH_FRONT, 'url(#machu-edge)'],
			[PATH_FRONT + 4, 'url(#machu-face)'],
			[PATH_FRONT + 4, 'url(#machu-face-pattern)'],
			// Darker the further down the mountain's face, in bands, for depth.
			[PATH_FRONT + 90, 'rgba(16, 40, 30, 0.07)', true],
			[PATH_FRONT + 200, 'rgba(16, 40, 30, 0.08)', true],
			[PATH_FRONT + 340, 'rgba(16, 40, 30, 0.1)', true],
		],
		ridge,
		strips: machuPicchuStrips({ citadel: X(CITADEL - 300), valley: X(EDGE) }),
		groundDefs: MACHU_PAVING + MACHU_FACE,
		// Down into a gorge: granite, darker the deeper, the river far down.
		gap: 'linear-gradient(to bottom, #6f6a5c, #4a463c 60px, #22261f 150px)',
		pit: {
			wall: '#9a9483',
			shade: '#6a6556',
			seams: 'rgba(40, 36, 26, 0.35)',
		},
		// Terraces: grass on top, a dry stone wall under it.
		platform: {
			top: '#6aa04a',
			face: 'repeating-linear-gradient(to bottom, #a39c8c 0 8px, #7a7465 8px 10px)',
			edge: '#5a5547',
		},
		fog: {
			from: X(SUN_GATE - 900),
			full: X(CITADEL + 200),
			clear: X(EDGE + 500),
			gone: X(EDGE + 1100),
			deck: {
				from: X(SUN_GATE - 100),
				to: X(LAND + 900),
				top: CLOUD_TOP,
				depth: CLOUD_DEPTH,
			},
		},
		skyFlyers: [
			{
				asset: skyCondors,
				width: 26,
				height: 8,
				frames: 2,
				scale: 2,
				count: 3,
				seconds: 40,
				bob: 18,
				band: [40, 140],
			},
		],
		rock: 'grayscale(0.5) brightness(1.05)',
		clouds: 'brightness(1.02)',
	},
	// A chullo, over the top terrace: up the steps to it, and a jump.
	...withHat(layOut(), 'chullo', () => {
		const top = PLATFORMS.reduce((a, b) =>
			b.height > a.height || (b.height === a.height && b.width > a.width)
				? b
				: a,
		)
		return { x: top.x + top.width / 2, height: top.height + 64 }
	}),
}
