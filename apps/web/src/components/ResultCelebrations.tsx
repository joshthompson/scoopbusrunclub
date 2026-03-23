import { css } from "@style/css"
import { createSignal, Show } from "solid-js"
import { Emoji } from "@/components/ui/Emoji"
import { MILESTONE_SET, ordinalSuffix } from "../utils/milestones"
import { type RunResultItem, type Runner, type VolunteerItem, getCached, setCache } from "../utils/api"
import { formatName, parseTimeToSeconds } from "@/utils/misc"
import { getEvent, getEventName } from "@/utils/events"
import { runners as runnerSignals } from '@/data/runners'

// ---------------------------------------------------------------------------
// PB map
// ---------------------------------------------------------------------------

interface PBStatus {
  firstRun?: boolean
  pb?: boolean
  juniorPb?: boolean
  coursePb?: boolean
}

function isJuniorEvent(eventId: string) {
  return getEventName(eventId).trim().toLowerCase().includes("juniors")
}

/** "parkrunId:date:event:eventNumber" → PB flags */
function buildPBMap(results: RunResultItem[]): Map<string, PBStatus> {
  const map = new Map<string, PBStatus>()

  const byRunner = new Map<string, RunResultItem[]>()
  for (const item of results) {
    if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
    byRunner.get(item.parkrunId)!.push(item)
  }

  for (const runs of byRunner.values()) {
    runs.sort((a, b) => a.date.localeCompare(b.date))
    let bestOverall = Infinity
    let bestJunior = Infinity
    const bestPerCourse = new Map<string, number>()

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i]
      const secs = parseTimeToSeconds(run.time)
      const bestCourse = bestPerCourse.get(run.event) ?? Infinity
      const key = `${run.parkrunId}:${run.date}:${run.event}:${run.eventNumber}`
      const isJunior = isJuniorEvent(run.event)

      if (i === 0) {
        map.set(key, { firstRun: true })
        if (isJunior) {
          bestJunior = secs
        } else {
          bestOverall = secs
          bestPerCourse.set(run.event, secs)
        }
      } else {
        if (isJunior) {
          const isJuniorPb = secs < bestJunior

          if (isJuniorPb) {
            map.set(key, { juniorPb: true })
          }

          bestJunior = Math.min(bestJunior, secs)
          continue
        }

        const isOverallPb = secs < bestOverall
        const isCoursePb = bestCourse !== Infinity && secs < bestCourse

        if (isOverallPb || isCoursePb) {
          map.set(key, {
            pb: isOverallPb,
            coursePb: isCoursePb,
          })
        }

        if (isOverallPb) {
          bestOverall = secs
        }

        bestPerCourse.set(run.event, Math.min(bestCourse, secs))
      }
    }
  }

  return map
}

// ---------------------------------------------------------------------------
// Milestone map
// ---------------------------------------------------------------------------

