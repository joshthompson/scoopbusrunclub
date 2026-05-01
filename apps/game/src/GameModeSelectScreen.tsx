import logoSrc from './assets/logo.png';

type SinglePlayerGameMode = 'bus-race' | 'parkrun' | 'bus-mode';

interface GameModeSelectScreenProps {
  courseName: string;
  onSelect: (mode: SinglePlayerGameMode) => void;
  onBack: () => void;
}

export function GameModeSelectScreen(props: GameModeSelectScreenProps) {
  return (
    <div id="title-screen">
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <p class="lobby-course">{props.courseName}</p>
        <h2 class="screen-heading">Game Mode</h2>
        <div class="course-buttons">
          <button class="course-btn" onClick={() => props.onSelect('bus-race')}>
            🚌 Bus Race
          </button>
          <button class="course-btn runner-btn" onClick={() => props.onSelect('parkrun')}>
            🏃 Parkrun
          </button>
          <button class="course-btn pickup-btn" onClick={() => props.onSelect('bus-mode')}>
            🚌 Passenger Pickup
          </button>
        </div>
        <button class="course-btn cancel-btn back-btn" onClick={props.onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
