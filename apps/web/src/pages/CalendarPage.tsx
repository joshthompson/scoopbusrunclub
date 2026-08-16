import { BackSignButton } from '@/components/BackSignButton'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { FieldBlock } from '@/components/ui/FieldBlock'
import type {
	GuestResultItem,
	RaceItem,
	RunResultItem,
	Runner,
	VolunteerItem,
} from '@/utils/api'
import {
	type CalendarDay,
	type CalendarEntry,
	WEEKDAY_LABELS,
	buildCalendarMonth,
	formatMonthTitle,
	indexCalendarEntries,
	parseISODate,
	parseMonthKey,
	toMonthKey,
	upcomingCalendarDays,
} from '@/utils/calendar'
import { A, useSearchParams } from '@solidjs/router'
import { css, cva } from '@style/css'
import { For, Show, createMemo } from 'solid-js'

interface CalendarPageProps {
	results: RunResultItem[]
	volunteers: VolunteerItem[]
	guestResults: GuestResultItem[]
	races: RaceItem[]
	runners: Runner[]
}

/** "Josh, Keith and 3 more" — cell space is tight, so cap the visible names. */
function summarisePeople(people: string[], limit = 3): string {
	if (people.length === 0) return ''
	if (people.length <= limit) {
		if (people.length === 1) return people[0]
		return `${people.slice(0, -1).join(', ')} and ${people[people.length - 1]}`
	}
	return `${people.slice(0, limit).join(', ')} and ${people.length - limit} more`
}

function entryDetail(entry: CalendarEntry): string {
	const parts: string[] = []
	if (entry.people.length > 0) parts.push(summarisePeople(entry.people))
	if (entry.volunteers.length > 0)
		parts.push(`${summarisePeople(entry.volunteers)} volunteered`)
	return parts.join(' · ')
}

/** Everyone involved, for the entry's hover title. */
function entryTooltip(entry: CalendarEntry): string {
	const parts: string[] = [entry.name]
	if (entry.people.length > 0) parts.push(entry.people.join(', '))
	if (entry.volunteers.length > 0)
		parts.push(`Volunteered: ${entry.volunteers.join(', ')}`)
	return parts.join('\n')
}

function Entry(props: { entry: CalendarEntry }) {
	const detail = () => entryDetail(props.entry)

	const body = (
		<>
			<span class={styles.entryTitle}>
				<span class={styles.entryEmoji}>{props.entry.emoji}</span>
				{props.entry.name}
				<Show when={props.entry.people.length > 1}>
					<span class={styles.entryCount}>{props.entry.people.length}</span>
				</Show>
			</span>
			<Show when={detail()}>
				<span class={styles.entryDetail}>{detail()}</span>
			</Show>
		</>
	)

	return (
		<Show
			when={props.entry.href}
			fallback={
				<Show
					when={props.entry.url}
					fallback={
						<span
							class={styles.entry({ kind: props.entry.kind })}
							title={entryTooltip(props.entry)}
						>
							{body}
						</span>
					}
				>
					{(url) => (
						<a
							href={url()}
							target="_blank"
							rel="noreferrer"
							class={styles.entry({ kind: props.entry.kind })}
							title={entryTooltip(props.entry)}
						>
							{body}
						</a>
					)}
				</Show>
			}
		>
			{(href) => (
				<A
					href={href()}
					class={styles.entry({ kind: props.entry.kind })}
					title={entryTooltip(props.entry)}
				>
					{body}
				</A>
			)}
		</Show>
	)
}

function DayCell(props: { day: CalendarDay }) {
	return (
		<div
			class={styles.day({
				inMonth: props.day.inMonth,
				today: props.day.isToday,
			})}
		>
			<div class={styles.dayHeader}>
				<span class={styles.dateBadge}>
					{props.day.dayOfMonth}
					<Show when={props.day.isToday}>
						<span> - Today</span>
					</Show>
				</span>
				<Show when={props.day.inMonth && props.day.specialName}>
					{(name) => (
						<span class={styles.special} title={name()}>
							✨ {name()}
						</span>
					)}
				</Show>
			</div>
			<div class={styles.entries}>
				<For each={props.day.entries}>{(entry) => <Entry entry={entry} />}</For>
			</div>
		</div>
	)
}

/**
 * A month at a time of everything the club did — and is going to do: parkruns,
 * races, Track and Food, and birthdays. The month lives in the ?month= search
 * param so a particular month can be linked to and the back button works.
 */
