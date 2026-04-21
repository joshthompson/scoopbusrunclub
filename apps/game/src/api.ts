const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string || '';

import { cacheGet, cacheSet } from './cache';

export interface CourseData {
  eventId: string;
  coordinates: number[][]; // [[lon, lat, alt], ...]
  points: { name: string; coordinates: number[] }[];
}

/**
 * Fetch course data from the Convex HTTP API, with 1-day cache.
 */
export async function fetchCourse(eventId: string): Promise<CourseData> {
  const cached = cacheGet<CourseData>('course', eventId);
  if (cached) return cached;

  const url = `${CONVEX_URL}/api/course?eventId=${encodeURIComponent(eventId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch course "${eventId}": ${res.status}`);
  }
  const data: CourseData = await res.json();

  cacheSet('course', eventId, data);

  return data;
}

/**
 * Convert an array of [lon, lat, alt?] GPS coordinates into local XZ positions
 * in metres, with the first coordinate as the origin.
 *
 * If elevations are provided, also returns per-point Y values (relative to
 * the minimum elevation so the lowest point is 0).
 *
 * We use a simple equirectangular projection — fine for ≤5 km courses.
 */
export function gpsToLocal(
  coords: number[][],
  elevations?: number[],
): {
  positions: [number, number][];
  heights: number[];
  totalDistance: number;
} {
  if (coords.length === 0) return { positions: [], heights: [], totalDistance: 0 };

  const toRad = Math.PI / 180;
  const R = 6_371_000; // Earth radius in metres

  const originLat = coords[0][1];
  const originLon = coords[0][0];
  const cosLat = Math.cos(originLat * toRad);

  const positions: [number, number][] = [];
  let totalDistance = 0;

  for (let i = 0; i < coords.length; i++) {
    const lon = coords[i][0];
    const lat = coords[i][1];

    const x = (lon - originLon) * toRad * R * cosLat;
    const z = (lat - originLat) * toRad * R;

    positions.push([x, z]);

    if (i > 0) {
      const dx = positions[i][0] - positions[i - 1][0];
      const dz = positions[i][1] - positions[i - 1][1];
      totalDistance += Math.sqrt(dx * dx + dz * dz);
    }
  }

  // Elevation: make relative to minimum so lowest point = 0
  let heights: number[];
  if (elevations && elevations.length === coords.length) {
    const minElev = Math.min(...elevations);
    heights = elevations.map((e) => e - minElev);
  } else {
    heights = new Array(coords.length).fill(0);
  }

  return { positions, heights, totalDistance };
}

/**
 * Project a [lon, lat] coordinate into local XZ metres using the same
 * origin as gpsToLocal would produce for a given set of reference coords.
 */
export function gpsPointToLocal(
  lon: number,
  lat: number,
  originCoord: number[], // [lon, lat]
): [number, number] {
  const toRad = Math.PI / 180;
  const R = 6_371_000;
  const cosLat = Math.cos(originCoord[1] * toRad);
  const x = (lon - originCoord[0]) * toRad * R * cosLat;
  const z = (lat - originCoord[1]) * toRad * R;
  return [x, z];
}
