import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
	untrack,
} from 'solid-js'
import { COURSES } from '../courses'
import type { Course } from '../courses/types'
import { RaceCanvas, createRaceScene } from '../draw/RaceView'
import { PX_PER_M, START_X } from '../game/constants'
import { POPUP_TICKS } from '../game/step'
import { type World, createWorld } from '../game/world'
import { type Action, anyControls, setTouch } from '../input'
import type { Playable } from '../runners/playable'
import { record, today, topScore } from '../saved/highScores'
import { reach } from '../saved/progress'
import { play } from '../sfx'
import { Stage } from '../ui/Stage'
import { PauseMenu, SOUND_ITEMS } from './PauseMenu'
import { type Placing, Summary, type SummaryAction } from './Summary'

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
	course: Course
	runner: Playable
	mode: Mode
	/** On to the next course: in Endless, with the score so far; practising, the next to practise. */
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
		props.course,
		[{ id: 'solo', runner: props.runner, controls: anyControls }],
		{ startScore: mode.kind === 'endless' ? mode.startScore : 0 },
	)
	/** Endless's next course, round to the first again after the last. */
	const nextIndex =
		mode.kind === 'endless' ? (mode.cleared + 1) % COURSES.length : 0
	/** The course after this one, if there is one: unlocked by finishing this one. */
	const index = COURSES.findIndex((course) => course.id === props.course.id)
	const following = index + 1 < COURSES.length ? index + 1 : undefined

	// The end of a course: its points go in its table, and in Endless the
	// run so far goes in Endless's. Finished, in Endless or practising, the
	// course after it is unlocked for practice.
	const [placing, setPlacing] = createSignal<Placing>()
	createEffect(() => {
		const result = world.result()
		if (!result) return
		untrack(() => {
			const finished = result.kind === 'finished'
			const entry = { runner: props.runner.name, date: today() }
			const courseBestBefore = topScore(props.course.id)
			const placing: Placing = { courseBestBefore }
			if (world.courseScore() > 0)
				placing.coursePlace = record(props.course.id, {
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
			}
			if (finished && following !== undefined && reach(following))
				placing.unlocked = COURSES[following].name
			setPlacing(placing)
		})
	})

	const actions = (): SummaryAction[] => {
		const result = world.result()
		if (result?.kind === 'finished' && mode.kind === 'endless')
			return [
				{
					label: `Next: ${COURSES[nextIndex].name}`,
					choose: () => props.onNext(world.score()),
				},
				{ label: 'Stop here', choose: props.onCourses },
			]
		// Practising, finished: on to the next course, now it's unlocked.
		const next =
			result?.kind === 'finished' && following !== undefined
				? [
						{
							label: `Next: ${COURSES[following].name}`,
							choose: () => props.onNext(world.score()),
						},
					]
				: []
		return [
			...next,
			{ label: 'Run again', choose: props.onRetry },
			{ label: 'Change course', choose: props.onCourses },
			{ label: 'To menu', choose: props.onMenu },
		]
	}

	const scene = createRaceScene(world)

	const [paused, setPaused] = createSignal(false)
	/** Over once the result's up: there's nothing left to pause. */
	const canPause = () => !world.result()
	const resume = () => {
		// Jumping with Space to pick "Resume" shouldn't jump on the way back in.
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

	/** Which of the summary's buttons is picked: the first, to begin with. */
	const [picked, setPicked] = createSignal(0)
	const onKey = (event: KeyboardEvent) => {
		if (world.result()) {
			const count = actions().length
			const move = SUMMARY_MOVES[event.key]
			if (move) {
				const next = Math.max(0, Math.min(count - 1, picked() + move))
				if (next !== picked()) {
					play('move')
					setPicked(next)
				}
				event.preventDefault()
			}
			if (event.key === 'Enter') {
				play('select')
				actions()[picked()]?.choose()
			}
			// Esc for the way out: the last of the buttons.
			if (event.key === 'Escape') {
				play('back')
				actions().at(-1)?.choose()
			}
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
							picked={picked()}
							onPick={setPicked}
							placing={placing()}
							onPause={() => canPause() && setPaused(true)}
						/>
						<Show when={paused()}>
							<PauseMenu
								groups={[
									[
										{ label: 'Resume', choose: resume },
										{ label: 'Restart', choose: props.onRetry },
									],
									SOUND_ITEMS,
									[
										{ label: 'Change course', choose: props.onCourses },
										{ label: 'Change runner', choose: props.onQuit },
									],
									[{ label: 'Main menu', choose: props.onMenu }],
								]}
							/>
						</Show>
					</>
				}
			/>
		</Stage>
	)
}

/** The keys that move between the summary's buttons, and which way. */
const SUMMARY_MOVES: Record<string, number> = {
	ArrowLeft: -1,
	ArrowUp: -1,
	a: -1,
	w: -1,
	ArrowRight: 1,
	ArrowDown: 1,
	d: 1,
	s: 1,
}

function Hud(props: {
	world: World
	mode: Mode
	actions: SummaryAction[]
	picked: number
	onPick: (i: number) => void
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
						? `Endless · ${world.course.name}`
						: world.course.parkrun
							? `${world.course.name} parkrun`
							: world.course.name}
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
						picked={props.picked}
						onPick={props.onPick}
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
			// Held a while, a press would bring up the browser's menu and
			// cancel itself: letting go of duck mid-slide, under a branch.
			onContextMenu={(event) => event.preventDefault()}
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
	/** The words over the sky: in the course's own ink over a dark one, and only them. */
	topLeft: {
		position: 'absolute',
		top: '16px',
		left: '20px',
		color: 'var(--hud-ink, var(--ink))',
		'text-shadow': 'var(--hud-shadow, none)',
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
		// No selecting it, or its callout, held down.
		'user-select': 'none',
		'-webkit-user-select': 'none',
		'-webkit-touch-callout': 'none',
	},
} satisfies Record<string, JSX.CSSProperties>
