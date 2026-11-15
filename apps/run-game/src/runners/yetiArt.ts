import { type PixelRect, pixelArt } from '../courses/kit/pixelArt'
import { RUNNER_SCALE } from '../game/constants'
import type { Playable } from './playable'

/**
 * The Yeti, as a runner: a bonus one, unlocked by finding the Yeti under
 * Everest. Drawn in code, a pixel a cell, facing left, as everyone's PNGs
 * are, in every pose anyone has. Big, hunched and friendly: shaggy white
 * fur, lit along its top, lavender down its back and under its belly so it
 * holds up against the sky, tufts sticking out of it, a hump of shoulders
 * behind its head, a pale blue face under its fringe with one dark eye and
 * a grin with a tooth hanging over its lip, pale blue hands, and big flat
 * feet with pale blue soles. Its far arm and leg are in shadow, behind it.
 */

const LIT = '#ffffff'
const FUR = '#e2e8f3'
/** Its fur in shadow: down its back, under its belly, its far arm and leg. */
const SHADE = '#a9b1da'
/** The undersides of its far hand. */
const DEEP = '#7f88c0'
/** Its face, hands and soles, pale blue, as a yeti's are. */
const SKIN = '#8fb6e4'
const SKIN_SHADE = '#6a8fc9'
const INK = '#1d1d1d'
/** Its ski poles, as everyone's are: the far one in shadow. */
const POLE = '#9aa3ad'
const POLE_SHADE = '#6c747e'

/** Moved `dx` across and `dy` down. */
const at = (dx: number, dy: number, rects: PixelRect[]): PixelRect[] =>
	rects.map(([x, y, w, h, fill]) => [x + dx, y + dy, w, h, fill])

/**
 * Its head, 7 cells across, from `x`, `y`: a tuft on top, its shaggy
 * fringe over a pale blue face, one dark eye, and a grin turned up at its
 * corner, a tooth hanging over its lip.
 */
const head = (x: number, y: number): PixelRect[] =>
	at(x, y, [
		// Its tuft, and the top of its head, catching the light.
		[2, 0, 3, 1, LIT],
		[1, 1, 5, 1, LIT],
		// Its head, shaggy, its fringe hanging over its brow, the back of
		// it in shadow.
		[0, 2, 6, 4, FUR],
		[6, 2, 1, 3, SHADE],
		[4, 6, 2, 1, FUR],
		// Its face, pale blue under its fringe, its chin in shadow.
		[0, 3, 4, 3, SKIN],
		[2, 6, 2, 1, SKIN_SHADE],
		// An eye, and its grin, the tooth over its lip.
		[1, 3, 1, 1, INK],
		[0, 5, 3, 1, INK],
		[3, 4, 1, 1, INK],
		[1, 6, 1, 1, LIT],
	])

/**
 * The hump of its shoulders, behind its head, from `x`, `y` (its lit top):
 * 6 cells across and 4 down, shaded down its back.
 */
const hump = (x: number, y: number): PixelRect[] =>
	at(x, y, [
		[1, 0, 3, 1, LIT],
		[0, 1, 1, 1, LIT],
		[1, 1, 3, 3, FUR],
		[0, 2, 1, 2, FUR],
		[4, 1, 1, 3, SHADE],
		[5, 2, 1, 2, SHADE],
	])

/**
 * Its body upright, as it stands and runs: its head, the hump behind it,
 * its body, shaggy, a tuft or two sticking out front and back, its far side
 * in shadow, down to its round belly and the ragged fur at its hem.
 */
const body: PixelRect[] = [
	...hump(12, 2),
	// Its body, its far side in shadow.
	[9, 5, 6, 2, FUR],
	[5, 7, 10, 1, FUR],
	[4, 8, 11, 8, FUR],
	[15, 6, 3, 11, SHADE],
	[16, 5, 2, 1, SHADE],
	// Tufts sticking out of its chest and its back.
	[3, 10, 1, 1, FUR],
	[3, 13, 1, 1, FUR],
	[18, 9, 1, 1, SHADE],
	[18, 13, 1, 1, SHADE],
	// Its belly, round, in shadow underneath, and the ragged fur at its hem.
	[14, 15, 1, 1, SHADE],
	[5, 16, 7, 1, FUR],
	[12, 16, 3, 1, SHADE],
	[5, 17, 12, 1, SHADE],
	[7, 17, 3, 1, FUR],
	[6, 18, 11, 1, SHADE],
	[7, 19, 1, 1, SHADE],
	[9, 19, 2, 1, SHADE],
	[12, 19, 2, 1, SHADE],
	[15, 19, 1, 1, SHADE],
	...head(5, 0),
]

