import { tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Gamla Stan's streets: plain grey, as the rest of the game's ground is
 * plain, with only a suggestion of cobbles here and there. A few stones
 * at a time, each just a shadow under it and a glint along its top, laid
 * over the street's own colour, the rest of it left as it is.
 */

/** A cell of the art: two screen pixels, as the rest of the game's. */
const CELL = 2

/**
 * A tile `width` by `height` cells, see-through but for `clusters` little
 * groups of stones dotted about it, one to three in each: each stone a
 * `shade` along its bottom and round its lower corners, and a `glint`
 * along its top.
 */
function cobbleHints(options: {
	seed: number
	width: number
	height: number
	clusters: number
	shade: string
	glint: string
	/** How wide and tall its stones are, in cells: the least, and how much more at most. */
	stoneWidth?: [number, number]
	stoneHeight?: [number, number]
	/** How many stones together, at most. */
	most?: number
}) {
	const { width, height, clusters, shade, glint } = options
	const [wide, wider] = options.stoneWidth ?? [4, 3]
	const [tall, taller] = options.stoneHeight ?? [3, 2]
	const random = seeded(options.seed)
	const art = tile(width * CELL, height * CELL)
	const cell = (x: number, y: number, w: number, fill: string) =>
		art.rect(
			(((x % width) + width) % width) * CELL,
			(((y % height) + height) % height) * CELL,
			w * CELL,
			CELL,
			fill,
		)
	/** A stone, `w` by `h` cells, its top left at `x`, `y`. */
	const stone = (x: number, y: number, w: number, h: number) => {
		cell(x + 1, y, w - 3, glint)
		cell(x, y + h - 1, 1, shade)
		cell(x + 1, y + h, w - 2, shade)
		cell(x + w - 1, y + h - 1, 1, shade)
	}
	for (let i = 0; i < clusters; i++) {
		// Spread along the tile evenly, give or take, so no stretch is bare.
		let x = Math.round(((i + random() * 0.8) * width) / clusters)
		const y = Math.floor(random() * height)
		const count = 1 + Math.floor(random() * (options.most ?? 3))
		for (let n = 0; n < count; n++) {
			const w = wide + Math.floor(random() * wider)
			const h = tall + Math.floor(random() * taller)
			// The next one along, or tucked in under and between them.
			const under = n > 0 && random() < 0.35
			stone(under ? x - w + 1 : x, under ? y + h + 1 : y, w, h)
			if (!under) x += w + 1
		}
	}
	return art
}

/** Down the middle of the street, where everyone runs. */
export const GAMLA_STAN_COBBLES = cobbleHints({
	seed: 1253,
	width: 300,
	height: 18,
	clusters: 9,
	shade: 'rgba(47, 42, 37, 0.38)',
	glint: 'rgba(255, 250, 240, 0.22)',
}).pattern('gamla-stan-cobbles')

/** Either side of it, out to the walls: fewer, and fainter. */
export const GAMLA_STAN_SIDE_COBBLES = cobbleHints({
	seed: 1255,
	width: 360,
	height: 24,
	clusters: 7,
	shade: 'rgba(60, 52, 44, 0.24)',
	glint: 'rgba(255, 250, 240, 0.18)',
}).pattern('gamla-stan-side-cobbles')

/**
 * Drottninggatan's, and Riksgatan's over on Helgeandsholmen: not cobbles
 * but big granite slabs, a joint here and there.
 */
export const GRANITE_SLABS = cobbleHints({
	seed: 1257,
	width: 320,
	height: 18,
	clusters: 6,
	shade: 'rgba(47, 42, 37, 0.3)',
	glint: 'rgba(255, 250, 240, 0.2)',
	stoneWidth: [16, 8],
	stoneHeight: [6, 2],
	most: 2,
}).pattern('granite-slabs')
