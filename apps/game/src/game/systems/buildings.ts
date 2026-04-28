import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  Mesh,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import earcut from 'earcut';
import { createStadiumStand } from '../objects/StadiumStand';
import type { BuildingFootprint, BuildingCollider } from '../types';
import { RENDER_BUILDING_LOD_DISTANCE } from '../constants';

export interface BuildingLodEntry {
  detailedRoot: TransformNode;
  lowDetailRoot: TransformNode;
  x: number;
  z: number;
  swapDistanceSq: number;
  lowDetailActive: boolean;
}

export interface BuildBuildingMeshesResult {
  colliders: BuildingCollider[];
  lodEntries: BuildingLodEntry[];
}

// ---------- Facade template cache (instanced windows / doors) ----------

interface FacadeTemplateSet {
  panel: Mesh;
  frameV: Mesh;
  frameH: Mesh;
  mullionV: Mesh | null;
  mullionH: Mesh | null;
  innerWidth: number;
  innerHeight: number;
  frameThickness: number;
}

type FacadeTemplateCache = Map<string, FacadeTemplateSet>;

function facadeCacheKey(
  outerW: number, outerH: number, frameT: number, depth: number,
  mullions: boolean, frameMatName: string, innerMatName: string,
): string {
  const q = (v: number) => Math.round(v * 50); // quantise to 0.02
  return `${q(outerW)}_${q(outerH)}_${q(frameT)}_${q(depth)}_${mullions ? 1 : 0}_${frameMatName}_${innerMatName}`;
}

function getOrCreateFacadeTemplates(
  cache: FacadeTemplateCache,
  scene: Scene,
  outerWidth: number,
  outerHeight: number,
  depth: number,
  frameThickness: number,
  frameMat: StandardMaterial,
  innerMat: StandardMaterial,
  addMullions: boolean,
): FacadeTemplateSet {
  const key = facadeCacheKey(outerWidth, outerHeight, frameThickness, depth, addMullions, frameMat.name, innerMat.name);
  let set = cache.get(key);
  if (set) return set;

  const innerWidth = Math.max(outerWidth - frameThickness * 2, outerWidth * 0.45);
  const innerHeight = Math.max(outerHeight - frameThickness * 2, outerHeight * 0.45);
  const frameDepth = depth + 0.01;

  const panel = MeshBuilder.CreateBox(`tpl_fp_${key}`, { width: innerWidth, height: innerHeight, depth }, scene);
  panel.material = innerMat;
  panel.isVisible = false;

  const frameV = MeshBuilder.CreateBox(`tpl_fv_${key}`, { width: frameThickness, height: outerHeight, depth: frameDepth }, scene);
  frameV.material = frameMat;
  frameV.isVisible = false;

  const frameH = MeshBuilder.CreateBox(`tpl_fh_${key}`, { width: outerWidth, height: frameThickness, depth: frameDepth }, scene);
  frameH.material = frameMat;
  frameH.isVisible = false;

  let mullionV: Mesh | null = null;
  let mullionH: Mesh | null = null;
  if (addMullions) {
    const mullionW = Math.max(0.06, frameThickness * 0.55);
    mullionV = MeshBuilder.CreateBox(`tpl_mv_${key}`, { width: mullionW, height: innerHeight, depth: frameDepth }, scene);
    mullionV.material = frameMat;
    mullionV.isVisible = false;

    mullionH = MeshBuilder.CreateBox(`tpl_mh_${key}`, { width: innerWidth, height: mullionW, depth: frameDepth }, scene);
    mullionH.material = frameMat;
    mullionH.isVisible = false;
  }

  set = { panel, frameV, frameH, mullionV, mullionH, innerWidth, innerHeight, frameThickness };
  cache.set(key, set);
  return set;
}

// ---------- Building mesh construction ----------

/**
 * Build 3D meshes for all building footprints.
 * Returns an array of BuildingCollider for physics resolution.
 */
