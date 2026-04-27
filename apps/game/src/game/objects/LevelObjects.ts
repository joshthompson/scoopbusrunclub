import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
} from '@babylonjs/core';

// ── Shared types ────────────────────────────────────────────────────────

export interface PlacedObjectData {
  x: number;
  z: number;
  rotation: number; // radians
}

export interface BuildLevelObjectsResult {
  solidObstacles: { x: number; z: number; radius: number }[];
}

// ── Material caches ─────────────────────────────────────────────────────

let _woodMat: StandardMaterial | null = null;
let _ironMat: StandardMaterial | null = null;
let _greenMat: StandardMaterial | null = null;
let _whiteMat: StandardMaterial | null = null;
let _netMat: StandardMaterial | null = null;
let _courtMat: StandardMaterial | null = null;
let _glassMat: StandardMaterial | null = null;

function getWoodMat(scene: Scene) {
  if (!_woodMat) { _woodMat = new StandardMaterial('objWood', scene); _woodMat.diffuseColor = new Color3(0.48, 0.32, 0.18); _woodMat.specularColor = new Color3(0.06, 0.04, 0.02); }
  return _woodMat;
}
function getIronMat(scene: Scene) {
  if (!_ironMat) { _ironMat = new StandardMaterial('objIron', scene); _ironMat.diffuseColor = new Color3(0.18, 0.18, 0.2); _ironMat.specularColor = new Color3(0.1, 0.1, 0.12); }
  return _ironMat;
}
function getGreenMat(scene: Scene) {
  if (!_greenMat) { _greenMat = new StandardMaterial('objGreen', scene); _greenMat.diffuseColor = new Color3(0.15, 0.35, 0.12); _greenMat.specularColor = Color3.Black(); }
  return _greenMat;
}
function getWhiteMat(scene: Scene) {
  if (!_whiteMat) { _whiteMat = new StandardMaterial('objWhite', scene); _whiteMat.diffuseColor = new Color3(0.92, 0.92, 0.92); _whiteMat.specularColor = new Color3(0.1, 0.1, 0.1); }
  return _whiteMat;
}
function getNetMat(scene: Scene) {
  if (!_netMat) { _netMat = new StandardMaterial('objNet', scene); _netMat.diffuseColor = new Color3(0.85, 0.85, 0.85); _netMat.specularColor = Color3.Black(); _netMat.alpha = 0.6; }
  return _netMat;
}
function getCourtMat(scene: Scene) {
  if (!_courtMat) { _courtMat = new StandardMaterial('objCourt', scene); _courtMat.diffuseColor = new Color3(0.22, 0.42, 0.22); _courtMat.specularColor = Color3.Black(); }
  return _courtMat;
}
function getGlassMat(scene: Scene) {
  if (!_glassMat) { _glassMat = new StandardMaterial('objGlass', scene); _glassMat.diffuseColor = new Color3(0.85, 0.82, 0.6); _glassMat.emissiveColor = new Color3(0.35, 0.32, 0.15); _glassMat.specularColor = new Color3(0.2, 0.2, 0.1); _glassMat.alpha = 0.85; }
  return _glassMat;
}

// ── Bench ───────────────────────────────────────────────────────────────

