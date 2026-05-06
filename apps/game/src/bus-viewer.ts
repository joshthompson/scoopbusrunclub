/**
 * Bus Model Viewer — standalone page to inspect the bus model
 * with wheels, scoop, and passengers positioned on the roof.
 *
 * Controls:
 *  - WASD/Arrows: move camera target
 *  - Drag: orbit camera
 *  - Scroll: zoom
 *  - Q/E: move camera up/down
 */

import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  DynamicTexture,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import { createBusModel } from './game/objects/BusModel';
import {
  SCOOP_POSITION,
  SCOOP_WIDTH,
  WHEEL_FRONT_LEFT_POSITION,
  WHEEL_FRONT_RIGHT_POSITION,
  WHEEL_BACK_LEFT_POSITION,
  WHEEL_BACK_RIGHT_POSITION,
  LIGHT_FRONT_POSITION,
  LIGHT_BACK_LEFT_POSITION,
  LIGHT_BACK_RIGHT_POSITION,
  PASSENGER_TRAY_POSITION,
  PASSENGER_TRAY_SIZE,
  WHEEL_ROLL_SPEED,
} from './game/objects/BusModel';
import { createRunnerModel, poseSitting, poseSittingAnimated } from './game/objects/RunnerModel';
import type { RunnerModelResult } from './game/objects/RunnerModel';
import { BUS_ROOF_Y } from './game/constants';

// ── Camera state ──
let camera: FreeCamera;
let cameraYaw = Math.PI * 0.25;
let cameraPitch = -0.35;
let cameraTarget = new Vector3(0, 2, 0);
let cameraDistance = 25;

const CAMERA_MOVE_SPEED = 15;
const CAMERA_ORBIT_SENSITIVITY = 0.005;
const CAMERA_ZOOM_SPEED = 0.08;
const MIN_PITCH = -Math.PI / 2 + 0.05;
const MAX_PITCH = Math.PI / 2 - 0.05;

const keys: Record<string, boolean> = {};
let isDragging = false;
let dragStart = { x: 0, y: 0 };

// ── Scene objects ──
let scene: Scene;
let engine: Engine;
let busRoot: TransformNode;
let bodyShell: TransformNode;
let scoopPivot: TransformNode;
let frontWheelLeft: TransformNode;
let frontWheelRight: TransformNode;
let gridMesh: any;
let axesRoot: TransformNode;
let passengers: { model: RunnerModelResult; anchor: TransformNode; phase: number }[] = [];
let wheelSpinEnabled = true;
let wheelRollSpeedOverride = WHEEL_ROLL_SPEED;
let scoopAnimEnabled = false;
let wireframeEnabled = false;

// ── Light markers ──
let lightFrontMarker: TransformNode;
let lightBackLeftMarker: TransformNode;
let lightBackRightMarker: TransformNode;

// ── Passenger tray visualization ──
let passengerTrayMarker: any;

