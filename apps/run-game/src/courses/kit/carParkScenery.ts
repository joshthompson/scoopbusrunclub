import { type PixelRect, glyphRows, rectsMarkup, svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * An almost empty car park on a quiet Sunday, drawn in code: the town's
 * skyline far off, the supermarket and its back wall nearer, the tarmac
 * with its bay markings, and a few things left standing about (a hatchback,
 * a street light, a stray trolley, a ticket machine).
 */

const CELL = 2

/** The tarmac: base, shade (cracks, stains) and lit (worn specks). */
export const CAR_PARK_ASPHALT = '#5c5f66'
export const CAR_PARK_ASPHALT_SHADE = '#4b4e54'
export const CAR_PARK_ASPHALT_LIGHT = '#6d7078'
/** Bay lines, white, and the yellow of hatched boxes and kerbs. */
export const CAR_PARK_LINE = '#e6e2d6'
export const CAR_PARK_LINE_YELLOW = '#e8c23a'
/** The sky, top to bottom. */
export const CAR_PARK_SKY_TOP = '#8fc4e8'
export const CAR_PARK_SKY_BOTTOM = '#dcecf6'

/** Concrete, for walls, kerbs and lamp bases. */
const CONCRETE = '#b9b6ae'
const CONCRETE_LIT = '#cfccc3'
const CONCRETE_SHADE = '#a29f97'
/** Leaves: shade, base, lit. */
const LEAF_SHADE = '#3d7040'
const LEAF = '#4f8a4a'
const LEAF_LIT = '#6aa65a'
const INK = '#26282c'

type Colour = string | undefined

/** A grid of cells to paint on, rects, discs and polygons, later ones over earlier. */
function canvas(width: number, height: number) {
	const grid: Colour[] = new Array(width * height)
	const set = (x: number, y: number, fill: Colour) => {
		if (x >= 0 && y >= 0 && x < width && y < height) grid[y * width + x] = fill
	}
	const self = {
		set,
		rect(x: number, y: number, w: number, h: number, fill: Colour) {
			for (let j = y; j < y + h; j++)
				for (let i = x; i < x + w; i++) set(i, j, fill)
		},
		/** A disc round cell-edge `cx`, `cy`, `r` across. */
		disc(cx: number, cy: number, r: number, fill: Colour) {
			for (let j = Math.floor(cy - r); j <= cy + r; j++)
				for (let i = Math.floor(cx - r); i <= cx + r; i++)
					if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r)
						set(i, j, fill)
		},
		/** A polygon through `points`, cells whose middles are inside it. */
		poly(points: [number, number][], fill: Colour) {
			for (let j = 0; j < height; j++)
				for (let i = 0; i < width; i++) {
					const x = i + 0.5
					const y = j + 0.5
					let inside = false
					for (let a = 0, b = points.length - 1; a < points.length; b = a++) {
						const [xa, ya] = points[a]
						const [xb, yb] = points[b]
						if (
							ya > y !== yb > y &&
							x < ((xb - xa) * (y - ya)) / (yb - ya) + xa
						)
							inside = !inside
					}
					if (inside) set(i, j, fill)
				}
		},
		/** Lettering in the 5 by 7 pixel letters, a cell each. */
		text(text: string, x: number, y: number, fill: string) {
			;[...text].forEach((char, n) =>
				glyphRows(char).forEach((row, r) => {
					for (let c = 0; c < 5; c++)
						if (row[c] === '#') set(x + n * 6 + c, y + r, fill)
				}),
			)
		},
		/** As an image's URL, `scale` px a cell. */
		url(scale: number) {
			const rects: PixelRect[] = []
			for (let y = 0; y < height; y++) {
				let from = 0
				let colour: Colour
				for (let x = 0; x <= width; x++) {
					const here = x < width ? grid[y * width + x] : undefined
					if (here !== colour) {
						if (colour)
							rects.push([
								from * scale,
								y * scale,
								(x - from) * scale,
								scale,
								colour,
							])
						from = x
						colour = here
					}
				}
			}
			return svgUrl(width * scale, height * scale, rectsMarkup(rects))
		},
	}
	return self
}
type Canvas = ReturnType<typeof canvas>

