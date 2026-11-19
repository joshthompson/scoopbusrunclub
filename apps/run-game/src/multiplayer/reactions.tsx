import {
	For,
	type JSX,
	Show,
	createMemo,
	createSignal,
	onCleanup,
} from 'solid-js'
import { paintedArt } from '../courses/kit/pixelArt'
import { PixelArt } from '../draw/PixelArt'
import { REACTIONS, type Reaction, type ShownReaction } from './protocol'

/**
 * Reactions: whoever's watching a Round and not in it (they joined while it
 * was on, or they're out and the others race on) sending a laugh, a cheer,
 * a poo or a heart up the big screen, with their name under it.
 */

/** Each cell twice the size of a screen pixel, as the runners are. */
const CELL = 2

/** Pixel art from rows of letters, each a colour; a `.`, nothing. */
function rowsArt(rows: string[], colours: Record<string, string>) {
	const columns = rows[0].length
	return {
		src: paintedArt(
			columns,
			rows.length,
			(x, y) => colours[rows[Math.floor(y)][Math.floor(x)]],
		),
		columns,
		rows: rows.length,
	}
}

/** A face's yellow, lit along its top and shaded round its bottom, and its ink. */
const FACE = {
	Y: '#ffd23f',
	y: '#ffe98a',
	o: '#e0a51c',
	K: '#2b2722',
}

/** Laughing till they cry: eyes screwed shut, mouth wide open, a tear each side. */
const LAUGH = rowsArt(
	[
		'....yyyyyy....',
		'..yyyyyyyyyy..',
		'.yYYYYYYYYYYY.',
		'.YYYYYYYYYYYYo',
		'YYYKKYYYYKKYYo',
		'YYKYYKYYKYYKYo',
		'bYYYYYYYYYYYYb',
		'BBYKKKKKKKKYBB',
		'BYYKMMMMMMKYYB',
		'YYYKMMMMMMKYYo',
		'.YYYKMTTMKYYo.',
		'.oYYYKKKKYYoo.',
		'..ooYYYYYYoo..',
		'....oooooo....',
	],
	{ ...FACE, M: '#7a2a1f', T: '#e8473c', B: '#6fc3ff', b: '#bfe6ff' },
)

/** A cheer: a party popper gone off, its streamers and confetti flying. */
const CHEER = rowsArt(
	[
		'..........B...',
		'.....M..R.....',
		'...........G..',
		'.......B......',
		'...WW....M..R.',
		'...RWW.....B..',
		'..GRRWW...G...',
		'..GGRRWW....M.',
		'..GGGRRWW.....',
		'.RRGGGRRWW.B..',
		'.RRRGGGRRW....',
		'.GRRRGGG......',
		'GGGRR.........',
		'GG............',
	],
	{
		G: '#ffd23f',
		R: '#e8473c',
		W: '#fff3c4',
		B: '#6fc3ff',
		M: '#5fd38d',
	},
)

/** A poo, swirled up to a point, grinning. */
const POOP = rowsArt(
	[
		'......pp......',
		'.....pPPd.....',
		'....pPPPPPd...',
		'...dddddddd...',
		'..pPPPPPPPPPd.',
		'.pPWWPPPPWWPPd',
		'.PPWKPPPPWKPPd',
		'.PPPPPPPPPPPPd',
		'.dddddddddddd.',
		'pPPPPPPPPPPPPd',
		'PPPKPPPPPPKPPd',
		'PPPPKKKKKKPPPd',
		'PPPPPPPPPPPPPd',
		'.dddddddddddd.',
	],
	{ P: '#8a5a34', p: '#b07a48', d: '#5e3a1f', W: '#ffffff', K: '#1d1d1d' },
)

/** A heart, a glint on its top left. */
const HEART = rowsArt(
	[
		'..rrr....rrr..',
		'.rWWRR..RRRRR.',
		'rWWRRRRRRRRRRR',
		'rWRRRRRRRRRRRd',
		'RRRRRRRRRRRRRd',
		'RRRRRRRRRRRRRd',
		'.RRRRRRRRRRRd.',
		'..RRRRRRRRRd..',
		'...RRRRRRRd...',
		'....RRRRRd....',
		'.....RRRd.....',
		'......dd......',
	],
	{ R: '#e8473c', r: '#ff7a6b', W: '#ffd0c8', d: '#b8302a' },
)

export const REACTION_ART: Record<Reaction, ReturnType<typeof rowsArt>> = {
	laugh: LAUGH,
	cheer: CHEER,
	poop: POOP,
	heart: HEART,
}
const LABELS: Record<Reaction, string> = {
	laugh: 'Laugh',
	cheer: 'Cheer',
	poop: 'Poo',
	heart: 'Love',
}

/** A reaction drawn `scale` times a cell's usual size. */
export function ReactionArt(props: { reaction: Reaction; scale?: number }) {
	const art = () => REACTION_ART[props.reaction]
	const size = () => CELL * (props.scale ?? 1)
	return (
		<PixelArt
			src={art().src}
			width={art().columns * size()}
			height={art().rows * size()}
		/>
	)
}

