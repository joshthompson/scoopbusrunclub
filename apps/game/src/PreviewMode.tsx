/**
 * Preview Mode — a standalone 3D race replay triggered by URL params.
 *
 * URL format: /game/?preview&id=haga&runners=josh:1200,keith:1350,otherjosh:1400
 *
 * - `preview`  — flag (presence triggers this mode)
 * - `id`       — level/course id (e.g. "haga")
 * - `runners`  — comma-separated list of runnerId:finishSeconds pairs
 */

import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import earcut from 'earcut';
import { Game } from './game/Game';
import levels from './levels';
import type { PreviewRunnerDef } from './game/systems/previewRunners';

// Babylon.js needs earcut on window for CreatePolygon
(window as any).earcut = earcut;

const SPEED_OPTIONS = [1, 2, 5, 10, 25, 50, 100] as const;

/** Format seconds as M:SS or H:MM:SS */
function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Parse URL search params for preview mode */
export function parsePreviewParams(): {
  courseId: string;
  runners: PreviewRunnerDef[];
} | null {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('preview')) return null;

  const courseId = params.get('id') ?? '';
  const runnersStr = params.get('runners') ?? '';

  if (!courseId || !runnersStr) return null;

  const runners: PreviewRunnerDef[] = [];
  for (const pair of runnersStr.split(',')) {
    const parts = pair.split(':');
    const runnerId = parts[0];
    const finishSeconds = Number(parts[1]);
    const roleStr = parts[2] as PreviewRunnerDef['role'];
    if (runnerId && Number.isFinite(finishSeconds) && finishSeconds > 0) {
      const def: PreviewRunnerDef = { runnerId, finishSeconds };
      if (roleStr === 'parkwalker' || roleStr === 'tailwalker') {
        def.role = roleStr;
      }
      runners.push(def);
    }
  }

  if (runners.length === 0) return null;

  return { courseId, runners };
}

export function PreviewMode(props: { courseId: string; runners: PreviewRunnerDef[] }) {
  const [speed, setSpeed] = createSignal(1);
  const [playing, setPlaying] = createSignal(false);
  const [elapsed, setElapsed] = createSignal(0);
  const [maxTime, setMaxTime] = createSignal(0);
  const [finishedCount, setFinishedCount] = createSignal(0);
  const [totalRunners, setTotalRunners] = createSignal(props.runners.length);
  const [countdown, setCountdown] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [runnerNames, setRunnerNames] = createSignal<{ index: number; name: string }[]>([]);
  const [followedIndex, setFollowedIndex] = createSignal(0);

  let canvasRef!: HTMLCanvasElement;
  let game: Game | null = null;

  onMount(async () => {
    // Validate level
    if (!levels[props.courseId]) {
      setError(`Unknown level "${props.courseId}". Available: ${Object.keys(levels).join(', ')}`);
      setLoading(false);
      return;
    }

    game = new Game(canvasRef, {
      onScoopRunner: () => {},
      onSpeedChange: () => {},
      onDistanceChange: () => {},
      onAltitudeChange: () => {},
    });

    await game.initPreview(props.courseId, props.runners, {
      onTick: (el, finished, total) => {
        setElapsed(el);
        setFinishedCount(finished);
        setTotalRunners(total);
      },
      onCountdown: (text) => {
        setCountdown(text);
      },
      onRaceState: (state) => {
        if (state === 'racing') {
          setPlaying(true);
        } else if (state === 'finished') {
          setPlaying(false);
        }
      },
    });

    setMaxTime(game.getPreviewMaxTime());
    setRunnerNames(game.getPreviewRunnerNames());
    setLoading(false);
  });

  onCleanup(() => {
    if (game) {
      game.dispose();
      game = null;
    }
  });

  function togglePlay() {
    if (!game) return;
    if (playing()) {
      setPlaying(false);
      game.setPreviewPlaying(false);
    } else {
      // If at end, restart
      if (elapsed() >= maxTime()) {
        game.seekPreview(0);
        setElapsed(0);
      }
      setPlaying(true);
      game.setPreviewPlaying(true);
    }
  }

  function handleSpeedChange(s: number) {
    setSpeed(s);
    if (game) game.setPreviewSpeed(s);
  }

  function handleSlider(value: number) {
    setElapsed(value);
    if (game) game.seekPreview(value);
  }

  function handleFollowRunner(index: number) {
    setFollowedIndex(index);
    if (game) game.setFollowedRunner(index);
  }

  return (
    <>
      <canvas id="gameCanvas" ref={canvasRef} />

      <Show when={loading()}>
        <div id="loading">Loading course data...</div>
      </Show>

      <Show when={error()}>
        <div id="loading" style={{ color: 'red' }}>{error()}</div>
      </Show>

      <Show when={countdown()}>
        <div id="countdown-overlay">
          <span class={countdown() === 'Go!' ? 'countdown-go' : 'countdown-num'}>
            {countdown()}
          </span>
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        {/* Preview controls overlay */}
        <div id="preview-controls">
          {/* Runner select */}
          <div class="preview-runner-row">
            <For each={runnerNames()}>
              {(r) => (
                <button
                  class={'preview-runner-btn' + (followedIndex() === r.index ? ' active' : '')}
                  onClick={() => handleFollowRunner(r.index)}
                >
                  {r.name}
                </button>
              )}
            </For>
          </div>

          {/* Play / pause */}
          <button class="preview-play-btn" onClick={togglePlay}>
            {playing() ? '⏸' : '▶'}
          </button>

          {/* Slider */}
          <div class="preview-slider-row">
            <span class="preview-time">{fmtTime(elapsed())}</span>
            <input
              type="range"
              class="preview-slider"
              min="0"
              max={maxTime()}
              step="1"
              value={elapsed()}
              onInput={(e) => handleSlider(Number(e.currentTarget.value))}
            />
            <span class="preview-time">{fmtTime(maxTime())}</span>
          </div>

          {/* Speed buttons */}
          <div class="preview-speed-row">
            <For each={[...SPEED_OPTIONS]}>
              {(s) => (
                <button
                  class={'preview-speed-btn' + (speed() === s ? ' active' : '')}
                  onClick={() => handleSpeedChange(s)}
                >
                  x{s}
                </button>
              )}
            </For>
          </div>

          {/* Finished counter */}
          <p class="preview-finished">
            {finishedCount()} / {totalRunners()} finished
          </p>
        </div>
      </Show>
    </>
  );
}
