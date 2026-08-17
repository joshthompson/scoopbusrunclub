import { BackSignButton } from '@/components/BackSignButton'
import {
	MemberSpotlight,
	RunnerArtwork,
	WrappedCard,
	buildWrappedSlides,
} from '@/components/wrapped/WrappedSlides'
import { getMemberRoute } from '@/utils/memberRoute'
import { computeWrappedStats } from '@/utils/wrapped'
import { formatDateShort, formatDuration } from '@/utils/wrappedFormat'
import {
	PREVIEW_HASH,
	getAvailableYears,
	getLatestAvailableYear,
	isPreviewHash,
	parseWrappedYear,
} from '@/utils/wrappedYears'
import { A, useLocation, useNavigate, useParams } from '@solidjs/router'
import { css } from '@style/css'
import { For, Match, Show, Switch, createMemo, createResource } from 'solid-js'
import { DirtBlock } from '../components/ui/DirtBlock'
import { FieldBlock } from '../components/ui/FieldBlock'
import {
	type GuestItem,
	type GuestResultItem,
	type LargestClubSnapshot,
	type RaceItem,
	type RunResultItem,
	type Runner,
	type VolunteerItem,
	fetchAllLargestClubs,
} from '../utils/api'

/** The league table can be unavailable without the rest of Wrapped suffering. */
export async function fetchClubSnapshots(): Promise<LargestClubSnapshot[]> {
	try {
		return await fetchAllLargestClubs()
	} catch {
		return []
	}
}

export interface WrappedPageProps {
	results: RunResultItem[]
	runners: Runner[]
	volunteers: VolunteerItem[]
	races: RaceItem[]
	guests: GuestItem[]
	guestResults: GuestResultItem[]
}

