import { For, type JSX, Show, createSignal, onCleanup } from 'solid-js'
import type { Course } from '../courses/types'
import { RaceCanvas, createRaceScene } from '../draw/RaceView'
import { PX_PER_M } from '../game/constants'
import { POPUP_TICKS, onScreen, roundOver } from '../game/step'
import { type Racer, type RacerEntry, createWorld } from '../game/world'
import { PauseMenu, SOUND_ITEMS } from '../screens/PauseMenu'
import { Stage } from '../ui/Stage'

/**
 * One Round: a course raced by every Player at once on the one screen,
 * until only one's left. `onOver` is told the order they came in.
 */
export function Round(props: {
	course: Course
	number: number
	/** How many Rounds there are, if it isn't a Backyard Ultra. */
	of?: number
	racers: RacerEntry[]
	onPause: (paused: boolean) => void
	onOver: (order: Racer[]) => void
	/** The world, for the Room to tell phones how their Player's doing. */
	onWorld: (world: ReturnType<typeof createWorld>) => void
	/** Every tick, once it's moved on: for sending it to remote phones. */
	onTick?: () => void
	onLobby: () => void
	onEnd: () => void
}) {
	const world = createWorld(props.course, props.racers, { round: true })
	props.onWorld(world)
	const scene = createRaceScene(world)

	if (props.onTick) scene.tickers.add(props.onTick)
	let told = false
	scene.tickers.add(() => {
		if (told || !roundOver(world)) return
		told = true
		props.onOver(world.order() ?? world.racers)
	})

	// Pausing is the engine's, as in single player (see `Game`), and only the
	// Host's: Esc or P, or the button.
	const [paused, setPaused] = createSignal(false)
	const pause = (next: boolean) => {
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
}) {
	const { world } = props
	const size = (px: number) => `${px * (props.textScale ?? 1)}px`
	const tag = (racer: Racer) => {
		// Read the tick, so this keeps up: bodies aren't signals.
		world.ticks()
		const height = racer.runner.sprite.height * 2
		return onScreen(world, racer.body.x, racer.body.feetY - height - 8)
	}
	const left = () => {
		world.ticks()
		return world.racers.filter((r) => !r.out).length
	}
	/** How far the bus is behind the last of them, once it's off the screen. */
	const busBehind = () => {
		world.ticks()
		if (world.phase() !== 'running' || world.busX() >= world.camera())
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

	return (
		<div style={styles.hud}>
			<div style={styles.topLeft}>
				<div style={{ 'font-size': size(18), opacity: 0.8 }}>
					Round {props.number}
					{props.of ? ` of ${props.of}` : ''} · {world.course.name}
				</div>
				<div style={{ 'font-size': size(28) }}>
					{left()} of {world.racers.length} running
				</div>
			</div>
			<Show when={props.onPause}>
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
						<div
							style={{
								...styles.tag,
								'font-size': size(13),
								left: `${tag(racer).x}px`,
								top: `${tag(racer).y}px`,
								background: racer.colour,
							}}
						>
							P{racer.number} {racer.runner.name}
						</div>
					</Show>
				)}
			</For>

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

const styles = {
	hud: {
		position: 'absolute',
		inset: 0,
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
		color: 'var(--hud-ink, var(--ink))',
		'text-shadow': 'var(--hud-shadow, none)',
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
		padding: '8px 10px 4px',
		'font-size': '20px',
	},
	tag: {
		position: 'absolute',
		transform: 'translate(-50%, -100%)',
		padding: '3px 5px 0',
		color: 'white',
		'font-size': '13px',
		'white-space': 'nowrap',
		border: '2px solid var(--ink)',
		'text-shadow': '1px 1px 0 var(--ink)',
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
