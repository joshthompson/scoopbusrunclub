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
import { svgUrl } from '../courses/kit/pixelArt'
import { seeded } from '../courses/kit/seeded'
import type {
	BackdropPiece,
	CourseLook,
	PitLook,
	SkyFlyer,
} from '../courses/types'
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
import {
	DRAWN_FROM,
	GROUND_STEP,
	columnMiddle,
	columnTop,
	smoothedTop,
} from '../game/groundColumns'
import type { Block } from '../game/terrain'
import { type World, isCaught } from '../game/world'
import { SeaGround } from './Sea'
import { StadiumBackdrop } from './Stadium'
import { backMerlonCaps, backMerlons } from './battlements'

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
/** Over the top of a mountain, as much again as the top of the screen has over a course's highest. */
const MOUNTAIN_ROOM = 240

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

/** How far a voyage's next horizon fades in over, before the camera gets to it. */
const VOYAGE_FADE = 700

/** How tall a horizon's strip of spires is: up from the bottom of its far band. */
const SPIRES_HEIGHT = 300

/** How tall a band of a course's own horizon is drawn. */
const SKYLINE_HEIGHT = 160
/**
 * And its nearer bands, if it has any: the first starting this far below
 * the middle hills' line, each after it this much lower, and going by this
 * much faster.
 */
const NEARER_TOP = 30
const NEARER_STEP = 90
const NEARER_PARALLAX = 0.26
const NEARER_FASTER = 0.14

/** Up a mountain, how much of the camera looking up the horizon rises with, till it's risen as far as it goes. */
const HORIZON_RISE_RATE = 0.4

/** How far a horizon's own sky goes on up over the top of the screen. */
const HORIZON_SKY_OVER = 1200

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

/** How fast a horizon's textured field goes by: slower than the path, faster than the skyline. */
const FIELD_TEXTURE_PARALLAX = 0.5

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
				// Quoted: a picture drawn in code can have brackets in it.
				'background-image': `url("${asset}")`,
				'background-repeat': 'repeat-x',
				'background-position-x': scroll(parallax),
				filter,
			}}
		/>
	)

	/** A horizon's bands, far to near, each its colour on down below it. */
	const horizonBands = (horizon: NonNullable<typeof look.horizon>) => (
		<>
			{/* Its own sky, solid on up over the top of the screen, for the
			    backdrop sinking away under a climb. */}
			<Show when={horizon.sky}>
				{(sky) => (
					<div
						style={{
							...layer,
							top: `${-HORIZON_SKY_OVER}px`,
							bottom: 0,
							background: `linear-gradient(to bottom, ${sky()[0]} ${HORIZON_SKY_OVER}px, ${sky()[1]} ${HORIZON_SKY_OVER + HORIZON}px)`,
						}}
					/>
				)}
			</Show>
			{/* Spires and towers rising out of the far roofs, behind them. */}
			<Show when={horizon.spires}>
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
			{band(horizon.far, HORIZON - 100, SKYLINE_HEIGHT, 0.08, undefined)}
			{/* The far band's own colour on down behind the near one, so no sky shows between. */}
			<div
				style={{
					...layer,
					top: `${HORIZON - 100 + SKYLINE_HEIGHT - 1}px`,
					bottom: 0,
					background: horizon.fill,
				}}
			/>
			{band(horizon.near, HORIZON - 40, SKYLINE_HEIGHT, 0.16, undefined)}
			<div
				style={{
					...layer,
					top: `${HORIZON - 40 + SKYLINE_HEIGHT - 1}px`,
					bottom: 0,
					'background-color': 'var(--grass-green)',
					'background-image': horizon.field && `url("${horizon.field}")`,
					'background-position-x':
						horizon.field && scroll(FIELD_TEXTURE_PARALLAX),
				}}
			/>
			<For each={horizon.nearer ?? []}>
				{(nearer, i) => {
					const top = HORIZON + NEARER_TOP + i() * NEARER_STEP
					return (
						<>
							{band(
								nearer.asset,
								top,
								nearer.height,
								NEARER_PARALLAX + i() * NEARER_FASTER,
								undefined,
							)}
							<div
								style={{
									...layer,
									top: `${top + nearer.height - 1}px`,
									bottom: 0,
									background: nearer.fill,
								}}
							/>
						</>
					)
				}}
			</For>
		</>
	)
	/** How far a voyage's next horizon takes to fade in, as the camera gets to it. */
	const fadeIn = (from: number) =>
		Math.max(0, Math.min(1, (props.world.camera() - from) / VOYAGE_FADE + 1))

	// The whole canvas goes with the camera looking up or down: this goes
	// back the other way, all but a little of it.
	const lift = () => {
		const cameraY = props.world.cameraY?.() ?? 0
		// Up a mountain, it rises as far as it goes, then stays put.
		if (look.horizonRise !== undefined)
			return `translateY(${Math.round(cameraY - Math.min(look.horizonRise, -cameraY * HORIZON_RISE_RATE))}px)`
		return `translateY(${Math.round(cameraY * (1 - (look.horizonLift ?? BACKDROP_LIFT)))}px)`
	}

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				// Risen up a mountain, on down as far again, so it's still
				// there at the bottom of the screen.
				bottom: `${-(look.horizonRise ?? 0)}px`,
				transform: lift(),
			}}
		>
			{/* On up over the top of the screen too, the same colour as its
			    top, so nothing shows a line where it starts. */}
			<div
				style={{
					...layer,
					top: `${-HORIZON_SKY_OVER}px`,
					bottom: 0,
					background: `linear-gradient(to bottom, var(--sky-blue-top) ${HORIZON_SKY_OVER}px, var(--sky-blue-bottom))`,
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
						{/* On a voyage, one after another, each fading in as the
						    last fades out. */}
						<For
							each={[
								{ from: undefined, horizon: horizon() },
								...(look.voyage ?? []),
							]}
						>
							{(leg, i) => {
								const next = look.voyage?.[i()]
								const shown = () =>
									(leg.from === undefined ? 1 : fadeIn(leg.from)) *
									(next ? 1 - fadeIn(next.from) : 1)
								return (
									<div
										style={{
											position: 'absolute',
											inset: 0,
											opacity: shown(),
											visibility: shown() > 0 ? 'visible' : 'hidden',
										}}
									>
										{horizonBands(leg.horizon)}
									</div>
								)
							}}
						</For>
						{/* Over a bridge, the water, from it right back to the
						    buildings' feet across it, on their quay: where the
						    bridge is, going by as the course does. */}
						<Show when={look.bridge}>
							{(bridge) => (
								<BridgeWater
									world={props.world}
									bridge={bridge()}
									top={HORIZON - 40 + SKYLINE_HEIGHT - 1}
								/>
							)}
						</Show>
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

/** How deep the quay is, along the buildings' feet over a bridge's water, and its stones' colours. */
const QUAY_EDGE = 6
const QUAY_STONE = '#8a8278'
const QUAY_LIT = '#b3ab9f'

/**
 * Over a bridge, its water: from the bridge right back to the buildings'
 * feet across it, `top` down the screen, on a quay along them, with stone
 * edges where the land either end meets it. Where the bridge is, going by
 * as the course does: its ends are the ground's. Ripples on it, lined up
 * with the water the Ground draws behind the bridge, so they're one.
 */
function BridgeWater(props: {
	world: View
	bridge: NonNullable<NonNullable<World['course']['look']>['bridge']>
	top: number
}) {
	const { bridge } = props
	/** Out on open water, all along the course; or across under the bridge. */
	const from = bridge.open ? DRAWN_FROM : bridge.from
	const to = bridge.open ? props.world.terrain.finishX + 1600 : bridge.to
	const width = to - from
	const ripples = svgUrl(
		64,
		18,
		[
			`<rect width="64" height="18" fill="${bridge.water}"/>`,
			'<rect x="4" y="3" width="14" height="2" fill="rgba(255,255,255,0.28)"/>',
			'<rect x="34" y="9" width="10" height="2" fill="rgba(255,255,255,0.2)"/>',
			'<rect x="22" y="14" width="18" height="2" fill="rgba(0,20,40,0.25)"/>',
			'<rect x="50" y="5" width="8" height="2" fill="rgba(0,20,40,0.2)"/>',
		].join(''),
	)
	/** Lined up with the Ground's ripples, from its own left edge, along and down. */
	const along = (((DRAWN_FROM - from) % 64) + 64) % 64
	const down = ((-(props.top + QUAY_EDGE) % 18) + 18) % 18
	const left = () => Math.round(from - props.world.camera())
	return (
		<div
			style={{
				position: 'absolute',
				top: `${props.top}px`,
				bottom: 0,
				left: `${left()}px`,
				width: `${width}px`,
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					top: bridge.open ? 0 : `${QUAY_EDGE}px`,
					'background-color': bridge.water,
					'background-image': `url("${ripples}")`,
					'background-position': `${along}px ${down}px`,
				}}
			/>
			{/* The quay along the buildings' feet, lit along its top: none
			    out on open water. */}
			<div
				hidden={bridge.open}
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: 0,
					height: `${QUAY_EDGE}px`,
					background: QUAY_STONE,
					'border-top': `2px solid ${QUAY_LIT}`,
					'box-sizing': 'border-box',
				}}
			/>
			{/* The land's stone edges, either end, down into the water. */}
			<Show when={!bridge.open}>
				<div style={{ ...quayEnd, left: 0 }} />
				<div style={{ ...quayEnd, right: 0 }} />
			</Show>
		</div>
	)
}

