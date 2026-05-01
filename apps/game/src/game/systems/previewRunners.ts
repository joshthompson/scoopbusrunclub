/**
 * Preview runner system — spawns NPC runners with character presets
 * that follow the course path and finish at specified times.
 */

import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  Vector3,
} from '@babylonjs/core';
import {
  createRunnerModel,
  poseCheering,
  poseRunning,
  poseStanding,
} from '../objects/RunnerModel';
import type { RunnerModelResult } from '../objects/RunnerModel';
import { resolveRunnerAppearance, RUNNER_PRESETS, generateRandomAppearance, isCorgiPreset } from '../characters';
import type { RunnerAppearance } from '../characters';
import { createCorgiModel } from '../objects/CorgiModel';
import { applyVolunteerVest } from '../objects/RunnerModel';

export type PreviewRunnerRole = 'parkwalker' | 'tailwalker';

export interface PreviewRunnerDef {
  runnerId: string;
  finishSeconds: number;
  role?: PreviewRunnerRole;
}

export type PreviewRunnerState = 'racing' | 'runoff' | 'cheering';

export interface PreviewRunner {
  anchor: Mesh;
  model: RunnerModelResult;
  runnerId: string;
  name: string;
  finishSeconds: number;
  /** Current path fraction 0-1 */
  fraction: number;
  /** Whether this runner has finished (crossed the line) */
  finished: boolean;
  animPhase: number;
  /** Per-runner animation speed so run cycles don't sync */
  animSpeed: number;
  /** Lateral offset perpendicular to the path so runners don't overlap */
  laneOffset: number;
  /** State machine: racing → runoff → cheering */
  state: PreviewRunnerState;
  /** Runoff: distance to jog past the finish line (metres) */
  runoffDistance: number;
  /** Runoff: lateral offset at the cheer spot */
  runoffLateral: number;
  /** Runoff: seconds elapsed since crossing the finish */
  runoffElapsed: number;
  /** Runoff: speed in m/s (matches their race pace) */
  runoffSpeed: number;
  /** Position of the finish line end (x, z) */
  finishX: number;
  finishZ: number;
  /** Yaw direction at the end of the path (forward) */
  finishYaw: number;
  /** Cheer spot world position */
  cheerX: number;
  cheerZ: number;
  /** Cheer animation phase (seconds, keeps advancing) */
  cheerPhase: number;
  /** Per-runner cheer cycle length (seconds) — randomised so they don't all cheer in sync */
  cheerCycleLength: number;
}

/**
 * Spawn preview runners at the start of the course.
 * Each runner will run at a constant speed to finish in finishSeconds.
 */
