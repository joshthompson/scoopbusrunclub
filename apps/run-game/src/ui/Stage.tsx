import { type JSX, createSignal, onCleanup, onMount } from 'solid-js'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'

/**
 * The game's fixed 960 × 540 stage, scaled to fit the window and letterboxed.
 * Every screen is laid out on it, so nothing reflows or wraps differently from
 * one window to the next: it's just bigger or smaller.
 */
export function Stage(props: { children: JSX.Element }) {
	const [scale, setScale] = createSignal(1)
	const resize = () =>
		setScale(
			Math.min(
				window.innerWidth / VIEW_WIDTH,
				window.innerHeight / VIEW_HEIGHT,
			),
		)
	onMount(() => {
		resize()
		window.addEventListener('resize', resize)
	})
	onCleanup(() => window.removeEventListener('resize', resize))
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					position: 'relative',
					width: `${VIEW_WIDTH}px`,
					height: `${VIEW_HEIGHT}px`,
					transform: `scale(${scale()})`,
					'flex-shrink': 0,
					overflow: 'hidden',
				}}
			>
				{props.children}
			</div>
		</div>
	)
}
