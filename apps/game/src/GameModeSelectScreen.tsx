import logoSrc from './assets/logo.png';
import { useMenuNav } from './useMenuNav';
import { MuteButton } from './MuteButton';

type SinglePlayerGameMode = 'bus-race' | 'parkrun' | 'bus-mode';

interface GameModeSelectScreenProps {
  courseName: string;
  onSelect: (mode: SinglePlayerGameMode) => void;
  onBack: () => void;
}

export function GameModeSelectScreen(props: GameModeSelectScreenProps) {
  const { isFocused, setFocusedIndex } = useMenuNav(() => 5, { onBack: props.onBack }); // mute + 3 modes + back
  setFocusedIndex(1);

  return (
    <div id="title-screen">
      <MuteButton focused={isFocused(0)} />
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <p class="lobby-course">{props.courseName}</p>
        <h2 class="screen-heading">Game Mode</h2>
        <div class="course-buttons">
          <button class="course-btn" classList={{ 'menu-focused': isFocused(1) }} onClick={() => props.onSelect('bus-race')}>
            🚌 Bus Race
          </button>
          <button class="course-btn runner-btn" classList={{ 'menu-focused': isFocused(2) }} onClick={() => props.onSelect('parkrun')}>
            🏃 Parkrun
          </button>
          <button class="course-btn pickup-btn" classList={{ 'menu-focused': isFocused(3) }} onClick={() => props.onSelect('bus-mode')}>
            🚌 Passenger Pickup
          </button>
        </div>
        <button class="course-btn cancel-btn back-btn" classList={{ 'menu-focused': isFocused(4) }} onClick={props.onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
