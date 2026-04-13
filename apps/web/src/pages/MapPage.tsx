import { createMemo, createSignal, For, Show } from "solid-js"
import { css } from "@style/css"
import { A } from "@solidjs/router"
import { type RunResultItem, type VolunteerItem } from "../utils/api"
import { runners as runnerSignals } from "@/data/runners"
import { getEvent } from "@/utils/events"
import { DirtBlock } from "../components/ui/DirtBlock"
import { FieldBlock } from "../components/ui/FieldBlock"
import { Masonry } from "../components/ui/Masonry"
import { BackSignButton } from "@/components/BackSignButton"
import { getMemberRoute } from "@/utils/memberRoute"
import { COUNTRY_PIXELS, WORLD_PIXELS } from "@/data/map"

const COUNTRY_FLAGS: Record<string, string> = {
  AU: "🇦🇺", AT: "🇦🇹", CA: "🇨🇦", DK: "🇩🇰", FI: "🇫🇮",
  DE: "🇩🇪", IE: "🇮🇪", IT: "🇮🇹", JP: "🇯🇵", LT: "🇱🇹",
  MY: "🇲🇾", NA: "🇳🇦", NL: "🇳🇱", NZ: "🇳🇿", NO: "🇳🇴",
  PL: "🇵🇱", SG: "🇸🇬", ZA: "🇿🇦", SE: "🇸🇪", UK: "🇬🇧", US: "🇺🇸",
}

const COUNTRY_NAMES: Record<string, string> = {
  AU: "Australia", AT: "Austria", CA: "Canada", DK: "Denmark", FI: "Finland",
  DE: "Germany", IE: "Ireland", IT: "Italy", JP: "Japan", LT: "Lithuania",
  MY: "Malaysia", NA: "Namibia", NL: "Netherlands", NZ: "New Zealand", NO: "Norway",
  PL: "Poland", SG: "Singapore", ZA: "South Africa", SE: "Sweden", UK: "United Kingdom", US: "United States",
}

// ─── Map colours & highlight ────────────────────────────────────────────────────

const MAP_COLOR_NON_PARKRUN    = "#1a1a1a" // non-parkrun countries (black)
const MAP_COLOR_PARKRUN        = "#2d5a27" // parkrun countries not yet visited (dark green)
const MAP_COLOR_VISITED        = "#6abf4b" // parkrun countries we've visited (light green)
const MAP_COLOR_HIGHLIGHTED    = "#f8b832" // highlighted country (yellow)
const MAP_COLOR_OCEAN          = "#1a3a5c" // ocean background
const MAP_COLOR_DOUBLE_COUNTRY = "#d93025" // double country (red)

const PARKRUN_COUNTRIES = new Set(Object.keys(COUNTRY_PIXELS))

// ─── Data helpers ───────────────────────────────────────────────────────────────

interface CountryVisit {
  country: string
  events: { eventId: string; name: string; runners: Set<string>; count: number }[]
  totalVisits: number
}

/** Custom display names for specific events */
const EVENT_NAME_OVERRIDES: Record<string, string> = {
  "bushy": "Scoop Bushy Park",
}

function displayEventName(eventId: string, defaultName: string): string {
  return EVENT_NAME_OVERRIDES[eventId] ?? defaultName
}

function buildMapData(results: RunResultItem[], volunteers: VolunteerItem[]) {
  // Track unique visits per event by (parkrunId, date) so that running + volunteering
  // on the same day at the same event only counts as one visit.
  const eventStats = new Map<string, { name: string; country: string; runners: Set<string>; visits: Set<string> }>()

  for (const r of results) {
    const ev = getEvent(r.event)
    const country = ev?.country ?? "??"
    if (country === "??") continue
    if (!eventStats.has(r.event)) {
      eventStats.set(r.event, { name: displayEventName(r.event, r.eventName), country, runners: new Set(), visits: new Set() })
    }
    const stat = eventStats.get(r.event)!
    stat.runners.add(r.parkrunId)
    stat.visits.add(`${r.parkrunId}:${r.date}`)
  }

  for (const v of volunteers) {
    const ev = getEvent(v.event)
    const country = ev?.country ?? "??"
    if (country === "??") continue
    if (!eventStats.has(v.event)) {
      eventStats.set(v.event, { name: displayEventName(v.event, v.eventName), country, runners: new Set(), visits: new Set() })
    }
    const stat = eventStats.get(v.event)!
    stat.runners.add(v.parkrunId)
    stat.visits.add(`${v.parkrunId}:${v.date}`)
  }

  const byCountry = new Map<string, CountryVisit>()
  for (const [eventId, stat] of eventStats) {
    if (!byCountry.has(stat.country)) {
      byCountry.set(stat.country, { country: stat.country, events: [], totalVisits: 0 })
    }
    const count = stat.visits.size
    const cv = byCountry.get(stat.country)!
    cv.events.push({ eventId, name: stat.name, runners: stat.runners, count })
    cv.totalVisits += count
  }

  for (const cv of byCountry.values()) {
    cv.events.sort((a, b) => b.count - a.count)
  }

  return Array.from(byCountry.values()).sort((a, b) => b.totalVisits - a.totalVisits)
}