// ── Init ──
async function init() {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  engine = new Engine(canvas, true, { stencil: true });
  scene = new Scene(engine);
  scene.clearColor = new Color4(0.45, 0.65, 0.85, 1);

  // Camera (we control it manually)
  camera = new FreeCamera('cam', Vector3.Zero(), scene);
  camera.minZ = 0.1;
  camera.maxZ = 500;
  camera.fov = 0.9;
  camera.inputs.clear();

  // Lights
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;
  hemi.groundColor = new Color3(0.3, 0.35, 0.4);

  const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.6).normalize(), scene);
  sun.intensity = 0.9;

  // Ground grid
  gridMesh = MeshBuilder.CreateGround('grid', { width: 40, height: 40, subdivisions: 40 }, scene);
  const gridMat = new StandardMaterial('gridMat', scene);
  gridMat.diffuseColor = new Color3(0.3, 0.5, 0.3);
  gridMat.specularColor = Color3.Black();
  gridMat.wireframe = true;
  gridMesh.material = gridMat;
  gridMesh.position.y = 0;

  // Solid ground plane behind the wireframe
  const solidGround = MeshBuilder.CreateGround('solidGround', { width: 40, height: 40 }, scene);
  const solidMat = new StandardMaterial('solidGroundMat', scene);
  solidMat.diffuseColor = new Color3(0.25, 0.42, 0.2);
  solidMat.specularColor = Color3.Black();
  solidGround.material = solidMat;
  solidGround.position.y = -0.01;

  // Axes helper
  axesRoot = new TransformNode('axes', scene);
  createAxes(scene, axesRoot);

  // ── Load bus model ──
  const busResult = await createBusModel(scene);
  busRoot = busResult.root;
  bodyShell = busResult.bodyShell;
  scoopPivot = busResult.scoopPivot;
  frontWheelLeft = busResult.frontWheelLeft;
  frontWheelRight = busResult.frontWheelRight;
  busRoot.setEnabled(true);

  // Debug: log all mesh/material names so we know what to match for tinting
  console.group('🚌 Bus model materials');
  busRoot.getChildMeshes().forEach((m) => {
    const matType = m.material?.constructor?.name ?? 'none';
    console.log(`mesh: "${m.name}" | material: "${m.material?.name}" (${matType})`);
  });
  console.groupEnd();

  // ── Light markers (small spheres to visualize positions) ──
  const lightMat = new StandardMaterial('lightMarkerMat', scene);
  lightMat.diffuseColor = new Color3(1, 1, 0.3);
  lightMat.emissiveColor = new Color3(1, 1, 0.3);
  lightMat.specularColor = Color3.Black();

  const lightBackMat = new StandardMaterial('lightBackMarkerMat', scene);
  lightBackMat.diffuseColor = new Color3(1, 0.2, 0.1);
  lightBackMat.emissiveColor = new Color3(1, 0.2, 0.1);
  lightBackMat.specularColor = Color3.Black();

  const lfMesh = MeshBuilder.CreateSphere('lightFront', { diameter: 0.4 }, scene);
  lfMesh.material = lightMat;
  lfMesh.parent = busRoot;
  lfMesh.position = new Vector3(...LIGHT_FRONT_POSITION);
  lightFrontMarker = lfMesh as any;

  const lblMesh = MeshBuilder.CreateSphere('lightBackLeft', { diameter: 0.3 }, scene);
  lblMesh.material = lightBackMat;
  lblMesh.parent = busRoot;
  lblMesh.position = new Vector3(...LIGHT_BACK_LEFT_POSITION);
  lightBackLeftMarker = lblMesh as any;

  const lbrMesh = MeshBuilder.CreateSphere('lightBackRight', { diameter: 0.3 }, scene);
  lbrMesh.material = lightBackMat;
  lbrMesh.parent = busRoot;
  lbrMesh.position = new Vector3(...LIGHT_BACK_RIGHT_POSITION);
  lightBackRightMarker = lbrMesh as any;

  // ── Passenger tray visualization ──
  const trayMat = new StandardMaterial('trayMat', scene);
  trayMat.diffuseColor = new Color3(0.3, 0.8, 1);
  trayMat.alpha = 0.3;
  trayMat.specularColor = Color3.Black();
  passengerTrayMarker = MeshBuilder.CreateBox('passengerTray', {
    width: PASSENGER_TRAY_SIZE[0],
    height: 0.1,
    depth: PASSENGER_TRAY_SIZE[1],
  }, scene);
  passengerTrayMarker.material = trayMat;
  passengerTrayMarker.parent = busRoot;
  passengerTrayMarker.position = new Vector3(...PASSENGER_TRAY_POSITION);

  // Spawn initial passengers
  spawnPassengers(5);

  // ── Input ──
  setupInput(canvas);

  // ── UI bindings ──
  setupUI();

  // ── Render loop ──
  let lastTime = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    updateCamera(dt);
    updateAnimations(dt, now / 1000);
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
}

