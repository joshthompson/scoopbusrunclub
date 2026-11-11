import {
	type JSX,
	Match,
	Show,
	Switch,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import { COURSES } from '../courses'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import { NOTHING_HELD, actionOfKey, anyControls } from '../input'
import { playMenu, playTune } from '../music/music'
import type { Playable } from '../runners/playable'
import { lastRunner } from '../saved/settings'
import { PauseMenu, SOUND_ITEMS } from '../screens/PauseMenu'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { MenuBackdrop } from '../ui/MenuBackdrop'
import { Stage } from '../ui/Stage'
import { LobbyView, SIDE_PANEL, nextMode } from './Lobby'
import Mirror from './Mirror'
import { Podium } from './Podium'
import { Results } from './Results'
import { isPicked, joinAsGuest, lastMode, rememberMode } from './guest'
import { CODE_LENGTH, type PadMode, type PadView, cleanCode } from './protocol'
import { type Seat, localCharacters } from './room'
import { roomModeInfo } from './roomModes'
import { statusText } from './status'

/**
 * Multi Player, joined from a computer: the Room shown just as its Host
 * shows it, but for how to join. Its lobby, with this computer's own
 * Player picked and readied with the keyboard, like a Local Player's; each
 * Round, the race itself, played with the keyboard; the Standings between
 * them; and the Podium. Or, watching the big screen, the keyboard's just
 * their controls. Phones join on their own pages instead (see `Pad`).
 */

/** How this computer played last time, under this, to start on next time. */
const MODE_KEY = 'screen-mode'

/** The keys, for saying so. */
const KEYS_HINT = '← → to run · ↑, W or space to jump · ↓ to duck'

export default function Joined(props: {
	/** A Room Code to join straight away: from a Room's link. */
	code?: string
	onLeave: () => void
}) {
	const given = cleanCode(props.code ?? '')
	const [code, setCode] = createSignal(
		given.length === CODE_LENGTH ? given : '',
	)
	createEffect(() => {
		if (!code()) playMenu()
	})
	return (
		<Show
			when={code()}
			keyed
			fallback={
				<Stage>
					<MenuBackdrop />
					<CodeEntry onCode={setCode} onBack={props.onLeave} />
				</Stage>
			}
		>
			{(joined) => (
				<InRoom
					code={joined}
					onLeave={props.onLeave}
					onAnother={() => setCode('')}
				/>
			)}
		</Show>
	)
}

/** Typing in the Room Code from the big screen. */
function CodeEntry(props: {
	onCode: (code: string) => void
	onBack: () => void
}) {
	const [typed, setTyped] = createSignal('')
	const join = () => {
		if (typed().length !== CODE_LENGTH) return play('back')
		play('select')
		props.onCode(typed())
	}
	const back = () => {
		play('back')
		props.onBack()
	}
	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape') back()
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))
	return (
		<div style={styles.centre}>
			<div style={styles.title}>Join Game</div>
			<Panel style={styles.codePanel}>
				<div style={styles.panelText}>
					Type the Room Code from the big screen
				</div>
				<input
					ref={(input) => onMount(() => input.focus())}
					style={styles.codeInput}
					value={typed()}
					maxLength={CODE_LENGTH}
					autocomplete="off"
					spellcheck={false}
					onInput={(event) => setTyped(cleanCode(event.currentTarget.value))}
					onKeyDown={(event) => {
						if (event.key === 'Enter') join()
					}}
				/>
				<button
					type="button"
					style={{
						...styles.button,
						...(typed().length === CODE_LENGTH ? styles.on : styles.off),
					}}
					disabled={typed().length !== CODE_LENGTH}
					onClick={join}
				>
					Join ↵
				</button>
			</Panel>
			<div style={styles.hint}>
				On a phone? Scan the QR code on the big screen instead.
			</div>
			<button type="button" style={styles.button} onClick={back}>
				← Back
			</button>
		</div>
	)
}

