import type { SpiderLook } from '../types'
import { type PixelRect, letterArt, paintedArt, pixelArt } from './pixelArt'

/**
 * Dino Island's forest: the dinosaurs in it, and what grows there. All
 * drawn in code, in cells (see the `pixel-art` skill).
 */

/** A cell, in screen pixels. */
const CELL = 2

/** A filled ellipse, a row of cells at a time, centred on `cx`, `cy`. */
function ellipse(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	colour: string,
): PixelRect[] {
	const rects: PixelRect[] = []
	for (let y = Math.floor(cy - ry); y < Math.ceil(cy + ry); y++) {
		const dy = (y + 0.5 - cy) / ry
		if (Math.abs(dy) >= 1) continue
		const half = rx * Math.sqrt(1 - dy * dy)
		const x0 = Math.round(cx - half)
		const x1 = Math.round(cx + half)
		if (x1 > x0) rects.push([x0, y, x1 - x0, 1, colour])
	}
	return rects
}

/** A stepped line from one cell to another, `thick` cells across. */
function line(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	thick: number,
	colour: string,
): PixelRect[] {
	const rects: PixelRect[] = []
	const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
	for (let i = 0; i <= steps; i++) {
		const x = Math.round(x0 + ((x1 - x0) * i) / steps)
		const y = Math.round(y0 + ((y1 - y0) * i) / steps)
		rects.push([x, y, thick, 1, colour])
	}
	return rects
}

// --- Triceratops --------------------------------------------------------------

const TRIKE = {
	back: '#7d8c4c',
	lit: '#9aaa62',
	shade: '#5b6a38',
	belly: '#cfc78e',
	frill: '#d4623a',
	frillLit: '#ee8c52',
	frillDark: '#8e3a24',
	horn: '#f1e6c4',
	hornShade: '#c9b98e',
	beak: '#8a6a3a',
	ink: '#1d1d1d',
}

const TRIKE_COLS = 64
const TRIKE_ROWS = 40

/**
 * A triceratops's rects, facing left: a barrel of a body, olive with a
 * pale belly, a big warm frill fanned up behind its head, two brow horns
 * and a short nose one, cream; its legs, `legs` of them stepping. Pressed
 * down by `squash` (1 is whole) from its feet up.
 */
function triceratops(step: number, squash: number) {
	const T = TRIKE
	const r: PixelRect[] = []
	// Its legs, far pair first, in the shade: the feet swing and lift.
	const swing = [-3, 0, 3, 0][step]
	const lift = [0, 1, 0, 0][step]
	const lift2 = [0, 0, 0, 1][step]
	const leg = (x: number, dx: number, up: number, colour: string) => {
		r.push([x + dx, 30, 6, 7 - up, colour])
		r.push([x + dx - 1, 37 - up, 8, 3 - 0, T.shade])
		r.push([x + dx - 1, 37 - up, 8, 1, T.beak])
	}
	leg(30, -swing, lift2, T.shade)
	leg(52, swing, lift, T.shade)
	const legsEnd = r.length
	// Its tail, tapering off behind.
	r.push(
		[58, 17, 4, 7, T.back],
		[62, 19, 2, 4, T.back],
		[58, 22, 4, 2, T.shade],
	)
	// Its body, the back lit along the top, the belly pale and shaded under.
	r.push(...ellipse(40, 21, 21, 10, T.back))
	r.push(...ellipse(40, 19, 19, 6, T.lit))
	r.push(...ellipse(40, 24, 18, 5, T.back))
	r.push([24, 28, 34, 2, T.belly], [26, 30, 30, 1, T.shade])
	r.push([30, 13, 3, 1, T.lit], [44, 13, 6, 1, T.lit])
	// A few plates along its back.
	r.push(
		[36, 14, 2, 1, T.shade],
		[46, 15, 2, 1, T.shade],
		[52, 17, 2, 1, T.shade],
	)
	// Everything above its legs sits three cells lower.
	for (let i = legsEnd; i < r.length; i++) r[i][1] += 3
	const bodyEnd = r.length
	// Its legs, near pair, over the body.
	leg(26, swing, lift, T.back)
	r.push([26 + swing, 31, 2, 5 - lift, T.lit])
	leg(48, -swing, lift2, T.back)
	r.push([48 - swing, 31, 2, 5 - lift2, T.lit])
	const nearLegs = r.splice(bodyEnd)
	// Its frill, fanned up behind its head: warm, lit along the top, with a
	// dark ring of spots round its rim.
	r.push(...ellipse(21, 15, 9, 10, T.frillDark))
	r.push(...ellipse(21.5, 15.5, 8, 9, T.frill))
	r.push(...ellipse(21, 12, 6, 5, T.frillLit))
	for (const [x, y] of [
		[14, 9],
		[17, 6],
		[21, 5],
		[25, 6],
		[28, 9],
		[29, 13],
	])
		r.push([x, y, 1, 1, T.horn])
	// Its head, big and low, with a beak.
	r.push(...ellipse(11, 24, 8, 6, T.back))
	r.push(...ellipse(11, 22, 7, 3, T.lit))
	r.push([3, 25, 5, 5, T.back], [2, 27, 4, 3, T.beak], [4, 29, 6, 1, T.shade])
	r.push([8, 29, 8, 2, T.belly], [14, 28, 4, 3, T.back])
	// Its horns: two brow ones, out ahead and up, and a short one on its nose.
	r.push(...line(10, 19, 4, 11, 2, T.horn))
	r.push([5, 12, 1, 3, T.hornShade])
	r.push(...line(15, 19, 12, 12, 2, T.horn))
	r.push([13, 14, 1, 4, T.hornShade])
	r.push([4, 22, 2, 3, T.horn], [3, 23, 1, 2, T.hornShade])
	// Its eye.
	r.push([9, 23, 2, 2, T.ink])
	for (let i = bodyEnd; i < r.length; i++) r[i][1] += 3
	r.push(...nearLegs)
	if (squash === 1) return r
	// Squashed: every rect pressed down towards its feet.
	return r
		.map(([x, y, w, h, c]): PixelRect => {
			const top = Math.round(TRIKE_ROWS - (TRIKE_ROWS - y) * squash)
			const bottom = Math.round(TRIKE_ROWS - (TRIKE_ROWS - y - h) * squash)
			return [x, top, w, Math.max(1, bottom - top), c]
		})
		.filter(([, y]) => y < TRIKE_ROWS)
}

