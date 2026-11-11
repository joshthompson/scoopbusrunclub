import type { RunnerName } from '@/data/runners'
import busBody from '../assets/bus/bus.png'
import drill1 from '../assets/bus/drill-1.png'
import drill2 from '../assets/bus/drill-2.png'
import windows from '../assets/bus/windows.png'
import crystals from '../assets/scenery/crystals.png'
import tree1 from '../assets/scenery/tree1.png'
import tree2 from '../assets/scenery/tree2.png'
import {
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	START_X,
} from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { type Terrain, withGaps } from '../game/terrain'
import { scatter } from './kit/scatter'
import { seeded } from './kit/seeded'
import type {
	Boost,
	Cave,
	Course,
	CourseDefinition,
	Obstacle,
	PlatformDefinition,
} from './types'

/**
 * The Caves: across a meadow and into a hill, through the caves under it,
 * and out again for the finish. Tunnels too low to stand in, to slide into
 * and roll through; chambers with two ways through them, up over a shelf of
 * rock or along under it; and the bus, too big for any of it, drilling
 * through the lot behind you.
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

/** The cave's mouth, and the way out, near the finish. */
const MOUTH = START_X + 1500
const EXIT = FINISH - 1300

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
/** How long a Tunnel in a stack is. */
const STACK_SLIDE = 440

/** How long the tunnel to the way out is, at least. */
const LAST_TUNNEL = 900

type Section =
	| { kind: 'tunnel' | 'slide'; from: number; to: number }
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
	| ['tunnel' | 'slide', number]
	| ['chamber', number, { levels: number; tunnel?: boolean }]
	| ['stack', number, { levels: number; slides: boolean[] }]

