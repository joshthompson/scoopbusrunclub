import { createRunnerFrames } from '@/utils/createRunnerFrames'
import { MAX_RACER_NAME_LENGTH } from '@/utils/customRacers'
import {
	For,
	type JSX,
	Match,
	Show,
	Switch,
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
import { RunStrip } from '../ui/RunStrip'
import { nameSize } from '../ui/RunnerStage'

/**
 * Making a runner of your own, or changing one, on a phone: the runner up
 * top, running, and under them everything about their look, each a row of
 * big buttons to tap, scrolled through with a thumb. The same runner the
 * game's own editor makes (see `RunnerEditor`), laid out for a phone, held
 * either way up, rather than a big screen shrunk.
 */
export function PadRunnerEditor(props: {
	/** The runner being changed, or none for a new one. */
	runner?: CustomRunner
	/** A new runner's name to start with: what the Player goes by, if they've said. */
	suggestedName?: string
	onSave: (runner: CustomRunner) => void
	onCancel: () => void
	onDelete: () => void
}) {
	const [name, setName] = createSignal(
		props.runner?.name ?? props.suggestedName ?? '',
	)
	const [avatar, setAvatar] = createSignal<Avatar>(
		props.runner?.avatar ?? DEFAULT_AVATAR,
	)
	const [confirming, setConfirming] = createSignal(false)
	const [missingName, setMissingName] = createSignal(false)
	const frames = createMemo(() => createRunnerFrames(avatar()))
	const rows = createMemo(() =>
		ROWS.filter(
			(row): row is Exclude<Row, { kind: 'name' }> =>
				row.kind !== 'name' && (!row.show || row.show(avatar())),
		),
	)

	/** On its side, and wide enough: the runner beside the rows, not over them. */
	const sideways = () =>
		window.innerWidth > window.innerHeight && window.innerWidth >= 560
	const [wide, setWide] = createSignal(sideways())
	const onResize = () => setWide(sideways())
	window.addEventListener('resize', onResize)
	onCleanup(() => window.removeEventListener('resize', onResize))

	let nameInput: HTMLInputElement | undefined

	const change = (row: Exclude<Row, { kind: 'name' }>, value: string) => {
		if (value === row.get(avatar())) return
		navigator.vibrate?.(6)
		setAvatar(row.set(avatar(), value))
	}
	const save = () => {
		const trimmed = name().trim()
		if (!trimmed) {
			// Nobody to save without a name: back to it, with a shake.
			setMissingName(true)
			nameInput?.scrollIntoView({ block: 'center', behavior: 'smooth' })
			nameInput?.focus()
			nameInput?.animate(
				[0, -6, 6, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })),
				{ duration: 300, easing: 'steps(6)' },
			)
			return
		}
		navigator.vibrate?.(15)
		const runner = {
			id: props.runner?.id ?? newRunnerId(),
			name: trimmed,
			avatar: avatar(),
		}
		saveCustomRunner(runner)
		props.onSave(runner)
	}
	const remove = () => {
		if (!props.runner) return
		deleteCustomRunner(props.runner.id)
		props.onDelete()
	}

	const shownName = () => name().trim() || 'Your runner'

	/** Save (and Delete), at the bottom, or on its side, under the runner. */
	const footer = () => (
		<div style={{ ...styles.footer, ...(wide() ? styles.footerWide : {}) }}>
			<Show
				when={confirming()}
				fallback={
					<>
						<Show when={props.runner}>
							<button
								type="button"
								style={styles.delete}
								onClick={() => setConfirming(true)}
							>
								Delete
							</button>
						</Show>
						<button type="button" style={styles.save} onClick={save}>
							Save
						</button>
					</>
				}
			>
				<span style={styles.confirmText}>Delete them for good?</span>
				<button
					type="button"
					style={styles.delete}
					onClick={() => setConfirming(false)}
				>
					Keep
				</button>
				<button
					type="button"
					style={{
						...styles.save,
						background: 'var(--bus-red)',
						color: 'white',
					}}
					onClick={remove}
				>
					Delete
				</button>
			</Show>
		</div>
	)

	const preview = (
		<div style={{ ...styles.preview, ...(wide() ? styles.previewWide : {}) }}>
			<div style={styles.stage}>
				<RunStrip
					frame={frames().frames.run?.[0] ?? ''}
					width={frames().width}
					height={frames().height}
					scale={wide() ? 4 : 3.5}
					stride={0.42}
					style={{ 'margin-bottom': '14px' }}
				/>
			</div>
			<div
				style={{
					...styles.previewName,
					'font-size': `${nameSize(shownName(), [28, 22, 18])}px`,
					opacity: name().trim() ? 1 : 0.5,
				}}
			>
				{shownName()}
			</div>
			<Show when={wide()}>{footer()}</Show>
		</div>
	)

	return (
		<div style={styles.screen}>
			<div style={styles.top}>
				<button type="button" style={styles.topButton} onClick={props.onCancel}>
					← Back
				</button>
				<div style={styles.title}>
					{props.runner ? 'Change runner' : 'Make a runner'}
				</div>
				<button
					type="button"
					style={styles.topButton}
					onClick={() => {
						navigator.vibrate?.(10)
						setAvatar(randomAvatar(avatar()))
					}}
				>
					Random
				</button>
			</div>

			<div style={{ ...styles.body, ...(wide() ? styles.bodyWide : {}) }}>
				{preview}
				<div style={styles.rows}>
					<label style={styles.section}>
						<span style={styles.label}>Name</span>
						<span style={styles.nameRow}>
							<input
								ref={nameInput}
								type="text"
								style={{
									...styles.input,
									...(missingName() && !name().trim()
										? { 'border-color': 'var(--bus-red)' }
										: {}),
								}}
								value={name()}
								maxLength={MAX_RACER_NAME_LENGTH}
								placeholder="Who's running?"
								autocomplete="off"
								autocapitalize="words"
								spellcheck={false}
								enterkeyhint="done"
								onInput={(event) => setName(event.currentTarget.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') event.currentTarget.blur()
								}}
							/>
							<span style={styles.counter}>
								{name().length}/{MAX_RACER_NAME_LENGTH}
							</span>
						</span>
					</label>
					<For each={rows()}>
						{(row) => (
							<div style={styles.section}>
								<span style={styles.label}>{row.label}</span>
								<Switch>
									<Match when={row.kind === 'choice' && row}>
										{(choice) => (
											<div style={styles.chips}>
												<For each={choice().options}>
													{(option) => {
														const on = () =>
															choice().get(avatar()) === option.value
														return (
															<button
																type="button"
																aria-pressed={on()}
																style={{
																	...styles.chip,
																	...(on() ? styles.chipOn : {}),
																}}
																onClick={() => change(choice(), option.value)}
															>
																{option.label}
															</button>
														)
													}}
												</For>
											</div>
										)}
									</Match>
									<Match when={row.kind === 'colour' && row}>
										{(colour) => (
											<Swatches
												row={colour()}
												avatar={avatar()}
												onPick={(value) => change(colour(), value)}
											/>
										)}
									</Match>
								</Switch>
							</div>
						)}
					</For>
				</div>
			</div>

			<Show when={!wide()}>{footer()}</Show>
		</div>
	)
}

