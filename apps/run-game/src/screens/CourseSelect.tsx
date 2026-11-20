import busEmoji from '@/assets/emoji/bus.png'
import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'
import { COURSES } from '../courses'
import { levelCollectables } from '../courses/collectables'
import { ENDLESS, ENDLESS_GOALS } from '../courses/endless'
import type { Course } from '../courses/types'
import {
	COLLECTABLES_ICON,
	type GoalIcon,
	GoalIconArt,
	SpecialGoalArt,
} from '../draw/art/goals'
import { HatPicture, hatArt } from '../draw/art/hats'
import { MedalArt } from '../draw/art/medal'
import { StarArt } from '../draw/art/star'
import { courseHat } from '../game/collectables'
import { MEDALS, type Medal, medalScores, nextMedal } from '../game/medals'
import { touchScreen } from '../input'
import { MINIGAMES, type Minigame, botsFor } from '../minigames'
import type { Playable } from '../runners/playable'
import { hasCollected } from '../saved/collected'
import { specialDone } from '../saved/goals'
import { type TableId, table, topScore } from '../saved/highScores'
import { bestMedal } from '../saved/medals'
import { isUnlocked } from '../saved/progress'
import { play } from '../sfx'
import { CoursePreview } from '../ui/CoursePreview'
import { OUTLINED, OUTLINED_FLAT, Panel } from '../ui/Menu'
import { MinigamePreview } from '../ui/MinigamePreview'
import { onHover } from '../ui/hover'

/** What's picked: Endless, a course's id, to practise it, or `minigame:` a minigame's. */
export type RunChoice = string

/** The minigame a choice is, if it's one. */
const minigameOf = (choice: RunChoice) =>
	MINIGAMES.find((m) => `minigame:${m.id}` === choice)

/**
 * Whether each course's blurb is shown under its name: hidden for now, the
 * preview taking its room. Every course still has one (`Course['blurb']`).
 */
const SHOW_BLURBS = false

/** The preview's least height, and its border, top and bottom, round that. */
const PREVIEW_LEAST = 110
const PREVIEW_BORDER = 6

/** Everything in the list, top to bottom: Endless, every course, then every minigame. */
const CHOICES: RunChoice[] = [
	'endless',
	...COURSES.map((course) => course.id),
	...MINIGAMES.map((m) => `minigame:${m.id}`),
]

/**
 * Endless, at the top of the list and picked to begin with, then every course
 * under it to practise on its own: each locked, if courses are (see
 * `progress`), until Endless has got as far as it. Whichever's picked is
 * shown off on the right.
 */
