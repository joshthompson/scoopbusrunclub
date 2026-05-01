/**
 * Passenger system for Bus Mode.
 *
 * Passengers are NPC runners that stand at random points along the path/road/course
 * doing a cheering animation. Each one has a target delivery location
 * 250–750 m away along the path.
 *
 * When the bus drives close to a waiting passenger they are scooped onto
 * the roof. A coloured flag appears on the minimap at their target. Drive
 * to the flag → +15 s on the countdown timer. The passenger then respawns
 * at a random path point ≥ 500 m away with a new target.
 *
 * The game ends when the countdown timer reaches 0.
 */

import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import {
  createRunnerModel,
  poseCheering,
  poseFlailing,
  poseJump,
  poseRunning,
  poseSitting,
  poseSittingAnimated,
  poseStanding,
} from '../objects/RunnerModel';
import type { RunnerModelResult } from '../objects/RunnerModel';
import {
  BUS_ROOF_Y,
  GRAVITY,
  PASSENGER_PICKUP_COOLDOWN,
  PASSENGER_PICKUP_COUNT,
  PASSENGER_PICKUP_DELIVERY_RADIUS,
  PASSENGER_PICKUP_DROPOFF_BONUS_DECAY,
  PASSENGER_PICKUP_DROPOFF_BONUS_MIN,
  PASSENGER_PICKUP_DROPOFF_BONUS_START,
  PASSENGER_PICKUP_INITIAL_TIME,
  PASSENGER_PICKUP_RESPAWN_MIN_DIST,
  PASSENGER_PICKUP_RUN_SPEED,
  PASSENGER_PICKUP_SCOOP_DISTANCE,
  PASSENGER_PICKUP_TARGET_DIST_MIN,
  SCOOP_BOOST_DURATION,
  SCOOP_FORWARD_FACTOR,
  SCOOP_MIN_UP,
  SCOOP_UP_FACTOR,
} from '../constants';
import { mulberry32 } from './terrain';

/** Flag pole height */
const FLAG_POLE_HEIGHT = 8;
/** Flag banner size */
const FLAG_BANNER_WIDTH = 2.5;
const FLAG_BANNER_HEIGHT = 1.8;

// ---------- Types ----------

export type PassengerState = 'waiting' | 'launched' | 'riding' | 'standing' | 'dismounting' | 'walking' | 'cooldown';

export interface Passenger {
  mesh: Mesh;
  model: RunnerModelResult;
  tshirtColor: Color3;
  state: PassengerState;

  // Animation
  cheerPhase: number;
  cheerCycleLength: number;
  animPhase: number;

  // Target delivery location
  targetX: number;
  targetZ: number;
  /** Path cumulative distance of the target (for minimap reference) */
  targetPathDist: number;

  /** 3D flag mesh at target location */
  flagRoot: TransformNode | null;

  // Flight physics (launched state)
  velX: number;
  velY: number;
  velZ: number;

  // Roof seat
  ridingOffsetX: number;
  ridingOffsetZ: number;

  // Delivery phases
  deliveredTimer: number;
  cooldownTimer: number;
  /** Velocity during dismount jump */
  dismountVelY: number;
}

export interface PassengerSystemCallbacks {
  onPickup: () => void;
  onDelivery: (totalDeliveries: number) => void;
  onTimerChange: (remaining: number) => void;
  onTimeBonus: (seconds: number) => void;
  onGameOver: (totalDeliveries: number) => void;
  /** Trigger the bus's scoop animation */
  onTriggerScoopAnim: () => void;
  /** Trigger scoop speed boost */
  onTriggerBoost: () => void;
}

export interface MinimapPassengerDot {
  x: number;
  z: number;
  color: string; // CSS colour
}

export interface MinimapPassengerFlag {
  x: number;
  z: number;
  color: string; // CSS colour
}

// ---------- Helpers ----------

/**
 * Build a combined list of all traversable polylines (course + roads + trails)
 * each with their own cumulative distances, for uniform random spawning.
 */
interface PathSegment {
  positions: [number, number][];
  cumDist: number[];
  totalDist: number;
}

