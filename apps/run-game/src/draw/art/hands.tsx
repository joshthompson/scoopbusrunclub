import { For, Show } from 'solid-js'
import { HANDS_HOLD } from '../../game/sewer'

/**
 * Hands under Halloween Town's graveyard: fingertips poking up out of a
 * little mound of earth, till someone steps on them; then two arms burst up
 * and clutch at their ankles, and sink back down once they let go. By the
 * tick they last grabbed, so the same on every screen.
 */

type Rect = [number, number, number, number, string]

/** Each cell's size, in screen pixels, and how big they're drawn, in cells. */
const CELL = 2
const COLUMNS = 18
const ROWS = 12
export const HANDS_WIDTH = COLUMNS * CELL
export const HANDS_HEIGHT = ROWS * CELL

const SKIN = '#a8b896'
const SKIN_DARK = '#7d8c6c'
const NAIL = '#e6ecd8'
const RAGS = '#4a3b2b'
const EARTH = '#3b2a1d'

/** Their fingertips, a hand's either side, and the earth they're poking out of. */
const TIPS: Rect[] = [
	[3, 9, 1, 3, SKIN],
	[5, 8, 1, 4, SKIN],
	[7, 9, 1, 3, SKIN],
	[10, 9, 1, 3, SKIN],
	[12, 8, 1, 4, SKIN],
	[14, 9, 1, 3, SKIN],
	[3, 9, 1, 1, NAIL],
	[5, 8, 1, 1, NAIL],
	[7, 9, 1, 1, NAIL],
	[10, 9, 1, 1, NAIL],
	[12, 8, 1, 1, NAIL],
	[14, 9, 1, 1, NAIL],
	[1, 11, 16, 1, EARTH],
	[2, 10, 2, 1, EARTH],
	[8, 10, 2, 1, EARTH],
	[15, 10, 2, 1, EARTH],
]

/**
 * Two arms up out of the ground, thin, in rags, a hand on each: fingers
 * curled over, clawing in at whoever's ankles are between them.
 */
const ARMS: Rect[] = [
	// The left arm, up out of the ground, its sleeve in tatters.
	[3, 4, 2, 8, SKIN],
	[3, 4, 1, 8, SKIN_DARK],
	[2, 7, 3, 2, RAGS],
	[2, 9, 1, 1, RAGS],
	// Its hand: thumb out, fingers curled over and in, nails down.
	[2, 3, 1, 2, SKIN],
	[3, 2, 4, 2, SKIN],
	[7, 3, 1, 2, SKIN],
	[7, 5, 1, 1, NAIL],
	[5, 4, 1, 1, NAIL],
	// The right arm, the same, the other way round.
	[13, 4, 2, 8, SKIN],
	[14, 4, 1, 8, SKIN_DARK],
	[13, 7, 3, 2, RAGS],
	[15, 9, 1, 1, RAGS],
	[15, 3, 1, 2, SKIN],
	[11, 2, 4, 2, SKIN],
	[10, 3, 1, 2, SKIN],
	[10, 5, 1, 1, NAIL],
	[12, 4, 1, 1, NAIL],
	// The earth they've burst out of.
	[0, 11, 18, 1, EARTH],
	[1, 10, 4, 1, EARTH],
	[13, 10, 4, 1, EARTH],
]

/** How quickly they burst up, and how slowly they sink back, in ticks. */
const BURST = 4
const SINK = 14

function Cells(props: { rects: Rect[] }) {
	return (
		<svg
			width={HANDS_WIDTH}
			height={HANDS_HEIGHT}
			viewBox={`0 0 ${COLUMNS} ${ROWS}`}
			shape-rendering="crispEdges"
			aria-hidden="true"
			style={{ display: 'block' }}
		>
			<For each={props.rects}>
				{([x, y, w, h, fill]) => (
					<rect x={x} y={y} width={w} height={h} fill={fill} />
				)}
			</For>
		</svg>
	)
}

export function HandsArt(props: {
	now: () => number
	/** The tick they last grabbed someone, if they have. */
	grabbed: () => number | undefined
}) {
	/** How far up out of the ground the arms are, out of 1. */
	const up = () => {
		const at = props.grabbed()
		if (at === undefined) return 0
		const t = props.now() - at
		if (t < 0) return 0
		if (t < HANDS_HOLD) return Math.min(1, (t + 1) / BURST)
		return Math.max(0, 1 - (t - HANDS_HOLD) / SINK)
	}
	return (
		<div
			style={{
				position: 'relative',
				width: `${HANDS_WIDTH}px`,
				height: `${HANDS_HEIGHT}px`,
				overflow: 'hidden',
			}}
		>
			<Show when={up() > 0} fallback={<Cells rects={TIPS} />}>
				<div
					style={{
						transform: `translateY(${Math.round((1 - up()) * (HANDS_HEIGHT - 4))}px)`,
					}}
				>
					<Cells rects={ARMS} />
				</div>
			</Show>
		</div>
	)
}