/** A pale blue hand, `w` cells across, from `x`, `y`, in shadow underneath. */
const hand = (x: number, y: number, near = true, w = 3): PixelRect[] => [
	[x, y, w, 2, near ? SKIN : SKIN_SHADE],
	[x, y + 2, w, 1, near ? SKIN_SHADE : DEEP],
]

/** A big flat foot, its toes at `x`, its pale blue sole along row `y + 1`. */
const foot = (x: number, y: number, near = true): PixelRect[] => [
	[x + 1, y, 4, 1, near ? FUR : SHADE],
	[x, y + 1, 6, 1, near ? SKIN : SKIN_SHADE],
]

/** Its arms halfway through a swing: the near one bent forward, the far one hanging back. */
const armsSwinging: PixelRect[] = [
	// Its far arm, hanging back behind it.
	[18, 8, 2, 8, SHADE],
	...hand(17, 16, false),
	// Its near arm, coming through, bent, its shadow on its body.
	[10, 8, 1, 6, SHADE],
	[9, 14, 2, 1, SHADE],
	[8, 15, 2, 1, SHADE],
	[3, 15, 1, 1, FUR],
	[6, 16, 2, 1, FUR],
	[8, 16, 1, 1, SHADE],
	[6, 17, 3, 1, SHADE],
	...hand(3, 16),
]

// --- Running ----------------------------------------------------------------

/**
 * Its run, a stride in four frames, played in order: a foot coming down out
 * in front, the other kicked up behind; under it, the other tucked up
 * behind (shown in the air, for a jump); pushing off from behind, the other
 * knee coming through; and up off the ground, a foot reaching out in front
 * again. Its arms swing back and forth across it.
 */
