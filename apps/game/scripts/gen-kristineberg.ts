#!/usr/bin/env node
/**
 * Generate kristineberg level from GPX — first 400m sampled every 5m,
 * with altitude and buildings fetched from Overpass.
 *
 * Usage:  pnpm tsx scripts/gen-kristineberg.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GPX_PATH = resolve(ROOT, 'gpx/kristineberg.gpx');
const LEVEL_DIR = resolve(ROOT, 'src/levels/kristineberg');

const TARGET_DIST = 400; // metres — one lap
const SAMPLE_INTERVAL = 5; // metres between points

// ── GPX parser ───────────────────────────────────────────────────────

interface GpxPoint { lat: number; lon: number; ele: number; }

function parseGpx(path: string): GpxPoint[] {
  const xml = readFileSync(path, 'utf-8');
  const points: GpxPoint[] = [];
  const re = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    const eleMatch = m[3].match(/<ele>([^<]+)<\/ele>/);
    const ele = eleMatch ? parseFloat(eleMatch[1]) : 0;
    points.push({ lat, lon, ele });
  }
  return points;
}

// ── Haversine ────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Interpolate between two points at fraction t ─────────────────────

function lerp(a: GpxPoint, b: GpxPoint, t: number): GpxPoint {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
    ele: a.ele + (b.ele - a.ele) * t,
  };
}

// ── Sample exactly 400m at 5m intervals ──────────────────────────────

function sampleTrack(allPoints: GpxPoint[]): GpxPoint[] {
  // Build cumulative distance array
  const cumDist: number[] = [0];
  for (let i = 1; i < allPoints.length; i++) {
    cumDist.push(cumDist[i - 1] + haversine(
      allPoints[i - 1].lat, allPoints[i - 1].lon,
      allPoints[i].lat, allPoints[i].lon,
    ));
  }

  const totalAvail = cumDist[cumDist.length - 1];
  console.log(`  Total GPX distance: ${(totalAvail / 1000).toFixed(2)} km`);

  if (totalAvail < TARGET_DIST) {
    throw new Error(`GPX only has ${totalAvail.toFixed(0)}m, need ${TARGET_DIST}m`);
  }

  // Sample at exact intervals using interpolation
  const sampled: GpxPoint[] = [];
  let segIdx = 0;

  for (let d = 0; d <= TARGET_DIST; d += SAMPLE_INTERVAL) {
    // Advance segment index
    while (segIdx < cumDist.length - 2 && cumDist[segIdx + 1] < d) segIdx++;

    const segStart = cumDist[segIdx];
    const segEnd = cumDist[segIdx + 1];
    const segLen = segEnd - segStart;
    const t = segLen > 0 ? (d - segStart) / segLen : 0;

    sampled.push(lerp(allPoints[segIdx], allPoints[segIdx + 1], Math.min(1, Math.max(0, t))));
  }

  return sampled;
}

// ── Overpass building fetch ──────────────────────────────────────────

interface BuildingPolygon {
  type: 'grey' | 'red';
  height?: number;
  points: [number, number][];
}

async function fetchBuildings(coords: number[][], paddingM = 600): Promise<BuildingPolygon[]> {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const c of coords) {
    if (c[1] < minLat) minLat = c[1];
    if (c[1] > maxLat) maxLat = c[1];
    if (c[0] < minLon) minLon = c[0];
    if (c[0] > maxLon) maxLon = c[0];
  }
  const latPad = paddingM / 111_000;
  const lonPad = paddingM / (111_000 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
  minLat -= latPad; maxLat += latPad; minLon -= lonPad; maxLon += lonPad;

  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
  const query = `[out:json][timeout:25];(way["building"](${bbox}););out body;>;out skel qt;`;

  console.log(`  Fetching buildings (bbox: ${bbox}) …`);
  const results: BuildingPolygon[] = [];
  const RESIDENTIAL = new Set([
    'residential', 'house', 'apartments', 'detached',
    'semidetached_house', 'terrace', 'dormitory',
  ]);

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'scoopbus-game/1.0' },
    });
    if (!res.ok) { console.warn(`  ⚠ Overpass ${res.status}`); return []; }
    const json = await res.json();
    const nodes = new Map<number, [number, number]>();
    for (const el of json.elements) {
      if (el.type === 'node') nodes.set(el.id, [el.lon, el.lat]);
    }
    for (const el of json.elements) {
      if (el.type !== 'way' || !el.nodes || el.nodes.length < 3) continue;
      const ring: [number, number][] = [];
      for (const nid of el.nodes) { const pt = nodes.get(nid); if (pt) ring.push([pt[1], pt[0]]); }
      if (ring.length < 3) continue;
      const tag = el.tags?.building ?? 'yes';
      const type: 'grey' | 'red' = RESIDENTIAL.has(tag) ? 'red' : 'grey';
      const bldg: BuildingPolygon = { type, points: ring };
      if (el.tags?.height) { const h = parseFloat(el.tags.height); if (!isNaN(h) && h > 0) bldg.height = Math.round(h); }
      else if (el.tags?.['building:levels']) { const l = parseFloat(el.tags['building:levels']); if (!isNaN(l) && l > 0) bldg.height = Math.round(l * 3); }
      results.push(bldg);
    }
    console.log(`  Got ${results.length} buildings`);
  } catch (err) { console.warn('  ⚠ Overpass fetch failed:', err); }
  return results;
}

// Filter buildings by distance to course
function filterBuildings(buildings: BuildingPolygon[], coords: number[][], maxDist: number): BuildingPolygon[] {
  return buildings.filter((b) => {
    for (const [lat, lon] of b.points) {
      for (const c of coords) {
        if (haversine(lat, lon, c[1], c[0]) <= maxDist) return true;
      }
    }
    return false;
  });
}

// ── Write helpers ────────────────────────────────────────────────────

function writeJson(filePath: string, data: unknown) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🏟️  Generating kristineberg level (400m track)\n');

  const allPoints = parseGpx(GPX_PATH);
  console.log(`  GPX track points: ${allPoints.length}`);

  const sampled = sampleTrack(allPoints);
  console.log(`  Sampled: ${sampled.length} points (every ${SAMPLE_INTERVAL}m for ${TARGET_DIST}m)`);

  const coordinates = sampled.map((p) => [
    Math.round(p.lon * 1e7) / 1e7,
    Math.round(p.lat * 1e7) / 1e7,
    Math.round(p.ele * 10) / 10,
  ]);
  const altitude = sampled.map((p) => Math.round(p.ele * 10) / 10);

  const course = {
    eventId: 'kristineberg',
    coordinates,
    points: [
      { name: 'Start', coordinates: coordinates[0] },
      { name: 'Finish', coordinates: coordinates[coordinates.length - 1] },
    ],
  };

  mkdirSync(LEVEL_DIR, { recursive: true });

  writeJson(resolve(LEVEL_DIR, 'course.json'), course);
  console.log(`✅ course.json (${coordinates.length} points)`);

  writeJson(resolve(LEVEL_DIR, 'altitude.json'), altitude);
  console.log(`✅ altitude.json`);

  writeJson(resolve(LEVEL_DIR, 'water.json'), []);
  console.log(`✅ water.json (empty)`);

  // Fetch buildings
  const rawBuildings = await fetchBuildings(course.coordinates);
  const buildings = filterBuildings(rawBuildings, course.coordinates, 300);
  writeJson(resolve(LEVEL_DIR, 'buildings.json'), buildings);
  console.log(`✅ buildings.json (${buildings.length} buildings)`);

  writeJson(resolve(LEVEL_DIR, 'paths.json'), []);
  console.log(`✅ paths.json (empty)`);

  // Write index.ts
  const indexTs = `import type { LevelData } from '../types';
import course from './course.json';
import altitude from './altitude.json';
import water from './water.json';
import buildings from './buildings.json';
import paths from './paths.json';

const level: LevelData = {
  id: 'kristineberg',
  name: 'Kristineberg',
  course: course as LevelData['course'],
  altitude,
  water: water as LevelData['water'],
  buildings: buildings as LevelData['buildings'],
  paths: paths as LevelData['paths'],
  /** Fence sits 150m from the bounding circle (arena track) */
  fenceDistance: 150,
};

export default level;
`;
  writeFileSync(resolve(LEVEL_DIR, 'index.ts'), indexTs, 'utf-8');
  console.log(`✅ index.ts`);

  console.log('\nDone! Level written to src/levels/kristineberg/\n');
}

main().catch((err) => { console.error('❌', err); process.exit(1); });
