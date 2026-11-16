import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import type { CorgiPose } from './corgi'

/**
 * A skateboard, Midnattsloppet's Ride: side on, facing right, lying on the
 * road waiting for someone to step on; its deck kicked up at the nose and
 * tail, black grip tape on top, the race's blue on its underside, two
 * trucks and their wheels. Jumped on, it kickflips: turning over under its
 * rider's feet (`SKATEBOARD_FLIP`), and back the right way up to land on.
 * In cells twice the size of a screen pixel, as the corgi is.
 */

const CELL = 2
const COLUMNS = 18
const ROWS = 7

export const SKATEBOARD_WIDTH = COLUMNS * CELL
export const SKATEBOARD_HEIGHT = ROWS * CELL
/** How tall it is to its deck's top: what's stepped onto, to ride it. */
export const SKATEBOARD_BACK = 10
/** How far above its wheels' feet its rider stands, on its deck. */
export const SKATEBOARD_SADDLE = 10

const GRIP = '#222226'
const GRAIN = '#3a3a42'
const WOOD = '#c9874a'
const WOOD_SHADE = '#9a6232'
const BLUE = '#1f6bff'
const BLUE_LIT = '#5a93ff'
const STRIPE = '#e8eef8'
const TRUCK = '#9aa0aa'
const TRUCK_SHADE = '#6c7280'
const WHEEL = '#f2efe4'
const WHEEL_SHADE = '#c8c2b0'

/** The right way up: grip on top, then the deck's edge, trucks, wheels. */
const FLAT: PixelRect[] = [
	// The deck, its tail and nose kicked up.
	[1, 2, 16, 1, GRIP],
	[0, 1, 1, 1, GRIP],
	[17, 1, 1, 1, GRIP],
	[1, 3, 16, 1, WOOD],
	[0, 2, 1, 1, WOOD_SHADE],
	[17, 2, 1, 1, WOOD_SHADE],
	// A glint of grain on the grip.
	[5, 2, 2, 1, GRAIN],
	[11, 2, 1, 1, GRAIN],
	// The trucks, and a wheel under each.
	[3, 4, 3, 1, TRUCK],
	[12, 4, 3, 1, TRUCK],
	[3, 5, 2, 2, WHEEL],
	[3, 6, 2, 1, WHEEL_SHADE],
	[13, 5, 2, 2, WHEEL],
	[13, 6, 2, 1, WHEEL_SHADE],
]

/** A quarter turn over: its underside to you, the race's blue, wheels sticking out top and bottom. */
const UNDERSIDE: PixelRect[] = [
	[2, 1, 14, 5, BLUE],
	[1, 2, 1, 3, BLUE],
	[16, 2, 1, 3, BLUE],
	[2, 1, 14, 1, BLUE_LIT],
	[2, 3, 14, 1, STRIPE],
	// The trucks, across it, and their wheels at either end.
	[4, 2, 1, 3, TRUCK_SHADE],
	[13, 2, 1, 3, TRUCK_SHADE],
	[3, 0, 3, 1, WHEEL],
	[3, 6, 3, 1, WHEEL_SHADE],
	[12, 0, 3, 1, WHEEL],
	[12, 6, 3, 1, WHEEL_SHADE],
]

/** Upside down: wheels in the air, the grip underneath. */
const UPSIDE_DOWN: PixelRect[] = [
	[3, 0, 2, 2, WHEEL],
	[3, 0, 2, 1, WHEEL_SHADE],
	[13, 0, 2, 2, WHEEL],
	[13, 0, 2, 1, WHEEL_SHADE],
	[3, 2, 3, 1, TRUCK],
	[12, 2, 3, 1, TRUCK],
	[1, 3, 16, 1, BLUE],
	[1, 4, 16, 1, GRIP],
	[0, 5, 1, 1, GRIP],
	[17, 5, 1, 1, GRIP],
	[0, 4, 1, 1, BLUE],
	[17, 4, 1, 1, BLUE],
]

/** Three quarters over: its grip tape to you, black, grained. */
const GRIP_SIDE: PixelRect[] = [
	[2, 1, 14, 5, GRIP],
	[1, 2, 1, 3, GRIP],
	[16, 2, 1, 3, GRIP],
	[4, 2, 1, 1, GRAIN],
	[8, 4, 2, 1, GRAIN],
	[12, 2, 1, 1, GRAIN],
	[14, 4, 1, 1, GRAIN],
	[2, 5, 14, 1, WOOD_SHADE],
]

const flat = pixelArt(COLUMNS, ROWS, FLAT)

/**
 * Its kickflip, a frame at a time, from leaving the ground: over, upside
 * down, over again, and the right way up, to be landed on.
 */
export const SKATEBOARD_FLIP = [
	pixelArt(COLUMNS, ROWS, UNDERSIDE),
	pixelArt(COLUMNS, ROWS, UPSIDE_DOWN),
	pixelArt(COLUMNS, ROWS, GRIP_SIDE),
	flat,
]
/** How many ticks each of those is shown for. */
export const SKATEBOARD_FLIP_TICKS = 4

/** Its picture in `pose`: lying waiting, rolling, or in the air, all the right way up. */
export const skateboardPicture = (_pose: CorgiPose) => flat

export function SkateboardArt(_props: { pose: CorgiPose }) {
	return (
		<PixelArt src={flat} width={SKATEBOARD_WIDTH} height={SKATEBOARD_HEIGHT} />
	)
}
