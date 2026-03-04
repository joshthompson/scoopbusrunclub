import type { Component } from 'solid-js';
import { ScoopBusHeader } from './components/header/ScoopBusHeader';
import { StravaWidget } from './components/StravaWidget';
import './styles.css';
import { FieldBlock } from './components/FieldBlock';
import { css } from '@style/css';
import { LatestResults } from './components/LatestResults';

const App: Component = () => {
  return (
    <>
      <ScoopBusHeader />
      <div class={styles.content}>
        <FieldBlock title="Latest Results" class={styles.results}>
          <LatestResults />
        </FieldBlock>
        <FieldBlock title="Upcoming Milestones" class={styles.milestones}>blah blah blah</FieldBlock>
        <FieldBlock title="Race Calendar" class={styles.races}>blah blah blah</FieldBlock>
        <FieldBlock title="Strava Activity" class={styles.strava}><StravaWidget /></FieldBlock>
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
    display: 'grid',
    gap: '2.5rem 1rem',
    gridTemplateColumns: '1fr 350px',
    gridTemplateAreas: `
      "results milestones"
      "results races"
      "results strava"
    `,

    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gridTemplateAreas: '"results" "milestones" "races" "strava"',
    },
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