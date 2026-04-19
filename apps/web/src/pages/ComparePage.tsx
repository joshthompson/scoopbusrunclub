import { createMemo, createSignal, For, Show } from "solid-js"
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
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"

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
  entries: string[] // time if ran, "Volunteer" if only volunteered, per runner
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

  const [showAddModal, setShowAddModal] = createSignal(false)

  // Runners not yet in the comparison
  const availableRunners = createMemo(() =>
    Object.entries(runnerSignals)
      .filter(([key]) => !runnerKeys().includes(key))
      .map(([key, [signal]]) => ({ key, data: signal() }))
  )

  function addRunner(key: string) {
    navigate(`/compare/${[...uniqueNames(), key.toLowerCase()].join("/")}`)
  }

  function removeRunner(key: string) {
    const remaining = uniqueNames().filter((n) => {
      const k = getRunnerKeyFromRouteName(n) ?? ""
      return k !== key
    })
    if (remaining.length < 2) return
    navigate(`/compare/${remaining.join("/")}`)
  }

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

  // Events where ALL runners were present (ran or volunteered)
  const sharedEvents = createMemo<SharedEvent[]>(() => {
    const ids = runnerIds()
    const allResults = perRunnerResults()
    if (ids.length < 2) return []

    // Build maps per runner: eventKey -> RunResultItem
    const runMaps = allResults.map((results) => {
      const m = new Map<string, RunResultItem>()
      for (const r of results) m.set(`${r.date}:${r.event}:${r.eventNumber}`, r)
      return m
    })

    // Build maps per runner: eventKey -> VolunteerItem
    const volMaps = ids.map((id) => {
      const m = new Map<string, VolunteerItem>()
      for (const v of props.volunteers) {
        if (v.parkrunId !== id) continue
        m.set(`${v.date}:${v.event}:${v.eventNumber}`, v)
      }
      return m
    })

    // Collect all event keys across all runners (runs + volunteers)
    const allKeys = new Set<string>()
    for (const m of runMaps) for (const k of m.keys()) allKeys.add(k)
    for (const m of volMaps) for (const k of m.keys()) allKeys.add(k)

    const shared: SharedEvent[] = []
    for (const key of allKeys) {
      const entries: string[] = []
      let allPresent = true
      let eventName = ""
      let eventNumber = 0
      let date = ""
      let event = ""

      for (let i = 0; i < ids.length; i++) {
        const runResult = runMaps[i].get(key)
        const volResult = volMaps[i].get(key)
        if (runResult) {
          entries.push(runResult.time)
          eventName = runResult.eventName
          eventNumber = runResult.eventNumber
          date = runResult.date
          event = runResult.event
        } else if (volResult) {
          entries.push("Volunteer")
          if (!eventName) {
            eventName = volResult.eventName
            eventNumber = volResult.eventNumber
            date = volResult.date
            event = volResult.event
          }
        } else {
          allPresent = false
          break
        }
      }
      if (!allPresent || !eventName) continue

      shared.push({ date, event, eventName, eventNumber, entries })
    }
    return shared.sort((a, b) => b.date.localeCompare(a.date))
  })

  // Finishes together: all runners within 10s of each other at same event (only counting those who ran)
  const finishesTogether = createMemo(() => {
    return sharedEvents().filter((ev) => {
      const seconds = ev.entries.filter((e) => e !== "Volunteer").map(parseTimeToSeconds).filter(Number.isFinite)
      if (seconds.length < 2) return false
      const max = Math.max(...seconds)
      const min = Math.min(...seconds)
      return max - min <= 10
    }).length
  })

  const raceTableColumns = createMemo(() => [
    { title: "Event" },
    ...names().map((n) => ({ title: n, width: "90px" })),
    { title: "", width: "40px" },
  ])

  const raceTableData = createMemo(() =>
    sharedEvents().map((ev) => {
      const formatted = new Date(`${ev.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
      return [
        <div class={styles.raceEvent}>
          <span>{ev.eventName} #{ev.eventNumber}</span>
          <span class={styles.raceDate}>{formatted}</span>
        </div>,
        ...ev.entries.map((e) => <span class={e === "Volunteer" ? styles.volunteerLabel : undefined}>{e}</span>),
        <A href={`/replay/${ev.event}/${ev.eventNumber}`} class={styles.replayBtn} title="Replay">
          ▶
        </A>,
      ]
    })
  )

  return (
    <Show when={allExist()} fallback={<NotFoundPage />}>
      <div class={styles.container}>
        <FieldBlock>
          {/* Add runner button */}
          <button class={styles.addButton} onClick={() => setShowAddModal(true)} title="Add runner">
            Edit
          </button>
          {/* Runners side by side */}
          <div class={styles.runnersRow}>
            <For each={runnerKeys()}>
              {(key, i) => (
                <>
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

        {/* Add runner modal */}
        <Show when={showAddModal()}>
          <Modal title="Edit Runners" onClose={() => setShowAddModal(false)}>
            {/* Available runners to add */}
            <Show when={availableRunners().length > 0}>
              <p class={styles.modalSectionLabel}>Add</p>
              <div class={styles.addGrid}>
                <For each={availableRunners()}>
                  {(runner) => (
                    <button class={styles.addRunnerBtn} onClick={() => addRunner(runner.key)}>
                      <img src={runner.data.frames.face[0]} class={styles.addRunnerFace} alt={runner.data.name} />
                      <span class={styles.addRunnerName}>{runner.data.name}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
            {/* Current runners with remove option */}
            <p class={styles.modalSectionLabel}>Remove</p>
            <div class={styles.addGrid}>
              <For each={runnerKeys()}>
                {(key, i) => {
                  const canRemove = () => runnerKeys().length > 2
                  return (
                    <button
                      class={canRemove() ? styles.removeRunnerBtn : styles.removeRunnerBtnDisabled}
                      onClick={() => canRemove() && removeRunner(key)}
                      disabled={!canRemove()}
                    >
                      <div class={styles.removeRunnerFaceWrap}>
                        <img src={runnerDataList()[i()]!.frames.face[0]} class={styles.addRunnerFace} alt={names()[i()]} />
                        <Show when={canRemove()}>
                          <span class={styles.removeBadge}>✕</span>
                        </Show>
                      </div>
                      <span class={styles.addRunnerName}>{names()[i()]}</span>
                    </button>
                  )
                }}
              </For>
            </div>
            <Button class={styles.closeBtn} onClick={() => setShowAddModal(false)}>Close</Button>
          </Modal>
        </Show>
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
  volunteerLabel: css({
    fontSize: "0.8rem",
    opacity: 0.7,
    fontStyle: "italic",
  }),
  link: css({
    color: "inherit",
    textDecoration: "underline",
    fontWeight: "bold",
  }),
  addButton: css({
    position: "absolute",
    top: "4px",
    right: "4px",
    width: "auto",
    px: '10px',
    height: "28px",

    background: "#00000080",
    color: "white",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    transition: "transform 0.15s ease, background 0.15s ease",
    cornerShape: 'notch',
    borderRadius: "4px",
    _hover: {
      transform: "scale(1.05)",
      background: "#000000a0",
    },
  }),
  addGrid: css({
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    justifyContent: "center",
    padding: "0.5rem 0",
  }),
  addRunnerBtn: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "inherit",
    transition: "transform 0.15s ease",
    _hover: {
      transform: "scale(1.1)",
    },
  }),
  addRunnerFace: css({
    width: "auto",
    height: "40px",
    imageRendering: "pixelated",
  }),
  addRunnerName: css({
    fontSize: "0.7rem",
    opacity: 0.8,
  }),
  modalSectionLabel: css({
    fontSize: "0.75rem",
    opacity: 0.6,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0.5rem 0 0.25rem",
  }),
  removeRunnerBtn: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "inherit",
    transition: "transform 0.15s ease",
    _hover: {
      transform: "scale(1.1)",
    },
  }),
  removeRunnerBtnDisabled: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    background: "none",
    border: "none",
    cursor: "not-allowed",
    color: "inherit",
    opacity: 0.4,
  }),
  removeRunnerFaceWrap: css({
    position: "relative",
  }),
  removeBadge: css({
    position: "absolute",
    top: "-4px",
    right: "-6px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "rgba(200,50,50,0.85)",
    color: "white",
    fontSize: "0.6rem",
    lineHeight: "16px",
    textAlign: "center",
  }),
  closeBtn: css({
    display: "block",
    margin: "0.75rem auto 0",
    padding: "0.4rem 1.5rem",
    background: "rgba(0,0,0,0.2)",
    border: "2px solid rgba(255,255,255,0.4)",
    borderRadius: "4px",
    color: "inherit",
    cursor: "pointer",
    fontSize: "0.85rem",
    _hover: {
      background: "rgba(0,0,0,0.35)",
    },
  }),
  replayBtn: css({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "4px",
    background: "rgba(0,0,0,0.15)",
    color: "inherit",
    textDecoration: "none",
    fontSize: "0.85rem",
    cursor: "pointer",
    _hover: { background: "rgba(0,0,0,0.3)" },
  }),
}
