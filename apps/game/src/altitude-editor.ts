/**
 * 3D Altitude Editor
 *
 * A Babylon.js-based editor for viewing and editing altitude points on level terrain.
 * Supports:
 * - 3D view of the terrain mesh with buildings, trees, water, course path
 * - Toggle-able layer visibility
 * - WASD/Arrow camera movement, Cmd+click+drag orbit
 * - Click to select altitude points, drag to move up/down
 * - Double-click to add new altitude points
 * - Sidebar shows lat/lng/alt of selected point (editable)
 * - Export altitude.json
 */

import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  VertexBuffer,
  VertexData,
  TransformNode,
  PointerEventTypes,
  LinesMesh,
  PickingInfo,
} from '@babylonjs/core';
import earcut from 'earcut';
import { gpsToLocal, gpsPointToLocal } from './api';
import { loadLevel, levels } from './levels';
import type { LevelData } from './levels';
import {
  altitudeToLocal,
  computeTerrainHeightIDW,
  computeBuildingFootprintData,
  computeWaterZones,
  computeRoadPolylines,
  buildWaterMeshes,
  getWaterDepressionAt,
} from './game/systems/terrain';
import type { LocalAltitudePoint } from './game/systems/terrain';
import type { WaterZone } from './game/types';
import { createTiledPathGroundMaterial } from './game/PathShaderTiled';
import {
  ALTITUDE_EXAGGERATION,
  COURSE_TARGET_LENGTH,
  PATH_HALF_WIDTH,
} from './game/constants';

// ── Global state ──

let engine: Engine;
let scene: Scene;
let camera: FreeCamera;
let level: LevelData;
let originCoord: number[];
let scaleFactor: number;
let elevationScale: number;

// Altitude data (mutable — what we edit)
let altitudeData: [number, number, number][]; // [lat, lon, alt][]
let localAltPoints: LocalAltitudePoint[];

// Computed world-space data for terrain shader
let pathPositionsWorld: [number, number][] = [];
let pathHeightsWorld: number[] = [];
let roadPolylines: [number, number][][] = [];
let trailPolylines: [number, number][][] = [];
let fieldPolygons: [number, number][][] = [];
let concretePolygons: [number, number][][] = [];
let waterZones: WaterZone[] = [];

// Meshes by layer
let groundMesh: Mesh | null = null;
let groundWireframe: LinesMesh | null = null;
let buildingRoot: TransformNode | null = null;
let treeRoot: TransformNode | null = null;
let waterRoot: TransformNode | null = null;
let courseLines: LinesMesh | null = null;
let altPointMeshes: Mesh[] = [];
let altPointRoot: TransformNode | null = null;

// Selection state
let selectedPointIndex: number | null = null;
let selectedMesh: Mesh | null = null;
const POINT_RADIUS = 4;
const POINT_SELECTED_RADIUS = 6;

// Camera controls
const keys: Record<string, boolean> = {};
let isOrbiting = false;
let orbitStart = { x: 0, y: 0 };
let cameraYaw = 0; // radians
let cameraPitch = -0.6; // radians (looking slightly down)
let cameraTarget = new Vector3(0, 0, 0);
let cameraDistance = 300;
const CAMERA_MOVE_SPEED = 400; // units/sec
const CAMERA_ORBIT_SENSITIVITY = 0.005;
const CAMERA_ZOOM_SPEED = 0.1;
const MIN_PITCH = -Math.PI / 2 + 0.05;
const MAX_PITCH = -0.05;

// ── Level picker ──

function populateLevelPicker() {
  const select = document.getElementById('level-select') as HTMLSelectElement;
  if (!select) { console.error('level-select element not found'); return; }
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('event') ?? params.get('level') ?? '';

  const entries = Object.entries(levels);
  console.log('[altitude-editor] levels:', entries.length, entries.map(([id]) => id));

  // Show ALL levels in the editor (including hidden ones)
  for (const [id, meta] of entries) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = meta.name + (meta.hide ? ' (hidden)' : '');
    if (id === preselect) opt.selected = true;
    select.appendChild(opt);
  }

  if (preselect && Object.keys(levels).includes(preselect)) {
    // Auto-start
    document.getElementById('level-picker')?.remove();
    initEditor(preselect);
  }
}

