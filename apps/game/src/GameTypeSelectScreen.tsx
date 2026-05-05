/**
 * Game type selection screen — shown to the host after choosing "Host Game".
 *
 * Lets the host pick which multiplayer game mode to play:
 * - Bus Race (2+ players)
 * - Scoop Race (2+ players)
 * - Team Race (4+ players)
 * - Arena (3+ players)
 */
import logoSrc from './assets/logo.png';
import { HOST_GAME_TYPES, GAME_TYPE_LABELS, GAME_TYPE_DESCRIPTIONS, getGameModeConfig } from './game/modes';
import type { GameType } from './game/modes';

const GAME_TYPE_EMOJI: Record<string, string> = {
  'bus-race': '🚌',
  'scoop-race': '🏃',
  'team-race': '🏁',
  'arena': '🏟️',
};

interface GameTypeSelectScreenProps {
  onSelect: (gameType: GameType) => void;
  onBack: () => void;
  /** If set, only show game types with minPlayers <= this value */
  maxPlayers?: number;
  /** Optional heading override */
  heading?: string;
}

export function GameTypeSelectScreen(props: GameTypeSelectScreenProps) {
  const gameTypes = () => {
    const mp = props.maxPlayers;
    if (mp == null) return HOST_GAME_TYPES;
    return HOST_GAME_TYPES.filter((gt) => getGameModeConfig(gt).minPlayers <= mp);
  };

  return (
    <div id="title-screen">
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <h2 class="screen-heading">{props.heading ?? 'Choose Game Type'}</h2>
        <div class="course-buttons">
          {gameTypes().map((gt) => (
            <button
              class="course-btn game-type-btn"
              onClick={() => props.onSelect(gt)}
            >
              <span class="game-type-emoji">{GAME_TYPE_EMOJI[gt] ?? '🎮'}</span>
              <span class="game-type-label">{GAME_TYPE_LABELS[gt]}</span>
              <span class="game-type-desc">{GAME_TYPE_DESCRIPTIONS[gt]}</span>
            </button>
          ))}
        </div>
        <button class="course-btn cancel-btn back-btn" onClick={props.onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
