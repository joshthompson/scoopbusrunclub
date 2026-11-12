import { type JSX, createSignal } from 'solid-js'
import type { Action } from '../input'

/**
 * The four buttons, laid out like a keyboard's arrow keys: up on its own on
 * top, and left, down and right in a row under it. As big as fits the room
 * it's given. A phone's Remote Play buttons, and single player's under the
 * race, on a phone held upright.
 */
export function ArrowPad(props: {
	press: (action: Action, down: boolean) => void
}) {
	return (
		<div style={styles.arrowRoom}>
			<div style={styles.arrows}>
				<div style={{ 'grid-area': '1 / 2' }}>
					<PadButton label="↑" action="up" press={props.press} />
				</div>
				<div style={{ 'grid-area': '2 / 1' }}>
					<PadButton label="←" action="left" press={props.press} />
				</div>
				<div style={{ 'grid-area': '2 / 2' }}>
					<PadButton label="↓" action="down" press={props.press} />
				</div>
				<div style={{ 'grid-area': '2 / 3' }}>
					<PadButton label="→" action="right" press={props.press} />
				</div>
			</div>
		</div>
	)
}

/** One of the four buttons: held for as long as a finger's on it. */
function PadButton(props: {
	label: string
	action: Action
	press: (action: Action, down: boolean) => void
}) {
	const [down, setDown] = createSignal(false)
	const set = (next: boolean) => {
		if (next === down()) return
		setDown(next)
		props.press(props.action, next)
	}
	return (
		<button
			type="button"
			// Not passive, so it can be stopped: no selecting, magnifying glass
			// or zooming in, a thumb held on it or tapping fast.
			ref={(el) =>
				el.addEventListener('touchstart', (event) => event.preventDefault(), {
					passive: false,
				})
			}
			style={{ ...styles.padButton, ...(down() ? styles.padButtonDown : {}) }}
			onPointerDown={(event) => {
				event.preventDefault()
				event.currentTarget.setPointerCapture(event.pointerId)
				set(true)
			}}
			onPointerUp={() => set(false)}
			onPointerCancel={() => set(false)}
			onContextMenu={(event) => event.preventDefault()}
		>
			{props.label}
		</button>
	)
}

const styles = {
	arrowRoom: {
		flex: 1,
		'min-height': 0,
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		padding: '12px',
		'container-type': 'size',
	},
	arrows: {
		display: 'grid',
		'grid-template-columns': 'repeat(3, 1fr)',
		'grid-template-rows': 'repeat(2, 1fr)',
		gap: '10px',
		// Three buttons wide and two high, square, as big as fits.
		width: 'min(100cqw, 150cqh, 560px)',
		height: 'min(100cqh, 66.67cqw, 373px)',
	},
	padButton: {
		width: '100%',
		height: '100%',
		background: 'rgba(255, 255, 255, 0.7)',
		color: 'var(--ink)',
		border: '4px solid var(--ink)',
		'box-shadow': '6px 6px 0 rgba(15, 31, 41, 0.45)',
		'font-family': 'var(--font-pixel)',
		'font-size': '48px',
		'touch-action': 'none',
		'user-select': 'none',
		'-webkit-user-select': 'none',
		'-webkit-touch-callout': 'none',
	},
	padButtonDown: {
		background: '#ffd23f',
		transform: 'translate(4px, 4px)',
		'box-shadow': '2px 2px 0 rgba(15, 31, 41, 0.45)',
	},
} satisfies Record<string, JSX.CSSProperties>
