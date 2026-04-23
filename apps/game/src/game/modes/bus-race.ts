/**
 * Bus Race mode — 2+ players, all players are buses racing to the end.
 *
 * Every player drives a bus. NPC runners are on the course as usual.
 * First bus to pass all gates wins.
 */
import type { GameModeConfig, PlayerRoleAssignment } from './types';

export const busRaceMode: GameModeConfig = {
  type: 'bus-race',
  label: 'Bus Race',
  description: 'All players are buses — race to the finish!',
  items: false,
  minPlayers: 2,
  maxPlayers: 4,
  usesLevelSelect: true,
  hostCanAssignDriver: false,
  hasTeams: false,

  assignRoles(playerCount: number) {
    const map = new Map<number, PlayerRoleAssignment>();
    for (let i = 1; i <= playerCount; i++) {
      map.set(i, { playerIndex: i, role: 'bus' });
    }
    return map;
  },

  getRoleForPlayer() {
    // Everyone is a bus in bus race
    return 'bus';
  },
};