// ── Axes helper ──
function createAxes(scene: Scene, parent: TransformNode) {
  const len = 5;
  const colors = [
    { axis: new Vector3(len, 0, 0), color: new Color3(1, 0.2, 0.2) }, // X = red
    { axis: new Vector3(0, len, 0), color: new Color3(0.2, 1, 0.2) }, // Y = green
    { axis: new Vector3(0, 0, len), color: new Color3(0.2, 0.4, 1) }, // Z = blue
  ];
  for (const { axis, color } of colors) {
    const line = MeshBuilder.CreateLines(`axis_${axis.x}_${axis.y}_${axis.z}`, {
      points: [Vector3.Zero(), axis],
    }, scene);
    line.color = color;
    line.parent = parent;
  }
  // Labels
  const labels = ['X', 'Y', 'Z'];
  const positions = [new Vector3(len + 0.5, 0, 0), new Vector3(0, len + 0.5, 0), new Vector3(0, 0, len + 0.5)];
  for (let i = 0; i < 3; i++) {
    const label = MeshBuilder.CreatePlane(`axLabel_${labels[i]}`, { size: 0.8 }, scene);
    const mat = new StandardMaterial(`axLabelMat_${i}`, scene);
    const tex = new DynamicTexture(`axTex_${i}`, { width: 64, height: 64 }, scene, true);
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], 32, 32);
    tex.update();
    tex.hasAlpha = true;
    mat.diffuseTexture = tex;
    mat.specularColor = Color3.Black();
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    label.material = mat;
    label.position = positions[i];
    label.billboardMode = 7; // BILLBOARD_MODE_ALL
    label.parent = parent;
  }
}

// ── Passengers ──
function spawnPassengers(count: number) {
  // Remove existing
  for (const p of passengers) {
    p.model.root.dispose();
    p.anchor.dispose();
  }
  passengers = [];

  if (count === 0) return;

  // Layout on bus roof — use current tray position/size from editor
  const trayX = getNumVal('pos-pt-x') || PASSENGER_TRAY_POSITION[0];
  const trayY = getNumVal('pos-pt-y') || PASSENGER_TRAY_POSITION[1];
  const trayZ = getNumVal('pos-pt-z') || PASSENGER_TRAY_POSITION[2];
  const roofW = getNumVal('pos-pts-w') || PASSENGER_TRAY_SIZE[0];
  const roofL = getNumVal('pos-pts-l') || PASSENGER_TRAY_SIZE[1];
  const cols = Math.min(count, 3);
  const rows = Math.ceil(count / cols);
  const spacingX = cols > 1 ? roofW / (cols - 1) : 0;
  const spacingZ = rows > 1 ? roofL / (rows - 1) : 0;

  const tshirtColors = [
    new Color3(0.9, 0.2, 0.2),
    new Color3(0.2, 0.2, 0.9),
    new Color3(0.1, 0.8, 0.3),
    new Color3(0.9, 0.6, 0.1),
    new Color3(0.7, 0.1, 0.7),
    new Color3(0.1, 0.7, 0.7),
  ];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const offsetX = cols > 1 ? -roofW / 2 + col * spacingX : 0;
    const offsetZ = rows > 1 ? -roofL / 2 + row * spacingZ : 0;

    const color = tshirtColors[i % tshirtColors.length];
    const model = createRunnerModel(scene, 1000 + i, color);
    poseSitting(model);

    // Create anchor parented to bus root so passengers move with bus
    const anchor = new TransformNode(`passengerAnchor_${i}`, scene);
    anchor.parent = busRoot;
    anchor.position = new Vector3(trayX + offsetX, trayY, trayZ + offsetZ);

    model.root.parent = anchor;
    model.root.position = Vector3.Zero();

    passengers.push({ model, anchor, phase: Math.random() * 10 });
  }
}

/** Reposition existing passengers to match current tray position/size without respawning. */
function repositionPassengers() {
  if (passengers.length === 0) return;

  const trayX = getNumVal('pos-pt-x') || PASSENGER_TRAY_POSITION[0];
  const trayY = getNumVal('pos-pt-y') || PASSENGER_TRAY_POSITION[1];
  const trayZ = getNumVal('pos-pt-z') || PASSENGER_TRAY_POSITION[2];
  const roofW = getNumVal('pos-pts-w') || PASSENGER_TRAY_SIZE[0];
  const roofL = getNumVal('pos-pts-l') || PASSENGER_TRAY_SIZE[1];

  const count = passengers.length;
  const cols = Math.min(count, 3);
  const rows = Math.ceil(count / cols);
  const spacingX = cols > 1 ? roofW / (cols - 1) : 0;
  const spacingZ = rows > 1 ? roofL / (rows - 1) : 0;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const offsetX = cols > 1 ? -roofW / 2 + col * spacingX : 0;
    const offsetZ = rows > 1 ? -roofL / 2 + row * spacingZ : 0;
    passengers[i].anchor.position.set(trayX + offsetX, trayY, trayZ + offsetZ);
  }
}

