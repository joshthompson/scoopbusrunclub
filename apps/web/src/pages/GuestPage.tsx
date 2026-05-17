import { css } from '@style/css'
import { createMemo, createResource, For, Show } from 'solid-js'
import { A, useParams } from '@solidjs/router'
import { DirtBlock } from '../components/ui/DirtBlock'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { BackSignButton } from '@/components/BackSignButton'
import { formatDate, ordinal } from '@/utils/misc'
import { NotFoundPage } from './NotFoundPage'

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || ''

interface GuestData {
	_id: string
	name: string
	extra?: string
	parkrunId?: string
	avatar: Record<string, never>
}

interface GuestResultWithEventName {
	_id: string
	guestId: string
	event: string
	eventName: string
	eventNumber: number
	position: number
	time: string
	date: string
}

async function fetchGuestByParkrunId(
	parkrunId: string,
): Promise<GuestData | null> {
	const res = await fetch(
		`${CONVEX_URL}/api/guest?parkrunId=${encodeURIComponent(parkrunId)}`,
	)
	if (!res.ok) return null
	return res.json()
}

async function fetchGuestById(id: string): Promise<GuestData | null> {
	const res = await fetch(
		`${CONVEX_URL}/api/guest?id=${encodeURIComponent(id)}`,
	)
	if (!res.ok) return null
	return res.json()
}

async function fetchGuestResultsById(
	id: string,
): Promise<GuestResultWithEventName[]> {
	const res = await fetch(
		`${CONVEX_URL}/api/guest/results?id=${encodeURIComponent(id)}`,
	)
	if (!res.ok) return []
	return res.json()
}

export function GuestPage() {
	const params = useParams<{ parkrunId: string }>()

	// Try loading by parkrunId first, fall back to guestId
	const [guest] = createResource(
		() => params.parkrunId,
		async (parkrunId) => {
			const byParkrunId = await fetchGuestByParkrunId(parkrunId)
			if (byParkrunId) return byParkrunId
			return fetchGuestById(parkrunId)
		},
	)

	const [guestResultsFromApi] = createResource(
		() => guest()?._id,
		(guestId) => fetchGuestResultsById(guestId),
	)

	const sortedResults = createMemo(() => {
		const results = guestResultsFromApi() ?? []
		return [...results].sort((a, b) => b.date.localeCompare(a.date))
	})

	return (
		<Show
			when={!guest.loading}
			fallback={<div class={styles.loading}>Loading...</div>}
		>
			<Show when={guest()} fallback={<NotFoundPage />}>
				{(g) => (
					<div class={styles.container}>
						<FieldBlock title={g().name} signType="purple">
							<p class={styles.extra}>{g().extra}</p>
						</FieldBlock>
						<Show when={sortedResults().length > 0}>
							<DirtBlock title="Guest Appearances">
								<ul class={styles.resultList}>
									<For each={sortedResults()}>
										{(result) => (
											<li class={styles.resultItem}>
												<div class={styles.resultDate}>
													{formatDate(new Date(`${result.date}T00:00:00`))}
												</div>
												<div>
													<A
														href={`/event/${result.event}`}
														class={styles.link}
													>
														{result.eventName}
													</A>{' '}
													#{result.eventNumber}
													<span class={styles.resultDetail}>
														{' '}
														— {ordinal(result.position)} place, {result.time}
													</span>
												</div>
											</li>
										)}
									</For>
								</ul>
							</DirtBlock>
						</Show>
					</div>
				)}
			</Show>
			<BackSignButton class={styles.backSign} />
		</Show>
	)
}

const styles = {
	container: css({
		maxWidth: '700px',
		margin: '0 auto',
		padding: '1rem',
		gap: '32px',
		display: 'flex',
		flexDirection: 'column',
	}),
	loading: css({
		textAlign: 'center',
		padding: '2rem',
		fontSize: '1.25rem',
	}),
	header: css({
		textAlign: 'center',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.25rem',
	}),
	guestBadge: css({
		display: 'inline-block',
		background: '#FFFC',
		p: '0.25rem 0.75rem',
		borderRadius: '2px',
		cornerShape: 'notch',
		fontWeight: 'bold',
		outline: '2px solid #8B5CF6',
		outlineOffset: '-1px',
		color: '#8B5CF6',
		fontSize: '0.9rem',
	}),
	name: css({
		fontSize: '1.5rem',
		fontWeight: 'bold',
		m: 0,
	}),
	extra: css({
		fontSize: '1.125rem',
		m: '0 auto',
		textAlign: 'center',
	}),
	parkrunLink: css({
		m: 0,
		'& a': {
			color: 'inherit',
		},
	}),
	resultList: css({
		listStyle: 'none',
		padding: 0,
		display: 'flex',
		flexDirection: 'column',
		gap: '0.5rem',
	}),
	resultItem: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.125rem',
	}),
	resultDate: css({
		fontSize: '0.75rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		opacity: 0.6,
	}),
	resultDetail: css({
		fontWeight: 'bold',
	}),
	link: css({
		color: 'inherit',
		textDecoration: 'underline',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
