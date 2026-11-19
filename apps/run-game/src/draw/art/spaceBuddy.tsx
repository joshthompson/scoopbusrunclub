import type { JSX } from 'solid-js'
import { paintedArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import { inkOutline } from '../paint/picture'
import type { CorgiPose } from './corgi'

/**
 * A space buddy, Rocket Launch's Ride, side on and facing right, in cells
 * twice the size of a screen pixel, as the corgi is: a little round alien,
 * teal, its one big eye looking on ahead, two antennae bobbling on top,
 * spots on its back, and stubby legs. Sat squashed down waiting, and the
 * two halves of a bound: gathered, and stretched out, legs flung wide.
 */

const CELL = 2
const COLUMNS = 26
const ROWS = 24

export const SPACE_BUDDY_WIDTH = COLUMNS * CELL
export const SPACE_BUDDY_HEIGHT = ROWS * CELL
/** How tall it is to its back, stood up: what you land on to ride it. */
export const SPACE_BUDDY_BACK = 30
/** How far above its feet whoever's riding it sits. */
export const SPACE_BUDDY_SADDLE = 28

const SKIN = '#3fc9b4'
const SKIN_LIT = '#8ff0de'
const SKIN_SHADE = '#25917f'
const SPOT = '#c86ae0'
const EYE = '#ffffff'
const PUPIL = '#1d1d1d'
const BALL = '#ffd23f'
const LEG = '#1f7a6b'

/**
 * Its body, `squash` cells flatter than round and as much wider, its
 * middle `down` cells lower than stood up; its eye, antennae and spots on it.
 */
function buddy(down: number, squash: number, legs: 'tucked' | 'under' | 'out') {
	const cx = 12.5
	const cy = 12 + down
	const rx = 9 + squash
	const ry = 8 - squash
	return paintedArt(COLUMNS, ROWS, (x, y) => {
		const px = x + 0.5
		const py = y + 0.5
		// Its antennae, up off its top, a ball on each.
		const top = cy - ry
		for (const [ax, lean] of [
			[9, -1],
			[15, 1],
		]) {
			const stalk = top - py
			if (
				stalk > 0 &&
				stalk < 4 &&
				Math.abs(px - (ax + (lean * stalk) / 3)) < 0.6
			)
				return SKIN_SHADE
			const bx = ax + lean * 1.4
			if (Math.hypot(px - bx, py - (top - 4.5)) < 1.4) return BALL
		}
		// Its legs, stubby, under it.
		const feet =
			legs === 'out'
				? [
						[5, -2],
						[20, 2],
					]
				: [
						[8, 0],
						[17, 0],
					]
		if (legs !== 'tucked')
			for (const [lx, lean] of feet) {
				const below = py - (cy + ry - 1)
				if (
					below > 0 &&
					below < 5 &&
					Math.abs(px - (lx + (lean * below) / 4)) < 1.2
				)
					return below > 3.5 ? PUPIL : LEG
			}
		// Its body.
		const d = ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2
		if (d > 1) return undefined
		// Its eye, big, on ahead.
		const ex = cx + rx * 0.45
		const ey = cy - ry * 0.25
		const eye = Math.hypot(px - ex, py - ey)
		if (eye < 1.2) return PUPIL
		if (eye < 3.2) return EYE
		// A spot or two on its back.
		if (Math.hypot(px - (cx - 4), py - (cy - 3)) < 1.4) return SPOT
		if (Math.hypot(px - (cx - 6), py - (cy + 1)) < 1) return SPOT
		// Lit on top, shaded underneath.
		if (py < cy - ry * 0.6 && d > 0.55) return SKIN_LIT
		if (py > cy + ry * 0.5) return SKIN_SHADE
		return SKIN
	})
}

/** Squashed down, waiting, its legs tucked under it. */
const SIT = buddy(4, 2, 'tucked')
/** Gathered, mid-bound: its legs under it. */
const CROUCH = buddy(1, 1, 'under')
/** Stretched out, mid-bound, tall, legs flung out. */
const LEAP = buddy(0, -1, 'out')

const ART: Record<CorgiPose, string> = { sit: SIT, crouch: CROUCH, leap: LEAP }

/** An ink outline round it, as the corgi has, so it stands out. */
export const SPACE_BUDDY_OUTLINE = inkOutline('#14302b')
const OUTLINE: JSX.CSSProperties = { filter: SPACE_BUDDY_OUTLINE.filter }

/** Its picture in `pose`, for a Draw Hook to paint, outlined. */
export const spaceBuddyPicture = (pose: CorgiPose) => ART[pose]

export function SpaceBuddyArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={ART[props.pose]}
				width={SPACE_BUDDY_WIDTH}
				height={SPACE_BUDDY_HEIGHT}
			/>
		</div>
	)
}