const RUN_FRAMES: PixelRect[][] = [
	// A foot coming down out in front, the other kicked up behind.
	[
		// Its far arm, swung forward, behind it.
		[2, 9, 3, 1, SHADE],
		[1, 10, 3, 1, SHADE],
		...hand(0, 11, false),
		...body,
		// Its near arm, swung back across it, its shadow under it.
		[12, 9, 4, 2, FUR],
		[13, 11, 4, 1, FUR],
		[15, 12, 4, 1, FUR],
		[16, 13, 3, 1, FUR],
		[10, 10, 1, 1, SHADE],
		[11, 11, 2, 1, SHADE],
		[13, 12, 2, 1, SHADE],
		[15, 13, 1, 1, SHADE],
		[16, 14, 3, 1, SHADE],
		...hand(19, 13, true, 2),
		// Its back leg, kicked up behind, the sole of its foot turned up.
		[9, 19, 6, 1, SHADE],
		[12, 20, 5, 1, SHADE],
		[14, 21, 5, 1, SHADE],
		[16, 22, 3, 1, SHADE],
		[19, 20, 1, 3, SKIN_SHADE],
		// Its front leg, out in front, its foot coming down.
		[6, 19, 3, 1, FUR],
		[6, 20, 4, 1, FUR],
		[10, 20, 1, 1, SHADE],
		[5, 21, 4, 1, FUR],
		[9, 21, 1, 1, SHADE],
		[5, 22, 3, 1, FUR],
		[8, 22, 1, 1, SHADE],
		[4, 23, 3, 2, FUR],
		[7, 23, 1, 2, SHADE],
		[3, 25, 3, 1, FUR],
		[6, 25, 1, 2, SHADE],
		[2, 26, 4, 1, FUR],
		...foot(0, 27),
	],
	// The other passing under it, tucked up behind.
	[
		...body,
		...armsSwinging,
		// Its back leg, tucked up behind, the sole of its foot turned up.
		[11, 20, 4, 1, SHADE],
		[12, 21, 7, 1, SHADE],
		[14, 22, 5, 1, SHADE],
		[16, 23, 3, 1, SHADE],
		[19, 20, 1, 3, SKIN_SHADE],
		// Its front leg, straight down under it.
		[7, 20, 3, 7, FUR],
		[10, 20, 1, 8, SHADE],
		...foot(5, 27),
	],
	// Pushing off from behind, the other knee coming through.
	[
		// Its far arm, swung back, behind it.
		[18, 9, 2, 2, SHADE],
		[20, 10, 1, 1, SHADE],
		[19, 11, 3, 1, SHADE],
		...hand(21, 12, false, 2),
		...body,
		// Its near arm, swung forward, its shadow under it.
		[1, 11, 8, 1, FUR],
		[3, 12, 3, 1, FUR],
		[9, 11, 1, 1, SHADE],
		[6, 12, 3, 1, SHADE],
		[4, 13, 2, 1, SHADE],
		...hand(0, 12),
		// Its other leg, its knee up in front, its foot hanging.
		[5, 19, 3, 1, SHADE],
		[4, 20, 5, 1, SHADE],
		[3, 21, 4, 1, SHADE],
		[3, 22, 3, 2, SHADE],
		...foot(1, 24, false),
		// Its back leg, pushing off from behind.
		[9, 19, 3, 2, FUR],
		[12, 19, 1, 2, SHADE],
		[10, 21, 3, 2, FUR],
		[13, 21, 1, 2, SHADE],
		[11, 23, 3, 2, FUR],
		[14, 23, 1, 2, SHADE],
		[12, 25, 3, 2, FUR],
		[15, 25, 1, 3, SHADE],
		...foot(11, 27),
	],
	// Up off the ground, a foot reaching out in front.
	[
		...body,
		...armsSwinging,
		// Its back leg, trailing out behind, the sole of its foot turned up.
		[10, 20, 6, 1, SHADE],
		[12, 21, 6, 1, SHADE],
		[15, 22, 5, 1, SHADE],
		[18, 23, 2, 2, SHADE],
		[20, 22, 1, 4, SKIN_SHADE],
		// Its front leg, reaching out in front.
		[6, 20, 3, 1, FUR],
		[5, 21, 4, 1, FUR],
		[9, 21, 1, 1, SHADE],
		[4, 22, 4, 1, FUR],
		[8, 22, 1, 1, SHADE],
		[3, 23, 4, 1, FUR],
		[7, 23, 1, 1, SHADE],
		[2, 24, 4, 2, FUR],
		[6, 24, 1, 2, SHADE],
		...foot(0, 26),
	],
]

/** How wide a run frame is, and how many there are. */
const FRAME = 23
const FRAMES = RUN_FRAMES.length

/**
 * Its run, as one strip, its frames side by side, as a member's run PNG
 * is: so it plays anywhere a strip's slid along to animate it (see
 * `RunStrip`). Each frame's kept to its own cells of it.
 */
const RUN_STRIP = pixelArt(
	FRAME * FRAMES,
	29,
	RUN_FRAMES.flatMap((rects, n) =>
		rects.flatMap(([x, y, w, h, fill]): PixelRect[] => {
			const from = Math.max(0, x)
			const to = Math.min(FRAME, x + w)
			return to > from ? [[from + FRAME * n, y, to - from, h, fill]] : []
		}),
	),
)

/** Each frame: the strip, slid along to it, as the engine takes it (see `SKELETON_SPRITE`). */
const run = RUN_FRAMES.map(
	(_, n) => `${RUN_STRIP}#${-FRAME * RUNNER_SCALE * n},0,${FRAME * FRAMES},29`,
)

// --- Stood still ------------------------------------------------------------

/** Stood up, its arms hanging, its feet flat. */
const stand = pixelArt(23, 29, [
	...body,
	// Its far arm, hanging behind it.
	[16, 7, 3, 9, SHADE],
	...hand(16, 16, false),
	// Its near arm, hanging down its front, its shadow on its body.
	[10, 8, 1, 7, SHADE],
	[9, 15, 2, 2, SHADE],
	[5, 17, 1, 1, SHADE],
	...hand(6, 16),
	// Its legs, short and thick.
	[12, 20, 4, 7, SHADE],
	...foot(11, 27, false),
	[6, 20, 3, 7, FUR],
	[9, 20, 1, 8, SHADE],
	...foot(4, 27),
])

