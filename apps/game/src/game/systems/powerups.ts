import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
} from '@babylonjs/core';
import parkrunTextureUrl from '../../assets/parkrun.jpg?url';
import type { ItemCollectEvent } from '../../multiplayer';
import {
  POWER_UP_ITEM_RESPAWN_SECONDS,
  POWER_UP_ITEM_SPACING,
  POWER_UP_MIN_TOKEN_SPACING_METRES,
  POWER_UP_ROLL_DURATION_MS,
  POWER_UP_ROLL_STEP_MS,
  POWER_UP_START_EXCLUSION_METRES,
  POWER_UP_TOKEN_FLOAT_AMPLITUDE,
  POWER_UP_TOKEN_FLOAT_HEIGHT,
  POWER_UP_TOKEN_FLOAT_SPEED,
  POWER_UP_TOKEN_PICKUP_RADIUS,
  POWER_UP_TOKEN_RADIUS,
} from '../constants';

export const POWER_UP_IDS = ['fika', 'fire', 'ice', 'mallet', 'shoe'] as const;
export type PowerUpId = (typeof POWER_UP_IDS)[number];

type TrackToken = {
  id: number;
  mesh: Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  phaseOffset: number;
  collectedUntilMs: number;
  lastCollectedAtMs: number;
};

function samplePathAtDistance(
  pathPositions: [number, number][],
  pathCumDist: number[],
  dist: number,
): { x: number; z: number } | null {
  if (pathPositions.length < 2 || pathCumDist.length < 2) return null;
  const total = pathCumDist[pathCumDist.length - 1];
  if (dist <= 0 || dist >= total) return null;

  let segIdx = 0;
  for (let i = 1; i < pathCumDist.length; i++) {
    if (pathCumDist[i] >= dist) {
      segIdx = i - 1;
      break;
    }
  }

  const segLen = pathCumDist[segIdx + 1] - pathCumDist[segIdx];
  const t = segLen > 0 ? (dist - pathCumDist[segIdx]) / segLen : 0;
  const [ax, az] = pathPositions[segIdx];
  const [bx, bz] = pathPositions[segIdx + 1];

  return {
    x: ax + t * (bx - ax),
    z: az + t * (bz - az),
  };
}

export class PowerUpSystem {
  private enabled = false;
  private localPlayerIndex = 1;
  private tokens: TrackToken[] = [];
  private pendingCollectEvents: ItemCollectEvent[] = [];
  private tokenMaterial: StandardMaterial | null = null;
  private heldPowerUp: PowerUpId | null = null;
  private rollingPowerUp = false;
  private rollingDisplay: PowerUpId | null = null;
  private selectedPowerUp: PowerUpId | null = null;
  private rollEndsAtMs = 0;
  private nextRollStepAtMs = 0;
  private rollStepIndex = 0;
  private onPowerUpDisplayChange?: (powerUp: PowerUpId | null, rolling: boolean) => void;

