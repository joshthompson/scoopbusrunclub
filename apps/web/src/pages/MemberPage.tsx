import { css } from "@style/css"
import { createMemo, createSignal, For, Show } from "solid-js"
import { A, useParams } from "@solidjs/router"
import { DirtBlock } from "../components/ui/DirtBlock"
import { RunnerName, runners as runnerSignals } from '@/data/runners'
import { type RunResultItem, type Runner, type VolunteerItem } from "../utils/api"
import { formatDate, formatName, parseTimeToSeconds } from "@/utils/misc"
import { buildCelebrationData, CelebrationPill, getCelebrationTags, getVolunteerCelebrationTags, type CelebrationData, getOrBuildCelebrationData } from "../components/ResultCelebrations"
import { getMemberRoute, getRunnerKeyFromRouteName } from "@/utils/memberRoute"
import { CharacterImage } from "@/components/CharacterImage"
import { FieldBlock } from "@/components/ui/FieldBlock"
import { RunnerSummaryStat } from "./RunnerSummaryStat"
import { NotFoundPage } from "./NotFoundPage"
import { BackSignButton } from "@/components/BackSignButton"
import rock1Asset from "@/assets/misc/rock1.png"
import graphIcon from "@/assets/misc/graph-icon.png"
import { Icon } from "@/components/ui/Icon"
import { ParkrunHeatmap } from "@/components/ParkrunHeatmap"

interface MemberPageProps {
  results: RunResultItem[]
  runners: Runner[]
  volunteers: VolunteerItem[]
  celebrationData?: CelebrationData
}

interface CelebrationOccurrence {
  event: string
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
  otherRunnerId?: string
  occurrences: CelebrationOccurrence[]
}

function isPbCelebration(name: string) {
  return name === "New PB!" || (name.startsWith("New ") && name.endsWith(" PB!"))
}

function shouldShowCelebrationTime(name: string) {
  return isPbCelebration(name) || name === "Palindrome!" || name.endsWith("Palindrome Pal")
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
          otherRunnerId: props.celebration.otherRunnerId,
        }} />
        <Show when={props.celebration.occurrences.length > 1}> × {props.celebration.occurrences.length}</Show>
      </div>
      <div class={styles.celebrationDescription}>{props.celebration.description}</div>

      <Show when={latest()}>
        <div>
          <Show when={showTime()}>
            <strong>{latest().time}</strong> -{' '}
          </Show>
          Achieved at <A href={`/event/${latest().event}`} class={styles.link}>{latest().eventName}</A> #{latest().eventNumber} on {formatDate(new Date(`${latest().date}T00:00:00`))}
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
                Achieved at <A href={`/event/${occurrence.event}`} class={styles.link}>{occurrence.eventName}</A> #{occurrence.eventNumber} on {formatDate(new Date(`${occurrence.date}T00:00:00`))}
              </div>
            )}
          </For>
        </Show>
      </Show>
    </li>
  )
}

