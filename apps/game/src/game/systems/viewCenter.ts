import type { FreeCamera } from '@babylonjs/core';

/**
 * Compute the "effective view center" on the ground plane.
 *
 * When the camera is elevated and angled down, the centre of the screen
 * hits the ground *ahead* of the camera's own XZ position.  The higher
 * the camera, the further forward that point shifts.
 *
 * This gives a better reference point than the raw camera position for:
 *   - terrain LOD / inset centering
 *   - building LOD
 *   - distance culling (trees, objects)
 *   - shader cameraPosition uniform
 *
 * The function intersects the camera's look-direction ray with y = 0
 * (ground plane).  If the ray doesn't hit the ground (looking up, or
 * camera is at/below ground) it falls back to the camera's XZ position.
 */
export function computeViewCenterXZ(camera: FreeCamera): { x: number; z: number } {
  const pos = camera.position;
  const target = camera.getTarget();

  // Direction vector from camera position toward its look-at target
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dz = target.z - pos.z;

  // We want the intersection of the ray with the horizontal plane at
  // an approximate ground height.  Using y = pos.y - height (i.e. the
  // ground directly below the camera) is a good first-order
  // approximation.  The intersection parameter is t = -pos.y / dy for
  // y = 0, but since the ground height varies we estimate the camera's
  // height above ground as the full pos.y minus the target's Y
  // (the target is usually near ground level).  This way we only need
  // the information already on the camera — no getGroundY call needed.
  const cameraHeight = pos.y - target.y;

  // If the camera isn't looking downward (dy >= 0) or is at/below the
  // target, just use camera XZ as-is.
  if (dy >= 0 || cameraHeight <= 0.5) {
    return { x: pos.x, z: pos.z };
  }

  // Parameter along the ray where it hits the target's Y plane
  // (our best proxy for ground level).
  const t = -cameraHeight / dy;

  // Clamp so the projected point isn't unreasonably far ahead.
  // At extreme zoom-out the projection could land hundreds of metres
  // away; cap at ~2× camera height to keep LOD data useful.
  const maxT = (cameraHeight * 2) / Math.sqrt(dx * dx + dz * dz + dy * dy);
  const clampedT = Math.min(t, maxT > 0 ? maxT : t);

  return {
    x: pos.x + dx * clampedT,
    z: pos.z + dz * clampedT,
  };
}
