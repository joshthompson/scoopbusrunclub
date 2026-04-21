import { For } from 'solid-js';
import levels from './levels';
import logoSrc from './assets/logo.png';

interface TitleScreenProps {
  onSelectCourse: (eventId: string) => void;
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
                <button
                  class="course-btn"
                  onClick={() => props.onSelectCourse(id)}
                >
                  {level.name}
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
