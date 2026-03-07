import { createMemo, For } from "solid-js"
import { FieldBlock } from "./FieldBlock"
import { css } from "@style/css"
import { type RunResultItem, type Runner } from "../utils/api"
import { formatDate, formatName, ordinal } from "@/utils/misc"
import { MILESTONE_SET, ordinalSuffix } from "../utils/milestones"

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

interface Props {
  results: RunResultItem[]
  runners: Runner[]
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

export function LatestResults(props: Props) {
  const milestoneMap = createMemo(() => buildMilestoneMap(props.results, props.runners))

  const grouped = createMemo(() => groupResults(props.results))

  return (
    <div class={styles.container}>
      <For each={grouped()}>
        {(result) => (
          <div class={styles.results}>
            <h3 class={styles.date}>{formatDate(new Date(result.date + "T00:00:00"))}</h3>
            <For each={result.parkruns}>
              {(parkrun) => (
                <FieldBlock>
                  <div class={styles.parkrun}>
                    <h4>{parkrun.name} #{parkrun.eventNumber}</h4>
                    <ul>
                      <For each={parkrun.results}>
                        {(res) => {
                          const milestone = milestoneMap().get(`${res.parkrunId}:${result.date}`)
                          return (
                            <li>
                              <em>{formatName(res.name)}</em> finished in{" "}
                              <em>{ordinal(res.position)}</em> place with a time of{" "}
                              <em>{res.time}</em>
                              {milestone !== undefined && (
                                <span class={styles.milestone}>
                                  {" - "}{ordinalSuffix(milestone)} run! 🎉
                                </span>
                              )}
                            </li>
                          )
                        }}
                      </For>
                    </ul>
                  </div>
                </FieldBlock>
              )}
            </For>
          </div>
        )}
      </For>
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
  milestone: css({
    fontWeight: 'bold',
    color: 'green.600',
    fontSize: '1.25em',
    lineHeight: 1,
  }),
}