const quayEnd: JSX.CSSProperties = {
	position: 'absolute',
	top: 0,
	bottom: 0,
	width: '4px',
	background: QUAY_STONE,
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

const STEP = GROUND_STEP
/** The merlons along a wall's parapet behind the path: its brick, darker; or in shade. */
const backMerlonFills = (stone: NonNullable<CourseLook['battlements']>) =>
	stone.brick ? [stone.brick.fill, stone.brick.dim] : [stone.shade]
/** How much water the Ground draws behind a bridge's path, over its verge: the backdrop has the rest (see `BridgeWater`). */
const BRIDGE_BEHIND = VERGE + 6
/** A bridge's quay walls: how wide, how far over the water they come, and how tall. */
const QUAY_WIDTH = 64
const QUAY_OVER = 4
const QUAY_HEIGHT = 280
/** How deep a bridge is at its ends, and at its slimmest, in the middle. */
const BRIDGE_DEEP = 56
const BRIDGE_SLIM = 16
/** How tall a wall's parapet behind the path is: see `ground` in the Great Wall's look. */
const BACK_PARAPET = 10
/** A rainbow's bands, top to bottom, and how deep each is. */
const RAINBOW = [
	'#ff5f7e',
	'#ffa34d',
	'#ffe14d',
	'#5fd68a',
	'#4fb3ff',
	'#9b7bff',
]
const RAINBOW_BAND = 10

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
	const tops = Array.from({ length: Math.floor(width / STEP) + 1 }, (_, i) =>
		columnTop(terrain, i),
	)
	/** Room over the top of the screen for it: more, up a mountain, to its top. */
	const skyRoom = Math.max(
		SKY_ROOM,
		MOUNTAIN_ROOM -
			Math.min(...tops.map((top) => top ?? Number.POSITIVE_INFINITY)),
	)

	/**
	 * The ground's outline, `offset` px down from it, closed off along the
	 * bottom: a piece either side of each Gap.
	 */
	/**
	 * The tops, smoothed: for layers deep under the path, so its steps and
	 * the corners where its slope changes don't show right down through them.
	 * Not across a Gap.
	 */
	let smoothed: (number | undefined)[] | undefined
	const smoothTops = () => {
		if (smoothed) return smoothed
		smoothed = tops.map((_, i) => smoothedTop(tops, i))
		return smoothed
	}
	const outline = (
		offset: number,
		smooth = false,
		edge?: (x: number) => number,
	) => {
		const along = smooth ? smoothTops() : tops
		/** Its top in column `i`: ragged, if it has an edge. */
		const top = (i: number) =>
			(along[i] ?? 0) +
			offset +
			(edge ? Math.round(edge(columnMiddle(i)) / 2) * 2 : 0)
		let d = ''
		let run: number[] = []
		/** Along its tops, and back along its bottoms. */
		const flush = () => {
			if (!run.length) return
			d += ` M${run[0] * STEP},${top(run[0])}`
			for (const i of run) d += ` V${top(i)} H${(i + 1) * STEP}`
			for (let k = run.length - 1; k >= 0; k--) {
				const i = run[k]
				d += ` V${Math.max(top(i), bottoms[i])} H${i * STEP}`
			}
			d += ' Z'
			run = []
		}
		tops.forEach((top, i) => {
			if (top === undefined) flush()
			else run.push(i)
		})
		flush()
		return d
	}

	/**
	 * Where the ground stops, under the path, every `STEP`: the bottom of the
	 * screen, or under a rainbow, its bands' underside, nothing under it.
	 */
	const rainbow = props.world.course.look?.rainbow
	const overRainbow = (x: number) =>
		!!rainbow && x > rainbow.from && x < rainbow.to
	const ridge = props.world.course.look?.ridge
	const bottoms = tops.map((top, i) => {
		const x = DRAWN_FROM + i * STEP + STEP / 2
		if (top !== undefined && overRainbow(x))
			return top + PATH_FRONT + RAINBOW.length * RAINBOW_BAND
		// Up on a ridge: only as far down as the mountain goes there.
		const under = top !== undefined ? ridge?.(x) : undefined
		return under === undefined || top === undefined
			? VIEW_HEIGHT
			: Math.round(Math.max(top + PATH_FRONT + 2, under) / 2) * 2
	})

	/**
	 * Down each Gap, from the back of the path on its lower side: a drop,
	 * behind the ground either side.
	 */
	const pits = terrain.gaps.map((gap) => {
		const near = terrain.groundY(gap.from - 1) - PATH_BACK
		const far = terrain.groundY(gap.to) - PATH_BACK
		const pitLook = props.world.course.look?.pit
		return {
			left: gap.from - DRAWN_FROM,
			width: gap.to - gap.from,
			// From the lower bank's back edge; or, with walls drawn in it,
			// from the higher one's, its top cut across from one to the other.
			top: pitLook ? Math.min(near, far) : Math.max(near, far),
			near,
			far,
		}
	})
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
		/** Stalactites off its Ceiling, where there's room under it for them. */
		drips: props.world.course.look?.cave?.stalactites
			? columns((x, ground) => {
					const ceiling = cave.ceiling(x)
					if (ceiling === undefined || ground - ceiling < DRIP_ROOM)
						return undefined
					const length = Math.round(stalactite(x) / 2) * 2
					return length >= 2 ? [ceiling - 2, ceiling + length] : undefined
				}, false)
			: '',
		front: columns((x, ground) => {
			const foot = cave.foot(x)
			return foot === undefined || (cave.ceiling(x) === undefined && !cave.hull)
				? undefined
				: [ground + PATH_FRONT + 2, Math.min(VIEW_HEIGHT, foot)]
		}, false),
		/** Under the sand's top, where it's dug down under it: drawn as sand, not rock. */
		sand: columns((x) => {
			const sand = cave.sand?.(x)
			const ceiling = cave.ceiling(x)
			return sand === undefined || ceiling === undefined
				? undefined
				: [sand, ceiling]
		}),
		grass: columns((x) => {
			const surface = cave.surface(x)
			return surface === undefined || surface < -SKY_ROOM
				? undefined
				: [surface, surface + 6]
		}),
		/** In place of the grass, a street's bands, one under another. */
		road: (props.world.course.look?.cave?.road ?? []).map(
			([height, fill], i, all) => {
				const down = all.slice(0, i).reduce((sum, [h]) => sum + h, 0)
				return {
					fill,
					d: columns((x) => {
						const surface = cave.surface(x)
						return surface === undefined || surface < -SKY_ROOM
							? undefined
							: [surface + down, surface + down + height]
					}),
				}
			},
		),
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
	 * How much water shows behind the path along the bridge: right back to
	 * the water behind, in the backdrop (see `BridgeWater`), all the way to
	 * its ends, where the land's quay is.
	 */
	const waterBehind = () => (bridge ? BRIDGE_BEHIND : 0)
	/** Off the bridge, at `x`: before it, or on land again past it. */
	const offBridge = (x: number) => !bridge || x < bridge.from || x >= bridge.to
	const bridgeParts = bridge && {
		behind: columns((x, ground) =>
			offBridge(x) || bridge.open
				? undefined
				: [ground - PATH_BACK - waterBehind(), ground - PATH_BACK],
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
		/** Slussen, past the bridge: its stone, from the path's front edge down. */
		slussen: columns(
			(x, ground) =>
				x >= bridge.to + QUAY_WIDTH - QUAY_OVER ||
				(bridge.stoneBefore && x < bridge.from - QUAY_WIDTH + QUAY_OVER)
					? [ground + PATH_FRONT, VIEW_HEIGHT]
					: undefined,
			// Not down a Gap: a river, past it, is the river.
			false,
		),
	}

	// The path, with the line everyone runs along down its middle, and the
	// grass on down to the bottom of the screen in front of it.
	const layers: NonNullable<CourseLook['ground']> = props.world.course.look
		?.ground ?? [
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
							overflow: 'hidden',
							// Its top straight across from one bank to the other.
							'clip-path': props.world.course.look?.pit
								? `polygon(0 ${pit.near - pit.top}px, 100% ${pit.far - pit.top}px, 100% 100%, 0 100%)`
								: undefined,
						}}
					>
						<Show when={props.world.course.look?.pitFire}>
							<HellFire width={pit.width} seed={pit.left} />
						</Show>
						<Show when={props.world.course.look?.pit}>
							{(look) => (
								<PitInside
									look={look()}
									width={pit.width}
									near={pit.near - pit.top}
									far={pit.far - pit.top}
									seed={pit.left}
								/>
							)}
						</Show>
					</div>
				)}
			</For>
			<Show when={terrain.blocks}>
				{(blocks) => <Buildings world={props.world} blocks={blocks()} />}
			</Show>
			<svg
				style={{
					position: 'absolute',
					top: `${-skyRoom}px`,
					left: 0,
					display: terrain.blocks ? 'none' : undefined,
				}}
				width={width}
				height={VIEW_HEIGHT + skyRoom}
				viewBox={`0 ${-skyRoom} ${width} ${VIEW_HEIGHT + skyRoom}`}
				shape-rendering="crispEdges"
				aria-hidden="true"
			>
				{/* The course's own patterns, for its layers. */}
				<Show when={props.world.course.look?.groundDefs}>
					{(defs) => <defs innerHTML={defs()} />}
				</Show>
				{/* Colours that change along the course, for its layers. */}
				<defs>
					<For each={props.world.course.look?.strips ?? []}>
						{(strip) => (
							<linearGradient
								id={strip.id}
								gradientUnits="userSpaceOnUse"
								x1={0}
								y1={0}
								x2={width}
								y2={0}
							>
								<For each={strip.stops}>
									{([x, colour], i) => {
										const at = (stop: number) =>
											Math.max(0, Math.min(1, (stop - DRAWN_FROM) / width))
										const next = strip.stops[i() + 1]?.[0]
										return (
											<>
												<stop offset={at(x)} stop-color={colour} />
												{/* Held till the next, unless it blends into it. */}
												<Show when={!strip.blend}>
													<stop
														offset={next === undefined ? 1 : at(next)}
														stop-color={colour}
													/>
												</Show>
											</>
										)
									}}
								</For>
							</linearGradient>
						)}
					</For>
				</defs>
				{/* Under a rainbow: the field going on under it, its own ground. */}
				<Show when={rainbow}>
					{(arch) => (
						<>
							<path
								d={columns((x) =>
									overRainbow(x)
										? [arch().base(x) - PATH_BACK - VERGE, VIEW_HEIGHT]
										: undefined,
								)}
								fill={layers[0][1]}
							/>
							<path
								d={columns((x) =>
									overRainbow(x)
										? [arch().base(x) + PATH_FRONT, VIEW_HEIGHT]
										: undefined,
								)}
								fill={layers[layers.length - 1][1]}
							/>
						</>
					)}
				</Show>
				<For each={layers}>
					{([offset, fill, smooth, edge]) => (
						<path d={outline(offset, smooth, edge)} fill={fill} />
					)}
				</For>
				{/* Its Ledges, drawn as rock. */}
				<Show when={props.world.course.look?.ledgeRock}>
					{(look) => (
						<For each={terrain.ledges ?? []}>
							{(x) => (
								<LedgeRock
									look={look()}
									x={x - DRAWN_FROM}
									low={terrain.groundY(x - 1)}
									high={terrain.groundY(x + 1)}
								/>
							)}
						</For>
					)}
				</Show>
				{/* A rainbow's bands, under the path over it. */}
				<For each={rainbow ? RAINBOW : []}>
					{(colour, k) => (
						<path
							d={columns((x, ground) =>
								overRainbow(x)
									? [
											ground + PATH_FRONT + k() * RAINBOW_BAND,
											ground + PATH_FRONT + (k() + 1) * RAINBOW_BAND,
										]
									: undefined,
							)}
							fill={colour}
						/>
					)}
				</For>
				{/* The sea, and its island, over the Ground's own layers. */}
				<SeaGround world={props.world} left={DRAWN_FROM} right={drawnTo} />
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
							<path d={bridgeParts?.posts} fill={look().rail} />
							<path d={bridgeParts?.rail} fill={look().rail} />
							<path d={bridgeParts?.water} fill="url(#water-ripples)" />
							<path d={bridgeParts?.water} fill="url(#water-deep)" />
							<path d={bridgeParts?.side} fill={look().underside} />
							<path d={bridgeParts?.highlight} fill={look().highlight} />
							<path d={bridgeParts?.underbelly} fill={look().underbelly} />
							{/* Slussen's stone, on from its quay wall along all of it, past
							    the bridge, under the path: not just the one wall. */}
							<Show when={look().quay}>
								{(quay) => (
									<>
										<defs>
											<pattern
												id="slussen-stone"
												patternUnits="userSpaceOnUse"
												x={look().to - DRAWN_FROM - QUAY_OVER}
												y={
													Math.round(terrain.groundY(look().to) / 2) * 2 +
													PATH_FRONT
												}
												width={QUAY_WIDTH}
												height={QUAY_HEIGHT}
											>
												<image
													href={quay()}
													width={QUAY_WIDTH}
													height={QUAY_HEIGHT}
													preserveAspectRatio="none"
													style={{ 'image-rendering': 'pixelated' }}
												/>
											</pattern>
										</defs>
										<path d={bridgeParts?.slussen} fill="url(#slussen-stone)" />
									</>
								)}
							</Show>
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
								<Show
									when={look().bricks}
									fallback={
										<pattern
											id="cave-rock"
											patternUnits="userSpaceOnUse"
											width={48}
											height={36}
										>
											<rect width={48} height={36} fill={look().rock} />
											<rect
												x={2}
												y={6}
												width={16}
												height={2}
												fill={look().seam}
											/>
											<rect
												x={16}
												y={8}
												width={6}
												height={2}
												fill={look().seam}
											/>
											<rect
												x={28}
												y={18}
												width={14}
												height={2}
												fill={look().seam}
											/>
											<rect
												x={24}
												y={20}
												width={4}
												height={4}
												fill={look().seam}
											/>
											<rect
												x={6}
												y={28}
												width={10}
												height={2}
												fill={look().seam}
											/>
											<rect
												x={36}
												y={4}
												width={4}
												height={2}
												fill={look().edge}
											/>
											<rect
												x={10}
												y={18}
												width={2}
												height={2}
												fill={look().edge}
											/>
											<rect
												x={40}
												y={30}
												width={2}
												height={2}
												fill={look().edge}
											/>
										</pattern>
									}
								>
									<BrickPattern
										id="cave-rock"
										brick={look().rock}
										mortar={look().seam}
										lit={look().edge}
									/>
									<WallBricks id="cave-wall" wall={look().wall} />
								</Show>
								<SandPattern id="cave-sand" />
								<Show when={look().tiles}>
									{(tiles) => (
										<>
											<TilePattern id="cave-tile-rock" tile={tiles().rock} />
											<TilePattern
												id="cave-tile-front"
												tile={tiles().front ?? tiles().rock}
											/>
											<Show when={tiles().wall}>
												{(wall) => (
													<TilePattern id="cave-tile-wall" tile={wall()} />
												)}
											</Show>
										</>
									)}
								</Show>
							</defs>
							<path
								d={caveParts?.wall}
								fill={
									look().tiles?.wall
										? 'url(#cave-tile-wall)'
										: look().bricks
											? 'url(#cave-wall)'
											: look().wall
								}
							/>
							<path
								d={caveParts?.front}
								fill={
									look().tiles ? 'url(#cave-tile-front)' : 'url(#cave-rock)'
								}
							/>
							<path
								d={caveParts?.rock}
								fill={look().tiles ? 'url(#cave-tile-rock)' : 'url(#cave-rock)'}
							/>
							<path d={caveParts?.underside} fill={look().edge} />
							<path d={caveParts?.drips} fill={look().edge} />
							<Show
								when={look().road}
								fallback={<path d={caveParts?.grass} fill={look().grass} />}
							>
								<For each={caveParts?.road}>
									{(band) => <path d={band.d} fill={band.fill} />}
								</For>
							</Show>
							{/* Its sand, where it's dug down under it, on its rock. */}
							<path d={caveParts?.sand} fill="url(#cave-sand)" />
							{/* Pictures on it: the Sphinx's head, its paws. */}
							<For each={cave?.features ?? []}>
								{(feature) => (
									<image
										href={feature.asset}
										x={feature.x - DRAWN_FROM - feature.width / 2}
										y={featureTop(props.world, feature)}
										width={feature.width}
										height={feature.height}
										style={{ 'image-rendering': 'pixelated' }}
									/>
								)}
							</For>
						</>
					)}
				</Show>
				{/* A wall's merlons, along its parapet behind the path. */}
				<Show when={props.world.course.look?.battlements}>
					{(stone) => (
						<>
							<For each={backMerlonFills(stone())}>
								{(fill) => (
									<path
										d={backMerlons(
											terrain,
											DRAWN_FROM,
											drawnTo,
											STEP,
											BACK_PARAPET,
										)}
										fill={fill}
									/>
								)}
							</For>
							<Show when={stone().cap}>
								{(cap) => (
									<path
										d={backMerlonCaps(
											terrain,
											DRAWN_FROM,
											drawnTo,
											STEP,
											BACK_PARAPET,
											2,
										)}
										fill={cap()}
									/>
								)}
							</Show>
						</>
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

/** How much room there has to be under a Cave's Ceiling for stalactites. */
const DRIP_ROOM = 70
/** How far apart they hang, at most. */
const DRIP_EVERY = 36

/**
 * How far a stalactite hangs down off a Cave's Ceiling at `x`, if there's
 * one there: one now and then, each its own length and width, tapering to
 * its tip. The same every time for the same `x`.
 */
function stalactite(x: number) {
	const k = Math.floor(x / DRIP_EVERY)
	const hash = (n: number) => {
		const h = Math.sin(n * 127.1 + k * 311.7) * 43758.5453
		return h - Math.floor(h)
	}
	if (hash(3) < 0.4) return 0
	const middle = k * DRIP_EVERY + 8 + hash(1) * (DRIP_EVERY - 16)
	const half = 4 + hash(2) * 6
	const across = 1 - Math.abs(x - middle) / half
	return across > 0 ? (6 + hash(4) * 14) * across : 0
}

/** How much of a Cave's way in, and its way out, the cover leaves showing. */
const MOUTH_SHOWN = 56
/** How long the cover takes to go, or come back. */
const COVER_FADE = '350ms'

/**
 * A Cave's rock over the inside of it, in front of everything in there:
 * till someone racing goes in, it's solid ground, its way in and its way
 * out showing; with them inside, it's gone, the cave opened up.
 */
export function CaveCover(props: {
	world: View & Pick<World, 'racers' | 'ticks'>
}) {
	const { cave } = props.world.course
	const look = props.world.course.look?.cave
	if (!cave || !look) return null
	const { terrain } = props.world
	const drawnTo = terrain.finishX + 1600
	const width = drawnTo - DRAWN_FROM
	// Its rock, and under the sand's top, where it's dug down under it, sand.
	let rock = ''
	let sand = ''
	/** With tiles, its front under the path, as the hull's, apart from its side over it. */
	let front = ''
	const column = (x: number, top: number, bottom: number) =>
		bottom > top
			? ` M${x - DRAWN_FROM},${Math.round(top / 2) * 2} H${x - DRAWN_FROM + STEP} V${Math.round(bottom / 2) * 2} H${x - DRAWN_FROM} Z`
			: ''
	const mouth = cave.mouth ?? MOUTH_SHOWN
	for (let x = cave.from + mouth; x < cave.to - MOUTH_SHOWN; x += STEP) {
		const middle = x + STEP / 2
		const ceiling = cave.ceiling(middle)
		const foot = cave.foot(middle)
		if (ceiling === undefined || foot === undefined) continue
		const top = ceiling - 4
		const under = cave.sand?.(middle)
		if (look.tiles) {
			const path = Math.round(terrain.groundY(middle) / 2) * 2 + PATH_FRONT + 2
			rock += column(x, top, Math.min(foot, path))
			front += column(x, path, foot)
		} else if (under === undefined) rock += column(x, top, foot)
		else {
			rock += column(x, top, Math.min(foot, under))
			sand += column(x, Math.max(top, under), foot)
		}
	}
	/** Whether someone racing's in it, under its hill. */
	const anyoneInside = () =>
		props.world.racers.some(({ body, out }) => {
			if (out || body.x < cave.from || body.x > cave.to) return false
			// Aboard a ship, anywhere: up on its roof too.
			if (cave.hull) return true
			const surface = cave.surface(body.x)
			return surface === undefined || body.feetY > surface
		})
	/**
	 * Whether it's opened up: someone racing's in it, or was, till they were
	 * Scooped or Fallen in there. Then it stays open, to see where.
	 */
	let opened = false
	const inside = () => {
		if (props.world.ticks() < 0) return false
		const caught = props.world.racers.some(({ out }) => isCaught(out))
		opened = anyoneInside() || (opened && caught)
		return opened
	}
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
				'pointer-events': 'none',
				opacity: inside() ? 0 : 1,
				transition: `opacity ${COVER_FADE}`,
			}}
		>
			<svg
				style={{ position: 'absolute', top: `${-SKY_ROOM}px`, left: 0 }}
				width={width}
				height={VIEW_HEIGHT + SKY_ROOM}
				viewBox={`0 ${-SKY_ROOM} ${width} ${VIEW_HEIGHT + SKY_ROOM}`}
				shape-rendering="crispEdges"
				aria-hidden="true"
			>
				<defs>
					<SandPattern id="cave-cover-sand" />
					<Show when={look.tiles}>
						{(tiles) => (
							<>
								<TilePattern
									id="cave-cover-tile"
									tile={tiles().rock}
									x={DRAWN_FROM}
								/>
								<TilePattern
									id="cave-cover-front"
									tile={tiles().front ?? tiles().rock}
									x={DRAWN_FROM}
								/>
							</>
						)}
					</Show>
					<Show when={look.bricks}>
						<BrickPattern
							id="cave-cover-bricks"
							brick={look.rock}
							mortar={look.seam}
							lit={look.edge}
						/>
					</Show>
					<pattern
						id="cave-cover-rock"
						patternUnits="userSpaceOnUse"
						width={48}
						height={36}
					>
						<rect width={48} height={36} fill={look.rock} />
						<rect x={2} y={6} width={16} height={2} fill={look.seam} />
						<rect x={16} y={8} width={6} height={2} fill={look.seam} />
						<rect x={28} y={18} width={14} height={2} fill={look.seam} />
						<rect x={24} y={20} width={4} height={4} fill={look.seam} />
						<rect x={6} y={28} width={10} height={2} fill={look.seam} />
						<rect x={36} y={4} width={4} height={2} fill={look.edge} />
						<rect x={10} y={18} width={2} height={2} fill={look.edge} />
						<rect x={40} y={30} width={2} height={2} fill={look.edge} />
					</pattern>
				</defs>
				<path
					d={rock}
					fill={
						look.tiles
							? 'url(#cave-cover-tile)'
							: look.bricks
								? 'url(#cave-cover-bricks)'
								: 'url(#cave-cover-rock)'
					}
				/>
				<path d={front} fill="url(#cave-cover-front)" />
				<path d={sand} fill="url(#cave-cover-sand)" />
			</svg>
		</div>
	)
}

