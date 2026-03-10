import { createMemo, createSignal, For, Show } from "solid-js"
import { FieldBlock } from "./FieldBlock"
import { css, cx } from "@style/css"
import { type RunResultItem, type Runner } from "../utils/api"
import { formatDate, formatName, ordinal, parseTimeToSeconds } from "@/utils/misc"
import { MILESTONE_SET, ordinalSuffix } from "../utils/milestones"
import { FloatingEmoji } from "./FloatingEmoji"
import { DirtBlock } from "./DirtBlock"

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

  return Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, events]) => ({
      date,
      parkruns: Array.from(events.values()).map((e) => ({
        ...e,
        results: e.results.sort((a, b) => a.position - b.position),
      })),
    }))
}

interface LatestResultsProps {
  results: RunResultItem[]
  runners: Runner[]
}



// Returns a map of "parkrunId:date:eventName:eventNumber" -> "pb" | "coursePb".
// "pb" means a new overall personal best, "coursePb" means a new PB for that specific event.
function buildPBMap(results: RunResultItem[]): Map<string, "pb" | "coursePb" | "first-run"> {
  const map = new Map<string, "pb" | "coursePb" | "first-run">()

  const byRunner = new Map<string, RunResultItem[]>()
  for (const item of results) {
    if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
    byRunner.get(item.parkrunId)!.push(item)
  }

  for (const runs of byRunner.values()) {
    runs.sort((a, b) => a.date.localeCompare(b.date))
    let bestOverall = Infinity
    const bestPerCourse = new Map<string, number>()

    for (const run of runs) {
      const secs = parseTimeToSeconds(run.time)
      const bestCourse = bestPerCourse.get(run.eventName) ?? Infinity
      const key = `${run.parkrunId}:${run.date}:${run.eventName}:${run.eventNumber}`

      if (bestOverall === Infinity) {
        map.set(key, "first-run")
        bestOverall = secs
        bestPerCourse.set(run.eventName, secs)
      } else if (secs < bestOverall) {
        map.set(key, "pb")
        bestOverall = secs
        bestPerCourse.set(run.eventName, secs)
      } else if (bestCourse !== Infinity && secs < bestCourse) {
        map.set(key, "coursePb")
        bestPerCourse.set(run.eventName, secs)
      } else {
        bestPerCourse.set(run.eventName, Math.min(bestCourse, secs))
      }
    }
  }

  return map
}

function isMilestoneEvent(eventNumber: string) {
  const num = Number(eventNumber)
  return !isNaN(num) && MILESTONE_SET.has(num)
}

// Returns a map of "parkrunId:date" -> milestone number for runs where a milestone was achieved.
// Works backwards from each runner's totalRuns through the visible results to find which
// date corresponds to each milestone run number.
function buildMilestoneMap(results: RunResultItem[], runners: Runner[]): Map<string, number> {
  const totalRunsMap = new Map<string, number>()
  for (const r of runners) totalRunsMap.set(r.parkrunId, r.totalRuns)

  const byRunner = new Map<string, RunResultItem[]>()
  for (const item of results) {
    if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
    byRunner.get(item.parkrunId)!.push(item)
  }

  const map = new Map<string, number>()
  for (const [parkrunId, runs] of byRunner) {
    const totalRuns = totalRunsMap.get(parkrunId)
    if (totalRuns === undefined) continue
    // Sort ascending so index 0 is the oldest visible run
    runs.sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 0; i < runs.length; i++) {
      // Most recent run = totalRuns, second most recent = totalRuns-1, etc.
      const runNumber = totalRuns - (runs.length - 1 - i)
      if (MILESTONE_SET.has(runNumber)) {
        map.set(`${parkrunId}:${runs[i].date}`, runNumber)
      }
    }
  }
  return map
}

export function LatestResults(props: LatestResultsProps) {
  const milestoneMap = createMemo(() => buildMilestoneMap(props.results, props.runners))
  const pbMap = createMemo(() => buildPBMap(props.results))

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
            <For each={result.parkruns}>
              {(parkrun) => (
                <DirtBlock>
                  <div class={styles.parkrun}>
                    <h4 class={styles.parkrunName}>
                      {isMilestoneEvent(parkrun.eventNumber) && <FloatingEmoji emoji="🎉" flipped /> }{' '}
                      {parkrun.name}{' '}
                      #{parkrun.eventNumber}{' '}
                      {isMilestoneEvent(parkrun.eventNumber) && <FloatingEmoji emoji="🎉" /> }
                    </h4>
                    <ol>
                      <For each={parkrun.results}>
                        {(res) => {
                          const milestone = milestoneMap().get(`${res.parkrunId}:${result.date}`)
                          const pb = pbMap().get(`${res.parkrunId}:${result.date}:${parkrun.name}:${parkrun.eventNumber}`)
                          return (
                            <li>
                              <em>{formatName(res.name)}</em> finished in{" "}
                              <em>{ordinal(res.position)}</em> place with a time of{" "}
                              <em>{res.time}</em>
                              {pb === "first-run" && (
                                <span class={cx(styles.tag, styles.pb)}>Parkrun debut! <FloatingEmoji emoji="🎉" /></span>
                              )}
                              {pb === "pb" && (
                                <span class={cx(styles.tag, styles.pb)}>New PB! <FloatingEmoji emoji="🏅" /></span>
                              )}
                              {pb === "coursePb" && (
                                <span class={cx(styles.tag, styles.coursePb)}>New Course PB! <FloatingEmoji emoji="⭐" /></span>
                              )}
                              {milestone !== undefined && (
                                <span class={cx(styles.tag, styles.milestone)}>
                                  {ordinalSuffix(milestone)} run! <FloatingEmoji emoji="🎉" />
                                </span>
                              )}
                            </li>
                          )
                        }}
                      </For>
                    </ol>
                  </div>
                </DirtBlock>
              )}
            </For>
          </div>
        )}
      </For>
      <Show when={hasMore() && !showAll()}>
        <button class={styles.showMore} onClick={() => setShowAll(true)}>
          Show all results
        </button>
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
  tag: css({
    display: 'inline-block',
    background: '#FFFC',
    p: '0rem 0.3rem',
    m: '0.1rem 0.5rem',
    borderRadius: '2px',
    cornerShape: 'notch',
    fontWeight: 'bold',
    outline: '2px solid currentColor',
    outlineOffset: '-1px',
  }),
  pb: css({
    color: '#2563eb',
  }),
  coursePb: css({
    color: '#16a34a',
  }),
  milestone: css({
    color: '#db2777',
  }),
  showMore: css({
    alignSelf: 'center',
    padding: '0.5rem 1.5rem',
    border: '3px double currentColor',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    textTransform: 'uppercase',
    cornerShape: 'notch',
    borderRadius: '4px',
    _hover: {
      background: 'rgba(255, 255, 255, 0.1)',
    },
  }),
}