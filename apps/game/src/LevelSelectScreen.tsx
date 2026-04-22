import { For, createSignal, onMount, onCleanup } from 'solid-js';
import levels from './levels';
import logoSrc from './assets/logo.png';

interface LevelSelectScreenProps {
  onSelect: (levelId: string) => void;
  onBack: () => void;
}

export function LevelSelectScreen(props: LevelSelectScreenProps) {
  const [showHidden, setShowHidden] = createSignal(false);

  const courseIds = () =>
    Object.keys(levels).filter((id) => showHidden() || !levels[id].hide);

  // Tap space 5 times in a row to reveal hidden courses
  let spaceCount = 0;
  let lastSpaceTime = 0;
  const SECRET_TAPS = 5;
  const TAP_TIMEOUT = 800; // ms — reset if gap between taps exceeds this

  function onKeyDown(e: KeyboardEvent) {
    if (e.code !== 'Space') {
      spaceCount = 0;
      return;
    }
    const now = Date.now();
    if (now - lastSpaceTime > TAP_TIMEOUT) spaceCount = 0;
    lastSpaceTime = now;
    spaceCount++;
    if (spaceCount >= SECRET_TAPS) {
      setShowHidden(true);
      spaceCount = 0;
    }
  }

  onMount(() => window.addEventListener('keydown', onKeyDown));
  onCleanup(() => window.removeEventListener('keydown', onKeyDown));

  return (
    <div id="title-screen">
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <h2 class="screen-heading">Select Course</h2>
        <div class="course-buttons">
          <For each={courseIds()}>
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
