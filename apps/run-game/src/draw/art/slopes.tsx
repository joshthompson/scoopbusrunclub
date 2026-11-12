import { For, type JSX, Show } from 'solid-js'
import {
	type PixelRect,
	paintedArt,
	pixelArt,
} from '../../courses/kit/pixelArt'
import type { Rail } from '../../courses/types'
import { PixelArt } from '../PixelArt'

/**
 * What's on The Slopes' piste, in cells twice the size of a screen pixel: a
 * snowman, in a bobble hat and a scarf, and him burst into a heap; a slalom
 * gate, its flag flapping as you go through; and the rails, boxes and logs
 * to grind along.
 */

const CELL = 2

// --- A snowman ------------------------------------------------------------------

const SNOWMAN_COLUMNS = 18
const SNOWMAN_ROWS = 26
export const SNOWMAN_WIDTH = SNOWMAN_COLUMNS * CELL
export const SNOWMAN_DRAWN = SNOWMAN_ROWS * CELL

const SNOW = '#f6f9fc'
const SNOW_SHADE = '#cddcec'
const COAL = '#1d1d1d'
const CARROT = '#f2862e'

const inCircle = (x: number, y: number, cx: number, cy: number, r: number) =>
	(x - cx) ** 2 + (y - cy) ** 2 <= r * r

/**
 * A snowman, three balls of snow, facing left, the way everyone's coming:
 * coal eyes and buttons, a carrot nose, stick arms, a bobble hat in blue
 * and yellow and a red scarf.
 */
const snowman = paintedArt(SNOWMAN_COLUMNS, SNOWMAN_ROWS, (x, y) => {
	// Its hat: a bobble, and stripes.
	if (inCircle(x, y, 9, 1.2, 1.2)) return '#f5c518'
	if (y > 2 && y < 6 && x > 5.6 && x < 12.4) {
		if (y > 5) return '#f5c518'
		return Math.floor(y) % 2 ? '#2d6fd0' : '#1f57ad'
	}
	// Its head.
	if (inCircle(x, y, 9, 8, 3.4)) {
		if (inCircle(x, y, 7.6, 7.4, 0.6)) return COAL
		// The carrot, poking out to the left.
		if (y > 8 && y < 9 && x < 8) return CARROT
		return x > 10.5 ? SNOW_SHADE : SNOW
	}
	if (y > 8 && y < 9 && x > 3 && x < 8) return CARROT
	// The scarf, round its neck, an end hanging down.
	if (y > 10.8 && y < 12.6 && x > 5.5 && x < 13) return '#d8342c'
	if (x > 10.6 && x < 12.4 && y > 12 && y < 16)
		return y > 15 ? '#a82520' : '#d8342c'
	// Stick arms.
	if (Math.abs(y - (14 - (x - 1) * 0.5)) < 0.6 && x > 1 && x < 6)
		return '#6b4a2b'
	if (Math.abs(y - (13 + (x - 13) * 0.5)) < 0.6 && x > 13 && x < 17.5)
		return '#6b4a2b'
	// Its middle, buttoned.
	if (inCircle(x, y, 9, 15.5, 4.5)) {
		if (x > 8.5 && x < 9.5 && (Math.floor(y) === 14 || Math.floor(y) === 17))
			return COAL
		return x > 11.5 ? SNOW_SHADE : SNOW
	}
	// Its bottom.
	if (inCircle(x, y, 9, 21.5, 5.4) && y < 26)
		return x > 12 || y > 24.5 ? SNOW_SHADE : SNOW
	return undefined
})

/** Burst: a heap of snow, its hat and carrot lying in it. */
const heap = pixelArt(SNOWMAN_COLUMNS, SNOWMAN_ROWS, [
	[2, 22, 14, 4, SNOW],
	[4, 20, 9, 2, SNOW],
	[12, 23, 5, 3, SNOW_SHADE],
	[3, 25, 13, 1, SNOW_SHADE],
	[6, 19, 3, 1, '#2d6fd0'],
	[5, 20, 2, 1, '#f5c518'],
	[11, 21, 3, 1, CARROT],
	[8, 22, 1, 1, COAL],
	[13, 22, 1, 1, COAL],
])

