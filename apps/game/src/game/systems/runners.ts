import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  Vector3,
} from '@babylonjs/core';
import type { ParticleSystem, TransformNode } from '@babylonjs/core';
import {
  createRunnerModel,
  RunnerModelResult,
  poseRunning,
  poseFlailing,
  poseSitting,
  poseSittingAnimated,
  poseStanding,
  poseJump,
} from '../objects/RunnerModel';
import { applyRunnerInteractionPose } from './runnerInteractions';
import { PLAYER_COLORS } from '../objects/BusModel';
import type { Runner, RemotePlayersMap, ElasticObject, SolidObstacle, BuildingCollider } from '../types';
import { resolvePositionAgainstBuildings } from './buildings';
import { mulberry32 } from './terrain';
import {
  BUS_COLLISION_RADIUS,
  BUS_ROOF_Y,
  GRAVITY,
  MODE,
  PATH_HALF_WIDTH,
  RUNNER_COLLISION_RADIUS,
  RUNNER_COUNT,
  RUNNER_DOWNHILL_SLOPE_THRESHOLD,
  RUNNER_DOWNHILL_SPEED_BOOST,
  RUNNER_ESCAPE_DISTANCE,
  RUNNER_ESCAPE_SPEED,
  RUNNER_JUMP_HEIGHT,
  RUNNER_MAX_SPEED,
  RUNNER_MIN_SPEED,
  RUNNER_PLAYER_ANIM_SPEED_FACTOR,
  RUNNER_ANIMATION_CULL_DISTANCE,
  RUNNER_PLAYER_JUMP_SIDE_VELOCITY,
  RUNNER_SIT_DURATION,
  SCOOP_ANIM_DURATION,
  SCOOP_BOOST_DURATION,
  SCOOP_DISTANCE,
  SCOOP_FORWARD_FACTOR,
  SCOOP_MIN_UP,
  SCOOP_UP_FACTOR,
} from '../constants';

// ---------- Runner spawning ----------

export function spawnRunners(
  scene: Scene,
  pathPositions: [number, number][],
  getGroundY: (x: number, z: number) => number,
): Runner[] {
  if (pathPositions.length < 3) return [];

  const runners: Runner[] = [];
  const rand = mulberry32(12345);

  for (let i = 0; i < RUNNER_COUNT; i++) {
    const pathFraction = (i + 1) / (RUNNER_COUNT + 1);
    const targetIdx = Math.min(
      Math.floor(pathFraction * pathPositions.length),
      pathPositions.length - 1,
    );

    const [px, pz] = pathPositions[targetIdx];
    const lateralOffset = (rand() - 0.5) * 2 * PATH_HALF_WIDTH * 0.85;

    const tshirtColor = new Color3(
      0.3 + rand() * 0.7,
      0.3 + rand() * 0.7,
      0.3 + rand() * 0.7,
    );

    const model = createRunnerModel(scene, i, tshirtColor);
    const runnerGroundY = getGroundY(px + lateralOffset, pz);
    model.root.position = new Vector3(px + lateralOffset, runnerGroundY, pz);

    const anchor = MeshBuilder.CreateBox(
      `runnerAnchor_${i}`,
      { width: 0.01, height: 0.01, depth: 0.01 },
      scene,
    );
    anchor.isVisible = false;
    anchor.position = model.root.position.clone();
    model.root.parent = anchor;
    model.root.position = Vector3.Zero();

    const speed =
      RUNNER_MIN_SPEED + rand() * (RUNNER_MAX_SPEED - RUNNER_MIN_SPEED);

    runners.push({
      mesh: anchor,
      model,
      targetIdx,
      speed,
      state: 'running',
      velX: 0, velY: 0, velZ: 0,
      fadeTimer: 0,
      animPhase: rand() * Math.PI * 2,
      lateralOffset,
      ridingOffsetX: 0,
      ridingOffsetZ: 0,
      escapeDir: 0,
      ownerPlayerIndex: 0,
      tshirtColor,
      interaction: 'none',
      interactionTimer: 0,
      interactionSide: 1,
    });
  }

  return runners;
}

// ---------- Runner update system ----------

