/**
 * Game modes barrel export.
 *
 * Each game mode is isolated in its own file.
 * This index re-exports everything for convenient imports.
 */

export * from './types';
export { singleBusMode, singleRunnerMode } from './single-player';
export { busRaceMode } from './bus-race';
export { scoopRaceMode } from './scoop-race';
export { teamRaceMode, computeTeamRaceResult } from './team-race';
export {
  arenaMode,
  createArenaState,
  getNextArenaDriver,
  updateArenaState,
  UNSTICK_DISTANCE,
  type ArenaState,
  type ArenaRunnerState,
} from './arena';

import type { GameModeConfig, GameType } from './types';
import { singleBusMode, singleRunnerMode } from './single-player';
import { busRaceMode } from './bus-race';
import { scoopRaceMode } from './scoop-race';
import { teamRaceMode } from './team-race';
import { arenaMode } from './arena';

/** Registry of all game mode configs keyed by GameType */
export const GAME_MODES: Record<GameType, GameModeConfig> = {
  'single-bus': singleBusMode,
  'single-runner': singleRunnerMode,
  'bus-race': busRaceMode,
  'scoop-race': scoopRaceMode,
  'team-race': teamRaceMode,
  'arena': arenaMode,
};

/** Look up the config for a game type */
export function getGameModeConfig(type: GameType): GameModeConfig {
  return GAME_MODES[type];
}
