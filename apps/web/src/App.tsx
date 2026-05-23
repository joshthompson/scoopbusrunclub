import {
	Route,
	type RouteSectionProps,
	Router,
	useLocation,
} from '@solidjs/router'
import { type Component, Show, createMemo, createResource } from 'solid-js'
import {
	HEADER_HEIGHT,
	ScoopBusHeader,
} from './components/header/ScoopBusHeader'
import './styles.css'
import { css } from '@style/css'
import { getOrBuildCelebrationData } from './components/ResultCelebrations'
import { ALWAYS_SHOW_LOADER, SplashScreen } from './components/SplashScreen'
import {
	AdminAccountPage,
	AdminLogsPage,
	AdminPage,
	AdminParkrunsPage,
	AdminRunnersPage,
	AdminScanPage,
	AdminUsersPage,
} from './pages/AdminPage'
import { ComparePage } from './pages/ComparePage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { EventPage } from './pages/EventPage'
import { EveryonePage } from './pages/EveryonePage'
import { GuestPage } from './pages/GuestPage'
import { HomePage } from './pages/HomePage'
import { MapPage } from './pages/MapPage'
import { MemberGraphPage } from './pages/MemberGraphPage'
import { MemberPage } from './pages/MemberPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReplayPage } from './pages/ReplayPage'
import { WrappedPage } from './pages/WrappedPage'
import {
	fetchAllResults,
	fetchGuestResults,
	fetchPublicRaces,
	fetchRunners,
	fetchVolunteers,
	getCached,
} from './utils/api'
import { loadEvents } from './utils/events'

const App: Component = () => {
	// Detect if cache is cold (no cached results) to show splash screen
	const needsSplash = ALWAYS_SHOW_LOADER || !getCached<unknown>('results:all')

	const [runners] = createResource(fetchRunners)
	const [results] = createResource(fetchAllResults)
	const [races] = createResource(fetchPublicRaces)
	const [volunteers] = createResource(fetchVolunteers)
	const [guestResults] = createResource(fetchGuestResults)

	// Populate the event name lookup cache
	createResource(loadEvents)

	// Pre-compute celebration + PB data once (cached in localStorage alongside results)
	const celebrationData = createMemo(() => {
		const r = results()
		const u = runners()
		if (!r || !u || r.length === 0 || u.length === 0) return undefined
		return getOrBuildCelebrationData(r, u, volunteers() ?? [])
	})

	const RootLayout: Component<RouteSectionProps> = (routeProps) => {
		const location = useLocation()
		const isAdmin = () => location.pathname.startsWith('/admin')

		return (
			<>
				<Show when={!isAdmin()}>
					<Show
						when={results() && runners() && volunteers()}
						fallback={<div style={{ height: `${HEADER_HEIGHT}px` }} />}
					>
						{/* biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic */}
						<ScoopBusHeader results={results()!} volunteers={volunteers()!} />
					</Show>
				</Show>
				<main class={css({ zIndex: 101, position: 'relative' })}>
					{routeProps.children}
				</main>
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
				<Route path="/admin" component={AdminPage} />
				<Route path="/admin/scan" component={AdminScanPage} />
				<Route path="/admin/users" component={AdminUsersPage} />
				<Route path="/admin/logs" component={AdminLogsPage} />
				<Route path="/admin/account" component={AdminAccountPage} />
				<Route path="/admin/runners" component={AdminRunnersPage} />
				<Route path="/admin/parkruns" component={AdminParkrunsPage} />
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
