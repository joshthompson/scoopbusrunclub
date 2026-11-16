import { For, type JSX, Show, createEffect, onCleanup } from 'solid-js'
import { touchScreen } from '../input'
import { UNLOCKABLES } from '../runners/bonus'
import { type CustomRunner, customRunners } from '../runners/customRunners'
import { CLUB, type Playable, customPlayable } from '../runners/playable'
import { runnerUnlocked } from '../saved/unlocked'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { RunnerStage, nameSize } from '../ui/RunnerStage'
import { onHover } from '../ui/hover'

/**
 * A card on the select screen: making a new runner, someone to run as, or
 * someone not unlocked yet, a "?" until they are.
 */
type Entry =
	| { kind: 'new'; id: 'new' }
	| { kind: 'runner'; id: string; runner: Playable }
	| { kind: 'locked'; id: string; runner: Playable }

/** A heading, and its cards. */
interface Section {
	title: string
	entries: Entry[]
}

const COLUMNS = 8

const runnerEntry = (runner: Playable): Entry => ({
	kind: 'runner',
	id: runner.id,
	runner,
})

export function CharacterSelect(props: {
	selectedId: string | undefined
	onSelect: (id: string) => void
	onPick: (runner: Playable) => void
	/** Make a runner (none given), or change one. */
	onEdit: (runner?: CustomRunner) => void
	onBack: () => void
}) {
	/**
	 * Your own runners, making one first, then the newest; the club; then
	 * everyone there is to unlock, a "?" until they are.
	 */
	const sections = (): Section[] => {
		const unlocks = UNLOCKABLES.map(
			(runner): Entry =>
				runnerUnlocked(runner.id)
					? runnerEntry(runner)
					: { kind: 'locked', id: runner.id, runner },
		)
		const found = unlocks.filter((entry) => entry.kind === 'runner').length
		return [
			{
				title: 'Custom Runners',
				entries: [
					{ kind: 'new', id: 'new' },
					...customRunners().map(customPlayable).reverse().map(runnerEntry),
				],
			},
			{ title: 'Scoop Bus Members', entries: CLUB.map(runnerEntry) },
			{
				title: `Unlocks · ${found}/${unlocks.length}`,
				entries: unlocks,
			},
		]
	}
	/** Every card, in order, and where each section's start in it. */
	const entries = () => sections().flatMap((section) => section.entries)
	const starts = () => {
		let at = 0
		return sections().map((section) => {
			const start = at
			at += section.entries.length
			return start
		})
	}
	/** Every row of cards, top to bottom, as indexes into `entries`: for moving up and down. */
	const rows = () =>
		sections().flatMap((section, s) =>
			Array.from(
				{ length: Math.ceil(section.entries.length / COLUMNS) },
				(_, row) =>
					section.entries
						.slice(row * COLUMNS, (row + 1) * COLUMNS)
						.map((_, col) => starts()[s] + row * COLUMNS + col),
			),
		)
	const selectedIndex = () => {
		const at = entries().findIndex((entry) => entry.id === props.selectedId)
		// Nobody picked yet: the first runner, not "New runner".
		return at >= 0 ? at : Math.min(1, entries().length - 1)
	}
	const selected = () => entries()[selectedIndex()]
	const choose = (entry: Entry) => {
		if (entry.kind === 'locked') {
			play('back')
			return
		}
		play('select')
		if (entry.kind === 'new') props.onEdit()
		else props.onPick(entry.runner)
	}
	/**
	 * A card clicked: with a mouse, that one's run as. Tapped, on a touch
	 * screen, they're only picked, to see them first; tapped again, or Run,
	 * and they're run as.
	 */
	const tap = (entry: Entry) => {
		if (touchScreen() && entry.id !== selected()?.id) {
			play('move')
			props.onSelect(entry.id)
		} else choose(entry)
	}

	const cards: HTMLElement[] = []
	let frame: HTMLDivElement | undefined
	// Keep the selected card in view as the keyboard moves through them: on
	// the top or bottom row, right to the top or bottom, padding and all.
	createEffect(() => {
		const at = selectedIndex()
		const all = rows()
		const row = all.findIndex((r) => r.includes(at))
		if (frame && row === 0) frame.scrollTo({ top: 0 })
		else if (frame && row === all.length - 1)
			frame.scrollTo({ top: frame.scrollHeight })
		else cards[at]?.scrollIntoView({ block: 'nearest' })
	})

	/** Up or down a row, from card `at`: as near straight up or down as there's a card. */
	const vertical = (at: number, by: number) => {
		const all = rows()
		const row = all.findIndex((r) => r.includes(at))
		const next = all[row + by]
		if (!next) return at
		return next[Math.min(all[row].indexOf(at), next.length - 1)]
	}

	const onKey = (event: KeyboardEvent) => {
		const sideways: Record<string, number> = {
			ArrowLeft: -1,
			a: -1,
			ArrowRight: 1,
			d: 1,
		}
		const upDown: Record<string, number> = {
			ArrowUp: -1,
			w: -1,
			ArrowDown: 1,
			s: 1,
		}
		const all = entries()
		const current = all[selectedIndex()]
		if (event.key in sideways || event.key in upDown) {
			event.preventDefault()
			const next =
				event.key in sideways
					? Math.max(
							0,
							Math.min(all.length - 1, selectedIndex() + sideways[event.key]),
						)
					: vertical(selectedIndex(), upDown[event.key])
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
						<Show
							when={selected()?.kind === 'locked'}
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
							<RunnerStage path={false}>
								<div style={styles.bigPlus}>?</div>
							</RunnerStage>
							<div style={{ ...styles.previewName, 'font-size': '40px' }}>
								???
							</div>
							<div style={styles.previewTag}>Not unlocked yet</div>
						</Show>
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
										? touchScreen()
											? 'Your runner · Edit to change'
											: 'Your runner · E to change'
										: runner().bonus
											? 'Bonus runner · Unlocked!'
											: runner().unlockedBy
												? 'Club member · Unlocked!'
												: 'Club member'}
								</div>
							</>
						)
					}}
				</Show>
				<button
					type="button"
					style={{
						...styles.go,
						...(selected()?.kind === 'locked' ? styles.goLocked : {}),
					}}
					disabled={selected()?.kind === 'locked'}
					onClick={() => {
						const entry = selected()
						if (entry) choose(entry)
					}}
				>
					{selected()?.kind === 'locked'
						? 'Locked'
						: touchScreen()
							? selected()?.kind === 'new'
								? 'Make ▶'
								: 'Run ▶'
							: 'Enter to run!'}
				</button>
			</Panel>

			<div
				ref={(el) => {
					frame = el
				}}
				style={styles.gridFrame}
			>
				<For each={sections()}>
					{(section, s) => (
						<div style={styles.section}>
							<div style={styles.heading}>{section.title}</div>
							<div style={styles.grid}>
								<For each={section.entries}>
									{(entry, i) => {
										const at = () => starts()[s()] + i()
										const isSelected = () => selectedIndex() === at()
										const runner =
											entry.kind === 'runner' ? entry.runner : undefined
										return (
											<div
												ref={(el) => {
													cards[at()] = el
												}}
												style={{ position: 'relative' }}
											>
												<button
													type="button"
													aria-label={
														entry.kind === 'locked'
															? 'Not unlocked yet'
															: undefined
													}
													style={{
														...styles.card,
														...(runner?.custom ? styles.cardCustom : {}),
														...(entry.kind === 'new' ? styles.cardNew : {}),
														...(entry.kind === 'locked'
															? styles.cardLocked
															: {}),
														...(isSelected() ? styles.cardSelected : {}),
														...(runner?.darkCard ? styles.cardDark : {}),
													}}
													onMouseEnter={onHover(() => {
														if (!isSelected() && !touchScreen()) {
															play('move')
															props.onSelect(entry.id)
														}
													})}
													onClick={() => tap(entry)}
												>
													<Show
														when={runner}
														fallback={
															<>
																<span style={styles.mark}>
																	{entry.kind === 'locked' ? '?' : '+'}
																</span>
																<span style={styles.cardName}>
																	{entry.kind === 'locked' ? '???' : 'New'}
																</span>
															</>
														}
													>
														{(runner) => (
															<>
																<div
																	style={{
																		...styles.art,
																		...(isSelected() ? styles.artSelected : {}),
																	}}
																>
																	<RunStrip
																		frame={runner().sprite.run[0] ?? ''}
																		width={runner().sprite.width}
																		height={runner().sprite.height}
																		scale={1.5}
																		stride={isSelected() ? 0.4 : 0.6}
																	/>
																</div>
																<span
																	style={{
																		...styles.cardName,
																		'font-size': `${nameSize(runner().name, [10, 9, 8])}px`,
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
					)}
				</For>
			</div>

			<div style={styles.hint}>
				{touchScreen()
					? 'Tap a runner to see them · tap Run ▶ to start'
					: 'Arrows to pick · Enter to run · E to change your runner · Esc for the menu'}
			</div>
		</div>
	)
}

const CARD_WIDTH = 66
const CARD_HEIGHT = 72
/** A card's padding at the sides, and its border. */
const CARD_PADDING = 3
const CARD_BORDER = 3

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
	/** Run! Big enough for a thumb, and pulsing, so it's plain it's what to press. */
	go: {
		'margin-top': 'auto',
		padding: '12px 22px 8px',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid var(--ink)',
		'font-family': 'var(--font-pixel)',
		'font-size': '24px',
		'box-shadow': '4px 4px 0 #b33a2a',
		animation: 'go-pulse 1.2s ease-in-out infinite',
	},
	/** Someone still a "?": nothing to run as yet. */
	goLocked: {
		background: '#9aa3a8',
		'box-shadow': '4px 4px 0 var(--ink)',
		animation: 'none',
		cursor: 'default',
	},
	gridFrame: {
		position: 'absolute',
		left: '316px',
		right: '24px',
		top: '84px',
		height: '398px',
		overflow: 'hidden auto',
		padding: '4px 8px 8px',
		display: 'flex',
		'flex-direction': 'column',
		gap: '4px',
		// Rows between the first and last scroll into view with the padding too.
		'scroll-padding': '8px',
		'box-sizing': 'border-box',
		background: 'rgba(15, 31, 41, 0.55)',
		border: '4px solid white',
		'box-shadow': '0 0 0 4px var(--ink)',
		'scrollbar-width': 'thin',
		animation: 'panel-in 0.35s 0.05s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	section: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '4px',
		'flex-shrink': 0,
	},
	/**
	 * Plain white, no outline or shadow. Clear of the selected card's ring
	 * and its lift (see `cardSelected`), a card in the row under it, and
	 * drawn over them anyway.
	 */
	heading: {
		...OUTLINED,
		'text-shadow': 'none',
		position: 'relative',
		'z-index': 1,
		'font-size': '14px',
		'line-height': 1,
		'padding-top': '2px',
		'margin-bottom': '4px',
		width: `${COLUMNS * CARD_WIDTH + (COLUMNS - 1) * 6}px`,
		'align-self': 'center',
		'white-space': 'nowrap',
	},
	grid: {
		display: 'grid',
		'grid-template-columns': `repeat(${COLUMNS}, ${CARD_WIDTH}px)`,
		gap: '6px',
		'justify-content': 'center',
	},
	card: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'flex-end',
		gap: '3px',
		width: `${CARD_WIDTH}px`,
		height: `${CARD_HEIGHT}px`,
		padding: `3px ${CARD_PADDING}px 5px`,
		'box-sizing': 'border-box',
		background: 'rgba(255, 255, 255, 0.75)',
		border: `${CARD_BORDER}px solid transparent`,
		color: 'var(--ink)',
	},
	/**
	 * Their run strip, out to the card's very edge, over its padding and its
	 * border (see-through, but for the selected card's): anyone wider than
	 * the card (August, with his pram) is cut off there, rather than poking
	 * out over the next one.
	 */
	art: {
		display: 'flex',
		'justify-content': 'center',
		'flex-shrink': 0,
		width: `calc(100% + ${2 * (CARD_PADDING + CARD_BORDER)}px)`,
		margin: `0 -${CARD_PADDING + CARD_BORDER}px`,
		overflow: 'hidden',
	},
	/** Selected, the border's drawn: up to it, not over it. */
	artSelected: {
		width: `calc(100% + ${2 * CARD_PADDING}px)`,
		margin: `0 -${CARD_PADDING}px`,
	},
	cardCustom: {
		background: 'rgba(255, 210, 63, 0.75)',
	},
	cardNew: {
		background: 'rgba(255, 255, 255, 0.35)',
		color: 'white',
		border: '3px dashed white',
	},
	/** Not unlocked yet: a dark "?", hiding who it is. */
	cardLocked: {
		background: 'rgba(15, 31, 41, 0.6)',
		color: 'white',
		border: '3px dashed rgba(255, 255, 255, 0.5)',
	},
	cardSelected: {
		background: 'white',
		color: 'var(--ink)',
		border: '3px solid var(--ink)',
		'box-shadow': '0 0 0 3px #ffd23f, 4px 4px 0 3px #b33a2a',
		transform: 'translateY(-2px)',
	},
	/** For a runner lost on a light card (see `darkCard`): night behind them, picked or not. */
	cardDark: {
		background: '#241a3a',
		color: 'white',
	},
	cardName: {
		'max-width': '100%',
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
		'white-space': 'nowrap',
		'line-height': 1,
		height: '11px',
		'font-size': '11px',
		display: 'flex',
		'align-items': 'flex-end',
	},
	/** "+" to make one, or "?" for someone not unlocked yet. */
	mark: {
		'font-size': '34px',
		'line-height': 1,
		'margin-bottom': 'auto',
		'padding-top': '6px',
	},
	edit: {
		position: 'absolute',
		top: '2px',
		right: '2px',
		padding: '2px 3px 0',
		background: 'var(--ink)',
		color: 'white',
		border: 'none',
		'font-size': '9px',
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
