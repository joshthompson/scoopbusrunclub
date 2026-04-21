#!/usr/bin/env node
/**
 * Apply GPX altitude data to a level map file.
 * For each coordinate in the map, finds the nearest GPX track point and uses
 * its elevation, replacing the existing altitude array.
 *
 * Usage:
 *   pnpm tsx scripts/apply-gpx-altitude.ts <gpxFile> [eventId]
 *
 * Examples:
 *   pnpm tsx scripts/apply-gpx-altitude.ts gpx/haga.gpx haga
 *   pnpm tsx scripts/apply-gpx-altitude.ts gpx/haga.gpx   # infers eventId from filename
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LEVELS_DIR = resolve(ROOT, 'src/levels');

// ---------------------------------------------------------------------------
// Parse GPX
// ---------------------------------------------------------------------------

interface GpxPoint {
  lat: number;
  lon: number;
  ele: number;
}

function parseGpx(gpxPath: string): GpxPoint[] {
  const xml = readFileSync(gpxPath, 'utf-8');
  const points: GpxPoint[] = [];

  // Match each <trkpt> block
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

// ---------------------------------------------------------------------------
// Haversine distance (returns metres)
// ---------------------------------------------------------------------------

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Find nearest GPX point for a given [lon, lat, ?] coordinate
// ---------------------------------------------------------------------------

function nearestElevation(gpxPoints: GpxPoint[], lon: number, lat: number): number {
  let best = gpxPoints[0];
  let bestDist = Infinity;
  for (const pt of gpxPoints) {
    const d = haversine(lat, lon, pt.lat, pt.lon);
    if (d < bestDist) {
      bestDist = d;
      best = pt;
    }
  }
  return Math.round(best.ele * 10) / 10; // round to 1 decimal place
}

// ---------------------------------------------------------------------------
// Read existing map file and extract coordinates
// ---------------------------------------------------------------------------

function extractJsonArray(source: string, marker: string): string {
  const markerIdx = source.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error(`Could not find marker ${marker}`);
  }

  const arrayStart = source.indexOf('[', markerIdx + marker.length);
  if (arrayStart === -1) {
    throw new Error(`Could not find array start after marker ${marker}`);
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = arrayStart; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '[') {
      depth++;
      continue;
    }

    if (ch === ']') {
      depth--;
      if (depth === 0) {
        return source.slice(arrayStart, i + 1);
      }
    }
  }

  throw new Error(`Could not find matching ] for marker ${marker}`);
}

function readMapCoordinates(eventId: string): number[][] {
  const filePath = resolve(LEVELS_DIR, `${eventId}.map.ts`);
  const content = readFileSync(filePath, 'utf-8');
  const coordinatesJson = extractJsonArray(content, '"coordinates"');
  return JSON.parse(coordinatesJson) as number[][];
}

// ---------------------------------------------------------------------------
// Replace altitude array in the map file
// ---------------------------------------------------------------------------

function updateAltitudeInFile(eventId: string, altitudes: number[]): void {
  const filePath = resolve(LEVELS_DIR, `${eventId}.map.ts`);
  const content = readFileSync(filePath, 'utf-8');

  const altJson = JSON.stringify(altitudes, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n');

  // Replace "altitude": [ ... ] block
  const updated = content.replace(/"altitude":\s*\[[\s\S]*?\](?=,|\s*\n\s*})/, `"altitude": ${altJson}`);

  if (updated === content) {
    console.error('Could not find altitude array in map file — no changes written.');
    process.exit(1);
  }

  writeFileSync(filePath, updated, 'utf-8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: pnpm tsx scripts/apply-gpx-altitude.ts <gpxFile> [eventId]');
  process.exit(1);
}

const gpxFile = resolve(ROOT, args[0]);
const eventId = args[1] ?? basename(gpxFile, '.gpx');

console.log(`GPX file : ${gpxFile}`);
console.log(`Event ID : ${eventId}`);

console.log('Parsing GPX...');
const gpxPoints = parseGpx(gpxFile);
console.log(`  ${gpxPoints.length} track points found`);

console.log('Reading map coordinates...');
const coordinates = readMapCoordinates(eventId);
console.log(`  ${coordinates.length} map coordinates found`);

console.log('Computing nearest elevations...');
const altitudes = coordinates.map(([lon, lat]) => nearestElevation(gpxPoints, lon, lat));

const min = Math.min(...altitudes);
const max = Math.max(...altitudes);
console.log(`  Elevation range: ${min}m – ${max}m`);

console.log('Updating map file...');
updateAltitudeInFile(eventId, altitudes);
console.log(`Done! Updated src/levels/${eventId}.map.ts`);
