import { css } from "@style/css"
import { createMemo, For, Show } from "solid-js"
import { A, useParams } from "@solidjs/router"
import { type RunResultItem, type Runner, type VolunteerItem } from "../utils/api"
import { getEvent, getEventName } from "@/utils/events"
import { formatDate, formatName } from "@/utils/misc"
import { DirtBlock } from "../components/ui/DirtBlock"
import { RunnerSummaryStat } from "./RunnerSummaryStat"
import { BackSignButton } from "@/components/BackSignButton"
import { NotFoundPage } from "./NotFoundPage"
import { runners as runnerSignals, type RunnerName } from "@/data/runners"
import { getMemberRoute } from "@/utils/memberRoute"
import { VOLUNTEER_EVENT_IDS } from "@shared/parkrun-events"
import { RoleTranslations } from "@/data/volunteer-roles"
import { FieldBlock } from "@/components/ui/FieldBlock"
import { Tooltip } from "@/components/ui/Tooltip"
import extLinkAsset from "@/assets/misc/ext-link.png"
import { COUNTRY_FLAGS } from "@/data/countries"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PARKRUN_KM = 5
const JUNIOR_PARKRUN_KM = 2
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const parkrunIdToRunner = new Map<string, { name: string; key: string }>()
for (const [key, [runner]] of Object.entries(runnerSignals)) {
  const data = runner()
  if (data.id) parkrunIdToRunner.set(data.id, { name: data.name, key })
}

function resolveRunnerName(parkrunId: string, fallbackName: string): string {
  return parkrunIdToRunner.get(parkrunId)?.name ?? formatName(fallbackName)
}

