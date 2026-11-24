import { type PixelRect, paintedArt, pixelArt } from './pixelArt'
import { seeded } from './seeded'

/**
 * Gamla Stan's start, drawn in code: the bottom of Drottninggatan, where
 * Laura Ford's homeless fox sits huddled by Rosenbad, the government's
 * offices on the corner; and over Riksbron, on Helgeandsholmen, the
 * Riksdag. Each a cell a pixel, so its `Scenery` takes `scale: 2`.
 */

/**
 * Sweden's flag on a pole `pole` cells tall, its top at `x`, `y`, flying
 * to the right off it: 9 by 6 cells.
 */
const swedishFlag = (x: number, y: number, pole: number): PixelRect[] => [
	[x, y, 1, pole, '#e8e2d4'],
	...flag(x + 1, y),
]
/** Room over a building for its flag. */
const FLAG_ROOM = 10
/** Its rects moved down `by`, to make room over it. */
const lowered = (rects: PixelRect[], by: number): PixelRect[] =>
	rects.map(([x, y, w, h, fill]) => [x, y + by, w, h, fill])
const flag = (x: number, y: number): PixelRect[] => [
	[x, y, 9, 6, '#1d5fa8'],
	[x, y + 2, 9, 2, '#f2c230'],
	[x + 3, y, 2, 6, '#f2c230'],
	// A fold, the far half a little darker.
	[x + 6, y, 1, 6, '#174f8e'],
	[x + 6, y + 2, 1, 2, '#d4a722'],
]

/* -------------------------------------------------------------------------- */
/* Rag and Bone, the homeless fox                                              */
/* -------------------------------------------------------------------------- */

const BRONZE = '#5e4b36'
const BRONZE_LIT = '#86694a'
const BRONZE_DARK = '#3b2f23'
/** Rubbed gold by everyone who's stopped to pat it: its nose, its boot's toe. */
const RUBBED = '#c9a160'
const BRONZE_INK = '#211a13'
const COIN = '#e8c45a'
const COIN_SHADE = '#a8862e'

/**
 * The fox, a letter a cell: `B` bronze, `L` lit, `D` in shadow, `F` its
 * face, `I` its eye and the boot's sole, `R` rubbed bright, `C` a coin.
 */
const RAG_AND_BONE = [
	'..........................',
	'..............LD..LD......',
	'..............LLD.LLD.....',
	'.............BLLLDLLLD....',
	'............LBFFFFFFFD....',
	'...........LBBFFFIFFFFF...',
	'..........LBBBFFFFFFFFFFR.',
	'........LLBBBDFFFFFFDDD...',
	'......LLBBBBBBDFFFFFBD....',
	'.....LBBBBBBBBBDDDDBBBD...',
	'....LBBBBDBBBBBBBBBBBBD...',
	'...LBBBBDBBBBBBBBDBBBBBD..',
	'...BBBDDBBBBBDDDBBBBBBBD..',
	'..LBBBBBBBBBBBBBBDBBBBBD..',
	'..BBBBBBLLLLBBBBBBDBBBBBD.',
	'..BBBBDDBBBBBBBBBBBBBBBBD.',
	'.LBBBDBBBBBBDBBBBBBBBBBBD.',
	'.LDDDBBBBBBBBDDBBBBBDBBBD.',
	'DDDDDDBBBBBBBBBBBBBBBDBBD.',
	'RDDDDDBBDDBBBBBBBDBBBBBDD.',
	'RRDDDDDBBBBBBBDDBBBBBBBDD.',
	'IIIIIIDDDDDDDDDDDDDDDDDDD.',
	'......CC....CC........CC..',
	'......cc....cc........cc..',
]
const RAG_AND_BONE_COLOURS: Record<string, string> = {
	B: BRONZE,
	L: BRONZE_LIT,
	D: BRONZE_DARK,
	F: '#a3825a',
	I: BRONZE_INK,
	R: RUBBED,
	C: COIN,
	c: COIN_SHADE,
}
/**
 * Rag and Bone, Laura Ford's bronze on the corner of Drottninggatan and
 * Strömgatan: a fox huddled under a heap of blankets, a single old boot
 * sticking out under them, its head poking out of the top. Coins at its
 * feet from passers-by. 26 by 24 cells, its face to the right, towards the
 * bridge. Its nose and its boot's toe are rubbed bright by everyone who's
 * stopped to pat it.
 */
