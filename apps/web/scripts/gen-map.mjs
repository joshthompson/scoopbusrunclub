/**
 * Generate pixel world-map data for MapPage.tsx
 * Uses Natural Earth country boundaries from world-atlas TopoJSON.
 * Rasterizes to a 180×90 grid (2° per cell, equirectangular).
 *
 * Usage: node apps/web/scripts/gen-map.mjs
 */

import https from "https"

// ── Config ──────────────────────────────────────────────────────────────────────

const COLS = 180
const ROWS = 90

// ISO 3166-1 numeric → our 2-letter parkrun country codes
const PARKRUN_COUNTRIES = {
  "752": "SE", "578": "NO", "246": "FI", "208": "DK", "826": "UK",
  "372": "IE", "276": "DE", "528": "NL", "616": "PL", "440": "LT",
  "040": "AT", "380": "IT", "840": "US", "124": "CA", "036": "AU",
  "554": "NZ", "392": "JP", "710": "ZA", "516": "NA", "702": "SG",
  "458": "MY",
}

// ── HTTP fetch ──────────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "node-gen-map/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location).then(resolve, reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => resolve(data))
    }).on("error", reject)
  })
}

// ── TopoJSON decoding ───────────────────────────────────────────────────────────

function decodeArcs(topology) {
  const tf = topology.transform
  const sx = tf ? tf.scale[0] : 1
  const sy = tf ? tf.scale[1] : 1
  const tx = tf ? tf.translate[0] : 0
  const ty = tf ? tf.translate[1] : 0

  return topology.arcs.map((arc) => {
    let x = 0, y = 0
    return arc.map(([dx, dy]) => {
      x += dx
      y += dy
      return [x * sx + tx, y * sy + ty]
    })
  })
}

function resolveRing(arcRefs, arcs) {
  const coords = []
  for (const ref of arcRefs) {
    const arc = ref >= 0 ? arcs[ref] : [...arcs[~ref]].reverse()
    const start = coords.length > 0 ? 1 : 0
    for (let i = start; i < arc.length; i++) {
      coords.push(arc[i])
    }
  }
  return coords
}

function resolveGeometry(geom, arcs) {
  if (geom.type === "Polygon") {
    return [geom.arcs.map((ring) => resolveRing(ring, arcs))]
  }
  if (geom.type === "MultiPolygon") {
    return geom.arcs.map((polygon) => polygon.map((ring) => resolveRing(ring, arcs)))
  }
  return []
}

// ── Point-in-polygon (ray casting) ──────────────────────────────────────────────

function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInMultiPolygon(lon, lat, polygons) {
  for (const polygon of polygons) {
    const [outer, ...holes] = polygon
    if (pointInRing(lon, lat, outer)) {
      let inHole = false
      for (const hole of holes) {
        if (pointInRing(lon, lat, hole)) {
          inHole = true
          break
        }
      }
      if (!inHole) return true
    }
  }
  return false
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  const url = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
  console.error("Fetching TopoJSON from", url)
  const str = await httpGet(url)
  const topology = JSON.parse(str)
  console.error("Decoding arcs…")
  const decodedArcs = decodeArcs(topology)

  const countries = topology.objects.countries.geometries
  const countryPolys = countries.map((geom) => ({
    id: String(geom.id).padStart(3, "0"),
    parkrunCode: PARKRUN_COUNTRIES[String(geom.id).padStart(3, "0")] ?? null,
    polygons: resolveGeometry(geom, decodedArcs),
  }))

  console.error(`Rasterising ${countryPolys.length} countries to ${COLS}×${ROWS} grid…`)

  const grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS))
  const countryGrid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))

  for (let r = 0; r < ROWS; r++) {
    const lat = 89 - r * 2 // centre latitude
    // Use 3×3 sub-sampling for arctic rows (r < 15, i.e. > 61°N) to avoid
    // solid coastline bars where many 2° cells partially overlap land.
    const samples = r < 15 ? 9 : 1
    for (let c = 0; c < COLS; c++) {
      const lon = -179 + c * 2 // centre longitude
      if (samples === 1) {
        // Single centre-point sample
        for (const country of countryPolys) {
          if (pointInMultiPolygon(lon, lat, country.polygons)) {
            grid[r][c] = 1
            if (country.parkrunCode) countryGrid[r][c] = country.parkrunCode
            break
          }
        }
      } else {
        // 3×3 sub-samples within the cell
        let hits = 0
        let bestCountry = null
        const offsets = [-0.6, 0, 0.6]
        for (const dlon of offsets) {
          for (const dlat of offsets) {
            const slon = lon + dlon
            const slat = lat + dlat
            for (const country of countryPolys) {
              if (pointInMultiPolygon(slon, slat, country.polygons)) {
                hits++
                if (!bestCountry && country.parkrunCode) bestCountry = country.parkrunCode
                break
              }
            }
          }
        }
        // Only mark as land if majority of sub-samples hit land
        if (hits >= 5) {
          grid[r][c] = 1
          if (bestCountry) countryGrid[r][c] = bestCountry
        }
      }
    }
    if (r % 10 === 0) console.error(`  row ${r}/${ROWS}`)
  }

  // ── Manual touch-ups for tiny countries / islands missing at 110m ─────────
  // Singapore
  const sgC = Math.floor((103.8 + 180) / 2), sgR = Math.floor((90 - 1.3) / 2)
  grid[sgR][sgC] = 1
  countryGrid[sgR][sgC] = "SG"

  // Sri Lanka (make sure it shows)
  for (const [lon, lat] of [[80, 7], [81, 7], [80, 9]]) {
    const cc = Math.floor((lon + 180) / 2), rr = Math.floor((90 - lat) / 2)
    grid[rr][cc] = 1
  }

  // Taiwan
  for (const [lon, lat] of [[121, 24], [121, 23]]) {
    const cc = Math.floor((lon + 180) / 2), rr = Math.floor((90 - lat) / 2)
    grid[rr][cc] = 1
  }

  // ── Output WORLD_PIXELS ───────────────────────────────────────────────────
  console.log("const WORLD_PIXELS: string[] = [")
  for (let r = 0; r < ROWS; r++) {
    const row = Array.from(grid[r]).join("")
    const latLabel = 89 - r * 2
    const ns = latLabel >= 0 ? "N" : "S"
    console.log(`  "${row}", // r${r}  ${Math.abs(latLabel)}°${ns}`)
  }
  console.log("]")
  console.log("")

  // ── Output COUNTRY_PIXELS ─────────────────────────────────────────────────
  const parkrunPixels = {}
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const code = countryGrid[r][c]
      if (code) {
        if (!parkrunPixels[code]) parkrunPixels[code] = []
        parkrunPixels[code].push([c, r])
      }
    }
  }

  console.log("const COUNTRY_PIXELS: Record<string, [number, number][]> = {")
  const sortedCodes = Object.keys(parkrunPixels).sort()
  for (const code of sortedCodes) {
    const pixStr = parkrunPixels[code].map(([c, r]) => `[${c},${r}]`).join(",")
    console.log(`  ${code}: [${pixStr}],`)
  }
  console.log("}")
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
