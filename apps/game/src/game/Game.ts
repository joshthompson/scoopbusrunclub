import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  SpotLight,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  ShaderMaterial,
  Mesh,
  VertexBuffer,
  VertexData,
  TransformNode,
  GroundMesh,
  ParticleSystem,
  SceneLoader,
  DynamicTexture,
  Viewport,
  Effect,
  RenderTargetTexture,
  Constants,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import arrowModelUrl from '../assets/models/arrow.glb?url';
import { gpsToLocal, gpsPointToLocal } from '../api';
import { Minimap } from './Minimap';
import { COURSE_OVERRIDES, buildCourseIndices } from '@shared/course-overrides';
import { loadLevel } from '../levels';
import type { LevelData } from '../levels';
import type { ItemCollectEvent, PlayerState } from '../multiplayer';
import { MAX_PLAYERS } from '../multiplayer';
import type { GameType } from './modes/types';
import { createBusModel, tintBusModel, busColorPaletteFromOption, PLAYER_COLORS, WHEEL_ROLL_SPEED, LIGHT_FRONT_POSITION } from './objects/BusModel';
import type { BusColorPalette } from './objects/BusModel';
import type { CharacterSelection, RunnerAppearance } from './characters';
import { resolveBusColor, resolveRunnerAppearance, isCorgiRunnerId, resolveColor, hexToColor3 } from './characters';
import { createSky } from './objects/Sky';
import type { IcePatchOverlay } from './PathShader';
import { createTiledPathGroundMaterial } from './PathShaderTiled';
import { createRunnerModel, poseStanding, poseRunning } from './objects/RunnerModel';
import { createCorgiModel } from './objects/CorgiModel';
import type { RunnerModelResult } from './objects/RunnerModel';
import {
  ALTITUDE_EXAGGERATION,
  BUS_ACCELERATION,
  BUS_BRAKE,
  BUS_COLLISION_RADIUS,
  BUS_DOWNHILL_ACCEL_BOOST,
  BUS_DOWNHILL_SLOPE_THRESHOLD,
  BUS_FRICTION,
  BUS_GRAVITY,
  BUS_JUMP_PITCH_THRESHOLD,
  BUS_CLIFF_SEPARATION_THRESHOLD,
  BUS_LAUNCH_VEL_CAP,
  BUS_LAUNCH_VEL_MIN,
  BUS_LANDING_IMPACT_SPEED_PENALTY,
  BUS_LANDING_IMPACT_MAX_PENALTY,
  BUS_AIRBORNE_PITCH_LERP,
  BUS_UPHILL_DRAG,
  BUS_AIRBORNE_COLLISION_CLEARANCE,
  BUS_MAX_SPEED,
  BUS_ROOF_Y,
  BUS_START_OFFSET,
  CAMERA_FOV_BUS,
  CAMERA_FOV_RUNNER,
  BUS_TURN_SPEED,
  BUS_TURN_SPEED_STANDSTILL,
  COUNTDOWN_DURATION,
  COURSE_TARGET_LENGTH,
  DRIFT_GRIP,
  DRIFT_HIGH_SPEED_GRIP_FACTOR,
  ELASTIC_SPEED_PENALTY,
  ENGINE_VIBE_AMPLITUDE,
  ENGINE_VIBE_FREQUENCY,
  GRAVITY,
  MODE,
  PATH_HALF_WIDTH,
  RENDER_PATH_MASK_RESOLUTION,
  RENDER_OBJECTS_MAX_DISTANCE,
  RENDER_TREES_MAX_DISTANCE,
  TREE_COUNT,
  RUNNER_COLLISION_RADIUS,
  RUNNER_DOWNHILL_SLOPE_THRESHOLD,
  RUNNER_DOWNHILL_SPEED_BOOST,
  RUNNER_PLAYER_ACCELERATION,
  RUNNER_PLAYER_DECELERATION,
  RUNNER_PLAYER_JUMP_SIDE_VELOCITY,
  RUNNER_PLAYER_MAX_JUMPS,
  RUNNER_PLAYER_SPEED,
  REVERSE_SPEED_MULTIPLIER,
  RUNNER_PLAYER_TURN_SPEED,
  RUNNER_JUMP_HEIGHT,
  RUNNER_SIT_DURATION,
  SCOOP_ANIM_DURATION,
  SCOOP_BOOST_ACCELERATION,
  SCOOP_BOOST_DURATION,
  SCOOP_BOOST_MULTIPLIER,
  SCOOP_DISTANCE,
  SCOOP_FORWARD_FACTOR,
  SCOOP_MIN_UP,
  SCOOP_UP_FACTOR,
  START_CIRCLE_RADIUS,
  WATER_BOB_AMPLITUDE,
  WATER_BOB_SPEED,
  WATER_DRIFT_GRIP,
  WATER_SINK,
  WAVE_DURATION,
  HIGH_FIVE_DURATION,
  POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER,
  POWER_UP_FIKA_DURATION_SECONDS,
  POWER_UP_FIKA_SCALE_MULTIPLIER,
  POWER_UP_FIKA_SCALE_TRANSITION_SPEED,
  POWER_UP_FIKA_SPEED_MULTIPLIER,
  POWER_UP_ICE_BASE_ALPHA,
  POWER_UP_ICE_DURATION_SECONDS,
  POWER_UP_ICE_FADE_SECONDS,
  POWER_UP_ICE_GROW_SECONDS,
  POWER_UP_ICE_RADIUS_METRES,
  POWER_UP_SHOE_DURATION_SECONDS,
  POWER_UP_SHOE_SPEED_MULTIPLIER,
  LIGHT_DAY_HEMI_INTENSITY,
  LIGHT_DAY_HEMI_GROUND_R,
  LIGHT_DAY_HEMI_GROUND_G,
  LIGHT_DAY_HEMI_GROUND_B,
  LIGHT_DAY_SUN_INTENSITY,
  LIGHT_DAY_SUN_DIR_X,
  LIGHT_DAY_SUN_DIR_Y,
  LIGHT_DAY_SUN_DIR_Z,
  LIGHT_NIGHT_HEMI_INTENSITY,
  LIGHT_NIGHT_HEMI_DIFFUSE_R,
  LIGHT_NIGHT_HEMI_DIFFUSE_G,
  LIGHT_NIGHT_HEMI_DIFFUSE_B,
  LIGHT_NIGHT_HEMI_GROUND_R,
  LIGHT_NIGHT_HEMI_GROUND_G,
  LIGHT_NIGHT_HEMI_GROUND_B,
  LIGHT_NIGHT_SUN_INTENSITY,
  LIGHT_NIGHT_SUN_DIR_X,
  LIGHT_NIGHT_SUN_DIR_Y,
  LIGHT_NIGHT_SUN_DIR_Z,
  LIGHT_NIGHT_SUN_DIFFUSE_R,
  LIGHT_NIGHT_SUN_DIFFUSE_G,
  LIGHT_NIGHT_SUN_DIFFUSE_B,
  BUS_HEADLIGHT_INTENSITY,
  BUS_HEADLIGHT_RANGE,
  BUS_HEADLIGHT_ANGLE,
  BUS_HEADLIGHT_EXPONENT,
  BUS_HEADLIGHT_COLOR_R,
  BUS_HEADLIGHT_COLOR_G,
  BUS_HEADLIGHT_COLOR_B,
  BUS_REVERSE_LIGHT_INTENSITY,
  BUS_REVERSE_LIGHT_RANGE,
  BUS_REVERSE_LIGHT_ANGLE,
  BUS_REVERSE_LIGHT_EXPONENT,
  BUS_REVERSE_LIGHT_COLOR_R,
  BUS_REVERSE_LIGHT_COLOR_G,
  BUS_REVERSE_LIGHT_COLOR_B,
} from './constants';
import {
  type BuildingCollider,
  type BuildingFootprint,
  type ElasticObject,
  type GameCallbacks,
  type Goose,
  type Deer,
  type InitSceneOptions,
  type Marshal,
  type RaceState,
  type RemotePlayersMap,
  type Runner,
  type SolidObstacle,
  type WaterZone,
} from './types';
import { buildMinimapPlayers } from './systems/minimap';
import {
  updateChaseCameraSystem,
  updateCountdownCameraSystem,
  updateDemoCameraSystem,
  updateRunnerCameraSystem,
} from './systems/camera';
import { updateRemotePlayersSystem } from './systems/remotePlayers';
import { computeViewCenterXZ } from './systems/viewCenter';
import {
  resolveBusToBusCollisions,
  applyBusYawRate,
  type BusCollisionState,
  type RemoteBusSnapshot,
  type RemoteBusNudge,
} from './systems/busCollision';
import {
  computeTerrainHeight,
  computeTerrainHeightIDW,
  altitudeToLocal,
  computeWaterZones,
  buildWaterMeshes,
  computeRoadPolylines,
  computeBuildingFootprintData,
  isInWaterZone,
  getWaterSurfaceYAt,
  getWaterDepressionAt,
} from './systems/terrain';
import type { LocalAltitudePoint } from './systems/terrain';

import {
  buildBuildingMeshes,
  resolvePositionAgainstBuildings,
  updateBuildingLod,
  type BuildingLodEntry,
} from './systems/buildings';
import {
  createExhaustFlames,
  createExhaustFlamesForBus,
  createWaterWake,
  setWaterWakeActive,
  updateWakeIntensity,
} from './systems/busEffects';
import { createBoostEffects, type BoostEffectsInstance } from './systems/boostEffects';
import {
  spawnRunners as spawnRunnersSystem,
  updateRunnersSystem,
  buildLocalRunner as buildLocalRunnerFn,
  updateLocalRunnerVisual as updateLocalRunnerVisualFn,
  packRemoteRiders,
  assignRoofSeat,
} from './systems/runners';
import {
  updateRunnerInteractions,
  type PlayerRunnerState,
} from './systems/runnerInteractions';
import { poseWaving, poseHighFive } from './objects/RunnerModel';
import {
  buildTrees,
  placeKmSigns,
  buildGates as buildGatesSystem,
  checkGatePass,
  spawnMarshals as spawnMarshalsSystem,
  updateMarshals,
  placeEventLandmarks as placeEventLandmarksSystem,
  buildStartLineObjects,
  updateElasticObjects,
  type GatePosition,
} from './systems/environment';
import {
  buildFenceMesh,
  generateFencePolygon,
  minBoundingCircle,
  resolvePositionAgainstFence,
  DEFAULT_FENCE_DISTANCE,
  type FenceCollider,
} from './objects/Fence';
import { buildLevelObjects, type PlacedObjectData } from './objects/LevelObjects';
import { spawnGeese, updateGeeseSystem, type GooseSpawnPoint } from './systems/geese';
import { spawnDeer, updateDeerSystem, type DeerSpawnPoint } from './systems/deer';
import { updateGameSounds, resetGameSounds, disposeGameSounds, playThud, type BusSoundSource } from './systems/sounds';
import { PowerUpSystem, type PowerUpId } from './systems/powerups';
import { PassengerSystem } from './systems/passengers';
import {
  spawnPreviewRunners,
  updatePreviewRunners,
  disposePreviewRunners,
  type PreviewRunner,
  type PreviewRunnerDef,
} from './systems/previewRunners';
import {
  createPreviewOrbitState,
  setupPreviewOrbitInput,
  updatePreviewOrbitCamera,
  type PreviewOrbitState,
} from './systems/previewCamera';
import { GamepadManager } from './systems/gamepad';

// Module-level engine cache: reuse the same WebGL context per canvas
// to avoid context-loss issues when creating/destroying engines rapidly.
const canvasEngineMap = new WeakMap<HTMLCanvasElement, Engine>();

// ---------- Game class ----------

export class Game {
  private canvas: HTMLCanvasElement;
  private engine!: Engine;
  private scene!: Scene;
  private camera!: FreeCamera;
  private callbacks: GameCallbacks;

  /** True once dispose() has been called — gates async continuations. */
  private _disposed = false;

  // Path data
  private pathPositions: [number, number][] = [];
  private pathHeights: number[] = [];
  private pathCumDist: number[] = [];
  private pathTotalDistance = 0;
  private scaleFactor = 1;
  private elevationScale = 1; // vertical exaggeration
  private originCoord: number[] = [0, 0]; // [lon, lat] of first path point
  private localAltPoints: LocalAltitudePoint[] = []; // scattered altitude samples for IDW terrain
  /** When true, use the level's altCourse instead of the main course */
  useAltCourse = false;

  // Bus state
  private busSpeed = 0; // m/s (forward speed)
  private busYaw = 0; // radians
  private busPitch = 0; // radians – slope tilt (positive = looking up)
  private busVelAngle = 0; // radians – actual velocity direction (lags behind busYaw for drift)
  private busYawRate = 0; // rad/s – collision-induced angular velocity
  private busPos = new Vector3(0, 0, 0); // bus base position (ground level)
  private busVelY = 0; // vertical velocity (m/s) — >0 when airborne going up
  private busAirborne = false; // true while bus is above ground
  private elasticPenaltyActive = false; // true while bus overlaps an elastic object (prevents re-applying penalty)
  private collisionThudPlayed = false; // true while bus overlaps a solid/elastic object (prevents repeat thud)
  private prevSlopePitch = 0; // previous frame's terrain pitch for detecting crests
  private prevGroundY = 0; // previous frame's ground height for cliff detection
  private waterBobPhase = 0; // accumulator for water surface bobbing
  private engineVibePhase = 0; // accumulator for engine vibration
  private cameraYawOffset = 0; // smoothed yaw offset for reverse camera (0 = forward, π = reverse)
  private busMesh: TransformNode | null = null;
  private busBodyShell: TransformNode | null = null;
  private scoopPivot: TransformNode | null = null;
  private frontWheelLeft: TransformNode | null = null;
  private frontWheelRight: TransformNode | null = null;
  private scoopAnimTimer = 0; // >0 while scoop is animating
  private boostTimer = 0; // >0 while scoop speed-boost is active
  private exhaustFlames: ParticleSystem | null = null; // flame particles from exhaust
  private waterWake: ParticleSystem[] = []; // wake/ripple spray when driving through water
  private waterWakeActive = false; // whether wake is currently emitting
  private distanceTravelled = 0;
  private busHeadlight: SpotLight | null = null;
  private busReverseLights: SpotLight[] = [];
  private shadowCamera: FreeCamera | null = null;
  private shadowRTT: RenderTargetTexture | null = null;
  private shadowDepthMat: ShaderMaterial | null = null;

  // Input
  private keys: Record<string, boolean> = {};
  private gamepadManager = new GamepadManager();
  private gamepadCameraOrbitP1 = 0; // right-analog camera yaw offset for P1
  private gamepadCameraOrbitP2 = 0; // right-analog camera yaw offset for P2
  private gamepadRearCamP1 = false; // triangle toggle for rear camera P1
  private gamepadRearCamP2 = false; // triangle toggle for rear camera P2

  // Touch input (virtual joystick)
  private touchActive = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchDeltaX = 0; // normalised –1 to 1 (left/right)
  private touchDeltaY = 0; // normalised –1 to 1 (back/forward)

  // Runners
  private runners: Runner[] = [];

  // Geese (scoopable, AI-driven)
  private geese: Goose[] = [];

  // Deer (scoopable, AI-driven, faster with larger herds)
  private deer: Deer[] = [];

  // Scooped objects (benches etc. flying through the air)
  private scoopedObjects: import('./types').ScoopedObject[] = [];

  // Marshals (course marshals standing at fixed GPS points)
  private marshals: Marshal[] = [];

  /** Scoop events queued this frame to broadcast to peers */
  private pendingScoopEvents: {
    runnerIndex: number;
    playerIndex: number;
    victimPlayerIndex?: number;
    scooperYaw?: number;
    scooperSpeed?: number;
  }[] = [];
  private playerScoopCooldownUntil = new Map<number, number>();
  private itemsEnabled = false;
  private powerUpSystem: PowerUpSystem | null = null;
  private passengerSystem: PassengerSystem | null = null;
  private enterHeldLastFrame = false;
  private runnerFikaTimer = 0;
  private runnerShoeTimer = 0;
  private shoeFlames: ParticleSystem[] = [];
  private shoeFlameEmitters: TransformNode[] = [];
  private icePatches: {
    ownerPlayerIndex: number;
    x: number;
    z: number;
    age: number;
  }[] = [];
  private setIcePatchesOnGround: ((patches: IcePatchOverlay[]) => void) | null = null;
  private updateInsetCenter: ((playerX: number, playerZ: number) => void) | null = null;
  private setViewCenterOnGround: ((x: number, y: number, z: number) => void) | null = null;
  /** Set the second view center for local multiplayer (both players get high shader detail). */
  private setViewCenter2OnGround: ((x: number, y: number, z: number) => void) | null = null;
  private setShadowMapOnGround: ((rtt: RenderTargetTexture, cam: FreeCamera, light: SpotLight) => void) | null = null;
  /** Cached view-center on the ground plane — updated once per frame. */
  private viewCenter = { x: 0, z: 0 };

  // Water zones (local XZ polygons + Y level) — set before buildGround
  private waterZones: WaterZone[] = [];

  private roadPolylines: [number, number][][] = [];
  private trailPolylines: [number, number][][] = [];
  private fieldPolygons: [number, number][][] = [];
  private concretePolygons: [number, number][][] = [];
  private regionEntries: { type: 'field' | 'concrete'; points: [number, number][]; zIndex: number }[] = [];
  private buildingFootprints: BuildingFootprint[] = [];
  private buildingColliders: BuildingCollider[] = [];
  private buildingLodEntries: BuildingLodEntry[] = [];

  // Ground mesh — stored for accurate height queries via getHeightAtCoordinates
  private groundMesh: GroundMesh | null = null;

  // Start circle — cleared zone behind start line (no trees, rendered as path)
  private startCircleCenter: { x: number; z: number } | null = null;

  // Solid obstacles — circle colliders {x, z, radius}
  // Isolated so it's easy to swap for a physics engine later.
  private solidObstacles: SolidObstacle[] = [];

  // Elastic objects — anything that tilts on collision and springs back (trees, signs, marshals)
  private elasticObjects: ElasticObject[] = [];

  // Distance-culled node groups
  private treeRoots: TransformNode[] = [];
  private objectRoots: TransformNode[] = [];

  // Fence boundary collider — generated around path, blocks all entities
  private fenceCollider: FenceCollider = { segments: [] };

  // Custom path texture URL (e.g. track.png for arena levels)
  private pathTextureUrl: string | undefined;

  // Current level data (set once in initScene)
  private level: LevelData | null = null;

  // ---------- Remote players (multiplayer, up to MAX_PLAYERS-1 opponents) ----------
  private remotePlayers: RemotePlayersMap = new Map();

  /** This client's player index (1=host/yellow, 2=red, 3=blue, 4=purple) */
  private localPlayerIndex = 1;

  // Gate/checkpoint system (100 m sections)
  private gatePositions: GatePosition[] = [];
  private currentGateIdx = 0;

  // Race state
  private raceState: RaceState = 'countdown';
  private countdownTimer = 0; // seconds remaining in countdown phase
  private raceTimer = 0; // seconds elapsed while racing
  private finishedTimer = 0; // seconds since race ended (for coast+stop)
  private keepDrivingMode = false; // true when player chooses "Keep Driving"

  // 3D direction arrow (HUD compass)
  private directionArrowRoot: TransformNode | null = null;
  /** Node that receives the Y rotation (pivot sits at model centre) */
  private directionArrowRotNode: TransformNode | null = null;
  /** Smoothed relative angle applied to the arrow (avoids snapping on gate change) */
  private arrowDisplayAngle = 0;
  // P2 direction arrow (local multiplayer)
  private p2DirectionArrowRoot: TransformNode | null = null;
  private p2DirectionArrowRotNode: TransformNode | null = null;
  private p2ArrowDisplayAngle = 0;

  // 3D gate flag (marks next checkpoint)
  private gateFlagRoot: TransformNode | null = null;
  private p2GateFlagRoot: TransformNode | null = null;
  // Checkered finish flag (visible at last path point, hidden on finish)
  private finishFlagRoot: TransformNode | null = null;

  // Minimap
  private minimap: Minimap | null = null;
  private p2Minimap: Minimap | null = null;

  // Pause state
  private paused = false;

  /**
   * When true the countdown does NOT start automatically after init().
   * Call `startCountdown()` externally once all multiplayer players are ready.
   */
  private waitForCountdown = false;

  /**
   * True once the scene has rendered enough frames for the GPU to have
   * uploaded textures and geometry. Used to delay countdown / multiplayer
   * readiness signals until the player actually sees the 3D world.
   */
  private sceneRendered = false;
  private sceneRenderedFrameCount = 0;
  /** How many successful render frames before we consider the scene ready. */
  private static readonly SCENE_READY_FRAMES = 3;
  /** Resolves once the scene has rendered enough frames. */
  private sceneRenderedPromise: Promise<void> = Promise.resolve();
  private sceneRenderedResolve: (() => void) | null = null;
  /** Whether the initial countdown UI ("3") has been fired yet. */
  private countdownUiStarted = false;

  // Demo mode (title screen background)
  private demoMode = false;
  private demoCamProgress = 0; // 0→1 along the path
  private resizeHandler: (() => void) | null = null;
  private mobileLikeDevice = false;
  private effectivePathMaskResolution = RENDER_PATH_MASK_RESOLUTION;
  private effectiveTreeCount = TREE_COUNT;

  // Boost visual effects (camera shake, speed lines, radial blur, DoF)
  private boostEffects: BoostEffectsInstance | null = null;
  private p2BoostEffects: BoostEffectsInstance | null = null;
  private boostEffectsElapsed = 0;

  // Local player role
  private localPlayerRole: 'bus' | 'runner' = 'bus';
  /** Game type / mode for this session */
  private gameType: GameType = 'single-bus';
  /** Character selection (bus colour or runner preset) */
  private charSelection: CharacterSelection | null = null;
  private localRunnerModel: RunnerModelResult | null = null;
  private localRunnerAnimPhase = 0;
  private runnerJumpSideVel = 0;
  private runnerJumpsUsed = 0;
  private jumpHeldLastFrame = false;
  private localRunnerScoopState: 'free' | 'launched' | 'sitting' = 'free';
  private localRunnerScoopVelX = 0;
  private localRunnerScoopVelY = 0;
  private localRunnerScoopVelZ = 0;
  private localRunnerScoopSitTimer = 0;

  // ---------- Local multiplayer (P2) ----------
  private localMultiplayer = false;
  private p2Role: 'bus' | 'runner' = 'runner';
  private p2CharSelection: CharacterSelection | null = null;
  private p2Camera: FreeCamera | null = null;
  private p2CameraYawOffset = 0;
  private p2Pos = new Vector3(0, 0, 0);
  private p2Yaw = 0;
  private p2Speed = 0;
  private p2VelAngle = 0;
  private p2VelY = 0;
  private p2Airborne = false;
  private p2JumpHeldLast = false;
  private p2EnterHeldLast = false;
  private p2JumpsUsed = 0;
  private p2JumpSideVel = 0;
  private p2ScoopAnimTimer = 0;
  private p2BoostTimer = 0;
  private p2ElasticPenaltyActive = false;
  private p2GateIdx = 0;
  private p2Finished = false;
  private p2FinishTime = 0;
  private p2RaceTimer = 0;

  // Player runner interaction state (wave / high-five)
  private playerInteraction: PlayerRunnerState = {
    x: 0, z: 0, yaw: 0, speed: 0,
    canInteract: false,
    interaction: 'none',
    interactionTimer: 0,
    interactionSide: 1,
  };

