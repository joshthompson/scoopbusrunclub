import { type PixelRect, pixelArt } from './pixelArt'

/**
 * The Furby Queen's, in Furby Fields: the stair of giant macarons up off
 * the rainbow, the long royal one at the top with a red carpet along it to
 * its end, her palace floating far off from it, and her throne in it.
 *
 * Drawn a cell to two pixels, as the runners are. Each picture's sizes are
 * in world pixels, ready for a Platform's `art` (its `top`, how far its top
 * is over the floor) or a waiting bonus runner's `seat`.
 */

const CELL = 2

/** Gold, the Queen's: her crown, her throne, her carpet's edges. */
const GOLD = '#ffd23f'
const GOLD_SHADE = '#d0921a'

/** Platform art: its picture, its size, and how far over its floor its top is. */
export interface PlatformArt {
	asset: string
	width: number
	height: number
	top: number
}

// --- Macarons ------------------------------------------------------------------------

/**
 * A macaron's shells: their colour, lit along the top, and in shadow
 * underneath; and the stone of the tower it's the top of, paler, to go
 * with it: its colour, lit, in shadow, and its mortar.
 */
export interface Shell {
	base: string
	lit: string
	shade: string
	stone: { base: string; lit: string; shade: string; mortar: string }
}

/** The stair's macarons, one colour after another up it: strawberry, pistachio, lavender, lemon. */
export const MACARONS: Shell[] = [
	{
		base: '#ff9ccf',
		lit: '#ffc8e4',
		shade: '#df6fa8',
		stone: {
			base: '#f6a8d2',
			lit: '#ffd0e8',
			shade: '#d77bb0',
			mortar: '#ffe3f2',
		},
	},
	{
		base: '#9fe6c2',
		lit: '#cff6e2',
		shade: '#68c49b',
		stone: {
			base: '#b6ecd2',
			lit: '#dcf8ea',
			shade: '#86cdaa',
			mortar: '#e8fbf1',
		},
	},
	{
		base: '#c6a6ff',
		lit: '#e3d4ff',
		shade: '#9b78dc',
		stone: {
			base: '#d6c2ff',
			lit: '#ece2ff',
			shade: '#ab92e6',
			mortar: '#f3edff',
		},
	},
	{
		base: '#ffe27f',
		lit: '#fff3c2',
		shade: '#e0b84a',
		stone: {
			base: '#ffe9a8',
			lit: '#fff5d6',
			shade: '#e6c56e',
			mortar: '#fffaea',
		},
	},
]
/** The top one's: gold, for a queen, on a tower of white marble. */
export const ROYAL_MACARON: Shell = {
	base: '#ffd23f',
	lit: '#ffeaa0',
	shade: '#d0921a',
	stone: {
		base: '#f7efe2',
		lit: '#ffffff',
		shade: '#dccbb0',
		mortar: '#fffdf8',
	},
}

const CREAM = '#fff6e8'
const CREAM_SHADE = '#f0d9bc'
/** Jam, a line of it along the middle of the cream. */
const JAM = '#e0405f'
const SPARKLE = '#ffffff'
const CARPET = '#c4223c'
const CARPET_LIT = '#e44a5c'
const CARPET_GOLD = GOLD

/** How far down a macaron's top its floor is: the curve of its shell at the ends, stood on along the rest. */
const MACARON_TOP = 1
/** How tall the royal macaron's sign is, over its top, post and all. */
const SIGN_H = 22
/** The sign's board, pink, in shadow along its bottom, and its arrow. */
const SIGN = '#ff8ccb'
const SIGN_SHADE = '#e2589f'
const ARROW = '#fff6fb'
const JEWEL = '#3a7bd5'