export interface RunnerUpdateContext {
  scene: Scene;
  runners: Runner[];
  pathPositions: [number, number][];
  getGroundY: (x: number, z: number) => number;
  busPos: Vector3;
  busYaw: number;
  busSpeed: number;
  localPlayerRole: 'bus' | 'runner';
  localPlayerIndex: number;
  solidObstacles: SolidObstacle[];
  elasticObjects: ElasticObject[];
  remotePlayers: RemotePlayersMap;
  buildingColliders: BuildingCollider[];
  /** Current engine vibration Y offset (applied to roof riders). */
  engineVibeOffset: number;
}

export interface ScoopEvent {
  runnerIndex: number;
  playerIndex: number;
  victimPlayerIndex?: number;
  scooperYaw?: number;
  scooperSpeed?: number;
}

export interface RunnerUpdateResult {
  scoopEvents: ScoopEvent[];
  scoopCount: number;
  triggerScoopAnim: boolean;
  boostTimerAdd: number;
  startExhaust: boolean;
}

export function updateRunnersSystem(
  ctx: RunnerUpdateContext,
  dt: number,
): RunnerUpdateResult {
  const result: RunnerUpdateResult = {
    scoopEvents: [],
    scoopCount: 0,
    triggerScoopAnim: false,
    boostTimerAdd: 0,
    startExhaust: false,
  };

  const animationCullDistanceSq = RUNNER_ANIMATION_CULL_DISTANCE * RUNNER_ANIMATION_CULL_DISTANCE;

  for (const runner of ctx.runners) {
    // Skip runners owned by a remote player
    if (runner.ownerPlayerIndex !== 0 && runner.ownerPlayerIndex !== ctx.localPlayerIndex) {
      continue;
    }

    const pos = runner.mesh.position;
    const distToLocalX = pos.x - ctx.busPos.x;
    const distToLocalZ = pos.z - ctx.busPos.z;
    const animateRunner = distToLocalX * distToLocalX + distToLocalZ * distToLocalZ <= animationCullDistanceSq;

    switch (runner.state) {
      case 'running': {
        const target = ctx.pathPositions[runner.targetIdx];
        if (!target) break;

        const nextIdx = (runner.targetIdx + 1) % ctx.pathPositions.length;
        const next = ctx.pathPositions[nextIdx];
        const segDx = next[0] - target[0];
        const segDz = next[1] - target[1];
        const segLen = Math.sqrt(segDx * segDx + segDz * segDz) || 1;
        const perpX = -segDz / segLen;
        const perpZ = segDx / segLen;

        // Escape behaviour
        const busDx = ctx.busPos.x - pos.x;
        const busDz = ctx.busPos.z - pos.z;
        const busDist = Math.sqrt(busDx * busDx + busDz * busDz);

        if (ctx.localPlayerRole === 'bus' && busDist < RUNNER_ESCAPE_DISTANCE && Math.abs(ctx.busSpeed) > 0.5) {
          if (runner.escapeDir === 0) {
            const busPerp = perpX * busDx + perpZ * busDz;
            runner.escapeDir = busPerp > 0 ? -1 : 1;
          }
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
          if (runner.targetIdx >= ctx.pathPositions.length) {
            runner.targetIdx = 0;
            const [sx, sz] = ctx.pathPositions[0];
            pos.x = sx + runner.lateralOffset;
            pos.z = sz;
            pos.y = ctx.getGroundY(pos.x, pos.z);
          }
        } else {
          const currentHeight = ctx.getGroundY(pos.x, pos.z);
          const aheadHeight = ctx.getGroundY(
            pos.x + (dx / dist) * 2,
            pos.z + (dz / dist) * 2,
          );
          const runnerSlope = Math.atan2(aheadHeight - currentHeight, 2);
          const runningSpeedMultiplier = runnerSlope < RUNNER_DOWNHILL_SLOPE_THRESHOLD ? RUNNER_DOWNHILL_SPEED_BOOST : 1;

          const move = runner.speed * runningSpeedMultiplier * dt;
          pos.x += (dx / dist) * move;
          pos.z += (dz / dist) * move;
          runner.mesh.rotation.y = Math.atan2(dx, dz);
        }

        pos.y = ctx.getGroundY(pos.x, pos.z);
        if (animateRunner) {
          runner.animPhase += dt * runner.speed * 3;
          // Use interaction pose (wave / high-five) when active, otherwise run
          if (!applyRunnerInteractionPose(runner)) {
            poseRunning(runner.model, runner.animPhase);
          }
        } else {
          poseStanding(runner.model);
        }

        // Check if scooped by local bus
        const bx = ctx.busPos.x - pos.x;
        const bz = ctx.busPos.z - pos.z;
        if (
          ctx.localPlayerRole === 'bus'
          && runner.ownerPlayerIndex === 0
          && Math.sqrt(bx * bx + bz * bz) < SCOOP_DISTANCE
          && Math.abs(ctx.busSpeed) > 0.5
        ) {
          runner.ownerPlayerIndex = ctx.localPlayerIndex;
          // Launch runner
          launchRunnerOntoLocalBus(runner, ctx.busSpeed, ctx.busYaw, ctx.runners, ctx.localPlayerIndex, result);

          result.scoopEvents.push({
            runnerIndex: ctx.runners.indexOf(runner),
            playerIndex: ctx.localPlayerIndex,
          });
          result.scoopCount++;
        }
        break;
      }

      case 'launched': {
        runner.velY -= GRAVITY * dt;
        pos.y += runner.velY * dt;

        if (MODE === 'SCOOP_THEN_RIDE') {
          let scooperBusPos = ctx.busPos;
          let scooperBusYaw = ctx.busYaw;
          if (runner.ownerPlayerIndex !== ctx.localPlayerIndex) {
            for (const [_peerId, remote] of ctx.remotePlayers) {
              if (remote.playerIndex === runner.ownerPlayerIndex) {
                scooperBusPos = remote.smoothPos;
                scooperBusYaw = remote.smoothYaw;
                break;
              }
            }
          }

          const sinY = Math.sin(scooperBusYaw);
          const cosY = Math.cos(scooperBusYaw);
          const seatWorldX = scooperBusPos.x + cosY * runner.ridingOffsetX + sinY * runner.ridingOffsetZ;
          const seatWorldZ = scooperBusPos.z - sinY * runner.ridingOffsetX + cosY * runner.ridingOffsetZ;

          const homingStrength = 6;
          const toSeatX = seatWorldX - pos.x;
          const toSeatZ = seatWorldZ - pos.z;
          pos.x += toSeatX * Math.min(1, homingStrength * dt);
          pos.z += toSeatZ * Math.min(1, homingStrength * dt);

          runner.mesh.rotation.x += 8 * dt;
          runner.mesh.rotation.z += 5 * dt;
          if (animateRunner) {
            runner.animPhase += dt * 12;
            poseFlailing(runner.model, runner.animPhase);
          }

          // Elastic object collisions
          for (const obs of ctx.solidObstacles) {
            const odx = obs.x - pos.x;
            const odz = obs.z - pos.z;
            const oDist = Math.sqrt(odx * odx + odz * odz);
            const minDist = obs.radius + 0.5;
            if (oDist < minDist) {
              const nx = odx / oDist;
              const nz = odz / oDist;
              if (obs.elasticIndex != null) {
                const elastic = ctx.elasticObjects[obs.elasticIndex];
                if (elastic) {
                  const speed = Math.sqrt(runner.velX * runner.velX + runner.velZ * runner.velZ);
                  const pushStrength = Math.abs(speed) * 0.15;
                  elastic.tiltVelX += -nx * pushStrength;
                  elastic.tiltVelZ += -nz * pushStrength;
                }
                const bounceStrength = 15;
                runner.velX = nx * bounceStrength;
                runner.velZ = nz * bounceStrength;
                pos.x += nx * (minDist - oDist);
                pos.z += nz * (minDist - oDist);
              }
            }
          }

          if (resolvePositionAgainstBuildings(pos, RUNNER_COLLISION_RADIUS, ctx.buildingColliders)) {
            const bounceStrength = 12;
            const speed = Math.sqrt(runner.velX * runner.velX + runner.velZ * runner.velZ);
            if (speed > 0.001) {
              runner.velX *= -bounceStrength / speed;
              runner.velZ *= -bounceStrength / speed;
            } else {
              runner.velX = 0;
              runner.velZ = 0;
            }
          }

          // Remote player collisions
          for (const [_peerId, remote] of ctx.remotePlayers) {
            if (!remote.state) continue;
            if (remote.playerIndex === runner.ownerPlayerIndex) continue;
            const rdx = remote.smoothPos.x - pos.x;
            const rdz = remote.smoothPos.z - pos.z;
            const rDist = Math.sqrt(rdx * rdx + rdz * rdz);
            const rMinDist = BUS_COLLISION_RADIUS + 0.5;
            if (rDist < rMinDist && rDist > 0.001) {
              const rnx = rdx / rDist;
              const rnz = rdz / rDist;
              const bounceStrength = 12;
              runner.velX = rnx * bounceStrength;
              runner.velZ = rnz * bounceStrength;
              pos.x += rnx * (rMinDist - rDist);
              pos.z += rnz * (rMinDist - rDist);
            }
          }

          // Land when reaching roof height
          const roofWorldY = scooperBusPos.y + BUS_ROOF_Y;
          if (pos.y <= roofWorldY && runner.velY < 0) {
            runner.state = 'riding';
            runner.mesh.rotation.x = 0;
            runner.mesh.rotation.z = 0;
            poseSitting(runner.model);
          }
        } else {
          // SCOOP_THEN_RUN
          pos.x += runner.velX * dt;
          pos.z += runner.velZ * dt;

          runner.mesh.rotation.x += 8 * dt;
          runner.mesh.rotation.z += 5 * dt;
          if (animateRunner) {
            runner.animPhase += dt * 12;
            poseFlailing(runner.model, runner.animPhase);
          }

          const groundY = ctx.getGroundY(pos.x, pos.z);
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
        const sinY = Math.sin(ctx.busYaw);
        const cosY = Math.cos(ctx.busYaw);
        pos.x = ctx.busPos.x + cosY * runner.ridingOffsetX + sinY * runner.ridingOffsetZ;
        pos.z = ctx.busPos.z - sinY * runner.ridingOffsetX + cosY * runner.ridingOffsetZ;
        pos.y = ctx.busPos.y + BUS_ROOF_Y + ctx.engineVibeOffset;
        runner.mesh.rotation.y = ctx.busYaw;
        if (animateRunner) {
          runner.animPhase += dt;
          poseSittingAnimated(runner.model, runner.animPhase);
        }
        break;
      }

      case 'sitting': {
        pos.y = ctx.getGroundY(pos.x, pos.z);
        runner.fadeTimer -= dt;
        if (animateRunner) {
          runner.animPhase += dt;
          poseSittingAnimated(runner.model, runner.animPhase);
        }

        if (runner.fadeTimer <= 0) {
          poseStanding(runner.model);
          runner.state = 'running';
          let bestDist = Infinity;
          let bestIdx = runner.targetIdx;
          for (let i = 0; i < ctx.pathPositions.length; i++) {
            const [ppx, ppz] = ctx.pathPositions[i];
            const d = (pos.x - ppx) ** 2 + (pos.z - ppz) ** 2;
            if (d < bestDist) {
              bestDist = d;
              bestIdx = i;
            }
          }
          runner.targetIdx = (bestIdx + 1) % ctx.pathPositions.length;
        }
        break;
      }
    }
  }

  return result;
}

// ---------- Launch runner onto local bus ----------

function launchRunnerOntoLocalBus(
  runner: Runner,
  busSpeed: number,
  busYaw: number,
  allRunners: Runner[],
  localPlayerIndex: number,
  result: RunnerUpdateResult,
) {
  runner.state = 'launched';
  runner.interaction = 'none';
  runner.interactionTimer = 0;

  const speed = busSpeed;
  const absSpeed = Math.abs(speed);
  const fwdX = Math.sin(busYaw);
  const fwdZ = Math.cos(busYaw);
  runner.velX = fwdX * speed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;
  runner.velY = Math.max(SCOOP_MIN_UP, absSpeed * SCOOP_UP_FACTOR) + Math.random() * 3;
  runner.velZ = fwdZ * speed * SCOOP_FORWARD_FACTOR + (Math.random() - 0.5) * 3;

  if (MODE === 'SCOOP_THEN_RIDE') {
    assignRoofSeat(allRunners, localPlayerIndex, runner);
  }

  result.triggerScoopAnim = true;
  result.boostTimerAdd += SCOOP_BOOST_DURATION;
  result.startExhaust = true;
}

// ---------- Roof seat assignment ----------

/**
 * Assign a packed seat position on the bus roof.
 * As more runners board, everyone squeezes closer together to fit.
 */
export function assignRoofSeat(allRunners: Runner[], localPlayerIndex: number, newRider: Runner) {
  const riders = allRunners.filter((r) => r.state === 'riding' && r.ownerPlayerIndex === localPlayerIndex);
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

// ---------- Remote rider packing ----------

/**
 * Pack rider models evenly across a remote bus's roof.
 */
export function packRemoteRiders(remote: { riderAnchors: Mesh[]; smoothPos: Vector3; smoothYaw: number }) {
  const count = remote.riderAnchors.length;
  if (count === 0) return;

  const roofW = 2.0;
  const roofL = 6.0;
  const cols = Math.min(count, 3);
  const rows = Math.ceil(count / cols);
  const spacingX = cols > 1 ? roofW / (cols - 1) : 0;
  const spacingZ = rows > 1 ? roofL / (rows - 1) : 0;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = cols > 1 ? -roofW / 2 + col * spacingX : 0;
    const oz = rows > 1 ? -roofL / 2 + row * spacingZ : 0;

    (remote.riderAnchors[i] as any).__roofOffsetX = ox;
    (remote.riderAnchors[i] as any).__roofOffsetZ = oz;
  }
}

// ---------- Local runner build ----------

export function buildLocalRunner(
  scene: Scene,
  localPlayerIndex: number,
  busPos: Vector3,
  busYaw: number,
): RunnerModelResult {
  const palette = PLAYER_COLORS[localPlayerIndex - 1] ?? PLAYER_COLORS[0];
  const tshirtColor = palette.body;
  const model = createRunnerModel(scene, 100000, tshirtColor);
  model.root.position.set(busPos.x, busPos.y, busPos.z);
  model.root.rotation.y = busYaw;
  poseStanding(model);
  return model;
}

// ---------- Local runner visual update ----------

export interface LocalRunnerVisualContext {
  model: RunnerModelResult;
  busPos: Vector3;
  busYaw: number;
  busSpeed: number;
  busAirborne: boolean;
  scoopState: 'free' | 'launched' | 'sitting';
  runnerJumpSideVel: number;
  getGroundY: (x: number, z: number) => number;
}

export function updateLocalRunnerVisual(
  ctx: LocalRunnerVisualContext,
  dt: number,
  animPhase: number,
): number {
  ctx.model.root.position.set(ctx.busPos.x, ctx.busPos.y, ctx.busPos.z);
  ctx.model.root.rotation.y = ctx.busYaw;

  if (ctx.scoopState === 'launched') {
    ctx.model.root.rotation.x += 8 * dt;
    ctx.model.root.rotation.z += 5 * dt;
    animPhase += dt * 12;
    poseFlailing(ctx.model, animPhase);
    return animPhase;
  }

  if (ctx.scoopState === 'sitting') {
    ctx.model.root.rotation.x = 0;
    ctx.model.root.rotation.z = 0;
    poseSitting(ctx.model);
    return animPhase;
  }

  if (ctx.busAirborne) {
    const groundY = ctx.getGroundY(ctx.busPos.x, ctx.busPos.z);
    const jumpHeight = Math.max(0, ctx.busPos.y - groundY);
    const jumpLift = Math.min(1, jumpHeight / RUNNER_JUMP_HEIGHT);
    ctx.model.root.rotation.x = -0.2;
    ctx.model.root.rotation.z = ctx.runnerJumpSideVel * 0.03;
    ctx.model.root.rotation.y = ctx.busYaw;
    poseJump(
      ctx.model,
      jumpLift,
      ctx.runnerJumpSideVel / RUNNER_PLAYER_JUMP_SIDE_VELOCITY,
    );
    return animPhase;
  }

  ctx.model.root.rotation.x = 0;
  ctx.model.root.rotation.z = 0;

  const moving = Math.abs(ctx.busSpeed) > 0.15;
  if (moving) {
    const phaseSpeed = Math.abs(ctx.busSpeed) * 3.2 * RUNNER_PLAYER_ANIM_SPEED_FACTOR;
    animPhase += dt * phaseSpeed;
    poseRunning(ctx.model, animPhase);
  } else {
    poseStanding(ctx.model);
  }

  return animPhase;
}
