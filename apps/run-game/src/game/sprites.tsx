import busBackAsset from '@/assets/bus/bus-back.png'
import scoopAsset from '@/assets/bus/scoop.png'
import shadowAsset from '@/assets/bus/shadow.png'
import wheel1Asset from '@/assets/bus/wheel1.png'
import wheel2Asset from '@/assets/bus/wheel2.png'
import wheel3Asset from '@/assets/bus/wheel3.png'
import wheel4Asset from '@/assets/bus/wheel4.png'
import windowAsset from '@/assets/bus/windows.png'
import purpleSignAsset from '@/assets/misc/purple-sign.png'
import rockAsset from '@/assets/misc/rock1.png'
import { type RunnerName, runners } from '@/data/runners'
import {
	createConnectedController,
	createController,
	createObjectSignal,
} from '@/engine'
import { imageSize } from '@/utils/imageSize'
import { For, type JSX, Show, createSignal } from 'solid-js'
// The website's bus, with its lettering reversed so it reads right turned
// round (see scripts/turn-bus-lettering.ts).
import busAsset from '../assets/bus/bus-lettering-turned.png'
import type { Obstacle } from '../levels/types'
import { Bubble } from './Bubble'
import { Pixels } from './Pixels'
import {
	CORGI_SADDLE,
	PATH_BACK,
	PATH_FRONT,
	RUNNER_SCALE,
	START_X,
} from './constants'
import { CORGI_HEIGHT, CORGI_WIDTH, CorgiArt, type CorgiPose } from './corgiArt'
import { FIKA_ART } from './fika'
import { FURBY_HEIGHT, FURBY_WIDTH, furbySquash } from './furbies'
import { KIDS_HEIGHT, KidsArt, kidsWidth } from './kidsArt'
import { countdownWord, scoopFlight, stepWorld } from './step'
import {
	HURDLE_LANES,
	HurdleArt,
	POTHOLE_ABOVE,
	POTHOLE_HEIGHT,
	PotholeArt,
	hurdleSize,
} from './trackArt'
import type { Corgi, Furby, ObstacleState, Pacer, World } from './world'

/**
 * Everything in the game is drawn by one of these: engine controllers, the
 * same as the header's runners and bus. None of them work anything out; they
 * draw what `stepWorld` decided, which the first of them runs every tick.
 */

/** Runs the world. Added first, so everything drawn after it this tick is up to date. */
export function createGameController(world: World) {
	return createController({
		init: () => ({
			id: 'game',
			type: 'game',
			x: () => 0,
			y: () => 0,
			width: () => 0,
			height: () => 0,
		}),
		onEnterFrame: () => stepWorld(world),
	})
}

/** The size a single-image pose is drawn at: its own size, at runner scale. */
function poseSize(
	frame: string | undefined,
	fallback: { width: number; height: number },
) {
	const size = frame ? imageSize(frame) : undefined
	return {
		width: (size?.width ?? fallback.width) * RUNNER_SCALE,
		height: (size?.height ?? fallback.height) * RUNNER_SCALE,
	}
}

/** A member's volunteer pose, for cheering and run directing. They all face right. */
export function volunteerFrame(member: RunnerName) {
	const { frames } = runners[member][0]()
	return (
		frames.runDirector?.[0] ??
		frames.marshal?.[0] ??
		frames.photographer?.[0] ??
		frames.scanner?.[0] ??
		frames.volunteerGeneric?.[0]
	)
}

