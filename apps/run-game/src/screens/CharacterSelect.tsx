import { For, type JSX, Show, createEffect, onCleanup } from 'solid-js'
import { touchScreen } from '../input'
import { UNLOCKABLES } from '../runners/bonus'
import { type CustomRunner, customRunners } from '../runners/customRunners'
import { CLUB, type Playable, customPlayable } from '../runners/playable'
import { runnerUnlocked } from '../saved/unlocked'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { RunStrip, tallWithHat } from '../ui/RunStrip'
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

/**
 * Cards across a row: enough, with `CARD_HEIGHT`, for a row of your own
 * runners, then two rows each of the club and the unlocks, all on the
 * screen at once without scrolling.
 */
const COLUMNS = 9

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
	/** The selected card, if it's someone not unlocked yet. */
	const locked = () => {
		const entry = selected()
		return entry?.kind === 'locked' ? entry : undefined
	}
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
							when={locked()}
							fallback={
								<>
									<RunnerStage path={false} height={STAGE_HEIGHT}>
										<div style={styles.bigPlus}>+</div>
									</RunnerStage>
									<div style={{ ...styles.previewName, 'font-size': '30px' }}>
										New runner
									</div>
									<div style={styles.previewTag}>Make one of your own</div>
								</>
							}
						>
							{(entry) => (
								<>
									<RunnerStage path={false} height={STAGE_HEIGHT}>
										<div style={styles.bigPlus}>?</div>
									</RunnerStage>
									<div style={{ ...styles.previewName, 'font-size': '40px' }}>
										???
									</div>
									<div style={styles.previewTag}>Not unlocked yet</div>
									{/* Still a "?": what it'll take. */}
									<Show when={entry().runner.unlock}>
										{(how) => <div style={styles.previewUnlocked}>{how()}</div>}
									</Show>
								</>
							)}
						</Show>
					}
				>
					{(entry) => {
						const runner = () =>
							(entry() as Extract<Entry, { kind: 'runner' }>).runner
						return (
							<>
								<RunnerStage height={STAGE_HEIGHT}>
									<RunStrip
										run={runner().sprite.run}
										hat={runner().sprite.ownHat}
										width={runner().sprite.width}
										height={runner().sprite.height}
										scale={previewScale(runner().sprite)}
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
								<Show when={runner().tagline}>
									{(line) => <div style={styles.previewTagline}>{line()}</div>}
								</Show>
								{/* Unlocks need no tag, bonus or member: the Unlocks heading says it. */}
								<Show when={!runner().bonus && !runner().unlock}>
									<div style={styles.previewTag}>
										{runner().custom
											? touchScreen()
												? 'Your runner · Edit to change'
												: 'Your runner · Press E to edit'
											: 'Club member'}
									</div>
								</Show>
								{/* Unlocked: where they were found. */}
								<Show when={runner().unlock}>
									{(how) => <div style={styles.previewUnlocked}>{how()}</div>}
								</Show>
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
														...(entry.kind === 'new' ? styles.cardNew : {}),
														...(entry.kind === 'locked'
															? styles.cardLocked
															: {}),
														...(isSelected() ? styles.cardSelected : {}),
														// Anyone, picked or not, on the same sky and grass.
														...(runner ? styles.cardStage : {}),
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
																<div style={styles.art}>
																	<RunStrip
																		run={runner().sprite.run}
																		// No own hat on a card: it's too small to fit.
																		width={runner().sprite.width}
																		height={runner().sprite.height}
																		scale={CARD_ART_SCALE}
																		stride={isSelected() ? 0.4 : 0.6}
																	/>
																</div>
																<span
																	style={{
																		...styles.cardName,
																		// A card's narrow: past seven letters smaller,
																		// past ten smaller still, and past twelve the
																		// smallest ("Spirit of Jazz").
																		'font-size': `${runner().name.length > 12 ? 6 : nameSize(runner().name, [10, 8, 7], [7, 10])}px`,
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
															style={{
																...styles.edit,
																// Lifted with its card, picked.
																...(isSelected() ? styles.editLifted : {}),
															}}
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

/**
 * The preview's stage, the same height whoever's on it, with room under it
 * for a name, a tagline, a tag and where they're unlocked over Run.
 */
const STAGE_HEIGHT = 200
/** The preview panel's width, and its padding. */
const PREVIEW_WIDTH = 270
const PREVIEW_PADDING = 16
/**
 * The stage's width inside its border: the preview's, less the panel's
 * 4 px border, its padding and the stage's own 3 px border.
 */
const STAGE_INSIDE = PREVIEW_WIDTH - 2 * (4 + PREVIEW_PADDING) - 2 * 3
/** How big the preview's runner is drawn: a runner's 29 px tall, so 145 px. */
const PREVIEW_SCALE = 5
/**
 * Someone too wide for the stage at `PREVIEW_SCALE` (August, with his pram),
 * or too tall in their own hat (the Spirit of Jazz), is drawn as big as
 * fits instead, in whole pixels still.
 */
const previewScale = (sprite: Playable['sprite']) =>
	Math.min(
		PREVIEW_SCALE,
		Math.floor(STAGE_INSIDE / sprite.width),
		// Their own hat on too, if they've one, under the stage's top.
		Math.floor(STAGE_ROOM / tallWithHat(sprite)),
	)
/** How much of the stage's height they're drawn in: over the path, inside its border. */
const STAGE_ROOM = STAGE_HEIGHT - 22 - 2 * 3

const CARD_WIDTH = 60
const CARD_HEIGHT = 63
/** How big a card's runner is drawn: a runner's 29 px tall, so 36 px. */
const CARD_ART_SCALE = 1.25
/**
 * Where the preview and the cards' panels start, under the title, and how
 * tall they are: down to just over the hint along the bottom.
 */
const PANEL_TOP = 76
const PANEL_HEIGHT = 420
/** A card's padding at the sides, and its border. */
const CARD_PADDING = 3
const CARD_BORDER = 3
/** How far a card's lifted, picked: its Edit button with it. */
const CARD_LIFT = 'translateY(-2px)'
/** Room round a card's name for its outline. */
const NAME_ROOM = 2
/** A runner's name's outline, on their card: 2 px of ink all the way round it, its corners too. */
const NAME_OUTLINE = [
	[2, 0],
	[-2, 0],
	[0, 2],
	[0, -2],
	[2, 2],
	[-2, 2],
	[2, -2],
	[-2, -2],
	[1, 2],
	[-1, 2],
	[1, -2],
	[-1, -2],
	[2, 1],
	[-2, 1],
	[2, -1],
	[-2, -1],
]
	.map(([x, y]) => `${x}px ${y}px var(--ink)`)
	.join(', ')

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
	preview: {
		position: 'absolute',
		left: '24px',
		top: `${PANEL_TOP}px`,
		width: `${PREVIEW_WIDTH}px`,
		height: `${PANEL_HEIGHT}px`,
		'box-sizing': 'border-box',
		padding: `${PREVIEW_PADDING}px`,
		'align-items': 'center',
		gap: '8px',
	},
	bigPlus: {
		'font-size': '150px',
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
	/** A line about an unlocked runner, under their name. */
	previewTagline: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '15px',
		'font-style': 'italic',
		'flex-shrink': 0,
		'text-align': 'center',
		'line-height': 1.25,
		'max-width': '100%',
	},
	previewTag: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '14px',
		opacity: 0.8,
		'white-space': 'nowrap',
	},
	/** Where someone's unlocked, under their tag: one line. */
	previewUnlocked: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '13px',
		'flex-shrink': 0,
		color: '#ffd23f',
		'white-space': 'nowrap',
		'line-height': 1.25,
	},
	/** Run! Big enough for a thumb, and pulsing, so it's plain it's what to press. */
	go: {
		'margin-top': 'auto',
		padding: '10px 22px',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid var(--ink)',
		'font-family': 'var(--font-pixel)',
		'font-size': '24px',
		'box-shadow': '4px 4px 0 #b33a2a',
		'flex-shrink': 0,
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
		top: `${PANEL_TOP}px`,
		height: `${PANEL_HEIGHT}px`,
		overflow: 'hidden auto',
		// 4 px under the last row: the selected card's ring and shadow, less
		// its lift, reach 3 px below it. Any more and five rows don't fit.
		padding: '4px 8px',
		display: 'flex',
		'flex-direction': 'column',
		gap: '4px',
		// Rows between the first and last scroll into view with the padding too.
		'scroll-padding': '8px',
		'box-sizing': 'border-box',
		background: 'rgba(15, 31, 41, 0.55)',
		border: '4px solid white',
		'box-shadow': '0 0 0 4px var(--ink)',
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
		'padding-top': '1px',
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
		padding: `3px ${CARD_PADDING}px 3px`,
		'box-sizing': 'border-box',
		background: 'rgba(255, 255, 255, 0.75)',
		border: `${CARD_BORDER}px solid transparent`,
		color: 'var(--ink)',
	},
	/**
	 * Their run strip, out to the card's border, over its padding: anyone
	 * wider than the card (August, with his pram) is cut off there, rather
	 * than poking out over the next one.
	 */
	art: {
		display: 'flex',
		'justify-content': 'center',
		'flex-shrink': 0,
		width: `calc(100% + ${2 * CARD_PADDING}px)`,
		margin: `0 -${CARD_PADDING}px`,
		overflow: 'hidden',
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
		'box-shadow': '0 0 0 3px #ffd23f, 2px 2px 0 3px #b33a2a',
		transform: CARD_LIFT,
	},
	/**
	 * A runner's card, members, custom runners and unlocked alike: a little
	 * of the stage they're shown on, sky over grass, standing in it up to
	 * halfway up their legs, their name on the grass, in white.
	 */
	cardStage: {
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom) 60%, var(--grass-green) 60%, var(--grass-dark-green))',
		// Over the whole card, its border too: not repeated round into it.
		'background-origin': 'border-box',
		// Framed in black, picked or not: picked, ringed in yellow too.
		border: `${CARD_BORDER}px solid var(--ink)`,
		color: 'white',
		// Outlined, 2 px all round: readable on the grass, however small.
		'text-shadow': NAME_OUTLINE,
	},
	/**
	 * Out to the card's border, over its padding, as its art is: room for
	 * "Ms Crocodile". With room round it for its outline, not cut off by
	 * it: 2 px more each way, taken back off by its margin.
	 */
	cardName: {
		'max-width': `calc(100% + ${2 * CARD_PADDING}px)`,
		margin: `-${NAME_ROOM}px -${CARD_PADDING}px`,
		padding: `${NAME_ROOM}px`,
		'box-sizing': 'content-box',
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
		'white-space': 'nowrap',
		'line-height': 1,
		height: '11px',
		// Never squeezed by what's over it, cutting off its letters' feet.
		'flex-shrink': 0,
		'font-size': '11px',
		display: 'flex',
		'align-items': 'flex-end',
	},
	/** "+" to make one, or "?" for someone not unlocked yet. */
	mark: {
		'font-size': '30px',
		'line-height': 1,
		'margin-bottom': 'auto',
		'padding-top': '3px',
	},
	/** Up in the card's top right corner, over its border. */
	edit: {
		position: 'absolute',
		top: 0,
		right: 0,
		padding: '2px 3px 0',
		background: 'var(--ink)',
		color: 'white',
		border: 'none',
		'font-size': '9px',
	},
	/** As its card is, picked (see `cardSelected`). */
	editLifted: {
		transform: CARD_LIFT,
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
