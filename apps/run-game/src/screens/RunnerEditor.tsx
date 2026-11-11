import { createRunnerFrames } from '@/utils/createRunnerFrames'
import { MAX_RACER_NAME_LENGTH } from '@/utils/customRacers'
import {
	For,
	type JSX,
	Match,
	Show,
	Switch,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
} from 'solid-js'
import {
	type CustomRunner,
	deleteCustomRunner,
	newRunnerId,
	saveCustomRunner,
} from '../runners/customRunners'
import {
	type Avatar,
	DEFAULT_AVATAR,
	NONE,
	ROWS,
	type Row,
	randomAvatar,
} from '../runners/looks'
import { play } from '../sfx'
import { Menu, OUTLINED, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { RunnerStage, nameSize } from '../ui/RunnerStage'

/** The row's next value along: `by` steps, wrapping round. */
function step<T>(options: T[], current: T, by: number): T {
	let at = options.indexOf(current)
	// A colour that's not in the palette (picked with the browser's colour
	// picker): stepping off it lands on either end.
	if (at < 0) at = by > 0 ? -1 : options.length
	return options[(at + by + options.length) % options.length]
}

type Action = 'save' | 'random' | 'cancel' | 'delete'

/**
 * Making a runner of your own, or changing one: a name, and their look, picked
 * the way the menus are. Up and down move between rows, left and right change
 * them.
 */
export function RunnerEditor(props: {
	/** The runner being changed, or none for a new one. */
	runner?: CustomRunner
	/** What the way back says: back to the runners, unless it's come from elsewhere. */
	backLabel?: string
	/** Saved: the runner as it now is. */
	onSave: (runner: CustomRunner) => void
	onCancel: () => void
	onDelete: () => void
}) {
	const [name, setName] = createSignal(props.runner?.name ?? '')
	const [avatar, setAvatar] = createSignal<Avatar>(
		props.runner?.avatar ?? DEFAULT_AVATAR,
	)
	/** The selected row, or the buttons under them. */
	const [selection, setSelection] = createSignal<Row | 'actions'>(ROWS[0])
	const [action, setAction] = createSignal<Action>('save')
	const [confirming, setConfirming] = createSignal(false)

	const rows = createMemo(() =>
		ROWS.filter(
			(row) => row.kind === 'name' || !row.show || row.show(avatar()),
		),
	)
	const selectedIndex = () => {
		const at = selection()
		return at === 'actions' ? rows().length : rows().indexOf(at)
	}
	const actions = (): Action[] =>
		props.runner
			? ['save', 'random', 'cancel', 'delete']
			: ['save', 'random', 'cancel']
	const frames = createMemo(() => createRunnerFrames(avatar()))

	let nameInput: HTMLInputElement | undefined
	const rowElements = new Map<Row, HTMLElement>()

	// The selected row going (the bald have no hair colour) leaves the
	// selection on the row above it.
	createEffect(() => {
		const at = selection()
		if (at === 'actions' || rows().includes(at)) return
		setSelection(
			ROWS.slice(0, ROWS.indexOf(at))
				.reverse()
				.find((row) => rows().includes(row)) ?? ROWS[0],
		)
	})
	// The name's typed into while it's selected, and let go of when it's not, so
	// W, A, S and D move about again. Not straight away, or the key that opened
	// the editor (E) would be typed into it.
	createEffect(() => {
		if (selection() === ROWS[0]) setTimeout(() => nameInput?.focus())
		else nameInput?.blur()
	})
	createEffect(() => {
		const at = selection()
		if (at !== 'actions')
			rowElements.get(at)?.scrollIntoView({ block: 'nearest' })
	})

	const select = (at: Row | 'actions') => {
		if (selection() === at) return
		setSelection(at)
		play('move')
	}
	const moveRow = (by: number) => {
		const count = rows().length + 1
		const next = (selectedIndex() + by + count) % count
		select(next === rows().length ? 'actions' : rows()[next])
	}

	const change = (row: Row, value: string) => {
		if (row.kind === 'name' || value === row.get(avatar())) return
		setAvatar(row.set(avatar(), value))
		play('move')
	}
	const cycle = (row: Row, by: number) => {
		if (row.kind === 'choice')
			change(
				row,
				step(
					row.options.map((option) => option.value),
					row.get(avatar()),
					by,
				),
			)
		if (row.kind === 'colour')
			change(row, step(row.palette, row.get(avatar()), by))
	}

	const save = () => {
		const trimmed = name().trim()
		if (!trimmed) {
			// Nobody to save without a name: back to it, with a shake.
			play('back')
			setSelection(ROWS[0])
			nameInput?.animate(
				[0, -6, 6, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })),
				{ duration: 300, easing: 'steps(6)' },
			)
			return
		}
		play('select')
		const runner = {
			id: props.runner?.id ?? newRunnerId(),
			name: trimmed,
			avatar: avatar(),
		}
		saveCustomRunner(runner)
		props.onSave(runner)
	}
	const cancel = () => {
		play('back')
		props.onCancel()
	}
	const doAction = (which: Action) => {
		if (which === 'save') return save()
		if (which === 'cancel') return cancel()
		play('select')
		if (which === 'random') setAvatar(randomAvatar(avatar()))
		if (which === 'delete') setConfirming(true)
	}

	const onKey = (event: KeyboardEvent) => {
		// The delete question's menu has the keys while it's up.
		if (confirming()) return
		const typing = !!nameInput && document.activeElement === nameInput
		const key = event.key
		/** Letters are only shortcuts when they're not being typed. */
		const letter = typing ? '' : key.toLowerCase()
		const by =
			key === 'ArrowLeft' || letter === 'a'
				? -1
				: key === 'ArrowRight' || letter === 'd'
					? 1
					: 0
		if (key === 'ArrowUp' || letter === 'w') {
			event.preventDefault()
			moveRow(-1)
		} else if (key === 'ArrowDown' || letter === 's') {
			event.preventDefault()
			moveRow(1)
		} else if (by && !typing) {
			event.preventDefault()
			const at = selection()
			if (at === 'actions') {
				setAction(step(actions(), action(), by))
				play('move')
			} else cycle(at, by)
		} else if (key === 'Enter' || letter === ' ') {
			event.preventDefault()
			if (selection() === 'actions') doAction(action())
			else save()
		} else if (letter === 'r') {
			doAction('random')
		} else if (key === 'Escape') {
			cancel()
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	const remove = () => {
		if (!props.runner) return
		deleteCustomRunner(props.runner.id)
		props.onDelete()
	}

	const shownName = () => name().trim() || 'Your name'

	return (
		<div style={styles.screen}>
			<div style={styles.top}>
				<button type="button" style={styles.back} onClick={cancel}>
					{props.backLabel ?? '← Runners'}
				</button>
				<div style={styles.title}>
					{props.runner ? 'Change your runner' : 'Make a runner'}
				</div>
			</div>

			<Panel style={styles.preview}>
				<RunnerStage>
					<RunStrip
						frame={frames().frames.run?.[0] ?? ''}
						width={frames().width}
						height={frames().height}
						scale={4}
						stride={0.42}
						style={{ position: 'relative', 'margin-bottom': '22px' }}
					/>
				</RunnerStage>
				<div
					style={{
						...styles.previewName,
						'font-size': `${nameSize(shownName(), [40, 30, 22])}px`,
						opacity: name().trim() ? 1 : 0.5,
					}}
				>
					{shownName()}
				</div>
				<div style={styles.previewTag}>Your runner</div>
				<div style={styles.go}>Enter to save!</div>
			</Panel>

			<Panel style={styles.form}>
				<div style={styles.rows}>
					<For each={rows()}>
						{(row) => {
							const isSelected = () => selection() === row
							return (
								<div
									ref={(el) => rowElements.set(row, el)}
									style={{
										...styles.row,
										...(isSelected() ? styles.rowSelected : {}),
									}}
									onMouseEnter={() => select(row)}
								>
									<span
										style={{
											...styles.cursor,
											visibility: isSelected() ? 'visible' : 'hidden',
										}}
									>
										→
									</span>
									<Switch>
										<Match when={row.kind === 'name'}>
											<label style={styles.nameLabel}>
												<span style={styles.label}>Name</span>
												<span style={styles.value}>
													<input
														ref={nameInput}
														type="text"
														style={{
															...styles.input,
															...(isSelected() ? styles.inputSelected : {}),
														}}
														value={name()}
														maxLength={MAX_RACER_NAME_LENGTH}
														placeholder="Who's running?"
														autocomplete="off"
														spellcheck={false}
														onInput={(event) =>
															setName(event.currentTarget.value)
														}
														onFocus={() => setSelection(row)}
													/>
													<span style={styles.counter}>
														{name().length}/{MAX_RACER_NAME_LENGTH}
													</span>
												</span>
											</label>
										</Match>
										<Match when={row.kind === 'choice' && row}>
											{(choice) => (
												<ChoiceRow
													row={choice()}
													avatar={avatar()}
													onCycle={(by) => cycle(choice(), by)}
												/>
											)}
										</Match>
										<Match when={row.kind === 'colour' && row}>
											{(colour) => (
												<ColourRow
													row={colour()}
													avatar={avatar()}
													onPick={(value) => change(colour(), value)}
												/>
											)}
										</Match>
									</Switch>
								</div>
							)
						}}
					</For>
				</div>

				<div style={styles.actions}>
					<For each={actions()}>
						{(which) => {
							const isSelected = () =>
								selection() === 'actions' && action() === which
							return (
								<button
									type="button"
									style={{
										...styles.action,
										...(which === 'delete' ? styles.actionDelete : {}),
										...(isSelected() ? styles.actionSelected : {}),
									}}
									onMouseEnter={() => {
										if (isSelected()) return
										setSelection('actions')
										setAction(which)
										play('move')
									}}
									onClick={() => doAction(which)}
								>
									{ACTION_LABELS[which]}
								</button>
							)
						}}
					</For>
				</div>
			</Panel>

			<div style={styles.hint}>
				↑↓ to pick · ←→ to change · R for random · Enter to save · Esc to go
				back
			</div>

			<Show when={confirming() && props.runner}>
				{(runner) => (
					<div style={styles.confirm}>
						<Panel title="Delete them?" style={{ width: '440px' }}>
							<p style={styles.warning}>
								{runner().name} will be gone for good.
							</p>
							<Menu
								items={[
									{
										label: 'No, keep them',
										choose: () => setConfirming(false),
									},
									{ label: 'Yes, delete them', choose: remove },
								]}
								onBack={() => setConfirming(false)}
							/>
						</Panel>
					</div>
				)}
			</Show>
		</div>
	)
}

const ACTION_LABELS: Record<Action, string> = {
	save: 'Save',
	random: 'Random',
	cancel: 'Cancel',
	delete: 'Delete',
}

function ChoiceRow(props: {
	row: Extract<Row, { kind: 'choice' }>
	avatar: Avatar
	onCycle: (by: number) => void
}) {
	const current = () =>
		props.row.options.find(
			(option) => option.value === props.row.get(props.avatar),
		)?.label
	return (
		<>
			<span style={styles.label}>{props.row.label}</span>
			<span style={styles.value}>
				<button
					type="button"
					style={styles.arrow}
					aria-label={`Previous ${props.row.label.toLowerCase()}`}
					onClick={() => props.onCycle(-1)}
				>
					◀
				</button>
				<span style={styles.choice}>{current()}</span>
				<button
					type="button"
					style={styles.arrow}
					aria-label={`Next ${props.row.label.toLowerCase()}`}
					onClick={() => props.onCycle(1)}
				>
					▶
				</button>
			</span>
		</>
	)
}

/**
 * A palette to pick from, and a last swatch for any colour at all, with the
 * browser's colour picker: it shows the colour when it's one of those.
 */
function ColourRow(props: {
	row: Extract<Row, { kind: 'colour' }>
	avatar: Avatar
	onPick: (value: string) => void
}) {
	const current = () => props.row.get(props.avatar)
	const isCustom = () => !props.row.palette.includes(current())
	return (
		<>
			<span style={styles.label}>{props.row.label}</span>
			<span style={{ ...styles.value, gap: '4px' }}>
				<For each={props.row.palette}>
					{(colour) => (
						<button
							type="button"
							aria-label={colour || 'None'}
							style={{
								...styles.swatch,
								background: colour || 'transparent',
								...(colour === NONE ? styles.swatchNone : {}),
								...(current() === colour ? styles.swatchPicked : {}),
							}}
							onClick={() => props.onPick(colour)}
						/>
					)}
				</For>
				<label
					style={{
						...styles.swatch,
						...styles.swatchCustom,
						...(isCustom()
							? { ...styles.swatchPicked, background: current() }
							: {}),
					}}
					title="Any colour"
				>
					<Show when={!isCustom()}>+</Show>
					<input
						type="color"
						style={styles.colourInput}
						value={current() || '#ffffff'}
						onInput={(event) => props.onPick(event.currentTarget.value)}
					/>
				</label>
			</span>
		</>
	)
}

const ROW_HEIGHT = 32

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
	form: {
		position: 'absolute',
		left: '316px',
		right: '24px',
		top: '84px',
		height: '398px',
		'box-sizing': 'border-box',
		padding: '12px',
		gap: '10px',
		animation: 'panel-in 0.35s 0.05s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	rows: {
		flex: 1,
		'min-height': 0,
		display: 'flex',
		'flex-direction': 'column',
		gap: '4px',
		overflow: 'hidden auto',
		'scrollbar-width': 'thin',
		// Room for the selected row's shadow.
		'padding-right': '6px',
		'padding-bottom': '4px',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '8px',
		'flex-shrink': 0,
		height: `${ROW_HEIGHT}px`,
		padding: '0 10px 0 6px',
		border: '3px solid transparent',
		'font-size': '19px',
		'line-height': 1,
		'white-space': 'nowrap',
		cursor: 'pointer',
	},
	rowSelected: {
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
		'box-shadow': '4px 4px 0 #b33a2a',
	},
	cursor: {
		width: '18px',
		'text-align': 'center',
		animation: 'cursor-bob 0.6s ease-in-out infinite alternate',
	},
	nameLabel: {
		display: 'contents',
		cursor: 'text',
	},
	label: {
		width: '150px',
		'padding-top': '3px',
	},
	value: {
		flex: 1,
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
	},
	arrow: {
		padding: '2px 4px 0',
		background: 'none',
		border: 'none',
		color: 'inherit',
		'font-size': '14px',
	},
	choice: {
		width: '150px',
		'text-align': 'center',
		'padding-top': '3px',
	},
	input: {
		width: '250px',
		height: '24px',
		padding: '3px 8px 0',
		'box-sizing': 'border-box',
		background: 'var(--ink)',
		color: 'white',
		border: '2px solid white',
		outline: 'none',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
		'-webkit-user-select': 'text',
		'user-select': 'text',
	},
	inputSelected: {
		border: '2px solid var(--ink)',
	},
	counter: {
		'font-size': '14px',
		opacity: 0.7,
		'padding-top': '3px',
	},
	swatch: {
		position: 'relative',
		display: 'grid',
		'place-items': 'center',
		width: '20px',
		height: '20px',
		padding: 0,
		'box-sizing': 'border-box',
		border: '2px solid var(--ink)',
		'box-shadow': '0 0 0 1px rgba(255, 255, 255, 0.6)',
		'flex-shrink': 0,
	},
	swatchNone: {
		background:
			'linear-gradient(to top right, transparent 42%, var(--bus-red) 42%, var(--bus-red) 58%, transparent 58%), white',
	},
	swatchCustom: {
		background: 'var(--ink)',
		color: 'white',
		'font-size': '16px',
		'line-height': 1,
		cursor: 'pointer',
	},
	swatchPicked: {
		transform: 'scale(1.3)',
		'box-shadow': '0 0 0 2px white, 2px 2px 0 2px #b33a2a',
		'z-index': 1,
	},
	colourInput: {
		position: 'absolute',
		inset: 0,
		opacity: 0,
		width: '100%',
		height: '100%',
		padding: 0,
		border: 'none',
		cursor: 'pointer',
	},
	actions: {
		display: 'flex',
		gap: '10px',
		'padding-top': '10px',
		'border-top': '3px solid rgba(255, 255, 255, 0.25)',
	},
	action: {
		padding: '8px 16px 4px',
		background: 'transparent',
		color: 'white',
		border: '3px solid white',
		'font-size': '20px',
		'line-height': 1,
	},
	actionDelete: {
		'margin-left': 'auto',
	},
	actionSelected: {
		background: '#ffd23f',
		color: 'var(--ink)',
		'box-shadow': '4px 4px 0 #b33a2a',
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
	confirm: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'var(--overlay-black-50)',
		'z-index': 2,
	},
	warning: {
		margin: '0 0 6px',
		'font-family': '"Cabin", sans-serif',
		'font-size': '17px',
		'line-height': 1.35,
		'text-align': 'center',
	},
} satisfies Record<string, JSX.CSSProperties>
