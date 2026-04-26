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
  GroundMesh,
  ParticleSystem,
  SceneLoader,
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
import { createBusModel, tintBusModel, busColorPaletteFromOption, PLAYER_COLORS } from './objects/BusModel';
import type { BusColorPalette } from './objects/BusModel';
import type { CharacterSelection, RunnerAppearance } from './characters';
import { getBusColorById, resolveRunnerAppearance } from './characters';
import { createSky } from './objects/Sky';
import type { IcePatchOverlay } from './PathShader';
import { createTiledPathGroundMaterial } from './PathShaderTiled';
import type { TiledPathGroundMaterial } from './PathShaderTiled';
import { createRunnerModel, poseStanding } from './objects/RunnerModel';
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
  BUS_MAX_SPEED,
  BUS_ROOF_Y,
  BUS_START_OFFSET,
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
  PATH_MASK_RESOLUTION,
  TREE_COUNT,
  RUNNER_COLLISION_RADIUS,
  RUNNER_DOWNHILL_SLOPE_THRESHOLD,
  RUNNER_DOWNHILL_SPEED_BOOST,
  RUNNER_PLAYER_ACCELERATION,
  RUNNER_PLAYER_DECELERATION,
  RUNNER_PLAYER_JUMP_SIDE_VELOCITY,
  RUNNER_PLAYER_MAX_JUMPS,
  RUNNER_PLAYER_SPEED,
  RUNNER_PLAYER_TURN_SPEED,
  RUNNER_JUMP_HEIGHT,
  RUNNER_SIT_DURATION,
  SCOOP_ANIM_DURATION,
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
} from './constants';
import {
  type BuildingCollider,
  type BuildingFootprint,
  type ElasticObject,
  type GameCallbacks,
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
import {
  computeTerrainHeight,
  computeWaterZones,
  buildWaterMeshes,
  computeRoadPolylines,
  computeBuildingFootprintData,
  isInWaterZone,
  getWaterSurfaceYAt,
  getWaterDepressionAt,
} from './systems/terrain';
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
import {
  spawnRunners as spawnRunnersSystem,
  updateRunnersSystem,
  buildLocalRunner as buildLocalRunnerFn,
  updateLocalRunnerVisual as updateLocalRunnerVisualFn,
  packRemoteRiders,
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
  resolvePositionAgainstFence,
  DEFAULT_FENCE_DISTANCE,
  type FenceCollider,
} from './objects/Fence';
import { PowerUpSystem, type PowerUpId } from './systems/powerups';

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
  private busVelAngle = 0; // radians – actual velocity direction (lags behind busYaw for drift)
  private busPos = new Vector3(0, 0, 0); // bus base position (ground level)
  private busVelY = 0; // vertical velocity (m/s) — >0 when airborne going up
  private busAirborne = false; // true while bus is above ground
  private elasticPenaltyActive = false; // true while bus overlaps an elastic object (prevents re-applying penalty)
  private prevSlopePitch = 0; // previous frame's terrain pitch for detecting crests
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

  // Water zones (local XZ polygons + Y level) — set before buildGround
  private waterZones: WaterZone[] = [];
  private roadPolylines: [number, number][][] = [];
  private trailPolylines: [number, number][][] = [];
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

  // Minimap
  private minimap: Minimap | null = null;

  // Pause state
  private paused = false;

  // Demo mode (title screen background)
  private demoMode = false;
  private demoCamProgress = 0; // 0→1 along the path
  private resizeHandler: (() => void) | null = null;
  private mobileLikeDevice = false;
  private effectivePathMaskResolution = PATH_MASK_RESOLUTION;
  private effectiveTreeCount = TREE_COUNT;

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

  // Player runner interaction state (wave / high-five)
  private playerInteraction: PlayerRunnerState = {
    x: 0, z: 0, yaw: 0, speed: 0,
    canInteract: false,
    interaction: 'none',
    interactionTimer: 0,
    interactionSide: 1,
  };

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: GameCallbacks,
    minimapCanvas?: HTMLCanvasElement,
    options?: { localPlayerRole?: 'bus' | 'runner'; gameType?: GameType; items?: boolean; charSelection?: CharacterSelection | null },
  ) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.localPlayerRole = options?.localPlayerRole ?? 'bus';
    this.gameType = options?.gameType ?? 'single-bus';
    this.itemsEnabled = options?.items ?? false;
    this.charSelection = options?.charSelection ?? null;
    if (minimapCanvas) {
      this.minimap = new Minimap(minimapCanvas);
    }
  }

  // ---------- Pause / Resume ----------

  setPaused(p: boolean) { this.paused = p; }
  isPaused() { return this.paused; }

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
    this.powerUpSystem?.dispose();
    this.powerUpSystem = null;
    for (const ps of this.shoeFlames) ps.dispose();
    this.shoeFlames = [];
    for (const emitter of this.shoeFlameEmitters) emitter.dispose();
    this.shoeFlameEmitters = [];
    this.icePatches = [];
    this.setIcePatchesOnGround = null;
    this.updateInsetCenter = null;
    this.engine?.stopRenderLoop();
    this.scene?.dispose();
    this.engine?.dispose();
  }

  // ---------- Remote bus (multiplayer) ----------

  /** Set this client's player index (called before init). */
  setLocalPlayerIndex(idx: number) {
    this.localPlayerIndex = idx;
  }

  /** Build a remote player visuals (bus + runner) for a specific peer with the given player index. */
  async buildRemoteBusForPeer(peerId: string, playerIndex: number, remoteCharSel?: CharacterSelection) {
    if (!this.scene) return;
    // Don't rebuild if already exists
    if (this.remotePlayers.has(peerId)) return;

    const result = await createBusModel(this.scene);

    // Determine bus colour palette from their selection or fallback to index
    let palette: BusColorPalette;
    if (remoteCharSel?.type === 'bus') {
      const opt = getBusColorById(remoteCharSel.busColorId);
      palette = opt ? busColorPaletteFromOption(opt) : (PLAYER_COLORS[playerIndex - 1] ?? PLAYER_COLORS[1]);
    } else {
      palette = PLAYER_COLORS[playerIndex - 1] ?? PLAYER_COLORS[1];
    }
    tintBusModel(result.root, palette, `p${playerIndex}`);

    // Determine runner appearance from their selection or fallback
    const runnerAppearance: RunnerAppearance | undefined =
      remoteCharSel?.type === 'runner'
        ? resolveRunnerAppearance(remoteCharSel.runnerId)
        : undefined;
    const runnerModel = createRunnerModel(this.scene, 200000 + playerIndex, palette.body, runnerAppearance);

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
    });
  }

  /** Remove a remote bus (peer left). */
  removeRemoteBus(peerId: string) {
    const remote = this.remotePlayers.get(peerId);
    if (remote) {
      remote.exhaustFlames?.dispose();
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
        const opt = getBusColorById(state.charSelection.busColorId);
        newPalette = opt ? busColorPaletteFromOption(opt) : (PLAYER_COLORS[state.playerIndex - 1] ?? PLAYER_COLORS[1]);
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
      gameType: this.gameType,
      powerUp: this.powerUpSystem?.getHeldPowerUp() ?? undefined,
      charSelection: this.charSelection ?? undefined,
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
      this.effectivePathMaskResolution = Math.min(PATH_MASK_RESOLUTION, 2048);
      this.effectiveTreeCount = this.demoMode
        ? Math.max(80, Math.floor(TREE_COUNT * 0.08))
        : Math.max(260, Math.floor(TREE_COUNT * 0.35));
      return;
    }

    this.engine.setHardwareScalingLevel(1);
    this.effectivePathMaskResolution = PATH_MASK_RESOLUTION;
    this.effectiveTreeCount = TREE_COUNT;
  }

  private async initScene(
    eventId: string,
    opts: InitSceneOptions,
  ) {
    // Lazy-load full level data (JSON chunks loaded on demand)
    const level: LevelData = await loadLevel(eventId);
    this.level = level;

    const course = level.course;

    // Apply course overrides (section ordering / laps) if available
    const override = COURSE_OVERRIDES[eventId];
    const indices = buildCourseIndices(course.coordinates.length, override);
    const orderedCoords = indices.map((i) => course.coordinates[i]);

    // Elevation: reorder pre-fetched altitude to match ordered coords
    const elevations = indices.map((i) => level.altitude[i] ?? 0);

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
    this.configurePerformanceProfile();
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
    this.waterZones = computeWaterZones(waterFeatures, course.coordinates[0], this.scaleFactor, (x, z) => this.getTerrainHeight(x, z));
    this.roadPolylines = computeRoadPolylines(roadFeatures, course.coordinates[0], this.scaleFactor);
    this.trailPolylines = pathFeatures.map((p) =>
      p.points.map(([lat, lon]): [number, number] => {
        const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
        return [rawX * this.scaleFactor, rawZ * this.scaleFactor];
      }),
    ).filter((t) => t.length >= 2);
    this.buildingFootprints = computeBuildingFootprintData(buildingFeatures, course.coordinates[0], this.scaleFactor);
    this.buildGround();
    buildWaterMeshes(this.scene, this.waterZones);
    const buildingResult = buildBuildingMeshes(this.scene, this.buildingFootprints, (x, z) => this.getGroundY(x, z));
    this.buildingColliders = buildingResult.colliders;
    this.buildingLodEntries = buildingResult.lodEntries;
    this.updateBuildingLodForPlayer();
    if (level.trees !== false) {
      // Convert noTreeZones from GPS [lat, lon] polygons to world-space [x, z] polygons
      const noTreeZones: [number, number][][] = (level.noTreeZones ?? []).map((polygon) =>
        polygon.map(([lat, lon]): [number, number] => {
          const [rawX, rawZ] = gpsPointToLocal(lon, lat, this.originCoord);
          return [rawX * this.scaleFactor, rawZ * this.scaleFactor];
        }),
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
        noTreeZones,
      );
      this.elasticObjects.push(...treeResult.elasticObjects);
      this.solidObstacles.push(...treeResult.solidObstacles);
    }

    // Procedural sky + clouds
    createSky(this.scene);

    if (!opts.skipBus) {
      await this.buildBus();
    }
    if (!this.demoMode && this.localPlayerRole === 'runner') {
      const runnerAppearance = this.charSelection?.type === 'runner'
        ? resolveRunnerAppearance(this.charSelection.runnerId)
        : undefined;
      this.localRunnerModel = buildLocalRunnerFn(this.scene, this.localPlayerIndex, this.busPos, this.busYaw, runnerAppearance);
      if (this.busMesh) {
        this.busMesh.setEnabled(false);
      }
    }
    if (!opts.skipRunners) {
      this.runners = spawnRunnersSystem(this.scene, this.pathPositions, (x, z) => this.getGroundY(x, z));
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
    this.powerUpSystem = new PowerUpSystem({
      scene: this.scene,
      enabled: this.itemsEnabled,
      localPlayerIndex: this.localPlayerIndex,
      onPowerUpDisplayChange: (powerUp, rolling) => this.callbacks.onPowerUpDisplayChange?.(powerUp, rolling),
      pathPositions: this.pathPositions,
      pathCumDist: this.pathCumDist,
      getGroundY: (x, z) => this.getGroundY(x, z),
    });

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
      const totalPlayers = MAX_PLAYERS;
      // Centre the fan: player indices 1..N get offsets centred around 0
      const laneOffset = (this.localPlayerIndex - 1) - (totalPlayers - 1) / 2;
      this.busPos.x = sx - forwardX * BUS_START_OFFSET + rightX * laneOffset * lateralSpacing;
      this.busPos.z = sz - forwardZ * BUS_START_OFFSET + rightZ * laneOffset * lateralSpacing;
      const startH = this.getGroundY(this.busPos.x, this.busPos.z);
      this.busPos.y = startH;
      this.busYaw = yaw;
      this.busVelAngle = yaw;
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
      this.finishedTimer = 0;
      this.keepDrivingMode = false;
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
      this.camera.setTarget(new Vector3(this.busPos.x, this.busPos.y + (this.localPlayerRole === 'runner' ? 1.4 : 2.5), this.busPos.z));
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
    };

    // Use tiled two-level path shader for better performance on weaker devices.
    // Falls back to the original single-texture MixMaterial when tiled shader
    // is not available or not wanted.
    const tiledMat = createTiledPathGroundMaterial(this.scene, shaderOpts);
    ground.material = tiledMat;
    this.setIcePatchesOnGround = tiledMat.__setIcePatches ?? null;
    this.setIcePatchesOnGround?.([]);
    this.updateInsetCenter = tiledMat.__updateInsetCenter ?? null;

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
    return computeTerrainHeight(x, z, this.pathPositions, this.pathHeights);
  }

  // Thin wrappers for extracted terrain/water helpers
  private getTerrainHeight(x: number, z: number): number {
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
    const targetAngle = worldAngle - camYaw;

    // Smoothly interpolate toward target angle via shortest arc
    let delta = targetAngle - this.arrowDisplayAngle;
    // Wrap delta into [-PI, PI] so the arrow takes the short way round
    delta = ((delta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const smoothSpeed = 6; // radians/sec blend rate
    this.arrowDisplayAngle += delta * Math.min(1, smoothSpeed * dt);

    this.directionArrowRotNode.rotation.y = this.arrowDisplayAngle;

    // Gentle bobbing animation (on the position node)
    const bob = Math.sin(performance.now() * 0.003) * 0.12;
    this.directionArrowRoot.position.y = 2.8 + bob;
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
      const opt = getBusColorById(this.charSelection.busColorId);
      palette = opt ? busColorPaletteFromOption(opt) : (PLAYER_COLORS[this.localPlayerIndex - 1] ?? PLAYER_COLORS[0]);
    } else {
      palette = PLAYER_COLORS[this.localPlayerIndex - 1] ?? PLAYER_COLORS[0];
    }
    tintBusModel(this.busMesh, palette, 'local');

    // Store rest position for scoop animation offsets
    (this.scoopPivot as any).__restY = this.scoopPivot.position.y;
    (this.scoopPivot as any).__restZ = this.scoopPivot.position.z;
    this.frontWheelLeft = result.frontWheelLeft;
    this.frontWheelRight = result.frontWheelRight;

    // --- Exhaust flame particle system (initially stopped) ---
    this.exhaustFlames = createExhaustFlames(this.scene, this.busMesh!);

    // --- Water wake particle systems (initially stopped) ---
    this.waterWake = createWaterWake(this.scene, this.busMesh!);
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

        if (obs.elasticIndex != null) {
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
   * Resolve collisions between the local bus and all remote buses.
   * Both are treated as circles with BUS_COLLISION_RADIUS.
   * On overlap the local bus is pushed out and bounced back.
   */
  private resolveBusCollisions() {
    if (this.localPlayerRole === 'runner') return;
    const br = BUS_COLLISION_RADIUS;
    const minDist = br + br; // both buses have the same radius
    for (const [_peerId, remote] of this.remotePlayers) {
      if (!remote.state) continue;
      if (this.getRoleForPlayerIndex(remote.playerIndex, remote.state) !== 'bus') continue;
      const rx = remote.smoothPos.x;
      const rz = remote.smoothPos.z;
      const dx = this.busPos.x - rx;
      const dz = this.busPos.z - rz;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;
        // Push local bus out fully (remote bus position is authoritative)
        this.busPos.x += nx * overlap;
        this.busPos.z += nz * overlap;
        this.busSpeed *= -0.15; // bounce-back
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
    });
  }

  // ---------- Chase Camera ----------

  private updateChaseCam(dt: number) {
    if (this.localPlayerRole === 'runner') {
      updateRunnerCameraSystem({
        dt,
        camera: this.camera,
        runnerYaw: this.busYaw,
        runnerPos: this.busPos,
        getGroundY: (x, z) => this.getGroundY(x, z),
      });
      return;
    }

    this.cameraYawOffset = updateChaseCameraSystem({
      dt,
      camera: this.camera,
      busYaw: this.busYaw,
      busSpeed: this.busSpeed,
      busPos: this.busPos,
      cameraYawOffset: this.cameraYawOffset,
      getGroundY: (x, z) => this.getGroundY(x, z),
    });
  }

  // ---------- Minimap player list builder ----------

  private buildMinimapPlayers() {
    return buildMinimapPlayers({
      remotePlayers: this.remotePlayers,
      localPlayerIndex: this.localPlayerIndex,
      busPos: this.busPos,
      busYaw: this.busYaw,
    });
  }

  private getMinimapLookaheadAnchor(): { x: number; z: number } {
    const gate = this.gatePositions[this.currentGateIdx];
    if (gate) {
      return { x: gate.x, z: gate.z };
    }
    return { x: this.busPos.x, z: this.busPos.z };
  }

  // ---------- Remote bus interpolation ----------

  private updateRemoteBusMeshes(dt: number, engineVibeOffset: number) {
    updateRemotePlayersSystem({
      remotePlayers: this.remotePlayers,
      dt,
      busRoofY: BUS_ROOF_Y,
      engineVibeOffset,
      observerX: this.busPos.x,
      observerZ: this.busPos.z,
    });
  }

  private updateBuildingLodForPlayer() {
    if (this.buildingLodEntries.length === 0) return;
    updateBuildingLod(this.buildingLodEntries, this.busPos.x, this.busPos.z);
  }

  // ---------- Update ----------

  private update(dt: number) {
    // If paused, keep rendering the scene but skip all simulation
    if (this.paused) return;

    // --- Engine vibration (scales with speed, max amplitude at full base speed) ---
    this.engineVibePhase += dt * ENGINE_VIBE_FREQUENCY * Math.PI * 2;
    const speedFraction = Math.min(Math.abs(this.busSpeed) / BUS_MAX_SPEED, 1);
    const engineVibeOffset = Math.sin(this.engineVibePhase) * ENGINE_VIBE_AMPLITUDE * speedFraction;
    this.powerUpSystem?.update(Date.now());
    this.updateRunnerPowerUpEffects(dt);

    const enterHeld = this.isKey('enter');
    if (enterHeld && !this.enterHeldLastFrame) {
      this.useHeldPowerUp();
    }
    this.enterHeldLastFrame = enterHeld;

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
      const runnerResult = updateRunnersSystem({
        scene: this.scene,
        runners: this.runners,
        pathPositions: this.pathPositions,
        getGroundY: (x, z) => this.getGroundY(x, z),
        busPos: this.busPos,
        busYaw: this.busYaw,
        busSpeed: this.busSpeed,
        localPlayerRole: this.localPlayerRole,
        localPlayerIndex: this.localPlayerIndex,
        solidObstacles: this.solidObstacles,
        elasticObjects: this.elasticObjects,
        remotePlayers: this.remotePlayers,
        buildingColliders: this.buildingColliders,
        engineVibeOffset,
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
        this.localRunnerAnimPhase = updateLocalRunnerVisualFn({ model: this.localRunnerModel!, busPos: this.busPos, busYaw: this.busYaw, busSpeed: this.busSpeed * (this.runnerFikaTimer > 0 ? POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER : 1), busAirborne: this.busAirborne, scoopState: this.localRunnerScoopState, runnerJumpSideVel: this.runnerJumpSideVel, getGroundY: (x, z) => this.getGroundY(x, z) }, dt, this.localRunnerAnimPhase);
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
        this.minimap.draw(
          this.busPos.x,
          this.busPos.z,
          this.busYaw,
          this.buildMinimapPlayers(),
          this.getMinimapLookaheadAnchor(),
        );
      }
      this.updateBuildingLodForPlayer();
      this.updateInsetCenter?.(this.busPos.x, this.busPos.z);
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
          this.localRunnerAnimPhase = updateLocalRunnerVisualFn({ model: this.localRunnerModel!, busPos: this.busPos, busYaw: this.busYaw, busSpeed: this.busSpeed * (this.runnerFikaTimer > 0 ? POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER : 1), busAirborne: this.busAirborne, scoopState: this.localRunnerScoopState, runnerJumpSideVel: this.runnerJumpSideVel, getGroundY: (x, z) => this.getGroundY(x, z) }, dt, this.localRunnerAnimPhase);
        }

        this.updateChaseCam(dt);
        const runnerResult2 = updateRunnersSystem({
          scene: this.scene,
          runners: this.runners,
          pathPositions: this.pathPositions,
          getGroundY: (x, z) => this.getGroundY(x, z),
          busPos: this.busPos,
          busYaw: this.busYaw,
          busSpeed: this.busSpeed,
          localPlayerRole: this.localPlayerRole,
          localPlayerIndex: this.localPlayerIndex,
          solidObstacles: this.solidObstacles,
          elasticObjects: this.elasticObjects,
          remotePlayers: this.remotePlayers,
          buildingColliders: this.buildingColliders,
          engineVibeOffset,
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
        this.updateInsetCenter?.(this.busPos.x, this.busPos.z);
        if (this.minimap) {
          this.minimap.draw(
            this.busPos.x,
            this.busPos.z,
            this.busYaw,
            this.buildMinimapPlayers(),
            this.getMinimapLookaheadAnchor(),
          );
        }
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
        this.localRunnerAnimPhase = updateLocalRunnerVisualFn({ model: this.localRunnerModel!, busPos: this.busPos, busYaw: this.busYaw, busSpeed: this.busSpeed * (this.runnerFikaTimer > 0 ? POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER : 1), busAirborne: this.busAirborne, scoopState: this.localRunnerScoopState, runnerJumpSideVel: this.runnerJumpSideVel, getGroundY: (x, z) => this.getGroundY(x, z) }, dt, this.localRunnerAnimPhase);
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
      
      const maxReverse = this.runnerShoeTimer > 0 ? 0 : RUNNER_PLAYER_SPEED * 0.45;
      this.busSpeed = Math.max(-maxReverse, Math.min(RUNNER_PLAYER_SPEED * playerSpeedMultiplier * totalRunnerSpeedBoost, this.busSpeed));

      const jumpHeld = this.isKey(' ') || this.isKey('space') || this.isKey('spacebar');
      const jumpPressed = jumpHeld && !this.jumpHeldLastFrame;
      this.jumpHeldLastFrame = jumpHeld;
      if (jumpPressed && this.runnerJumpsUsed < RUNNER_PLAYER_MAX_JUMPS) {
        this.busAirborne = true;
        this.runnerJumpsUsed += 1;
        this.busVelY = Math.sqrt(2 * GRAVITY * RUNNER_JUMP_HEIGHT);
        const leftHeld = this.isKey('a') || this.isKey('arrowleft');
        const rightHeld = this.isKey('d') || this.isKey('arrowright');
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
      this.localRunnerAnimPhase = updateLocalRunnerVisualFn({ model: this.localRunnerModel!, busPos: this.busPos, busYaw: this.busYaw, busSpeed: this.busSpeed * (this.runnerFikaTimer > 0 ? POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER : 1), busAirborne: this.busAirborne, scoopState: this.localRunnerScoopState, runnerJumpSideVel: this.runnerJumpSideVel, getGroundY: (x, z) => this.getGroundY(x, z) }, dt, this.localRunnerAnimPhase);
      }
    } else {
      // --- Space = manual scoop animation (bus mode) ---
      const scoopKeyHeld = this.isKey(' ') || this.isKey('space') || this.isKey('spacebar');
      if (scoopKeyHeld && this.scoopAnimTimer <= 0) {
        this.scoopAnimTimer = SCOOP_ANIM_DURATION;
      }

      if (turnInput !== 0 && Math.abs(this.busSpeed) > 0.5) {
        this.busYaw += turnInput * BUS_TURN_SPEED * dt;
      } else if (turnInput !== 0 && accelInput !== 0 && Math.abs(this.busSpeed) <= 0.5) {
        // Slow rotation at standstill when player is pressing forward/reverse + turn
        this.busYaw += turnInput * BUS_TURN_SPEED_STANDSTILL * dt;
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
      this.resolveCollisions();

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

    // Callbacks
    this.callbacks.onSpeedChange(Math.abs(this.busSpeed) * 3.6); // m/s → km/h
    this.callbacks.onDistanceChange(this.distanceTravelled);
    this.callbacks.onAltitudeChange(groundY);

    // Gate checkpoint tracking
    const newGateIdx = checkGatePass(this.gatePositions, this.currentGateIdx, this.busPos.x, this.busPos.z);
    if (newGateIdx > this.currentGateIdx) {
      this.currentGateIdx = newGateIdx;
      this.callbacks.onGatePass?.(this.currentGateIdx, this.gatePositions.length);
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

    // Check for finish (all gates cleared)
    if (this.currentGateIdx >= this.gatePositions.length && this.raceState === 'racing') {
      this.raceState = 'finished';
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
      busSpeed: this.busSpeed,
      localPlayerRole: this.localPlayerRole,
      localPlayerIndex: this.localPlayerIndex,
      solidObstacles: this.solidObstacles,
      elasticObjects: this.elasticObjects,
      remotePlayers: this.remotePlayers,
      buildingColliders: this.buildingColliders,
      engineVibeOffset,
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

    // --- Update remote bus meshes (multiplayer interpolation) ---
    this.updateRemoteBusMeshes(dt, engineVibeOffset);
    this.updateBuildingLodForPlayer();
    this.updateInsetCenter?.(this.busPos.x, this.busPos.z);

    // Minimap
    if (this.minimap) {
      this.minimap.draw(
        this.busPos.x,
        this.busPos.z,
        this.busYaw,
        this.buildMinimapPlayers(),
        this.getMinimapLookaheadAnchor(),
      );
    }
  }
}
