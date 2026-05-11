import type { Color3, Mesh, ParticleSystem, SpotLight, TransformNode, Vector3 } from '@babylonjs/core';
import type { LevelData } from '../levels';
import type { PlayerState } from '../multiplayer';
import type { MarshalModelResult } from './objects/MarshalModel';
import type { RunnerModelResult } from './objects/RunnerModel';
import type { PowerUpId } from './systems/powerups';

export type GameMode = 'SCOOP_THEN_RUN' | 'SCOOP_THEN_RIDE';
export type RaceState = 'countdown' | 'racing' | 'finished';

export interface GameCallbacks {
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
  onPositionChange?: (position: number, total: number) => void;
  onPowerUpDisplayChange?: (powerUp: PowerUpId | null, rolling: boolean) => void;
  // Bus Mode callbacks
  onBusModeTimer?: (remaining: number) => void;
  onBusModeDelivery?: (count: number) => void;
  onBusModeBonus?: (seconds: number) => void;
  onBusModeGameOver?: (deliveries: number) => void;
  // Local multiplayer P2 callbacks
  onP2Finish?: (timeSeconds: number) => void;
  onP2ScoopRunner?: () => void;
  onP2CourseProgress?: (coveredKm: number, totalKm: number) => void;
}

export type RunnerInteraction = 'none' | 'waving' | 'highfive';

export interface Runner {
  mesh: Mesh;
  model: RunnerModelResult;
  targetIdx: number;
  speed: number;
  state: 'running' | 'launched' | 'landed' | 'sitting' | 'riding';
  velX: number;
  velY: number;
  velZ: number;
  fadeTimer: number;
  animPhase: number;
  lateralOffset: number;
  ridingOffsetX: number;
  ridingOffsetZ: number;
  ridingYawOffset: number;
  escapeDir: number;
  /** Whether the runner is currently in escape mode (fleeing off the path) */
  escaping: boolean;
  ownerPlayerIndex: number;
  tshirtColor: Color3;
  riderModelCreated?: boolean; // tracks if rider model has been created (for SCOOP_THEN_RIDE)
  /** Current social interaction state (wave / high-five) */
  interaction: RunnerInteraction;
  /** Countdown timer for the current interaction animation */
  interactionTimer: number;
  /** Which side the interaction partner is on (-1 = left, 1 = right) */
  interactionSide: number;
}

export interface Marshal {
  model: MarshalModelResult;
  animPhase: number;
}

export interface RemotePlayer {
  mesh: TransformNode;
  bodyShell: TransformNode;
  scoopPivot: TransformNode;
  scoopAnimTimer: number;
  state: PlayerState | null;
  smoothPos: Vector3;
  smoothYaw: number;
  smoothPitch: number;
  playerIndex: number;
  exhaustFlames: ParticleSystem | null;
  riderModels: RunnerModelResult[];
  riderAnchors: Mesh[];
  runnerModel: RunnerModelResult | null;
  runnerAnimPhase: number;
  headlight: SpotLight | null;
  reverseLights: SpotLight[];
}

export type RemotePlayersMap = Map<string, RemotePlayer>;

export interface InitSceneOptions {
  skipBus: boolean;
  skipRunners: boolean;
  skipInput: boolean;
}

export type SpawnMarshalsFn = (level: LevelData) => void;

export type BuildingFootprint = {
  type: 'grey' | 'red' | 'blue' | 'green' | 'yellow' | 'kristineberg';
  height?: number;
  points: [number, number][];
};

export type BuildingCollider = {
  x: number;
  z: number;
  yaw: number;
  halfWidth: number;
  halfDepth: number;
};

export type BridgeCollider = {
  /** World-space centre of the bridge */
  x: number;
  z: number;
  /** Rotation angle so that the bridge's "forward" axis runs between the two endpoints */
  yaw: number;
  /** Half the bridge width (bus width * 1.2 / 2) */
  halfWidth: number;
  /** Half the bridge length (distance between the two endpoints / 2) */
  halfLength: number;
};

export type WaterZone = {
  points: [number, number][];
  y: number;
  isIsland?: boolean;
};

export type SolidObstacle = {
  x: number;
  z: number;
  radius: number;
  elasticIndex?: number;
  /** If true, this object can be scooped into the air by the bus */
  scoopable?: boolean;
};

export type ElasticObject = {
  root: TransformNode;
  tiltX: number;
  tiltZ: number;
  tiltVelX: number;
  tiltVelZ: number;
};

/** A scooped object flying through the air (bench, etc.) */
export interface ScoopedObject {
  root: TransformNode;
  velX: number;
  velY: number;
  velZ: number;
  /** Time remaining before despawn after landing */
  landedTimer: number;
  state: 'launched' | 'landed';
  /** Index into solidObstacles — set to -1 once removed */
  obstacleIndex: number;
}

/** A scoopable object that gets launched into the air on bus impact (ragdolls, doesn't ride). */
export type ScoopableState = 'ground' | 'launched' | 'landed';

export interface Goose {
  model: import('./objects/GooseModel').GooseModelResult;
  mesh: Mesh;
  x: number;
  z: number;
  yaw: number;
  state: 'idle' | 'walking' | 'fleeing' | 'launched' | 'landed';
  velX: number;
  velY: number;
  velZ: number;
  animPhase: number;
  /** Current target position (wander/herd destination) */
  targetX: number;
  targetZ: number;
  /** Timer for idle sitting (seconds remaining) */
  idleTimer: number;
  /** Index of the herd this goose belongs to (-1 = solo) */
  herdId: number;
  /** Timer before the goose despawns after landing */
  landedTimer: number;
}

export interface Deer {
  model: import('./objects/DeerModel').DeerModelResult;
  mesh: Mesh;
  x: number;
  z: number;
  yaw: number;
  state: 'idle' | 'walking' | 'running' | 'fleeing' | 'launched' | 'landed';
  velX: number;
  velY: number;
  velZ: number;
  animPhase: number;
  targetX: number;
  targetZ: number;
  idleTimer: number;
  herdId: number;
  landedTimer: number;
}