export const ragAndBone = paintedArt(26, 24, (x, y) => {
	const at = RAG_AND_BONE[Math.floor(y)]?.[Math.floor(x)]
	return at === undefined ? undefined : RAG_AND_BONE_COLOURS[at]
})
/** How it stands on the path's back edge: its feet, the coins, on the pavement's line. */
export const RAG_AND_BONE_HEIGHT = 24

/* -------------------------------------------------------------------------- */
/* Rosenbad                                                                    */
/* -------------------------------------------------------------------------- */

const STONE = '#e3d6be'
const STONE_LIT = '#f1e8d6'
const STONE_SHADE = '#c4b497'
const GRANITE = '#a39189'
const GRANITE_LIT = '#bcaca3'
const GRANITE_SHADE = '#7f6f68'
const COPPER = '#6aa892'
const COPPER_LIT = '#8cc6b0'
const COPPER_SHADE = '#4b8571'
const GLASS = '#44566b'
const GLASS_LIT = '#6e8499'
const DOOR = '#2f2a27'

/** A window, `w` by `h`: its glass, a glint in its top corner, and a sill. */
const windowAt = (
	x: number,
	y: number,
	w: number,
	h: number,
	sill = STONE_LIT,
): PixelRect[] => [
	[x, y, w, h, GLASS],
	[x, y, 1, 2, GLASS_LIT],
	[x - 1, y + h, w + 2, 1, sill],
]

/** An arch, `w` wide, `h` tall to its top: its top a step narrower. */
const archAt = (
	x: number,
	y: number,
	w: number,
	h: number,
	fill: string,
): PixelRect[] => [
	[x + 1, y, w - 2, 1, fill],
	[x, y + 1, w, h - 1, fill],
]

const ROSENBAD_W = 200
const ROSENBAD_H = 136
/** Where its walls start, under its roof, and its granite storeys under the stucco. */
const ROSENBAD_EAVES = 32
const ROSENBAD_PLINTH = 100
/** Its corner tower, at the right-hand end: its left edge, and how wide. */
const TOWER_X = 168
const TOWER_W = 28

/**
 * Rosenbad, on the corner of Strömgatan and Drottninggatan, the
 * government's offices: Jugendstil, its two bottom storeys granite, arched;
 * pale stone over them, a copper roof with dormers along it, and its round
 * corner tower, at the bridge end, under a copper dome and a flag. 200 by
 * 146 cells.
 */
