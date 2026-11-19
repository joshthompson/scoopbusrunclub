import { type PixelRect, glyphRows, pixelArt } from '../../courses/kit/pixelArt'
import { DEPTH_SLANT, PATH_BACK, PATH_FRONT } from '../../game/constants'

/**
 * The Scoop Bus: a yellow school bus, its bonnet out in front, drawn the
 * way everything going back across the path is. Its near side's square
 * on, along the path's near edge, and its roof and its front go back from
 * there at the slant (`DEPTH_SLANT` along for the path's depth up), so it
 * fills the path, its far side on the path's back edge. SCOOP BUS along
 * its side under its windows, black rails along it, and SBRC over its
 * windscreen; its scoop, a snowplough's blade, out in front, as wide as
 * the path, its bottom edge where it scoops.
 *
 * In cells of 2, from its top left, painted a cell at a time: a cell
 * square on is `along` from its back and `up` from the ground, and one
 * `back` across the path is `back × LEAN` further along and `back` higher.
 * Its near wheels touch the ground at the bottom of its picture.
 */

const CELL = 2
/** How deep it is across the path, in cells: all of it, but a cell each side. */
const DEEP = (PATH_BACK + PATH_FRONT) / CELL - 2
/** How far along a cell back across the path leans. */
const LEAN = DEPTH_SLANT / (PATH_BACK + PATH_FRONT)
/** Its picture, in cells: along to its bumper's front, and the slant back from there; its roof's back edge to the ground. */
const COLUMNS = 132
const ROWS = 66
const GROUND = ROWS

export const BUS_WIDTH = COLUMNS * CELL
export const BUS_HEIGHT = ROWS * CELL
/** Where its near wheels touch the ground, from its top: the path's near edge. */
export const BUS_GROUND = GROUND * CELL
/** The line everyone runs along, down the middle of the path, from its top: where it's put on the Ground. */
export const WHEEL_BOTTOM = BUS_GROUND - (DEEP / 2) * CELL
/** From its near side to its far side, on the picture: along and up, in px. */
export const BUS_ACROSS = { x: DEEP * LEAN * CELL, y: -DEEP * CELL }

/**
 * A point on the bus, `along` from its back, `up` from the ground and
 * `back` across the path from its near side, in cells: where it is on its
 * picture, in cells, from its top left.
 */
export const busCell = (along: number, up: number, back = 0) => ({
	x: along + back * LEAN,
	y: GROUND - up - back,
})

/** Square on to the middle of the path, `along` and `up`, in px on its picture. */
const middle = (along: number, up: number) => ({
	x: Math.round((along + (DEEP / 2) * LEAN) * CELL),
	y: (GROUND - up - DEEP / 2) * CELL,
})

/** Its body, a box: along from its back, up from the ground, and back across from its near side. */
const BODY = { from: 0, to: 80, low: 6, high: 50, near: 0, far: DEEP }
/** Its bonnet, out in front of it, a cell in from either side. */
const BONNET = { from: 80, to: 102, low: 6, high: 26, near: 1, far: DEEP - 1 }
const BUMPER = { from: 100, to: 106, low: 3, high: 9, near: 0, far: DEEP }

/** The middle of its roof, for a glider's struts or a condor's talons; the middle of its grille, for a drill. */
export const BUS_ROOF = middle(BODY.to / 2, BODY.high)
export const BUS_NOSE = middle(BONNET.to, 18)
/** Its underside, along its near side, where legs go on: from its top, in px. */
export const BUS_UNDERSIDE = (GROUND - BODY.low) * CELL

/** Its wheels' middles, along, and how high their axles are; how big they are, and their arches. */
const WHEELS = [20, 90]
const AXLE = 8
const WHEEL = 8
const ARCH = 9.5

type Colour = string | undefined

/**
 * Cells to paint, `ground` the row the near side's ground is under and
 * `left` the column its back is at; each paint goes over what's there.
 */
