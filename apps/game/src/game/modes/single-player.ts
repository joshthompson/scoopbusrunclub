/**
 * Single Player mode — Bus Driver or Runner.
 *
 * The player picks their role on the character select screen.
 * Standard race along a course with NPC runners.
 */
import type { GameModeConfig, PlayerRoleAssignment } from './types';

export const singleBusMode: GameModeConfig = {
  type: 'single-bus',
  label: 'Bus Driver',
  description: 'Drive the bus and scoop up runners',
  minPlayers: 1,
  maxPlayers: 1,
  usesLevelSelect: true,
  hostCanAssignDriver: false,
  hasTeams: false,

  assignRoles() {
    const map = new Map<number, PlayerRoleAssignment>();
    map.set(1, { playerIndex: 1, role: 'bus' });
    return map;
  },

  getRoleForPlayer() {
    return 'bus';
  },
};

export const singleRunnerMode: GameModeConfig = {
  type: 'single-runner',
  label: 'Runner',
  description: 'Run the course and dodge the bus',
  minPlayers: 1,
  maxPlayers: 1,
  usesLevelSelect: true,
  hostCanAssignDriver: false,
  hasTeams: false,

  assignRoles() {
    const map = new Map<number, PlayerRoleAssignment>();
    map.set(1, { playerIndex: 1, role: 'runner' });
    return map;
  },

  getRoleForPlayer() {
    return 'runner';
  },
};
