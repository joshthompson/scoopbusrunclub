#!/usr/bin/env node
/**
 * Fetch level data for the game and write it to a .map.ts file.
 *
 * Usage:
 *   pnpm game:level <eventId> [--name "Display Name"] [--type=<type>]
 *
 * Examples:
 *   pnpm game:level haga                      # fetch everything
 *   pnpm game:level haga --type=water          # re-fetch only water
 *   pnpm game:level haga --type=altitude       # re-fetch only altitude
 *   pnpm game:level haga --type=course         # re-fetch only course
 *   pnpm game:level haga --type=buildings      # re-fetch only buildings
 *
 * Valid --type values: all (default), course, altitude, water, buildings
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVELS_DIR = resolve(__dirname, '../src/levels');
const CONVEX_URL = 'https://charming-yak-976.eu-west-1.convex.site';

// ── Arg parsing ──────────────────────────────────────────────────────

const VALID_TYPES = ['all', 'course', 'altitude', 'water', 'buildings'] as const;
type FetchType = (typeof VALID_TYPES)[number];

const args = process.argv.slice(2);
const eventId = args.find((a) => !a.startsWith('--'));
const nameFlag = args.indexOf('--name');
const displayName =
  nameFlag !== -1 && args[nameFlag + 1]
    ? args[nameFlag + 1]
    : eventId
      ? eventId.charAt(0).toUpperCase() + eventId.slice(1)
      : '';

const typeArg = args.find((a) => a.startsWith('--type='));
const fetchType: FetchType = typeArg
  ? (typeArg.split('=')[1] as FetchType)
  : 'all';

if (!eventId) {
  console.error('Usage: pnpm game:level <eventId> [--name "Display Name"] [--type=water|altitude|course|buildings|all]');
  process.exit(1);
}

if (!VALID_TYPES.includes(fetchType)) {
  console.error(`Invalid --type="${fetchType}". Valid values: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
}

// ── Geo helpers ──────────────────────────────────────────────────────

/** Haversine distance in metres between two [lon, lat] points. */
function haversineMetres(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Return the minimum distance (metres) from any vertex of the polygon to the
 * nearest course coordinate. `polygonCoords` are [lon, lat], `courseCoords`
 * are [[lon, lat, …], …].
 */
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
        if (best < 1) return best; // short-circuit
      }
    }
  }
  return best;
}

/** Filter water features to those within `maxDist` metres of the path. */
function filterWaterByDistance(
  features: WaterPolygon[],
  courseCoords: number[][],
  maxDist: number,
): WaterPolygon[] {
  const before = features.length;
  const filtered = features.filter(
    (f) => minDistanceToPath(f.coords, courseCoords) <= maxDist,
  );
  if (filtered.length < before) {
    console.log(`  Filtered water: ${before} → ${filtered.length} (within ${maxDist}m of path)`);
  }
  return filtered;
}

