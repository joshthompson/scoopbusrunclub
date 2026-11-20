import { For, type JSX, Show, createSignal, onCleanup } from 'solid-js'
import type { World } from '../game/world'
import { type Action, type Controls, anyControls, setTouch } from '../input'
import { type Minigame, botsFor } from '../minigames'
import { IDLE } from '../minigames/types'
import { ordinal } from '../multiplayer/Medal'
import { Round } from '../multiplayer/Round'
import { CLUB, type Playable } from '../runners/playable'
import { play } from '../sfx'
import { OUTLINED, Panel } from '../ui/Menu'
import { onHover } from '../ui/hover'
import { SUMMARY_MOVES, TouchControls } from './Game'

/** The four actions, for letting go of them all on the way out. */
const ACTIONS: Action[] = ['left', 'right', 'up', 'down']

/** The players' colours, as a Room gives them: you first, then the bots. */
const COLOURS = [
	'#e8423f',
	'#3f7fe8',
	'#f2c230',
	'#3fb950',
	'#a35de8',
	'#f28c28',
	'#ef6fb4',
	'#2fc6c0',
]

/**
 * A minigame from Single Player: just as it's played in a Room, by you,
 * with the keyboard (or the buttons, on a touch screen), against bots
 * (see `botsFor`), each another of the club at random. Over, where you
 * came and how you did (how long it took, or how long you lasted), and
 * another go, or back to choose another.
 */
export function SoloMinigame(props: {
	minigame: Minigame
	runner: Playable
	onAgain: () => void
	onBack: () => void
	onMenu: () => void
}) {
	let world: World | undefined
	/** How it went, once it's over: where you came, and what it says of you. */
	const [result, setResult] = createSignal<{ place: string; said: string }>()
	/** The bots: the club, but you, at random. */
	const bots = [...CLUB]
		.filter((runner) => runner.id !== props.runner.id)
		.sort(() => Math.random() - 0.5)
		.slice(0, botsFor(props.minigame))
	/** A bot's controls: the minigame's own bot, playing it as them. */
	const botControls = (id: string) => (): Controls => {
		const racer = world?.racers.find((r) => r.id === id)
		return racer && world?.minigame ? world.minigame.bot(racer) : IDLE
	}
	// Nothing left held, from the buttons, for whatever's next.
	onCleanup(() => {
		for (const action of ACTIONS) setTouch(action, false)
	})
	return (
		<Round
			course={props.minigame.course}
			minigame={props.minigame}
			number={1}
			racers={[
				{
					id: 'solo',
					runner: props.runner,
					controls: anyControls,
					colour: COLOURS[0],
					number: 1,
				},
				...bots.map((runner, i) => ({
					id: `bot-${i}`,
					runner,
					controls: botControls(`bot-${i}`),
					colour: COLOURS[i + 1],
					number: i + 2,
				})),
			]}
			starter={{
				number: 1,
				colour: '#e8423f',
				name: props.runner.name,
				controls: anyControls,
			}}
			onWorld={(made) => {
				world = made
			}}
			onPause={() => {}}
			onOver={(order) => {
				const at = order.findIndex((r) => r.id === 'solo')
				const you = order[at]
				const game = world?.minigame
				// A team game: won or lost, with the rest of the team.
				const shared = you && game?.placeOf?.(you)
				setResult({
					place:
						shared !== undefined
							? shared === 1
								? 'You won!'
								: 'You lost'
							: at === 0
								? 'You won!'
								: `${ordinal(at + 1)} of ${order.length}`,
					said: you && game ? (game.timeNote(you) ?? game.note(you)) : '',
				})
			}}
			onLobby={props.onBack}
			onEnd={props.onMenu}
			solo={{
				restart: props.onAgain,
				menu: [
					{ label: 'Choose another', choose: props.onBack },
					{ label: 'Main menu', choose: props.onMenu },
				],
				over: (
					<>
						<TouchControls />
						<Show when={result()}>
							{(said) => (
								<Result
									name={props.minigame.name}
									place={said().place}
									result={said().said}
									onAgain={props.onAgain}
									onBack={props.onBack}
								/>
							)}
						</Show>
					</>
				),
			}}
		/>
	)
}

/** How it went, over the game, and what's next: the arrows or WASD between them, Enter for another go, Esc to choose another. */
function Result(props: {
	name: string
	place: string
	result: string
	onAgain: () => void
	onBack: () => void
}) {
	const [picked, setPicked] = createSignal(0)
	const buttons = [
		{
			label: 'Play again',
			choose: () => {
				play('select')
				props.onAgain()
			},
		},
		{
			label: 'Choose another',
			choose: () => {
				play('back')
				props.onBack()
			},
		},
	]
	const onKey = (event: KeyboardEvent) => {
		const move =
			SUMMARY_MOVES[event.key] ?? SUMMARY_MOVES[event.key.toLowerCase()]
		if (move) {
			event.preventDefault()
			const next = Math.max(0, Math.min(buttons.length - 1, picked() + move))
			if (next !== picked()) {
				play('move')
				setPicked(next)
			}
		}
		if (event.key === 'Enter') buttons[picked()].choose()
		if (event.key === 'Escape') buttons[1].choose()
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))
	return (
		<div style={styles.shade}>
			<Panel style={styles.panel}>
				<div style={styles.name}>{props.name}</div>
				<div style={styles.result}>{props.place}</div>
				<Show when={props.result}>
					<div style={styles.said}>{props.result}</div>
				</Show>
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
								onMouseEnter={onHover(() => setPicked(i()))}
								onClick={button.choose}
							>
								{button.label}
								{i() === picked() ? ' ↵' : ''}
							</button>
						)}
					</For>
				</div>
			</Panel>
		</div>
	)
}

const styles = {
	shade: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'var(--overlay-black-50)',
		'z-index': 5,
	},
	panel: {
		'align-items': 'center',
		gap: '14px',
		padding: '22px 30px',
		'min-width': '360px',
	},
	name: { 'font-size': '20px', opacity: 0.8 },
	result: { ...OUTLINED, color: '#ffd23f', 'font-size': '40px' },
	said: { 'font-size': '20px' },
	buttons: { display: 'flex', gap: '12px', 'margin-top': '6px' },
	button: {
		padding: '6px 14px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
	},
} satisfies Record<string, JSX.CSSProperties>
