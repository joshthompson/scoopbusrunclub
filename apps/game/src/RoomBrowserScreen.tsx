import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { lobby, type RoomInfo, MAX_PLAYERS } from './multiplayer';
import { GAME_TYPE_LABELS } from './game/modes';
import levels from './levels';
import logoSrc from './assets/logo.png';
import { useMenuNav } from './useMenuNav';
import { MuteButton } from './MuteButton';

interface RoomBrowserScreenProps {
  onHost: () => void;
  onJoin: (roomCode: string) => void;
  onBack: () => void;
}

export function RoomBrowserScreen(props: RoomBrowserScreenProps) {
  const [rooms, setRooms] = createSignal<RoomInfo[]>([]);
  // Items: mute, Host Game, ...Join buttons per room, Back
  const { isFocused, setFocusedIndex } = useMenuNav(() => 1 + 1 + rooms().length + 1, { onBack: props.onBack });
  setFocusedIndex(1);

  onMount(() => {
    lobby.joinLobby();
    lobby.onChange = () => setRooms(lobby.rooms);
  });

  onCleanup(() => {
    lobby.onChange = null;
    lobby.leaveLobby();
  });

  function levelName(courseId: string): string {
    const meta = levels[courseId];
    return meta?.name ?? courseId;
  }

  function gameModeName(gameType: string): string {
    return GAME_TYPE_LABELS[gameType as keyof typeof GAME_TYPE_LABELS] ?? gameType;
  }

  return (
    <div id="room-browser-screen">
      <MuteButton focused={isFocused(0)} />
      <div class="room-browser-card">
        <img src={logoSrc} alt="Scoop Bus" class="lobby-logo" />
        <h2 class="screen-heading">Online Multiplayer</h2>

        <button class="course-btn host-btn" classList={{ 'menu-focused': isFocused(1) }} onClick={props.onHost}>
          Host Game
        </button>

        <div class="room-browser-table-wrap">
          <Show
            when={rooms().length > 0}
            fallback={
              <p class="room-browser-empty">
                No games found. Host one or wait for others...
              </p>
            }
          >
            <table class="room-browser-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Game Mode</th>
                  <th>Players</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <For each={rooms()}>
                  {(room, i) => (
                    <tr>
                      <td>{levelName(room.courseId)}</td>
                      <td>{gameModeName(room.gameType)}</td>
                      <td>
                        {room.playerCount}/{room.maxPlayers}
                      </td>
                      <td>
                        <button
                          class="room-join-btn"
                          classList={{ 'menu-focused': isFocused(2 + i()) }}
                          onClick={() => props.onJoin(room.roomCode)}
                          disabled={room.playerCount >= room.maxPlayers}
                        >
                          Join
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </div>

        <button class="course-btn cancel-btn back-btn" classList={{ 'menu-focused': isFocused(2 + rooms().length) }} onClick={props.onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
