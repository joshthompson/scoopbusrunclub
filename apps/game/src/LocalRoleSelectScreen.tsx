/**
 * Local Role Select Screen — shown before a local multiplayer game.
 *
 * P1 picks which role they want (bus or runner).
 * P2 automatically gets the other role.
 * Only shown for game types that have distinct roles (i.e. scoop-race).
 * For bus-race, both players get the same role automatically — this screen is skipped.
 */
import logoSrc from './assets/logo.png';
import type { GameType } from './game/modes';
import { useMenuNav } from './useMenuNav';
import { MuteButton } from './MuteButton';

interface LocalRoleSelectScreenProps {
  gameType: GameType;
  onSelect: (p1Role: 'bus' | 'runner') => void;
  onBack: () => void;
}

export function LocalRoleSelectScreen(props: LocalRoleSelectScreenProps) {
  const { isFocused, setFocusedIndex } = useMenuNav(() => 4, { onBack: props.onBack }); // mute + 2 roles + back
  setFocusedIndex(1);

  return (
    <div id="title-screen">
      <MuteButton focused={isFocused(0)} />
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <h2 class="screen-heading">Local Multiplayer Roles</h2>
        <p class="lobby-course" style={{ 'font-size': 'clamp(12px, 1.8vw, 16px)', opacity: '0.75' }}>
          P1 — WASD + Space &nbsp;|&nbsp; P2 — Arrow Keys + Enter
        </p>
        <p class="lobby-course">Who is Player 1?</p>
        <div class="course-buttons">
          <button
            class="course-btn host-btn"
            classList={{ 'menu-focused': isFocused(1) }}
            onClick={() => props.onSelect('bus')}
          >
            <span style={{ 'font-size': '1.4em' }}>🚌</span>
            <br />
            P1 = Bus Driver<br />
            <small>P2 = Runner</small>
          </button>
          <button
            class="course-btn runner-btn"
            classList={{ 'menu-focused': isFocused(2) }}
            onClick={() => props.onSelect('runner')}
          >
            <span style={{ 'font-size': '1.4em' }}>🏃</span>
            <br />
            P1 = Runner<br />
            <small>P2 = Bus Driver</small>
          </button>
        </div>
        <button class="course-btn cancel-btn back-btn" classList={{ 'menu-focused': isFocused(3) }} onClick={props.onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
