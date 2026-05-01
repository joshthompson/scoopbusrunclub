import type { Color3, Mesh, ParticleSystem, TransformNode, Vector3 } from '@babylonjs/core';
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
  escapeDir: number;
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

export type WaterZone = {
  points: [number, number][];
  y: number;
};

export type SolidObstacle = {
  x: number;
  z: number;
  radius: number;
  elasticIndex?: number;
};

export type ElasticObject = {
  root: TransformNode;
  tiltX: number;
  tiltZ: number;
  tiltVelX: number;
  tiltVelZ: number;
};
