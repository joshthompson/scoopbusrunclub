import {
	For,
	type JSX,
	Show,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	untrack,
} from 'solid-js'
import type { Course } from '../courses/types'
import { RaceCanvas, createRaceScene } from '../draw/RaceView'
import { UNDER_LIFT } from '../draw/art/skis'
import { rideLook } from '../draw/rideLook'
import { PX_PER_M, RUNNER_SCALE } from '../game/constants'
import { POPUP_TICKS, onScreen, roundOver, stepWorld } from '../game/step'
import { type Racer, type RacerEntry, createWorld } from '../game/world'
import { type Controls, touchScreen } from '../input'
import { PauseMenu, SOUND_ITEMS } from '../screens/PauseMenu'
import { RaceStartOverlay, createRaceStart } from '../ui/RaceStart'
import { Stage } from '../ui/Stage'
import { NameTag, hatRise } from './NameTag'
import type { ShownReaction } from './protocol'
import { ReactionsLayer } from './reactions'

/**
 * One Round: a course raced by every Player at once on the one screen,
 * until only one's left. `onOver` is told the order they came in.
 */
export function Round(props: {
	course: Course
	/** Baby Mode: no bus, and nobody's out. */
	baby?: boolean
	number: number
	/** How many Rounds there are, if it isn't a Backyard Ultra. */
	of?: number
	racers: RacerEntry[]
	/**
	 * Its Starter, who starts it from its start screen by pressing any of their keys or buttons:
	 * their Player number, colour and name, and their controls.
	 */
	starter?: {
		number: number
		colour: string
		name: string
		controls: () => Controls
	}
	/** On its start screen, held for the Starter, or not any more. */
	onWaiting?: (waiting: boolean) => void
	onPause: (paused: boolean) => void
	/** Given the way to pause it, or carry on, for the Starter's phone to. */
	pauseWith?: (pause: (paused: boolean) => void) => void
	onOver: (order: Racer[]) => void
	/** The world, for the Room to tell phones how their Player's doing. */
	onWorld: (world: ReturnType<typeof createWorld>) => void
	/** Every tick, once it's moved on: for sending it to remote phones. */
	onTick?: () => void
	onLobby: () => void
	onEnd: () => void
	/** In the top left corner, the race's words beside it: how to join. */
	corner?: JSX.Element
	/** Reactions on their way up the screen, from whoever's watching. */
	reactions?: ShownReaction[]
}) {
	const world = createWorld(props.course, props.racers, {
		round: true,
		baby: props.baby,
	})
	props.onWorld(world)
	// Held, the world not moving on, while it's got ready and on its start
	// screen; the Scene ticking all the same, so everything on it is placed.
	const scene = createRaceScene(world, (w) => {
		if (!start.holding()) stepWorld(w)
	})

	if (props.onTick) scene.tickers.add(props.onTick)
	let told = false
	scene.tickers.add(() => {
		if (told || !roundOver(world)) return
		told = true
		props.onOver(world.order() ?? world.racers)
	})

	const [paused, setPaused] = createSignal(false)
	// Covered while it's got ready, then its start screen, held till its
	// Starter presses anything: every Round's a course raced for the first time.
	const start = createRaceStart({
		world,
		scene,
		intro: true,
		// Any of their buttons or keys, not just jump: held as "up", for starting it.
		starter: () => {
			const held = props.starter?.controls()
			const any = !!held && (held.up || held.down || held.left || held.right)
			return { left: false, right: false, up: any, down: false }
		},
		onGo: () => {
			for (const r of world.racers) r.body.wasUp = true
			props.onWaiting?.(false)
		},
	})
	createEffect(() => {
		if (start.stage() === 'waiting') untrack(() => props.onWaiting?.(true))
	})
	onCleanup(() => props.onWaiting?.(false))

	// Pausing is the engine's, as in single player (see `Game`), and only the
	// Host's: Esc or P, or the button. Not till it's under way.
	const pause = (next: boolean) => {
		if (start.holding()) return
		setPaused(next)
		props.onPause(next)
		scene.modal.set(next ? document.createElement('span') : undefined)
		// Jumping to pick "Resume" shouldn't jump on the way back in.
		if (!next) for (const r of world.racers) r.body.wasUp = true
	}
	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape' || event.key === 'p' || event.key === 'P')
			pause(!paused())
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))
	props.pauseWith?.(pause)
	// Switching away from the game pauses it, so nobody's scooped meanwhile.
	const onBlur = () => !world.order() && pause(true)
	window.addEventListener('blur', onBlur)
	onCleanup(() => window.removeEventListener('blur', onBlur))

	return (
		<Stage>
			<RaceCanvas
				world={world}
				scene={scene}
				overlay={
					<>
						<RoundHud
							world={world}
							number={props.number}
							of={props.of}
							onPause={() => pause(true)}
							corner={props.corner}
							reactions={props.reactions}
						/>
						<RaceStartOverlay
							start={start}
							title={props.course.name}
							kicker={`Round ${props.number}${props.of ? ` of ${props.of}` : ''}`}
							prompt={
								props.starter
									? `${props.starter.name || `P${props.starter.number}`}: press any key to start`
									: 'Press Enter to start'
							}
						/>
						<Show when={paused()}>
							<PauseMenu
								groups={[
									[{ label: 'Resume', choose: () => pause(false) }],
									SOUND_ITEMS,
									[
										{ label: 'Back to the lobby', choose: props.onLobby },
										{ label: 'End the Room', choose: props.onEnd },
									],
								]}
							/>
						</Show>
					</>
				}
			/>
		</Stage>
	)
}

