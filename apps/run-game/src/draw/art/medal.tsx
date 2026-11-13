import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import type { Medal } from '../../game/medals'
import { PixelArt } from '../PixelArt'

/**
 * A medal, on its ribbon: gold, silver or bronze, its rim darker, the light
 * on it, and a star struck on it. With none got yet, a shadow of one, as a
 * collectable not yet had is (see `CollectablesScreen`).
 */

const COLUMNS = 10
const ROWS = 15

/** Its metal: its face, its rim, and the light on it. */
const METALS: Record<Medal, [string, string, string]> = {
	gold: ['#f4c430', '#b8861a', '#fff1a8'],
	silver: ['#d3dae2', '#8a95a3', '#ffffff'],
	bronze: ['#d08a4e', '#8e5527', '#f2c09a'],
}

const medal = (kind: Medal) => {
	const [face, rim, light] = METALS[kind]
	const rects: PixelRect[] = [
		// Its ribbon, a V down to it, red and blue.
		[1, 0, 3, 2, '#d8342c'],
		[2, 2, 3, 2, '#d8342c'],
		[3, 4, 2, 2, '#a5241e'],
		[6, 0, 3, 2, '#2f5fb3'],
		[5, 2, 3, 2, '#2f5fb3'],
		[5, 4, 2, 2, '#244a8c'],
		// The medal: round, its rim darker.
		[3, 6, 4, 1, rim],
		[2, 7, 6, 1, rim],
		[1, 8, 8, 5, rim],
		[2, 13, 6, 1, rim],
		[3, 14, 4, 1, rim],
		[3, 7, 4, 1, face],
		[2, 8, 6, 5, face],
		[3, 13, 4, 1, face],
		// A star struck on it, and the light on it.
		[4, 9, 2, 3, rim],
		[3, 10, 4, 1, rim],
		[3, 8, 1, 2, light],
		[2, 9, 1, 1, light],
	]
	return pixelArt(COLUMNS, ROWS, rects)
}

const ART: Record<Medal, string> = {
	gold: medal('gold'),
	silver: medal('silver'),
	bronze: medal('bronze'),
}

/** A medal, `scale` px a pixel of it: a shadow of one, if it's none. */
export function MedalArt(props: { medal?: Medal; scale?: number }) {
	const scale = () => props.scale ?? 2
	return (
		<div
			style={{
				filter: props.medal ? undefined : 'brightness(0) opacity(0.35)',
				display: 'inline-block',
				'line-height': 0,
			}}
		>
			<PixelArt
				src={ART[props.medal ?? 'gold']}
				width={COLUMNS * scale()}
				height={ROWS * scale()}
			/>
		</div>
	)
}