export const rosenbad = (() => {
	const r: PixelRect[] = []
	const W = ROSENBAD_W
	const H = ROSENBAD_H
	// Its roof, copper, a mansard: steep, with dormers along it.
	r.push([2, ROSENBAD_EAVES - 12, TOWER_X - 2, 12, COPPER])
	r.push([4, ROSENBAD_EAVES - 14, TOWER_X - 6, 2, COPPER_LIT])
	r.push([2, ROSENBAD_EAVES - 2, TOWER_X - 2, 2, COPPER_SHADE])
	for (let x = 12; x < TOWER_X - 12; x += 22) {
		r.push([x, ROSENBAD_EAVES - 20, 8, 2, COPPER_LIT])
		r.push([x, ROSENBAD_EAVES - 18, 8, 8, COPPER])
		r.push(...windowAt(x + 2, ROSENBAD_EAVES - 16, 4, 5, COPPER_SHADE))
	}
	// The walls, pale stone, lit along the top, a cornice under the roof.
	r.push([0, ROSENBAD_EAVES, TOWER_X, ROSENBAD_PLINTH - ROSENBAD_EAVES, STONE])
	r.push([0, ROSENBAD_EAVES, TOWER_X, 2, STONE_LIT])
	r.push([0, ROSENBAD_EAVES + 2, TOWER_X, 1, STONE_SHADE])
	// A gable over its middle, rounded at the top as Jugend ones are.
	const gable = 70
	r.push([gable, ROSENBAD_EAVES - 22, 28, 22, STONE])
	r.push([gable + 2, ROSENBAD_EAVES - 26, 24, 4, STONE])
	r.push([gable + 6, ROSENBAD_EAVES - 28, 16, 2, STONE])
	r.push([gable + 6, ROSENBAD_EAVES - 29, 16, 1, STONE_LIT])
	r.push([gable + 2, ROSENBAD_EAVES - 26, 4, 1, STONE_LIT])
	r.push([gable + 22, ROSENBAD_EAVES - 26, 4, 1, STONE_LIT])
	r.push([gable, ROSENBAD_EAVES - 22, 2, 1, STONE_LIT])
	r.push([gable + 26, ROSENBAD_EAVES - 22, 2, 1, STONE_LIT])
	r.push(...windowAt(gable + 8, ROSENBAD_EAVES - 20, 12, 8))
	r.push([gable + 13, ROSENBAD_EAVES - 20, 2, 8, STONE])
	// Three storeys of windows, a bay sticking out in the middle of each half.
	for (const bay of [28, 128])
		r.push([bay - 2, ROSENBAD_EAVES + 4, 16, 62, STONE_LIT])
	for (const bay of [28, 128])
		r.push([bay + 12, ROSENBAD_EAVES + 4, 2, 62, STONE_SHADE])
	for (let storey = 0; storey < 3; storey++) {
		const y = ROSENBAD_EAVES + 8 + storey * 20
		for (let x = 6; x < TOWER_X - 6; x += 12) r.push(...windowAt(x, y, 5, 10))
		// A band of stone between the storeys.
		r.push([0, y + 16, TOWER_X, 1, STONE_SHADE])
	}
	// The granite storeys, rusticated, and their arches.
	r.push([0, ROSENBAD_PLINTH, TOWER_X, H - ROSENBAD_PLINTH, GRANITE])
	r.push([0, ROSENBAD_PLINTH, TOWER_X, 2, GRANITE_LIT])
	for (let y = ROSENBAD_PLINTH + 8; y < H - 2; y += 8)
		r.push([0, y, TOWER_X, 1, GRANITE_SHADE])
	for (let x = 6; x < TOWER_X - 10; x += 14) {
		if (Math.abs(x + 4 - 84) < 12) continue
		r.push(...archAt(x, ROSENBAD_PLINTH + 9, 8, 18, GLASS))
		r.push([x + 1, ROSENBAD_PLINTH + 10, 1, 3, GLASS_LIT])
		r.push([x - 1, ROSENBAD_PLINTH + 27, 10, 1, GRANITE_LIT])
	}
	// A door, under the gable.
	r.push(
		...archAt(
			gable + 9,
			ROSENBAD_PLINTH + 10,
			10,
			H - ROSENBAD_PLINTH - 10,
			DOOR,
		),
	)
	// Its round corner tower: lit on the left, round into shade on the right.
	const tx = TOWER_X
	r.push([tx, 18, TOWER_W, H - 18, STONE])
	r.push([tx, 18, 6, H - 18, STONE_LIT])
	r.push([tx + TOWER_W - 6, 18, 6, H - 18, STONE_SHADE])
	r.push([tx, ROSENBAD_PLINTH, TOWER_W, H - ROSENBAD_PLINTH, GRANITE])
	r.push([tx, ROSENBAD_PLINTH, 6, H - ROSENBAD_PLINTH, GRANITE_LIT])
	r.push([
		tx + TOWER_W - 6,
		ROSENBAD_PLINTH,
		6,
		H - ROSENBAD_PLINTH,
		GRANITE_SHADE,
	])
	for (let y = ROSENBAD_PLINTH + 8; y < H - 2; y += 8)
		r.push([tx, y, TOWER_W, 1, GRANITE_SHADE])
	for (let storey = 0; storey < 4; storey++) {
		const y = 24 + storey * 20
		r.push(...windowAt(tx + 7, y, 4, 10))
		r.push(...windowAt(tx + 16, y, 4, 10))
	}
	r.push(
		...archAt(tx + 8, ROSENBAD_PLINTH + 10, 12, H - ROSENBAD_PLINTH - 10, DOOR),
	)
	// Its dome, copper, onion-ish, and a lantern and a flag on top.
	r.push([tx - 2, 16, TOWER_W + 4, 3, STONE_LIT])
	r.push([tx, 8, TOWER_W, 8, COPPER])
	r.push([tx + 3, 4, TOWER_W - 6, 4, COPPER])
	r.push([tx + 8, 1, TOWER_W - 16, 3, COPPER])
	r.push([tx + 2, 8, 4, 8, COPPER_LIT])
	r.push([tx + 5, 4, 4, 4, COPPER_LIT])
	r.push([tx + TOWER_W - 5, 8, 5, 8, COPPER_SHADE])
	r.push([tx + 13, 0, 2, 1, COPPER_SHADE])
	// Its flagpole, up off the dome.
	r.push(...swedishFlag(tx + 14, -FLAG_ROOM, FLAG_ROOM))
	return pixelArt(W, H + FLAG_ROOM, lowered(r, FLAG_ROOM))
})()
export const ROSENBAD_WIDTH = ROSENBAD_W