/** How long it's flying apart for, burst, before it's just a heap. */
const BURST_TICKS = 24

/** A snowman, stood up, or burst, `since` ticks ago: bits of him flying, then a heap. */
export function SnowmanArt(props: { since?: number }) {
	const burst = () => props.since !== undefined
	return (
		<div style={{ position: 'relative', width: '100%', height: '100%' }}>
			<PixelArt
				src={burst() ? heap : snowman}
				width={SNOWMAN_WIDTH}
				height={SNOWMAN_DRAWN}
			/>
			<Show when={burst() && (props.since ?? 99) < BURST_TICKS}>
				<For each={PUFF}>
					{(bit) => {
						const t = () => (props.since ?? 0) / BURST_TICKS
						return (
							<div
								style={{
									position: 'absolute',
									left: `${SNOWMAN_WIDTH / 2 + bit.x * t()}px`,
									top: `${30 + bit.y * t() + 40 * t() * t()}px`,
									width: `${bit.size}px`,
									height: `${bit.size}px`,
									background: bit.colour,
									opacity: 1 - t(),
								}}
							/>
						)
					}}
				</For>
			</Show>
		</div>
	)
}

const PUFF = [
	{ x: -30, y: -30, size: 8, colour: SNOW },
	{ x: 26, y: -38, size: 10, colour: SNOW },
	{ x: -10, y: -50, size: 8, colour: '#2d6fd0' },
	{ x: 36, y: -14, size: 6, colour: SNOW_SHADE },
	{ x: -40, y: -6, size: 6, colour: SNOW },
	{ x: 6, y: -44, size: 4, colour: CARROT },
	{ x: 18, y: -22, size: 8, colour: SNOW },
]

// --- A slalom gate --------------------------------------------------------------

/** A slalom gate's size: two poles, a flag stretched between them. */
export const GATE_WIDTH = 30
export const GATE_HEIGHT = 66
const GATE_POLE_WIDTH = 3
const FLAG_TOP = 4
const FLAG_HEIGHT = 24

/**
 * A slalom gate, side on: a flag, red or blue, a white band across it,
 * stretched between two poles. They stand at the edges of the piste, red
 * at its back and blue at its front, in turn, so the course weaves past
 * them. Gone past, its flag flaps.
 */
export function GateArt(props: { colour: 'red' | 'blue'; flapping: boolean }) {
	const fill = () => (props.colour === 'red' ? '#d8342c' : '#2459c4')
	const pole = (left: number): JSX.CSSProperties => ({
		position: 'absolute',
		left: `${left}px`,
		top: 0,
		width: `${GATE_POLE_WIDTH}px`,
		height: `${GATE_HEIGHT}px`,
		background: fill(),
		'border-left': '1px solid rgba(255, 255, 255, 0.6)',
		'box-sizing': 'border-box',
	})
	return (
		<div style={{ position: 'relative', width: '100%', height: '100%' }}>
			<div
				style={{
					position: 'absolute',
					left: `${GATE_POLE_WIDTH}px`,
					top: `${FLAG_TOP}px`,
					width: `${GATE_WIDTH - GATE_POLE_WIDTH * 2}px`,
					height: `${FLAG_HEIGHT}px`,
					'box-sizing': 'border-box',
					background: `linear-gradient(to bottom, ${fill()} 0 36%, white 36% 64%, ${fill()} 64%)`,
					border: '2px solid rgba(0, 0, 0, 0.35)',
					'transform-origin': '0 50%',
					animation: props.flapping
						? 'gate-flap 0.25s steps(3) infinite'
						: undefined,
				}}
			/>
			<div style={pole(0)} />
			<div style={pole(GATE_WIDTH - GATE_POLE_WIDTH)} />
		</div>
	)
}

// --- Rails, boxes and logs --------------------------------------------------------

/** How far apart a rail's legs are, down to the snow. */
const LEG_EVERY = 48

