import { createMemo, createSignal, For, Show } from "solid-js"
import { css } from "@style/css"
import { A } from "@solidjs/router"
import { type RunResultItem, type Runner, type VolunteerItem } from "../utils/api"
import { runners as runnerSignals, type RunnerName } from "@/data/runners"
import { parseTimeToSeconds } from "@/utils/misc"
import { getMemberRoute } from "@/utils/memberRoute"
import { DirtBlock } from "../components/ui/DirtBlock"
import { FieldBlock } from "../components/ui/FieldBlock"
import { Table } from "../components/ui/Table"
import { BackSignButton } from "@/components/BackSignButton"

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

interface ConnectionEdge {
  idA: string
  idB: string
  nameA: string
  nameB: string
  sharedEvents: number
  closeFinishes: number
  volunteeredTogether: number
  uniqueEvents: number
  strength: number
}

interface NodeInfo {
  id: string
  name: string
  key: string
  totalConnections: number
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// Data computation
// ---------------------------------------------------------------------------

const parkrunIdToMeta = new Map<string, { name: string; key: string }>()
const faceByKey = new Map<string, string>()
for (const [key, [runner]] of Object.entries(runnerSignals)) {
  const data = runner()
  if (data.id) parkrunIdToMeta.set(data.id, { name: data.name, key })
  if (data.frames.face[0]) faceByKey.set(key, data.frames.face[0])
}

function computeConnections(results: RunResultItem[], volunteers: VolunteerItem[]): ConnectionEdge[] {
  const memberIds = Array.from(parkrunIdToMeta.keys())

  // Build event presence maps: "date:event:eventNumber" -> set of parkrunIds
  const eventAttendance = new Map<string, Set<string>>()
  for (const r of results) {
    if (!memberIds.includes(r.parkrunId)) continue
    const key = `${r.date}:${r.event}:${r.eventNumber}`
    if (!eventAttendance.has(key)) eventAttendance.set(key, new Set())
    eventAttendance.get(key)!.add(r.parkrunId)
  }

  // Build volunteer presence: "date:event" -> set of parkrunIds
  const volAttendance = new Map<string, Set<string>>()
  for (const v of volunteers) {
    if (!memberIds.includes(v.parkrunId)) continue
    const key = `${v.date}:${v.event}`
    if (!volAttendance.has(key)) volAttendance.set(key, new Set())
    volAttendance.get(key)!.add(v.parkrunId)
  }

  // Also add volunteers to event attendance
  for (const v of volunteers) {
    if (!memberIds.includes(v.parkrunId)) continue
    const key = `${v.date}:${v.event}:${v.eventNumber}`
    if (!eventAttendance.has(key)) eventAttendance.set(key, new Set())
    eventAttendance.get(key)!.add(v.parkrunId)
  }

  // Compute close finishes per event
  const eventResults = new Map<string, RunResultItem[]>()
  for (const r of results) {
    if (!memberIds.includes(r.parkrunId)) continue
    const key = `${r.date}:${r.event}:${r.eventNumber}`
    if (!eventResults.has(key)) eventResults.set(key, [])
    eventResults.get(key)!.push(r)
  }

  // Pairwise stats
  const pairKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`
  const sharedMap = new Map<string, number>()
  const closeMap = new Map<string, number>()
  const volTogetherMap = new Map<string, number>()
  const uniqueEventsMap = new Map<string, Set<string>>()

  for (const [eventKey, members] of eventAttendance.entries()) {
    const eventName = eventKey.split(":")[1] // extract event name from "date:event:eventNumber"
    const arr = Array.from(members)
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const pk = pairKey(arr[i], arr[j])
        sharedMap.set(pk, (sharedMap.get(pk) ?? 0) + 1)
        if (!uniqueEventsMap.has(pk)) uniqueEventsMap.set(pk, new Set())
        uniqueEventsMap.get(pk)!.add(eventName)
      }
    }
  }

  for (const evResults of eventResults.values()) {
    if (evResults.length < 2) continue
    for (let i = 0; i < evResults.length; i++) {
      for (let j = i + 1; j < evResults.length; j++) {
        const diff = Math.abs(
          parseTimeToSeconds(evResults[i].time) - parseTimeToSeconds(evResults[j].time)
        )
        if (diff <= 10) {
          const pk = pairKey(evResults[i].parkrunId, evResults[j].parkrunId)
          closeMap.set(pk, (closeMap.get(pk) ?? 0) + 1)
        }
      }
    }
  }

  for (const members of volAttendance.values()) {
    const arr = Array.from(members)
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const pk = pairKey(arr[i], arr[j])
        volTogetherMap.set(pk, (volTogetherMap.get(pk) ?? 0) + 1)
      }
    }
  }

  // Build edges
  const edges: ConnectionEdge[] = []
  const allPairs = new Set([...sharedMap.keys(), ...closeMap.keys(), ...volTogetherMap.keys()])

  for (const pk of allPairs) {
    const [idA, idB] = pk.split("|")
    const metaA = parkrunIdToMeta.get(idA)
    const metaB = parkrunIdToMeta.get(idB)
    if (!metaA || !metaB) continue

    const shared = sharedMap.get(pk) ?? 0
    const close = closeMap.get(pk) ?? 0
    const vol = volTogetherMap.get(pk) ?? 0
    const unique = uniqueEventsMap.get(pk)?.size ?? 1
    const strength = (shared + close + vol) * unique

    edges.push({
      idA,
      idB,
      nameA: metaA.name,
      nameB: metaB.name,
      sharedEvents: shared,
      closeFinishes: close,
      volunteeredTogether: vol,
      uniqueEvents: unique,
      strength,
    })
  }

  return edges.sort((a, b) => b.strength - a.strength)
}

// ---------------------------------------------------------------------------
// Layout: arrange nodes in a circle
// ---------------------------------------------------------------------------

function layoutNodes(edges: ConnectionEdge[]): NodeInfo[] {
  const nodeIds = new Set<string>()
  for (const e of edges) {
    nodeIds.add(e.idA)
    nodeIds.add(e.idB)
  }

  // Also include members with no edges
  for (const [id] of parkrunIdToMeta) {
    if (id) nodeIds.add(id)
  }

  const ids = Array.from(nodeIds).filter(id => parkrunIdToMeta.has(id))

  // Connections count per node
  const connectionCount = new Map<string, number>()
  for (const e of edges) {
    connectionCount.set(e.idA, (connectionCount.get(e.idA) ?? 0) + e.strength)
    connectionCount.set(e.idB, (connectionCount.get(e.idB) ?? 0) + e.strength)
  }

  const cx = 250
  const cy = 250
  const radius = 200

  return ids.map((id, i) => {
    const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    const meta = parkrunIdToMeta.get(id)!
    return {
      id,
      name: meta.name,
      key: meta.key,
      totalConnections: connectionCount.get(id) ?? 0,
      x,
      y,
    }
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ConnectionsPageProps {
  results: RunResultItem[]
  runners: Runner[]
  volunteers: VolunteerItem[]
}

export function ConnectionsPage(props: ConnectionsPageProps) {
  const edges = createMemo(() => computeConnections(props.results, props.volunteers))
  const nodes = createMemo(() => layoutNodes(edges()))
  const maxLogStrength = createMemo(() => Math.max(1, Math.log(Math.max(1, ...edges().map((e) => e.strength)))))

  const nodeById = createMemo(() => {
    const map = new Map<string, NodeInfo>()
    for (const n of nodes()) map.set(n.id, n)
    return map
  })

  const [hoveredNode, setHoveredNode] = createSignal<string | null>(null)
  const [pinnedNode, setPinnedNode] = createSignal<string | null>(null)
  const [selectedEdge, setSelectedEdge] = createSignal<ConnectionEdge | null>(null)

  /** Active node is pinned (if set) or hovered */
  const activeNode = () => pinnedNode() ?? hoveredNode()

  /** Normalise strength on a log scale so outliers don't dominate */
  function logNorm(e: ConnectionEdge) {
    return Math.log(Math.max(1, e.strength)) / maxLogStrength()
  }

  function edgeOpacity(e: ConnectionEdge) {
    const active = activeNode()
    if (!active) return Math.max(0.15, logNorm(e) * 0.8)
    if (e.idA === active || e.idB === active) return Math.max(0.3, logNorm(e))
    return 0.05
  }

  function edgeWidth(e: ConnectionEdge) {
    return Math.max(1, logNorm(e) * 8)
  }

  function nodeOpacity(n: NodeInfo) {
    const active = activeNode()
    if (!active) return 1
    if (n.id === active) return 1
    // Check if connected to active
    const connected = edges().some(
      (e) => (e.idA === active && e.idB === n.id) || (e.idB === active && e.idA === n.id)
    )
    return connected ? 1 : 0.3
  }

  // Stats for active node
  const activeStats = createMemo(() => {
    const aId = activeNode()
    if (!aId) return null
    const nodeMeta = parkrunIdToMeta.get(aId)
    if (!nodeMeta) return null

    const connectedEdges = edges().filter((e) => e.idA === aId || e.idB === aId).sort((a, b) => b.strength - a.strength)
    return {
      name: nodeMeta.name,
      edges: connectedEdges.slice(0, 5),
    }
  })

  return (
    <div class={pageStyles.page}>

      <FieldBlock title="Connection Web">
        <p class={pageStyles.intro}>
          How connected is Scoop Bus Run Club? Every shared parkrun, close finish, and volunteer session weaves the web tighter.
        </p>
        <div class={pageStyles.formulaBlock}>
          <div class={pageStyles.formulaLabel}><em>"Real science"</em></div>
          <div class={pageStyles.formulaText}>Connection Strength = (Runs + Volunteers + Close Finishes) × Unique Events</div>
        </div>

        <div class={pageStyles.svgContainer}>
          <svg viewBox="-30 -30 580 560" class={pageStyles.svg}>
            {/* Edges */}
            <For each={edges()}>
              {(e) => {
                const a = () => nodeById().get(e.idA)
                const b = () => nodeById().get(e.idB)
                return (
                  <Show when={a() && b()}>
                    <line
                      x1={a()!.x}
                      y1={a()!.y}
                      x2={b()!.x}
                      y2={b()!.y}
                      stroke="#000000"
                      stroke-width={edgeWidth(e)}
                      stroke-opacity={edgeOpacity(e)}
                      stroke-linecap="round"
                      class={pageStyles.edge}
                      onClick={() => setSelectedEdge(e)}
                    />
                  </Show>
                )
              }}
            </For>

            {/* Nodes */}
            <For each={nodes()}>
              {(node) => {
                const faceUrl = faceByKey.get(node.key)
                const CX = 250
                const CY = 250
                const dx = node.x - CX
                const dy = node.y - CY
                const dist = Math.sqrt(dx * dx + dy * dy) || 1
                const nx = dx / dist
                const ny = dy / dist
                const labelOffset = 30
                const lx = node.x + nx * labelOffset
                const ly = node.y + ny * labelOffset
                // text-anchor based on which side of centre
                const anchor = nx < -0.3 ? "end" : nx > 0.3 ? "start" : "middle"
                // vertical nudge: when label is above node, shift up; below, shift down
                const dyShift = ny < -0.3 ? "-0.3em" : ny > 0.3 ? "1em" : "0.35em"
                return (
                  <g
                    opacity={nodeOpacity(node)}
                    class={pageStyles.node}
                    onMouseEnter={() => { if (!pinnedNode()) setHoveredNode(node.id) }}
                    onMouseLeave={() => { if (!pinnedNode()) setHoveredNode(null) }}
                    onClick={() => {
                      setPinnedNode((prev) => prev === node.id ? null : node.id)
                      setHoveredNode(null)
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Face sprite */}
                    <Show
                      when={faceUrl}
                      fallback={
                        <circle cx={node.x} cy={node.y} r="16" fill="#2d5a27" stroke="#6abf4b" stroke-width="2" />
                      }
                    >
                      <image
                        href={faceUrl}
                        x={node.x - 16}
                        y={node.y - 16}
                        width={32}
                        height={32}
                        style={{ "image-rendering": "pixelated" }}
                      />
                    </Show>
                    {/* Name label outside the circle */}
                    <text
                      x={lx}
                      y={ly}
                      dy={dyShift}
                      text-anchor={anchor}
                      fill="white"
                      font-size="20"
                      font-weight="bold"
                      stroke="rgba(0,0,0,0.6)"
                      stroke-width="2.5"
                      paint-order="stroke"
                      style={{ "pointer-events": "none", "font-family": "'Cabin', sans-serif" }}
                    >
                      {node.name}
                    </text>
                  </g>
                )
              }}
            </For>
          </svg>
        </div>

        {/* Active node info */}
        <Show when={activeStats()}>
          <div class={pageStyles.hoverCard}>
            <strong>{activeStats()!.name}'s strongest connections:</strong>
            <For each={activeStats()!.edges}>
              {(e) => {
                const otherName = e.idA === activeNode() ? e.nameB : e.nameA
                return (
                  <div class={pageStyles.hoverRow}>
                    <span class={pageStyles.hoverName}>{otherName}</span>
                    <span class={pageStyles.hoverFormula}>
                      ({e.sharedEvents} + {e.volunteeredTogether} + {e.closeFinishes}) × {e.uniqueEvents} = {e.strength}
                    </span>
                  </div>
                )
              }}
            </For>
          </div>
        </Show>
      </FieldBlock>

      {/* Selected edge detail */}
      <Show when={selectedEdge()}>
        <DirtBlock title="Connection Detail">
          <div class={pageStyles.edgeDetail}>
            <div class={pageStyles.edgeNames}>
              <A href={getMemberRoute(selectedEdge()!.idA) ?? "#"} class={pageStyles.nameLink}>
                {selectedEdge()!.nameA}
              </A>
              <span> & </span>
              <A href={getMemberRoute(selectedEdge()!.idB) ?? "#"} class={pageStyles.nameLink}>
                {selectedEdge()!.nameB}
              </A>
            </div>
            <div class={pageStyles.edgeStats}>
              <div>📍 {selectedEdge()!.sharedEvents} shared events</div>
              <div>🦺 {selectedEdge()!.volunteeredTogether} volunteered together</div>
              <div>🤝 {selectedEdge()!.closeFinishes} close finishes (≤10s)</div>
              <div>🗺️ {selectedEdge()!.uniqueEvents} unique events</div>
              <div class={pageStyles.formulaText}>
                Connection Score: ({selectedEdge()!.sharedEvents} + {selectedEdge()!.volunteeredTogether} + {selectedEdge()!.closeFinishes}) × {selectedEdge()!.uniqueEvents} = {selectedEdge()!.strength}
              </div>
            </div>
            <A
              href={`/compare/${parkrunIdToMeta.get(selectedEdge()!.idA)?.key.toLowerCase() ?? ""}/${parkrunIdToMeta.get(selectedEdge()!.idB)?.key.toLowerCase() ?? ""}`}
              class={pageStyles.compareLink}
            >
              View full comparison →
            </A>
          </div>
        </DirtBlock>
      </Show>

      {/* Top connections table */}
      <DirtBlock title="Strongest Connections">
        <Table
          columns={[
            { title: "Connection" },
            { title: "(Runs + Volunteers + Finishes) × Unique", width: '300px' },
            { title: "Score", width: '100px' },
          ]}
          data={edges().map((e) => [
            <span
              class={pageStyles.pairCell}
              onClick={() => setSelectedEdge(e)}
            >
              {e.nameA} & {e.nameB}
            </span>,
            <>({e.sharedEvents} + {e.volunteeredTogether} + {e.closeFinishes}) × {e.uniqueEvents}</>,
            <>{(e.sharedEvents + e.volunteeredTogether + e.closeFinishes) * e.uniqueEvents}</>,
          ])}
        />
      </DirtBlock>


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
  intro: css({
    textAlign: "center",
    fontSize: "1rem",
    opacity: 0.85,
    marginBottom: "1rem",
  }),
  svgContainer: css({
    width: "100%",
    maxWidth: "500px",
    margin: "0 auto",
    aspectRatio: "1",
  }),
  svg: css({
    width: "100%",
    height: "100%",
  }),
  edge: css({
    cursor: "pointer",
    transition: "stroke-opacity 0.2s ease",
  }),
  node: css({
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  }),
  hoverCard: css({
    background: "rgba(0,0,0,0.15)",
    borderRadius: "6px",
    padding: "0.75rem",
    marginTop: "0.5rem",
    fontSize: "0.85rem",
  }),
  hoverRow: css({
    marginTop: "0.2rem",
    opacity: 0.9,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.5rem",
  }),
  hoverName: css({
    fontWeight: "bold",
    flexShrink: 0,
  }),
  hoverFormula: css({
    fontFamily: "monospace",
    fontSize: "0.8rem",
    opacity: 0.8,
    whiteSpace: "nowrap",
  }),
  formulaBlock: css({
    textAlign: "center",
    margin: "0.75rem 0 0.25rem",
    padding: "0.5rem",
    background: "rgba(0,0,0,0.1)",
    borderRadius: "6px",
  }),
  formulaLabel: css({
    fontSize: "1.4rem",
    opacity: 0.7,
    marginBottom: "0.25rem",
  }),
  formulaText: css({
    fontFamily: "monospace",
    fontSize: "0.85rem",
    fontWeight: "bold",
  }),
  edgeDetail: css({
    textAlign: "center",
  }),
  edgeNames: css({
    fontSize: "1.3rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
  }),
  nameLink: css({
    color: "inherit",
    textDecoration: "underline",
  }),
  edgeStats: css({
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    flexWrap: "wrap",
    fontSize: "0.95rem",
    marginBottom: "0.5rem",
  }),
  compareLink: css({
    color: "inherit",
    textDecoration: "underline",
    fontWeight: "bold",
    fontSize: "0.9rem",
  }),
  pairCell: css({
    fontWeight: "bold",
    cursor: "pointer",
    "&:hover": {
      textDecoration: "underline",
    },
  }),
}
