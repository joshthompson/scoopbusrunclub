import {
	GIANT_FUR,
	GIANT_FUR_DARK,
	GIANT_FUR_LIGHT,
} from '../../courses/kit/furbyScenery'

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

export function GiantFurbyFace(props: {
	/** How far open its beak is, 0 to 1. */
	open: number
	/** Its eye shut, blinking. */
	blink: boolean
	/** Which way it's looking, -1 to 1 across, and down. */
	look: { x: number; y: number }
}) {
	const hingeY = FACE_HEIGHT - HINGE
	const eye = { x: FACE_FRONT + 80, y: FACE_HEIGHT - 285 }
	/** Its beak hangs down over its mouth, shut, and swings up, open: up's clockwise, its tip being on the left. */
	const angle = () => -50 + 65 * props.open
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
			<polygon
				points={`${FACE_FRONT},${FACE_HEIGHT - 30} ${FACE_FRONT - 70},${FACE_HEIGHT - 6} ${FACE_FRONT - 70},${FACE_HEIGHT} ${FACE_FRONT},${FACE_HEIGHT}`}
				fill={BEAK}
			/>
			<polygon
				points={`${FACE_FRONT - 70},${FACE_HEIGHT - 6} ${FACE_FRONT},${FACE_HEIGHT - 8} ${FACE_FRONT},${FACE_HEIGHT} ${FACE_FRONT - 70},${FACE_HEIGHT}`}
				fill={BEAK_DARK}
			/>
			{/* Its eye: white, its iris, its pupil and the light in it. */}
			<ellipse cx={eye.x} cy={eye.y} rx={58} ry={50} fill={GIANT_FUR_DARK} />
			<ellipse cx={eye.x} cy={eye.y} rx={50} ry={42} fill="#ffffff" />
			<circle
				cx={eye.x + props.look.x * 18}
				cy={eye.y + props.look.y * 12}
				r={26}
				fill="#3fc6b8"
			/>
			<circle
				cx={eye.x + props.look.x * 22}
				cy={eye.y + props.look.y * 14}
				r={13}
				fill="#1d1d1d"
			/>
			<rect
				x={eye.x + props.look.x * 22 + 2}
				y={eye.y + props.look.y * 14 - 10}
				width={8}
				height={8}
				fill="#ffffff"
			/>
			{/* Its eyelid, down over it, blinking. */}
			<ellipse
				cx={eye.x}
				cy={eye.y}
				rx={52}
				ry={props.blink ? 46 : 0}
				fill={GIANT_FUR}
			/>
			{/* A tuft over its eye. */}
			<polygon
				points={`${eye.x - 60},${eye.y - 46} ${eye.x - 20},${eye.y - 70} ${eye.x + 30},${eye.y - 64} ${eye.x + 60},${eye.y - 44} ${eye.x},${eye.y - 52}`}
				fill={GIANT_FUR_LIGHT}
			/>
			{/* Its upper beak, on its hinge, hanging down over its mouth or swung up. */}
			<g transform={`rotate(${angle()} ${FACE_FRONT} ${hingeY})`}>
				<polygon
					points={`${FACE_FRONT + 6},${hingeY - 34} ${FACE_FRONT - 110},${hingeY + 6} ${FACE_FRONT + 6},${hingeY + 26}`}
					fill={BEAK}
				/>
				<polygon
					points={`${FACE_FRONT - 110},${hingeY + 6} ${FACE_FRONT + 6},${hingeY + 16} ${FACE_FRONT + 6},${hingeY + 26}`}
					fill={BEAK_DARK}
				/>
			</g>
		</svg>
	)
}