export function CalendarPage(props: CalendarPageProps) {
	const [searchParams, setSearchParams] = useSearchParams<{ month?: string }>()

	const current = createMemo(() => {
		const parsed = parseMonthKey(searchParams.month)
		if (parsed) return parsed
		const now = new Date()
		return { year: now.getFullYear(), month: now.getMonth() }
	})

	const entriesByDate = createMemo(() =>
		indexCalendarEntries({
			results: props.results,
			volunteers: props.volunteers,
			guestResults: props.guestResults,
			races: props.races,
			runners: props.runners,
		}),
	)

	const weeks = createMemo(() =>
		buildCalendarMonth(current().year, current().month, entriesByDate()),
	)

	/** Days of this month that have something on them — the mobile agenda. */
	const agenda = createMemo(() =>
		weeks()
			.flat()
			.filter((day) => day.inMonth && day.entries.length > 0),
	)

	const title = () => formatMonthTitle(current().year, current().month)

	const isCurrentMonth = () => {
		const now = new Date()
		return (
			current().year === now.getFullYear() && current().month === now.getMonth()
		)
	}

	const goToMonth = (offset: number) => {
		const target = new Date(current().year, current().month + offset, 1)
		setSearchParams({
			month: toMonthKey(target.getFullYear(), target.getMonth()),
		})
	}

	const goToToday = () => {
		const now = new Date()
		setSearchParams({ month: toMonthKey(now.getFullYear(), now.getMonth()) })
	}

	return (
		<div class={styles.container}>
			<FieldBlock title="Calendar" signType="purple">
				<div class={styles.nav}>
					<button
						type="button"
						class={styles.navButton}
						onClick={() => goToMonth(-1)}
						aria-label="Previous month"
					>
						‹
					</button>
					<h2 class={styles.monthTitle}>{title()}</h2>
					<button
						type="button"
						class={styles.navButton}
						onClick={() => goToMonth(1)}
						aria-label="Next month"
					>
						›
					</button>
				</div>

				<div class={styles.todayRow}>
					<Show when={!isCurrentMonth()}>
						<button
							type="button"
							class={styles.todayButton}
							onClick={goToToday}
						>
							Jump to this month
						</button>
					</Show>
				</div>

				{/* Desktop / tablet: the full month grid */}
				<div class={styles.gridWrapper}>
					<div class={styles.weekdays}>
						<For each={WEEKDAY_LABELS}>
							{(label) => <div class={styles.weekday}>{label}</div>}
						</For>
					</div>
					<div class={styles.grid}>
						<For each={weeks()}>
							{(week) => (
								<For each={week}>{(day) => <DayCell day={day} />}</For>
							)}
						</For>
					</div>
				</div>

				{/* Narrow screens: the same month as a list of the days that matter */}
				<div class={styles.agenda}>
					<For each={agenda()}>
						{(day) => (
							<div class={styles.agendaDay({ today: day.isToday })}>
								<div class={styles.agendaDate}>
									<span class={styles.dateBadge}>
										{parseISODate(day.date).toLocaleDateString('en-GB', {
											weekday: 'short',
											day: 'numeric',
											month: 'short',
										})}
										<Show when={day.isToday}>
											<span> - Today</span>
										</Show>
									</span>
								</div>
								<div class={styles.entries}>
									<For each={day.entries}>
										{(entry) => <Entry entry={entry} />}
									</For>
								</div>
							</div>
						)}
					</For>
					<Show when={agenda().length === 0}>
						<p class={styles.empty}>Nothing on the calendar this month.</p>
					</Show>
				</div>

				<div class={styles.legend}>
					<span class={styles.legendItem}>🏃 parkrun</span>
					<span class={styles.legendItem}>🔥 Major race</span>
					<span class={styles.legendItem}>🏅 Race</span>
					<span class={styles.legendItem}>🏟️ Track and Food</span>
					<span class={styles.legendItem}>🎂 Birthday</span>
					<span class={styles.legendItem}>🎉 Milestone</span>
					<span class={styles.legendItem}>🎯 Milestone due</span>
				</div>
			</FieldBlock>

			<DirtBlock title="Upcoming">
				<UpcomingList entriesByDate={entriesByDate()} />
			</DirtBlock>

			<BackSignButton class={styles.backSign} />
		</div>
	)
}

