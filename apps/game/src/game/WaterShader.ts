/**
 * WaterShader — Custom shader for stylised water with:
 *   - Animated procedural shore foam (small foamy waves at land edges)
 *   - Subtle surface ripples / caustic-like shimmer
 *   - Fresnel-based sky reflection
 *
 * Performance budget: single fullscreen-quad-level fragment shader with
 * no extra render targets, no reflection probes, no depth pre-pass.
 * All edge detection is done analytically via vertex alpha encoding.
 */

import {
  Scene,
  ShaderMaterial,
  Effect,
  Color3,
  Vector3,
} from '@babylonjs/core';

/** Global speed multiplier for all water animation (ripples, foam, waves). */
export const WATER_SPEED = 10.0;

// ─── GLSL ──────────────────────────────────────────────────────────

const VERTEX = /* glsl */ `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute float edgeDist; // 0 at polygon edge, 1 in interior (baked per-vertex)

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float time;

varying vec2 vUV;
varying vec3 vPositionW;
varying vec3 vNormalW;
varying float vEdgeDist;

void main() {
  vUV = uv;
  vPositionW = (world * vec4(position, 1.0)).xyz;
  vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
  vEdgeDist = edgeDist;

  // Gentle vertex wave displacement for open water feel
  float wave = sin(vPositionW.x * 0.3 + time * 1.2)
             * cos(vPositionW.z * 0.25 + time * 0.9) * 0.04;
  vec3 pos = position;
  pos.y += wave;

  gl_Position = worldViewProjection * vec4(pos, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUV;
varying vec3 vPositionW;
varying vec3 vNormalW;
varying float vEdgeDist;

uniform float time;
uniform vec3 cameraPosition;
uniform vec3 waterDeepColor;
uniform vec3 waterShallowColor;
uniform vec3 foamColor;
uniform vec3 skyColor;
uniform float sunIntensity;
uniform vec3 sunDirection;

// ── Noise helpers (small footprint) ──

// Hash without sin – integer-based, avoids GPU sin precision issues
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion (2 octaves – cheap)
float fbm(vec2 p) {
  float v = 0.0;
  v += 0.5 * noise(p); p *= 2.01;
  v += 0.25 * noise(p);
  return v;
}

void main() {
  // ── 1. Base water color (depth-like gradient via edge distance) ──
  float depthFactor = smoothstep(0.0, 0.35, vEdgeDist);
  vec3 baseColor = mix(waterShallowColor, waterDeepColor, depthFactor);

  // ── 2. Surface ripples / caustics ──
  vec2 rippleUV = vPositionW.xz * 0.15;
  float ripple1 = fbm(rippleUV + vec2(time * 0.08, time * 0.06));
  float ripple2 = fbm(rippleUV * 1.4 - vec2(time * 0.05, time * 0.07));
  float ripple = (ripple1 + ripple2) * 0.5;
  // Subtle caustic highlight
  float caustic = smoothstep(0.48, 0.58, ripple);
  baseColor += caustic * 0.08;

  // ── 3. Shore foam ──
  // Two scrolling noise layers at different scales/speeds create
  // the look of small foamy wavelets advancing and retreating.
  float shoreZone = 1.0 - smoothstep(0.0, 0.20, vEdgeDist); // strong near edge
  if (shoreZone > 0.001) {
    vec2 foamUV = vPositionW.xz * 0.6;

    // Layer 1: larger foam blobs moving shoreward
    float foam1 = noise(foamUV + vec2(time * 0.12, time * 0.08));
    // Layer 2: finer frothy detail
    float foam2 = noise(foamUV * 2.5 - vec2(time * 0.18, time * 0.10));

    // Combine: threshold to get bubbly look
    float foamPattern = smoothstep(0.35, 0.55, foam1 * 0.6 + foam2 * 0.4);

    // Animate in/out with a slow sine — mimics wave advance/retreat
    float wavePulse = sin(time * 1.5 + vPositionW.x * 0.2 + vPositionW.z * 0.15) * 0.5 + 0.5;
    // Shift the shore edge inward/outward over time
    float animatedShore = 1.0 - smoothstep(0.0, 0.18 + wavePulse * 0.08, vEdgeDist);

    float foamMask = animatedShore * foamPattern;
    baseColor = mix(baseColor, foamColor, foamMask * 0.85);
  }

  // ── 4. Fresnel-based sky reflection ──
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  vec3 nrm = normalize(vNormalW);
  // Perturb normal slightly with ripple for shimmering reflection
  nrm.xz += (ripple - 0.35) * 0.08;
  nrm = normalize(nrm);
  float fresnel = pow(1.0 - max(dot(viewDir, nrm), 0.0), 3.0);
  fresnel = clamp(fresnel, 0.0, 0.6);
  baseColor = mix(baseColor, skyColor, fresnel);

  // ── 5. Specular sun highlight ──
  vec3 halfVec = normalize(viewDir - sunDirection);
  float spec = pow(max(dot(nrm, halfVec), 0.0), 64.0);
  baseColor += vec3(1.0) * spec * sunIntensity * 0.35;

  // ── 6. Simple hemispheric ambient term ──
  float hemi = nrm.y * 0.5 + 0.5;
  vec3 ambient = mix(vec3(0.15, 0.15, 0.2), vec3(0.9, 0.95, 1.0), hemi);
  baseColor *= ambient * 0.6 + 0.5;

  // ── 7. Alpha: slightly more transparent near shore for natural blending ──
  float alpha = mix(0.65, 0.88, depthFactor);

  gl_FragColor = vec4(baseColor, alpha);
}
`;

