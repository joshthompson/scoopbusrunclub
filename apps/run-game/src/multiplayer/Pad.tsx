import {
	For,
	type JSX,
	Match,
	Show,
	Switch,
	createEffect,
	createSignal,
	lazy,
	onCleanup,
	onMount,
	untrack,
} from 'solid-js'
import { type Action, anyControls } from '../input'
import { unlockedRunners } from '../runners/bonus'
import { type CustomRunner, customRunners } from '../runners/customRunners'
import { CLUB, type Playable, customPlayable } from '../runners/playable'
import { ArrowPad } from '../ui/ArrowPad'
import { RunStrip } from '../ui/RunStrip'
import { nameSize } from '../ui/RunnerStage'
import { Medal, ordinal, pts } from './Medal'
import { PadRunnerEditor } from './PadRunnerEditor'
import { Scanner } from './Scanner'
import {
	isPicked,
	joinAfresh,
	joinAsGuest,
	joiningMessage,
	lastMode,
	lastRoom,
	rememberMode,
	rememberRoom,
	savePlayerName,
	savedPlayerName,
} from './guest'
import {
	CODE_LENGTH,
	type GameMode,
	MAX_PLAYER_NAME,
	type PadMode,
	type PadView,
	type RoomMode,
	cleanCode,
	cleanPlayerName,
} from './protocol'
import { GAME_MODES, ROOM_MODES, roomModeInfo } from './roomModes'
import { statusText } from './status'

/** The race on the phone, for Remote Play: the game itself, so only loaded then. */
const Mirror = lazy(() => import('./Mirror'))

/** How this phone played last time, under this, to start on next time. */
const MODE_KEY = 'pad-mode'
/** The Room this phone was last in, under this, to go straight back into (see `lastRoom`). */
const ROOM_KEY = 'pad-room'

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
	/**
	 * The Room it was last in, if it was lately. Its QR code scanned again, or
	 * the page reloaded, and it's straight back in, its seat and all, without
	 * being asked how it's watching again.
	 */
	const last = lastRoom(ROOM_KEY)
	const [code, setCode] = createSignal(
		fromLink.length === CODE_LENGTH ? fromLink : '',
	)
	const [mode, setMode] = createSignal<PadMode | undefined>(
		last && last.code === code() ? last.mode : undefined,
	)
	const choose = (next: PadMode) => {
		rememberMode(MODE_KEY, next)
		setMode(next)
	}
	const leave = () => {
		rememberRoom(ROOM_KEY, undefined)
		setCode('')
		setMode(undefined)
	}
	/** Joining again, from scratch, as a new page: the same seat, by this device, and played the same way. */
	const again = () => {
		rememberRoom(ROOM_KEY, { code: code(), mode: mode() ?? 'controller' })
		joinAfresh(code())
	}
	const screens = () => (
		<Switch>
			<Match when={!code()}>
				<CodeEntry
					rejoin={last?.code}
					onCode={(next) => {
						if (last && next === last.code) setMode(last.mode)
						setCode(next)
					}}
				/>
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
						onJoined={() =>
							rememberRoom(ROOM_KEY, {
								code: code(),
								mode: mode() ?? 'controller',
							})
						}
						onLeave={leave}
						onRejoin={again}
					/>
				)}
			</Match>
		</Switch>
	)
	return <div style={styles.page}>{screens()}</div>
}

