/**
 * Multiplayer networking layer using Trystero (WebRTC P2P).
 *
 * Two players connect via a shared room code. One hosts, one joins.
 * During gameplay each player broadcasts their bus state ~15 times/sec.
 */
import { joinRoom, type Room } from 'trystero';

// ---------- Shared types ----------

/** Minimal bus state broadcast each frame */
export interface BusState {
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
}

/** Lobby chat / coordination messages */
export interface LobbyMessage {
  type: 'ready' | 'start' | 'playerInfo';
  name?: string;
  courseId?: string;
}

export type OnRemoteState = (state: BusState, peerId: string) => void;
export type OnPeerJoin = (peerId: string) => void;
export type OnPeerLeave = (peerId: string) => void;
export type OnLobbyMessage = (msg: LobbyMessage, peerId: string) => void;

// ---------- Multiplayer class ----------

const APP_ID = 'scoopbus-run-club';
const SEND_INTERVAL_MS = 66; // ~15 Hz

export class Multiplayer {
  private room: Room | null = null;
  private sendState: ((state: BusState) => void) | null = null;
  private sendLobby: ((msg: LobbyMessage) => void) | null = null;
  private _onRemoteState: OnRemoteState | null = null;
  private _onPeerJoin: OnPeerJoin | null = null;
  private _onPeerLeave: OnPeerLeave | null = null;
  private _onLobbyMessage: OnLobbyMessage | null = null;

  private lastSendTime = 0;
  private _roomCode = '';
  private _isHost = false;
  private _peerId = '';
  private _remotePeerIds: string[] = [];

  get roomCode() { return this._roomCode; }
  get isHost() { return this._isHost; }
  get peerId() { return this._peerId; }
  get remotePeerIds() { return this._remotePeerIds; }
  get peerCount() { return this._remotePeerIds.length; }
  get connected() { return this._remotePeerIds.length > 0; }

  // ---------- Event setters ----------

  set onRemoteState(fn: OnRemoteState | null) { this._onRemoteState = fn; }
  set onPeerJoin(fn: OnPeerJoin | null) { this._onPeerJoin = fn; }
  set onPeerLeave(fn: OnPeerLeave | null) { this._onPeerLeave = fn; }
  set onLobbyMessage(fn: OnLobbyMessage | null) { this._onLobbyMessage = fn; }

  // ---------- Connect ----------

  /**
   * Join (or create) a room with the given code.
   * @param roomCode  Short human-readable code (e.g. "ABC123")
   * @param isHost    Whether this player is the host
   */
  connect(roomCode: string, isHost: boolean) {
    this._roomCode = roomCode;
    this._isHost = isHost;

    this.room = joinRoom({ appId: APP_ID }, roomCode);

    // Wire up actions
    const [sendState, onState] = this.room.makeAction('busState');
    const [sendLobby, onLobby] = this.room.makeAction('lobby');

    this.sendState = (state: BusState) => sendState(state as any);
    this.sendLobby = (msg: LobbyMessage) => sendLobby(msg as any);

    onState((data, peerId: string) => {
      this._onRemoteState?.(data as unknown as BusState, peerId);
    });

    onLobby((data, peerId: string) => {
      this._onLobbyMessage?.(data as unknown as LobbyMessage, peerId);
    });

    this.room.onPeerJoin((peerId: string) => {
      if (!this._remotePeerIds.includes(peerId)) {
        this._remotePeerIds.push(peerId);
      }
      this._onPeerJoin?.(peerId);
    });

    this.room.onPeerLeave((peerId: string) => {
      this._remotePeerIds = this._remotePeerIds.filter(id => id !== peerId);
      this._onPeerLeave?.(peerId);
    });
  }

  // ---------- Send ----------

  /** Broadcast local bus state. Call every frame; internally rate-limited. */
  broadcastState(state: BusState) {
    const now = performance.now();
    if (now - this.lastSendTime < SEND_INTERVAL_MS) return;
    this.lastSendTime = now;
    this.sendState?.(state);
  }

  /** Send a lobby coordination message to all peers. */
  broadcastLobby(msg: LobbyMessage) {
    this.sendLobby?.(msg);
  }

  // ---------- Disconnect ----------

  disconnect() {
    if (this.room) {
      this.room.leave().catch(() => {});
      this.room = null;
    }
    this.sendState = null;
    this.sendLobby = null;
    this._remotePeerIds = [];
    this._roomCode = '';
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
