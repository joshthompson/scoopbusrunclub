import type { RunnerName } from '@/data/runners'
import busAsset from '../assets/bus/bus.png'
import scoopAsset from '../assets/bus/scoop.png'
import sleighAsset from '../assets/bus/sleigh.png'
import windowAsset from '../assets/bus/windows.png'
import { BOARDS } from '../game/boards'
import { GROUND_Y, PATH_BACK, PATH_FRONT, START_X } from '../game/constants'
import { SLOPES_FIKA } from '../game/fika'
import { type Gap, type Terrain, withGaps } from '../game/terrain'
import { burningGoat } from './kit/gavleGoat'
import { nearGap, scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import {
	SLOPES_FACE,
	SLOPES_HORIZONS,
	afterski,
	birch,
	cabin,
	crowd,
	dalaHorse,
	distanceBoard,
	igloo,
	judgesTower,
	jumpSign,
	liftPylon,
	liftStation,
	marschall,
	moose,
	pisteSign,
	slopesStrips,
	snowCannon,
	snowyPine,
	swedishFlag,
	trickSign,
} from './kit/slopesScenery'
import { HUT_ABOVE, waffleHut } from './kit/waffleHut'
import type { Boost, CourseDefinition, Obstacle, Rail, Scenery } from './types'

/**
 * The Slopes: Everest the other way round, down, and down, and down. A ski
 * resort in Dalarna, from the top of the fell to the village at its foot,
 * as the day goes.
 *
 * At the top, by the lift, a rack of skis and snowboards stood up in the
 * snow, one each and more: run into a pair and they're yours, the whole way
 * down (see `skis`). Down the green run first, gentle, a slalom down it, a
 * fun box. Into the forest, the blue run, a log to grind, moguls. The
 * waffle hut, halfway. The snow park: kickers, rails, a box, a gap to jump.
 * Then the ski jump, a real one, Falun's: down its inrun, off its lip, how
 * far you fly measured. The black run, steep, moguls, creeks to jump. And
 * out into the village as it gets dark, the northern lights over it, the
 * lanterns lit, a slalom to the finish, and there, by it, the Gävle goat,
 * on fire, as it so often is.
 */

const CHEERERS: RunnerName[] = [
	'anna',
	'josh',
	'lyra',
	'keith',
	'august',
	'eline',
	'rick',
]

/** How far up behind the piste its hillside goes, in px. */
const HILLSIDE = 90

/** How long it is, start line to finish line. */
const LENGTH = 20000
const FINISH = START_X + LENGTH

/**
 * How far down it's come, `along` the course from the start line: a point
 * at each change, a smooth descent between. Level ones, a flat: the top,
 * the waffle hut, the foot of it.
 */
const DESCENT: [along: number, drop: number][] = [
	[-1600, 0],
	[0, 0],
	// The top: the lift, and the rack of skis.
	[560, 0],
	// The green run: gentle, a slalom down it.
	[1000, 50],
	[1800, 250],
	[2700, 500],
	[3300, 640],
	[3900, 760],
	// Into the forest: the blue run, and its moguls.
	[4600, 960],
	[5400, 1220],
	[6300, 1500],
	[7000, 1700],
	// The waffle hut, halfway down.
	[7400, 1760],
	[8100, 1770],
	// The snow park: kickers, rails, a gap.
	[8700, 1880],
	[9600, 2080],
	[10500, 2280],
	[11300, 2440],
	[11900, 2520],
	// The ski jump: its inrun, steep, and its table, at the top of the drop.
	[12100, 2540],
	[12620, 2850],
	[12700, 2866],
	// Off its lip: the knoll, and the landing hill, long, steeper still.
	[12730, 2930],
	[13800, 3600],
	// Its outrun, flattening out.
	[14200, 3690],
	[14600, 3720],
	// The black run: steep, moguls, creeks across it.
	[15100, 3920],
	[15800, 4160],
	[16600, 4440],
	[17300, 4700],
	// Out into the village, as it gets dark.
	[17900, 4830],
	[18700, 4950],
	[19400, 5000],
	[LENGTH, 5010],
	[LENGTH + 2000, 5010],
]
/** As far down as it goes: the foot of it, at the Ground's lowest. */
const DROP = 5010

/** Where its ski jump's lip is, and its K-point, past it: how far a good one goes. */
const TAKEOFF = 12700
const K_POINT = 600

/**
 * Kickers, to fly off: `along` the course, where the lip is, `length` up
 * the ramp to it, and how `high` it gets over the snow.
 */
const KICKERS: [along: number, length: number, high: number][] = [
	// Little ones down the green run, to learn on.
	[2300, 90, 18],
	[3550, 110, 26],
	// In the forest.
	[4850, 120, 30],
	// Just before the waffle hut: into it, or, jumped anywhere up it, up
	// onto its roof.
	[7550, 110, 30],
	// The snow park's, bigger and bigger, and one to clear its gap.
	[8900, 120, 32],
	[9500, 140, 40],
	[10350, 150, 46],
	[11180, 130, 38],
	// The black run's, each over a creek.
	[15430, 120, 34],
	[16620, 130, 38],
	// One last, in the village.
	[18350, 110, 30],
]
/** How far a kicker's lip drops away to the snow past it. */
const LIP = 16

/** Creeks across the piste, `along`, each `width` across, a kicker before each: jump them. */
const CREEKS: [along: number, width: number][] = [
	// Too wide to ski over: jump it, at the lip.
	[11198, 300],
	// Wider: a jump timed right at the lip.
	[15448, 560],
	// The widest: a jump right at the lip, at speed.
	[16638, 620],
]

/** Moguls, from and to, along the course: bumps, one after another, to bounce over. */
const MOGULS: [from: number, to: number][] = [
	[5500, 6300],
	[14950, 15300],
	[16080, 16420],
]
const MOGUL_EVERY = 104
const MOGUL_HIGH = 15

/** Rails to grind: `along`, how long, how high, and what. */
const RAILS: [
	along: number,
	length: number,
	height: number,
	look: Rail['look'],
][] = [
	[2850, 180, 16, 'box'],
	[5050, 240, 22, 'log'],
	[9100, 300, 26, 'rail'],
	[9850, 260, 18, 'box'],
	[10600, 340, 28, 'rail'],
	[14640, 240, 22, 'log'],
	[17550, 300, 24, 'rail'],
	[18800, 420, 22, 'box'],
]

/** Slalom gates, `along`, red and blue in turn. */
const GATES = [
	1150, 1400, 1650, 1900, 2120, 3000, 3250, 19000, 19250, 19500, 19700,
]

/** Where it changes, along the course: into the forest, the park, the black run, the village. */
const FOREST = 3900
const PARK = 8400
const JUMP_FROM = 11950
const JUMP_TO = 14300
const BLACK = 14600
const VILLAGE = 17600
/** The waffle hut's flat. */
const HUT_FROM = 7400
const HUT_TO = 8100
/**
 * The waffle hut on it: where it starts, how long it is, and how high its
 * roof's top is, and how thick, to ski along or through under. All in px.
 */
const HUT = { from: 7620, length: 360, height: 112, thick: 12 }
const hutArt = waffleHut(
	HUT.length / 2,
	HUT.height / 2,
	HUT.thick / 2,
	PATH_FRONT / 2,
)

/**
 * A smooth descent through `points`, never overshooting between them, so a
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

const descent = smoothThrough(DESCENT)

/** How high the kickers raise the snow `along` the course: up each ramp, and off its lip. */
function kickerAt(along: number) {
	for (const [lip, length, high] of KICKERS) {
		if (along < lip - length || along > lip + LIP) continue
		if (along <= lip) {
			const t = (along - (lip - length)) / length
			return high * t * t
		}
		return high * (1 - (along - lip) / LIP)
	}
	return 0
}

/** How high the moguls raise the snow `along` the course. */
function mogulAt(along: number) {
	for (const [from, to] of MOGULS) {
		if (along < from || along > to) continue
		const t = (along - from) / MOGUL_EVERY
		// Easing in and out at either end, rather than starting with a wall.
		const edge = Math.min(1, (along - from) / 120, (to - along) / 120)
		return ((MOGUL_HIGH * (1 - Math.cos(t * Math.PI * 2))) / 2) * edge
	}
	return 0
}

/** How high the snow is `along` the course, over the foot of it. */
const heightAt = (along: number) =>
	DROP - descent(along) + kickerAt(along) + mogulAt(along)

/** The snow's line at `x`, as a y on the screen: from the top of the fell, down. */
const groundY = (x: number) => GROUND_Y - heightAt(x - START_X)

/** How steep it looks at `x`: how far down for every pixel along, negative uphill. */
const tilt = (x: number) =>
	-(heightAt(x - START_X + 3) - heightAt(x - START_X - 3)) / 6

const gaps: Gap[] = CREEKS.map(([along, width]) => ({
	from: START_X + along,
	to: START_X + along + width,
}))

const terrain: Terrain = withGaps(
	{
		length: LENGTH,
		finishX: FINISH,
		groundY,
		// Skis go by the snow's slope as it is: on a kicker's ramp, uphill.
		slope: (x) => Math.max(-0.9, Math.min(0.9, tilt(x))),
		tilt,
	},
	gaps,
)

const rails: Rail[] = [
	...RAILS.map(
		([along, length, height, look]): Rail => ({
			from: START_X + along,
			to: START_X + along + length,
			height,
			look,
		}),
	),
	// The waffle hut's roof, to ski along over it.
	{
		from: START_X + HUT.from,
		to: START_X + HUT.from + HUT.length,
		height: HUT.height,
		look: 'roof',
		thick: HUT.thick,
	},
]

/** The rack, at the top: where each pair stands, one for everyone and more. */
const RACK_FROM = 110
const RACK_GAP = 34
const RACK = BOARDS.map((_, i) => START_X + RACK_FROM + i * RACK_GAP)

/** Whether `along` is near anything to ski: a kicker, a rail, a gate, a creek, the ski jump. */
function busy(along: number, room: number) {
	const x = START_X + along
	return (
		KICKERS.some(
			([lip, length]) => along > lip - length - room && along < lip + room + 60,
		) ||
		RAILS.some(
			([at, length]) => along > at - room && along < at + length + room,
		) ||
		GATES.some((g) => Math.abs(g - along) < room * 0.6) ||
		terrain.gaps.some((g) => x > g.from - room - 520 && x < g.to + room) ||
		(along > JUMP_FROM - room && along < JUMP_TO + room) ||
		(along > HUT_FROM - 60 && along < HUT_TO + 60)
	)
}

/** Which bit of the hill `along` is on: what stands there. */
const zoneOf = (along: number) =>
	along < FOREST
		? 'fell'
		: along < PARK
			? 'forest'
			: along < BLACK
				? 'park'
				: along < VILLAGE
					? 'black'
					: 'village'

function layOut(): Pick<CourseDefinition, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(1928)
	let fika = 0
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		// Clear of the top, so the first thing down the hill isn't in the way.
		clear: (x) => x - START_X > 900 && !busy(x - START_X, 160),
		pick: (x) => {
			const along = x - START_X
			const zone = zoneOf(along)
			const roll = random()
			if (roll < (zone === 'black' ? 0.42 : 0.32))
				return random() < 0.7
					? ({ kind: 'snowman', x } as const)
					: ({ kind: 'rock', x } as const)
			if (roll < 0.8)
				return {
					kind: 'fika',
					x,
					// Low, to ski through, or up high, to jump for.
					height: random() < 0.6 ? 24 : 84,
					item: SLOPES_FIKA[fika++ % SLOPES_FIKA.length],
				}
			return {
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			}
		},
	})
	const gates: Boost[] = GATES.map((along, i) => ({
		kind: 'gate',
		x: START_X + along,
		colour: i % 2 ? 'blue' : 'red',
	}))
	// High up off each kicker, something to fly through and grab.
	const flying: Boost[] = KICKERS.filter(
		([lip]) =>
			!CREEKS.some(([at]) => Math.abs(at - lip) < 40) &&
			!(lip > HUT_FROM && lip < HUT_TO),
	).map(([lip], i) => ({
		kind: 'fika',
		x: START_X + lip + 150,
		height: 120,
		item: SLOPES_FIKA[(fika + i) % SLOPES_FIKA.length],
	}))
	// Inside the waffle hut, hidden, for whoever skis through: a waffle, a
	// hot chocolate, and a whole tower of waffles, there for everyone who
	// does, each of them. Up on its roof, a bowl of tomato soup, for
	// whoever gets up there first: one, for one of them.
	const inHut = (along: number) => START_X + HUT.from + along
	const hut: Boost[] = [
		{ kind: 'fika', x: inHut(80), height: 24, item: 'waffle', everyone: true },
		{
			kind: 'fika',
			x: inHut(180),
			height: 26,
			item: 'waffleTower',
			everyone: true,
		},
		{
			kind: 'fika',
			x: inHut(280),
			height: 24,
			item: 'hotChocolate',
			everyone: true,
		},
		{
			kind: 'fika',
			x: inHut(230),
			height: HUT.height + 30,
			item: 'tomatoSoup',
		},
	]
	// Ski helmets, for the way down: one just past the rack, and one
	// halfway, on the snow, each good for one knock.
	const helmets: Boost[] = [
		RACK_FROM + RACK.length * RACK_GAP + 260,
		Math.round(terrain.length / 2),
	].flatMap((along) => {
		for (let at = along; at < along + 800; at += 20) {
			const x = START_X + at
			const near = (o: { x: number }) => Math.abs(o.x - x) < 120
			if (
				obstacles.some(near) ||
				[...boosts, ...gates, ...flying, ...hut].some(near) ||
				KICKERS.some(([lip]) => Math.abs(START_X + lip - x) < 200) ||
				CREEKS.some(([creek]) => Math.abs(START_X + creek - x) < 200) ||
				(at > HUT_FROM - 100 && at < HUT_TO + 100)
			)
				continue
			return [
				{ kind: 'hat' as const, x, height: 24, hat: 'skiHelmet' as const },
			]
		}
		return []
	})
	return {
		obstacles: obstacles.sort((a, b) => a.x - b.x),
		boosts: [...boosts, ...gates, ...flying, ...hut, ...helmets].sort(
			(a, b) => a.x - b.x,
		),
		scenery: scenery(obstacles),
	}
}

