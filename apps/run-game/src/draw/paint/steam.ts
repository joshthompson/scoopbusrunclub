import { TICK_MS } from '../../game/constants'
import { cycle, steps } from './animation'

/**
 * The `steam-rise` animation (in `styles.css`), worked out for painting on
 * the Canvas Renderer, where CSS animations don't play: steam rising 120 px
 * off a vent, growing from 0.6 of its size to 1.6, and fading as it goes,
 * in `steps` jumps over `seconds`; then again, over and over.
 *
 * Before its `delay` it sits where it is, as big as it is, not faded, as
 * CSS leaves it. `ticks` is how long it's been going: the world's ticks,
 * where under the DOM Renderer it's real time, since the page put it there.
 */
export function steamRiseAt(
	ticks: number,
	timing: { seconds: number; steps: number; delay: number },
) {
	const progress = cycle((ticks * TICK_MS) / 1000, timing.seconds, timing.delay)
	if (progress === undefined) return { rise: 0, scale: 1, alpha: 1 }
	const t = steps(timing.steps, progress)
	return { rise: -120 * t, scale: 0.6 + t, alpha: 0.95 * (1 - t) }
}

/**
 * A bit of steam, a square `<div>` under the DOM Renderer: its top left,
 * its size and colour, a ring round it (its `box-shadow`'s spread), if it
 * has one, and when it starts rising.
 */
export interface SteamBit {
	x: number
	y: number
	width: number
	height: number
	colour: string
	ring?: { width: number; colour: string }
	delay: number
}

/**
 * Bits of steam rising with `steam-rise`, painted where they've got to after
 * `ticks`: each grown and shrunk about its middle, as CSS transforms it.
 */
export function paintSteam(
	ctx: CanvasRenderingContext2D,
	ticks: number,
	bits: readonly SteamBit[],
	timing: { seconds: number; steps: number },
) {
	const alpha = ctx.globalAlpha
	for (const bit of bits) {
		const at = steamRiseAt(ticks, { ...timing, delay: bit.delay })
		if (at.alpha <= 0) continue
		ctx.save()
		ctx.globalAlpha = alpha * at.alpha
		ctx.translate(bit.x + bit.width / 2, bit.y + bit.height / 2 + at.rise)
		ctx.scale(at.scale, at.scale)
		const left = -bit.width / 2
		const top = -bit.height / 2
		if (bit.ring) {
			// Only outside it, as a box shadow is.
			const r = bit.ring.width
			ctx.beginPath()
			ctx.rect(left - r, top - r, bit.width + r * 2, bit.height + r * 2)
			ctx.rect(left, top, bit.width, bit.height)
			ctx.fillStyle = bit.ring.colour
			ctx.fill('evenodd')
		}
		ctx.fillStyle = bit.colour
		ctx.fillRect(left, top, bit.width, bit.height)
		ctx.restore()
	}
}
