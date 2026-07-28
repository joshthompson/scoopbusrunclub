import { BackSignButton } from '@/components/BackSignButton'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { type RunnerName, runners as runnerSignals } from '@/data/runners'
import { ALPHABET, ALPHABET_SLOTS, firstLetterSlot } from '@/utils/alphabet'
import type { RunResultItem, Runner } from '@/utils/api'
import { computeBingoProgress } from '@/utils/bingo'
import { getRunnerKeyFromRouteName } from '@/utils/memberRoute'
import { formatDate } from '@/utils/misc'
import { A, useParams } from '@solidjs/router'
import { css, cva } from '@style/css'
import { For, Show, createMemo, createSignal } from 'solid-js'
import { NotFoundPage } from './NotFoundPage'

interface AlphabetPageProps {
	results: RunResultItem[]
	runners: Runner[]
}

/** One distinct event (parkrun) the runner has completed for a given letter. */
interface LetterEvent {
	event: string
	eventName: string
	date: string // earliest date at this event
	eventNumber: number // event number of that first visit
}

function AlphabetRow(props: { letter: string; events: LetterEvent[] }) {
	const [expanded, setExpanded] = createSignal(false)
	const achieved = () => props.events.length > 0
	const first = () => props.events[0]
	const rest = () => props.events.slice(1)

	return (
		<div class={styles.row({ achieved: achieved() })}>
			<div class={styles.letter}>{props.letter}</div>
			<div class={styles.content}>
				<Show
					when={achieved()}
					fallback={<span class={styles.notYet}>Not yet</span>}
				>
					<div>
						<A href={`/event/${first().event}`} class={styles.event}>
							{first().eventName}
						</A>
						<span class={styles.eventNumber}> #{first().eventNumber}</span>
						<Show when={rest().length > 0}>
							{' '}
							<button
								type="button"
								class={styles.moreButton}
								onClick={() => setExpanded((v) => !v)}
							>
								+{rest().length} more
							</button>
						</Show>
					</div>
					<div class={styles.meta}>
						{formatDate(new Date(`${first().date}T00:00:00`))}
					</div>

					<Show when={expanded()}>
						<For each={rest()}>
							{(ev) => (
								<div class={styles.meta}>
									<A href={`/event/${ev.event}`} class={styles.event}>
										{ev.eventName}
									</A>
									<span class={styles.eventNumber}> #{ev.eventNumber}</span> ·{' '}
									{formatDate(new Date(`${ev.date}T00:00:00`))}
								</div>
							)}
						</For>
					</Show>
				</Show>
			</div>
		</div>
	)
}