export function MemberPage(props: MemberPageProps) {
  const params = useParams<{ name: string }>()

  const runnerKey = createMemo(() => getRunnerKeyFromRouteName(params.name) ?? "")
  const runnerSignal = createMemo(() => runnerSignals[runnerKey() as RunnerName])
  const runnerData = createMemo(() => runnerSignal()?.[0]())
  const runnerId = createMemo(() => runnerData()?.id ?? "")

  const runnerResults = createMemo(() => props.results.filter((result) => result.parkrunId === runnerId()))
  const totalRuns = createMemo(() => props.runners.find((runner) => runner.parkrunId === runnerId())?.totalRuns ?? runnerResults().length)
  const totalJuniorRuns = createMemo(() => props.runners.find((runner) => runner.parkrunId === runnerId())?.totalJuniorRuns ?? 0)
  const totalRunsAtHaga = createMemo(() => runnerResults().filter((result) =>
    result.event === "haga" && result.parkrunId === runnerId()
  ).length)
  const totalEvents = createMemo(() => new Set(runnerResults().map((result) => result.event)).size)
  const runnerNameById = createMemo(() => {
    const map = new Map<string, string>()
    for (const [, [runner]] of Object.entries(runnerSignals)) {
      const data = runner()
      if (data.id) map.set(data.id, data.name)
    }

    for (const runner of props.runners) {
      if (!map.has(runner.parkrunId)) map.set(runner.parkrunId, formatName(runner.name))
    }

    return map
  })
  const eventResultsMap = createMemo(() => {
    const map = new Map<string, RunResultItem[]>()
    for (const result of props.results) {
      const eventKey = `${result.date}:${result.event}:${result.eventNumber}`
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
      if (!runnerId()) return "-"

      const nearbyCounts = new Map<string, number>()

      for (const myResult of runnerResults()) {
        const mySeconds = parseTimeToSeconds(myResult.time)
        if (!Number.isFinite(mySeconds)) continue

        const eventKey = `${myResult.date}:${myResult.event}:${myResult.eventNumber}`
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

      let bestParkrunId = ""
      let bestCount = -1

      for (const [otherParkrunId, count] of nearbyCounts.entries()) {
        if (count > bestCount) {
          bestParkrunId = otherParkrunId
          bestCount = count
          continue
        }

        if (count === bestCount) {
          const currentName = runnerNameById().get(otherParkrunId) ?? ""
          const bestName = runnerNameById().get(bestParkrunId) ?? ""
          if (currentName.localeCompare(bestName) < 0) {
            bestParkrunId = otherParkrunId
          }
        }
      }

      const bestName = runnerNameById().get(bestParkrunId) ?? ""
      if (!bestName) return "Unknown"

      const countText = `${bestCount} ${bestCount === 1 ? "time" : "times"}`

      const memberRoute = getMemberRoute(bestParkrunId, bestName)
      if (!memberRoute) return `${bestName} (${countText})`

      return (
        <>
          <A href={memberRoute} class={styles.link}>{bestName}</A><br />{countText}
        </>
      )
    })

  const celebrationData = createMemo(() => props.celebrationData ?? getOrBuildCelebrationData(props.results, props.runners))

  const groupedCelebrations = createMemo<GroupedCelebration[]>(() => {
    const groups = new Map<string, GroupedCelebration>()

    for (const result of runnerResults()) {
      const resultKey = `${result.parkrunId}:${result.date}:${result.event}:${result.eventNumber}`
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
          event: result.event,
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
            otherRunnerId: tag.otherRunnerId,
            occurrences: [occurrence],
          })
          continue
        }

        existing.occurrences.push(occurrence)
      }
    }

    // Volunteer celebrations
    const runnerVols = props.volunteers.filter((v) => v.parkrunId === runnerId())
    for (const vol of runnerVols) {
      const tags = getVolunteerCelebrationTags(celebrationData(), vol.parkrunId, vol.date, vol.event, vol.eventNumber, vol.roles)

      for (const tag of tags) {
        const key = `${tag.label}:${tag.emoji}:${tag.description}`
        const existing = groups.get(key)
        const occurrence = {
          event: vol.event,
          eventName: vol.eventName,
          eventNumber: vol.eventNumber,
          date: vol.date,
          time: "",
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
        if (a.name === "New Junior PB!" && b.name === "New PB!") return 1
        if (a.name === "New PB!" && b.name === "New Junior PB!") return -1
        if (a.name === "New Junior PB!" && b.name !== "New PB!") return -1
        if (a.name !== "New PB!" && b.name === "New Junior PB!") return 1
        if (a.name === "New PB!" && b.name !== "New PB!") return -1
        if (a.name !== "New PB!" && b.name === "New PB!") return 1
        return a.name.localeCompare(b.name)
      }),
  )
  const nonPbCelebrations = createMemo(() => {
    const items = groupedCelebrations()
      .filter((item) => !isPbCelebration(item.name))
      .sort((a, b) => {
        const latestA = a.occurrences[0]?.date ?? ""
        const latestB = b.occurrences[0]?.date ?? ""
        if (latestA !== latestB) return latestB.localeCompare(latestA)
        return a.name.localeCompare(b.name)
      })

    if (runnerKey() === "link") {
      items.unshift({
        name: "Be a good boy",
        emoji: "🐶",
        color: "var(--gold-warm)",
        description: "Achieved everyday!",
        occurrences: [],
      })
    }

    return items
  })

  const name = createMemo(() => {
    if (!runnerData()) return ""
    const possibleNames = runnerData()?.altNames ?? [runnerData().name]
    return possibleNames[Math.floor(Math.random() * possibleNames.length)]
  })

  return (
    <Show when={runnerData()} fallback={<NotFoundPage />}>
      {(runner) => (
        <div class={styles.container}>
          <FieldBlock title={name()} signType="purple">
            <A href="./graph" class={styles.rockButton}>
              <img src={rock1Asset} width={59} />
              <img src={graphIcon} class={styles.rockButtonIcon} />
              <span class={styles.rockButtonText}>View graph</span>
            </A>

            <div class={styles.runnerSummary}>
              <CharacterImage runner={runner()} pose="sitting" />
              
              <div class={styles.runnerSummaryStats}>
                <RunnerSummaryStat label="Total runs">{totalRuns()}</RunnerSummaryStat>
                {totalJuniorRuns() > 0 && <RunnerSummaryStat label="Junior runs">{totalJuniorRuns()}</RunnerSummaryStat>}
                <RunnerSummaryStat label="Haga runs">{totalRunsAtHaga()}</RunnerSummaryStat>
                <RunnerSummaryStat label="Events">{totalEvents()}</RunnerSummaryStat>
                <div class={styles.pairedStats}>
                  <RunnerSummaryStat label="Runs with" type="text">{oftenRunsWith(Infinity)()}</RunnerSummaryStat>
                  <RunnerSummaryStat label="Finishes with" type="text">{oftenRunsWith(30)()}</RunnerSummaryStat>
                </div>
              </div>
              {runner().id && <div class={styles.parkrunBlock}>
                <a href={`https://www.parkrun.se/parkrunner/${runner().id}/all`} target="_blank" rel="noopener noreferrer">
                  <span class={styles.link}>View {name()} on parkrun.se</span>
                  &nbsp;&nbsp;<Icon name="external" size="small" />
                </a>
                <div>ID: <strong>A{runner().id}</strong></div>
              </div>}
            </div>
          </FieldBlock>

          <ParkrunHeatmap parkrunId={runnerId()} results={props.results} volunteers={props.volunteers} />

          {/* Compare with another runner */}
          <DirtBlock title="Compare">
            <div class={styles.compareGrid}>
              <For each={Object.entries(runnerSignals).filter(([key]) => key !== runnerKey() && key !== "link")}>
                {([key, [signal]]) => {
                  const other = signal()
                  return (
                    <A href={`/compare/${runnerKey()}/${key.toLowerCase()}`} class={styles.compareLink}>
                      <img src={other.frames.face[0]} class={styles.compareFace} alt={other.name} />
                      <span class={styles.compareName}>{other.name}</span>
                    </A>
                  )
                }}
              </For>
            </div>
          </DirtBlock>

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
          <BackSignButton />
        </div>
      )}
    </Show>
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
  personalBest: css({
    minWidth: '80%',
    fontSize: '1.2rem',
    textAlign: 'center',
  }),
  personalBestValue: css({
    fontSize: '2rem',
    fontWeight: 'bold',
  }),
  personalBestDetails: css({
    fontSize: '1rem',
    fontWeight: 'normal',
  }),
  runnerSummaryStats: css({
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    width: '100%',
    flexWrap: 'wrap',
  }),
  pairedStats: css({
    display: 'flex',
    gap: '0.5rem',
    flex: '2',
    minWidth: '280px',
    flexWrap: 'wrap',
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
  celebrationDescription: css({
    fontWeight: 'bold',
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
  rockButton: css({
    position: 'absolute',
    top: '-15px',
    right: '0.5rem',

    transformOrigin: 'center',
    transition: 'filter 0.2s ease',
    _hover: {
      filter: 'brightness(1.2)',
    }
  }),
  rockButtonIcon: css({
    position: 'absolute',
    top: '40%',
    left: '45%',
    transform: 'translate(-50%, -50%)',
  }),
  rockButtonText: css({
    position: 'absolute',
    fontSize: '0.75rem',
  }),
  compareGrid: css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    justifyContent: 'center',
  }),
  compareLink: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.2rem',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.15s ease',
    _hover: {
      transform: 'scale(1.1)',
    },
  }),
  compareFace: css({
    width: 'auto',
    height: '40px',
    imageRendering: 'pixelated',
  }),
  compareName: css({
    fontSize: '0.7rem',
    opacity: 0.8,
  }),
  parkrunBlock: css({
    bottom: '20px',
    right: '20px',
    backgroundColor: '#9EC681',
    p: '4px 12px',
    mb: '-8px',
    zIndex: 1,
    alignSelf: 'flex-end',
    borderRadius: '4px',
    cornerShape: 'notch',
  }),
}
