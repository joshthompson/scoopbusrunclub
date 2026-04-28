import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  type Mesh,
} from '@babylonjs/core';
import type { ElasticObject } from '../types';

// ── Shared types ────────────────────────────────────────────────────────

export interface PlacedObjectData {
  x: number;
  z: number;
  rotation: number; // radians
}

export interface BuildLevelObjectsResult {
  solidObstacles: { x: number; z: number; radius: number; elasticIndex?: number }[];
  objectRoots: TransformNode[];
  elasticObjects: ElasticObject[];
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

// ── Bench instanced templates ───────────────────────────────────────────

// Geometry constants (shared between template creation and placement)
const B_LEN = 1.5;
const B_SEAT_D = 0.4;
const B_SEAT_T = 0.05;
const B_SEAT_H = 0.45;
const B_BACK_H = 0.4;
const B_BACK_T = 0.04;
const B_LEG_W = 0.06;
const B_LEG_D = 0.04;
const B_SLAT_GAP = 0.02;
const B_SLAT_D = (B_SEAT_D - B_SLAT_GAP * 2) / 3;
const B_BACK_SLAT_H = 0.08;
const B_BACK_SLAT_GAP = 0.04;
const B_LEG_INSET = B_LEN * 0.35;

interface BenchTemplates {
  seatSlat: Mesh;
  backSlat: Mesh;
  frontLeg: Mesh;
  rearLeg: Mesh;
  crossbar: Mesh;
}

function createBenchTemplates(scene: Scene): BenchTemplates {
  const wm = getWoodMat(scene);
  const im = getIronMat(scene);

  const seatSlat = MeshBuilder.CreateBox('tpl_bench_seat', { width: B_LEN, height: B_SEAT_T, depth: B_SLAT_D }, scene);
  seatSlat.material = wm; seatSlat.isVisible = false;

  const backSlat = MeshBuilder.CreateBox('tpl_bench_back', { width: B_LEN, height: B_BACK_SLAT_H, depth: B_BACK_T }, scene);
  backSlat.material = wm; backSlat.isVisible = false;

  const frontLeg = MeshBuilder.CreateBox('tpl_bench_fl', { width: B_LEG_W, height: B_SEAT_H, depth: B_LEG_D }, scene);
  frontLeg.material = im; frontLeg.isVisible = false;

  const rlH = B_SEAT_H + B_BACK_H;
  const rearLeg = MeshBuilder.CreateBox('tpl_bench_rl', { width: B_LEG_W, height: rlH, depth: B_LEG_D }, scene);
  rearLeg.material = im; rearLeg.isVisible = false;

  const crossbar = MeshBuilder.CreateBox('tpl_bench_cb', { width: B_LEG_W, height: B_LEG_D, depth: B_SEAT_D * 0.8 }, scene);
  crossbar.material = im; crossbar.isVisible = false;

  return { seatSlat, backSlat, frontLeg, rearLeg, crossbar };
}

function placeBench(tpl: BenchTemplates, scene: Scene, i: number, x: number, y: number, z: number, rotation: number): TransformNode {
  const root = new TransformNode(`bench_${i}`, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  // Seat slats
  for (let si = 0; si < 3; si++) {
    const inst = tpl.seatSlat.createInstance(`bench_${i}_s${si}`);
    inst.position.set(0, B_SEAT_H, -B_SEAT_D / 2 + B_SLAT_D / 2 + si * (B_SLAT_D + B_SLAT_GAP));
    inst.parent = root;
  }

  // Back rest slats
  for (let bi = 0; bi < 2; bi++) {
    const inst = tpl.backSlat.createInstance(`bench_${i}_b${bi}`);
    inst.position.set(0, B_SEAT_H + B_SEAT_T / 2 + 0.06 + B_BACK_SLAT_H / 2 + bi * (B_BACK_SLAT_H + B_BACK_SLAT_GAP), -B_SEAT_D / 2);
    inst.rotation.x = -0.21;
    inst.parent = root;
  }

  // Legs (left + right)
  const rlH = B_SEAT_H + B_BACK_H;
  for (const side of [-1, 1]) {
    const fl = tpl.frontLeg.createInstance(`bench_${i}_fl${side}`);
    fl.position.set(side * B_LEG_INSET, B_SEAT_H / 2, B_SEAT_D / 2 - B_LEG_D / 2);
    fl.parent = root;

    const rl = tpl.rearLeg.createInstance(`bench_${i}_rl${side}`);
    rl.position.set(side * B_LEG_INSET, rlH / 2, -B_SEAT_D / 2 + B_LEG_D / 2);
    rl.rotation.x = -0.10;
    rl.parent = root;

    const cb = tpl.crossbar.createInstance(`bench_${i}_cb${side}`);
    cb.position.set(side * B_LEG_INSET, B_SEAT_H * 0.35, 0);
    cb.parent = root;
  }

  return root;
}

// ── Lamppost instanced templates ────────────────────────────────────────

const LP_POLE_H = 4.0;
const LP_POLE_D = 0.12;
const LP_LANTERN_H = 0.4;
const LP_LANTERN_D = 0.28;

interface LampTemplates {
  base: Mesh;
  ring: Mesh;
  pole: Mesh;
  collar: Mesh;
  lantern: Mesh;
  roof: Mesh;
  spike: Mesh;
}

function createLampTemplates(scene: Scene): LampTemplates {
  const im = getIronMat(scene);
  const gm = getGlassMat(scene);

  const base = MeshBuilder.CreateCylinder('tpl_lamp_base', { height: 0.2, diameterTop: LP_POLE_D * 1.5, diameterBottom: LP_POLE_D * 2.8, tessellation: 8 }, scene);
  base.material = im; base.isVisible = false;

  const ring = MeshBuilder.CreateCylinder('tpl_lamp_ring', { height: 0.12, diameterTop: LP_POLE_D * 1.3, diameterBottom: LP_POLE_D * 1.5, tessellation: 8 }, scene);
  ring.material = im; ring.isVisible = false;

  const pole = MeshBuilder.CreateCylinder('tpl_lamp_pole', { height: LP_POLE_H - 0.8, diameterTop: LP_POLE_D * 0.75, diameterBottom: LP_POLE_D, tessellation: 8 }, scene);
  pole.material = im; pole.isVisible = false;

  const collar = MeshBuilder.CreateCylinder('tpl_lamp_collar', { height: 0.08, diameterTop: LP_POLE_D * 1.6, diameterBottom: LP_POLE_D * 1.0, tessellation: 8 }, scene);
  collar.material = im; collar.isVisible = false;

  const lantern = MeshBuilder.CreateCylinder('tpl_lamp_lantern', { height: LP_LANTERN_H, diameterTop: LP_LANTERN_D * 0.7, diameterBottom: LP_LANTERN_D, tessellation: 6 }, scene);
  lantern.material = gm; lantern.isVisible = false;

  const roof = MeshBuilder.CreateCylinder('tpl_lamp_roof', { height: 0.1, diameterTop: 0.06, diameterBottom: LP_LANTERN_D * 1.1, tessellation: 6 }, scene);
  roof.material = im; roof.isVisible = false;

  const spike = MeshBuilder.CreateCylinder('tpl_lamp_spike', { height: 0.15, diameterTop: 0, diameterBottom: 0.05, tessellation: 6 }, scene);
  spike.material = im; spike.isVisible = false;

  return { base, ring, pole, collar, lantern, roof, spike };
}

function placeLamppost(tpl: LampTemplates, scene: Scene, i: number, x: number, y: number, z: number, rotation: number): TransformNode {
  const root = new TransformNode(`lamp_${i}`, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  const b = tpl.base.createInstance(`lamp_${i}_base`);
  b.position.y = 0.1; b.parent = root;

  const r = tpl.ring.createInstance(`lamp_${i}_ring`);
  r.position.y = 0.26; r.parent = root;

  const p = tpl.pole.createInstance(`lamp_${i}_pole`);
  p.position.y = 0.32 + (LP_POLE_H - 0.8) / 2; p.parent = root;

  const col = tpl.collar.createInstance(`lamp_${i}_col`);
  col.position.y = LP_POLE_H - 0.44; col.parent = root;

  const lan = tpl.lantern.createInstance(`lamp_${i}_lan`);
  lan.position.y = LP_POLE_H - 0.2; lan.parent = root;

  const rf = tpl.roof.createInstance(`lamp_${i}_roof`);
  rf.position.y = LP_POLE_H; rf.parent = root;

  const sp = tpl.spike.createInstance(`lamp_${i}_spike`);
  sp.position.y = LP_POLE_H + 0.125; sp.parent = root;

  return root;
}

// ── Tennis court instanced templates ────────────────────────────────────

const TC_L = 12;
const TC_W = 5.5;
const TC_NET_H = 1.07;

interface TennisTemplates {
  surface: Mesh;
  baseline: Mesh;     // 2 per court
  sideline: Mesh;     // 2 per court
  centerLine: Mesh;   // 1 per court
  serviceLine: Mesh;  // 4 per court
  net: Mesh;
  post: Mesh;
}

function createTennisTemplates(scene: Scene): TennisTemplates {
  const cm = getCourtMat(scene);
  const wm = getWhiteMat(scene);
  const nm = getNetMat(scene);
  const im = getIronMat(scene);

  const surface = MeshBuilder.CreateBox('tpl_tc_surf', { width: TC_W, height: 0.02, depth: TC_L }, scene);
  surface.material = cm; surface.isVisible = false;

  const baseline = MeshBuilder.CreateBox('tpl_tc_bl', { width: TC_W + 0.06, height: 0.005, depth: 0.06 }, scene);
  baseline.material = wm; baseline.isVisible = false;

  const sideline = MeshBuilder.CreateBox('tpl_tc_sl', { width: 0.06, height: 0.005, depth: TC_L }, scene);
  sideline.material = wm; sideline.isVisible = false;

  const centerLine = MeshBuilder.CreateBox('tpl_tc_cl', { width: 0.06, height: 0.005, depth: TC_L * 0.54 }, scene);
  centerLine.material = wm; centerLine.isVisible = false;

  const serviceLine = MeshBuilder.CreateBox('tpl_tc_svl', { width: TC_W / 2 + 0.06, height: 0.005, depth: 0.06 }, scene);
  serviceLine.material = wm; serviceLine.isVisible = false;

  const net = MeshBuilder.CreateBox('tpl_tc_net', { width: TC_W + 0.5, height: TC_NET_H, depth: 0.03 }, scene);
  net.material = nm; net.isVisible = false;

  const post = MeshBuilder.CreateCylinder('tpl_tc_post', { height: TC_NET_H + 0.15, diameter: 0.06, tessellation: 8 }, scene);
  post.material = im; post.isVisible = false;

  return { surface, baseline, sideline, centerLine, serviceLine, net, post };
}

function placeTennisCourt(tpl: TennisTemplates, scene: Scene, i: number, x: number, y: number, z: number, rotation: number): TransformNode {
  const root = new TransformNode(`tennis_${i}`, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  // Surface
  const surf = tpl.surface.createInstance(`tennis_${i}_surf`);
  surf.position.y = 0.01; surf.parent = root;

  // Baselines (near + far)
  const bl0 = tpl.baseline.createInstance(`tennis_${i}_bl0`);
  bl0.position.set(0, 0.025, -TC_L / 2); bl0.parent = root;

  const bl1 = tpl.baseline.createInstance(`tennis_${i}_bl1`);
  bl1.position.set(0, 0.025, TC_L / 2); bl1.parent = root;

  // Sidelines (left + right)
  const sl0 = tpl.sideline.createInstance(`tennis_${i}_sl0`);
  sl0.position.set(-TC_W / 2, 0.025, 0); sl0.parent = root;

  const sl1 = tpl.sideline.createInstance(`tennis_${i}_sl1`);
  sl1.position.set(TC_W / 2, 0.025, 0); sl1.parent = root;

  // Center service line
  const cl = tpl.centerLine.createInstance(`tennis_${i}_cl`);
  cl.position.set(0, 0.025, 0); cl.parent = root;

  // Service lines (4 — left/right × near/far)
  const svOffsets: [number, number][] = [
    [-TC_W / 4, TC_L * 0.365 - TC_L / 2],
    [-TC_W / 4, TC_L * 0.635 - TC_L / 2],
    [TC_W / 4, TC_L * 0.365 - TC_L / 2],
    [TC_W / 4, TC_L * 0.635 - TC_L / 2],
  ];
  for (let li = 0; li < svOffsets.length; li++) {
    const sv = tpl.serviceLine.createInstance(`tennis_${i}_sv${li}`);
    sv.position.set(svOffsets[li][0], 0.025, svOffsets[li][1]);
    sv.parent = root;
  }

  // Net
  const n = tpl.net.createInstance(`tennis_${i}_net`);
  n.position.set(0, TC_NET_H / 2, 0); n.parent = root;

  // Net posts
  for (const side of [-1, 1]) {
    const p = tpl.post.createInstance(`tennis_${i}_np${side}`);
    p.position.set(side * (TC_W / 2 + 0.25), (TC_NET_H + 0.15) / 2, 0);
    p.parent = root;
  }

  return root;
}

// ── Main builder ────────────────────────────────────────────────────────

/**
 * Build all placed level objects (benches, lampposts, tennis courts).
 * Uses instanced meshes — one set of invisible template meshes per object type,
 * with lightweight instances stamped out per placement for minimal draw calls.
 */
export function buildLevelObjects(
  scene: Scene,
  benches: PlacedObjectData[],
  lampposts: PlacedObjectData[],
  tennisCourts: PlacedObjectData[],
  getGroundY: (x: number, z: number) => number,
): BuildLevelObjectsResult {
  const solidObstacles: { x: number; z: number; radius: number; elasticIndex?: number }[] = [];
  const objectRoots: TransformNode[] = [];
  const elasticObjects: ElasticObject[] = [];

  // Create templates only for types that have placements
  const benchTpl = benches.length > 0 ? createBenchTemplates(scene) : null;
  const lampTpl = lampposts.length > 0 ? createLampTemplates(scene) : null;
  const tennisTpl = tennisCourts.length > 0 ? createTennisTemplates(scene) : null;

  for (let i = 0; i < benches.length; i++) {
    const { x, z, rotation } = benches[i];
    const root = placeBench(benchTpl!, scene, i, x, getGroundY(x, z), z, rotation);
    objectRoots.push(root);
    const elasticIndex = elasticObjects.length;
    elasticObjects.push({ root, tiltX: 0, tiltZ: 0, tiltVelX: 0, tiltVelZ: 0 });
    solidObstacles.push({ x, z, radius: 0.8, elasticIndex });
  }

  for (let i = 0; i < lampposts.length; i++) {
    const { x, z, rotation } = lampposts[i];
    const root = placeLamppost(lampTpl!, scene, i, x, getGroundY(x, z), z, rotation);
    objectRoots.push(root);
    const elasticIndex = elasticObjects.length;
    elasticObjects.push({ root, tiltX: 0, tiltZ: 0, tiltVelX: 0, tiltVelZ: 0 });
    solidObstacles.push({ x, z, radius: 0.3, elasticIndex });
  }

  for (let i = 0; i < tennisCourts.length; i++) {
    const { x, z, rotation } = tennisCourts[i];
    objectRoots.push(placeTennisCourt(tennisTpl!, scene, i, x, getGroundY(x, z), z, rotation));
  }

  return { solidObstacles, objectRoots, elasticObjects };
}
