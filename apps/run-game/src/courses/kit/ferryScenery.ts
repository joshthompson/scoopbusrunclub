import {
	type PixelRect,
	pixelArt,
	pixelCircle,
	pixelPolygon,
	pixelText,
	pixelTextWidth,
	svgUrl,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * Scoop Cruises' ferry, drawn in code: its plated side, rows of windows
 * and its red stripe; its funnel, its bridge and its lifeboats; and inside
 * it, its rooms' walls, one after another, its lorries, shelves and tables
 * to jump on, and the luggage left lying about.
 *
 * Big pictures are drawn a world pixel to a pixel, in steps of 2, so they
 * match the game's pixel art, drawn 2 px a cell.
 */

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

/** The ferry's own red, white and blue. */
export const FERRY_RED = '#d42127'
const RED_DARK = '#9e161b'
export const FERRY_WHITE = '#f3f4f1'
const WHITE_SHADE = '#dfe3e2'
const GLASS = '#2d4b66'
const GLASS_LIT = '#5a86a8'
const STEEL = '#8d949b'
const STEEL_DARK = '#6a7178'
const INK = '#1e2328'

// --- Its side ------------------------------------------------------------------

/**
 * Where its red stripe is, and the waterline, as world ys: the hull's tile
 * is lined up with the world, so they're always at the same height.
 */
export const STRIPE_Y = 452
export const WATERLINE = 520

/**
 * The ferry's plated side, 64 by 600, lined up with the world from y 0: a
 * row of windows every deck, down to 400; portholes; its red stripe; and
 * under the waterline, red antifouling.
 */
export const HULL_TILE = {
	width: 64,
	height: 600,
	asset: svgUrl(
		64,
		600,
		[
			rect(0, 0, 64, 600, FERRY_WHITE),
			// A deck's row of windows, every 40, and the deck's seam under it.
			...Array.from({ length: 10 }, (_, i) => {
				const y = i * 40
				return [
					rect(0, y + 12, 64, 12, GLASS),
					rect(0, y + 12, 64, 2, GLASS_LIT),
					...[14, 30, 46, 62].map((x) => rect(x, y + 12, 2, 12, FERRY_WHITE)),
					rect(0, y + 34, 64, 2, WHITE_SHADE),
				].join('')
			}),
			// Portholes, low down.
			...[12, 44].map(
				(x) =>
					`${pixelCircle(x - 2 + 12 / 2, 406 + 12 / 2, 6, WHITE_SHADE)}${pixelCircle(x + 8 / 2, 408 + 8 / 2, 4, GLASS)}`,
			),
			// Its stripe, and a thin one under it.
			rect(0, STRIPE_Y, 64, 18, FERRY_RED),
			rect(0, STRIPE_Y + 22, 64, 4, FERRY_RED),
			rect(0, STRIPE_Y + 40, 64, 2, WHITE_SHADE),
			// Under the water.
			rect(0, WATERLINE - 8, 64, 600 - WATERLINE + 8, '#7a1f24'),
			rect(0, WATERLINE - 8, 64, 2, '#5a1418'),
		].join(''),
	),
}

/**
 * SCOOP CRUISES, in red, as big as it's painted down a ferry's side: `cell`
 * px a cell, `width` by `height`.
 */
export const NAME_CELL = 6
export const NAME_WIDTH = pixelTextWidth('SCOOP CRUISES', NAME_CELL)
export const NAME_HEIGHT = 7 * NAME_CELL
export const lineName = svgUrl(
	NAME_WIDTH,
	NAME_HEIGHT,
	pixelText('SCOOP CRUISES', 0, 0, NAME_CELL, FERRY_RED),
)

/** The ship's own name, small, by its bow, and its port, by its stern. */
export const shipName = (text: string) =>
	svgUrl(pixelTextWidth(text, 2), 14, pixelText(text, 0, 0, 2, INK))

/** The stern's edge, from its roof down to the water, `height` tall: shaded, rounded at the top. */
export const STERN_WIDTH = 20
export function sternEdge(height: number) {
	return svgUrl(
		STERN_WIDTH,
		height,
		[
			rect(4, 0, 16, height, '#cfd4d3'),
			rect(0, 6, 4, height - 6, '#b9bfbf'),
			rect(2, 2, 18, 4, '#cfd4d3'),
			rect(0, height - 26, 20, 26, '#7a1f24'),
		].join(''),
	)
}

/**
 * Its bow visor, swung up open over the way off at the front, the ferry's
 * nose lifted like a helmet's visor: 180 by 160.
 */
export const VISOR_WIDTH = 180
export const VISOR_HEIGHT = 160
export const bowVisor = svgUrl(
	VISOR_WIDTH,
	VISOR_HEIGHT,
	[
		// Its arms, up from the hinge on the deck over it.
		pixelPolygon(
			[
				[0, 150],
				[14, 150],
				[70, 40],
				[60, 34],
			],
			'#9aa1a8',
		),
		// The visor itself, nose up: white, its stripe along its lip, and
		// dark inside, where it's open.
		`${pixelPolygon(
			[
				[30, 96],
				[120, 8],
				[180, 0],
				[172, 40],
				[96, 126],
				[40, 126],
			],
			FERRY_WHITE,
		)}`,
		`${pixelPolygon(
			[
				[40, 126],
				[96, 126],
				[172, 40],
				[176, 58],
				[104, 140],
				[44, 140],
			],
			WHITE_SHADE,
		)}`,
		`${pixelPolygon(
			[
				[44, 140],
				[104, 140],
				[176, 58],
				[178, 70],
				[110, 152],
				[48, 152],
			],
			FERRY_RED,
		)}`,
		pixelPolygon(
			[
				[30, 96],
				[40, 126],
				[48, 152],
				[22, 110],
			],
			'#3a4047',
		),
		// A row of windows round its top.
		...[0, 1, 2, 3].map((i) =>
			rect(112 + i * 14 - i * 4, 22 + i * 0, 8, 6, GLASS),
		),
	].join(''),
)

// --- Up top ----------------------------------------------------------------------

/** Its funnel, red, its top black, a white band round it: 96 by 170. */
export const funnel = pixelArt(48, 85, [
	// Tapering, wider at its foot.
	[6, 6, 36, 79, FERRY_RED],
	[4, 30, 40, 55, FERRY_RED],
	[2, 60, 44, 25, FERRY_RED],
	[6, 6, 4, 79, RED_DARK],
	// Soot at the top, and its pipes.
	[6, 2, 36, 5, INK],
	[14, 0, 6, 2, '#3a3f45'],
	[28, 0, 6, 2, '#3a3f45'],
	// A white band, and Scoop Cruises' white S on it.
	[4, 22, 40, 4, FERRY_WHITE],
	[18, 32, 12, 4, FERRY_WHITE],
	[16, 34, 4, 6, FERRY_WHITE],
	[28, 34, 4, 2, FERRY_WHITE],
	[18, 40, 12, 4, FERRY_WHITE],
	[28, 44, 4, 6, FERRY_WHITE],
	[16, 48, 4, 2, FERRY_WHITE],
	[18, 50, 12, 4, FERRY_WHITE],
])
export const FUNNEL_WIDTH = 96
export const FUNNEL_HEIGHT = 170

/**
 * The bridge, over the bow: its windows round the front, slanting, its
 * wings out either side: 320 by 80.
 */
export const WHEELHOUSE_WIDTH = 320
export const WHEELHOUSE_HEIGHT = 80
export const wheelhouse = svgUrl(
	WHEELHOUSE_WIDTH,
	WHEELHOUSE_HEIGHT,
	[
		// Its roof, and its wings, out past it.
		rect(0, 20, 320, 6, WHITE_SHADE),
		rect(30, 26, 260, 54, FERRY_WHITE),
		// Its windows, all round the front, slanting out at the top.
		`${pixelPolygon(
			[
				[30, 34],
				[296, 34],
				[290, 52],
				[36, 52],
			],
			GLASS,
		)}`,
		`${pixelPolygon(
			[
				[30, 34],
				[296, 34],
				[295, 38],
				[31, 38],
			],
			GLASS_LIT,
		)}`,
		...Array.from({ length: 16 }, (_, i) =>
			rect(46 + i * 16, 34, 2, 18, FERRY_WHITE),
		),
		rect(30, 66, 260, 2, WHITE_SHADE),
		// Its mast, radar turning over it.
		rect(150, 0, 6, 20, STEEL),
		rect(124, 2, 58, 4, INK),
		rect(170, 8, 6, 4, '#ffd84a'),
	].join(''),
)

/** A lifeboat, orange, on its davits: 152 by 58, its cover's top 20 down. */
export const LIFEBOAT_WIDTH = 152
export const LIFEBOAT_HEIGHT = 58
export const LIFEBOAT_TOP = 20
export const lifeboat = svgUrl(
	LIFEBOAT_WIDTH,
	LIFEBOAT_HEIGHT,
	[
		// The davits' arms, and the falls down to it.
		rect(10, 0, 8, 6, STEEL_DARK),
		rect(134, 0, 8, 6, STEEL_DARK),
		rect(12, 0, 4, 20, STEEL_DARK),
		rect(136, 0, 4, 20, STEEL_DARK),
		// Its cover, white, and its hull, orange.
		rect(16, 20, 120, 8, FERRY_WHITE),
		rect(8, 24, 136, 6, FERRY_WHITE),
		rect(4, 30, 144, 14, '#f26a1b'),
		rect(10, 44, 132, 6, '#f26a1b'),
		rect(22, 50, 108, 4, '#d1530f'),
		rect(4, 30, 144, 2, '#ff9a55'),
		// Its windows.
		...[30, 52, 74, 96, 118].map((x) => rect(x, 32, 10, 6, GLASS)),
	].join(''),
)

/**
 * A lifeboat held up on its davits, `up` over the deck it's over: their
 * posts down to it, either end, and their arms over it. As tall as it
 * needs, its cover's top `LIFEBOAT_TOP` down, whatever it's over.
 */
export function lifeboatOnDavits(up: number) {
	// Down to the deck, a little back on it.
	const height = LIFEBOAT_TOP + up + 10
	const davit = (x: number, toward: 1 | -1) =>
		[
			// Its post, and its foot on the deck.
			rect(x, 0, 6, height, STEEL_DARK),
			rect(x - 4, height - 4, 14, 4, '#3a4047'),
			// Its arm, out over the boat, and the fall down to it.
			rect(toward > 0 ? x : x - 14, 0, 20, 6, STEEL_DARK),
			rect(toward > 0 ? x + 16 : x - 14, 6, 2, LIFEBOAT_TOP - 6, '#3a4047'),
			// A brace, from the post up under the boat.
			rect(toward > 0 ? x + 6 : x - 6, 44, 6, 4, STEEL_DARK),
		].join('')
	return {
		height,
		asset: svgUrl(
			LIFEBOAT_WIDTH,
			height,
			[
				`<image href="${lifeboat}" width="${LIFEBOAT_WIDTH}" height="${LIFEBOAT_HEIGHT}"/>`,
				davit(0, 1),
				davit(LIFEBOAT_WIDTH - 6, -1),
			].join(''),
		),
	}
}

/** A flag on its staff, at the stern: Finland's, white, its blue cross. 20 by 40. */
export const sternFlag = pixelArt(20, 40, [
	[0, 0, 2, 40, '#a7adb3'],
	[2, 2, 18, 12, '#ffffff'],
	[2, 7, 18, 3, '#1b4fa0'],
	[7, 2, 3, 12, '#1b4fa0'],
])

// --- On deck -----------------------------------------------------------------------

/** A ventilator's cowl, on deck: white, its mouth dark. 14 by 24. */
export const ventilator = pixelArt(14, 24, [
	[5, 8, 4, 16, FERRY_WHITE],
	[4, 22, 6, 2, WHITE_SHADE],
	[1, 1, 12, 9, FERRY_WHITE],
	[0, 3, 2, 6, FERRY_WHITE],
	[3, 3, 8, 5, INK],
	[1, 0, 10, 1, WHITE_SHADE],
])

/** A lifebuoy, on its post: red and white. 14 by 26. */
export const lifebuoy = pixelArt(14, 26, [
	[6, 12, 2, 14, STEEL_DARK],
	[3, 0, 8, 2, FERRY_RED],
	[1, 2, 12, 2, FERRY_RED],
	[0, 4, 3, 6, FERRY_WHITE],
	[11, 4, 3, 6, FERRY_WHITE],
	[1, 10, 12, 2, FERRY_RED],
	[3, 12, 8, 2, FERRY_RED],
	[0, 6, 3, 2, FERRY_RED],
	[11, 6, 3, 2, FERRY_RED],
])

/** A sun lounger, on the sun deck, a towel on it. 28 by 12. */
export const lounger = pixelArt(28, 12, [
	[0, 6, 20, 2, '#c99a5e'],
	[18, 0, 3, 8, '#c99a5e'],
	[20, 0, 2, 2, '#a87a42'],
	[2, 8, 2, 4, STEEL_DARK],
	[16, 8, 2, 4, STEEL_DARK],
	[2, 4, 14, 2, '#3fb3c9'],
	[6, 4, 2, 2, FERRY_WHITE],
	[12, 4, 2, 2, FERRY_WHITE],
])

// --- Slussen ---------------------------------------------------------------------------

/** The terminal's sign on its posts: TERMINAL, and to the ferry, → TURKU. 62 by 44. */
export const terminalSign = pixelArt(62, 44, [
	[8, 24, 3, 20, STEEL_DARK],
	[51, 24, 3, 20, STEEL_DARK],
	[0, 0, 62, 26, '#1d3c6e'],
	[0, 0, 62, 2, '#3d63a3'],
	[0, 18, 62, 8, FERRY_RED],
])
/** Its lettering, over it: drawn as a picture of its own, 2 px a cell, so it's crisp. */
export const terminalSignLettered = svgUrl(
	124,
	88,
	[
		`<image href="${terminalSign}" width="124" height="88"/>`,
		pixelText('TERMINAL', 15, 8, 2, FERRY_WHITE),
		pixelText('→ TURKU', 22, 38, 2, FERRY_WHITE),
	].join(''),
)

/** A bollard, on the quay's edge: cast iron, black. 10 by 10. */
export const bollard = pixelArt(10, 10, [
	[1, 0, 8, 3, '#2a2d31'],
	[3, 3, 4, 5, '#2a2d31'],
	[2, 8, 6, 2, '#2a2d31'],
	[2, 0, 4, 1, '#4b5056'],
])

// --- In the way: luggage ------------------------------------------------------------

/** A hard suitcase, blue, on its wheels, its handle up: 30 by 26 drawn. */
export const suitcase = pixelArt(15, 13, [
	[6, 0, 3, 1, '#2a2d31'],
	[5, 0, 1, 3, '#2a2d31'],
	[9, 0, 1, 3, '#2a2d31'],
	[0, 3, 15, 9, '#2f6fd1'],
	[0, 3, 15, 1, '#5d93e6'],
	[3, 4, 1, 7, '#2457a8'],
	[7, 4, 1, 7, '#2457a8'],
	[11, 4, 1, 7, '#2457a8'],
	[1, 12, 2, 1, '#2a2d31'],
	[12, 12, 2, 1, '#2a2d31'],
])

/** A rucksack, green, its straps: 24 by 28 drawn. */
export const rucksack = pixelArt(12, 14, [
	[3, 0, 6, 2, '#3c6b3a'],
	[1, 2, 10, 12, '#4f8a4a'],
	[0, 4, 1, 9, '#3c6b3a'],
	[11, 4, 1, 9, '#3c6b3a'],
	[2, 7, 8, 5, '#3c6b3a'],
	[3, 8, 6, 1, '#e2c25a'],
	[2, 2, 8, 1, '#6aa864'],
])

/** A tax-free bag, bottles poking out of it: 26 by 30 drawn. */
export const taxFreeBag = pixelArt(13, 15, [
	[3, 0, 2, 4, '#2f6b3a'],
	[7, 1, 2, 3, '#7a3b16'],
	[10, 2, 2, 2, '#cfe3e6'],
	[2, 4, 10, 10, '#f6f4ee'],
	[1, 5, 1, 9, '#dad6cc'],
	[3, 7, 8, 3, FERRY_RED],
	[3, 2, 1, 2, '#bcb8ae'],
	[10, 2, 1, 2, '#bcb8ae'],
	[2, 14, 10, 1, '#dad6cc'],
])

/** A glass knocked over, lying on its side, by the drink spilt out of it: 14 by 8 drawn. */
export const tippedGlass = pixelArt(7, 4, [
	[0, 0, 6, 1, '#d6ecf0'],
	[0, 3, 6, 1, '#d6ecf0'],
	[5, 0, 1, 4, '#d6ecf0'],
	[0, 1, 5, 2, '#b4d4dc'],
	[1, 2, 4, 1, '#e0a83a'],
	[6, 1, 1, 2, '#b8c8cc'],
])

/** Crates of beer, two, one on the other, from the tax-free: 30 by 28 drawn. */
export const beerCrates = pixelArt(15, 14, [
	[0, 0, 15, 6, '#e0b23a'],
	[0, 7, 15, 7, '#e0b23a'],
	[0, 6, 15, 1, '#a17a1e'],
	...[2, 5, 8, 11].map((x): PixelRect => [x, -1, 2, 1, '#6b3d12']),
	[2, 2, 11, 2, '#a17a1e'],
	[2, 9, 11, 2, '#a17a1e'],
])

// --- Platforms -----------------------------------------------------------------------------

/**
 * A lorry's trailer, parked on the car deck, a landing leg down at the
 * front: `width` by 112, to run along the roof of.
 */
export const TRAILER_HEIGHT = 112
export function trailer(width: number, colour: string, words: string) {
	const letters = pixelText(
		words,
		Math.round((width - pixelTextWidth(words, 3)) / 2),
		36,
		3,
		FERRY_WHITE,
	)
	return svgUrl(
		width,
		TRAILER_HEIGHT,
		[
			rect(0, 0, width, 84, colour),
			// Its roof, seen from a little above: lighter, to stand on.
			rect(0, 0, width, 12, 'rgba(255,255,255,0.3)'),
			rect(0, 12, width, 2, 'rgba(0,0,0,0.2)'),
			rect(0, 80, width, 4, 'rgba(0,0,0,0.25)'),
			...Array.from({ length: Math.floor(width / 40) }, (_, i) =>
				rect(20 + i * 40, 4, 2, 76, 'rgba(0,0,0,0.12)'),
			),
			letters,
			// Its chassis, its wheels at the back, its leg at the front.
			rect(0, 84, width, 8, '#2a2d31'),
			...[10, 46, 82].map(
				(x) =>
					`${pixelCircle(x + 24 / 2, 88 + 24 / 2, 12, '#1b1d20')}<rect x="${x + 8}" y="96" width="8" height="8" fill="#8d949b"/>`,
			),
			rect(width - 60, 92, 6, 20, STEEL_DARK),
			rect(width - 64, 108, 14, 4, STEEL_DARK),
		].join(''),
	)
}

/** A car, boxy, an estate: `colour`, 120 by 50, its roof to run along. */
export const CAR_WIDTH = 120
export const CAR_HEIGHT = 50
export const car = (colour: string) =>
	pixelArt(60, 25, [
		[8, 0, 38, 2, colour],
		[6, 2, 42, 9, colour],
		[0, 10, 60, 10, colour],
		[8, 3, 14, 7, GLASS],
		[24, 3, 14, 7, GLASS],
		[40, 3, 7, 7, GLASS],
		[48, 6, 6, 4, GLASS],
		[0, 14, 60, 1, 'rgba(0,0,0,0.25)'],
		[56, 11, 4, 3, '#ffe9a8'],
		[0, 11, 3, 3, '#e04848'],
		[6, 18, 10, 7, '#1b1d20'],
		[44, 18, 10, 7, '#1b1d20'],
		[9, 20, 4, 3, '#8d949b'],
		[47, 20, 4, 3, '#8d949b'],
	])

/**
 * A shelf of the tax-free shop's, `width` by `height`, full: sweets,
 * chocolate, bottles. Its top to run along.
 */
/**
 * What's on a shelf, quiet, so whoever's in front of it stands out: soft
 * colours on a shelf to jump on, and fainter still on the shop's back
 * wall, further off. A bottle each that's tall and thin.
 */
const GOODS: Record<'soft' | 'faint', { fill: string; bottle?: boolean }[]> = {
	soft: [
		{ fill: '#8a7398' },
		{ fill: '#b87a72' },
		{ fill: '#7d93b0' },
		{ fill: '#c8b07a' },
		{ fill: '#6f8a6c', bottle: true },
		{ fill: '#cfa8b4' },
		{ fill: '#94725e', bottle: true },
		{ fill: '#c4d2d4', bottle: true },
	],
	faint: [
		{ fill: '#c2b8c0' },
		{ fill: '#c9b4ae' },
		{ fill: '#b4bcc6' },
		{ fill: '#d2c6aa' },
		{ fill: '#b2bcae', bottle: true },
		{ fill: '#d0c2c2' },
		{ fill: '#bcae9e', bottle: true },
		{ fill: '#d6dcdc', bottle: true },
	],
}

/**
 * A shelf of the tax-free shop's, `width` by `height`, full: sweets,
 * chocolate, bottles. Its top to run along; or `faint`, along its back wall.
 */
export function shopShelf(
	width: number,
	height: number,
	seed: number,
	look: 'soft' | 'faint' = 'soft',
) {
	const random = seeded(seed)
	const goods = GOODS[look]
	const rows = Math.max(1, Math.floor((height - 12) / 30))
	let stock = ''
	for (let row = 0; row < rows; row++) {
		const floor = 10 + (row + 1) * ((height - 12) / rows) - 2
		for (let x = 6; x < width - 10; ) {
			const { fill, bottle } = goods[Math.floor(random() * goods.length)]
			const w = bottle ? 6 : 8 + Math.floor(random() * 3) * 4
			const h = bottle ? 20 : 10 + Math.floor(random() * 3) * 4
			stock += rect(Math.round(x), Math.round(floor - h), w, h, fill)
			if (bottle)
				stock += rect(Math.round(x) + 2, Math.round(floor - h - 4), 2, 4, fill)
			else
				stock += rect(
					Math.round(x),
					Math.round(floor - h),
					w,
					2,
					'rgba(255,255,255,0.3)',
				)
			x += w + 2
		}
		stock += rect(2, Math.round(floor), width - 4, 4, '#bdb5a6')
	}
	return svgUrl(
		width,
		height,
		[
			rect(0, 0, width, height, '#e9e3d6'),
			rect(0, 0, width, 12, '#a85454'),
			rect(0, 0, width, 4, '#c87a7a'),
			stock,
			rect(0, 0, 2, height, '#bdb5a6'),
			rect(width - 2, 0, 2, height, '#bdb5a6'),
			rect(0, height - 4, width, 4, '#8f877a'),
		].join(''),
	)
}

/**
 * The buffet, all of it vegetarian: a long counter, dish after dish along
 * it, new potatoes with dill, salad, beetroot salad, cheeses, bread, and
 * cake. `width` by 58.
 */
export const BUFFET_HEIGHT = 58
export function buffetCounter(width: number) {
	const dish = (x: number) => rect(x, 10, 36, 6, '#c9ced0')
	const dishes = [
		// New potatoes, dill on them.
		(x: number) =>
			dish(x) +
			[0, 8, 16, 24].map((d) => rect(x + 4 + d, 6, 6, 6, '#e8c98a')).join('') +
			rect(x + 10, 6, 2, 2, '#3f8a3a') +
			rect(x + 26, 6, 2, 2, '#3f8a3a'),
		// Salad.
		(x: number) =>
			dish(x) +
			rect(x + 4, 4, 28, 8, '#5fae4a') +
			rect(x + 10, 4, 4, 4, '#e04848') +
			rect(x + 22, 6, 4, 4, '#ffe066'),
		// Beetroot salad, pink.
		(x: number) =>
			dish(x) +
			rect(x + 6, 4, 24, 8, '#c8406a') +
			rect(x + 10, 4, 12, 2, '#e8709a'),
		// Cheeses, in wedges.
		(x: number) =>
			dish(x) +
			rect(x + 4, 6, 10, 6, '#f2d36a') +
			rect(x + 16, 4, 8, 8, '#e8c050') +
			rect(x + 26, 8, 6, 4, '#f6e6a8'),
		// Bread, rolls and a loaf.
		(x: number) =>
			dish(x) +
			rect(x + 4, 6, 8, 6, '#c99a5e') +
			rect(x + 14, 6, 8, 6, '#b8864a') +
			rect(x + 24, 4, 10, 8, '#a87440'),
		// Kladdkaka, and cream.
		(x: number) =>
			dish(x) +
			rect(x + 6, 6, 24, 6, '#4a2a1a') +
			rect(x + 6, 6, 24, 2, '#6a3e26') +
			rect(x + 14, 2, 6, 4, '#ffffff'),
	]
	let food = ''
	let n = 0
	for (let x = 10; x + 36 < width - 6; x += 44)
		food += dishes[n++ % dishes.length](x)
	return svgUrl(
		width,
		BUFFET_HEIGHT,
		[
			food,
			// Its counter: steel, its front panelled in wood.
			rect(0, 16, width, 6, '#c9ced0'),
			rect(0, 16, width, 2, '#eef1f2'),
			rect(2, 22, width - 4, BUFFET_HEIGHT - 22, '#7a5236'),
			...Array.from({ length: Math.floor(width / 60) }, (_, i) =>
				rect(28 + i * 60, 28, 2, BUFFET_HEIGHT - 34, '#5e3e28'),
			),
			rect(2, BUFFET_HEIGHT - 4, width - 4, 4, '#4a301f'),
		].join(''),
	)
}

/** A table in the restaurant: its cloth white, a candle and glasses on it. 112 by 48. */
export const TABLE_WIDTH = 112
export const TABLE_HEIGHT = 48
export const diningTable = pixelArt(56, 24, [
	[0, 4, 56, 4, '#ffffff'],
	[2, 8, 52, 6, '#eceae4'],
	[4, 14, 2, 10, '#5e3e28'],
	[50, 14, 2, 10, '#5e3e28'],
	[2, 8, 2, 6, '#d9d5cc'],
	[52, 8, 2, 6, '#d9d5cc'],
	// A candle, lit.
	[27, 1, 2, 3, '#f6eed2'],
	[27, 0, 2, 1, '#ffb52e'],
	// Glasses.
	[12, 1, 3, 3, '#cfe3e6'],
	[40, 1, 3, 3, '#cfe3e6'],
	[41, 2, 1, 1, '#a8243a'],
])

/** The dance bar's stage, its lights along its lip, speakers either end: `width` by 60. */
export const STAGE_HEIGHT = 60
export function stage(width: number) {
	return svgUrl(
		width,
		STAGE_HEIGHT,
		[
			rect(0, 0, width, 12, '#6b3f86'),
			rect(0, 12, width, STAGE_HEIGHT - 12, '#2b1b38'),
			...Array.from({ length: Math.floor(width / 24) }, (_, i) =>
				rect(10 + i * 24, 16, 6, 4, ['#ff4fd8', '#3ff0ff', '#ffe14d'][i % 3]),
			),
			...Array.from({ length: Math.floor(width / 48) }, (_, i) =>
				rect(20 + i * 48, 22, 2, STAGE_HEIGHT - 26, '#22152d'),
			),
			rect(0, STAGE_HEIGHT - 4, width, 4, '#160d1d'),
		].join(''),
	)
}

// --- Its rooms' walls ------------------------------------------------------------------------

/**
 * A stretch of a room's back wall, `width` by `height`, from its Ceiling
 * down to the back of the floor: drawn in panels, so a long room's more of
 * the same.
 */
export type Wall = (width: number, height: number, n: number) => string

/** Under the stern: the car deck, its steel, its ceiling's lights, hazard stripes along its foot. */
export const carDeckWall: Wall = (width, height, n) =>
	svgUrl(
		width,
		height,
		[
			rect(0, 0, width, height, '#9aa1a8'),
			...Array.from({ length: Math.ceil(width / 80) }, (_, i) =>
				rect(i * 80, 0, 6, height, '#7d848b'),
			),
			rect(0, 0, width, 16, '#6c737a'),
			...Array.from({ length: Math.ceil(width / 160) }, (_, i) =>
				rect(60 + i * 160, 16, 24, 4, '#fff6c8'),
			),
			// Hazard stripes, yellow and black.
			rect(0, height - 14, width, 14, '#f2c230'),
			...Array.from(
				{ length: Math.ceil(width / 16) },
				(_, i) =>
					`${pixelPolygon(
						[
							[i * 16, height],
							[i * 16 + 8, height],
							[i * 16 + 16, height - 14],
							[i * 16 + 8, height - 14],
						],
						'#2b2b2b',
					)}`,
			),
			n % 2 === 0
				? pixelText('DECK 3', 40, 50, 4, '#f2c230')
				: pixelText('↑ CABINS', 40, 50, 3, FERRY_WHITE),
		].join(''),
	)

/** The cabins' corridor: wallpaper, a rail along it, a door every 120, its number on it, lamps between. */
export const corridorWall: Wall = (width, height, n) => {
	const doors = Math.ceil(width / 120)
	return svgUrl(
		width,
		height,
		[
			rect(0, 0, width, height, '#efe3c8'),
			...Array.from({ length: Math.ceil(width / 12) }, (_, i) =>
				rect(i * 12, 0, 2, height, '#e6d7b7'),
			),
			rect(0, 0, width, 12, '#d8cdb5'),
			...Array.from({ length: Math.ceil(width / 120) }, (_, i) =>
				rect(16 + i * 120, 12, 28, 2, '#fff6d0'),
			),
			rect(0, height - 50, width, 50, '#d9c7a4'),
			rect(0, height - 52, width, 4, '#a8794a'),
			rect(0, height - 6, width, 6, '#7b5634'),
			...Array.from({ length: doors }, (_, i) => {
				const x = 30 + i * 120
				// Numbered on from the last panel's, four doors to a full one.
				const number = String(5101 + n * 8 + i * 2)
				return [
					rect(x - 2, height - 98, 44, 98, '#6b4428'),
					rect(x, height - 96, 40, 96, '#8a5a36'),
					rect(x + 6, height - 88, 28, 36, '#7b4f2f'),
					rect(x + 6, height - 44, 28, 30, '#7b4f2f'),
					rect(x + 32, height - 52, 4, 6, '#e2c25a'),
					// Its number, on a brass plate.
					rect(x + 6, height - 114, 29, 11, '#d9b45a'),
					pixelText(number, x + 8, height - 112, 1, INK),
					// A lamp between it and the next.
					rect(x + 84, height - 116, 8, 10, '#fff2b0'),
					rect(x + 86, height - 106, 4, 4, '#a8794a'),
				].join('')
			}),
		].join(''),
	)
}

/** The tax-free shop: shelves, full, along its back wall, under its sign, TAX FREE. */
export const shopWall: Wall = (width, height, n) =>
	svgUrl(
		width,
		height,
		[
			rect(0, 0, width, height, '#f6f1e8'),
			rect(0, 0, width, 34, '#20365e'),
			rect(0, 30, width, 4, '#e0b23a'),
			...Array.from({ length: Math.ceil(width / 320) }, (_, i) =>
				pixelText(
					i % 2 ? 'GODIS' : 'TAX FREE',
					30 + i * 320,
					10,
					2,
					FERRY_WHITE,
				),
			),
			`<image href="${shopShelf(width, height - 40, 300 + n, 'faint')}" y="40" width="${width}" height="${height - 40}"/>`,
		].join(''),
	)

/**
 * The buffet restaurant: great windows, the sea going by out of them,
 * curtains either side, wood panelling under them.
 */
export const buffetWall: Wall = (width, height, n) => {
	const random = seeded(500 + n)
	const sea = Math.round(height * 0.55)
	return svgUrl(
		width,
		height,
		[
			rect(0, 0, width, height, '#7a5236'),
			rect(0, 0, width, 10, '#5e3e28'),
			...Array.from({ length: Math.ceil(width / 160) }, (_, i) => {
				const x = 20 + i * 160
				const island = Math.round(random() * 60)
				return [
					rect(x - 4, 18, 128, height - 62, '#e9e2d2'),
					rect(x, 22, 120, sea - 22, '#bfe3f6'),
					rect(x, 22, 120, 10, '#d8effb'),
					rect(x, sea, 120, height - 66 - sea + 22, '#3f7fa8'),
					rect(x, sea, 120, 2, '#7fb3d3'),
					// An island, going by.
					rect(x + island, sea - 6, 40, 6, '#5f7f6a'),
					rect(x + island + 8, sea - 12, 4, 6, '#3f5f4a'),
					rect(x + island + 20, sea - 10, 4, 4, '#3f5f4a'),
					rect(x + 59, 22, 2, height - 66, '#e9e2d2'),
					// Curtains.
					rect(x - 8, 14, 12, height - 54, '#a8243a'),
					rect(x + 116, 14, 12, height - 54, '#a8243a'),
					rect(x - 8, 14, 136, 6, '#8a1c2f'),
				].join('')
			}),
			rect(0, height - 36, width, 30, '#6a462e'),
			rect(0, height - 38, width, 2, '#a87a52'),
			rect(0, height - 6, width, 6, '#4a301f'),
			n === 0
				? `${rect(30, height - 34, 100, 22, '#4a301f')}${pixelText('BUFFET', 44, height - 30, 2, '#e2c25a')}`
				: '',
		].join(''),
	)
}

/** A dansband, three of them, on the dance bar's stage, glittering: 120 by 76. */
const band = svgUrl(
	120,
	76,
	[
		// Singer, microphone up.
		...[0, 44, 88].map((x, i) => {
			const suit = ['#e0b23a', '#3ff0ff', '#ff4fd8'][i]
			const hair = ['#e8d18a', '#4a2c18', '#2a1810'][i]
			return [
				rect(x + 10, 0, 12, 6, hair),
				rect(x + 10, 6, 12, 12, '#f2c09a'),
				rect(x + 12, 10, 2, 2, INK),
				rect(x + 18, 10, 2, 2, INK),
				rect(x + 6, 18, 20, 28, suit),
				rect(x + 8, 22, 2, 2, '#ffffff'),
				rect(x + 18, 30, 2, 2, '#ffffff'),
				rect(x + 8, 46, 6, 30, '#2b1b38'),
				rect(x + 18, 46, 6, 30, '#2b1b38'),
			].join('')
		}),
		rect(26, 14, 4, 12, '#9aa1a8'),
		// A guitar, and a keyboard.
		rect(50, 30, 22, 10, '#a8243a'),
		rect(70, 32, 14, 4, '#5e3e28'),
		rect(84, 40, 34, 6, '#f3f4f1'),
		rect(84, 46, 4, 30, '#2a2d31'),
		rect(114, 46, 4, 30, '#2a2d31'),
	].join(''),
)

/**
 * The dance bar: dark, neon along its top, lights dotted about, KARAOKE
 * lit up, a mirror ball, and on its stage, the band.
 */
export const barWall: Wall = (width, height, n) => {
	const random = seeded(700 + n)
	return svgUrl(
		width,
		height,
		[
			rect(0, 0, width, height, '#2a1838'),
			rect(0, 8, width, 4, '#ff4fd8'),
			rect(0, 16, width, 2, '#3ff0ff'),
			...Array.from({ length: Math.round(width / 18) }, () =>
				rect(
					Math.round((random() * width) / 2) * 2,
					Math.round((24 + random() * (height - 90)) / 2) * 2,
					4,
					4,
					['#ff4fd8', '#3ff0ff', '#ffe14d', '#7b6bff'][
						Math.floor(random() * 4)
					],
				),
			),
			n === 0
				? pixelText('KARAOKE', Math.round(width / 2 - 82), 34, 4, '#ff4fd8')
				: '',
			n === 1
				? [
						rect(width / 2 - 1, 18, 2, 18, '#9aa1a8'),
						`${pixelCircle(width / 2 - 14 + 28 / 2, 36 + 28 / 2, 14, '#c9ced0')}`,
						...Array.from({ length: 12 }, (_, i) =>
							rect(
								width / 2 - 12 + (i % 4) * 6,
								40 + Math.floor(i / 4) * 7,
								4,
								4,
								i % 3 ? '#ffffff' : '#7b6bff',
							),
						),
					].join('')
				: '',
			n === 1
				? `<image href="${band}" x="100" y="${height - 112}" width="120" height="76"/>`
				: '',
			// Speakers, along its foot.
			...Array.from({ length: Math.ceil(width / 200) }, (_, i) =>
				[
					rect(150 + i * 200, height - 52, 28, 46, '#161018'),
					`${pixelCircle(156 + i * 200 + 16 / 2, height - 46 + 16 / 2, 8, '#3a2a46')}`,
					`${pixelCircle(158 + i * 200 + 12 / 2, height - 26 + 12 / 2, 6, '#3a2a46')}`,
				].join(''),
			),
			rect(0, height - 6, width, 6, '#160d1d'),
		].join(''),
	)
}

/**
 * The hall by the bow, where everyone waits to get off: the info desk, and
 * signs, the way off: TURKU, ÅBO, and EXIT.
 */
export const bowHallWall: Wall = (width, height, n) =>
	svgUrl(
		width,
		height,
		[
			rect(0, 0, width, height, '#e8e4dc'),
			rect(0, 0, width, 12, '#d0cbc0'),
			...Array.from({ length: Math.ceil(width / 96) }, (_, i) =>
				[
					rect(i * 96 + 12, 24, 72, 40, '#c9ced0'),
					rect(i * 96 + 16, 28, 64, 20, '#bfe3f6'),
					rect(i * 96 + 16, 48, 64, 12, '#3f7fa8'),
					rect(i * 96 + 16, 48, 64, 2, '#7fb3d3'),
				].join(''),
			),
			rect(0, height - 70, width, 8, '#1f4f8a'),
			rect(0, height - 62, width, 56, '#d8d2c6'),
			rect(0, height - 6, width, 6, '#8a8478'),
			...Array.from({ length: Math.ceil(width / 140) }, (_, i) =>
				rect(40 + i * 140, 12, 30, 4, '#fff6d0'),
			),
			n % 3 === 0
				? [
						// A row of seats, for waiting to get off.
						...Array.from(
							{ length: 6 },
							(_, i) =>
								`${rect(240 + i * 34, height - 66, 28, 18, '#2f6fd1')}${rect(240 + i * 34, height - 48, 28, 8, '#1f4f8a')}${rect(252 + i * 34, height - 40, 4, 34, '#5a5f66')}`,
						),
						rect(30, height - 120, 160, 36, '#1d3c6e'),
						pixelText('TURKU / ÅBO →', 38, height - 112, 2, FERRY_WHITE),
						rect(30, height - 92, 160, 8, FERRY_RED),
					].join('')
				: n % 3 === 1
					? [
							// The info desk.
							rect(40, height - 120, 200, 16, '#1f4f8a'),
							pixelText('INFO', 116, height - 119, 2, FERRY_WHITE),
							rect(40, height - 60, 200, 54, '#b89a72'),
							rect(40, height - 62, 200, 4, '#8a6c4a'),
						].join('')
					: [
							rect(40, 72, 70, 22, '#2f9e4a'),
							pixelText('EXIT →', 46, 76, 2, FERRY_WHITE),
							// Lifejackets, in their locker.
							rect(300, height - 150, 60, 70, '#f26a1b'),
							rect(304, height - 146, 52, 62, '#ff8a3a'),
							pixelText('SOS', 313, height - 124, 2, FERRY_WHITE),
							// A poster: the Åland sea, a sunset.
							rect(170, height - 160, 60, 80, '#ffffff'),
							rect(174, height - 156, 52, 40, '#ffb35a'),
							rect(174, height - 116, 52, 28, '#2f6fd1'),
							`${pixelCircle(190 + 20 / 2, height - 130 + 20 / 2, 10, '#ffe066')}`,
						].join(''),
		].join(''),
	)

/** A stairwell's sign: the deck it goes up to, in a circle. 44 by 44. */
export const deckSign = (deck: number) =>
	svgUrl(
		44,
		44,
		`${pixelCircle(0 + 44 / 2, 0 + 44 / 2, 22, '#1f4f8a')}${pixelText(String(deck), 17, 8, 2, FERRY_WHITE)}<rect x="10" y="30" width="24" height="4" fill="${FERRY_WHITE}"/>`,
	)

// --- Along the roof ----------------------------------------------------------------

/**
 * The way along the ferry's roof, off the sun deck: first the buffet's
 * awning, `awning` across, striped red and white, out over the stairs
 * down, its scalloped edge hanging; then the walkway along the roof,
 * teak, a rail along its back. `width` by 42, its rail on top, whoever's
 * on it stood 30 down.
 */
export const WALKWAY_HEIGHT = 42
export const WALKWAY_TOP = 30
export function roofWalkway(width: number, awning: number) {
	const posts = Array.from(
		{ length: Math.ceil((width - awning) / 24) },
		(_, i) => rect(awning + i * 24, 2, 2, 12, '#e8ecef'),
	).join('')
	const stripes = Math.ceil(awning / 8)
	return svgUrl(
		width,
		WALKWAY_HEIGHT,
		[
			// The rail along its back, along the roof, not the awning.
			rect(awning, 0, width - awning, 4, '#e8ecef'),
			posts,
			// The awning: its canvas, in stripes, sloping a little down
			// and out, and its scalloped edge hanging under it.
			...Array.from({ length: stripes }, (_, i) => {
				const drop = Math.round(((awning - i * 8) / awning) * 4) * 2 - 2
				return rect(
					i * 8,
					14 + Math.max(0, drop),
					8,
					12,
					i % 2 ? FERRY_WHITE : FERRY_RED,
				)
			}),
			...Array.from({ length: Math.ceil(awning / 16) }, (_, i) =>
				pixelCircle(i * 16 + 8, 26, 6, i % 2 ? FERRY_WHITE : FERRY_RED),
			),
			// Its struts, back to the wall.
			pixelPolygon(
				[
					[6, 28],
					[10, 28],
					[awning, 40],
					[awning, 42],
				],
				STEEL_DARK,
			),
			// The walkway: teak along the roof, its planks' seams.
			rect(awning, 12, width - awning, 30, '#c49660'),
			...Array.from({ length: 3 }, (_, i) =>
				rect(awning, 18 + i * 8, width - awning, 2, '#a87c4a'),
			),
			rect(awning, 12, width - awning, 2, '#d8ae78'),
		].join(''),
	)
}

/**
 * A skylight in the roof, open, its lid propped up: the way down into the
 * dance bar, the walkway ending at it. 104 by 54, the roof's top 24 down.
 */
export const SKYLIGHT_WIDTH = 104
export const SKYLIGHT_HEIGHT = 54
export const SKYLIGHT_ROOF = 24
export const skylight = svgUrl(
	SKYLIGHT_WIDTH,
	SKYLIGHT_HEIGHT,
	[
		// Its lid, propped open, glass in a frame.
		pixelPolygon(
			[
				[6, 24],
				[20, 0],
				[96, 0],
				[82, 24],
			],
			'#c9ced0',
		),
		pixelPolygon(
			[
				[14, 20],
				[24, 4],
				[88, 4],
				[78, 20],
			],
			'#7fb3d3',
		),
		rect(4, 22, 4, 4, '#5d646c'),
		// The hole: its frame, and down through it, the bar's light.
		rect(0, 24, SKYLIGHT_WIDTH, 6, '#c9ced0'),
		rect(6, 28, SKYLIGHT_WIDTH - 12, 26, '#2a1838'),
		rect(6, 28, SKYLIGHT_WIDTH - 12, 4, '#160d1d'),
		rect(20, 40, 4, 4, '#ff4fd8'),
		rect(52, 36, 4, 4, '#3ff0ff'),
		rect(76, 44, 4, 4, '#ffe14d'),
	].join(''),
)
