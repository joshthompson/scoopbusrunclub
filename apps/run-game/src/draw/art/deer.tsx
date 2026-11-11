import type { JSX } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import type { CorgiPose } from './corgi'

/**
 * A deer, Huddinge's Ride, side on and facing right, in cells twice the size
 * of a screen pixel, as the corgi is: lying down in the bracken waiting, and
 * the two halves of a bound. A blanket over its back for riding on, in
 * Sweden's blue and yellow.
 */

const CELL = 2
const COLUMNS = 26
const ROWS = 24

export const DEER_WIDTH = COLUMNS * CELL
export const DEER_HEIGHT = ROWS * CELL
/** How tall it is to its back, stood up: what you land on to ride it. */
export const DEER_BACK = 28
/** How far above its feet whoever's riding it sits. */
export const DEER_SADDLE = 26

const COAT = '#a0672f'
const COAT_DARK = '#6e4420'
const WHITE = '#efe6d6'
const ANTLER = '#d9c8a4'
const INK = '#1d1d1d'
const BLUE = '#2f6fb3'
const YELLOW = '#ffd23f'

/** Its head, neck and antlers, `down` cells lower than stood up. */
const head = (down: number): PixelRect[] =>
	(
		[
			// Antlers, branching.
			[18, 0, 1, 3, ANTLER],
			[16, 0, 2, 1, ANTLER],
			[21, 0, 1, 3, ANTLER],
			[22, 0, 2, 1, ANTLER],
			[17, 1, 1, 1, ANTLER],
			// Its head, ear, eye, muzzle and nose.
			[17, 3, 6, 4, COAT],
			[16, 3, 1, 2, COAT_DARK],
			[22, 5, 3, 2, COAT],
			[24, 5, 1, 1, INK],
			[20, 4, 1, 1, INK],
			[22, 6, 2, 1, WHITE],
			// Its neck, down to its shoulders.
			[16, 7, 4, 4, COAT],
			[19, 8, 1, 3, WHITE],
		] as PixelRect[]
	).map(([x, y, w, h, c]): PixelRect => [x, y + down, w, h, c])

/** Its body, `down` cells lower than stood up, a blanket on its back, and its white tail. */
const body = (down: number): PixelRect[] =>
	(
		[
			[4, 10, 15, 5, COAT],
			[5, 14, 13, 1, WHITE],
			[4, 10, 2, 2, COAT_DARK],
			[2, 9, 2, 2, COAT],
			[2, 10, 1, 1, WHITE],
			// The blanket, a cross on it.
			[9, 9, 6, 4, BLUE],
			[11, 9, 1, 4, YELLOW],
			[9, 10, 6, 1, YELLOW],
		] as PixelRect[]
	).map(([x, y, w, h, c]): PixelRect => [x, y + down, w, h, c])

/** A leg, from `x` at the body down `length` to a hoof, leaning `lean` cells over it. */
const leg = (
	x: number,
	top: number,
	length: number,
	lean: number,
): PixelRect[] => {
	const cells: PixelRect[] = []
	for (let i = 0; i < length; i++)
		cells.push([x + Math.round((lean * i) / length), top + i, 1, 1, COAT_DARK])
	const foot = cells[cells.length - 1]
	cells.push([foot[0], foot[1], 1, 1, INK])
	return cells
}

/** Lying down, legs folded under it, head up, waiting. */
const SIT = pixelArt(COLUMNS, ROWS, [
	...head(6),
	...body(8),
	[5, 22, 13, 1, COAT_DARK],
	[16, 21, 3, 1, INK],
])

/** Gathered, mid-bound: its legs under it. */
const CROUCH = pixelArt(COLUMNS, ROWS, [
	...head(0),
	...body(1),
	...leg(6, 16, 8, 2),
	...leg(8, 16, 8, 1),
	...leg(15, 16, 8, -1),
	...leg(17, 16, 8, -2),
])

/** Stretched out, mid-bound: its forelegs reaching, its hind legs kicking out. */
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

export function DeerArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt src={ART[props.pose]} width={DEER_WIDTH} height={DEER_HEIGHT} />
		</div>
	)
}