const TRIKE_ART = (step: number, squash = 1) =>
	pixelArt(TRIKE_COLS, TRIKE_ROWS, triceratops(step, squash))

/**
 * A triceratops, in place of The Caves' spider (see `CourseLook['spider']`):
 * side on, facing left, the way you come, plodding to and fro. Bounce on
 * its frill or its back; run into its horns, and you're down. Its walk's
 * frames, and squashed, bounced on; all `width` by `height` screen px.
 */
const TRICERATOPS_WIDTH = TRIKE_COLS * CELL
const TRICERATOPS_HEIGHT = TRIKE_ROWS * CELL
export const TRICERATOPS: SpiderLook = {
	frames: [0, 1, 2, 3].map((i) => TRIKE_ART(i)),
	squashed: TRIKE_ART(0, 0.8),
	width: TRICERATOPS_WIDTH,
	height: TRICERATOPS_HEIGHT,
	// Its frill and head, behind its horns, and its back, up from its feet.
	head: { from: 24, to: 56, top: 64 },
	body: { from: 56, to: 124, top: 48 },
	// Its horns, out ahead, and its face.
	bite: { from: 0, to: 26, top: 52 },
	word: 'Ouch!',
}

// --- The herds ----------------------------------------------------------------

/** A herd's runner: its run's frames, facing right, `width` by `height` screen px. */
export interface HerdLook {
	frames: string[]
	width: number
	height: number
}

/** A leg, hip to foot, stepped down in cells, with a foot of `toe` cells on the end. */
function runnerLeg(
	hipX: number,
	hipY: number,
	footX: number,
	footY: number,
	thick: number,
	colour: string,
	claw: string,
): PixelRect[] {
	return [
		...line(hipX, hipY, footX, footY, thick, colour),
		[footX, footY, thick + 2, 1, claw],
	]
}

/** The four frames of a run: legs reaching, passing, reaching the other way, passing. */
const RUN_SWING = [3, 0, -3, 0]
const RUN_LIFT = [0, 1, 0, 0]
const RUN_LIFT_FAR = [0, 0, 0, 1]

const RAPTOR_COLS = 30
const RAPTOR_ROWS = 20
const RAPTOR_INK = {
	back: '#8a7a4a',
	lit: '#aa9a62',
	shade: '#62552f',
	belly: '#d9ceA0'.toLowerCase(),
	tuft: '#b8563a',
	claw: '#2b2722',
	eye: '#1d1d1d',
}

/** A velociraptor, facing right: lean, tail straight out behind, a few feathery tufts. */
function raptorFrame(step: number) {
	const T = RAPTOR_INK
	const r: PixelRect[] = []
	const swing = RUN_SWING[step]
	// Its far leg, in the shade, behind the body.
	r.push(
		...runnerLeg(
			17,
			11,
			17 - swing,
			18 - RUN_LIFT_FAR[step],
			2,
			T.shade,
			T.claw,
		),
	)
	// Its tail, out straight, with a tuft at its tip.
	r.push([0, 6, 3, 1, T.tuft], [1, 7, 2, 1, T.tuft])
	r.push([2, 7, 8, 2, T.back], [9, 6, 5, 4, T.back], [2, 7, 8, 1, T.lit])
	// Its body and its neck, forward and a little up.
	r.push(...ellipse(17, 9, 6, 3.5, T.back))
	r.push(...ellipse(17, 8, 5, 1.5, T.lit))
	r.push([13, 11, 8, 1, T.belly])
	r.push([21, 4, 3, 6, T.back], [22, 3, 2, 2, T.lit])
	// Its head: long and low snout, an eye, and a row of teeth.
	r.push([23, 2, 6, 4, T.back], [24, 2, 5, 1, T.lit], [28, 5, 1, 1, T.belly])
	r.push([26, 3, 1, 1, T.eye], [23, 1, 2, 1, T.tuft], [24, 0, 1, 1, T.tuft])
	// Its small arms, folded.
	r.push([22, 9, 2, 2, T.shade], [23, 11, 1, 1, T.claw])
	// Its near leg, over the body, with a claw on its foot.
	r.push(
		...runnerLeg(17, 11, 17 + swing, 18 - RUN_LIFT[step], 2, T.back, T.claw),
	)
	r.push([15, 10, 4, 3, T.back], [15, 10, 4, 1, T.lit])
	return r
}

/** A velociraptor, running past in a pack. */
export const RAPTOR: HerdLook = {
	frames: [0, 1, 2, 3].map((i) =>
		pixelArt(RAPTOR_COLS, RAPTOR_ROWS, raptorFrame(i)),
	),
	width: RAPTOR_COLS * CELL,
	height: RAPTOR_ROWS * CELL,
}