/* -------------------------------------------------------------------------- */
/* Drottninggatan                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A building on Drottninggatan, up the street from Rosenbad: a stone
 * block, five storeys of windows, a tin roof, and a shop on the ground
 * floor under its awning. `width` by `height` cells.
 */
export function drottninggatanHouse(options: {
	width: number
	height: number
	/** Its walls, lit and in shade. */
	wall: [string, string, string]
	/** Its shop's awning, and the awning's stripe. */
	awning: [string, string]
	/** Its roof: tin, or copper. */
	roof?: [string, string]
	/** How many storeys over its shop. */
	storeys?: number
}) {
	const { width: W, height: H } = options
	const [wall, lit, shade] = options.wall
	const [roof, roofLit] = options.roof ?? ['#3e434a', '#5b6169']
	const storeys = options.storeys ?? 5
	const r: PixelRect[] = []
	const eaves = 12
	const shop = H - 26
	// Its roof, a mansard, dormers in it.
	r.push([2, 2, W - 4, eaves - 2, roof])
	r.push([4, 0, W - 8, 2, roofLit])
	for (let x = 10; x < W - 10; x += 18) r.push(...windowAt(x, 4, 4, 5, roof))
	// Its walls, a cornice under the roof, lit along it.
	r.push([0, eaves, W, H - eaves, wall])
	r.push([0, eaves, W, 2, lit])
	r.push([0, eaves + 2, W, 1, shade])
	r.push([W - 2, eaves, 2, H - eaves, shade])
	// Its storeys of windows, a band of stone between each.
	const storey = Math.floor((shop - eaves - 6) / storeys)
	for (let n = 0; n < storeys; n++) {
		const y = eaves + 6 + n * storey
		for (let x = 6; x < W - 8; x += 11)
			r.push(...windowAt(x, y, 5, storey - 6, lit))
	}
	// The shop: its awning, striped, its windows, and its door.
	r.push([0, shop, W, H - shop, shade])
	r.push([2, shop + 2, W - 4, 6, options.awning[0]])
	for (let x = 4; x < W - 4; x += 8)
		r.push([x, shop + 2, 4, 6, options.awning[1]])
	r.push([2, shop + 8, W - 4, 1, '#2a2622'])
	for (let x = 6; x < W - 16; x += 22) {
		r.push([x, shop + 11, 14, 13, GLASS])
		r.push([x, shop + 11, 2, 4, GLASS_LIT])
	}
	r.push([W - 14, shop + 11, 8, 15, DOOR])
	return pixelArt(W, H, r)
}

/**
 * Drottninggatan's last few buildings before Rosenbad, left to right, as
 * the street goes down to it: ochre, grey, and pink. Each `width` cells wide.
 */
export const DROTTNINGGATAN = [
	{
		width: 90,
		asset: drottninggatanHouse({
			width: 90,
			height: 120,
			wall: ['#d9a95b', '#e8c27e', '#b98a42'],
			awning: ['#b8352c', '#e8e2d4'],
		}),
	},
	{
		width: 100,
		asset: drottninggatanHouse({
			width: 100,
			height: 130,
			wall: ['#b7bcc0', '#d0d4d7', '#959a9f'],
			awning: ['#2f5d8a', '#e8e2d4'],
			roof: [COPPER, COPPER_LIT],
		}),
	},
	{
		width: 80,
		asset: drottninggatanHouse({
			width: 80,
			height: 112,
			wall: ['#d99a84', '#e8b5a2', '#b97a66'],
			awning: ['#2f6a4a', '#e8e2d4'],
			storeys: 4,
		}),
	},
]

/* -------------------------------------------------------------------------- */
/* The Riksdag                                                                 */
/* -------------------------------------------------------------------------- */

const SAND = '#d9cfba'
const SAND_LIT = '#ece4d2'
const SAND_SHADE = '#b6aa90'
const GREY = '#8d9093'
const GREY_LIT = '#adb0b2'
const GREY_SHADE = '#6c6f72'

