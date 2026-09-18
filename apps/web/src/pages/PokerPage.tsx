import { BackSignButton } from '@/components/BackSignButton'
import {
	CARD_GAP,
	CARD_WIDTH,
	PokerCardGraphic,
	PokerCardMini,
} from '@/components/poker/PokerCards'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { Emoji } from '@/components/ui/Emoji'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { Tooltip } from '@/components/ui/Tooltip'
import type { RunResultItem } from '@/utils/api'
import { formatDate } from '@/utils/misc'
import {
	CELEBRATION_HANDS,
	type EventHand,
	HAND_INFO,
	type HandType,
	X_OF_A_KIND_BASE_MULTIPLIER,
	buildEventHands,
	formatScore,
	handsOnDate,
	isValidDate,
	latestWeekHands,
	orderedCards,
	pokerRoute,
	resultDates,
	scoreWorking,
	weekStartOf,
} from '@/utils/poker'
import { A, useParams } from '@solidjs/router'
import { css, cva } from '@style/css'
import { For, Show, createEffect, createMemo, createSignal, on } from 'solid-js'

interface PokerPageProps {
	results: RunResultItem[]
}

/** Room for five cards side by side, plus the block's own padding. */
const EVENT_BLOCK_MIN_WIDTH = CARD_WIDTH * 5 + CARD_GAP * 4 + 32

function EventHandBlock(props: { entry: EventHand; winner: boolean }) {
	const cards = createMemo(() => orderedCards(props.entry))
	return (
		<div class={styles.eventBlock({ winner: props.winner })}>
			<Show when={props.winner}>
				<span class={styles.winnerBadge}>
					<Emoji emoji="🏆" animation="none" /> Winner
				</span>
			</Show>
			<h3 class={styles.eventTitle}>
				<A href={`/event/${props.entry.event}`} class={styles.eventLink}>
					{props.entry.eventName}
				</A>{' '}
				<span class={styles.eventNumber}>#{props.entry.eventNumber}</span>
			</h3>
			<div class={styles.eventDate}>
				{formatDate(new Date(`${props.entry.date}T00:00:00`))}
			</div>
			<Show
				when={props.entry.hand}
				fallback={<div class={styles.handName}>No timed results</div>}
			>
				{(hand) => (
					<>
						<div
							class={styles.handName}
							classList={{ [styles.highCard]: hand().type === 'highCard' }}
						>
							{hand().label}
						</div>
						<div class={styles.cardRow}>
							<For each={cards()}>
								{({ card, inHand }) => (
									<PokerCardGraphic card={card} inHand={inHand} />
								)}
							</For>
						</div>
						<div class={styles.score}>
							<Tooltip content={scoreWorking(hand())}>
								Score: <strong>{formatScore(hand().score)}</strong>
							</Tooltip>
						</div>
					</>
				)}
			</Show>
		</div>
	)
}

/** One line of the historic list: a hand type, or one X of an X of a Kind. */
interface HistoricRow {
	key: string
	name: string
	multiplierLabel: string
	description: string
	entries: EventHand[]
}

function HistoricHandRow(props: { row: HistoricRow }) {
	const [expanded, setExpanded] = createSignal(false)
	const info = props.row
	const achieved = () => props.row.entries.length > 0
	const first = () => props.row.entries[0]
	const rest = () => props.row.entries.slice(1)

	const occurrence = (entry: EventHand) => (
		<div class={styles.occurrence}>
			<span>
				<A href={`/event/${entry.event}`} class={styles.eventLink}>
					{entry.eventName}
				</A>
				<span class={styles.eventNumber}> #{entry.eventNumber}</span>
				{' · '}
				{formatDate(new Date(`${entry.date}T00:00:00`))}
			</span>
			<span class={styles.occurrenceCards}>
				<For each={entry.hand?.cards ?? []}>
					{(card) => <PokerCardMini card={card} />}
				</For>
			</span>
			<Show when={entry.hand}>
				{(hand) => (
					<Tooltip content={scoreWorking(hand())}>
						<span class={styles.occurrenceScore}>
							{formatScore(hand().score)} pts
						</span>
					</Tooltip>
				)}
			</Show>
		</div>
	)

	return (
		<div class={styles.historicRow({ achieved: achieved() })}>
			<div class={styles.historicHeader}>
				<span class={styles.historicName}>{info.name}</span>
				<span class={styles.historicMultiplier}>{info.multiplierLabel}</span>
			</div>
			<div class={styles.historicDescription}>{info.description}</div>
			<Show
				when={achieved()}
				fallback={<span class={styles.notYet}>Not yet</span>}
			>
				{occurrence(first())}
				<Show when={rest().length > 0 && !expanded()}>
					<button
						type="button"
						class={styles.moreButton}
						onClick={() => setExpanded(true)}
					>
						+{rest().length} more
					</button>
				</Show>
				<Show when={expanded()}>
					<For each={rest()}>{occurrence}</For>
				</Show>
			</Show>
		</div>
	)
}

/** Room above the block for its title sign when scrolling to it. */
const WEEK_SCROLL_OFFSET = 72

