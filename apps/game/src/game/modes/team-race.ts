/**
 * Team Race mode — 4+ players, two teams.
 *
 * Teams: Yellow and Blue.
 * Each team has 1 bus and the rest are runners.
 *
 * Runner objective: finish the race as fast as possible.
 * Bus objective: scoop up runners from the OTHER team to slow them down.
 *
 * Winning team: best average runner finish time.
 *
 * On the lobby screen the host can adjust teams and set the driver for each team.
 */
import type { GameModeConfig, PlayerRoleAssignment, TeamAssignment, TeamColor } from './types';

/** Default team assignment: split players evenly, first player on each team is driver */
function defaultTeamAssignments(playerCount: number): Map<number, TeamAssignment> {
  const assignments = new Map<number, TeamAssignment>();
  const half = Math.ceil(playerCount / 2);

  for (let i = 1; i <= playerCount; i++) {
    const team: TeamColor = i <= half ? 'yellow' : 'blue';
    // First player on each team is the driver
    const isFirstOnTeam = i === 1 || i === half + 1;
    assignments.set(i, {
      team,
      role: isFirstOnTeam ? 'bus' : 'runner',
    });
  }
  return assignments;
}

export const teamRaceMode: GameModeConfig = {
  type: 'team-race',
  label: 'Team Race',
  description: 'Two teams with a bus each — best average runner time wins',
  minPlayers: 4,
  maxPlayers: 8,
  usesLevelSelect: true,
  hostCanAssignDriver: true,
  hasTeams: true,

  assignRoles(
    playerCount: number,
    _driverIndex?: number,
    teamAssignments?: Map<number, TeamAssignment>,
  ) {
    const map = new Map<number, PlayerRoleAssignment>();
    const teams = teamAssignments ?? defaultTeamAssignments(playerCount);

    for (let i = 1; i <= playerCount; i++) {
      const ta = teams.get(i);
      if (ta) {
        map.set(i, {
          playerIndex: i,
          role: ta.role,
          team: ta.team,
        });
      } else {
        // Fallback: assign to smaller team as runner
        const yellowCount = [...teams.values()].filter(t => t.team === 'yellow').length;
        const blueCount = [...teams.values()].filter(t => t.team === 'blue').length;
        const team: TeamColor = yellowCount <= blueCount ? 'yellow' : 'blue';
        map.set(i, {
          playerIndex: i,
          role: 'runner',
          team,
        });
      }
    }
    return map;
  },

  getRoleForPlayer(playerIndex: number, playerCount: number, _driverIndex?: number) {
    const teams = defaultTeamAssignments(playerCount);
    return teams.get(playerIndex)?.role ?? 'runner';
  },
};

/**
 * Compute the winning team based on average runner finish times.
 * @returns The winning team color, or null if not all runners finished
 */
export function computeTeamRaceResult(
  assignments: Map<number, PlayerRoleAssignment>,
  finishTimes: Map<number, number>,
): { winner: TeamColor | 'tie'; yellowAvg: number; blueAvg: number } | null {
  const yellowTimes: number[] = [];
  const blueTimes: number[] = [];

  for (const [playerIdx, assignment] of assignments) {
    if (assignment.role !== 'runner') continue;
    const time = finishTimes.get(playerIdx);
    if (time === undefined) return null; // Not all runners finished yet

    if (assignment.team === 'yellow') {
      yellowTimes.push(time);
    } else {
      blueTimes.push(time);
    }
  }

  if (yellowTimes.length === 0 || blueTimes.length === 0) return null;

  const yellowAvg = yellowTimes.reduce((a, b) => a + b, 0) / yellowTimes.length;
  const blueAvg = blueTimes.reduce((a, b) => a + b, 0) / blueTimes.length;

  let winner: TeamColor | 'tie';
  if (Math.abs(yellowAvg - blueAvg) < 0.5) {
    winner = 'tie';
  } else {
    winner = yellowAvg < blueAvg ? 'yellow' : 'blue';
  }

  return { winner, yellowAvg, blueAvg };
}