class Sheet {
	readonly cells: Colour[]
	constructor(
		readonly columns: number,
		readonly rows: number,
		readonly ground = GROUND,
		readonly left = 0,
	) {
		this.cells = new Array(columns * rows)
	}
	each(paint: (x: number, y: number) => Colour) {
		for (let y = 0; y < this.rows; y++)
			for (let x = 0; x < this.columns; x++) {
				const colour = paint(x + 0.5, y + 0.5)
				if (colour) this.cells[y * this.columns + x] = colour
			}
	}
	/** Square on, `back` across the path: `paint(along, up)`. */
	side(back: number, paint: (along: number, up: number) => Colour) {
		this.each((x, y) =>
			paint(x - this.left - back * LEAN, this.ground - y - back),
		)
	}
	/** Level, `up` high: `paint(along, back)`. */
	level(up: number, paint: (along: number, back: number) => Colour) {
		this.each((x, y) => {
			const back = this.ground - up - y
			return paint(x - this.left - back * LEAN, back)
		})
	}
	/**
	 * Facing the way it goes, `along` from its back: `paint(back, up,
	 * across)`, `across` how many columns in from where its near side is.
	 */
	end(
		along: number,
		paint: (back: number, up: number, across: number) => Colour,
	) {
		this.each((x, y) => {
			const across = x - this.left - along
			const back = across / LEAN
			return paint(back, this.ground - y - back, across)
		})
	}
	/**
	 * Solid shapes, seen from the front: each cell takes the nearest one
	 * it looks onto, coloured for the face it's on: `top`, its `end`
	 * facing the way it goes, or its `side` facing across the path.
	 */
	cast(
		solids: {
			inside: (along: number, up: number, back: number) => boolean
			colour: (
				face: 'side' | 'top' | 'end',
				along: number,
				up: number,
				back: number,
			) => Colour
		}[],
		from = -2,
		to = DEEP + 2,
	) {
		const step = 0.05
		this.each((x, y) => {
			for (let back = from; back < to; back += step) {
				const along = x - this.left - back * LEAN
				const up = this.ground - y - back
				for (const solid of solids) {
					if (!solid.inside(along, up, back)) continue
					const face = !solid.inside(along + step * LEAN, up, back)
						? 'end'
						: !solid.inside(along, up + step, back)
							? 'top'
							: 'side'
					return solid.colour(face, along, up, back)
				}
			}
			return undefined
		})
	}
	/** Only what's where `keep` says, square on to its near side. */
	clip(keep: (along: number, up: number) => boolean) {
		for (let y = 0; y < this.rows; y++)
			for (let x = 0; x < this.columns; x++)
				if (!keep(x + 0.5 - this.left, this.ground - y - 0.5))
					this.cells[y * this.columns + x] = undefined
	}
	/**
	 * Its picture's URL: a bitmap, a pixel a cell, not an SVG of rects,
	 * whose rows show hairline seams between them when it's tipped up a
	 * hill (as the condor's and the drill's are). Rects only where there's
	 * no canvas to paint on, for looking at it outside the game.
	 */
	art() {
		if (typeof document !== 'undefined') {
			const canvas = document.createElement('canvas')
			canvas.width = this.columns
			canvas.height = this.rows
			const ctx = canvas.getContext('2d')
			if (ctx) {
				this.cells.forEach((colour, i) => {
					if (!colour) return
					ctx.fillStyle = colour
					ctx.fillRect(i % this.columns, Math.floor(i / this.columns), 1, 1)
				})
				return canvas.toDataURL('image/png')
			}
		}
		const rects: PixelRect[] = []
		for (let y = 0; y < this.rows; y++) {
			let from = 0
			let colour: Colour
			for (let x = 0; x <= this.columns; x++) {
				const here =
					x < this.columns ? this.cells[y * this.columns + x] : undefined
				if (here !== colour) {
					if (colour) rects.push([from, y, x - from, 1, colour])
					from = x
					colour = here
				}
			}
		}
		return pixelArt(this.columns, this.rows, rects)
	}
}

const within = (n: number, from: number, to: number) => n >= from && n < to

/**
 * Like `paintedArt`, but a bitmap in the game (see `Sheet['art']`): for
 * what's drawn on the bus, tipped with it.
 */
export function paintedBitmap(
	width: number,
	height: number,
	paint: (x: number, y: number) => string | undefined,
) {
	const sheet = new Sheet(width, height)
	sheet.each(paint)
	return sheet.art()
}

interface Box {
	from: number
	to: number
	low: number
	high: number
	near: number
	far: number
}

/** A box, its front end, its top and its near side, each painted by its own. */
function box(
	sheet: Sheet,
	b: Box,
	paint: {
		side: (along: number, up: number) => Colour
		top: (along: number, back: number) => Colour
		end: (back: number, up: number, across: number) => Colour
	},
) {
	sheet.end(b.to, (back, up, across) =>
		within(back, b.near, b.far) && within(up, b.low, b.high)
			? paint.end(back, up, across)
			: undefined,
	)
	sheet.level(b.high, (along, back) =>
		within(along, b.from, b.to) && within(back, b.near, b.far)
			? paint.top(along, back)
			: undefined,
	)
	sheet.side(b.near, (along, up) =>
		within(along, b.from, b.to) && within(up, b.low, b.high)
			? paint.side(along, up)
			: undefined,
	)
}