export function PokerPage(props: PokerPageProps) {
	const params = useParams<{ date?: string }>()
	let weekRef: HTMLDivElement | undefined

	// Stepping between days keeps the reader at the hands, not the top of the
	// page: the links opt out of the router's scroll reset and this takes over.
	createEffect(
		on(
			() => params.date,
			() => {
				if (!weekRef) return
				const top =
					weekRef.getBoundingClientRect().top +
					window.scrollY -
					WEEK_SCROLL_OFFSET
				window.scrollTo({ top, behavior: 'smooth' })
			},
			{ defer: true },
		),
	)
	const hands = createMemo(() => buildEventHands(props.results))

	/** A day picked in the URL, else the latest week — the table as specced. */
	const requestedDate = () => (isValidDate(params.date) ? params.date : null)
	const shown = createMemo(() => {
		const date = requestedDate()
		return date ? handsOnDate(hands(), date) : latestWeekHands(hands())
	})
	const winnerKey = createMemo(() => {
		const top = shown()[0]
		if (!top?.hand) return null
		// A lone High Card doesn't "win" anything.
		if (top.hand.type === 'highCard') return null
		return `${top.event}#${top.eventNumber}`
	})

	// The result days either side of what's on show, for stepping through
	// them. From the latest week, "older" is the last day before that week.
	const allDates = createMemo(() => resultDates(hands()))
	const olderDate = createMemo(() => {
		const date = requestedDate()
		const latest = allDates()[0]
		const from = date ?? (latest ? weekStartOf(latest) : null)
		if (!from) return undefined
		return allDates().find((d) => d < from)
	})
	const newerDate = createMemo(() => {
		const date = requestedDate()
		if (!date) return undefined
		return [...allDates()].reverse().find((d) => d > date)
	})

	const weekTitle = createMemo(() => {
		const date = requestedDate()
		if (!date) return "This Week's Best Hands"
		return `Best Hands · ${formatDate(new Date(`${date}T00:00:00`))}`
	})

	/**
	 * Every event's best hand, one row per hand type in the club's order. X of a
	 * Kind only appears once it has happened, and each X gets its own row: a
	 * 6 of a Kind is a different feat from a 7.
	 */
	const historic = createMemo((): HistoricRow[] => {
		const byType = new Map<HandType, EventHand[]>()
		for (const entry of hands().values()) {
			if (!entry.hand || entry.hand.type === 'highCard') continue
			const list = byType.get(entry.hand.type) ?? []
			list.push(entry)
			byType.set(entry.hand.type, list)
		}
		const byScore = (a: EventHand, b: EventHand) =>
			(b.hand?.score ?? 0) - (a.hand?.score ?? 0)

		const rows: HistoricRow[] = []
		for (const type of CELEBRATION_HANDS) {
			const info = HAND_INFO[type]
			const entries = (byType.get(type) ?? []).sort(byScore)
			if (type !== 'xOfAKind') {
				rows.push({ key: type, ...info, entries })
				continue
			}
			const byX = new Map<number, EventHand[]>()
			for (const entry of entries) {
				const x = entry.hand?.cards.length ?? 0
				byX.set(x, [...(byX.get(x) ?? []), entry])
			}
			for (const x of [...byX.keys()].sort((a, b) => b - a)) {
				rows.push({
					key: `${type}-${x}`,
					name: `${x} of a Kind`,
					multiplierLabel: `×${X_OF_A_KIND_BASE_MULTIPLIER + x / 10}`,
					description: `${x} members finishing on the same second.`,
					entries: byX.get(x) ?? [],
				})
			}
		}
		return rows
	})

	return (
		<div class={styles.page}>
			<FieldBlock title="Scoop Bus Poker" signType="purple">
				<p class={styles.intro}>
					Every result is a card. The <strong>seconds</strong> are its value,
					the <strong>minutes</strong> its suit, and finishing{' '}
					<strong>positions</strong> make the straights. Each parkrun is dealt
					one hand: the best it can make from the members who ran.
				</p>
			</FieldBlock>

			<div ref={weekRef}>
				<DirtBlock title={weekTitle()}>
					<Show
						when={shown().length > 0}
						fallback={
							<p>
								{requestedDate()
									? 'No Scoop Bus results that day.'
									: 'No results to deal from yet.'}
							</p>
						}
					>
						<div
							class={styles.eventGrid}
							style={{ '--block-min': `${EVENT_BLOCK_MIN_WIDTH}px` }}
						>
							<For each={shown()}>
								{(entry) => (
									<EventHandBlock
										entry={entry}
										winner={
											`${entry.event}#${entry.eventNumber}` === winnerKey()
										}
									/>
								)}
							</For>
						</div>
					</Show>
					<Show when={olderDate() || newerDate()}>
						<div class={styles.weekNav}>
							<Show when={olderDate()} fallback={<span />}>
								{(date) => (
									<A href={pokerRoute(date())} class={styles.weekLink} noScroll>
										← {formatDate(new Date(`${date()}T00:00:00`))}
									</A>
								)}
							</Show>
							<Show when={newerDate()} fallback={<span />}>
								{(date) => (
									<A href={pokerRoute(date())} class={styles.weekLink} noScroll>
										{formatDate(new Date(`${date()}T00:00:00`))} →
									</A>
								)}
							</Show>
						</div>
					</Show>
				</DirtBlock>
			</div>

			<DirtBlock title="Historic Best Hands">
				<div class={styles.historicList}>
					<For each={historic()}>{(row) => <HistoricHandRow row={row} />}</For>
				</div>
			</DirtBlock>

			<BackSignButton />
		</div>
	)
}

