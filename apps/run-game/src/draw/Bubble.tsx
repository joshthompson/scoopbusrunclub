import type { JSX } from 'solid-js'
import { FONT_PIXEL, fillLine } from './paint/lettering'

/** A speech bubble over a sprite, in Remi Pop: drop it in as one of the sprite's children. */
export function Bubble(props: {
	children: JSX.Element
	size?: number
	/** In a sprite that's turned round: turned back, so it reads the right way. */
	mirrored?: boolean
}) {
	return (
		<div
			style={{
				position: 'absolute',
				bottom: 'calc(100% + 12px)',
				left: '50%',
				transform: `translateX(-50%)${props.mirrored ? ' scaleX(-1)' : ''}`,
				background: 'white',
				color: 'var(--ink)',
				border: '3px solid var(--ink)',
				padding: '6px 10px 2px',
				'font-family': 'var(--font-pixel)',
				'font-size': `${props.size ?? 20}px`,
				'line-height': 1,
				'white-space': 'nowrap',
				'box-shadow': '3px 3px 0 rgba(15, 31, 41, 0.35)',
			}}
		>
			{props.children}
			{/* The tail */}
			<div
				style={{
					position: 'absolute',
					top: '100%',
					left: 'calc(50% - 6px)',
					width: '12px',
					height: '9px',
					background: 'var(--ink)',
					'clip-path': 'polygon(0 0, 100% 0, 50% 100%)',
				}}
			/>
		</div>
	)
}

/** `--ink` in `styles.css`: the bubble's border, tail and words. */
const INK = '#0f1f29'

/**
 * A `Bubble` painted in a Draw Hook: over the middle of a sprite `width`
 * wide, as it is among its children. `ctx` is the sprite's own box; one
 * turned round is turned back first, so it reads the right way.
 */
export function paintBubble(
	ctx: CanvasRenderingContext2D,
	text: string,
	options: { width: number; size?: number; mirrored?: boolean },
) {
	const size = options.size ?? 20
	ctx.save()
	if (options.mirrored) {
		ctx.translate(options.width, 0)
		ctx.scale(-1, 1)
	}
	ctx.font = `${size}px ${FONT_PIXEL}`
	// Its padding, 6 px 10 px 2 px, inside a border 3 px thick; its bottom
	// 12 px over the sprite, its tail in the gap.
	const width = ctx.measureText(text).width + 26
	const height = size + 14
	const left = options.width / 2 - width / 2
	const top = -12 - height
	ctx.fillStyle = 'rgba(15, 31, 41, 0.35)'
	ctx.fillRect(left + 3, top + 3, width, height)
	ctx.fillStyle = INK
	ctx.fillRect(left, top, width, height)
	ctx.fillStyle = 'white'
	ctx.fillRect(left + 3, top + 3, width - 6, height - 6)
	ctx.fillStyle = INK
	fillLine(ctx, text, left + 13, top + 9, size)
	// The tail, from the bottom of the inside of its border.
	const tail = options.width / 2 - 6
	const tailTop = top + height - 3
	ctx.beginPath()
	ctx.moveTo(tail, tailTop)
	ctx.lineTo(tail + 12, tailTop)
	ctx.lineTo(tail + 6, tailTop + 9)
	ctx.closePath()
	ctx.fill()
	ctx.restore()
}
