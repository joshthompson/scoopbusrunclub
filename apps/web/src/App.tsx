import { type Component, createResource, Show } from 'solid-js';
import { ScoopBusHeader } from './components/header/ScoopBusHeader';
import { StravaWidget } from './components/StravaWidget';
import './styles.css';
import { DirtBlock } from './components/DirtBlock';
import { css } from '@style/css';
import { LatestResults } from './components/LatestResults';
import { RaceCalendar } from './components/RaceCalendar';
import { Milestones } from './components/Milestones';
import { fetchRunners, fetchAllResults } from './utils/api';
import { FieldBlock } from './components/FieldBlock';

const App: Component = () => {
  const [runners] = createResource(fetchRunners)
  const [results] = createResource(fetchAllResults)

  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      document.body.classList.add('scrolled')
    } else {
      document.body.classList.remove('scrolled')
    }
  })

  return (
    <>
      <ScoopBusHeader results={results() ?? []} />
      <div class={styles.content}>
        <main class={styles.main}>
          <FieldBlock title="Latest Results">
            <Show when={!results.loading && !runners.loading} fallback={<div>Loading...</div>}>
              <LatestResults results={results() ?? []} runners={runners() ?? []} />
            </Show>
          </FieldBlock>
        </main>
        <aside class={styles.sidebar}>
          <Show when={!runners.loading}>
            <Milestones runners={runners() ?? []} />
          </Show>
          <DirtBlock title="Race Calendar">
            <RaceCalendar />
          </DirtBlock>
          <DirtBlock title="Strava Activity"><StravaWidget /></DirtBlock>
          <DirtBlock title="About">
            <p>The Scoop Bus Run Club is a casual, inclusive running club based in the Stockholm.</p>
            <br />
            <p>We are most often found at Haga Parkrun but occasionally venture out to other Parkruns and also meet most Wednesday evenings for track and food.</p>
          </DirtBlock>
          <DirtBlock title="FAQ">
            <strong>What is a Scoop Bus?</strong>
            <p>
              A scoop bus is a vehicle that follows the very last participants in a race, such as a marathon or half-marathon, to pick up runners who are falling behind the required pace or can no longer continue.
            </p>
          </DirtBlock>
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
}