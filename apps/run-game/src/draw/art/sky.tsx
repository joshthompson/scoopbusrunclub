import { For, type JSX, Show } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import {
	BALLOON_ENVELOPE,
	BALLOON_HEIGHT,
	BALLOON_WIDTH,
	BLOWHOLE,
	GULL_HEIGHT,
	GULL_WIDTH,
	RING_HEIGHT,
	RING_WIDTH,
	STORM_HEIGHT,
	STORM_WIDTH,
	TURBINE_BLADE,
} from '../../game/sky'
import { PixelArt } from '../PixelArt'

/**
 * The Cliff's sky, drawn: gulls, hot-air balloons, Storm Clouds, wind
 * turbines and whales, and its Rings. Where each is, and what it's doing,
 * is `sky`'s, by the tick: these only draw it.
 */

// --- Gulls -----------------------------------------------------------------

const WHITE = '#f6f7f8'
const GREY = '#9aa5b1'
const TIP = '#3d434a'
const BEAK = '#f0a030'
const INK = '#1d1d1d'

/** A gull, facing left, flying at you, 12 by 7 cells: wings up, or down. */
const gull = (up: boolean) =>
	pixelArt(12, 7, [
		[3, 3, 7, 2, WHITE],
		[1, 2, 3, 2, WHITE],
		[0, 3, 1, 1, BEAK],
		[2, 2, 1, 1, INK],
		[10, 3, 2, 1, GREY],
		...((up
			? [
					[5, 1, 3, 2, GREY],
					[4, 0, 2, 1, TIP],
				]
			: [
					[5, 5, 3, 1, GREY],
					[6, 6, 2, 1, TIP],
				]) as PixelRect[]),
	])
const GULL_UP = gull(true)
const GULL_DOWN = gull(false)

export function GullArt(props: { up: boolean }) {
	return (
		<PixelArt
			src={props.up ? GULL_UP : GULL_DOWN}
			width={GULL_WIDTH}
			height={GULL_HEIGHT}
		/>
	)
}

// --- Hot-air balloons --------------------------------------------------------

/** Each balloon's own colours, its panels taken in turn. */
const BALLOON_COLOURS = [
	['#e8473c', '#f7d117'],
	['#3f7fd9', '#f6f7f8'],
	['#7b3fb5', '#f39c34'],
	['#2fa36b', '#f7d117'],
]

const COLUMNS = BALLOON_WIDTH / 2
const ENVELOPE_ROWS = BALLOON_ENVELOPE / 2
const WICKER = '#a0682c'
const WICKER_DARK = '#6e4420'
const ROPE = '#5b4a36'

function balloon([a, b]: string[]) {
	const cells: PixelRect[] = []
	const middle = COLUMNS / 2
	const radius = 17.5
	const round = 20
	/** How wide it is either side of its middle, `y` down. */
	const half = (y: number) => {
		if (y <= round) return Math.sqrt(Math.max(0, radius ** 2 - (y - 17.5) ** 2))
		const widest = Math.sqrt(radius ** 2 - (round - 17.5) ** 2)
		return widest - (widest - 4) * ((y - round) / (ENVELOPE_ROWS - 1 - round))
	}
	for (let y = 0; y < ENVELOPE_ROWS; y++) {
		const w = half(y + 0.5)
		for (let x = 0; x < COLUMNS; x++) {
			const across = (x + 0.5 - middle) / w
			if (Math.abs(across) > 1) continue
			// Its panels, narrowing round its sides.
			const panel = Math.floor((Math.asin(across) / Math.PI + 0.5) * 6)
			const shade = across > 0.55 ? 'rgba(0,0,0,0.18)' : undefined
			cells.push([x, y, 1, 1, panel % 2 ? b : a])
			if (shade) cells.push([x, y, 1, 1, shade])
		}
	}
	// A shine on it, and its ropes down to the basket, and the basket.
	cells.push([10, 6, 2, 4, 'rgba(255,255,255,0.45)'])
	const ropesTop = ENVELOPE_ROWS
	for (let i = 0; i < 7; i++) {
		cells.push([14 - Math.round(i * 0.3), ropesTop + i, 1, 1, ROPE])
		cells.push([21 + Math.round(i * 0.3), ropesTop + i, 1, 1, ROPE])
	}
	cells.push([12, ropesTop + 7, 12, 9, WICKER])
	cells.push([12, ropesTop + 7, 12, 1, WICKER_DARK])
	for (let x = 13; x < 24; x += 3)
		cells.push([x, ropesTop + 8, 1, 8, WICKER_DARK])
	// A burner's flame, under its mouth.
	cells.push([17, ropesTop + 1, 2, 2, '#ffb02e'])
	return pixelArt(COLUMNS, BALLOON_HEIGHT / 2, cells)
}
const BALLOONS = BALLOON_COLOURS.map(balloon)

