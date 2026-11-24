import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
	onMount,
} from 'solid-js'
import { collectablePlaces, onCourses } from '../courses/collectables'
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
 * The grid's groups, in order: fika and the barcode, things to pick up;
 * hats, a Pumpkin among them; and Rides.
 */
const GROUPS: { title: string; ids: Collectable[] }[] = [
	{
		title: 'Items',
		ids: COLLECTABLES.filter(
			(id) => id.startsWith('fika:') || id === 'barcode',
		),
	},
	{
		title: 'Hats',
		ids: COLLECTABLES.filter((id) => id.startsWith('hat:') || id === 'pumpkin'),
	},
	{ title: 'Rides', ids: COLLECTABLES.filter((id) => id.startsWith('ride:')) },
]
/** Every card, group by group: the order the keys go through them. */
const CARDS = GROUPS.flatMap((g) => g.ids)
/** Where group `g`'s first card is in `CARDS`. */
const firstOf = (g: number) =>
	GROUPS.slice(0, g).reduce((n, { ids }) => n + ids.length, 0)
/** Each row of cards, by their place in `CARDS`, group by group: for up and down. */
const ROWS: number[][] = GROUPS.flatMap((group, g) => {
	const first = firstOf(g)
	return Array.from({ length: Math.ceil(group.ids.length / COLUMNS) }, (_, r) =>
		group.ids
			.slice(r * COLUMNS, (r + 1) * COLUMNS)
			.map((_, k) => first + r * COLUMNS + k),
	)
})
/** Which row card `i` is in, and how far along it. */
const placeOf = (i: number) => {
	const row = ROWS.findIndex((r) => r.includes(i))
	return { row, column: ROWS[row].indexOf(i) }
}

/**
 * Everything there is to collect, in a grid, grouped: items (fika and a
 * parkrun barcode), hats (a Pumpkin among them), and rides. What's been
 * had, with how many times; what hasn't, a shadow of it. Beside the grid,
 * the card the keys are on, bigger: its name, what it is and does, and
 * where it's from; or, not had yet, "???" and which course to look on. The
 * arrows (or WASD) go from card to card, up and down row by row from one
 * group into the next, and down off the last row to Back.
 */
