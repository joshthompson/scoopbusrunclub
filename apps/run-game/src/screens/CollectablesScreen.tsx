import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'
import { collectableCourse, onCourse } from '../courses/collectables'
import { CollectableArt } from '../draw/art/collectable'
import {
	COLLECTABLES,
	COLLECTABLE_ABOUT,
	COLLECTABLE_NAMES,
	type Collectable,
	collectableBehaviour,
	collectableKind,
} from '../game/collectables'
import { hasCollected, timesCollected } from '../saved/collected'
import { play } from '../sfx'
import { Menu, Panel } from '../ui/Menu'
import { onHover } from '../ui/hover'

/** How many cards to a row. */
const COLUMNS = 6

/**
 * Everything there is to collect, all in one grid: fika, rides, hats, a
 * pumpkin and a parkrun barcode. What's been had, with how many times; what
 * hasn't, a shadow of it. Beside the grid, the card the keys are on, bigger:
 * its name, what it is and does, and where it's from; or, not had yet,
 * "???" and which course to look on. The arrows (or WASD) go from card to
 * card, down off the last row to Back.
 */
export function CollectablesScreen(props: { onBack: () => void }) {
	const found = () => COLLECTABLES.filter(hasCollected).length
	/** The card the keys are on; or, past the last, Back. */
	const [selected, setSelected] = createSignal(0)
	const onBack = () => selected() === COLLECTABLES.length
	const select = (at: number) => {
		if (at === selected()) return
		setSelected(at)
		play('move')
	}

	const cards: HTMLElement[] = []
	// Keep the card the keys are on in view, scrolling the grid as they go.
	createEffect(() => cards[selected()]?.scrollIntoView({ block: 'nearest' }))

	const onKey = (event: KeyboardEvent) => {
		if (onBack()) return
		const at = selected()
		const last = COLLECTABLES.length - 1
		const move: Record<string, number> = {
			ArrowLeft: -1,
			a: -1,
			ArrowRight: 1,
			d: 1,
			ArrowUp: -COLUMNS,
			w: -COLUMNS,
			ArrowDown: COLUMNS,
			s: COLUMNS,
		}
		if (event.key in move) {
			event.preventDefault()
			const step = move[event.key]
			// Down off the last row: to Back. Up off the top row: nowhere.
			if (step === COLUMNS && at + step > last) {
				if (Math.floor(at / COLUMNS) === Math.floor(last / COLUMNS))
					select(COLLECTABLES.length)
				else select(last)
			} else select(Math.max(0, Math.min(last, at + step)))
		}
		if (event.key === 'Escape') {
			play('back')
			props.onBack()
		}
	}
	window.addEventListener('keydown', onKey)
	onCleanup(() => window.removeEventListener('keydown', onKey))

	return (
		<div style={styles.screen}>
			<Panel
				title="Collectables"
				style={{ width: '900px', padding: '14px 18px' }}
			>
				<div style={styles.tally}>
					{found()} of {COLLECTABLES.length} found
				</div>
				<div style={styles.body}>
					<div style={styles.grid}>
						<For each={COLLECTABLES}>
							{(id, i) => (
								<Card
									id={id}
									selected={selected() === i()}
									ref={(el) => {
										cards[i()] = el
									}}
									onHover={() => select(i())}
								/>
							)}
						</For>
					</div>
					<Details
						id={COLLECTABLES[Math.min(selected(), COLLECTABLES.length - 1)]}
					/>
				</div>
				<div
					style={{ width: '200px', margin: '6px auto 0' }}
					onMouseEnter={onHover(() => select(COLLECTABLES.length))}
				>
					<Menu
						items={[{ label: 'Back', choose: props.onBack }]}
						onBack={props.onBack}
						active={onBack()}
						// Up off Back: to the last row's first card.
						onLeave={(way) => {
							if (way < 0)
								select(
									Math.floor((COLLECTABLES.length - 1) / COLUMNS) * COLUMNS,
								)
						}}
					/>
				</div>
			</Panel>
		</div>
	)
}

function Card(props: {
	id: Collectable
	/** The keys are on it. */
	selected: boolean
	ref: (el: HTMLDivElement) => void
	onHover: () => void
}) {
	const got = () => hasCollected(props.id)
	return (
		<div
			ref={props.ref}
			style={{ ...styles.card, ...(props.selected ? styles.selected : {}) }}
			onMouseEnter={onHover(props.onHover)}
		>
			<div
				style={{
					...styles.art,
					// Not had yet: a shadow of it.
					filter: got() ? undefined : 'brightness(0) opacity(0.35)',
				}}
			>
				<CollectableArt id={props.id} />
			</div>
			<div style={styles.count}>
				{got() ? `× ${timesCollected(props.id)}` : '???'}
			</div>
		</div>
	)
}