/** "parkrunId:date" → milestone run number */
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
    runs.sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 0; i < runs.length; i++) {
      const runNumber = totalRuns - (runs.length - 1 - i)
      if (MILESTONE_SET.has(runNumber)) {
        map.set(`${parkrunId}:${runs[i].date}`, runNumber)
      }
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// Event-list achievements map
// ---------------------------------------------------------------------------

interface EventListAchievement {
  name: string
  description: string
  emoji: string
  color: typeof TAG_COLORS[keyof typeof TAG_COLORS]
  events: string[]
}

const TAG_COLORS = {
  pb: "#2563eb",
  juniorPb: "#E11584",
  coursePb: "#16a34a",
  milestone: "#db2777",
  haga1: "#6026d3",
  haga100: "#30917c",
  haga200: "#c026d3",
  svensk: "#006aa7",
  stockholmSprint: "#0f766e",
  malmoDouble: "#760f6e",
  goteborgDouble: "#ea580c",
  birthday: "#e11d48",
  spellingBus: "#d97706",
  aloneHaga: "#7c3aed",
  hagaCancelled: "#0891b2",
  uppsalaCancelled: "#4338ca",
  palindrome: "#0d9488",
  runBuddy: "#e67e22",
  bestie: "#6c5ce7",
  bff: "#e84393",
  parkrunPal: "#00b894",
  palindromicPal: "#fd79a8",
  viking: "#b91c1c",
  hagaStreak: "#15803d",
  volunteerDebut: "#059669",
  volunteerMilestone: "#7c3aed",
} as const

const TAG_EMOJIS = {
  debut: "🎉",
  pb: "🏅",
  juniorPb: "💫",
  coursePb: "⭐",
  milestone: "🎉",
  haga1: "🌳",
  haga100: "💯",
  haga200: "🎪",
  svensk: "🇸🇪",
  stockholmSprint: "🏃‍♂️",
  malmoDouble: "🏃",
  goteborgDouble: "🏃‍♀️",
  birthday: "🎂",
  spellingBus: "🚌",
  aloneHaga: "😱",
  hagaCancelled: "☃️",
  uppsalaCancelled: "❄️",
  palindrome: "🪞",
  runBuddy: "🤝",
  bestie: "👥",
  bff: "💕",
  parkrunPal: "🤗",
  palindromicPal: "🔄",
  viking: "⚔️",
  hagaStreak: "🌲",
  volunteerDebut: "🙌",
  volunteerMilestone: "🎉",
} as const

const EVENT_LIST_ACHIEVEMENTS: EventListAchievement[] = [
  {
    name: "Svenskspringare",
    description: "Completed all Swedish parkrun events",
    emoji: TAG_EMOJIS.svensk,
    color: TAG_COLORS.svensk,
    events: [
      "haga",
      "judarskogen",
      "huddinge",
      "lillsjon",
      "malmoribersborg",
      "bulltofta",
      "billdalsparken",
      "skatas",
      "djakneberget",
      "broparken",
      "vaxjosjon",
      "orebro",
      "vallaskogen",
      "uppsala",
      "boulognerskogen",
    ],
  },
  {
    name: "Stockholm Sprint",
    description: "Completed all parkruns in Stockholm",
    emoji: TAG_EMOJIS.stockholmSprint,
    color: TAG_COLORS.stockholmSprint,
    events: ["haga", "huddinge", "lillsjon", "judarskogen"],
  },
  {
    name: "Malmö Double",
    description: "Completed both parkruns in Malmö",
    emoji: TAG_EMOJIS.malmoDouble,
    color: TAG_COLORS.malmoDouble,
    events: ["malmoribersborg", "bulltofta"],
  },
  {
    name: "Göteborg Double",
    description: "Completed both parkruns in Göteborg",
    emoji: TAG_EMOJIS.goteborgDouble,
    color: TAG_COLORS.goteborgDouble,
    events: ["skatas", "billdalsparken"],
  },
]

/**
 * "parkrunId:date:event:eventNumber" -> event-list achievements first completed on that result.
 */
function buildEventListMap(results: RunResultItem[]): Map<string, EventListAchievement[]> {
  const map = new Map<string, EventListAchievement[]>()

  const byRunner = new Map<string, RunResultItem[]>()
  for (const item of results) {
    if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
    byRunner.get(item.parkrunId)!.push(item)
  }

  for (const runs of byRunner.values()) {
    runs.sort((a, b) => a.date.localeCompare(b.date))

    for (const achievement of EVENT_LIST_ACHIEVEMENTS) {
      const requiredEvents = new Set(achievement.events)
      const visited = new Set<string>()
      let completed = false

      for (const run of runs) {
        if (completed) break
        if (!requiredEvents.has(run.event)) continue
        visited.add(run.event)

        if (visited.size === requiredEvents.size) {
          const key = `${run.parkrunId}:${run.date}:${run.event}:${run.eventNumber}`
          const existing = map.get(key) ?? []
          existing.push(achievement)
          map.set(key, existing)
          completed = true
        }
      }
    }
  }

  return map
}

// ---------------------------------------------------------------------------
// Spelling achievements (generic)
// ---------------------------------------------------------------------------

interface SpellingAchievement {
  /** Display name shown in the tag */
  name: string
  /** The word to spell (uppercase). Duplicate letters require duplicate runs. */
  word: string
  emoji: string
  description: string
  color: typeof TAG_COLORS[keyof typeof TAG_COLORS]
}

/** Register spelling-based achievements here. */
const SPELLING_ACHIEVEMENTS: SpellingAchievement[] = [
  {
    name: "SCOOP BUS",
    word: "SCOOPBUS",
    emoji: TAG_EMOJIS.spellingBus,
    description: "Spell SCOOP BUS with parkrun event first letters (duplicate letters need duplicate runs)",
    color: TAG_COLORS.spellingBus,
  },
  // Add more: { name: "ABCDE", word: "ABCDE", emoji: "🔤", description: "...", color: "yourTag" },
]

/**
 * For every registered spelling achievement, return a set of
 * "parkrunId:date:event:eventNumber" keys where the achievement was first completed.
 */
function buildSpellingMap(results: RunResultItem[]): Map<string, SpellingAchievement> {
  const map = new Map<string, SpellingAchievement>()

  const byRunner = new Map<string, RunResultItem[]>()
  for (const item of results) {
    if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
    byRunner.get(item.parkrunId)!.push(item)
  }

  for (const runs of byRunner.values()) {
    runs.sort((a, b) => a.date.localeCompare(b.date))

    for (const achievement of SPELLING_ACHIEVEMENTS) {
      const remaining = [...achievement.word.toUpperCase()]
      const usedEvents = new Set<string>() // each event counts at most once
      let completed = false

      for (const run of runs) {
        if (completed) break
        if (usedEvents.has(run.event)) continue
        const firstLetter = getEventName(run.event)[0]?.toUpperCase()
        const idx = remaining.indexOf(firstLetter)
        if (idx !== -1) {
          usedEvents.add(run.event)
          remaining.splice(idx, 1)
          if (remaining.length === 0) {
            const key = `${run.parkrunId}:${run.date}:${run.event}:${run.eventNumber}`
            map.set(key, achievement)
            completed = true
          }
        }
      }
    }
  }

  return map
}

// ---------------------------------------------------------------------------
// Birthday map
// ---------------------------------------------------------------------------

/** parkrunId → "DD/MM" */
function buildBirthdayMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [, [accessor]] of Object.entries(runnerSignals)) {
    const data = accessor()
    if (data.birthday && data.birthday !== "00/00") {
      map.set(data.id, data.birthday)
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// Haga / snow achievements helpers
// ---------------------------------------------------------------------------

function isWinterMonth(dateStr: string): boolean {
  const month = parseInt(dateStr.slice(5, 7), 10)
  return month === 12 || month === 1 || month === 2
}

// ---------------------------------------------------------------------------
// Palindrome time map
// ---------------------------------------------------------------------------

function isPalindromeTime(time: string): boolean {
  const totalSeconds = parseTimeToSeconds(time)
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return false

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  const normalized = mmss.replace(":", "")
  return normalized === [...normalized].reverse().join("")
}

/**
 * Set of "parkrunId:date:event:eventNumber" keys where the finish time
 * is palindromic when converted to mm:ss.
 */
function buildPalindromeMap(results: RunResultItem[]): Set<string> {
  const set = new Set<string>()
  for (const r of results) {
    if (!isPalindromeTime(r.time)) continue
    set.add(`${r.parkrunId}:${r.date}:${r.event}:${r.eventNumber}`)
  }
  return set
}

// ---------------------------------------------------------------------------
// Alone At Haga map
// ---------------------------------------------------------------------------

/**
 * Set of "parkrunId:date:eventName:eventNumber" keys where a runner was the
 * only club member at a Haga event.
 */
function buildAloneAtHagaMap(results: RunResultItem[]): Set<string> {
  const set = new Set<string>()

  // Group Haga results by date+eventNumber
  const hagaByEvent = new Map<string, RunResultItem[]>()
  for (const r of results) {
    if (r.event !== "haga") continue
    const evKey = `${r.date}:${r.eventNumber}`
    if (!hagaByEvent.has(evKey)) hagaByEvent.set(evKey, [])
    hagaByEvent.get(evKey)!.push(r)
  }

  // Sort events chronologically for deterministic output
  const sortedEvents = [...hagaByEvent.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  for (const [, runners] of sortedEvents) {
    if (runners.length === 1) {
      const r = runners[0]
      set.add(`${r.parkrunId}:${r.date}:${r.event}:${r.eventNumber}`)
    }
  }

  return set
}

// ---------------------------------------------------------------------------
// Haga Cancelled? map
// ---------------------------------------------------------------------------

/**
 * Set of "parkrunId:date:event:eventNumber" keys where a runner ran
 * Uppsala in winter and no club member ran Haga that same date.
 */
function buildHagaCancelledMap(results: RunResultItem[]): Set<string> {
  const set = new Set<string>()

  // Collect dates where someone ran Haga
  const hagaDates = new Set<string>()
  for (const r of results) {
    if (r.event === "haga") hagaDates.add(r.date)
  }

  for (const r of results) {
    if (r.event !== "uppsala") continue
    if (!isWinterMonth(r.date)) continue
    if (!hagaDates.has(r.date)) {
      set.add(`${r.parkrunId}:${r.date}:${r.event}:${r.eventNumber}`)
    }
  }

  return set
}

// ---------------------------------------------------------------------------
// Uppsala Cancelled!?! map
// ---------------------------------------------------------------------------

/**
 * Set of "parkrunId:date:event:eventNumber" keys where a runner ran
 * Djäkneberget or Örebro in winter and no club member ran Haga or Uppsala
 * that same date.
 */
function buildUppsalaCancelledMap(results: RunResultItem[]): Set<string> {
  const set = new Set<string>()

  // Collect dates where someone ran Haga or Uppsala
  const coveredDates = new Set<string>()
  for (const r of results) {
    if (r.event === "haga" || r.event === "uppsala") {
      coveredDates.add(r.date)
    }
  }

  const fallbackEvents = new Set(["djakneberget", "orebro"])

  for (const r of results) {
    if (!fallbackEvents.has(r.event)) continue
    if (!isWinterMonth(r.date)) continue
    if (!coveredDates.has(r.date)) {
      set.add(`${r.parkrunId}:${r.date}:${r.event}:${r.eventNumber}`)
    }
  }

  return set
}

// ---------------------------------------------------------------------------
// Run Buddy & BFF maps
// ---------------------------------------------------------------------------

/** Build a parkrunId → name lookup from the runners signals. */
function buildRunnerNameMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [, [accessor]] of Object.entries(runnerSignals)) {
    const data = accessor()
    if (data.id) map.set(data.id, data.name)
  }
  return map
}

interface PairPartner {
  name: string
  parkrunId: string
}

interface PairAchievements {
  runBuddyMap: Map<string, PairPartner[]>
  bestieMap: Map<string, PairPartner[]>
  bffMap: Map<string, PairPartner[]>
}

/**
 * Run Buddy: first time two runners finish within 10 seconds of each other.
 * Bestie: 10th time two runners finish within 10 seconds of each other.
 * BFF: 50th time two runners finish within 10 seconds of each other.
 * All are earned once per unique pair.
 */
function buildRunBuddyAndBFFMaps(results: RunResultItem[]): PairAchievements {
  const runBuddyMap = new Map<string, PairPartner[]>()
  const bestieMap = new Map<string, PairPartner[]>()
  const bffMap = new Map<string, PairPartner[]>()
  const nameMap = buildRunnerNameMap()

  // Group results by event instance (event + date)
  const byEvent = new Map<string, RunResultItem[]>()
  const eventInstances: { eventKey: string; date: string }[] = []
  for (const r of results) {
    const eventKey = `${r.event}\0${r.date}`
    if (!byEvent.has(eventKey)) {
      byEvent.set(eventKey, [])
      eventInstances.push({ eventKey, date: r.date })
    }
    byEvent.get(eventKey)!.push(r)
  }

  // Process events in chronological order
  eventInstances.sort((a, b) => a.date.localeCompare(b.date))

  const buddyCount = new Map<string, number>()
  const earnedBuddy = new Set<string>()
  const earnedBestie = new Set<string>()
  const earnedBFF = new Set<string>()

  for (const { eventKey } of eventInstances) {
    const eventResults = byEvent.get(eventKey)!

    for (let i = 0; i < eventResults.length; i++) {
      for (let j = i + 1; j < eventResults.length; j++) {
        const a = eventResults[i]
        const b = eventResults[j]

        const timeA = parseTimeToSeconds(a.time)
        const timeB = parseTimeToSeconds(b.time)
        if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) continue
        if (Math.abs(timeA - timeB) > 10) continue

        const pairKey = [a.parkrunId, b.parkrunId].sort().join(":")
        const count = (buddyCount.get(pairKey) ?? 0) + 1
        buddyCount.set(pairKey, count)

        // Run Buddy — first occurrence
        if (!earnedBuddy.has(pairKey)) {
          earnedBuddy.add(pairKey)
          const keyA = `${a.parkrunId}:${a.date}:${a.event}:${a.eventNumber}`
          const keyB = `${b.parkrunId}:${b.date}:${b.event}:${b.eventNumber}`
          const nameA = nameMap.get(a.parkrunId) ?? a.runnerName
          const nameB = nameMap.get(b.parkrunId) ?? b.runnerName
          const exA = runBuddyMap.get(keyA) ?? []; exA.push({name: nameB, parkrunId: b.parkrunId}); runBuddyMap.set(keyA, exA)
          const exB = runBuddyMap.get(keyB) ?? []; exB.push({name: nameA, parkrunId: a.parkrunId}); runBuddyMap.set(keyB, exB)
        }

        // Bestie — 10th occurrence
        if (count === 10 && !earnedBestie.has(pairKey)) {
          earnedBestie.add(pairKey)
          const keyA = `${a.parkrunId}:${a.date}:${a.event}:${a.eventNumber}`
          const keyB = `${b.parkrunId}:${b.date}:${b.event}:${b.eventNumber}`
          const nameA = nameMap.get(a.parkrunId) ?? a.runnerName
          const nameB = nameMap.get(b.parkrunId) ?? b.runnerName
          const exA = bestieMap.get(keyA) ?? []; exA.push({name: nameB, parkrunId: b.parkrunId}); bestieMap.set(keyA, exA)
          const exB = bestieMap.get(keyB) ?? []; exB.push({name: nameA, parkrunId: a.parkrunId}); bestieMap.set(keyB, exB)
        }

        // BFF — 50th occurrence
        if (count === 50 && !earnedBFF.has(pairKey)) {
          earnedBFF.add(pairKey)
          const keyA = `${a.parkrunId}:${a.date}:${a.event}:${a.eventNumber}`
          const keyB = `${b.parkrunId}:${b.date}:${b.event}:${b.eventNumber}`
          const nameA = nameMap.get(a.parkrunId) ?? a.runnerName
          const nameB = nameMap.get(b.parkrunId) ?? b.runnerName
          const exA = bffMap.get(keyA) ?? []; exA.push({name: nameB, parkrunId: b.parkrunId}); bffMap.set(keyA, exA)
          const exB = bffMap.get(keyB) ?? []; exB.push({name: nameA, parkrunId: a.parkrunId}); bffMap.set(keyB, exB)
        }
      }
    }
  }

  return { runBuddyMap, bestieMap, bffMap }
}

