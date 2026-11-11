import type { JSX } from 'solid-js'
import crouch from '../../assets/rides/corgi-crouch.png'
import leap from '../../assets/rides/corgi-leap.png'
import sit from '../../assets/rides/corgi-sit.png'
import { PixelArt } from '../PixelArt'

/**
 * A corgi, saddled for riding, side on and facing right, in cells twice the
 * size of a screen pixel, the same as the runners: sat, and the two halves of
 * a gallop, gathered up and stretched out.
 */
export type CorgiPose = 'sit' | 'crouch' | 'leap'

const CELL = 2
/** The art's size, in cells. */
const COLUMNS = 22
const ROWS = 15

/** Its size on the screen. */
export const CORGI_WIDTH = COLUMNS * CELL
export const CORGI_HEIGHT = ROWS * CELL
/** How tall it is to the top of its head, not counting its ears: what you land on to ride it. */
export const CORGI_HEAD = 24

const ART: Record<CorgiPose, string> = { sit, crouch, leap }

/** An ink outline round it, so it stands out against Furby Fields. */
const OUTLINE: JSX.CSSProperties = {
	filter: [
		'drop-shadow(2px 0 0 #0f1f29)',
		'drop-shadow(-2px 0 0 #0f1f29)',
		'drop-shadow(0 2px 0 #0f1f29)',
		'drop-shadow(0 -2px 0 #0f1f29)',
	].join(' '),
}

export function CorgiArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={ART[props.pose]}
				width={CORGI_WIDTH}
				height={CORGI_HEIGHT}
			/>
		</div>
	)
}