/**
 * How much lower than scenery `width` px across would stand at `x`, on the
 * highest of the snow under it, it has to go for its foot to be at `foot`:
 * on a slope, what to take off its set-back, so it stands upright where it
 * should rather than over the snow downhill of it.
 */
function sunk(x: number, width: number, foot: number) {
	const highest = Math.min(
		groundY(x - width / 2),
		groundY(x),
		groundY(x + width / 2),
	)
	return foot - highest
}

/** The width of a crowd, in px: see `crowd`. */
const CROWD_WIDTH = 120

/**
 * A crowd at `x`, `seed` picking who's in it, `setBack` up from the piste:
 * on a slope, stepped down it, each of them upright, the lowest at the snow.
 */
function crowdAt(x: number, seed: number, setBack: number): Scenery {
	const left = groundY(x - CROWD_WIDTH / 2)
	const right = groundY(x + CROWD_WIDTH / 2)
	const piece = {
		x,
		asset: crowd(seed, (right - left) / CROWD_WIDTH),
		scale: 2,
		setBack: setBack - sunk(x, CROWD_WIDTH, Math.max(left, right)),
	}
	stood.add(piece)
	return piece
}

/** Scenery already stood where it should be on a slope, by itself: crowds, boards. */
const stood = new WeakSet<Scenery>()
/** How far back from the path scenery stands, if it doesn't say: as `createScenery` has it. */
const SET_BACK = 10