const parkrunIdToName = new Map<string, string>()
for (const [, [runner]] of Object.entries(runnerSignals)) {
  const data = runner()
  if (data.id) parkrunIdToName.set(data.id, data.name)
}

// ─── SVG map rendering ─────────────────────────────────────────────────────────

const CELL = 4 // SVG units per pixel cell
const COLS = WORLD_PIXELS[0].length
const ROWS = WORLD_PIXELS.length

function getLandPixels(): Set<string> {
  const set = new Set<string>()
  for (let r = 0; r < WORLD_PIXELS.length; r++) {
    const row = WORLD_PIXELS[r]
    for (let c = 0; c < row.length; c++) {
      if (row[c] === "1") set.add(`${c},${r}`)
    }
  }
  return set
}

const LAND_PIXELS = getLandPixels()

function getCountryLookup(): { lookup: Map<string, string>; doublePixels: Set<string> } {
  const lookup = new Map<string, string>()
  const doublePixels = new Set<string>()
  for (const [code, cells] of Object.entries(COUNTRY_PIXELS)) {
    for (const [c, r] of cells) {
      const key = `${c},${r}`
      if (lookup.has(key)) doublePixels.add(key)
      lookup.set(key, code)
    }
  }
  return { lookup, doublePixels }
}

const { lookup: COUNTRY_LOOKUP, doublePixels: DOUBLE_PIXELS } = getCountryLookup()

// ─── Component ──────────────────────────────────────────────────────────────────

interface MapPageProps {
  results: RunResultItem[]
  volunteers: VolunteerItem[]
}

