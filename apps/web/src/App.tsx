import { type Component, createResource, Show } from 'solid-js';
import { Router, Route, type RouteSectionProps, useLocation } from '@solidjs/router';
import { ScoopBusHeader } from './components/header/ScoopBusHeader';
import './styles.css';
import { css } from '@style/css';
import { fetchRunners, fetchAllResults, fetchPublicRaces } from './utils/api';
import { loadEvents } from './utils/events';
import { MemberPage } from './pages/MemberPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { MemberGraphPage } from './pages/MemberGraphPage';
import { AdminPage, AdminScanPage, AdminUsersPage, AdminAccountPage } from './pages/AdminPage';

const App: Component = () => {
  const [runners] = createResource(fetchRunners)
  const [results] = createResource(fetchAllResults)
  const [races] = createResource(fetchPublicRaces)

  // Populate the event name lookup cache
  createResource(loadEvents)

  const RootLayout: Component<RouteSectionProps> = (routeProps) => {
    const location = useLocation()
    const isAdmin = () => location.pathname.startsWith('/admin')

    return (
      <>
        <Show when={!isAdmin()}>
          <ScoopBusHeader results={results() ?? []} />
        </Show>
        {routeProps.children}
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

  return (
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
            />
          )}
        />
        <Route
          path="/member/:name"
          component={() => (
            <Show when={!results.loading && !runners.loading} fallback={<div class={styles.loading}>Loading...</div>}>
              <MemberPage results={results() ?? []} runners={runners() ?? []} />
            </Show>
          )}
        />
        <Route
          path="/member/:name/graph"
          component={() => (
            <MemberGraphPage results={results() ?? []} runners={runners() ?? []} />
          )}
        />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/scan" component={AdminScanPage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/admin/account" component={AdminAccountPage} />
        <Route path="*404" component={NotFoundPage} />
    </Router>
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
