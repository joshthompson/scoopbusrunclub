import { type PixelRect, paintedArt, pixelArt } from './pixelArt'

/**
 * Under Everest, its Secret (see `Secret`): the Yetis' den, down the last
 * crevasse of the Icefall. Yetis at home on their sofas, watching the
 * telly, a lamp on; and the Yeti waiting at the far end, down on one knee,
 * to throw you back up out of it. Drawn in code, a pixel a cell, shown at
 * twice that: sizes here are in world pixels.
 *
 * The yetis are all the one family: shaggy and white, lavender in the
 * shadows of their fur, their faces and the soles of their big feet a
 * pale blue, an eye a dark cell. Sat facing the telly, which stands to
 * the left of a sofa, the sides of them nearest it are lit a cold blue.
 */

const CELL = 2

/** A picture, its size on screen. */
export interface Picture {
	asset: string
	width: number
	height: number
}

// --- Shared colours ---------------------------------------------------------

const INK = '#1d1d1d'
/** A yeti's fur: lit along the top, lavender underneath. */
const FUR = '#eef1f7'
const FUR_LIT = '#ffffff'
const FUR_SHADE = '#b9c0dc'
const FUR_DARK = '#959dc4'
/** Its face, palms and soles, bare. */
const FACE = '#a6c0e0'
const FACE_SHADE = '#7f9cc6'
const MOUTH = '#3b3350'
const TONGUE = '#e0788a'
/** The telly's light, on the side of whoever's watching it. */
const TV_LIT = '#d7f0ff'
const FACE_TV = '#c6e6fb'

/** A colour for a cell, or nothing: one layer of a picture. */
type Paint = (x: number, y: number) => string | undefined

/** Is a cell in a shape. */
type Inside = (x: number, y: number) => boolean

/** Paint, in layers, cell by cell: each one over the ones before it. */
const layered = (w: number, h: number, layers: Paint[]) =>
	paintedArt(w, h, (x, y) => {
		let colour: string | undefined
		for (const layer of layers) colour = layer(x, y) ?? colour
		return colour
	})

const box =
	(x: number, y: number, w: number, h: number, colour: string): Paint =>
	(px, py) =>
		px >= x && px < x + w && py >= y && py < y + h ? colour : undefined

const area =
	(x: number, y: number, w: number, h: number): Inside =>
	(px, py) =>
		px >= x && px < x + w && py >= y && py < y + h

const oval =
	(cx: number, cy: number, rx: number, ry: number): Inside =>
	(x, y) =>
		((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

/** A limb: everything within `r` of a line from one end to the other. */
const limb =
	(x1: number, y1: number, x2: number, y2: number, r: number): Inside =>
	(x, y) => {
		const dx = x2 - x1
		const dy = y2 - y1
		const t = Math.max(
			0,
			Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)),
		)
		return Math.hypot(x - x1 - t * dx, y - y1 - t * dy) <= r
	}

/** A shape's fur hanging down off its underside, in locks a cell apart. */
const shaggy =
	(inside: Inside): Inside =>
	(x, y) =>
		inside(x, y) || (Math.floor(x) % 2 === 0 && inside(x, y - 1))

interface Tones {
	base: string
	lit: string
	shade: string
}

const WHITE_FUR: Tones = { base: FUR, lit: FUR_LIT, shade: FUR_SHADE }
const FAR_FUR: Tones = { base: FUR_SHADE, lit: FUR, shade: FUR_DARK }
const BARE: Tones = { base: FACE, lit: FACE_TV, shade: FACE_SHADE }

/**
 * A shape, lit from above: its top row lit, its bottom two and its right
 * edge shaded. `tv`, and the left of it, towards the telly, is lit blue
 * too.
 */
const solid =
	(inside: Inside, tones: Tones = WHITE_FUR, tv = false): Paint =>
	(x, y) => {
		if (!inside(x, y)) return undefined
		if (!inside(x, y - 1)) return tones.lit
		if (!inside(x, y + 2) || !inside(x + 1, y)) return tones.shade
		if (tv && !inside(x - 1, y)) return tones === BARE ? FACE_TV : TV_LIT
		return tones.base
	}