/** Its name's letters along its side: bold, 6 cells by 7, two cells to a stroke. */
const BOLD: Record<string, string[]> = {
	S: ['.#####', '##....', '##....', '.####.', '....##', '....##', '#####.'],
	C: ['.#####', '##....', '##....', '##....', '##....', '##....', '.#####'],
	O: ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
	P: ['#####.', '##..##', '##..##', '#####.', '##....', '##....', '##....'],
	B: ['#####.', '##..##', '##..##', '#####.', '##..##', '##..##', '#####.'],
	U: ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
	K: ['##..##', '##.##.', '####..', '###...', '####..', '##.##.', '##..##'],
	' ': ['...', '...', '...', '...', '...', '...', '...'],
}

/** Lettering, `rows` of each letter, side by side a cell apart: whether it's lit, `column` along it and `row` down it. */
function lettering(text: string, glyph: (char: string) => string[]) {
	const columns: string[] = []
	for (const [i, char] of [...text].entries()) {
		const rows = glyph(char)
		if (i > 0) columns.push('.......')
		for (let c = 0; c < rows[0].length; c++)
			columns.push(rows.map((row) => row[c]).join(''))
	}
	return {
		width: columns.length,
		lit: (column: number, row: number) =>
			columns[Math.floor(column)]?.[Math.floor(row)] === '#',
	}
}

/** A bus's colours, and what's on it. */
interface BusPalette {
	body: string
	lit: string
	shade: string
	/** Its front, facing the way it goes: a little in shade. */
	end: string
	roof: string
	roofLit: string
	/** Its rails, its bumper, and its underneath. */
	trim: string
	trimLit: string
	well: string
	glass: string
	glassLit: string
	glassShade: string
	seat: string
	letters: string
	lamp: string
	tail: string
	amber: string
	grille: string
	chrome: string
	chromeLit: string
	tyre: string
	tread: string
	hub: string
	hubLit: string
	blade: string
	bladeLit: string
	bladeShade: string
	bladeDeep: string
	edge: string
	name: string
	/** Halloween's: grimy, rusting, haunted. */
	spooky?: {
		rust: string
		rustDark: string
		web: string
		ghoul: string
		eyes: string[]
		glow: string
		/** Inside its jack-o'-lantern, where it's carved. */
		carved: string
	}
}

const YELLOW: BusPalette = {
	body: '#f4b221',
	lit: '#f9cf43',
	shade: '#c48717',
	end: '#e3a01c',
	roof: '#f9cf43',
	roofLit: '#fde38a',
	trim: '#2b2722',
	trimLit: '#4a443d',
	well: '#1f1c19',
	glass: '#9fcfe4',
	glassLit: '#d3ecf6',
	glassShade: '#6f9fb8',
	seat: '#3f6a55',
	letters: '#c92128',
	lamp: '#fff4c2',
	tail: '#d8322a',
	amber: '#f08a1c',
	grille: '#2b2722',
	chrome: '#9aa2a8',
	chromeLit: '#d0d5d8',
	tyre: '#2b2722',
	tread: '#47413a',
	hub: '#9aa2a8',
	hubLit: '#d0d5d8',
	blade: '#2a93cf',
	bladeLit: '#5cb8e6',
	bladeShade: '#1d6fa3',
	bladeDeep: '#144f78',
	edge: '#c9cfd3',
	name: 'SCOOP BUS',
}

/**
 * Halloween's: the same bus left out too long, gone a mouldy green and
 * rusting, its windows dark, whoever's riding in it watching out of them
 * with glowing eyes; cobwebs in its corners, a crack across its
 * windscreen, its grille a jack-o'-lantern's grin, lit from inside, and
 * SPOOK BUS along its side, dripping.
 */
const SPOOKY: BusPalette = {
	...YELLOW,
	body: '#7c8b4e',
	lit: '#97a862',
	shade: '#5a6838',
	end: '#6c7a42',
	roof: '#8c9c58',
	roofLit: '#a6b56c',
	trim: '#24211f',
	trimLit: '#3c3833',
	well: '#171513',
	glass: '#2f2b3c',
	glassLit: '#4a4560',
	glassShade: '#221f2c',
	seat: '#1a1820',
	letters: '#b0151d',
	lamp: '#ffb21f',
	tail: '#e0201c',
	amber: '#ff7b00',
	grille: '#171513',
	chrome: '#6f7377',
	chromeLit: '#9a9ea3',
	tyre: '#24211f',
	tread: '#3a3632',
	hub: '#7b4a2b',
	hubLit: '#a0623a',
	// Its scoop, a pumpkin's orange, a jack-o'-lantern's face carved in it.
	blade: '#e8781a',
	bladeLit: '#f59a3a',
	bladeShade: '#c9600f',
	bladeDeep: '#8f420c',
	edge: '#5f6b38',
	name: 'SPOOK BUS',
	spooky: {
		rust: '#8a5230',
		rustDark: '#5e3420',
		web: '#d8d8e0',
		ghoul: '#121016',
		eyes: ['#9cff5a', '#ffe14a', '#ff3b2f'],
		glow: '#ffd36a',
		carved: '#3a1a08',
	},
}

