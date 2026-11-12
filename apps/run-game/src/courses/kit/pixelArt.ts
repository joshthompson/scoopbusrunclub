/** A rect of pixel art: [x, y, width, height, colour]. */
export type PixelRect = [number, number, number, number, string]

/**
 * Pixel art drawn in code, as an image's URL: `width` by `height` cells, a
 * pixel each, for a course's scenery without a file of its own. Drawn
 * bigger with `scale`, it stays crisp.
 */
export function pixelArt(width: number, height: number, rects: PixelRect[]) {
	const body = rects
		.map(
			([x, y, w, h, fill]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
		)
		.join('')
	return svgUrl(width, height, body)
}

/** An SVG's markup, `width` by `height`, as an image's URL. */
export function svgUrl(width: number, height: number, body: string) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${body}</svg>`
	// Its brackets and quotes too, which `encodeURIComponent` leaves: as a
	// frame it goes in an unquoted CSS `url()`, which a bracket ends.
	return `data:image/svg+xml,${encodeURIComponent(svg).replace(
		/[()'!*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	)}`
}

/**
 * A pattern, drawn: its rects wrapped round wherever they go off its edges,
 * so it tiles. As a `<pattern>` for the Ground to fill with; or tiled out
 * over a bit of the world, for a picture of its own to line up with it.
 */
export function tile(width: number, height: number) {
	const rects: PixelRect[] = []
	const rect = (x: number, y: number, w: number, h: number, fill: string) => {
		for (const dx of x + w > width ? [0, -width] : x < 0 ? [0, width] : [0])
			for (const dy of y + h > height ? [0, -height] : [0])
				rects.push([x + dx, y + dy, w, h, fill])
	}
	return {
		rect,
		pattern: (id: string) =>
			`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${width}" height="${height}">${rectsMarkup(rects)}</pattern>`,
		/** As an image's URL, for a CSS background to repeat. */
		url: () => svgUrl(width, height, rectsMarkup(rects)),
		/**
		 * Its rects over `left` to `right`, `top` to `bottom`, tiled out from
		 * 0, 0 as the Ground's is, each cut to its tile as a pattern's are.
		 */
		over(left: number, top: number, right: number, bottom: number) {
			const out: PixelRect[] = []
			for (let tx = Math.floor(left / width) * width; tx < right; tx += width)
				for (
					let ty = Math.floor(top / height) * height;
					ty < bottom;
					ty += height
				)
					for (const [x, y, w, h, fill] of rects) {
						const x0 = Math.max(tx + Math.max(0, x), left)
						const y0 = Math.max(ty + Math.max(0, y), top)
						const x1 = Math.min(tx + Math.min(width, x + w), right)
						const y1 = Math.min(ty + Math.min(height, y + h), bottom)
						if (x1 > x0 && y1 > y0) out.push([x0, y0, x1 - x0, y1 - y0, fill])
					}
			return out
		},
	}
}

/** Letters, 5 cells by 7, a row of them a line: `#` lit. */
const GLYPHS: Record<string, string[]> = {
	A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
	B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
	C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
	D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
	E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
	F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
	G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
	H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
	I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
	J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
	K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
	L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
	M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
	N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
	O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
	P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
	Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
	R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
	S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
	T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
	U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
	V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
	W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
	X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
	Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
	Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
	Å: ['..#..', '.###.', '#...#', '#####', '#...#', '#...#', '#...#'],
	Ä: ['#...#', '.###.', '#...#', '#####', '#...#', '#...#', '#...#'],
	Ö: ['#...#', '.###.', '#...#', '#...#', '#...#', '#...#', '.###.'],
	'0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
	'1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
	'2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
	'3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
	'4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
	'5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
	'6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
	'7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
	'8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
	'9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
	'→': ['.....', '..#..', '...#.', '#####', '...#.', '..#..', '.....'],
	'←': ['.....', '..#..', '.#...', '#####', '.#...', '..#..', '.....'],
	'↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '..#..'],
	'↓': ['..#..', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],
	'/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
	'-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
	'!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
	'.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
	' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
}

/** How wide `text` is in pixel letters, `cell` px a cell, a cell between letters. */
export const pixelTextWidth = (text: string, cell: number) =>
	Math.max(0, [...text].length * 6 - 1) * cell

/**
 * `text` in pixel letters, 7 cells tall, `cell` px a cell, its top left at
 * `x`, `y`: an SVG's markup, to go in a picture drawn in code.
 */
export function pixelText(
	text: string,
	x: number,
	y: number,
	cell: number,
	fill: string,
) {
	let out = ''
	;[...text.toUpperCase()].forEach((char, i) => {
		const rows = GLYPHS[char] ?? GLYPHS[' ']
		rows.forEach((row, r) => {
			// Runs of lit cells in a row, as one rect each.
			let from = -1
			for (let c = 0; c <= row.length; c++) {
				const lit = row[c] === '#'
				if (lit && from < 0) from = c
				if (!lit && from >= 0) {
					out += `<rect x="${x + (i * 6 + from) * cell}" y="${y + r * cell}" width="${(c - from) * cell}" height="${cell}" fill="${fill}"/>`
					from = -1
				}
			}
		})
	})
	return out
}

/**
 * Pixel art painted from shapes, a cell at a time: each cell takes the
 * colour of the last of `paint`'s answers for it that isn't undefined, so
 * later shapes go over earlier ones. For rounder things than rects make.
 */
export function paintedArt(
	width: number,
	height: number,
	paint: (x: number, y: number) => string | undefined,
) {
	const rects: PixelRect[] = []
	for (let y = 0; y < height; y++) {
		let from = 0
		let colour: string | undefined
		for (let x = 0; x <= width; x++) {
			const here = x < width ? paint(x + 0.5, y + 0.5) : undefined
			if (here !== colour) {
				if (colour) rects.push([from, y, x - from, 1, colour])
				from = x
				colour = here
			}
		}
	}
	return pixelArt(width, height, rects)
}

/** Rects, as an SVG's markup. */
export const rectsMarkup = (rects: PixelRect[]) =>
	rects
		.map(
			([x, y, w, h, fill]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
		)
		.join('')

/**
 * Cells `cell` px across, filling whatever `inside` says they're in, in a
 * box from `left`, `top`, `width` by `height`: as an SVG's markup, a run
 * of cells along a row a rect.
 */
function cells(
	left: number,
	top: number,
	width: number,
	height: number,
	cell: number,
	fill: string,
	inside: (x: number, y: number) => boolean,
) {
	const rects: PixelRect[] = []
	const x0 = Math.floor(left / cell) * cell
	const y0 = Math.floor(top / cell) * cell
	for (let y = y0; y < top + height; y += cell) {
		let from: number | undefined
		for (let x = x0; x <= left + width + cell; x += cell) {
			const lit = inside(x + cell / 2, y + cell / 2)
			if (lit && from === undefined) from = x
			if (!lit && from !== undefined) {
				rects.push([from, y, x - from, cell, fill])
				from = undefined
			}
		}
	}
	return rectsMarkup(rects)
}

/** A polygon through `points`, in cells `cell` px across: pixel art, not a smooth edge. */
export function pixelPolygon(
	points: [number, number][],
	fill: string,
	cell = 2,
) {
	const xs = points.map(([x]) => x)
	const ys = points.map(([, y]) => y)
	const left = Math.min(...xs)
	const top = Math.min(...ys)
	return cells(
		left,
		top,
		Math.max(...xs) - left,
		Math.max(...ys) - top,
		cell,
		fill,
		(x, y) => {
			// Crossings of a ray out to the right: odd, it's inside.
			let inside = false
			for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
				const [xi, yi] = points[i]
				const [xj, yj] = points[j]
				if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
					inside = !inside
			}
			return inside
		},
	)
}

/** A circle round `cx`, `cy`, `r` across, in cells `cell` px across. */
export function pixelCircle(
	cx: number,
	cy: number,
	r: number,
	fill: string,
	cell = 2,
) {
	return cells(
		cx - r,
		cy - r,
		r * 2,
		r * 2,
		cell,
		fill,
		(x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r,
	)
}
