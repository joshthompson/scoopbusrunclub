import flower1 from '@/assets/misc/flower1.png'
import flower2 from '@/assets/misc/flower2.png'
import shrub1 from '@/assets/misc/shrub1.png'
import shrub2 from '@/assets/misc/shrub2.png'
import type { RunnerName } from '@/data/runners'
import copperTents from '../assets/scenery/copper-tents.png'
import tree1 from '../assets/scenery/tree1.png'
import tree2 from '../assets/scenery/tree2.png'
import { PATH_BACK, PATH_FRONT, PX_PER_M, START_X } from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { createTerrain } from '../game/terrain'
import { HAGA_GRASS, HAGA_TRAIL, texturedGround } from './kit/groundTextures'
import { STEP_M, heights } from './kit/haga-profile'
import {
	HAGA_GATE,
	birchLeft,
	birchRight,
	birchTall,
	echoTemple,
	gatehouseLeft,
	gatehouseRight,
	lilacBush,
	parkBench,
	parkLamp,
} from './kit/hagaScenery'
import { withHat } from './kit/hats'
import { seeded } from './kit/seeded'
import type { Boost, Course, CourseDefinition, Obstacle } from './types'

/** Members with a volunteer sprite to stand and cheer in: the cheerers. */
const CHEERERS: RunnerName[] = [
	'lyra',
	'anna',
	'rick',
	'august',
	'keith',
	'josh',
	'eline',
]

/** A parkrun is 5 km. Haga's GPS track came out at 5.03. */
const terrain = createTerrain(heights, STEP_M, 5000)

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(5032)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	// A clear run off the start, and a clear run-in to the finish.
	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		const roll = random()
		// No mud at Haga: rocks and branches.
		if (roll < 0.42) obstacles.push({ kind: 'rock', x })
		else if (roll < 0.72) obstacles.push({ kind: 'branch', x })
		else if (roll < 0.88)
			boosts.push({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				// Each in turn: picking at random would reshuffle the rest of the course.
				item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
			})
		else
			boosts.push({
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			})
		// Further apart early on, closer together towards the end.
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (520 - progress * 260)
	}

	addGeese(obstacles, boosts)

	const scenery: Course['scenery'] = []
	const assets = [tree1, tree2, tree1, shrub1, shrub2, flower1, flower2]
	for (let at = -400; at < terrain.finishX + 900; at += 90 + random() * 260) {
		// Nothing in front of the Copper Tents.
		if (Math.abs(at - TENTS_X) < TENTS_ROOM) continue
		scenery.push({
			x: Math.round(at),
			asset: assets[Math.floor(random() * assets.length)],
		})
	}
	// Haga's gate, just off the start, clear of what's around it.
	for (let i = scenery.length - 1; i >= 0; i--)
		if (Math.abs(scenery[i].x - GATE_MIDDLE) < GATE_ROOM) scenery.splice(i, 1)
	scenery.push(...hagaGate())
	// Ekotemplet, the Echo Temple, with nothing stood in front of it.
	for (let i = scenery.length - 1; i >= 0; i--)
		if (Math.abs(scenery[i].x - TEMPLE_X) < TEMPLE_ROOM) scenery.splice(i, 1)
	scenery.push({ x: TEMPLE_X, asset: echoTemple, scale: 2 })
	scenery.push(...parkScenery())
	// Koppartälten, the Copper Tents, at the top of the hill, levelled on it.
	scenery.push({
		x: TENTS_X,
		asset: copperTents,
		scale: TENTS_SCALE,
		footing: true,
	})
	return { obstacles, boosts, scenery }
}

/** Where Haga's gate stands, its near post: just past the start. */
const GATE_X = START_X + 380
/** The middle of it all, gatehouses and all, and half its width and a little more. */
const GATE_MIDDLE = GATE_X + 32
const GATE_ROOM = 134 + 30

/**
 * Haga's gate, going back across the path, as a gateway does: its far
 * post and gatehouse behind the path, and its near post and the arch over
 * the path in front of whoever's going through, the bus and all. Its near
 * gatehouse stands down in the grass in front of the path, out to the
 * left, and its far one up behind it, inside the park.
 */
function hagaGate(): Course['scenery'] {
	const gate = HAGA_GATE
	const far = GATE_X + gate.across
	/** A gatehouse's width, and how far back the far one stands, and forward the near one. */
	const house = 90
	const back = 10
	const forward = 18
	return [
		{ x: far + 20 + house / 2, asset: gatehouseRight, scale: 2, setBack: back },
		{
			x: far - gate.post + gate.backWidth / 2,
			asset: gate.back,
			scale: 2,
			setBack: 0,
			onFloor: true,
			upright: true,
		},
		{
			x: GATE_X - gate.post + gate.frontWidth / 2,
			asset: gate.front,
			scale: 2,
			setBack: -(PATH_BACK + PATH_FRONT),
			front: true,
			onFloor: true,
			upright: true,
		},
		{
			x: GATE_X - 12 - house / 2,
			asset: gatehouseLeft,
			scale: 2,
			setBack: -(PATH_BACK + PATH_FRONT + forward),
			front: true,
		},
	]
}

/** Where Ekotemplet stands: on the flat, a little under 4 km in. */
const TEMPLE_X = START_X + 3870 * PX_PER_M
/** Half the Echo Temple's width, and a little more: no trees in front of it. */
const TEMPLE_ROOM = 64 + 40

