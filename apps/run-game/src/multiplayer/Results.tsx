import { For, type JSX, Show, createSignal, onCleanup } from 'solid-js'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { ordinal } from './Medal'
import { type Seat, seatPlayable } from './room'

/** One Player's place in a Round, and the points it got them. */
export interface Placing {
	seatId: string
	place: number
	points: number
	how: 'won' | 'finished' | 'scooped' | 'fallen'
}

/**
 * Everyone who's picked, most points first; level on points, whoever did
 * better in the last Round. The Podium goes by this too.
 */
export function standingsOf(seats: Seat[], placings: Placing[]) {
	const place = (seat: Seat) =>
		placings.find((p) => p.seatId === seat.id)?.place ??
		Number.POSITIVE_INFINITY
	return [...seats]
		.filter((s) => s.character)
		.sort((a, b) => b.points - a.points || place(a) - place(b))
}

/** The keys that move between the buttons, and which way. */
const MOVES: Record<string, number> = {
	ArrowLeft: -1,
	ArrowUp: -1,
	ArrowRight: 1,
	ArrowDown: 1,
}

/**
 * Between Rounds: the Standings so far, with what each Player got in the
 * last one. What's next (the next Round, or the Podium after the last)
 * comes by itself, or straight away with Enter. A Backyard Ultra can be
 * finished here, and only here. On a computer that's joined the Room, only
 * the Starter's button is there: the rest are the Host's.
 */
export function Results(props: {
	round: number
	/** How many Rounds there are, if it isn't a Backyard Ultra. */
	of?: number
	course: string
	/** What's next, and in how long: the next course, or the Podium. */
	next: string
	nextIn: number
	/** The button for going straight on. */
	nextLabel?: string
	placings: Placing[]
	seats: Seat[]
	onNext?: () => void
	/** Finishing a Backyard Ultra here: to the Podium. */
	onFinish?: () => void
	onLobby?: () => void
}) {
	const placing = (seat: Seat) =>
		props.placings.find((p) => p.seatId === seat.id)
	const standings = () => standingsOf(props.seats, props.placings)

	/** Which button's picked: going on, to begin with. */
	const [picked, setPicked] = createSignal(0)
	const lobby = props.onLobby && {
		label: 'Back to the lobby',
		choose: () => {
			play('back')
			props.onLobby?.()
		},
	}
	const buttons = [
		...(props.onNext
			? [
					{
						label: props.nextLabel ?? 'Go now',
						choose: () => {
							play('select')
							props.onNext?.()
						},
					},
				]
			: []),
		...(props.onFinish
			? [
					{
						label: 'Finish here',
						choose: () => {
							play('select')
							props.onFinish?.()
						},
					},
				]
			: []),
		...(lobby ? [lobby] : []),
	]
	const onKey = (event: KeyboardEvent) => {
		const move = MOVES[event.key]
		if (move) {
			const next = Math.max(0, Math.min(buttons.length - 1, picked() + move))
			if (next !== picked()) {
				play('move')
				setPicked(next)
			}
			event.preventDefault()
		}
		if (event.key === 'Enter') buttons[picked()]?.choose()
		if (event.key === 'Escape') lobby?.choose()
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<div style={styles.screen}>
			<div style={styles.title}>
				Round {props.round}
				{props.of ? ` of ${props.of}` : ''} · {props.course}
			</div>
			<Panel title="Standings" style={styles.panel}>
				<div style={styles.standings}>
					<For each={standings()}>
						{(seat, i) => (
							<Row seat={seat} lead={`${i() + 1}.`}>
								<Show when={placing(seat)}>
									{(p) => (
										<span style={styles.how}>
											{ordinal(p().place)} ·{' '}
											{p().how === 'won'
												? 'Last standing'
												: p().how === 'finished'
													? 'Beat the bus'
													: p().how === 'fallen'
														? 'Fell'
														: 'Scooped'}
										</span>
									)}
								</Show>
								<span style={styles.points}>
									{seat.points}
									<span style={styles.gained}>
										{' '}
										(+{placing(seat)?.points ?? 0})
									</span>
								</span>
							</Row>
						)}
					</For>
				</div>
			</Panel>
			<div style={styles.next}>
				{props.next} in {props.nextIn}…
			</div>
			<div style={styles.buttons}>
				<For each={buttons}>
					{(button, i) => (
						<button
							type="button"
							style={{
								...styles.button,
								...(i() === picked()
									? { background: '#ffd23f', color: 'var(--ink)' }
									: {}),
							}}
							onMouseEnter={() => setPicked(i())}
							onClick={button.choose}
						>
							{button.label}
							{i() === picked() ? ' ↵' : ''}
						</button>
					)}
				</For>
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
	panel: {
		width: '600px',
		flex: 1,
		'min-height': 0,
		gap: '4px',
		padding: '14px 18px',
		overflow: 'hidden',
	},
	/** However many there are, in the panel: scrolled, if there are too many. */
	standings: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '4px',
		'min-height': 0,
		flex: 1,
		'overflow-y': 'auto',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '8px',
		height: '28px',
		'flex-shrink': 0,
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
	how: { 'font-size': '13px', opacity: 0.8, 'white-space': 'nowrap' },
	points: { width: '96px', 'text-align': 'right', 'white-space': 'nowrap' },
	gained: { color: '#ffd23f', 'font-size': '15px' },
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
