import type { RunnerName } from '@/data/runners'
import busBody from '../assets/bus/bus.png'
import windows from '../assets/bus/windows.png'
import theMinerHello from '../assets/runners/the-miner/hello.png'
import theMinerStand from '../assets/runners/the-miner/stand.png'
import crystals from '../assets/scenery/crystals.png'
import tree1 from '../assets/scenery/tree1.png'
import tree2 from '../assets/scenery/tree2.png'
import { DRILL_FRAMES } from '../draw/art/drill'
import { CART_SEAT } from '../game/carts'
import {
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	START_X,
	VIEW_HEIGHT,
} from '../game/constants'
import { CAVES_FIKA } from '../game/fika'
import { type Terrain, withGaps } from '../game/terrain'
import { MINER } from '../runners/bonus'
import { CAVE_DETAILS, type CaveDetail } from './kit/caveDetails'
import { CAVE_PAINTINGS, DROP_HINT } from './kit/cavePaintings'
import {
	CAVE_TILES,
	ROCK,
	ROCK_FACE,
	ROCK_LIGHTEST,
	SEAM,
	WALL,
	glowShrooms,
	lampPost,
	mineSign,
	minersKit,
	stalagmites,
	timberFrame,
} from './kit/caveScenery'
import {
	BRIDGE_SIGN,
	CHAMBER_THINGS,
	COASTER_SIGN,
	COASTER_SIGN_SIZE,
	HATCH,
	LIFT,
	LIFT_CAGE,
	LIFT_SHAFT,
	MINE_PEOPLE,
} from './kit/caveSecret'
import { ropeBridgeArt } from './kit/machuPicchuScenery'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import type {
	Boost,
	Cave,
	Coaster,
	Course,
	CourseDefinition,
	Mine,
	Obstacle,
	PlatformDefinition,
	Secret,
	SecretProp,
} from './types'

/**
 * The Caves: across a meadow and into a hill, through the caves under it,
 * and out again right at the finish. Tunnels too low to stand in, to slide
 * into and roll through; chambers with two ways through them, up over a
 * shelf of rock or along under it; a mine, its carts to ride, and for the
 * ones who know to take it, a secret line up to a gallery nobody else can
 * get to; moles to ride, digging their own way through the rock; and the
 * bus, too big for any of it, drilling through the lot behind you.
 *
 * Stalactites crack off the roof and come down as you get near, and a huge
 * spider scuttles to and fro across the big chamber past the chasm: bounce
 * off its back.
 * Cave paintings on the walls, and things left lying about. And over the
 * chasm, a rope bridge, a sign before it pointing down: duck on it and you
 * drop through, down into the old mine, for a mine cart ride round a loop
 * to the mine people's chamber, The Miner to meet there, and the lift
 * back up.
 */

const CHEERERS: RunnerName[] = [
	'keith',
	'rick',
	'anna',
	'august',
	'eline',
	'lyra',
	'josh',
]

const DISTANCE_M = 5000
const FINISH = START_X + DISTANCE_M * PX_PER_M

/** The cave's mouth, soon after the start, and the way out, right at the finish. */
const MOUTH = START_X + 560
const EXIT = FINISH - 120

/** How high the rock is over the Ground: in a tunnel, and a Tunnel to slide through. */
const TUNNEL = 120
const SLIDE = 30
/** How far a chamber's roof takes to rise from a tunnel's, and fall back to it. */
const CHAMBER_RAMP = 140

/**
 * The levels a chamber or a stack of tunnels has over the Ground: shelves
 * of rock, each `STOREY` over the last. In a stack, each is the floor of
 * the tunnel over it, solid down to the roof of the one under it, `FLOOR`
 * thick; thick down to a Tunnel's roof, where one has a Tunnel.
 */
const STOREY = 100
const SHELF = 24
const FLOOR = 30
const OVER_TUNNEL = STOREY - SLIDE
/** The ledge up onto the first terrace, and the step up from one onto the next, and how wide they are. */
const LEDGE = 60
const LEDGE_WIDTH = 110
const STEP = 50
const STEP_WIDTH = 100
/** A dip along the first terrace, and the pit before a stack, to drop into or jump across. */
const DIP = 40
const DIP_WIDTH = 120
const PIT = 200
/** How high the top tunnel of a stack is, and how high a chamber's roof is, over its top shelf. */
const TOP = 110
const CHAMBER_ROOM = 200
/** How long a stack's levels go on after their floors end, to drop out of: the top one first. */
const DROP_OUT = 280
/** How far a stack's roof slopes down at its end, to the roof of what's after it. */
const STACK_SLOPE = 240
/** How long a Tunnel in a stack is. */
const STACK_SLIDE = 440

/** How long the tunnel to the way out is, at least. */
const LAST_TUNNEL = 360

/**
 * The mine, along from where it starts: its rails, the carts waiting on
 * them, the chamber the secret line climbs up through, to the gallery high
 * in its far wall, and the chamber it comes back down through, back onto
 * the line along the floor, before the buffers. The secret line starts up
 * on trestles, level, `upper`, from its stop at `points`: jump the cart up
 * onto it, off the line along the floor, anywhere from a little way before
 * that, once the roof's gone up, to a little way before it starts its
 * climb, at `climb`.
 */
const MINE = {
	length: 2800,
	rails: 40,
	/** Where the carts wait: one for each Player there might be. */
	carts: [150, 212, 274, 336],
	up: 480,
	points: 700,
	climb: 1000,
	gallery: 1300,
	galleryTo: 1900,
	/** Out of the gallery, along level, high over the line along the floor, to drop down onto, till it starts down. */
	descend: 2100,
	down: 2460,
	rejoin: 2380,
	buffers: 2680,
}
/** How high the secret line's level start is over the line along the floor: a cart's jump up. */
const UPPER = 44
/** How high the gallery's floor is over the mine's, and how high it is inside. */
const GALLERY_FLOOR = 250
const GALLERY_ROOM = 96
/** How high the chambers either side of it are, and how far their roofs take to rise. */
const MINE_ROOM = 380
const MINE_RAMP = 160

/**
 * The climb up to the mole, along from where it starts: a tall chamber,
 * stepping stones of rock up it, each a jump higher than the last, to land
 * on, and the ledge the mole's waiting on, high against its far wall. Miss
 * one, and it's down to the floor, and on along under it all.
 */
