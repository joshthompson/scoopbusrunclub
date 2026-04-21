/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, onMount, Show } from 'solid-js';
import earcut from 'earcut';
import { Game } from './game/Game';
import levels from './levels';
import { TitleScreen } from './TitleScreen';
import { LobbyScreen } from './LobbyScreen';
import { mp } from './multiplayer';
import type { BusState } from './multiplayer';

// Babylon.js needs earcut on window for CreatePolygon
(window as any).earcut = earcut;

const LAST_COURSE_KEY = 'scoopbus_last_course';

type GameMode = 'single' | 'host' | 'join';
type Screen = 'title' | 'lobby' | 'loading' | 'playing';

/** Format seconds as M:SS */
function fmtTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function App() {
  const [screen, setScreen] = createSignal<Screen>('title');
  const [error, setError] = createSignal('');
  const [scored, setScored] = createSignal(0);
  const [speed, setSpeed] = createSignal(0);
  const [distance, setDistance] = createSignal(0);
  const [altitude, setAltitude] = createSignal(0);
  const [gates, setGates] = createSignal({ passed: 0, total: 0 });
  const [countdown, setCountdown] = createSignal('');
  const [raceState, setRaceState] = createSignal<'countdown' | 'racing' | 'finished'>('countdown');
  const [raceTime, setRaceTime] = createSignal(0);
  const [courseProgress, setCourseProgress] = createSignal({ covered: 0, total: 5 });
  const [finishTime, setFinishTime] = createSignal(0);

  // Multiplayer state
  const [gameMode, setGameMode] = createSignal<GameMode>('single');
  const [remoteState, setRemoteState] = createSignal<BusState | null>(null);

  let canvasRef!: HTMLCanvasElement;
  let minimapRef!: HTMLCanvasElement;
  let demoGame: Game | null = null;
  let activeGame: Game | null = null;
  let currentEventId = '';
  let mpSendInterval: ReturnType<typeof setInterval> | null = null;

  // Determine demo course: last loaded or haga
  function getDemoCourseId(): string {
    const last = localStorage.getItem(LAST_COURSE_KEY);
    if (last && levels[last]) return last;
    return 'haga';
  }

  onMount(async () => {
    // Start background demo animation
    demoGame = new Game(canvasRef, {
      onScoopRunner: () => {},
      onSpeedChange: () => {},
      onDistanceChange: () => {},
      onAltitudeChange: () => {},
    });
    await demoGame.initDemo(getDemoCourseId());
  });

  function handleSelectMode(mode: GameMode, eventId: string) {
    currentEventId = eventId;
    setGameMode(mode);

    if (mode === 'single') {
      startGame(eventId);
    } else {
      // Go to lobby
      setScreen('lobby');
    }
  }

  function handleLobbyStart() {
    // Lobby says "go" — start the actual game
    startGame(currentEventId);
  }

  function handleLobbyCancel() {
    mp.disconnect();
    setScreen('title');
  }

  async function startGame(eventId: string) {
    // Remember this course for next visit's demo background
    localStorage.setItem(LAST_COURSE_KEY, eventId);
    currentEventId = eventId;

    setScreen('loading');

    // Tear down any existing game
    if (demoGame) {
      demoGame.dispose();
      demoGame = null;
    }
    if (activeGame) {
      activeGame.dispose();
      activeGame = null;
    }

    // Reset UI state
    setScored(0);
    setSpeed(0);
    setDistance(0);
    setAltitude(0);
    setGates({ passed: 0, total: 0 });
    setCountdown('3');
    setRaceState('countdown');
    setRaceTime(0);
    setCourseProgress({ covered: 0, total: 5 });
    setFinishTime(0);
    setRemoteState(null);

    // Validate
    if (!levels[eventId]) {
      const available = Object.keys(levels);
      setError(
        `Unknown level "${eventId}". Available: ${available.length ? available.join(', ') : '(none — run pnpm game:level <id>)'}`,
      );
      setScreen('title');
      return;
    }

    const game = new Game(canvasRef, {
      onScoopRunner: () => setScored((s) => s + 1),
      onSpeedChange: (s: number) => setSpeed(s),
      onDistanceChange: (d: number) => setDistance(d),
      onAltitudeChange: (a: number) => setAltitude(a),
      onGatePass: (passed: number, total: number) => setGates({ passed, total }),
      onCountdown: (text: string) => setCountdown(text),
      onRaceStateChange: (state) => setRaceState(state),
      onRaceTimer: (seconds: number) => setRaceTime(seconds),
      onCourseProgress: (covered: number, total: number) => setCourseProgress({ covered, total }),
      onFinish: (time: number) => setFinishTime(time),
    }, minimapRef);

    activeGame = game;
    await game.init(eventId);

    // --- Multiplayer setup ---
    const isMultiplayer = gameMode() !== 'single';
    if (isMultiplayer && mp.roomCode) {
      // Build opponent bus
      await game.buildRemoteBus();

      // Listen for remote state updates
      mp.onRemoteState = (state: BusState) => {
        setRemoteState(state);
        game.updateRemoteState(state);
      };

      // Start sending local state at ~15 Hz
      mpSendInterval = setInterval(() => {
        if (activeGame) {
          mp.broadcastState(activeGame.getLocalBusState());
        }
      }, 66);
    }

    setScreen('playing');
  }

  function handleReplay() {
    startGame(currentEventId);
  }

  function handleExitToMenu() {
    // Clean up multiplayer
    if (mpSendInterval) {
      clearInterval(mpSendInterval);
      mpSendInterval = null;
    }
    mp.disconnect();
    setGameMode('single');
    setRemoteState(null);

    if (activeGame) {
      activeGame.dispose();
      activeGame = null;
    }
    setScreen('title');
    // Restart demo
    demoGame = new Game(canvasRef, {
      onScoopRunner: () => {},
      onSpeedChange: () => {},
      onDistanceChange: () => {},
      onAltitudeChange: () => {},
    });
    demoGame.initDemo(getDemoCourseId());
  }

  return (
    <>
      <Show when={screen() === 'loading'}>
        <div id="loading">Loading course data...</div>
      </Show>
      <Show when={error()}>
        <div id="loading" style={{ color: 'red' }}>{error()}</div>
      </Show>
      <Show when={screen() === 'title'}>
        <TitleScreen onSelectMode={handleSelectMode} />
      </Show>
      <Show when={screen() === 'lobby'}>
        <LobbyScreen
          mode={gameMode() as 'host' | 'join'}
          courseId={currentEventId}
          courseName={levels[currentEventId]?.name ?? currentEventId}
          onStart={handleLobbyStart}
          onCancel={handleLobbyCancel}
        />
      </Show>
      <Show when={screen() === 'playing'}>
        {/* Top-left HUD */}
        <div id="hud">
          <p>🚌 Scooped: {scored()}</p>
          <p>🏃 Speed: {speed().toFixed(1)} km/h</p>
          <p>⏱️ {fmtTime(raceTime())}</p>
        </div>

        {/* Top-right multiplayer opponent HUD */}
        <Show when={gameMode() !== 'single' && remoteState()}>
          <div id="mp-hud">
            <p>🚌 Opponent</p>
            <p>Speed: {(Math.abs(remoteState()!.speed) * 3.6).toFixed(0)} km/h</p>
            <p>Scooped: {remoteState()!.scooped}</p>
            <p>⏱️ {fmtTime(remoteState()!.raceTime)}</p>
            <Show when={remoteState()!.raceState === 'finished'}>
              <p style={{ color: '#ffc107' }}>🏁 FINISHED</p>
            </Show>
          </div>
        </Show>

        {/* Bottom-right course progress */}
        <div id="course-progress">
          {courseProgress().covered.toFixed(1)}/{courseProgress().total}km
        </div>

        {/* Centre countdown overlay */}
        <Show when={countdown() !== ''}>
          <div id="countdown-overlay">
            <span class={countdown() === 'Go!' ? 'countdown-go' : 'countdown-num'}>
              {countdown()}
            </span>
          </div>
        </Show>

        {/* Finish screen */}
        <Show when={raceState() === 'finished'}>
          <div id="finish-overlay">
            <div class="finish-card">
              <h1>🏁 Finished!</h1>
              <p class="finish-time">Finished in {fmtTime(finishTime())}</p>
              <p class="finish-scooped">Runners scooped: {scored()}</p>
              <Show when={gameMode() !== 'single' && remoteState()}>
                <p class="finish-scooped" style={{ 'margin-top': '8px' }}>
                  {remoteState()!.raceState === 'finished'
                    ? `Opponent: ${fmtTime(remoteState()!.raceTime)}`
                    : 'Opponent still racing...'}
                </p>
                <Show when={remoteState()!.raceState === 'finished'}>
                  <p class="finish-time" style={{
                    color: finishTime() <= remoteState()!.raceTime ? '#4caf50' : '#e53935',
                    'font-size': 'clamp(18px, 3vw, 28px)',
                    'margin-top': '4px',
                  }}>
                    {finishTime() <= remoteState()!.raceTime ? '🏆 You Win!' : '💀 You Lose'}
                  </p>
                </Show>
              </Show>
              <div class="finish-buttons">
                <button class="course-btn" onClick={handleReplay}>Replay</button>
                <button class="course-btn finish-exit-btn" onClick={handleExitToMenu}>Exit to Menu</button>
              </div>
            </div>
          </div>
        </Show>
      </Show>
      <canvas id="gameCanvas" ref={canvasRef} />
      <canvas id="minimap" ref={minimapRef} />
    </>
  );
}

render(() => <App />, document.getElementById('app')!);
