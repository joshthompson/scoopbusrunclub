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
	return risen(steps(timing.steps, progress))
}

/** Steam `t` of the way through rising: how far up, how big, and how faded. */
const risen = (t: number) => ({
	rise: -120 * t,
	scale: 0.6 + t,
	alpha: 0.95 * (1 - t),
})

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

/**
 * How far steam rising with `steam-rise` gets out of the box, `width` by
 * `height`, of whatever it's rising off, at its biggest and highest, for
 * its Draw Hook's `drawReach`: each group of `bits`, rising in its `steps`.
 */
export function steamReach(
	width: number,
	height: number,
	...groups: { bits: readonly SteamBit[]; steps: number }[]
) {
	const reach = { left: 0, top: 0, right: 0, bottom: 0 }
	for (const { bits, steps: n } of groups)
		for (const bit of bits) {
			const ring = bit.ring?.width ?? 0
			const middle = { x: bit.x + bit.width / 2, y: bit.y + bit.height / 2 }
			// Sat waiting, as big as it is; then each step of its rise.
			const at = [{ rise: 0, scale: 1 }]
			for (let step = 0; step < n; step++) at.push(risen(step / n))
			for (const { rise, scale } of at) {
				const across = (bit.width / 2 + ring) * scale
				const down = (bit.height / 2 + ring) * scale
				reach.left = Math.max(reach.left, across - middle.x)
				reach.right = Math.max(reach.right, middle.x + across - width)
				reach.top = Math.max(reach.top, down - middle.y - rise)
				reach.bottom = Math.max(reach.bottom, middle.y + rise + down - height)
			}
		}
	return {
		left: Math.ceil(reach.left),
		top: Math.ceil(reach.top),
		right: Math.ceil(reach.right),
		bottom: Math.ceil(reach.bottom),
	}
}