// --- The far skyline ---------------------------------------------------------------

interface Tone {
	body: string
	lit: string
	shade: string
	glass: string
	glassLit: string
}

/** Buildings behind buildings: the further row is nearly the sky's own colour. */
const HAZE: Tone = {
	body: '#c6d9e8',
	lit: '#d3e4f0',
	shade: '#bacfe0',
	glass: '#b6cbdd',
	glassLit: '#d3e4f0',
}
const TOWN: Tone = {
	body: '#adc6da',
	lit: '#bcd2e3',
	shade: '#9db8cf',
	glass: '#93aec7',
	glassLit: '#cfe1ee',
}
const FAR_BASE = 72

/** A block of offices or flats: lit along its roof and left, shaded on its right, windows in rows. */
function block(
	g: Canvas,
	x: number,
	top: number,
	w: number,
	tone: Tone,
	random: () => number,
	base = FAR_BASE,
) {
	g.rect(x, top, w, base - top, tone.body)
	g.rect(x, top, w, 1, tone.lit)
	g.rect(x, top, 1, base - top, tone.lit)
	g.rect(x + w - 1, top + 1, 1, base - top - 1, tone.shade)
	for (let y = top + 3; y < base - 3; y += 3)
		for (let i = x + 2; i < x + w - 3; i += 3)
			g.rect(i, y, 2, 1, random() < 0.2 ? tone.glassLit : tone.glass)
	// A plant room on the roof.
	if (w > 14) {
		g.rect(x + 3, top - 2, 6, 2, tone.shade)
		g.rect(x + 3, top - 2, 6, 1, tone.body)
	}
}

/** A multi-storey car park: slabs of concrete between dark open decks, a stair tower, a ramp. */
function multiStorey(g: Canvas, x: number, top: number, w: number) {
	g.rect(x, top, w, FAR_BASE - top, TOWN.body)
	g.rect(x, top, w, 1, TOWN.lit)
	g.rect(x + w - 1, top + 1, 1, FAR_BASE - top - 1, TOWN.shade)
	for (let y = top + 3; y < FAR_BASE - 2; y += 6) {
		g.rect(x + 7, y, w - 9, 3, TOWN.glass)
		// The pillars between the openings.
		for (let i = x + 12; i < x + w - 3; i += 7) g.rect(i, y, 1, 3, TOWN.body)
		g.rect(x + 7, y + 3, w - 9, 1, TOWN.lit)
	}
	// The stair tower, taller, glazed.
	g.rect(x, top - 5, 6, FAR_BASE - top + 5, TOWN.lit)
	g.rect(x + 5, top - 5, 1, FAR_BASE - top + 5, TOWN.body)
	for (let y = top - 2; y < FAR_BASE - 2; y += 4)
		g.rect(x + 2, y, 2, 2, TOWN.glass)
}

/** A church's nave and its spire, tower square, the roof dark and pitched. */
function church(g: Canvas, x: number) {
	const roof = '#8fa8c0'
	g.rect(x, 52, 22, 20, TOWN.body)
	g.rect(x, 52, 1, 20, TOWN.lit)
	g.poly(
		[
			[x - 1, 52],
			[x + 11, 44],
			[x + 23, 52],
		],
		roof,
	)
	g.rect(x + 11, 46, 11, 6, TOWN.shade)
	// The tower and its spire.
	g.rect(x + 22, 38, 8, 34, TOWN.lit)
	g.rect(x + 29, 38, 1, 34, TOWN.body)
	g.rect(x + 25, 42, 2, 4, TOWN.glass)
	g.poly(
		[
			[x + 21, 38],
			[x + 26, 14],
			[x + 31, 38],
		],
		roof,
	)
	g.rect(x + 26, 10, 1, 6, roof)
	for (let i = 0; i < 3; i++) g.rect(x + 3 + i * 5, 58, 2, 6, TOWN.glass)
}

