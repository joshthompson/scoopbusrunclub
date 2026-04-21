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
  KeyboardEventTypes,
  Texture,
  VertexBuffer,
  VertexData,
  TransformNode,
  GroundMesh,
} from '@babylonjs/core';
import { fetchCourse, gpsToLocal, gpsPointToLocal } from '../api';
import { fetchElevations, fetchWaterFeatures } from '../terrain';
import { Minimap } from './Minimap';
import { COURSE_OVERRIDES, buildCourseIndices } from '@shared/course-overrides';
import { createParkrunSign } from './objects/ParkrunSign';
import { createWaterMesh, createWaterRibbon } from './objects/Water';
import { createKmSign } from './objects/KmSign';
import { createBusModel, BusModelResult } from './objects/BusModel';
import { createCopperTent } from './objects/CopperTent';
import { createHagaGate } from './objects/HagaGate';
import { createPathGroundMaterial } from './PathShader';
import {
  createRunnerModel,
  RunnerModelResult,
  poseRunning,
  poseFlailing,
  poseSitting,
  poseStanding,
} from './objects/RunnerModel';

// ---------- Types ----------

interface GameCallbacks {
  onScoopRunner: () => void;
  onSpeedChange: (kmh: number) => void;
  onDistanceChange: (metres: number) => void;
  onAltitudeChange: (metres: number) => void;
}

interface Runner {
  mesh: Mesh;
  model: RunnerModelResult;
  /** Index along path positions the runner is heading toward */
  targetIdx: number;
  /** Speed in m/s */
  speed: number;
  /** Runner state machine */
  state: 'running' | 'launched' | 'landed' | 'sitting';
  /** Velocity for launch physics */
  velX: number;
  velY: number;
  velZ: number;
  /** Timer for post-landing sit-down */
  fadeTimer: number;
  /** Animation phase accumulator */
  animPhase: number;
  /** Persistent lateral offset from path centre (-1 to 1, scaled by path width) */
  lateralOffset: number;
}

// ---------- Constants ----------

const PATH_HALF_WIDTH = 5; // 10 m wide path
const COURSE_TARGET_LENGTH = 5000; // 5 km
const BUS_MAX_SPEED = 12 * 2; // m/s (~43 km/h)
const BUS_ACCELERATION = 12; // m/s²
const BUS_BRAKE = 8; // m/s²
const BUS_FRICTION = 2; // m/s² passive deceleration
const BUS_TURN_SPEED = 1.08; // rad/s (reduced 40% from 1.8)
const RUNNER_COUNT = 60;
const RUNNER_MIN_SPEED = 2.5; // m/s (~9 km/h)
const RUNNER_MAX_SPEED = 4.5 * 2; // m/s (~16.2 km/h)
const SCOOP_DISTANCE = 3.5; // metres — how close bus needs to be
const SCOOP_UP_FACTOR = 0.85; // upward launch = |busSpeed| × this factor
const SCOOP_MIN_UP = 10; // m/s — minimum upward launch (scoop still provides lift)
const SCOOP_FORWARD_FACTOR = 0.5; // forward launch = busSpeed × this factor (preserves direction)
const SCOOP_ANIM_DURATION = 0.35; // seconds for scoop flick animation
const RUNNER_SIT_DURATION = 5; // seconds sitting on ground before standing up
const GRAVITY = 20; // m/s² for launched runners
const BUS_START_OFFSET = 15; // metres behind the start line
const TREE_COUNT = 1200; // total trees to place
const TREE_SPREAD = 200; // metres from path — much closer for dense feel
const TREE_MIN_DIST_FROM_PATH = 8; // metres — keep trees off the track

// ---------- Seeded PRNG (mulberry32) ----------

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Game class ----------

export class Game {
  private canvas: HTMLCanvasElement;
  private engine!: Engine;
  private scene!: Scene;
  private camera!: FreeCamera;
  private callbacks: GameCallbacks;

  // Path data
  private pathPositions: [number, number][] = [];
  private pathHeights: number[] = [];
  private pathCumDist: number[] = [];
  private pathTotalDistance = 0;
  private scaleFactor = 1;
  private elevationScale = 1; // vertical exaggeration
  private originCoord: number[] = [0, 0]; // [lon, lat] of first path point

  // Bus state
  private busSpeed = 0; // m/s (forward speed)
  private busYaw = 0; // radians
  private busPitch = 0; // radians – slope tilt (positive = looking up)
  private busPos = new Vector3(0, 0, 0); // bus base position (ground level)
  private busMesh: TransformNode | null = null;
  private scoopPivot: TransformNode | null = null;
  private frontWheelLeft: TransformNode | null = null;
  private frontWheelRight: TransformNode | null = null;
  private scoopAnimTimer = 0; // >0 while scoop is animating
  private distanceTravelled = 0;

  // Input
  private keys: Record<string, boolean> = {};

  // Touch input (virtual joystick)
  private touchActive = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchDeltaX = 0; // normalised –1 to 1 (left/right)
  private touchDeltaY = 0; // normalised –1 to 1 (back/forward)

  // Runners
  private runners: Runner[] = [];

  // Water zones (local XZ polygons + Y level) — set before buildGround
  private waterZones: { points: [number, number][]; y: number }[] = [];

  // Ground mesh — stored for accurate height queries via getHeightAtCoordinates
  private groundMesh: GroundMesh | null = null;

