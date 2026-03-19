import { createMemo, createSignal, For, Show, type JSX } from "solid-js"
import { css } from "@style/css"
import { A } from "@solidjs/router"
import { type RunResultItem, type Runner, type RaceItem } from "../utils/api"
import { formatDate, formatName, ordinal } from "@/utils/misc"
import { MILESTONE_SET } from "../utils/milestones"
import { FloatingEmoji } from "./ui/FloatingEmoji"
import { DirtBlock } from "./ui/DirtBlock"
import { ResultCelebrations, buildCelebrationData } from "./ResultCelebrations"
import { Button } from "./ui/Button"
import { getMemberRoute } from "@/utils/memberRoute"
import { runners } from '@/data/runners'
import { getEvent } from '@/utils/events'
import extLinkAsset from "@/assets/misc/ext-link.png"

const parkrunIdToRunnerName = new Map<string, string>()
for (const [, [runner]] of Object.entries(runners)) {
  const data = runner()
  if (data.id) parkrunIdToRunnerName.set(data.id, data.name)
}

function getRunnerDisplayName(parkrunId: string, fallbackName: string): string {
  return parkrunIdToRunnerName.get(parkrunId) ?? formatName(fallbackName)
}

interface ParkrunResult {
  parkrunId: string
  name: string
  time: string
  position: number
}

interface ParkrunEvent {
  name: string
  eventId: string
  eventNumber: string
  results: ParkrunResult[]
}

interface DateGroup {
  date: string
  parkruns: ParkrunEvent[]
  races: RaceItem[]
}

