import bg1Asset from '@/assets/misc/bg1.png'
import bg2Asset from '@/assets/misc/bg2.png'
import bg3Asset from '@/assets/misc/bg3.png'
import cloud1Asset from '@/assets/misc/cloud1.png'
import cloud2Asset from '@/assets/misc/cloud2.png'
import flower1Asset from '@/assets/misc/flower1.png'
import flower2Asset from '@/assets/misc/flower2.png'
import house1Asset from '@/assets/misc/house1.png'
import house2Asset from '@/assets/misc/house2.png'
import pathAsset from '@/assets/misc/path.png'
import shrub1Asset from '@/assets/misc/shrub1.png'
import sunAsset from '@/assets/misc/sun.png'
import { For, type JSX, Show } from 'solid-js'
import gooseWingsDownAsset from '../assets/flyers/goose-wings-down.png'
import gooseWingsUpAsset from '../assets/flyers/goose-wings-up.png'
import tree1Asset from '../assets/scenery/tree1.png'
import tree2Asset from '../assets/scenery/tree2.png'
import {
	birchLeft,
	birchRight,
	birchTall,
	echoTemple,
	lilacBush,
	parkBench,
	parkLamp,
} from '../courses/kit/hagaScenery'
import { busStyle } from '../draw/art/busStyle'
import { VIEW_HEIGHT } from '../game/constants'
import { customRunners } from '../runners/customRunners'
import { guests } from '../runners/guests'
import { MEMBERS, type Playable, customPlayable } from '../runners/playable'
import { RunStrip } from './RunStrip'

/**
 * The menus' scene: Haga scrolling by, the header's scenery bands, houses and
 * trees at their own depths, Haga's own birches, lilacs and benches in among
 * them, Ekotemplet going by occasionally and geese flying over, and a few of
 * the club running along the header's path with the Scoop Bus right behind
 * them. All CSS animation, so it costs nothing to keep running behind the
 * menus.
 */

/** Where the middle hills start: the far houses and pines peek over it. */
const HORIZON = 300
/** The top of the path the runners are on. */
const PATH_TOP = 462
/**
 * How fast the near field goes by, px a second: its grass, and the trees
 * and shrubs stood on it, together, so they don't slide over it.
 */
const FIELD_SPEED = 24

/** A seeded random number generator, so the scene's the same every time. */
function seeded(seed: number) {
	let s = seed
	return () => {
		s = (s * 16807) % 2147483647
		return (s - 1) / 2147483646
	}
}

/**
 * A band of the header's scenery, scrolling left forever at `speed` px a
 * second: its image repeats, so moving it one image width loops seamlessly.
 */
function Band(props: {
	asset: string
	top: number
	height: number
	imageWidth: number
	speed: number
}) {
	return (
		<div
			class="pixelated"
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: `${props.top}px`,
				height: `${props.height}px`,
				'background-image': `url(${props.asset})`,
				'background-repeat': 'repeat-x',
				'--band': `${props.imageWidth}px`,
				animation: `band-scroll ${props.imageWidth / props.speed}s linear infinite`,
			}}
		/>
	)
}

/** Room for one loop of a strip: wider than the stage, so it never shows its seam. */
const STRIP_WIDTH = 1200

/** Something to stand along a strip: where its foot is, and its size if it's code art. */
type Piece = {
	asset: string
	bottom: (random: () => number) => number
	/** Drawn this size, px: code art's drawn a cell a pixel, so it's given. */
	width?: number
	height?: number
	/** Another stood just to its right, at the same depth: a bench's lamp. */
	beside?: { asset: string; dx: number; width: number; height: number }
}

/** One lot of pieces dotted along a strip, from its own random numbers. */
type Layout = { seed: number; gap: [number, number]; pieces: Piece[] }

type Placed = {
	asset: string
	x: number
	bottom: number
	width?: number
	height?: number
}

/**
 * Things dotted along the scene, scrolling left forever: laid out across one
 * strip's width, drawn twice side by side, and moved one strip's width per
 * loop. Each layout has its own random numbers, so adding one leaves the
 * others where they were; all of them are drawn back to front, by their foot.
 */
