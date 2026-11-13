import { pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'

/**
 * A trophy, for a course's special goal: a cup, its handles, the light on
 * it, on a stand. With the goal not done yet, a shadow of one, as a medal
 * not got is (see `MedalArt`).
 */

const COLUMNS = 12
const ROWS = 14
const CUP = '#f4c430'
const CUP_DARK = '#b8861a'
const CUP_LIGHT = '#fff1a8'

const TROPHY = pixelArt(COLUMNS, ROWS, [
	// The cup, narrowing down to its stem, and its handles.
	[2, 0, 8, 1, CUP_DARK],
	[2, 1, 8, 4, CUP],
	[3, 5, 6, 1, CUP],
	[4, 6, 4, 1, CUP_DARK],
	[0, 1, 2, 1, CUP_DARK],
	[0, 2, 1, 2, CUP_DARK],
	[1, 4, 1, 1, CUP_DARK],
	[10, 1, 2, 1, CUP_DARK],
	[11, 2, 1, 2, CUP_DARK],
	[10, 4, 1, 1, CUP_DARK],
	[3, 1, 1, 3, CUP_LIGHT],
	[8, 1, 1, 4, CUP_DARK],
	// Its stem, and its stand.
	[5, 7, 2, 3, CUP_DARK],
	[3, 10, 6, 1, CUP],
	[2, 11, 8, 3, '#5a3a22'],
	[3, 12, 6, 1, CUP_LIGHT],
])

/** A trophy, `scale` px a pixel of it: a shadow of one, till `done`. */
export function TrophyArt(props: { done?: boolean; scale?: number }) {
	const scale = () => props.scale ?? 2
	return (
		<div
			style={{
				filter: props.done ? undefined : 'brightness(0) opacity(0.35)',
				display: 'inline-block',
				'line-height': 0,
			}}
		>
			<PixelArt
				src={TROPHY}
				width={COLUMNS * scale()}
				height={ROWS * scale()}
			/>
		</div>
	)
}
