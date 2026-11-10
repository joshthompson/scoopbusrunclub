import lightningAsset from '@/assets/background/lightning.png'
import bg1Asset from '@/assets/misc/bg1.png'
import bg2Asset from '@/assets/misc/bg2.png'
import bg3Asset from '@/assets/misc/bg3.png'
import cloud1Asset from '@/assets/misc/cloud1.png'
import cloud2Asset from '@/assets/misc/cloud2.png'
import house1Asset from '@/assets/misc/house1.png'
import house2Asset from '@/assets/misc/house2.png'
import sunAsset from '@/assets/misc/sun.png'
import { For, type JSX, Show } from 'solid-js'
import tree1Asset from '../assets/scenery/tree1.png'
import tree2Asset from '../assets/scenery/tree2.png'
import { seeded } from '../courses/kit/seeded'
import type { BackdropPiece, SkyFlyer } from '../courses/types'
import {
	CAMERA_LEAD,
	DEPTH_SLANT,
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	START_X,
	VERGE,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import type { Block } from '../game/terrain'
import type { World } from '../game/world'
import { StadiumBackdrop } from './Stadium'
import { backMerlons } from './battlements'

/**
 * What the backdrop needs to draw a course: which, and where the camera is.
 * The game's world, or the course select's preview of it.
 */
export type View = Pick<World, 'camera' | 'course' | 'terrain'> &
	Partial<Pick<World, 'cameraY'>>

/**
 * How much of the camera looking up or down the backdrop goes with: a
 * little, it's a long way off.
 */
const BACKDROP_LIFT = 0.3

/**
 * How far above the top of the screen the ground's drawn, for the camera
 * looking up at rooftops and Platforms: more than the two screens' height
 * a course can climb.
 */
export const SKY_ROOM = 1200

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

/** How tall a horizon's strip of spires is: up from the bottom of its far band. */
const SPIRES_HEIGHT = 300

/** How tall a band of a course's own horizon is drawn. */
const SKYLINE_HEIGHT = 160

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

/** A course's own `far` pieces, peeking over the hills as much as Haga's houses do. */
function farOf(pieces: BackdropPiece[]): Scattering {
	return {
		...HAGA_FAR,
		pieces: pieces.map(({ asset, height, scale = 1, filter }) =>
			peeking(asset, height * scale, 18, 30, { scale, filter }),
		),
	}
}

/** And its `near` ones, stood on the field. */
function nearOf(
	pieces: BackdropPiece[],
	gap: [number, number] = [70, 240],
): Scattering {
	return {
		...HAGA_NEAR,
		gap,
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
	const look = props.world.course.look ?? {}
	const far = look.far ? farOf(look.far) : HAGA_FAR
	const near = look.near ? nearOf(look.near, look.nearGap) : HAGA_NEAR
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

	// The whole canvas goes with the camera looking up or down: this goes
	// back the other way, all but a little of it.
	const lift = () =>
		`translateY(${Math.round((props.world.cameraY?.() ?? 0) * (1 - BACKDROP_LIFT))}px)`

	return (
		<div style={{ position: 'absolute', inset: 0, transform: lift() }}>
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
				src={look.sunAsset ?? sunAsset}
				alt=""
				class={look.sunScale ? 'pixelated' : undefined}
				style={{
					position: 'absolute',
					top: '40px',
					right: '120px',
					filter: look.sun,
					transform: look.sunScale ? `scale(${look.sunScale})` : undefined,
					'transform-origin': 'top right',
				}}
			/>
			<Show when={look.lightning}>
				<Lightning />
			</Show>
			<For each={look.skyFlyers ?? []}>
				{(flyer, i) => <SkyFlyers flyer={flyer} seed={i() + 1} />}
			</For>
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
							filter: look.clouds,
						}}
					/>
				)}
			</For>
			<Show when={look.horizon}>
				{(horizon) => (
					<>
						{/* Spires and towers rising out of the far roofs, behind them. */}
						<Show when={horizon().spires}>
							{(spires) =>
								band(
									spires(),
									HORIZON - 100 + SKYLINE_HEIGHT - SPIRES_HEIGHT,
									SPIRES_HEIGHT,
									0.08,
									undefined,
								)
							}
						</Show>
						{band(
							horizon().far,
							HORIZON - 100,
							SKYLINE_HEIGHT,
							0.08,
							undefined,
						)}
						{/* The far band's own colour on down behind the near one, so no sky shows between. */}
						<div
							style={{
								...layer,
								top: `${HORIZON - 100 + SKYLINE_HEIGHT - 1}px`,
								bottom: 0,
								background: horizon().fill,
							}}
						/>
						{band(
							horizon().near,
							HORIZON - 40,
							SKYLINE_HEIGHT,
							0.16,
							undefined,
						)}
						<div
							style={{
								...layer,
								top: `${HORIZON - 40 + SKYLINE_HEIGHT - 1}px`,
								bottom: 0,
								background: 'var(--grass-green)',
							}}
						/>
					</>
				)}
			</Show>
			<Show
				when={!look.stadium && !look.horizon}
				fallback={
					<Show when={look.stadium}>
						<StadiumBackdrop world={props.world} />
					</Show>
				}
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
		</div>
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
 * Lightning, now and then: a flash over the sky, and a bolt or two out of
 * the top of it, on two beats that don't line up, so it's never regular.
 */
