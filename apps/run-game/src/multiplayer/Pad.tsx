import {
	For,
	type JSX,
	Match,
	Show,
	Switch,
	createSignal,
	lazy,
	onCleanup,
	onMount,
} from 'solid-js'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import { type Action, anyControls } from '../input'
import { type CustomRunner, customRunners } from '../runners/customRunners'
import { MEMBERS, type Playable, customPlayable } from '../runners/playable'
import { RunnerEditor } from '../screens/RunnerEditor'
import { RunStrip } from '../ui/RunStrip'
import { nameSize } from '../ui/RunnerStage'
import { Medal, ordinal, pts } from './Medal'
import { Scanner } from './Scanner'
import { isPicked, joinAsGuest, lastMode, rememberMode } from './guest'
import {
	CODE_LENGTH,
	type PadMode,
	type PadView,
	type RoomMode,
	cleanCode,
} from './protocol'
import { ROOM_MODES, roomModeInfo } from './roomModes'
import { statusText } from './status'

/** The race on the phone, for Remote Play: the game itself, so only loaded then. */
const Mirror = lazy(() => import('./Mirror'))

const MEMBERS_BY_NAME = [...MEMBERS].sort((a, b) =>
	a.name.localeCompare(b.name),
)

/** How this phone played last time, under this, to start on next time. */
const MODE_KEY = 'pad-mode'

/**
 * A phone in a Room: joined with the QR code (scanned with the camera app,
 * or in here) or the Room Code, as a Phone Controller, being one Player's
 * buttons while the race is on the big screen, or as a Remote Player, with
 * the race on the phone too.
 */
export default function Pad() {
	const fromLink = cleanCode(
		new URLSearchParams(location.search).get('pad') ?? '',
	)
	const [code, setCode] = createSignal(
		fromLink.length === CODE_LENGTH ? fromLink : '',
	)
	const [mode, setMode] = createSignal<PadMode>()
	const choose = (next: PadMode) => {
		rememberMode(MODE_KEY, next)
		setMode(next)
	}
	const leave = () => {
		setCode('')
		setMode(undefined)
	}
	const screens = () => (
		<Switch>
			<Match when={!code()}>
				<CodeEntry onCode={setCode} />
			</Match>
			<Match when={!mode()}>
				<ModePicker code={code()} onPick={choose} onBack={leave} />
			</Match>
			<Match when={code()} keyed>
				{(joined) => (
					<Controller
						code={joined}
						mode={mode() ?? 'controller'}
						onMode={choose}
						onLeave={leave}
					/>
				)}
			</Match>
		</Switch>
	)
	return <div style={styles.page}>{screens()}</div>
}

function CodeEntry(props: { onCode: (code: string) => void }) {
	const [typed, setTyped] = createSignal('')
	const [scanning, setScanning] = createSignal(false)
	return (
		<Show
			when={!scanning()}
			fallback={
				<Scanner onCode={props.onCode} onCancel={() => setScanning(false)} />
			}
		>
			<div style={styles.centre}>
				<div style={styles.heading}>Join a Room</div>
				<button
					type="button"
					style={styles.bigButton}
					onClick={() => setScanning(true)}
				>
					Scan the QR code
				</button>
				<div style={styles.text}>Or type the code on the big screen:</div>
				<input
					style={styles.codeInput}
					value={typed()}
					maxLength={CODE_LENGTH}
					autocapitalize="characters"
					autocomplete="off"
					onInput={(event) => setTyped(cleanCode(event.currentTarget.value))}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && typed().length === CODE_LENGTH)
							props.onCode(typed())
					}}
				/>
				<button
					type="button"
					style={styles.smallButton}
					disabled={typed().length !== CODE_LENGTH}
					onClick={() => props.onCode(typed())}
				>
					Join
				</button>
				<a href={import.meta.env.BASE_URL} style={styles.homeLink}>
					← Back to the game
				</a>
			</div>
		</Show>
	)
}