const PARA_COLS = 45
const PARA_ROWS = 35
const PARA = {
	back: '#5f8f6c',
	lit: '#82ad82',
	shade: '#3f6a52',
	belly: '#cdd69c',
	crest: '#d9843c',
	crestShade: '#a85a2a',
	claw: '#2b2722',
	eye: '#1d1d1d',
}

/** A parasaurolophus, facing right: green, a pale belly, its long crest swept back from its head, loping on two legs. */
function parasaurFrame(step: number) {
	const T = PARA
	const r: PixelRect[] = []
	const swing = [4, 0, -4, 0][step]
	const foot = 34
	// Its far leg, in the shade.
	r.push(
		...runnerLeg(
			22,
			22,
			22 - swing,
			foot - RUN_LIFT_FAR[step],
			4,
			T.shade,
			T.claw,
		),
	)
	// Its tail, thick at the hip and tapering, held out behind.
	r.push([0, 17, 6, 2, T.back], [5, 16, 8, 4, T.back], [12, 15, 6, 7, T.back])
	r.push([0, 17, 6, 1, T.lit], [5, 16, 8, 1, T.lit])
	// Its body, big and rounded, and its neck up to its head.
	r.push(...ellipse(24, 19, 10, 7, T.back))
	r.push(...ellipse(24, 16.5, 9, 3.5, T.lit))
	r.push([17, 24, 16, 2, T.belly])
	r.push([30, 8, 6, 12, T.back], [31, 8, 5, 2, T.lit], [31, 17, 5, 3, T.belly])
	// Its head, with a ducklike bill, and the crest back from its brow.
	r.push([33, 5, 8, 6, T.back], [34, 5, 7, 1, T.lit], [40, 8, 5, 4, T.back])
	r.push([41, 11, 4, 1, T.belly], [37, 7, 1, 1, T.eye])
	r.push(...line(35, 4, 27, 0, 2, T.crest))
	r.push(...line(36, 5, 28, 2, 1, T.crestShade))
	r.push([27, 0, 1, 2, T.crestShade])
	// Its short arms.
	r.push([32, 20, 3, 2, T.shade], [34, 22, 1, 1, T.claw])
	// Its near leg, thick, over the body.
	r.push([19, 17, 7, 6, T.back], [19, 17, 7, 1, T.lit])
	r.push(
		...runnerLeg(22, 22, 22 + swing, foot - RUN_LIFT[step], 4, T.back, T.claw),
	)
	return r
}

/** A parasaurolophus, its crest swept back, loping past. */
export const PARASAUR: HerdLook = {
	frames: [0, 1, 2, 3].map((i) =>
		pixelArt(PARA_COLS, PARA_ROWS, parasaurFrame(i)),
	),
	width: PARA_COLS * CELL,
	height: PARA_ROWS * CELL,
}

const YELLOW_COLS = 24
const YELLOW_ROWS = 18
const YELLOW = {
	back: '#f4d630',
	lit: '#fff08a',
	shade: '#d8a81c',
	belly: '#fff6d0',
	stripe: '#e8742a',
	claw: '#2b2722',
	eye: '#1d1d1d',
}

/** A small bright yellow raptor, facing right: a big head, a spotted back and legs going like the clappers. */
function yellowFrame(step: number) {
	const T = YELLOW
	const r: PixelRect[] = []
	const swing = [3, 0, -3, 0][step]
	r.push(
		...runnerLeg(
			10,
			11,
			10 - swing,
			16 - RUN_LIFT_FAR[step],
			2,
			T.shade,
			T.claw,
		),
	)
	// Its tail, kicked up behind.
	r.push([0, 6, 4, 2, T.back], [3, 7, 6, 3, T.back], [0, 5, 2, 1, T.stripe])
	// Its body.
	r.push(...ellipse(11, 9, 5.5, 3.5, T.back))
	r.push(...ellipse(11, 7.5, 4.5, 1.5, T.lit))
	r.push([8, 11, 7, 1, T.belly])
	r.push(
		[9, 6, 1, 2, T.stripe],
		[12, 6, 1, 2, T.stripe],
		[7, 8, 1, 1, T.stripe],
	)
	// Its head, big for its size, an eye and a grin.
	r.push([14, 2, 9, 7, T.back], [15, 1, 6, 1, T.back], [15, 2, 7, 1, T.lit])
	r.push([22, 6, 2, 2, T.back], [16, 8, 7, 1, T.belly])
	r.push([19, 3, 2, 2, T.eye], [20, 3, 1, 1, T.belly])
	r.push([15, 0, 2, 1, T.stripe], [17, 0, 1, 1, T.stripe])
	// Its near leg.
	r.push(
		...runnerLeg(10, 11, 10 + swing, 16 - RUN_LIFT[step], 2, T.back, T.claw),
	)
	r.push([8, 10, 4, 3, T.back], [8, 10, 4, 1, T.lit])
	return r
}

/** A little yellow raptor, running for its life down the volcano: a tribute. */
export const TRIBUTE_RAPTOR: HerdLook = {
	frames: [0, 1, 2, 3].map((i) =>
		pixelArt(YELLOW_COLS, YELLOW_ROWS, yellowFrame(i)),
	),
	width: YELLOW_COLS * CELL,
	height: YELLOW_ROWS * CELL,
}

// --- The nest -----------------------------------------------------------------

