import { For, type JSX, Show, createSignal, onCleanup } from 'solid-js'
import { paintedArt } from '../courses/kit/pixelArt'
import { play } from '../sfx'
import { OUTLINED, OUTLINED_FLAT, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { nameSize } from '../ui/RunnerStage'
import { NameDialog, typing } from './NameDialog'
import { QrCode } from './QrCode'
import { createLocalPlayers } from './localPlayers'
import {
	type GameMode,
	type RoomMode,
	type RoundKind,
	padLink,
} from './protocol'
import {
	type HostRoom,
	MAX_PLAYERS,
	type Seat,
	seatLabel,
	seatPlayable,
} from './room'
import { GAME_MODES, ROOM_MODES, ROUND_KINDS } from './roomModes'

/** A pencil's size, in cells, drawn at 2 px a cell. */
const PENCIL_CELLS = 9

/**
 * A pencil, slanted, its point down to the left: lead and bare wood at its
 * point, yellow along it (shaded on its underside), a metal band, and a pink
 * eraser. Beside your name in the lobby, to change it.
 */
const PENCIL = paintedArt(PENCIL_CELLS, PENCIL_CELLS, (x, y) => {
	const end = PENCIL_CELLS - 0.5
	// How far along it from its point, bottom left, and how far off its middle.
	const along = (x - 0.5 - (y - end)) / 2
	const across = (x - 0.5 + (y - end)) / 2
	// Sharpened to a point.
	if (Math.abs(across) > Math.min(1, along * 0.6 + 0.2)) return undefined
	if (along < 1) return '#1d1d1d'
	if (along < 2.5) return '#f2c9a0'
	if (along < 6) return across > 0.4 ? '#c9971c' : '#ffd23f'
	if (along < 7) return '#c9d0d8'
	return '#ef6fb4'
})

/** How a Room can go, for the Starter to choose: M to go through them, or click. */
const MODES = ROOM_MODES

/**
 * Where a Room fills up: its Room Code and QR code for phones, and a card for
 * each Player as they join and pick who they'll be. The first to join is the
 * Starter: they choose how it goes, and start it once everyone else who's
 * picked is ready. At the big screen, that's here; on a phone, on theirs.
 */
export function Lobby(props: {
	room: HostRoom
	/** How the Room goes, chosen by its Starter. */
	mode: RoomMode
	/** How it goes, chosen here before anyone's joined. */
	onMode: (mode: RoomMode) => void
	/** How its Rounds are raced, and choosing it here before anyone's joined. */
	gameMode: GameMode
	onGameMode: (mode: GameMode) => void
	/** What its Rounds are, and choosing it here before anyone's joined. */
	roundKind: RoundKind
	onRoundKind: (kind: RoundKind) => void
	/** Whether the Starter can start it: everyone else who's picked is ready. */
	canStart: boolean
	/** Seconds until the first Round, once the Starter's started it. */
	startingIn: number | undefined
	/** Why it isn't starting yet. */
	waitingFor: string
	onLeave: () => void
}) {
	const { room } = props
	const local = createLocalPlayers(room, () => props.mode)
	/**
	 * Whether how it goes can be chosen here: the Starter's at the big screen,
	 * or nobody's joined yet. A Starter on a phone chooses on theirs.
	 */
	const choosesHere = () => room.starter()?.kind !== 'phone'
	const chooseMode = (mode: RoomMode) => {
		const starter = room.starter()
		if (!starter) return props.onMode(mode)
		room.chooseModeAs(starter.id, mode)
	}
	const chooseGameMode = (mode: GameMode) => {
		const starter = room.starter()
		if (!starter) return props.onGameMode(mode)
		room.chooseGameModeAs(starter.id, mode)
	}
	const chooseRoundKind = (kind: RoundKind) => {
		const starter = room.starter()
		if (!starter) return props.onRoundKind(kind)
		room.chooseRoundKindAs(starter.id, kind)
	}
	const coarse = window.matchMedia('(pointer: coarse)').matches
	const link = padLink(room.code)

	const onKey = (event: KeyboardEvent) => {
		// Typing a name: its letters aren't the lobby's keys.
		if (typing()) return
		if (event.key === 'Escape') {
			play('back')
			// Counting down to the first Round: stopped, not the Room left.
			const starter = room.starter()
			if (props.startingIn !== undefined && starter) room.cancelAs(starter.id)
			else props.onLeave()
		}
		// M, for mode: the next one along.
		if ((event.key === 'm' || event.key === 'M') && choosesHere()) {
			play('move')
			chooseMode(nextMode(props.mode))
		}
		// G, for game: Scoop Mode or Baby Mode.
		if ((event.key === 'g' || event.key === 'G') && choosesHere()) {
			play('move')
			chooseGameMode(nextGameMode(props.gameMode))
		}
		// R, for Rounds: races, minigames, or a mixup.
		if ((event.key === 'r' || event.key === 'R') && choosesHere()) {
			play('move')
			chooseRoundKind(nextRoundKind(props.roundKind))
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<LobbyView
			seats={room.seats}
			starter={room.starter()?.id}
			mode={props.mode}
			choosesHere={choosesHere()}
			onMode={chooseMode}
			gameMode={props.gameMode}
			onGameMode={chooseGameMode}
			roundKind={props.roundKind}
			onRoundKind={chooseRoundKind}
			canStart={props.canStart}
			startingIn={props.startingIn}
			waitingFor={props.waitingFor}
			leaveLabel="← Menu"
			onLeave={props.onLeave}
			here={(seat) => seat.kind !== 'phone'}
			onStart={() => {
				const starter = room.starter()
				if (starter) play(room.startAs(starter.id) ? 'select' : 'back')
			}}
			onCycle={(seat, by) => {
				play('move')
				local.cycle(seat, by)
			}}
			onReady={(seat) => {
				play('select')
				room.setReady(seat.id, !seat.ready)
			}}
			onCancel={() => {
				const starter = room.starter()
				if (starter) room.cancelAs(starter.id)
			}}
			onRename={(seat, name) => {
				room.update(seat.id, (s) => {
					s.name = name || undefined
				})
				room.tellPhones()
			}}
			side={
				<Panel style={SIDE_PANEL}>
					<div style={styles.joinLabel}>Room</div>
					<div style={styles.code}>{room.code}</div>
					<div style={styles.qr}>
						<QrCode text={link} size={150} />
					</div>
					<div style={styles.joinHint}>Scan to play on your phone</div>
					<div style={styles.keysHint}>
						On a computer: Multi Player, then Join Game
					</div>
					<div style={styles.keysHint}>
						On here: <b>W</b> or <b>space</b> · <b>↑</b> or <b>Enter</b> ·{' '}
						<b>A</b> on a gamepad
					</div>
					<Show when={coarse && !room.seats.some((s) => s.id === 'touch')}>
						<button
							type="button"
							style={styles.touchJoin}
							onClick={() => local.joinOnTouch()}
						>
							Play on this screen
						</button>
					</Show>
				</Panel>
			}
		/>
	)
}

/** The panel down the lobby's left, for whatever's put there. */
export const SIDE_PANEL: JSX.CSSProperties = {
	width: '210px',
	'flex-shrink': 0,
	'align-items': 'center',
	gap: '6px',
	padding: '14px 12px',
}

/** The other way of racing, for G to switch between them. */
export const nextGameMode = (mode: GameMode) =>
	GAME_MODES[
		(GAME_MODES.findIndex((m) => m.mode === mode) + 1) % GAME_MODES.length
	].mode

/** What a Room's Rounds can be after `kind`, for R to go through them. */
export const nextRoundKind = (kind: RoundKind) =>
	ROUND_KINDS[
		(ROUND_KINDS.findIndex((k) => k.mode === kind) + 1) % ROUND_KINDS.length
	].mode

/** The way a Room can go after `mode`, for M to go through them. */
export const nextMode = (mode: RoomMode) =>
	MODES[(MODES.findIndex((m) => m.mode === mode) + 1) % MODES.length].mode

/**
 * The lobby as the Host shows it, and so as a computer that's joined the
 * Room shows it too: every Player's card, how the Room's going, and why it
 * isn't starting yet, with `side` down the left. Only the seats it's told
 * are `here` can be changed from it.
 */
export function LobbyView(props: {
	seats: Seat[]
	/** The Starter's seat. */
	starter: string | undefined
	mode: RoomMode
	/** Whether how it goes can be chosen here. */
	choosesHere: boolean
	onMode: (mode: RoomMode) => void
	gameMode: GameMode
	onGameMode: (mode: GameMode) => void
	roundKind: RoundKind
	onRoundKind: (kind: RoundKind) => void
	canStart: boolean
	startingIn: number | undefined
	waitingFor: string
	leaveLabel: string
	onLeave: () => void
	/** Down the left: how to join, at the Host; how you're playing, joined. */
	side: JSX.Element
	/** Whether a seat's Player is here, to pick and get ready with it. */
	here: (seat: Seat) => boolean
	/** This computer's own seat, joined: marked as theirs. */
	you?: string
	onStart: () => void
	onCycle: (seat: Seat, by: number) => void
	onReady: (seat: Seat) => void
	/** What a Player here goes by, changed: blank, their runner's name. */
	onRename: (seat: Seat, name: string) => void
	/** Stopping the countdown to the first Round: here if its Starter is (see `choosesHere`). */
	onCancel: () => void
}) {
	/** Whose name's being changed, in its dialog, if anyone's. */
	const [naming, setNaming] = createSignal<string>()
	const namingSeat = () => props.seats.find((s) => s.id === naming())
	/** Who's in this seat, by their runner's own name: what a blank name is. */
	const runnerName = (seat: Seat) =>
		seatPlayable({ ...seat, name: undefined })?.name ?? ''
	/** Who chooses how it goes, if it's not chosen here: the Starter, wherever they are. */
	const chosenBy = () => {
		if (props.choosesHere) return undefined
		const at = props.seats.findIndex((s) => s.id === props.starter)
		return at < 0 ? 'Starter picks' : `P${at + 1} picks`
	}
	return (
		<div style={styles.screen}>
			<div style={styles.top}>
				<button
					type="button"
					style={styles.back}
					onClick={() => {
						play('back')
						props.onLeave()
					}}
				>
					{props.leaveLabel}
				</button>
				<div style={styles.title}>Multi Player</div>
			</div>

			<div style={styles.body}>
				{props.side}

				<div style={styles.right}>
					<div style={styles.slots}>
						<For each={Array.from({ length: MAX_PLAYERS }, (_, i) => i)}>
							{(i) => (
								<Show
									when={props.seats[i]}
									fallback={<div style={styles.emptySlot}>P{i + 1}</div>}
								>
									{(seat) => (
										<SeatCard
											seat={seat()}
											number={i + 1}
											here={props.here(seat())}
											you={props.you === seat().id}
											starter={props.starter === seat().id}
											canStart={props.canStart}
											starting={props.startingIn !== undefined}
											onStart={props.onStart}
											onCycle={(by) => props.onCycle(seat(), by)}
											onReady={() => props.onReady(seat())}
											onRename={() => {
												play('select')
												setNaming(seat().id)
											}}
										/>
									)}
								</Show>
							)}
						</For>
					</div>

					<div style={styles.options}>
						<OptionPicker
							caption="What to play"
							keyName="R"
							options={ROUND_KINDS}
							value={props.roundKind}
							onPick={props.onRoundKind}
							chosenBy={chosenBy()}
						/>
						<OptionPicker
							caption="How far"
							keyName="M"
							options={MODES}
							value={props.mode}
							onPick={props.onMode}
							chosenBy={chosenBy()}
						/>
						<OptionPicker
							caption="How to race"
							keyName="G"
							options={GAME_MODES}
							value={props.gameMode}
							onPick={props.onGameMode}
							chosenBy={chosenBy()}
						/>
					</div>

					<div style={styles.status}>
						<Show
							when={props.startingIn !== undefined}
							fallback={props.waitingFor}
						>
							Starting in {props.startingIn}…
							{/* Whoever started it, here, can stop it: Esc does too. */}
							<Show when={props.choosesHere}>
								<button
									type="button"
									style={styles.cancel}
									onClick={() => {
										play('back')
										props.onCancel()
									}}
								>
									Cancel (Esc)
								</button>
							</Show>
						</Show>
					</div>
				</div>
			</div>
			<Show when={namingSeat()}>
				{(seat) => (
					<NameDialog
						who={`P${props.seats.indexOf(seat()) + 1}`}
						colour={seat().colour}
						name={seat().name ?? ''}
						placeholder={runnerName(seat())}
						onName={(name) => props.onRename(seat(), name)}
						onClose={() => setNaming(undefined)}
					/>
				)}
			</Show>
		</div>
	)
}

/**
 * An arrow, in pixels, pointing the way it goes: `facing` 1 right, -1 left.
 * Drawn, not a letter, so it's square in the middle of its button.
 */
function PixelArrow(props: { facing: 1 | -1 }) {
	return (
		<svg
			width={10}
			height={18}
			viewBox="0 0 5 9"
			shape-rendering="crispEdges"
			aria-hidden="true"
			style={{
				display: 'block',
				transform: props.facing < 0 ? 'scaleX(-1)' : undefined,
			}}
		>
			<For each={[0, 1, 2, 3, 4]}>
				{(x) => <rect x={x} y={x} width={1} height={9 - 2 * x} fill="white" />}
			</For>
		</svg>
	)
}

/**
 * One of how the Room's set, under the cards: what it's on, with arrows
 * either side to go through the rest (or its key), and a pip for each.
 * Only its Starter can change it: anywhere else, it just says who does.
 */
function OptionPicker<M extends string>(props: {
	caption: string
	/** The key that goes to the next one. */
	keyName: string
	options: { mode: M; label: string; note: string }[]
	value: M
	onPick: (mode: M) => void
	/** Who chooses it instead, if it can't be chosen here. */
	chosenBy?: string
}) {
	const at = () =>
		Math.max(
			0,
			props.options.findIndex((o) => o.mode === props.value),
		)
	const current = () => props.options[at()]
	const step = (by: 1 | -1) => {
		play('move')
		const count = props.options.length
		props.onPick(props.options[(at() + by + count) % count].mode)
	}
	const arrow = (by: 1 | -1) => (
		<Show when={!props.chosenBy}>
			<button
				type="button"
				class="seat-arrow"
				aria-label={`${by < 0 ? 'Previous' : 'Next'}: ${props.caption}`}
				style={styles.optionArrow}
				onClick={() => step(by)}
			>
				<PixelArrow facing={by} />
			</button>
		</Show>
	)
	return (
		<div
			style={{
				...styles.option,
				...(props.chosenBy ? styles.optionLocked : {}),
			}}
		>
			<div style={styles.optionCaption}>
				{props.caption}
				<span style={styles.optionKey}>{props.chosenBy ?? props.keyName}</span>
			</div>
			<div style={styles.optionPips}>
				<For each={props.options}>
					{(o) => (
						<span
							style={{
								...styles.pip,
								...(o.mode === props.value ? styles.pipOn : {}),
							}}
						/>
					)}
				</For>
			</div>
			{arrow(-1)}
			<div style={styles.optionValue}>
				<span style={styles.optionLabel}>{current().label}</span>
				<span style={styles.optionNote}>{current().note}</span>
			</div>
			{arrow(1)}
		</div>
	)
}

/** A Player: who they are, how they're playing, and whether they're ready. */
function SeatCard(props: {
	seat: Seat
	number: number
	/** Whether they're here, to pick and get ready on this card. */
	here: boolean
	/** This computer's own, joined. */
	you: boolean
	/** Whether they're the Starter: they start the Room, here or from their phone. */
	starter: boolean
	canStart: boolean
	/** Counting down to the first Round. */
	starting: boolean
	onStart: () => void
	onCycle: (by: number) => void
	onReady: () => void
	/** Opening the dialog to change what they go by. */
	onRename: () => void
}) {
	const runner = () => seatPlayable(props.seat)
	const local = () => props.here
	/** Whether they can still change their name here: here, and not ready yet (or, the Starter, not starting). */
	const canRename = () =>
		local() && (props.starter ? !props.starting : !props.seat.ready)
	return (
		<div
			style={{
				...styles.card,
				'border-color': props.seat.ready ? '#ffd23f' : 'white',
			}}
		>
			<div style={{ ...styles.cardTop, background: props.seat.colour }}>
				<span>P{props.number}</span>
				<Show when={props.starter}>
					<span style={styles.starterBadge}>Starter</span>
				</Show>
				<Show
					when={props.you}
					fallback={
						<span style={{ 'font-size': '13px' }}>{seatLabel(props.seat)}</span>
					}
				>
					<span style={styles.youBadge}>You</span>
				</Show>
			</div>
			<div style={styles.cardRunner}>
				<Show
					when={
						local() && (props.starter ? !props.starting : !props.seat.ready)
					}
				>
					<For each={[-1, 1] as const}>
						{(by) => (
							<button
								type="button"
								class="seat-arrow"
								aria-label={by < 0 ? 'Previous runner' : 'Next runner'}
								style={{
									...styles.cardArrow,
									background: props.seat.colour,
									...(by < 0 ? { left: '6px' } : { right: '6px' }),
								}}
								onClick={() => props.onCycle(by)}
							>
								<PixelArrow facing={by} />
							</button>
						)}
					</For>
				</Show>
				<Show
					when={runner()}
					fallback={<div style={styles.picking}>Picking…</div>}
				>
					{(runner) => (
						<RunStrip
							run={runner().sprite.run}
							width={runner().sprite.width}
							height={runner().sprite.height}
							scale={2}
							stride={props.seat.ready ? 0.4 : 0.9}
						/>
					)}
				</Show>
			</div>
			<div
				style={{
					...styles.cardName,
					'font-size': `${nameSize(runner()?.name ?? '', [20, 16, 13])}px`,
				}}
			>
				<span style={styles.cardNameText}>{runner()?.name ?? ' '}</span>
				<Show when={canRename() && runner()}>
					<button
						type="button"
						class="seat-arrow"
						aria-label="Change your name"
						title="Change your name"
						style={styles.renameButton}
						onClick={props.onRename}
					>
						<img src={PENCIL} alt="" class="pixelated" style={styles.pencil} />
					</button>
				</Show>
			</div>
			<Show
				when={!props.seat.lostAt}
				fallback={<div style={styles.cardState}>Reconnecting…</div>}
			>
				<Show
					when={local()}
					fallback={
						<div style={styles.cardState}>
							{props.starter
								? props.starting
									? 'Starting…'
									: 'Starts it'
								: props.seat.ready
									? 'Ready!'
									: props.seat.kind === 'phone'
										? 'On their own screen'
										: 'At the big screen'}
						</div>
					}
				>
					<Show
						when={!props.starter}
						fallback={
							<button
								type="button"
								disabled={!props.canStart || props.starting}
								style={{
									...styles.ready,
									...(props.canStart || props.starting
										? styles.readyOn
										: styles.startOff),
								}}
								onClick={props.onStart}
							>
								{props.starting ? 'Starting…' : 'Jump: start'}
							</button>
						}
					>
						<button
							type="button"
							style={{
								...styles.ready,
								...(props.seat.ready ? styles.readyOn : {}),
							}}
							onClick={props.onReady}
						>
							{props.seat.ready ? 'Ready!' : 'Jump: ready'}
						</button>
					</Show>
				</Show>
			</Show>
		</div>
	)
}

const styles = {
	/** How the Room's set, side by side under the cards: one short row. */
	/** On the same columns as the cards over them: two each, edge to edge with them. */
	options: {
		display: 'grid',
		'grid-template-columns': 'repeat(6, 1fr)',
		gap: '10px',
		'margin-top': '12px',
		'flex-shrink': 0,
	},
	option: {
		position: 'relative',
		'grid-column': 'span 2',
		'min-width': 0,
		display: 'flex',
		'align-items': 'center',
		// Three in a row: as little room round its words as will do.
		gap: '4px',
		height: '52px',
		padding: '4px 5px',
		'box-sizing': 'border-box',
		background: 'rgba(15, 31, 41, 0.92)',
		border: '3px solid white',
		'box-shadow': '0 0 0 3px var(--ink)',
	},
	optionLocked: { border: '3px solid rgba(255, 255, 255, 0.5)' },
	/** What it is, sat on its top edge, and the key that changes it. */
	optionCaption: {
		position: 'absolute',
		top: '-15px',
		left: '10px',
		display: 'flex',
		'align-items': 'center',
		gap: '6px',
		padding: '2px 6px',
		background: 'var(--ink)',
		color: 'white',
		border: '2px solid white',
		'font-size': '12px',
		'line-height': 1,
		'white-space': 'nowrap',
	},
	optionKey: {
		padding: '1px 4px 2px',
		// The caption's text sits high to look centred; the key's box mustn't.
		position: 'relative',
		top: '1px',
		background: '#ffd23f',
		color: 'var(--ink)',
		'font-size': '11px',
	},
	/** Which of them it's on: a pip each, top right. */
	optionPips: {
		position: 'absolute',
		top: '-5px',
		right: '10px',
		display: 'flex',
		gap: '3px',
		padding: '0 4px',
		background: 'var(--ink)',
	},
	pip: {
		width: '6px',
		height: '6px',
		background: 'rgba(255, 255, 255, 0.35)',
	},
	pipOn: { background: '#ffd23f' },
	optionArrow: {
		width: '26px',
		height: '30px',
		'flex-shrink': 0,
		padding: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'var(--bus-red)',
		border: '3px solid white',
		'box-shadow': '3px 3px 0 var(--ink)',
	},
	optionValue: {
		flex: 1,
		'min-width': 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '3px',
		'white-space': 'nowrap',
		overflow: 'hidden',
	},
	optionLabel: {
		color: '#ffd23f',
		'font-size': '15px',
		'line-height': 1,
	},
	optionNote: {
		'font-size': '10px',
		'line-height': 1,
		opacity: 0.8,
	},
	starterBadge: {
		padding: '2px 6px 0',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '2px solid var(--ink)',
		'font-size': '12px',
		'text-shadow': 'none',
		'white-space': 'nowrap',
	},
	youBadge: {
		padding: '2px 6px 0',
		background: 'white',
		color: 'var(--ink)',
		border: '2px solid var(--ink)',
		'font-size': '12px',
		'text-shadow': 'none',
	},
	startOff: { opacity: 0.5 },
	screen: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		'flex-direction': 'column',
		padding: '14px 20px 12px',
		'box-sizing': 'border-box',
	},
	top: {
		position: 'relative',
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		height: '40px',
	},
	back: {
		position: 'absolute',
		left: 0,
		padding: '4px 10px',
		background: 'rgba(15, 31, 41, 0.85)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '16px',
	},
	title: { ...OUTLINED, 'font-size': '34px' },
	body: {
		display: 'flex',
		gap: '18px',
		'margin-top': '12px',
		flex: 1,
		'min-height': 0,
	},
	joinLabel: { 'font-size': '16px', opacity: 0.75 },
	code: {
		'font-size': '48px',
		'letter-spacing': '6px',
		color: '#ffd23f',
		'text-shadow': '3px 3px 0 #b33a2a',
		'line-height': 1,
	},
	qr: { padding: '4px', background: 'white', 'margin-top': '4px' },
	joinHint: { 'font-size': '15px', 'text-align': 'center' },
	keysHint: {
		'font-size': '12px',
		'text-align': 'center',
		opacity: 0.8,
		'line-height': 1.4,
	},
	touchJoin: {
		'margin-top': '4px',
		padding: '6px 10px',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '16px',
	},
	right: {
		flex: 1,
		display: 'flex',
		'flex-direction': 'column',
		gap: '10px',
		'min-width': 0,
	},
	slots: {
		display: 'grid',
		'grid-template-columns': 'repeat(4, 1fr)',
		'grid-template-rows': 'repeat(2, 1fr)',
		gap: '10px',
		flex: 1,
		'min-height': 0,
	},
	emptySlot: {
		display: 'grid',
		'place-items': 'center',
		border: '3px dashed rgba(255, 255, 255, 0.6)',
		background: 'rgba(15, 31, 41, 0.35)',
		color: 'rgba(255, 255, 255, 0.7)',
		'font-size': '22px',
	},
	card: {
		position: 'relative',
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		background: 'rgba(15, 31, 41, 0.92)',
		border: '3px solid white',
		'box-shadow': '0 0 0 3px var(--ink)',
		overflow: 'hidden',
		animation: 'panel-in 0.3s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	cardTop: {
		display: 'flex',
		'justify-content': 'space-between',
		'align-items': 'center',
		'align-self': 'stretch',
		padding: '2px 6px 3px',
		'font-size': '16px',
		color: 'white',
		'text-shadow': '2px 2px 0 var(--ink)',
	},
	cardRunner: {
		position: 'relative',
		display: 'flex',
		'align-items': 'flex-end',
		'justify-content': 'center',
		'align-self': 'stretch',
		// What's left of the card, after its name and button.
		flex: 1,
		'min-height': '56px',
		// Stood in the grass, not at its bottom edge, with the horizon up behind them.
		'padding-bottom': '14px',
		'box-sizing': 'border-box',
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom) 62%, var(--grass-green) 62%)',
	},
	/** Either side of the runner: in the Player's colour, an arrow in it. */
	cardArrow: {
		position: 'absolute',
		top: '50%',
		'margin-top': '-19px',
		width: '30px',
		height: '36px',
		padding: 0,
		display: 'grid',
		'place-items': 'center',
		border: '3px solid white',
		'box-shadow': '3px 3px 0 var(--ink)',
		'z-index': 1,
	},
	picking: {
		'align-self': 'center',
		color: 'var(--ink)',
		'font-size': '16px',
	},
	cardName: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		'align-self': 'stretch',
		height: '28px',
		padding: '2px 4px 0',
		'flex-shrink': 0,
		'white-space': 'nowrap',
		overflow: 'hidden',
		'line-height': 1,
	},
	cardNameText: {
		'min-width': 0,
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
	},
	/** Beside their name, to change it: a pencil. */
	renameButton: {
		'flex-shrink': 0,
		'margin-left': '4px',
		padding: '0 2px',
		background: 'transparent',
		color: 'white',
		border: 'none',
		'line-height': 0,
		cursor: 'pointer',
	},
	pencil: {
		display: 'block',
		width: `${PENCIL_CELLS * 2}px`,
		height: `${PENCIL_CELLS * 2}px`,
	},
	cardState: {
		display: 'flex',
		'align-items': 'center',
		height: '30px',
		'margin-bottom': '6px',
		'flex-shrink': 0,
		'font-size': '14px',
		opacity: 0.85,
	},
	ready: {
		height: '30px',
		'flex-shrink': 0,
		'margin-bottom': '6px',
		padding: '3px 8px 4px',
		background: 'transparent',
		color: 'white',
		border: '2px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '14px',
	},
	readyOn: {
		background: '#ffd23f',
		color: 'var(--ink)',
	},
	cancel: {
		'margin-left': '12px',
		padding: '2px 10px 3px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '16px',
		'text-shadow': 'none',
		'vertical-align': 'middle',
	},
	status: {
		...OUTLINED_FLAT,
		'text-align': 'center',
		'font-size': '22px',
		height: '26px',
	},
} satisfies Record<string, JSX.CSSProperties>