/** The caves, one stretch after another, from the mouth to the way out. */
const SECTIONS: Section[] = (() => {
	const plan: Plan[] = [
		['tunnel', 600],
		['slide', 400],
		['tunnel', 600],
		['chamber', 1500, { levels: 2 }],
		['stack', 1800, { levels: 2, slides: [true, false] }],
		['tunnel', 600],
		['slide', 500],
		['tunnel', 500],
		['chamber', 1700, { levels: 3 }],
		['stack', 2200, { levels: 3, slides: [false, true, true] }],
		['tunnel', 600],
		['slide', 600],
		['tunnel', 500],
		['chamber', 1400, { levels: 2, tunnel: true }],
		['chamber', 1300, { levels: 2 }],
		['stack', 1500, { levels: 2, slides: [true, true] }],
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
const level = (s: Section) => s.kind === 'chamber' || s.kind === 'stack'

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
 * nor outside, easing between.
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
	RAVINES,
)

/** How high the cave's rock is over the Ground at `x`: none outside it. */
function headroom(x: number) {
	const section = sectionAt(x)
	if (!section) return undefined
	if (section.kind === 'slide') return SLIDE
	// A tunnel's roof, a little uneven.
	if (section.kind === 'tunnel')
		return Math.round((TUNNEL + 10 * Math.sin(x / 170)) / 4) * 4
	if (section.kind === 'stack') {
		// Down to a Tunnel along its top level, where that has one.
		const top = section.levels - 1
		const slide = stackSlide(section, top)
		if (slide && x >= slide.from && x < slide.to) return top * STOREY + SLIDE
		return stackRoof(section.levels)
	}
	if (section.kind !== 'chamber') return TUNNEL
	// Up from a tunnel's roof, and back down to it, or to the roof of the
	// stack after it, in steps.
	const next = after(section)
	const ending = next?.kind === 'stack' ? stackRoof(next.levels) : TUNNEL
	const high = (section.levels - 1) * STOREY + CHAMBER_ROOM
	const rise = Math.min(1, (x - section.from) / CHAMBER_RAMP)
	const fall = Math.min(1, (section.to - x) / CHAMBER_RAMP)
	const ease = (t: number) => t * t * (3 - 2 * t)
	const room =
		rise < fall
			? TUNNEL + (high - TUNNEL) * ease(rise)
			: ending + (high - ending) * ease(fall)
	return Math.round(room / 8) * 8
}

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

const PLATFORMS = SECTIONS.flatMap((s) =>
	s.kind === 'chamber'
		? chamberPlatforms(s)
		: s.kind === 'stack'
			? stackPlatforms(s)
			: [],
)

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
 * Whether `x` is too near a Tunnel's mouth, or a chamber's ledge, for
 * anything to be in the way; or in a stack of tunnels, too low to jump
 * anything in.
 */
const busy = (x: number) =>
	SECTIONS.some(
		(s) =>
			(s.kind === 'slide' && x > s.from - 220 && x < s.to + 120) ||
			(s.kind === 'chamber' && x > s.from - 120 && x < s.to + 120) ||
			(s.kind === 'stack' && x > s.from - 120 && x < s.to + 120),
	) ||
	PLATFORMS.some(
		(p) => p.solid === OVER_TUNNEL && x > p.x - 220 && x < p.x + p.width + 120,
	)

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(6502)
	let fika = 0
	const nextFika = () => FIKA_ITEMS[fika++ % FIKA_ITEMS.length]
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
	boosts.sort((a, b) => a.x - b.x)

	// Trees and flowers outside; crystals glowing on the walls inside.
	const scenery: Course['scenery'] = []
	for (let at = -400; at < terrain.finishX + 900; at += 120 + random() * 260) {
		const x = Math.round(at)
		if (x < MOUTH - 120 || x > EXIT + 120)
			scenery.push({ x, asset: random() < 0.5 ? tree1 : tree2 })
		else if (
			x > MOUTH + 200 &&
			x < EXIT - 200 &&
			sectionAt(x)?.kind !== 'slide' &&
			// Nor under rock thick down to a Tunnel's roof.
			!PLATFORMS.some(
				(p) =>
					p.solid === OVER_TUNNEL && x > p.x - 30 && x < p.x + p.width + 30,
			)
		)
			scenery.push({
				x,
				asset: crystals,
				scale: 2,
				// On the cave's floor, the back edge of the path, where they
				// stand: no field behind them, and up and down with the floor.
				setBack: -2,
				onFloor: true,
				filter: random() < 0.35 ? 'hue-rotate(110deg)' : undefined,
			})
	}
	return { obstacles, boosts, scenery }
}

/** The cave's rock, as a CSS background: its seams and flecks, as the Ground draws it. */
const ROCK_FACE = (() => {
	const [rock, seam, edge] = ['#5a4639', '#3f3129', '#7a6150']
	const rects: [number, number, number, number, string][] = [
		[0, 0, 48, 36, rock],
		[2, 6, 16, 2, seam],
		[16, 8, 6, 2, seam],
		[28, 18, 14, 2, seam],
		[24, 20, 4, 4, seam],
		[6, 28, 10, 2, seam],
		[36, 4, 4, 2, edge],
		[10, 18, 2, 2, edge],
		[40, 30, 2, 2, edge],
	]
	const body = rects
		.map(
			([x, y, w, h, fill]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
		)
		.join('')
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="36" shape-rendering="crispEdges">${body}</svg>`
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})()

export const caves: CourseDefinition = {
	id: 'caves',
	name: 'The Caves',
	blurb:
		'Into the hill and through its caves: duck into the low tunnels, and choose your level, up through the shelves or along under them.',
	terrain,
	cave: { ...cave, warnings: WARNINGS },
	platforms: PLATFORMS,
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
			rock: '#5a4639',
			seam: '#3f3129',
			edge: '#7a6150',
			wall: '#251c18',
			grass: '#5e8d3c',
		},
		// The rock shelves: a worn top, and rock down their face.
		// Terraces and floors of rock: a worn top, and the cave's rock down
		// their face.
		platform: {
			top: '#8a7262',
			face: ROCK_FACE,
			edge: '#2e231d',
		},
		bus: {
			body: busBody,
			windows,
			scoop: drill1,
			drill: [drill1, drill2],
		},
	},
	...layOut(),
}