/** Watching the race on the big screen, or on the phone. */
function ModePicker(props: {
	code: string
	onPick: (mode: PadMode) => void
	onBack: () => void
}) {
	const last = lastMode(MODE_KEY, 'controller')
	const option = (mode: PadMode, title: string, text: string) => (
		<button
			type="button"
			style={{
				...styles.modeButton,
				...(mode === last ? { 'border-color': '#ffd23f' } : {}),
			}}
			onClick={() => props.onPick(mode)}
		>
			<span style={{ 'font-size': '26px' }}>{title}</span>
			<span style={styles.modeText}>{text}</span>
		</button>
	)
	return (
		<div style={styles.centre}>
			<div style={styles.heading}>Where will you watch the race?</div>
			<div style={styles.text}>Room {props.code}</div>
			{option(
				'controller',
				'On the big screen',
				'In the same room as it. Your phone’s just the buttons.',
			)}
			{option(
				'remote',
				'On this phone',
				'Somewhere else? The race on your phone, the buttons under it.',
			)}
			<div style={{ ...styles.text, 'font-size': '15px' }}>
				You can change this in the lobby
			</div>
			<button type="button" style={styles.smallButton} onClick={props.onBack}>
				Another Room
			</button>
		</div>
	)
}

/** Where the race is watched, big and plain to see: on the big screen, or on this phone. */
function WatchToggle(props: {
	mode: PadMode
	onMode: (mode: PadMode) => void
}) {
	const option = (mode: PadMode, label: string) => {
		const on = () => props.mode === mode
		return (
			<button
				type="button"
				aria-pressed={on()}
				style={{ ...styles.watchOption, ...(on() ? styles.readyOn : {}) }}
				onClick={() => {
					if (on()) return
					navigator.vibrate?.(8)
					props.onMode(mode)
				}}
			>
				<span style={styles.modeMark}>
					<Show when={on()}>
						<span style={styles.modeDot} />
					</Show>
				</span>
				{label}
			</button>
		)
	}
	return (
		<div style={styles.watch}>
			<div style={styles.watchLabel}>Watch the race</div>
			<div style={styles.watchOptions}>
				{option('controller', 'Big screen')}
				{option('remote', 'This phone')}
			</div>
		</div>
	)
}