function translateRole(role: string): string {
  const translations = RoleTranslations as Record<string, string>
  return translations[role] ?? role
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EventPageProps {
  results: RunResultItem[]
  runners: Runner[]
  volunteers: VolunteerItem[]
}

export function EventPage(props: EventPageProps) {
  const params = useParams<{ name: string }>()

  const eventId = () => params.name
  const eventInfo = createMemo(() => getEvent(eventId()))
  const eventName = createMemo(() => getEventName(eventId()))

  const eventResults = createMemo(() =>
    props.results.filter((r) => r.event === eventId())
  )
  const hasVolunteerData = createMemo(() => VOLUNTEER_EVENT_IDS.has(eventId()))
  const eventVolunteers = createMemo(() =>
    hasVolunteerData()
      ? props.volunteers.filter((v) => v.event === eventId())
      : []
  )

  const hasData = createMemo(() => eventResults().length > 0 || eventVolunteers().length > 0)

  // ---- Core stats ----
  const totalVisits = createMemo(() => {
    const dates = new Set([
      ...eventResults().map((r) => r.date),
      ...eventVolunteers().map((v) => v.date),
    ])
    return dates.size
  })

  const totalParticipantIds = createMemo(() => {
    const all = new Set<string>()
    for (const r of eventResults()) all.add(r.parkrunId)
    for (const v of eventVolunteers()) all.add(v.parkrunId)
    return all
  })

  const eventKm = createMemo(() => eventName().toLowerCase().includes("junior") ? JUNIOR_PARKRUN_KM : PARKRUN_KM)
  const totalKm = createMemo(() => eventResults().length * eventKm())

  // ---- Date range ----
  const allDates = createMemo(() => {
    return [...new Set([
      ...eventResults().map((r) => r.date),
      ...eventVolunteers().map((v) => v.date),
    ])].sort()
  })
  const firstVisit = createMemo(() => allDates()[0])
  const lastVisit = createMemo(() => allDates()[allDates().length - 1])

  const daysSinceFirst = createMemo(() => {
    const f = firstVisit()
    if (!f) return 0
    return Math.floor((Date.now() - new Date(`${f}T00:00:00`).getTime()) / 86_400_000)
  })

  // ---- The Regular ----
  const runCountByRunner = createMemo(() => {
    const counts = new Map<string, { count: number; name: string; parkrunId: string }>()
    for (const r of eventResults()) {
      const entry = counts.get(r.parkrunId) ?? { count: 0, name: r.runnerName, parkrunId: r.parkrunId }
      entry.count++
      counts.set(r.parkrunId, entry)
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)
  })

  // ---- Volunteer Star ----
  const volunteerCounts = createMemo(() => {
    const counts = new Map<string, { count: number; name: string; parkrunId: string; roles: Set<string> }>()
    for (const v of eventVolunteers()) {
      const entry = counts.get(v.parkrunId) ?? { count: 0, name: v.volunteerName, parkrunId: v.parkrunId, roles: new Set() }
      entry.count++
      for (const role of v.roles) entry.roles.add(role)
      counts.set(v.parkrunId, entry)
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)
  })

  // ---- Longest consecutive-week streak ----
  // A streak means attending on consecutive Saturdays (7 days apart),
  // not just appearing at consecutive event numbers (which can skip weeks).
  const longestStreak = createMemo(() => {
    // Build per-participant dates
    const participantDates = new Map<string, string[]>()
    for (const r of eventResults()) {
      if (!participantDates.has(r.parkrunId)) participantDates.set(r.parkrunId, [])
      participantDates.get(r.parkrunId)!.push(r.date)
    }
    for (const v of eventVolunteers()) {
      if (!participantDates.has(v.parkrunId)) participantDates.set(v.parkrunId, [])
      participantDates.get(v.parkrunId)!.push(v.date)
    }

    let bestStreak = 0
    let bestHolders: string[] = []

    for (const [parkrunId, rawDates] of participantDates) {
      // Deduplicate and sort
      const sorted = [...new Set(rawDates)].sort()
      if (sorted.length === 0) continue

      let streak = 1
      let maxStreak = 1
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(`${sorted[i - 1]}T00:00:00`).getTime()
        const curr = new Date(`${sorted[i]}T00:00:00`).getTime()
        const daysBetween = (curr - prev) / 86_400_000
        // Consecutive weeks = exactly 7 days apart
        if (daysBetween === 7) {
          streak++
          if (streak > maxStreak) maxStreak = streak
        } else if (daysBetween > 0) {
          streak = 1
        }
        // daysBetween === 0 means same day (duplicate), skip
      }
      if (maxStreak > bestStreak) {
        bestStreak = maxStreak
        bestHolders = [parkrunId]
      } else if (maxStreak === bestStreak && bestStreak > 0) {
        bestHolders.push(parkrunId)
      }
    }
    return { count: bestStreak, holders: bestHolders }
  })

  // ---- Biggest crowd ----
  const biggestCrowd = createMemo(() => {
    const counts = new Map<number, { eventNumber: number; date: string; ids: Set<string> }>()
    for (const r of eventResults()) {
      if (!counts.has(r.eventNumber)) counts.set(r.eventNumber, { eventNumber: r.eventNumber, date: r.date, ids: new Set() })
      counts.get(r.eventNumber)!.ids.add(r.parkrunId)
    }
    for (const v of eventVolunteers()) {
      if (!counts.has(v.eventNumber)) counts.set(v.eventNumber, { eventNumber: v.eventNumber, date: v.date, ids: new Set() })
      counts.get(v.eventNumber)!.ids.add(v.parkrunId)
    }
    let best: { eventNumber: number; date: string; count: number } | null = null
    for (const entry of counts.values()) {
      if (!best || entry.ids.size > best.count) best = { eventNumber: entry.eventNumber, date: entry.date, count: entry.ids.size }
    }
    return best
  })

  // ---- Unique volunteer roles ----
  const uniqueRoles = createMemo(() => {
    const roles = new Set<string>()
    for (const v of eventVolunteers()) {
      for (const role of v.roles) roles.add(role)
    }
    return [...roles].sort()
  })

  // ---- Non-Saturday / Junior event detection ----
  const nonSaturdayDays = createMemo(() => {
    const days = new Set<string>()
    for (const d of allDates()) {
      const day = new Date(`${d}T00:00:00`).getDay()
      if (day !== 6) days.add(DAY_NAMES[day])
    }
    return [...days]
  })
  const isJunior = createMemo(() => eventName().toLowerCase().includes("junior"))

  // ---- Tourists (visited once) ----
  const tourists = createMemo(() => runCountByRunner().filter((r) => r.count === 1))

  // ---- Double duty: ran AND volunteered ----
  const doubleDuty = createMemo(() => {
    const volIds = new Set(eventVolunteers().map((v) => v.parkrunId))
    const runIds = new Set(eventResults().map((r) => r.parkrunId))
    return [...runIds].filter((id) => volIds.has(id)).map((id) => ({
      parkrunId: id,
      name: resolveRunnerName(id, id),
    }))
  })

  // ---- The OG(s): all members who attended the very first event ----
  const theOGs = createMemo(() => {
    // Combine runners and volunteers, find the earliest event number
    const allEntries: { parkrunId: string; name: string; eventNumber: number }[] = [
      ...eventResults().map((r) => ({ parkrunId: r.parkrunId, name: r.runnerName, eventNumber: r.eventNumber })),
      ...eventVolunteers().map((v) => ({ parkrunId: v.parkrunId, name: v.volunteerName, eventNumber: v.eventNumber })),
    ]
    if (allEntries.length === 0) return [] as { parkrunId: string; name: string; eventNumber: number }[]
    const minEvent = Math.min(...allEntries.map((e) => e.eventNumber))
    const seen = new Set<string>()
    return allEntries
      .filter((e) => e.eventNumber === minEvent)
      .filter((e) => { if (seen.has(e.parkrunId)) return false; seen.add(e.parkrunId); return true })
  })

  // ---- Unique months ----
  const uniqueMonths = createMemo(() => {
    const months = new Set<string>()
    for (const d of allDates()) months.add(d.slice(0, 7))
    return months.size
  })

  // ---- Best buddies: pair who showed up together the most ----
  const bestBuddies = createMemo(() => {
    const grouped = new Map<string, Set<string>>()
    for (const r of eventResults()) {
      const key = `${r.date}:${r.eventNumber}`
      if (!grouped.has(key)) grouped.set(key, new Set())
      grouped.get(key)!.add(r.parkrunId)
    }
    for (const v of eventVolunteers()) {
      const key = `${v.date}:${v.eventNumber}`
      if (!grouped.has(key)) grouped.set(key, new Set())
      grouped.get(key)!.add(v.parkrunId)
    }

    const pairCounts = new Map<string, { idA: string; idB: string; count: number }>()
    for (const ids of grouped.values()) {
      const arr = [...ids]
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const key = [arr[i], arr[j]].sort().join(":")
          const existing = pairCounts.get(key) ?? { idA: arr[i], idB: arr[j], count: 0 }
          existing.count++
          pairCounts.set(key, existing)
        }
      }
    }

    let best: { idA: string; idB: string; count: number } | null = null
    for (const entry of pairCounts.values()) {
      if (!best || entry.count > best.count) best = entry
    }
    return best
  })

  // ---- Event number range ----
  const eventNumberRange = createMemo(() => {
    const nums = eventResults().map((r) => r.eventNumber)
    if (nums.length === 0) return { min: 0, max: 0, span: 0 }
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    return { min, max, span: max - min + 1 }
  })

  // ---- All participants sorted by total appearances ----
  const allParticipants = createMemo(() => {
    const map = new Map<string, { parkrunId: string; name: string; runs: number; vols: number }>()
    for (const r of eventResults()) {
      const entry = map.get(r.parkrunId) ?? { parkrunId: r.parkrunId, name: r.runnerName, runs: 0, vols: 0 }
      entry.runs++
      map.set(r.parkrunId, entry)
    }
    for (const v of eventVolunteers()) {
      const entry = map.get(v.parkrunId) ?? { parkrunId: v.parkrunId, name: v.volunteerName, runs: 0, vols: 0 }
      entry.vols++
      map.set(v.parkrunId, entry)
    }
    return [...map.values()].sort((a, b) => (b.runs + b.vols) - (a.runs + a.vols))
  })

  // ---- Timeline: grouped by event number ----
  const timeline = createMemo(() => {
    const groups = new Map<number, { eventNumber: number; date: string; runners: RunResultItem[]; vols: VolunteerItem[] }>()
    for (const r of eventResults()) {
      if (!groups.has(r.eventNumber)) groups.set(r.eventNumber, { eventNumber: r.eventNumber, date: r.date, runners: [], vols: [] })
      groups.get(r.eventNumber)!.runners.push(r)
    }
    for (const v of eventVolunteers()) {
      if (!groups.has(v.eventNumber)) groups.set(v.eventNumber, { eventNumber: v.eventNumber, date: v.date, runners: [], vols: [] })
      groups.get(v.eventNumber)!.vols.push(v)
    }
    return [...groups.values()].sort((a, b) => b.eventNumber - a.eventNumber)
  })

  // ---- Helpers ----
  function runnerLink(parkrunId: string, name: string) {
    const displayName = resolveRunnerName(parkrunId, name)
    const route = getMemberRoute(parkrunId, displayName)
    if (route) return <A href={route} class={styles.link}>{displayName}</A>
    return <span>{displayName}</span>
  }

  function runnerFace(parkrunId: string) {
    const info = parkrunIdToRunner.get(parkrunId)
    if (!info) return null
    const runnerSignal = runnerSignals[info.key as RunnerName]
    if (!runnerSignal) return null
    const faceFrames = runnerSignal[0]().frames.face
    if (!faceFrames || faceFrames.length === 0) return null
    return <img src={faceFrames[0]} alt={info.name} class={styles.tinyFace} />
  }

  function runnerFaceTooltip(parkrunId: string, fallbackName: string) {
    const displayName = resolveRunnerName(parkrunId, fallbackName)
    const face = runnerFace(parkrunId)
    const route = getMemberRoute(parkrunId, displayName)
    if (face) {
      return (
        <Tooltip content={displayName}>
          {route ? <A href={route}>{face}</A> : face}
        </Tooltip>
      )
    }
    return route ? <A href={route} class={styles.link}>{displayName}</A> : <span>{displayName}</span>
  }

  return (
    <Show when={hasData()} fallback={<NotFoundPage />}>
      <div class={styles.page}>
        {/* Header */}
        <FieldBlock class={styles.header} title={eventName()} signType="purple">
          <Show when={eventInfo()?.country && COUNTRY_FLAGS[eventInfo()!.country]}>
            <A href="/map" class={styles.headerFlag}>{COUNTRY_FLAGS[eventInfo()!.country]}</A>
          </Show>
          <Show when={eventInfo()?.url}>
            <a href={eventInfo()!.url} target="_blank" rel="noopener noreferrer" class={styles.headerExtLink}>
              <img src={extLinkAsset} alt="parkrun page" class={styles.headerExtLinkImg} />
            </a>
          </Show>

          {/* Summary Stats */}
          <div class={styles.statsGrid}>
            <RunnerSummaryStat label="🗓️ Events Here">{totalVisits()}</RunnerSummaryStat>
            <RunnerSummaryStat label="👥 Members Involved">{totalParticipantIds().size}</RunnerSummaryStat>
            <RunnerSummaryStat label="🏃 Total Finishes">{eventResults().length}</RunnerSummaryStat>
            <RunnerSummaryStat label="📏 KMs Covered">{totalKm()}</RunnerSummaryStat>
          </div>
        </FieldBlock>

        {/* Hall of Fame */}
        <DirtBlock title="Hall of Fame">
          <div class={styles.awards}>
            <Show when={runCountByRunner().length > 0}>
              {(() => {
                const top = runCountByRunner()
                const maxCount = top[0].count
                const tied = top.filter((r) => r.count === maxCount)
                return (
                  <div class={styles.awardCard}>
                    <div class={styles.awardEmoji}>🔁</div>
                    <div class={styles.awardTitle}>{tied.length > 1 ? "The Regulars" : "The Regular"}</div>
                    <div class={styles.awardValue}>{maxCount} runs</div>
                    <div class={styles.awardDetail}>
                      <span class={styles.buddyFaces}>
                        <For each={tied}>{(r) => runnerFaceTooltip(r.parkrunId, r.name)}</For>
                      </span>
                    </div>
                  </div>
                )
              })()}
            </Show>

            <Show when={volunteerCounts().length > 0}>
              {(() => {
                const top = volunteerCounts()
                const maxCount = top[0].count
                const tied = top.filter((r) => r.count === maxCount)
                const totalRoles = new Set(tied.flatMap((r) => [...r.roles]))
                return (
                  <div class={styles.awardCard}>
                    <div class={styles.awardEmoji}>⭐</div>
                    <div class={styles.awardTitle}>{tied.length > 1 ? "Volunteer Stars" : "Volunteer Star"}</div>
                    <div class={styles.awardValue}>{maxCount}×</div>
                    <div class={styles.awardDetail}>
                      <span class={styles.buddyFaces}>
                        <For each={tied}>{(r) => runnerFaceTooltip(r.parkrunId, r.name)}</For>
                      </span>
                      <br />
                      <span class={styles.awardMeta}>{totalRoles.size} unique role{totalRoles.size !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                )
              })()}
            </Show>

            <Show when={bestBuddies() && bestBuddies()!.count > 1}>
              <div class={styles.awardCard}>
                <div class={styles.awardEmoji}>🤝</div>
                <div class={styles.awardTitle}>Best Buddies</div>
                <div class={styles.awardValue}>{bestBuddies()!.count}× together</div>
                <div class={styles.awardDetail}>
                  <span class={styles.buddyFaces}>
                    {runnerFaceTooltip(bestBuddies()!.idA, bestBuddies()!.idA)}
                    {runnerFaceTooltip(bestBuddies()!.idB, bestBuddies()!.idB)}
                  </span>
                </div>
              </div>
            </Show>

            <Show when={longestStreak().count > 1 && longestStreak().holders.length > 0}>
              <div class={styles.awardCard}>
                <div class={styles.awardEmoji}>🔥</div>
                <div class={styles.awardTitle}>{longestStreak().holders.length > 1 ? "Streak Champions" : "Streak Champion"}</div>
                <div class={styles.awardValue}>{longestStreak().count} weeks</div>
                <div class={styles.awardDetail}>
                  <span class={styles.buddyFaces}>
                    <For each={longestStreak().holders}>{(id) => runnerFaceTooltip(id, id)}</For>
                  </span>
                </div>
              </div>
            </Show>

            <Show when={theOGs().length > 0}>
              <div class={styles.awardCard}>
                <div class={styles.awardEmoji}>👑</div>
                <div class={styles.awardTitle}>{theOGs().length > 1 ? "The OGs" : "The OG"}</div>
                <div class={styles.awardValue}>#{theOGs()[0].eventNumber}</div>
                <div class={styles.awardDetail}>
                  <span class={styles.buddyFaces}>
                    <For each={theOGs()}>{(og) => runnerFaceTooltip(og.parkrunId, og.name)}</For>
                  </span>
                  <br />
                  <span class={styles.awardMeta}>First club member{theOGs().length > 1 ? "s" : ""} here</span>
                </div>
              </div>
            </Show>

            <Show when={doubleDuty().length > 0}>
              <div class={styles.awardCard}>
                <div class={styles.awardEmoji}>🦸</div>
                <div class={styles.awardTitle}>Double Duty</div>
                <div class={styles.awardValue}>{doubleDuty().length}</div>
                <div class={styles.awardDetail}>
                  <span class={styles.awardMeta}>Ran AND volunteered here</span>
                </div>
              </div>
            </Show>
          </div>
        </DirtBlock>

        {/* Fun Facts */}
        <DirtBlock title="Fun Facts">
          <div class={styles.funFacts}>
            <Show when={firstVisit()}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>📅</span>
                <span>First club visit: <strong>{formatDate(new Date(`${firstVisit()}T00:00:00`))}</strong> — that's <strong>{daysSinceFirst()} days ago!</strong></span>
              </div>
            </Show>
            <Show when={lastVisit()}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>🆕</span>
                <span>Most recent visit: <strong>{formatDate(new Date(`${lastVisit()}T00:00:00`))}</strong></span>
              </div>
            </Show>
            <Show when={biggestCrowd()}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>🎉</span>
                <span>Biggest squad: <strong>{biggestCrowd()!.count} members</strong> rocked up to #{biggestCrowd()!.eventNumber} on {formatDate(new Date(`${biggestCrowd()!.date}T00:00:00`))}</span>
              </div>
            </Show>
            <div class={styles.factItem}>
              <span class={styles.factEmoji}>📆</span>
              <span>We've been here across <strong>{uniqueMonths()} different months</strong></span>
            </div>
            <Show when={isJunior()}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>🧒</span>
                <span><strong>Junior event!</strong> parkrun for the little legends</span>
              </div>
            </Show>
            <Show when={!isJunior() && nonSaturdayDays().length > 0}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>📅</span>
                <span>Joined on a <strong>{nonSaturdayDays().join(" & ")}</strong> special event{nonSaturdayDays().length > 1 ? "s" : ""}!</span>
              </div>
            </Show>
            <Show when={eventNumberRange().span > 1}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>📊</span>
                <span>We've spanned <strong>{eventNumberRange().span} event numbers</strong> (#{eventNumberRange().min} → #{eventNumberRange().max})</span>
              </div>
            </Show>
            <Show when={tourists().length > 0}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>🧳</span>
                <span><strong>{tourists().length} member{tourists().length !== 1 ? "s" : ""}</strong> came just once — will they return? 🤔</span>
              </div>
            </Show>
            <Show when={uniqueRoles().length > 0}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>🎭</span>
                <span>We've covered <strong>{uniqueRoles().length}</strong> different volunteer roles</span>
              </div>
            </Show>
            <Show when={totalKm() > 0}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>🌍</span>
                <span>
                  That's <strong>{totalKm()} km</strong> total
                  {totalKm() >= 42 && <> — over <strong>{Math.floor(totalKm() / 42)} marathon{Math.floor(totalKm() / 42) !== 1 ? "s" : ""}</strong> worth of running!</>}
                </span>
              </div>
            </Show>
            <Show when={doubleDuty().length > 0}>
              <div class={styles.factItem}>
                <span class={styles.factEmoji}>🦸</span>
                <span>
                  Double duty heroes (ran + volunteered):{" "}
                  <For each={doubleDuty()}>
                    {(p, i) => <>{i() > 0 && ", "}{runnerLink(p.parkrunId, p.name)}</>}
                  </For>
                </span>
              </div>
            </Show>
          </div>
        </DirtBlock>

        {/* The Gang */}
        <Show when={allParticipants().length > 0}>
          <DirtBlock title="The Gang">
            <div class={styles.gangGrid}>
              <For each={allParticipants()}>
                {(p) => (
                  <div class={styles.gangMember}>
                    <div class={styles.gangFace}>{runnerFace(p.parkrunId)}</div>
                    <div class={styles.gangName}>{runnerLink(p.parkrunId, p.name)}</div>
                    <div class={styles.gangMeta}>
                      {p.runs > 0 && <span>🏃 {p.runs}</span>}
                      {p.vols > 0 && <span>🙌 {p.vols}</span>}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </DirtBlock>
        </Show>

        {/* Visit History */}
        <Show when={timeline().length > 0}>
          <DirtBlock title="Visit History">
            <div class={styles.timeline}>
              <For each={timeline()}>
                {(entry) => (
                  <div class={styles.timelineEntry}>
                    <div class={styles.timelineHeader}>
                      <strong>#{entry.eventNumber}</strong>
                      <span class={styles.timelineDate}>{formatDate(new Date(`${entry.date}T00:00:00`))}</span>
                      <span class={styles.timelineBadge}>
                        {entry.runners.length + entry.vols.length} {entry.runners.length + entry.vols.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <div class={styles.timelineParticipants}>
                      <Show when={entry.runners.length > 0}>
                        <div class={styles.timelineGroup}>
                          <span class={styles.timelineLabel}>🏃</span>
                          <For each={entry.runners}>
                            {(r) => (
                              <span class={styles.timelineChip}>
                                {runnerFace(r.parkrunId)}
                                {runnerLink(r.parkrunId, r.runnerName)}
                                <span class={styles.timelineChipMeta}>
                                  {r.time}
                                  {r.position > 0 && <> (Pos: {r.position})</>}
                                </span>
                              </span>
                            )}
                          </For>
                        </div>
                      </Show>
                      <Show when={entry.vols.length > 0}>
                        <div class={styles.timelineGroup}>
                          <span class={styles.timelineLabel}>🙌</span>
                          <For each={entry.vols}>
                            {(v) => (
                              <span class={styles.timelineChip}>
                                {runnerFace(v.parkrunId)}
                                {runnerLink(v.parkrunId, v.volunteerName)}
                                <span class={styles.timelineChipMeta}>
                                  {v.roles.map(translateRole).join(", ")}
                                </span>
                              </span>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </DirtBlock>
        </Show>

        {/* Back to home at the bottom */}
        <BackSignButton />
      </div>
    </Show>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  page: css({
    width: "calc(100% - 2rem)",
    maxWidth: "900px",
    margin: "1rem auto",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    pb: "3rem",
  }),
  header: css({
    textAlign: "center",
    position: "relative",
  }),
  headerFlag: css({
    position: "absolute",
    top: "10px",
    left: "12px",
    fontSize: "32px",
    lineHeight: 1,
    textDecoration: "none",
    cursor: "pointer",
  }),
  headerExtLink: css({
    position: "absolute",
    top: "10px",
    right: "10px",
    width: "24px",
    height: "24px",
    p: "4px",
    _hover: { background: "rgba(0,0,0,0.1)" },
  }),
  headerExtLinkImg: css({
    width: "100%",
    height: "100%",
    imageRendering: "pixelated",
  }),
  title: css({
    fontSize: "2.5rem",
    fontFamily: '"Jersey 10", sans-serif',
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    m: 0,
  }),
  link: css({
    color: "inherit",
    textDecoration: "underline",
    fontWeight: "bold",
    "&:hover": { opacity: 0.8 },
  }),
  statsGrid: css({
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    mt: '10px',
    justifyContent: "center",
  }),

  // Hall of Fame
  awards: css({
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    justifyContent: "center",
    textAlign: "center",
  }),
  awardCard: css({
    p: "1rem 0.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    width: "160px",
  }),
  awardEmoji: css({
    fontSize: "2rem",
  }),
  awardTitle: css({
    fontWeight: "bold",
    fontSize: "0.9rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    opacity: 0.7,
  }),
  awardValue: css({
    fontSize: "1.8rem",
    fontWeight: "bold",
    fontFamily: '"Jersey 10", sans-serif',
  }),
  awardDetail: css({
    fontSize: "0.9rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.15rem",
  }),
  awardMeta: css({
    fontSize: "0.8rem",
    opacity: 0.6,
  }),
  buddyFaces: css({
    display: "flex",
    gap: "0.15rem",
    justifyContent: "center",
  }),

  // Fun Facts
  funFacts: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    textAlign: "left",
  }),
  factItem: css({
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
    fontSize: "1rem",
    lineHeight: "1.5",
  }),
  factEmoji: css({
    fontSize: "1.2rem",
    flexShrink: 0,
    mt: "0.1rem",
  }),

  // The Gang
  gangGrid: css({
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    justifyContent: "center",
    textAlign: "center",
  }),
  gangMember: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.15rem",
    width: "80px",
  }),
  gangFace: css({
    fontSize: "0",
  }),
  gangName: css({
    fontSize: "0.85rem",
    fontWeight: "bold",
  }),
  gangMeta: css({
    display: "flex",
    gap: "0.35rem",
    fontSize: "0.75rem",
  }),

  tinyFace: css({
    height: "22px",
    width: "auto",
    imageRendering: "pixelated",
    verticalAlign: "middle",
  }),

  // Timeline
  timeline: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    textAlign: "left",
  }),
  timelineEntry: css({
    borderLeft: "3px solid rgba(255,255,255,0.15)",
    pl: "0.75rem",
  }),
  timelineHeader: css({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    mb: "0.25rem",
  }),
  timelineDate: css({
    fontSize: "0.85rem",
    opacity: 0.6,
  }),
  timelineBadge: css({
    fontSize: "0.75rem",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "999px",
    p: "0.1rem 0.5rem",
    opacity: 0.6,
  }),
  timelineParticipants: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  }),
  timelineGroup: css({
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.35rem",
  }),
  timelineLabel: css({
    fontSize: "1rem",
    mr: "0.1rem",
  }),
  timelineChip: css({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "6px",
    p: "0.15rem 0.5rem",
    fontSize: "0.9rem",
  }),
  timelineChipMeta: css({
    fontSize: "0.75rem",
    opacity: 0.6,
  }),
}
