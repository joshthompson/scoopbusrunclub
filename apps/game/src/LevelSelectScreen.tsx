import { For } from 'solid-js';
import levels from './levels';
import logoSrc from './assets/logo.png';

interface LevelSelectScreenProps {
  onSelect: (levelId: string) => void;
  onBack: () => void;
}

export function LevelSelectScreen(props: LevelSelectScreenProps) {
  const courseIds = Object.keys(levels).filter((id) => !levels[id].hide);

  return (
    <div id="title-screen">
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <h2 class="screen-heading">Select Course</h2>
        <div class="course-buttons">
          <For each={courseIds}>
            {(id) => {
              const level = levels[id];
              return (
                <button class="course-btn" onClick={() => props.onSelect(id)}>
                  {level.name}
                </button>
              );
            }}
          </For>
        </div>
        <button class="course-btn cancel-btn back-btn" onClick={props.onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
