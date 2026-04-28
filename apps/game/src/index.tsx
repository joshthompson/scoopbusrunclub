/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import earcut from 'earcut';
import { Game } from './game/Game';
import levels from './levels';
import { TitleScreen } from './TitleScreen';
import { LevelSelectScreen } from './LevelSelectScreen';
import { RoleSelectScreen } from './RoleSelectScreen';
import { CharacterSelectScreen } from './CharacterSelectScreen';
import { GameTypeSelectScreen } from './GameTypeSelectScreen';
import { LobbyScreen } from './LobbyScreen';
import { mp, MAX_PLAYERS } from './multiplayer';
import type { PlayerState, ScoopEvent } from './multiplayer';
import { getGameModeConfig, GAME_TYPE_LABELS } from './game/modes';
import type { GameType, TeamColor } from './game/modes';
import type { ItemCollectEvent } from './multiplayer';
import type { CharacterSelection } from './game/characters';
import type { PowerUpId } from './game/systems/powerups';
import powerUpFika from './assets/power-ups/fika.png';
import powerUpFire from './assets/power-ups/fire.png';
import powerUpIce from './assets/power-ups/ice.png';
import powerUpMallet from './assets/power-ups/mallet.png';
import powerUpShoe from './assets/power-ups/shoe.png';

// Babylon.js needs earcut on window for CreatePolygon
(window as any).earcut = earcut;

/** Player colour names & CSS colours (1-indexed) */
const PLAYER_COLOR_INFO = [
  { name: 'Yellow', css: '#f0c820' },
  { name: 'Red', css: '#d94030' },
  { name: 'Blue', css: '#3470d8' },
  { name: 'Purple', css: '#9940cc' },
];

type GameMode = 'single' | 'host' | 'join';
type PlayerRole = 'bus' | 'runner';
type Screen = 'title' | 'level-select' | 'role-select' | 'character-select' | 'game-type-select' | 'lobby' | 'loading' | 'playing';

const POWER_UP_IMAGE_BY_ID: Record<PowerUpId, string> = {
  fika: powerUpFika,
  fire: powerUpFire,
  ice: powerUpIce,
  mallet: powerUpMallet,
  shoe: powerUpShoe,
};

