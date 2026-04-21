import type { Vector3 } from '@babylonjs/core';
import { PLAYER_COLORS } from '../objects/BusModel';
import type { MinimapPlayer } from '../Minimap';
import type { RemotePlayersMap } from '../types';

function color3ToHex(c: { r: number; g: number; b: number }): string {
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export interface BuildMinimapPlayersParams {
  remotePlayers: RemotePlayersMap;
  localPlayerIndex: number;
  busPos: Vector3;
  busYaw: number;
}

export function buildMinimapPlayers(params: BuildMinimapPlayersParams): MinimapPlayer[] {
  const { remotePlayers, localPlayerIndex, busPos, busYaw } = params;
  const players: MinimapPlayer[] = [];

  for (const [_peerId, remote] of remotePlayers) {
    if (!remote.state) continue;
    const palette = PLAYER_COLORS[remote.playerIndex - 1] ?? PLAYER_COLORS[1];
    players.push({
      x: remote.smoothPos.x,
      z: remote.smoothPos.z,
      yaw: remote.smoothYaw,
      color: color3ToHex(palette.body),
      isLocal: false,
    });
  }

  const localPalette = PLAYER_COLORS[localPlayerIndex - 1] ?? PLAYER_COLORS[0];
  players.push({
    x: busPos.x,
    z: busPos.z,
    yaw: busYaw,
    color: color3ToHex(localPalette.body),
    isLocal: true,
  });

  return players;
}
