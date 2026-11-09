import busEmoji from '@/assets/emoji/bus.png'
import rockAsset from '@/assets/misc/rock1.png'
import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Backdrop, Ground, HorizonTrees, type View } from '../game/Backdrop'
import { PATH_BACK, START_X, VIEW_HEIGHT } from '../game/constants'
import { CORGI_WIDTH, CorgiArt } from '../game/corgiArt'
import { KidsArt, kidsWidth } from '../game/kidsArt'
import {
	HURDLE_LANES,
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
/** How often the runner doesn't jump something, and runs into it instead. */
const HIT_CHANCE = 0.2
/** How high they jump, in the scene's pixels, and how far before something they take off. */
const JUMP_HEIGHT = 70
const TAKE_OFF = 26
/** How much they clear something by, past its far side. */
const CLEARANCE = 30
/** Running into something: this long, at this share of their speed, flashing. */
const STUMBLE_SECONDS = 0.7
const STUMBLE_SPEED = 0.3

/** Something on the course to jump, or run into: its near and far sides. */
interface Hazard {
	id: number
	from: number
	to: number
	/** A hurdle's knocked over when it's run into. */
	hurdle?: number
}

/** Everything the preview draws that the runner has to get past, in order. */
function hazardsOf(level: Level): Hazard[] {
	const hazards: Omit<Hazard, 'id'>[] = []
	const across = (x: number, half: number) => ({ from: x - half, to: x + half })
	for (const o of level.obstacles) {
		if (o.kind === 'rock') hazards.push(across(o.x, 20))
		if (o.kind === 'hurdle') hazards.push({ ...across(o.x, 14), hurdle: o.x })
		if (o.kind === 'pothole') hazards.push(across(o.x, o.width / 2 - 4))
		if (o.kind === 'kids') hazards.push(across(o.x, kidsWidth(o.count) / 2 - 6))
	}
	for (const x of level.corgis ?? []) hazards.push(across(x, CORGI_WIDTH / 2))
	for (const furby of level.furbies ?? []) hazards.push(across(furby.x, 25))
	return hazards
		.sort((a, b) => a.from - b.from)
		.map((hazard, id) => ({ ...hazard, id }))
}

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

	// The runner getting past what's in the way: jumping it, mostly.
	const hazards = hazardsOf(level)
	/** For each hazard, once it's close: jump it, or run into it. */
	const choices = new Map<number, 'jump' | 'hit' | 'done'>()
	let jump: { at: number; seconds: number } | undefined
	let stumbling = 0
	const [lift, setLift] = createSignal(0)
	const [flash, setFlash] = createSignal(false)
	/** The hurdles run into, by where they are: knocked over. */
	const [knocked, setKnocked] = createSignal(new Set<number>())

	let frame = 0
	let last = 0
	let clock = 0
	const tick = (now: number) => {
		const seconds = last ? Math.min(0.1, (now - last) / 1000) : 0
		last = now
		clock += seconds
		// On round the course, and back to where it started at the finish,
		// with everything stood back up.
		const speed = stumbling > 0 ? SPEED * STUMBLE_SPEED : SPEED
		let next = camera() + speed * seconds
		if (next > to) {
			next = START_X - sceneWidth * RUNNER_ACROSS
			choices.clear()
			setKnocked(new Set<number>())
		}
		setCamera(next)
		setTop(top() + (topFor(next) - top()) * FOLLOW)

		const x = next + runnerAcross
		if (stumbling > 0) stumbling -= seconds
		const ahead = hazards.find((hazard) => hazard.to > x)
		if (ahead && !jump && stumbling <= 0) {
			let choice = choices.get(ahead.id)
			if (!choice) {
				choice = Math.random() < HIT_CHANCE ? 'hit' : 'jump'
				choices.set(ahead.id, choice)
			}
			if (choice === 'jump' && ahead.from - x < TAKE_OFF) {
				// Long enough to be over its far side, and a bit.
				jump = { at: clock, seconds: (ahead.to - x + CLEARANCE) / SPEED }
				choices.set(ahead.id, 'done')
			}
			if (choice === 'hit' && x >= ahead.from) {
				stumbling = STUMBLE_SECONDS
				choices.set(ahead.id, 'done')
				const { hurdle } = ahead
				if (hurdle !== undefined) setKnocked((all) => new Set(all).add(hurdle))
			}
		}
		if (jump) {
			const t = (clock - jump.at) / jump.seconds
			if (t >= 1) jump = undefined
			setLift(t >= 1 ? 0 : 4 * JUMP_HEIGHT * t * (1 - t))
		}
		setFlash(stumbling > 0 && Math.floor(stumbling * 12) % 2 === 0)
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
	const kids = level.obstacles.flatMap((o) => (o.kind === 'kids' ? [o] : []))

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
							<For each={HURDLE_LANES}>
								{(lane) => (
									<div
										style={{
											...at(hurdle.x + lane.along, lane.sink),
											transform: 'translateX(-50%)',
											// The runner's lane's, knocked over if run into.
											'--knocked':
												lane.running && knocked().has(hurdle.x) ? 1 : 0,
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
						...at(runnerX(), -lift()),
						left: `${runnerAcross}px`,
						transform: 'translateX(-50%)',
						opacity: flash() ? 0.4 : 1,
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