/** A water tower: a tank on legs, a cone for a lid. */
function waterTower(g: Canvas, x: number) {
	g.rect(x + 2, 40, 1, 32, TOWN.shade)
	g.rect(x + 11, 40, 1, 32, TOWN.shade)
	g.rect(x + 6, 40, 2, 32, TOWN.shade)
	g.rect(x, 62, 14, 1, TOWN.shade)
	g.rect(x, 28, 14, 12, TOWN.body)
	g.rect(x, 28, 2, 12, TOWN.lit)
	g.rect(x + 12, 28, 2, 12, TOWN.shade)
	g.rect(x, 33, 14, 1, TOWN.shade)
	g.poly(
		[
			[x - 1, 28],
			[x + 7, 21],
			[x + 15, 28],
		],
		'#8fa8c0',
	)
}

/** A row of low houses with pitched roofs. */
function houses(g: Canvas, x: number, count: number) {
	for (let n = 0; n < count; n++) {
		const hx = x + n * 12
		g.rect(hx, 58, 10, 14, TOWN.lit)
		g.poly(
			[
				[hx - 1, 58],
				[hx + 5, 52],
				[hx + 11, 58],
			],
			'#8fa8c0',
		)
		g.rect(hx + 3, 63, 2, 2, TOWN.glass)
	}
}

/**
 * The town beyond the car park, far off: pale and bluish, flats and offices
 * of varied heights, a multi-storey car park, a church spire and a water
 * tower, stood on the band's lower part, with a paler row behind. 960 by
 * 160 px, wraps seamlessly, clear above.
 */
export const carParkFar = (() => {
	const g = canvas(480, 80)
	const random = seeded(7301)
	// Behind: nearly the sky.
	for (const [x, top, w] of [
		[0, 46, 22],
		[26, 40, 16],
		[120, 44, 20],
		[150, 38, 18],
		[205, 42, 24],
		[300, 40, 16],
		[330, 46, 26],
		[390, 36, 20],
		[455, 44, 22],
	])
		block(g, x, top, Math.min(w, 480 - x), HAZE, random)
	// In front.
	block(g, 6, 34, 30, TOWN, random)
	block(g, 42, 22, 18, TOWN, random)
	waterTower(g, 68)
	multiStorey(g, 96, 44, 56)
	block(g, 106 + 52, 52, 24, TOWN, random)
	church(g, 190)
	block(g, 226, 30, 26, TOWN, random)
	block(g, 258, 38, 36, TOWN, random)
	block(g, 298, 20, 22, TOWN, random)
	houses(g, 326, 3)
	block(g, 368, 40, 30, TOWN, random)
	block(g, 404, 28, 20, TOWN, random)
	block(g, 430, 52, 40, TOWN, random)
	// The haze the whole town stands in.
	g.rect(0, FAR_BASE, 480, 8, TOWN.shade)
	return g.url(CELL)
})()
export const CAR_PARK_FAR_WIDTH = 960
export const CAR_PARK_FAR_HEIGHT = 160

// --- The near edge ------------------------------------------------------------------

const STORE_WALL = '#e0d9c8'
const STORE_WALL_LIT = '#eee8d9'
const STORE_WALL_SHADE = '#c9c1ae'
const STORE_FASCIA = '#8e8878'
const STORE_GLASS = '#7fb0cf'
const STORE_GLASS_LIT = '#a9cfe4'
const STORE_GLASS_SHADE = '#5f93b4'
const STORE_SIGN = '#2c6e55'

/** A low bush, three tones of leaf. */
function bush(g: Canvas, cx: number, base: number, r: number) {
	g.disc(cx, base - r, r, LEAF_SHADE)
	g.disc(cx + r * 0.9, base - r * 0.8, r * 0.8, LEAF_SHADE)
	g.disc(cx - 1, base - r - 1, r - 1, LEAF)
	g.disc(cx + r * 0.8, base - r * 0.9, r * 0.6, LEAF)
	g.disc(cx - 2, base - r - 2, Math.max(2, r - 3), LEAF_LIT)
}

