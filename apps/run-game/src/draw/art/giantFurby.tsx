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
const TONGUE_DARK = '#e0558f'
const EYE_SHADE = '#e6eef5'
const IRIS = '#3fc6b8'
const IRIS_LIGHT = '#6fe0d4'
const PUPIL = '#1d1d1d'
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

/** How it looks this tick. */
export interface FaceLook {
	/** How far open its beak is, 0 to 1. */
	open: number
	/** Its eye shut, blinking. */
	blink: boolean
	/** Which way it's looking, -1 to 1 across, and down. */
	look: { x: number; y: number }
}

const hingeY = FACE_HEIGHT - HINGE
const eye = { x: snap(FACE_FRONT + 80), y: snap(FACE_HEIGHT - 285) }
/** Where its iris and pupil are, looking: a whole pixel at a time. */
const irisAt = (look: FaceLook['look']) => ({
	x: eye.x + snap(look.x * 18),
	y: eye.y + snap(look.y * 12),
})
const pupilAt = (look: FaceLook['look']) => ({
	x: eye.x + snap(look.x * 22),
	y: eye.y + snap(look.y * 14),
})

/**
 * Its upper beak, on its hinge, hanging down over its mouth or swung up:
 * turned on it first, then drawn in its pixels. Its light side and its
 * dark, as SVG markup.
 */
function upperBeak(open: number) {
	/** Its beak hangs down over its mouth, shut, and swings up, open: up's clockwise, its tip being on the left. */
	const a = ((-50 + 65 * open) * Math.PI) / 180
	/** Its upper beak's corners, turned round its hinge by `a`. */
	const turned = (points: [number, number][]): [number, number][] =>
		points.map(([x, y]) => {
			const dx = x - FACE_FRONT
			const dy = y - hingeY
			return [
				FACE_FRONT + dx * Math.cos(a) - dy * Math.sin(a),
				hingeY + dx * Math.sin(a) + dy * Math.cos(a),
			]
		})
	return [
		pixelPolygon(
			turned([
				[FACE_FRONT + 6, hingeY - 34],
				[FACE_FRONT - 110, hingeY + 6],
				[FACE_FRONT + 6, hingeY + 26],
			]),
			BEAK,
			CELL,
		),
		pixelPolygon(
			turned([
				[FACE_FRONT - 110, hingeY + 6],
				[FACE_FRONT + 6, hingeY + 16],
				[FACE_FRONT + 6, hingeY + 26],
			]),
			BEAK_DARK,
			CELL,
		),
	]
}

/** Its lower beak, jutting out along the floor: its light side and its dark. */
const lowerBeak = () => [
	pixelPolygon(
		[
			[FACE_FRONT, FACE_HEIGHT - 30],
			[FACE_FRONT - 70, FACE_HEIGHT - 6],
			[FACE_FRONT - 70, FACE_HEIGHT],
			[FACE_FRONT, FACE_HEIGHT],
		],
		BEAK,
		CELL,
	),
	pixelPolygon(
		[
			[FACE_FRONT - 70, FACE_HEIGHT - 6],
			[FACE_FRONT, FACE_HEIGHT - 8],
			[FACE_FRONT, FACE_HEIGHT],
			[FACE_FRONT - 70, FACE_HEIGHT],
		],
		BEAK_DARK,
		CELL,
	),
]

/** A tuft over its eye. */
const tuft = () =>
	pixelPolygon(
		[
			[eye.x - 60, eye.y - 46],
			[eye.x - 20, eye.y - 70],
			[eye.x + 30, eye.y - 64],
			[eye.x + 60, eye.y - 44],
			[eye.x, eye.y - 52],
		],
		GIANT_FUR_LIGHT,
		CELL,
	)

/** Rects' SVG markup, as one path to fill: they're all one colour. */
function rectsPath(markup: string) {
	const path = new Path2D()
	for (const [, x, y, width, height] of markup.matchAll(
		/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g,
	))
		path.rect(Number(x), Number(y), Number(width), Number(height))
	return path
}

/** Each path, built once: its eye's few shapes, wherever it's looking. */
const paths = new Map<string, Path2D>()
const pathOf = (d: string) => {
	let path = paths.get(d)
	if (!path) {
		path = new Path2D(d)
		paths.set(d, path)
	}
	return path
}
/** Its beaks' and its tuft's pixels, the same every time. */
let still: { lower: Path2D[]; tuft: Path2D } | undefined
/** Its upper beak, built again only as it swings. */
let swung: { open: number; beak: Path2D[] } | undefined

/** The face, painted from (0, 0). */
export function paintGiantFurbyFace(
	ctx: CanvasRenderingContext2D,
	{ open, blink, look }: FaceLook,
) {
	still ??= { lower: lowerBeak().map(rectsPath), tuft: rectsPath(tuft()) }
	if (swung?.open !== open)
		swung = { open, beak: upperBeak(open).map(rectsPath) }
	const fill = (colour: string, path: Path2D) => {
		ctx.fillStyle = colour
		ctx.fill(path)
	}
	const iris = irisAt(look)
	const pupil = pupilAt(look)
	// Its tongue, on its mouth's floor, inside; its lower beak, jutting out
	// along the floor.
	ctx.fillStyle = TONGUE
	ctx.fillRect(FACE_FRONT + 4, FACE_HEIGHT - 14, 90, 14)
	ctx.fillStyle = TONGUE_DARK
	ctx.fillRect(FACE_FRONT + 40, FACE_HEIGHT - 14, 4, 10)
	fill(BEAK, still.lower[0])
	fill(BEAK_DARK, still.lower[1])
	// Its eye, in pixels as big as it is: white, its iris, its pupil and the
	// light in it, a ring of shade round it.
	fill(GIANT_FUR_DARK, pathOf(blob(eye.x, eye.y, 58, 50)))
	fill('#ffffff', pathOf(blob(eye.x, eye.y, 50, 42)))
	fill(EYE_SHADE, pathOf(blob(eye.x, eye.y + 30, 44, 14)))
	fill(IRIS, pathOf(blob(iris.x, iris.y, 26, 26)))
	fill(IRIS_LIGHT, pathOf(blob(iris.x - 6, iris.y - 6, 14, 12)))
	fill(PUPIL, pathOf(blob(pupil.x, pupil.y, 13, 13)))
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(pupil.x + CELL, pupil.y - 3 * CELL, 2 * CELL, 2 * CELL)
	// Its eyelid, down over it, blinking.
	if (blink) {
		fill(GIANT_FUR, pathOf(blob(eye.x, eye.y, 54, 46)))
		ctx.fillStyle = GIANT_FUR_DARK
		ctx.fillRect(eye.x - 52, eye.y, 104, CELL)
	}
	// A tuft over its eye; its upper beak, on its hinge, hanging down over
	// its mouth or swung up.
	fill(GIANT_FUR_LIGHT, still.tuft)
	fill(BEAK, swung.beak[0])
	fill(BEAK_DARK, swung.beak[1])
}
