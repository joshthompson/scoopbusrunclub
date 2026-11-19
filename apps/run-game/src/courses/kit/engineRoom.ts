import type { SecretPicture, SecretProp } from '../types'
import { fireProp } from './fire'
import {
	type PixelRect,
	pixelArt,
	pixelText,
	pixelTextWidth,
	svgUrl,
} from './pixelArt'

/**
 * Below decks on Scoop Cruises' ferry, drawn in code, in cells twice the
 * size of a screen pixel: the watertight door into the engine rooms, shut
 * and open, a sign by it; and in them, a generator and its control panel,
 * down under the shop; flames, and a fire extinguisher, on the wall,
 * nowhere near them. The tall hall's engines are in `engineHall.ts`, and
 * the rest of what's down there in `engineDeck.ts`.
 */

const CELL = 2

/** Engine-room green-grey, lit and in shadow; steel, and ink for the small details. */
const ENGINE = '#4f6b5e'
const ENGINE_LIT = '#6a8a7b'
const ENGINE_SHADE = '#3c5248'
const STEEL = '#8d949b'
const STEEL_LIT = '#b9c0c6'
const STEEL_DARK = '#5d646b'
const INK = '#1e2328'
const BRASS = '#c9a24a'
const BRASS_LIT = '#e8c66a'
const RED = '#c8312b'
const RED_LIT = '#e35a4b'
const RED_DARK = '#8f1f1b'
const HAZARD = '#f0c419'
const GLASS = '#e8f0e0'
const NEEDLE = '#c8312b'
/** Fire's red, for the warning on the door. */
const FIRE_RED = '#d8341b'

const prop = (
	columns: number,
	rows: number,
	frames: PixelRect[][],
	more: Partial<SecretProp> = {},
): SecretProp => ({
	frames: frames.map((rects) => pixelArt(columns, rows, rects)),
	width: columns * CELL,
	height: rows * CELL,
	...more,
})

// --- Fire ---------------------------------------------------------------------

/** Flames, licking up off the floor, or round the hole: see `kit/fire.ts`. */
export const FLAMES: SecretProp = fireProp({ columns: 20, rows: 32, seed: 1 })

// --- The low engine room ------------------------------------------------------

/**
 * A generator, down under the shop, where it's low: its engine, its
 * alternator, painted red, and their skid. 56 by 40.
 */
export const GENERATOR: SecretProp = prop(56, 40, [
	[
		// The skid.
		[0, 36, 56, 4, STEEL_DARK],
		[0, 36, 56, 1, STEEL],
		// Its engine, green-grey, its rocker cover lit.
		[2, 12, 30, 24, ENGINE],
		[2, 12, 30, 2, ENGINE_LIT],
		[2, 30, 30, 6, ENGINE_SHADE],
		[6, 6, 22, 6, STEEL],
		[6, 6, 22, 1, STEEL_LIT],
		// Its exhaust, up off it.
		[24, 0, 4, 6, STEEL_DARK],
		// The alternator, red, round-ended.
		[32, 14, 20, 20, RED],
		[32, 14, 20, 2, RED_LIT],
		[32, 30, 20, 4, RED_DARK],
		[52, 16, 2, 16, RED_DARK],
		// Its plate, and its cooling slots.
		[36, 20, 8, 4, BRASS],
		...[22, 26].map((y): PixelRect => [46, y, 4, 1, RED_DARK]),
		// The coupling between them.
		[30, 20, 4, 8, STEEL_DARK],
	],
])

/**
 * A control panel, on legs: gauges, brass-rimmed, a row of switches, and
 * a lamp blinking red, by `frame`. 26 by 34.
 */
const panelRects = (lit: boolean): PixelRect[] => [
	// Its legs, and its cabinet.
	[2, 30, 2, 4, STEEL_DARK],
	[22, 30, 2, 4, STEEL_DARK],
	[0, 0, 26, 30, STEEL],
	[0, 0, 26, 1, STEEL_LIT],
	[1, 1, 24, 28, '#7a8188'],
	// Its gauges.
	...[3, 15].flatMap((x): PixelRect[] => [
		[x, 3, 8, 8, BRASS],
		[x, 3, 8, 1, BRASS_LIT],
		[x + 1, 4, 6, 6, GLASS],
		[x + 3, 5, 1, 3, NEEDLE],
		[x + 4, 7, 2, 1, INK],
	]),
	// Its switches.
	...[3, 8, 13, 18].flatMap((x): PixelRect[] => [
		[x, 16, 4, 4, INK],
		[x + 1, 15, 2, 3, STEEL_LIT],
	]),
	// Its lamps: green, and red, blinking.
	[4, 23, 3, 3, '#3fbf5a'],
	[10, 23, 3, 3, lit ? '#ff3a2a' : '#6a1e1a'],
	[16, 23, 6, 3, INK],
]

