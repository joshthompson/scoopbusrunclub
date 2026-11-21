import { type PixelRect, pixelArt } from './pixelArt'

/**
 * Paintbrush's abandoned warehouse (see `minigames/paintbrush`): the
 * steel catwalks bolted to its wall, a pallet hanging off a chain hoist,
 * a wooden crate and a pair of oil drums left in the yard. Drawn in cells
 * of 2 px, as everything is. The wall itself, and the yard, are drawn
 * where the minigame is (`draw/paintbrush`).
 */

const CELL = 2

/** The yard: cracked concrete, its path a little paler where it's been walked. */
export const YARD = '#6a6b6e'
export const YARD_SHADE = '#56575a'
export const YARD_PATH = '#8d8d88'
export const YARD_PATH_SHADE = '#74746f'
/** The sky, what there is of it over the roof: grey, overcast. */
export const WAREHOUSE_SKY_TOP = '#aebbc4'
export const WAREHOUSE_SKY_BOTTOM = '#d6dde1'

/** Galvanised steel, a little rusted. */
const STEEL_LIT = '#b3bcc3'
const STEEL = '#7b858d'
const STEEL_SHADE = '#525b63'
const STEEL_DARK = '#353c43'
const RUST = '#8c5a3c'
/** How tall a catwalk is drawn: its deck, then the brackets under it, bolted to the wall. */
export const CATWALK_DECK = 5 * CELL
const CATWALK_ROWS = 14

/**
 * A steel catwalk bolted to the wall, `width` px along: its grated deck,
 * lit along its top, and brackets down to plates on the wall under it,
 * one at either end and more between, a few spots of rust.
 */
export function catwalk(width: number) {
	const cols = Math.round(width / CELL)
	const rects: PixelRect[] = [
		// The deck: its lit top edge, its grating, its underside.
		[0, 0, cols, 1, STEEL_LIT],
		[0, 1, cols, 3, STEEL],
		[0, 4, cols, 1, STEEL_DARK],
	]
	for (let x = 1; x < cols - 1; x += 3) rects.push([x, 2, 2, 1, STEEL_SHADE])
	// Brackets under it: at either end, and every so often between.
	const between = Math.max(1, Math.round((cols - 8) / 60))
	for (let k = 0; k <= between; k++) {
		const x = Math.round(2 + ((cols - 8) * k) / between)
		rects.push(
			[x + 1, 5, 2, 7, STEEL],
			[x + 1, 5, 1, 7, STEEL_LIT],
			[x + 2, 5, 1, 7, STEEL_SHADE],
			[x, 11, 4, 3, STEEL_SHADE],
			[x, 11, 4, 1, STEEL],
			[x + 1, 12, 1, 1, STEEL_DARK],
		)
	}
	// Rust, here and there along its face.
	for (let x = 7; x < cols - 3; x += 19)
		rects.push([x, 3, 2, 1, RUST], [x + 1, 4, 1, 1, RUST])
	return {
		src: pixelArt(cols, CATWALK_ROWS, rects),
		width: cols * CELL,
		height: CATWALK_ROWS * CELL,
	}
}

/** Pallet wood: its lit top, its boards, and shaded. */
const WOOD_LIT = '#dcb782'
const WOOD = '#b98d55'
const WOOD_SHADE = '#8a6438'
const WOOD_DARK = '#5e4226'

/** The pallet on the chain hoist: how wide and tall. */
export const PALLET_WIDTH = 96
const PALLET_COLS = PALLET_WIDTH / CELL
const PALLET_ROWS = 9
/**
 * A wooden pallet, hanging off a chain hoist (its chain's the Platform's
 * cable): a deck of boards, three blocks under them, and a board along
 * the bottom; between the blocks, the wall behind showing through.
 */