// ---------------------------------------------------------------------------
// Parkrun Pal map
// ---------------------------------------------------------------------------

/**
 * Parkrun Pal: earned when two runners attend 50 events together.
 * Earned once per unique pair.
 */
function buildParkrunPalMap(results: RunResultItem[]): Map<string, PairPartner[]> {
  const map = new Map<string, PairPartner[]>()
  const nameMap = buildRunnerNameMap()

  // Group results by event instance (event + date)
  const byEvent = new Map<string, RunResultItem[]>()
  const eventInstances: { eventKey: string; date: string }[] = []
  for (const r of results) {
    const eventKey = `${r.event}\0${r.date}`
    if (!byEvent.has(eventKey)) {
      byEvent.set(eventKey, [])
      eventInstances.push({ eventKey, date: r.date })
    }
    byEvent.get(eventKey)!.push(r)
  }

  eventInstances.sort((a, b) => a.date.localeCompare(b.date))

  const coAttendCount = new Map<string, number>()
  const earnedPal = new Set<string>()

  for (const { eventKey } of eventInstances) {
    const eventResults = byEvent.get(eventKey)!
    // Deduplicate runners (one result per runner per event)
    const runners = new Map<string, RunResultItem>()
    for (const r of eventResults) {
      if (!runners.has(r.parkrunId)) runners.set(r.parkrunId, r)
    }
    const runnerList = [...runners.values()]

    for (let i = 0; i < runnerList.length; i++) {
      for (let j = i + 1; j < runnerList.length; j++) {
        const a = runnerList[i]
        const b = runnerList[j]
        const pairKey = [a.parkrunId, b.parkrunId].sort().join(":")

        const count = (coAttendCount.get(pairKey) ?? 0) + 1
        coAttendCount.set(pairKey, count)

        if (count === 50 && !earnedPal.has(pairKey)) {
          earnedPal.add(pairKey)
          const keyA = `${a.parkrunId}:${a.date}:${a.event}:${a.eventNumber}`
          const keyB = `${b.parkrunId}:${b.date}:${b.event}:${b.eventNumber}`
          const nameA = nameMap.get(a.parkrunId) ?? a.runnerName
          const nameB = nameMap.get(b.parkrunId) ?? b.runnerName
          const exA = map.get(keyA) ?? []; exA.push({name: nameB, parkrunId: b.parkrunId}); map.set(keyA, exA)
          const exB = map.get(keyB) ?? []; exB.push({name: nameA, parkrunId: a.parkrunId}); map.set(keyB, exB)
        }
      }
    }
  }

  return map
}

