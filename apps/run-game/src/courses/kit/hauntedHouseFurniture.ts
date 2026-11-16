import { type PixelRect, pixelArt } from './pixelArt'

/**
 * What's in the haunted house's rooms, drawn in code: the hall's clock,
 * the parlour's fire and armchair, candles, the bedroom's bed and
 * wardrobe, the nursery's rocking horse, a trunk in the attic, the
 * family's portraits, the stairwell's chandelier, the landing's bookcase
 * and a chair knocked over in the hall. Old, dusty and dark, cobwebbed,
 * lit by candles. Scenery is a cell to a pixel, drawn twice its size
 * (`scale: 2`); what says so is in world pixels, drawn at half that in
 * cells, a cell two pixels, as everything else is.
 */

// --- Shared colours ---------------------------------------------------------

const INK = '#1d1a1c'
/** Mahogany, dark and dusty, its top lit. */
const WOOD = '#5f3d2e'
const WOOD_LIT = '#7d5641'
const WOOD_SHADE = '#452a20'
const WOOD_DARK = '#2c1a14'
/** Dust, settled on its tops. */
const DUST = '#8f8478'
/** Cobwebs. */
const WEB = '#b9b4c4'
/** Brass, tarnished. */
const BRASS = '#a3834a'
const BRASS_LIT = '#cfae6a'
const BRASS_DARK = '#6c5530'
/** Candle wax, old, and its light. */
const WAX = '#e3d8bf'
const WAX_SHADE = '#b8ab8e'
const FLAME = '#ffd56b'
const FLAME_TIP = '#fff1b8'
const EMBER = '#e9b23f'
const EMBER_ORANGE = '#d9672b'
const EMBER_RED = '#8e2f1e'
/** A candle's glow, on the air round it. */
const GLOW = '#ffd56b1a'
/** Velvet, red, faded, worn through to its stuffing. */
const VELVET = '#874650'
const VELVET_LIT = '#a4646a'
const VELVET_SHADE = '#5f2e37'
const STUFFING = '#d6cdb6'
/** Bone. */
const BONE = '#d8d0bc'
const BONE_SHADE = '#a59b86'
/** Black iron. */
const IRON = '#3b3640'
const IRON_LIT = '#5d5765'
/** Dark inside a cupboard, or in a door left open. */
const GAP = '#120d0f'

/** A candle's flame, 2 cells wide and 3 tall, its top left at `x`, `y`, and its glow round it. */
const flame = (x: number, y: number): PixelRect[] => [
	[x - 2, y, 6, 4, GLOW],
	[x - 1, y - 1, 4, 6, GLOW],
	[x, y + 1, 2, 2, FLAME],
	[x, y, 1, 1, FLAME_TIP],
	[x + 1, y + 2, 1, 1, EMBER],
]

/** A cobweb, in a corner, its strands out `size` cells each way: to the right and down (`flip` for to the left). */
const cobweb = (
	x: number,
	y: number,
	size: number,
	flip = false,
): PixelRect[] => {
	const s = flip ? -1 : 1
	const rects: PixelRect[] = [
		[flip ? x - size + 1 : x, y, size, 1, WEB],
		[x, y, 1, size, WEB],
	]
	// The strand across the corner, and the diagonal from it.
	for (let i = 1; i < size - 1; i++) rects.push([x + s * i, y + i, 1, 1, WEB])
	rects.push([x + s * (size - 2), y + 1, 1, 1, WEB])
	rects.push([x + s, y + size - 2, 1, 1, WEB])
	return rects
}

// --- Scenery, a cell a pixel -------------------------------------------------

/**
 * A grandfather clock, its case mahogany: a pale face under its hood, a
 * brass pendulum behind the glass of its door, a cobweb in its corner, and
 * dust on its cornice: 14 by 44.
 */
