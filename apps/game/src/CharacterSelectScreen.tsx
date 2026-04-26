import { createSignal, Show, For, onMount } from 'solid-js';
import logoSrc from './assets/logo.png';
import {
  BUS_COLOR_OPTIONS,
  RUNNER_PRESETS,
  RANDOM_RUNNER_ID,
  type CharacterSelection,
  type RunnerPreset,
} from './game/characters';
import { getRunnerPreviewUrl } from './RunnerPreview3D';

type PlayerRole = 'bus' | 'runner';

interface CharacterSelectScreenProps {
  /** Which role the player will have (determines bus vs runner grid). */
  role: PlayerRole;
  courseName: string;
  /** Called when any selection within taken set should be checked. */
  takenBusColors?: string[];
  takenRunnerIds?: string[];
  onSelect: (selection: CharacterSelection) => void;
  onBack: () => void;
  /** If true, show a "waiting for players…" overlay after selection. */
  waiting?: boolean;
}

// ── Runner preview (3D rendered image) ──

function RunnerPreview(props: { preset: RunnerPreset }) {
  const [src, setSrc] = createSignal<string>('');

  onMount(async () => {
    // Render the 3D preview (cached after first call)
    const url = await getRunnerPreviewUrl(props.preset.id, props.preset.appearance);
    setSrc(url);
  });

  return (
    <div class="runner-preview">
      <Show when={src()}>
        <img src={src()} alt={props.preset.name} class="runner-preview-img" />
      </Show>
    </div>
  );
}

export function CharacterSelectScreen(props: CharacterSelectScreenProps) {
  const [selected, setSelected] = createSignal<CharacterSelection | null>(null);

  const isBus = () => props.role === 'bus';

  function isBusTaken(id: string) {
    return props.takenBusColors?.includes(id) ?? false;
  }

  function isRunnerTaken(id: string) {
    return props.takenRunnerIds?.includes(id) ?? false;
  }

  function handleBusClick(id: string) {
    if (isBusTaken(id)) return;
    const sel: CharacterSelection = { type: 'bus', busColorId: id };
    setSelected(sel);
    props.onSelect(sel);
  }

  function handleRunnerClick(id: string) {
    if (id !== RANDOM_RUNNER_ID && isRunnerTaken(id)) return;
    const sel: CharacterSelection = { type: 'runner', runnerId: id };
    setSelected(sel);
    props.onSelect(sel);
  }

  return (
    <div id="title-screen">
      <div class="title-content char-select-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <Show when={props.courseName}>
          <p class="lobby-course">{props.courseName}</p>
        </Show>

        {/* ─── Waiting overlay ─── */}
        <Show when={props.waiting && selected()}>
          <h2 class="screen-heading">Waiting for players…</h2>
          <p class="lobby-status" style={{ animation: 'blink 1.5s ease-in-out infinite' }}>
            Game will start when the host is ready
          </p>
          <button class="course-btn cancel-btn back-btn" onClick={props.onBack}>
            Cancel
          </button>
        </Show>

        {/* ─── Bus colour grid ─── */}
        <Show when={isBus() && !(props.waiting && selected())}>
          <h2 class="screen-heading">Select Bus</h2>
          <div class="char-grid bus-grid">
            <For each={BUS_COLOR_OPTIONS}>{(opt) => {
              const taken = () => isBusTaken(opt.id);
              const active = () => (selected() as any)?.busColorId === opt.id;
              return (
                <button
                  class="char-tile"
                  classList={{ taken: taken(), active: active() }}
                  disabled={taken()}
                  onClick={() => handleBusClick(opt.id)}
                  title={opt.name}
                >
                  <div class="bus-swatch" style={{ background: opt.cssColor }} />
                  <span class="char-tile-label">{opt.name}</span>
                </button>
              );
            }}</For>
          </div>
          <button class="course-btn cancel-btn back-btn" onClick={props.onBack}>
            Back
          </button>
        </Show>

        {/* ─── Runner grid ─── */}
        <Show when={!isBus() && !(props.waiting && selected())}>
          <h2 class="screen-heading">Select Runner</h2>
          <div class="char-grid runner-grid">
            {/* Random option */}
            <button
              class="char-tile"
              classList={{ active: (selected() as any)?.runnerId === RANDOM_RUNNER_ID }}
              onClick={() => handleRunnerClick(RANDOM_RUNNER_ID)}
              title="Random"
            >
              <div class="runner-preview random-preview">🎲</div>
              <span class="char-tile-label">Random</span>
            </button>

            <For each={[...RUNNER_PRESETS].sort((a, b) => a.name.localeCompare(b.name))}>{(preset) => {
              const taken = () => isRunnerTaken(preset.id);
              const active = () => (selected() as any)?.runnerId === preset.id;
              return (
                <button
                  class="char-tile"
                  classList={{ taken: taken(), active: active() }}
                  disabled={taken()}
                  onClick={() => handleRunnerClick(preset.id)}
                  title={preset.name}
                >
                  <RunnerPreview preset={preset} />
                  <span class="char-tile-label">{preset.name}</span>
                </button>
              );
            }}</For>
          </div>
          <button class="course-btn cancel-btn back-btn" onClick={props.onBack}>
            Back
          </button>
        </Show>
      </div>
    </div>
  );
}
