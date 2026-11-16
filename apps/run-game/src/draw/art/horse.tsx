import type { JSX } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import { inkOutline } from '../paint/picture'
import type { CorgiPose } from './corgi'

/**
 * A horse of the Royal Guard's mounted guard, Gamla Stan's Ride, side on
 * and facing right, in cells twice the size of a screen pixel, as the
 * unicorn is: stood waiting in the street, and the two halves of a
 * gallop. A dark bay, its mane, tail and legs black, a white blaze down
 * its face, a bridle, and its saddle on the guard's blue saddlecloth,
 * edged in gold, a gold crown on it.
 */

const CELL = 2
const COLUMNS = 30
const ROWS = 28

export const HORSE_WIDTH = COLUMNS * CELL
export const HORSE_HEIGHT = ROWS * CELL
/** How tall it is to its back, stood up: what you land on to ride it. */
export const HORSE_BACK = 36
/** How far above its feet whoever's riding it sits. */
export const HORSE_SADDLE = 34

const COAT = '#6e4024'
const LIT = '#8c5631'
const SHADE = '#4b2a17'
/** Its mane, its tail, and its legs, black from the knee down. */
const BLACK = '#1e1612'
const HOOF = '#3b3b3b'
const BLAZE = '#f3ede2'
const INK = '#1d1d1d'
const CLOTH = '#23468f'
const GOLD = '#f2c230'
const SADDLE = '#2e1d12'

const moved = (rects: PixelRect[], down: number): PixelRect[] =>
	rects.map(([x, y, w, h, c]): PixelRect => [x, y + down, w, h, c])

/** Its head, bridle, neck and mane, `down` cells lower than stood up. */
const head = (down: number): PixelRect[] =>
	moved(
		[
			// Its ear.
			[21, 0, 1, 1, COAT],
			[21, 1, 2, 1, COAT],
			// Its head, long, down to its muzzle, its eye and nostril.
			[20, 2, 5, 3, COAT],
			[22, 5, 5, 2, COAT],
			[24, 7, 4, 2, COAT],
			[24, 8, 4, 1, SHADE],
			[22, 3, 1, 1, INK],
			[27, 7, 1, 1, INK],
			// The blaze down its face.
			[24, 3, 1, 2, BLAZE],
			[25, 5, 1, 1, BLAZE],
			[26, 6, 1, 1, BLAZE],
			// Its bridle: up its cheek, and round its nose.
			[22, 5, 1, 2, INK],
			[25, 7, 1, 2, INK],
			// Its neck, down to its shoulders.
			[18, 4, 4, 4, COAT],
			[17, 7, 5, 4, COAT],
			[21, 7, 1, 3, SHADE],
			// Its forelock, and its mane, down the back of its neck.
			[21, 2, 1, 1, BLACK],
			[19, 2, 2, 2, BLACK],
			[17, 4, 2, 3, BLACK],
			[16, 7, 2, 3, BLACK],
		],
		down,
	)

/** Its body, `down` cells lower than stood up: its saddle, its saddlecloth, and its tail. */
const body = (down: number): PixelRect[] =>
	moved(
		[
			[5, 10, 16, 7, COAT],
			[4, 11, 1, 5, COAT],
			[20, 11, 2, 5, COAT],
			[5, 10, 11, 1, LIT],
			[6, 16, 14, 1, SHADE],
			// The saddlecloth, the guard's blue, edged in gold, a crown on it.
			[9, 10, 8, 6, CLOTH],
			[9, 10, 1, 6, GOLD],
			[16, 10, 1, 6, GOLD],
			[9, 15, 8, 1, GOLD],
			[12, 13, 3, 1, GOLD],
			[12, 12, 1, 1, GOLD],
			[14, 12, 1, 1, GOLD],
			[13, 11, 1, 2, GOLD],
			// The saddle on it.
			[11, 9, 5, 1, SADDLE],
			[10, 8, 1, 2, SADDLE],
			// Its tail, hanging from its rump.
			[3, 10, 2, 1, BLACK],
			[2, 11, 2, 3, BLACK],
			[1, 14, 2, 3, BLACK],
			[2, 17, 1, 1, BLACK],
		],
		down,
	)

/**
 * A leg, two cells thick, from `x` at the body down `length` to a hoof,
 * leaning `lean` cells over it: bay above the knee, black below. The far
 * ones, in shadow.
 */
const leg = (
	x: number,
	top: number,
	length: number,
	lean: number,
	far = false,
): PixelRect[] => {
	const cells: PixelRect[] = []
	for (let i = 0; i < length; i++) {
		const fill = i * 2 < length ? (far ? SHADE : COAT) : BLACK
		cells.push([x + Math.round((lean * i) / length), top + i, 2, 1, fill])
	}
	const foot = cells[cells.length - 1]
	cells.push([foot[0], foot[1], 2, 1, HOOF])
	return cells
}

/** Stood still, square on all four, waiting. */
const STAND = pixelArt(COLUMNS, ROWS, [
	...leg(5, 17, 11, 0, true),
	...leg(16, 17, 11, 0, true),
	...body(0),
	...head(0),
	...leg(8, 17, 11, 0),
	...leg(19, 17, 11, 0),
])

/** Gathered, mid-gallop: its legs under it. */
const CROUCH = pixelArt(COLUMNS, ROWS, [
	...leg(5, 18, 10, 3, true),
	...leg(16, 18, 10, -2, true),
	...body(1),
	...head(1),
	...leg(8, 18, 10, 2),
	...leg(19, 18, 10, -3),
])

/** Stretched out, mid-gallop: its forelegs reaching, its hind legs kicking out. */
const LEAP = pixelArt(COLUMNS, ROWS, [
	...leg(5, 17, 9, -4, true),
	...leg(17, 17, 9, 4, true),
	...body(0),
	...head(0),
	...leg(7, 17, 9, -3),
	...leg(19, 17, 8, 4),
])

/** Waiting, a horse stands: its `sit` is stood still. */
const ART: Record<CorgiPose, string> = {
	sit: STAND,
	crouch: CROUCH,
	leap: LEAP,
}

/** An ink outline round it, as the corgi has, so it stands out. */
export const HORSE_OUTLINE = inkOutline('#2b2b2b')
const OUTLINE: JSX.CSSProperties = { filter: HORSE_OUTLINE.filter }

/** Its picture in `pose`, for a Draw Hook to paint, outlined. */
export const horsePicture = (pose: CorgiPose) => ART[pose]

export function HorseArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={ART[props.pose]}
				width={HORSE_WIDTH}
				height={HORSE_HEIGHT}
			/>
		</div>
	)
}