function Strip(props: {
	speed: number
	layouts: Layout[]
	/** One loop's width, if not `STRIP_WIDTH`: wider, for a landmark to come by less often. */
	width?: number
	/** Stood once a loop at `x`, with nothing else within `room` of it. */
	landmark?: { x: number; room: number; piece: Piece }
	clipBelow?: number
}) {
	const width = props.width ?? STRIP_WIDTH
	let items: Placed[] = []
	const place = (piece: Piece, x: number, random: () => number) => {
		const bottom = piece.bottom(random)
		items.push({
			asset: piece.asset,
			x: Math.round(x),
			bottom,
			width: piece.width,
			height: piece.height,
		})
		if (piece.beside)
			items.push({
				asset: piece.beside.asset,
				x: Math.round(x) + piece.beside.dx,
				bottom,
				width: piece.beside.width,
				height: piece.beside.height,
			})
	}
	for (const layout of props.layouts) {
		const random = seeded(layout.seed)
		for (
			let x = 0;
			x < width - layout.gap[0];
			x += layout.gap[0] + random() * (layout.gap[1] - layout.gap[0])
		)
			place(
				layout.pieces[Math.floor(random() * layout.pieces.length)],
				x,
				random,
			)
	}
	const landmark = props.landmark
	if (landmark) {
		items = items.filter(
			(item) => Math.abs(item.x - landmark.x) > landmark.room,
		)
		place(landmark.piece, landmark.x, () => 0)
	}
	// Further back first, so what's nearer stands in front of it.
	items.sort((a, b) => a.bottom - b.bottom)
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				overflow: 'hidden',
				...(props.clipBelow === undefined
					? {}
					: { bottom: `${VIEW_HEIGHT - props.clipBelow}px` }),
			}}
		>
			<div
				class="pixelated"
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: `${width * 2}px`,
					height: `${VIEW_HEIGHT}px`,
					'--strip-width': `${width}px`,
					animation: `strip-scroll ${width / props.speed}s linear infinite`,
				}}
			>
				<For each={[0, width]}>
					{(offset) => (
						<For each={items}>
							{(item) => (
								<img
									src={item.asset}
									alt=""
									style={{
										position: 'absolute',
										left: `${item.x + offset}px`,
										bottom: `${VIEW_HEIGHT - item.bottom}px`,
										...(item.width === undefined
											? {}
											: {
													width: `${item.width}px`,
													height: `${item.height}px`,
												}),
									}}
								/>
							)}
						</For>
					)}
				</For>
			</div>
		</div>
	)
}

/** Peeking `min`–`max` px over the middle hills, however tall it is. */
const peeking = (asset: string, height: number, min: number, max: number) => ({
	asset,
	bottom: (random: () => number) =>
		Math.round(HORIZON - (min + random() * (max - min)) + height),
})
const standing = (asset: string, ground: number, jitter: number) => ({
	asset,
	bottom: (random: () => number) => Math.round(ground - random() * jitter),
})
/** Haga's code art, `columns` by `rows` cells, drawn as the course draws it: 2 px a cell. */
const hagas = (
	asset: string,
	columns: number,
	rows: number,
	ground: number,
	jitter: number,
): Piece => ({
	...standing(asset, ground, jitter),
	width: columns * 2,
	height: rows * 2,
})

/** Where the trees on the field stand: their feet, and how much further back some are. */
const FIELD_GROUND = 410
const FIELD_JITTER = 30
/**
 * The field's loop: twice the others', so Ekotemplet comes by about every
 * 100 s, not every 50.
 */
const FIELD_WIDTH = STRIP_WIDTH * 2

/** A skein of geese: each one's place in it, and when its wings beat. */
const SKEIN = [
	{ x: 0, y: 0, flap: 0 },
	{ x: -34, y: -10, flap: -0.15 },
	{ x: -66, y: -19, flap: -0.3 },
	{ x: -36, y: 12, flap: -0.22 },
]

/**
 * Haga's Canada geese flying over, a skein of four, occasionally: across
 * the sky the way the bus is going, their wings beating, rising and dipping
 * a little as they go. The course's own flying-goose art, turned round.
 */