function groupResults(items: RunResultItem[], allRaces: RaceItem[]): DateGroup[] {
  const byDate = new Map<string, Map<string, ParkrunEvent>>()

  for (const item of items) {
    if (!byDate.has(item.date)) byDate.set(item.date, new Map())
    const eventMap = byDate.get(item.date)!
    const key = `${item.event}#${item.eventNumber}`
    if (!eventMap.has(key)) {
      eventMap.set(key, {
        name: item.eventName,
        eventId: item.event,
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
  const pastRaces = allRaces.filter((r) => r.date <= today && r.attendees.length > 0)

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
  races: RaceItem[]
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

function formatRaceTime(time: string): string {
  return time
}

/** Render a string, converting *text* segments to bold <em> elements */
function renderBold(text: string): JSX.Element {
  const parts = text.split(/(\*[^*]+\*)/)
  return (
    <>
      {parts.map((part) =>
        part.startsWith("*") && part.endsWith("*")
          ? <em>{part.slice(1, -1)}</em>
          : part
      )}
    </>
  )
}

/** Join names with commas and "and": ["A","B","C"] → "A, B and C" */
function joinNames(elements: JSX.Element[]): JSX.Element {
  if (elements.length === 1) return elements[0]
  if (elements.length === 2) return <>{elements[0]} and {elements[1]}</>
  return (
    <>
      {elements.slice(0, -1).map((el, i) => (
        <>{el}{i < elements.length - 2 ? ", " : ""}</>
      ))}
      {" "}and {elements[elements.length - 1]}
    </>
  )
}

/** Build a signature string to group attendees with identical result shape */
function attendeeSignature(a: import("@/utils/api").RaceAttendee, isToday: boolean): string {
  return JSON.stringify({
    position: a.position ?? null,
    time: a.time || null,
    distance: a.distance ?? null,
    laps: a.laps ?? null,
    isToday,
  })
}

function RaceBlock(props: { race: RaceItem }) {
  const isToday = () => props.race.date === new Date().toISOString().split('T')[0]

  const groups = createMemo(() => {
    const today = isToday()
    const map = new Map<string, import("@/utils/api").RaceAttendee[]>()
    for (const a of props.race.attendees) {
      const key = attendeeSignature(a, today)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.values())
  })

  const linkedName = (runnerId: string) => {
    const runnerEntry = runners[runnerId as import('@/data/runners').RunnerName]
    const name = runnerEntry?.[0]()?.name ?? runnerId
    return <em><A href={`/member/${runnerId}`} class={styles.memberLink}>{name}</A></em>
  }

  /** Build a text description for a group of attendees with identical results */
  const describeGroup = (group: import("@/utils/api").RaceAttendee[]): string => {
    const rep = group[0]
    const hasPosition = rep.position != null
    const hasTime = rep.time != null
    const hasDistance = rep.distance != null
    const hasLaps = rep.laps != null
    const hasResults = hasPosition || hasTime || hasDistance || hasLaps

    if (!hasResults) {
      if (isToday()) return group.length > 1 ? "are running today" : "is running today"
      return "participated"
    }

    const parts: string[] = []

    if (hasPosition || hasTime) {
      let finished = "finished"
      if (hasPosition) finished += ` in *${ordinal(rep.position!)}* place`
      if (hasTime) finished += ` with a time of *${formatRaceTime(rep.time!)}*`
      parts.push(finished)
    }

    if (hasDistance || hasLaps) {
      let ran = (hasPosition || hasTime) ? "and ran" : "ran"
      if (hasDistance) ran += ` *${rep.distance}km*`
      if (hasLaps) ran += `${hasDistance ? " over" : ""} *${rep.laps} ${rep.laps === 1 ? "lap" : "laps"}*`
      parts.push(ran)
    }

    return parts.join(" ")
  }

  const eventEmojis = (): [string, string] | undefined => {
    if (props.race.type === "Track and Food") return ["🏟️", "🍕"]
    if (props.race.majorEvent) return ["🔥", "🔥"]
    return undefined
  }

  return (
    <DirtBlock>
      <div class={styles.parkrun}>
        <h4 class={styles.parkrunName}>
          <Show when={eventEmojis()}><FloatingEmoji emoji={eventEmojis()![0]} />{' '}</Show>
          {props.race.name}
          <Show when={eventEmojis()}>{' '}<FloatingEmoji emoji={eventEmojis()![1]} /></Show>
        </h4>
        {props.race.website && <A href={props.race.website} target="_blank">
          <img src={extLinkAsset} class={styles.externalRaceLink} />
        </A>}
        <ul style={{ "list-style": "none", padding: "0" }}>
          <For each={groups()}>
            {(group) => (
              <li>
                {joinNames(group.map((a) => linkedName(a.runnerId)))}{" "}
                {renderBold(describeGroup(group))}
              </li>
            )}
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

function ParkrunExternalLink(props: { parkrun: ParkrunEvent }) {
  const event = () => getEvent(props.parkrun.eventId)
  return (
    <Show when={event()}>
      {(ev) => (
        <A href={`${ev().url}results/${props.parkrun.eventNumber}/`} target="_blank">
          <img src={extLinkAsset} class={styles.externalRaceLink} />
        </A>
      )}
    </Show>
  )
}

export function LatestResults(props: LatestResultsProps) {
  const celebrations = createMemo(() => buildCelebrationData(props.results, props.runners))

  const grouped = createMemo(() => groupResults(props.results, props.races))

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
                    <ParkrunExternalLink parkrun={parkrun} />
                    <ol>
                      <For each={parkrun.results}>
                        {(res) => {
                          const resultKey = `${res.parkrunId}:${result.date}:${parkrun.eventId}:${parkrun.eventNumber}`
                          const runnerDateKey = `${res.parkrunId}:${result.date}`
                          const memberRoute = getMemberRoute(res.parkrunId, res.name)
                          return (
                            <li>
                              <em>
                                <Show
                                  when={memberRoute}
                                  fallback={<span>{getRunnerDisplayName(res.parkrunId, res.name)}</span>}
                                >
                                  {(href) => (
                                    <A href={href()} class={styles.memberLink}>
                                      {getRunnerDisplayName(res.parkrunId, res.name)}
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
    right: '-8px',
    width: '24px',
    height: '24px',
    p: '4px',

    _hover: {
      background: '#00000018',
    }
  }),
}