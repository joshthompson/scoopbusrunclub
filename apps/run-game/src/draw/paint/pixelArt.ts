import type { ImageOf } from './bands'
import { filtered } from './css'
import { paintPicture } from './picture'

/**
 * Each picture's own short name, to keep it by recoloured: a data URL can
 * be thousands of characters long, too long to build a key out of on every
 * repaint.
 */
const named = new Map<string, string>()

/**
 * `PixelArt` with a CSS `filter` on it, as a Draw Hook paints it: from
 * (0, 0), `width` by `height`. Recoloured once and kept, since WebKit's
 * canvas has no `filter`; nothing till it's loaded.
 */
export function paintPixelArt(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	src: string,
	width: number,
	height: number,
	filter?: string,
) {
	if (!filter) return paintPicture(ctx, image, src, 0, 0, width, height)
	const loaded = image(src)
	if (!loaded) return
	let name = named.get(src)
	if (name === undefined) {
		name = `pixel-art:${named.size}`
		named.set(src, name)
	}
	const art = filtered(name, loaded, filter)
	// Its own size, stretched to the box, as an `<img>` is.
	const sx = width / art.width
	const sy = height / art.height
	ctx.drawImage(
		art.art,
		-art.pad * sx,
		-art.pad * sy,
		(art.width + art.pad * 2) * sx,
		(art.height + art.pad * 2) * sy,
	)
}

/**
 * Moves `ctx` to where something scooped has flown to, spinning round
 * (`originX`, `originY`) in its box, as `Scoopable` moves it on the page.
 * Nothing, till it's scooped.
 */
export function moveScooped(
	ctx: CanvasRenderingContext2D,
	flight: { x: number; y: number; spin: number } | undefined,
	originX: number,
	originY: number,
) {
	if (!flight) return
	ctx.translate(originX + flight.x, originY + flight.y)
	ctx.rotate((flight.spin * Math.PI) / 180)
	ctx.translate(-originX, -originY)
}