/** Filter building features to those within `maxDist` metres of the path. */
function filterBuildingsByDistance(
  buildings: BuildingPolygon[],
  courseCoords: number[][],
  maxDist: number,
  maxCount: number = Infinity,
): BuildingPolygon[] {
  const before = buildings.length;

  // Compute distance for each building and filter by maxDist
  const withDist = buildings
    .map((b) => {
      const coords: [number, number][] = b.points.map(([lat, lon]) => [lon, lat]);
      return { building: b, dist: minDistanceToPath(coords, courseCoords) };
    })
    .filter((bd) => bd.dist <= maxDist);

  // Sort by distance (closest first) and take the top N
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

// ── Fetch course from Convex ─────────────────────────────────────────

interface CourseData {
  eventId: string;
  coordinates: number[][];
  points: { name: string; coordinates: number[] }[];
}

async function fetchCourse(eventId: string): Promise<CourseData> {
  const url = `${CONVEX_URL}/api/course?eventId=${encodeURIComponent(eventId)}`;
  console.log(`Fetching course from ${url} …`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch course "${eventId}": ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── Fetch elevation from Open-Meteo ──────────────────────────────────

async function fetchElevations(coords: number[][]): Promise<number[]> {
  const BATCH = 100;
  const elevations: number[] = new Array(coords.length).fill(0);
  const lats = coords.map((c) => c[1]);
  const lons = coords.map((c) => c[0]);

  for (let start = 0; start < coords.length; start += BATCH) {
    const end = Math.min(start + BATCH, coords.length);
    const batchLats = lats.slice(start, end).join(',');
    const batchLons = lons.slice(start, end).join(',');

    const url = `https://api.open-meteo.com/v1/elevation?latitude=${batchLats}&longitude=${batchLons}`;
    console.log(`  Elevation batch ${start}–${end - 1} …`);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const elev: number[] = json.elevation ?? [];
        for (let i = 0; i < elev.length; i++) {
          elevations[start + i] = elev[i] ?? 0;
        }
      } else {
        console.warn(`  ⚠ Elevation API responded with ${res.status}`);
      }
    } catch (err) {
      console.warn('  ⚠ Elevation fetch failed:', err);
    }
  }

  return elevations;
}

// ── Fetch water features from Overpass ───────────────────────────────

interface WaterPolygon {
  coords: [number, number][];
  type: 'water' | 'river';
}

async function fetchWaterFeatures(
  coords: number[][],
  paddingMetres = 600,
): Promise<WaterPolygon[]> {
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
  const lonPad =
    paddingMetres / (111_000 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
  minLat -= latPad;
  maxLat += latPad;
  minLon -= lonPad;
  maxLon += lonPad;

  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

  const query = `
[out:json][timeout:25];
(
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
  way["natural"="coastline"](${bbox});
  way["waterway"="riverbank"](${bbox});
  way["waterway"="river"](${bbox});
  way["waterway"="stream"](${bbox});
  way["waterway"="canal"](${bbox});
  way["waterway"="dock"](${bbox});
  way["landuse"="reservoir"](${bbox});
  way["landuse"="basin"](${bbox});
  relation["natural"="coastline"](${bbox});
  relation["waterway"="riverbank"](${bbox});
);
out body;
>;
out skel qt;
`;

  console.log(`Fetching water features (bbox: ${bbox}) …`);
  const results: WaterPolygon[] = [];

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'scoopbus-game/1.0',
      },
    });

    if (res.ok) {
      const json = await res.json();
      const nodes = new Map<number, [number, number]>();

      for (const el of json.elements) {
        if (el.type === 'node') {
          nodes.set(el.id, [el.lon, el.lat]);
        }
      }

      for (const el of json.elements) {
        if (el.type === 'way' && el.nodes) {
          const ring: [number, number][] = [];
          for (const nid of el.nodes) {
            const pt = nodes.get(nid);
            if (pt) ring.push(pt);
          }
          if (ring.length < 2) continue;

          const ww = el.tags?.waterway;
          const isLinear = ww === 'river' || ww === 'stream' || ww === 'canal';
          if (isLinear) {
            results.push({ coords: ring, type: 'river' });
          } else if (ring.length >= 3) {
            results.push({ coords: ring, type: 'water' });
          }
        }
      }
      console.log(
        `  Overpass returned ${json.elements.length} elements → ${results.length} features`,
      );
    } else {
      console.warn(`  ⚠ Overpass responded with ${res.status}`);
    }
  } catch (err) {
    console.warn('  ⚠ Overpass fetch failed:', err);
  }

  return results;
}

// ── Fetch building features from Overpass ────────────────────────────

interface BuildingPolygon {
  type: 'grey' | 'red';
  height?: number;
  points: [number, number][]; // [lat, lon]
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
  const lonPad =
    paddingMetres / (111_000 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'scoopbus-game/1.0',
      },
    });

    if (res.ok) {
      const json = await res.json();
      const nodes = new Map<number, [number, number]>();

      for (const el of json.elements) {
        if (el.type === 'node') {
          nodes.set(el.id, [el.lon, el.lat]);
        }
      }

      for (const el of json.elements) {
        if (el.type === 'way' && el.nodes && el.nodes.length >= 3) {
          const ring: [number, number][] = []; // [lat, lon] to match LevelData
          for (const nid of el.nodes) {
            const pt = nodes.get(nid);
            if (pt) ring.push([pt[1], pt[0]]); // [lat, lon]
          }
          if (ring.length < 3) continue;

          const buildingTag = el.tags?.building ?? 'yes';
          const type: 'grey' | 'red' = RESIDENTIAL_TAGS.has(buildingTag) ? 'red' : 'grey';

          const bldg: BuildingPolygon = { type, points: ring };

          // Extract height from tags if available
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
      console.log(
        `  Overpass returned ${json.elements.length} elements → ${results.length} buildings`,
      );
    } else {
      console.warn(`  ⚠ Overpass responded with ${res.status}`);
    }
  } catch (err) {
    console.warn('  ⚠ Overpass fetch failed:', err);
  }

  return results;
}

// ── Write level file ─────────────────────────────────────────────────

function writeLevelFile(
  id: string,
  name: string,
  course: CourseData,
  altitude: number[],
  water: WaterPolygon[],
  buildings: BuildingPolygon[],
  extras?: { marshals?: [number, number][]; roads?: [number, number][][]; hide?: boolean },
) {
  // Strip Convex internal fields, keep only what we need
  const cleanCourse = {
    eventId: course.eventId,
    coordinates: course.coordinates,
    points: course.points,
  };
  const data: Record<string, unknown> = { id, name, course: cleanCourse, altitude, water };

  if (buildings.length > 0) {
    data.buildings = buildings;
  }

  // Preserve manually-added fields
  if (extras?.marshals && extras.marshals.length > 0) data.marshals = extras.marshals;
  if (extras?.roads && extras.roads.length > 0) data.roads = extras.roads;
  if (extras?.hide !== undefined) data.hide = extras.hide;

  const json = JSON.stringify(data, null, 2);

  const filePath = resolve(LEVELS_DIR, `${id}.map.ts`);
  const content = [
    `// Auto-generated by scripts/fetch-level.ts — do not edit manually`,
    `import type { LevelData } from './types';`,
    ``,
    `const level: LevelData = ${json};`,
    ``,
    `export default level;`,
    ``,
  ].join('\n');

  writeFileSync(filePath, content, 'utf-8');
  console.log(`\n✅ Wrote ${filePath}`);
}

