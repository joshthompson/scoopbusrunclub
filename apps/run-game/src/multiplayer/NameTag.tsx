import type { JSX } from 'solid-js'
import { hatArt } from '../draw/art/hats'
import { headTop } from '../draw/heads'
import { RUNNER_SCALE } from '../game/constants'
import type { Hat } from '../game/hats'
import type { Playable } from '../runners/playable'

/** The space round the letters, in ems: the same over and under them. */
const SPACE = 0.3

/**
 * Who someone is, over their head, in their colour: their name in the
 * pixel font, in a badge pointing down at them with a little stepped arrow.
 * Its arrow's tip is the bottom middle of its box, for placing it by.
 */
export function NameTag(props: {
	children: JSX.Element
	colour: string
	/** Its letters, in px. */
	size: number
	/** Where it goes. */
	style?: JSX.CSSProperties
}) {
	return (
		<div style={{ ...styles.tag, ...props.style }}>
			<div
				style={{
					...styles.badge,
					background: props.colour,
					'font-size': `${props.size}px`,
				}}
			>
				{props.children}
			</div>
			{/* In cells the badge's border wide: through its bottom edge, its colour
			    carried on down, outlined, to a point. It starts a cell up, inside
			    the badge, in its colour: placed at a fraction of a pixel (centred,
			    or scaled), the border's not left showing through as a hairline. */}
			<svg
				width={6 * BORDER}
				height={4 * BORDER}
				viewBox="0 -1 6 4"
				shape-rendering="crispEdges"
				style={styles.arrow}
				aria-hidden="true"
			>
				<path
					d="M0 0h1v1H0zM5 0h1v1H5zM1 1h1v1H1zM4 1h1v1H4zM2 2h2v1H2z"
					style={{ fill: 'var(--ink)' }}
				/>
				<path
					d="M0 -1h6v1H0zM1 0h4v1H1zM2 1h2v1H2z"
					style={{ fill: props.colour }}
				/>
			</svg>
		</div>
	)
}

/**
 * How far `hat` stands up over the top of `runner` in their first run
 * frame, drawn at `scale`: for their name to go over it. Nothing with no
 * hat, or till their head's been found in the picture (see `headTop`).
 * From the one frame, so their name stays put as they run.
 */
export function hatRise(runner: Playable, hat: Hat | undefined, scale: number) {
	const frame = runner.sprite.run[0]
	if (!hat || !frame) return 0
	const head = headTop(
		frame,
		runner.sprite.width * RUNNER_SCALE,
		runner.sprite.height * RUNNER_SCALE,
	)
	if (!head) return 0
	return Math.max(0, hatArt(hat).crown - head.y) * (scale / RUNNER_SCALE)
}

/**
 * A name tag's place over someone's box, its arrow pointing down at them:
 * a little over their head, and `rise` more, over their hat.
 */
export const tagOver = (rise: number): JSX.CSSProperties => ({
	left: '50%',
	bottom: '100%',
	'margin-bottom': `${4 + rise}px`,
	transform: 'translateX(-50%)',
})

/** The badge's border, in px, and so the arrow's cells. */
const BORDER = 2

const styles = {
	tag: {
		position: 'absolute',
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		// Over their hat, or anything else they've on.
		'z-index': 1,
		'pointer-events': 'none',
	},
	badge: {
		padding: `${SPACE}em 0.45em`,
		color: 'white',
		'font-family': 'var(--font-pixel)',
		'line-height': 1,
		'white-space': 'nowrap',
		border: `${BORDER}px solid var(--ink)`,
		'text-shadow': '1px 1px 0 var(--ink)',
	},
	arrow: {
		display: 'block',
		// Over the badge's bottom border, to break through it, and a cell inside.
		'margin-top': `-${2 * BORDER}px`,
	},
} satisfies Record<string, JSX.CSSProperties>