// ── Camera ──
function updateCameraPosition() {
  const cx = cameraTarget.x + cameraDistance * Math.sin(cameraYaw) * Math.cos(cameraPitch);
  const cy = cameraTarget.y - cameraDistance * Math.sin(cameraPitch);
  const cz = cameraTarget.z + cameraDistance * Math.cos(cameraYaw) * Math.cos(cameraPitch);
  camera.position.set(cx, cy, cz);
  camera.setTarget(cameraTarget);
}

function updateCamera(dt: number) {
  const speed = CAMERA_MOVE_SPEED * dt;

  const fwdX = Math.sin(cameraYaw);
  const fwdZ = Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);

  if (keys['w'] || keys['arrowup']) {
    cameraTarget.x -= fwdX * speed;
    cameraTarget.z -= fwdZ * speed;
  }
  if (keys['s'] || keys['arrowdown']) {
    cameraTarget.x += fwdX * speed;
    cameraTarget.z += fwdZ * speed;
  }
  if (keys['a'] || keys['arrowleft']) {
    cameraTarget.x += rightX * speed;
    cameraTarget.z += rightZ * speed;
  }
  if (keys['d'] || keys['arrowright']) {
    cameraTarget.x -= rightX * speed;
    cameraTarget.z -= rightZ * speed;
  }
  if (keys['q']) {
    cameraTarget.y -= speed;
  }
  if (keys['e']) {
    cameraTarget.y += speed;
  }

  updateCameraPosition();
}

// ── Animations ──
function updateAnimations(dt: number, time: number) {
  // Wheel spin
  if (wheelSpinEnabled) {
    const spinSpeed = wheelRollSpeedOverride * 10; // simulate ~10 m/s bus speed in viewer
    // Rotate all wheel roots (child meshes of the wheel pivots)
    const allWheelPivots = busRoot.getChildren().filter(
      (c) => c.name.startsWith('frontWheel') || c.name.startsWith('rearWheelPivot'),
    );
    for (const pivot of allWheelPivots) {
      const wheelRoot = pivot.getChildren().find((c) => c.name.startsWith('wheelGlbRoot'));
      if (wheelRoot) {
        // Right-side wheels are flipped (rotation.y = PI) so roll direction must be negated
        const isRight = pivot.name.includes('Right') || pivot.name === 'rearWheelPivot_2';
        const direction = isRight ? -1 : 1;
        (wheelRoot as TransformNode).rotation.x += direction * spinSpeed * dt;
      }
    }
  }

  // Scoop animation
  if (scoopAnimEnabled) {
    const cycle = (Math.sin(time * 4) + 1) / 2; // 0..1
    scoopPivot.rotation.x = -cycle * (Math.PI / 2);
  }

  // Passenger sitting animation
  for (const p of passengers) {
    p.phase += dt;
    poseSittingAnimated(p.model, p.phase);
  }
}

// ── Input ──
function setupInput(canvas: HTMLCanvasElement) {
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Scroll to zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraDistance *= 1 + e.deltaY * CAMERA_ZOOM_SPEED * 0.01;
    cameraDistance = Math.max(3, Math.min(100, cameraDistance));
    updateCameraPosition();
  }, { passive: false });

  // Drag to orbit (no modifier key needed — this is a model viewer)
  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    cameraYaw -= dx * CAMERA_ORBIT_SENSITIVITY;
    cameraPitch += dy * CAMERA_ORBIT_SENSITIVITY;
    cameraPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, cameraPitch));
    dragStart = { x: e.clientX, y: e.clientY };
    updateCameraPosition();
  });

  canvas.addEventListener('pointerup', (e) => {
    isDragging = false;
    canvas.style.cursor = 'grab';
    canvas.releasePointerCapture(e.pointerId);
  });

  canvas.style.cursor = 'grab';
}

