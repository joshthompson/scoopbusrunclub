import { type PixelRect, pixelCircle, pixelPolygon, svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * What's behind Kristineberg's stadium, further back than the flats, drawn
 * in code: the city far off, hazy blue, a tower or two and a crane over its
 * roofs; and a line of trees between the flats and the grass bank. Each a
 * strip, repeated along the backdrop (see `StadiumBackdrop`), in 2 px cells
 * as the rest of the stadium is.
 */

const rects = (list: PixelRect[]) =>
	list
		.map(
			([x, y, w, h, fill]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
		)
		.join('')

// --- The city, far off ------------------------------------------------------

export const SKYLINE_WIDTH = 1800
export const SKYLINE_HEIGHT = 190

/** Hazy, far off: the sky's blue in all of it. */
const HAZE = {
	wall: '#a9cfdc',
	lit: '#bfdfe8',
	shade: '#97c1d0',
	window: '#93bccb',
	roof: '#8fb6c6',
	gold: '#d6d39a',
	steel: '#8eb3c2',
}

/** The far city: blocks of flats and offices, a town hall's tower, a TV mast, a church, two cranes. */
export const skyline = (() => {
	const random = seeded(7124)
	const H = SKYLINE_HEIGHT
	const out: PixelRect[] = []
	let markup = ''
	const even = (n: number) => Math.round(n / 2) * 2
	/** A block, `w` across and `h` high, from `x`: windows in rows, its right side in shade. */
	const block = (x: number, w: number, h: number) => {
		out.push([x, H - h, w, h, HAZE.wall])
		out.push([x, H - h, 2, h, HAZE.lit])
		out.push([x + w - 4, H - h, 4, h, HAZE.shade])
		out.push([x, H - h, w, 2, HAZE.roof])
		for (let wy = H - h + 6; wy < H - 6; wy += 8)
			for (let wx = x + 6; wx < x + w - 8; wx += 8)
				out.push([wx, wy, 4, 4, HAZE.window])
	}
	// Blocks all along, of different heights, with gaps between some.
	for (let x = 0; x < SKYLINE_WIDTH - 40; ) {
		const w = even(40 + random() * 70)
		const h = even(50 + random() * 80)
		if (x + w > SKYLINE_WIDTH - 10) break
		block(x, w, h)
		x += w + (random() < 0.35 ? even(10 + random() * 40) : 0)
	}
	// A town hall's tower, square and tall, a lantern on top, and three gold crowns.
	const hall = 380
	out.push([hall - 30, H - 70, 90, 70, HAZE.wall])
	out.push([hall - 30, H - 72, 90, 2, HAZE.roof])
	out.push([hall, H - 160, 26, 160, HAZE.wall])
	out.push([hall, H - 160, 4, 160, HAZE.lit])
	out.push([hall + 22, H - 160, 4, 160, HAZE.shade])
	for (let y = H - 150; y < H - 80; y += 14)
		out.push([hall + 10, y, 6, 8, HAZE.window])
	out.push([hall + 6, H - 172, 14, 12, HAZE.shade])
	out.push([hall + 10, H - 180, 6, 8, HAZE.roof])
	out.push([hall + 8, H - 186, 2, 4, HAZE.gold])
	out.push([hall + 12, H - 188, 2, 6, HAZE.gold])
	out.push([hall + 16, H - 186, 2, 4, HAZE.gold])
	// A TV mast, thin and tall, its cabin near the top.
	const mast = 1060
	out.push([mast, H - 176, 6, 176, HAZE.steel])
	out.push([mast - 6, H - 150, 18, 16, HAZE.steel])
	out.push([mast - 6, H - 146, 18, 4, HAZE.window])
	out.push([mast + 2, H - 188, 2, 12, HAZE.steel])
	// A church, its spire.
	const church = 1460
	out.push([church, H - 80, 44, 80, HAZE.wall])
	out.push([church + 40, H - 80, 4, 80, HAZE.shade])
	markup += pixelPolygon(
		[
			[church + 10, H - 80],
			[church + 22, H - 150],
			[church + 34, H - 80],
		],
		HAZE.roof,
	)
	out.push([church + 21, H - 160, 2, 10, HAZE.gold])
	// Cranes over the roofs: a lattice tower, its jib out, a weight on its back end.
	for (const [cx, ch, jib] of [
		[760, 150, 90],
		[1640, 130, 70],
	]) {
		out.push([cx, H - ch, 4, ch, HAZE.steel])
		for (let y = H - ch + 6; y < H; y += 10)
			out.push([cx - 2, y, 8, 2, HAZE.steel])
		out.push([cx - 30, H - ch, jib + 30, 4, HAZE.steel])
		out.push([cx - 30, H - ch + 4, 12, 6, HAZE.shade])
		out.push([cx - 2, H - ch - 10, 8, 10, HAZE.steel])
		out.push([cx + jib - 24, H - ch + 4, 2, 30, HAZE.steel])
	}
	return svgUrl(SKYLINE_WIDTH, H, rects(out) + markup)
})()

// --- Trees, between the flats and the grass bank ------------------------------

export const TREELINE_WIDTH = 1300
export const TREELINE_HEIGHT = 80

const LEAVES = ['#5d9446', '#6aa64f', '#548a3f']
const LEAVES_LIT = '#86bd62'
const TRUNK = '#5b4630'

/** A line of trees, bunched up, some taller, with gaps to see the flats through. */
export const treeline = (() => {
	const random = seeded(3391)
	const H = TREELINE_HEIGHT
	let markup = ''
	const trunks: PixelRect[] = []
	for (let x = 10; x < TREELINE_WIDTH - 40; ) {
		// A clump of a few, then a gap.
		const clump = 2 + Math.floor(random() * 4)
		for (let i = 0; i < clump && x < TREELINE_WIDTH - 40; i++) {
			const r = 2 * Math.round(7 + random() * 8)
			const trunk = 6 + Math.round(random() * 8)
			const cy = H - trunk - r
			const leaves = LEAVES[Math.floor(random() * LEAVES.length)]
			trunks.push([x + r - 2, cy, 4, H - cy, TRUNK])
			markup += pixelCircle(x + r, cy, r, leaves)
			// Lit from above, on its left.
			markup += pixelCircle(x + r - r / 3, cy - r / 3, r / 2.2, LEAVES_LIT)
			x += 2 * Math.round(r * (0.9 + random() * 0.5))
		}
		x += 2 * Math.round(30 + random() * 90)
	}
	return svgUrl(TREELINE_WIDTH, H, rects(trunks) + markup)
})()
