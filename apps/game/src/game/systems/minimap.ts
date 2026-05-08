import type { Vector3 } from '@babylonjs/core';
import { PLAYER_COLORS } from '../objects/BusModel';
import type { MinimapPlayer } from '../Minimap';
import type { RemotePlayersMap } from '../types';
import type { CharacterSelection } from '../characters';
import { resolveRunnerAppearance, resolveColor, resolveBusColor } from '../characters';

function color3ToHex(c: { r: number; g: number; b: number }): string {
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function resolveMinimapColor(charSel: CharacterSelection | null | undefined, playerIndex: number): string {
  if (charSel?.type === 'runner') {
    const appearance = resolveRunnerAppearance(charSel.runnerId);
    return resolveColor(appearance.topColor);
  }
  if (charSel?.type === 'bus') {
    const opt = resolveBusColor(charSel.busColorId);
    return opt.bodyHex;
  }
  const palette = PLAYER_COLORS[playerIndex - 1] ?? PLAYER_COLORS[0];
  return color3ToHex(palette.body);
}

export interface BuildMinimapPlayersParams {
  remotePlayers: RemotePlayersMap;
  localPlayerIndex: number;
  busPos: Vector3;
  busYaw: number;
  charSelection?: CharacterSelection | null;
}

export function buildMinimapPlayers(params: BuildMinimapPlayersParams): MinimapPlayer[] {
  const { remotePlayers, localPlayerIndex, busPos, busYaw, charSelection } = params;
  const players: MinimapPlayer[] = [];

  for (const [_peerId, remote] of remotePlayers) {
    if (!remote.state) continue;
    const remoteCharSel = remote.state.charSelection;
    const color = remoteCharSel
      ? resolveMinimapColor(remoteCharSel, remote.playerIndex)
      : color3ToHex((PLAYER_COLORS[remote.playerIndex - 1] ?? PLAYER_COLORS[1]).body);
    players.push({
      x: remote.smoothPos.x,
      z: remote.smoothPos.z,
      yaw: remote.smoothYaw,
      color,
      isLocal: false,
    });
  }

  players.push({
    x: busPos.x,
    z: busPos.z,
    yaw: busYaw,
    color: resolveMinimapColor(charSelection, localPlayerIndex),
    isLocal: true,
  });

  return players;
}
