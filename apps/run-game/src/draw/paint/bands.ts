import { type Loaded, filtered } from './css'

/**
 * Painting pictures as the page shows them as CSS backgrounds: repeated
 * along a band, or all over a box, from where `background-position` puts
 * them.
 */

/** What a Draw Hook gives for an image's URL: undefined till it's loaded. */
export type ImageOf = (url: string) => Loaded | undefined

/**
 * `ctx.drawImage`, its corners moved onto the canvas's own pixels. Pictures
 * drawn side by side, at a density that's not a whole number (a page
 * zoomed), otherwise each half cover the pixels they meet in, and what's
 * behind shows through the join. `from`, if given, is where `ctx`'s (0, 0)
 * is from the camera's top left, in the Scene: for pictures meeting from
 * different Controllers, whose own positions are rounded differently.
 */
export function drawSnapped(
	ctx: CanvasRenderingContext2D,
	image: CanvasImageSource,
	sx: number,
	sy: number,
	sw: number,
	sh: number,
	dx: number,
	dy: number,
	dw: number,
	dh: number,
	from?: { x: number; y: number },
) {
	const m = ctx.getTransform()
	if (m.b !== 0 || m.c !== 0 || m.a === 0 || m.d === 0) {
		ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
		return
	}
	// Where on the canvas (0, 0) goes: from the camera, if it's known.
	const e = from ? m.a * from.x : m.e
	const f = from ? m.d * from.y : m.f
	const snapX = (x: number) => (Math.round(m.a * x + e) - m.e) / m.a
	const snapY = (y: number) => (Math.round(m.d * y + f) - m.f) / m.d
	const left = snapX(dx)
	const right = snapX(dx + dw)
	const top = snapY(dy)
	const bottom = snapY(dy + dh)
	if (right === left || bottom === top) return
	ctx.drawImage(image, sx, sy, sw, sh, left, top, right - left, bottom - top)
}

/** Where the copy of a picture repeating every `size` that covers 0 starts, moved by `offset`. */
export function firstCopy(offset: number, size: number) {
	const into = ((offset % size) + size) % size
	return into === 0 ? 0 : into - size
}

/**
 * A picture, through `filter`, repeated over the box `left`, `top`,
 * `width` by `height`, from `x` and `y` in it (its `background-position`):
 * across only (`repeat-x`), or down as well. At its own size, cut off at
 * the box's edges. False till the picture's loaded.
 */
export function paintTiled(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	url: string,
	box: { left: number; top: number; width: number; height: number },
	at: { x: number; y?: number; down?: boolean; filter?: string },
) {
	const loaded = image(url)
	if (!loaded || !(loaded.width > 0 && loaded.height > 0)) return false
	const { art, width, height, density } = filtered(url, loaded, at.filter)
	const right = box.left + box.width
	const bottom = box.top + box.height
	const y0 = at.down
		? box.top + firstCopy(at.y ?? 0, height)
		: box.top + (at.y ?? 0)
	for (let y = y0; y < bottom; y += height) {
		// Cut off at the box's top and bottom by drawing only that much of it.
		const top = Math.max(y, box.top)
		const end = Math.min(y + height, bottom)
		if (end > top) {
			for (let x = box.left + firstCopy(at.x, width); x < right; x += width) {
				const from = Math.max(x, box.left)
				const to = Math.min(x + width, right)
				if (to <= from) continue
				drawSnapped(
					ctx,
					art,
					(from - x) * density,
					(top - y) * density,
					(to - from) * density,
					(end - top) * density,
					from,
					top,
					to - from,
					end - top,
				)
			}
		}
		if (!at.down) break
	}
	return true
}