const CLIMB = {
	length: 1300,
	/**
	 * Each a jump along from the last: running flat out, there's only a
	 * little of each to take off from and land the next.
	 */
	stones: [300, 540, 780],
	stoneWidth: 110,
	/** How much higher each is than the one before, from the floor. */
	step: 70,
	ledge: 1020,
	ledgeHeight: 280,
	mole: 1200,
}

/** How high the climb's roof is, and how far it takes to rise. */
const CLIMB_ROOM = 410
const CLIMB_RAMP = 140

/**
 * The chasm, along from where it starts: a tall rift in the rock, a drop
 * across its floor, `gap` along and `width` wide, a rope bridge over it,
 * and a sign before it, pointing down. Duck on the bridge, and down
 * through it you go, into the old mine deep under the caves (see `MINE_SECRET`).
 */
const CHASM = { length: 500, sign: 86, hint: 160, gap: 220, width: 140 }
/** How high its roof is, and how far it takes to rise and fall. */
const CHASM_ROOM = 250
const CHASM_RAMP = 130

type Section =
	| {
			kind: 'tunnel' | 'slide' | 'mine' | 'climb' | 'chasm'
			from: number
			to: number
	  }
	| {
			kind: 'chamber'
			from: number
			to: number
			levels: number
			/** A Tunnel under its shelf, its shelf thick down to it. */
			tunnel: boolean
	  }
	| {
			kind: 'stack'
			from: number
			to: number
			levels: number
			/** For each level, from the Ground up, whether it has a Tunnel along it. */
			slides: boolean[]
	  }

type Plan =
	| ['tunnel' | 'slide' | 'mine' | 'climb' | 'chasm', number]
	| ['chamber', number, { levels: number; tunnel?: boolean }]
	| ['stack', number, { levels: number; slides: boolean[] }]

/** The caves, one stretch after another, from the mouth to the way out. */
const SECTIONS: Section[] = (() => {
	const plan: Plan[] = [
		['tunnel', 500],
		['slide', 400],
		['tunnel', 500],
		['chamber', 1500, { levels: 2 }],
		['stack', 1800, { levels: 2, slides: [true, false] }],
		['tunnel', 500],
		['mine', MINE.length],
		['tunnel', 300],
		// The rope bridge over the chasm, and the mine under it.
		['chasm', CHASM.length],
		['slide', 400],
		['chamber', 1500, { levels: 3 }],
		['stack', 2000, { levels: 3, slides: [false, true, true] }],
		// The mole, up on its ledge, for whoever can get up to it, and a long
		// Tunnel after it for it to dig along over.
		['climb', CLIMB.length],
		['slide', 600],
		['tunnel', 500],
		['chamber', 1300, { levels: 2, tunnel: true }],
		['chamber', 1200, { levels: 2 }],
		['stack', 1300, { levels: 2, slides: [true, true] }],
	]
	// A good stretch of tunnel before the way out, whatever's left out for it.
	while (
		plan.reduce((sum, [, length]) => sum + length, 0) >
		EXIT - MOUTH - LAST_TUNNEL
	)
		plan.pop()
	const sections: Section[] = []
	let at = MOUTH
	for (const step of plan) {
		const from = at
		at += step[1]
		const to = at
		if (step[0] === 'chamber')
			sections.push({
				kind: 'chamber',
				from,
				to,
				levels: step[2].levels,
				tunnel: !!step[2].tunnel,
			})
		else if (step[0] === 'stack')
			sections.push({ kind: 'stack', from, to, ...step[2] })
		else sections.push({ kind: step[0], from, to })
	}
	// A tunnel the rest of the way to the way out.
	sections.push({ kind: 'tunnel', from: at, to: EXIT })
	return sections
})()

const sectionAt = (x: number) => SECTIONS.find((s) => x >= s.from && x < s.to)
const after = (section: Section) => SECTIONS[SECTIONS.indexOf(section) + 1]
/** Level all along, its floor not rising and falling: a chamber, a stack, the mine, the chasm. */
const level = (s: Section) =>
	s.kind === 'chamber' ||
	s.kind === 'stack' ||
	s.kind === 'mine' ||
	s.kind === 'climb' ||
	s.kind === 'chasm'

/**
 * Where along a stack level `i`'s Tunnel is, if it has one: each level's
 * somewhere else, so they don't all line up.
 */
function stackSlide(stack: Extract<Section, { kind: 'stack' }>, i: number) {
	if (!stack.slides[i]) return undefined
	const along = [0.18, 0.5, 0.32][i] ?? 0.4
	const from = Math.round(
		stack.from + (stack.to - DROP_OUT - stack.from) * along,
	)
	return { from, to: from + STACK_SLIDE }
}

/** How high a stack's roof is: over its top level's tunnel. */
const stackRoof = (levels: number) => (levels - 1) * STOREY + TOP

/**
 * How much the floor rises and falls at `x`: all it can in the tunnels, and
 * not at all in the chambers and stacks of tunnels, whose shelves are level,
 * nor in the mine, nor outside, easing between.
 */
function hilliness(x: number) {
	if (x < MOUTH || x >= EXIT) return 0
	let t = Math.min(1, (x - MOUTH) / 300, (EXIT - x) / 300)
	for (const s of SECTIONS) {
		if (!level(s)) continue
		if (x >= s.from && x < s.to) return 0
		t = Math.min(t, Math.abs(x < s.from ? s.from - x : x - s.to) / 240)
	}
	return t * t * (3 - 2 * t)
}

/** How wide a ravine across a chamber's floor is: the terraces over it are the way past. */
const RAVINE = 120

/** A ravine in the floor of each of the first two plain chambers, past the dip in their terraces. */
const RAVINES = SECTIONS.flatMap((s) =>
	s.kind === 'chamber' && s.levels === 2 && !s.tunnel ? [s] : [],
)
	.slice(0, 2)
	.map((chamber) => {
		const from = chamber.from + Math.round((chamber.to - chamber.from) * 0.62)
		return { from, to: from + RAVINE }
	})

/** The chasm's stretch of the caves, and the drop across its floor, under its bridge. */
const CHASM_AT = SECTIONS.find((s) => s.kind === 'chasm')?.from ?? MOUTH
const CHASM_GAP = {
	from: CHASM_AT + CHASM.gap,
	to: CHASM_AT + CHASM.gap + CHASM.width,
}