export const PALLET = {
	src: pixelArt(PALLET_COLS, PALLET_ROWS, [
		// Its deck, the ends of its boards.
		[0, 0, PALLET_COLS, 1, WOOD_LIT],
		[0, 1, PALLET_COLS, 2, WOOD],
		...Array.from(
			{ length: 7 },
			(_, k): PixelRect => [6 + k * 6, 1, 1, 2, WOOD_SHADE],
		),
		// Its blocks, the wall between them.
		...[0, 21, 42].flatMap((x): PixelRect[] => [
			[x, 3, 6, 4, WOOD],
			[x, 3, 1, 4, WOOD_LIT],
			[x + 5, 3, 1, 4, WOOD_SHADE],
			[x + 2, 4, 2, 2, WOOD_DARK],
		]),
		// Its bottom board.
		[0, 7, PALLET_COLS, 1, WOOD],
		[0, 8, PALLET_COLS, 1, WOOD_SHADE],
	]),
	width: PALLET_WIDTH,
	height: PALLET_ROWS * CELL,
}

/** The crate in the yard, to jump over or stand on: how wide and tall. */
export const CRATE_WIDTH = 56
export const CRATE_HEIGHT = 44
const CRATE_COLS = CRATE_WIDTH / CELL
const CRATE_ROWS = CRATE_HEIGHT / CELL
/**
 * A big wooden shipping crate, left in the yard: planked, its frame round
 * it, braced corner to corner, a stencilled arrow on its side.
 */
export const CRATE = {
	src: pixelArt(CRATE_COLS, CRATE_ROWS, [
		[0, 0, CRATE_COLS, CRATE_ROWS, WOOD],
		// Its planks.
		...[5, 10, 15].map((y): PixelRect => [2, y, CRATE_COLS - 4, 1, WOOD_SHADE]),
		// The brace, corner to corner, in steps.
		...Array.from(
			{ length: CRATE_ROWS - 4 },
			(_, k): PixelRect => [
				Math.round(3 + (k * (CRATE_COLS - 9)) / (CRATE_ROWS - 5)),
				2 + k,
				3,
				1,
				k % 3 ? WOOD_LIT : WOOD,
			],
		),
		// Its frame: lit along the top and the left, shaded down the right and the bottom.
		[0, 0, CRATE_COLS, 2, WOOD_LIT],
		[0, 0, 2, CRATE_ROWS, WOOD_LIT],
		[CRATE_COLS - 2, 0, 2, CRATE_ROWS, WOOD_SHADE],
		[0, CRATE_ROWS - 2, CRATE_COLS, 2, WOOD_SHADE],
		[0, CRATE_ROWS - 1, CRATE_COLS, 1, WOOD_DARK],
		// "This way up", stencilled in the corner.
		[20, 4, 1, 4, WOOD_DARK],
		[19, 5, 3, 1, WOOD_DARK],
		[18, 6, 1, 1, WOOD_DARK],
		[22, 6, 1, 1, WOOD_DARK],
	]),
	width: CRATE_WIDTH,
	height: CRATE_HEIGHT,
}

/** The oil drums in the yard: how wide the pair of them, and how tall. */
export const DRUMS_WIDTH = 44
export const DRUMS_HEIGHT = 40
const DRUM_COLS = 11
const DRUM_ROWS = DRUMS_HEIGHT / CELL
const DRUM = '#3f6ea8'
const DRUM_LIT = '#6e98cc'
const DRUM_SHADE = '#2b4f7e'
const DRUM_RIM = '#9fbad9'
/** One oil drum, `x` cells along: blue, ribbed, rusting. */
const drum = (x: number): PixelRect[] => [
	[x, 0, DRUM_COLS, DRUM_ROWS, DRUM],
	[x + 1, 0, 2, DRUM_ROWS, DRUM_LIT],
	[x + DRUM_COLS - 3, 0, 3, DRUM_ROWS, DRUM_SHADE],
	// Its rim, and its two ribs.
	[x, 0, DRUM_COLS, 1, DRUM_RIM],
	[x, 1, DRUM_COLS, 1, DRUM_SHADE],
	[x, 7, DRUM_COLS, 1, DRUM_SHADE],
	[x, 13, DRUM_COLS, 1, DRUM_SHADE],
	[x, DRUM_ROWS - 1, DRUM_COLS, 1, DRUM_SHADE],
	// Rust, round its foot and up a seam.
	[x + 4, DRUM_ROWS - 3, 3, 2, RUST],
	[x + 7, 9, 1, 3, RUST],
]
/** Two oil drums side by side, left in the yard, to jump over or stand on. */
export const DRUMS = {
	src: pixelArt(DRUMS_WIDTH / CELL, DRUM_ROWS, [...drum(0), ...drum(11)]),
	width: DRUMS_WIDTH,
	height: DRUMS_HEIGHT,
}