// ---------------------------------------------------------------------------
// 100 at Haga! map
// ---------------------------------------------------------------------------

/**
 * Set of "parkrunId:date:event:eventNumber" keys where a runner
 * completes their 100th run at Haga.
 */
function buildHagaMap(results: RunResultItem[], targetRunCount: number): Set<string> {
  const set = new Set<string>()

  const byRunner = new Map<string, RunResultItem[]>()
  for (const item of results) {
    if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
    byRunner.get(item.parkrunId)!.push(item)
  }

  for (const runs of byRunner.values()) {
    runs.sort((a, b) => a.date.localeCompare(b.date))
    let hagaRuns = 0

    for (const run of runs) {
      if (run.event !== "haga") continue
      hagaRuns += 1

      if (hagaRuns === targetRunCount) {
        set.add(`${run.parkrunId}:${run.date}:${run.event}:${run.eventNumber}`)
        break
      }
    }
  }

  return set
}

// ---------------------------------------------------------------------------
// Palindrome Pal map
// ---------------------------------------------------------------------------

/**
 * Convert total seconds to a 4-digit string "MMSS" (no colon).
 * Returns null if the time doesn't fit in MM:SS form.
 */
function toMMSSDigits(totalSeconds: number): string | null {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return null
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 99) return null
  return `${String(minutes).padStart(2, "0")}${String(seconds).padStart(2, "0")}`
}

/**
 * Palindrome Pal: two runners at the same event whose times are the
 * digit-reverse of each other in MM:SS form.  e.g. 23:54 ↔ 45:32.
 * Exception: both runners cannot have the exact same time.
 * Can be earned multiple times.
 *
 * Map: "parkrunId:date:event:eventNumber" → partner name[]
 */
