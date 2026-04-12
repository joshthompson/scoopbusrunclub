import { createMemo, For, Show } from "solid-js"
import { css } from "@style/css"
import { A, useParams, useNavigate } from "@solidjs/router"
import { runners as runnerSignals, type RunnerName } from "@/data/runners"
import { type RunResultItem, type Runner, type VolunteerItem } from "../utils/api"
import { parseTimeToSeconds } from "@/utils/misc"
import { getRunnerKeyFromRouteName } from "@/utils/memberRoute"
import { CharacterImage } from "@/components/CharacterImage"
import { FieldBlock } from "@/components/ui/FieldBlock"
import { DirtBlock } from "@/components/ui/DirtBlock"
import { BackSignButton } from "@/components/BackSignButton"
import { NotFoundPage } from "./NotFoundPage"
import { RunnerSummaryStat } from "./RunnerSummaryStat"
import { Table } from "@/components/ui/Table"

interface ComparePageProps {
  results: RunResultItem[]
  runners: Runner[]
  volunteers: VolunteerItem[]
}

interface SharedEvent {
  date: string
  event: string
  eventName: string
  eventNumber: number
  times: string[] // one per runner
}

export function ComparePage(props: ComparePageProps) {
  const params = useParams<{ names: string }>()
  const navigate = useNavigate()

  // Parse the wildcard path into individual runner route names
  const runnerNames = createMemo(() =>
    (params.names ?? "").split("/").filter(Boolean)
  )

  // Deduplicate: if names repeat, redirect to the unique set
  const uniqueNames = createMemo(() => [...new Set(runnerNames())])
  createMemo(() => {
    const names = runnerNames()
    const unique = uniqueNames()
    if (names.length !== unique.length) {
      navigate(`/compare/${unique.join("/")}`, { replace: true })
    }
  })

  // Resolve each name to a runner key, signal, data, and id
  const runnerKeys = createMemo(() =>
    uniqueNames().map((n) => getRunnerKeyFromRouteName(n) ?? "")
  )

  const runnerDataList = createMemo(() =>
    runnerKeys().map((key) => {
      const sig = runnerSignals[key as RunnerName]
      return sig ? sig[0]() : undefined
    })
  )

  const runnerIds = createMemo(() =>
    runnerDataList().map((d) => d?.id ?? "")
  )

  const names = createMemo(() =>
    runnerDataList().map((d, i) => d?.name ?? uniqueNames()[i])
  )

  const allExist = createMemo(() =>
    uniqueNames().length >= 2 && runnerDataList().every(Boolean)
  )

  // Per-runner results
  const perRunnerResults = createMemo(() =>
    runnerIds().map((id) => props.results.filter((r) => r.parkrunId === id))
  )

  // Combined runs: sum of each runner's total
  const combinedRuns = createMemo(() => {
    const ids = runnerIds()
    return ids.reduce((sum, id, i) => {
      const fromRunner = props.runners.find((r) => r.parkrunId === id)?.totalRuns
      return sum + (fromRunner ?? perRunnerResults()[i].length)
    }, 0)
  })

  // Combined events: union of unique event slugs across all runners
  const combinedEvents = createMemo(() => {
    const events = new Set<string>()
    for (const results of perRunnerResults()) {
      for (const r of results) events.add(r.event)
    }
    return events.size
  })

  // Volunteered together: events where ALL runners volunteered on the same date
  const volunteeredTogether = createMemo(() => {
    const ids = runnerIds()
    if (ids.length < 2) return 0
    // Build a map: "date:event" -> set of runner ids who volunteered
    const volMap = new Map<string, Set<string>>()
    for (const v of props.volunteers) {
      if (!ids.includes(v.parkrunId)) continue
      const key = `${v.date}:${v.event}`
      if (!volMap.has(key)) volMap.set(key, new Set())
      volMap.get(key)!.add(v.parkrunId)
    }
    let count = 0
    for (const runners of volMap.values()) {
      if (ids.every((id) => runners.has(id))) count++
    }
    return count
  })

  // Events where ALL runners participated (same event + eventNumber + date)
  const sharedEvents = createMemo<SharedEvent[]>(() => {
    const allResults = perRunnerResults()
    if (allResults.length < 2) return []

    // Build maps per runner: eventKey -> RunResultItem
    const maps = allResults.map((results) => {
      const m = new Map<string, RunResultItem>()
      for (const r of results) m.set(`${r.date}:${r.event}:${r.eventNumber}`, r)
      return m
    })

    // Iterate over the first runner's results, check all others have it
    const shared: SharedEvent[] = []
    for (const [key, r1] of maps[0]) {
      const matches = [r1]
      let allMatch = true
      for (let i = 1; i < maps.length; i++) {
        const ri = maps[i].get(key)
        if (!ri) { allMatch = false; break }
        matches.push(ri)
      }
      if (!allMatch) continue

      shared.push({
        date: r1.date,
        event: r1.event,
        eventName: r1.eventName,
        eventNumber: r1.eventNumber,
        times: matches.map((m) => m.time),
      })
    }
    return shared.sort((a, b) => b.date.localeCompare(a.date))
  })

  // Finishes together: all runners within 10s of each other at same event
  const finishesTogether = createMemo(() => {
    return sharedEvents().filter((ev) => {
      const seconds = ev.times.map(parseTimeToSeconds).filter(Number.isFinite)
      if (seconds.length < 2) return false
      const max = Math.max(...seconds)
      const min = Math.min(...seconds)
      return max - min <= 10
    }).length
  })

  const raceTableColumns = createMemo(() => [
    { title: "Event" },
    ...names().map((n) => ({ title: n, width: "90px" })),
  ])

  const raceTableData = createMemo(() =>
    sharedEvents().map((ev) => {
      const formatted = new Date(`${ev.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
      return [
        <div class={styles.raceEvent}>
          <span>{ev.eventName} #{ev.eventNumber}</span>
          <span class={styles.raceDate}>{formatted}</span>
        </div>,
        ...ev.times.map((t) => <span>{t}</span>),
      ]
    })
  )

  return (
    <Show when={allExist()} fallback={<NotFoundPage />}>
      <div class={styles.container}>
        <FieldBlock>
          {/* Runners side by side */}
          <div class={styles.runnersRow}>
            <For each={runnerKeys()}>
              {(key, i) => (
                <>
                  <Show when={i() > 0}>
                    <span class={styles.andLabel}>&</span>
                  </Show>
                  <A href={`/member/${key}`} class={styles.runnerCol}>
                    <div style={i() < runnerKeys().length / 2 ? { transform: "scaleX(-1)" } : {}}>
                      <CharacterImage runner={runnerDataList()[i()]!} pose="sitting" />
                    </div>
                    <span class={styles.runnerName}>{names()[i()]}</span>
                  </A>
                </>
              )}
            </For>
          </div>

          {/* Stats */}
          <div class={styles.statsGrid}>
            <RunnerSummaryStat label="Combined runs">{combinedRuns()}</RunnerSummaryStat>
            <RunnerSummaryStat label="Combined events">{combinedEvents()}</RunnerSummaryStat>
            <RunnerSummaryStat label="Events together">{sharedEvents().length}</RunnerSummaryStat>
            <RunnerSummaryStat label="Volunteered together">{volunteeredTogether()}</RunnerSummaryStat>
            <RunnerSummaryStat label="Finishes within 10s">{finishesTogether()}</RunnerSummaryStat>
          </div>
        </FieldBlock>

        {/* Race-by-race breakdown */}
        <Show when={sharedEvents().length > 0}>
          <DirtBlock title="Event History">
            <Table
              columns={raceTableColumns()}
              data={raceTableData()}
              empty="No shared events."
            />
          </DirtBlock>
        </Show>

        <BackSignButton />
      </div>
    </Show>
  )
}

const styles = {
  container: css({
    width: "calc(100% - 2rem)",
    maxWidth: "800px",
    margin: "1rem auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  }),
  runnersRow: css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  }),
  runnerCol: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    textDecoration: "none",
    color: "inherit",
  }),
  runnerName: css({
    fontSize: "1.2rem",
    fontWeight: "bold",
  }),
  andLabel: css({
    fontSize: "1.5rem",
    fontWeight: "bold",
    opacity: 0.4,
    fontFamily: '"Jersey 10", sans-serif',
  }),
  statsGrid: css({
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    alignItems: "center",
    width: "100%",
  }),
  raceEvent: css({
    display: "flex",
    flexDirection: "column",
  }),
  raceDate: css({
    fontSize: "0.75rem",
    opacity: 0.6,
  }),
  link: css({
    color: "inherit",
    textDecoration: "underline",
    fontWeight: "bold",
  }),
}
