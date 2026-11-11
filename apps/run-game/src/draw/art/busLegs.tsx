import { For } from 'solid-js'
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

export function BusLegs(props: {
	look: NonNullable<BusLook['legs']>
	/** How far the bus has come: what the legs step with. */
	travelled: () => number
	/** Where the ground is, down from the bus's top. */
	ground: number
	/** Its far side's, behind it, in shadow, a step out from the near side's. */
	far?: boolean
}) {
	const legs = () =>
		LEGS.map((leg, i) => {
			const phase = props.far ? leg.phase + 0.5 : leg.phase
			const foot = footAt(props.travelled(), phase)
			const hx = leg.hip + LEGS_OUT + (props.far ? 6 : 0)
			const hy = leg.down - (props.far ? 6 : 0)
			const fx = hx + leg.reach + foot.along
			const fy = props.ground - foot.up - (props.far ? 4 : 0)
			const knee = kneeAt(hx, hy, fx, fy, Math.sign(leg.reach))
			return {
				i,
				hip: { x: snap(hx), y: snap(hy) },
				knee: { x: snap(knee.x), y: snap(knee.y) },
				foot: { x: snap(fx), y: snap(fy) },
				out: Math.sign(leg.reach),
			}
		})
	const metal = () => (props.far ? props.look.shade : props.look.metal)
	const line = (
		a: { x: number; y: number },
		b: { x: number; y: number },
		stroke: string,
		width: number,
	) => (
		<line
			x1={a.x}
			y1={a.y}
			x2={b.x}
			y2={b.y}
			stroke={stroke}
			stroke-width={width}
			stroke-linecap="square"
		/>
	)
	return (
		<svg
			width={LEGS_WIDTH}
			height={LEGS_HEIGHT}
			shape-rendering="crispEdges"
			aria-hidden="true"
			style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
		>
			<For each={legs()}>
				{(leg) => (
					<g>
						{/* Outlined in ink, then its metal, lit along its top. */}
						{line(leg.hip, leg.knee, '#2b2b2b', 10)}
						{line(leg.knee, leg.foot, '#2b2b2b', 8)}
						{line(leg.hip, leg.knee, metal(), 6)}
						{line(leg.knee, leg.foot, metal(), 4)}
						{/* A clawed foot, gripping. */}
						<rect
							x={leg.foot.x - 5}
							y={leg.foot.y - 4}
							width={10}
							height={4}
							fill={props.look.foot}
						/>
						<rect
							x={leg.foot.x + (leg.out > 0 ? 3 : -7)}
							y={leg.foot.y - 2}
							width={4}
							height={4}
							fill={props.look.foot}
						/>
						{/* Bolts at its knee and hip. */}
						<rect
							x={leg.knee.x - 4}
							y={leg.knee.y - 4}
							width={8}
							height={8}
							fill="#2b2b2b"
						/>
						<rect
							x={leg.knee.x - 2}
							y={leg.knee.y - 2}
							width={4}
							height={4}
							fill={props.far ? props.look.shade : props.look.bolt}
						/>
						<rect
							x={leg.hip.x - 4}
							y={leg.hip.y - 4}
							width={8}
							height={8}
							fill={props.far ? props.look.shade : props.look.bolt}
						/>
					</g>
				)}
			</For>
		</svg>
	)
}
