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
  ParticleSystem,
  DynamicTexture,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import arrowModelUrl from '../assets/models/arrow.glb?url';
import { gpsToLocal, gpsPointToLocal } from '../api';
import { Minimap } from './Minimap';
import { COURSE_OVERRIDES, buildCourseIndices } from '@shared/course-overrides';
import levels from '../levels';
import type { LevelData } from '../levels';
import { createParkrunSign } from './objects/ParkrunSign';
import { createWaterMesh, createWaterRibbon } from './objects/Water';
import { createKmSign } from './objects/KmSign';
import { createBusModel, BusModelResult } from './objects/BusModel';
import { createCopperTent } from './objects/CopperTent';
import { createHagaGate } from './objects/HagaGate';
import { createSky } from './objects/Sky';
import { createPathGroundMaterial } from './PathShader';
import {
  createRunnerModel,
  RunnerModelResult,
  poseRunning,
  poseFlailing,
  poseSitting,
  poseSittingAnimated,
  poseStanding,
} from './objects/RunnerModel';

// ---------- Types ----------

type GameMode = 'SCOOP_THEN_RUN' | 'SCOOP_THEN_RIDE';
const MODE: GameMode = 'SCOOP_THEN_RIDE';

type RaceState = 'countdown' | 'racing' | 'finished';

interface GameCallbacks {
  onScoopRunner: () => void;
  onSpeedChange: (kmh: number) => void;
  onDistanceChange: (metres: number) => void;
  onAltitudeChange: (metres: number) => void;
  onGatePass?: (gateIndex: number, totalGates: number) => void;
  onCountdown?: (text: string) => void;
  onRaceStateChange?: (state: RaceState) => void;
  onRaceTimer?: (seconds: number) => void;
  onCourseProgress?: (coveredKm: number, totalKm: number) => void;
  onFinish?: (timeSeconds: number) => void;
}

interface Runner {
  mesh: Mesh;
  model: RunnerModelResult;
  /** Index along path positions the runner is heading toward */
  targetIdx: number;
  /** Speed in m/s */
  speed: number;
  /** Runner state machine */
  state: 'running' | 'launched' | 'landed' | 'sitting' | 'riding';
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
  /** Offset on bus roof when riding (local X/Z relative to bus centre) */
  ridingOffsetX: number;
  ridingOffsetZ: number;
  /** Escape direction when bus is close: 0 = not escaping, -1/1 = left/right */
  escapeDir: number;
}

// ---------- Constants ----------

