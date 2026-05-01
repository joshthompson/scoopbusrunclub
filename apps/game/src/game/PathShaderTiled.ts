/**
 * PathShaderTiled — Two-level inset path mask for the ground mesh.
 *
 * Instead of one massive DynamicTexture (8192²) covering the full world,
 * this system uses:
 *   1. A low-res mask (1024²) covering the full 6000×6000 world
 *   2. A high-res inset mask (2048²) covering ~1500×1500 around the player
 *
 * A custom ShaderMaterial replicates MixMaterial's blending logic exactly
 * but chooses which mask texture to sample based on UV position.
 *
 * The ground mesh, terrain heights, and all collision logic are untouched.
 */

import {
  Scene,
  Texture,
  DynamicTexture,
  ShaderMaterial,
  Effect,
  Color3,
  SpotLight,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import forestUrl from '../assets/forest.png';
import dirtUrl from '../assets/dirt.png';
import fieldUrl from '../assets/field.png';
import sandUrl from '../assets/sand.png';
import {
  RENDER_TEXTURE_ANISOTROPY,
  TERRAIN_LOD_NEAR_DIST,
  TERRAIN_LOD_FAR_DIST,
  LIGHT_DAY_SUN_INTENSITY,
  LIGHT_DAY_SUN_DIR_X,
  LIGHT_DAY_SUN_DIR_Y,
  LIGHT_DAY_SUN_DIR_Z,
  LIGHT_DAY_HEMI_INTENSITY,
  LIGHT_DAY_HEMI_GROUND_R,
  LIGHT_DAY_HEMI_GROUND_G,
  LIGHT_DAY_HEMI_GROUND_B,
  LIGHT_NIGHT_TERRAIN_SUN_INTENSITY,
  LIGHT_NIGHT_TERRAIN_HEMI_INTENSITY,
  LIGHT_NIGHT_TERRAIN_HEMI_GROUND_R,
  LIGHT_NIGHT_TERRAIN_HEMI_GROUND_G,
  LIGHT_NIGHT_TERRAIN_HEMI_GROUND_B,
  LIGHT_NIGHT_SUN_DIR_X,
  LIGHT_NIGHT_SUN_DIR_Y,
  LIGHT_NIGHT_SUN_DIR_Z,
} from './constants';
import type { PathShaderOptions, IcePatchOverlay } from './PathShader';

// ---------- Configuration ----------

/** Low-res mask covers the full world. */
const LO_RES = 1024;
/** Mid-res inset covers a window around the player (current "high-res"). */
const MID_RES = 2048;
/** Ultra-hi-res inset covers a tight window around the player (2× mid quality). */
const ULTRA_RES = 2048;
/** World-space size of the mid-res inset window (derived from CHUNK_SIZE × 6). */
export const CHUNK_SIZE = 250;
/** When true, draws red outlines at chunk grid boundaries for debugging. */
export const CHUNK_DEBUG = false;
const MID_INSET_SIZE = CHUNK_SIZE * 6;
/** World-space size of the ultra-hi-res inset window (half of mid → 2× pixel density). */
const ULTRA_INSET_SIZE = CHUNK_SIZE * 3;
/** Re-bake threshold for mid-res inset: player must move this far from last bake center. */
const MID_REBAKE_THRESHOLD = CHUNK_SIZE * 0.8;
/** Re-bake threshold for ultra-hi-res inset. */
const ULTRA_REBAKE_THRESHOLD = CHUNK_SIZE * 0.3;

// ---------- Types ----------

export type TiledPathGroundMaterial = ShaderMaterial & {
  __setIcePatches?: (patches: IcePatchOverlay[]) => void;
  __updateInsetCenter?: (playerX: number, playerZ: number) => void;
};

// ---------- GLSL Shader Code ----------

const VERTEX_SHADER = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;

// Varyings
varying vec2 vUV;
varying vec3 vNormalW;
varying vec3 vPositionW;

void main() {
  vUV = uv;
  vPositionW = (world * vec4(position, 1.0)).xyz;
  vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

// Varyings
varying vec2 vUV;
varying vec3 vNormalW;
varying vec3 vPositionW;

// Mask textures — three LOD levels: lo (full world), mid (inset), ultra (tight inset)
uniform sampler2D mixMap1Lo;
uniform sampler2D mixMap1Mid;
uniform sampler2D mixMap1Ultra;
uniform sampler2D mixMap2Lo;
uniform sampler2D mixMap2Mid;
uniform sampler2D mixMap2Ultra;
// Third mask: R=field zone, G=sand/beach candidate, B=encoded water Y
uniform sampler2D mixMap3Lo;
uniform sampler2D mixMap3Mid;
uniform sampler2D mixMap3Ultra;

// Inset bounds in UV space: vec4(uMin, vMin, uMax, vMax)
uniform vec4 midBounds;
uniform vec4 ultraBounds;

// Camera position for distance-based LOD selection
uniform vec3 cameraPosition;
uniform float lodNearDist;   // e.g. 50.0
uniform float lodFarDist;    // e.g. 200.0

// Diffuse textures (tiled)
uniform sampler2D forestTex;
uniform sampler2D dirtTex;
uniform sampler2D fieldTex;
uniform sampler2D sandTex;

// Solid-color values (replacing tiny 4×4 textures)
uniform vec3 roadColorVal;
uniform vec3 whiteColorVal;
uniform vec3 iceColorVal;
uniform vec3 concreteColorVal;

// Tiling factors
uniform float forestTiling;
uniform float dirtTiling;
uniform float fieldTiling;
uniform float sandTiling;
uniform float concreteTiling;

// Lighting
uniform vec3 sunDirection;
uniform float sunIntensity;
uniform float hemiIntensity;
uniform vec3 hemiGroundColor;

// Dynamic spot lights (floodlights, headlights, etc.)
#define MAX_SPOT_LIGHTS 12
uniform int numSpotLights;
uniform vec3 spotPositions[MAX_SPOT_LIGHTS];
uniform vec3 spotDirections[MAX_SPOT_LIGHTS];
uniform vec3 spotColors[MAX_SPOT_LIGHTS];
uniform float spotIntensities[MAX_SPOT_LIGHTS];
uniform float spotRanges[MAX_SPOT_LIGHTS];
uniform float spotCosAngles[MAX_SPOT_LIGHTS]; // cos(half-angle)
uniform float spotExponents[MAX_SPOT_LIGHTS];

// Chunk debug grid
uniform float chunkDebug;   // 0.0 = off, 1.0 = on
uniform float chunkSizeUV;  // CHUNK_SIZE / groundSize in UV space

// Sample the best-available mix map using 3-level LOD:
//   ultra (tight inset, 2× quality)  → within lodNearDist from camera
//   mid   (wider inset, base quality) → lodNearDist – lodFarDist
//   lo    (full world, low quality)   → beyond lodFarDist
vec4 sampleMixMap(sampler2D lo, sampler2D mid, sampler2D ultra, vec2 uv) {
  vec2 dxz = vPositionW.xz - cameraPosition.xz;
  float dist = sqrt(dxz.x * dxz.x + dxz.y * dxz.y);

  // --- Far LOD: only low-res available ---
  float farEdge = lodFarDist + 10.0;
  if (dist > farEdge) {
    return texture2D(lo, uv);
  }

  vec4 loSample = texture2D(lo, uv);

  // --- Mid LOD: blend lo → mid around lodFarDist ---
  bool inMid = uv.x >= midBounds.x && uv.x <= midBounds.z &&
               uv.y >= midBounds.y && uv.y <= midBounds.w;
  if (!inMid) return loSample;

  vec2 midUV = (uv - midBounds.xy) / (midBounds.zw - midBounds.xy);
  vec4 midSample = texture2D(mid, midUV);
  float midBlend = 1.0 - smoothstep(lodFarDist - 20.0, lodFarDist, dist);
  vec4 result = mix(loSample, midSample, midBlend);

  // --- Ultra LOD: blend mid → ultra around lodNearDist ---
  float nearEdge = lodNearDist + 5.0;
  if (dist > nearEdge) return result;

  bool inUltra = uv.x >= ultraBounds.x && uv.x <= ultraBounds.z &&
                 uv.y >= ultraBounds.y && uv.y <= ultraBounds.w;
  if (!inUltra) return result;

  vec2 hiUV = (uv - ultraBounds.xy) / (ultraBounds.zw - ultraBounds.xy);
  vec4 ultraSample = texture2D(ultra, hiUV);
  float ultraBlend = 1.0 - smoothstep(lodNearDist - 10.0, lodNearDist, dist);
  return mix(result, ultraSample, ultraBlend);
}

void main() {
  // Sample mix maps (3-level LOD based on distance from camera)
  vec4 mix1 = sampleMixMap(mixMap1Lo, mixMap1Mid, mixMap1Ultra, vUV);
  vec4 mix2 = sampleMixMap(mixMap2Lo, mixMap2Mid, mixMap2Ultra, vUV);
  vec4 mix3 = sampleMixMap(mixMap3Lo, mixMap3Mid, mixMap3Ultra, vUV);

  // Tiled texture coordinates
  vec2 forestUV = vUV * forestTiling;
  vec2 dirtUV = vUV * dirtTiling;
  vec2 fieldUV = vUV * fieldTiling;
  vec2 sandUV = vUV * sandTiling;
  vec2 concreteUV = vUV * concreteTiling;

  // Sample diffuse textures
  vec3 forestColor = texture2D(forestTex, forestUV).rgb;
  vec3 dirtColor = texture2D(dirtTex, dirtUV).rgb;
  vec3 roadColor = roadColorVal;
  vec3 whiteColor = whiteColorVal;
  vec3 iceColor = iceColorVal;
  vec3 fieldColor = texture2D(fieldTex, fieldUV).rgb;
  vec3 sandColor = texture2D(sandTex, sandUV).rgb;
  vec3 concreteColor = concreteColorVal;

  // Blending chain:
  //   1. Start with forest × R channel brightness
  vec3 color = forestColor * mix1.r;
  //   2. Blend field zone — soft-edged gradient baked into zoneMask R channel
  float fieldFactor = smoothstep(0.55, 1.0, mix3.r);
  color = mix(color, fieldColor, fieldFactor);
  //   2b. Blend concrete — soft-edged gradient baked into lineMask B channel
  float concreteFactor = smoothstep(0.55, 1.0, mix2.b);
  color = mix(color, concreteColor, concreteFactor);
  //   3. Blend sand/beach — smoothed candidate zone with height-based cutoff.
  //      Rendered before roads/paths so they draw on top of sand.
  //      mix3.G = sand candidate zone (soft-edged), mix3.B = encoded water Y.
  //      Decode water Y from B channel: [0,1] → [-100, +100] world units.
  //      Show sand where terrain Y is within 1m above the water surface,
  //      with a 0.5m soft transition.
  float sandCandidate = smoothstep(0.1, 0.8, mix3.g);
  if (sandCandidate > 0.001) {
    float waterY = mix3.b * 200.0 - 100.0;
    float sandTop = waterY + 1.0;
    float softness = 0.5;
    float sandFactor = sandCandidate * clamp((sandTop - vPositionW.y) / softness, 0.0, 1.0);
    color = mix(color, sandColor, sandFactor);
  }
  //   4. Blend road (G channel)
  color = mix(color, roadColor, mix1.g);
  //   5. Blend dirt/path (B channel) — on top of roads
  color = mix(color, dirtColor, mix1.b);
  //   6. Blend start line (mixMap2.R)
  color = mix(color, whiteColor, mix2.r);
  //   7. Blend ice patches (mixMap2.G)
  color = mix(color, iceColor, mix2.g);

  // Simple directional + hemispheric lighting (matches scene setup)
  vec3 nrm = normalize(vNormalW);
  float ndl = max(dot(nrm, -sunDirection), 0.0);
  float hemiBlend = nrm.y * 0.5 + 0.5; // 1 at top, 0 at bottom
  vec3 hemiColor = mix(hemiGroundColor, vec3(1.0), hemiBlend);
  vec3 lighting = hemiColor * hemiIntensity + vec3(1.0) * sunIntensity * ndl;

  // Accumulate dynamic spot light contributions
  for (int i = 0; i < MAX_SPOT_LIGHTS; i++) {
    if (i >= numSpotLights) break;
    vec3 lightToFrag = vPositionW - spotPositions[i];
    float dist = length(lightToFrag);
    if (dist > spotRanges[i]) continue;

    vec3 lightDir = normalize(lightToFrag);
    // Cone test: dot of light direction and frag direction
    float cosAngle = dot(lightDir, normalize(spotDirections[i]));
    float outerCos = spotCosAngles[i];
    if (cosAngle < outerCos - 0.15) continue; // early-out with margin

    // Smooth cone edge: fade from 0 at outer boundary to 1 at inner edge
    float innerCos = mix(outerCos, 1.0, 0.2);
    float coneEdge = smoothstep(outerCos, innerCos, cosAngle);

    // Additional angular falloff from centre
    float coneFalloff = coneEdge * pow(cosAngle, spotExponents[i]);

    // Distance attenuation — smooth fade to zero at range
    float distNorm = dist / spotRanges[i];
    float distAtten = clamp(1.0 - distNorm * distNorm, 0.0, 1.0);
    distAtten *= distAtten; // squared for smoother falloff

    // Lambertian NdotL
    float spotNdl = max(dot(nrm, -lightDir), 0.0);

    lighting += spotColors[i] * spotIntensities[i] * coneFalloff * distAtten * spotNdl;
  }

  gl_FragColor = vec4(color * lighting, 1.0);

  // Debug: chunk grid overlay
  if (chunkDebug > 0.5) {
    // Distance to nearest chunk grid line in UV space
    float gx = abs(fract(vUV.x / chunkSizeUV + 0.5) - 0.5) * chunkSizeUV;
    float gz = abs(fract(vUV.y / chunkSizeUV + 0.5) - 0.5) * chunkSizeUV;
    float lineThickness = 0.0005; // UV-space line width
    float gridDist = min(gx, gz);
    if (gridDist < lineThickness) {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
    // Also outline the mid-res inset bounds in yellow
    float ib = 0.0008;
    float dLeft   = abs(vUV.x - midBounds.x);
    float dRight  = abs(vUV.x - midBounds.z);
    float dBottom = abs(vUV.y - midBounds.y);
    float dTop    = abs(vUV.y - midBounds.w);
    bool inVertRange = vUV.y >= midBounds.y - ib && vUV.y <= midBounds.w + ib;
    bool inHorizRange = vUV.x >= midBounds.x - ib && vUV.x <= midBounds.z + ib;
    if ((dLeft < ib && inVertRange) || (dRight < ib && inVertRange) ||
        (dBottom < ib && inHorizRange) || (dTop < ib && inHorizRange)) {
      gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
    // Outline ultra-res inset bounds in cyan
    float dLeftU   = abs(vUV.x - ultraBounds.x);
    float dRightU  = abs(vUV.x - ultraBounds.z);
    float dBottomU = abs(vUV.y - ultraBounds.y);
    float dTopU    = abs(vUV.y - ultraBounds.w);
    bool inVertRangeU = vUV.y >= ultraBounds.y - ib && vUV.y <= ultraBounds.w + ib;
    bool inHorizRangeU = vUV.x >= ultraBounds.x - ib && vUV.x <= ultraBounds.z + ib;
    if ((dLeftU < ib && inVertRangeU) || (dRightU < ib && inVertRangeU) ||
        (dBottomU < ib && inHorizRangeU) || (dTopU < ib && inHorizRangeU)) {
      gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
    }
  }
}
`;

// ---------- Public API ----------

/**
 * Creates a tiled ShaderMaterial for the ground mesh that replicates
 * MixMaterial's blending but uses two-level mask textures for performance.
 *
 * The ground mesh, terrain heights, and game logic are completely untouched.
 */
export function createTiledPathGroundMaterial(
  scene: Scene,
  opts: PathShaderOptions,
): TiledPathGroundMaterial {
  const {
    pathPositions,
    roads = [],
    trails = [],
    groundSize = 6000,
    pathHalfWidth = 5,
    roadHalfWidth = pathHalfWidth * 1.4,
    edgeSoftness = 1.5,
    maskResolution: _maskResolution = 4096, // ignored — we use LO/HI res instead
    forestTiling = 600,
    dirtTiling = 300,
    fieldTiling = 600,
    sandTiling = 600,
    concreteTiling = 400,
    startLine,
    startCircle,
    pathTextureUrl,
    fields = [],
    concrete = [],
    waterZones = [],
  } = opts;

  const maxTexSize = scene.getEngine().getCaps().maxTextureSize || 4096;
  const loRes = Math.min(LO_RES, maxTexSize);
  const midRes = Math.min(MID_RES, maxTexSize);
  const ultraRes = Math.min(ULTRA_RES, maxTexSize);

  // --- 1. Bake low-res full-world masks ---
  const loMask = bakeMask(scene, 'lo', loRes, pathPositions, roads, trails, groundSize,
    pathHalfWidth, roadHalfWidth, edgeSoftness, startLine, startCircle,
    -groundSize / 2, -groundSize / 2, groundSize, groundSize, fields, concrete, waterZones);

  // --- 2. Bake mid-res inset masks (initial center: first path point or 0,0) ---
  const initialCX = pathPositions.length > 0 ? pathPositions[0][0] : 0;
  const initialCZ = pathPositions.length > 0 ? pathPositions[0][1] : 0;
  const halfMidInset = MID_INSET_SIZE / 2;
  const halfUltraInset = ULTRA_INSET_SIZE / 2;

  const midMask = bakeMask(scene, 'mid', midRes, pathPositions, roads, trails, groundSize,
    pathHalfWidth, roadHalfWidth, edgeSoftness, startLine, startCircle,
    initialCX - halfMidInset, initialCZ - halfMidInset, MID_INSET_SIZE, MID_INSET_SIZE, fields, concrete, waterZones);

  // --- 2b. Bake ultra-hi-res inset masks (2× quality, tight window) ---
  const ultraMask = bakeMask(scene, 'ultra', ultraRes, pathPositions, roads, trails, groundSize,
    pathHalfWidth, roadHalfWidth, edgeSoftness, startLine, startCircle,
    initialCX - halfUltraInset, initialCZ - halfUltraInset, ULTRA_INSET_SIZE, ULTRA_INSET_SIZE, fields, concrete, waterZones);

  let lastMidBakeCX = initialCX;
  let lastMidBakeCZ = initialCZ;
  let lastUltraBakeCX = initialCX;
  let lastUltraBakeCZ = initialCZ;

  // Compute inset UV bounds
  const halfGround = groundSize / 2;
  const computeInsetBounds = (cx: number, cz: number, halfInset: number): [number, number, number, number] => {
    const uMin = (cx - halfInset + halfGround) / groundSize;
    const vMin = (cz - halfInset + halfGround) / groundSize;
    const uMax = (cx + halfInset + halfGround) / groundSize;
    const vMax = (cz + halfInset + halfGround) / groundSize;
    return [uMin, vMin, uMax, vMax];
  };

  let midBounds = computeInsetBounds(initialCX, initialCZ, halfMidInset);
  let ultraBoundsArr = computeInsetBounds(initialCX, initialCZ, halfUltraInset);

  // --- 3. Register shader code ---
  const shaderName = 'tiledPathGround';
  Effect.ShadersStore[shaderName + 'VertexShader'] = VERTEX_SHADER;
  Effect.ShadersStore[shaderName + 'FragmentShader'] = FRAGMENT_SHADER;

  // --- 4. Load diffuse textures ---
  const forestTex = new Texture(forestUrl, scene);
  forestTex.anisotropicFilteringLevel = RENDER_TEXTURE_ANISOTROPY;

  const dirtTex = new Texture(pathTextureUrl ?? dirtUrl, scene);
  dirtTex.anisotropicFilteringLevel = RENDER_TEXTURE_ANISOTROPY;

  const fieldTex = new Texture(fieldUrl, scene);
  fieldTex.anisotropicFilteringLevel = RENDER_TEXTURE_ANISOTROPY;

  const sandTex = new Texture(sandUrl, scene);
  sandTex.anisotropicFilteringLevel = RENDER_TEXTURE_ANISOTROPY;

  // --- 5. Create ShaderMaterial ---
  const mat = new ShaderMaterial(shaderName, scene, shaderName, {
    attributes: ['position', 'normal', 'uv'],
    uniforms: [
      'worldViewProjection', 'world',
      'midBounds', 'ultraBounds',
      'cameraPosition', 'lodNearDist', 'lodFarDist',
      'forestTiling', 'dirtTiling', 'fieldTiling', 'sandTiling', 'concreteTiling',
      'roadColorVal', 'whiteColorVal', 'iceColorVal', 'concreteColorVal',
      'sunDirection', 'sunIntensity',
      'hemiIntensity', 'hemiGroundColor',
      'chunkDebug', 'chunkSizeUV',
      'numSpotLights',
      'spotPositions', 'spotDirections', 'spotColors',
      'spotIntensities', 'spotRanges', 'spotCosAngles', 'spotExponents',
    ],
    samplers: [
      'mixMap1Lo', 'mixMap1Mid', 'mixMap1Ultra',
      'mixMap2Lo', 'mixMap2Mid', 'mixMap2Ultra',
      'mixMap3Lo', 'mixMap3Mid', 'mixMap3Ultra',
      'forestTex', 'dirtTex',
      'fieldTex', 'sandTex',
    ],
  });

  mat.backFaceCulling = true;

  // Set mask textures (3 LOD levels × 3 mask types)
  mat.setTexture('mixMap1Lo', loMask.maskTex);
  mat.setTexture('mixMap1Mid', midMask.maskTex);
  mat.setTexture('mixMap1Ultra', ultraMask.maskTex);
  mat.setTexture('mixMap2Lo', loMask.lineMaskTex);
  mat.setTexture('mixMap2Mid', midMask.lineMaskTex);
  mat.setTexture('mixMap2Ultra', ultraMask.lineMaskTex);
  mat.setTexture('mixMap3Lo', loMask.zoneMaskTex);
  mat.setTexture('mixMap3Mid', midMask.zoneMaskTex);
  mat.setTexture('mixMap3Ultra', ultraMask.zoneMaskTex);
  mat.setTexture('forestTex', forestTex);
  mat.setTexture('dirtTex', dirtTex);
  mat.setTexture('fieldTex', fieldTex);
  mat.setTexture('sandTex', sandTex);

  // Solid-color uniforms (replaces tiny 4×4 textures — saves texture units)
  mat.setVector3('roadColorVal', hexToVec3('#606066'));
  mat.setVector3('whiteColorVal', hexToVec3('#ffffff'));
  mat.setVector3('iceColorVal', hexToVec3('#85d2ff'));
  mat.setVector3('concreteColorVal', hexToVec3('#909090'));

  // Set tiling
  mat.setFloat('forestTiling', forestTiling);
  mat.setFloat('dirtTiling', dirtTiling);
  mat.setFloat('fieldTiling', fieldTiling);
  mat.setFloat('sandTiling', sandTiling);
  mat.setFloat('concreteTiling', concreteTiling);

  // Set inset bounds for both LOD levels
  const vec4 = (x: number, y: number, z: number, w: number) =>
    ({ x, y, z, w }) as any;
  mat.setVector4('midBounds', vec4(midBounds[0], midBounds[1], midBounds[2], midBounds[3]));
  mat.setVector4('ultraBounds', vec4(ultraBoundsArr[0], ultraBoundsArr[1], ultraBoundsArr[2], ultraBoundsArr[3]));

  // LOD distance thresholds
  mat.setFloat('lodNearDist', TERRAIN_LOD_NEAR_DIST);
  mat.setFloat('lodFarDist', TERRAIN_LOD_FAR_DIST);

  // Camera position (updated per-frame in onBind)
  mat.setVector3('cameraPosition', { x: 0, y: 0, z: 0 } as any);

  // Lighting uniforms (values from constants.ts)
  const isNight = opts.isNight ?? false;
  const sunDir = isNight
    ? new Color3(LIGHT_NIGHT_SUN_DIR_X, LIGHT_NIGHT_SUN_DIR_Y, LIGHT_NIGHT_SUN_DIR_Z)
    : new Color3(LIGHT_DAY_SUN_DIR_X, LIGHT_DAY_SUN_DIR_Y, LIGHT_DAY_SUN_DIR_Z);
  const sunLen = Math.sqrt(sunDir.r * sunDir.r + sunDir.g * sunDir.g + sunDir.b * sunDir.b);
  mat.setVector3('sunDirection', { x: sunDir.r / sunLen, y: sunDir.g / sunLen, z: sunDir.b / sunLen } as any);
  mat.setFloat('sunIntensity', isNight ? LIGHT_NIGHT_TERRAIN_SUN_INTENSITY : LIGHT_DAY_SUN_INTENSITY);
  mat.setFloat('hemiIntensity', isNight ? LIGHT_NIGHT_TERRAIN_HEMI_INTENSITY : LIGHT_DAY_HEMI_INTENSITY);
  mat.setVector3('hemiGroundColor', isNight
    ? { x: LIGHT_NIGHT_TERRAIN_HEMI_GROUND_R, y: LIGHT_NIGHT_TERRAIN_HEMI_GROUND_G, z: LIGHT_NIGHT_TERRAIN_HEMI_GROUND_B } as any
    : { x: LIGHT_DAY_HEMI_GROUND_R, y: LIGHT_DAY_HEMI_GROUND_G, z: LIGHT_DAY_HEMI_GROUND_B } as any);

  // Chunk debug uniforms
  mat.setFloat('chunkDebug', CHUNK_DEBUG ? 1.0 : 0.0);
  mat.setFloat('chunkSizeUV', CHUNK_SIZE / groundSize);

  // --- Dynamic spot light sync (updated every frame via onBind) ---
  const MAX_SPOTS = 12;
  // Pre-allocate typed arrays to avoid GC churn every frame
  const spotPosArr = new Float32Array(MAX_SPOTS * 3);
  const spotDirArr = new Float32Array(MAX_SPOTS * 3);
  const spotColArr = new Float32Array(MAX_SPOTS * 3);
  const _tmpDir = new Vector3();  // reusable temp to avoid GC
  const spotIntArr = new Float32Array(MAX_SPOTS);
  const spotRngArr = new Float32Array(MAX_SPOTS);
  const spotCosArr = new Float32Array(MAX_SPOTS);
  const spotExpArr = new Float32Array(MAX_SPOTS);

  // Initialise to zero
  mat.setInt('numSpotLights', 0);

  mat.onBind = () => {
    // Gather scene SpotLights
    const lights = scene.lights;
    let count = 0;
    for (let li = 0; li < lights.length && count < MAX_SPOTS; li++) {
      const light = lights[li];
      if (!(light instanceof SpotLight) || !light.isEnabled()) continue;

      // Get world-space position & direction
      const pos = light.getAbsolutePosition();
      const i3 = count * 3;
      spotPosArr[i3] = pos.x;
      spotPosArr[i3 + 1] = pos.y;
      spotPosArr[i3 + 2] = pos.z;
      // Transform local direction to world space when light has a parent
      if (light.parent) {
        Vector3.TransformNormalToRef(light.direction, (light.parent as TransformNode).getWorldMatrix(), _tmpDir);
        _tmpDir.normalize();
        spotDirArr[i3] = _tmpDir.x;
        spotDirArr[i3 + 1] = _tmpDir.y;
        spotDirArr[i3 + 2] = _tmpDir.z;
      } else {
        spotDirArr[i3] = light.direction.x;
        spotDirArr[i3 + 1] = light.direction.y;
        spotDirArr[i3 + 2] = light.direction.z;
      }
      spotColArr[i3] = light.diffuse.r;
      spotColArr[i3 + 1] = light.diffuse.g;
      spotColArr[i3 + 2] = light.diffuse.b;
      spotIntArr[count] = light.intensity;
      spotRngArr[count] = light.range;
      spotCosArr[count] = Math.cos(light.angle * 0.5);
      spotExpArr[count] = light.exponent;
      count++;
    }

    const effect = mat.getEffect();
    if (effect) {
      effect.setInt('numSpotLights', count);
      if (count > 0) {
        effect.setArray3('spotPositions', Array.from(spotPosArr.subarray(0, count * 3)));
        effect.setArray3('spotDirections', Array.from(spotDirArr.subarray(0, count * 3)));
        effect.setArray3('spotColors', Array.from(spotColArr.subarray(0, count * 3)));
        effect.setFloatArray('spotIntensities', spotIntArr.subarray(0, count));
        effect.setFloatArray('spotRanges', spotRngArr.subarray(0, count));
        effect.setFloatArray('spotCosAngles', spotCosArr.subarray(0, count));
        effect.setFloatArray('spotExponents', spotExpArr.subarray(0, count));
      }

      // Push camera position for distance-based LOD in the shader
      const cam = scene.activeCamera;
      if (cam) {
        const cp = cam.position;
        effect.setFloat3('cameraPosition', cp.x, cp.y, cp.z);
      }
    }
  };

  // --- 6. Ice patch update function (draws into all mask levels) ---
  const setIcePatches = (patches: IcePatchOverlay[]) => {
    loMask.setIcePatches(patches);
    midMask.setIcePatches(patches);
    ultraMask.setIcePatches(patches);
  };

  // --- 7. Inset center update (called from game loop) ---
  const updateInsetCenter = (playerX: number, playerZ: number) => {
    // --- Mid-res rebake ---
    const mdx = playerX - lastMidBakeCX;
    const mdz = playerZ - lastMidBakeCZ;
    if (mdx * mdx + mdz * mdz >= MID_REBAKE_THRESHOLD * MID_REBAKE_THRESHOLD) {
      lastMidBakeCX = playerX;
      lastMidBakeCZ = playerZ;

      rebakeMask(midMask, midRes, pathPositions, roads, trails, groundSize,
        pathHalfWidth, roadHalfWidth, edgeSoftness, startLine, startCircle,
        playerX - halfMidInset, playerZ - halfMidInset, MID_INSET_SIZE, MID_INSET_SIZE, fields, concrete, waterZones);

      midBounds = computeInsetBounds(playerX, playerZ, halfMidInset);
      mat.setVector4('midBounds', {
        x: midBounds[0], y: midBounds[1], z: midBounds[2], w: midBounds[3],
      } as any);
    }

    // --- Ultra-res rebake (tighter threshold, smaller window) ---
    const udx = playerX - lastUltraBakeCX;
    const udz = playerZ - lastUltraBakeCZ;
    if (udx * udx + udz * udz >= ULTRA_REBAKE_THRESHOLD * ULTRA_REBAKE_THRESHOLD) {
      lastUltraBakeCX = playerX;
      lastUltraBakeCZ = playerZ;

      rebakeMask(ultraMask, ultraRes, pathPositions, roads, trails, groundSize,
        pathHalfWidth, roadHalfWidth, edgeSoftness, startLine, startCircle,
        playerX - halfUltraInset, playerZ - halfUltraInset, ULTRA_INSET_SIZE, ULTRA_INSET_SIZE, fields, concrete, waterZones);

      ultraBoundsArr = computeInsetBounds(playerX, playerZ, halfUltraInset);
      mat.setVector4('ultraBounds', {
        x: ultraBoundsArr[0], y: ultraBoundsArr[1], z: ultraBoundsArr[2], w: ultraBoundsArr[3],
      } as any);
    }
  };

  // Attach helpers
  (mat as TiledPathGroundMaterial).__setIcePatches = setIcePatches;
  (mat as TiledPathGroundMaterial).__updateInsetCenter = updateInsetCenter;

  return mat as TiledPathGroundMaterial;
}

// ---------- Mask baking (reused for both low-res and high-res) ----------

interface BakedMask {
  maskTex: DynamicTexture;
  lineMaskTex: DynamicTexture;
  zoneMaskTex: DynamicTexture;
  staticLineCanvas: HTMLCanvasElement;
  setIcePatches: (patches: IcePatchOverlay[]) => void;
  /** World bounds this mask covers */
  worldMinX: number;
  worldMinZ: number;
  worldW: number;
  worldH: number;
}

/**
 * Bake mask textures for a specific world-space region.
 *
 * @param worldMinX - Left edge of the region in world space
 * @param worldMinZ - Bottom edge of the region in world space
 * @param worldW - Width of the region in world units
 * @param worldH - Height of the region in world units
 */
function bakeMask(
  scene: Scene,
  label: string,
  resolution: number,
  pathPositions: [number, number][],
  roads: [number, number][][],
  trails: [number, number][][],
  groundSize: number,
  pathHalfWidth: number,
  roadHalfWidth: number,
  edgeSoftness: number,
  startLine: PathShaderOptions['startLine'],
  startCircle: PathShaderOptions['startCircle'],
  worldMinX: number,
  worldMinZ: number,
  worldW: number,
  worldH: number,
  fields: [number, number][][] = [],
  concrete: [number, number][][] = [],
  waterZones: { points: [number, number][]; y: number }[] = [],
): BakedMask {
  const size = resolution;
  const tex = new DynamicTexture(`pathMask_${label}`, size, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const lineMaskTex = new DynamicTexture(`lineMask_${label}`, size, scene, false);
  const lineCtx = lineMaskTex.getContext() as unknown as CanvasRenderingContext2D;
  const zoneMaskTex = new DynamicTexture(`zoneMask_${label}`, size, scene, false);
  const zoneCtx = zoneMaskTex.getContext() as unknown as CanvasRenderingContext2D;
  tex.anisotropicFilteringLevel = RENDER_TEXTURE_ANISOTROPY;
  lineMaskTex.anisotropicFilteringLevel = RENDER_TEXTURE_ANISOTROPY;
  zoneMaskTex.anisotropicFilteringLevel = RENDER_TEXTURE_ANISOTROPY;

  paintMaskContent(ctx, lineCtx, zoneCtx, size, pathPositions, roads, trails,
    groundSize, pathHalfWidth, roadHalfWidth, edgeSoftness, startLine, startCircle,
    worldMinX, worldMinZ, worldW, worldH, fields, concrete, waterZones);

  // Save static line canvas for ice patch updates
  const staticLineCanvas = document.createElement('canvas');
  staticLineCanvas.width = size;
  staticLineCanvas.height = size;
  const staticCtx = staticLineCanvas.getContext('2d')!;
  staticCtx.drawImage((lineCtx as any).canvas, 0, 0);

  tex.update();
  lineMaskTex.update();
  zoneMaskTex.update();

  const setIcePatches = (patches: IcePatchOverlay[]) => {
    lineCtx.clearRect(0, 0, size, size);
    lineCtx.drawImage(staticLineCanvas, 0, 0);

    const toPixel = makeToPixelFn(worldMinX, worldMinZ, worldW, worldH, size);

    for (const patch of patches) {
      if (patch.alpha <= 0 || patch.radius <= 0) continue;
      const [px, py] = toPixel(patch.x, patch.z);
      // Skip patches entirely outside this mask region
      const pixelRadius = (patch.radius / worldW) * size;
      if (px + pixelRadius < 0 || px - pixelRadius > size ||
          py + pixelRadius < 0 || py - pixelRadius > size) continue;
      const g = Math.max(0, Math.min(255, Math.round(patch.alpha * 255)));
      lineCtx.fillStyle = `rgb(0, ${g}, 0)`;
      lineCtx.beginPath();
      lineCtx.arc(px, py, pixelRadius, 0, Math.PI * 2);
      lineCtx.fill();
    }
    lineMaskTex.update();
  };

  return { maskTex: tex, lineMaskTex, zoneMaskTex, staticLineCanvas, setIcePatches, worldMinX, worldMinZ, worldW, worldH };
}

/**
 * Re-bake an existing mask's textures for a new world region.
 * Reuses the DynamicTexture objects (no allocation).
 */
function rebakeMask(
  mask: BakedMask,
  resolution: number,
  pathPositions: [number, number][],
  roads: [number, number][][],
  trails: [number, number][][],
  groundSize: number,
  pathHalfWidth: number,
  roadHalfWidth: number,
  edgeSoftness: number,
  startLine: PathShaderOptions['startLine'],
  startCircle: PathShaderOptions['startCircle'],
  worldMinX: number,
  worldMinZ: number,
  worldW: number,
  worldH: number,
  fields: [number, number][][] = [],
  concrete: [number, number][][] = [],
  waterZones: { points: [number, number][]; y: number }[] = [],
) {
  const size = resolution;
  const ctx = mask.maskTex.getContext() as unknown as CanvasRenderingContext2D;
  const lineCtx = mask.lineMaskTex.getContext() as unknown as CanvasRenderingContext2D;
  const zoneCtx = mask.zoneMaskTex.getContext() as unknown as CanvasRenderingContext2D;

  paintMaskContent(ctx, lineCtx, zoneCtx, size, pathPositions, roads, trails,
    groundSize, pathHalfWidth, roadHalfWidth, edgeSoftness, startLine, startCircle,
    worldMinX, worldMinZ, worldW, worldH, fields, concrete, waterZones);

  // Update static line canvas backup
  const staticCtx = mask.staticLineCanvas.getContext('2d')!;
  staticCtx.clearRect(0, 0, size, size);
  staticCtx.drawImage((lineCtx as any).canvas, 0, 0);

  mask.maskTex.update();
  mask.lineMaskTex.update();
  mask.zoneMaskTex.update();

  mask.worldMinX = worldMinX;
  mask.worldMinZ = worldMinZ;
  mask.worldW = worldW;
  mask.worldH = worldH;
}

// ---------- Coordinate mapping ----------

/**
 * Create a world-to-pixel coordinate mapper for a given region.
 *
 * DynamicTexture with invertY=true (default) flips canvas vertically:
 *   canvas py=0 (top) → v=1 → z = worldMinZ + worldH
 *   canvas py=size (bottom) → v=0 → z = worldMinZ
 * Canvas X maps normally to world X.
 */
function makeToPixelFn(
  worldMinX: number,
  worldMinZ: number,
  worldW: number,
  worldH: number,
  size: number,
): (wx: number, wz: number) => [number, number] {
  return (wx: number, wz: number) => {
    const px = ((wx - worldMinX) / worldW) * size;
    const py = ((worldMinZ + worldH - wz) / worldH) * size; // flip Z for invertY
    return [px, py];
  };
}

// ---------- Mask painting (shared between bake and rebake) ----------

function paintMaskContent(
  ctx: CanvasRenderingContext2D,
  lineCtx: CanvasRenderingContext2D,
  zoneCtx: CanvasRenderingContext2D,
  size: number,
  pathPositions: [number, number][],
  roads: [number, number][][],
  trails: [number, number][][],
  groundSize: number,
  pathHalfWidth: number,
  roadHalfWidth: number,
  edgeSoftness: number,
  startLine: PathShaderOptions['startLine'],
  startCircle: PathShaderOptions['startCircle'],
  worldMinX: number,
  worldMinZ: number,
  worldW: number,
  worldH: number,
  fields: [number, number][][] = [],
  concrete: [number, number][][] = [],
  waterZones: { points: [number, number][]; y: number }[] = [],
) {
  const toPixel = makeToPixelFn(worldMinX, worldMinZ, worldW, worldH, size);

  // Fill with R=255, G=0, B=0, A=255 → forest everywhere, no dirt
  ctx.fillStyle = 'rgb(255, 0, 0)';
  ctx.fillRect(0, 0, size, size);
  // mixTexture2 starts as all black (no start-line overlay)
  lineCtx.fillStyle = 'rgb(0, 0, 0)';
  lineCtx.fillRect(0, 0, size, size);
  // zoneMask: R=field zone (soft-edged), G=sand candidate, B=encoded water Y
  zoneCtx.fillStyle = 'rgb(0, 0, 0)';
  zoneCtx.fillRect(0, 0, size, size);

  // World-to-pixel width conversion for this region
  const worldToPixelW = (w: number) => (w / worldW) * size;

  // -- Paint concrete polygons into lineMask B channel with soft gradient edges --
  const CONCRETE_SOFT_EDGE = 6; // world-space transition width
  if (concrete.length > 0) {
    const cSoftPx = worldToPixelW(CONCRETE_SOFT_EDGE);
    lineCtx.globalCompositeOperation = 'lighten';
    for (const polygon of concrete) {
      if (polygon.length < 3) continue;
      const drawConcretePoly = (style: string, stroke?: number) => {
        lineCtx.beginPath();
        for (let i = 0; i < polygon.length; i++) {
          const [px, py] = toPixel(polygon[i][0], polygon[i][1]);
          if (i === 0) lineCtx.moveTo(px, py);
          else lineCtx.lineTo(px, py);
        }
        lineCtx.closePath();
        if (stroke !== undefined) {
          lineCtx.lineWidth = stroke;
          lineCtx.lineJoin = 'round';
          lineCtx.strokeStyle = style;
          lineCtx.stroke();
        } else {
          lineCtx.fillStyle = style;
          lineCtx.fill();
        }
      };
      // Layered soft edge: outermost halo → solid core
      drawConcretePoly('rgb(0, 0, 160)', cSoftPx * 2);
      drawConcretePoly('rgb(0, 0, 200)', cSoftPx * 1.2);
      drawConcretePoly('rgb(0, 0, 235)', cSoftPx * 0.5);
      drawConcretePoly('rgb(0, 0, 255)');
    }
    lineCtx.globalCompositeOperation = 'source-over';
  }

  // -- Paint field polygons into zoneMask R channel with soft gradient edges --
  const FIELD_SOFT_EDGE = 10; // world-space transition width
  if (fields.length > 0) {
    const fSoftPx = worldToPixelW(FIELD_SOFT_EDGE);
    zoneCtx.globalCompositeOperation = 'lighten';
    for (const polygon of fields) {
      if (polygon.length < 3) continue;
      const drawFieldPoly = (style: string, stroke?: number) => {
        zoneCtx.beginPath();
        for (let i = 0; i < polygon.length; i++) {
          const [px, py] = toPixel(polygon[i][0], polygon[i][1]);
          if (i === 0) zoneCtx.moveTo(px, py);
          else zoneCtx.lineTo(px, py);
        }
        zoneCtx.closePath();
        if (stroke !== undefined) {
          zoneCtx.lineWidth = stroke;
          zoneCtx.lineJoin = 'round';
          zoneCtx.strokeStyle = style;
          zoneCtx.stroke();
        } else {
          zoneCtx.fillStyle = style;
          zoneCtx.fill();
        }
      };
      // Layered soft edge: outermost halo → solid core
      drawFieldPoly('rgb(160, 0, 0)', fSoftPx * 2);
      drawFieldPoly('rgb(200, 0, 0)', fSoftPx * 1.2);
      drawFieldPoly('rgb(235, 0, 0)', fSoftPx * 0.5);
      drawFieldPoly('rgb(255, 0, 0)');
    }
    zoneCtx.globalCompositeOperation = 'source-over';
  }

  // -- Paint sand/beach candidate zones into zoneMask G+B channels --
  // Paint a generous zone covering the entire bank area (~20m buffer).
  // The shader will refine this using terrain height vs water Y to produce
  // a clean, consistent 1m sand strip at the actual shoreline.
  // G channel = sand candidate (1.0 = potential sand area)
  // B channel = encoded water Y level (so shader can compare against terrain height)
  // Water Y encoding: map [-100, +100] → [0, 255]
  if (waterZones.length > 0) {
    const SAND_CANDIDATE_BUFFER = 20; // generous buffer to cover entire bank + margin
    const SAND_SOFT_EDGE = 8; // extra soft transition beyond the buffer
    const bufferPx = worldToPixelW(SAND_CANDIDATE_BUFFER);
    const sandSoftPx = worldToPixelW(SAND_SOFT_EDGE);
    zoneCtx.globalCompositeOperation = 'lighten';
    for (const wz of waterZones) {
      if (wz.points.length < 3) continue;
      // Encode water Y into 0-255 range: [-100, +100] → [0, 255]
      const encodedY = Math.max(0, Math.min(255, Math.round(((wz.y + 100) / 200) * 255)));

      // Helper to draw the water polygon outline + fill
      const drawSandZone = (strokeWidth: number, g: number) => {
        const style = `rgb(0, ${g}, ${encodedY})`;
        zoneCtx.lineWidth = strokeWidth;
        zoneCtx.lineJoin = 'round';
        zoneCtx.strokeStyle = style;
        zoneCtx.beginPath();
        for (let i = 0; i < wz.points.length; i++) {
          const [px, py] = toPixel(wz.points[i][0], wz.points[i][1]);
          if (i === 0) zoneCtx.moveTo(px, py);
          else zoneCtx.lineTo(px, py);
        }
        zoneCtx.closePath();
        zoneCtx.stroke();
      };

      // Layered soft edge: outermost halo → solid core
      drawSandZone(bufferPx * 2 + sandSoftPx * 2, 100);  // outermost halo
      drawSandZone(bufferPx * 2 + sandSoftPx,     180);  // mid transition
      drawSandZone(bufferPx * 2,                   255);  // core stroke

      // Fill inside the polygon at full intensity
      zoneCtx.fillStyle = `rgb(0, 255, ${encodedY})`;
      zoneCtx.beginPath();
      for (let i = 0; i < wz.points.length; i++) {
        const [px, py] = toPixel(wz.points[i][0], wz.points[i][1]);
        if (i === 0) zoneCtx.moveTo(px, py);
        else zoneCtx.lineTo(px, py);
      }
      zoneCtx.closePath();
      zoneCtx.fill();
    }
    zoneCtx.globalCompositeOperation = 'source-over';
  }

  if (pathPositions.length < 2) return;

  // Helper to draw a polyline stroke
  const drawPolylineStroke = (
    points: [number, number][],
    pixelWidth: number,
    color: string,
    targetCtx: CanvasRenderingContext2D = ctx,
  ) => {
    if (points.length < 2) return;
    targetCtx.lineWidth = pixelWidth;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.strokeStyle = color;
    targetCtx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [px, py] = toPixel(points[i][0], points[i][1]);
      if (i === 0) targetCtx.moveTo(px, py);
      else targetCtx.lineTo(px, py);
    }
    targetCtx.stroke();
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

  // -- Roads in G channel (blended first → renders under paths) --
  const roadOuterWorldWidth = roadHalfWidth * 2 + edgeSoftness * 1.2;
  const roadOuterPixelWidth = worldToPixelW(roadOuterWorldWidth);
  const roadMidWorldWidth = roadHalfWidth * 2 + edgeSoftness * 0.4;
  const roadMidPixelWidth = worldToPixelW(roadMidWorldWidth);
  const roadCoreWorldWidth = roadHalfWidth * 2;
  const roadCorePixelWidth = worldToPixelW(roadCoreWorldWidth);

  ctx.globalCompositeOperation = 'lighten';
  for (const road of roads) {
    drawPolylineStroke(road, roadOuterPixelWidth, 'rgb(255, 140, 0)');
    drawPolylineStroke(road, roadMidPixelWidth, 'rgb(255, 210, 0)');
    drawPolylineStroke(road, roadCorePixelWidth, 'rgb(255, 255, 0)');
  }
  ctx.globalCompositeOperation = 'source-over';

  // -- Course path in B channel (blended last → on top of roads) --
  const totalWorldWidth = (pathHalfWidth + edgeSoftness) * 2;
  const outerPixelWidth = worldToPixelW(totalWorldWidth);
  drawPolylineStroke(pathPositions, outerPixelWidth, 'rgb(255, 0, 115)');

  const midWorldWidth = (pathHalfWidth + edgeSoftness * 0.4) * 2;
  const midPixelWidth = worldToPixelW(midWorldWidth);
  drawPolylineStroke(pathPositions, midPixelWidth, 'rgb(255, 0, 179)');

  const coreWorldWidth = pathHalfWidth * 2;
  const corePixelWidth = worldToPixelW(coreWorldWidth);
  drawPolylineStroke(pathPositions, corePixelWidth, 'rgb(255, 0, 255)');

  // -- Trails --
  const trailHalfWidth = pathHalfWidth * 0.4;
  const trailOuterWorld = (trailHalfWidth + edgeSoftness * 0.4) * 2;
  const trailOuterPx = worldToPixelW(trailOuterWorld);
  const trailCorePx = worldToPixelW(trailHalfWidth * 2);

  ctx.globalCompositeOperation = 'lighten';
  for (const trail of trails) {
    drawPolylineStroke(trail, trailOuterPx, 'rgb(255, 0, 60)');
    drawPolylineStroke(trail, trailCorePx, 'rgb(255, 0, 110)');
  }
  ctx.globalCompositeOperation = 'source-over';

  // -- Start circle connector --
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
      drawSegmentStroke(outerStart, connectorTo, outerPixelWidth, 'rgb(255, 0, 115)');
      drawSegmentStroke(midStart, connectorTo, midPixelWidth, 'rgb(255, 0, 179)');
      drawSegmentStroke(coreStart, connectorTo, corePixelWidth, 'rgb(255, 0, 255)');
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // -- Start circle (dirt) --
  if (startCircle) {
    const [cx, cy] = toPixel(startCircle.x, startCircle.z);
    const pixelRadius = worldToPixelW(startCircle.radius);

    ctx.globalCompositeOperation = 'lighten';

    const outerRadius = pixelRadius + worldToPixelW(edgeSoftness);
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(255, 0, 115)';
    ctx.fill();

    const midRadius = pixelRadius + worldToPixelW(edgeSoftness * 0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, midRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(255, 0, 179)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, pixelRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(255, 0, 255)';
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  }

  // -- Start line (on lineMask, R channel) --
  if (startLine) {
    const { x, z, yaw, width, thickness = 0.4 } = startLine;
    const perpX = Math.cos(yaw);
    const perpZ = -Math.sin(yaw);
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    const hw = width / 2;
    const ht = thickness / 2;

    const corners = [
      toPixel(x - perpX * hw - fwdX * ht, z - perpZ * hw - fwdZ * ht),
      toPixel(x + perpX * hw - fwdX * ht, z + perpZ * hw - fwdZ * ht),
      toPixel(x + perpX * hw + fwdX * ht, z + perpZ * hw + fwdZ * ht),
      toPixel(x - perpX * hw + fwdX * ht, z - perpZ * hw + fwdZ * ht),
    ];

    lineCtx.fillStyle = 'rgb(255, 0, 0)';
    lineCtx.beginPath();
    lineCtx.moveTo(corners[0][0], corners[0][1]);
    lineCtx.lineTo(corners[1][0], corners[1][1]);
    lineCtx.lineTo(corners[2][0], corners[2][1]);
    lineCtx.lineTo(corners[3][0], corners[3][1]);
    lineCtx.closePath();
    lineCtx.fill();
  }
}

// ---------- Helpers ----------

function makeSolidTexture(scene: Scene, name: string, color: string): DynamicTexture {
  const dyn = new DynamicTexture(name, 4, scene, false);
  const c = dyn.getContext() as unknown as CanvasRenderingContext2D;
  c.fillStyle = color;
  c.fillRect(0, 0, 4, 4);
  dyn.update();
  return dyn;
}

/** Convert a hex color string (#rrggbb) to an {x,y,z} object for setVector3. */
function hexToVec3(hex: string): { x: number; y: number; z: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { x: r, y: g, z: b } as any;
}
