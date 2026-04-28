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

export type TimeOfDay = 'day' | 'night';

/**
 * Creates a procedural skybox with nice-weather settings and layered
 * volumetric-style cloud billboards scattered around the scene.
 */
export function createSky(scene: Scene, timeOfDay: TimeOfDay = 'day'): { skybox: Mesh; clouds: Mesh[] } {
  // ---- Skybox via SkyMaterial (Preetham model) ----
  const skyMaterial = new SkyMaterial('skyMat', scene);
  skyMaterial.backFaceCulling = false;

  if (timeOfDay === 'night') {
    // Night sky — sun well below horizon, dark atmosphere
    skyMaterial.turbidity = 0.8;
    skyMaterial.luminance = 0.01;
    skyMaterial.mieCoefficient = 0.005;
    skyMaterial.mieDirectionalG = 0.6;
    skyMaterial.rayleigh = 0.5;
    skyMaterial.inclination = 0.52; // sun below horizon
    skyMaterial.azimuth = 0.25;
  } else {
    // Bright daytime presets
    // SkyMaterial inclination: 0 = sun at zenith, 0.5 = horizon
    skyMaterial.turbidity = 4; // low haze → clear blue sky
    skyMaterial.luminance = 1.1;
    skyMaterial.mieCoefficient = 0.003;
    skyMaterial.mieDirectionalG = 0.8;
    skyMaterial.rayleigh = 2; // blue scatter
    skyMaterial.inclination = 0.15; // sun high in the sky
    skyMaterial.azimuth = 0.25;
  }

  const skybox = MeshBuilder.CreateBox('skyBox', { size: 5000 }, scene);
  skybox.material = skyMaterial;
  skybox.infiniteDistance = true;
  // Render behind everything
  skybox.renderingGroupId = 0;

  // ---- Moon (night only) ----
  if (timeOfDay === 'night') {
    createMoon(scene);
  }

  // ---- Clouds ----
  const clouds = timeOfDay === 'night' ? [] : createClouds(scene);

  return { skybox, clouds };
}

// ---- Moon helper ----

/**
 * Creates a glowing moon billboard high in the night sky.
 */
function createMoon(scene: Scene): Mesh {
  const moonSize = 80;
  const moon = MeshBuilder.CreatePlane('moon', { size: moonSize }, scene);
  moon.billboardMode = Mesh.BILLBOARDMODE_ALL;
  moon.position = new Vector3(600, 900, 800);
  moon.infiniteDistance = true;
  moon.renderingGroupId = 0;

  // Bake a soft circular moon texture
  const texSize = 128;
  const tex = new DynamicTexture('moonTex', { width: texSize, height: texSize }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, texSize, texSize);
  const cx = texSize / 2;
  const cy = texSize / 2;
  const r = texSize * 0.38;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
  grad.addColorStop(0, 'rgba(240,240,255,1)');
  grad.addColorStop(0.4, 'rgba(220,225,245,0.9)');
  grad.addColorStop(0.7, 'rgba(180,190,220,0.3)');
  grad.addColorStop(1.0, 'rgba(100,110,160,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, texSize, texSize);
  tex.update();

  const mat = new StandardMaterial('moonMat', scene);
  mat.diffuseTexture = tex;
  mat.diffuseTexture.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.opacityTexture = tex;
  mat.emissiveColor = new Color3(0.7, 0.72, 0.85);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  moon.material = mat;

  return moon;
}

// ---- Cloud generation helpers ----

/** Seeded PRNG helper */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s & 0x7fffffff) / 2147483647;
  };
}

/**
 * Bake a fluffy cumulus cloud sprite onto a DynamicTexture.
 *
 * Uses multiple rendering passes:
 *   1. A large soft base layer of overlapping ellipses (the body)
 *   2. Smaller bright highlight blobs on top (the fluffy detail)
 *   3. An elliptical edge-fade mask so the cloud blends smoothly into the sky
 */
