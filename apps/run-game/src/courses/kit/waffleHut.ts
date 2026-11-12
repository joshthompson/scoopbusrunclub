import { pixelCircle, pixelText, pixelTextWidth, svgUrl } from './pixelArt'

/**
 * The Slopes' waffle hut, Våffelstugan, halfway down: a log hut the piste
 * runs right through, in at one open end and out of the other, or over its
 * flat roof, off a kicker. Its inside, behind whoever's in it: its back
 * wall, lamps hung from the ceiling, a window onto the snow, a chalkboard,
 * and the counter, a waffle iron steaming on it. And its front, over them,
 * till someone's inside: snow on its roof, icicles, its sign, lit windows,
 * its door, its open ends, and drifts along its foot.
 *
 * Each picture is `columns` cells across, from its left, and from `above`
 * cells over its roof's top (room for its chimney) down to the path's near
 * edge, `height` cells under its roof's top; drawn at twice its size.
 */

/** Room over the roof, in cells, for the chimney and its smoke. */
export const HUT_ABOVE = 16

const SNOW = '#f6f9fc'
const SNOW_SHADE = '#dbe5f0'
const EAVE = '#4a3020'
const POST = '#3e2618'
const LIT = '#ffd36b'
const INK = '#1d1d1d'

type Rect = (x: number, y: number, w: number, h: number, fill: string) => void

function canvas() {
	let body = ''
	const rect: Rect = (x, y, w, h, fill) => {
		if (w > 0 && h > 0)
			body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
	}
	const add = (markup: string) => {
		body += markup
	}
	return { rect, add, body: () => body }
}

/**
 * Its pictures, `columns` cells across, its roof's top `roof` cells over
 * the line everyone skis along, and its roof `thick` cells thick; `path`
 * cells from that line to the path's near edge.
 */
