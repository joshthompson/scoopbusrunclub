import { css } from "@style/css"
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useParams } from "@solidjs/router"
import { type RunResultItem, type Runner } from "@/utils/api"
import { parseTimeToSeconds } from "@/utils/misc"
import { getRunnerKeyFromRouteName } from "@/utils/memberRoute"
import { runners as runnerSignals } from "@/components/header/runners"
import { buildCelebrationData, getCelebrationTags } from "@/components/ResultCelebrations"

/** Category of celebration for filtering */
export type GraphMarkerCategory = "pb" | "coursePb" | "other"

/** A celebration marker to display above a data point on the graph. */
export interface GraphMarker {
  /** Index of the data point this marker is attached to */
  index: number
  /** Emoji character to render */
  emoji: string
  /** Short achievement name */
  label: string
  /** Longer description for tooltip */
  description: string
  /** Run time (e.g. "23:45") */
  time?: string
  /** Event name (e.g. "Haga parkrun") */
  eventName?: string
  /** Date string (e.g. "2025-03-15") */
  date?: string
  /** Filter category */
  category: GraphMarkerCategory
}

interface GraphProps {
  results: RunResultItem[]
  runners: Runner[]
}

const HEIGHT = 400
const MARGIN = { left: 60, right: 20, top: 30, bottom: 40 }
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom
const MAX_Y_LABELS = 6

function SignBadge(props: {
  x: number
  y: number
  label: string
  badgeW?: number
  badgeH?: number
}) {
  const bw = () => props.badgeW ?? 40
  const bh = () => props.badgeH ?? 18
  const bx = () => props.x - bw() / 2
  const by = () => props.y - bh() / 2
  const postTopY = () => by() + bh()
  const postBottomY = () => postTopY() + 6

  return (
    <g>
      {/* Sign posts */}
      <line
        x1={bx() + bw() * 0.3} y1={postTopY()}
        x2={bx() + bw() * 0.3} y2={postBottomY()}
        stroke="#4A3215" stroke-width="1.5"
      />
      <line
        x1={bx() + bw() * 0.7} y1={postTopY()}
        x2={bx() + bw() * 0.7} y2={postBottomY()}
        stroke="#4A3215" stroke-width="1.5"
      />
      {/* Badge outline */}
      <rect x={bx() - 1} y={by() - 1} width={bw() + 2} height={bh() + 2} fill="#4A3215" />
      {/* Badge fill */}
      <rect x={bx()} y={by()} width={bw()} height={bh()} fill="#AD855A" />
      {/* Badge text */}
      <text
        x={props.x}
        y={props.y}
        fill="#4A3215"
        font-family="monospace"
        font-weight="bold"
        font-size="11"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {props.label}
      </text>
    </g>
  )
}

