import {
  Color3,
  type Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { gpsPointToLocal } from '../../api';
import type { LevelData } from '../../levels';
import { createKmSign } from '../objects/KmSign';
import { createMarshalModel, poseCheering } from '../objects/MarshalModel';
import { createCopperTent } from '../objects/CopperTent';
import { createHagaGate } from '../objects/HagaGate';
import { createParkrunSign } from '../objects/ParkrunSign';
import type { Marshal, Runner } from '../types';
import type { BuildingFootprint, ElasticObject, SolidObstacle } from '../types';
import {
  PATH_HALF_WIDTH,
  START_CIRCLE_RADIUS,
  TREE_COUNT,
  TREE_MIN_DIST_FROM_PATH,
  TREE_SPREAD,
  GATE_SPACING,
  GATE_RADIUS,
} from '../constants';
import { mulberry32, distToPath, isInWaterZone } from './terrain';
import type { WaterZone } from '../types';

// ---------- Result types for methods that create physics objects ----------

export interface PhysicsObjectResult {
  elasticObjects: ElasticObject[];
  solidObstacles: SolidObstacle[];
}

// ---------- Polygon helpers ----------

/** Ray-casting point-in-polygon test (works for any simple polygon). */
function isInPolygon(px: number, pz: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Check if a point falls inside any of the given polygons. */
function isInAnyPolygon(px: number, pz: number, polygons: [number, number][][]): boolean {
  for (const poly of polygons) {
    if (isInPolygon(px, pz, poly)) return true;
  }
  return false;
}

// ---------- Trees ----------

/**
 * Scatter trees across the landscape using a seeded RNG.
 * Trees avoid the path, roads, and trails and come in two variants (trunk + foliage).
 * Uses instanced meshes so all trees of the same variant/colour share a single
 * draw call, keeping the GPU budget tiny even with thousands of trees.
 * Returns the elastic objects and solid obstacles created.
 */
export function buildTrees(
  scene: Scene,
  pathPositions: [number, number][],
  getGroundY: (x: number, z: number) => number,
  waterZones: WaterZone[],
  startCircleCenter: { x: number; z: number } | null,
  roads: [number, number][][] = [],
  trails: [number, number][][] = [],
  treeCount = TREE_COUNT,
  fields: [number, number][][] = [],
  manualTrees: [number, number][] = [],
): PhysicsObjectResult {
  const result: PhysicsObjectResult = { elasticObjects: [], solidObstacles: [] };
  if (pathPositions.length < 2) return result;

  const rand = mulberry32(42);

  const trunkMat = new StandardMaterial('trunkMat', scene);
  trunkMat.diffuseColor = new Color3(0.4, 0.26, 0.13);
  trunkMat.specularColor = Color3.Black();

  // Generate a spectrum of foliage shades so every tree looks slightly different
  const FOLIAGE_SHADE_COUNT = 12;
  const foliageMats: StandardMaterial[] = [];
  for (let i = 0; i < FOLIAGE_SHADE_COUNT; i++) {
    const t = i / (FOLIAGE_SHADE_COUNT - 1); // 0 → 1
    const r = 0.10 + 0.18 * (1 - t);
    const g = 0.38 + 0.24 * Math.sin(t * Math.PI);
    const b = 0.08 + 0.14 * t;
    foliageMats.push(makeColor(scene, `foliage${i}`, new Color3(r, g, b)));
  }

  // ── Template meshes (invisible sources for instancing) ──
  // One conifer trunk + one broadleaf trunk (same material → 2 draw calls)
  const coniferTrunkTpl = MeshBuilder.CreateCylinder('tpl_ct', {
    height: 3.75, diameterTop: 0.3, diameterBottom: 0.45, tessellation: 6,
  }, scene);
  coniferTrunkTpl.material = trunkMat;
  coniferTrunkTpl.isVisible = false;

  const broadleafTrunkTpl = MeshBuilder.CreateCylinder('tpl_bt', {
    height: 3, diameterTop: 0.35, diameterBottom: 0.5, tessellation: 6,
  }, scene);
  broadleafTrunkTpl.material = trunkMat;
  broadleafTrunkTpl.isVisible = false;

  // Per-colour crown templates (12 colours × 2 variants = 24 draw calls)
  const coniferCrownTpls: Mesh[] = foliageMats.map((mat, i) => {
    const m = MeshBuilder.CreateCylinder(`tpl_cc_${i}`, {
      height: 6, diameterTop: 0, diameterBottom: 4.2, tessellation: 6,
    }, scene);
    m.material = mat;
    m.isVisible = false;
    return m;
  });

  const broadleafCrownTpls: Mesh[] = foliageMats.map((mat, i) => {
    const m = MeshBuilder.CreateSphere(`tpl_bc_${i}`, {
      diameter: 4.5, segments: 6,
    }, scene);
    m.material = mat;
    m.isVisible = false;
    return m;
  });

  // ── Helper: stamp one tree using instances ──
  function placeTree(
    prefix: string,
    idx: number,
    x: number,
    z: number,
    groundY: number,
    scale: number,
    variantRoll: number,
    colorIdx: number,
  ) {
    const treeRoot = new TransformNode(`${prefix}_${idx}`, scene);
    treeRoot.position.set(x, groundY, z);
    treeRoot.scaling.setAll(scale);

    if (variantRoll < 0.5) {
      // Conifer
      const trunk = coniferTrunkTpl.createInstance(`${prefix}_t_${idx}`);
      trunk.position.set(0, 1.875, 0);
      trunk.parent = treeRoot;

      const crown = coniferCrownTpls[colorIdx].createInstance(`${prefix}_c_${idx}`);
      crown.position.set(0, 5.25, 0);
      crown.parent = treeRoot;
    } else {
      // Broad-leaf
      const trunk = broadleafTrunkTpl.createInstance(`${prefix}_t_${idx}`);
      trunk.position.set(0, 1.5, 0);
      trunk.parent = treeRoot;

      const crown = broadleafCrownTpls[colorIdx].createInstance(`${prefix}_c_${idx}`);
      crown.position.set(0, 4.8, 0);
      crown.parent = treeRoot;
    }

    const elasticIndex = result.elasticObjects.length;
    result.elasticObjects.push({
      root: treeRoot,
      tiltX: 0,
      tiltZ: 0,
      tiltVelX: 0,
      tiltVelZ: 0,
    });
    result.solidObstacles.push({ x, z, radius: 0.5 * scale, elasticIndex });
  }

  // ── Procedural tree placement ──
  // Build combined source points from path + roads + trails so trees populate everywhere
  const sourcePoints: [number, number][] = [...pathPositions];
  for (const road of roads) {
    for (const pt of road) sourcePoints.push(pt);
  }
  for (const trail of trails) {
    for (const pt of trail) sourcePoints.push(pt);
  }

  let placed = 0;
  let attempts = 0;

  while (placed < treeCount && attempts < treeCount * 5) {
    attempts++;

    const ptIdx = Math.floor(rand() * sourcePoints.length);
    const [cx, cz] = sourcePoints[ptIdx];

    const dist = TREE_MIN_DIST_FROM_PATH + rand() * (TREE_SPREAD - TREE_MIN_DIST_FROM_PATH);
    const angle = rand() * Math.PI * 2;
    const x = cx + Math.cos(angle) * dist;
    const z = cz + Math.sin(angle) * dist;

    if (distToPath(x, z, pathPositions) < TREE_MIN_DIST_FROM_PATH) continue;
    let onRoadOrTrail = false;
    for (const road of roads) {
      if (distToPath(x, z, road) < TREE_MIN_DIST_FROM_PATH) { onRoadOrTrail = true; break; }
    }
    if (onRoadOrTrail) continue;
    for (const trail of trails) {
      if (distToPath(x, z, trail) < TREE_MIN_DIST_FROM_PATH) { onRoadOrTrail = true; break; }
    }
    if (onRoadOrTrail) continue;
    if (isInWaterZone(x, z, waterZones)) continue;
    if (isInAnyPolygon(x, z, fields)) continue;

    if (startCircleCenter) {
      const scDx = x - startCircleCenter.x;
      const scDz = z - startCircleCenter.z;
      if (scDx * scDx + scDz * scDz < START_CIRCLE_RADIUS * START_CIRCLE_RADIUS) continue;
    }

    const groundY = getGroundY(x, z);
    const variantRoll = rand();
    const scale = 0.7 + rand() * 0.8;
    const colorIdx = Math.floor(rand() * FOLIAGE_SHADE_COUNT);

    placeTree('tree_root', placed, x, z, groundY, scale, variantRoll, colorIdx);
    placed++;
  }

  // ── Manual trees (placed at exact positions) ──
  for (let mi = 0; mi < manualTrees.length; mi++) {
    const [mx, mz] = manualTrees[mi];
    const groundY = getGroundY(mx, mz);
    const variantRoll = rand();
    const scale = 0.7 + rand() * 0.8;
    const colorIdx = Math.floor(rand() * FOLIAGE_SHADE_COUNT);

    placeTree('tree_manual', mi, mx, mz, groundY, scale, variantRoll, colorIdx);
  }

  return result;
}

// ---------- Km signs ----------

/**
 * Place yellow km marker signs at 1 km, 2 km, 3 km, 4 km along the path.
 */
export function placeKmSigns(
  scene: Scene,
  pathPositions: [number, number][],
  getGroundY: (x: number, z: number) => number,
): PhysicsObjectResult {
  const result: PhysicsObjectResult = { elasticObjects: [], solidObstacles: [] };
  if (pathPositions.length < 2) return result;

  const cumDist: number[] = [0];
  for (let i = 1; i < pathPositions.length; i++) {
    const dx = pathPositions[i][0] - pathPositions[i - 1][0];
    const dz = pathPositions[i][1] - pathPositions[i - 1][1];
    cumDist.push(cumDist[i - 1] + Math.sqrt(dx * dx + dz * dz));
  }

  const signOffset = PATH_HALF_WIDTH + 1.5;

  for (let km = 1; km <= 4; km++) {
    const targetDist = km * 1000;
    if (targetDist >= cumDist[cumDist.length - 1]) break;

    let segIdx = 0;
    for (let i = 1; i < cumDist.length; i++) {
      if (cumDist[i] >= targetDist) {
        segIdx = i - 1;
        break;
      }
    }

    const segLen = cumDist[segIdx + 1] - cumDist[segIdx];
    const t = segLen > 0 ? (targetDist - cumDist[segIdx]) / segLen : 0;
    const [ax, az] = pathPositions[segIdx];
    const [bx, bz] = pathPositions[segIdx + 1];
    const cx = ax + t * (bx - ax);
    const cz = az + t * (bz - az);

    const dx = bx - ax;
    const dz = bz - az;
    const yaw = Math.atan2(dx, dz);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const side = km % 2 === 1 ? 1 : -1;
    const signX = cx + rightX * signOffset * side;
    const signZ = cz + rightZ * signOffset * side;
    const signY = getGroundY(signX, signZ);

    const kmSignRoot = createKmSign(scene, km, signX, signZ, signY, yaw);
    const kmPivot = new TransformNode(`kmSignPivot_${km}`, scene);
    kmPivot.position.set(signX, signY, signZ);
    kmSignRoot.parent = kmPivot;
    kmSignRoot.position.set(0, 0, 0);
    const kmElasticIdx = result.elasticObjects.length;
    result.elasticObjects.push({ root: kmPivot, tiltX: 0, tiltZ: 0, tiltVelX: 0, tiltVelZ: 0 });
    result.solidObstacles.push({ x: signX, z: signZ, radius: 0.5, elasticIndex: kmElasticIdx });
  }

  return result;
}

// ---------- Gates / Checkpoints ----------

export interface GatePosition {
  x: number;
  z: number;
  y: number;
  pathDist: number;
  yaw: number;
}

/**
 * Generate checkpoint gates every GATE_SPACING metres along the path.
 */
export function buildGates(
  pathPositions: [number, number][],
  pathCumDist: number[],
  getGroundY: (x: number, z: number) => number,
): GatePosition[] {
  if (pathPositions.length < 2) return [];
  const gates: GatePosition[] = [];

  const totalDist = pathCumDist[pathCumDist.length - 1];

  for (let dist = GATE_SPACING; dist < totalDist; dist += GATE_SPACING) {
    let segIdx = 0;
    for (let i = 1; i < pathCumDist.length; i++) {
      if (pathCumDist[i] >= dist) {
        segIdx = i - 1;
        break;
      }
    }

    const segLen = pathCumDist[segIdx + 1] - pathCumDist[segIdx];
    const t = segLen > 0 ? (dist - pathCumDist[segIdx]) / segLen : 0;
    const [ax, az] = pathPositions[segIdx];
    const [bx, bz] = pathPositions[segIdx + 1];
    const x = ax + t * (bx - ax);
    const z = az + t * (bz - az);
    const y = getGroundY(x, z);
    const yaw = Math.atan2(bx - ax, bz - az);

    gates.push({ x, z, y, pathDist: dist, yaw });
  }

  return gates;
}

/**
 * Check if the player has passed through the current gate.
 * Returns the new gate index.
 */
export function checkGatePass(
  gates: GatePosition[],
  currentGateIdx: number,
  playerX: number,
  playerZ: number,
): number {
  if (currentGateIdx >= gates.length) return currentGateIdx;

  const gate = gates[currentGateIdx];
  const dx = playerX - gate.x;
  const dz = playerZ - gate.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < GATE_RADIUS) {
    return currentGateIdx + 1;
  }
  return currentGateIdx;
}

// ---------- Marshals ----------

/**
 * Spawn course marshals at GPS positions defined in the level data.
 */
export function spawnMarshals(
  scene: Scene,
  level: LevelData,
  pathPositions: [number, number][],
  originCoord: number[],
  scaleFactor: number,
  getGroundY: (x: number, z: number) => number,
): { marshals: Marshal[] } & PhysicsObjectResult {
  const result: { marshals: Marshal[] } & PhysicsObjectResult = {
    marshals: [],
    elasticObjects: [],
    solidObstacles: [],
  };
  if (!level.marshals || level.marshals.length === 0) return result;

  const MARSHAL_PATH_OFFSET = PATH_HALF_WIDTH + 1.5;
  const INWARD_ANGLE = (30 * Math.PI) / 180;

  for (let i = 0; i < level.marshals.length; i++) {
    const [lat, lon] = level.marshals[i];
    const [rawX, rawZ] = gpsPointToLocal(lon, lat, originCoord);
    const lx = rawX * scaleFactor;
    const lz = rawZ * scaleFactor;

    let bestDist = Infinity;
    let bestIdx = 0;
    for (let j = 0; j < pathPositions.length - 1; j++) {
      const [px, pz] = pathPositions[j];
      const dx = px - lx;
      const dz = pz - lz;
      const dist = dx * dx + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }

    const [px, pz] = pathPositions[bestIdx];
    const [nx, nz] = pathPositions[bestIdx + 1];

    const segDx = nx - px;
    const segDz = nz - pz;
    const segLen = Math.sqrt(segDx * segDx + segDz * segDz) || 1;

    const perpX = -segDz / segLen;
    const perpZ = segDx / segLen;

    const toMarshalX = lx - px;
    const toMarshalZ = lz - pz;
    const side = perpX * toMarshalX + perpZ * toMarshalZ > 0 ? 1 : -1;

    const along = (toMarshalX * segDx + toMarshalZ * segDz) / (segLen * segLen);
    const clampedAlong = Math.max(0, Math.min(1, along));
    const baseX = px + segDx * clampedAlong + perpX * side * MARSHAL_PATH_OFFSET;
    const baseZ = pz + segDz * clampedAlong + perpZ * side * MARSHAL_PATH_OFFSET;
    const y = getGroundY(baseX, baseZ);

    const model = createMarshalModel(scene, i);
    model.root.position = new Vector3(0, 0, 0);

    const marshalPivot = new TransformNode(`marshalPivot_${i}`, scene);
    marshalPivot.position.set(baseX, y, baseZ);
    model.root.parent = marshalPivot;

    const runnerTravelYaw = Math.atan2(segDx, segDz);
    const facingOncoming = runnerTravelYaw + Math.PI;
    model.root.rotation.y = facingOncoming + side * INWARD_ANGLE;

    const marshalElasticIdx = result.elasticObjects.length;
    result.elasticObjects.push({ root: marshalPivot, tiltX: 0, tiltZ: 0, tiltVelX: 0, tiltVelZ: 0 });
    result.solidObstacles.push({ x: baseX, z: baseZ, radius: 0.6, elasticIndex: marshalElasticIdx });

    result.marshals.push({
      model,
      animPhase: Math.random() * Math.PI * 2,
    });
  }

  return result;
}

export function updateMarshals(marshals: Marshal[], dt: number) {
  for (const marshal of marshals) {
    marshal.animPhase += dt;
    poseCheering(marshal.model, marshal.animPhase);
  }
}

// ---------- Event-specific landmarks ----------

export interface LandmarkResult extends PhysicsObjectResult {
  buildingFootprints: BuildingFootprint[];
}

/**
 * Place real-world landmarks that exist near specific parkrun courses.
 */
export function placeEventLandmarks(
  scene: Scene,
  eventId: string,
  originCoord: number[],
  scaleFactor: number,
  getGroundY: (x: number, z: number) => number,
): LandmarkResult {
  const result: LandmarkResult = {
    elasticObjects: [],
    solidObstacles: [],
    buildingFootprints: [],
  };

  if (eventId === 'haga') {
    // The Copper Tent (Koppartältet)
    const [x1, z1] = gpsPointToLocal(18.030139, 59.364515, originCoord);
    const [x2, z2] = gpsPointToLocal(18.030857, 59.364715, originCoord);
    const lx1 = x1 * scaleFactor;
    const lz1 = z1 * scaleFactor;
    const lx2 = x2 * scaleFactor;
    const lz2 = z2 * scaleFactor;
    const tentY = getGroundY((lx1 + lx2) / 2, (lz1 + lz2) / 2);
    createCopperTent(scene, lx1, lz1, lx2, lz2, tentY);

    const tentCx = (lx1 + lx2) / 2;
    const tentCz = (lz1 + lz2) / 2;
    const tentLength = Math.sqrt((lx2 - lx1) ** 2 + (lz2 - lz1) ** 2);
    result.solidObstacles.push({ x: tentCx, z: tentCz, radius: tentLength * 0.45 });

    // Minimap rectangle
    const tentYaw = Math.atan2(lx2 - lx1, lz2 - lz1);
    const tentRightX = Math.cos(tentYaw);
    const tentRightZ = -Math.sin(tentYaw);
    const tentFwdX = Math.sin(tentYaw);
    const tentFwdZ = Math.cos(tentYaw);
    const tentHalfLength = tentLength * 0.5;
    const tentHalfWidth = tentLength * 0.24;
    result.buildingFootprints.push({
      type: 'blue',
      points: [
        [tentCx - tentFwdX * tentHalfLength - tentRightX * tentHalfWidth, tentCz - tentFwdZ * tentHalfLength - tentRightZ * tentHalfWidth],
        [tentCx + tentFwdX * tentHalfLength - tentRightX * tentHalfWidth, tentCz + tentFwdZ * tentHalfLength - tentRightZ * tentHalfWidth],
        [tentCx + tentFwdX * tentHalfLength + tentRightX * tentHalfWidth, tentCz + tentFwdZ * tentHalfLength + tentRightZ * tentHalfWidth],
        [tentCx - tentFwdX * tentHalfLength + tentRightX * tentHalfWidth, tentCz - tentFwdZ * tentHalfLength + tentRightZ * tentHalfWidth],
      ],
    });

    // The Royal Gate
    const [gx1, gz1] = gpsPointToLocal(18.037956, 59.355194, originCoord);
    const [gx2, gz2] = gpsPointToLocal(18.038218, 59.355216, originCoord);
    const glx1 = gx1 * scaleFactor;
    const glz1 = gz1 * scaleFactor;
    const glx2 = gx2 * scaleFactor;
    const glz2 = gz2 * scaleFactor;
    const gateY = getGroundY((glx1 + glx2) / 2, (glz1 + glz2) / 2);
    createHagaGate(scene, glx1, glz1, glx2, glz2, gateY);

    const gateCx = (glx1 + glx2) / 2;
    const gateCz = (glz1 + glz2) / 2;
    const gateSpan = Math.sqrt((glx2 - glx1) ** 2 + (glz2 - glz1) ** 2);
    const gateScale = (gateSpan / 12) * 1.44 * 0.8;
    const gateYaw = Math.atan2(glx2 - glx1, glz2 - glz1) + Math.PI / 2;
    const gateHalfGap = 5.0 * gateScale * 2.25 / 2 + 3.5 * gateScale / 2;
    const pillarRadius = Math.max(3.5, 3.0) * gateScale * 0.6;

    result.solidObstacles.push({
      x: gateCx + Math.sin(gateYaw + Math.PI / 2) * gateHalfGap,
      z: gateCz + Math.cos(gateYaw + Math.PI / 2) * gateHalfGap,
      radius: pillarRadius,
    });
    result.solidObstacles.push({
      x: gateCx - Math.sin(gateYaw + Math.PI / 2) * gateHalfGap,
      z: gateCz - Math.cos(gateYaw + Math.PI / 2) * gateHalfGap,
      radius: pillarRadius,
    });
  }

  return result;
}

// ---------- Start line objects (parkrun sign + marshal) ----------

export interface StartLineObjectsResult extends PhysicsObjectResult {
  marshals: Marshal[];
}

/**
 * Create the objects placed near the start line (parkrun sign + marshal).
 */
export function buildStartLineObjects(
  scene: Scene,
  pathPositions: [number, number][],
  eventId: string,
  getGroundY: (x: number, z: number) => number,
): StartLineObjectsResult {
  const result: StartLineObjectsResult = {
    elasticObjects: [],
    solidObstacles: [],
    marshals: [],
  };

  if (pathPositions.length < 2) return result;

  const [sx, sz] = pathPositions[0];
  const [nx, nz] = pathPositions[1];
  const yaw = Math.atan2(nx - sx, nz - sz);

  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  // Parkrun sign
  const signX = sx + forwardX * 3 + rightX * (PATH_HALF_WIDTH + 1.5);
  const signZ = sz + forwardZ * 3 + rightZ * (PATH_HALF_WIDTH + 1.5);
  const signH = getGroundY(signX, signZ);
  const displayName = eventId.charAt(0).toUpperCase() + eventId.slice(1);
  const parkrunSignRoot = createParkrunSign(scene, signX, signZ, yaw, displayName, signH);
  const parkrunPivot = new TransformNode('parkrunSignPivot', scene);
  parkrunPivot.position.set(signX, signH, signZ);
  parkrunSignRoot.parent = parkrunPivot;
  parkrunSignRoot.position.set(0, 0, 0);
  const parkrunElasticIdx = result.elasticObjects.length;
  result.elasticObjects.push({ root: parkrunPivot, tiltX: 0, tiltZ: 0, tiltVelX: 0, tiltVelZ: 0 });
  result.solidObstacles.push({ x: signX, z: signZ, radius: 1.5, elasticIndex: parkrunElasticIdx });

  // Marshal on the opposite (left) side
  const marshalStartId = 9999;
  const leftX = -rightX;
  const leftZ = -rightZ;
  const smX = sx + forwardX * 3 + leftX * (PATH_HALF_WIDTH + 5);
  const smZ = sz + forwardZ * 3 + leftZ * (PATH_HALF_WIDTH + 5);
  const smY = getGroundY(smX, smZ);
  const startMarshal = createMarshalModel(scene, marshalStartId);
  startMarshal.root.position.set(0, 0, 0);
  const smPivot = new TransformNode('startMarshalPivot', scene);
  smPivot.position.set(smX, smY, smZ);
  startMarshal.root.parent = smPivot;
  const INWARD_ANGLE = (30 * Math.PI) / 180;
  startMarshal.root.rotation.y = yaw + Math.PI + (-1) * INWARD_ANGLE;
  const smElasticIdx = result.elasticObjects.length;
  result.elasticObjects.push({ root: smPivot, tiltX: 0, tiltZ: 0, tiltVelX: 0, tiltVelZ: 0 });
  result.solidObstacles.push({ x: smX, z: smZ, radius: 0.6, elasticIndex: smElasticIdx });
  result.marshals.push({ model: startMarshal, animPhase: Math.random() * Math.PI * 2 });

  return result;
}

// ---------- Elastic object physics ----------

import {
  ELASTIC_SPRING_K,
  ELASTIC_DAMPING,
  ELASTIC_MAX_TILT,
} from '../constants';

export function updateElasticObjects(elasticObjects: ElasticObject[], dt: number) {
  for (const obj of elasticObjects) {
    const forceX = -ELASTIC_SPRING_K * obj.tiltX - ELASTIC_DAMPING * obj.tiltVelX;
    const forceZ = -ELASTIC_SPRING_K * obj.tiltZ - ELASTIC_DAMPING * obj.tiltVelZ;
    obj.tiltVelX += forceX * dt;
    obj.tiltVelZ += forceZ * dt;
    obj.tiltX += obj.tiltVelX * dt;
    obj.tiltZ += obj.tiltVelZ * dt;

    const mag = Math.sqrt(obj.tiltX * obj.tiltX + obj.tiltZ * obj.tiltZ);
    if (mag > ELASTIC_MAX_TILT) {
      const s = ELASTIC_MAX_TILT / mag;
      obj.tiltX *= s;
      obj.tiltZ *= s;
    }

    if (Math.abs(obj.tiltX) < 0.001 && Math.abs(obj.tiltVelX) < 0.001) {
      obj.tiltX = 0;
      obj.tiltVelX = 0;
    }
    if (Math.abs(obj.tiltZ) < 0.001 && Math.abs(obj.tiltVelZ) < 0.001) {
      obj.tiltZ = 0;
      obj.tiltVelZ = 0;
    }

    obj.root.rotation.x = obj.tiltZ;
    obj.root.rotation.z = -obj.tiltX;
  }
}

// ---------- Helpers ----------

function makeColor(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
