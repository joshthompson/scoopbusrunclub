import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'

const CELL = 2

// Beach Volleyball's umpire, his chair and the scoreboard, for a very cold
// beach in winter.

const SKIN = '#f0b890'
const SKIN_SHADE = '#d8946a'
const CHEEK = '#e8806c'
const INK = '#2b2722'
const COAT = '#e8742c'
const COAT_LIT = '#f59a4c'
const COAT_SHADE = '#b9541c'
const HAT = '#2e6f6a'
const HAT_LIT = '#4a948c'
const WOOL = '#f4f6f8'
const SCARF = '#c8302c'
const MITTEN = '#c8302c'
const MITTEN_LIT = '#e8584c'
const TROUSERS = '#3a4a5e'
const TROUSERS_SHADE = '#2a3646'
const BOOT = '#3b2f28'
const WHISTLE = '#f2d03c'
const SNOW = '#f4f8fb'
const SNOW_SHADE = '#c8d8e6'
const WOOD = '#a8742e'
const WOOD_LIT = '#c8924a'
const WOOD_SHADE = '#7a4e20'
const PANEL = '#141c2e'

type Pose = 'rest' | 'left' | 'right'

/**
 * The umpire, drawn for a pose: sat facing us in a big puffy orange coat, a
 * woolly teal bobble hat, a red scarf, red mittens and a whistle on a cord.
 * His legs bend down over the front of the seat to a pair of boots. In
 * `left` or `right` one arm is stretched straight up beside his head, a
 * mitten at its top, for a point to that side of the screen. 24 by 30 cells.
 */
function umpire(pose: Pose) {
	const rects: PixelRect[] = [
		// His legs, bent down over the front of the seat, and his boots.
		[6, 24, 6, 3, TROUSERS],
		[12, 24, 6, 3, TROUSERS],
		[11, 24, 2, 3, TROUSERS_SHADE],
		[5, 27, 7, 3, BOOT],
		[12, 27, 7, 3, BOOT],
		[5, 27, 7, 1, '#5a463a'],
		[12, 27, 7, 1, '#5a463a'],
		// His coat: puffed in bands, each lit along its top and shaded below.
		[4, 13, 16, 11, COAT],
		[5, 13, 14, 1, COAT_LIT],
		[4, 16, 16, 1, COAT_SHADE],
		[4, 19, 16, 1, COAT_SHADE],
		[4, 22, 16, 2, COAT_SHADE],
		[5, 17, 14, 1, COAT_LIT],
		[5, 20, 14, 1, COAT_LIT],
		[5, 23, 14, 1, COAT_LIT],
		// His scarf, wound twice round his neck, one end hanging down.
		[6, 12, 12, 3, SCARF],
		[6, 12, 12, 1, '#e8584c'],
		[9, 13, 2, 1, WOOL],
		[14, 13, 2, 1, WOOL],
		[15, 15, 3, 6, SCARF],
		[15, 17, 3, 1, WOOL],
		[15, 19, 3, 1, WOOL],
		// The whistle on its cord.
		[9, 15, 1, 1, INK],
		[10, 16, 1, 1, INK],
		[14, 15, 1, 1, INK],
		[13, 16, 1, 1, INK],
		[11, 17, 2, 1, WHISTLE],
		// His face, stern but kind: a frown of brows, small eyes, rosy cheeks.
		[8, 7, 8, 5, SKIN],
		[8, 11, 8, 1, SKIN_SHADE],
		[9, 8, 2, 1, INK],
		[13, 8, 2, 1, INK],
		[10, 9, 1, 1, INK],
		[13, 9, 1, 1, INK],
		[11, 10, 2, 1, SKIN_SHADE],
		[8, 10, 2, 1, CHEEK],
		[14, 10, 2, 1, CHEEK],
		[11, 11, 2, 1, '#a8584a'],
		// His woolly hat, with a cuff and a bobble.
		[8, 2, 8, 3, HAT],
		[9, 2, 5, 1, HAT_LIT],
		[7, 5, 10, 2, WOOL],
		[7, 6, 10, 1, SNOW_SHADE],
		[10, 0, 4, 2, WOOL],
		[10, 1, 4, 1, SNOW_SHADE],
	]
	const arm = (x: number, up: boolean) => {
		if (up) {
			rects.push(
				// A sleeve straight up from the shoulder, and a mitten on top.
				[x, 4, 4, 12, COAT],
				[x, 4, 1, 12, COAT_LIT],
				[x + 3, 4, 1, 12, COAT_SHADE],
				[x, 8, 4, 1, COAT_SHADE],
				[x, 12, 4, 1, COAT_SHADE],
				[x, 3, 4, 1, WOOL],
				[x - 1, 0, 6, 3, MITTEN],
				[x - 1, 0, 6, 1, MITTEN_LIT],
				[x + (x < 10 ? -2 : 5), 1, 1, 1, MITTEN],
			)
		} else {
			rects.push(
				// A sleeve down his side and a mitten resting in his lap.
				[x, 14, 4, 8, COAT],
				[x, 14, 4, 1, COAT_LIT],
				[x + (x < 10 ? 3 : 0), 15, 1, 7, COAT_SHADE],
				[x, 18, 4, 1, COAT_SHADE],
				[x + (x < 10 ? 1 : -1), 22, 4, 3, MITTEN],
				[x + (x < 10 ? 1 : -1), 22, 4, 1, MITTEN_LIT],
			)
		}
	}
	arm(2, pose === 'left')
	arm(18, pose === 'right')
	return pixelArt(24, 30, rects)
}

