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

import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVELS_DIR = resolve(__dirname, '../src/levels');
const CONVEX_URL = 'https://charming-yak-976.eu-west-1.convex.site';

// ── Arg parsing ──────────────────────────────────────────────────────

const VALID_TYPES = ['all', 'course', 'altitude', 'water', 'buildings', 'paths', 'roads'] as const;
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
  console.error('Usage: pnpm game:level <eventId> [--name "Display Name"] [--type=water|altitude|course|buildings|paths|roads|all]');
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

// ── Fetch path features from Overpass ─────────────────────────────────

type PathType = 'footway' | 'cycleway' | 'path' | 'track' | 'steps' | 'bridleway';

interface PathPolyline {
  type: PathType;
  points: [number, number][]; // [lat, lon]
}

/**
 * Return distance in metres from a point [lon, lat] to the nearest point on
 * any segment of the course (point-to-segment, not just point-to-vertex).
 */
function pointToPathDist(
  pLon: number,
  pLat: number,
  courseCoords: number[][],
): number {
  let best = Infinity;
  for (const c of courseCoords) {
    const d = haversineMetres(pLon, pLat, c[0], c[1]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Simplify a polyline by removing points that are closer than `minDist` metres
 * to the previously kept point.  Always keeps the first and last point.
 */
function simplifyByMinDist(
  points: [number, number][],
  minDist: number,
): [number, number][] {
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
  const lonPad =
    paddingMetres / (111_000 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
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
        if (el.type === 'way' && el.nodes && el.nodes.length >= 2) {
          const pts: [number, number][] = []; // [lat, lon]
          for (const nid of el.nodes) {
            const pt = nodes.get(nid);
            if (pt) pts.push([pt[1], pt[0]]); // [lat, lon]
          }
          if (pts.length < 2) continue;

          const highway = el.tags?.highway as PathType;
          if (PATH_TYPES.includes(highway)) {
            results.push({ type: highway, points: pts });
          }
        }
      }
      console.log(
        `  Overpass returned ${json.elements.length} elements → ${results.length} paths`,
      );
    } else {
      console.warn(`  ⚠ Overpass responded with ${res.status}`);
    }
  } catch (err) {
    console.warn('  ⚠ Overpass fetch failed:', err);
  }

  return results;
}

/** Filter path features: drop points >maxDist from course, simplify to minSpacing. */
function filterAndSimplifyPaths(
  paths: PathPolyline[],
  courseCoords: number[][],
  maxDist: number,
  minSpacing: number,
): PathPolyline[] {
  const before = paths.length;
  const result: PathPolyline[] = [];

  for (const p of paths) {
    // Keep only points within maxDist of the course
    const nearby = p.points.filter(([lat, lon]) =>
      pointToPathDist(lon, lat, courseCoords) <= maxDist,
    );
    if (nearby.length < 2) continue;

    // Simplify by enforcing minSpacing between consecutive kept points
    const simplified = simplifyByMinDist(nearby, minSpacing);
    if (simplified.length < 2) continue;

    result.push({ type: p.type, points: simplified });
  }

  const totalPtsBefore = paths.reduce((s, p) => s + p.points.length, 0);
  const totalPtsAfter = result.reduce((s, p) => s + p.points.length, 0);
  console.log(
    `  Filtered paths: ${before} → ${result.length} (within ${maxDist}m), ` +
    `points: ${totalPtsBefore} → ${totalPtsAfter} (${minSpacing}m spacing)`,
  );
  return result;
}

// ── Fetch road features from Overpass ─────────────────────────────────

const ROAD_TYPES = [
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'unclassified', 'residential', 'service',
  'living_street', 'pedestrian',
] as const;

type RoadPolyline = [number, number][]; // [lat, lon]

async function fetchRoadFeatures(
  coords: number[][],
  paddingMetres = 400,
): Promise<RoadPolyline[]> {
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

  // Use a regex to match all road types at once instead of separate lines
  const typeRegex = ROAD_TYPES.join('|');

  const query = `
[out:json][timeout:60];
(
  way["highway"~"^(${typeRegex})$"](${bbox});
);
out body;
>;
out skel qt;
`;

  console.log(`Fetching roads (bbox: ${bbox}) …`);
  const results: RoadPolyline[] = [];

  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  try {
    let res: Response | null = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'scoopbus-game/1.0',
          },
        });
        if (res.ok) break;
        console.warn(`  ⚠ ${endpoint} responded with ${res.status}, trying next …`);
      } catch (err) {
        console.warn(`  ⚠ ${endpoint} failed:`, err);
      }
    }
    if (!res || !res.ok) {
      console.warn(`  ⚠ All Overpass endpoints failed`);
      return results;
    }

    const json = await res.json();
    const nodes = new Map<number, [number, number]>();

    for (const el of json.elements) {
      if (el.type === 'node') {
        nodes.set(el.id, [el.lon, el.lat]);
      }
    }

    for (const el of json.elements) {
      if (el.type === 'way' && el.nodes && el.nodes.length >= 2) {
        const pts: [number, number][] = []; // [lat, lon]
        for (const nid of el.nodes) {
          const pt = nodes.get(nid);
          if (pt) pts.push([pt[1], pt[0]]); // [lat, lon]
        }
        if (pts.length < 2) continue;

        const highway = el.tags?.highway;
        if (ROAD_TYPES.includes(highway)) {
          results.push(pts);
        }
      }
    }
    console.log(
      `  Overpass returned ${json.elements.length} elements → ${results.length} roads`,
    );
  } catch (err) {
    console.warn('  ⚠ Overpass fetch failed:', err);
  }

  return results;
}

