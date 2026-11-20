import { type JSX, createSignal, onMount } from 'solid-js'
import { play } from '../sfx'
import { Panel } from '../ui/Menu'
import { MAX_PLAYER_NAME, cleanPlayerName } from './protocol'

/**
 * Whether someone's typing, in a name or anything: the game's keys (WASD,
 * space, the lobby's M, G and R, Esc) are letters in it then, not the game's.
 */
export const typing = () => {
	const at = document.activeElement
	return at instanceof HTMLInputElement || at instanceof HTMLTextAreaElement
}

/**
 * Changing what a Player at a keyboard goes by, over the lobby: as a phone's
 * Player can on theirs. Blank, they go by their runner's name, which it
 * shows faintly. Enter (or Save) keeps it, Esc (or Cancel, or clicking off
 * it) doesn't. Its keys are its own: none of them gets to the lobby.
 */
export function NameDialog(props: {
	/** Whose: "P2", say. */
	who: string
	colour: string
	name: string
	/** Their runner's name: theirs, if they leave it blank. */
	placeholder: string
	onName: (name: string) => void
	onClose: () => void
}) {
	const [typed, setTyped] = createSignal(props.name)
	let input: HTMLInputElement | undefined
	onMount(() => {
		input?.focus()
		input?.select()
	})
	const save = () => {
		play('select')
		props.onName(cleanPlayerName(typed()))
		props.onClose()
	}
	const cancel = () => {
		play('back')
		props.onClose()
	}
	return (
		<div
			style={styles.back}
			onClick={(event) => {
				if (event.target === event.currentTarget) cancel()
			}}
			onKeyDown={(event) => {
				// Kept from the lobby, whose keys these all are too.
				event.stopPropagation()
				if (event.key === 'Enter') save()
				if (event.key === 'Escape') cancel()
			}}
		>
			<Panel style={styles.panel}>
				<div style={styles.title}>
					<span style={{ ...styles.chip, background: props.colour }} />
					{props.who}: your name
				</div>
				<input
					ref={input}
					type="text"
					style={styles.input}
					value={typed()}
					maxLength={MAX_PLAYER_NAME}
					placeholder={props.placeholder || 'Your name'}
					autocomplete="nickname"
					spellcheck={false}
					onInput={(event) => setTyped(event.currentTarget.value)}
				/>
				<div style={styles.hint}>Leave it blank to go by your runner’s</div>
				<div style={styles.buttons}>
					<button type="button" style={styles.button} onClick={cancel}>
						Cancel
					</button>
					<button
						type="button"
						style={{ ...styles.button, ...styles.save }}
						onClick={save}
					>
						Save ↵
					</button>
				</div>
			</Panel>
		</div>
	)
}

const styles = {
	back: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'var(--overlay-black-50)',
		'z-index': 10,
	},
	panel: { width: '360px', gap: '12px', padding: '18px 22px' },
	title: {
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		'font-size': '22px',
	},
	chip: {
		width: '14px',
		height: '14px',
		border: '2px solid white',
		'flex-shrink': 0,
	},
	input: {
		width: '100%',
		height: '46px',
		padding: '4px 10px 0',
		'box-sizing': 'border-box',
		background: 'white',
		color: 'var(--ink)',
		border: '3px solid #ffd23f',
		outline: 'none',
		'border-radius': 0,
		'font-family': 'var(--font-pixel)',
		'font-size': '20px',
	},
	hint: { 'font-size': '13px', opacity: 0.75 },
	buttons: { display: 'flex', gap: '10px', 'justify-content': 'flex-end' },
	button: {
		padding: '6px 14px',
		background: 'transparent',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
	},
	save: { background: '#ffd23f', color: 'var(--ink)' },
} satisfies Record<string, JSX.CSSProperties>