const rects =
	(list: PixelRect[]): Paint =>
	(x, y) => {
		let colour: string | undefined
		for (const [rx, ry, w, h, c] of list)
			if (x >= rx && x < rx + w && y >= ry && y < ry + h) colour = c
		return colour
	}

// --- The sofas ---------------------------------------------------------------

interface Upholstery {
	base: string
	lit: string
	shade: string
	deep: string
}

/** Rust velvet, buttoned. */
const RUST: Upholstery = {
	base: '#b4572f',
	lit: '#d27445',
	shade: '#8a3b20',
	deep: '#5e2614',
}
/** Mustard, the seventies' own. */
const MUSTARD: Upholstery = {
	base: '#c99530',
	lit: '#e4b553',
	shade: '#97691b',
	deep: '#674611',
}
const SOFA_FOOT = '#3a2516'
const SOFA_H = 28

/**
 * A sofa from the front, `w` wide: its back, arms, seat and skirt, on
 * four short wooden feet. Its seat's top at row 18.
 */
function sofa(w: number, cloth: Upholstery, buttons: boolean): Paint[] {
	const r: PixelRect[] = [
		// Its back, high, its top rounded off.
		[4, 7, w - 8, 12, cloth.base],
		[5, 6, w - 10, 1, cloth.lit],
		[4, 7, 1, 1, cloth.lit],
		[w - 5, 7, 1, 1, cloth.lit],
		[4, 16, w - 8, 2, cloth.shade],
		// The seat, its cushions, their seams.
		[3, 18, w - 6, 4, cloth.base],
		[3, 18, w - 6, 1, cloth.lit],
		[3, 21, w - 6, 1, cloth.shade],
		[Math.round(w / 2), 18, 1, 4, cloth.shade],
		// Its skirt, under the seat, in shadow.
		[2, 22, w - 4, 4, cloth.shade],
		[2, 25, w - 4, 1, cloth.deep],
		// Its arms, rolled.
		[0, 12, 6, 13, cloth.base],
		[w - 6, 12, 6, 13, cloth.base],
		[1, 11, 4, 1, cloth.lit],
		[w - 5, 11, 4, 1, cloth.lit],
		[0, 12, 6, 1, cloth.lit],
		[w - 6, 12, 6, 1, cloth.lit],
		[5, 13, 1, 12, cloth.shade],
		[w - 6, 13, 1, 12, cloth.shade],
		[0, 24, 6, 1, cloth.deep],
		[w - 6, 24, 6, 1, cloth.deep],
		// Its feet.
		[1, 26, 2, 2, SOFA_FOOT],
		[w - 3, 26, 2, 2, SOFA_FOOT],
		[9, 26, 2, 1, SOFA_FOOT],
		[w - 11, 26, 2, 1, SOFA_FOOT],
	]
	if (buttons)
		for (let x = 8; x < w - 6; x += 6)
			r.push([x, 10, 1, 1, cloth.deep], [x + 3, 13, 1, 1, cloth.deep])
	return [rects(r)]
}

/**
 * A yeti sat on a sofa, facing out, 13 wide, its head's top `y` down,
 * from `x`: its head, body, legs down off the seat, its big feet on the
 * floor. Without its arms, which are its own business.
 */
