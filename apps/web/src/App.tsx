import { type Component, createMemo, createResource, Show } from 'solid-js';
import { Router, Route, type RouteSectionProps, useLocation } from '@solidjs/router';
import { ScoopBusHeader, HEADER_HEIGHT } from './components/header/ScoopBusHeader';
import './styles.css';
import { css } from '@style/css';
import { fetchRunners, fetchAllResults, fetchPublicRaces, fetchVolunteers, getCached } from './utils/api';
import { loadEvents } from './utils/events';
import { getOrBuildCelebrationData } from './components/ResultCelebrations';
import { MemberPage } from './pages/MemberPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { MemberGraphPage } from './pages/MemberGraphPage';
import { AdminPage, AdminScanPage, AdminUsersPage, AdminAccountPage, AdminLogsPage } from './pages/AdminPage';
import { MapPage } from './pages/MapPage';
import { ComparePage } from './pages/ComparePage';
import { EveryonePage } from './pages/EveryonePage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { WrappedPage } from './pages/WrappedPage';
import { EventPage } from './pages/EventPage';
import { SplashScreen, ALWAYS_SHOW_LOADER } from './components/SplashScreen';

const App: Component = () => {
  // Detect if cache is cold (no cached results) to show splash screen
  const needsSplash = ALWAYS_SHOW_LOADER || !getCached<unknown>('results:all')

  const [runners] = createResource(fetchRunners)
  const [results] = createResource(fetchAllResults)
  const [races] = createResource(fetchPublicRaces)
  const [volunteers] = createResource(fetchVolunteers)

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
          <Show when={results() && runners() && volunteers()} fallback={<div style={{ height: `${HEADER_HEIGHT}px` }} />}>
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
              celebrationData={celebrationData()}
            />
          )}
        />
        <Route
          path="/member/:name"
          component={() => (
            <Show when={!results.loading && !runners.loading} fallback={<div class={styles.loading}>Loading...</div>}>
              <MemberPage results={results() ?? []} runners={runners() ?? []} volunteers={volunteers() ?? []} celebrationData={celebrationData()} />
            </Show>
          )}
        />
        <Route
          path="/member/:name/graph"
          component={() => (
            <MemberGraphPage results={results() ?? []} runners={runners() ?? []} celebrationData={celebrationData()} />
          )}
        />
        <Route
          path="/map"
          component={() => (
            <Show when={!results.loading} fallback={<div class={styles.loading}>Loading...</div>}>
              <MapPage results={results() ?? []} volunteers={volunteers() ?? []} />
            </Show>
          )}
        />
        <Route
          path="/compare/*names"
          component={() => (
            <Show when={!results.loading && !runners.loading} fallback={<div class={styles.loading}>Loading...</div>}>
              <ComparePage results={results() ?? []} runners={runners() ?? []} volunteers={volunteers() ?? []} />
            </Show>
          )}
        />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/scan" component={AdminScanPage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/admin/logs" component={AdminLogsPage} />
        <Route path="/admin/account" component={AdminAccountPage} />
        <Route
          path="/everyone"
          component={() => (
            <Show when={!results.loading && !runners.loading} fallback={<div class={styles.loading}>Loading...</div>}>
              <EveryonePage results={results() ?? []} runners={runners() ?? []} volunteers={volunteers() ?? []} celebrationData={celebrationData()} />
            </Show>
          )}
        />
        <Route
          path="/connections"
          component={() => (
            <Show when={!results.loading && !runners.loading} fallback={<div class={styles.loading}>Loading...</div>}>
              <ConnectionsPage results={results() ?? []} runners={runners() ?? []} volunteers={volunteers() ?? []} />
            </Show>
          )}
        />
        <Route
          path="/wrapped/:year"
          component={() => (
            <Show when={!results.loading && !runners.loading} fallback={<div class={styles.loading}>Loading...</div>}>
              <WrappedPage results={results() ?? []} runners={runners() ?? []} volunteers={volunteers() ?? []} />
            </Show>
          )}
        />
        <Route
          path="/event/:name"
          component={() => (
            <Show when={!results.loading && !runners.loading} fallback={<div class={styles.loading}>Loading...</div>}>
              <EventPage results={results() ?? []} runners={runners() ?? []} volunteers={volunteers() ?? []} />
            </Show>
          )}
        />
        <Route path="*404" component={NotFoundPage} />
    </Router>
    </>
  );
};

export default App;

const styles = {
  loading: css({
    width: 'calc(100% - 2rem)',
    maxWidth: '1200px',
    margin: '1rem auto',
  }),
}