function CodeEntry(props: {
	/** The Room it was last in, lately: one tap back in. */
	rejoin?: string
	onCode: (code: string) => void
}) {
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
				<Show when={props.rejoin}>
					{(code) => (
						<button
							type="button"
							style={{ ...styles.bigButton, ...styles.readyOn }}
							onClick={() => props.onCode(code())}
						>
							Back to Room {code()}
						</button>
					)}
				</Show>
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
	/** In the Room: remembered, for coming straight back to. */
	onJoined: () => void
	onLeave: () => void
	/** Lost touch with the Room: trying again, from scratch. */
	onRejoin: () => void
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
	/** What they go by: kept on the phone, and said to the Host whenever it changes. */
	const [name, setName] = createSignal(cleanPlayerName(savedPlayerName()))
	const link = joinAsGuest({
		code: props.code,
		mode: () => props.mode,
		name,
		held,
	})
	const { view, gone, reconnecting, start, feed, send } = link
	const joining = () => joiningMessage(props.code, link)
	const rename = (next: string) => {
		const clean = cleanPlayerName(next)
		if (clean === name()) return
		setName(clean)
		savePlayerName(clean)
		link.rename(clean)
	}
	const inRoom = () => !!view() && !view()?.full
	createEffect(() => {
		if (inRoom()) untrack(props.onJoined)
	})

	/** Changing who they'll be, after picking. */
	const [choosing, setChoosing] = createSignal(false)
	/** Making a runner of their own, or changing one: `runner` is the one being changed. */
	const [editing, setEditing] = createSignal<{ runner?: CustomRunner }>()
	/** Changing their name, from the bar along the top, whenever. */
	const [naming, setNaming] = createSignal(false)

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

	/** Their own runners first, then anyone they've unlocked, then the club. */
	const characters = (): Playable[] => [
		...customRunners().map(customPlayable).reverse(),
		...unlockedRunners(),
		...CLUB,
	]
	const mine = () => {
		const v = view()
		if (!v?.character) return undefined
		return characters().find((c) => isPicked(c, v.character))
	}
	/** What they're called: their own name, or their runner's. */
	const shownName = () => name() || mine()?.name || ''
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
	// Nothing's held while the buttons aren't up: between Rounds, nothing
	// pressed as the last ended carries over into the next.
	createEffect(() => {
		const stage = view()?.stage
		const buttonsUp =
			stage === 'round' || stage === 'starting' || stage === 'podium'
		if (!buttonsUp && touched().size) setTouched(new Set<Action>())
	})

	return (
		<Switch>
			<Match when={gone()}>
				<Message
					title="Lost the big screen"
					text="It's not answering: the Room may have closed. Your seat and points are kept for a while."
				>
					<button
						type="button"
						style={styles.bigButton}
						onClick={props.onRejoin}
					>
						Rejoin
					</button>
					<button
						type="button"
						style={styles.smallButton}
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
				<Message title={joining().title} text={joining().text}>
					<Show
						when={joining().failed}
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
							style={{ ...styles.bigButton, ...styles.readyOn }}
							onClick={props.onRejoin}
						>
							Try again
						</button>
						<button
							type="button"
							style={styles.smallButton}
							onClick={props.onLeave}
						>
							Try another code
						</button>
					</Show>
				</Message>
			</Match>
			<Match when={editing()}>
				{(edit) => (
					<PadRunnerEditor
						runner={edit().runner}
						suggestedName={name()}
						onSave={(runner) => {
							setEditing(undefined)
							// Running as them straight away, or, changed, as they now look.
							pick(customPlayable(runner))
						}}
						onCancel={() => setEditing(undefined)}
						onDelete={() => setEditing(undefined)}
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
							<button
								type="button"
								style={styles.who}
								aria-label="Change your name"
								onClick={() => setNaming(true)}
							>
								<span style={styles.whoTop}>
									P{v().number} · Room {props.code}
								</span>
								<span
									style={{
										...styles.whoName,
										'font-size': `${nameSize(shownName(), [24, 20, 16])}px`,
									}}
								>
									{shownName()}
									<span style={styles.pencil}>✎</span>
								</span>
							</button>
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
										<LobbyScreen
											view={v()}
											runner={mine()}
											name={name()}
											onName={rename}
											mode={props.mode}
											onMode={switchMode}
											onChangeRunner={() => setChoosing(true)}
											onReady={(ready) => {
												navigator.vibrate?.(ready ? 15 : 8)
												send({ type: 'ready', ready })
											}}
											onRoomMode={(mode) => {
												navigator.vibrate?.(8)
												send({ type: 'roomMode', mode })
											}}
											onGameMode={(mode) => {
												navigator.vibrate?.(8)
												send({ type: 'gameMode', mode })
											}}
											onStart={() => {
												navigator.vibrate?.(15)
												send({ type: 'start' })
											}}
											onLeave={leave}
										/>
									</Match>
									<Match when={v().stage === 'podium'}>
										<div style={styles.podium}>
											<Show
												when={
													v().place && (v().place as number) <= 3
														? (v().place as 1 | 2 | 3)
														: undefined
												}
											>
												{(place) => <Medal place={place()} size={5} />}
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
										{/* Running about on the Podium, on the big screen. */}
										<ArrowPad press={press} />
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

						<Show when={v().waitingForStarter}>
							{(number) => (
								<div style={styles.starting}>
									{v().isStarter
										? 'Press ↑ to start'
										: `Waiting for P${number()} to start`}
								</div>
							)}
						</Show>
						<Show when={v().paused}>
							<div style={styles.paused}>Paused</div>
						</Show>
						<Show when={reconnecting()}>
							<div style={styles.reconnecting}>Reconnecting…</div>
						</Show>
						<Show when={naming()}>
							<NameSheet
								name={name()}
								placeholder={mine()?.name ?? ''}
								onName={rename}
								onClose={() => setNaming(false)}
							/>
						</Show>
					</div>
				)}
			</Match>
		</Switch>
	)
}