/**
 * A picture, tiled, lined up with the world: `x` is the world's own x at
 * the drawing's left edge, so it's lined up the same in every drawing of it.
 */
function TilePattern(props: {
	id: string
	tile: { asset: string; width: number; height: number }
	x?: number
}) {
	return (
		<pattern
			id={props.id}
			patternUnits="userSpaceOnUse"
			width={props.tile.width}
			height={props.tile.height}
			x={
				(((DRAWN_FROM - (props.x ?? DRAWN_FROM)) % props.tile.width) +
					props.tile.width) %
				props.tile.width
			}
		>
			<image
				href={props.tile.asset}
				width={props.tile.width}
				height={props.tile.height}
				preserveAspectRatio="none"
				style={{ 'image-rendering': 'pixelated' }}
			/>
		</pattern>
	)
}

/**
 * Bricks, laid in courses, each course half a brick along from the last:
 * `mortar` between, and a lit top edge to each.
 */
function BrickPattern(props: {
	id: string
	brick: string
	mortar: string
	lit: string
	/** Where its courses start, to line up with bricks drawn elsewhere. */
	x?: number
	y?: number
}) {
	return (
		<pattern
			id={props.id}
			patternUnits="userSpaceOnUse"
			width={32}
			height={20}
			x={props.x ?? 0}
			y={props.y ?? 0}
		>
			{/* Under the mortar, the brick's own colour: a see-through mortar darkens it. */}
			<rect width={32} height={20} fill={props.brick} />
			<rect width={32} height={20} fill={props.mortar} />
			<rect x={0} y={0} width={14} height={8} fill={props.brick} />
			<rect x={16} y={0} width={14} height={8} fill={props.brick} />
			<rect x={-8} y={10} width={14} height={8} fill={props.brick} />
			<rect x={8} y={10} width={14} height={8} fill={props.brick} />
			<rect x={24} y={10} width={14} height={8} fill={props.brick} />
			<rect x={0} y={0} width={14} height={2} fill={props.lit} />
			<rect x={16} y={0} width={14} height={2} fill={props.lit} />
			<rect x={8} y={10} width={14} height={2} fill={props.lit} />
			<rect x={24} y={10} width={8} height={2} fill={props.lit} />
			<rect x={0} y={10} width={6} height={2} fill={props.lit} />
		</pattern>
	)
}

