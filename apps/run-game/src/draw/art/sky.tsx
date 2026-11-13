import { For, type JSX, Show, createMemo } from 'solid-js'
import {
	type PixelRect,
	paintedArt,
	pixelArt,
} from '../../courses/kit/pixelArt'
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
/** A turbine's pixels: twice the size of a screen pixel, as everything's are. */
const TURBINE_CELL = 2
/** How many steps its blades are drawn at, over a third of a turn, when they look the same again. */
const BLADE_STEPS = 120
/** How long the red at each blade's tip is. */
const TIP_LENGTH = 16

/** Rects of cells, as a path: a row's run of them, each, `CELL` square. */
function cellPath(runs: [number, number, number][]) {
	return runs
		.map(
			([x, y, n]) =>
				`M${x * TURBINE_CELL} ${y * TURBINE_CELL}h${n * TURBINE_CELL}v${TURBINE_CELL}h${-n * TURBINE_CELL}z`,
		)
		.join('')
}

/** Its blades, drawn at each step round, once: white, edged, red-tipped. */
const BLADES = new Map<number, { white: string; shade: string; tip: string }>()

/**
 * Its three blades, a third of a turn apart, one at `angle`, as pixels:
 * each tapering from the hub out to its tip, its trailing edge in shade,
 * the end of it red.
 */
function bladesAt(angle: number) {
	const third = (Math.PI * 2) / 3
	const step =
		Math.round(((((angle % third) + third) % third) / third) * BLADE_STEPS) %
		BLADE_STEPS
	const cached = BLADES.get(step)
	if (cached) return cached
	const half = Math.ceil((TURBINE_BLADE + 2) / TURBINE_CELL)
	const size = half * 2
	/** What's in the cell at `i`, `j` (from the hub's): a blade's white, its shaded edge, its red tip. */
	const KINDS = ['white', 'shade', 'tip'] as const
	const cells = new Int8Array(size * size).fill(-1)
	for (let j = 0; j < size; j++)
		for (let i = 0; i < size; i++) {
			const x = (i - half + 0.5) * TURBINE_CELL
			const y = (j - half + 0.5) * TURBINE_CELL
			for (let k = 0; k < 3; k++) {
				const a = (step / BLADE_STEPS) * third + k * third
				const out = x * Math.cos(a) + y * Math.sin(a)
				const across = -x * Math.sin(a) + y * Math.cos(a)
				if (out < 6 || out > TURBINE_BLADE) continue
				// Tapering, from as wide as the hub to a point.
				const width = 5.5 - (3 * (out - 6)) / (TURBINE_BLADE - 6)
				if (Math.abs(across) > width) continue
				// Its trailing edge in shade, a pixel wide.
				cells[j * size + i] =
					out > TURBINE_BLADE - TIP_LENGTH ? 2 : across > width - 2.5 ? 1 : 0
			}
		}
	const runs = { white: [], shade: [], tip: [] } as Record<
		(typeof KINDS)[number],
		[number, number, number][]
	>
	for (let j = 0; j < size; j++) {
		let from = 0
		let kind = -1
		for (let i = 0; i <= size; i++) {
			const here = i < size ? cells[j * size + i] : -1
			if (here !== kind) {
				if (kind >= 0) runs[KINDS[kind]].push([from - half, j - half, i - from])
				from = i
				kind = here
			}
		}
	}
	const drawn = {
		white: cellPath(runs.white),
		shade: cellPath(runs.shade),
		tip: cellPath(runs.tip),
	}
	BLADES.set(step, drawn)
	return drawn
}

/**
 * A turbine's tower, `tall`, as pixels: tapering out down to the sea, its
 * right side in shade.
 */
function towerPath(tall: number) {
	const lit: [number, number, number][] = []
	const shade: [number, number, number][] = []
	for (let y = 2; y < tall / TURBINE_CELL; y++) {
		const t = (y * TURBINE_CELL - 4) / (tall - 4)
		const half = Math.round(2 + 1.5 * t)
		const shaded = Math.max(1, Math.round(half * 0.6))
		lit.push([-half, y, half * 2 - shaded])
		shade.push([half - shaded, y, shaded])
	}
	return { lit: cellPath(lit), shade: cellPath(shade) }
}

/**
 * A wind turbine, as pixel art: its tower down `tall` to the sea, and its
 * blades at `angles`, radians, round its hub, which is at the drawing's
 * (`TURBINE_BLADE`, `TURBINE_BLADE`).
 */
export function TurbineArt(props: { angles: number[]; tall: number }) {
	const c = TURBINE_BLADE + 4
	const size = c * 2
	const tower = createMemo(() => towerPath(props.tall))
	const blades = () => bladesAt(props.angles[0] ?? 0)
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
			<path d={tower().lit} fill={TURBINE_WHITE} />
			<path d={tower().shade} fill={TURBINE_SHADE} />
			{/* Its nacelle, behind the hub. */}
			<rect x={-4} y={-8} width={18} height={12} fill={TURBINE_SHADE} />
			<path d={blades().white} fill={TURBINE_WHITE} />
			<path d={blades().shade} fill={TURBINE_SHADE} />
			<path d={blades().tip} fill={BLADE_TIP} />
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
const GOLD_LIGHT = '#ffe680'
const LIT = '#fffbe0'

/** A Ring's cells: twice the size of a screen pixel. */
const RING_COLUMNS = RING_WIDTH / 2
const RING_ROWS = RING_HEIGHT / 2
/** How far in from its outside its hole is, in cells. */
const RING_BAND = 3

/**
 * A Ring, seen almost edge on, as pixel art: gold, its inside edge in
 * shade, the light on its top left; lit up, pale, glowing.
 */
function ring(lit: boolean) {
	const rx = RING_COLUMNS / 2
	const ry = RING_ROWS / 2
	const inside = (x: number, y: number, inset: number) =>
		((x - rx) / (rx - inset)) ** 2 + ((y - ry) / (ry - inset)) ** 2 <= 1
	const band = (x: number, y: number) =>
		inside(x, y, 0) && !inside(x, y, RING_BAND)
	return paintedArt(RING_COLUMNS, RING_ROWS, (x, y) => {
		if (!band(x, y)) return undefined
		// Next to the hole: its inside edge.
		if ([-1, 1].some((d) => !band(x + d, y) && inside(x + d, y, RING_BAND)))
			return lit ? GOLD : GOLD_DARK
		if ([-1, 1].some((d) => !band(x, y + d) && inside(x, y + d, RING_BAND)))
			return lit ? GOLD : GOLD_DARK
		// Its outside edge, up on its left: the light on it.
		const edge = [-1, 1].some(
			(d) => !inside(x + d, y, 0) || !inside(x, y + d, 0),
		)
		if (edge && x < rx && y < ry) return lit ? '#ffffff' : GOLD_LIGHT
		return lit ? LIT : GOLD
	})
}
const RING = ring(false)
const RING_LIT = ring(true)

/**
 * A Ring, seen almost edge on: its near half, in front of whoever's going
 * through it, or its far half, behind them. Lit up, flown through.
 */
export function RingArt(props: { half: 'near' | 'far'; lit: boolean }) {
	return (
		<div
			style={{
				'line-height': 0,
				'clip-path':
					props.half === 'near'
						? 'inset(-8px 50% -8px -8px)'
						: 'inset(-8px -8px -8px 50%)',
				filter: props.lit ? 'drop-shadow(0 0 6px #fff4a0)' : undefined,
			}}
		>
			<PixelArt
				src={props.lit ? RING_LIT : RING}
				width={RING_WIDTH}
				height={RING_HEIGHT}
			/>
		</div>
	)
}