/**
 * A giant macaron, `width` px across, to stand on: its top shell domed,
 * lit along the top, a glint or two on it; the cream and a line of jam
 * between the shells; the bottom shell's ruffled foot, and its rounded
 * underside in shadow. With a `carpet`, a red one along its top, gold
 * along its edges, hanging off its right end, tasselled, and a sign at
 * its end, a crown and an arrow on it: the royal one, at the top of the
 * stair, pointing the way to the Furby Queen.
 *
 * With a `tower`, it's the top of one, built up under it from the path's
 * back edge, that far down from its top in px (see `candyTower`).
 */
export function macaron(
	width: number,
	shell: Shell,
	{ carpet = false, tower = 0 } = {},
): PlatformArt {
	const w = Math.round(width / CELL)
	/** How far over its top it goes: its sign, if it has a carpet. */
	const above = carpet ? SIGN_H : 0
	/** How far down it goes: to the bottom of its shell, or its tower's. */
	const down = Math.max(18 + 6, MACARON_TOP + Math.ceil(tower / CELL))
	// Its tower first, under it.
	const rects: PixelRect[] = tower
		? candyTower(w, down, shell.stone).map(([x, y, rw, rh, c]) => [
				x,
				y + above,
				rw,
				rh,
				c,
			])
		: []
	/** A rect, down from its top. */
	const at = (x: number, y: number, rw: number, rh: number, c: string) =>
		rects.push([x, y + above, rw, rh, c])
	/** A row, `inset` in from either end. */
	const row = (y: number, inset: number, colour: string, h = 1) =>
		at(inset, y, w - inset * 2, h, colour)
	// The top shell, domed: rounded off at its ends, lit along its top, in
	// shadow along its bottom edge.
	const dome = [5, 3, 2, 1, 1, 0, 0, 0, 0, 0]
	dome.forEach((inset, y) =>
		row(
			y,
			inset,
			y < 2 ? shell.lit : y === dome.length - 1 ? shell.shade : shell.base,
		),
	)
	// Its ends lit too, round the curve.
	for (const y of [2, 3]) {
		at(dome[y], y, 2, 1, shell.lit)
		at(w - dome[y] - 2, y, 2, 1, shell.lit)
	}
	// Its glints, along the top.
	for (let x = 9; x < w - 9; x += 23) {
		at(x, 3, 4, 1, SPARKLE)
		at(x + 1, 4, 1, 1, SPARKLE)
	}
	// The cream, a line of jam along it, in shadow under it.
	row(10, 2, CREAM, 5)
	row(12, 2, JAM)
	row(14, 2, CREAM_SHADE)
	// The bottom shell's foot, ruffled: lit and not, cell by cell.
	row(15, 0, shell.base, 3)
	for (let x = 0; x < w; x += 2) at(x, 15, 1, 2, shell.lit)
	// And its underside, rounded off, in shadow.
	const under = [0, 0, 1, 1, 2, 4]
	under.forEach((inset, i) =>
		row(18 + i, inset, i < 3 ? shell.base : shell.shade),
	)
	row(18 + under.length - 1, under[under.length - 1], shell.shade)
	if (carpet) {
		// Along the top, in from its left end, and off its right one,
		// hanging down over the shell, tasselled in gold.
		at(4, 0, w - 4, 1, CARPET_GOLD)
		at(4, 1, w - 4, 1, CARPET_LIT)
		at(4, 2, w - 4, 1, CARPET)
		at(4, 3, w - 4, 1, CARPET_GOLD)
		at(w - 3, 0, 3, 12, CARPET)
		at(w - 3, 0, 1, 12, CARPET_LIT)
		at(w - 3, 12, 3, 1, CARPET_GOLD)
		for (const x of [w - 3, w - 1]) at(x, 13, 1, 2, CARPET_GOLD)
		// And a sign at its end, on a gold post: a crown, and an arrow on
		// from it, off the end, to her.
		const left = w - 22
		at(left + 7, -SIGN_H + 10, 2, SIGN_H - 10, GOLD_SHADE)
		at(left + 7, -SIGN_H + 10, 1, SIGN_H - 10, GOLD)
		at(left, -SIGN_H, 16, 11, GOLD)
		at(left + 1, -SIGN_H + 1, 14, 9, SIGN)
		at(left + 1, -SIGN_H + 9, 14, 1, SIGN_SHADE)
		// The crown.
		at(left + 2, -SIGN_H + 3, 1, 2, GOLD)
		at(left + 4, -SIGN_H + 2, 1, 3, GOLD)
		at(left + 6, -SIGN_H + 3, 1, 2, GOLD)
		at(left + 2, -SIGN_H + 5, 5, 2, GOLD)
		at(left + 4, -SIGN_H + 5, 1, 1, JEWEL)
		// The arrow.
		at(left + 8, -SIGN_H + 4, 3, 3, ARROW)
		at(left + 11, -SIGN_H + 2, 1, 7, ARROW)
		at(left + 12, -SIGN_H + 3, 1, 5, ARROW)
		at(left + 13, -SIGN_H + 4, 1, 3, ARROW)
		at(left + 14, -SIGN_H + 5, 1, 1, ARROW)
	}
	return {
		asset: pixelArt(w, above + down, rects),
		width: w * CELL,
		height: (above + down) * CELL,
		top: (above + MACARON_TOP) * CELL,
	}
}

