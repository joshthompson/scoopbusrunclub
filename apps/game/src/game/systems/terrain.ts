import type { Scene } from '@babylonjs/core';
import { gpsPointToLocal } from '../../api';
import type { LevelData } from '../../levels';
import { createWaterMesh, createWaterRibbon } from '../objects/Water';
import type { BuildingFootprint, WaterZone } from '../types';

// ---------- Seeded PRNG (mulberry32) ----------

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Catmull-Rom interpolation ----------

export function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

// ---------- Terrain height lookup ----------

/**
 * Pre-computed altitude point in local coordinates for terrain lookups.
 */
export interface LocalAltitudePoint {
  x: number;
  z: number;
  h: number; // height (relative to min elevation, scaled)
}

/**
 * Convert GPS altitude points [lat, lon, alt][] to local coordinates.
 * Returns LocalAltitudePoint[] ready for terrain lookups.
 */
export function altitudeToLocal(
  altitudePoints: [number, number, number][],
  originCoord: number[],
  scaleFactor: number,
  elevationScale: number,
): LocalAltitudePoint[] {
  if (altitudePoints.length === 0) return [];

  const minElev = Math.min(...altitudePoints.map((p) => p[2]));

  return altitudePoints.map(([lat, lon, alt]) => {
    const [rawX, rawZ] = gpsPointToLocal(lon, lat, originCoord);
    return {
      x: rawX * scaleFactor,
      z: rawZ * scaleFactor,
      h: (alt - minElev) * elevationScale,
    };
  });
}

/**
 * Get terrain height at a world (x, z) position using Inverse Distance Weighting
 * from scattered altitude sample points.
 *
 * Uses the K nearest altitude points weighted by 1/distance² for smooth
 * interpolation. Falls back to nearest-point height if queried exactly on
 * a sample point.
 */
export function computeTerrainHeightIDW(
  x: number,
  z: number,
  altPoints: LocalAltitudePoint[],
  k = 12,
): number {
  const n = altPoints.length;
  if (n === 0) return 0;
  if (n === 1) return altPoints[0].h;

  // Find K nearest points
  // For small point sets (<200) brute force is fine
  const dists: { dist2: number; h: number }[] = [];
  for (let i = 0; i < n; i++) {
    const dx = x - altPoints[i].x;
    const dz = z - altPoints[i].z;
    const dist2 = dx * dx + dz * dz;
    dists.push({ dist2, h: altPoints[i].h });
  }
  dists.sort((a, b) => a.dist2 - b.dist2);

  // Exact match → return directly
  if (dists[0].dist2 < 0.001) return dists[0].h;

  // IDW with power=2 on K nearest
  const kActual = Math.min(k, n);
  let weightSum = 0;
  let valueSum = 0;
  for (let i = 0; i < kActual; i++) {
    const w = 1 / dists[i].dist2; // 1/d²
    weightSum += w;
    valueSum += w * dists[i].h;
  }

  return valueSum / weightSum;
}

/**
 * Get smoothly interpolated terrain height at a world (x, z) position.
 * Projects onto the nearest path segment, then applies Catmull-Rom spline
 * interpolation through path heights for a smooth curved surface.
 *
 * @deprecated Use computeTerrainHeightIDW with altitude points for better results.
 */
export function computeTerrainHeight(
  x: number,
  z: number,
  pathPositions: [number, number][],
  pathHeights: number[],
): number {
  const n = pathPositions.length;
  if (n === 0) return 0;
  if (n === 1) return pathHeights[0] ?? 0;

  let bestDist = Infinity;
  let bestSeg = 0;
  let bestT = 0;

  for (let i = 0; i < n - 1; i++) {
    const [ax, az] = pathPositions[i];
    const [bx, bz] = pathPositions[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;

    let t = lenSq > 0 ? ((x - ax) * dx + (z - az) * dz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));

    const px = ax + t * dx;
    const pz = az + t * dz;
    const dist = (x - px) ** 2 + (z - pz) ** 2;

    if (dist < bestDist) {
      bestDist = dist;
      bestSeg = i;
      bestT = t;
    }
  }

  const i0 = Math.max(0, bestSeg - 1);
  const i1 = bestSeg;
  const i2 = Math.min(n - 1, bestSeg + 1);
  const i3 = Math.min(n - 1, bestSeg + 2);

  return catmullRom(
    pathHeights[i0],
    pathHeights[i1],
    pathHeights[i2],
    pathHeights[i3],
    bestT,
  );
}

// ---------- Geometry helpers ----------

/** Ray-casting point-in-polygon test. */
export function pointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) &&
        x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Shortest distance from (x,z) to any edge of a polygon. */