/** A young tree: a thin trunk tied to its stake, a small round crown. */
function youngTree(g: Canvas, x: number, base: number, crown: number) {
	g.rect(x, base - crown * 2 - 4, 2, crown * 2 + 4, '#6b4f36')
	g.rect(x, base - crown * 2 - 4, 1, crown * 2 + 4, '#85664a')
	g.rect(x + 3, base - 14, 1, 14, '#a38a62')
	g.rect(x + 2, base - 9, 2, 1, '#cfc3a6')
	const cy = base - crown * 2 - 2
	g.disc(x + 1, cy, crown, LEAF_SHADE)
	g.disc(x, cy - 1, crown - 1, LEAF)
	g.disc(x - 1, cy - 2, Math.max(2, crown - 4), LEAF_LIT)
}

/**
 * The car park's back edge: a long low supermarket (flat roof, a green
 * sign panel reading MARKET, a front of windows and sliding doors under a
 * canopy), a concrete wall with a chain-link fence on it, bushes and young
 * trees; asphalt from y 112 down. 1024 by 160 px, wraps seamlessly, clear
 * above.
 */
export const carParkNear = (() => {
	const g = canvas(512, 80)
	g.rect(0, 56, 512, 24, CAR_PARK_ASPHALT)
	g.rect(0, 74, 512, 6, CAR_PARK_ASPHALT_SHADE)

	// The back wall all the way along, panel joints every 32 cells.
	g.rect(0, 48, 512, 10, CONCRETE)
	g.rect(0, 48, 512, 1, CONCRETE_LIT)
	g.rect(0, 56, 512, 2, CONCRETE_SHADE)
	for (let x = 20; x < 512; x += 32) g.rect(x, 49, 1, 7, CONCRETE_SHADE)

	// A chain-link fence along the top of it: posts, a rail, a diamond mesh.
	for (let x = 392; x <= 488; x += 16) g.rect(x, 38, 1, 10, '#7d838b')
	g.rect(392, 38, 97, 1, '#7d838b')
	for (let y = 39; y < 48; y++)
		for (let x = 393; x < 488; x++)
			if ((x + y) % 4 === 0 && x % 16 !== 8) g.set(x, y, '#9aa2ab')

	// Trees and bushes where the wall is clear.
	youngTree(g, 40, 58, 8)
	youngTree(g, 116, 58, 7)
	youngTree(g, 500, 58, 7)
	bush(g, 14, 58, 6)
	bush(g, 76, 58, 5)
	bush(g, 98, 58, 4)
	bush(g, 138, 58, 5)
	bush(g, 382, 58, 5)
	bush(g, 440, 58, 4)

	// The supermarket: roof, fascia, wall, glass.
	const left = 150
	const width = 222
	g.rect(left, 24, width, 34, STORE_WALL)
	g.rect(left, 24, width, 6, STORE_FASCIA)
	g.rect(left, 24, width, 1, STORE_WALL_LIT)
	g.rect(left, 30, width, 1, STORE_WALL_LIT)
	g.rect(left + width - 3, 25, 3, 33, STORE_WALL_SHADE)
	g.rect(left, 24, 1, 34, STORE_WALL_LIT)
	// Plant on the roof.
	g.rect(left + 20, 19, 14, 5, STORE_WALL_SHADE)
	g.rect(left + 20, 19, 14, 1, STORE_WALL)
	g.rect(left + 170, 20, 10, 4, STORE_WALL_SHADE)
	g.rect(left + 170, 20, 10, 1, STORE_WALL)
	// Its long front of windows, in bays, with a glint across each.
	for (let b = 0; b < 8; b++) {
		const gx = left + 6 + b * 11
		if (gx > left + 86 && gx < left + 130) continue
		g.rect(gx, 37, 10, 17, STORE_GLASS)
		g.rect(gx, 37, 10, 2, STORE_GLASS_LIT)
		g.rect(gx, 52, 10, 2, STORE_GLASS_SHADE)
		g.poly(
			[
				[gx + 2, 39],
				[gx + 5, 39],
				[gx + 2, 52],
				[gx - 1, 52],
			],
			STORE_GLASS_LIT,
		)
		g.rect(gx, 54, 10, 4, STORE_WALL_SHADE)
	}
	for (let b = 0; b < 5; b++) {
		const gx = left + 140 + b * 15
		g.rect(gx, 37, 14, 17, STORE_GLASS)
		g.rect(gx, 37, 14, 2, STORE_GLASS_LIT)
		g.rect(gx, 52, 14, 2, STORE_GLASS_SHADE)
		g.poly(
			[
				[gx + 3, 39],
				[gx + 6, 39],
				[gx + 3, 52],
				[gx, 52],
			],
			STORE_GLASS_LIT,
		)
		g.rect(gx, 54, 14, 4, STORE_WALL_SHADE)
	}
	// The entrance: a canopy, sliding doors, a sign panel above.
	const door = left + 88
	g.rect(door - 2, 33, 46, 3, STORE_WALL_SHADE)
	g.rect(door - 2, 33, 46, 1, STORE_WALL_LIT)
	g.rect(door, 36, 42, 22, STORE_GLASS)
	g.rect(door, 36, 42, 2, STORE_GLASS_LIT)
	g.rect(door + 20, 38, 2, 20, STORE_WALL_SHADE)
	g.rect(door + 3, 38, 14, 20, STORE_GLASS_SHADE)
	g.rect(door + 25, 38, 14, 20, STORE_GLASS_SHADE)
	g.rect(door, 56, 42, 2, STORE_WALL_SHADE)
	// The sign panel on the fascia: plain, MARKET in pixel letters.
	g.rect(door - 2, 25, 46, 5, STORE_FASCIA)
	g.rect(door + 1, 17, 40, 15, STORE_SIGN)
	g.rect(door + 1, 17, 40, 1, '#3d8a6c')
	g.rect(door + 1, 31, 40, 1, '#1f5240')
	g.text('MARKET', door + 5, 21, '#f4f1e6')

	// Kerb along the foot of everything, then the car park.
	g.rect(0, 58, 512, 2, '#a9a79f')
	g.rect(0, 58, 512, 1, CONCRETE)
	return g.url(CELL)
})()
export const CAR_PARK_NEAR_WIDTH = 1024
export const CAR_PARK_NEAR_HEIGHT = 160

