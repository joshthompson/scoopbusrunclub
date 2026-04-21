import { css } from "@style/css"
import {
  createMemo,
  createSignal,
  createEffect,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { A, useParams } from "@solidjs/router"
import {
  type RunResultItem,
  type VolunteerItem,
  type CourseData,
  fetchCourse,
} from "@/utils/api"
import { getEventName } from "@/utils/events"
import { formatDate, formatName, parseTimeToSeconds } from "@/utils/misc"
import { FieldBlock } from "@/components/ui/FieldBlock"
import { DirtBlock } from "@/components/ui/DirtBlock"
import { Table } from "@/components/ui/Table"
import { BackSignButton } from "@/components/BackSignButton"
import { NotFoundPage } from "./NotFoundPage"
import { runners as runnerSignals } from "@/data/runners"
import { getMemberRoute } from "@/utils/memberRoute"
import { VOLUNTEER_EVENT_IDS } from "@shared/parkrun-events"
import { RoleTranslations } from "@/data/volunteer-roles"
import tree1Asset from "@/assets/misc/tree1.png"
import tree2Asset from "@/assets/misc/tree2.png"
import shrub1Asset from "@/assets/misc/shrub1.png"
import shrub2Asset from "@/assets/misc/shrub2.png"
import { COURSE_OVERRIDES } from "@/data/courses"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Point2D {
  x: number
  y: number
}

const CANVAS_W = 600 // slightly larger canvas for replay
const PADDING = 30
const HEAD_SIZE = 30 // desired head size in screen pixels

/** Project lon/lat coordinates into SVG space (same algo as CourseSVG). */
function projectCoordinates(coords: number[][], extraCoords: number[][], padding: number) {
  const empty = {
    path: [] as Point2D[],
    project: (_c: number[]) => ({ x: 0, y: 0 }),
    width: CANVAS_W,
    height: CANVAS_W,
  }
  if (coords.length === 0) return empty

  // Include both path coords and extra points (labelled markers) in bounding box
  const allCoords = [...coords, ...extraCoords]

  let minLon = Infinity,
    maxLon = -Infinity
  let minLat = Infinity,
    maxLat = -Infinity
  for (const c of allCoords) {
    if (c[0] < minLon) minLon = c[0]
    if (c[0] > maxLon) maxLon = c[0]
    if (c[1] < minLat) minLat = c[1]
    if (c[1] > maxLat) maxLat = c[1]
  }

  const lonSpan = maxLon - minLon || 0.0001
  const latSpan = maxLat - minLat || 0.0001
  const midLat = (minLat + maxLat) / 2
  const lonScale = Math.cos((midLat * Math.PI) / 180)

  const geoW = lonSpan * lonScale
  const geoH = latSpan
  const aspect = geoH / geoW

  const drawW = CANVAS_W - padding * 2
  const drawH = drawW * aspect
  const svgH = drawH + padding * 2

  const scale = drawW / geoW

  const project = (c: number[]): Point2D => ({
    x: padding + (c[0] - minLon) * lonScale * scale,
    y: padding + drawH - (c[1] - minLat) * scale,
  })

  return { path: coords.map(project), project, width: CANVAS_W, height: svgH }
}

/**
 * Compute cumulative distances along a polyline so we can
 * interpolate a position at any fraction of the total path.
 */
function cumulativeDistances(pts: Point2D[]): number[] {
  const dists = [0]
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    dists.push(dists[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  return dists
}

/** Given a fraction 0..1 along the path, return the interpolated (x, y). */
function pointAtFraction(
  pts: Point2D[],
  cumDist: number[],
  fraction: number,
): Point2D {
  if (pts.length === 0) return { x: 0, y: 0 }
  const clamped = Math.min(1, Math.max(0, fraction))
  const totalLen = cumDist[cumDist.length - 1]
  const target = clamped * totalLen

  // Find the segment
  for (let i = 1; i < cumDist.length; i++) {
    if (cumDist[i] >= target) {
      const segLen = cumDist[i] - cumDist[i - 1]
      if (segLen === 0) return pts[i]
      const t = (target - cumDist[i - 1]) / segLen
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
      }
    }
  }
  return pts[pts.length - 1]
}

/** Point label emoji fallbacks (reused from CourseSVG) */
const POINT_EMOJI: Record<string, string> = {
  start: "🟢",
  finish: "🏁",
  mål: "🏁",
  "start / finish": "🟢 🏁",
  "turnaround point": "🔄",
  "turning point": "🔄",
  "u-turn": "🔄",
  "1km": "1",
  "2km": "2",
  "3km": "3",
  "4km": "4",
}

const END_POINTS = ["finish", "mål", "start/mål", "start/finish", "start / finish"]

const TREE_ASSETS = [
  { src: tree1Asset, isShrub: false },
  { src: tree2Asset, isShrub: false },
  { src: shrub1Asset, isShrub: true },
  { src: shrub2Asset, isShrub: true },
]
const TREE_COUNT = 25

/** Simple seeded PRNG so trees are deterministic per course. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

interface TreePlacement {
  x: number
  y: number
  asset: string
  height: number // SVG units
}

/**
 * Place trees randomly within the viewBox, rejecting any that are
 * too close to the path polyline.
 */
function placeTrees(
  pathPts: Point2D[],
  width: number,
  height: number,
  minTreeH: number,
  maxTreeH: number,
  minShrubH: number,
  maxShrubH: number,
  clearance: number,
  seed: number,
): TreePlacement[] {
  const rng = mulberry32(seed)
  const trees: TreePlacement[] = []
  let attempts = 0
  const maxAttempts = TREE_COUNT * 20

  while (trees.length < TREE_COUNT && attempts < maxAttempts) {
    attempts++
    const x = rng() * width
    const y = rng() * height
    const pick = TREE_ASSETS[Math.floor(rng() * TREE_ASSETS.length)]
    const h = pick.isShrub
      ? minShrubH + rng() * (maxShrubH - minShrubH)
      : minTreeH + rng() * (maxTreeH - minTreeH)

    // Check distance to every segment of the path
    let tooClose = false
    for (let i = 1; i < pathPts.length; i++) {
      if (distToSegment(x, y, pathPts[i - 1], pathPts[i]) < clearance) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    // Also don't overlap other trees
    let overlaps = false
    for (const t of trees) {
      const dx = t.x - x
      const dy = t.y - y
      if (Math.sqrt(dx * dx + dy * dy) < clearance * 0.6) {
        overlaps = true
        break
      }
    }
    if (overlaps) continue

    trees.push({
      x,
      y,
      asset: pick.src,
      height: h,
    })
  }

  // Sort by y so trees further "back" render first (painter's order)
  return trees.sort((a, b) => a.y - b.y)
}

/** Squared distance from point (px,py) to line segment (a,b). */
function distToSegment(px: number, py: number, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - a.x) ** 2 + (py - a.y) ** 2)
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const closestX = a.x + t * dx
  const closestY = a.y + t * dy
  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2)
}