function buildAllPaths(
  coursePositions: [number, number][],
  roads: [number, number][][],
  trails: [number, number][][],
): { segments: PathSegment[]; totalCombinedDist: number } {
  const segments: PathSegment[] = [];

  const addPolyline = (positions: [number, number][]) => {
    if (positions.length < 2) return;
    const cumDist = [0];
    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i][0] - positions[i - 1][0];
      const dz = positions[i][1] - positions[i - 1][1];
      cumDist.push(cumDist[i - 1] + Math.sqrt(dx * dx + dz * dz));
    }
    const totalDist = cumDist[cumDist.length - 1];
    if (totalDist > 0) segments.push({ positions, cumDist, totalDist });
  };

  addPolyline(coursePositions);
  for (const road of roads) addPolyline(road);
  for (const trail of trails) addPolyline(trail);

  const totalCombinedDist = segments.reduce((sum, s) => sum + s.totalDist, 0);
  return { segments, totalCombinedDist };
}

/** Pick a random position on any of the combined paths. */
function randomPositionOnAnyPath(
  allPaths: { segments: PathSegment[]; totalCombinedDist: number },
  getGroundY: (x: number, z: number) => number,
  rand: () => number,
): { x: number; z: number; y: number; segIndex: number; pathDist: number } {
  const d = rand() * allPaths.totalCombinedDist;
  let accum = 0;
  for (let si = 0; si < allPaths.segments.length; si++) {
    const seg = allPaths.segments[si];
    if (accum + seg.totalDist >= d || si === allPaths.segments.length - 1) {
      const localD = Math.min(d - accum, seg.totalDist);
      const pos = samplePathAtDist(seg.positions, seg.cumDist, localD);
      return { x: pos.x, z: pos.z, y: getGroundY(pos.x, pos.z), segIndex: si, pathDist: localD };
    }
    accum += seg.totalDist;
  }
  // fallback
  const seg = allPaths.segments[0];
  const pos = samplePathAtDist(seg.positions, seg.cumDist, 0);
  return { x: pos.x, z: pos.z, y: getGroundY(pos.x, pos.z), segIndex: 0, pathDist: 0 };
}

/** Pick a target position on any path at least PASSENGER_PICKUP_TARGET_DIST_MIN metres away (world distance). */
function pickTargetOnAnyPath(
  allPaths: { segments: PathSegment[]; totalCombinedDist: number },
  fromX: number,
  fromZ: number,
  getGroundY: (x: number, z: number) => number,
  rand: () => number,
): { x: number; z: number; segIndex: number; pathDist: number } {
  for (let attempt = 0; attempt < 30; attempt++) {
    const pos = randomPositionOnAnyPath(allPaths, getGroundY, rand);
    const dx = pos.x - fromX;
    const dz = pos.z - fromZ;
    const worldDist = Math.sqrt(dx * dx + dz * dz);
    if (worldDist >= PASSENGER_PICKUP_TARGET_DIST_MIN || attempt === 29) {
      return { x: pos.x, z: pos.z, segIndex: pos.segIndex, pathDist: pos.pathDist };
    }
  }
  // fallback
  const pos = randomPositionOnAnyPath(allPaths, getGroundY, rand);
  return { x: pos.x, z: pos.z, segIndex: pos.segIndex, pathDist: pos.pathDist };
}

/** Pick a respawn position on any path at least PASSENGER_PICKUP_RESPAWN_MIN_DIST world metres away. */
function pickRespawnOnAnyPath(
  allPaths: { segments: PathSegment[]; totalCombinedDist: number },
  fromX: number,
  fromZ: number,
  getGroundY: (x: number, z: number) => number,
  rand: () => number,
): { x: number; z: number; y: number; segIndex: number; pathDist: number } {
  for (let attempt = 0; attempt < 30; attempt++) {
    const pos = randomPositionOnAnyPath(allPaths, getGroundY, rand);
    const dx = pos.x - fromX;
    const dz = pos.z - fromZ;
    const worldDist = Math.sqrt(dx * dx + dz * dz);
    if (worldDist >= PASSENGER_PICKUP_RESPAWN_MIN_DIST || attempt === 29) {
      return pos;
    }
  }
  return randomPositionOnAnyPath(allPaths, getGroundY, rand);
}

