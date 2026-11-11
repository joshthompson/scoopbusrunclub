import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { play } from '../sfx'
import { OUTLINED } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { nameSize } from '../ui/RunnerStage'
import { Medal, ordinal, pts } from './Medal'
import { type Placing, standingsOf } from './Results'
import { COLOURS, type Seat, seatPlayable } from './room'

/** The keys that move between the buttons, and which way. */
const MOVES: Record<string, number> = {
	ArrowLeft: -1,
	ArrowUp: -1,
	ArrowRight: 1,
	ArrowDown: 1,
}

/** Each step's height, 1st to 3rd, and the order they stand in: 2nd, 1st, 3rd. */
const STEP_HEIGHT = [104, 82, 62]
const STEP_ORDER = [1, 0, 2]

/** Confetti: where each bit starts across the screen, how it falls, and its colour. */
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
	left: Math.random() * 100,
	delay: Math.random() * 4,
	fall: 3 + Math.random() * 2.5,
	drift: (Math.random() - 0.5) * 160,
	turn: (Math.random() - 0.5) * 900,
	size: 6 + Math.floor(Math.random() * 3) * 2,
	colour: COLOURS[i % COLOURS.length],
}))

/**
 * The end of a Room's go: the Standings' top three on the Podium, with
 * their medals, and everyone else under it. Back to the lobby by itself,
 * or straight away with Enter.
 */