export function spawnPreviewRunners(
  scene: Scene,
  defs: PreviewRunnerDef[],
  pathPositions: [number, number][],
  getGroundY: (x: number, z: number) => number,
): PreviewRunner[] {
  if (pathPositions.length < 2) return [];

  const [sx, sz] = pathPositions[0];
  const [nx, nz] = pathPositions[1];
  const startYaw = Math.atan2(nx - sx, nz - sz);
  const startGroundY = getGroundY(sx, sz);

  // Compute finish-line direction from the last two path points
  const endA = pathPositions[pathPositions.length - 2];
  const endB = pathPositions[pathPositions.length - 1];
  const finishYaw = Math.atan2(endB[0] - endA[0], endB[1] - endA[1]);
  const finishX = endB[0];
  const finishZ = endB[1];

  // Pre-compute cumulative distances for runoff speed calculation
  let totalPathLen = 0;
  for (let i = 1; i < pathPositions.length; i++) {
    const [ax, az] = pathPositions[i - 1];
    const [bx, bz] = pathPositions[i];
    totalPathLen += Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
  }

  // Build evenly-spaced lane slots, grouped so runners finishing within 10s
  // of each other are always adjacent.
  const spacing = 0.9; // metres between lanes
  const totalRunners = defs.length;

  // 1. Create index array sorted by finish time
  const sortedIndices = Array.from({ length: totalRunners }, (_, i) => i);
  sortedIndices.sort((a, b) => defs[a].finishSeconds - defs[b].finishSeconds);

  // 2. Split into groups where consecutive runners are within 10s
  const groups: number[][] = [];
  let currentGroup: number[] = [sortedIndices[0]];
  for (let i = 1; i < sortedIndices.length; i++) {
    const prev = defs[sortedIndices[i - 1]].finishSeconds;
    const curr = defs[sortedIndices[i]].finishSeconds;
    if (curr - prev <= 10) {
      currentGroup.push(sortedIndices[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sortedIndices[i]];
    }
  }
  groups.push(currentGroup);

  // 3. Shuffle within each group, then shuffle group order
  for (const g of groups) {
    for (let i = g.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [g[i], g[j]] = [g[j], g[i]];
    }
  }
  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }

  // 4. Flatten to get the final ordering, then assign lane offsets
  const orderedIndices = groups.flat();
  const laneForRunner = new Map<number, number>();
  for (let slot = 0; slot < totalRunners; slot++) {
    const offset = (slot - (totalRunners - 1) / 2) * spacing;
    laneForRunner.set(orderedIndices[slot], offset);
  }

  const runners: PreviewRunner[] = [];

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];

    // Resolve appearance from runner preset ID
    const preset = RUNNER_PRESETS.find((p) => p.id === def.runnerId);
    const name = preset?.name ?? def.runnerId;

    let model: RunnerModelResult;
    if (preset && isCorgiPreset(preset)) {
      model = createCorgiModel(scene, 50000 + i);
    } else {
      const appearance: RunnerAppearance = preset && !isCorgiPreset(preset)
        ? preset.appearance
        : generateRandomAppearance();
      const tshirtColor = new Color3(0.5, 0.5, 0.5); // fallback, appearance takes over
      model = createRunnerModel(scene, 50000 + i, tshirtColor, appearance);
    }

    // Apply volunteer vest overlay if runner has a parkwalker/tailwalker role
    if (def.role && !(preset && isCorgiPreset(preset))) {
      applyVolunteerVest(scene, model, def.role, 50000 + i);
    }

    // Use the grouped lane slot for this runner
    const laneOffset = laneForRunner.get(i) ?? 0;
    const rightX = Math.cos(startYaw);
    const rightZ = -Math.sin(startYaw);

    const anchor = MeshBuilder.CreateBox(
      `previewRunnerAnchor_${i}`,
      { width: 0.01, height: 0.01, depth: 0.01 },
      scene,
    );
    anchor.isVisible = false;
    anchor.position = new Vector3(
      sx + rightX * laneOffset,
      startGroundY,
      sz + rightZ * laneOffset,
    );

    model.root.parent = anchor;
    model.root.position = Vector3.Zero();
    model.root.rotation.y = startYaw;
    poseStanding(model);

    // Random runoff: 3-7 m past finish, ±2 m lateral
    const runoffDistance = 3 + Math.random() * 4;
    const runoffLateral = (Math.random() - 0.5) * 4;
    const runoffSpeed = totalPathLen / def.finishSeconds; // same pace as race

    // Pre-compute cheer spot
    const fwdX = Math.sin(finishYaw);
    const fwdZ = Math.cos(finishYaw);
    const perpX = Math.cos(finishYaw);
    const perpZ = -Math.sin(finishYaw);
    const cheerX = finishX + fwdX * runoffDistance + perpX * runoffLateral;
    const cheerZ = finishZ + fwdZ * runoffDistance + perpZ * runoffLateral;

    runners.push({
      anchor,
      model,
      runnerId: def.runnerId,
      name,
      finishSeconds: def.finishSeconds,
      fraction: 0,
      finished: false,
      animPhase: Math.random() * Math.PI * 2,
      animSpeed: 7 + Math.random() * 2, // 7-9 rad/s so runners look slightly different
      laneOffset,
      state: 'racing',
      runoffDistance,
      runoffLateral,
      runoffElapsed: 0,
      runoffSpeed,
      finishX,
      finishZ,
      finishYaw,
      cheerX,
      cheerZ,
      cheerPhase: Math.random() * 20, // random offset so they don't sync
      cheerCycleLength: 4.0 + Math.random() * 4.0, // 4–8 s between cheers
    });
  }

  return runners;
}

/**
 * Compute cumulative distances along a 2D path.
 */
function cumulativeDistances(positions: [number, number][]): number[] {
  const dists = [0];
  for (let i = 1; i < positions.length; i++) {
    const [ax, az] = positions[i - 1];
    const [bx, bz] = positions[i];
    const d = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
    dists.push(dists[i - 1] + d);
  }
  return dists;
}

/**
 * Get position at a fraction 0-1 along the path.
 */
function positionAtFraction(
  positions: [number, number][],
  cumDist: number[],
  fraction: number,
): { x: number; z: number; yaw: number } {
  if (positions.length === 0) return { x: 0, z: 0, yaw: 0 };
  const clamped = Math.max(0, Math.min(1, fraction));
  const totalLen = cumDist[cumDist.length - 1];
  const target = clamped * totalLen;

  for (let i = 1; i < cumDist.length; i++) {
    if (cumDist[i] >= target) {
      const segLen = cumDist[i] - cumDist[i - 1];
      if (segLen === 0) {
        const [px, pz] = positions[i];
        return { x: px, z: pz, yaw: 0 };
      }
      const t = (target - cumDist[i - 1]) / segLen;
      const [ax, az] = positions[i - 1];
      const [bx, bz] = positions[i];
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const yaw = Math.atan2(bx - ax, bz - az);
      return { x, z, yaw };
    }
  }

  const last = positions[positions.length - 1];
  return { x: last[0], z: last[1], yaw: 0 };
}

export interface PreviewRunnerUpdateContext {
  runners: PreviewRunner[];
  pathPositions: [number, number][];
  pathCumDist: number[];
  getGroundY: (x: number, z: number) => number;
  elapsedSeconds: number;
  cameraX: number;
  cameraZ: number;
}

/**
 * Update all preview runners based on elapsed time.
 * Returns the number of runners that have finished (crossed the line).
 */