function buildOneBench(scene: Scene, i: number, x: number, y: number, z: number, rotation: number) {
  const root = new TransformNode(`bench_${i}`, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  const wm = getWoodMat(scene);
  const im = getIronMat(scene);

  const benchLength = 1.5;
  const seatDepth = 0.4;
  const seatThickness = 0.05;
  const seatHeight = 0.45;
  const backHeight = 0.4;
  const backThickness = 0.04;
  const legWidth = 0.06;
  const legDepth = 0.04;

  // Seat (3 slats)
  const slatGap = 0.02;
  const slatDepth = (seatDepth - slatGap * 2) / 3;
  for (let si = 0; si < 3; si++) {
    const slat = MeshBuilder.CreateBox(`bench_${i}_s${si}`, { width: benchLength, height: seatThickness, depth: slatDepth }, scene);
    slat.position.set(0, seatHeight, -seatDepth / 2 + slatDepth / 2 + si * (slatDepth + slatGap));
    slat.material = wm;
    slat.parent = root;
  }

  // Back rest (2 slats)
  const backSlatH = 0.08;
  const backSlatGap = 0.04;
  for (let bi = 0; bi < 2; bi++) {
    const slat = MeshBuilder.CreateBox(`bench_${i}_b${bi}`, { width: benchLength, height: backSlatH, depth: backThickness }, scene);
    slat.position.set(0, seatHeight + seatThickness / 2 + 0.06 + backSlatH / 2 + bi * (backSlatH + backSlatGap), -seatDepth / 2);
    slat.rotation.x = -0.21;
    slat.material = wm;
    slat.parent = root;
  }

  // Legs
  const legInset = benchLength * 0.35;
  for (const side of [-1, 1]) {
    const fl = MeshBuilder.CreateBox(`bench_${i}_fl${side}`, { width: legWidth, height: seatHeight, depth: legDepth }, scene);
    fl.position.set(side * legInset, seatHeight / 2, seatDepth / 2 - legDepth / 2);
    fl.material = im; fl.parent = root;

    const rlH = seatHeight + backHeight;
    const rl = MeshBuilder.CreateBox(`bench_${i}_rl${side}`, { width: legWidth, height: rlH, depth: legDepth }, scene);
    rl.position.set(side * legInset, rlH / 2, -seatDepth / 2 + legDepth / 2);
    rl.rotation.x = -0.10;
    rl.material = im; rl.parent = root;

    const cb = MeshBuilder.CreateBox(`bench_${i}_cb${side}`, { width: legWidth, height: legDepth, depth: seatDepth * 0.8 }, scene);
    cb.position.set(side * legInset, seatHeight * 0.35, 0);
    cb.material = im; cb.parent = root;
  }
}

// ── Lamppost ────────────────────────────────────────────────────────────

function buildOneLamppost(scene: Scene, i: number, x: number, y: number, z: number, rotation: number) {
  const root = new TransformNode(`lamp_${i}`, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  const im = getIronMat(scene);
  const gm = getGlassMat(scene);

  const poleH = 4.0;
  const poleD = 0.12;

  // Wide decorative base
  const base = MeshBuilder.CreateCylinder(`lamp_${i}_base`, { height: 0.2, diameterTop: poleD * 1.5, diameterBottom: poleD * 2.8, tessellation: 8 }, scene);
  base.position.y = 0.1;
  base.material = im;
  base.parent = root;

  // Lower bulge ring
  const ring1 = MeshBuilder.CreateCylinder(`lamp_${i}_r1`, { height: 0.12, diameterTop: poleD * 1.3, diameterBottom: poleD * 1.5, tessellation: 8 }, scene);
  ring1.position.y = 0.26;
  ring1.material = im;
  ring1.parent = root;

  // Main pole (slight taper)
  const pole = MeshBuilder.CreateCylinder(`lamp_${i}_p`, { height: poleH - 0.8, diameterTop: poleD * 0.75, diameterBottom: poleD, tessellation: 8 }, scene);
  pole.position.y = 0.32 + (poleH - 0.8) / 2;
  pole.material = im;
  pole.parent = root;

  // Collar ring below lantern
  const collar = MeshBuilder.CreateCylinder(`lamp_${i}_col`, { height: 0.08, diameterTop: poleD * 1.6, diameterBottom: poleD * 1.0, tessellation: 8 }, scene);
  collar.position.y = poleH - 0.44;
  collar.material = im;
  collar.parent = root;

  // Lantern body (hexagonal glass housing, centered on pole)
  const lanternH = 0.4;
  const lanternD = 0.28;
  const lantern = MeshBuilder.CreateCylinder(`lamp_${i}_lan`, { height: lanternH, diameterTop: lanternD * 0.7, diameterBottom: lanternD, tessellation: 6 }, scene);
  lantern.position.y = poleH - 0.2;
  lantern.material = gm;
  lantern.parent = root;

  // Lantern roof (wider cap, tapered)
  const roof = MeshBuilder.CreateCylinder(`lamp_${i}_roof`, { height: 0.1, diameterTop: 0.06, diameterBottom: lanternD * 1.1, tessellation: 6 }, scene);
  roof.position.y = poleH;
  roof.material = im;
  roof.parent = root;

  // Finial spike on top
  const spike = MeshBuilder.CreateCylinder(`lamp_${i}_spike`, { height: 0.15, diameterTop: 0, diameterBottom: 0.05, tessellation: 6 }, scene);
  spike.position.y = poleH + 0.125;
  spike.material = im;
  spike.parent = root;
}

// ── Tennis court ────────────────────────────────────────────────────────

function buildOneTennisCourt(scene: Scene, i: number, x: number, y: number, z: number, rotation: number) {
  const root = new TransformNode(`tennis_${i}`, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  // Half-scale dimensions for game feel: ~12 × 5.5
  const courtL = 12;
  const courtW = 5.5;

  const cm = getCourtMat(scene);
  const wm = getWhiteMat(scene);
  const nm = getNetMat(scene);
  const im = getIronMat(scene);
  const gm = getGreenMat(scene);

  // Surface
  const surface = MeshBuilder.CreateBox(`tennis_${i}_surf`, { width: courtW, height: 0.02, depth: courtL }, scene);
  surface.position.y = 0.01;
  surface.material = cm;
  surface.parent = root;

  // Boundary lines
  const lines: [number, number, number, number][] = [
    [0, 0, courtW + 0.06, 0.06],
    [0, courtL, courtW + 0.06, 0.06],
    [-courtW / 2, courtL / 2, 0.06, courtL],
    [courtW / 2, courtL / 2, 0.06, courtL],
    [0, courtL / 2, 0.06, courtL * 0.54],
    [-courtW / 4, courtL * 0.365, courtW / 2 + 0.06, 0.06],
    [-courtW / 4, courtL * 0.635, courtW / 2 + 0.06, 0.06],
    [courtW / 4, courtL * 0.365, courtW / 2 + 0.06, 0.06],
    [courtW / 4, courtL * 0.635, courtW / 2 + 0.06, 0.06],
  ];
  for (let li = 0; li < lines.length; li++) {
    const [lx, lz, lw, ld] = lines[li];
    const line = MeshBuilder.CreateBox(`tennis_${i}_l${li}`, { width: lw, height: 0.005, depth: ld }, scene);
    line.position.set(lx, 0.025, lz - courtL / 2);
    line.material = wm;
    line.parent = root;
  }

  // Net
  const netH = 1.07;
  const net = MeshBuilder.CreateBox(`tennis_${i}_net`, { width: courtW + 0.5, height: netH, depth: 0.03 }, scene);
  net.position.set(0, netH / 2, 0);
  net.material = nm;
  net.parent = root;

  // Net posts
  for (const side of [-1, 1]) {
    const post = MeshBuilder.CreateCylinder(`tennis_${i}_np${side}`, { height: netH + 0.15, diameter: 0.06, tessellation: 8 }, scene);
    post.position.set(side * (courtW / 2 + 0.25), (netH + 0.15) / 2, 0);
    post.material = im;
    post.parent = root;
  }
}

// ── Main builder ────────────────────────────────────────────────────────

/**
 * Build all placed level objects (benches, lampposts, tennis courts).
 */
export function buildLevelObjects(
  scene: Scene,
  benches: PlacedObjectData[],
  lampposts: PlacedObjectData[],
  tennisCourts: PlacedObjectData[],
  getGroundY: (x: number, z: number) => number,
): BuildLevelObjectsResult {
  const solidObstacles: { x: number; z: number; radius: number }[] = [];

  for (let i = 0; i < benches.length; i++) {
    const { x, z, rotation } = benches[i];
    buildOneBench(scene, i, x, getGroundY(x, z), z, rotation);
    solidObstacles.push({ x, z, radius: 0.8 });
  }

  for (let i = 0; i < lampposts.length; i++) {
    const { x, z, rotation } = lampposts[i];
    buildOneLamppost(scene, i, x, getGroundY(x, z), z, rotation);
    solidObstacles.push({ x, z, radius: 0.3 });
  }

  for (let i = 0; i < tennisCourts.length; i++) {
    const { x, z, rotation } = tennisCourts[i];
    buildOneTennisCourt(scene, i, x, getGroundY(x, z), z, rotation);
  }

  return { solidObstacles };
}
