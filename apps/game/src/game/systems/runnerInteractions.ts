/**
 * Runner social interactions: waving and high-fives.
 *
 * When two runners (player ↔ NPC, or NPC ↔ NPC) approach each other
 * they wave. If they pass very close they high-five instead.
 */

import type { Vector3 } from '@babylonjs/core';
import { poseWaving, poseHighFive } from '../objects/RunnerModel';
import type { Runner, RunnerInteraction } from '../types';
import {
  WAVE_TRIGGER_DISTANCE,
  HIGH_FIVE_TRIGGER_DISTANCE,
  WAVE_DURATION,
  HIGH_FIVE_DURATION,
  INTERACTION_COOLDOWN,
  INTERACTION_CLOSING_SPEED,
} from '../constants';

// ── Per-pair cooldown tracker ──

/** Key = sorted pair of IDs (e.g. "p|3" or "2|5") */
const pairCooldowns = new Map<string, number>();

function pairKey(a: string | number, b: string | number): string {
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? `${sa}|${sb}` : `${sb}|${sa}`;
}

function isPairReady(a: string | number, b: string | number): boolean {
  const cd = pairCooldowns.get(pairKey(a, b));
  return cd == null || cd <= 0;
}

function startPairCooldown(a: string | number, b: string | number) {
  pairCooldowns.set(pairKey(a, b), INTERACTION_COOLDOWN);
}

// ── Helpers ──

/** Compute closing speed between two points (positive = getting closer). */
function closingSpeed(
  ax: number, az: number, aVx: number, aVz: number,
  bx: number, bz: number, bVx: number, bVz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.001) return 0;
  // Relative velocity projected onto the line between them
  const relVx = bVx - aVx;
  const relVz = bVz - aVz;
  // Negative dot → closing (B moving toward A relative to A)
  return -(relVx * dx + relVz * dz) / dist;
}

/** Determine which side `other` is relative to a runner facing yaw. */
function sideOfOther(
  myX: number, myZ: number, myYaw: number,
  otherX: number, otherZ: number,
): number {
  // Right vector for yaw
  const rightX = Math.cos(myYaw);
  const rightZ = -Math.sin(myYaw);
  const dx = otherX - myX;
  const dz = otherZ - myZ;
  return (rightX * dx + rightZ * dz) >= 0 ? 1 : -1;
}

// ── Public API ──

export interface PlayerRunnerState {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  /** Currently in a state that allows interactions (running on the ground) */
  canInteract: boolean;
  /** Current interaction (written back by updateRunnerInteractions) */
  interaction: RunnerInteraction;
  interactionTimer: number;
  interactionSide: number;
}

/**
 * Call once per frame, after runner movement but before pose application.
 * Detects new interactions and ticks existing ones.
 */
