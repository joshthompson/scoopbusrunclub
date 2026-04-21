#!/usr/bin/env node
/**
 * Fetch level data for the game and write it to a .map.ts file.
 *
 * Usage:
 *   pnpm game:level <eventId> [--name "Display Name"] [--type=<type>]
 *
 * Examples:
 *   pnpm game:level haga                  # fetch everything
 *   pnpm game:level haga --type=water      # re-fetch only water
 *   pnpm game:level haga --type=altitude   # re-fetch only altitude
 *   pnpm game:level haga --type=course     # re-fetch only course
 *
 * Valid --type values: all (default), course, altitude, water
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVELS_DIR = resolve(__dirname, '../src/levels');
const CONVEX_URL = 'https://charming-yak-976.eu-west-1.convex.site';

// ── Arg parsing ──────────────────────────────────────────────────────

const VALID_TYPES = ['all', 'course', 'altitude', 'water'] as const;
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
  console.error('Usage: pnpm game:level <eventId> [--name "Display Name"] [--type=water|altitude|course|all]');
  process.exit(1);
}

if (!VALID_TYPES.includes(fetchType)) {
  console.error(`Invalid --type="${fetchType}". Valid values: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
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

// ── Write level file ─────────────────────────────────────────────────

function writeLevelFile(
  id: string,
  name: string,
  course: CourseData,
  altitude: number[],
  water: WaterPolygon[],
) {
  // Strip Convex internal fields, keep only what we need
  const cleanCourse = {
    eventId: course.eventId,
    coordinates: course.coordinates,
    points: course.points,
  };
  const data = { id, name, course: cleanCourse, altitude, water };
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

function readExistingLevel(id: string): { course: CourseData; altitude: number[]; water: WaterPolygon[]; name: string } | null {
  const filePath = resolve(LEVELS_DIR, `${id}.map.ts`);
  if (!existsSync(filePath)) return null;

  try {
    const src = readFileSync(filePath, 'utf-8');
    // Extract the JSON object from: const level: LevelData = { ... };
    const match = src.match(/const level: LevelData = (\{[\s\S]*\});/);
    if (!match) return null;
    const data = JSON.parse(match[1]);
    return {
      course: data.course,
      altitude: data.altitude,
      water: data.water,
      name: data.name,
    };
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const isPartial = fetchType !== 'all';
  console.log(`\n🎮 Fetching ${isPartial ? fetchType : 'all data'} for "${eventId}" …\n`);

  // For partial updates, load the existing level file first
  const existing = isPartial ? readExistingLevel(eventId) : null;
  if (isPartial && !existing) {
    console.error(`❌ Cannot do partial update: no existing level file for "${eventId}".`);
    console.error(`   Run without --type first to fetch everything.`);
    process.exit(1);
  }

  // Determine what to fetch
  const needCourse = fetchType === 'all' || fetchType === 'course';
  const needAltitude = fetchType === 'all' || fetchType === 'altitude';
  const needWater = fetchType === 'all' || fetchType === 'water';

  // Course is always needed for altitude/water coords, but we can reuse existing
  let course: CourseData;
  if (needCourse) {
    course = await fetchCourse(eventId);
  } else {
    course = existing!.course;
  }

  // Fetch only what's requested, reuse existing for the rest
  const [altitude, water] = await Promise.all([
    needAltitude
      ? fetchElevations(course.coordinates)
      : Promise.resolve(existing!.altitude),
    needWater
      ? fetchWaterFeatures(course.coordinates, 600)
      : Promise.resolve(existing!.water),
  ]);

  const name = displayName || existing?.name || eventId.charAt(0).toUpperCase() + eventId.slice(1);

  writeLevelFile(eventId, name, course, altitude, water);
  regenerateIndex();

  console.log(`\nDone! You can now use event="${eventId}" in the game.\n`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
