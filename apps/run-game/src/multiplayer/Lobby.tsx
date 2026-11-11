import { For, type JSX, Show, onCleanup } from 'solid-js'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { nameSize } from '../ui/RunnerStage'
import { QrCode } from './QrCode'
import { createLocalPlayers } from './localPlayers'
import { type RoomMode, padLink } from './protocol'
import {
	type HostRoom,
	MAX_PLAYERS,
	type Seat,
	seatLabel,
	seatPlayable,
} from './room'
import { ROOM_MODES } from './roomModes'

/** How a Room can go, for the Host to choose: M to go through them, or click. */
const MODES = ROOM_MODES

/**
 * Where a Room fills up: its Room Code and QR code for phones, and a card for
 * each Player as they join and pick who they'll be. It starts by itself once
 * everyone who's picked is ready, on every course in a shuffled order; or,
 * if the first to join is a Remote Player, when they press Start.
 */
export function Lobby(props: {
	room: HostRoom
	/** How the Room goes, chosen by the Host. */
	mode: RoomMode
	onMode: (mode: RoomMode) => void
	/** Seconds until the first Round, once everyone's ready. */
	startingIn: number | undefined
	/** Why it isn't starting yet. */
	waitingFor: string
	onLeave: () => void
}) {
	const { room } = props
	const local = createLocalPlayers(room)
	const coarse = window.matchMedia('(pointer: coarse)').matches
	const link = padLink(room.code)

	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			play('back')
			props.onLeave()
		}
		// M, for mode: the next one along.
		if (event.key === 'm' || event.key === 'M') {
			const at = MODES.findIndex((m) => m.mode === props.mode)
			play('move')
			props.onMode(MODES[(at + 1) % MODES.length].mode)
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
						props.onLeave()
					}}
				>
					← Menu
				</button>
				<div style={styles.title}>Multi Player</div>
			</div>

			<div style={styles.body}>
				<Panel style={styles.join}>
					<div style={styles.joinLabel}>Room</div>
					<div style={styles.code}>{room.code}</div>
					<div style={styles.qr}>
						<QrCode text={link} size={150} />
					</div>
					<div style={styles.joinHint}>Scan to play on your phone</div>
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

				<div style={styles.right}>
					<div style={styles.slots}>
						<For each={Array.from({ length: MAX_PLAYERS }, (_, i) => i)}>
							{(i) => (
								<Show
									when={room.seats[i]}
									fallback={<div style={styles.emptySlot}>P{i + 1}</div>}
								>
									{(seat) => (
										<SeatCard
											seat={seat()}
											number={i + 1}
											starter={room.starter() === seat()}
											onCycle={(by) => {
												play('move')
												local.cycle(seat(), by)
											}}
											onReady={() => {
												play('select')
												room.setReady(seat().id, !seat().ready)
											}}
										/>
									)}
								</Show>
							)}
						</For>
					</div>

					<div style={styles.modes}>
						<For each={MODES}>
							{(m) => (
								<button
									type="button"
									style={{
										...styles.mode,
										...(props.mode === m.mode ? styles.modeOn : {}),
									}}
									onClick={() => {
										play('select')
										props.onMode(m.mode)
									}}
								>
									<span>{m.label}</span>
									<span style={styles.modeNote}>{m.note}</span>
								</button>
							)}
						</For>
					</div>

					<div style={styles.status}>
						<Show
							when={props.startingIn !== undefined}
							fallback={props.waitingFor}
						>
							Starting in {props.startingIn}…
						</Show>
					</div>
				</div>
			</div>
		</div>
	)
}

/** A Player: who they are, how they're playing, and whether they're ready. */
function SeatCard(props: {
	seat: Seat
	number: number
	/** Whether they're the Starter: they start the Room, from their phone. */
	starter: boolean
	onCycle: (by: number) => void
	onReady: () => void
}) {
	const runner = () => seatPlayable(props.seat)
	const local = () => props.seat.kind !== 'phone'
	return (
		<div
			style={{
				...styles.card,
				'border-color': props.seat.ready ? '#ffd23f' : 'white',
			}}
		>
			<div style={{ ...styles.cardTop, background: props.seat.colour }}>
				<span>P{props.number}</span>
				<span style={{ 'font-size': '13px' }}>
					{props.starter ? 'Starter · ' : ''}
					{seatLabel(props.seat)}
				</span>
			</div>
			<div style={styles.cardRunner}>
				<Show when={local() && !props.seat.ready}>
					<button
						type="button"
						style={{ ...styles.cardArrow, left: '2px' }}
						onClick={() => props.onCycle(-1)}
					>
						‹
					</button>
					<button
						type="button"
						style={{ ...styles.cardArrow, right: '2px' }}
						onClick={() => props.onCycle(1)}
					>
						›
					</button>
				</Show>
				<Show
					when={runner()}
					fallback={<div style={styles.picking}>Picking…</div>}
				>
					{(runner) => (
						<RunStrip
							frame={runner().sprite.run[0] ?? ''}
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
				{runner()?.name ?? ' '}
			</div>
			<Show
				when={!props.seat.lostAt}
				fallback={<div style={styles.cardState}>Reconnecting…</div>}
			>
				<Show
					when={local()}
					fallback={
						<div style={styles.cardState}>
							{props.seat.ready ? 'Ready!' : 'On their phone'}
						</div>
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
		</div>
	)
}

const styles = {
	modes: {
		display: 'flex',
		gap: '8px',
		'justify-content': 'center',
		'margin-top': '8px',
	},
	mode: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '2px',
		padding: '6px 12px 4px',
		background: 'rgba(15, 31, 41, 0.75)',
		color: 'white',
		border: '3px solid rgba(255, 255, 255, 0.4)',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
		cursor: 'pointer',
	},
	modeOn: {
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
	},
	modeNote: {
		'font-size': '12px',
		opacity: 0.8,
	},
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
		padding: '6px 10px 2px',
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
	join: {
		width: '210px',
		'flex-shrink': 0,
		'align-items': 'center',
		gap: '6px',
		padding: '14px 12px',
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
		padding: '8px 10px 4px',
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
		padding: '4px 6px 1px',
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
	cardArrow: {
		position: 'absolute',
		top: '50%',
		'margin-top': '-15px',
		width: '24px',
		height: '30px',
		padding: '3px 0 0',
		background: 'rgba(15, 31, 41, 0.75)',
		color: 'white',
		border: '2px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
		'line-height': 1,
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
		padding: '5px 8px 2px',
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
	status: {
		...OUTLINED,
		'text-align': 'center',
		'font-size': '22px',
		height: '26px',
	},
} satisfies Record<string, JSX.CSSProperties>
