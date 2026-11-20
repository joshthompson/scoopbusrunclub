import { Show, createSignal } from 'solid-js'
import { RaceCanvas, createRaceScene } from '../draw/RaceView'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import { roundOver, stepWorld } from '../game/step'
import { type World, createWorld } from '../game/world'
import { type Minigame, botsFor } from '../minigames'
import { inRandomOrder } from '../minigames/arena'
import { IDLE } from '../minigames/types'
import { COLOURS } from '../multiplayer/room'
import { CLUB } from '../runners/playable'
import { hush } from '../sfx'

/** How long into a game it's shown from, after "Go!": long enough that it's under way. */
const LEAD_IN = 150
/** How long it's watched once it's decided, the winner dancing, before another. */
const WATCHED_AFTER = 120

/**
 * A minigame, seen through a little window onto it: the whole of its
 * arena, still, as it's played, and played by bots, a game of it as you'd
 * play it, the minigame's own goings-on and all (the iceberg, the
 * potatoes, the rope), silently. Scaled to fill the window, its sky cut
 * off the top to fit. Over, another game, with others.
 */
export function MinigamePreview(props: {
	minigame: Minigame
	width: number
	height: number
}) {
	const [game, setGame] = createSignal(0)
	return (
		<div
			style={{
				position: 'relative',
				width: `${props.width}px`,
				height: `${props.height}px`,
				overflow: 'hidden',
			}}
		>
			<Show when={game() + 1} keyed>
				{(_game) => (
					<Played
						minigame={props.minigame}
						width={props.width}
						height={props.height}
						onOver={() => setGame((n) => n + 1)}
					/>
				)}
			</Show>
		</div>
	)
}

/** One game of it, by bots, from a little way in, till it's over. */
function Played(props: {
	minigame: Minigame
	width: number
	height: number
	onOver: () => void
}) {
	const { minigame } = props
	/** As many as Single Player has you play with, counting you: the club, at random. */
	const players = inRandomOrder(CLUB).slice(0, botsFor(minigame) + 1)
	const world: World = createWorld(
		minigame.course,
		players.map((runner, i) => ({
			id: `preview-${i}`,
			runner,
			controls: () => {
				const racer = world.racers[i]
				return racer && world.minigame ? world.minigame.bot(racer) : IDLE
			},
			colour: COLOURS[i],
			number: i + 1,
		})),
		{ round: true, minigame, preview: true },
	)
	// Counted in and under way, already: shown from there.
	hush(() => {
		for (let i = 0; world.phase() !== 'running' && i < 1000; i++)
			stepWorld(world)
		for (let i = 0; i < LEAD_IN; i++) stepWorld(world)
	})
	const scene = createRaceScene(world, (w) => hush(() => stepWorld(w)))
	let overFor = 0
	scene.tickers.add(() => {
		if (!roundOver(world) && !world.order()) return
		overFor++
		if (overFor === WATCHED_AFTER) props.onOver()
	})
	// Filling the window: as wide as it, or as tall, whichever's more, its
	// bottom (where everyone is) at the window's bottom, the sky cut off the
	// top; and in the middle across.
	const scale = () =>
		Math.max(props.width / VIEW_WIDTH, props.height / VIEW_HEIGHT)
	return (
		<div
			style={{
				position: 'absolute',
				left: `${(props.width - VIEW_WIDTH * scale()) / 2}px`,
				top: `${props.height - VIEW_HEIGHT * scale()}px`,
				width: `${VIEW_WIDTH}px`,
				height: `${VIEW_HEIGHT}px`,
				overflow: 'hidden',
				transform: `scale(${scale()})`,
				'transform-origin': '0 0',
			}}
		>
			<RaceCanvas world={world} scene={scene} />
		</div>
	)
}
