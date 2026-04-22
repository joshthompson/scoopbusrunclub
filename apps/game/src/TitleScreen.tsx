import logoSrc from './assets/logo.png';

type GameMode = 'single' | 'host' | 'join';

interface TitleScreenProps {
  onSelectMode: (mode: GameMode) => void;
}

export function TitleScreen(props: TitleScreenProps) {
  return (
    <div id="title-screen">
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <div class="course-buttons">
          <button class="course-btn" onClick={() => props.onSelectMode('single')}>
            Single Player
          </button>
          <button class="course-btn host-btn" onClick={() => props.onSelectMode('host')}>
            Host Game
          </button>
          <button class="course-btn join-btn" onClick={() => props.onSelectMode('join')}>
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}
