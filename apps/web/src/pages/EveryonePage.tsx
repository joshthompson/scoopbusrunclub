import { createMemo, For, Show } from "solid-js"
import { css } from "@style/css"
import { A } from "@solidjs/router"
import { type RunResultItem, type Runner, type VolunteerItem } from "../utils/api"
import { type CelebrationData } from "../components/ResultCelebrations"
import { runners as runnerSignals, type RunnerName } from "@/data/runners"
import { getEvent, getEventName } from "@/utils/events"
import { formatName, parseTimeToSeconds } from "@/utils/misc"
import { getMemberRoute } from "@/utils/memberRoute"
import { DirtBlock } from "../components/ui/DirtBlock"
import { FieldBlock } from "../components/ui/FieldBlock"
import { RunnerSummaryStat } from "./RunnerSummaryStat"
import { BackSignButton } from "@/components/BackSignButton"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARKRUN_DISTANCE_KM = 5
const JUNIOR_PARKRUN_DISTANCE_KM = 2

/** All parkrun countries with flags and names */
const PARKRUN_COUNTRIES: { code: string; flag: string; name: string }[] = [
  { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "AT", flag: "🇦🇹", name: "Austria" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "DK", flag: "🇩🇰", name: "Denmark" },
  { code: "FI", flag: "🇫🇮", name: "Finland" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "IE", flag: "🇮🇪", name: "Ireland" },
  { code: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "LT", flag: "🇱🇹", name: "Lithuania" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia" },
  { code: "NA", flag: "🇳🇦", name: "Namibia" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand" },
  { code: "NO", flag: "🇳🇴", name: "Norway" },
  { code: "PL", flag: "🇵🇱", name: "Poland" },
  { code: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "SE", flag: "🇸🇪", name: "Sweden" },
  { code: "UK", flag: "🇬🇧", name: "United Kingdom" },
  { code: "US", flag: "🇺🇸", name: "United States" },
]

/** Straight-line (great-circle) distances from Stockholm */
const JOURNEY_WAYPOINTS: { name: string; km: number; emoji: string }[] = [
  { name: "Stockholm", km: 0, emoji: "🇸🇪" },
  { name: "Uppsala", km: 64, emoji: "🇸🇪" },
  { name: "Copenhagen", km: 522, emoji: "🇩🇰" },
  { name: "Berlin", km: 810, emoji: "🇩🇪" },
  { name: "London", km: 1_435, emoji: "🇬🇧" },
  { name: "Rome", km: 1_985, emoji: "🇮🇹" },
  { name: "Istanbul", km: 2_108, emoji: "🇹🇷" },
  { name: "Cairo", km: 3_212, emoji: "🇪🇬" },
  { name: "Dubai", km: 4_670, emoji: "🇦🇪" },
  { name: "Nairobi", km: 6_275, emoji: "🇰🇪" },
  { name: "Tokyo", km: 8_134, emoji: "🇯🇵" },
  { name: "Cape Town", km: 10_230, emoji: "🇿🇦" },
  { name: "Buenos Aires", km: 12_570, emoji: "🇦🇷" },
  { name: "Sydney", km: 15_590, emoji: "🇦🇺" },
  { name: "Auckland", km: 17_080, emoji: "🇳🇿" },
  { name: "Halfway around the Earth", km: 20_038, emoji: "🌍" },
  { name: "¾ around the Earth", km: 30_056, emoji: "🌍" },
  { name: "Around the Earth!", km: 40_075, emoji: "🌍" },
  { name: "To the Moon! 🚀", km: 384_400, emoji: "🌕" },
]

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function isJuniorEvent(eventId: string) {
  return getEventName(eventId).trim().toLowerCase().includes("juniors")
}

const parkrunIdToName = new Map<string, string>()
for (const [, [runner]] of Object.entries(runnerSignals)) {
  const data = runner()
  if (data.id) parkrunIdToName.set(data.id, data.name)
}

interface GroupCelebration {
  emoji: string
  label: string
  description: string
  color: string
}

function computeGroupStats(results: RunResultItem[], runners: Runner[], volunteers: VolunteerItem[]) {
  // -- Distance --
  let totalParkruns = 0
  let totalJuniorParkruns = 0

  for (const r of results) {
    if (isJuniorEvent(r.event)) {
      totalJuniorParkruns++
    } else {
      totalParkruns++
    }
  }

  const totalDistanceKm = totalParkruns * PARKRUN_DISTANCE_KM + totalJuniorParkruns * JUNIOR_PARKRUN_DISTANCE_KM

  // -- Total runs (from runner records, which include pre-tracked runs) --
  const totalRunsFromRecords = runners.reduce((sum, r) => sum + r.totalRuns + (r.totalJuniorRuns ?? 0), 0)

  // -- Unique events --
  const uniqueEvents = new Set<string>()
  for (const r of results) uniqueEvents.add(r.event)
  for (const v of volunteers) uniqueEvents.add(v.event)

  // -- Unique countries --
  const uniqueCountries = new Set<string>()
  for (const eventId of uniqueEvents) {
    const ev = getEvent(eventId)
    if (ev?.country) uniqueCountries.add(ev.country)
  }

  // -- Total volunteer sessions --
  const volunteerSessions = volunteers.length

  // -- Unique dates (Saturdays with any activity) --
  const activeDates = new Set<string>()
  for (const r of results) activeDates.add(r.date)
  for (const v of volunteers) activeDates.add(v.date)

  // -- Most popular event --
  const eventCounts = new Map<string, number>()
  for (const r of results) eventCounts.set(r.event, (eventCounts.get(r.event) ?? 0) + 1)
  let mostPopularEvent = ""
  let mostPopularCount = 0
  for (const [event, count] of eventCounts) {
    if (count > mostPopularCount) {
      mostPopularEvent = event
      mostPopularCount = count
    }
  }

  // -- Busiest Saturday --
  const dateMemberCounts = new Map<string, Set<string>>()
  for (const r of results) {
    if (!dateMemberCounts.has(r.date)) dateMemberCounts.set(r.date, new Set())
    dateMemberCounts.get(r.date)!.add(r.parkrunId)
  }
  for (const v of volunteers) {
    if (!dateMemberCounts.has(v.date)) dateMemberCounts.set(v.date, new Set())
    dateMemberCounts.get(v.date)!.add(v.parkrunId)
  }
  let busiestDate = ""
  let busiestCount = 0
  for (const [date, members] of dateMemberCounts) {
    if (members.size > busiestCount) {
      busiestDate = date
      busiestCount = members.size
    }
  }

  // -- Average attendance per Saturday --
  const avgAttendance = activeDates.size > 0 ? (results.length + volunteers.length) / activeDates.size : 0

  // -- Per-member distance contributions --
  const memberDistanceKm = new Map<string, number>()
  for (const r of results) {
    const km = isJuniorEvent(r.event) ? JUNIOR_PARKRUN_DISTANCE_KM : PARKRUN_DISTANCE_KM
    memberDistanceKm.set(r.parkrunId, (memberDistanceKm.get(r.parkrunId) ?? 0) + km)
  }

  // -- Close finishes (within 10s) --
  const dateEventKey = (r: RunResultItem) => `${r.date}:${r.event}:${r.eventNumber}`
  const resultsByEvent = new Map<string, RunResultItem[]>()
  for (const r of results) {
    const key = dateEventKey(r)
    if (!resultsByEvent.has(key)) resultsByEvent.set(key, [])
    resultsByEvent.get(key)!.push(r)
  }
  let closeFinishes = 0
  for (const eventResults of resultsByEvent.values()) {
    if (eventResults.length < 2) continue
    const sorted = eventResults.sort((a, b) => parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time))
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const diff = Math.abs(parseTimeToSeconds(sorted[i].time) - parseTimeToSeconds(sorted[j].time))
        if (diff <= 10) closeFinishes++
      }
    }
  }

  // -- Per-country stats --
  const countryVisits = new Map<string, number>() // country code -> visit count
  const countryEvents = new Map<string, Set<string>>() // country code -> unique event ids
  for (const r of results) {
    const ev = getEvent(r.event)
    if (ev?.country) {
      countryVisits.set(ev.country, (countryVisits.get(ev.country) ?? 0) + 1)
      if (!countryEvents.has(ev.country)) countryEvents.set(ev.country, new Set())
      countryEvents.get(ev.country)!.add(r.event)
    }
  }
  for (const v of volunteers) {
    const ev = getEvent(v.event)
    if (ev?.country) {
      countryVisits.set(ev.country, (countryVisits.get(ev.country) ?? 0) + 1)
      if (!countryEvents.has(ev.country)) countryEvents.set(ev.country, new Set())
      countryEvents.get(ev.country)!.add(v.event)
    }
  }

  // -- Journey progress --
  const currentWaypointIdx = JOURNEY_WAYPOINTS.findIndex((w) => w.km > totalDistanceKm)
  const prevWaypoint = currentWaypointIdx > 0 ? JOURNEY_WAYPOINTS[currentWaypointIdx - 1] : JOURNEY_WAYPOINTS[0]
  const nextWaypoint = currentWaypointIdx >= 0 ? JOURNEY_WAYPOINTS[currentWaypointIdx] : JOURNEY_WAYPOINTS[JOURNEY_WAYPOINTS.length - 1]
  const segmentProgress = nextWaypoint.km > prevWaypoint.km
    ? (totalDistanceKm - prevWaypoint.km) / (nextWaypoint.km - prevWaypoint.km)
    : 1
  const passedWaypoints = JOURNEY_WAYPOINTS.filter((w) => w.km <= totalDistanceKm)

  return {
    totalDistanceKm,
    totalParkruns,
    totalJuniorParkruns,
    totalRunsFromRecords,
    uniqueEvents: uniqueEvents.size,
    uniqueCountries: uniqueCountries.size,
    volunteerSessions,
    activeSaturdays: activeDates.size,
    mostPopularEvent,
    mostPopularCount,
    busiestDate,
    busiestCount,
    avgAttendance,
    memberDistanceKm,
    closeFinishes,
    prevWaypoint,
    nextWaypoint,
    segmentProgress,
    passedWaypoints,
    countryVisits,
    countryEvents,
  }
}