function Lightning() {
	const strike = (seconds: number, delay: number, x: number) => (
		<>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: '#f4ecff',
					opacity: 0,
					animation: `lightning-flash ${seconds}s ${delay}s infinite`,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: `${VIEW_WIDTH}px`,
					height: '150px',
					'background-image': `url(${lightningAsset})`,
					'background-position-x': `${-x}px`,
					opacity: 0,
					transform: 'scale(1.6)',
					'transform-origin': 'top left',
					animation: `lightning-flash ${seconds}s ${delay}s infinite`,
				}}
			/>
		</>
	)
	return (
		<>
			{strike(9, 2, 300)}
			{strike(13, 6.5, 1400)}
		</>
	)
}

/** `flyer.count` of something crossing the sky, each at its own height and time. */
function SkyFlyers(props: { flyer: SkyFlyer; seed: number }) {
	const { flyer } = props
	const random = seeded(props.seed * 97)
	const frames = flyer.frames ?? 1
	const scale = flyer.scale ?? 1
	const items = Array.from({ length: flyer.count }, () => ({
		top: flyer.band[0] + random() * (flyer.band[1] - flyer.band[0]),
		delay: -random() * flyer.seconds,
		seconds: flyer.seconds * (0.8 + random() * 0.4),
	}))
	return (
		<For each={items}>
			{(item) => (
				<div
					style={{
						position: 'absolute',
						left: 0,
						top: `${item.top}px`,
						animation: `sky-cross ${item.seconds}s ${item.delay}s linear infinite`,
					}}
				>
					<div
						class="pixelated"
						style={{
							width: `${flyer.width * scale}px`,
							height: `${flyer.height * scale}px`,
							'background-image': `url(${flyer.asset})`,
							'background-size': `${flyer.width * frames * scale}px 100%`,
							'--strip': `${-flyer.width * frames * scale}px`,
							opacity: flyer.opacity ?? 1,
							animation: [
								frames > 1 ? `flap 0.4s steps(${frames}) infinite` : undefined,
								flyer.bob
									? `sky-bob ${2 + random() * 2}s ease-in-out infinite`
									: undefined,
							]
								.filter(Boolean)
								.join(', '),
							'--bob': `${-(flyer.bob ?? 0)}px`,
						}}
					/>
				</div>
			)}
		</For>
	)
}

