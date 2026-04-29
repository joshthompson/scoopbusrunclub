/**
 * Bus-to-bus collision physics with momentum conservation,
 * oriented bounding box (OBB) detection, and contact-point-aware
 * angular impulse so that hitting the back of a bus feels different
 * from hitting the front or side.
 *
 * All buses share the same mass and dimensions.
 * Bus local space: +Z = forward, +X = right.
 */

// ── Bus physical dimensions (from BusModel.ts) ──────────────────
/** Half-width of the bus body (local X axis) */
export const BUS_HALF_WIDTH = 1.4; // slightly wider than visual 2.4/2 to feel generous
/** Half-length of the bus body (local Z axis, cabin + hood combined) */
export const BUS_HALF_LENGTH = 4.2; // (7.0 cabin + 1.2 hood) / 2 ≈ 4.1, rounded up
/** Mass of every bus (kg-ish, used for inertia ratio calculations) */
export const BUS_MASS = 4.0;
/**
 * Moment of inertia for a solid rectangle:  I = m/12 * (w² + l²)
 * With m=4, w=2.8, l=8.4
 */
export const BUS_INERTIA = (BUS_MASS / 12) * ((2 * BUS_HALF_WIDTH) ** 2 + (2 * BUS_HALF_LENGTH) ** 2);
/** Coefficient of restitution (0 = perfectly inelastic, 1 = perfectly elastic) */
export const BUS_RESTITUTION = 0.45;
/**
 * Scales the collision impulse applied to both linear and angular velocity.
 * >1 = buses bounce harder off each other, <1 = softer bumps.
 * This is the main knob for making collisions feel more or less dramatic.
 */
export const BUS_COLLISION_IMPULSE_SCALE = 2;
/** Maximum angular impulse added per collision (rad/s) — prevents wild spins */
export const BUS_MAX_ANGULAR_IMPULSE = 3.5;
/** Maximum added yaw-rate that persists between frames (rad/s) */
export const BUS_MAX_YAW_RATE = 2.5;
/** Damping applied to collision-induced yaw rate each frame (per second) */
export const BUS_YAW_RATE_DAMPING = 4.0;

// ── Types ────────────────────────────────────────────────────────

export interface BusCollisionState {
  /** Position X (world) */
  x: number;
  /** Position Z (world) */
  z: number;
  /** Heading in radians (0 = +Z) */
  yaw: number;
  /** Scalar forward speed (m/s) along the velocity angle */
  speed: number;
  /** Velocity angle (may differ from yaw due to drift) */
  velAngle: number;
  /** Angular velocity in rad/s caused by collisions (added to yaw each frame) */
  yawRate: number;
}

export interface RemoteBusSnapshot {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  /** Opaque key to identify which remote this is (index into the array) */
  id?: string;
}

/**
 * Predicted nudge to apply to a remote bus's visual position so that
 * the collision looks two-sided before the network update arrives.
 */
export interface RemoteBusNudge {
  id: string;
  dx: number;
  dz: number;
  dYaw: number;
}

export interface BusCollisionResult {
  /** Updated local bus state */
  local: BusCollisionState;
  /** True if any collision occurred this call */
  collided: boolean;
  /** Predicted nudges for each remote bus that was hit */
  remoteNudges: RemoteBusNudge[];
}

// ── Helpers ──────────────────────────────────────────────────────

/** Rotate point (px,pz) by angle a */
function rotate(px: number, pz: number, a: number): [number, number] {
  const s = Math.sin(a);
  const c = Math.cos(a);
  return [c * px + s * pz, -s * px + c * pz];
}

/** Get the 4 corner points of an OBB given centre, yaw, half-sizes. */
function getCorners(cx: number, cz: number, yaw: number, hw: number, hl: number): [number, number][] {
  const corners: [number, number][] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const [rx, rz] = rotate(sx * hw, sz * hl, yaw);
      corners.push([cx + rx, cz + rz]);
    }
  }
  return corners;
}

/** Get the two unique edge normals (axes) for an OBB. */
function getAxes(yaw: number): [number, number][] {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  // Forward axis (local Z rotated) and right axis (local X rotated)
  return [
    [s, c],   // forward direction
    [c, -s],  // right direction
  ];
}

