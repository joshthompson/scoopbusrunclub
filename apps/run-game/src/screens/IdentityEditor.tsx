import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { saveProfile } from '../online/runScores'
import { type CustomRunner, customRunners } from '../runners/customRunners'
import { MEMBERS, type Playable, customPlayable } from '../runners/playable'
import {
	MAX_NAME_LENGTH,
	iconOf,
	identity,
	setIdentity,
} from '../saved/identity'
import { lastRunner } from '../saved/settings'
import { play } from '../sfx'
import { Menu, Panel } from '../ui/Menu'
import { ScoreFace } from '../ui/ScoreFace'
import { RunnerEditor } from './RunnerEditor'

/** Making a runner of your own, from the picker: one of its choices. */
const NEW_RUNNER = 'new'
type Choice = Playable | typeof NEW_RUNNER

/**
 * The picker's slots, either side of the middle one: how far along, how big,
 * and how faint, each further out. Anyone further out than these is out of
 * sight, faded away.
 */
const SLOTS = [
	{ x: 0, scale: 1, opacity: 1 },
	{ x: 92, scale: 0.68, opacity: 0.7 },
	{ x: 158, scale: 0.46, opacity: 0.4 },
	{ x: 206, scale: 0.3, opacity: 0 },
]
/** How big a head is in the middle slot. */
const FACE = 64

/**
 * Your name on the online high score tables, and the runner whose head goes
 * by it: chosen the first time a score's sent, and changed in Options or
 * before sending one. ← → (or A and D, when not typing) turn the runners
 * round, two either side of the one picked; or make a new runner of your
 * own, and it's picked.
 */
