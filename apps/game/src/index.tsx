/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, onMount, Show, For } from 'solid-js';
import earcut from 'earcut';
import { Game } from './game/Game';
import levels from './levels';
import { TitleScreen } from './TitleScreen';
import { LobbyScreen } from './LobbyScreen';
import { mp, MAX_PLAYERS } from './multiplayer';
import type { BusState, ScoopEvent } from './multiplayer';

// Babylon.js needs earcut on window for CreatePolygon
(window as any).earcut = earcut;

/** Player colour names & CSS colours (1-indexed) */
const PLAYER_COLOR_INFO = [
  { name: 'Yellow', css: '#f0c820' },
  { name: 'Red', css: '#d94030' },
  { name: 'Blue', css: '#3470d8' },
  { name: 'Purple', css: '#9940cc' },
];

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
  const [remoteStates, setRemoteStates] = createSignal<Map<string, BusState>>(new Map());

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
    setRemoteStates(new Map());

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

    // --- Multiplayer setup ---
    const isMultiplayer = gameMode() !== 'single';
    if (isMultiplayer && mp.roomCode) {
      // Set local player index (host=1, joiners get assigned by host)
      game.setLocalPlayerIndex(mp.localPlayerIndex);
    }

    await game.init(eventId);

    if (isMultiplayer && mp.roomCode) {
      // Build a remote bus for each currently-connected peer
      for (const peerId of mp.remotePeerIds) {
        const idx = mp.getPlayerIndex(peerId) || 2;
        await game.buildRemoteBusForPeer(peerId, idx);
      }

      // Handle new peers joining mid-game
      mp.onPeerJoin = async (peerId: string) => {
        const idx = mp.getPlayerIndex(peerId) || (mp.remotePeerIds.indexOf(peerId) + 2);
        await game.buildRemoteBusForPeer(peerId, idx);
      };

      // Handle peers leaving
      mp.onPeerLeave = (peerId: string) => {
        game.removeRemoteBus(peerId);
        setRemoteStates((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      };

      // Listen for remote state updates
      mp.onRemoteState = (state: BusState, peerId: string) => {
        setRemoteStates((prev) => {
          const next = new Map(prev);
          next.set(peerId, state);
          return next;
        });
        game.updateRemoteState(state, peerId);
        // Lazily build bus if not yet created (e.g. late joiner)
        if (!game['remotePlayers'].has(peerId)) {
          const idx = state.playerIndex || (mp.getPlayerIndex(peerId) || 2);
          game.buildRemoteBusForPeer(peerId, idx);
        }
      };

      // Listen for remote scoop events
      mp.onScoopEvent = (evt: ScoopEvent, _peerId: string) => {
        game.handleRemoteScoop(evt.runnerIndex, evt.playerIndex);
      };

      // Start sending local state at ~15 Hz + flush scoop events
      mpSendInterval = setInterval(() => {
        if (activeGame) {
          mp.broadcastState(activeGame.getLocalBusState());
          // Flush and broadcast any scoop events from this frame
          const scoops = activeGame.flushScoopEvents();
          for (const evt of scoops) {
            mp.broadcastScoop(evt);
          }
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
    setRemoteStates(new Map());

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

        {/* Top-right multiplayer HUD (all opponents) */}
        <Show when={gameMode() !== 'single' && remoteStates().size > 0}>
          <div id="mp-hud">
            <For each={[...remoteStates().entries()]}>{([_peerId, rs]) => {
              const info = PLAYER_COLOR_INFO[(rs.playerIndex || 2) - 1] ?? PLAYER_COLOR_INFO[1];
              return (
                <div class="mp-player-block" style={{ 'border-left': `3px solid ${info.css}` }}>
                  <p style={{ color: info.css }}>🚌 P{rs.playerIndex || '?'} {info.name}</p>
                  <p>Speed: {(Math.abs(rs.speed) * 3.6).toFixed(0)} km/h</p>
                  <p>Scooped: {rs.scooped}</p>
                  <p>⏱️ {fmtTime(rs.raceTime)}</p>
                  <Show when={rs.raceState === 'finished'}>
                    <p style={{ color: '#ffc107' }}>🏁 FINISHED</p>
                  </Show>
                </div>
              );
            }}</For>
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
              <Show when={gameMode() !== 'single' && remoteStates().size > 0}>
                <For each={[...remoteStates().entries()]}>{([_peerId, rs]) => {
                  const info = PLAYER_COLOR_INFO[(rs.playerIndex || 2) - 1] ?? PLAYER_COLOR_INFO[1];
                  return (
                    <div>
                      <p class="finish-scooped" style={{ 'margin-top': '8px', color: info.css }}>
                        {rs.raceState === 'finished'
                          ? `P${rs.playerIndex} ${info.name}: ${fmtTime(rs.raceTime)}`
                          : `P${rs.playerIndex} ${info.name}: still racing...`}
                      </p>
                      <Show when={rs.raceState === 'finished'}>
                        <p class="finish-time" style={{
                          color: finishTime() <= rs.raceTime ? '#4caf50' : '#e53935',
                          'font-size': 'clamp(14px, 2vw, 20px)',
                          'margin-top': '2px',
                        }}>
                          {finishTime() <= rs.raceTime ? '🏆 Beat them!' : '💀 They beat you'}
                        </p>
                      </Show>
                    </div>
                  );
                }}</For>
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