/**
 * A brick Cave's back wall: its bricks in `wall`, in shadow. Drawn
 * elsewhere than the Ground, `x` and `y` line its courses up with the
 * Ground's: the world's own `x` and `y` at the drawing's top left.
 */
export function WallBricks(props: {
	id: string
	wall: string
	x?: number
	y?: number
}) {
	return (
		<BrickPattern
			id={props.id}
			brick={props.wall}
			mortar="rgba(0,0,0,0.4)"
			lit="rgba(255,255,255,0.06)"
			x={DRAWN_FROM - (props.x ?? DRAWN_FROM)}
			y={-(props.y ?? 0)}
		/>
	)
}

/** A flame, in cells: its red outside, orange in it, and its yellow heart. */
const FLAME: [number, number, number, number, string][] = [
	[2, 0, 2, 2, '#e8361c'],
	[1, 2, 4, 3, '#e8361c'],
	[0, 5, 6, 5, '#e8361c'],
	[2, 3, 2, 2, '#ff8a1c'],
	[1, 5, 4, 5, '#ff8a1c'],
	[2, 7, 2, 3, '#ffe066'],
]

/** How far a Ledge's rock goes on under the path over it, tapering away into the ground. */
const LEDGE_WEDGE = 64

/**
 * A Ledge, as rock: an outcrop, its face where the ground steps up at `x`,
 * from the path at its foot, `low`, up to its top, `high`, jagged; and on
 * under the path over it, a wedge of it tapering away into the ground. In
 * chunky blocks, its strata broken, lit along its face, snow lying on top
 * and drifted at its foot. A fixed rope down it, from a piton on top; or a
 * big one, a ladder up it. In the Ground's own pixels.
 */
