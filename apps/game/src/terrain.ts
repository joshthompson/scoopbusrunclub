/**
 * Fetch real-world terrain data: elevation (Open-Meteo) and water features (Overpass/OSM).
 * All data is cached for 1 day via the shared cache module.
 */

import { cacheGet, cacheSet } from './cache';

// ---------- Elevation (Open-Meteo) ----------

/**
 * Fetch elevations for an array of [lon, lat] coordinates using the
 * Open-Meteo Elevation API (free, no key needed).
 *
 * The API accepts up to ~100 coordinates per call, so we batch.
 *
 * Returns an array of elevation values in metres, matching input order.
 */
export async function fetchElevations(
  coords: number[][], // [[lon, lat, ...], ...]
): Promise<number[]> {
  // Deduplicate coords for caching/batching: we need elevation per input index
  const lats = coords.map((c) => c[1]);
  const lons = coords.map((c) => c[0]);

  const subkey = hashCoords(lats, lons);
  const cached = cacheGet<number[]>('elev', subkey);
  if (cached) return cached;

  const BATCH = 100;
  const elevations: number[] = new Array(coords.length).fill(0);

  for (let start = 0; start < coords.length; start += BATCH) {
    const end = Math.min(start + BATCH, coords.length);
    const batchLats = lats.slice(start, end).join(',');
    const batchLons = lons.slice(start, end).join(',');

    const url = `https://api.open-meteo.com/v1/elevation?latitude=${batchLats}&longitude=${batchLons}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const elev: number[] = json.elevation ?? [];
        for (let i = 0; i < elev.length; i++) {
          elevations[start + i] = elev[i] ?? 0;
        }
      }
    } catch {
      // Elevation is non-critical — fall back to flat
    }
  }

  cacheSet('elev', subkey, elevations);

  return elevations;
}

// ---------- Water features (OSM Overpass) ----------

export interface WaterPolygon {
  /** Coordinates as [lon, lat][] forming a closed ring */
  coords: [number, number][];
  type: 'water' | 'river';
}

/**
 * Fetch water body polygons from OSM Overpass API within a bounding box
 * around the given coordinates.
 */
export async function fetchWaterFeatures(
  coords: number[][], // [[lon, lat, ...], ...]
  paddingMetres = 500,
): Promise<WaterPolygon[]> {
  if (coords.length === 0) return [];

  // Compute bounding box
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const c of coords) {
    if (c[1] < minLat) minLat = c[1];
    if (c[1] > maxLat) maxLat = c[1];
    if (c[0] < minLon) minLon = c[0];
    if (c[0] > maxLon) maxLon = c[0];
  }

  // Pad bounding box (rough: 1° lat ≈ 111 km)
  const latPad = paddingMetres / 111_000;
  const lonPad = paddingMetres / (111_000 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
  minLat -= latPad; maxLat += latPad;
  minLon -= lonPad; maxLon += lonPad;

  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

  const cacheSubkey = bbox;
  const cachedWater = cacheGet<WaterPolygon[]>('water', cacheSubkey);
  if (cachedWater) return cachedWater;

  // Overpass query: all water features — lakes, rivers, sea, coastline, etc.
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

  const results: WaterPolygon[] = [];

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (res.ok) {
      const json = await res.json();
      const nodes = new Map<number, [number, number]>();

      // Index all nodes
      for (const el of json.elements) {
        if (el.type === 'node') {
          nodes.set(el.id, [el.lon, el.lat]);
        }
      }

      // Extract ways with their node coordinates
      for (const el of json.elements) {
        if (el.type === 'way' && el.nodes) {
          const ring: [number, number][] = [];
          for (const nid of el.nodes) {
            const pt = nodes.get(nid);
            if (pt) ring.push(pt);
          }
          if (ring.length < 2) continue;

          // Classify: linear waterways are rivers, everything else is a polygon
          const ww = el.tags?.waterway;
          const isLinear = ww === 'river' || ww === 'stream' || ww === 'canal';
          if (isLinear) {
            results.push({ coords: ring, type: 'river' });
          } else if (ring.length >= 3) {
            results.push({ coords: ring, type: 'water' });
          }
        }
      }
      console.log(`[water] Overpass returned ${json.elements.length} elements → ${results.length} features`);
    } else {
      console.warn(`[water] Overpass responded with ${res.status}`);
    }
  } catch (err) {
    console.warn('[water] Overpass fetch failed:', err);
  }

  cacheSet('water', cacheSubkey, results);

  return results;
}

// ---------- Helpers ----------

function hashCoords(lats: number[], lons: number[]): string {
  // Simple hash for cache key from first/last/count
  const n = lats.length;
  if (n === 0) return '0';
  return `${n}_${lats[0].toFixed(4)}_${lons[0].toFixed(4)}_${lats[n - 1].toFixed(4)}_${lons[n - 1].toFixed(4)}`;
}