function sitter(x: number, y: number, look: 'up' | 'asleep' = 'up'): Paint[] {
	const cx = x + 6.5
	// Asleep, its head's lolled over to one side.
	const hx = look === 'asleep' ? 1 : 0
	const hy = look === 'asleep' ? 1 : 0
	return [
		// Its legs, down off the seat, and its feet, big, on the floor.
		solid(limb(x + 4, y + 20, x + 4, y + 24, 2), WHITE_FUR, true),
		solid(limb(x + 9, y + 20, x + 9, y + 24, 2), WHITE_FUR),
		solid(oval(x + 3.5, SOFA_H - 1.5, 3.5, 1.6), FAR_FUR),
		solid(oval(x + 9.5, SOFA_H - 1.5, 3.5, 1.6), FAR_FUR),
		// Its body, shaggy.
		solid(shaggy(oval(cx, y + 15, 6.5, 6)), WHITE_FUR, true),
		// Its head.
		solid(shaggy(oval(cx + hx, y + 5.5 + hy, 5.5, 5.5)), WHITE_FUR, true),
		// Its face.
		solid(oval(cx + hx, y + 6.5 + hy, 3.2, 2.6), BARE, true),
		...(look === 'up'
			? [box(x + 4, y + 5, 1, 1, INK), box(x + 8, y + 5, 1, 1, INK)]
			: [
					box(x + 4 + hx, y + 6 + hy, 2, 1, FACE_SHADE),
					box(x + 8 + hx, y + 6 + hy, 2, 1, FACE_SHADE),
				]),
	]
}

/** An arm, from its shoulder to its hand. */
const arm = (x1: number, y1: number, x2: number, y2: number, tv = false) =>
	solid(shaggy(limb(x1, y1, x2, y2, 2)), WHITE_FUR, tv)

/** A hand, bare, its palm or its back to us. */
const hand = (x: number, y: number, w = 3, h = 2) =>
	solid(area(x, y, w, h), BARE)

const MUG = '#d8473b'
const MUG_LIT = '#f06a5a'
const BOWL = '#3f7fc6'
const BOWL_LIT = '#6aa6e6'
const POPCORN = '#fff4cf'
const POPCORN_SHADE = '#e8c56a'
const TARTAN = '#2f6a4a'
const TARTAN_LINE = '#c8423a'
const TARTAN_DARK = '#234f37'
const ZED = '#cfe0f4'

/**
 * Three on the rust sofa: one sipping from a mug, one with a bowl of
 * popcorn in its lap, a piece on its way up, and one gone to sleep under
 * a tartan blanket, its head on one side, Zzz.
 */
const RUST_SOFA = (() => {
	const w = 50
	const layers: Paint[] = [
		...sofa(w, RUST, true),
		// Sipping.
		...sitter(5, 1),
		arm(7, 11, 9, 16, true),
		arm(16, 11, 14, 16),
		hand(9, 14, 4, 2),
		hand(8, 9, 4, 2),
		rects([
			[8, 5, 4, 4, MUG],
			[8, 5, 4, 1, MUG_LIT],
			[6, 6, 2, 1, MUG],
			[6, 7, 1, 1, MUG],
			[6, 8, 2, 1, MUG],
		]),
		// Popcorn.
		...sitter(18, 1),
		arm(20, 11, 22, 16, true),
		arm(29, 11, 28, 14),
		rects([
			[20, 15, 10, 3, BOWL],
			[20, 15, 10, 1, BOWL_LIT],
			[21, 18, 8, 1, BOWL],
			[21, 14, 8, 1, POPCORN],
			[22, 13, 2, 1, POPCORN],
			[25, 13, 3, 1, POPCORN],
			[23, 14, 1, 1, POPCORN_SHADE],
			[26, 14, 1, 1, POPCORN_SHADE],
			[24, 9, 1, 1, POPCORN],
		]),
		hand(27, 13, 3, 2),
		// Asleep, under a blanket.
		...sitter(31, 2, 'asleep'),
		rects([
			[30, 14, 15, 12, TARTAN],
			[30, 14, 15, 1, TARTAN_DARK],
			[30, 17, 15, 1, TARTAN_LINE],
			[30, 22, 15, 1, TARTAN_LINE],
			[34, 14, 1, 12, TARTAN_LINE],
			[40, 14, 1, 12, TARTAN_LINE],
			[31, 26, 1, 1, TARTAN],
			[33, 26, 1, 1, TARTAN],
			[36, 26, 1, 1, TARTAN],
			[39, 26, 1, 1, TARTAN],
			[42, 26, 1, 1, TARTAN],
		]),
		// Zzz.
		rects([
			[44, 2, 3, 1, ZED],
			[45, 3, 1, 1, ZED],
			[44, 4, 3, 1, ZED],
			[47, 0, 2, 1, ZED],
			[48, 1, 1, 1, ZED],
			[47, 1, 1, 1, ZED],
			[47, 2, 2, 1, ZED],
		]),
	]
	return { w, layers }
})()