/**
 * The lobby, on the phone: who they are (their name, to change, and their
 * runner), where they'll watch, and for the Starter, how the Room goes. At
 * the bottom, always in reach, whether they're ready, or for the Starter,
 * Start.
 */
function LobbyScreen(props: {
	view: PadView
	runner: Playable | undefined
	name: string
	onName: (name: string) => void
	mode: PadMode
	onMode: (mode: PadMode) => void
	onChangeRunner: () => void
	onReady: (ready: boolean) => void
	onRoomMode: (mode: RoomMode) => void
	onGameMode: (mode: GameMode) => void
	onStart: () => void
	onLeave: () => void
}) {
	return (
		<>
			<div style={styles.scroll}>
				<div style={styles.scrolled}>
					<div style={styles.youCard}>
						<button
							type="button"
							style={styles.youRunner}
							aria-label="Change runner"
							onClick={props.onChangeRunner}
						>
							<Show when={props.runner}>
								{(runner) => (
									<RunStrip
										frame={runner().sprite.run[0] ?? ''}
										width={runner().sprite.width}
										height={runner().sprite.height}
										scale={2.5}
										stride={0.9}
										style={{ 'margin-bottom': '8px' }}
									/>
								)}
							</Show>
						</button>
						<div style={styles.youWords}>
							<NameField
								name={props.name}
								placeholder={props.runner?.name ?? ''}
								onName={props.onName}
							/>
							<div style={styles.runsAs}>
								Running as {props.runner?.name ?? '…'}
							</div>
							<button
								type="button"
								style={styles.outlineButton}
								onClick={props.onChangeRunner}
							>
								Change runner
							</button>
						</div>
					</div>

					<WatchToggle mode={props.mode} onMode={props.onMode} />

					<Show when={props.view.starter}>
						{(starter) => (
							<Starter
								starter={starter()}
								onMode={props.onRoomMode}
								onGameMode={props.onGameMode}
							/>
						)}
					</Show>

					<button
						type="button"
						style={styles.leaveLink}
						onClick={props.onLeave}
					>
						Leave the Room
					</button>
				</div>
			</div>

			<div style={styles.footer}>
				<Show
					when={props.view.starter}
					fallback={
						<>
							<ReadyToggle
								ready={props.view.ready}
								onToggle={() => props.onReady(!props.view.ready)}
							/>
							<div style={styles.footerNote}>
								{props.view.ready
									? props.view.starterNumber
										? `P${props.view.starterNumber} starts the race · tap if you’re not ready`
										: 'Tap again if you’re not ready'
									: 'Tap when you’re ready to race'}
							</div>
						</>
					}
				>
					{(starter) => (
						<>
							<button
								type="button"
								style={{
									...styles.footerButton,
									...(starter().canStart ? styles.readyOn : styles.startOff),
								}}
								disabled={!starter().canStart}
								onClick={props.onStart}
							>
								Start the race
							</button>
							<div style={styles.footerNote}>
								{starter().canStart ? 'Everyone’s ready' : starter().why}
							</div>
						</>
					)}
				</Show>
			</div>
		</>
	)
}

/** Ready or not, as a switch: tapped to say so, and tapped again to take it back. */
function ReadyToggle(props: { ready: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={props.ready}
			style={{
				...styles.footerButton,
				...(props.ready ? styles.readyOn : {}),
			}}
			onClick={props.onToggle}
		>
			<span
				style={{
					...styles.switchTrack,
					...(props.ready ? styles.switchTrackOn : {}),
				}}
			>
				<span
					style={{
						...styles.switchKnob,
						...(props.ready ? styles.switchKnobOn : {}),
					}}
				/>
			</span>
			{props.ready ? 'Ready!' : 'Not ready'}
		</button>
	)
}

/**
 * Their name, to type in: kept as typed until they're done (Enter, or
 * tapping away), then tidied and sent. Blank, they go by their runner's.
 */
