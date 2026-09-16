import { BackSignButton } from '@/components/BackSignButton'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { Tooltip } from '@/components/ui/Tooltip'
import { type RunnerName, runners as runnerSignals } from '@/data/runners'
import {
	type SwedishParkrun,
	groupByCity,
	isActive,
	swedishParkrunCard,
	titleNamesParkrun,
} from '@/data/swedishParkruns'
import type { RaceItem, RunResultItem, Runner } from '@/utils/api'
import { getEventsInCountry } from '@/utils/events'
import { getRunnerKeyFromRouteName } from '@/utils/memberRoute'
import { formatDate } from '@/utils/misc'
import { A, useParams } from '@solidjs/router'
import { css, cva } from '@style/css'
import { For, Show, createMemo, createSignal } from 'solid-js'
import { NotFoundPage } from './NotFoundPage'

interface SwedenPageProps {
	results: RunResultItem[]
	runners: Runner[]
	races: RaceItem[]
}

/** One visit to a Swedish parkrun, for the row that parkrun owns. */
interface Visit {
	date: string
	/** The parkrun's own event number. Absent when this is a stand-in. */
	eventNumber?: number
	/**
	 * Set when the visit was a club event on a closed parkrun's course rather
	 * than the parkrun itself — the title it was counted from.
	 */
	standIn?: string
}