const RIKSDAG_W = 340
const RIKSDAG_H = 128
/** Where its granite base starts, and its columns' tops and feet. */
const RIKSDAG_BASE = 88
const COLUMNS_TOP = 34
/** Its middle, under the dome, and how far either side of it the colonnade goes. */
const RIKSDAG_MIDDLE = RIKSDAG_W / 2
const COLONNADE = 66

/**
 * The Riksdag, on Helgeandsholmen: Sweden's parliament, over the water
 * from Rosenbad. A rusticated granite base, arched; over it, pale
 * sandstone, a colonnade of great columns across its middle, under a
 * balustrade; copper roofs, and a low copper dome in the middle, the flag
 * flying over it. 340 by 142 cells.
 */
export const riksdag = (() => {
	const r: PixelRect[] = []
	const W = RIKSDAG_W
	const H = RIKSDAG_H
	const mid = RIKSDAG_MIDDLE
	// Its roofs, copper, hipped, either end, and its dome in the middle.
	r.push([4, 14, W - 8, 10, COPPER])
	r.push([8, 12, W - 16, 2, COPPER_LIT])
	r.push([4, 22, W - 8, 2, COPPER_SHADE])
	// The dome, low, its drum, and its lantern.
	r.push([mid - 30, 10, 60, 6, SAND])
	r.push([mid - 30, 10, 60, 1, SAND_LIT])
	for (let x = mid - 26; x < mid + 26; x += 8) r.push([x, 12, 3, 4, GLASS])
	r.push([mid - 26, 2, 52, 8, COPPER])
	r.push([mid - 18, 0, 36, 2, COPPER])
	r.push([mid - 24, 2, 10, 8, COPPER_LIT])
	r.push([mid + 16, 2, 10, 8, COPPER_SHADE])
	r.push([mid - 14, 0, 6, 2, COPPER_LIT])
	// Its lantern, on top.
	r.push([mid - 3, -3, 6, 3, SAND])
	r.push([mid - 3, -3, 2, 3, SAND_LIT])
	r.push([mid - 4, -4, 8, 1, COPPER_SHADE])
	// The balustrade along the top of its walls, over a cornice.
	r.push([0, 24, W, 6, SAND])
	r.push([0, 24, W, 1, SAND_LIT])
	for (let x = 2; x < W - 2; x += 4) r.push([x, 26, 2, 3, SAND_SHADE])
	r.push([0, 29, W, 2, SAND_LIT])
	r.push([0, 31, W, 3, SAND_SHADE])
	// Its sandstone storeys.
	r.push([0, COLUMNS_TOP, W, RIKSDAG_BASE - COLUMNS_TOP, SAND])
	// Its wings' windows, either side of the colonnade: two storeys, the
	// lower ones taller, a pediment over each.
	for (let x = 8; x < W - 8; x += 14) {
		if (Math.abs(x + 3 - mid) < COLONNADE + 6) continue
		r.push([x - 1, 40, 8, 2, SAND_LIT])
		r.push(...windowAt(x, 42, 6, 16, SAND_LIT))
		r.push(...windowAt(x, 66, 6, 12, SAND_LIT))
	}
	// The ends of each wing, a little forward, in the light and shade.
	r.push([0, COLUMNS_TOP, 4, RIKSDAG_BASE - COLUMNS_TOP, SAND_LIT])
	r.push([W - 4, COLUMNS_TOP, 4, RIKSDAG_BASE - COLUMNS_TOP, SAND_SHADE])
	// The colonnade, set back in shadow, tall windows behind its columns.
	r.push([
		mid - COLONNADE,
		COLUMNS_TOP,
		COLONNADE * 2,
		RIKSDAG_BASE - COLUMNS_TOP,
		SAND_SHADE,
	])
	for (let x = mid - COLONNADE + 6; x < mid + COLONNADE - 6; x += 12)
		r.push([x + 3, 44, 5, 34, GLASS], [x + 3, 44, 1, 2, GLASS_LIT])
	// Its columns, round, lit on their left: a capital on top, a base under.
	for (let x = mid - COLONNADE; x <= mid + COLONNADE - 4; x += 12) {
		r.push([x, COLUMNS_TOP + 2, 5, RIKSDAG_BASE - COLUMNS_TOP - 4, SAND])
		r.push([x, COLUMNS_TOP + 2, 2, RIKSDAG_BASE - COLUMNS_TOP - 4, SAND_LIT])
		r.push([
			x + 4,
			COLUMNS_TOP + 2,
			1,
			RIKSDAG_BASE - COLUMNS_TOP - 4,
			SAND_SHADE,
		])
		r.push([x - 1, COLUMNS_TOP, 7, 2, SAND_LIT])
		r.push([x - 1, RIKSDAG_BASE - 2, 7, 2, SAND_LIT])
	}
	// The granite base, rusticated: its courses, and its arched windows,
	// a doorway under the middle.
	r.push([0, RIKSDAG_BASE, W, H - RIKSDAG_BASE, GREY])
	r.push([0, RIKSDAG_BASE, W, 2, GREY_LIT])
	for (let y = RIKSDAG_BASE + 7; y < H - 2; y += 7)
		r.push([0, y, W, 1, GREY_SHADE])
	for (let x = 8; x < W - 8; x += 14) {
		if (Math.abs(x + 3 - mid) < 10) continue
		r.push(...archAt(x, RIKSDAG_BASE + 10, 6, 16, GLASS))
		r.push([x, RIKSDAG_BASE + 10 + 16, 6, 1, GREY_LIT])
	}
	r.push(...archAt(mid - 8, RIKSDAG_BASE + 8, 16, H - RIKSDAG_BASE - 8, DOOR))
	r.push([mid - 10, RIKSDAG_BASE + 7, 20, 1, GREY_LIT])
	// Its flag, over the dome.
	r.push(...swedishFlag(mid, -4 - FLAG_ROOM, FLAG_ROOM))
	return pixelArt(W, H + FLAG_ROOM + 4, lowered(r, FLAG_ROOM + 4))
})()

