import { For } from 'solid-js'
import { pixelArt } from '../../courses/kit/pixelArt'
import { RUNNER_SCALE } from '../../game/constants'
import { touristSprite } from '../../runners/tourists'
import { PixelArt } from '../PixelArt'

/**
 * Tourists stood about in the street: made up, as custom runners are, but
 * dressed for sightseeing (see `touristLook`), each facing whichever way,
 * some with a phone up, each with their suitcase beside them, on its
 * wheels, its handle up. Who's who, and which way they face, comes from
 * where they stand, so it's the same on every screen.
 */

/** How far apart they stand, and how tall they are, for running into. */
const TOURIST_SPACING = 26
/**
 * How far either side of the path's middle they stand, nearer or further
 * back, each their own: room for it under the group's feet, as drawn.
 */
const NEARER = 8
const FURTHER = 6
export const TOURISTS_DEPTH_ROOM = NEARER
export const TOURISTS_HEIGHT = 52
const TOURIST_WIDTH = 23 * RUNNER_SCALE

/** How wide a group of `count` is. */
export const touristsWidth = (count: number) =>
	(count - 1) * TOURIST_SPACING + TOURIST_WIDTH

const CELL = 2
const INK = '#2a2d31'
const TAG = '#f6f4ee'
/** A hard-shell cabin bag's colours, each: its shell, lit, and shaded. */
const SHELLS = [
	['#d6453a', '#ec7166', '#a8312a'],
	['#2f6fd1', '#5d93e6', '#2457a8'],
	['#f2b630', '#ffd56a', '#c48c1c'],
	['#7a4fb5', '#9d78d4', '#5b3889'],
	['#2fa39a', '#5cc8bf', '#1f7a73'],
]
/**
 * A cabin bag, on its wheels, its handle pulled up, a luggage tag on it:
 * 9 by 12 cells, in each of `SHELLS`.
 */
const SUITCASE_COLUMNS = 9
const SUITCASE_ROWS = 12
const SUITCASES = SHELLS.map(([shell, lit, shade]) =>
	pixelArt(SUITCASE_COLUMNS, SUITCASE_ROWS, [
		// Its handle, pulled up.
		[2, 0, 5, 1, INK],
		[2, 1, 1, 3, INK],
		[6, 1, 1, 3, INK],
		// Its shell, lit along its top, shaded down its far side, ridged.
		[0, 4, 9, 7, shell],
		[0, 4, 9, 1, lit],
		[8, 5, 1, 6, shade],
		[3, 5, 1, 6, shade],
		[6, 5, 1, 6, shade],
		// Its luggage tag.
		[1, 6, 1, 2, TAG],
		// Its wheels.
		[1, 11, 2, 1, INK],
		[6, 11, 2, 1, INK],
	]),
)
const SUITCASE_WIDTH = SUITCASE_COLUMNS * CELL
const SUITCASE_HEIGHT = SUITCASE_ROWS * CELL
/** How far a suitcase stands from its tourist's middle, behind them: at their hand. */
const SUITCASE_BESIDE = 14

/** A number out of 1 for tourist `i` of the group at `x`: who they are, which way they face. */
const chance = (x: number, i: number) => {
	const n = Math.sin(x * 4.1414 + i * 17.17) * 24634.6345
	return n - Math.floor(n)
}

/** Where tourist `i` of a group of `count` stands, from the group's middle. */
export const touristAlong = (count: number, i: number) =>
	i * TOURIST_SPACING + TOURIST_WIDTH / 2 - touristsWidth(count) / 2

/**
 * A group of tourists, its feet on the path's middle, `TOURISTS_DEPTH_ROOM`
 * up from the drawing's bottom: each stood a little nearer or further back,
 * the nearer in front, and `drop` lower where the ground is, along from the
 * group's middle.
 */
export function TouristsArt(props: {
	x: number
	count: number
	drop?: (along: number) => number
}) {
	const tourists = Array.from({ length: props.count }, (_, i) => ({
		sprite: touristSprite(1 + Math.floor(chance(props.x, i) * 1e6)),
		facing: chance(props.x, i + 50) < 0.5 ? 1 : -1,
		phone: chance(props.x, i + 90) < 0.5,
		suitcase:
			SUITCASES[Math.floor(chance(props.x, i + 170) * SUITCASES.length)],
		/** Nearer (down the screen), or further back (up it). */
		depth: Math.round(-FURTHER + chance(props.x, i + 130) * (NEARER + FURTHER)),
		drop: props.drop?.(touristAlong(props.count, i)) ?? 0,
	}))
	return (
		<div
			style={{
				position: 'relative',
				height: `${TOURISTS_HEIGHT + TOURISTS_DEPTH_ROOM}px`,
			}}
		>
			<For each={tourists}>
				{(tourist, i) => {
					const sprite = tourist.sprite
					if (!sprite) return null
					const width = sprite.width * RUNNER_SCALE
					const height = sprite.height * RUNNER_SCALE
					// Stood, or with a phone up: its frame, as the engine draws
					// frames, the strip repeating along at the frame's offset.
					const frame = sprite.frames[tourist.phone ? 1 : 0] ?? ''
					const [src, at] = frame.split('#')
					const [offset] = (at ?? '0').split(',').map(Number)
					const bottom = `${TOURISTS_DEPTH_ROOM - tourist.depth - tourist.drop}px`
					const z = tourist.depth + FURTHER
					// Behind them, the way they're not facing: their right,
					// facing left.
					const middle = i() * TOURIST_SPACING + TOURIST_WIDTH / 2
					const suitcaseAt =
						middle - tourist.facing * SUITCASE_BESIDE - SUITCASE_WIDTH / 2
					return (
						<>
							<div
								style={{
									position: 'absolute',
									left: `${i() * TOURIST_SPACING}px`,
									bottom,
									'z-index': z,
									width: `${width}px`,
									height: `${height}px`,
									background: `url("${src}") ${offset}px 0 / auto 100% repeat-x`,
									'image-rendering': 'pixelated',
									// Drawn facing left: turned round, to face right.
									transform: tourist.facing === 1 ? 'scaleX(-1)' : undefined,
								}}
							/>
							<div
								style={{
									position: 'absolute',
									left: `${suitcaseAt}px`,
									bottom,
									'z-index': z,
								}}
							>
								<PixelArt
									src={tourist.suitcase}
									width={SUITCASE_WIDTH}
									height={SUITCASE_HEIGHT}
								/>
							</div>
						</>
					)
				}}
			</For>
		</div>
	)
}
