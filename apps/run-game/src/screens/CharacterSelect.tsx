import { For, type JSX, Show, createEffect, onCleanup } from 'solid-js'
import { type CustomRunner, customRunners } from '../customRunners'
import { MEMBERS, type Playable, customPlayable } from '../playable'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { RunnerStage, nameSize } from '../ui/RunnerStage'

/** A card on the select screen: making a new runner, or someone to run as. */
type Entry =
	| { kind: 'new'; id: 'new' }
	| { kind: 'runner'; id: string; runner: Playable }

const COLUMNS = 5

/** The club, by name. */
const MEMBERS_BY_NAME = [...MEMBERS].sort((a, b) =>
	a.name.localeCompare(b.name),
)

export function CharacterSelect(props: {
	selectedId: string | undefined
	onSelect: (id: string) => void
	onPick: (runner: Playable) => void
	/** Make a runner (none given), or change one. */
	onEdit: (runner?: CustomRunner) => void
	onBack: () => void
}) {
	/** Making one first, then your own runners, newest first, then the club. */
	const entries = (): Entry[] => [
		{ kind: 'new', id: 'new' },
		...[
			...customRunners().map(customPlayable).reverse(),
			...MEMBERS_BY_NAME,
		].map((runner): Entry => ({ kind: 'runner', id: runner.id, runner })),
	]
	const selectedIndex = () => {
		const at = entries().findIndex((entry) => entry.id === props.selectedId)
		// Nobody picked yet: the first runner, not "New runner".
		return at >= 0 ? at : Math.min(1, entries().length - 1)
	}
	const selected = () => entries()[selectedIndex()]
	const choose = (entry: Entry) => {
		play('select')
		if (entry.kind === 'new') props.onEdit()
		else props.onPick(entry.runner)
	}

	const cards: HTMLElement[] = []
	let frame: HTMLDivElement | undefined
	// Keep the selected card in view as the keyboard moves through them: on
	// the top or bottom row, right to the top or bottom, padding and all.
	createEffect(() => {
		const at = selectedIndex()
		const row = Math.floor(at / COLUMNS)
		const lastRow = Math.floor((entries().length - 1) / COLUMNS)
		if (frame && row === 0) frame.scrollTo({ top: 0 })
		else if (frame && row === lastRow)
			frame.scrollTo({ top: frame.scrollHeight })
		else cards[at]?.scrollIntoView({ block: 'nearest' })
	})

	const onKey = (event: KeyboardEvent) => {
		const move: Record<string, number> = {
			ArrowLeft: -1,
			a: -1,
			ArrowRight: 1,
			d: 1,
			ArrowUp: -COLUMNS,
			w: -COLUMNS,
			ArrowDown: COLUMNS,
			s: COLUMNS,
		}
		const all = entries()
		const current = all[selectedIndex()]
		if (event.key in move) {
			event.preventDefault()
			const next = Math.max(
				0,
				Math.min(all.length - 1, selectedIndex() + move[event.key]),
			)
			if (next !== selectedIndex()) play('move')
			props.onSelect(all[next].id)
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			if (current) choose(current)
		}
		const custom = current?.kind === 'runner' && current.runner.custom
		if ((event.key === 'e' || event.key === 'E') && custom) {
			play('select')
			props.onEdit(custom)
		}
		if (event.key === 'Escape') {
			play('back')
			props.onBack()
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<div style={styles.screen}>
			<div style={styles.top}>
				<button
					type="button"
					style={styles.back}
					onClick={() => {
						play('back')
						props.onBack()
					}}
				>
					← Menu
				</button>
				<div style={styles.title}>Choose your runner</div>
			</div>

			<Panel style={styles.preview}>
				<Show
					when={selected()?.kind === 'runner' && selected()}
					fallback={
						<>
							<RunnerStage path={false}>
								<div style={styles.bigPlus}>+</div>
							</RunnerStage>
							<div style={{ ...styles.previewName, 'font-size': '30px' }}>
								New runner
							</div>
							<div style={styles.previewTag}>Make one of your own</div>
						</>
					}
				>
					{(entry) => {
						const runner = () =>
							(entry() as Extract<Entry, { kind: 'runner' }>).runner
						return (
							<>
								<RunnerStage>
									<RunStrip
										frame={runner().sprite.run[0] ?? ''}
										width={runner().sprite.width}
										height={runner().sprite.height}
										scale={4}
										stride={0.42}
										style={{ position: 'relative', 'margin-bottom': '22px' }}
									/>
								</RunnerStage>
								<div
									style={{
										...styles.previewName,
										'font-size': `${nameSize(runner().name, [40, 30, 22])}px`,
									}}
								>
									{runner().name}
								</div>
								<div style={styles.previewTag}>
									{runner().custom
										? 'Your runner · E to change'
										: 'Club member'}
								</div>
							</>
						)
					}}
				</Show>
				<div style={styles.go}>Enter to run!</div>
			</Panel>

			<div
				ref={(el) => {
					frame = el
				}}
				style={styles.gridFrame}
			>
				<div style={styles.grid}>
					<For each={entries()}>
						{(entry, i) => {
							const isSelected = () => selectedIndex() === i()
							const runner = entry.kind === 'runner' ? entry.runner : undefined
							return (
								<div
									ref={(el) => {
										cards[i()] = el
									}}
									style={{ position: 'relative' }}
								>
									<button
										type="button"
										style={{
											...styles.card,
											...(runner?.custom ? styles.cardCustom : {}),
											...(entry.kind === 'new' ? styles.cardNew : {}),
											...(isSelected() ? styles.cardSelected : {}),
										}}
										onMouseEnter={() => {
											if (!isSelected()) {
												play('move')
												props.onSelect(entry.id)
											}
										}}
										onClick={() => choose(entry)}
									>
										<Show
											when={runner}
											fallback={
												<>
													<span style={styles.plus}>+</span>
													<span
														style={{ ...styles.cardName, 'font-size': '15px' }}
													>
														New runner
													</span>
												</>
											}
										>
											{(runner) => (
												<>
													<RunStrip
														frame={runner().sprite.run[0] ?? ''}
														width={runner().sprite.width}
														height={runner().sprite.height}
														stride={isSelected() ? 0.4 : 0.6}
													/>
													<span
														style={{
															...styles.cardName,
															'font-size': `${nameSize(runner().name, [18, 14, 11])}px`,
														}}
													>
														{runner().name}
													</span>
												</>
											)}
										</Show>
									</button>
									<Show when={runner?.custom}>
										{(custom) => (
											<button
												type="button"
												style={styles.edit}
												aria-label={`Change ${custom().name}`}
												onClick={() => {
													play('select')
													props.onEdit(custom())
												}}
											>
												Edit
											</button>
										)}
									</Show>
								</div>
							)
						}}
					</For>
				</div>
			</div>

			<div style={styles.hint}>
				Arrows to pick · Enter to run · E to change your runner · Esc for the
				menu
			</div>
		</div>
	)
}

const CARD_WIDTH = 112

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
	preview: {
		position: 'absolute',
		left: '24px',
		top: '84px',
		width: '270px',
		height: '398px',
		'box-sizing': 'border-box',
		padding: '16px',
		'align-items': 'center',
		gap: '8px',
	},
	bigPlus: {
		'font-size': '120px',
		color: 'white',
		'align-self': 'center',
		'text-shadow': '5px 5px 0 var(--ink)',
	},
	previewName: {
		'margin-top': '8px',
		color: '#ffd23f',
		'white-space': 'nowrap',
		'line-height': 1,
		'text-shadow': '3px 3px 0 #b33a2a',
	},
	previewTag: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '14px',
		opacity: 0.8,
		'white-space': 'nowrap',
	},
	go: {
		'margin-top': 'auto',
		padding: '8px 14px 4px',
		background: '#ffd23f',
		color: 'var(--ink)',
		'font-size': '20px',
		'box-shadow': '4px 4px 0 #b33a2a',
		animation: 'blink 1.2s steps(2) infinite',
	},
	gridFrame: {
		position: 'absolute',
		left: '316px',
		right: '24px',
		top: '84px',
		height: '398px',
		overflow: 'hidden auto',
		padding: '8px',
		// Rows between the first and last scroll into view with the padding too.
		'scroll-padding': '8px',
		'box-sizing': 'border-box',
		background: 'rgba(15, 31, 41, 0.55)',
		border: '4px solid white',
		'box-shadow': '0 0 0 4px var(--ink)',
		'scrollbar-width': 'thin',
		animation: 'panel-in 0.35s 0.05s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	grid: {
		display: 'grid',
		'grid-template-columns': `repeat(${COLUMNS}, ${CARD_WIDTH}px)`,
		gap: '8px',
		'justify-content': 'center',
	},
	card: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'flex-end',
		gap: '8px',
		width: `${CARD_WIDTH}px`,
		height: '104px',
		padding: '6px 6px 8px',
		'box-sizing': 'border-box',
		background: 'rgba(255, 255, 255, 0.75)',
		border: '3px solid transparent',
		color: 'var(--ink)',
	},
	cardCustom: {
		background: 'rgba(255, 210, 63, 0.75)',
	},
	cardNew: {
		background: 'rgba(255, 255, 255, 0.35)',
		color: 'white',
		border: '3px dashed white',
	},
	cardSelected: {
		background: 'white',
		color: 'var(--ink)',
		border: '3px solid var(--ink)',
		'box-shadow': '0 0 0 3px #ffd23f, 5px 5px 0 3px #b33a2a',
		transform: 'translateY(-2px)',
	},
	cardName: {
		'max-width': '100%',
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
		'white-space': 'nowrap',
		'line-height': 1,
		height: '18px',
		display: 'flex',
		'align-items': 'flex-end',
	},
	plus: {
		'font-size': '46px',
		'line-height': 1,
		'margin-bottom': 'auto',
		'padding-top': '10px',
	},
	edit: {
		position: 'absolute',
		top: '4px',
		right: '4px',
		padding: '3px 5px 0',
		background: 'var(--ink)',
		color: 'white',
		border: 'none',
		'font-size': '11px',
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
