/**
 * Multiplayer networking layer using Trystero (WebRTC P2P).
 *
 * Players connect via a shared room code. One hosts, others join.
 * During gameplay each player broadcasts their player state ~15 times/sec.
 */
import { joinRoom, type Room } from 'trystero';
import type { GameType, TeamColor } from './game/modes/types';

// ---------- Shared types ----------

/** Maximum number of players in a room */
export const MAX_PLAYERS = 4;

/** Minimal player state broadcast each frame */
export interface PlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speed: number;
  /** Cumulative distance for progress display */
  dist: number;
  /** Number of runners scooped */
  scooped: number;
  /** Race state of the sender */
  raceState: 'countdown' | 'racing' | 'finished';
  /** Race timer (seconds) */
  raceTime: number;
  /** Player index (1-based): 1=host, 2-4=joiners in order */
  playerIndex: number;
  /** Whether exhaust boost is currently active */
  boosting: boolean;
  /** Gate index for position tracking */
  gateIdx: number;
  /** Player role for gameplay interactions */
  role: 'bus' | 'runner';
  /** Whether the scoop plow animation is active */
  scooping: boolean;
  /** Game type for the current session */
  gameType?: GameType;
  /** Team assignment (for team-race mode) */
  team?: TeamColor;
  /** Arena: whether this runner is stuck */
  stuck?: boolean;
}

/** @deprecated Use PlayerState */
export type BusState = PlayerState;

/** Broadcast when a player scoops a runner (so all clients can sync) */
export interface ScoopEvent {
  /** Runner index (0-based into the shared runner list) */
  runnerIndex: number;
  /** Player index that scooped it */
  playerIndex: number;
  /** Scooped player index (for player-vs-player scoop), if applicable */
  victimPlayerIndex?: number;
  /** Scooper yaw at scoop time (for deterministic victim launch) */
  scooperYaw?: number;
  /** Scooper speed at scoop time (for deterministic victim launch) */
  scooperSpeed?: number;
}

/** Lobby chat / coordination messages */
export interface LobbyMessage {
  type: 'ready' | 'start' | 'playerInfo';
  name?: string;
  courseId?: string;
  /** Assigned player index (1-based), sent by host to joiners */
  playerIndex?: number;
  /** Map of peerId → playerIndex, broadcast by host so all joiners know every player's index */
  peerIndices?: Record<string, number>;
  /** Game type for the session (set by host, sent to joiners) */
  gameType?: GameType;
  /** Driver index — which player is the bus (for scoop-race, arena) */
  driverIndex?: number;
  /** Team assignments for team-race (playerIndex → { team, role }) */
  teamAssignments?: Record<number, { team: TeamColor; role: 'bus' | 'runner' }>;
}

export type OnRemoteState = (state: PlayerState, peerId: string) => void;
export type OnPeerJoin = (peerId: string) => void;
export type OnPeerLeave = (peerId: string) => void;
export type OnLobbyMessage = (msg: LobbyMessage, peerId: string) => void;

// ---------- Multiplayer class ----------

const APP_ID = 'scoopbus-run-club';
const SEND_INTERVAL_MS = 66; // ~15 Hz

export class Multiplayer {
  private room: Room | null = null;
  private sendState: ((state: PlayerState) => void) | null = null;
  private sendLobby: ((msg: LobbyMessage, targetPeers?: string | string[]) => void) | null = null;
  private sendScoop: ((evt: ScoopEvent) => void) | null = null;
  private _onRemoteState: OnRemoteState | null = null;
  private _onScoopEvent: ((evt: ScoopEvent, peerId: string) => void) | null = null;
  private _onPeerJoin: OnPeerJoin | null = null;
  private _onPeerLeave: OnPeerLeave | null = null;
  private _onLobbyMessage: OnLobbyMessage | null = null;

  private lastSendTime = 0;
  private _roomCode = '';
  private _isHost = false;
  private _peerId = '';
  private _remotePeerIds: string[] = [];
  /** Map peerId → player index (1-based). Host is always 1. */
  private _peerPlayerIndex = new Map<string, number>();
  /** This client's player index (1 for host, assigned by host for joiners) */
  private _localPlayerIndex = 1;
  /** Course ID for the room (set by host, received by joiner) */
  private _courseId = '';
  /** Game type for the room */
  private _gameType: GameType = 'scoop-race';
  /** Driver index — which player is the bus driver */
  private _driverIndex = 1;
  /** Team assignments for team-race mode */
  private _teamAssignments = new Map<number, { team: TeamColor; role: 'bus' | 'runner' }>();