// --- The tarmac ---------------------------------------------------------------------

/**
 * The car park's tarmac: asphalt with a few worn specks, cracks, two oil
 * stains and a drain cover; two rows of white bays in perspective (narrow
 * and thin at the back, wide and heavy at the front), a painted arrow in
 * the lane, a yellow hatched box. 960 by 136 px, tiles left to right.
 */
export const CAR_PARK_FIELD = (() => {
	const g = canvas(480, 68)
	g.rect(0, 0, 480, 68, CAR_PARK_ASPHALT)
	const random = seeded(7302)
	// Worn specks, light and dark.
	for (let i = 0; i < 150; i++) {
		const x = Math.floor(random() * 478)
		const y = Math.floor(random() * 68)
		if (random() < 0.5) g.set(x, y, CAR_PARK_ASPHALT_LIGHT)
		else g.rect(x, y, 2, 1, CAR_PARK_ASPHALT_SHADE)
	}
	// A repair patch.
	g.rect(396, 22, 26, 7, CAR_PARK_ASPHALT_SHADE)
	g.rect(396, 22, 26, 1, CAR_PARK_ASPHALT)
	// Cracks, each a short zigzag.
	for (const [cx, cy, dir] of [
		[44, 40, 1],
		[236, 52, -1],
		[430, 8, 1],
		[300, 26, 1],
	]) {
		let x = cx
		let y = cy
		for (let i = 0; i < 12; i++) {
			g.rect(x, y, 2, 1, CAR_PARK_ASPHALT_SHADE)
			x += 2 * dir
			if (i % 3 === 2) y += 1
		}
	}
	// Oil stains, in the bays where cars have stood.
	for (const [ox, oy, ow] of [
		[72, 46, 9],
		[262, 50, 7],
	]) {
		g.rect(ox, oy, ow, 3, CAR_PARK_ASPHALT_SHADE)
		g.rect(ox + 1, oy - 1, ow - 3, 1, CAR_PARK_ASPHALT_SHADE)
		g.rect(ox + 2, oy + 3, ow - 3, 1, CAR_PARK_ASPHALT_SHADE)
		g.set(ox + 2, oy + 1, '#3d4046')
	}
	// A drain cover with its slats.
	g.rect(142, 26, 12, 5, CAR_PARK_ASPHALT_SHADE)
	g.rect(142, 26, 12, 1, CAR_PARK_ASPHALT_LIGHT)
	for (let x = 144; x < 153; x += 2) g.rect(x, 28, 1, 2, '#3d4046')

	// The back row of bays: far, narrow, thin.
	g.rect(0, 2, 480, 1, CAR_PARK_LINE)
	for (let x = 0; x < 480; x += 12) g.rect(x, 2, 1, 16, CAR_PARK_LINE)
	// The near row: wider, heavier toward the bottom.
	g.rect(0, 36, 480, 2, CAR_PARK_LINE)
	for (let x = 0; x < 480; x += 24) {
		g.rect(x, 36, 1, 8, CAR_PARK_LINE)
		g.rect(x, 44, 2, 24, CAR_PARK_LINE)
	}
	g.rect(0, 36, 480, 2, CAR_PARK_LINE)

	// A yellow hatched box across two near bays.
	const bx = 313
	const bw = 46
	g.rect(bx, 38, bw, 30, CAR_PARK_ASPHALT)
	for (let y = 38; y < 68; y++)
		for (let x = bx; x < bx + bw; x++)
			if ((x + y) % 7 === 0) g.set(x, y, CAR_PARK_LINE_YELLOW)
	g.rect(bx, 38, bw, 1, CAR_PARK_LINE_YELLOW)
	g.rect(bx, 38, 1, 30, CAR_PARK_LINE_YELLOW)
	g.rect(bx + bw - 1, 38, 1, 30, CAR_PARK_LINE_YELLOW)

	// A painted arrow in the lane, pointing along it.
	g.rect(170, 25, 16, 4, CAR_PARK_LINE)
	g.poly(
		[
			[186, 22],
			[198, 27],
			[186, 32],
		],
		CAR_PARK_LINE,
	)
	return g.url(CELL)
})()
export const CAR_PARK_FIELD_WIDTH = 960
export const CAR_PARK_FIELD_HEIGHT = 136

