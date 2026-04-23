/**
 * Scoop Race mode — 2+ players, one bus and the rest are runners.
 *
 * The host (or designated driver) controls the bus.
 * All other players are runners trying to finish the course.
 * The bus tries to scoop up the runners to slow them down.
 */
import type { GameModeConfig, PlayerRoleAssignment } from './types';

export const scoopRaceMode: GameModeConfig = {
  type: 'scoop-race',
  label: 'Scoop Race',
  description: 'One bus, rest are runners — classic scoop!',
  items: false,
  minPlayers: 2,
  maxPlayers: 4,
  usesLevelSelect: true,
  hostCanAssignDriver: true,
  hasTeams: false,

  assignRoles(playerCount: number, driverIndex?: number) {
    const map = new Map<number, PlayerRoleAssignment>();
    const driver = driverIndex ?? 1; // default: host is the bus

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