/** The floor, up and down through the tunnels, a Tunnel's roof following it. */
const terrain: Terrain = withGaps(
	{
		length: FINISH - START_X,
		finishX: FINISH,
		groundY: (x) =>
			GROUND_Y -
			hilliness(x) * (46 + 30 * Math.sin(x / 300) + 12 * Math.sin(x / 130 + 1)),
		slope: (x) => (terrain.groundY(x + 4) - terrain.groundY(x - 4)) / 8,
	},
	[...RAVINES, CHASM_GAP],
)

/** Smoothly, from 0 to 1. */
const ease = (t: number) => t * t * (3 - 2 * t)

/** How high the cave's rock is over the Ground at `x`: none outside it. */
function headroom(x: number): number | undefined {
	const section = sectionAt(x)
	if (!section) return undefined
	if (section.kind === 'slide') return SLIDE
	// A tunnel's roof, a little uneven.
	if (section.kind === 'tunnel')
		return Math.round((TUNNEL + 10 * Math.sin(x / 170)) / 4) * 4
	if (section.kind === 'mine') return mineRoom(section.from, x)
	// The chasm: up high, its rift, and back down to a tunnel's roof.
	if (section.kind === 'chasm') {
		const t = Math.min(x - section.from, section.to - x) / CHASM_RAMP
		return (
			Math.round((TUNNEL + (CHASM_ROOM - TUNNEL) * ease(Math.min(1, t))) / 8) *
			8
		)
	}
	// The climb: up high, as soon as it's in, and sheer at its far wall.
	if (section.kind === 'climb') {
		const rise = Math.min(1, (x - section.from) / CLIMB_RAMP)
		return Math.round((TUNNEL + (CLIMB_ROOM - TUNNEL) * ease(rise)) / 8) * 8
	}
	if (section.kind === 'stack') {
		// Down to a Tunnel along its top level, where that has one.
		const top = section.levels - 1
		const slide = stackSlide(section, top)
		if (slide && x >= slide.from && x < slide.to) return top * STOREY + SLIDE
		// Sloping down at its end to the roof of what's after it, rather than
		// a sheer wall to run into off its top level.
		const next = after(section)
		const ending = next ? (headroom(next.from) ?? TUNNEL) : TUNNEL
		const roof = stackRoof(section.levels)
		const slope = Math.min(1, (section.to - x) / STACK_SLOPE)
		return Math.round((ending + (roof - ending) * slope) / 4) * 4
	}
	if (section.kind !== 'chamber') return TUNNEL
	// Up from a tunnel's roof, and back down to it, or to the roof of the
	// stack after it, in steps.
	const next = after(section)
	const ending = next?.kind === 'stack' ? stackRoof(next.levels) : TUNNEL
	const high = (section.levels - 1) * STOREY + CHAMBER_ROOM
	const rise = Math.min(1, (x - section.from) / CHAMBER_RAMP)
	const fall = Math.min(1, (section.to - x) / CHAMBER_RAMP)
	const room =
		rise < fall
			? TUNNEL + (high - TUNNEL) * ease(rise)
			: ending + (high - ending) * ease(fall)
	return Math.round(room / 8) * 8
}

/**
 * How high the rock is over the mine's floor, `x` along it from `from`: a
 * tunnel's roof, but for the two chambers, the secret line's way up and
 * its way back down, their roofs rising high, and sheer where the gallery
 * goes off into the rock between them.
 */
function mineRoom(from: number, x: number) {
	const t = x - from
	if (t >= MINE.up && t < MINE.gallery) {
		const rise = Math.min(1, (t - MINE.up) / MINE_RAMP)
		return Math.round((TUNNEL + (MINE_ROOM - TUNNEL) * ease(rise)) / 8) * 8
	}
	if (t >= MINE.galleryTo && t < MINE.down) {
		const fall = Math.min(1, (MINE.down - t) / MINE_RAMP)
		return Math.round((TUNNEL + (MINE_ROOM - TUNNEL) * ease(fall)) / 8) * 8
	}
	return TUNNEL
}

/** The mine, laid out from where its stretch of the caves starts: see `Mine`. */
const MINE_AT = SECTIONS.find((s) => s.kind === 'mine')?.from ?? MOUTH
const mine: Mine = {
	from: MINE_AT + MINE.rails,
	to: MINE_AT + MINE.buffers,
	carts: MINE.carts.map((x) => MINE_AT + x),
	secret: {
		from: MINE_AT + MINE.points,
		to: MINE_AT + MINE.rejoin,
		height: (x) => {
			const t = x - MINE_AT
			if (t < MINE.climb) return UPPER
			if (t < MINE.gallery)
				return (
					UPPER +
					(GALLERY_FLOOR - UPPER) *
						ease((t - MINE.climb) / (MINE.gallery - MINE.climb))
				)
			if (t < MINE.descend) return GALLERY_FLOOR
			return (
				GALLERY_FLOOR *
				(1 - ease((t - MINE.descend) / (MINE.rejoin - MINE.descend)))
			)
		},
		gallery: {
			from: MINE_AT + MINE.gallery,
			to: MINE_AT + MINE.galleryTo,
			floor: GALLERY_FLOOR,
			room: GALLERY_ROOM,
		},
	},
}

/**
 * The old mine deep under the caves, its Secret: down through the rope
 * bridge over the chasm, a long way down its shaft, into the workings.
 * A mine cart waits at the station there, for a ride like no other: up
 * and over a hill, round a loop, over a hump and a jump, into the
 * chamber where the mine people live, orange-helmeted, wide-shouldered
 * and armless, The Miner among them, two in the one cape. At its far end,
 * the lift, to shoot you back up its shaft and out of a hatch in the
 * floor of the chamber above. Meeting them, The Miner's yours to run as.
 */
/**
 * How far under the bridge the mine's roof is: not far, a short drop, but
 * under the bottom of the screen, where the camera never looks but after
 * someone down it. The caves' floor is near enough level, so that's all
 * it takes (unlike the Yetis' den, way down under a mountain).
 */
const MINE_UNDER = VIEW_HEIGHT - GROUND_Y + 110
/** How high the mine's workings are inside: room for the loop. */
const WORKINGS_ROOM = 330
/** The mine's floor: a y on the screen, level all along it. */
const WORKINGS_FLOOR =
	Math.round(terrain.groundY(CHASM_GAP.from)) + MINE_UNDER + WORKINGS_ROOM