export function buildBuildingMeshes(
  scene: Scene,
  footprints: BuildingFootprint[],
  getGroundY: (x: number, z: number) => number,
): BuildBuildingMeshesResult {
  const colliders: BuildingCollider[] = [];
  const lodEntries: BuildingLodEntry[] = [];
  if (footprints.length === 0) return { colliders, lodEntries };

  const DEFAULT_BUILDING_HEIGHT = 10;
  const MIN_BUILDING_HEIGHT = 4.25;
  const MIN_BUILDING_DIM = 4;

  const stoneWallMat = new StandardMaterial('buildingGreyMat', scene);
  stoneWallMat.diffuseColor = new Color3(0.56, 0.56, 0.6);
  stoneWallMat.specularColor = Color3.Black();

  const redWallMat = new StandardMaterial('buildingRedMat', scene);
  redWallMat.diffuseColor = new Color3(0.66, 0.19, 0.14);
  redWallMat.specularColor = Color3.Black();

  const greenWallMat = new StandardMaterial('buildingGreenMat', scene);
  greenWallMat.diffuseColor = new Color3(0.55, 0.62, 0.49);
  greenWallMat.specularColor = Color3.Black();

  const yellowWallMat = new StandardMaterial('buildingYellowMat', scene);
  yellowWallMat.diffuseColor = new Color3(1.0, 0.82, 0.13);
  yellowWallMat.specularColor = Color3.Black();

  const trimWhiteMat = new StandardMaterial('buildingTrimWhiteMat', scene);
  trimWhiteMat.diffuseColor = new Color3(0.96, 0.95, 0.92);
  trimWhiteMat.specularColor = Color3.Black();

  const greyTrimMat = new StandardMaterial('buildingTrimGreyMat', scene);
  greyTrimMat.diffuseColor = new Color3(0.82, 0.82, 0.84);
  greyTrimMat.specularColor = Color3.Black();

  const roofMat = new StandardMaterial('buildingRoofMat', scene);
  roofMat.diffuseColor = new Color3(0.22, 0.22, 0.24);
  roofMat.specularColor = Color3.Black();

  const windowMat = new StandardMaterial('buildingWindowMat', scene);
  windowMat.diffuseColor = new Color3(0.36, 0.48, 0.58);
  windowMat.emissiveColor = new Color3(0.06, 0.08, 0.1);
  windowMat.specularColor = new Color3(0.2, 0.24, 0.3);

  const doorMat = new StandardMaterial('buildingDoorMat', scene);
  doorMat.diffuseColor = new Color3(0.35, 0.22, 0.14);
  doorMat.specularColor = Color3.Black();

  const grooveMat = new StandardMaterial('buildingGrooveMat', scene);
  grooveMat.diffuseColor = new Color3(0.48, 0.13, 0.09);
  grooveMat.specularColor = Color3.Black();

  const greenGrooveMat = new StandardMaterial('buildingGreenGrooveMat', scene);
  greenGrooveMat.diffuseColor = new Color3(0.42, 0.50, 0.36);
  greenGrooveMat.specularColor = Color3.Black();

  const yellowGrooveMat = new StandardMaterial('buildingYellowGrooveMat', scene);
  yellowGrooveMat.diffuseColor = new Color3(0.82, 0.66, 0.08);
  yellowGrooveMat.specularColor = Color3.Black();

  const foundationMat = new StandardMaterial('buildingFoundationMat', scene);
  foundationMat.diffuseColor = new Color3(0.45, 0.45, 0.47);
  foundationMat.specularColor = Color3.Black();

  const chimneyMat = new StandardMaterial('buildingChimneyMat', scene);
  chimneyMat.diffuseColor = new Color3(0.66, 0.43, 0.28);
  chimneyMat.specularColor = Color3.Black();

  const facadeCache: FacadeTemplateCache = new Map();

  for (let i = 0; i < footprints.length; i++) {
    const building = footprints[i];
    const pts = building.points;
    if (pts.length < 3) continue;

    let centroidX = 0;
    let centroidZ = 0;
    for (const [x, z] of pts) {
      centroidX += x;
      centroidZ += z;
    }
    centroidX /= pts.length;
    centroidZ /= pts.length;

    const [x1, z1] = pts[0];
    const [x2, z2] = pts[1] ?? pts[0];
    const yaw = Math.atan2(x2 - x1, z2 - z1);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);

    let minRight = Infinity;
    let maxRight = -Infinity;
    let minFwd = Infinity;
    let maxFwd = -Infinity;

    for (const [x, z] of pts) {
      const relX = x - centroidX;
      const relZ = z - centroidZ;
      const r = relX * rightX + relZ * rightZ;
      const f = relX * fwdX + relZ * fwdZ;
      if (r < minRight) minRight = r;
      if (r > maxRight) maxRight = r;
      if (f < minFwd) minFwd = f;
      if (f > maxFwd) maxFwd = f;
    }

    if (!isFinite(minRight) || !isFinite(maxRight) || !isFinite(minFwd) || !isFinite(maxFwd)) {
      continue;
    }

    const width = Math.max(MIN_BUILDING_DIM, maxRight - minRight);
    const depth = Math.max(MIN_BUILDING_DIM, maxFwd - minFwd);
    const halfWidth = width * 0.5;
    const halfDepth = depth * 0.5;
    const totalHeight = Math.max(MIN_BUILDING_HEIGHT, building.height ?? DEFAULT_BUILDING_HEIGHT);
    const roofHeight = Math.max(1.25, Math.min(totalHeight * 0.32, 3.8));
    const wallHeight = Math.max(2.8, totalHeight - roofHeight);
    const roofOverhang = Math.min(0.45, Math.min(width, depth) * 0.08 + 0.12);
    const isSwedishHouse = building.type === 'red' || building.type === 'green' || building.type === 'yellow';
    const trimMat = isSwedishHouse ? trimWhiteMat : greyTrimMat;
    const wallMat = building.type === 'red' ? redWallMat
      : building.type === 'green' ? greenWallMat
        : building.type === 'yellow' ? yellowWallMat
          : stoneWallMat;

    const centerOffsetRight = (minRight + maxRight) * 0.5;
    const centerOffsetFwd = (minFwd + maxFwd) * 0.5;
    const centerX = centroidX + rightX * centerOffsetRight + fwdX * centerOffsetFwd;
    const centerZ = centroidZ + rightZ * centerOffsetRight + fwdZ * centerOffsetFwd;
    const groundY = getGroundY(centerX, centerZ);

    const root = new TransformNode(`buildingRoot_${i}`, scene);
    root.position.set(centerX, groundY, centerZ);
    root.rotation.y = yaw;

    const lowDetailRoot = new TransformNode(`buildingLowDetailRoot_${i}`, scene);
    lowDetailRoot.position.set(centerX, groundY, centerZ);
    lowDetailRoot.rotation.y = yaw;

    const lowDetailBlock = MeshBuilder.CreateBox(
      `buildingLowDetail_${i}`,
      { width, depth, height: totalHeight },
      scene,
    );
    lowDetailBlock.position.y = totalHeight * 0.5;
    lowDetailBlock.material = wallMat;
    lowDetailBlock.parent = lowDetailRoot;
    lowDetailRoot.setEnabled(false);

    lodEntries.push({
      detailedRoot: root,
      lowDetailRoot,
      x: centerX,
      z: centerZ,
      swapDistanceSq: RENDER_BUILDING_LOD_DISTANCE * RENDER_BUILDING_LOD_DISTANCE,
      lowDetailActive: false,
    });

    // --- Custom model for 'kristineberg' stadium stand ---
    if (building.type === 'kristineberg') {
      createStadiumStand(scene, root, width, depth, groundY);
      colliders.push({ x: centerX, z: centerZ, yaw, halfWidth, halfDepth });
      continue;
    }

    // Compute local polygon points (in root's coordinate frame)
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const localPolyPts: Vector3[] = [];
    for (const [px, pz] of pts) {
      const dx = px - centerX;
      const dz = pz - centerZ;
      const lx = dx * cosYaw - dz * sinYaw;
      const lz = dx * sinYaw + dz * cosYaw;
      localPolyPts.push(new Vector3(lx, 0, lz));
    }

    // Ensure CCW winding so CreatePolygon generates outward-facing walls
    let signedArea2 = 0;
    for (let vi = 0; vi < localPolyPts.length; vi++) {
      const a = localPolyPts[vi];
      const b = localPolyPts[(vi + 1) % localPolyPts.length];
      signedArea2 += a.x * b.z - b.x * a.z;
    }
    if (signedArea2 < 0) {
      localPolyPts.reverse();
    }

    const foundationHeight = Math.min(0.35, wallHeight * 0.09);
    try {
      const foundPts = localPolyPts.map(v => new Vector3(v.x * 1.02, 0, v.z * 1.02));
      const foundation = MeshBuilder.CreatePolygon(
        `buildingFoundation_${i}`,
        { shape: foundPts, depth: foundationHeight },
        scene,
        earcut,
      );
      foundation.position.y = foundationHeight;
      foundation.material = foundationMat;
      foundation.parent = root;
    } catch {
      const foundation = MeshBuilder.CreateBox(
        `buildingFoundation_${i}`,
        { width: width * 1.02, depth: depth * 1.02, height: foundationHeight },
        scene,
      );
      foundation.position.y = foundationHeight * 0.5;
      foundation.material = foundationMat;
      foundation.parent = root;
    }

    try {
      const buildingBody = MeshBuilder.CreatePolygon(
        `building_${i}`,
        { shape: localPolyPts, depth: wallHeight },
        scene,
        earcut,
      );
      buildingBody.position.y = foundationHeight + wallHeight;
      buildingBody.material = wallMat;
      buildingBody.parent = root;
    } catch {
      const buildingBody = MeshBuilder.CreateBox(
        `building_${i}`,
        { width, depth, height: wallHeight },
        scene,
      );
      buildingBody.position.y = foundationHeight + wallHeight * 0.5;
      buildingBody.material = wallMat;
      buildingBody.parent = root;
    }

    // Compute wall segments from polygon edges (in local coords of root)
    const wallSegments: { cx: number; cz: number; span: number; yaw: number; nx: number; nz: number }[] = [];
    for (let vi = 0; vi < localPolyPts.length; vi++) {
      const a = localPolyPts[vi];
      const b = localPolyPts[(vi + 1) % localPolyPts.length];
      const ex = b.x - a.x;
      const ez = b.z - a.z;
      const span = Math.sqrt(ex * ex + ez * ez);
      if (span < 0.5) continue;
      const segYaw = Math.atan2(ex, ez);
      const nnx = ez / span;
      const nnz = -ex / span;
      const midX = (a.x + b.x) * 0.5;
      const midZ = (a.z + b.z) * 0.5;
      wallSegments.push({ cx: midX, cz: midZ, span, yaw: segYaw, nx: nnx, nz: nnz });
    }

    addBuildingRoof(scene, root, i, width, depth, foundationHeight + wallHeight, roofHeight, roofOverhang, roofMat, trimMat, wallMat);
    addBuildingFacadeFeaturesPolygon(
      scene,
      root,
      i,
      wallSegments,
      foundationHeight,
      wallHeight,
      building.type,
      trimMat,
      windowMat,
      doorMat,
      facadeCache,
    );

    if (isSwedishHouse) {
      const activeGrooveMat = building.type === 'green' ? greenGrooveMat
        : building.type === 'yellow' ? yellowGrooveMat
          : grooveMat;
      addSwedishHouseTrimPolygon(scene, root, i, localPolyPts, wallSegments, foundationHeight, wallHeight, width, depth, trimMat, roofMat, chimneyMat, activeGrooveMat);
    }

    colliders.push({
      x: centerX,
      z: centerZ,
      yaw,
      halfWidth,
      halfDepth,
    });
  }

  return { colliders, lodEntries };
}

