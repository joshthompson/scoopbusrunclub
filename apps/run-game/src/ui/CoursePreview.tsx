import busEmoji from '@/assets/emoji/bus.png'
import rockAsset from '@/assets/misc/rock1.png'
import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Backdrop, Ground, HorizonTrees, type View } from '../game/Backdrop'
import { PATH_BACK, START_X, VIEW_HEIGHT } from '../game/constants'
import { CorgiArt } from '../game/corgiArt'
import {
	HurdleArt,
	POTHOLE_ABOVE,
	POTHOLE_HEIGHT,
	PotholeArt,
} from '../game/trackArt'
import type { Level } from '../levels/types'
import type { Playable } from '../playable'
import { RunStrip } from './RunStrip'

/**
 * A course, seen through a little window onto it: its own sky, hills, path
 * and scenery, drawn by the game's own backdrop, scrolling by with the runner
 * running along it, up and down its real hills. And with the bus behind them,
 * for Endless.
 */

/** The game's scene, at this size in the window: small enough to see its hills. */
const SCALE = 0.5
/** How fast it scrolls by, in the scene's pixels a second. */
const SPEED = 130
/** Where it starts, as a share of the way round: somewhere with hills, past the flat start. */
const START_AT = 0.35
/** Where the runner is across the window, and as far down it as their feet go. */
const RUNNER_ACROSS = 0.55
const RUNNER_DOWN = 0.92
/**
 * The window's top, where it can be: a strip of sky above the far hills, so
 * they and the scenery on them are in it. It only goes lower to keep the
 * runner in.
 */
const HORIZON_TOP = 120
/** How far behind them the bus is, in the scene's pixels. */
const BUS_BEHIND = 230
/** How quickly the window follows them up and down the hills. */
const FOLLOW = 0.08
/** Scenery stands this far back from the path, as in the game. */
const SET_BACK = 10

export function CoursePreview(props: {
	level: Level
	runner: Playable
	/** The bus, chasing them: for Endless. */
	bus?: boolean
	width: number
	height: number
}) {
	const { level, runner } = props
	const { terrain } = level
	const sceneWidth = props.width / SCALE
	const sceneHeight = props.height / SCALE
	const runnerAcross = sceneWidth * RUNNER_ACROSS

	const from = START_X + terrain.length * START_AT
	const to = terrain.finishX - sceneWidth
	const [camera, setCamera] = createSignal(from)
	/** The window's top, in the scene: down with the runner, low on the course. */
	const topFor = (cameraX: number) =>
		Math.min(
			VIEW_HEIGHT - sceneHeight,
			Math.max(
				HORIZON_TOP,
				terrain.groundY(cameraX + runnerAcross) - sceneHeight * RUNNER_DOWN,
			),
		)
	const [top, setTop] = createSignal(topFor(from))

	let frame = 0
	let last = 0
	const tick = (now: number) => {
		const seconds = last ? Math.min(0.1, (now - last) / 1000) : 0
		last = now
		// On round the course, and back to where it started at the finish.
		let next = camera() + SPEED * seconds
		if (next > to) next = START_X - sceneWidth * RUNNER_ACROSS
		setCamera(next)
		setTop(top() + (topFor(next) - top()) * FOLLOW)
		frame = requestAnimationFrame(tick)
	}
	onMount(() => {
		frame = requestAnimationFrame(tick)
	})
	onCleanup(() => cancelAnimationFrame(frame))

	const view: View = { level, terrain, camera }
	/** Stood on the ground at `x`, `sink` px into it, in the scene. */
	const at = (x: number, sink = 0): JSX.CSSProperties => ({
		position: 'absolute',
		left: `${x}px`,
		bottom: `${VIEW_HEIGHT - terrain.groundY(x) - sink}px`,
	})
	const runnerX = () => camera() + runnerAcross
	const rocks = level.obstacles.filter((o) => o.kind === 'rock')
	const hurdles = level.obstacles.filter((o) => o.kind === 'hurdle')
	const potholes = level.obstacles.flatMap((o) =>
		o.kind === 'pothole' ? [o] : [],
	)

	return (
		<div
			style={{
				...level.look?.palette,
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
					<For each={level.scenery}>
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
							<div style={{ ...at(hurdle.x), transform: 'translateX(-50%)' }}>
								<HurdleArt />
							</div>
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
					<For each={level.corgis ?? []}>
						{(x) => (
							<div
								style={{ ...at(x), transform: 'translateX(-50%) scaleX(-1)' }}
							>
								<CorgiArt pose="sit" />
							</div>
						)}
					</For>
					<For each={level.furbies ?? []}>
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

				<Show when={props.bus}>
					<img
						src={busEmoji}
						alt=""
						class="pixelated"
						style={{
							...at(runnerX() - BUS_BEHIND, 6),
							left: `${runnerAcross - BUS_BEHIND}px`,
							width: '120px',
							transform: 'translateX(-50%) scaleX(-1)',
						}}
					/>
				</Show>
				<div
					style={{
						...at(runnerX()),
						left: `${runnerAcross}px`,
						transform: 'translateX(-50%)',
					}}
				>
					<RunStrip
						frame={runner.sprite.run[0] ?? ''}
						width={runner.sprite.width}
						height={runner.sprite.height}
						stride={0.38}
					/>
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