/* -------------------------------------------------------------------------- */
/* Gamla Stan's streets                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The old town's houses, along its street: the skyline's own colours,
 * salmon, green, ochre, yellow, red, orange, a little brighter, being
 * nearer; low, a shop and a storey or two over it, so the skyline still
 * shows over them. Down at the shops, where everyone runs past, they're
 * plainest: one colour of painted wood, and pale glass, so a runner, a
 * tourist, a pigeon, a coffee stands out against them.
 */
const OLD_TOWN_WALLS: [wall: string, lit: string, shade: string][] = [
	['#eba98a', '#f4c0a6', '#d48f70'],
	['#9cb679', '#b2c991', '#849e62'],
	['#e6b452', '#f0c873', '#cc9a3c'],
	['#f0cf68', '#f6de8d', '#d6b44f'],
	['#c95a42', '#d97761', '#ad4732'],
	['#e88c4b', '#f1a46a', '#cc7536'],
	['#d87c5c', '#e5967a', '#bd6546'],
]
/** Their windows: dark, as the skyline's, a pane catching the light. */
const PANE = '#3a4352'
const PANE_LIT = '#66758a'
/** Their roofs: tiles, or tin. */
const TILES = ['#a5533c', '#c46a4e', '#86412f']
const TIN = ['#5d6670', '#7b858f', '#4a525b']
/** Their shops' fronts, painted wood, and their glass, pale. */
const SHOPFRONTS = ['#5f8a6e', '#9a4c43', '#4f6d8f', '#7a6250']
const SHOP_GLASS = '#b4cad5'
const SHOP_GLASS_LIT = '#d6e4ea'
/** Down an alley: its walls, sunny and shady, its far end, hazy, and its cobbles. */
const ALLEY_SUNNY = '#d6b48e'
const ALLEY_SHADY = '#b08f72'
const ALLEY_FAR = '#ecd9bd'
const ALLEY_FAR_PANE = '#a9a7a6'
const ALLEY_FLOOR = '#9a9086'
const ALLEY_STEP = '#b0a69a'

/** Each storey's height, the shop's, and a cornice's, in cells. */
const STOREY = 20
const SHOP = 30
const CORNICE = 4

type Random = () => number
const pick = <T>(random: Random, from: T[]) =>
	from[Math.floor(random() * from.length)]

/** A house, or an alley, as a picture: `width` cells wide, its foot on the street. */
export interface StreetPiece {
	asset: string
	width: number
}

/**
 * A house, different with every `seed`: a shop on the ground floor, a
 * storey or two over it, and a roof, a stepped gable, a curved one, or
 * plain eaves, tiled, a dormer in them. 40 to 62 cells wide.
 */