export function CourseSelect(props: {
	runner: Playable
	selected: RunChoice
	onSelect: (choice: RunChoice) => void
	onEndless: () => void
	onPractice: (course: Course) => void
	/** A minigame, played on your own against bots. */
	onMinigame: (minigame: Minigame) => void
	onBack: () => void
}) {
	const index = () => Math.max(0, CHOICES.indexOf(props.selected))
	const picked = () => COURSES.find((course) => course.id === props.selected)
	const pickedGame = () => minigameOf(props.selected)

	/** How tall the preview can be, measured off the room it's been left. */
	const [windowHeight, setWindowHeight] = createSignal(165)
	let observer: ResizeObserver | undefined
	const measure = (el: HTMLDivElement) => {
		observer = new ResizeObserver(() =>
			setWindowHeight(
				Math.max(PREVIEW_LEAST, Math.floor(el.clientHeight - PREVIEW_BORDER)),
			),
		)
		observer.observe(el)
	}
	onCleanup(() => observer?.disconnect())
	const open = (choice: RunChoice) =>
		choice === 'endless' ||
		// Minigames are always there to play.
		!!minigameOf(choice) ||
		isUnlocked(COURSES.findIndex((course) => course.id === choice))

	const choose = (choice: RunChoice) => {
		if (!open(choice)) return play('back')
		play('select')
		const practise = COURSES.find((course) => course.id === choice)
		const game = minigameOf(choice)
		if (practise) props.onPractice(practise)
		else if (game) props.onMinigame(game)
		else props.onEndless()
	}
	const select = (choice: RunChoice) => {
		if (choice === props.selected) return
		play('move')
		props.onSelect(choice)
	}
	/**
	 * A row clicked: with a mouse, that one's run. Tapped, on a touch screen,
	 * it's only picked, to see it first; tapped again, or Run, and it's run.
	 */
	const tap = (choice: RunChoice) => {
		if (touchScreen() && choice !== props.selected) select(choice)
		else choose(choice)
	}
	const back = () => {
		play('back')
		props.onBack()
	}

	const rows: HTMLElement[] = []
	// Keep the picked row in view as the keyboard moves down a long list.
	createEffect(() => rows[index()]?.scrollIntoView({ block: 'nearest' }))

	const onKey = (event: KeyboardEvent) => {
		const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
		const move = { ArrowUp: -1, w: -1, ArrowDown: 1, s: 1 }[key]
		if (move) {
			event.preventDefault()
			// Round from the bottom to the top, and back.
			const next = (index() + move + CHOICES.length) % CHOICES.length
			select(CHOICES[next])
		}
		if (key === 'Enter' || key === ' ') {
			event.preventDefault()
			choose(props.selected)
		}
		if (key === 'Escape') back()
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	/**
	 * How many of a course's own collectables have been had, of how many
	 * it has: only those not on a course before it (see `levelCollectables`).
	 */
	const found = (course: Course) => {
		const all = levelCollectables(course)
		return { had: all.filter(hasCollected).length, of: all.length }
	}

	/** Whether every one of a course's collectables has been had. */
	const allFound = (course: Course) => {
		const { had, of } = found(course)
		return had === of
	}

	/**
	 * Whether a course is all done: its gold medal, every one of its
	 * collectables, and its special goal, if it has one.
	 */
	const allDone = (course: Course) =>
		bestMedal(course.id) === 'gold' &&
		allFound(course) &&
		(!course.special || specialDone(course.id))

	/**
	 * A course's score goal, said: the medal got, and the points the next
	 * one up takes, if there's one.
	 */
	const scoreGoal = (course: Course) => {
		const best = bestMedal(course.id)
		const next = nextMedal(best)
		const got = best ? `${MEDAL_NAMES[best]} score!` : 'No medal yet'
		if (!next) return { got }
		const points = medalScores(course)[next].toLocaleString('en')
		return { got, next: `(${points} for ${MEDAL_NAMES[next]})` }
	}

	/** The course before one, which has to be finished to unlock it. */
	const before = (course: Course) => COURSES[course.number - 2]?.name

	const row = (choice: RunChoice, i: number, content: JSX.Element) => (
		<button
			type="button"
			ref={(el) => {
				rows[i] = el
			}}
			style={{
				...styles.row,
				...(choice === 'endless' ? styles.endlessRow : {}),
				...(open(choice) ? {} : styles.locked),
				...(props.selected === choice ? styles.rowSelected : {}),
			}}
			onMouseEnter={onHover(() => !touchScreen() && select(choice))}
			onClick={() => tap(choice)}
		>
			{content}
		</button>
	)

	return (
		<div style={styles.screen}>
			<div style={styles.top}>
				<button type="button" style={styles.back} onClick={back}>
					← Runners
				</button>
				<div style={styles.title}>Choose your run</div>
			</div>

			<div class="flush-scrollbar" style={styles.list}>
				{row(
					'endless',
					0,
					<>
						<img
							src={busEmoji}
							alt=""
							class="pixelated"
							style={styles.busIcon}
						/>
						<span style={styles.rowText}>
							<span style={{ ...styles.rowName, 'font-size': '24px' }}>
								Endless
							</span>
							<span style={styles.rowDetail}>
								{topScore('endless')
									? `Best ${topScore('endless').toLocaleString('en')} pts`
									: 'Every course in turn'}
							</span>
						</span>
						{/* Its best medal, as a course's is. */}
						<span style={styles.rowMedal}>
							<MedalArt medal={bestMedal(ENDLESS)} scale={1.5} />
						</span>
					</>,
				)}
				<div style={styles.section}>Courses</div>
				<For each={COURSES}>
					{(course, i) =>
						row(
							course.id,
							i() + 1,
							<>
								<span style={styles.number}>{course.number}</span>
								<span style={styles.rowText}>
									<span
										ref={(el) => fitRowName(el, rowNameSize(course.name))}
										style={styles.rowName}
									>
										{course.name}
									</span>
									<span style={styles.rowDetail}>
										{!open(course.id)
											? 'Locked'
											: topScore(course.id)
												? `Best ${topScore(course.id).toLocaleString('en')} pts`
												: 'No runs yet'}
									</span>
								</span>
								{/* Its best medal, at the row's end: empty till there's
								    one, and a star, once it's all done. */}
								<Show when={open(course.id)}>
									<span style={styles.rowMedal}>
										<Show
											when={allDone(course)}
											fallback={
												<MedalArt medal={bestMedal(course.id)} scale={1.5} />
											}
										>
											<StarArt scale={1.5} />
										</Show>
									</span>
								</Show>
							</>,
						)
					}
				</For>
				<div style={styles.section}>Minigames</div>
				<For each={MINIGAMES}>
					{(game, i) =>
						row(
							`minigame:${game.id}`,
							COURSES.length + 1 + i(),
							<>
								<span style={styles.number}>★</span>
								<span style={styles.rowText}>
									<span
										ref={(el) => fitRowName(el, rowNameSize(game.name))}
										style={styles.rowName}
									>
										{game.name}
									</span>
									<span style={styles.rowDetail}>
										You and {botsFor(game)} bots
									</span>
								</span>
							</>,
						)
					}
				</For>
			</div>

			<Panel style={styles.preview}>
				<div ref={measure} style={styles.window}>
					{/* Rebuilt for each: a whole other course. None of one that's
					    still locked: no seeing it till it's been got to. */}
					<Show
						when={
							open(props.selected) && !pickedGame() && (picked() ?? COURSES[0])
						}
						keyed
					>
						{(course) => (
							<CoursePreview
								course={course}
								width={538}
								height={windowHeight()}
							/>
						)}
					</Show>
					{/* A minigame: the whole of its arena, still, played by bots. */}
					<Show when={pickedGame()} keyed>
						{(game) => (
							<MinigamePreview
								minigame={game}
								width={538}
								height={windowHeight()}
							/>
						)}
					</Show>
					<Show
						when={open(props.selected)}
						fallback={
							<div style={styles.lock}>
								<span>Locked</span>
								<span style={styles.lockedNote}>
									Finish {before(picked() as Course)} to unlock{' '}
									{(picked() as Course).name}
								</span>
							</div>
						}
					>
						<button
							type="button"
							style={styles.go}
							onClick={() => choose(props.selected)}
						>
							{touchScreen() ? 'Run ▶' : 'Enter to run!'}
						</button>
					</Show>
				</div>

				<div style={styles.heading}>
					<span style={styles.name}>
						{picked()?.name ?? pickedGame()?.name ?? 'Endless'}
					</span>
					<span style={styles.headingDetail}>
						<Show
							when={picked()}
							fallback={
								pickedGame()
									? 'Minigame'
									: `All ${COURSES.length} courses, in one go`
							}
						>
							{(course) => <>Course {course().number}</>}
						</Show>
					</span>
				</div>
				<Show when={SHOW_BLURBS}>
					<div style={styles.blurb}>
						{picked()?.blurb ??
							'Every course in turn, your points carried on, until the bus gets you.'}
					</div>
				</Show>
				{/* Down one side, its medals, each and what it takes, in colour
				    once got, and how many of its collectables have been found;
				    down the other, the top scores on it. */}
				<Show
					when={pickedGame()}
					fallback={
						<div style={styles.lower}>
							<Show
								when={picked()}
								fallback={
									// Endless's three goals, each its medal's: in colour once
									// it's got.
									<div style={styles.stats}>
										<div style={styles.scoresLabel}>Your goals</div>
										<For each={ENDLESS_GOALS}>
											{({ medal, goal }) => (
												<div style={styles.goalLine}>
													<span style={styles.goalText}>{goal}</span>
													<span style={styles.goalIcon}>
														<MedalArt
															medal={
																got(bestMedal(ENDLESS), medal)
																	? medal
																	: undefined
															}
															scale={1}
														/>
													</span>
												</div>
											)}
										</For>
									</div>
								}
							>
								{(course) => (
									<div style={styles.stats}>
										<div style={styles.scoresLabel}>Your goals</div>
										{/* The medal it's got, and the points for the next. */}
										<div style={styles.goalLine}>
											<span style={styles.goalText}>
												{scoreGoal(course()).got}{' '}
												<span style={styles.nextGoal}>
													{scoreGoal(course()).next}
												</span>
											</span>
											<span style={styles.goalIcon}>
												<MedalArt medal={bestMedal(course().id)} scale={1} />
											</span>
										</div>
										{/* Its collectables found, and its own hat: a shadow of it
								    till they all are. */}
										<div style={styles.goalLine}>
											<span style={styles.goalText}>
												{found(course()).had}/{found(course()).of} Collectables
											</span>
											<span style={styles.goalIcon}>
												<GoalHat
													course={course()}
													done={allFound(course())}
													size={GOAL_ICON}
												/>
											</span>
										</div>
										{/* Its special goal, if it has one, and its picture: a
								    shadow of it till it's done. */}
										<Show when={course().special}>
											{(special) => (
												<div style={styles.goalLine}>
													<span style={styles.goalText}>{special().goal}</span>
													<span style={styles.goalIcon}>
														<SpecialGoalArt
															course={course().id}
															done={specialDone(course().id)}
															size={GOAL_ICON}
														/>
													</span>
												</div>
											)}
										</Show>
									</div>
								)}
							</Show>
							<TopScores id={props.selected} />
						</div>
					}
				>
					{/* A minigame: how it's played, and who against. */}
					{(game) => (
						<div style={styles.lower}>
							<div style={styles.stats}>
								<div style={styles.scoresLabel}>How to play</div>
								<div style={styles.goalText}>{game().blurb}</div>
								<div style={styles.nextGoal}>
									You against {botsFor(game())} bots
								</div>
							</div>
						</div>
					)}
				</Show>
			</Panel>

			<div style={styles.hint}>
				{touchScreen()
					? 'Tap a run to see it · tap Run ▶ to start'
					: '↑ ↓ to pick · Enter to run · Esc to change runner'}
			</div>
		</div>
	)
}

const MEDAL_NAMES: Record<Medal, string> = {
	bronze: 'Bronze',
	silver: 'Silver',
	gold: 'Gold',
}

/** The top three in a table, with a word if it's empty. */
/** How many of the top scores are shown: room's kept for all of them. */
const SHOWN_SCORES = 3

/**
 * The top few scores, always in room for all of them, the rows there are no
 * scores for kept but not shown: so the panel's laid out the same, and the
 * preview's the same height, for every course.
 */
function TopScores(props: { id: TableId }) {
	const rows = () =>
		Array.from({ length: SHOWN_SCORES }, (_, i) => table(props.id)[i])
	return (
		<div style={styles.scores}>
			<div style={styles.scoresLabel}>Your Top scores</div>
			<For each={rows()}>
				{(entry, i) => (
					<div
						style={{
							...styles.score,
							visibility: entry ? 'visible' : 'hidden',
						}}
					>
						<span style={{ width: '18px' }}>{i() + 1}</span>
						<span style={styles.scoreRunner}>{entry?.runner ?? '-'}</span>
						<span style={styles.scorePoints}>
							{entry?.score.toLocaleString('en') ?? '0'}
						</span>
					</div>
				)}
			</For>
			<Show when={!table(props.id).length}>
				<div style={styles.noScores}>No runs yet</div>
			</Show>
		</div>
	)
}

/**
 * A course's name in the list, on its one line: smaller if it's long, so
 * it all fits ("Great Wall of China"), rather than being cut off.
 */
const rowNameSize = (name: string) => (name.length > 13 ? 16 : 20)

/** The smallest a course's name goes in the list, to fit. */
const ROW_NAME_MIN = 12

/**
 * A course's name, in the list, at `size`: and a pixel smaller at a time,
 * if that's too wide for its row, till it fits. Fitted again whenever its
 * row's room changes (a medal in at its end), and once the font's in, as
 * the font's own width is what counts: one browser's draws it a little
 * wider than another's.
 */
function fitRowName(el: HTMLElement, size: number) {
	const fit = () => {
		let px = size
		el.style.fontSize = `${px}px`
		while (el.scrollWidth > el.clientWidth && px > ROW_NAME_MIN)
			el.style.fontSize = `${--px}px`
	}
	const watch = new ResizeObserver(fit)
	watch.observe(el)
	document.fonts.ready.then(fit)
	onCleanup(() => watch.disconnect())
}

/** Whether `best`, a medal got, is `medal` or better. */
const got = (best: Medal | undefined, medal: Medal) =>
	!!best && MEDALS.indexOf(best) >= MEDALS.indexOf(medal)

/** How big a course's number square is, in the list: Endless's bus as wide. */
const NUMBER_SIZE = 28

/** How big each goal's picture is, at most, beside it. */
const GOAL_ICON = 16

const styles = {
	screen: {
		position: 'absolute',
		inset: 0,
	},
	top: {
		position: 'absolute',
		left: '24px',
		right: '24px',
		top: '18px',
		height: '44px',
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
	},
	back: {
		position: 'absolute',
		left: 0,
		padding: '6px 12px',
		background: 'var(--ink)',
		color: 'white',
		border: '3px solid white',
		'font-size': '18px',
	},
	title: {
		...OUTLINED,
		'font-size': '36px',
		'white-space': 'nowrap',
		animation: 'title-in 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	list: {
		position: 'absolute',
		left: '24px',
		top: '84px',
		width: '300px',
		height: '398px',
		display: 'flex',
		'flex-direction': 'column',
		gap: '6px',
		padding: '8px',
		// Scrolled to with the padding, so the first and last rows reach the ends.
		'scroll-padding': '8px',
		'box-sizing': 'border-box',
		overflow: 'hidden auto',
		background: 'rgba(15, 31, 41, 0.55)',
		border: '4px solid white',
		'box-shadow': '0 0 0 4px var(--ink)',
		animation: 'panel-in 0.35s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		'flex-shrink': 0,
		height: '52px',
		padding: '6px 10px',
		'box-sizing': 'border-box',
		background: 'rgba(255, 255, 255, 0.75)',
		color: 'var(--ink)',
		border: '3px solid transparent',
		'font-family': 'var(--font-pixel)',
		'text-align': 'left',
	},
	endlessRow: {
		height: '64px',
	},
	rowSelected: {
		background: 'white',
		border: '3px solid var(--ink)',
		'box-shadow': '0 0 0 3px #ffd23f, 2px 2px 0 3px #b33a2a',
	},
	locked: {
		background: 'rgba(255, 255, 255, 0.35)',
		color: 'rgba(15, 31, 41, 0.6)',
	},
	/** Pixel art, 24 by 16: twice its size exactly, or it blurs. */
	/**
	 * As wide as a course's number square under it (see `number`), so the
	 * names line up; as tall as that makes it, its 24 by 16 kept.
	 */
	busIcon: {
		width: `${NUMBER_SIZE}px`,
		height: `${(NUMBER_SIZE * 16) / 24}px`,
		'flex-shrink': 0,
		transform: 'scaleX(-1)',
	},
	number: {
		width: `${NUMBER_SIZE}px`,
		height: `${NUMBER_SIZE}px`,
		display: 'grid',
		'place-items': 'center',
		// Its digits are drawn 2 px down their 16 px line, and none under
		// it: up by half that, to sit in the middle.
		'line-height': 1,
		'padding-bottom': '2px',
		'box-sizing': 'border-box',
		background: 'var(--ink)',
		color: 'white',
		'font-size': '16px',
		'flex-shrink': 0,
	},
	rowText: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '3px',
		flex: 1,
		'min-width': 0,
	},
	rowName: {
		'font-size': '20px',
		'line-height': 1,
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
		'white-space': 'nowrap',
	},
	/** Medals and collectables down one side, the top scores down the other. */
	lower: {
		display: 'flex',
		gap: '16px',
		// As tall as what's in it: the preview has the rest.
		flex: '0 0 auto',
		'min-height': 0,
		'padding-top': '6px',
		'border-top': '2px solid rgba(255, 255, 255, 0.2)',
	},
	/** A course's medals, and its collectables found. */
	stats: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '3px',
		flex: 1.3,
		'min-width': 0,
	},
	/** A row's medal, or its star, at its end, as wide whichever it is. */
	rowMedal: {
		display: 'grid',
		'place-items': 'center',
		width: '18px',
		'flex-shrink': 0,
	},
	/** Each of a course's goals: how it's doing, and its icon at the end. */
	goalLine: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'space-between',
		gap: '10px',
		// As tall as a top score's line, alongside.
		'min-height': '18px',
		'font-size': '15px',
	},
	goalText: { opacity: 0.9 },
	/** Each goal's picture, in a box as big as any's, so they all line up. */
	goalIcon: {
		display: 'inline-grid',
		'place-items': 'center',
		width: `${GOAL_ICON}px`,
		height: `${GOAL_ICON}px`,
		'flex-shrink': 0,
		'line-height': 0,
	},
	/** What the next medal up takes: quieter than the medal got. */
	nextGoal: { color: 'rgba(255, 255, 255, 0.5)' },
	rowDetail: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '12px',
		opacity: 0.75,
	},
	section: {
		...OUTLINED_FLAT,
		'margin-top': '6px',
		'padding-left': '4px',
		'font-size': '16px',
	},
	/**
	 * The preview's window: whatever room's left once the rest has had its
	 * say, down to a least.
	 */
	window: {
		position: 'relative',
		flex: '1 1 0',
		'min-height': `${PREVIEW_LEAST + PREVIEW_BORDER}px`,
	},
	preview: {
		position: 'absolute',
		left: '352px',
		right: '24px',
		top: '84px',
		height: '398px',
		display: 'flex',
		'flex-direction': 'column',
		overflow: 'hidden',
		'box-sizing': 'border-box',
		padding: '14px 16px 16px',
		gap: '8px',
	},
	lock: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '8px',
		// Nothing behind it: no preview of a course that's still locked.
		background: 'rgb(15, 31, 41)',
		border: '3px solid white',
		color: 'white',
		'font-size': '30px',
	},
	heading: {
		display: 'flex',
		'align-items': 'baseline',
		'justify-content': 'space-between',
		gap: '12px',
		'margin-top': '4px',
	},
	name: {
		color: '#ffd23f',
		'font-size': '32px',
		'line-height': 1,
		'white-space': 'nowrap',
		'text-shadow': '3px 3px 0 #b33a2a',
	},
	headingDetail: {
		'font-size': '15px',
		opacity: 0.85,
		'white-space': 'nowrap',
	},
	/** Two lines' room, however short it is: the same for every course. */
	blurb: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '15px',
		'line-height': 1.3,
		'min-height': '2.6em',
		opacity: 0.85,
	},
	/**
	 * At the bottom of the panel, room for three, however many there are, so
	 * the preview's the same height for every course. Scrolling, rather than
	 * spilling out, should it ever not fit.
	 */
	scores: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '3px',
		position: 'relative',
		flex: 1,
		'min-height': 0,
		'overflow-y': 'auto',
	},
	scoresLabel: {
		'font-size': '12px',
		opacity: 0.6,
	},
	score: {
		display: 'flex',
		gap: '10px',
		'font-size': '15px',
	},
	scoreRunner: {
		flex: 1,
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
		'white-space': 'nowrap',
	},
	scorePoints: {
		color: '#ffd23f',
	},
	/** Over the first, empty, row. */
	noScores: {
		position: 'absolute',
		left: 0,
		top: '26px',
		'font-family': '"Cabin", sans-serif',
		'font-size': '14px',
		opacity: 0.7,
	},
	/** Run! Big enough for a thumb, and pulsing, so it's plain it's what to press. */
	go: {
		position: 'absolute',
		right: '10px',
		bottom: '10px',
		padding: '10px 22px',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid var(--ink)',
		'font-family': 'var(--font-pixel)',
		'font-size': '26px',
		'box-shadow': '4px 4px 0 #b33a2a',
		animation: 'go-pulse 1.2s ease-in-out infinite',
	},
	lockedNote: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '14px',
		opacity: 0.85,
	},
	hint: {
		...OUTLINED_FLAT,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: '18px',
		'text-align': 'center',
		'font-size': '15px',
		'white-space': 'nowrap',
	},
} satisfies Record<string, JSX.CSSProperties>