export function updateBuildingLod(
  lodEntries: BuildingLodEntry[],
  observerX: number,
  observerZ: number,
): void {
  for (const entry of lodEntries) {
    const dx = entry.x - observerX;
    const dz = entry.z - observerZ;
    const useLowDetail = dx * dx + dz * dz > entry.swapDistanceSq;
    if (useLowDetail === entry.lowDetailActive) continue;

    entry.lowDetailActive = useLowDetail;
    entry.detailedRoot.setEnabled(!useLowDetail);
    entry.lowDetailRoot.setEnabled(useLowDetail);
  }
}

// ---------- Roof ----------

function addBuildingRoof(
  scene: Scene,
  root: TransformNode,
  buildingIndex: number,
  width: number,
  depth: number,
  topY: number,
  roofHeight: number,
  roofOverhang: number,
  roofMat: StandardMaterial,
  trimMat: StandardMaterial,
  wallMat: StandardMaterial,
) {
  const roofSpan = width * 0.5 + roofOverhang;
  const roofDepth = depth + roofOverhang * 2;
  const roofThickness = Math.max(0.12, roofHeight * 0.1);
  const slopeLength = Math.sqrt(roofSpan * roofSpan + roofHeight * roofHeight) + roofOverhang;
  const roofPitch = Math.atan2(roofHeight, roofSpan);

  for (const side of [-1, 1]) {
    const roofSide = MeshBuilder.CreateBox(
      `buildingRoof_${buildingIndex}_${side}`,
      {
        width: slopeLength,
        height: roofThickness,
        depth: roofDepth,
      },
      scene,
    );
    roofSide.position.set(side * roofSpan * 0.5, topY + roofHeight * 0.5, 0);
    roofSide.rotation.z = -side * roofPitch;
    roofSide.material = roofMat;
    roofSide.parent = root;

    const fascia = MeshBuilder.CreateBox(
      `buildingRoofFascia_${buildingIndex}_${side}`,
      {
        width: slopeLength,
        height: roofThickness * 0.42,
        depth: 0.08,
      },
      scene,
    );
    fascia.position.set(0, -roofThickness * 0.36, side > 0 ? roofDepth * 0.5 : -roofDepth * 0.5);
    fascia.rotation.x = Math.PI * 0.5;
    fascia.material = trimMat;
    fascia.parent = roofSide;
  }

  const ridge = MeshBuilder.CreateBox(
    `buildingRoofRidge_${buildingIndex}`,
    {
      width: 0.22,
      height: 0.18,
      depth: roofDepth,
    },
    scene,
  );
  ridge.position.set(0, topY + roofHeight + roofThickness * 0.15, 0);
  ridge.material = trimMat;
  ridge.parent = root;

  // Gable triangles — fill the triangular gap between wall top and pitched roof
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  for (const faceSign of [1, -1]) {
    createGableTriangle(
      scene,
      `buildingGable_${buildingIndex}_${faceSign}`,
      halfW, topY, roofHeight, faceSign * halfD,
      wallMat, root,
    );
  }
}