/** A balloon, its colours picked by `x`, so each along the way is its own. */
export function BalloonArt(props: { x: number }) {
	return (
		<PixelArt
			src={BALLOONS[Math.floor(props.x / 97) % BALLOONS.length]}
			width={BALLOON_WIDTH}
			height={BALLOON_HEIGHT}
		/>
	)
}

// --- Storm Clouds -----------------------------------------------------------

const CLOUD = '#5a5f6b'
const CLOUD_LIGHT = '#7b818e'
const CLOUD_DARK = '#3c404a'

/** Puffs of cloud, [x, y, radius] in cells: 80 by 32 of them. */
const PUFFS: [number, number, number][] = [
	[14, 20, 10],
	[28, 13, 12],
	[44, 10, 13],
	[58, 15, 11],
	[68, 21, 9],
	[36, 21, 11],
	[52, 22, 10],
]

const STORM = (() => {
	const cells: PixelRect[] = []
	const w = STORM_WIDTH / 2
	const h = STORM_HEIGHT / 2
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const near = PUFFS.find(
				([px, py, r]) => (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 < r * r,
			)
			if (!near) continue
			const lit = PUFFS.some(
				([px, py, r]) =>
					(x + 0.5 - px) ** 2 + (y + 2.5 - py) ** 2 >= r * r &&
					(x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 < r * r,
			)
			cells.push([
				x,
				y,
				1,
				1,
				y > h - 7 ? CLOUD_DARK : lit ? CLOUD_LIGHT : CLOUD,
			])
		}
	return pixelArt(w, h, cells)
})()

/** A bolt's zigzag, down from the cloud, `height` long. */
function bolt(height: number) {
	const points: string[] = []
	const steps = Math.max(3, Math.round(height / 36))
	for (let i = 0; i <= steps; i++)
		points.push(
			`${i === steps ? 0 : (i % 2 ? 1 : -1) * 9},${(i / steps) * height}`,
		)
	return points.join(' ')
}

/**
 * A Storm Cloud, and, striking, its bolt down to the sea `reach` below its
 * bottom. Brewing a strike, it flickers.
 */
export function StormArt(props: {
	brewing: boolean
	striking: boolean
	now: number
	reach: number
}) {
	const flicker = () =>
		props.striking || (props.brewing && Math.floor(props.now / 4) % 3 === 0)
	return (
		<div style={{ position: 'relative', width: `${STORM_WIDTH}px` }}>
			<Show when={props.striking}>
				<svg
					width={40}
					height={props.reach}
					viewBox={`-20 0 40 ${props.reach}`}
					style={{
						position: 'absolute',
						left: `${STORM_WIDTH / 2 - 20}px`,
						top: `${STORM_HEIGHT - 10}px`,
						filter: 'drop-shadow(0 0 6px #fff6a8)',
						overflow: 'visible',
					}}
					aria-hidden="true"
				>
					<polyline
						points={bolt(props.reach)}
						fill="none"
						stroke="#fff6a8"
						stroke-width={6}
						stroke-linejoin="bevel"
					/>
					<polyline
						points={bolt(props.reach)}
						fill="none"
						stroke="#ffffff"
						stroke-width={2}
						stroke-linejoin="bevel"
					/>
				</svg>
			</Show>
			<div
				style={{
					position: 'relative',
					filter: flicker() ? 'brightness(1.8)' : undefined,
				}}
			>
				<PixelArt src={STORM} width={STORM_WIDTH} height={STORM_HEIGHT} />
			</div>
		</div>
	)
}

// --- Wind turbines -----------------------------------------------------------

const TURBINE_WHITE = '#eef1f4'
const TURBINE_SHADE = '#b9c1ca'
const BLADE_TIP = '#e8473c'

/**
 * A wind turbine: its tower down `tall` to the sea, and its blades at
 * `angles`, radians, round its hub, which is at the drawing's
 * (`TURBINE_BLADE`, `TURBINE_BLADE`).
 */
export function TurbineArt(props: { angles: number[]; tall: number }) {
	const c = TURBINE_BLADE + 4
	const size = c * 2
	return (
		<svg
			width={size}
			height={c + props.tall}
			viewBox={`${-c} ${-c} ${size} ${c + props.tall}`}
			shape-rendering="crispEdges"
			style={{ display: 'block', overflow: 'visible' }}
			aria-hidden="true"
		>
			{/* Its tower, tapering, shaded down one side. */}
			<polygon
				points={`-4,4 4,4 7,${props.tall} -7,${props.tall}`}
				fill={TURBINE_WHITE}
			/>
			<polygon
				points={`2,4 4,4 7,${props.tall} 3,${props.tall}`}
				fill={TURBINE_SHADE}
			/>
			{/* Its nacelle, behind the hub. */}
			<rect x={-4} y={-7} width={18} height={12} fill={TURBINE_SHADE} />
			<For each={props.angles}>
				{(angle) => (
					<g transform={`rotate(${(angle * 180) / Math.PI})`}>
						<polygon
							points={`6,-4 ${TURBINE_BLADE},-1 ${TURBINE_BLADE},1 6,5`}
							fill={TURBINE_WHITE}
							stroke={TURBINE_SHADE}
							stroke-width={1}
						/>
						<polygon
							points={`${TURBINE_BLADE - 16},-1.6 ${TURBINE_BLADE},-1 ${TURBINE_BLADE},1 ${TURBINE_BLADE - 16},1.8`}
							fill={BLADE_TIP}
						/>
					</g>
				)}
			</For>
			<rect x={-6} y={-6} width={12} height={12} fill={TURBINE_WHITE} />
			<rect x={-6} y={4} width={12} height={2} fill={TURBINE_SHADE} />
		</svg>
	)
}

// --- Whales -------------------------------------------------------------------

const WHALE_BACK = '#3f5a78'
const WHALE_DARK = '#2c3f55'
const WHALE_BELLY = '#c9d6df'

export const WHALE_WIDTH = 104
export const WHALE_HEIGHT = 36

/** A whale, facing left, 52 by 18 cells: its back and head up out of the water, its tail up behind. */
const WHALE = pixelArt(WHALE_WIDTH / 2, WHALE_HEIGHT / 2, [
	// Its body, a long hump.
	[4, 8, 34, 8, WHALE_BACK],
	[8, 6, 24, 2, WHALE_BACK],
	[14, 5, 12, 1, WHALE_BACK],
	[2, 10, 2, 5, WHALE_BACK],
	[4, 14, 30, 2, WHALE_BELLY],
	[6, 12, 4, 1, WHALE_BELLY],
	// Its eye, and its mouth, smiling.
	[8, 10, 2, 2, INK],
	[3, 13, 8, 1, WHALE_DARK],
	// Its blowhole.
	[15, 5, 2, 1, WHALE_DARK],
	// Down to its tail, and its flukes, up.
	[38, 10, 6, 4, WHALE_BACK],
	[44, 9, 3, 3, WHALE_BACK],
	[46, 4, 3, 6, WHALE_BACK],
	[48, 2, 3, 4, WHALE_DARK],
	[46, 10, 6, 2, WHALE_DARK],
	[49, 8, 3, 2, WHALE_BACK],
	// The light on its back.
	[12, 6, 10, 1, '#5d7d9f'],
])

/**
 * A whale, `up` of the way surfaced, its spout `spout` of the way up to
 * `height`; bubbles, `bubbling`, just before it blows. Its middle is the
 * drawing's middle, at the sea's surface `height` down.
 */
export function WhaleArt(props: {
	up: number
	spout: number
	bubbling: boolean
	height: number
	now: number
}) {
	const blowhole = WHALE_WIDTH / 2 + BLOWHOLE
	const spoutTop = () => props.height * (1 - props.spout)
	return (
		<div
			style={{
				position: 'relative',
				width: `${WHALE_WIDTH}px`,
				height: `${props.height + WHALE_HEIGHT}px`,
			}}
		>
			<Show when={props.spout > 0}>
				<div
					style={{
						position: 'absolute',
						left: `${blowhole - 8}px`,
						top: `${spoutTop() + 10}px`,
						width: '16px',
						bottom: `${WHALE_HEIGHT - 10}px`,
						background:
							'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(190,225,245,0.85))',
					}}
				/>
				{/* Its top, splaying out, and the spray falling off it. */}
				<For each={[-22, -12, 0, 12, 22]}>
					{(dx, i) => (
						<div
							style={{
								position: 'absolute',
								left: `${blowhole + dx - 6}px`,
								top: `${spoutTop() + Math.abs(dx) * 0.6 + ((props.now / 3 + i() * 2) % 6)}px`,
								width: '12px',
								height: '12px',
								background: 'rgba(240,250,255,0.9)',
							}}
						/>
					)}
				</For>
			</Show>
			<Show when={props.bubbling}>
				<For each={[0, 1, 2]}>
					{(i) => (
						<div
							style={{
								position: 'absolute',
								left: `${blowhole - 4 + (i - 1) * 8}px`,
								top: `${props.height + 8 - ((props.now + i * 7) % 20)}px`,
								width: '4px',
								height: '4px',
								background: 'rgba(255,255,255,0.8)',
							}}
						/>
					)}
				</For>
			</Show>
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: `${props.height - 14 + (1 - props.up) * 34}px`,
				}}
			>
				<PixelArt src={WHALE} width={WHALE_WIDTH} height={WHALE_HEIGHT} />
			</div>
		</div>
	)
}

