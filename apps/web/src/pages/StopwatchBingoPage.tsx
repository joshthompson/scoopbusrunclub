import { BackSignButton } from '@/components/BackSignButton'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { type RunnerName, runners as runnerSignals } from '@/data/runners'
import type { RunResultItem, Runner } from '@/utils/api'
import { getRunnerKeyFromRouteName } from '@/utils/memberRoute'
import { formatDate, parseTimeToSeconds } from '@/utils/misc'
import {
	BINGO_SLOTS,
	computeBingoProgress,
	expectedRunsRemaining,
	runsVsAverage,
} from '@/utils/stopwatchBingo'
import { A, useParams } from '@solidjs/router'
import { css, cva } from '@style/css'
import { For, Show, createMemo, createSignal } from 'solid-js'
import { NotFoundPage } from './NotFoundPage'

interface StopwatchBingoPageProps {
	results: RunResultItem[]
	runners: Runner[]
}

function BingoRow(props: { second: number; occurrences: RunResultItem[] }) {
	const [expanded, setExpanded] = createSignal(false)
	const achieved = () => props.occurrences.length > 0
	const first = () => props.occurrences[0]
	const rest = () => props.occurrences.slice(1)

	return (
		<div class={styles.row({ achieved: achieved() })}>
			<div class={styles.second}>{String(props.second).padStart(2, '0')}</div>
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
						<strong>{first().time}</strong> ·{' '}
						{formatDate(new Date(`${first().date}T00:00:00`))}
					</div>

					<Show when={expanded()}>
						<For each={rest()}>
							{(occurrence) => (
								<div class={styles.meta}>
									<strong>{occurrence.time}</strong> at{' '}
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

export function StopwatchBingoPage(props: StopwatchBingoPageProps) {
	const params = useParams<{ name: string }>()
	const runnerKey = createMemo(
		() => getRunnerKeyFromRouteName(params.name) ?? '',
	)
	const runnerSignal = createMemo(
		() => runnerSignals[runnerKey() as RunnerName],
	)
	const runnerData = createMemo(() => runnerSignal()?.[0]())
	const runnerId = createMemo(() => runnerData()?.id ?? '')

	// Only timed results contribute a finishing second.
	const runnerResults = createMemo(() =>
		props.results.filter(
			(result) =>
				result.parkrunId === runnerId() &&
				Number.isFinite(parseTimeToSeconds(result.time)),
		),
	)

	// second (0..59) → occurrences, earliest first (the first one is "first achieved").
	const occurrencesBySecond = createMemo(() => {
		const map = new Map<number, RunResultItem[]>()
		for (const result of runnerResults()) {
			const second = parseTimeToSeconds(result.time) % BINGO_SLOTS
			const list = map.get(second)
			if (list) list.push(result)
			else map.set(second, [result])
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
				second: parseTimeToSeconds(result.time) % BINGO_SLOTS,
			})),
		),
	)
	// Seconds collected toward the next (not-yet-complete) card.
	const score = createMemo(() => progress().nextProgress)
	const vsAverage = createMemo(() => runsVsAverage(runs(), score()))
	const remaining = createMemo(() => expectedRunsRemaining(score()))

	const seconds = Array.from({ length: BINGO_SLOTS }, (_, i) => i)

	return (
		<Show when={runnerData()} fallback={<NotFoundPage />}>
			{(runner) => (
				<div class={styles.container}>
					<DirtBlock title={`${runner().name}'s Stopwatch Bingo`}>
						<div class={styles.summary}>
							<Show
								when={progress().completions > 0}
								fallback={
									<>
										<div class={styles.scoreValue}>
											{score()}
											<span class={styles.scoreTotal}>/{BINGO_SLOTS}</span>
										</div>
										<div class={styles.subtle}>
											{runner().name} · collected over {runs()} parkruns
										</div>
										<div class={styles.status}>
											<Show
												when={Math.round(vsAverage()) !== 0}
												fallback={<>Right on the average pace</>}
											>
												<strong>{Math.abs(Math.round(vsAverage()))}</strong>{' '}
												parkruns {vsAverage() > 0 ? 'behind' : 'ahead of'}{' '}
												average
											</Show>
										</div>
										<div class={styles.subtle}>
											~{Math.round(remaining())} more parkruns to complete on
											average
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
									{BINGO_SLOTS}! (~{Math.round(remaining())} more runs to
									complete)
								</div>
							</Show>
						</div>

						<div class={styles.grid}>
							<For each={seconds}>
								{(second) => (
									<BingoRow
										second={second}
										occurrences={occurrencesBySecond().get(second) ?? []}
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
	second: css({
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
