/**
 * PathShader — Renders the running path as part of the ground mesh
 * using a baked path-mask texture + Babylon's MixMaterial for blending.
 *
 * Hybrid approach:
 *   1. Bake the path polyline into a 2D mask texture (DynamicTexture / canvas)
 *   2. Use MixMaterial (from @babylonjs/materials) to blend grass and dirt
 *      textures based on the mask - built-in, tested, no custom GLSL needed.
 */

import {
  Scene,
  Texture,
  Color3,
  DynamicTexture,
} from '@babylonjs/core';
import { MixMaterial } from '@babylonjs/materials';
import grassUrl from '../assets/grass.png';
import dirtUrl from '../assets/dirt.png';

// ---------- Types ----------

export interface PathShaderOptions {
  /** World-space path positions [x, z][] */
  pathPositions: [number, number][];
  /** Ground plane size in world units (square). Default 6000 */
  groundSize?: number;
  /** Path half-width in world units. Default 5 */
  pathHalfWidth?: number;
  /** Extra soft-edge width in world units beyond the path edge. Default 1.5 */
  edgeSoftness?: number;
  /** Resolution of the baked mask texture. Default 4096 */
  maskResolution?: number;
  /** Grass texture tiling. Default 600 */
  grassTiling?: number;
  /** Dirt texture tiling. Default 300 */
  dirtTiling?: number;
  /** If provided, paint a white start/finish line at this position & heading */
  startLine?: {
    x: number;
    z: number;
    yaw: number;       // path heading in radians
    width: number;      // line width (across path)
    thickness?: number; // line depth along path direction. Default 0.4
  };
}

// ---------- Public API ----------

/**
 * Creates a MixMaterial for the ground mesh that blends grass and dirt
 * based on proximity to the path.
 *
 * Uses Babylon's built-in MixMaterial which blends up to 8 textures
 * controlled by RGBA channels of a mix-map texture.
 *
 * Channel mapping:
 *   mixTexture1.r = 1.0 everywhere (keep grass at full brightness)
 *   mixTexture1.g = path mask (0 = grass, 1 = dirt)
 */
export function createPathGroundMaterial(
  scene: Scene,
  opts: PathShaderOptions,
): MixMaterial {
  const {
    pathPositions,
    groundSize = 6000,
    pathHalfWidth = 5,
    edgeSoftness = 1.5,
    maskResolution = 4096,
    grassTiling = 600,
    dirtTiling = 300,
    startLine,
  } = opts;

  // --- 1. Bake path mask onto a DynamicTexture ---
  const maskTex = bakeMaskTexture(
    scene,
    pathPositions,
    groundSize,
    pathHalfWidth,
    edgeSoftness,
    maskResolution,
    startLine,
  );

  // --- 2. Load grass + dirt textures ---
  const grassTex = new Texture(grassUrl, scene);
  grassTex.uScale = grassTiling;
  grassTex.vScale = grassTiling;

  const dirtTex = new Texture(dirtUrl, scene);
  dirtTex.uScale = dirtTiling;
  dirtTex.vScale = dirtTiling;

  // --- 3. Build MixMaterial ---
  const mat = new MixMaterial('pathGroundMat', scene);
  mat.specularColor = Color3.Black();

  // The mix-map: R=1 (full grass brightness), G=path mask (blend toward dirt)
  mat.mixTexture1 = maskTex;

  // diffuseTexture1 is controlled by R channel → grass everywhere
  mat.diffuseTexture1 = grassTex;

  // diffuseTexture2 is controlled by G channel → dirt on path
  mat.diffuseTexture2 = dirtTex;

  // diffuseTexture3 is controlled by B channel → white start line
  const whiteDyn = new DynamicTexture('whiteTex', 4, scene, false);
  const wCtx = whiteDyn.getContext() as unknown as CanvasRenderingContext2D;
  wCtx.fillStyle = '#ffffff';
  wCtx.fillRect(0, 0, 4, 4);
  whiteDyn.update();
  mat.diffuseTexture3 = whiteDyn;

  // diffuseTexture4 must also be set to avoid shader errors (use grass)
  mat.diffuseTexture4 = grassTex;

  return mat;
}

// ---------- Mask baking ----------

/**
 * Bake the path polyline into an RGBA mask DynamicTexture.
 *
 * MixMaterial blend logic:
 *   diffuse1 *= R
 *   result = mix(diffuse1, diffuse2, G)
 *
 * So we paint:
 *   R = 1.0 everywhere (grass at full brightness)
 *   G = 0.0 off-path (stay on grass), 1.0 on-path (show dirt)
 *   B = 0, A = 1
 */
