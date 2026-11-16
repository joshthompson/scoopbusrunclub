import type { CaveTiles } from '../types'
import { tile } from './pixelArt'

/**
 * Halloween Town's haunted house, drawn in code: its outside, its rooms'
 * walls, what's in them, and what lives in its attic. Tiles, features and
 * the moving parts are in world pixels; scenery is a cell to a pixel,
 * drawn twice its size (`scale: 2`).
 *
 * The house's floors, for its tiles to line up with (see `CaveTiles`): the
 * ground floor at y 300, its ceiling at 140; the upper floor at 180; the
 * attic's floor at 80, its underside 96, and its roof at -60.
 */

// --- Its outside ------------------------------------------------------------

const SIDING = '#3d3448'
const SIDING_LIT = '#4d4259'
const SIDING_SHADE = '#2c2535'
const TRIM = '#5b5068'
const STONE = '#4b4a52'
const STONE_LIT = '#5e5d66'
const STONE_SEAM = '#33323a'
const PANE = '#e9b23f'
const PANE_LIT = '#ffd56b'
const PANE_DARK = '#9c6a1e'
const FRAME = '#211b28'

/**
 * Its siding, 96 by 120, a storey to a tile: clapboards, each lit along its
 * top and shaded under, and a tall window, lit from inside, its frame dark.
 */
function sidingTile() {
	const t = tile(96, 120)
	t.rect(0, 0, 96, 120, SIDING)
	for (let y = 0; y < 120; y += 8) {
		t.rect(0, y, 96, 2, SIDING_LIT)
		t.rect(0, y + 6, 96, 2, SIDING_SHADE)
	}
	// A window a storey, its middle 70 down the floor under it: the floors
	// are 120 apart, at 180 and 300, both 60 down a tile.
	t.rect(32, 76, 32, 70, FRAME)
	t.rect(36, 80, 10, 28, PANE)
	t.rect(50, 80, 10, 28, PANE)
	t.rect(36, 112, 10, 28, PANE)
	t.rect(50, 112, 10, 28, PANE)
	t.rect(36, 80, 10, 4, PANE_LIT)
	t.rect(50, 80, 10, 4, PANE_LIT)
	t.rect(36, 136, 24, 4, PANE_DARK)
	// Its sill, and its lintel.
	t.rect(28, 144, 40, 4, TRIM)
	t.rect(28, 72, 40, 4, TRIM)
	return { asset: t.url(), width: 96, height: 120 }
}

/**
 * Its front under the path, 96 by 240: under the upper floor, the storey
 * under it, sided and windowed as over it (from 200 down to 320, a tile's
 * 200 to 80); and its stone foundations, from the ground floor's path's
 * front edge, 320, down.
 */
function frontTile() {
	const t = tile(96, 240)
	// The storey: y 200 to 320, a tile's 200 round to 80.
	for (let y = 200; y < 320; y += 8) {
		t.rect(0, y % 240, 96, 8, SIDING)
		t.rect(0, y % 240, 96, 2, SIDING_LIT)
		t.rect(0, (y + 6) % 240, 96, 2, SIDING_SHADE)
	}
	t.rect(32, 216, 32, 70, FRAME)
	for (const [x, y] of [
		[36, 220],
		[50, 220],
		[36, 252],
		[50, 252],
	])
		t.rect(x, y % 240, 10, 28, PANE)
	t.rect(28, 284 % 240, 40, 4, TRIM)
	// The foundations: rough stone, from 80 down to where the storey over
	// them starts again.
	t.rect(0, 80, 96, 120, STONE)
	t.rect(0, 80, 96, 2, STONE_LIT)
	for (const [x, y, w] of [
		[0, 92, 30],
		[40, 100, 36],
		[14, 112, 28],
		[60, 120, 30],
		[4, 134, 40],
	]) {
		t.rect(x, y, w, 2, STONE_SEAM)
		t.rect(x, y - 2, 2, 2, STONE_LIT)
	}
	return { asset: t.url(), width: 96, height: 240 }
}

// --- Its walls, inside --------------------------------------------------------

/**
 * A ground floor room's walls, 96 by 240, from its ceiling at 140 (a tile's
 * 140) down to its floor at 300 (a tile's 60): wallpaper, in stripes, a
 * moulding along the top, and a dark wainscot under a rail, its skirting
 * on the floor.
 */
function groundFloorTile(paper: string, stripe: string) {
	const t = tile(96, 240)
	t.rect(0, 0, 96, 240, paper)
	for (const x of [0, 24, 48, 72]) t.rect(x + 8, 0, 4, 240, stripe)
	// The moulding, under the ceiling.
	t.rect(0, 140, 96, 6, TRIM)
	t.rect(0, 146, 96, 2, SIDING_SHADE)
	// The wainscot, from 250 (10) to the floor.
	t.rect(0, 10, 96, 50, WAINSCOT)
	t.rect(0, 8, 96, 4, WAINSCOT_LIT)
	for (const x of [8, 56]) t.rect(x, 18, 32, 28, WAINSCOT_DARK)
	t.rect(0, 36, 96, 6, SKIRTING)
	return { asset: t.url(), width: 96, height: 240 }
}

