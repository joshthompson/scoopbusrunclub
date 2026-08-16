import { BackSignButton } from '@/components/BackSignButton'
import { CharacterImage } from '@/components/CharacterImage'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { Icon } from '@/components/ui/Icon'
import { type RaceGuestAttendee, fetchPublicRaces } from '@/utils/api'
import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { createRunnerFrames } from '@/utils/createRunnerFrames'
import { formatDate, ordinal } from '@/utils/misc'
import { A, useParams } from '@solidjs/router'
import { css } from '@style/css'
import { For, Show, createMemo, createResource } from 'solid-js'
import { DirtBlock } from '../components/ui/DirtBlock'
import { NotFoundPage } from './NotFoundPage'

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || ''

interface GuestData {
	_id: string
	name: string
	extra?: string
	parkrunId?: string
	avatar: Record<string, unknown>
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

/** One event a guest turned out at, either a parkrun or a club event */
interface Appearance {
	key: string
	date: string
	name: string
	/** Set for parkruns, which link to their own event page */
	eventId?: string
	eventNumber?: number
	/** Set for club events that have a website */
	website?: string
	/** Result summary, e.g. "27th place, 52:07" — absent when nothing was recorded */
	detail?: string
}

/** Summarise whatever result fields were recorded for a guest at a club event */
function describeRaceResult(entry: RaceGuestAttendee): string | undefined {
	const parts: string[] = []
	if (entry.position != null) parts.push(`${ordinal(entry.position)} place`)
	if (entry.time) parts.push(entry.time)
	if (entry.distance != null) parts.push(`${entry.distance}km`)
	if (entry.laps != null)
		parts.push(`${entry.laps} ${entry.laps === 1 ? 'lap' : 'laps'}`)
	return parts.length > 0 ? parts.join(', ') : undefined
}

/** Parkrun IDs are stored bare (e.g. "3710502"), but tolerate a typed-in "A" prefix */
function parkrunNumber(parkrunId: string): string {
	return parkrunId.replace(/^[Aa]/, '')
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

	const [races] = createResource(fetchPublicRaces)

	const appearances = createMemo<Appearance[]>(() => {
		const parkruns: Appearance[] = (guestResultsFromApi() ?? []).map((r) => ({
			key: r._id,
			date: r.date,
			name: r.eventName,
			eventId: r.event,
			eventNumber: r.eventNumber,
			detail: `${ordinal(r.position)} place, ${r.time}`,
		}))

		const guestId = guest()?._id
		const today = new Date().toISOString().split('T')[0]
		const clubEvents: Appearance[] = (races() ?? []).flatMap((race) => {
			if (race.date > today) return []
			const entry = race.guests?.find((g) => g.guestId === guestId)
			if (!entry) return []
			return [
				{
					key: race._id,
					date: race.date,
					name: race.name,
					website: race.website,
					detail: describeRaceResult(entry),
				},
			]
		})

		return [...parkruns, ...clubEvents].sort((a, b) =>
			b.date.localeCompare(a.date),
		)
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
							<Show when={g().avatar && 'head' in g().avatar}>
								{(() => {
									const runnerData = createRunnerFrames(
										g().avatar as unknown as CharacterSpriteProps,
									)
									return (
										<div class={styles.characterWrap}>
											<CharacterImage
												runner={{
													...runnerData,
													name: g().name,
													id: g().parkrunId ?? g()._id,
													birthday: '01/01',
													speed: 1,
													frameInterval: 200,
												}}
												pose="sitting"
											/>
										</div>
									)
								})()}
							</Show>
							<p class={styles.extra}>{g().extra}</p>
							<Show when={g().parkrunId}>
								{(id) => (
									<div class={styles.parkrunBlock}>
										<a
											href={`https://www.parkrun.se/parkrunner/${parkrunNumber(id())}/all`}
											target="_blank"
											rel="noopener noreferrer"
										>
											<span class={styles.parkrunLinkText}>
												View {g().name} on parkrun.se
											</span>
											&nbsp;&nbsp;
											<Icon name="external" size="small" />
										</a>
										<div>
											ID: <strong>A{parkrunNumber(id())}</strong>
										</div>
									</div>
								)}
							</Show>
						</FieldBlock>
						<Show when={appearances().length > 0}>
							<DirtBlock title="Guest Appearances">
								<ul class={styles.resultList}>
									<For each={appearances()}>
										{(appearance) => (
											<li class={styles.resultItem}>
												<div class={styles.resultDate}>
													{formatDate(new Date(`${appearance.date}T00:00:00`))}
												</div>
												<div>
													<Show
														when={appearance.eventId}
														fallback={
															<Show
																when={appearance.website}
																fallback={<span>{appearance.name}</span>}
															>
																{(website) => (
																	<a
																		href={website()}
																		target="_blank"
																		rel="noopener noreferrer"
																		class={styles.link}
																	>
																		{appearance.name}
																		&nbsp;
																		<Icon name="external" size="small" />
																	</a>
																)}
															</Show>
														}
													>
														{(eventId) => (
															<>
																<A
																	href={`/event/${eventId()}`}
																	class={styles.link}
																>
																	{appearance.name}
																</A>{' '}
																#{appearance.eventNumber}
															</>
														)}
													</Show>
													<Show when={appearance.detail}>
														{(detail) => (
															<span class={styles.resultDetail}>
																{' '}
																— {detail()}
															</span>
														)}
													</Show>
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
	characterWrap: css({
		display: 'flex',
		justifyContent: 'center',
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
	parkrunLinkText: css({
		color: 'inherit',
		textDecoration: 'underline',
		fontWeight: 'bold',
	}),
	parkrunBlock: css({
		backgroundColor: '#9EC681',
		p: '4px 12px',
		width: 'fit-content',
		marginLeft: 'auto',
		zIndex: 1,
		borderRadius: '4px',
		cornerShape: 'notch',
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