const REMOTE = '#2b2b30'
const REMOTE_BUTTON = '#e8473c'
/** A crocheted blanket over the back of the sofa, in squares. */
const CROCHET = ['#e85a7a', '#5ab0d8', '#8fcf6a', '#f2f0e6']
const CROCHET_LIT = '#f7c2cf'

/** The sole of a big foot, held up at us, 5 by 6: its toes, its pad, fur round it. */
const sole = (x: number, y: number): PixelRect[] => [
	[x, y + 1, 5, 4, FUR],
	[x + 1, y + 5, 3, 1, FUR_SHADE],
	[x + 1, y + 2, 3, 3, FACE],
	[x + 1, y + 1, 3, 1, FACE_SHADE],
	[x, y, 1, 1, FACE],
	[x + 2, y, 1, 1, FACE],
	[x + 4, y, 1, 1, FACE],
]

/**
 * Two on the mustard sofa, a crocheted blanket over its arm: one sat up,
 * pointing the remote at the telly, and one slumped down beside it, its
 * legs up over the other arm, its big feet in the air.
 */
const MUSTARD_SOFA = (() => {
	const w = 46
	// The blanket, granny squares, draped over the arm.
	const blanket: PixelRect[] = []
	for (let row = 0; row < 3; row++)
		for (let col = 0; col < 2; col++)
			blanket.push([
				col * 3,
				12 + row * 3,
				3,
				3,
				CROCHET[(row + col * 2) % CROCHET.length],
			])
	blanket.push([0, 12, 6, 1, CROCHET_LIT])
	const layers: Paint[] = [
		...sofa(w, MUSTARD, false),
		rects(blanket),
		// The remote, held out at the telly.
		...sitter(5, 1),
		arm(7, 11, 2, 12, true),
		hand(0, 11, 3, 2),
		rects([
			[0, 9, 2, 3, REMOTE],
			[0, 9, 1, 1, REMOTE_BUTTON],
		]),
		arm(16, 11, 14, 16),
		hand(13, 15, 3, 2),
		// Slumped, its legs up over the arm, its feet in the air.
		solid(shaggy(limb(31, 17, 37, 8, 2.4)), FAR_FUR),
		solid(shaggy(oval(29, 17, 7, 4.5)), WHITE_FUR, true),
		solid(shaggy(limb(32, 19, 42, 10, 2.6)), WHITE_FUR),
		...[
			[35, 2],
			[40, 3],
		].map(([fx, fy]) => rects(sole(fx, fy))),
		solid(shaggy(oval(25.5, 9.5, 5.5, 5.5)), WHITE_FUR, true),
		solid(oval(25.5, 10.5, 3.2, 2.6), BARE, true),
		box(23, 9, 1, 1, INK),
		box(27, 9, 1, 1, INK),
		box(24, 12, 3, 1, FACE_SHADE),
		arm(23, 15, 27, 19, true),
	]
	return { w, layers }
})()

/**
 * Sofas, each with Yetis sat on it, facing out, watching the telly: stood
 * against the den's back wall, its feet on the floor.
 */
export const YETI_SOFAS: Picture[] = [RUST_SOFA, MUSTARD_SOFA].map(
	({ w, layers }) => ({
		asset: layered(w, SOFA_H, layers),
		width: w * CELL,
		height: SOFA_H * CELL,
	}),
)

// --- The telly ---------------------------------------------------------------

const CABINET = '#6e4a2c'
const CABINET_LIT = '#8f6640'
const CABINET_SIDE = '#4c321d'
const BEZEL = '#2b2722'
const AERIAL = '#a8b0ba'
const KNOB = '#cfcfcf'
const TABLE = '#9a6a3a'
const TABLE_LIT = '#b88550'
const TABLE_DARK = '#6e4a26'
/** On the screen: a mountain, snow on it, under a blue sky. */
const SCREEN = '#6fb6e8'
const SCREEN_BRIGHT = '#92cdf3'
const SCAN = '#d2eefe'
const PEAK = '#ffffff'
const PEAK_SHADE = '#b7cde4'

