import { Pixels } from '../Pixels'

/**
 * A running track's hazards, as pixel art: a hurdle, standing or knocked
 * over, and a pothole in the track.
 */

/** The white lines between the track's lanes, as offsets from the line everyone runs along, back to front. */
export const LANE_LINES = [-12, -3, 6, 15]
/** The white line along the track's inside edge. */
export const TRACK_INSIDE = 24
/**
 * How far along the course something across the track goes for each pixel
 * further back: the start and finish banners' slant.
 */
export const ACROSS_SLANT = 3.5
/** A hurdle's height, its feet to the top of its bar. */
export const HURDLE_HEIGHT = 42
/**
 * A tall hurdle's: its board coming down to `TALL_HURDLE_CLEAR` off the
 * track, so there's room under it only sliding.
 */
export const TALL_HURDLE_HEIGHT = 90
export const TALL_HURDLE_CLEAR = 34
/** How deep a pothole's drawn, and how far of that is above the line everyone runs along. */
export const POTHOLE_HEIGHT = 10
export const POTHOLE_ABOVE = 4

const RED = '#e0382f'
const RED_DARK = '#9a2b22'
const WHITE = '#f4f4f4'
const LEG = '#d9dde0'
const FOOT = '#5a6166'

/**
 * A flight's hurdles: one in each lane, across the track. Each has its feet
 * just inside its lane's lines, `depth` apart, its near foot `sink` below the
 * line everyone runs along, and stands `along` the course from the hurdle in
 * the lane that line's in, so they're all in a row. Those in lanes nearer than
 * the runner's are drawn in front of the runner.
 */
export const HURDLE_LANES = (() => {
	const lines = [...LANE_LINES, TRACK_INSIDE]
	const lanes = lines.slice(1).map((near, i) => {
		const far = lines[i] + 3
		return { far, near, middle: (far + near) / 2 }
	})
	const running = lanes.find((lane) => lane.far <= 0 && lane.near > 0)!
	return lanes.map((lane) => ({
		depth: lane.near - lane.far,
		sink: lane.near,
		along: -(lane.middle - running.middle) * ACROSS_SLANT,
		running: lane === running,
		front: lane.middle > running.middle,
	}))
})()

/** A hurdle `depth` deep's size, as drawn: a tall one, if `tall`. */
export const hurdleSize = (depth: number, tall = false) => ({
	width: Math.round(depth * ACROSS_SLANT) + 10,
	height: (tall ? TALL_HURDLE_HEIGHT : HURDLE_HEIGHT) + depth,
})

/**
 * A hurdle across a lane, `depth` deep: its near leg at the left, its far
 * one further along and further up, the bar between them striped red and
 * white, its underside in shadow. A tall one's bar is a deep board, down
 * to sliding height.
 */
function hurdleRects(depth: number, tall: boolean) {
	const run = Math.round(depth * ACROSS_SLANT)
	const { height } = hurdleSize(depth, tall)
	/** How deep its bar is, shadow and all. */
	const bar = tall ? TALL_HURDLE_HEIGHT - TALL_HURDLE_CLEAR : 10
	/** The top of the bar, `x` along. */
	const top = (x: number) => Math.round(depth - ((x - 4) * depth) / run)
	const rects: [number, number, number, number, string][] = []
	const length = run + 6
	for (let x = 1; x < length + 1; x += 2) {
		const y = top(x + 1)
		const stripe = Math.floor(((x - 1) * 4) / length) % 2
		rects.push(
			[x, y, 2, bar - 2, stripe ? WHITE : RED],
			[x, y + bar - 2, 2, 2, RED_DARK],
		)
		// A tall one's board, edged top and bottom in the other colour.
		if (tall)
			rects.push(
				[x, y, 2, 3, stripe ? RED : WHITE],
				[x, y + bar - 5, 2, 3, stripe ? RED : WHITE],
			)
	}
	for (const [leg, foot] of [
		[3, height],
		[3 + run, height - depth],
	]) {
		const under = top(leg + 1) + bar
		rects.push(
			[leg, under, 3, foot - 2 - under, LEG],
			[leg - 3, foot - 2, 10, 2, FOOT],
		)
	}
	return rects
}

/**
 * A hurdle across a lane, `depth` deep. Knocked over, it's tipped flat onto
 * the track, the way it was run into: set `--knocked` to 1 on something round
 * it to knock it over, which a sprite's style can do every tick.
 */
export function HurdleArt(props: { depth: number; tall?: boolean }) {
	const size = hurdleSize(props.depth, props.tall)
	return (
		<div
			style={{
				'transform-origin': '0 100%',
				// Tipping forward 78°: everything moves along by its height
				// times sin 78°, and comes down to its height times cos 78°.
				transform:
					'skewX(calc(var(--knocked, 0) * -78deg)) scaleY(calc(1 - var(--knocked, 0) * 0.8))',
				transition: 'transform 120ms ease-in',
			}}
		>
			<Pixels
				width={size.width}
				height={size.height}
				rects={hurdleRects(props.depth, props.tall ?? false)}
			/>
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
