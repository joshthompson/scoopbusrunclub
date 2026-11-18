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
import { ENDLESS, endlessMedalFor } from '../courses/endless'
import type { Course } from '../courses/types'
import { RaceCanvas, createRaceScene } from '../draw/RaceView'
import { COLLECTABLES } from '../game/collectables'
import { PX_PER_M, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import { stillFollowed } from '../game/followers'
import type { Hat } from '../game/hats'
import { longJumpMetres } from '../game/longJump'
import { type Medal, medalFor } from '../game/medals'
import { POPUP_TICKS, onScreen, stepWorld } from '../game/step'
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
import { BONNIE_BOTTLE, DERI, DET_MUNCH, unlockable } from '../runners/bonus'
import type { Playable } from '../runners/playable'
import { hasCollected } from '../saved/collected'
import { courseFinished, markFinished } from '../saved/finished'
import { markSpecialDone } from '../saved/goals'
import { record, today, topScore } from '../saved/highScores'
import { named } from '../saved/identity'
import { award } from '../saved/medals'
import { reach } from '../saved/progress'
import { unlockRunner } from '../saved/unlocked'
import { play } from '../sfx'
import { ArrowPad } from '../ui/ArrowPad'
import {
	ControlKeys,
	RaceStartOverlay,
	createRaceStart,
	startPrompt,
} from '../ui/RaceStart'
import { Stage } from '../ui/Stage'
import { IdentityEditor } from './IdentityEditor'
import { PauseMenu, SOUND_ITEMS } from './PauseMenu'
import {
	type OnlineOffer,
	type Placing,
	Summary,
	type SummaryAction,
} from './Summary'
import { UnlockReveal } from './UnlockReveal'

/**
 * - `practice`: one course, on its own
 * - `endless`: every course in turn, the score carried on from one to the
 *   next, until the bus gets you, or the last of them's done: then it's
 *   over, and there's another go to have. No summary between courses: it
 *   goes dark, and on into the next. One, at the end, for the whole run.
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
			/** The run so far, for its summary at the end. */
			run: EndlessRun
	  }

/**
 * An Endless run so far, carried on from course to course for its one
 * summary at the end: each course's points, and the runners unlocked on
 * the way, by id, to be shown off then.
 */
export interface EndlessRun {
	courses: EndlessCourse[]
	unlocked: string[]
}

/**
 * A course in an Endless run, for its breakdown at the end: its points,
 * the medal they got, and whether they were its best yet (and its best
 * before, if they weren't).
 */
export interface EndlessCourse {
	name: string
	score: number
	medal?: Medal
	newBest: boolean
	bestBefore: number
}

const points = (score: number) => `${score.toLocaleString('en')} pts`
const metres = (px: number) => `${Math.max(0, Math.round(px / PX_PER_M))} m`

