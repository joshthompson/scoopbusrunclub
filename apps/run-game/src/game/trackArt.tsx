import { Pixels } from './Pixels'

/**
 * A running track's hazards, as pixel art: a hurdle, standing or knocked
 * over, and a pothole in the track.
 */

export const HURDLE_WIDTH = 32
export const HURDLE_HEIGHT = 42
/** How deep a pothole's drawn, and how far of that is above the line everyone runs along. */
export const POTHOLE_HEIGHT = 10
export const POTHOLE_ABOVE = 4

const RED = '#e0382f'
const RED_DARK = '#9a2b22'
const WHITE = '#f4f4f4'
const LEG = '#d9dde0'
const FOOT = '#5a6166'

const HURDLE: [number, number, number, number, string][] = [
	// The bar, striped red and white, its underside in shadow
	[0, 0, 8, 8, RED],
	[8, 0, 8, 8, WHITE],
	[16, 0, 8, 8, RED],
	[24, 0, 8, 8, WHITE],
	[0, 8, 32, 2, RED_DARK],
	// Its legs and feet
	[3, 10, 3, 30, LEG],
	[26, 10, 3, 30, LEG],
	[0, 40, 10, 2, FOOT],
	[22, 40, 10, 2, FOOT],
]

/**
 * A hurdle. Knocked over, it's tipped onto the track, the way it was run
 * into: set `--knocked` to 1 on something round it to knock it over, which a
 * sprite's style can do every tick.
 */
export function HurdleArt() {
	return (
		<div
			style={{
				'transform-origin': '100% 100%',
				transform: 'rotate(calc(var(--knocked, 0) * 78deg))',
				transition: 'transform 120ms ease-in',
			}}
		>
			<Pixels width={HURDLE_WIDTH} height={HURDLE_HEIGHT} rects={HURDLE} />
		</div>
	)
}

/** A pothole, `width` across: a dark hole with a broken rim. */
export function PotholeArt(props: { width: number }) {
	const w = props.width
	return (
		<Pixels
			width={w}
			height={POTHOLE_HEIGHT}
			rects={[
				[4, 0, w - 8, 2, '#8f3a29'],
				[0, 2, w, 6, '#3b1f17'],
				[6, 3, w - 12, 3, '#22110b'],
				[4, 8, w - 8, 2, '#8f3a29'],
			]}
		/>
	)
}