// ─── Public API ────────────────────────────────────────────────────

export interface WaterShaderOptions {
  isNight?: boolean;
}

const SHADER_NAME = 'scoopWater';

let _registered = false;

function ensureRegistered() {
  if (_registered) return;
  Effect.ShadersStore[SHADER_NAME + 'VertexShader'] = VERTEX;
  Effect.ShadersStore[SHADER_NAME + 'FragmentShader'] = FRAGMENT;
  _registered = true;
}

/**
 * Create the water ShaderMaterial.
 *
 * The material is **self-animating** — it reads `performance.now()` and the
 * active camera position during every `onBind` call, so no external per-frame
 * update is required.
 */
export function createWaterShaderMaterial(
  scene: Scene,
  name: string,
  opts: WaterShaderOptions = {},
): ShaderMaterial {
  ensureRegistered();

  const isNight = opts.isNight ?? false;

  const mat = new ShaderMaterial(name, scene, SHADER_NAME, {
    attributes: ['position', 'normal', 'uv', 'edgeDist'],
    uniforms: [
      'worldViewProjection',
      'world',
      'time',
      'cameraPosition',
      'waterDeepColor',
      'waterShallowColor',
      'foamColor',
      'skyColor',
      'sunIntensity',
      'sunDirection',
    ],
    needAlphaBlending: true,
  });

  mat.backFaceCulling = true;
  mat.alphaMode = 2; // ALPHA_COMBINE

  // Colour palette
  if (isNight) {
    mat.setColor3('waterDeepColor', new Color3(0.04, 0.12, 0.28));
    mat.setColor3('waterShallowColor', new Color3(0.08, 0.22, 0.35));
    mat.setColor3('foamColor', new Color3(0.55, 0.6, 0.65));
    mat.setColor3('skyColor', new Color3(0.05, 0.08, 0.18));
    mat.setFloat('sunIntensity', 0.15);
    mat.setVector3('sunDirection', new Vector3(0.3, -0.8, 0.5));
  } else {
    mat.setColor3('waterDeepColor', new Color3(0.06, 0.28, 0.58));
    mat.setColor3('waterShallowColor', new Color3(0.15, 0.48, 0.72));
    mat.setColor3('foamColor', new Color3(0.9, 0.95, 1.0));
    mat.setColor3('skyColor', new Color3(0.55, 0.75, 0.95));
    mat.setFloat('sunIntensity', 0.8);
    mat.setVector3('sunDirection', new Vector3(-0.4, -0.7, -0.5));
  }

  mat.setFloat('time', 0);
  mat.setVector3('cameraPosition', Vector3.Zero());

  // ── Self-animating: push time + camera every bind (like the terrain shader) ──
  const t0 = performance.now();
  mat.onBind = () => {
    const effect = mat.getEffect();
    if (!effect) return;
    const t = (performance.now() - t0) / 1000 * WATER_SPEED;
    effect.setFloat('time', t);
    const cam = scene.activeCamera;
    if (cam) {
      const pos = cam.globalPosition;
      effect.setFloat3('cameraPosition', pos.x, pos.y, pos.z);
    }
  };

  return mat;
}