/**
 * A course's own hat, for its collectables goal, made to fit in `size` px:
 * a shadow of it, till all of them are found.
 */
function GoalHat(props: { course: Course; done: boolean; size: number }) {
	const hat = () => courseHat(props.course)
	// Or something else in its place, where it's the special goal's picture.
	const instead = () => COLLECTABLES_ICON[props.course.id]
	return (
		<Show
			when={!instead()}
			fallback={
				<GoalIconArt
					icon={instead() as GoalIcon}
					done={props.done}
					size={props.size}
				/>
			}
		>
			<span
				style={{
					position: 'relative',
					display: 'inline-block',
					width: `${props.size}px`,
					height: `${props.size}px`,
					'flex-shrink': 0,
					filter: props.done ? undefined : 'brightness(0) opacity(0.35)',
				}}
			>
				<Show when={hat()}>
					{(on) => {
						const art = () => hatArt(on())
						const fit = () =>
							Math.min(1, props.size / Math.max(art().width, art().height))
						// In the middle of the box, whatever its size: shrinking it
						// doesn't shrink the room it takes up, so a hat wider than
						// the box would overflow it to the right, off the middle.
						return (
							<span
								style={{
									position: 'absolute',
									left: '50%',
									top: '50%',
									width: `${art().width}px`,
									height: `${art().height}px`,
									transform: `translate(-50%, -50%) scale(${fit()})`,
								}}
							>
								<HatPicture hat={on()} still />
							</span>
						)
					}}
				</Show>
			</span>
		</Show>
	)
}
