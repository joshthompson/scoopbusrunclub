import { BackSignButton } from '@/components/BackSignButton'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { type RunnerName, runners as runnerSignals } from '@/data/runners'
import type { RunResultItem, Runner } from '@/utils/api'
import { computeBingoProgress } from '@/utils/bingo'
import { getRunnerKeyFromRouteName } from '@/utils/memberRoute'
import { formatDate } from '@/utils/misc'
import { POSITION_SLOTS, positionSlot } from '@/utils/positionBingo'
import { A, useParams } from '@solidjs/router'
import { css, cva } from '@style/css'
import { For, Show, createMemo, createSignal } from 'solid-js'
import { NotFoundPage } from './NotFoundPage'

interface PositionBingoPageProps {
	results: RunResultItem[]
	runners: Runner[]
}

function BingoRow(props: { slot: number; occurrences: RunResultItem[] }) {
	const [expanded, setExpanded] = createSignal(false)
	const achieved = () => props.occurrences.length > 0
	const first = () => props.occurrences[0]
	const rest = () => props.occurrences.slice(1)

	return (
		<div class={styles.row({ achieved: achieved() })}>
			<div class={styles.slot}>{String(props.slot).padStart(2, '0')}</div>
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
						<strong>#{first().position}</strong>
						{' - '}
						{formatDate(new Date(`${first().date}T00:00:00`))}
					</div>

					<Show when={expanded()}>
						<For each={rest()}>
							{(occurrence) => (
								<div class={styles.meta}>
									<strong>#{occurrence.position}</strong> at{' '}
									<A href={`/event/${occurrence.event}`} class={styles.event}>
										{occurrence.eventName}
									</A>
									<span class={styles.eventNumber}>
										{' '}
										#{occurrence.eventNumber}
									</span>{' '}
									· {formatDate(new Date(`${occurrence.date}T00:00:00`))}
								</div>
							)}
						</For>
					</Show>
				</Show>
			</div>
		</div>
	)
}

export function PositionBingoPage(props: PositionBingoPageProps) {
	const params = useParams<{ name: string }>()
	const runnerKey = createMemo(
		() => getRunnerKeyFromRouteName(params.name) ?? '',
	)
	const runnerSignal = createMemo(
		() => runnerSignals[runnerKey() as RunnerName],
	)
	const runnerData = createMemo(() => runnerSignal()?.[0]())
	const runnerId = createMemo(() => runnerData()?.id ?? '')

	// Only results with a recorded finishing position fill a slot.
	const runnerResults = createMemo(() =>
		props.results.filter(
			(result) =>
				result.parkrunId === runnerId() && positionSlot(result.position) >= 0,
		),
	)

	// slot (0..99) → occurrences, earliest first (the first one is "first achieved").
	const occurrencesBySlot = createMemo(() => {
		const map = new Map<number, RunResultItem[]>()
		for (const result of runnerResults()) {
			const slot = positionSlot(result.position)
			const list = map.get(slot)
			if (list) list.push(result)
			else map.set(slot, [result])
		}
		for (const list of map.values()) {
			list.sort((a, b) => a.date.localeCompare(b.date))
		}
		return map
	})

	const runs = createMemo(() => runnerResults().length)
	const progress = createMemo(() =>
		computeBingoProgress(
			runnerResults().map((result) => ({
				date: result.date,
				slot: positionSlot(result.position),
			})),
			POSITION_SLOTS,
		),
	)
	// Positions collected toward the next (not-yet-complete) card.
	const score = createMemo(() => progress().nextProgress)

	const slots = Array.from({ length: POSITION_SLOTS }, (_, i) => i)

	return (
		<Show when={runnerData()} fallback={<NotFoundPage />}>
			{(runner) => (
				<div class={styles.container}>
					<DirtBlock title={`${runner().name}'s Position Bingo`}>
						<div class={styles.summary}>
							<Show
								when={progress().completions > 0}
								fallback={
									<>
										<div class={styles.scoreValue}>
											{score()}
											<span class={styles.scoreTotal}>/{POSITION_SLOTS}</span>
										</div>
										<div class={styles.subtle}>
											{runner().name} · collected over {runs()} parkruns
										</div>
									</>
								}
							>
								<div class={styles.completions}>
									<For each={progress().completionsList}>
										{(lap, i) => (
											<div class={styles.status}>
												{i() === 0 ? 'Completed' : 'Completed again'} on{' '}
												<strong>
													{formatDate(new Date(`${lap.date}T00:00:00`))}
												</strong>{' '}
												in {lap.totalRuns} parkruns
											</div>
										)}
									</For>
								</div>
								<div class={styles.subtle}>
									Next completion progress: <strong>{score()}</strong>/
									{POSITION_SLOTS}!
								</div>
							</Show>
						</div>

						<div class={styles.grid}>
							<For each={slots}>
								{(slot) => (
									<BingoRow
										slot={slot}
										occurrences={occurrencesBySlot().get(slot) ?? []}
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
	// Stretch to the block width so the sentence wraps inside the centred
	// column rather than overflowing it on narrow screens.
	note: css({
		alignSelf: 'stretch',
		textAlign: 'center',
		fontSize: '0.9rem',
		opacity: 0.8,
		mt: '0.25rem',
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
	slot: css({
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
