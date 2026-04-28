import { createSignal, Show, For } from 'solid-js';
import { mp, generateRoomCode, MAX_PLAYERS } from './multiplayer';
import levels from './levels';
import logoSrc from './assets/logo.png';
import {
  GAME_TYPE_LABELS,
  GAME_TYPE_DESCRIPTIONS,
  getGameModeConfig,
} from './game/modes';
import type { GameType, TeamColor } from './game/modes';

/** Player colour CSS values (1-indexed) */
const PLAYER_CSS_COLORS = ['#f0c820', '#d94030', '#3470d8', '#9940cc'];
const PLAYER_NAMES = ['Yellow', 'Red', 'Blue', 'Purple'];

/** Team colour CSS */
const TEAM_COLORS: Record<TeamColor, string> = { yellow: '#f0c820', blue: '#3470d8' };
const TEAM_LABELS: Record<TeamColor, string> = { yellow: 'Yellow Team', blue: 'Blue Team' };

/** Role emoji for a role string */
function roleEmoji(role: 'bus' | 'runner'): string {
  return role === 'bus' ? '🚌' : '🏃';
}

interface LobbyScreenProps {
  mode: 'host' | 'join';
  /** Course ID — required for host, received from host for join */
  courseId?: string;
  /** Game type — set by host on the game type select screen */
  gameType?: GameType;
  onStart: (courseId: string) => void;
  onCancel: () => void;
}