(window as any).startEditor = () => {
  const select = document.getElementById('level-select') as HTMLSelectElement | null;
  const levelId = select?.value ?? 'haga';
  // Update URL with ?event= param
  const url = new URL(window.location.href);
  url.searchParams.set('event', levelId);
  window.history.replaceState({}, '', url.toString());
  document.getElementById('level-picker')?.remove();
  initEditor(levelId);
};

// ── Coordinate helpers ──

function gpsToWorld(lat: number, lon: number): [number, number] {
  const [rawX, rawZ] = gpsPointToLocal(lon, lat, originCoord);
  return [rawX * scaleFactor, rawZ * scaleFactor];
}

function worldToGps(x: number, z: number): [number, number] {
  const toRad = Math.PI / 180;
  const R = 6_371_000;
  const cosLat = Math.cos(originCoord[1] * toRad);
  const lon = x / (scaleFactor * toRad * R * cosLat) + originCoord[0];
  const lat = z / (scaleFactor * toRad * R) + originCoord[1];
  return [lat, lon];
}

function getTerrainHeight(x: number, z: number): number {
  return computeTerrainHeightIDW(x, z, localAltPoints);
}

// ── Main init ──

async function initEditor(levelId: string) {
  const info = document.getElementById('info')!;
  info.textContent = `Loading ${levelId}…`;

  level = await loadLevel(levelId);
  altitudeData = [...level.altitude.map((p) => [...p] as [number, number, number])];

  const course = level.course;
  originCoord = course.coordinates[0];

  const elevations = course.coordinates.map((c) => c[2] ?? 0);
  const { positions, heights, totalDistance } = gpsToLocal(course.coordinates, elevations);

  const courseTargetLength = level.targetLength ?? COURSE_TARGET_LENGTH;
  scaleFactor = totalDistance > 0 ? courseTargetLength / totalDistance : 1;
  elevationScale = scaleFactor * ALTITUDE_EXAGGERATION;

  // Convert altitude to local coords
  localAltPoints = altitudeToLocal(altitudeData, originCoord, scaleFactor, elevationScale);

  // Path in world coordinates
  const pathPositions: [number, number][] = positions.map(([x, z]) => [
    x * scaleFactor,
    z * scaleFactor,
  ]);
  const pathHeights = heights.map((h) => h * elevationScale);
  pathPositionsWorld = pathPositions;
  pathHeightsWorld = pathHeights;

  // Compute world-space data for terrain shader
  const waterFeatures = level.water;
  const roadFeatures = level.roads ?? [];
  const pathFeatures = level.paths ?? [];

  waterZones = computeWaterZones(waterFeatures, originCoord, scaleFactor, (x, z) => getTerrainHeight(x, z));
  roadPolylines = computeRoadPolylines(roadFeatures, originCoord, scaleFactor);
  trailPolylines = pathFeatures.map((p) =>
    p.points.map(([lat, lon]): [number, number] => {
      const [rawX, rawZ] = gpsPointToLocal(lon, lat, originCoord);
      return [rawX * scaleFactor, rawZ * scaleFactor];
    }),
  ).filter((t) => t.length >= 2);

  const gpsToWorldPoly = (polygon: [number, number][]) =>
    polygon.map(([lat, lon]): [number, number] => {
      const [rawX, rawZ] = gpsPointToLocal(lon, lat, originCoord);
      return [rawX * scaleFactor, rawZ * scaleFactor];
    });
  fieldPolygons = (level.regions?.fields ?? []).map(gpsToWorldPoly);
  concretePolygons = (level.regions?.concrete ?? []).map(gpsToWorldPoly);

  // ── Babylon.js setup ──
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  engine = new Engine(canvas, true, { stencil: true });
  scene = new Scene(engine);
  scene.clearColor = new Color4(0.55, 0.75, 0.95, 1);

  // Camera — we'll position it manually
  camera = new FreeCamera('cam', new Vector3(0, 100, -200), scene);
  camera.minZ = 1;
  camera.maxZ = 10000;
  camera.fov = 1.0;
  camera.inputs.clear(); // We handle input ourselves

  // Center camera on path centroid
  if (pathPositions.length > 0) {
    let cx = 0, cz = 0;
    for (const [x, z] of pathPositions) { cx += x; cz += z; }
    cx /= pathPositions.length;
    cz /= pathPositions.length;
    cameraTarget = new Vector3(cx, 0, cz);
  }

  // Lights
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;
  hemi.groundColor = new Color3(0.3, 0.35, 0.3);

  const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.3), scene);
  sun.intensity = 0.8;

  // ── Build layers ──
  buildGroundMesh(pathPositions, pathHeights);
  buildCoursePath(pathPositions, pathHeights);
  buildBuildingsSimple();
  buildTreesSimple();
  buildWater();
  buildAltitudePoints();

  // ── Camera & input ──
  setupInput(canvas);
  updateCameraPosition();

  // ── UI bindings ──
  setupToggles();
  setupPointEditor();
  setupExport();

  // ── Render loop ──
  let lastTime = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    updateCamera(dt);
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());

  info.textContent = `${level.name} — ${altitudeData.length} altitude points`;
  (document.getElementById('stats') as HTMLElement).textContent =
    `Level: ${level.name}\nPoints: ${altitudeData.length}\nScale: ${scaleFactor.toFixed(2)}`;
}