export const grandfatherClock = pixelArt(14, 44, [
	// Its hood: a finial, a pediment, the cornice.
	[6, 0, 2, 1, BRASS_LIT],
	[3, 1, 8, 2, WOOD],
	[3, 1, 8, 1, WOOD_LIT],
	[0, 3, 14, 2, WOOD],
	[0, 3, 14, 1, WOOD_LIT],
	[2, 3, 3, 1, DUST],
	[9, 3, 2, 1, DUST],
	[1, 5, 12, 10, WOOD],
	[12, 5, 1, 10, WOOD_SHADE],
	[1, 5, 12, 1, WOOD_DARK],
	// Its face, its hours and its hands, stopped.
	[4, 6, 6, 8, '#d6ccb2'],
	[3, 7, 8, 6, '#d6ccb2'],
	[4, 13, 6, 1, '#ada38a'],
	[6, 7, 2, 1, '#8f8670'],
	[4, 10, 1, 1, '#8f8670'],
	[9, 10, 1, 1, '#8f8670'],
	[6, 12, 2, 1, '#8f8670'],
	[6, 8, 1, 3, INK],
	[7, 9, 2, 1, INK],
	// Under its hood, its waist, and its door's glass, dark.
	[1, 15, 12, 1, WOOD_DARK],
	[2, 16, 10, 20, WOOD],
	[11, 16, 1, 20, WOOD_SHADE],
	[3, 17, 8, 1, WOOD_LIT],
	[4, 18, 6, 15, '#1e1a20'],
	// The pendulum, behind it.
	[7, 18, 1, 10, BRASS_DARK],
	[6, 28, 3, 3, BRASS],
	[5, 29, 5, 1, BRASS],
	[6, 28, 3, 1, BRASS_LIT],
	// A glint on the glass, and a cobweb in its corner.
	[9, 20, 1, 3, '#3a3844'],
	...cobweb(4, 18, 4),
	// Its base, panelled, on its feet.
	[0, 36, 14, 2, WOOD],
	[0, 36, 14, 1, WOOD_LIT],
	[1, 38, 12, 5, WOOD],
	[3, 39, 8, 3, WOOD_SHADE],
	[3, 41, 8, 1, WOOD_LIT],
	[12, 38, 1, 5, WOOD_SHADE],
	[1, 43, 3, 1, WOOD_DARK],
	[10, 43, 3, 1, WOOD_DARK],
])

const STONE = '#6e6873'
const STONE_LIT = '#8a8490'
const STONE_SHADE = '#524c58'
const STONE_DARK = '#3a3540'

/**
 * The parlour's fireplace, grey stone, cracked: a low fire in its grate,
 * logs burnt down to embers; on its mantel a candlestick, lit, and a
 * skull; a cobweb hanging under the mantel: 40 by 36.
 */
export const fireplace = pixelArt(40, 36, [
	// A candlestick, at one end of the mantel.
	...flame(5, 0),
	[5, 3, 2, 5, WAX],
	[6, 3, 1, 5, WAX_SHADE],
	[4, 5, 1, 2, WAX],
	[4, 8, 4, 1, BRASS_LIT],
	[3, 9, 6, 1, BRASS],
	// A skull, at the other.
	[29, 4, 5, 1, BONE],
	[28, 5, 7, 3, BONE],
	[29, 8, 5, 2, BONE],
	[34, 5, 1, 3, BONE_SHADE],
	[33, 8, 1, 2, BONE_SHADE],
	[29, 6, 2, 1, INK],
	[30, 7, 1, 1, INK],
	[32, 6, 2, 1, INK],
	[32, 7, 1, 1, INK],
	[31, 8, 1, 1, INK],
	[30, 9, 1, 1, BONE_SHADE],
	[32, 9, 1, 1, BONE_SHADE],
	// The mantel shelf, lit along its top, dust on it.
	[0, 10, 40, 2, STONE],
	[0, 10, 40, 1, STONE_LIT],
	[12, 10, 4, 1, DUST],
	[22, 10, 3, 1, DUST],
	[1, 12, 38, 1, STONE_DARK],
	// The surround: its lintel, a keystone, and pillars.
	[2, 13, 36, 20, STONE],
	[2, 13, 36, 1, STONE_SHADE],
	[19, 14, 2, 3, STONE_LIT],
	[4, 15, 1, 17, STONE_SHADE],
	[35, 15, 1, 17, STONE_SHADE],
	[37, 13, 1, 20, STONE_SHADE],
	// Cracks.
	[6, 23, 1, 2, STONE_DARK],
	[7, 25, 1, 2, STONE_DARK],
	[32, 17, 1, 2, STONE_DARK],
	// The hearth's opening, sooty.
	[10, 19, 20, 14, '#141015'],
	[12, 18, 16, 1, '#141015'],
	// The fire, low: its glow, logs, embers and a few flames.
	[11, 22, 18, 10, '#e9b23f14'],
	[13, 28, 9, 2, '#3a2418'],
	[18, 27, 9, 2, '#2e1c13'],
	[14, 28, 2, 1, EMBER_RED],
	[20, 27, 3, 1, EMBER_ORANGE],
	[24, 28, 2, 1, EMBER],
	[17, 29, 3, 1, EMBER_RED],
	[16, 25, 2, 3, EMBER_ORANGE],
	[16, 24, 1, 1, EMBER],
	[21, 24, 2, 3, EMBER],
	[21, 23, 1, 1, FLAME],
	[22, 26, 1, 1, FLAME],
	[25, 26, 1, 2, EMBER_ORANGE],
	// Its grate, iron, and ash under it.
	[12, 30, 16, 1, IRON_LIT],
	[13, 31, 1, 2, IRON],
	[26, 31, 1, 2, IRON],
	[14, 32, 12, 1, '#4a4449'],
	// The hearth stone, in front.
	[0, 33, 40, 3, STONE],
	[0, 33, 40, 1, STONE_LIT],
	[0, 35, 40, 1, STONE_SHADE],
	// A cobweb, under the mantel's end.
	...cobweb(37, 13, 4, true),
])