/** The next few things on the calendar, whatever month they fall in. */
function UpcomingList(props: { entriesByDate: Map<string, CalendarEntry[]> }) {
	const upcoming = createMemo(() => upcomingCalendarDays(props.entriesByDate))

	return (
		<Show
			when={upcoming().length > 0}
			fallback={<p class={styles.empty}>Nothing coming up just yet.</p>}
		>
			<div class={styles.upcoming}>
				<For each={upcoming()}>
					{(day) => (
						<div class={styles.upcomingDay}>
							<div class={styles.agendaDate}>
								{parseISODate(day.date).toLocaleDateString('en-GB', {
									weekday: 'short',
									day: 'numeric',
									month: 'short',
								})}
							</div>
							<div class={styles.entries}>
								<For each={day.entries}>
									{(entry) => <Entry entry={entry} />}
								</For>
							</div>
						</div>
					)}
				</For>
			</div>
		</Show>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '1100px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	nav: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '1rem',
	}),
	navButton: css({
		width: '2.5rem',
		height: '2.5rem',
		flexShrink: 0,
		border: '3px double currentColor',
		background: 'transparent',
		cursor: 'pointer',
		fontSize: '1.5rem',
		lineHeight: 1,
		fontWeight: 'bold',
		borderRadius: '4px',
		cornerShape: 'notch',
		_hover: {
			background: 'var(--overlay-white-20)',
		},
	}),
	monthTitle: css({
		fontSize: '1.5rem',
		fontWeight: 'bold',
		textAlign: 'center',
		minWidth: '11rem',
	}),
	todayRow: css({
		display: 'flex',
		justifyContent: 'center',
		minHeight: '1.75rem',
		mt: '0.25rem',
	}),
	todayButton: css({
		border: 'none',
		background: 'transparent',
		cursor: 'pointer',
		fontSize: '0.8rem',
		textDecoration: 'underline',
		fontWeight: 'bold',
		opacity: 0.8,
		_hover: { opacity: 1 },
	}),
	gridWrapper: css({
		mt: '0.5rem',
		'@media (max-width: 768px)': {
			display: 'none',
		},
	}),
	weekdays: css({
		display: 'grid',
		gridTemplateColumns: 'repeat(7, 1fr)',
		gap: '4px',
		mb: '4px',
	}),
	weekday: css({
		textAlign: 'center',
		fontSize: '0.75rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		opacity: 0.7,
	}),
	grid: css({
		display: 'grid',
		gridTemplateColumns: 'repeat(7, 1fr)',
		gap: '4px',
	}),
	day: cva({
		base: {
			minHeight: '6.5rem',
			display: 'flex',
			flexDirection: 'column',
			gap: '3px',
			padding: '4px',
			borderRadius: '4px',
			cornerShape: 'notch',
			background: 'var(--dirt-brown)',
			border: '2px solid var(--dirt-darker-brown)',
			overflow: 'hidden',
		},
		variants: {
			inMonth: {
				false: {
					background: 'var(--overlay-black-10)',
					borderColor: 'transparent',
					opacity: 0.5,
				},
			},
			today: {
				true: {
					borderColor: 'var(--color-black)',
					'--today-date-background': 'var(--dirt-dark-brown)',
				},
			},
		},
	}),
	dayHeader: css({
		display: 'flex',
		alignItems: 'baseline',
		gap: '0.25rem',
		minWidth: 0,
		justifyContent: 'space-between',
	}),
	/** The day's label — highlighted on today, in both the grid and the agenda. */
	dateBadge: css({
		fontSize: '0.85rem',
		fontWeight: 'bold',
		background: 'var(--today-date-background, transparent)',
		padding: '0 4px',
		borderRadius: '3px',
		cornerShape: 'notch',
	}),
	special: css({
		fontSize: '0.6rem',
		opacity: 0.75,
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
	}),
	entries: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '3px',
		textAlign: 'left',
		minWidth: 0,
	}),
	entry: cva({
		base: {
			display: 'flex',
			flexDirection: 'column',
			gap: '1px',
			padding: '2px 4px',
			borderRadius: '3px',
			cornerShape: 'notch',
			borderLeft: '3px solid transparent',
			background: 'var(--overlay-white-50)',
			color: 'var(--color-black)',
			textDecoration: 'none',
			fontSize: '0.7rem',
			lineHeight: 1.25,
			minWidth: 0,
			'&:is(a):hover': {
				background: 'var(--color-white)',
			},
		},
		variants: {
			kind: {
				parkrun: { borderLeftColor: 'var(--heatmap-ran)' },
				race: { borderLeftColor: 'var(--pink-rose)' },
				birthday: { borderLeftColor: 'var(--purple-heatmap)' },
				milestone: { borderLeftColor: 'var(--gold-warm)' },
			},
		},
	}),
	entryTitle: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.2rem',
		fontWeight: 'bold',
		minWidth: 0,
	}),
	entryEmoji: css({
		flexShrink: 0,
	}),
	entryCount: css({
		flexShrink: 0,
		ml: 'auto',
		padding: '2px 5px',
		borderRadius: '3px',
		cornerShape: 'notch',
		background: 'var(--overlay-black-15)',
		fontSize: '0.65rem',
		alignSelf: 'flex-start',
		mt: '2px',
	}),
	entryDetail: css({
		opacity: 0.8,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	}),
	agenda: css({
		display: 'none',
		flexDirection: 'column',
		gap: '0.75rem',
		mt: '0.5rem',
		'@media (max-width: 768px)': {
			display: 'flex',
		},
	}),
	agendaDay: cva({
		base: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.25rem',
			padding: '0.5rem',
			borderRadius: '4px',
			cornerShape: 'notch',
			background: 'var(--dirt-brown)',
			border: '2px solid var(--dirt-darker-brown)',
		},
		variants: {
			today: {
				true: {
					borderColor: 'var(--color-black)',
					'--today-date-background': 'var(--dirt-dark-brown)',
				},
			},
		},
	}),
	agendaDate: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.4rem',
		fontSize: '0.8rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		opacity: 0.85,
	}),
	upcoming: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
		textAlign: 'left',
	}),
	upcomingDay: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
	}),
	legend: css({
		display: 'flex',
		flexWrap: 'wrap',
		gap: '0.75rem',
		justifyContent: 'center',
		fontSize: '0.75rem',
		opacity: 0.85,
		mt: '0.75rem',
	}),
	legendItem: css({
		whiteSpace: 'nowrap',
	}),
	empty: css({
		fontSize: '0.85rem',
		opacity: 0.75,
		textAlign: 'center',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