/** How long a reaction takes to go up the screen and fade, in ticks. */
export const REACTION_TICKS = 150
/** At most this many on the screen at once: the newest. */
export const MOST_REACTIONS = 24
/** How soon one Player can send another, in ms. */
export const REACTION_GAP_MS = 250

/**
 * Reactions going up the right of the race, wobbling, then fading: each
 * with its sender's name under it, in their colour. By the Round's tick,
 * `now`, so a phone watching sees them just as the big screen does.
 */
export function ReactionsLayer(props: {
	reactions: ShownReaction[]
	now: number
	/** On a phone, everything on it bigger. */
	textScale?: number
}) {
	const shown = () =>
		props.reactions.filter((r) => {
			const age = props.now - r.born
			return age >= 0 && age < REACTION_TICKS
		})
	const scale = () => props.textScale ?? 1
	return (
		<For each={shown()}>
			{(reaction) => {
				const age = () => props.now - reaction.born
				const through = () => age() / REACTION_TICKS
				// Popped in, then wobbling side to side on the way up.
				const pop = () => Math.min(1, age() / 8)
				const wobble = () => Math.sin(age() / 9 + reaction.id) * 10
				return (
					<div
						style={{
							...styles.reaction,
							left: `${64 + reaction.across * 30}%`,
							bottom: `${6 + through() * 62}%`,
							opacity: through() > 0.75 ? (1 - through()) / 0.25 : 1,
							transform: `translateX(calc(-50% + ${wobble()}px)) scale(${pop()})`,
						}}
					>
						<ReactionArt reaction={reaction.reaction} scale={1.5} />
						<Show when={reaction.name}>
							<span
								style={{
									...styles.name,
									background: reaction.colour,
									'font-size': `${11 * scale()}px`,
								}}
							>
								{reaction.name}
							</span>
						</Show>
					</div>
				)
			}}
		</For>
	)
}

/** How long a tick is, in ms, for reactions between Rounds: as a Round's, 60 a second. */
export const REACTION_TICK_MS = 1000 / 60

/**
 * Reactions between Rounds, over the Standings or the course being picked:
 * with no Round's ticks to go by, each goes up from when it's first seen
 * here, by the clock. Over everything, and not in the way of anything.
 */
export function LiveReactionsLayer(props: {
	reactions: ShownReaction[]
	textScale?: number
}) {
	const started = performance.now()
	const [now, setNow] = createSignal(0)
	let frame = requestAnimationFrame(function step(at) {
		setNow((at - started) / REACTION_TICK_MS)
		frame = requestAnimationFrame(step)
	})
	onCleanup(() => cancelAnimationFrame(frame))
	/** Each one as first seen, born then: the same object each time, so it isn't drawn afresh. */
	const seen = new Map<number, ShownReaction>()
	const local = createMemo(() =>
		props.reactions.map((r) => {
			let mine = seen.get(r.id)
			if (!mine) {
				mine = { ...r, born: now() }
				seen.set(r.id, mine)
			}
			return mine
		}),
	)
	return (
		<div style={styles.layer}>
			<ReactionsLayer
				reactions={local()}
				now={now()}
				textScale={props.textScale}
			/>
		</div>
	)
}

/**
 * On a phone, watching: a button for each reaction, to send it up the big
 * screen. Tapped as often as they like (the Host only takes so many).
 */
export function ReactionBar(props: {
	onReact: (reaction: Reaction) => void
	/** Over the buttons. */
	title?: string
}) {
	return (
		<div style={styles.bar}>
			<Show when={props.title}>
				<div style={styles.barTitle}>{props.title}</div>
			</Show>
			<div style={styles.buttons}>
				<For each={REACTIONS}>
					{(reaction) => (
						<button
							type="button"
							aria-label={LABELS[reaction]}
							style={styles.button}
							onClick={() => {
								navigator.vibrate?.(8)
								props.onReact(reaction)
							}}
						>
							<ReactionArt reaction={reaction} scale={2} />
						</button>
					)}
				</For>
			</div>
		</div>
	)
}

const styles = {
	layer: {
		position: 'absolute',
		inset: 0,
		overflow: 'hidden',
		'pointer-events': 'none',
		'z-index': 4,
	},
	reaction: {
		position: 'absolute',
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '2px',
		'pointer-events': 'none',
	},
	name: {
		padding: '2px 4px',
		color: 'white',
		'font-family': 'var(--font-pixel)',
		'line-height': 1,
		'white-space': 'nowrap',
		border: '2px solid var(--ink)',
		'text-shadow': '1px 1px 0 var(--ink)',
	},
	bar: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '10px',
		width: '100%',
	},
	barTitle: { 'font-size': '16px', opacity: 0.85 },
	buttons: {
		display: 'grid',
		'grid-template-columns': 'repeat(4, 1fr)',
		gap: '10px',
		width: '100%',
		'max-width': '420px',
	},
	button: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		'aspect-ratio': '1',
		background: 'rgba(255, 255, 255, 0.9)',
		border: '3px solid var(--ink)',
		padding: 0,
		'touch-action': 'manipulation',
	},
} satisfies Record<string, JSX.CSSProperties>
