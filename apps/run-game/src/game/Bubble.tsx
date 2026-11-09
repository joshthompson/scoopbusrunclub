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