function buildPalindromePalMap(results: RunResultItem[]): Map<string, PairPartner[]> {
  const map = new Map<string, PairPartner[]>()
  const nameMap = buildRunnerNameMap()

  // Group results by event instance
  const byEvent = new Map<string, RunResultItem[]>()
  for (const r of results) {
    const eventKey = `${r.event}\0${r.date}\0${r.eventNumber}`
    if (!byEvent.has(eventKey)) byEvent.set(eventKey, [])
    byEvent.get(eventKey)!.push(r)
  }

  for (const eventResults of byEvent.values()) {
    // Pre-compute digits and build a lookup from reversed digits → runners
    const digitEntries: { result: RunResultItem; digits: string; seconds: number }[] = []
    for (const r of eventResults) {
      const secs = parseTimeToSeconds(r.time)
      const digits = toMMSSDigits(secs)
      if (digits) digitEntries.push({ result: r, digits, seconds: secs })
    }

    // Build a map from digits → list of entries with that digit string
    const digitLookup = new Map<string, typeof digitEntries>()
    for (const entry of digitEntries) {
      if (!digitLookup.has(entry.digits)) digitLookup.set(entry.digits, [])
      digitLookup.get(entry.digits)!.push(entry)
    }

    for (const entry of digitEntries) {
      const reversed = [...entry.digits].reverse().join("")
      // Reversed digits must form a valid time (seconds part < 60)
      const reversedSecs = parseInt(reversed.slice(2), 10)
      if (reversedSecs >= 60) continue

      const matches = digitLookup.get(reversed)
      if (!matches) continue

      for (const match of matches) {
        // Can't match yourself
        if (match.result.parkrunId === entry.result.parkrunId) continue
        // Exception: both cannot have the exact same time
        if (entry.seconds === match.seconds) continue

        const key = `${entry.result.parkrunId}:${entry.result.date}:${entry.result.event}:${entry.result.eventNumber}`
        const partnerName = nameMap.get(match.result.parkrunId) ?? match.result.runnerName
        const existing = map.get(key) ?? []
        // Avoid duplicate partners for a single result key
        if (!existing.some(p => p.parkrunId === match.result.parkrunId)) {
          existing.push({name: partnerName, parkrunId: match.result.parkrunId})
          map.set(key, existing)
        }
      }
    }
  }

  return map
}

// ---------------------------------------------------------------------------
// Viking map
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Haga Streak map
// ---------------------------------------------------------------------------

/**
 * Haga Streak: earned every time a runner completes 10 consecutive Saturdays at Haga.
 * Every Saturday counts — if Haga wasn't held or the runner didn't attend, the streak
 * breaks. Special (non-Saturday) events are ignored.
 * Can be earned multiple times. Returns "parkrunId:date:event:eventNumber" keys.
 */
function buildHagaStreakMap(results: RunResultItem[]): Set<string> {
  const STREAK_LENGTH = 10
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

  const set = new Set<string>()

  const byRunner = new Map<string, RunResultItem[]>()
  for (const item of results) {
    if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
    byRunner.get(item.parkrunId)!.push(item)
  }

  for (const runs of byRunner.values()) {
    // Get only Saturday Haga runs sorted by date (ignore midweek bonus events)
    const hagaRuns = runs
      .filter((r) => r.event === "haga" && new Date(r.date).getDay() === 6)
      .sort((a, b) => a.date.localeCompare(b.date))
    if (hagaRuns.length < STREAK_LENGTH) continue

    let streak = 1

    for (let i = 1; i < hagaRuns.length; i++) {
      const prevDate = new Date(hagaRuns[i - 1].date).getTime()
      const currDate = new Date(hagaRuns[i].date).getTime()
      const diffMs = currDate - prevDate

      if (diffMs === ONE_WEEK_MS) {
        // Exactly one week apart — streak continues
        streak += 1
        if (streak >= STREAK_LENGTH && streak % STREAK_LENGTH === 0) {
          const run = hagaRuns[i]
          set.add(`${run.parkrunId}:${run.date}:${run.event}:${run.eventNumber}`)
        }
      } else {
        // Gap is more than one week — streak resets
        streak = 1
      }
    }
  }

  return set
}

// ---------------------------------------------------------------------------
// Viking map
// ---------------------------------------------------------------------------

const VIKING_COUNTRIES = new Set(["SE", "FI", "DK", "NO"])

/**
 * Viking: earned once per runner when they have completed a parkrun in
 * Sweden, Finland, Denmark and Norway (based on event country).
 * Returns "parkrunId:date:event:eventNumber" keys for the completing result.
 */
function buildVikingMap(results: RunResultItem[]): Set<string> {
  const set = new Set<string>()

  const byRunner = new Map<string, RunResultItem[]>()
  for (const item of results) {
    if (!byRunner.has(item.parkrunId)) byRunner.set(item.parkrunId, [])
    byRunner.get(item.parkrunId)!.push(item)
  }

  for (const runs of byRunner.values()) {
    runs.sort((a, b) => a.date.localeCompare(b.date))
    const visitedCountries = new Set<string>()
    let completed = false

    for (const run of runs) {
      if (completed) break
      const country = getEvent(run.event)?.country
      if (!country || !VIKING_COUNTRIES.has(country)) continue
      visitedCountries.add(country)

      if (visitedCountries.size === VIKING_COUNTRIES.size) {
        set.add(`${run.parkrunId}:${run.date}:${run.event}:${run.eventNumber}`)
        completed = true
      }
    }
  }

  return set
}

// ---------------------------------------------------------------------------
// Public API: pre-computed celebration data
// ---------------------------------------------------------------------------

export interface CelebrationData {
  pbMap: Map<string, PBStatus>
  milestoneMap: Map<string, number>
  haga1Map: Set<string>
  haga100Map: Set<string>
  haga200Map: Set<string>
  eventListMap: Map<string, EventListAchievement[]>
  birthdayMap: Map<string, string>
  spellingMap: Map<string, SpellingAchievement>
  aloneAtHagaMap: Set<string>
  hagaCancelledMap: Set<string>
  uppsalaCancelledMap: Set<string>
  palindromeMap: Set<string>
  runBuddyMap: Map<string, PairPartner[]>
  bestieMap: Map<string, PairPartner[]>
  bffMap: Map<string, PairPartner[]>
  parkrunPalMap: Map<string, PairPartner[]>
  palindromePalMap: Map<string, PairPartner[]>
  vikingMap: Set<string>
  hagaStreakMap: Set<string>
  /** "parkrunId:date:event:eventNumber" → volunteer count (only for debuts/milestones) */
  volunteerMilestoneMap: Map<string, number>
}