// ---------- Gable triangle ----------

/**
 * Create a double-sided triangular gable mesh at a given Z offset.
 */
function createGableTriangle(
  scene: Scene,
  name: string,
  halfWidth: number,
  topY: number,
  roofHeight: number,
  z: number,
  material: StandardMaterial,
  parent: TransformNode,
) {
  const mesh = new Mesh(name, scene);
  const positions = [
    -halfWidth, topY, z,
     halfWidth, topY, z,
     0, topY + roofHeight, z,
    -halfWidth, topY, z,
     halfWidth, topY, z,
     0, topY + roofHeight, z,
  ];
  const nz = z > 0 ? 1 : -1;
  const normals = [
    0, 0, nz,  0, 0, nz,  0, 0, nz,
    0, 0, -nz, 0, 0, -nz, 0, 0, -nz,
  ];
  const indices = z > 0
    ? [0, 1, 2, 5, 4, 3]
    : [1, 0, 2, 3, 4, 5];
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.normals = normals;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh);
  mesh.material = material;
  mesh.parent = parent;
}

// ---------- Framed facade rect (window / door) ----------

function createFramedFacadeRect(
  scene: Scene,
  parent: TransformNode,
  name: string,
  x: number,
  y: number,
  z: number,
  yaw: number,
  outerWidth: number,
  outerHeight: number,
  depth: number,
  frameThickness: number,
  frameMat: StandardMaterial,
  innerMat: StandardMaterial,
  addMullions: boolean,
  facadeCache: FacadeTemplateCache = new Map(),
) {
  const anchor = new TransformNode(`${name}_anchor`, scene);
  anchor.parent = parent;
  anchor.position.set(x, y, z);
  anchor.rotation.y = yaw;

  const tpl = getOrCreateFacadeTemplates(facadeCache, scene, outerWidth, outerHeight, depth, frameThickness, frameMat, innerMat, addMullions);

  const panel = tpl.panel.createInstance(`${name}_inner`);
  panel.parent = anchor;

  const left = tpl.frameV.createInstance(`${name}_fl`);
  left.position.x = -(tpl.innerWidth + tpl.frameThickness) * 0.5;
  left.parent = anchor;

  const right = tpl.frameV.createInstance(`${name}_fr`);
  right.position.x = (tpl.innerWidth + tpl.frameThickness) * 0.5;
  right.parent = anchor;

  const top = tpl.frameH.createInstance(`${name}_ft`);
  top.position.y = (tpl.innerHeight + tpl.frameThickness) * 0.5;
  top.parent = anchor;

  const bottom = tpl.frameH.createInstance(`${name}_fb`);
  bottom.position.y = -(tpl.innerHeight + tpl.frameThickness) * 0.5;
  bottom.parent = anchor;

  if (tpl.mullionV) {
    const mv = tpl.mullionV.createInstance(`${name}_mv`);
    mv.parent = anchor;
  }
  if (tpl.mullionH) {
    const mh = tpl.mullionH.createInstance(`${name}_mh`);
    mh.parent = anchor;
  }
}