/** Its windows along its near side: where each starts, and how wide they are; and how high they go. */
const WINDOWS = [4, 15, 26, 37, 48, 59]
const WINDOW_WIDTH = 9
const WINDOW_LOW = 34
const WINDOW_HIGH = 46
/** Its door, at the front of its near side: its edges, and its glass. */
const DOOR = { from: 69, to: 79, low: 11, high: 47, glass: 30 }
/** Its rails: under its windows, under its name, and low down. */
const RAILS = [
	[31, 33],
	[17, 18],
	[9, 10],
]
/** Its name, low and high. */
const NAME_LOW = 20
/** Rust, on the spooky one: along, up, how wide, how high. */
const RUST = [
	[6, 7, 5, 3],
	[33, 11, 4, 2],
	[50, 6, 7, 2],
	[58, 11, 4, 3],
	[2, 44, 3, 2],
	[84, 12, 4, 3],
	[94, 24, 3, 2],
]
/** Who's watching out of which window, on the spooky one, and their eyes' colour. */
const GHOULS = [
	{ window: 0, eyes: 0 },
	{ window: 2, eyes: 1 },
	{ window: 3, eyes: 0 },
	{ window: 5, eyes: 2 },
]

/** A window's glass, `x` along it and `y` up it: lit along its top, a glint across it, seat backs at its foot. */
function glass(p: BusPalette, x: number, y: number, height: number) {
	if (y >= height - 2) return p.glassLit
	if (within(x + y * 0.8, height - 2, height)) return p.glassLit
	if (y < 2 && within(x, 1, WINDOW_WIDTH - 1)) return p.seat
	return y < height / 2 ? p.glassShade : p.glass
}

/** Someone in a window, on the spooky one: their head and shoulders, dark, two eyes glowing. */
function ghoul(p: BusPalette, x: number, y: number, eyes: number) {
	const spooky = p.spooky
	if (!spooky) return undefined
	const head = ((x - 4.5) / 2.6) ** 2 + ((y - 6) / 2.6) ** 2 <= 1
	const shoulders = y < 4 && within(x, 1, 8)
	if (!head && !shoulders) return undefined
	if (Math.floor(y) === 6 && (Math.floor(x) === 3 || Math.floor(x) === 5))
		return spooky.eyes[eyes]
	return spooky.ghoul
}