/** Call once per render cycle (inside a createMemo) to pre-compute all celebration lookups. */
export function buildCelebrationData(results: RunResultItem[], runners: Runner[], volunteers?: VolunteerItem[]): CelebrationData {
  const { runBuddyMap, bestieMap, bffMap } = buildRunBuddyAndBFFMaps(results)
  return {
    pbMap: buildPBMap(results),
    milestoneMap: buildMilestoneMap(results, runners),
    haga1Map: buildHagaMap(results, 1),
    haga100Map: buildHagaMap(results, 100),
    haga200Map: buildHagaMap(results, 200),
    eventListMap: buildEventListMap(results),
    birthdayMap: buildBirthdayMap(),
    spellingMap: buildSpellingMap(results),
    aloneAtHagaMap: buildAloneAtHagaMap(results),
    hagaCancelledMap: buildHagaCancelledMap(results),
    uppsalaCancelledMap: buildUppsalaCancelledMap(results),
    palindromeMap: buildPalindromeMap(results),
    runBuddyMap,
    bestieMap,
    bffMap,
    parkrunPalMap: buildParkrunPalMap(results),
    palindromePalMap: buildPalindromePalMap(results),
    vikingMap: buildVikingMap(results),
    hagaStreakMap: buildHagaStreakMap(results),
    volunteerMilestoneMap: buildVolunteerMilestoneMap(volunteers ?? []),
  }
}

// ---------------------------------------------------------------------------
// Volunteer milestone map
// ---------------------------------------------------------------------------

const VOLUNTEER_MILESTONE_SET = new Set([1, 5, 10, 25, 50, 100, 150, 200, 250, 500])