// ---------- Windows on a wall segment ----------

function addWindowsOnWall(
  scene: Scene,
  root: TransformNode,
  name: string,
  wall: { cx: number; cz: number; span: number; yaw: number; nx: number; nz: number },
  facadeOffset: number,
  rowYs: number[],
  avoidDoor: boolean,
  doorWidth: number,
  trimMat: StandardMaterial,
  windowMat: StandardMaterial,
  facadeCache: FacadeTemplateCache,
) {
  const span = wall.span;
  const count = span >= 15 ? 4 : span >= 9 ? 3 : span >= 5.5 ? 2 : 1;
  const margin = Math.min(1.25, span * 0.16);
  const usableSpan = Math.max(1.8, span - margin * 2);
  const spacing = count === 1 ? 0 : usableSpan / (count - 1);
  const windowOuterW = Math.max(0.9, Math.min(1.5, usableSpan / Math.max(2.8, count + 1)));
  const windowOuterH = Math.max(1.2, Math.min(2.0, windowOuterW * 1.35));
  const doorBlockHalf = doorWidth * 0.75;
  const faceYaw = Math.atan2(wall.nx, wall.nz);

  // Tangent along the wall (normalised edge direction)
  const tx = Math.sin(wall.yaw);
  const tz = Math.cos(wall.yaw);

  for (let rowIdx = 0; rowIdx < rowYs.length; rowIdx++) {
    for (let col = 0; col < count; col++) {
      const along = count === 1 ? 0 : -usableSpan * 0.5 + spacing * col;
      if (avoidDoor && rowIdx === 0 && Math.abs(along) < doorBlockHalf) continue;

      const posX = wall.cx + along * tx + facadeOffset * wall.nx;
      const posZ = wall.cz + along * tz + facadeOffset * wall.nz;

      createFramedFacadeRect(
        scene,
        root,
        `${name}_${rowIdx}_${col}`,
        posX,
        rowYs[rowIdx],
        posZ,
        faceYaw,
        windowOuterW,
        windowOuterH,
        0.08,
        Math.min(0.14, windowOuterW * 0.12),
        trimMat,
        windowMat,
        true,
        facadeCache,
      );
    }
  }
}

// ---------- Polygon-aware facade features ----------

function addBuildingFacadeFeaturesPolygon(
  scene: Scene,
  root: TransformNode,
  buildingIndex: number,
  wallSegments: { cx: number; cz: number; span: number; yaw: number; nx: number; nz: number }[],
  foundationHeight: number,
  wallHeight: number,
  buildingType: 'grey' | 'red' | 'blue' | 'green' | 'yellow' | 'kristineberg',
  trimMat: StandardMaterial,
  windowMat: StandardMaterial,
  doorMat: StandardMaterial,
  facadeCache: FacadeTemplateCache,
) {
  if (wallSegments.length === 0) return;
  const facadeOffset = 0.08;

  // Pick the longest wall as the "front" for the door
  let frontIdx = 0;
  let maxSpan = 0;
  for (let i = 0; i < wallSegments.length; i++) {
    if (wallSegments[i].span > maxSpan) { maxSpan = wallSegments[i].span; frontIdx = i; }
  }
  const frontWall = wallSegments[frontIdx];

  const frontDoorW = Math.max(0.95, Math.min(1.3, frontWall.span * 0.17));
  const frontDoorH = Math.max(1.95, Math.min(2.5, wallHeight * 0.45));
  const frontDoorY = foundationHeight + frontDoorH * 0.5;
  const frontFaceYaw = Math.atan2(frontWall.nx, frontWall.nz);

  // Door at centre of front wall
  createFramedFacadeRect(
    scene,
    root,
    `buildingDoor_${buildingIndex}`,
    frontWall.cx + facadeOffset * frontWall.nx,
    frontDoorY,
    frontWall.cz + facadeOffset * frontWall.nz,
    frontFaceYaw,
    frontDoorW,
    frontDoorH,
    0.1,
    Math.min(0.14, frontDoorW * 0.14),
    trimMat,
    doorMat,
    false,
    facadeCache,
  );

  // Window rows
  const rows = wallHeight > 5.2
    ? [foundationHeight + wallHeight * 0.38, foundationHeight + wallHeight * 0.72]
    : [foundationHeight + wallHeight * 0.5];

  // Windows on every wall that is wide enough
  for (let wi = 0; wi < wallSegments.length; wi++) {
    const wall = wallSegments[wi];
    if (wall.span < 2.5) continue;
    const isFront = wi === frontIdx;
    addWindowsOnWall(
      scene,
      root,
      `buildingWallWin_${buildingIndex}_${wi}`,
      wall,
      facadeOffset,
      rows,
      isFront,
      isFront ? frontDoorW : 0,
      trimMat,
      windowMat,
      facadeCache,
    );
  }

  // Doorstep for Swedish houses
  if (buildingType === 'red' || buildingType === 'green' || buildingType === 'yellow') {
    const stepW = Math.max(0.7, Math.min(1.2, frontDoorW * 0.95));
    const step = MeshBuilder.CreateBox(
      `buildingStep_${buildingIndex}`,
      { width: stepW, height: 0.16, depth: 0.55 },
      scene,
    );
    step.position.set(
      frontWall.cx + 0.28 * frontWall.nx,
      foundationHeight + 0.08,
      frontWall.cz + 0.28 * frontWall.nz,
    );
    step.rotation.y = frontFaceYaw;
    step.material = trimMat;
    step.parent = root;
  }
}