// ── Ground mesh ──

function buildGroundMesh(pathPositions?: [number, number][], pathHeights?: number[]) {
  if (groundMesh) { groundMesh.dispose(); groundMesh = null; }
  if (groundWireframe) { groundWireframe.dispose(); groundWireframe = null; }

  const subdivisions = 400;
  const size = 6000;

  groundMesh = MeshBuilder.CreateGround('ground', {
    width: size, height: size, subdivisions, updatable: true,
  }, scene);

  // Apply the same terrain shader as the game
  const pp = pathPositions ?? pathPositionsWorld;
  const startLineInfo = pp.length > 1
    ? {
        x: pp[0][0],
        z: pp[0][1],
        yaw: Math.atan2(pp[1][0] - pp[0][0], pp[1][1] - pp[0][1]),
        width: PATH_HALF_WIDTH * 2,
        thickness: 0.5,
      }
    : undefined;

  const shaderOpts = {
    pathPositions: pp,
    roads: roadPolylines,
    trails: trailPolylines,
    groundSize: size,
    pathHalfWidth: PATH_HALF_WIDTH,
    roadHalfWidth: PATH_HALF_WIDTH * 1.4,
    edgeSoftness: 1.5,
    maskResolution: 2048,
    startLine: startLineInfo,
    fields: fieldPolygons,
    concrete: concretePolygons,
    waterZones,
    isNight: level.timeOfDay === 'night',
  };

  try {
    const tiledMat = createTiledPathGroundMaterial(scene, shaderOpts);
    groundMesh.material = tiledMat;
  } catch (err) {
    console.warn('[altitude-editor] Terrain shader failed, falling back to solid color:', err);
    const grassMat = new StandardMaterial('grassMat', scene);
    grassMat.diffuseColor = new Color3(0.35, 0.55, 0.25);
    grassMat.specularColor = Color3.Black();
    groundMesh.material = grassMat;
  }

  applyTerrainHeights(groundMesh);

  // Build wireframe version (hidden by default)
  buildGroundWireframe(groundMesh);
}

function applyTerrainHeights(mesh: Mesh) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) return;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    let h = getTerrainHeight(x, z) - 0.08;

    // Depress terrain inside / near water zones (same as game)
    const waterInfo = getWaterDepressionAt(x, z, waterZones, (wx, wz) => getTerrainHeight(wx, wz));
    if (waterInfo !== null) {
      h = waterInfo;
    }

    positions[i + 1] = h;
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind, positions);

  const normals = mesh.getVerticesData(VertexBuffer.NormalKind);
  const indices = mesh.getIndices();
  if (normals && indices) {
    VertexData.ComputeNormals(positions, indices, normals);
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  }
}