function Geese() {
	return (
		<div
			class="pixelated"
			style={{
				position: 'absolute',
				left: 0,
				top: '226px',
				animation: 'skein-cross 46s -8s linear infinite',
			}}
		>
			<div
				style={{
					'--bob': '-8px',
					animation: 'sky-bob 5s ease-in-out infinite',
				}}
			>
				<For each={SKEIN}>
					{(goose) => (
						<div
							style={{
								position: 'absolute',
								left: `${goose.x}px`,
								top: `${goose.y}px`,
								width: '36px',
								height: '28px',
								'--up': `url(${gooseWingsUpAsset})`,
								'--down': `url(${gooseWingsDownAsset})`,
								'background-image': 'var(--up)',
								'background-size': '36px 28px',
								'background-repeat': 'no-repeat',
								// Facing left as drawn: turned round to fly right.
								transform: 'scaleX(-1)',
								animation: `goose-flap 0.5s ${goose.flap}s linear infinite`,
							}}
						/>
					)}
				</For>
			</div>
		</div>
	)
}

/** How many are out running behind the menus. */
const PACK_SIZE = 5

/**
 * Five runners at random: club members, guests, and anyone's own runners too. Only
 * those narrow enough to run in the gaps between each other.
 */
function pickPack(): Playable[] {
	const everyone = [
		...MEMBERS,
		...guests(),
		...customRunners().map(customPlayable),
	].filter((runner) => runner.sprite.width <= 30)
	const shuffled = everyone
		.map((runner) => ({ runner, order: Math.random() }))
		.sort((a, b) => a.order - b.order)
		.map(({ runner }) => runner)
	// Never fewer than five: round again if there aren't enough.
	return Array.from(
		{ length: PACK_SIZE },
		(_, i) => shuffled[i % shuffled.length],
	)
}

/** The game's bus, in the artwork picked in Options, built from its parts. */
function Bus(props: { style?: JSX.CSSProperties }) {
	const part = (
		asset: string,
		x: number,
		y: number,
		width: number,
		height: number,
		extra: JSX.CSSProperties = {},
	) => (
		<img
			src={asset}
			alt=""
			style={{
				position: 'absolute',
				left: `${x}px`,
				top: `${y}px`,
				width: `${width}px`,
				height: `${height}px`,
				...extra,
			}}
		/>
	)
	// Whichever artwork's picked in Options: changed there, changed here.
	return (
		<Show when={busStyle()} keyed>
			{(style) => {
				const art = style.plain
				/** Its wheels, bobbing one after another. */
				const wheels = () =>
					art.wheels.map((wheel, i) =>
						part(wheel.asset, wheel.x, wheel.y, wheel.width, wheel.height, {
							animation: `wheel-bob 0.24s ${(i * 0.24) / art.wheels.length}s steps(2) infinite`,
						}),
					)
				return (
					<div
						class="pixelated"
						style={{
							position: 'absolute',
							width: `${style.width}px`,
							height: `${style.height}px`,
							...props.style,
							top: `${PATH_TOP + style.menuTop}px`,
						}}
					>
						<div style={{ animation: 'bus-bob 0.48s steps(2) infinite' }}>
							{style.back && part(style.back, 0, 0, style.width, style.height)}
							{!style.wheelsOver && wheels()}
							{art.windows &&
								part(
									art.windows.asset,
									art.windows.x,
									art.windows.y,
									art.windows.width,
									art.windows.height,
									{ opacity: 0.75 },
								)}
							{part(art.body, 0, 0, style.width, style.height)}
							{style.wheelsOver && wheels()}
							{part(
								art.scoop,
								style.scoop.at.x,
								style.scoop.at.y,
								style.scoop.width,
								style.scoop.height,
								{
									'transform-origin': '20% 80%',
									animation: 'scoop-flick 3.2s ease-in-out infinite',
								},
							)}
						</div>
					</div>
				)
			}}
		</Show>
	)
}