function computeGroupCelebrations(results: RunResultItem[], runners: Runner[], volunteers: VolunteerItem[]): GroupCelebration[] {
  const celebrations: GroupCelebration[] = []

  const stats = computeGroupStats(results, runners, volunteers)

  // Distance milestones
  const distanceMilestones = [100, 500, 1000, 2500, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000]
  for (const m of distanceMilestones) {
    if (stats.totalDistanceKm >= m) {
      celebrations.push({
        emoji: "🛣️",
        label: `${m.toLocaleString()} km`,
        description: `The club has collectively run ${m.toLocaleString()} km!`,
        color: "var(--green-600)",
      })
    }
  }

  // Total combined parkruns milestones
  const runMilestones = [100, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000]
  for (const m of runMilestones) {
    if (stats.totalParkruns + stats.totalJuniorParkruns >= m) {
      celebrations.push({
        emoji: "🏃",
        label: `${m.toLocaleString()} tracked runs`,
        description: `The club has ${m.toLocaleString()} tracked parkruns in total!`,
        color: "var(--blue-600)",
      })
    }
  }

  // Country milestones
  const countryMilestones = [5, 10, 15, 20]
  for (const m of countryMilestones) {
    if (stats.uniqueCountries >= m) {
      celebrations.push({
        emoji: "🌍",
        label: `${m} countries`,
        description: `The club has visited parkruns in ${m} different countries!`,
        color: "var(--amber-600)",
      })
    }
  }

  // Event milestones
  const eventMilestones = [10, 25, 50, 75, 100, 150]
  for (const m of eventMilestones) {
    if (stats.uniqueEvents >= m) {
      celebrations.push({
        emoji: "📍",
        label: `${m} different events`,
        description: `The club has visited ${m} different parkrun events!`,
        color: "var(--purple-violet)",
      })
    }
  }

  // Volunteer milestones
  const volMilestones = [50, 100, 250, 500, 1000]
  for (const m of volMilestones) {
    if (stats.volunteerSessions >= m) {
      celebrations.push({
        emoji: "🦺",
        label: `${m} volunteer sessions`,
        description: `The club has collectively volunteered ${m} times!`,
        color: "var(--green-emerald-dark)",
      })
    }
  }

  // Close finishes
  const closeMilestones = [50, 100, 250, 500, 1000]
  for (const m of closeMilestones) {
    if (stats.closeFinishes >= m) {
      celebrations.push({
        emoji: "🤝",
        label: `${m} close finishes`,
        description: `Club members have finished within 10 seconds of each other ${m} times!`,
        color: "var(--orange)",
      })
    }
  }

  // Show only the highest milestone per category
  const byEmoji = new Map<string, GroupCelebration>()
  for (const c of celebrations) {
    byEmoji.set(c.emoji, c) // last one (highest) wins
  }

  return Array.from(byEmoji.values())
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatDistance(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`
  return km.toLocaleString()
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EveryonePageProps {
  results: RunResultItem[]
  runners: Runner[]
  volunteers: VolunteerItem[]
  celebrationData?: CelebrationData
}

export function EveryonePage(props: EveryonePageProps) {
  const stats = createMemo(() => computeGroupStats(props.results, props.runners, props.volunteers))
  const celebrations = createMemo(() => computeGroupCelebrations(props.results, props.runners, props.volunteers))

  // Sort members by distance contribution
  const memberContributions = createMemo(() => {
    const distMap = stats().memberDistanceKm
    const entries: { parkrunId: string; name: string; km: number }[] = []
    for (const [parkrunId, km] of distMap) {
      const name = parkrunIdToName.get(parkrunId) ?? formatName(parkrunId)
      entries.push({ parkrunId, name, km })
    }
    // Shuffle randomly so no one is "first" — keep it non-competitive
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[entries[i], entries[j]] = [entries[j], entries[i]]
    }
    return entries
  })

  const totalMemberKm = createMemo(() => memberContributions().reduce((s, m) => s + m.km, 0))

  return (
    <div class={styles.page}>

      {/* Journey Hero */}
      <FieldBlock title="Our Journey" signType="purple">
        <div class={styles.journeyHero}>
          <div class={styles.distanceBig}>
            {stats().totalDistanceKm.toLocaleString()} km
          </div>
          <div class={styles.subtitle}>
            If you lined up every parkrun we've ever done, our runs would stretch from Stockholm to…
          </div>

          {/* Journey progress bar: 0 → next waypoint */}
          <div class={styles.journeyBar}>
            <div class={styles.journeyBarOuter}>
              <div class={styles.journeyBarTrack}>
                <div
                  class={styles.journeyBarFill}
                  style={{ width: `${Math.min((stats().totalDistanceKm / stats().nextWaypoint.km) * 100, 100)}%` }}
                />
                {/* Passed waypoint markers */}
                <For each={stats().passedWaypoints.filter(w => w.km > 0)}>
                  {(wp) => (
                    <div
                      class={styles.waypointMarker}
                      style={{ left: `${(wp.km / stats().nextWaypoint.km) * 100}%` }}
                      title={`${wp.emoji} ${wp.name} (${wp.km.toLocaleString()} km)`}
                    />
                  )}
                </For>
              </div>
            </div>
            <div class={styles.journeyLabels}>
              <span>0 km</span>
              <span>{stats().nextWaypoint.emoji} {stats().nextWaypoint.name} ({stats().nextWaypoint.km.toLocaleString()} km)</span>
            </div>
            {/* Passed cities list */}
            <Show when={stats().passedWaypoints.length > 1}>
              <div class={styles.passedList}>
                <For each={stats().passedWaypoints.filter(w => w.km > 0)}>
                  {(wp) => (
                    <span class={styles.passedChip}>
                      {wp.emoji} {wp.name} <span style={{ opacity: "0.6" }}>({wp.km.toLocaleString()} km)</span>
                    </span>
                  )}
                </For>
              </div>
            </Show>
            <div class={styles.journeyExplainer}>
              {(stats().nextWaypoint.km - stats().totalDistanceKm).toLocaleString()} km to go until {stats().nextWaypoint.name}!
            </div>
          </div>
        </div>
      </FieldBlock>

      {/* Stats grid */}
      <div class={styles.statsGrid}>
        <RunnerSummaryStat label="Tracked parkruns">{stats().totalParkruns.toLocaleString()}</RunnerSummaryStat>
        <RunnerSummaryStat label="Different events">{stats().uniqueEvents}</RunnerSummaryStat>
        <RunnerSummaryStat label="Countries visited">{stats().uniqueCountries}</RunnerSummaryStat>
        <RunnerSummaryStat label="Active Saturdays">{stats().activeSaturdays}</RunnerSummaryStat>
        <RunnerSummaryStat label="Volunteer sessions">{stats().volunteerSessions}</RunnerSummaryStat>
        <RunnerSummaryStat label="Close finishes (≤10s)">{stats().closeFinishes}</RunnerSummaryStat>
        <Show when={stats().mostPopularEvent}>
          <RunnerSummaryStat label="Most visited event" type="text">
            {getEventName(stats().mostPopularEvent)} ({stats().mostPopularCount})
          </RunnerSummaryStat>
        </Show>
        <Show when={stats().busiestDate}>
          <RunnerSummaryStat label="Busiest Saturday" type="text">
            {formatDateDisplay(stats().busiestDate)} ({stats().busiestCount} members)
          </RunnerSummaryStat>
        </Show>
      </div>

      {/* Parkrun Countries */}
      <DirtBlock title="Parkrun Countries">
        <div class={styles.countryGrid}>
          <For each={PARKRUN_COUNTRIES}>
            {(country) => {
              const visited = () => stats().countryVisits.has(country.code)
              const visits = () => stats().countryVisits.get(country.code) ?? 0
              const events = () => stats().countryEvents.get(country.code)?.size ?? 0
              return (
                <div class={styles.countryCard} classList={{ [styles.countryUnvisited]: !visited() }}>
                  <div class={styles.emoji}>{country.flag}</div>
                  <div class={styles.countryName}>{country.name}</div>
                  <Show when={visited()}>
                    <div class={styles.countryStats}>
                      {events()} {events() === 1 ? "event" : "events"} · {visits()} {visits() === 1 ? "visit" : "visits"}
                    </div>
                  </Show>
                </div>
              )
            }}
          </For>
        </div>
      </DirtBlock>

      {/* Distances */}
      <DirtBlock title="Distances">
        <div class={styles.contributionsGrid}>
          <For each={memberContributions()}>
            {(member) => {
              const route = getMemberRoute(member.parkrunId)
              const pct = totalMemberKm() > 0 ? (member.km / totalMemberKm()) * 100 : 0
              return (
                <div class={styles.contributionRow}>
                  <Show when={route} fallback={<span class={styles.memberName}>{member.name}</span>}>
                    <A href={route!} class={styles.memberNameLink}>{member.name}</A>
                  </Show>
                  <div class={styles.contributionBarTrack}>
                    <div
                      class={styles.contributionBarFill}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span class={styles.contributionKm}>{member.km} km</span>
                </div>
              )
            }}
          </For>
        </div>
      </DirtBlock>

      {/* Group celebrations */}
      <Show when={celebrations().length > 0}>
        <DirtBlock title="Group Milestones">
          <div class={styles.celebrationGrid}>
            <For each={celebrations()}>
              {(c) => (
                <div class={styles.celebrationCard}>
                  <div class={styles.celebrationEmoji}>{c.emoji}</div>
                  <div class={styles.celebrationLabel}>{c.label}</div>
                  <div class={styles.celebrationDesc}>{c.description}</div>
                </div>
              )}
            </For>
          </div>
        </DirtBlock>
      </Show>
      <BackSignButton />
    </div>
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
  }),
  journeyHero: css({
    textAlign: "center",
    padding: "1rem 0",
  }),
  distanceBig: css({
    fontSize: "3.5rem",
    fontWeight: "bold",
    lineHeight: 1.1,
    "@media (max-width: 768px)": {
      fontSize: "2.5rem",
    },
  }),
  subtitle: css({
    fontSize: "1.2rem",
    opacity: 0.8,
    marginBottom: "1.5rem",
  }),
  journeyBar: css({
    maxWidth: "600px",
    margin: "0 auto",
  }),
  journeyBarOuter: css({
    position: "relative",
  }),
  journeyBarTrack: css({
    position: "relative",
    height: "32px",
    background: "var(--overlay-black-20)",
    borderRadius: "4px",
    cornerShape: "notch",
    overflow: "hidden",
    border: "4px solid black",
  }),
  journeyBarFill: css({
    height: "100%",
    background: "var(--green-brand)",
    borderRadius: "2px",
    transition: "width 1s ease",
  }),
  waypointMarker: css({
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "2px",
    background: "var(--overlay-black-40)",
    transform: "translateX(-1px)",
    zIndex: 1,
  }),
  passedList: css({
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "0.3rem",
    marginTop: "0.5rem",
  }),
  passedChip: css({
    fontSize: "0.75rem",
    background: "rgba(0,0,0,0.12)",
    padding: "0.1rem 0.4rem",
    borderRadius: "3px",
    whiteSpace: "nowrap",
  }),
  journeyLabels: css({
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    marginTop: "0.3rem",
    opacity: 0.85,
  }),
  journeyExplainer: css({
    fontSize: "0.9rem",
    opacity: 0.7,
    marginTop: "0.5rem",
    fontStyle: "italic",
  }),
  countryGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "0.75rem",
    textAlign: "center",
  }),
  countryCard: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.15rem",
    padding: "0.5rem 0.25rem",
    borderRadius: "6px",
    background: "var(--overlay-black-8)",
  }),
  countryUnvisited: css({
    filter: "saturate(0)",
    opacity: 0.5,
  }),
  countryName: css({
    fontSize: "0.8rem",
    fontWeight: "bold",
  }),
  countryStats: css({
    fontSize: "0.7rem",
    opacity: 0.75,
  }),
  statsGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.75rem",
  }),
  contributionsGrid: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    textAlign: "left",
  }),
  contributionRow: css({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  }),
  memberName: css({
    width: "80px",
    flexShrink: 0,
    fontSize: "0.9rem",
    textAlign: "right",
  }),
  memberNameLink: css({
    width: "80px",
    flexShrink: 0,
    fontSize: "0.9rem",
    textAlign: "right",
    color: "inherit",
    textDecoration: "underline",
    fontWeight: "bold",
  }),
  contributionBarTrack: css({
    flex: 1,
    height: "14px",
    background: "var(--overlay-black-15)",
    borderRadius: "4px",
    overflow: "hidden",
  }),
  contributionBarFill: css({
    height: "100%",
    background: "var(--green-brand)",
    borderRadius: "2px",
    minWidth: "2px",
    transition: "width 0.6s ease",
  }),
  contributionKm: css({
    width: "65px",
    flexShrink: 0,
    fontSize: "0.85rem",
    textAlign: "left",
  }),
  celebrationGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "0.75rem",
    textAlign: "center",
  }),
  celebrationCard: css({
    background: "var(--overlay-black-10)",
    borderRadius: "6px",
    padding: "0.75rem",
  }),
  celebrationEmoji: css({
    fontSize: "2rem",
  }),
  celebrationLabel: css({
    fontWeight: "bold",
    fontSize: "1rem",
    marginTop: "0.25rem",
  }),
  celebrationDesc: css({
    fontSize: "0.8rem",
    opacity: 0.8,
    marginTop: "0.2rem",
  }),
  emoji: css({
    fontSize: "40px",
    my: '-10px',
  }),
}
