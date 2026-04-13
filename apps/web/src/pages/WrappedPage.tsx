import { createMemo, For, Show } from "solid-js"
import { css } from "@style/css"
import { A, useParams, useNavigate } from "@solidjs/router"
import { type RunResultItem, type Runner, type VolunteerItem } from "../utils/api"
import { runners as runnerSignals } from "@/data/runners"
import { getEvent, getEventName } from "@/utils/events"
import { formatName, parseTimeToSeconds } from "@/utils/misc"
import { getMemberRoute } from "@/utils/memberRoute"
import { FieldBlock } from "../components/ui/FieldBlock"
import { BackSignButton } from "@/components/BackSignButton"
import { CharacterImage } from "@/components/CharacterImage"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIRST_YEAR = 2012

const parkrunIdToMeta = new Map<string, { name: string; key: string }>()
for (const [key, [runner]] of Object.entries(runnerSignals)) {
  const data = runner()
  if (data.id) parkrunIdToMeta.set(data.id, { name: data.name, key })
}

function isJuniorEvent(eventId: string) {
  return getEventName(eventId).trim().toLowerCase().includes("juniors")
}

/** Joins names with commas and "and": ["Josh"] → "Josh", ["Josh", "Rick"] → "Josh and Rick", ["Josh", "Eline", "Rick"] → "Josh, Eline and Rick" */
function joinNames(names: string[]): string {
  if (names.length === 0) return ""
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

function getLatestAvailableYear(): number {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed
  // In December, the current year becomes available
  return currentMonth === 11 ? currentYear : currentYear - 1
}

function getAvailableYears(): number[] {
  const latest = getLatestAvailableYear()
  const years: number[] = []
  for (let y = latest; y >= FIRST_YEAR; y--) years.push(y)
  return years
}

/** Check if we're currently in December (for the banner) */
export function isDecember(): boolean {
  return new Date().getMonth() === 11
}

export function getWrappedBannerYear(): number {
  return new Date().getFullYear()
}

// ---------------------------------------------------------------------------
// Year stats computation
// ---------------------------------------------------------------------------

interface WrappedStats {
  year: number
  hasData: boolean
  totalRuns: number
  totalJuniorRuns: number
  totalDistanceKm: number
  uniqueEvents: number
  uniqueCountries: number
  volunteerSessions: number
  activeSaturdays: number
  activeMembers: number

  // Fun facts
  busiestSaturday: { date: string; count: number; events: { name: string; eventNumber: number }[] } | null
  mostExploredMember: { names: string[]; events: number } | null
  mostVolunteeredMember: { names: string[]; count: number } | null
  newEventsDiscovered: number
  closeFinishes: number
  mostCommonCloseFinishPair: { nameA: string; nameB: string; count: number } | null

  // Per-member summaries
  memberStats: {
    parkrunId: string
    name: string
    runs: number
    events: number
    newEvents: number
    volunteered: number
  }[]

  // Top new events
  newEventsList: { eventId: string; name: string; country: string; discoveredBy: string }[]

  // Celebrations count (approximate — how many achievements were earned this year)
  totalAchievements: number

  // Members who debuted this year (first-ever parkrun result)
  debutMembers: { name: string; key: string; date: string }[]
}

function computeWrappedStats(
  year: number,
  allResults: RunResultItem[],
  allRunners: Runner[],
  allVolunteers: VolunteerItem[],
  allResultsPriorYears: RunResultItem[]
): WrappedStats {
  const yearStr = String(year)
  const results = allResults.filter((r) => r.date.startsWith(yearStr))
  const volunteers = allVolunteers.filter((v) => v.date.startsWith(yearStr))

  if (results.length === 0 && volunteers.length === 0) {
    return {
      year,
      hasData: false,
      totalRuns: 0,
      totalJuniorRuns: 0,
      totalDistanceKm: 0,
      uniqueEvents: 0,
      uniqueCountries: 0,
      volunteerSessions: 0,
      activeSaturdays: 0,
      activeMembers: 0,
      busiestSaturday: null,
      mostExploredMember: null,
      mostVolunteeredMember: null,
      newEventsDiscovered: 0,
      closeFinishes: 0,
      mostCommonCloseFinishPair: null,
      memberStats: [],
      newEventsList: [],
      totalAchievements: 0,
      debutMembers: [],
    }
  }

  let totalRuns = 0
  let totalJuniorRuns = 0
  for (const r of results) {
    if (isJuniorEvent(r.event)) totalJuniorRuns++
    else totalRuns++
  }

  const totalDistanceKm = totalRuns * 5 + totalJuniorRuns * 2

  // Unique events and countries
  const uniqueEventSet = new Set<string>()
  for (const r of results) uniqueEventSet.add(r.event)
  for (const v of volunteers) uniqueEventSet.add(v.event)

  const uniqueCountrySet = new Set<string>()
  for (const eventId of uniqueEventSet) {
    const ev = getEvent(eventId)
    if (ev?.country) uniqueCountrySet.add(ev.country)
  }

  // Active dates and members
  const activeDates = new Set<string>()
  const activeMembers = new Set<string>()
  for (const r of results) {
    activeDates.add(r.date)
    activeMembers.add(r.parkrunId)
  }
  for (const v of volunteers) {
    activeDates.add(v.date)
    activeMembers.add(v.parkrunId)
  }

  // Busiest date
  const dateMembers = new Map<string, Set<string>>()
  const dateEvents = new Map<string, Map<string, number>>() // date -> eventId -> eventNumber
  for (const r of results) {
    if (!dateMembers.has(r.date)) dateMembers.set(r.date, new Set())
    dateMembers.get(r.date)!.add(r.parkrunId)
    if (!dateEvents.has(r.date)) dateEvents.set(r.date, new Map())
    dateEvents.get(r.date)!.set(r.event, r.eventNumber)
  }
  for (const v of volunteers) {
    if (!dateMembers.has(v.date)) dateMembers.set(v.date, new Set())
    dateMembers.get(v.date)!.add(v.parkrunId)
    if (!dateEvents.has(v.date)) dateEvents.set(v.date, new Map())
    dateEvents.get(v.date)!.set(v.event, v.eventNumber)
  }

  let busiestSaturday: WrappedStats["busiestSaturday"] = null
  for (const [date, members] of dateMembers) {
    if (!busiestSaturday || members.size > busiestSaturday.count) {
      const evMap = dateEvents.get(date) ?? new Map()
      const events = Array.from(evMap.entries()).map(([eventId, eventNumber]) => ({
        name: getEventName(eventId),
        eventNumber,
      }))
      busiestSaturday = { date, count: members.size, events }
    }
  }

  // Per-member stats
  const memberRunCounts = new Map<string, number>()
  const memberEventSets = new Map<string, Set<string>>()
  const memberVolCounts = new Map<string, number>()

  for (const r of results) {
    memberRunCounts.set(r.parkrunId, (memberRunCounts.get(r.parkrunId) ?? 0) + 1)
    if (!memberEventSets.has(r.parkrunId)) memberEventSets.set(r.parkrunId, new Set())
    memberEventSets.get(r.parkrunId)!.add(r.event)
  }
  for (const v of volunteers) {
    memberVolCounts.set(v.parkrunId, (memberVolCounts.get(v.parkrunId) ?? 0) + 1)
  }

  // Events visited before this year
  const priorEvents = new Map<string, Set<string>>() // parkrunId -> set of eventIds
  for (const r of allResultsPriorYears) {
    if (r.date >= yearStr) continue
    if (!priorEvents.has(r.parkrunId)) priorEvents.set(r.parkrunId, new Set())
    priorEvents.get(r.parkrunId)!.add(r.event)
  }

  const globalPriorEvents = new Set<string>()
  for (const r of allResultsPriorYears) {
    if (r.date >= yearStr) globalPriorEvents.add(r.event)
  }

  // New events this year
  const newEventsList: WrappedStats["newEventsList"] = []
  const newEventsSet = new Set<string>()
  for (const r of results) {
    if (!globalPriorEvents.has(r.event) && !newEventsSet.has(r.event)) {
      newEventsSet.add(r.event)
      const ev = getEvent(r.event)
      newEventsList.push({
        eventId: r.event,
        name: r.eventName || getEventName(r.event),
        country: ev?.country ?? "??",
        discoveredBy: parkrunIdToMeta.get(r.parkrunId)?.name ?? formatName(r.runnerName),
      })
    }
  }

  const memberNewEvents = new Map<string, number>()
  for (const r of results) {
    const prior = priorEvents.get(r.parkrunId)
    if (!prior || !prior.has(r.event)) {
      // Check we haven't already counted this event for this member this year
      const key = `${r.parkrunId}:${r.event}`
      if (!memberNewEvents.has(key)) {
        memberNewEvents.set(key, 1)
        // Accumulate per member
      }
    }
  }
  const memberNewEventCounts = new Map<string, number>()
  for (const key of memberNewEvents.keys()) {
    const parkrunId = key.split(":")[0]
    memberNewEventCounts.set(parkrunId, (memberNewEventCounts.get(parkrunId) ?? 0) + 1)
  }

  // Most explored member(s) — ties included
  let mostExploredMember: WrappedStats["mostExploredMember"] = null
  for (const [id, events] of memberEventSets) {
    const count = events.size
    const name = parkrunIdToMeta.get(id)?.name ?? id
    if (!mostExploredMember || count > mostExploredMember.events) {
      mostExploredMember = { names: [name], events: count }
    } else if (count === mostExploredMember.events) {
      mostExploredMember.names.push(name)
    }
  }

  // Most volunteered member(s) — ties included
  let mostVolunteeredMember: WrappedStats["mostVolunteeredMember"] = null
  for (const [id, count] of memberVolCounts) {
    const name = parkrunIdToMeta.get(id)?.name ?? id
    if (!mostVolunteeredMember || count > mostVolunteeredMember.count) {
      mostVolunteeredMember = { names: [name], count }
    } else if (count === mostVolunteeredMember.count) {
      mostVolunteeredMember.names.push(name)
    }
  }

  // Close finishes
  const eventResultsMap = new Map<string, RunResultItem[]>()
  for (const r of results) {
    const key = `${r.date}:${r.event}:${r.eventNumber}`
    if (!eventResultsMap.has(key)) eventResultsMap.set(key, [])
    eventResultsMap.get(key)!.push(r)
  }

  let closeFinishes = 0
  const closePairCount = new Map<string, number>()
  for (const evResults of eventResultsMap.values()) {
    if (evResults.length < 2) continue
    for (let i = 0; i < evResults.length; i++) {
      for (let j = i + 1; j < evResults.length; j++) {
        const diff = Math.abs(
          parseTimeToSeconds(evResults[i].time) - parseTimeToSeconds(evResults[j].time)
        )
        if (diff <= 10) {
          closeFinishes++
          const a = evResults[i].parkrunId
          const b = evResults[j].parkrunId
          const pk = a < b ? `${a}|${b}` : `${b}|${a}`
          closePairCount.set(pk, (closePairCount.get(pk) ?? 0) + 1)
        }
      }
    }
  }

  let mostCommonCloseFinishPair: WrappedStats["mostCommonCloseFinishPair"] = null
  for (const [pk, count] of closePairCount) {
    if (!mostCommonCloseFinishPair || count > mostCommonCloseFinishPair.count) {
      const [idA, idB] = pk.split("|")
      mostCommonCloseFinishPair = {
        nameA: parkrunIdToMeta.get(idA)?.name ?? idA,
        nameB: parkrunIdToMeta.get(idB)?.name ?? idB,
        count,
      }
    }
  }

  // Build member stats list
  const memberStats: WrappedStats["memberStats"] = []
  for (const id of activeMembers) {
    const meta = parkrunIdToMeta.get(id)
    memberStats.push({
      parkrunId: id,
      name: meta?.name ?? formatName(id),
      runs: memberRunCounts.get(id) ?? 0,
      events: memberEventSets.get(id)?.size ?? 0,
      newEvents: memberNewEventCounts.get(id) ?? 0,
      volunteered: memberVolCounts.get(id) ?? 0,
    })
  }
  memberStats.sort((a, b) => b.runs - a.runs) // Sort by runs, just for ordering

  // Approximate total achievements = PBs + milestones (rough estimate from first-year runners etc.)
  // Keep it simple: count milestones as "interesting things"
  const totalAchievements = newEventsSet.size + closeFinishes + (volunteers.length > 0 ? 1 : 0)

  // Debut members — members whose first-ever result in the full dataset falls in this year
  const firstResultDate = new Map<string, string>()
  for (const r of allResultsPriorYears) {
    const id = r.parkrunId
    if (!parkrunIdToMeta.has(id)) continue
    const existing = firstResultDate.get(id)
    if (!existing || r.date < existing) firstResultDate.set(id, r.date)
  }
  // Also check volunteers for first appearance
  for (const v of allVolunteers) {
    const id = v.parkrunId
    if (!parkrunIdToMeta.has(id)) continue
    const existing = firstResultDate.get(id)
    if (!existing || v.date < existing) firstResultDate.set(id, v.date)
  }

  const debutMembers: WrappedStats["debutMembers"] = []
  for (const [id, date] of firstResultDate) {
    if (date.startsWith(yearStr)) {
      const meta = parkrunIdToMeta.get(id)
      if (meta) debutMembers.push({ name: meta.name, key: meta.key, date })
    }
  }
  debutMembers.sort((a, b) => a.date.localeCompare(b.date))

  return {
    year,
    hasData: true,
    totalRuns,
    totalJuniorRuns,
    totalDistanceKm,
    uniqueEvents: uniqueEventSet.size,
    uniqueCountries: uniqueCountrySet.size,
    volunteerSessions: volunteers.length,
    activeSaturdays: activeDates.size,
    activeMembers: activeMembers.size,
    busiestSaturday,
    mostExploredMember,
    mostVolunteeredMember,
    newEventsDiscovered: newEventsSet.size,
    closeFinishes,
    mostCommonCloseFinishPair,
    memberStats,
    newEventsList,
    totalAchievements,
    debutMembers,
  }
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

// ---------------------------------------------------------------------------
// Wrapped Card Component
// ---------------------------------------------------------------------------

function WrappedCard(props: { emoji: string; children: any; color?: string }) {
  return (
    <div class={cardStyles.card} style={{ "border-left": `4px solid ${props.color ?? "#6abf4b"}` }}>
      <span class={cardStyles.emoji}>{props.emoji}</span>
      <div class={cardStyles.content}>{props.children}</div>
    </div>
  )
}

const cardStyles = {
  card: css({
    background: "rgba(0,0,0,0.12)",
    borderRadius: "8px",
    padding: "1rem 1.2rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
  }),
  emoji: css({
    fontSize: "2rem",
    lineHeight: 1,
    flexShrink: 0,
  }),
  content: css({
    flex: 1,
    "& strong": {
      fontSize: "1.1rem",
    },
  }),
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface WrappedPageProps {
  results: RunResultItem[]
  runners: Runner[]
  volunteers: VolunteerItem[]
}

export function WrappedPage(props: WrappedPageProps) {
  const params = useParams<{ year: string }>()
  const navigate = useNavigate()

  const parsedYear = createMemo(() => {
    const y = parseInt(params.year, 10)
    if (isNaN(y) || y < FIRST_YEAR || y > getLatestAvailableYear()) return null
    return y
  })

  // If no valid year, redirect to latest
  createMemo(() => {
    if (params.year && !parsedYear()) {
      navigate(`/wrapped/${getLatestAvailableYear()}`, { replace: true })
    }
  })

  const year = createMemo(() => parsedYear() ?? getLatestAvailableYear())

  const stats = createMemo(() =>
    computeWrappedStats(year(), props.results, props.runners, props.volunteers, props.results)
  )

  const availableYears = createMemo(() => getAvailableYears())

  return (
    <div class={pageStyles.page}>
      {/* Year selector */}
      <div class={pageStyles.yearNav}>
        <For each={availableYears()}>
          {(y) => (
            <A
              href={`/wrapped/${y}`}
              class={y === year() ? pageStyles.yearActive : pageStyles.yearLink}
            >
              {y}
            </A>
          )}
        </For>
      </div>

      <FieldBlock title={`Scoop Bus Wrapped ${year()}`} signType="wooden">
        <Show when={stats().hasData} fallback={
          <div class={pageStyles.noData}>
            <p>No data available for {year()}</p>
            <p style={{ "font-size": "0.9rem", opacity: "0.7" }}>The club might not have been active this year, or we don't have records going back this far.</p>
          </div>
        }>
          <div class={pageStyles.cardsGrid}>
            {/* Debut members */}
            <Show when={stats().debutMembers.length > 0}>
              <div class={pageStyles.debutBlock}>
                <div class={pageStyles.debutTitle}>🎉 Welcome to Scoop Bus!</div>
                <div class={pageStyles.debutSubtitle}>
                  {stats().debutMembers.length === 1 ? "This member" : "These members"} debuted in {year()}
                </div>
                <div class={pageStyles.debutGrid}>
                  <For each={stats().debutMembers}>
                    {(m) => {
                      const runnerSig = runnerSignals[m.key as keyof typeof runnerSignals]
                      const route = getMemberRoute(
                        Object.entries(parkrunIdToMeta).find(([_, meta]) => meta.key === m.key)?.[0] ?? ""
                      )
                      return (
                        <div class={pageStyles.debutMember}>
                          <Show when={runnerSig}>
                            <CharacterImage runner={runnerSig![0]()} pose="sitting" />
                          </Show>
                          <Show when={route} fallback={<strong>{m.name}</strong>}>
                            <A href={route!} class={pageStyles.memberLink}><strong>{m.name}</strong></A>
                          </Show>
                          <div class={pageStyles.debutDate}>{formatDateDisplay(m.date)}</div>
                        </div>
                      )
                    }}
                  </For>
                </div>
              </div>
            </Show>

            {/* Total runs */}
            <WrappedCard emoji="🏃" color="#2563eb">
              <div>
                In {year()}, Scoop Bus completed{" "}
                <strong>{stats().totalRuns.toLocaleString()} parkruns</strong>
                <Show when={stats().totalJuniorRuns > 0}>
                  {" "}and <strong>{stats().totalJuniorRuns} junior parkruns</strong>
                </Show>
              </div>
            </WrappedCard>

            {/* Distance */}
            <WrappedCard emoji="🛣️" color="#16a34a">
              <div>
                That's <strong>{stats().totalDistanceKm.toLocaleString()} km</strong> run together
              </div>
            </WrappedCard>

            {/* Events and countries */}
            <WrappedCard emoji="🌍" color="#d97706">
              <div>
                Across <strong>{stats().uniqueEvents} different events</strong> in{" "}
                <strong>{stats().uniqueCountries} {stats().uniqueCountries === 1 ? "country" : "countries"}</strong>
              </div>
            </WrappedCard>

            {/* Active Saturdays */}
            <WrappedCard emoji="📅" color="#7c3aed">
              <div>
                <strong>{stats().activeMembers} members</strong> were active across{" "}
                <strong>{stats().activeSaturdays} Saturdays</strong>
              </div>
            </WrappedCard>

            {/* Busiest day */}
            <Show when={stats().busiestSaturday}>
              {(() => {
                const b = stats().busiestSaturday!
                const d = new Date(`${b.date}T00:00:00`)
                const isSaturday = d.getDay() === 6
                const eventLabel = b.events.map((e) => `${e.name} #${e.eventNumber}`).join(", ")
                return (
                  <WrappedCard emoji="🎉" color="#e11d48">
                    <div>
                      The busiest {isSaturday ? "Saturday" : "event"} was <strong>{formatDateDisplay(b.date)}</strong> with{" "}
                      <strong>{b.count} members</strong> at {eventLabel}
                    </div>
                  </WrappedCard>
                )
              })()}
            </Show>

            {/* Volunteering */}
            <Show when={stats().volunteerSessions > 0}>
              <WrappedCard emoji="🦺" color="#059669">
                <div>
                  The club volunteered <strong>{stats().volunteerSessions} times</strong>
                  <Show when={stats().mostVolunteeredMember}>
                    . Thank you <strong>{joinNames(stats().mostVolunteeredMember!.names)}</strong> for leading with{" "}
                    {stats().mostVolunteeredMember!.count} sessions!
                  </Show>
                </div>
              </WrappedCard>
            </Show>

            {/* New events discovered */}
            <Show when={stats().newEventsDiscovered > 0}>
              <WrappedCard emoji="📍" color="#0891b2">
                <div>
                  <strong>{stats().newEventsDiscovered} new events</strong> were discovered this year
                  <Show when={stats().mostExploredMember}>
                    . <strong>{joinNames(stats().mostExploredMember!.names)}</strong> visited the most with {stats().mostExploredMember!.events} events
                  </Show>
                </div>
              </WrappedCard>
            </Show>

            {/* Close finishes */}
            <Show when={stats().closeFinishes > 0}>
              <WrappedCard emoji="🤝" color="#e67e22">
                <div>
                  <strong>{stats().closeFinishes} close finishes</strong> within 10 seconds of each other
                  <Show when={stats().mostCommonCloseFinishPair}>
                    . {stats().mostCommonCloseFinishPair!.nameA} &{" "}
                    {stats().mostCommonCloseFinishPair!.nameB} were the closest pair ({stats().mostCommonCloseFinishPair!.count} times)
                  </Show>
                </div>
              </WrappedCard>
            </Show>
          </div>

          {/* New events list */}
          <Show when={stats().newEventsList.length > 0}>
            <div class={pageStyles.section}>
              <h3 class={pageStyles.sectionTitle}>New Events Discovered</h3>
              <div class={pageStyles.eventList}>
                <For each={stats().newEventsList}>
                  {(ev) => (
                    <div class={pageStyles.eventRow}>
                      <span class={pageStyles.eventName}>{ev.name}</span>
                      <span class={pageStyles.eventCountry}>{ev.country}</span>
                      <span class={pageStyles.eventBy}>by {ev.discoveredBy}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Member summaries */}
          <Show when={stats().memberStats.length > 0}>
            <div class={pageStyles.section}>
              <h3 class={pageStyles.sectionTitle}>Member Highlights</h3>
              <div class={pageStyles.memberGrid}>
                <For each={stats().memberStats}>
                  {(m) => {
                    const route = getMemberRoute(m.parkrunId)
                    const runnerSig = Object.entries(runnerSignals).find(([_, [sig]]) => sig().id === m.parkrunId)
                    return (
                      <div class={pageStyles.memberCard}>
                        <Show when={runnerSig}>
                          <CharacterImage runner={runnerSig![1][0]()} pose="sitting" />
                        </Show>
                        <Show when={route} fallback={<strong>{m.name}</strong>}>
                          <A href={route!} class={pageStyles.memberLink}><strong>{m.name}</strong></A>
                        </Show>
                        <div class={pageStyles.memberStatsRow}>
                          <Show when={m.runs > 0}><span>🏃 {m.runs} runs</span></Show>
                          <Show when={m.events > 0}><span>📍 {m.events} events</span></Show>
                          <Show when={m.newEvents > 0}><span>✨ {m.newEvents} new</span></Show>
                          <Show when={m.volunteered > 0}><span>🦺 {m.volunteered} vol.</span></Show>
                        </div>
                      </div>
                    )
                  }}
                </For>
              </div>
            </div>
          </Show>
        </Show>
      </FieldBlock>
      <BackSignButton />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageStyles = {
  page: css({
    width: "calc(100% - 2rem)",
    maxWidth: "900px",
    margin: "1rem auto",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  }),
  yearNav: css({
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "0.4rem",
  }),
  yearLink: css({
    padding: "0.25rem 0.6rem",
    background: "rgba(0,0,0,0.15)",
    borderRadius: "4px",
    color: "inherit",
    textDecoration: "none",
    fontSize: "0.85rem",
    "&:hover": {
      background: "rgba(0,0,0,0.25)",
    },
  }),
  yearActive: css({
    padding: "0.25rem 0.6rem",
    background: "#6abf4b",
    borderRadius: "4px",
    color: "white",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: "bold",
  }),
  noData: css({
    textAlign: "center",
    padding: "2rem",
  }),
  cardsGrid: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  }),
  section: css({
    marginTop: "1.5rem",
  }),
  sectionTitle: css({
    fontSize: "1.1rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
    textAlign: "center",
  }),
  eventList: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    maxHeight: "300px",
    overflow: "auto",
  }),
  eventRow: css({
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    padding: "0.2rem 0.5rem",
    background: "rgba(0,0,0,0.08)",
    borderRadius: "4px",
    fontSize: "0.9rem",
  }),
  eventName: css({
    flex: 1,
    fontWeight: "bold",
  }),
  eventCountry: css({
    opacity: 0.7,
    fontSize: "0.8rem",
  }),
  eventBy: css({
    opacity: 0.6,
    fontSize: "0.8rem",
    fontStyle: "italic",
  }),
  memberGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "0.75rem",
  }),
  memberCard: css({
    background: "rgba(0,0,0,0.1)",
    borderRadius: "8px",
    padding: "0.75rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
  }),
  memberLink: css({
    color: "inherit",
    textDecoration: "underline",
  }),
  memberStatsRow: css({
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "0.4rem",
    fontSize: "0.8rem",
    opacity: 0.85,
  }),
  debutBlock: css({
    background: "linear-gradient(135deg, rgba(106,191,75,0.2), rgba(37,99,235,0.15))",
    border: "2px solid rgba(106,191,75,0.4)",
    borderRadius: "10px",
    padding: "1rem 1.2rem",
    textAlign: "center",
  }),
  debutTitle: css({
    fontSize: "1.3rem",
    fontWeight: "bold",
    marginBottom: "0.25rem",
  }),
  debutSubtitle: css({
    fontSize: "0.9rem",
    opacity: 0.7,
    marginBottom: "0.75rem",
  }),
  debutGrid: css({
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "1rem",
    mt: '32px',
  }),
  debutMember: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
  }),
  debutDate: css({
    fontSize: "0.75rem",
    opacity: 0.6,
  }),
}
