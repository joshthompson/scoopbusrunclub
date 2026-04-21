import {
  Scene,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  Texture,
  DynamicTexture,
  Color3,
  Vector3,
} from '@babylonjs/core';
import { SkyMaterial } from '@babylonjs/materials';

/**
 * Creates a procedural skybox with nice-weather settings and a handful of
 * billboard cloud planes scattered around the scene.
 */
export function createSky(scene: Scene): { skybox: Mesh; clouds: Mesh[] } {
  // ---- Skybox via SkyMaterial (Preetham model) ----
  const skyMaterial = new SkyMaterial('skyMat', scene);
  skyMaterial.backFaceCulling = false;

  // Bright daytime presets
  // SkyMaterial inclination: 0 = sun at zenith, 0.5 = horizon
  skyMaterial.turbidity = 4; // low haze → clear blue sky
  skyMaterial.luminance = 1.1;
  skyMaterial.mieCoefficient = 0.003;
  skyMaterial.mieDirectionalG = 0.8;
  skyMaterial.rayleigh = 2; // blue scatter
  skyMaterial.inclination = 0.15; // sun high in the sky
  skyMaterial.azimuth = 0.25;

  const skybox = MeshBuilder.CreateBox('skyBox', { size: 5000 }, scene);
  skybox.material = skyMaterial;
  skybox.infiniteDistance = true;
  // Render behind everything
  skybox.renderingGroupId = 0;

  // ---- Clouds ----
  const clouds = createClouds(scene);

  return { skybox, clouds };
}

// ---- Cloud generation helpers ----

/** Bake a fluffy cloud sprite onto a DynamicTexture */
function makeCloudTexture(scene: Scene, width: number, height: number, seed: number): DynamicTexture {
  const tex = new DynamicTexture(`cloudTex_${seed}`, { width, height }, scene, false);
  // Cast to native context for full Canvas2D API (ellipse, globalCompositeOperation)
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  ctx.clearRect(0, 0, width, height);

  // Simple seeded random so each cloud looks different
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s & 0x7fffffff) / 2147483647;
  };

  // Draw several overlapping translucent white ellipses
  const blobs = 5 + Math.floor(rand() * 6);
  for (let i = 0; i < blobs; i++) {
    const cx = width * (0.2 + rand() * 0.6);
    const cy = height * (0.3 + rand() * 0.4);
    const rx = width * (0.15 + rand() * 0.25);
    const ry = height * (0.12 + rand() * 0.18);

    ctx.save();
    ctx.globalAlpha = 0.45 + rand() * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    // Use scale transform + arc for compatibility (ellipse not on Babylon ICanvasRenderingContext)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
    ctx.restore();
  }

  // Soften edges: keep the centre, fade out towards the edges
  ctx.globalCompositeOperation = 'destination-in';
  const grad = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.2,
    width / 2, height / 2, Math.min(width, height) * 0.5,
  );
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';

  tex.update();
  return tex;
}

function createClouds(scene: Scene): Mesh[] {
  const clouds: Mesh[] = [];
  const CLOUD_COUNT = 18;
  const MIN_Y = 180;
  const MAX_Y = 300;
  const SPREAD = 1800; // metres from origin

  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 2147483647;
  };

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const w = 80 + rand() * 120; // 80–200 m wide
    const h = 30 + rand() * 40;  // 30–70 m tall

    const plane = MeshBuilder.CreatePlane(`cloud_${i}`, { width: w, height: h }, scene);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

    const mat = new StandardMaterial(`cloudMat_${i}`, scene);
    mat.diffuseTexture = makeCloudTexture(scene, 256, 128, i * 73 + 17);
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.opacityTexture = mat.diffuseTexture;
    mat.emissiveColor = new Color3(1, 1, 1); // self-lit so they stay white
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.alpha = 0.85;

    plane.material = mat;

    // Scatter around the world at varying heights
    const angle = rand() * Math.PI * 2;
    const dist = SPREAD * (0.3 + rand() * 0.7);
    plane.position = new Vector3(
      Math.cos(angle) * dist,
      MIN_Y + rand() * (MAX_Y - MIN_Y),
      Math.sin(angle) * dist,
    );

    // Slight random rotation for variety (billboard handles facing)
    plane.rotation.z = (rand() - 0.5) * 0.15;

    clouds.push(plane);
  }

  return clouds;
}