/** How far in a tower is from either end of the macaron on top of it. */
const TOWER_IN = 34

/**
 * A tower of candy stone under a macaron `w` cells across, from under its
 * shell down to `bottom`, in rects, down from the macaron's top: its
 * `stone`, in courses, lit down its left, in shadow down its
 * right; a gold band round its top, under the macaron; arched windows up
 * it, lit lilac, as many rows as it's tall enough for; and at its foot, on
 * a plinth, an arched door, if it's tall enough for one.
 */
function candyTower(
	w: number,
	bottom: number,
	stone: Shell['stone'],
): PixelRect[] {
	const rects: PixelRect[] = []
	const r = (x: number, y: number, rw: number, rh: number, c: string) =>
		rects.push([x, y, rw, rh, c])
	const left = TOWER_IN
	const tw = w - TOWER_IN * 2
	const top = 20
	const tall = bottom - top
	// The stone, in courses, its joints staggered.
	r(left, top, tw, tall, stone.base)
	for (let y = top + 6; y < bottom; y += 5) {
		r(left, y, tw, 1, stone.mortar)
		const stagger = Math.floor((y - top) / 5) % 2 ? 4 : 0
		for (let x = left + stagger; x < left + tw; x += 8)
			r(x, y - 4, 1, 4, stone.mortar)
	}
	r(left, top, 2, tall, stone.lit)
	r(left + tw - 4, top, 4, tall, stone.shade)
	// A gold band round its top, just under the macaron.
	r(left - 2, top + 3, tw + 4, 1, GOLD)
	r(left - 2, top + 4, tw + 4, 1, GOLD_SHADE)
	// Its plinth, at its foot, and its door, if there's room.
	const plinth = Math.min(4, tall - 6)
	if (plinth > 0) {
		r(left - 2, bottom - plinth, tw + 4, plinth, stone.shade)
		r(left - 2, bottom - plinth, tw + 4, 1, stone.lit)
	}
	const door = 18
	const doorTop = bottom - plinth - door
	if (doorTop > top + 8) {
		const x = left + Math.round(tw / 2) - 6
		r(x + 2, doorTop, 8, 1, WINDOW)
		r(x + 1, doorTop + 1, 10, 1, WINDOW)
		r(x, doorTop + 2, 12, door - 2, WINDOW)
		r(x + 2, doorTop + 3, 3, door - 3, WINDOW_LIT)
		r(x - 1, doorTop + 1, 1, door - 1, GOLD)
		r(x + 12, doorTop + 1, 1, door - 1, GOLD_SHADE)
	}
	// Windows, in rows up it, over the door.
	const across = Math.max(1, Math.floor((tw - 12) / 36))
	const spacing = tw / across
	for (
		let y = top + 12;
		y + 14 < (doorTop > top + 8 ? doorTop - 6 : bottom - 4);
		y += 26
	)
		for (let i = 0; i < across; i++) {
			const x = Math.round(left + spacing * (i + 0.5)) - 4
			r(x + 1, y, 6, 1, WINDOW)
			r(x, y + 1, 8, 12, WINDOW)
			r(x + 1, y + 3, 2, 10, WINDOW_LIT)
			r(x - 1, y + 13, 10, 1, stone.lit)
		}
	return rects
}

