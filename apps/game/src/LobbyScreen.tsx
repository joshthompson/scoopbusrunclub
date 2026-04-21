import { createSignal, Show, For } from 'solid-js';
import { mp, generateRoomCode, MAX_PLAYERS } from './multiplayer';
import logoSrc from './assets/logo.png';

/** Player colour CSS values (1-indexed) */
const PLAYER_CSS_COLORS = ['#f0c820', '#d94030', '#3470d8', '#9940cc'];
const PLAYER_NAMES = ['Yellow', 'Red', 'Blue', 'Purple'];

interface LobbyScreenProps {
  mode: 'host' | 'join';
  courseId: string;
  courseName: string;
  onStart: () => void;
  onCancel: () => void;
}

export function LobbyScreen(props: LobbyScreenProps) {
  const [roomCode, setRoomCode] = createSignal(
    props.mode === 'host' ? generateRoomCode() : '',
  );
  const [status, setStatus] = createSignal(
    props.mode === 'host' ? 'Waiting for opponent...' : 'Enter room code to join',
  );
  const [connected, setConnected] = createSignal(false);
  const [joining, setJoining] = createSignal(false);
  const [inputCode, setInputCode] = createSignal('');
  const [peerCount, setPeerCount] = createSignal(0);
  const [localIdx, setLocalIdx] = createSignal(props.mode === 'host' ? 1 : 0);

  // Auto-connect for host
  if (props.mode === 'host') {
    connectToRoom(roomCode());
  }

  function connectToRoom(code: string) {
    const isHost = props.mode === 'host';
    setJoining(true);
    setStatus(isHost ? 'Waiting for opponent...' : 'Connecting...');

    mp.connect(code, isHost);

    mp.onPeerJoin = (_peerId) => {
      setConnected(true);
      setPeerCount(mp.peerCount);
      const playerCount = mp.peerCount + 1;
      setStatus(`${playerCount}/${MAX_PLAYERS} players connected`);

      // If host, send course info
      if (isHost) {
        mp.broadcastLobby({
          type: 'playerInfo',
          courseId: props.courseId,
        });
      }
    };

    mp.onPeerLeave = (_peerId) => {
      setPeerCount(mp.peerCount);
      if (mp.peerCount === 0) {
        setConnected(false);
        setStatus(isHost ? 'Opponent disconnected. Waiting...' : 'Disconnected. Try again.');
      } else {
        const playerCount = mp.peerCount + 1;
        setStatus(`${playerCount}/${MAX_PLAYERS} players connected`);
      }
    };

    mp.onLobbyMessage = (msg, _peerId) => {
      if (msg.type === 'start') {
        // Other player started the race
        props.onStart();
      }
      // Update local player index when host assigns it
      if (msg.type === 'playerInfo' && msg.playerIndex) {
        setLocalIdx(msg.playerIndex);
      }
    };
  }

  function handleJoin() {
    const code = inputCode().toUpperCase().trim();
    if (code.length < 3) return;
    setRoomCode(code);
    connectToRoom(code);
  }

  function handleStart() {
    // Tell remote player to start too
    mp.broadcastLobby({ type: 'start', courseId: props.courseId });
    props.onStart();
  }

  function handleCancel() {
    mp.disconnect();
    props.onCancel();
  }

  return (
    <div id="lobby-screen">
      <div class="lobby-card">
        <img src={logoSrc} alt="Scoop Bus" class="lobby-logo" />

        <h2 class="lobby-title">
          {props.mode === 'host' ? 'Host Game' : 'Join Game'}
        </h2>

        <p class="lobby-course">{props.courseName}</p>

        <Show when={props.mode === 'host'}>
          <div class="room-code-display">
            <span class="room-code-label">Room Code</span>
            <span class="room-code-value">{roomCode()}</span>
            <span class="room-code-hint">Share this code with your opponent</span>
          </div>
        </Show>

        <Show when={props.mode === 'join' && !joining()}>
          <div class="join-form">
            <input
              type="text"
              class="room-code-input"
              placeholder="ABCD"
              maxLength={6}
              value={inputCode()}
              onInput={(e) => setInputCode(e.currentTarget.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button class="course-btn" onClick={handleJoin}>
              Connect
            </button>
          </div>
        </Show>

        <p class="lobby-status">{status()}</p>

        <Show when={connected()}>
          <div class="lobby-players">
            {/* Local player badge */}
            <div class="player-badge you" style={{ 'border-color': PLAYER_CSS_COLORS[(localIdx() || 1) - 1] }}>
              🚌 You (P{localIdx() || '?'} {PLAYER_NAMES[(localIdx() || 1) - 1]})
            </div>
            {/* Remote player badges */}
            <For each={mp.remotePeerIds}>{(peerId, i) => {
              const idx = mp.getPlayerIndex(peerId) || (i() + 2);
              return (
                <div class="player-badge opponent" style={{ 'border-color': PLAYER_CSS_COLORS[idx - 1] }}>
                  🚌 P{idx} {PLAYER_NAMES[idx - 1]}
                </div>
              );
            }}</For>
            {/* Empty slots */}
            <For each={Array.from({ length: MAX_PLAYERS - 1 - peerCount() })}>{() => (
              <div class="player-badge empty">🚌 Waiting...</div>
            )}</For>
          </div>
        </Show>

        <div class="lobby-buttons">
          <Show when={connected() && props.mode === 'host'}>
            <button class="course-btn start-btn" onClick={handleStart}>
              Start Race!
            </button>
          </Show>
          <Show when={connected() && props.mode === 'join'}>
            <p class="waiting-text">Waiting for host to start...</p>
          </Show>
          <button class="course-btn cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
