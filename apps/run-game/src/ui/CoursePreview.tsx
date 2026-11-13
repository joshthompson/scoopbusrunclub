import tombstoneAsset from '@/assets/halloween/tombstone.png'
import rockAsset from '@/assets/misc/rock1.png'
import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { Course, Obstacle } from '../courses/types'
import { Backdrop, Ground, HorizonTrees, type View } from '../draw/Backdrop'
import { GeeseArt, geeseWidth } from '../draw/art/geese'
import { KidsArt, kidsWidth } from '../draw/art/kids'
import {
	BalloonArt,
	GullArt,
	RingArt,
	StormArt,
	TurbineArt,
	WhaleArt,
} from '../draw/art/sky'
import {
	HURDLE_LANES,
	HurdleArt,
	POTHOLE_ABOVE,
	POTHOLE_HEIGHT,
	PotholeArt,
} from '../draw/art/track'
import { PlatformArt, platformLook } from '../draw/platformArt'
import { rideLook } from '../draw/rideLook'
import { PATH_BACK, START_X, VIEW_HEIGHT } from '../game/constants'
import { platformAt } from '../game/platforms'
import {
	TURBINE_BLADE,
	balloonAt,
	gullsAt,
	stormAt,
	turbineAt,
} from '../game/sky'
import { zombieSprite } from '../runners/skeleton'

/**
 * A course, seen through a little window onto it: its own sky, hills, path
 * and scenery, drawn by the game's own backdrop, at one place along it,
 * still, chosen to show it off (`CourseLook['previewFrom']`).
 */

/** The game's scene, at this size in the window: small enough to see its hills. */
const SCALE = 0.5
/** Where it looks, if the course doesn't say, as a share of the way round: somewhere with hills, past the flat start. */
const START_AT = 0.35
/** Where across the window it follows the ground up and down, and how far down the window that is. */
const FOLLOW_ACROSS = 0.55
const GROUND_DOWN = 0.92
/**
 * The window's top, where it can be: a strip of sky above the far hills, so
 * they and the scenery on them are in it. It only goes lower to keep the
 * ground in.
 */
const HORIZON_TOP = 120
/** Up a mountain, the ground's never higher up the window than this: it follows it up. */
const GROUND_HIGHEST = 0.45
/** Scenery stands this far back from the path, as in the game. */
const SET_BACK = 10