/** The umpire sat with his hands in his lap. 24 by 30 cells. */
export const UMPIRE_REST = umpire('rest')
/** The umpire with his left-of-screen arm straight up, giving the left team the point. */
export const UMPIRE_LEFT = umpire('left')
/** The umpire with his right-of-screen arm straight up, giving the right team the point. */
export const UMPIRE_RIGHT = umpire('right')
export const UMPIRE_WIDTH = 24 * CELL
export const UMPIRE_HEIGHT = 30 * CELL
/** Down from the top of the picture to where his bottom rests on the seat. */
export const UMPIRE_SEAT_Y = 24 * CELL

/**
 * A tall wooden umpire's stand, as at the side of a volleyball net: two
 * splayed ladder legs with rungs, a seat platform at the top with a
 * backrest rail round it, and snow lying on the seat's edges and a few of the
 * rungs. 26 by 64 cells.
 */
function umpireStand() {
	const rects: PixelRect[] = [
		// The backrest: two posts and two rails.
		[3, 3, 2, 11, WOOD],
		[21, 3, 2, 11, WOOD],
		[3, 3, 1, 11, WOOD_LIT],
		[21, 3, 1, 11, WOOD_LIT],
		[3, 3, 20, 2, WOOD],
		[3, 3, 20, 1, WOOD_LIT],
		[3, 8, 20, 1, WOOD_SHADE],
		// The seat, lit on top and shaded underneath.
		[2, 14, 22, 3, WOOD],
		[2, 14, 22, 1, WOOD_LIT],
		[2, 16, 22, 1, WOOD_SHADE],
		[4, 17, 18, 1, WOOD_SHADE],
	]
	// The ladder legs splay out by four cells as they go down.
	for (let y = 17; y < 64; y++) {
		const out = Math.round(((y - 17) / 46) * 4)
		rects.push(
			[4 - out, y, 3, 1, WOOD],
			[4 - out, y, 1, 1, WOOD_LIT],
			[6 - out, y, 1, 1, WOOD_SHADE],
			[19 + out, y, 3, 1, WOOD],
			[19 + out, y, 1, 1, WOOD_LIT],
			[21 + out, y, 1, 1, WOOD_SHADE],
		)
	}
	// The rungs, and the feet.
	for (const y of [24, 32, 40, 48, 56]) {
		const out = Math.round(((y - 17) / 46) * 4)
		rects.push(
			[7 - out, y, 12 + out * 2, 2, WOOD_LIT],
			[7 - out, y + 1, 12 + out * 2, 1, WOOD_SHADE],
		)
	}
	rects.push([0, 62, 4, 2, WOOD_SHADE], [22, 62, 4, 2, WOOD_SHADE])
	rects.push(
		// Snow along the seat's edges, and on a few rungs.
		[2, 13, 4, 1, SNOW],
		[2, 14, 5, 1, SNOW],
		[20, 13, 4, 1, SNOW],
		[19, 14, 5, 1, SNOW],
		[3, 15, 2, 1, SNOW_SHADE],
		[21, 15, 2, 1, SNOW_SHADE],
		[8, 23, 6, 1, SNOW],
		[5, 31, 5, 1, SNOW],
		[14, 39, 6, 1, SNOW],
		[4, 55, 7, 1, SNOW],
		[3, 3, 3, 1, SNOW],
		[19, 3, 3, 1, SNOW],
	)
	return pixelArt(26, 64, rects)
}

