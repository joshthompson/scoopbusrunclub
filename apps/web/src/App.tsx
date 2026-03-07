import { type Component, createResource, Show } from 'solid-js';
import { ScoopBusHeader } from './components/header/ScoopBusHeader';
import { StravaWidget } from './components/StravaWidget';
import './styles.css';
import { FieldBlock } from './components/FieldBlock';
import { css } from '@style/css';
import { LatestResults } from './components/LatestResults';
import { RaceCalendar } from './components/RaceCalendar';
import { Milestones } from './components/Milestones';
import { fetchRunners, fetchRecentResults } from './utils/api';

const sinceDate = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 2)
  return d.toISOString().split('T')[0]
})()

const App: Component = () => {
  const [runners] = createResource(fetchRunners)
  const [results] = createResource(() => fetchRecentResults(sinceDate))

  return (
    <>
      <ScoopBusHeader />
      <div class={styles.content}>
        <main class={styles.main}>
          <FieldBlock title="Latest Results" class={styles.results}>
            <Show when={!results.loading && !runners.loading} fallback={<div>Loading...</div>}>
              <LatestResults results={results() ?? []} runners={runners() ?? []} />
            </Show>
          </FieldBlock>
        </main>
        <aside class={styles.sidebar}>
          <Show when={!runners.loading}>
            <Milestones runners={runners() ?? []} />
          </Show>
          <FieldBlock title="Race Calendar" class={styles.races}>
            <RaceCalendar />
          </FieldBlock>
          <FieldBlock title="Strava Activity" class={styles.strava}><StravaWidget /></FieldBlock>
        </aside>
      </div>
    </>
  );
};

export default App;

const styles = {
  content: css({
    width: 'calc(100% - 2rem)',
    maxWidth: '1200px',
    margin: '1rem auto',
    display: 'flex',
    gap: '1rem',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: '2.5rem',
    },
  }),
  main: css({
    flex: 1,
  }),
  sidebar: css({
    width: '350px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5rem',

   '@media (max-width: 768px)': {
      width: '100%',
    }
  }),
  results: css({
    gridArea: 'results',
  }),
  milestones: css({
    gridArea: 'milestones',
  }),
  races: css({
    gridArea: 'races',
  }),
  strava: css({
    gridArea: 'strava',
  }),
}