import type { JSX } from 'solid-js'
import crouch from '../../assets/rides/llama-crouch.png'
import leap from '../../assets/rides/llama-leap.png'
import sit from '../../assets/rides/llama-sit.png'
import { PixelArt } from '../PixelArt'
import type { CorgiPose } from './corgi'

/**
 * A llama, Machu Picchu's Ride, side on and facing right, in cells twice the
 * size of a screen pixel, as the corgi is: lying down waiting (a llama
 * kneels, folding its legs under it), and the two halves of a gallop. An
 * Andean blanket over its back, for riding on.
 */

const CELL = 2
const COLUMNS = 24
const ROWS = 26

export const LLAMA_WIDTH = COLUMNS * CELL
export const LLAMA_HEIGHT = ROWS * CELL
/** How tall it is to its back, stood up: what you land on to ride it. */
export const LLAMA_BACK = 30
/** How far above its feet whoever's riding it sits. */
export const LLAMA_SADDLE = 26

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

export function LlamaArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={ART[props.pose]}
				width={LLAMA_WIDTH}
				height={LLAMA_HEIGHT}
			/>
		</div>
	)
}
