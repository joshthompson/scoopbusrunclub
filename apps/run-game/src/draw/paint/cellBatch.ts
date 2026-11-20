/**
 * Cells painted edge to edge in a Draw Hook, a colour at a time: each
 * colour's cells gathered into one path and filled the once. Painted one
 * at a time instead, the canvas being scaled to the screen, each cell's
 * edge lands part way across a pixel, and is softened, both sides of it,
 * and the two halves don't add up: a hairline seam between every pair.
 * Filled as one, there's no edge between them to soften. See-through
 * colours too: overlapping, they don't double up.
 *
 * Used as the context is, `fillStyle` then `fillRect`. Colours are filled
 * in the order they're first used, so what's to go over something else
 * is painted after `flush`ing it; and anything that changes how the
 * context paints (its `globalAlpha`) wants a `flush` before it.
 */
export function cellBatch(ctx: CanvasRenderingContext2D) {
	const cells = new Map<string | CanvasGradient, number[]>()
	let colour: string | CanvasGradient = '#000'
	return {
		set fillStyle(next: string | CanvasGradient) {
			colour = next
		},
		get fillStyle() {
			return colour
		},
		/** A cell, `w` by `h`, its top left at `x`, `y`, in the `fillStyle`. */
		fillRect(x: number, y: number, w: number, h: number) {
			if (w <= 0 || h <= 0) return
			let list = cells.get(colour)
			if (!list) {
				list = []
				cells.set(colour, list)
			}
			list.push(x, y, w, h)
		},
		/** Everything gathered so far, painted: a fill a colour. */
		flush() {
			for (const [fill, list] of cells) {
				ctx.beginPath()
				for (let i = 0; i < list.length; i += 4)
					ctx.rect(list[i], list[i + 1], list[i + 2], list[i + 3])
				ctx.fillStyle = fill
				ctx.fill()
			}
			cells.clear()
		},
	}
}

/**
 * A colour, `#rrggbb`, as see-through as `alpha` says: for a batch, which
 * takes its see-through-ness from its colours, not from `globalAlpha`.
 */
export const seeThrough = (hex: string, alpha: number) =>
	`rgba(${Number.parseInt(hex.slice(1, 3), 16)}, ${Number.parseInt(hex.slice(3, 5), 16)}, ${Number.parseInt(hex.slice(5, 7), 16)}, ${alpha.toFixed(3)})`