function paintBus(sheet: Sheet, p: BusPalette) {
	const name = lettering(p.name, (char) => BOLD[char] ?? BOLD[' '])
	const nameFrom = Math.round((DOOR.from - name.width) / 2)
	const sign = lettering('SBRC', glyphRows)
	const arch = (along: number, up: number) =>
		WHEELS.some((x) => Math.hypot(along - x, up - AXLE) < ARCH)
	const rusty = (along: number, up: number) =>
		!!p.spooky &&
		RUST.some(
			([x, y, w, h]) =>
				within(along, x, x + w) &&
				within(up, y, y + h) &&
				// Ragged, not a block.
				(Math.floor(along) * 7 + Math.floor(up) * 3) % 5 !== 0,
		)

	// Underneath, between its wheels: its chassis, in the dark under it;
	// its exhaust out of its back.
	sheet.side(3, (along, up) =>
		within(along, 6, 100) && within(up, 2, 7) ? p.trim : undefined,
	)
	sheet.side(2, (along, up) =>
		within(along, -3, 8) && within(up, 3, 4.5) ? p.chrome : undefined,
	)

	box(sheet, BODY, {
		// Its roof: lit, a hatch or two in it, and lamps along its front edge.
		top: (along, back) => {
			if (back < 1) return p.roofLit
			if (along >= BODY.to - 2) {
				if (within(back, 2, 4) || within(back, DEEP - 4, DEEP - 2))
					return p.tail
				if (within(back, 5, 7) || within(back, DEEP - 7, DEEP - 5))
					return p.amber
			}
			for (const x of [20, 50])
				if (within(along, x, x + 9) && within(back, 5, 11))
					return back < 6 ? p.shade : p.body
			return p.roof
		},
		// Its front, over its bonnet: SBRC on a board, its windscreen under it.
		end: (back, up, across) => {
			if (up >= BODY.high - 1) return p.lit
			if (within(up, 41, 48)) {
				const lit = sign.lit(across - 1, 48 - up)
				if (lit) return p.spooky ? p.letters : p.trim
				return p.end
			}
			const pane = within(back, 1, 7.5) || within(back, 8.5, DEEP - 1)
			if (within(up, 28, 40) && pane) {
				// A crack across it, on the spooky one.
				if (p.spooky && Math.abs(across - 3 - (up - 28) * 0.6) < 0.6)
					return p.spooky.web
				if (up >= 38) return p.glassLit
				if (within(across - (up - 28) * 1.2, 13, 15)) return p.glassLit
				return p.glass
			}
			return p.end
		},
		side: (along, up) => {
			if (arch(along, up)) return p.well
			if (up >= BODY.high - 1) return p.lit
			if (rusty(along, up)) return p.spooky?.rust
			// Its windows, and on the spooky one, who's in them.
			for (const [i, x] of WINDOWS.entries())
				if (
					within(along, x, x + WINDOW_WIDTH) &&
					within(up, WINDOW_LOW, WINDOW_HIGH)
				) {
					const who = GHOULS.find((g) => g.window === i)
					const seen = who && ghoul(p, along - x, up - WINDOW_LOW, who.eyes)
					if (seen) return seen
					// Cobwebs in a corner of the last window.
					if (p.spooky && i === WINDOWS.length - 1) {
						const x2 = x + WINDOW_WIDTH - along
						const y2 = WINDOW_HIGH - up
						if (
							x2 + y2 < 6 &&
							(x2 < 1 ||
								y2 < 1 ||
								Math.abs(x2 - y2) < 0.6 ||
								Math.abs(x2 + y2 - 4) < 0.6)
						)
							return p.spooky.web
					}
					return glass(p, along - x, up - WINDOW_LOW, WINDOW_HIGH - WINDOW_LOW)
				}
			if (within(up, WINDOW_LOW - 1, WINDOW_LOW)) return p.shade
			// Its door: dark seams round it and down the middle, glass in its top half.
			if (
				within(along, DOOR.from, DOOR.to) &&
				within(up, DOOR.low, DOOR.high)
			) {
				if (
					within(along, DOOR.from, DOOR.from + 1) ||
					within(along, DOOR.to - 1, DOOR.to) ||
					within(along, 73.5, 74.5) ||
					within(up, DOOR.low, DOOR.low + 1) ||
					within(up, DOOR.high - 1, DOOR.high)
				)
					return p.trim
				if (up >= DOOR.glass)
					return glass(
						p,
						(along - DOOR.from) % 5,
						up - DOOR.glass,
						DOOR.high - 1 - DOOR.glass,
					)
				return up >= DOOR.glass - 1 ? p.shade : p.body
			}
			for (const [low, high] of RAILS) if (within(up, low, high)) return p.trim
			// Its name.
			if (within(up, NAME_LOW, NAME_LOW + 7)) {
				if (name.lit(along - nameFrom, NAME_LOW + 7 - up)) return p.letters
			}
			// Dripping, on the spooky one.
			if (p.spooky && within(up, NAME_LOW - 3, NAME_LOW)) {
				const column = Math.floor(along - nameFrom)
				const drips = [1, 8, 15, 23, 30, 41, 48, 55]
				const long = drips.indexOf(column)
				if (long >= 0 && NAME_LOW - up < 1 + (long % 3) && name.lit(column, 6))
					return p.letters
			}
			// Its lamps at the back, red, and amber.
			if (along < 2 && (within(up, 40, 44) || within(up, 12, 15))) return p.tail
			if (along < 2 && within(up, 37, 39)) return p.amber
			if (up < BODY.low + 1) return p.shade
			return p.body
		},
	})

	box(sheet, BONNET, {
		// Its bonnet: lit, a seam down its middle.
		top: (along, back) =>
			within(back, DEEP / 2 - 0.5, DEEP / 2 + 0.5) ? p.lit : p.roofLit,
		// Its grille, between its headlights, amber lamps under them.
		end: (back, up) => {
			if (up >= BONNET.high - 1) return p.lit
			if (within(back, 4.5, DEEP - 4.5) && within(up, 9, 23))
				return Math.floor(up) % 3 === 0 ? p.chrome : p.grille
			for (const from of [1.5, DEEP - 4]) {
				if (within(back, from, from + 2.5) && within(up, 17, 21)) return p.lamp
				if (within(back, from, from + 2.5) && within(up, 13, 15)) return p.amber
			}
			return p.end
		},
		side: (along, up) => {
			if (arch(along, up)) return p.well
			if (up >= BONNET.high - 1) return p.lit
			if (rusty(along, up)) return p.spooky?.rustDark
			if (within(up, 9, 10)) return p.trim
			if (up < BONNET.low + 1) return p.shade
			return p.body
		},
	})

	box(sheet, BUMPER, {
		top: () => p.trimLit,
		end: () => p.trim,
		side: (_, up) => (up >= BUMPER.high - 1 ? p.trimLit : p.trim),
	})

	// Its mirror, out on a stalk off its front corner.
	sheet.side(-1, (along, up) => {
		if (within(along, 81, 83) && within(up, 34, 41))
			return up >= 40 ? p.chromeLit : p.trim
		if (within(along, 78, 81) && within(up, 39, 40)) return p.trim
		return undefined
	})
}

