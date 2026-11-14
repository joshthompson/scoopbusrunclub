import type { JSX } from 'solid-js'

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

/** The colours and font a bubble's drawn in: `--ink` and `--font-pixel`. */
const INK = '#0f1f29'
const FONT = '"Remi Pop", system-ui, sans-serif'
/** Its border, its padding (top, sides, bottom), and how far it floats over the sprite. */
const BORDER = 3
const PADDING_TOP = 6
const PADDING_SIDE = 10
const PADDING_BOTTOM = 2
const OVER = 12
/** Its tail: how wide, and how far down it reaches past its bottom edge's inside. */
const TAIL_WIDTH = 12
const TAIL_HEIGHT = 9
/** How far its shadow falls, down and to the right. */
const SHADOW = 3
/** How wide Remi Pop's widest letters are (Q, q), for their size. */
const WIDEST = 0.79

/**
 * How far a bubble saying at most `letters` letters, `size` px, gets out of
 * a sprite `width` wide, for the sprite's Draw Hook's `drawReach`: up over
 * its top, and out either side, shadow and all, as wide as it can be.
 */
export function bubbleReach(width: number, size: number, letters: number) {
	const widest =
		letters * size * WIDEST + PADDING_SIDE * 2 + BORDER * 2 + SHADOW
	const side = Math.max(0, Math.ceil((widest - width) / 2))
	return {
		left: side,
		right: side,
		top: OVER + size + PADDING_TOP + PADDING_BOTTOM + BORDER * 2,
	}
}

/**
 * `Bubble`, in a Draw Hook: `text` over a sprite `width` wide, `size` px,
 * in the middle of it and floating over its top. `mirrored` in a sprite
 * that's turned round, to read the right way.
 */
export function paintBubble(
	ctx: CanvasRenderingContext2D,
	text: string,
	props: { width: number; size?: number; mirrored?: boolean },
) {
	const size = props.size ?? 20
	ctx.save()
	if (props.mirrored) {
		ctx.translate(props.width, 0)
		ctx.scale(-1, 1)
	}
	ctx.font = `${size}px ${FONT}`
	const measured = ctx.measureText(text)
	const width = measured.width + PADDING_SIDE * 2 + BORDER * 2
	const height = size + PADDING_TOP + PADDING_BOTTOM + BORDER * 2
	const left = props.width / 2 - width / 2
	const top = -OVER - height
	// Its shadow, then it, white, inside its border.
	ctx.fillStyle = 'rgba(15, 31, 41, 0.35)'
	ctx.fillRect(left + SHADOW, top + SHADOW, width, height)
	ctx.fillStyle = INK
	ctx.fillRect(left, top, width, height)
	ctx.fillStyle = 'white'
	ctx.fillRect(
		left + BORDER,
		top + BORDER,
		width - BORDER * 2,
		height - BORDER * 2,
	)
	// On a line `size` tall, its glyphs in the middle of it, as CSS has them.
	const ascent = measured.fontBoundingBoxAscent ?? size * 0.8
	const descent = measured.fontBoundingBoxDescent ?? size * 0.2
	ctx.fillStyle = INK
	ctx.textBaseline = 'alphabetic'
	ctx.fillText(
		text,
		left + BORDER + PADDING_SIDE,
		top + BORDER + PADDING_TOP + (size - ascent - descent) / 2 + ascent,
	)
	// Its tail, down from the inside of its bottom edge.
	const tailTop = top + height - BORDER
	ctx.beginPath()
	ctx.moveTo(props.width / 2 - TAIL_WIDTH / 2, tailTop)
	ctx.lineTo(props.width / 2 + TAIL_WIDTH / 2, tailTop)
	ctx.lineTo(props.width / 2, tailTop + TAIL_HEIGHT)
	ctx.closePath()
	ctx.fill()
	ctx.restore()
}