/** Build a lookup: parkrunId → face image URL (only for our club members). */
const parkrunIdToFace = new Map<string, { face: string; name: string }>()
for (const [, [accessor]] of Object.entries(runnerSignals)) {
  const data = accessor()
  if (data.id && data.frames.face[0]) {
    parkrunIdToFace.set(data.id, { face: data.frames.face[0], name: data.name })
  }
}

// Also build a reverse-lookup from name (lowercase) for matching fallback
const nameToFace = new Map<string, { face: string; name: string }>()
for (const [key, [accessor]] of Object.entries(runnerSignals)) {
  const data = accessor()
  if (data.frames.face[0]) {
    nameToFace.set(key.toLowerCase(), { face: data.frames.face[0], name: data.name })
    nameToFace.set(data.name.toLowerCase(), { face: data.frames.face[0], name: data.name })
    if (data.altNames) {
      for (const alt of data.altNames) {
        nameToFace.set(alt.toLowerCase(), { face: data.frames.face[0], name: data.name })
      }
    }
  }
}

/** Format seconds to mm:ss or h:mm:ss. */
function formatSecs(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${m}:${String(sec).padStart(2, "0")}`
}

// ---------------------------------------------------------------------------
// Replay runner model
// ---------------------------------------------------------------------------

interface ReplayRunner {
  parkrunId: string
  name: string
  finishSeconds: number
  position: number
  face: string | null // null = generic dot for non-members
}

// ---------------------------------------------------------------------------
// Speed options
// ---------------------------------------------------------------------------

const SPEED_OPTIONS = [1, 2, 5, 10, 25, 50, 100] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function translateRole(role: string): string {
  const translations = RoleTranslations as Record<string, string>
  return translations[role] ?? role
}

interface ReplayPageProps {
  results: RunResultItem[]
  volunteers: VolunteerItem[]
}

export function ReplayPage(props: ReplayPageProps) {
  const params = useParams<{ eventName: string; eventNumber: string }>()

  const eventId = () => params.eventName
  const eventNumber = () => Number(params.eventNumber)
  const eventName = createMemo(() => getEventName(eventId()))

  // ---- Course data ----
  const [courseData, setCourseData] = createSignal<CourseData | null>(null)
  const [courseLoading, setCourseLoading] = createSignal(true)

  onMount(() => {
    fetchCourse(eventId())
      .then((data) => {
        if (data) setCourseData(data)
      })
      .catch(() => {})
      .finally(() => setCourseLoading(false))
  })

  // ---- Runners for this event number ----
  const replayRunners = createMemo<ReplayRunner[]>(() => {
    const filtered = props.results.filter(
      (r) => r.event === eventId() && r.eventNumber === eventNumber(),
    )
    return filtered
      .map((r) => {
        const secs = parseTimeToSeconds(r.time)
        const entry = parkrunIdToFace.get(r.parkrunId)
        return {
          parkrunId: r.parkrunId,
          name: entry?.name ?? r.runnerName,
          finishSeconds: secs,
          position: r.position,
          face: entry?.face ?? null,
        }
      })
      .filter((r) => Number.isFinite(r.finishSeconds))
      .sort((a, b) => a.finishSeconds - b.finishSeconds)
  })

  const hasData = createMemo(() => replayRunners().length > 0 && courseData() !== null)

  // ---- Event date ----
  const eventDate = createMemo(() => {
    const r = props.results.find(
      (r) => r.event === eventId() && r.eventNumber === eventNumber(),
    )
    return r?.date ?? null
  })

  // ---- Volunteers for this event number ----
  const hasVolunteerData = createMemo(() => VOLUNTEER_EVENT_IDS.has(eventId()))
  const eventVolunteers = createMemo(() => {
    if (!hasVolunteerData()) return []
    return props.volunteers.filter(
      (v) => v.event === eventId() && v.eventNumber === eventNumber(),
    )
  })

  // ---- Finish table data ----
  const finishTableColumns = createMemo(() => [
    { title: "#", width: "40px" },
    { title: "Name" },
    { title: "Time", width: "80px" },
  ])

  const finishTableData = createMemo(() => {
    const runners = replayRunners()
    const volRows = eventVolunteers().map((v) => {
      const memberRoute = getMemberRoute(v.parkrunId)
      const name = memberRoute
        ? <A href={memberRoute} class={styles.link}>{parkrunIdToFace.get(v.parkrunId)?.name ?? formatName(v.volunteerName)}</A>
        : <span>{formatName(v.volunteerName)}</span>
      return [
        <span class={styles.volunteerLabel}>🙌</span>,
        name,
        <span class={styles.volunteerLabel}>{v.roles.map(translateRole).join(", ")}</span>,
      ] as import("solid-js").JSX.Element[]
    })
    const runRows = runners.map((r) => {
      const memberRoute = getMemberRoute(r.parkrunId)
      const name = memberRoute
        ? <A href={memberRoute} class={styles.link}>{r.name}</A>
        : <span>{r.name}</span>
      return [
        <span>{r.position}</span>,
        name,
        <span>{formatSecs(r.finishSeconds)}</span>,
      ] as import("solid-js").JSX.Element[]
    })
    return [...runRows, ...volRows]
  })

  /** The slowest finisher's time (total animation duration in seconds). */
  const maxFinishTime = createMemo(() => {
    const runners = replayRunners()
    if (runners.length === 0) return 0
    return runners[runners.length - 1].finishSeconds
  })

  // ---- Course overrides ----
  const courseOverride = createMemo(() => COURSE_OVERRIDES[eventId()] ?? {})

  // ---- Projected path ----
  const projected = createMemo(() => {
    const cd = courseData()
    if (!cd) return null
    const extraCoords = cd.points.map((pt) => pt.coordinates)

    // Apply reverse override
    let coords = cd.coordinates
    if (courseOverride().reverse) {
      coords = [...coords].reverse()
    }

    // Project using single-lap coords (for bounding box)
    const proj = projectCoordinates(coords, extraCoords, PADDING)

    // Apply sections override: each section [fromIdx, toIdx] defines a
    // sub-path through the projected coordinates. If fromIdx < toIdx,
    // the runner moves forward; if fromIdx > toIdx, the runner moves
    // backward. Between sections the runner teleports to the new start.
    const sections = courseOverride().sections
    if (sections && sections.length > 0) {
      const multiPath: Point2D[] = []
      for (const [fromIdx, toIdx] of sections) {
        let sectionPts: Point2D[]
        if (fromIdx <= toIdx) {
          sectionPts = proj.path.slice(fromIdx, toIdx + 1)
        } else {
          // Reverse: take coords from toIdx..fromIdx then reverse
          sectionPts = proj.path.slice(toIdx, fromIdx + 1).reverse()
        }
        // Skip first point of subsequent sections to avoid duplicate at junction
        multiPath.push(...(multiPath.length === 0 ? sectionPts : sectionPts))
      }
      return { ...proj, path: multiPath }
    }

    // Apply laps: repeat the projected path for multi-lap courses
    const laps = courseOverride().laps ?? 1
    if (laps > 1) {
      const singlePath = proj.path
      const multiPath: Point2D[] = []
      for (let lap = 0; lap < laps; lap++) {
        // Alternate direction for out-and-back style laps
        const lapPts = lap % 2 === 0 ? singlePath : [...singlePath].reverse()
        // Skip first point of subsequent laps to avoid duplicate at junction
        multiPath.push(...(lap === 0 ? lapPts : lapPts.slice(1)))
      }
      return { ...proj, path: multiPath }
    }

    return proj
  })
  const cumDist = createMemo(() => {
    const p = projected()
    if (!p) return [] as number[]
    return cumulativeDistances(p.path)
  })
  const viewBox = createMemo(() => {
    const p = projected()
    if (!p) return "0 0 100 100"
    // Expand by headSvgSize so heads + scatter area aren't clipped
    const margin = headSvgSize() * 2
    return `${-margin} ${-margin} ${p.width + margin * 2} ${p.height + margin * 2}`
  })
  const pathD = createMemo(() => {
    const p = projected()
    if (!p || p.path.length === 0) return ""
    return (
      `M ${p.path[0].x} ${p.path[0].y} ` +
      p.path.slice(1).map((pt) => `L ${pt.x} ${pt.y}`).join(" ")
    )
  })
  const labelledPoints = createMemo(() => {
    const cd = courseData()
    const p = projected()
    if (!cd || !p) return []
    return cd.points.map((pt) => ({
      label: pt.name,
      ...p.project(pt.coordinates),
    }))
  })

  /** Projected end/finish point (if one exists on the course). */
  const endPoint = createMemo<Point2D | null>(() => {
    const cd = courseData()
    const p = projected()
    if (!cd || !p) return null
    const ep = cd.points.find((pt) => END_POINTS.includes(pt.name.toLowerCase()))
    if (ep) return p.project(ep.coordinates)
    // Fallback to the final coordinate of the projected path
    if (p.path.length > 0) return p.path[p.path.length - 1]
    return null
  })

  // ---- SVG ref + scale factor so heads render at fixed pixel size ----
  let svgEl: SVGSVGElement | undefined
  const [svgScale, setSvgScale] = createSignal(1) // pixels per SVG unit

  function updateScale() {
    if (!svgEl) return
    const p = projected()
    if (!p) return
    const rect = svgEl.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    // With preserveAspectRatio="xMidYMid meet", the effective scale is
    // the minimum of width-fit and height-fit.
    const scaleX = rect.width / p.width
    const scaleY = rect.height / p.height
    setSvgScale(Math.min(scaleX, scaleY))
  }

  // Re-run scale calc whenever the projected viewBox changes (course loaded)
  createEffect(() => {
    projected() // track dependency
    requestAnimationFrame(() => updateScale())
  })

  onMount(() => {
    updateScale()
    const ro = new ResizeObserver(() => updateScale())
    if (svgEl) ro.observe(svgEl)
    onCleanup(() => ro.disconnect())
  })

  /** SVG-unit size that equals HEAD_SIZE screen pixels */
  const headSvgSize = createMemo(() => {
    const s = svgScale()
    if (s === 0) return HEAD_SIZE
    return HEAD_SIZE / s
  })

  // ---- Playback state ----
  const [speed, setSpeed] = createSignal(10)
  const [playing, setPlaying] = createSignal(false)
  const [elapsedSecs, setElapsedSecs] = createSignal(0) // simulated seconds

  let animFrameId: number | undefined
  let lastTimestamp: number | undefined

  function tick(ts: number) {
    if (lastTimestamp === undefined) lastTimestamp = ts
    const dt = (ts - lastTimestamp) / 1000 // real seconds elapsed
    lastTimestamp = ts

    setElapsedSecs((prev) => {
      const next = prev + dt * speed()
      if (next >= maxFinishTime()) {
        setPlaying(false)
        return maxFinishTime()
      }
      return next
    })
    if (playing()) animFrameId = requestAnimationFrame(tick)
  }

  function togglePlay() {
    if (playing()) {
      setPlaying(false)
      if (animFrameId) cancelAnimationFrame(animFrameId)
      lastTimestamp = undefined
    } else {
      // If at end, restart
      if (elapsedSecs() >= maxFinishTime()) setElapsedSecs(0)
      setPlaying(true)
      lastTimestamp = undefined
      animFrameId = requestAnimationFrame(tick)
    }
  }

  function handleSlider(value: number) {
    setElapsedSecs(value)
    // If playing, re-sync
    lastTimestamp = undefined
  }

  onCleanup(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId)
  })

  // ---- Runner positions (recomputed every frame via signal reads) ----
  // Track previous x per runner to determine movement direction
  const prevXMap = new Map<string, number>()

  const runnerPositions = createMemo(() => {
    const t = elapsedSecs()
    const cd = cumDist()
    const p = projected()
    if (!p || cd.length === 0) return []

    const ep = endPoint()
    const hs = headSvgSize()

    return replayRunners().map((runner, idx) => {
      const fraction = Math.min(1, t / runner.finishSeconds)
      const finished = t >= runner.finishSeconds

      let pos: Point2D
      if (finished && ep) {
        // Scatter finished runners around the end point so they don't stack
        const finishedBefore = replayRunners().slice(0, idx).filter((r) => t >= r.finishSeconds).length
        const angle = (finishedBefore * 2.39996) // golden angle in radians for even spread
        const ring = Math.floor(finishedBefore / 6)
        const radius = hs * 0.8 * (ring + 1)
        pos = {
          x: ep.x + Math.cos(angle) * radius,
          y: ep.y + Math.sin(angle) * radius,
        }
      } else {
        pos = pointAtFraction(p.path, cd, fraction)
      }

      const prevX = prevXMap.get(runner.parkrunId) ?? pos.x
      const movingRight = pos.x > prevX + 0.01
      const movingLeft = pos.x < prevX - 0.01
      prevXMap.set(runner.parkrunId, pos.x)
      // facingRight: true = flip, false = normal. Sticky – keeps last direction when stationary.
      const prevDir = (runner as any).__lastDir as boolean | undefined
      const facingRight = movingRight ? true : movingLeft ? false : (prevDir ?? false)
      ;(runner as any).__lastDir = facingRight
      return { ...runner, x: pos.x, y: pos.y, finished, fraction, facingRight }
    })
  })

  // ---- How many have finished ----
  const finishedCount = createMemo(
    () => runnerPositions().filter((r) => r.finished).length,
  )

  // ---- Tree placements (computed once when course loads) ----
  const trees = createMemo(() => {
    const p = projected()
    if (!p || p.path.length === 0) return []
    const hs = headSvgSize()
    const minH = hs * 1.5  // ~40-45px trees
    const maxH = hs * 2.2  // ~55-66px trees
    const minShrubH = hs * (8 / HEAD_SIZE)  // ~8px shrubs
    const maxShrubH = hs * (16 / HEAD_SIZE) // ~16px shrubs
    const clearance = hs * 1.5 // keep trees away from path
    // Use a seed derived from coordinate count for determinism
    const seed = p.path.length * 7919 + Math.round(p.width * 31)
    return placeTrees(p.path, p.width, p.height, minH, maxH, minShrubH, maxShrubH, clearance, seed)
  })

  // ---- Title ----
  const title = createMemo(
    () => `${eventName()} #${eventNumber()} Replay`,
  )

  // ---- Render ----

  return (
    <div class={styles.page}>
      <Show when={!courseLoading()} fallback={<p class={styles.loading}>Loading course…</p>}>
        <Show when={hasData()} fallback={<NotFoundPage />}>
          <FieldBlock title={title()}>
            <Show when={eventDate()}>
              {(date) => (
                <p class={styles.eventDate}>{formatDate(new Date(`${date()}T00:00:00`))}</p>
              )}
            </Show>
            <div class={styles.replayContainer}>
              {/* ---- SVG Course + Runners ---- */}
              <svg
                ref={svgEl}
                viewBox={viewBox()}
                class={styles.svg}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Decorative trees (behind the path) */}
                <For each={trees()}>
                  {(tree) => (
                    <image
                      href={tree.asset}
                      x={tree.x - tree.height * 0.35}
                      y={tree.y - tree.height}
                      height={tree.height}
                      preserveAspectRatio="xMidYMax meet"
                      style={{ opacity: "0.85", "pointer-events": "none" }}
                    />
                  )}
                </For>

                {/* Route path background */}
                <path
                  d={pathD()}
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  stroke-width="6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d={pathD()}
                  fill="none"
                  stroke="#000000"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                {/* Labelled points */}
                <For each={labelledPoints()}>
                  {(pt) => (
                    <g>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#fff"
                        stroke="#333"
                        stroke-width="1.5"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        text-anchor="middle"
                        class={styles.label}
                      >
                        {POINT_EMOJI[pt.label.toLowerCase()] ?? pt.label}
                      </text>
                    </g>
                  )}
                </For>

                {/* Runner faces / dots */}
                <For each={runnerPositions()}>
                  {(runner) => (
                    <g
                      style={{
                        opacity: runner.finished ? "1" : "1",
                        transition: "opacity 0.3s",
                      }}
                    >
                      <Show
                        when={runner.face}
                        fallback={
                          <circle
                            cx={runner.x}
                            cy={runner.y}
                            r="4"
                            fill={runner.finished ? "#888" : "#fff"}
                            stroke="#333"
                            stroke-width="1"
                          />
                        }
                      >
                        <image
                          href={runner.face!}
                          x={runner.x - headSvgSize() / 2}
                          y={runner.y - headSvgSize() * 0.6}
                          height={headSvgSize()}
                          preserveAspectRatio="xMidYMid meet"
                          transform={runner.facingRight ? `translate(${runner.x * 2}, 0) scale(-1, 1)` : undefined}
                        />
                      </Show>
                    </g>
                  )}
                </For>
              </svg>

              {/* ---- Controls ---- */}
              <div class={styles.controls}>
                {/* Play / pause */}
                <button class={styles.playBtn} onClick={togglePlay}>
                  {playing() ? "⏸" : "▶"}

                </button>

                {/* Slider */}
                <div class={styles.sliderRow}>
                  <span class={styles.time}>{formatSecs(elapsedSecs())}</span>
                  <input
                    type="range"
                    class={styles.slider}
                    min="0"
                    max={maxFinishTime()}
                    step="1"
                    value={elapsedSecs()}
                    onInput={(e) => handleSlider(Number(e.currentTarget.value))}
                  />
                  <span class={styles.time}>{formatSecs(maxFinishTime())}</span>
                </div>

                {/* Speed buttons */}
                <div class={styles.speedRow}>
                  <For each={[...SPEED_OPTIONS]}>
                    {(s) => (
                      <button
                        class={
                          styles.speedBtn +
                          (speed() === s ? ` ${styles.speedBtnActive}` : "")
                        }
                        onClick={() => setSpeed(s)}
                      >
                        x{s}
                      </button>
                    )}
                  </For>
                </div>

                {/* Finished counter */}
                <p class={styles.finishedCount}>
                  {finishedCount()} / {replayRunners().length} finished
                </p>
              </div>
              <Show when={!COURSE_OVERRIDES[eventId()]}>
                <div class={styles.disclaimer}>
                  The replay is based on finish times and map data which often doesn't reflect things like laps, direction or correct start/end locations.
                </div>
              </Show>
            </div>
          </FieldBlock>

          {/* Finish table */}
          <DirtBlock title="Results">
            <Table
              columns={finishTableColumns()}
              data={finishTableData()}
              empty="No results."
            />
          </DirtBlock>

          {/* Link to event details page */}
          <A href={`/event/${eventId()}`} class={styles.eventLink}>
            View {eventName()} Details →
          </A>
        </Show>
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
    gap: "1rem",
  }),
  loading: css({
    color: "var(--color-white)",
    textAlign: "center",
    padding: "2rem",
  }),
  replayContainer: css({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "0.5rem",
  }),
  svg: css({
    display: "block",
    width: "100%",
    height: "auto",
    maxHeight: "600px",
    borderRadius: "8px",
  }),
  label: css({
    fontSize: "13px",
    fill: "var(--color-white)",
    fontWeight: "bold",
    pointerEvents: "none",
  }),
  controls: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    alignItems: "center",
    padding: "0.5rem 0",
  }),
  playBtn: css({
    fontSize: "1.5rem",
    background: "none",
    border: "2px solid var(--color-black)",
    borderRadius: "4px",
    cornerShape: "notch",
    width: "48px",
    height: "48px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--color-black)",
    dropShadow: "0 6px 0 var(--color-black)",
    _hover: {
      background: "var(--overlay-white-10)"
    },
  }),
  sliderRow: css({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    maxWidth: "600px",
  }),
  slider: css({
    flex: 1,
    height: "6px",
    appearance: "none",
    background: "var(--dirt-parchment)",
    borderRadius: "3px",
    outline: "none",
    cursor: "pointer",
    "&::-webkit-slider-thumb": {
      appearance: "none",
      width: "16px",
      height: "16px",
      borderRadius: "2px",
      background: "var(--dirt-control)",
      cornerShape: "notch",
      cursor: "grab",
      border: "2px solid var(--dirt-control-dark)",
    },
    "&::-moz-range-thumb": {
      width: "16px",
      height: "16px",
      borderRadius: "2px",
      background: "var(--dirt-control)",
      cornerShape: "notch",
      cursor: "grab",
      border: "2px solid var(--dirt-control-dark)",
    },
  }),
  time: css({
    fontSize: "1.75rem",
    color: "var(--color-black)",
    fontFamily: '"Jersey 10", sans-serif',
    minWidth: "55px",
    textAlign: "center",
  }),
  speedRow: css({
    display: "flex",
    gap: "0.4rem",
    flexWrap: "wrap",
    justifyContent: "center",
  }),
  speedBtn: css({
    fontFamily: '"Jersey 10", sans-serif',
    padding: "0.3rem 0.7rem",
    border: "2px solid var(--color-black)",
    borderRadius: "2px",
    background: "rgba(255,255,255,0.05)",
    color: "var(--color-black)",
    cursor: "pointer",
    cornerShape: "notch",
    fontSize: "1.25rem",
    fontWeight: 600,
    _hover: { background: "var(--overlay-white-15)" },
  }),
  speedBtnActive: css({
    background: "var(--color-white)",
    _hover: { background: "var(--color-white)" },
  }),
  finishedCount: css({
    fontFamily: '"Jersey 10", sans-serif',
    fontSize: "2rem",
    color: "var(--color-black)",
    margin: "0",
  }),
  disclaimer: css({
    textAlign: "center",
    p: '10px 20px',
    m: "0.5rem auto 0",
    background: 'var(--color-black)',
    color: 'var(--color-white)',
  }),
  eventDate: css({
    textAlign: "center",
    fontSize: "1.1rem",
    margin: "0 0 0.5rem",
    opacity: 0.8,
  }),
  link: css({
    color: "inherit",
    textDecoration: "underline",
    fontWeight: "bold",
  }),
  volunteerLabel: css({
    fontSize: "0.85rem",
    opacity: 0.7,
    fontStyle: "italic",
  }),
  eventLink: css({
    display: "block",
    textAlign: "center",
    color: "inherit",
    fontSize: "1.1rem",
    fontWeight: "bold",
    textDecoration: "underline",
    padding: "0.5rem",
    _hover: { opacity: 0.8 },
  }),
}