function Controller(props: {
	code: string
	mode: PadMode
	onMode: (mode: PadMode) => void
	onLeave: () => void
}) {
	// The buttons, and the keyboard too, for trying it out on a computer.
	const [touched, setTouched] = createSignal<Set<Action>>(new Set())
	const held = () => {
		const keys = anyControls()
		const touch = touched()
		return {
			left: keys.left || touch.has('left'),
			right: keys.right || touch.has('right'),
			up: keys.up || touch.has('up'),
			down: keys.down || touch.has('down'),
		}
	}
	const link = joinAsGuest({
		code: props.code,
		mode: () => props.mode,
		held,
	})
	const { view, gone, lost, start, feed, send } = link

	/** Changing who they'll be, after picking. */
	const [choosing, setChoosing] = createSignal(false)
	/** Making a runner of their own, or changing one: `runner` is the one being changed. */
	const [editing, setEditing] = createSignal<{ runner?: CustomRunner }>()

	const switchMode = (mode: PadMode) => {
		props.onMode(mode)
		link.switchMode(mode)
	}
	/** How much room the race gets, playing remotely: the phone's width, and about half its height. */
	const size = () => ({ width: window.innerWidth, height: window.innerHeight })
	const [screen, setScreen] = createSignal(size())
	const resize = () => setScreen(size())
	window.addEventListener('resize', resize)
	onCleanup(() => window.removeEventListener('resize', resize))
	const watching = () =>
		props.mode === 'remote' && view()?.stage === 'round' && start()
	// Kept awake: a phone that locks drops out of the Room.
	let wake: WakeLockSentinel | undefined
	const keepAwake = async () => {
		if (document.visibilityState !== 'visible') return
		try {
			wake = await navigator.wakeLock?.request('screen')
		} catch {
			// Not allowed, or not supported: it'll lock on its own timer.
		}
	}
	onMount(() => void keepAwake())
	document.addEventListener('visibilitychange', keepAwake)

	onCleanup(() => {
		document.removeEventListener('visibilitychange', keepAwake)
		void wake?.release()
	})

	const leave = () => {
		link.leave()
		props.onLeave()
	}

	/** Their own runners first, then the club. */
	const characters = (): Playable[] => [
		...customRunners().map(customPlayable).reverse(),
		...MEMBERS_BY_NAME,
	]
	const mine = () => {
		const v = view()
		if (!v?.character) return undefined
		return characters().find((c) => isPicked(c, v.character))
	}
	const pick = (runner: Playable) => {
		if (view()?.taken.includes(runner.id)) return
		navigator.vibrate?.(15)
		send({
			type: 'pick',
			character: runner.id,
			custom: runner.custom,
		})
		setChoosing(false)
	}

	const press = (action: Action, down: boolean) => {
		if (down) navigator.vibrate?.(8)
		setTouched((all) => {
			const next = new Set(all)
			if (down) next.add(action)
			else next.delete(action)
			return next
		})
	}

	return (
		<Switch>
			<Match when={gone()}>
				<Message title="The Room's closed" text="The big screen's left it.">
					<button
						type="button"
						style={styles.bigButton}
						onClick={props.onLeave}
					>
						Join another
					</button>
				</Message>
			</Match>
			<Match when={view()?.full}>
				<Message
					title="The Room's full"
					text="Eight Players already: next time!"
				>
					<button
						type="button"
						style={styles.bigButton}
						onClick={props.onLeave}
					>
						Join another
					</button>
				</Message>
			</Match>
			<Match when={!view()}>
				<Message
					title={lost() ? `Can't find ${props.code}` : `Joining ${props.code}…`}
					text={
						lost()
							? 'Check the code, and that the game’s open on the big screen.'
							: 'Finding the big screen.'
					}
				>
					<Show
						when={lost()}
						fallback={
							<button
								type="button"
								style={styles.smallButton}
								onClick={props.onLeave}
							>
								Cancel
							</button>
						}
					>
						<button
							type="button"
							style={styles.bigButton}
							onClick={props.onLeave}
						>
							Try another code
						</button>
					</Show>
				</Message>
			</Match>
			<Match when={editing()}>
				{(edit) => (
					<EditorScreen
						runner={edit().runner}
						onSave={(runner) => {
							setEditing(undefined)
							// Running as them straight away, or, changed, as they now look.
							pick(customPlayable(runner))
						}}
						onCancel={() => setEditing(undefined)}
					/>
				)}
			</Match>
			<Match when={!view()?.character || choosing()}>
				<Picker
					characters={characters()}
					taken={view()?.taken ?? []}
					mine={mine()?.id}
					colour={view()?.colour ?? 'white'}
					onPick={pick}
					onMake={() => setEditing({})}
					onEdit={(runner) => setEditing({ runner })}
					onCancel={view()?.character ? () => setChoosing(false) : undefined}
				/>
			</Match>
			<Match when={view()}>
				{(v) => (
					<div style={styles.controller}>
						<div style={{ ...styles.bar, background: v().colour }}>
							<Show when={mine()}>
								{(runner) => (
									<RunStrip
										frame={runner().sprite.run[0] ?? ''}
										width={runner().sprite.width}
										height={runner().sprite.height}
										scale={1.5}
										stride={v().status === 'racing' ? 0.4 : 0.9}
									/>
								)}
							</Show>
							<div style={styles.who}>
								<div style={{ 'font-size': '14px' }}>P{v().number}</div>
								<div
									style={{
										'font-size': `${nameSize(mine()?.name ?? '', [24, 20, 16])}px`,
									}}
								>
									{mine()?.name}
								</div>
							</div>
							<div style={styles.status}>{statusText(v())}</div>
						</div>

						<Show when={watching()} keyed>
							{(round) => (
								<div style={styles.mirror}>
									<Mirror
										start={round}
										feed={feed}
										width={screen().width}
										height={Math.max(140, screen().height * 0.5 - 40)}
									/>
								</div>
							)}
						</Show>

						<Show
							when={
								(v().stage === 'round' || v().stage === 'starting') &&
								v().status !== 'waiting'
							}
							fallback={
								<Switch>
									<Match when={v().stage === 'lobby'}>
										<div style={styles.scroll}>
											<div style={styles.scrolled}>
												<WatchToggle mode={props.mode} onMode={switchMode} />
												<Show
													when={v().starter}
													fallback={
														<>
															<button
																type="button"
																style={{
																	...styles.bigButton,
																	...(v().ready ? styles.readyOn : {}),
																}}
																onClick={() =>
																	send({ type: 'ready', ready: !v().ready })
																}
															>
																{v().ready ? 'Ready!' : 'I’m ready'}
															</button>
															<Show when={v().ready && v().starterNumber}>
																<div style={styles.text}>
																	P{v().starterNumber} starts the race
																</div>
															</Show>
														</>
													}
												>
													{(starter) => (
														<Starter
															starter={starter()}
															onMode={(mode) => {
																navigator.vibrate?.(8)
																send({ type: 'roomMode', mode })
															}}
															onStart={() => {
																navigator.vibrate?.(15)
																send({ type: 'start' })
															}}
														/>
													)}
												</Show>
												<div style={styles.actions}>
													<Show when={!v().ready}>
														<button
															type="button"
															style={styles.smallButton}
															onClick={() => setChoosing(true)}
														>
															Change runner
														</button>
													</Show>
													<button
														type="button"
														style={styles.smallButton}
														onClick={leave}
													>
														Leave
													</button>
												</div>
											</div>
										</div>
									</Match>
									<Match when={v().stage === 'podium'}>
										<div style={styles.lobby}>
											<Show
												when={
													v().place && (v().place as number) <= 3
														? (v().place as 1 | 2 | 3)
														: undefined
												}
											>
												{(place) => <Medal place={place()} size={7} />}
											</Show>
											<div style={styles.heading}>
												{v().place === 1
													? 'You won!'
													: v().place
														? `${ordinal(v().place as number)} of ${v().of}`
														: 'All done!'}
											</div>
											<div style={styles.text}>
												{roomModeInfo(v().roomMode).label} finished ·{' '}
												{pts(v().points)}
											</div>
											<Show
												when={v().isStarter}
												fallback={
													<div style={styles.text}>Back to the lobby soon</div>
												}
											>
												<button
													type="button"
													style={styles.bigButton}
													onClick={() => send({ type: 'lobby' })}
												>
													Back to the lobby
												</button>
											</Show>
											<button
												type="button"
												style={styles.smallButton}
												onClick={leave}
											>
												Leave the Room
											</button>
										</div>
									</Match>
									<Match when={true}>
										{/* Between Rounds, or waiting for the next one. */}
										<div style={styles.lobby}>
											<div style={styles.heading}>{statusText(v())}</div>
											<div style={styles.text}>{betweenText(v())}</div>
											<Show
												when={
													v().stage === 'results' &&
													v().isStarter &&
													roomModeInfo(v().roomMode).repeats
												}
											>
												<button
													type="button"
													style={styles.bigButton}
													onClick={() => {
														navigator.vibrate?.(15)
														send({ type: 'finish' })
													}}
												>
													Finish here
												</button>
												<div
													style={{
														...styles.text,
														'font-size': '15px',
														'text-align': 'center',
													}}
												>
													Or the next Round starts by itself
												</div>
											</Show>
										</div>
									</Match>
								</Switch>
							}
						>
							<ArrowPad press={press} />
						</Show>

						<Show when={v().paused}>
							<div style={styles.paused}>Paused</div>
						</Show>
					</div>
				)}
			</Match>
		</Switch>
	)
}