/** The card the keys are on, bigger, and all about it. */
function Details(props: { id: Collectable }) {
	const got = () => hasCollected(props.id)
	const course = () => collectableCourse(props.id)
	return (
		<div style={styles.details}>
			<div
				style={{
					...styles.bigArt,
					filter: got() ? undefined : 'brightness(0) opacity(0.35)',
				}}
			>
				{/* Keyed: the art's drawn for one collectable, not followed as it changes. */}
				<Show when={props.id} keyed>
					{(id) => (
						<div style={{ transform: 'scale(2)' }}>
							<CollectableArt id={id} />
						</div>
					)}
				</Show>
			</div>
			<div style={styles.detailsName}>
				{got() ? COLLECTABLE_NAMES[props.id] : '???'}
			</div>
			<Show
				when={got()}
				fallback={
					<Show when={course()}>
						{(course) => (
							<div style={styles.about}>Somewhere {onCourse(course())}.</div>
						)}
					</Show>
				}
			>
				<div style={styles.kind}>
					{collectableKind(props.id)} · collected × {timesCollected(props.id)}
				</div>
				<div style={styles.about}>{COLLECTABLE_ABOUT[props.id]}</div>
				<For each={collectableBehaviour(props.id)}>
					{(line) => <div style={styles.behaviour}>{line}</div>}
				</For>
				<Show when={course()}>
					{(course) => (
						<div style={styles.from}>Found {onCourse(course())}</div>
					)}
				</Show>
			</Show>
		</div>
	)
}

/** A dark outline round text, so it reads over the art. */
const OUTLINE = [
	'2px 0 0 #0f1f29',
	'-2px 0 0 #0f1f29',
	'0 2px 0 #0f1f29',
	'0 -2px 0 #0f1f29',
	'2px 2px 0 #0f1f29',
	'-2px 2px 0 #0f1f29',
	'2px -2px 0 #0f1f29',
	'-2px -2px 0 #0f1f29',
].join(', ')

const styles = {
	screen: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
	},
	tally: {
		'text-align': 'center',
		'font-size': '15px',
		opacity: 0.8,
		'margin-top': '-10px',
	},
	/** The grid, and beside it the card the keys are on. */
	body: {
		display: 'flex',
		gap: '12px',
		'align-items': 'stretch',
	},
	grid: {
		flex: 1,
		'min-width': 0,
		display: 'grid',
		// Not wider for whatever's in them: every column the same.
		'grid-template-columns': `repeat(${COLUMNS}, minmax(0, 1fr))`,
		'align-content': 'start',
		gap: '6px',
		height: '320px',
		'overflow-y': 'auto',
	},
	details: {
		width: '250px',
		'flex-shrink': 0,
		'box-sizing': 'border-box',
		height: '320px',
		'overflow-y': 'auto',
		display: 'flex',
		'flex-direction': 'column',
		gap: '6px',
		padding: '10px 12px',
		background: 'rgba(255, 255, 255, 0.08)',
		border: '2px solid rgba(255, 255, 255, 0.18)',
	},
	bigArt: {
		height: '110px',
		'flex-shrink': 0,
		display: 'grid',
		'place-items': 'center',
	},
	detailsName: {
		'font-size': '20px',
		'text-align': 'center',
		'line-height': 1.1,
	},
	kind: {
		'font-size': '12px',
		'text-align': 'center',
		opacity: 0.7,
	},
	/** What it is: its flavour, in white. */
	about: {
		'font-size': '13px',
		'line-height': 1.3,
	},
	/** What it does, apart from what it is: in yellow. */
	behaviour: {
		'font-size': '13px',
		'line-height': 1.3,
		color: '#ffd23f',
	},
	from: {
		'margin-top': 'auto',
		'font-size': '12px',
		opacity: 0.7,
	},
	card: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '2px',
		padding: '6px 2px 4px',
		background: 'rgba(255, 255, 255, 0.08)',
		border: '2px solid rgba(255, 255, 255, 0.18)',
	},
	selected: {
		background: 'rgba(255, 255, 255, 0.22)',
		border: '2px solid white',
	},
	art: {
		height: '40px',
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
	},
	// In front of the art, outlined: a tall ride, a llama or a camel, comes
	// down over it.
	count: {
		position: 'relative',
		'font-size': '11px',
		opacity: 0.7,
		'text-shadow': OUTLINE,
	},
} satisfies Record<string, JSX.CSSProperties>
