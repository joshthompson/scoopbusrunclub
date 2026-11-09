import { For, type JSX, Show, createSignal, onCleanup } from 'solid-js'
import { type ScoreEntry, TABLE_SIZE, type TableId, table } from '../highScores'
import { LEVELS } from '../levels'
import { play } from '../sfx'
import { Menu, Panel } from '../ui/Menu'

/** Endless's table first, then each course's, in order. */
const TABLES: { id: TableId; name: string; detail: string }[] = [
	{ id: 'endless', name: 'Endless', detail: 'Every course in turn' },
	...LEVELS.map((level) => ({
		id: level.id,
		name: level.name,
		detail: `Level ${level.number} · points on the course in one go`,
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

/**
 * The high score tables, kept in this browser: left and right (or A and D)
 * to go from one to the next.
 */
export function HighScoresScreen(props: { onBack: () => void }) {
	const [at, setAt] = createSignal(0)
	const current = () => TABLES[at()]
	const endless = () => current().id === 'endless'

	const cycle = (by: number) => {
		play('move')
		setAt((i) => (i + by + TABLES.length) % TABLES.length)
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
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	/** How far round a course they got. Endless's table is just the points. */
	const extra = (entry: ScoreEntry) =>
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
					<Show
						when={table(current().id).length}
						fallback={
							<div style={styles.empty}>No runs yet. Get out there!</div>
						}
					>
						<For each={table(current().id)}>
							{(entry, i) => (
								<div
									style={{
										...styles.row,
										...(i() === 0 ? styles.first : {}),
									}}
								>
									<span style={styles.rank}>{i() + 1}</span>
									<span style={styles.runner}>{entry.runner}</span>
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

				<div style={styles.footer}>
					<span style={styles.hint}>
						← → to change table · top {TABLE_SIZE}, in this browser
					</span>
					<div style={{ width: '160px' }}>
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
		'min-height': '262px',
		padding: '8px 10px',
		border: '3px solid rgba(255, 255, 255, 0.3)',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		height: '22px',
		'font-size': '16px',
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
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
		'white-space': 'nowrap',
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
