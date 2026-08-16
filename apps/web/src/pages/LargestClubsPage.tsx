import { BackSignButton } from '@/components/BackSignButton'
import { LargestClubsGraph } from '@/components/LargestClubsGraph'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { Table } from '@/components/ui/Table'
import {
	RATE_WINDOW_WEEKS,
	averageWeeklyEvents,
} from '@shared/largest-clubs-rate'
import { css } from '@style/css'
import { Show, createMemo, createResource, createSignal } from 'solid-js'
import {
	type LargestClubSnapshot,
	fetchAllLargestClubs,
	fetchLargestClubs,
} from '../utils/api'
import { SCOOP_BUS_CLUB_NAME, largestClubMessage } from '../utils/largestClubs'

const COLUMNS = [
	{ id: 'rank', title: '#', width: '3rem', sortable: true },
	{ id: 'name', title: 'Club', sortable: true },
	{ id: 'members', title: 'Members', sortable: true },
	{ id: 'runs', title: 'Runs', sortable: true },
	// The window comes from the same constant the projection uses, so the tooltip
	// can't drift from the maths behind the column.
	{
		id: 'rate',
		title: 'Avg/week',
		info: `Average over the last ${RATE_WINDOW_WEEKS} weeks`,
		sortable: true,
	},
]

type SortKey = 'rank' | 'name' | 'members' | 'runs' | 'rate'
type SortDir = 'asc' | 'desc'

/** One club's line in the latest standings, before it becomes table cells. */
interface Standing {
	/** League position by runs — fixed, so it still reads as a placing under any sort. */
	rank: number
	name: string
	members: number
	events: number
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
 * Scoop Bus Run Club's race to be the largest parkrun club in Sweden: the
 * weekly snapshots as a graph, plus the latest standings in full.
 */
export function LargestClubsPage() {
	const [snapshots] = createResource(fetchAllLargestClubs)
	const [summary] = createResource(fetchLargestClubs)

	const message = () => largestClubMessage(summary())

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
		if (data.length === 0) return { week: null, standings: [] as Standing[] }

		const week = data.reduce(
			(newest, snapshot) => (snapshot.week > newest ? snapshot.week : newest),
			'',
		)

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
				// The same function the projection uses, over the same window — the
				// column's tooltip promises as much.
				rate: averageWeeklyEvents(history.get(snapshot.name) ?? [], week),
			}))

		return { week, standings }
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
				standing.members.toLocaleString(),
				standing.events.toLocaleString(),
				rateCell(standing.rate),
			])
	})

	return (
		<div class={styles.container}>
			<FieldBlock title="Largest Clubs" signType="purple">
				<Show when={message()}>
					<p class={styles.message}>{message()}</p>
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
						columns={COLUMNS}
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
	week: css({
		fontSize: '0.8rem',
		opacity: 0.7,
		mb: '0.5rem',
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
