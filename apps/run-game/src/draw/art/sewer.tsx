import { For, Show } from 'solid-js'
import { SEWAGE_FALL, sewageAt, swampManAt } from '../../game/sewer'
import { GIANT_REACH, steamPuff } from '../../game/steam'

/**
 * The Sewers' Obstacles, drawn: a Swamp Man rising out of his sludge, a
 * Sewage Drain pouring what's washed down off the street, and the Giant
 * Vent that's the way out. All by the tick, so the same on every screen.
 */

type Rect = [number, number, number, number, string]

/** Pixel rects in cells, `scale` screen pixels each. */
function Cells(props: {
	width: number
	height: number
	scale: number
	rects: Rect[]
}) {
	return (
		<svg
			width={props.width * props.scale}
			height={props.height * props.scale}
			viewBox={`0 0 ${props.width} ${props.height}`}
			shape-rendering="crispEdges"
			style={{ display: 'block', overflow: 'visible' }}
			aria-hidden="true"
		>
			<For each={props.rects}>
				{([x, y, w, h, fill]) => (
					<rect x={x} y={y} width={w} height={h} fill={fill} />
				)}
			</For>
		</svg>
	)
}

// --- Swamp Men -------------------------------------------------------------

const SLIME = '#4f7a2a'
const SLIME_DARK = '#2f4d17'
const SLIME_LIGHT = '#86b543'
const WEED = '#3a5a1c'
const SLUDGE = '#45601d'
const SLUDGE_LIGHT = '#6f9a2e'

/** A Swamp Man, facing left, arms out for whoever's coming: 24 by 27 cells. */
const SWAMP_MAN: Rect[] = [
	// Head, lumpy, and his eyes glowing.
	[8, 2, 9, 7, SLIME],
	[9, 1, 3, 1, SLIME],
	[13, 0, 3, 2, SLIME],
	[9, 2, 2, 1, SLIME_LIGHT],
	[15, 3, 2, 6, SLIME_DARK],
	[9, 4, 2, 2, '#f4e04d'],
	[13, 4, 2, 2, '#f4e04d'],
	[10, 7, 4, 1, '#1a2a0c'],
	// His body, shaded down its far side, weed hanging off it.
	[6, 9, 13, 11, SLIME],
	[16, 9, 3, 11, SLIME_DARK],
	[8, 9, 1, 6, WEED],
	[12, 9, 1, 8, WEED],
	[15, 10, 1, 5, WEED],
	// His arms, out, reaching, with claws.
	[1, 10, 6, 3, SLIME],
	[0, 9, 2, 1, SLIME_LIGHT],
	[0, 12, 2, 1, SLIME_LIGHT],
	[2, 14, 5, 3, SLIME],
	[0, 14, 2, 1, SLIME_LIGHT],
	[0, 16, 2, 1, SLIME_LIGHT],
	[4, 13, 1, 2, SLIME_LIGHT],
	// Down into the sludge.
	[7, 20, 11, 7, SLIME_DARK],
]
const MAN_WIDTH = 24
const MAN_HEIGHT = 27

/** His pool of sludge, in screen pixels. */
export const SWAMP_POOL_WIDTH = 64
export const SWAMP_POOL_HEIGHT = 10
const POOL: Rect[] = [
	[6, 0, 52, 10, SLUDGE],
	[0, 3, 64, 7, SLUDGE],
	[10, 2, 14, 2, SLUDGE_LIGHT],
	[40, 5, 10, 2, SLUDGE_LIGHT],
	[28, 1, 4, 2, SLUDGE_LIGHT],
]
/** How tall he's drawn, his pool and all: room for him all the way up. */
export const SWAMP_DRAWN = MAN_HEIGHT * 2 + 4

/**
 * A Swamp Man, rising out of his pool and sinking back into it, and
 * bubbles on it while he's under. His pool's at the bottom of it.
 */
export function SwampManArt(props: { x: number; now: () => number }) {
	const man = () => swampManAt(props.x, props.now())
	return (
		<div
			style={{
				position: 'relative',
				width: `${SWAMP_POOL_WIDTH}px`,
				height: `${SWAMP_DRAWN}px`,
			}}
		>
			{/* Him, up out of the sludge as far as he's risen: the rest of him under it. */}
			<div
				style={{
					position: 'absolute',
					left: `${(SWAMP_POOL_WIDTH - MAN_WIDTH * 2) / 2}px`,
					bottom: `${SWAMP_POOL_HEIGHT / 2}px`,
					width: `${MAN_WIDTH * 2}px`,
					height: `${MAN_HEIGHT * 2}px`,
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						transform: `translateY(${Math.round((1 - man().rise) * MAN_HEIGHT * 2)}px)`,
					}}
				>
					<Cells
						width={MAN_WIDTH}
						height={MAN_HEIGHT}
						scale={2}
						rects={SWAMP_MAN}
					/>
				</div>
			</div>
			<div style={{ position: 'absolute', left: 0, bottom: 0 }}>
				<Cells
					width={SWAMP_POOL_WIDTH}
					height={SWAMP_POOL_HEIGHT}
					scale={1}
					rects={POOL}
				/>
			</div>
			{/* Bubbling, while he's under. */}
			<Show when={man().rise === 0}>
				<For each={[14, 34, 48]}>
					{(left, i) => (
						<div
							style={{
								position: 'absolute',
								left: `${left}px`,
								bottom: `${SWAMP_POOL_HEIGHT - 2}px`,
								width: '4px',
								height: '4px',
								background: SLUDGE_LIGHT,
								opacity: (props.now() + i() * 13) % 40 < 20 ? 1 : 0,
							}}
						/>
					)}
				</For>
			</Show>
		</div>
	)
}