// --- Things standing about ----------------------------------------------------------

/** The hatchback's paint: red by default, its lit and shade tones worked out from it. */
export const PARKED_CAR_BODY = '#c83a35'

/** `hex` with each channel scaled by `factor` (above 1 it is lightened toward white). */
function tint(hex: string, factor: number) {
	const channel = (i: number) => {
		const v = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
		const out = factor < 1 ? v * factor : v + (255 - v) * (factor - 1)
		return Math.round(Math.min(255, out)).toString(16).padStart(2, '0')
	}
	return `#${channel(0)}${channel(1)}${channel(2)}`
}

/**
 * A small hatchback seen side-on, nose to the right, in `body` paint: lit
 * roof and bonnet, shaded sill, glass, a door seam and handle, a mirror,
 * headlight and tail light, hubcaps. 72 by 30 cells, wheels on the bottom row.
 */
export function parkedCar(body = PARKED_CAR_BODY) {
	const lit = tint(body, 1.3)
	const shade = tint(body, 0.7)
	const glass = '#8fbfdc'
	const glassLit = '#bfdceb'
	const g = canvas(72, 30)
	// Cabin, then the lower body.
	g.poly(
		[
			[8, 14],
			[14, 5],
			[18, 3],
			[50, 3],
			[54, 4],
			[64, 14],
		],
		body,
	)
	g.poly(
		[
			[2, 17],
			[3, 14],
			[9, 13],
			[64, 13],
			[68, 15],
			[70, 18],
			[70, 27],
			[2, 27],
		],
		body,
	)
	// Lit along its top edges, shaded underneath.
	g.rect(18, 3, 32, 1, lit)
	g.rect(50, 3, 4, 1, lit)
	g.rect(14, 4, 4, 1, lit)
	g.rect(9, 13, 55, 1, lit)
	g.rect(64, 14, 4, 1, lit)
	g.rect(2, 25, 68, 2, shade)
	// Glass: rear window, front window, a pillar between.
	g.poly(
		[
			[12, 12],
			[16, 6],
			[30, 6],
			[30, 12],
		],
		glass,
	)
	g.poly(
		[
			[35, 6],
			[49, 6],
			[52, 7],
			[59, 12],
			[35, 12],
		],
		glass,
	)
	g.poly(
		[
			[38, 6],
			[41, 6],
			[38, 12],
			[35, 12],
		],
		glassLit,
	)
	g.poly(
		[
			[18, 6],
			[21, 6],
			[17, 12],
			[14, 12],
		],
		glassLit,
	)
	// Door seams, handles, mirror, the dark line of the sill.
	g.rect(33, 14, 1, 11, shade)
	g.rect(48, 14, 1, 11, shade)
	g.rect(37, 16, 4, 1, shade)
	g.rect(22, 16, 4, 1, shade)
	g.rect(60, 12, 4, 2, shade)
	g.rect(60, 12, 4, 1, body)
	// Headlight, grille, indicator, tail light, bumpers.
	g.rect(67, 16, 3, 3, '#f4e7a0')
	g.rect(67, 16, 3, 1, '#fffbe0')
	g.rect(69, 20, 1, 3, INK)
	g.rect(67, 21, 3, 1, '#e08a2e')
	g.rect(2, 16, 2, 4, '#c43a32')
	g.rect(2, 16, 2, 1, '#e8665c')
	g.rect(2, 22, 2, 1, '#e08a2e')
	g.rect(2, 25, 3, 2, '#3d4046')
	g.rect(66, 25, 4, 2, '#3d4046')
	// Wheels: a dark arch cut in the body, a tyre, a hubcap.
	for (const cx of [16, 56]) {
		for (let y = 17; y < 27; y++)
			for (let x = cx - 8; x <= cx + 8; x++)
				if ((x + 0.5 - cx) ** 2 + (y + 0.5 - 24.5) ** 2 <= 7.5 ** 2)
					g.set(x, y, '#1c1d20')
		g.disc(cx, 24.5, 5.5, '#2c2e33')
		g.disc(cx, 24.5, 3.5, '#b8bcc4')
		g.disc(cx - 0.5, 24, 2, '#d6d9de')
		g.disc(cx, 24.5, 1, '#7b7f87')
	}
	return g.url(1)
}