function SwedenRow(props: { parkrun: SwedishParkrun; visits: Visit[] }) {
	const [expanded, setExpanded] = createSignal(false)
	const run = () => props.visits.length > 0
	const first = () => props.visits[0]
	const rest = () => props.visits.slice(1)

	return (
		<div class={styles.row({ run: run() })}>
			<div class={styles.mark}>{run() ? '✓' : ''}</div>
			<div class={styles.content}>
				<div>
					<A href={`/event/${props.parkrun.eventId}`} class={styles.event}>
						{props.parkrun.name}
					</A>
					<Show when={first()?.eventNumber !== undefined}>
						<span class={styles.eventNumber}> #{first().eventNumber}</span>
					</Show>
					<Show when={first()?.standIn}>
						<span class={styles.asterisk}>*</span>
					</Show>
					<Show when={!isActive(props.parkrun)}>
						<Tooltip content="This parkrun has closed">
							<span class={styles.info} aria-label="This parkrun has closed">
								i
							</span>
						</Tooltip>
					</Show>
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
				<Show
					when={run()}
					fallback={<span class={styles.notYet}>Not yet</span>}
				>
					<div class={styles.meta}>
						<Show when={first().standIn}>{(title) => <>{title()} · </>}</Show>
						{formatDate(new Date(`${first().date}T00:00:00`))}
					</div>
				</Show>

				<Show when={expanded()}>
					<For each={rest()}>
						{(visit) => (
							<div class={styles.meta}>
								<Show
									when={visit.standIn}
									fallback={<>#{visit.eventNumber} · </>}
								>
									{(title) => (
										<>
											{title()}
											<span class={styles.asterisk}>*</span> ·{' '}
										</>
									)}
								</Show>
								{formatDate(new Date(`${visit.date}T00:00:00`))}
							</div>
						)}
					</For>
				</Show>
			</div>
		</div>
	)
}

/**
 * Svenskspringare — every parkrun in Sweden, one row each, in Swedish
 * alphabetical order by name. Unlike the Alphabet card this one can't be
 * completed twice over: there is a fixed set of parkruns in the country and
 * running Haga for the twentieth time doesn't get you any closer to Skatås.
 * So the score is simply how many of them have been run.
 */
export function SwedenPage(props: SwedenPageProps) {
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

	// The card, topped up with any Swedish event the club has run that the
	// canonical list doesn't name yet.
	const card = createMemo(() =>
		swedishParkrunCard(
			getEventsInCountry('SE').map((event) => ({
				eventId: event.eventId,
				name: event.name,
			})),
		),
	)

	/** eventId → every visit this runner has made to it, earliest first. */
	const visitsByEvent = createMemo(() => {
		const byEvent = new Map<string, Visit[]>()
		for (const result of runnerResults()) {
			const visits = byEvent.get(result.event)
			const visit = { date: result.date, eventNumber: result.eventNumber }
			if (visits) visits.push(visit)
			else byEvent.set(result.event, [visit])
		}
		for (const visits of byEvent.values()) {
			visits.sort((a, b) => a.date.localeCompare(b.date))
		}
		return byEvent
	})

	/**
	 * The club events this runner turned out for, earliest first.
	 *
	 * An attendee is named by their runner key — `josh` — not their parkrun id,
	 * which is what the rest of this page matches on. Ones still to come are
	 * left out: signing up for a trip isn't the same as having been on it.
	 */
	const attendedRaces = createMemo(() => {
		const today = new Date()
		const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
		return props.races
			.filter(
				(race) =>
					race.date <= todayKey &&
					race.attendees.some((a) => a.runnerId === runnerKey()),
			)
			.sort((a, b) => a.date.localeCompare(b.date))
	})

	/**
	 * Every parkrun on the card, with this runner's visits to it.
	 *
	 * A closed parkrun still gets its row — the (i) beside it says why it can't
	 * be run — and a club event whose title names it stands in for the parkrun
	 * itself, since that course is the only way left to tick it off. Those come
	 * in asterisked, and only for the closed ones: on a parkrun still going the
	 * answer is to go and run it.
	 */
	const rows = createMemo(() =>
		card().map((parkrun) => {
			const visits = [...(visitsByEvent().get(parkrun.eventId) ?? [])]
			if (!isActive(parkrun)) {
				for (const race of attendedRaces()) {
					if (!titleNamesParkrun(race.name, parkrun)) continue
					visits.push({ date: race.date, standIn: race.name })
				}
				visits.sort((a, b) => a.date.localeCompare(b.date))
			}
			return { parkrun, visits }
		}),
	)

	/** Whether anything on this card was counted from a stand-in event. */
	const hasStandIn = createMemo(() =>
		rows().some((row) => row.visits.some((visit) => visit.standIn)),
	)

	/** The rows again, under the city each one is in. */
	const cities = createMemo(() => {
		const visits = new Map(
			rows().map((row) => [row.parkrun.eventId, row.visits]),
		)
		return groupByCity(rows().map((row) => row.parkrun)).map((group) => {
			const cityRows = group.parkruns.map((parkrun) => ({
				parkrun,
				visits: visits.get(parkrun.eventId) ?? [],
			}))
			return {
				city: group.city,
				rows: cityRows,
				collected: cityRows.filter((row) => row.visits.length > 0).length,
			}
		})
	})

	const collected = createMemo(
		() => rows().filter((row) => row.visits.length > 0).length,
	)
	const total = createMemo(() => rows().length)
	const complete = createMemo(() => total() > 0 && collected() === total())

	/**
	 * The run that finished the set — the earliest visit to whichever parkrun
	 * was left until last, which is the date the challenge was actually done.
	 */
	const completedOn = createMemo(() => {
		if (!complete()) return null
		return rows().reduce(
			(latest, row) =>
				row.visits[0].date > latest ? row.visits[0].date : latest,
			'',
		)
	})

	return (
		<Show when={runnerData()} fallback={<NotFoundPage />}>
			{(runner) => (
				<div class={styles.container}>
					<DirtBlock title={`${runner().name}'s Svenskspringare`}>
						<div class={styles.summary}>
							<Show
								when={completedOn()}
								fallback={
									<>
										<div class={styles.scoreValue}>
											{collected()}
											<span class={styles.scoreTotal}>/{total()}</span>
										</div>
										<div class={styles.subtle}>
											Swedish parkruns run · {total() - collected()} to go
										</div>
									</>
								}
							>
								{(date) => (
									<>
										<div class={styles.status}>
											🎉 Completed on{' '}
											<strong>
												{formatDate(new Date(`${date()}T00:00:00`))}
											</strong>
										</div>
										<div class={styles.subtle}>
											All {total()} parkruns in Sweden!
										</div>
									</>
								)}
							</Show>
						</div>

						<div class={styles.grid}>
							<For each={cities()}>
								{(group) => (
									<div class={styles.city}>
										<h3 class={styles.cityName}>
											<span>{group.city}</span>
											<span class={styles.cityScore}>
												{group.collected}/{group.rows.length}
											</span>
										</h3>
										<For each={group.rows}>
											{(row) => (
												<SwedenRow parkrun={row.parkrun} visits={row.visits} />
											)}
										</For>
									</div>
								)}
							</For>
						</div>

						<Show when={hasStandIn()}>
							<p class={styles.footnote}>
								<span class={styles.asterisk}>*</span> Counted from a club event
								on that course. The parkrun itself has closed, so there is no
								longer a parkrun result to be had there.
							</p>
						</Show>
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
	subtle: css({
		fontSize: '0.9rem',
		opacity: 0.8,
	}),
	grid: css({
		display: 'flex',
		flexDirection: 'column',
		textAlign: 'left',
		gap: '1.25rem',
	}),
	city: css({
		display: 'flex',
		flexDirection: 'column',
	}),
	cityName: css({
		display: 'flex',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		gap: '0.75rem',
		fontSize: '1.1rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		opacity: 0.75,
		pb: '0.25rem',
		borderBottom: '2px solid var(--overlay-black-10)',
	}),
	/** The city's own tally, held to the right of its name on the same line. */
	cityScore: css({
		flexShrink: 0,
		fontSize: '0.9rem',
		fontWeight: 'normal',
		letterSpacing: 'normal',
		fontVariantNumeric: 'tabular-nums',
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
			run: {
				false: {
					opacity: 0.45,
				},
			},
		},
	}),
	mark: css({
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
	/** The (i) beside a closed parkrun, sized to sit in the line of text. */
	info: css({
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		ml: '0.4rem',
		width: '14px',
		height: '14px',
		borderRadius: '50%',
		border: '1px solid currentColor',
		fontSize: '0.65rem',
		fontStyle: 'italic',
		fontWeight: 'bold',
		lineHeight: 1,
		opacity: 0.7,
		cursor: 'help',
		verticalAlign: 'middle',
	}),
	asterisk: css({
		fontWeight: 'bold',
	}),
	footnote: css({
		mt: '1.25rem',
		fontSize: '0.8rem',
		fontStyle: 'italic',
		opacity: 0.8,
		textAlign: 'left',
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
