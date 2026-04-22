#!/usr/bin/env node
/**
 * Generate course.json + altitude.json from a GPX file, sampling one point
 * every N metres.  Then optionally fetch paths and buildings from Overpass.
 *
 * Usage:
 *   pnpm tsx scripts/gpx-to-level.ts <gpxFile> [--interval=50] [--fetch-features]
 *
 * Examples:
 *   pnpm tsx scripts/gpx-to-level.ts gpx/cheltenham.gpx
 *   pnpm tsx scripts/gpx-to-level.ts gpx/cheltenham.gpx --interval=50 --fetch-features
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LEVELS_DIR = resolve(ROOT, 'src/levels');

// ── Arg parsing ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const gpxFile = args.find((a) => !a.startsWith('--'));
if (!gpxFile) {
  console.error('Usage: pnpm tsx scripts/gpx-to-level.ts <gpxFile> [--interval=50] [--fetch-features]');
  process.exit(1);
}

const intervalArg = args.find((a) => a.startsWith('--interval='));
const SAMPLE_INTERVAL = intervalArg ? parseFloat(intervalArg.split('=')[1]) : 50;

const fetchFeatures = args.includes('--fetch-features');

// Derive event ID from filename (e.g. gpx/cheltenham.gpx → cheltenham)
const eventId = basename(gpxFile, '.gpx');
const displayName = eventId.charAt(0).toUpperCase() + eventId.slice(1);

// ── GPX parser ───────────────────────────────────────────────────────

interface GpxPoint {
  lat: number;
  lon: number;
  ele: number;
}

function parseGpx(gpxPath: string): GpxPoint[] {
  const xml = readFileSync(gpxPath, 'utf-8');
  const points: GpxPoint[] = [];
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let m: RegExpExecArray | null;
  while ((m = trkptRegex.exec(xml)) !== null) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    const eleMatch = m[3].match(/<ele>([^<]+)<\/ele>/);
    const ele = eleMatch ? parseFloat(eleMatch[1]) : 0;
    points.push({ lat, lon, ele });
  }
  return points;
}

// ── Haversine distance ───────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Sample every N metres ────────────────────────────────────────────

function sampleEveryNMetres(points: GpxPoint[], intervalM: number): GpxPoint[] {
  if (points.length === 0) return [];
  const sampled: GpxPoint[] = [points[0]];
  let accumDist = 0;

  for (let i = 1; i < points.length; i++) {
    const d = haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    accumDist += d;
    if (accumDist >= intervalM) {
      sampled.push(points[i]);
      accumDist = 0;
    }
  }

  // Always include the last point
  const last = points[points.length - 1];
  const lastSampled = sampled[sampled.length - 1];
  if (last.lat !== lastSampled.lat || last.lon !== lastSampled.lon) {
    sampled.push(last);
  }

  return sampled;
}

// ── Build course.json format ─────────────────────────────────────────

function buildCourseData(eventId: string, points: GpxPoint[]) {
  const coordinates = points.map((p) => [
    Math.round(p.lon * 1e6) / 1e6,
    Math.round(p.lat * 1e6) / 1e6,
    Math.round(p.ele * 10) / 10,
  ]);

  return {
    eventId,
    coordinates,
    points: [] as { name: string; coordinates: number[] }[],
  };
}

function buildAltitude(points: GpxPoint[]): number[] {
  return points.map((p) => Math.round(p.ele * 10) / 10);
}

// ── Overpass fetchers (inlined from fetch-level.ts) ──────────────────

type PathType = 'footway' | 'cycleway' | 'path' | 'track' | 'steps' | 'bridleway';

interface PathPolyline {
  type: PathType;
  points: [number, number][];
}

interface BuildingPolygon {
  type: 'grey' | 'red';
  height?: number;
  points: [number, number][];
}

function haversineMetres(lon1: number, lat1: number, lon2: number, lat2: number): number {
  return haversine(lat1, lon1, lat2, lon2);
}

function minDistanceToPath(
  polygonCoords: [number, number][],
  courseCoords: number[][],
): number {
  let best = Infinity;
  for (const [pLon, pLat] of polygonCoords) {
    for (const c of courseCoords) {
      const d = haversineMetres(pLon, pLat, c[0], c[1]);
      if (d < best) {
        best = d;
        if (best < 1) return best;
      }
    }
  }
  return best;
}

function pointToPathDist(pLon: number, pLat: number, courseCoords: number[][]): number {
  let best = Infinity;
  for (const c of courseCoords) {
    const d = haversineMetres(pLon, pLat, c[0], c[1]);
    if (d < best) best = d;
  }
  return best;
}

function simplifyByMinDist(points: [number, number][], minDist: number): [number, number][] {
  if (points.length <= 2) return points;
  const result: [number, number][] = [points[0]];
  let [lastLat, lastLon] = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const [lat, lon] = points[i];
    const d = haversineMetres(lastLon, lastLat, lon, lat);
    if (d >= minDist) {
      result.push(points[i]);
      lastLat = lat;
      lastLon = lon;
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

async function fetchPathFeatures(
  coords: number[][],
  paddingMetres = 400,
): Promise<PathPolyline[]> {
  if (coords.length === 0) return [];

  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const c of coords) {
    if (c[1] < minLat) minLat = c[1];
    if (c[1] > maxLat) maxLat = c[1];
    if (c[0] < minLon) minLon = c[0];
    if (c[0] > maxLon) maxLon = c[0];
  }

  const latPad = paddingMetres / 111_000;
  const lonPad = paddingMetres / (111_000 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
  minLat -= latPad;
  maxLat += latPad;
  minLon -= lonPad;
  maxLon += lonPad;

  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
  const PATH_TYPES: PathType[] = ['footway', 'cycleway', 'path', 'track', 'steps', 'bridleway'];

  const query = `
[out:json][timeout:25];
(
${PATH_TYPES.map((t) => `  way["highway"="${t}"](${bbox});`).join('\n')}
);
out body;
>;
out skel qt;
`;

  console.log(`Fetching paths (bbox: ${bbox}) …`);
  const results: PathPolyline[] = [];

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'scoopbus-game/1.0' },
    });

    if (res.ok) {
      const json = await res.json();
      const nodes = new Map<number, [number, number]>();
      for (const el of json.elements) {
        if (el.type === 'node') nodes.set(el.id, [el.lon, el.lat]);
      }
      for (const el of json.elements) {
        if (el.type === 'way' && el.nodes && el.nodes.length >= 2) {
          const pts: [number, number][] = [];
          for (const nid of el.nodes) {
            const pt = nodes.get(nid);
            if (pt) pts.push([pt[1], pt[0]]);
          }
          if (pts.length < 2) continue;
          const highway = el.tags?.highway as PathType;
          if (PATH_TYPES.includes(highway)) results.push({ type: highway, points: pts });
        }
      }
      console.log(`  Overpass returned ${json.elements.length} elements → ${results.length} paths`);
    } else {
      console.warn(`  ⚠ Overpass responded with ${res.status}`);
    }
  } catch (err) {
    console.warn('  ⚠ Overpass fetch failed:', err);
  }
  return results;
}

function filterAndSimplifyPaths(
  paths: PathPolyline[],
  courseCoords: number[][],
  maxDist: number,
  minSpacing: number,
): PathPolyline[] {
  const before = paths.length;
  const result: PathPolyline[] = [];
  for (const p of paths) {
    const nearby = p.points.filter(([lat, lon]) => pointToPathDist(lon, lat, courseCoords) <= maxDist);
    if (nearby.length < 2) continue;
    const simplified = simplifyByMinDist(nearby, minSpacing);
    if (simplified.length < 2) continue;
    result.push({ type: p.type, points: simplified });
  }
  const totalPtsBefore = paths.reduce((s, p) => s + p.points.length, 0);
  const totalPtsAfter = result.reduce((s, p) => s + p.points.length, 0);
  console.log(`  Filtered paths: ${before} → ${result.length} (within ${maxDist}m), points: ${totalPtsBefore} → ${totalPtsAfter} (${minSpacing}m spacing)`);
  return result;
}

async function fetchBuildingFeatures(
  coords: number[][],
  paddingMetres = 600,
): Promise<BuildingPolygon[]> {
  if (coords.length === 0) return [];

  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const c of coords) {
    if (c[1] < minLat) minLat = c[1];
    if (c[1] > maxLat) maxLat = c[1];
    if (c[0] < minLon) minLon = c[0];
    if (c[0] > maxLon) maxLon = c[0];
  }

  const latPad = paddingMetres / 111_000;
  const lonPad = paddingMetres / (111_000 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
  minLat -= latPad;
  maxLat += latPad;
  minLon -= lonPad;
  maxLon += lonPad;

  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
  const query = `
[out:json][timeout:25];
(
  way["building"](${bbox});
);
out body;
>;
out skel qt;
`;

  console.log(`Fetching buildings (bbox: ${bbox}) …`);
  const results: BuildingPolygon[] = [];
  const RESIDENTIAL_TAGS = new Set([
    'residential', 'house', 'apartments', 'detached',
    'semidetached_house', 'terrace', 'dormitory',
  ]);

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'scoopbus-game/1.0' },
    });

    if (res.ok) {
      const json = await res.json();
      const nodes = new Map<number, [number, number]>();
      for (const el of json.elements) {
        if (el.type === 'node') nodes.set(el.id, [el.lon, el.lat]);
      }
      for (const el of json.elements) {
        if (el.type === 'way' && el.nodes && el.nodes.length >= 3) {
          const ring: [number, number][] = [];
          for (const nid of el.nodes) {
            const pt = nodes.get(nid);
            if (pt) ring.push([pt[1], pt[0]]);
          }
          if (ring.length < 3) continue;
          const buildingTag = el.tags?.building ?? 'yes';
          const type: 'grey' | 'red' = RESIDENTIAL_TAGS.has(buildingTag) ? 'red' : 'grey';
          const bldg: BuildingPolygon = { type, points: ring };
          if (el.tags?.height) {
            const h = parseFloat(el.tags.height);
            if (!isNaN(h) && h > 0) bldg.height = Math.round(h);
          } else if (el.tags?.['building:levels']) {
            const levels = parseFloat(el.tags['building:levels']);
            if (!isNaN(levels) && levels > 0) bldg.height = Math.round(levels * 3);
          }
          results.push(bldg);
        }
      }
      console.log(`  Overpass returned ${json.elements.length} elements → ${results.length} buildings`);
    } else {
      console.warn(`  ⚠ Overpass responded with ${res.status}`);
    }
  } catch (err) {
    console.warn('  ⚠ Overpass fetch failed:', err);
  }
  return results;
}

function filterBuildingsByDistance(
  buildings: BuildingPolygon[],
  courseCoords: number[][],
  maxDist: number,
  maxCount: number = Infinity,
): BuildingPolygon[] {
  const before = buildings.length;
  const withDist = buildings
    .map((b) => {
      const coords: [number, number][] = b.points.map(([lat, lon]) => [lon, lat]);
      return { building: b, dist: minDistanceToPath(coords, courseCoords) };
    })
    .filter((bd) => bd.dist <= maxDist);
  withDist.sort((a, b) => a.dist - b.dist);
  const capped = withDist.slice(0, maxCount).map((bd) => bd.building);
  if (capped.length < before) {
    console.log(
      `  Filtered buildings: ${before} → ${withDist.length} (within ${maxDist}m)` +
        (withDist.length > maxCount ? ` → ${capped.length} (closest ${maxCount})` : ''),
    );
  }
  return capped;
}

// ── Write helpers ────────────────────────────────────────────────────

function writeJson(filePath: string, data: unknown) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const gpxPath = resolve(process.cwd(), gpxFile!);
  if (!existsSync(gpxPath)) {
    console.error(`GPX file not found: ${gpxPath}`);
    process.exit(1);
  }

  console.log(`\n🏃 Parsing GPX: ${gpxPath}`);
  const allPoints = parseGpx(gpxPath);
  console.log(`  Total GPX track points: ${allPoints.length}`);

  // Compute total distance
  let totalDist = 0;
  for (let i = 1; i < allPoints.length; i++) {
    totalDist += haversine(allPoints[i - 1].lat, allPoints[i - 1].lon, allPoints[i].lat, allPoints[i].lon);
  }
  console.log(`  Total track distance: ${(totalDist / 1000).toFixed(2)} km`);

  // Sample
  const sampled = sampleEveryNMetres(allPoints, SAMPLE_INTERVAL);
  console.log(`  Sampled every ${SAMPLE_INTERVAL}m → ${sampled.length} points`);

  // Build data
  const course = buildCourseData(eventId, sampled);
  const altitude = buildAltitude(sampled);

  // Write course & altitude
  const levelDir = resolve(LEVELS_DIR, eventId);
  mkdirSync(levelDir, { recursive: true });

  writeJson(resolve(levelDir, 'course.json'), course);
  console.log(`✅ Wrote course.json (${course.coordinates.length} points)`);

  writeJson(resolve(levelDir, 'altitude.json'), altitude);
  console.log(`✅ Wrote altitude.json (${altitude.length} values)`);

  // Fetch features if requested
  if (fetchFeatures) {
    const MAX_FEATURE_DIST = 200;
    const MAX_PATH_DIST = 300;
    const MIN_PATH_SPACING = 20;
    const MAX_BUILDINGS = 50;

    const [rawPaths, rawBuildings] = await Promise.all([
      fetchPathFeatures(course.coordinates, 400),
      fetchBuildingFeatures(course.coordinates, 600),
    ]);

    const paths = filterAndSimplifyPaths(rawPaths, course.coordinates, MAX_PATH_DIST, MIN_PATH_SPACING);
    const buildings = filterBuildingsByDistance(rawBuildings, course.coordinates, MAX_FEATURE_DIST, MAX_BUILDINGS);

    if (paths.length > 0) {
      writeJson(resolve(levelDir, 'paths.json'), paths);
      console.log(`✅ Wrote paths.json (${paths.length} paths)`);
    }
    if (buildings.length > 0) {
      writeJson(resolve(levelDir, 'buildings.json'), buildings);
      console.log(`✅ Wrote buildings.json (${buildings.length} buildings)`);
    }

    // Update index.ts to include new imports
    const existingWater = existsSync(resolve(levelDir, 'water.json'));
    const existingMarshals = existsSync(resolve(levelDir, 'marshals.json'));
    const existingRoads = existsSync(resolve(levelDir, 'roads.json'));

    const imports: string[] = [
      `// Auto-generated by scripts/gpx-to-level.ts — do not edit manually`,
      `import type { LevelData } from '../types';`,
      `import course from './course.json';`,
      `import altitude from './altitude.json';`,
    ];
    const fields: string[] = [
      `  id: '${eventId}',`,
      `  name: '${displayName}',`,
      `  course: course as LevelData['course'],`,
      `  altitude,`,
    ];

    if (existingWater) {
      imports.push(`import water from './water.json';`);
      fields.push(`  water: water as LevelData['water'],`);
    } else {
      fields.push(`  water: [],`);
    }
    if (buildings.length > 0) {
      imports.push(`import buildings from './buildings.json';`);
      fields.push(`  buildings: buildings as LevelData['buildings'],`);
    }
    if (paths.length > 0) {
      imports.push(`import paths from './paths.json';`);
      fields.push(`  paths: paths as LevelData['paths'],`);
    }
    if (existingMarshals) {
      imports.push(`import marshals from './marshals.json';`);
      fields.push(`  marshals: marshals as LevelData['marshals'],`);
    }
    if (existingRoads) {
      imports.push(`import roads from './roads.json';`);
      fields.push(`  roads: roads as LevelData['roads'],`);
    }

    const indexContent = [
      ...imports,
      ``,
      `const level: LevelData = {`,
      ...fields,
      `};`,
      ``,
      `export default level;`,
      ``,
    ].join('\n');

    writeFileSync(resolve(levelDir, 'index.ts'), indexContent, 'utf-8');
    console.log(`✅ Updated index.ts`);
  }

  console.log(`\nDone! Level data written to ${levelDir}/\n`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