const PATH_HALF_WIDTH = 5; // 10 m wide path
const COURSE_TARGET_LENGTH = 5000; // 5 km
const BUS_MAX_SPEED = 12 * 2; // m/s (~43 km/h)
const BUS_ACCELERATION = 12; // m/s²
const BUS_BRAKE = 8; // m/s²
const BUS_FRICTION = 10; // m/s² passive deceleration
const COUNTDOWN_DURATION = 3.0; // seconds for 3-2-1 countdown
const BUS_TURN_SPEED = 1.08; // rad/s (reduced 40% from 1.8)
const BUS_TURN_SPEED_STANDSTILL = 0.4; // rad/s — slow turn when nearly stopped
const RUNNER_COUNT = 30;
const RUNNER_MIN_SPEED = 2.5; // m/s (~9 km/h)
const RUNNER_MAX_SPEED = 4.5 * 2; // m/s (~16.2 km/h)
const SCOOP_DISTANCE = 3.5; // metres — how close bus needs to be
const RUNNER_ESCAPE_DISTANCE = 60; // metres — runners start dodging when bus is this close
const RUNNER_ESCAPE_SPEED = 2.5; // m/s lateral dodge 
const SCOOP_UP_FACTOR = 0.85; // upward launch = |busSpeed| × this factor
const SCOOP_MIN_UP = 10; // m/s — minimum upward launch (scoop still provides lift)
const SCOOP_FORWARD_FACTOR = 0.5; // forward launch = busSpeed × this factor (preserves direction)
const SCOOP_ANIM_DURATION = 0.35; // seconds for scoop flick animation
const SCOOP_BOOST_DURATION = 1; // seconds of speed boost after scooping a runner
const SCOOP_BOOST_MULTIPLIER = 2; // max-speed multiplier during boost
const RUNNER_SIT_DURATION = 5; // seconds sitting on ground before standing up
const GRAVITY = 20; // m/s² for launched runners
const BUS_GRAVITY = 4; // m/s² for bus when airborne
const BUS_JUMP_PITCH_THRESHOLD = 0.04; // minimum pitch drop (rad) per frame to trigger jump
const BUS_START_OFFSET = 15; // metres behind the start line
const BUS_ROOF_Y = 2.85; // seated hip height on bus roof (roof surface 3.4 minus 0.55 hip offset)
const GATE_SPACING = 100; // metres between each gate/checkpoint
const GATE_RADIUS = 15; // metres — how close bus must be to trigger gate
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
  private busVelY = 0; // vertical velocity (m/s) — >0 when airborne going up
  private busAirborne = false; // true while bus is above ground
  private prevSlopePitch = 0; // previous frame's terrain pitch for detecting crests
  private cameraYawOffset = 0; // smoothed yaw offset for reverse camera (0 = forward, π = reverse)
  private busMesh: TransformNode | null = null;
  private scoopPivot: TransformNode | null = null;
  private frontWheelLeft: TransformNode | null = null;
  private frontWheelRight: TransformNode | null = null;
  private scoopAnimTimer = 0; // >0 while scoop is animating
  private boostTimer = 0; // >0 while scoop speed-boost is active
  private exhaustFlames: ParticleSystem | null = null; // flame particles from exhaust
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

  // Gate/checkpoint system (100 m sections)
  private gatePositions: { x: number; z: number; y: number; pathDist: number; yaw: number }[] = [];
  private currentGateIdx = 0;

  // Race state
  private raceState: RaceState = 'countdown';
  private countdownTimer = 0; // seconds remaining in countdown phase
  private raceTimer = 0; // seconds elapsed while racing

  // 3D direction arrow (HUD compass)
  private directionArrowRoot: TransformNode | null = null;
  /** Node that receives the Y rotation (pivot sits at model centre) */
  private directionArrowRotNode: TransformNode | null = null;

  // Minimap
  private minimap: Minimap | null = null;

  // Demo mode (title screen background)
  private demoMode = false;
  private demoCamProgress = 0; // 0→1 along the path
  private resizeHandler: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks, minimapCanvas?: HTMLCanvasElement) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    if (minimapCanvas) {
      this.minimap = new Minimap(minimapCanvas);
    }
  }

  // ---------- Dispose ----------

  dispose() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.engine?.stopRenderLoop();
    this.scene?.dispose();
    this.engine?.dispose();
  }

  // ---------- Demo mode (title screen background) ----------

  async initDemo(eventId: string) {
    this.demoMode = true;
    await this.initScene(eventId, { skipBus: true, skipRunners: true, skipInput: true });
  }

  // ---------- Initialisation ----------

  async init(eventId: string) {
    await this.initScene(eventId, { skipBus: false, skipRunners: false, skipInput: false });
  }

  private async initScene(
    eventId: string,
    opts: { skipBus: boolean; skipRunners: boolean; skipInput: boolean },
  ) {
    // Load pre-fetched level data (no runtime API calls)
    const level: LevelData | undefined = levels[eventId];
    if (!level) {
      const available = Object.keys(levels).join(', ');
      throw new Error(
        `Unknown level "${eventId}". Available levels: ${available || '(none — run pnpm game:level <id>)'}`,
      );
    }

    const course = level.course;

    // Apply course overrides (section ordering / laps) if available
    const override = COURSE_OVERRIDES[eventId];
    const indices = buildCourseIndices(course.coordinates.length, override);
    const orderedCoords = indices.map((i) => course.coordinates[i]);

    // Elevation: reorder pre-fetched altitude to match ordered coords
    const elevations = indices.map((i) => level.altitude[i] ?? 0);

    // Water features come pre-fetched from the level file
    const waterFeatures = level.water;

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
    this.scene.clearColor = new Color4(0.68, 0.88, 1.0, 1); // bright sky blue fallback

    // Camera
    this.camera = new FreeCamera('cam', new Vector3(0, 10, -15), this.scene);
    this.camera.minZ = 0.1;
    this.camera.fov = 1.0;
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

    // Procedural sky + clouds
    createSky(this.scene);

    if (!opts.skipBus) {
      await this.buildBus();
    }
    if (!opts.skipRunners) {
      this.spawnRunners();
    }
    this.placeKmSigns();
    this.buildGates();

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
      this.solidObstacles.push({ x: signX, z: signZ, radius: 1.5 });

      if (!opts.skipBus) {
        // Bus starts behind the start line
        this.busPos.x = sx - forwardX * BUS_START_OFFSET;
        this.busPos.z = sz - forwardZ * BUS_START_OFFSET;
        const startH = this.getGroundY(this.busPos.x, this.busPos.z);
        this.busPos.y = startH;
        this.busYaw = yaw;
      }
    }

    // --- Event-specific landmarks ---
    this.placeEventLandmarks(eventId);

    // Give minimap the path data + water zones
    if (this.minimap) {
      this.minimap.setPath(this.pathPositions);
      this.minimap.setWaterZones(this.waterZones);
    }

    if (!opts.skipBus) {
      await this.buildDirectionArrow();
    }

    if (!opts.skipInput) {
      this.setupInput();
    }

    // Start countdown for real games
    if (!this.demoMode) {
      this.raceState = 'countdown';
      this.countdownTimer = COUNTDOWN_DURATION;
      this.raceTimer = 0;
      this.callbacks.onCountdown?.('3');
      this.callbacks.onRaceStateChange?.('countdown');

      // Position camera in front of the bus so the first frame shows the bus face-on
      const frontDir = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
      const camDist = 18;
      const camHeight = 10;
      const groundY = this.getGroundY(this.busPos.x, this.busPos.z);
      this.camera.position = new Vector3(
        this.busPos.x + frontDir.x * camDist,
        Math.max(groundY, this.busPos.y) + camHeight,
        this.busPos.z + frontDir.z * camDist,
      );
      this.camera.setTarget(new Vector3(this.busPos.x, this.busPos.y + 2.5, this.busPos.z));
    }

    // Position demo camera at start of path
    if (this.demoMode && this.pathPositions.length > 1) {
      this.demoCamProgress = 0;
      const [sx, sz] = this.pathPositions[0];
      const startY = this.getGroundY(sx, sz) + 15;
      this.camera.position = new Vector3(sx, startY, sz);
    }

    // Game loop
    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime() / 1000;
      if (this.demoMode) {
        this.updateDemoCamera(dt);
      } else {
        this.update(dt);
      }
      this.scene.render();
    });

    this.resizeHandler = () => this.engine.resize();
    window.addEventListener('resize', this.resizeHandler);
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
    waterFeatures: LevelData['water'],
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

  // ---------- 100 m Gate / Checkpoint system ----------

  /**
   * Generate checkpoint gates every GATE_SPACING metres along the path.
   * Each gate stores its world position, height, cumulative distance, and
   * the path heading (yaw) at that point.
   */
  private buildGates() {
    if (this.pathPositions.length < 2) return;
    this.gatePositions = [];
    this.currentGateIdx = 0;

    const totalDist = this.pathCumDist[this.pathCumDist.length - 1];

    for (let dist = GATE_SPACING; dist < totalDist; dist += GATE_SPACING) {
      // Find the segment containing this distance
      let segIdx = 0;
      for (let i = 1; i < this.pathCumDist.length; i++) {
        if (this.pathCumDist[i] >= dist) {
          segIdx = i - 1;
          break;
        }
      }

      const segLen = this.pathCumDist[segIdx + 1] - this.pathCumDist[segIdx];
      const t = segLen > 0 ? (dist - this.pathCumDist[segIdx]) / segLen : 0;
      const [ax, az] = this.pathPositions[segIdx];
      const [bx, bz] = this.pathPositions[segIdx + 1];
      const x = ax + t * (bx - ax);
      const z = az + t * (bz - az);
      const y = this.getGroundY(x, z);

      // Path heading at this point
      const yaw = Math.atan2(bx - ax, bz - az);

      this.gatePositions.push({ x, z, y, pathDist: dist, yaw });
    }
  }

  /**
   * Check if the bus has passed through the current gate.
   * Gates must be completed in order — this prevents skipping sections.
   */
  private checkGates() {
    if (this.currentGateIdx >= this.gatePositions.length) return;

    const gate = this.gatePositions[this.currentGateIdx];
    const dx = this.busPos.x - gate.x;
    const dz = this.busPos.z - gate.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < GATE_RADIUS) {
      this.currentGateIdx++;
      this.callbacks.onGatePass?.(this.currentGateIdx, this.gatePositions.length);
    }
  }

  // ---------- 3D Direction Arrow (HUD compass) ----------

  /**
   * Build a 3D arrow that hovers in front of the camera and points
   * toward the next gate checkpoint. Parented to the camera so it
   * behaves like a HUD element.
   */
  private async buildDirectionArrow() {
    // ── Node hierarchy ──
    //  camera
    //   └─ root    (position only — screen placement + bobbing)
    //       └─ rotNode (rotation.y only — spins the arrow)
    //           └─ glbRoot (centering offset + uniform scale)
    //
    // Because the centering offset places the model's geometric centre
    // at rotNode's origin, rotation.y on rotNode spins the model in
    // place without any lateral shift.

    const root = new TransformNode('dirArrowRoot', this.scene);
    root.parent = this.camera;
    root.position = new Vector3(0, 2.8, 8);

    const rotNode = new TransformNode('dirArrowRot', this.scene);
    rotNode.parent = root;

    // Load the arrow GLB model
    const result = await SceneLoader.ImportMeshAsync('', '', arrowModelUrl, this.scene);
    const glbRoot = result.meshes[0]; // __root__ from the GLB

    // Parent under rotNode and apply uniform scale
    glbRoot.parent = rotNode;

    // Force world-matrix computation so bounding info is valid
    root.computeWorldMatrix(true);
    rotNode.computeWorldMatrix(true);
    for (const m of result.meshes) m.computeWorldMatrix(true);

    // Measure world-space bounding extent
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const mesh of result.meshes) {
      if (mesh === glbRoot || mesh.isAnInstance || !mesh.getBoundingInfo) continue;
      mesh.computeWorldMatrix(true);
      const bb = mesh.getBoundingInfo().boundingBox;
      if (bb.minimumWorld.x < minX) minX = bb.minimumWorld.x;
      if (bb.maximumWorld.x > maxX) maxX = bb.maximumWorld.x;
      if (bb.minimumWorld.y < minY) minY = bb.minimumWorld.y;
      if (bb.maximumWorld.y > maxY) maxY = bb.maximumWorld.y;
      if (bb.minimumWorld.z < minZ) minZ = bb.minimumWorld.z;
      if (bb.maximumWorld.z > maxZ) maxZ = bb.maximumWorld.z;
    }
    const rawSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const targetSize = 1.8;
    const scaleFactor = targetSize / rawSize;
    glbRoot.scaling.setAll(scaleFactor);

    // Re-compute after scaling so we can read the true centre
    for (const m of result.meshes) m.computeWorldMatrix(true);
    let sMinX = Infinity, sMaxX = -Infinity;
    let sMinY = Infinity, sMaxY = -Infinity;
    let sMinZ = Infinity, sMaxZ = -Infinity;
    for (const mesh of result.meshes) {
      if (mesh === glbRoot || mesh.isAnInstance || !mesh.getBoundingInfo) continue;
      mesh.computeWorldMatrix(true);
      const bb = mesh.getBoundingInfo().boundingBox;
      if (bb.minimumWorld.x < sMinX) sMinX = bb.minimumWorld.x;
      if (bb.maximumWorld.x > sMaxX) sMaxX = bb.maximumWorld.x;
      if (bb.minimumWorld.y < sMinY) sMinY = bb.minimumWorld.y;
      if (bb.maximumWorld.y > sMaxY) sMaxY = bb.maximumWorld.y;
      if (bb.minimumWorld.z < sMinZ) sMinZ = bb.minimumWorld.z;
      if (bb.maximumWorld.z > sMaxZ) sMaxZ = bb.maximumWorld.z;
    }

    // Compute how far the model centre is from rotNode's origin (in world space)
    const modelCenterWorld = new Vector3(
      (sMinX + sMaxX) / 2,
      (sMinY + sMaxY) / 2,
      (sMinZ + sMaxZ) / 2,
    );
    const rotNodeWorld = rotNode.getAbsolutePosition();
    const worldOffset = modelCenterWorld.subtract(rotNodeWorld);

    // Convert world-space offset to glbRoot's parent (rotNode) local space
    const rotInv = rotNode.getWorldMatrix().clone().invert();
    const localOffset = Vector3.TransformNormal(worldOffset, rotInv);
    glbRoot.position = glbRoot.position.subtract(localOffset);

    // Orange emissive material so it's always clearly visible
    const arrowMat = new StandardMaterial('arrowMat', this.scene);
    arrowMat.diffuseColor = new Color3(1.0, 0.45, 0.0);
    arrowMat.emissiveColor = new Color3(1.0, 0.5, 0.0);
    arrowMat.specularColor = new Color3(1, 1, 1);
    arrowMat.backFaceCulling = false;
    for (const mesh of result.meshes) {
      if (mesh !== glbRoot && mesh.material !== undefined) {
        (mesh as Mesh).material = arrowMat;
      }
    }

    this.directionArrowRoot = root;
    this.directionArrowRotNode = rotNode;
  }

  /**
   * Update the direction arrow each frame so it points toward the
   * next gate. Uses the camera's world matrix to compute relative
   * direction, then rotates the arrow root around its local Y axis.
   */
  private updateDirectionArrow(dt: number) {
    if (!this.directionArrowRoot || !this.directionArrowRotNode) return;

    // Hide arrow when all gates are cleared
    if (this.currentGateIdx >= this.gatePositions.length) {
      this.directionArrowRoot.setEnabled(false);
      return;
    }
    this.directionArrowRoot.setEnabled(true);

    const gate = this.gatePositions[this.currentGateIdx];

    // Direction from bus to next gate in world space (horizontal)
    const toGateX = gate.x - this.busPos.x;
    const toGateZ = gate.z - this.busPos.z;
    const worldAngle = Math.atan2(toGateX, toGateZ); // yaw angle in world

    // Camera's yaw in world space: the camera looks along its target direction
    const camFwd = this.camera.getTarget().subtract(this.camera.position);
    const camYaw = Math.atan2(camFwd.x, camFwd.z);

    // Arrow rotation = relative angle (gate direction minus camera direction)
    // Applied to rotNode — root only handles positioning
    const relAngle = worldAngle - camYaw;
    this.directionArrowRotNode.rotation.y = relAngle;

    // Gentle bobbing animation (on the position node)
    const bob = Math.sin(performance.now() * 0.003) * 0.12;
    this.directionArrowRoot.position.y = 2.8 + bob;
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
  private async buildBus() {
    const result = await createBusModel(this.scene);
    this.busMesh = result.root;
    this.scoopPivot = result.scoopPivot;
    // Store rest position for scoop animation offsets
    (this.scoopPivot as any).__restY = this.scoopPivot.position.y;
    (this.scoopPivot as any).__restZ = this.scoopPivot.position.z;
    this.frontWheelLeft = result.frontWheelLeft;
    this.frontWheelRight = result.frontWheelRight;

    // --- Exhaust flame particle system (initially stopped) ---
    this.exhaustFlames = this.createExhaustFlames();
  }

  /**
   * Create a flame particle system attached to the back of the bus.
   * Starts stopped — call start() when a runner is scooped.
   */
  private createExhaustFlames(): ParticleSystem {
    const ps = new ParticleSystem('exhaustFlames', 300, this.scene);

    // Generate a small radial-gradient circle texture for the flame particles
    const flameTex = new DynamicTexture('flameTex', 64, this.scene, false);
    const ctx = flameTex.getContext() as unknown as CanvasRenderingContext2D;
    const cx = 32, cy = 32, r = 30;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,180,50,0.8)');
    grad.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    flameTex.update();
    ps.particleTexture = flameTex;

    // Emitter at the rear-underside of the bus (exhaust pipe area)
    const emitter = MeshBuilder.CreateBox('exhaustEmitter', { size: 0.01 }, this.scene);
    emitter.isVisible = false;
    // Bus body: bodyL=7, back at z=-3.5, floorY=0.9
    emitter.position = new Vector3(0.5, 0.65, -3.8);
    emitter.parent = this.busMesh!;
    ps.emitter = emitter;

    // Emit backward and slightly up
    ps.direction1 = new Vector3(-0.3, 0.5, -2);
    ps.direction2 = new Vector3(0.3, 1.0, -3);
    ps.minEmitBox = new Vector3(-0.15, -0.05, 0);
    ps.maxEmitBox = new Vector3(0.15, 0.05, 0);

    // Flame appearance
    ps.color1 = new Color4(1, 0.6, 0.1, 1);     // orange-yellow
    ps.color2 = new Color4(1, 0.2, 0.0, 1);     // red-orange
    ps.colorDead = new Color4(0.2, 0.2, 0.2, 0); // transparent smoke

    ps.minSize = 0.3;
    ps.maxSize = 0.9;
    ps.minLifeTime = 0.15;
    ps.maxLifeTime = 0.45;
    ps.emitRate = 300;
    ps.blendMode = ParticleSystem.BLENDMODE_ONEONE;
    ps.minEmitPower = 3;
    ps.maxEmitPower = 6;
    ps.updateSpeed = 0.02;
    ps.gravity = new Vector3(0, 2, 0); // flames rise

    ps.stop(); // dormant until scoop
    return ps;
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
        ridingOffsetX: 0,
        ridingOffsetZ: 0,
        escapeDir: 0,
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

          // --- Escape behaviour: dodge sideways when bus is close ---
          const busDx = this.busPos.x - pos.x;
          const busDz = this.busPos.z - pos.z;
          const busDist = Math.sqrt(busDx * busDx + busDz * busDz);

          if (busDist < RUNNER_ESCAPE_DISTANCE && Math.abs(this.busSpeed) > 0.5) {
            // Pick an escape direction once (away from bus, perpendicular to path)
            if (runner.escapeDir === 0) {
              const busPerp = perpX * busDx + perpZ * busDz;
              runner.escapeDir = busPerp > 0 ? -1 : 1;
            }
            // Shift lateral offset toward the escape side
            const escapeTarget = runner.escapeDir * PATH_HALF_WIDTH * 1.8;
            if (runner.lateralOffset < escapeTarget) {
              runner.lateralOffset = Math.min(runner.lateralOffset + RUNNER_ESCAPE_SPEED * dt, escapeTarget);
            } else {
              runner.lateralOffset = Math.max(runner.lateralOffset - RUNNER_ESCAPE_SPEED * dt, escapeTarget);
            }
          } else {
            runner.escapeDir = 0;
          }

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

            // In RIDE mode, pre-assign the seat so the runner arcs toward it
            if (MODE === 'SCOOP_THEN_RIDE') {
              this.assignRoofSeat(runner);
            }

            // Trigger scoop animation
            this.scoopAnimTimer = SCOOP_ANIM_DURATION;

            // Trigger speed boost + exhaust flames
            this.boostTimer = SCOOP_BOOST_DURATION;
            if (this.exhaustFlames && !this.exhaustFlames.isStarted()) {
              this.exhaustFlames.start();
            }

            this.callbacks.onScoopRunner();
          }
          break;
        }

        case 'launched': {
          // Projectile physics (vertical)
          runner.velY -= GRAVITY * dt;
          pos.y += runner.velY * dt;

          if (MODE === 'SCOOP_THEN_RIDE') {
            // Steer horizontally toward the pre-assigned seat on the moving bus
            const sinY = Math.sin(this.busYaw);
            const cosY = Math.cos(this.busYaw);
            const seatWorldX = this.busPos.x + cosY * runner.ridingOffsetX + sinY * runner.ridingOffsetZ;
            const seatWorldZ = this.busPos.z - sinY * runner.ridingOffsetX + cosY * runner.ridingOffsetZ;

            // Blend toward seat position (fast homing so they arrive before landing)
            const homingStrength = 6; // higher = snappier homing
            const toSeatX = seatWorldX - pos.x;
            const toSeatZ = seatWorldZ - pos.z;
            pos.x += toSeatX * Math.min(1, homingStrength * dt);
            pos.z += toSeatZ * Math.min(1, homingStrength * dt);

            // Spin + flail while airborne
            runner.mesh.rotation.x += 8 * dt;
            runner.mesh.rotation.z += 5 * dt;
            runner.animPhase += dt * 12;
            poseFlailing(runner.model, runner.animPhase);

            // Land when reaching roof height
            const roofWorldY = this.busPos.y + BUS_ROOF_Y;
            if (pos.y <= roofWorldY && runner.velY < 0) {
              runner.state = 'riding';
              runner.mesh.rotation.x = 0;
              runner.mesh.rotation.z = 0;
              poseSitting(runner.model);
            }
          } else {
            // SCOOP_THEN_RUN: free projectile
            pos.x += runner.velX * dt;
            pos.z += runner.velZ * dt;

            runner.mesh.rotation.x += 8 * dt;
            runner.mesh.rotation.z += 5 * dt;
            runner.animPhase += dt * 12;
            poseFlailing(runner.model, runner.animPhase);

            const groundY = this.getGroundY(pos.x, pos.z);
            if (pos.y <= groundY && runner.velY < 0) {
              pos.y = groundY;
              runner.state = 'sitting';
              runner.fadeTimer = RUNNER_SIT_DURATION;
              runner.mesh.rotation.x = 0;
              runner.mesh.rotation.z = 0;
              poseSitting(runner.model);
            }
          }
          break;
        }

        case 'riding': {
          // Stick to bus roof — transform local offset back to world space
          const sinY = Math.sin(this.busYaw);
          const cosY = Math.cos(this.busYaw);
          pos.x = this.busPos.x + cosY * runner.ridingOffsetX + sinY * runner.ridingOffsetZ;
          pos.z = this.busPos.z - sinY * runner.ridingOffsetX + cosY * runner.ridingOffsetZ;
          pos.y = this.busPos.y + BUS_ROOF_Y;
          // Face the same direction as the bus
          runner.mesh.rotation.y = this.busYaw;
          // Animated sitting — occasionally wave
          runner.animPhase += dt;
          poseSittingAnimated(runner.model, runner.animPhase);
          break;
        }

        case 'sitting': {
          // Sit on the ground for a while, then stand up and resume running
          pos.y = this.getGroundY(pos.x, pos.z);
          runner.fadeTimer -= dt;

          // Animated sitting — occasionally wave
          runner.animPhase += dt;
          poseSittingAnimated(runner.model, runner.animPhase);

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

  // ---------- Roof seat assignment ----------

  /**
   * Assign a packed seat position on the bus roof.
   * As more runners board, everyone squeezes closer together to fit.
   * The bus roof is ~2.4 wide × ~7.0 long (bodyW × bodyL).
   */
  private assignRoofSeat(newRider: Runner) {
    // Collect all currently riding runners (including the new one we're about to set)
    const riders = this.runners.filter((r) => r.state === 'riding');
    const seatIndex = riders.length; // new rider gets the next seat
    const totalRiders = seatIndex + 1;

    // Roof dimensions (bus-local)
    const roofW = 2.0;  // usable roof width (slightly less than bodyW 2.4)
    const roofL = 6.0;  // usable roof length (slightly less than bodyL 7.0)

    // Decide how many columns and rows we need
    // Start with 2 columns side by side, add rows as needed
    const cols = Math.min(totalRiders, 3); // max 3 across
    const rows = Math.ceil(totalRiders / cols);

    // Spacing shrinks as more riders board
    const spacingX = cols > 1 ? roofW / (cols - 1) : 0;
    const spacingZ = rows > 1 ? roofL / (rows - 1) : 0;

    // Reassign ALL current riders so they pack evenly
    const allRiders = [...riders, newRider];
    for (let i = 0; i < allRiders.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      allRiders[i].ridingOffsetX = cols > 1 ? -roofW / 2 + col * spacingX : 0;
      allRiders[i].ridingOffsetZ = rows > 1 ? -roofL / 2 + row * spacingZ : 0;
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

    // Joystick DOM elements
    const joystickEl = document.getElementById('joystick');
    const joystickInner = document.getElementById('joystick-inner');
    const OUTER_RADIUS = 60; // half of 120px outer circle

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      this.touchActive = true;
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.touchDeltaX = 0;
      this.touchDeltaY = 0;

      // Show joystick at touch position
      if (joystickEl) {
        joystickEl.style.display = 'block';
        joystickEl.style.left = `${t.clientX}px`;
        joystickEl.style.top = `${t.clientY}px`;
      }
      if (joystickInner) {
        joystickInner.style.left = '0px';
        joystickInner.style.top = '0px';
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!this.touchActive || e.touches.length === 0) return;
      e.preventDefault(); // prevent scroll
      const t = e.touches[0];
      const rawX = t.clientX - this.touchStartX;
      const rawY = t.clientY - this.touchStartY;

      // Clamp inner knob to outer circle radius
      const dist = Math.sqrt(rawX * rawX + rawY * rawY);
      const clampedDist = Math.min(dist, OUTER_RADIUS);
      const angle = Math.atan2(rawY, rawX);
      const clampedX = dist > 0 ? Math.cos(angle) * clampedDist : 0;
      const clampedY = dist > 0 ? Math.sin(angle) * clampedDist : 0;

      // Position inner knob
      if (joystickInner) {
        joystickInner.style.left = `${clampedX}px`;
        joystickInner.style.top = `${clampedY}px`;
      }

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

      // Hide joystick
      if (joystickEl) {
        joystickEl.style.display = 'none';
      }
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

  // ---------- Demo camera (title screen flyover) ----------

  private updateDemoCamera(dt: number) {
    if (this.pathPositions.length < 2) return;

    // Advance progress along the path in a loop — slow, cinematic speed
    const DEMO_SPEED = 40; // metres per second along the path
    this.demoCamProgress += (DEMO_SPEED * dt) / this.pathTotalDistance;
    if (this.demoCamProgress > 1) this.demoCamProgress -= 1;

    const totalDist = this.pathCumDist[this.pathCumDist.length - 1];
    const targetDist = this.demoCamProgress * totalDist;

    // Helper: interpolate a position along the path at a given cumulative distance
    const samplePath = (dist: number): { x: number; z: number; y: number } => {
      // Wrap distance into [0, totalDist)
      const d = ((dist % totalDist) + totalDist) % totalDist;
      let idx = 0;
      for (let i = 1; i < this.pathCumDist.length; i++) {
        if (this.pathCumDist[i] >= d) { idx = i - 1; break; }
      }
      const segLen = this.pathCumDist[idx + 1] - this.pathCumDist[idx];
      const t = segLen > 0 ? (d - this.pathCumDist[idx]) / segLen : 0;
      const [ax, az] = this.pathPositions[idx];
      const [bx, bz] = this.pathPositions[idx + 1] ?? this.pathPositions[idx];
      const hA = this.pathHeights[idx] ?? 0;
      const hB = this.pathHeights[idx + 1] ?? hA;
      return {
        x: ax + (bx - ax) * t,
        z: az + (bz - az) * t,
        y: hA + (hB - hA) * t,
      };
    };

    // Current position on path
    const pos = samplePath(targetDist);

    // Compute yaw from a point a fixed distance ahead (avoids per-segment jumps)
    const YAW_LOOK_DIST = 30; // metres ahead for direction
    const ahead = samplePath(targetDist + YAW_LOOK_DIST);
    const dx = ahead.x - pos.x;
    const dz = ahead.z - pos.z;
    const yaw = Math.atan2(dx, dz);

    // Camera floats to the side and above the path
    const sideX = Math.cos(yaw);
    const sideZ = -Math.sin(yaw);

    const camHeight = 25;
    const camSide = 20;
    const camX = pos.x + sideX * camSide;
    const camZ = pos.z + sideZ * camSide;
    const camY = pos.y + camHeight;

    // Smooth follow (exponential lerp, frame-rate independent)
    const smooth = 1 - Math.exp(-2.5 * dt);
    this.camera.position.x += (camX - this.camera.position.x) * smooth;
    this.camera.position.y += (camY - this.camera.position.y) * smooth;
    this.camera.position.z += (camZ - this.camera.position.z) * smooth;

    // Look-ahead target: sample a point further ahead for a smooth gaze
    const LOOK_AHEAD_DIST = 80; // metres ahead on the path
    const look = samplePath(targetDist + LOOK_AHEAD_DIST);
    const lookTarget = new Vector3(look.x, look.y + 2, look.z);

    // Smooth the look target to avoid any residual snapping
    const prevTarget = this.camera.getTarget();
    const lookSmooth = 1 - Math.exp(-3 * dt);
    const smoothedTarget = new Vector3(
      prevTarget.x + (lookTarget.x - prevTarget.x) * lookSmooth,
      prevTarget.y + (lookTarget.y - prevTarget.y) * lookSmooth,
      prevTarget.z + (lookTarget.z - prevTarget.z) * lookSmooth,
    );
    this.camera.setTarget(smoothedTarget);
  }

  // ---------- Countdown Cinematic Camera ----------

  /**
   * Orbit camera that starts in front of the bus and sweeps around
   * to the normal chase-cam position by the end of the countdown.
   * Uses smooth easing for a cinematic feel.
   */
  private updateCountdownCamera(dt: number) {
    // t goes from 0 (start, camera in front) to 1 (end, camera behind)
    const t = Math.max(0, Math.min(1, 1 - this.countdownTimer / COUNTDOWN_DURATION));
    // Smooth ease-in-out: slow start, fast middle, slow end
    const ease = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const camDist = 18;
    // Start a bit higher for drama, ease down to normal chase cam height
    const camHeightStart = 10;
    const camHeightEnd = 8;
    const camHeight = camHeightStart + (camHeightEnd - camHeightStart) * ease;

    // Orbit angle: 0 = in front of bus, π = behind bus (normal chase position)
    // The bus faces busYaw, so "in front" = busYaw direction and
    // "behind" = busYaw + π direction.
    const orbitAngle = this.busYaw + ease * Math.PI;
    const orbitDir = new Vector3(Math.sin(orbitAngle), 0, Math.cos(orbitAngle));

    // Camera distance starts a bit closer and eases to normal
    const distStart = 14;
    const distEnd = camDist;
    const dist = distStart + (distEnd - distStart) * ease;

    const camX = this.busPos.x + orbitDir.x * dist;
    const camZ = this.busPos.z + orbitDir.z * dist;
    const groundY = this.getGroundY(this.busPos.x, this.busPos.z);
    const camGroundY = this.getGroundY(camX, camZ);
    const camY = Math.max(groundY, camGroundY) + camHeight;

    const desiredCamPos = new Vector3(camX, camY, camZ);

    // Smooth follow so it doesn't jitter
    const camSmooth = Math.min(1, 6 * dt);
    this.camera.position.x += (desiredCamPos.x - this.camera.position.x) * camSmooth;
    this.camera.position.y += (desiredCamPos.y - this.camera.position.y) * camSmooth;
    this.camera.position.z += (desiredCamPos.z - this.camera.position.z) * camSmooth;

    // Always look at the bus centre
    const lookTarget = new Vector3(
      this.busPos.x,
      this.busPos.y + 2.5,
      this.busPos.z,
    );
    this.camera.setTarget(lookTarget);
  }

  // ---------- Chase Camera ----------

  private updateChaseCam(dt: number) {
    const camDist = 18;    // distance behind bus
    const camHeight = 8;   // height above bus
    const lookAhead = 8;   // look-ahead target offset from bus

    // Smoothly swing camera around when reversing
    const targetYawOffset = this.busSpeed < -1 ? Math.PI : 0;
    const camSwingSpeed = 3; // rad/s for the swing
    const yawDiff = targetYawOffset - this.cameraYawOffset;
    this.cameraYawOffset += Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), camSwingSpeed * dt);

    // Camera direction = bus yaw + reverse offset
    const camYaw = this.busYaw + this.cameraYawOffset;
    const camForward = new Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));

    const camX = this.busPos.x - camForward.x * camDist;
    const camZ = this.busPos.z - camForward.z * camDist;
    const groundY = this.getGroundY(this.busPos.x, this.busPos.z);
    const camGroundY = this.getGroundY(camX, camZ);
    const camY = Math.max(groundY, camGroundY) + camHeight;

    const desiredCamPos = new Vector3(camX, camY, camZ);
    const camSmooth = Math.min(1, 5 * dt);
    this.camera.position.x += (desiredCamPos.x - this.camera.position.x) * camSmooth;
    this.camera.position.y += (desiredCamPos.y - this.camera.position.y) * camSmooth;
    this.camera.position.z += (desiredCamPos.z - this.camera.position.z) * camSmooth;

    const lookTarget = new Vector3(
      this.busPos.x + camForward.x * lookAhead,
      this.busPos.y + 2.5,
      this.busPos.z + camForward.z * lookAhead,
    );
    this.camera.setTarget(lookTarget);
  }

  // ---------- Update ----------

  private update(dt: number) {
    // --- Countdown phase ---
    if (this.raceState === 'countdown') {
      const prevSec = Math.ceil(this.countdownTimer);
      this.countdownTimer -= dt;
      const curSec = Math.ceil(this.countdownTimer);

      if (curSec !== prevSec && curSec > 0) {
        this.callbacks.onCountdown?.(String(curSec));
      }

      if (this.countdownTimer <= 0) {
        // Show "Go!" then clear after a short delay
        this.callbacks.onCountdown?.('Go!');
        this.raceState = 'racing';
        this.raceTimer = 0;
        this.callbacks.onRaceStateChange?.('racing');
        setTimeout(() => this.callbacks.onCountdown?.(''), 600);
      }

      // During countdown: update camera/minimap/runners but skip bus input
      this.updateDirectionArrow(dt);
      this.updateRunners(dt);

      // Ensure bus mesh is positioned (so it's visible during countdown)
      if (this.busMesh) {
        this.busMesh.position.copyFrom(this.busPos);
        this.busMesh.rotation.y = this.busYaw;
      }

      // Callbacks for static HUD values
      this.callbacks.onSpeedChange(0);
      this.callbacks.onDistanceChange(0);
      const groundY = this.getGroundY(this.busPos.x, this.busPos.z);
      this.callbacks.onAltitudeChange(groundY);
      this.callbacks.onRaceTimer?.(0);
      const totalKm = this.pathTotalDistance / 1000;
      this.callbacks.onCourseProgress?.(0, parseFloat(totalKm.toFixed(1)));

      // Cinematic orbit camera during countdown
      this.updateCountdownCamera(dt);

      if (this.minimap) {
        this.minimap.draw(this.busPos.x, this.busPos.z, this.busYaw);
      }
      return;
    }

    // --- Finished phase: freeze bus, keep rendering ---
    if (this.raceState === 'finished') {
      this.updateChaseCam(dt);
      this.updateRunners(dt);
      if (this.minimap) {
        this.minimap.draw(this.busPos.x, this.busPos.z, this.busYaw);
      }
      return;
    }

    // --- Racing phase: track time ---
    this.raceTimer += dt;
    this.callbacks.onRaceTimer?.(this.raceTimer);

    // Course progress (based on nearest gate passed)
    const totalKm = this.pathTotalDistance / 1000;
    const coveredDist = this.currentGateIdx < this.gatePositions.length
      ? this.gatePositions[this.currentGateIdx]?.pathDist ?? 0
      : this.pathTotalDistance;
    const coveredKm = (this.currentGateIdx > 0
      ? this.gatePositions[this.currentGateIdx - 1].pathDist
      : 0) / 1000;
    this.callbacks.onCourseProgress?.(parseFloat(coveredKm.toFixed(1)), parseFloat(totalKm.toFixed(1)));

    // --- Acceleration input (computed early so steering can reference it) ---
    let accelInput = 0;
    if (this.isKey('w') || this.isKey('arrowup')) accelInput += 1;
    if (this.isKey('s') || this.isKey('arrowdown')) accelInput -= 1;
    // Blend touch accel: touch = accelerate, drag down (back toward you) = reverse
    if (this.touchActive) {
      accelInput += this.touchDeltaY > 0.1 ? -1 : 1;
    }
    accelInput = Math.max(-1, Math.min(1, accelInput));

    // --- Steering ---
    let turnInput = 0;
    if (this.isKey('a') || this.isKey('arrowleft')) turnInput -= 1;
    if (this.isKey('d') || this.isKey('arrowright')) turnInput += 1;
    // Blend touch steering
    if (this.touchActive) turnInput += this.touchDeltaX;
    turnInput = Math.max(-1, Math.min(1, turnInput));

    if (turnInput !== 0 && Math.abs(this.busSpeed) > 0.5) {
      this.busYaw += turnInput * BUS_TURN_SPEED * dt;
    } else if (turnInput !== 0 && accelInput !== 0 && Math.abs(this.busSpeed) <= 0.5) {
      // Slow rotation at standstill when player is pressing forward/reverse + turn
      this.busYaw += turnInput * BUS_TURN_SPEED_STANDSTILL * dt;
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

    // --- Apply acceleration ---
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

    // Clamp speed (boosted max while scoop-boost is active)
    const effectiveMaxSpeed = this.boostTimer > 0 ? BUS_MAX_SPEED * SCOOP_BOOST_MULTIPLIER : BUS_MAX_SPEED;
    this.busSpeed = Math.max(-effectiveMaxSpeed * 0.3, Math.min(effectiveMaxSpeed, this.busSpeed));

    // Tick boost timer and stop exhaust flames when expired
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) {
        this.boostTimer = 0;
        this.exhaustFlames?.stop();
      }
    }

    // --- Move bus ---
    const forward = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
    this.busPos.x += forward.x * this.busSpeed * dt;
    this.busPos.z += forward.z * this.busSpeed * dt;

    // --- Solid-object collisions (push-back) ---
    this.resolveCollisions();

    // Follow terrain height / airborne physics
    const groundY = this.getGroundY(this.busPos.x, this.busPos.z);

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

    if (this.busAirborne) {
      // Apply gravity
      this.busVelY -= BUS_GRAVITY * dt;
      this.busPos.y += this.busVelY * dt;

      // Check landing
      if (this.busPos.y <= groundY) {
        this.busPos.y = groundY;
        this.busVelY = 0;
        this.busAirborne = false;
      }
    } else {
      // On the ground — detect crest (slope was uphill, now levelling/downhill)
      const pitchDrop = this.prevSlopePitch - targetPitch;
      const absSpeed = Math.abs(this.busSpeed);
      if (pitchDrop > BUS_JUMP_PITCH_THRESHOLD && absSpeed > 4 && this.prevSlopePitch > 0.03) {
        // Launch! Vertical velocity based on forward speed and how steep the slope was
        this.busVelY = Math.sin(this.prevSlopePitch) * absSpeed * 0.7;
        this.busVelY = Math.max(this.busVelY, 1.5); // minimum pop
        this.busVelY = Math.min(this.busVelY, 8);   // cap so it doesn't fly to space
        this.busAirborne = true;
      } else {
        this.busPos.y = groundY; // stay on ground
      }
    }

    this.prevSlopePitch = targetPitch;

    // Smooth the pitch so it doesn't jitter
    this.busPitch += (targetPitch - this.busPitch) * Math.min(1, 6 * dt);

    this.distanceTravelled += Math.abs(this.busSpeed) * dt;

    // --- Update bus mesh transform ---
    if (this.busMesh) {
      this.busMesh.position.copyFrom(this.busPos);
      this.busMesh.rotation.y = this.busYaw;
      this.busMesh.rotation.x = -this.busPitch; // negative to tilt forward when going uphill
    }

    // --- Animate scoop plow (flick up + forward then back) ---
    if (this.scoopPivot) {
      if (this.scoopAnimTimer > 0) {
        this.scoopAnimTimer -= dt;
        // Ease: quick up, slow down. Peak at halfway through.
        const t = 1 - this.scoopAnimTimer / SCOOP_ANIM_DURATION; // 0→1
        const ease = Math.sin(t * Math.PI); // 0→1→0
        // Rotate up/back
        this.scoopPivot.rotation.x = ease * -1.2;
        // Translate slightly forward and up for a scooping motion
        this.scoopPivot.position.y = (this.scoopPivot as any).__restY + ease * 0.5;
        this.scoopPivot.position.z = (this.scoopPivot as any).__restZ + ease * 0.35;
      } else {
        this.scoopPivot.rotation.x = 0;
        this.scoopPivot.position.y = (this.scoopPivot as any).__restY ?? this.scoopPivot.position.y;
        this.scoopPivot.position.z = (this.scoopPivot as any).__restZ ?? this.scoopPivot.position.z;
      }
    }

    // --- Third-person chase camera ---
    this.updateChaseCam(dt);

    // Callbacks
    this.callbacks.onSpeedChange(Math.abs(this.busSpeed) * 3.6); // m/s → km/h
    this.callbacks.onDistanceChange(this.distanceTravelled);
    this.callbacks.onAltitudeChange(groundY);

    // Gate checkpoint tracking
    this.checkGates();

    // Check for finish (all gates cleared)
    if (this.currentGateIdx >= this.gatePositions.length && this.raceState === 'racing') {
      this.raceState = 'finished';
      this.callbacks.onRaceStateChange?.('finished');
      this.callbacks.onFinish?.(this.raceTimer);
    }

    // Update 3D direction arrow
    this.updateDirectionArrow(dt);

    // Update runners
    this.updateRunners(dt);

    // Minimap
    if (this.minimap) {
      this.minimap.draw(this.busPos.x, this.busPos.z, this.busYaw);
    }
  }
}
