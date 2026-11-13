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
import { PX_PER_M, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { Hat } from '../game/hats'
import { longJumpMetres } from '../game/longJump'
import { medalFor } from '../game/medals'
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
import { markSpecialDone } from '../saved/goals'
import { record, today, topScore } from '../saved/highScores'
import { named } from '../saved/identity'
import { award } from '../saved/medals'
import { reach } from '../saved/progress'
import { play } from '../sfx'
import { ArrowPad } from '../ui/ArrowPad'
import { ControlsCard } from '../ui/ControlsCard'
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
			/** The hat they've still got on from the last course, if any. */
			hat?: Hat
	  }

const points = (score: number) => `${score.toLocaleString('en')} pts`
const metres = (px: number) => `${Math.max(0, Math.round(px / PX_PER_M))} m`

export function Game(props: {
	course: Course
	runner: Playable
	mode: Mode
	/**
	 * On to the next course: in Endless, with the score so far, and the hat
	 * they've got on; practising, the next to practise.
	 */
	onNext: (score: number, hat?: Hat) => void
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
		[
			{
				id: 'solo',
				runner: props.runner,
				controls: anyControls,
				hat: mode.kind === 'endless' ? mode.hat : undefined,
			},
		],
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
			// A medal, for the points: its score goal.
			placing.medal = medalFor(props.course, world.courseScore())
			if (placing.medal)
				placing.newMedal = award(props.course.id, placing.medal)
			// Its special goal, if it has one, done this go.
			const { special } = props.course
			if (
				special?.done({
					finished,
					counts: Object.fromEntries(
						Object.entries(world.bonuses).map(([kind, b]) => [kind, b.count]),
					),
					hat: world.body.hat?.kind,
					longJump: longJumpMetres(world),
					rodeWearing: world.body.rodeWearing,
					toppedTower: world.body.toppedTower,
					germsPopped: world.body.germsPopped,
				})
			) {
				placing.special = true
				placing.newSpecial = markSpecialDone(props.course.id)
			}
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
					choose: () => props.onNext(world.score(), world.body.hat),
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

	const padUnder = createPadUnder()
	const press = (action: Action, down: boolean) => {
		if (down) navigator.vibrate?.(8)
		setTouch(action, down)
	}
	// Gone mid-press, to the menu, say: nothing left held for the next race.
	onCleanup(() => {
		for (const action of ACTIONS) setTouch(action, false)
	})

	return (
		<div style={styles.screen}>
			<Stage style={padUnder() ? styles.raceAbovePad : undefined}>
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
								buttons={!padUnder()}
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
			<Show when={padUnder()}>
				<div style={styles.padRoom}>
					<ArrowPad press={press} />
				</div>
			</Show>
		</div>
	)
}

const ACTIONS: Action[] = ['left', 'right', 'up', 'down']

/**
 * Room under the race for the buttons, at least, on a phone held upright:
 * with the notch and the home bar's room taken off too.
 */
const PAD_ROOM = 220

/**
 * Whether the buttons go under the race, rather than over it: on a touch
 * screen with room under it, as on a phone held upright. Held sideways,
 * the race fills the screen and they're over it.
 */
function createPadUnder() {
	const roomUnder = () =>
		window.innerHeight - (window.innerWidth * VIEW_HEIGHT) / VIEW_WIDTH
	const [room, setRoom] = createSignal(roomUnder())
	const resize = () => setRoom(roomUnder())
	window.addEventListener('resize', resize)
	onCleanup(() => window.removeEventListener('resize', resize))
	return () => touchScreen() && room() >= PAD_ROOM
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
	/** The on-screen buttons, over the race: not if they're under it. */
	buttons: boolean
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
				<div style={styles.score}>{points(world.score())}</div>
			</div>
			{/* On a touch screen, the pause button: with a keyboard, it's Esc or P. */}
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

			<ControlsCard world={world} />

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

			<Show when={props.buttons}>
				<TouchControls />
			</Show>
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
	/** The race, and on a phone held upright, the buttons under it. */
	screen: {
		width: '100%',
		height: '100%',
		display: 'flex',
		'flex-direction': 'column',
	},
	/** As wide as the screen, at the top, out from under the notch. */
	raceAbovePad: {
		flex: 'none',
		height: `calc(100vw * ${VIEW_HEIGHT / VIEW_WIDTH})`,
		'margin-top': 'env(safe-area-inset-top)',
	},
	/** The rest of the screen, under the race: as on a phone in Remote Play. */
	padRoom: {
		flex: 1,
		'min-height': 0,
		display: 'flex',
		'flex-direction': 'column',
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom))',
		'border-top': '4px solid var(--ink)',
		'padding-bottom': 'env(safe-area-inset-bottom)',
	},
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
