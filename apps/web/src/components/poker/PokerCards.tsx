import { Tooltip } from '@/components/ui/Tooltip'
import { type RunnerData, runners as runnerSignals } from '@/data/runners'
import { getMemberRoute } from '@/utils/memberRoute'
import { formatName } from '@/utils/misc'
import { type PokerCard, cardColor, cardLabel } from '@/utils/poker'
import { A } from '@solidjs/router'
import { css, cva, cx } from '@style/css'
import { type JSX, Show, createMemo } from 'solid-js'

// ---------------------------------------------------------------------------
// Runner lookups
// ---------------------------------------------------------------------------

const runnersByParkrunId = new Map<string, RunnerData>()
for (const [, [accessor]] of Object.entries(runnerSignals)) {
	const data = accessor()
	if (data.id) runnersByParkrunId.set(data.id, data)
}

function runnerFor(card: PokerCard): RunnerData | undefined {
	return runnersByParkrunId.get(card.parkrunId)
}

function displayName(card: PokerCard): string {
	return runnerFor(card)?.name ?? formatName(card.name)
}

/**
 * One frame of a sprite sheet as the header draws it: the frames are written
 * `url#offsetX,0,sheetWidth,sheetHeight`, with the offset in display pixels.
 */
function parseFrame(frame: string, frameCount: number) {
	const hashIdx = frame.indexOf('#')
	if (hashIdx === -1) return null
	const [, , sheetWidth, sheetHeight] = frame
		.slice(hashIdx + 1)
		.split(',')
		.map(Number)
	if (!sheetWidth || !sheetHeight) return null
	return {
		url: frame.slice(0, hashIdx),
		frameWidth: sheetWidth / frameCount,
		height: sheetHeight,
	}
}

/**
 * The runner mid-stride, at native pixels scaled up by `scale`. Falls back to
 * the sitting sprite, then the face, so a member without running art still
 * gets a card.
 */
function RunnerSprite(props: {
	runner: RunnerData | undefined
	scale: number
	/** Picks the stride, so a row of cards isn't everyone mid-step in unison. */
	seed: number
}) {
	const frame = createMemo(() => {
		const run = props.runner?.frames.run
		if (!run || run.length === 0) return null
		const parsed = parseFrame(run[0], run.length)
		if (!parsed) return null
		// Counted along the sheet itself, not the (reversed) animation order.
		const index = Math.abs(props.seed) % run.length
		return { ...parsed, index }
	})

	return (
		<Show
			when={frame()}
			fallback={
				<Show
					when={props.runner?.frames.sit?.[0] ?? props.runner?.frames.face?.[0]}
					fallback={<span class={styles.spriteMissing}>?</span>}
				>
					{(src) => (
						<img
							src={src()}
							alt=""
							class={styles.spriteImg}
							style={{ transform: `scale(${props.scale})` }}
						/>
					)}
				</Show>
			}
		>
			{(f) => (
				<div
					class={styles.spriteFrame}
					style={{
						width: `${f().frameWidth}px`,
						height: `${f().height}px`,
						'background-image': `url(${f().url})`,
						'background-position': `-${f().index * f().frameWidth}px 0`,
						transform: `scale(${props.scale})`,
					}}
				/>
			)}
		</Show>
	)
}

// ---------------------------------------------------------------------------
// Full card
// ---------------------------------------------------------------------------

/**
 * A playing card for one result: suit and value (the time) in the corners, the
 * runner's sprite in the middle, and their finishing position underneath.
 */
export function PokerCardGraphic(props: {
	card: PokerCard
	/** Dimmed when the card was dealt but isn't part of the hand. */
	inHand?: boolean
}) {
	const color = () => cardColor(props.card)
	const label = () => cardLabel(props.card)
	const name = () => displayName(props.card)
	const route = () => getMemberRoute(props.card.parkrunId, props.card.name)

	const card = (
		<div
			class={styles.card({ color: color(), dimmed: props.inHand === false })}
			role="img"
			aria-label={`${name()}: ${label()}, position ${props.card.position}`}
		>
			<span class={styles.position}>#{props.card.position}</span>
			<span class={styles.corner}>{label()}</span>
			<div class={styles.spriteBox}>
				<RunnerSprite
					runner={runnerFor(props.card)}
					scale={2}
					seed={props.card.position}
				/>
			</div>
			<span class={styles.name}>{name()}</span>
		</div>
	)

	return (
		<Tooltip content={`${name()} · ${props.card.time}`}>
			<Show when={route()} fallback={card}>
				{(href) => (
					<A href={href()} class={styles.cardLink}>
						{card}
					</A>
				)}
			</Show>
		</Tooltip>
	)
}