/**
 * A colour row: its palette as big swatches to tap, and a last one for any
 * colour at all, with the phone's own colour picker.
 */
function Swatches(props: {
	row: Extract<Row, { kind: 'colour' }>
	avatar: Avatar
	onPick: (value: string) => void
}) {
	const current = () => props.row.get(props.avatar)
	const isCustom = () => !props.row.palette.includes(current())
	return (
		<div style={styles.swatches}>
			<For each={props.row.palette}>
				{(colour) => (
					<button
						type="button"
						aria-label={colour || 'None'}
						aria-pressed={current() === colour}
						style={{
							...styles.swatch,
							background: colour || 'transparent',
							...(colour === NONE ? styles.swatchNone : {}),
							...(current() === colour ? styles.swatchOn : {}),
						}}
						onClick={() => props.onPick(colour)}
					/>
				)}
			</For>
			<label
				style={{
					...styles.swatch,
					...styles.swatchCustom,
					...(isCustom() ? { ...styles.swatchOn, background: current() } : {}),
				}}
				aria-label="Any colour"
			>
				<Show when={!isCustom()}>+</Show>
				<input
					type="color"
					style={styles.colourInput}
					value={current() || '#ffffff'}
					onInput={(event) => props.onPick(event.currentTarget.value)}
				/>
			</label>
		</div>
	)
}

const YELLOW = '#ffd23f'