const NEST_COLS = 24
const NEST_ROWS = 12
/**
 * A nest, on the path, a dinosaur egg in it, or empty, its egg kicked out
 * of it (see `Course['egg']`). A cell a pixel, at `scale: 2`.
 */
const nest = (withEgg: boolean) => {
	const twig = '#8a6238'
	const twigLit = '#b08650'
	const twigDark = '#5a3e22'
	const egg = '#f3ead2'
	const eggShade = '#d4c6a0'
	const fleck = '#8a7a52'
	const r: PixelRect[] = []
	// Its big egg, speckled, shaded down one side.
	if (withEgg) {
		r.push(...ellipse(12, 5, 5, 5, egg))
		r.push([14, 3, 2, 6, eggShade], [15, 5, 1, 3, eggShade])
		for (const [x, y] of [
			[10, 2],
			[12, 4],
			[9, 6],
			[11, 7],
			[13, 1],
		])
			r.push([x, y, 1, 1, fleck])
	} else {
		// Where it was: a hollow in the twigs, a bit of down in it.
		r.push(...ellipse(12, 7, 6, 2, twigDark))
		r.push([10, 6, 2, 1, '#e8dcc0'], [14, 7, 1, 1, '#e8dcc0'])
	}
	// Its twigs, heaped round the egg's foot.
	r.push(...ellipse(12, 9, 11, 3, twig))
	r.push([2, 7, 20, 1, twigLit])
	r.push(...line(1, 7, 6, 10, 2, twigLit), ...line(22, 7, 17, 10, 2, twigLit))
	r.push(...line(4, 9, 14, 8, 1, twigDark), ...line(9, 10, 20, 9, 1, twigDark))
	r.push([3, 11, 18, 1, twigDark], [0, 6, 2, 1, twig], [22, 6, 2, 1, twig])
	r.push([5, 6, 3, 1, twig], [16, 6, 3, 1, twig])
	return pixelArt(NEST_COLS, NEST_ROWS, r)
}
export const NEST = nest(true)
export const NEST_EMPTY = nest(false)

// --- The egg, and what hatches out of it ------------------------------------------

const EGG_COLOURS = {
	E: '#fff6e0',
	e: '#f2e2c0',
	d: '#d4c49a',
	s: '#a8885a',
	c: '#4a3a2a',
	g: '#5f9a3a',
	G: '#86c050',
	k: '#1d1d1d',
	l: '#e0a43a',
	L: '#b87a24',
}
/** How big the egg is, half across and half its length, in cells; and its picture, square, to turn in. */
const EGG_HALF = { across: 5.5, along: 7.5 }
const EGG_CELLS = 16
/** Its speckles, `[across, along]` from its middle, its narrow end up. */
const EGG_SPECKLES: [number, number][] = [
	[-2, -4],
	[1.5, -2],
	[-1, 1],
	[2.5, 2.5],
	[-3, 3.5],
	[0.5, 5],
]
/** Its cracks, more of them the more it's been kicked: lines of cells, `[across, along]` from its middle. */
const EGG_CRACKS: [number, number][][] = [
	[],
	[
		[0, -6],
		[-0.6, -5],
		[0.4, -4],
		[-0.4, -3],
	],
	[
		[1.2, -2.5],
		[2, -1.5],
		[1.4, -0.5],
		[-1.2, -2.5],
		[-2.2, -1.8],
	],
	[
		[2.4, 0.5],
		[3.2, 1.2],
		[-2.6, -0.8],
		[-3.4, 0],
		[-2.8, 1],
		[0.6, 0.6],
	],
]
/** How many ways round it's drawn, turning, a frame each. */
export const EGG_TURNS = 8

/**
 * The egg at `stage` of cracking, turned `turn` eighths round, kicked
 * along tumbling end over end: a tall egg, its narrow end up when it's
 * upright, speckled; lit on its top left and shaded on its bottom right
 * whichever way up it is, the light being where it is; its speckles and
 * cracks going round with it.
 */
function eggPicture(stage: number, turn: number) {
	const angle = (turn / EGG_TURNS) * Math.PI * 2
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	const mid = EGG_CELLS / 2
	/** Where a cell is on the egg itself, turned back: across it, and along it, up its narrow end. */
	const onEgg = (x: number, y: number) => {
		const dx = x - mid
		const dy = y - mid
		return { across: dx * cos + dy * sin, along: -dx * sin + dy * cos }
	}
	/** Whether a cell's on the egg: narrower at its top, as an egg is. */
	const inside = (x: number, y: number) => {
		const { across, along } = onEgg(x, y)
		const narrow = along < 0 ? 1 + (along / EGG_HALF.along) * 0.22 : 1
		return (
			(across / (EGG_HALF.across * narrow)) ** 2 +
				(along / EGG_HALF.along) ** 2 <=
			1
		)
	}
	const marks = (list: [number, number][]) =>
		list.map(([a, l]) => ({
			x: Math.floor(mid + a * cos - l * sin),
			y: Math.floor(mid + a * sin + l * cos),
		}))
	const speckles = marks(EGG_SPECKLES)
	const cracks = marks(EGG_CRACKS.slice(0, stage + 1).flat())
	return paintedArt(EGG_CELLS, EGG_CELLS, (x, y) => {
		if (!inside(x, y)) return undefined
		const cx = Math.floor(x)
		const cy = Math.floor(y)
		if (cracks.some((c) => c.x === cx && c.y === cy)) return EGG_COLOURS.c
		if (!inside(x - 1.5, y - 1.5)) return EGG_COLOURS.E
		if (!inside(x + 1.5, y + 1.5)) return EGG_COLOURS.d
		if (speckles.some((c) => c.x === cx && c.y === cy)) return EGG_COLOURS.s
		return EGG_COLOURS.e
	})
}

