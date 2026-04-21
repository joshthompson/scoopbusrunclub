import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  TransformNode,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import scoopModelUrl from '../../assets/models/scoop.glb?url';

export interface BusModelResult {
  root: TransformNode;
  scoopPivot: TransformNode;
  frontWheelLeft: TransformNode;
  frontWheelRight: TransformNode;
}

/**
 * Build a 3D school bus model from primitives, styled after the
 * Scoop Bus Run Club pixel-art bus (yellow body, blue scoop, windows,
 * "SBRC" on front, "Scoop Bus Run Club" on side).
 *
 * Returns a root TransformNode and a scoopPivot that can be rotated
 * around X to animate the scoop flicking up.
 * The bus faces +Z. Height base is at y=0.
 * Total size ≈ 2.6 wide × 3.2 tall × 8.5 long.
 */
export async function createBusModel(scene: Scene): Promise<BusModelResult> {
  const root = new TransformNode('bus', scene);

  // ═══════════════════════════════════════
  // Materials
  // ═══════════════════════════════════════
  const yellow = makeMat('busYellow', new Color3(0.95, 0.78, 0.15), scene);
  const darkYellow = makeMat('busDarkYellow', new Color3(0.82, 0.65, 0.1), scene);
  const black = makeMat('busBlack', new Color3(0.08, 0.08, 0.08), scene);
  const darkGrey = makeMat('busDarkGrey', new Color3(0.2, 0.2, 0.2), scene);
  const windowBlue = makeMat('busWindow', new Color3(0.15, 0.25, 0.45), scene);
  windowBlue.alpha = 0.85;
  const scoopBlue = makeMat('busScoop', new Color3(0.12, 0.42, 0.72), scene);
  const red = makeMat('busRed', new Color3(0.85, 0.15, 0.1), scene);
  const chrome = makeMat('busChrome', new Color3(0.7, 0.7, 0.72), scene);
  chrome.specularColor = new Color3(1, 1, 1);
  const white = makeMat('busWhite', new Color3(0.95, 0.95, 0.95), scene);

  // ═══════════════════════════════════════
  // Dimensions
  // ═══════════════════════════════════════
  const bodyW = 2.4;    // width
  const bodyH = 2.2;    // height of main body (not including roof or undercarriage)
  const bodyL = 7.0;    // length of the main cabin
  const floorY = 0.9;   // bottom of body above ground
  const roofH = 0.3;    // roof cap height
  const hoodL = 1.2;    // hood/engine section in front

  // ═══════════════════════════════════════
  // Main body (cabin)
  // ═══════════════════════════════════════
  const body = MeshBuilder.CreateBox('busBody', { width: bodyW, height: bodyH, depth: bodyL }, scene);
  body.material = yellow;
  body.position = new Vector3(0, floorY + bodyH / 2, 0);
  body.parent = root;

  // ═══════════════════════════════════════
  // Hood / engine section (slightly lower, in front)
  // ═══════════════════════════════════════
  const hoodH = bodyH * 0.55;
  const hood = MeshBuilder.CreateBox('busHood', { width: bodyW, height: hoodH, depth: hoodL }, scene);
  hood.material = yellow;
  hood.position = new Vector3(0, floorY + hoodH / 2, bodyL / 2 + hoodL / 2);
  hood.parent = root;

  // Grille on front of hood
  const grille = MeshBuilder.CreateBox('busGrille', { width: bodyW * 0.7, height: hoodH * 0.5, depth: 0.06 }, scene);
  grille.material = darkGrey;
  grille.position = new Vector3(0, floorY + hoodH * 0.35, bodyL / 2 + hoodL + 0.02);
  grille.parent = root;

  // ═══════════════════════════════════════
  // Roof
  // ═══════════════════════════════════════
  const roof = MeshBuilder.CreateBox('busRoof', { width: bodyW + 0.1, height: roofH, depth: bodyL + 0.1 }, scene);
  roof.material = darkYellow;
  roof.position = new Vector3(0, floorY + bodyH + roofH / 2, 0);
  roof.parent = root;

  // ═══════════════════════════════════════
  // Undercarriage
  // ═══════════════════════════════════════
  const underH = 0.15;
  const under = MeshBuilder.CreateBox('busUnder', { width: bodyW - 0.2, height: underH, depth: bodyL + hoodL }, scene);
  under.material = black;
  under.position = new Vector3(0, floorY - underH / 2, hoodL / 2);
  under.parent = root;

  // ═══════════════════════════════════════
  // Bumpers (front + back chrome bars)
  // ═══════════════════════════════════════
  const bumperH = 0.2;
  const frontBumper = MeshBuilder.CreateBox('busFBumper', { width: bodyW + 0.15, height: bumperH, depth: 0.15 }, scene);
  frontBumper.material = chrome;
  frontBumper.position = new Vector3(0, floorY - 0.1, bodyL / 2 + hoodL + 0.05);
  frontBumper.parent = root;

  const rearBumper = MeshBuilder.CreateBox('busRBumper', { width: bodyW + 0.15, height: bumperH, depth: 0.15 }, scene);
  rearBumper.material = chrome;
  rearBumper.position = new Vector3(0, floorY - 0.1, -bodyL / 2 - 0.05);
  rearBumper.parent = root;

  // ═══════════════════════════════════════
  // Wheels (4 wheels — 2 front, 2 rear)
  // ═══════════════════════════════════════
  const wheelR = 0.45;
  const wheelW = 0.3;
  const wheelPositions = [
    // [x, z]
    [bodyW / 2 + 0.05, bodyL / 2 + hoodL * 0.6],   // front-right
    [-bodyW / 2 - 0.05, bodyL / 2 + hoodL * 0.6],   // front-left
    [bodyW / 2 + 0.05, -bodyL / 2 + 0.6],            // rear-right
    [-bodyW / 2 - 0.05, -bodyL / 2 + 0.6],            // rear-left
  ];

  // Front wheels get their own pivot nodes so they can steer (rotate around Y)
  const frontWheelRight = new TransformNode('frontWheelRight', scene);
  frontWheelRight.position = new Vector3(wheelPositions[0][0], wheelR, wheelPositions[0][1]);
  frontWheelRight.parent = root;

  const frontWheelLeft = new TransformNode('frontWheelLeft', scene);
  frontWheelLeft.position = new Vector3(wheelPositions[1][0], wheelR, wheelPositions[1][1]);
  frontWheelLeft.parent = root;

  const frontPivots = [frontWheelRight, frontWheelLeft];

  for (let i = 0; i < wheelPositions.length; i++) {
    const [wx, wz] = wheelPositions[i];
    const isFront = i < 2;

    const wheel = MeshBuilder.CreateCylinder(`wheel_${i}`, {
      diameter: wheelR * 2,
      height: wheelW,
      tessellation: 18,
    }, scene);
    wheel.material = black;
    wheel.rotation.z = Math.PI / 2;

    // Hub cap
    const hub = MeshBuilder.CreateCylinder(`hub_${i}`, {
      diameter: wheelR * 0.6,
      height: wheelW + 0.02,
      tessellation: 12,
    }, scene);
    hub.material = darkGrey;
    hub.rotation.z = Math.PI / 2;

    if (isFront) {
      // Parent to the pivot; position at origin since pivot is already placed
      wheel.position = Vector3.Zero();
      wheel.parent = frontPivots[i];
      hub.position = Vector3.Zero();
      hub.parent = frontPivots[i];
    } else {
      wheel.position = new Vector3(wx, wheelR, wz);
      wheel.parent = root;
      hub.position = new Vector3(wx, wheelR, wz);
      hub.parent = root;
    }
  }

  // ═══════════════════════════════════════
  // Windows (side)
  // ═══════════════════════════════════════
  const winH = bodyH * 0.42;
  const winY = floorY + bodyH * 0.65;
  const windowCount = 5;
  const winGap = 0.15;
  const totalWinSpace = bodyL - 0.6; // leave margin at front/back
  const winL = (totalWinSpace - winGap * (windowCount + 1)) / windowCount;

  for (let side = -1; side <= 1; side += 2) { // -1 = left, 1 = right
    for (let i = 0; i < windowCount; i++) {
      const wz = -bodyL / 2 + 0.3 + winGap + i * (winL + winGap) + winL / 2;
      const win = MeshBuilder.CreateBox(`win_${side}_${i}`, {
        width: 0.06,
        height: winH,
        depth: winL,
      }, scene);
      win.material = windowBlue;
      win.position = new Vector3(side * (bodyW / 2 + 0.02), winY, wz);
      win.parent = root;
    }
  }

  // Windshield (front, on the cabin face)
  const windshield = MeshBuilder.CreateBox('windshield', {
    width: bodyW * 0.7,
    height: bodyH * 0.5,
    depth: 0.06,
  }, scene);
  windshield.material = windowBlue;
  windshield.position = new Vector3(0, floorY + bodyH * 0.65, bodyL / 2 + 0.02);
  windshield.parent = root;

  // Rear window
  const rearWin = MeshBuilder.CreateBox('rearWin', {
    width: bodyW * 0.5,
    height: bodyH * 0.35,
    depth: 0.06,
  }, scene);
  rearWin.material = windowBlue;
  rearWin.position = new Vector3(0, floorY + bodyH * 0.65, -bodyL / 2 - 0.02);
  rearWin.parent = root;

  // ═══════════════════════════════════════
  // Headlights (front, on hood)
  // ═══════════════════════════════════════
  for (const side of [-1, 1]) {
    const hl = MeshBuilder.CreateCylinder(`headlight_${side}`, {
      diameter: 0.22,
      height: 0.08,
      tessellation: 12,
    }, scene);
    hl.material = white;
    hl.rotation.x = Math.PI / 2;
    hl.position = new Vector3(side * bodyW * 0.35, floorY + hoodH * 0.6, bodyL / 2 + hoodL + 0.03);
    hl.parent = root;
  }

  // ═══════════════════════════════════════
  // Tail lights (rear, red)
  // ═══════════════════════════════════════
  for (const side of [-1, 1]) {
    const tl = MeshBuilder.CreateBox(`taillight_${side}`, {
      width: 0.2,
      height: 0.15,
      depth: 0.06,
    }, scene);
    tl.material = red;
    tl.position = new Vector3(side * bodyW * 0.38, floorY + 0.3, -bodyL / 2 - 0.02);
    tl.parent = root;
  }

  // ═══════════════════════════════════════
  // STOP sign (left side fold-out, typical school bus)
  // ═══════════════════════════════════════
  const stopSign = MeshBuilder.CreateBox('stopSign', {
    width: 0.02,
    height: 0.35,
    depth: 0.35,
  }, scene);
  stopSign.material = red;
  stopSign.position = new Vector3(-bodyW / 2 - 0.25, floorY + bodyH * 0.75, bodyL / 2 - 0.5);
  stopSign.parent = root;

  // ═══════════════════════════════════════
  // Yellow stripes / trim along sides
  // ═══════════════════════════════════════
  for (const side of [-1, 1]) {
    // Black trim strip below windows
    const strip = MeshBuilder.CreateBox(`strip_${side}`, {
      width: 0.06,
      height: 0.1,
      depth: bodyL - 0.2,
    }, scene);
    strip.material = black;
    strip.position = new Vector3(side * (bodyW / 2 + 0.02), winY - winH / 2 - 0.08, 0);
    strip.parent = root;
  }

  // ═══════════════════════════════════════
  // SCOOP / PLOW — loaded from GLB model
  // ═══════════════════════════════════════
  const scoopTargetW = bodyW + 0.8;   // slightly wider than bus so visible from behind

  // Pivot at bus front, ground level — animation rotates/translates from here
  const scoopPivot = new TransformNode('scoopPivot', scene);
  scoopPivot.position = new Vector3(0, floorY - 0.55, bodyL / 2 + hoodL + 0.8);
  scoopPivot.parent = root;

  // Load GLB model
  const result = await SceneLoader.ImportMeshAsync('', '', scoopModelUrl, scene);
  const scoopRoot = new TransformNode('scoopGlbRoot', scene);
  scoopRoot.parent = scoopPivot;

  // Measure the raw bounding extent to compute the scale factor
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const mesh of result.meshes) {
    if (mesh.isAnInstance || !mesh.getBoundingInfo) continue;
    mesh.refreshBoundingInfo(true);
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
  const scaleFactor = scoopTargetW / rawWidth;

  // Parent all loaded meshes under the scoop root and apply uniform scale
  for (const mesh of result.meshes) {
    if (!mesh.parent || mesh.parent === scene) {
      mesh.parent = scoopRoot;
    }
    // Apply blue scoop material to all sub-meshes
    if (mesh.material) {
      mesh.material = scoopBlue;
    }
  }
  // Also reparent transform nodes (skeletons, empties)
  for (const tn of result.transformNodes) {
    if (!tn.parent || tn.parent === scene) {
      tn.parent = scoopRoot;
    }
  }
  scoopRoot.scaling.setAll(scaleFactor);

  // Position model so pivot is at the top-back of the scoop
  const centerX = (minX + maxX) / 2;
  const scoopScaledH = (maxY - minY) * scaleFactor;
  scoopRoot.position.x = -centerX * scaleFactor;       // centre left-right
  scoopRoot.position.y = -maxY * scaleFactor;           // top of scoop at pivot Y
  scoopRoot.position.z = -minZ * scaleFactor;           // back edge at pivot Z, scoop extends forward

  // Move pivot up so scoop bottom sits near ground level
  scoopPivot.position.y = scoopScaledH;

  // ═══════════════════════════════════════
  // "SBRC" text on front (above grille)
  // ═══════════════════════════════════════
  const frontTexW = 256;
  const frontTexH = 128;
  const frontDynTex = new DynamicTexture('busFrontTex', { width: frontTexW, height: frontTexH }, scene, true);
  const frontCtx = frontDynTex.getContext() as unknown as CanvasRenderingContext2D;
  // Yellow background
  frontCtx.fillStyle = '#f2c824';
  frontCtx.fillRect(0, 0, frontTexW, frontTexH);
  // Black border
  frontCtx.strokeStyle = '#111';
  frontCtx.lineWidth = 4;
  frontCtx.strokeRect(4, 4, frontTexW - 8, frontTexH - 8);
  // "SBRC" text
  frontCtx.fillStyle = '#cc2211';
  frontCtx.font = 'bold 64px Arial';
  frontCtx.textAlign = 'center';
  frontCtx.textBaseline = 'middle';
  frontCtx.fillText('SBRC', frontTexW / 2, frontTexH / 2);
  frontDynTex.update();

  const frontLabel = MeshBuilder.CreatePlane('busFrontLabel', { width: 1.2, height: 0.6 }, scene);
  const frontLabelMat = new StandardMaterial('busFrontLabelMat', scene);
  frontLabelMat.diffuseTexture = frontDynTex;
  frontLabelMat.specularColor = Color3.Black();
  frontLabel.material = frontLabelMat;
  frontLabel.position = new Vector3(0, floorY + hoodH + 0.35, bodyL / 2 + 0.03);
  frontLabel.parent = root;

  // ═══════════════════════════════════════
  // "Scoop Bus Run Club" text on sides
  // ═══════════════════════════════════════
  const sideTexW = 512;
  const sideTexH = 256;

  for (const side of [-1, 1]) {
    const dynTex = new DynamicTexture(`busSideTex_${side}`, { width: sideTexW, height: sideTexH }, scene, true);
    const ctx = dynTex.getContext() as unknown as CanvasRenderingContext2D;
    // Transparent yellow (match body)
    ctx.fillStyle = '#f2c824';
    ctx.fillRect(0, 0, sideTexW, sideTexH);
    // Red brush-style text
    ctx.fillStyle = '#cc2211';
    ctx.font = 'bold 58px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Scoop', sideTexW / 2, 15);
    ctx.fillText('Bus', sideTexW / 2, 80);
    ctx.font = 'bold 46px Arial';
    ctx.fillText('Run Club', sideTexW / 2, 160);
    dynTex.update();

    const sideLabel = MeshBuilder.CreatePlane(`busSideLabel_${side}`, {
      width: bodyL * 0.65,
      height: bodyH * 0.55,
    }, scene);
    const sideMat = new StandardMaterial(`busSideLabelMat_${side}`, scene);
    sideMat.diffuseTexture = dynTex;
    sideMat.specularColor = Color3.Black();
    sideLabel.material = sideMat;
    // Mirror the text for the other side
    if (side === 1) {
      sideLabel.rotation.y = Math.PI / 2; // face right
    } else {
      sideLabel.rotation.y = -Math.PI / 2; // face left
    }
    sideLabel.position = new Vector3(side * (bodyW / 2 + 0.04), floorY + bodyH * 0.42, -0.2);
    sideLabel.parent = root;
  }

  return { root, scoopPivot, frontWheelLeft, frontWheelRight };
}