export function oldTownHouse(seed: number): StreetPiece {
	const random = seeded(seed)
	const w = 40 + 2 * Math.floor(random() * 12)
	const [wall, lit, shade] = pick(random, OLD_TOWN_WALLS)
	const storeys = 1 + Math.floor(random() * 2)
	const roofKind = random()
	/** Room over its wall for its roof. */
	const ROOM = 40
	const H = ROOM + CORNICE + storeys * STOREY + SHOP
	const top = ROOM
	const r: PixelRect[] = []
	// Its wall, its far edge in shade, and its cornice, lit.
	r.push([0, top, w, H - top, wall])
	r.push([w - 2, top, 2, H - top, shade])
	r.push([0, top, w, 2, lit])
	r.push([0, top + 2, w, 1, shade])
	// Its windows, storey by storey, centred.
	const across = Math.max(2, Math.floor((w - 6) / 10))
	const from = Math.floor((w - (across * 10 - 5)) / 2)
	for (let s = 0; s < storeys; s++) {
		const y = top + CORNICE + 4 + s * STOREY
		for (let i = 0; i < across; i++) {
			const wx = from + i * 10
			r.push([wx, y, 5, 11, PANE], [wx, y, 1, 3, PANE_LIT])
			r.push([wx - 1, y + 11, 7, 1, lit])
		}
	}
	// The shop, plainest of all: its front, a sign over it, its window, and
	// its door.
	const front = pick(random, SHOPFRONTS)
	const shop = H - SHOP
	r.push([2, shop, w - 4, SHOP, front])
	r.push([2, shop, w - 4, 1, lit])
	r.push([4, shop + 2, w - 8, 4, wall])
	const doorLeft = random() < 0.5
	const door = doorLeft ? 4 : w - 12
	const glass = doorLeft ? 14 : 4
	r.push([glass, shop + 8, w - 18, SHOP - 12, SHOP_GLASS])
	r.push([glass, shop + 8, w - 18, 2, SHOP_GLASS_LIT])
	r.push([door, shop + 8, 8, SHOP - 8, shade])
	r.push([door + (doorLeft ? 6 : 1), shop + 18, 1, 2, lit])
	// Occasionally, an iron sign hanging off it on a bracket, up out of
	// the way.
	if (random() < 0.35) {
		const sx = Math.floor(w / 2) - 4
		r.push([sx, shop - 6, 10, 1, '#3b3a3a'])
		r.push([sx + 1, shop - 5, 8, 5, front])
		r.push([sx + 1, shop - 5, 8, 1, lit])
	}
	// Its roof.
	if (roofKind < 0.45) {
		// A stepped gable, the old town's own: steps up either side, each
		// lit along its top, a little window in it.
		const steps = 4
		const step = Math.floor(w / (2 * steps + 1))
		const rise = 7
		for (let i = 0; i < steps; i++) {
			const sx = i * step
			const sw = w - 2 * i * step
			r.push([sx, top - (i + 1) * rise, sw, rise, wall])
			r.push([sx, top - (i + 1) * rise, step, 1, lit])
			r.push([sx + sw - step, top - (i + 1) * rise, step, 1, lit])
			r.push([sx + sw - 2, top - (i + 1) * rise + 1, 2, rise - 1, shade])
		}
		const cap = w - 2 * steps * step
		r.push([steps * step, top - (steps + 1) * rise, cap, rise, wall])
		r.push([steps * step, top - (steps + 1) * rise, cap, 1, lit])
		const mid = Math.floor(w / 2)
		r.push([mid - 2, top - 2 * rise - 4, 4, 7, PANE])
		r.push([mid - 3, top - 2 * rise + 3, 6, 1, lit])
	} else if (roofKind < 0.7) {
		// A curved gable, baroque: two tiers, its shoulders rounded off, a
		// round window in it, and a little pediment on top.
		const mid = Math.floor(w / 2)
		const lower = w - 12
		const upper = Math.floor(w / 2) - 2
		r.push([mid - lower / 2, top - 12, lower, 12, wall])
		r.push([mid - lower / 2 - 3, top - 4, 3, 4, wall])
		r.push([mid + lower / 2, top - 4, 3, 4, wall])
		r.push([mid - upper / 2, top - 26, upper, 14, wall])
		r.push([mid - upper / 2 - 3, top - 18, 3, 6, wall])
		r.push([mid + upper / 2, top - 18, 3, 6, wall])
		r.push([mid - upper / 2 - 2, top - 30, upper + 4, 4, wall])
		r.push([mid - upper / 2 - 2, top - 30, upper + 4, 1, lit])
		r.push([mid - lower / 2, top - 12, lower, 1, lit])
		r.push([mid + upper / 2 - 2, top - 26, 2, 14, shade])
		r.push([mid - 3, top - 22, 6, 6, PANE], [mid - 2, top - 23, 4, 1, PANE])
		r.push([mid - 2, top - 16, 4, 1, PANE])
		r.push([mid - 3, top - 22, 1, 2, PANE_LIT])
		for (const wx of [mid - lower / 2 + 4, mid + lower / 2 - 9])
			r.push([wx, top - 10, 5, 7, PANE])
	} else {
		// Plain eaves: a tiled roof, or tin, going back up from the street,
		// a dormer or two in it.
		const [tile, tileLit, tileShade] = random() < 0.7 ? TILES : TIN
		const height = 14 + Math.floor(random() * 6)
		r.push([0, top - height, w, height, tile])
		r.push([2, top - height - 1, w - 4, 1, tileLit])
		for (let y = top - height + 4; y < top - 1; y += 4)
			r.push([0, y, w, 1, tileShade])
		r.push([0, top - 2, w, 2, tileShade])
		for (let dx = 8; dx < w - 12; dx += 22) {
			r.push([dx, top - height + 2, 10, 10, wall])
			r.push([dx - 1, top - height + 1, 12, 2, tileLit])
			r.push([dx + 3, top - height + 5, 4, 6, PANE])
		}
	}
	return { asset: pixelArt(w, H, r), width: w }
}