/**
 * The egg, kicked along the path, tumbling end over end and cracking: for
 * each of its four stages of it, more cracked each time, all over by the
 * last, every way round it turns. At `scale: 2`, `EGG_SIZE`.
 */
export const EGG_TUMBLE = EGG_CRACKS.map((_, stage) =>
	Array.from({ length: EGG_TURNS }, (_, turn) => eggPicture(stage, turn)),
)
export const EGG_SIZE = { width: EGG_CELLS * 2, height: EGG_CELLS * 2 }
/**
 * How far down from its middle its bottom is, turned `turn` eighths round,
 * in screen px: to sit it on the ground, tall or on its side.
 */
export const eggBottom = (turn: number) => {
	const angle = (turn / EGG_TURNS) * Math.PI * 2
	return Math.round(
		Math.hypot(
			EGG_HALF.across * Math.sin(angle),
			EGG_HALF.along * Math.cos(angle),
		) * 2,
	)
}

/**
 * What hatches out of it, a hatchling: still in its shell, its top broken
 * off, its little green head poking up out of it, an eye; and two legs out
 * of its bottom, running, a frame apart, then together. Faces right, the
 * way it runs. 12 by 16 cells, at `scale: 2`.
 */
const HATCHLING_TOP = [
	'.....gg.....',
	'....gGgg....',
	'....gGgkg...',
	'....ggggggg.',
	'.e.eegggeE..',
	'eEeEEeeeeEe.',
	'eEEeeeseeed.',
	'eEeeseeeeed.',
	'eeeeeeeesed.',
	'esceeeeeeed.',
	'eeecceeeedd.',
	'.eeeeeeced..',
	'..dddddddd..',
]
const HATCHLING_LEGS = [
	['..l.....l...', '.L.......l..', 'LL.......ll.'],
	['....l..l....', '....L..l....', '...LL..ll...'],
]
export const HATCHLING = {
	frames: HATCHLING_LEGS.map((legs) =>
		letterArt([...HATCHLING_TOP, ...legs], EGG_COLOURS),
	),
	width: 24,
	height: 32,
}

// --- What grows ---------------------------------------------------------------

const LEAF = '#4f8a36'
const LEAF_LIT = '#78b04a'
const LEAF_DARK = '#33652a'
const BARK = '#7a5a3a'
const BARK_LIT = '#a07c54'
const BARK_DARK = '#54391f'

/** A frond: a stalk from `x0`, `y0` out to `x1`, `y1`, with a lit edge above it. */
function frond(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	thick = 2,
): PixelRect[] {
	return [
		...line(x0, y0 + 1, x1, y1 + 1, thick, LEAF_DARK),
		...line(x0, y0, x1, y1, thick, LEAF),
		...line(x0 + 1, y0 - 1, x1, y1 - 1, 1, LEAF_LIT),
	]
}

/**
 * What grows in the forest, by the path: a cycad, stumpy, in a crown of
 * stiff fronds; a tree fern, tall, its fronds drooping from the top; a fern
 * clump; and horsetails, jointed stems with their whorls. A cell a pixel,
 * at `scale: 2`.
 */
export const FLORA: string[] = [
	// A cycad.
	(() => {
		const r: PixelRect[] = []
		r.push(...ellipse(15, 40, 6, 11, BARK), [10, 44, 3, 6, BARK_DARK])
		r.push(
			[13, 32, 4, 2, BARK_LIT],
			[11, 38, 3, 1, BARK_LIT],
			[15, 44, 3, 1, BARK_LIT],
		)
		r.push([20, 44, 2, 1, BARK_DARK], [11, 36, 3, 1, BARK_DARK])
		r.push(...frond(15, 31, 2, 24, 3), ...frond(15, 31, 28, 24, 3))
		r.push(...frond(15, 31, 4, 16, 3), ...frond(15, 31, 26, 16, 3))
		r.push(...frond(15, 31, 8, 8, 3), ...frond(15, 31, 22, 8, 3))
		r.push(...frond(15, 31, 15, 5, 3))
		r.push([2, 24, 2, 5, LEAF], [27, 24, 2, 5, LEAF])
		return pixelArt(30, 50, r)
	})(),
	// A tree fern.
	(() => {
		const r: PixelRect[] = []
		r.push(
			[18, 24, 5, 46, BARK],
			[18, 24, 2, 46, BARK_LIT],
			[22, 24, 1, 46, BARK_DARK],
		)
		for (let y = 28; y < 68; y += 4) r.push([18, y, 5, 1, BARK_DARK])
		r.push([15, 66, 11, 4, BARK_DARK], [16, 64, 9, 2, BARK])
		r.push(...frond(20, 22, 2, 28, 3), ...frond(20, 22, 38, 28, 3))
		r.push(...frond(20, 22, 4, 12, 3), ...frond(20, 22, 36, 12, 3))
		r.push(...frond(20, 22, 10, 5, 3), ...frond(20, 22, 30, 5, 3))
		r.push(...frond(20, 22, 20, 2, 3))
		r.push([1, 28, 2, 8, LEAF_DARK], [38, 28, 2, 8, LEAF_DARK])
		r.push([3, 20, 2, 5, LEAF], [35, 20, 2, 5, LEAF])
		return pixelArt(40, 70, r)
	})(),
	// A fern clump.
	(() => {
		const r: PixelRect[] = []
		r.push(...frond(12, 18, 1, 12, 2), ...frond(12, 18, 23, 12, 2))
		r.push(...frond(12, 18, 3, 5, 2), ...frond(12, 18, 21, 5, 2))
		r.push(...frond(12, 18, 12, 1, 2), ...frond(12, 18, 7, 2, 2))
		r.push(...frond(12, 18, 17, 2, 2))
		r.push([8, 17, 8, 3, LEAF_DARK], [10, 16, 4, 2, LEAF])
		return pixelArt(24, 20, r)
	})(),
	// Horsetails.
	(() => {
		const r: PixelRect[] = []
		for (const [x, top] of [
			[3, 4],
			[7, 0],
			[10, 8],
		]) {
			r.push([x, top, 2, 24 - top, LEAF], [x, top, 1, 24 - top, LEAF_LIT])
			r.push([x + 1, top, 1, 24 - top, LEAF_DARK])
			for (let y = top + 4; y < 22; y += 5)
				r.push([x - 1, y, 4, 1, LEAF_DARK], [x - 2, y + 1, 6, 1, LEAF])
			r.push([x, top - 1, 2, 1, LEAF_LIT])
		}
		return pixelArt(14, 24, r)
	})(),
]