  // ---------- Preview mode state ----------
  private previewMode = false;
  private previewRunners: PreviewRunner[] = [];
  private previewElapsed = 0; // simulated seconds elapsed
  private previewSpeedMultiplier = 1; // playback speed
  private previewPlaying = false;
  private previewCountdownTimer = 0;
  private followedRunnerIndex = 0; // which runner the camera follows
  private previewOrbitState: PreviewOrbitState | null = null;
  private previewOrbitCleanup: (() => void) | null = null;
  /** Callback to notify UI of preview state changes */
  private onPreviewTick?: (elapsed: number, finished: number, total: number) => void;
  private onPreviewCountdown?: (text: string) => void;
  private onPreviewRaceState?: (state: 'countdown' | 'racing' | 'finished') => void;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: GameCallbacks,
    minimapCanvas?: HTMLCanvasElement,
    options?: { localPlayerRole?: 'bus' | 'runner'; gameType?: GameType; items?: boolean; charSelection?: CharacterSelection | null; localMultiplayer?: boolean; p2Role?: 'bus' | 'runner'; p2CharSelection?: CharacterSelection | null; p2MinimapCanvas?: HTMLCanvasElement },
  ) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.localPlayerRole = options?.localPlayerRole ?? 'bus';
    this.gameType = options?.gameType ?? 'single-bus';
    this.itemsEnabled = options?.items ?? false;
    this.charSelection = options?.charSelection ?? null;
    this.localMultiplayer = options?.localMultiplayer ?? false;
    this.p2Role = options?.p2Role ?? 'runner';
    this.p2CharSelection = options?.p2CharSelection ?? null;
    if (minimapCanvas) {
      this.minimap = new Minimap(minimapCanvas);
    }
    if (options?.localMultiplayer && options.p2MinimapCanvas) {
      this.p2Minimap = new Minimap(options.p2MinimapCanvas);
    }
  }

  // ---------- Pause / Resume ----------

  setPaused(p: boolean) { this.paused = p; }
  isPaused() { return this.paused; }

  /** Tell the game to NOT auto-start the countdown after init(). */
  setWaitForCountdown() { this.waitForCountdown = true; }

  /**
   * Returns a promise that resolves once the scene has rendered at least
   * one frame successfully (i.e. the player can actually see the world).
   */
  waitUntilSceneRendered(): Promise<void> {
    return this.sceneRenderedPromise;
  }

  /**
   * Externally trigger the countdown start (used for multiplayer sync).
   * This positions the cinematic camera and begins the 3-2-1 countdown.
   * The "3" UI callback is deferred until the scene has actually rendered.
   */
  startCountdown() {
    this.waitForCountdown = false;
    this.raceState = 'countdown';
    this.countdownTimer = COUNTDOWN_DURATION;
    this.raceTimer = 0;
    this.finishedTimer = 0;
    this.keepDrivingMode = false;
    // Defer onCountdown('3') / onRaceStateChange to the update loop
    // so the player sees the 3D world before the overlay appears.
    this.countdownUiStarted = false;

    // Position camera in front of the bus for the cinematic sweep
    const frontDir = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
    const camDist = 18;
    const camHeight = 10;
    const groundY = this.getGroundY(this.busPos.x, this.busPos.z);
    this.camera.position = new Vector3(
      this.busPos.x + frontDir.x * camDist,
      Math.max(groundY, this.busPos.y) + camHeight,
      this.busPos.z + frontDir.z * camDist,
    );
    this.camera.setTarget(new Vector3(this.busPos.x, this.busPos.y + (this.localPlayerRole === 'runner' ? 1.4 : 2.5), this.busPos.z));
  }

  // ---------- Keep Driving (post-finish free roam) ----------

  /** Allow the player to resume driving after finishing the race. */
  setKeepDriving() {
    this.keepDrivingMode = true;
  }

  // ---------- Race position ----------

  /**
   * Compute the local player's race position (1st, 2nd, ...) based on
   * gate progress and distance travelled, relative to remote players.
   * Returns { position, total } where total includes the local player.
   */
  getRacePosition(): { position: number; total: number } {
    const remotes = this.remotePlayers;
    const localDist = this.distanceTravelled;
    const localGate = this.currentGateIdx;
    const localFinished = this.raceState === 'finished';

    let ahead = 0; // count of players ahead of local
    let total = 1; // start counting local player

    for (const [, rp] of remotes) {
      if (!rp.state) continue;
      total++;
      const rs = rp.state;
      const remoteFinished = rs.raceState === 'finished';
      const remoteGate = rs.gateIdx ?? 0;

      // Finished players are ahead of non-finished players
      if (remoteFinished && !localFinished) {
        ahead++;
      } else if (!remoteFinished && localFinished) {
        // local is ahead
      } else if (remoteFinished && localFinished) {
        // Both finished — earlier finish time wins
        if (rs.raceTime < this.raceTimer) ahead++;
      } else {
        // Both racing — compare gate progress, then distance
        if (remoteGate > localGate) {
          ahead++;
        } else if (remoteGate === localGate && rs.dist > localDist) {
          ahead++;
        }
      }
    }

    return { position: ahead + 1, total };
  }

  // ---------- Dispose ----------

  dispose() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.boostEffects?.dispose();
    this.boostEffects = null;
    this.p2BoostEffects?.dispose();
    this.p2BoostEffects = null;
    this.powerUpSystem?.dispose();
    this.powerUpSystem = null;
    this.passengerSystem?.dispose();
    this.passengerSystem = null;
    for (const ps of this.shoeFlames) ps.dispose();
    this.shoeFlames = [];
    for (const emitter of this.shoeFlameEmitters) emitter.dispose();
    this.shoeFlameEmitters = [];
    this.icePatches = [];
    this.setIcePatchesOnGround = null;
    this.updateInsetCenter = null;
    this.setViewCenterOnGround = null;
    this.setViewCenter2OnGround = null;
    // Dispose preview orbit input listeners
    if (this.previewOrbitCleanup) {
      this.previewOrbitCleanup();
      this.previewOrbitCleanup = null;
    }
    // Dispose preview runners
    if (this.previewRunners.length > 0) {
      disposePreviewRunners(this.previewRunners);
      this.previewRunners = [];
    }
    this._disposed = true;
    this.engine?.stopRenderLoop();
    // Dispose game sounds
    disposeGameSounds();
    // Dispose local bus lights before scene teardown
    this.busHeadlight?.dispose();
    this.busHeadlight = null;
    for (const rl of this.busReverseLights) rl.dispose();
    this.busReverseLights = [];
    this.shadowRTT?.dispose();
    this.shadowRTT = null;
    this.shadowCamera?.dispose();
    this.shadowCamera = null;
    this.shadowDepthMat?.dispose();
    this.shadowDepthMat = null;
    this.scene?.dispose();
    this.p2Camera = null;
    // Don't dispose the engine — it's reused across game instances to avoid
    // WebGL context creation/destruction race conditions.
    // Resolve sceneRenderedPromise to unblock any waiters (e.g. multiplayer sync)
    this.sceneRenderedResolve?.();
    this.sceneRenderedResolve = null;
  }

  // ---------- Remote bus (multiplayer) ----------

  /** Set this client's player index (called before init). */
  setLocalPlayerIndex(idx: number) {
    this.localPlayerIndex = idx;
  }

  /** Build a remote player visuals (bus + runner) for a specific peer with the given player index. */
  async buildRemoteBusForPeer(peerId: string, playerIndex: number, remoteCharSel?: CharacterSelection) {
    if (!this.scene || this._disposed) return;
    // Don't rebuild if already exists
    if (this.remotePlayers.has(peerId)) return;

    const result = await createBusModel(this.scene);
    if (this._disposed) return;

    // Determine bus colour palette from their selection or fallback to index
    let palette: BusColorPalette;
    if (remoteCharSel?.type === 'bus') {
      const opt = resolveBusColor(remoteCharSel.busColorId);
      palette = busColorPaletteFromOption(opt);
    } else {
      palette = PLAYER_COLORS[playerIndex - 1] ?? PLAYER_COLORS[1];
    }
    tintBusModel(result.root, palette, `p${playerIndex}`);

    // Determine runner appearance from their selection or fallback
    const remoteIsCorgi = remoteCharSel?.type === 'runner' && isCorgiRunnerId(remoteCharSel.runnerId);
    const runnerAppearance: RunnerAppearance | undefined =
      !remoteIsCorgi && remoteCharSel?.type === 'runner'
        ? resolveRunnerAppearance(remoteCharSel.runnerId)
        : undefined;
    const runnerModel = remoteIsCorgi
      ? createCorgiModel(this.scene, 200000 + playerIndex)
      : createRunnerModel(this.scene, 200000 + playerIndex, palette.body, runnerAppearance);

    // Create exhaust flames for this remote bus (starts stopped)
    const flames = createExhaustFlamesForBus(this.scene, result.root);

    // Start hidden until we receive first state
    result.root.setEnabled(false);
    runnerModel.root.setEnabled(false);
    poseStanding(runnerModel);

    // Store scoop pivot rest position for animation
    const scoopPivot = result.scoopPivot;
    (scoopPivot as any).__restY = scoopPivot.position.y;
    (scoopPivot as any).__restZ = scoopPivot.position.z;

    // --- Night headlight + reverse lights (same config as local bus) ---
    const isNight = this.level?.timeOfDay === 'night';
    let headlight: SpotLight | null = null;
    const reverseLights: SpotLight[] = [];
    if (isNight) {
      headlight = new SpotLight(
        `busHeadlight_${peerId}`,
        new Vector3(0, 1.0, 6.5),
        new Vector3(0, -0.15, 1),
        BUS_HEADLIGHT_ANGLE,
        BUS_HEADLIGHT_EXPONENT,
        this.scene,
      );
      headlight.diffuse = new Color3(BUS_HEADLIGHT_COLOR_R, BUS_HEADLIGHT_COLOR_G, BUS_HEADLIGHT_COLOR_B);
      headlight.intensity = BUS_HEADLIGHT_INTENSITY;
      headlight.range = BUS_HEADLIGHT_RANGE;
      headlight.parent = result.root;

      for (const side of [-1, 1]) {
        const rl = new SpotLight(
          `busReverseLight_${peerId}_${side}`,
          new Vector3(side * 2.4 * 0.38, 0.9 + 0.3, -7.0 / 2 - 0.1),
          new Vector3(0, -0.1, -1),
          BUS_REVERSE_LIGHT_ANGLE,
          BUS_REVERSE_LIGHT_EXPONENT,
          this.scene,
        );
        rl.diffuse = new Color3(BUS_REVERSE_LIGHT_COLOR_R, BUS_REVERSE_LIGHT_COLOR_G, BUS_REVERSE_LIGHT_COLOR_B);
        rl.intensity = BUS_REVERSE_LIGHT_INTENSITY;
        rl.range = BUS_REVERSE_LIGHT_RANGE;
        rl.parent = result.root;
        rl.setEnabled(false);
        reverseLights.push(rl);
      }
    }

    this.remotePlayers.set(peerId, {
      mesh: result.root,
      bodyShell: result.bodyShell,
      scoopPivot,
      scoopAnimTimer: 0,
      state: null,
      smoothPos: new Vector3(0, 0, 0),
      smoothYaw: 0,
      smoothPitch: 0,
      playerIndex,
      exhaustFlames: flames,
      riderModels: [],
      riderAnchors: [],
      runnerModel,
      runnerAnimPhase: 0,
      headlight,
      reverseLights,
    });
  }

  /** Remove a remote bus (peer left). */
  removeRemoteBus(peerId: string) {
    const remote = this.remotePlayers.get(peerId);
    if (remote) {
      remote.exhaustFlames?.dispose();
      remote.headlight?.dispose();
      for (const rl of remote.reverseLights) rl.dispose();
      for (const anchor of remote.riderAnchors) anchor.dispose();
      for (const rider of remote.riderModels) rider.root.dispose();
      remote.runnerModel?.root.dispose();
      remote.mesh.dispose();
      this.remotePlayers.delete(peerId);
    }
  }

  /** Feed incoming remote bus state from the network layer. */
  updateRemoteState(state: PlayerState, peerId: string) {
    const remote = this.remotePlayers.get(peerId);
    if (!remote) return;
    const isFirstState = remote.state === null;

    // If remote player has a different charSelection than what we built with,
    // or if the playerIndex changed, rebuild/re-tint the model accordingly.
    if (state.playerIndex && state.playerIndex !== remote.playerIndex) {
      // Determine palette from charSelection or fallback
      let newPalette: BusColorPalette;
      if (state.charSelection?.type === 'bus') {
        const opt = resolveBusColor(state.charSelection.busColorId);
        newPalette = busColorPaletteFromOption(opt);
      } else {
        newPalette = PLAYER_COLORS[state.playerIndex - 1] ?? PLAYER_COLORS[1];
      }
      tintBusModel(remote.mesh, newPalette, `p${state.playerIndex}`);
      // Re-tint the runner model's shirt
      if (remote.runnerModel) {
        for (const m of remote.runnerModel.root.getChildMeshes()) {
          if (m.material && m.material.name.startsWith('rShirt_')) {
            (m.material as StandardMaterial).diffuseColor = newPalette.body.clone();
          }
        }
      }
      remote.playerIndex = state.playerIndex;
    }

    remote.state = state;
    // Snap position on first state so the bus doesn't lerp from (0,0,0)
    if (isFirstState) {
      remote.smoothPos.set(state.x, state.y, state.z);
      remote.smoothYaw = state.yaw;
      remote.smoothPitch = state.pitch;
    }
  }

  /** Get local player state to broadcast. */
  getLocalPlayerState(): PlayerState {
    return {
      x: this.busPos.x,
      y: this.busPos.y,
      z: this.busPos.z,
      yaw: this.busYaw,
      pitch: this.busPitch,
      speed: this.busSpeed,
      dist: this.distanceTravelled,
      scooped: this.runners.filter(r => r.state === 'riding' && r.ownerPlayerIndex === this.localPlayerIndex).length,
      raceState: this.raceState,
      raceTime: this.raceTimer,
      playerIndex: this.localPlayerIndex,
      boosting: this.boostTimer > 0,
      gateIdx: this.currentGateIdx,
      role: this.localPlayerRole,
      scooping: this.scoopAnimTimer > 0,
      powerUp: this.powerUpSystem?.getHeldPowerUp() ?? undefined,
    };
  }

  /** @deprecated Use getLocalPlayerState */
  getLocalBusState(): PlayerState {
    return this.getLocalPlayerState();
  }

  useHeldPowerUp() {
    if (this.localPlayerRole !== 'runner') return;
    const powerUp = this.powerUpSystem?.consumeHeldPowerUp();
    if (!powerUp) return;
    this.activateRunnerPowerUp(powerUp);
  }

  private activateRunnerPowerUp(powerUp: PowerUpId) {
    if (powerUp === 'fika') {
      this.runnerFikaTimer = POWER_UP_FIKA_DURATION_SECONDS;
      return;
    }
    if (powerUp === 'shoe') {
      this.runnerShoeTimer = POWER_UP_SHOE_DURATION_SECONDS;
      this.ensureRunnerShoeFlames();
      return;
    }
    if (powerUp === 'ice') {
      this.icePatches.push({
        ownerPlayerIndex: this.localPlayerIndex,
        x: this.busPos.x,
        z: this.busPos.z,
        age: 0,
      });
      return;
    }
  }

  private ensureRunnerShoeFlames() {
    if (!this.scene || !this.localRunnerModel || this.shoeFlames.length > 0) return;
    const offsets: [number, number, number][] = [
      [-0.12, 0.03, 0.08],
      [0.12, 0.03, 0.08],
    ];
    for (let i = 0; i < offsets.length; i++) {
      const emitter = new TransformNode(`shoeFlameEmitter_${i}`, this.scene);
      emitter.parent = this.localRunnerModel.root;
      emitter.position.set(offsets[i][0], offsets[i][1], offsets[i][2]);
      this.shoeFlameEmitters.push(emitter);

      const ps = new ParticleSystem(`shoeFlames_${i}`, 120, this.scene);
      ps.emitter = emitter;
      ps.minEmitBox.set(0, 0, 0);
      ps.maxEmitBox.set(0, 0, 0);
      ps.minSize = 0.05;
      ps.maxSize = 0.18;
      ps.minLifeTime = 0.08;
      ps.maxLifeTime = 0.22;
      ps.emitRate = 180;
      ps.color1 = new Color3(1, 0.7, 0.2).toColor4(0.9);
      ps.color2 = new Color3(1, 0.25, 0.0).toColor4(0.9);
      ps.colorDead = new Color3(0.4, 0.1, 0.05).toColor4(0);
      ps.direction1 = new Vector3(-0.1, 0.15, -0.8);
      ps.direction2 = new Vector3(0.1, 0.35, -1.1);
      ps.minEmitPower = 0.8;
      ps.maxEmitPower = 1.6;
      ps.updateSpeed = 1 / 60;
      ps.start();
      this.shoeFlames.push(ps);
    }
  }

  private setRunnerShoeFlamesActive(active: boolean) {
    for (const ps of this.shoeFlames) {
      if (active) {
        if (!ps.isStarted()) ps.start();
      } else if (ps.isStarted()) {
        ps.stop();
      }
    }
  }

  private updateRunnerPowerUpEffects(dt: number) {
    if (this.runnerFikaTimer > 0) {
      this.runnerFikaTimer = Math.max(0, this.runnerFikaTimer - dt);
    }
    if (this.runnerShoeTimer > 0) {
      this.runnerShoeTimer = Math.max(0, this.runnerShoeTimer - dt);
    }

    if (this.localRunnerModel) {
      const targetScale = this.runnerFikaTimer > 0 ? POWER_UP_FIKA_SCALE_MULTIPLIER : 1;
      const baseScale = (this.localRunnerModel.root as any).__baseScale ?? 1;
      const currentFika = (this.localRunnerModel.root.scaling.x) / baseScale;
      const blend = Math.min(1, POWER_UP_FIKA_SCALE_TRANSITION_SPEED * dt);
      const nextFika = currentFika + (targetScale - currentFika) * blend;
      this.localRunnerModel.root.scaling.setAll(nextFika * baseScale);
      const shoeActive = this.runnerShoeTimer > 0;
      this.localRunnerModel.leftShoe.setEnabled(shoeActive);
      this.localRunnerModel.rightShoe.setEnabled(shoeActive);
    }

    this.setRunnerShoeFlamesActive(this.runnerShoeTimer > 0 && this.localPlayerRole === 'runner');

    for (let i = this.icePatches.length - 1; i >= 0; i--) {
      const patch = this.icePatches[i];
      patch.age += dt;
      if (patch.age >= POWER_UP_ICE_DURATION_SECONDS) {
        this.icePatches.splice(i, 1);
      }
    }

    if (this.setIcePatchesOnGround) {
      const overlays: IcePatchOverlay[] = [];
      for (const patch of this.icePatches) {
        const growT = Math.min(1, patch.age / POWER_UP_ICE_GROW_SECONDS);
        const easedGrow = 1 - Math.pow(1 - growT, 3);
        const radius = Math.max(0.01, POWER_UP_ICE_RADIUS_METRES * easedGrow);

        const fadeStart = POWER_UP_ICE_DURATION_SECONDS - POWER_UP_ICE_FADE_SECONDS;
        const alpha = patch.age > fadeStart
          ? POWER_UP_ICE_BASE_ALPHA * Math.max(0, 1 - (patch.age - fadeStart) / POWER_UP_ICE_FADE_SECONDS)
          : POWER_UP_ICE_BASE_ALPHA;

        overlays.push({ x: patch.x, z: patch.z, radius, alpha });
      }
      this.setIcePatchesOnGround(overlays);
    }
  }

  private isControlLockedByIcePatch(x: number, z: number): boolean {
    const radiusSq = POWER_UP_ICE_RADIUS_METRES * POWER_UP_ICE_RADIUS_METRES;
    for (const patch of this.icePatches) {
      if (patch.ownerPlayerIndex === this.localPlayerIndex) continue;
      const dx = x - patch.x;
      const dz = z - patch.z;
      if (dx * dx + dz * dz <= radiusSq) return true;
    }
    return false;
  }

  private getRoleForPlayerIndex(playerIndex: number, state?: PlayerState): 'bus' | 'runner' {
    // If we have state from the remote player, trust it
    if (state?.role) return state.role;
    // For bus-race, everyone is a bus
    if (this.gameType === 'bus-race') return 'bus';
    // For scoop-race / arena / team-race, only the designated driver(s) are buses
    // Default: P1 = bus, everyone else = runner
    return playerIndex === 1 ? 'bus' : 'runner';
  }

  private getPlayerPoseByIndex(playerIndex: number): { x: number; y: number; z: number; yaw: number; speed: number } | null {
    if (playerIndex === this.localPlayerIndex) {
      return {
        x: this.busPos.x,
        y: this.busPos.y,
        z: this.busPos.z,
        yaw: this.busYaw,
        speed: this.busSpeed,
      };
    }
    for (const [_peerId, remote] of this.remotePlayers) {
      if (remote.playerIndex === playerIndex && remote.state) {
        return {
          x: remote.state.x,
          y: remote.state.y,
          z: remote.state.z,
          yaw: remote.state.yaw,
          speed: remote.state.speed,
        };
      }
    }
    return null;
  }

  private beginLocalRunnerScoop(_scooperPlayerIndex: number, scooperPose: { yaw: number; speed: number }) {
    this.localRunnerScoopState = 'launched';
    this.busAirborne = false;
    this.runnerJumpsUsed = 0;
    this.runnerJumpSideVel = 0;
    this.jumpHeldLastFrame = false;

    const speed = scooperPose.speed;
    const absSpeed = Math.abs(speed);
    const fwdX = Math.sin(scooperPose.yaw);
    const fwdZ = Math.cos(scooperPose.yaw);
    this.localRunnerScoopVelX = fwdX * speed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;
    this.localRunnerScoopVelY = Math.max(SCOOP_MIN_UP, absSpeed * SCOOP_UP_FACTOR) + Math.random() * 3;
    this.localRunnerScoopVelZ = fwdZ * speed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;
    this.localRunnerAnimPhase = 0;
    this.localRunnerScoopSitTimer = 0;
  }

  private tryScoopRemoteRunnerPlayersByLocalBus() {
    if (this.localPlayerRole !== 'bus') return;
    if (Math.abs(this.busSpeed) <= 0.5) return;
    const nowSec = performance.now() / 1000;

    for (const [_peerId, remote] of this.remotePlayers) {
      if (!remote.state) continue;
      if (this.getRoleForPlayerIndex(remote.playerIndex, remote.state) !== 'runner') continue;
      if (this.playerScoopCooldownUntil.get(remote.playerIndex) && nowSec < (this.playerScoopCooldownUntil.get(remote.playerIndex) ?? 0)) continue;

      const dx = remote.state.x - this.busPos.x;
      const dz = remote.state.z - this.busPos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > SCOOP_DISTANCE * SCOOP_DISTANCE) continue;

      this.playerScoopCooldownUntil.set(remote.playerIndex, nowSec + 2.5);
      this.pendingScoopEvents.push({
        runnerIndex: -1,
        playerIndex: this.localPlayerIndex,
        victimPlayerIndex: remote.playerIndex,
        scooperYaw: this.busYaw,
        scooperSpeed: this.busSpeed,
      });
    }
  }

  private updateLocalRunnerScooped(dt: number) {
    if (this.localRunnerScoopState === 'launched') {
      this.localRunnerScoopVelY -= GRAVITY * dt;
      this.busPos.x += this.localRunnerScoopVelX * dt;
      this.busPos.y += this.localRunnerScoopVelY * dt;
      this.busPos.z += this.localRunnerScoopVelZ * dt;
      this.busSpeed = Math.sqrt(
        this.localRunnerScoopVelX * this.localRunnerScoopVelX
        + this.localRunnerScoopVelZ * this.localRunnerScoopVelZ,
      );

      // Check collision with elastic objects (bouncing)
      for (const obs of this.solidObstacles) {
        const dx = obs.x - this.busPos.x;
        const dz = obs.z - this.busPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = obs.radius + 0.5; // runner collision radius
        if (dist < minDist) {
          const nx = dx / dist;
          const nz = dz / dist;
          if (obs.elasticIndex != null) {
            // Elastic collision: bounce player back and tilt the object
            const elastic = this.elasticObjects[obs.elasticIndex];
            if (elastic) {
              const pushStrength = Math.abs(this.busSpeed) * 0.15;
              elastic.tiltVelX += -nx * pushStrength;
              elastic.tiltVelZ += -nz * pushStrength;
            }
            // Bounce player away
            const bounceStrength = 15;
            this.localRunnerScoopVelX = nx * bounceStrength;
            this.localRunnerScoopVelZ = nz * bounceStrength;
            this.busPos.x += nx * (minDist - dist);
            this.busPos.z += nz * (minDist - dist);
          }
        }
      }

      if (this.resolvePositionAgainstBuildingsLocal(this.busPos, RUNNER_COLLISION_RADIUS)) {
        const bounceStrength = 12;
        const horizontalSpeed = Math.sqrt(
          this.localRunnerScoopVelX * this.localRunnerScoopVelX
          + this.localRunnerScoopVelZ * this.localRunnerScoopVelZ,
        );
        if (horizontalSpeed > 0.001) {
          this.localRunnerScoopVelX *= -bounceStrength / horizontalSpeed;
          this.localRunnerScoopVelZ *= -bounceStrength / horizontalSpeed;
        } else {
          this.localRunnerScoopVelX = 0;
          this.localRunnerScoopVelZ = 0;
        }
      }

      // Fence collision for launched runner
      if (resolvePositionAgainstFence(this.busPos, RUNNER_COLLISION_RADIUS, this.fenceCollider)) {
        const bounceStrength = 12;
        this.localRunnerScoopVelX *= -1;
        this.localRunnerScoopVelZ *= -1;
        const speed = Math.sqrt(
          this.localRunnerScoopVelX * this.localRunnerScoopVelX
          + this.localRunnerScoopVelZ * this.localRunnerScoopVelZ,
        );
        if (speed > 0.001) {
          this.localRunnerScoopVelX = (this.localRunnerScoopVelX / speed) * bounceStrength;
          this.localRunnerScoopVelZ = (this.localRunnerScoopVelZ / speed) * bounceStrength;
        }
      }

      // Check collision with other players (inter-player elasticity)
      for (const [_peerId, remote] of this.remotePlayers) {
        if (!remote.state) continue;
        const dx = remote.smoothPos.x - this.busPos.x;
        const dz = remote.smoothPos.z - this.busPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = BUS_COLLISION_RADIUS + 0.5; // approximate runner size
        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const nz = dz / dist;
          // Bounce player away elastically
          const bounceStrength = 12;
          this.localRunnerScoopVelX = nx * bounceStrength;
          this.localRunnerScoopVelZ = nz * bounceStrength;
          this.busPos.x += nx * (minDist - dist);
          this.busPos.z += nz * (minDist - dist);
        }
      }

      const groundY = this.getGroundY(this.busPos.x, this.busPos.z);
      if (this.busPos.y <= groundY && this.localRunnerScoopVelY < 0) {
        this.busPos.y = groundY;
        this.localRunnerScoopVelX = 0;
        this.localRunnerScoopVelY = 0;
        this.localRunnerScoopVelZ = 0;
        this.busSpeed = 0;
        this.busYawRate = 0;
        this.localRunnerScoopState = 'sitting';
        this.localRunnerScoopSitTimer = RUNNER_SIT_DURATION;
      }
      if (Math.abs(this.localRunnerScoopVelX) > 0.001 || Math.abs(this.localRunnerScoopVelZ) > 0.001) {
        this.busYaw = Math.atan2(this.localRunnerScoopVelX, this.localRunnerScoopVelZ);
      }
      this.distanceTravelled += Math.max(0, this.busSpeed) * dt;
      return;
    }

    if (this.localRunnerScoopState === 'sitting') {
      this.busSpeed = 0;
      this.busYawRate = 0;
      this.busPos.y = this.getGroundY(this.busPos.x, this.busPos.z);
      this.localRunnerScoopSitTimer -= dt;
      if (this.localRunnerScoopSitTimer <= 0) {
        this.localRunnerScoopState = 'free';
        this.localRunnerScoopSitTimer = 0;
      }
    }
  }

  // ---------- Demo mode (title screen background) ----------

  async initDemo(eventId: string) {
    this.demoMode = true;
    await this.initScene(eventId, { skipBus: true, skipRunners: true, skipInput: true });
  }

  // ---------- Preview mode (race replay in 3D) ----------

  async initPreview(
    eventId: string,
    runnerDefs: PreviewRunnerDef[],
    callbacks: {
      onTick?: (elapsed: number, finished: number, total: number) => void;
      onCountdown?: (text: string) => void;
      onRaceState?: (state: 'countdown' | 'racing' | 'finished') => void;
    },
  ) {
    this.previewMode = true;
    this.onPreviewTick = callbacks.onTick;
    this.onPreviewCountdown = callbacks.onCountdown;
    this.onPreviewRaceState = callbacks.onRaceState;
    await this.initScene(eventId, { skipBus: true, skipRunners: true, skipInput: false });

    // Spawn preview runners
    this.previewRunners = spawnPreviewRunners(
      this.scene,
      runnerDefs,
      this.pathPositions,
      (x, z) => this.getGroundY(x, z),
    );

    // Create name labels above runners
    this.createPreviewRunnerLabels();

    // Set up orbit camera behind the first runner
    this.followedRunnerIndex = 0;
    let initialOrbitYaw = Math.PI; // default
    if (this.pathPositions.length > 1) {
      const [sx, sz] = this.pathPositions[0];
      const [nx, nz] = this.pathPositions[1];
      const yaw = Math.atan2(nx - sx, nz - sz);
      initialOrbitYaw = yaw + Math.PI; // camera behind runner
      const groundY = this.getGroundY(sx, sz);
      const fwd = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      this.camera.position = new Vector3(sx - fwd.x * 8, groundY + 3, sz - fwd.z * 8);
      this.camera.setTarget(new Vector3(sx, groundY + 1.2, sz));
    }
    this.previewOrbitState = createPreviewOrbitState(initialOrbitYaw);
    this.previewOrbitCleanup = setupPreviewOrbitInput(this.canvas, this.previewOrbitState);

    // Start countdown
    this.previewCountdownTimer = 3;
    this.previewElapsed = 0;
    this.previewPlaying = false;
    this.onPreviewCountdown?.('3');
    this.onPreviewRaceState?.('countdown');
  }

  /** Create billboarded name labels above each preview runner's head */
  private createPreviewRunnerLabels() {
    for (const runner of this.previewRunners) {
      const label = this.createBillboardLabel(runner.name, runner.model.root);
      if (label) label.position.y = 2.2; // above head
    }
  }

  /** Create a simple billboarded text plane parented to a node */
  private createBillboardLabel(text: string, parent: TransformNode): Mesh | null {
    const texW = 256;
    const texH = 64;
    const tex = new DynamicTexture(`labelTex_${text}`, { width: texW, height: texH }, this.scene, false);
    tex.hasAlpha = true;
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, texW, texH);

    // Draw arrow pointing down
    const arrowW = 10;
    const arrowX = texW / 2;
    const arrowTop = texH - 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(arrowX - arrowW, arrowTop);
    ctx.lineTo(arrowX + arrowW, arrowTop);
    ctx.lineTo(arrowX, texH - 2);
    ctx.closePath();
    ctx.fill();

    // Draw name text
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(text, texW / 2, texH / 2 - 8);
    // Fill
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, texW / 2, texH / 2 - 8);
    tex.update();

    const mat = new StandardMaterial(`labelMat_${text}`, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.useAlphaFromDiffuseTexture = true;

    const planeW = 2.0;
    const planeH = 0.5;
    const plane = MeshBuilder.CreatePlane(`label_${text}`, { width: planeW, height: planeH }, this.scene);
    plane.material = mat;
    plane.parent = parent;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    return plane;
  }

  /** Set the playback speed multiplier for preview mode */
  setPreviewSpeed(speed: number) {
    this.previewSpeedMultiplier = speed;
  }

  /** Toggle play/pause for preview mode */
  setPreviewPlaying(playing: boolean) {
    this.previewPlaying = playing;
  }

  /** Get current preview playing state */
  isPreviewPlaying(): boolean {
    return this.previewPlaying;
  }

  /** Get current preview elapsed seconds */
  getPreviewElapsed(): number {
    return this.previewElapsed;
  }

  /** Seek preview to specific elapsed seconds */
  seekPreview(seconds: number) {
    const newTime = Math.max(0, seconds);
    this.previewElapsed = newTime;
    // Reset any runner whose finish time is after the new time
    for (const r of this.previewRunners) {
      if (newTime < r.finishSeconds) {
        r.state = 'racing';
        r.finished = false;
        r.runoffElapsed = 0;
        r.fraction = 0;
      }
    }
  }

  /** Get max finish time of all preview runners */
  getPreviewMaxTime(): number {
    if (this.previewRunners.length === 0) return 0;
    return Math.max(...this.previewRunners.map((r) => r.finishSeconds));
  }

  /** Get list of runner names for the UI follow-toggle */
  getPreviewRunnerNames(): { index: number; name: string }[] {
    return this.previewRunners.map((r, i) => ({ index: i, name: r.name }));
  }

  /** Set which runner the camera follows */
  setFollowedRunner(index: number) {
    if (index >= 0 && index < this.previewRunners.length) {
      this.followedRunnerIndex = index;
    }
  }

  // ---------- Initialisation ----------

  async init(eventId: string) {
    await this.initScene(eventId, { skipBus: false, skipRunners: false, skipInput: false });
  }

  private detectMobileLikeDevice(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const touchPoints = navigator.maxTouchPoints > 0;
    return /iphone|ipad|ipod|android|mobile|mobi/.test(ua) || coarsePointer || touchPoints;
  }

  private configurePerformanceProfile() {
    this.mobileLikeDevice = this.detectMobileLikeDevice();

    if (this.mobileLikeDevice) {
      const dpr = window.devicePixelRatio || 1;
      const targetMaxDpr = 1.5;
      const targetDpr = Math.min(dpr, targetMaxDpr);
      this.engine.setHardwareScalingLevel(dpr / targetDpr);
      this.effectivePathMaskResolution = Math.min(RENDER_PATH_MASK_RESOLUTION, 2048);
      this.effectiveTreeCount = this.demoMode
        ? Math.max(80, Math.floor(TREE_COUNT * 0.08))
        : Math.max(260, Math.floor(TREE_COUNT * 0.35));
      return;
    }

    this.engine.setHardwareScalingLevel(1);
    this.effectivePathMaskResolution = RENDER_PATH_MASK_RESOLUTION;
    this.effectiveTreeCount = TREE_COUNT;
  }

  private async initScene(
    eventId: string,
    opts: InitSceneOptions,
  ) {
    // Reset game sounds for the new session
    resetGameSounds();

    // Lazy-load full level data (JSON chunks loaded on demand)
    const level: LevelData = await loadLevel(eventId);
    if (this._disposed) return;
    this.level = level;

    // Pick the active course (alt course if requested and available)
    const course = (this.useAltCourse && level.altCourse) ? level.altCourse : level.course;

    // Apply course overrides (section ordering / laps) if available
    // Alt courses use their own coordinate ordering, no overrides
    const usingAltCourse = this.useAltCourse && !!level.altCourse;
    const override = usingAltCourse ? undefined : COURSE_OVERRIDES[eventId];
    const indices = buildCourseIndices(course.coordinates.length, override);
    const orderedCoords = indices.map((i) => course.coordinates[i]);

    // Altitude is now scattered [lat, lon, alt][] points.
    // Derive per-path-point elevations by finding the nearest altitude sample.
    const altitudePoints = level.altitude;
    const elevations = orderedCoords.map((coord) => {
      const lon = coord[0];
      const lat = coord[1];
      let bestAlt = 0;
      let bestDist = Infinity;
      for (const [aLat, aLon, aAlt] of altitudePoints) {
        const dLat = lat - aLat;
        const dLon = lon - aLon;
        const d = dLat * dLat + dLon * dLon; // squared distance (fine for nearest)
        if (d < bestDist) {
          bestDist = d;
          bestAlt = aAlt;
        }
      }
      return bestAlt;
    });

    // Water features come pre-fetched from the level file
    const waterFeatures = level.water;
    const roadFeatures = level.roads ?? [];
    const buildingFeatures = level.buildings ?? [];
    const pathFeatures = level.paths ?? [];

    this.pathTextureUrl = level.pathTexture;

    const { positions, heights, totalDistance } = gpsToLocal(orderedCoords, elevations);

    const courseTargetLength = level.targetLength ?? COURSE_TARGET_LENGTH;
    this.scaleFactor = totalDistance > 0 ? courseTargetLength / totalDistance : 1;
    this.elevationScale = this.scaleFactor * ALTITUDE_EXAGGERATION;
    this.originCoord = course.coordinates[0];
    this.pathPositions = positions.map(([x, z]) => [
      x * this.scaleFactor,
      z * this.scaleFactor,
    ]);
    this.pathHeights = heights.map((h) => h * this.elevationScale);
    this.pathTotalDistance = courseTargetLength;

    // Convert altitude samples to local coordinates for IDW terrain
    this.localAltPoints = altitudeToLocal(
      altitudePoints,
      this.originCoord,
      this.scaleFactor,
      this.elevationScale,
    );

    // Pre-compute cumulative distances along path for spline parameterisation
    this.pathCumDist = [0];
    for (let i = 1; i < this.pathPositions.length; i++) {
      const [ax, az] = this.pathPositions[i - 1];
      const [bx, bz] = this.pathPositions[i];
      const d = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
      this.pathCumDist.push(this.pathCumDist[i - 1] + d);
    }

    // Engine + scene — reuse existing engine for this canvas to avoid
    // WebGL context creation/loss race conditions.
    const cachedEngine = canvasEngineMap.get(this.canvas);
    if (cachedEngine) {
      cachedEngine.stopRenderLoop();
      this.engine = cachedEngine;
    } else {
      this.engine = new Engine(this.canvas, true, { stencil: true });
      canvasEngineMap.set(this.canvas, this.engine);
    }
    this.engine.resize();
    this.configurePerformanceProfile();
    this.scene = new Scene(this.engine);
    const isNightFallback = level.timeOfDay === 'night';
    this.scene.clearColor = isNightFallback
      ? new Color4(0.02, 0.02, 0.06, 1) // dark night sky fallback
      : new Color4(0.68, 0.88, 1.0, 1); // bright sky blue fallback

    // Camera
    this.camera = new FreeCamera('cam', new Vector3(0, 10, -15), this.scene);
    this.camera.minZ = 0.1;
    this.camera.fov = this.localPlayerRole === 'runner' ? CAMERA_FOV_RUNNER : CAMERA_FOV_BUS;
    this.camera.inputs.clear();

    // Local multiplayer: set up split-screen with a second camera for P2
    if (this.localMultiplayer) {
      // Layer mask setup: default meshes 0x0FFFFFFF visible to both cameras.
      // P1-exclusive (arrow) = 0x10000000, P2-exclusive = 0x20000000.
      this.camera.layerMask = 0x1FFFFFFF;
      const isLandscape = this.canvas.width >= this.canvas.height;
      if (isLandscape) {
        this.camera.viewport = new Viewport(0, 0, 0.5, 1);
      } else {
        // Portrait: P1 bottom, P2 top (BabylonJS y=0 is bottom)
        this.camera.viewport = new Viewport(0, 0, 1, 0.5);
      }

      this.p2Camera = new FreeCamera('cam-p2', new Vector3(0, 10, -15), this.scene);
      this.p2Camera.minZ = 0.1;
      this.p2Camera.fov = this.localPlayerRole === 'runner' ? CAMERA_FOV_BUS : CAMERA_FOV_RUNNER;
      this.p2Camera.inputs.clear();
      this.p2Camera.layerMask = 0x2FFFFFFF;
      if (isLandscape) {
        this.p2Camera.viewport = new Viewport(0.5, 0, 0.5, 1);
      } else {
        this.p2Camera.viewport = new Viewport(0, 0.5, 1, 0.5);
      }
      this.scene.activeCameras = [this.camera, this.p2Camera];
    }

    // --- Boost visual effects (per-camera) ---
    this.boostEffects = createBoostEffects({
      scene: this.scene,
      camera: this.camera,
      particleLayerMask: this.localMultiplayer ? 0x10000000 : undefined,
      enableDepthOfField: !this.mobileLikeDevice,
    });
    if (this.localMultiplayer && this.p2Camera) {
      this.p2BoostEffects = createBoostEffects({
        scene: this.scene,
        camera: this.p2Camera,
        particleLayerMask: 0x20000000,
        enableDepthOfField: !this.mobileLikeDevice,
      });
    }

    // Lights — adapt to time of day (values from constants.ts)
    const isNight = level.timeOfDay === 'night';
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = isNight ? LIGHT_NIGHT_HEMI_INTENSITY : LIGHT_DAY_HEMI_INTENSITY;
    hemi.groundColor = isNight
      ? new Color3(LIGHT_NIGHT_HEMI_GROUND_R, LIGHT_NIGHT_HEMI_GROUND_G, LIGHT_NIGHT_HEMI_GROUND_B)
      : new Color3(LIGHT_DAY_HEMI_GROUND_R, LIGHT_DAY_HEMI_GROUND_G, LIGHT_DAY_HEMI_GROUND_B);
    if (isNight) {
      hemi.diffuse = new Color3(LIGHT_NIGHT_HEMI_DIFFUSE_R, LIGHT_NIGHT_HEMI_DIFFUSE_G, LIGHT_NIGHT_HEMI_DIFFUSE_B);
    }

    const sun = new DirectionalLight('sun',
      new Vector3(LIGHT_DAY_SUN_DIR_X, LIGHT_DAY_SUN_DIR_Y, LIGHT_DAY_SUN_DIR_Z), this.scene);
    sun.intensity = isNight ? LIGHT_NIGHT_SUN_INTENSITY : LIGHT_DAY_SUN_INTENSITY;
    if (isNight) {
      sun.direction = new Vector3(LIGHT_NIGHT_SUN_DIR_X, LIGHT_NIGHT_SUN_DIR_Y, LIGHT_NIGHT_SUN_DIR_Z);
      sun.diffuse = new Color3(LIGHT_NIGHT_SUN_DIFFUSE_R, LIGHT_NIGHT_SUN_DIFFUSE_G, LIGHT_NIGHT_SUN_DIFFUSE_B);
    }

    // Build world — water zones must be computed before ground so terrain dips
    this.waterZones = computeWaterZones(waterFeatures, course.coordinates[0], this.scaleFactor, (x, z) => this.getTerrainHeight(x, z));
    this.roadPolylines = computeRoadPolylines(roadFeatures, course.coordinates[0], this.scaleFactor);
    this.trailPolylines = pathFeatures.map((p) =>
      p.points.map(([lat, lon]): [number, number] => {
        const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
        return [rawX * this.scaleFactor, rawZ * this.scaleFactor];
      }),
    ).filter((t) => t.length >= 2);
    this.buildingFootprints = computeBuildingFootprintData(buildingFeatures, course.coordinates[0], this.scaleFactor);
    // Convert regions from GPS [lat, lon] polygons to world-space [x, z] polygons
    const gpsToWorld = (polygon: [number, number][]) =>
      polygon.map(([lat, lon]): [number, number] => {
        const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
        return [rawX * this.scaleFactor, rawZ * this.scaleFactor];
      });
    const regionEntries = (level.regions ?? []).map((r) => ({
      type: r.type,
      points: gpsToWorld(r.points),
      zIndex: r.zIndex ?? 0,
    }));
    this.fieldPolygons = regionEntries.filter((r) => r.type === 'field').map((r) => r.points);
    this.concretePolygons = regionEntries.filter((r) => r.type === 'concrete').map((r) => r.points);
    this.regionEntries = regionEntries;
    this.buildGround();
    buildWaterMeshes(this.scene, this.waterZones, { isNight });
    const buildingResult = buildBuildingMeshes(this.scene, this.buildingFootprints, (x, z) => this.getGroundY(x, z), { isNight });
    this.buildingColliders = buildingResult.colliders;
    this.buildingLodEntries = buildingResult.lodEntries;
    this.updateBuildingLodForPlayer();
    this.updateDistanceCulling();
    if (level.trees !== false) {
      const manualTreePositions: [number, number][] = (level.manualTrees ?? []).map(
        ([lat, lon]): [number, number] => {
          const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
          return [rawX * this.scaleFactor, rawZ * this.scaleFactor];
        },
      );
      const treeResult = buildTrees(
        this.scene,
        this.pathPositions,
        (x, z) => this.getGroundY(x, z),
        this.waterZones,
        this.startCircleCenter,
        this.roadPolylines,
        this.trailPolylines,
        this.effectiveTreeCount,
        [...this.fieldPolygons, ...this.concretePolygons],
        manualTreePositions,
      );
      this.elasticObjects.push(...treeResult.elasticObjects);
      this.solidObstacles.push(...treeResult.solidObstacles);
      this.treeRoots.push(...treeResult.elasticObjects.map(e => e.root));
    } else if (level.manualTrees && level.manualTrees.length > 0) {
      // Even when procedural trees are disabled, place manual trees
      const manualTreePositions: [number, number][] = level.manualTrees.map(
        ([lat, lon]): [number, number] => {
          const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
          return [rawX * this.scaleFactor, rawZ * this.scaleFactor];
        },
      );
      const treeResult = buildTrees(
        this.scene,
        this.pathPositions,
        (x, z) => this.getGroundY(x, z),
        this.waterZones,
        this.startCircleCenter,
        this.roadPolylines,
        this.trailPolylines,
        0, // no procedural trees
        [...this.fieldPolygons, ...this.concretePolygons],
        manualTreePositions,
      );
      this.elasticObjects.push(...treeResult.elasticObjects);
      this.solidObstacles.push(...treeResult.solidObstacles);
      this.treeRoots.push(...treeResult.elasticObjects.map(e => e.root));
    }

    // ── Level objects (benches, lampposts, tennis courts) ──
    {
      const toPlaced = (arr: [number, number, number][] | undefined, rotOffset = 0): PlacedObjectData[] =>
        (arr ?? []).map(([lat, lon, rot]) => {
          const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
          return {
            x: rawX * this.scaleFactor,
            z: rawZ * this.scaleFactor,
            rotation: (rot * Math.PI) / 180 + rotOffset,
          };
        });
      const objs = level.objects;
      const objResult = buildLevelObjects(
        this.scene,
        toPlaced(objs?.benches, Math.PI * 5 / 12),   // 75° CW offset
        toPlaced(objs?.lampposts),
        toPlaced(objs?.tennisCourts),
        toPlaced(objs?.floodlights),
        (x, z) => this.getGroundY(x, z),
        isNight,
      );
      // Offset elastic indices so they map into the global elasticObjects array
      const elasticOffset = this.elasticObjects.length;
      for (const obs of objResult.solidObstacles) {
        if (obs.elasticIndex != null) obs.elasticIndex += elasticOffset;
      }
      this.elasticObjects.push(...objResult.elasticObjects);
      this.solidObstacles.push(...objResult.solidObstacles);
      this.objectRoots.push(...objResult.objectRoots);
    }

    // ── Geese (scoopable AI entities) ──
    {
      const geeseData = (level.objects?.geese ?? []).map(([lat, lon, rot]) => {
        const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
        return {
          x: rawX * this.scaleFactor,
          z: rawZ * this.scaleFactor,
          rotation: (rot * Math.PI) / 180,
        } as GooseSpawnPoint;
      });
      console.log('[Geese] spawn data:', geeseData.length, 'geese');
      if (geeseData.length > 0) {
        this.geese = spawnGeese(this.scene, geeseData, (x, z) => this.getGroundY(x, z));
      }
    }

    // ── Deer (scoopable AI entities, faster with larger herds) ──
    {
      const deerData = (level.objects?.deer ?? []).map(([lat, lon, rot]) => {
        const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
        return {
          x: rawX * this.scaleFactor,
          z: rawZ * this.scaleFactor,
          rotation: (rot * Math.PI) / 180,
        } as DeerSpawnPoint;
      });
      console.log('[Deer] spawn data:', deerData.length, 'deer');
      if (deerData.length > 0) {
        this.deer = spawnDeer(this.scene, deerData, (x, z) => this.getGroundY(x, z));
      }
    }

    // Procedural sky + clouds
    createSky(this.scene, level.timeOfDay ?? 'day');

    if (!opts.skipBus) {
      await this.buildBus();
    }
    if (this._disposed) return;
    if (!this.demoMode && this.localPlayerRole === 'runner') {
      const localIsCorgi = this.charSelection?.type === 'runner' && isCorgiRunnerId(this.charSelection.runnerId);
      const runnerAppearance = !localIsCorgi && this.charSelection?.type === 'runner'
        ? resolveRunnerAppearance(this.charSelection.runnerId)
        : undefined;
      this.localRunnerModel = buildLocalRunnerFn(this.scene, this.localPlayerIndex, this.busPos, this.busYaw, runnerAppearance, localIsCorgi);
      if (this.busMesh) {
        this.busMesh.setEnabled(false);
      }
    }
    // Local multiplayer: initialise P2 starting position and spawn P2's visual model as a remote player
    if (this.localMultiplayer) {
      // P2 starts one lane to the right of P1 (side-by-side, like remote multiplayer)
      const rightX = Math.cos(this.busYaw);
      const rightZ = -Math.sin(this.busYaw);
      const lateralOffset = 4; // metres — same lane spacing as remote multiplayer
      this.p2Pos.set(
        this.busPos.x + rightX * lateralOffset,
        0,
        this.busPos.z + rightZ * lateralOffset,
      );
      this.p2Pos.y = this.getGroundY(this.p2Pos.x, this.p2Pos.z);
      this.p2Yaw = this.busYaw;
      this.p2GateIdx = 0;
      this.p2Finished = false;
      this.p2FinishTime = 0;
      this.p2RaceTimer = 0;

      // Build a remote-player-style visual for P2 using playerIndex 2
      await this.buildRemoteBusForPeer('__p2__', 2, this.p2CharSelection ?? undefined);
      if (this._disposed) return;
      const p2Remote = this.remotePlayers.get('__p2__');
      if (p2Remote) {
        // Enable it and snap it to P2 start position
        p2Remote.mesh.setEnabled(this.p2Role === 'bus');
        p2Remote.runnerModel?.root.setEnabled(this.p2Role === 'runner');
        p2Remote.smoothPos.copyFrom(this.p2Pos);
        p2Remote.smoothYaw = this.p2Yaw;
        p2Remote.state = { x: this.p2Pos.x, y: this.p2Pos.y, z: this.p2Pos.z, yaw: this.p2Yaw, pitch: 0, speed: 0, dist: 0, scooped: 0, boosting: false, scooping: false, raceState: 'countdown', raceTime: 0, gateIdx: 0, playerIndex: 2, role: this.p2Role };
      }
    }
    if (!opts.skipRunners && this.gameType !== 'single-bus-mode') {
      this.runners = spawnRunnersSystem(this.scene, this.pathPositions, (x, z) => this.getGroundY(x, z));
    }
    // Bus Mode: spawn passenger NPCs instead of regular runners
    if (this.gameType === 'single-bus-mode' && !opts.skipRunners) {
      // Pre-compute fence bounds so passenger/target spawns stay inside the fence
      const fenceDistance = level.fenceDistance ?? DEFAULT_FENCE_DISTANCE;
      const fenceCircle = minBoundingCircle(this.pathPositions);
      const fenceBounds = {
        cx: fenceCircle.cx,
        cz: fenceCircle.cz,
        radius: fenceCircle.radius + fenceDistance,
      };

      this.passengerSystem = new PassengerSystem(
        this.scene,
        this.pathPositions,
        this.pathCumDist,
        this.roadPolylines,
        this.trailPolylines,
        (x, z) => this.getGroundY(x, z),
        {
          onPickup: () => this.callbacks.onScoopRunner(),
          onDelivery: (count) => this.callbacks.onBusModeDelivery?.(count),
          onTimerChange: (remaining) => this.callbacks.onBusModeTimer?.(remaining),
          onTimeBonus: (seconds) => this.callbacks.onBusModeBonus?.(seconds),
          onGameOver: (deliveries) => {
            this.raceState = 'finished';
            this.callbacks.onRaceStateChange?.('finished');
            this.callbacks.onBusModeGameOver?.(deliveries);
          },
          onTriggerScoopAnim: () => {
            this.scoopAnimTimer = SCOOP_ANIM_DURATION;
          },
          onTriggerBoost: () => {
            this.boostTimer += SCOOP_BOOST_DURATION;
          },
        },
        fenceBounds,
      );
      this.passengerSystem.spawn();
    }
    if (level.kmSigns !== false) {
      const kmResult = placeKmSigns(this.scene, this.pathPositions, (x, z) => this.getGroundY(x, z));
      const kmElasticOffset = this.elasticObjects.length;
      this.elasticObjects.push(...kmResult.elasticObjects);
      for (const obs of kmResult.solidObstacles) {
        if (obs.elasticIndex != null) obs.elasticIndex += kmElasticOffset;
      }
      this.solidObstacles.push(...kmResult.solidObstacles);
    }
    this.gatePositions = buildGatesSystem(this.pathPositions, this.pathCumDist, (x, z) => this.getGroundY(x, z));
    this.currentGateIdx = 0;
    if (this.gameType !== 'single-bus-mode' && !this.demoMode) {
      this.buildGateFlag();
      this.buildP2GateFlag();
      this.buildFinishFlag();
    }
    this.powerUpSystem = new PowerUpSystem({
      scene: this.scene,
      enabled: this.itemsEnabled,
      localPlayerIndex: this.localPlayerIndex,
      onPowerUpDisplayChange: (powerUp, rolling) => this.callbacks.onPowerUpDisplayChange?.(powerUp, rolling),
      pathPositions: this.pathPositions,
      pathCumDist: this.pathCumDist,
      getGroundY: (x, z) => this.getGroundY(x, z),
    });

    // --- Night mode: register shadow casters for headlight shadow map ---
    if (isNight && this.shadowRTT && this.shadowDepthMat && this.busHeadlight) {
      const addShadowCaster = (node: TransformNode) => {
        for (const m of node.getChildMeshes(false)) {
          this.shadowRTT!.renderList!.push(m);
          this.shadowRTT!.setMaterialForRendering(m, this.shadowDepthMat!);
        }
      };
      for (const runner of this.runners) {
        addShadowCaster(runner.mesh);
      }
      if (this.localRunnerModel) {
        addShadowCaster(this.localRunnerModel.root);
      }
      this.setShadowMapOnGround?.(this.shadowRTT, this.shadowCamera!, this.busHeadlight);
    }

    // Place sign & position bus behind start line
    if (this.pathPositions.length > 1) {
      const [sx, sz] = this.pathPositions[0];
      const [nx, nz] = this.pathPositions[1];
      const yaw = Math.atan2(nx - sx, nz - sz);

      // Start line objects (parkrun sign + marshal)
      if (level.parkrunSign !== false) {
        const startLineResult = buildStartLineObjects(this.scene, this.pathPositions, eventId, (x, z) => this.getGroundY(x, z));
        const slElasticOffset = this.elasticObjects.length;
        this.elasticObjects.push(...startLineResult.elasticObjects);
        for (const obs of startLineResult.solidObstacles) {
          if (obs.elasticIndex != null) obs.elasticIndex += slElasticOffset;
        }
        this.solidObstacles.push(...startLineResult.solidObstacles);
        this.marshals.push(...startLineResult.marshals);
      }

      // Player starts behind the start line, fanned outward by player index
      const forwardX = Math.sin(yaw);
      const forwardZ = Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      const lateralSpacing = 4; // metres between each player's lane
      const totalPlayers = this.localMultiplayer ? 2 : MAX_PLAYERS;
      // Centre the fan: player indices 1..N get offsets centred around 0
      const laneOffset = (this.localPlayerIndex - 1) - (totalPlayers - 1) / 2;
      this.busPos.x = sx - forwardX * BUS_START_OFFSET + rightX * laneOffset * lateralSpacing;
      this.busPos.z = sz - forwardZ * BUS_START_OFFSET + rightZ * laneOffset * lateralSpacing;
      const startH = this.getGroundY(this.busPos.x, this.busPos.z);
      this.busPos.y = startH;
      this.busYaw = yaw;
      this.busVelAngle = yaw;

      // Reposition P2 next to P1 now that we have the final start-line position
      if (this.localMultiplayer) {
        this.p2Pos.set(
          this.busPos.x + rightX * lateralSpacing,
          0,
          this.busPos.z + rightZ * lateralSpacing,
        );
        this.p2Pos.y = this.getGroundY(this.p2Pos.x, this.p2Pos.z);
        this.p2Yaw = yaw;
        const p2Remote = this.remotePlayers.get('__p2__');
        if (p2Remote) {
          p2Remote.smoothPos.copyFrom(this.p2Pos);
          p2Remote.smoothYaw = this.p2Yaw;
          if (p2Remote.state) {
            p2Remote.state.x = this.p2Pos.x;
            p2Remote.state.y = this.p2Pos.y;
            p2Remote.state.z = this.p2Pos.z;
            p2Remote.state.yaw = this.p2Yaw;
          }
        }
      }
    }

    // --- Marshals ---
    if (level.showMarshals !== false) {
      const marshalResult = spawnMarshalsSystem(this.scene, level, this.pathPositions, this.originCoord, this.scaleFactor, (x, z) => this.getGroundY(x, z));
      this.marshals.push(...marshalResult.marshals);
      const marshalElasticOffset = this.elasticObjects.length;
      this.elasticObjects.push(...marshalResult.elasticObjects);
      for (const obs of marshalResult.solidObstacles) {
        if (obs.elasticIndex != null) obs.elasticIndex += marshalElasticOffset;
      }
      this.solidObstacles.push(...marshalResult.solidObstacles);
    }

    // --- Event-specific landmarks ---
    const landmarkResult = placeEventLandmarksSystem(this.scene, eventId, this.originCoord, this.scaleFactor, (x, z) => this.getGroundY(x, z));
    this.solidObstacles.push(...landmarkResult.solidObstacles);
    this.buildingFootprints.push(...landmarkResult.buildingFootprints);
    this.buildingColliders.push(...landmarkResult.buildingColliders);

    // --- Fence boundary ---
    if (level.fences !== false) {
      const fenceDistance = level.fenceDistance ?? DEFAULT_FENCE_DISTANCE;
      const boundaryPoly = generateFencePolygon(this.pathPositions, fenceDistance);
      if (boundaryPoly.length >= 3) {
        this.fenceCollider = buildFenceMesh(this.scene, boundaryPoly, (x, z) => this.getGroundY(x, z));
      }
    }
    // Custom fences from level data (e.g. palace grounds, arena perimeter)
    if (level.customFences) {
      for (const fence of level.customFences) {
        const localPoly: [number, number][] = fence.points.map(([lat, lon]) => {
          const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
          return [rawX * this.scaleFactor, rawZ * this.scaleFactor] as [number, number];
        });
        const customCollider = buildFenceMesh(this.scene, localPoly, (x, z) => this.getGroundY(x, z));
        this.fenceCollider.segments.push(...customCollider.segments);
      }
    }

    // Give minimap the map feature data
    if (this.minimap) {
      this.minimap.setPath(this.pathPositions);
      this.minimap.setWaterZones(this.waterZones);
      this.minimap.setRoads(this.roadPolylines);
      this.minimap.setTrails(this.trailPolylines);
      this.minimap.setBuildings(this.buildingFootprints);
      if (this.level?.minimapZoom) {
        this.minimap.setZoom(this.level.minimapZoom);
      }
    }
    if (this.p2Minimap) {
      this.p2Minimap.setPath(this.pathPositions);
      this.p2Minimap.setWaterZones(this.waterZones);
      this.p2Minimap.setRoads(this.roadPolylines);
      this.p2Minimap.setTrails(this.trailPolylines);
      this.p2Minimap.setBuildings(this.buildingFootprints);
      if (this.level?.minimapZoom) {
        this.p2Minimap.setZoom(this.level.minimapZoom);
      }
    }

    if (!opts.skipBus) {
      await this.buildDirectionArrow();
      // In local multiplayer, also build a second arrow for P2 parented to p2Camera
      if (this.localMultiplayer && this.p2Camera) {
        await this.buildDirectionArrowForCamera(this.p2Camera, 'p2');
      }
    }
    if (this._disposed) return;

    if (!opts.skipInput) {
      this.setupInput();
    }

    // Start countdown for real games.
    // We set the state and position the camera here but defer the UI
    // callbacks ("3", raceStateChange) until the scene has actually
    // rendered a few frames so the player sees the 3D world first.
    if (!this.demoMode && !this.previewMode && !this.waitForCountdown) {
      this.raceState = 'countdown';
      this.countdownTimer = COUNTDOWN_DURATION;
      this.raceTimer = 0;
      this.finishedTimer = 0;
      this.keepDrivingMode = false;
      this.countdownUiStarted = false; // will fire once scene is rendered

      // Position camera in front of the bus so the first visible frame shows the bus
      const frontDir = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
      const camDist = 18;
      const camHeight = 10;
      const groundY = this.getGroundY(this.busPos.x, this.busPos.z);
      this.camera.position = new Vector3(
        this.busPos.x + frontDir.x * camDist,
        Math.max(groundY, this.busPos.y) + camHeight,
        this.busPos.z + frontDir.z * camDist,
      );
      this.camera.setTarget(new Vector3(this.busPos.x, this.busPos.y + (this.localPlayerRole === 'runner' ? 1.4 : 2.5), this.busPos.z));
    }

    // Position demo camera at start of path
    if (this.demoMode && this.pathPositions.length > 1) {
      this.demoCamProgress = 0;
      const [sx, sz] = this.pathPositions[0];
      const startY = this.getGroundY(sx, sz) + 15;
      this.camera.position = new Vector3(sx, startY, sz);
    }

    // Wait for all materials/shaders to compile before rendering
    await new Promise<void>((resolve) => {
      this.scene.executeWhenReady(() => resolve());
    });
    if (this._disposed) return;

    // Prepare the "scene rendered" promise so callers can await the
    // first successful render (used to gate countdown / readiness).
    this.sceneRendered = false;
    this.sceneRenderedFrameCount = 0;
    this.sceneRenderedPromise = new Promise<void>((resolve) => {
      this.sceneRenderedResolve = resolve;
    });

    // Safety timeout: if scene doesn't render within 5 seconds after
    // the render loop starts, force-resolve the scene-ready gate so
    // the game never gets permanently stuck on the countdown.
    const sceneReadyTimeout = setTimeout(() => {
      if (!this.sceneRendered && !this._disposed) {
        console.warn('[Game] Scene render timeout — forcing ready state');
        this.sceneRendered = true;
        this.sceneRenderedResolve?.();
        this.sceneRenderedResolve = null;
      }
    }, 5000);

    // Game loop
    this.engine.runRenderLoop(() => {
      if (this._disposed) return;
      const dt = this.engine.getDeltaTime() / 1000;

      // Update game logic — wrapped in try/catch to ensure scene.render()
      // is always reached even if game logic throws.
      try {
        if (this.previewMode) {
          this.updatePreview(dt);
        } else if (this.demoMode) {
          this.updateDemoCamera(dt);
        } else {
          this.update(dt);
        }
      } catch (e) {
        console.warn('[Game] update error:', e);
      }

      try {
        this.scene.render();
        // Wait for a few successful render frames so the GPU has time
        // to upload textures/geometry before we consider the scene ready.
        if (!this.sceneRendered) {
          this.sceneRenderedFrameCount++;
          if (this.sceneRenderedFrameCount >= Game.SCENE_READY_FRAMES) {
            this.sceneRendered = true;
            this.sceneRenderedResolve?.();
            this.sceneRenderedResolve = null;
            clearTimeout(sceneReadyTimeout);
          }
        }
      } catch (e) {
        // Log render errors — previously these were silently swallowed,
        // hiding WebGL context-loss and shader compilation failures.
        console.warn('[Game] scene.render() error:', e);
      }
    });

    this.resizeHandler = () => {
      this.engine.resize();
      if (this.localMultiplayer && this.p2Camera) {
        const landscape = this.canvas.width >= this.canvas.height;
        if (landscape) {
          this.camera.viewport = new Viewport(0, 0, 0.5, 1);
          this.p2Camera.viewport = new Viewport(0.5, 0, 0.5, 1);
        } else {
          this.camera.viewport = new Viewport(0, 0, 1, 0.5);
          this.p2Camera.viewport = new Viewport(0, 0.5, 1, 0.5);
        }
      }
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  // ---------- Build environment ----------

  private buildGround() {
    // Higher subdivisions = smoother terrain close-up (15m/cell vs previous 30m/cell)
    const subdivisions = 400;
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

    // Start circle: a cleared dirt area behind the start line where buses spawn
    let startCircleInfo: { x: number; z: number; radius: number } | undefined;
    if (this.level?.startCircle !== false && this.pathPositions.length > 1) {
      const [sx, sz] = this.pathPositions[0];
      const [nx, nz] = this.pathPositions[1];
      const yaw = Math.atan2(nx - sx, nz - sz);
      const cx = sx - Math.sin(yaw) * BUS_START_OFFSET;
      const cz = sz - Math.cos(yaw) * BUS_START_OFFSET;
      startCircleInfo = { x: cx, z: cz, radius: START_CIRCLE_RADIUS };
      this.startCircleCenter = { x: cx, z: cz };
    }

    const shaderOpts = {
      pathPositions: this.pathPositions,
      roads: this.roadPolylines,
      trails: this.trailPolylines,
      groundSize: 6000,
      pathHalfWidth: PATH_HALF_WIDTH,
      roadHalfWidth: PATH_HALF_WIDTH * 1.4,
      edgeSoftness: 1.5,
      maskResolution: this.effectivePathMaskResolution,
      startLine: startLineInfo,
      startCircle: startCircleInfo,
      pathTextureUrl: this.pathTextureUrl,
      fields: this.fieldPolygons,
      concrete: this.concretePolygons,
      regions: this.regionEntries,
      waterZones: this.waterZones,
      isNight: this.level?.timeOfDay === 'night',
    };

    // Use tiled two-level path shader for better performance on weaker devices.
    // Falls back to the original single-texture MixMaterial when tiled shader
    // is not available or not wanted.
    const tiledMat = createTiledPathGroundMaterial(this.scene, shaderOpts);
    ground.material = tiledMat;
    this.setIcePatchesOnGround = tiledMat.__setIcePatches ?? null;
    this.setIcePatchesOnGround?.([]);
    this.updateInsetCenter = tiledMat.__updateInsetCenter ?? null;
    this.setViewCenterOnGround = tiledMat.__setViewCenter ?? null;
    this.setViewCenter2OnGround = tiledMat.__setViewCenter2 ?? null;
    this.setShadowMapOnGround = tiledMat.__setShadowMap ?? null;

    // Apply terrain heights to ground vertices so the ground undulates
    const positions = ground.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        let h = this.getTerrainHeight(x, z) - 0.08;

        // Depress terrain inside / near water zones
        const waterInfo = getWaterDepressionAt(x, z, this.waterZones, (wx, wz) => this.getTerrainHeight(wx, wz));
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

  // Thin wrappers for extracted terrain/water helpers
  private getTerrainHeight(x: number, z: number): number {
    if (this.localAltPoints.length > 0) {
      return computeTerrainHeightIDW(x, z, this.localAltPoints);
    }
    return computeTerrainHeight(x, z, this.pathPositions, this.pathHeights);
  }

  private isInWater(x: number, z: number): boolean {
    return isInWaterZone(x, z, this.waterZones);
  }

  private getWaterSurfaceY(x: number, z: number): number | null {
    return getWaterSurfaceYAt(x, z, this.waterZones);
  }

  private resolvePositionAgainstBuildingsLocal(pos: Vector3, radius: number): boolean {
    return resolvePositionAgainstBuildings(pos, radius, this.buildingColliders);
  }

  handleRemoteItemCollect(evt: ItemCollectEvent) {
    this.powerUpSystem?.applyCollectEvent(evt);
  }

  flushItemCollectEvents(): ItemCollectEvent[] {
    return this.powerUpSystem?.flushCollectEvents() ?? [];
  }


  // ---------- 3D Gate Flag (checkpoint marker) ----------

  /** Build a flag pole + banner in the local player's bus colour to mark the next gate. */
  private buildGateFlag() {
    if (this.gatePositions.length === 0) return;

    // Resolve flag colour from character selection
    let bodyColor = new Color3(0.95, 0.78, 0.15); // default yellow
    if (this.charSelection?.type === 'bus') {
      const opt = resolveBusColor(this.charSelection.busColorId);
      if (opt) bodyColor = Color3.FromHexString(opt.bodyHex);
    } else if (this.charSelection?.type === 'runner') {
      const appearance = resolveRunnerAppearance(this.charSelection.runnerId);
      bodyColor = hexToColor3(resolveColor(appearance.topColor));
    } else {
      const p = PLAYER_COLORS[this.localPlayerIndex - 1];
      if (p) bodyColor = p.body.clone();
    }

    const root = new TransformNode('gateFlag', this.scene);

    // Pole
    const poleHeight = 9;
    const pole = MeshBuilder.CreateCylinder('gateFlagPole', { diameter: 0.14, height: poleHeight, tessellation: 8 }, this.scene);
    const poleMat = new StandardMaterial('gateFlagPoleMat', this.scene);
    poleMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
    poleMat.specularColor = Color3.Black();
    pole.material = poleMat;
    pole.position.y = poleHeight / 2;
    pole.parent = root;

    // Banner (rectangular plane with subdivisions for wind)
    const bannerW = 4.5;
    const bannerH = 3.0;
    const banner = MeshBuilder.CreateGround('gateFlagBanner', { width: bannerW, height: bannerH, subdivisions: 10, updatable: true }, this.scene);
    banner.rotation.x = -Math.PI / 2;
    const bannerMat = new StandardMaterial('gateFlagBannerMat', this.scene);
    bannerMat.diffuseColor = bodyColor.clone();
    bannerMat.specularColor = Color3.Black();
    bannerMat.emissiveColor = bodyColor.scale(0.4);
    bannerMat.backFaceCulling = false;
    banner.material = bannerMat;
    banner.position.y = poleHeight - bannerH / 2 - 0.3;
    banner.position.x = bannerW / 2;
    banner.parent = root;

    // Wind flapping animation
    const restPositions = banner.getVerticesData(VertexBuffer.PositionKind)!.slice();
    this.scene.registerBeforeRender(() => {
      if (!banner.isEnabled() || banner.isDisposed()) return;
      const positions = banner.getVerticesData(VertexBuffer.PositionKind);
      if (!positions) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < positions.length; i += 3) {
        const nx = (restPositions[i] + bannerW / 2) / bannerW;
        const amplitude = nx * nx * 1.2;
        positions[i + 1] = restPositions[i + 1] + Math.sin(t * 8 + nx * 6) * amplitude;
      }
      banner.updateVerticesData(VertexBuffer.PositionKind, positions);
    });

    // Ball at top
    const ball = MeshBuilder.CreateSphere('gateFlagBall', { diameter: 0.5, segments: 6 }, this.scene);
    const ballMat = new StandardMaterial('gateFlagBallMat', this.scene);
    ballMat.diffuseColor = bodyColor.clone();
    ballMat.emissiveColor = bodyColor.scale(0.6);
    ballMat.specularColor = Color3.Black();
    ball.material = ballMat;
    ball.position.y = poleHeight + 0.25;
    ball.parent = root;

    // In local multiplayer, set P1-exclusive layerMask so P2 doesn't see this flag
    if (this.localMultiplayer) {
      for (const mesh of [pole, banner, ball]) {
        mesh.layerMask = 0x10000000;
      }
    }

    this.gateFlagRoot = root;
    this.updateGateFlag();
  }

  /** Build P2's gate flag (only visible in P2's viewport). */
  private buildP2GateFlag() {
    if (!this.localMultiplayer || this.gatePositions.length === 0) return;

    // Resolve P2 flag colour
    let bodyColor = new Color3(0.85, 0.25, 0.2); // default red for P2
    if (this.p2CharSelection?.type === 'bus') {
      const opt = resolveBusColor(this.p2CharSelection.busColorId);
      if (opt) bodyColor = Color3.FromHexString(opt.bodyHex);
    } else if (this.p2CharSelection?.type === 'runner') {
      const appearance = resolveRunnerAppearance(this.p2CharSelection.runnerId);
      bodyColor = hexToColor3(resolveColor(appearance.topColor));
    } else {
      const p = PLAYER_COLORS[1]; // player index 2
      if (p) bodyColor = p.body.clone();
    }

    const root = new TransformNode('gateFlag_p2', this.scene);

    const poleHeight = 9;
    const pole = MeshBuilder.CreateCylinder('gateFlagPole_p2', { diameter: 0.14, height: poleHeight, tessellation: 8 }, this.scene);
    const poleMat = new StandardMaterial('gateFlagPoleMat_p2', this.scene);
    poleMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
    poleMat.specularColor = Color3.Black();
    pole.material = poleMat;
    pole.position.y = poleHeight / 2;
    pole.parent = root;

    const bannerW = 4.5;
    const bannerH = 3.0;
    const banner = MeshBuilder.CreateGround('gateFlagBanner_p2', { width: bannerW, height: bannerH, subdivisions: 10, updatable: true }, this.scene);
    banner.rotation.x = -Math.PI / 2;
    const bannerMat = new StandardMaterial('gateFlagBannerMat_p2', this.scene);
    bannerMat.diffuseColor = bodyColor.clone();
    bannerMat.specularColor = Color3.Black();
    bannerMat.emissiveColor = bodyColor.scale(0.4);
    bannerMat.backFaceCulling = false;
    banner.material = bannerMat;
    banner.position.y = poleHeight - bannerH / 2 - 0.3;
    banner.position.x = bannerW / 2;
    banner.parent = root;

    // Wind flapping animation
    const restPositions2 = banner.getVerticesData(VertexBuffer.PositionKind)!.slice();
    this.scene.registerBeforeRender(() => {
      if (!banner.isEnabled() || banner.isDisposed()) return;
      const positions = banner.getVerticesData(VertexBuffer.PositionKind);
      if (!positions) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < positions.length; i += 3) {
        const nx = (restPositions2[i] + bannerW / 2) / bannerW;
        const amplitude = nx * nx * 1.2;
        positions[i + 1] = restPositions2[i + 1] + Math.sin(t * 8 + nx * 6 + 1) * amplitude;
      }
      banner.updateVerticesData(VertexBuffer.PositionKind, positions);
    });

    const ball = MeshBuilder.CreateSphere('gateFlagBall_p2', { diameter: 0.5, segments: 6 }, this.scene);
    const ballMat = new StandardMaterial('gateFlagBallMat_p2', this.scene);
    ballMat.diffuseColor = bodyColor.clone();
    ballMat.emissiveColor = bodyColor.scale(0.6);
    ballMat.specularColor = Color3.Black();
    ball.material = ballMat;
    ball.position.y = poleHeight + 0.25;
    ball.parent = root;

    // P2-exclusive layerMask
    for (const mesh of [pole, banner, ball]) {
      mesh.layerMask = 0x20000000;
    }

    this.p2GateFlagRoot = root;
    this.updateP2GateFlag();
  }

  /** Move the gate flag to the current gate position (or hide if done). */
  private updateGateFlag() {
    if (!this.gateFlagRoot) return;
    const gate = this.gatePositions[this.currentGateIdx];
    if (!gate) {
      this.gateFlagRoot.setEnabled(false);
      return;
    }
    // When reaching the final gate, hide the gate flag and show the finish flag instead
    if (this.currentGateIdx === this.gatePositions.length - 1) {
      this.gateFlagRoot.setEnabled(false);
      if (this.finishFlagRoot) this.finishFlagRoot.setEnabled(true);
      return;
    }
    this.gateFlagRoot.setEnabled(true);
    this.gateFlagRoot.position.set(gate.x, gate.y, gate.z);
    this.gateFlagRoot.rotation.y = gate.yaw;
  }

  /** Move P2's gate flag to P2's current gate position. */
  private updateP2GateFlag() {
    if (!this.p2GateFlagRoot) return;
    const gate = this.gatePositions[this.p2GateIdx];
    if (!gate) {
      this.p2GateFlagRoot.setEnabled(false);
      return;
    }
    // When reaching the final gate, hide the gate flag and show the finish flag
    if (this.p2GateIdx === this.gatePositions.length - 1) {
      this.p2GateFlagRoot.setEnabled(false);
      if (this.finishFlagRoot) this.finishFlagRoot.setEnabled(true);
      return;
    }
    this.p2GateFlagRoot.setEnabled(true);
    this.p2GateFlagRoot.position.set(gate.x, gate.y, gate.z);
    this.p2GateFlagRoot.rotation.y = gate.yaw;
  }

  /** Build a checkered flag at the final path point (finish line). */
  private buildFinishFlag() {
    if (this.pathPositions.length < 2) return;

    const lastIdx = this.pathPositions.length - 1;
    const [lx, lz] = this.pathPositions[lastIdx];
    const [px, pz] = this.pathPositions[lastIdx - 1];
    const yaw = Math.atan2(lx - px, lz - pz);
    const y = this.getGroundY(lx, lz);

    const root = new TransformNode('finishFlag', this.scene);

    // Pole
    const poleHeight = 10.5;
    const pole = MeshBuilder.CreateCylinder('finishFlagPole', { diameter: 0.14, height: poleHeight, tessellation: 8 }, this.scene);
    const poleMat = new StandardMaterial('finishFlagPoleMat', this.scene);
    poleMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
    poleMat.specularColor = Color3.Black();
    pole.material = poleMat;
    pole.position.y = poleHeight / 2;
    pole.parent = root;

    // Checkered banner
    const bannerW = 4.5;
    const bannerH = 3.0;
    const banner = MeshBuilder.CreateGround('finishFlagBanner', { width: bannerW, height: bannerH, subdivisions: 10, updatable: true }, this.scene);
    banner.rotation.x = -Math.PI / 2;
    const bannerMat = new StandardMaterial('finishFlagBannerMat', this.scene);

    // Create checkered texture
    const texSize = 128;
    const checkerTex = new DynamicTexture('finishCheckerTex', { width: texSize, height: texSize }, this.scene, false);
    const ctx = checkerTex.getContext();
    const squares = 8;
    const sqSize = texSize / squares;
    for (let row = 0; row < squares; row++) {
      for (let col = 0; col < squares; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(col * sqSize, row * sqSize, sqSize, sqSize);
      }
    }
    checkerTex.update();

    bannerMat.diffuseTexture = checkerTex;
    bannerMat.specularColor = Color3.Black();
    bannerMat.emissiveColor = new Color3(0.3, 0.3, 0.3);
    bannerMat.backFaceCulling = false;
    banner.material = bannerMat;
    banner.position.y = poleHeight - bannerH / 2 - 0.3;
    banner.position.x = bannerW / 2;
    banner.parent = root;

    // Wind flapping animation
    const finishRestPositions = banner.getVerticesData(VertexBuffer.PositionKind)!.slice();
    this.scene.registerBeforeRender(() => {
      if (!banner.isEnabled() || banner.isDisposed()) return;
      const positions = banner.getVerticesData(VertexBuffer.PositionKind);
      if (!positions) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < positions.length; i += 3) {
        const nx = (finishRestPositions[i] + bannerW / 2) / bannerW;
        const amplitude = nx * nx * 1.2;
        positions[i + 1] = finishRestPositions[i + 1] + Math.sin(t * 8 + nx * 6 + 2) * amplitude;
      }
      banner.updateVerticesData(VertexBuffer.PositionKind, positions);
    });

    // Ball at top (black)
    const ball = MeshBuilder.CreateSphere('finishFlagBall', { diameter: 0.5, segments: 6 }, this.scene);
    const ballMat = new StandardMaterial('finishFlagBallMat', this.scene);
    ballMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    ballMat.emissiveColor = new Color3(0.05, 0.05, 0.05);
    ballMat.specularColor = Color3.Black();
    ball.material = ballMat;
    ball.position.y = poleHeight + 0.25;
    ball.parent = root;

    root.position.set(lx, y, lz);
    root.rotation.y = yaw;
    root.setEnabled(false); // Hidden until all regular gates are passed
    this.finishFlagRoot = root;
  }


  // ---------- 3D Direction Arrow (HUD compass) ----------

  /**
   * Build a 3D arrow that hovers in front of the camera and points
   * toward the next gate checkpoint. Parented to the camera so it
   * behaves like a HUD element.
   */
  private async buildDirectionArrow() {
    await this.buildDirectionArrowForCamera(this.camera, 'p1');
  }

  private async buildDirectionArrowForCamera(camera: FreeCamera, suffix: string) {
    // ── Node hierarchy ──
    //  camera
    //   └─ root    (position only — screen placement + bobbing)
    //       └─ rotNode (rotation.y only — spins the arrow)
    //           └─ glbRoot (centering offset + uniform scale)
    //
    // Because the centering offset places the model's geometric centre
    // at rotNode's origin, rotation.y on rotNode spins the model in
    // place without any lateral shift.

    const root = new TransformNode(`dirArrowRoot_${suffix}`, this.scene);
    root.parent = camera;
    root.position = new Vector3(0, 2.8, 8);

    const rotNode = new TransformNode(`dirArrowRot_${suffix}`, this.scene);
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
    const arrowMat = new StandardMaterial(`arrowMat_${suffix}`, this.scene);
    arrowMat.diffuseColor = new Color3(1.0, 0.45, 0.0);
    arrowMat.emissiveColor = new Color3(1.0, 0.5, 0.0);
    arrowMat.specularColor = new Color3(1, 1, 1);
    arrowMat.backFaceCulling = false;
    for (const mesh of result.meshes) {
      if (mesh !== glbRoot && mesh.material !== undefined) {
        (mesh as Mesh).material = arrowMat;
      }
    }

    // Set layerMask so arrow is only visible in the owning player's camera (local multiplayer only)
    if (this.localMultiplayer) {
      const arrowLayerMask = suffix === 'p2' ? 0x20000000 : 0x10000000;
      for (const mesh of result.meshes) {
        mesh.layerMask = arrowLayerMask;
      }
    }

    if (suffix === 'p2') {
      this.p2DirectionArrowRoot = root;
      this.p2DirectionArrowRotNode = rotNode;
    } else {
      this.directionArrowRoot = root;
      this.directionArrowRotNode = rotNode;
    }
  }

  /**
   * Update the direction arrow each frame so it points toward the
   * next gate (or the closest passenger flag in bus mode).
   * Uses the camera's world matrix to compute relative
   * direction, then rotates the arrow root around its local Y axis.
   */
  private updateDirectionArrow(dt: number) {
    this.updateDirectionArrowForPlayer(
      this.directionArrowRoot,
      this.directionArrowRotNode,
      this.camera,
      this.busPos,
      this.currentGateIdx,
      'p1',
      dt,
    );
    // Update P2's arrow in local multiplayer
    if (this.localMultiplayer) {
      this.updateDirectionArrowForPlayer(
        this.p2DirectionArrowRoot,
        this.p2DirectionArrowRotNode,
        this.p2Camera,
        this.p2Pos,
        this.p2GateIdx,
        'p2',
        dt,
      );
    }
  }

  private updateDirectionArrowForPlayer(
    arrowRoot: TransformNode | null,
    arrowRotNode: TransformNode | null,
    camera: FreeCamera | null,
    playerPos: Vector3,
    gateIdx: number,
    _suffix: string,
    dt: number,
  ) {
    if (!arrowRoot || !arrowRotNode || !camera) return;

    // In bus mode, point toward closest active flag when carrying passengers,
    // or closest waiting passenger if none are riding
    let target: { x: number; z: number } | null = null;
    if (this.passengerSystem) {
      target = this.passengerSystem.getClosestFlagTarget(playerPos.x, playerPos.z);
      if (!target) {
        target = this.passengerSystem.getClosestWaitingPassenger(playerPos.x, playerPos.z);
      }
      if (!target) {
        arrowRoot.setEnabled(false);
        return;
      }
    } else {
      // Regular race mode — point to next gate
      if (gateIdx >= this.gatePositions.length) {
        arrowRoot.setEnabled(false);
        return;
      }
      target = this.gatePositions[gateIdx];
    }
    arrowRoot.setEnabled(true);

    // Direction from player to target in world space (horizontal)
    const toTargetX = target.x - playerPos.x;
    const toTargetZ = target.z - playerPos.z;
    const worldAngle = Math.atan2(toTargetX, toTargetZ);

    // Camera's yaw in world space
    const camFwd = camera.getTarget().subtract(camera.position);
    const camYaw = Math.atan2(camFwd.x, camFwd.z);

    const targetAngle = worldAngle - camYaw;

    // Pick the right display angle state for this player
    let displayAngle = _suffix === 'p2' ? this.p2ArrowDisplayAngle : this.arrowDisplayAngle;
    let delta = targetAngle - displayAngle;
    delta = ((delta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    displayAngle += delta * Math.min(1, 6 * dt);
    if (_suffix === 'p2') {
      this.p2ArrowDisplayAngle = displayAngle;
    } else {
      this.arrowDisplayAngle = displayAngle;
    }

    arrowRotNode.rotation.y = displayAngle;

    // Gentle bobbing animation
    const bob = Math.sin(performance.now() * 0.003) * 0.12;
    arrowRoot.position.y = 2.8 + bob;
  }


  /**
   * Create the 3D bus model and store a reference to it.
   */
  private async buildBus() {
    const result = await createBusModel(this.scene);
    this.busMesh = result.root;
    this.busBodyShell = result.bodyShell;
    this.scoopPivot = result.scoopPivot;

    // Tint local bus: use selected colour if available, else fallback to player index colour
    let palette: BusColorPalette;
    if (this.charSelection?.type === 'bus') {
      const opt = resolveBusColor(this.charSelection.busColorId);
      palette = busColorPaletteFromOption(opt);
    } else {
      palette = PLAYER_COLORS[this.localPlayerIndex - 1] ?? PLAYER_COLORS[0];
    }
    tintBusModel(this.busMesh, palette, 'local');

    // Bus model is created disabled to avoid rendering during async load — enable now
    this.busMesh.setEnabled(true);

    // Store rest position for scoop animation offsets
    (this.scoopPivot as any).__restY = this.scoopPivot.position.y;
    (this.scoopPivot as any).__restZ = this.scoopPivot.position.z;
    this.frontWheelLeft = result.frontWheelLeft;
    this.frontWheelRight = result.frontWheelRight;

    // --- Exhaust flame particle system (initially stopped) ---
    this.exhaustFlames = createExhaustFlames(this.scene, this.busMesh!);

    // --- Water wake particle systems (initially stopped) ---
    this.waterWake = createWaterWake(this.scene, this.busMesh!);

    // --- Headlight at night (single centred beam) ---
    if (this.level?.timeOfDay === 'night') {
      const headlight = new SpotLight(
        'busHeadlight',
        new Vector3(LIGHT_FRONT_POSITION[0], LIGHT_FRONT_POSITION[1], LIGHT_FRONT_POSITION[2]),
        new Vector3(0, -0.15, 1),         // forward and slightly down
        BUS_HEADLIGHT_ANGLE,
        BUS_HEADLIGHT_EXPONENT,
        this.scene,
      );
      headlight.diffuse = new Color3(BUS_HEADLIGHT_COLOR_R, BUS_HEADLIGHT_COLOR_G, BUS_HEADLIGHT_COLOR_B);
      headlight.intensity = BUS_HEADLIGHT_INTENSITY;
      headlight.range = BUS_HEADLIGHT_RANGE;
      headlight.parent = this.busMesh!;
      this.busHeadlight = headlight;

      // --- Shadow map for headlight ---
      if (!Effect.ShadersStore['shadowDepthVertexShader']) {
        Effect.ShadersStore['shadowDepthVertexShader'] =
          'precision highp float;\n' +
          'attribute vec3 position;\n' +
          'uniform mat4 worldViewProjection;\n' +
          'void main(){gl_Position=worldViewProjection*vec4(position,1.0);}';
        Effect.ShadersStore['shadowDepthFragmentShader'] =
          'precision highp float;\n' +
          'void main(){gl_FragColor=vec4(gl_FragCoord.z,0.,0.,1.);}';
      }

      const shadowCam = new FreeCamera(
        'shadowCam',
        new Vector3(LIGHT_FRONT_POSITION[0], LIGHT_FRONT_POSITION[1], LIGHT_FRONT_POSITION[2]),
        this.scene,
      );
      shadowCam.fov = headlight.angle;
      shadowCam.minZ = 0.5;
      shadowCam.maxZ = headlight.range;
      shadowCam.parent = this.busMesh!;
      // Match headlight direction: (0, -0.15, 1) → pitch slightly down
      shadowCam.rotation.x = Math.atan2(0.15, 1);
      shadowCam.inputs.clear();

      const shadowRTT = new RenderTargetTexture('shadowMap', 1024, this.scene, false, true,
        Constants.TEXTURETYPE_HALF_FLOAT);
      shadowRTT.activeCamera = shadowCam;
      shadowRTT.clearColor = new Color4(1, 1, 1, 1);
      shadowRTT.renderList = [];
      shadowRTT.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
      this.scene.customRenderTargets.push(shadowRTT);

      const depthMat = new ShaderMaterial('shadowDepth', this.scene, 'shadowDepth', {
        attributes: ['position'],
        uniforms: ['worldViewProjection'],
      });
      depthMat.backFaceCulling = false;

      this.shadowCamera = shadowCam;
      this.shadowRTT = shadowRTT;
      this.shadowDepthMat = depthMat;

      // --- Reverse lights (soft red glow from tail lights, off by default) ---
      for (const side of [-1, 1]) {
        const rl = new SpotLight(
          `busReverseLight_${side}`,
          new Vector3(side * 2.4 * 0.38, 0.9 + 0.3, -7.0 / 2 - 0.1),
          new Vector3(0, -0.1, -1),       // backward and slightly down
          BUS_REVERSE_LIGHT_ANGLE,
          BUS_REVERSE_LIGHT_EXPONENT,
          this.scene,
        );
        rl.diffuse = new Color3(BUS_REVERSE_LIGHT_COLOR_R, BUS_REVERSE_LIGHT_COLOR_G, BUS_REVERSE_LIGHT_COLOR_B);
        rl.intensity = BUS_REVERSE_LIGHT_INTENSITY;
        rl.range = BUS_REVERSE_LIGHT_RANGE;
        rl.parent = this.busMesh!;
        rl.setEnabled(false);
        this.busReverseLights.push(rl);
      }
    }
  }







  /**
   * Handle a scoop event from a remote player.
   * Hides the runner from the path and spawns a rider model on the scooper bus.
   */
  handleRemoteScoop(
    runnerIndex: number,
    scooperPlayerIndex: number,
    victimPlayerIndex?: number,
    scooperYaw?: number,
    scooperSpeed?: number,
  ) {
    if (victimPlayerIndex && victimPlayerIndex > 0) {
      if (
        victimPlayerIndex === this.localPlayerIndex
        && this.localPlayerRole === 'runner'
        && this.localRunnerScoopState === 'free'
      ) {
        const scooperPose = this.getPlayerPoseByIndex(scooperPlayerIndex);
        this.beginLocalRunnerScoop(scooperPlayerIndex, {
          yaw: scooperYaw ?? scooperPose?.yaw ?? this.busYaw,
          speed: scooperSpeed ?? scooperPose?.speed ?? 0,
        });
      }
      return;
    }

    const runner = this.runners[runnerIndex];
    if (!runner || runner.ownerPlayerIndex !== 0) return; // already claimed

    runner.ownerPlayerIndex = scooperPlayerIndex;
    runner.state = 'launched'; // let them go through launch arc so they flail
    // Don't hide yet — stay visible while airborne, will hide when transitioning to riding
    runner.velX = scooperSpeed ? Math.sin(scooperYaw ?? 0) * scooperSpeed * SCOOP_FORWARD_FACTOR : 0;
    runner.velZ = scooperSpeed ? Math.cos(scooperYaw ?? 0) * scooperSpeed * SCOOP_FORWARD_FACTOR : 0;
    runner.velY = scooperSpeed ? scooperSpeed * SCOOP_UP_FACTOR : SCOOP_UP_FACTOR;
  }

  /** Get the pending scoop events and clear the queue. */
  flushScoopEvents(): {
    runnerIndex: number;
    playerIndex: number;
    victimPlayerIndex?: number;
    scooperYaw?: number;
    scooperSpeed?: number;
  }[] {
    const events = this.pendingScoopEvents;
    this.pendingScoopEvents = [];
    return events;
  }









  // ---------- Input ----------

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
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

  /**
   * Test the bus position against every solid obstacle (circle vs circle).
   * On overlap, push the bus out and kill its speed.
   * ~30 lines of isolated code — easy to replace with a physics engine later.
   */
  private resolveCollisions() {
    const br = this.localPlayerRole === 'runner' ? RUNNER_COLLISION_RADIUS : BUS_COLLISION_RADIUS;
    let touchingElastic = false;

    // Save position before collision resolution for wall-sliding
    const preCollX = this.busPos.x;
    const preCollZ = this.busPos.z;

    for (const obs of this.solidObstacles) {
      const dx = this.busPos.x - obs.x;
      const dz = this.busPos.z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = br + obs.radius;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;

        if (obs.scoopable && this.localPlayerRole === 'bus' && Math.abs(this.busSpeed) > 0.5) {
          // Scoopable collision: launch the object into the air
          const absSpeed = Math.abs(this.busSpeed);
          const fwdX = Math.sin(this.busYaw);
          const fwdZ = Math.cos(this.busYaw);
          // Find the matching objectRoot by position
          let scoopedRoot: TransformNode | null = null;
          for (const root of this.objectRoots) {
            const rdx = root.position.x - obs.x;
            const rdz = root.position.z - obs.z;
            if (rdx * rdx + rdz * rdz < 0.1) {
              scoopedRoot = root;
              break;
            }
          }
          if (scoopedRoot) {
            this.scoopedObjects.push({
              root: scoopedRoot,
              velX: fwdX * this.busSpeed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3,
              velY: Math.max(SCOOP_MIN_UP, absSpeed * SCOOP_UP_FACTOR) + Math.random() * 3,
              velZ: fwdZ * this.busSpeed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3,
              landedTimer: 0,
              state: 'launched',
              obstacleIndex: this.solidObstacles.indexOf(obs),
            });
            // Remove from solid obstacles so it no longer blocks
            obs.radius = 0;
          }
          // Small speed penalty
          this.busSpeed *= ELASTIC_SPEED_PENALTY;
        } else if (obs.elasticIndex != null) {
          touchingElastic = true;
          // Elastic collision: tilt the object and slow down, but DON'T block the bus
          const elastic = this.elasticObjects[obs.elasticIndex];
          if (elastic) {
            const pushStrength = Math.abs(this.busSpeed) * 0.15;
            elastic.tiltVelX += -nx * pushStrength;
            elastic.tiltVelZ += -nz * pushStrength;
          }
          // Apply speed penalty only once per collision (not every frame)
          if (!this.elasticPenaltyActive) {
            this.busSpeed *= ELASTIC_SPEED_PENALTY;
            this.elasticPenaltyActive = true;
          }
        } else {
          // Non-elastic solid obstacle: push position out (velocity handled below)
          const overlap = minDist - dist;
          this.busPos.x += nx * overlap;
          this.busPos.z += nz * overlap;
        }
      }
    }

    this.resolvePositionAgainstBuildingsLocal(this.busPos, br);

    // Fence boundary collision
    resolvePositionAgainstFence(this.busPos, br, this.fenceCollider);

    // Clear penalty flag once bus is no longer touching any elastic object
    if (!touchingElastic) {
      this.elasticPenaltyActive = false;
    }

    // --- Wall-sliding velocity response ---
    // Instead of killing speed on collision, project velocity onto the
    // wall surface so glancing hits slide along.  Head-on hits still stop.
    const pushX = this.busPos.x - preCollX;
    const pushZ = this.busPos.z - preCollZ;
    const pushDistSq = pushX * pushX + pushZ * pushZ;

    // Play thud on initial impact with any solid/elastic obstacle
    const isColliding = touchingElastic || pushDistSq > 1e-6;
    if (isColliding && !this.collisionThudPlayed) {
      playThud(this.busSpeed);
      this.collisionThudPlayed = true;
    } else if (!isColliding) {
      this.collisionThudPlayed = false;
    }

    if (pushDistSq > 1e-6) {
      const pushDist = Math.sqrt(pushDistSq);
      // Collision normal (direction we were pushed)
      const nx = pushX / pushDist;
      const nz = pushZ / pushDist;

      if (this.localPlayerRole === 'runner') {
        // Runner velocity = forward * busSpeed + right * jumpSideVel
        const fwdX = Math.sin(this.busYaw);
        const fwdZ = Math.cos(this.busYaw);
        const rightX = Math.cos(this.busYaw);
        const rightZ = -Math.sin(this.busYaw);

        let velX = fwdX * this.busSpeed + rightX * this.runnerJumpSideVel;
        let velZ = fwdZ * this.busSpeed + rightZ * this.runnerJumpSideVel;

        const normalDot = velX * nx + velZ * nz;
        if (normalDot < 0) {
          // Remove component going into the wall
          velX -= normalDot * nx;
          velZ -= normalDot * nz;
          // Decompose back into forward / right axes with slight friction
          this.busSpeed = (velX * fwdX + velZ * fwdZ) * 0.92;
          this.runnerJumpSideVel = (velX * rightX + velZ * rightZ) * 0.92;
        }
      } else {
        // Bus velocity = forward(busVelAngle) * busSpeed
        let velX = Math.sin(this.busVelAngle) * this.busSpeed;
        let velZ = Math.cos(this.busVelAngle) * this.busSpeed;

        const normalDot = velX * nx + velZ * nz;
        if (normalDot < 0) {
          // Remove component going into the wall
          velX -= normalDot * nx;
          velZ -= normalDot * nz;

          const slideSpeedSq = velX * velX + velZ * velZ;
          if (slideSpeedSq > 0.01) {
            const slideSpeed = Math.sqrt(slideSpeedSq);
            this.busVelAngle = Math.atan2(velX, velZ);
            this.busSpeed = slideSpeed * 0.92; // slight wall friction
          } else {
            // Nearly head-on — stop
            this.busSpeed = 0;
            this.busYawRate = 0;
          }
        }
      }
    }

    // --- Bus-to-bus collisions (solid bodies cannot overlap) ---
    this.resolveBusCollisions();

    // --- Remote player collisions with elastic objects ---
    this.resolveRemotePlayerElasticCollisions();
  }

  /**
   * Resolve collisions between the local bus and all remote buses using
   * OBB detection + impulse-based momentum conservation.
   * Contact-point-aware so hitting the back of a bus spins it differently
   * than a head-on or T-bone collision.
   */
  private resolveBusCollisions() {
    if (this.localPlayerRole === 'runner') return;

    // Gather remote bus snapshots, keyed by peerId for nudge feedback
    const remotes: RemoteBusSnapshot[] = [];
    for (const [peerId, remote] of this.remotePlayers) {
      if (!remote.state) continue;
      if (this.getRoleForPlayerIndex(remote.playerIndex, remote.state) !== 'bus') continue;
      remotes.push({
        id: peerId,
        x: remote.smoothPos.x,
        z: remote.smoothPos.z,
        yaw: remote.smoothYaw,
        speed: remote.state.speed,
      });
    }
    if (remotes.length === 0) return;

    const localState: BusCollisionState = {
      x: this.busPos.x,
      z: this.busPos.z,
      yaw: this.busYaw,
      speed: this.busSpeed,
      velAngle: this.busVelAngle,
      yawRate: this.busYawRate,
    };

    const { local, collided, remoteNudges } = resolveBusToBusCollisions(localState, remotes, 0);

    if (collided) {
      this.busPos.x = local.x;
      this.busPos.z = local.z;
      this.busSpeed = local.speed;
      this.busVelAngle = local.velAngle;
      this.busYaw = local.yaw;
      this.busYawRate = local.yawRate;

      // Apply predicted nudges to remote buses' visual positions so the
      // collision looks two-sided before the authoritative network update.
      // The normal lerp toward the real state will gradually correct these.
      for (const nudge of remoteNudges) {
        const remote = this.remotePlayers.get(nudge.id);
        if (!remote) continue;
        remote.smoothPos.x += nudge.dx;
        remote.smoothPos.z += nudge.dz;
        remote.smoothYaw += nudge.dYaw;
      }
    }
  }

  /**
   * Check remote player collisions against elastic objects.
   * When a remote player hits an elastic object, tilt it locally.
   */
  private resolveRemotePlayerElasticCollisions() {
    for (const [_peerId, remote] of this.remotePlayers) {
      if (!remote.state) continue;

      // Determine collision radius based on role
      const remoteRole = this.getRoleForPlayerIndex(remote.playerIndex, remote.state);
      const collisionRadius = remoteRole === 'runner' ? RUNNER_COLLISION_RADIUS : BUS_COLLISION_RADIUS;

      // Check against all elastic obstacles
      for (const obs of this.solidObstacles) {
        if (obs.elasticIndex == null) continue; // only check elastic objects

        const dx = remote.smoothPos.x - obs.x;
        const dz = remote.smoothPos.z - obs.z;
        const distSq = dx * dx + dz * dz;
        const minDist = collisionRadius + obs.radius;
        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;

          // Tilt the elastic object
          const elastic = this.elasticObjects[obs.elasticIndex];
          if (elastic) {
            // Use remote player's speed to determine push strength
            const remoteSpeed = remote.state.speed ?? 0;
            const pushStrength = Math.abs(remoteSpeed) * 0.15;
            elastic.tiltVelX += -nx * pushStrength;
            elastic.tiltVelZ += -nz * pushStrength;
          }
        }
      }
    }
  }

  /**
   * Collision resolution for P2 — solid obstacles, buildings, fence, wall-sliding.
   * Mirrors resolveCollisions() but operates on p2Pos / p2Speed / p2VelAngle.
   */
  private resolveP2Collisions(radius: number) {
    const preCollX = this.p2Pos.x;
    const preCollZ = this.p2Pos.z;
    let touchingElastic = false;

    for (const obs of this.solidObstacles) {
      const dx = this.p2Pos.x - obs.x;
      const dz = this.p2Pos.z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = radius + obs.radius;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;

        if (obs.elasticIndex != null) {
          touchingElastic = true;
          const elastic = this.elasticObjects[obs.elasticIndex];
          if (elastic) {
            const pushStrength = Math.abs(this.p2Speed) * 0.15;
            elastic.tiltVelX += -nx * pushStrength;
            elastic.tiltVelZ += -nz * pushStrength;
          }
          if (!this.p2ElasticPenaltyActive) {
            this.p2Speed *= ELASTIC_SPEED_PENALTY;
            this.p2ElasticPenaltyActive = true;
          }
        } else {
          const overlap = minDist - dist;
          this.p2Pos.x += nx * overlap;
          this.p2Pos.z += nz * overlap;
        }
      }
    }

    this.resolvePositionAgainstBuildingsLocal(this.p2Pos, radius);
    resolvePositionAgainstFence(this.p2Pos, radius, this.fenceCollider);

    if (!touchingElastic) {
      this.p2ElasticPenaltyActive = false;
    }

    // Wall-sliding velocity response
    const pushX = this.p2Pos.x - preCollX;
    const pushZ = this.p2Pos.z - preCollZ;
    const pushDistSq = pushX * pushX + pushZ * pushZ;

    if (pushDistSq > 1e-6) {
      const pushDist = Math.sqrt(pushDistSq);
      const nx = pushX / pushDist;
      const nz = pushZ / pushDist;

      if (this.p2Role === 'runner') {
        const fwdX = Math.sin(this.p2Yaw);
        const fwdZ = Math.cos(this.p2Yaw);
        const rightX = Math.cos(this.p2Yaw);
        const rightZ = -Math.sin(this.p2Yaw);
        let velX = fwdX * this.p2Speed + rightX * this.p2JumpSideVel;
        let velZ = fwdZ * this.p2Speed + rightZ * this.p2JumpSideVel;
        const normalDot = velX * nx + velZ * nz;
        if (normalDot < 0) {
          velX -= normalDot * nx;
          velZ -= normalDot * nz;
          this.p2Speed = (velX * fwdX + velZ * fwdZ) * 0.92;
          this.p2JumpSideVel = (velX * rightX + velZ * rightZ) * 0.92;
        }
      } else {
        let velX = Math.sin(this.p2VelAngle) * this.p2Speed;
        let velZ = Math.cos(this.p2VelAngle) * this.p2Speed;
        const normalDot = velX * nx + velZ * nz;
        if (normalDot < 0) {
          velX -= normalDot * nx;
          velZ -= normalDot * nz;
          const slideSpeedSq = velX * velX + velZ * velZ;
          if (slideSpeedSq > 0.01) {
            const slideSpeed = Math.sqrt(slideSpeedSq);
            this.p2VelAngle = Math.atan2(velX, velZ);
            this.p2Speed = slideSpeed * 0.92;
          } else {
            this.p2Speed = 0;
          }
        }
      }
    }
  }

  /**
   * P2 bus scoop detection against NPC runners.
   * Mirrors the NPC scoop logic in updateRunnersSystem for P1.
   */
  private tryScoopNpcRunnersForP2() {
    if (this.p2Role !== 'bus') return;
    if (Math.abs(this.p2Speed) <= 0.5) return;

    for (const runner of this.runners) {
      if (runner.state !== 'running') continue;
      if (runner.ownerPlayerIndex !== 0) continue; // already scooped

      const dx = runner.mesh.position.x - this.p2Pos.x;
      const dz = runner.mesh.position.z - this.p2Pos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > SCOOP_DISTANCE * SCOOP_DISTANCE) continue;

      // Scoop this runner (assign to player index 2)
      runner.ownerPlayerIndex = 2;
      // Launch runner with proper physics (mirrors launchRunnerOntoLocalBus)
      runner.state = 'launched';
      runner.interaction = 'none';
      runner.interactionTimer = 0;
      const absSpd = Math.abs(this.p2Speed);
      const fwdX = Math.sin(this.p2Yaw);
      const fwdZ = Math.cos(this.p2Yaw);
      runner.velX = fwdX * this.p2Speed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;
      runner.velY = Math.max(SCOOP_MIN_UP, absSpd * SCOOP_UP_FACTOR) + Math.random() * 3;
      runner.velZ = fwdZ * this.p2Speed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;

      // Assign a roof seat so the runner lands on P2's bus
      if (MODE === 'SCOOP_THEN_RIDE') {
        assignRoofSeat(this.runners, 2, runner);
      }

      // Boost P2 on scoop
      this.p2BoostTimer += SCOOP_BOOST_DURATION;
      this.p2ScoopAnimTimer = SCOOP_ANIM_DURATION;

      this.callbacks.onP2ScoopRunner?.();
    }
  }


  // ---------- Preview mode update (race replay) ----------

  private updatePreview(dt: number) {
    // Handle countdown
    if (this.previewCountdownTimer > 0) {
      const prevSec = Math.ceil(this.previewCountdownTimer);
      this.previewCountdownTimer -= dt;
      const curSec = Math.ceil(this.previewCountdownTimer);

      if (curSec !== prevSec && curSec > 0) {
        this.onPreviewCountdown?.(String(curSec));
      }

      if (this.previewCountdownTimer <= 0) {
        this.onPreviewCountdown?.('Go!');
        this.previewPlaying = true;
        this.onPreviewRaceState?.('racing');
        setTimeout(() => this.onPreviewCountdown?.(''), 600);
      }

      // Follow camera during countdown too
      this.updatePreviewFollowCam(dt, 1);
      return;
    }

    // Advance simulation time if playing
    if (this.previewPlaying) {
      const maxTime = this.getPreviewMaxTime();
      this.previewElapsed += dt * this.previewSpeedMultiplier;
      if (this.previewElapsed >= maxTime) {
        this.previewElapsed = maxTime;
        this.previewPlaying = false;
        this.onPreviewRaceState?.('finished');
      }
    }

    // Update preview runners
    this.viewCenter = computeViewCenterXZ(this.camera);
    this.setViewCenterOnGround?.(this.viewCenter.x, this.camera.position.y, this.viewCenter.z);
    const finishedCount = updatePreviewRunners({
      runners: this.previewRunners,
      pathPositions: this.pathPositions,
      pathCumDist: this.pathCumDist,
      getGroundY: (x, z) => this.getGroundY(x, z),
      elapsedSeconds: this.previewElapsed,
      cameraX: this.viewCenter.x,
      cameraZ: this.viewCenter.z,
    }, dt);

    this.onPreviewTick?.(this.previewElapsed, finishedCount, this.previewRunners.length);

    // Follow-cam on selected runner
    this.updatePreviewFollowCam(dt, this.previewSpeedMultiplier);

    // Update building LOD using view center (not raw camera XZ)
    if (this.buildingLodEntries.length > 0) {
      updateBuildingLod(this.buildingLodEntries, this.viewCenter.x, this.viewCenter.z);
    }
    this.updateDistanceCulling();
    this.updateInsetCenter?.(this.viewCenter.x, this.viewCenter.z);
  }

  /** Update the preview orbit camera targeting the selected runner */
  private updatePreviewFollowCam(dt: number, speedMultiplier: number) {
    const runner = this.previewRunners[this.followedRunnerIndex];
    if (!runner || !this.previewOrbitState) return;
    const pos = runner.anchor.position;
    updatePreviewOrbitCamera({
      dt,
      speedMultiplier,
      camera: this.camera,
      targetX: pos.x,
      targetY: pos.y,
      targetZ: pos.z,
      targetYaw: runner.model.root.rotation.y,
      getGroundY: (x, z) => this.getGroundY(x, z),
      state: this.previewOrbitState,
    });
  }

  // ---------- Demo camera (title screen flyover) ----------

  private updateDemoCamera(dt: number) {
    this.demoCamProgress = updateDemoCameraSystem({
      dt,
      camera: this.camera,
      pathPositions: this.pathPositions,
      pathHeights: this.pathHeights,
      pathCumDist: this.pathCumDist,
      pathTotalDistance: this.pathTotalDistance,
      demoCamProgress: this.demoCamProgress,
    });
  }

  // ---------- Countdown Cinematic Camera ----------

  /**
   * Orbit camera that starts in front of the bus and sweeps around
   * to the normal chase-cam position by the end of the countdown.
   * Uses smooth easing for a cinematic feel.
   */
  private updateCountdownCamera(dt: number) {
    updateCountdownCameraSystem({
      dt,
      camera: this.camera,
      busYaw: this.busYaw,
      busPos: this.busPos,
      countdownTimer: this.countdownTimer,
      countdownDuration: COUNTDOWN_DURATION,
      getGroundY: (x, z) => this.getGroundY(x, z),
      getWaterSurfaceY: (x, z) => this.getWaterSurfaceY(x, z),
    });
  }

  // ---------- Chase Camera ----------

  // ---------- Local Multiplayer P2 ----------

  /** Update P2 physics: bus or runner movement driven by arrow keys + enter. */
  private updateP2(dt: number) {
    if (this.paused || this.raceState === 'countdown') return;

    const p2Remote = this.remotePlayers.get('__p2__');

    // P2 race timer
    if (this.raceState === 'racing' && !this.p2Finished) {
      this.p2RaceTimer += dt;
    }

    // ── Inputs ──
    const gp2 = this.gamepadManager.getState(1);
    const up = this.isKey('arrowup');
    const down = this.isKey('arrowdown');
    const left = this.isKey('arrowleft');
    const right = this.isKey('arrowright');
    const enterHeld = this.isKey('enter') || gp2.actionHeld;
    const enterPressed = (enterHeld && !this.p2EnterHeldLast) || gp2.actionPressed;
    this.p2EnterHeldLast = enterHeld;

    // Gamepad P2: Triangle held = rear camera
    this.gamepadRearCamP2 = gp2.rearCameraHeld;
    // Gamepad P2: Right analog orbits camera
    const P2_CAMERA_ORBIT_SPEED = 3.0;
    if (Math.abs(gp2.cameraX) > 0) {
      this.gamepadCameraOrbitP2 += gp2.cameraX * P2_CAMERA_ORBIT_SPEED * dt;
    } else {
      this.gamepadCameraOrbitP2 *= Math.exp(-5 * dt);
      if (Math.abs(this.gamepadCameraOrbitP2) < 0.01) this.gamepadCameraOrbitP2 = 0;
    }

    let accelInput = 0;
    if (up) accelInput += 1;
    if (down) accelInput -= 1;
    // Gamepad P2: R2 = accelerate, L2 = reverse (triggers)
    if (gp2.connected) {
      if (gp2.accel > 0.05) accelInput += gp2.accel;
      if (gp2.reverse > 0.05) accelInput -= gp2.reverse;
    }
    accelInput = Math.max(-1, Math.min(1, accelInput));
    let turnInput = 0;
    if (left) turnInput -= 1;
    if (right) turnInput += 1;
    // Gamepad P2: Left stick X = steer, Y forward = accelerate
    if (gp2.connected) {
      turnInput += gp2.steerX;
      if (gp2.steerY < -0.1) accelInput += -gp2.steerY;
      if (gp2.steerY > 0.1) accelInput -= gp2.steerY;
      accelInput = Math.max(-1, Math.min(1, accelInput));
    }
    turnInput = Math.max(-1, Math.min(1, turnInput));

    if (!this.p2Finished) {
      if (this.p2Role === 'runner') {
        // ── Runner movement (matches P1 runner physics) ──
        if (turnInput !== 0) this.p2Yaw += turnInput * RUNNER_PLAYER_TURN_SPEED * dt;

        const targetSpeed = accelInput * RUNNER_PLAYER_SPEED;
        const blend = Math.min(1, (accelInput !== 0 ? RUNNER_PLAYER_ACCELERATION : RUNNER_PLAYER_DECELERATION) * dt);
        this.p2Speed += (targetSpeed - this.p2Speed) * blend;
        this.p2Speed = Math.max(-RUNNER_PLAYER_SPEED * REVERSE_SPEED_MULTIPLIER, Math.min(RUNNER_PLAYER_SPEED, this.p2Speed));

        // Jump (Enter key for P2)
        if (enterPressed && this.p2JumpsUsed < RUNNER_PLAYER_MAX_JUMPS) {
          this.p2Airborne = true;
          this.p2JumpsUsed++;
          this.p2VelY = Math.sqrt(2 * GRAVITY * RUNNER_JUMP_HEIGHT);
          this.p2JumpSideVel = left !== right ? (left ? -RUNNER_PLAYER_JUMP_SIDE_VELOCITY : RUNNER_PLAYER_JUMP_SIDE_VELOCITY) : 0;
        }
        this.p2JumpHeldLast = enterHeld;

        const fwd = new Vector3(Math.sin(this.p2Yaw), 0, Math.cos(this.p2Yaw));
        const rgt = new Vector3(Math.cos(this.p2Yaw), 0, -Math.sin(this.p2Yaw));
        this.p2Pos.x += (fwd.x * this.p2Speed + rgt.x * this.p2JumpSideVel) * dt;
        this.p2Pos.z += (fwd.z * this.p2Speed + rgt.z * this.p2JumpSideVel) * dt;
        this.p2JumpSideVel *= Math.exp(-8 * dt);

        // Runner collision resolution
        this.resolveP2Collisions(RUNNER_COLLISION_RADIUS);

        if (this.p2Airborne) {
          this.p2VelY -= GRAVITY * dt;
          this.p2Pos.y += this.p2VelY * dt;
          const gY = this.getGroundY(this.p2Pos.x, this.p2Pos.z);
          if (this.p2Pos.y <= gY && this.p2VelY < 0) {
            this.p2Pos.y = gY;
            this.p2VelY = 0;
            this.p2Airborne = false;
            this.p2JumpsUsed = 0;
            this.p2JumpSideVel = 0;
          }
        } else {
          this.p2Pos.y = this.getGroundY(this.p2Pos.x, this.p2Pos.z);
          this.p2JumpsUsed = 0;
        }
      } else {
        // ── Bus movement (matches P1 bus physics — drift, boost, slope, collisions) ──

        // Scoop trigger (Enter key for P2 bus)
        if (enterHeld && this.p2ScoopAnimTimer <= 0) {
          this.p2ScoopAnimTimer = SCOOP_ANIM_DURATION;
        }

        if (turnInput !== 0 && Math.abs(this.p2Speed) > 0.5) {
          this.p2Yaw += turnInput * BUS_TURN_SPEED * dt;
        } else if (turnInput !== 0 && accelInput !== 0 && Math.abs(this.p2Speed) <= 0.5) {
          this.p2Yaw += turnInput * BUS_TURN_SPEED_STANDSTILL * dt;
        }

        // Acceleration / braking / friction (same as P1)
        if (this.p2BoostTimer > 0) {
          // Boosting: rapidly accelerate to boosted max speed, cannot slow down
          const boostedMax = BUS_MAX_SPEED * SCOOP_BOOST_MULTIPLIER;
          this.p2Speed = Math.min(boostedMax, this.p2Speed + SCOOP_BOOST_ACCELERATION * dt);
        } else if (accelInput > 0) {
          this.p2Speed += BUS_ACCELERATION * dt;
        } else if (accelInput < 0) {
          this.p2Speed -= BUS_BRAKE * dt;
        } else {
          if (this.p2Speed > 0) {
            this.p2Speed = Math.max(0, this.p2Speed - BUS_FRICTION * dt);
          } else if (this.p2Speed < 0) {
            this.p2Speed = Math.min(0, this.p2Speed + BUS_FRICTION * dt);
          }
        }

        // Clamp speed (boosted max while scoop-boost is active)
        const effectiveMaxSpeed = this.p2BoostTimer > 0 ? BUS_MAX_SPEED * SCOOP_BOOST_MULTIPLIER : BUS_MAX_SPEED;
        this.p2Speed = Math.max(-effectiveMaxSpeed * REVERSE_SPEED_MULTIPLIER, Math.min(effectiveMaxSpeed, this.p2Speed));

        // Tick boost timer
        if (this.p2BoostTimer > 0) {
          this.p2BoostTimer -= dt;
          if (this.p2BoostTimer <= 0) this.p2BoostTimer = 0;
        }

        // Drift model (velocity angle lags behind heading)
        const absSpeed = Math.abs(this.p2Speed);
        const speedRatio = absSpeed / BUS_MAX_SPEED;
        const p2InWater = this.isInWater(this.p2Pos.x, this.p2Pos.z);
        const baseGrip = p2InWater ? WATER_DRIFT_GRIP : DRIFT_GRIP;
        const grip = baseGrip * (1 - speedRatio * DRIFT_HIGH_SPEED_GRIP_FACTOR);
        let velAngleDiff = this.p2Yaw - this.p2VelAngle;
        while (velAngleDiff > Math.PI) velAngleDiff -= 2 * Math.PI;
        while (velAngleDiff < -Math.PI) velAngleDiff += 2 * Math.PI;
        this.p2VelAngle += velAngleDiff * Math.min(1, grip * dt);

        const forward = new Vector3(Math.sin(this.p2VelAngle), 0, Math.cos(this.p2VelAngle));
        this.p2Pos.x += forward.x * this.p2Speed * dt;
        this.p2Pos.z += forward.z * this.p2Speed * dt;

        // Solid-object + building + fence collisions
        this.resolveP2Collisions(BUS_COLLISION_RADIUS);

        // Follow terrain
        let groundY = this.getGroundY(this.p2Pos.x, this.p2Pos.z);
        const waterSurfY = this.getWaterSurfaceY(this.p2Pos.x, this.p2Pos.z);
        if (waterSurfY !== null) {
          groundY = waterSurfY - WATER_SINK;
        }
        this.p2Pos.y = groundY;

        // Slope boost / drag
        const headingDir = new Vector3(Math.sin(this.p2Yaw), 0, Math.cos(this.p2Yaw));
        const slopeProbe = 2.0;
        const hAhead = this.getGroundY(
          this.p2Pos.x + headingDir.x * slopeProbe,
          this.p2Pos.z + headingDir.z * slopeProbe,
        );
        const hBehind = this.getGroundY(
          this.p2Pos.x - headingDir.x * slopeProbe,
          this.p2Pos.z - headingDir.z * slopeProbe,
        );
        const slopePitch = Math.atan2(hAhead - hBehind, slopeProbe * 2);
        if (slopePitch < BUS_DOWNHILL_SLOPE_THRESHOLD && this.p2Speed > 0) {
          this.p2Speed += BUS_DOWNHILL_ACCEL_BOOST * dt;
        }
        if (slopePitch > 0.01 && this.p2Speed > 0 && this.p2BoostTimer <= 0) {
          const uphillFactor = Math.min(slopePitch / 0.3, 1);
          this.p2Speed = Math.max(0, this.p2Speed - BUS_UPHILL_DRAG * uphillFactor * dt);
        }

        // Scoop anim timer decrement
        if (this.p2ScoopAnimTimer > 0) {
          this.p2ScoopAnimTimer -= dt;
        }

        // NPC runner scoop detection (P2 bus scoops NPC runners)
        this.tryScoopNpcRunnersForP2();
      }
    } else {
      // P2 finished: coast to stop
      if (this.p2Speed > 0) this.p2Speed = Math.max(0, this.p2Speed - 8 * dt);
      else if (this.p2Speed < 0) this.p2Speed = Math.min(0, this.p2Speed + 8 * dt);
      if (Math.abs(this.p2Speed) > 0.01) {
        const fwd = new Vector3(Math.sin(this.p2Yaw), 0, Math.cos(this.p2Yaw));
        this.p2Pos.x += fwd.x * this.p2Speed * dt;
        this.p2Pos.z += fwd.z * this.p2Speed * dt;
      }
      this.p2Pos.y = this.getGroundY(this.p2Pos.x, this.p2Pos.z);
    }

    // ── Gate check for P2 ──
    const newP2GateIdx = checkGatePass(this.gatePositions, this.p2GateIdx, this.p2Pos.x, this.p2Pos.z);
    if (newP2GateIdx > this.p2GateIdx) {
      this.p2GateIdx = newP2GateIdx;
      this.updateP2GateFlag();
    }
    if (!this.p2Finished && this.gameType !== 'single-bus-mode' && this.p2GateIdx >= this.gatePositions.length && this.raceState === 'racing') {
      this.p2Finished = true;
      this.p2FinishTime = this.p2RaceTimer;
      this.callbacks.onP2Finish?.(this.p2FinishTime);
    }

    // ── P2 course progress ──
    if (this.raceState === 'racing') {
      const totalKm = this.pathTotalDistance / 1000;
      const p2CoveredKm = (this.p2GateIdx > 0
        ? this.gatePositions[this.p2GateIdx - 1].pathDist
        : 0) / 1000;
      this.callbacks.onP2CourseProgress?.(parseFloat(p2CoveredKm.toFixed(1)), parseFloat(totalKm.toFixed(1)));
    }

    // ── Update P2 remote-player visual ──
    if (p2Remote) {
      p2Remote.smoothPos.copyFrom(this.p2Pos);
      p2Remote.smoothYaw = this.p2Yaw;
      p2Remote.smoothPitch = 0;
      // Keep state in sync so updateRemoteBusMeshes works correctly
      p2Remote.state = {
        x: this.p2Pos.x,
        y: this.p2Pos.y,
        z: this.p2Pos.z,
        yaw: this.p2Yaw,
        pitch: 0,
        speed: this.p2Speed,
        dist: 0,
        scooped: 0,
        boosting: this.p2BoostTimer > 0,
        scooping: this.p2ScoopAnimTimer > 0,
        raceState: this.p2Finished ? 'finished' : this.raceState,
        raceTime: this.p2RaceTimer,
        gateIdx: this.p2GateIdx,
        playerIndex: 2,
        role: this.p2Role,
      };
    }
  }

  /** Update P2's camera (split-screen). */
  private updateP2Camera(dt: number) {
    if (!this.p2Camera) return;
    // Gamepad: right-analog orbit + Triangle rear camera for P2
    const gpOrbitP2 = this.gamepadCameraOrbitP2 + (this.gamepadRearCamP2 ? Math.PI : 0);

    if (this.p2Role === 'runner') {
      updateRunnerCameraSystem({
        dt,
        camera: this.p2Camera,
        runnerYaw: this.p2Yaw + gpOrbitP2,
        runnerPos: this.p2Pos,
        getGroundY: (x, z) => this.getGroundY(x, z),
        getWaterSurfaceY: (x, z) => this.getWaterSurfaceY(x, z),
      });
    } else {
      const targetYawOffset = this.p2Speed < -1 ? Math.PI : 0;
      const camSwingSpeed = 3;
      const yawDiff = targetYawOffset - this.p2CameraYawOffset;
      this.p2CameraYawOffset += Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), camSwingSpeed * dt);
      this.p2CameraYawOffset = updateChaseCameraSystem({
        dt,
        camera: this.p2Camera,
        busYaw: this.p2Yaw + gpOrbitP2,
        busSpeed: this.p2Speed,
        busPos: this.p2Pos,
        cameraYawOffset: this.p2CameraYawOffset,
        getGroundY: (x, z) => this.getGroundY(x, z),
        getWaterSurfaceY: (x, z) => this.getWaterSurfaceY(x, z),
      });
    }

    // P2 boost visual effects
    const p2BoostIntensity = Math.abs(this.p2Speed) > BUS_MAX_SPEED
      ? Math.min(1, (Math.abs(this.p2Speed) - BUS_MAX_SPEED) / (BUS_MAX_SPEED * (SCOOP_BOOST_MULTIPLIER - 1) * 0.5))
      : 0; // effects only when above base max speed
    this.p2BoostEffects?.update(dt, p2BoostIntensity, this.boostEffectsElapsed);
  }

  private updateChaseCam(dt: number) {
    // Gamepad: right-analog orbit + Triangle rear camera for P1
    const gpOrbitP1 = this.gamepadCameraOrbitP1 + (this.gamepadRearCamP1 ? Math.PI : 0);

    if (this.localPlayerRole === 'runner') {
      updateRunnerCameraSystem({
        dt,
        camera: this.camera,
        runnerYaw: this.busYaw + gpOrbitP1,
        runnerPos: this.busPos,
        getGroundY: (x, z) => this.getGroundY(x, z),
        getWaterSurfaceY: (x, z) => this.getWaterSurfaceY(x, z),
      });
      return;
    }

    this.cameraYawOffset = updateChaseCameraSystem({
      dt,
      camera: this.camera,
      busYaw: this.busYaw + gpOrbitP1,
      busSpeed: this.busSpeed,
      busPos: this.busPos,
      cameraYawOffset: this.cameraYawOffset,
      getGroundY: (x, z) => this.getGroundY(x, z),
      getWaterSurfaceY: (x, z) => this.getWaterSurfaceY(x, z),
    });
  }

  // ---------- Minimap player list builder ----------

  private buildMinimapPlayers() {
    return buildMinimapPlayers({
      remotePlayers: this.remotePlayers,
      localPlayerIndex: this.localPlayerIndex,
      busPos: this.busPos,
      busYaw: this.busYaw,
      charSelection: this.charSelection,
    });
  }

  private getMinimapLookaheadAnchor(): { x: number; z: number; pathDist: number; playerPathDist: number } {
    const gate = this.gatePositions[this.currentGateIdx];
    // Compute player's path distance from the previous gate (or start)
    const prevGate = this.gatePositions[this.currentGateIdx - 1];
    const playerPathDist = prevGate ? prevGate.pathDist : 0;
    if (gate) {
      return { x: gate.x, z: gate.z, pathDist: gate.pathDist, playerPathDist };
    }
    // Past all gates — use total path distance
    const totalDist = this.pathCumDist[this.pathCumDist.length - 1] ?? 0;
    return { x: this.busPos.x, z: this.busPos.z, pathDist: totalDist, playerPathDist: totalDist };
  }

  private getP2MinimapLookaheadAnchor(): { x: number; z: number; pathDist: number; playerPathDist: number } {
    const gate = this.gatePositions[this.p2GateIdx];
    const prevGate = this.gatePositions[this.p2GateIdx - 1];
    const playerPathDist = prevGate ? prevGate.pathDist : 0;
    if (gate) {
      return { x: gate.x, z: gate.z, pathDist: gate.pathDist, playerPathDist };
    }
    const totalDist = this.pathCumDist[this.pathCumDist.length - 1] ?? 0;
    return { x: this.p2Pos.x, z: this.p2Pos.z, pathDist: totalDist, playerPathDist: totalDist };
  }

  private drawP2Minimap() {
    if (!this.p2Minimap) return;
    this.p2Minimap.draw(
      this.p2Pos.x,
      this.p2Pos.z,
      this.p2Yaw,
      this.buildMinimapPlayers(),
      this.passengerSystem ? undefined : this.getP2MinimapLookaheadAnchor(),
      this.passengerSystem?.getMinimapDots(),
      this.passengerSystem?.getMinimapFlags(),
    );
  }

  // ---------- Remote bus interpolation ----------

  private updateRemoteBusMeshes(dt: number, engineVibeOffset: number) {
    updateRemotePlayersSystem({
      remotePlayers: this.remotePlayers,
      dt,
      busRoofY: BUS_ROOF_Y,
      engineVibeOffset,
      observerX: this.viewCenter.x,
      observerZ: this.viewCenter.z,
    });
  }

  /** Toggle local bus reverse lights (red tail glow when reversing). */
  private updateLocalReverseLights() {
    const reversing = this.busSpeed < -0.5;
    for (const rl of this.busReverseLights) {
      rl.setEnabled(reversing);
    }
  }

  private updateBuildingLodForPlayer() {
    if (this.buildingLodEntries.length === 0) return;
    updateBuildingLod(this.buildingLodEntries, this.viewCenter.x, this.viewCenter.z);
    // In local multiplayer, also run LOD from P2's position to ensure high detail near P2
    if (this.localMultiplayer) {
      updateBuildingLod(this.buildingLodEntries, this.p2Pos.x, this.p2Pos.z);
    }
  }

  /** Hide trees and objects beyond their max render distance from EITHER player. */
  private updateDistanceCulling() {
    const cx = this.viewCenter.x;
    const cz = this.viewCenter.z;
    const hasP2 = this.localMultiplayer;
    const p2x = this.p2Pos.x;
    const p2z = this.p2Pos.z;

    const treeDistSq = RENDER_TREES_MAX_DISTANCE * RENDER_TREES_MAX_DISTANCE;
    for (const root of this.treeRoots) {
      const dx1 = root.position.x - cx;
      const dz1 = root.position.z - cz;
      let visible = dx1 * dx1 + dz1 * dz1 < treeDistSq;
      if (!visible && hasP2) {
        const dx2 = root.position.x - p2x;
        const dz2 = root.position.z - p2z;
        visible = dx2 * dx2 + dz2 * dz2 < treeDistSq;
      }
      root.setEnabled(visible);
    }

    const objDistSq = RENDER_OBJECTS_MAX_DISTANCE * RENDER_OBJECTS_MAX_DISTANCE;
    for (const root of this.objectRoots) {
      const dx1 = root.position.x - cx;
      const dz1 = root.position.z - cz;
      let visible = dx1 * dx1 + dz1 * dz1 < objDistSq;
      if (!visible && hasP2) {
        const dx2 = root.position.x - p2x;
        const dz2 = root.position.z - p2z;
        visible = dx2 * dx2 + dz2 * dz2 < objDistSq;
      }
      root.setEnabled(visible);
    }
  }

  // ---------- Update ----------

  private update(dt: number) {
    // If paused, keep rendering the scene but skip all simulation
    if (this.paused) return;

    // Poll gamepad inputs once per frame
    this.gamepadManager.poll();

    // Compute the effective view center on the ground — used for LOD,
    // culling, and terrain inset centering instead of raw camera XZ.
    const p1View = computeViewCenterXZ(this.camera);
    this.viewCenter = p1View;
    this.setViewCenterOnGround?.(p1View.x, this.camera.position.y, p1View.z);
    // In local multiplayer, give P2 their own area of high shader detail
    // instead of averaging both positions (which degrades detail for both).
    // The inset center uses the midpoint so both players stay within the
    // high-res texture window.
    if (this.localMultiplayer && this.p2Camera) {
      const p2View = computeViewCenterXZ(this.p2Camera);
      this.setViewCenter2OnGround?.(p2View.x, this.p2Camera.position.y, p2View.z);
      // Use midpoint for viewCenter (still used for inset rebaking)
      this.viewCenter = {
        x: (p1View.x + p2View.x) / 2,
        z: (p1View.z + p2View.z) / 2,
      };
    }

    // --- Engine vibration (scales with speed, max amplitude at full base speed) ---
    this.engineVibePhase += dt * ENGINE_VIBE_FREQUENCY * Math.PI * 2;
    const speedFraction = Math.min(Math.abs(this.busSpeed) / BUS_MAX_SPEED, 1);
    const engineVibeOffset = Math.sin(this.engineVibePhase) * ENGINE_VIBE_AMPLITUDE * speedFraction;
    this.powerUpSystem?.update(Date.now());
    this.updateRunnerPowerUpEffects(dt);
    this.updateLocalReverseLights();

    const enterHeld = this.isKey('enter') || this.gamepadManager.getState(0).itemPressed;
    if ((enterHeld && !this.enterHeldLastFrame) || this.gamepadManager.getState(0).itemPressed) {
      this.useHeldPowerUp();
    }
    this.enterHeldLastFrame = enterHeld;

    // Gamepad: Triangle held = rear camera for P1
    const gp1 = this.gamepadManager.getState(0);
    this.gamepadRearCamP1 = gp1.rearCameraHeld;
    // Gamepad: Right analog stick orbits camera for P1
    const CAMERA_ORBIT_SPEED = 3.0; // rad/s
    if (Math.abs(gp1.cameraX) > 0) {
      this.gamepadCameraOrbitP1 += gp1.cameraX * CAMERA_ORBIT_SPEED * dt;
    } else {
      // Smoothly return to 0 when stick released
      this.gamepadCameraOrbitP1 *= Math.exp(-5 * dt);
      if (Math.abs(this.gamepadCameraOrbitP1) < 0.01) this.gamepadCameraOrbitP1 = 0;
    }
    // Reset gamepad orbit when rear cam toggles off
    if (!this.gamepadRearCamP1 && Math.abs(this.gamepadCameraOrbitP1) < 0.01) {
      this.gamepadCameraOrbitP1 = 0;
    }

    // --- Countdown phase ---
    if (this.raceState === 'countdown') {
      // If waiting for multiplayer sync, or scene hasn't rendered yet, don't tick down
      if (this.waitForCountdown || !this.sceneRendered) {
        this.updateRemoteBusMeshes(dt, engineVibeOffset);
        this.updateBuildingLodForPlayer();
        this.updateDistanceCulling();
        if (this.minimap) {
          this.minimap.draw(this.busPos.x, this.busPos.z, this.busYaw, this.buildMinimapPlayers(), this.passengerSystem ? undefined : this.getMinimapLookaheadAnchor());
        }
        this.drawP2Minimap();
        return;
      }

      // Fire the countdown UI on the first frame the scene is actually visible.
      // This is deferred from initScene() / startCountdown() so the player
      // sees the 3D world before the "3" overlay appears.
      if (!this.countdownUiStarted) {
        this.countdownUiStarted = true;
        this.countdownTimer = COUNTDOWN_DURATION;
        this.callbacks.onCountdown?.('3');
        this.callbacks.onRaceStateChange?.('countdown');
      }

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
      const runnerResult = updateRunnersSystem({
        scene: this.scene,
        runners: this.runners,
        pathPositions: this.pathPositions,
        getGroundY: (x, z) => this.getGroundY(x, z),
        busPos: this.busPos,
        busYaw: this.busYaw,
        busPitch: this.busPitch,
        busSpeed: this.busSpeed,
        localPlayerRole: this.localPlayerRole,
        localPlayerIndex: this.localPlayerIndex,
        solidObstacles: this.solidObstacles,
        elasticObjects: this.elasticObjects,
        remotePlayers: this.remotePlayers,
        buildingColliders: this.buildingColliders,
        engineVibeOffset,
        localMultiplayer: this.localMultiplayer,
      }, dt);
      this.pendingScoopEvents.push(...runnerResult.scoopEvents);
      if (runnerResult.triggerScoopAnim) this.scoopAnimTimer = SCOOP_ANIM_DURATION;
      if (runnerResult.boostTimerAdd > 0) this.boostTimer += runnerResult.boostTimerAdd;
      if (runnerResult.startExhaust && this.exhaustFlames && !this.exhaustFlames.isStarted()) {
        this.exhaustFlames.start();
      }
      for (let _i = 0; _i < runnerResult.scoopCount; _i++) {
        this.callbacks.onScoopRunner();
      }
      // NPC wave / high-five during countdown
      updateRunnerInteractions(this.runners, null, dt);
      updateMarshals(this.marshals, dt);
      // Update geese during countdown (keeps Y synced with ground mesh)
      if (this.geese.length > 0) {
        updateGeeseSystem({
          scene: this.scene,
          geese: this.geese,
          getGroundY: (x, z) => this.getGroundY(x, z),
          busPos: this.busPos,
          busYaw: this.busYaw,
          busSpeed: 0,
          localPlayerRole: this.localPlayerRole,
          solidObstacles: this.solidObstacles,
          buildingColliders: this.buildingColliders,
          waterZones: this.waterZones,
        }, dt);
      }
      // Update deer during countdown
      if (this.deer.length > 0) {
        updateDeerSystem({
          scene: this.scene,
          deer: this.deer,
          getGroundY: (x, z) => this.getGroundY(x, z),
          busPos: this.busPos,
          busYaw: this.busYaw,
          busSpeed: 0,
          localPlayerRole: this.localPlayerRole,
          solidObstacles: this.solidObstacles,
          buildingColliders: this.buildingColliders,
          waterZones: this.waterZones,
        }, dt);
      }
      this.updateRemoteBusMeshes(dt, engineVibeOffset);

      // Ensure bus mesh is positioned (so it's visible during countdown)
      if (this.busMesh) {
        this.busMesh.position.copyFrom(this.busPos);
        this.busMesh.rotation.y = this.busYaw;
        this.busMesh.setEnabled(this.localPlayerRole === 'bus');
      }
      if (this.busBodyShell) {
        this.busBodyShell.position.y = engineVibeOffset;
      }
      if (this.localPlayerRole === 'runner') {
        this.localRunnerAnimPhase = updateLocalRunnerVisualFn({ model: this.localRunnerModel!, busPos: this.busPos, busYaw: this.busYaw, busSpeed: this.busSpeed * (this.runnerFikaTimer > 0 ? POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER : 1), busAirborne: this.busAirborne, scoopState: this.localRunnerScoopState, runnerJumpSideVel: this.runnerJumpSideVel, jumpsUsed: this.runnerJumpsUsed, getGroundY: (x, z) => this.getGroundY(x, z) }, dt, this.localRunnerAnimPhase);
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
      // P2 camera during countdown
      if (this.localMultiplayer && this.p2Camera) {
        updateCountdownCameraSystem({
          dt,
          camera: this.p2Camera,
          busYaw: this.p2Yaw,
          busPos: this.p2Pos,
          countdownTimer: this.countdownTimer,
          countdownDuration: COUNTDOWN_DURATION,
          getGroundY: (x, z) => this.getGroundY(x, z),
          getWaterSurfaceY: (x, z) => this.getWaterSurfaceY(x, z),
        });
      }

      if (this.minimap) {
        this.minimap.draw(
          this.busPos.x,
          this.busPos.z,
          this.busYaw,
          this.buildMinimapPlayers(),
          this.passengerSystem ? undefined : this.getMinimapLookaheadAnchor(),
        );
      }
      this.drawP2Minimap();
      this.updateBuildingLodForPlayer();
      this.updateDistanceCulling();
      this.updateInsetCenter?.(this.viewCenter.x, this.viewCenter.z);

      // --- Engine sounds during countdown (with rev on forward input) ---
      {
        const listener = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
        // Detect forward key held for rev effect
        const gp1State = this.gamepadManager.getState(0);
        const revving = this.isKey('w') || (!this.localMultiplayer && this.isKey('arrowup')) || (this.touchActive && this.touchDeltaY <= 0.1) || gp1State.accel > 0.1;
        const revSpeed = revving ? 8 : 0; // simulate ~8 m/s for rev sound
        const busSources: BusSoundSource[] = [
          { x: this.busPos.x, y: this.busPos.y, z: this.busPos.z, speed: revSpeed, slope: 0 },
        ];
        for (const [, remote] of this.remotePlayers) {
          if (remote.state) {
            busSources.push({ x: remote.smoothPos.x, y: remote.smoothPos.y, z: remote.smoothPos.z, speed: remote.state.speed, slope: remote.smoothPitch });
          }
        }
        const goosePositions = this.geese.map(g => ({ x: g.x, z: g.z }));
        updateGameSounds(listener, busSources, goosePositions);
      }

      return;
    }

    // --- Finished phase: coast for ~2s then stop (unless keepDrivingMode) ---
    if (this.raceState === 'finished') {
      this.finishedTimer += dt;

      if (this.keepDrivingMode) {
        // Re-enter normal driving (fall through to racing physics below)
      } else {
        // Coast: decelerate to 0 over ~2 seconds
        const COAST_DECEL = 8; // m/s² — brings ~16 m/s to 0 in 2s
        if (this.busSpeed > 0) {
          this.busSpeed = Math.max(0, this.busSpeed - COAST_DECEL * dt);
        } else if (this.busSpeed < 0) {
          this.busSpeed = Math.min(0, this.busSpeed + COAST_DECEL * dt);
        }

        // Keep moving straight ahead (while speed > 0)
        if (Math.abs(this.busSpeed) > 0.01) {
          const fwd = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
          this.busPos.x += fwd.x * this.busSpeed * dt;
          this.busPos.z += fwd.z * this.busSpeed * dt;
        }

        // Follow terrain (float on water if applicable)
        let finGroundY = this.getGroundY(this.busPos.x, this.busPos.z);
        const finWaterY = this.getWaterSurfaceY(this.busPos.x, this.busPos.z);
        if (finWaterY !== null) {
          this.waterBobPhase += WATER_BOB_SPEED * dt;
          finGroundY = finWaterY + Math.sin(this.waterBobPhase) * WATER_BOB_AMPLITUDE - WATER_SINK;
        }
        this.waterWakeActive = setWaterWakeActive(this.waterWake, this.waterWakeActive, finWaterY !== null && Math.abs(this.busSpeed) > 0.5);
        updateWakeIntensity(this.waterWake, this.waterWakeActive, this.busSpeed);
        this.busPos.y = finGroundY;

        // Update bus mesh
        if (this.busMesh) {
          this.busMesh.position.copyFrom(this.busPos);
          this.busMesh.rotation.y = this.busYaw;
          this.busMesh.setEnabled(this.localPlayerRole === 'bus');
        }
        if (this.localPlayerRole === 'runner') {
          this.localRunnerAnimPhase = updateLocalRunnerVisualFn({ model: this.localRunnerModel!, busPos: this.busPos, busYaw: this.busYaw, busSpeed: this.busSpeed * (this.runnerFikaTimer > 0 ? POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER : 1), busAirborne: this.busAirborne, scoopState: this.localRunnerScoopState, runnerJumpSideVel: this.runnerJumpSideVel, jumpsUsed: this.runnerJumpsUsed, getGroundY: (x, z) => this.getGroundY(x, z) }, dt, this.localRunnerAnimPhase);
        }

        this.updateChaseCam(dt);
        // Boost effects fade-out during finish coast
        this.boostEffectsElapsed += dt;
        const finishBoostIntensity = Math.min(1, this.boostTimer / 0.5);
        this.boostEffects?.update(dt, finishBoostIntensity, this.boostEffectsElapsed);

        const runnerResult2 = updateRunnersSystem({
          scene: this.scene,
          runners: this.runners,
          pathPositions: this.pathPositions,
          getGroundY: (x, z) => this.getGroundY(x, z),
          busPos: this.busPos,
          busYaw: this.busYaw,
          busPitch: this.busPitch,
          busSpeed: this.busSpeed,
          localPlayerRole: this.localPlayerRole,
          localPlayerIndex: this.localPlayerIndex,
          solidObstacles: this.solidObstacles,
          elasticObjects: this.elasticObjects,
          remotePlayers: this.remotePlayers,
          buildingColliders: this.buildingColliders,
          engineVibeOffset,
          localMultiplayer: this.localMultiplayer,
        }, dt);
        this.pendingScoopEvents.push(...runnerResult2.scoopEvents);
        if (runnerResult2.triggerScoopAnim) this.scoopAnimTimer = SCOOP_ANIM_DURATION;
        if (runnerResult2.boostTimerAdd > 0) this.boostTimer += runnerResult2.boostTimerAdd;
        if (runnerResult2.startExhaust && this.exhaustFlames && !this.exhaustFlames.isStarted()) {
          this.exhaustFlames.start();
        }
        for (let _i = 0; _i < runnerResult2.scoopCount; _i++) {
          this.callbacks.onScoopRunner();
        }
        // NPC wave / high-five during finished state
        updateRunnerInteractions(this.runners, null, dt);
        updateMarshals(this.marshals, dt);
        updateElasticObjects(this.elasticObjects, dt);
        this.updateRemoteBusMeshes(dt, engineVibeOffset);
        this.updateBuildingLodForPlayer();
        this.updateDistanceCulling();
        this.updateInsetCenter?.(this.viewCenter.x, this.viewCenter.z);
        if (this.minimap) {
          this.minimap.draw(
            this.busPos.x,
            this.busPos.z,
            this.busYaw,
            this.buildMinimapPlayers(),
            this.passengerSystem ? undefined : this.getMinimapLookaheadAnchor(),
          );
        }
        this.drawP2Minimap();
        return;
      }
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
    // In local multiplayer P1 uses only WASD; arrow keys are reserved for P2.
    let accelInput = 0;
    if (this.isKey('w') || (!this.localMultiplayer && this.isKey('arrowup'))) accelInput += 1;
    if (this.isKey('s') || (!this.localMultiplayer && this.isKey('arrowdown'))) accelInput -= 1;
    // Blend touch accel: touch = accelerate, drag down (back toward you) = reverse
    if (this.touchActive) {
      accelInput += this.touchDeltaY > 0.1 ? -1 : 1;
    }
    // Gamepad P1: R2 = accelerate, L2 = reverse (triggers)
    if (gp1.connected) {
      if (gp1.accel > 0.05) accelInput += gp1.accel;
      if (gp1.reverse > 0.05) accelInput -= gp1.reverse;
    }
    accelInput = Math.max(-1, Math.min(1, accelInput));

    // --- Steering ---
    let turnInput = 0;
    if (this.isKey('a') || (!this.localMultiplayer && this.isKey('arrowleft'))) turnInput -= 1;
    if (this.isKey('d') || (!this.localMultiplayer && this.isKey('arrowright'))) turnInput += 1;
    // Blend touch steering
    if (this.touchActive) turnInput += this.touchDeltaX;
    // Gamepad P1: Left stick X = steer, Y forward = accelerate
    if (gp1.connected) {
      turnInput += gp1.steerX;
      if (gp1.steerY < -0.1) accelInput += -gp1.steerY; // push forward (negative Y) = accel
      if (gp1.steerY > 0.1) accelInput -= gp1.steerY;  // pull back (positive Y) = reverse
      accelInput = Math.max(-1, Math.min(1, accelInput));
    }
    turnInput = Math.max(-1, Math.min(1, turnInput));
    turnInput = Math.max(-1, Math.min(1, turnInput));
    if (this.isControlLockedByIcePatch(this.busPos.x, this.busPos.z)) {
      turnInput = 0;
    }

    let groundY = this.getGroundY(this.busPos.x, this.busPos.z);

    if (this.localPlayerRole === 'runner') {
      if (this.localRunnerScoopState !== 'free') {
        this.updateLocalRunnerScooped(dt);
        groundY = this.getGroundY(this.busPos.x, this.busPos.z);
        this.waterWakeActive = setWaterWakeActive(this.waterWake, this.waterWakeActive, false);
        updateWakeIntensity(this.waterWake, this.waterWakeActive, this.busSpeed);

        this.busPitch = 0;

        if (this.busMesh) {
          this.busMesh.setEnabled(false);
        }
        this.localRunnerAnimPhase = updateLocalRunnerVisualFn({ model: this.localRunnerModel!, busPos: this.busPos, busYaw: this.busYaw, busSpeed: this.busSpeed * (this.runnerFikaTimer > 0 ? POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER : 1), busAirborne: this.busAirborne, scoopState: this.localRunnerScoopState, runnerJumpSideVel: this.runnerJumpSideVel, jumpsUsed: this.runnerJumpsUsed, getGroundY: (x, z) => this.getGroundY(x, z) }, dt, this.localRunnerAnimPhase);
      } else {
      // Human-like direct control: no drift, runner jump with optional side leap.
      if (turnInput !== 0) {
        this.busYaw += turnInput * RUNNER_PLAYER_TURN_SPEED * dt;
      }

      // Calculate player runner slope for downhill speed boost
      const playerRunnerHeading = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
      const currentRunnerHeight = this.getGroundY(this.busPos.x, this.busPos.z);
      const aheadRunnerHeight = this.getGroundY(
        this.busPos.x + playerRunnerHeading.x * 2,
        this.busPos.z + playerRunnerHeading.z * 2,
      );
      const playerRunnerSlope = Math.atan2(aheadRunnerHeight - currentRunnerHeight, 2);
      const playerSpeedMultiplier = playerRunnerSlope < RUNNER_DOWNHILL_SLOPE_THRESHOLD ? RUNNER_DOWNHILL_SPEED_BOOST : 1;

      const fikaSpeedBoost = this.runnerFikaTimer > 0 ? POWER_UP_FIKA_SPEED_MULTIPLIER : 1;
      const shoeSpeedBoost = this.runnerShoeTimer > 0 ? POWER_UP_SHOE_SPEED_MULTIPLIER : 1;
      const totalRunnerSpeedBoost = fikaSpeedBoost * shoeSpeedBoost;

      if (this.runnerShoeTimer > 0) {
        accelInput = Math.max(1, accelInput);
      }

      const targetSpeed = accelInput * RUNNER_PLAYER_SPEED * playerSpeedMultiplier * totalRunnerSpeedBoost;
      const accelRate = accelInput !== 0 ? RUNNER_PLAYER_ACCELERATION : RUNNER_PLAYER_DECELERATION;
      const blend = Math.min(1, accelRate * dt);
      this.busSpeed += (targetSpeed - this.busSpeed) * blend;
      
      const maxReverse = this.runnerShoeTimer > 0 ? 0 : RUNNER_PLAYER_SPEED * REVERSE_SPEED_MULTIPLIER;
      this.busSpeed = Math.max(-maxReverse, Math.min(RUNNER_PLAYER_SPEED * playerSpeedMultiplier * totalRunnerSpeedBoost, this.busSpeed));

      const jumpHeld = this.isKey(' ') || this.isKey('space') || this.isKey('spacebar') || gp1.actionHeld;
      const jumpPressed = (jumpHeld && !this.jumpHeldLastFrame) || gp1.actionPressed;
      this.jumpHeldLastFrame = jumpHeld;
      if (jumpPressed && this.runnerJumpsUsed < RUNNER_PLAYER_MAX_JUMPS) {
        this.busAirborne = true;
        this.runnerJumpsUsed += 1;
        this.busVelY = Math.sqrt(2 * GRAVITY * RUNNER_JUMP_HEIGHT);
        const leftHeld = this.isKey('a') || (!this.localMultiplayer && this.isKey('arrowleft'));
        const rightHeld = this.isKey('d') || (!this.localMultiplayer && this.isKey('arrowright'));
        if (leftHeld !== rightHeld) {
          this.runnerJumpSideVel = leftHeld ? -RUNNER_PLAYER_JUMP_SIDE_VELOCITY : RUNNER_PLAYER_JUMP_SIDE_VELOCITY;
        } else {
          this.runnerJumpSideVel = 0;
        }
      }

      const forward = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
      const right = new Vector3(Math.cos(this.busYaw), 0, -Math.sin(this.busYaw));
      this.busPos.x += (forward.x * this.busSpeed + right.x * this.runnerJumpSideVel) * dt;
      this.busPos.z += (forward.z * this.busSpeed + right.z * this.runnerJumpSideVel) * dt;

      if (Math.abs(this.runnerJumpSideVel) > 0.01) {
        const sideDamp = Math.exp(-8 * dt);
        this.runnerJumpSideVel *= sideDamp;
      } else {
        this.runnerJumpSideVel = 0;
      }

      this.resolveCollisions();
      groundY = this.getGroundY(this.busPos.x, this.busPos.z);
      this.waterWakeActive = setWaterWakeActive(this.waterWake, this.waterWakeActive, false);
      updateWakeIntensity(this.waterWake, this.waterWakeActive, this.busSpeed);

      if (this.busAirborne) {
        this.busVelY -= GRAVITY * dt;
        this.busPos.y += this.busVelY * dt;
        if (this.busPos.y <= groundY) {
          this.busPos.y = groundY;
          this.busVelY = 0;
          this.busAirborne = false;
          this.runnerJumpSideVel = 0;
          this.runnerJumpsUsed = 0;
        }
      } else {
        this.busPos.y = groundY;
        this.runnerJumpsUsed = 0;
      }

      this.busPitch = 0;
      this.distanceTravelled += Math.max(0, this.busSpeed) * dt;

      if (this.busMesh) {
        this.busMesh.setEnabled(false);
      }
      this.localRunnerAnimPhase = updateLocalRunnerVisualFn({ model: this.localRunnerModel!, busPos: this.busPos, busYaw: this.busYaw, busSpeed: this.busSpeed * (this.runnerFikaTimer > 0 ? POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER : 1), busAirborne: this.busAirborne, scoopState: this.localRunnerScoopState, runnerJumpSideVel: this.runnerJumpSideVel, jumpsUsed: this.runnerJumpsUsed, getGroundY: (x, z) => this.getGroundY(x, z) }, dt, this.localRunnerAnimPhase);
      }
    } else {
      // --- Space / Gamepad X = manual scoop animation (bus mode) ---
      const scoopKeyHeld = this.isKey(' ') || this.isKey('space') || this.isKey('spacebar') || gp1.actionHeld;
      if ((scoopKeyHeld || gp1.actionPressed) && this.scoopAnimTimer <= 0) {
        this.scoopAnimTimer = SCOOP_ANIM_DURATION;
      }

      if (!this.busAirborne) {
        if (turnInput !== 0 && Math.abs(this.busSpeed) > 0.5) {
          this.busYaw += turnInput * BUS_TURN_SPEED * dt;
        } else if (turnInput !== 0 && accelInput !== 0 && Math.abs(this.busSpeed) <= 0.5) {
          // Slow rotation at standstill when player is pressing forward/reverse + turn
          this.busYaw += turnInput * BUS_TURN_SPEED_STANDSTILL * dt;
        }
      }

      // --- Steer front wheels visually ---
      const maxWheelSteer = 0.9; // radians (~52°)
      const targetWheelY = turnInput * maxWheelSteer;
      // Smooth the wheel rotation so it doesn't snap
      const steerSmooth = Math.min(1, 10 * dt);
      if (this.frontWheelLeft) {
        this.frontWheelLeft.rotation.y += (targetWheelY - this.frontWheelLeft.rotation.y) * steerSmooth;
      }
      if (this.frontWheelRight) {
        this.frontWheelRight.rotation.y += (targetWheelY - this.frontWheelRight.rotation.y) * steerSmooth;
      }

      // --- Roll all wheels based on bus speed ---
      const rollDelta = this.busSpeed * WHEEL_ROLL_SPEED * dt;
      const allWheelPivots = this.busMesh!.getChildren().filter(
        (c) => c.name.startsWith('frontWheel') || c.name.startsWith('rearWheelPivot'),
      );
      for (const pivot of allWheelPivots) {
        const wheelRoot = pivot.getChildren().find((c) => c.name.startsWith('wheelGlbRoot'));
        if (wheelRoot) {
          // Right-side wheels are flipped (rotation.y = PI) so negate roll direction
          const isRight = pivot.name.includes('Right') || pivot.name === 'rearWheelPivot_2';
          const direction = isRight ? -1 : 1;
          (wheelRoot as TransformNode).rotation.x += direction * rollDelta;
        }
      }

      // --- Apply acceleration ---
      if (this.boostTimer > 0) {
        // Boosting: rapidly accelerate to boosted max speed, cannot slow down
        const boostedMax = BUS_MAX_SPEED * SCOOP_BOOST_MULTIPLIER;
        this.busSpeed = Math.min(boostedMax, this.busSpeed + SCOOP_BOOST_ACCELERATION * dt);
      } else if (accelInput > 0) {
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
      this.busSpeed = Math.max(-effectiveMaxSpeed * REVERSE_SPEED_MULTIPLIER, Math.min(effectiveMaxSpeed, this.busSpeed));

      // Tick boost timer and stop exhaust flames when expired
      if (this.boostTimer > 0) {
        this.boostTimer -= dt;
        if (this.boostTimer <= 0) {
          this.boostTimer = 0;
          this.exhaustFlames?.stop();
        }
      }

      // --- Move bus (with drift) ---
      // Velocity direction lags behind heading to create drift when turning
      const absSpeed = Math.abs(this.busSpeed);
      const speedRatio = absSpeed / BUS_MAX_SPEED;
      const busInWater = this.isInWater(this.busPos.x, this.busPos.z);
      const baseGrip = busInWater ? WATER_DRIFT_GRIP : DRIFT_GRIP;
      const grip = baseGrip * (1 - speedRatio * DRIFT_HIGH_SPEED_GRIP_FACTOR);
      let velAngleDiff = this.busYaw - this.busVelAngle;
      // Normalise to [-PI, PI]
      while (velAngleDiff > Math.PI) velAngleDiff -= 2 * Math.PI;
      while (velAngleDiff < -Math.PI) velAngleDiff += 2 * Math.PI;
      this.busVelAngle += velAngleDiff * Math.min(1, grip * dt);

      const forward = new Vector3(Math.sin(this.busVelAngle), 0, Math.cos(this.busVelAngle));
      this.busPos.x += forward.x * this.busSpeed * dt;
      this.busPos.z += forward.z * this.busSpeed * dt;

      // --- Solid-object collisions (push-back) ---
      // Skip ground-level obstacle collisions when bus is significantly above terrain
      const preCollGroundY = this.getGroundY(this.busPos.x, this.busPos.z);
      const aboveGround = this.busPos.y - preCollGroundY;
      if (!this.busAirborne || aboveGround < BUS_AIRBORNE_COLLISION_CLEARANCE) {
        this.resolveCollisions();
      }

      // Follow terrain height / airborne physics
      groundY = this.getGroundY(this.busPos.x, this.busPos.z);

      // If over water, float on the surface with a gentle bob instead of driving on the lake bed
      const waterSurfY = this.getWaterSurfaceY(this.busPos.x, this.busPos.z);
      if (waterSurfY !== null) {
        this.waterBobPhase += WATER_BOB_SPEED * dt;
        const bob = Math.sin(this.waterBobPhase) * WATER_BOB_AMPLITUDE;
        groundY = waterSurfY + bob - WATER_SINK;
      }
      this.waterWakeActive = setWaterWakeActive(this.waterWake, this.waterWakeActive, waterSurfY !== null && !this.busAirborne);
      updateWakeIntensity(this.waterWake, this.waterWakeActive, this.busSpeed);

      // Compute slope pitch from terrain height a short distance ahead vs behind
      const headingDir = new Vector3(Math.sin(this.busYaw), 0, Math.cos(this.busYaw));
      const slopeProbe = 2.0; // metres to sample ahead/behind
      let hAhead = this.getGroundY(
        this.busPos.x + headingDir.x * slopeProbe,
        this.busPos.z + headingDir.z * slopeProbe,
      );
      let hBehind = this.getGroundY(
        this.busPos.x - headingDir.x * slopeProbe,
        this.busPos.z - headingDir.z * slopeProbe,
      );
      // Flatten pitch probes when on water so bus stays level
      if (waterSurfY !== null) {
        hAhead = groundY;
        hBehind = groundY;
      }
      const targetPitch = Math.atan2(hAhead - hBehind, slopeProbe * 2);

      // Apply downhill acceleration boost when going downhill
      if (targetPitch < BUS_DOWNHILL_SLOPE_THRESHOLD && this.busSpeed > 0) {
        this.busSpeed += BUS_DOWNHILL_ACCEL_BOOST * dt;
      }

      // Apply uphill drag (proportional to slope steepness) — gentler than full friction
      if (targetPitch > 0.01 && this.busSpeed > 0 && !this.busAirborne && this.boostTimer <= 0) {
        const uphillFactor = Math.min(targetPitch / 0.3, 1); // 0→1 as slope goes from flat to ~17°
        this.busSpeed = Math.max(0, this.busSpeed - BUS_UPHILL_DRAG * uphillFactor * dt);
      }

      if (this.busAirborne) {
        // --- Airborne: full projectile physics ---
        // Gravity only affects vertical velocity; horizontal speed is fully preserved
        this.busVelY -= BUS_GRAVITY * dt;
        this.busPos.y += this.busVelY * dt;

        // Smoothly tilt pitch toward the arc of flight (nose follows trajectory)
        const speedXZ = Math.abs(this.busSpeed);
        const flightPitch = speedXZ > 0.5 ? Math.atan2(this.busVelY, speedXZ) : 0;
        this.busPitch += (flightPitch - this.busPitch) * Math.min(1, BUS_AIRBORNE_PITCH_LERP * dt);

        // Check landing
        if (this.busPos.y <= groundY) {
          this.busPos.y = groundY;

          // --- Landing impact: lose a fraction of speed based on how hard the landing was ---
          const impactVelY = Math.abs(this.busVelY); // downward speed at moment of landing
          const penaltyFraction = Math.min(
            BUS_LANDING_IMPACT_MAX_PENALTY,
            impactVelY * BUS_LANDING_IMPACT_SPEED_PENALTY,
          );
          this.busSpeed *= (1 - penaltyFraction);

          this.busVelY = 0;
          this.busAirborne = false;
        }
      } else {
        // --- On the ground: detect launches ---
        const absSpeed = Math.abs(this.busSpeed);

        // 1) Cliff / terrain-drop launch: ground has fallen away beneath the bus
        //    Compare current ground height to where the bus actually is.
        //    If terrain dropped sharply and bus is now above it, launch into the air.
        let launched = false;
        const groundDrop = this.prevGroundY - groundY; // positive when terrain drops
        if (absSpeed > 2 && groundDrop > BUS_CLIFF_SEPARATION_THRESHOLD) {
          // Bus was on ground last frame at prevGroundY, ground is now lower.
          // Carry velocity from the slope we were on as vertical momentum.
          const slopeVelY = Math.sin(this.prevSlopePitch) * absSpeed;
          this.busVelY = Math.max(slopeVelY, 0); // at minimum, zero (don't fling downward)
          this.busVelY = Math.max(this.busVelY, BUS_LAUNCH_VEL_MIN);
          this.busVelY = Math.min(this.busVelY, BUS_LAUNCH_VEL_CAP);
          this.busPos.y = this.prevGroundY; // keep bus at the edge height, don't snap down
          this.busAirborne = true;
          launched = true;
        }

        // 2) Crest launch: slope was going up, now levelling/going down
        if (!launched) {
          const pitchDrop = this.prevSlopePitch - targetPitch;
          if (pitchDrop > BUS_JUMP_PITCH_THRESHOLD && absSpeed > 4 && this.prevSlopePitch > 0.03) {
            // Launch velocity based on forward speed and slope steepness
            this.busVelY = Math.sin(this.prevSlopePitch) * absSpeed * 0.7;
            this.busVelY = Math.max(this.busVelY, BUS_LAUNCH_VEL_MIN);
            this.busVelY = Math.min(this.busVelY, BUS_LAUNCH_VEL_CAP);
            this.busAirborne = true;
            launched = true;
          }
        }

        if (!launched) {
          this.busPos.y = groundY; // snap to ground
        }
      }

      this.prevGroundY = groundY;
      this.prevSlopePitch = targetPitch;

      // Smooth the pitch so it doesn't jitter (only when grounded — airborne pitch handled above)
      if (!this.busAirborne) {
        this.busPitch += (targetPitch - this.busPitch) * Math.min(1, 6 * dt);
      }

      // --- Apply collision-induced yaw rate (spin from off-centre hits) ---
      if (this.busYawRate !== 0) {
        const yawState: BusCollisionState = {
          x: this.busPos.x, z: this.busPos.z,
          yaw: this.busYaw, speed: this.busSpeed,
          velAngle: this.busVelAngle, yawRate: this.busYawRate,
        };
        applyBusYawRate(yawState, dt);
        this.busYaw = yawState.yaw;
        this.busYawRate = yawState.yawRate;
      }

      this.distanceTravelled += Math.abs(this.busSpeed) * dt;

      // --- Update bus mesh transform ---
      if (this.busMesh) {
        this.busMesh.setEnabled(true);
        this.busMesh.position.copyFrom(this.busPos);
        this.busMesh.rotation.y = this.busYaw;
        this.busMesh.rotation.x = -this.busPitch; // negative to tilt forward when going uphill
      }

      // Apply engine vibration to body shell (everything except wheels)
      if (this.busBodyShell) {
        this.busBodyShell.position.y = engineVibeOffset;
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

      this.tryScoopRemoteRunnerPlayersByLocalBus();
    }

    // --- Third-person chase camera ---
    this.updateChaseCam(dt);

    // --- Boost visual effects (after camera so shake offsets final position) ---
    this.boostEffectsElapsed += dt;
    const boostIntensity = Math.abs(this.busSpeed) > BUS_MAX_SPEED
      ? Math.min(1, (Math.abs(this.busSpeed) - BUS_MAX_SPEED) / (BUS_MAX_SPEED * (SCOOP_BOOST_MULTIPLIER - 1) * 0.5))
      : 0; // effects only when above base max speed
    this.boostEffects?.update(dt, boostIntensity, this.boostEffectsElapsed);

    // Callbacks
    this.callbacks.onSpeedChange(Math.abs(this.busSpeed) * 3.6); // m/s → km/h
    this.callbacks.onDistanceChange(this.distanceTravelled);
    this.callbacks.onAltitudeChange(groundY);

    // Gate checkpoint tracking
    const newGateIdx = checkGatePass(this.gatePositions, this.currentGateIdx, this.busPos.x, this.busPos.z);
    if (newGateIdx > this.currentGateIdx) {
      this.currentGateIdx = newGateIdx;
      this.callbacks.onGatePass?.(this.currentGateIdx, this.gatePositions.length);
      this.updateGateFlag();
    }

    // Broadcast race position
    if (this.callbacks.onPositionChange) {
      const pos = this.getRacePosition();
      this.callbacks.onPositionChange(pos.position, pos.total);
    }

    this.powerUpSystem?.tryCollect(
      this.busPos.x,
      this.busPos.z,
      this.localPlayerRole === 'runner' ? RUNNER_COLLISION_RADIUS : BUS_COLLISION_RADIUS,
    );

    // Check for finish (all gates cleared) — skip for bus mode (timer-based)
    if (this.gameType !== 'single-bus-mode' && this.currentGateIdx >= this.gatePositions.length && this.raceState === 'racing') {
      this.raceState = 'finished';
      if (this.finishFlagRoot) this.finishFlagRoot.setEnabled(false);
      this.callbacks.onRaceStateChange?.('finished');
      this.callbacks.onFinish?.(this.raceTimer);
    }

    // Update 3D direction arrow
    this.updateDirectionArrow(dt);

    // Update runners
    const runnerResult3 = updateRunnersSystem({
      scene: this.scene,
      runners: this.runners,
      pathPositions: this.pathPositions,
      getGroundY: (x, z) => this.getGroundY(x, z),
      busPos: this.busPos,
      busYaw: this.busYaw,
      busPitch: this.busPitch,
      busSpeed: this.busSpeed,
      localPlayerRole: this.localPlayerRole,
      localPlayerIndex: this.localPlayerIndex,
      solidObstacles: this.solidObstacles,
      elasticObjects: this.elasticObjects,
      remotePlayers: this.remotePlayers,
      buildingColliders: this.buildingColliders,
      engineVibeOffset,
      localMultiplayer: this.localMultiplayer,
    }, dt);
    this.pendingScoopEvents.push(...runnerResult3.scoopEvents);
    if (runnerResult3.triggerScoopAnim) this.scoopAnimTimer = SCOOP_ANIM_DURATION;
    if (runnerResult3.boostTimerAdd > 0) this.boostTimer += runnerResult3.boostTimerAdd;
    if (runnerResult3.startExhaust && this.exhaustFlames && !this.exhaustFlames.isStarted()) {
      this.exhaustFlames.start();
    }
    for (let _i = 0; _i < runnerResult3.scoopCount; _i++) {
      this.callbacks.onScoopRunner();
    }

    // Update runner social interactions (wave / high-five)
    {
      const isRunner = this.localPlayerRole === 'runner';
      const canInteract = isRunner
        && this.localRunnerScoopState === 'free'
        && !this.busAirborne
        && Math.abs(this.busSpeed) > 0.3;

      this.playerInteraction.x = this.busPos.x;
      this.playerInteraction.z = this.busPos.z;
      this.playerInteraction.yaw = this.busYaw;
      this.playerInteraction.speed = this.busSpeed;
      this.playerInteraction.canInteract = canInteract;

      updateRunnerInteractions(
        this.runners,
        isRunner ? this.playerInteraction : null,
        dt,
      );

      // Apply interaction pose to the local player runner (override after normal pose)
      if (isRunner && this.localRunnerModel && this.playerInteraction.interaction !== 'none') {
        const pi = this.playerInteraction;
        const totalDur = pi.interaction === 'highfive' ? HIGH_FIVE_DURATION : WAVE_DURATION;
        const t = 1 - pi.interactionTimer / totalDur;
        if (pi.interaction === 'waving') {
          poseWaving(this.localRunnerModel, this.localRunnerAnimPhase, t, pi.interactionSide);
        } else {
          poseHighFive(this.localRunnerModel, t, pi.interactionSide);
        }
      }
    }

    // Update marshals
    updateMarshals(this.marshals, dt);

    // Update elastic object tilt physics
    updateElasticObjects(this.elasticObjects, dt);

    // Update geese AI and scooping
    if (this.geese.length > 0) {
      updateGeeseSystem({
        scene: this.scene,
        geese: this.geese,
        getGroundY: (x, z) => this.getGroundY(x, z),
        busPos: this.busPos,
        busYaw: this.busYaw,
        busSpeed: this.busSpeed,
        localPlayerRole: this.localPlayerRole,
        solidObstacles: this.solidObstacles,
        buildingColliders: this.buildingColliders,
        waterZones: this.waterZones,
      }, dt);
    }

    // Update deer AI and scooping
    if (this.deer.length > 0) {
      updateDeerSystem({
        scene: this.scene,
        deer: this.deer,
        getGroundY: (x, z) => this.getGroundY(x, z),
        busPos: this.busPos,
        busYaw: this.busYaw,
        busSpeed: this.busSpeed,
        localPlayerRole: this.localPlayerRole,
        solidObstacles: this.solidObstacles,
        buildingColliders: this.buildingColliders,
        waterZones: this.waterZones,
      }, dt);
    }

    // Update scooped objects (benches etc. flying through the air)
    for (let i = this.scoopedObjects.length - 1; i >= 0; i--) {
      const obj = this.scoopedObjects[i];
      const pos = obj.root.position;
      if (obj.state === 'launched') {
        obj.velY -= GRAVITY * dt;
        pos.x += obj.velX * dt;
        pos.y += obj.velY * dt;
        pos.z += obj.velZ * dt;
        obj.root.rotation.x += 6 * dt;
        obj.root.rotation.z += 4 * dt;
        const groundY = this.getGroundY(pos.x, pos.z);
        if (pos.y <= groundY && obj.velY < 0) {
          pos.y = groundY;
          obj.state = 'landed';
          obj.landedTimer = 5;
          obj.root.rotation.x = 0;
          obj.root.rotation.z = 0;
        }
      } else {
        obj.landedTimer -= dt;
        if (obj.landedTimer <= 0) {
          // Restore obstacle so it can be scooped again
          if (obj.obstacleIndex >= 0) {
            const obs = this.solidObstacles[obj.obstacleIndex];
            if (obs) {
              obs.radius = 0.8;
              obs.x = pos.x;
              obs.z = pos.z;
            }
          }
          this.scoopedObjects.splice(i, 1);
        }
      }
    }

    // --- Bus Mode: update passenger system ---
    if (this.passengerSystem && this.raceState === 'racing') {
      const pResult = this.passengerSystem.update(dt, this.busPos, this.busYaw, this.busSpeed, engineVibeOffset, this.busPitch);
      if (pResult.triggerScoopAnim) this.scoopAnimTimer = SCOOP_ANIM_DURATION;
      if (pResult.boostTimerAdd > 0) this.boostTimer += pResult.boostTimerAdd;
      if (pResult.triggerScoopAnim && this.exhaustFlames && !this.exhaustFlames.isStarted()) {
        this.exhaustFlames.start();
      }
    }

    // --- Update remote bus meshes (multiplayer interpolation) ---
    this.updateRemoteBusMeshes(dt, engineVibeOffset);
    if (this.localMultiplayer) {
      this.updateP2(dt);
      this.updateP2Camera(dt);
    }
    this.updateBuildingLodForPlayer();
    this.updateDistanceCulling();
    this.updateInsetCenter?.(this.viewCenter.x, this.viewCenter.z);

    // --- Proximity-based game sounds ---
    {
      const listener = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
      const busSources: BusSoundSource[] = [
        { x: this.busPos.x, y: this.busPos.y, z: this.busPos.z, speed: this.busSpeed, slope: this.busPitch },
      ];
      for (const [, remote] of this.remotePlayers) {
        if (remote.state) {
          busSources.push({ x: remote.smoothPos.x, y: remote.smoothPos.y, z: remote.smoothPos.z, speed: remote.state.speed, slope: remote.smoothPitch });
        }
      }
      const goosePositions = this.geese.map(g => ({ x: g.x, z: g.z }));
      updateGameSounds(listener, busSources, goosePositions);
    }

    // Minimap
    if (this.minimap) {
      this.minimap.draw(
        this.busPos.x,
        this.busPos.z,
        this.busYaw,
        this.buildMinimapPlayers(),
        this.passengerSystem ? undefined : this.getMinimapLookaheadAnchor(),
        this.passengerSystem?.getMinimapDots(),
        this.passengerSystem?.getMinimapFlags(),
      );
    }
    this.drawP2Minimap();
  }
}
