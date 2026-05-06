import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  DynamicTexture,
  Color3,
  TransformNode,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import { BUS_COLOR_OPTIONS } from '../characters';
import scoopModelUrl from '../../assets/models/scoop.glb?url';
import busModelUrl from '../../assets/models/bus.glb?url';
import wheelModelUrl from '../../assets/models/wheel.glb?url';

// ═══════════════════════════════════════
// Position constants (relative to bus body origin)
// Use /bus.html to edit and export these consts
// ═══════════════════════════════════════
export const SCOOP_POSITION: [number, number, number] = [0, 2.3, 5.2];
export const SCOOP_WIDTH: number = 5;
export const WHEEL_FRONT_LEFT_POSITION: [number, number, number] = [-1.75, 0.8, 3.1];
export const WHEEL_FRONT_RIGHT_POSITION: [number, number, number] = [1.75, 0.8, 3.1];
export const WHEEL_BACK_LEFT_POSITION: [number, number, number] = [-1.75, 0.8, -3.3];
export const WHEEL_BACK_RIGHT_POSITION: [number, number, number] = [1.75, 0.8, -3.3];
export const LIGHT_FRONT_POSITION: [number, number, number] = [0, 1.2, 7.3];
export const LIGHT_BACK_LEFT_POSITION: [number, number, number] = [-1.5, 1.2, -5];
export const LIGHT_BACK_RIGHT_POSITION: [number, number, number] = [1.5, 1.2, -5];
export const PASSENGER_TRAY_POSITION: [number, number, number] = [0, 4.05, -0.7];
export const PASSENGER_TRAY_SIZE: [number, number] = [2.2, 7.5];
// Wheel roll speed in radians per unit of bus speed
export const WHEEL_ROLL_SPEED = 1;

export interface BusModelResult {
  root: TransformNode;
  /** Everything except wheels — animate position.y for engine vibration. */
  bodyShell: TransformNode;
  scoopPivot: TransformNode;
  frontWheelLeft: TransformNode;
  frontWheelRight: TransformNode;
}

/**
 * Build a 3D school bus model from GLB models, styled after the
 * Scoop Bus Run Club pixel-art bus.
 *
 * Returns a root TransformNode and a scoopPivot that can be rotated
 * around X to animate the scoop flicking up.
 * The bus faces +Z. Height base is at y=0.
 * Uses the loaded bus.glb and wheel.glb models from assets.
 */
