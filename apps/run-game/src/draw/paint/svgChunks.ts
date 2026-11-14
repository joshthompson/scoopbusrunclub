import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import type { ImageOf } from './bands'
import type { Resolve } from './css'
import { type SvgDrawing, compileSvg } from './svgCanvas'

/**
 * An SVG of the game's own, as JSX, read once into chunks `chunkWidth`
 * across, as the Ground is, to paint just the bit of it in view: for art
 * too long to paint into one canvas, the whole course long. Its `url(#id)`
 * fills have to be defined inside it.
 */
export function svgChunks(
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

/** Paints the chunks of `drawing` from `left` to `right` along it, in its own coordinates. */
export function paintChunks(
	ctx: CanvasRenderingContext2D,
	drawing: SvgDrawing,
	left: number,
	right: number,
	image: ImageOf,
) {
	const { chunkWidth } = drawing
	const first = Math.floor(left / chunkWidth)
	const last = Math.floor(right / chunkWidth)
	for (let k = first; k <= last; k++)
		if (drawing.chunks.has(k)) drawing.paint(ctx, k, image)
}
