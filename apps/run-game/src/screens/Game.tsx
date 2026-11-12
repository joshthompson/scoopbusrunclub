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
import { POPUP_TICKS, onScreen } from '../game/step'
import { type World, createWorld } from '../game/world'
import { type Action, anyControls, setTouch, touchScreen } from '../input'
import {
	type Tally,
	addTallies,
	beatsOwn,
	courseTally,
	endlessRun,
	fetchTable,
	startRun,
	submitScore,
	wouldPlace,
} from '../online/runScores'
import type { Playable } from '../runners/playable'
import { record, today, topScore } from '../saved/highScores'
import { named } from '../saved/identity'
import { reach } from '../saved/progress'
import { play } from '../sfx'
import { Stage } from '../ui/Stage'
import { IdentityEditor } from './IdentityEditor'
import { PauseMenu, SOUND_ITEMS } from './PauseMenu'
import {
	type OnlineOffer,
	type Placing,
	Summary,
	type SummaryAction,
} from './Summary'

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

	// Online, a ticket for this course's table as it starts, and in Endless
	// the run's, the first time it's seen.
	const courseTicket = startRun(props.course.id)
	const endless = mode.kind === 'endless' ? endlessRun(mode.runId) : undefined

	/** A score that could go on an online table, and how sending it's going. */
	const [offer, setOffer] = createSignal<OnlineOffer>()
	/** Still finding out, at the end of a course, whether its scores would go online. */
	const [checkingOnline, setCheckingOnline] = createSignal(false)
	/** Choosing a name and runner, before sending. */
	const [naming, setNaming] = createSignal(false)

	/** Sends them, each with its ticket: where each came, or why not. */
	async function send(scores: OnlineOffer['scores']) {
		setOffer((was) => was && { ...was, state: 'sending' })
		const ranks: Record<string, number> = {}
		let problem: string | undefined
		for (const score of scores) {
			try {
				const ticket = await score.ticket
				if (!ticket) {
					problem = 'Couldn’t reach the high score tables'
					continue
				}
				const result = await submitScore({ ...score, ticket, date: today() })
				if (result.error) problem = result.error
				else if (result.rank !== undefined) ranks[score.table] = result.rank
			} catch {
				// Never left sending: it just didn't go.
				problem = 'Couldn’t reach the high score tables'
			}
		}
		setOffer(
			(was) =>
				was && {
					...was,
					state: Object.keys(ranks).length ? 'sent' : 'failed',
					ranks,
					problem,
				},
		)
	}

	/**
	 * The end of a course, online: whichever of its scores would go on an
	 * online table, offered to be sent. An Endless run that's been sent once
	 * is sent again as it goes on, without asking.
	 */
	async function offerOnline(courseScore: number, tally: Tally) {
		setCheckingOnline(true)
		try {
			await findOffer(courseScore, tally)
		} catch {
			// The tables can't be got at: the scores stay in this browser.
		} finally {
			setCheckingOnline(false)
		}
	}
	async function findOffer(courseScore: number, tally: Tally) {
		const scores: OnlineOffer['scores'] = []
		const candidates: OnlineOffer['scores'] = [
			{
				table: props.course.id,
				label: props.course.name,
				score: courseScore,
				tally,
				ticket: courseTicket,
			},
		]
		if (endless) {
			endless.tally = addTallies(endless.tally, tally)
			const run = {
				table: 'endless',
				label: 'Endless',
				score: world.score(),
				tally: endless.tally,
				ticket: endless.ticket,
			}
			candidates.push(run)
		}
		// With a High Score Name, every score better than their own goes, on
		// its own. Without one yet, they're asked, if it'd make a table.
		const auto = named()
		for (const candidate of candidates) {
			if (!(await candidate.ticket)) continue
			const table = await fetchTable(candidate.table)
			if (!table) continue
			if (
				auto
					? beatsOwn(table, candidate.score)
					: wouldPlace(table, candidate.score)
			)
				scores.push(candidate)
		}
		if (!scores.length) return
		setOffer({ scores, state: 'ready' })
		if (auto) send(scores)
	}

	// The end of a course: its points go in its table, and in Endless the
	// run so far goes in Endless's. Finished, in Endless or practising, the
	// course after it is unlocked for practice.
	const [placing, setPlacing] = createSignal<Placing>()
	createEffect(() => {
		const result = world.result()
		if (!result) return
		untrack(() => {
			offerOnline(world.courseScore(), courseTally(world))
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

	/** Sending a score online, the first time, once there's one to send. */
	const sending = (): SummaryAction[] => {
		const ready = offer()
		if (ready?.state !== 'ready') return []
		// Only ever there the first time: after that, they go on their own.
		return [
			{ label: 'Send high score', choose: () => setNaming(true), send: true },
		]
	}

	// After the rest, so the likeliest next thing is picked to begin with.
	const actions = (): SummaryAction[] => [...runActions(), ...sending()]
	const runActions = (): SummaryAction[] => {
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
			{ label: 'Menu', choose: props.onMenu },
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
		// Typing a name: the editor's keys, not the summary's.
		if (naming()) return
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
							online={offer()}
							checkingOnline={checkingOnline()}
							onPause={() => canPause() && setPaused(true)}
						/>
						<Show when={naming()}>
							<div style={styles.naming}>
								<IdentityEditor
									runner={props.runner}
									saveLabel="Save and send"
									onSave={() => {
										setNaming(false)
										const ready = offer()
										if (ready?.state === 'ready') send(ready.scores)
									}}
									onCancel={() => setNaming(false)}
								/>
							</div>
						</Show>
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
	online: OnlineOffer | undefined
	/** Still finding out whether there's anything to send online. */
	checkingOnline?: boolean
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
			{/* On a touch screen: with a keyboard, it's Esc or P. */}
			<div style={styles.topRight}>
				<Show when={!world.result() && touchScreen()}>
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
				{(popup) => {
					// Where it is on the screen, however far up the camera's
					// looking: up a mountain, or a building.
					const at = () => onScreen(world, popup.x, popup.y)
					return (
						<div
							style={{
								...styles.popup,
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
						online={props.online}
						checkingOnline={props.checkingOnline}
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
	const coarse = touchScreen()
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
	/** Over the summary, choosing a name to send a score under. */
	naming: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'rgba(15, 31, 41, 0.6)',
		'pointer-events': 'auto',
	},
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
