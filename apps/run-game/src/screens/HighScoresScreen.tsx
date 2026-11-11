import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'
import { COURSES } from '../courses'
import {
	ONLINE,
	ONLINE_TABLE_SIZE,
	type OnlineEntry,
	fetchTable,
	onlineTable,
} from '../online/runScores'
import type { TableId } from '../saved/highScores'
import { play } from '../sfx'
import { Menu, Panel } from '../ui/Menu'
import { ScoreFace } from '../ui/ScoreFace'

/** How far ↑ and ↓ scroll the table: a row. */
const ROW_STEP = 24
/** How many rows the table shows at once. */
const ROWS_SHOWN = 7

/** Endless's table first, then each course's, in order. */
const TABLES: { id: TableId; name: string; detail: string }[] = [
	{ id: 'endless', name: 'Endless', detail: 'Every course in turn' },
	...COURSES.map((course) => ({
		id: course.id,
		name: course.name,
		detail: `Course ${course.number} · points on the course in one go`,
	})),
]

/** "2026-11-09" as "9 Nov 2026". */
function day(date: string) {
	const [year, month, dayOfMonth] = date.split('-').map(Number)
	if (!year || !month || !dayOfMonth) return date
	return new Date(year, month - 1, dayOfMonth).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

/** A row of a table: someone's score, by their face. */
interface Row {
	rank: number
	entry: OnlineEntry
	mine: boolean
}

/**
 * The online high score tables, everyone's, with yours highlighted: left
 * and right (or A and D) to go from one to the next.
 */
export function HighScoresScreen(props: { onBack: () => void }) {
	const [at, setAt] = createSignal(0)
	const current = () => TABLES[at()]
	const endless = () => current().id === 'endless'
	/** Whether the table's been asked for and couldn't be got. */
	const [failed, setFailed] = createSignal(!ONLINE)
	createEffect(() => {
		if (!ONLINE) return
		const id = current().id
		setFailed(false)
		fetchTable(id).then((table) => {
			if (!table && current().id === id) setFailed(true)
		})
	})
	/** The table's rows, and the player's own too if it's further down. */
	const rows = (): Row[] | undefined => {
		const fetched = onlineTable(current().id)
		if (!fetched) return undefined
		const top = fetched.entries.map((entry, rank) => ({
			rank,
			entry,
			mine: entry.mine,
		}))
		return fetched.mine ? [...top, { ...fetched.mine, mine: true }] : top
	}

	/** The rows, scrolled within the table rather than making it any taller. */
	let rowsBox: HTMLDivElement | undefined
	const cycle = (by: number) => {
		play('move')
		setAt((i) => (i + by + TABLES.length) % TABLES.length)
		rowsBox?.scrollTo({ top: 0 })
	}
	const onKey = (event: KeyboardEvent) => {
		const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
		if (key === 'ArrowLeft' || key === 'a') {
			event.preventDefault()
			cycle(-1)
		}
		if (key === 'ArrowRight' || key === 'd') {
			event.preventDefault()
			cycle(1)
		}
		// Up and down the table, a row at a time.
		if (key === 'ArrowUp' || key === 'w') rowsBox?.scrollBy({ top: -ROW_STEP })
		if (key === 'ArrowDown' || key === 's') rowsBox?.scrollBy({ top: ROW_STEP })
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	/** How far round a course they got. Endless's table is just the points. */
	const extra = (entry: OnlineEntry) =>
		entry.finished
			? 'Finished'
			: `${(entry.metres ?? 0).toLocaleString('en')} m`

	return (
		<div style={styles.screen}>
			<Panel title="High scores" style={{ width: '660px' }}>
				<div style={styles.switcher}>
					<button
						type="button"
						style={styles.arrow}
						aria-label="Previous table"
						onClick={() => cycle(-1)}
					>
						◀
					</button>
					<div style={styles.heading}>
						<div style={styles.name}>{current().name}</div>
						<div style={styles.detail}>{current().detail}</div>
					</div>
					<button
						type="button"
						style={styles.arrow}
						aria-label="Next table"
						onClick={() => cycle(1)}
					>
						▶
					</button>
				</div>
				<div style={styles.dots}>
					<For each={TABLES}>
						{(_, i) => (
							<span
								style={{
									...styles.dot,
									...(i() === at() ? styles.dotOn : {}),
								}}
							/>
						)}
					</For>
				</div>

				<div style={styles.table}>
					<div style={{ ...styles.row, ...styles.header }}>
						<span style={styles.rank}>#</span>
						<span style={styles.runner}>Runner</span>
						<span style={styles.score}>Points</span>
						<Show when={!endless()}>
							<span style={styles.extra}>Got to</span>
						</Show>
						<span style={styles.date}>When</span>
					</div>
					<div style={styles.rows} ref={rowsBox}>
						<Show
							when={rows()?.length}
							fallback={
								<div style={styles.empty}>
									{!rows()
										? failed()
											? ONLINE
												? 'Couldn’t get the high scores. Try again later'
												: 'High scores are online, and there’s no connection here'
											: 'Loading…'
										: 'No runs yet. Get out there!'}
								</div>
							}
						>
							<For each={rows()}>
								{({ rank, entry, mine }) => (
									<div
										style={{
											...styles.row,
											...(rank === 0 ? styles.first : {}),
											...(mine ? styles.mine : {}),
										}}
									>
										<span style={styles.rank}>{rank + 1}</span>
										<span style={styles.runner}>
											<ScoreFace icon={entry.icon} />
											<span style={styles.runnerName}>{entry.name}</span>
										</span>
										<span style={styles.score}>
											{entry.score.toLocaleString('en')}
										</span>
										<Show when={!endless()}>
											<span style={styles.extra}>{extra(entry)}</span>
										</Show>
										<span style={styles.date}>{day(entry.date)}</span>
									</div>
								)}
							</For>
						</Show>
					</div>
				</div>

				<div style={styles.footer}>
					<span style={styles.hint}>
						← → to change table · ↑ ↓ to scroll · top {ONLINE_TABLE_SIZE},
						everyone's, yours highlighted
					</span>
					<div style={{ width: '220px' }}>
						<Menu
							items={[{ label: 'Back', choose: props.onBack }]}
							onBack={props.onBack}
						/>
					</div>
				</div>
			</Panel>
		</div>
	)
}

const styles = {
	screen: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
	},
	switcher: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'space-between',
		gap: '12px',
	},
	arrow: {
		width: '44px',
		height: '44px',
		padding: '4px 0 0',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
		'box-shadow': '3px 3px 0 #b33a2a',
		'font-size': '18px',
	},
	heading: {
		'text-align': 'center',
	},
	name: {
		color: '#ffd23f',
		'font-size': '28px',
		'line-height': 1,
		'text-shadow': '3px 3px 0 #b33a2a',
	},
	detail: {
		'margin-top': '4px',
		'font-family': '"Cabin", sans-serif',
		'font-size': '14px',
		opacity: 0.75,
	},
	dots: {
		display: 'flex',
		gap: '6px',
		'justify-content': 'center',
	},
	dot: {
		width: '8px',
		height: '8px',
		background: 'rgba(255, 255, 255, 0.3)',
	},
	dotOn: {
		background: '#ffd23f',
	},
	table: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '2px',
		padding: '8px 10px',
		border: '3px solid rgba(255, 255, 255, 0.3)',
	},
	/** A few rows tall, however many there are: the rest scroll, a row at a time. */
	rows: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '2px',
		height: `${ROWS_SHOWN * ROW_STEP - 2}px`,
		'overflow-y': 'auto',
		'scroll-snap-type': 'y mandatory',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		height: '22px',
		'flex-shrink': 0,
		'font-size': '16px',
		'scroll-snap-align': 'start',
	},
	header: {
		'font-size': '12px',
		opacity: 0.6,
		height: '18px',
	},
	first: {
		color: '#ffd23f',
	},
	rank: { width: '28px', 'text-align': 'right' },
	runner: {
		flex: 1,
		display: 'flex',
		'align-items': 'center',
		gap: '8px',
		'min-width': 0,
	},
	runnerName: {
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
		'white-space': 'nowrap',
	},
	/** The player's own, online. */
	mine: {
		background: '#ffd23f',
		color: 'var(--ink)',
	},
	score: { width: '90px', 'text-align': 'right' },
	extra: { width: '110px', 'text-align': 'right' },
	date: { width: '110px', 'text-align': 'right', opacity: 0.75 },
	empty: {
		margin: 'auto',
		'font-family': '"Cabin", sans-serif',
		'font-size': '17px',
		opacity: 0.75,
	},
	footer: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'space-between',
	},
	hint: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '13px',
		opacity: 0.7,
	},
} satisfies Record<string, JSX.CSSProperties>
