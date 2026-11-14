/**
 * `ctx.fillRect`, its corners moved onto the canvas's own pixels, for art
 * built of blocks side by side. At a scale that's not a whole number (a
 * phone, or a window not 960 wide), each block otherwise half covers the
 * pixels it shares with the next, and what's behind shows through between
 * them, in lines, where the page shows none. Made once per painting: it
 * reads `ctx`'s transform as it is then.
 */
export function rectFiller(ctx: CanvasRenderingContext2D) {
	const m = ctx.getTransform()
	if (m.b !== 0 || m.c !== 0 || m.a === 0 || m.d === 0)
		return (x: number, y: number, w: number, h: number) =>
			ctx.fillRect(x, y, w, h)
	const snapX = (x: number) => (Math.round(m.a * x + m.e) - m.e) / m.a
	const snapY = (y: number) => (Math.round(m.d * y + m.f) - m.f) / m.d
	return (x: number, y: number, w: number, h: number) => {
		const left = snapX(x)
		const top = snapY(y)
		ctx.fillRect(left, top, snapX(x + w) - left, snapY(y + h) - top)
	}
}