/**
 * A wingback armchair, red velvet gone dull, torn: its stuffing out of its
 * back, its arm and its seat: 18 by 22.
 */
export const armchair = pixelArt(18, 22, [
	// Its back.
	[4, 0, 10, 1, VELVET_LIT],
	[3, 1, 12, 11, VELVET],
	[6, 3, 1, 1, VELVET_SHADE],
	[11, 3, 1, 1, VELVET_SHADE],
	[6, 7, 1, 1, VELVET_SHADE],
	// Its wings, and its arms under them, rolled.
	[0, 3, 4, 14, VELVET],
	[14, 3, 4, 14, VELVET],
	[0, 3, 4, 1, VELVET_LIT],
	[14, 3, 4, 1, VELVET_LIT],
	[3, 4, 1, 8, VELVET_SHADE],
	[14, 4, 1, 8, VELVET_SHADE],
	[0, 10, 4, 1, VELVET_LIT],
	[14, 10, 4, 1, VELVET_LIT],
	[17, 4, 1, 13, VELVET_SHADE],
	// Its seat.
	[4, 12, 10, 4, VELVET],
	[4, 12, 10, 1, VELVET_LIT],
	// Its skirt, in shadow.
	[1, 16, 16, 3, VELVET_SHADE],
	// Its legs, turned.
	[2, 19, 2, 3, WOOD],
	[14, 19, 2, 3, WOOD],
	[2, 19, 2, 1, WOOD_LIT],
	[14, 19, 2, 1, WOOD_LIT],
	// Torn, and its stuffing out.
	[8, 4, 1, 3, VELVET_SHADE],
	[9, 4, 3, 2, STUFFING],
	[10, 6, 1, 1, STUFFING],
	[1, 11, 2, 1, STUFFING],
	[6, 13, 3, 1, STUFFING],
	[5, 13, 1, 1, VELVET_SHADE],
])

/**
 * A little side table, and on it a candelabra, brass, three candles lit,
 * their wax run down them, dripped on the table: 16 by 28.
 */
export const candelabra = pixelArt(16, 28, [
	// The candles, their flames, the wax run down them.
	...flame(7, 0),
	...flame(2, 2),
	...flame(12, 2),
	[7, 3, 2, 5, WAX],
	[8, 3, 1, 5, WAX_SHADE],
	[6, 6, 1, 3, WAX],
	[2, 5, 2, 4, WAX],
	[3, 5, 1, 4, WAX_SHADE],
	[12, 5, 2, 4, WAX],
	[13, 5, 1, 4, WAX_SHADE],
	[14, 8, 1, 3, WAX],
	// The candelabra: its cups, its arms, its stem and its foot.
	[6, 8, 4, 1, BRASS_LIT],
	[1, 9, 4, 1, BRASS_LIT],
	[11, 9, 4, 1, BRASS_LIT],
	[2, 10, 2, 1, BRASS],
	[12, 10, 2, 1, BRASS],
	[2, 11, 12, 1, BRASS],
	[7, 9, 2, 5, BRASS],
	[8, 9, 1, 5, BRASS_DARK],
	[5, 14, 6, 2, BRASS],
	[6, 14, 4, 1, BRASS_LIT],
	// The table: its top, wax on it, its apron, its legs and a shelf.
	[1, 16, 14, 2, WOOD],
	[1, 16, 14, 1, WOOD_LIT],
	[12, 16, 2, 1, WAX],
	[2, 18, 12, 2, WOOD_SHADE],
	[3, 20, 2, 8, WOOD],
	[11, 20, 2, 8, WOOD],
	[4, 20, 1, 8, WOOD_SHADE],
	[12, 20, 1, 8, WOOD_SHADE],
	[5, 24, 6, 1, WOOD_SHADE],
	[2, 27, 3, 1, WOOD_SHADE],
	[11, 27, 3, 1, WOOD_SHADE],
])