/**
 * The ride, along from the bridge's far end: the station, where the carts
 * wait; the hill, the loop (`radius`, and how far on its bottom is coming
 * out of it from going in), the hump, the jump (up a ramp, over a gap in
 * the rails, down onto the next), and the run in to the buffers. Heights
 * over the floor.
 */
const RIDE = {
	station: 120,
	hill: { width: 200, height: 95 },
	loop: { radius: 72, shift: 56 },
	hump: { width: 180, height: 70 },
	ramp: { width: 100, height: 46 },
	/** The level end of its run-up, up on the ramp's trestles, to the end of the rail. */
	runUp: 60,
	jump: { width: 220, peak: 40, land: 30 },
	down: 90,
	buffers: 130,
}
/** How far apart the track's points are, and the flats between its parts. */
const TRACK_STEP = 4
const TRACK_FLAT = 40

/**
 * The ride's track, point by point along its rail, and the jump over a gap
 * in it: see `Coaster`.
 */
const COASTER: Coaster = (() => {
	const floor = WORKINGS_FLOOR
	const track: [number, number][] = []
	let x = CHASM_GAP.to + RIDE.station
	const add = (px: number, height: number) =>
		track.push([
			Math.round(px * 10) / 10,
			Math.round((floor - height) * 10) / 10,
		])
	/** Along `width`, at `height(t)` over the floor, `t` from 0 to 1. */
	const run = (width: number, height: (t: number) => number) => {
		for (let d = 0; d < width; d += TRACK_STEP) add(x + d, height(d / width))
		x += width
	}
	const flat = (width: number) => run(width, () => 0)
	/** Up and back down, smoothly. */
	const bump = (h: number) => (t: number) =>
		(h * (1 - Math.cos(2 * Math.PI * t))) / 2
	flat(TRACK_FLAT)
	run(RIDE.hill.width, bump(RIDE.hill.height))
	flat(TRACK_FLAT)
	// The loop: round from its bottom, up its far side, over the top upside
	// down, down its near side, and out along the bottom, a little on.
	const { radius, shift } = RIDE.loop
	const steps = Math.round((2 * Math.PI * radius) / TRACK_STEP)
	for (let i = 0; i < steps; i++) {
		const turn = (i / steps) * 2 * Math.PI
		track.push([
			Math.round(
				(x + radius * Math.sin(turn) + (shift * turn) / (2 * Math.PI)) * 10,
			) / 10,
			Math.round((floor - radius + radius * Math.cos(turn)) * 10) / 10,
		])
	}
	x += shift
	flat(TRACK_FLAT)
	run(RIDE.hump.width, bump(RIDE.hump.height))
	flat(TRACK_FLAT)
	// Up the ramp, levelling off, along its run-up to the end of the rail,
	// over the gap, jumped, and down onto the next. Not jumped, off the end
	// of the rail, and down the pit under it.
	const { ramp, jump } = RIDE
	// Its run-up, from the foot of the ramp: jump anywhere on it.
	const runUpFrom = track.length
	run(ramp.width, (t) => ramp.height * ease(t))
	run(RIDE.runUp, () => ramp.height)
	const airFrom = track.length
	const pitFrom = x
	run(
		jump.width,
		(t) =>
			ramp.height + (jump.land - ramp.height) * t + 4 * jump.peak * t * (1 - t),
	)
	const airTo = track.length
	const pitTo = x
	run(RIDE.down, (t) => jump.land * (1 - t) * (1 - t))
	flat(RIDE.buffers)
	add(x, 0)
	// Where along it the jump is, measured along the points.
	let along = 0
	const at: number[] = [0]
	for (let i = 1; i < track.length; i++) {
		along += Math.hypot(
			track[i][0] - track[i - 1][0],
			track[i][1] - track[i - 1][1],
		)
		at.push(along)
	}
	return {
		track,
		carts: 4,
		air: [[at[airFrom - 1], at[airTo]]],
		leap: { runUp: at[runUpFrom], pit: [pitFrom + 6, pitTo - 6] },
	}
})()

/** Where the ride ends, at its buffers, on the mine's floor. */
const RIDE_END = COASTER.track[COASTER.track.length - 1][0]
/** The mine people's chamber, past the buffers, and the lift at its far end. */
const CHAMBER_LENGTH = 560
const LIFT_AT = Math.round(RIDE_END + CHAMBER_LENGTH)
/** How high over the floor of the chamber above the lift shoots you, and how far on you come down. */
const LIFT_PEAK = 90
const LIFT_LAND = 100

const MINE_SECRET: Secret = {
	gap: CHASM_GAP,
	from: CHASM_GAP.from - 140,
	to: LIFT_AT + 90,
	floor: WORKINGS_FLOOR,
	room: WORKINGS_ROOM,
	launch: LIFT_AT,
	peak: LIFT_PEAK,
	land: LIFT_AT + LIFT_LAND,
	duct: true,
	bridged: true,
	// And there they are: The Miner, to run as.
	unlocks: MINER.id,
	// The mine people, calling out to whoever's coming; and to anyone
	// running as the Miner Twins, welcoming them home.
	greets: {
		near: 320,
		sound: 'miners',
		says: ['Hej hej!', 'Welcome!', 'Mind the gap!', 'Two heads!'],
		toSelf: 'One of us!',
	},
	coaster: COASTER,
}

/**
 * Someone stood about, or something flickering, from its `frames`: mostly
 * the first, now and then one of the others, as a prop's frames go round
 * (see `SecretProp`), so a blink's a blink, not a flicker.
 */
function idle(frames: string[]) {
	const [still, ...rest] = frames
	return rest.flatMap((frame) => [still, still, still, still, still, frame])
}

/** One of the mine people, stood idling against the back wall. */
const minePerson = (i: number): SecretProp => {
	const person = MINE_PEOPLE[i]
	return { ...person, frames: idle(person.frames) }
}

/**
 * The Miner, beside the lift: two in the one cape, hopping, hellos from
 * both of them now and then. From their own pictures, a pixel a cell.
 */
const THE_MINER: SecretProp = {
	frames: idle([theMinerStand, theMinerHello]),
	width: MINER.sprite.width * 2,
	height: MINER.sprite.height * 2,
}

