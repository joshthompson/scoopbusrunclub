import { For, type JSX, Show, onCleanup } from 'solid-js'
import { LEVELS } from '../levels'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { nameSize } from '../ui/RunnerStage'
import { QrCode } from './QrCode'
import { createLocalPlayers } from './localPlayers'
import { padLink } from './protocol'
import {
	type HostRoom,
	MAX_PLAYERS,
	type Seat,
	seatLabel,
	seatPlayable,
} from './room'

/**
 * Where a Room fills up: its Room Code and QR code for phones, a card for
 * each Player as they join and pick who they'll be, and the course the first
 * Round's on. It starts by itself once everyone who's picked is ready.
 */
export function Lobby(props: {
	room: HostRoom
	levelIndex: number
	onLevel: (index: number) => void
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
		// The course, by number: everything else on the keyboard is a Player's.
		const number = Number(event.key)
		if (number >= 1 && number <= LEVELS.length) {
			play('move')
			props.onLevel(number - 1)
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	const changeLevel = (by: number) => {
		play('move')
		props.onLevel((props.levelIndex + by + LEVELS.length) % LEVELS.length)
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
					<div style={styles.course}>
						<button
							type="button"
							style={styles.arrow}
							onClick={() => changeLevel(-1)}
						>
							‹
						</button>
						<div style={styles.courseName}>
							<span style={{ opacity: 0.75, 'font-size': '16px' }}>
								First course ({props.levelIndex + 1})
							</span>
							<span>{LEVELS[props.levelIndex].name}</span>
						</div>
						<button
							type="button"
							style={styles.arrow}
							onClick={() => changeLevel(1)}
						>
							›
						</button>
					</div>

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
				<span style={{ 'font-size': '13px' }}>{seatLabel(props.seat)}</span>
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
	course: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '14px',
	},
	courseName: {
		...OUTLINED,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '2px',
		width: '260px',
		'font-size': '26px',
	},
	arrow: {
		width: '38px',
		height: '38px',
		padding: '4px 0 0',
		background: 'rgba(15, 31, 41, 0.85)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '24px',
		'line-height': 1,
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
		height: '72px',
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom) 75%, var(--grass-green) 75%)',
	},
	cardArrow: {
		position: 'absolute',
		top: '18px',
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
		margin: '6px 4px 0',
		'white-space': 'nowrap',
		height: '20px',
	},
	cardState: {
		'margin-top': 'auto',
		'margin-bottom': '8px',
		'font-size': '14px',
		opacity: 0.85,
	},
	ready: {
		'margin-top': 'auto',
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