const SHEET = '#c9c1ae'
const SHEET_LIT = '#ddd5c2'
const SHEET_SHADE = '#a39a86'
const COVER = '#6d5a6b'
const COVER_LIT = '#86717f'
const COVER_SHADE = '#4f404e'

/**
 * An old bed, its head- and footboards carved, its sheets grey and ragged
 * and its coverlet moth-eaten; and a lump under it, very still: 44 by 24.
 */
export const bed = pixelArt(44, 24, [
	// Its headboard, carved, arched.
	[2, 0, 2, 1, WOOD_LIT],
	[1, 1, 4, 2, WOOD],
	[1, 1, 1, 1, WOOD_LIT],
	[4, 1, 1, 1, WOOD_LIT],
	[0, 3, 6, 21, WOOD],
	[0, 3, 1, 1, WOOD_LIT],
	[5, 3, 1, 1, WOOD_LIT],
	[1, 6, 4, 8, WOOD_SHADE],
	[2, 8, 2, 2, WOOD_LIT],
	[5, 4, 1, 20, WOOD_SHADE],
	// Its footboard, lower.
	[40, 5, 2, 1, WOOD_LIT],
	[39, 6, 4, 2, WOOD],
	[39, 6, 1, 1, WOOD_LIT],
	[42, 6, 1, 1, WOOD_LIT],
	[38, 8, 6, 16, WOOD],
	[38, 8, 1, 1, WOOD_LIT],
	[43, 8, 1, 1, WOOD_LIT],
	[39, 10, 4, 5, WOOD_SHADE],
	[40, 11, 2, 2, WOOD_LIT],
	[43, 9, 1, 15, WOOD_SHADE],
	// The rail between them.
	[6, 18, 32, 2, WOOD_SHADE],
	// The sheet, grey, ragged where it hangs, and the pillow on it.
	[6, 12, 32, 6, SHEET_SHADE],
	[6, 18, 3, 1, SHEET_SHADE],
	[7, 19, 1, 1, SHEET_SHADE],
	[10, 18, 2, 2, SHEET_SHADE],
	[8, 10, 5, 1, SHEET_LIT],
	[7, 11, 7, 2, SHEET_LIT],
	[7, 13, 7, 1, SHEET],
	// The coverlet, over the lump: higher at its shoulder.
	[19, 8, 5, 1, COVER_LIT],
	[18, 9, 8, 1, COVER],
	[18, 9, 1, 1, COVER_LIT],
	[24, 9, 3, 1, COVER_LIT],
	[26, 10, 4, 1, COVER_LIT],
	[14, 11, 24, 1, COVER_LIT],
	[17, 10, 9, 1, COVER],
	[13, 12, 25, 6, COVER],
	[13, 11, 1, 1, COVER_LIT],
	[18, 11, 12, 1, COVER],
	[13, 18, 25, 1, COVER],
	[13, 19, 4, 1, COVER_SHADE],
	[19, 19, 4, 2, COVER_SHADE],
	[25, 19, 3, 1, COVER_SHADE],
	[30, 19, 5, 2, COVER_SHADE],
	[36, 19, 2, 1, COVER_SHADE],
	[13, 17, 25, 1, COVER_SHADE],
	// Moth holes.
	[31, 14, 2, 1, COVER_SHADE],
	[17, 16, 1, 1, COVER_SHADE],
	[25, 13, 1, 1, COVER_SHADE],
])

/**
 * A wardrobe, tall and dark, its doors panelled: one open a crack, black
 * inside, and two eyes in it. Dust along its top, a cobweb: 22 by 46.
 */
export const wardrobe = pixelArt(22, 46, [
	// Its cornice, a crest over it, dust on it.
	[3, 0, 16, 1, WOOD_LIT],
	[0, 1, 22, 3, WOOD],
	[0, 1, 22, 1, WOOD_LIT],
	[4, 1, 5, 1, DUST],
	[14, 0, 3, 1, DUST],
	[1, 4, 20, 1, WOOD_DARK],
	// Its body.
	[1, 5, 20, 35, WOOD],
	[20, 5, 1, 35, WOOD_SHADE],
	// Its left door's panels, and its handle.
	[3, 7, 6, 14, WOOD_SHADE],
	[3, 20, 6, 1, WOOD_LIT],
	[3, 24, 6, 13, WOOD_SHADE],
	[3, 36, 6, 1, WOOD_LIT],
	[8, 22, 1, 2, BRASS],
	// The gap, its right door open a crack, and what's in there.
	[10, 6, 3, 33, GAP],
	[10, 15, 1, 1, '#e3dc78'],
	[12, 15, 1, 1, '#e3dc78'],
	[13, 6, 1, 33, WOOD_LIT],
	// Its right door's panels, and its handle.
	[15, 7, 4, 14, WOOD_SHADE],
	[15, 20, 4, 1, WOOD_LIT],
	[15, 24, 4, 13, WOOD_SHADE],
	[15, 36, 4, 1, WOOD_LIT],
	[14, 22, 1, 2, BRASS],
	// A cobweb, under its cornice.
	...cobweb(19, 5, 4, true),
	// Its plinth, and its feet.
	[0, 40, 22, 4, WOOD],
	[0, 40, 22, 1, WOOD_LIT],
	[0, 43, 22, 1, WOOD_SHADE],
	[1, 44, 3, 2, WOOD_SHADE],
	[18, 44, 3, 2, WOOD_SHADE],
])