export function GraphSVG(props: GraphProps) {
  let containerRef!: HTMLDivElement
  const [width, setWidth] = createSignal(800)
  const [hoveredMarker, setHoveredMarker] = createSignal<{ marker: GraphMarker; anchorRect: DOMRect } | null>(null)
  const [showPbs, setShowPbs] = createSignal(true)
  const [showCoursePbs, setShowCoursePbs] = createSignal(true)
  const [showOther, setShowOther] = createSignal(true)

  onMount(() => {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    ro.observe(containerRef)
    onCleanup(() => ro.disconnect())
  })

  const params = useParams<{ name: string }>()
  const runnerKey = createMemo(() => getRunnerKeyFromRouteName(params.name) ?? "")
  const runnerSignal = createMemo(() => runnerSignals[runnerKey()])
  const runnerData = createMemo(() => runnerSignal()?.[0]())
  const runnerId = createMemo(() => runnerData()?.id ?? "")

  const runnerResults = createMemo(() => {
    return props.results
      .filter((r) => r.parkrunId === runnerId())
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  const celebrationData = createMemo(() => buildCelebrationData(props.results, props.runners))

  const chartData = createMemo(() => {
    const data = runnerResults()
    const w = width()
    if (data.length === 0 || w <= 0) return null

    const plotW = w - MARGIN.left - MARGIN.right

    const times = data.map((r) => parseTimeToSeconds(r.time))
    const dates = data.map((r) => r.date)

    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    // Snap Y range to exact minute boundaries
    const minMinute = Math.floor(minTime / 60)
    const maxMinute = Math.ceil(maxTime / 60)
    const totalMinutes = maxMinute - minMinute
    const minuteStep = Math.max(1, Math.ceil(totalMinutes / (MAX_Y_LABELS - 1)))

    const yMin = (minMinute - minuteStep) * 60
    const yMax = (maxMinute + minuteStep) * 60

    // Coordinate mappers
    const toX = (i: number) => MARGIN.left + (i / (data.length - 1 || 1)) * plotW
    const toY = (t: number) => MARGIN.top + ((t - yMin) / (yMax - yMin)) * PLOT_H

    // Y grid labels
    const yLabels: { y: number; label: string }[] = []
    for (let m = minMinute; m <= maxMinute; m += minuteStep) {
      yLabels.push({ y: toY(m * 60), label: `${m}:00` })
    }

    // X axis labels
    const xBadgeW = 65
    const minLabelSpacing = xBadgeW * 1.5
    const maxXLabels = Math.max(1, Math.floor(plotW / minLabelSpacing))
    const xLabelStep = Math.max(1, Math.ceil(data.length / maxXLabels))
    const xLabels: { x: number; label: string }[] = []
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    for (let i = 0; i < data.length; i += xLabelStep) {
      const [y, m] = dates[i].split("-")
      xLabels.push({ x: toX(i), label: `${monthNames[parseInt(m, 10) - 1]} ${y}` })
    }

    // Dashed vertical lines every 5 results
    const verticalLines: number[] = []
    for (let i = 4; i < data.length; i += 5) {
      verticalLines.push(toX(i))
    }

    // Data points
    const points = data.map((_, i) => ({ x: toX(i), y: toY(times[i]) }))

    // SVG path for the line
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ")

    // Build celebrations from the shared celebration rules
    const celData = celebrationData()
    const pid = runnerId()
    const celebrations: GraphMarker[] = []

    for (let i = 0; i < data.length; i++) {
      const r = data[i]
      const resultKey = `${r.parkrunId}:${r.date}:${r.eventName}:${r.eventNumber}`
      const runnerDateKey = `${r.parkrunId}:${r.date}`
      const tags = getCelebrationTags({
        data: celData,
        resultKey,
        runnerDateKey,
        parkrunId: pid,
        date: r.date,
      })

      for (const tag of tags) {
        const isPb = tag.label === "New PB!" || tag.label === "Parkrun debut!" || tag.label === "New Junior PB!"
        const isCoursePb = !isPb && tag.label.startsWith("New ") && tag.label.endsWith(" PB!")
        celebrations.push({
          index: i,
          emoji: tag.emoji,
          label: tag.label,
          description: tag.description,
          time: r.time,
          eventName: r.eventName,
          date: r.date,
          category: isPb ? "pb" : isCoursePb ? "coursePb" : "other",
        })
      }
    }

    return { yLabels, xLabels, verticalLines, points, linePath, celebrations, width: w }
  })

  const visibleCelebrations = createMemo(() => {
    const d = chartData()
    if (!d) return []
    return d.celebrations.filter((c) => {
      if (c.category === "pb" && showPbs()) return true
      if (c.category === "coursePb" && showCoursePbs()) return true
      if (c.category === "other" && showOther()) return true
      return false
    })
  })

  /** Celebrations with stacking offsets for overlapping markers at the same data point */
  const positionedCelebrations = createMemo(() => {
    const markers = visibleCelebrations()
    const d = chartData()
    if (!d) return []

    const EMOJI_SIZE = 22
    const GAP = 4
    const STEP = EMOJI_SIZE + GAP
    const BASE_OFFSET = 14 // base distance above the point

    // Group by index to determine stacking order
    const countByIndex = new Map<number, number>()
    for (const m of markers) {
      countByIndex.set(m.index, (countByIndex.get(m.index) ?? 0) + 1)
    }
    const seenByIndex = new Map<number, number>()

    return markers.map((marker) => {
      const slot = seenByIndex.get(marker.index) ?? 0
      seenByIndex.set(marker.index, slot + 1)
      const point = d.points[marker.index]

      // Check if there's enough space above the point
      const spaceAbove = point.y - MARGIN.top
      const totalNeeded = BASE_OFFSET + (countByIndex.get(marker.index)! - 1) * STEP + EMOJI_SIZE

      if (spaceAbove >= totalNeeded) {
        // Stack upward above the point
        return { marker, y: point.y - BASE_OFFSET - slot * STEP }
      } else {
        // Not enough space above — stack downward below the point
        return { marker, y: point.y + BASE_OFFSET + EMOJI_SIZE + slot * STEP }
      }
    })
  })

  return (
    <div ref={containerRef} class={styles.container}>
    <Show when={chartData()}>
      {(data) => (
        <svg
          width={data().width}
          height={HEIGHT}
        >
          {/* Horizontal grid lines */}
          <For each={data().yLabels}>
            {(label) => (
              <line
                x1={MARGIN.left} y1={label.y}
                x2={data().width - MARGIN.right} y2={label.y}
                stroke="rgba(0,0,0,0.1)" stroke-width="1"
              />
            )}
          </For>

          {/* Y axis labels */}
          <For each={data().yLabels}>
            {(label) => (
              <SignBadge x={MARGIN.left - 28} y={label.y} label={label.label} />
            )}
          </For>

          {/* X axis labels */}
          <For each={data().xLabels}>
            {(label) => (
              <SignBadge x={label.x} y={HEIGHT - MARGIN.bottom + 17} label={label.label} badgeW={65} />
            )}
          </For>

          {/* Dashed vertical lines every 5 results */}
          <For each={data().verticalLines}>
            {(x) => (
              <line
                x1={x} y1={MARGIN.top}
                x2={x} y2={HEIGHT - MARGIN.bottom}
                stroke="#AD855A" stroke-width="1"
                stroke-dasharray="4 4"
              />
            )}
          </For>


          {/* Y axis */}
          <line
            x1={MARGIN.left} y1={MARGIN.top}
            x2={MARGIN.left} y2={HEIGHT - MARGIN.bottom}
            stroke="#5c3d1a" stroke-width="2"
          />
          {/* X axis */}
          <line
            x1={MARGIN.left} y1={HEIGHT - MARGIN.bottom}
            x2={data().width - MARGIN.right} y2={HEIGHT - MARGIN.bottom}
            stroke="#5c3d1a" stroke-width="2"
          />

          {/* Line outline */}
          <path
            d={data().linePath}
            fill="none"
            stroke="#4A3215"
            stroke-width="5"
            stroke-linejoin="bevel"
            stroke-linecap="square"
          />

          {/* Line */}
          <path
            d={data().linePath}
            fill="none"
            stroke="#AD855A"
            stroke-width="3"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          {/* Data point squares */}
          <For each={data().points}>
            {(p) => (
              <g>
                <rect x={p.x - 4} y={p.y - 4} width={8} height={8} fill="#4A3215" />
                <rect x={p.x - 3} y={p.y - 3} width={6} height={6} fill="#AD855A" />
              </g>
            )}
          </For>

          {/* Celebration markers */}
          <For each={positionedCelebrations()}>
            {(positioned) => {
              const p = () => data().points[positioned.marker.index]
              return (
                <text
                  x={p().x}
                  y={positioned.y}
                  font-size="20"
                  text-anchor="middle"
                  dominant-baseline="auto"
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
                    setHoveredMarker({ marker: positioned.marker, anchorRect: rect })
                  }}
                  onMouseLeave={() => setHoveredMarker(null)}
                >
                  {positioned.marker.emoji}
                </text>
              )
            }}
          </For>
        </svg>
      )}
    </Show>
    <Show when={hoveredMarker()}>
      {(info) => {
        const tooltipWidth = 220
        const pad = 8
        const style = () => {
          const rect = info().anchorRect
          let left = rect.left + rect.width / 2 - tooltipWidth / 2
          left = Math.max(pad, Math.min(left, window.innerWidth - tooltipWidth - pad))
          const top = rect.top - pad
          return {
            position: "fixed" as const,
            left: `${left}px`,
            top: `${top}px`,
            width: `${tooltipWidth}px`,
            transform: "translateY(-100%)",
          }
        }
        const m = () => info().marker
        const dateStr = () => {
          if (!m().date) return ""
          const [y, mo, d] = m().date!.split("-")
          return `${d}/${mo}/${y}`
        }
        return (
          <div class={styles.tooltip} style={style()}>
            <div class={styles.tooltipTitle}>{m().emoji} {m().label}</div>
            <div>{m().description}</div>
            <Show when={m().time || m().eventName || m().date}>
              <div class={styles.tooltipDetails}>
                <Show when={m().time}>
                  <span>⏱ {m().time}</span>
                </Show>
                <Show when={m().eventName}>
                  <span>📍 {m().eventName}</span>
                </Show>
                <Show when={m().date}>
                  <span>📅 {dateStr()}</span>
                </Show>
              </div>
            </Show>
          </div>
        )
      }}
    </Show>
    <div class={styles.toggles}>
      <label class={styles.toggleLabel}>
        <input
          type="checkbox"
          checked={showPbs()}
          onChange={(e) => setShowPbs(e.currentTarget.checked)}
        />
        🏅 Show PBs
      </label>
      <label class={styles.toggleLabel}>
        <input
          type="checkbox"
          checked={showCoursePbs()}
          onChange={(e) => setShowCoursePbs(e.currentTarget.checked)}
        />
        ⭐ Show Course PBs
      </label>
      <label class={styles.toggleLabel}>
        <input
          type="checkbox"
          checked={showOther()}
          onChange={(e) => setShowOther(e.currentTarget.checked)}
        />
        🎊 Show Other Celebrations
      </label>
    </div>
    </div>
  )
}

const styles = {
  container: css({
    width: "100%",
    position: "relative",
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
  tooltipTitle: css({
    fontWeight: "bold",
    fontSize: "0.8rem",
    mb: "0.15rem",
  }),
  tooltipDetails: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
    mt: "0.25rem",
    pt: "0.25rem",
    borderTop: "1px solid rgba(255,255,255,0.2)",
    fontSize: "0.7rem",
    opacity: 0.85,
  }),
  toggles: css({
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    pt: "0.5rem",
    flexWrap: "wrap",
  }),
  toggleLabel: css({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.8rem",
    fontWeight: "bold",
    color: "#4A3215",
    cursor: "pointer",
    userSelect: "none",
  }),
}