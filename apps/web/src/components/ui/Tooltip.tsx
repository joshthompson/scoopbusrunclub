import { css, cx } from '@style/css'
import { type JSX, Show, createSignal } from 'solid-js'
import { Portal } from 'solid-js/web'

export function Tooltip(props: {
	content: JSX.Element
	children: JSX.Element
	/** Restyle the wrapper, for callers whose child isn't an inline blob. */
	class?: string
}) {
	const [visible, setVisible] = createSignal(false)
	const [pos, setPos] = createSignal({ x: 0, y: 0 })
	// How far to nudge the tooltip sideways to keep it on screen, for anything
	// near the edge of a phone.
	const [nudge, setNudge] = createSignal(0)
	let ref: HTMLSpanElement | undefined

	const keepOnScreen = (tip: HTMLDivElement) => {
		requestAnimationFrame(() => {
			const rect = tip.getBoundingClientRect()
			const margin = 4
			if (rect.left < margin) setNudge(margin - rect.left)
			else if (rect.right > window.innerWidth - margin)
				setNudge(window.innerWidth - margin - rect.right)
		})
	}

	const updatePos = () => {
		if (!ref) return
		const rect = ref.getBoundingClientRect()
		setPos({
			x: rect.left + rect.width / 2,
			y: rect.top,
		})
	}

	return (
		<span
			ref={ref}
			class={cx(styles.wrapper, props.class)}
			onMouseEnter={() => {
				updatePos()
				setNudge(0)
				setVisible(true)
			}}
			onMouseLeave={() => setVisible(false)}
		>
			{props.children}
			<Show when={visible()}>
				<Portal>
					<div
						ref={keepOnScreen}
						class={styles.tooltip}
						style={{
							left: `${pos().x + nudge()}px`,
							top: `${pos().y}px`,
						}}
					>
						{props.content}
					</div>
				</Portal>
			</Show>
		</span>
	)
}

const styles = {
	wrapper: css({
		display: 'inline-block',
		position: 'relative',
	}),
	tooltip: css({
		position: 'fixed',
		transform: 'translate(-50%, calc(-100% - 6px))',
		background: 'var(--color-black)',
		color: 'var(--color-white)',
		padding: '4px 8px',
		borderRadius: '4px',
		cornerShape: 'notch',
		fontSize: '12px',
		whiteSpace: 'nowrap',
		pointerEvents: 'none',
		zIndex: 9999,
	}),
}