function buildGroundWireframe(ground: Mesh) {
  if (groundWireframe) groundWireframe.dispose();

  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  const indices = ground.getIndices();
  if (!positions || !indices) return;

  // Build lines from triangle edges
  const edgeSet = new Set<string>();
  const linePoints: Vector3[] = [];

  for (let i = 0; i < indices.length; i += 3) {
    const pairs = [
      [indices[i], indices[i + 1]],
      [indices[i + 1], indices[i + 2]],
      [indices[i + 2], indices[i]],
    ];
    for (const [a, b] of pairs) {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      linePoints.push(
        new Vector3(positions[a * 3], positions[a * 3 + 1] + 0.1, positions[a * 3 + 2]),
        new Vector3(positions[b * 3], positions[b * 3 + 1] + 0.1, positions[b * 3 + 2]),
      );
    }
  }

  // Create line segments in batches (Babylon LineSystem)
  const lines: Vector3[][] = [];
  for (let i = 0; i < linePoints.length; i += 2) {
    lines.push([linePoints[i], linePoints[i + 1]]);
  }

  groundWireframe = MeshBuilder.CreateLineSystem('groundWire', { lines }, scene);
  groundWireframe.color = new Color3(0.4, 0.6, 0.3);
  groundWireframe.alpha = 0.4;
  groundWireframe.isVisible = false; // hidden by default
}

// ── Course path ──

function buildCoursePath(pathPositions: [number, number][], pathHeights: number[]) {
  if (courseLines) courseLines.dispose();

  const points: Vector3[] = pathPositions.map(([x, z], i) => {
    const y = (pathHeights[i] ?? getTerrainHeight(x, z)) + 0.5;
    return new Vector3(x, y, z);
  });

  if (points.length < 2) return;

  courseLines = MeshBuilder.CreateLines('course', { points }, scene);
  courseLines.color = new Color3(1, 0.3, 0.2);
  courseLines.alpha = 0.9;
}

// ── Buildings (simplified) ──

function buildBuildingsSimple() {
  if (buildingRoot) buildingRoot.dispose();
  buildingRoot = new TransformNode('buildings', scene);

  const buildings = level.buildings ?? [];
  if (buildings.length === 0) return;

  const footprints = computeBuildingFootprintData(buildings, originCoord, scaleFactor);

  const matColors: Record<string, Color3> = {
    grey: new Color3(0.56, 0.56, 0.6),
    red: new Color3(0.66, 0.19, 0.14),
    green: new Color3(0.55, 0.62, 0.49),
    yellow: new Color3(1.0, 0.82, 0.13),
    kristineberg: new Color3(0.56, 0.56, 0.6),
  };

  for (let i = 0; i < footprints.length; i++) {
    const fp = footprints[i];
    if (fp.points.length < 3) continue;

    const color = matColors[fp.type] ?? matColors.grey;
    const wallMat = new StandardMaterial(`bldg_${i}`, scene);
    wallMat.diffuseColor = color;
    wallMat.specularColor = Color3.Black();

    // Compute centroid + ground Y
    let cx = 0, cz = 0;
    for (const [x, z] of fp.points) { cx += x; cz += z; }
    cx /= fp.points.length;
    cz /= fp.points.length;
    const groundY = getTerrainHeight(cx, cz);

    // Create polygon shape for earcut extrusion
    const shapePts = fp.points.map(([x, z]) => new Vector3(x - cx, 0, z - cz));

    // Ensure the polygon is closed
    const first = shapePts[0];
    const last = shapePts[shapePts.length - 1];
    if (first.x !== last.x || first.z !== last.z) {
      shapePts.push(first.clone());
    }

    const height = fp.height ?? 10;

    try {
      const building = MeshBuilder.CreatePolygon(
        `building_${i}`,
        { shape: shapePts, depth: height },
        scene,
        earcut,
      );
      building.position.set(cx, groundY + height, cz);
      building.material = wallMat;
      building.parent = buildingRoot;
    } catch {
      // Skip buildings that fail earcut triangulation
    }
  }
}

// ── Trees (simplified — instanced cones on cylinders) ──