  get roomCode() { return this._roomCode; }
  get isHost() { return this._isHost; }
  get peerId() { return this._peerId; }
  get remotePeerIds() { return this._remotePeerIds; }
  get peerCount() { return this._remotePeerIds.length; }
  get connected() { return this._remotePeerIds.length > 0; }
  get localPlayerIndex() { return this._localPlayerIndex; }
  /** Get the player index for a remote peer */
  getPlayerIndex(peerId: string): number { return this._peerPlayerIndex.get(peerId) ?? 0; }
  /** Course ID for the room */
  get courseId() { return this._courseId; }
  set courseId(id: string) { this._courseId = id; }
  /** Game type for the room */
  get gameType() { return this._gameType; }
  set gameType(gt: GameType) { this._gameType = gt; }
  /** Driver index */
  get driverIndex() { return this._driverIndex; }
  set driverIndex(idx: number) { this._driverIndex = idx; }
  /** Team assignments */
  get teamAssignments() { return this._teamAssignments; }
  set teamAssignments(ta: Map<number, { team: TeamColor; role: 'bus' | 'runner' }>) { this._teamAssignments = ta; }

  // ---------- Event setters ----------

  set onRemoteState(fn: OnRemoteState | null) { this._onRemoteState = fn; }
  set onPeerJoin(fn: OnPeerJoin | null) { this._onPeerJoin = fn; }
  set onPeerLeave(fn: OnPeerLeave | null) { this._onPeerLeave = fn; }
  set onLobbyMessage(fn: OnLobbyMessage | null) { this._onLobbyMessage = fn; }
  set onScoopEvent(fn: ((evt: ScoopEvent, peerId: string) => void) | null) { this._onScoopEvent = fn; }

  // ---------- Connect ----------