export function AlphabetPage(props: AlphabetPageProps) {
	const params = useParams<{ name: string }>()
	const runnerKey = createMemo(
		() => getRunnerKeyFromRouteName(params.name) ?? '',
	)
	const runnerSignal = createMemo(
		() => runnerSignals[runnerKey() as RunnerName],
	)
	const runnerData = createMemo(() => runnerSignal()?.[0]())
	const runnerId = createMemo(() => runnerData()?.id ?? '')

	const runnerResults = createMemo(() =>
		props.results.filter((result) => result.parkrunId === runnerId()),
	)

	// letter slot → distinct events completed for that letter, earliest first.
	const eventsByLetter = createMemo(() => {
		const byLetter = new Map<number, Map<string, LetterEvent>>()
		for (const result of runnerResults()) {
			const slot = firstLetterSlot(result.eventName)
			if (slot < 0) continue
			let events = byLetter.get(slot)
			if (!events) {
				events = new Map()
				byLetter.set(slot, events)
			}
			const existing = events.get(result.event)
			// Keep the earliest visit to each distinct event.
			if (!existing || result.date < existing.date) {
				events.set(result.event, {
					event: result.event,
					eventName: result.eventName,
					date: result.date,
					eventNumber: result.eventNumber,
				})
			}
		}

		const sorted = new Map<number, LetterEvent[]>()
		for (const [slot, events] of byLetter) {
			sorted.set(
				slot,
				[...events.values()].sort((a, b) => a.date.localeCompare(b.date)),
			)
		}
		return sorted
	})

	const runs = createMemo(() => runnerResults().length)
	// Completion counts distinct events only — visiting Haga twice still counts
	// as one H — so feed one entry per distinct event (its first-visit date).
	const progress = createMemo(() =>
		computeBingoProgress(
			[...eventsByLetter()].flatMap(([slot, events]) =>
				events.map((ev) => ({ date: ev.date, slot })),
			),
			ALPHABET_SLOTS,
		),
	)
	// Letters collected toward the next (not-yet-complete) card.
	const score = createMemo(() => progress().nextProgress)

	return (
		<Show when={runnerData()} fallback={<NotFoundPage />}>
			{(runner) => (
				<div class={styles.container}>
					<DirtBlock title={`${runner().name}'s Alphabet`}>
						<div class={styles.summary}>
							<Show
								when={progress().completions > 0}
								fallback={
									<>
										<div class={styles.scoreValue}>
											{score()}
											<span class={styles.scoreTotal}>/{ALPHABET_SLOTS}</span>
										</div>
										<div class={styles.subtle}>
											letters collected · {runs()} parkruns
										</div>
									</>
								}
							>
								<div class={styles.completions}>
									<For each={progress().completionsList}>
										{(lap, i) => (
											<div class={styles.status}>
												{i() === 0 ? '🎉 Completed' : 'Completed again'} on{' '}
												<strong>
													{formatDate(new Date(`${lap.date}T00:00:00`))}
												</strong>
											</div>
										)}
									</For>
								</div>
								<div class={styles.subtle}>
									Next completion progress: <strong>{score()}</strong>/
									{ALPHABET_SLOTS}!
								</div>
							</Show>
						</div>

						<div class={styles.grid}>
							<For each={ALPHABET}>
								{(letter, i) => (
									<AlphabetRow
										letter={letter}
										events={eventsByLetter().get(i()) ?? []}
									/>
								)}
							</For>
						</div>
					</DirtBlock>

					<BackSignButton to={`/member/${params.name}`}>
						{`Back to ${runner().name}'s Page`}
					</BackSignButton>
				</div>
			)}
		</Show>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '1200px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '1.5rem',
	}),
	summary: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.25rem',
		mb: '1rem',
	}),
	scoreValue: css({
		fontSize: '3rem',
		fontWeight: 'bold',
		lineHeight: 1,
	}),
	scoreTotal: css({
		fontSize: '1.5rem',
		opacity: 0.6,
	}),
	status: css({
		fontSize: '1.1rem',
	}),
	completions: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.15rem',
		mb: '0.25rem',
	}),
	subtle: css({
		fontSize: '0.9rem',
		opacity: 0.8,
	}),
	grid: css({
		display: 'flex',
		flexDirection: 'column',
		textAlign: 'left',
	}),
	row: cva({
		base: {
			display: 'grid',
			gridTemplateColumns: '3rem 1fr',
			gap: '0.75rem',
			alignItems: 'center',
			minHeight: '3rem',
			padding: '0.4rem 0.25rem',
			borderBottom: '1px solid var(--overlay-black-10)',
		},
		variants: {
			achieved: {
				false: {
					opacity: 0.45,
				},
			},
		},
	}),
	letter: css({
		fontSize: '1.5rem',
		fontWeight: 'bold',
		textAlign: 'center',
	}),
	content: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.1rem',
		minWidth: 0,
	}),
	event: css({
		color: 'inherit',
		textDecoration: 'none',
		fontWeight: 'bold',
		_hover: { textDecoration: 'underline' },
	}),
	eventNumber: css({
		opacity: 0.7,
		fontSize: '0.85rem',
	}),
	meta: css({
		fontSize: '0.85rem',
		opacity: 0.85,
	}),
	notYet: css({
		fontSize: '0.9rem',
		fontStyle: 'italic',
	}),
	moreButton: css({
		border: 'none',
		background: 'transparent',
		padding: 0,
		margin: 0,
		fontWeight: 'bold',
		textDecoration: 'underline',
		cursor: 'pointer',
		font: 'inherit',
	}),
}