/**
 * The Starter's own: how far the Room goes, one big button each, and Start,
 * once everyone else who's picked is ready.
 */
function Starter(props: {
	starter: NonNullable<PadView['starter']>
	onMode: (mode: RoomMode) => void
	onStart: () => void
}) {
	return (
		<>
			<div style={styles.heading}>How far?</div>
			<div style={styles.modeList}>
				<For each={ROOM_MODES}>
					{(m) => {
						const on = () => props.starter.roomMode === m.mode
						return (
							<button
								type="button"
								aria-pressed={on()}
								style={{ ...styles.modeCard, ...(on() ? styles.readyOn : {}) }}
								onClick={() => !on() && props.onMode(m.mode)}
							>
								<span style={styles.modeMark}>
									<Show when={on()}>
										<span style={styles.modeDot} />
									</Show>
								</span>
								<span style={styles.modeWords}>
									<span style={styles.modeLabel}>{m.label}</span>
									<span style={styles.modeAbout}>{m.about}</span>
								</span>
							</button>
						)
					}}
				</For>
			</div>
			<button
				type="button"
				style={{
					...styles.bigButton,
					...styles.startButton,
					...(props.starter.canStart ? styles.readyOn : styles.startOff),
				}}
				disabled={!props.starter.canStart}
				onClick={props.onStart}
			>
				Start
			</button>
			<Show when={!props.starter.canStart}>
				<div style={styles.text}>{props.starter.why}</div>
			</Show>
		</>
	)
}