  /**
   * Join (or create) a room with the given code.
   * @param roomCode  Short human-readable code (e.g. "ABC123")
   * @param isHost    Whether this player is the host
   */
  connect(roomCode: string, isHost: boolean) {
    this._roomCode = roomCode;
    this._isHost = isHost;
    this._localPlayerIndex = isHost ? 1 : 0; // joiners get assigned by host
    this._peerPlayerIndex.clear();

    this.room = joinRoom({ appId: APP_ID }, roomCode);

    // Wire up actions
    const [sendState, onState] = this.room.makeAction('playerState');
    const [sendLobby, onLobby] = this.room.makeAction('lobby');
    const [sendScoop, onScoop] = this.room.makeAction('scoop');

    this.sendState = (state: PlayerState) => sendState(state as any);
    this.sendLobby = (msg: LobbyMessage, targetPeers?: string | string[]) => sendLobby(msg as any, targetPeers);
    this.sendScoop = (evt: ScoopEvent) => sendScoop(evt as any);

    onState((data, peerId: string) => {
      const state = data as unknown as PlayerState;
      // Learn peer's player index from their broadcast if not already known
      if (state.playerIndex && !this._peerPlayerIndex.has(peerId)) {
        this._peerPlayerIndex.set(peerId, state.playerIndex);
      }
      this._onRemoteState?.(state, peerId);
    });

    onLobby((data, peerId: string) => {
      const msg = data as unknown as LobbyMessage;
      // Apply driverIndex from the start message so clients always have the
      // latest driver assignment regardless of playerInfo timing.
      if (!this._isHost && msg.type === 'start') {
        if (msg.driverIndex !== undefined) {
          this._driverIndex = msg.driverIndex;
        }
        if (msg.gameType) {
          this._gameType = msg.gameType;
        }
        if (msg.teamAssignments) {
          this._teamAssignments = new Map(Object.entries(msg.teamAssignments).map(
            ([k, v]) => [Number(k), v]
          ));
        }
      }
      // If host sends us our player index and/or courseId, store them.
      // Only accept playerInfo from the peer we know is the host (or the
      // first peer we see, which in the join flow is always the host).
      if (!this._isHost && msg.type === 'playerInfo') {
        const knownHostIdx = this._peerPlayerIndex.get(peerId);
        const senderIsHost = knownHostIdx === 1 || knownHostIdx === undefined;
        if (senderIsHost) {
          if (msg.playerIndex) {
            this._localPlayerIndex = msg.playerIndex;
          }
          if (msg.courseId) {
            this._courseId = msg.courseId;
          }
          if (msg.gameType) {
            this._gameType = msg.gameType;
          }
          if (msg.driverIndex !== undefined) {
            this._driverIndex = msg.driverIndex;
          }
          if (msg.teamAssignments) {
            this._teamAssignments = new Map(Object.entries(msg.teamAssignments).map(
              ([k, v]) => [Number(k), v]
            ));
          }
          // Record the host's index
          this._peerPlayerIndex.set(peerId, 1);
        }
        // Store all peer indices broadcast by the host
        if (msg.peerIndices) {
          for (const [pid, idx] of Object.entries(msg.peerIndices)) {
            this._peerPlayerIndex.set(pid, idx);
          }
        }
      }
      // If we're host and joiner sends playerInfo, record their known index from PlayerState
      this._onLobbyMessage?.(msg, peerId);
    });

    onScoop((data, peerId: string) => {
      this._onScoopEvent?.(data as unknown as ScoopEvent, peerId);
    });

    this.room.onPeerJoin((peerId: string) => {
      if (!this._remotePeerIds.includes(peerId)) {
        this._remotePeerIds.push(peerId);
      }
      // Host assigns player indices: host=1, joiners get 2,3,4 in order
      if (this._isHost) {
        const nextIdx = this._remotePeerIds.indexOf(peerId) + 2; // +2 because host is 1
        this._peerPlayerIndex.set(peerId, nextIdx);
        // Build the full map of all peer→index assignments
        const peerIndices: Record<string, number> = {};
        for (const [pid, idx] of this._peerPlayerIndex) {
          peerIndices[pid] = idx;
        }
        // Tell the new joiner their own index + all peer indices + game config
        const teamAssignmentsObj: Record<number, { team: TeamColor; role: 'bus' | 'runner' }> = {};
        for (const [k, v] of this._teamAssignments) teamAssignmentsObj[k] = v;
        setTimeout(() => {
          this.sendLobby?.({
            type: 'playerInfo',
            playerIndex: nextIdx,
            courseId: this._courseId || undefined,
            peerIndices,
            gameType: this._gameType,
            driverIndex: this._driverIndex,
            teamAssignments: Object.keys(teamAssignmentsObj).length > 0 ? teamAssignmentsObj : undefined,
          }, peerId);
          // Also broadcast updated indices to ALL existing peers
          // so they learn about the new joiner's index
          this.sendLobby?.({
            type: 'playerInfo',
            peerIndices,
          });
        }, 100);
      }
      this._onPeerJoin?.(peerId);
    });

    this.room.onPeerLeave((peerId: string) => {
      this._remotePeerIds = this._remotePeerIds.filter(id => id !== peerId);
      this._peerPlayerIndex.delete(peerId);
      this._onPeerLeave?.(peerId);
    });
  }

  // ---------- Send ----------

  /** Broadcast local player state. Call every frame; internally rate-limited. */
  broadcastState(state: PlayerState) {
    const now = performance.now();
    if (now - this.lastSendTime < SEND_INTERVAL_MS) return;
    this.lastSendTime = now;
    this.sendState?.(state);
  }

  /** Send a lobby coordination message to all peers. */
  broadcastLobby(msg: LobbyMessage) {
    this.sendLobby?.(msg);
  }

  /** Send a lobby message to a specific peer only. */
  sendLobbyTo(msg: LobbyMessage, peerId: string) {
    this.sendLobby?.(msg, peerId);
  }

  /** Broadcast a scoop event to all peers (immediately, not rate-limited). */
  broadcastScoop(evt: ScoopEvent) {
    this.sendScoop?.(evt);
  }

  // ---------- Disconnect ----------

  disconnect() {
    if (this.room) {
      this.room.leave().catch(() => {});
      this.room = null;
    }
    this.sendState = null;
    this.sendLobby = null;
    this.sendScoop = null;
    this._remotePeerIds = [];
    this._peerPlayerIndex.clear();
    this._localPlayerIndex = 1;
    this._roomCode = '';
    this._courseId = '';
    this._gameType = 'scoop-race';
    this._driverIndex = 1;
    this._teamAssignments = new Map();
  }
}

// Singleton instance
export const mp = new Multiplayer();

// ---------- Room code generator ----------

/** Generate a random 4-char room code (uppercase letters). */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