function LedgeRock(props: {
	look: NonNullable<NonNullable<World['course']['look']>['ledgeRock']>
	x: number
	low: number
	high: number
}) {
	const { look, x, low, high } = props
	const random = seeded(Math.round(x))
	const snap = (n: number) => Math.round(n / 2) * 2
	const top = snap(high - PATH_BACK - 2)
	const foot = snap(low + PATH_FRONT + 8)
	const under = snap(high + PATH_FRONT)
	/** Each strata line's own wobble, and where it's broken. */
	const strata = Array.from({ length: 64 }, () => ({
		wobble: snap(random() * 4),
		gap: random() < 0.3,
	}))
	const rects: [number, number, number, number, string][] = []
	/** A column of rock, 2 px wide, from `from` down to `to`, in runs of one colour. */
	const column = (cx: number, from: number, to: number, face: boolean) => {
		let run = from
		let colour: string | undefined
		const flush = (y: number) => {
			if (colour && y > run) rects.push([cx, run, 2, y - run, colour])
			run = y
		}
		for (let y = from; y < to; y += 2) {
			const line = Math.floor((y - top + strata[(cx >> 3) & 63].wobble) / 10)
			const onLine = (y - top + strata[(cx >> 3) & 63].wobble) % 10 < 2
			let here = look.rock
			if (face && y - from < 2) here = look.lit
			else if (onLine && !strata[(line + (cx >> 4)) & 63].gap) here = look.shade
			else {
				const roll = random()
				if (roll < 0.07) here = look.shade
				else if (roll < 0.13) here = look.lit
			}
			if (here !== colour) {
				flush(y)
				colour = here
			}
		}
		flush(to)
	}
	// Its face, jagged, where the ground steps up.
	for (let cx = snap(x - 10); cx < x + 4; cx += 2) {
		const jag = snap(random() * 6)
		column(cx, top + (cx < x - 6 ? jag : 0), foot, cx < x - 6)
		if (cx === snap(x - 10))
			rects.push([cx, top + jag, 2, foot - top - jag, look.lit])
	}
	// On under the path over it, tapering away.
	for (let cx = snap(x + 4); cx < x + LEDGE_WEDGE; cx += 2) {
		const t = (cx - x) / LEDGE_WEDGE
		const bottom = snap(foot + (under + 6 - foot) * t + random() * 10 - 4)
		if (bottom > under) column(cx, under, bottom, false)
	}
	// Snow on top of it, in lumps, and drifted at its foot.
	for (let cx = snap(x - 12); cx < x + 4; cx += 2) {
		const lump = snap(random() * 4)
		rects.push([cx, top - 4 - lump, 2, 6 + lump, look.snow])
	}
	for (let cx = snap(x - 20); cx < x - 10; cx += 2) {
		const drift = snap((cx - (x - 22)) / 2)
		rects.push([cx, snap(low - PATH_BACK + 4 - drift), 2, drift + 2, look.snow])
	}
	const tall = low - high > 48
	return (
		<g>
			<For each={rects}>
				{([rx, ry, w, h, fill]) => (
					<rect x={rx} y={ry} width={w} height={h} fill={fill} />
				)}
			</For>
			<Show
				when={tall}
				fallback={
					// A fixed rope, from a piton on top, down its face and off
					// along the path, sagging.
					<>
						<rect
							x={x + 2}
							y={top - 8}
							width={4}
							height={6}
							fill={look.shade}
						/>
						<polyline
							points={`${x + 4},${top - 4} ${x - 6},${top + 10} ${x - 10},${snap(low - 6)} ${x - 46},${snap(low - 2)}`}
							fill="none"
							stroke={look.rope}
							stroke-width={2}
						/>
					</>
				}
			>
				{/* A ladder up it, its feet on the path, leaning on its top. */}
				<polyline
					points={`${x - 26},${snap(low)} ${x - 4},${top - 6}`}
					fill="none"
					stroke={look.ladder}
					stroke-width={3}
				/>
				<polyline
					points={`${x - 16},${snap(low)} ${x + 6},${top - 6}`}
					fill="none"
					stroke={look.ladder}
					stroke-width={3}
				/>
				<For each={[0.15, 0.3, 0.45, 0.6, 0.75, 0.9]}>
					{(t) => {
						const y = snap(low + (top - 6 - low) * t)
						const left = x - 26 + 22 * t
						return (
							<rect x={left} y={y} width={10} height={2} fill={look.ladder} />
						)
					}}
				</For>
			</Show>
		</g>
	)
}