function buildTreesSimple() {
  if (treeRoot) treeRoot.dispose();
  treeRoot = new TransformNode('trees', scene);

  // Only show manual trees + a few procedural ones
  const manualTrees = level.manualTrees ?? [];

  const trunkMat = new StandardMaterial('trunkMat', scene);
  trunkMat.diffuseColor = new Color3(0.4, 0.26, 0.13);
  trunkMat.specularColor = Color3.Black();

  const foliageMat = new StandardMaterial('foliageMat', scene);
  foliageMat.diffuseColor = new Color3(0.2, 0.5, 0.15);
  foliageMat.specularColor = Color3.Black();

  // Template meshes for instancing
  const trunkTpl = MeshBuilder.CreateCylinder('tpl_trunk', {
    height: 3.5, diameterTop: 0.3, diameterBottom: 0.45, tessellation: 6,
  }, scene);
  trunkTpl.material = trunkMat;
  trunkTpl.isVisible = false;

  const crownTpl = MeshBuilder.CreateCylinder('tpl_crown', {
    height: 5.5, diameterTop: 0, diameterBottom: 4, tessellation: 6,
  }, scene);
  crownTpl.material = foliageMat;
  crownTpl.isVisible = false;

  function placeTree(lat: number, lon: number, idx: number) {
    const [wx, wz] = gpsToWorld(lat, lon);
    const gy = getTerrainHeight(wx, wz);

    const trunk = trunkTpl.createInstance(`mtrunk_${idx}`);
    trunk.position.set(wx, gy + 1.75, wz);
    trunk.parent = treeRoot;

    const crown = crownTpl.createInstance(`mcrown_${idx}`);
    crown.position.set(wx, gy + 5.75, wz);
    crown.parent = treeRoot;
  }

  manualTrees.forEach(([lat, lon], i) => placeTree(lat, lon, i));

  // If level has procedural trees enabled, scatter some simple ones:
  if (level.trees !== false) {
    const pathPositions: [number, number][] = [];
    const coords = level.course.coordinates;
    for (const c of coords) {
      const [rawX, rawZ] = gpsPointToLocal(c[0], c[1], originCoord);
      pathPositions.push([rawX * scaleFactor, rawZ * scaleFactor]);
    }

    // Simple seeded scatter
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    };

    const treeCount = Math.min(500, pathPositions.length * 10);
    let placed = 0;
    let attempts = 0;
    while (placed < treeCount && attempts < treeCount * 20) {
      attempts++;
      const srcIdx = Math.floor(rand() * pathPositions.length);
      const [sx, sz] = pathPositions[srcIdx];
      const angle = rand() * Math.PI * 2;
      const dist = 30 + rand() * 300;
      const x = sx + Math.cos(angle) * dist;
      const z = sz + Math.sin(angle) * dist;

      const trunk = trunkTpl.createInstance(`ptrunk_${placed}`);
      const gy = getTerrainHeight(x, z);
      const scale = 0.7 + rand() * 0.6;
      trunk.position.set(x, gy + 1.75 * scale, z);
      trunk.scaling.setAll(scale);
      trunk.parent = treeRoot;

      const crown = crownTpl.createInstance(`pcrown_${placed}`);
      crown.position.set(x, gy + 5.75 * scale, z);
      crown.scaling.setAll(scale);
      crown.parent = treeRoot;

      placed++;
    }
  }
}

// ── Water (same as game) ──

function buildWater() {
  // Dispose previous water meshes
  if (waterRoot) waterRoot.dispose();
  waterRoot = new TransformNode('water', scene);

  if (waterZones.length === 0) return;

  // Use the exact same water rendering as the game
  const meshes = buildWaterMeshes(scene, waterZones);
  // Parent all created meshes under waterRoot for toggle-ability
  for (const mesh of scene.meshes) {
    if (mesh.name.startsWith('water_') && !mesh.parent) {
      mesh.parent = waterRoot;
    }
  }
}

// ── Altitude point markers ──

function buildAltitudePoints() {
  if (altPointRoot) altPointRoot.dispose();
  altPointMeshes = [];
  altPointRoot = new TransformNode('altPoints', scene);

  const normalMat = new StandardMaterial('altPtMat', scene);
  normalMat.diffuseColor = new Color3(1, 0.3, 0.1);
  normalMat.emissiveColor = new Color3(0.3, 0.08, 0.02);
  normalMat.specularColor = Color3.Black();

  for (let i = 0; i < localAltPoints.length; i++) {
    const pt = localAltPoints[i];
    const sphere = MeshBuilder.CreateSphere(`altPt_${i}`, {
      diameter: POINT_RADIUS * 2,
      segments: 8,
    }, scene);
    sphere.position.set(pt.x, pt.h, pt.z);
    sphere.material = normalMat;
    sphere.parent = altPointRoot;
    sphere.metadata = { altIndex: i };
    altPointMeshes.push(sphere);
  }
}