// ---------- Windows on axis-aligned face (legacy helper) ----------

function addWindowsOnFace(
  scene: Scene,
  root: TransformNode,
  name: string,
  facadeSpan: number,
  faceOffset: number,
  rowYs: number[],
  faceYaw: number,
  avoidDoor: boolean,
  doorWidth: number,
  trimMat: StandardMaterial,
  windowMat: StandardMaterial,
) {
  const count = facadeSpan >= 15 ? 4 : facadeSpan >= 9 ? 3 : facadeSpan >= 5.5 ? 2 : 1;
  const margin = Math.min(1.25, facadeSpan * 0.16);
  const usableSpan = Math.max(1.8, facadeSpan - margin * 2);
  const spacing = count === 1 ? 0 : usableSpan / (count - 1);
  const windowOuterW = Math.max(0.9, Math.min(1.5, usableSpan / Math.max(2.8, count + 1)));
  const windowOuterH = Math.max(1.2, Math.min(2.0, windowOuterW * 1.35));
  const doorBlockHalf = doorWidth * 0.75;

  for (let rowIdx = 0; rowIdx < rowYs.length; rowIdx++) {
    for (let col = 0; col < count; col++) {
      const along = count === 1 ? 0 : -usableSpan * 0.5 + spacing * col;
      if (avoidDoor && rowIdx === 0 && Math.abs(along) < doorBlockHalf) continue;

      const isSideFace = Math.abs(Math.abs(faceYaw) - Math.PI * 0.5) < 0.001;
      const posX = isSideFace ? faceOffset : along;
      const posZ = isSideFace ? along : faceOffset;
      createFramedFacadeRect(
        scene,
        root,
        `${name}_${rowIdx}_${col}`,
        posX,
        rowYs[rowIdx],
        posZ,
        faceYaw,
        windowOuterW,
        windowOuterH,
        0.08,
        Math.min(0.14, windowOuterW * 0.12),
        trimMat,
        windowMat,
        true,
      );
    }
  }
}

// ---------- Axis-aligned facade features (legacy helper) ----------

export function addBuildingFacadeFeatures(
  scene: Scene,
  root: TransformNode,
  buildingIndex: number,
  width: number,
  depth: number,
  foundationHeight: number,
  wallHeight: number,
  buildingType: 'grey' | 'red' | 'blue' | 'green' | 'yellow' | 'kristineberg',
  trimMat: StandardMaterial,
  windowMat: StandardMaterial,
  doorMat: StandardMaterial,
) {
  const facadeOffset = 0.08;
  const frontDoorW = Math.max(0.95, Math.min(1.3, width * 0.17));
  const frontDoorH = Math.max(1.95, Math.min(2.5, wallHeight * 0.45));
  const frontDoorY = foundationHeight + frontDoorH * 0.5;
  createFramedFacadeRect(
    scene,
    root,
    `buildingDoor_${buildingIndex}`,
    0,
    frontDoorY,
    depth * 0.5 + facadeOffset,
    0,
    frontDoorW,
    frontDoorH,
    0.1,
    Math.min(0.14, frontDoorW * 0.14),
    trimMat,
    doorMat,
    false,
  );

  const frontBackRows = wallHeight > 5.2
    ? [foundationHeight + wallHeight * 0.38, foundationHeight + wallHeight * 0.72]
    : [foundationHeight + wallHeight * 0.5];
  const sideRows = wallHeight > 5.2
    ? [foundationHeight + wallHeight * 0.42, foundationHeight + wallHeight * 0.72]
    : [foundationHeight + wallHeight * 0.52];

  addWindowsOnFace(scene, root, `buildingFrontWindows_${buildingIndex}`, width, depth * 0.5 + facadeOffset, frontBackRows, 0, true, frontDoorW, trimMat, windowMat);
  addWindowsOnFace(scene, root, `buildingBackWindows_${buildingIndex}`, width, -(depth * 0.5 + facadeOffset), frontBackRows, Math.PI, false, 0, trimMat, windowMat);
  addWindowsOnFace(scene, root, `buildingLeftWindows_${buildingIndex}`, depth, -(width * 0.5 + facadeOffset), sideRows, -Math.PI * 0.5, false, 0, trimMat, windowMat);
  addWindowsOnFace(scene, root, `buildingRightWindows_${buildingIndex}`, depth, width * 0.5 + facadeOffset, sideRows, Math.PI * 0.5, false, 0, trimMat, windowMat);

  if (buildingType === 'red' || buildingType === 'green' || buildingType === 'yellow') {
    const stepW = Math.max(0.7, Math.min(1.2, frontDoorW * 0.95));
    const step = MeshBuilder.CreateBox(
      `buildingStep_${buildingIndex}`,
      { width: stepW, height: 0.16, depth: 0.55 },
      scene,
    );
    step.position.set(0, foundationHeight + 0.08, depth * 0.5 + 0.28);
    step.material = trimMat;
    step.parent = root;
  }
}

