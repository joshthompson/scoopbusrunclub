/**
 * Baby Mode's bubble (see `Body['bubble']`): a soap bubble round someone
 * fallen, floating them back, painted in their Draw Hook over them. It
 * grows round them as it forms, and pops in a ring of drops.
 */

/** The grid's cell, as everything's drawn on. */
const CELL = 2
/** Its film, clear but for a tint; its sheen just inside its rim; its rim; and the light on it. */
const FILM = 'rgba(170, 225, 255, 0.16)'
const SHEEN = 'rgba(205, 175, 255, 0.4)'
const RIM = 'rgba(245, 252, 255, 0.85)'
const SHINE = 'rgba(255, 255, 255, 0.9)'

/** How much wider than its sprite's corner to corner it is, either side. */
const ROOM = 6
/** How far its drops fly out, popping, as a share of how big it was. */
const POP_OUT = 0.7
const DROPS = 10
const DROP = 4

/** How big round a sprite `width` by `height` the bubble is. */
const radiusOf = (width: number, height: number) =>
	Math.hypot(width, height) / 2 + ROOM

/**
 * How far past a sprite `width` by `height` its bubble paints, popping
 * too, for its Draw Hook's `drawReach`, every side.
 */
export function soapReach(width: number, height: number) {
	const out = radiusOf(width, height) * (1 + POP_OUT) + DROP
	return {
		left: Math.ceil(out - width / 2),
		right: Math.ceil(out - width / 2),
		top: Math.ceil(out - height / 2),
		bottom: Math.ceil(out - height / 2),
	}
}

/** Overshooting a little and settling: growing round them as it forms. */
const springy = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return 1 + 2.2 * (c - 1) ** 3 + 1.2 * (c - 1) ** 2
}

/**
 * The bubble round a sprite `width` by `height`, in its Draw Hook: `grow`
 * of the way formed (from 0), or `pop` of the way popped (from 0 to 1),
 * drops flying out and fading. `mirrored`, in a sprite turned round, so
 * its shine's still up on the left.
 */
export function paintSoapBubble(
	ctx: CanvasRenderingContext2D,
	props: {
		width: number
		height: number
		grow?: number
		pop?: number
		mirrored?: boolean
		now: number
	},
) {
	const { width, height, pop, now } = props
	const cx = width / 2
	const cy = height / 2
	const full = radiusOf(width, height)
	ctx.save()
	if (pop !== undefined) {
		// Popped: a ring of drops flying out, fading.
		const out = full * (1 + POP_OUT * Math.sqrt(pop))
		ctx.globalAlpha *= Math.max(0, 1 - pop)
		ctx.fillStyle = RIM
		for (let i = 0; i < DROPS; i++) {
			const turn = (i / DROPS) * Math.PI * 2 + 0.3
			const size = i % 2 ? DROP : CELL
			const snap = (n: number) => Math.round(n / CELL) * CELL
			ctx.fillRect(
				snap(cx + Math.cos(turn) * out - size / 2),
				snap(cy + Math.sin(turn) * out - size / 2),
				size,
				size,
			)
		}
		ctx.restore()
		return
	}
	// Wobbling a little as it floats.
	const wobble = Math.sin(now / 7) * 1.5
	const r = full * springy(props.grow ?? 1)
	if (r <= CELL) {
		ctx.restore()
		return
	}
	const rx = r + wobble
	const ry = r - wobble
	// Stepped in cells, on the grid, round its middle: a film of air, clear
	// but for a tint, a bright rim, a sheen just inside it, and the light on
	// it up on the left (on the right in a mirrored sprite, which turns it
	// back).
	const side = props.mirrored ? 1 : -1
	const reach = Math.ceil((r + 2) / CELL)
	const left = Math.round(cx / CELL)
	const top = Math.round(cy / CELL)
	for (let j = -reach; j <= reach; j++)
		for (let i = -reach; i <= reach; i++) {
			const dx = (i + 0.5) * CELL
			const dy = (j + 0.5) * CELL
			const d = Math.hypot(dx / rx, dy / ry) * r
			if (d >= r) continue
			const shine =
				d > r * 0.58 &&
				d < r * 0.74 &&
				dx * side > r * 0.1 &&
				dy < -r * 0.25 &&
				-dy > Math.abs(dx) * 0.35
			ctx.fillStyle =
				d >= r - CELL ? RIM : shine ? SHINE : d >= r - CELL * 2 ? SHEEN : FILM
			ctx.fillRect((left + i) * CELL, (top + j) * CELL, CELL, CELL)
		}
	ctx.restore()
}
