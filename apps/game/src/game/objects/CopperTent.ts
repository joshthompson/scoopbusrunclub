import {
  Scene,
  Vector3,
  TransformNode,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import tentModelUrl from '../../assets/models/tent.glb?url';

/**
 * The Copper Tent (Koppartältet) at Haga Park, Stockholm.
 *
 * Loads the tent.glb model and scales/positions it to fit between the
 * two GPS-derived endpoints.
 */
export async function createCopperTent(
  scene: Scene,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  y: number,
): Promise<TransformNode> {
  const root = new TransformNode('copperTent', scene);

  // Compute centre, length, and orientation from the two endpoints
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const yaw = Math.atan2(dx, dz);

  root.position = new Vector3(cx, y, cz);
  root.rotation.y = yaw;

  // The old procedural model used a ~30m normalised length with a total
  // height of roughly (5 + 8 + 3) * scale = 16 * scale and a width of
  // about 12 * scale (centralBaseR * 2). Keep the same proportions.
  const scale = length / 30;
  const targetLength = length;
  const targetHeight = 16 * scale;
  const targetWidth = 12 * scale;

  // Load GLB
  const result = await SceneLoader.ImportMeshAsync('', '', tentModelUrl, scene);

  const glbRoot = new TransformNode('tentGlbRoot', scene);
  glbRoot.parent = root;

  // Measure bounding box of the loaded model
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const mesh of result.meshes) {
    if (mesh.isAnInstance || !mesh.getBoundingInfo) continue;
    (mesh as any).refreshBoundingInfo();
    const bounds = mesh.getBoundingInfo().boundingBox;
    const wMin = bounds.minimumWorld;
    const wMax = bounds.maximumWorld;
    if (wMin.x < minX) minX = wMin.x;
    if (wMax.x > maxX) maxX = wMax.x;
    if (wMin.y < minY) minY = wMin.y;
    if (wMax.y > maxY) maxY = wMax.y;
    if (wMin.z < minZ) minZ = wMin.z;
    if (wMax.z > maxZ) maxZ = wMax.z;
  }

  const rawWidth = maxX - minX || 1;
  const rawHeight = maxY - minY || 1;
  const rawLength = maxZ - minZ || 1;

  // After 90° CW rotation, the model's X axis becomes Z and vice versa,
  // so rawWidth maps to targetLength and rawLength maps to targetWidth.
  const sx = targetLength / rawWidth;
  const sy = targetHeight / rawHeight;
  const sz = targetWidth / rawLength;
  const uniformScale = Math.min(sx, sy, sz);

  // Parent all loaded meshes under glbRoot
  for (const mesh of result.meshes) {
    if (!mesh.parent) mesh.parent = glbRoot;
  }
  for (const tn of result.transformNodes) {
    if (!tn.parent) tn.parent = glbRoot;
  }

  glbRoot.scaling.setAll(uniformScale);
  glbRoot.rotation.y = Math.PI / 2; // 90° counter-clockwise (180° from previous)

  // Centre the model horizontally and sit it on the ground (y=0 in local space)
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  glbRoot.position.set(
    -centerX * uniformScale,
    -minY * uniformScale,
    -centerZ * uniformScale,
  );

  return root;
}