/** Sample a world position at a cumulative distance along the path. */
function samplePathAtDist(
  positions: [number, number][],
  cumDist: number[],
  dist: number,
): { x: number; z: number } {
  if (positions.length < 2) return { x: positions[0]?.[0] ?? 0, z: positions[0]?.[1] ?? 0 };
  const total = cumDist[cumDist.length - 1];
  const d = Math.max(0, Math.min(total, dist));
  for (let i = 1; i < cumDist.length; i++) {
    if (cumDist[i] >= d) {
      const segLen = cumDist[i] - cumDist[i - 1];
      const t = segLen > 0 ? (d - cumDist[i - 1]) / segLen : 0;
      const [ax, az] = positions[i - 1];
      const [bx, bz] = positions[i];
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t };
    }
  }
  const last = positions[positions.length - 1];
  return { x: last[0], z: last[1] };
}


// ---------- Passenger System ----------

// ---------- Passenger System ----------

export class PassengerSystem {
  private scene: Scene;
  private passengers: Passenger[] = [];
  private pathPositions: [number, number][] = [];
  private pathCumDist: number[] = [];
  private totalDist = 0;
  private allPaths: { segments: PathSegment[]; totalCombinedDist: number };
  private getGroundY: (x: number, z: number) => number;
  private callbacks: PassengerSystemCallbacks;
  private rand: () => number;

  /** Fence bounding circle — spawns are rejected if outside this. */
  private fenceBounds: { cx: number; cz: number; radius: number } | null = null;

  /** Countdown timer (seconds remaining) */
  private timer: number = PASSENGER_PICKUP_INITIAL_TIME;
  /** Total number of successful deliveries */
  private deliveries = 0;
  /** Whether the game has ended */
  private gameOver = false;

  constructor(
    scene: Scene,
    pathPositions: [number, number][],
    pathCumDist: number[],
    roads: [number, number][][],
    trails: [number, number][][],
    getGroundY: (x: number, z: number) => number,
    callbacks: PassengerSystemCallbacks,
    fenceBounds?: { cx: number; cz: number; radius: number },
  ) {
    this.scene = scene;
    this.pathPositions = pathPositions;
    this.pathCumDist = pathCumDist;
    this.totalDist = pathCumDist[pathCumDist.length - 1] ?? 0;
    this.allPaths = buildAllPaths(pathPositions, roads, trails);
    this.getGroundY = getGroundY;
    this.callbacks = callbacks;
    this.rand = mulberry32(54321);
    if (fenceBounds) this.fenceBounds = fenceBounds;
  }

  /** Check if a point is within the fence bounding circle. */
  private isInsideFence(x: number, z: number): boolean {
    if (!this.fenceBounds) return true;
    const dx = x - this.fenceBounds.cx;
    const dz = z - this.fenceBounds.cz;
    return dx * dx + dz * dz <= this.fenceBounds.radius * this.fenceBounds.radius;
  }