/** "parkrunId:date:event:eventNumber" → volunteer count (only for debuts & milestones) */
function buildVolunteerMilestoneMap(volunteers: VolunteerItem[]): Map<string, number> {
  const byRunner = new Map<string, VolunteerItem[]>()
  for (const v of volunteers) {
    if (!byRunner.has(v.parkrunId)) byRunner.set(v.parkrunId, [])
    byRunner.get(v.parkrunId)!.push(v)
  }

  const map = new Map<string, number>()
  for (const [, vols] of byRunner) {
    vols.sort((a, b) => a.date.localeCompare(b.date) || a.eventNumber - b.eventNumber)
    for (let i = 0; i < vols.length; i++) {
      const count = i + 1
      if (VOLUNTEER_MILESTONE_SET.has(count)) {
        const v = vols[i]
        map.set(`${v.parkrunId}:${v.date}:${v.event}:${v.eventNumber}`, count)
      }
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// Serialization helpers for CelebrationData (Map/Set ↔ JSON)
// ---------------------------------------------------------------------------

function serializeCelebrationData(data: CelebrationData): string {
  return JSON.stringify(data, (_key, value) => {
    if (value instanceof Map) return { __t: "M", e: [...value.entries()] }
    if (value instanceof Set) return { __t: "S", v: [...value.values()] }
    return value
  })
}

function deserializeCelebrationData(raw: string): CelebrationData {
  return JSON.parse(raw, (_key, value) => {
    if (value && typeof value === "object") {
      if (value.__t === "M") return new Map(value.e)
      if (value.__t === "S") return new Set(value.v)
    }
    return value
  })
}

// ---------------------------------------------------------------------------
// Cached celebration data — compute once per fetch cycle
// ---------------------------------------------------------------------------

const CELEBRATION_CACHE_KEY = "celebrations"

/**
 * Returns cached CelebrationData if available, otherwise builds it from
 * the supplied results/runners and stores it in localStorage with the same
 * TTL as the result data.
 */
export function getOrBuildCelebrationData(results: RunResultItem[], runners: Runner[], volunteers?: VolunteerItem[]): CelebrationData {
  const cached = getCached<string>(CELEBRATION_CACHE_KEY)
  if (cached) {
    try {
      return deserializeCelebrationData(cached)
    } catch {
      // corrupt cache — fall through and rebuild
    }
  }

  const data = buildCelebrationData(results, runners, volunteers)
  setCache(CELEBRATION_CACHE_KEY, serializeCelebrationData(data))
  return data
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ResultCelebrationsProps {
  data: CelebrationData
  /** "parkrunId:date:event:eventNumber" */
  resultKey: string
  /** "parkrunId:date" */
  runnerDateKey: string
  parkrunId: string
  /** "YYYY-MM-DD" */
  date: string
}

export interface CelebrationTag {
  label: string
  description: string
  emoji: string
  color: string
  otherRunnerId?: string // for pair achievements, the parkrunId of the other runner involved (to link to their profile)
}

interface CelebrationRuleContext {
  data: CelebrationData
  resultKey: string
  runnerDateKey: string
  parkrunId: string
  date: string
}

/** Define all celebration rules here. Each function returns a tag if the condition is met. */
const celebrationRules: ((ctx: CelebrationRuleContext) => CelebrationTag | CelebrationTag[] | null)[] = [
  // PB celebrations (debut / overall PB / course PB)
  ({ data, resultKey }) => {
    const pb = data.pbMap.get(resultKey)
    if (!pb) return null
    if (pb.firstRun) return { label: "Parkrun debut!", description: "First ever parkrun result recorded", emoji: TAG_EMOJIS.debut, color: TAG_COLORS.pb }

    const tags: CelebrationTag[] = []

    if (pb.juniorPb) {
      tags.push({ label: "New Junior PB!", description: "New personal best time at a junior parkrun", emoji: TAG_EMOJIS.juniorPb, color: TAG_COLORS.juniorPb })
    }

    if (pb.pb) {
      tags.push({ label: "New PB!", description: "New overall personal best time", emoji: TAG_EMOJIS.pb, color: TAG_COLORS.pb })
    }

    if (pb.coursePb) {
      const eventId = resultKey.split(":")[2]
      const eventDisplayName = getEventName(eventId)
      tags.push({ label: `New ${eventDisplayName} PB!`, description: `New personal best time at ${eventDisplayName}`, emoji: TAG_EMOJIS.coursePb, color: TAG_COLORS.coursePb })
    }

    return tags.length > 0 ? tags : null
  },

  // Milestone celebrations
  ({ data, runnerDateKey }) => {
    const milestone = data.milestoneMap.get(runnerDateKey)
    return milestone !== undefined
      ? { label: `${ordinalSuffix(milestone)} run!`, description: `Completed ${milestone} parkruns!`, emoji: TAG_EMOJIS.milestone, color: TAG_COLORS.milestone }
      : null
  },

  // Haga Debut!
  ({ data, resultKey }) =>
    data.haga1Map.has(resultKey)
      ? { label: "Haga Debut", description: "First run at Haga park!", emoji: TAG_EMOJIS.haga1, color: TAG_COLORS.haga1 }
      : null,

  // 100 at Haga!
  ({ data, resultKey }) =>
    data.haga100Map.has(resultKey)
      ? { label: "100 at Haga!", description: "100 beautiful runs in Haga park!", emoji: TAG_EMOJIS.haga100, color: TAG_COLORS.haga100 }
      : null,

  // 250 at Haga!
  ({ data, resultKey }) =>
    data.haga200Map.has(resultKey)
      ? { label: "1000km at Haga!", description: "Making Deri proud!", emoji: TAG_EMOJIS.haga200, color: TAG_COLORS.haga200 }
      : null,

  // Event-list achievements (Svenskspringare, Stockholm Sprint, etc.)
  ({ data, resultKey }) => {
    const achievements = data.eventListMap.get(resultKey)
    if (!achievements || achievements.length === 0) return null
    return achievements.map((achievement) => ({
      label: `${achievement.name}!`,
      description: achievement.description,
      emoji: achievement.emoji,
      color: achievement.color,
    }))
  },

  // Birthday Runner
  ({ data, parkrunId, date }) => {
    const birthday = data.birthdayMap.get(parkrunId)
    if (!birthday) return null
    const [, mm, dd] = date.split("-")
    return `${dd}/${mm}` === birthday
      ? { label: "Birthday Runner!", description: "Ran a parkrun on their birthday", emoji: TAG_EMOJIS.birthday, color: TAG_COLORS.birthday }
      : null
  },

  // Spelling achievements (SCOOP BUS, etc.)
  ({ data, resultKey }) => {
    const achievement = data.spellingMap.get(resultKey)
    return achievement
      ? { label: `${achievement.name}!`, description: achievement.description, emoji: achievement.emoji, color: achievement.color }
      : null
  },

  // Alone At Haga
  ({ data, resultKey }) =>
    data.aloneAtHagaMap.has(resultKey)
      ? { label: "Alone At Haga!", description: "Was the only club member to run at Haga that event", emoji: TAG_EMOJIS.aloneHaga, color: TAG_COLORS.aloneHaga }
      : null,

  // Haga Cancelled?
  ({ data, resultKey }) =>
    data.hagaCancelledMap.has(resultKey)
      ? { label: "Haga Cancelled?", description: "Ran Uppsala instead of Haga during the winter - was Haga cancelled due to ice?", emoji: TAG_EMOJIS.hagaCancelled, color: TAG_COLORS.hagaCancelled }
      : null,

  // Uppsala Cancelled!?!
  ({ data, resultKey }) =>
    data.uppsalaCancelledMap.has(resultKey)
      ? { label: "Uppsala Cancelled!?!", description: "Both Haga and Uppsala were cancelled? Had to flee to Djäkneberget or Örebro!", emoji: TAG_EMOJIS.uppsalaCancelled, color: TAG_COLORS.uppsalaCancelled }
      : null,

  // Palindrome
  ({ data, resultKey }) =>
    data.palindromeMap.has(resultKey)
      ? {
          label: "Palindrome!",
          description: "Finish with a time that reads the same forwards and backwards in mm:ss",
          emoji: TAG_EMOJIS.palindrome,
          color: TAG_COLORS.palindrome,
        }
      : null,

  // Run Buddy
  ({ data, resultKey }) => {
    const partners = data.runBuddyMap.get(resultKey)
    if (!partners || partners.length === 0) return null
    return partners.map((partner) => ({
      label: `${formatName(partner.name)}'s Run Buddy`,
      description: `First time finished within 10 seconds of ${formatName(partner.name)}`,
      emoji: TAG_EMOJIS.runBuddy,
      color: TAG_COLORS.runBuddy,
      otherRunnerId: partner.parkrunId,
    }))
  },

  // Bestie
  ({ data, resultKey }) => {
    const partners = data.bestieMap.get(resultKey)
    if (!partners || partners.length === 0) return null
    return partners.map((partner) => ({
      label: `${formatName(partner.name)}'s Bestie`,
      description: `Finished within 10 seconds of ${formatName(partner.name)} for the 10th time!`,
      emoji: TAG_EMOJIS.bestie,
      color: TAG_COLORS.bestie,
      otherRunnerId: partner.parkrunId,
    }))
  },

  // BFF
  ({ data, resultKey }) => {
    const partners = data.bffMap.get(resultKey)
    if (!partners || partners.length === 0) return null
    return partners.map((partner) => ({
      label: `${formatName(partner.name)}'s BFF`,
      description: `Finished within 10 seconds of ${formatName(partner.name)} for the 50th time!`,
      emoji: TAG_EMOJIS.bff,
      color: TAG_COLORS.bff,
      otherRunnerId: partner.parkrunId,
    }))
  },

  // Parkrun Pal
  ({ data, resultKey }) => {
    const partners = data.parkrunPalMap.get(resultKey)
    if (!partners || partners.length === 0) return null
    return partners.map((partner) => ({
      label: `${formatName(partner.name)}'s Parkrun Pal`,
      description: `Attended 50 parkrun events with ${formatName(partner.name)}!`,
      emoji: TAG_EMOJIS.parkrunPal,
      color: TAG_COLORS.parkrunPal,
      otherRunnerId: partner.parkrunId,
    }))
  },

  // Palindrome Pal
  ({ data, resultKey }) => {
    const partners = data.palindromePalMap.get(resultKey)
    if (!partners || partners.length === 0) return null
    return partners.map((partner) => ({
      label: `${formatName(partner.name)}'s Palindromic Pal`,
      description: `Run the reverse of ${formatName(partner.name)}'s time`,
      emoji: TAG_EMOJIS.palindromicPal,
      color: TAG_COLORS.palindromicPal,
      otherRunnerId: partner.parkrunId,
    }))
  },

  // Viking
  ({ data, resultKey }) =>
    data.vikingMap.has(resultKey)
      ? {
          label: "Viking!",
          description: "Completed a parkrun in Sweden, Finland, Denmark and Norway",
          emoji: TAG_EMOJIS.viking,
          color: TAG_COLORS.viking,
        }
      : null,

  // Haga Streak
  ({ data, resultKey }) =>
    data.hagaStreakMap.has(resultKey)
      ? {
          label: "Haga Streak!",
          description: "Run Haga Parkrun 10 Saturdays in a row",
          emoji: TAG_EMOJIS.hagaStreak,
          color: TAG_COLORS.hagaStreak,
        }
      : null,
]

export function getCelebrationTags(ctx: CelebrationRuleContext): CelebrationTag[] {
  return celebrationRules.flatMap((rule) => {
    const result = rule(ctx)
    if (result === null) return []
    return Array.isArray(result) ? result : [result]
  })
}

export function ResultCelebrations(props: ResultCelebrationsProps) {
  const tags = () => {
    const ctx: CelebrationRuleContext = {
      data: props.data,
      resultKey: props.resultKey,
      runnerDateKey: props.runnerDateKey,
      parkrunId: props.parkrunId,
      date: props.date,
    }

    return getCelebrationTags(ctx)
  }

  return (
    <>
      {tags().map((tag) => (
        <CelebrationPill tag={tag} showTooltip />
      ))}
    </>
  )
}

export interface VolunteerCelebrationsProps {
  data: CelebrationData
  parkrunId: string
  date: string
  eventId: string
  eventNumber: string
}

export function VolunteerCelebrations(props: VolunteerCelebrationsProps) {
  const tags = (): CelebrationTag[] => {
    const key = `${props.parkrunId}:${props.date}:${props.eventId}:${props.eventNumber}`
    const count = props.data.volunteerMilestoneMap?.get(key)
    if (count === undefined) return []

    if (count === 1) {
      return [{ label: "Volunteer debut!", description: "First time volunteering at parkrun", emoji: TAG_EMOJIS.volunteerDebut, color: TAG_COLORS.volunteerDebut }]
    }
    return [{ label: `${ordinalSuffix(count)} volunteer!`, description: `Volunteered ${count} times at parkrun!`, emoji: TAG_EMOJIS.volunteerMilestone, color: TAG_COLORS.volunteerMilestone }]
  }

  return (
    <>
      {tags().map((tag) => (
        <CelebrationPill tag={tag} showTooltip />
      ))}
    </>
  )
}

/** Look up a runner's face image by their parkrunId. */
function getRunnerFace(parkrunId: string): string | undefined {
  for (const [, [accessor]] of Object.entries(runnerSignals)) {
    const data = accessor()
    if (data.id === parkrunId && data.frames.face.length > 0) {
      return data.frames.face[0]
    }
  }
  return undefined
}

export function CelebrationPill(props: { tag: CelebrationTag; showTooltip?: boolean }) {
  const [hovered, setHovered] = createSignal(false)
  let anchorRef!: HTMLSpanElement
  const [tooltipStyle, setTooltipStyle] = createSignal<Record<string, string>>({})

  const otherRunnerFace = () => props.tag.otherRunnerId ? getRunnerFace(props.tag.otherRunnerId) : undefined

  const positionTooltip = () => {
    if (!anchorRef) return
    const rect = anchorRef.getBoundingClientRect()
    const tooltipWidth = 220
    const pad = 8
    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    left = Math.max(pad, Math.min(left, window.innerWidth - tooltipWidth - pad))
    const top = rect.top - pad
    setTooltipStyle({
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
      transform: "translateY(-100%)",
    })
  }

  return (
    <span
      ref={anchorRef}
      class={styles.tag}
      style={{ color: props.tag.color }}
      onMouseEnter={() => {
        if (!props.showTooltip) return
        positionTooltip()
        setHovered(true)
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {props.tag.label}{" "}
      <Show when={otherRunnerFace()}>
        {(face) => <img src={face()} alt="" class={styles.runnerFace} />}
      </Show>
      <Emoji emoji={props.tag.emoji} />
      <Show when={props.showTooltip && hovered()}>
        <div class={styles.tooltip} style={tooltipStyle()}>
          {props.tag.description}
        </div>
      </Show>
    </span>
  )
}

const styles = {
  tag: css({
    display: "inline-block",
    background: "#FFFC",
    p: "0rem 0.3rem",
    m: "2px 0 2px 4px",
    borderRadius: "2px",
    cornerShape: "notch",
    fontWeight: "bold",
    outline: "2px solid currentColor",
    outlineOffset: "-1px",
  }),
  tooltip: css({
    position: "fixed",
    background: "#000",
    color: "#fff",
    fontSize: "0.75rem",
    fontWeight: "normal",
    lineHeight: "1.3",
    p: "0.35rem 0.5rem",
    borderRadius: "4px",
    cornerShape: "notch",
    pointerEvents: "none",
    zIndex: 1000,
    textAlign: "center",
    whiteSpace: "normal",
  }),
  runnerFace: css({
    height: "1em",
    verticalAlign: "middle",
    imageRendering: "pixelated",
    display: "inline-block",
    mr: "0.3rem",
  }),
}