  constructor(opts: {
    scene: Scene;
    enabled: boolean;
    localPlayerIndex: number;
    onPowerUpDisplayChange?: (powerUp: PowerUpId | null, rolling: boolean) => void;
    pathPositions: [number, number][];
    pathCumDist: number[];
    getGroundY: (x: number, z: number) => number;
  }) {
    this.enabled = opts.enabled;
    this.localPlayerIndex = opts.localPlayerIndex;
    this.onPowerUpDisplayChange = opts.onPowerUpDisplayChange;
    if (!this.enabled || opts.pathPositions.length < 2) return;

    const mat = new StandardMaterial('powerUpTokenMat', opts.scene);
    const texture = new Texture(parkrunTextureUrl, opts.scene, true, false);
    mat.diffuseTexture = texture;
    mat.emissiveColor = Color3.White();
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    this.tokenMaterial = mat;

    const totalDist = opts.pathCumDist[opts.pathCumDist.length - 1] ?? 0;
    const minSpacingSq = POWER_UP_MIN_TOKEN_SPACING_METRES * POWER_UP_MIN_TOKEN_SPACING_METRES;
    const startX = opts.pathPositions[0][0];
    const startZ = opts.pathPositions[0][1];
    const startExclusionSq = POWER_UP_START_EXCLUSION_METRES * POWER_UP_START_EXCLUSION_METRES;

    let tokenId = 0;
    for (let dist = POWER_UP_ITEM_SPACING; dist < totalDist; dist += POWER_UP_ITEM_SPACING) {
      const sample = samplePathAtDistance(opts.pathPositions, opts.pathCumDist, dist);
      if (!sample) continue;

      const toStartX = sample.x - startX;
      const toStartZ = sample.z - startZ;
      if (toStartX * toStartX + toStartZ * toStartZ < startExclusionSq) continue;

      let tooClose = false;
      for (const token of this.tokens) {
        const dx = token.baseX - sample.x;
        const dz = token.baseZ - sample.z;
        if (dx * dx + dz * dz < minSpacingSq) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const y = opts.getGroundY(sample.x, sample.z) + POWER_UP_TOKEN_FLOAT_HEIGHT;
      const mesh = MeshBuilder.CreateDisc(
        `powerUpToken_${tokenId}`,
        { radius: POWER_UP_TOKEN_RADIUS, tessellation: 32, sideOrientation: Mesh.DOUBLESIDE },
        opts.scene,
      );
      mesh.material = mat;
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.position.set(sample.x, y, sample.z);

      this.tokens.push({
        id: tokenId,
        mesh,
        baseX: sample.x,
        baseY: y,
        baseZ: sample.z,
        phaseOffset: Math.random() * Math.PI * 2,
        collectedUntilMs: 0,
        lastCollectedAtMs: 0,
      });
      tokenId += 1;
    }
  }

  update(nowMs: number) {
    this.updatePowerUpRoll(nowMs);
    if (!this.enabled || this.tokens.length === 0) return;
    const t = nowMs / 1000;
    for (const token of this.tokens) {
      const available = nowMs >= token.collectedUntilMs;
      token.mesh.setEnabled(available);
      if (!available) continue;

      token.mesh.position.x = token.baseX;
      token.mesh.position.z = token.baseZ;
      token.mesh.position.y = token.baseY + Math.sin(t * POWER_UP_TOKEN_FLOAT_SPEED + token.phaseOffset) * POWER_UP_TOKEN_FLOAT_AMPLITUDE;
    }
  }

  tryCollect(localX: number, localZ: number, collectorRadius: number) {
    if (!this.enabled || this.tokens.length === 0) return;
    if (this.rollingPowerUp || this.heldPowerUp) return;
    const nowMs = Date.now();
    const pickupRadius = collectorRadius + POWER_UP_TOKEN_PICKUP_RADIUS;
    const pickupRadiusSq = pickupRadius * pickupRadius;

    for (const token of this.tokens) {
      if (nowMs < token.collectedUntilMs) continue;

      const dx = token.baseX - localX;
      const dz = token.baseZ - localZ;
      if (dx * dx + dz * dz > pickupRadiusSq) continue;

      const collectedAtMs = nowMs;
      const respawnAtMs = collectedAtMs + POWER_UP_ITEM_RESPAWN_SECONDS * 1000;
      this.applyCollectEvent({
        itemId: token.id,
        playerIndex: this.localPlayerIndex,
        collectedAtMs,
        respawnAtMs,
      }, true);
      this.startPowerUpRoll(collectedAtMs);
      break;
    }
  }

  private startPowerUpRoll(nowMs: number) {
    if (this.rollingPowerUp || this.heldPowerUp) return;
    this.selectedPowerUp = POWER_UP_IDS[Math.floor(Math.random() * POWER_UP_IDS.length)];
    this.rollingPowerUp = true;
    this.rollEndsAtMs = nowMs + POWER_UP_ROLL_DURATION_MS;
    this.nextRollStepAtMs = nowMs;
    this.rollStepIndex = 0;
  }

  private updatePowerUpRoll(nowMs: number) {
    if (!this.rollingPowerUp) return;

    while (nowMs >= this.nextRollStepAtMs) {
      const next = POWER_UP_IDS[this.rollStepIndex % POWER_UP_IDS.length];
      this.rollingDisplay = next;
      this.onPowerUpDisplayChange?.(this.rollingDisplay, true);
      this.rollStepIndex += 1;
      this.nextRollStepAtMs += POWER_UP_ROLL_STEP_MS;
    }

    if (nowMs >= this.rollEndsAtMs) {
      this.rollingPowerUp = false;
      this.heldPowerUp = this.selectedPowerUp;
      this.rollingDisplay = this.heldPowerUp;
      this.selectedPowerUp = null;
      this.onPowerUpDisplayChange?.(this.heldPowerUp, false);
    }
  }

  getHeldPowerUp(): PowerUpId | null {
    return this.heldPowerUp;
  }

  hasPowerUp(): boolean {
    return this.heldPowerUp !== null || this.rollingPowerUp;
  }

  consumeHeldPowerUp(): PowerUpId | null {
    if (this.rollingPowerUp || !this.heldPowerUp) return null;
    const powerUp = this.heldPowerUp;
    this.heldPowerUp = null;
    this.rollingDisplay = null;
    this.onPowerUpDisplayChange?.(null, false);
    return powerUp;
  }

  applyCollectEvent(evt: ItemCollectEvent, queueForBroadcast = false) {
    const token = this.tokens[evt.itemId];
    if (!token) return;
    if (evt.collectedAtMs < token.lastCollectedAtMs) return;

    token.lastCollectedAtMs = evt.collectedAtMs;
    token.collectedUntilMs = evt.respawnAtMs;
    token.mesh.setEnabled(false);

    if (queueForBroadcast) {
      this.pendingCollectEvents.push(evt);
    }
  }

  flushCollectEvents(): ItemCollectEvent[] {
    const events = this.pendingCollectEvents;
    this.pendingCollectEvents = [];
    return events;
  }

  dispose() {
    for (const token of this.tokens) token.mesh.dispose();
    this.tokens = [];
    this.pendingCollectEvents = [];
    this.heldPowerUp = null;
    this.rollingPowerUp = false;
    this.rollingDisplay = null;
    this.selectedPowerUp = null;
    this.tokenMaterial?.dispose();
    this.tokenMaterial = null;
  }
}
