import type { BusLook } from '../../courses/types'

/**
 * The bus's legs, a spider's, in place of its wheels, for climbing a
 * mountain: four down its near side, and four down its far side, behind it,
 * in shadow. Each a thigh up from its hip under the bus to a knee high over
 * it, and a shin down to a clawed foot on the ground. They crawl, two at a
 * time, the near side's first and third legs with the far side's second and
 * fourth: a foot stays put on the ground as the bus goes over it, then
 * steps up and on ahead.
 *
 * In the bus's own pixels, from its top left, its feet on the ground at
 * `ground`: drawn on the bus, so they lean with it, up the hill.
 */

/** How far out either side of the bus they're drawn, room for their knees and feet. */
export const LEGS_OUT = 60
/** The bus's own width, which they're drawn either side of. */
const BUS_WIDTH = 247
export const LEGS_WIDTH = BUS_WIDTH + LEGS_OUT * 2
export const LEGS_HEIGHT = 150

/** A thigh's length, and a shin's. */
const THIGH = 38
const SHIN = 44
/** How far the bus goes for each step a leg takes, start to finish. */
const STRIDE = 52
/** How much of a step a foot's down for: the rest, it's stepping. */
const STANCE = 0.6
/** How high a foot lifts, stepping. */
const LIFT = 14

/** Each leg's hip, along the bus and down it, how far out its foot rests, and where in its stride it starts. */
const LEGS = [
	{ hip: 34, down: 104, reach: -26, phase: 0 },
	{ hip: 92, down: 110, reach: -10, phase: 0.5 },
	{ hip: 156, down: 110, reach: 10, phase: 0 },
	{ hip: 214, down: 104, reach: 26, phase: 0.5 },
]

/** Where a leg's foot is, along from its rest and up off the ground, `travelled` px along. */
function footAt(travelled: number, phase: number) {
	const t = (((travelled / STRIDE + phase) % 1) + 1) % 1
	const reach = STANCE * STRIDE
	if (t < STANCE) return { along: reach / 2 - (t / STANCE) * reach, up: 0 }
	const s = (t - STANCE) / (1 - STANCE)
	return { along: -reach / 2 + s * reach, up: Math.sin(s * Math.PI) * LIFT }
}

/**
 * Its knee, between its hip and its foot: bent up, and out the way it
 * reaches, as a spider's is.
 */
function kneeAt(hx: number, hy: number, fx: number, fy: number, out: number) {
	const dx = fx - hx
	const dy = fy - hy
	const d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 1)
	const a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d)
	const h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a))
	const px = hx + (a * dx) / d
	const py = hy + (a * dy) / d
	const one = { x: px - (h * dy) / d, y: py + (h * dx) / d }
	const other = { x: px + (h * dy) / d, y: py - (h * dx) / d }
	const score = (k: { x: number; y: number }) => -k.y + out * (k.x - hx) * 0.6
	return score(one) > score(other) ? one : other
}

const snap = (n: number) => Math.round(n / 2) * 2

/** Where each leg's hip, knee and foot are, `travelled` px along. */
function legsAt(travelled: number, ground: number, far: boolean | undefined) {
	return LEGS.map((leg, i) => {
		const phase = far ? leg.phase + 0.5 : leg.phase
		const foot = footAt(travelled, phase)
		const hx = leg.hip + LEGS_OUT + (far ? 6 : 0)
		const hy = leg.down - (far ? 6 : 0)
		const fx = hx + leg.reach + foot.along
		const fy = ground - foot.up - (far ? 4 : 0)
		const knee = kneeAt(hx, hy, fx, fy, Math.sign(leg.reach))
		return {
			i,
			hip: { x: snap(hx), y: snap(hy) },
			knee: { x: snap(knee.x), y: snap(knee.y) },
			foot: { x: snap(fx), y: snap(fy) },
			out: Math.sign(leg.reach),
		}
	})
}

/** The ink they're outlined in, and their knees' bolts set in. */
const INK = '#2b2b2b'

/**
 * The legs, `travelled` px along, painted from the top left of the legs'
 * box, their feet on `ground`; the far side's in shadow, a step out from
 * the near side's. Painted again every time, since they step with every
 * tick.
 */
export function paintBusLegs(
	ctx: CanvasRenderingContext2D,
	look: NonNullable<BusLook['legs']>,
	travelled: number,
	ground: number,
	far?: boolean,
) {
	const metal = far ? look.shade : look.metal
	const bolt = far ? look.shade : look.bolt
	ctx.lineCap = 'square'
	const line = (
		a: { x: number; y: number },
		b: { x: number; y: number },
		stroke: string,
		width: number,
	) => {
		ctx.strokeStyle = stroke
		ctx.lineWidth = width
		ctx.beginPath()
		ctx.moveTo(a.x, a.y)
		ctx.lineTo(b.x, b.y)
		ctx.stroke()
	}
	for (const leg of legsAt(travelled, ground, far)) {
		// Outlined in ink, then its metal, lit along its top.
		line(leg.hip, leg.knee, INK, 10)
		line(leg.knee, leg.foot, INK, 8)
		line(leg.hip, leg.knee, metal, 6)
		line(leg.knee, leg.foot, metal, 4)
		// A clawed foot, gripping.
		ctx.fillStyle = look.foot
		ctx.fillRect(leg.foot.x - 5, leg.foot.y - 4, 10, 4)
		ctx.fillRect(leg.foot.x + (leg.out > 0 ? 3 : -7), leg.foot.y - 2, 4, 4)
		// Bolts at its knee and hip.
		ctx.fillStyle = INK
		ctx.fillRect(leg.knee.x - 4, leg.knee.y - 4, 8, 8)
		ctx.fillStyle = bolt
		ctx.fillRect(leg.knee.x - 2, leg.knee.y - 2, 4, 4)
		ctx.fillRect(leg.hip.x - 4, leg.hip.y - 4, 8, 8)
	}
}
