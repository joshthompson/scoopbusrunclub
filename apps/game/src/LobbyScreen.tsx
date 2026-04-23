import { createSignal, Show, For } from 'solid-js';
import { mp, generateRoomCode, MAX_PLAYERS } from './multiplayer';
import levels from './levels';
import logoSrc from './assets/logo.png';

/** Player colour CSS values (1-indexed) */
const PLAYER_CSS_COLORS = ['#f0c820', '#d94030', '#3470d8', '#9940cc'];
const PLAYER_NAMES = ['Yellow', 'Red', 'Blue', 'Purple'];

/** Role emoji for a given player index: 1 = bus, 2+ = runner */
function roleEmoji(playerIndex: number): string {
  return playerIndex === 1 ? '🚌' : '🏃';
}

interface LobbyScreenProps {
  mode: 'host' | 'join';
  /** Course ID — required for host, received from host for join */
  courseId?: string;
  onStart: (courseId: string) => void;
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
  const [hostCourseId, setHostCourseId] = createSignal(props.courseId ?? '');

  const courseName = () => {
    const cid = hostCourseId();
    return cid ? (levels[cid]?.name ?? cid) : '';
  };

  // Auto-connect for host
  if (props.mode === 'host') {
    mp.courseId = props.courseId ?? '';
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

    mp.onLobbyMessage = (msg, peerId) => {
      if (msg.type === 'start') {
        const cid = hostCourseId() || msg.courseId || '';
        props.onStart(cid);
      }
      if (msg.type === 'playerInfo') {
        // Only accept our own player index assignment from the host
        // (The host is always playerIndex 1 — verify sender is host)
        const senderIsHost = mp.getPlayerIndex(peerId) === 1
          || (!isHost && msg.playerIndex !== undefined);
        if (senderIsHost && msg.playerIndex) {
          setLocalIdx(msg.playerIndex);
        }
        // Joiner receives courseId from host
        if (msg.courseId) {
          setHostCourseId(msg.courseId);
        }
      }
      // Force re-render of peer list when peer info updates
      setPeerCount(mp.peerCount);
    };
  }

  function handleJoin() {
    const code = inputCode().toUpperCase().trim();
    if (code.length < 3) return;
    setRoomCode(code);
    connectToRoom(code);
  }

  function handleStart() {
    const cid = hostCourseId();
    mp.broadcastLobby({ type: 'start', courseId: cid });
    props.onStart(cid);
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

        <Show when={courseName()}>
          <p class="lobby-course">{courseName()}</p>
        </Show>

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
              ref={(el) => setTimeout(() => el.focus(), 0)}
            />
            <button class="course-btn" onClick={handleJoin}>
              Connect
            </button>
          </div>
        </Show>

        <p class="lobby-status">{status()}</p>

        <Show when={connected()}>
          <div class="lobby-players">
            {/* All players in consistent playerIndex order */}
            <For each={(() => {
              // Re-read peerCount signal to trigger re-render on join/leave
              peerCount();
              const myIdx = localIdx() || 1;
              // Build entries: local + all remote peers
              const entries: { idx: number; isLocal: boolean }[] = [
                { idx: myIdx, isLocal: true },
              ];
              for (const peerId of mp.remotePeerIds) {
                const pIdx = mp.getPlayerIndex(peerId);
                if (pIdx) entries.push({ idx: pIdx, isLocal: false });
              }
              // Sort by playerIndex so everyone sees the same order
              entries.sort((a, b) => a.idx - b.idx);
              // Pad with empty slots up to MAX_PLAYERS
              while (entries.length < MAX_PLAYERS) {
                entries.push({ idx: 0, isLocal: false });
              }
              return entries;
            })()}>{(entry) => {
              const idx = entry.idx;
              if (idx === 0) {
                return <div class="player-badge empty">⏳ Waiting...</div>;
              }
              const color = PLAYER_CSS_COLORS[(idx - 1) % PLAYER_CSS_COLORS.length];
              const name = PLAYER_NAMES[(idx - 1) % PLAYER_NAMES.length];
              if (entry.isLocal) {
                return (
                  <div class="player-badge you" style={{ background: color }}>
                    {roleEmoji(idx)} P{idx} {name} (You)
                  </div>
                );
              }
              return (
                <div class="player-badge opponent" style={{ 'border-color': color }}>
                  {roleEmoji(idx)} P{idx} {name}
                </div>
              );
            }}</For>
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
