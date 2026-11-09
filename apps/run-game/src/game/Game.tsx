import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
	untrack,
} from 'solid-js'
import { record, today, topScore } from '../highScores'
import { type Action, anyControls, setTouch } from '../input'
import { LEVELS } from '../levels'
import type { Level } from '../levels/types'
import type { Playable } from '../playable'
import { reach } from '../progress'
import { Stage } from '../ui/Stage'
import { PauseMenu } from './PauseMenu'
import { RaceCanvas, createRaceScene } from './RaceView'
import { type Placing, Summary, type SummaryAction } from './Summary'
import { PX_PER_M, START_X } from './constants'
import { POPUP_TICKS } from './step'
import { type World, createWorld } from './world'

/**
 * - `practice`: one course, on its own
 * - `endless`: every course in turn, round and round, the score carried on
 *   from one to the next, until the bus gets you
 */
export type Mode =
	| { kind: 'practice' }
	| {
			kind: 'endless'
			/** Courses got round already this run. */
			cleared: number
			/** The run's points so far, carried on from the last course. */
			startScore: number
			/** Which run this is, for its one entry in the Endless table. */
			runId: string
	  }

const points = (score: number) => `${score.toLocaleString('en')} pts`
const km = (px: number) => (Math.max(0, px) / PX_PER_M / 1000).toFixed(2)
const metres = (px: number) => `${Math.max(0, Math.round(px / PX_PER_M))} m`

export function Game(props: {
	level: Level
	runner: Playable
	mode: Mode
	/** In Endless, on to the next course, with the score so far. */
	onNext: (score: number) => void
	/** The same again: in Endless, the run from the start. */
	onRetry: () => void
	onQuit: () => void
	/** Back to picking a course. */
	onCourses: () => void
	/** Back to the title screen. */
	onMenu: () => void
}) {
	const { mode } = props
	const world = createWorld(
		props.level,
		[{ id: 'solo', runner: props.runner, controls: anyControls }],
		{ startScore: mode.kind === 'endless' ? mode.startScore : 0 },
	)
	/** Endless's next course, round to the first again after the last. */
	const nextIndex =
		mode.kind === 'endless' ? (mode.cleared + 1) % LEVELS.length : 0

	// The end of a course: its points go in its table, and in Endless the
	// run so far goes in Endless's, and the next course is unlocked for practice.
	const [placing, setPlacing] = createSignal<Placing>()
	createEffect(() => {
		const result = world.result()
		if (!result) return
		untrack(() => {
			const finished = result.kind === 'finished'
			const entry = { runner: props.runner.name, date: today() }
			const courseBestBefore = topScore(props.level.id)
			const placing: Placing = { courseBestBefore }
			if (world.courseScore() > 0)
				placing.coursePlace = record(props.level.id, {
					...entry,
					id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
					score: world.courseScore(),
					metres: world.metres(),
					finished,
				})
			if (mode.kind === 'endless') {
				if (world.score() > 0)
					placing.endlessPlace = record('endless', {
						...entry,
						id: mode.runId,
						score: world.score(),
						courses: mode.cleared + (finished ? 1 : 0),
					})
				if (finished && reach(nextIndex))
					placing.unlocked = LEVELS[nextIndex].name
			}
			setPlacing(placing)
		})
	})

	const actions = (): SummaryAction[] => {
		const result = world.result()
		if (result?.kind === 'finished' && mode.kind === 'endless')
			return [
				{
					label: `Next: ${LEVELS[nextIndex].name} ↵`,
					choose: () => props.onNext(world.score()),
				},
				{ label: 'Stop here', choose: props.onCourses },
			]
		return [
			{ label: 'Run again ↵', choose: props.onRetry },
			{ label: 'To menu', choose: props.onMenu },
		]
	}

	const scene = createRaceScene(world)

	const [paused, setPaused] = createSignal(false)
	/** Over once the result's up: there's nothing left to pause. */
	const canPause = () => !world.result()
	const resume = () => {
		// Jumping with Space to pick "Carry on" shouldn't jump on the way back in.
		world.body.wasUp = true
		setPaused(false)
	}
	// Pausing is the engine's: with a modal up, the scene stops ticking and
	// every sprite stops animating. The modal it draws is only the dimmed
	// backdrop; the menu itself is drawn over it, in the HUD.
	createEffect(() =>
		scene.modal.set(paused() ? document.createElement('span') : undefined),
	)
	// Pause on switching away from the game, so the bus doesn't catch up meanwhile.
	const pauseOnLeave = () => canPause() && setPaused(true)
	window.addEventListener('blur', pauseOnLeave)
	onCleanup(() => window.removeEventListener('blur', pauseOnLeave))

	const onKey = (event: KeyboardEvent) => {
		if (world.result()) {
			if (event.key === 'Enter') actions()[0]?.choose()
			// Esc for the way out: the last of the buttons.
			if (event.key === 'Escape') actions().at(-1)?.choose()
			return
		}
		if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
			if (paused()) resume()
			else setPaused(true)
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<Stage>
			<RaceCanvas
				world={world}
				scene={scene}
				overlay={
					<>
						<Hud
							world={world}
							mode={mode}
							actions={actions()}
							placing={placing()}
							onPause={() => canPause() && setPaused(true)}
						/>
						<Show when={paused()}>
							<PauseMenu
								items={[
									{ label: 'Carry on', choose: resume },
									{ label: 'Restart', choose: props.onRetry },
									{ label: 'Change course', choose: props.onCourses },
									{ label: 'Change runner', choose: props.onQuit },
									{ label: 'Main menu', choose: props.onMenu },
								]}
							/>
						</Show>
					</>
				}
			/>
		</Stage>
	)
}