/** How wide a picture drawn in code is, in its own cells: its SVG's width. */
const widthOf = (asset: string) =>
	Number(/width="(\d+)"/.exec(decodeURIComponent(asset))?.[1] ?? 0)

/**
 * Scenery stood upright on the snow at its middle, its uphill side down
 * into it, rather than on the highest of the snow under it, its downhill
 * side floating, down a slope as steep as this.
 */
function standUpright(piece: Scenery): Scenery {
	if (stood.has(piece) || piece.onFloor) return piece
	const width = widthOf(piece.asset) * (piece.scale ?? 1)
	if (!width) return piece
	const setBack = piece.setBack ?? SET_BACK
	return { ...piece, setBack: setBack - sunk(piece.x, width, groundY(piece.x)) }
}

/** What stands along the piste: each bit of the hill its own. */
function scenery(obstacles: Obstacle[]): Scenery[] {
	const random = seeded(1611)
	const out: Scenery[] = []
	const at = (along: number) => START_X + along
	const taken = (x: number, room: number) =>
		out.some((s) => Math.abs(s.x - x) < room)
	const clearOf = (x: number) => !obstacles.some((o) => Math.abs(o.x - x) < 40)

	// The top: the lift's top station, a flag, and the rack, with a sign of
	// how to do tricks.
	out.push({ x: at(-600), asset: liftStation, scale: 2, setBack: 6 })
	out.push({ x: at(-480), asset: swedishFlag, scale: 2, setBack: 4 })
	// In view through the countdown.
	out.push({ x: at(-340), asset: trickSign, scale: 2, setBack: 8 })
	out.push({
		x: at(470),
		asset: pisteSign('green', 'GRÖN'),
		scale: 2,
		setBack: 2,
	})
	out.push({ x: at(-700), asset: snowyPine(1), scale: 2, setBack: 20 })

	// By the waffle hut, halfway: a flag, past it.
	out.push({ x: at(HUT_FROM + 650), asset: swedishFlag, scale: 2, setBack: 4 })
	out.push({
		x: at(HUT_FROM - 30),
		asset: pisteSign('blue', 'BLÅ'),
		scale: 2,
		setBack: 2,
	})

	// Signs, at the top of each run.
	out.push({
		x: at(PARK + 80),
		asset: pisteSign('red', 'PARK'),
		scale: 2,
		setBack: 2,
	})
	out.push({
		x: at(BLACK + 60),
		asset: pisteSign('black', 'SVART'),
		scale: 2,
		setBack: 2,
	})

	// The ski jump: the judges' tower by the landing hill, its distance
	// boards down it, the K-point's among them, and the crowd at its foot,
	// along its outrun.
	out.push(crowdAt(at(14000), 0, 4))
	for (let m = 80; m <= 200; m += 10) {
		const x = at(TAKEOFF) + m * 4
		const asset = distanceBoard(m, m * 4 === K_POINT)
		// Upright, its post down into the snow where it stands.
		const board = { x, asset, scale: 2, setBack: 2 - sunk(x, 40, groundY(x)) }
		stood.add(board)
		out.push(board)
	}
	out.push({ x: at(TAKEOFF + 340), asset: judgesTower, scale: 2, setBack: 30 })
	out.push(crowdAt(at(14150), 1, 4))
	out.push(crowdAt(at(14330), 2, 4))

	// A warning before each creek, well before its kicker, so there's time
	// to get going: how big a jump it is, and for the biggest, when to jump.
	for (const [along, width] of CREEKS) {
		const kicker = KICKERS.find(([lip]) => Math.abs(lip + 18 - along) < 30)
		const from = along - 18 - (kicker?.[1] ?? 120)
		const lines =
			width <= 320
				? ['JUMP!']
				: width <= 580
					? ['BIG JUMP!']
					: ['HUGE JUMP!', 'JUMP AT THE LIP']
		out.push({
			x: at(from - 220),
			asset: jumpSign(lines),
			scale: 2,
			setBack: 2,
		})
	}

	// Lift pylons, here and there up the hill, a chair hanging off each.
	for (const along of [900, 2600, 4300, 6700, 9300, 10900, 15200, 16900])
		out.push({ x: at(along), asset: liftPylon, scale: 2, setBack: 40 })

	// The village: lanterns lit along the piste, cabins, the afterski, a
	// little Dalarna horse by a cabin, and by the finish, the Gävle goat, on
	// fire.
	for (let along = VILLAGE + 120; along < LENGTH + 700; along += 180)
		out.push({ x: at(along), asset: marschall, scale: 2, setBack: -2 })
	for (const [along, roof] of [
		[VILLAGE + 260, 0],
		[VILLAGE + 900, 1],
		[VILLAGE + 1500, 2],
		[LENGTH - 900, 0],
		[LENGTH - 380, 1],
	] as const)
		out.push({ x: at(along), asset: cabin(roof), scale: 2, setBack: 10 })
	out.push({ x: at(VILLAGE + 1200), asset: dalaHorse, scale: 2, setBack: 4 })
	out.push({ x: at(LENGTH - 620), asset: afterski, scale: 2, setBack: 8 })
	out.push(crowdAt(at(LENGTH - 120), 3, 4))
	out.push({
		x: at(LENGTH + 330),
		asset: burningGoat,
		scale: 3,
		setBack: 34,
	})
	out.push(crowdAt(at(LENGTH + 120), 4, 4))
	out.push(crowdAt(at(LENGTH + 560), 5, 4))

	// Along the way: what grows, and what's been put up.
	for (let x = at(-300); x < FINISH + 900; x += 90 + random() * 170) {
		const along = x - START_X
		if (
			taken(x, 60) ||
			!clearOf(x) ||
			(along > -40 && along < RACK_FROM + RACK.length * RACK_GAP + 60) ||
			(along > HUT_FROM - 40 && along < HUT_TO + 40) ||
			(along > JUMP_FROM && along < JUMP_TO) ||
			along > LENGTH - 900
		)
			continue
		const zone = zoneOf(along)
		const roll = random()
		let piece: Scenery | undefined
		if (zone === 'fell') {
			if (roll < 0.3) piece = { x, asset: snowyPine(0), scale: 2 }
			else if (roll < 0.45) piece = { x, asset: birch, scale: 2 }
			else if (roll < 0.6) piece = { x, asset: snowCannon, scale: 2 }
			else if (roll < 0.68) piece = { x, asset: igloo, scale: 2 }
		} else if (zone === 'forest') {
			if (roll < 0.55)
				piece = { x, asset: snowyPine(random() < 0.5 ? 1 : 2), scale: 2 }
			else if (roll < 0.8) piece = { x, asset: birch, scale: 2 }
			else if (roll < 0.86) piece = { x, asset: moose, scale: 2 }
			else if (roll < 0.92)
				piece = { x, asset: cabin(0), scale: 2, setBack: 14 }
		} else if (zone === 'park') {
			if (roll < 0.3) piece = { x, asset: snowCannon, scale: 2 }
			else if (roll < 0.5) piece = { x, asset: snowyPine(0), scale: 2 }
			else if (roll < 0.62)
				piece = { x, asset: swedishFlag, scale: 2, setBack: 4 }
		} else if (zone === 'black') {
			if (roll < 0.6)
				piece = { x, asset: snowyPine(random() < 0.5 ? 1 : 2), scale: 2 }
			else if (roll < 0.75) piece = { x, asset: birch, scale: 2 }
		} else {
			if (roll < 0.35) piece = { x, asset: snowyPine(0), scale: 2 }
			else if (roll < 0.55) piece = { x, asset: birch, scale: 2 }
		}
		if (piece) out.push({ ...piece, x: Math.round(x) })
	}
	return out.map(standUpright).sort((a, b) => a.x - b.x)
}