export function IdentityEditor(props: {
	/** Whose head to start on, if there's not one chosen yet: the runner just run as. */
	runner?: Playable
	/** What saving does: "Save", or "Save and send". */
	saveLabel?: string
	onSave: () => void
	onCancel: () => void
}) {
	/**
	 * Making a new runner, then your own, then the club's: anyone you can run
	 * as, with a head.
	 */
	const choices = (): Choice[] => [
		NEW_RUNNER,
		...[
			...customRunners().map(customPlayable).reverse(),
			...[...MEMBERS].sort((a, b) => a.name.localeCompare(b.name)),
		].filter((runner) => iconOf(runner) && runner.sprite.face),
	]
	const indexOf = (id: string | undefined) =>
		choices().findIndex((choice) => choice !== NEW_RUNNER && choice.id === id)
	/**
	 * Who's picked to begin with: the runner just run as, before sending a
	 * score, your own or the club's; else whoever was chosen last time; else
	 * the last runner picked to run as; or the first of the club. Never
	 * making a new runner.
	 */
	const startAt = () => {
		const ran = indexOf(props.runner?.id)
		if (ran > 0) return ran
		const chosen = indexOf(identity().runnerId)
		if (chosen > 0) return chosen
		const current = indexOf(lastRunner())
		if (current > 0) return current
		const firstMember = choices().findIndex(
			(choice) => choice !== NEW_RUNNER && !choice.custom,
		)
		return Math.max(1, firstMember)
	}
	const [at, setAt] = createSignal(startAt())
	const choice = () => choices()[at()]
	/** The runner picked, unless it's making a new one. */
	const runner = () => {
		const picked = choice()
		return picked === NEW_RUNNER ? undefined : picked
	}
	/** Making a runner of your own, in the runner editor. */
	const [making, setMaking] = createSignal(false)
	/** Made: picked, and their name's yours too, if you've not got one. */
	const made = (custom: CustomRunner) => {
		setMaking(false)
		setAt(Math.max(1, indexOf(customPlayable(custom).id)))
		if (!name().trim()) setName(custom.name)
		setProblem(undefined)
	}
	const [name, setName] = createSignal(
		identity().name ?? props.runner?.name ?? '',
	)
	const [problem, setProblem] = createSignal<string>()

	const cycle = (by: number) => {
		const count = choices().length
		if (!count || !by) return
		play('move')
		setAt((i) => (((i + by) % count) + count) % count)
	}
	/**
	 * How far round from the picked one each choice is, either way: the
	 * nearer way round, so the picker turns as a wheel.
	 */
	const offset = (i: number) => {
		const count = choices().length
		const d = (((i - at()) % count) + count) % count
		return d > count / 2 ? d - count : d
	}
	const save = () => {
		if (choice() === NEW_RUNNER) return setMaking(true)
		const chosen = runner()
		if (!name().trim()) {
			setProblem('Give yourself a name first')
			input?.focus()
			return
		}
		if (!chosen) return
		setIdentity(name(), chosen)
		// Onto every table you're on, in the background.
		void saveProfile()
		props.onSave()
	}

	let input: HTMLInputElement | undefined
	onMount(() => input?.focus())
	const onKey = (event: KeyboardEvent) => {
		// The runner editor has the keys while it's up; in the name box, ← →
		// move along it instead.
		if (making() || event.target === input) return
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
		<Show
			when={!making()}
			fallback={
				<RunnerEditor
					backLabel="← Back"
					onSave={made}
					onCancel={() => setMaking(false)}
					onDelete={() => setMaking(false)}
				/>
			}
		>
			<Panel title="Your high score name" style={{ width: '520px' }}>
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
					{/* A wheel of heads, the picked one in the middle, turning. */}
					<div style={styles.wheel}>
						<For each={choices()}>
							{(each, i) => {
								const slot = () =>
									SLOTS[Math.min(SLOTS.length - 1, Math.abs(offset(i())))]
								const side = () => Math.sign(offset(i()))
								return (
									<button
										type="button"
										aria-label={each === NEW_RUNNER ? 'New runner' : each.name}
										tabIndex={-1}
										style={{
											...styles.slot,
											transform: `translateX(${side() * slot().x}px) scale(${slot().scale})`,
											opacity: slot().opacity,
											'z-index': SLOTS.length - Math.abs(offset(i())),
											'pointer-events': slot().opacity ? 'auto' : 'none',
										}}
										// The one in the middle: picked, or a new one made.
										// Either side: turned round to.
										onClick={() => (offset(i()) ? cycle(offset(i())) : save())}
									>
										<Show
											when={each !== NEW_RUNNER && each}
											fallback={<span style={styles.newRunner}>+</span>}
										>
											{(runner) => (
												<ScoreFace icon={iconOf(runner())} size={FACE} />
											)}
										</Show>
									</button>
								)
							}}
						</For>
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
				<div style={styles.picked}>{runner()?.name ?? 'New runner'}</div>
				<Show when={problem()}>
					<div style={styles.problem}>{problem()}</div>
				</Show>
				<Menu
					items={[
						choice() === NEW_RUNNER
							? { label: 'Make a runner', choose: () => setMaking(true) }
							: { label: props.saveLabel ?? 'Save', choose: save },
						{ label: 'Cancel', choose: props.onCancel },
					]}
					onBack={props.onCancel}
				/>
				<div style={styles.hint}>
					Shown by your scores on the online tables · ← → to change runner
				</div>
			</Panel>
		</Show>
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
	wheel: {
		position: 'relative',
		flex: 1,
		height: `${FACE + 8}px`,
		overflow: 'hidden',
	},
	slot: {
		position: 'absolute',
		left: `calc(50% - ${FACE / 2}px)`,
		top: '4px',
		width: `${FACE}px`,
		height: `${FACE}px`,
		padding: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'none',
		border: 'none',
		transition: 'transform 180ms ease-out, opacity 180ms ease-out',
	},
	newRunner: {
		display: 'grid',
		'place-items': 'center',
		width: `${FACE - 8}px`,
		height: `${FACE - 8}px`,
		border: '3px dashed white',
		color: 'white',
		'font-size': '32px',
		'line-height': 1,
	},
	picked: {
		'text-align': 'center',
		'font-size': '18px',
		'margin-top': '-6px',
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