// ---------- Swedish house trim (polygon-aware) ----------

function addSwedishHouseTrimPolygon(
  scene: Scene,
  root: TransformNode,
  buildingIndex: number,
  localPolyPts: Vector3[],
  wallSegments: { cx: number; cz: number; span: number; yaw: number; nx: number; nz: number }[],
  foundationHeight: number,
  wallHeight: number,
  width: number,
  depth: number,
  trimMat: StandardMaterial,
  roofMat: StandardMaterial,
  chimneyMat: StandardMaterial,
  grooveMat: StandardMaterial,
) {
  const board = Math.max(0.14, Math.min(0.22, Math.min(width, depth) * 0.03));
  const topY = foundationHeight + wallHeight * 0.5;

  // Corner post at every polygon vertex
  for (let vi = 0; vi < localPolyPts.length; vi++) {
    const pt = localPolyPts[vi];
    const corner = MeshBuilder.CreateBox(
      `buildingCornerTrim_${buildingIndex}_${vi}`,
      { width: board, height: wallHeight, depth: board },
      scene,
    );
    corner.position.set(pt.x, topY, pt.z);
    corner.material = trimMat;
    corner.parent = root;
  }

  // Horizontal timber plank grooves on every wall
  const grooveHeight = 0.04;
  const grooveInset = 0.02;
  const plankSpacing = Math.max(0.35, Math.min(0.55, wallHeight / 12));
  const grooveStartY = foundationHeight + plankSpacing;
  const grooveEndY = foundationHeight + wallHeight - plankSpacing * 0.4;
  for (let wi = 0; wi < wallSegments.length; wi++) {
    const wall = wallSegments[wi];
    const grooveSpan = wall.span - board * 1.8;
    if (grooveSpan < 0.5) continue;
    const grooveRotY = Math.PI * 0.5 - wall.yaw;

    for (let gy = grooveStartY; gy <= grooveEndY; gy += plankSpacing) {
      const groove = MeshBuilder.CreateBox(
        `buildingGroove_${buildingIndex}_${wi}_${Math.round(gy * 100)}`,
        { width: grooveSpan, height: grooveHeight, depth: 0.03 },
        scene,
      );
      groove.position.set(
        wall.cx + grooveInset * wall.nx,
        gy,
        wall.cz + grooveInset * wall.nz,
      );
      groove.rotation.y = grooveRotY;
      groove.material = grooveMat;
      groove.parent = root;
    }
  }

  // Chimney
  const chimney = MeshBuilder.CreateBox(
    `buildingChimney_${buildingIndex}`,
    { width: 0.65, depth: 0.65, height: Math.max(1.1, wallHeight * 0.25) },
    scene,
  );
  chimney.position.set(width * 0.12, foundationHeight + wallHeight + Math.max(1.35, wallHeight * 0.45), -depth * 0.12);
  chimney.material = chimneyMat;
  chimney.parent = root;

  const chimneyCap = MeshBuilder.CreateBox(
    `buildingChimneyCap_${buildingIndex}`,
    { width: 0.78, depth: 0.78, height: 0.08 },
    scene,
  );
  chimneyCap.position.set(chimney.position.x, chimney.position.y + Math.max(1.1, wallHeight * 0.25) * 0.5 + 0.1, chimney.position.z);
  chimneyCap.material = roofMat;
  chimneyCap.parent = root;
}

// ---------- Swedish house trim (axis-aligned, legacy) ----------

