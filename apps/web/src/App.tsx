import {
	Navigate,
	Route,
	type RouteSectionProps,
	Router,
	useLocation,
} from '@solidjs/router'
import {
	type Component,
	Show,
	createEffect,
	createMemo,
	createResource,
} from 'solid-js'
import {
	HEADER_HEIGHT,
	ScoopBusHeader,
} from './components/header/ScoopBusHeader'
import './styles.css'
import { css } from '@style/css'
import { MOBILE_NAV_SPACE, MobileNav } from './components/MobileNav'
import { getOrBuildCelebrationData } from './components/ResultCelebrations'
import { ALWAYS_SHOW_LOADER, SplashScreen } from './components/SplashScreen'
import { AboutPage } from './pages/AboutPage'
import {
	AdminAccountPage,
	AdminAdvancedUploadPage,
	AdminCustomRacersPage,
	AdminLogsPage,
	AdminPage,
	AdminParkrunsPage,
	AdminProcessResultsPage,
	AdminRunnersPage,
	AdminScanPage,
	AdminUsersPage,
} from './pages/AdminPage'
import { AlphabetPage } from './pages/AlphabetPage'
import { CalendarPage } from './pages/CalendarPage'
import { ComparePage } from './pages/ComparePage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { CustomRacerAddPage } from './pages/CustomRacerAddPage'
import { CustomRacersPage } from './pages/CustomRacersPage'
import { EventPage } from './pages/EventPage'
import { EveryonePage } from './pages/EveryonePage'
import { FaqPage } from './pages/FaqPage'
import { GuestPage } from './pages/GuestPage'
import { HomePage } from './pages/HomePage'
import { LargestClubsPage } from './pages/LargestClubsPage'
import { MapPage } from './pages/MapPage'
import { MemberGraphPage } from './pages/MemberGraphPage'
import { MemberPage } from './pages/MemberPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PositionBingoPage } from './pages/PositionBingoPage'
import { ReplayPage } from './pages/ReplayPage'
import { StopwatchBingoPage } from './pages/StopwatchBingoPage'
import { WrappedExplorePage } from './pages/WrappedExplorePage'
import { WrappedPage } from './pages/WrappedPage'
import {
	fetchAllResults,
	fetchGuestResults,
	fetchGuests,
	fetchPublicRaces,
	fetchRunners,
	fetchVolunteers,
	fetchWeather,
	getCached,
} from './utils/api'
import { fetchHeaderRacers, racersAddedThisVisit } from './utils/customRacers'
import { loadEvents } from './utils/events'
import { isSnowy, reportSnowDepth } from './utils/snow'
import { parseWeather, reportWeatherType, weatherType } from './utils/weather'