// --- Sewage Drains ---------------------------------------------------------

/** What's washed down off the street, tumbling: each a few cells, two pixels each. */
const JUNK: { width: number; height: number; rects: Rect[] }[] = [
	// A boot.
	{
		width: 7,
		height: 7,
		rects: [
			[0, 0, 4, 5, '#5a3b22'],
			[0, 4, 7, 3, '#5a3b22'],
			[0, 6, 7, 1, '#2b1a0e'],
			[1, 1, 2, 1, '#7d5634'],
		],
	},
	// A can.
	{
		width: 4,
		height: 6,
		rects: [
			[0, 0, 4, 6, '#c8372d'],
			[0, 0, 4, 1, '#c9c9c9'],
			[0, 5, 4, 1, '#c9c9c9'],
			[1, 2, 2, 2, '#f2f2f2'],
		],
	},
	// A banana skin.
	{
		width: 7,
		height: 5,
		rects: [
			[2, 0, 3, 3, '#f2d13a'],
			[0, 2, 3, 3, '#f2d13a'],
			[4, 2, 3, 3, '#e0b72a'],
			[3, 0, 1, 1, '#5a3b22'],
		],
	},
	// A fishbone.
	{
		width: 8,
		height: 5,
		rects: [
			[0, 2, 8, 1, '#ece4d0'],
			[0, 0, 2, 5, '#ece4d0'],
			[3, 1, 1, 3, '#ece4d0'],
			[5, 1, 1, 3, '#ece4d0'],
			[7, 1, 1, 3, '#ece4d0'],
		],
	},
	// A dollop of something.
	{
		width: 5,
		height: 4,
		rects: [
			[1, 0, 3, 1, '#6d5a1f'],
			[0, 1, 5, 3, '#6d5a1f'],
			[1, 1, 2, 1, '#8f7a33'],
		],
	},
]

/** How wide a drain's grate is, and what's drawn of it either side. */
export const SEWAGE_WIDTH = 64
const GRATE = 34
/** How far apart what pours out is, falling. */
const JUNK_SPACING = 46

/**
 * A Sewage Drain, from the street, `fall` over its grate in the Ceiling, to
 * the floor, `fall` under it: its shaft up through the rock to the street,
 * a grate at either end, and, in waves, what pours out of it: drips first,
 * then the lot, tumbling down to the floor. A stain where it lands.
 */
export function SewageArt(props: {
	x: number
	now: () => number
	/** How far down the grate in the Ceiling is, and the floor, from the street. */
	ceiling: number
	floor: number
}) {
	const drain = () => sewageAt(props.x, props.now())
	const fall = props.floor - props.ceiling
	const middle = SEWAGE_WIDTH / 2
	/** How far down the pour's got: from the grate to the floor. */
	const reached = () =>
		drain().pouring ? Math.min(fall, (drain().poured + 1) * SEWAGE_FALL) : 0
	return (
		<div
			style={{
				position: 'relative',
				width: `${SEWAGE_WIDTH}px`,
				height: `${props.floor}px`,
			}}
		>
			{/* Its shaft, up through the rock to the street. */}
			<div
				style={{
					position: 'absolute',
					left: `${middle - GRATE / 2}px`,
					top: '0px',
					width: `${GRATE}px`,
					height: `${props.ceiling}px`,
					background: '#151c11',
					'border-left': '4px solid #2c3324',
					'border-right': '4px solid #2c3324',
					'box-sizing': 'border-box',
				}}
			/>
			{/* Its grates: in the street, and in the Ceiling. */}
			<For each={[0, props.ceiling - 6]}>
				{(top) => (
					<div
						style={{
							position: 'absolute',
							left: `${middle - GRATE / 2 - 2}px`,
							top: `${top}px`,
							width: `${GRATE + 4}px`,
							height: '6px',
							background:
								'repeating-linear-gradient(90deg, #3a3f44 0 4px, #0e1210 4px 7px)',
						}}
					/>
				)}
			</For>
			{/* The pour: a stream down from the grate, and what's in it tumbling. */}
			<Show when={reached() > 0}>
				<div
					style={{
						position: 'absolute',
						left: `${middle - 7}px`,
						top: `${props.ceiling}px`,
						width: '14px',
						height: `${reached()}px`,
						background:
							'linear-gradient(to right, rgba(92,110,36,0.55), rgba(120,140,48,0.8), rgba(92,110,36,0.55))',
					}}
				/>
				<For each={JUNK}>
					{(junk, i) => {
						const y = () => {
							const down = drain().poured * SEWAGE_FALL - i() * JUNK_SPACING
							return down < 0 ? undefined : down % fall
						}
						return (
							<Show when={y() !== undefined}>
								<div
									style={{
										position: 'absolute',
										left: `${middle - junk.width + ((i() * 7) % 11) - 5}px`,
										top: `${props.ceiling + (y() ?? 0)}px`,
										transform: `rotate(${(drain().poured * 9 + i() * 70) % 360}deg)`,
									}}
								>
									<Cells
										width={junk.width}
										height={junk.height}
										scale={2}
										rects={junk.rects}
									/>
								</div>
							</Show>
						)
					}}
				</For>
				{/* Splashing up where it lands. */}
				<Show when={reached() >= fall}>
					<For each={[-16, -6, 8, 18]}>
						{(dx, i) => (
							<div
								style={{
									position: 'absolute',
									left: `${middle + dx}px`,
									top: `${props.floor - 6 - ((props.now() * 3 + i() * 5) % 14)}px`,
									width: '4px',
									height: '4px',
									background: '#7a8c30',
								}}
							/>
						)}
					</For>
				</Show>
			</Show>
			{/* Drips, a wave on its way. */}
			<Show when={drain().dripping}>
				<For each={[-6, 5]}>
					{(dx, i) => (
						<div
							style={{
								position: 'absolute',
								left: `${middle + dx}px`,
								top: `${props.ceiling + ((props.now() * 5 + i() * 60) % fall)}px`,
								width: '4px',
								height: '6px',
								background: '#8a9c3a',
							}}
						/>
					)}
				</For>
			</Show>
			{/* Its stain on the floor. */}
			<div
				style={{
					position: 'absolute',
					left: `${middle - 22}px`,
					top: `${props.floor - 4}px`,
					width: '44px',
					height: '6px',
					background: '#4f5b22',
					'border-radius': '3px',
				}}
			/>
		</div>
	)
}

