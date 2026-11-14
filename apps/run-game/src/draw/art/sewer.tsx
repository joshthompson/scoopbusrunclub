import { For, Show } from 'solid-js'
import { SEWAGE_FALL, sewageAt, swampManAt } from '../../game/sewer'
import { GIANT_REACH, steamPuff } from '../../game/steam'
import { cellArt } from '../paint/cells'
import { type SteamBit, paintSteam } from '../paint/steam'

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

// --- Painted on the Canvas Renderer ----------------------------------------

/**
 * A Swamp Man, as `SwampManArt` draws him, painted in a Draw Hook: risen as
 * far as he has out of his pool, the rest of him under it, and bubbles on
 * it while he's under.
 */
export function paintSwampMan(
	ctx: CanvasRenderingContext2D,
	x: number,
	now: number,
) {
	const man = swampManAt(x, now)
	const left = (SWAMP_POOL_WIDTH - MAN_WIDTH * 2) / 2
	const top = SWAMP_DRAWN - SWAMP_POOL_HEIGHT / 2 - MAN_HEIGHT * 2
	ctx.save()
	ctx.beginPath()
	ctx.rect(left, top, MAN_WIDTH * 2, MAN_HEIGHT * 2)
	ctx.clip()
	ctx.drawImage(
		cellArt('swamp-man', MAN_WIDTH, MAN_HEIGHT, 2, SWAMP_MAN),
		left,
		top + Math.round((1 - man.rise) * MAN_HEIGHT * 2),
		MAN_WIDTH * 2,
		MAN_HEIGHT * 2,
	)
	ctx.restore()
	ctx.drawImage(
		cellArt('swamp-pool', SWAMP_POOL_WIDTH, SWAMP_POOL_HEIGHT, 1, POOL),
		0,
		SWAMP_DRAWN - SWAMP_POOL_HEIGHT,
		SWAMP_POOL_WIDTH,
		SWAMP_POOL_HEIGHT,
	)
	if (man.rise !== 0) return
	ctx.fillStyle = SLUDGE_LIGHT
	BUBBLES.forEach((left, i) => {
		if ((now + i * 13) % 40 < 20)
			ctx.fillRect(left, SWAMP_DRAWN - SWAMP_POOL_HEIGHT - 2, 4, 4)
	})
}
const BUBBLES = [14, 34, 48]

/**
 * A Sewage Drain, as `SewageArt` draws it, painted in a Draw Hook: its shaft
 * and grates, and what's pouring, dripping and splashing out of it at `now`.
 */
export function paintSewage(
	ctx: CanvasRenderingContext2D,
	x: number,
	now: number,
	/** How far down the grate in the Ceiling is, and the floor, from the street. */
	ceiling: number,
	floor: number,
) {
	const drain = sewageAt(x, now)
	const fall = floor - ceiling
	const middle = SEWAGE_WIDTH / 2
	const reached = drain.pouring
		? Math.min(fall, (drain.poured + 1) * SEWAGE_FALL)
		: 0
	// Its shaft, up through the rock to the street, its sides edged.
	const shaft = middle - GRATE / 2
	ctx.fillStyle = '#151c11'
	ctx.fillRect(shaft, 0, GRATE, ceiling)
	ctx.fillStyle = '#2c3324'
	ctx.fillRect(shaft, 0, 4, ceiling)
	ctx.fillRect(shaft + GRATE - 4, 0, 4, ceiling)
	// Its grates: in the street, and in the Ceiling. Bars 4 px wide, 7 apart.
	for (const top of [0, ceiling - 6]) {
		const left = middle - GRATE / 2 - 2
		ctx.fillStyle = '#0e1210'
		ctx.fillRect(left, top, GRATE + 4, 6)
		ctx.fillStyle = '#3a3f44'
		for (let bar = 0; bar < GRATE + 4; bar += 7)
			ctx.fillRect(left + bar, top, Math.min(4, GRATE + 4 - bar), 6)
	}
	if (reached > 0) {
		// The pour: a stream down from the grate, lighter down its middle.
		const stream = ctx.createLinearGradient(middle - 7, 0, middle + 7, 0)
		stream.addColorStop(0, 'rgba(92,110,36,0.55)')
		stream.addColorStop(0.5, 'rgba(120,140,48,0.8)')
		stream.addColorStop(1, 'rgba(92,110,36,0.55)')
		ctx.fillStyle = stream
		ctx.fillRect(middle - 7, ceiling, 14, reached)
		// What's in it, tumbling, each turned about its own middle.
		JUNK.forEach((junk, i) => {
			const down = drain.poured * SEWAGE_FALL - i * JUNK_SPACING
			if (down < 0) return
			const width = junk.width * 2
			const height = junk.height * 2
			const left = middle - junk.width + ((i * 7) % 11) - 5
			const top = ceiling + (down % fall)
			ctx.save()
			ctx.translate(left + width / 2, top + height / 2)
			ctx.rotate((((drain.poured * 9 + i * 70) % 360) * Math.PI) / 180)
			ctx.drawImage(
				cellArt(`junk-${i}`, junk.width, junk.height, 2, junk.rects),
				-width / 2,
				-height / 2,
				width,
				height,
			)
			ctx.restore()
		})
		// Splashing up where it lands.
		if (reached >= fall) {
			ctx.fillStyle = '#7a8c30'
			SPLASHES.forEach((dx, i) =>
				ctx.fillRect(middle + dx, floor - 6 - ((now * 3 + i * 5) % 14), 4, 4),
			)
		}
	}
	// Drips, a wave on its way.
	if (drain.dripping) {
		ctx.fillStyle = '#8a9c3a'
		DRIPS.forEach((dx, i) =>
			ctx.fillRect(middle + dx, ceiling + ((now * 5 + i * 60) % fall), 4, 6),
		)
	}
	// Its stain on the floor.
	ctx.fillStyle = '#4f5b22'
	ctx.beginPath()
	ctx.roundRect(middle - 22, floor - 4, 44, 6, 3)
	ctx.fill()
}
const SPLASHES = [-16, -6, 8, 18]
const DRIPS = [-6, 5]