export function CollectablesScreen(props: { onBack: () => void }) {
	const found = () => COLLECTABLES.filter(hasCollected).length
	/** The card the keys are on; or, past the last, Back. */
	const [selected, setSelected] = createSignal(0)
	const onBack = () => selected() === CARDS.length
	const select = (at: number) => {
		if (at === selected()) return
		setSelected(at)
		play('move')
	}

	const cards: HTMLElement[] = []
	// Keep the card the keys are on in view, scrolling the grid as they go.
	// On a group's first row, its heading too.
	const headings: HTMLElement[] = []
	createEffect(() => {
		const at = selected()
		const g = GROUPS.findIndex((_, k) => at < firstOf(k + 1))
		if (g >= 0 && at - firstOf(g) < COLUMNS)
			headings[g]?.scrollIntoView({ block: 'nearest' })
		cards[at]?.scrollIntoView({ block: 'nearest' })
	})

	const onKey = (event: KeyboardEvent) => {
		if (onBack()) return
		const at = selected()
		const last = CARDS.length - 1
		const along: Record<string, number> = {
			ArrowLeft: -1,
			a: -1,
			ArrowRight: 1,
			d: 1,
		}
		const upDown: Record<string, number> = {
			ArrowUp: -1,
			w: -1,
			ArrowDown: 1,
			s: 1,
		}
		if (event.key in along) {
			event.preventDefault()
			select(Math.max(0, Math.min(last, at + along[event.key])))
		} else if (event.key in upDown) {
			event.preventDefault()
			// To the row above or below, as far along as it goes; down off the
			// last row, to Back; up off the top one, nowhere.
			const { row, column } = placeOf(at)
			const to = ROWS[row + upDown[event.key]]
			if (to) select(to[Math.min(column, to.length - 1)])
			else if (upDown[event.key] > 0) select(CARDS.length)
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
						<For each={GROUPS}>
							{(group, g) => {
								const first = () => firstOf(g())
								return (
									<>
										<div
											style={styles.group}
											ref={(el) => {
												headings[g()] = el
											}}
										>
											{group.title}
											<span style={styles.groupTally}>
												{group.ids.filter(hasCollected).length} of{' '}
												{group.ids.length}
											</span>
										</div>
										<For each={group.ids}>
											{(id, i) => (
												<Card
													id={id}
													selected={selected() === first() + i()}
													ref={(el) => {
														cards[first() + i()] = el
													}}
													onHover={() => select(first() + i())}
												/>
											)}
										</For>
									</>
								)
							}}
						</For>
					</div>
					<Details id={CARDS[Math.min(selected(), CARDS.length - 1)]} />
				</div>
				<div
					style={{ width: '200px', margin: '6px auto 0' }}
					onMouseEnter={onHover(() => select(CARDS.length))}
				>
					<Menu
						items={[{ label: 'Back', choose: props.onBack }]}
						onBack={props.onBack}
						active={onBack()}
						// Up off Back: to the last row's first card.
						onLeave={(way) => {
							if (way < 0) select(ROWS[ROWS.length - 1][0])
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
	const places = () => collectablePlaces(props.id)
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
					{(id) => <FittedArt id={id} />}
				</Show>
			</div>
			<div style={styles.detailsName}>
				{got() ? COLLECTABLE_NAMES[props.id] : '???'}
			</div>
			<Show
				when={got()}
				fallback={
					<Show when={places().length}>
						<div style={styles.about}>Somewhere {onCourses(places())}.</div>
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
				<Show when={places().length}>
					<div style={styles.from}>Found {onCourses(places())}</div>
				</Show>
			</Show>
		</div>
	)
}

/** How much bigger the details' art is drawn, at most, and the room it has. */
const BIG_ART_SCALE = 2
const BIG_ART_WIDTH = 220
const BIG_ART_HEIGHT = 110

/**
 * A collectable's art, as big as it'll go in the details' room for it:
 * twice its size, or smaller, if it's big (a goat, a lifeboat), to fit,
 * not hanging down over its name. Measured as it's first drawn, all of it,
 * whatever's scaled inside it.
 */
function FittedArt(props: { id: Collectable }) {
	let art: HTMLDivElement | undefined
	const [scale, setScale] = createSignal<number>()
	onMount(() => {
		if (!art) return
		const rects = [art, ...art.querySelectorAll('*')].map((el) =>
			el.getBoundingClientRect(),
		)
		// On the screen, scaled with the whole menu to fit the window: back
		// to the menu's own pixels.
		const shown = art.offsetWidth > 0 ? rects[0].width / art.offsetWidth : 1
		const width =
			Math.max(...rects.map((r) => r.right)) -
			Math.min(...rects.map((r) => r.left))
		const height =
			Math.max(...rects.map((r) => r.bottom)) -
			Math.min(...rects.map((r) => r.top))
		setScale(
			Math.min(
				BIG_ART_SCALE,
				width > 0 ? (BIG_ART_WIDTH * shown) / width : BIG_ART_SCALE,
				height > 0 ? (BIG_ART_HEIGHT * shown) / height : BIG_ART_SCALE,
			),
		)
	})
	return (
		<div
			ref={art}
			style={{
				transform: `scale(${scale() ?? 1})`,
				// Hidden till it's measured, at its own size.
				visibility: scale() === undefined ? 'hidden' : 'visible',
			}}
		>
			<CollectableArt id={props.id} />
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
	/** A group's heading, across the grid, and how many of it have been found. */
	group: {
		'grid-column': '1 / -1',
		display: 'flex',
		'justify-content': 'space-between',
		'align-items': 'baseline',
		'font-size': '15px',
		padding: '4px 2px 0',
		'border-bottom': '2px solid rgba(255, 255, 255, 0.18)',
	},
	groupTally: {
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