/** The mine's furnishings, along from where things are in it. */
const RIDE_START = COASTER.track[0][0]
const MINE_FURNISHINGS: { x: number; prop: SecretProp }[] = [
	// At the station: its sign, the carts waiting under it, and a miner
	// seeing you off.
	{
		x: RIDE_START - 20,
		prop: {
			frames: [COASTER_SIGN],
			width: COASTER_SIGN_SIZE.width * 2,
			height: COASTER_SIGN_SIZE.height * 2,
		},
	},
	{ x: RIDE_START + 70, prop: minePerson(2) },
	// The chamber, past the buffers: a lamp, lunch, the mine people, their
	// sign, the dynamite, their spare capes and hats; and The Miner, by the lift.
	{ x: RIDE_END + 40, prop: CHAMBER_THINGS[0] },
	{ x: RIDE_END + 92, prop: minePerson(3) },
	{
		x: RIDE_END + 168,
		prop: { ...CHAMBER_THINGS[1], frames: idle(CHAMBER_THINGS[1].frames) },
	},
	{ x: RIDE_END + 244, prop: minePerson(4) },
	{ x: RIDE_END + 320, prop: CHAMBER_THINGS[3] },
	{ x: RIDE_END + 312, prop: minePerson(1) },
	{ x: RIDE_END + 398, prop: CHAMBER_THINGS[2] },
	{ x: RIDE_END + 402, prop: minePerson(0) },
	{ x: RIDE_END + 456, prop: CHAMBER_THINGS[4] },
	{ x: RIDE_END + 484, prop: THE_MINER },
]
/** The Miner, the last of them: who says hello. */
const GREETER = MINE_FURNISHINGS.length - 1

/**
 * The rope bridge over the chasm: level with its floor, giving a little
 * under you. Not solid: duck on it, and down through it you go.
 */
const BRIDGE: PlatformDefinition = {
	x: CHASM_GAP.from,
	width: CHASM_GAP.to - CHASM_GAP.from,
	height: 0,
	art: ropeBridgeArt(CHASM_GAP.to - CHASM_GAP.from),
	rope: { give: 10 },
}

/** The moles, sat waiting at the start of a Tunnel, to dig through what's after it. */
/** The climb's stretch of the caves. */
const CLIMB_AT = SECTIONS.find((s) => s.kind === 'climb')?.from
/** The mole, sat waiting on its ledge at the top of the climb, and how high that is. */
const MOLES = CLIMB_AT === undefined ? [] : [CLIMB_AT + CLIMB.mole]
const MOLES_UP = MOLES.map(() => CLIMB.ledgeHeight)

/** How high the hill's top is over the course. */
const HILL = 620
/** How steeply its sides rise, from the mouth and the way out. */
const HILL_SIDE = 1.3

const cave: Cave = {
	from: MOUTH,
	to: EXIT,
	ceiling: (x) => {
		const room = headroom(x)
		return room === undefined ? undefined : terrain.groundY(x) - room
	},
	// Its sides, from a tunnel's height over the path, so they don't jump
	// where its roof does.
	surface: (x) => {
		if (x < MOUTH || x >= EXIT) return undefined
		const side = Math.min(x - MOUTH, EXIT - x) * HILL_SIDE
		const top = terrain.groundY(MOUTH) - HILL + 18 * Math.sin(x / 260)
		return Math.max(top, terrain.groundY(x) - TUNNEL - 24 - side)
	},
	// And on down in front of the path, as steep, the path cut through it.
	foot: (x) => {
		if (x < MOUTH || x >= EXIT) return undefined
		const side = Math.min(x - MOUTH, EXIT - x) * HILL_SIDE
		return terrain.groundY(x) + PATH_FRONT + 4 + side
	},
}

/**
 * Each chamber's way through it: up a ledge onto terraces of rock, a level
 * at a time, each solid down to the floor, or to the terrace under it, with
 * a dip along the first. With a Tunnel, the first is thick rock with the
 * Tunnel through it, under it all the way: duck in at its foot, or go up and
 * over. Before a stack of tunnels, its terraces end at a pit, to jump across
 * onto the level they lead to, or drop into for one lower.
 */
function chamberPlatforms(chamber: Extract<Section, { kind: 'chamber' }>) {
	const platforms: PlatformDefinition[] = []
	/**
	 * A terrace, its top `height` up, drawn down to `base` up: the floor, or
	 * a terrace's top. It's behind the path: the floor runs on in front of
	 * it, whoever's not gone up.
	 */
	const terrace = (x: number, width: number, height: number, base = 0) => {
		if (width <= 0) return
		platforms.push({
			x,
			width,
			height,
			// Down to the floor's back edge, behind the path: not over it.
			depth: height - base - (base ? 0 : PATH_BACK - 2),
		})
	}
	const start = chamber.from + CHAMBER_RAMP + 20
	const into = after(chamber)?.kind === 'stack'
	const end = into ? chamber.to - PIT : chamber.to - CHAMBER_RAMP - 60
	terrace(start, LEDGE_WIDTH, LEDGE)
	const first = start + LEDGE_WIDTH
	if (chamber.tunnel) {
		// A gap off the ledge to its foot, and the Tunnel through it.
		const from = first + 80
		platforms.push({
			x: from,
			width: end - from,
			height: STOREY,
			depth: OVER_TUNNEL,
			solid: OVER_TUNNEL,
		})
	} else {
		const dip = first + Math.round((end - first) * 0.4)
		terrace(first, dip - first, STOREY)
		terrace(dip, DIP_WIDTH, DIP)
		terrace(dip + DIP_WIDTH, end - dip - DIP_WIDTH, STOREY)
	}
	// Further up, a step at a time, each on the terrace under it; ending
	// before it, to step down, unless it's leading on into a stack.
	for (let level = 2; level < chamber.levels; level++) {
		const base = (level - 1) * STOREY
		const from = first + 260 * (level - 1)
		const to = into ? end : end - 260 * (level - 1)
		terrace(from, STEP_WIDTH, base + STEP, base)
		terrace(from + STEP_WIDTH, to - from - STEP_WIDTH, level * STOREY, base)
	}
	// In the pit before a stack: a block to get up from onto its next level up.
	if (into) terrace(end, STEP_WIDTH, STEP)
	return platforms
}

