import { type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { customRunners } from '../runners/customRunners'
import { MEMBERS, type Playable, customPlayable } from '../runners/playable'
import {
	MAX_NAME_LENGTH,
	iconOf,
	identity,
	setIdentity,
} from '../saved/identity'
import { play } from '../sfx'
import { Menu, Panel } from '../ui/Menu'
import { ScoreFace } from '../ui/ScoreFace'

/**
 * Your name on the online high score tables, and the runner whose head goes
 * by it: chosen the first time a score's sent, and changed in Options or
 * before sending one. ← → (or A and D, when not typing) for the runner.
 */
export function IdentityEditor(props: {
	/** Whose head to start on, if there's not one chosen yet: the runner just run as. */
	runner?: Playable
	/** What saving does: "Save", or "Save and send". */
	saveLabel?: string
	onSave: () => void
	onCancel: () => void
}) {
	/** Your own runners, then the club's: anyone you can run as, with a head. */
	const choices = () =>
		[
			...customRunners().map(customPlayable).reverse(),
			...[...MEMBERS].sort((a, b) => a.name.localeCompare(b.name)),
		].filter((runner) => iconOf(runner) && runner.sprite.face)
	const startAt = () => {
		const id = identity().runnerId ?? props.runner?.id
		return Math.max(
			0,
			choices().findIndex((runner) => runner.id === id),
		)
	}
	const [at, setAt] = createSignal(startAt())
	const runner = () => choices()[at()]
	const [name, setName] = createSignal(
		identity().name ?? props.runner?.name ?? '',
	)
	const [problem, setProblem] = createSignal<string>()

	const cycle = (by: number) => {
		const count = choices().length
		if (!count) return
		play('move')
		setAt((i) => (i + by + count) % count)
	}
	const save = () => {
		const chosen = runner()
		if (!name().trim()) {
			setProblem('Give yourself a name first')
			input?.focus()
			return
		}
		if (!chosen) return
		setIdentity(name(), chosen)
		props.onSave()
	}

	let input: HTMLInputElement | undefined
	onMount(() => input?.focus())
	const onKey = (event: KeyboardEvent) => {
		// In the name box, ← → move along it instead.
		if (event.target === input) return
		const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
		if (key === 'ArrowLeft' || key === 'a') {
			event.preventDefault()
			cycle(-1)
		}
		if (key === 'ArrowRight' || key === 'd') {
			event.preventDefault()
			cycle(1)
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<Panel title="Your high score name" style={{ width: '460px' }}>
			<label style={styles.field}>
				<span>Name</span>
				<input
					ref={input}
					value={name()}
					maxLength={MAX_NAME_LENGTH}
					spellcheck={false}
					autocomplete="off"
					style={styles.input}
					onInput={(event) => {
						setName(event.currentTarget.value)
						setProblem(undefined)
					}}
					// Down off the box, to the menu; ↑ comes back up to it.
					onKeyDown={(event) => {
						if (event.key !== 'ArrowDown') return
						// Onto the menu's first item, not past it.
						event.stopPropagation()
						input?.blur()
					}}
				/>
			</label>
			<div style={styles.picker}>
				<button
					type="button"
					style={styles.arrow}
					aria-label="Previous runner"
					onClick={() => cycle(-1)}
				>
					◀
				</button>
				<div style={styles.runner}>
					<ScoreFace icon={runner() && iconOf(runner())} size={56} />
					<span>{runner()?.name}</span>
				</div>
				<button
					type="button"
					style={styles.arrow}
					aria-label="Next runner"
					onClick={() => cycle(1)}
				>
					▶
				</button>
			</div>
			<Show when={problem()}>
				<div style={styles.problem}>{problem()}</div>
			</Show>
			<Menu
				items={[
					{ label: props.saveLabel ?? 'Save', choose: save },
					{ label: 'Cancel', choose: props.onCancel },
				]}
				onBack={props.onCancel}
			/>
			<div style={styles.hint}>
				Shown by your scores on the online tables · ← → to change runner
			</div>
		</Panel>
	)
}

const styles = {
	field: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'space-between',
		gap: '12px',
		'font-size': '18px',
	},
	input: {
		width: '280px',
		height: '30px',
		padding: '3px 8px 0',
		'box-sizing': 'border-box',
		background: 'var(--ink)',
		color: 'white',
		border: '2px solid white',
		outline: 'none',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
		'-webkit-user-select': 'text',
		'user-select': 'text',
	},
	picker: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'space-between',
		gap: '12px',
	},
	arrow: {
		width: '44px',
		height: '44px',
		padding: '4px 0 0',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
		'box-shadow': '3px 3px 0 #b33a2a',
		'font-size': '18px',
	},
	runner: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '4px',
		'font-size': '18px',
	},
	problem: {
		'text-align': 'center',
		color: '#ffd23f',
		'font-size': '16px',
	},
	hint: {
		'text-align': 'center',
		'font-family': '"Cabin", sans-serif',
		'font-size': '13px',
		opacity: 0.7,
	},
} satisfies Record<string, JSX.CSSProperties>
