import { css } from "@style/css"
import { createMemo, createSignal, For, Show } from "solid-js"
import { A, Navigate, useNavigate, useParams } from "@solidjs/router"
import { DirtBlock } from "../components/DirtBlock"
import { Button } from "../components/Button"
import { runners as runnerSignals } from "../components/header/runners"
import { type RunResultItem, type Runner } from "../utils/api"
import { formatDate, formatName, parseTimeToSeconds } from "@/utils/misc"
import { buildCelebrationData, CelebrationPill, getCelebrationTags } from "../components/ResultCelebrations"
import { getMemberRoute, getRunnerKeyFromRouteName } from "@/utils/memberRoute"
import { CharacterImage } from "@/components/CharacterImage"

interface MemberPageProps {
  results: RunResultItem[]
  runners: Runner[]
}

interface CelebrationOccurrence {
  eventName: string
  eventNumber: number
  date: string
  time: string
}

interface GroupedCelebration {
  name: string
  emoji: string
  color: string
  description: string
  occurrences: CelebrationOccurrence[]
}

function isPbCelebration(name: string) {
  return name === "New PB!" || (name.startsWith("New ") && name.endsWith(" PB!"))
}

function shouldShowCelebrationTime(name: string) {
  return isPbCelebration(name) || name === "Palindrome!"
}

