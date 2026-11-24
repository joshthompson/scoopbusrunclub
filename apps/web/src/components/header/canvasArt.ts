import type { DrawImage } from 'scoopjs'

/** A colour filter function a tint is made of, as CSS writes it. */
interface ColourFilter {
	name: 'hue-rotate' | 'brightness' | 'sepia' | 'saturate'
	amount: number
}

/**
 * The colour functions in a CSS `filter`, such as `ZOMBIE_TINT` or a
 * pumpkin's tint. Anything else in it is left out.
 */
function colourFilters(filter: string): ColourFilter[] {
	const filters: ColourFilter[] = []
	for (const [, name, value, unit] of filter.matchAll(
		/(hue-rotate|brightness|sepia|saturate)\(\s*(-?[\d.]+)\s*(deg|%)?\s*\)/g,
	)) {
		const amount = Number(value) / (unit === '%' ? 100 : 1)
		filters.push({ name: name as ColourFilter['name'], amount })
	}
	return filters
}

/**
 * The matrix for a colour filter, as the Filter Effects spec gives it, worked
 * on red, green and blue as they are, as CSS's filter functions are.
 */
function colourMatrix({ name, amount }: ColourFilter): number[][] {
	switch (name) {
		case 'brightness':
			return [
				[amount, 0, 0],
				[0, amount, 0],
				[0, 0, amount],
			]
		case 'saturate':
			return [
				[
					0.213 + 0.787 * amount,
					0.715 - 0.715 * amount,
					0.072 - 0.072 * amount,
				],
				[
					0.213 - 0.213 * amount,
					0.715 + 0.285 * amount,
					0.072 - 0.072 * amount,
				],
				[
					0.213 - 0.213 * amount,
					0.715 - 0.715 * amount,
					0.072 + 0.928 * amount,
				],
			]
		case 'sepia': {
			const s = 1 - amount
			return [
				[0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s],
				[0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s],
				[0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s],
			]
		}
		case 'hue-rotate': {
			const cos = Math.cos((amount * Math.PI) / 180)
			const sin = Math.sin((amount * Math.PI) / 180)
			return [
				[
					0.213 + cos * 0.787 - sin * 0.213,
					0.715 - cos * 0.715 - sin * 0.715,
					0.072 - cos * 0.072 + sin * 0.928,
				],
				[
					0.213 - cos * 0.213 + sin * 0.143,
					0.715 + cos * 0.285 + sin * 0.14,
					0.072 - cos * 0.072 - sin * 0.283,
				],
				[
					0.213 - cos * 0.213 - sin * 0.787,
					0.715 - cos * 0.715 + sin * 0.715,
					0.072 + cos * 0.928 + sin * 0.072,
				],
			]
		}
	}
}

const clamp = (n: number) => Math.min(255, Math.max(0, n))

/**
 * A canvas of `width` × `height`, painted by `paint` and kept by `key`, which
 * has to say everything that changes it. The header's art is small and comes
 * in a handful of kinds, so everything is kept: a carved pumpkin lit and
 * unlit, a zombie's few still poses.
 */
const kept = new Map<string, HTMLCanvasElement>()
function keptArt(
	key: string,
	width: number,
	height: number,
	paint: (ctx: CanvasRenderingContext2D) => void,
) {
	let art = kept.get(key)
	if (!art) {
		art = document.createElement('canvas')
		art.width = Math.max(1, width)
		art.height = Math.max(1, height)
		const ctx = art.getContext('2d', { willReadFrequently: true })
		if (ctx) paint(ctx)
		kept.set(key, art)
	}
	return art
}

/**
 * Recolours what's on `ctx` in place by `filter`'s colour functions, by its
 * pixels rather than the context's own `filter`, which WebKit's canvas (and
 * so every iPhone's) doesn't have. Left as it is if it can't be read.
 */
function recolour(ctx: CanvasRenderingContext2D, filter: string) {
	const matrices = colourFilters(filter).map(colourMatrix)
	if (!matrices.length) return
	const { width, height } = ctx.canvas
	let pixels: ImageData
	try {
		pixels = ctx.getImageData(0, 0, width, height)
	} catch {
		return
	}
	const { data } = pixels
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] === 0) continue
		let r = data[i]
		let g = data[i + 1]
		let b = data[i + 2]
		// Clamped after each, as a page's are between filter functions.
		for (const [red, green, blue] of matrices) {
			;[r, g, b] = [
				clamp(red[0] * r + red[1] * g + red[2] * b),
				clamp(green[0] * r + green[1] * g + green[2] * b),
				clamp(blue[0] * r + blue[1] * g + blue[2] * b),
			]
		}
		data[i] = r
		data[i + 1] = g
		data[i + 2] = b
	}
	ctx.putImageData(pixels, 0, 0)
}

/** `loaded` with its colours filtered by `filter`, made once and kept. */
export function tinted(url: string, loaded: DrawImage, filter: string) {
	return keptArt(`${url} ${filter}`, loaded.width, loaded.height, (ctx) => {
		ctx.drawImage(loaded.image, 0, 0)
		recolour(ctx, filter)
	})
}

/**
 * Pictures drawn one over another, bottom first, into one image the size of
 * the first, then tinted as one by `filter`: what CSS does for an element with
 * a `filter` and everything in it. Each layer is an image, stretched to that
 * size, or else its shape filled flat with `fill`. Made once and kept.
 */
export function tintedLayers(
	layers: { url: string; loaded: DrawImage; fill?: string }[],
	filter: string,
) {
	const { width, height } = layers[0].loaded
	const key = layers.map(({ url, fill }) => `${url} ${fill ?? ''}`).join(' ')
	return keptArt(`${key} ${filter}`, width, height, (ctx) => {
		for (const { url, loaded, fill } of layers) {
			const art = fill
				? keptArt(`${url} filled ${fill}`, width, height, (shape) => {
						shape.drawImage(loaded.image, 0, 0, width, height)
						shape.globalCompositeOperation = 'source-in'
						shape.fillStyle = fill
						shape.fillRect(0, 0, width, height)
					})
				: loaded.image
			ctx.drawImage(art, 0, 0, width, height)
		}
		recolour(ctx, filter)
	})
}