export function distToPolygonEdge(x: number, z: number, poly: [number, number][]): number {
  let minDist = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j];
    const [bx, bz] = poly[i];
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    let t = lenSq > 0 ? ((x - ax) * dx + (z - az) * dz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.sqrt((x - (ax + t * dx)) ** 2 + (z - (az + t * dz)) ** 2);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/** Shortest distance from point (x,z) to the path polyline. */
export function distToPath(x: number, z: number, pathPositions: [number, number][]): number {
  let minDist = Infinity;
  for (let i = 0; i < pathPositions.length - 1; i++) {
    const [ax, az] = pathPositions[i];
    const [bx, bz] = pathPositions[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    let t = lenSq > 0 ? ((x - ax) * dx + (z - az) * dz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const dist = Math.sqrt((x - px) ** 2 + (z - pz) ** 2);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

// ---------- Water helpers ----------

/** Quick check: is (x,z) inside any water zone polygon? */
export function isInWaterZone(x: number, z: number, waterZones: WaterZone[]): boolean {
  for (const wz of waterZones) {
    if (pointInPolygon(x, z, wz.points)) return true;
  }
  return false;
}

/** Return water surface Y at (x,z) if inside a water zone, or null. */
export function getWaterSurfaceYAt(x: number, z: number, waterZones: WaterZone[]): number | null {
  for (const wz of waterZones) {
    if (pointInPolygon(x, z, wz.points)) return wz.y;
  }
  return null;
}

/**
 * Check if a world (x, z) point is inside or near a water zone.
 * Returns the depressed Y value if so, or null if not in water.
 * Points inside get pushed below water level; points within a bank
 * distance get a smooth transition.
 */
export function getWaterDepressionAt(
  x: number,
  z: number,
  waterZones: WaterZone[],
  getTerrainHeight: (x: number, z: number) => number,
): number | null {
  const BANK_WIDTH = 15; // metres — transition zone around water edges

  for (const wz of waterZones) {
    // Quick bounding box check
    let mnX = Infinity, mxX = -Infinity, mnZ = Infinity, mxZ = -Infinity;
    for (const [px, pz] of wz.points) {
      if (px < mnX) mnX = px; if (px > mxX) mxX = px;
      if (pz < mnZ) mnZ = pz; if (pz > mxZ) mxZ = pz;
    }
    if (x < mnX - BANK_WIDTH || x > mxX + BANK_WIDTH ||
        z < mnZ - BANK_WIDTH || z > mxZ + BANK_WIDTH) continue;

    const inside = pointInPolygon(x, z, wz.points);
    const waterFloor = wz.y - 2.0; // lake/river bed is 2m below water surface

    if (inside) {
      return waterFloor;
    }

    // Check if we're within BANK_WIDTH of the polygon edge
    const edgeDist = distToPolygonEdge(x, z, wz.points);
    if (edgeDist < BANK_WIDTH) {
      const terrainH = getTerrainHeight(x, z) - 0.08;
      const t = edgeDist / BANK_WIDTH; // 0 at edge → 1 at bank limit
      // Smooth interpolation: near edge → dips toward water floor
      return terrainH * t + waterFloor * (1 - t);
    }
  }
  return null;
}

// ---------- Data transforms ----------

/**
 * Pre-compute water zone polygons in local coordinates.
 */
export function computeWaterZones(
  waterFeatures: LevelData['water'],
  originCoord: number[],
  scaleFactor: number,
  getTerrainHeight: (x: number, z: number) => number,
): WaterZone[] {
  const zones: WaterZone[] = [];
  console.log(`[water] Processing ${waterFeatures.length} water features`);
  for (const wf of waterFeatures) {
    const localPts: [number, number][] = wf.coords.map(([lon, lat]) => {
      const [lx, lz] = gpsPointToLocal(lon, lat, originCoord);
      return [lx * scaleFactor, lz * scaleFactor];
    });

    // Find minimum terrain height at the water boundary → water sits there
    let minH = Infinity;
    for (const [wx, wz] of localPts) {
      const h = getTerrainHeight(wx, wz);
      if (h < minH) minH = h;
    }
    if (!isFinite(minH)) minH = 0;

    zones.push({ points: localPts, y: minH + 0.1 });
  }
  console.log(`[water] ${zones.length} water zones stored`);
  return zones;
}

/**
 * Render pre-computed water zones as blue meshes.
 */
export function buildWaterMeshes(scene: Scene, waterZones: WaterZone[]) {
  for (let i = 0; i < waterZones.length; i++) {
    const wz = waterZones[i];
    if (wz.points.length >= 3) {
      createWaterMesh(scene, `water_${i}`, wz.points, wz.y);
    } else if (wz.points.length >= 2) {
      createWaterRibbon(scene, `water_${i}`, wz.points, 20, wz.y);
    }
  }
}

export function computeRoadPolylines(
  roads: NonNullable<LevelData['roads']>,
  originCoord: number[],
  scaleFactor: number,
): [number, number][][] {
  const polylines: [number, number][][] = [];
  for (const road of roads) {
    if (road.length < 2) continue;
    const localRoad: [number, number][] = road.map(([lat, lon]) => {
      const [rawX, rawZ] = gpsPointToLocal(lon, lat, originCoord);
      return [rawX * scaleFactor, rawZ * scaleFactor];
    });
    if (localRoad.length >= 2) polylines.push(localRoad);
  }
  return polylines;
}

export function computeBuildingFootprintData(
  buildings: NonNullable<LevelData['buildings']>,
  originCoord: number[],
  scaleFactor: number,
): BuildingFootprint[] {
  const footprints: BuildingFootprint[] = [];
  for (const building of buildings) {
    if (building.points.length < 3) continue;
    const localPoints: [number, number][] = building.points.map(([lat, lon]) => {
      const [rawX, rawZ] = gpsPointToLocal(lon, lat, originCoord);
      return [rawX * scaleFactor, rawZ * scaleFactor];
    });
    if (localPoints.length >= 3) {
      footprints.push({
        type: building.type,
        height: building.height,
        points: localPoints,
      });
    }
  }
  return footprints;
}
