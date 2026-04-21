import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';
import earcut from 'earcut';

function waterMaterial(scene: Scene, name: string): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = new Color3(0.1, 0.4, 0.75);
  mat.specularColor = new Color3(0.4, 0.4, 0.5);
  mat.alpha = 0.85;
  return mat;
}

/**
 * Render a water polygon as a flat blue mesh.
 */
export function createWaterMesh(
  scene: Scene,
  name: string,
  points: [number, number][],
  y = 0.02,
): Mesh | null {
  if (points.length < 3) return null;

  const vectors = points.map(([x, z]) => new Vector3(x, 0, z));

  try {
    const poly = MeshBuilder.CreatePolygon(
      name,
      { shape: vectors, sideOrientation: Mesh.DOUBLESIDE },
      scene,
      earcut,
    );
    poly.position.y = y;
    poly.material = waterMaterial(scene, `${name}_mat`);
    return poly;
  } catch (e) {
    console.warn(`[water] Failed to create polygon ${name}:`, e);
    return null;
  }
}

/**
 * Render a linear water feature (river/stream) as a ribbon with a given width.
 */
export function createWaterRibbon(
  scene: Scene,
  name: string,
  points: [number, number][],
  width: number,
  y = 0.02,
): Mesh | null {
  if (points.length < 2) return null;

  const leftPath: Vector3[] = [];
  const rightPath: Vector3[] = [];
  const hw = width / 2;

  for (let i = 0; i < points.length; i++) {
    const [cx, cz] = points[i];

    // Compute tangent
    let tx: number, tz: number;
    if (i === 0) {
      tx = points[1][0] - cx; tz = points[1][1] - cz;
    } else if (i === points.length - 1) {
      tx = cx - points[i - 1][0]; tz = cz - points[i - 1][1];
    } else {
      tx = points[i + 1][0] - points[i - 1][0]; tz = points[i + 1][1] - points[i - 1][1];
    }
    const len = Math.sqrt(tx * tx + tz * tz) || 1;
    const px = -tz / len; // perpendicular
    const pz = tx / len;

    leftPath.push(new Vector3(cx + px * hw, y, cz + pz * hw));
    rightPath.push(new Vector3(cx - px * hw, y, cz - pz * hw));
  }

  try {
    const ribbon = MeshBuilder.CreateRibbon(
      name,
      { pathArray: [leftPath, rightPath], sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    ribbon.material = waterMaterial(scene, `${name}_mat`);
    return ribbon;
  } catch (e) {
    console.warn(`[water] Failed to create ribbon ${name}:`, e);
    return null;
  }
}
