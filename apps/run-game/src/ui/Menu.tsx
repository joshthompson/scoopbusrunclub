import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'
import { play } from '../sfx'

/** A framed pixel panel, the menus' and the pause menu's look. */
export function Panel(props: {
	title?: string
	children: JSX.Element
	style?: JSX.CSSProperties
}) {
	return (
		<div style={{ ...styles.panel, ...props.style }}>
			<Show when={props.title}>
				<div style={styles.panelTitle}>{props.title}</div>
			</Show>
			{props.children}
		</div>
	)
}

export interface MenuItem {
	label: string
	/** Shown on the right of the item: an option's setting, say. */
	value?: string
	/** Shown greyed out, with `tag` stuck on it, and can't be picked. */
	disabled?: boolean
	tag?: string
	choose?: () => void
}

/**
 * A list to pick from: up and down (or W and S), Enter or Space to pick, Esc
 * to go back. Or point and click.
 */
export function Menu(props: {
	items: MenuItem[]
	onBack?: () => void
	/** Starts on this item. */
	initial?: number
	/** Told whenever the selection moves, for coming back to the same place. */
	onChange?: (index: number) => void
}) {
	const [selected, setSelected] = createSignal(props.initial ?? 0)
	createEffect(() => props.onChange?.(selected()))
	// If the list gets shorter, stay on it.
	createEffect(() =>
		setSelected((i) => Math.min(i, Math.max(0, props.items.length - 1))),
	)

	const move = (by: number) => {
		const count = props.items.length
		setSelected((i) => (i + by + count) % count)
		play('move')
	}
	const choose = (item: MenuItem | undefined) => {
		if (!item || item.disabled) return play('back')
		play('select')
		item.choose?.()
	}

	const onKey = (event: KeyboardEvent) => {
		if (['ArrowUp', 'w', 'W'].includes(event.key)) {
			event.preventDefault()
			move(-1)
		}
		if (['ArrowDown', 's', 'S'].includes(event.key)) {
			event.preventDefault()
			move(1)
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			choose(props.items[selected()])
		}
		if (event.key === 'Escape' && props.onBack) {
			play('back')
			props.onBack()
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<div style={styles.menu}>
			<For each={props.items}>
				{(item, i) => {
					const isSelected = () => selected() === i()
					return (
						<button
							type="button"
							style={{
								...styles.item,
								...(isSelected() ? styles.itemSelected : {}),
								...(item.disabled ? styles.itemDisabled : {}),
							}}
							onMouseEnter={() => {
								if (!isSelected()) {
									setSelected(i())
									play('move')
								}
							}}
							onClick={() => choose(item)}
						>
							<span
								style={{
									...styles.cursor,
									visibility: isSelected() ? 'visible' : 'hidden',
								}}
							>
								→
							</span>
							<span style={{ flex: 1, 'text-align': 'left' }}>
								{item.label}
							</span>
							<Show when={item.value}>
								<span style={styles.value}>{item.value}</span>
							</Show>
							<Show when={item.tag}>
								<span style={styles.tag}>{item.tag}</span>
							</Show>
						</button>
					)
				}}
			</For>
		</div>
	)
}

/** The game's name, each letter bouncing in turn. */
export function Logo(props: { size?: number }) {
	/** Each word's letters, and how far into the whole name each one is, for its bounce's delay. */
	let at = 0
	const words = ['Scoop', 'Bus', 'Run'].map((word) =>
		[...word].map((char) => ({ char, index: at++ })),
	)
	return (
		<h1
			style={{
				...styles.logo,
				'font-size': `${props.size ?? 88}px`,
			}}
		>
			<For each={words}>
				{(letters) => (
					<span style={{ display: 'inline-block', margin: '0 0.18em' }}>
						<For each={letters}>
							{(letter) => (
								<span
									style={{
										display: 'inline-block',
										animation: `logo-bounce 2.6s ${letter.index * 0.07}s ease-in-out infinite`,
									}}
								>
									{letter.char}
								</span>
							)}
						</For>
					</span>
				)}
			</For>
		</h1>
	)
}

/** Text with the ink outline and drop shadow the titles use. */
export const OUTLINED: JSX.CSSProperties = {
	color: 'white',
	'text-shadow': [
		'3px 0 var(--ink)',
		'-3px 0 var(--ink)',
		'0 3px var(--ink)',
		'0 -3px var(--ink)',
		'3px 3px var(--ink)',
		'-3px 3px var(--ink)',
		'3px -3px var(--ink)',
		'-3px -3px var(--ink)',
		'5px 7px 0 rgba(15, 31, 41, 0.45)',
	].join(', '),
}

const styles = {
	panel: {
		position: 'relative',
		display: 'flex',
		'flex-direction': 'column',
		gap: '10px',
		padding: '22px 26px',
		background: 'rgba(15, 31, 41, 0.92)',
		color: 'white',
		border: '4px solid white',
		'box-shadow':
			'0 0 0 4px var(--ink), 10px 10px 0 4px rgba(15, 31, 41, 0.45)',
		animation: 'panel-in 0.35s cubic-bezier(0.2, 1.4, 0.4, 1) both',
	},
	panelTitle: {
		'font-size': '34px',
		color: '#ffd23f',
		'text-align': 'center',
		'margin-bottom': '6px',
		'text-shadow': '3px 3px 0 #b33a2a',
	},
	menu: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '6px',
	},
	item: {
		position: 'relative',
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		width: '100%',
		padding: '8px 16px 4px 8px',
		background: 'transparent',
		color: 'white',
		border: '3px solid transparent',
		'font-family': 'var(--font-pixel)',
		'font-size': '24px',
		'line-height': 1,
		'white-space': 'nowrap',
	},
	itemSelected: {
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
		'box-shadow': '4px 4px 0 #b33a2a',
	},
	itemDisabled: {
		color: 'rgba(255, 255, 255, 0.4)',
	},
	cursor: {
		width: '22px',
		'text-align': 'center',
		animation: 'cursor-bob 0.6s ease-in-out infinite alternate',
	},
	value: {
		'font-size': '20px',
		opacity: 0.85,
	},
	tag: {
		position: 'absolute',
		right: '-14px',
		top: '-8px',
		padding: '4px 6px 1px',
		background: 'var(--bus-red)',
		color: 'white',
		'font-size': '13px',
		border: '2px solid white',
		transform: 'rotate(8deg)',
	},
	logo: {
		margin: 0,
		'font-family': 'var(--font-pixel)',
		'font-weight': 'normal',
		'line-height': 1,
		'white-space': 'nowrap',
		color: 'var(--bus-red)',
		// A white outline, and the drop shadow behind it.
		'text-shadow': [
			'4px 0 white',
			'-4px 0 white',
			'0 4px white',
			'0 -4px white',
			'4px 4px white',
			'-4px 4px white',
			'4px -4px white',
			'-4px -4px white',
			'8px 10px 0 rgba(15, 31, 41, 0.5)',
		].join(', '),
	},
} satisfies Record<string, JSX.CSSProperties>