/**
 * Everyone's name over their head, in their colour, and what's popping up.
 * On a phone, with no pause button, and its words `textScale` times bigger.
 */
export function RoundHud(props: {
	world: ReturnType<typeof createWorld>
	number: number
	of?: number
	onPause?: () => void
	textScale?: number
	/** In the top left corner, the words beside it. */
	corner?: JSX.Element
	/** Reactions on their way up the screen, from whoever's watching. */
	reactions?: ShownReaction[]
}) {
	const { world } = props
	const size = (px: number) => `${px * (props.textScale ?? 1)}px`
	/** How high a ride's saddle is: the camel's, the corgi's. */
	const { saddle } = rideLook(world.course)
	const tag = (racer: Racer) => {
		// Read the tick, so this keeps up: bodies aren't signals.
		world.ticks()
		const height = racer.runner.sprite.height * RUNNER_SCALE
		// Over their hat, if it stands up over their head.
		const rise = hatRise(racer.runner, racer.body.hat, RUNNER_SCALE)
		// Up on a camel's back, or a corgi's, or on skis: lifted as they are.
		const { body } = racer
		const lift =
			(body.mount > 0 ? saddle : 0) + (body.board > 0 ? UNDER_LIFT : 0)
		return onScreen(world, body.x, body.feetY - height - lift - 4 - rise)
	}
	const left = () => {
		world.ticks()
		return world.racers.filter((r) => !r.out).length
	}
	/** How far the bus is behind the last of them, once it's off the screen. */
	const busBehind = () => {
		world.ticks()
		if (
			world.baby ||
			world.phase() !== 'running' ||
			world.busX() >= world.camera()
		)
			return undefined
		const running = world.racers.filter((r) => !r.out)
		if (!running.length) return undefined
		const last = Math.min(...running.map((r) => r.body.x))
		return Math.max(0, Math.round((last - world.busX()) / PX_PER_M))
	}
	/** Tagged until they're well on their way out of the scoop. */
	const tagged = (racer: Racer) => {
		world.ticks()
		return racer.out !== 'scooped' || racer.body.spin < 40
	}

	/**
	 * How to join, in the corner, faded to `CORNER_SEEN_THROUGH` while
	 * anyone's under it, so it never hides them: by where it is on the
	 * stage, measured, against each runner's box, as the name tags are
	 * placed. Eased in and out, a little a tick. Measured now and then, not
	 * every tick: it only moves if the window's resized.
	 */
	let hud: HTMLDivElement | undefined
	let cornerBox: HTMLDivElement | undefined
	let box: ReturnType<typeof cornerOnStage>
	let measuredAt = Number.NEGATIVE_INFINITY
	const cornerOpacity = createMemo((was: number) => {
		const now = world.ticks()
		if (!box || Math.abs(now - measuredAt) > 60) {
			box = cornerOnStage(hud, cornerBox)
			measuredAt = now
		}
		const at = box
		const under =
			!!at &&
			world.racers.some((racer) => {
				if (!tagged(racer)) return false
				const { body, runner } = racer
				const zoom = world.zoom()
				const half = (runner.sprite.width * RUNNER_SCALE) / 2
				const feet = onScreen(world, body.x, body.feetY)
				const head = onScreen(
					world,
					body.x,
					body.feetY - runner.sprite.height * RUNNER_SCALE,
				)
				return (
					feet.x + half / zoom > at.left &&
					feet.x - half / zoom < at.right &&
					feet.y > at.top &&
					head.y < at.bottom
				)
			})
		const to = under ? CORNER_SEEN_THROUGH : 1
		return Math.abs(to - was) < 0.01 ? to : was + (to - was) * CORNER_FADE
	}, 1)

	return (
		<div ref={hud} style={styles.hud}>
			<div style={styles.topLeft}>
				<Show when={props.corner}>
					<div
						ref={cornerBox}
						style={{ ...styles.corner, opacity: cornerOpacity() }}
					>
						{props.corner}
					</div>
				</Show>
				<div>
					<div style={{ 'font-size': size(18), opacity: 0.8 }}>
						Round {props.number}
						{props.of ? ` of ${props.of}` : ''} · {world.course.name}
					</div>
					<div style={{ 'font-size': size(28), 'margin-top': '4px' }}>
						{left()} of {world.racers.length} running
					</div>
				</div>
			</div>
			{/* On a touch screen: with a keyboard, it's Esc or P. */}
			<Show when={props.onPause && touchScreen()}>
				<div style={styles.topRight}>
					<button
						type="button"
						aria-label="Pause"
						style={styles.pauseButton}
						onClick={() => props.onPause?.()}
					>
						II
					</button>
				</div>
			</Show>

			<Show when={busBehind()}>
				{(metres) => (
					<div
						style={{
							...styles.busWarning,
							'font-size': size(20),
							background: metres() < 125 ? 'var(--bus-red)' : 'var(--ink)',
						}}
					>
						← bus {metres()} m
					</div>
				)}
			</Show>

			<For each={world.racers}>
				{(racer) => (
					<Show when={tagged(racer)}>
						<NameTag
							colour={racer.colour ?? 'var(--ink)'}
							size={13 * (props.textScale ?? 1)}
							style={{
								left: `${tag(racer).x}px`,
								top: `${tag(racer).y}px`,
								// Its arrow's tip on the spot.
								transform: 'translate(-50%, -100%)',
							}}
						>
							{racer.runner.name}
						</NameTag>
					</Show>
				)}
			</For>

			<Show when={props.reactions?.length}>
				<ReactionsLayer
					reactions={props.reactions ?? []}
					now={world.ticks()}
					textScale={props.textScale}
				/>
			</Show>

			<For each={world.popups()}>
				{(popup) => {
					const at = () => onScreen(world, popup.x, popup.y)
					return (
						<div
							style={{
								...styles.popup,
								'font-size': size(22),
								left: `${at().x}px`,
								top: `${at().y - 24 - (world.ticks() - popup.born) * 0.8}px`,
								opacity: 1 - (world.ticks() - popup.born) / POPUP_TICKS,
							}}
						>
							{popup.text}
						</div>
					)
				}}
			</For>
		</div>
	)
}