function bakeMaskTexture(
  scene: Scene,
  pathPositions: [number, number][],
  groundSize: number,
  pathHalfWidth: number,
  edgeSoftness: number,
  resolution: number,
  startLine?: PathShaderOptions['startLine'],
): DynamicTexture {
  const tex = new DynamicTexture('pathMaskTex', resolution, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const size = resolution;

  // Fill with R=255, G=0, B=0, A=255  →  grass everywhere, no dirt
  ctx.fillStyle = 'rgb(255, 0, 0)';
  ctx.fillRect(0, 0, size, size);

  if (pathPositions.length < 2) {
    tex.update();
    return tex;
  }

  // World → pixel mapping
  // Ground UV convention (Babylon.js CreateGround):
  //   u = (x + groundSize/2) / groundSize  (col/N)
  //   v = (z + groundSize/2) / groundSize  (1 - row/N)
  // DynamicTexture with invertY=true (default) flips canvas vertically:
  //   canvas py=0 (top) → v=1 → z=+groundSize/2
  //   canvas py=size (bottom) → v=0 → z=-groundSize/2
  // So canvas X maps normally to world X, but canvas Y is inverted for Z.
  const halfGround = groundSize / 2;

  const toPixel = (wx: number, wz: number): [number, number] => {
    const px = ((wx + halfGround) / groundSize) * size;
    const py = ((halfGround - wz) / groundSize) * size; // flip Z for invertY
    return [px, py];
  };

  // Helper to draw the path polyline at a given pixel width and colour
  const drawPathStroke = (pixelWidth: number, color: string) => {
    ctx.lineWidth = pixelWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 0; i < pathPositions.length; i++) {
      const [px, py] = toPixel(pathPositions[i][0], pathPositions[i][1]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };

  // Draw path in layers: wide soft edge → medium → solid core
  // We're adding G channel (green) on top of the red background.
  // R must stay 255 so we use colours like rgb(255, G, 0).

  // -- Soft outer edge: slight dirt blend --
  const totalWorldWidth = (pathHalfWidth + edgeSoftness) * 2;
  const outerPixelWidth = (totalWorldWidth / groundSize) * size;
  drawPathStroke(outerPixelWidth, 'rgb(255, 115, 0)');  // G≈0.45

  // -- Medium transition --
  const midWorldWidth = (pathHalfWidth + edgeSoftness * 0.4) * 2;
  const midPixelWidth = (midWorldWidth / groundSize) * size;
  drawPathStroke(midPixelWidth, 'rgb(255, 179, 0)');    // G≈0.70

  // -- Solid core (full path width) --
  const coreWorldWidth = pathHalfWidth * 2;
  const corePixelWidth = (coreWorldWidth / groundSize) * size;
  drawPathStroke(corePixelWidth, 'rgb(255, 255, 0)');   // G=1.0 → full dirt

  // --- Start line (B channel) ---
  // B channel controls diffuseTexture3 (white). We paint a white rectangle
  // perpendicular to the path at the start position.
  if (startLine) {
    const { x, z, yaw, width, thickness = 0.4 } = startLine;

    // Four corners of the rectangle in world space
    // The line is perpendicular to the path (along the yaw direction)
    const perpX = Math.cos(yaw);  // perpendicular to path
    const perpZ = -Math.sin(yaw);
    const fwdX = Math.sin(yaw);   // along path
    const fwdZ = Math.cos(yaw);

    const hw = width / 2;
    const ht = thickness / 2;

    // Corners: ±perpendicular × halfWidth, ±forward × halfThickness
    const corners = [
      toPixel(x - perpX * hw - fwdX * ht, z - perpZ * hw - fwdZ * ht),
      toPixel(x + perpX * hw - fwdX * ht, z + perpZ * hw - fwdZ * ht),
      toPixel(x + perpX * hw + fwdX * ht, z + perpZ * hw + fwdZ * ht),
      toPixel(x - perpX * hw + fwdX * ht, z - perpZ * hw + fwdZ * ht),
    ];

    // Draw filled polygon: white in B channel, keep R=255, set G=255 (on path)
    // rgb(255, 255, 255) → R=1 (grass brightness), G=1 (dirt), B=1 (white start line)
    // MixMaterial: result = mix(mix(diffuse1*R, diffuse2, G), diffuse3, B)
    // With B=1 the final colour is fully diffuse3 (white)
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    ctx.lineTo(corners[1][0], corners[1][1]);
    ctx.lineTo(corners[2][0], corners[2][1]);
    ctx.lineTo(corners[3][0], corners[3][1]);
    ctx.closePath();
    ctx.fill();
  }

  tex.update();
  return tex;
}
