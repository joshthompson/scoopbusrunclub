import { BackSignButton } from '@/components/BackSignButton'
import { Checkbox } from '@/components/ui/Checkbox'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { Tooltip } from '@/components/ui/Tooltip'
import { COUNTRY_FLAGS } from '@/data/countries'
import { LINK_PARKRUN_ID } from '@/data/link'
import { type RunnerName, runners as runnerSignals } from '@/data/runners'
import { track } from '@/utils/analytics'
import type { RunResultItem, Runner } from '@/utils/api'
import {
	type DateBingoSquare,
	LEAP_DAY,
	buildDateBingo,
} from '@/utils/dateBingo'
import { isJuniorEvent } from '@/utils/journey'
import { getRunnerKeyFromRouteName } from '@/utils/memberRoute'
import { formatDate } from '@/utils/misc'
import { toISODate } from '@shared/calendar/dates'
import type { SpecialDayOccurrence } from '@shared/calendar/special-days'
import { useParams } from '@solidjs/router'
import { css, cva } from '@style/css'
import { For, type JSX, Show, createMemo, createSignal } from 'solid-js'
import { NotFoundPage } from './NotFoundPage'

interface DateBingoPageProps {
	results: RunResultItem[]
	runners: Runner[]
}

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
]
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
/** Day numbers shown over the grid on a phone, where all 31 won't fit. */
const NARROW_DAY_LABELS = new Set([1, 5, 10, 15, 20, 25, 30])

const toDate = (date: string) => new Date(`${date}T00:00:00`)

/** "Saturday 14th November 2026" */
function formatLongDate(date: string): string {
	const d = toDate(date)
	return `${d.toLocaleString('en-GB', { weekday: 'long' })} ${formatDate(d)}`
}

/** "14 November", for a square, which is no year in particular. */
function formatSlot(slot: string): string {
	return toDate(`2024-${slot}`).toLocaleString('en-GB', {
		day: 'numeric',
		month: 'long',
	})
}

/** "New Year's Day 🌍" / "Christmas Day 🇦🇺🇮🇪🇮🇹🇳🇿🇬🇧" */
function specialLabel(special: SpecialDayOccurrence): string {
	const flags =
		special.countries === 'all'
			? '🌍'
			: special.countries.map((c) => COUNTRY_FLAGS[c] ?? c).join('')
	return `${special.name} ${flags}`
}

function SquareTooltip(props: {
	square: DateBingoSquare<RunResultItem>
	isMustMake: boolean
}): JSX.Element {
	return (
		<div class={styles.tooltip}>
			<strong>{formatSlot(props.square.slot)}</strong>
			<Show when={!props.square.isCounted}>
				<div class={styles.tooltipNote}>Not counted (29 February is off)</div>
			</Show>
			<For each={props.square.runs}>
				{(run) => (
					<div>
						{run.eventName} #{run.eventNumber} ·{' '}
						{toDate(run.date).getFullYear()}
					</div>
				)}
			</For>
			<Show when={props.square.nextSaturday}>
				{(saturday) => (
					<>
						<Show when={props.square.nextSpecial}>
							{(special) => (
								<>
									<div>Next chance: {specialLabel(special())}</div>
									<div>{formatLongDate(special().date)}</div>
									<div class={styles.tooltipNote}>
										or {formatLongDate(saturday())}
									</div>
								</>
							)}
						</Show>
						<Show when={!props.square.nextSpecial}>
							<div>Next chance: {formatLongDate(saturday())}</div>
						</Show>
						<Show when={props.isMustMake}>
							<div class={styles.tooltipNote}>
								Can't be missed for the earliest finish
							</div>
						</Show>
					</>
				)}
			</Show>
		</div>
	)
}

