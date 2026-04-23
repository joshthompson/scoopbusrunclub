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
import { HOST_GAME_TYPES, GAME_TYPE_LABELS, GAME_TYPE_DESCRIPTIONS } from './game/modes';
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
}

export function GameTypeSelectScreen(props: GameTypeSelectScreenProps) {
  return (
    <div id="title-screen">
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <h2 class="screen-heading">Choose Game Type</h2>
        <div class="course-buttons">
          {HOST_GAME_TYPES.map((gt) => (
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
