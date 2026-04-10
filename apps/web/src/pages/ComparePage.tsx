import { createMemo, For, Show } from "solid-js"
import { css } from "@style/css"
import { A, useParams } from "@solidjs/router"
import { runners as runnerSignals, type RunnerName } from "@/data/runners"
import { type RunResultItem, type Runner, type VolunteerItem } from "../utils/api"
import { formatName, parseTimeToSeconds } from "@/utils/misc"
import { getRunnerKeyFromRouteName, getMemberRoute } from "@/utils/memberRoute"
import { CharacterImage } from "@/components/CharacterImage"
import { FieldBlock } from "@/components/ui/FieldBlock"
import { DirtBlock } from "@/components/ui/DirtBlock"
import { BackSignButton } from "@/components/BackSignButton"
import { NotFoundPage } from "./NotFoundPage"
import { Table } from "@/components/ui/Table"

function secondsToMMSS(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

interface ComparePageProps {
  results: RunResultItem[]
  runners: Runner[]
  volunteers: VolunteerItem[]
}

interface HeadToHeadResult {
  date: string
  event: string
  eventName: string
  eventNumber: number
  time1: string
  time2: string
  winner: 1 | 2 | 0 // 0 = tie
}

export function ComparePage(props: ComparePageProps) {
  const params = useParams<{ name1: string; name2: string }>()

  const runner1Key = createMemo(() => getRunnerKeyFromRouteName(params.name1) ?? "")
  const runner2Key = createMemo(() => getRunnerKeyFromRouteName(params.name2) ?? "")
  const runner1Signal = createMemo(() => runnerSignals[runner1Key() as RunnerName])
  const runner2Signal = createMemo(() => runnerSignals[runner2Key() as RunnerName])
  const runner1Data = createMemo(() => runner1Signal()?.[0]())
  const runner2Data = createMemo(() => runner2Signal()?.[0]())
  const runner1Id = createMemo(() => runner1Data()?.id ?? "")
  const runner2Id = createMemo(() => runner2Data()?.id ?? "")

  const runner1Results = createMemo(() => props.results.filter((r) => r.parkrunId === runner1Id()))
  const runner2Results = createMemo(() => props.results.filter((r) => r.parkrunId === runner2Id()))

  const runner1TotalRuns = createMemo(() => props.runners.find((r) => r.parkrunId === runner1Id())?.totalRuns ?? runner1Results().length)
  const runner2TotalRuns = createMemo(() => props.runners.find((r) => r.parkrunId === runner2Id())?.totalRuns ?? runner2Results().length)

  const runner1Events = createMemo(() => new Set(runner1Results().map((r) => r.event)).size)
  const runner2Events = createMemo(() => new Set(runner2Results().map((r) => r.event)).size)

  const runner1Volunteered = createMemo(() => props.volunteers.filter((v) => v.parkrunId === runner1Id()).length)
  const runner2Volunteered = createMemo(() => props.volunteers.filter((v) => v.parkrunId === runner2Id()).length)

  // PBs (fastest time)
  const bestTime = (results: RunResultItem[]) => {
    let best = Infinity
    for (const r of results) {
      const s = parseTimeToSeconds(r.time)
      if (s < best) best = s
    }
    return best === Infinity ? null : best
  }
  const runner1PB = createMemo(() => bestTime(runner1Results()))
  const runner2PB = createMemo(() => bestTime(runner2Results()))

  // Head-to-head: same event + same eventNumber on same date
  const headToHead = createMemo<HeadToHeadResult[]>(() => {
    const r2Map = new Map<string, RunResultItem>()
    for (const r of runner2Results()) {
      r2Map.set(`${r.date}:${r.event}:${r.eventNumber}`, r)
    }

    const results: HeadToHeadResult[] = []
    for (const r1 of runner1Results()) {
      const key = `${r1.date}:${r1.event}:${r1.eventNumber}`
      const r2 = r2Map.get(key)
      if (!r2) continue

      const s1 = parseTimeToSeconds(r1.time)
      const s2 = parseTimeToSeconds(r2.time)
      let winner: 1 | 2 | 0 = 0
      if (Number.isFinite(s1) && Number.isFinite(s2)) {
        if (s1 < s2) winner = 1
        else if (s2 < s1) winner = 2
      }

      results.push({
        date: r1.date,
        event: r1.event,
        eventName: r1.eventName,
        eventNumber: r1.eventNumber,
        time1: r1.time,
        time2: r2.time,
        winner,
      })
    }
    return results.sort((a, b) => b.date.localeCompare(a.date))
  })

  const h2hWins1 = createMemo(() => headToHead().filter((r) => r.winner === 1).length)
  const h2hWins2 = createMemo(() => headToHead().filter((r) => r.winner === 2).length)
  const h2hTies = createMemo(() => headToHead().filter((r) => r.winner === 0).length)

  // Closest finish
  const closestFinish = createMemo(() => {
    let closest: HeadToHeadResult | null = null
    let closestDiff = Infinity
    for (const r of headToHead()) {
      const s1 = parseTimeToSeconds(r.time1)
      const s2 = parseTimeToSeconds(r.time2)
      if (!Number.isFinite(s1) || !Number.isFinite(s2)) continue
      const diff = Math.abs(s1 - s2)
      if (diff < closestDiff) {
        closestDiff = diff
        closest = r
      }
    }
    return closest ? { ...closest, diff: closestDiff } : null
  })

  const name1 = createMemo(() => runner1Data()?.name ?? params.name1)
  const name2 = createMemo(() => runner2Data()?.name ?? params.name2)

  const bothExist = createMemo(() => !!runner1Data() && !!runner2Data())

  function statWinner(v1: number | null, v2: number | null, lower = false): 0 | 1 | 2 {
    if (v1 == null || v2 == null) return 0
    if (v1 === v2) return 0
    if (lower) return v1 < v2 ? 1 : 2
    return v1 > v2 ? 1 : 2
  }

  const raceTableColumns = createMemo(() => [
    { title: "Event" },
    { title: name1(), width: "90px" },
    { title: name2(), width: "90px" },
  ])

  const raceTableData = createMemo(() =>
    headToHead().map((race) => {
      const formatted = new Date(`${race.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
      return [
        <div class={styles.raceEvent}>
          <span>{race.eventName} #{race.eventNumber}</span>
          <span class={styles.raceDate}>{formatted}</span>
        </div>,
        <span class={css({ fontWeight: race.winner === 1 ? "bold" : "normal" })}>{race.time1}</span>,
        <span class={css({ fontWeight: race.winner === 2 ? "bold" : "normal" })}>{race.time2}</span>,
      ]
    })
  )

  return (
    <Show when={bothExist()} fallback={<NotFoundPage />}>
      <div class={styles.container}>
        <FieldBlock title="Head to Head" signType="purple">
          {/* Runners side by side */}
          <div class={styles.versus}>
            <A href={`/member/${runner1Key()}`} class={styles.runnerCol}>
              <CharacterImage runner={runner1Data()!} pose="sitting" />
              <span class={styles.runnerName}>{name1()}</span>
            </A>
            <span class={styles.vsLabel}>VS</span>
            <A href={`/member/${runner2Key()}`} class={styles.runnerCol}>
              <CharacterImage runner={runner2Data()!} pose="sitting" />
              <span class={styles.runnerName}>{name2()}</span>
            </A>
          </div>

          {/* Comparison stats */}
          <div class={styles.statsTable}>
            <StatRow label="Total runs" v1={runner1TotalRuns()} v2={runner2TotalRuns()} />
            <StatRow label="Events visited" v1={runner1Events()} v2={runner2Events()} />
            <StatRow label="Volunteer times" v1={runner1Volunteered()} v2={runner2Volunteered()} />
            <StatRow
              label="PB"
              v1={runner1PB() != null ? secondsToMMSS(runner1PB()!) : "—"}
              v2={runner2PB() != null ? secondsToMMSS(runner2PB()!) : "—"}
              winner={statWinner(runner1PB(), runner2PB(), true)}
            />
            <StatRow label="H2H Wins" v1={h2hWins1()} v2={h2hWins2()} />
          </div>

          <Show when={headToHead().length > 0}>
            <div class={styles.h2hSummary}>
              <strong>{headToHead().length}</strong> race{headToHead().length !== 1 ? "s" : ""} together
              {h2hTies() > 0 && <> ({h2hTies()} tie{h2hTies() !== 1 ? "s" : ""})</>}
            </div>
          </Show>

          <Show when={closestFinish()}>
            {(cf) => (
              <div class={styles.closestFinish}>
                Closest finish: <strong>{cf().diff}s</strong> apart at {cf().eventName} #{cf().eventNumber}
              </div>
            )}
          </Show>
        </FieldBlock>

        {/* Race-by-race breakdown */}
        <Show when={headToHead().length > 0}>
          <DirtBlock title="Race History">
            <Table
              columns={raceTableColumns()}
              data={raceTableData()}
              empty="No shared races."
            />
          </DirtBlock>
        </Show>

        <BackSignButton />
      </div>
    </Show>
  )
}

function StatRow(props: { label: string; v1: number | string; v2: number | string; winner?: 0 | 1 | 2 }) {
  const w = () => {
    if (props.winner != null) return props.winner
    const n1 = typeof props.v1 === "number" ? props.v1 : NaN
    const n2 = typeof props.v2 === "number" ? props.v2 : NaN
    if (isNaN(n1) || isNaN(n2) || n1 === n2) return 0
    return n1 > n2 ? 1 : 2
  }

  return (
    <div class={styles.statRow}>
      <span class={css({ fontWeight: w() === 1 ? "bold" : "normal" })}>
        {String(props.v1)}
      </span>
      <span class={styles.statLabel}>{props.label}</span>
      <span class={css({ fontWeight: w() === 2 ? "bold" : "normal" })}>
        {String(props.v2)}
      </span>
    </div>
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
  versus: css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
    marginBottom: "1rem",
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
  vsLabel: css({
    fontSize: "2rem",
    fontWeight: "bold",
    opacity: 0.5,
    fontFamily: '"Jersey 10", sans-serif',
  }),
  statsTable: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  }),
  statRow: css({
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "0.75rem",
    alignItems: "center",
    textAlign: "center",
    "& > :first-child": { textAlign: "right" },
    "& > :last-child": { textAlign: "left" },
  }),
  statLabel: css({
    fontSize: "0.8rem",
    opacity: 0.7,
    minWidth: "100px",
  }),
  h2hSummary: css({
    textAlign: "center",
    marginTop: "0.75rem",
    fontSize: "0.9rem",
  }),
  closestFinish: css({
    textAlign: "center",
    fontSize: "0.85rem",
    opacity: 0.85,
    marginTop: "0.25rem",
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
