import { For, type JSX, Show, onCleanup } from 'solid-js'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { type Seat, seatPlayable } from './room'

/** One Player's place in a Round, and the points it got them. */
export interface Placing {
	seatId: string
	place: number
	points: number
	how: 'won' | 'finished' | 'scooped'
}

const ordinal = (n: number) =>
	`${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`

/**
 * Between Rounds: how the last one went, and the Standings so far. The next
 * starts by itself, or straight away with Enter.
 */
export function Results(props: {
	round: number
	level: string
	nextLevel: string
	placings: Placing[]
	seats: Seat[]
	nextIn: number
	onNext: () => void
	onLobby: () => void
}) {
	const seat = (id: string) => props.seats.find((s) => s.id === id)
	const standings = () =>
		[...props.seats]
			.filter((s) => s.character)
			.sort((a, b) => b.points - a.points)

	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			play('select')
			props.onNext()
		}
		if (event.key === 'Escape') {
			play('back')
			props.onLobby()
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<div style={styles.screen}>
			<div style={styles.title}>
				Round {props.round} · {props.level}
			</div>
			<div style={styles.body}>
				<Panel title="This Round" style={styles.panel}>
					<For each={props.placings}>
						{(placing) => (
							<Show when={seat(placing.seatId)}>
								{(s) => (
									<Row seat={s()} lead={ordinal(placing.place)}>
										<span style={styles.how}>
											{placing.how === 'won'
												? 'Last standing'
												: placing.how === 'finished'
													? 'Beat the bus'
													: 'Scooped'}
										</span>
										<span style={styles.points}>+{placing.points}</span>
									</Row>
								)}
							</Show>
						)}
					</For>
				</Panel>
				<Panel title="Standings" style={styles.panel}>
					<For each={standings()}>
						{(s, i) => (
							<Row seat={s} lead={`${i() + 1}.`}>
								<span style={styles.points}>{s.points} pts</span>
							</Row>
						)}
					</For>
				</Panel>
			</div>
			<div style={styles.next}>
				Next: {props.nextLevel} in {props.nextIn}…
			</div>
			<div style={styles.buttons}>
				<button
					type="button"
					style={styles.button}
					onClick={() => {
						play('select')
						props.onNext()
					}}
				>
					Go now ↵
				</button>
				<button
					type="button"
					style={styles.button}
					onClick={() => {
						play('back')
						props.onLobby()
					}}
				>
					Back to the lobby
				</button>
			</div>
		</div>
	)
}

function Row(props: { seat: Seat; lead: string; children: JSX.Element }) {
	const runner = () => seatPlayable(props.seat)
	return (
		<div style={styles.row}>
			<span style={styles.lead}>{props.lead}</span>
			<span style={{ ...styles.chip, background: props.seat.colour }} />
			<Show when={runner()}>
				{(r) => (
					<RunStrip
						frame={r().sprite.run[0] ?? ''}
						width={r().sprite.width}
						height={r().sprite.height}
						scale={1}
						stride={0.5}
					/>
				)}
			</Show>
			<span style={styles.name}>{runner()?.name}</span>
			{props.children}
		</div>
	)
}

const styles = {
	screen: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		padding: '18px 24px 14px',
		'box-sizing': 'border-box',
		gap: '10px',
	},
	title: { ...OUTLINED, 'font-size': '34px' },
	body: { display: 'flex', gap: '18px', flex: 1, 'min-height': 0 },
	panel: {
		width: '420px',
		gap: '4px',
		padding: '14px 18px',
		overflow: 'hidden',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '8px',
		height: '40px',
		'font-size': '18px',
	},
	lead: { width: '38px', color: '#ffd23f' },
	chip: {
		width: '12px',
		height: '12px',
		border: '2px solid white',
		'flex-shrink': 0,
	},
	name: {
		flex: 1,
		'white-space': 'nowrap',
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
	},
	how: { 'font-size': '13px', opacity: 0.8 },
	points: { width: '62px', 'text-align': 'right' },
	next: { ...OUTLINED, 'font-size': '22px' },
	buttons: { display: 'flex', gap: '12px' },
	button: {
		padding: '8px 14px 4px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
	},
} satisfies Record<string, JSX.CSSProperties>
