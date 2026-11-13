import type { JSX } from 'solid-js'
import { paintedArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import type { CorgiPose } from './corgi'

/**
 * A red blood cell, Karolinska's Ride, in the bloodstream: a fat red disc,
 * side on and facing right, thick at its rim and dished in the middle, the
 * way they are, a blue saddle cloth in its dip for riding on, and a face
 * on its front, cheerful. Sat waiting, bobbing in the flow; squashed a
 * little, going; stretched long, leaping. In cells twice the size of a
 * screen pixel, as the corgi is.
 */

const CELL = 2
const COLUMNS = 26
const ROWS = 14

export const BLOOD_CELL_WIDTH = COLUMNS * CELL
export const BLOOD_CELL_HEIGHT = ROWS * CELL
/** How tall it is to its rim: what you land on to ride it. */
export const BLOOD_CELL_BACK = 24
/** How far above its feet whoever's riding it sits, down in its dip. */
export const BLOOD_CELL_SADDLE = 18

const RED = '#d32f3f'
const DARK = '#9e1f2d'
const LIT = '#f0606c'
const DIP = '#b82536'
const CLOTH = '#2a6ac2'
const CLOTH_LIT = '#4a8ae2'
const INK = '#1d1d1d'

/**
 * The disc, `squash` as tall as it is sat still, `stretch` as long: thick
 * at its rim, dipped in the middle of its top, where its saddle is.
 */
const disc = (squash: number, stretch: number) =>
	paintedArt(COLUMNS, ROWS, (x, y) => {
		const cx = COLUMNS / 2
		const bottom = ROWS - 1
		const rx = 12.5 * stretch
		const ry = 6.4 * squash
		const cy = bottom - ry
		const dx = (x - cx) / rx
		if (Math.abs(dx) > 1) return undefined
		// Its top: dished down in the middle, its rim up either side.
		const dish = 3.4 * squash * Math.exp(-((dx * 2.2) ** 2))
		const top = cy - ry * Math.sqrt(1 - dx * dx) + dish
		const under = cy + ry * Math.sqrt(1 - dx * dx)
		if (y < top || y > under) return undefined
		// Its saddle cloth, in the dip.
		if (Math.abs(dx) < 0.36 && y < top + 2)
			return y < top + 1 ? CLOTH_LIT : CLOTH
		// Its face, on its front.
		if (
			y > cy - 3 &&
			y < cy - 1 &&
			(Math.abs(x - (cx + rx - 4)) < 0.6 || Math.abs(x - (cx + rx - 6.5)) < 0.6)
		)
			return INK
		if (Math.abs(y - (cy + 1)) < 0.55 && x > cx + rx - 7 && x < cx + rx - 3.5)
			return DARK
		if (y > under - 1.4) return DARK
		if (y < top + 1.2 && Math.abs(dx) > 0.36) return LIT
		if (Math.abs(dx) < 0.5 && y < top + 3.5) return DIP
		return RED
	})

const ART: Record<CorgiPose, string> = {
	sit: disc(1, 1),
	crouch: disc(0.88, 1),
	leap: disc(0.94, 1),
}

/** An ink outline round it, as the corgi has, so it stands out against the artery's red. */
const OUTLINE: JSX.CSSProperties = {
	filter: [
		'drop-shadow(2px 0 0 #3a0a10)',
		'drop-shadow(-2px 0 0 #3a0a10)',
		'drop-shadow(0 2px 0 #3a0a10)',
		'drop-shadow(0 -2px 0 #3a0a10)',
	].join(' '),
}

export function BloodCellArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={ART[props.pose]}
				width={BLOOD_CELL_WIDTH}
				height={BLOOD_CELL_HEIGHT}
			/>
		</div>
	)
}
