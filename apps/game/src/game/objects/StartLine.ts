import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';

/**
 * A white start/finish line drawn across the path.
 *
 * @param scene   Babylon scene
 * @param x       World X of path centre at the start point
 * @param z       World Z of path centre at the start point
 * @param yaw     Path heading (radians, 0 = +Z)
 * @param width   Width of the line (should match path width)
 */
export function createStartLine(
  scene: Scene,
  x: number,
  z: number,
  yaw: number,
  width: number,
  y = 0,
): Mesh {
  const line = MeshBuilder.CreateBox(
    'startLine',
    { width, height: 0.05, depth: 0.4 },
    scene,
  );

  const mat = new StandardMaterial('startLineMat', scene);
  mat.diffuseColor = Color3.White();
  mat.specularColor = Color3.Black();
  line.material = mat;

  line.position = new Vector3(x, y + 0.03, z);
  line.rotation.y = -yaw + Math.PI / 2; // perpendicular to path direction

  return line;
}
