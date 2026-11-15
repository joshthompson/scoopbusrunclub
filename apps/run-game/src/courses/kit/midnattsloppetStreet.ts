import {
	type PixelRect,
	pixelArt,
	pixelText,
	pixelTextWidth,
	rectsMarkup,
	svgUrl,
	tile,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * Midnattsloppet's streets, at night: Södermalm's stone apartment blocks,
 * lit windows over shops; Ringen's shopping centre and its crossroads; the
 * race's smoke machines and lighting rigs; and the road and pavement. Each
 * a cell a pixel, drawn at 2 (`scale: 2`), unless it says.
 *
 * It's dark, so everything's dark and greyed but what's lit: windows,
 * signs, lamps. Those are bright, each with a faint halo round it.
 */

/** A cell of the art: two screen pixels, as the rest of the game's. */
const CELL = 2

// --- Shared colours ---------------------------------------------------------

/** Glass with nobody home, and the street lamps' glint along its top. */
const PANE = '#191c2b'
const PANE_LIT = '#2b3148'
/** A window with its lights on, warm, its glazing bars across it. */
const WARM = '#e8b65a'
const WARM_LIT = '#ffd98a'
const WARM_BARS = '#a87a38'
/** The glow round something lit, on the wall or in the air round it. */
const WARM_HALO = '#ffd76a16'
/** Tin roofs, standing-seamed. */
const ROOF = '#262a37'
const ROOF_LIT = '#3a3f50'
const ROOF_SEAM = '#1f222d'
/** The granite along the foot of every wall. */
const PLINTH = '#2e3038'
const PLINTH_LIT = '#3d3f49'
/** Front doors, old and wooden, a fanlight over each. */
const DOOR = '#2a2326'
const DOOR_SHADE = '#1c1719'
const FANLIGHT = '#8c6c3c'
/** Steel and aluminium: poles, trusses, canopies. */
const STEEL = '#5c616b'
const STEEL_LIT = '#787e89'
const STEEL_SHADE = '#41454d'
const INK = '#15161b'

/** `colour` faint, for a halo: a hex colour, its alpha added. */
const halo = (colour: string, alpha = '1c') => `${colour}${alpha}`

// --- Södermalm's apartment blocks -------------------------------------------

const BLOCK_H = 95
/** Where the walls start, under the roof, and each storey's height. */
const EAVES = 10
const STOREY = 11
/** The belt of stone over the shops, and the ground floor's foot. */
const BELT = 68
const FOOT = 93

/** A block's shop: its sign, its window and door, lit, and the port to the stairs. */
interface Shop {
	/** What its sign says, its board's colour and its letters'. */
	sign: string
	board: string
	letters: string
	/** Whether its letters are neon, glowing. */
	neon?: boolean
	/** The light in its window: the glass, brighter along its top, and what's on display in it. */
	light: [string, string, string]
	/** Its window, from and to, across. */
	window: [number, number]
	/** Its door's left edge, and the port's, the stairs' front door. */
	door: number
	port: number
}

/**
 * One of Södermalm's blocks, `width` cells wide, 95 tall: five storeys of
 * plastered stone under a tin roof, chimneys up off it (and dormers in it,
 * if it has them), most windows dark, a few lit (which, `seed` says); a
 * shop on the ground floor, its sign over its window, and the port, its
 * fanlight lit, up to the flats. Its far side in shade, so blocks stood
 * side by side read as one and the next.
 */
function soderBlock(options: {
	width: number
	seed: number
	/** Its plaster: a colour, lit, and in shade. */
	wall: [string, string, string]
	/** How far down from the top its roof starts. */
	roof: number
	chimneys: number[]
	dormers?: number[]
	shop: Shop
}) {
	const { width: W, shop } = options
	const [wall, lit, shade] = options.wall
	const random = seeded(options.seed)
	const r: PixelRect[] = []
	const roofTop = options.roof

	// Its chimneys, plastered, a cap on each, behind the roof.
	for (const x of options.chimneys) {
		r.push([x, roofTop - 6, 4, 8, wall])
		r.push([x + 3, roofTop - 6, 1, 8, shade])
		r.push([x - 1, roofTop - 7, 6, 2, shade])
		r.push([x - 1, roofTop - 7, 6, 1, lit])
	}
	// Its roof, tin, its seams running back up it, lit along its ridge.
	r.push([0, roofTop, W, EAVES - roofTop, ROOF])
	for (let x = 3; x < W; x += 6)
		r.push([x, roofTop + 1, 1, EAVES - roofTop - 1, ROOF_SEAM])
	r.push([0, roofTop, W, 1, ROOF_LIT])
	// Its dormers, a little window in each, one of them lit.
	for (const [i, x] of (options.dormers ?? []).entries()) {
		r.push([x, roofTop - 3, 7, EAVES - roofTop + 3, ROOF])
		r.push([x - 1, roofTop - 4, 9, 1, ROOF_LIT])
		r.push([x + 6, roofTop - 3, 1, EAVES - roofTop + 3, ROOF_SEAM])
		r.push([x + 2, roofTop - 1, 3, 4, i === 0 ? WARM : PANE])
	}

	// Its walls, a cornice under the roof, lit along it; its far side in shade.
	r.push([0, EAVES, W, FOOT - EAVES, wall])
	r.push([0, EAVES, W, 1, lit])
	r.push([0, EAVES + 2, W, 1, shade])
	r.push([W - 2, EAVES, 2, FOOT - EAVES, shade])

	// Five storeys of windows, most dark, now and then one lit.
	const across = Math.floor((W - 6) / 10)
	const from = Math.floor((W - (across * 10 - 5)) / 2)
	for (let s = 0; s < 5; s++) {
		const y = EAVES + 5 + s * STOREY
		for (let i = 0; i < across; i++) {
			const x = from + i * 10
			if (random() < 0.13) {
				r.push([x - 1, y - 1, 7, 9, WARM_HALO])
				r.push([x, y, 5, 7, WARM])
				r.push([x, y, 5, 1, WARM_LIT])
				// Its glazing bars: a transom, and the casements under it.
				r.push([x, y + 2, 5, 1, WARM_BARS])
				r.push([x + 2, y + 3, 1, 4, WARM_BARS])
			} else {
				r.push([x, y, 5, 7, PANE])
				r.push([x, y, 1, 2, PANE_LIT])
			}
			r.push([x - 1, y + 7, 7, 1, lit])
		}
	}

	// A belt of stone between the flats and the shop.
	r.push([0, BELT, W, 1, lit])
	r.push([0, BELT + 1, W, 1, shade])

	// The shop: its window, lit, a glow round it, what's on show at the
	// bottom of it, its glazing bars; its door, glass, lit too.
	const [light, lightTop, display] = shop.light
	const [wx0, wx1] = shop.window
	const glow = halo(light, '18')
	r.push([wx0 - 1, 80, wx1 - wx0 + 2, FOOT - 80, glow])
	r.push([wx0, 81, wx1 - wx0, FOOT - 81, light])
	r.push([wx0, 81, wx1 - wx0, 1, lightTop])
	r.push([wx0, FOOT - 3, wx1 - wx0, 3, display])
	for (let x = wx0 + 10; x < wx1 - 4; x += 10)
		r.push([x, 81, 1, FOOT - 81, shop.board])
	r.push([shop.door - 1, 78, 8, FOOT - 78, glow])
	r.push([shop.door, 79, 6, FOOT - 79, shop.board])
	r.push([shop.door + 1, 80, 4, FOOT - 81, light])
	r.push([shop.door + 1, 80, 4, 1, lightTop])
	r.push([shop.door + 4, 86, 1, 2, shop.board])
	// The port up to the flats: a stone surround, a wooden door, its
	// fanlight lit dim from the stairs.
	const p = shop.port
	r.push([p - 1, 76, 8, FOOT - 76, lit])
	r.push([p, 77, 6, FOOT - 77, DOOR])
	r.push([p, 77, 6, 3, FANLIGHT])
	r.push([p, 80, 6, 1, DOOR_SHADE])
	r.push([p + 3, 81, 1, FOOT - 81, DOOR_SHADE])
	// The granite along its foot.
	r.push([0, FOOT, W, BLOCK_H - FOOT, PLINTH])
	r.push([0, FOOT, W, 1, PLINTH_LIT])

	// The sign, on a board over the window, its letters lit.
	const textWidth = pixelTextWidth(shop.sign, 1)
	const boardWidth = textWidth + 4
	const sx = Math.round((wx0 + wx1 - boardWidth) / 2)
	const sign: PixelRect[] = [[sx, 71, boardWidth, 9, shop.board]]
	if (shop.neon)
		sign.unshift([sx - 1, 70, boardWidth + 2, 11, halo(shop.letters, '30')])
	return svgUrl(
		W,
		BLOCK_H,
		rectsMarkup([...r, ...sign]) +
			pixelText(shop.sign, sx + 2, 72, 1, shop.letters),
	)
}

/**
 * Södermalm's apartment blocks, five storeys of plastered stone, shops on
 * the ground floor, some windows lit: three of them, to take in turn.
 * Each `width` cells wide, 95 tall. Ochre, its pizzeria still open; dusty
 * pink, dormers in its roof, the corner shop, the LIVS, lit up white; and
 * pale grey-green, a bar under it, its sign in pink neon.
 */
export const SODER_BLOCKS = [
	{
		asset: soderBlock({
			width: 60,
			seed: 731_205,
			wall: ['#6b5a3e', '#7d6b4c', '#54462f'],
			roof: 3,
			chimneys: [12, 42],
			shop: {
				sign: 'PIZZA',
				board: '#3e1d1c',
				letters: '#ffd27a',
				light: ['#eeb560', '#ffd690', '#9c6a34'],
				window: [4, 34],
				door: 36,
				port: 48,
			},
		}),
		width: 60,
	},
	{
		asset: soderBlock({
			width: 72,
			seed: 488_117,
			wall: ['#6a4f50', '#7c5f5e', '#523c3e'],
			roof: 4,
			chimneys: [32],
			dormers: [12, 50],
			shop: {
				sign: 'LIVS',
				board: '#1d3442',
				letters: '#e6f1ff',
				light: ['#cadbd2', '#eaf6ef', '#7f958c'],
				window: [20, 50],
				door: 53,
				port: 7,
			},
		}),
		width: 72,
	},
	{
		asset: soderBlock({
			width: 66,
			seed: 259_663,
			wall: ['#4e5a52', '#5f6b62', '#3d4740'],
			roof: 6,
			chimneys: [8, 30, 52],
			shop: {
				sign: 'BAR',
				board: '#1c1a24',
				letters: '#ff6fae',
				neon: true,
				light: ['#dc9446', '#f2b866', '#8e5626'],
				window: [4, 30],
				door: 32,
				port: 52,
			},
		}),
		width: 66,
	},
]

// --- Ringen and its crossroads ----------------------------------------------

const BRICK = '#4d3a35'
const BRICK_LIT = '#5f4a43'
const BRICK_SHADE = '#3a2b28'
const CONCRETE = '#5c5859'
const CONCRETE_LIT = '#76716f'
/** Glass with the offices' lights off behind it, and its glint. */
const OFFICE = '#1d2333'
const OFFICE_LIT = '#2c3447'
/** The shopping centre's insides, through its glass, lit up all night. */
const MALL = '#d6c290'
const MALL_LIT = '#eedcab'
const MALL_SHADE = '#9c8758'
const RINGEN_RED = '#ff5e5a'

/**
 * Ringen, the shopping centre at Skanstull, its name lit up over its doors:
 * a big low modern block, brick, with ribbon windows along its two storeys
 * of offices and a glass storey set back on top; and the shops along its
 * ground floor, all glass, lit up inside, its doors in the middle under a
 * canopy, and over them, on a black board, RINGEN in red. 130 by 70.
 */
export const ringen = (() => {
	const W = 130
	const H = 70
	const name = 'RINGEN'
	const nameWidth = pixelTextWidth(name, 1)
	const nameX = Math.floor((W - nameWidth) / 2)
	const r: PixelRect[] = []
	// The glass storey on top, set back, steel along its roof, a light on
	// in it here and there.
	r.push([12, 6, W - 24, 10, OFFICE])
	r.push([12, 6, W - 24, 1, OFFICE_LIT])
	for (let x = 12; x < W - 12; x += 8) r.push([x, 6, 1, 10, STEEL_SHADE])
	for (const x of [29, 77]) r.push([x, 8, 7, 7, MALL_SHADE])
	r.push([10, 4, W - 20, 2, STEEL])
	r.push([10, 4, W - 20, 1, STEEL_LIT])
	// The block, brick, concrete coping along its top, its far side in shade.
	r.push([0, 16, W, H - 16, BRICK])
	r.push([0, 16, W, 2, CONCRETE])
	r.push([0, 16, W, 1, CONCRETE_LIT])
	r.push([0, 18, W, 1, BRICK_SHADE])
	r.push([W - 2, 18, 2, H - 18, BRICK_SHADE])
	// Its ribbon windows, two storeys, dark; a sill of concrete under each.
	for (const y of [22, 32]) {
		r.push([4, y, W - 8, 6, OFFICE])
		r.push([4, y, W - 8, 1, OFFICE_LIT])
		for (let x = 4; x < W - 4; x += 6) r.push([x, y, 1, 6, BRICK_SHADE])
		r.push([3, y + 6, W - 6, 1, CONCRETE_LIT])
	}
	// Someone working late.
	r.push([95, 33, 5, 5, MALL_SHADE])
	// The shops' glass along the ground floor, lit, and a glow off it.
	r.push([2, 52, W - 4, 17, halo('#ffd76a', '14')])
	r.push([4, 54, W - 8, 14, MALL])
	r.push([4, 54, W - 8, 1, MALL_LIT])
	r.push([4, 65, W - 8, 3, MALL_SHADE])
	for (let x = 4; x < W - 4; x += 10) r.push([x, 54, 1, 14, INK])
	// The shops' signs inside, coloured, too far in to read.
	r.push([8, 56, 8, 2, '#c8463e'])
	r.push([28, 56, 10, 2, '#3a78c4'])
	r.push([96, 56, 9, 2, '#3e9a5a'])
	r.push([112, 56, 8, 2, '#d8a03a'])
	// The doors, in the middle, brighter, under a canopy.
	r.push([48, 55, 34, 13, MALL_LIT])
	for (const x of [48, 56, 65, 74, 82]) r.push([x, 55, 1, 13, INK])
	r.push([36, 52, 58, 2, STEEL])
	r.push([36, 52, 58, 1, STEEL_LIT])
	// The granite along its foot.
	r.push([0, H - 2, W, 2, PLINTH])
	r.push([0, H - 2, W, 1, PLINTH_LIT])
	// Its name, over the doors, on a black board, glowing.
	r.push([nameX - 7, 40, nameWidth + 14, 13, halo(RINGEN_RED, '24')])
	r.push([nameX - 6, 41, nameWidth + 12, 11, INK])
	r.push([nameX - 6, 41, nameWidth + 12, 1, '#2a2b33'])
	return svgUrl(
		W,
		H,
		rectsMarkup(r) + pixelText(name, nameX, 43, 1, RINGEN_RED),
	)
})()

/**
 * A traffic light at the crossroads by Ringen, on red for the race: a
 * Swedish one, its black head on a grey pole, and the yellow box for
 * pedestrians to press, the one that ticks. 8 by 40.
 */
export const trafficLight = pixelArt(8, 40, [
	// Its red, lit, glowing.
	[0, 1, 8, 5, halo('#ff3b2f', '2c')],
	// Its head: black, its three lights, only the red on.
	[1, 0, 6, 16, INK],
	[1, 0, 6, 1, '#2a2c34'],
	[2, 1, 4, 4, '#ff3b2f'],
	[2, 1, 2, 1, '#ffa59b'],
	[2, 6, 4, 4, '#3a2c12'],
	[2, 11, 4, 4, '#10301c'],
	// Its pole, in shade down its far side.
	[3, 16, 2, 22, STEEL],
	[4, 16, 1, 22, STEEL_SHADE],
	// The pedestrians' box, yellow, its button and its little light.
	[0, 24, 3, 6, '#c29b22'],
	[0, 24, 3, 1, '#ddb83a'],
	[1, 26, 1, 1, INK],
	[1, 28, 1, 1, '#ff6a50'],
	// Its foot.
	[2, 38, 4, 2, STEEL_SHADE],
	[2, 38, 4, 1, STEEL],
])

/**
 * A smoke machine, on the kerb, smoke rolling out of its nozzle (see
 * `look.smoke`): a black box, a handle on top, vents in its side, its
 * green light on for ready, and its nozzle out to the left. 16 by 10.
 */
export const smokeMachine = pixelArt(16, 10, [
	// Its handle.
	[8, 1, 5, 1, STEEL],
	[8, 2, 1, 1, STEEL_SHADE],
	[12, 2, 1, 1, STEEL_SHADE],
	// Its box, lit along its top, darker along its bottom.
	[4, 3, 12, 6, '#23252e'],
	[4, 3, 12, 1, '#383b47'],
	[4, 8, 12, 1, INK],
	// Its vents, and its ready light.
	[6, 5, 4, 1, INK],
	[6, 7, 4, 1, INK],
	[13, 5, 1, 1, '#4cff7a'],
	// Its nozzle, steel, its mouth dark.
	[0, 5, 4, 2, STEEL],
	[1, 5, 3, 1, STEEL_LIT],
	[0, 5, 1, 2, INK],
	// Its feet.
	[5, 9, 2, 1, INK],
	[13, 9, 2, 1, INK],
])

/** A lamp on the rig: its can, black; its lens, `colour`, and a glint; a glow round it. */
const rigLamp = (
	x: number,
	y: number,
	[colour, glint]: [string, string],
): PixelRect[] => [
	[x - 2, y, 10, 5, halo(colour, '26')],
	[x - 1, y - 1, 8, 1, halo(colour, '26')],
	[x - 1, y + 5, 8, 1, halo(colour, '26')],
	[x, y, 6, 5, INK],
	[x + 1, y + 1, 4, 3, colour],
	[x + 1, y + 1, 1, 1, glint],
]
const BLUE: [string, string] = ['#4f8bff', '#b8d0ff']
const MAGENTA: [string, string] = ['#ff4fd8', '#ffc0f0']
const CYAN: [string, string] = ['#5ae2ff', '#c8f6ff']

/**
 * A lighting rig: a truss tower, coloured lamps up it, lit. Aluminium,
 * two uprights braced across and zigzagged between, on a weighted foot; a
 * bar across its top with two lamps under it, and three more clamped up
 * it, blue, magenta and cyan. 14 by 70.
 */
export const lightRig = (() => {
	const r: PixelRect[] = []
	// Its uprights, the near one lit, the far one in shade.
	r.push([3, 4, 1, 64, STEEL_LIT])
	r.push([10, 4, 1, 64, STEEL_SHADE])
	// Braced across every 8, a zigzag between.
	for (let y = 6; y < 66; y += 8) {
		r.push([3, y, 8, 1, STEEL])
		for (let k = 1; k < 7; k++) {
			const x = (y / 8) % 2 < 1 ? 3 + k : 10 - k
			if (y + k < 66) r.push([x, y + k, 1, 1, STEEL])
		}
	}
	// The bar across its top, and its foot, weighted.
	r.push([0, 2, 14, 2, STEEL])
	r.push([0, 2, 14, 1, STEEL_LIT])
	r.push([1, 66, 12, 4, '#2c2f37'])
	r.push([1, 66, 12, 1, STEEL])
	// Its lamps: two hung under the bar, three clamped up it.
	r.push(...rigLamp(0, 4, MAGENTA))
	r.push(...rigLamp(8, 4, CYAN))
	r.push(...rigLamp(4, 20, BLUE))
	r.push(...rigLamp(4, 34, MAGENTA))
	r.push(...rigLamp(4, 48, CYAN))
	return pixelArt(14, 70, r)
})()

// --- The road and the pavement ----------------------------------------------

/**
 * The road's asphalt and the pavement's slabs, as patterns for the Ground's
 * layers (see `groundDefs`), filled with as `url(#midnatt-asphalt)` and
 * `url(#midnatt-pavement)`. See-through but for hints, over the road's and
 * the pavement's own colours: on the road, a glint of stone here and there
 * and a patch or two, darker, where it's been mended; on the pavement, a
 * slab's edge now and then, a joint in shadow and the street lights'
 * glint along it.
 */
export const ASPHALT = (() => {
	const W = 160
	const H = 17
	const random = seeded(2026)
	const t = tile(W * CELL, H * CELL)
	const cell = (x: number, y: number, w: number, h: number, fill: string) =>
		t.rect(x * CELL, y * CELL, w * CELL, h * CELL, fill)
	// Patches, mended, a little darker, catching the light along their tops.
	for (const x of [18, 104]) {
		const y = 3 + Math.floor(random() * 9)
		const w = 10 + Math.floor(random() * 8)
		cell(x, y, w, 3, 'rgba(10, 11, 18, 0.22)')
		cell(x + 1, y, w - 2, 1, 'rgba(200, 210, 255, 0.06)')
	}
	// Stones in it, glinting, and pits, dark.
	for (let i = 0; i < 14; i++)
		cell(
			Math.floor(((i + random()) * W) / 14),
			Math.floor(random() * H),
			1 + Math.floor(random() * 2),
			1,
			'rgba(200, 210, 255, 0.08)',
		)
	for (let i = 0; i < 9; i++)
		cell(
			Math.floor(((i + random()) * W) / 9),
			Math.floor(random() * H),
			1,
			1,
			'rgba(6, 7, 12, 0.3)',
		)
	return t.pattern('midnatt-asphalt')
})()
export const PAVEMENT = (() => {
	const W = 128
	const H = 12
	const ROW = 6
	const random = seeded(1993)
	const t = tile(W * CELL, H * CELL)
	const cell = (x: number, y: number, w: number, h: number, fill: string) =>
		t.rect(
			(((x % W) + W) % W) * CELL,
			(((y % H) + H) % H) * CELL,
			w * CELL,
			h * CELL,
			fill,
		)
	const shade = 'rgba(18, 18, 26, 0.26)'
	const glint = 'rgba(225, 228, 255, 0.08)'
	// A slab's corner here and there, along each row of them: the joint
	// over it and down its side in shadow, its top edge glinting.
	for (let row = 0; row < H / ROW; row++)
		for (let i = 0; i < 3; i++) {
			const x = Math.round(((i + random() * 0.7) * W) / 3)
			const y = row * ROW
			const w = 6 + Math.floor(random() * 8)
			cell(x, y, w, 1, shade)
			cell(x, y + 1, 1, ROW - 1, shade)
			cell(x + 1, y + 1, w - 1, 1, glint)
		}
	return t.pattern('midnatt-pavement')
})()
