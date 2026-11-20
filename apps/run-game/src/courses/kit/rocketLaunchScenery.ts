import {
	type PixelRect,
	glyphRows,
	rectsMarkup,
	svgUrl,
	tile,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * Rocket Launch's art, the launch site and space: the rocket and its
 * gantry, the pad and what's round it, and the stars. The planet's is in
 * `rocketPlanetScenery.ts`, the aliens' base's in `alienBaseScenery.ts`,
 * and the aliens themselves in `alienCreatures.ts`. Sizes are in screen
 * pixels; anything drawn at a cell a pixel goes in its `Scenery` at
 * `scale: 2`, so its picture is half its size here.
 */

/**
 * A picture being painted, a cell at a time: later shapes go over earlier
 * ones, and anything off its edge is left off.
 */
class Grid {
	private readonly cells: (string | undefined)[]
	constructor(
		readonly width: number,
		readonly height: number,
	) {
		this.cells = new Array(width * height)
	}

	set(x: number, y: number, fill: string | undefined) {
		if (x >= 0 && y >= 0 && x < this.width && y < this.height)
			this.cells[y * this.width + x] = fill
	}

	rect(x: number, y: number, w: number, h: number, fill: string) {
		for (let j = 0; j < h; j++)
			for (let i = 0; i < w; i++) this.set(x + i, y + j, fill)
	}

	/** Every cell of a box `paint` has a colour for, `paint` given the cell's middle. */
	paint(
		x: number,
		y: number,
		w: number,
		h: number,
		paint: (x: number, y: number) => string | undefined,
	) {
		for (let j = y; j < y + h; j++)
			for (let i = x; i < x + w; i++) {
				const fill = paint(i + 0.5, j + 0.5)
				if (fill) this.set(i, j, fill)
			}
	}

	/** A disc round `cx`, `cy`, `r` across, each cell coloured by `tone` (how far in, across). */
	disc(
		cx: number,
		cy: number,
		r: number,
		tone: string | ((x: number, y: number) => string | undefined),
	) {
		this.paint(
			Math.floor(cx - r),
			Math.floor(cy - r),
			Math.ceil(r * 2) + 1,
			Math.ceil(r * 2) + 1,
			(x, y) =>
				(x - cx) ** 2 + (y - cy) ** 2 <= r * r
					? typeof tone === 'string'
						? tone
						: tone(x, y)
					: undefined,
		)
	}

	/** A stepped line, a cell thick, from one end to the other. */
	line(x0: number, y0: number, x1: number, y1: number, fill: string) {
		const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
		for (let i = 0; i <= n; i++)
			this.set(
				Math.round(x0 + ((x1 - x0) * i) / n),
				Math.round(y0 + ((y1 - y0) * i) / n),
				fill,
			)
	}

	/** Text in the pixel letters, `cell` cells a pixel of a letter. */
	text(text: string, x: number, y: number, cell: number, fill: string) {
		;[...text].forEach((char, i) =>
			glyphRows(char).forEach((row, r) =>
				[...row].forEach((c, k) => {
					if (c === '#')
						this.rect(x + (i * 6 + k) * cell, y + r * cell, cell, cell, fill)
				}),
			),
		)
	}

	/** As an image's URL, each cell `cell` px across. */
	url(cell = 1) {
		const rects: PixelRect[] = []
		for (let y = 0; y < this.height; y++) {
			let from = 0
			let colour: string | undefined
			for (let x = 0; x <= this.width; x++) {
				const here = x < this.width ? this.cells[y * this.width + x] : undefined
				if (here !== colour) {
					if (colour)
						rects.push([from * cell, y * cell, (x - from) * cell, cell, colour])
					from = x
					colour = here
				}
			}
		}
		return svgUrl(this.width * cell, this.height * cell, rectsMarkup(rects))
	}
}

const INK = '#1d1d1d'

// --- The launch site ---------------------------------------------------------

const HULL = '#eef0f2'
const HULL_LIT = '#ffffff'
const HULL_SHADE = '#c4cad2'
const HULL_DARK = '#9ba4b0'
const NOSE = '#d8453a'
const NOSE_LIT = '#ee6a52'
const NOSE_SHADE = '#a8322c'
const NAVY = '#27406b'
const GLASS = '#4f9fd6'
const GLASS_LIT = '#bfe6f8'
const METAL = '#7d8794'
const BUS_YELLOW = '#f6c445'

/**
 * The rocket, stood on its pad, nose up: a tall white rocket, its red
 * capsule on top, its windows (drawn over it), the club's yellow bus and "SBRC" on its side,
 * fins at its foot, and a door into it on its left side, high up, where the
 * gantry's walkway meets it. Drawn at a cell a pixel; its sizes here are on
 * the screen. `door`: the middle of the door's sill, from the picture's top
 * left, where everyone steps in.
 */
export const ROCKET = (() => {
	const g = new Grid(64, 224)
	const MID = 32
	/** How far its hull reaches either side of its middle, `y` down: a bullet's nose, then straight. */
	const reach = (y: number) =>
		y < 44
			? Math.max(1, Math.round(20 * Math.sqrt(1 - ((44 - y) / 44) ** 2)))
			: 20

	// Its fins at its foot, swept back: the far one darker, the middle one in front.
	for (let y = 170; y < 224; y++) {
		const out = y < 190 ? 12 - Math.round(((y - 170) * 9) / 20) : 3
		g.rect(out, y, 12 - out, 1, NOSE)
		g.rect(52, y, 12 - out, 1, NOSE_SHADE)
		// The left one's top edge, lit.
		if (y < 190) g.set(out, y, NOSE_LIT)
	}

	// Its hull, cell by cell: the capsule's red, the body's white, lit down its left and shaded down its right.
	for (let y = 0; y < 224; y++) {
		const hw = reach(y)
		for (let x = MID - hw; x < MID + hw; x++) {
			const t = (x - (MID - hw)) / (2 * hw - 1 || 1)
			const red = y < 28 || (y >= 44 && y < 50)
			if (red) g.set(x, y, t < 0.18 ? NOSE_LIT : t > 0.82 ? NOSE_SHADE : NOSE)
			else
				g.set(
					x,
					y,
					t < 0.14
						? HULL_LIT
						: t > 0.88
							? HULL_DARK
							: t > 0.62
								? HULL_SHADE
								: HULL,
				)
		}
	}
	// Its panel seams.
	for (const y of [112, 158, 190]) g.rect(12, y, 40, 1, HULL_SHADE)
	// Its red band over its fins, and the middle fin in front.
	g.rect(12, 164, 40, 6, NOSE)
	g.rect(12, 164, 40, 1, NOSE_LIT)
	g.rect(12, 169, 40, 1, NOSE_SHADE)
	for (let y = 178; y < 224; y++) {
		const w = Math.min(10, 4 + 2 * Math.round((y - 178) / 12))
		g.rect(MID - w / 2, y, w, 1, NOSE)
		g.set(MID - w / 2, y, NOSE_LIT)
		g.set(MID + w / 2 - 1, y, NOSE_SHADE)
	}
	// Its engines' skirt, and the three bells under it.
	g.rect(12, 214, 40, 10, METAL)
	g.rect(12, 214, 40, 1, HULL_DARK)
	for (const x of [17, 28, 39]) g.rect(x, 219, 8, 5, '#2e323b')

	// Its windows, square, one in its capsule and one down its body, are
	// drawn over it (see `draw/rocketLaunch.tsx`), with whoever's aboard.

	// The club's bus on a navy patch, with SBRC under it.
	g.rect(20, 80, 24, 18, NAVY)
	for (const [x, y] of [
		[20, 80],
		[43, 80],
		[20, 97],
		[43, 97],
	])
		g.set(x, y, HULL)
	g.rect(23, 84, 18, 8, BUS_YELLOW)
	g.rect(23, 84, 18, 1, '#ffe27a')
	g.rect(23, 91, 18, 1, '#d29a22')
	for (let i = 0; i < 4; i++) g.rect(25 + i * 4, 86, 3, 2, GLASS)
	g.rect(38, 86, 3, 4, GLASS)
	g.rect(25, 91, 3, 3, INK)
	g.rect(36, 91, 3, 3, INK)
	g.text('SBRC', 21, 101, 1, NAVY)

	// Its door, on its left: a dark opening, a lit cabin behind it, a sill out to the walkway.
	g.rect(12, 118, 16, 2, METAL)
	g.rect(12, 120, 12, 30, '#2f3441')
	g.rect(24, 120, 3, 30, HULL_DARK)
	g.rect(20, 124, 3, 26, '#f2c978')
	g.rect(8, 150, 19, 2, METAL)
	g.rect(8, 150, 19, 1, HULL_DARK)
	return {
		asset: g.url(),
		width: 128,
		height: 448,
		/** How many screen pixels to a cell of its picture. */
		scale: 2,
		door: { x: 24, y: 300 },
	}
})()

const STEEL = '#c8442f'
const STEEL_LIT = '#e8684b'
const STEEL_SHADE = '#8e2f20'
const STEEL_DARK = '#5f1f16'
const LAMP = '#ffd23f'

/**
 * The launch tower beside it: a red steel gantry, stood on the ground, the
 * stairs (the Ground's own, see the course) going up its front to the
 * walkway along its top, out to the rocket's door. As wide as the stairs
 * and walkway together, and as tall as the walkway's height over the
 * ground (`ROCKET.height - ROCKET.door.y`) and its railings and roof over
 * that. Drawn behind the path: a lattice of columns, beams and braces.
 */
export const GANTRY = (() => {
	const W = 182
	const H = 120
	const g = new Grid(W, H)
	/** The walkway's floor, from the top: 74 cells under it, 148 px. */
	const DECK = 46
	const COLUMNS = [0, 62, 120, 177]
	const BEAMS = [30, 70, 100]

	// Its braces, an X in each panel between two columns and two beams.
	const brace = (x0: number, x1: number, y0: number, y1: number) => {
		for (const dx of [0, 1]) {
			g.line(x0 + dx, y0, x1 + dx, y1, STEEL_SHADE)
			g.line(x1 + dx, y0, x0 + dx, y1, STEEL_SHADE)
		}
	}
	const panels: [number, number][] = [
		[5, 62],
		[67, 120],
		[125, 177],
	]
	const levels = [12, ...BEAMS, 118]
	for (const [x0, x1] of panels)
		for (let i = 0; i < levels.length - 1; i++)
			brace(x0, x1 - 1, levels[i] + 4, levels[i + 1] - 1)
	// Its beams, across.
	for (const y of BEAMS) {
		g.rect(0, y, W, 4, STEEL)
		g.rect(0, y, W, 1, STEEL_LIT)
		g.rect(0, y + 3, W, 1, STEEL_SHADE)
	}
	// Its columns, up its height: lit on the left, shaded on the right.
	for (const x of COLUMNS) {
		g.rect(x, 12, 5, 108, STEEL)
		g.rect(x, 12, 1, 108, STEEL_LIT)
		g.rect(x + 4, 12, 1, 108, STEEL_SHADE)
	}
	// The top beam across the lot, with the roof over the walkway.
	g.rect(0, 8, W, 5, STEEL)
	g.rect(0, 8, W, 1, STEEL_LIT)
	g.rect(0, 12, W, 1, STEEL_SHADE)
	g.rect(116, 3, 66, 6, STEEL)
	g.rect(116, 3, 66, 1, STEEL_LIT)
	g.rect(116, 8, 66, 1, STEEL_DARK)
	// The walkway's floor beam, edged in hazard stripes.
	g.rect(120, DECK, 62, 5, STEEL)
	g.rect(120, DECK, 62, 1, STEEL_LIT)
	for (let x = 120; x < W; x += 6) g.rect(x, DECK + 2, 3, 2, LAMP)
	g.rect(120, DECK + 4, 62, 1, STEEL_DARK)
	// Its railing along the walkway: a top rail, posts under it.
	g.rect(125, 36, 52, 1, STEEL_LIT)
	for (let x = 128; x < 177; x += 12) g.rect(x, 37, 1, 9, STEEL_SHADE)
	g.rect(125, 41, 52, 1, STEEL_SHADE)
	// Its handrail beside the stairs, climbing with them.
	for (let x = 4; x < 120; x++)
		g.set(x, Math.round(H - 12 - (x / 125) * 74), STEEL_LIT)
	for (let x = 10; x < 120; x += 14)
		g.rect(x, Math.round(H - 12 - (x / 125) * 74) + 1, 1, 10, STEEL_SHADE)
	// A mast on the corner, and warning lamps.
	g.rect(2, 0, 1, 8, STEEL_DARK)
	g.rect(1, 0, 3, 2, LAMP)
	g.rect(178, 0, 3, 3, LAMP)
	g.rect(179, 3, 1, 1, STEEL_DARK)
	return { asset: g.url(), width: 364, height: 240, scale: 2 }
})()

/** The pad under the rocket: a concrete slab, its flame trench under it. */
export const launchPad = (() => {
	const g = new Grid(130, 24)
	const TOP = '#c4c3bc'
	const FACE = '#9a9a96'
	const FACE_SHADE = '#7f7f7b'
	// The mount the rocket stands on, then the slab's top and its front.
	g.rect(30, 2, 70, 4, '#a9a8a1')
	g.rect(30, 2, 70, 1, TOP)
	g.rect(0, 6, 130, 4, TOP)
	g.rect(0, 6, 130, 1, '#dad9d2')
	for (let x = 0; x < 130; x += 8) g.rect(x, 8, 4, 2, BUS_YELLOW)
	for (let x = 4; x < 130; x += 8) g.rect(x, 8, 4, 2, INK)
	g.rect(0, 10, 130, 14, FACE)
	g.rect(0, 20, 130, 4, FACE_SHADE)
	for (const x of [26, 104]) g.rect(x, 10, 1, 14, FACE_SHADE)
	// The flame trench under it, scorched round its mouth.
	g.rect(40, 12, 50, 12, '#4a3f38')
	g.rect(44, 14, 42, 10, '#2a2a2e')
	g.rect(50, 18, 30, 6, '#17171a')
	return g.url()
})()

/** A fuel tank, a white sphere on legs, its red band and a pipe. */
export const fuelTank = (() => {
	const g = new Grid(40, 44)
	// Its legs, splayed, and the ring brace round them.
	g.line(9, 28, 6, 42, '#7d8794')
	g.line(10, 28, 7, 42, '#7d8794')
	g.line(30, 28, 33, 42, '#5f6772')
	g.line(29, 28, 32, 42, '#5f6772')
	g.rect(8, 36, 24, 1, '#5f6772')
	g.rect(4, 42, 6, 2, '#5f6772')
	g.rect(30, 42, 6, 2, '#4d535c')
	// Its pipe, off its foot.
	g.rect(30, 38, 8, 2, '#9ba4b0')
	g.rect(36, 24, 2, 16, '#9ba4b0')
	g.rect(36, 24, 2, 1, HULL_LIT)
	// The sphere.
	g.disc(20, 17, 15, (x, y) => {
		const lit = -(x - 20 + (y - 17)) / 21
		return lit > 0.5
			? '#ffffff'
			: lit > -0.15
				? '#e8e6df'
				: lit > -0.6
					? '#bfbdb4'
					: '#98968e'
	})
	g.paint(5, 16, 31, 3, (x, y) => {
		const half = Math.sqrt(Math.max(0, 15 * 15 - (y - 17) ** 2))
		return Math.abs(x - 20) <= half ? (x > 28 ? NOSE_SHADE : NOSE) : undefined
	})
	return g.url()
})()

/** Mission control's bunker, low and earthed up, its windows lit. */
export const controlBunker = (() => {
	const g = new Grid(90, 34)
	const WALL = '#b9b3a3'
	const WALL_SHADE = '#9b9585'
	// Its aerials: a mast and a little dish on its roof.
	g.rect(80, 0, 1, 9, '#6e737a')
	g.rect(78, 2, 5, 1, '#6e737a')
	g.disc(14, 6, 3, '#d7dade')
	g.rect(14, 8, 1, 3, '#6e737a')
	// The bunker, its roof slab, walls and the earth banked up its ends.
	g.rect(4, 10, 82, 4, '#cfc9b8')
	g.rect(4, 10, 82, 1, '#e6e0d0')
	g.rect(0, 28, 90, 6, '#8d8670')
	g.rect(2, 20, 4, 8, '#8d8670')
	g.rect(84, 20, 4, 8, '#8d8670')
	g.rect(6, 14, 78, 16, WALL)
	g.rect(6, 28, 78, 2, WALL_SHADE)
	g.rect(6, 14, 78, 1, '#cfc9b8')
	// Its windows, lit, and its door.
	for (let i = 0; i < 5; i++) {
		const x = 12 + i * 12
		g.rect(x, 17, 10, 7, INK)
		g.rect(x + 1, 18, 8, 5, '#ffd76a')
		g.rect(x + 1, 18, 8, 1, '#fff0a8')
	}
	g.rect(72, 22, 9, 12, '#4a4640')
	g.rect(72, 22, 9, 1, WALL_SHADE)
	g.rect(0, 33, 90, 1, '#706a58')
	return g.url()
})()

/** A radar dish, tilted up at the sky on its pedestal. */
export const radarDish = (() => {
	const g = new Grid(36, 46)
	// Pedestal and foot.
	g.rect(16, 28, 5, 12, '#8b8f94')
	g.rect(16, 28, 1, 12, '#b0b4b9')
	g.rect(10, 40, 17, 4, '#6e737a')
	g.rect(10, 40, 17, 1, '#8b8f94')
	// The bowl: half a disc, its face turned up and to the left.
	g.disc(18, 15, 15, (x, y) => {
		const s = x - 18 + (y - 15)
		if (s < 0) return undefined
		if (s < 2.2) return '#f2f4f6'
		return s > 14 ? '#9ba4b0' : s > 7 ? '#c0c6cd' : '#d7dade'
	})
	// Its feed on a strut, out over the bowl.
	g.line(16, 13, 9, 6, '#6e737a')
	g.rect(7, 4, 3, 3, NOSE)
	return g.url()
})()

/** A floodlight tower: a pole, a bank of lamps. */
export const floodlight = (() => {
	const g = new Grid(14, 70)
	g.rect(6, 9, 2, 60, '#8b8f94')
	g.rect(6, 9, 1, 60, '#b0b4b9')
	g.rect(3, 66, 8, 4, '#6e737a')
	g.rect(0, 0, 14, 9, '#6e737a')
	g.rect(0, 0, 14, 1, '#8b8f94')
	for (let i = 0; i < 4; i++) {
		g.rect(1 + i * 3, 2, 2, 2, '#fff3b0')
		g.rect(1 + i * 3, 5, 2, 2, '#ffe27a')
	}
	return g.url()
})()

/** The countdown clock: big orange numbers on a black board. */
export const countdownClock = (() => {
	const g = new Grid(56, 30)
	g.rect(12, 22, 3, 8, '#6e737a')
	g.rect(41, 22, 3, 8, '#6e737a')
	g.rect(0, 0, 56, 22, '#6e737a')
	g.rect(0, 0, 56, 1, '#8b8f94')
	g.rect(2, 2, 52, 18, INK)
	g.text('T-10', 5, 4, 2, '#ff8a1f')
	return g.url()
})()

/** A crowd watching from behind a fence, cheering, their arms up. */
export const spectators = (() => {
	const g = new Grid(80, 22)
	const shirts = [
		'#e04a3a',
		'#3d6fb8',
		'#f6c445',
		'#5fa35c',
		'#ffffff',
		'#9a5fb8',
	]
	const skins = ['#f0c9a0', '#c98f64', '#8a5a3c', '#f0c9a0', '#d9a679']
	const hairs = ['#3a2a1e', '#d8b058', '#1d1d1d', '#8a4a2a', '#c8c8c8']
	;[3, 11, 20, 29, 39, 48, 57, 66, 74].forEach((x, i) => {
		const shirt = shirts[i % shirts.length]
		const skin = skins[(i * 2) % skins.length]
		// Arms up on some, a flag on one.
		if (i % 2 === 0) {
			g.rect(x - 1, 2 + (i % 3), 1, 7, skin)
			g.rect(x + 5, 3 + (i % 2), 1, 7, skin)
		} else g.rect(x + 5, 3, 1, 7, skin)
		if (i === 4) {
			g.rect(x + 5, 0, 1, 4, '#d7dade')
			g.rect(x + 6, 0, 4, 3, BUS_YELLOW)
		}
		g.rect(x, 7, 5, 8, shirt)
		g.rect(x + 4, 8, 1, 7, 'rgba(0,0,0,0.18)')
		g.rect(x, 2, 5, 5, skin)
		g.rect(x, 2, 5, 2, hairs[i % hairs.length])
		g.set(x + 1, 5, INK)
		g.set(x + 3, 5, INK)
	})
	// The fence in front: rails, posts and a mesh.
	g.rect(0, 13, 80, 1, '#aeb4bb')
	g.paint(0, 14, 80, 7, (x, y) =>
		(Math.floor(x) + Math.floor(y)) % 2 === 0 ? '#9aa0a8' : undefined,
	)
	g.rect(0, 20, 80, 1, '#7d8794')
	for (let x = 0; x < 80; x += 16) g.rect(x, 12, 2, 10, '#6e737a')
	g.rect(78, 12, 2, 10, '#6e737a')
	return g.url()
})()

/** Flags on poles: the club's yellow bus, Sweden's, a red one. */
export const flags = (() => {
	const g = new Grid(30, 40)
	const flag = (
		pole: number,
		top: number,
		draw: (x: number, y: number) => void,
	) => {
		g.rect(pole, top, 1, 40 - top, '#8b8f94')
		g.rect(pole - 1, 38, 3, 2, '#6e737a')
		draw(pole + 1, top + 1)
	}
	/** A flag's cloth, 11 by 7, waving a cell up and down. */
	const cloth = (x: number, y: number, fill: string, shade: string) => {
		for (let i = 0; i < 11; i++) {
			const wave = Math.round(Math.sin(i / 2.2))
			g.rect(x + i, y + wave, 1, 6, fill)
			g.set(x + i, y + wave + 5, shade)
		}
		return (i: number) => Math.round(Math.sin(i / 2.2))
	}
	flag(3, 2, (x, y) => cloth(x, y, '#e04a3a', '#b8362c'))
	flag(14, 6, (x, y) => {
		const wave = cloth(x, y, BUS_YELLOW, '#d29a22')
		for (let i = 2; i < 9; i++) g.rect(x + i, y + wave(i) + 2, 1, 2, INK)
		g.set(x + 4, y + wave(4) + 2, BUS_YELLOW)
		g.set(x + 6, y + wave(6) + 2, BUS_YELLOW)
	})
	flag(24, 4, (x, y) => {
		// Only 5 columns fit before the edge: Sweden's, in its corner.
		const wave = cloth(x, y, '#006aa7', '#00507f')
		for (let i = 0; i < 5; i++) {
			g.rect(x + i, y + wave(i) + 2, 1, 2, '#fecc02')
		}
		g.rect(x + 1, y + wave(1), 1, 6, '#fecc02')
	})
	return g.url()
})()

// --- The horizon at the launch site ------------------------------------------

/** A band of 2-px cells, 960 by 160 px, wrapping: `at` is a column, as `x` mod its width. */
const bandGrid = () => new Grid(480, 80)
/** `x` on a circuit of 480 cells, as a fraction of a turn: so sine waves of whole turns wrap. */
const turn = (x: number, times: number, phase = 0) =>
	Math.sin((x / 480) * Math.PI * 2 * times + phase)

/**
 * The launch site's horizon: scrubland, and the sea's edge, a hangar far
 * off. Far: the sea, a low far shore, the huge assembly building on it and
 * a far pad's tower, all hazy. Near: scrub and bushes, and a beach where it
 * dips to the sea.
 */
export const LAUNCH_FAR = (() => {
	const g = bandGrid()
	const SEA = '#9cc0d8'
	const SEA_LIT = '#bcd8e8'
	const SHORE = '#b5c6cc'
	const WALL = '#c9d3d9'
	const WALL_SHADE = '#aebcc6'
	// The sea, with glints on it, and the far shore along its top.
	g.rect(0, 52, 480, 28, SEA)
	const rand = seeded(11)
	for (let i = 0; i < 40; i++)
		g.rect(
			Math.floor(rand() * 470),
			55 + Math.floor(rand() * 24),
			4 + Math.floor(rand() * 5),
			1,
			SEA_LIT,
		)
	for (let x = 0; x < 480; x++)
		g.rect(
			x,
			49 - Math.round(1.4 + turn(x, 5)),
			1,
			4 + Math.round(1.4 + turn(x, 5)),
			SHORE,
		)
	// The assembly building: a huge box, its great door, annexes either side.
	g.rect(238, 34, 24, 15, WALL)
	g.rect(318, 40, 26, 9, WALL)
	g.rect(238, 34, 24, 1, '#e0e8ed')
	g.rect(262, 16, 56, 33, WALL)
	g.rect(262, 16, 56, 2, '#e0e8ed')
	g.rect(302, 18, 16, 31, WALL_SHADE)
	g.rect(284, 26, 12, 23, '#8da0b0')
	g.rect(284, 26, 12, 1, WALL_SHADE)
	for (let y = 20; y < 24; y += 2) g.rect(266, y, 30, 1, WALL_SHADE)
	g.rect(318, 40, 26, 1, '#e0e8ed')
	// A far pad's tower: thin, with crossbars.
	g.rect(400, 24, 1, 25, '#c9a49c')
	g.rect(404, 24, 1, 25, '#b0908a')
	for (let y = 28; y < 49; y += 5) g.rect(400, y, 5, 1, '#c9a49c')
	g.rect(399, 22, 7, 2, '#c9a49c')
	// Another low shed or two along the shore.
	g.rect(70, 44, 12, 5, WALL)
	g.rect(70, 44, 12, 1, '#e0e8ed')
	g.rect(150, 45, 8, 4, WALL_SHADE)
	g.rect(440, 43, 14, 6, WALL)
	g.rect(440, 43, 14, 1, '#e0e8ed')
	return g.url(2)
})()

/** The launch site's near band: scrub over its fill's colour, a beach where it dips to the sea. */
export const LAUNCH_NEAR = (() => {
	const g = bandGrid()
	const FILL = '#8da77a'
	const LIT = '#a4bd8e'
	const BUSH = '#6f8a5c'
	const SAND = '#e0d5a8'
	/** How far down the scrub's top is, in cells, in a column. */
	const dip = (x: number) => {
		const d = Math.min(Math.abs(x - 205), 480 - Math.abs(x - 205))
		return 26 * Math.exp(-((d / 52) ** 2))
	}
	const top = (x: number) =>
		Math.round(34 + 4 * turn(x, 3) + 2.5 * turn(x, 7, 1) + dip(x))
	const rand = seeded(23)
	for (let x = 0; x < 480; x++) {
		const t = top(x)
		const beach = dip(x) > 9
		g.rect(x, t, 1, 80 - t, FILL)
		if (beach) {
			g.rect(x, t, 1, 4, SAND)
			g.set(x, t, '#efe6c0')
		} else g.rect(x, t, 1, 2, LIT)
	}
	// Bushes and dry tufts on its top, clear of the beach.
	for (let i = 0; i < 46; i++) {
		const x = Math.floor(rand() * 470) + 4
		if (dip(x) > 6) continue
		const r = 2 + Math.floor(rand() * 3)
		g.disc(x, top(x) + 1, r, (_, y) =>
			y < top(x) - r * 0.4 ? '#86a56e' : BUSH,
		)
	}
	for (let i = 0; i < 60; i++) {
		const x = Math.floor(rand() * 478)
		if (dip(x) > 6) continue
		g.rect(x, top(x) - 2, 1, 3, '#c8c186')
	}
	// A far fence along the scrub, in the near end.
	for (let x = 330; x < 470; x += 7) g.rect(x, top(x) - 4, 1, 5, '#6b6f73')
	g.rect(330, top(330) - 3, 140, 1, '#9aa0a8')
	// Patches of shade lower down, so it isn't one flat green.
	for (let i = 0; i < 70; i++) {
		const x = Math.floor(rand() * 470)
		const y = top(x) + 8 + Math.floor(rand() * 30)
		if (y < 78) g.rect(x, y, 3 + Math.floor(rand() * 5), 1, '#7b9569')
	}
	return g.url(2)
})()
export const LAUNCH_FILL = '#8da77a'

// --- Space -------------------------------------------------------------------

/** Stars sprinkled over `g`, outside `keep`, `count` of them: mostly specks, a few plus-shaped. */
function stars(
	g: Grid,
	seed: number,
	count: number,
	colours: string[],
	bright: string,
	keep: (x: number, y: number) => boolean = () => false,
) {
	const rand = seeded(seed)
	for (let i = 0; i < count; i++) {
		// Right down to the band's bottom edge, so there's no line where it ends.
		const x = 2 + Math.floor(rand() * (g.width - 4))
		const y = Math.floor(rand() * g.height)
		if (keep(x, y)) continue
		const colour = colours[Math.floor(rand() * colours.length)]
		const big = rand()
		g.set(x, y, colour)
		if (big > 0.9) {
			// A bright one: a plus.
			g.set(x - 1, y, bright)
			g.set(x + 1, y, bright)
			g.set(x, y - 1, bright)
			g.set(x, y + 1, bright)
			g.set(x, y, '#ffffff')
		} else if (big > 0.7) g.set(x + 1, y, colour)
	}
}

/**
 * Space: stars, and far off, the Earth going by, then the planet coming
 * up. Bands of stars, nothing under them but black. The far one has the
 * Earth, small and blue, and a faint nebula.
 */
export const SPACE_FAR = (() => {
	const g = bandGrid()
	const EARTH = { x: 352, y: 40, r: 17 }
	// A nebula: a drifting streak of small puffs, a faint purple, a shade up in its core.
	const puff = seeded(77)
	for (let i = 0; i < 34; i++) {
		const t = i / 33
		const x = 20 + t * 120 + (puff() - 0.5) * 22
		const y = 54 - t * 28 + (puff() - 0.5) * 16
		g.disc(x, y, 3 + puff() * 5, '#16122f')
	}
	for (let i = 0; i < 16; i++) {
		const t = i / 15
		g.disc(
			34 + t * 92 + (puff() - 0.5) * 10,
			48 - t * 22 + (puff() - 0.5) * 8,
			2 + puff() * 3,
			'#1f1949',
		)
	}
	stars(
		g,
		5,
		170,
		['#9fa8d8', '#6b6fb0', '#dfe6ff', '#8a90c8'],
		'#9fa8d8',
		(x, y) => (x - EARTH.x) ** 2 + (y - EARTH.y) ** 2 < (EARTH.r + 4) ** 2,
	)
	// The Earth: ocean, land, cloud, and the dark side down its right.
	g.disc(EARTH.x, EARTH.y, EARTH.r + 1, '#6fa6dc')
	g.disc(EARTH.x, EARTH.y, EARTH.r, (x, y) => {
		const lit = -(x - EARTH.x + (y - EARTH.y)) / (EARTH.r * 1.4)
		const land =
			((x - 346) / 7) ** 2 + ((y - 36) / 5) ** 2 < 1 ||
			((x - 358) / 4) ** 2 + ((y - 46) / 7) ** 2 < 1 ||
			((x - 340) / 3) ** 2 + ((y - 48) / 4) ** 2 < 1
		const cloud =
			(y > 31 && y < 33 && x > 344 && x < 356) ||
			(y > 43 && y < 45 && x > 340 && x < 350) ||
			(y > 52 && y < 54 && x > 350 && x < 360)
		if (cloud) return lit < -0.4 ? '#aeb8d0' : '#e6eef6'
		if (land) return lit > 0.35 ? '#6fb36b' : lit > -0.4 ? '#4f9a58' : '#2f6a46'
		return lit > 0.5
			? '#4a8be0'
			: lit > -0.25
				? '#2c63b5'
				: lit > -0.6
					? '#224d92'
					: '#16306a'
	})
	return g.url(2)
})()

/** Space's near band: more stars, a touch brighter. */
export const SPACE_NEAR = (() => {
	const g = bandGrid()
	stars(g, 17, 130, ['#c7d0ff', '#8a90c8', '#6b6fb0', '#ffe9b0'], '#9fa8d8')
	return g.url(2)
})()

export const SPACE_FILL = '#0b0a1a'

/** Space's nearest band: the brightest, biggest stars, and nothing but space on down under it. */
export const SPACE_NEARER = (() => {
	const g = bandGrid()
	stars(g, 41, 70, ['#e6ebff', '#c7d0ff', '#ffe9b0', '#a8b4f0'], '#c7d0ff')
	// Streaks of dust drifting by, faint dashes. One run of random numbers
	// for all of them: seeding each on its own made them stack in a ladder.
	const dust = seeded(907)
	for (let i = 0; i < 18; i++)
		g.rect(
			Math.floor(dust() * 470),
			Math.floor(dust() * 80),
			5 + Math.floor(dust() * 6),
			1,
			'#2a2552',
		)
	return g.url(2)
})()
export const SPACE_SKY: [string, string] = ['#05040f', '#151233']

// --- Debris ------------------------------------------------------------------

/** A fin, torn off at its root, scorched: the rocket's red. */
export const rocketFin = (() => {
	const g = new Grid(20, 18)
	for (let y = 0; y < 18; y++) {
		const out = Math.round((y * 11) / 17)
		g.rect(out, y, 20 - out - (y > 14 ? 5 : 0), 1, NOSE)
		g.set(out, y, NOSE_LIT)
		g.set(19 - (y > 14 ? 5 : 0), y, NOSE_SHADE)
	}
	g.rect(14, 0, 6, 18, NOSE_SHADE)
	g.rect(14, 2, 1, 14, '#4a1a16')
	g.rect(16, 0, 4, 3, '#2e2a28')
	g.rect(15, 10, 5, 3, '#2e2a28')
	return g.url()
})()

/** A hull panel, a curved plate of white, one end black with the blast and a torn red edge. */
export const rocketPanel = (() => {
	const g = new Grid(22, 12)
	g.rect(0, 1, 22, 10, HULL)
	g.rect(0, 1, 22, 2, HULL_LIT)
	g.rect(0, 8, 22, 3, HULL_SHADE)
	g.rect(0, 10, 22, 1, HULL_DARK)
	g.rect(0, 5, 22, 1, NOSE)
	g.rect(15, 1, 7, 10, '#3a3633')
	g.rect(13, 3, 2, 3, '#3a3633')
	g.rect(12, 8, 3, 2, '#3a3633')
	g.set(21, 4, undefined)
	g.set(21, 8, undefined)
	g.set(0, 1, undefined)
	return g.url()
})()

/** An engine bell, spun off: a dark cone, bright inside its mouth. */
export const rocketNozzle = (() => {
	const g = new Grid(18, 16)
	for (let y = 0; y < 16; y++) {
		const half = 3 + Math.round((y * 6) / 15)
		g.rect(9 - half, y, half * 2, 1, '#6b7280')
		g.set(9 - half, y, '#9ba4b0')
		g.set(9 + half - 1, y, '#3f4550')
		if (y > 11) g.rect(9 - half + 1, y, half * 2 - 2, 1, '#3f4550')
	}
	g.rect(3, 15, 12, 1, '#2e323b')
	g.rect(4, 0, 10, 2, '#5a606b')
	g.rect(5, 0, 8, 1, '#9ba4b0')
	return g.url()
})()

/** A satellite, its solar panels out, a dish on its side. */
export const satellite = (() => {
	const g = new Grid(48, 20)
	const PANEL = '#2f5fae'
	const PANEL_LIT = '#5d8fe0'
	for (const x of [0, 31]) {
		g.rect(x, 4, 17, 11, PANEL)
		g.rect(x, 4, 17, 1, PANEL_LIT)
		for (let i = 0; i < 17; i += 4) g.rect(x + i, 4, 1, 11, '#1c3a78')
		g.rect(x, 9, 17, 1, '#1c3a78')
	}
	g.rect(17, 9, 14, 2, '#9ba4b0')
	// Its gold body, lit from above.
	g.rect(18, 5, 12, 9, '#c8b75a')
	g.rect(18, 5, 12, 2, '#e8d98a')
	g.rect(18, 12, 12, 2, '#9a8a3a')
	g.rect(21, 8, 6, 2, '#6b6040')
	// Its dish, up on a stalk.
	g.rect(23, 1, 1, 4, '#9ba4b0')
	g.disc(24, 1.5, 2.5, '#d7dade')
	g.set(24, 17, '#9ba4b0')
	g.rect(23, 14, 2, 3, '#9ba4b0')
	return g.url()
})()

// --- Asteroids ---------------------------------------------------------------

const ROCK = '#8a7f72'
const ROCK_LIT = '#b0a597'
const ROCK_SHADE = '#6a6054'
const ROCK_DARK = '#4d453d'
const ROCK_PIT = '#5a5046'

/**
 * One rock, `size` cells across, turned `quarter` quarter turns: its shape
 * and craters turn with it, but the light stays up on the left, so it
 * tumbles and the lit side stays lit.
 */
function rock(
	size: number,
	quarter: number,
	craters: [number, number, number][],
) {
	const g = new Grid(size, size)
	const c = size / 2
	const r0 = c - 1.2
	const cos = [1, 0, -1, 0][quarter]
	const sin = [0, 1, 0, -1][quarter]
	/** A screen offset, back to the rock's own. */
	const own = (dx: number, dy: number): [number, number] => [
		dx * cos + dy * sin,
		-dx * sin + dy * cos,
	]
	/** A rock's offset, to where it is on the screen. */
	const shown = (qx: number, qy: number): [number, number] => [
		qx * cos - qy * sin,
		qx * sin + qy * cos,
	]
	g.paint(0, 0, size, size, (x, y) => {
		const dx = x - c
		const dy = y - c
		const [qx, qy] = own(dx, dy)
		const a = Math.atan2(qy, qx)
		const reach =
			r0 *
			(0.84 +
				0.09 * Math.sin(2 * a + 1.3) +
				0.05 * Math.sin(3 * a + 0.4) +
				0.03 * Math.sin(5 * a))
		if (Math.hypot(dx, dy) > reach) return undefined
		const lit = -(dx + dy) / (1.41 * r0)
		// Craters: a dark floor, its far lip in shadow and its near one lit.
		for (const [cx, cy, cr] of craters) {
			const [sx, sy] = shown(cx * r0, cy * r0)
			const ox = dx - sx
			const oy = dy - sy
			const d = Math.hypot(ox, oy)
			if (d < cr) return ox + oy < -cr * 0.25 ? ROCK_DARK : ROCK_PIT
			if (d < cr + 1.1 && ox + oy > 0) return ROCK_LIT
		}
		// A little speckle that turns with the rock.
		const speck = Math.abs(Math.floor(qx) * 7 + Math.floor(qy) * 13) % 11 === 0
		const tone =
			lit > 0.45
				? ROCK_LIT
				: lit > -0.1
					? ROCK
					: lit > -0.55
						? ROCK_SHADE
						: ROCK_DARK
		return speck && tone === ROCK ? ROCK_SHADE : tone
	})
	return g.url()
}

/** An asteroid, a quarter turn at a time: small, and big. Grey-brown and cratered. */
export const ASTEROID_ART = {
	small: [0, 1, 2, 3].map((i) =>
		rock(18, i, [
			[-0.25, -0.2, 2.2],
			[0.35, 0.3, 1.8],
		]),
	),
	big: [0, 1, 2, 3].map((i) =>
		rock(34, i, [
			[-0.3, -0.25, 4.2],
			[0.4, 0.25, 3.4],
			[-0.1, 0.5, 2.4],
			[0.25, -0.5, 2.2],
		]),
	),
}

// --- The pad's ground --------------------------------------------------------

/**
 * The slabs the path is: poured concrete, an expansion joint every 120 px
 * across and every 48 down (a dark seam with a lit edge), a hairline crack,
 * scorch marks where the engines have been, and a few faded hazard dashes
 * painted along it. See-through, over `#c9c4b4`.
 */
export const PAD_PATH = (() => {
	const W = 240
	const H = 48
	const t = tile(W, H)
	const rand = seeded(2231)
	const JOINT = 'rgba(70, 62, 50, 0.22)'
	const EDGE = 'rgba(255, 255, 255, 0.28)'
	const SCORCH = 'rgba(48, 36, 28, 0.1)'
	const SCORCH_DARK = 'rgba(48, 36, 28, 0.16)'
	const GRIT = 'rgba(70, 62, 50, 0.14)'
	const PAINT = 'rgba(246, 196, 69, 0.5)'
	// Joints between the slabs, and a light edge beside each.
	for (const x of [0, 120]) {
		t.rect(x, 0, 2, H, JOINT)
		t.rect(x + 2, 0, 2, H, EDGE)
	}
	t.rect(0, 0, W, 2, JOINT)
	t.rect(0, 2, W, 2, EDGE)
	// Scorch marks, soft smudges of a few rows, darker in their middle.
	for (const [x, y, w] of [
		[40, 14, 30],
		[168, 26, 24],
		[86, 34, 18],
	]) {
		t.rect(x, y, w, 2, SCORCH)
		t.rect(x + 4, y + 2, w - 8, 2, SCORCH_DARK)
		t.rect(x + 2, y + 4, w - 6, 2, SCORCH)
		t.rect(x + 8, y - 2, w - 16, 2, SCORCH)
	}
	// A hairline crack, stepped.
	for (let i = 0; i < 9; i++) t.rect(190 + i * 4, 8 + (i % 3) * 2, 4, 2, GRIT)
	// A few dashes of hazard paint, worn.
	for (let i = 0; i < 4; i++) t.rect(132 + i * 14, 40, 8, 2, PAINT)
	// Grit.
	for (let n = 0; n < 14; n++)
		t.rect(
			Math.round((rand() * (W - 8)) / 2) * 2 + 4,
			Math.round((rand() * (H - 8)) / 2) * 2 + 4,
			2,
			2,
			rand() < 0.5 ? GRIT : EDGE,
		)
	return t.pattern('rl-pad-path')
})()

/**
 * The slab's cut edge, under the path: bands of poured layers, rusty
 * rebar ends along it, flecks of stone, and the joints carried down from the
 * top. Subtle; see-through, over `#6f6a5e`.
 */
export const PAD_UNDER = (() => {
	const W = 240
	const H = 24
	const t = tile(W, H)
	const rand = seeded(4417)
	const LAYER = 'rgba(30, 26, 20, 0.16)'
	const LIT = 'rgba(255, 255, 255, 0.1)'
	const REBAR = 'rgba(150, 82, 46, 0.45)'
	const STONE = 'rgba(30, 26, 20, 0.12)'
	// Layers: a seam or two, each with a faint light line under it.
	t.rect(0, 8, W, 2, LAYER)
	t.rect(0, 10, W, 2, LIT)
	t.rect(0, 18, W, 2, LAYER)
	// Rebar ends, in a row, every 20 px, with a stain run down from each.
	for (let x = 10; x < W; x += 20) {
		t.rect(x, 12, 4, 4, REBAR)
		t.rect(x, 12, 4, 2, 'rgba(210, 130, 80, 0.3)')
		t.rect(x + 1, 16, 2, 4, 'rgba(150, 82, 46, 0.16)')
	}
	// The joints, carried down.
	for (const x of [0, 120]) {
		t.rect(x, 0, 2, H, LAYER)
		t.rect(x + 2, 0, 2, H, LIT)
	}
	// Flecks of stone in the concrete.
	for (let n = 0; n < 26; n++)
		t.rect(
			Math.round((rand() * (W - 4)) / 2) * 2,
			Math.round((rand() * (H - 2)) / 2) * 2,
			2,
			2,
			rand() < 0.6 ? STONE : LIT,
		)
	return t.pattern('rl-pad-under')
})()

// --- More of the launch site -------------------------------------------------

/** A grandstand: tiers of benches under a striped roof, the crowd on them waving. */
export const viewingStand = (() => {
	const g = new Grid(70, 30)
	const FRAME = '#6e737a'
	const BENCH = ['#aeb4bb', '#98a0a8', '#838b94']
	const shirts = [
		'#e04a3a',
		'#3d6fb8',
		'#f6c445',
		'#5fa35c',
		'#ffffff',
		'#9a5fb8',
	]
	const skins = ['#f0c9a0', '#c98f64', '#8a5a3c', '#d9a679']
	const hairs = ['#3a2a1e', '#d8b058', '#1d1d1d', '#8a4a2a']
	// Its posts, behind everyone.
	for (const x of [2, 66])
		g.rect(x, 4, 2, 24, FRAME)
		// The tiers, back to front: the crowd on each, then the bench in front of its feet.
	;[12, 18, 24].forEach((top, tier) => {
		for (let k = 0; k < 11; k++) {
			const x = 5 + k * 6 + (tier % 2) * 3
			if (x > 62) continue
			const i = k + tier * 4
			const skin = skins[i % skins.length]
			const shirt = shirts[(i * 5) % shirts.length]
			if (i % 2 === 0) g.rect(x + 3, top - 9, 1, 5, skin)
			if (i % 3 === 0) g.rect(x - 1, top - 8, 1, 4, skin)
			g.rect(x, top - 5, 3, 4, shirt)
			g.rect(x, top - 8, 3, 3, skin)
			g.rect(x, top - 8, 3, 1, hairs[i % hairs.length])
			g.set(x + 1, top - 6, INK)
		}
		g.rect(2, top - 1, 66, 6, BENCH[tier])
		g.rect(2, top - 1, 66, 1, '#d7dade')
	})
	// Its front: a banner in the club's yellow, and its foot.
	g.rect(2, 26, 66, 3, '#27406b')
	for (let x = 4; x < 66; x += 8) g.rect(x, 27, 4, 1, BUS_YELLOW)
	g.rect(0, 29, 70, 1, '#4d535c')
	// Its roof: red and white panels, its edge shaded.
	g.rect(0, 0, 70, 4, '#ffffff')
	for (let x = 0; x < 70; x += 10) g.rect(x, 0, 5, 4, NOSE)
	g.rect(0, 3, 70, 1, '#9ba4b0')
	g.rect(0, 0, 70, 1, '#f4f4f4')
	for (let x = 0; x < 70; x += 10) g.set(x, 0, NOSE_LIT)
	return g.url()
})()

/** The centre's sign: "SCOOP SPACE CENTRE" in white and yellow on a navy board, on two posts. */
export const launchSign = (() => {
	const g = new Grid(74, 32)
	const BOARD = '#27406b'
	// Its posts, and the board over them.
	for (const x of [8, 63]) {
		g.rect(x, 20, 3, 12, '#6e737a')
		g.rect(x, 20, 1, 12, '#9ba4b0')
	}
	g.rect(0, 0, 74, 22, '#d7dade')
	g.rect(1, 1, 72, 20, BOARD)
	g.rect(1, 1, 72, 1, '#3d5c94')
	g.rect(0, 21, 74, 1, '#9ba4b0')
	// SCOOP SPACE over CENTRE, a rocket and stars beside it.
	g.text('SCOOP SPACE', 4, 3, 1, '#ffffff')
	g.text('CENTRE', 4, 12, 1, BUS_YELLOW)
	g.rect(51, 12, 1, 7, HULL)
	g.rect(52, 13, 1, 5, HULL)
	g.rect(51, 11, 1, 1, NOSE)
	g.rect(50, 17, 1, 2, NOSE)
	g.rect(53, 17, 1, 2, NOSE)
	g.rect(52, 19, 1, 1, '#ff8a1f')
	for (const [x, y] of [
		[58, 14],
		[62, 17],
		[67, 13],
		[70, 18],
	])
		g.set(x, y, '#9fa8d8')
	return g.url()
})()

/** A fuel truck, facing right: a white tank with a red band and FUEL on it, a hose on its back. */
export const fuelTruck = (() => {
	const g = new Grid(50, 22)
	const TYRE = '#2b2722'
	// Its tank: lit along the top, shaded under, and its end caps.
	g.rect(2, 3, 34, 12, HULL)
	g.rect(3, 2, 32, 1, HULL_LIT)
	g.rect(2, 3, 34, 2, HULL_LIT)
	g.rect(2, 11, 34, 4, HULL_SHADE)
	g.rect(2, 14, 34, 1, HULL_DARK)
	g.rect(2, 3, 1, 12, HULL_SHADE)
	g.rect(35, 3, 1, 12, HULL_DARK)
	// Its red band, and FUEL on it.
	g.rect(2, 5, 34, 9, NOSE)
	g.rect(2, 5, 34, 1, NOSE_LIT)
	g.rect(2, 13, 34, 1, NOSE_SHADE)
	g.text('FUEL', 7, 6, 1, '#ffffff')
	// A hatch and a hose coiled on its back.
	g.rect(10, 0, 6, 2, METAL)
	g.rect(10, 0, 6, 1, '#9ba4b0')
	g.rect(24, 1, 8, 2, '#2e323b')
	g.rect(26, 0, 4, 1, '#2e323b')
	// Its cab: yellow, a window, a bumper.
	g.rect(37, 6, 11, 11, BUS_YELLOW)
	g.rect(37, 6, 11, 1, '#ffe27a')
	g.rect(37, 14, 11, 3, '#d29a22')
	g.rect(40, 7, 7, 4, GLASS)
	g.rect(40, 7, 7, 1, GLASS_LIT)
	g.rect(36, 7, 1, 9, '#d29a22')
	g.rect(47, 15, 3, 2, '#2e323b')
	g.set(48, 12, LAMP)
	// Its chassis, and the wheels.
	g.rect(1, 15, 48, 2, '#3f4550')
	for (const x of [8, 17, 41]) {
		g.disc(x, 18.2, 3.2, TYRE)
		g.disc(x, 18.2, 1.2, '#9ba4b0')
	}
	return g.url()
})()

/** A water tower, there for the deluge under the engines: a tank on a cone roof, braced legs. */
export const waterTower = (() => {
	const g = new Grid(24, 60)
	const LEG = '#5f6772'
	// Its legs, splayed, with a ring of bracing; the far one darker.
	g.line(5, 22, 2, 59, LEG)
	g.line(6, 22, 3, 59, LEG)
	g.line(18, 22, 21, 59, '#4d535c')
	g.line(17, 22, 20, 59, '#4d535c')
	g.line(12, 22, 12, 59, '#7d8794')
	for (const y of [34, 46]) {
		const i = (y - 22) / 37
		g.rect(Math.round(5 - 3 * i), y, Math.round(14 + 6 * i), 1, '#4d535c')
		g.line(Math.round(5 - 3 * i), y, 12, y + 12, '#4d535c')
	}
	// Its tank: a drum, lit on the left, riveted bands, a red stripe, SSC.
	g.rect(2, 8, 20, 14, '#e8ecef')
	g.rect(2, 8, 4, 14, '#ffffff')
	g.rect(16, 8, 6, 14, HULL_SHADE)
	g.rect(20, 8, 2, 14, HULL_DARK)
	g.rect(2, 21, 20, 1, HULL_DARK)
	for (const y of [10, 19]) g.rect(2, y, 20, 1, HULL_SHADE)
	g.text('SSC', 3, 12, 1, NAVY)
	// Its roof, a cone, a finial.
	for (let y = 0; y < 8; y++) {
		const half = 3 + Math.round((y * 8) / 7)
		g.rect(12 - half, y, half * 2, 1, NOSE)
		g.set(12 - half, y, NOSE_LIT)
		g.set(11 + half, y, NOSE_SHADE)
	}
	g.rect(11, 0, 2, 2, NOSE_SHADE)
	// A ladder up the near leg.
	g.rect(6, 24, 1, 14, '#9ba4b0')
	return g.url()
})()

// --- More of space -----------------------------------------------------------

const SOLAR = '#2f5fae'
const SOLAR_LIT = '#5d8fe0'
const SOLAR_DARK = '#1c3a78'

/** A solar panel `w` by `h` cells at `x`, `y`: cells ruled, lit along its top. */
function solar(g: Grid, x: number, y: number, w: number, h: number) {
	g.rect(x, y, w, h, SOLAR)
	g.rect(x, y, w, 1, SOLAR_LIT)
	for (let i = 4; i < w; i += 4) g.rect(x + i, y, 1, h, SOLAR_DARK)
	g.rect(x, y + Math.floor(h / 2), w, 1, SOLAR_DARK)
	g.rect(x, y + h - 1, w, 1, SOLAR_DARK)
}

/** A space station, far off: a long truss, modules across its middle, solar arrays at each end. */
export const spaceStation = (() => {
	const g = new Grid(90, 36)
	// Its truss, and the masts the arrays hang from.
	g.rect(6, 17, 78, 2, METAL)
	g.rect(6, 17, 78, 1, '#9ba4b0')
	for (const x of [16, 74]) g.rect(x, 2, 1, 32, METAL)
	// Its arrays, a pair of panels either side of each mast, top and bottom.
	for (const x of [5, 17, 63, 75])
		for (const y of [2, 22]) solar(g, x, y, 10, 12)
	// The tall module crossing its middle, a cupola on top, radiators.
	g.rect(41, 6, 8, 26, HULL)
	g.rect(41, 6, 2, 26, HULL_LIT)
	g.rect(47, 6, 2, 26, HULL_SHADE)
	g.disc(45, 5, 3, GLASS)
	g.rect(43, 3, 2, 2, GLASS_LIT)
	for (const y of [24, 28]) g.rect(41, y, 8, 1, HULL_SHADE)
	g.rect(51, 4, 7, 8, HULL)
	for (const y of [6, 8, 10]) g.rect(51, y, 7, 1, HULL_SHADE)
	g.rect(51, 4, 7, 1, HULL_LIT)
	g.rect(49, 8, 2, 1, METAL)
	// The long module along it, ends capped, a gold one at the left.
	g.rect(30, 13, 30, 10, HULL)
	g.rect(30, 13, 30, 2, HULL_LIT)
	g.rect(30, 20, 30, 3, HULL_SHADE)
	g.rect(30, 22, 30, 1, HULL_DARK)
	for (const x of [40, 50]) g.rect(x, 13, 1, 10, HULL_SHADE)
	g.rect(28, 14, 2, 8, METAL)
	g.rect(60, 14, 2, 8, METAL)
	g.rect(30, 16, 10, 4, '#c8b75a')
	g.rect(30, 16, 10, 1, '#e8d98a')
	// Windows and a dish.
	for (const x of [32, 52, 55]) g.rect(x, 17, 2, 1, '#ffd76a')
	g.line(36, 12, 33, 7, METAL)
	g.disc(32, 6, 2.2, '#d7dade')
	// Lights at the truss ends.
	g.set(6, 17, NOSE_LIT)
	g.set(83, 17, '#6fe08a')
	return g.url()
})()

/** A comet: an icy head, a dust tail sweeping off to the left, a thin blue one beside it. */
export const comet = (() => {
	const g = new Grid(60, 14)
	const rand = seeded(5309)
	// Its dust tail, fanning out and thinning, in cooling tones.
	for (let x = 0; x < 52; x++) {
		const near = x / 52
		const half = 1.2 + (1 - near) * 4.2
		const keep = 0.25 + 0.75 * near ** 1.3
		for (let y = 7 - Math.ceil(half); y <= 7 + Math.ceil(half); y++) {
			if (Math.abs(y - 6.5) > half || rand() > keep) continue
			g.set(
				x,
				y,
				near > 0.75
					? '#fff1d0'
					: near > 0.45
						? '#e8c890'
						: near > 0.2
							? '#a8845c'
							: '#6a5440',
			)
		}
	}
	// Its ion tail, a thin straight line of blue, in dashes.
	for (let x = 0; x < 50; x += 1)
		if (x % 7 !== 6) g.set(x, 4, x > 25 ? '#8fd8ff' : '#4a98cf')
	// Its head: ice, lit on the left, a pit or two.
	g.disc(53, 7, 4.2, (x, y) => {
		const lit = -(x - 53 + (y - 7)) / 6
		return lit > 0.4 ? '#ffffff' : lit > -0.2 ? '#dff4ff' : '#9fc4e0'
	})
	g.rect(52, 8, 2, 1, '#7aa0c0')
	g.set(55, 6, '#7aa0c0')
	return g.url()
})()

/** Things someone lost overboard: a glove, a spanner, a packet of space food. */
export const astronautJunk = (() => {
	const g = new Grid(30, 16)
	// A glove, a white mitt with a thumb, the blue cuff ring at its wrist.
	g.rect(2, 3, 6, 6, '#eef0f2')
	g.rect(2, 3, 6, 1, '#ffffff')
	g.rect(2, 8, 6, 1, '#c4cad2')
	g.rect(4, 1, 1, 2, '#eef0f2')
	g.rect(5, 1, 1, 2, '#c4cad2')
	g.rect(0, 5, 2, 3, '#eef0f2')
	g.rect(0, 7, 2, 1, '#c4cad2')
	g.rect(3, 9, 5, 2, NAVY)
	g.rect(3, 9, 5, 1, '#3d5c94')
	g.rect(3, 11, 5, 1, '#9ba4b0')
	// A spanner, tumbling: a long steel shaft, an open jaw at one end.
	g.line(13, 12, 22, 3, '#9ba4b0')
	g.line(14, 12, 23, 3, '#7d8794')
	g.rect(11, 12, 4, 3, '#9ba4b0')
	for (let j = 0; j < 2; j++)
		for (let i = 0; i < 2; i++) g.set(12 + i, 13 + j, undefined)
	g.rect(22, 0, 4, 4, '#9ba4b0')
	for (let j = 0; j < 2; j++)
		for (let i = 0; i < 2; i++) g.set(23 + i, 0 + j, undefined)
	// A packet of food: silver foil, an orange label, a torn corner.
	g.rect(20, 8, 9, 7, '#c0c6cd')
	g.rect(20, 8, 9, 1, '#f2f4f6')
	g.rect(20, 14, 9, 1, '#8d95a0')
	g.rect(22, 10, 5, 3, '#ff8a1f')
	g.rect(23, 11, 3, 1, '#ffe27a')
	g.set(28, 8, undefined)
	g.set(29, 15, undefined)
	return g.url()
})()

/** A small ringed gas planet, far off: banded tan, the ring tilted over it. */
export const ringedPlanet = (() => {
	const g = new Grid(40, 24)
	const CX = 20
	const CY = 12
	/** Where in the ring a cell is: 0 its middle to 1 its outer edge, and which side of its plane. */
	const ring = (x: number, y: number) => {
		const dx = x - CX
		const dy = y - CY + dx * 0.18
		return { d: Math.hypot(dx / 19, dy / 4.4), side: dy }
	}
	const ringTone = (x: number, y: number) => {
		const { d } = ring(x, y)
		if (d > 1 || d < 0.62) return undefined
		if (d > 0.8 && d < 0.86) return undefined
		return d > 0.86 ? '#e8d3a0' : '#b8a070'
	}
	// The back of its ring, then the planet, then the front over it.
	g.paint(0, 0, 40, 24, (x, y) =>
		ring(x, y).side < 0 ? ringTone(x, y) : undefined,
	)
	g.disc(CX, CY, 7.5, (x, y) => {
		const lit = -(x - CX + (y - CY)) / 10.5
		const band = Math.floor((y - CY + 8) / 2) % 3
		const base = ['#d9a066', '#e8bd88', '#c0844a'][band]
		return lit < -0.45
			? '#8a5a38'
			: lit < -0.1
				? ['#b8844c', '#c89a62', '#a06c3c'][band]
				: base
	})
	g.paint(0, 0, 40, 24, (x, y) =>
		ring(x, y).side >= 0 ? ringTone(x, y) : undefined,
	)
	return g.url()
})()

/** A little space probe: a gold box, a dish on one side, a boom and long antennae. */
export const probe = (() => {
	const g = new Grid(24, 20)
	// Antennae, long and thin, and the boom out the back.
	g.line(12, 8, 20, 0, '#9ba4b0')
	g.rect(20, 0, 2, 1, '#d7dade')
	g.line(14, 8, 23, 4, '#7d8794')
	g.rect(0, 14, 7, 1, '#7d8794')
	g.rect(0, 13, 2, 3, '#d7dade')
	// The body: gold foil, lit above.
	g.rect(8, 8, 9, 8, '#c8b75a')
	g.rect(8, 8, 9, 2, '#e8d98a')
	g.rect(8, 14, 9, 2, '#9a8a3a')
	g.rect(9, 11, 3, 2, '#6b6040')
	g.rect(14, 11, 2, 2, '#ffd23f')
	// Its dish, up on a stalk, turned up and to the left.
	g.rect(8, 15, 2, 3, '#9ba4b0')
	g.disc(7, 5, 5, (x, y) => {
		const s = x - 7 + (y - 5)
		if (s < -1) return undefined
		return s < 1.5 ? '#f2f4f6' : s > 5 ? '#9ba4b0' : '#c0c6cd'
	})
	g.line(8, 7, 11, 9, '#6e737a')
	g.set(5, 3, NOSE)
	// A small panel on a strut.
	g.rect(17, 11, 2, 1, '#7d8794')
	solar(g, 18, 12, 6, 6)
	return g.url()
})()
