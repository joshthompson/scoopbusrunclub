import { type JSX, Show, createSignal, onCleanup } from 'solid-js'
import type { OwnHat } from '../draw/art/hats'
import { headTop } from '../draw/heads'
import { RUNNER_SCALE, TICK_MS } from '../game/constants'

/** A run strip's frames, if it doesn't say: the club's are all four. */
const FRAMES = 4

/**
 * A runner's run strip, playing on a loop and turned to face right, at
 * `scale` times its pixel size. Every frame of it plays, however many it's
 * drawn in, and a stride takes as long as `stride` whatever that is, as it
 * does in a race. With their own hat on, if they've one (see `OwnHat`),
 * on their head as it is in their first frame.
 */
export function RunStrip(props: {
	/** The runner's run frames, as the engine takes them. */
	run: readonly string[]
	width: number
	height: number
	scale?: number
	/** How long one stride takes, in seconds. */
	stride?: number
	/** Their own hat, if they've one. */
	hat?: OwnHat
	style?: JSX.CSSProperties
}) {
	const scale = () => props.scale ?? 2
	const frames = () => props.run.length || FRAMES
	return (
		<div
			class="pixelated"
			style={{
				position: 'relative',
				width: `${props.width * scale()}px`,
				height: `${props.height * scale()}px`,
				'background-image': `url(${(props.run[0] ?? '').split('#')[0]})`,
				'background-size': 'auto 100%',
				'background-repeat': 'repeat-x',
				transform: 'scaleX(-1)',
				// Squashed any shorter, the strip would show more than one frame.
				'flex-shrink': 0,
				'--strip': `${props.width * scale() * frames()}px`,
				animation: `run-strip ${props.stride ?? 0.5}s steps(${frames()}) infinite`,
				...props.style,
			}}
		>
			<Show when={props.hat}>
				{(hat) => (
					<HatOnStrip
						hat={hat()}
						frame={props.run[0] ?? ''}
						width={props.width * scale()}
						height={props.height * scale()}
						scale={scale() / RUNNER_SCALE}
					/>
				)}
			</Show>
		</div>
	)
}

/**
 * How many of their pixels tall a runner is, with their own hat on: as
 * far above their head as it comes down over it, near enough. For fitting
 * them, hat and all, on a stage.
 */
export const tallWithHat = (sprite: { height: number; ownHat?: OwnHat }) =>
	sprite.height + (sprite.ownHat ? sprite.ownHat.crown / RUNNER_SCALE : 0)

/** Their own hat, its flames flickering, on their head in `frame`, drawn `width` by `height`. */
function HatOnStrip(props: {
	hat: OwnHat
	frame: string
	width: number
	height: number
	/** How much bigger than in a race. */
	scale: number
}) {
	const [n, setN] = createSignal(0)
	const timer = setInterval(
		() => setN((k) => (k + 1) % props.hat.frames.length),
		props.hat.frameTicks * TICK_MS,
	)
	onCleanup(() => clearInterval(timer))
	const head = () => headTop(props.frame, props.width, props.height)
	return (
		<Show when={head()}>
			{(at) => (
				<img
					src={props.hat.frames[n()]}
					alt=""
					class="pixelated"
					style={{
						position: 'absolute',
						left: `${at().x - props.hat.middle * props.scale}px`,
						top: `${at().y - props.hat.crown * props.scale}px`,
						width: `${props.hat.width * props.scale}px`,
						height: `${props.hat.height * props.scale}px`,
						'max-width': 'none',
					}}
				/>
			)}
		</Show>
	)
}