// ── Player color palettes ──

export interface BusColorPalette {
  body: Color3;
  roof: Color3;
}

/** Fixed colour palettes for players 1–4 */
export const PLAYER_COLORS: BusColorPalette[] = [
  { body: new Color3(0.95, 0.78, 0.15), roof: new Color3(0.82, 0.65, 0.10) },  // P1 yellow (default)
  { body: new Color3(0.85, 0.25, 0.20), roof: new Color3(0.70, 0.18, 0.12) },  // P2 red
  { body: new Color3(0.20, 0.45, 0.85), roof: new Color3(0.14, 0.32, 0.70) },  // P3 blue
  { body: new Color3(0.60, 0.25, 0.80), roof: new Color3(0.45, 0.16, 0.65) },  // P4 purple
];

/**
 * Re-tint a bus model's body + roof to the given palette.
 * Clones the materials so multiple buses can have different colours.
 */
export function tintBusModel(root: TransformNode, palette: BusColorPalette, suffix: string) {
  root.getChildMeshes().forEach((m) => {
    if (m.material && 'diffuseColor' in m.material) {
      const mat = m.material as StandardMaterial;
      if (mat.name === 'busYellow' || mat.name.startsWith('busYellow_')) {
        const tinted = mat.clone(mat.name + '_' + suffix);
        tinted.diffuseColor = palette.body.clone();
        m.material = tinted;
      } else if (mat.name === 'busDarkYellow' || mat.name.startsWith('busDarkYellow_')) {
        const tinted = mat.clone(mat.name + '_' + suffix);
        tinted.diffuseColor = palette.roof.clone();
        m.material = tinted;
      }
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
