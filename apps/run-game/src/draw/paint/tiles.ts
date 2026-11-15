import { type Scene, createController } from 'scoopjs'
import { VIEW_WIDTH } from '../../game/constants'
import { screenDensity } from '../canvasArt'
import { type ImageOf, drawSnapped } from './bands'

/**
 * Art as long as a course, painted in tiles: a phone can't keep a canvas
 * tens of thousands of pixels wide, so it's painted a tile at a time, as
 * it comes into view, and kept (`cachedArt`), the oldest let go of.
 */

/** The tiles: this big, square. */
export const TILE = 256
/** How many columns of tiles each of its Controllers has. */
const TILES_ACROSS = 4

export interface Tiles {
	/** Where its first column of tiles starts, in the Scene. */
	left: number
	columns: number
	/** Each column's first and last row of tiles with anything in them. */
	rows: [number, number][]
	/**
	 * Tile `c`, `r`, painted, if what it needs has loaded, as sharp as the
	 * screen shows it zoomed out `zoom` (see `tileDensity`).
	 */
	tile(
		c: number,
		r: number,
		image: ImageOf,
		zoom: number,
	): HTMLCanvasElement | undefined
}

/**
 * How many of a tile's pixels to each of the Scene's, zoomed out `zoom`:
 * as sharp as the screen shows it, so zoomed right out it's not more than
 * a phone can keep.
 */
export const tileDensity = (zoom: number) =>
	screenDensity() / (zoom > 2 ? 4 : zoom > 1.5 ? 2 : 1)

/**
 * `tiles`, in the Scene: a Controller for each few columns of them, as
 * tall as the art in them goes, each painting the tiles of it in view,
 * at `alpha`, if it says. Their ids are `id-0`, `id-1` and so on.
 */
export function tileControllers(
	tiles: Tiles,
	scene: Scene,
	options: { id: string; type: string; alpha?: () => number },
) {
	const camera = () => scene.canvas.get()
	const groups = Math.ceil(tiles.columns / TILES_ACROSS)
	const controllers = []
	for (let g = 0; g < groups; g++) {
		const from = g * TILES_ACROSS
		const to = Math.min(tiles.columns, from + TILES_ACROSS)
		let top = Number.POSITIVE_INFINITY
		let bottom = Number.NEGATIVE_INFINITY
		for (let c = from; c < to; c++) {
			top = Math.min(top, tiles.rows[c][0] * TILE)
			bottom = Math.max(bottom, (tiles.rows[c][1] + 1) * TILE)
		}
		if (!(bottom > top)) continue
		const left = tiles.left + from * TILE
		controllers.push(
			createController({
				init: () => ({
					id: `${options.id}-${g}`,
					type: options.type,
					x: () => left,
					y: () => top,
					width: () => (to - from) * TILE,
					height: () => bottom - top,
				}),
				draw: ({ ctx, image }) => {
					const alpha = options.alpha?.() ?? 1
					if (alpha <= 0) return
					ctx.globalAlpha *= alpha
					const view = camera()
					const zoom = view.width() / VIEW_WIDTH
					for (let c = from; c < to; c++) {
						const x = tiles.left + c * TILE
						if (x >= view.x() + view.width() || x + TILE <= view.x()) continue
						const [first, last] = tiles.rows[c]
						for (let r = first; r <= last; r++) {
							const y = r * TILE
							if (y >= view.y() + view.height() || y + TILE <= view.y())
								continue
							const tile = tiles.tile(c, r, image, zoom)
							if (tile)
								drawSnapped(
									ctx,
									tile,
									0,
									0,
									tile.width,
									tile.height,
									x - left,
									y - top,
									TILE,
									TILE,
									{ x: left - view.x(), y: top - view.y() },
								)
						}
					}
				},
			}),
		)
	}
	return controllers
}
