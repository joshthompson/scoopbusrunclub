import tombstoneAsset from '@/assets/halloween/tombstone.png'
import rockAsset from '@/assets/misc/rock1.png'
import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { Course } from '../courses/types'
import { Backdrop, Ground, HorizonTrees, type View } from '../draw/Backdrop'
import { GeeseArt, geeseWidth } from '../draw/art/geese'
import { KidsArt, kidsWidth } from '../draw/art/kids'
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
import { zombieSprite } from '../runners/skeleton'

/**
 * A course, seen through a little window onto it: its own sky, hills, path
 * and scenery, drawn by the game's own backdrop, panning along it, up and
 * down its real hills.
 */

/** The game's scene, at this size in the window: small enough to see its hills. */
const SCALE = 0.5
/** How fast it scrolls by, in the scene's pixels a second. */
const SPEED = 130
/** Where it starts, as a share of the way round: somewhere with hills, past the flat start. */
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
/** How quickly the window follows the ground up and down the hills. */
const FOLLOW = 0.08
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

	const from = START_X + terrain.length * START_AT
	const to = terrain.finishX - sceneWidth
	const [camera, setCamera] = createSignal(from)
	/** The window's top, in the scene: down with the ground, low on the course. */
	const topFor = (cameraX: number) =>
		Math.min(
			VIEW_HEIGHT - sceneHeight(),
			Math.max(
				HORIZON_TOP,
				terrain.groundY(cameraX + followAcross) - sceneHeight() * GROUND_DOWN,
			),
		)
	const [top, setTop] = createSignal(topFor(from))

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
		// On round the course, and back to the start from the finish.
		let next = camera() + SPEED * seconds
		if (next > to) next = START_X - followAcross
		setCamera(next)
		setTop(top() + (topFor(next) - top()) * FOLLOW)
		frame = requestAnimationFrame(tick)
	}
	onMount(() => {
		frame = requestAnimationFrame(tick)
	})
	onCleanup(() => cancelAnimationFrame(frame))

	const view: View = { course, terrain, camera }
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
						{(rock) => (
							<img
								src={rockAsset}
								alt=""
								style={{ ...at(rock.x, 3), transform: 'translateX(-50%)' }}
							/>
						)}
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
										<HurdleArt depth={lane.depth} />
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
								style={{ ...at(x), transform: 'translateX(-50%) scaleX(-1)' }}
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
									<PlatformArt look={look} />
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
				</div>
			</div>
		</div>
	)
}

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
		overflow: 'hidden',
	},
	course: {
		position: 'absolute',
		inset: 0,
		'will-change': 'transform',
	},
} satisfies Record<string, JSX.CSSProperties>
