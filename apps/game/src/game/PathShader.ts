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
import { PATH_TEXTURE_ANISOTROPY } from './constants';

// ---------- Types ----------

export interface PathShaderOptions {
  /** World-space path positions [x, z][] */
  pathPositions: [number, number][];
  /** World-space road polylines [ [x,z], ... ][] */
  roads?: [number, number][][];
  /** Ground plane size in world units (square). Default 6000 */
  groundSize?: number;
  /** Path half-width in world units. Default 5 */
  pathHalfWidth?: number;
  /** Road half-width in world units. Default pathHalfWidth * 1.4 */
  roadHalfWidth?: number;
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
  /** If provided, paint a dirt circle (path texture) at this position */
  startCircle?: {
    x: number;
    z: number;
    radius: number;     // world-space radius
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
 *   mixTexture1.b = road mask (0 = no road, 1 = full road texture)
 *   mixTexture2.r = white start line mask
 */
export function createPathGroundMaterial(
  scene: Scene,
  opts: PathShaderOptions,
): MixMaterial {
  const {
    pathPositions,
    roads = [],
    groundSize = 6000,
    pathHalfWidth = 5,
    roadHalfWidth = pathHalfWidth * 1.4,
    edgeSoftness = 1.5,
    maskResolution = 4096,
    grassTiling = 600,
    dirtTiling = 300,
    startLine,
    startCircle,
  } = opts;

  // --- 1. Bake path mask onto a DynamicTexture ---
  const { maskTex, lineMaskTex } = bakeMaskTexture(
    scene,
    pathPositions,
    roads,
    groundSize,
    pathHalfWidth,
    roadHalfWidth,
    edgeSoftness,
    maskResolution,
    startLine,
    startCircle,
  );

  // --- 2. Load grass + dirt textures ---
  const grassTex = new Texture(grassUrl, scene);
  grassTex.uScale = grassTiling;
  grassTex.vScale = grassTiling;
  grassTex.anisotropicFilteringLevel = PATH_TEXTURE_ANISOTROPY;

  const dirtTex = new Texture(dirtUrl, scene);
  dirtTex.uScale = dirtTiling;
  dirtTex.vScale = dirtTiling;
  dirtTex.anisotropicFilteringLevel = PATH_TEXTURE_ANISOTROPY;

  // --- 3. Build MixMaterial ---
  const mat = new MixMaterial('pathGroundMat', scene);
  mat.specularColor = Color3.Black();

  // The mix-map: R=1 (full grass brightness), G=path mask (blend toward dirt), B=road mask
  mat.mixTexture1 = maskTex;
  // Secondary mix-map: R=start-line mask
  mat.mixTexture2 = lineMaskTex;

  // diffuseTexture1 is controlled by R channel → grass everywhere
  mat.diffuseTexture1 = grassTex;

  // diffuseTexture2 is controlled by G channel → dirt on path
  mat.diffuseTexture2 = dirtTex;

  // diffuseTexture3 is controlled by B channel → roads
  const roadDyn = new DynamicTexture('roadTex', 4, scene, false);
  const rCtx = roadDyn.getContext() as unknown as CanvasRenderingContext2D;
  rCtx.fillStyle = '#606066';
  rCtx.fillRect(0, 0, 4, 4);
  roadDyn.update();
  mat.diffuseTexture3 = roadDyn;

  // diffuseTexture4 must also be set to avoid shader errors (use grass)
  mat.diffuseTexture4 = grassTex;

  // diffuseTexture5 is controlled by mixTexture2.r → white start line
  const whiteDyn = new DynamicTexture('whiteTex', 4, scene, false);
  const wCtx = whiteDyn.getContext() as unknown as CanvasRenderingContext2D;
  wCtx.fillStyle = '#ffffff';
  wCtx.fillRect(0, 0, 4, 4);
  whiteDyn.update();
  mat.diffuseTexture5 = whiteDyn;
  mat.diffuseTexture6 = grassTex;
  mat.diffuseTexture7 = grassTex;
  mat.diffuseTexture8 = grassTex;

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
 *   B = road mask, A = 1
 */
function bakeMaskTexture(
  scene: Scene,
  pathPositions: [number, number][],
  roads: [number, number][][],
  groundSize: number,
  pathHalfWidth: number,
  roadHalfWidth: number,
  edgeSoftness: number,
  resolution: number,
  startLine?: PathShaderOptions['startLine'],
  startCircle?: PathShaderOptions['startCircle'],
): { maskTex: DynamicTexture; lineMaskTex: DynamicTexture } {
  const supportedResolution = Math.min(
    resolution,
    scene.getEngine().getCaps().maxTextureSize || resolution,
  );
  const tex = new DynamicTexture('pathMaskTex', supportedResolution, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const lineMaskTex = new DynamicTexture('pathLineMaskTex', supportedResolution, scene, false);
  const lineCtx = lineMaskTex.getContext() as unknown as CanvasRenderingContext2D;
  const size = supportedResolution;
  tex.anisotropicFilteringLevel = PATH_TEXTURE_ANISOTROPY;
  lineMaskTex.anisotropicFilteringLevel = PATH_TEXTURE_ANISOTROPY;

  // Fill with R=255, G=0, B=0, A=255  →  grass everywhere, no dirt
  ctx.fillStyle = 'rgb(255, 0, 0)';
  ctx.fillRect(0, 0, size, size);
  // mixTexture2 starts as all black (no start-line overlay)
  lineCtx.fillStyle = 'rgb(0, 0, 0)';
  lineCtx.fillRect(0, 0, size, size);

  if (pathPositions.length < 2) {
    tex.update();
    lineMaskTex.update();
    return { maskTex: tex, lineMaskTex };
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

  const drawSegmentStroke = (
    from: [number, number],
    to: [number, number],
    pixelWidth: number,
    color: string,
  ) => {
    ctx.lineWidth = pixelWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
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

  const drawRoadStroke = (roadPoints: [number, number][], pixelWidth: number, color: string) => {
    if (roadPoints.length < 2) return;
    ctx.lineWidth = pixelWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 0; i < roadPoints.length; i++) {
      const [px, py] = toPixel(roadPoints[i][0], roadPoints[i][1]);
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

  // -- Roads in B channel (terrain shader, not mesh objects) --
  const roadOuterWorldWidth = roadHalfWidth * 2 + edgeSoftness * 1.2;
  const roadOuterPixelWidth = (roadOuterWorldWidth / groundSize) * size;
  const roadMidWorldWidth = roadHalfWidth * 2 + edgeSoftness * 0.4;
  const roadMidPixelWidth = (roadMidWorldWidth / groundSize) * size;
  const roadCoreWorldWidth = roadHalfWidth * 2;
  const roadCorePixelWidth = (roadCoreWorldWidth / groundSize) * size;

  for (const road of roads) {
    drawRoadStroke(road, roadOuterPixelWidth, 'rgb(255, 0, 140)');
    drawRoadStroke(road, roadMidPixelWidth, 'rgb(255, 0, 210)');
    drawRoadStroke(road, roadCorePixelWidth, 'rgb(255, 0, 255)');
  }

  // Seam connector: bridge the spawn circle to the first path point using
  // strokes that start from the circle edge, not the centre. That keeps the
  // dirt continuous without drawing a visible arc across the spawn area.
  // Use 'lighten' so the connector's soft edges don't overwrite higher G
  // values already painted by the path (which would cause a green arc).
  if (startCircle && pathPositions.length > 0) {
    const dx = pathPositions[0][0] - startCircle.x;
    const dz = pathPositions[0][1] - startCircle.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.001) {
      const dirX = dx / dist;
      const dirZ = dz / dist;
      const connectorTo = toPixel(pathPositions[0][0], pathPositions[0][1]);

      const outerStart = toPixel(
        startCircle.x + dirX * Math.max(0, startCircle.radius - (pathHalfWidth + edgeSoftness)),
        startCircle.z + dirZ * Math.max(0, startCircle.radius - (pathHalfWidth + edgeSoftness)),
      );
      const midStart = toPixel(
        startCircle.x + dirX * Math.max(0, startCircle.radius - (pathHalfWidth + edgeSoftness * 0.4)),
        startCircle.z + dirZ * Math.max(0, startCircle.radius - (pathHalfWidth + edgeSoftness * 0.4)),
      );
      const coreStart = toPixel(
        startCircle.x + dirX * Math.max(0, startCircle.radius - pathHalfWidth),
        startCircle.z + dirZ * Math.max(0, startCircle.radius - pathHalfWidth),
      );

      ctx.globalCompositeOperation = 'lighten';
      drawSegmentStroke(outerStart, connectorTo, outerPixelWidth, 'rgb(255, 115, 0)');
      drawSegmentStroke(midStart, connectorTo, midPixelWidth, 'rgb(255, 179, 0)');
      drawSegmentStroke(coreStart, connectorTo, corePixelWidth, 'rgb(255, 255, 0)');
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // --- Start circle (G channel = dirt) ---
  // Renders a circular dirt area behind the start line where buses spawn.
  // Use 'lighten' compositing so the circle's soft edges don't overwrite
  // higher G values already painted by the path (which would cause a
  // visible grass-coloured seam at the overlap).
  if (startCircle) {
    const [cx, cy] = toPixel(startCircle.x, startCircle.z);
    const pixelRadius = (startCircle.radius / groundSize) * size;

    ctx.globalCompositeOperation = 'lighten';

    // Soft outer edge
    const outerRadius = pixelRadius + (edgeSoftness / groundSize) * size;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(255, 115, 0)'; // G≈0.45
    ctx.fill();

    // Medium transition
    const midRadius = pixelRadius + (edgeSoftness * 0.4 / groundSize) * size;
    ctx.beginPath();
    ctx.arc(cx, cy, midRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(255, 179, 0)'; // G≈0.70
    ctx.fill();

    // Solid core
    ctx.beginPath();
    ctx.arc(cx, cy, pixelRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(255, 255, 0)'; // G=1.0 → full dirt
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  }

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

    // Draw filled polygon in mixTexture2.R (red channel)
    lineCtx.fillStyle = 'rgb(255, 0, 0)';
    lineCtx.beginPath();
    lineCtx.moveTo(corners[0][0], corners[0][1]);
    lineCtx.lineTo(corners[1][0], corners[1][1]);
    lineCtx.lineTo(corners[2][0], corners[2][1]);
    lineCtx.lineTo(corners[3][0], corners[3][1]);
    lineCtx.closePath();
    lineCtx.fill();
  }

  tex.update();
  lineMaskTex.update();
  return { maskTex: tex, lineMaskTex };
}