export function updatePreviewRunners(
  ctx: PreviewRunnerUpdateContext,
  dt: number,
): number {
  let finishedCount = 0;

  for (const runner of ctx.runners) {
    // Distance to camera for animation culling
    const anchorX = runner.anchor.position.x;
    const anchorZ = runner.anchor.position.z;
    const dx = anchorX - ctx.cameraX;
    const dz = anchorZ - ctx.cameraZ;
    const distSq = dx * dx + dz * dz;
    const inRange = distSq < 200 * 200;

    if (runner.state === 'racing') {
      // --- Still racing ---
      const fraction = Math.min(1, ctx.elapsedSeconds / runner.finishSeconds);
      runner.fraction = fraction;

      const pos = positionAtFraction(ctx.pathPositions, ctx.pathCumDist, fraction);

      // Apply lateral lane offset perpendicular to path direction
      const rightX = Math.cos(pos.yaw);
      const rightZ = -Math.sin(pos.yaw);
      const finalX = pos.x + rightX * runner.laneOffset;
      const finalZ = pos.z + rightZ * runner.laneOffset;
      const groundY = ctx.getGroundY(finalX, finalZ);

      runner.anchor.position.x = finalX;
      runner.anchor.position.y = groundY;
      runner.anchor.position.z = finalZ;
      runner.model.root.rotation.y = pos.yaw;

      runner.animPhase += dt * runner.animSpeed;
      if (inRange) poseRunning(runner.model, runner.animPhase);

      // Transition to runoff when finished
      if (ctx.elapsedSeconds >= runner.finishSeconds) {
        runner.finished = true;
        runner.state = 'runoff';
        runner.runoffElapsed = 0;
        finishedCount++;
      }
    } else if (runner.state === 'runoff') {
      // --- Jogging past the finish to cheer spot ---
      finishedCount++;
      runner.runoffElapsed += dt;
      const runoffDuration = runner.runoffDistance / runner.runoffSpeed;
      const t = Math.min(1, runner.runoffElapsed / runoffDuration);

      // Interpolate from finish position toward cheer spot
      const fwdX = Math.sin(runner.finishYaw);
      const fwdZ = Math.cos(runner.finishYaw);
      const perpX = Math.cos(runner.finishYaw);
      const perpZ = -Math.sin(runner.finishYaw);
      // Start from finish + lane offset
      const startX = runner.finishX + perpX * runner.laneOffset;
      const startZ = runner.finishZ + perpZ * runner.laneOffset;
      const curX = startX + (runner.cheerX - startX) * t;
      const curZ = startZ + (runner.cheerZ - startZ) * t;
      const groundY = ctx.getGroundY(curX, curZ);

      runner.anchor.position.x = curX;
      runner.anchor.position.y = groundY;
      runner.anchor.position.z = curZ;

      // Gradually turn from forward direction to face back toward finish
      const forwardYaw = runner.finishYaw;
      const faceBackYaw = runner.finishYaw + Math.PI; // 180° turn
      // Smooth turn over the last 40% of the runoff
      const turnT = Math.max(0, (t - 0.6) / 0.4);
      runner.model.root.rotation.y = forwardYaw + turnT * Math.PI;

      // Keep running animation, slowing down
      const slowdown = 1 - t * 0.5; // slow to half pace
      runner.animPhase += dt * runner.animSpeed * slowdown;
      if (inRange) poseRunning(runner.model, runner.animPhase);

      if (t >= 1) {
        runner.state = 'cheering';
        runner.cheerPhase = runner.animPhase; // carry over phase
        // Final facing: toward the finish line
        runner.model.root.rotation.y = faceBackYaw;
      }
    } else {
      // --- Cheering ---
      finishedCount++;
      runner.cheerPhase += dt;

      const groundY = ctx.getGroundY(runner.cheerX, runner.cheerZ);

      // Compute arm-raise envelope (same cycle as poseCheering)
      const armCycle = runner.cheerCycleLength;
      const armRaiseDuration = 1.2;
      const cyclePos = ((runner.cheerPhase % armCycle) + armCycle) % armCycle;
      let armRaise = 0;
      if (cyclePos < armRaiseDuration) {
        armRaise = Math.sin((cyclePos / armRaiseDuration) * Math.PI);
      }

      // Bounce only when arms are raised
      const bounceFreq = 3.0;
      const bounceRaw = Math.sin(runner.cheerPhase * bounceFreq * Math.PI * 2);
      const bounce = Math.max(0, bounceRaw) * 0.15 * armRaise;
      runner.anchor.position.x = runner.cheerX;
      runner.anchor.position.y = groundY + bounce;
      runner.anchor.position.z = runner.cheerZ;

      // Keep facing finish
      runner.model.root.rotation.y = runner.finishYaw + Math.PI;

      if (inRange) poseCheering(runner.model, runner.cheerPhase, runner.cheerCycleLength);
    }
  }

  return finishedCount;
}

/**
 * Dispose all preview runner meshes and models.
 */
export function disposePreviewRunners(runners: PreviewRunner[]) {
  for (const runner of runners) {
    runner.model.root.dispose();
    runner.anchor.dispose();
  }
}