function InRoom(props: {
	code: string
	onLeave: () => void
	onAnother: () => void
}) {
	const [mode, setMode] = createSignal<PadMode>(lastMode(MODE_KEY, 'remote'))
	/**
	 * The menu, over the race. The race goes on: it's the Host's to pause.
	 * Only ever open while the race is shown here, so the keys aren't kept
	 * from the race by a menu that isn't there.
	 */
	const [menuWanted, setMenu] = createSignal(false)
	const menu = () => menuWanted() && !!racingHere()
	const link = joinAsGuest({
		code: props.code,
		mode,
		screen: true,
		held: () => (menu() ? NOTHING_HELD : anyControls()),
	})
	const { view, gone, lost, start, feed, send } = link
	const room = () => view()?.room
	/**
	 * Everyone in the Room, the same objects from one view to the next, so
	 * their cards and rows aren't drawn afresh each time it's sent.
	 */
	const [seats, setSeats] = createStore<Seat[]>([])
	createEffect(() => {
		const next = room()?.seats
		if (next) setSeats(reconcile(next, { key: 'id' }))
	})
	const me = (): Seat | undefined => {
		const v = view()
		return v ? seats[v.number - 1] : undefined
	}
	const stage = () => view()?.stage
	/** The Round, shown here: on now, raced on this screen, and caught up with. */
	const racingHere = () =>
		!gone() && stage() === 'round' && mode() === 'remote' && start()

	const switchMode = (next: PadMode) => {
		if (next === mode()) return
		play('select')
		rememberMode(MODE_KEY, next)
		setMenu(false)
		setMode(next)
		link.switchMode(next)
	}
	const leave = () => {
		play('back')
		link.leave()
		props.onLeave()
	}

	// The course's tune through its Round and its results, as at the Host;
	// the menus' otherwise.
	const tune = createMemo(() => {
		const v = view()
		if (v?.stage !== 'round' && v?.stage !== 'results') return 'menu'
		return COURSES.find((c) => c.name === v.course)?.id ?? 'menu'
	})
	createEffect(() => (tune() === 'menu' ? playMenu() : playTune(tune())))
	createEffect(() => {
		if (stage() !== 'round') setMenu(false)
	})

	/** Their own runners first, then the club: who they can be. */
	const taken = () => view()?.taken ?? []
	const free = (runner: Playable) => !taken().includes(runner.id)
	/** Who they last asked to be, which the Host may not have said yet. */
	let asked: string | undefined
	const pick = (runner: Playable) => {
		asked = runner.id
		send({ type: 'pick', character: runner.id, custom: runner.custom })
	}
	// Straight in as someone: who they last ran as, if they're free, or the
	// first who is. Changed with left and right, like a Local Player.
	createEffect(() => {
		const v = view()
		if (!v || v.full || v.character) return
		const all = localCharacters()
		const runner =
			all.find((c) => c.id === lastRunner() && free(c)) ?? all.find(free)
		if (runner && runner.id !== asked) pick(runner)
	})
	const cycle = (by: number) => {
		const current = asked ?? view()?.character
		const all = localCharacters()
		const at = Math.max(
			0,
			all.findIndex((c) => isPicked(c, current)),
		)
		for (let i = 1; i <= all.length; i++) {
			const next = all[(((at + by * i) % all.length) + all.length) % all.length]
			if (!free(next)) continue
			if (!isPicked(next, current)) {
				play('move')
				pick(next)
			}
			return
		}
	}
	const toggleReady = () => {
		const seat = me()
		if (!seat?.character) return
		play(seat.ready ? 'back' : 'select')
		send({ type: 'ready', ready: !seat.ready })
	}
	const startIt = () => {
		play(room()?.canStart ? 'select' : 'back')
		send({ type: 'start' })
	}

	// The keys, as a Local Player's at the Host: left and right to pick,
	// jump to be ready (or, the Starter, to start it), duck to change your
	// mind (or stop it starting). M for how far, Esc to leave.
	const onKey = (event: KeyboardEvent) => {
		if (event.repeat) return
		const v = view()
		if (!v || gone() || v.full) {
			if (event.key === 'Escape') leave()
			return
		}
		if (v.stage === 'round') {
			const key = event.key
			if (racingHere() && (key === 'Escape' || key === 'p' || key === 'P'))
				setMenu(!menu())
			return
		}
		if (v.stage !== 'lobby' && v.stage !== 'starting') return
		if (event.key === 'Escape') return leave()
		const seat = me()
		if (!seat) return
		const starting = v.stage === 'starting'
		if ((event.key === 'm' || event.key === 'M') && v.isStarter && !starting) {
			play('move')
			send({ type: 'roomMode', mode: nextMode(v.roomMode) })
		}
		const action = actionOfKey(event.key)
		if (action === 'left' || action === 'right') {
			if (!seat.ready && !(v.isStarter && starting))
				cycle(action === 'right' ? 1 : -1)
		}
		if (action === 'up') {
			if (v.isStarter) {
				if (!starting) startIt()
			} else if (!seat.ready) toggleReady()
		}
		if (action === 'down') {
			if (v.isStarter) {
				if (starting) {
					play('back')
					send({ type: 'cancel' })
				}
			} else if (seat.ready) toggleReady()
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	const keysHint = () => (
		<div style={styles.keysHint}>
			<b>← →</b> pick a runner
			<br />
			{view()?.isStarter ? (
				<>
					<b>↑</b> or <b>space</b>: start
					<br />
					<b>M</b>: how far
				</>
			) : (
				<>
					<b>↑</b> or <b>space</b>: ready · <b>↓</b>: not yet
				</>
			)}
		</div>
	)

	return (
		<Switch>
			{/* The race, as if it were run right here. */}
			<Match when={racingHere()} keyed>
				{(round) => (
					<Stage>
						<Mirror
							start={round}
							feed={feed}
							width={VIEW_WIDTH}
							height={VIEW_HEIGHT}
							textScale={1}
						/>
						<Show when={view()?.status === 'waiting'}>
							<div style={styles.banner}>
								Watching: you’re in from the next Round
							</div>
						</Show>
						<Show when={view()?.paused && !menu()}>
							<div style={styles.paused}>Paused at the big screen</div>
						</Show>
						<Show when={menu()}>
							<PauseMenu
								title="Menu"
								hint="Esc to go back · the race goes on"
								groups={[
									[{ label: 'Back to the race', choose: () => setMenu(false) }],
									SOUND_ITEMS,
									[
										{
											label: 'Watch the big screen',
											choose: () => switchMode('controller'),
										},
										{ label: 'Leave the Room', choose: leave },
									],
								]}
							/>
						</Show>
					</Stage>
				)}
			</Match>
			<Match when={true}>
				<Stage>
					<MenuBackdrop />
					<Switch>
						<Match when={gone()}>
							<Message
								title="The Room's closed"
								text="The big screen's left it."
							>
								<button
									type="button"
									style={{ ...styles.button, ...styles.on }}
									onClick={props.onAnother}
								>
									Join another
								</button>
								<button type="button" style={styles.button} onClick={leave}>
									← Menu
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
									style={{ ...styles.button, ...styles.on }}
									onClick={props.onAnother}
								>
									Join another
								</button>
								<button type="button" style={styles.button} onClick={leave}>
									← Menu
								</button>
							</Message>
						</Match>
						<Match when={!view() || !room()}>
							<Message
								title={
									lost() ? `Can't find ${props.code}` : `Joining ${props.code}…`
								}
								text={
									lost()
										? 'Check the code, and that the game’s open on the big screen.'
										: 'Finding the big screen.'
								}
							>
								<Show when={lost()}>
									<button
										type="button"
										style={{ ...styles.button, ...styles.on }}
										onClick={props.onAnother}
									>
										Try another code
									</button>
								</Show>
								<button type="button" style={styles.button} onClick={leave}>
									Cancel
								</button>
							</Message>
						</Match>
						<Match when={stage() === 'round' && view()}>
							{(v) => (
								<Message
									title={
										v().status === 'waiting'
											? 'In from the next Round'
											: statusText(v())
									}
									text={
										mode() === 'remote'
											? 'Catching up with the race…'
											: v().paused
												? 'Paused at the big screen'
												: 'Watch the race on the big screen'
									}
								>
									<Show when={mode() === 'controller'}>
										<div style={styles.hint}>{KEYS_HINT}</div>
										<button
											type="button"
											style={styles.button}
											onClick={() => switchMode('remote')}
										>
											Race on this screen instead
										</button>
									</Show>
								</Message>
							)}
						</Match>
						<Match when={stage() === 'results' && view() && room()}>
							{(r) => {
								const v = () => view() as PadView
								return (
									<Results
										round={v().round}
										of={v().rounds}
										course={v().course}
										next={r().next}
										nextIn={r().nextIn}
										placings={r().placings}
										seats={seats}
										onFinish={
											v().isStarter && roomModeInfo(v().roomMode).repeats
												? () => send({ type: 'finish' })
												: undefined
										}
									/>
								)
							}}
						</Match>
						<Match when={stage() === 'podium' && view() && room()}>
							{(r) => {
								const v = () => view() as PadView
								return (
									<Podium
										title={roomModeInfo(v().roomMode).label}
										rounds={v().round}
										seats={seats}
										placings={r().placings}
										lobbyIn={r().lobbyIn}
										onLobby={
											v().isStarter ? () => send({ type: 'lobby' }) : undefined
										}
										onEnd={leave}
										endLabel="Leave the Room"
									/>
								)
							}}
						</Match>
						<Match when={view() && room()}>
							{(r) => {
								const v = () => view() as PadView
								return (
									<LobbyView
										seats={seats}
										starter={r().starter}
										mode={v().roomMode}
										choosesHere={v().isStarter}
										onMode={(next) => send({ type: 'roomMode', mode: next })}
										canStart={r().canStart}
										startingIn={r().startingIn}
										waitingFor={r().waitingFor}
										leaveLabel="← Leave"
										onLeave={leave}
										here={(seat) => seat.id === me()?.id}
										you={me()?.id}
										onStart={startIt}
										onCycle={(_, by) => cycle(by)}
										onReady={toggleReady}
										side={
											<Panel style={SIDE_PANEL}>
												<div style={styles.roomLabel}>Room</div>
												<div style={styles.code}>{props.code}</div>
												<WatchChoice mode={mode()} onMode={switchMode} />
												{keysHint()}
											</Panel>
										}
									/>
								)
							}}
						</Match>
					</Switch>
				</Stage>
			</Match>
		</Switch>
	)
}

/**
 * Where the race is watched, plain to see: right here, as if it were run
 * on this computer, or on the big screen, with the keyboard just the
 * Player's controls.
 */
function WatchChoice(props: {
	mode: PadMode
	onMode: (mode: PadMode) => void
}) {
	const option = (mode: PadMode, label: string, about: string) => {
		const on = () => props.mode === mode
		return (
			<button
				type="button"
				aria-pressed={on()}
				style={{ ...styles.watchOption, ...(on() ? styles.on : {}) }}
				onClick={() => props.onMode(mode)}
			>
				<span style={styles.mark}>
					<Show when={on()}>
						<span style={styles.dot} />
					</Show>
				</span>
				<span style={styles.watchWords}>
					<span style={{ 'font-size': '16px' }}>{label}</span>
					<span style={styles.watchAbout}>{about}</span>
				</span>
			</button>
		)
	}
	return (
		<div style={styles.watch}>
			<div style={styles.watchLabel}>Watch the race</div>
			{option('remote', 'On this screen', 'Race right here')}
			{option('controller', 'On the big screen', 'Just use the keys here')}
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
			<div style={styles.title}>{props.title}</div>
			<div style={styles.hint}>{props.text}</div>
			{props.children}
		</div>
	)
}

const styles = {
	centre: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '16px',
		'text-align': 'center',
	},
	title: { ...OUTLINED, 'font-size': '40px' },
	hint: { ...OUTLINED, 'font-size': '18px', 'max-width': '560px' },
	codePanel: {
		width: '380px',
		'align-items': 'center',
		gap: '14px',
		padding: '18px',
	},
	panelText: { 'font-size': '18px' },
	codeInput: {
		width: '220px',
		padding: '10px 0 6px',
		'font-family': 'var(--font-pixel)',
		'font-size': '44px',
		'letter-spacing': '8px',
		'text-align': 'center',
		'text-transform': 'uppercase',
		color: 'var(--ink)',
		background: 'white',
		border: '4px solid var(--ink)',
		'box-shadow': '0 0 0 3px white',
		'user-select': 'text',
		'-webkit-user-select': 'text',
	},
	button: {
		padding: '8px 16px 4px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
	},
	on: { background: '#ffd23f', color: 'var(--ink)' },
	off: { opacity: 0.5 },
	roomLabel: { 'font-size': '16px', opacity: 0.75 },
	code: {
		'font-size': '40px',
		'letter-spacing': '6px',
		color: '#ffd23f',
		'text-shadow': '3px 3px 0 #b33a2a',
		'line-height': 1,
	},
	watch: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '8px',
		'align-self': 'stretch',
		'margin-top': '10px',
	},
	watchLabel: { 'font-size': '15px', 'text-align': 'center' },
	watchOption: {
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		padding: '8px 10px 6px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'text-align': 'left',
		cursor: 'pointer',
	},
	watchWords: { display: 'flex', 'flex-direction': 'column', gap: '3px' },
	watchAbout: { 'font-size': '12px', opacity: 0.8 },
	/** A square that's filled in when it's the one. */
	mark: {
		display: 'grid',
		'place-items': 'center',
		width: '20px',
		height: '20px',
		'flex-shrink': 0,
		border: '3px solid currentColor',
		'box-sizing': 'border-box',
		'margin-bottom': '3px',
	},
	dot: { width: '8px', height: '8px', background: 'currentColor' },
	keysHint: {
		'margin-top': 'auto',
		'font-size': '12px',
		'text-align': 'center',
		opacity: 0.8,
		'line-height': 1.5,
	},
	banner: {
		position: 'absolute',
		bottom: '16px',
		left: '50%',
		transform: 'translateX(-50%)',
		padding: '8px 14px 4px',
		background: 'var(--ink)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
		'white-space': 'nowrap',
	},
	paused: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'rgba(15, 31, 41, 0.6)',
		color: 'white',
		'font-family': 'var(--font-pixel)',
		'font-size': '40px',
	},
} satisfies Record<string, JSX.CSSProperties>