export async function createBusModel(scene: Scene): Promise<BusModelResult> {
  const root = new TransformNode('bus', scene);

  // Start disabled so partially-built meshes don't render while
  // assets are loading asynchronously. Callers re-enable
  // the root once the model is fully set up.
  root.setEnabled(false);

  // Shell node for everything above the wheels — animated for engine vibration
  const bodyShell = new TransformNode('busBodyShell', scene);
  bodyShell.parent = root;

  // ═══════════════════════════════════════
  // Target dimensions (keeping same as original)
  // ═══════════════════════════════════════
  const bodyW = 2.4 * 1.2;  // width — increased 20% for passengers (2.88)
  const bodyH = 3;        // height of main body
  const bodyL = 15;        // length — extended from 7.0
  const floorY = 0.4;       // bottom of body above ground
  const roofH = 0.3;        // roof cap height
  const totalBusHeight = floorY + bodyH + roofH;
  const hoodL = 1.2;        // hood/engine section in front

  // ═══════════════════════════════════════
  // Load main bus from GLB and scale to dimensions
  // ═══════════════════════════════════════
  const busResult = await SceneLoader.ImportMeshAsync('', '', busModelUrl, scene);
  const busRoot = new TransformNode('busGlbRoot', scene);
  busRoot.parent = bodyShell;

  // Measure the bounding box to determine scale
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const mesh of busResult.meshes) {
    if (mesh.isAnInstance || !mesh.getBoundingInfo) continue;
    const bi = (mesh as any).refreshBoundingInfo();
    const bounds = mesh.getBoundingInfo().boundingBox;
    const worldMin = bounds.minimumWorld;
    const worldMax = bounds.maximumWorld;
    if (worldMin.x < minX) minX = worldMin.x;
    if (worldMax.x > maxX) maxX = worldMax.x;
    if (worldMin.y < minY) minY = worldMin.y;
    if (worldMax.y > maxY) maxY = worldMax.y;
    if (worldMin.z < minZ) minZ = worldMin.z;
    if (worldMax.z > maxZ) maxZ = worldMax.z;
  }

  const rawWidth = maxX - minX || 1;
  const rawHeight = maxY - minY || 1;
  const rawLength = maxZ - minZ || 1;

  // Scale to match target dimensions, prioritizing height consistency
  const scaleHeight = totalBusHeight / rawHeight;
  const scaleWidth = bodyW / rawWidth;
  const scaleLength = bodyL / rawLength;
  // Use average scale to maintain proportions
  const avgScale = (scaleHeight + scaleWidth + scaleLength) / 3;

  // Parent all loaded meshes and apply scale
  for (const mesh of busResult.meshes) {
    if (!mesh.parent) {
      mesh.parent = busRoot;
    }
  }
  for (const tn of busResult.transformNodes) {
    if (!tn.parent) {
      tn.parent = busRoot;
    }
  }
  busRoot.scaling.setAll(avgScale);

  // Center the bus model and position it
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  busRoot.position.x = -centerX * avgScale;
  busRoot.position.y = -minY * avgScale + floorY;
  busRoot.position.z = -centerZ * avgScale;

  // ═══════════════════════════════════════
  // Wheels from GLB models
  // ═══════════════════════════════════════
  const wheelR = 0.8;  // increased from 0.45 for better proportion
  const wheelPositions: [number, number, number][] = [
    WHEEL_FRONT_RIGHT_POSITION,
    WHEEL_FRONT_LEFT_POSITION,
    WHEEL_BACK_RIGHT_POSITION,
    WHEEL_BACK_LEFT_POSITION,
  ];

  // Front wheels get their own pivot nodes so they can steer (rotate around Y)
  const frontWheelRight = new TransformNode('frontWheelRight', scene);
  frontWheelRight.position = new Vector3(...WHEEL_FRONT_RIGHT_POSITION);
  frontWheelRight.parent = root;

  const frontWheelLeft = new TransformNode('frontWheelLeft', scene);
  frontWheelLeft.position = new Vector3(...WHEEL_FRONT_LEFT_POSITION);
  frontWheelLeft.parent = root;

  const frontPivots = [frontWheelRight, frontWheelLeft];

  // Load wheel models
  for (let i = 0; i < wheelPositions.length; i++) {
    const [wx, wy, wz] = wheelPositions[i];
    const isFront = i < 2;

    const wheelResult = await SceneLoader.ImportMeshAsync('', '', wheelModelUrl, scene);

    // Measure wheel model to scale appropriately
    let wheelMinX = Infinity, wheelMaxX = -Infinity;
    let wheelMinY = Infinity, wheelMaxY = -Infinity;
    let wheelMinZ = Infinity, wheelMaxZ = -Infinity;

    for (const mesh of wheelResult.meshes) {
      if (mesh.isAnInstance || !mesh.getBoundingInfo) continue;
      const bi = (mesh as any).refreshBoundingInfo();
      const bounds = mesh.getBoundingInfo().boundingBox;
      const worldMin = bounds.minimumWorld;
      const worldMax = bounds.maximumWorld;
      if (worldMin.x < wheelMinX) wheelMinX = worldMin.x;
      if (worldMax.x > wheelMaxX) wheelMaxX = worldMax.x;
      if (worldMin.y < wheelMinY) wheelMinY = worldMin.y;
      if (worldMax.y > wheelMaxY) wheelMaxY = worldMax.y;
      if (worldMin.z < wheelMinZ) wheelMinZ = worldMin.z;
      if (worldMax.z > wheelMaxZ) wheelMaxZ = worldMax.z;
    }

    // Determine the largest dimension to use for scaling (maintains aspect ratio)
    const wheelWidth = wheelMaxX - wheelMinX || 1;
    const wheelHeight = wheelMaxY - wheelMinY || 1;
    const wheelDepth = wheelMaxZ - wheelMinZ || 1;
    
    // Use the largest dimension as reference for scaling to correct size
    const wheelLargestDim = Math.max(wheelWidth, wheelHeight, wheelDepth);
    const wheelScale = (wheelR * 2) / wheelLargestDim;

    const wheelRoot = new TransformNode(`wheelGlbRoot_${i}`, scene);

    // Parent and scale wheel meshes
    for (const mesh of wheelResult.meshes) {
      if (!mesh.parent) {
        mesh.parent = wheelRoot;
      }
    }
    for (const tn of wheelResult.transformNodes) {
      if (!tn.parent) {
        tn.parent = wheelRoot;
      }
    }

    wheelRoot.scaling.setAll(wheelScale);

    // Center the wheel model at origin (so it rotates around its center)
    const wheelCenterX = (wheelMinX + wheelMaxX) / 2;
    const wheelCenterY = (wheelMinY + wheelMaxY) / 2;
    const wheelCenterZ = (wheelMinZ + wheelMaxZ) / 2;
    wheelRoot.position.x = -wheelCenterX * wheelScale;
    wheelRoot.position.y = -wheelCenterY * wheelScale;
    wheelRoot.position.z = -wheelCenterZ * wheelScale;

    // Right-side wheels (index 0 = front-right, index 2 = rear-right) face outward
    const isRightSide = i === 0 || i === 2;
    if (isRightSide) {
      wheelRoot.rotation.y = Math.PI;
    }

    if (isFront) {
      // Parent to front pivot (which is positioned at the correct wheel location)
      // The wheel stays centered around the pivot for proper rotation
      wheelRoot.parent = frontPivots[i];
    } else {
      // Create intermediate pivot for rear wheels at the exact wheel position
      const rearWheelPivot = new TransformNode(`rearWheelPivot_${i}`, scene);
      rearWheelPivot.position = new Vector3(wx, wy, wz);
      rearWheelPivot.parent = root;
      // Parent the centered wheel to this pivot
      wheelRoot.parent = rearWheelPivot;
    }
  }

  // ═══════════════════════════════════════
  // SCOOP / PLOW — loaded from GLB model
  // ═══════════════════════════════════════
  const scoopTargetW = SCOOP_WIDTH;

  // Pivot at bus front, ground level — animation rotates/translates from here
  const scoopPivot = new TransformNode('scoopPivot', scene);
  scoopPivot.position = new Vector3(...SCOOP_POSITION);
  scoopPivot.parent = bodyShell;

  // Load GLB model
  const scoopResult = await SceneLoader.ImportMeshAsync('', '', scoopModelUrl, scene);
  const scoopRoot = new TransformNode('scoopGlbRoot', scene);
  scoopRoot.parent = scoopPivot;

  // Measure the raw bounding extent to compute the scale factor
  let scoopMinX = Infinity, scoopMaxX = -Infinity;
  let scoopMinY = Infinity, scoopMaxY = -Infinity;
  let scoopMinZ = Infinity, scoopMaxZ = -Infinity;
  for (const mesh of scoopResult.meshes) {
    if (mesh.isAnInstance || !mesh.getBoundingInfo) continue;
    const bi = (mesh as any).refreshBoundingInfo();
    const bounds = mesh.getBoundingInfo().boundingBox;
    const worldMin = bounds.minimumWorld;
    const worldMax = bounds.maximumWorld;
    if (worldMin.x < scoopMinX) scoopMinX = worldMin.x;
    if (worldMax.x > scoopMaxX) scoopMaxX = worldMax.x;
    if (worldMin.y < scoopMinY) scoopMinY = worldMin.y;
    if (worldMax.y > scoopMaxY) scoopMaxY = worldMax.y;
    if (worldMin.z < scoopMinZ) scoopMinZ = worldMin.z;
    if (worldMax.z > scoopMaxZ) scoopMaxZ = worldMax.z;
  }
  const scoopRawWidth = scoopMaxX - scoopMinX || 1;
  const scoopScaleFactor = scoopTargetW / scoopRawWidth;

  // Parent all loaded meshes under the scoop root and apply uniform scale
  for (const mesh of scoopResult.meshes) {
    if (!mesh.parent) {
      mesh.parent = scoopRoot;
    }
  }
  // Also reparent transform nodes (skeletons, empties)
  for (const tn of scoopResult.transformNodes) {
    if (!tn.parent) {
      tn.parent = scoopRoot;
    }
  }
  scoopRoot.scaling.setAll(scoopScaleFactor);

  // Position model so pivot is at the top-back of the scoop
  const scoopCenterX = (scoopMinX + scoopMaxX) / 2;
  const scoopScaledH = (scoopMaxY - scoopMinY) * scoopScaleFactor;
  scoopRoot.position.x = -scoopCenterX * scoopScaleFactor;       // centre left-right
  scoopRoot.position.y = -scoopMaxY * scoopScaleFactor;           // top of scoop at pivot Y
  scoopRoot.position.z = -scoopMinZ * scoopScaleFactor;           // back edge at pivot Z, scoop extends forward

  // Move pivot up so scoop bottom sits near ground level
  scoopPivot.position.y = scoopScaledH;

  return { root, bodyShell, scoopPivot, frontWheelLeft, frontWheelRight };
}