// --- Rings ---------------------------------------------------------------------

const GOLD = '#f7c531'
const GOLD_DARK = '#b8860b'
const LIT = '#fffbe0'

/**
 * A Ring, seen almost edge on: its near half, in front of whoever's going
 * through it, or its far half, behind them. Lit up, flown through.
 */
export function RingArt(props: { half: 'near' | 'far'; lit: boolean }) {
	const style = (): JSX.CSSProperties => ({
		display: 'block',
		overflow: 'visible',
		'clip-path':
			props.half === 'near'
				? 'inset(-8px 50% -8px -8px)'
				: 'inset(-8px -8px -8px 50%)',
		filter: props.lit ? 'drop-shadow(0 0 6px #fff4a0)' : undefined,
	})
	return (
		<svg
			width={RING_WIDTH}
			height={RING_HEIGHT}
			viewBox={`0 0 ${RING_WIDTH} ${RING_HEIGHT}`}
			style={style()}
			aria-hidden="true"
		>
			<ellipse
				cx={RING_WIDTH / 2}
				cy={RING_HEIGHT / 2}
				rx={RING_WIDTH / 2 - 3}
				ry={RING_HEIGHT / 2 - 3}
				fill="none"
				stroke={props.lit ? LIT : GOLD}
				stroke-width={6}
			/>
			<ellipse
				cx={RING_WIDTH / 2}
				cy={RING_HEIGHT / 2}
				rx={RING_WIDTH / 2 - 6}
				ry={RING_HEIGHT / 2 - 6}
				fill="none"
				stroke={props.lit ? GOLD : GOLD_DARK}
				stroke-width={1.5}
			/>
		</svg>
	)
}