/**
 * A telly on a little table: a fat old set in a wooden cabinet, its aerial
 * up, turned three-quarters on, its screen to the right. On, a mountain on
 * it: flickering, a line rolling down it.
 */
function telly(flicker: boolean) {
	return pixelArt(18, 20, [
		// Its aerial, rabbit's ears.
		[8, 3, 3, 1, BEZEL],
		[7, 2, 1, 1, AERIAL],
		[6, 1, 1, 1, AERIAL],
		[5, 0, 1, 1, AERIAL],
		[11, 2, 1, 1, AERIAL],
		[12, 1, 1, 1, AERIAL],
		[13, 0, 1, 1, AERIAL],
		// The cabinet: its top, its side going away to the left, its front.
		[2, 4, 15, 1, CABINET_LIT],
		[1, 5, 4, 8, CABINET_SIDE],
		[4, 5, 13, 9, CABINET],
		[1, 13, 3, 1, CABINET_SIDE],
		// The screen, in its bezel, its corners round.
		[5, 5, 11, 7, BEZEL],
		[6, 6, 9, 5, flicker ? SCREEN_BRIGHT : SCREEN],
		[7, 8, 1, 1, PEAK_SHADE],
		[8, 7, 2, 1, PEAK],
		[10, 8, 3, 1, PEAK],
		[9, 8, 1, 1, PEAK_SHADE],
		[6, 9, 9, 2, PEAK_SHADE],
		[8, 9, 3, 1, PEAK],
		...(flicker ? ([[6, 9, 9, 1, SCAN]] as PixelRect[]) : []),
		[6, 6, 1, 1, BEZEL],
		[14, 6, 1, 1, BEZEL],
		[6, 10, 1, 1, BEZEL],
		[14, 10, 1, 1, BEZEL],
		// Its knobs, and its speaker.
		[6, 12, 1, 1, KNOB],
		[8, 12, 1, 1, KNOB],
		[11, 12, 4, 1, CABINET_SIDE],
		// The table: its top, a shelf, its legs.
		[0, 14, 18, 2, TABLE],
		[0, 14, 18, 1, TABLE_LIT],
		[1, 16, 16, 1, TABLE_DARK],
		[2, 17, 2, 3, TABLE_DARK],
		[14, 17, 2, 3, TABLE_DARK],
		[3, 18, 12, 1, TABLE],
	])
}

/** A telly on a little table, side on to us, turned to the sofa: its screen flickering, two frames. */
export const TELLY = {
	frames: [telly(false), telly(true)] as [string, string],
	width: 18 * CELL,
	height: 20 * CELL,
}

// --- The lamp ----------------------------------------------------------------

const SHADE_LIT = '#ffe39a'
const SHADE_BASE = '#f4b94e'
const SHADE_DARK = '#d6913a'
const FRINGE = '#c2702a'
const BULB = '#fff6d0'
const BRASS = '#b8913e'
const BRASS_DARK = '#7d6128'
const GLOW = '#ffd76a'

/** A glow of light: rings round `cx`, `cy`, fainter outwards. */
function glow(cx: number, cy: number, r: number, colour: string) {
	return (x: number, y: number) => {
		const d = Math.hypot(x - cx, y - cy) / r
		if (d > 1) return undefined
		return `${colour}${d > 0.66 ? '18' : d > 0.33 ? '30' : '48'}`
	}
}

/**
 * A standard lamp, on: a fringed shade, lit through, on a brass pole,
 * its glow round it. 16 by 36, a glow's worth wider than the lamp.
 */
