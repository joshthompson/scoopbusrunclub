import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'

/**
 * A Chinese dragon, flying: a long red body rippling as it goes, in scales,
 * gold plates down its belly and a frilled fin along its spine; its tail
 * tapering to a fan of feathery strands, gold and orange, and tufts like
 * flames at its elbows and along its tail; its head out in front, facing
 * right, with antlers, a mane streaming back, an open jaw, a beard and long
 * whiskers.
 */

export const DRAGON_WIDTH = 200
export const DRAGON_HEIGHT = 70

const RED = '#d62b2b'
const RED_LIGHT = '#ef5844'
const RED_SHADE = '#b52222'
const RED_DARK = '#8e1717'
const SCALE_LINE = '#a01c1c'
const GOLD = '#f2c200'
const GOLD_LIGHT = '#ffe680'
const GOLD_DARK = '#c99a00'
const ORANGE = '#f07f1a'
const ORANGE_DARK = '#c75a10'
const CREAM = '#fff6e0'
const INK = '#2b1b10'

/** How many frames round a ripple down its body. */
const FRAMES = 24
/** How fast the ripple runs back down it: a radian every this many ticks. */
const RIPPLE_TICKS = 5

/** Which frame it's on, `now` ticks in. */
const frameAt = (now: number) => {
	const turns = now / RIPPLE_TICKS / (Math.PI * 2)
	return (
		((Math.floor((turns - Math.floor(turns)) * FRAMES) % FRAMES) + FRAMES) %
		FRAMES
	)
}
/** How far round the ripple frame `f` is, in radians. */
const phaseOf = (f: number) => (f / FRAMES) * Math.PI * 2

/** How far down its body is at `x` along it, on frame `f`: a ripple running back down it. */
const wave = (x: number, f: number) =>
	DRAGON_HEIGHT / 2 + Math.round(Math.sin(x / 26 - phaseOf(f)) * 7)

/** Where its body starts, behind which it's all tail fin. */
const TAIL_ROOT = 22
/** Where its head starts. */
const HEAD = 166

/** How thick its body is, `x` along it: slim at the tail, thicker towards the head. */
const thickness = (x: number) =>
	x < 70 ? 6 + ((x - TAIL_ROOT) / 48) * 8 : 14 + ((x - 70) / 102) * 5

/** Where its neck is along it, just behind its head: where it's ridden. */
export const DRAGON_NECK = 158

/** How far down the art the top of its back is, `x` along it, `now` ticks in. */
export const dragonBack = (x: number, now: number) =>
	wave(x, frameAt(now)) - thickness(x) / 2

/** A grid of cells, each a colour or nothing, painted over one another. */
function grid() {
	const cells: (string | undefined)[][] = Array.from(
		{ length: DRAGON_HEIGHT },
		() => Array(DRAGON_WIDTH).fill(undefined),
	)
	const set = (x: number, y: number, colour: string | undefined) => {
		const cx = Math.round(x)
		const cy = Math.round(y)
		if (cx >= 0 && cx < DRAGON_WIDTH && cy >= 0 && cy < DRAGON_HEIGHT)
			cells[cy][cx] = colour
	}
	const rect = (x: number, y: number, w: number, h: number, colour: string) => {
		for (let dy = 0; dy < h; dy++)
			for (let dx = 0; dx < w; dx++) set(x + dx, y + dy, colour)
	}
	/** Run along each row, a rect for each run of one colour. */
	const rects = () => {
		const out: PixelRect[] = []
		cells.forEach((row, y) => {
			let from = 0
			for (let x = 1; x <= DRAGON_WIDTH; x++)
				if (x === DRAGON_WIDTH || row[x] !== row[from]) {
					const colour = row[from]
					if (colour) out.push([from, y, x - from, 1, colour])
					from = x
				}
		})
		return out
	}
	return { set, rect, rects }
}

/**
 * A feathery strand, trailing back from `x`, `y`: `length` long, wavering
 * as it goes, its tip lighter. A tuft's, a mane's.
 */
function strand(
	set: (x: number, y: number, colour: string) => void,
	x: number,
	y: number,
	length: number,
	colour: string,
	tip: string,
	sway: number,
	phase: number,
) {
	for (let i = 0; i < length; i++)
		set(
			x - i,
			y + Math.round(Math.sin(i / 3 + phase) * sway * (i / length)),
			i > length - 3 ? tip : colour,
		)
}