/** How far down a pit its walls are drawn, from its rims: under that, it's all dark. */
const PIT_WALLS = 240
/** How far down from its rims a pit's gone dark. */
const PIT_DARK = 150

/**
 * Inside a Gap: its walls going down either side, ragged, the far one lit
 * and the near one in shadow, seams across them, darker and darker the
 * deeper, so it's plain it's somewhere to fall. Snow over a crevasse's lips
 * and icicles off them; slime running down a sewer's, and its sludge
 * glinting far below. `near` and `far` are its rims, the tops of its banks'
 * back edges, down from its top.
 */
function PitInside(props: {
	look: PitLook
	width: number
	near: number
	far: number
	seed: number
}) {
	const { look, width, near, far } = props
	const random = seeded(Math.round(props.seed) + 17)
	const snap = (n: number) => Math.round(n / 2) * 2
	const rim = Math.min(near, far)
	const bottom = Math.max(near, far) + PIT_WALLS
	const rects: [number, number, number, number, string][] = []
	// Seams across the back of it: bricks' mortar, or cracks in the ice.
	const seams = look.seams
	if (seams) {
		if (look.slime)
			for (let y = snap(rim + 6); y < bottom; y += 8) {
				rects.push([0, y, width, 2, seams])
				for (let x = (y / 8) % 2 ? 0 : 8; x < width; x += 16)
					rects.push([x, y + 2, 2, 6, seams])
			}
		else
			for (let i = 0; i < Math.max(2, width / 30); i++) {
				let x = snap(10 + random() * (width - 20))
				for (let y = snap(rim + 14 + random() * 30); y < bottom; y += 4) {
					rects.push([x, y, 2, 4, seams])
					x += random() < 0.5 ? -2 : 2
				}
			}
	}
	/** A wall, down from `top`, out from its side: ragged, every few px a different depth. */
	const wall = (side: 'near' | 'far', top: number, fill: string) => {
		for (let y = snap(top); y < bottom; y += 6) {
			const out = snap(6 + random() * 10 + Math.max(0, (y - top) / 40))
			rects.push(
				side === 'near' ? [0, y, out, 6, fill] : [width - out, y, out, 6, fill],
			)
			// Its edge, in deeper shadow, or catching the light.
			rects.push(
				side === 'near'
					? [out, y, 2, 6, 'rgba(0,0,0,0.25)']
					: [width - out - 2, y, 2, 6, 'rgba(255,255,255,0.18)'],
			)
		}
	}
	wall('near', near, look.shade)
	wall('far', far, look.wall)
	const { slime, ice } = look
	if (slime) {
		// Slime, running down the walls from the rims.
		for (const side of ['near', 'far'] as const) {
			const top = side === 'near' ? near : far
			for (let i = 0; i < 2; i++) {
				const x =
					side === 'near'
						? snap(2 + random() * 8)
						: width - snap(6 + random() * 8)
				const length = snap(14 + random() * 40)
				rects.push([x, top, 2, length, slime.drip])
				rects.push([x - 1, top + length, 4, 4, slime.drip])
			}
		}
		// The sludge, far down, glinting.
		const surface = snap(Math.max(near, far) + 56)
		rects.push([0, surface, width, bottom - surface, slime.sludge])
		for (
			let x = snap(random() * 12);
			x < width - 8;
			x += 18 + snap(random() * 14)
		)
			rects.push([x, surface + 2 + snap(random() * 4), 8, 2, slime.shine])
	}
	if (ice) {
		// Snow over each lip, overhanging it, and icicles hanging off it.
		for (const side of ['near', 'far'] as const) {
			const top = side === 'near' ? near : far
			const over = snap(10 + random() * 6)
			const at = (x: number, w: number) => (side === 'near' ? x : width - x - w)
			rects.push([at(0, over), top - 2, over, 8, ice.snow])
			rects.push([at(0, over - 4), top + 6, over - 4, 4, ice.snow])
			for (let i = 0; i < 3; i++) {
				const x = snap(2 + random() * (over - 4))
				const length = snap(6 + random() * 14)
				for (let k = 0; k < length; k += 2) {
					const w = k < length / 2 ? 4 : 2
					rects.push([at(x, w), top + 10 + k, w, 2, ice.icicle])
				}
			}
		}
	}
	return (
		<>
			<svg
				width={width}
				height={bottom}
				shape-rendering="crispEdges"
				aria-hidden="true"
				style={{ position: 'absolute', left: 0, top: 0 }}
			>
				<For each={rects}>
					{([x, y, w, h, fill]) => (
						<rect x={x} y={y} width={w} height={h} fill={fill} />
					)}
				</For>
			</svg>
			{/* Darker and darker, the deeper. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: `linear-gradient(to bottom, transparent ${rim + 20}px, rgba(4, 6, 12, 0.6) ${rim + PIT_DARK / 2}px, rgba(4, 6, 12, 0.94) ${rim + PIT_DARK}px)`,
				}}
			/>
		</>
	)
}

/**
 * Fire down a pit into hell: flames along its bottom, each its own size and
 * flickering on its own beat, and embers rising out of it. Where each goes
 * comes from `seed`, so a pit's the same every time it's drawn.
 */
function HellFire(props: { width: number; seed: number }) {
	const random = seeded(Math.round(props.seed) + 666)
	const count = Math.max(3, Math.round(props.width / 14))
	const flames = Array.from({ length: count }, (_, i) => ({
		left: (i / count) * props.width - 4 + random() * 8,
		scale: 2 + Math.round(random() * 2),
		delay: random() * 0.6,
	}))
	const embers = Array.from(
		{ length: Math.round(props.width / 30) + 2 },
		() => ({
			left: random() * props.width,
			delay: random() * 2.4,
			seconds: 1.6 + random() * 1.2,
		}),
	)
	return (
		<>
			<For each={flames}>
				{(flame) => (
					<svg
						width={6 * flame.scale}
						height={10 * flame.scale}
						viewBox="0 0 6 10"
						shape-rendering="crispEdges"
						aria-hidden="true"
						style={{
							position: 'absolute',
							left: `${flame.left}px`,
							bottom: '-2px',
							'transform-origin': '50% 100%',
							animation: `hell-flame 0.45s steps(3) ${flame.delay}s infinite alternate`,
						}}
					>
						<For each={FLAME}>
							{([x, y, w, h, fill]) => (
								<rect x={x} y={y} width={w} height={h} fill={fill} />
							)}
						</For>
					</svg>
				)}
			</For>
			<For each={embers}>
				{(ember) => (
					<div
						style={{
							position: 'absolute',
							left: `${ember.left}px`,
							bottom: '20px',
							width: '3px',
							height: '3px',
							background: '#ffb03a',
							animation: `hell-ember ${ember.seconds}s steps(12) ${ember.delay}s infinite`,
						}}
					/>
				)}
			</For>
		</>
	)
}

/** Sand, in layers: the ground's own colours, for a Cave dug under it. */
function SandPattern(props: { id: string }) {
	return (
		<pattern id={props.id} patternUnits="userSpaceOnUse" width={64} height={40}>
			<rect width={64} height={40} style={{ fill: 'var(--grass-green)' }} />
			<rect
				y={12}
				width={40}
				height={2}
				style={{ fill: 'var(--grass-dark-green)' }}
			/>
			<rect
				x={44}
				y={14}
				width={20}
				height={2}
				style={{ fill: 'var(--grass-dark-green)' }}
			/>
			<rect
				x={8}
				y={30}
				width={30}
				height={2}
				style={{ fill: 'var(--grass-dark-green)' }}
			/>
			<rect
				x={50}
				y={4}
				width={4}
				height={2}
				style={{ fill: 'var(--dirt-brown)' }}
			/>
			<rect
				x={22}
				y={22}
				width={2}
				height={2}
				style={{ fill: 'var(--dirt-brown)' }}
			/>
		</pattern>
	)
}

/** Where a Cave's picture's top is: on the hill, or either side of the path. */
function featureTop(
	world: View,
	feature: NonNullable<
		NonNullable<World['course']['cave']>['features']
	>[number],
) {
	const sink = feature.sink ?? 0
	const ground = world.terrain.groundY(feature.x)
	if (feature.on === 'behind') return ground - PATH_BACK - feature.height + sink
	if (feature.on === 'in front') return ground + PATH_FRONT - sink
	// Over the path, down to its near edge.
	if (feature.on === 'path') return ground + PATH_FRONT - feature.height + sink
	return (
		(world.course.cave?.surface(feature.x) ?? ground) - feature.height + sink
	)
}
