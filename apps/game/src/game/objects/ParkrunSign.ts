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
 * A parkrun-style pop-up A-frame banner: two wide oval panels that meet at the
 * top — one tilted back, the other tilted forward. The front panel has the
 * parkrun logo + event name; the back is plain purple.
 *
 * Shape reference: wider than tall, like a landscape ellipse sitting on grass.
 */
export function createParkrunSign(
  scene: Scene,
  x: number,
  z: number,
  yaw: number,
  eventName: string,
  y = 0,
): Mesh {
  const root = new Mesh('parkrunSign', scene);
  root.position = new Vector3(x, y, z);
  root.rotation.y = -yaw + Math.PI / 2; // perpendicular to the path

  // --- Dimensions ---
  const scale = 2.0;   // overall size multiplier
  const ovalW = 1.6 * scale;   // metres — wider than tall
  const ovalH = 1.1 * scale;   // metres
  const depth = 0.04 * scale;  // panel thickness
  const tilt = 0.22;   // radians — each panel tilts this much from vertical
  // Panels meet at top: pivot from the bottom edge, so the centre rises by
  // half-height and the top edges touch.

  // --- Materials ---
  const purpleMat = new StandardMaterial('signPurple', scene);
  purpleMat.diffuseColor = new Color3(0.31, 0.22, 0.55); // lighter purple
  purpleMat.specularColor = Color3.Black();

  const borderMat = new StandardMaterial('signBorder', scene);
  borderMat.diffuseColor = new Color3(0.06, 0.06, 0.06);
  borderMat.specularColor = Color3.Black();

  // --- Dynamic texture for front face ---
  const texW = 640;
  const texH = 440;
  const dynTex = new DynamicTexture('signTex', { width: texW, height: texH }, scene, true);
  const ctx = dynTex.getContext() as unknown as CanvasRenderingContext2D;

  // Flip vertically so text reads right-side-up on the mesh
  ctx.translate(texW, texH);
  ctx.rotate(Math.PI);

  // Purple oval fill
  ctx.fillStyle = '#4a3580';
  ctx.beginPath();
  ctx.ellipse(texW / 2, texH / 2, texW / 2 - 10, texH / 2 - 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Black border
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(texW / 2, texH / 2, texW / 2 - 10, texH / 2 - 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  // "parkrun" text (upper portion)
  ctx.fillStyle = '#c860c8';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('parkrun', texW / 2, texH * 0.32);

  // Event name (large yellow, centre-lower)
  ctx.fillStyle = '#f5a623';
  const nameLen = eventName.length;
  const fontSize = nameLen > 14 ? 56 : nameLen > 9 ? 68 : 82;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillText(eventName, texW / 2, texH * 0.62);

  dynTex.update();

  const frontMat = new StandardMaterial('signFrontMat', scene);
  frontMat.diffuseTexture = dynTex;
  frontMat.specularColor = Color3.Black();

  // --- Helper to create one oval panel + border ---
  const createPanel = (
    name: string,
    mat: StandardMaterial,
    tiltDir: number, // +1 = tilted back, -1 = tilted forward
    zOff: number,
  ) => {
    // The oval disc — a very flat cylinder scaled to be wider than tall
    const disc = MeshBuilder.CreateCylinder(
      `${name}_disc`,
      { height: depth, diameter: 1, tessellation: 48 },
      scene,
    );
    // Scale: X = width, Z (becomes Y after rotation) = height, Y = depth
    disc.scaling = new Vector3(ovalW, 1, ovalH);
    // Stand the disc upright (flat face toward viewer), then tilt
    disc.rotation.x = Math.PI / 2 + tiltDir * tilt;
    // Position: centre at half-height, small Z offset so panels don't z-fight
    const yCenter = (ovalH / 2) * Math.cos(tilt);
    disc.position = new Vector3(0, yCenter, zOff);
    disc.material = mat;
    disc.parent = root;

    // Border torus
    // Average diameter so the torus sits at the rim of the oval
    const border = MeshBuilder.CreateTorus(
      `${name}_border`,
      { diameter: 1, thickness: 0.035, tessellation: 48 },
      scene,
    );
    border.scaling = new Vector3(ovalW, 1, ovalH);
    border.rotation.x = disc.rotation.x;
    border.position = disc.position.clone();
    border.material = borderMat;
    border.parent = root;
  };

  // Front panel — tilted forward (top leans toward viewer)
  createPanel('front', frontMat, -1, 0);
  // Back panel — tilted back (top leans away), offset so tops meet
  const backZOff = ovalH * Math.sin(tilt) - 0.5 * scale;
  createPanel('back', purpleMat, +1, backZOff);

  return root;
}