// ── Regenerate barrel index ──────────────────────────────────────────

function regenerateIndex() {
  const files = readdirSync(LEVELS_DIR)
    .filter((f) => f.endsWith('.map.ts'))
    .sort();

  const ids = files.map((f) => f.replace('.map.ts', ''));

  const lines: string[] = [
    `/**`,
    ` * Auto-generated barrel file — re-generated by scripts/fetch-level.ts`,
    ` * Do not edit manually.`,
    ` */`,
    `import type { LevelData } from './types';`,
    ``,
  ];

  for (const id of ids) {
    lines.push(`import ${id} from './${id}.map';`);
  }

  lines.push(``);
  lines.push(`export type { LevelData } from './types';`);
  lines.push(``);
  lines.push(`const levels: Record<string, LevelData> = {`);
  for (const id of ids) {
    lines.push(`  ${id},`);
  }
  lines.push(`};`);
  lines.push(``);
  lines.push(`export default levels;`);
  lines.push(``);

  const indexPath = resolve(LEVELS_DIR, 'index.ts');
  writeFileSync(indexPath, lines.join('\n'), 'utf-8');
  console.log(`✅ Regenerated ${indexPath} (${ids.length} level${ids.length === 1 ? '' : 's'})`);
}

// ── Read existing level ──────────────────────────────────────────────

interface ExistingLevel {
  course: CourseData;
  altitude: number[];
  water: WaterPolygon[];
  name: string;
  buildings?: BuildingPolygon[];
  marshals?: [number, number][];
  roads?: [number, number][][];
  hide?: boolean;
}

async function readExistingLevel(id: string): Promise<ExistingLevel | null> {
  const filePath = resolve(LEVELS_DIR, `${id}.map.ts`);
  if (!existsSync(filePath)) return null;

  try {
    // Dynamically import the TS module (works because we run under tsx)
    const mod = await import(filePath);
    const data = mod.default;
    if (!data) return null;
    return {
      course: data.course,
      altitude: data.altitude,
      water: data.water,
      name: data.name,
      buildings: data.buildings,
      marshals: data.marshals,
      roads: data.roads,
      hide: data.hide,
    };
  } catch (err) {
    console.warn(`  ⚠ Could not import existing level "${id}":`, err);
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const isPartial = fetchType !== 'all';
  console.log(`\n🎮 Fetching ${isPartial ? fetchType : 'all data'} for "${eventId}" …\n`);

  // For partial updates, load the existing level file first
  const existing = isPartial ? await readExistingLevel(eventId) : null;
  if (isPartial && !existing) {
    console.error(`❌ Cannot do partial update: no existing level file for "${eventId}".`);
    console.error(`   Run without --type first to fetch everything.`);
    process.exit(1);
  }

  const MAX_FEATURE_DIST = 200; // metres — only keep features within this distance of the path
  const MAX_BUILDINGS = 50;   // cap the number of buildings to the N closest to the path

  // Determine what to fetch
  const needCourse = fetchType === 'all' || fetchType === 'course';
  const needAltitude = fetchType === 'all' || fetchType === 'altitude';
  const needWater = fetchType === 'all' || fetchType === 'water';
  const needBuildings = fetchType === 'all' || fetchType === 'buildings';

  // Course is always needed for altitude/water/buildings coords, but we can reuse existing
  let course: CourseData;
  if (needCourse) {
    course = await fetchCourse(eventId);
  } else {
    course = existing!.course;
  }

  // Fetch only what's requested, reuse existing for the rest
  const [altitude, rawWater, rawBuildings] = await Promise.all([
    needAltitude
      ? fetchElevations(course.coordinates)
      : Promise.resolve(existing!.altitude),
    needWater
      ? fetchWaterFeatures(course.coordinates, 600)
      : Promise.resolve(existing!.water),
    needBuildings
      ? fetchBuildingFeatures(course.coordinates, 600)
      : Promise.resolve(existing?.buildings ?? []),
  ]);

  // Filter water & buildings to within MAX_FEATURE_DIST of the path
  const water = needWater
    ? filterWaterByDistance(rawWater, course.coordinates, MAX_FEATURE_DIST)
    : rawWater;
  const buildings = needBuildings
    ? filterBuildingsByDistance(rawBuildings, course.coordinates, MAX_FEATURE_DIST, MAX_BUILDINGS)
    : rawBuildings;

  const name = displayName || existing?.name || eventId.charAt(0).toUpperCase() + eventId.slice(1);

  writeLevelFile(eventId, name, course, altitude, water, buildings, {
    marshals: existing?.marshals,
    roads: existing?.roads,
    hide: existing?.hide,
  });
  regenerateIndex();

  console.log(`\nDone! You can now use event="${eventId}" in the game.\n`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