// --- Burnt trees --------------------------------------------------------------

const CHAR = '#3a2f29'
const CHAR_LIT = '#554439'
const CHAR_DARK = '#221a17'

/**
 * Trees burnt bare, up the volcano's flanks and down its far side: gaunt
 * charred trunks, snapped to a spike at the top and a few broken twiggy
 * limbs. Mostly seen black against the red sky, so it's the outline that
 * has to read. A cell a pixel, at `scale: 2`.
 */
export const DEAD_TREES: string[] = [
	(() => {
		const r: PixelRect[] = []
		// Trunk: wide at its foot, tapering to a splintered top.
		r.push([11, 50, 9, 10, CHAR], [12, 40, 7, 10, CHAR], [13, 24, 5, 16, CHAR])
		r.push([14, 12, 3, 12, CHAR], [15, 5, 2, 7, CHAR], [15, 2, 1, 3, CHAR])
		r.push(
			[11, 50, 2, 10, CHAR_LIT],
			[12, 40, 1, 10, CHAR_LIT],
			[13, 24, 1, 16, CHAR_LIT],
		)
		r.push([18, 52, 2, 8, CHAR_DARK], [17, 30, 1, 10, CHAR_DARK])
		// Root flare.
		r.push([8, 57, 4, 3, CHAR], [19, 57, 4, 3, CHAR])
		// Broken limbs, short and angled up, one snapped off, one forked.
		r.push(...line(13, 44, 4, 38, 2, CHAR), ...line(4, 38, 2, 30, 1, CHAR))
		r.push(...line(18, 36, 27, 30, 2, CHAR), ...line(25, 31, 29, 24, 1, CHAR), [
			24,
			26,
			1,
			5,
			CHAR,
		])
		r.push(...line(14, 26, 7, 21, 2, CHAR), [7, 15, 1, 6, CHAR])
		r.push(...line(17, 18, 22, 13, 1, CHAR))
		return pixelArt(30, 60, r)
	})(),
	(() => {
		const r: PixelRect[] = []
		r.push([9, 38, 7, 8, CHAR], [10, 28, 5, 10, CHAR], [11, 16, 3, 12, CHAR])
		r.push([11, 8, 2, 8, CHAR], [12, 1, 1, 7, CHAR])
		r.push([9, 38, 2, 8, CHAR_LIT], [10, 28, 1, 10, CHAR_LIT])
		r.push([14, 40, 2, 6, CHAR_DARK])
		r.push([6, 43, 4, 3, CHAR], [15, 43, 4, 3, CHAR])
		r.push(...line(10, 32, 2, 26, 2, CHAR), [2, 22, 1, 4, CHAR])
		r.push(
			...line(14, 24, 21, 18, 2, CHAR),
			[21, 12, 1, 6, CHAR],
			[18, 16, 1, 3, CHAR],
		)
		r.push(...line(11, 14, 6, 9, 1, CHAR))
		return pixelArt(24, 46, r)
	})(),
]

// --- Pterodactyls -------------------------------------------------------------

const PTERO = { d: '#5b4a5e', k: '#3b2f40' }

/**
 * Pterodactyls far off, crossing the sky behind everything (see
 * `SkyFlyer`): a sheet of `frames` side by side, each `width` by `height`.
 * Flying left, long beak first and crest trailing: wings up, then down,
 * its body in the same place in both, so it flaps rather than jumps.
 */
export const PTERODACTYL_FAR = {
	asset: letterArt(
		[
			'...........d....................',
			'..........dd....................',
			'.........ddd....................',
			'.....d..dddd.........d..........',
			'...ddkddddd........ddkddd.......',
			'ddddddddddddd...ddddddddddddd...',
			'.......dddd.dd.........ddddd.dd.',
			'........d.d.............dddd....',
			'.........................ddd....',
			'..........................dd....',
		],
		PTERO,
	),
	width: 16,
	height: 10,
	frames: 2,
}

// --- More that grows ----------------------------------------------------------

