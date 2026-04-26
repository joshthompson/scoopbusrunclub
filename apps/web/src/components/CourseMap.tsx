import { css } from "@style/css"
import { onMount, onCleanup } from "solid-js"
import type { CourseData } from "@/utils/api"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// ---------------------------------------------------------------------------
// Point label emoji fallbacks (same as CourseSVG)
// ---------------------------------------------------------------------------

const POINT_EMOJI: Record<string, string> = {
  start: "🟢",
  finish: "🏁",
  mål: "🏁",
  "maali/mål/finish": "🏁",
  "lähtö/start": "🟢",
  "turnaround point": "🔄",
  "turning point": "🔄",
  "u-turn": "🔄",
  "1km": "1️⃣",
  "2km": "2️⃣",
  "3km": "3️⃣",
  "4km": "4️⃣",
}

function pointLabel(name: string): string {
  return POINT_EMOJI[name.toLowerCase()] ?? name
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourseMap(props: { course: CourseData }) {
  let container!: HTMLDivElement
  let map: L.Map | undefined

  onMount(() => {
    // Coordinates come as [lon, lat, alt?] — Leaflet uses [lat, lon]
    const latLngs: L.LatLngExpression[] = props.course.coordinates.map(
      (c) => [c[1], c[0]] as [number, number],
    )

    if (latLngs.length === 0) return

    // Create the map
    map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,  // prevent accidental zoom while scrolling
    })

    // OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Draw route polyline
    const polyline = L.polyline(latLngs, {
      color: "#3b82f6",
      weight: 4,
      opacity: 0.85,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map)

    const bounds = polyline.getBounds()

    // Add labelled point markers
    for (const pt of props.course.points) {
      const lat = pt.coordinates[1]
      const lon = pt.coordinates[0]
      const label = pointLabel(pt.name)

      const icon = L.divIcon({
        className: styles.markerIcon,
        html: `<span class="${styles.markerLabel}">${label}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      L.marker([lat, lon], { icon })
        .addTo(map)
        .bindTooltip(pt.name, {
          permanent: false,
          direction: "top",
          offset: [0, -12],
        })
    }

    // Leaflet needs the container to have its final dimensions before
    // fitBounds can compute the correct zoom level. Use a ResizeObserver
    // to wait for layout, then invalidate + fit.
    const fitOpts: L.FitBoundsOptions = { padding: [40, 40], maxZoom: 17 }

    // Initial fit (may use stale dimensions if DirtBlock hasn't painted yet)
    map.fitBounds(bounds, fitOpts)

    // Re-fit once the container reaches its real size
    const ro = new ResizeObserver(() => {
      map?.invalidateSize()
      map?.fitBounds(bounds, fitOpts)
      ro.disconnect() // only need the first resize
    })
    ro.observe(container)

    // Fallback: also re-fit after a short delay for safety
    setTimeout(() => {
      map?.invalidateSize()
      map?.fitBounds(bounds, fitOpts)
    }, 200)
  })

  onCleanup(() => {
    map?.remove()
  })

  return <div ref={container} class={styles.container} />
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: css({
    width: "100%",
    height: "600px",
    borderRadius: "8px",
    overflow: "hidden",
    mb: "0.5rem",
    "& .leaflet-control-attribution": {
      fontSize: "10px",
    },
  }),
  markerIcon: css({
    background: "none !important",
    border: "none !important",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  markerLabel: css({
    fontSize: "20px",
    lineHeight: 1,
    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
  }),
}
