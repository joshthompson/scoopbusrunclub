import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Mesh,
} from '@babylonjs/core';

/**
 * A parkrun-style yellow km marker sign (portrait rectangle, black border,
 * yellow fill, large black number + "KM" text).
 *
 * @param scene  Babylon scene
 * @param km     The kilometre number to display (1-4)
 * @param x      World X
 * @param z      World Z
 * @param y      Ground Y
 * @param yaw    Path heading in radians (sign faces perpendicular to path)
 */
export function createKmSign(
  scene: Scene,
  km: number,
  x: number,
  z: number,
  y: number,
  yaw: number,
): Mesh {
  const signW = 0.6;  // metres wide
  const signH = 0.85; // metres tall
  const depth = 0.04;
  const poleH = 1.0;  // pole height (bottom of sign above ground)

  const root = new Mesh(`kmSign_${km}`, scene);
  root.position = new Vector3(x, y, z);

  // --- Pole ---
  const pole = MeshBuilder.CreateCylinder(
    `kmPole_${km}`,
    { height: poleH + signH, diameter: 0.05, tessellation: 8 },
    scene,
  );
  const poleMat = new StandardMaterial(`kmPoleMat_${km}`, scene);
  poleMat.diffuseColor = new Color3(0.35, 0.35, 0.35);
  poleMat.specularColor = Color3.Black();
  pole.material = poleMat;
  pole.position.y = (poleH + signH) / 2;
  pole.parent = root;

  // --- Sign panel (front + back) ---
  const texW = 256;
  const texH = 360;
  const dynTex = new DynamicTexture(`kmTex_${km}`, { width: texW, height: texH }, scene, true);
  const ctx = dynTex.getContext() as unknown as CanvasRenderingContext2D;

  // Black background (border)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, texW, texH);

  // Yellow inner fill (inset for border)
  const border = 14;
  ctx.fillStyle = '#ffe600';
  ctx.fillRect(border, border, texW - border * 2, texH - border * 2);

  // Large km number
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 180px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(km), texW / 2, texH * 0.38);

  // "KM" text below the number
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.fillText('KM', texW / 2, texH * 0.72);

  dynTex.update();

  const frontMat = new StandardMaterial(`kmFrontMat_${km}`, scene);
  frontMat.diffuseTexture = dynTex;
  frontMat.specularColor = Color3.Black();

  const backMat = new StandardMaterial(`kmBackMat_${km}`, scene);
  backMat.diffuseColor = new Color3(0.35, 0.35, 0.35);
  backMat.specularColor = Color3.Black();

  // Front face — Babylon planes face -Z by default, so rotate to face +Z (toward path)
  const front = MeshBuilder.CreatePlane(
    `kmFront_${km}`,
    { width: signW, height: signH },
    scene,
  );
  front.material = frontMat;
  front.position = new Vector3(0, poleH + signH / 2, depth / 2 + 0.03);
  front.rotation.y = Math.PI;
  front.parent = root;

  // Back face
  const back = MeshBuilder.CreatePlane(
    `kmBack_${km}`,
    { width: signW, height: signH },
    scene,
  );
  back.material = backMat;
  back.position = new Vector3(0, poleH + signH / 2, -(depth / 2 + 0.03));
  back.parent = root;

  // Rotate so front faces runners approaching from the previous path segment
  // yaw = atan2(dx,dz) = path forward direction; we want to face opposite (back toward them)
  // Front plane faces local +Z after its own PI rotation; root.rotation.y = R
  // makes it face world direction (sin(R), cos(R)). Opposite of forward is yaw+PI.
  root.rotation.y = yaw + Math.PI;

  return root;
}
