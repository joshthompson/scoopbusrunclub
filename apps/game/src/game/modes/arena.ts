/**
 * Arena mode — 3+ players, "Stuck in the Mud" in a closed arena.
 *
 * Uses a special arena map (running track in a stadium).
 * One player is the bus, all others are runners.
 *
 * The bus tries to scoop all runners. When a runner is scooped they become
 * "stuck" — frozen in place with arms stretched out and legs apart
 * (like the playground game "Stuck in the Mud").
 *
 * A stuck runner can be freed when another (free) runner touches them.
 *
 * The game ends when ALL runners are stuck simultaneously.
 * A timer shows how long it took the bus to freeze everyone.
 *
 * On replay, the driver role is shuffled to another player.
 * On the lobby screen the host can click to set the initial driver.
 */
import type { GameModeConfig, PlayerRoleAssignment } from './types';

/** Arena runner states */
export type ArenaRunnerState = 'free' | 'stuck';

/**
 * Arena-specific state tracked during gameplay.
 * This is created alongside the Game instance for arena mode.
 */
export interface ArenaState {
  /** Map of playerIndex → stuck state */
  runnerStates: Map<number, ArenaRunnerState>;
  /** Elapsed time since the round started */
  roundTimer: number;
  /** Whether the round is over (all runners stuck) */
  roundOver: boolean;
  /** The time it took to freeze all runners (set when roundOver becomes true) */
  freezeTime: number;
  /** Player index of the current bus driver */
  driverIndex: number;
  /** History of driver rotations for reshuffling on replay */
  driverHistory: number[];
}

export function createArenaState(driverIndex: number, playerCount: number): ArenaState {
  const runnerStates = new Map<number, ArenaRunnerState>();
  for (let i = 1; i <= playerCount; i++) {
    if (i !== driverIndex) {
      runnerStates.set(i, 'free');
    }
  }
  return {
    runnerStates,
    roundTimer: 0,
    roundOver: false,
    freezeTime: 0,
    driverIndex,
    driverHistory: [driverIndex],
  };
}

/**
 * Pick the next driver for a replay, cycling through players who haven't
 * driven yet. Falls back to the player who drove longest ago.
 */
export function getNextArenaDriver(state: ArenaState, playerCount: number): number {
  // Find players who haven't been driver yet
  const allPlayers = Array.from({ length: playerCount }, (_, i) => i + 1);
  const notYetDriven = allPlayers.filter(p => !state.driverHistory.includes(p));

  if (notYetDriven.length > 0) {
    // Pick randomly from those who haven't driven
    return notYetDriven[Math.floor(Math.random() * notYetDriven.length)];
  }

  // Everyone has driven — pick the one who drove longest ago
  // (earliest in driverHistory that isn't the current driver)
  for (const pastDriver of state.driverHistory) {
    if (pastDriver !== state.driverIndex) return pastDriver;
  }
  // Fallback: just pick someone different
  return state.driverIndex === 1 ? 2 : 1;
}

/**
 * Update arena state for one frame.
 * @param stuckRunners Set of playerIndices that were just scooped this frame
 * @param freedRunners Set of playerIndices that were just freed this frame
 * @returns true if the round just ended
 */
export function updateArenaState(
  state: ArenaState,
  dt: number,
  stuckRunners: number[],
  freedRunners: number[],
): boolean {
  if (state.roundOver) return false;

  state.roundTimer += dt;

  // Apply new stuck events
  for (const idx of stuckRunners) {
    state.runnerStates.set(idx, 'stuck');
  }

  // Apply freed events
  for (const idx of freedRunners) {
    state.runnerStates.set(idx, 'free');
  }

  // Check if all runners are stuck
  const allStuck = [...state.runnerStates.values()].every(s => s === 'stuck');
  if (allStuck && state.runnerStates.size > 0) {
    state.roundOver = true;
    state.freezeTime = state.roundTimer;
    return true;
  }

  return false;
}

/** Distance threshold for a free runner to "unstick" a stuck runner */
export const UNSTICK_DISTANCE = 2.0;

export const arenaMode: GameModeConfig = {
  type: 'arena',
  label: 'Arena',
  description: 'Stuck in the mud! Bus tries to freeze all runners',
  minPlayers: 3,
  maxPlayers: 8,
  usesLevelSelect: false, // uses special arena map
  hostCanAssignDriver: true,
  hasTeams: false,
  defaultLevelId: 'kristineberg',

  assignRoles(playerCount: number, driverIndex?: number) {
    const map = new Map<number, PlayerRoleAssignment>();
    const driver = driverIndex ?? 1;

    for (let i = 1; i <= playerCount; i++) {
      map.set(i, {
        playerIndex: i,
        role: i === driver ? 'bus' : 'runner',
      });
    }
    return map;
  },

  getRoleForPlayer(playerIndex: number, _playerCount: number, driverIndex?: number) {
    const driver = driverIndex ?? 1;
    return playerIndex === driver ? 'bus' : 'runner';
  },
};