/**
 * A stack of tunnels' floors between its levels: solid rock, each level's
 * floor and the roof of the one under it, ending short of the stack's end
 * to drop out of, the top one first. Over a Tunnel in the level under it,
 * thick down to its roof.
 */
function stackPlatforms(stack: Extract<Section, { kind: 'stack' }>) {
	const platforms: PlatformDefinition[] = []
	for (let level = 1; level < stack.levels; level++) {
		const floor = (x: number, width: number, depth: number) =>
			platforms.push({ x, width, height: level * STOREY, depth, solid: depth })
		const end = stack.to - DROP_OUT - (stack.levels - 1 - level) * 160
		const slide = stackSlide(stack, level - 1)
		if (!slide) floor(stack.from, end - stack.from, FLOOR)
		else {
			floor(stack.from, slide.from - stack.from, FLOOR)
			floor(slide.from, slide.to - slide.from, OVER_TUNNEL)
			floor(slide.to, end - slide.to, FLOOR)
		}
	}
	return platforms
}

/** The climb's stepping stones, and the mole's ledge at the top of them. */
function climbPlatforms(from: number): PlatformDefinition[] {
	return [
		...CLIMB.stones.map((at, i) => ({
			x: from + at,
			width: CLIMB.stoneWidth,
			height: CLIMB.step * (i + 1),
			depth: 16,
		})),
		{
			x: from + CLIMB.ledge,
			width: CLIMB.length - CLIMB.ledge,
			height: CLIMB.ledgeHeight,
			depth: 22,
		},
	]
}

const PLATFORMS = [
	...SECTIONS.flatMap((s) =>
		s.kind === 'chamber'
			? chamberPlatforms(s)
			: s.kind === 'stack'
				? stackPlatforms(s)
				: s.kind === 'climb'
					? climbPlatforms(s.from)
					: [],
	),
	// The rope bridge over the chasm, last.
	BRIDGE,
]

/** How far along a Tunnel's way in its warning stripes go. */
const WARNING = 64

/**
 * Each Tunnel's way in: where it is, and, under a shelf of rock rather than
 * the cave's roof, the shelf's underside.
 */
const MOUTHS: { x: number; roof?: number }[] = [
	// Tunnels along the floor.
	...SECTIONS.flatMap((s) => (s.kind === 'slide' ? [{ x: s.from }] : [])),
	// Along a stack's top level, under the cave's roof.
	...SECTIONS.flatMap((s) => {
		if (s.kind !== 'stack') return []
		const slide = stackSlide(s, s.levels - 1)
		return slide ? [{ x: slide.from }] : []
	}),
	// Under a shelf of rock, thick down to the Tunnel's roof.
	...PLATFORMS.flatMap((p) =>
		p.solid === OVER_TUNNEL
			? [
					{
						x: p.x,
						roof: terrain.groundY(p.x) - p.height + p.solid,
					},
				]
			: [],
	),
]

/** Yellow and black stripes over each Tunnel's way in. */
const WARNINGS: NonNullable<Cave['warnings']> = MOUTHS.map(({ x, roof }) => ({
	from: x,
	to: x + WARNING,
	roof,
}))

/**
 * Stalactites that fall, as you come: up in the high roofs, a long way to
 * fall, so there's time to be past one if you're going flat out (see
 * `stalactites.ts`). Early in the first chamber, at the foot of the climb
 * before its stepping stones, and early in the last plain chamber; never
 * under a shelf of rock, which they'd come down through.
 */
const STALACTITES = (() => {
	const chambers = SECTIONS.filter(
		(s) => s.kind === 'chamber' && !s.tunnel && s.from > MOUTH,
	)
	const climb = SECTIONS.find((s) => s.kind === 'climb')
	const spots = [
		chambers[0] && chambers[0].from + CHAMBER_RAMP + 220,
		climb && climb.from + 190,
		chambers.length > 1 &&
			chambers[chambers.length - 1].from + CHAMBER_RAMP + 220,
	]
	return spots.filter(
		(x): x is number =>
			typeof x === 'number' &&
			!PLATFORMS.some((p) => p.solid && x > p.x - 20 && x < p.x + p.width + 20),
	)
})()

/**
 * The huge spider, scuttling to and fro on the floor of the big chamber
 * past the chasm: three levels of it, and no ravine across its floor, so
 * a bounce off it lands you somewhere, up on a terrace or on along the
 * floor, not down a pit. Short of where the mine's lift comes up.
 */
const SPIDER = (() => {
	const chamber = SECTIONS.find(
		(s) => s.kind === 'chamber' && s.from > CHASM_AT,
	)
	if (!chamber) return undefined
	const from = chamber.from + CHAMBER_RAMP + 180
	const to = from + 620
	return {
		kind: 'spider',
		x: Math.round((from + to) / 2),
		range: [from, to],
	} satisfies Obstacle
})()

/** How far in from the cave's mouth it's kept clear of anything in the way. */
const MOUTH_CLEAR = 400

/**
 * Whether `x` is too near a Tunnel's mouth, or a chamber's ledge, or just
 * inside the cave's own, for anything to be in the way; or in a stack of
 * tunnels, too low to jump anything in.
 */