// --- Her palace ------------------------------------------------------------------------

/** Candy stone, pink, its blocks' mortar lighter, in shadow underneath. */
const STONE = '#f6a8d2'
const STONE_LIT = '#ffd0e8'
const STONE_SHADE = '#d77bb0'
const MORTAR = '#ffe3f2'
/** Its towers' roofs, lilac, and their shadow side. */
const ROOF = '#b48bff'
const ROOF_SHADE = '#8a62d6'
/** Windows, dark, a lilac glow in them. */
const WINDOW = '#4a2a6a'
const WINDOW_LIT = '#7a52a8'
/** Its flags: pink, the Queen's. */
const FLAG = '#ff5fa8'
/** Its gate's doors, deep plum, and their panels. */
const DOOR = '#7a2f6e'
const DOOR_LIT = '#a14a92'
/** Bunting along its wall, sweets' colours. */
const BUNTING = ['#ff9ccf', '#9fe6c2', '#c6a6ff', '#ffe27f']

/** How far over its floor the palace goes: its back wall, its towers, their flags. */
const PALACE_ABOVE = 78
/** Its towers' width, in cells. */
const PALACE_TOWER = 22

/**
 * The Furby Queen's palace, `width` px across, its floor `down` px over
 * the path's back edge, where it stands. Her floor, a balcony along the
 * front of it, to land on; behind it, its back wall, crenellated, bunting
 * along it, arched windows in it. A tower at either end, from the ground
 * up past the balcony, a lilac cone of a roof, a pink flag flying from it.
 * Under the balcony, on its corbels, the front of the palace: two floors
 * of tall arched windows, gold round them, the Queen's banners hung
 * between them, a crown on each; a gold band between the floors; and in
 * the middle, its gate, up three steps, its doors shut. Everything over
 * its floor is behind whoever's on it.
 */
