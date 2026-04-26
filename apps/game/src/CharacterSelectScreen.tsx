import { createSignal, Show, For, onMount } from 'solid-js';
import logoSrc from './assets/logo.png';
import {
  BUS_COLOR_OPTIONS,
  RUNNER_PRESETS,
  RANDOM_RUNNER_ID,
  isCorgiPreset,
  type CharacterSelection,
  type RunnerPreset,
} from './game/characters';
import { getRunnerPreviewUrl, getCorgiPreviewUrl, startLiveWavePreview } from './RunnerPreview3D';

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

function RunnerPreview(props: { preset: RunnerPreset; hovered: boolean; onLiveRef: (el: HTMLDivElement) => void }) {
  const [src, setSrc] = createSignal<string>('');

  onMount(async () => {
    let url: string;
    if (isCorgiPreset(props.preset)) {
      url = await getCorgiPreviewUrl(props.preset.id);
    } else {
      url = await getRunnerPreviewUrl(props.preset.id, props.preset.appearance);
    }
    setSrc(url);
  });

  return (
    <div
      class="runner-preview"
      ref={(el) => props.onLiveRef(el)}
    >
      <Show when={src() && !props.hovered}>
        <img
          src={src()}
          alt={props.preset.name}
          class="runner-preview-img"
        />
      </Show>
    </div>
  );
}

function RunnerTile(props: {
  preset: RunnerPreset;
  taken: boolean;
  active: boolean;
  onClick: () => void;
}) {
  let liveContainerRef: HTMLDivElement | undefined;
  let cleanupLive: (() => void) | null = null;
  const [hovered, setHovered] = createSignal(false);

  function handleMouseEnter() {
    setHovered(true);
    if (!liveContainerRef) return;
    const appearance = isCorgiPreset(props.preset) ? null : props.preset.appearance;
    cleanupLive = startLiveWavePreview(liveContainerRef, appearance);
  }

  function handleMouseLeave() {
    setHovered(false);
    if (cleanupLive) {
      cleanupLive();
      cleanupLive = null;
    }
  }

  return (
    <button
      class="char-tile"
      classList={{ taken: props.taken, active: props.active }}
      disabled={props.taken}
      onClick={props.onClick}
      title={props.preset.name}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <RunnerPreview
        preset={props.preset}
        hovered={hovered()}
        onLiveRef={(el) => { liveContainerRef = el; }}
      />
      <span class="char-tile-label">{props.preset.name}</span>
    </button>
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
                <RunnerTile
                  preset={preset}
                  taken={taken()}
                  active={active()}
                  onClick={() => handleRunnerClick(preset.id)}
                />
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