// ---------------------------------------------------------------------------
// Mini card
// ---------------------------------------------------------------------------

/**
 * The card at 2em, for sitting inline with text: just the runner's face, with
 * the value tucked in the corner.
 */
export function PokerCardMini(props: {
	card: PokerCard
	class?: string
	style?: JSX.CSSProperties
	/** Off when a parent already explains the card, so tooltips don't stack. */
	tooltip?: boolean
}) {
	const color = () => cardColor(props.card)
	const face = () => runnerFor(props.card)?.frames.face?.[0]

	const card = (
		<span
			class={cx(styles.mini({ color: color() }), props.class)}
			style={props.style}
			aria-label={`${displayName(props.card)} ${cardLabel(props.card)}`}
		>
			<span class={styles.miniValue}>
				{String(props.card.seconds).padStart(2, '0')}
			</span>
			<Show
				when={face()}
				fallback={
					<span class={styles.miniInitial}>{displayName(props.card)[0]}</span>
				}
			>
				{(src) => <img src={src()} alt="" class={styles.miniFace} />}
			</Show>
		</span>
	)

	return (
		<Show when={props.tooltip !== false} fallback={card}>
			<Tooltip content={`${displayName(props.card)} · ${props.card.time}`}>
				{card}
			</Tooltip>
		</Show>
	)
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/** Full card size. Five across is what an event block is sized for. */
export const CARD_WIDTH = 72
export const CARD_HEIGHT = 104
export const CARD_GAP = 2

const styles = {
	card: cva({
		base: {
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			width: `${CARD_WIDTH}px`,
			height: `${CARD_HEIGHT}px`,
			background: 'var(--color-white)',
			border: '3px solid currentColor',
			borderRadius: '6px',
			cornerShape: 'notch',
			boxShadow: '3px 3px 0 var(--overlay-black-25)',
			// A pram or a dog makes for a wide sprite: keep it inside the card
			overflow: 'hidden',
			fontFamily: '"Jersey 10", sans-serif',
			lineHeight: 1,
			userSelect: 'none',
			transition: 'transform 0.15s ease',
			_hover: { transform: 'translateY(-3px)' },
		},
		variants: {
			color: {
				red: { color: 'var(--red-map)' },
				black: { color: 'var(--color-black)' },
			},
			dimmed: {
				true: { opacity: 0.5 },
			},
		},
	}),
	cardLink: css({
		display: 'inline-block',
		color: 'inherit',
		textDecoration: 'none',
	}),
	corner: css({
		position: 'absolute',
		top: '3px',
		right: '4px',
		fontSize: '15px',
	}),
	position: css({
		position: 'absolute',
		top: '3px',
		left: '4px',
		fontSize: '15px',
		opacity: 0.75,
	}),
	spriteBox: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: '58px',
		width: '100%',
		mt: '10px',
	}),
	spriteFrame: css({
		backgroundRepeat: 'no-repeat',
		imageRendering: 'pixelated',
		transformOrigin: 'center',
		flexShrink: 0,
	}),
	spriteImg: css({
		imageRendering: 'pixelated',
		transformOrigin: 'center',
	}),
	spriteMissing: css({
		fontSize: '28px',
		opacity: 0.4,
	}),
	name: css({
		fontSize: '14px',
		maxWidth: 'calc(100% - 8px)',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		mt: '4px',
	}),

	mini: cva({
		base: {
			position: 'relative',
			display: 'inline-flex',
			alignItems: 'center',
			justifyContent: 'center',
			height: '2em',
			width: '1.5em',
			verticalAlign: 'middle',
			background: 'var(--color-white)',
			border: '2px solid currentColor',
			borderRadius: '3px',
			cornerShape: 'notch',
			boxShadow: '1px 1px 0 var(--overlay-black-25)',
			fontFamily: '"Jersey 10", sans-serif',
			lineHeight: 1,
			mx: '1px',
		},
		variants: {
			color: {
				red: { color: 'var(--red-map)' },
				black: { color: 'var(--color-black)' },
			},
		},
	}),
	miniValue: css({
		position: 'absolute',
		top: '1px',
		left: '2px',
		fontSize: '0.55em',
	}),
	miniFace: css({
		height: '0.9em',
		width: 'auto',
		imageRendering: 'pixelated',
		mt: '0.35em',
	}),
	miniInitial: css({
		fontSize: '0.9em',
		mt: '0.35em',
	}),
}