/** Weathered plank: grey with age, rotting. */
const PLANK_LIT = '#b5a48a'
const PLANK_WOOD = '#9b8a72'
const PLANK_SHADE = '#6f604d'
const PLANK_ROT = '#4a3f33'
/** The rotten plank: how wide. */
export const PLANK_WIDTH = 96
const PLANK_COLS = PLANK_WIDTH / CELL
const PLANK_ROWS = 9
/**
 * A rotten plank, laid across two rusty brackets bolted to the wall: grey
 * with age, split along its grain, a chunk gone out of its edge. Stand on
 * it, and it crumbles (see `minigames/paintbrush`).
 */
export const PLANK = {
	src: pixelArt(PLANK_COLS, PLANK_ROWS, [
		[0, 0, PLANK_COLS, 1, PLANK_LIT],
		[0, 1, PLANK_COLS, 3, PLANK_WOOD],
		[0, 4, PLANK_COLS, 1, PLANK_SHADE],
		// Split along it, and rotten through in places.
		[6, 2, 14, 1, PLANK_ROT],
		[26, 1, 1, 3, PLANK_ROT],
		[30, 3, 12, 1, PLANK_SHADE],
		[18, 4, 6, 1, PLANK_ROT],
		[38, 0, 4, 1, PLANK_WOOD],
		// Its brackets, rusting.
		...[6, PLANK_COLS - 9].flatMap((x): PixelRect[] => [
			[x, 5, 3, 1, RUST],
			[x + 1, 6, 2, 1, RUST],
			[x + 2, 7, 1, 2, RUST],
			[x, 5, 1, 4, '#6e4630'],
		]),
	]),
	width: PLANK_WIDTH,
	height: PLANK_ROWS * CELL,
}

/** The paint can: how wide and tall. */
export const PAINT_CAN_WIDTH = 22
export const PAINT_CAN_HEIGHT = 26
const TIN_LIT = '#e4e9ec'
const TIN = '#b8c0c6'
const TIN_SHADE = '#838c93'
const HANDLE = '#4a5157'
/**
 * A tin of paint, its lid off, to pick up for a big brush: a wire handle
 * over it, rainbow stripes round its label, and every colour there is
 * dribbling down its side from the lip.
 */
export const PAINT_CAN = {
	src: pixelArt(PAINT_CAN_WIDTH / CELL, PAINT_CAN_HEIGHT / CELL, [
		// Its handle, up over it.
		[2, 0, 7, 1, HANDLE],
		[1, 1, 1, 2, HANDLE],
		[9, 1, 1, 2, HANDLE],
		// The tin, its rim and the paint in it.
		[0, 3, 11, 10, TIN],
		[1, 3, 2, 10, TIN_LIT],
		[9, 3, 2, 10, TIN_SHADE],
		[0, 3, 11, 1, TIN_LIT],
		[1, 4, 9, 1, '#f2c230'],
		// Its label, striped.
		[0, 7, 11, 1, '#e8423f'],
		[0, 8, 11, 1, '#f28c28'],
		[0, 9, 11, 1, '#3fb950'],
		[0, 10, 11, 1, '#3f7fe8'],
		[0, 11, 11, 1, '#a35de8'],
		[0, 12, 11, 1, TIN_SHADE],
		// Dribbles down it, from the lip.
		[2, 5, 1, 3, '#e8423f'],
		[5, 5, 1, 2, '#3f7fe8'],
		[7, 5, 1, 4, '#3fb950'],
	]),
	width: PAINT_CAN_WIDTH,
	height: PAINT_CAN_HEIGHT,
}
