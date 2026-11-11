import type { JSX } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import type { CorgiPose } from './corgi'

/**
 * A unicorn, Furby Fields' Ride, side on and facing right, in cells twice
 * the size of a screen pixel, as the deer is: lying down in the candy
 * grass waiting, and the two halves of a gallop. A rainbow mane and tail,
 * a gold horn, and a saddle blanket with a star on it, for riding on.
 */

const CELL = 2
const COLUMNS = 28
const ROWS = 24

export const UNICORN_WIDTH = COLUMNS * CELL
export const UNICORN_HEIGHT = ROWS * CELL
/** How tall it is to its back, stood up: what you land on to ride it. */
export const UNICORN_BACK = 28
/** How far above its feet whoever's riding it sits. */
export const UNICORN_SADDLE = 26

const COAT = '#fbf7ff'
const SHADE = '#dacdea'
const HORN = '#ffd23f'
const HORN_DARK = '#d9a514'
const HOOF = '#c77cc0'
const INK = '#1d1d1d'
const BLUSH = '#ffb3cf'
const BLANKET = '#ff8fc2'
const STAR = '#fff27a'
/** Its mane and tail, a stripe of the rainbow each. */
const RAINBOW = [
	'#ff6fa8',
	'#ffb86b',
	'#ffe66b',
	'#7be0a0',
	'#6bc4ff',
	'#b48bff',
]

const moved = (rects: PixelRect[], down: number): PixelRect[] =>
	rects.map(([x, y, w, h, c]): PixelRect => [x, y + down, w, h, c])

/** Its head, horn, neck and mane, `down` cells lower than stood up. */
const head = (down: number): PixelRect[] =>
	moved(
		[
			// Its horn, up and forward, a twist in it.
			[23, 0, 1, 1, HORN],
			[22, 1, 1, 1, HORN_DARK],
			[22, 2, 1, 1, HORN],
			[21, 3, 1, 1, HORN_DARK],
			// Its head, ear, eye, blush, muzzle and nostril.
			[18, 3, 6, 4, COAT],
			[18, 2, 1, 1, COAT],
			[22, 5, 4, 3, COAT],
			[21, 4, 1, 1, INK],
			[21, 5, 1, 1, BLUSH],
			[25, 6, 1, 1, SHADE],
			// Its neck, down to its shoulders.
			[17, 7, 4, 4, COAT],
			[20, 8, 1, 3, SHADE],
			// Its mane, down the back of its neck, a stripe a row.
			...RAINBOW.map(
				(colour, i): PixelRect => [16 + (i < 2 ? 1 : 0), 2 + i, 2, 1, colour],
			),
			...RAINBOW.slice(2).map(
				(colour, i): PixelRect => [15, 8 + i, 2, 1, colour],
			),
		],
		down,
	)

/** Its body, `down` cells lower than stood up, its blanket, and its rainbow tail. */
const body = (down: number): PixelRect[] =>
	moved(
		[
			[4, 10, 15, 5, COAT],
			[5, 14, 13, 1, SHADE],
			// The blanket, a star on it.
			[9, 9, 6, 4, BLANKET],
			[11, 10, 2, 2, STAR],
			// Its tail, flowing out behind, the rainbow down it.
			...RAINBOW.map(
				(colour, i): PixelRect => [
					i < 3 ? 2 : 1,
					9 + i,
					i < 3 ? 2 : 3,
					1,
					colour,
				],
			),
		],
		down,
	)

/** A leg, from `x` at the body down `length` to a hoof, leaning `lean` cells over it. */
const leg = (
	x: number,
	top: number,
	length: number,
	lean: number,
): PixelRect[] => {
	const cells: PixelRect[] = []
	for (let i = 0; i < length; i++)
		cells.push([x + Math.round((lean * i) / length), top + i, 1, 1, SHADE])
	const foot = cells[cells.length - 1]
	cells.push([foot[0], foot[1], 1, 1, HOOF])
	return cells
}

/** Lying down, legs folded under it, head up, waiting. */
const SIT = pixelArt(COLUMNS, ROWS, [
	...head(6),
	...body(8),
	[5, 22, 13, 1, SHADE],
	[16, 21, 3, 1, HOOF],
])

/** Gathered, mid-gallop: its legs under it. */
const CROUCH = pixelArt(COLUMNS, ROWS, [
	...head(0),
	...body(1),
	...leg(6, 16, 8, 2),
	...leg(8, 16, 8, 1),
	...leg(15, 16, 8, -1),
	...leg(17, 16, 8, -2),
])

/** Stretched out, mid-gallop: its forelegs reaching, its hind legs kicking out. */
const LEAP = pixelArt(COLUMNS, ROWS, [
	...head(0),
	...body(0),
	...leg(5, 15, 7, -4),
	...leg(7, 15, 7, -3),
	...leg(16, 15, 7, 4),
	...leg(18, 15, 6, 4),
])

const ART: Record<CorgiPose, string> = { sit: SIT, crouch: CROUCH, leap: LEAP }

/** An ink outline round it, as the corgi has, so it stands out. */
const OUTLINE: JSX.CSSProperties = {
	filter: [
		'drop-shadow(2px 0 0 #2b2b2b)',
		'drop-shadow(-2px 0 0 #2b2b2b)',
		'drop-shadow(0 2px 0 #2b2b2b)',
		'drop-shadow(0 -2px 0 #2b2b2b)',
	].join(' '),
}

export function UnicornArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={ART[props.pose]}
				width={UNICORN_WIDTH}
				height={UNICORN_HEIGHT}
			/>
		</div>
	)
}
