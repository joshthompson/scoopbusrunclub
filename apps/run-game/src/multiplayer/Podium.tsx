import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { Controls } from '../input'
import { play } from '../sfx'
import { OUTLINED, OUTLINED_FLAT } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'
import { onHover } from '../ui/hover'
import { Medal, ordinal, pts } from './Medal'
import { NameTag, hatRise, tagOver } from './NameTag'
import { PodiumPlay } from './PodiumPlay'
import { PODIUM_BACK, PodiumScene } from './PodiumScene'
import { type Placing, standingsOf } from './Results'
import { Worn } from './Worn'
import {
	PODIUM_CELL,
	STEP_COLUMNS,
	STEP_ROWS,
	STEP_STAND,
	podiumStep,
} from './podiumArt'
import { COLOURS, type Seat, seatPlayable } from './room'

/** The keys that move between the buttons, and which way. */
const MOVES: Record<string, number> = {
	ArrowLeft: -1,
	ArrowUp: -1,
	ArrowRight: 1,
	ArrowDown: 1,
}

/** The order the steps stand in: 2nd, 1st, 3rd. */
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
 * The end of a Room's go, out on Haga: the Standings' top three on the
 * Podium, put up on its path, their medals round their necks, everyone
 * else beside it, and the Standings up in the corner, points and all.
 * Up as long as everyone likes, running about on it: back to the lobby
 * only when the Host, or the Starter, says so.
 */