export const slopes: CourseDefinition = {
	id: 'slopes',
	name: 'The Slopes',
	blurb:
		'Down and down a Dalarna fell on skis or a board: kickers, tricks, rails and a ski jump, and a fire at the finish.',
	terrain,
	corgis: RACK,
	// No skis, nor a snowboard: down the whole mountain on foot.
	special: {
		goal: 'Complete the course on foot',
		done: (run) => run.finished && !run.counts.corgis,
	},
	ride: 'skis',
	rails,
	skiJump: { takeoff: START_X + TAKEOFF, k: K_POINT },
	// On skis too, it gains on you down the steep bits.
	busDownhill: 2.6,
	hut: {
		from: START_X + HUT.from,
		to: START_X + HUT.from + HUT.length,
		height: HUT.height,
		above: HUT_ABOVE * 2,
		back: hutArt.back,
		front: hutArt.front,
	},
	// Down the hill ahead, so what's coming is in view: off the ski jump, the landing hill.
	lookDown: 560,
	runDirectors: ['anna', 'keith'],
	cheerers: CHEERERS,
	look: {
		palette: {
			// Light, outlined, to read on the day's sky and the dusk's.
			'--hud-ink': '#fff4e6',
			'--hud-shadow':
				'2px 0 #1b2440, -2px 0 #1b2440, 0 2px #1b2440, 0 -2px #1b2440',
			'--sky-blue-top': '#3f8fe0',
			'--sky-blue-bottom': '#d6ecfb',
			'--grass-green': '#eef4fa',
			'--grass-dark-green': '#cddcec',
			'--grass-darker-green': '#a9bfd6',
			'--dirt-brown': '#e3ecf5',
			'--dirt-dark-brown': '#c4d4e5',
			'--dirt-darker-brown': '#93a9c2',
		},
		// The course select's preview: the snow park, its rails and kickers.
		previewFrom: START_X + 9000,
		horizon: SLOPES_HORIZONS.FELL,
		voyage: [
			{ from: START_X + FOREST + 600, horizon: SLOPES_HORIZONS.FOREST },
			{ from: START_X + JUMP_TO, horizon: SLOPES_HORIZONS.DUSK },
		],
		horizonRise: 110,
		horizonTrees: false,
		ground: [
			// The hillside, behind the piste, up to well over it: for what
			// stands back from the path to stand on, not float over the view.
			[-PATH_BACK - HILLSIDE, 'url(#slopes-verge)'],
			[-PATH_BACK - HILLSIDE + 6, 'url(#slopes-face)'],
			[-PATH_BACK, 'url(#slopes-path-edge)'],
			[-PATH_BACK + 4, 'url(#slopes-piste)'],
			[PATH_FRONT, 'url(#slopes-edge)'],
			[PATH_FRONT + 2, 'url(#slopes-snow)'],
			[PATH_FRONT + 14, 'url(#slopes-face)'],
			[PATH_FRONT + 80, 'rgba(30, 50, 90, 0.05)', true],
			[PATH_FRONT + 190, 'rgba(30, 50, 90, 0.06)', true],
			[PATH_FRONT + 330, 'rgba(30, 50, 90, 0.07)', true],
		],
		strips: slopesStrips({ dusk: START_X + JUMP_TO, night: START_X + VILLAGE }),
		groundDefs: SLOPES_FACE,
		// Down into a creek: ice, and dark water under it.
		gap: 'linear-gradient(to bottom, #d6e8f7, #8fb4d8 24px, #3d6699 80px, #0f2442 170px)',
		pit: {
			wall: '#e4eef8',
			shade: '#8aa9cc',
			seams: 'rgba(40, 80, 140, 0.3)',
			ice: { snow: '#f6f9fc', icicle: '#cfe4f7' },
		},
		rock: 'brightness(1.05) saturate(0.5)',
		bus: {
			body: busAsset,
			windows: windowAsset,
			scoop: scoopAsset,
			// The website's Christmas sleigh, turned round to face right, its
			// lettering still reading the right way.
			sleigh: sleighAsset,
		},
	},
	...layOut(),
}