const styles = {
	screen: {
		flex: 1,
		'min-height': 0,
		display: 'flex',
		'flex-direction': 'column',
		background: 'var(--ink)',
		color: 'white',
	},
	top: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'space-between',
		gap: '8px',
		padding: '8px 10px',
		'border-bottom': '3px solid rgba(255, 255, 255, 0.2)',
	},
	title: { 'font-size': '20px', 'white-space': 'nowrap' },
	topButton: {
		'min-height': '40px',
		padding: '6px 12px 3px',
		background: 'transparent',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '16px',
	},
	body: {
		flex: 1,
		'min-height': 0,
		display: 'flex',
		'flex-direction': 'column',
	},
	bodyWide: { 'flex-direction': 'row' },
	preview: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'flex-shrink': 0,
		'border-bottom': '3px solid rgba(255, 255, 255, 0.2)',
	},
	previewWide: {
		width: '40%',
		'border-bottom': 'none',
		'border-right': '3px solid rgba(255, 255, 255, 0.2)',
	},
	/** Sky, and grass to stand on. */
	stage: {
		display: 'flex',
		'align-items': 'flex-end',
		'justify-content': 'center',
		'align-self': 'stretch',
		height: '150px',
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom) 82%, var(--grass-green) 82%)',
	},
	previewName: {
		padding: '8px 12px 6px',
		color: YELLOW,
		'white-space': 'nowrap',
		'line-height': 1,
		'text-shadow': '2px 2px 0 #b33a2a',
	},
	rows: {
		flex: 1,
		'min-height': 0,
		'overflow-y': 'auto',
		'touch-action': 'pan-y',
		'overscroll-behavior': 'contain',
		display: 'flex',
		'flex-direction': 'column',
		gap: '18px',
		padding: '14px 14px 24px',
	},
	section: { display: 'flex', 'flex-direction': 'column', gap: '8px' },
	label: { 'font-size': '15px', opacity: 0.75 },
	nameRow: { display: 'flex', 'align-items': 'center', gap: '10px' },
	input: {
		flex: 1,
		'min-width': 0,
		height: '48px',
		padding: '4px 12px 0',
		'box-sizing': 'border-box',
		background: 'white',
		color: 'var(--ink)',
		border: `3px solid ${YELLOW}`,
		outline: 'none',
		'border-radius': 0,
		'font-family': 'var(--font-pixel)',
		// 16px or more, or iOS zooms in on it.
		'font-size': '20px',
		'-webkit-user-select': 'text',
		'user-select': 'text',
	},
	counter: { 'font-size': '13px', opacity: 0.6 },
	chips: { display: 'flex', 'flex-wrap': 'wrap', gap: '8px' },
	chip: {
		'min-height': '42px',
		padding: '6px 12px 3px',
		background: 'transparent',
		color: 'white',
		border: '3px solid rgba(255, 255, 255, 0.5)',
		'font-family': 'var(--font-pixel)',
		'font-size': '16px',
	},
	chipOn: {
		background: YELLOW,
		color: 'var(--ink)',
		'border-color': 'white',
	},
	swatches: { display: 'flex', 'flex-wrap': 'wrap', gap: '8px' },
	swatch: {
		position: 'relative',
		display: 'grid',
		'place-items': 'center',
		width: '40px',
		height: '40px',
		padding: 0,
		'box-sizing': 'border-box',
		border: '3px solid rgba(255, 255, 255, 0.35)',
		'flex-shrink': 0,
	},
	swatchNone: {
		background:
			'linear-gradient(to top right, transparent 42%, var(--bus-red) 42%, var(--bus-red) 58%, transparent 58%), white',
	},
	swatchCustom: {
		background: 'transparent',
		color: 'white',
		'font-size': '22px',
		'line-height': 1,
		'border-style': 'dashed',
	},
	swatchOn: {
		border: `4px solid ${YELLOW}`,
		'box-shadow': '0 0 0 2px var(--ink), 0 0 0 4px white',
	},
	colourInput: {
		position: 'absolute',
		inset: 0,
		opacity: 0,
		width: '100%',
		height: '100%',
		padding: 0,
		border: 'none',
	},
	footer: {
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		padding: '10px 14px',
		'border-top': '3px solid rgba(255, 255, 255, 0.2)',
	},
	footerWide: {
		'align-self': 'stretch',
		'margin-top': 'auto',
		'flex-wrap': 'wrap',
	},
	confirmText: { flex: 1, 'font-size': '16px' },
	save: {
		flex: 1,
		'min-height': '52px',
		padding: '8px 16px 4px',
		background: YELLOW,
		color: 'var(--ink)',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '22px',
	},
	delete: {
		'min-height': '52px',
		padding: '8px 16px 4px',
		background: 'transparent',
		color: 'white',
		border: '3px solid rgba(255, 255, 255, 0.5)',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
	},
} satisfies Record<string, JSX.CSSProperties>