const LAMP_W = 16
const LAMP_H = 36
export const LAMP: Picture = {
	asset: paintedArt(LAMP_W, LAMP_H, (x, y) => {
		const mid = LAMP_W / 2
		// The shade, wider at the bottom.
		if (y > 2 && y < 11) {
			const half = 3 + ((y - 2) / 9) * 3.5
			const dx = x - mid
			if (Math.abs(dx) < half) {
				if (y < 4) return SHADE_LIT
				return dx > half / 3 ? SHADE_DARK : SHADE_BASE
			}
		}
		// Its fringe, and the bulb, under it.
		if (y > 11 && y < 12 && Math.abs(x - mid) < 6.5)
			return Math.floor(x) % 2 ? FRINGE : undefined
		if (y > 11 && y < 12 && Math.abs(x - mid) < 2) return BULB
		// The pole, and its foot.
		if (y > 33 && Math.abs(x - mid) < 3.5 - (y > 35 ? 0 : 1))
			return y < 34 ? BRASS : BRASS_DARK
		if (y > 11 && Math.abs(x - mid) < 1) return x < mid ? BRASS : BRASS_DARK
		return glow(mid, 8, 8, GLOW)(x, y)
	}),
	width: LAMP_W * CELL,
	height: LAMP_H * CELL,
}

// --- The family portrait --------------------------------------------------------

const FRAME = '#8a5a2e'
const FRAME_LIT = '#b47c44'
const FRAME_DARK = '#5e3a1c'
const PORTRAIT_SKY = '#8cc4ec'
const PORTRAIT_ROCK = '#71819c'
const PORTRAIT_ROCK_SHADE = '#5c6a84'
const PORTRAIT_SNOW = '#f4f7fb'
const BOW = '#e0607e'
const BOW_DARK = '#b8405e'
const STRING = '#3a2a1a'
const NAIL = '#9aa3ad'

/** How wide its frame is, and how far its string goes up over it to the nail. */
const PORTRAIT_W = 34
const PORTRAIT_FRAMED = 26
const PORTRAIT_STRING = 5

/**
 * A yeti's head and shoulders, for the portrait, its head's middle `cx`,
 * `cy`, `size` across: shaggy, its face bare, an eye a dark cell either
 * side, grinning for the camera.
 */
function posing(cx: number, cy: number, size: number): Paint[] {
	const r = size / 2
	return [
		solid(shaggy(oval(cx, cy + r * 2.1, r * 1.45, r * 1.15))),
		solid(shaggy(oval(cx, cy, r, r))),
		solid(oval(cx, cy + r * 0.25, r * 0.62, r * 0.48), BARE),
		box(Math.floor(cx - r * 0.38), Math.floor(cy), 1, 1, INK),
		box(Math.floor(cx + r * 0.38), Math.floor(cy), 1, 1, INK),
		box(Math.floor(cx) - 1, Math.floor(cy + r * 0.45), 3, 1, MOUTH),
	]
}

/**
 * The family portrait, framed, hung on the den's back wall on a string
 * from a nail: the yetis, posed in front of Everest, snow on its top,
 * under a blue sky. Dad on the left, Mum on the right with a pink bow on her head,
 * and the little one between them, in front. 34 by 31.
 */
