import bg1Asset from '@/assets/misc/bg1.png'
import bg2Asset from '@/assets/misc/bg2.png'
import bg3Asset from '@/assets/misc/bg3.png'
import cloud1Asset from '@/assets/misc/cloud1.png'
import cloud2Asset from '@/assets/misc/cloud2.png'
import house1Asset from '@/assets/misc/house1.png'
import house2Asset from '@/assets/misc/house2.png'
import sunAsset from '@/assets/misc/sun.png'
import tree1Asset from '@/assets/misc/tree1.png'
import tree2Asset from '@/assets/misc/tree2.png'
import { For, type JSX, Show } from 'solid-js'
import { seeded } from '../levels/seeded'
import type { BackdropPiece } from '../levels/types'
import { StadiumBackdrop } from './Stadium'
import {
	CAMERA_LEAD,
	PATH_BACK,
	PATH_FRONT,
	START_X,
	VERGE,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from './constants'
import type { World } from './world'

/**
 * What the backdrop needs to draw a course: which, and where the camera is.
 * The game's world, or the course select's preview of it.
 */
export type View = Pick<World, 'camera' | 'level' | 'terrain'>

const layer: JSX.CSSProperties = { position: 'absolute', left: 0, right: 0 }

const CLOUDS = [
	{ asset: cloud1Asset, x: 80, y: 60 },
	{ asset: cloud2Asset, x: 520, y: 100 },
	{ asset: cloud1Asset, x: 900, y: 40 },
]

/** Room off either edge for a cloud to go out of sight before it wraps round. */
const CLOUD_ROOM = 100
const wrap = (x: number) => {
	const span = VIEW_WIDTH + CLOUD_ROOM * 2
	return (((x + CLOUD_ROOM) % span) + span) % span
}

/** Something to scatter, and where its bottom goes, as a y on the screen. */
interface Piece {
	asset: string
	standsAt: (random: () => number) => number
	/** Drawn this many times its size, from its foot. */
	scale?: number
	filter?: string
}

/** Stood on the ground at `ground`, give or take `jitter` further back. */
const standing = (
	asset: string,
	ground: number,
	jitter: number,
	look: Pick<Piece, 'scale' | 'filter'> = {},
): Piece => ({
	asset,
	standsAt: (random) => ground - random() * jitter,
	...look,
})

/** Where the middle band of hills starts, which the far scenery peeks over. */
const HORIZON = 216

/**
 * Peeking `min` to `max` px over the middle hills, the rest of it hidden
 * behind them, however tall it's drawn: the houses' walls run long so they
 * can stand anywhere, and only ever this much shows.
 */
const peeking = (
	asset: string,
	height: number,
	min: number,
	max: number,
	look: Pick<Piece, 'scale' | 'filter'> = {},
): Piece => ({
	asset,
	standsAt: (random) => HORIZON - (min + random() * (max - min)) + height,
	...look,
})

interface Scattering {
	parallax: number
	/**
	 * Nothing below this y is drawn: what's meant to be hidden behind the hills
	 * in front (the houses' long walls) can't show through any gap in them.
	 */
	clipBelow?: number
	/** Gaps between one thing and the next, in the layer's own pixels. */
	gap: [number, number]
	pieces: Piece[]
	seed: number
}

/**
 * Scenery dotted along a band of the backdrop, scrolling with it: one
 * container moved as the camera moves, rather than every tree and house.
 */
function Scattered(props: { world: View; scattering: Scattering }) {
	const { parallax, gap, pieces, seed, clipBelow } = props.scattering
	const random = seeded(seed)
	// As far as the camera ever goes, either way, at this layer's speed.
	const from = (START_X - 1300 - VIEW_WIDTH * CAMERA_LEAD) * parallax - 100
	const to = (props.world.terrain.finishX + 500) * parallax + VIEW_WIDTH + 100
	const items: { piece: Piece; x: number; bottom: number }[] = []
	for (let x = from; x < to; x += gap[0] + random() * (gap[1] - gap[0])) {
		const piece = pieces[Math.floor(random() * pieces.length)]
		items.push({
			piece,
			x: Math.round(x),
			bottom: Math.round(VIEW_HEIGHT - piece.standsAt(random)),
		})
	}

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				overflow: 'hidden',
				...(clipBelow === undefined
					? {}
					: { bottom: `${VIEW_HEIGHT - clipBelow}px` }),
			}}
		>
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: `${VIEW_WIDTH}px`,
					height: `${VIEW_HEIGHT}px`,
					transform: `translateX(${Math.round(-props.world.camera() * parallax)}px)`,
					'will-change': 'transform',
				}}
			>
				<For each={items}>
					{(item) => (
						<img
							src={item.piece.asset}
							alt=""
							class={item.piece.scale ? 'pixelated' : undefined}
							style={{
								position: 'absolute',
								left: `${item.x}px`,
								bottom: `${item.bottom}px`,
								filter: item.piece.filter,
								...(item.piece.scale
									? {
											transform: `scale(${item.piece.scale})`,
											'transform-origin': 'bottom center',
										}
									: {}),
							}}
						/>
					)}
				</For>
			</div>
		</div>
	)
}

