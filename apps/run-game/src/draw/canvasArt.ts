import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'

/**
 * Helpers for painting the game's art on the Canvas Renderer, in Draw Hooks
 * (a Controller's `draw`), where under the DOM Renderer it's `children`.
 *
 * - Art that changes as the race goes on is painted every time, straight
 *   onto the hook's `ctx`.
 * - Art that doesn't is painted once with `cachedArt`, and drawn from there.
 * - Art that's already an SVG of the game's own, and doesn't change, can be
 *   drawn as an image with `svgArt`, without painting it all again by hand.
 */

/**
 * The most pixels kept painted at once. A phone limits how much canvas a
 * page can have, all told (iOS Safari: about 16 million pixels for any one
 * canvas, and a few hundred megabytes for all of them), so art drawn once
 * and kept is let go of, oldest first, past this.
 */
const MOST_PIXELS = 16_000_000

const kept = new Map<string, HTMLCanvasElement>()
let keptPixels = 0

/**
 * Art painted once into a canvas of its own and kept, by `key`, to draw with
 * `ctx.drawImage(art, x, y, width, height)`: for art that's the same every
 * time it's drawn. `paint` draws it from (0, 0) to (`width`, `height`).
 *
 * The key has to say everything that changes it (its size, its colours, a
 * Frame), since art with a key already kept isn't painted again. Painted at
 * the screen's pixel density, up to 2, so it's as sharp as under the DOM
 * Renderer; keep each one small, a phone has little room for them.
 */
export function cachedArt(
	key: string,
	width: number,
	height: number,
	paint: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
	const found = kept.get(key)
	if (found) {
		// Used again: the last to be let go of
		kept.delete(key)
		kept.set(key, found)
		return found
	}
	const density = Math.min(2, Math.max(1, Math.round(devicePixelRatio || 1)))
	const art = document.createElement('canvas')
	art.width = Math.max(1, Math.ceil(width * density))
	art.height = Math.max(1, Math.ceil(height * density))
	const ctx = art.getContext('2d')
	if (ctx) {
		ctx.scale(density, density)
		paint(ctx)
	}
	kept.set(key, art)
	keptPixels += art.width * art.height
	for (const [oldKey, old] of kept) {
		if (keptPixels <= MOST_PIXELS || old === art) break
		kept.delete(oldKey)
		keptPixels -= old.width * old.height
		// Gives its memory back straight away, on iOS above all
		old.width = 0
		old.height = 0
	}
	return art
}

const svgs = new Map<string, string>()

/**
 * An SVG of the game's own, as JSX, as an image's URL, to draw in a Draw
 * Hook with its `image(url)`, which loads it once and paints again when it
 * has. Kept by `key`, which has to say everything that changes it.
 *
 * Only for art that's one `<svg>` (not `<div>`s), that doesn't change as the
 * race goes on (or changes between a few looks, each a key of its own), and
 * whose `<image>`s are data URLs: an SVG drawn as an image can't load
 * anything else. CSS animations in it don't play.
 */
export function svgArt(key: string, art: () => JSX.Element): string {
	const found = svgs.get(key)
	if (found) return found
	const holder = document.createElement('div')
	const dispose = render(art, holder)
	const svg = holder.querySelector('svg')
	let url = ''
	if (svg) {
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
		const markup = new XMLSerializer().serializeToString(svg)
		url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
	}
	dispose()
	svgs.set(key, url)
	return url
}