const HORSE = '#b8ad98'
const HORSE_LIT = '#cdc3ae'
const HORSE_SHADE = '#93887a'
const BARE_WOOD = '#7a5a40'
const MANE = '#3a2b22'
const ROCKER = '#6e3a2e'
const ROCKER_SHADE = '#4e2820'

/**
 * A rocking horse, wooden, facing left: dapple grey gone yellow, its
 * paint peeling to the wood, a red saddle, a horsehair mane, on red
 * rockers: 22 by 18.
 */
export const rockingHorse = pixelArt(22, 18, [
	// Its rockers.
	[0, 14, 2, 1, ROCKER],
	[1, 15, 3, 1, ROCKER],
	[3, 16, 16, 1, ROCKER],
	[4, 17, 14, 1, ROCKER_SHADE],
	[18, 15, 3, 1, ROCKER],
	[20, 14, 2, 1, ROCKER],
	// Its legs, the far ones darker.
	[5, 10, 2, 6, HORSE_SHADE],
	[15, 10, 2, 6, HORSE_SHADE],
	[7, 10, 2, 6, HORSE],
	[13, 10, 2, 6, HORSE],
	// Its body, its neck and its head.
	[5, 6, 12, 4, HORSE],
	[6, 6, 10, 1, HORSE_LIT],
	[6, 10, 10, 1, HORSE_SHADE],
	[4, 3, 3, 4, HORSE],
	[1, 1, 5, 3, HORSE],
	[0, 2, 1, 2, HORSE],
	[1, 1, 4, 1, HORSE_LIT],
	[4, 0, 1, 1, HORSE],
	[3, 2, 1, 1, INK],
	[0, 3, 1, 1, HORSE_SHADE],
	// Its mane and its tail.
	[5, 0, 2, 1, MANE],
	[6, 1, 2, 5, MANE],
	[17, 6, 2, 3, MANE],
	[18, 9, 1, 2, MANE],
	// Its saddle.
	[9, 5, 4, 2, '#7a3434'],
	[9, 5, 4, 1, '#94494a'],
	[11, 7, 1, 2, BRASS_DARK],
	// Its paint, peeling.
	[10, 8, 2, 1, BARE_WOOD],
	[14, 7, 1, 1, BARE_WOOD],
	[2, 3, 1, 1, BARE_WOOD],
	[7, 13, 1, 2, BARE_WOOD],
	[13, 11, 1, 1, BARE_WOOD],
	// Its dapples.
	[7, 8, 1, 1, HORSE_SHADE],
	[15, 8, 1, 1, HORSE_SHADE],
])

const CANVAS = '#3f5450'
const CANVAS_LIT = '#566b65'
const CANVAS_SHADE = '#2e3d3a'
const SLAT = '#6e4d36'
const SLAT_LIT = '#8a6646'

/**
 * A steamer trunk, its lid domed, green canvas gone dull, wooden slats
 * round it, brass corners and lock; dust on its lid: 20 by 12.
 */
export const trunk = pixelArt(20, 12, [
	// Its lid.
	[1, 0, 18, 1, CANVAS_LIT],
	[0, 1, 20, 3, CANVAS],
	[0, 1, 1, 1, CANVAS_LIT],
	[19, 1, 1, 1, CANVAS_LIT],
	[6, 0, 3, 1, DUST],
	[0, 4, 20, 1, CANVAS_SHADE],
	// Its body.
	[0, 5, 20, 7, CANVAS],
	[0, 11, 20, 1, CANVAS_SHADE],
	[19, 1, 1, 11, CANVAS_SHADE],
	// Its slats, round it.
	[3, 0, 2, 12, SLAT],
	[15, 0, 2, 12, SLAT],
	[3, 0, 2, 1, SLAT_LIT],
	[15, 0, 2, 1, SLAT_LIT],
	[0, 8, 20, 1, SLAT],
	// Its corners and its lock, brass.
	[0, 9, 2, 3, BRASS_DARK],
	[18, 9, 2, 3, BRASS_DARK],
	[0, 9, 2, 1, BRASS],
	[18, 9, 2, 1, BRASS],
	[9, 3, 2, 3, BRASS],
	[9, 3, 2, 1, BRASS_LIT],
	[9, 5, 1, 1, INK],
])

