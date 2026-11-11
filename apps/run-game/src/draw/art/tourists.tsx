import { For } from 'solid-js'
import { RUNNER_SCALE } from '../../game/constants'
import { touristSprite } from '../../runners/tourists'

/**
 * Tourists stood about in the street: made up, as custom runners are, but
 * dressed for sightseeing (see `touristLook`), each facing whichever way,
 * some with a phone up. Who's who, and which way they face, comes from
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
					return (
						<div
							style={{
								position: 'absolute',
								left: `${i() * TOURIST_SPACING}px`,
								bottom: `${TOURISTS_DEPTH_ROOM - tourist.depth - tourist.drop}px`,
								'z-index': tourist.depth + FURTHER,
								width: `${width}px`,
								height: `${height}px`,
								background: `url("${src}") ${offset}px 0 / auto 100% repeat-x`,
								'image-rendering': 'pixelated',
								// Drawn facing left: turned round, to face right.
								transform: tourist.facing === 1 ? 'scaleX(-1)' : undefined,
							}}
						/>
					)
				}}
			</For>
		</div>
	)
}
