#!/usr/bin/env node
/**
 * One-time migration: convert altitude.json from number[] to [lat, lon, alt][].
 *
 * For each level, reads course.json (coordinates) and altitude.json (flat array)
 * and writes a new altitude.json where each entry is [lat, lon, alt].
 *
 * For haga specifically, also:
 *   1. Parses haga-alt.gpx → generates altCourse.json (sampled every 20m)
 *   2. Merges alt-course altitude points into haga's altitude.json
 *      (only points >15m from any existing altitude point)
 *
 * Usage:
 *   pnpm tsx scripts/migrate-altitude.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LEVELS_DIR = resolve(ROOT, 'src/levels');
const GPX_DIR = resolve(ROOT, 'gpx');

// ── Haversine distance (metres) ─────────────────────────────────────

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

// ── GPX parser ──────────────────────────────────────────────────────

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

// ── Sample every N metres ───────────────────────────────────────────

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

// ── JSON helpers ────────────────────────────────────────────────────

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ── Check min distance from a point to a set of points ──────────────

function minDistToSet(lat: number, lon: number, points: [number, number, number][]): number {
  let best = Infinity;
  for (const [pLat, pLon] of points) {
    const d = haversine(lat, lon, pLat, pLon);
    if (d < best) best = d;
  }
  return best;
}

// ── Migrate a single level ──────────────────────────────────────────

interface CourseData {
  eventId: string;
  coordinates: number[][]; // [lon, lat, alt?]
  points: { name: string; coordinates: number[] }[];
}

function migrateLevel(levelId: string): [number, number, number][] {
  const levelDir = resolve(LEVELS_DIR, levelId);
  const coursePath = resolve(levelDir, 'course.json');
  const altitudePath = resolve(levelDir, 'altitude.json');

  if (!existsSync(coursePath) || !existsSync(altitudePath)) {
    console.log(`  ⏭ Skipping ${levelId} — missing course.json or altitude.json`);
    return [];
  }

  const course = readJson<CourseData>(coursePath);
  const oldAltitude = readJson<unknown[]>(altitudePath);

  // Guard: skip if already migrated (entries are arrays, not numbers)
  if (oldAltitude.length > 0 && Array.isArray(oldAltitude[0])) {
    console.log(`  ⏭ ${levelId}: already migrated`);
    return oldAltitude as [number, number, number][];
  }

  const altValues = oldAltitude as number[];

  if (altValues.length !== course.coordinates.length) {
    console.warn(`  ⚠ ${levelId}: altitude (${altValues.length}) ≠ coordinates (${course.coordinates.length})`);
  }

  // Build new altitude: [lat, lon, alt][]
  const newAltitude: [number, number, number][] = course.coordinates.map((coord, i) => {
    const lon = coord[0];
    const lat = coord[1];
    const alt = altValues[i] ?? 0;
    return [
      Math.round(lat * 1e6) / 1e6,
      Math.round(lon * 1e6) / 1e6,
      Math.round(alt * 10) / 10,
    ];
  });

  writeJson(altitudePath, newAltitude);
  console.log(`  ✅ ${levelId}: ${newAltitude.length} altitude points`);

  return newAltitude;
}

// ── Generate haga alt course ────────────────────────────────────────

function generateHagaAltCourse(existingAltitude: [number, number, number][]): void {
  const gpxPath = resolve(GPX_DIR, 'haga-alt.gpx');
  if (!existsSync(gpxPath)) {
    console.log(`  ⏭ haga-alt.gpx not found — skipping alt course generation`);
    return;
  }

  console.log(`\n📍 Generating haga alt course from haga-alt.gpx...`);
  const allPoints = parseGpx(gpxPath);
  console.log(`  Total GPX track points: ${allPoints.length}`);

  // Compute total distance
  let totalDist = 0;
  for (let i = 1; i < allPoints.length; i++) {
    totalDist += haversine(allPoints[i - 1].lat, allPoints[i - 1].lon, allPoints[i].lat, allPoints[i].lon);
  }
  console.log(`  Total track distance: ${(totalDist / 1000).toFixed(2)} km`);

  // Sample every 20m for course
  const sampled = sampleEveryNMetres(allPoints, 20);
  console.log(`  Sampled every 20m → ${sampled.length} points`);

  // Build altCourse.json (same format as course.json)
  const coordinates = sampled.map((p) => [
    Math.round(p.lon * 1e6) / 1e6,
    Math.round(p.lat * 1e6) / 1e6,
    0, // alt in coordinates is unused (terrain comes from altitude.json)
  ]);

  const altCourse = {
    eventId: 'haga',
    coordinates,
    points: [
      { name: 'Finish', coordinates: coordinates[0] },
      { name: 'Start', coordinates: coordinates[0] },
    ],
  };

  const levelDir = resolve(LEVELS_DIR, 'haga');
  writeJson(resolve(levelDir, 'altCourse.json'), altCourse);
  console.log(`  ✅ Wrote altCourse.json (${coordinates.length} points)`);

  // Merge alt-course altitude into existing altitude
  // Only add points that are >15m from any existing altitude point
  const altCourseAltitude: [number, number, number][] = sampled.map((p) => [
    Math.round(p.lat * 1e6) / 1e6,
    Math.round(p.lon * 1e6) / 1e6,
    Math.round(p.ele * 10) / 10,
  ]);

  const merged = [...existingAltitude];
  let added = 0;
  let skipped = 0;

  for (const pt of altCourseAltitude) {
    const dist = minDistToSet(pt[0], pt[1], merged);
    if (dist >= 15) {
      merged.push(pt);
      added++;
    } else {
      skipped++;
    }
  }

  console.log(`  Altitude merge: ${added} added, ${skipped} skipped (within 15m)`);

  writeJson(resolve(levelDir, 'altitude.json'), merged);
  console.log(`  ✅ Updated haga altitude.json: ${merged.length} total points`);
}

// ── Main ────────────────────────────────────────────────────────────

const LEVELS = [
  'cheltenham',
  'haga',
  'huddinge',
  'judarskogen',
  'kristineberg',
  'lillsjon',
  'uppsala',
];

console.log('🔄 Migrating altitude.json files to [lat, lon, alt][] format...\n');

let hagaAltitude: [number, number, number][] = [];

for (const levelId of LEVELS) {
  const result = migrateLevel(levelId);
  if (levelId === 'haga') {
    hagaAltitude = result;
  }
}

// Generate haga alt course and merge altitude
if (hagaAltitude.length > 0) {
  generateHagaAltCourse(hagaAltitude);
}

console.log('\n✅ Migration complete!\n');