const busy = (x: number) =>
	// Just inside the mouth, where it's only showing as the rock over it
	// fades away: too late to see anything in the way in time.
	(x > MOUTH - 120 && x < MOUTH + MOUTH_CLEAR) ||
	SECTIONS.some(
		(s) =>
			(s.kind === 'slide' && x > s.from - 220 && x < s.to + 120) ||
			(s.kind === 'chamber' && x > s.from - 120 && x < s.to + 120) ||
			(s.kind === 'stack' && x > s.from - 120 && x < s.to + 120) ||
			(s.kind === 'mine' && x > s.from - 120 && x < s.to + 120) ||
			(s.kind === 'chasm' && x > s.from - 160 && x < s.to + 60) ||
			(s.kind === 'climb' && x > s.from - 120 && x < s.to + 220),
	) ||
	MOLES.some((m) => Math.abs(x - m) < 220) ||
	STALACTITES.some((at) => Math.abs(x - at) < 160) ||
	PLATFORMS.some(
		(p) => p.solid === OVER_TUNNEL && x > p.x - 220 && x < p.x + p.width + 120,
	)

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(6502)
	let fika = 0
	const nextFika = () => CAVES_FIKA[fika++ % CAVES_FIKA.length]
	const { obstacles, boosts } = scatter({
		terrain,
		random,
		clear: (x) => !busy(x),
		pick: (x): Obstacle | Boost => {
			const roll = random()
			if (roll < 0.62) return { kind: 'rock', x }
			// Low down: there's no jumping high in here.
			if (roll < 0.84) return { kind: 'fika', x, height: 26, item: nextFika() }
			return {
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			}
		},
	})
	for (const x of STALACTITES) obstacles.push({ kind: 'stalactite', x })
	if (SPIDER) obstacles.push(SPIDER)
	obstacles.sort((a, b) => a.x - b.x)
	// Fika up on the terraces and in the upper tunnels, for whoever goes the
	// high way: not where it's a Tunnel along them.
	for (const p of PLATFORMS)
		if (p.height % STOREY === 0 && p.width > 200) {
			const x = Math.round(p.x + p.width / 2)
			if ((headroom(x) ?? 0) - p.height > 60)
				boosts.push({
					kind: 'fika',
					x,
					height: p.height + 26,
					item: nextFika(),
				})
		}
	// Up in the secret gallery: a miner's helmet, at the height of whoever's
	// sat in a cart going by.
	boosts.push({
		kind: 'hat',
		x: Math.round((mine.secret.gallery.from + mine.secret.gallery.to) / 2),
		height: GALLERY_FLOOR + CART_SEAT + 8,
		hat: 'miner',
	})
	boosts.sort((a, b) => a.x - b.x)

	// Trees outside; inside, crystals, toadstools glowing, stalagmites,
	// timbers holding up the tunnels' roofs, and lamps.
	const scenery: Course['scenery'] = []
	/** On the cave's floor, up and down with it, at the back edge of the path. */
	const onFloor = (
		x: number,
		asset: string,
		filter?: string,
	): Course['scenery'][number] => ({
		x,
		asset,
		scale: 2,
		setBack: -2,
		onFloor: true,
		filter,
	})
	/** Not under a shelf or a terrace: for something tall, the timbers or a lamp. */
	const open = (x: number, half: number) =>
		!PLATFORMS.some((p) => x + half > p.x && x - half < p.x + p.width)
	/** Clear of what's there already, `room` either side. */
	const taken: [number, number][] = []
	const free = (x: number, room: number) =>
		!taken.some(([from, to]) => x + room > from && x - room < to)
	const take = (x: number, room: number) => taken.push([x - room, x + room])
	/**
	 * Somewhere for something on the floor: inside, not in a Tunnel, nor
	 * under rock thick down to one, nor at the mine's carts.
	 */
	const room = (x: number) =>
		x > MOUTH + 200 &&
		x < EXIT - 120 &&
		sectionAt(x)?.kind !== 'slide' &&
		!(x > mine.carts[0] - 120 && x < mine.carts[mine.carts.length - 1] + 120) &&
		!PLATFORMS.some(
			(p) => p.solid === OVER_TUNNEL && x > p.x - 30 && x < p.x + p.width + 30,
		)

	// Before the bridge over the chasm, a hint: an old signpost, pointing down.
	const hint = CHASM_AT + CHASM.sign
	scenery.push({ x: hint, asset: BRIDGE_SIGN, scale: 2, setBack: 2 })
	take(hint, 40)

	// The mine's sign over its way in, and a miner's things by its rails.
	const signAt = MINE_AT - 60
	scenery.push(onFloor(signAt, mineSign.asset))
	take(signAt, (mineSign.width * 2) / 2 + 10)
	scenery.push(onFloor(mine.to + 70, minersKit))
	take(mine.to + 70, 40)

	const EXIT_SIGN = CAVE_DETAILS.find((d) => d.name === 'exit sign')
	/**
	 * Whether a detail fits at `x`: room for it on the floor and under the
	 * roof all the way across it, not only in its middle, so it's never
	 * half into a Tunnel's mouth.
	 */
	const fits = (x: number, piece: CaveDetail) => {
		const half = piece.width
		return [-half, 0, half].every(
			(dx) => room(x + dx) && (headroom(x + dx) ?? 0) >= piece.height * 2 + 20,
		)
	}
	// The way out, signposted, just before it.
	if (EXIT_SIGN) {
		const x = EXIT - 260
		scenery.push({ ...onFloor(x, EXIT_SIGN.asset) })
		take(x, EXIT_SIGN.width + 2)
	}

	// Cave paintings on the bare back wall, along the tunnels and the mine,
	// every so often: hands, a hunt, the bus after everyone, the mole, the
	// spider, the mine people; and, by the bridge over the chasm, how to go
	// down through it.
	const drop = CHASM_AT + CHASM.hint
	scenery.push({ x: drop, asset: DROP_HINT.asset, scale: 2, setBack: -2 })
	take(drop, DROP_HINT.width)
	let painting = 0
	/** A painting somewhere between `from` and `to`, if one fits: from the middle out. */
	const paint = (from: number, to: number) => {
		const art = CAVE_PAINTINGS.filter((p) => p !== DROP_HINT)[
			painting % (CAVE_PAINTINGS.length - 1)
		]
		const half = art.width
		const middle = Math.round((from + to) / 2)
		for (let d = 0; d < (to - from) / 2 - half; d += 20)
			for (const x of [middle + d, middle - d]) {
				const fits = [-half, 0, half].every(
					(dx) => (headroom(x + dx) ?? 0) >= art.height * 2 + 10,
				)
				if (
					!fits ||
					!room(x - half) ||
					!room(x + half) ||
					!free(x, half + 6) ||
					!open(x, half)
				)
					continue
				scenery.push({ x, asset: art.asset, scale: 2, setBack: -2 })
				take(x, half + 6)
				painting++
				return
			}
	}
	for (const section of SECTIONS) {
		if (section.kind === 'tunnel') paint(section.from, section.to)
		// Two along the mine, either side of its gallery's chambers.
		if (section.kind === 'mine') {
			paint(section.from + 60, section.from + MINE.up)
			paint(section.from + MINE.down, section.to - 60)
		}
	}

	// Timbers along the tunnels and through the mine, every so often, a
	// lamp hung now and then between them.
	for (const section of SECTIONS) {
		if (section.kind !== 'tunnel' && section.kind !== 'mine') continue
		for (
			let x = section.from + 140;
			x < section.to - 100;
			x += 260 + random() * 200
		) {
			const at = Math.round(x)
			// Where the roof's high enough over it all the way across.
			const roomy = [-30, 0, 30].every(
				(dx) =>
					(headroom(at + dx) ?? 0) >= 104 && (headroom(at + dx) ?? 0) < 200,
			)
			if (!roomy || !room(at) || !free(at, 34) || !open(at, 34)) continue
			scenery.push(onFloor(at, timberFrame))
			take(at, 34)
		}
	}
	for (let at = MOUTH + 300; at < EXIT - 200; at += 500 + random() * 500) {
		const x = Math.round(at)
		if (!room(x) || !free(x, 16) || !open(x, 16) || (headroom(x) ?? 0) < 90)
			continue
		scenery.push(onFloor(x, lampPost))
		take(x, 16)
	}
	// Toadstools, stalagmites and crystals, all along the floor; and the
	// odd thing left lying about, or living down here: the mine's things
	// in the mine, the low ones in the tunnels.
	/** The next of what goes `where`: each in turn, so there's a bit of everything. */
	const turns = new Map<string, number>()
	const nextDetail = (kind: Section['kind'] | undefined) => {
		const where: CaveDetail['where'][] =
			kind === 'mine'
				? ['mine', 'anywhere']
				: kind === 'tunnel'
					? ['tunnel', 'anywhere']
					: ['anywhere']
		const pick = CAVE_DETAILS.filter(
			(d) => d !== EXIT_SIGN && where.includes(d.where),
		)
		const key = where.join()
		const turn = turns.get(key) ?? 0
		turns.set(key, turn + 1)
		return pick[turn % pick.length]
	}
	const shrooms = [
		glowShrooms('#5ee8e0', '#d6fffb'),
		glowShrooms('#c27df0', '#f3dcff'),
	]
	for (let at = MOUTH + 220; at < EXIT - 200; at += 90 + random() * 200) {
		const x = Math.round(at)
		if (!room(x) || !free(x, 18)) continue
		const roll = random()
		if (roll < 0.4)
			scenery.push({
				...onFloor(
					x,
					crystals,
					random() < 0.35 ? 'hue-rotate(110deg)' : undefined,
				),
			})
		else if (roll < 0.52)
			scenery.push(onFloor(x, shrooms[Math.floor(random() * 2)]))
		else if (roll < 0.64) scenery.push(onFloor(x, stalagmites))
		else {
			const piece = nextDetail(sectionAt(x)?.kind)
			const half = piece.width + 2
			if (!fits(x, piece) || !free(x, half) || !open(x, half)) continue
			scenery.push({
				...onFloor(x, piece.asset),
				frames: piece.frames,
				frameTicks: piece.frameTicks,
			})
			take(x, half)
			continue
		}
		take(x, 18)
	}
	// And more of them: down here a while, everyone's left something.
	for (let at = MOUTH + 300; at < EXIT - 200; at += 120 + random() * 180) {
		const x = Math.round(at)
		if (!room(x)) continue
		const piece = nextDetail(sectionAt(x)?.kind)
		const half = piece.width + 2
		if (!fits(x, piece) || !free(x, half) || !open(x, half)) continue
		scenery.push({
			...onFloor(x, piece.asset),
			frames: piece.frames,
			frameTicks: piece.frameTicks,
		})
		take(x, half)
	}
	for (let at = -400; at < terrain.finishX + 900; at += 120 + random() * 260) {
		const x = Math.round(at)
		if (x < MOUTH - 120 || x > EXIT + 120)
			scenery.push({ x, asset: random() < 0.5 ? tree1 : tree2 })
	}
	scenery.sort((a, b) => a.x - b.x)
	return { obstacles, boosts, scenery }
}