// ── UI ──
function setupUI() {
  // Visibility toggles
  const toggles: [string, () => any][] = [
    ['tog-bus', () => bodyShell],
    ['tog-wheels', () => {
      const pivots = busRoot.getChildren().filter(
        (c) => c.name.startsWith('frontWheel') || c.name.startsWith('rearWheelPivot'),
      );
      return pivots;
    }],
    ['tog-scoop', () => scoopPivot],
    ['tog-passengers', () => passengers.map((p) => p.anchor)],
    ['tog-grid', () => gridMesh],
    ['tog-axes', () => axesRoot],
  ];

  for (const [id, getTarget] of toggles) {
    const el = document.getElementById(id) as HTMLInputElement;
    if (!el) continue;
    el.addEventListener('change', () => {
      const target = getTarget();
      if (Array.isArray(target)) {
        for (const t of target) (t as TransformNode).setEnabled(el.checked);
      } else if (target) {
        (target as TransformNode).setEnabled(el.checked);
      }
    });
  }

  // Wireframe toggle
  const wireEl = document.getElementById('tog-wireframe') as HTMLInputElement;
  wireEl?.addEventListener('change', () => {
    wireframeEnabled = wireEl.checked;
    busRoot.getChildMeshes().forEach((m) => {
      if (m.material && 'wireframe' in m.material) {
        (m.material as StandardMaterial).wireframe = wireframeEnabled;
      }
    });
  });

  // Passenger count slider
  const countSlider = document.getElementById('passenger-count') as HTMLInputElement;
  const countVal = document.getElementById('passenger-count-val')!;
  countSlider?.addEventListener('input', () => {
    const count = parseInt(countSlider.value, 10);
    countVal.textContent = String(count);
    spawnPassengers(count);
  });

  // Wheel spin toggle
  const spinEl = document.getElementById('tog-wheel-spin') as HTMLInputElement;
  spinEl?.addEventListener('change', () => {
    wheelSpinEnabled = spinEl.checked;
  });

  // Wheel roll speed slider
  const wheelSpeedSlider = document.getElementById('wheel-speed') as HTMLInputElement;
  const wheelSpeedVal = document.getElementById('wheel-speed-val')!;
  wheelSpeedSlider?.addEventListener('input', () => {
    wheelRollSpeedOverride = parseFloat(wheelSpeedSlider.value);
    wheelSpeedVal.textContent = wheelSpeedSlider.value;
  });

  // Scoop anim toggle
  const scoopAnimEl = document.getElementById('tog-scoop-anim') as HTMLInputElement;
  scoopAnimEl?.addEventListener('change', () => {
    scoopAnimEnabled = scoopAnimEl.checked;
    if (!scoopAnimEnabled) {
      // Reset to slider value
      const slider = document.getElementById('scoop-angle') as HTMLInputElement;
      scoopPivot.rotation.x = -(parseInt(slider.value, 10) * Math.PI / 180);
    }
  });

  // Scoop angle slider
  const scoopSlider = document.getElementById('scoop-angle') as HTMLInputElement;
  const scoopVal = document.getElementById('scoop-angle-val')!;
  scoopSlider?.addEventListener('input', () => {
    const angle = parseInt(scoopSlider.value, 10);
    scoopVal.textContent = `${angle}°`;
    if (!scoopAnimEnabled) {
      scoopPivot.rotation.x = -(angle * Math.PI / 180);
    }
  });

  // ── Position editor ──
  setupPositionEditor();
}

// ── Position Editor ──
function getNumVal(id: string): number {
  const el = document.getElementById(id) as HTMLInputElement;
  return el ? parseFloat(el.value) || 0 : 0;
}