/**
 * Red Swedish houses and trees out past the far hills, as in the header:
 * behind the middle band of hills, so they peek over it.
 */
const HAGA_FAR: Scattering = {
	parallax: 0.17,
	// Well inside the middle hills, which are solid from 16 px down.
	clipBelow: HORIZON + 30,
	gap: [40, 150],
	pieces: [
		// As much as the header shows of them: about 25 px.
		peeking(house1Asset, 60, 20, 28),
		peeking(house2Asset, 80, 20, 28),
		// Pines only: the big leafy trees would look as near as the ones on the field.
		peeking(tree2Asset, 110, 30, 50),
		peeking(tree2Asset, 110, 30, 50),
	],
	seed: 11,
}

/**
 * Where the field behind the course scrolls: the near band of hills, which
 * runs down into it, and so everything stood on it, or it slides about on
 * the grass under it.
 */
const FIELD_PARALLAX = 0.35

/** Trees on the field behind the course. */
const HAGA_NEAR: Scattering = {
	parallax: FIELD_PARALLAX,
	gap: [90, 320],
	pieces: [standing(tree1Asset, 300, 30), standing(tree2Asset, 300, 30)],
	seed: 23,
}

/** A level's own `far` pieces, peeking over the hills as much as Haga's houses do. */
function farOf(pieces: BackdropPiece[]): Scattering {
	return {
		...HAGA_FAR,
		pieces: pieces.map(({ asset, height, scale = 1, filter }) =>
			peeking(asset, height * scale, 18, 30, { scale, filter }),
		),
	}
}

/** And its `near` ones, stood on the field. */
function nearOf(pieces: BackdropPiece[]): Scattering {
	return {
		...HAGA_NEAR,
		gap: [70, 240],
		pieces: pieces.map(({ asset, scale, filter }) =>
			standing(asset, 300, 30, { scale, filter }),
		),
	}
}

/**
 * The sky and the header's scenery bands behind the course, each scrolling
 * slower the further back it is.
 */
export function Backdrop(props: { world: View }) {
	const look = props.world.level.look ?? {}
	const far = look.far ? farOf(look.far) : HAGA_FAR
	const near = look.near ? nearOf(look.near) : HAGA_NEAR
	const scroll = (parallax: number) =>
		`${Math.round(-props.world.camera() * parallax)}px`

	const band = (
		asset: string,
		top: number,
		height: number,
		parallax: number,
		filter: string | undefined,
	): JSX.Element => (
		<div
			style={{
				...layer,
				top: `${top}px`,
				height: `${height}px`,
				'background-image': `url(${asset})`,
				'background-repeat': 'repeat-x',
				'background-position-x': scroll(parallax),
				filter,
			}}
		/>
	)

	return (
		<>
			<div
				style={{
					...layer,
					top: 0,
					bottom: 0,
					background:
						'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom))',
				}}
			/>
			<img
				src={sunAsset}
				alt=""
				style={{
					position: 'absolute',
					top: '40px',
					right: '120px',
					filter: look.sun,
				}}
			/>
			<For each={CLOUDS}>
				{(cloud) => (
					// Drifting by slowly, and back round from the right once off the left.
					<img
						src={cloud.asset}
						alt=""
						style={{
							position: 'absolute',
							top: `${cloud.y}px`,
							left: `${wrap(cloud.x - props.world.camera() * 0.05) - CLOUD_ROOM}px`,
						}}
					/>
				)}
			</For>
			<Show
				when={!look.stadium}
				fallback={<StadiumBackdrop world={props.world} />}
			>
				{band(bg3Asset, 196, 43, 0.12, look.hills?.[0])}
				<Scattered world={props.world} scattering={far} />
				{band(bg2Asset, 216, 46, 0.22, look.hills?.[1])}
				{/* Level with the middle hills, as in the header: any lower and the
				    sky shows through between them. */}
				{band(bg1Asset, HORIZON, 150, FIELD_PARALLAX, look.hills?.[2])}
				<div
					style={{
						...layer,
						top: `${HORIZON + 149}px`,
						bottom: 0,
						background: 'var(--grass-green)',
					}}
				/>
				<Scattered world={props.world} scattering={near} />
			</Show>
		</>
	)
}

