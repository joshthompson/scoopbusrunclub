/**
 * Painting a group of things as one, as the page does an element with
 * `opacity` or a `mask-image`: onto a canvas of their own first, then
 * that, faded, onto the one being painted. One canvas, as big as the
 * biggest it's been used for, reused every time: not art kept, just room
 * to paint in.
 */
let room: HTMLCanvasElement | undefined

/**
 * Paints `draw` onto `ctx` `opacity` faded, all of it as one, with `mask`
 * (painted with `destination-in`) over it first if it has one. `draw` and
 * `mask` paint in `ctx`'s own coordinates.
 */
export function inLayer(
	ctx: CanvasRenderingContext2D,
	opacity: number,
	draw: (ctx: CanvasRenderingContext2D) => void,
	mask?: (ctx: CanvasRenderingContext2D) => void,
) {
	const { width, height } = ctx.canvas
	room ??= document.createElement('canvas')
	if (room.width < width || room.height < height) {
		room.width = Math.max(room.width, width)
		room.height = Math.max(room.height, height)
	}
	const layer = room.getContext('2d')
	if (!layer) return
	layer.save()
	layer.setTransform(1, 0, 0, 1, 0, 0)
	layer.clearRect(0, 0, width, height)
	layer.setTransform(ctx.getTransform())
	layer.imageSmoothingEnabled = ctx.imageSmoothingEnabled
	draw(layer)
	if (mask) {
		layer.globalCompositeOperation = 'destination-in'
		mask(layer)
	}
	layer.restore()
	ctx.save()
	ctx.setTransform(1, 0, 0, 1, 0, 0)
	ctx.globalAlpha *= opacity
	ctx.drawImage(room, 0, 0, width, height, 0, 0, width, height)
	ctx.restore()
}