export function WrappedPage(props: WrappedPageProps) {
	const params = useParams<{ year: string }>()
	const navigate = useNavigate()
	const location = useLocation()

	const [clubSnapshots] = createResource(fetchClubSnapshots)

	const preview = createMemo(() => isPreviewHash(location.hash))
	/** Kept on year links and redirects so navigation stays in preview mode. */
	const previewSuffix = createMemo(() => (preview() ? PREVIEW_HASH : ''))

	const parsedYear = createMemo(() => parseWrappedYear(params.year, preview()))

	// If no valid year, redirect to latest
	createMemo(() => {
		if (params.year && !parsedYear()) {
			navigate(
				`/wrapped/${getLatestAvailableYear(preview())}${previewSuffix()}`,
				{ replace: true },
			)
		}
	})

	const year = createMemo(
		() => parsedYear() ?? getLatestAvailableYear(preview()),
	)

	const stats = createMemo(() =>
		computeWrappedStats({
			year: year(),
			results: props.results,
			runners: props.runners,
			volunteers: props.volunteers,
			races: props.races,
			guests: props.guests,
			guestResults: props.guestResults,
			clubSnapshots: clubSnapshots() ?? [],
		}),
	)

	const slides = createMemo(() => buildWrappedSlides(stats(), year()))
	const availableYears = createMemo(() => getAvailableYears(preview()))

	return (
		<div class={pageStyles.page}>
			{/* Year selector */}
			<div class={pageStyles.yearNav}>
				<For each={availableYears()}>
					{(y) => (
						<A
							href={`/wrapped/${y}${previewSuffix()}`}
							class={y === year() ? pageStyles.yearActive : pageStyles.yearLink}
						>
							{y}
						</A>
					)}
				</For>
			</div>

			{/* A year still in progress shouldn't be mistaken for a finished one. */}
			<Show when={preview() && year() === new Date().getFullYear()}>
				<div class={pageStyles.previewNote}>
					👀 Preview — {year()} isn't over yet, so these numbers are still
					climbing
				</div>
			</Show>

			<FieldBlock title={`Scoop Bus Wrapped ${year()}`} signType="wooden">
				<Show
					when={stats().hasData}
					fallback={
						<div class={pageStyles.noData}>
							<p>No data available for {year()}</p>
							<p style={{ 'font-size': '0.9rem', opacity: '0.7' }}>
								The club might not have been active this year, or we don't have
								records going back this far.
							</p>
						</div>
					}
				>
					<Show when={slides().length > 0}>
						<A
							href={`/wrapped/${year()}/explore`}
							class={pageStyles.exploreLink}
						>
							▶ Play {year()} as a story
						</A>
					</Show>

					<div class={pageStyles.cardsGrid}>
						<For each={slides()}>
							{(slide) => (
								<Switch>
									<Match when={slide.kind === 'spotlight' ? slide : null}>
										{(spotlightSlide) => (
											<MemberSpotlight block={spotlightSlide().spotlight} />
										)}
									</Match>
									<Match when={slide.kind === 'card' ? slide : null}>
										{(cardSlide) => (
											<WrappedCard
												emoji={cardSlide().emoji}
												color={cardSlide().color}
											>
												{cardSlide().body()}
											</WrappedCard>
										)}
									</Match>
								</Switch>
							)}
						</For>
					</div>

					{/* New volunteer roles list */}
					<Show when={stats().newRoleTries.length > 0}>
						<div class={pageStyles.section}>
							<h3 class={pageStyles.sectionTitle}>New Volunteer Roles</h3>
							<div class={pageStyles.eventList}>
								<For each={stats().newRoleTries}>
									{(role) => (
										<div class={pageStyles.eventRow}>
											<span class={pageStyles.eventName}>{role.name}</span>
											<span class={pageStyles.eventCountry}>{role.role}</span>
											<span class={pageStyles.eventBy}>
												{formatDateShort(role.date)}
											</span>
										</div>
									)}
								</For>
							</div>
						</div>
					</Show>

					{/* New events list */}
					<Show when={stats().newEventsList.length > 0}>
						<div class={pageStyles.section}>
							<h3 class={pageStyles.sectionTitle}>New Events Discovered</h3>
							<div class={pageStyles.eventList}>
								<For each={stats().newEventsList}>
									{(ev) => (
										<div class={pageStyles.eventRow}>
											<span class={pageStyles.eventName}>{ev.name}</span>
											<span class={pageStyles.eventCountry}>{ev.country}</span>
											<span class={pageStyles.eventBy}>
												by {ev.discoveredBy}
											</span>
										</div>
									)}
								</For>
							</div>
						</div>
					</Show>
				</Show>
			</FieldBlock>

			{/* Member summaries */}
			<Show when={stats().hasData && stats().memberStats.length > 0}>
				<DirtBlock title="Member Highlights">
					<div class={pageStyles.memberGrid}>
						<For each={stats().memberStats}>
							{(m) => {
								const route = getMemberRoute(m.parkrunId, m.name)
								return (
									<div class={pageStyles.memberCard}>
										<RunnerArtwork parkrunId={m.parkrunId} />
										<Show when={route} fallback={<strong>{m.name}</strong>}>
											{(href) => (
												<A href={href()} class={pageStyles.memberLink}>
													<strong>{m.name}</strong>
												</A>
											)}
										</Show>
										<div class={pageStyles.memberStatsRow}>
											<Show when={m.runs > 0}>
												<span>🏃 {m.runs} runs</span>
											</Show>
											<Show when={m.events > 0}>
												<span>📍 {m.events} events</span>
											</Show>
											<Show when={m.newEvents > 0}>
												<span>✨ {m.newEvents} new</span>
											</Show>
											<Show when={m.volunteered > 0}>
												<span>🦺 {m.volunteered} vol.</span>
											</Show>
											<Show when={m.roles > 0}>
												<span>🧰 {m.roles} roles</span>
											</Show>
											<Show when={m.pbImprovement > 0}>
												<span>⚡ PB −{formatDuration(m.pbImprovement)}</span>
											</Show>
										</div>
									</div>
								)
							}}
						</For>
					</div>
				</DirtBlock>
			</Show>

			<BackSignButton />
		</div>
	)
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageStyles = {
	page: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '900px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	yearNav: css({
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: '0.4rem',
	}),
	yearLink: css({
		padding: '0.25rem 0.6rem',
		background: 'var(--overlay-black-15)',
		borderRadius: '4px',
		color: 'inherit',
		textDecoration: 'none',
		fontSize: '0.85rem',
		'&:hover': {
			background: 'var(--overlay-black-25)',
		},
	}),
	yearActive: css({
		padding: '0.25rem 0.6rem',
		background: 'var(--green-brand)',
		borderRadius: '4px',
		color: 'var(--color-white)',
		textDecoration: 'none',
		fontSize: '0.85rem',
		fontWeight: 'bold',
	}),
	noData: css({
		textAlign: 'center',
		padding: '2rem',
	}),
	previewNote: css({
		textAlign: 'center',
		fontSize: '0.85rem',
		padding: '0.4rem 0.8rem',
		marginTop: '-1.4rem',
		borderRadius: '4px',
		background: 'var(--overlay-black-15)',
		alignSelf: 'center',
	}),
	exploreLink: css({
		display: 'block',
		width: 'fit-content',
		margin: '0 auto 1rem',
		padding: '0.4rem 0.9rem',
		borderRadius: '4px',
		cornerShape: 'notch',
		background: 'var(--color-black)',
		color: 'var(--color-white)',
		textDecoration: 'none',
		fontWeight: 'bold',
		fontSize: '0.9rem',
	}),
	cardsGrid: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
	}),
	section: css({
		marginTop: '1.5rem',
	}),
	sectionTitle: css({
		fontSize: '1.1rem',
		fontWeight: 'bold',
		marginBottom: '0.5rem',
		textAlign: 'center',
	}),
	eventList: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.3rem',
		maxHeight: '300px',
		overflow: 'auto',
	}),
	eventRow: css({
		display: 'flex',
		gap: '0.5rem',
		alignItems: 'center',
		padding: '0.2rem 0.5rem',
		background: 'var(--overlay-black-8)',
		borderRadius: '4px',
		fontSize: '0.9rem',
	}),
	eventName: css({
		flex: 1,
		fontWeight: 'bold',
	}),
	eventCountry: css({
		opacity: 0.7,
		fontSize: '0.8rem',
	}),
	eventBy: css({
		opacity: 0.6,
		fontSize: '0.8rem',
		fontStyle: 'italic',
	}),
	memberGrid: css({
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
		gap: '0.75rem',
	}),
	memberCard: css({
		background: 'var(--overlay-black-10)',
		borderRadius: '8px',
		padding: '0.75rem',
		textAlign: 'center',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.25rem',
	}),
	memberLink: css({
		color: 'inherit',
		textDecoration: 'underline',
	}),
	memberStatsRow: css({
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: '0.4rem',
		fontSize: '0.8rem',
		opacity: 0.85,
	}),
}
