/**
 * Single Player — Bus Mode.
 *
 * The player drives a bus picking up cheering passengers and
 * delivering them to marked destinations before the timer runs out.
 */
import type { GameModeConfig, PlayerRoleAssignment } from './types';

export const singleBusModMode: GameModeConfig = {
  type: 'single-bus-mode',
  label: 'Bus Mode',
  description: 'Pick up passengers and deliver them before time runs out!',
  items: false,
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
