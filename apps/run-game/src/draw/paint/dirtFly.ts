import { TICK_MS } from '../../game/constants'

/**
 * The `dirt-fly` animation (in `styles.css`), worked out for painting on the
 * Canvas Renderer, where CSS animations don't play: a bit of rock, or snow,
 * flung `to` px from where it starts, over `seconds`, in `steps` jumps each
 * way, fading out over the second half; then again, over and over.
 *
 * The animation's `steps()` applies to each half of it, between its
 * keyframes, as CSS does, and before its `delay` it sits where it starts.
 * `ticks` is how long it's been going: the world's ticks, where under the
 * DOM Renderer it's real time, since the page put it there.
 */
export function dirtFlyAt(
	ticks: number,
	to: { x: number; y: number },
	timing: { seconds: number; steps: number; delay: number },
): { x: number; y: number; alpha: number } {
	const time = (ticks * TICK_MS) / 1000 - timing.delay
	if (time < 0) return { x: 0, y: 0, alpha: 1 }
	const through = (time % timing.seconds) / timing.seconds
	// Each half from its own keyframe to the next, in steps.
	const half = through < 0.5 ? 0 : 1
	const step = Math.floor((through * 2 - half) * timing.steps) / timing.steps
	const from = half ? { x: 0.5, y: 0.85, alpha: 1 } : { x: 0, y: 0, alpha: 1 }
	const next = half ? { x: 1, y: 1, alpha: 0 } : { x: 0.5, y: 0.85, alpha: 1 }
	return {
		x: to.x * (from.x + (next.x - from.x) * step),
		y: to.y * (from.y + (next.y - from.y) * step),
		alpha: from.alpha + (next.alpha - from.alpha) * step,
	}
}

/** A square bit flung off something: its top left, its size and colour, and where it's flung, when. */
export interface FlungBit {
	x: number
	y: number
	size: number
	colour: string
	to: { x: number; y: number }
	delay: number
}

/**
 * Bits flying with `dirt-fly`, each a square `<div>` under the DOM Renderer,
 * painted where they've got to after `ticks`.
 */
export function paintFlung(
	ctx: CanvasRenderingContext2D,
	ticks: number,
	bits: readonly FlungBit[],
	timing: { seconds: number; steps: number },
) {
	const alpha = ctx.globalAlpha
	for (const bit of bits) {
		const at = dirtFlyAt(ticks, bit.to, { ...timing, delay: bit.delay })
		if (at.alpha <= 0) continue
		ctx.globalAlpha = alpha * at.alpha
		ctx.fillStyle = bit.colour
		ctx.fillRect(bit.x + at.x, bit.y + at.y, bit.size, bit.size)
	}
	ctx.globalAlpha = alpha
}

/**
 * How far `bits` get out of the box, `width` by `height`, of whatever
 * they're flung off, flying out to `to` and back to where they start,
 * for its Draw Hook's `drawReach`.
 */
export function flungReach(
	bits: readonly FlungBit[],
	width: number,
	height: number,
) {
	const reach = { left: 0, top: 0, right: 0, bottom: 0 }
	for (const bit of bits)
		for (const out of [0, 1]) {
			const x = bit.x + bit.to.x * out
			const y = bit.y + bit.to.y * out
			reach.left = Math.max(reach.left, -x)
			reach.top = Math.max(reach.top, -y)
			reach.right = Math.max(reach.right, x + bit.size - width)
			reach.bottom = Math.max(reach.bottom, y + bit.size - height)
		}
	return reach
}