function secondsToMMSS(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

function AchievementItem(props: { celebration: GroupedCelebration }) {
  const [showMore, setShowMore] = createSignal(false)
  const latest = () => props.celebration.occurrences[0]
  const earlier = () => props.celebration.occurrences.slice(1)
  const showTime = () => shouldShowCelebrationTime(props.celebration.name)

  return (
    <li class={styles.listItem}>
      <div class={styles.celebrationLine}>
        <CelebrationPill tag={{
          label: props.celebration.name,
          emoji: props.celebration.emoji,
          color: props.celebration.color,
          description: props.celebration.description,
        }} />
        <Show when={props.celebration.occurrences.length > 1}> × {props.celebration.occurrences.length}</Show>
      </div>
      <div>{props.celebration.description}</div>

      <div>
        <Show when={showTime()}>
          <strong>{latest().time}</strong> -{' '}
        </Show>
        Achieved at {latest().eventName} #{latest().eventNumber} on {formatDate(new Date(`${latest().date}T00:00:00`))}
        <Show when={props.celebration.occurrences.length > 1 && !showMore()}>
          <div>
            <button class={styles.showMoreInline} type="button" onClick={() => setShowMore(true)}>
              Show more
            </button>
          </div>
        </Show>
      </div>

      <Show when={showMore()}>
        <For each={earlier()}>
          {(occurrence) => (
            <div>
              <Show when={showTime()}>
                <strong>{occurrence.time}</strong> -{' '}
              </Show>
              Achieved at {occurrence.eventName} #{occurrence.eventNumber} on {formatDate(new Date(`${occurrence.date}T00:00:00`))}
            </div>
          )}
        </For>
      </Show>
    </li>
  )
}

export function MemberPage(props: MemberPageProps) {
  const params = useParams<{ name: string }>()
  const navigate = useNavigate()

  const runnerKey = createMemo(() => getRunnerKeyFromRouteName(params.name) ?? "")
  const runnerSignal = createMemo(() => runnerSignals[runnerKey()])
  const runnerData = createMemo(() => runnerSignal()?.[0]())
  const runnerId = createMemo(() => runnerData()?.id ?? "")

  const runnerResults = createMemo(() => props.results.filter((result) => result.parkrunId === runnerId()))
  const totalRuns = createMemo(() => props.runners.find((runner) => runner.parkrunId === runnerId())?.totalRuns ?? runnerResults().length)
  const totalRunsAtHaga = createMemo(() => runnerResults().filter((result) =>
    result.eventName === "Haga" && result.parkrunId === runnerId()
  ).length)
  const totalEvents = createMemo(() => new Set(runnerResults().map((result) => result.eventName)).size)
  const eventResultsMap = createMemo(() => {
    const map = new Map<string, RunResultItem[]>()
    for (const result of props.results) {
      const eventKey = `${result.date}:${result.eventName}:${result.eventNumber}`
      if (!map.has(eventKey)) map.set(eventKey, [])
      map.get(eventKey)!.push(result)
    }
    return map
  })

  const toDisplayTime = (time: string) => {
    const seconds = parseTimeToSeconds(time)
    if (!Number.isFinite(seconds)) return time
    return secondsToMMSS(seconds)
  }

  const oftenRunsWith = (withinSeconds: number) =>
    createMemo(() => {
      if (!runnerId()) return "Unknown"

      const nearbyCounts = new Map<string, number>()

      for (const myResult of runnerResults()) {
        const mySeconds = parseTimeToSeconds(myResult.time)
        if (!Number.isFinite(mySeconds)) continue

        const eventKey = `${myResult.date}:${myResult.eventName}:${myResult.eventNumber}`
        const eventResults = eventResultsMap().get(eventKey) ?? []

        for (const otherResult of eventResults) {
          if (otherResult.parkrunId === myResult.parkrunId) continue

          if (withinSeconds !== Infinity) {
            const otherSeconds = parseTimeToSeconds(otherResult.time)
            if (!Number.isFinite(otherSeconds)) continue
            if (Math.abs(otherSeconds - mySeconds) > withinSeconds) continue
          }

          nearbyCounts.set(otherResult.parkrunId, (nearbyCounts.get(otherResult.parkrunId) ?? 0) + 1)
        }
      }

      if (nearbyCounts.size === 0) return "Unknown"

      const runnerNameById = new Map(props.runners.map((runner) => [runner.parkrunId, runner.name]))
      let bestParkrunId = ""
      let bestCount = -1

      for (const [otherParkrunId, count] of nearbyCounts.entries()) {
        if (count > bestCount) {
          bestParkrunId = otherParkrunId
          bestCount = count
          continue
        }

        if (count === bestCount) {
          const currentName = formatName(runnerNameById.get(otherParkrunId) ?? "")
          const bestName = formatName(runnerNameById.get(bestParkrunId) ?? "")
          if (currentName.localeCompare(bestName) < 0) {
            bestParkrunId = otherParkrunId
          }
        }
      }

      const bestName = formatName(runnerNameById.get(bestParkrunId) ?? "")
      if (!bestName) return "Unknown"

      const countText = `${bestCount} ${bestCount === 1 ? "time" : "times"}`

      const memberRoute = getMemberRoute(bestParkrunId, bestName)
      if (!memberRoute) return `${bestName} (${countText})`

      return (
        <>
          <A href={memberRoute} class={styles.link}>{bestName}</A> ({countText})
        </>
      )
    })

  const personalBest = createMemo(() => {
    let bestSeconds = Infinity
    let bestResult: RunResultItem | null = null

    for (const result of runnerResults()) {
      const seconds = parseTimeToSeconds(result.time)
      if (seconds < bestSeconds) {
        bestSeconds = seconds
        bestResult = result
      }
    }

    if (!bestResult || !Number.isFinite(bestSeconds)) return null

    return {
      time: secondsToMMSS(bestSeconds),
      eventName: bestResult.eventName,
      eventNumber: bestResult.eventNumber,
      date: bestResult.date,
    }
  })

  const celebrationData = createMemo(() => buildCelebrationData(props.results, props.runners))

  const groupedCelebrations = createMemo<GroupedCelebration[]>(() => {
    const groups = new Map<string, GroupedCelebration>()

    for (const result of runnerResults()) {
      const resultKey = `${result.parkrunId}:${result.date}:${result.eventName}:${result.eventNumber}`
      const runnerDateKey = `${result.parkrunId}:${result.date}`
      const tags = getCelebrationTags({
        data: celebrationData(),
        resultKey,
        runnerDateKey,
        parkrunId: result.parkrunId,
        date: result.date,
      })

      for (const tag of tags) {
        const key = `${tag.label}:${tag.emoji}:${tag.description}`
        const existing = groups.get(key)
        const occurrence = {
          eventName: result.eventName,
          eventNumber: result.eventNumber,
          date: result.date,
          time: toDisplayTime(result.time),
        }

        if (!existing) {
          groups.set(key, {
            name: tag.label,
            emoji: tag.emoji,
            color: tag.color,
            description: tag.description,
            occurrences: [occurrence],
          })
          continue
        }

        existing.occurrences.push(occurrence)
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        occurrences: [...group.occurrences].sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  const pbCelebrations = createMemo(() =>
    groupedCelebrations()
      .filter((item) => isPbCelebration(item.name))
      .sort((a, b) => {
        if (a.name === "New PB!" && b.name !== "New PB!") return -1
        if (a.name !== "New PB!" && b.name === "New PB!") return 1
        return a.name.localeCompare(b.name)
      }),
  )
  const nonPbCelebrations = createMemo(() =>
    groupedCelebrations()
      .filter((item) => !isPbCelebration(item.name))
      .sort((a, b) => {
        const latestA = a.occurrences[0]?.date ?? ""
        const latestB = b.occurrences[0]?.date ?? ""
        if (latestA !== latestB) return latestB.localeCompare(latestA)
        return a.name.localeCompare(b.name)
      }),
  )

  return (
    <div class={styles.container}>
      <Show when={runnerData()} fallback={<Navigate href="/" />}>
        {(runner) => (
          <DirtBlock title={runner().name} signType="purple">
            <div class={styles.runnerSummary}>
              <CharacterImage runner={runner()} pose="sitting" />
              <Show
                when={personalBest()}
                fallback={<p>Personal Best: <strong>--:--</strong></p>}
              >
                {(pb) => (
                  <div>
                    Personal Best: <strong>{pb().time}</strong>{' '}
                    achieved at {pb().eventName} #{pb().eventNumber} on {formatDate(new Date(`${pb().date}T00:00:00`))}
                  </div>
                )}
              </Show>
              <p>
                Total runs: <strong>{totalRuns()}</strong>
              </p>
              <p>
                Total runs at Haga: <strong>{totalRunsAtHaga()}</strong>
              </p>
              <p>
                Total different events: <strong>{totalEvents()}</strong>
              </p>
              <p>Most often runs with: {oftenRunsWith(Infinity)()}</p>
              <p>Most often finishes with: {oftenRunsWith(30)()}</p>
              {runner().id && (
                <p>
                  <a href={`https://www.parkrun.se/parkrunner/${runner().id}/all`} target="_blank" rel="noopener noreferrer" class={styles.link}>
                    View {runner().name} on parkrun.se
                  </a>
                </p>
              )}
            </div>
          </DirtBlock>
        )}
      </Show>

      <div class={styles.twoColumnGrid}>
        <DirtBlock title="Celebrations">
          <Show when={nonPbCelebrations().length > 0} fallback={<p>No celebrations yet.</p>}>
            <ul class={styles.list}>
              <For each={nonPbCelebrations()}>
                {(celebration) => <AchievementItem celebration={celebration} />}
              </For>
            </ul>
          </Show>
        </DirtBlock>

        <DirtBlock title="PBs">
          <Show when={pbCelebrations().length > 0} fallback={<p>No PBs yet.</p>}>
            <ul class={styles.list}>
              <For each={pbCelebrations()}>
                {(celebration) => <AchievementItem celebration={celebration} />}
              </For>
            </ul>
          </Show>
        </DirtBlock>
      </div>

      <Button onClick={() => navigate("/")}>Back</Button>
    </div>
  )
}

const styles = {
  container: css({
    width: 'calc(100% - 2rem)',
    maxWidth: '1200px',
    margin: '1rem auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  }),
  runnerSummary: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'center',
  }),
  twoColumnGrid: css({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    alignItems: 'start',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  }),
  heading: css({
    fontSize: '2rem',
    m: 0,
  }),
  list: css({
    listStyle: 'none',
    p: 0,
    m: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  }),
  listItem: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  }),
  celebrationLine: css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
  }),
  showMoreInline: css({
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    color: 'inherit',
    textDecoration: 'underline',
    cursor: 'pointer',
    font: 'inherit',
  }),
  link: css({
    color: 'inherit',
    textDecoration: 'underline',
    fontWeight: 'bold',
  }),
}