/** A wheel, its middle `along`: its tyre, its tread going back, a hub, lit; only where it shows, under its arch. */
function wheelArt(p: BusPalette, along: number) {
	const sheet = new Sheet(21, 19, 19, -(along - WHEEL - 1))
	const out = (a: number, h: number) => Math.hypot(a - along, h - AXLE)
	for (const back of [2, 1])
		sheet.side(back, (a, h) => (out(a, h) < WHEEL ? p.tread : undefined))
	sheet.side(0, (a, h) => {
		const r = out(a, h)
		if (r >= WHEEL) return undefined
		if (r < 1.5) return p.tyre
		if (r < 4.5) return a < along && h > AXLE ? p.hubLit : p.hub
		return p.tyre
	})
	sheet.clip((a, h) => Math.hypot(a - along, h - AXLE) < ARCH || h < BODY.low)
	return {
		asset: sheet.art(),
		x: (along - WHEEL - 1) * CELL,
		y: (GROUND - 19) * CELL,
	}
}
export const BUS_WHEEL_WIDTH = 21 * CELL
export const BUS_WHEEL_HEIGHT = 19 * CELL

/**
 * Its scoop: a snowplough's blade, curved, out in front of its bumper on
 * two arms, as wide as the path and a cell more each side. Lit along its
 * top lip, in shade in its hollow, a steel edge along its bottom where it
 * scoops; its near end's plate, square on.
 */
const BLADE = { from: 110, low: 0, high: 22, near: -1, far: DEEP + 1, curve: 4 }
const bladeFront = (up: number) =>
	BLADE.from + BLADE.curve * ((up - BLADE.high / 2) / (BLADE.high / 2)) ** 2
const SCOOP_LEFT = 100
const SCOOP_COLUMNS = 42
const SCOOP_TOP = GROUND - BLADE.high - BLADE.far
const SCOOP_ROWS = BLADE.high + BLADE.far + 1

/**
 * A jack-o'-lantern's face, carved in the spooky one's scoop and lit from
 * inside: two eyes and a nose, triangles, and a grin, its teeth in it.
 * Going back across the blade at its slant, as SBRC does over the
 * windscreen.
 */
const JACK_O_LANTERN = [
	'...#.....#...',
	'..###...###..',
	'.#####.#####.',
	'......#......',
	'.....###.....',
	'.............',
	'##.#######.##',
	'.###########.',
	'..####.####..',
	'...##...##...',
]

function scoopArt(p: BusPalette) {
	const sheet = new Sheet(
		SCOOP_COLUMNS,
		SCOOP_ROWS,
		GROUND - SCOOP_TOP,
		-SCOOP_LEFT,
	)
	// Its arms, back to the bumper.
	for (const back of [DEEP - 3, 3])
		sheet.side(back, (along, up) =>
			within(along, 104, BLADE.from + 1) && within(up, 5, 7.5)
				? p.trim
				: undefined,
		)
	// Its face, from its far end to its near one.
	for (let back = BLADE.far; back >= BLADE.near; back -= 0.25)
		for (let up = BLADE.low; up < BLADE.high; up += 0.25) {
			const x = Math.floor(bladeFront(up) - SCOOP_LEFT + back * LEAN)
			const y = Math.floor(sheet.ground - up - back)
			if (x < 0 || x >= SCOOP_COLUMNS || y < 0 || y >= SCOOP_ROWS) continue
			// A pumpkin's ribs up it, on the spooky one; on the yellow one,
			// in shade in its hollow.
			const hollow = p.spooky
				? (back - BLADE.near) % 3 < 0.75
				: within(up, 6, 15)
			const colour =
				up >= BLADE.high - 2
					? p.bladeLit
					: up < 2
						? p.edge
						: hollow
							? p.bladeShade
							: p.blade
			sheet.cells[y * SCOOP_COLUMNS + x] = colour
		}
	// Its jack-o'-lantern, on the spooky one, on the middle of its face.
	if (p.spooky) {
		const up = BLADE.high / 2 + 1
		const middle = (BLADE.near + BLADE.far) / 2
		const width = JACK_O_LANTERN[0].length
		const height = JACK_O_LANTERN.length
		const left = bladeFront(up) - SCOOP_LEFT + middle * LEAN - width / 2
		const top = sheet.ground - up - middle - height / 2
		JACK_O_LANTERN.forEach((row, r) => {
			for (let c = 0; c < width; c++) {
				if (row[c] !== '#') continue
				const x = Math.floor(left + c)
				const y = Math.floor(top + r - (c - width / 2) / LEAN)
				// Dark inside, the candle's glow along each hole's bottom.
				const lit = JACK_O_LANTERN[r + 1]?.[c] !== '#'
				if (sheet.cells[y * SCOOP_COLUMNS + x])
					sheet.cells[y * SCOOP_COLUMNS + x] = lit
						? p.spooky?.glow
						: p.spooky?.carved
			}
		})
	}
	// Its near end, square on.
	sheet.side(BLADE.near, (along, up) => {
		if (!within(up, BLADE.low, BLADE.high)) return undefined
		const front = bladeFront(up)
		if (!within(along, front - 2, front)) return undefined
		return up >= BLADE.high - 1 ? p.bladeLit : p.bladeDeep
	})
	return sheet.art()
}