// --- In world pixels, drawn a cell to two -----------------------------------

const GOLD = '#8a7038'
const GOLD_LIT = '#b39352'
const GOLD_SHADE = '#5e4a26'
const GOLD_DARK = '#3e3018'
const SKIN = '#cfc4ae'
const SKIN_SHADE = '#a29680'
const GREY_HAIR = '#77716c'
const GREY_HAIR_LIT = '#948d86'
const COAT = '#2e2b33'
const COAT_LIT = '#423e49'
const COLLAR = '#d8d2c2'

/**
 * A portrait of the family's patriarch, grey whiskered, unsmiling, his
 * coat black, his collar high, on a dark ground, in a gilt frame gone
 * dull; his eyes picked out, pale, looking right at you: 40 by 52.
 */
export const PORTRAIT = {
	asset: pixelArt(20, 26, [
		// Its frame, gilt, ornate, tarnished.
		[0, 0, 20, 26, GOLD],
		[0, 0, 20, 1, GOLD_LIT],
		[0, 25, 20, 1, GOLD_SHADE],
		[19, 1, 1, 25, GOLD_SHADE],
		[0, 0, 2, 2, GOLD_LIT],
		[18, 0, 2, 2, GOLD_LIT],
		[0, 24, 2, 2, GOLD_LIT],
		[18, 24, 2, 2, GOLD_SHADE],
		[9, 1, 2, 1, GOLD_LIT],
		[5, 1, 1, 1, GOLD_LIT],
		[14, 1, 1, 1, GOLD_LIT],
		[1, 7, 1, 1, GOLD_LIT],
		[1, 13, 1, 1, GOLD_LIT],
		[1, 19, 1, 1, GOLD_LIT],
		[18, 7, 1, 1, GOLD_SHADE],
		[18, 13, 1, 1, GOLD_SHADE],
		[18, 19, 1, 1, GOLD_SHADE],
		[9, 24, 2, 1, GOLD_SHADE],
		[2, 2, 16, 22, GOLD_DARK],
		[3, 23, 15, 1, GOLD_LIT],
		[17, 3, 1, 21, GOLD_LIT],
		[15, 24, 2, 1, GOLD_DARK],
		[1, 16, 1, 2, GOLD_DARK],
		// The canvas: a dark ground, lighter behind his head.
		[3, 3, 14, 20, '#1c1a17'],
		[5, 4, 10, 12, '#26231e'],
		[4, 6, 12, 8, '#26231e'],
		// His coat, his collar, his cravat.
		[5, 17, 10, 1, COAT],
		[4, 18, 12, 5, COAT],
		[5, 17, 3, 1, COAT_LIT],
		[12, 17, 3, 1, COAT_LIT],
		[7, 16, 6, 2, COLLAR],
		[9, 18, 2, 5, COLLAR],
		[9, 18, 2, 2, '#5a2630'],
		// His head: hair, whiskers, face.
		[7, 4, 6, 1, GREY_HAIR_LIT],
		[6, 5, 8, 2, GREY_HAIR],
		[6, 7, 8, 8, SKIN],
		[13, 7, 1, 8, SKIN_SHADE],
		[7, 15, 6, 1, SKIN_SHADE],
		[6, 9, 1, 6, GREY_HAIR],
		[13, 9, 1, 6, GREY_HAIR],
		[7, 13, 1, 2, GREY_HAIR],
		[12, 13, 1, 2, GREY_HAIR],
		// His brow, his eyes, his nose and his mouth.
		[7, 8, 6, 1, '#5c554f'],
		[7, 9, 2, 1, '#efe7c8'],
		[11, 9, 2, 1, '#efe7c8'],
		[8, 9, 1, 1, INK],
		[11, 9, 1, 1, INK],
		[10, 10, 1, 2, SKIN_SHADE],
		[8, 13, 4, 1, '#6a4a44'],
	]),
	width: 40,
	height: 52,
}

/**
 * A chandelier, black iron, hung by its chain from the ceiling: its ring
 * of arms, four candles, two of them lit, wax dripped off its cups, and
 * cobwebs strung between: 64 by 80, transparent round it.
 */
