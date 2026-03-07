import { createResource, createMemo, For, Show } from "solid-js"
import { FieldBlock } from "./FieldBlock"
import { css } from "@style/css"
import { fetchRecentResults, type RunResultItem } from "../utils/api"

interface ParkrunResult {
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

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatDate(date: Date) {
  const day = date.getDate()
  const month = date.toLocaleString('en-GB', { month: 'long' })
  return `${ordinal(day)} ${month}`
}

export function LatestResults() {
  const sinceDate = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 2)
    return d.toISOString().split("T")[0]
  })()

  const [data] = createResource(() => fetchRecentResults(sinceDate))

  const grouped = createMemo(() => {
    const items = data()
    if (!items) return []
    return groupResults(items)
  })

  return (
    <Show when={!data.loading} fallback={<div>Loading...</div>}>
      <div>
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
                          {(res) => (
                            <li>
                              <em>{res.name}</em> finished in{" "}
                              <em>{ordinal(res.position)}</em> place with a time of{" "}
                              <em>{res.time}</em>
                            </li>
                          )}
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
    </Show>
  )
}

const styles = {
  date: css({
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
}