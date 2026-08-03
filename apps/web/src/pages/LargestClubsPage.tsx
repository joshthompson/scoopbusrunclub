import { BackSignButton } from '@/components/BackSignButton'
import { LargestClubsGraph } from '@/components/LargestClubsGraph'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { Table } from '@/components/ui/Table'
import { css } from '@style/css'
import { Show, createMemo, createResource } from 'solid-js'
import { fetchAllLargestClubs, fetchLargestClubs } from '../utils/api'
import { SCOOP_BUS_CLUB_NAME, largestClubMessage } from '../utils/largestClubs'

const COLUMNS = [
	{ title: '#', width: '3rem' },
	{ title: 'Club' },
	{ title: 'Members' },
	{ title: 'Runs' },
]

/** Club name cell — our own club stands out from the rest of the table. */
function clubCell(name: string) {
	if (name !== SCOOP_BUS_CLUB_NAME) return name
	return <strong>{name}</strong>
}

/**
 * Scoop Bus Run Club's race to be the largest parkrun club in Sweden: the
 * weekly snapshots as a graph, plus the latest standings in full.
 */
export function LargestClubsPage() {
	const [snapshots] = createResource(fetchAllLargestClubs)
	const [summary] = createResource(fetchLargestClubs)

	const message = () => largestClubMessage(summary())

	/** The most recent week's table in full — the graph only plots the top few. */
	const latest = createMemo(() => {
		const data = snapshots() ?? []
		if (data.length === 0) return { week: null, rows: [] }

		const week = data.reduce(
			(newest, snapshot) => (snapshot.week > newest ? snapshot.week : newest),
			'',
		)
		const rows = data
			.filter((snapshot) => snapshot.week === week)
			.sort((a, b) => b.events - a.events)
			.map((snapshot, index) => [
				`${index + 1}`,
				clubCell(snapshot.name),
				snapshot.members.toLocaleString(),
				snapshot.events.toLocaleString(),
			])

		return { week, rows }
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
						data={latest().rows}
						empty="No snapshots have been taken yet."
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
