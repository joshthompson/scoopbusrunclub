import { pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'

/**
 * A gold star: for a course done completely, its gold medal, all its
 * collectables and its special goal.
 */

const COLUMNS = 11
const ROWS = 11
const GOLD = '#f4c430'
const DARK = '#b8861a'
const LIGHT = '#fff1a8'

const STAR = pixelArt(COLUMNS, ROWS, [
	[5, 0, 1, 2, GOLD],
	[4, 2, 3, 2, GOLD],
	[0, 4, 11, 1, GOLD],
	[1, 5, 9, 1, GOLD],
	[2, 6, 7, 1, GOLD],
	[2, 7, 7, 1, GOLD],
	[1, 8, 3, 1, GOLD],
	[7, 8, 3, 1, GOLD],
	[1, 9, 2, 1, GOLD],
	[8, 9, 2, 1, GOLD],
	[0, 10, 2, 1, DARK],
	[9, 10, 2, 1, DARK],
	// Its shading, and the light on it.
	[6, 5, 4, 1, DARK],
	[6, 6, 3, 2, DARK],
	[4, 3, 1, 2, LIGHT],
	[3, 5, 1, 1, LIGHT],
])

/** A star, `scale` px a pixel of it. */
export function StarArt(props: { scale?: number }) {
	const scale = () => props.scale ?? 2
	return (
		<div style={{ display: 'inline-block', 'line-height': 0 }}>
			<PixelArt src={STAR} width={COLUMNS * scale()} height={ROWS * scale()} />
		</div>
	)
}