function updatePointPosition(index: number) {
  if (index < 0 || index >= altPointMeshes.length) return;
  const pt = localAltPoints[index];
  altPointMeshes[index].position.set(pt.x, pt.h, pt.z);
}

function rebuildTerrain() {
  localAltPoints = altitudeToLocal(altitudeData, originCoord, scaleFactor, elevationScale);

  // Refresh ground
  if (groundMesh) {
    applyTerrainHeights(groundMesh);
    if (groundWireframe) {
      groundWireframe.dispose();
      buildGroundWireframe(groundMesh);
      groundWireframe!.isVisible = (document.getElementById('tog-wireframe') as HTMLInputElement).checked;
    }
  }

  // Refresh point markers
  buildAltitudePoints();
  selectedPointIndex = null;
  selectedMesh = null;
  updatePointEditorUI();
}

// ── Camera ──

function updateCameraPosition() {
  const cx = cameraTarget.x + cameraDistance * Math.sin(cameraYaw) * Math.cos(cameraPitch);
  const cy = cameraTarget.y + cameraDistance * Math.abs(Math.sin(cameraPitch));
  const cz = cameraTarget.z + cameraDistance * Math.cos(cameraYaw) * Math.cos(cameraPitch);
  camera.position.set(cx, cy, cz);
  camera.setTarget(cameraTarget);
}

function updateCamera(dt: number) {
  const speed = CAMERA_MOVE_SPEED * dt;

  // Forward direction in XZ plane
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

  // Keep target Y at terrain height
  cameraTarget.y = getTerrainHeight(cameraTarget.x, cameraTarget.z);

  updateCameraPosition();
}

// ── Input handling ──

