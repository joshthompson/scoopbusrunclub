import type { RemotePlayersMap } from '../types';
import { poseRunning, poseStanding } from '../objects/RunnerModel';

const SCOOP_ANIM_DURATION = 0.35;

export interface UpdateRemotePlayersParams {
  remotePlayers: RemotePlayersMap;
  dt: number;
  busRoofY: number;
  /** Current engine vibration Y offset for body shell. */
  engineVibeOffset: number;
}

export function updateRemotePlayersSystem(params: UpdateRemotePlayersParams): void {
  const { remotePlayers, dt, busRoofY, engineVibeOffset } = params;

  for (const [_peerId, remote] of remotePlayers) {
    if (!remote.state) continue;
    const mesh = remote.mesh;
    const s = remote.state;
    const lerp = Math.min(1, 10 * dt);

    remote.smoothPos.x += (s.x - remote.smoothPos.x) * lerp;
    remote.smoothPos.y += (s.y - remote.smoothPos.y) * lerp;
    remote.smoothPos.z += (s.z - remote.smoothPos.z) * lerp;

    let yawDiff = s.yaw - remote.smoothYaw;
    while (yawDiff > Math.PI) yawDiff -= 2 * Math.PI;
    while (yawDiff < -Math.PI) yawDiff += 2 * Math.PI;
    remote.smoothYaw += yawDiff * lerp;

    remote.smoothPitch += (s.pitch - remote.smoothPitch) * lerp;

    const isRunner = s.role === 'runner';

    mesh.position.copyFrom(remote.smoothPos);
    mesh.rotation.y = remote.smoothYaw;
    mesh.rotation.x = -remote.smoothPitch;
    mesh.setEnabled(!isRunner);

    // Engine vibration on remote bus body shell
    if (!isRunner) {
      remote.bodyShell.position.y = engineVibeOffset;
    }

    if (remote.runnerModel) {
      remote.runnerModel.root.setEnabled(isRunner);
      if (isRunner) {
        remote.runnerModel.root.position.copyFrom(remote.smoothPos);
        remote.runnerModel.root.rotation.x = 0;
        remote.runnerModel.root.rotation.z = 0;
        remote.runnerModel.root.rotation.y = remote.smoothYaw;
        if (Math.abs(s.speed) > 0.15) {
          remote.runnerAnimPhase += dt * Math.abs(s.speed) * 3.2;
          poseRunning(remote.runnerModel, remote.runnerAnimPhase);
        } else {
          poseStanding(remote.runnerModel);
        }
      }
    }

    // --- Scoop plow animation ---
    if (s.scooping && remote.scoopAnimTimer <= 0) {
      remote.scoopAnimTimer = SCOOP_ANIM_DURATION;
    }
    if (remote.scoopAnimTimer > 0) {
      remote.scoopAnimTimer -= dt;
      const t = 1 - remote.scoopAnimTimer / SCOOP_ANIM_DURATION;
      const ease = Math.sin(t * Math.PI);
      remote.scoopPivot.rotation.x = ease * -1.2;
      remote.scoopPivot.position.y = (remote.scoopPivot as any).__restY + ease * 0.5;
      remote.scoopPivot.position.z = (remote.scoopPivot as any).__restZ + ease * 0.35;
    } else {
      remote.scoopPivot.rotation.x = 0;
      remote.scoopPivot.position.y = (remote.scoopPivot as any).__restY ?? remote.scoopPivot.position.y;
      remote.scoopPivot.position.z = (remote.scoopPivot as any).__restZ ?? remote.scoopPivot.position.z;
    }

    if (remote.exhaustFlames) {
      if (!isRunner && s.boosting && !remote.exhaustFlames.isStarted()) {
        remote.exhaustFlames.start();
      } else if ((isRunner || !s.boosting) && remote.exhaustFlames.isStarted()) {
        remote.exhaustFlames.stop();
      }
    }

    const sinY = Math.sin(remote.smoothYaw);
    const cosY = Math.cos(remote.smoothYaw);
    for (const anchor of remote.riderAnchors) {
      anchor.setEnabled(!isRunner);
      const roofOffsetX = (anchor as MeshWithRoofOffset).__roofOffsetX ?? 0;
      const roofOffsetZ = (anchor as MeshWithRoofOffset).__roofOffsetZ ?? 0;
      anchor.position.x = remote.smoothPos.x + cosY * roofOffsetX + sinY * roofOffsetZ;
      anchor.position.z = remote.smoothPos.z - sinY * roofOffsetX + cosY * roofOffsetZ;
      anchor.position.y = remote.smoothPos.y + busRoofY + engineVibeOffset;
      anchor.rotation.y = remote.smoothYaw;
    }
  }
}

type MeshWithRoofOffset = {
  __roofOffsetX?: number;
  __roofOffsetZ?: number;
};