export function palace(width: number, down: number): PlatformArt {
	const w = Math.round(width / CELL)
	const floor = PALACE_ABOVE
	const bottom = floor + Math.ceil(down / CELL)
	const rects: PixelRect[] = []
	const r = (x: number, y: number, rw: number, rh: number, c: string) =>
		rects.push([x, y, rw, rh, c])
	/** Stone, in courses, its joints staggered. */
	const stone = (x: number, y: number, sw: number, sh: number) => {
		r(x, y, sw, sh, STONE)
		for (let yy = y + 4; yy < y + sh; yy += 5) {
			r(x, yy, sw, 1, MORTAR)
			const stagger = Math.floor((yy - y) / 5) % 2 ? 4 : 0
			for (let xx = x + stagger; xx < x + sw; xx += 8)
				r(xx, yy - 4, 1, 4, MORTAR)
		}
	}
	/** An arched window, `ww` across and `wh` tall, its top at `y`, gold round it. */
	const archWindow = (x: number, y: number, ww: number, wh: number) => {
		r(x + 1, y - 1, ww - 2, 1, GOLD)
		r(x - 1, y + 1, ww + 2, wh, GOLD)
		r(x, y, ww, 1, GOLD)
		r(x + 1, y, ww - 2, 1, WINDOW)
		r(x, y + 1, ww, wh - 1, WINDOW)
		r(x + 1, y + 3, 2, wh - 4, WINDOW_LIT)
		r(x - 2, y + wh, ww + 4, 1, STONE_LIT)
	}
	/** One of her banners, hung at `y`: pink, a gold crown on it, its foot cut in a point. */
	const banner = (x: number, y: number, bh: number) => {
		r(x - 1, y, 10, 1, GOLD_SHADE)
		r(x, y + 1, 8, bh, FLAG)
		r(x + 6, y + 1, 2, bh, STONE_SHADE)
		r(x + 1, y + bh + 1, 2, 1, FLAG)
		r(x + 5, y + bh + 1, 2, 1, STONE_SHADE)
		r(x + 2, y + 5, 1, 2, GOLD)
		r(x + 4, y + 4, 1, 3, GOLD)
		r(x + 6, y + 5, 1, 2, GOLD)
		r(x + 2, y + 7, 5, 2, GOLD)
	}

	// The back wall, behind the balcony, its stones in courses.
	const wallTop = floor - 34
	stone(6, wallTop, w - 12, floor - wallTop)
	// Its battlements, along its top.
	for (let x = 6; x < w - 6; x += 6) {
		r(x, wallTop - 4, 4, 4, STONE)
		r(x, wallTop - 4, 4, 1, STONE_LIT)
	}
	r(6, wallTop, w - 12, 1, STONE_LIT)
	// Bunting, swagged along under the battlements.
	for (let x = 10, i = 0; x < w - 12; x += 4, i++) {
		const sag = Math.round(Math.sin(((x - 10) / 40) * Math.PI) ** 2 * 3)
		r(x, wallTop + 3 + sag, 3, 2, BUNTING[i % BUNTING.length])
		r(x + 1, wallTop + 5 + sag, 1, 1, BUNTING[i % BUNTING.length])
	}
	// Arched windows, all along it, lit lilac inside.
	for (let x = 30; x < w - 30; x += 30) {
		r(x + 1, wallTop + 12, 6, 1, WINDOW)
		r(x, wallTop + 13, 8, 12, WINDOW)
		r(x + 1, wallTop + 15, 2, 10, WINDOW_LIT)
		r(x - 1, wallTop + 25, 10, 1, STONE_LIT)
	}

	// The front of the palace, under the balcony, down to the ground.
	const front = floor + 8
	const plinth = bottom - 6
	stone(PALACE_TOWER, front, w - PALACE_TOWER * 2, bottom - front)
	// Its upper floor: windows, tall, and her banners between them.
	const middle = Math.round(w / 2)
	const across = w - PALACE_TOWER * 2
	const bays = Math.max(1, Math.floor(across / 26))
	const bay = across / bays
	const upper = front + 10
	const band = Math.min(plinth - 50, upper + 40)
	for (let i = 0; i < bays; i++) {
		const x = Math.round(PALACE_TOWER + bay * (i + 0.5))
		if (band - upper > 30) archWindow(x - 5, upper, 10, band - upper - 10)
		if (i > 0) banner(Math.round(PALACE_TOWER + bay * i) - 4, front, 22)
	}
	// A gold band between its floors.
	r(PALACE_TOWER, band, across, 1, GOLD)
	r(PALACE_TOWER, band + 1, across, 1, GOLD_SHADE)
	// Its ground floor: its gate in the middle, up its steps, and windows
	// either side of it.
	const gateW = 30
	const gateTop = Math.max(band + 8, plinth - 44)
	const gate = middle - gateW / 2
	for (let i = 0; i < bays; i++) {
		const x = Math.round(PALACE_TOWER + bay * (i + 0.5))
		if (Math.abs(x - middle) < gateW) continue
		if (plinth - band > 36) archWindow(x - 5, band + 10, 10, plinth - band - 22)
	}
	// The gate: an arch, gold round it, a crown over it, its doors shut.
	r(gate - 3, gateTop + 2, gateW + 6, plinth - gateTop - 2, GOLD)
	r(gate - 1, gateTop, gateW + 2, 2, GOLD)
	r(gate + 3, gateTop - 2, gateW - 6, 2, GOLD)
	r(gate, gateTop + 2, gateW, plinth - gateTop - 2, DOOR)
	r(gate + 2, gateTop, gateW - 4, 2, DOOR)
	r(middle, gateTop + 2, 1, plinth - gateTop - 2, GOLD_SHADE)
	for (const x of [gate + 3, middle + 3])
		for (let y = gateTop + 8; y < plinth - 6; y += 12)
			r(x, y, gateW / 2 - 6, 8, DOOR_LIT)
	r(middle - 4, gateTop - 9, 1, 3, GOLD)
	r(middle - 1, gateTop - 10, 2, 4, GOLD)
	r(middle + 3, gateTop - 9, 1, 3, GOLD)
	r(middle - 4, gateTop - 6, 8, 3, GOLD)
	r(middle - 1, gateTop - 6, 2, 1, JEWEL)
	// Its plinth, along the foot of it, and the steps up to the gate.
	r(0, plinth, w, bottom - plinth, STONE_SHADE)
	r(0, plinth, w, 1, STONE_LIT)
	for (let i = 0; i < 3; i++)
		r(
			gate - 6 - i * 3,
			plinth + i * 2,
			gateW + 12 + i * 6,
			2,
			i % 2 ? STONE : STONE_LIT,
		)

	// A tower at either end: round, in courses, from the ground up, a
	// window up it every so often, a lilac cone of a roof, a gold ball on
	// top, and a flag flying from it.
	const tower = (left: number) => {
		const tw = PALACE_TOWER
		const top = 18
		stone(left, top, tw, plinth - top)
		r(left + tw - 4, top, 4, plinth - top, STONE_SHADE)
		r(left, top, 3, plinth - top, STONE_LIT)
		// Its battlements, then its roof over them.
		for (let x = left - 1; x < left + tw; x += 5) r(x, top - 3, 3, 3, STONE)
		for (let i = 0; i < 14; i++) {
			const half = Math.round(((i + 1) / 14) * (tw / 2 + 2))
			const mid = left + tw / 2
			r(mid - half, top - 17 + i, half, 1, ROOF)
			r(mid, top - 17 + i, half, 1, ROOF_SHADE)
		}
		r(left + tw / 2 - 1, top - 19, 2, 2, GOLD)
		// Its flag: a pole up, and a pink pennant flying off it.
		r(left + tw / 2, top - 28, 1, 9, GOLD_SHADE)
		r(left + tw / 2 + 1, top - 28, 6, 2, FLAG)
		r(left + tw / 2 + 1, top - 26, 4, 1, FLAG)
		r(left + tw / 2 + 1, top - 25, 2, 1, FLAG)
		// Windows, up it.
		for (let y = top + 10; y + 12 < plinth - 4; y += 34) {
			r(left + 8, y - 1, 6, 1, WINDOW)
			r(left + 7, y, 8, 10, WINDOW)
			r(left + 8, y + 2, 2, 8, WINDOW_LIT)
		}
	}
	tower(0)
	tower(w - PALACE_TOWER)

	// The balcony: her floor, lit, a gold edge along its front; its slab,
	// in shadow underneath, on corbels.
	r(PALACE_TOWER - 2, floor, across + 4, 2, STONE_LIT)
	r(PALACE_TOWER - 2, floor + 2, across + 4, 1, GOLD)
	r(PALACE_TOWER - 2, floor + 3, across + 4, 3, STONE)
	r(PALACE_TOWER - 2, floor + 6, across + 4, 1, STONE_SHADE)
	for (let x = PALACE_TOWER + 4; x < w - PALACE_TOWER - 4; x += 12) {
		r(x, front - 1, 4, 2, STONE)
		r(x + 1, front + 1, 2, 2, STONE)
		r(x + 3, front - 1, 1, 4, STONE_SHADE)
	}
	return {
		asset: pixelArt(w, bottom, rects),
		width: w * CELL,
		height: bottom * CELL,
		top: floor * CELL,
	}
}