/** Project corners onto an axis and return [min, max]. */
function projectOntoAxis(corners: [number, number][], ax: number, az: number): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const [cx, cz] of corners) {
    const d = cx * ax + cz * az;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

/** SAT overlap test on a single axis. Returns overlap depth (negative = separated). */
function axisOverlap(
  cornersA: [number, number][],
  cornersB: [number, number][],
  ax: number,
  az: number,
): number {
  const [minA, maxA] = projectOntoAxis(cornersA, ax, az);
  const [minB, maxB] = projectOntoAxis(cornersB, ax, az);
  return Math.min(maxA - minB, maxB - minA);
}

// ── Main collision solver ────────────────────────────────────────

/**
 * Resolve collisions between the local bus and an array of remote bus
 * snapshots using OBB + SAT for detection and impulse-based momentum
 * conservation for the response.
 *
 * Only the local bus state is mutated — remote buses are treated as
 * authoritative (their physics runs on their own client).
 */
export function resolveBusToBusCollisions(
  local: BusCollisionState,
  remotes: RemoteBusSnapshot[],
  dt: number,
): BusCollisionResult {
  let collided = false;
  const remoteNudges: RemoteBusNudge[] = [];

  const localCorners = getCorners(local.x, local.z, local.yaw, BUS_HALF_WIDTH, BUS_HALF_LENGTH);

  for (const remote of remotes) {
    const remoteCorners = getCorners(remote.x, remote.z, remote.yaw, BUS_HALF_WIDTH, BUS_HALF_LENGTH);

    // ── SAT overlap test (4 axes total: 2 per OBB) ──
    const axes = [...getAxes(local.yaw), ...getAxes(remote.yaw)];

    let minOverlap = Infinity;
    let mtdAxisX = 0;
    let mtdAxisZ = 0;

    let separated = false;
    for (const [ax, az] of axes) {
      const overlap = axisOverlap(localCorners, remoteCorners, ax, az);
      if (overlap <= 0) {
        separated = true;
        break;
      }
      if (overlap < minOverlap) {
        minOverlap = overlap;
        mtdAxisX = ax;
        mtdAxisZ = az;
      }
    }
    if (separated) continue;

    // ── Ensure MTD points from remote → local ──
    const toCentreX = local.x - remote.x;
    const toCentreZ = local.z - remote.z;
    if (toCentreX * mtdAxisX + toCentreZ * mtdAxisZ < 0) {
      mtdAxisX = -mtdAxisX;
      mtdAxisZ = -mtdAxisZ;
    }

    // ── Separate the local bus (push out along MTD) ──
    local.x += mtdAxisX * minOverlap;
    local.z += mtdAxisZ * minOverlap;

    // ── Contact point (approximate: midpoint along the overlap region) ──
    // Average of centres works well enough for impulse direction
    const contactX = (local.x + remote.x) * 0.5;
    const contactZ = (local.z + remote.z) * 0.5;

    // ── Velocity vectors ──
    const localVelX = Math.sin(local.velAngle) * local.speed;
    const localVelZ = Math.cos(local.velAngle) * local.speed;
    const remoteVelX = Math.sin(remote.yaw) * remote.speed;
    const remoteVelZ = Math.cos(remote.yaw) * remote.speed;

    // Relative velocity (local – remote)
    const relVelX = localVelX - remoteVelX;
    const relVelZ = localVelZ - remoteVelZ;

    // Relative velocity along the collision normal
    const relVelNormal = relVelX * mtdAxisX + relVelZ * mtdAxisZ;

    // Only resolve if objects are approaching
    if (relVelNormal >= 0) {
      // Still need to mark collided for the positional push
      collided = true;
      // Push-only nudge for the remote (mirror of our positional push)
      if (remote.id) {
        remoteNudges.push({
          id: remote.id,
          dx: -mtdAxisX * minOverlap * 0.5,
          dz: -mtdAxisZ * minOverlap * 0.5,
          dYaw: 0,
        });
      }
      continue;
    }

    // ── Lever arms (contact → centre of mass) ──
    const rLocalX = contactX - local.x;
    const rLocalZ = contactZ - local.z;
    const rRemoteX = contactX - remote.x;
    const rRemoteZ = contactZ - remote.z;

    // 2D cross product (gives scalar angular component)
    const rLocalCrossN = rLocalX * mtdAxisZ - rLocalZ * mtdAxisX;
    const rRemoteCrossN = rRemoteX * mtdAxisZ - rRemoteZ * mtdAxisX;

    // ── Impulse scalar (momentum-conserving + restitution) ──
    // j = -(1+e) * vRel·n / (1/mA + 1/mB + (rA×n)²/IA + (rB×n)²/IB)
    const invMassSum = 1 / BUS_MASS + 1 / BUS_MASS;
    const angularTermLocal = (rLocalCrossN * rLocalCrossN) / BUS_INERTIA;
    const angularTermRemote = (rRemoteCrossN * rRemoteCrossN) / BUS_INERTIA;

    const jRaw = -(1 + BUS_RESTITUTION) * relVelNormal / (invMassSum + angularTermLocal + angularTermRemote);
    const j = jRaw * BUS_COLLISION_IMPULSE_SCALE;

    // ── Apply linear impulse to local bus ──
    const impulseX = j * mtdAxisX / BUS_MASS;
    const impulseZ = j * mtdAxisZ / BUS_MASS;

    const newVelX = localVelX + impulseX;
    const newVelZ = localVelZ + impulseZ;
    const newSpeed = Math.sqrt(newVelX * newVelX + newVelZ * newVelZ);

    if (newSpeed > 0.01) {
      local.velAngle = Math.atan2(newVelX, newVelZ);
      local.speed = newSpeed;
    } else {
      local.speed = 0;
    }

    // ── Apply angular impulse (yaw spin from off-centre hit) ──
    const angularImpulse = rLocalCrossN * j / BUS_INERTIA;
    const clampedAngular = Math.max(-BUS_MAX_ANGULAR_IMPULSE, Math.min(BUS_MAX_ANGULAR_IMPULSE, angularImpulse));
    local.yawRate += clampedAngular;
    // Clamp total yaw rate
    local.yawRate = Math.max(-BUS_MAX_YAW_RATE, Math.min(BUS_MAX_YAW_RATE, local.yawRate));

    // ── Nudge busYaw toward velocity direction on big hits ──
    // This makes head-on collisions feel like the bus "bounces back" rather
    // than just sliding while still facing forward.
    const impactStrength = Math.abs(j) / BUS_MASS;
    if (impactStrength > 2 && newSpeed > 1) {
      let yawToVel = local.velAngle - local.yaw;
      while (yawToVel > Math.PI) yawToVel -= 2 * Math.PI;
      while (yawToVel < -Math.PI) yawToVel += 2 * Math.PI;
      // Blend yaw toward velocity proportional to hit strength (capped)
      const blend = Math.min(0.3, impactStrength * 0.02);
      local.yaw += yawToVel * blend;
    }

    // ── Predicted remote nudge (mirror impulse for visual feedback) ──
    if (remote.id) {
      // Remote gets the opposite linear impulse (Newton's 3rd law)
      const remoteImpulseX = -j * mtdAxisX / BUS_MASS;
      const remoteImpulseZ = -j * mtdAxisZ / BUS_MASS;
      // Scale down so the prediction is conservative — network will correct
      const nudgeScale = 0.35;
      // Angular nudge from the remote's lever arm
      const remoteAngularImpulse = -rRemoteCrossN * j / BUS_INERTIA;
      const clampedRemoteAngular = Math.max(-BUS_MAX_ANGULAR_IMPULSE, Math.min(BUS_MAX_ANGULAR_IMPULSE, remoteAngularImpulse)) * nudgeScale;
      remoteNudges.push({
        id: remote.id,
        dx: (remoteImpulseX - mtdAxisX * minOverlap * 0.5) * nudgeScale,
        dz: (remoteImpulseZ - mtdAxisZ * minOverlap * 0.5) * nudgeScale,
        dYaw: clampedRemoteAngular * 0.15, // very subtle predicted yaw nudge
      });
    }

    collided = true;
  }

  return { local, collided, remoteNudges };
}

/**
 * Apply yaw-rate damping and integrate yaw rate into the bus heading.
 * Call this once per frame after the main bus physics update.
 */
export function applyBusYawRate(state: BusCollisionState, dt: number): void {
  if (Math.abs(state.yawRate) < 0.001) {
    state.yawRate = 0;
    return;
  }
  state.yaw += state.yawRate * dt;
  // Exponential damping
  const decay = Math.exp(-BUS_YAW_RATE_DAMPING * dt);
  state.yawRate *= decay;
}