const WAINSCOT = '#3a2a22'
const WAINSCOT_LIT = '#5a4234'
const WAINSCOT_DARK = '#2b1f19'
const SKIRTING = '#1f1712'
const PLANK = '#4a3a2e'
const PLANK_SEAM = '#33281f'
const PLANK_LIT = '#5c4a3b'

/** The stairwell's walls, 96 by 240: wallpaper, plum, in a diamond pattern, all the way up. */
function stairwellTile() {
	const t = tile(96, 240)
	t.rect(0, 0, 96, 240, '#4b2f4e')
	for (let y = 0; y < 240; y += 24)
		for (let x = (y / 24) % 2 ? 12 : 0; x < 96; x += 24)
			t.rect(x + 10, y + 10, 4, 4, '#61405f')
	return { asset: t.url(), width: 96, height: 240 }
}

/**
 * The upper floor's walls, 96 by 240, and the attic's over them: bare
 * planks up under the roof, from -60 (a tile's 180) to the attic's floor at
 * 80; its beam, to 96; then the rooms' wallpaper, peeling, down to the
 * skirting on the floor at 180.
 */
function upperTile() {
	const t = tile(96, 240)
	// The attic: planks, up and down, gaps between.
	t.rect(0, 180, 96, 60, PLANK)
	t.rect(0, 0, 96, 80, PLANK)
	for (const x of [0, 16, 32, 48, 64, 80]) {
		t.rect(x, 180, 2, 60, PLANK_SEAM)
		t.rect(x, 0, 2, 80, PLANK_SEAM)
		t.rect(x + 2, 180, 2, 60, PLANK_LIT)
	}
	// The beam its floor's laid on.
	t.rect(0, 80, 96, 16, '#2b1f19')
	t.rect(0, 80, 96, 2, '#3e2e24')
	// The rooms: faded green paper, a pattern of small flowers, peeling.
	t.rect(0, 96, 96, 66, '#4c5a45')
	for (const [x, y] of [
		[8, 104],
		[32, 118],
		[56, 104],
		[80, 118],
		[20, 134],
		[68, 134],
	])
		t.rect(x, y, 4, 4, '#677560')
	t.rect(40, 98, 10, 14, '#7a6a52')
	t.rect(40, 98, 10, 2, '#8f7e64')
	t.rect(0, 154, 96, 8, SKIRTING)
	return { asset: t.url(), width: 96, height: 240 }
}

const SIDING_TILE = sidingTile()
const FRONT_TILE = frontTile()

/** Seen from outside, its siding; under its floors, its foundations; and its walls inside, room by room. */
export const HALL_TILES: CaveTiles = {
	rock: SIDING_TILE,
	front: FRONT_TILE,
	wall: groundFloorTile('#33402f', '#2b3628'),
}
export const PARLOUR_TILES: CaveTiles = {
	rock: SIDING_TILE,
	front: FRONT_TILE,
	wall: groundFloorTile('#5a2630', '#4a1f28'),
}
export const STAIRWELL_TILES: CaveTiles = {
	rock: SIDING_TILE,
	front: FRONT_TILE,
	wall: stairwellTile(),
}
export const UPPER_TILES: CaveTiles = {
	rock: SIDING_TILE,
	front: FRONT_TILE,
	wall: upperTile(),
}

/** Its roof, in bands along the top of it, under its edge: slate, lit, and its shadow. */
export const ROOF_BANDS: [height: number, colour: string][] = [
	[4, '#5a4b66'],
	[14, '#2a2233'],
	[6, '#1a1520'],
]

// --- On it, and in it ---------------------------------------------------------

export {
	BANISTER,
	CHIMNEY,
	FRONT_DOOR,
	GRAVE_MOUND,
	TURRET,
	WINDOW,
} from './hauntedHouseOutside'
export {
	BOOKCASE,
	CHANDELIER,
	PORTRAIT,
	TOPPLED_CHAIR,
	armchair,
	bed,
	candelabra,
	fireplace,
	grandfatherClock,
	rockingHorse,
	trunk,
	wardrobe,
} from './hauntedHouseFurniture'
export { HOUSE_GHOST, MONSTER } from './hauntedHouseMonster'

/** Glass flying, smashed: its colour, and the light on it. */
export const GLASS = '#a9c8d8'
export const GLASS_LIT = '#e8f6ff'
/** Earth, flung up out of the grave. */
export const EARTH = '#4a3628'
export const EARTH_LIT = '#6a4e3a'