export const caves: CourseDefinition = {
	id: 'caves',
	name: 'The Caves',
	blurb:
		'Into the hill and through its caves: duck into the low tunnels, choose your level, climb to the mole and dig through the rock, take a mine cart up to the secret line, and mind the stalactites.',
	terrain,
	cave: { ...cave, warnings: WARNINGS },
	platforms: PLATFORMS,
	mine,
	secret: MINE_SECRET,
	// Down through the bridge, round the loop, and up out of the lift.
	special: {
		goal: 'Find the miners',
		done: (run) => !!run.foundSecret,
	},
	corgis: MOLES,
	corgisUp: MOLES_UP,
	ride: 'mole',
	runDirectors: ['keith', 'rick'],
	cheerers: CHEERERS,
	look: {
		palette: {
			'--hud-ink': '#fff4e6',
			'--hud-shadow':
				'2px 0 #1b1530, -2px 0 #1b1530, 0 2px #1b1530, 0 -2px #1b1530',
		},
		// A ravine's drop: on down into the dark.
		gap: 'linear-gradient(to bottom, #251c18, #0d0907 110px)',
		cave: {
			rock: ROCK,
			seam: SEAM,
			edge: ROCK_LIGHTEST,
			wall: WALL,
			grass: '#5e8d3c',
			tiles: CAVE_TILES,
			stalactites: true,
		},
		// Terraces and floors of rock: a worn lip, moss along it, and the
		// cave's rock down their face, darker the further down.
		platform: {
			top: '#8a7262',
			face: ROCK_FACE,
			edge: '#2e231d',
			rock: { lit: '#b9a08a', moss: '#6d9a4a', drip: ROCK_LIGHTEST },
		},
		bus: {
			body: busBody,
			windows,
			scoop: DRILL_FRAMES[0],
			drill: DRILL_FRAMES,
		},
		// The old mine under it all: the mine people's chamber, and the lift.
		secret: {
			walls: 'mine',
			launcher: LIFT,
			furnishings: MINE_FURNISHINGS,
			greeter: GREETER,
			// Its lift: up its timbered shaft, in its cage, and out of the
			// hatch in the chamber's floor above.
			duct: {
				grate: HATCH,
				width: LIFT.width,
				steel: LIFT_SHAFT.timber,
				lit: LIFT_SHAFT.timberLit,
				shade: LIFT_SHAFT.timberShade,
				seam: LIFT_SHAFT.seam,
				air: LIFT_SHAFT.air,
				cage: LIFT_CAGE,
			},
		},
	},
	...layOut(),
}