// --- The Giant Vent --------------------------------------------------------

/** A Giant Vent's grate, across: as far as it fires anyone up. */
export const GIANT_VENT_WIDTH = GIANT_REACH * 2 + 8
export const GIANT_VENT_HEIGHT = 24

/** Air rushing up out of it all the time, and steam, once it's fired someone up. */
const UPDRAFT = [-84, -64, -44, -26, -10, 6, 22, 40, 58, 78]
const GIANT_CLOUDS = [
	{ x: -60, size: 30, delay: 0 },
	{ x: 0, size: 40, delay: 0.06 },
	{ x: 52, size: 34, delay: 0.12 },
	{ x: -28, size: 36, delay: 0.18 },
	{ x: 26, size: 30, delay: 0.24 },
	{ x: -76, size: 26, delay: 0.3 },
	{ x: 70, size: 28, delay: 0.36 },
]

/**
 * A Giant Vent: a great grate in the floor, its fan turning under it, air
 * rushing up out of it, and once it's fired someone up, clouds of steam.
 */
export function GiantVentArt(props: {
	now: () => number
	puffed: () => number | undefined
}) {
	const puff = () => steamPuff(props.puffed(), props.now())
	return (
		<div
			style={{
				position: 'relative',
				width: `${GIANT_VENT_WIDTH}px`,
				height: `${GIANT_VENT_HEIGHT}px`,
			}}
		>
			{/* Its fan, turning, seen through the bars. */}
			<div
				style={{
					position: 'absolute',
					inset: '4px 6px 2px',
					background:
						'repeating-linear-gradient(90deg, #1b2126 0 10px, #59626b 10px 14px)',
					'background-position': `${(props.now() * 3) % 14}px 0`,
				}}
			/>
			{/* Its bars and its frame. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					border: '6px solid #8a949c',
					'border-bottom-width': '2px',
					'box-shadow': 'inset 0 2px 0 #b9c1c7',
					background:
						'repeating-linear-gradient(90deg, transparent 0 10px, #6e7880 10px 14px)',
					'box-sizing': 'border-box',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: '50%',
					bottom: `${GIANT_VENT_HEIGHT - 4}px`,
					width: '0px',
					height: '0px',
				}}
			>
				<For each={UPDRAFT}>
					{(x, i) => (
						<div
							style={{
								position: 'absolute',
								left: `${x}px`,
								bottom: '0px',
								width: '4px',
								height: '40px',
								background: 'rgba(230, 240, 245, 0.55)',
								animation: `steam-rise 0.6s steps(6) ${(i() * 0.17) % 0.6}s infinite`,
							}}
						/>
					)}
				</For>
				<Show when={puff() !== undefined}>
					<For each={GIANT_CLOUDS}>
						{(cloud) => (
							<div
								style={{
									position: 'absolute',
									left: `${cloud.x - cloud.size / 2}px`,
									bottom: '0px',
									width: `${cloud.size}px`,
									height: `${cloud.size}px`,
									background: 'rgba(245, 245, 245, 0.85)',
									'box-shadow': '0 0 0 4px rgba(245, 245, 245, 0.4)',
									animation: `steam-rise 0.45s steps(5) ${cloud.delay}s infinite`,
								}}
							/>
						)}
					</For>
				</Show>
			</div>
		</div>
	)
}