function makeCloudTexture(
  scene: Scene,
  width: number,
  height: number,
  seed: number,
): DynamicTexture {
  const tex = new DynamicTexture(`cloudTex_${seed}`, { width, height }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, width, height);

  const rand = makeRng(seed);

  // --- Pass 1: soft base body ---
  const baseBlobs = 8 + Math.floor(rand() * 6); // 8-13 blobs
  for (let i = 0; i < baseBlobs; i++) {
    // Concentrate blobs towards horizontal centre, slightly below vertical middle
    const cx = width * (0.15 + rand() * 0.7);
    const cy = height * (0.35 + rand() * 0.35);
    // Wide, flat ellipses → cumulus shape
    const rx = width * (0.12 + rand() * 0.22);
    const ry = height * (0.10 + rand() * 0.15);

    ctx.save();
    ctx.globalAlpha = 0.30 + rand() * 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
    ctx.restore();
  }

  // --- Pass 2: bright highlight puffs ---
  const highlightBlobs = 5 + Math.floor(rand() * 5); // 5-9 blobs
  for (let i = 0; i < highlightBlobs; i++) {
    const cx = width * (0.25 + rand() * 0.5);
    const cy = height * (0.25 + rand() * 0.3); // bias towards the top for lit look
    const rx = width * (0.06 + rand() * 0.14);
    const ry = height * (0.06 + rand() * 0.12);

    ctx.save();
    ctx.globalAlpha = 0.50 + rand() * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
    ctx.restore();
  }

  // --- Pass 3: subtle warm underside shading ---
  const shadeBlobs = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < shadeBlobs; i++) {
    const cx = width * (0.2 + rand() * 0.6);
    const cy = height * (0.55 + rand() * 0.25); // bottom half
    const rx = width * (0.10 + rand() * 0.18);
    const ry = height * (0.06 + rand() * 0.10);

    ctx.save();
    ctx.globalAlpha = 0.08 + rand() * 0.08;
    ctx.fillStyle = '#d0d8e8'; // faint blue-grey for underside shadows
    ctx.beginPath();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
    ctx.restore();
  }

  // --- Edge fade: elliptical mask so cloud tapers horizontally & vertically ---
  ctx.globalCompositeOperation = 'destination-in';
  // Scale context so a unit-circle radial gradient becomes an ellipse matching
  // the full texture dimensions. The gradient must be created *after* the
  // transform so its coordinates live in the scaled space.
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(width / 2, height / 2);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,1)');
  grad.addColorStop(0.80, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';

  tex.update();
  return tex;
}

/**
 * Create a single cloud billboard plane with given material settings.
 */
function makeCloudPlane(
  scene: Scene,
  name: string,
  w: number,
  h: number,
  tex: DynamicTexture,
  alpha: number,
  tint: Color3,
): Mesh {
  const plane = MeshBuilder.CreatePlane(name, { width: w, height: h }, scene);
  // Y-axis billboard only — clouds don't tilt when looking up/down
  plane.billboardMode = Mesh.BILLBOARDMODE_Y;

  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseTexture = tex;
  mat.diffuseTexture.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.opacityTexture = tex;
  mat.emissiveColor = tint;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.alpha = alpha;

  plane.material = mat;
  return plane;
}

function createClouds(scene: Scene): Mesh[] {
  const clouds: Mesh[] = [];
  const CLOUD_COUNT = 26;
  const MIN_Y = 180;
  const MAX_Y = 320;
  const SPREAD = 2000; // metres from origin
  const LAYERS_PER_CLOUD = 3; // offset planes for volumetric depth

  const rand = makeRng(42);

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const w = 100 + rand() * 180; // 100–280 m wide
    const h = 35 + rand() * 50;   // 35–85 m tall

    // Bake one texture per cloud at higher resolution
    const cloudTex = makeCloudTexture(scene, 512, 256, i * 73 + 17);

    // Angle & distance for scattering
    const angle = rand() * Math.PI * 2;
    const dist = SPREAD * (0.3 + rand() * 0.7);
    const baseX = Math.cos(angle) * dist;
    const baseY = MIN_Y + rand() * (MAX_Y - MIN_Y);
    const baseZ = Math.sin(angle) * dist;
    const rotZ = (rand() - 0.5) * 0.12;

    // Slight warm tint variation per cloud
    const warmth = 0.97 + rand() * 0.03;   // 0.97–1.0
    const tint = new Color3(1, warmth, warmth * 0.98);

    // Create layered planes for this cloud — each slightly offset in depth
    // and scaled for a pseudo-volumetric look
    for (let layer = 0; layer < LAYERS_PER_CLOUD; layer++) {
      const layerScale = 1.0 - layer * 0.12;  // each layer slightly smaller
      const layerAlpha = layer === 0 ? 0.80 : 0.35 + rand() * 0.15;
      const layerW = w * layerScale;
      const layerH = h * layerScale;

      const plane = makeCloudPlane(
        scene,
        `cloud_${i}_L${layer}`,
        layerW,
        layerH,
        cloudTex,
        layerAlpha,
        tint,
      );

      // Offset each layer slightly so the cloud has depth
      const layerOffsetX = (rand() - 0.5) * w * 0.08;
      const layerOffsetY = (layer - 1) * h * 0.10;
      const layerOffsetZ = (rand() - 0.5) * w * 0.08;

      plane.position = new Vector3(
        baseX + layerOffsetX,
        baseY + layerOffsetY,
        baseZ + layerOffsetZ,
      );
      plane.rotation.z = rotZ + (rand() - 0.5) * 0.05;

      clouds.push(plane);
    }
  }

  return clouds;
}