/** Filter road features: drop points >maxDist from course, simplify to minSpacing. */
function filterAndSimplifyRoads(
  roads: RoadPolyline[],
  courseCoords: number[][],
  maxDist: number,
  minSpacing: number,
): RoadPolyline[] {
  const before = roads.length;
  const result: RoadPolyline[] = [];

  for (const road of roads) {
    // Keep only points within maxDist of the course
    const nearby = road.filter(([lat, lon]) =>
      pointToPathDist(lon, lat, courseCoords) <= maxDist,
    );
    if (nearby.length < 2) continue;

    // Simplify by enforcing minSpacing between consecutive kept points
    const simplified = simplifyByMinDist(nearby, minSpacing);
    if (simplified.length < 2) continue;

    result.push(simplified);
  }

  const totalPtsBefore = roads.reduce((s, r) => s + r.length, 0);
  const totalPtsAfter = result.reduce((s, r) => s + r.length, 0);
  console.log(
    `  Filtered roads: ${before} → ${result.length} (within ${maxDist}m), ` +
    `points: ${totalPtsBefore} → ${totalPtsAfter} (${minSpacing}m spacing)`,
  );
  return result;
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

// ── Write level files ────────────────────────────────────────────────

/** Write a JSON file, creating parent dirs as needed. */
function writeJson(filePath: string, data: unknown) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function writeLevelFile(
  id: string,
  name: string,
  course: CourseData,
  altitude: number[],
  water: WaterPolygon[],
  buildings: BuildingPolygon[],
  paths: PathPolyline[],
  extras?: { marshals?: [number, number][]; roads?: [number, number][][]; hide?: boolean },
) {
  // Strip Convex internal fields, keep only what we need
  const cleanCourse = {
    eventId: course.eventId,
    coordinates: course.coordinates,
    points: course.points,
  };

  // Create level sub-directory
  const levelDir = resolve(LEVELS_DIR, id);
  mkdirSync(levelDir, { recursive: true });

  // Write each data type as a separate JSON file
  writeJson(resolve(levelDir, 'course.json'), cleanCourse);
  writeJson(resolve(levelDir, 'altitude.json'), altitude);
  writeJson(resolve(levelDir, 'water.json'), water);

  if (buildings.length > 0) {
    writeJson(resolve(levelDir, 'buildings.json'), buildings);
  }
  if (paths.length > 0) {
    writeJson(resolve(levelDir, 'paths.json'), paths);
  }
  if (extras?.marshals && extras.marshals.length > 0) {
    writeJson(resolve(levelDir, 'marshals.json'), extras.marshals);
  }
  if (extras?.roads && extras.roads.length > 0) {
    writeJson(resolve(levelDir, 'roads.json'), extras.roads);
  }

  // Generate the level's index.ts that imports JSON files and exports LevelData
  const imports: string[] = [
    `// Auto-generated by scripts/fetch-level.ts — do not edit manually`,
    `import type { LevelData } from '../types';`,
    `import course from './course.json';`,
    `import altitude from './altitude.json';`,
    `import water from './water.json';`,
  ];
  const fields: string[] = [
    `  id: '${id}',`,
    `  name: '${name}',`,
    `  course: course as LevelData['course'],`,
    `  altitude,`,
    `  water: water as LevelData['water'],`,
  ];

  if (buildings.length > 0) {
    imports.push(`import buildings from './buildings.json';`);
    fields.push(`  buildings: buildings as LevelData['buildings'],`);
  }
  if (paths.length > 0) {
    imports.push(`import paths from './paths.json';`);
    fields.push(`  paths: paths as LevelData['paths'],`);
  }
  if (extras?.marshals && extras.marshals.length > 0) {
    imports.push(`import marshals from './marshals.json';`);
    fields.push(`  marshals: marshals as LevelData['marshals'],`);
  }
  if (extras?.roads && extras.roads.length > 0) {
    imports.push(`import roads from './roads.json';`);
    fields.push(`  roads: roads as LevelData['roads'],`);
  }
  if (extras?.hide !== undefined) {
    fields.push(`  hide: ${extras.hide},`);
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
  console.log(`\n✅ Wrote level files to ${levelDir}/`);
}

// ── Regenerate barrel index ──────────────────────────────────────────

function regenerateIndex(levelNames: Record<string, string>) {
  // Discover all level sub-folders (those containing an index.ts)
  const entries = readdirSync(LEVELS_DIR, { withFileTypes: true });
  const subfolderIds = entries
    .filter((e) => e.isDirectory() && existsSync(resolve(LEVELS_DIR, e.name, 'index.ts')))
    .map((e) => e.name)
    .sort();

  // Also discover legacy .map.ts files (not yet migrated)
  const legacyIds = entries
    .filter((e) => e.isFile() && e.name.endsWith('.map.ts'))
    .map((e) => e.name.replace('.map.ts', ''))
    .filter((id) => !subfolderIds.includes(id))
    .sort();

  const allIds = [...subfolderIds, ...legacyIds].sort();

  const lines: string[] = [
    `/**`,
    ` * Level registry — provides metadata eagerly & full data lazily.`,
    ` *`,
    ` * Auto-generated by scripts/fetch-level.ts`,
    ` */`,
    `import type { LevelData } from './types';`,
    ``,
    `// ── Level metadata (always available, no heavy data) ─────────────────`,
    ``,
    `export interface LevelMeta {`,
    `  id: string;`,
    `  name: string;`,
    `  hide?: boolean;`,
    `}`,
    ``,
    `const levelMeta: LevelMeta[] = [`,
  ];

  for (const id of allIds) {
    const name = levelNames[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
    lines.push(`  { id: '${id}', name: '${name}' },`);
  }

  lines.push(`];`);
  lines.push(``);
  lines.push(`export const levels: Record<string, LevelMeta> = Object.fromEntries(`);
  lines.push(`  levelMeta.map((m) => [m.id, m]),`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`// ── Lazy loader — resolves the full LevelData on demand ──────────────`);
  lines.push(``);
  lines.push(`const loaders: Record<string, () => Promise<{ default: LevelData }>> = {`);

  if (subfolderIds.length > 0) {
    for (const id of subfolderIds) {
      lines.push(`  ${id}: () => import('./${id}/index'),`);
    }
  }
  if (legacyIds.length > 0) {
    lines.push(`  // Legacy .map.ts files (not yet migrated to sub-folders)`);
    for (const id of legacyIds) {
      lines.push(`  ${id}: () => import('./${id}.map'),`);
    }
  }

  lines.push(`};`);
  lines.push(``);
  lines.push(`const cache = new Map<string, LevelData>();`);
  lines.push(``);
  lines.push(`export async function loadLevel(id: string): Promise<LevelData> {`);
  lines.push(`  const cached = cache.get(id);`);
  lines.push(`  if (cached) return cached;`);
  lines.push(``);
  lines.push(`  const loader = loaders[id];`);
  lines.push(`  if (!loader) {`);
  lines.push(`    const available = Object.keys(loaders).join(', ');`);
  lines.push(`    throw new Error(`);
  lines.push(`      \`Unknown level "\${id}". Available levels: \${available || '(none — run pnpm game:level <id>)'}\`,`);
  lines.push(`    );`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  const mod = await loader();`);
  lines.push(`  cache.set(id, mod.default);`);
  lines.push(`  return mod.default;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export type { LevelData } from './types';`);
  lines.push(``);
  lines.push(`// Default export for backward-compat: the metadata record`);
  lines.push(`export default levels;`);
  lines.push(``);

  const indexPath = resolve(LEVELS_DIR, 'index.ts');
  writeFileSync(indexPath, lines.join('\n'), 'utf-8');
  console.log(`✅ Regenerated ${indexPath} (${allIds.length} level${allIds.length === 1 ? '' : 's'}: ${subfolderIds.length} migrated, ${legacyIds.length} legacy)`);
}

// ── Read existing level ──────────────────────────────────────────────

interface ExistingLevel {
  course: CourseData;
  altitude: number[];
  water: WaterPolygon[];
  name: string;
  buildings?: BuildingPolygon[];
  paths?: PathPolyline[];
  marshals?: [number, number][];
  roads?: [number, number][][];
  hide?: boolean;
}

async function readExistingLevel(id: string): Promise<ExistingLevel | null> {
  const levelDir = resolve(LEVELS_DIR, id);
  const subfolderIndex = resolve(levelDir, 'index.ts');
  const legacyFile = resolve(LEVELS_DIR, `${id}.map.ts`);

  // Try reading individual JSON files first (avoids tsx issues with asset imports)
  if (existsSync(subfolderIndex)) {
    const courseFile = resolve(levelDir, 'course.json');
    const altFile = resolve(levelDir, 'altitude.json');
    const waterFile = resolve(levelDir, 'water.json');

    if (existsSync(courseFile) && existsSync(altFile) && existsSync(waterFile)) {
      try {
        const course = JSON.parse(readFileSync(courseFile, 'utf-8'));
        const altitude = JSON.parse(readFileSync(altFile, 'utf-8'));
        const water = JSON.parse(readFileSync(waterFile, 'utf-8'));

        // Read optional JSON files
        const buildingsFile = resolve(levelDir, 'buildings.json');
        const pathsFile = resolve(levelDir, 'paths.json');
        const marshalsFile = resolve(levelDir, 'marshals.json');
        const roadsFile = resolve(levelDir, 'roads.json');

        const buildings = existsSync(buildingsFile) ? JSON.parse(readFileSync(buildingsFile, 'utf-8')) : undefined;
        const paths = existsSync(pathsFile) ? JSON.parse(readFileSync(pathsFile, 'utf-8')) : undefined;
        const marshals = existsSync(marshalsFile) ? JSON.parse(readFileSync(marshalsFile, 'utf-8')) : undefined;
        const roads = existsSync(roadsFile) ? JSON.parse(readFileSync(roadsFile, 'utf-8')) : undefined;

        // Extract name from index.ts via simple regex
        const indexSrc = readFileSync(subfolderIndex, 'utf-8');
        const nameMatch = indexSrc.match(/name:\s*['"]([^'"]+)['"]/);
        const name = nameMatch?.[1] ?? id.charAt(0).toUpperCase() + id.slice(1);

        // Extract hide from index.ts
        const hideMatch = indexSrc.match(/hide:\s*(true|false)/);
        const hide = hideMatch ? hideMatch[1] === 'true' : undefined;

        return { course, altitude, water, name, buildings, paths, marshals, roads, hide };
      } catch (err) {
        console.warn(`  ⚠ Could not read JSON files for "${id}":`, err);
      }
    }
  }

  // Fallback: dynamic import (legacy .map.ts files)
  const filePath = existsSync(subfolderIndex) ? subfolderIndex : legacyFile;
  if (!existsSync(filePath)) return null;

  try {
    const mod = await import(filePath);
    const data = mod.default;
    if (!data) return null;
    return {
      course: data.course,
      altitude: data.altitude,
      water: data.water,
      name: data.name,
      buildings: data.buildings,
      paths: data.paths,
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

  const MAX_FEATURE_DIST = 200; // metres — only keep features within this distance of the course
  const MAX_PATH_DIST = 300;    // metres — only keep path points within this distance of the course
  const MIN_PATH_SPACING = 20;  // metres — minimum distance between consecutive path points
  const MAX_BUILDINGS = 50;     // cap the number of buildings to the N closest to the path

  // Determine what to fetch
  const needCourse = fetchType === 'all' || fetchType === 'course';
  const needAltitude = fetchType === 'all' || fetchType === 'altitude';
  const needWater = fetchType === 'all' || fetchType === 'water';
  const needBuildings = fetchType === 'all' || fetchType === 'buildings';
  const needPaths = fetchType === 'all' || fetchType === 'paths';
  const needRoads = fetchType === 'all' || fetchType === 'roads';

  // Course is always needed for altitude/water/buildings coords, but we can reuse existing
  let course: CourseData;
  if (needCourse) {
    course = await fetchCourse(eventId);
  } else {
    course = existing!.course;
  }

  // Fetch only what's requested, reuse existing for the rest
  const [altitude, rawWater, rawBuildings, rawPaths, rawRoads] = await Promise.all([
    needAltitude
      ? fetchElevations(course.coordinates)
      : Promise.resolve(existing!.altitude),
    needWater
      ? fetchWaterFeatures(course.coordinates, 600)
      : Promise.resolve(existing!.water),
    needBuildings
      ? fetchBuildingFeatures(course.coordinates, 600)
      : Promise.resolve(existing?.buildings ?? []),
    needPaths
      ? fetchPathFeatures(course.coordinates, 400)
      : Promise.resolve(existing?.paths ?? []),
    needRoads
      ? fetchRoadFeatures(course.coordinates, 400)
      : Promise.resolve(existing?.roads ?? []),
  ]);

  // Filter water & buildings to within MAX_FEATURE_DIST of the path
  const water = needWater
    ? filterWaterByDistance(rawWater, course.coordinates, MAX_FEATURE_DIST)
    : rawWater;
  const buildings = needBuildings
    ? filterBuildingsByDistance(rawBuildings, course.coordinates, MAX_FEATURE_DIST, MAX_BUILDINGS)
    : rawBuildings;
  const paths = needPaths
    ? filterAndSimplifyPaths(rawPaths, course.coordinates, MAX_PATH_DIST, MIN_PATH_SPACING)
    : rawPaths;
  const roads = needRoads
    ? filterAndSimplifyRoads(rawRoads, course.coordinates, MAX_PATH_DIST, MIN_PATH_SPACING)
    : rawRoads;

  const name = displayName || existing?.name || eventId.charAt(0).toUpperCase() + eventId.slice(1);

  writeLevelFile(eventId, name, course, altitude, water, buildings, paths, {
    marshals: existing?.marshals,
    roads,
    hide: existing?.hide,
  });
  if (!isPartial) {
    // Collect names from all existing levels for the index
    const allNames: Record<string, string> = { [eventId]: name };
    const entries = readdirSync(LEVELS_DIR, { withFileTypes: true });

    // Check sub-folders
    for (const e of entries) {
      if (e.isDirectory() && e.name !== eventId && existsSync(resolve(LEVELS_DIR, e.name, 'index.ts'))) {
        try {
          const mod = await import(resolve(LEVELS_DIR, e.name, 'index.ts'));
          if (mod.default?.name) allNames[e.name] = mod.default.name;
        } catch { /* skip */ }
      }
    }
    // Check legacy .map.ts files
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.map.ts') && !allNames[e.name.replace('.map.ts', '')]) {
        const lid = e.name.replace('.map.ts', '');
        try {
          const mod = await import(resolve(LEVELS_DIR, e.name));
          if (mod.default?.name) allNames[lid] = mod.default.name;
        } catch { /* skip */ }
      }
    }

    regenerateIndex(allNames);
  }

  console.log(`\nDone! You can now use event="${eventId}" in the game.\n`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