export function LobbyScreen(props: LobbyScreenProps) {
  const [roomCode, setRoomCode] = createSignal(
    props.mode === 'host' ? generateRoomCode() : '',
  );
  const [status, setStatus] = createSignal(
    props.mode === 'host' ? 'Waiting for players...' : 'Enter room code to join',
  );
  const [connected, setConnected] = createSignal(false);
  const [joining, setJoining] = createSignal(false);
  const [inputCode, setInputCode] = createSignal('');
  const [peerCount, setPeerCount] = createSignal(0);
  const [localIdx, setLocalIdx] = createSignal(props.mode === 'host' ? 1 : 0);
  const [hostCourseId, setHostCourseId] = createSignal(props.courseId ?? '');
  const [hostGameType, setHostGameType] = createSignal<GameType>(
    props.gameType ?? mp.gameType ?? 'scoop-race',
  );
  const [driverIndex, setDriverIndex] = createSignal(1);
  const [teamAssignments, setTeamAssignments] = createSignal<
    Map<number, { team: TeamColor; role: 'bus' | 'runner' }>
  >(new Map());

  const gt = () => hostGameType();
  const modeConfig = () => getGameModeConfig(gt());

  const courseName = () => {
    const cid = hostCourseId();
    return cid ? (levels[cid]?.name ?? cid) : '';
  };

  const totalPlayers = () => peerCount() + 1;

  const canStart = () => {
    if (!connected()) return false;
    const cfg = modeConfig();
    return totalPlayers() >= cfg.minPlayers;
  };

  /** Determine the role for a playerIndex based on current mode and settings */
  function playerRole(idx: number): 'bus' | 'runner' {
    const g = gt();
    if (g === 'bus-race') return 'bus';
    if (g === 'team-race') {
      const ta = teamAssignments().get(idx);
      return ta?.role ?? 'runner';
    }
    // scoop-race and arena: one bus driver
    return idx === driverIndex() ? 'bus' : 'runner';
  }

  /** Host: toggle the driver to a specific player (for scoop-race / arena) */
  function setDriver(idx: number) {
    if (props.mode !== 'host') return;
    setDriverIndex(idx);
    mp.driverIndex = idx;
    // Broadcast updated config to all peers
    broadcastConfig();
  }

  /** Host: toggle a player's team (for team-race) */
  function toggleTeam(idx: number) {
    if (props.mode !== 'host') return;
    const current = teamAssignments();
    const entry = current.get(idx);
    const newTeam: TeamColor = entry?.team === 'yellow' ? 'blue' : 'yellow';
    const newMap = new Map(current);
    newMap.set(idx, { team: newTeam, role: entry?.role ?? 'runner' });
    setTeamAssignments(newMap);
    mp.teamAssignments = newMap;
    broadcastConfig();
  }

  /** Host: set the driver for a team (team-race) */
  function setTeamDriver(idx: number) {
    if (props.mode !== 'host') return;
    const current = teamAssignments();
    const clickedEntry = current.get(idx);
    const clickedTeam = clickedEntry?.team ?? 'yellow';
    const newMap = new Map(current);
    // Remove bus role from anyone else on the same team
    for (const [k, v] of newMap) {
      if (v.team === clickedTeam && v.role === 'bus') {
        newMap.set(k, { ...v, role: 'runner' });
      }
    }
    newMap.set(idx, { team: clickedTeam, role: 'bus' });
    setTeamAssignments(newMap);
    mp.teamAssignments = newMap;
    broadcastConfig();
  }

  /** Build default team assignments when player count changes */
  function rebuildTeamDefaults() {
    if (gt() !== 'team-race') return;
    const count = totalPlayers();
    const newMap = new Map<number, { team: TeamColor; role: 'bus' | 'runner' }>();
    const half = Math.ceil(count / 2);
    for (let i = 1; i <= count; i++) {
      const team: TeamColor = i <= half ? 'yellow' : 'blue';
      const isFirstOnTeam = i === 1 || i === half + 1;
      newMap.set(i, { team, role: isFirstOnTeam ? 'bus' : 'runner' });
    }
    setTeamAssignments(newMap);
    mp.teamAssignments = newMap;
  }

  /** Broadcast game config to all peers */
  function broadcastConfig() {
    const taObj: Record<number, { team: TeamColor; role: 'bus' | 'runner' }> = {};
    for (const [k, v] of teamAssignments()) taObj[k] = v;
    mp.broadcastLobby({
      type: 'playerInfo',
      gameType: gt(),
      driverIndex: driverIndex(),
      teamAssignments: Object.keys(taObj).length > 0 ? taObj : undefined,
    });
  }

  // Auto-connect for host
  if (props.mode === 'host') {
    mp.courseId = props.courseId ?? '';
    mp.gameType = props.gameType ?? 'scoop-race';
    connectToRoom(roomCode());
  }

  function connectToRoom(code: string) {
    const isHost = props.mode === 'host';
    setJoining(true);
    setStatus(isHost ? 'Waiting for players...' : 'Connecting...');

    mp.connect(code, isHost);

    mp.onPeerJoin = (_peerId) => {
      setConnected(true);
      setPeerCount(mp.peerCount);
      const playerCount = mp.peerCount + 1;
      setStatus(`${playerCount} player${playerCount > 1 ? 's' : ''} connected`);
      if (isHost) rebuildTeamDefaults();
    };

    mp.onPeerLeave = (_peerId) => {
      setPeerCount(mp.peerCount);
      if (mp.peerCount === 0) {
        setConnected(false);
        setStatus(isHost ? 'Players disconnected. Waiting...' : 'Disconnected. Try again.');
      } else {
        const playerCount = mp.peerCount + 1;
        setStatus(`${playerCount} player${playerCount > 1 ? 's' : ''} connected`);
      }
      if (isHost) rebuildTeamDefaults();
    };

    mp.onLobbyMessage = (msg, peerId) => {
      if (msg.type === 'start') {
        const cid = hostCourseId() || msg.courseId || '';
        props.onStart(cid);
      }
      if (msg.type === 'playerInfo') {
        const senderIsHost = mp.getPlayerIndex(peerId) === 1
          || (!isHost && msg.playerIndex !== undefined);
        if (senderIsHost && msg.playerIndex) {
          setLocalIdx(msg.playerIndex);
        }
        if (msg.courseId) {
          setHostCourseId(msg.courseId);
        }
        if (msg.gameType) {
          setHostGameType(msg.gameType);
        }
        if (msg.driverIndex !== undefined) {
          setDriverIndex(msg.driverIndex);
        }
        if (msg.teamAssignments) {
          const ta = new Map(
            Object.entries(msg.teamAssignments).map(([k, v]) => [Number(k), v]),
          );
          setTeamAssignments(ta);
        }
      }
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
    const taObj: Record<number, { team: TeamColor; role: 'bus' | 'runner' }> = {};
    for (const [k, v] of teamAssignments()) taObj[k] = v;
    mp.broadcastLobby({
      type: 'start',
      courseId: cid,
      gameType: gt(),
      driverIndex: driverIndex(),
      teamAssignments: Object.keys(taObj).length > 0 ? taObj : undefined,
    });
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

        {/* Game type badge — hide for joiners until the host sends the game type */}
        <Show when={props.mode === 'host' || connected()}>
          <div class="lobby-game-type">
            <span class="game-type-badge">{GAME_TYPE_LABELS[gt()]}</span>
            <span class="game-type-badge-desc">{GAME_TYPE_DESCRIPTIONS[gt()]}</span>
          </div>
        </Show>

        <Show when={courseName()}>
          <p class="lobby-course">{courseName()}</p>
        </Show>

        <Show when={props.mode === 'host'}>
          <div class="room-code-display">
            <span class="room-code-label">Room Code</span>
            <span class="room-code-value">{roomCode()}</span>
            <span class="room-code-hint">Share this code with your friends</span>
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

        {/* Min players warning */}
        <Show when={connected() && !canStart() && props.mode === 'host'}>
          <p class="lobby-warning">
            Need at least {modeConfig().minPlayers} players to start {GAME_TYPE_LABELS[gt()]}
          </p>
        </Show>

        <Show when={connected()}>
          {/* Team Race: two-column team layout */}
          <Show when={gt() === 'team-race'}>
            <div class="team-columns">
              <For each={(['yellow', 'blue'] as TeamColor[])}>{(teamId) => {
                const teamColor = TEAM_COLORS[teamId];
                const teamLabel = TEAM_LABELS[teamId];

                // Gather players on this team
                const teamPlayers = () => {
                  peerCount(); // trigger re-render
                  const myIdx = localIdx() || 1;
                  const allEntries: { idx: number; isLocal: boolean }[] = [
                    { idx: myIdx, isLocal: true },
                  ];
                  for (const peerId of mp.remotePeerIds) {
                    const pIdx = mp.getPlayerIndex(peerId);
                    if (pIdx) allEntries.push({ idx: pIdx, isLocal: false });
                  }
                  return allEntries
                    .filter(e => teamAssignments().get(e.idx)?.team === teamId)
                    .sort((a, b) => a.idx - b.idx);
                };

                return (
                  <div class="team-column" style={{ 'border-color': teamColor }}>
                    <div class="team-column-header" style={{ background: teamColor }}>
                      {teamLabel}
                    </div>
                    <div class="team-column-players">
                      <For each={teamPlayers()}>{(entry) => {
                        const idx = entry.idx;
                        const role = playerRole(idx);
                        const isHost = props.mode === 'host';

                        return (
                          <div
                            class={`player-badge team-badge ${entry.isLocal ? 'you' : 'opponent'}`}
                            style={{
                              background: entry.isLocal ? teamColor : 'rgba(255,255,255,0.08)',
                              'border-color': teamColor,
                            }}
                          >
                            <span>
                              {roleEmoji(role)} P{idx} {PLAYER_NAMES[(idx - 1) % PLAYER_NAMES.length]}
                              {entry.isLocal ? ' (You)' : ''}
                            </span>
                            <Show when={isHost}>
                              <div class="team-badge-actions">
                                <button
                                  class="lobby-inline-btn"
                                  onClick={() => toggleTeam(idx)}
                                  title="Move to other team"
                                >
                                  ⇄
                                </button>
                                <Show when={role !== 'bus'}>
                                  <button
                                    class="lobby-inline-btn"
                                    onClick={() => setTeamDriver(idx)}
                                    title="Set as team driver"
                                  >
                                    🚌
                                  </button>
                                </Show>
                              </div>
                            </Show>
                          </div>
                        );
                      }}</For>
                      {/* Empty slot hint */}
                      <Show when={teamPlayers().length === 0}>
                        <div class="player-badge empty">No players yet</div>
                      </Show>
                    </div>
                  </div>
                );
              }}</For>
            </div>
          </Show>

          {/* Non-team modes: flat player list */}
          <Show when={gt() !== 'team-race'}>
            <div class="lobby-players">
              <For each={(() => {
                peerCount();
                const myIdx = localIdx() || 1;
                const entries: { idx: number; isLocal: boolean }[] = [
                  { idx: myIdx, isLocal: true },
                ];
                for (const peerId of mp.remotePeerIds) {
                  const pIdx = mp.getPlayerIndex(peerId);
                  if (pIdx) entries.push({ idx: pIdx, isLocal: false });
                }
                entries.sort((a, b) => a.idx - b.idx);
                const maxSlots = modeConfig().maxPlayers;
                while (entries.length < maxSlots) {
                  entries.push({ idx: 0, isLocal: false });
                }
                return entries;
              })()}>{(entry) => {
                const idx = entry.idx;
                if (idx === 0) {
                  return <div class="player-badge empty">⏳ Waiting...</div>;
                }
                const role = playerRole(idx);
                const color = PLAYER_CSS_COLORS[(idx - 1) % PLAYER_CSS_COLORS.length];
                const name = PLAYER_NAMES[(idx - 1) % PLAYER_NAMES.length];
                const isHost = props.mode === 'host';
                const showDriverBtn = isHost && modeConfig().hostCanAssignDriver;

                return (
                  <div
                    class={`player-badge ${entry.isLocal ? 'you' : 'opponent'}`}
                    style={entry.isLocal ? { background: color } : { 'border-color': color }}
                  >
                    <span>
                      {roleEmoji(role)} P{idx} {name}
                      {entry.isLocal ? ' (You)' : ''}
                    </span>
                    <Show when={showDriverBtn && role !== 'bus'}>
                      <button
                        class="lobby-inline-btn"
                        onClick={() => setDriver(idx)}
                        title="Set as bus driver"
                      >
                        Set Driver
                      </button>
                    </Show>
                  </div>
                );
              }}</For>
            </div>
          </Show>
        </Show>

        <div class="lobby-buttons">
          <Show when={connected() && props.mode === 'host'}>
            <button
              class="course-btn start-btn"
              onClick={handleStart}
              disabled={!canStart()}
            >
              {canStart() ? 'Start Game!' : `Need ${modeConfig().minPlayers}+ players`}
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