const styles = {
	page: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '1200px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2.5rem',
		pb: '3rem',
	}),
	intro: css({
		maxWidth: '40rem',
		m: '0 auto',
		textAlign: 'center',
		lineHeight: 1.5,
	}),

	eventGrid: css({
		display: 'grid',
		gridTemplateColumns:
			'repeat(auto-fit, minmax(min(100%, var(--block-min)), 1fr))',
		gap: '1rem',
		maxWidth: 'calc(var(--block-min) * 3 + 2rem)',
		m: '0 auto',
	}),
	eventBlock: cva({
		base: {
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			gap: '0.35rem',
			p: '1.25rem 1rem 1rem',
			background: 'var(--overlay-black-10)',
			border: '2px solid var(--overlay-black-20)',
			borderRadius: '6px',
			cornerShape: 'notch',
		},
		variants: {
			winner: {
				true: {
					background: 'var(--overlay-white-10)',
					borderColor: 'var(--gold)',
					boxShadow: '0 0 0 2px var(--overlay-black-20)',
				},
			},
		},
	}),
	winnerBadge: css({
		position: 'absolute',
		top: '-0.9rem',
		left: '50%',
		transform: 'translateX(-50%)',
		background: 'var(--gold)',
		color: 'var(--color-black)',
		fontWeight: 'bold',
		fontSize: '0.75rem',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		p: '0.15rem 0.6rem',
		border: '2px solid var(--color-black)',
		borderRadius: '4px',
		cornerShape: 'notch',
		whiteSpace: 'nowrap',
	}),
	eventTitle: css({
		fontSize: '1.3rem',
		fontWeight: 'bold',
		m: 0,
	}),
	eventLink: css({
		color: 'inherit',
		textDecoration: 'none',
		fontWeight: 'bold',
		_hover: { textDecoration: 'underline' },
	}),
	eventNumber: css({
		opacity: 0.7,
		fontWeight: 'normal',
	}),
	eventDate: css({
		fontSize: '0.85rem',
		opacity: 0.75,
	}),
	handName: css({
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '1.8rem',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		mt: '0.25rem',
	}),
	highCard: css({
		opacity: 0.6,
	}),
	cardRow: css({
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: `${CARD_GAP}px`,
		my: '0.5rem',
	}),
	score: css({
		fontSize: '1rem',
		cursor: 'help',
	}),

	weekNav: css({
		display: 'flex',
		justifyContent: 'space-between',
		gap: '1rem',
		mt: '1.25rem',
		fontSize: '0.9rem',
	}),
	weekLink: css({
		color: 'inherit',
		fontWeight: 'bold',
		textDecoration: 'none',
		background: 'var(--overlay-black-15)',
		border: '2px solid var(--color-black)',
		borderRadius: '4px',
		cornerShape: 'notch',
		p: '2px 10px',
		_hover: { background: 'var(--overlay-black-30)' },
	}),
	historicList: css({
		display: 'flex',
		flexDirection: 'column',
		textAlign: 'left',
	}),
	historicRow: cva({
		base: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.25rem',
			padding: '0.75rem 0.25rem',
			borderBottom: '1px solid var(--overlay-black-10)',
			_last: { borderBottom: 'none' },
		},
		variants: {
			achieved: {
				false: { opacity: 0.45 },
			},
		},
	}),
	historicHeader: css({
		display: 'flex',
		alignItems: 'baseline',
		gap: '0.5rem',
	}),
	historicName: css({
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '1.5rem',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
	}),
	historicMultiplier: css({
		fontSize: '0.85rem',
		fontWeight: 'bold',
		opacity: 0.7,
	}),
	historicDescription: css({
		fontSize: '0.9rem',
		opacity: 0.85,
	}),
	occurrence: css({
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: '0.25rem 0.75rem',
		fontSize: '0.9rem',
		mt: '0.25rem',
	}),
	occurrenceCards: css({
		display: 'inline-flex',
		gap: '2px',
		fontSize: '0.85rem',
	}),
	occurrenceScore: css({
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '1.1rem',
		opacity: 0.8,
		cursor: 'help',
	}),
	notYet: css({
		fontSize: '0.9rem',
		fontStyle: 'italic',
	}),
	moreButton: css({
		alignSelf: 'flex-start',
		border: 'none',
		background: 'transparent',
		padding: 0,
		margin: 0,
		fontWeight: 'bold',
		textDecoration: 'underline',
		cursor: 'pointer',
		font: 'inherit',
		fontSize: '0.85rem',
	}),
}