// ── Player color palettes ──

export interface BusColorPalette {
  body: Color3;
  scoop: Color3;
}

/** Colour palettes derived from BUS_COLOR_OPTIONS (single source of truth in characters.ts) */
export const PLAYER_COLORS: BusColorPalette[] = BUS_COLOR_OPTIONS.map((opt) => ({
  body: Color3.FromHexString(opt.bodyHex),
  scoop: Color3.FromHexString(opt.scoopHex),
}));

/**
 * Build a BusColorPalette from a BusColorOption (from the character config).
 */
export function busColorPaletteFromOption(opt: { bodyHex: string; scoopHex?: string }): BusColorPalette {
  return {
    body: Color3.FromHexString(opt.bodyHex),
    scoop: Color3.FromHexString(opt.scoopHex || '#3470d8'),
  };
}

/**
 * Re-tint a bus model's body + roof + scoop to the given palette.
 * Clones the materials so multiple buses can have different colours.
 * Works with both PBR (GLB) and StandardMaterial (legacy primitives).
 */
export function tintBusModel(root: TransformNode, palette: BusColorPalette, suffix: string) {
  // Find scoop meshes (under scoopPivot > scoopGlbRoot)
  const scoopMeshes = new Set<any>();
  const scoopPivotNode = root.getChildren(undefined, false).find(c => c.name === 'busBodyShell');
  if (scoopPivotNode) {
    const scoopPivot = scoopPivotNode.getChildren(undefined, false).find(c => c.name === 'scoopPivot');
    if (scoopPivot) {
      for (const m of (scoopPivot as TransformNode).getChildMeshes()) {
        scoopMeshes.add(m);
      }
    }
  }

  root.getChildMeshes().forEach((m) => {
    if (!m.material) return;

    // Handle scoop meshes first (may be PBR from GLB)
    if (scoopMeshes.has(m)) {
      if (m.material instanceof PBRMaterial || m.material instanceof StandardMaterial) {
        const scene = m.getScene();
        const tinted = new StandardMaterial(m.material.name + '_' + suffix, scene);
        tinted.diffuseColor = palette.scoop.clone();
        tinted.specularColor = new Color3(0.4, 0.4, 0.4);
        tinted.specularPower = 64;
        m.material = tinted;
      }
      return;
    }

    // Handle PBR materials (GLB models) — or StandardMaterial if already tinted once
    const busMaterialsToTint = ['Material.001'];
    const matName = m.material.name;
    const isTargetMaterial = busMaterialsToTint.some(n => matName === n || matName.startsWith(n + '_'));

    if (isTargetMaterial && (m.material instanceof PBRMaterial || m.material instanceof StandardMaterial)) {
      const scene = m.getScene();
      const tinted = new StandardMaterial('Material.001_' + suffix, scene);
      tinted.diffuseColor = palette.body.clone();
      tinted.specularColor = new Color3(0.4, 0.4, 0.4);
      tinted.specularPower = 64;
      m.material = tinted;
      return;
    }
  });
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