export const CHANDELIER = {
	asset: pixelArt(32, 40, [
		// The plate it's hung from, and its chain.
		[13, 0, 6, 1, IRON_LIT],
		[14, 1, 4, 1, IRON],
		...Array.from(
			{ length: 20 },
			(_, i): PixelRect =>
				i % 2 ? [15, 2 + i, 1, 1, IRON_LIT] : [15, 2 + i, 2, 1, IRON],
		),
		// Its crown, its stem and the finial under.
		[12, 22, 8, 1, IRON_LIT],
		[11, 23, 10, 1, IRON],
		[15, 24, 2, 12, IRON],
		[14, 30, 4, 4, IRON],
		[14, 30, 4, 1, IRON_LIT],
		[15, 36, 2, 2, IRON],
		[15, 38, 1, 2, IRON_LIT],
		// Its arms, out from the stem and up to the cups.
		[2, 31, 28, 1, IRON_LIT],
		[3, 32, 26, 1, IRON],
		[3, 28, 1, 3, IRON],
		[28, 28, 1, 3, IRON],
		[10, 28, 5, 1, IRON],
		[17, 28, 5, 1, IRON],
		[10, 26, 1, 2, IRON],
		[21, 26, 1, 2, IRON],
		// Drops, hung under the ring.
		[6, 33, 1, 1, IRON],
		[12, 33, 1, 2, IRON],
		[19, 33, 1, 2, IRON],
		[25, 33, 1, 1, IRON],
		// The cups, brass.
		[1, 27, 5, 1, BRASS],
		[26, 27, 5, 1, BRASS],
		[8, 25, 5, 1, BRASS],
		[19, 25, 5, 1, BRASS],
		[1, 27, 5, 1, BRASS_LIT],
		[19, 25, 5, 1, BRASS_LIT],
		// The candles: the outer left one lit, the inner right one lit,
		// the others out, burnt down.
		...flame(2, 19),
		[2, 22, 2, 5, WAX],
		[3, 22, 1, 5, WAX_SHADE],
		[1, 28, 1, 2, WAX],
		[9, 22, 2, 3, WAX],
		[10, 22, 1, 3, WAX_SHADE],
		[9, 21, 1, 1, INK],
		...flame(20, 17),
		[20, 20, 2, 5, WAX],
		[21, 20, 1, 5, WAX_SHADE],
		[23, 26, 1, 2, WAX],
		[27, 25, 2, 2, WAX],
		[28, 25, 1, 2, WAX_SHADE],
		[28, 24, 1, 1, INK],
		// Cobwebs: one strung under its ring, one from its chain.
		[4, 33, 1, 1, WEB],
		[5, 34, 6, 1, WEB],
		[11, 33, 1, 1, WEB],
		[7, 32, 1, 2, WEB],
		[17, 23, 1, 1, WEB],
		[18, 24, 1, 1, WEB],
		[19, 25, 1, 1, WEB],
		[17, 24, 1, 2, WEB],
		[26, 28, 1, 1, WEB],
		[27, 29, 1, 2, WEB],
	]),
	width: 64,
	height: 80,
}

const BOOKS = [
	'#6a2a2a',
	'#3e5a3a',
	'#36415e',
	'#8a6a34',
	'#5a3450',
	'#6a4a30',
	'#7e6a56',
]

/** A shelf's books, standing on `floor` (the row under them): [x, width, height], each a colour along. */
const books = (
	floor: number,
	shelf: [x: number, width: number, height: number][],
	start: number,
): PixelRect[] =>
	shelf.flatMap(([x, w, h], i): PixelRect[] => {
		const colour = BOOKS[(start + i * 3) % BOOKS.length]
		return [
			[x, floor - h, w, h, colour],
			...((start + i) % 3 === 0
				? [[x, floor - h + 1, w, 1, BRASS_DARK] as PixelRect]
				: []),
		]
	})

/**
 * The landing's bookcase, mahogany, tall, to climb and stand on: its top
 * dusty, a crown moulding along it, three shelves of old books, some
 * fallen, a skull and a candle stub among them, and a cupboard under: 48
 * by 64, its top to stand on 4 down.
 */