export function waffleHut(
	columns: number,
	roof: number,
	thick: number,
	path: number,
) {
	const R = HUT_ABOVE
	const rows = R + roof + path
	/** The line everyone skis along, and the path's back edge. */
	const line = R + roof
	const backEdge = line - path
	const ceiling = R + thick

	/** Its roof, snow piled on it, its eave under: front and back alike. */
	const roofSlab = (rect: Rect) => {
		rect(0, R, columns, 2, SNOW)
		rect(0, R + 2, columns, 1, SNOW_SHADE)
		rect(0, R + 3, columns, thick - 3, EAVE)
		rect(0, R + 3, columns, 1, '#6a4630')
		// Snow heaped up along the top, here and there.
		for (let x = 6; x < columns - 10; x += 23) rect(x, R - 1, 9, 1, SNOW)
	}
	/** Logs, laid one on another, from `top` to `bottom`: each lit along its top, a dark seam under. */
	const logs = (
		rect: Rect,
		top: number,
		bottom: number,
		log: string,
		seam: string,
		lit: string,
	) => {
		rect(0, top, columns, bottom - top, log)
		for (let y = top; y < bottom; y += 3) {
			rect(0, y, columns, 1, lit)
			rect(0, y + 2, columns, 1, seam)
		}
	}

	// --- Inside ---------------------------------------------------------------
	const back = canvas()
	{
		const { rect, add } = back
		// The chimney, smoking, on the roof at the back.
		rect(columns - 34, 3, 9, R - 3, '#8b939e')
		rect(columns - 34, 3, 9, 1, '#a9b0b9')
		rect(columns - 35, 2, 11, 2, SNOW)
		for (const [dx, dy, size, begin] of [
			[0, -2, 4, 0],
			[3, -6, 5, 1.2],
			[-1, -10, 4, 2.4],
		] as const)
			add(
				`<rect x="${columns - 31 + dx}" y="${3 + dy}" width="${size}" height="${size}" fill="#c9ced8" opacity="0"><animate attributeName="opacity" calcMode="discrete" values="0;0.7;0.5;0.3;0" dur="3.6s" begin="${begin}s" repeatCount="indefinite"/></rect>`,
			)
		roofSlab(rect)
		// Its back wall: logs, warm with the lamps.
		logs(rect, ceiling, backEdge, '#9a6236', '#6e4223', '#b57a46')
		// The open ends' frames.
		rect(0, ceiling, 4, rows - ceiling, POST)
		rect(columns - 4, ceiling, 4, rows - ceiling, POST)
		// A window onto the snow outside.
		rect(56, ceiling + 4, 22, 16, SNOW)
		rect(58, ceiling + 6, 18, 12, '#cfe2f3')
		rect(66, ceiling + 6, 2, 12, SNOW)
		rect(58, ceiling + 11, 18, 2, SNOW)
		rect(59, ceiling + 15, 7, 3, '#eef4fa')
		// The chalkboard: what's on, a heart drawn on it.
		rect(96, ceiling + 3, 36, 20, '#7a4a26')
		rect(98, ceiling + 5, 32, 16, '#26332c')
		add(
			pixelText(
				'VÅFFLOR',
				98 + (32 - pixelTextWidth('VÅFFLOR', 1)) / 2,
				ceiling + 6,
				1,
				'#f6f7f8',
			),
		)
		add(
			pixelText(
				'35 KR',
				98 + (32 - pixelTextWidth('35 KR', 1)) / 2,
				ceiling + 13,
				1,
				'#ffd36b',
			),
		)
		// Lamps, hung from the ceiling, glowing.
		for (const x of [30, 88, 146]) {
			add(pixelCircle(x + 2, ceiling + 10, 18, 'rgba(255,210,120,0.16)', 1))
			rect(x + 1, ceiling, 1, 5, INK)
			rect(x - 1, ceiling + 5, 5, 3, '#c9822e')
			rect(x, ceiling + 8, 3, 1, LIT)
		}
		// The floor: planks, snow tracked in on them.
		rect(0, backEdge, columns, rows - backEdge, '#a0703c')
		for (let y = backEdge; y < rows; y += 3) {
			rect(0, y, columns, 1, '#8a5e30')
			for (let x = (y * 7) % 19; x < columns; x += 19)
				rect(x, y + 1, 1, 2, '#8a5e30')
		}
		for (let x = 10; x < columns - 10; x += 17)
			rect(x, line - 1 + (x % 3), 8, 1, '#e8eef6')
		// The counter, along the back, and what's on it.
		const top = backEdge - 12
		rect(14, top, columns - 28, 12, '#7a4a26')
		rect(14, top, columns - 28, 2, '#c08a4e')
		for (let x = 20; x < columns - 20; x += 14)
			rect(x, top + 4, 1, 7, '#5e3519')
		// A waffle iron, open, steaming, a waffle in it.
		rect(26, top - 4, 14, 4, '#3a3f46')
		rect(28, top - 9, 10, 5, '#4a525d')
		rect(29, top - 3, 8, 2, '#e7ab4f')
		add(
			`<g><rect x="31" y="${top - 13}" width="2" height="2" fill="#ffffff"/><rect x="34" y="${top - 15}" width="2" height="2" fill="#ffffff"/><animate attributeName="opacity" calcMode="discrete" values="0.8;0.3;0.8" dur="1.2s" repeatCount="indefinite"/></g>`,
		)
		// A stack of plates, cups, a jar of cloudberry jam, and cream.
		rect(48, top - 4, 9, 4, '#f6f7f8')
		rect(48, top - 3, 9, 1, '#d6dbe2')
		for (const x of [62, 67, 72]) {
			rect(x, top - 4, 4, 4, '#d8342c')
			rect(x + 4, top - 3, 1, 2, '#d8342c')
		}
		rect(80, top - 5, 5, 5, '#f29a1f')
		rect(80, top - 6, 5, 1, '#f6f7f8')
		rect(90, top - 4, 7, 4, '#f6f7f8')
		rect(91, top - 6, 5, 2, '#ffffff')
		// A plate of waffles, ready.
		rect(104, top - 2, 14, 2, '#f6f7f8')
		rect(105, top - 4, 12, 2, '#e7ab4f')
		rect(106, top - 5, 10, 1, '#c07a2c')
	}

	// --- Its front ---------------------------------------------------------------
	const front = canvas()
	{
		const { rect, add } = front
		roofSlab(rect)
		// Icicles off its eave.
		for (let x = 5; x < columns - 4; x += 7)
			rect(x, ceiling, 1, 2 + (x % 3), '#cfe4f7')
		// Its log front.
		logs(rect, ceiling, rows, '#7a4a26', '#5e3519', '#93603a')
		// Its open ends, either side: dark inside, seen at a slant.
		for (const left of [0, columns - 10]) {
			rect(left, ceiling + 18, 10, line - ceiling - 18, '#2a1a10')
			rect(left, ceiling + 16, 10, 2, POST)
		}
		rect(10, ceiling, 2, rows - ceiling, POST)
		rect(columns - 12, ceiling, 2, rows - ceiling, POST)
		// Its sign.
		const name = 'VÅFFELSTUGAN'
		const signWidth = pixelTextWidth(name, 1) + 8
		const signLeft = Math.round((columns - signWidth) / 2)
		rect(signLeft, ceiling + 3, signWidth, 11, '#f3e3c3')
		rect(signLeft, ceiling + 3, signWidth, 1, '#c79a5a')
		rect(signLeft, ceiling + 13, signWidth, 1, '#c79a5a')
		add(pixelText(name, signLeft + 4, ceiling + 5, 1, '#7a2a1a'))
		// Lit windows, either side of the door.
		for (const x of [24, 52, columns - 76, columns - 48]) {
			rect(x, ceiling + 20, 20, 15, SNOW)
			rect(x + 2, ceiling + 22, 16, 11, LIT)
			rect(x + 9, ceiling + 22, 2, 11, SNOW)
			rect(x + 2, ceiling + 26, 16, 2, SNOW)
			rect(x - 1, ceiling + 35, 22, 2, SNOW)
		}
		// Its door, a heart cut in it.
		const door = Math.round(columns / 2) - 8
		rect(door - 2, ceiling + 18, 20, line - ceiling - 16, '#c08a4e')
		rect(door, ceiling + 20, 16, line - ceiling - 18, '#5e3519')
		rect(door + 6, ceiling + 25, 2, 2, LIT)
		rect(door + 8, ceiling + 25, 2, 2, LIT)
		rect(door + 7, ceiling + 27, 2, 1, LIT)
		rect(door + 12, ceiling + 34, 2, 2, '#c9a227')
		// Drifts of snow along its foot.
		for (let x = 0; x < columns; x += 2) {
			const h = 3 + Math.round(2 + 2 * Math.sin(x / 9) + Math.sin(x / 4))
			rect(x, rows - h, 2, h, SNOW)
			rect(x, rows - h, 2, 1, '#ffffff')
		}
	}

	return {
		back: svgUrl(columns, rows, back.body()),
		front: svgUrl(columns, rows, front.body()),
	}
}
