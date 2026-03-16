import { createMemo, createSignal, For, Show } from "solid-js"
import { css } from "@style/css"
import { A } from "@solidjs/router"
import { type RunResultItem, type Runner } from "../utils/api"
import { formatDate, formatName, ordinal } from "@/utils/misc"
import { MILESTONE_SET } from "../utils/milestones"
import { FloatingEmoji } from "./FloatingEmoji"
import { DirtBlock } from "./DirtBlock"
import { ResultCelebrations, buildCelebrationData } from "./ResultCelebrations"
import { Button } from "./Button"
import { getMemberRoute } from "@/utils/memberRoute"
import { runners } from '@/data/runners'
import { races, type RaceCalendarItem } from '@/data/races'
import extLinkAsset from "@/assets/misc/ext-link.png"

interface ParkrunResult {
  parkrunId: string
  name: string
  time: string
  position: number
}

interface ParkrunEvent {
  name: string
  eventNumber: string
  results: ParkrunResult[]
}

interface DateGroup {
  date: string
  parkruns: ParkrunEvent[]
  races: RaceCalendarItem[]
}

function groupResults(items: RunResultItem[]): DateGroup[] {
  const byDate = new Map<string, Map<string, ParkrunEvent>>()

  for (const item of items) {
    if (!byDate.has(item.date)) byDate.set(item.date, new Map())
    const eventMap = byDate.get(item.date)!
    const key = `${item.eventName}#${item.eventNumber}`
    if (!eventMap.has(key)) {
      eventMap.set(key, {
        name: item.eventName,
        eventNumber: String(item.eventNumber),
        results: [],
      })
    }
    eventMap.get(key)!.results.push({
      parkrunId: item.parkrunId,
      name: item.runnerName,
      time: item.time,
      position: item.position,
    })
  }

  const today = new Date().toISOString().split('T')[0]
  const pastRaces = races.filter((r) => r.date <= today)

  for (const race of pastRaces) {
    if (!byDate.has(race.date)) byDate.set(race.date, new Map())
  }

  return Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, events]) => ({
      date,
      parkruns: Array.from(events.values()).map((e) => ({
        ...e,
        results: e.results.sort((a, b) => a.position - b.position),
      })),
      races: pastRaces.filter((r) => r.date === date),
    }))
}

interface LatestResultsProps {
  results: RunResultItem[]
  runners: Runner[]
}

function isMilestoneEvent(eventNumber: string) {
  const num = Number(eventNumber)
  return !isNaN(num) && MILESTONE_SET.has(num)
}

function isChristmas(date: string) {
  return date.slice(5) === "12-25"
}

function getDisplayName(name: string, resultCount: number) {
  const totalMembers = Object.values(runners).filter((runner) => runner[0]().id).length
  if (name === "Bushy Park") return "Scoop Bushy Park"
  if (name !== "Haga" && resultCount === totalMembers) return `Whole Gang Scoop Bus trip to ${name}`
  if (name !== "Haga" && resultCount >= 4) return `Scoop Bus trip to ${name}`
  if (resultCount === totalMembers) return `Full Scoop Gang at ${name}`
  return name
}

function formatRaceTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

function RaceBlock(props: { race: RaceCalendarItem }) {
  return (
    <DirtBlock>
      <div class={styles.parkrun}>
        <h4 class={styles.parkrunName}>
          <FloatingEmoji emoji="🔥" /> {props.race.name} <FloatingEmoji emoji="🔥" />
        </h4>
        {props.race.website && <A href={props.race.website} target="_blank">
          <img src={extLinkAsset} class={styles.externalRaceLink} />
        </A>}
        <ul style={{ "list-style": "none", padding: "0" }}>
          <For each={props.race.runners}>
            {(raceRunner) => {
              const runnerData = () => runners[raceRunner.name][0]()
              const href = () => `/member/${raceRunner.name}`
              const hasPosition = () => raceRunner.position != null
              const hasTime = () => raceRunner.time != null
              const isToday = () => props.race.date === new Date().toISOString().split('T')[0]
              const linkedName = () => (
                <em><A href={href()} class={styles.memberLink}>{runnerData().name}</A></em>
              )
              return (
                <li>
                  <Show
                    when={hasPosition() || hasTime()}
                    fallback={
                      <>
                        {linkedName()}{" "}
                        {isToday() ? "is running today" : "participated"}
                      </>
                    }
                  >
                    {linkedName()} finished
                    <Show when={hasPosition()}>
                      {" "}in <em>{ordinal(raceRunner.position!)}</em> place
                    </Show>
                    <Show when={hasTime()}>
                      {" "}with a time of <em>{formatRaceTime(raceRunner.time!)}</em>
                    </Show>
                  </Show>
                </li>
              )
            }}
          </For>
        </ul>
      </div>
    </DirtBlock>
  )
}

