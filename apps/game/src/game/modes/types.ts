/**
 * Game mode type definitions.
 *
 * Each multiplayer game type has its own config file in this directory.
 * The GameType union and shared interfaces live here.
 */

export type GameType =
  | 'single-bus'     // Single player as bus driver
  | 'single-runner'  // Single player as runner
  | 'bus-race'       // 2+ players — all buses race to finish
  | 'scoop-race'     // 2+ players — 1 bus, rest are runners
  | 'team-race'      // 4+ players — 2 teams each with 1 bus + runners
  | 'arena';         // 3+ players — stuck-in-the-mud in an arena

export type TeamColor = 'yellow' | 'blue';

export interface TeamAssignment {
  team: TeamColor;
  role: 'bus' | 'runner';
}

/**
 * Role assignment for a player in a game.
 * playerIndex is 1-based (1 = host).
 */
export interface PlayerRoleAssignment {
  playerIndex: number;
  role: 'bus' | 'runner';
  team?: TeamColor;
}

/** Result data shown on the finish screen */
export interface FinishResult {
  /** Ordered list of players/teams with their times */
  leaderboard: LeaderboardEntry[];
  /** Optional summary text (e.g. "Blue Team wins!") */
  summary?: string;
}

export interface LeaderboardEntry {
  label: string;
  time: number;
  finished: boolean;
  color: string;
  playerIndex?: number;
  team?: TeamColor;
}

/**
 * Configuration and logic for a game mode.
 * Each mode file exports a const implementing this interface.
 */
export interface GameModeConfig {
  type: GameType;
  label: string;
  description: string;
  /** Minimum players needed (including host) */
  minPlayers: number;
  /** Maximum players allowed */
  maxPlayers: number;
  /** Whether this mode uses level/course selection */
  usesLevelSelect: boolean;
  /** Whether the host can assign the bus driver in the lobby */
  hostCanAssignDriver: boolean;
  /** Whether this mode has teams */
  hasTeams: boolean;
  /** Level ID to use when usesLevelSelect is false (e.g. arena uses kristineberg) */
  defaultLevelId?: string;

  /**
   * Assign roles to all players.
   * @param playerCount Total player count (including host)
   * @param driverIndex Player index of the designated driver (1-based), if host set one
   * @param teamAssignments Optional manual team assignments from the lobby
   * @returns Map of playerIndex → role assignment
   */
  assignRoles(
    playerCount: number,
    driverIndex?: number,
    teamAssignments?: Map<number, TeamAssignment>,
  ): Map<number, PlayerRoleAssignment>;

  /**
   * Determine the role for a specific player index.
   * Convenience wrapper — calls assignRoles internally if needed.
   */
  getRoleForPlayer(playerIndex: number, playerCount: number, driverIndex?: number): 'bus' | 'runner';
}

/** Human-readable labels for each game type (for UI) */
export const GAME_TYPE_LABELS: Record<GameType, string> = {
  'single-bus': 'Single Player (Bus)',
  'single-runner': 'Single Player (Runner)',
  'bus-race': 'Bus Race',
  'scoop-race': 'Scoop Race',
  'team-race': 'Team Race',
  'arena': 'Arena',
};

/** Short descriptions for the game type selection screen */
export const GAME_TYPE_DESCRIPTIONS: Record<GameType, string> = {
  'single-bus': 'Drive the bus and scoop up runners',
  'single-runner': 'Run the course and dodge the bus',
  'bus-race': 'All players are buses — race to the finish!',
  'scoop-race': 'One bus, rest are runners — classic scoop!',
  'team-race': 'Two teams with a bus each — best average runner time wins',
  'arena': 'Stuck in the mud! Bus tries to freeze all runners',
};

/** Multiplayer game types that can be selected by the host */
export const HOST_GAME_TYPES: GameType[] = [
  'bus-race',
  'scoop-race',
  'team-race',
  'arena',
];