/**
 * Trees just over the brow, where the course runs high: stood behind the
 * ground, feet hidden below the back of the path, so only their tops show
 * over it. They follow the course, so they're placed against its hills.
 */
export function HorizonTrees(props: { world: View }) {
	const { terrain } = props.world
	const random = seeded(37)
	// None, on a course without trees.
	const own = props.world.course.look?.horizonTrees
	if (own === false) return null
	/** The top of the ground: the grass behind the path. */
	const backEdge = (x: number) => terrain.groundY(x) - PATH_BACK - VERGE
	const trees: { asset: string; x: number; top: number }[] = []

	for (
		let x = START_X - 1300;
		x < terrain.finishX + 600;
		x += 50 + random() * 170
	) {
		const kind = Math.floor(random() * HORIZON_TREES.length)
		const tree = {
			...HORIZON_TREES[kind],
			asset: own?.[kind] ?? HORIZON_TREES[kind].asset,
		}
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
		// Nothing to stand behind over a Gap.
		if ([left, x, left + tree.width].some(terrain.inGap)) continue
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
							filter: props.world.course.look?.foliage,
						}}
					/>
				)}
			</For>
		</div>
	)
}

const STEP = 4
/** How much water shows behind a bridge's path, and how deep its underside is. */
const BRIDGE_BEHIND = 70
/** How far out from each end the far shore comes in, the water behind narrowing to nothing. */
const SHORE = 240
/** A bridge's quay walls: how wide, how far over the water they come, and how tall. */
const QUAY_WIDTH = 64
const QUAY_OVER = 4
const QUAY_HEIGHT = 280
/** How deep a bridge is at its ends, and at its slimmest, in the middle. */
const BRIDGE_DEEP = 56
const BRIDGE_SLIM = 16
/** How tall a wall's parapet behind the path is: see `ground` in the Great Wall's look. */
const BACK_PARAPET = 10
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

	/** The top of the ground, every `STEP`: none over a Gap. */
	const tops: (number | undefined)[] = []
	for (let x = DRAWN_FROM; x <= drawnTo; x += STEP) {
		const middle = x + STEP / 2
		tops.push(
			terrain.inGap(middle)
				? undefined
				: Math.round(terrain.groundY(middle) / 2) * 2,
		)
	}

	/**
	 * The ground's outline, `offset` px down from it, closed off along the
	 * bottom: a piece either side of each Gap.
	 */
	const outline = (offset: number) => {
		let d = ''
		let open = false
		tops.forEach((top, i) => {
			if (top === undefined) {
				if (open) d += ` H${i * STEP} V${VIEW_HEIGHT} Z`
				open = false
			} else if (!open) {
				d += ` M${i * STEP},${VIEW_HEIGHT} V${top + offset}`
				open = true
			} else d += ` H${i * STEP} V${top + offset}`
		})
		return open ? `${d} H${width} V${VIEW_HEIGHT} Z` : d
	}

	/**
	 * Down each Gap, from the back of the path on its lower side: a drop,
	 * behind the ground either side.
	 */
	const pits = terrain.gaps.map((gap) => ({
		left: gap.from - DRAWN_FROM,
		width: gap.to - gap.from,
		top:
			Math.max(terrain.groundY(gap.from - 1), terrain.groundY(gap.to)) -
			PATH_BACK,
	}))
	const pitLook =
		props.world.course.look?.gap ??
		'linear-gradient(to bottom, var(--dirt-darker-brown), #140b05 90px)'

	/**
	 * A pyramid's face, foot to foot, under the front edge of the path up
	 * and over it, down to the line between its feet.
	 */
	const pyramidFace = (left: number, right: number) => {
		const below = PATH_FRONT + 2
		const from = Math.floor((left - DRAWN_FROM) / STEP)
		const to = Math.ceil((right - DRAWN_FROM) / STEP)
		const foot = (x: number) => Math.round(terrain.groundY(x)) + below
		let d = `M${from * STEP},${foot(left)}`
		for (let i = from; i < to; i++) {
			const top = tops[i]
			if (top !== undefined) d += ` V${top + below} H${(i + 1) * STEP}`
		}
		return `${d} V${foot(right)} Z`
	}

	const { cave } = props.world.course
	/**
	 * The ground's 4 px columns, from `span`'s top to its bottom in each, as
	 * one path: a piece for each run of columns it has a span for.
	 */
	const columns = (
		span: (x: number, ground: number) => [number, number] | undefined,
		/** On over a Gap too: the rock over it, not the rock in front of the path. */
		overGaps = true,
	) => {
		let d = ''
		let run: [number, number, number][] = []
		const flush = () => {
			if (!run.length) return
			d += ` M${run[0][0] * STEP},${run[0][1]}`
			for (const [i, top] of run) d += ` V${top} H${(i + 1) * STEP}`
			for (let k = run.length - 1; k >= 0; k--)
				d += ` V${run[k][2]} H${run[k][0] * STEP}`
			d += ' Z'
			run = []
		}
		tops.forEach((top, i) => {
			const x = DRAWN_FROM + i * STEP + STEP / 2
			// Over a Gap, from where the floor would be: the rock's still over it.
			const ground = top ?? Math.round(terrain.groundY(x) / 2) * 2
			const range = top === undefined && !overGaps ? undefined : span(x, ground)
			if (!range || range[1] <= range[0]) return flush()
			run.push([i, Math.round(range[0] / 2) * 2, Math.round(range[1] / 2) * 2])
		})
		flush()
		return d
	}
	/** A Cave: its back wall, the rock over it and in front of the path, its underside, and the grass on the hill. */
	const caveParts = cave && {
		wall: columns((x, ground) => {
			const ceiling = cave.ceiling(x)
			return ceiling === undefined ? undefined : [ceiling, ground - PATH_BACK]
		}),
		rock: columns((x) => {
			const ceiling = cave.ceiling(x)
			if (ceiling === undefined) return undefined
			return [Math.max(-SKY_ROOM, cave.surface(x) ?? -SKY_ROOM), ceiling]
		}),
		underside: columns((x) => {
			const ceiling = cave.ceiling(x)
			return ceiling === undefined ? undefined : [ceiling - 4, ceiling]
		}),
		front: columns((x, ground) => {
			const foot = cave.foot(x)
			return foot === undefined || cave.ceiling(x) === undefined
				? undefined
				: [ground + PATH_FRONT + 2, Math.min(VIEW_HEIGHT, foot)]
		}, false),
		grass: columns((x) => {
			const surface = cave.surface(x)
			return surface === undefined || surface < -SKY_ROOM
				? undefined
				: [surface, surface + 6]
		}),
	}

	/**
	 * A bridge the course ends on: the water behind the path, its far rail,
	 * its underside under the path, and the water on down in front.
	 */
	const bridge = props.world.course.look?.bridge
	/**
	 * How deep the bridge is, `x` along it: deep at its ends, where it sits
	 * on the land, and slim in the middle, as Guldbron is.
	 */
	const bridgeDepth = (x: number) => {
		if (!bridge) return 0
		const t = (x - bridge.from) / (bridge.to - bridge.from)
		const fromMiddle = (2 * t - 1) ** 2
		return Math.round(BRIDGE_SLIM + (BRIDGE_DEEP - BRIDGE_SLIM) * fromMiddle)
	}
	/**
	 * How much water shows behind the path, `x` along the bridge: all of it
	 * out in the middle, and less towards its ends, where the far shore
	 * comes in to meet the land.
	 */
	const waterBehind = (x: number) => {
		if (!bridge) return 0
		const fromEnd = Math.min(x - bridge.from, bridge.to - x)
		return Math.round(BRIDGE_BEHIND * Math.min(1, Math.max(0, fromEnd) / SHORE))
	}
	/** Off the bridge, at `x`: before it, or on land again past it. */
	const offBridge = (x: number) => !bridge || x < bridge.from || x >= bridge.to
	const bridgeParts = bridge && {
		behind: columns((x, ground) =>
			offBridge(x)
				? undefined
				: [ground - PATH_BACK - waterBehind(x), ground - PATH_BACK],
		),
		/** The far shore's edge, where it comes in towards the ends. */
		shore: columns((x, ground) =>
			offBridge(x) || waterBehind(x) >= BRIDGE_BEHIND
				? undefined
				: [
						ground - PATH_BACK - waterBehind(x) - 4,
						ground - PATH_BACK - waterBehind(x),
					],
		),
		rail: columns((x, ground) =>
			offBridge(x)
				? undefined
				: [ground - PATH_BACK - 4, ground - PATH_BACK + 2],
		),
		posts: columns((x, ground) =>
			offBridge(x) || Math.floor(x / STEP) % 6
				? undefined
				: [ground - PATH_BACK - 18, ground - PATH_BACK],
		),
		/** The top of its side, catching the light. */
		highlight: columns((x, ground) =>
			offBridge(x) ? undefined : [ground + PATH_FRONT, ground + PATH_FRONT + 4],
		),
		side: columns((x, ground) =>
			offBridge(x)
				? undefined
				: [ground + PATH_FRONT + 4, ground + PATH_FRONT + bridgeDepth(x) - 5],
		),
		/** Its underbelly, in its own shadow. */
		underbelly: columns((x, ground) =>
			offBridge(x)
				? undefined
				: [
						ground + PATH_FRONT + bridgeDepth(x) - 5,
						ground + PATH_FRONT + bridgeDepth(x),
					],
		),
		water: columns((x, ground) =>
			offBridge(x)
				? undefined
				: [ground + PATH_FRONT + bridgeDepth(x), VIEW_HEIGHT],
		),
	}

	// The path, with the line everyone runs along down its middle, and the
	// grass on down to the bottom of the screen in front of it.
	const layers: [number, string][] = props.world.course.look?.ground ?? [
		// The verge: the same green as the field, so it only shows where
		// the course runs higher than the field does.
		[-PATH_BACK - VERGE, 'var(--grass-green)'],
		[-PATH_BACK, 'var(--dirt-dark-brown)'],
		[-PATH_BACK + 5, 'var(--dirt-brown)'],
		[PATH_FRONT, 'var(--grass-dark-green)'],
		[PATH_FRONT + 2, 'var(--grass-green)'],
	]

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: `${width}px`,
				height: `${VIEW_HEIGHT}px`,
				transform: `translateX(${Math.round(DRAWN_FROM - props.world.camera())}px)`,
				'will-change': 'transform',
			}}
		>
			<For each={pitLook === 'none' ? [] : pits}>
				{(pit) => (
					<div
						style={{
							position: 'absolute',
							left: `${pit.left}px`,
							width: `${pit.width}px`,
							top: `${pit.top}px`,
							bottom: 0,
							background: pitLook,
						}}
					/>
				)}
			</For>
			<Show when={terrain.blocks}>
				{(blocks) => <Buildings world={props.world} blocks={blocks()} />}
			</Show>
			<svg
				style={{
					position: 'absolute',
					top: `${-SKY_ROOM}px`,
					left: 0,
					display: terrain.blocks ? 'none' : undefined,
				}}
				width={width}
				height={VIEW_HEIGHT + SKY_ROOM}
				viewBox={`0 ${-SKY_ROOM} ${width} ${VIEW_HEIGHT + SKY_ROOM}`}
				shape-rendering="crispEdges"
				aria-hidden="true"
			>
				<For each={layers}>
					{([offset, fill]) => <path d={outline(offset)} fill={fill} />}
				</For>
				{/* Pyramids' faces, in front of the path, in courses of blocks. */}
				<Show when={props.world.course.look?.pyramids}>
					{(pyramids) => (
						<>
							<defs>
								<pattern
									id="pyramid-blocks"
									patternUnits="userSpaceOnUse"
									width={24}
									height={20}
									y={PATH_FRONT + 2}
								>
									<rect width={24} height={20} fill={pyramids().block} />
									<rect width={24} height={2} fill={pyramids().mortar} />
									<rect y={10} width={24} height={2} fill={pyramids().mortar} />
									<rect width={2} height={10} fill={pyramids().mortar} />
									<rect
										x={12}
										y={10}
										width={2}
										height={10}
										fill={pyramids().mortar}
									/>
								</pattern>
							</defs>
							<For each={pyramids().feet}>
								{([left, right]) => (
									<path
										d={pyramidFace(left, right)}
										fill="url(#pyramid-blocks)"
									/>
								)}
							</For>
						</>
					)}
				</Show>
				{/* A bridge, over the water. */}
				<Show when={bridgeParts && bridge}>
					{(look) => (
						<>
							<defs>
								{/* Ripples on the water, light and dark, deeper down darker. */}
								<pattern
									id="water-ripples"
									patternUnits="userSpaceOnUse"
									width={64}
									height={18}
								>
									<rect width={64} height={18} fill={look().water} />
									<rect
										x={4}
										y={3}
										width={14}
										height={2}
										fill="rgba(255,255,255,0.28)"
									/>
									<rect
										x={34}
										y={9}
										width={10}
										height={2}
										fill="rgba(255,255,255,0.2)"
									/>
									<rect
										x={22}
										y={14}
										width={18}
										height={2}
										fill="rgba(0,20,40,0.25)"
									/>
									<rect
										x={50}
										y={5}
										width={8}
										height={2}
										fill="rgba(0,20,40,0.2)"
									/>
								</pattern>
								<linearGradient id="water-deep" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0" stop-color="rgba(0,20,40,0)" />
									<stop offset="1" stop-color="rgba(0,20,40,0.45)" />
								</linearGradient>
							</defs>
							<path d={bridgeParts?.behind} fill="url(#water-ripples)" />
							<path d={bridgeParts?.shore} fill="var(--grass-darker-green)" />
							<path d={bridgeParts?.posts} fill={look().rail} />
							<path d={bridgeParts?.rail} fill={look().rail} />
							<path d={bridgeParts?.water} fill="url(#water-ripples)" />
							<path d={bridgeParts?.water} fill="url(#water-deep)" />
							<path d={bridgeParts?.side} fill={look().underside} />
							<path d={bridgeParts?.highlight} fill={look().highlight} />
							<path d={bridgeParts?.underbelly} fill={look().underbelly} />
							{/* The quay walls at its ends, facing the water: at Slussen's
							    end, and turned round, at Gamla Stan's. */}
							<Show when={look().quay}>
								{(quay) => (
									<For each={[look().to, look().from]}>
										{(end, i) => {
											const ground = Math.round(terrain.groundY(end) / 2) * 2
											const x = end - DRAWN_FROM
											// Facing left at Slussen, right at the near end.
											const turn =
												i() === 1
													? `translate(${2 * x} 0) scale(-1 1)`
													: undefined
											return (
												<g transform={turn}>
													<image
														href={quay()}
														x={x - QUAY_OVER}
														y={ground + PATH_FRONT}
														width={QUAY_WIDTH}
														height={QUAY_HEIGHT}
														preserveAspectRatio="none"
														style={{ 'image-rendering': 'pixelated' }}
													/>
												</g>
											)
										}}
									</For>
								)}
							</Show>
						</>
					)}
				</Show>
				{/* A Cave, under its hill. */}
				<Show when={caveParts && props.world.course.look?.cave}>
					{(look) => (
						<>
							<defs>
								<pattern
									id="cave-rock"
									patternUnits="userSpaceOnUse"
									width={48}
									height={36}
								>
									<rect width={48} height={36} fill={look().rock} />
									<rect x={2} y={6} width={16} height={2} fill={look().seam} />
									<rect x={16} y={8} width={6} height={2} fill={look().seam} />
									<rect
										x={28}
										y={18}
										width={14}
										height={2}
										fill={look().seam}
									/>
									<rect x={24} y={20} width={4} height={4} fill={look().seam} />
									<rect x={6} y={28} width={10} height={2} fill={look().seam} />
									<rect x={36} y={4} width={4} height={2} fill={look().edge} />
									<rect x={10} y={18} width={2} height={2} fill={look().edge} />
									<rect x={40} y={30} width={2} height={2} fill={look().edge} />
								</pattern>
							</defs>
							<path d={caveParts?.wall} fill={look().wall} />
							<path d={caveParts?.front} fill="url(#cave-rock)" />
							<path d={caveParts?.rock} fill="url(#cave-rock)" />
							<path d={caveParts?.underside} fill={look().edge} />
							<path d={caveParts?.grass} fill={look().grass} />
						</>
					)}
				</Show>
				{/* A wall's merlons, along its parapet behind the path. */}
				<Show when={props.world.course.look?.battlements}>
					{(stone) => (
						<path
							d={backMerlons(terrain, DRAWN_FROM, drawnTo, STEP, BACK_PARAPET)}
							fill={stone().shade}
						/>
					)}
				</Show>
			</svg>
		</div>
	)
}