function setupInput(canvas: HTMLCanvasElement) {
  // Keyboard
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Mouse wheel — zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraDistance *= 1 + e.deltaY * CAMERA_ZOOM_SPEED * 0.01;
    cameraDistance = Math.max(20, Math.min(3000, cameraDistance));
    updateCameraPosition();
  }, { passive: false });

  // Pointer events for orbit and point selection/dragging
  let isDraggingPoint = false;
  let dragStartY = 0;
  let dragOriginalAlt = 0;
  let pointerDownTime = 0;
  let pointerDownPos = { x: 0, y: 0 };
  let lastClickTime = 0;
  let lastClickPos = { x: 0, y: 0 };

  canvas.addEventListener('pointerdown', (e) => {
    pointerDownTime = performance.now();
    pointerDownPos = { x: e.clientX, y: e.clientY };

    if (e.metaKey || e.ctrlKey) {
      // Orbit start
      isOrbiting = true;
      orbitStart = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    // Try to pick an altitude point
    const pick = scene.pick(e.clientX, e.clientY, (mesh) => {
      return mesh.metadata?.altIndex !== undefined;
    });

    if (pick?.hit && pick.pickedMesh?.metadata?.altIndex !== undefined) {
      const idx = pick.pickedMesh.metadata.altIndex as number;
      selectPoint(idx);
      isDraggingPoint = true;
      dragStartY = e.clientY;
      dragOriginalAlt = altitudeData[idx][2];
      canvas.style.cursor = 'ns-resize';
      e.preventDefault();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (isOrbiting) {
      const dx = e.clientX - orbitStart.x;
      const dy = e.clientY - orbitStart.y;
      cameraYaw -= dx * CAMERA_ORBIT_SENSITIVITY;
      cameraPitch += dy * CAMERA_ORBIT_SENSITIVITY;
      cameraPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, cameraPitch));
      orbitStart = { x: e.clientX, y: e.clientY };
      updateCameraPosition();
      return;
    }

    if (isDraggingPoint && selectedPointIndex !== null) {
      // Dragging up/down changes altitude
      const dy = dragStartY - e.clientY; // up is positive
      const altDelta = dy * 0.05; // scale sensitivity
      altitudeData[selectedPointIndex][2] = dragOriginalAlt + altDelta;

      // Update local point
      localAltPoints = altitudeToLocal(altitudeData, originCoord, scaleFactor, elevationScale);
      updatePointPosition(selectedPointIndex);
      updatePointEditorUI();
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    const elapsed = performance.now() - pointerDownTime;
    const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    const wasClick = elapsed < 300 && moved < 5;

    if (isOrbiting) {
      isOrbiting = false;
      canvas.style.cursor = 'default';
      return;
    }

    if (isDraggingPoint) {
      isDraggingPoint = false;
      canvas.style.cursor = 'default';

      // If it was a short click (not a real drag), just keep selection
      // If it was a drag, rebuild terrain with new heights
      if (!wasClick && selectedPointIndex !== null) {
        rebuildTerrainKeepSelection();
      }
      return;
    }

    // Click on empty space — deselect
    if (wasClick) {
      // Check for double-click
      const now = performance.now();
      const dblClickDist = Math.hypot(e.clientX - lastClickPos.x, e.clientY - lastClickPos.y);
      if (now - lastClickTime < 400 && dblClickDist < 10) {
        // Double-click — add new point
        handleDoubleClick(e);
        lastClickTime = 0;
      } else {
        // Single click on empty — deselect
        const pick = scene.pick(e.clientX, e.clientY, (mesh) => {
          return mesh.metadata?.altIndex !== undefined;
        });
        if (!pick?.hit) {
          deselectPoint();
        }
        lastClickTime = now;
        lastClickPos = { x: e.clientX, y: e.clientY };
      }
    }
  });

  // Prevent context menu
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleDoubleClick(e: PointerEvent) {
  // Pick the ground to find where the user double-clicked
  const pick = scene.pick(e.clientX, e.clientY, (mesh) => {
    return mesh === groundMesh;
  });

  if (pick?.hit && pick.pickedPoint) {
    const wp = pick.pickedPoint;
    const [lat, lon] = worldToGps(wp.x, wp.z);
    // Use current terrain height as the altitude — convert from local scaled back to GPS alt
    const minElev = altitudeData.length > 0 ? Math.min(...altitudeData.map((p) => p[2])) : 0;
    const localH = getTerrainHeight(wp.x, wp.z);
    const alt = localH / elevationScale + minElev;

    altitudeData.push([lat, lon, alt]);
    rebuildTerrain();

    // Select the new point
    selectPoint(altitudeData.length - 1);
  }
}

// ── Point selection ──

let _selectedMat: StandardMaterial | null = null;
let _normalMat: StandardMaterial | null = null;

function getSelectedMat(): StandardMaterial {
  if (!_selectedMat) {
    _selectedMat = new StandardMaterial('altPtSelMat2', scene);
    _selectedMat.diffuseColor = new Color3(1, 1, 0);
    _selectedMat.emissiveColor = new Color3(0.5, 0.5, 0);
    _selectedMat.specularColor = Color3.Black();
  }
  return _selectedMat;
}

function getNormalMat(): StandardMaterial {
  if (!_normalMat) {
    _normalMat = new StandardMaterial('altPtNormMat', scene);
    _normalMat.diffuseColor = new Color3(1, 0.3, 0.1);
    _normalMat.emissiveColor = new Color3(0.3, 0.08, 0.02);
    _normalMat.specularColor = Color3.Black();
  }
  return _normalMat;
}

function selectPoint(index: number) {
  // Deselect previous
  if (selectedMesh) {
    selectedMesh.material = getNormalMat();
    selectedMesh.scaling.setAll(1);
  }

  selectedPointIndex = index;
  selectedMesh = altPointMeshes[index] ?? null;

  if (selectedMesh) {
    selectedMesh.material = getSelectedMat();
    selectedMesh.scaling.setAll(POINT_SELECTED_RADIUS / POINT_RADIUS);
  }

  updatePointEditorUI();
  document.getElementById('point-editor')!.classList.add('visible');
}

function deselectPoint() {
  if (selectedMesh) {
    selectedMesh.material = getNormalMat();
    selectedMesh.scaling.setAll(1);
  }
  selectedPointIndex = null;
  selectedMesh = null;
  updatePointEditorUI();
  document.getElementById('point-editor')!.classList.remove('visible');
}

function updatePointEditorUI() {
  const latInput = document.getElementById('pt-lat') as HTMLInputElement;
  const lonInput = document.getElementById('pt-lon') as HTMLInputElement;
  const altInput = document.getElementById('pt-alt') as HTMLInputElement;

  if (selectedPointIndex !== null && selectedPointIndex < altitudeData.length) {
    const [lat, lon, alt] = altitudeData[selectedPointIndex];
    latInput.value = lat.toFixed(6);
    lonInput.value = lon.toFixed(6);
    altInput.value = alt.toFixed(2);
    document.getElementById('point-editor')!.classList.add('visible');
  } else {
    latInput.value = '';
    lonInput.value = '';
    altInput.value = '';
    document.getElementById('point-editor')!.classList.remove('visible');
  }

  (document.getElementById('stats') as HTMLElement).textContent =
    `Level: ${level.name}\nPoints: ${altitudeData.length}\nScale: ${scaleFactor.toFixed(2)}`;
}

function rebuildTerrainKeepSelection() {
  const selIdx = selectedPointIndex;
  localAltPoints = altitudeToLocal(altitudeData, originCoord, scaleFactor, elevationScale);

  // Refresh ground mesh
  if (groundMesh) {
    applyTerrainHeights(groundMesh);
    if (groundWireframe) {
      groundWireframe.dispose();
      buildGroundWireframe(groundMesh);
      groundWireframe!.isVisible = (document.getElementById('tog-wireframe') as HTMLInputElement).checked;
    }
  }

  // Refresh point markers
  buildAltitudePoints();

  // Re-select
  if (selIdx !== null && selIdx < altitudeData.length) {
    selectPoint(selIdx);
  } else {
    deselectPoint();
  }
}

// ── Sidebar: toggles ──

function setupToggles() {
  const bind = (id: string, getNode: () => TransformNode | Mesh | LinesMesh | null, extra?: (checked: boolean) => void) => {
    const el = document.getElementById(id) as HTMLInputElement;
    el.addEventListener('change', () => {
      const node = getNode();
      if (node) node.setEnabled(el.checked);
      extra?.(el.checked);
    });
  };

  bind('tog-ground', () => groundMesh);
  bind('tog-wireframe', () => groundWireframe, (checked) => {
    if (groundWireframe) groundWireframe.isVisible = checked;
  });
  bind('tog-buildings', () => buildingRoot);
  bind('tog-trees', () => treeRoot);
  bind('tog-water', () => waterRoot);
  bind('tog-course', () => courseLines);
  bind('tog-altpoints', () => altPointRoot);
}

// ── Sidebar: point editor ──

function setupPointEditor() {
  const latInput = document.getElementById('pt-lat') as HTMLInputElement;
  const lonInput = document.getElementById('pt-lon') as HTMLInputElement;
  const altInput = document.getElementById('pt-alt') as HTMLInputElement;

  const applyField = () => {
    if (selectedPointIndex === null) return;
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    const alt = parseFloat(altInput.value);
    if (isNaN(lat) || isNaN(lon) || isNaN(alt)) return;

    altitudeData[selectedPointIndex] = [lat, lon, alt];
    rebuildTerrainKeepSelection();
  };

  latInput.addEventListener('change', applyField);
  lonInput.addEventListener('change', applyField);
  altInput.addEventListener('change', applyField);

  // Delete point
  document.getElementById('btn-delete-point')!.addEventListener('click', () => {
    if (selectedPointIndex === null) return;
    altitudeData.splice(selectedPointIndex, 1);
    deselectPoint();
    rebuildTerrain();
  });
}

// ── Export ──

function setupExport() {
  document.getElementById('btn-export')!.addEventListener('click', async () => {
    const json = JSON.stringify(altitudeData, null, 2) + '\n';
    try {
      await navigator.clipboard.writeText(json);
      const btn = document.getElementById('btn-export')!;
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    } catch {
      // Fallback: download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'altitude.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

// ── Boot ──

populateLevelPicker();
