import { type JSX, createSignal, onCleanup } from 'solid-js'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'

/**
 * The game's fixed 960 × 540 stage, scaled to fit the room it's given (the
 * whole window, usually) and letterboxed. Every screen is laid out on it, so
 * nothing reflows or wraps differently from one window to the next: it's
 * just bigger or smaller.
 */
export function Stage(props: {
	children: JSX.Element
	/** Over the outer box: how much room it takes, if not all of it. */
	style?: JSX.CSSProperties
}) {
	const [scale, setScale] = createSignal(1)
	let observer: ResizeObserver | undefined
	const measure = (el: HTMLDivElement) => {
		const resize = () =>
			setScale(
				Math.min(el.clientWidth / VIEW_WIDTH, el.clientHeight / VIEW_HEIGHT),
			)
		observer = new ResizeObserver(resize)
		observer.observe(el)
	}
	onCleanup(() => observer?.disconnect())
	return (
		<div
			ref={measure}
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
				overflow: 'hidden',
				...props.style,
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