export function createPlayer(world: World) {
	const { sprite } = world.runner
	const run = sprite.run
	const sit = sprite.sit
	const runSize = {
		width: sprite.width * RUNNER_SCALE,
		height: sprite.height * RUNNER_SCALE,
	}

	return createController({
		frames: [...run, ...(sit ? [sit] : [])],
		init() {
			const { body } = world
			// Sat down, ducking or riding a corgi. `body` isn't a signal: reading
			// the tick keeps this up to date.
			const ducking = () =>
				world.ticks() >= 0 && (body.ducking || body.mount > 0) && !!sit
			const size = () => (ducking() ? poseSize(sit, sprite) : runSize)
			return {
				id: 'player',
				type: 'player',
				...createObjectSignal(0, 'x'),
				...createObjectSignal(0, 'y'),
				width: () => size().width,
				height: () => size().height,
				frames: () => (ducking() && sit ? [sit] : run),
				...createObjectSignal(undefined as number | undefined, 'frame'),
				// Run sprites face left, the way the header's runners run.
				...createObjectSignal(-1, 'xScale'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal(100, 'frameInterval'),
				...createObjectSignal('pause' as 'play' | 'pause', 'state'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
			}
		},
		onEnterFrame({ $ }) {
			const { body } = world
			const width = $.width()
			$.setX(body.x - width / 2)
			// Up on a corgi's back, riding one.
			$.setY(body.feetY - $.height() - (body.mount > 0 ? CORGI_SADDLE : 0))

			if (world.phase() === 'scooped') {
				$.setRotation(body.spin * 14)
				$.setState('pause')
				return
			}
			$.setXScale(body.facing === 1 ? -1 : 1)
			$.setRotation(
				body.grounded
					? (Math.atan(world.terrain.slope(body.x)) * 180) / Math.PI
					: 0,
			)
			// Sat down, the one sit frame: switching to it from a run frame
			// would otherwise leave the engine on a frame it doesn't have. In
			// the air, legs out in one stride.
			const sitting = (body.ducking || body.mount > 0) && !!sit
			$.setFrame(sitting ? 0 : body.grounded ? undefined : 1)
			const speed = Math.abs(body.vx)
			$.setState(body.grounded && speed > 0.3 ? 'play' : 'pause')
			$.setFrameInterval(Math.max(45, 190 - speed * 22))
			$.setStyle({
				opacity: body.stumble > 0 && body.stumble % 8 < 4 ? '0.4' : '1',
			})
		},
	})
}

/**
 * Someone in the pack, drawn the way the runner is, and kept on the scene for
 * as long as they're in the pack (see `createPack`).
 */
function createPacer(world: World, p: Pacer) {
	const { sprite } = p
	const width = sprite.width * RUNNER_SCALE
	const height = sprite.height * RUNNER_SCALE
	return createController({
		frames: sprite.run,
		randomStartFrame: true,
		init: () => ({
			id: `pacer-${p.id}`,
			type: 'pacer',
			...createObjectSignal(p.x - width / 2, 'x'),
			...createObjectSignal(p.feetY - height, 'y'),
			width: () => width,
			height: () => height,
			...createObjectSignal(undefined as number | undefined, 'frame'),
			// Facing right, the way they're running.
			xScale: () => -1,
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal(150, 'frameInterval'),
			...createObjectSignal('pause' as 'play' | 'pause', 'state'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
		}),
		onEnterFrame({ $ }) {
			$.setX(p.x - width / 2)
			$.setY(p.feetY - height)
			if (p.scooped) {
				$.setRotation(p.spin * 14)
				$.setState('pause')
				return
			}
			$.setRotation(
				p.grounded ? (Math.atan(world.terrain.slope(p.x)) * 180) / Math.PI : 0,
			)
			$.setFrame(p.grounded ? undefined : 1)
			const speed = Math.abs(p.vx)
			$.setState(p.grounded && speed > 0.3 ? 'play' : 'pause')
			$.setFrameInterval(Math.max(45, 190 - speed * 22))
			// Flashing while they're dazed, and can't be bounced on again.
			$.setStyle({ opacity: p.dazed > 0 && p.dazed % 8 < 4 ? '0.4' : '1' })
		},
	})
}

/**
 * The pack, on the scene: whoever's on the start line to begin with, and
 * then everyone joining and leaving it, added and taken away as they do.
 */
export function createPack(world: World) {
	const shown = new Set(world.pack.map((p) => p.id))
	const keeper = createController({
		init: () => ({
			id: 'pack',
			type: 'game',
			x: () => 0,
			y: () => 0,
			width: () => 0,
			height: () => 0,
		}),
		onEnterFrame({ $scene }) {
			for (const p of world.pack) {
				if (shown.has(p.id)) continue
				shown.add(p.id)
				$scene.addController(createPacer(world, p))
			}
			for (const id of shown) {
				if (world.pack.some((p) => p.id === id)) continue
				shown.delete(id)
				$scene.removeController(`pacer-${id}`)
			}
		},
	})
	return [keeper, ...world.pack.map((p) => createPacer(world, p))]
}

/** The level's corgis, if it has any. */
export function createCorgis(world: World) {
	return world.corgis.map((c) => createCorgi(world, c))
}

function createCorgi(world: World, c: Corgi) {
	const [pose, setPose] = createSignal<CorgiPose>('sit')
	const [facing, setFacing] = createSignal<1 | -1>(c.facing)
	const [barking, setBarking] = createSignal(false)
	return createController({
		init: () => ({
			id: `corgi-${c.id}`,
			type: 'corgi',
			...createObjectSignal(c.x - CORGI_WIDTH / 2, 'x'),
			...createObjectSignal(c.feetY - CORGI_HEIGHT, 'y'),
			width: () => CORGI_WIDTH,
			height: () => CORGI_HEIGHT,
			// The art faces right.
			xScale: facing,
			...createObjectSignal(0, 'rotation'),
			children: () => (
				<>
					<CorgiArt pose={pose()} />
					<Show when={barking()}>
						<Bubble size={16} mirrored={facing() === -1}>
							Woof!
						</Bubble>
					</Show>
				</>
			),
		}),
		onEnterFrame({ $ }) {
			$.setX(c.x - CORGI_WIDTH / 2)
			$.setY(c.feetY - CORGI_HEIGHT)
			setFacing(c.facing)
			// Barking on and off, rather than one long bark.
			setBarking(c.barking && world.ticks() % 50 < 30)
			setPose(
				c.state === 'scooped'
					? 'leap'
					: c.state === 'ridden'
						? // Galloping.
							Math.floor(world.ticks() / 6) % 2
							? 'leap'
							: 'crouch'
						: 'sit',
			)
			$.setRotation(
				c.state === 'scooped'
					? c.spin * 14
					: (Math.atan(world.terrain.slope(c.x)) * 180) / Math.PI,
			)
		},
	})
}

/** The level's furbies, if it has any. */
export function createFurbies(world: World) {
	return world.furbies.map((f) => createFurby(world, f))
}

function createFurby(world: World, f: Furby) {
	const [squash, setSquash] = createSignal(0)
	const [facing, setFacing] = createSignal<1 | -1>(f.facing)
	return createController({
		init: () => ({
			id: `furby-${f.id}`,
			type: 'furby',
			...createObjectSignal(f.x - FURBY_WIDTH / 2, 'x'),
			...createObjectSignal(f.feetY - FURBY_HEIGHT, 'y'),
			width: () => FURBY_WIDTH,
			height: () => FURBY_HEIGHT,
			xScale: facing,
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			children: () => (
				<img
					src={f.asset}
					alt=""
					class="pixelated"
					style={{
						position: 'absolute',
						left: 0,
						bottom: 0,
						width: '100%',
						'transform-origin': 'bottom center',
						transform: `scale(${1 + squash() * 0.6}, ${1 - squash()})`,
					}}
				/>
			),
		}),
		onEnterFrame({ $ }) {
			$.setX(f.x - FURBY_WIDTH / 2)
			$.setY(f.feetY - FURBY_HEIGHT)
			setFacing(f.facing)
			setSquash(furbySquash(f))
			$.setRotation(f.state === 'scooped' ? f.spin * 14 : 0)
			// Flashing while dazed, and can't be bounced on again.
			$.setStyle({
				opacity: f.state === 'dazed' && f.timer % 8 < 4 ? '0.4' : '1',
			})
		},
	})
}

const BUS_WIDTH = 247
const BUS_HEIGHT = 127
/**
 * The bus is the header's, turned round to chase to the right. Flipped, its
 * scoop's front edge is this far in from the bus's left.
 */
const SCOOP_FRONT = BUS_WIDTH + 22
/** Where the wheels touch the ground, from the top of the bus. */
const WHEEL_BOTTOM = 141

export function createBus(world: World) {
	const bus = createController({
		frames: [busBackAsset],
		init: () => ({
			id: 'bus',
			type: 'bus',
			width: () => BUS_WIDTH,
			height: () => BUS_HEIGHT,
			...createObjectSignal(world.bus.frontX - SCOOP_FRONT, 'x'),
			...createObjectSignal(0, 'y'),
			...createObjectSignal(0, 'rotation'),
			xScale: () => -1,
		}),
		onEnterFrame({ $, $age }) {
			const middle = world.bus.frontX - SCOOP_FRONT + BUS_WIDTH / 2
			const ground = world.terrain.groundY(middle)
			$.setX(world.bus.frontX - SCOOP_FRONT)
			$.setY(ground - WHEEL_BOTTOM + Math.cos(10 + $age / 2))
			$.setRotation(
				(Math.atan(world.terrain.slope(middle)) * 180) / Math.PI +
					(Math.random() - 0.5) * 0.8,
			)
		},
	})

	const part = (
		type: string,
		asset: string,
		width: number,
		height: number,
		offset: Vector,
		extra: Partial<Parameters<typeof createConnectedController>[0]> = {},
	) =>
		bus.attach(
			createConnectedController({
				type,
				base: bus,
				frames: [asset],
				width: () => width,
				height: () => height,
				offset,
				...extra,
			}),
		)

	const bounce =
		(phase: number) =>
		(_: unknown, $age: number): number =>
			Math.cos(10 + $age / 2 + phase) * -1

	part(
		'bus-shadow',
		shadowAsset,
		270,
		50,
		{ x: -20, y: 107 },
		{
			style: () => ({ opacity: 0.1 }),
		},
	)
	part('bus-wheel1', wheel1Asset, 34, 38, { x: 73, y: 105 }, { y: bounce(0) })
	part('bus-wheel2', wheel2Asset, 34, 38, { x: 5, y: 103 }, { y: bounce(5) })
	part('bus-wheel3', wheel3Asset, 19, 23, { x: 160, y: 105 }, { y: bounce(10) })
	part('bus-wheel4', wheel4Asset, 26, 30, { x: 197, y: 102 }, { y: bounce(15) })
	part(
		'bus-window',
		windowAsset,
		212,
		40,
		{ x: 26, y: 26 },
		{
			style: () => ({ opacity: 0.75 }),
		},
	)
	part('bus-body', busAsset, BUS_WIDTH, BUS_HEIGHT, { x: 0, y: 0 })
	part(
		'bus-scoop',
		scoopAsset,
		88,
		57,
		{ x: -22, y: 94 },
		{
			// `scooping` isn't a signal: reading the tick redraws it every tick.
			style: () => ({
				transition: 'transform 60ms linear',
				transform:
					world.ticks() >= 0 && world.bus.scooping > 0
						? 'translateY(-45px) rotate(10deg)'
						: 'translateY(0px) rotate(0deg)',
			}),
		},
	)

	return bus
}

/** Something that stays put, drawn standing on the ground at `x`. */
function createFixture(options: {
	id: string
	type: string
	x: number
	/** How far its bottom goes into the ground. */
	sink?: number
	width: number
	height: number
	world: World
	frames?: string[]
	children?: () => JSX.Element
	style?: () => JSX.CSSProperties
	/** Pixels up from where it would stand, every tick. */
	lift?: (age: number) => number
	/** -1 to draw it turned round. */
	xScale?: number
}) {
	const ground = options.world.terrain.groundY(options.x)
	const top = ground - options.height + (options.sink ?? 0)
	return createController({
		frames: options.frames,
		init: () => ({
			id: options.id,
			type: options.type,
			x: () => options.x - options.width / 2,
			...createObjectSignal(top, 'y'),
			width: () => options.width,
			height: () => options.height,
			children: options.children,
			style: options.style,
			xScale: () => options.xScale ?? 1,
		}),
		onEnterFrame: options.lift
			? ({ $, $age }) => $.setY(top - (options.lift?.($age) ?? 0))
			: undefined,
	})
}

/**
 * How far back from the path the scenery stands, so the grass at a tree's foot
 * stays off it: they're only for looking at, nothing to run into.
 */
const SCENERY_SET_BACK = 10

/** How often something that hops does, and how high. */
const HOP_EVERY = 110
const HOP_TICKS = 18
const HOP_HEIGHT = 16

export function createScenery(world: World) {
	const { groundY } = world.terrain
	// Drawn at their own size (times `scale`), once it's known.
	return world.level.scenery.map(({ x, asset, scale = 1, filter, hops }, i) => {
		const width = () => (imageSize(asset)?.width ?? 0) * scale
		const height = () => (imageSize(asset)?.height ?? 0) * scale
		/** The path's back edge at its highest under it, so a slope doesn't run into its foot. */
		const pathTop = () =>
			Math.min(groundY(x - width() / 2), groundY(x), groundY(x + width() / 2)) -
			PATH_BACK
		const top = () => pathTop() - SCENERY_SET_BACK - height()
		/** Each hopper on its own beat. */
		const beat = (i * 37) % HOP_EVERY
		const [lift, setLift] = createSignal(0)
		return createController({
			frames: [asset],
			init: () => ({
				id: `scenery-${i}`,
				type: 'scenery',
				x: () => x - width() / 2,
				y: () => Math.round(top() - lift()),
				width,
				height,
				style: () => ({
					filter,
					'image-rendering': scale > 1 ? 'pixelated' : undefined,
				}),
			}),
			// Only what hops needs anything doing every tick.
			onEnterFrame: hops
				? ({ $age }) => {
						const t = ($age + beat) % HOP_EVERY
						setLift(
							t < HOP_TICKS
								? Math.sin((t / HOP_TICKS) * Math.PI) * HOP_HEIGHT
								: 0,
						)
					}
				: undefined,
		})
	})
}

/** Volunteers stand at the back of the path, out of the runners' way. */
const VOLUNTEER_SINK = 4 - PATH_BACK

export function createRunDirector(world: World) {
	const member = world.runDirector
	const frame = volunteerFrame(member)
	const runner = runners[member][0]
	const size = poseSize(frame, runner())
	return createFixture({
		id: 'run-director',
		type: 'cheerer',
		sink: VOLUNTEER_SINK,
		x: START_X - 70,
		width: size.width,
		height: size.height,
		world,
		frames: frame ? [frame] : [],
		children: () => (
			<Show when={countdownWord(world)}>
				{(word) => <Bubble size={word() === 'Go!' ? 30 : 26}>{word()}</Bubble>}
			</Show>
		),
	})
}

/**
 * The level's purple sign by the start, the site's purple board (see
 * `TitleSign` in the web app) at twice its pixel size, lettered the same way:
 * gold, in Jersey 10.
 */
export function createParkrunSign(world: World, x: number) {
	return createFixture({
		id: 'parkrun-sign',
		type: 'sign',
		x,
		// Just off the back of the path.
		sink: 4 - PATH_BACK,
		width: 140,
		height: 70,
		world,
		frames: [purpleSignAsset],
		children: () => (
			<div
				style={{
					position: 'absolute',
					// Just the board's face (x 1–56, y 1–32 of its 70 × 35 pixels, at
					// twice that), not its darker edge down the right or the shadow.
					inset: '2px 26px 4px 2px',
					'text-align': 'center',
					display: 'flex',
					'flex-direction': 'column',
					'align-items': 'center',
					'justify-content': 'center',
					color: '#f8b832',
					'font-family': '"Jersey 10", sans-serif',
					'line-height': 0.8,
				}}
			>
				<span style={{ 'font-size': '18px' }}>Level {world.level.number}</span>
				<span
					style={{
						'font-size': `${world.level.name.length > 8 ? 20 : 30}px`,
						'line-height': 1,
					}}
				>
					{world.level.name}
				</span>
			</div>
		),
	})
}

/** How far along the course a banner's poles are either side of its line: its slant across the path. */
const BANNER_SLANT = 56
/**
 * Tall enough for the bus to drive under: the cloth's lowest, at the near
 * pole, is this less 50 px off the ground (it hangs 34 px from the pole's top,
 * which stands on the path's near edge, 16 px below the line everyone runs
 * along), and the bus's roof is 142 px up, bobbing.
 */
const POLE_HEIGHT = 200
const POLE_WIDTH = 6
const CLOTH_HEIGHT = 34

/**
 * A banner across the course, for the start and the finish: a pole either
 * side of the path, the far one a little further along, so it crosses the
 * path at a slant and still faces you. The near pole is drawn in front of the
 * runners, and everything else behind them, so you run through it, over its
 * line on the ground.
 */
export function createBanner(world: World, x: number, text: string) {
	const width = BANNER_SLANT * 2 + 8
	const height = POLE_HEIGHT + PATH_BACK + PATH_FRONT
	/** Where the poles stand, in the banner's own pixels: just inside the path's edges. */
	const near = { x: 4, foot: height - 2 }
	const far = { x: width - 4, foot: height - PATH_BACK - PATH_FRONT + 2 }
	const angle =
		(Math.atan2(near.foot - far.foot, far.x - near.x) * 180) / Math.PI

	// The line on the ground, from the path's far edge to its near one, in
	// steps a pixel (two of the screen's) high.
	const line: [number, number, number, number, string][] = []
	const top = height - PATH_BACK - PATH_FRONT
	for (let y = top; y < height; y += 2) {
		const t = (y - top) / (height - top)
		const middle = far.x + (near.x - far.x) * t
		line.push([Math.round(middle / 2) * 2 - 6, y, 12, 2, 'white'])
	}

	const across = createFixture({
		id: `banner-${text}`,
		type: 'banner',
		x,
		// Its bottom is the path's near edge.
		sink: PATH_FRONT,
		width,
		height,
		world,
		children: () => (
			<div style={{ position: 'relative', width: '100%', height: '100%' }}>
				<div style={{ position: 'absolute', inset: 0, opacity: 0.85 }}>
					<Pixels width={width} height={height} rects={line} />
				</div>
				<div
					style={{
						...POLE_STYLE,
						left: `${far.x - POLE_WIDTH / 2}px`,
						top: `${far.foot - POLE_HEIGHT}px`,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: `${near.x}px`,
						top: `${near.foot - POLE_HEIGHT}px`,
						width: `${far.x - near.x}px`,
						height: `${CLOTH_HEIGHT}px`,
						'box-sizing': 'border-box',
						// Sloping up to the far pole's top.
						'transform-origin': '0 0',
						transform: `skewY(${-angle}deg)`,
						background:
							'repeating-conic-gradient(#0f1f29 0 25%, white 0 50%) 0 0 / 12px 12px',
						border: '3px solid #0f1f29',
						display: 'grid',
						'place-items': 'center',
					}}
				>
					<span
						style={{
							background: '#0f1f29',
							color: '#ffd23f',
							padding: '4px 8px 0',
							'font-size': '20px',
							'line-height': 1,
						}}
					>
						{text}
					</span>
				</div>
			</div>
		),
	})

	const nearPole = createFixture({
		id: `banner-${text}-pole`,
		type: 'banner-front',
		x: x - BANNER_SLANT,
		sink: PATH_FRONT - 2,
		width: POLE_WIDTH,
		height: POLE_HEIGHT,
		world,
		children: () => <div style={{ ...POLE_STYLE, left: 0, top: 0 }} />,
	})

	return [across, nearPole]
}

const POLE_STYLE: JSX.CSSProperties = {
	position: 'absolute',
	width: `${POLE_WIDTH}px`,
	height: `${POLE_HEIGHT}px`,
	'box-sizing': 'border-box',
	background: '#9aa3a8',
	'border-left': '2px solid #5f686d',
}

/**
 * Something the bus can scoop up: where it stands until then, and flying off,
 * spinning, after. `scooped` isn't a signal: reading the tick keeps it moving.
 */
function Scoopable(props: {
	world: World
	state: ObstacleState
	children: JSX.Element
}) {
	const flight = () => {
		const now = props.world.ticks()
		const { scooped } = props.state
		return scooped ? scoopFlight(scooped, now) : undefined
	}
	return (
		<div
			style={{
				'transform-origin': 'center',
				transform: (() => {
					const f = flight()
					return f
						? `translate(${f.x}px, ${f.y}px) rotate(${f.spin}deg)`
						: 'none'
				})(),
			}}
		>
			{props.children}
		</div>
	)
}

export function createObstacle(world: World, state: ObstacleState, i: number) {
	const o = state.obstacle
	const id = `${o.kind}-${i}`
	switch (o.kind) {
		case 'rock':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: 3,
				width: 56,
				height: 29,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<img src={rockAsset} alt="" style={{ display: 'block' }} />
					</Scoopable>
				),
			})
		case 'branch':
			return createFixture({
				id,
				type: 'hazard',
				// Its branch reaches back over `o.x` from a trunk beyond it.
				x: o.x + 22,
				sink: 2,
				width: 104,
				height: 260,
				world,
				children: () => <BranchArt />,
				style: () => ({ filter: world.level.look?.foliage }),
			})
		case 'hurdle':
			// One in each lane, across the track. Only the runner's own is run into.
			return HURDLE_LANES.map((lane, n) =>
				createFixture({
					id: `${id}-${n}`,
					type: lane.front ? 'hazard-front' : 'hazard',
					x: o.x + lane.along,
					sink: lane.sink,
					...hurdleSize(lane.depth),
					world,
					children: () => <HurdleArt depth={lane.depth} />,
					// Knocked over: the runner's own once run into, or flattened by
					// the bus (which sets `used` too), and every other lane's as the
					// bus's scoop reaches it. Neither's a signal: reading the tick
					// keeps it up to date.
					style: () => ({
						'--knocked':
							world.ticks() >= 0 &&
							(lane.running
								? state.used
								: world.bus.frontX >= o.x + lane.along - 14)
								? 1
								: 0,
					}),
				}),
			)
		case 'kids':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				width: kidsWidth(o.count),
				height: KIDS_HEIGHT,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<KidsArt count={o.count} />
					</Scoopable>
				),
			})
		case 'pothole':
			return createFixture({
				id,
				type: 'mud',
				x: o.x,
				width: o.width,
				height: POTHOLE_HEIGHT,
				// Into the track, around the line everyone runs along.
				sink: POTHOLE_HEIGHT - POTHOLE_ABOVE,
				world,
				children: () => <PotholeArt width={o.width} />,
			})
		case 'mud':
			return createFixture({
				id,
				type: 'mud',
				x: o.x,
				width: o.width,
				height: 40,
				world,
				sink: 20,
				children: () => <MudArt world={world} obstacle={o} />,
				style: () => ({ filter: world.level.look?.mud }),
			})
		case 'fika': {
			const art = FIKA_ART[o.item]
			return createFixture({
				id,
				type: 'boost',
				x: o.x,
				width: art.width,
				height: art.height,
				sink: -o.height,
				world,
				lift: (age) => Math.round(Math.sin(age / 9) * 3),
				children: () => (
					<Pixels width={art.width} height={art.height} rects={art.rects} />
				),
				// Picked up: gone. `used` isn't a signal, so this reads the tick.
				style: () => ({
					visibility: world.ticks() >= 0 && state.used ? 'hidden' : 'visible',
				}),
			})
		}
		case 'cheer': {
			const frame = volunteerFrame(o.member)
			const runner = runners[o.member][0]
			const size = poseSize(frame, runner())
			const name = world.runner.name
			// Marshals' signs point left, the way the header's runners go. Turned
			// round, they point on along the course, and face the runner coming.
			const turned = frame === runner().frames.marshal?.[0]
			return createFixture({
				id,
				type: 'cheerer',
				sink: VOLUNTEER_SINK,
				x: o.x,
				width: size.width,
				height: size.height,
				world,
				frames: frame ? [frame] : [],
				xScale: turned ? -1 : 1,
				children: () => (
					<Show when={state.cheering() > 0}>
						<Bubble size={18} mirrored={turned}>
							Go {name}!
						</Bubble>
					</Show>
				),
			})
		}
	}
}