/**
 * An alley off the street, different with every `seed`, 22 to 26 cells
 * wide: down it, its walls closing in on the far end, sunny on the left,
 * shady on the right, its steps rising away to a hazy house across the
 * end of it, the sky and the skyline over it; and occasionally one of the
 * old town's arches across it, holding the houses apart.
 */
export function oldTownAlley(seed: number): StreetPiece {
	const random = seeded(seed)
	const w = 22 + 2 * Math.floor(random() * 3)
	const H = CORNICE + STOREY + SHOP
	const far = 8
	const farLeft = Math.floor((w - far) / 2)
	const farRight = farLeft + far
	/** The far end: its house's top, and where the steps meet it. */
	const farTop = H - 40
	const farFoot = H - 16
	const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)
	const r: PixelRect[] = []
	for (let c = 0; c < w; c++) {
		const left = c < farLeft
		const right = c >= farRight
		if (left || right) {
			// A wall, closing in: its top coming down, its foot up, to the end.
			const t = left ? c / farLeft : (w - 1 - c) / (w - farRight)
			const wallTop = lerp(0, farTop + 4, t)
			const wallFoot = lerp(H, farFoot, t)
			r.push([
				c,
				wallTop,
				1,
				wallFoot - wallTop,
				left ? ALLEY_SUNNY : ALLEY_SHADY,
			])
			r.push([c, wallFoot, 1, H - wallFoot, ALLEY_FLOOR])
		} else {
			// The house across the far end, hazy, and the steps up to it.
			r.push([c, farTop, 1, farFoot - farTop, ALLEY_FAR])
			r.push([c, farFoot, 1, H - farFoot, ALLEY_FLOOR])
		}
	}
	// The far house's windows.
	for (let y = farTop + 4; y < farFoot - 6; y += 10)
		r.push([farLeft + 2, y, 4, 5, ALLEY_FAR_PANE])
	// Its steps, lit along their tops, rising away.
	for (let y = farFoot + 3; y < H; y += 4)
		r.push([farLeft - 1, y, far + 2, 1, ALLEY_STEP])
	// An arch across it: its underside stepped round.
	if (random() < 0.6) {
		const y = 6 + Math.floor(random() * 6)
		r.push([0, y, w, 5, ALLEY_SHADY])
		r.push([0, y, w, 1, ALLEY_SUNNY])
		r.push([0, y + 5, 3, 3, ALLEY_SHADY])
		r.push([w - 3, y + 5, 3, 3, ALLEY_SHADY])
		r.push([0, y + 8, 1, 2, ALLEY_SHADY])
		r.push([w - 1, y + 8, 1, 2, ALLEY_SHADY])
	}
	return { asset: pixelArt(w, H, r), width: w }
}
