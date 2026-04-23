import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
  Quaternion,
} from '@babylonjs/core';

// ---------- Types ----------

export interface FenceSegment {
  /** Start X,Z in world coords */
  x1: number;
  z1: number;
  /** End X,Z in world coords */
  x2: number;
  z2: number;
}

export interface FenceCollider {
  segments: FenceSegment[];
}

// ---------- Constants ----------

/** Default fence distance beyond the bounding circle radius (metres) */
export const DEFAULT_FENCE_DISTANCE = 200;

/** Height of the fence posts & rails */
const FENCE_HEIGHT = 2.0;
/** Spacing between fence posts along the perimeter */
const POST_SPACING = 6;

// ---------- Fence mesh generation ----------

/**
 * Build a 3D fence mesh around the given polygon and return collision segments.
 *
 * The polygon is defined as an array of [x, z] points forming a closed ring.
 * Posts are placed at regular intervals and connected with horizontal rails.
 */
export function buildFenceMesh(
  scene: Scene,
  polygon: [number, number][],
  getGroundY: (x: number, z: number) => number,
): FenceCollider {
  if (polygon.length < 3) return { segments: [] };

  const segments: FenceSegment[] = [];

  // Materials
  const postMat = new StandardMaterial('fencePostMat', scene);
  postMat.diffuseColor = new Color3(0.35, 0.22, 0.12); // dark wood
  postMat.specularColor = Color3.Black();

  const railMat = new StandardMaterial('fenceRailMat', scene);
  railMat.diffuseColor = new Color3(0.45, 0.30, 0.16); // lighter wood
  railMat.specularColor = Color3.Black();

  const fenceRoot = new TransformNode('fenceRoot', scene);

  // Phase 1: Place all posts along each polygon edge.
  // Track per-edge post groups so rails only connect posts on the same edge.
  let postIndex = 0;
  const edgePostGroups: { x: number; y: number; z: number }[][] = [];

  for (let i = 0; i < polygon.length; i++) {
    const [ax, az] = polygon[i];
    const [bx, bz] = polygon[(i + 1) % polygon.length];

    const edgeDx = bx - ax;
    const edgeDz = bz - az;
    const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDz * edgeDz);
    if (edgeLen < 0.1) continue;

    // Add collision segment for the full edge
    segments.push({ x1: ax, z1: az, x2: bx, z2: bz });

    // Place posts evenly along this edge (including the start, excluding the end
    // since the next edge's first post covers that vertex)
    const numPosts = Math.max(1, Math.ceil(edgeLen / POST_SPACING));
    const edgePosts: { x: number; y: number; z: number }[] = [];

    for (let p = 0; p <= numPosts; p++) {
      const t = p / numPosts;
      const px = ax + edgeDx * t;
      const pz = az + edgeDz * t;
      const py = getGroundY(px, pz);

      edgePosts.push({ x: px, y: py, z: pz });

      const post = MeshBuilder.CreateCylinder(
        `fencePost_${postIndex}`,
        { height: FENCE_HEIGHT, diameter: 0.12, tessellation: 6 },
        scene,
      );
      post.material = postMat;
      post.position.set(px, py + FENCE_HEIGHT / 2, pz);
      post.parent = fenceRoot;
      postIndex++;
    }

    edgePostGroups.push(edgePosts);
  }

  // Phase 2: Draw rails connecting consecutive posts within each edge.
  // Uses quaternion rotation (not Euler angles) so rails are guaranteed to
  // align perfectly from post A to post B regardless of direction.
  const defaultDir = new Vector3(0, 0, 1); // box depth axis
  let railIndex = 0;
  for (const posts of edgePostGroups) {
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const fullDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (fullDist < 0.1) continue;

      // Compute quaternion that rotates the default Z-axis to the A→B direction
      const desired = new Vector3(dx, dy, dz).normalize();
      const cross = Vector3.Cross(defaultDir, desired);
      const crossLen = cross.length();
      const dot = Vector3.Dot(defaultDir, desired);
      let quat: Quaternion;
      if (crossLen > 0.0001) {
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        quat = Quaternion.RotationAxis(cross.normalize(), angle);
      } else if (dot < 0) {
        // Direction is opposite to default — rotate 180° around Y
        quat = Quaternion.RotationAxis(Vector3.Up(), Math.PI);
      } else {
        quat = Quaternion.Identity();
      }

      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const midZ = (a.z + b.z) / 2;

      for (const heightFrac of [0.4, 0.8]) {
        const rail = MeshBuilder.CreateBox(
          `fenceRail_${railIndex}_${heightFrac}`,
          { width: 0.06, height: 0.06, depth: fullDist },
          scene,
        );
        rail.material = railMat;
        rail.position.set(midX, midY + FENCE_HEIGHT * heightFrac, midZ);
        rail.rotationQuaternion = quat.clone();
        rail.parent = fenceRoot;
      }
      railIndex++;
    }
  }

  return { segments };
}

// ---------- Fence polygon generation ----------

// ---------- Fence polygon generation ----------

/**
 * Generate a circular fence boundary around the course.
 *
 * 1. Find the minimum bounding circle (smallest circle enclosing all path points).
 * 2. Return a polygon (circle) with the same centre but radius + `distance`.
 */