/** The scoop's picture, where it goes on the bus's, and where it scoops from: its bottom edge's front, down the middle of the path. */
export const BUS_SCOOP_WIDTH = SCOOP_COLUMNS * CELL
export const BUS_SCOOP_HEIGHT = SCOOP_ROWS * CELL
export const BUS_SCOOP_AT = { x: SCOOP_LEFT * CELL, y: SCOOP_TOP * CELL }
export const BUS_SCOOP_TIP = {
	x: Math.round((bladeFront(0) + (DEEP / 2) * LEAN - SCOOP_LEFT) * CELL),
	y: (GROUND - SCOOP_TOP - DEEP / 2) * CELL,
}
/** The scoop's front, from the bus's back: where it scoops. */
export const SCOOP_FRONT = BUS_SCOOP_AT.x + BUS_SCOOP_TIP.x

/** A bus's pictures: its body, its wheels, back and front, and its scoop. */
export interface BusArt {
	body: string
	wheels: { asset: string; x: number; y: number }[]
	scoop: string
}

function busArt(p: BusPalette): BusArt {
	const sheet = new Sheet(COLUMNS, ROWS)
	paintBus(sheet, p)
	return {
		body: sheet.art(),
		wheels: WHEELS.map((x) => wheelArt(p, x)),
		scoop: scoopArt(p),
	}
}

export const SCOOP_BUS = busArt(YELLOW)
export const SPOOK_BUS = busArt(SPOOKY)

/**
 * The sleigh, in place of the bus down a ski slope: the bus's yellow, as
 * long and as wide, on two runners, one each side of the path, curled up
 * at the front. A tall scrolled back, a dip for the bench, and a dash
 * curling up at the front; SCOOP BUS along its side, SBRC on its dash,
 * presents piled up behind the bench. Its scoop's the bus's.
 */
const SLEIGH_TOP: [number, number][] = [
	[0, 36],
	[3, 44],
	[10, 46],
	[18, 42],
	[26, 31],
	[34, 26],
	[62, 26],
	[72, 30],
	[82, 36],
	[94, 41],
	[100, 39],
	[104, 32],
]
const SLEIGH_BOTTOM: [number, number][] = [
	[0, 20],
	[4, 12],
	[12, 9],
	[92, 9],
	[100, 13],
	[104, 21],
]
/** Between the points of `curve`, eased, at `x`. */
function eased(curve: [number, number][], x: number) {
	for (let i = 1; i < curve.length; i++) {
		const [x1, y1] = curve[i]
		if (x > x1) continue
		const [x0, y0] = curve[i - 1]
		const t = Math.max(0, (x - x0) / (x1 - x0))
		return y0 + (y1 - y0) * (t * t * (3 - 2 * t))
	}
	return curve[curve.length - 1][1]
}
/** Its runners' rails, and the struts up to its body. */
const RUNNER = { from: 6, to: 104, curl: { x: 104, y: 10, r: 9.5 } }
const STRUTS = [18, 48, 78]