const NEEDLE = '#3f7a46'
const NEEDLE_LIT = '#68a85a'
const NEEDLE_DARK = '#28543a'
const GOLD = '#b9b83a'
const GOLD_LIT = '#e0d85c'
const GOLD_DARK = '#8a9030'
const FALL = '#e8c43c'
const CONE = '#d9532f'
const CONE_LIT = '#f58a4a'
const CONE_DARK = '#9a3322'
const MOSS = '#5f9a3c'
const MOSS_LIT = '#8cc454'
const MOSS_DARK = '#3f6e2c'
const LOG = '#6e5236'
const LOG_LIT = '#946e48'
const LOG_DARK = '#4a331f'
const LOG_END = '#c9a672'
const LOG_RING = '#9a7a4c'

/**
 * An arm of a monkey-puzzle's: a thick scaly limb out from the trunk at
 * `x`, `y`, `dir` ways (-1 left, 1 right), `len` cells and sagging `sag`
 * before its tip turns up, spiky leaves all along it.
 */
function puzzleArm(
	x: number,
	y: number,
	dir: -1 | 1,
	len: number,
	sag: number,
) {
	const r: PixelRect[] = []
	const tipX = x + dir * len
	r.push(...line(x, y + 1, tipX, y + sag + 1, 3, NEEDLE_DARK))
	r.push(...line(x, y, tipX, y + sag, 3, NEEDLE))
	// Its tip turns up.
	r.push([tipX - (dir < 0 ? 0 : 1), y + sag - 3, 2, 4, NEEDLE])
	// Spiky leaves standing off it, a lit one every other cell.
	for (let i = 2; i < len; i += 2) {
		const sx = x + dir * i
		const sy = y + Math.round((sag * i) / len)
		r.push(
			[sx, sy - 2, 1, 2, NEEDLE_LIT],
			[sx + dir, sy + 3, 1, 1, NEEDLE_DARK],
		)
	}
	r.push([tipX, y + sag - 4, 1, 1, NEEDLE_LIT])
	return r
}

/**
 * What else grows, to break up the forest: a monkey-puzzle tree, tall and
 * bare-trunked, tiers of spiky arms up its crown; a ginkgo, its fan leaves
 * gold-green, a few fallen; a clump of giant horsetails; a cycad in cone,
 * a big orange-red one in its crown; a tree-fern sapling; and a mossy
 * fallen log. A cell a pixel, at `scale: 2`.
 */
