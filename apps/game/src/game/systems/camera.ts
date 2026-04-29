import { FreeCamera, Vector3 } from '@babylonjs/core';
import { DEMO_CAMERA_SPEED } from '../constants';

export interface DemoCameraParams {
  dt: number;
  camera: FreeCamera;
  pathPositions: [number, number][];
  pathHeights: number[];
  pathCumDist: number[];
  pathTotalDistance: number;
  demoCamProgress: number;
}

export function updateDemoCameraSystem(params: DemoCameraParams): number {
  const {
    dt,
    camera,
    pathPositions,
    pathHeights,
    pathCumDist,
    pathTotalDistance,
  } = params;

  if (pathPositions.length < 2) return params.demoCamProgress;

  let demoCamProgress = params.demoCamProgress + (DEMO_CAMERA_SPEED * dt) / pathTotalDistance;
  if (demoCamProgress > 1) demoCamProgress -= 1;

  const totalDist = pathCumDist[pathCumDist.length - 1];
  const targetDist = demoCamProgress * totalDist;

  const samplePath = (dist: number): { x: number; z: number; y: number } => {
    const d = ((dist % totalDist) + totalDist) % totalDist;
    let idx = 0;
    for (let i = 1; i < pathCumDist.length; i++) {
      if (pathCumDist[i] >= d) {
        idx = i - 1;
        break;
      }
    }

    const segLen = pathCumDist[idx + 1] - pathCumDist[idx];
    const t = segLen > 0 ? (d - pathCumDist[idx]) / segLen : 0;
    const [ax, az] = pathPositions[idx];
    const [bx, bz] = pathPositions[idx + 1] ?? pathPositions[idx];
    const hA = pathHeights[idx] ?? 0;
    const hB = pathHeights[idx + 1] ?? hA;

    return {
      x: ax + (bx - ax) * t,
      z: az + (bz - az) * t,
      y: hA + (hB - hA) * t,
    };
  };

  const pos = samplePath(targetDist);
  const YAW_LOOK_DIST = 30;
  const ahead = samplePath(targetDist + YAW_LOOK_DIST);
  const dx = ahead.x - pos.x;
  const dz = ahead.z - pos.z;
  const yaw = Math.atan2(dx, dz);

  const sideX = Math.cos(yaw);
  const sideZ = -Math.sin(yaw);

  const camHeight = 25;
  const camSide = 20;
  const camX = pos.x + sideX * camSide;
  const camZ = pos.z + sideZ * camSide;
  const camY = pos.y + camHeight;

  const smooth = 1 - Math.exp(-2.5 * dt);
  camera.position.x += (camX - camera.position.x) * smooth;
  camera.position.y += (camY - camera.position.y) * smooth;
  camera.position.z += (camZ - camera.position.z) * smooth;

  const LOOK_AHEAD_DIST = 80;
  const look = samplePath(targetDist + LOOK_AHEAD_DIST);
  const lookTarget = new Vector3(look.x, look.y + 2, look.z);

  const prevTarget = camera.getTarget();
  const lookSmooth = 1 - Math.exp(-3 * dt);
  const smoothedTarget = new Vector3(
    prevTarget.x + (lookTarget.x - prevTarget.x) * lookSmooth,
    prevTarget.y + (lookTarget.y - prevTarget.y) * lookSmooth,
    prevTarget.z + (lookTarget.z - prevTarget.z) * lookSmooth,
  );
  camera.setTarget(smoothedTarget);

  return demoCamProgress;
}

export interface CountdownCameraParams {
  dt: number;
  camera: FreeCamera;
  busYaw: number;
  busPos: Vector3;
  countdownTimer: number;
  countdownDuration: number;
  getGroundY: (x: number, z: number) => number;
  getWaterSurfaceY?: (x: number, z: number) => number | null;
}

export function updateCountdownCameraSystem(params: CountdownCameraParams): void {
  const { dt, camera, busYaw, busPos, countdownTimer, countdownDuration, getGroundY, getWaterSurfaceY } = params;

  const t = Math.max(0, Math.min(1, 1 - countdownTimer / countdownDuration));
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const camDist = 18;
  const camHeightStart = 10;
  const camHeightEnd = 8;
  const camHeight = camHeightStart + (camHeightEnd - camHeightStart) * ease;

  const orbitAngle = busYaw + ease * Math.PI;
  const orbitDir = new Vector3(Math.sin(orbitAngle), 0, Math.cos(orbitAngle));

  const distStart = 14;
  const distEnd = camDist;
  const dist = distStart + (distEnd - distStart) * ease;

  const camX = busPos.x + orbitDir.x * dist;
  const camZ = busPos.z + orbitDir.z * dist;
  const groundY = getGroundY(busPos.x, busPos.z);
  const camGroundY = getGroundY(camX, camZ);
  let baseY = Math.max(groundY, camGroundY);
  if (getWaterSurfaceY) {
    const waterAtBus = getWaterSurfaceY(busPos.x, busPos.z);
    const waterAtCam = getWaterSurfaceY(camX, camZ);
    if (waterAtBus !== null) baseY = Math.max(baseY, waterAtBus);
    if (waterAtCam !== null) baseY = Math.max(baseY, waterAtCam);
  }
  const camY = baseY + camHeight;

  const desiredCamPos = new Vector3(camX, camY, camZ);
  const camSmooth = Math.min(1, 6 * dt);
  camera.position.x += (desiredCamPos.x - camera.position.x) * camSmooth;
  camera.position.y += (desiredCamPos.y - camera.position.y) * camSmooth;
  camera.position.z += (desiredCamPos.z - camera.position.z) * camSmooth;

  camera.setTarget(new Vector3(busPos.x, busPos.y + 2.5, busPos.z));
}