const BARK = '#6b4a2f'
const BARK_DARK = '#4a3220'
const LEAF = '#61864a'
const LEAF_DARK = '#2f4323'
const LEAF_LIGHT = '#77a15d'

/**
 * A tree with one low branch reaching back over the path, at head height:
 * 56 px off the ground at its lowest, so duck under it.
 */
function BranchArt() {
	return (
		<Pixels
			width={104}
			height={260}
			rects={[
				// Canopy
				[36, 0, 56, 12, LEAF_DARK],
				[24, 8, 80, 40, LEAF],
				[32, 44, 64, 16, LEAF_DARK],
				[40, 12, 20, 12, LEAF_LIGHT],
				[72, 20, 16, 12, LEAF_LIGHT],
				// Trunk, stood at the back of the path (the art's foot, 258, is
				// the middle of it), so the runner goes past it, not through it
				[66, 56, 14, 186, BARK],
				[66, 56, 4, 186, BARK_DARK],
				[62, 232, 22, 10, BARK],
				// The low branch, back over the path
				[16, 166, 54, 8, BARK],
				[4, 162, 16, 8, BARK],
				[16, 172, 54, 2, BARK_DARK],
				// Leaves hanging off it, down to head height
				[0, 170, 40, 22, LEAF],
				[4, 190, 28, 16, LEAF_DARK],
				[30, 174, 26, 18, LEAF],
				[8, 204, 18, 20, LEAF],
				[30, 190, 16, 12, LEAF_DARK],
				[6, 174, 10, 8, LEAF_LIGHT],
				[34, 178, 8, 6, LEAF_LIGHT],
			]}
		/>
	)
}

/** A puddle of mud, following the ground under it. */
function MudArt(props: {
	world: World
	obstacle: Extract<Obstacle, { kind: 'mud' }>
}) {
	const { obstacle: o, world } = props
	const left = o.x - o.width / 2
	const top = world.terrain.groundY(o.x) - 40 + 20
	const rects: [number, number, number, number, string][] = []
	for (let x = 0; x < o.width; x += 4) {
		const surface = Math.round(world.terrain.groundY(left + x) - top)
		const edge = Math.min(x, o.width - x)
		const depth = Math.min(10, 2 + Math.floor(edge / 4) * 2)
		rects.push([x, surface - 2, 4, depth, '#5b3d22'])
		if (edge > 8) rects.push([x, surface - 2, 4, 2, '#7a5634'])
		if (edge > 14 && (x / 4) % 5 === 0)
			rects.push([x, surface + 2, 4, 2, '#8e6a44'])
	}
	return <Pixels width={o.width} height={40} rects={rects} />
}
