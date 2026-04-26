import { FreeCamera, Vector3 } from '@babylonjs/core';

/**
 * Preview orbit-camera that slowly auto-rotates around the target runner.
 * The user can override the orbit angle with mouse/touch drag or keyboard.
 */

// ---- Tuning knobs ----
const CAM_DIST = 8;            // orbit radius
const LOOK_HEIGHT = 1.2;       // look-at height above runner feet
const AUTO_ROTATE_SPEED = 0; // rad/s (slow cinematic spin)
const DRAG_SENSITIVITY = 0.005; // pointer-pixel → radians
const KEY_ROTATE_SPEED = 1.5;   // rad/s for A/D or ←/→
const PITCH_DRAG_SENSITIVITY = 0.004; // pointer-pixel → radians (vertical)
const KEY_PITCH_SPEED = 1.0;    // rad/s for W/S or ↑/↓
const MIN_PITCH = 0.05;         // nearly level (radians above horizon)
const MAX_PITCH = 1.3;          // almost top-down (~75°)
const DEFAULT_PITCH = 0.35;     // ~20° above horizon

// ---- State object (one per game instance) ----

export interface PreviewOrbitState {
  /** Current orbit yaw angle (radians) */
  orbitYaw: number;
  /** Current pitch angle (radians above horizon, 0 = level, π/2 = top-down) */
  orbitPitch: number;
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Last pointer X during a drag (pixels) */
  lastPointerX: number;
  /** Last pointer Y during a drag (pixels) */
  lastPointerY: number;
  /** Accumulated yaw delta from pointer drag this frame */
  pointerYawDelta: number;
  /** Accumulated pitch delta from pointer drag this frame */
  pointerPitchDelta: number;
  /** Currently-held keyboard direction (-1 = left, +1 = right, 0 = none) */
  keyDir: number;
  /** Currently-held keyboard pitch direction (-1 = up/raise, +1 = down/lower, 0 = none) */
  keyPitchDir: number;
  /** Auto-rotate pause timer (seconds) — after user interaction, pause auto-rotate briefly */
  userIdleTimer: number;
}

export function createPreviewOrbitState(initialYaw: number): PreviewOrbitState {
  return {
    orbitYaw: initialYaw,
    orbitPitch: DEFAULT_PITCH,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    pointerYawDelta: 0,
    pointerPitchDelta: 0,
    keyDir: 0,
    keyPitchDir: 0,
    userIdleTimer: 0,
  };
}

// ---- Input wiring (call once, returns cleanup function) ----

export function setupPreviewOrbitInput(
  canvas: HTMLCanvasElement,
  state: PreviewOrbitState,
): () => void {
  // --- Pointer (mouse) ---
  const onPointerDown = (e: PointerEvent) => {
    state.isDragging = true;
    state.lastPointerX = e.clientX;
    state.lastPointerY = e.clientY;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!state.isDragging) return;
    const dx = e.clientX - state.lastPointerX;
    const dy = e.clientY - state.lastPointerY;
    state.pointerYawDelta += dx * DRAG_SENSITIVITY;
    state.pointerPitchDelta += dy * PITCH_DRAG_SENSITIVITY;
    state.lastPointerX = e.clientX;
    state.lastPointerY = e.clientY;
    state.userIdleTimer = 3; // pause auto-rotate for 3 s after drag
  };
  const onPointerUp = () => {
    state.isDragging = false;
  };

  // --- Touch ---
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      state.isDragging = true;
      state.lastPointerX = e.touches[0].clientX;
      state.lastPointerY = e.touches[0].clientY;
    }
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!state.isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - state.lastPointerX;
    const dy = e.touches[0].clientY - state.lastPointerY;
    state.pointerYawDelta += dx * DRAG_SENSITIVITY;
    state.pointerPitchDelta += dy * PITCH_DRAG_SENSITIVITY;
    state.lastPointerX = e.touches[0].clientX;
    state.lastPointerY = e.touches[0].clientY;
    state.userIdleTimer = 3;
    e.preventDefault(); // prevent scroll
  };
  const onTouchEnd = () => {
    state.isDragging = false;
  };

  // --- Keyboard ---
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      state.keyDir = -1;
      state.userIdleTimer = 3;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      state.keyDir = 1;
      state.userIdleTimer = 3;
    }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      state.keyPitchDir = 1; // raise camera angle
      state.userIdleTimer = 3;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      state.keyPitchDir = -1; // lower camera angle
      state.userIdleTimer = 3;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (
      e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ||
      e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D'
    ) {
      state.keyDir = 0;
    }
    if (
      e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' ||
      e.key === 'ArrowDown' || e.key === 's' || e.key === 'S'
    ) {
      state.keyPitchDir = 0;
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Return cleanup
  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchEnd);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}

// ---- Per-frame update ----

export interface PreviewOrbitCameraParams {
  dt: number;
  camera: FreeCamera;
  targetX: number;
  targetY: number;
  targetZ: number;
  getGroundY: (x: number, z: number) => number;
  state: PreviewOrbitState;
}

export function updatePreviewOrbitCamera(params: PreviewOrbitCameraParams): void {
  const { dt, camera, targetX, targetY, targetZ, getGroundY, state } = params;

  // --- Consume pointer drag deltas ---
  state.orbitYaw += state.pointerYawDelta;
  state.orbitPitch += state.pointerPitchDelta;
  state.pointerYawDelta = 0;
  state.pointerPitchDelta = 0;

  // --- Keyboard rotation (yaw) ---
  if (state.keyDir !== 0) {
    state.orbitYaw += state.keyDir * KEY_ROTATE_SPEED * dt;
  }

  // --- Keyboard pitch ---
  if (state.keyPitchDir !== 0) {
    state.orbitPitch += state.keyPitchDir * KEY_PITCH_SPEED * dt;
  }

  // Clamp pitch
  state.orbitPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, state.orbitPitch));

  // --- Auto-rotate (only when user is idle) ---
  if (state.userIdleTimer > 0) {
    state.userIdleTimer -= dt;
  } else if (!state.isDragging && state.keyDir === 0) {
    state.orbitYaw += AUTO_ROTATE_SPEED * dt;
  }

  // --- Compute desired camera position on orbit sphere ---
  const horizDist = CAM_DIST * Math.cos(state.orbitPitch);
  const camHeight = CAM_DIST * Math.sin(state.orbitPitch);
  const camX = targetX + Math.sin(state.orbitYaw) * horizDist;
  const camZ = targetZ + Math.cos(state.orbitYaw) * horizDist;
  const targetGroundY = getGroundY(targetX, targetZ);
  const camGroundY = getGroundY(camX, camZ);
  const camY = Math.max(targetGroundY, camGroundY) + camHeight;

  // --- Smooth camera position ---
  const posSmooth = Math.min(1, 8 * dt);
  camera.position.x += (camX - camera.position.x) * posSmooth;
  camera.position.y += (camY - camera.position.y) * posSmooth;
  camera.position.z += (camZ - camera.position.z) * posSmooth;

  // --- Smooth look-at ---
  const lookTarget = new Vector3(targetX, targetY + LOOK_HEIGHT, targetZ);
  const prevTarget = camera.getTarget();
  const lookSmooth = 1 - Math.exp(-6 * dt);
  camera.setTarget(new Vector3(
    prevTarget.x + (lookTarget.x - prevTarget.x) * lookSmooth,
    prevTarget.y + (lookTarget.y - prevTarget.y) * lookSmooth,
    prevTarget.z + (lookTarget.z - prevTarget.z) * lookSmooth,
  ));
}