export function CoursePreview(props: {
	course: Course
	width: number
	height: number
}) {
	const { course } = props
	const { terrain } = course
	const sceneWidth = props.width / SCALE
	/** As tall as it's given room for, which can change: see `CourseSelect`. */
	const sceneHeight = () => props.height / SCALE
	const followAcross = sceneWidth * FOLLOW_ACROSS

	const from = course.look?.previewFrom ?? START_X + terrain.length * START_AT
	const camera = () => from
	/**
	 * The window's top, in the scene: down with the ground, low on the
	 * course; and up with it, up a mountain, keeping it at least
	 * `GROUND_HIGHEST` of the way down the window.
	 */
	const topFor = (cameraX: number) => {
		const ground = terrain.groundY(cameraX + followAcross)
		return Math.min(
			VIEW_HEIGHT - sceneHeight(),
			Math.max(
				Math.min(HORIZON_TOP, ground - sceneHeight() * GROUND_HIGHEST),
				ground - sceneHeight() * GROUND_DOWN,
			),
		)
	}
	/** As tall as the window is, which can change: see `CourseSelect`. */
	const top = () => topFor(from)

	let frame = 0
	let last = 0
	let clock = 0
	/** The game's ticks, for what's animated by them: the geese, pecking. */
	const [ticks, setTicks] = createSignal(0)
	const tick = (now: number) => {
		const seconds = last ? Math.min(0.1, (now - last) / 1000) : 0
		last = now
		clock += seconds
		setTicks(Math.floor(clock * 60))
		frame = requestAnimationFrame(tick)
	}
	onMount(() => {
		frame = requestAnimationFrame(tick)
	})
	onCleanup(() => cancelAnimationFrame(frame))

	/**
	 * How far up it's looking, as the game's camera would be, for a backdrop
	 * that rises with it, up a mountain: from where it looks at the start.
	 */
	const cameraY = () => Math.min(0, top() + sceneHeight() - VIEW_HEIGHT)
	const view: View = {
		course,
		terrain,
		camera,
		...(course.look?.horizonRise !== undefined && { cameraY }),
	}
	/** Stood on the ground at `x`, `sink` px into it, in the scene. */
	const at = (x: number, sink = 0): JSX.CSSProperties => ({
		position: 'absolute',
		left: `${x}px`,
		bottom: `${VIEW_HEIGHT - terrain.groundY(x) - sink}px`,
	})
	const rocks = course.obstacles.filter((o) => o.kind === 'rock')
	const hurdles = course.obstacles.filter((o) => o.kind === 'hurdle')
	const potholes = course.obstacles.flatMap((o) =>
		o.kind === 'pothole' ? [o] : [],
	)
	const kids = course.obstacles.flatMap((o) => (o.kind === 'kids' ? [o] : []))
	const geese = course.obstacles.flatMap((o) => (o.kind === 'geese' ? [o] : []))
	const tombstones = course.obstacles.filter((o) => o.kind === 'tombstone')
	// Stood where they start: they only walk in a race.
	const zombies = course.obstacles.flatMap((o) =>
		o.kind === 'zombie' ? [o] : [],
	)
	const rings = course.boosts.flatMap((b) => (b.kind === 'ring' ? [b] : []))
	const sky = course.obstacles.flatMap((o) =>
		o.kind === 'gulls' ||
		o.kind === 'balloon' ||
		o.kind === 'storm' ||
		o.kind === 'turbine' ||
		o.kind === 'whale'
			? [o]
			: [],
	)
	/** Its middle `height` over the Ground's line at `x`, in the scene. */
	const above = (x: number, height: number): JSX.CSSProperties => ({
		position: 'absolute',
		left: `${x}px`,
		top: `${terrain.groundY(x) - height}px`,
		transform: 'translate(-50%, -50%)',
	})

	return (
		<div
			style={{
				...course.look?.palette,
				...styles.window,
				width: `${props.width}px`,
				height: `${props.height}px`,
			}}
		>
			<div
				style={{
					...styles.scene,
					width: `${sceneWidth}px`,
					transform: `scale(${SCALE}) translateY(${-top()}px)`,
				}}
			>
				<Backdrop world={view} />
				<HorizonTrees world={view} />
				<Ground world={view} />

				{/* What's along the course, scrolling with the ground. */}
				<div
					style={{
						...styles.course,
						transform: `translateX(${Math.round(-camera())}px)`,
					}}
				>
					<For each={course.scenery}>
						{(item, i) => (
							<div
								style={{
									...at(item.x, -PATH_BACK - SET_BACK),
									transform: 'translateX(-50%)',
								}}
							>
								<div
									style={
										item.hops
											? {
													animation: `furby-hop 1.6s ${(i() % 7) * 0.23}s ease-in-out infinite`,
												}
											: {}
									}
								>
									<img
										src={item.asset}
										alt=""
										class={item.scale ? 'pixelated' : undefined}
										style={{
											display: 'block',
											// Its own size, however far along the course it's stood.
											'max-width': 'none',
											filter: item.filter,
											...(item.scale
												? {
														transform: `scale(${item.scale})`,
														'transform-origin': 'bottom center',
													}
												: {}),
										}}
									/>
								</div>
							</div>
						)}
					</For>
					<For each={rocks}>
						{(rock, i) => {
							// Or the course's own, in its place, taken in turn.
							const own = course.look?.rocks
							const art = own?.length ? own[i() % own.length] : undefined
							return (
								<img
									src={art?.asset ?? rockAsset}
									alt=""
									class={art ? 'pixelated' : undefined}
									width={art?.width}
									height={art?.height}
									style={{
										...at(rock.x, 3),
										transform: 'translateX(-50%)',
										filter: course.look?.rock,
									}}
								/>
							)
						}}
					</For>
					<For each={hurdles}>
						{(hurdle) => (
							<For each={HURDLE_LANES}>
								{(lane) => (
									<div
										style={{
											...at(hurdle.x + lane.along, lane.sink),
											transform: 'translateX(-50%)',
											'--knocked': 0,
										}}
									>
										<HurdleArt depth={lane.depth} tall={hurdle.tall} />
									</div>
								)}
							</For>
						)}
					</For>
					<For each={potholes}>
						{(hole) => (
							<div
								style={{
									...at(hole.x, POTHOLE_HEIGHT - POTHOLE_ABOVE),
									transform: 'translateX(-50%)',
								}}
							>
								<PotholeArt width={hole.width} />
							</div>
						)}
					</For>
					<For each={kids}>
						{(group) => (
							<div style={{ ...at(group.x), transform: 'translateX(-50%)' }}>
								<KidsArt count={group.count} />
							</div>
						)}
					</For>
					<For each={geese}>
						{(group) => (
							<div style={{ ...at(group.x), transform: 'translateX(-50%)' }}>
								<GeeseArt
									x={group.x}
									count={group.count}
									now={ticks()}
									flown={undefined}
								/>
							</div>
						)}
					</For>
					<For each={tombstones}>
						{(o) => (
							<img
								src={tombstoneAsset}
								alt=""
								style={{ ...at(o.x, 4), transform: 'translateX(-50%)' }}
							/>
						)}
					</For>
					<For each={zombies}>
						{(o) => {
							const { sprite, filter } = zombieSprite(o)
							return (
								<div
									class="pixelated"
									style={{
										...at(o.x),
										transform: 'translateX(-50%)',
										width: `${sprite.width * 2}px`,
										height: `${sprite.height * 2}px`,
										'background-image': `url(${(sprite.run[0] ?? '').split('#')[0]})`,
										'background-size': 'auto 100%',
										filter,
									}}
								/>
							)
						}}
					</For>
					<For each={course.corgis ?? []}>
						{(x) => (
							<div
								style={{
									...at(x),
									// Facing the way they're coming from; a glider, the way it'll fly.
									transform:
										course.ride === 'glider'
											? 'translateX(-50%)'
											: 'translateX(-50%) scaleX(-1)',
								}}
							>
								{rideLook(course).Art({ pose: 'sit' })}
							</div>
						)}
					</For>
					<For each={course.platforms ?? []}>
						{(platform) => {
							const at = platformAt(terrain, platform, 0)
							const look = platformLook(course)
							return (
								<div
									style={{
										position: 'absolute',
										left: `${at.left}px`,
										top: `${at.top}px`,
										width: `${platform.width}px`,
										height: `${platform.depth ?? look.depth}px`,
									}}
								>
									<Show
										when={platform.art}
										fallback={<PlatformArt look={look} />}
									>
										{(art) => (
											<img
												src={art().asset}
												alt=""
												class="pixelated"
												width={art().width}
												height={art().height}
												style={{
													position: 'absolute',
													left: `${(platform.width - art().width) / 2}px`,
													top: `${-art().top}px`,
													'max-width': 'none',
												}}
											/>
										)}
									</Show>
								</div>
							)
						}}
					</For>
					<For each={course.furbies ?? []}>
						{(furby, i) => (
							<div style={{ ...at(furby.x), transform: 'translateX(-50%)' }}>
								<div
									style={{
										animation: `furby-hop 1.2s ${(i() % 5) * 0.27}s ease-in-out infinite`,
									}}
								>
									<img
										src={furby.asset}
										alt=""
										class="pixelated"
										style={{ display: 'block', width: '50px' }}
									/>
								</div>
							</div>
						)}
					</For>
					{/* Out over the sea: its Rings, and what's in the sky, still. */}
					<For each={rings}>
						{(ring) => (
							<div style={above(ring.x, ring.height)}>
								<div style={{ position: 'relative' }}>
									<RingArt half="far" lit={false} />
									<div style={{ position: 'absolute', inset: 0 }}>
										<RingArt half="near" lit={false} />
									</div>
								</div>
							</div>
						)}
					</For>
					<For each={sky}>{(o) => <SkyThing course={course} o={o} />}</For>
				</div>
			</div>
		</div>
	)
}

