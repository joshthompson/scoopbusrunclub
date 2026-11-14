import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import type { ImageOf } from './bands'
import { type Resolve, paletteOf } from './css'
import { type SvgDrawing, compileSvg } from './svgCanvas'

/** How wide each chunk of a long drawing is, to paint only the ones in view. */
const CHUNK = 512

/**
 * A long SVG of the game's own, that doesn't change, as the page draws it
 * (`art`, one `<svg>`), painted on the Canvas Renderer a chunk at a time:
 * only the chunks between `from` and `to` across it, what's in view. Read
 * the first time it's painted, then let go of. `key` names it among the
 * art kept painted, its patterns' tiles, so has to be different for every
 * different drawing.
 */
export function svgPainter(
	key: string,
	art: () => JSX.Element,
	resolve?: Resolve,
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
			const holder = document.createElement('div')
			const dispose = render(art, holder)
			const svg = holder.querySelector('svg')
			if (svg)
				drawing = compileSvg(svg, {
					chunkWidth: CHUNK,
					resolve: resolve ?? paletteOf(),
					key,
				})
			dispose()
		}
		if (!drawing) return
		for (const url of drawing.images) if (!image(url)) return
		const first = Math.floor(from / CHUNK)
		const last = Math.floor(to / CHUNK)
		for (let k = first; k <= last; k++) drawing.paint(ctx, k, image)
	}
}