function NameField(props: {
	name: string
	placeholder: string
	onName: (name: string) => void
	autofocus?: boolean
	onDone?: () => void
}) {
	const [typed, setTyped] = createSignal(props.name)
	// Changed elsewhere (or tidied): shown as it now is.
	createEffect(() => setTyped(props.name))
	const done = () => {
		const clean = cleanPlayerName(typed())
		setTyped(clean)
		props.onName(clean)
		props.onDone?.()
	}
	return (
		<label style={styles.nameField}>
			<span style={styles.nameLabel}>Your name</span>
			<input
				ref={(input) => {
					if (props.autofocus) onMount(() => input.focus())
				}}
				type="text"
				class="pad-name"
				style={styles.nameInput}
				value={typed()}
				maxLength={MAX_PLAYER_NAME}
				placeholder={props.placeholder || 'Your name'}
				autocomplete="nickname"
				autocapitalize="words"
				spellcheck={false}
				enterkeyhint="done"
				onInput={(event) => setTyped(event.currentTarget.value)}
				onBlur={done}
				onKeyDown={(event) => {
					if (event.key === 'Enter') event.currentTarget.blur()
				}}
			/>
		</label>
	)
}

/** Changing their name from anywhere, over whatever's on: at the top, clear of the keyboard. */
function NameSheet(props: {
	name: string
	placeholder: string
	onName: (name: string) => void
	onClose: () => void
}) {
	return (
		<div
			style={styles.sheetBack}
			onClick={(event) => {
				if (event.target === event.currentTarget) props.onClose()
			}}
			onKeyDown={(event) => {
				if (event.key === 'Escape') props.onClose()
			}}
		>
			<div style={styles.sheet}>
				<NameField
					name={props.name}
					placeholder={props.placeholder}
					onName={props.onName}
					autofocus
					onDone={props.onClose}
				/>
				<div style={styles.sheetNote}>
					Leave it blank to go by your runner’s name
				</div>
				<button type="button" style={styles.sheetDone} onClick={props.onClose}>
					Done
				</button>
			</div>
		</div>
	)
}

/**
 * The Starter's own: how its Rounds are raced and how far the Room goes,
 * one big button each. Start's at the bottom (see `LobbyScreen`).
 */