  /** Pick a random position on any path that is inside the fence. */
  private randomPositionInFence() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const pos = randomPositionOnAnyPath(this.allPaths, this.getGroundY, this.rand);
      if (this.isInsideFence(pos.x, pos.z)) return pos;
    }
    // fallback: return any position (shouldn't happen if paths are inside fence)
    return randomPositionOnAnyPath(this.allPaths, this.getGroundY, this.rand);
  }

  /** Pick a delivery target that is inside the fence and far enough from source. */
  private pickTargetInFence(fromX: number, fromZ: number) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const pos = randomPositionOnAnyPath(this.allPaths, this.getGroundY, this.rand);
      if (!this.isInsideFence(pos.x, pos.z)) continue;
      const dx = pos.x - fromX;
      const dz = pos.z - fromZ;
      const worldDist = Math.sqrt(dx * dx + dz * dz);
      if (worldDist >= PASSENGER_PICKUP_TARGET_DIST_MIN || attempt === 49) {
        return { x: pos.x, z: pos.z, segIndex: pos.segIndex, pathDist: pos.pathDist };
      }
    }
    const pos = randomPositionOnAnyPath(this.allPaths, this.getGroundY, this.rand);
    return { x: pos.x, z: pos.z, segIndex: pos.segIndex, pathDist: pos.pathDist };
  }

  /** Pick a respawn point inside the fence and far enough from deliveryX/Z. */
  private pickRespawnInFence(fromX: number, fromZ: number) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const pos = randomPositionOnAnyPath(this.allPaths, this.getGroundY, this.rand);
      if (!this.isInsideFence(pos.x, pos.z)) continue;
      const dx = pos.x - fromX;
      const dz = pos.z - fromZ;
      const worldDist = Math.sqrt(dx * dx + dz * dz);
      if (worldDist >= PASSENGER_PICKUP_RESPAWN_MIN_DIST || attempt === 49) {
        return pos;
      }
    }
    return randomPositionOnAnyPath(this.allPaths, this.getGroundY, this.rand);
  }

  /** Spawn all passenger NPCs at random points on any path/road/trail. */
  spawn() {
    // Emit initial timer value immediately so the HUD shows it during countdown
    this.callbacks.onTimerChange(this.timer);

    for (let i = 0; i < PASSENGER_PICKUP_COUNT; i++) {
      const spawn = this.randomPositionInFence();

      const tshirtColor = new Color3(
        0.3 + this.rand() * 0.7,
        0.3 + this.rand() * 0.7,
        0.3 + this.rand() * 0.7,
      );

      const model = createRunnerModel(this.scene, 30000 + i, tshirtColor);
      model.root.position = new Vector3(spawn.x, spawn.y, spawn.z);

      const anchor = MeshBuilder.CreateBox(
        `passengerAnchor_${i}`,
        { width: 0.01, height: 0.01, depth: 0.01 },
        this.scene,
      );
      anchor.isVisible = false;
      anchor.position = new Vector3(spawn.x, spawn.y, spawn.z);
      model.root.parent = anchor;
      model.root.position = Vector3.Zero();

      // Face a random direction
      model.root.rotation.y = this.rand() * Math.PI * 2;

      const target = this.pickTargetInFence(spawn.x, spawn.z);

      // Create 3D flag at target (hidden initially — shown when picked up)
      const flagRoot = this.createFlag(i, tshirtColor, target.x, target.z);
      flagRoot.setEnabled(false);

      this.passengers.push({
        mesh: anchor,
        model,
        tshirtColor,
        state: 'waiting',
        cheerPhase: this.rand() * 20,
        cheerCycleLength: 4.0 + this.rand() * 4.0,
        animPhase: this.rand() * Math.PI * 2,
        targetX: target.x,
        targetZ: target.z,
        targetPathDist: target.pathDist,
        flagRoot,
        velX: 0,
        velY: 0,
        velZ: 0,
        ridingOffsetX: 0,
        ridingOffsetZ: 0,
        deliveredTimer: 0,
        cooldownTimer: 0,
        dismountVelY: 0,
      });
    }
  }

  /** Main update — call every frame while racing. */
  update(
    dt: number,
    busPos: Vector3,
    busYaw: number,
    busSpeed: number,
    engineVibeOffset: number,
  ): { triggerScoopAnim: boolean; boostTimerAdd: number } {
    if (this.gameOver) return { triggerScoopAnim: false, boostTimerAdd: 0 };

    // Tick countdown
    this.timer -= dt;
    this.callbacks.onTimerChange(Math.max(0, this.timer));
    if (this.timer <= 0) {
      this.timer = 0;
      this.gameOver = true;
      this.callbacks.onGameOver(this.deliveries);
      return { triggerScoopAnim: false, boostTimerAdd: 0 };
    }

    let triggerScoopAnim = false;
    let boostTimerAdd = 0;

    for (const p of this.passengers) {
      const pos = p.mesh.position;

      switch (p.state) {
        case 'waiting': {
          // Cheering animation
          p.cheerPhase += dt;

          // Compute bounce (same as preview cheer)
          const armCycle = p.cheerCycleLength;
          const armRaiseDuration = 1.2;
          const cyclePos = ((p.cheerPhase % armCycle) + armCycle) % armCycle;
          let armRaise = 0;
          if (cyclePos < armRaiseDuration) {
            armRaise = Math.sin((cyclePos / armRaiseDuration) * Math.PI);
          }
          const bounceFreq = 3.0;
          const bounceRaw = Math.sin(p.cheerPhase * bounceFreq * Math.PI * 2);
          const bounce = Math.max(0, bounceRaw) * 0.15 * armRaise;
          pos.y = this.getGroundY(pos.x, pos.z) + bounce;

          poseCheering(p.model, p.cheerPhase, p.cheerCycleLength);

          // Check if scooped by bus
          const dx = busPos.x - pos.x;
          const dz = busPos.z - pos.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < PASSENGER_PICKUP_SCOOP_DISTANCE && Math.abs(busSpeed) > 0.5) {
            this.launchPassenger(p, busSpeed, busYaw);
            triggerScoopAnim = true;
            boostTimerAdd += SCOOP_BOOST_DURATION;
            this.callbacks.onPickup();
          }
          break;
        }

        case 'launched': {
          // Gravity
          p.velY -= GRAVITY * dt;
          pos.y += p.velY * dt;

          // Home toward roof seat
          const sinY = Math.sin(busYaw);
          const cosY = Math.cos(busYaw);
          const seatWorldX = busPos.x + cosY * p.ridingOffsetX + sinY * p.ridingOffsetZ;
          const seatWorldZ = busPos.z - sinY * p.ridingOffsetX + cosY * p.ridingOffsetZ;

          const homingStrength = 6;
          pos.x += (seatWorldX - pos.x) * Math.min(1, homingStrength * dt);
          pos.z += (seatWorldZ - pos.z) * Math.min(1, homingStrength * dt);

          p.mesh.rotation.x += 8 * dt;
          p.mesh.rotation.z += 5 * dt;
          p.animPhase += dt * 12;
          poseFlailing(p.model, p.animPhase);

          // Land on roof
          const roofWorldY = busPos.y + BUS_ROOF_Y;
          if (pos.y <= roofWorldY && p.velY < 0) {
            p.state = 'riding';
            p.mesh.rotation.x = 0;
            p.mesh.rotation.z = 0;
            poseSitting(p.model);
          }
          break;
        }

        case 'riding': {
          // Follow bus
          const sinY2 = Math.sin(busYaw);
          const cosY2 = Math.cos(busYaw);
          pos.x = busPos.x + cosY2 * p.ridingOffsetX + sinY2 * p.ridingOffsetZ;
          pos.z = busPos.z - sinY2 * p.ridingOffsetX + cosY2 * p.ridingOffsetZ;
          pos.y = busPos.y + BUS_ROOF_Y + engineVibeOffset;
          p.mesh.rotation.y = busYaw;
          p.animPhase += dt;
          poseSittingAnimated(p.model, p.animPhase);

          // Check if bus is near the target (delivery!)
          const toDx = busPos.x - p.targetX;
          const toDz = busPos.z - p.targetZ;
          const toDist = Math.sqrt(toDx * toDx + toDz * toDz);
          if (toDist < PASSENGER_PICKUP_DELIVERY_RADIUS) {
            this.deliverPassenger(p, busPos);
          }
          break;
        }

        case 'standing': {
          // Phase 1: Stand up on the roof (brief 0.4s)
          p.deliveredTimer += dt;
          // Follow bus while standing up
          const sinYS = Math.sin(busYaw);
          const cosYS = Math.cos(busYaw);
          pos.x = busPos.x + cosYS * p.ridingOffsetX + sinYS * p.ridingOffsetZ;
          pos.z = busPos.z - sinYS * p.ridingOffsetX + cosYS * p.ridingOffsetZ;
          pos.y = busPos.y + BUS_ROOF_Y + engineVibeOffset;
          p.mesh.rotation.y = busYaw;
          poseStanding(p.model);

          if (p.deliveredTimer >= 0.4) {
            // Transition to dismount jump
            p.state = 'dismounting';
            p.deliveredTimer = 0;
            p.dismountVelY = 4; // small upward hop
            // Face toward the flag
            const dxS = p.targetX - pos.x;
            const dzS = p.targetZ - pos.z;
            p.model.root.rotation.y = Math.atan2(dxS, dzS);
          }
          break;
        }

        case 'dismounting': {
          // Phase 2: Jump off the bus to the ground
          p.deliveredTimer += dt;
          p.dismountVelY -= GRAVITY * dt;
          pos.y += p.dismountVelY * dt;

          // Slight lateral drift toward the flag
          const dxD = p.targetX - pos.x;
          const dzD = p.targetZ - pos.z;
          const distD = Math.sqrt(dxD * dxD + dzD * dzD);
          if (distD > 1) {
            pos.x += (dxD / distD) * 2 * dt;
            pos.z += (dzD / distD) * 2 * dt;
          }

          // Jump pose with lift based on vertical velocity
          const lift = Math.max(0, Math.min(1, p.dismountVelY / 4));
          poseJump(p.model, lift);

          const groundY = this.getGroundY(pos.x, pos.z);
          if (pos.y <= groundY && p.dismountVelY < 0) {
            // Landed — transition to walking
            pos.y = groundY;
            p.state = 'walking';
            p.deliveredTimer = 0;
            p.animPhase = 0;
          }
          break;
        }

        case 'walking': {
          // Phase 3: Walk to the flag at a leisurely pace
          p.deliveredTimer += dt;
          const dxW = p.targetX - pos.x;
          const dzW = p.targetZ - pos.z;
          const distToFlag = Math.sqrt(dxW * dxW + dzW * dzW);
          const WALK_SPEED = PASSENGER_PICKUP_RUN_SPEED * 0.5;

          if (distToFlag < 2) {
            // Reached the flag — hide flag, hide passenger, start cooldown
            if (p.flagRoot) p.flagRoot.setEnabled(false);
            p.model.root.setEnabled(false);
            p.state = 'cooldown';
            p.cooldownTimer = PASSENGER_PICKUP_COOLDOWN;
          } else {
            // Walk toward target
            const dirX = dxW / distToFlag;
            const dirZ = dzW / distToFlag;
            pos.x += dirX * WALK_SPEED * dt;
            pos.z += dirZ * WALK_SPEED * dt;
            pos.y = this.getGroundY(pos.x, pos.z);
            // Face direction of movement
            p.model.root.rotation.y = Math.atan2(dxW, dzW);
            // Animate walking (slower stride)
            p.animPhase += dt * WALK_SPEED * 0.8;
            poseRunning(p.model, p.animPhase);
          }
          break;
        }

        case 'cooldown': {
          p.cooldownTimer -= dt;
          if (p.cooldownTimer <= 0) {
            this.respawnPassenger(p);
          }
          break;
        }
      }
    }

    return { triggerScoopAnim, boostTimerAdd };
  }

  /** Launch a passenger onto the bus roof (scoop). */
  private launchPassenger(p: Passenger, busSpeed: number, busYaw: number) {
    p.state = 'launched';
    const absSpeed = Math.abs(busSpeed);
    const fwdX = Math.sin(busYaw);
    const fwdZ = Math.cos(busYaw);
    p.velX = fwdX * busSpeed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;
    p.velY = Math.max(SCOOP_MIN_UP, absSpeed * SCOOP_UP_FACTOR) + Math.random() * 3;
    p.velZ = fwdZ * busSpeed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;

    // Show 3D flag at target
    if (p.flagRoot) p.flagRoot.setEnabled(true);

    // Assign roof seat
    this.assignRoofSeat(p);
  }

  /** Assign a packed roof seat position for a passenger. */
  private assignRoofSeat(newRider: Passenger) {
    const riders = this.passengers.filter(
      (p) => p.state === 'riding' || (p.state === 'launched' && p !== newRider),
    );
    const seatIndex = riders.length;
    const totalRiders = seatIndex + 1;

    const roofW = 2.0;
    const roofL = 6.0;
    const cols = Math.min(totalRiders, 3);
    const rows = Math.ceil(totalRiders / cols);
    const spacingX = cols > 1 ? roofW / (cols - 1) : 0;
    const spacingZ = rows > 1 ? roofL / (rows - 1) : 0;

    const allRiders = [...riders, newRider];
    for (let i = 0; i < allRiders.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      allRiders[i].ridingOffsetX = cols > 1 ? -roofW / 2 + col * spacingX : 0;
      allRiders[i].ridingOffsetZ = rows > 1 ? -roofL / 2 + row * spacingZ : 0;
    }
  }

  /** Deliver a passenger: add time, jump off bus and run to flag. */
  private deliverPassenger(p: Passenger, busPos: Vector3) {
    // Bonus decreases by DECAY per delivery (floor at MIN)
    const bonus = Math.max(
      PASSENGER_PICKUP_DROPOFF_BONUS_MIN,
      PASSENGER_PICKUP_DROPOFF_BONUS_START - this.deliveries * PASSENGER_PICKUP_DROPOFF_BONUS_DECAY,
    );
    this.deliveries++;
    this.timer += bonus;
    this.callbacks.onTimerChange(this.timer);
    this.callbacks.onTimeBonus(bonus);
    this.callbacks.onDelivery(this.deliveries);

    // Transition to 'standing' — passenger stands up on roof, then jumps off
    p.state = 'standing';
    p.deliveredTimer = 0;
    p.dismountVelY = 0;
    p.mesh.rotation.x = 0;
    p.mesh.rotation.z = 0;
    // Face toward the flag
    const dx = p.targetX - busPos.x;
    const dz = p.targetZ - busPos.z;
    p.model.root.rotation.y = Math.atan2(dx, dz);

    // Re-pack remaining riders' roof seats
    this.repackRoofSeats();
  }

  /** Respawn a passenger after cooldown. */
  private respawnPassenger(p: Passenger) {
    const respawn = this.pickRespawnInFence(p.targetX, p.targetZ);
    p.mesh.position.set(respawn.x, respawn.y, respawn.z);
    p.mesh.rotation.x = 0;
    p.mesh.rotation.z = 0;
    p.model.root.rotation.y = this.rand() * Math.PI * 2;
    p.model.root.setEnabled(true);

    const target = this.pickTargetInFence(respawn.x, respawn.z);

    p.state = 'waiting';
    p.targetX = target.x;
    p.targetZ = target.z;
    p.targetPathDist = target.pathDist;
    p.cheerPhase = this.rand() * 20;
    p.cheerCycleLength = 4.0 + this.rand() * 4.0;

    // Move the flag to the new target location (hidden until next pickup)
    if (p.flagRoot) {
      const flagY = this.getGroundY(target.x, target.z);
      p.flagRoot.position.set(target.x, flagY, target.z);
      p.flagRoot.setEnabled(false);
    }
  }

  /** Re-assign roof seats for all currently riding passengers. */
  private repackRoofSeats() {
    const riders = this.passengers.filter((p) => p.state === 'riding');
    if (riders.length === 0) return;

    const roofW = 2.0;
    const roofL = 6.0;
    const cols = Math.min(riders.length, 3);
    const rows = Math.ceil(riders.length / cols);
    const spacingX = cols > 1 ? roofW / (cols - 1) : 0;
    const spacingZ = rows > 1 ? roofL / (rows - 1) : 0;

    for (let i = 0; i < riders.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      riders[i].ridingOffsetX = cols > 1 ? -roofW / 2 + col * spacingX : 0;
      riders[i].ridingOffsetZ = rows > 1 ? -roofL / 2 + row * spacingZ : 0;
    }
  }

  // ---------- 3D Flag creation ----------

  /** Create a 3D flag pole + triangular banner at the given world position. */
  private createFlag(index: number, color: Color3, x: number, z: number): TransformNode {
    const y = this.getGroundY(x, z);
    const root = new TransformNode(`flag_${index}`, this.scene);
    root.position.set(x, y, z);

    // Pole (thin white cylinder)
    const pole = MeshBuilder.CreateCylinder(
      `flagPole_${index}`,
      { diameter: 0.12, height: FLAG_POLE_HEIGHT, tessellation: 8 },
      this.scene,
    );
    const poleMat = new StandardMaterial(`flagPoleMat_${index}`, this.scene);
    poleMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
    poleMat.specularColor = Color3.Black();
    pole.material = poleMat;
    pole.position.y = FLAG_POLE_HEIGHT / 2;
    pole.parent = root;

    // Banner (triangular plane — we use a flat box rotated to simulate a pennant)
    const banner = MeshBuilder.CreatePlane(
      `flagBanner_${index}`,
      { width: FLAG_BANNER_WIDTH, height: FLAG_BANNER_HEIGHT },
      this.scene,
    );
    const bannerMat = new StandardMaterial(`flagBannerMat_${index}`, this.scene);
    bannerMat.diffuseColor = color.clone();
    bannerMat.specularColor = Color3.Black();
    bannerMat.emissiveColor = color.scale(0.3);
    bannerMat.backFaceCulling = false;
    banner.material = bannerMat;
    banner.position.y = FLAG_POLE_HEIGHT - FLAG_BANNER_HEIGHT / 2 - 0.2;
    banner.position.x = FLAG_BANNER_WIDTH / 2;
    banner.parent = root;

    // Sphere at the top of the pole for visibility
    const ball = MeshBuilder.CreateSphere(
      `flagBall_${index}`,
      { diameter: 0.4, segments: 6 },
      this.scene,
    );
    const ballMat = new StandardMaterial(`flagBallMat_${index}`, this.scene);
    ballMat.diffuseColor = color.clone();
    ballMat.emissiveColor = color.scale(0.5);
    ballMat.specularColor = Color3.Black();
    ball.material = ballMat;
    ball.position.y = FLAG_POLE_HEIGHT + 0.2;
    ball.parent = root;

    return root;
  }

  // ---------- Minimap data ----------

  /** Get colored dots for all waiting passengers. */
  getMinimapDots(): MinimapPassengerDot[] {
    const dots: MinimapPassengerDot[] = [];
    for (const p of this.passengers) {
      if (p.state === 'waiting') {
        dots.push({
          x: p.mesh.position.x,
          z: p.mesh.position.z,
          color: p.tshirtColor.toHexString(),
        });
      }
    }
    return dots;
  }

  /** Get colored flags for all currently-scooped or delivered passengers' delivery targets. */
  getMinimapFlags(): MinimapPassengerFlag[] {
    const flags: MinimapPassengerFlag[] = [];
    for (const p of this.passengers) {
      if (p.state === 'launched' || p.state === 'riding' || p.state === 'standing' || p.state === 'dismounting' || p.state === 'walking') {
        flags.push({
          x: p.targetX,
          z: p.targetZ,
          color: p.tshirtColor.toHexString(),
        });
      }
    }
    return flags;
  }

  /** Get remaining timer for HUD. */
  getTimer(): number {
    return Math.max(0, this.timer);
  }

  /** Get total deliveries. */
  getDeliveries(): number {
    return this.deliveries;
  }

  /**
   * Get the closest active flag target position to a given world position.
   * Returns null if no passengers are currently riding/launched.
   */
  getClosestFlagTarget(busX: number, busZ: number): { x: number; z: number } | null {
    let closest: { x: number; z: number } | null = null;
    let closestDistSq = Infinity;
    for (const p of this.passengers) {
      if (p.state === 'launched' || p.state === 'riding') {
        const dx = p.targetX - busX;
        const dz = p.targetZ - busZ;
        const distSq = dx * dx + dz * dz;
        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closest = { x: p.targetX, z: p.targetZ };
        }
      }
    }
    return closest;
  }

  /** Is the game over? */
  isGameOver(): boolean {
    return this.gameOver;
  }

  /** Dispose all passenger meshes. */
  dispose() {
    for (const p of this.passengers) {
      p.model.root.dispose();
      p.mesh.dispose();
      if (p.flagRoot) p.flagRoot.dispose();
    }
    this.passengers = [];
  }
}
