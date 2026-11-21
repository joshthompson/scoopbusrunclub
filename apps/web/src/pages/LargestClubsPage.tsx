import { BackSignButton } from '@/components/BackSignButton'
import { LargestClubsGraph } from '@/components/LargestClubsGraph'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { Table } from '@/components/ui/Table'
import { track } from '@/utils/analytics'
import {
	RATE_WINDOW_WEEKS,
	averageWeeklyEvents,
	projectLargestClubs,
	weeksBetween,
} from '@shared/largest-clubs-rate'
import { css } from '@style/css'
import { Show, createMemo, createResource, createSignal } from 'solid-js'
import { type LargestClubSnapshot, fetchAllLargestClubs } from '../utils/api'
import { SCOOP_BUS_CLUB_NAME, largestClubMessage } from '../utils/largestClubs'

/**
 * Snapshots are weekly, but a week's scrape can be missed — at which point the
 * bracketed change spans more than a week and "this week" would mislead. So the
 * tooltip names the week actually being compared against, and says how far back
 * it is when that isn't seven days.
 */
function buildColumns(
	week: string | null,
	previousWeek: string | null,
	windowWeeks: number,
) {
	let changeInfo = 'In brackets: change since the previous snapshot'
	if (week && previousWeek) {
		const weeks = Math.round(weeksBetween(previousWeek, week))
		changeInfo =
			weeks === 1
				? `In brackets: change since ${previousWeek}`
				: `In brackets: change since ${previousWeek} — ${weeks} weeks back, the last snapshot before this one`
	}

	return [
		{ id: 'rank', title: '#', width: '3rem', sortable: true },
		{ id: 'name', title: 'Club', sortable: true },
		{ id: 'members', title: 'Members', info: changeInfo, sortable: true },
		{ id: 'runs', title: 'Runs', info: changeInfo, sortable: true },
		// The window is the same one the projection uses, so the tooltip can't
		// drift from the maths behind the column.
		{
			id: 'rate',
			title: 'Avg/week',
			info:
				windowWeeks === 1
					? 'Average over the last week'
					: `Average over the last ${windowWeeks} weeks`,
			sortable: true,
		},
	]
}

type SortKey = 'rank' | 'name' | 'members' | 'runs' | 'rate'
type SortDir = 'asc' | 'desc'

/** What a club gained since its previous snapshot. */
interface Change {
	events: number
	members: number
}

/** One club's line in the latest standings, before it becomes table cells. */
interface Standing {
	/** League position by runs — fixed, so it still reads as a placing under any sort. */
	rank: number
	name: string
	members: number
	events: number
	/** Gains since the previous snapshot, or null with nothing to compare to. */
	change: Change | null
	/** Runs per week, or null when there isn't enough history to say. */
	rate: number | null
}

/** Ascending comparison for a column; the caller applies the direction. */
function compareStandings(key: SortKey, a: Standing, b: Standing): number {
	switch (key) {
		case 'name':
			return a.name.localeCompare(b.name)
		case 'members':
			return a.members - b.members
		case 'runs':
			return a.events - b.events
		case 'rate':
			// Nulls are filtered out before this runs.
			return (a.rate ?? 0) - (b.rate ?? 0)
		default:
			// Ascending by rank is the league order: first place at the top.
			return a.rank - b.rank
	}
}

/** Club name cell — our own club stands out from the rest of the table. */
function clubCell(name: string) {
	if (name !== SCOOP_BUS_CLUB_NAME) return name
	return <strong>{name}</strong>
}

/**
 * Runs per week, to two decimal places at most.
 *
 * A club with only one snapshot has no rate yet — an em dash says that, where a
 * 0 would claim a club that has stood still.
 */
