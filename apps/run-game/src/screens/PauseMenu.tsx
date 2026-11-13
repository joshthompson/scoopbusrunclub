import { For, type JSX, Show, createSignal, onCleanup } from 'solid-js'
import { effectsOn, musicOn, setEffectsOn, setMusicOn } from '../saved/settings'
import { play } from '../sfx'
import { onHover } from '../ui/hover'

export interface MenuItem {
	label: string
	/** A setting's value, shown on the right: On or Off. */
	value?: () => string
	choose: () => void
}

/** The sound effects and music, switched on and off right there in the menu. */
export const SOUND_ITEMS: MenuItem[] = [
	{
		label: 'Sound effects',
		value: () => (effectsOn() ? 'On' : 'Off'),
		choose: () => {
			setEffectsOn(!effectsOn())
			// Let them hear it's back on.
			play('select')
		},
	},
	{
		label: 'Music',
		value: () => (musicOn() ? 'On' : 'Off'),
		choose: () => setMusicOn(!musicOn()),
	},
]

/**
 * The pause menu, its items in groups with a line between each: up and
 * down (or W and S) to move, Enter or Space to pick, or click; left and
 * right flip a setting too. Esc and P to resume are the game's, which also
 * opened it.
 */
export function PauseMenu(props: {
	groups: MenuItem[][]
	/** Over it: Paused, unless it isn't. */
	title?: string
	/** Under it: how to close it. */
	hint?: string
}) {
	const items = () => props.groups.flat()
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
		const item = items()[selected()]
		if (event.key in move) {
			const count = items().length
			setSelected((i) => (i + move[event.key] + count) % count)
		} else if (event.key === 'Enter' || event.key === ' ') item?.choose()
		else if (
			item?.value &&
			['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)
		)
			item.choose()
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	/** Where each group's items start, counting through them all. */
	const firstOf = (group: number) =>
		props.groups.slice(0, group).reduce((n, items) => n + items.length, 0)

	return (
		<div style={styles.backdrop}>
			<div style={styles.panel}>
				<div style={styles.title}>{props.title ?? 'Paused'}</div>
				<For each={props.groups}>
					{(group, g) => (
						<>
							<Show when={g() > 0}>
								<div style={styles.divider} />
							</Show>
							<For each={group}>
								{(item, i) => {
									const index = () => firstOf(g()) + i()
									return (
										<button
											type="button"
											style={{
												...styles.item,
												...(selected() === index() ? styles.itemSelected : {}),
											}}
											onMouseEnter={onHover(() => setSelected(index()))}
											onClick={() => item.choose()}
										>
											<span>{item.label}</span>
											<Show when={item.value}>
												{(value) => (
													<span style={styles.value}>{value()()}</span>
												)}
											</Show>
										</button>
									)
								}}
							</For>
						</>
					)}
				</For>
				<div style={styles.hint}>{props.hint ?? 'Esc or P to resume'}</div>
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
		gap: '0px',
		width: '290px',
		padding: '12px 18px 10px',
		background: 'var(--ink)',
		color: 'white',
		border: '4px solid white',
		'text-align': 'center',
	},
	title: {
		'font-size': '30px',
		'line-height': 1.1,
		color: '#ffd23f',
		'margin-bottom': '6px',
	},
	item: {
		display: 'flex',
		'justify-content': 'space-between',
		gap: '12px',
		background: 'transparent',
		color: 'white',
		border: '3px solid transparent',
		padding: '5px 12px 2px',
		'font-size': '18px',
		'line-height': 1.1,
		'text-align': 'left',
	},
	itemSelected: {
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
	},
	value: {
		opacity: 0.85,
	},
	divider: {
		height: '2px',
		margin: '4px 4px',
		background: 'rgba(255, 255, 255, 0.25)',
	},
	hint: {
		'margin-top': '6px',
		'font-size': '13px',
		opacity: 0.7,
	},
} satisfies Record<string, JSX.CSSProperties>