/** Between Rounds: their points, and what's next. */
function betweenText(view: PadView) {
	if (view.stage !== 'results') return `${pts(view.points)} · next Round soon`
	const last = view.rounds && view.round >= view.rounds
	const done = view.rounds
		? `Round ${view.round} of ${view.rounds} done`
		: `Round ${view.round} done`
	return `${pts(view.points)} · ${last ? 'the Podium’s next' : done}`
}

/**
 * The four buttons, laid out like a keyboard's arrow keys: up on its own on
 * top, and left, down and right in a row under it. As big as fits.
 */
function ArrowPad(props: {
	press: (action: Action, down: boolean) => void
}) {
	return (
		<div style={styles.arrowRoom}>
			<div style={styles.arrows}>
				<div style={{ 'grid-area': '1 / 2' }}>
					<PadButton label="↑" action="up" press={props.press} />
				</div>
				<div style={{ 'grid-area': '2 / 1' }}>
					<PadButton label="←" action="left" press={props.press} />
				</div>
				<div style={{ 'grid-area': '2 / 2' }}>
					<PadButton label="↓" action="down" press={props.press} />
				</div>
				<div style={{ 'grid-area': '2 / 3' }}>
					<PadButton label="→" action="right" press={props.press} />
				</div>
			</div>
		</div>
	)
}

/** One of the four buttons: held for as long as a finger's on it. */
function PadButton(props: {
	label: string
	action: Action
	press: (action: Action, down: boolean) => void
}) {
	const [down, setDown] = createSignal(false)
	const set = (next: boolean) => {
		setDown(next)
		props.press(props.action, next)
	}
	return (
		<button
			type="button"
			style={{ ...styles.padButton, ...(down() ? styles.padButtonDown : {}) }}
			onPointerDown={(event) => {
				event.preventDefault()
				event.currentTarget.setPointerCapture(event.pointerId)
				set(true)
			}}
			onPointerUp={() => set(false)}
			onPointerCancel={() => set(false)}
			onContextMenu={(event) => event.preventDefault()}
		>
			{props.label}
		</button>
	)
}