/** Air rushing up out of a Giant Vent, as bits of steam: each a strip, rising off its grate. */
const UPDRAFT_BITS: SteamBit[] = UPDRAFT.map((x, i) => ({
	x: GIANT_VENT_WIDTH / 2 + x,
	y: 4 - 40,
	width: 4,
	height: 40,
	colour: 'rgba(230, 240, 245, 0.55)',
	delay: (i * 0.17) % 0.6,
}))
/** A Giant Vent's clouds of steam, once it's fired someone up. */
const GIANT_CLOUD_BITS: SteamBit[] = GIANT_CLOUDS.map((cloud) => ({
	x: GIANT_VENT_WIDTH / 2 + cloud.x - cloud.size / 2,
	y: 4 - cloud.size,
	width: cloud.size,
	height: cloud.size,
	colour: 'rgba(245, 245, 245, 0.85)',
	ring: { width: 4, colour: 'rgba(245, 245, 245, 0.4)' },
	delay: cloud.delay,
}))

/** Its frame's sides, and how far in its fan is, at the top and bottom. */
const VENT_FRAME = 6
const VENT_FRAME_BOTTOM = 2
const FAN_TOP = 4

/**
 * A Giant Vent, as `GiantVentArt` draws it, painted in a Draw Hook: its fan
 * turning under its bars, air rushing up out of it, and once it's fired
 * someone up at `puffed`, clouds of steam.
 */
export function paintGiantVent(
	ctx: CanvasRenderingContext2D,
	now: number,
	puffed: number | undefined,
) {
	const inner = GIANT_VENT_WIDTH - VENT_FRAME * 2
	const fanHeight = GIANT_VENT_HEIGHT - FAN_TOP - VENT_FRAME_BOTTOM
	// Its fan, turning, seen through the bars: dark, with a lighter blade
	// every 14 px, moving along, each cut off at its ends.
	ctx.fillStyle = '#1b2126'
	ctx.fillRect(VENT_FRAME, FAN_TOP, inner, fanHeight)
	ctx.fillStyle = '#59626b'
	for (let at = ((now * 3) % 14) - 4; at < inner; at += 14) {
		const from = Math.max(0, at)
		const to = Math.min(inner, at + 4)
		if (to > from)
			ctx.fillRect(VENT_FRAME + from, FAN_TOP, to - from, fanHeight)
	}
	// Its bars, over the fan, and a light along under its top.
	const barsHeight = GIANT_VENT_HEIGHT - VENT_FRAME - VENT_FRAME_BOTTOM
	ctx.fillStyle = '#6e7880'
	for (let at = 10; at < inner; at += 14)
		ctx.fillRect(
			VENT_FRAME + at,
			VENT_FRAME,
			Math.min(4, inner - at),
			barsHeight,
		)
	ctx.fillStyle = '#b9c1c7'
	ctx.fillRect(VENT_FRAME, VENT_FRAME, inner, 2)
	// Its frame.
	ctx.fillStyle = '#8a949c'
	ctx.fillRect(0, 0, GIANT_VENT_WIDTH, VENT_FRAME)
	ctx.fillRect(0, 0, VENT_FRAME, GIANT_VENT_HEIGHT)
	ctx.fillRect(GIANT_VENT_WIDTH - VENT_FRAME, 0, VENT_FRAME, GIANT_VENT_HEIGHT)
	ctx.fillRect(
		0,
		GIANT_VENT_HEIGHT - VENT_FRAME_BOTTOM,
		GIANT_VENT_WIDTH,
		VENT_FRAME_BOTTOM,
	)
	paintSteam(ctx, now, UPDRAFT_BITS, { seconds: 0.6, steps: 6 })
	// Its clouds rise from when it puffed, as they're put on the page then.
	const puff = steamPuff(puffed, now)
	if (puff !== undefined && puffed !== undefined)
		paintSteam(ctx, now - puffed, GIANT_CLOUD_BITS, { seconds: 0.45, steps: 5 })
}