function rateCell(rate: number | null) {
	if (rate === null) return '—'
	return rate.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/**
 * What a club gained since its previous snapshot.
 *
 * Measured against the previous snapshot we actually hold rather than the date
 * exactly a week back, because a week's scrape can be missed. Null when there's
 * no earlier snapshot for the club, which is a different thing from no gain.
 */
function changeSincePrevious(
	snapshots: LargestClubSnapshot[],
	week: string,
): Change | null {
	let current: LargestClubSnapshot | undefined
	let previous: LargestClubSnapshot | undefined
	for (const snapshot of snapshots) {
		if (snapshot.week === week) {
			current = snapshot
		} else if (
			snapshot.week < week &&
			(previous === undefined || snapshot.week > previous.week)
		) {
			previous = snapshot
		}
	}
	if (current === undefined || previous === undefined) return null
	return {
		events: current.events - previous.events,
		members: current.members - previous.members,
	}
}

/** "(+15)", "(−3)" — signed, so it reads as a change and not another total. */
function changeLabel(change: number) {
	return `(${change > 0 ? '+' : '−'}${Math.abs(change).toLocaleString()})`
}

/**
 * A total with its change since the previous snapshot — "2,192 (+10)".
 *
 * A club that didn't move gets no bracket at all. Most clubs gain no members in
 * a week, and a column of "(0)" buries the few that did move under noise —
 * which is the one thing the bracket is there to show.
 */
function totalCell(total: number, change: number | null) {
	if (change === null || change === 0) return total.toLocaleString()
	return (
		<>
			{total.toLocaleString()}{' '}
			<span class={styles.change}>{changeLabel(change)}</span>
		</>
	)
}

/**
 * Scoop Bus Run Club's race to be the largest parkrun club in Sweden: the
 * weekly snapshots as a graph, plus the latest standings in full.
 */
export function LargestClubsPage() {
	const [snapshots] = createResource(fetchAllLargestClubs)

	/**
	 * The longest rate window the snapshots can fill: the weeks between the first
	 * snapshot and the latest. It grows by one with every weekly snapshot.
	 */
	const maxWindowWeeks = createMemo(() => {
		const weeks = (snapshots() ?? []).map((snapshot) => snapshot.week)
		if (weeks.length === 0) return 1
		const first = weeks.reduce((a, b) => (b < a ? b : a))
		const last = weeks.reduce((a, b) => (b > a ? b : a))
		return Math.max(1, Math.round(weeksBetween(first, last)))
	})

	/** How many weeks the reader wants the projection and Avg/week to cover. */
	const [chosenWindowWeeks, setChosenWindowWeeks] =
		createSignal(RATE_WINDOW_WEEKS)
	const windowWeeks = () => Math.min(chosenWindowWeeks(), maxWindowWeeks())

	/**
	 * Projected here rather than fetched, so it follows the slider. At the default
	 * window it's the same maths and the same answer as the homepage's summary.
	 */
	const message = createMemo(() => {
		const data = snapshots()
		if (!data) return null
		return largestClubMessage(projectLargestClubs(data, windowWeeks()))
	})

	const [sortKey, setSortKey] = createSignal<SortKey>('rank')
	const [sortDir, setSortDir] = createSignal<SortDir>('asc')

	/**
	 * A new column opens the way that column reads best — placings and names
	 * ascending, counts biggest-first — and clicking the current one flips it.
	 * The direction the Table hands over is ignored: it always offers ascending,
	 * which would open "Runs" at the bottom of the league.
	 */
	const handleSort = (key: string) => {
		const next = key as SortKey
		if (next === sortKey()) {
			setSortDir(sortDir() === 'asc' ? 'desc' : 'asc')
			return
		}
		setSortKey(next)
		setSortDir(next === 'rank' || next === 'name' ? 'asc' : 'desc')
	}

	/** The most recent week's table in full — the graph only plots the top few. */
	const latest = createMemo(() => {
		const data = snapshots() ?? []
		if (data.length === 0) {
			return { week: null, previousWeek: null, standings: [] as Standing[] }
		}

		const week = data.reduce(
			(newest, snapshot) => (snapshot.week > newest ? snapshot.week : newest),
			'',
		)

		// The week the bracketed changes are measured against, for the tooltip. Most
		// clubs compare against this one, though a club missing from it falls back
		// to whatever it does have.
		const previousWeek =
			data
				.map((snapshot) => snapshot.week)
				.filter((candidate) => candidate < week)
				.reduce<string | null>(
					(newest, candidate) =>
						newest === null || candidate > newest ? candidate : newest,
					null,
				) ?? null

		// Each club's rate needs its own history, so index every snapshot by club
		// before walking the latest week.
		const history = new Map<string, LargestClubSnapshot[]>()
		for (const snapshot of data) {
			const list = history.get(snapshot.name) ?? []
			list.push(snapshot)
			history.set(snapshot.name, list)
		}

		const standings = data
			.filter((snapshot) => snapshot.week === week)
			.sort((a, b) => b.events - a.events)
			.map((snapshot, index) => ({
				rank: index + 1,
				name: snapshot.name,
				members: snapshot.members,
				events: snapshot.events,
				change: changeSincePrevious(history.get(snapshot.name) ?? [], week),
				// The same function the projection uses, over the same window — the
				// column's tooltip promises as much.
				rate: averageWeeklyEvents(
					history.get(snapshot.name) ?? [],
					week,
					windowWeeks(),
				),
			}))

		return { week, previousWeek, standings }
	})

	/**
	 * The standings in the reader's chosen order.
	 *
	 * Kept apart from `latest` so re-sorting only reorders rows — the rate maths
	 * runs once per fetch, not once per click.
	 */
	const rows = createMemo(() => {
		const direction = sortDir() === 'asc' ? 1 : -1
		const key = sortKey()

		return [...latest().standings]
			.sort((a, b) => {
				// A club with too little history has no rate at all. Those rows sit at
				// the bottom whichever way the column is sorted, rather than an em dash
				// leading the table as if it were the smallest number.
				if (key === 'rate' && (a.rate === null || b.rate === null)) {
					if (a.rate === b.rate) return a.rank - b.rank
					return a.rate === null ? 1 : -1
				}
				return compareStandings(key, a, b) * direction || a.rank - b.rank
			})
			.map((standing) => [
				`${standing.rank}`,
				clubCell(standing.name),
				totalCell(standing.members, standing.change?.members ?? null),
				totalCell(standing.events, standing.change?.events ?? null),
				rateCell(standing.rate),
			])
	})

	return (
		<div class={styles.container}>
			<FieldBlock title="Largest Clubs" signType="purple">
				<Show when={message()}>
					<p class={styles.message}>{message()}</p>
				</Show>
				{/* Below two weeks of history there's only one window to pick. */}
				<Show when={maxWindowWeeks() > 1}>
					<label class={styles.window}>
						<span>
							Projected from the last{' '}
							<strong class={styles.windowWeeks}>
								{windowWeeks() === 1 ? 'week' : `${windowWeeks()} weeks`}
							</strong>
						</span>
						<input
							type="range"
							min="1"
							max={maxWindowWeeks()}
							step="1"
							value={windowWeeks()}
							class={styles.windowSlider}
							style={{
								'--fill': `${(windowWeeks() - 1) / (maxWindowWeeks() - 1)}`,
								'--ticks': `${maxWindowWeeks() - 1}`,
							}}
							onInput={(event) =>
								setChosenWindowWeeks(Number(event.currentTarget.value))
							}
							// On release, not on every step of the drag.
							onChange={(event) =>
								track('projection_window_changed', {
									projection_weeks: Number(event.currentTarget.value),
								})
							}
						/>
					</label>
				</Show>
				<Show
					when={!snapshots.loading}
					fallback={<div class={styles.loading}>Loading...</div>}
				>
					<LargestClubsGraph snapshots={snapshots() ?? []} />
				</Show>
			</FieldBlock>
			<DirtBlock title="Latest Standings">
				<Show
					when={!snapshots.loading}
					fallback={<div class={styles.loading}>Loading...</div>}
				>
					<Show when={latest().week}>
						{(week) => <p class={styles.week}>Snapshot taken {week()}</p>}
					</Show>
					<Table
						columns={buildColumns(
							latest().week,
							latest().previousWeek,
							windowWeeks(),
						)}
						data={rows()}
						empty="No snapshots have been taken yet."
						sortKey={sortKey()}
						sortDir={sortDir()}
						onSortChange={handleSort}
					/>
				</Show>
			</DirtBlock>
			<BackSignButton class={styles.backSign} />
		</div>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '900px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	message: css({
		mb: '1rem',
		textAlign: 'center',
	}),
	window: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.25rem',
		mb: '1rem',
		fontSize: '0.8rem',
	}),
	windowWeeks: css({
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '1.4rem',
		fontWeight: 'normal',
		lineHeight: 1,
	}),
	/**
	 * A chunky pixel track: hard-edged fill up to the thumb, a notch for every
	 * week, and a square wooden block for a thumb — the same dirt palette and
	 * notched corners as the checkboxes and the replay scrubber.
	 */
	windowSlider: css({
		'--thumb': '18px',
		width: '100%',
		maxWidth: '320px',
		height: '14px',
		appearance: 'none',
		cursor: 'pointer',
		border: '2px solid var(--dirt-darker-brown)',
		borderRadius: '3px',
		cornerShape: 'notch',
		// The fill stops at the thumb's centre, which sits half a thumb in from
		// each end of the track.
		background: `
			repeating-linear-gradient(
				to right,
				transparent 0 calc((100% - var(--thumb)) / var(--ticks) - 2px),
				var(--overlay-black-30) 0 calc((100% - var(--thumb)) / var(--ticks))
			) calc(var(--thumb) / 2 + 1px) 0 / calc(100% - var(--thumb)) 100% no-repeat,
			linear-gradient(
				to right,
				var(--dirt-dark-brown) 0 calc(var(--thumb) / 2 + var(--fill) * (100% - var(--thumb))),
				var(--dirt-parchment) 0
			)
		`,
		outline: 'none',
		'&::-webkit-slider-thumb': {
			appearance: 'none',
			width: 'var(--thumb)',
			height: '24px',
			boxSizing: 'border-box',
			background: 'var(--dirt-control)',
			border: '2px solid var(--dirt-control-dark)',
			borderRadius: '2px',
			cornerShape: 'notch',
			boxShadow: 'inset 0 -4px 0 var(--dirt-control-dark)',
			cursor: 'grab',
		},
		'&::-moz-range-thumb': {
			width: 'var(--thumb)',
			height: '24px',
			boxSizing: 'border-box',
			background: 'var(--dirt-control)',
			border: '2px solid var(--dirt-control-dark)',
			borderRadius: '2px',
			cornerShape: 'notch',
			boxShadow: 'inset 0 -4px 0 var(--dirt-control-dark)',
			cursor: 'grab',
		},
		'&::-moz-range-track': {
			background: 'transparent',
		},
		_focusVisible: {
			outline: '2px solid var(--dirt-darker-brown)',
			outlineOffset: '3px',
		},
	}),
	week: css({
		fontSize: '0.8rem',
		opacity: 0.7,
		mb: '0.5rem',
	}),
	/** The bracketed change is secondary to the total it sits beside. */
	change: css({
		fontSize: '0.8em',
		opacity: 0.7,
		whiteSpace: 'nowrap',
	}),
	loading: css({
		textAlign: 'center',
		padding: '2rem',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