export function MapPage(props: MapPageProps) {
  const mapData = createMemo(() => buildMapData(props.results, props.volunteers))
  const visitedCountries = createMemo(() => new Set(mapData().map((cv) => cv.country)))
  const totalCountries = createMemo(() => mapData().length)
  const totalEvents = createMemo(() => mapData().reduce((sum, c) => sum + c.events.length, 0))

  const countryDataLookup = createMemo(() => {
    const map = new Map<string, CountryVisit>()
    for (const cv of mapData()) map.set(cv.country, cv)
    return map
  })

  const [hoveredCountry, setHoveredCountry] = createSignal<string | null>(null)
  const [tooltipPos, setTooltipPos] = createSignal({ x: 0, y: 0 })

  const handleMouseMove = (e: MouseEvent) => {
    const svg = e.currentTarget as SVGSVGElement
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const svgX = (e.clientX - ctm.e) / ctm.a
    const svgY = (e.clientY - ctm.f) / ctm.d
    const col = Math.floor(svgX / CELL)
    const row = Math.floor(svgY / CELL)
    const key = `${col},${row}`
    setHoveredCountry(COUNTRY_LOOKUP.get(key) ?? null)
    setTooltipPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => setHoveredCountry(null)

  const pixelRects = createMemo(() => {
    const visited = visitedCountries()
    const highlighted = hoveredCountry()
    const rects: { x: number; y: number; fill: string; pos: string }[] = []

    const colorForCountry = (code: string | undefined): string => {
      if (code != null && code === highlighted) return MAP_COLOR_HIGHLIGHTED
      if (code != null && visited.has(code)) return MAP_COLOR_VISITED
      if (code != null && PARKRUN_COUNTRIES.has(code)) return MAP_COLOR_PARKRUN
      return MAP_COLOR_NON_PARKRUN
    }

    // Render all land pixels
    for (const key of LAND_PIXELS) {
      const [cs, rs] = key.split(",")
      const c = Number(cs)
      const r = Number(rs)
      const countryCode = COUNTRY_LOOKUP.get(key)
      const fill = DOUBLE_PIXELS.has(key) ? MAP_COLOR_DOUBLE_COUNTRY : colorForCountry(countryCode)
      rects.push({ x: c * CELL, y: r * CELL, fill, pos: `${c},${r}` })
    }

    // Also render country pixels not present in the land bitmap
    for (const [code, cells] of Object.entries(COUNTRY_PIXELS)) {
      const fill = colorForCountry(code)
      if (fill === MAP_COLOR_NON_PARKRUN) continue
      for (const [c, r] of cells) {
        const key = `${c},${r}`
        if (!LAND_PIXELS.has(key)) {
          const pixelFill = DOUBLE_PIXELS.has(key) ? MAP_COLOR_DOUBLE_COUNTRY : fill
          rects.push({ x: c * CELL, y: r * CELL, fill: pixelFill, pos: `${c},${r}` })
        }
      }
    }

    return rects
  })

  return (
    <div class={styles.container}>
      <FieldBlock title="Parkrun Tourism" signType="purple">
        <div class={styles.stats}>
          <div class={styles.stat}>
            <span class={styles.statValue}>{totalCountries()}</span>
            <span class={styles.statLabel}>Countries</span>
          </div>
          <div class={styles.stat}>
            <span class={styles.statValue}>{totalEvents()}</span>
            <span class={styles.statLabel}>Events</span>
          </div>
        </div>

        <div class={styles.mapContainer}>
          <svg
            viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
            class={styles.map}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <rect width={COLS * CELL} height={ROWS * CELL} fill={MAP_COLOR_OCEAN} />
            <For each={pixelRects()}>
              {(px) => <rect x={px.x} y={px.y} width={CELL - 1} height={CELL - 1} fill={px.fill} rx="10" data-pos={px.pos} />}
            </For>
          </svg>
          <Show when={hoveredCountry()}>
            {(code) => {
              const data = () => countryDataLookup().get(code())
              return (
                <div
                  class={styles.tooltip}
                  style={{
                    left: `${tooltipPos().x + 14}px`,
                    top: `${tooltipPos().y + 14}px`,
                  }}
                >
                  <div class={styles.tooltipHeader}>
                    {COUNTRY_FLAGS[code()] ?? "🏳️"} {COUNTRY_NAMES[code()] ?? code()}
                  </div>
                  <Show when={data()} fallback={<div class={styles.tooltipLine}>Not yet visited</div>}>
                    {(d) => (
                      <>
                        <div class={styles.tooltipLine}>{d().totalVisits} total visit{d().totalVisits !== 1 ? "s" : ""}</div>
                        <div class={styles.tooltipLine}>{d().events.length} event{d().events.length !== 1 ? "s" : ""}</div>
                      </>
                    )}
                  </Show>
                </div>
              )
            }}
          </Show>
        </div>
      </FieldBlock>

      <Masonry minColumnWidth={300} gap={[24, 36]}>
        <For each={mapData()}>
          {(cv) => (
            <div data-id={cv.country}>
              <DirtBlock title={`${COUNTRY_FLAGS[cv.country] ?? "🏳️"} ${COUNTRY_NAMES[cv.country] ?? cv.country}`}>
                <div class={styles.countryCard}>
                  <div class={styles.countryEvents}>
                    <For each={cv.events}>
                      {(ev) => (
                        <div class={styles.eventRow}>
                          <strong>{ev.name}</strong>
                          <span class={styles.eventCount}>{ev.count} visit{ev.count !== 1 ? "s" : ""}</span>
                          <div class={styles.eventRunners}>
                            <For each={[...ev.runners]}>
                              {(parkrunId) => {
                                const name = parkrunIdToName.get(parkrunId)
                                const route = getMemberRoute(parkrunId)
                                return (
                                  <Show when={name && route} fallback={<span>{name ?? parkrunId}</span>}>
                                    <A href={route!} class={styles.link}>{name}</A>
                                  </Show>
                                )
                              }}
                            </For>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </DirtBlock>
            </div>
          )}
        </For>
      </Masonry>

      <BackSignButton />
    </div>
  )
}

const styles = {
  container: css({
    width: "calc(100% - 2rem)",
    maxWidth: "1200px",
    margin: "1rem auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  }),
  stats: css({
    display: "flex",
    gap: "2rem",
    justifyContent: "center",
    marginBottom: "1rem",
  }),
  stat: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  }),
  statValue: css({
    fontSize: "2rem",
    fontWeight: "bold",
    lineHeight: 1,
  }),
  statLabel: css({
    fontSize: "0.8rem",
    opacity: 0.7,
  }),
  mapContainer: css({
    width: "100%",
    maxHeight: "350px",
    borderRadius: "4px",
    cornerShape: 'notch',
    overflow: "hidden",
  }),
  map: css({
    width: "100%",
    height: "auto",
    maxHeight: "350px",
    display: "block",
    imageRendering: "pixelated",
  }),
  // countryGrid style removed — now using Masonry component
  countryCard: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  }),
  countryEvents: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  }),
  eventRow: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  }),
  eventCount: css({
    fontSize: "0.8rem",
    opacity: 0.7,
  }),
  eventRunners: css({
    display: "flex",
    gap: "0.4rem",
    flexWrap: "wrap",
    fontSize: "0.85rem",
    justifyContent: "center",
  }),
  link: css({
    color: "inherit",
    textDecoration: "underline",
    fontWeight: "bold",
  }),
  tooltip: css({
    position: "fixed",
    pointerEvents: "none",
    zIndex: 1000,
    background: "rgba(0, 0, 0, 0.85)",
    color: "#fff",
    borderRadius: "6px",
    padding: "0.5rem 0.75rem",
    fontSize: "0.85rem",
    lineHeight: 1.4,
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    cornerShape: 'notch',
    textAlign: "center",
  }),
  tooltipHeader: css({
    fontWeight: "bold",
    fontSize: "0.95rem",
    marginBottom: "0.2rem",
  }),
  tooltipLine: css({
    opacity: 0.85,
  }),
}