function generateExportText(): string {
  const fmt = (arr: number[]) => `[${arr.map(v => v.toFixed(2).replace(/\.?0+$/, '') || '0').join(', ')}]`;
  const fmtSize = (arr: number[]) => `[${arr.map(v => v.toFixed(1).replace(/\.?0+$/, '') || '0').join(', ')}]`;

  const scoop = [getNumVal('pos-scoop-x'), getNumVal('pos-scoop-y'), getNumVal('pos-scoop-z')];
  const scoopW = getNumVal('pos-scoop-w');
  const wfl = [getNumVal('pos-wfl-x'), getNumVal('pos-wfl-y'), getNumVal('pos-wfl-z')];
  const wfr = [getNumVal('pos-wfr-x'), getNumVal('pos-wfr-y'), getNumVal('pos-wfr-z')];
  const wbl = [getNumVal('pos-wbl-x'), getNumVal('pos-wbl-y'), getNumVal('pos-wbl-z')];
  const wbr = [getNumVal('pos-wbr-x'), getNumVal('pos-wbr-y'), getNumVal('pos-wbr-z')];
  const lf = [getNumVal('pos-lf-x'), getNumVal('pos-lf-y'), getNumVal('pos-lf-z')];
  const lbl = [getNumVal('pos-lbl-x'), getNumVal('pos-lbl-y'), getNumVal('pos-lbl-z')];
  const lbr = [getNumVal('pos-lbr-x'), getNumVal('pos-lbr-y'), getNumVal('pos-lbr-z')];
  const pt = [getNumVal('pos-pt-x'), getNumVal('pos-pt-y'), getNumVal('pos-pt-z')];
  const pts = [getNumVal('pos-pts-w'), getNumVal('pos-pts-l')];

  return [
    `export const SCOOP_POSITION: [number, number, number] = ${fmt(scoop)};`,
    `export const SCOOP_WIDTH: number = ${scoopW.toFixed(1).replace(/\.?0+$/, '')};`,
    `export const WHEEL_FRONT_LEFT_POSITION: [number, number, number] = ${fmt(wfl)};`,
    `export const WHEEL_FRONT_RIGHT_POSITION: [number, number, number] = ${fmt(wfr)};`,
    `export const WHEEL_BACK_LEFT_POSITION: [number, number, number] = ${fmt(wbl)};`,
    `export const WHEEL_BACK_RIGHT_POSITION: [number, number, number] = ${fmt(wbr)};`,
    `export const LIGHT_FRONT_POSITION: [number, number, number] = ${fmt(lf)};`,
    `export const LIGHT_BACK_LEFT_POSITION: [number, number, number] = ${fmt(lbl)};`,
    `export const LIGHT_BACK_RIGHT_POSITION: [number, number, number] = ${fmt(lbr)};`,
    `export const PASSENGER_TRAY_POSITION: [number, number, number] = ${fmt(pt)};`,
    `export const PASSENGER_TRAY_SIZE: [number, number] = ${fmtSize(pts)};`,
  ].join('\n');
}

function applyPositions() {
  // Scoop
  scoopPivot.position.set(getNumVal('pos-scoop-x'), getNumVal('pos-scoop-y'), getNumVal('pos-scoop-z'));
  // Scoop width — scale the scoop root proportionally to the new width
  const scoopGlbRoot = scoopPivot.getChildren(undefined, true).find(c => c.name === 'scoopGlbRoot') as TransformNode | undefined;
  if (scoopGlbRoot) {
    const newW = getNumVal('pos-scoop-w');
    const scaleFactor = newW / SCOOP_WIDTH;
    scoopGlbRoot.scaling.x = scoopGlbRoot.scaling.y * scaleFactor;
  }

  // Wheels - front
  frontWheelLeft.position.set(getNumVal('pos-wfl-x'), getNumVal('pos-wfl-y'), getNumVal('pos-wfl-z'));
  frontWheelRight.position.set(getNumVal('pos-wfr-x'), getNumVal('pos-wfr-y'), getNumVal('pos-wfr-z'));

  // Wheels - back
  const rearPivots = busRoot.getChildren().filter(c => c.name.startsWith('rearWheelPivot'));
  if (rearPivots.length >= 2) {
    // rearWheelPivot_2 = back right (index matches original wheelPositions order)
    // rearWheelPivot_3 = back left
    const backRight = rearPivots.find(p => p.name === 'rearWheelPivot_2');
    const backLeft = rearPivots.find(p => p.name === 'rearWheelPivot_3');
    if (backRight) (backRight as TransformNode).position.set(getNumVal('pos-wbr-x'), getNumVal('pos-wbr-y'), getNumVal('pos-wbr-z'));
    if (backLeft) (backLeft as TransformNode).position.set(getNumVal('pos-wbl-x'), getNumVal('pos-wbl-y'), getNumVal('pos-wbl-z'));
  }

  // Light markers
  (lightFrontMarker as any).position.set(getNumVal('pos-lf-x'), getNumVal('pos-lf-y'), getNumVal('pos-lf-z'));
  (lightBackLeftMarker as any).position.set(getNumVal('pos-lbl-x'), getNumVal('pos-lbl-y'), getNumVal('pos-lbl-z'));
  (lightBackRightMarker as any).position.set(getNumVal('pos-lbr-x'), getNumVal('pos-lbr-y'), getNumVal('pos-lbr-z'));

  // Passenger tray
  passengerTrayMarker.position.set(getNumVal('pos-pt-x'), getNumVal('pos-pt-y'), getNumVal('pos-pt-z'));
  const trayW = getNumVal('pos-pts-w');
  const trayL = getNumVal('pos-pts-l');
  passengerTrayMarker.scaling.set(trayW / PASSENGER_TRAY_SIZE[0], 1, trayL / PASSENGER_TRAY_SIZE[1]);

  // Reposition passengers to follow tray
  repositionPassengers();

  // Update export text
  const output = document.getElementById('export-output') as HTMLTextAreaElement;
  if (output) output.value = generateExportText();
}