/**
 * Haga's own: birches, lilacs, and the park's benches and lamps, in among
 * the oaks and pines. Their own random numbers, so the rest of the course is
 * laid out the same as ever.
 */
function parkScenery(): Course['scenery'] {
	const random = seeded(1786)
	const trees = [birchLeft, birchRight, birchTall, lilacBush, lilacBush]
	const scenery: Course['scenery'] = []
	for (let at = -200; at < terrain.finishX + 900; at += 160 + random() * 340) {
		const x = Math.round(at)
		if (Math.abs(x - TENTS_X) < TENTS_ROOM) continue
		if (Math.abs(x - TEMPLE_X) < TEMPLE_ROOM) continue
		if (Math.abs(x - GATE_MIDDLE) < GATE_ROOM) continue
		const roll = random()
		// Now and then a bench, with a lamp beside it.
		if (roll < 0.12) {
			scenery.push({ x, asset: parkBench, scale: 2 })
			scenery.push({ x: x + 34, asset: parkLamp, scale: 2 })
		} else
			scenery.push({
				x,
				asset: trees[Math.floor(random() * trees.length)],
				scale: 2,
			})
	}
	return scenery
}

/** How far short of the top the Copper Tents stand. */
const TENTS_SHORT = 160
/**
 * Where the Copper Tents stand, back from the path: just short of where the
 * course is highest, on the field, not out past its brow where the field
 * behind falls away.
 */
const TENTS_X = (() => {
	let top = START_X
	for (let x = START_X; x < terrain.finishX; x += 10)
		if (terrain.groundY(x) < terrain.groundY(top)) top = x
	return top - TENTS_SHORT
})()
/** How big the Copper Tents are drawn: twice their pixel size. */
const TENTS_SCALE = 2
/** Half the Copper Tents' width, and a little more: no trees in front of them. */
const TENTS_ROOM = 120 * TENTS_SCALE + 30

/** Room either side of geese, to see them fly off clear of whatever's next. */
const GEESE_ROOM = 320

/**
 * Geese, off Brunnsviken, standing about in the wider gaps between
 * everything else. Their own random numbers, so the rest of the course is
 * laid out the same as ever.
 */
function addGeese(obstacles: Obstacle[], boosts: Boost[]) {
	const random = seeded(1957)
	const placed: Obstacle[] = []
	const everything = [...obstacles, ...boosts].sort((a, b) => a.x - b.x)
	for (let i = 1; i < everything.length; i++) {
		const before = everything[i - 1]
		const after = everything[i]
		const behind = before.x + ('width' in before ? before.width / 2 : 30)
		const ahead = after.x - ('width' in after ? after.width / 2 : 30)
		if (ahead - behind < GEESE_ROOM * 2 || random() > 0.5) continue
		placed.push({
			kind: 'geese',
			x: Math.round((behind + ahead) / 2),
			count: 1 + Math.floor(random() * 3),
		})
	}
	obstacles.push(...placed)
	obstacles.sort((a, b) => a.x - b.x)
}

/** How many flocks fly over, spread round the course. */
const FLYOVERS = 6

/**
 * Geese flying over from behind, now and then: their own random numbers
 * too, to leave everything else where it was.
 */
function flyOvers(): NonNullable<Course['flyovers']> {
	const random = seeded(2024)
	const from = START_X + 1200
	const spacing = (terrain.finishX - 900 - from) / FLYOVERS
	return Array.from({ length: FLYOVERS }, (_, i) => ({
		x: Math.round(from + spacing * (i + random() * 0.6)),
		count: 1 + Math.floor(random() * 3),
	}))
}

/**
 * Everything along it: and a crown of midsummer flowers, high over the
 * path a while after the geese have flown over, too high to jump for, but
 * not to be carried up to on a goose, or to bounce up to off someone's
 * head.
 */
const LAID_OUT = withHat(layOut(), 'flowerCrown', () => ({
	x: flyOvers()[2].x + 700,
	height: 160,
}))

/**
 * How far round the football's left lying: a little past the 1 km sign,
 * not on it; and how far it's kept from anything in the way.
 */
const FOOTBALL_AT = 1025 * PX_PER_M
const FOOTBALL_ROOM = 200

/** Where the football is: about a kilometre in, clear of anything in the way. */
const FOOTBALL = (() => {
	let x = START_X + FOOTBALL_AT
	while (
		[...LAID_OUT.obstacles, ...LAID_OUT.boosts].some(
			(o) => Math.abs(o.x - x) < FOOTBALL_ROOM,
		)
	)
		x += 20
	return x
})()

export const haga: CourseDefinition = {
	id: 'haga',
	name: 'Haga',
	blurb: 'The home course. Rocks, branches, and geese to catch a ride on.',
	parkrun: true,
	// Its grass in tufts, a daisy or a buttercup in it, and grit and
	// pebbles on its path.
	look: {
		ground: texturedGround('haga-grass', 'haga-trail'),
		groundDefs: HAGA_GRASS + HAGA_TRAIL,
	},
	terrain,
	runDirectors: ['claire', 'eline'],
	cheerers: CHEERERS,
	...LAID_OUT,
	flyovers: flyOvers(),
	football: FOOTBALL,
	// The football, dribbled all 4 km to the line, and over it.
	special: {
		goal: 'Score a goal',
		done: (run) => (run.counts.football ?? 0) > 0,
	},
}