function Starter(props: {
	starter: NonNullable<PadView['starter']>
	onMode: (mode: RoomMode) => void
	onGameMode: (mode: GameMode) => void
}) {
	return (
		<>
			<div style={styles.sectionTitle}>How to race?</div>
			<div style={styles.modeList}>
				<For each={GAME_MODES}>
					{(m) => {
						const on = () => props.starter.gameMode === m.mode
						return (
							<button
								type="button"
								aria-pressed={on()}
								style={{ ...styles.modeCard, ...(on() ? styles.readyOn : {}) }}
								onClick={() => !on() && props.onGameMode(m.mode)}
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
			<div style={styles.sectionTitle}>How far?</div>
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
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '18px',
		width: '100%',
		'max-width': '480px',
		margin: '0 auto',
		padding: '16px 16px 20px',
		'box-sizing': 'border-box',
	},
	/** Who they are: their runner, to tap to change, and their name. */
	youCard: {
		display: 'flex',
		'align-items': 'stretch',
		gap: '14px',
		width: '100%',
		padding: '12px',
		'box-sizing': 'border-box',
		background: 'var(--ink)',
		color: 'white',
		border: '3px solid white',
		'box-shadow': '0 0 0 3px var(--ink)',
	},
	youRunner: {
		display: 'flex',
		'align-items': 'flex-end',
		'justify-content': 'center',
		width: '96px',
		'min-height': '120px',
		'flex-shrink': 0,
		padding: 0,
		border: '3px solid white',
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom) 80%, var(--grass-green) 80%)',
	},
	youWords: {
		flex: 1,
		'min-width': 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'flex-start',
		gap: '8px',
	},
	runsAs: { 'font-size': '14px', opacity: 0.75 },
	outlineButton: {
		'min-height': '40px',
		padding: '6px 12px 3px',
		background: 'transparent',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '16px',
	},
	nameField: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '5px',
		width: '100%',
	},
	nameLabel: { 'font-size': '13px', opacity: 0.75 },
	nameInput: {
		width: '100%',
		height: '46px',
		padding: '4px 10px 0',
		'box-sizing': 'border-box',
		background: 'white',
		color: 'var(--ink)',
		border: '3px solid #ffd23f',
		outline: 'none',
		'border-radius': 0,
		'font-family': 'var(--font-pixel)',
		// 16px or more, or iOS zooms in on it.
		'font-size': '20px',
		'user-select': 'text',
		'-webkit-user-select': 'text',
	},
	sectionTitle: {
		'align-self': 'flex-start',
		'font-size': '18px',
		'margin-bottom': '-8px',
	},
	leaveLink: {
		padding: '8px 12px 5px',
		background: 'none',
		border: 'none',
		color: 'var(--ink)',
		'font-family': 'var(--font-pixel)',
		'font-size': '15px',
		'text-decoration': 'underline',
		opacity: 0.8,
	},
	/** Always in reach, under the lobby: ready or not, or Start. */
	footer: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '6px',
		padding: '12px 16px 10px',
		background: 'rgba(15, 31, 41, 0.12)',
		'border-top': '4px solid var(--ink)',
	},
	footerButton: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '14px',
		width: 'min(100%, 448px)',
		'min-height': '60px',
		padding: '10px 16px 6px',
		background: 'var(--ink)',
		color: 'white',
		border: '4px solid white',
		'box-shadow': '0 0 0 4px var(--ink)',
		'font-family': 'var(--font-pixel)',
		'font-size': '24px',
	},
	footerNote: {
		'font-size': '14px',
		opacity: 0.8,
		'text-align': 'center',
	},
	/** The ready switch: a knob that's left, off, or right, on. */
	switchTrack: {
		position: 'relative',
		width: '48px',
		height: '26px',
		'flex-shrink': 0,
		'box-sizing': 'border-box',
		border: '3px solid currentColor',
		'margin-bottom': '4px',
	},
	switchTrackOn: { background: '#3fb950' },
	switchKnob: {
		position: 'absolute',
		top: '2px',
		left: '2px',
		width: '16px',
		height: '16px',
		background: 'currentColor',
		transition: 'left 0.12s steps(3)',
	},
	switchKnobOn: { left: '24px', background: 'white' },
	/** Changing their name, over everything: dimmed behind. */
	sheetBack: {
		position: 'absolute',
		inset: 0,
		'z-index': 5,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		padding: '70px 16px 0',
		background: 'rgba(15, 31, 41, 0.6)',
	},
	sheet: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'stretch',
		gap: '10px',
		width: 'min(100%, 420px)',
		padding: '14px',
		'box-sizing': 'border-box',
		background: 'var(--ink)',
		color: 'white',
		border: '3px solid white',
	},
	sheetNote: { 'font-size': '13px', opacity: 0.75 },
	sheetDone: {
		'min-height': '48px',
		padding: '8px 16px 4px',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '20px',
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
	/** Where the race is watched: two halves of one switch. */
	watch: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '6px',
		width: '100%',
	},
	watchLabel: { 'font-size': '18px' },
	watchOptions: {
		display: 'grid',
		'grid-template-columns': '1fr 1fr',
		width: '100%',
		border: '3px solid white',
		'box-shadow': '0 0 0 3px var(--ink)',
		background: 'var(--ink)',
	},
	watchOption: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '8px',
		'min-height': '48px',
		padding: '8px 8px 5px',
		background: 'transparent',
		color: 'white',
		border: 'none',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
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
	/** Their number and name: tapped, to change their name. */
	who: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'flex-start',
		gap: '2px',
		'min-width': 0,
		padding: 0,
		background: 'none',
		border: 'none',
		color: 'inherit',
		'text-shadow': 'inherit',
		'font-family': 'var(--font-pixel)',
		'text-align': 'left',
	},
	whoTop: { 'font-size': '13px' },
	whoName: { 'white-space': 'nowrap', 'line-height': 1.1 },
	pencil: { 'margin-left': '6px', 'font-size': '0.75em', opacity: 0.85 },
	status: { 'margin-left': 'auto', 'font-size': '20px', 'text-align': 'right' },
	lobby: {
		flex: 1,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '16px',
	},
	/** At the Podium: how it went, over the buttons to run about with. */
	podium: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '8px',
		padding: '10px 0',
	},
	mirror: {
		display: 'flex',
		'justify-content': 'center',
		'border-bottom': '4px solid var(--ink)',
		background: 'var(--ink)',
	},
	/** Out of touch with the big screen a moment: getting back in. */
	reconnecting: {
		position: 'absolute',
		left: '50%',
		top: '140px',
		transform: 'translateX(-50%)',
		padding: '8px 14px 5px',
		background: 'var(--bus-red)',
		color: 'white',
		border: '3px solid var(--ink)',
		'font-size': '18px',
		'white-space': 'nowrap',
		'z-index': 2,
		animation: 'blink 1.2s steps(2) infinite',
	},
	/** A Round on its start screen: who's to start it, over the top, leaving the buttons to press. */
	starting: {
		position: 'absolute',
		// Under the bar along the top, not over their name.
		top: '84px',
		left: '50%',
		transform: 'translateX(-50%)',
		padding: '8px 14px 5px',
		background: 'var(--ink)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
		'white-space': 'nowrap',
		'pointer-events': 'none',
		'z-index': 3,
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