export const PORTRAIT: Picture = (() => {
	const top = PORTRAIT_STRING
	const inner = (x: number, y: number) =>
		x > 2 && x < PORTRAIT_W - 2 && y > top + 2 && y < top + PORTRAIT_FRAMED - 2
	const layers: Paint[] = [
		// Its string, up from the top of its frame to the nail.
		(x, y) =>
			y < top && Math.abs(Math.abs(x - PORTRAIT_W / 2) - y * 2.2) < 1.2
				? STRING
				: undefined,
		box(PORTRAIT_W / 2 - 1, 0, 2, 1, NAIL),
		// Its frame: lit along its top and left, in shadow along its bottom
		// and right.
		box(0, top, PORTRAIT_W, PORTRAIT_FRAMED, FRAME),
		box(0, top, PORTRAIT_W, 1, FRAME_LIT),
		box(0, top, 1, PORTRAIT_FRAMED, FRAME_LIT),
		box(0, top + PORTRAIT_FRAMED - 1, PORTRAIT_W, 1, FRAME_DARK),
		box(PORTRAIT_W - 1, top, 1, PORTRAIT_FRAMED, FRAME_DARK),
		box(2, top + 2, PORTRAIT_W - 4, 1, FRAME_DARK),
		box(2, top + 2, 1, PORTRAIT_FRAMED - 4, FRAME_DARK),
		// The sky, and Everest under it: grey rock, in shadow down its
		// right, snow on its top.
		(x, y) => (inner(x, y) ? PORTRAIT_SKY : undefined),
		(x, y) => {
			if (!inner(x, y)) return undefined
			const down = y - top
			const peak = 5 + Math.abs(x - 17) * 0.8
			if (down < peak) return undefined
			if (down < peak + 2.5) return PORTRAIT_SNOW
			return x > 17 ? PORTRAIT_ROCK_SHADE : PORTRAIT_ROCK
		},
		// Dad, Mum, and the little one in front of them.
		...posing(10.5, top + 10.5, 8),
		...posing(23.5, top + 11.5, 7.5),
		box(23, top + 7, 2, 2, BOW),
		box(26, top + 7, 2, 2, BOW),
		box(25, top + 7, 1, 2, BOW_DARK),
		...posing(17, top + 16, 5.5),
		// Its frame again, over the bottom of them, so they're inside it.
		(x, y) =>
			!inner(x, y) && y >= top && y < top + PORTRAIT_FRAMED
				? y === top + PORTRAIT_FRAMED - 1 + 0.5 || x === PORTRAIT_W - 0.5
					? FRAME_DARK
					: y === top + 0.5 || x === 0.5
						? FRAME_LIT
						: (x > 2 && x < 3) || (y > top + 2 && y < top + 3)
							? FRAME_DARK
							: FRAME
				: undefined,
	]
	return {
		asset: layered(PORTRAIT_W, top + PORTRAIT_FRAMED, layers),
		width: PORTRAIT_W * CELL,
		height: (top + PORTRAIT_FRAMED) * CELL,
	}
})()

// --- The Yeti, who throws you out ------------------------------------------

const LAUNCHER_W = 36
const KNEEL_H = 40
const THROWN_H = 48

/** Down on one knee, leaning in, his hands cupped low in front, grinning. */
const kneel = layered(LAUNCHER_W, KNEEL_H, [
	// His far leg, its knee up, its foot flat on the floor; his far arm.
	solid(limb(22, 27, 14, 25, 3.5), FAR_FUR),
	solid(limb(14, 26, 14, 35, 3), FAR_FUR),
	solid(oval(11.5, 37.6, 5.5, 2.4), FAR_FUR),
	solid(shaggy(limb(20, 17, 12, 31, 3)), FAR_FUR),
	// His body, hunched forward, shaggy.
	solid(shaggy(oval(23, 20, 10.5, 10)), WHITE_FUR),
	// His near leg, its knee down, its foot behind him on its toes.
	solid(shaggy(limb(25, 27, 22, 35.5, 4)), WHITE_FUR),
	solid(limb(23, 37, 30, 37, 2.4), WHITE_FUR),
	solid(limb(30, 37, 33, 34, 2.2), WHITE_FUR),
	solid(oval(34.5, 34.5, 1.5, 3), BARE),
	box(34, 38, 2, 1, FACE_SHADE),
	// His head, low and forward.
	solid(shaggy(oval(12, 11, 6.5, 6)), WHITE_FUR),
	solid(oval(8.5, 12.5, 4, 3.6), BARE),
	box(7, 10, 1, 1, INK),
	// A grin, a tooth showing.
	box(5, 14, 5, 1, MOUTH),
	box(9, 13, 2, 1, MOUTH),
	box(6, 14, 1, 1, FUR_LIT),
	// His near arm, down to his hands.
	solid(shaggy(limb(18, 17, 9, 30, 3.2)), WHITE_FUR),
	// His hands, cupped together, palms up, a scoop of them: his
	// fingertips curled up at the front, the heels of his hands behind.
	solid(
		(x, y) =>
			(x >= 2 && x < 13 && y >= 33 && y < 35) ||
			(x >= 3 && x < 12 && y >= 35 && y < 36) ||
			(x >= 1 && x < 4 && y >= 30 && y < 34) ||
			(x >= 10 && x < 14 && y >= 30 && y < 34),
		BARE,
	),
	box(2, 31, 1, 1, FACE_SHADE),
	box(2, 33, 1, 1, FACE_SHADE),
])