function Hud(props: {
	world: World
	mode: Mode
	actions: SummaryAction[]
	placing: Placing | undefined
	onPause: () => void
}) {
	const { world } = props
	const runner = () => world.runner
	const busGap = () => world.playerX() - world.busX()
	/** The bus is off the left of the screen, so say how far back it is instead. */
	const busOffScreen = () => world.busX() < world.camera()

	return (
		<div style={styles.hud}>
			<div style={styles.topLeft}>
				<div style={{ 'font-size': '18px', opacity: 0.8 }}>
					{props.mode.kind === 'endless'
						? `Endless · ${world.level.name}`
						: `${world.level.name} parkrun`}
				</div>
				<div style={{ 'font-size': '32px' }}>
					{km(Math.min(world.terrain.length, world.playerX() - START_X))}
					<span style={{ 'font-size': '18px' }}>
						{' '}
						/ {km(world.terrain.length)} km
					</span>
				</div>
				<div style={styles.score}>{points(world.score())}</div>
			</div>
			<div style={styles.topRight}>
				<Show when={!world.result()}>
					<button
						type="button"
						aria-label="Pause"
						style={styles.pauseButton}
						onClick={props.onPause}
					>
						II
					</button>
				</Show>
			</div>

			<Show when={world.phase() === 'running' && busOffScreen()}>
				<div
					style={{
						...styles.busWarning,
						background: busGap() < 500 ? 'var(--bus-red)' : 'var(--ink)',
					}}
				>
					← bus {metres(busGap())}
				</div>
			</Show>

			<For each={world.popups()}>
				{(popup) => (
					<div
						style={{
							...styles.popup,
							left: `${popup.x - world.camera()}px`,
							top: `${popup.y - 24 - (world.ticks() - popup.born) * 0.8}px`,
							opacity: 1 - (world.ticks() - popup.born) / POPUP_TICKS,
						}}
					>
						{popup.text}
					</div>
				)}
			</For>

			<Show when={world.phase() === 'countdown'}>
				<div style={styles.hint}>→ run · ↑ jump · ↓ duck</div>
			</Show>

			<Show when={world.result()}>
				{(result) => (
					<Summary
						world={world}
						mode={props.mode}
						result={result()}
						placing={props.placing}
						actions={props.actions}
					/>
				)}
			</Show>

			<TouchControls />
		</div>
	)
}

/** On-screen buttons, on touch screens only. */
function TouchControls() {
	const coarse = window.matchMedia('(pointer: coarse)').matches
	const button = (action: Action, label: string, place: JSX.CSSProperties) => (
		<button
			type="button"
			style={{ ...styles.touchButton, ...place }}
			onPointerDown={(event) => {
				event.currentTarget.setPointerCapture(event.pointerId)
				setTouch(action, true)
			}}
			onPointerUp={() => setTouch(action, false)}
			onPointerCancel={() => setTouch(action, false)}
		>
			{label}
		</button>
	)
	return (
		<Show when={coarse}>
			{button('left', '←', { left: '16px' })}
			{button('right', '→', { left: '112px' })}
			{button('down', '↓', { right: '112px' })}
			{button('up', '↑', { right: '16px' })}
		</Show>
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
	topLeft: {
		position: 'absolute',
		top: '16px',
		left: '20px',
	},
	score: {
		'margin-top': '6px',
		'font-size': '22px',
	},
	topRight: {
		position: 'absolute',
		top: '16px',
		right: '20px',
		display: 'flex',
		'align-items': 'center',
		gap: '14px',
		'font-size': '32px',
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
	popup: {
		position: 'absolute',
		transform: 'translateX(-50%)',
		color: 'white',
		'font-size': '22px',
		'text-shadow':
			'2px 0 var(--ink), -2px 0 var(--ink), 0 2px var(--ink), 0 -2px var(--ink)',
		'white-space': 'nowrap',
	},
	hint: {
		position: 'absolute',
		bottom: '20px',
		left: 0,
		right: 0,
		'text-align': 'center',
		color: 'white',
		'font-size': '20px',
		'text-shadow': '2px 2px 0 var(--ink)',
	},
	touchButton: {
		position: 'absolute',
		bottom: '16px',
		width: '80px',
		height: '80px',
		'pointer-events': 'auto',
		background: 'rgba(255, 255, 255, 0.55)',
		border: '3px solid var(--ink)',
		color: 'var(--ink)',
		'font-size': '36px',
		'touch-action': 'none',
	},
} satisfies Record<string, JSX.CSSProperties>
