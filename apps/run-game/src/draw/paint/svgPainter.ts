import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import type { ImageOf } from './bands'
import { type Resolve, paletteOf } from './css'
import { type SvgDrawing, compileSvg } from './svgCanvas'

/** How wide each chunk of a long drawing is, unless it says, to paint only the ones in view. */
const CHUNK = 512

/**
 * An SVG of the game's own, as JSX (`art`, one `<svg>`), rendered and read
 * once into chunks `chunkWidth` across, as the Ground is, then let go of:
 * for art too long to paint into one canvas, the whole course long. Its
 * `url(#id)` fills have to be defined inside it. `key` names it among the
 * art kept painted, its patterns' tiles, so has to be different for every
 * different drawing.
 */
export function readSvg(
	art: () => JSX.Element,
	options: { chunkWidth: number; resolve: Resolve; key: string },
): SvgDrawing | undefined {
	const holder = document.createElement('div')
	const dispose = render(art, holder)
	const svg = holder.querySelector('svg')
	const drawing = svg ? compileSvg(svg, options) : undefined
	dispose()
	return drawing
}

/**
 * A long SVG of the game's own that doesn't change, as the page draws it,
 * painted on the Canvas Renderer a chunk at a time: only the chunks between
 * `from` and `to` across it, what's in view, in its own coordinates. Read
 * (see `readSvg`) the first time it's painted, and painted once every
 * picture in it has loaded. Its colours' `var(--name)`s are the page's,
 * unless `resolve` says.
 */
export function svgPainter(
	key: string,
	art: () => JSX.Element,
	options: { resolve?: Resolve; chunkWidth?: number } = {},
) {
	let drawing: SvgDrawing | undefined
	let read = false
	return (
		ctx: CanvasRenderingContext2D,
		image: ImageOf,
		from: number,
		to: number,
	) => {
		if (!read) {
			read = true
			drawing = readSvg(art, {
				chunkWidth: options.chunkWidth ?? CHUNK,
				resolve: options.resolve ?? paletteOf(),
				key,
			})
		}
		if (!drawing) return
		for (const url of drawing.images) if (!image(url)) return
		const { chunkWidth } = drawing
		const first = Math.floor(from / chunkWidth)
		const last = Math.floor(to / chunkWidth)
		for (let k = first; k <= last; k++) drawing.paint(ctx, k, image)
	}
}