export function Podium(props: {
	/** How the Room went: Marathon, Backyard Ultra… */
	title: string
	rounds: number
	seats: Seat[]
	/** The last Round's, for anyone level on points. */
	placings: Placing[]
	lobbyIn: number
	/** Back to the lobby: the Host's, or a joined computer's if it's the Starter's. */
	onLobby?: () => void
	onEnd: () => void
	/** What ending is: the Room, at the Host; leaving it, joined from a computer. */
	endLabel?: string
}) {
	const standings = () => standingsOf(props.seats, props.placings)
	const top = () => standings().slice(0, 3)
	const rest = () => standings().slice(3)

	onMount(() => play('cheer'))

	const [picked, setPicked] = createSignal(0)
	const lobby = props.onLobby && {
		label: 'Back to the lobby',
		choose: () => {
			play('select')
			props.onLobby?.()
		},
	}
	const buttons = [
		...(lobby ? [lobby] : []),
		{
			label: props.endLabel ?? 'End the Room',
			choose: () => {
				play('back')
				props.onEnd()
			},
		},
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
		if (event.key === 'Enter') buttons[picked()].choose()
		if (event.key === 'Escape') lobby?.choose()
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<div style={styles.screen}>
			<div style={styles.confetti} aria-hidden="true">
				<For each={CONFETTI}>
					{(bit) => (
						<div
							style={{
								...styles.bit,
								left: `${bit.left}%`,
								width: `${bit.size}px`,
								height: `${bit.size / 2}px`,
								background: bit.colour,
								'--drift': `${bit.drift}px`,
								'--turn': `${bit.turn}deg`,
								animation: `confetti-fall ${bit.fall}s linear ${bit.delay}s infinite`,
							}}
						/>
					)}
				</For>
			</div>

			<div style={styles.title}>{props.title} finished!</div>
			<div style={styles.subtitle}>
				{props.rounds} Round{props.rounds === 1 ? '' : 's'}
			</div>

			<div style={styles.podium}>
				<For each={STEP_ORDER.filter((place) => top()[place])}>
					{(place) => (
						<Step seat={top()[place]} place={(place + 1) as 1 | 2 | 3} />
					)}
				</For>
			</div>

			<Show when={rest().length}>
				<div style={styles.rest}>
					<For each={rest()}>
						{(seat, i) => (
							<span style={styles.also}>
								<span style={{ color: '#ffd23f' }}>{ordinal(i() + 4)}</span>{' '}
								<span style={{ ...styles.chip, background: seat.colour }} />{' '}
								{seatPlayable(seat)?.name} · {pts(seat.points)}
							</span>
						)}
					</For>
				</div>
			</Show>

			<div style={styles.footer}>
				<span style={styles.next}>Back to the lobby in {props.lobbyIn}…</span>
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

/** One Player on their step: their medal, them, the step, and who they are. */
function Step(props: { seat: Seat; place: 1 | 2 | 3 }) {
	const runner = () => seatPlayable(props.seat)
	const winner = () => props.place === 1
	return (
		<div style={styles.column}>
			<div
				style={{
					'transform-origin': 'top center',
					animation: `medal-swing ${winner() ? 1.2 : 1.6}s ease-in-out infinite`,
				}}
			>
				<Medal place={props.place} size={winner() ? 5 : 4} />
			</div>
			<Show when={runner()}>
				{(r) => (
					<RunStrip
						frame={r().sprite.run[0] ?? ''}
						width={r().sprite.width}
						height={r().sprite.height}
						scale={winner() ? 3 : 2.5}
						stride={winner() ? 0.4 : 0.6}
					/>
				)}
			</Show>
			<div
				style={{
					...styles.step,
					height: `${STEP_HEIGHT[props.place - 1]}px`,
					'border-top-color': props.seat.colour,
					animation: `podium-rise 0.5s cubic-bezier(0.2, 1.3, 0.4, 1) ${
						(3 - props.place) * 0.25
					}s both`,
				}}
			>
				<span style={styles.stepNumber}>{props.place}</span>
			</div>
			<div style={styles.caption}>
				<div
					style={{
						...styles.name,
						'font-size': `${nameSize(runner()?.name ?? '', [20, 16, 13])}px`,
					}}
				>
					<span style={{ ...styles.chip, background: props.seat.colour }} />{' '}
					{runner()?.name}
				</div>
				<div style={styles.points}>{pts(props.seat.points)}</div>
			</div>
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
		padding: '16px 24px 14px',
		'box-sizing': 'border-box',
		overflow: 'hidden',
	},
	confetti: {
		position: 'absolute',
		inset: 0,
		'pointer-events': 'none',
		overflow: 'hidden',
	},
	bit: { position: 'absolute', top: 0 },
	title: {
		...OUTLINED,
		'font-size': '36px',
		animation: 'title-in 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	subtitle: { ...OUTLINED, 'font-size': '18px', 'margin-top': '4px' },
	podium: {
		flex: 1,
		'min-height': 0,
		display: 'flex',
		'align-items': 'flex-end',
		'justify-content': 'center',
	},
	column: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		width: '200px',
		gap: '4px',
	},
	step: {
		'align-self': 'stretch',
		display: 'flex',
		'justify-content': 'center',
		'padding-top': '10px',
		'box-sizing': 'border-box',
		background: 'rgba(15, 31, 41, 0.92)',
		border: '3px solid white',
		'border-top-width': '8px',
		'box-shadow': '0 0 0 3px var(--ink)',
		'transform-origin': 'bottom',
		// Stood on its top, not on its border.
		'margin-top': '-4px',
	},
	stepNumber: { ...OUTLINED, 'font-size': '40px', 'line-height': 1 },
	caption: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '2px',
		'margin-top': '10px',
		'min-height': '48px',
		'max-width': '100%',
	},
	// Not clipped: the outline round the letters, and their tops, show.
	// Long names are made smaller to fit (see `nameSize`), not cut off.
	name: {
		...OUTLINED,
		'white-space': 'nowrap',
		'line-height': 1.3,
		padding: '0 4px',
	},
	points: {
		...OUTLINED,
		color: '#ffd23f',
		'font-size': '15px',
		'line-height': 1.3,
	},
	chip: {
		display: 'inline-block',
		width: '10px',
		height: '10px',
		border: '2px solid white',
		'vertical-align': 'middle',
	},
	rest: {
		display: 'flex',
		'flex-wrap': 'wrap',
		'justify-content': 'center',
		gap: '4px 16px',
		'max-width': '820px',
		'margin-top': '6px',
		padding: '6px 12px 3px',
		background: 'rgba(15, 31, 41, 0.75)',
		color: 'white',
		'font-size': '14px',
	},
	also: { 'white-space': 'nowrap' },
	footer: {
		display: 'flex',
		'align-items': 'center',
		gap: '12px',
		'margin-top': '10px',
	},
	next: {
		...OUTLINED,
		'font-size': '18px',
		'line-height': 1.3,
		'white-space': 'nowrap',
		'margin-right': '6px',
	},
	button: {
		padding: '8px 14px 4px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
	},
} satisfies Record<string, JSX.CSSProperties>