/** Format seconds as M:SS */
function fmtTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format position as ordinal: 1st, 2nd, 3rd, 4th... */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getRandomCourseId(): string {
  const courseIds = Object.keys(levels).filter((id) => !levels[id]?.hide);
  if (courseIds.length === 0) return 'haga';
  return courseIds[Math.floor(Math.random() * courseIds.length)];
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
  const [racePosition, setRacePosition] = createSignal({ position: 1, total: 1 });
  const [keepDriving, setKeepDriving] = createSignal(false);
  const [powerUpDisplay, setPowerUpDisplay] = createSignal<PowerUpId | null>(null);
  const [powerUpRolling, setPowerUpRolling] = createSignal(false);

  // Pause menu
  const [paused, setPaused] = createSignal(false);

  // Multiplayer state
  const [gameMode, setGameMode] = createSignal<GameMode>('single');
  const [playerRole, setPlayerRole] = createSignal<PlayerRole>('bus');
  const [gameType, setGameType] = createSignal<GameType>('single-bus');
  const [charSelection, setCharSelection] = createSignal<CharacterSelection | null>(null);
  const [remoteStates, setRemoteStates] = createSignal<Map<string, PlayerState>>(new Map());

  const isMultiplayerMode = () => gameMode() === 'host' || gameMode() === 'join';

  let canvasRef!: HTMLCanvasElement;
  let minimapRef!: HTMLCanvasElement;
  let demoGame: Game | null = null;
  let activeGame: Game | null = null;
  let currentEventId = '';
  let mpSendInterval: ReturnType<typeof setInterval> | null = null;

  // --- Pause / resume toggle ---
  function togglePause() {
    if (screen() !== 'playing') return;
    if (raceState() === 'finished' && !keepDriving()) return; // finish screen shown
    const next = !paused();
    setPaused(next);
    const isSingle = !isMultiplayerMode();
    if (activeGame) {
      // Only freeze simulation in single-player
      activeGame.setPaused(isSingle && next);
    }
  }

  function handleResume() {
    setPaused(false);
    if (activeGame) activeGame.setPaused(false);
  }

  onMount(async () => {
    // Global key listener for pause
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));

    // Start background demo animation
    demoGame = new Game(canvasRef, {
      onScoopRunner: () => {},
      onSpeedChange: () => {},
      onDistanceChange: () => {},
      onAltitudeChange: () => {},
    });
    await demoGame.initDemo(getRandomCourseId());
  });

  function handleSelectMode(mode: GameMode) {
    setGameMode(mode);

    if (mode === 'join') {
      // Go straight to lobby for code entry
      setScreen('lobby');
    } else if (mode === 'host') {
      // Host picks game type first
      setScreen('game-type-select');
    } else {
      // Single player picks a level first
      setScreen('level-select');
    }
  }

  function handleGameTypeSelect(gt: GameType) {
    setGameType(gt);
    const config = getGameModeConfig(gt);
    if (config.usesLevelSelect) {
      // Pick a course, then go to lobby
      setScreen('level-select');
    } else {
      // Arena etc — go straight to lobby (no level select)
      setScreen('lobby');
    }
  }

  function handleLevelSelect(levelId: string) {
    currentEventId = levelId;
    if (gameMode() === 'single') {
      setScreen('role-select');
    } else {
      // Host → go to lobby
      setScreen('lobby');
    }
  }

  /** Single-player: user picked bus or runner → go to character select */
  function handleRoleSelect(role: PlayerRole) {
    setPlayerRole(role);
    setGameType(role === 'bus' ? 'single-bus' : 'single-runner');
    setScreen('character-select');
  }

  // Guard to prevent double-starting once all players are ready
  let gameStarting = false;

  /** Check if all multiplayer players have selected; if so, start the game. */
  function checkAllReady() {
    if (gameStarting) return;
    if (!isMultiplayerMode()) return;
    if (!charSelection()) return; // local player hasn't selected yet
    const totalPlayers = mp.peerCount + 1;
    if (mp.charSelections.size >= totalPlayers) {
      gameStarting = true;
      startGame(currentEventId);
    }
  }

  /** Character select completed (single-player or multiplayer). */
  function handleCharacterSelect(selection: CharacterSelection) {
    setCharSelection(selection);

    if (isMultiplayerMode()) {
      // Store and broadcast selection, then wait for all players
      mp.setCharSelection(selection);
      mp.broadcastLobby({ type: 'ready', charSelection: selection });
      checkAllReady();
    } else {
      startGame(currentEventId);
    }
  }

  function handleLobbyStart(courseId: string) {
    // For modes without level select (e.g. arena), fall back to the mode's default level
    let cid = courseId;
    if (!cid) {
      const gt = gameMode() === 'join' ? (mp.gameType ?? 'scoop-race') : gameType();
      const config = getGameModeConfig(gt);
      cid = config.defaultLevelId ?? 'haga';
    }
    currentEventId = cid;
    // When joining, adopt the host's game type from the multiplayer layer
    if (gameMode() === 'join' && mp.gameType) {
      setGameType(mp.gameType);
    }

    // Determine this player's role so we know what to select
    const gt = gameMode() === 'join' ? (mp.gameType ?? 'scoop-race') : gameType();
    const resolvedRole = getGameModeConfig(gt).getRoleForPlayer(
      mp.localPlayerIndex,
      mp.peerCount + 1,
      mp.driverIndex,
    );
    setPlayerRole(resolvedRole);

    // For team-race buses, colours are pre-assigned by team — skip select
    if (gt === 'team-race' && resolvedRole === 'bus') {
      startGame(cid);
      return;
    }

    // Reset ready guard for the new character-select phase
    gameStarting = false;

    // Listen for character selections from other players
    mp.onLobbyMessage = (msg, peerId) => {
      if (msg.type === 'ready' && msg.charSelection) {
        const idx = mp.getPlayerIndex(peerId);
        if (idx) {
          mp.charSelections.set(idx, msg.charSelection);
        }
        checkAllReady();
      }
    };

    // Otherwise go to character select
    setScreen('character-select');
  }

  function handleLobbyCancel() {
    mp.disconnect();
    setScreen('title');
  }

  async function startGame(eventId: string) {
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
    setKeepDriving(false);
    setRacePosition({ position: 1, total: 1 });
    setRemoteStates(new Map());
    setPowerUpDisplay(null);
    setPowerUpRolling(false);

    // Validate
    if (!levels[eventId]) {
      const available = Object.keys(levels);
      setError(
        `Unknown level "${eventId}". Available: ${available.length ? available.join(', ') : '(none — run pnpm game:level <id>)'}`,
      );
      setScreen('title');
      return;
    }

    const resolvedRole: PlayerRole = isMultiplayerMode()
      ? getGameModeConfig(gameType()).getRoleForPlayer(
          mp.localPlayerIndex,
          mp.peerCount + 1,
          mp.driverIndex,
        )
      : playerRole();
    setPlayerRole(resolvedRole);

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
      onPositionChange: (pos: number, total: number) => setRacePosition({ position: pos, total }),
      onPowerUpDisplayChange: (powerUp, rolling) => {
        setPowerUpDisplay(powerUp);
        setPowerUpRolling(rolling);
      },
    }, minimapRef, {
      localPlayerRole: resolvedRole,
      gameType: gameType(),
      items: getGameModeConfig(gameType()).items,
      charSelection: charSelection(),
    });

    activeGame = game;

    // --- Multiplayer setup ---
    const isMultiplayer = isMultiplayerMode();
    if (isMultiplayer && mp.roomCode) {
      // Set local player index (host=1, joiners get assigned by host)
      game.setLocalPlayerIndex(mp.localPlayerIndex);
      // Don't auto-start countdown — wait for host to sync all players
      game.setWaitForCountdown();
    }

    await game.init(eventId);

    if (isMultiplayer && mp.roomCode) {
      // Build a remote bus for each currently-connected peer
      for (const peerId of mp.remotePeerIds) {
        const idx = mp.getPlayerIndex(peerId) || 2;
        const remoteCharSel = mp.getCharSelection(idx);
        await game.buildRemoteBusForPeer(peerId, idx, remoteCharSel);
      }

      // --- Host-synced countdown start ---
      const totalPlayers = mp.peerCount + 1;
      const readyPeers = new Set<string>();

      // Function to trigger the countdown (called when all players report ready)
      function triggerSyncedCountdown() {
        game.startCountdown();
      }

      if (mp.isHost) {
        // Host is already ready (local init complete).
        // Wait for all joiners to report 'gameReady'.
        mp.onLobbyMessage = (msg, peerId) => {
          if (msg.type === 'gameReady') {
            readyPeers.add(peerId);
            // All joiners ready → broadcast startCountdown to everyone, then start locally
            if (readyPeers.size >= totalPlayers - 1) {
              mp.broadcastLobby({ type: 'startCountdown' });
              triggerSyncedCountdown();
            }
          }
        };
        // Broadcast our own readiness to peers (so they see us if we're the last one)
        mp.broadcastLobby({ type: 'gameReady' });

        // Edge case: solo host (no joiners) — start immediately
        if (totalPlayers <= 1) {
          triggerSyncedCountdown();
        }
      } else {
        // Joiner: listen for host's startCountdown signal
        mp.onLobbyMessage = (msg, _peerId) => {
          if (msg.type === 'startCountdown') {
            triggerSyncedCountdown();
          }
        };
        // Tell the host we're ready
        mp.broadcastLobby({ type: 'gameReady' });
      }

      // Handle new peers joining mid-game
      mp.onPeerJoin = async (peerId: string) => {
        const idx = mp.getPlayerIndex(peerId) || (mp.remotePeerIds.indexOf(peerId) + 2);
        const remoteCharSel = mp.getCharSelection(idx);
        await game.buildRemoteBusForPeer(peerId, idx, remoteCharSel);
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
      mp.onRemoteState = (state: PlayerState, peerId: string) => {
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
        game.handleRemoteScoop(
          evt.runnerIndex,
          evt.playerIndex,
          evt.victimPlayerIndex,
          evt.scooperYaw,
          evt.scooperSpeed,
        );
      };

      // Listen for remote item collection events
      mp.onItemEvent = (evt: ItemCollectEvent, _peerId: string) => {
        game.handleRemoteItemCollect(evt);
      };

      // Start sending local state at ~15 Hz + flush scoop events
      mpSendInterval = setInterval(() => {
        if (activeGame) {
          mp.broadcastState(activeGame.getLocalPlayerState());
          // Flush and broadcast any scoop events from this frame
          const scoops = activeGame.flushScoopEvents();
          for (const evt of scoops) {
            mp.broadcastScoop(evt);
          }
          const itemEvents = activeGame.flushItemCollectEvents();
          for (const evt of itemEvents) {
            mp.broadcastItemCollect(evt);
          }
        }
      }, 66);

      // Show "Waiting..." while waiting for all players to load
      setCountdown('Waiting...');
    }

    setScreen('playing');
  }

  function handleKeepDriving() {
    if (activeGame) activeGame.setKeepDriving();
    setKeepDriving(true);
  }

  function handleReplay() {
    setPaused(false);
    startGame(currentEventId);
  }

  function handleUsePowerUp() {
    activeGame?.useHeldPowerUp();
  }

  function handleExitToMenu() {
    setPaused(false);
    // Clean up multiplayer
    if (mpSendInterval) {
      clearInterval(mpSendInterval);
      mpSendInterval = null;
    }
    mp.disconnect();
    setGameMode('single');
    setPlayerRole('bus');
    setGameType('single-bus');
    setCharSelection(null);
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
    demoGame.initDemo(getRandomCourseId());
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
      <Show when={screen() === 'level-select'}>
        <LevelSelectScreen
          onSelect={handleLevelSelect}
          onBack={() => {
            if (gameMode() === 'host') {
              setScreen('game-type-select');
            } else {
              setScreen('title');
            }
          }}
        />
      </Show>
      <Show when={screen() === 'role-select'}>
        <RoleSelectScreen
          courseName={levels[currentEventId]?.name ?? currentEventId}
          onSelect={handleRoleSelect}
          onBack={() => setScreen('level-select')}
        />
      </Show>
      <Show when={screen() === 'character-select'}>
        <CharacterSelectScreen
          role={playerRole()}
          courseName={levels[currentEventId]?.name ?? currentEventId}
          onSelect={handleCharacterSelect}
          onBack={() => {
            if (isMultiplayerMode()) {
              setScreen('lobby');
            } else {
              setScreen('role-select');
            }
          }}
          waiting={isMultiplayerMode()}
        />
      </Show>
      <Show when={screen() === 'game-type-select'}>
        <GameTypeSelectScreen
          onSelect={handleGameTypeSelect}
          onBack={() => setScreen('title')}
        />
      </Show>
      <Show when={screen() === 'lobby'}>
        <LobbyScreen
          mode={gameMode() as 'host' | 'join'}
          courseId={gameMode() === 'host' ? currentEventId : undefined}
          gameType={gameMode() === 'host' ? gameType() : undefined}
          onStart={handleLobbyStart}
          onCancel={handleLobbyCancel}
        />
      </Show>
      <Show when={screen() === 'playing'}>
        {/* Top-left HUD */}
        <Show when={powerUpDisplay()}>
          <div
            id="powerup-hud"
            classList={{ rolling: powerUpRolling() }}
            onClick={handleUsePowerUp}
            onTouchStart={(e) => {
              e.preventDefault();
              handleUsePowerUp();
            }}
          >
            <img src={POWER_UP_IMAGE_BY_ID[powerUpDisplay()!]} alt="Power-up" />
          </div>
        </Show>

        <div id="hud" style={powerUpDisplay() ? { top: 'calc(min(220px, 30vw) + 24px)' } : undefined}>
          <Show when={isMultiplayerMode()}>
            <p style={{ 'font-size': 'clamp(10px, 1.5vw, 14px)', opacity: 0.7 }}>
              {GAME_TYPE_LABELS[gameType()]}
            </p>
          </Show>
          <Show when={playerRole() === 'bus'}>
            <p>🚌 Scooped: {scored()}</p>
          </Show>
          <Show when={playerRole() === 'runner'}>
            <p>🏃 Runner mode</p>
          </Show>
          <p>🏃 Speed: {speed().toFixed(1)} km/h</p>
          <p>⏱️ {fmtTime(raceTime())}</p>
          <Show when={isMultiplayerMode() && raceState() === 'racing'}>
            <p style={{ color: '#ffc107', 'font-weight': 'bold', 'font-size': 'clamp(16px, 2.5vw, 24px)' }}>
              {ordinal(racePosition().position)}
            </p>
          </Show>
        </div>

        {/* Top-right multiplayer HUD — show each opponent's status only when finished */}
        <Show when={isMultiplayerMode() && remoteStates().size > 0 && raceState() === 'finished' && !keepDriving()}>
          <div id="mp-hud">
            <For each={[...remoteStates().entries()]}>{([_peerId, rs]) => {
              const info = PLAYER_COLOR_INFO[(rs.playerIndex || 2) - 1] ?? PLAYER_COLOR_INFO[1];
              return (
                <div class="mp-player-block" style={{ 'border-left': `3px solid ${info.css}` }}>
                  <p style={{ color: info.css }}>🚌 P{rs.playerIndex || '?'} {info.name}</p>
                  <Show when={rs.raceState === 'finished'}>
                    <p style={{ color: '#ffc107' }}>🏁 {fmtTime(rs.raceTime)}</p>
                  </Show>
                  <Show when={rs.raceState !== 'finished'}>
                    <p>Still racing...</p>
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
        <Show when={raceState() === 'finished' && !keepDriving()}>
          <div id="finish-overlay">
            <div class="finish-card">
              <h1>🏁 Finished!</h1>
              <p class="finish-time">Finished in {fmtTime(finishTime())}</p>
              <Show when={playerRole() === 'bus'}>
                <p class="finish-scooped">Runners scooped: {scored()}</p>
              </Show>
              <Show when={isMultiplayerMode() && remoteStates().size > 0}>
                {(() => {
                  // Build ranked leaderboard
                  const states = remoteStates();
                  const players: { name: string; css: string; time: number; finished: boolean; index: number }[] = [];
                  // Add local player
                  const localIdx = (activeGame as any)?.localPlayerIndex ?? 1;
                  const localInfo = PLAYER_COLOR_INFO[localIdx - 1] ?? PLAYER_COLOR_INFO[0];
                  players.push({ name: `P${localIdx} ${localInfo.name} (You)`, css: localInfo.css, time: finishTime(), finished: true, index: localIdx });
                  // Add remote players
                  for (const [, rs] of states) {
                    const info = PLAYER_COLOR_INFO[(rs.playerIndex || 2) - 1] ?? PLAYER_COLOR_INFO[1];
                    players.push({ name: `P${rs.playerIndex} ${info.name}`, css: info.css, time: rs.raceTime, finished: rs.raceState === 'finished', index: rs.playerIndex });
                  }
                  // Sort: finished first (by time), then unfinished
                  players.sort((a, b) => {
                    if (a.finished && !b.finished) return -1;
                    if (!a.finished && b.finished) return 1;
                    if (a.finished && b.finished) return a.time - b.time;
                    return 0;
                  });
                  return (
                    <div style={{ 'margin-top': '12px' }}>
                      <For each={players}>{(p, i) => (
                        <p style={{ color: p.css, margin: '4px 0', 'font-size': 'clamp(14px, 2vw, 20px)' }}>
                          {ordinal(i() + 1)} — {p.name}{p.finished ? ` — ${fmtTime(p.time)}` : ' — still racing...'}
                        </p>
                      )}</For>
                    </div>
                  );
                })()}
              </Show>
              <div class="finish-buttons">
                <button class="course-btn" onClick={handleKeepDriving}>Keep Driving</button>
                <button class="course-btn" onClick={handleReplay}>Replay</button>
                <button class="course-btn finish-exit-btn" onClick={handleExitToMenu}>Exit to Menu</button>
              </div>
            </div>
          </div>
        </Show>

        {/* Pause menu overlay */}
        <Show when={paused() && (raceState() !== 'finished' || keepDriving())}>
          <div id="pause-overlay">
            <div class="pause-card">
              <h1>Paused</h1>
              <Show when={isMultiplayerMode()}>
                <p class="pause-note">Game continues in multiplayer</p>
              </Show>
              <div class="pause-buttons">
                <button class="course-btn" onClick={handleResume}>Resume</button>
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

// --- Entry point: detect preview mode from URL params ---
import { parsePreviewParams, PreviewMode } from './PreviewMode';

const previewParams = parsePreviewParams();
if (previewParams) {
  render(
    () => <PreviewMode courseId={previewParams.courseId} runners={previewParams.runners} />,
    document.getElementById('app')!,
  );
} else {
  render(() => <App />, document.getElementById('app')!);
}