const App: Component = () => {
	// Detect if cache is cold (no cached results) to show splash screen
	const needsSplash = ALWAYS_SHOW_LOADER || !getCached<unknown>('results:all')

	const [runners] = createResource(fetchRunners)
	const [results] = createResource(fetchAllResults)
	const [races] = createResource(fetchPublicRaces)
	const [volunteers] = createResource(fetchVolunteers)
	const [guestResults] = createResource(fetchGuestResults)
	const [guests] = createResource(fetchGuests)
	// Racers made by visitors, live in the header for a week each
	const [customRacers] = createResource(fetchHeaderRacers)

	// Anything made in this tab joins the fetched list straight away, so a racer
	// starts running the moment it's added rather than on the next page load.
	const headerRacers = createMemo(() => {
		const fetched = customRacers()
		if (!fetched) return undefined
		const known = new Set(fetched.map((r) => r._id))
		return [
			...fetched,
			...racersAddedThisVisit().filter((r) => !known.has(r._id)),
		]
	})

	// Populate the event name lookup cache
	createResource(loadEvents)

	// Fetch the current weather for Haga Park on load and derive our own type.
	const [weather] = createResource(fetchWeather)
	const appWeather = createMemo(() => parseWeather(weather()))

	// Feed the parsed weather into the modules that own it — both of which hold a
	// console override, so neither is read straight off the forecast here. The snow
	// depth drives the `-snow` asset variants, mirrored onto <body> for the snowy
	// CSS palette; the type drives the precipitation over the header.
	createEffect(() => reportWeatherType(appWeather().type))
	createEffect(() => reportSnowDepth(appWeather().snowDepth))
	createEffect(() => document.body.classList.toggle('snow', isSnowy()))
	// Pre-compute celebration + PB data once (cached in localStorage alongside results)
	const celebrationData = createMemo(() => {
		const r = results()
		const u = runners()
		if (!r || !u || r.length === 0 || u.length === 0) return undefined
		return getOrBuildCelebrationData(r, u, volunteers() ?? [])
	})

	// Bundle the header's data once all sources are loaded, so the header can be
	// rendered without per-prop non-null assertions.
	const headerData = createMemo(() => {
		const r = results()
		const u = runners()
		const v = volunteers()
		const gr = guestResults()
		const g = guests()
		const cr = headerRacers()
		if (!r || !u || !v || !gr || !g || !cr) return null
		return {
			results: r,
			clubRunners: u,
			volunteers: v,
			guestResults: gr,
			guests: g,
			customRacers: cr,
		}
	})

	const RootLayout: Component<RouteSectionProps> = (routeProps) => {
		const location = useLocation()
		const isAdmin = () => location.pathname.startsWith('/admin')

		return (
			<>
				<Show when={!isAdmin()}>
					<Show
						when={headerData()}
						fallback={<div style={{ height: `${HEADER_HEIGHT}px` }} />}
					>
						{(data) => (
							<ScoopBusHeader
								results={data().results}
								clubRunners={data().clubRunners}
								volunteers={data().volunteers}
								guestResults={data().guestResults}
								guests={data().guests}
								customRacers={data().customRacers}
								weatherType={weatherType()}
							/>
						)}
					</Show>
				</Show>
				<main
					class={css({
						zIndex: 101,
						position: 'relative',
						// Keep page content clear of the fixed mobile nav
						'@media (max-width: 768px)': {
							paddingBottom: MOBILE_NAV_SPACE,
						},
					})}
				>
					{routeProps.children}
				</main>
				<Show when={!isAdmin()}>
					<MobileNav />
				</Show>
			</>
		)
	}

	window.addEventListener('scroll', () => {
		if (window.scrollY > 100) {
			document.body.classList.add('scrolled')
		} else {
			document.body.classList.remove('scrolled')
		}
	})

	const dataLoading = () => results.loading || runners.loading

	return (
		<>
			<Show when={needsSplash}>
				<SplashScreen loading={dataLoading()} />
			</Show>
			<Router root={RootLayout}>
				<Route
					path="/"
					component={() => (
						<HomePage
							resultsLoading={results.loading}
							runnersLoading={runners.loading}
							results={results() ?? []}
							runners={runners() ?? []}
							races={races() ?? []}
							volunteers={volunteers() ?? []}
							guestResults={guestResults() ?? []}
							guests={guests() ?? []}
							celebrationData={celebrationData()}
						/>
					)}
				/>
				<Route
					path="/member/:name"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<MemberPage
								results={results() ?? []}
								runners={runners() ?? []}
								volunteers={volunteers() ?? []}
								races={races() ?? []}
								celebrationData={celebrationData()}
							/>
						</Show>
					)}
				/>
				<Route
					path="/member/:name/graph"
					component={() => (
						<MemberGraphPage
							results={results() ?? []}
							runners={runners() ?? []}
							celebrationData={celebrationData()}
						/>
					)}
				/>
				<Route
					path="/member/:name/stopwatch"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<StopwatchBingoPage
								results={results() ?? []}
								runners={runners() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/member/:name/alphabet"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<AlphabetPage
								results={results() ?? []}
								runners={runners() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/member/:name/position"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<PositionBingoPage
								results={results() ?? []}
								runners={runners() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/map"
					component={() => (
						<Show
							when={!results.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<MapPage
								results={results() ?? []}
								volunteers={volunteers() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/calendar"
					component={() => (
						<Show
							when={!results.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<CalendarPage
								results={results() ?? []}
								volunteers={volunteers() ?? []}
								guestResults={guestResults() ?? []}
								races={races() ?? []}
								runners={runners() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/compare/*names"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<ComparePage
								results={results() ?? []}
								runners={runners() ?? []}
								volunteers={volunteers() ?? []}
							/>
						</Show>
					)}
				/>
				<Route path="/custom-racer" component={CustomRacersPage} />
				<Route path="/custom-racer/add" component={CustomRacerAddPage} />
				{/* The feature was specced as "customer-racer" in places — keep both working. */}
				<Route
					path="/customer-racer"
					component={() => <Navigate href="/custom-racer" />}
				/>
				<Route
					path="/customer-racer/add"
					component={() => <Navigate href="/custom-racer/add" />}
				/>
				<Route path="/admin" component={AdminPage} />
				<Route path="/admin/scan" component={AdminScanPage} />
				<Route path="/admin/users" component={AdminUsersPage} />
				<Route path="/admin/logs" component={AdminLogsPage} />
				<Route path="/admin/account" component={AdminAccountPage} />
				<Route path="/admin/runners" component={AdminRunnersPage} />
				<Route path="/admin/parkruns" component={AdminParkrunsPage} />
				<Route path="/admin/custom-racers" component={AdminCustomRacersPage} />
				<Route
					path="/admin/process-results"
					component={AdminProcessResultsPage}
				/>
				<Route
					path="/admin/process-results/advanced"
					component={AdminAdvancedUploadPage}
				/>
				{/* Renamed from Manual Results — keep old links working. */}
				<Route
					path="/admin/manual-results"
					component={() => <Navigate href="/admin/process-results" />}
				/>
				<Route
					path="/everyone"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<EveryonePage
								results={results() ?? []}
								runners={runners() ?? []}
								volunteers={volunteers() ?? []}
								celebrationData={celebrationData()}
							/>
						</Show>
					)}
				/>
				<Route
					path="/connections"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<ConnectionsPage
								results={results() ?? []}
								runners={runners() ?? []}
								volunteers={volunteers() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/wrapped/:year"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<WrappedPage
								results={results() ?? []}
								runners={runners() ?? []}
								volunteers={volunteers() ?? []}
								races={races() ?? []}
								guests={guests() ?? []}
								guestResults={guestResults() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/wrapped/:year/explore"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<WrappedExplorePage
								results={results() ?? []}
								runners={runners() ?? []}
								volunteers={volunteers() ?? []}
								races={races() ?? []}
								guests={guests() ?? []}
								guestResults={guestResults() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/event/:name"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<EventPage
								results={results() ?? []}
								runners={runners() ?? []}
								volunteers={volunteers() ?? []}
							/>
						</Show>
					)}
				/>
				<Route
					path="/replay/:eventName/:eventNumber"
					component={() => (
						<Show
							when={!results.loading && !runners.loading}
							fallback={<div class={styles.loading}>Loading...</div>}
						>
							<ReplayPage
								results={results() ?? []}
								volunteers={volunteers() ?? []}
							/>
						</Show>
					)}
				/>
				<Route path="/largestclubs" component={LargestClubsPage} />
				<Route path="/about" component={AboutPage} />
				<Route path="/faq" component={FaqPage} />
				<Route path="/guests/:parkrunId" component={() => <GuestPage />} />
				<Route path="*404" component={NotFoundPage} />
			</Router>
		</>
	)
}

export default App

const styles = {
	loading: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '1200px',
		margin: '1rem auto',
	}),
}