  // Solid obstacles — circle colliders {x, z, radius}
  // Isolated so it's easy to swap for a physics engine later.
  private solidObstacles: { x: number; z: number; radius: number }[] = [];

  // Minimap
  private minimap: Minimap | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks, minimapCanvas?: HTMLCanvasElement) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    if (minimapCanvas) {
      this.minimap = new Minimap(minimapCanvas);
    }
  }

  // ---------- Initialisation ----------

  async init(eventId: string) {
    // Fetch course
    const course = await fetchCourse(eventId);

    // Apply course overrides (section ordering / laps) if available
    const override = COURSE_OVERRIDES[eventId];
    const indices = buildCourseIndices(course.coordinates.length, override);
    const orderedCoords = indices.map((i) => course.coordinates[i]);

    // Fetch elevation + water in parallel
    const [elevations, waterFeatures] = await Promise.all([
      fetchElevations(orderedCoords),
      fetchWaterFeatures(course.coordinates, 600),
    ]);

    const { positions, heights, totalDistance } = gpsToLocal(orderedCoords, elevations);

    this.scaleFactor = totalDistance > 0 ? COURSE_TARGET_LENGTH / totalDistance : 1;
    this.elevationScale = this.scaleFactor * 1; // 1:1 with horizontal scale (real proportions)
    this.originCoord = course.coordinates[0];
    this.pathPositions = positions.map(([x, z]) => [
      x * this.scaleFactor,
      z * this.scaleFactor,
    ]);
    this.pathHeights = heights.map((h) => h * this.elevationScale);
    this.pathTotalDistance = COURSE_TARGET_LENGTH;

    // Pre-compute cumulative distances along path for spline parameterisation
    this.pathCumDist = [0];
    for (let i = 1; i < this.pathPositions.length; i++) {
      const [ax, az] = this.pathPositions[i - 1];
      const [bx, bz] = this.pathPositions[i];
      const d = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
      this.pathCumDist.push(this.pathCumDist[i - 1] + d);
    }

    // Engine + scene
    this.engine = new Engine(this.canvas, true, { stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.55, 0.78, 0.95, 1); // daytime sky blue

    this.scene.clearColor = new Color4(0, 191 / 255, 1, 1);

    // Camera (third-person chase cam)
    this.camera = new FreeCamera('cam', new Vector3(0, 10, -15), this.scene);
    this.camera.minZ = 0.1;
    this.camera.fov = 1.0;
    // Disengage default camera controls — we steer manually
    this.camera.inputs.clear();

    // Lights
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.6;
    hemi.groundColor = new Color3(0.3, 0.25, 0.2);

    const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.5), this.scene);
    sun.intensity = 0.8;

    // Build world — water zones must be computed before ground so terrain dips
    this.computeWaterZones(waterFeatures, course.coordinates[0]);
    this.buildGround();
    this.buildWaterMeshes();
    this.buildTrees();
    this.buildBus();
    this.spawnRunners();
    this.placeKmSigns();

    // Place sign & position bus behind start line
    if (this.pathPositions.length > 1) {
      const [sx, sz] = this.pathPositions[0];
      const [nx, nz] = this.pathPositions[1];
      const yaw = Math.atan2(nx - sx, nz - sz);

      // Parkrun sign — to the right of the path, just after the start
      const forwardX = Math.sin(yaw);
      const forwardZ = Math.cos(yaw);
      const rightX = Math.cos(yaw);   // perpendicular right
      const rightZ = -Math.sin(yaw);
      const signX = sx + forwardX * 3 + rightX * (PATH_HALF_WIDTH + 1.5);
      const signZ = sz + forwardZ * 3 + rightZ * (PATH_HALF_WIDTH + 1.5);
      const signH = this.getGroundY(signX, signZ);
      const displayName = eventId.charAt(0).toUpperCase() + eventId.slice(1);
      createParkrunSign(this.scene, signX, signZ, yaw, displayName, signH);
      // Parkrun sign obstacle
      this.solidObstacles.push({ x: signX, z: signZ, radius: 1.5 });

      // Bus starts behind the start line
      this.busPos.x = sx - forwardX * BUS_START_OFFSET;
      this.busPos.z = sz - forwardZ * BUS_START_OFFSET;
      const startH = this.getGroundY(this.busPos.x, this.busPos.z);
      this.busPos.y = startH;
      this.busYaw = yaw;
    }

    // --- Event-specific landmarks ---
    this.placeEventLandmarks(eventId);

    // Give minimap the path data + water zones
    if (this.minimap) {
      this.minimap.setPath(this.pathPositions);
      this.minimap.setWaterZones(this.waterZones);
    }

    // Input
    this.setupInput();

    // Game loop
    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime() / 1000;
      this.update(dt);
      this.scene.render();
    });

    window.addEventListener('resize', () => this.engine.resize());
  }

  // ---------- Build environment ----------

  private buildGround() {
    const subdivisions = 200;
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: 6000, height: 6000, subdivisions, updatable: true },
      this.scene,
    );

    // Path shader: baked mask blends grass + dirt + start line on the ground
    const startLineInfo = this.pathPositions.length > 1
      ? {
          x: this.pathPositions[0][0],
          z: this.pathPositions[0][1],
          yaw: Math.atan2(
            this.pathPositions[1][0] - this.pathPositions[0][0],
            this.pathPositions[1][1] - this.pathPositions[0][1],
          ),
          width: PATH_HALF_WIDTH * 2,
          thickness: 0.5,
        }
      : undefined;

    ground.material = createPathGroundMaterial(this.scene, {
      pathPositions: this.pathPositions,
      groundSize: 6000,
      pathHalfWidth: PATH_HALF_WIDTH,
      edgeSoftness: 1.5,
      maskResolution: 4096,
      startLine: startLineInfo,
    });

    // Apply terrain heights to ground vertices so the ground undulates
    const positions = ground.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        let h = this.getTerrainHeight(x, z) - 0.08;

        // Depress terrain inside / near water zones
        const waterInfo = this.getWaterDepression(x, z);
        if (waterInfo !== null) {
          h = waterInfo;
        }

        positions[i + 1] = h;
      }
      ground.updateVerticesData(VertexBuffer.PositionKind, positions);

      // Recompute normals so lighting works with the new shape
      const normals = ground.getVerticesData(VertexBuffer.NormalKind);
      const indices = ground.getIndices();
      if (normals && indices) {
        VertexData.ComputeNormals(positions, indices, normals);
        ground.updateVerticesData(VertexBuffer.NormalKind, normals);
      }
    }

    // Cache height quads so getHeightAtCoordinates works with displaced vertices
    ground.updateCoordinateHeights();
    this.groundMesh = ground;
  }

  /**
   * Get the exact Y height of the ground mesh surface at world (x, z).
   * Uses Babylon's built-in triangle-interpolated height lookup so objects
   * sit precisely on the rendered surface — no floating or clipping.
   * Falls back to the spline-based getTerrainHeight if ground isn't built yet.
   */
  private getGroundY(x: number, z: number): number {
    if (this.groundMesh) {
      return this.groundMesh.getHeightAtCoordinates(x, z);
    }
    return this.getTerrainHeight(x, z);
  }

  // ---------- Trees ----------

  /**
   * Scatter trees across the landscape using a seeded RNG.
   * Trees avoid the path and come in two variants (trunk + foliage).
   */
  private buildTrees() {
    if (this.pathPositions.length < 2) return;

    const rand = mulberry32(42); // fixed seed → deterministic layout

    // Shared materials
    const trunkMat = new StandardMaterial('trunkMat', this.scene);
    trunkMat.diffuseColor = new Color3(0.4, 0.26, 0.13);
    trunkMat.specularColor = Color3.Black();

    const foliageMats = [
      this.makeColor('foliage0', new Color3(0.18, 0.52, 0.15)),
      this.makeColor('foliage1', new Color3(0.22, 0.58, 0.18)),
      this.makeColor('foliage2', new Color3(0.15, 0.45, 0.12)),
    ];

    let placed = 0;
    let attempts = 0;

    while (placed < TREE_COUNT && attempts < TREE_COUNT * 5) {
      attempts++;

      // Pick a random point along the path, then offset perpendicular to it
      const pathIdx = Math.floor(rand() * this.pathPositions.length);
      const [cx, cz] = this.pathPositions[pathIdx];

      // Random distance from path: between TREE_MIN_DIST and TREE_SPREAD
      const dist = TREE_MIN_DIST_FROM_PATH + rand() * (TREE_SPREAD - TREE_MIN_DIST_FROM_PATH);
      const angle = rand() * Math.PI * 2;
      const x = cx + Math.cos(angle) * dist;
      const z = cz + Math.sin(angle) * dist;

      // Reject if too close to any path segment (catches corners / overlaps)
      if (this.distToPath(x, z) < TREE_MIN_DIST_FROM_PATH) continue;

      // Reject if inside a water zone
      if (this.isInWater(x, z)) continue;

      const groundY = this.getGroundY(x, z);
      const variant = rand();
      const scale = 0.7 + rand() * 0.8; // 0.7 – 1.5

      if (variant < 0.5) {
        // -- Conifer (cylinder trunk + cone top) --
        const trunk = MeshBuilder.CreateCylinder(
          `tree_t_${placed}`,
          { height: 2.5 * scale, diameterTop: 0.25 * scale, diameterBottom: 0.35 * scale, tessellation: 6 },
          this.scene,
        );
        trunk.position.set(x, groundY + 1.25 * scale, z);
        trunk.material = trunkMat;

        const crown = MeshBuilder.CreateCylinder(
          `tree_c_${placed}`,
          { height: 4 * scale, diameterTop: 0, diameterBottom: 2.8 * scale, tessellation: 6 },
          this.scene,
        );
        crown.position.set(x, groundY + 3.5 * scale, z);
        crown.material = foliageMats[Math.floor(rand() * foliageMats.length)];
      } else {
        // -- Broad-leaf (cylinder trunk + sphere top) --
        const trunk = MeshBuilder.CreateCylinder(
          `tree_t_${placed}`,
          { height: 2 * scale, diameterTop: 0.3 * scale, diameterBottom: 0.4 * scale, tessellation: 6 },
          this.scene,
        );
        trunk.position.set(x, groundY + 1 * scale, z);
        trunk.material = trunkMat;

        const crown = MeshBuilder.CreateSphere(
          `tree_c_${placed}`,
          { diameter: 3 * scale, segments: 6 },
          this.scene,
        );
        crown.position.set(x, groundY + 3.2 * scale, z);
        crown.material = foliageMats[Math.floor(rand() * foliageMats.length)];
      }

      // Register tree as solid obstacle (trunk radius ≈ 0.4 * scale)
      this.solidObstacles.push({ x, z, radius: 0.5 * scale });

      placed++;
    }
  }

  /** Shortest distance from point (x,z) to the path polyline. */
  private distToPath(x: number, z: number): number {
    let minDist = Infinity;
    for (let i = 0; i < this.pathPositions.length - 1; i++) {
      const [ax, az] = this.pathPositions[i];
      const [bx, bz] = this.pathPositions[i + 1];
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

  private makeColor(name: string, color: Color3): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = color;
    mat.specularColor = Color3.Black();
    return mat;
  }

  // ---------- Terrain height lookup ----------

  /**
   * Catmull-Rom interpolation helper. Returns value at t in [0,1] given
   * four control-point values p0..p3.
   */
  private static catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
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

  /**
   * Get smoothly interpolated terrain height at a world (x, z) position.
   * Projects onto the nearest path segment, then applies Catmull-Rom spline
   * interpolation through path heights for a smooth curved surface.
   */
  private getTerrainHeight(x: number, z: number): number {
    const n = this.pathPositions.length;
    if (n === 0) return 0;
    if (n === 1) return this.pathHeights[0] ?? 0;

    let bestDist = Infinity;
    let bestSeg = 0;
    let bestT = 0;

    for (let i = 0; i < n - 1; i++) {
      const [ax, az] = this.pathPositions[i];
      const [bx, bz] = this.pathPositions[i + 1];
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

    // Catmull-Rom spline through the four surrounding path heights
    const i0 = Math.max(0, bestSeg - 1);
    const i1 = bestSeg;
    const i2 = Math.min(n - 1, bestSeg + 1);
    const i3 = Math.min(n - 1, bestSeg + 2);

    return Game.catmullRom(
      this.pathHeights[i0],
      this.pathHeights[i1],
      this.pathHeights[i2],
      this.pathHeights[i3],
      bestT,
    );
  }

  // ---------- Water ----------

  /**
   * Pre-compute water zone polygons in local coordinates and store them
   * so buildGround can depress the terrain beneath them.
   */
  private computeWaterZones(
    waterFeatures: import('../terrain').WaterPolygon[],
    originCoord: number[],
  ) {
    this.waterZones = [];
    console.log(`[water] Processing ${waterFeatures.length} water features`);
    for (const wf of waterFeatures) {
      const localPts: [number, number][] = wf.coords.map(([lon, lat]) => {
        const [lx, lz] = gpsPointToLocal(lon, lat, originCoord);
        return [lx * this.scaleFactor, lz * this.scaleFactor];
      });

      // Find minimum terrain height at the water boundary → water sits there
      let minH = Infinity;
      for (const [wx, wz] of localPts) {
        const h = this.getTerrainHeight(wx, wz);
        if (h < minH) minH = h;
      }
      if (!isFinite(minH)) minH = 0;

      this.waterZones.push({ points: localPts, y: minH + 0.1 });
    }
    console.log(`[water] ${this.waterZones.length} water zones stored`);
  }

  /**
   * Render the pre-computed water zones as blue meshes.
   */
  private buildWaterMeshes() {
    for (let i = 0; i < this.waterZones.length; i++) {
      const wz = this.waterZones[i];
      if (wz.points.length >= 3) {
        createWaterMesh(this.scene, `water_${i}`, wz.points, wz.y);
      } else if (wz.points.length >= 2) {
        createWaterRibbon(this.scene, `water_${i}`, wz.points, 20, wz.y);
      }
    }
  }

  /**
   * Check if a world (x, z) point is inside or near a water zone.
   * Returns the depressed Y value if so, or null if not in water.
   * Points inside get pushed below water level; points within a bank
   * distance get a smooth transition.
   */
  private getWaterDepression(x: number, z: number): number | null {
    const BANK_WIDTH = 15; // metres — transition zone around water edges

    for (const wz of this.waterZones) {
      // Quick bounding box check
      let mnX = Infinity, mxX = -Infinity, mnZ = Infinity, mxZ = -Infinity;
      for (const [px, pz] of wz.points) {
        if (px < mnX) mnX = px; if (px > mxX) mxX = px;
        if (pz < mnZ) mnZ = pz; if (pz > mxZ) mxZ = pz;
      }
      if (x < mnX - BANK_WIDTH || x > mxX + BANK_WIDTH ||
          z < mnZ - BANK_WIDTH || z > mxZ + BANK_WIDTH) continue;

      const inside = this.pointInPolygon(x, z, wz.points);
      const waterFloor = wz.y - 1.5; // lake/river bed is 1.5m below water surface

      if (inside) {
        return waterFloor;
      }

      // Check if we're within BANK_WIDTH of the polygon edge
      const distToEdge = this.distToPolygonEdge(x, z, wz.points);
      if (distToEdge < BANK_WIDTH) {
        const terrainH = this.getTerrainHeight(x, z) - 0.08;
        const t = distToEdge / BANK_WIDTH; // 0 at edge → 1 at bank limit
        // Smooth interpolation: near edge → dips toward water floor
        return terrainH * t + waterFloor * (1 - t);
      }
    }
    return null;
  }

  /** Quick check: is (x,z) inside any water zone polygon? */
  private isInWater(x: number, z: number): boolean {
    for (const wz of this.waterZones) {
      if (this.pointInPolygon(x, z, wz.points)) return true;
    }
    return false;
  }

  /** Ray-casting point-in-polygon test. */
  private pointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
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
  private distToPolygonEdge(x: number, z: number, poly: [number, number][]): number {
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

  // ---------- Km signs ----------

  /**
   * Place yellow km marker signs at 1 km, 2 km, 3 km, 4 km along the path.
   * Signs alternate sides: odd km on the right, even km on the left.
   */
  private placeKmSigns() {
    if (this.pathPositions.length < 2) return;

    // Walk the path and compute cumulative distance
    const cumDist: number[] = [0];
    for (let i = 1; i < this.pathPositions.length; i++) {
      const dx = this.pathPositions[i][0] - this.pathPositions[i - 1][0];
      const dz = this.pathPositions[i][1] - this.pathPositions[i - 1][1];
      cumDist.push(cumDist[i - 1] + Math.sqrt(dx * dx + dz * dz));
    }

    const signOffset = PATH_HALF_WIDTH + 1.5; // distance from path centre

    for (let km = 1; km <= 4; km++) {
      const targetDist = km * 1000; // metres along the scaled path
      if (targetDist >= cumDist[cumDist.length - 1]) break;

      // Find the segment containing this distance
      let segIdx = 0;
      for (let i = 1; i < cumDist.length; i++) {
        if (cumDist[i] >= targetDist) {
          segIdx = i - 1;
          break;
        }
      }

      // Interpolate position along segment
      const segLen = cumDist[segIdx + 1] - cumDist[segIdx];
      const t = segLen > 0 ? (targetDist - cumDist[segIdx]) / segLen : 0;
      const [ax, az] = this.pathPositions[segIdx];
      const [bx, bz] = this.pathPositions[segIdx + 1];
      const cx = ax + t * (bx - ax);
      const cz = az + t * (bz - az);

      // Path heading at this point
      const dx = bx - ax;
      const dz = bz - az;
      const yaw = Math.atan2(dx, dz);

      // Perpendicular direction (right side of path when facing forward)
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      // Alternate sides: odd km → right, even km → left
      const side = km % 2 === 1 ? 1 : -1;
      const signX = cx + rightX * signOffset * side;
      const signZ = cz + rightZ * signOffset * side;
      const signY = this.getGroundY(signX, signZ);

      createKmSign(this.scene, km, signX, signZ, signY, yaw);
      // Km sign obstacle
      this.solidObstacles.push({ x: signX, z: signZ, radius: 0.5 });
    }
  }

  // ---------- Event-specific landmarks ----------

  /**
   * Place real-world landmarks that exist near specific parkrun courses.
   * GPS coordinates are converted to local game space.
   */
  private placeEventLandmarks(eventId: string) {
    if (eventId === 'haga') {
      // The Copper Tent (Koppartältet) — iconic blue & gold tent building in Haga Park
      const [x1, z1] = gpsPointToLocal(18.030139, 59.364515, this.originCoord);
      const [x2, z2] = gpsPointToLocal(18.030857, 59.364715, this.originCoord);
      const lx1 = x1 * this.scaleFactor;
      const lz1 = z1 * this.scaleFactor;
      const lx2 = x2 * this.scaleFactor;
      const lz2 = z2 * this.scaleFactor;
      const tentY = this.getGroundY((lx1 + lx2) / 2, (lz1 + lz2) / 2);
      createCopperTent(this.scene, lx1, lz1, lx2, lz2, tentY);
      // Copper tent obstacle — large circular footprint around centre
      const tentCx = (lx1 + lx2) / 2;
      const tentCz = (lz1 + lz2) / 2;
      const tentLength = Math.sqrt((lx2 - lx1) ** 2 + (lz2 - lz1) ** 2);
      this.solidObstacles.push({ x: tentCx, z: tentCz, radius: tentLength * 0.45 });

      // The Royal Gate — ornate entrance gate in Haga Park
      const [gx1, gz1] = gpsPointToLocal(18.037956, 59.355194, this.originCoord);
      const [gx2, gz2] = gpsPointToLocal(18.038218, 59.355216, this.originCoord);
      const glx1 = gx1 * this.scaleFactor;
      const glz1 = gz1 * this.scaleFactor;
      const glx2 = gx2 * this.scaleFactor;
      const glz2 = gz2 * this.scaleFactor;
      const gateY = this.getGroundY((glx1 + glx2) / 2, (glz1 + glz2) / 2);
      createHagaGate(this.scene, glx1, glz1, glx2, glz2, gateY);
      // Gate pillar obstacles — two gatehouses on either side of the path
      const gateCx = (glx1 + glx2) / 2;
      const gateCz = (glz1 + glz2) / 2;
      const gateSpan = Math.sqrt((glx2 - glx1) ** 2 + (glz2 - glz1) ** 2);
      const gateScale = (gateSpan / 12) * 1.44 * 0.8;
      const gateYaw = Math.atan2(glx2 - glx1, glz2 - glz1) + Math.PI / 2;
      const gateHalfGap = 5.0 * gateScale * 2.25 / 2 + 3.5 * gateScale / 2;
      const pillarRadius = Math.max(3.5, 3.0) * gateScale * 0.6;
      // Left pillar
      this.solidObstacles.push({
        x: gateCx + Math.sin(gateYaw + Math.PI / 2) * gateHalfGap,
        z: gateCz + Math.cos(gateYaw + Math.PI / 2) * gateHalfGap,
        radius: pillarRadius,
      });
      // Right pillar
      this.solidObstacles.push({
        x: gateCx - Math.sin(gateYaw + Math.PI / 2) * gateHalfGap,
        z: gateCz - Math.cos(gateYaw + Math.PI / 2) * gateHalfGap,
        radius: pillarRadius,
      });
    }
  }

  /**
   * Create the 3D bus model and store a reference to it.
   */
  private buildBus() {
    const result = createBusModel(this.scene);
    this.busMesh = result.root;
    this.scoopPivot = result.scoopPivot;
    this.frontWheelLeft = result.frontWheelLeft;
    this.frontWheelRight = result.frontWheelRight;
  }

  // ---------- Runners ----------

  private spawnRunners() {
    if (this.pathPositions.length < 3) return;

    for (let i = 0; i < RUNNER_COUNT; i++) {
      // Spread runners along the path
      const pathFraction = (i + 1) / (RUNNER_COUNT + 1);
      const targetIdx = Math.min(
        Math.floor(pathFraction * this.pathPositions.length),
        this.pathPositions.length - 1,
      );

      const [px, pz] = this.pathPositions[targetIdx];

      // Persistent lateral offset so runners spread across the path width
      const lateralOffset = (Math.random() - 0.5) * 2 * PATH_HALF_WIDTH * 0.85;

      // Random bright t-shirt colour
      const tshirtColor = new Color3(
        0.3 + Math.random() * 0.7,
        0.3 + Math.random() * 0.7,
        0.3 + Math.random() * 0.7,
      );

      const model = createRunnerModel(this.scene, i, tshirtColor);
      const runnerGroundY = this.getGroundY(px + lateralOffset, pz);
      model.root.position = new Vector3(px + lateralOffset, runnerGroundY, pz);

      // We still need a "mesh" reference for position/rotation/visibility.
      // Use a small invisible box as the positional anchor — the model root is parented to it.
      const anchor = MeshBuilder.CreateBox(
        `runnerAnchor_${i}`,
        { width: 0.01, height: 0.01, depth: 0.01 },
        this.scene,
      );
      anchor.isVisible = false;
      anchor.position = model.root.position.clone();
      model.root.parent = anchor;
      model.root.position = Vector3.Zero();

      const speed =
        RUNNER_MIN_SPEED + Math.random() * (RUNNER_MAX_SPEED - RUNNER_MIN_SPEED);

      this.runners.push({
        mesh: anchor,
        model,
        targetIdx,
        speed,
        state: 'running',
        velX: 0, velY: 0, velZ: 0,
        fadeTimer: 0,
        animPhase: Math.random() * Math.PI * 2, // random start phase so they don't sync
        lateralOffset,
      });
    }
  }

  private updateRunners(dt: number) {
    for (const runner of this.runners) {
      const pos = runner.mesh.position;

      switch (runner.state) {
        case 'running': {
          // Move toward next path point
          const target = this.pathPositions[runner.targetIdx];
          if (!target) break;

          // Compute a perpendicular offset from the path segment so runners
          // don't all run on the exact centre line
          const nextIdx = (runner.targetIdx + 1) % this.pathPositions.length;
          const next = this.pathPositions[nextIdx];
          const segDx = next[0] - target[0];
          const segDz = next[1] - target[1];
          const segLen = Math.sqrt(segDx * segDx + segDz * segDz) || 1;
          // perpendicular (rotate 90°)
          const perpX = -segDz / segLen;
          const perpZ = segDx / segLen;

          const dx = target[0] + perpX * runner.lateralOffset - pos.x;
          const dz = target[1] + perpZ * runner.lateralOffset - pos.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < 1) {
            runner.targetIdx += 1;
            // When a runner reaches the end, loop back to the start
            if (runner.targetIdx >= this.pathPositions.length) {
              runner.targetIdx = 0;
              const [sx, sz] = this.pathPositions[0];
              pos.x = sx + runner.lateralOffset;
              pos.z = sz;
              pos.y = this.getGroundY(pos.x, pos.z);
            }
          } else {
            const move = runner.speed * dt;
            pos.x += (dx / dist) * move;
            pos.z += (dz / dist) * move;

            // Face movement direction
            runner.mesh.rotation.y = Math.atan2(dx, dz);
          }

          // Follow terrain
          pos.y = this.getGroundY(pos.x, pos.z);

          // Animate running limbs
          runner.animPhase += dt * runner.speed * 3; // faster runner = faster swing
          poseRunning(runner.model, runner.animPhase);

          // Check if scooped by bus
          const bx = this.busPos.x - pos.x;
          const bz = this.busPos.z - pos.z;
          if (Math.sqrt(bx * bx + bz * bz) < SCOOP_DISTANCE && Math.abs(this.busSpeed) > 0.5) {
            runner.state = 'launched';

            // Launch velocity: scale with bus speed & direction
            const speed = this.busSpeed; // signed: +forward, –reverse
            const absSpeed = Math.abs(speed);
            const fwdX = Math.sin(this.busYaw);
            const fwdZ = Math.cos(this.busYaw);
            runner.velX = fwdX * speed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;
            runner.velY = Math.max(SCOOP_MIN_UP, absSpeed * SCOOP_UP_FACTOR) + Math.random() * 3;
            runner.velZ = fwdZ * speed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;

            // Trigger scoop animation
            this.scoopAnimTimer = SCOOP_ANIM_DURATION;

            this.callbacks.onScoopRunner();
          }
          break;
        }

        case 'launched': {
          // Projectile physics
          runner.velY -= GRAVITY * dt;
          pos.x += runner.velX * dt;
          pos.y += runner.velY * dt;
          pos.z += runner.velZ * dt;

          // Spin the whole runner in the air + flail limbs
          runner.mesh.rotation.x += 8 * dt;
          runner.mesh.rotation.z += 5 * dt;
          runner.animPhase += dt * 12; // fast flailing
          poseFlailing(runner.model, runner.animPhase);

          // Check if landed
          const groundY = this.getGroundY(pos.x, pos.z);
          if (pos.y <= groundY && runner.velY < 0) {
            pos.y = groundY;
            runner.state = 'sitting';
            runner.fadeTimer = RUNNER_SIT_DURATION;
            // Reset body rotation to upright
            runner.mesh.rotation.x = 0;
            runner.mesh.rotation.z = 0;
            // Set sitting pose
            poseSitting(runner.model);
          }
          break;
        }

        case 'sitting': {
          // Sit on the ground for a while, then stand up and resume running
          pos.y = this.getGroundY(pos.x, pos.z);
          runner.fadeTimer -= dt;

          // Keep sitting pose
          poseSitting(runner.model);

          if (runner.fadeTimer <= 0) {
            // Stand back up
            poseStanding(runner.model);
            runner.state = 'running';
            // Find nearest path point ahead to resume running toward
            let bestDist = Infinity;
            let bestIdx = runner.targetIdx;
            for (let i = 0; i < this.pathPositions.length; i++) {
              const [px, pz] = this.pathPositions[i];
              const d = (pos.x - px) ** 2 + (pos.z - pz) ** 2;
              if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
              }
            }
            // Aim for the next point after the closest, wrapping around
            runner.targetIdx = (bestIdx + 1) % this.pathPositions.length;
          }
          break;
        }
      }
    }
  }

  // ---------- Input ----------

  private setupInput() {
    this.scene.onKeyboardObservable.add((info) => {
      const key = info.event.key.toLowerCase();
      if (info.type === KeyboardEventTypes.KEYDOWN) {
        this.keys[key] = true;
      } else if (info.type === KeyboardEventTypes.KEYUP) {
        this.keys[key] = false;
      }
    });

    // --- Touch controls (virtual joystick) ---
    const DEAD_ZONE = 15; // pixels — ignore tiny drags
    const MAX_DRAG = 80;  // pixels — full tilt distance

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      this.touchActive = true;
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.touchDeltaX = 0;
      this.touchDeltaY = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!this.touchActive || e.touches.length === 0) return;
      e.preventDefault(); // prevent scroll
      const t = e.touches[0];
      const rawX = t.clientX - this.touchStartX;
      const rawY = t.clientY - this.touchStartY;
      // Apply dead zone then normalise to –1..1
      this.touchDeltaX = Math.abs(rawX) < DEAD_ZONE ? 0
        : Math.max(-1, Math.min(1, (rawX - Math.sign(rawX) * DEAD_ZONE) / (MAX_DRAG - DEAD_ZONE)));
      this.touchDeltaY = Math.abs(rawY) < DEAD_ZONE ? 0
        : Math.max(-1, Math.min(1, (rawY - Math.sign(rawY) * DEAD_ZONE) / (MAX_DRAG - DEAD_ZONE)));
    };

    const onTouchEnd = () => {
      this.touchActive = false;
      this.touchDeltaX = 0;
      this.touchDeltaY = 0;
    };

    this.canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    this.canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  private isKey(key: string): boolean {
    return !!this.keys[key];
  }

  // ---------- Collision resolution (swap-friendly: replace this for physics engine) ----------

  private static readonly BUS_COLLISION_RADIUS = 2.0; // metres — approximate bus half-width

  /**
   * Test the bus position against every solid obstacle (circle vs circle).
   * On overlap, push the bus out and kill its speed.
   * ~30 lines of isolated code — easy to replace with a physics engine later.
   */
  private resolveCollisions() {
    const br = Game.BUS_COLLISION_RADIUS;
    for (const obs of this.solidObstacles) {
      const dx = this.busPos.x - obs.x;
      const dz = this.busPos.z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = br + obs.radius;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        // Push bus out along the collision normal
        const nx = dx / dist;
        const nz = dz / dist;
        this.busPos.x += nx * overlap;
        this.busPos.z += nz * overlap;
        // Kill speed on impact
        this.busSpeed *= -0.15; // small bounce-back
      }
    }
  }

  // ---------- Update ----------

  private update(dt: number) {
    // --- Steering ---
    let turnInput = 0;
    if (this.isKey('a') || this.isKey('arrowleft')) turnInput -= 1;
    if (this.isKey('d') || this.isKey('arrowright')) turnInput += 1;
    // Blend touch steering
    if (this.touchActive) turnInput += this.touchDeltaX;
    turnInput = Math.max(-1, Math.min(1, turnInput));

    if (turnInput !== 0 && Math.abs(this.busSpeed) > 0.5) {
      this.busYaw += turnInput * BUS_TURN_SPEED * dt;
    }

    // --- Steer front wheels visually ---
    const maxWheelSteer = 0.45; // radians (~25°)
    const targetWheelY = turnInput * maxWheelSteer;
    // Smooth the wheel rotation so it doesn't snap
    const steerSmooth = Math.min(1, 10 * dt);
    if (this.frontWheelLeft) {
      this.frontWheelLeft.rotation.y += (targetWheelY - this.frontWheelLeft.rotation.y) * steerSmooth;
    }
    if (this.frontWheelRight) {
      this.frontWheelRight.rotation.y += (targetWheelY - this.frontWheelRight.rotation.y) * steerSmooth;
    }

    // --- Acceleration ---
    let accelInput = 0;
    if (this.isKey('w') || this.isKey('arrowup')) accelInput += 1;
    if (this.isKey('s') || this.isKey('arrowdown')) accelInput -= 1;
    // Blend touch accel: touch = accelerate, drag down (back toward you) = reverse
    if (this.touchActive) {
      accelInput += this.touchDeltaY > 0.1 ? -1 : 1;
    }
    accelInput = Math.max(-1, Math.min(1, accelInput));

    if (accelInput > 0) {
      this.busSpeed += BUS_ACCELERATION * dt;
    } else if (accelInput < 0) {
      this.busSpeed -= BUS_BRAKE * dt;
    } else {
      // Friction
      if (this.busSpeed > 0) {
        this.busSpeed = Math.max(0, this.busSpeed - BUS_FRICTION * dt);
      } else if (this.busSpeed < 0) {
        this.busSpeed = Math.min(0, this.busSpeed + BUS_FRICTION * dt);
      }
    }

    // Clamp speed
    this.busSpeed = Math.max(-BUS_MAX_SPEED * 0.3, Math.min(BUS_MAX_SPEED, this.busSpeed));

    // --- Move bus ---
    const forward = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
    this.busPos.x += forward.x * this.busSpeed * dt;
    this.busPos.z += forward.z * this.busSpeed * dt;

    // --- Solid-object collisions (push-back) ---
    this.resolveCollisions();

    // Follow terrain height
    const groundY = this.getGroundY(this.busPos.x, this.busPos.z);
    this.busPos.y = groundY; // bus base at ground level

    // Compute slope pitch from terrain height a short distance ahead vs behind
    const slopeProbe = 2.0; // metres to sample ahead/behind
    const hAhead = this.getGroundY(
      this.busPos.x + forward.x * slopeProbe,
      this.busPos.z + forward.z * slopeProbe,
    );
    const hBehind = this.getGroundY(
      this.busPos.x - forward.x * slopeProbe,
      this.busPos.z - forward.z * slopeProbe,
    );
    const targetPitch = Math.atan2(hAhead - hBehind, slopeProbe * 2);
    // Smooth the pitch so it doesn't jitter
    this.busPitch += (targetPitch - this.busPitch) * Math.min(1, 6 * dt);

    this.distanceTravelled += Math.abs(this.busSpeed) * dt;

    // --- Update bus mesh transform ---
    if (this.busMesh) {
      this.busMesh.position.copyFrom(this.busPos);
      this.busMesh.rotation.y = this.busYaw;
      this.busMesh.rotation.x = -this.busPitch; // negative to tilt forward when going uphill
    }

    // --- Animate scoop plow (flick up then back down) ---
    if (this.scoopPivot) {
      if (this.scoopAnimTimer > 0) {
        this.scoopAnimTimer -= dt;
        // Ease: quick up, slow down. Peak at halfway through.
        const t = 1 - this.scoopAnimTimer / SCOOP_ANIM_DURATION; // 0→1
        // Sine curve: 0→peak→0
        const angle = Math.sin(t * Math.PI) * -1.2; // negative X = scoop flicks up/back
        this.scoopPivot.rotation.x = angle;
      } else {
        this.scoopPivot.rotation.x = 0;
      }
    }

    // --- Third-person chase camera ---
    const camDist = 18;    // distance behind bus
    const camHeight = 8;   // height above bus
    const lookAhead = 8;   // look-ahead target offset from bus

    const camX = this.busPos.x - forward.x * camDist;
    const camZ = this.busPos.z - forward.z * camDist;
    const camGroundY = this.getGroundY(camX, camZ);
    // Camera should be above whichever is higher: bus ground or cam ground
    const camY = Math.max(groundY, camGroundY) + camHeight;

    const desiredCamPos = new Vector3(camX, camY, camZ);
    // Smooth camera follow
    const camSmooth = Math.min(1, 5 * dt);
    this.camera.position.x += (desiredCamPos.x - this.camera.position.x) * camSmooth;
    this.camera.position.y += (desiredCamPos.y - this.camera.position.y) * camSmooth;
    this.camera.position.z += (desiredCamPos.z - this.camera.position.z) * camSmooth;

    // Look at a point slightly ahead of the bus
    const lookTarget = new Vector3(
      this.busPos.x + forward.x * lookAhead,
      this.busPos.y + 2.5,
      this.busPos.z + forward.z * lookAhead,
    );
    this.camera.setTarget(lookTarget);

    // Callbacks
    this.callbacks.onSpeedChange(Math.abs(this.busSpeed) * 3.6); // m/s → km/h
    this.callbacks.onDistanceChange(this.distanceTravelled);
    this.callbacks.onAltitudeChange(groundY);

    // Update runners
    this.updateRunners(dt);

    // Minimap
    if (this.minimap) {
      this.minimap.draw(this.busPos.x, this.busPos.z, this.busYaw);
    }
  }
}