function Picker(props: {
	characters: Playable[]
	taken: string[]
	mine: string | undefined
	colour: string
	onPick: (runner: Playable) => void
	/** Making a runner of their own. */
	onMake: () => void
	/** Changing one of theirs. */
	onEdit: (runner: CustomRunner) => void
	onCancel?: () => void
}) {
	return (
		<div style={styles.picker}>
			<div style={{ ...styles.pickerTop, background: props.colour }}>
				<span>Who are you?</span>
				<Show when={props.onCancel}>
					<button
						type="button"
						style={styles.smallButton}
						onClick={props.onCancel}
					>
						Back
					</button>
				</Show>
			</div>
			<div style={styles.grid}>
				<button
					type="button"
					style={{ ...styles.card, ...styles.makeCard }}
					onClick={props.onMake}
				>
					<span style={{ 'font-size': '40px', 'line-height': 1 }}>+</span>
					<span style={{ 'font-size': '13px' }}>Make your own</span>
				</button>
				<For each={props.characters}>
					{(runner) => {
						// Someone else's custom runners have their phone's id in theirs,
						// so only the club's can be taken from under you.
						const taken = () => props.taken.includes(runner.id)
						return (
							<div style={styles.cardWrap}>
								<button
									type="button"
									style={{
										...styles.card,
										...(taken() ? styles.cardTaken : {}),
										...(props.mine === runner.id
											? { 'border-color': '#ffd23f' }
											: {}),
									}}
									disabled={taken()}
									onClick={() => props.onPick(runner)}
								>
									<div style={styles.cardRunner}>
										<RunStrip
											frame={runner.sprite.run[0] ?? ''}
											width={runner.sprite.width}
											height={runner.sprite.height}
											scale={1.5}
											stride={0.9}
										/>
									</div>
									<span
										style={{
											'font-size': `${nameSize(runner.name, [16, 13, 11])}px`,
											'white-space': 'nowrap',
										}}
									>
										{runner.name}
									</span>
									<Show when={taken()}>
										<span style={styles.takenTag}>Taken</span>
									</Show>
								</button>
								<Show when={runner.custom}>
									{(custom) => (
										<button
											type="button"
											aria-label={`Change ${runner.name}`}
											style={styles.editTag}
											onClick={() => props.onEdit(custom())}
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
	)
}

/**
 * The game's own runner editor, on the phone: laid out for a wide screen, so
 * it's best with the phone on its side.
 */
function EditorScreen(props: {
	runner?: CustomRunner
	onSave: (runner: CustomRunner) => void
	onCancel: () => void
}) {
	const measure = () => ({
		upright: window.innerHeight > window.innerWidth,
		scale: Math.min(
			window.innerWidth / VIEW_WIDTH,
			window.innerHeight / VIEW_HEIGHT,
		),
	})
	const [screen, setScreen] = createSignal(measure())

	/**
	 * Typing a name: the keyboard's up, and the window's shrunk to what's
	 * left above it. Fitted into that, the editor would be tiny; left as it
	 * was, the keyboard just covers the bottom of it, and the name's at the
	 * top. So a window that gets shorter, but no narrower, while typing is
	 * the keyboard, and the editor's held where it was. Turning the phone
	 * round still fits it again.
	 */
	let box: HTMLDivElement | undefined
	/** How it was last fitted, and where its middle was. */
	let fitted = { scale: screen().scale, middle: 0, width: window.innerWidth }
	const [held, setHeld] = createSignal<{ scale: number; middle: number }>()
	const typing = () => {
		const at = document.activeElement
		return (
			(at instanceof HTMLInputElement && at.type !== 'color') ||
			at instanceof HTMLTextAreaElement
		)
	}
	const fit = () => {
		setHeld(undefined)
		setScreen(measure())
		fitted = {
			scale: screen().scale,
			middle: (box?.clientHeight ?? window.innerHeight) / 2,
			width: window.innerWidth,
		}
	}
	onMount(fit)
	const resize = () => {
		if (typing() && window.innerWidth === fitted.width)
			setHeld({ scale: fitted.scale, middle: fitted.middle })
		else fit()
	}
	// Once focus has settled: from the name to a colour isn't the keyboard going.
	const onFocusOut = () =>
		window.setTimeout(() => {
			if (held() && !typing()) fit()
		})
	window.addEventListener('resize', resize)
	document.addEventListener('focusout', onFocusOut)
	onCleanup(() => {
		window.removeEventListener('resize', resize)
		document.removeEventListener('focusout', onFocusOut)
	})

	return (
		<div ref={box} style={styles.editor}>
			<Show when={screen().upright && !held()}>
				<div style={styles.sideways}>Easier with your phone on its side ↻</div>
			</Show>
			{/* The game's 960 × 540, scaled to fit and in the middle. */}
			<div
				style={{
					...styles.editorStage,
					top: held() ? `${held()?.middle}px` : '50%',
					transform: `translate(-50%, -50%) scale(${held()?.scale ?? screen().scale})`,
				}}
			>
				<RunnerEditor
					runner={props.runner}
					onSave={props.onSave}
					onCancel={props.onCancel}
					onDelete={props.onCancel}
				/>
			</div>
		</div>
	)
}

function Message(props: {
	title: string
	text: string
	children?: JSX.Element
}) {
	return (
		<div style={styles.centre}>
			<div style={styles.heading}>{props.title}</div>
			<div style={styles.text}>{props.text}</div>
			{props.children}
		</div>
	)
}

const styles = {
	page: {
		position: 'fixed',
		inset: 0,
		display: 'flex',
		'flex-direction': 'column',
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom))',
		color: 'var(--ink)',
		'font-family': 'var(--font-pixel)',
		'padding-top': 'env(safe-area-inset-top)',
		'padding-bottom': 'env(safe-area-inset-bottom)',
	},
	centre: {
		flex: 1,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '14px',
		padding: '20px',
		'text-align': 'center',
	},
	heading: { 'font-size': '30px' },
	text: { 'font-size': '18px', opacity: 0.8, 'max-width': '320px' },
	codeInput: {
		width: '200px',
		padding: '10px 0 6px',
		'font-family': 'var(--font-pixel)',
		'font-size': '40px',
		'letter-spacing': '8px',
		'text-align': 'center',
		'text-transform': 'uppercase',
		border: '4px solid var(--ink)',
		'user-select': 'text',
		'-webkit-user-select': 'text',
	},
	bigButton: {
		padding: '14px 26px 10px',
		background: 'var(--ink)',
		color: 'white',
		border: '4px solid white',
		'box-shadow': '0 0 0 4px var(--ink)',
		'font-family': 'var(--font-pixel)',
		'font-size': '24px',
	},
	readyOn: { background: '#ffd23f', color: 'var(--ink)' },
	startOff: { opacity: 0.45 },
	/** The lobby: scrolled, if it doesn't fit, and in the middle if it does. */
	scroll: {
		flex: 1,
		'min-height': 0,
		display: 'flex',
		'flex-direction': 'column',
		'overflow-y': 'auto',
		'touch-action': 'pan-y',
	},
	scrolled: {
		margin: 'auto 0',
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '14px',
		padding: '16px',
		'text-align': 'center',
	},
	/** The ways a Room can go: one under another on a phone, two by two on a computer. */
	modeList: {
		display: 'grid',
		'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
		gap: '12px',
		width: 'min(100%, 560px)',
		padding: '3px',
		'box-sizing': 'border-box',
	},
	modeCard: {
		display: 'flex',
		'align-items': 'center',
		gap: '12px',
		'min-height': '60px',
		padding: '9px 12px 6px',
		background: 'var(--ink)',
		color: 'white',
		border: '3px solid white',
		'box-shadow': '0 0 0 3px var(--ink)',
		'font-family': 'var(--font-pixel)',
		'text-align': 'left',
	},
	/** A square that's filled in when it's the one. */
	modeMark: {
		display: 'grid',
		'place-items': 'center',
		width: '22px',
		height: '22px',
		'flex-shrink': 0,
		border: '3px solid currentColor',
		'box-sizing': 'border-box',
		'margin-bottom': '3px',
	},
	modeDot: { width: '10px', height: '10px', background: 'currentColor' },
	modeWords: {
		flex: 1,
		'min-width': 0,
		display: 'flex',
		'flex-direction': 'column',
		gap: '3px',
	},
	modeLabel: { 'font-size': '20px', 'line-height': 1 },
	modeAbout: { 'font-size': '13px', opacity: 0.8 },
	startButton: { width: 'min(100%, 320px)' },
	/** Where the race is watched: two big buttons side by side. */
	watch: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '6px',
		width: 'min(100%, 360px)',
	},
	watchLabel: { 'font-size': '15px', opacity: 0.8 },
	watchOptions: {
		display: 'grid',
		'grid-template-columns': '1fr 1fr',
		gap: '10px',
		width: '100%',
		padding: '3px',
		'box-sizing': 'border-box',
	},
	watchOption: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '8px',
		padding: '10px 8px 7px',
		background: 'var(--ink)',
		color: 'white',
		border: '3px solid white',
		'box-shadow': '0 0 0 3px var(--ink)',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
	},
	actions: {
		display: 'flex',
		'flex-wrap': 'wrap',
		'justify-content': 'center',
		gap: '8px',
		'margin-top': '4px',
	},
	modeButton: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '6px',
		width: 'min(320px, 86vw)',
		padding: '14px 16px 10px',
		background: 'var(--ink)',
		color: 'white',
		border: '4px solid white',
		'box-shadow': '0 0 0 4px var(--ink)',
		'font-family': 'var(--font-pixel)',
	},
	modeText: { 'font-size': '15px', opacity: 0.8 },
	homeLink: {
		'margin-top': '8px',
		color: 'var(--ink)',
		'font-size': '16px',
	},
	smallButton: {
		padding: '8px 12px 5px',
		background: 'rgba(15, 31, 41, 0.85)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '15px',
	},
	controller: {
		position: 'relative',
		flex: 1,
		display: 'flex',
		'flex-direction': 'column',
		'min-height': 0,
	},
	bar: {
		display: 'flex',
		'align-items': 'center',
		gap: '12px',
		padding: '8px 14px',
		color: 'white',
		'text-shadow': '2px 2px 0 var(--ink)',
		'border-bottom': '4px solid var(--ink)',
	},
	who: { display: 'flex', 'flex-direction': 'column', gap: '2px' },
	status: { 'margin-left': 'auto', 'font-size': '20px', 'text-align': 'right' },
	lobby: {
		flex: 1,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '16px',
	},
	mirror: {
		display: 'flex',
		'justify-content': 'center',
		'border-bottom': '4px solid var(--ink)',
		background: 'var(--ink)',
	},
	arrowRoom: {
		flex: 1,
		'min-height': 0,
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		padding: '12px',
		'container-type': 'size',
	},
	arrows: {
		display: 'grid',
		'grid-template-columns': 'repeat(3, 1fr)',
		'grid-template-rows': 'repeat(2, 1fr)',
		gap: '10px',
		// Three buttons wide and two high, square, as big as fits.
		width: 'min(100cqw, 150cqh, 560px)',
		height: 'min(100cqh, 66.67cqw, 373px)',
	},
	padButton: {
		width: '100%',
		height: '100%',
		background: 'rgba(255, 255, 255, 0.7)',
		color: 'var(--ink)',
		border: '4px solid var(--ink)',
		'box-shadow': '6px 6px 0 rgba(15, 31, 41, 0.45)',
		'font-family': 'var(--font-pixel)',
		'font-size': '48px',
		'touch-action': 'none',
		'-webkit-touch-callout': 'none',
	},
	padButtonDown: {
		background: '#ffd23f',
		transform: 'translate(4px, 4px)',
		'box-shadow': '2px 2px 0 rgba(15, 31, 41, 0.45)',
	},
	paused: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'rgba(15, 31, 41, 0.6)',
		color: 'white',
		'font-size': '40px',
	},
	picker: {
		flex: 1,
		display: 'flex',
		'flex-direction': 'column',
		'min-height': 0,
	},
	pickerTop: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'space-between',
		padding: '10px 14px 6px',
		color: 'white',
		'font-size': '22px',
		'text-shadow': '2px 2px 0 var(--ink)',
		'border-bottom': '4px solid var(--ink)',
	},
	grid: {
		flex: 1,
		'overflow-y': 'auto',
		'touch-action': 'pan-y',
		display: 'grid',
		'grid-template-columns': 'repeat(auto-fill, minmax(96px, 1fr))',
		gap: '10px',
		padding: '12px',
		'align-content': 'start',
	},
	card: {
		position: 'relative',
		flex: 1,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '4px',
		padding: '0 0 6px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		overflow: 'hidden',
	},
	cardTaken: { opacity: 0.4 },
	cardWrap: { position: 'relative', display: 'flex' },
	makeCard: {
		'justify-content': 'center',
		'min-height': '96px',
		padding: '6px',
		background: 'rgba(15, 31, 41, 0.6)',
		'border-style': 'dashed',
	},
	editTag: {
		position: 'absolute',
		top: '4px',
		left: '4px',
		padding: '3px 5px 1px',
		background: 'var(--ink)',
		color: 'white',
		border: '2px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '11px',
	},
	editor: {
		position: 'relative',
		flex: 1,
		'min-height': 0,
		overflow: 'hidden',
	},
	editorStage: {
		position: 'absolute',
		left: '50%',
		top: '50%',
		width: `${VIEW_WIDTH}px`,
		height: `${VIEW_HEIGHT}px`,
		'transform-origin': 'center',
	},
	sideways: {
		position: 'absolute',
		top: '16px',
		left: 0,
		right: 0,
		'z-index': 1,
		'text-align': 'center',
		'font-size': '18px',
	},
	cardRunner: {
		display: 'flex',
		'align-items': 'flex-end',
		'justify-content': 'center',
		'align-self': 'stretch',
		height: '60px',
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom) 75%, var(--grass-green) 75%)',
	},
	takenTag: {
		position: 'absolute',
		top: '4px',
		right: '4px',
		padding: '2px 4px 0',
		background: 'var(--bus-red)',
		'font-size': '11px',
	},
} satisfies Record<string, JSX.CSSProperties>