export const UMPIRE_STAND = umpireStand()
export const UMPIRE_STAND_WIDTH = 26 * CELL
export const UMPIRE_STAND_HEIGHT = 64 * CELL
/** Down from the top of the picture to the top of the seat he sits on. */
export const UMPIRE_STAND_SEAT_Y = 14 * CELL

/**
 * A beach scoreboard on two wooden legs: a wooden frame round a plain
 * near-black blue panel, left clear for the score to be painted on, with
 * snow heaped along the top and a few icicles hanging from the bottom. 64 by
 * 40 cells; its panel is 52 by 18.
 */
export const SCOREBOARD = pixelArt(64, 40, [
	// Its two legs.
	[8, 32, 4, 8, WOOD],
	[8, 32, 1, 8, WOOD_LIT],
	[11, 32, 1, 8, WOOD_SHADE],
	[52, 32, 4, 8, WOOD],
	[52, 32, 1, 8, WOOD_LIT],
	[55, 32, 1, 8, WOOD_SHADE],
	[7, 39, 6, 1, SNOW],
	[51, 39, 6, 1, SNOW],
	// The frame, lit along its top and shaded along its bottom.
	[0, 5, 64, 27, WOOD],
	[0, 5, 64, 1, WOOD_LIT],
	[0, 6, 64, 1, WOOD_LIT],
	[0, 30, 64, 2, WOOD_SHADE],
	[0, 5, 1, 27, WOOD_LIT],
	[63, 6, 1, 26, WOOD_SHADE],
	// The panel.
	[6, 9, 52, 18, PANEL],
	// Bolts in the corners of the frame.
	[2, 7, 2, 2, WOOD_SHADE],
	[60, 7, 2, 2, WOOD_SHADE],
	[2, 28, 2, 2, WOOD_SHADE],
	[60, 28, 2, 2, WOOD_SHADE],
	// Snow lying along the top, in lumps.
	[0, 3, 64, 3, SNOW],
	[3, 2, 12, 1, SNOW],
	[20, 1, 10, 2, SNOW],
	[36, 2, 9, 1, SNOW],
	[49, 1, 11, 2, SNOW],
	[23, 0, 4, 1, SNOW],
	[52, 0, 5, 1, SNOW],
	[0, 5, 64, 1, SNOW_SHADE],
	[5, 6, 6, 1, SNOW],
	[40, 6, 8, 1, SNOW],
	// Icicles hanging from the frame's bottom edge.
	[16, 32, 1, 3, '#e4f2fa'],
	[16, 35, 1, 1, '#b8d8ea'],
	[30, 32, 2, 2, '#e4f2fa'],
	[30, 34, 1, 3, '#e4f2fa'],
	[31, 34, 1, 1, '#b8d8ea'],
	[43, 32, 1, 4, '#e4f2fa'],
	[43, 36, 1, 1, '#b8d8ea'],
	[47, 32, 1, 2, '#e4f2fa'],
])
export const SCOREBOARD_WIDTH = 64 * CELL
export const SCOREBOARD_HEIGHT = 40 * CELL
/** Where the dark panel sits in the picture, in pixels, for the score to be painted on. */
export const SCOREBOARD_PANEL = {
	x: 6 * CELL,
	y: 9 * CELL,
	width: 52 * CELL,
	height: 18 * CELL,
}