function setupPositionEditor() {
  // Populate inputs from the imported constants (single source of truth)
  function setVal(id: string, v: number) {
    const el = document.getElementById(id) as HTMLInputElement;
    if (el) el.value = String(v);
  }
  setVal('pos-scoop-x', SCOOP_POSITION[0]);
  setVal('pos-scoop-y', SCOOP_POSITION[1]);
  setVal('pos-scoop-z', SCOOP_POSITION[2]);
  setVal('pos-scoop-w', SCOOP_WIDTH);
  setVal('pos-wfl-x', WHEEL_FRONT_LEFT_POSITION[0]);
  setVal('pos-wfl-y', WHEEL_FRONT_LEFT_POSITION[1]);
  setVal('pos-wfl-z', WHEEL_FRONT_LEFT_POSITION[2]);
  setVal('pos-wfr-x', WHEEL_FRONT_RIGHT_POSITION[0]);
  setVal('pos-wfr-y', WHEEL_FRONT_RIGHT_POSITION[1]);
  setVal('pos-wfr-z', WHEEL_FRONT_RIGHT_POSITION[2]);
  setVal('pos-wbl-x', WHEEL_BACK_LEFT_POSITION[0]);
  setVal('pos-wbl-y', WHEEL_BACK_LEFT_POSITION[1]);
  setVal('pos-wbl-z', WHEEL_BACK_LEFT_POSITION[2]);
  setVal('pos-wbr-x', WHEEL_BACK_RIGHT_POSITION[0]);
  setVal('pos-wbr-y', WHEEL_BACK_RIGHT_POSITION[1]);
  setVal('pos-wbr-z', WHEEL_BACK_RIGHT_POSITION[2]);
  setVal('pos-lf-x', LIGHT_FRONT_POSITION[0]);
  setVal('pos-lf-y', LIGHT_FRONT_POSITION[1]);
  setVal('pos-lf-z', LIGHT_FRONT_POSITION[2]);
  setVal('pos-lbl-x', LIGHT_BACK_LEFT_POSITION[0]);
  setVal('pos-lbl-y', LIGHT_BACK_LEFT_POSITION[1]);
  setVal('pos-lbl-z', LIGHT_BACK_LEFT_POSITION[2]);
  setVal('pos-lbr-x', LIGHT_BACK_RIGHT_POSITION[0]);
  setVal('pos-lbr-y', LIGHT_BACK_RIGHT_POSITION[1]);
  setVal('pos-lbr-z', LIGHT_BACK_RIGHT_POSITION[2]);
  setVal('pos-pt-x', PASSENGER_TRAY_POSITION[0]);
  setVal('pos-pt-y', PASSENGER_TRAY_POSITION[1]);
  setVal('pos-pt-z', PASSENGER_TRAY_POSITION[2]);
  setVal('pos-pts-w', PASSENGER_TRAY_SIZE[0]);
  setVal('pos-pts-l', PASSENGER_TRAY_SIZE[1]);

  // Attach listeners to all position inputs
  const allInputs = document.querySelectorAll<HTMLInputElement>('.pos-row input[type="number"]');
  for (const input of allInputs) {
    input.addEventListener('input', applyPositions);
  }

  // Export / copy button
  const exportBtn = document.getElementById('export-btn');
  exportBtn?.addEventListener('click', () => {
    const output = document.getElementById('export-output') as HTMLTextAreaElement;
    if (output) {
      navigator.clipboard.writeText(output.value).then(() => {
        exportBtn.textContent = 'Copied!';
        setTimeout(() => { exportBtn.textContent = 'Copy to Clipboard'; }, 1500);
      });
    }
  });

  // Initial export text
  applyPositions();
}

// ── Start ──
init().catch((err) => {
  console.error('Bus viewer init failed:', err);
  const info = document.getElementById('info');
  if (info) info.textContent = `Error: ${err.message}`;
});