/** A hatchback in the default red, nose to the right. 72 by 30 cells (144 by 60 px). */
export const PARKED_CAR = parkedCar()
export const PARKED_CAR_WIDTH = 72 * CELL
export const PARKED_CAR_HEIGHT = 30 * CELL

/**
 * A car-park street light: a grey pole on a concrete base, an arm out to
 * the right at the top ending in a lamp head, its lens lit. 12 by 100
 * cells (24 by 200 px), standing on its bottom row.
 */
export const LAMP_POST = (() => {
	const pole = '#8a9099'
	const poleLit = '#a9b0b9'
	const poleShade = '#6c727b'
	const g = canvas(12, 100)
	// The pole, lit down its left.
	g.rect(2, 8, 3, 84, pole)
	g.rect(2, 8, 1, 84, poleLit)
	g.rect(4, 8, 1, 84, poleShade)
	// The arm, curving out at the top, with a brace under it.
	g.rect(2, 4, 3, 4, pole)
	g.rect(2, 4, 10, 2, pole)
	g.rect(2, 4, 10, 1, poleLit)
	g.rect(4, 6, 6, 1, poleShade)
	g.poly(
		[
			[5, 12],
			[5, 9],
			[8, 6],
			[9, 6],
		],
		poleShade,
	)
	// The lamp head, dark above, its lens pale beneath.
	g.rect(7, 6, 5, 3, '#54585f')
	g.rect(7, 6, 5, 1, '#6c727b')
	g.rect(8, 9, 4, 1, '#f3ecb8')
	// A little plate where it meets the base, then the concrete base.
	g.rect(1, 88, 5, 2, poleShade)
	g.rect(0, 90, 7, 10, CONCRETE)
	g.rect(0, 90, 7, 1, CONCRETE_LIT)
	g.rect(0, 90, 1, 10, CONCRETE_LIT)
	g.rect(6, 91, 1, 9, CONCRETE_SHADE)
	g.rect(0, 98, 7, 2, CONCRETE_SHADE)
	return g.url(1)
})()
export const LAMP_POST_WIDTH = 12 * CELL
export const LAMP_POST_HEIGHT = 100 * CELL