export function DateBingoPage(props: DateBingoPageProps) {
	const params = useParams<{ name: string }>()
	const runnerKey = createMemo(
		() => getRunnerKeyFromRouteName(params.name) ?? '',
	)
	const runnerSignal = createMemo(
		() => runnerSignals[runnerKey() as RunnerName],
	)
	const runnerData = createMemo(() => runnerSignal()?.[0]())
	// Link has no parkrun id; his hand-kept record (data/link) uses a made-up one.
	const runnerId = createMemo(() =>
		runnerKey() === 'link' ? LINK_PARKRUN_ID : (runnerData()?.id ?? ''),
	)

	const [includeLeapDay, setIncludeLeapDay] = createSignal(false)

	// Junior parkruns are on Sundays, so they'd fill any date going: 5k only.
	const runnerResults = createMemo(() =>
		props.results.filter(
			(result) =>
				result.parkrunId === runnerId() && !isJuniorEvent(result.event),
		),
	)

	const card = createMemo(() =>
		buildDateBingo(runnerResults(), {
			today: toISODate(new Date()),
			includeLeapDay: includeLeapDay(),
		}),
	)

	const percent = createMemo(() =>
		Math.floor((card().filled / card().total) * 100),
	)
	const mustMakeSquare = createMemo(() => {
		const mustMake = card().mustMake
		return mustMake ? card().squares.get(mustMake.slice(5)) : undefined
	})

	const squareFor = (month: number, day: number) =>
		card().squares.get(
			`${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
		)

	return (
		<Show when={runnerData()} fallback={<NotFoundPage />}>
			{(runner) => (
				<div class={styles.container}>
					<DirtBlock title={`${runner().name}'s Date Bingo`}>
						<div class={styles.summary}>
							<div class={styles.scoreValue}>
								{card().filled}
								<span class={styles.scoreTotal}>/{card().total}</span>
							</div>
							<div class={styles.subtle}>
								{percent()}% of the calendar · {runnerResults().length} parkruns
							</div>

							<Show
								when={card().completedOn}
								fallback={
									<div class={styles.forecast}>
										<div class={styles.status}>
											Earliest finish:{' '}
											<strong>
												{formatLongDate(card().completionDate ?? '')}
											</strong>
										</div>
										<Show when={mustMakeSquare()}>
											{(square) => (
												<div>
													Can't miss:{' '}
													<Show
														when={square().nextSpecial}
														fallback={
															<strong>
																{formatLongDate(card().mustMake ?? '')}
															</strong>
														}
													>
														{(special) => (
															<>
																<strong>{specialLabel(special())}</strong> on{' '}
																<strong>
																	{formatLongDate(special().date)}
																</strong>
																, or{' '}
																<strong>
																	{formatLongDate(card().mustMake ?? '')}
																</strong>
															</>
														)}
													</Show>
												</div>
											)}
										</Show>
										<Show when={mustMakeSquare()?.slot === LEAP_DAY}>
											<div class={styles.subtle}>
												29 February is a Saturday once every 28 years
											</div>
										</Show>
										<Show when={card().closerSpecial}>
											{(closer) => (
												<div>
													Run <strong>{specialLabel(closer().special)}</strong>{' '}
													on {formatLongDate(closer().special.date)} to finish
													by{' '}
													<strong>
														{formatLongDate(closer().completionDate)}
													</strong>
												</div>
											)}
										</Show>
										<div class={styles.subtle}>
											Counting Saturdays only. Special days can fill a square
											sooner.
										</div>
									</div>
								}
							>
								{(completedOn) => (
									<div class={styles.status}>
										Completed on{' '}
										<strong>{formatDate(toDate(completedOn()))}</strong>
									</div>
								)}
							</Show>

							<div class={styles.toggle}>
								<Checkbox
									label="Include 29 February"
									checked={includeLeapDay()}
									onChange={(event) => {
										const included = event.currentTarget.checked
										setIncludeLeapDay(included)
										track('date_bingo_leap_day_toggled', {
											is_leap_day_included: included,
										})
									}}
								/>
							</div>
						</div>

						<div class={styles.grid}>
							<span />
							<For each={DAYS}>
								{(day) => (
									<span
										class={styles.dayLabel({
											isNarrowHidden: !NARROW_DAY_LABELS.has(day),
										})}
									>
										{day}
									</span>
								)}
							</For>
							<For each={MONTHS}>
								{(month, monthIndex) => (
									<>
										<span class={styles.monthLabel}>{month}</span>
										<For each={DAYS}>
											{(day) => (
												<Show
													when={squareFor(monthIndex(), day)}
													fallback={<span />}
												>
													{(square) => {
														const isMustMake = () =>
															square().nextSaturday === card().mustMake
														return (
															<Tooltip
																class={styles.cell}
																content={
																	<SquareTooltip
																		square={square()}
																		isMustMake={isMustMake()}
																	/>
																}
															>
																<span
																	class={styles.square({
																		state:
																			square().runs.length > 0
																				? 'filled'
																				: square().isCounted
																					? 'empty'
																					: 'off',
																		isMustMake: isMustMake(),
																		hasSpecial:
																			!!square().nextSpecial &&
																			square().runs.length === 0,
																	})}
																>
																	<Show when={square().runs.length > 0}>✔</Show>
																</span>
															</Tooltip>
														)
													}}
												</Show>
											)}
										</For>
									</>
								)}
							</For>
						</div>

						<div class={styles.legend}>
							<span class={styles.legendItem}>
								<span class={styles.square({ state: 'filled' })}>✔</span> Ran
							</span>
							<span class={styles.legendItem}>
								<span
									class={styles.square({ state: 'empty', isMustMake: true })}
								/>
								Can't miss
							</span>
							<span class={styles.legendItem}>
								<span
									class={styles.square({ state: 'empty', hasSpecial: true })}
								/>
								Special day first
							</span>
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
		textAlign: 'center',
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
	forecast: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.25rem',
		mt: '0.5rem',
	}),
	subtle: css({
		fontSize: '0.9rem',
		opacity: 0.8,
	}),
	toggle: css({
		mt: '0.5rem',
	}),
	grid: css({
		display: 'grid',
		gridTemplateColumns: '2rem repeat(31, minmax(0, 1fr))',
		gap: '2px',
		width: '100%',
		maxWidth: '900px',
		mx: 'auto',
		alignItems: 'center',
		'@media (max-width: 480px)': {
			gridTemplateColumns: '1.6rem repeat(31, minmax(0, 1fr))',
			gap: '1px',
		},
	}),
	dayLabel: cva({
		base: {
			fontSize: '0.7rem',
			textAlign: 'center',
			opacity: 0.7,
			overflow: 'visible',
			whiteSpace: 'nowrap',
		},
		variants: {
			isNarrowHidden: {
				true: {
					'@media (max-width: 600px)': { visibility: 'hidden' },
				},
			},
		},
	}),
	monthLabel: css({
		fontSize: '0.8rem',
		fontWeight: 'bold',
		textAlign: 'left',
	}),
	// The Tooltip's own wrapper, as the grid cell: a grid item is a block
	// whatever its display, so only the width needs setting.
	cell: css({
		width: '100%',
		lineHeight: 0,
	}),
	square: cva({
		base: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			aspectRatio: '1',
			width: '100%',
			borderRadius: '2px',
			cornerShape: 'notch',
			fontFamily: '"Jersey 10", sans-serif',
			fontSize: 'clamp(8px, 1.6vw, 16px)',
			lineHeight: 1,
			color: 'var(--color-white)',
			cursor: 'default',
			transition: 'transform 0.1s ease, filter 0.1s ease',
			_hover: {
				transform: 'scale(1.3)',
				filter: 'brightness(1.2)',
				zIndex: 1,
			},
		},
		variants: {
			state: {
				filled: { background: 'var(--grass-dark-green)' },
				empty: { background: 'var(--overlay-black-20)' },
				off: {
					background: 'var(--overlay-black-10)',
					opacity: 0.4,
				},
			},
			isMustMake: {
				true: { boxShadow: 'inset 0 0 0 2px var(--gold-pure)' },
			},
			hasSpecial: {
				true: {
					background:
						'radial-gradient(circle, var(--gold-warm) 0 22%, var(--overlay-black-20) 26%)',
				},
			},
		},
	}),
	legend: css({
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: '1rem',
		mt: '1rem',
		fontSize: '0.85rem',
	}),
	legendItem: css({
		display: 'inline-flex',
		alignItems: 'center',
		gap: '0.4rem',
		'& > span': { width: '14px', minWidth: '14px', fontSize: '12px' },
	}),
	tooltip: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '2px',
		textAlign: 'left',
	}),
	tooltipNote: css({
		opacity: 0.75,
	}),
}
