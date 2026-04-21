import { For } from 'solid-js';
import levels from './levels';
import logoSrc from './assets/logo.png';

type GameMode = 'single' | 'host' | 'join';

interface TitleScreenProps {
  onSelectMode: (mode: GameMode, eventId: string) => void;
}

export function TitleScreen(props: TitleScreenProps) {
  const courseIds = Object.keys(levels).filter((id) => !levels[id].hide);

  return (
    <div id="title-screen">
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <div class="course-buttons">
          <For each={courseIds}>
            {(id) => {
              const level = levels[id];
              return (
                <div class="course-row">
                  <span class="course-name">{level.name}</span>
                  <div class="mode-buttons">
                    <button
                      class="course-btn mode-btn"
                      onClick={() => props.onSelectMode('single', id)}
                    >
                      Single Player
                    </button>
                    <button
                      class="course-btn mode-btn host-btn"
                      onClick={() => props.onSelectMode('host', id)}
                    >
                      Host Game
                    </button>
                    <button
                      class="course-btn mode-btn join-btn"
                      onClick={() => props.onSelectMode('join', id)}
                    >
                      Join Game
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