export const CONTROL_PANEL: SecretProp = prop(26, 34, [
	panelRects(true),
	panelRects(false),
])

/** A fire extinguisher, red, on its bracket on the wall: 7 by 15. */
export const EXTINGUISHER: SecretProp = prop(
	7,
	15,
	[
		[
			[2, 0, 3, 2, INK],
			[0, 1, 3, 2, INK],
			[1, 3, 5, 12, RED],
			[1, 3, 5, 1, RED_LIT],
			[1, 12, 5, 3, RED_DARK],
			[2, 7, 3, 3, GLASS],
			[0, 9, 7, 1, STEEL_DARK],
		],
	],
	{ hung: 40 },
)

// --- The door -----------------------------------------------------------------

/** The door's frame and leaf, steel, and its wheel. */
const FRAME = '#6a7178'
const FRAME_LIT = '#9aa1a8'
const LEAF = '#8d949b'
const LEAF_LIT = '#b0b7bd'
const LEAF_SHADE = '#737a81'
const DOORWAY = '#2a211c'

const DOOR_COLUMNS = 24
const DOOR_ROWS = 42

/** Its frame, round the doorway, a sill to step over, and a hazard stripe on it. */
const doorFrame: PixelRect[] = [
	[0, 0, 24, 42, FRAME],
	[0, 0, 24, 1, FRAME_LIT],
	[0, 0, 1, 42, FRAME_LIT],
	[0, 38, 24, 4, INK],
	...[0, 4, 8, 12, 16, 20].map((x): PixelRect => [x, 39, 2, 2, HAZARD]),
]

/**
 * A watertight door, side on, into the engine rooms: shut, its leaf's
 * corners rounded, a wheel in its middle to turn, and its dogs either side.
 * 24 by 42.
 */
const doorShut = pixelArt(DOOR_COLUMNS, DOOR_ROWS, [
	...doorFrame,
	// The leaf, rounded at its corners.
	[3, 3, 18, 35, LEAF],
	[4, 2, 16, 1, LEAF],
	[3, 3, 18, 1, LEAF_LIT],
	[3, 34, 18, 4, LEAF_SHADE],
	// Its wheel.
	[8, 15, 8, 1, INK],
	[8, 22, 8, 1, INK],
	[7, 16, 1, 6, INK],
	[16, 16, 1, 6, INK],
	[11, 16, 2, 6, INK],
	[8, 18, 8, 2, INK],
	[11, 18, 2, 2, BRASS],
	// Its dogs, either side.
	...[8, 18, 28].flatMap((y): PixelRect[] => [
		[1, y, 3, 2, INK],
		[20, y, 3, 2, INK],
	]),
	// A warning, on it: yellow, a flame on it.
	[8, 6, 8, 6, HAZARD],
	[11, 7, 2, 4, FIRE_RED],
	[10, 9, 4, 2, FIRE_RED],
])

/**
 * The door, open: swung back against the wall, edge on, and through the
 * doorway, the engine rooms' firelight.
 */
const doorOpen = pixelArt(DOOR_COLUMNS, DOOR_ROWS, [
	...doorFrame,
	[3, 3, 18, 35, DOORWAY],
	// Firelight, up from the floor.
	[3, 30, 18, 8, '#5a2a14'],
	[3, 34, 18, 4, '#8a3c18'],
	// The leaf, swung back, edge on, its wheel showing past it.
	[1, 2, 4, 37, LEAF],
	[1, 2, 1, 37, LEAF_LIT],
	[4, 16, 2, 8, INK],
])

export const DOOR_SHUT: SecretPicture = {
	asset: doorShut,
	width: DOOR_COLUMNS * CELL,
	height: DOOR_ROWS * CELL,
}
export const DOOR_OPEN: SecretPicture = {
	asset: doorOpen,
	width: DOOR_COLUMNS * CELL,
	height: DOOR_ROWS * CELL,
}

/** A sign by the door: CREW ONLY, white on red, on the wall. */
const SIGN_TEXT = 'CREW ONLY'
const SIGN_WIDTH = pixelTextWidth(SIGN_TEXT, CELL) + 12
const SIGN_HEIGHT = 7 * CELL + 12
export const CREW_SIGN: SecretProp = {
	frames: [
		svgUrl(
			SIGN_WIDTH,
			SIGN_HEIGHT,
			[
				`<rect width="${SIGN_WIDTH}" height="${SIGN_HEIGHT}" fill="${RED}"/>`,
				`<rect width="${SIGN_WIDTH}" height="2" fill="${RED_LIT}"/>`,
				`<rect y="${SIGN_HEIGHT - 2}" width="${SIGN_WIDTH}" height="2" fill="${RED_DARK}"/>`,
				pixelText(SIGN_TEXT, 6, 6, CELL, '#f3f4f1'),
			].join(''),
		),
	],
	width: SIGN_WIDTH,
	height: SIGN_HEIGHT,
	hung: 52,
}