// --- Sat down ---------------------------------------------------------------

/** Crouched down low over its knees, its hand on the ground: how it ducks. */
const sit = pixelArt(21, 28, [
	...hump(11, 12),
	// Its body, hunched over its knees, its back in shadow.
	[8, 15, 7, 2, FUR],
	[4, 17, 11, 1, FUR],
	[8, 18, 8, 6, FUR],
	[16, 20, 1, 3, FUR],
	[7, 22, 1, 2, FUR],
	[15, 15, 3, 2, SHADE],
	[15, 17, 4, 1, SHADE],
	[16, 18, 3, 2, SHADE],
	[19, 19, 1, 1, SHADE],
	[17, 20, 3, 1, SHADE],
	[17, 21, 4, 1, SHADE],
	[17, 22, 3, 1, SHADE],
	[16, 23, 4, 1, SHADE],
	[15, 24, 4, 1, SHADE],
	[7, 24, 2, 1, SHADE],
	[8, 25, 10, 1, SHADE],
	...head(4, 10),
	// Its near arm, down to the ground in front, its shadow on its body.
	[3, 18, 5, 1, FUR],
	[8, 18, 1, 1, SHADE],
	[2, 19, 5, 1, FUR],
	[7, 19, 2, 1, SHADE],
	[2, 20, 4, 1, FUR],
	[6, 20, 2, 1, SHADE],
	[1, 21, 4, 2, FUR],
	[5, 21, 2, 1, SHADE],
	[5, 22, 1, 1, SHADE],
	[1, 23, 3, 1, FUR],
	[4, 23, 1, 1, SHADE],
	[0, 24, 3, 2, FUR],
	[3, 24, 1, 2, SHADE],
	...hand(0, 25),
	// Its feet, flat on the ground under it.
	[12, 26, 5, 1, SHADE],
	[12, 27, 5, 1, SKIN_SHADE],
	...foot(5, 26),
	[10, 26, 1, 1, SHADE],
])

// --- On skis and a snowboard ------------------------------------------------

/** Its legs bent, knees forward, the far one `apart` cells behind the near one. */
const bentLegs = (apart: number): PixelRect[] => [
	...at(apart, 0, [
		[13, 19, 2, 1, SHADE],
		[9, 20, 4, 3, SHADE],
		[8, 21, 1, 3, SHADE],
		[9, 23, 3, 2, SHADE],
		[10, 25, 3, 2, SHADE],
		...foot(9, 27, false),
	]),
	[12, 18, 3, 1, FUR],
	[10, 19, 5, 1, FUR],
	[15, 19, 1, 1, SHADE],
	[9, 20, 4, 1, FUR],
	[13, 20, 1, 1, SHADE],
	[8, 21, 4, 1, FUR],
	[12, 21, 1, 1, SHADE],
	[8, 22, 3, 2, FUR],
	[11, 22, 1, 2, SHADE],
	[9, 24, 3, 1, FUR],
	[12, 24, 1, 1, SHADE],
	[10, 25, 3, 2, FUR],
	[13, 25, 1, 3, SHADE],
	...foot(9, 27),
]

/** Its body leant forward, from `x` across: its head, hump and body, its far side in shadow. */
const leaning = (x: number): PixelRect[] =>
	at(x, 0, [
		...hump(8, 4),
		[4, 7, 7, 2, FUR],
		[0, 9, 11, 1, FUR],
		[-1, 10, 12, 6, FUR],
		[11, 7, 3, 1, SHADE],
		[11, 8, 3, 2, SHADE],
		[11, 10, 3, 6, SHADE],
		[14, 9, 1, 1, SHADE],
		[14, 11, 1, 1, SHADE],
		[-2, 12, 1, 1, FUR],
		// Its belly in shadow underneath, and the ragged fur at its hem.
		[9, 15, 2, 1, SHADE],
		[1, 16, 10, 1, SHADE],
		[3, 16, 4, 1, FUR],
		[1, 17, 10, 1, SHADE],
		[2, 18, 1, 1, SHADE],
		[4, 18, 1, 1, SHADE],
		[7, 18, 2, 1, SHADE],
		[10, 18, 1, 1, SHADE],
		...head(0, 2),
	])

