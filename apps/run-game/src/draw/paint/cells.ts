import { cachedArt } from '../canvasArt'

/** A rect of pixel art, in cells: [x, y, width, height, colour]. */
export type CellRect = readonly [number, number, number, number, string]

/**
 * Pixel art drawn as rects of cells, `scale` screen pixels each: painted
 * once and kept by `key`, `columns` by `rows` cells, to draw at its size.
 */
export function cellArt(
	key: string,
	columns: number,
	rows: number,
	scale: number,
	rects: readonly CellRect[],
) {
	return cachedArt(`cells:${key}`, columns * scale, rows * scale, (ctx) => {
		ctx.scale(scale, scale)
		for (const [x, y, w, h, fill] of rects) {
			ctx.fillStyle = fill
			ctx.fillRect(x, y, w, h)
		}
	})
}