export function updateRunnerInteractions(
  runners: Runner[],
  player: PlayerRunnerState | null,
  dt: number,
): void {
  // 1. Tick cooldowns
  for (const [key, cd] of pairCooldowns) {
    const next = cd - dt;
    if (next <= 0) pairCooldowns.delete(key);
    else pairCooldowns.set(key, next);
  }

  // 2. Tick existing NPC interaction timers & clear expired
  for (const runner of runners) {
    if (runner.interaction !== 'none') {
      runner.interactionTimer -= dt;
      if (runner.interactionTimer <= 0) {
        runner.interaction = 'none';
        runner.interactionTimer = 0;
      }
    }
  }

  // Tick player interaction timer
  if (player && player.interaction !== 'none') {
    player.interactionTimer -= dt;
    if (player.interactionTimer <= 0) {
      player.interaction = 'none';
      player.interactionTimer = 0;
    }
  }

  // 3. Detect new interactions — player ↔ NPC
  if (player && player.canInteract && player.interaction === 'none') {
    const pVx = Math.sin(player.yaw) * player.speed;
    const pVz = Math.cos(player.yaw) * player.speed;

    for (let i = 0; i < runners.length; i++) {
      const r = runners[i];
      if (r.state !== 'running') continue;
      if (r.interaction !== 'none') continue;
      if (!isPairReady('p', i)) continue;

      const rPos = r.mesh.position;
      const dx = rPos.x - player.x;
      const dz = rPos.z - player.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > WAVE_TRIGGER_DISTANCE) continue;

      // Runner velocity from facing direction
      const rYaw = r.mesh.rotation.y;
      const rVx = Math.sin(rYaw) * r.speed;
      const rVz = Math.cos(rYaw) * r.speed;

      const closing = closingSpeed(
        player.x, player.z, pVx, pVz,
        rPos.x, rPos.z, rVx, rVz,
      );
      if (closing < INTERACTION_CLOSING_SPEED) continue;

      // Determine interaction type
      let type: RunnerInteraction;
      let duration: number;
      if (dist < HIGH_FIVE_TRIGGER_DISTANCE) {
        type = 'highfive';
        duration = HIGH_FIVE_DURATION;
      } else {
        type = 'waving';
        duration = WAVE_DURATION;
      }

      // Determine sides
      const playerSide = sideOfOther(player.x, player.z, player.yaw, rPos.x, rPos.z);
      const runnerSide = sideOfOther(rPos.x, rPos.z, rYaw, player.x, player.z);

      // Set states
      player.interaction = type;
      player.interactionTimer = duration;
      player.interactionSide = playerSide;

      r.interaction = type;
      r.interactionTimer = duration;
      r.interactionSide = runnerSide;

      startPairCooldown('p', i);
      break; // one interaction per frame for the player
    }
  }

  // 4. Detect NPC ↔ NPC interactions (limit checks for perf)
  const maxPairChecks = 80;
  let checks = 0;
  for (let i = 0; i < runners.length && checks < maxPairChecks; i++) {
    const a = runners[i];
    if (a.state !== 'running' || a.interaction !== 'none') continue;

    const aPos = a.mesh.position;
    const aYaw = a.mesh.rotation.y;
    const aVx = Math.sin(aYaw) * a.speed;
    const aVz = Math.cos(aYaw) * a.speed;

    for (let j = i + 1; j < runners.length && checks < maxPairChecks; j++) {
      checks++;
      const b = runners[j];
      if (b.state !== 'running' || b.interaction !== 'none') continue;
      if (!isPairReady(i, j)) continue;

      const bPos = b.mesh.position;
      const dx = bPos.x - aPos.x;
      const dz = bPos.z - aPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > WAVE_TRIGGER_DISTANCE) continue;

      const bYaw = b.mesh.rotation.y;
      const bVx = Math.sin(bYaw) * b.speed;
      const bVz = Math.cos(bYaw) * b.speed;

      const closing = closingSpeed(aPos.x, aPos.z, aVx, aVz, bPos.x, bPos.z, bVx, bVz);
      if (closing < INTERACTION_CLOSING_SPEED) continue;

      let type: RunnerInteraction;
      let duration: number;
      if (dist < HIGH_FIVE_TRIGGER_DISTANCE) {
        type = 'highfive';
        duration = HIGH_FIVE_DURATION;
      } else {
        type = 'waving';
        duration = WAVE_DURATION;
      }

      a.interaction = type;
      a.interactionTimer = duration;
      a.interactionSide = sideOfOther(aPos.x, aPos.z, aYaw, bPos.x, bPos.z);

      b.interaction = type;
      b.interactionTimer = duration;
      b.interactionSide = sideOfOther(bPos.x, bPos.z, bYaw, aPos.x, aPos.z);

      startPairCooldown(i, j);
      break; // one new interaction per NPC per frame
    }
  }
}

/**
 * Apply interaction pose to an NPC runner that is currently interacting.
 * Call AFTER the normal `poseRunning` call so we override arm positions.
 * Returns true if an interaction pose was applied (caller can skip normal pose).
 */
export function applyRunnerInteractionPose(runner: Runner): boolean {
  if (runner.interaction === 'none') return false;

  const totalDuration = runner.interaction === 'highfive' ? HIGH_FIVE_DURATION : WAVE_DURATION;
  const t = 1 - runner.interactionTimer / totalDuration; // 0→1

  if (runner.interaction === 'waving') {
    poseWaving(runner.model, runner.animPhase, t, runner.interactionSide);
  } else {
    poseHighFive(runner.model, t, runner.interactionSide);
  }
  return true;
}