/**
 * A pole, a line of cells from `x0`, `y0` to `x1`, `y1` (further across),
 * a rect to each row it's on.
 */
const pole = (
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	fill: string,
): PixelRect[] => {
	const rects: PixelRect[] = []
	for (let x = x0; x <= x1; x++) {
		const y = Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0))
		const last = rects.at(-1)
		if (last && last[1] === y) last[2]++
		else rects.push([x, y, 1, 1, fill])
	}
	return rects
}

/**
 * On skis: knees bent, leant in, its hands out front on its poles, the
 * poles back past its heels. The skis are drawn under it by the game.
 */
const ski = pixelArt(30, 29, [
	// Its far pole, behind it.
	...pole(10, 17, 27, 28, POLE_SHADE),
	...bentLegs(5),
	...leaning(7),
	// Its near arm, reaching forward and down, its shadow under it.
	[5, 11, 5, 1, FUR],
	[10, 11, 2, 1, SHADE],
	[4, 12, 5, 1, FUR],
	[9, 12, 2, 1, SHADE],
	[3, 13, 5, 1, FUR],
	[8, 13, 2, 1, SHADE],
	[5, 14, 2, 1, FUR],
	[7, 14, 2, 1, SHADE],
	[5, 15, 2, 1, SHADE],
	// Its near pole, from its hand back past its heels, its grip through
	// its fist.
	...hand(2, 14),
	[3, 13, 1, 1, INK],
	[3, 17, 1, 1, INK],
	...pole(4, 18, 21, 28, POLE),
])

/** Curled up on its skis in the air, grabbing them, its poles under its arm. */
const skiTuck = pixelArt(30, 29, [
	// Its far pole, sticking out behind it.
	...pole(3, 19, 29, 11, POLE_SHADE),
	...hump(12, 9),
	// Its body, curled up in a ball, its far side in shadow.
	[9, 12, 8, 2, FUR],
	[5, 14, 13, 8, FUR],
	[17, 11, 2, 1, SHADE],
	[17, 12, 3, 2, SHADE],
	[18, 14, 3, 7, SHADE],
	[21, 15, 1, 4, SHADE],
	[6, 21, 14, 1, SHADE],
	[9, 22, 10, 1, SHADE],
	// Its legs, tucked up under it.
	[15, 23, 4, 4, SHADE],
	...foot(14, 27, false),
	[10, 23, 4, 4, FUR],
	[14, 23, 1, 4, SHADE],
	...foot(8, 27),
	...head(5, 7),
	// Its near pole, under its arm, sticking out behind.
	[0, 20, 2, 1, INK],
	...pole(2, 20, 29, 12, POLE),
	// Its near arm, down the front of it to grab its skis.
	[4, 14, 3, 11, FUR],
	[7, 15, 1, 10, SHADE],
	[3, 17, 1, 1, FUR],
	[3, 20, 1, 1, FUR],
	...hand(4, 25),
])

/** On a snowboard: knees bent, its arms out either side for balance. */
const snowboard = pixelArt(30, 29, [
	// Its far arm, out behind it.
	[21, 9, 4, 2, SHADE],
	[25, 10, 2, 1, SHADE],
	...hand(27, 9, false),
	...bentLegs(6),
	...leaning(9),
	// Its near arm, out in front, its shadow under it.
	[4, 10, 9, 1, FUR],
	[3, 11, 6, 1, FUR],
	[3, 12, 6, 1, SHADE],
	...hand(0, 11),
])

/** Its face, for a celebration's icon: its tuft, its eye and its grin. */
const face = pixelArt(6, 6, [
	[2, 0, 3, 1, LIT],
	[1, 1, 5, 1, LIT],
	[0, 2, 6, 4, FUR],
	[5, 2, 1, 3, SHADE],
	[0, 3, 4, 3, SKIN],
	[1, 3, 1, 1, INK],
	[0, 5, 3, 1, INK],
	[3, 4, 1, 1, INK],
])

export const YETI_SPRITE: Playable['sprite'] = {
	run,
	sit,
	stand,
	ski,
	skiTuck,
	snowboard,
	face,
	width: 23,
	height: 29,
}
