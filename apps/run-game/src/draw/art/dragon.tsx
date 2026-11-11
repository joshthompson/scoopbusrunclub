import { Pixels } from '../Pixels'

/**
 * A Chinese dragon, flying: a long red body rippling as it goes, gold down
 * its belly and along its spine, its head out in front, facing right, with
 * horns, a beard and whiskers streaming back, and little clawed legs.
 */

export const DRAGON_WIDTH = 200
export const DRAGON_HEIGHT = 70

const RED = '#d62b2b'
const RED_DARK = '#9e1b1b'
const GOLD = '#f2c200'
const GOLD_DARK = '#c99a00'
const WHITE = '#fff6e0'
const INK = '#2b1b10'

type Rect = [number, number, number, number, string]

/** How far down its body is at `x` along it, `now` ticks in: a ripple running back down it. */
const wave = (x: number, now: number) =>
	DRAGON_HEIGHT / 2 + Math.round(Math.sin(x / 26 - now / 5) * 7)

/** How thick its body is, `x` along it: thicker towards the head. */
const thickness = (x: number) => 10 + Math.round((x / 172) * 8)

/** Where its neck is along it, just behind its head: where it's ridden. */
export const DRAGON_NECK = 158

/** How far down the art the top of its back is, `x` along it, `now` ticks in. */
export const dragonBack = (x: number, now: number) =>
	wave(x, now) - thickness(x) / 2

function dragon(now: number): Rect[] {
	const rects: Rect[] = []
	// The tail's tuft, at the back.
	const tail = wave(4, now)
	rects.push([0, tail - 8, 6, 4, GOLD], [2, tail - 4, 8, 8, GOLD_DARK])
	// The body, segment by segment, thicker towards the head.
	for (let x = 8; x < 172; x += 6) {
		const y = wave(x, now)
		const thick = thickness(x)
		rects.push([x, y - thick / 2, 7, thick, RED])
		rects.push([x, y + thick / 2 - 2, 7, 2, GOLD])
		rects.push([x, y - thick / 2, 7, 1, RED_DARK])
		// Spines along its back, gold.
		if ((x / 6) % 2 === 0) rects.push([x + 2, y - thick / 2 - 3, 3, 3, GOLD])
	}
	// Two pairs of little legs, clawing.
	for (const x of [52, 128]) {
		const y = wave(x, now)
		rects.push([x, y + 4, 3, 7, RED_DARK], [x - 2, y + 10, 7, 2, GOLD_DARK])
	}
	// The head, out in front.
	const y = wave(178, now)
	rects.push([168, y - 11, 24, 20, RED])
	rects.push([186, y - 4, 13, 11, RED])
	rects.push([186, y + 5, 13, 3, GOLD])
	// Horns, back over its mane.
	rects.push([172, y - 15, 3, 6, GOLD], [168, y - 17, 5, 3, GOLD])
	rects.push([178, y - 14, 3, 5, GOLD_DARK])
	// Its eye, its nostril, and its mane.
	rects.push([184, y - 6, 3, 3, WHITE], [185, y - 5, 2, 2, INK])
	rects.push([196, y - 2, 2, 2, INK])
	rects.push([164, y - 11, 8, 4, GOLD], [162, y - 6, 8, 4, GOLD_DARK])
	// Its beard, and whiskers streaming back off its snout.
	rects.push([184, y + 7, 6, 5, WHITE])
	for (let i = 0; i < 4; i++) {
		rects.push([194 - i * 8, y - 1 + i * 2, 6, 1, WHITE])
		rects.push([194 - i * 8, y + 9 + i, 6, 1, WHITE])
	}
	return rects
}

export function DragonArt(props: { now: number }) {
	return (
		<Pixels
			width={DRAGON_WIDTH}
			height={DRAGON_HEIGHT}
			rects={dragon(props.now)}
		/>
	)
}
