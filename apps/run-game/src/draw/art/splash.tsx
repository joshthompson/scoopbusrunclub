/**
 * A splash, as someone goes into the sea: a column of water bursting up
 * where they went in, spray flying out either side and falling back, and
 * foam spreading out over the water. `age` ticks in, by the tick, so the
 * same on every screen. Its middle is the drawing's middle, at the sea's
 * surface `SPLASH_UP` down from its top.
 */

export const SPLASH_WIDTH = 120
export const SPLASH_UP = 110
export const SPLASH_HEIGHT = SPLASH_UP + 20
/** How long one lasts. */
export const SPLASH_TICKS = 50

const WATER = '#e9f6ff'
const SPRAY = '#bfe3f7'
const FALL = 0.32

/** Spray: how fast out, how fast up, and how big, a drop each. */
const DROPS: [number, number, number][] = [
	[-2.2, 6.5, 6],
	[-1.4, 8, 4],
	[-0.6, 9, 6],
	[0.6, 9.5, 4],
	[1.4, 8, 6],
	[2.2, 6.5, 4],
	[-3, 5, 4],
	[3, 5, 4],
	[-1, 7, 4],
	[1, 7.5, 6],
]

const snap = (n: number) => Math.round(n / 2) * 2

/** Where drop `[vx, vy]` is, `t` ticks in: the middle of it across, and its top, out from the splash's middle, up and falling back. */
const dropAt = (vx: number, vy: number, t: number) => ({
	x: SPLASH_WIDTH / 2 + vx * t * 1.6,
	y: SPLASH_UP - (vy * t - (FALL * t * t) / 2),
})
/** Whether a drop's fallen back into the sea, out of sight. */
const sunk = (y: number) => y > SPLASH_UP + 4

/**
 * How far a splash's spray, and its foam, get out of its box, all the
 * while it lasts, for its Draw Hook's `drawReach`: worked out once.
 */
export const SPLASH_REACH = (() => {
	let left = 0
	let right = 0
	let top = 0
	for (let t = 0; t <= SPLASH_TICKS; t++) {
		for (const [vx, vy, size] of DROPS) {
			const at = dropAt(vx, vy, t)
			if (sunk(at.y)) continue
			const x = snap(at.x - size / 2)
			left = Math.max(left, -x)
			right = Math.max(right, x + size - SPLASH_WIDTH)
			top = Math.max(top, -snap(at.y))
		}
		const foam = snap(SPLASH_WIDTH / 2 - 12 - t * 1.1)
		left = Math.max(left, -foam)
		right = Math.max(right, foam + snap(24 + t * 2.2) - SPLASH_WIDTH)
	}
	return { left, right, top }
})()

/** The splash, painted `age` ticks in, from the top left of its box. */
export function paintSplash(ctx: CanvasRenderingContext2D, age: number) {
	const t = Math.max(0, age)
	const column = t < 26 ? Math.sin((t / 26) * Math.PI) * 70 : 0
	const middle = SPLASH_WIDTH / 2
	if (t > SPLASH_TICKS - 10) ctx.globalAlpha *= (SPLASH_TICKS - t) / 10
	ctx.fillStyle = WATER
	ctx.fillRect(middle - 8, snap(SPLASH_UP - column), 16, snap(column))
	ctx.fillStyle = SPRAY
	ctx.fillRect(
		middle - 14,
		snap(SPLASH_UP - column * 0.4),
		28,
		snap(column * 0.4),
	)
	for (const [vx, vy, size] of DROPS) {
		const { x, y } = dropAt(vx, vy, t)
		if (sunk(y)) continue
		ctx.fillStyle = size > 4 ? WATER : SPRAY
		ctx.fillRect(snap(x - size / 2), snap(y), size, size)
	}
	ctx.globalAlpha *= 0.85
	ctx.fillStyle = WATER
	ctx.fillRect(
		snap(middle - 12 - t * 1.1),
		SPLASH_UP - 2,
		snap(24 + t * 2.2),
		6,
	)
}