function ParkrunName(props: { parkrun: ParkrunEvent; date: string }) {
  const isBusTrip = () => props.parkrun.name !== "Haga" && props.parkrun.results.length >= 4
  const isMilestone = () => isMilestoneEvent(props.parkrun.eventNumber)
  const isXmas = () => isChristmas(props.date)
  const displayName = () => getDisplayName(props.parkrun.name, props.parkrun.results.length)

  return (
    <h4 class={styles.parkrunName}>
      {isXmas() && <FloatingEmoji emoji="🎄" flipped />}
      {isMilestone() && <FloatingEmoji emoji="🎉" flipped />}
      {isBusTrip() && <FloatingEmoji emoji="🚌" flipped />}{' '}
      {displayName()}{' '}
      #{props.parkrun.eventNumber}{' '}
      {isBusTrip() && <FloatingEmoji emoji="🚌" />}
      {isMilestone() && <FloatingEmoji emoji="🎉" />}
      {isXmas() && <FloatingEmoji emoji="🎄" />}
    </h4>
  )
}

export function LatestResults(props: LatestResultsProps) {
  const celebrations = createMemo(() => buildCelebrationData(props.results, props.runners))

  const grouped = createMemo(() => groupResults(props.results))

  const [showAll, setShowAll] = createSignal(false)

  const cutoffDate = createMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 2)
    return d.toISOString().split('T')[0]
  })

  const visibleGroups = createMemo(() => {
    if (showAll()) return grouped()
    return grouped().filter((g) => g.date >= cutoffDate())
  })

  const hasMore = createMemo(() => grouped().some((g) => g.date < cutoffDate()))

  return (
    <div class={styles.container}>
      <For each={visibleGroups()}>
        {(result) => (
          <div class={styles.results}>
            <h3 class={styles.date}>{formatDate(new Date(result.date + "T00:00:00"))}</h3>
            <For each={result.races}>
              {(race) => <RaceBlock race={race} />}
            </For>
            <For each={result.parkruns}>
              {(parkrun) => {
                return (
                <DirtBlock>
                  <div class={styles.parkrun}>
                    <ParkrunName parkrun={parkrun} date={result.date} />
                    <ol>
                      <For each={parkrun.results}>
                        {(res) => {
                          const resultKey = `${res.parkrunId}:${result.date}:${parkrun.name}:${parkrun.eventNumber}`
                          const runnerDateKey = `${res.parkrunId}:${result.date}`
                          const memberRoute = getMemberRoute(res.parkrunId, res.name)
                          return (
                            <li>
                              <em>
                                <Show
                                  when={memberRoute}
                                  fallback={<span>{formatName(res.name)}</span>}
                                >
                                  {(href) => (
                                    <A href={href()} class={styles.memberLink}>
                                      {formatName(res.name)}
                                    </A>
                                  )}
                                </Show>
                              </em> finished in{" "}
                              <em>{ordinal(res.position)}</em> place with a time of{" "}
                              <em>{res.time}</em>
                              <ResultCelebrations data={celebrations()} resultKey={resultKey} runnerDateKey={runnerDateKey} parkrunId={res.parkrunId} date={result.date} />
                            </li>
                          )
                        }}
                      </For>
                    </ol>
                  </div>
                </DirtBlock>
                )
              }}
            </For>
          </div>
        )}
      </For>
      <Show when={hasMore() && !showAll()}>
        <Button onClick={() => setShowAll(true)}>
          Show all results
        </Button>
      </Show>
    </div>
  )
}

const styles = {
  date: css({
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }),
  container: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  }),
  results: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    textAlign: 'center',
  }),
  parkrun: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    '& em': {
      fontStyle: 'normal',
      fontWeight: 'bold',
    },
  }),
  parkrunName: css({
    fontWeight: 'bold',
    fontSize: '1.5em',
    m: 0,
  }),
  memberLink: css({
    color: 'inherit',
    textDecoration: 'underline',
  }),
  externalRaceLink: css({
    position: 'absolute',
    top: '0',
    right: '0',
    width: '24px',
    height: '24px',
    p: '4px',

    _hover: {
      background: '#00000018',
    }
  }),
}