/** Up on his feet, arms flung up over his head, delighted. */
const thrown = layered(LAUNCHER_W, THROWN_H, [
	// His far arm, up.
	solid(shaggy(limb(26, 22, 30, 6, 3)), FAR_FUR),
	solid(oval(31, 3.5, 2.5, 3), BARE),
	// His far leg.
	solid(limb(23, 37, 23, 44, 3.5), FAR_FUR),
	solid(oval(21.5, 45.5, 5, 2.5), FAR_FUR),
	// His body, shaggy.
	solid(shaggy(oval(19, 29, 10, 10.5)), WHITE_FUR),
	// His near leg, and his foot.
	solid(shaggy(limb(15, 37, 15, 44, 3.8)), WHITE_FUR),
	solid(oval(12.5, 45.5, 6, 2.5), WHITE_FUR),
	// His head.
	solid(shaggy(oval(19, 14, 6.5, 6)), WHITE_FUR),
	solid(oval(15.5, 15.5, 4, 3.6), BARE),
	// Eyes screwed up happy, his mouth wide open.
	box(13, 13, 1, 1, INK),
	box(14, 12, 1, 1, INK),
	box(15, 13, 1, 1, INK),
	box(12, 16, 5, 3, MOUTH),
	box(13, 18, 3, 1, TONGUE),
	// His near arm, flung up.
	solid(shaggy(limb(12, 23, 6, 6, 3.2)), WHITE_FUR),
	solid(oval(5, 3.5, 2.8, 3.2), BARE),
])

/**
 * The Yeti who throws you out: facing left, the way you come at him.
 * `kneel`ing on one knee, his hands cupped low in front of him, for you
 * to run into; and having `thrown` you, stood up, arms flung up over his
 * head. `hands` is where his cupped hands are, kneeling, from the
 * picture's top left, in world pixels.
 */
export const LAUNCHER = {
	kneel,
	thrown,
	width: LAUNCHER_W * CELL,
	kneelHeight: KNEEL_H * CELL,
	thrownHeight: THROWN_H * CELL,
	hands: { x: 7 * CELL, y: 33 * CELL },
}

const SIGN_WOOD = '#8a5a32'
const SIGN_LIT = '#a8743f'
const SIGN_SHADE = '#5e3a1e'
const SIGN_CARVED = '#3f2614'
const SIGN_SNOW = '#f6f9fc'

/**
 * A wooden signpost at the lip of the crevasse down to the den: old,
 * weathered, snow on its top, an arrow carved in it, pointing down. Only a
 * hint: no words, smaller than a runner, easy to run past. Shown at twice
 * its size, as scenery.
 */
export const DEN_SIGN = pixelArt(12, 20, [
	// Its post, sunk in the snow.
	[5, 8, 2, 12, SIGN_SHADE],
	[5, 8, 1, 12, SIGN_WOOD],
	// Its board, lit along its top, in shadow along its bottom.
	[1, 2, 10, 7, SIGN_WOOD],
	[1, 2, 10, 1, SIGN_LIT],
	[1, 8, 10, 1, SIGN_SHADE],
	[10, 3, 1, 5, SIGN_SHADE],
	// The arrow carved into it: down.
	[5, 3, 2, 2, SIGN_CARVED],
	[3, 5, 6, 1, SIGN_CARVED],
	[4, 6, 4, 1, SIGN_CARVED],
	[5, 7, 2, 1, SIGN_CARVED],
	// Snow on its top, and drifted round its foot.
	[2, 0, 6, 1, SIGN_SNOW],
	[1, 1, 10, 1, SIGN_SNOW],
	[4, 18, 4, 1, SIGN_SNOW],
	[3, 19, 6, 1, SIGN_SNOW],
])
