import { For, type JSX, createSignal, onCleanup } from 'solid-js'

export interface MenuItem {
	label: string
	choose: () => void
}

/**
 * The pause menu: up and down (or W and S) to move, Enter or Space to pick,
 * or click. Esc and P to resume are the game's, which also opened it.
 */
export function PauseMenu(props: { items: MenuItem[] }) {
	const [selected, setSelected] = createSignal(0)

	const onKey = (event: KeyboardEvent) => {
		const move: Record<string, number> = {
			ArrowUp: -1,
			w: -1,
			W: -1,
			ArrowDown: 1,
			s: 1,
			S: 1,
		}
		if (event.key in move) {
			const count = props.items.length
			setSelected((i) => (i + move[event.key] + count) % count)
		}
		if (event.key === 'Enter' || event.key === ' ')
			props.items[selected()]?.choose()
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<div style={styles.backdrop}>
			<div style={styles.panel}>
				<div style={styles.title}>Paused</div>
				<For each={props.items}>
					{(item, i) => (
						<button
							type="button"
							style={{
								...styles.item,
								...(selected() === i() ? styles.itemSelected : {}),
							}}
							onMouseEnter={() => setSelected(i())}
							onClick={() => item.choose()}
						>
							{item.label}
						</button>
					)}
				</For>
				<div style={styles.hint}>Esc or P to carry on</div>
			</div>
		</div>
	)
}

const styles = {
	backdrop: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		'pointer-events': 'auto',
	},
	panel: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'stretch',
		gap: '10px',
		'min-width': '260px',
		padding: '24px 28px 20px',
		background: 'var(--ink)',
		color: 'white',
		border: '4px solid white',
		'text-align': 'center',
	},
	title: {
		'font-size': '48px',
		color: '#ffd23f',
		'margin-bottom': '6px',
	},
	item: {
		background: 'transparent',
		color: 'white',
		border: '3px solid transparent',
		padding: '10px 14px 6px',
		'font-size': '22px',
	},
	itemSelected: {
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
	},
	hint: {
		'margin-top': '6px',
		'font-size': '14px',
		opacity: 0.7,
	},
} satisfies Record<string, JSX.CSSProperties>