export interface ChaseCameraParams {
  dt: number;
  camera: FreeCamera;
  busYaw: number;
  busSpeed: number;
  busPos: Vector3;
  cameraYawOffset: number;
  getGroundY: (x: number, z: number) => number;
  getWaterSurfaceY?: (x: number, z: number) => number | null;
}

export function updateChaseCameraSystem(params: ChaseCameraParams): number {
  const { dt, camera, busYaw, busSpeed, busPos, getGroundY, getWaterSurfaceY } = params;

  const camDist = 18;
  const camHeight = 8;
  const lookAhead = 8;

  const targetYawOffset = busSpeed < -1 ? Math.PI : 0;
  const camSwingSpeed = 3;
  const yawDiff = targetYawOffset - params.cameraYawOffset;
  const cameraYawOffset = params.cameraYawOffset + Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), camSwingSpeed * dt);

  const camYaw = busYaw + cameraYawOffset;
  const camForward = new Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));

  const camX = busPos.x - camForward.x * camDist;
  const camZ = busPos.z - camForward.z * camDist;
  const groundY = getGroundY(busPos.x, busPos.z);
  const camGroundY = getGroundY(camX, camZ);
  // Ensure the camera never dips below a water surface (avoids rendering
  // inside water geometry which fills the screen with blue).
  let baseY = Math.max(groundY, camGroundY);
  if (getWaterSurfaceY) {
    const waterAtBus = getWaterSurfaceY(busPos.x, busPos.z);
    const waterAtCam = getWaterSurfaceY(camX, camZ);
    if (waterAtBus !== null) baseY = Math.max(baseY, waterAtBus);
    if (waterAtCam !== null) baseY = Math.max(baseY, waterAtCam);
  }
  const camY = baseY + camHeight;

  const desiredCamPos = new Vector3(camX, camY, camZ);
  const camSmooth = Math.min(1, 5 * dt);
  camera.position.x += (desiredCamPos.x - camera.position.x) * camSmooth;
  camera.position.y += (desiredCamPos.y - camera.position.y) * camSmooth;
  camera.position.z += (desiredCamPos.z - camera.position.z) * camSmooth;

  camera.setTarget(
    new Vector3(
      busPos.x + camForward.x * lookAhead,
      busPos.y + 2.5,
      busPos.z + camForward.z * lookAhead,
    ),
  );

  return cameraYawOffset;
}

export interface RunnerCameraParams {
  dt: number;
  camera: FreeCamera;
  runnerYaw: number;
  runnerPos: Vector3;
  getGroundY: (x: number, z: number) => number;
  getWaterSurfaceY?: (x: number, z: number) => number | null;
}

export function updateRunnerCameraSystem(params: RunnerCameraParams): void {
  const { dt, camera, runnerYaw, runnerPos, getGroundY, getWaterSurfaceY } = params;

  const camDist = 9;
  const camHeight = 3.2;
  const lookAhead = 6;
  const lookHeight = 1.4;

  const forward = new Vector3(Math.sin(runnerYaw), 0, Math.cos(runnerYaw));

  const camX = runnerPos.x - forward.x * camDist;
  const camZ = runnerPos.z - forward.z * camDist;
  const groundY = getGroundY(runnerPos.x, runnerPos.z);
  const camGroundY = getGroundY(camX, camZ);
  let baseY = Math.max(groundY, camGroundY);
  if (getWaterSurfaceY) {
    const waterAtRunner = getWaterSurfaceY(runnerPos.x, runnerPos.z);
    const waterAtCam = getWaterSurfaceY(camX, camZ);
    if (waterAtRunner !== null) baseY = Math.max(baseY, waterAtRunner);
    if (waterAtCam !== null) baseY = Math.max(baseY, waterAtCam);
  }
  const camY = baseY + camHeight;

  const desiredCamPos = new Vector3(camX, camY, camZ);
  const camSmooth = Math.min(1, 7 * dt);
  camera.position.x += (desiredCamPos.x - camera.position.x) * camSmooth;
  camera.position.y += (desiredCamPos.y - camera.position.y) * camSmooth;
  camera.position.z += (desiredCamPos.z - camera.position.z) * camSmooth;

  camera.setTarget(
    new Vector3(
      runnerPos.x + forward.x * lookAhead,
      runnerPos.y + lookHeight,
      runnerPos.z + forward.z * lookAhead,
    ),
  );
}