// --- Her throne ------------------------------------------------------------------------

const VELVET = '#c4223c'
const VELVET_LIT = '#e44a5c'
const VELVET_SHADE = '#871428'
const FLUFF = '#ff8ccb'

/** The throne's size, in cells, and where its cushion's top is. */
const THRONE_W = 24
const THRONE_H = 46
const CUSHION = 30

/**
 * The Furby Queen's throne: its back tall behind her, up over her head,
 * arched, gold round red velvet, pink tinsel along its arch and a gold
 * crown on top of it, a blue jewel in it; its cushion, plump, on a gold
 * frame; an arm either side, curled over at the front; and its legs, a
 * paw at each foot. 24 by 46.
 */
export const THRONE = {
	asset: pixelArt(THRONE_W, THRONE_H, [
		// Its back: gold, arched over the top, the velvet inside it.
		...Array.from({ length: CUSHION - 4 }, (_, i): PixelRect[] => {
			const y = 6 + i
			const arch = [5, 3, 2, 1, 1][i] ?? 0
			return [
				[2 + arch, y, THRONE_W - 4 - arch * 2, 1, GOLD],
				[4 + arch, y, THRONE_W - 8 - arch * 2, 1, i < 2 ? GOLD : VELVET],
				[4 + arch, y, 2, 1, i < 2 ? GOLD : VELVET_LIT],
				[THRONE_W - 6 - arch, y, 2, 1, i < 2 ? GOLD : VELVET_SHADE],
				[THRONE_W - 3 - arch, y, 1, 1, GOLD_SHADE],
			]
		}).flat(),
		// Buttons in the velvet.
		...[10, 16, 22].flatMap((y): PixelRect[] => [
			[8, y, 1, 1, VELVET_SHADE],
			[12, y, 1, 1, VELVET_SHADE],
			[16, y, 1, 1, VELVET_SHADE],
		]),
		// Pink tinsel along its arch.
		[7, 5, 10, 1, FLUFF],
		[5, 6, 2, 1, FLUFF],
		[17, 6, 2, 1, FLUFF],
		[4, 7, 1, 1, FLUFF],
		[19, 7, 1, 1, FLUFF],
		// The crown on top: three points, a band, a jewel.
		[8, 0, 2, 2, GOLD],
		[11, 0, 2, 2, GOLD],
		[14, 0, 2, 2, GOLD],
		[8, 2, 8, 3, GOLD],
		[8, 4, 8, 1, GOLD_SHADE],
		[11, 2, 2, 2, JEWEL],
		// The cushion, plump, and the gold frame under it.
		[1, CUSHION, 22, 4, VELVET],
		[2, CUSHION, 20, 1, VELVET_LIT],
		[1, CUSHION + 3, 22, 1, VELVET_SHADE],
		[0, CUSHION + 4, 24, 2, GOLD],
		[0, CUSHION + 5, 24, 1, GOLD_SHADE],
		// Its arms, either side, curled over at the front.
		[0, CUSHION - 6, 5, 2, GOLD],
		[0, CUSHION - 5, 5, 1, GOLD_SHADE],
		[1, CUSHION - 4, 2, 4, GOLD],
		[19, CUSHION - 6, 5, 2, GOLD],
		[19, CUSHION - 5, 5, 1, GOLD_SHADE],
		[21, CUSHION - 4, 2, 4, GOLD_SHADE],
		// Its legs, a paw at each foot.
		[1, CUSHION + 6, 3, 8, GOLD],
		[3, CUSHION + 6, 1, 8, GOLD_SHADE],
		[0, THRONE_H - 2, 5, 2, GOLD],
		[20, CUSHION + 6, 3, 8, GOLD_SHADE],
		[19, THRONE_H - 2, 5, 2, GOLD_SHADE],
	]),
	width: THRONE_W * CELL,
	height: THRONE_H * CELL,
}
/**
 * How far down it she sits, sat in it: on its cushion, her boots hanging
 * down over its edge.
 */
export const THRONE_SINK = (CUSHION + 4) * CELL