export const BOOKCASE = {
	asset: pixelArt(24, 32, [
		// Its top, dusty, and its crown moulding.
		[0, 0, 24, 2, WOOD_LIT],
		[3, 0, 5, 1, DUST],
		[14, 1, 4, 1, DUST],
		[20, 0, 2, 1, DUST],
		[0, 2, 24, 3, WOOD],
		...Array.from(
			{ length: 8 },
			(_, i): PixelRect => [1 + i * 3, 3, 1, 1, WOOD_SHADE],
		),
		[1, 4, 22, 1, WOOD_DARK],
		// Its sides, and the dark inside.
		[1, 5, 22, 24, WOOD],
		[21, 5, 2, 24, WOOD_SHADE],
		[3, 5, 18, 20, GAP],
		// Its shelves.
		[3, 11, 18, 1, WOOD_LIT],
		[3, 18, 18, 1, WOOD_LIT],
		// The top shelf: books, and a candle stub, lit.
		...books(
			11,
			[
				[3, 2, 5],
				[5, 1, 4],
				[6, 2, 5],
				[8, 1, 5],
				[9, 2, 4],
				[16, 2, 5],
				[18, 1, 4],
				[19, 2, 5],
			],
			0,
		),
		...flame(13, 6),
		[13, 9, 2, 2, WAX],
		[14, 9, 1, 2, WAX_SHADE],
		// The middle shelf: a skull, books, and two fallen over.
		[4, 13, 4, 1, BONE],
		[3, 14, 6, 3, BONE],
		[8, 14, 1, 3, BONE_SHADE],
		[4, 15, 1, 1, INK],
		[6, 15, 1, 1, INK],
		[4, 17, 4, 1, BONE_SHADE],
		...books(
			18,
			[
				[10, 2, 5],
				[12, 1, 4],
				[13, 2, 5],
			],
			2,
		),
		[16, 16, 5, 2, BOOKS[2]],
		[17, 15, 4, 1, BOOKS[0]],
		// The bottom shelf, full.
		...books(
			25,
			[
				[3, 2, 5],
				[5, 1, 4],
				[6, 2, 5],
				[8, 2, 4],
				[10, 1, 5],
				[11, 2, 5],
				[13, 1, 3],
				[14, 2, 4],
				[17, 2, 5],
				[19, 2, 4],
			],
			4,
		),
		// A cobweb, in the top shelf's corner.
		...cobweb(3, 5, 4),
		// The cupboard under, and its plinth.
		[3, 25, 18, 1, WOOD_LIT],
		[4, 26, 7, 2, WOOD_SHADE],
		[13, 26, 7, 2, WOOD_SHADE],
		[10, 26, 1, 1, BRASS],
		[13, 26, 1, 1, BRASS],
		[0, 29, 24, 3, WOOD],
		[0, 29, 24, 1, WOOD_LIT],
		[0, 31, 24, 1, WOOD_SHADE],
	]),
	width: 48,
	height: 64,
	top: 4,
}

const CHAIR = '#83533c'
const CHAIR_LIT = '#a6745a'
const CHAIR_SHADE = '#5e392a'

/**
 * A dining chair, knocked over, on its back: its ladder back flat on the
 * floor, its seat up on end, its legs in the air. Low and solid, to jump:
 * 32 by 24.
 */
export const TOPPLED_CHAIR = {
	asset: pixelArt(16, 12, [
		// Its back, a ladder, lying on the floor: its far post, its slats,
		// its crest, and its near post, running on into its back leg.
		[1, 8, 6, 1, CHAIR_SHADE],
		[3, 8, 1, 2, CHAIR_SHADE],
		[5, 8, 1, 2, CHAIR_SHADE],
		[0, 8, 2, 3, CHAIR],
		[0, 8, 2, 1, CHAIR_LIT],
		[0, 10, 16, 2, CHAIR],
		[0, 10, 16, 1, CHAIR_LIT],
		// Its seat, up on end, its velvet facing its back, worn through.
		[7, 2, 2, 8, CHAIR],
		[7, 2, 2, 1, CHAIR_LIT],
		[8, 3, 1, 7, CHAIR_SHADE],
		[5, 3, 2, 5, VELVET],
		[5, 3, 2, 1, VELVET_LIT],
		[6, 5, 1, 1, STUFFING],
		// Its front legs, up in the air, the far one darker, and a rung.
		[9, 2, 3, 1, CHAIR_SHADE],
		[12, 1, 3, 1, CHAIR_SHADE],
		[15, 0, 1, 1, CHAIR_SHADE],
		[9, 4, 3, 1, CHAIR_LIT],
		[12, 3, 3, 1, CHAIR_LIT],
		[15, 2, 1, 1, CHAIR_LIT],
		[9, 5, 3, 1, CHAIR],
		[12, 4, 3, 1, CHAIR],
		[15, 3, 1, 1, CHAIR],
		[12, 5, 1, 5, CHAIR_SHADE],
	]),
	width: 32,
	height: 24,
}