function paint(f: number) {
	const { set, rect, rects } = grid()
	const phase = phaseOf(f)

	// The tail's fin: a fan of long feathery strands, gold and orange,
	// spreading from the tip of its tail, each tapering to a pale point and
	// swaying on its own.
	const FAN = TAIL_ROOT + 4
	/** Each strand: how far up or down the fan it runs, and how far back it reaches. */
	const feathers: [spread: number, end: number][] = [
		[-1, 5],
		[-0.55, 1],
		[-0.15, 0],
		[0.25, 2],
		[0.65, 4],
		[1, 8],
	]
	feathers.forEach(([spread, end], k) => {
		const gold = k % 2 === 0
		for (let x = end; x <= FAN; x++) {
			const t = (FAN - x) / (FAN - end)
			const centre =
				wave(x, f) +
				spread * (2 + t * 15) +
				Math.sin(x / 4 + phase * 2 + k) * t * 2.5
			const thick = t > 0.85 ? 1 : t > 0.45 ? 2 : 3
			for (let d = 0; d < thick; d++)
				set(
					x,
					centre + d - Math.floor(thick / 2),
					t > 0.8
						? GOLD_LIGHT
						: d === thick - 1 && thick > 1
							? gold
								? GOLD_DARK
								: ORANGE_DARK
							: gold
								? GOLD
								: ORANGE,
				)
		}
	})

	// The body, column by column, in scales.
	for (let x = TAIL_ROOT; x < HEAD + 6; x++) {
		const thick = Math.round(thickness(x))
		const top = Math.round(wave(x, f) - thick / 2)
		for (let d = 0; d < thick; d++) {
			const y = top + d
			let colour: string
			if (d === 0) colour = RED_DARK
			else if (d >= thick - 3) {
				// Its belly, in gold plates.
				colour =
					d === thick - 1 || x % 4 === 0
						? GOLD_DARK
						: d === thick - 3
							? GOLD_LIGHT
							: GOLD
			} else {
				// Scales, overlapping, rounded, each lit along its top, the
				// rows offset so each sits between the two above it; in
				// shadow lower down.
				const row = Math.floor((d - 1) / 4)
				const sx = (x + (row % 2) * 3) % 6
				const sy = (d - 1) % 4
				const low = d > thick * 0.55
				const edge =
					(sy === 3 && sx > 0 && sx < 5) || (sy === 2 && (sx === 0 || sx === 5))
				colour = edge
					? SCALE_LINE
					: sy === 0 && (sx === 2 || sx === 3)
						? low
							? RED
							: RED_LIGHT
						: low
							? RED_SHADE
							: RED
			}
			set(x, y, colour)
		}
		// The frilled fin along its spine, leaning back: taller, and gold, along its tail.
		const spike = [1, 2, 3, 2, 1, 0, 0][x % 7]
		const tall = x < 70 ? spike + 1 : spike
		for (let k = 1; k <= tall; k++)
			set(
				x - Math.floor(k / 2),
				top - k,
				k === tall ? GOLD_LIGHT : x < 70 ? GOLD : ORANGE,
			)
	}

	// Tufts along the underside of its tail, like flames, trailing back.
	for (const x of [34, 46, 62]) {
		const under = Math.round(wave(x, f) + thickness(x) / 2)
		strand(set, x, under, 7, ORANGE, GOLD_LIGHT, 2, phase + x)
		strand(set, x + 2, under + 1, 5, GOLD, GOLD_LIGHT, 2, phase + x + 1)
	}

	// Two pairs of legs, clawing, a tuft of flame back from each elbow.
	for (const lx of [56, 128]) {
		const under = Math.round(wave(lx, f) + thickness(lx) / 2)
		strand(set, lx - 1, under + 2, 9, ORANGE, GOLD_LIGHT, 2, phase + lx)
		strand(set, lx - 1, under + 4, 7, GOLD, GOLD_LIGHT, 2, phase + lx + 2)
		strand(set, lx, under + 6, 5, ORANGE, GOLD, 1, phase + lx + 4)
		rect(lx, under - 2, 4, 5, RED)
		rect(lx + 3, under - 2, 1, 5, RED_DARK)
		rect(lx + 1, under + 3, 4, 3, RED)
		rect(lx + 4, under + 3, 1, 3, RED_DARK)
		// Its claws, gold, spread.
		rect(lx, under + 6, 2, 1, GOLD)
		rect(lx + 2, under + 6, 2, 2, GOLD)
		rect(lx + 4, under + 6, 2, 1, GOLD)
		set(lx - 1, under + 7, GOLD_DARK)
		set(lx + 3, under + 8, GOLD_DARK)
		set(lx + 6, under + 7, GOLD_DARK)
	}

	// The head, out in front.
	const y = wave(178, f)
	// Long whiskers off its snout, streaming back, wavering: from behind
	// its head, so they come out from its lip.
	for (let i = 0; i < 40; i++) {
		set(
			196 - i,
			y - 3 - Math.round(i * 0.42 + Math.sin(i / 5 - phase) * 1.5),
			CREAM,
		)
		set(
			194 - i,
			y + 4 + Math.round(i * 0.28 + Math.sin(i / 5 - phase + 1) * 1.5),
			CREAM,
		)
	}
	// Its mane, streaming back off its head and down its neck, in thick locks.
	for (let k = 0; k < 4; k++) {
		const length = 18 - Math.abs(k - 1) * 3
		const colour = k % 2 ? GOLD : ORANGE
		for (const dy of [0, 1])
			strand(
				set,
				170,
				y - 13 + k * 4 + dy,
				length,
				colour,
				GOLD_LIGHT,
				2,
				phase * 2 + k,
			)
	}
	rect(HEAD, y - 11, 22, 19, RED)
	rect(HEAD, y - 11, 22, 1, RED_DARK)
	// Its forehead sloping down to its snout.
	rect(184, y - 11, 4, 1, RED_DARK)
	// Frills back off its cheeks, like flames, gold and orange.
	for (let k = 0; k < 3; k++)
		strand(
			set,
			HEAD + 2,
			y + 1 + k * 3,
			8 - k,
			k % 2 ? GOLD : ORANGE,
			GOLD_LIGHT,
			1,
			phase + k,
		)
	// Scales on its cheek.
	for (const [sx, sy] of [
		[169, y - 6],
		[173, y - 3],
		[169, y],
		[175, y + 2],
	] as const)
		rect(sx, sy, 2, 1, RED_LIGHT)
	// Its snout, a bump over its nostril.
	rect(186, y - 5, 13, 8, RED)
	set(198, y - 5, undefined)
	rect(192, y - 7, 6, 2, RED)
	rect(192, y - 7, 6, 1, RED_DARK)
	set(196, y - 4, INK)
	set(197, y - 4, INK)
	// Its upper lip, gold; its mouth, open, its teeth; its jaw.
	rect(186, y + 2, 13, 1, GOLD)
	rect(187, y + 3, 11, 2, INK)
	for (const tx of [188, 191, 194, 197]) set(tx, y + 3, CREAM)
	rect(186, y + 5, 11, 3, RED_SHADE)
	rect(HEAD + 4, y + 5, 14, 3, RED_SHADE)
	rect(186, y + 8, 10, 1, GOLD)
	set(195, y + 4, CREAM)
	// Its eye, under a bushy gold brow.
	rect(181, y - 7, 5, 3, CREAM)
	rect(183, y - 7, 2, 3, INK)
	rect(179, y - 10, 9, 2, GOLD)
	rect(186, y - 9, 2, 1, GOLD_LIGHT)
	// Antlers, back over its mane, branching.
	rect(171, y - 15, 2, 4, GOLD)
	rect(168, y - 18, 4, 3, GOLD)
	rect(166, y - 20, 3, 2, GOLD_LIGHT)
	rect(172, y - 18, 2, 3, GOLD)
	rect(173, y - 20, 2, 2, GOLD_LIGHT)
	rect(177, y - 14, 2, 3, GOLD_DARK)
	rect(175, y - 16, 3, 2, GOLD_DARK)
	// Its beard, curling down under its jaw.
	rect(181, y + 7, 7, 4, CREAM)
	rect(180, y + 11, 5, 2, CREAM)
	rect(179, y + 13, 3, 1, CREAM)
	return pixelArt(DRAGON_WIDTH, DRAGON_HEIGHT, rects())
}

/** Each of its frames, painted the first time they're wanted, not on every course. */
let painted: string[] | undefined
const frames = () => {
	painted ??= Array.from({ length: FRAMES }, (_, f) => paint(f))
	return painted
}

export function DragonArt(props: { now: number }) {
	return (
		<img
			src={frames()[frameAt(props.now)]}
			alt=""
			class="pixelated"
			width={DRAGON_WIDTH}
			height={DRAGON_HEIGHT}
			style={{ display: 'block', 'max-width': 'none' }}
		/>
	)
}