export function MenuBackdrop() {
	/** Five of them out running, picked afresh each time the menus come up. */
	const pack = pickPack()
	return (
		<div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background:
						'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom))',
				}}
			/>
			<img
				src={sunAsset}
				alt=""
				class="pixelated"
				style={{
					position: 'absolute',
					top: '150px',
					right: '90px',
					animation: 'sun-pulse 6s ease-in-out infinite',
				}}
			/>
			<For
				each={[
					{ asset: cloud1Asset, y: 170, duration: 70, delay: 0 },
					{ asset: cloud2Asset, y: 220, duration: 95, delay: -40 },
					{ asset: cloud1Asset, y: 250, duration: 120, delay: -90 },
				]}
			>
				{(cloud) => (
					<img
						src={cloud.asset}
						alt=""
						class="pixelated"
						style={{
							position: 'absolute',
							top: `${cloud.y}px`,
							left: 0,
							animation: `cloud-drift ${cloud.duration}s ${cloud.delay}s linear infinite`,
						}}
					/>
				)}
			</For>
			<Geese />
			<Band
				asset={bg3Asset}
				top={HORIZON - 20}
				height={43}
				imageWidth={357}
				speed={6}
			/>
			<Strip
				speed={9}
				clipBelow={HORIZON + 30}
				layouts={[
					{
						seed: 11,
						gap: [50, 170],
						pieces: [
							peeking(house1Asset, 60, 20, 28),
							peeking(house2Asset, 80, 20, 28),
							peeking(tree2Asset, 110, 30, 50),
						],
					},
				]}
			/>
			<Band
				asset={bg2Asset}
				top={HORIZON}
				height={46}
				imageWidth={482}
				speed={12}
			/>
			<Band
				asset={bg1Asset}
				top={HORIZON}
				height={150}
				imageWidth={1200}
				speed={FIELD_SPEED}
			/>
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: `${HORIZON + 149}px`,
					bottom: 0,
					background: 'var(--grass-green)',
				}}
			/>
			{/*
			 * Trees and shrubs stood on the field, going by with it, as fast: the
			 * header's oaks and pines, and Haga's own birches, lilacs and a bench
			 * with its lamp in among them, and Ekotemplet occasionally.
			 */}
			<Strip
				speed={FIELD_SPEED}
				width={FIELD_WIDTH}
				layouts={[
					{
						seed: 23,
						gap: [110, 300],
						pieces: [
							standing(tree1Asset, FIELD_GROUND, FIELD_JITTER),
							standing(tree2Asset, FIELD_GROUND, FIELD_JITTER),
							standing(shrub1Asset, 430, 6),
						],
					},
					{
						seed: 1880,
						gap: [150, 360],
						pieces: [
							hagas(birchLeft, 26, 60, FIELD_GROUND + 6, FIELD_JITTER),
							hagas(birchRight, 26, 60, FIELD_GROUND + 6, FIELD_JITTER),
							hagas(birchTall, 26, 60, FIELD_GROUND + 6, FIELD_JITTER),
							hagas(lilacBush, 26, 18, FIELD_GROUND + 14, FIELD_JITTER),
							hagas(lilacBush, 26, 18, FIELD_GROUND + 14, FIELD_JITTER),
							{
								...hagas(parkBench, 18, 10, FIELD_GROUND + 12, 10),
								beside: { asset: parkLamp, dx: 42, width: 14, height: 72 },
							},
						],
					},
				]}
				landmark={{
					x: 760,
					room: 150,
					piece: hagas(echoTemple, 64, 50, FIELD_GROUND - 18, 0),
				}}
			/>
			<Band
				asset={pathAsset}
				top={PATH_TOP}
				height={67}
				imageWidth={637}
				speed={90}
			/>
			<Strip
				speed={90}
				layouts={[
					{
						seed: 5,
						gap: [60, 200],
						pieces: [
							standing(flower1Asset, PATH_TOP + 8, 3),
							standing(flower2Asset, PATH_TOP + 8, 3),
						],
					},
				]}
			/>
			<Bus style={{ left: '40px' }} />
			<For each={pack}>
				{(runner, i) => (
					<div
						style={{
							position: 'absolute',
							// Bunched up to the right, ahead of the bus, clear of the
							// title menu so all five are seen.
							left: `${680 + i() * 55}px`,
							top: `${PATH_TOP + 22 + (i() % 2) * 8 - runner.sprite.height * 2}px`,
							animation: `jostle ${3 + (i() % 3) * 0.7}s ${-i() * 0.9}s ease-in-out infinite`,
						}}
					>
						<RunStrip
							run={runner.sprite.run}
							width={runner.sprite.width}
							height={runner.sprite.height}
							stride={0.36 + (i() % 2) * 0.06}
						/>
					</div>
				)}
			</For>
			{/* A little depth haze over everything, so the menus stand out. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background:
						'linear-gradient(to bottom, rgba(15, 31, 41, 0.15), transparent 40%)',
				}}
			/>
		</div>
	)
}