/** One of the sky's Obstacles, still, where it is at the start of a race. */
function SkyThing(props: { course: Course; o: SkyObstacle }) {
	const { o } = props
	const line = props.course.terrain.groundY(o.x)
	const place = (x: number, y: number): JSX.CSSProperties => ({
		position: 'absolute',
		left: `${x}px`,
		top: `${y}px`,
	})
	switch (o.kind) {
		case 'gulls':
			return (
				<For each={gullsAt(o, line, 0)}>
					{(gull) => (
						<div style={place(gull.x - 12, gull.y - 7)}>
							<GullArt up={gull.flap} />
						</div>
					)}
				</For>
			)
		case 'balloon':
			return (
				<div style={place(o.x - 36, balloonAt(o, line, 0).top)}>
					<BalloonArt x={o.x} />
				</div>
			)
		case 'storm': {
			const { top } = stormAt(o, line, 0)
			return (
				<div style={place(o.x - 80, top)}>
					<StormArt brewing={false} striking={false} now={0} reach={0} />
				</div>
			)
		}
		case 'turbine':
			return (
				<div
					style={place(
						o.x - TURBINE_BLADE - 4,
						line - o.height - TURBINE_BLADE - 4,
					)}
				>
					<TurbineArt angles={turbineAt(o, line, 0).angles} tall={o.height} />
				</div>
			)
		case 'whale':
			return (
				<div style={place(o.x - 52, line - o.height)}>
					<WhaleArt
						up={1}
						spout={0}
						bubbling={false}
						height={o.height}
						now={0}
					/>
				</div>
			)
	}
}

type SkyObstacle = Extract<
	Obstacle,
	{ kind: 'gulls' | 'balloon' | 'storm' | 'turbine' | 'whale' }
>

const styles = {
	window: {
		position: 'relative',
		overflow: 'hidden',
		border: '3px solid white',
		'box-sizing': 'content-box',
		background: 'var(--sky-blue-top)',
	},
	scene: {
		position: 'absolute',
		left: 0,
		top: 0,
		height: `${VIEW_HEIGHT}px`,
		'transform-origin': '0 0',
		// Clipped either side, but not over the top: up a mountain, the
		// window looks a long way up over it. The window clips the rest.
		'overflow-x': 'clip',
		'overflow-y': 'visible',
	},
	course: {
		position: 'absolute',
		inset: 0,
		'will-change': 'transform',
	},
} satisfies Record<string, JSX.CSSProperties>
