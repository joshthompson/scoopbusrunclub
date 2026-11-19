import type { DrawPainting } from 'scoopjs'
import { cachedArt } from '../canvasArt'

/**
 * A shadow, or an outline, round a picture: copies of it, all in one
 * colour, at each offset, under it. `filter` is the same as CSS, for art
 * on a page (a course's preview); `offsets` are what it comes to, for a
 * Draw Hook.
 */
export interface PictureShadow {
	colour: string
	offsets: readonly (readonly [number, number])[]
	filter: string
	/** Everything about it, for the art it's painted into to be kept by. */
	key: string
}

export function pictureShadow(
	colour: string,
	offsets: readonly (readonly [number, number])[],
	filter: string,
): PictureShadow {
	return {
		colour,
		offsets,
		filter,
		key: `${colour}:${offsets.map(([x, y]) => `${x},${y}`).join(';')}`,
	}
}

/**
 * An ink outline 2 px round a picture, so it stands out: four drop-shadows,
 * each of the one before, which comes to a copy at each of the eight steps
 * round it, corners and all.
 */
export const inkOutline = (colour: string) =>
	pictureShadow(
		colour,
		[
			[-2, -2],
			[0, -2],
			[2, -2],
			[-2, 0],
			[2, 0],
			[-2, 2],
			[0, 2],
			[2, 2],
		],
		[
			`drop-shadow(2px 0 0 ${colour})`,
			`drop-shadow(-2px 0 0 ${colour})`,
			`drop-shadow(0 2px 0 ${colour})`,
			`drop-shadow(0 -2px 0 ${colour})`,
		].join(' '),
	)

/**
 * Each picture's own short name, for the key it's kept by: a data URL can
 * be thousands of characters long, too long to build a key out of on every
 * repaint.
 */
const named = new Map<string, number>()

/** The short name a picture's kept by, for a key of another picture made from it. */
export function pictureName(src: string) {
	let name = named.get(src)
	if (name === undefined) {
		name = named.size
		named.set(src, name)
	}
	return name
}

/**
 * The picture at `src`, in a Draw Hook, `width` by `height` at `x`, `y`: as
 * an `<img>` of it would be, and with its `shadow`, if it has one, as a CSS
 * filter would draw it. Painted once at that size and kept, so an SVG's
 * drawn as pixels, not rasterised again every repaint; nothing till it's
 * loaded, when the canvas is painted again.
 */
export function paintPicture(
	ctx: CanvasRenderingContext2D,
	image: DrawPainting['image'],
	src: string,
	x: number,
	y: number,
	width: number,
	height: number,
	shadow?: PictureShadow,
) {
	const loaded = image(src)
	if (!loaded) return
	const name = pictureName(src)
	let pad = 0
	for (const [dx, dy] of shadow?.offsets ?? [])
		pad = Math.max(pad, Math.abs(dx), Math.abs(dy))
	const art = cachedArt(
		`picture:${name}:${width}x${height}:${shadow?.key ?? ''}`,
		width + pad * 2,
		height + pad * 2,
		(art) => {
			art.imageSmoothingEnabled = false
			if (shadow?.offsets.length) {
				for (const [dx, dy] of shadow.offsets)
					art.drawImage(loaded.image, pad + dx, pad + dy, width, height)
				// Every copy, in the shadow's colour, as solid as the picture was.
				art.globalCompositeOperation = 'source-in'
				art.fillStyle = shadow.colour
				art.fillRect(0, 0, width + pad * 2, height + pad * 2)
				art.globalCompositeOperation = 'source-over'
			}
			art.drawImage(loaded.image, pad, pad, width, height)
		},
	)
	ctx.drawImage(art, x - pad, y - pad, width + pad * 2, height + pad * 2)
}

/**
 * Draws `paint` turned round, left to right, about the middle of a box
 * `width` wide: as `transform: scaleX(-1)` turns round a `<div>` that wide.
 */
export function mirrored(
	ctx: CanvasRenderingContext2D,
	width: number,
	paint: () => void,
) {
	ctx.save()
	ctx.translate(width, 0)
	ctx.scale(-1, 1)
	paint()
	ctx.restore()
}