/**
 * Where the path's back edge has to be above for the trees on the field
 * (`NEAR`, standing at about 270–300) to be hidden behind the ground. Up there,
 * `HorizonTrees` take over.
 */
const HIGH_PATH = 300
/** The horizon trees, and their size, which has to be known to hide their feet. */
const HORIZON_TREES = [
	{ asset: tree1Asset, width: 87, height: 120 },
	{ asset: tree2Asset, width: 56, height: 110 },
]

/**
 * Trees just over the brow, where the course runs high: stood behind the
 * ground, feet hidden below the back of the path, so only their tops show
 * over it. They follow the course, so they're placed against its hills.
 */
export function HorizonTrees(props: { world: View }) {
	const { terrain } = props.world
	const random = seeded(37)
	/** The top of the ground: the grass behind the path. */
	const backEdge = (x: number) => terrain.groundY(x) - PATH_BACK - VERGE
	const trees: { asset: string; x: number; top: number }[] = []

	for (
		let x = START_X - 1300;
		x < terrain.finishX + 600;
		x += 50 + random() * 170
	) {
		const tree = HORIZON_TREES[Math.floor(random() * HORIZON_TREES.length)]
		const sink = 6 + random() * 36
		const left = x - tree.width / 2
		// The lowest the back of the path gets under it, so its foot's hidden
		// all the way across, even on a slope.
		const lowest = Math.max(
			backEdge(left),
			backEdge(x),
			backEdge(left + tree.width),
		)
		if (lowest > HIGH_PATH) continue
		trees.push({
			asset: tree.asset,
			x: Math.round(left),
			top: Math.round(lowest + sink - tree.height),
		})
	}

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				transform: `translateX(${Math.round(-props.world.camera())}px)`,
				'will-change': 'transform',
			}}
		>
			<For each={trees}>
				{(tree) => (
					<img
						src={tree.asset}
						alt=""
						style={{
							position: 'absolute',
							left: `${tree.x}px`,
							top: `${tree.top}px`,
							filter: props.world.level.look?.foliage,
						}}
					/>
				)}
			</For>
		</div>
	)
}

const STEP = 4
/** Drawn from this far behind the start, for the bus to drive out of. */
const DRAWN_FROM = START_X - 1400

/**
 * The course's ground, drawn once, in steps 4 px wide so its slopes come out
 * as pixel art: the dirt path with grass either side of it, like the header's
 * path, and the grass on down to the bottom of the screen in front.
 */
export function Ground(props: { world: View }) {
	const { terrain } = props.world
	const drawnTo = terrain.finishX + 1600
	const width = drawnTo - DRAWN_FROM

	const tops: number[] = []
	for (let x = DRAWN_FROM; x <= drawnTo; x += STEP)
		tops.push(Math.round(terrain.groundY(x + STEP / 2) / 2) * 2)

	/** The ground's outline, `offset` px down from it, closed off along the bottom. */
	const outline = (offset: number) => {
		let d = `M0,${VIEW_HEIGHT} V${tops[0] + offset}`
		for (let i = 1; i < tops.length; i++)
			d += ` H${i * STEP} V${tops[i] + offset}`
		return `${d} H${width} V${VIEW_HEIGHT} Z`
	}

	// The path, with the line everyone runs along down its middle, and the
	// grass on down to the bottom of the screen in front of it.
	const layers: [number, string][] = props.world.level.look?.ground ?? [
		// The verge: the same green as the field, so it only shows where
		// the course runs higher than the field does.
		[-PATH_BACK - VERGE, 'var(--grass-green)'],
		[-PATH_BACK, 'var(--dirt-dark-brown)'],
		[-PATH_BACK + 5, 'var(--dirt-brown)'],
		[PATH_FRONT, 'var(--grass-dark-green)'],
		[PATH_FRONT + 2, 'var(--grass-green)'],
	]

	return (
		<svg
			width={width}
			height={VIEW_HEIGHT}
			viewBox={`0 0 ${width} ${VIEW_HEIGHT}`}
			shape-rendering="crispEdges"
			aria-hidden="true"
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				transform: `translateX(${Math.round(DRAWN_FROM - props.world.camera())}px)`,
				'will-change': 'transform',
			}}
		>
			<For each={layers}>
				{([offset, fill]) => <path d={outline(offset)} fill={fill} />}
			</For>
		</svg>
	)
}