export function generateFencePolygon(
  pathPositions: [number, number][],
  distance: number,
): [number, number][] {
  if (pathPositions.length < 2) return [];

  const { cx, cz, radius } = minBoundingCircle(pathPositions);
  const fenceRadius = radius + distance;

  // Approximate the circle as a polygon with enough segments for smooth look
  const NUM_SEGMENTS = 64;
  const result: [number, number][] = [];
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const angle = (i / NUM_SEGMENTS) * Math.PI * 2;
    result.push([
      cx + Math.cos(angle) * fenceRadius,
      cz + Math.sin(angle) * fenceRadius,
    ]);
  }
  return result;
}

// ---------- Minimum bounding circle (Welzl's algorithm) ----------

interface Circle {
  cx: number;
  cz: number;
  radius: number;
}

/**
 * Welzl's randomised algorithm for the minimum enclosing circle.
 * Returns centre (cx, cz) and radius.
 */
function minBoundingCircle(points: [number, number][]): Circle {
  // Shuffle a copy to get expected O(n) performance
  const pts = [...points];
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return welzl(pts, [], pts.length);
}

function welzl(P: [number, number][], R: [number, number][], n: number): Circle {
  if (n === 0 || R.length === 3) {
    return trivialCircle(R);
  }

  const p = P[n - 1];
  const D = welzl(P, R, n - 1);

  const dx = p[0] - D.cx;
  const dz = p[1] - D.cz;
  if (dx * dx + dz * dz <= (D.radius + 1e-6) * (D.radius + 1e-6)) {
    return D;
  }

  return welzl(P, [...R, p], n - 1);
}

/** Build the unique circle from 0–3 boundary points. */
function trivialCircle(R: [number, number][]): Circle {
  if (R.length === 0) return { cx: 0, cz: 0, radius: 0 };
  if (R.length === 1) return { cx: R[0][0], cz: R[0][1], radius: 0 };
  if (R.length === 2) return circleFrom2(R[0], R[1]);
  return circleFrom3(R[0], R[1], R[2]);
}

function circleFrom2(a: [number, number], b: [number, number]): Circle {
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[1] + b[1]) / 2;
  const dx = a[0] - b[0];
  const dz = a[1] - b[1];
  return { cx, cz, radius: Math.sqrt(dx * dx + dz * dz) / 2 };
}

function circleFrom3(a: [number, number], b: [number, number], c: [number, number]): Circle {
  const ax = a[0], az = a[1];
  const bx = b[0], bz = b[1];
  const cpx = c[0], cpz = c[1];

  const D = 2 * (ax * (bz - cpz) + bx * (cpz - az) + cpx * (az - bz));
  if (Math.abs(D) < 1e-10) {
    // Degenerate — fall back to circle through the two farthest points
    const d1 = (ax - bx) ** 2 + (az - bz) ** 2;
    const d2 = (bx - cpx) ** 2 + (bz - cpz) ** 2;
    const d3 = (ax - cpx) ** 2 + (az - cpz) ** 2;
    if (d1 >= d2 && d1 >= d3) return circleFrom2(a, b);
    if (d2 >= d3) return circleFrom2(b, c);
    return circleFrom2(a, c);
  }

  const ux = ((ax * ax + az * az) * (bz - cpz) + (bx * bx + bz * bz) * (cpz - az) + (cpx * cpx + cpz * cpz) * (az - bz)) / D;
  const uz = ((ax * ax + az * az) * (cpx - bx) + (bx * bx + bz * bz) * (ax - cpx) + (cpx * cpx + cpz * cpz) * (bx - ax)) / D;
  const radius = Math.sqrt((ax - ux) ** 2 + (az - uz) ** 2);
  return { cx: ux, cz: uz, radius };
}

// ---------- Fence collision resolution ----------

/**
 * Resolve a position against fence segments.
 * If the position (circle of given radius) overlaps any fence segment,
 * push it back. Returns true if a collision occurred.
 */
export function resolvePositionAgainstFence(
  pos: Vector3,
  radius: number,
  collider: FenceCollider,
): boolean {
  if (!collider || collider.segments.length === 0) return false;

  let collided = false;

  for (const seg of collider.segments) {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 0.001) continue;

    // Project pos onto segment
    let t = ((pos.x - seg.x1) * dx + (pos.z - seg.z1) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = seg.x1 + t * dx;
    const closestZ = seg.z1 + t * dz;

    const diffX = pos.x - closestX;
    const diffZ = pos.z - closestZ;
    const distSq = diffX * diffX + diffZ * diffZ;

    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = diffX / dist;
      const nz = diffZ / dist;
      const overlap = radius - dist;
      pos.x += nx * overlap;
      pos.z += nz * overlap;
      collided = true;
    }
  }

  return collided;
}

/**
 * Check if a 2D point (x, z) would collide with the fence.
 * Used for NPC runner boundary checking.
 */
export function isBlockedByFence(
  x: number,
  z: number,
  radius: number,
  collider: FenceCollider,
): boolean {
  if (!collider || collider.segments.length === 0) return false;

  for (const seg of collider.segments) {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 0.001) continue;

    let t = ((x - seg.x1) * dx + (z - seg.z1) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = seg.x1 + t * dx;
    const closestZ = seg.z1 + t * dz;

    const diffX = x - closestX;
    const diffZ = z - closestZ;
    const distSq = diffX * diffX + diffZ * diffZ;

    if (distSq < radius * radius) return true;
  }

  return false;
}
