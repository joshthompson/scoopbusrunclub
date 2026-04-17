import { css } from "@style/css"
import { createMemo, For, Show } from "solid-js"
import type { CourseData } from "@/utils/api"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Point2D {
  x: number
  y: number
}

/**
 * Project lon/lat coordinates into an SVG coordinate space.
 * Uses a fixed canvas width and derives the height from the
 * content's natural aspect ratio so the viewBox fits tightly.
 */
const CANVAS_W = 400

function projectCoordinates(coords: number[][], padding: number) {
  const empty = {
    path: [] as Point2D[],
    project: (_c: number[]) => ({ x: 0, y: 0 }),
    width: CANVAS_W,
    height: CANVAS_W,
  }
  if (coords.length === 0) return empty

  // lon = index 0, lat = index 1
  let minLon = Infinity, maxLon = -Infinity
  let minLat = Infinity, maxLat = -Infinity
  for (const c of coords) {
    if (c[0] < minLon) minLon = c[0]
    if (c[0] > maxLon) maxLon = c[0]
    if (c[1] < minLat) minLat = c[1]
    if (c[1] > maxLat) maxLat = c[1]
  }

  const lonSpan = maxLon - minLon || 0.0001
  const latSpan = maxLat - minLat || 0.0001

  // Approximate Mercator correction for longitude
  const midLat = (minLat + maxLat) / 2
  const lonScale = Math.cos((midLat * Math.PI) / 180)

  const geoW = lonSpan * lonScale
  const geoH = latSpan
  const aspect = geoH / geoW

  // Fit into a fixed-width canvas, derive height from aspect ratio
  const drawW = CANVAS_W - padding * 2
  const drawH = drawW * aspect
  const svgH = drawH + padding * 2

  const scale = drawW / geoW

  const project = (c: number[]): Point2D => ({
    x: padding + (c[0] - minLon) * lonScale * scale,
    y: padding + drawH - (c[1] - minLat) * scale, // flip Y
  })

  return { path: coords.map(project), project, width: CANVAS_W, height: svgH }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PADDING = 30

/** Point label emoji fallbacks */
const POINT_EMOJI: Record<string, string> = {
  start: "🟢",
  finish: "🏁",
  mål: "🏁",
  "turnaround point": "🔄",
  "turning point": "🔄",
  "u-turn": "🔄",
  "1km": "1",
  "2km": "2",
  "3km": "3",
  "4km": "4",
}

export function CourseSVG(props: { course: CourseData }) {
  const projected = createMemo(() =>
    projectCoordinates(props.course.coordinates, PADDING),
  )

  const viewBox = createMemo(() => {
    const { width, height } = projected()
    if (width === 0 || height === 0) return "0 0 100 100"
    return `0 0 ${width} ${height}`
  })

  const pathD = createMemo(() => {
    const pts = projected().path
    if (pts.length === 0) return ""
    return (
      `M ${pts[0].x} ${pts[0].y} ` +
      pts
        .slice(1)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(" ")
    )
  })

  const labelledPoints = createMemo(() => {
    const proj = projected().project
    return props.course.points.map((pt) => ({
      label: pt.name,
      ...proj(pt.coordinates),
    }))
  })

  return (
    <div class={styles.wrapper}>
      <svg
        viewBox={viewBox()}
        class={styles.svg}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Route path */}
        <Show when={pathD()}>
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
        </Show>

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
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  wrapper: css({
    width: "100%",
    borderRadius: "8px",
    overflow: "hidden",
    mb: "0.5rem",
  }),
  svg: css({
    display: "block",
    width: "100%",
    height: "auto",
    maxHeight: "500px",
  }),
  label: css({
    fontSize: "13px",
    fill: "#fff",
    fontWeight: "bold",
    pointerEvents: "none",
    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
  }),
}