/**
 * A rail to grind, a box or a log, `rail`, along the line of `tops` (its
 * top every few px, from its left, in its box's own pixels) over `feet`
 * (the snow under it): its legs down into the snow, and it along the top.
 */
export function RailArt(props: {
	rail: Rail
	width: number
	height: number
	tops: [number, number][]
	feet: [number, number][]
}) {
	const line = (points: [number, number][], dy = 0) =>
		points.map(([x, y]) => `${x},${y + dy}`).join(' ')
	const legs = () => {
		const out: [number, number, number][] = []
		const { tops, feet } = props
		for (let i = 0; i < tops.length; i++) {
			const [x, top] = tops[i]
			const last = i === tops.length - 1
			if (i % Math.round(LEG_EVERY / 8) === 0 || last)
				out.push([Math.min(x, props.width - 4), top, feet[i][1]])
		}
		return out
	}
	const look = () =>
		RAIL_LOOKS[props.rail.look === 'roof' ? 'box' : props.rail.look]
	return (
		<svg
			width={props.width}
			height={props.height}
			viewBox={`0 0 ${props.width} ${props.height}`}
			shape-rendering="crispEdges"
			style={{ display: 'block', overflow: 'visible' }}
			aria-hidden="true"
		>
			<For each={legs()}>
				{([x, top, foot]) => (
					<>
						<rect
							x={x}
							y={top}
							width={look().legWidth}
							height={Math.max(0, foot - top + 4)}
							fill={look().leg}
						/>
						<rect
							x={x - 2}
							y={foot}
							width={look().legWidth + 4}
							height={3}
							fill={SNOW}
						/>
					</>
				)}
			</For>
			{/* Its side, under its top: deep for a box or a log. */}
			<polyline
				points={line(props.tops, look().depth / 2)}
				fill="none"
				stroke={look().side}
				stroke-width={look().depth}
			/>
			<polyline
				points={line(props.tops)}
				fill="none"
				stroke={look().top}
				stroke-width={3}
			/>
			<polyline
				points={line(props.tops, -1)}
				fill="none"
				stroke={look().shine}
				stroke-width={1}
			/>
			<Show when={props.rail.look === 'rail'}>
				{/* Hazard stripes, painted on it. */}
				<polyline
					points={line(props.tops, 2)}
					fill="none"
					stroke="#f5c518"
					stroke-width={3}
					stroke-dasharray="8 8"
				/>
			</Show>
		</svg>
	)
}

const RAIL_LOOKS: Record<
	Exclude<Rail['look'], 'roof'>,
	{
		top: string
		shine: string
		side: string
		depth: number
		leg: string
		legWidth: number
	}
> = {
	rail: {
		top: '#7d858f',
		shine: '#e8edf2',
		side: '#d8342c',
		depth: 4,
		leg: '#5d646d',
		legWidth: 4,
	},
	box: {
		top: '#c9ced4',
		shine: '#ffffff',
		side: '#2d6fd0',
		depth: 14,
		leg: '#1f4f9c',
		legWidth: 6,
	},
	log: {
		top: '#8a5a2b',
		shine: '#c08a4e',
		side: '#6b4422',
		depth: 12,
		leg: '#5b3a1e',
		legWidth: 6,
	},
}

/** A wooden ski rack, behind the boards stood up at the top: `slots` of them, `gap` apart. */
export function skiRack(slots: number, gap: number) {
	const width = Math.round((slots * gap) / CELL) + 6
	const rects: PixelRect[] = [
		// Its rails, front to back, on posts.
		[0, 4, width, 2, '#8a5a2b'],
		[0, 12, width, 2, '#8a5a2b'],
		[0, 4, width, 1, '#b07a42'],
		[0, 12, width, 1, '#b07a42'],
		// Snow along its top.
		[0, 3, width, 1, SNOW],
	]
	for (let x = 1; x < width; x += 18) rects.push([x, 3, 2, 18, '#6b4422'])
	rects.push([width - 3, 3, 2, 18, '#6b4422'])
	return pixelArt(width, 21, rects)
}
