/** The stripes' colours, and how wide each is. */
const YELLOW = '#f2c200'
const INK = '#1d1d1d'
const STRIPE = 6
/** How thick the ink border round it is. */
const BORDER = 2

/**
 * A box striped yellow and black on the slant, in a 2px ink border: a
 * section of the Scoop Arm. Painted as the DOM Renderer draws its `<div>`
 * (`repeating-linear-gradient(45deg, …)` inside `border: 2px solid`,
 * `box-sizing: border-box`), so the stripes line up the same: the gradient
 * runs up and to the right across the box inside the border, from its
 * bottom left corner's side.
 */
export function paintHazardStripes(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	if (width <= 0 || height <= 0) return
	ctx.fillStyle = INK
	ctx.fillRect(x, y, width, height)
	const inner = {
		x: x + BORDER,
		y: y + BORDER,
		width: width - BORDER * 2,
		height: height - BORDER * 2,
	}
	if (inner.width <= 0 || inner.height <= 0) return
	// How long the gradient's line is, at 45°, corner to corner of the box.
	const line = (inner.width + inner.height) * Math.SQRT1_2
	ctx.save()
	ctx.beginPath()
	ctx.rect(inner.x, inner.y, inner.width, inner.height)
	ctx.clip()
	// Along the gradient's line, from the middle: up and to the right.
	ctx.translate(inner.x + inner.width / 2, inner.y + inner.height / 2)
	ctx.rotate(-Math.PI / 4)
	ctx.fillStyle = YELLOW
	for (let along = 0; along < line; along += STRIPE * 2)
		ctx.fillRect(along - line / 2, -line / 2, STRIPE, line)
	ctx.restore()
}
