import busEmoji from '@/assets/emoji/bus.png'
import { For, type JSX, Show, createEffect, onCleanup } from 'solid-js'
import { type TableId, table, topScore } from '../highScores'
import { LEVELS } from '../levels'
import type { Level } from '../levels/types'
import type { Playable } from '../playable'
import { isUnlocked } from '../progress'
import { play } from '../sfx'
import { CoursePreview } from '../ui/CoursePreview'
import { OUTLINED, Panel } from '../ui/Menu'

/** What's picked: Endless, or a course's id, to practise it. */
export type RunChoice = string

/** Everything in the list, top to bottom: Endless, then every course. */
const CHOICES: RunChoice[] = ['endless', ...LEVELS.map((level) => level.id)]

const Stars = (props: { count: number }) => (
	<span style={styles.stars}>
		<For each={[1, 2, 3]}>
			{(star) => (
				<span style={{ opacity: star <= props.count ? 1 : 0.25 }}>★</span>
			)}
		</For>
	</span>
)

/**
 * Endless, at the top of the list and picked to begin with, then every course
 * under it to practise on its own, each locked until Endless has got as far
 * as it. Whichever's picked is shown off on the right.
 */
export function LevelSelect(props: {
	runner: Playable
	selected: RunChoice
	onSelect: (choice: RunChoice) => void
	onEndless: () => void
	onPractice: (level: Level) => void
	onBack: () => void
}) {
	const index = () => Math.max(0, CHOICES.indexOf(props.selected))
	const level = () => LEVELS.find((level) => level.id === props.selected)
	const open = (choice: RunChoice) =>
		choice === 'endless' ||
		isUnlocked(LEVELS.findIndex((level) => level.id === choice))

	const choose = (choice: RunChoice) => {
		if (!open(choice)) return play('back')
		play('select')
		const practise = LEVELS.find((level) => level.id === choice)
		if (practise) props.onPractice(practise)
		else props.onEndless()
	}
	const select = (choice: RunChoice) => {
		if (choice === props.selected) return
		play('move')
		props.onSelect(choice)
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
			const next = Math.max(0, Math.min(CHOICES.length - 1, index() + move))
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

	/** The course before one, which Endless has to get round to unlock it. */
	const before = (course: Level) => LEVELS[course.number - 2]?.name

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
			onMouseEnter={() => select(choice)}
			onClick={() => choose(choice)}
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

			<div style={styles.list}>
				{row(
					'endless',
					0,
					<>
						<img src={busEmoji} alt="" style={styles.busIcon} />
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
					</>,
				)}
				<div style={styles.section}>Practice</div>
				<For each={LEVELS}>
					{(course, i) =>
						row(
							course.id,
							i() + 1,
							<>
								<span style={styles.number}>{course.number}</span>
								<span style={styles.rowText}>
									<span style={styles.rowName}>{course.name}</span>
									<span style={styles.rowDetail}>
										{!open(course.id)
											? 'Locked'
											: topScore(course.id)
												? `Best ${topScore(course.id).toLocaleString('en')} pts`
												: 'No runs yet'}
									</span>
								</span>
								<Stars count={course.difficulty} />
							</>,
						)
					}
				</For>
			</div>

			<Panel style={styles.preview}>
				<div style={{ position: 'relative' }}>
					{/* Rebuilt for each: a whole other course. */}
					<Show when={level() ?? LEVELS[0]} keyed>
						{(course) => (
							<CoursePreview
								level={course}
								runner={props.runner}
								bus={!level()}
								width={538}
								height={185}
							/>
						)}
					</Show>
					<Show
						when={open(props.selected)}
						fallback={
							<div style={styles.lock}>
								<span>Locked</span>
								<span style={styles.lockedNote}>
									Get round {before(level() as Level)} in Endless to practise
									this one
								</span>
							</div>
						}
					>
						<div style={styles.go}>Enter to run!</div>
					</Show>
				</div>

				<div style={styles.heading}>
					<span style={styles.name}>{level()?.name ?? 'Endless'}</span>
					<span style={styles.headingDetail}>
						<Show
							when={level()}
							fallback={`${LEVELS.length} courses, round and round`}
						>
							{(course) => (
								<>
									Level {course().number} <Stars count={course().difficulty} />
								</>
							)}
						</Show>
					</span>
				</div>
				<div style={styles.blurb}>
					{level()?.blurb ??
						'Every course in turn, your points carried on, until the bus gets you.'}
				</div>

				<TopScores id={props.selected} />
			</Panel>

			<div style={styles.hint}>
				↑ ↓ to pick · Enter to run · Esc to change runner
			</div>
		</div>
	)
}

/** The top three in a table, with a word if it's empty. */
function TopScores(props: { id: TableId }) {
	return (
		<div style={styles.scores}>
			<div style={styles.scoresLabel}>Top scores</div>
			<Show
				when={table(props.id).length}
				fallback={<div style={styles.noScores}>No runs yet</div>}
			>
				<For each={table(props.id).slice(0, 3)}>
					{(entry, i) => (
						<div style={styles.score}>
							<span style={{ width: '18px' }}>{i() + 1}</span>
							<span style={styles.scoreRunner}>{entry.runner}</span>
							<span style={styles.scorePoints}>
								{entry.score.toLocaleString('en')}
							</span>
						</div>
					)}
				</For>
			</Show>
		</div>
	)
}

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
		padding: '8px 12px 4px',
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
		'scrollbar-width': 'thin',
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
		background: 'rgba(255, 210, 63, 0.8)',
	},
	rowSelected: {
		background: 'white',
		border: '3px solid var(--ink)',
		'box-shadow': '0 0 0 3px #ffd23f, 4px 4px 0 3px #b33a2a',
	},
	locked: {
		background: 'rgba(255, 255, 255, 0.35)',
		color: 'rgba(15, 31, 41, 0.6)',
	},
	busIcon: {
		width: '40px',
		transform: 'scaleX(-1)',
	},
	number: {
		width: '28px',
		height: '28px',
		display: 'grid',
		'place-items': 'center',
		'padding-top': '3px',
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
	rowDetail: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '12px',
		opacity: 0.75,
	},
	section: {
		...OUTLINED,
		'margin-top': '6px',
		'padding-left': '4px',
		'font-size': '16px',
	},
	stars: {
		color: '#e0a400',
		'font-size': '15px',
		'letter-spacing': '2px',
		'white-space': 'nowrap',
	},
	preview: {
		position: 'absolute',
		left: '352px',
		right: '24px',
		top: '84px',
		height: '398px',
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
		background: 'rgba(15, 31, 41, 0.7)',
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
	blurb: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '15px',
		'line-height': 1.3,
		opacity: 0.85,
	},
	scores: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '3px',
		'padding-top': '6px',
		'border-top': '2px solid rgba(255, 255, 255, 0.2)',
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
	noScores: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '14px',
		opacity: 0.7,
	},
	go: {
		position: 'absolute',
		right: '10px',
		bottom: '10px',
		padding: '8px 14px 4px',
		background: '#ffd23f',
		color: 'var(--ink)',
		'font-size': '20px',
		'box-shadow': '4px 4px 0 #b33a2a',
		animation: 'blink 1.2s steps(2) infinite',
	},
	lockedNote: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '14px',
		opacity: 0.85,
	},
	hint: {
		...OUTLINED,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: '18px',
		'text-align': 'center',
		'font-size': '15px',
		'white-space': 'nowrap',
	},
} satisfies Record<string, JSX.CSSProperties>
