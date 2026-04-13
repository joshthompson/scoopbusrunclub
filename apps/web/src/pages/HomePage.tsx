import { Component, Show } from "solid-js";
import { A } from "@solidjs/router";
import { StravaWidget } from '../components/StravaWidget';
import { DirtBlock } from '../components/ui/DirtBlock';
import { LatestResults } from '../components/LatestResults';
import { RaceCalendar } from '../components/RaceCalendar';
import { Milestones } from '../components/Milestones';
import { FieldBlock } from '../components/ui/FieldBlock';
import { type RunResultItem, type Runner, type RaceItem, type VolunteerItem } from '../utils/api';
import { type CelebrationData } from '../components/ResultCelebrations';
import { isDecember, getWrappedBannerYear } from './WrappedPage';
import { css } from "@style/css";


export const HomePage: Component<{ resultsLoading: boolean; runnersLoading: boolean; results: RunResultItem[]; runners: Runner[]; races: RaceItem[]; volunteers: VolunteerItem[]; celebrationData?: CelebrationData }> = (props) => {
  return (
    <div class={styles.content}>
      {/* December Wrapped banner */}
      <Show when={isDecember()}>
        <A href={`/wrapped/${getWrappedBannerYear()}`} class={styles.wrappedBanner}>
          🎁 Scoop Bus Wrapped {getWrappedBannerYear()} is here! →
        </A>
      </Show>
      <main class={styles.main}>
        <FieldBlock title="Latest Results" signType="purple">
          <Show when={!props.resultsLoading && !props.runnersLoading} fallback={<div>Loading...</div>}>
            <LatestResults results={props.results} runners={props.runners} races={props.races} volunteers={props.volunteers} celebrationData={props.celebrationData} />
          </Show>
        </FieldBlock>
      </main>
      <aside class={styles.sidebar}>
        <Show when={!props.runnersLoading}>
          <Milestones runners={props.runners} results={props.results} />
        </Show>
        <RaceCalendar races={props.races} />
        <DirtBlock title="Explore">
          <div class={css({ display: 'flex', flexDirection: 'column', gap: '0.5rem' })}>
            <A href="/map" class={css({ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' })}>
              🗺️ Scoop Bus Tourism Map
            </A>
            <A href="/everyone" class={css({ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' })}>
              🚶 Our Journey Together
            </A>
            <A href="/connections" class={css({ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' })}>
              🕸️ The Connection Web
            </A>
            <A href={`/wrapped/${new Date().getFullYear() - (new Date().getMonth() === 11 ? 0 : 1)}`} class={css({ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' })}>
              🎁 Scoop Bus Wrapped
            </A>
          </div>
        </DirtBlock>
        <DirtBlock title="Strava Activity"><StravaWidget /></DirtBlock>
        <DirtBlock title="About">
          <p>The Scoop Bus Run Club is a casual running club based in the Stockholm.</p>
          <br />
          <p>We are most often found at Haga Parkrun but occasionally venture out to other Parkruns and also meet most Wednesday evenings for Track and Food.</p>
        </DirtBlock>
        <DirtBlock title="FAQ">
          <strong>What is a Scoop Bus?</strong>
          <p>
            A scoop bus is a vehicle that follows the very last participants in a race, such as a marathon or half-marathon, to pick up runners who are falling behind the required pace or can no longer continue.
          </p>
        </DirtBlock>
      </aside>
    </div>
  )
}

const styles = {
  content: css({
    width: 'calc(100% - 2rem)',
    maxWidth: '1200px',
    margin: '1rem auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: '2.5rem',
    },
  }),
  wrappedBanner: css({
    width: '100%',
    display: 'block',
    textAlign: 'center',
    background: 'linear-gradient(90deg, #e11d48, #d97706, #16a34a)',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    cornerShape: 'notch',
    textDecoration: 'none',
    mb: '20px',
    border: '4px solid black',
    animation: 'pulse 2s ease-in-out infinite',
    '&:hover': {
      opacity: 0.9,
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