/**
 * An abandoned shopping trolley, side-on, handle to the left: a wire
 * basket (rim, rails and uprights), a red handle, a frame and four small
 * wheels. 24 by 20 cells (48 by 40 px).
 */
export const TROLLEY = (() => {
	const wire = '#aab0b8'
	const wireShade = '#7f858d'
	const g = canvas(24, 20)
	// The basket, wider at the top, its wires.
	g.poly(
		[
			[5, 3],
			[22, 3],
			[20, 11],
			[7, 11],
		],
		undefined,
	)
	g.rect(5, 3, 18, 1, wire)
	g.rect(7, 10, 14, 1, wireShade)
	g.rect(6, 6, 16, 1, wire)
	for (let x = 6; x < 22; x += 3) g.rect(x + (x > 14 ? -1 : 0), 4, 1, 7, wire)
	g.rect(5, 3, 1, 4, wire)
	g.rect(22, 3, 1, 6, wire)
	// The handle bar and its red grip, down to the frame.
	g.rect(1, 2, 6, 1, wireShade)
	g.rect(1, 2, 3, 1, '#c8403a')
	g.rect(4, 3, 1, 10, wire)
	g.rect(5, 12, 1, 1, wire)
	// The frame under the basket, and the legs to the wheels.
	g.rect(5, 13, 15, 1, wireShade)
	g.rect(6, 11, 14, 1, wire)
	g.rect(5, 14, 1, 3, wire)
	g.rect(8, 13, 1, 4, wireShade)
	g.rect(18, 13, 1, 4, wire)
	g.rect(21, 13, 1, 4, wireShade)
	// Four small wheels, the far pair a shade darker.
	for (const [x, c] of [
		[4, INK],
		[7, '#3a3d42'],
		[17, '#3a3d42'],
		[20, INK],
	] as [number, string][]) {
		g.rect(x, 17, 3, 3, c)
		g.set(x + 1, 18, '#8b9098')
	}
	return g.url(1)
})()
export const TROLLEY_WIDTH = 24 * CELL
export const TROLLEY_HEIGHT = 20 * CELL

/**
 * A pay-and-display ticket machine: a grey box with a yellow top and a
 * white P, a small screen, buttons and a slot, on a short post and plate.
 * 14 by 32 cells (28 by 64 px).
 */
export const TICKET_MACHINE = (() => {
	const box = '#9097a0'
	const boxLit = '#b0b6be'
	const boxShade = '#737a83'
	const g = canvas(14, 32)
	// The post and its foot plate.
	g.rect(5, 24, 4, 8, boxShade)
	g.rect(5, 24, 1, 8, box)
	g.rect(3, 30, 8, 2, '#5f656d')
	g.rect(3, 30, 8, 1, boxShade)
	// The box, lit top left, shaded down its right.
	g.rect(1, 2, 12, 22, box)
	g.rect(1, 2, 12, 1, boxLit)
	g.rect(1, 2, 1, 22, boxLit)
	g.rect(12, 3, 1, 21, boxShade)
	g.rect(1, 23, 12, 1, boxShade)
	// The yellow top, and its P.
	g.rect(1, 2, 12, 9, CAR_PARK_LINE_YELLOW)
	g.rect(1, 2, 12, 1, '#f5dd7a')
	g.rect(12, 3, 1, 8, '#c49f24')
	g.text('P', 4, 3, '#f4f1e6')
	// A small screen, green and dim, with a line of text.
	g.rect(3, 13, 8, 4, '#2f4a3f')
	g.rect(4, 14, 5, 1, '#9fe0b0')
	g.rect(4, 16, 3, 1, '#6fb585')
	// Buttons, a coin slot, the ticket slot.
	for (let x = 3; x < 10; x += 2) g.rect(x, 18, 1, 1, '#d8dce2')
	g.rect(9, 18, 2, 1, '#c8403a')
	g.rect(3, 20, 3, 1, INK)
	g.rect(8, 21, 3, 1, INK)
	return g.url(1)
})()
export const TICKET_MACHINE_WIDTH = 14 * CELL
export const TICKET_MACHINE_HEIGHT = 32 * CELL