/**
 * A course over rooftops' buildings, in place of the ground: each one's roof
 * as the path, the parapet along its front edge, and its front, with its
 * windows, on down.
 */
function Buildings(props: { world: View; blocks: Block[] }) {
	const look = props.world.course.look?.buildings ?? {
		roof: '#585b63',
		parapet: '#8a8d96',
		facades: ['#6b4a3a'],
		walls: ['#6b4a3a'],
	}
	/** The roof's depth, back to front: the path's. */
	const depth = PATH_BACK + PATH_FRONT
	return (
		<For each={props.blocks}>
			{(block, i) => {
				const left = block.from - DRAWN_FROM
				const width = block.to - block.from
				/** The roof's far edge. */
				const top = GROUND_Y - block.height - PATH_BACK
				const facade = look.facades[i() % look.facades.length]
				const wall = look.walls[i() % look.walls.length]
				return (
					<>
						{/* Its side, at its right end, going back at the slant
						    everything does: in shade. A building drawn after it,
						    next along, stands in front of it. */}
						<div
							style={{
								position: 'absolute',
								left: `${left + width}px`,
								top: `${top}px`,
								width: `${DEPTH_SLANT}px`,
								bottom: 0,
								// Plain: its own colour, in shade.
								background: wall,
								filter: 'brightness(0.6)',
								'clip-path': `polygon(0 ${depth}px, ${DEPTH_SLANT}px 0, ${DEPTH_SLANT}px 100%, 0 100%)`,
							}}
						/>
						{/* The roof: its far edge as far along again as its side. */}
						<div
							style={{
								position: 'absolute',
								left: `${left}px`,
								top: `${top}px`,
								width: `${width + DEPTH_SLANT}px`,
								height: `${depth}px`,
								background: look.roof,
								'clip-path': `polygon(${DEPTH_SLANT}px 0, 100% 0, ${width}px 100%, 0 100%)`,
							}}
						/>
						{/* Its front, from the parapet along the roof's near edge down. */}
						<div
							style={{
								position: 'absolute',
								left: `${left}px`,
								top: `${top + depth - 6}px`,
								width: `${width}px`,
								bottom: 0,
								background: facade,
								'border-top': `6px solid ${look.parapet}`,
								'box-shadow': 'inset 6px 0 0 rgba(0,0,0,0.25)',
							}}
						/>
					</>
				)
			}}
		</For>
	)
}