export function Game(props: {
	course: Course
	runner: Playable
	mode: Mode
	/**
	 * On to the next course: in Endless, with the score so far, the hat
	 * they've got on, and the run so far; practising, the next to practise.
	 */
	onNext: (score: number, hat?: Hat, run?: EndlessRun) => void
	/** The same again: in Endless, the run from the start. */
	onRetry: () => void
	onQuit: () => void
	/** Back to picking a course. */
	onCourses: () => void
	/** Back to the title screen. */
	onMenu: () => void
	/**
	 * A restart: straight into the countdown once it's ready, rather than
	 * its start screen first.
	 */
	restart?: boolean
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
	/** In Endless, whether this is the last course: done, the run's over. */
	const lastCourse =
		mode.kind === 'endless' && mode.cleared + 1 >= COURSES.length
	/**
	 * In Endless, finished, and not the last course: moving on, with no
	 * summary, the run so far to carry on with; and, after a moment to see
	 * the finish, going dark, and then on into the next.
	 */
	const [passing, setPassing] = createSignal<EndlessRun>()
	/** At the end of an Endless run, its table of each course's points, open. */
	const [breakdown, setBreakdown] = createSignal(false)
	const [fading, setFading] = createSignal(false)
	const timers: ReturnType<typeof setTimeout>[] = []
	onCleanup(() => {
		for (const timer of timers) clearTimeout(timer)
	})
	const passOn = (run: EndlessRun) => {
		setPassing(run)
		timers.push(
			setTimeout(() => setFading(true), FINISH_BEAT),
			setTimeout(
				() => props.onNext(world.score(), world.body.hat, run),
				FINISH_BEAT + FADE_MS,
			),
		)
	}
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
	/**
	 * The new runners already shown off, at the end: each, one at a time, on
	 * its own screen before the summary (see `UnlockReveal`).
	 */
	const [revealed, setRevealed] = createSignal(0)
	/** The new runner being shown off, if there's one still to show. */
	const unlock = () => {
		const runners = world.result() ? (placing()?.newRunners ?? []) : []
		const runner = runners[revealed()]
		return runner
			? { runner, number: revealed() + 1, count: runners.length }
			: undefined
	}
	const nextUnlock = () => {
		play('select')
		setRevealed((n) => n + 1)
	}
	createEffect(() => {
		const result = world.result()
		if (!result) return
		untrack(() => {
			offerOnline(world.courseScore(), courseTally(world))
			const finished = result.kind === 'finished'
			const entry = { runner: props.runner.name, date: today() }
			const courseBestBefore = topScore(props.course.id)
			const placing: Placing = { courseBestBefore, newRunners: [] }
			// A bonus runner unlocked, finding them on the way: shown off.
			const found = world.body.unlocked && unlockable(world.body.unlocked)
			if (found) placing.newRunners.push(found)
			// Finished: and with that, every course finished, Deri's theirs.
			if (finished) {
				markFinished(props.course.id)
				if (
					COURSES.every((course) => courseFinished(course.id)) &&
					unlockRunner(DERI.id)
				)
					placing.newRunners.push(DERI)
			}
			if (world.courseScore() > 0)
				placing.coursePlace = record(props.course.id, {
					...entry,
					id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
					score: world.courseScore(),
					metres: world.metres(),
					finished,
				})
			if (mode.kind === 'endless') {
				const cleared = mode.cleared + (finished ? 1 : 0)
				if (world.score() > 0)
					placing.endlessPlace = record('endless', {
						...entry,
						id: mode.runId,
						score: world.score(),
						courses: cleared,
					})
				// Endless's own goals: a medal for how many courses this run's
				// got through; gold, every one of them, and its bonus runner.
				placing.endless = { cleared, medal: endlessMedalFor(cleared) }
				const medal = placing.endless.medal
				if (medal) placing.endless.newMedal = award(ENDLESS, medal)
				if (medal === 'gold' && unlockRunner(BONNIE_BOTTLE.id))
					placing.newRunners.push(BONNIE_BOTTLE)
			}
			// Every collectable there is, had: Det. Munch is theirs.
			if (COLLECTABLES.every(hasCollected) && unlockRunner(DET_MUNCH.id))
				placing.newRunners.push(DET_MUNCH)
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
					foundSecret: world.body.foundSecret,
					metFound: world.body.metFound,
					brokeBridge: world.body.brokeBridge,
					ghost: world.body.ghost,
					crocodiles: world.body.crocBest,
					followerHome: finished && stillFollowed(world, world.racers[0]),
				})
			) {
				placing.special = true
				placing.newSpecial = markSpecialDone(props.course.id)
				// And a bonus runner, if it unlocks one: the first time, shown off.
				const earned = special.unlocks && unlockable(special.unlocks)
				if (earned && unlockRunner(earned.id)) placing.newRunners.push(earned)
			}
			if (mode.kind === 'endless') {
				// The run so far, this course too.
				const run: EndlessRun = {
					courses: [
						...mode.run.courses,
						{
							name: props.course.name,
							score: world.courseScore(),
							medal: placing.medal,
							newBest: placing.coursePlace === 0,
							bestBefore: placing.courseBestBefore,
						},
					],
					unlocked: [
						...mode.run.unlocked,
						...placing.newRunners.map((runner) => runner.id),
					],
				}
				// Finished, with more to go: straight on, no summary.
				if (finished && !lastCourse) {
					passOn(run)
					return
				}
				// Over: the whole run's summary, everyone unlocked on the way
				// shown off first.
				placing.run = run
				placing.newRunners = run.unlocked.flatMap((id) => {
					const runner = unlockable(id)
					return runner ? [runner] : []
				})
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
		// In Endless, the run's over, however it ended: another go; or a
		// look at each course's points first.
		if (mode.kind === 'endless')
			return [
				{ label: 'Go again', choose: props.onRetry },
				{
					label: breakdown() ? 'Hide course scores' : 'Course scores',
					choose: () => setBreakdown((open) => !open),
				},
				{ label: 'Change course', choose: props.onCourses },
				{ label: 'Menu', choose: props.onMenu },
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

	// Held, the world not moving on, while it's got ready and on its start
	// screen; the Scene ticking all the same, so everything on it is placed.
	const scene = createRaceScene(world, (w) => {
		if (!start.holding()) stepWorld(w)
	})
	// Covered while it's got ready, then its start screen, the first time:
	// held till they press any key but the pause menu's. Their jump doesn't
	// jump at the start.
	const start = createRaceStart({
		world,
		scene,
		intro: !props.restart,
		starter: anyControls,
		startsOn: (event) => !paused() && !PAUSE_KEYS.includes(event.key),
		onGo: () => {
			world.body.wasUp = true
		},
	})

	const [paused, setPaused] = createSignal(false)
	/**
	 * On its start screen, or under way; not while it's got ready, and over
	 * once the result's up: there's nothing to pause.
	 */
	const canPause = () => !world.result() && start.stage() !== 'loading'
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
	const pauseOnLeave = () => canPause() && !start.holding() && setPaused(true)
	window.addEventListener('blur', pauseOnLeave)
	onCleanup(() => window.removeEventListener('blur', pauseOnLeave))

	/** Which of the summary's buttons is picked: the first, to begin with. */
	const [picked, setPicked] = createSignal(0)
	const onKey = (event: KeyboardEvent) => {
		// Typing a name: the editor's keys, not the summary's.
		if (naming()) return
		// A new runner shown off: Enter (or Space, or Esc) for the next, or the summary.
		if (unlock()) {
			if (
				!event.repeat &&
				(event.key === 'Enter' || event.key === ' ' || event.key === 'Escape')
			) {
				event.preventDefault()
				nextUnlock()
			}
			return
		}
		// Moving on to the next course: nothing to choose.
		if (passing()) return
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
		if (PAUSE_KEYS.includes(event.key)) {
			if (paused()) resume()
			else if (canPause()) setPaused(true)
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
								unlock={unlock()}
								onContinue={nextUnlock}
								online={offer()}
								checkingOnline={checkingOnline()}
								onPause={() => canPause() && setPaused(true)}
								buttons={!padUnder()}
								passing={!!passing()}
								fading={fading()}
								breakdown={breakdown()}
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
							<RaceStartOverlay
								start={start}
								title={
									props.course.parkrun
										? `${props.course.name} parkrun`
										: props.course.name
								}
								kicker={mode.kind === 'endless' ? 'Endless' : undefined}
								prompt={startPrompt()}
							>
								<ControlKeys />
							</RaceStartOverlay>
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
 * In Endless, between courses: how long the finish is there to see before
 * it goes dark, and how long going dark takes, in ms. The next course
 * comes up out of the dark as it's ready (see `createRaceStart`).
 */
const FINISH_BEAT = 1400
const FADE_MS = 700

/** The keys for the pause menu: not for starting the race, on its start screen. */
const PAUSE_KEYS = ['Escape', 'p', 'P']

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
	/** A new runner to show off before the summary, if there's one still to show. */
	unlock?: { runner: Playable; number: number; count: number }
	/** On from it: to the next, or the summary. */
	onContinue: () => void
	online: OnlineOffer | undefined
	/** Still finding out whether there's anything to send online. */
	checkingOnline?: boolean
	onPause: () => void
	/** The on-screen buttons, over the race: not if they're under it. */
	buttons: boolean
	/** In Endless, finished, moving on to the next course: no summary. */
	passing?: boolean
	/** And going dark, on the way. */
	fading?: boolean
	/** At the end of an Endless run, its table of each course's points, open. */
	breakdown?: boolean
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
							{/* Its first line; any under it, smaller: how far along a count is. */}
							{popup.text.split('\n')[0]}
							<For each={popup.text.split('\n').slice(1)}>
								{(line) => <div style={styles.popupUnder}>{line}</div>}
							</For>
						</div>
					)
				}}
			</For>

			{/* In Endless, on to the next course: dark, and in. */}
			<div
				style={{
					...styles.fade,
					opacity: props.fading ? 1 : 0,
					transition: `opacity ${FADE_MS}ms ease-in`,
				}}
			/>

			<Show when={!props.passing && world.result()}>
				{(result) => (
					<Show
						when={props.unlock}
						keyed
						fallback={
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
								breakdown={props.breakdown}
							/>
						}
					>
						{(unlock) => (
							<UnlockReveal
								runner={unlock.runner}
								number={unlock.number}
								count={unlock.count}
								onContinue={props.onContinue}
							/>
						)}
					</Show>
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
	/** Dark over everything, between Endless's courses: as dark as the next one's cover, as it's got ready. */
	fade: {
		position: 'absolute',
		inset: 0,
		background: 'var(--ink)',
		'pointer-events': 'none',
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
	/** A popup's line under its first: how far along a count is, "3/20". */
	popupUnder: {
		'font-size': '14px',
		'text-align': 'center',
		'margin-top': '-2px',
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