/** How see-through how to join is, in the corner, with someone under it, and how quickly it fades, a share a tick. */
const CORNER_SEEN_THROUGH = 0.4
const CORNER_FADE = 0.15

/**
 * Where `box` is on the stage, in its own pixels, as `onScreen` gives
 * them: measured on the page, against the HUD it's in, which the stage
 * scales to fit the window.
 */
function cornerOnStage(
	hud: HTMLElement | undefined,
	box: HTMLElement | undefined,
) {
	if (!hud || !box || !hud.offsetWidth) return undefined
	const outer = hud.getBoundingClientRect()
	const inner = box.getBoundingClientRect()
	const scale = outer.width / hud.offsetWidth
	if (!scale) return undefined
	return {
		left: (inner.left - outer.left) / scale,
		right: (inner.right - outer.left) / scale,
		top: (inner.top - outer.top) / scale,
		bottom: (inner.bottom - outer.top) / scale,
	}
}

const styles = {
	hud: {
		position: 'absolute',
		inset: 0,
		// Its own layer: the name tags over their runners, but under the pause
		// menu and anything else over the race.
		isolation: 'isolate',
		'pointer-events': 'none',
		color: 'var(--ink)',
		'font-family': 'var(--font-pixel)',
		'line-height': 1,
	},
	/** The words over the sky: in the course's own ink over a dark one, and only them. */
	topLeft: {
		position: 'absolute',
		top: '16px',
		left: '20px',
		display: 'flex',
		'align-items': 'flex-start',
		gap: '14px',
		color: 'var(--hud-ink, var(--ink))',
		'text-shadow': 'var(--hud-shadow, none)',
	},
	/** How to join, over the sky: its own colours, whatever the course's. */
	corner: {
		margin: '-6px 0 0 -10px',
		color: 'white',
		'text-shadow': 'none',
	},
	topRight: {
		position: 'absolute',
		top: '16px',
		right: '20px',
	},
	pauseButton: {
		'pointer-events': 'auto',
		width: '40px',
		height: '40px',
		padding: '4px 0 0',
		background: 'rgba(255, 255, 255, 0.6)',
		border: '3px solid var(--ink)',
		color: 'var(--ink)',
		'font-size': '18px',
		'line-height': 1,
	},
	busWarning: {
		position: 'absolute',
		left: '12px',
		top: '230px',
		color: 'white',
		padding: '6px 10px',
		'font-size': '20px',
	},
	popup: {
		position: 'absolute',
		transform: 'translateX(-50%)',
		color: 'white',
		'font-size': '22px',
		'text-shadow':
			'2px 0 var(--ink), -2px 0 var(--ink), 0 2px var(--ink), 0 -2px var(--ink)',
		'white-space': 'nowrap',
	},
} satisfies Record<string, JSX.CSSProperties>