function sleighArt() {
	const p = YELLOW
	const sheet = new Sheet(COLUMNS, ROWS)
	const hull = (along: number, up: number) =>
		within(along, 0, 104) &&
		up >= eased(SLEIGH_BOTTOM, along) &&
		up < eased(SLEIGH_TOP, along)
	const runner = (along: number, up: number) => {
		const { curl } = RUNNER
		if (within(along, RUNNER.from, curl.x) && within(up, 0, 2)) return true
		const r = Math.hypot(along - curl.x, up - curl.y)
		const angle = Math.atan2(up - curl.y, along - curl.x)
		if (Math.abs(r - curl.r + 0.5) < 1.1 && angle > -Math.PI / 2 && angle < 2.6)
			return true
		// Its curl's knob.
		if (Math.hypot(along - (curl.x - 8), up - (curl.y + 5)) < 1.6) return true
		return STRUTS.some((x) => within(along, x, x + 2) && within(up, 2, 10))
	}
	const name = lettering(p.name, (char) => BOLD[char] ?? BOLD[' '])
	const sign = lettering('SBRC', glyphRows)
	const FLOOR = '#9c6a12'
	const VELVET = ['#8f2a2e', '#b23a3d', '#6a1d21']
	type Face = 'side' | 'top' | 'end'
	/** A box, its faces each their own colour. */
	const solidBox = (
		b: Box,
		colour: (face: Face, along: number, up: number, back: number) => Colour,
	) => ({
		inside: (along: number, up: number, back: number) =>
			within(along, b.from, b.to) &&
			within(up, b.low, b.high) &&
			within(back, b.near, b.far),
		colour,
	})
	/** Presents, piled up behind the bench, their ribbons round them. */
	const presents = [
		{
			from: 16,
			to: 28,
			high: 38,
			near: 3,
			far: 11,
			colour: ['#c8333a', '#e0575b', '#952127'],
			ribbon: '#f9cf43',
		},
		{
			from: 28,
			to: 40,
			high: 33,
			near: 7,
			far: 14,
			colour: ['#3f8a4a', '#5aa863', '#2c6535'],
			ribbon: '#e8e3d6',
		},
		{
			from: 38,
			to: 48,
			high: 30,
			near: 2,
			far: 8,
			colour: ['#3b6fc0', '#5c8edb', '#2a5293'],
			ribbon: '#e0575b',
		},
	].map((g) => {
		const midAlong = (g.from + g.to) / 2
		const midBack = (g.near + g.far) / 2
		return solidBox({ ...g, low: 10 }, (face, along, _, back) => {
			const ribbon =
				(face !== 'end' && within(along, midAlong - 1, midAlong + 1)) ||
				(face !== 'side' && within(back, midBack - 0.7, midBack + 0.7))
			if (ribbon) return g.ribbon
			return face === 'top'
				? g.colour[1]
				: face === 'end'
					? g.colour[2]
					: g.colour[0]
		})
	})
	const velvet = (face: Face) =>
		face === 'top' ? VELVET[1] : face === 'end' ? VELVET[2] : VELVET[0]
	sheet.cast([
		// Its near runner, brass.
		{
			inside: (along, up, back) => within(back, 0, 1.2) && runner(along, up),
			colour: (face) => (face === 'top' ? p.lit : p.shade),
		},
		// Its body: its ends solid right across, its sides a shell round
		// the bench, lit along their tops, in shade inside.
		{
			inside: (along, up, back) =>
				hull(along, up) &&
				(back >= DEEP - 1.5 ||
					back < 1.5 ||
					along < 12 ||
					along > 86 ||
					up < 11),
			colour: (face, along, up, back) => {
				// Its rim, right round its top, lit; its floor; and inside its
				// ends, facing forwards, in shade.
				if (face !== 'side' || back > 0.5) {
					if (up < 11.5) return FLOOR
					if (eased(SLEIGH_TOP, along) - up < 2) return p.lit
					return face === 'side' ? p.shade : p.end
				}
				// Its near side, square on: lit along its top, a red stripe
				// under that, its name, and SBRC on its dash.
				if (!hull(along, up + 1)) return p.lit
				if (!hull(along, up + 2)) return p.letters
				if (!hull(along, up - 1)) return p.shade
				if (within(up, 13, 20) && name.lit(along - 12, 20 - up))
					return p.letters
				if (within(up, 24, 31) && sign.lit(along - 77, 31 - up)) return p.trim
				return p.body
			},
		},
		...presents,
		// Its bench: its back, and its cushion, red velvet.
		solidBox(
			{ from: 56, to: 60, low: 10, high: 32, near: 2, far: DEEP - 2 },
			velvet,
		),
		solidBox(
			{ from: 60, to: 76, low: 10, high: 19, near: 2, far: DEEP - 2 },
			velvet,
		),
		// Its far runner.
		{
			inside: (along, up, back) =>
				within(back, DEEP - 1.2, DEEP) && runner(along, up),
			colour: (face) => (face === 'top' ? p.end : p.shade),
		},
	])
	return sheet.art()
}

export const SLEIGH = sleighArt()
/** Where the back of its runners is, for the snow sprayed off them. */
export const SLEIGH_TAIL = middle(RUNNER.from, 0)
