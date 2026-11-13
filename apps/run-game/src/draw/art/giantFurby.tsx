import { Show } from 'solid-js'
import {
	GIANT_FUR,
	GIANT_FUR_DARK,
	GIANT_FUR_LIGHT,
} from '../../courses/kit/furbyScenery'
import { pixelPolygon } from '../../courses/kit/pixelArt'

/**
 * The Giant Furby's face, on the front of its head, facing left, at whoever's
 * coming: one great eye, looking at them, blinking now and then, a tuft over
 * it, and its beak, hanging shut over its mouth till someone's near, and
 * then swung up open, its tongue inside. Its front is `FACE_FRONT` in from
 * the drawing's left, its mouth's floor the drawing's bottom.
 */

export const FACE_WIDTH = 330
export const FACE_HEIGHT = 340
/** Where the front of its head is, in from the drawing's left: its beak juts out in front. */
export const FACE_FRONT = 110
/** How high its beak's hinge is, over its mouth's floor: its mouth's that tall. */
const HINGE = 215
const BEAK = '#f2a33a'
const BEAK_DARK = '#c77a1e'
const TONGUE = '#ff7fb0'
/** How big its eye's pixels are: big, as it is. */
const CELL = 4

/** To the nearest pixel of its eye. */
const snap = (n: number) => Math.round(n / CELL) * CELL

/**
 * An ellipse round `cx`, `cy`, `rx` across and `ry` down, in `CELL`s, a
 * row of them at a time, as a path: pixel art, not a smooth curve.
 */
function blob(cx: number, cy: number, rx: number, ry: number) {
	let d = ''
	for (let y = snap(cy - ry); y < cy + ry; y += CELL) {
		const across = (y + CELL / 2 - cy) / ry
		if (Math.abs(across) >= 1) continue
		const half = rx * Math.sqrt(1 - across * across)
		const left = snap(cx - half)
		const right = snap(cx + half)
		if (right > left) d += `M${left},${y}H${right}v${CELL}H${left}Z`
	}
	return d
}

export function GiantFurbyFace(props: {
	/** How far open its beak is, 0 to 1. */
	open: number
	/** Its eye shut, blinking. */
	blink: boolean
	/** Which way it's looking, -1 to 1 across, and down. */
	look: { x: number; y: number }
}) {
	const hingeY = FACE_HEIGHT - HINGE
	const eye = { x: snap(FACE_FRONT + 80), y: snap(FACE_HEIGHT - 285) }
	/** Where its iris and pupil are, looking: a whole pixel at a time. */
	const iris = () => ({
		x: eye.x + snap(props.look.x * 18),
		y: eye.y + snap(props.look.y * 12),
	})
	const pupil = () => ({
		x: eye.x + snap(props.look.x * 22),
		y: eye.y + snap(props.look.y * 14),
	})
	/** Its beak hangs down over its mouth, shut, and swings up, open: up's clockwise, its tip being on the left. */
	const angle = () => -50 + 65 * props.open
	/** Its upper beak's corners, turned round its hinge by `angle`. */
	const turned = (points: [number, number][]): [number, number][] => {
		const a = (angle() * Math.PI) / 180
		return points.map(([x, y]) => {
			const dx = x - FACE_FRONT
			const dy = y - hingeY
			return [
				FACE_FRONT + dx * Math.cos(a) - dy * Math.sin(a),
				hingeY + dx * Math.sin(a) + dy * Math.cos(a),
			]
		})
	}
	const upperBeak = () =>
		pixelPolygon(
			turned([
				[FACE_FRONT + 6, hingeY - 34],
				[FACE_FRONT - 110, hingeY + 6],
				[FACE_FRONT + 6, hingeY + 26],
			]),
			BEAK,
			CELL,
		) +
		pixelPolygon(
			turned([
				[FACE_FRONT - 110, hingeY + 6],
				[FACE_FRONT + 6, hingeY + 16],
				[FACE_FRONT + 6, hingeY + 26],
			]),
			BEAK_DARK,
			CELL,
		)
	return (
		<svg
			width={FACE_WIDTH}
			height={FACE_HEIGHT}
			viewBox={`0 0 ${FACE_WIDTH} ${FACE_HEIGHT}`}
			shape-rendering="crispEdges"
			style={{ display: 'block', overflow: 'visible' }}
			aria-hidden="true"
		>
			{/* Its tongue, on its mouth's floor, inside. */}
			<rect
				x={FACE_FRONT + 4}
				y={FACE_HEIGHT - 14}
				width={90}
				height={14}
				fill={TONGUE}
			/>
			<rect
				x={FACE_FRONT + 40}
				y={FACE_HEIGHT - 14}
				width={4}
				height={10}
				fill="#e0558f"
			/>
			{/* Its lower beak, jutting out along the floor. */}
			<g
				innerHTML={
					pixelPolygon(
						[
							[FACE_FRONT, FACE_HEIGHT - 30],
							[FACE_FRONT - 70, FACE_HEIGHT - 6],
							[FACE_FRONT - 70, FACE_HEIGHT],
							[FACE_FRONT, FACE_HEIGHT],
						],
						BEAK,
						CELL,
					) +
					pixelPolygon(
						[
							[FACE_FRONT - 70, FACE_HEIGHT - 6],
							[FACE_FRONT, FACE_HEIGHT - 8],
							[FACE_FRONT, FACE_HEIGHT],
							[FACE_FRONT - 70, FACE_HEIGHT],
						],
						BEAK_DARK,
						CELL,
					)
				}
			/>
			{/* Its eye, in pixels as big as it is: white, its iris, its pupil
			    and the light in it, a ring of shade round it. */}
			<path d={blob(eye.x, eye.y, 58, 50)} fill={GIANT_FUR_DARK} />
			<path d={blob(eye.x, eye.y, 50, 42)} fill="#ffffff" />
			<path d={blob(eye.x, eye.y + 30, 44, 14)} fill="#e6eef5" />
			<path d={blob(iris().x, iris().y, 26, 26)} fill="#3fc6b8" />
			<path d={blob(iris().x - 6, iris().y - 6, 14, 12)} fill="#6fe0d4" />
			<path d={blob(pupil().x, pupil().y, 13, 13)} fill="#1d1d1d" />
			<rect
				x={pupil().x + CELL}
				y={pupil().y - 3 * CELL}
				width={2 * CELL}
				height={2 * CELL}
				fill="#ffffff"
			/>
			{/* Its eyelid, down over it, blinking. */}
			<Show when={props.blink}>
				<path d={blob(eye.x, eye.y, 54, 46)} fill={GIANT_FUR} />
				<path
					d={`M${eye.x - 52},${eye.y}h104v${CELL}h-104Z`}
					fill={GIANT_FUR_DARK}
				/>
			</Show>
			{/* A tuft over its eye. */}
			<g
				innerHTML={pixelPolygon(
					[
						[eye.x - 60, eye.y - 46],
						[eye.x - 20, eye.y - 70],
						[eye.x + 30, eye.y - 64],
						[eye.x + 60, eye.y - 44],
						[eye.x, eye.y - 52],
					],
					GIANT_FUR_LIGHT,
					CELL,
				)}
			/>
			{/* Its upper beak, on its hinge, hanging down over its mouth or
			    swung up: turned on it first, then drawn in its pixels. */}
			<g innerHTML={upperBeak()} />
		</svg>
	)
}