export function Podium(props: {
	/** How the Room went: Marathon, Backyard Ultra… */
	title: string
	rounds: number
	seats: Seat[]
	/** The last Round's, for anyone level on points. */
	placings: Placing[]
	/** Back to the lobby: the Host's, or a joined computer's if it's the Starter's. */
	onLobby?: () => void
	onEnd: () => void
	/** What ending is: the Room, at the Host; leaving it, joined from a computer. */
	endLabel?: string
	/**
	 * Each Player's controls, where they're to hand (at the Host): everyone
	 * runs and jumps about on the Podium with them till it's back to the
	 * lobby. Without them, the top three just run on the spot.
	 */
	controlsFor?: (seat: Seat) => () => Controls
}) {
	const standings = () => standingsOf(props.seats, props.placings)
	const top = () => standings().slice(0, 3)

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
	let screen: HTMLDivElement | undefined
	let podium: HTMLDivElement | undefined
	/** The top three's steps, by seat, for them to stand on. */
	const steps = new Map<string, HTMLElement>()
	/**
	 * Someone running about with the arrows: they don't move between the
	 * buttons too, or Enter could end the Room by surprise.
	 */
	const arrowsRun = () =>
		!!props.controlsFor && props.seats.some((s) => s.kind === 'arrows')

	const onKey = (event: KeyboardEvent) => {
		// Space is a jump, not a press of whichever button has the focus.
		if (props.controlsFor && event.key === ' ') event.preventDefault()
		const move = arrowsRun() ? undefined : MOVES[event.key]
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
		<div style={styles.screen} ref={screen}>
			<PodiumScene />
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

			<div style={styles.title}>Finished!</div>
			<div style={styles.subtitle}>
				{props.title} ·{props.rounds} Round{props.rounds === 1 ? '' : 's'}
				{props.controlsFor ? ' · Run about, and jump on the podium!' : ''}
			</div>

			<div style={styles.podium} ref={podium}>
				{/* All three steps, always: one nobody's on, bare, but still there
				    to jump on. */}
				<For each={STEP_ORDER}>
					{(place) => (
						<Step
							seat={top()[place]}
							place={(place + 1) as 1 | 2 | 3}
							loose={!!props.controlsFor}
							onStep={(step) =>
								steps.set(top()[place]?.id ?? `empty:${place + 1}`, step)
							}
						/>
					)}
				</For>
			</div>

			<Show when={props.controlsFor}>
				{(controlsFor) => (
					<PodiumPlay
						standings={standings()}
						playableOf={seatPlayable}
						controlsFor={controlsFor()}
						steps={() => steps}
						ground={() => podium}
						screen={() => screen}
					/>
				)}
			</Show>

			{/* The Standings, everyone, up in the corner. */}
			<div style={styles.board}>
				<div style={styles.boardTitle}>Standings</div>
				<For each={standings()}>
					{(seat, i) => (
						<div style={styles.row}>
							<span style={styles.rank}>
								<Show when={i() < 3} fallback={ordinal(i() + 1)}>
									<Medal place={(i() + 1) as 1 | 2 | 3} size={1.5} />
								</Show>
							</span>
							<span style={{ ...styles.chip, background: seat.colour }} />
							<span style={styles.rowName}>{seatPlayable(seat)?.name}</span>
							<span style={styles.rowPoints}>{pts(seat.points)}</span>
						</div>
					)}
				</For>
			</div>

			<div style={styles.footer}>
				<span style={styles.next}>
					{props.onLobby
						? 'Stay as long as you like'
						: 'Back to the lobby when P1’s ready'}
				</span>
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
							onMouseEnter={onHover(() => setPicked(i()))}
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

/**
 * One Player on their step: them, their medal round their neck, and the
 * step. Or, with nobody for it, the step, bare.
 */
function Step(props: {
	seat: Seat | undefined
	place: 1 | 2 | 3
	/** Their runner's loose, run about by them (see `PodiumPlay`): only room left for them here. */
	loose?: boolean
	onStep?: (step: HTMLElement) => void
}) {
	const runner = () => props.seat && seatPlayable(props.seat)
	const winner = () => props.place === 1
	const scale = () => (winner() ? 3 : 2.5)
	return (
		<div style={styles.column}>
			<Show when={runner()}>
				{(r) => (
					<div
						style={{
							position: 'relative',
							width: `${r().sprite.width * scale()}px`,
							height: `${r().sprite.height * scale()}px`,
							// Stood on its lit top, in front of the step's back edge.
							'margin-bottom': `${-STEP_STAND * PODIUM_CELL}px`,
							'z-index': 1,
						}}
					>
						<Show when={!props.loose}>
							<RunStrip
								run={r().sprite.run}
								width={r().sprite.width}
								height={r().sprite.height}
								scale={scale()}
								stride={winner() ? 0.4 : 0.6}
							/>
							<Worn
								frame={r().sprite.run[0]}
								width={r().sprite.width * scale()}
								height={r().sprite.height * scale()}
								scale={scale()}
								hat={props.seat?.hat}
								place={props.place}
								sprite={r().sprite}
							/>
							<NameTag
								colour={props.seat?.colour ?? 'var(--ink)'}
								size={11}
								style={tagOver(hatRise(r(), props.seat?.hat, scale()))}
							>
								{r().name}
							</NameTag>
						</Show>
					</div>
				)}
			</Show>
			{/* Stood on the ground, pixel art, square: their place on it, and
			    their points. */}
			<img
				ref={(step) => props.onStep?.(step)}
				src={podiumStep(props.place, props.seat)}
				alt={`${props.place}`}
				class="pixelated"
				style={{
					display: 'block',
					width: `${STEP_COLUMNS * PODIUM_CELL}px`,
					height: `${STEP_ROWS[props.place - 1] * PODIUM_CELL}px`,
				}}
			/>
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
		position: 'relative',
		'font-size': '36px',
		animation: 'title-in 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	subtitle: {
		...OUTLINED_FLAT,
		position: 'relative',
		'font-size': '18px',
		'margin-top': '4px',
	},
	// Stood on Haga's path, in the middle, at the back of it: everyone runs
	// about along its front, in front of the steps.
	podium: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		height: `${PODIUM_BACK}px`,
		width: 'fit-content',
		margin: '0 auto',
		display: 'flex',
		'align-items': 'flex-end',
		'justify-content': 'center',
	},
	column: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		width: '170px',
	},
	chip: {
		display: 'inline-block',
		width: '10px',
		height: '10px',
		border: '2px solid white',
		'vertical-align': 'middle',
	},
	/** The Standings, up in the top right corner. */
	board: {
		position: 'absolute',
		top: '14px',
		right: '16px',
		width: '220px',
		padding: '8px 12px 6px',
		'box-sizing': 'border-box',
		background: 'rgba(15, 31, 41, 0.88)',
		border: '3px solid white',
		'box-shadow': '0 0 0 3px var(--ink), 6px 6px 0 3px rgba(15, 31, 41, 0.35)',
		color: 'white',
		'z-index': 2,
	},
	boardTitle: {
		'font-size': '16px',
		color: '#ffd23f',
		'text-align': 'center',
		'margin-bottom': '4px',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '6px',
		height: '24px',
		'font-size': '14px',
		'white-space': 'nowrap',
	},
	rank: {
		width: '28px',
		display: 'flex',
		'justify-content': 'center',
		color: '#ffd23f',
	},
	rowName: {
		flex: 1,
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
	},
	rowPoints: { color: '#ffd23f' },
	// Along the grass in front of the path.
	footer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: '14px',
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '12px',
		'z-index': 2,
	},
	next: {
		...OUTLINED_FLAT,
		'font-size': '18px',
		'line-height': 1.3,
		'white-space': 'nowrap',
		'margin-right': '6px',
	},
	button: {
		padding: '6px 14px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
	},
} satisfies Record<string, JSX.CSSProperties>