export const FLORA_MORE: string[] = [
	// A monkey-puzzle tree (araucaria): 40 by 90.
	(() => {
		const r: PixelRect[] = []
		// Its trunk, straight and scaly, a flare at its foot.
		r.push(
			[18, 8, 5, 82, BARK],
			[18, 8, 2, 82, BARK_LIT],
			[22, 8, 1, 82, BARK_DARK],
		)
		for (let y = 12; y < 86; y += 3) r.push([18, y, 5, 1, BARK_DARK])
		r.push(
			[15, 85, 11, 5, BARK],
			[15, 85, 3, 5, BARK_LIT],
			[24, 87, 2, 3, BARK_DARK],
		)
		// Its tiers of arms, longer the lower they are, the lowest drooping.
		const tiers: [number, number, number][] = [
			[58, 17, 5],
			[46, 15, 4],
			[35, 13, 4],
			[25, 10, 3],
			[16, 7, 3],
		]
		for (const [y, len, sag] of tiers) {
			r.push(
				...puzzleArm(19, y, -1, len, sag),
				...puzzleArm(21, y, 1, len, sag),
			)
			r.push(
				...puzzleArm(19, y - 5, -1, len - 4, sag),
				...puzzleArm(21, y - 5, 1, len - 4, sag),
			)
		}
		// Its crown, a spiky tuft.
		r.push(...ellipse(20, 6, 5, 4, NEEDLE), ...ellipse(20, 4, 3, 2, NEEDLE_LIT))
		r.push(
			[20, 0, 1, 3, NEEDLE_LIT],
			[16, 3, 1, 2, NEEDLE_LIT],
			[24, 3, 1, 2, NEEDLE_LIT],
		)
		return pixelArt(40, 90, r)
	})(),
	// A ginkgo: 36 by 60.
	(() => {
		const r: PixelRect[] = []
		// Its trunk, forking into limbs under the crown.
		r.push(
			[16, 30, 5, 30, BARK],
			[16, 30, 2, 30, BARK_LIT],
			[20, 32, 1, 28, BARK_DARK],
		)
		r.push([13, 57, 11, 3, BARK_DARK], [14, 55, 9, 2, BARK])
		r.push(...line(17, 36, 8, 24, 2, BARK), ...line(20, 36, 28, 22, 2, BARK))
		// Its crown, a heap of lobes: shade under, gold-green on top, lit along the tops.
		const lobes: [number, number, number, number][] = [
			[18, 16, 13, 10],
			[9, 22, 8, 7],
			[27, 21, 8, 7],
			[18, 8, 8, 6],
		]
		for (const [x, y, rx, ry] of lobes)
			r.push(...ellipse(x, y + 2, rx, ry, GOLD_DARK))
		for (const [x, y, rx, ry] of lobes) r.push(...ellipse(x, y, rx, ry, GOLD))
		for (const [x, y, rx, ry] of lobes)
			r.push(...ellipse(x - 1, y - ry / 2, rx - 3, ry / 3, GOLD_LIT))
		// Fan leaves showing at its edge: a notched fringe of gold.
		for (const [x, y] of [
			[4, 18],
			[7, 27],
			[30, 26],
			[33, 19],
			[11, 6],
			[26, 5],
			[18, 0],
		])
			r.push([x, y, 3, 2, FALL], [x + 1, y + 2, 1, 1, FALL])
		// Notches and veins, dark flecks in the leaves.
		for (const [x, y] of [
			[12, 14],
			[20, 12],
			[16, 20],
			[26, 16],
			[9, 21],
			[23, 24],
			[18, 5],
		])
			r.push([x, y, 1, 2, GOLD_DARK])
		// Fallen gold at its foot.
		r.push([6, 58, 3, 2, FALL], [26, 57, 4, 3, FALL], [31, 59, 2, 1, FALL])
		return pixelArt(36, 60, r)
	})(),
	// A clump of giant horsetails: 22 by 44.
	(() => {
		const r: PixelRect[] = []
		for (const [x, top] of [
			[3, 14],
			[7, 4],
			[11, 0],
			[15, 8],
			[18, 18],
		]) {
			const h = 44 - top
			r.push(
				[x, top, 3, h, LEAF],
				[x, top, 1, h, LEAF_LIT],
				[x + 2, top, 1, h, LEAF_DARK],
			)
			// Whorls of needles at each joint, wider the lower down.
			for (let y = top + 5; y < 42; y += 6) {
				r.push([x - 2, y, 7, 1, LEAF_DARK], [x - 3, y + 1, 9, 1, LEAF])
				r.push([x - 1, y - 1, 5, 1, LEAF_LIT])
			}
			r.push([x, top - 2, 3, 2, LEAF_LIT], [x + 1, top - 3, 1, 1, LEAF_LIT])
		}
		r.push([1, 42, 20, 2, LEAF_DARK])
		return pixelArt(22, 44, r)
	})(),
	// A cycad in cone: 30 by 40.
	(() => {
		const r: PixelRect[] = []
		// Its stump of a trunk, scaly.
		r.push(...ellipse(15, 33, 7, 8, BARK), [9, 36, 3, 4, BARK_DARK])
		r.push(
			[11, 27, 4, 2, BARK_LIT],
			[10, 32, 3, 1, BARK_LIT],
			[17, 31, 3, 1, BARK_DARK],
			[18, 36, 3, 1, BARK_DARK],
		)
		// Its fronds, out and up from its crown, round the cone.
		r.push(...frond(15, 25, 2, 21, 3), ...frond(15, 25, 28, 21, 3))
		r.push(...frond(15, 25, 3, 12, 3), ...frond(15, 25, 27, 12, 3))
		r.push(...frond(15, 25, 8, 5, 3), ...frond(15, 25, 22, 5, 3))
		// Its cone, big and orange-red, scaled, lit on its left.
		r.push(
			...ellipse(15, 15, 5, 10, CONE_DARK),
			...ellipse(14.5, 15, 4.5, 9.5, CONE),
		)
		r.push([11, 8, 2, 8, CONE_LIT], [14, 3, 2, 2, CONE_LIT])
		for (let y = 7; y < 24; y += 3) r.push([11, y, 8, 1, CONE_DARK])
		for (let y = 8; y < 24; y += 3)
			r.push([12, y, 1, 1, CONE_LIT], [15, y, 1, 1, CONE_LIT])
		return pixelArt(30, 40, r)
	})(),
	// A tree-fern sapling: 16 by 24.
	(() => {
		const r: PixelRect[] = []
		r.push(
			[7, 12, 3, 12, BARK],
			[7, 12, 1, 12, BARK_LIT],
			[9, 12, 1, 12, BARK_DARK],
		)
		r.push([6, 21, 5, 3, BARK_DARK], [7, 16, 3, 1, BARK_DARK])
		r.push(...frond(8, 11, 1, 14, 2), ...frond(8, 11, 15, 14, 2))
		r.push(...frond(8, 11, 2, 6, 2), ...frond(8, 11, 14, 6, 2))
		r.push(...frond(8, 11, 8, 1, 2))
		return pixelArt(16, 24, r)
	})(),
	// A mossy fallen log: 40 by 12.
	(() => {
		const r: PixelRect[] = []
		// Its length, lit along the top, dark under.
		r.push(
			[5, 2, 33, 9, LOG],
			[6, 11, 31, 1, LOG_DARK],
			[5, 9, 33, 2, LOG_DARK],
		)
		r.push([6, 2, 31, 1, LOG_LIT], [8, 3, 12, 1, LOG_LIT])
		// Bark furrows along it.
		r.push(
			[14, 5, 8, 1, LOG_DARK],
			[26, 6, 9, 1, LOG_DARK],
			[10, 7, 6, 1, LOG_DARK],
		)
		// Its cut end, ringed, at the left.
		r.push(
			...ellipse(5, 6.5, 4, 5, LOG_END),
			...ellipse(5, 6.5, 2.5, 3, LOG_RING),
		)
		r.push([4, 5, 2, 3, LOG_END], [1, 8, 2, 2, LOG_DARK])
		// A snapped limb stub, and a root-end at the right.
		r.push([30, 0, 3, 3, LOG], [30, 0, 3, 1, LOG_LIT], [36, 8, 4, 3, LOG_DARK])
		// Moss on its back and down its far end.
		r.push(
			[14, 1, 12, 2, MOSS],
			[16, 0, 7, 1, MOSS_LIT],
			[27, 2, 7, 1, MOSS],
			[12, 2, 3, 1, MOSS_DARK],
		)
		r.push(
			[20, 3, 3, 1, MOSS_DARK],
			[34, 3, 4, 3, MOSS],
			[35, 3, 2, 1, MOSS_LIT],
			[8, 9, 5, 2, MOSS_DARK],
		)
		return pixelArt(40, 12, r)
	})(),
]
