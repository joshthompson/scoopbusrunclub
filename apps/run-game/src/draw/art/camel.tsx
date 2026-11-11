import type { JSX } from 'solid-js'
import crouch from '../../assets/rides/camel-crouch.png'
import leap from '../../assets/rides/camel-leap.png'
import sit from '../../assets/rides/camel-sit.png'
import { PixelArt } from '../PixelArt'
import type { CorgiPose } from './corgi'

/**
 * A camel, the Pyramids' Ride, side on and facing right, in cells twice the
 * size of a screen pixel, as the corgi and the llama are: knelt down waiting,
 * its legs folded under it, and the two halves of a stride. A striped
 * blanket over its hump, for riding on.
 */

const CELL = 2
const COLUMNS = 30
const ROWS = 30

export const CAMEL_WIDTH = COLUMNS * CELL
export const CAMEL_HEIGHT = ROWS * CELL
/** How tall it is to its hump, stood up: what you land on to ride it. */
export const CAMEL_BACK = 48
/** How far above its feet whoever's riding it sits: down in the blanket, on its hump. */
export const CAMEL_SADDLE = 42

const ART: Record<CorgiPose, string> = { sit, crouch, leap }

/** An ink outline round it, as the corgi has, so it stands out. */
const OUTLINE: JSX.CSSProperties = {
	filter: [
		'drop-shadow(2px 0 0 #2b2b2b)',
		'drop-shadow(-2px 0 0 #2b2b2b)',
		'drop-shadow(0 2px 0 #2b2b2b)',
		'drop-shadow(0 -2px 0 #2b2b2b)',
	].join(' '),
}

export function CamelArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={ART[props.pose]}
				width={CAMEL_WIDTH}
				height={CAMEL_HEIGHT}
			/>
		</div>
	)
}