export function addSwedishHouseTrim(
  scene: Scene,
  root: TransformNode,
  buildingIndex: number,
  width: number,
  depth: number,
  foundationHeight: number,
  wallHeight: number,
  trimMat: StandardMaterial,
  roofMat: StandardMaterial,
  chimneyMat: StandardMaterial,
  grooveMat: StandardMaterial,
) {
  const board = Math.max(0.14, Math.min(0.22, Math.min(width, depth) * 0.03));
  const boardDepth = board * 0.8;
  const topY = foundationHeight + wallHeight * 0.5;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const corner = MeshBuilder.CreateBox(
        `buildingCornerTrim_${buildingIndex}_${sx}_${sz}`,
        { width: board, height: wallHeight, depth: boardDepth },
        scene,
      );
      corner.position.set(sx * (width * 0.5 - board * 0.25), topY, sz * (depth * 0.5 + boardDepth * 0.5));
      corner.material = trimMat;
      corner.parent = root;

      const sideBoard = MeshBuilder.CreateBox(
        `buildingSideTrim_${buildingIndex}_${sx}_${sz}`,
        { width: boardDepth, height: wallHeight, depth: board },
        scene,
      );
      sideBoard.position.set(sx * (width * 0.5 + boardDepth * 0.5), topY, sz * (depth * 0.5 - board * 0.25));
      sideBoard.material = trimMat;
      sideBoard.parent = root;
    }
  }

  // Horizontal timber plank grooves on all four walls
  const grooveHeight = 0.04;
  const grooveInset = 0.02;
  const plankSpacing = Math.max(0.35, Math.min(0.55, wallHeight / 12));
  const grooveStartY = foundationHeight + plankSpacing;
  const grooveEndY = foundationHeight + wallHeight - plankSpacing * 0.4;

  // Front & back walls
  for (const faceSign of [-1, 1]) {
    const faceZ = faceSign * (depth * 0.5 + grooveInset);
    for (let gy = grooveStartY; gy <= grooveEndY; gy += plankSpacing) {
      const groove = MeshBuilder.CreateBox(
        `buildingGrooveFB_${buildingIndex}_${faceSign}_${Math.round(gy * 100)}`,
        { width: width - board * 1.8, height: grooveHeight, depth: 0.03 },
        scene,
      );
      groove.position.set(0, gy, faceZ);
      groove.material = grooveMat;
      groove.parent = root;
    }
  }

  // Left & right walls
  for (const faceSign of [-1, 1]) {
    const faceX = faceSign * (width * 0.5 + grooveInset);
    for (let gy = grooveStartY; gy <= grooveEndY; gy += plankSpacing) {
      const groove = MeshBuilder.CreateBox(
        `buildingGrooveLR_${buildingIndex}_${faceSign}_${Math.round(gy * 100)}`,
        { width: 0.03, height: grooveHeight, depth: depth - board * 1.8 },
        scene,
      );
      groove.position.set(faceX, gy, 0);
      groove.material = grooveMat;
      groove.parent = root;
    }
  }

  const chimney = MeshBuilder.CreateBox(
    `buildingChimney_${buildingIndex}`,
    { width: 0.65, depth: 0.65, height: Math.max(1.1, wallHeight * 0.25) },
    scene,
  );
  chimney.position.set(width * 0.12, foundationHeight + wallHeight + Math.max(1.35, wallHeight * 0.45), -depth * 0.12);
  chimney.material = chimneyMat;
  chimney.parent = root;

  const chimneyCap = MeshBuilder.CreateBox(
    `buildingChimneyCap_${buildingIndex}`,
    { width: 0.78, depth: 0.78, height: 0.08 },
    scene,
  );
  chimneyCap.position.set(chimney.position.x, chimney.position.y + chimney.scaling.y * 0 + Math.max(1.1, wallHeight * 0.25) * 0.5 + 0.1, chimney.position.z);
  chimneyCap.material = roofMat;
  chimneyCap.parent = root;
}

// ---------- Building collision resolution ----------

export function resolveBuildingCollisionAt(
  x: number,
  z: number,
  radius: number,
  collider: BuildingCollider,
): { x: number; z: number } | null {
  const sinYaw = Math.sin(collider.yaw);
  const cosYaw = Math.cos(collider.yaw);
  const relX = x - collider.x;
  const relZ = z - collider.z;

  const localRight = relX * cosYaw - relZ * sinYaw;
  const localFwd = relX * sinYaw + relZ * cosYaw;
  const clampedRight = Math.max(-collider.halfWidth, Math.min(collider.halfWidth, localRight));
  const clampedFwd = Math.max(-collider.halfDepth, Math.min(collider.halfDepth, localFwd));
  const deltaRight = localRight - clampedRight;
  const deltaFwd = localFwd - clampedFwd;
  const distSq = deltaRight * deltaRight + deltaFwd * deltaFwd;
  const radiusSq = radius * radius;

  if (distSq > 1e-8) {
    if (distSq >= radiusSq) return null;
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    const pushRight = deltaRight / dist;
    const pushFwd = deltaFwd / dist;
    const resolvedRight = localRight + pushRight * push;
    const resolvedFwd = localFwd + pushFwd * push;
    return {
      x: collider.x + resolvedRight * cosYaw + resolvedFwd * sinYaw,
      z: collider.z - resolvedRight * sinYaw + resolvedFwd * cosYaw,
    };
  }

  const overlapRight = collider.halfWidth + radius - Math.abs(localRight);
  const overlapFwd = collider.halfDepth + radius - Math.abs(localFwd);
  if (overlapRight <= 0 || overlapFwd <= 0) return null;

  let resolvedRight = localRight;
  let resolvedFwd = localFwd;
  if (overlapRight < overlapFwd) {
    resolvedRight = (localRight >= 0 ? 1 : -1) * (collider.halfWidth + radius);
  } else {
    resolvedFwd = (localFwd >= 0 ? 1 : -1) * (collider.halfDepth + radius);
  }

  return {
    x: collider.x + resolvedRight * cosYaw + resolvedFwd * sinYaw,
    z: collider.z - resolvedRight * sinYaw + resolvedFwd * cosYaw,
  };
}

export function resolvePositionAgainstBuildings(
  pos: Vector3,
  radius: number,
  colliders: BuildingCollider[],
): boolean {
  if (colliders.length === 0) return false;

  let collided = false;
  for (let pass = 0; pass < 3; pass++) {
    let movedThisPass = false;
    for (const collider of colliders) {
      const resolved = resolveBuildingCollisionAt(pos.x, pos.z, radius, collider);
      if (!resolved) continue;
      pos.x = resolved.x;
      pos.z = resolved.z;
      collided = true;
      movedThisPass = true;
    }
    if (!movedThisPass) break;
  }

  return collided;
}
