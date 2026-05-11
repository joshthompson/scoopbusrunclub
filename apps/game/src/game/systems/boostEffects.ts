/**
 * Boost visual effects system.
 *
 * Provides four layered effects that activate during scoop-boost:
 *  1. Camera shake — high-frequency positional noise
 *  2. Speed-line particles — streaks at screen edges (layer-masked per camera)
 *  3. Radial motion blur — PostProcess (camera-scoped, so per-player in split-screen)
 *  4. Depth of field — PostProcess (desktop-only)
 *
 * All effects are self-contained and attached to a single camera, meaning in
 * local multiplayer each player's boost only affects their own viewport.
 */

import {
	Color4,
	DynamicTexture,
	type FreeCamera,
	MeshBuilder,
	ParticleSystem,
	PostProcess,
	type Scene,
	Effect,
	TransformNode,
	Vector3,
} from '@babylonjs/core'

// ---------- Constants ----------

/** Shake intensity in metres (positional offset). */
const SHAKE_INTENSITY = 0.12
/** Shake frequency — how fast it oscillates (rad/s). Multiple frequencies overlay. */
const SHAKE_FREQ_1 = 47
const SHAKE_FREQ_2 = 73
const SHAKE_FREQ_3 = 31

/** Radial blur strength at full boost (0 = no blur, higher = more samples spread). */
const RADIAL_BLUR_STRENGTH = 0.012
/** Number of blur samples (higher = smoother but costlier). */
const RADIAL_BLUR_SAMPLES = 8

/** DoF focal length when boosting (metres). */
const DOF_FOCAL_LENGTH = 15
/** DoF aperture — lower = shallower. */
const DOF_APERTURE = 0.06

// ---------- Shader sources ----------

const RADIAL_BLUR_FRAGMENT = `
precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float strength;
uniform float centerX;
uniform float centerY;

void main() {
  vec2 center = vec2(centerX, centerY);
  vec2 dir = vUV - center;
  float dist = length(dir);
  vec2 normDir = dir / max(dist, 0.001);

  vec4 color = vec4(0.0);
  float total = 0.0;
  const int SAMPLES = ${RADIAL_BLUR_SAMPLES};
  for (int i = 0; i < SAMPLES; i++) {
    float t = float(i) / float(SAMPLES - 1) - 0.5;
    float weight = 1.0 - abs(t);
    vec2 offset = normDir * t * strength * dist;
    color += texture2D(textureSampler, vUV + offset) * weight;
    total += weight;
  }
  gl_FragColor = color / total;
}
`

const DOF_FRAGMENT = `
precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float blurAmount;

void main() {
  vec4 color = vec4(0.0);
  float total = 0.0;
  const int SAMPLES = 6;
  
  // Simple disc blur weighted by distance from center (screen-space approximation)
  vec2 center = vec2(0.5, 0.5);
  float distFromCenter = length(vUV - center);
  // More blur at edges (far from focal center)
  float edgeBlur = blurAmount * smoothstep(0.15, 0.6, distFromCenter);
  
  for (int i = 0; i < SAMPLES; i++) {
    float angle = float(i) * 6.2832 / float(SAMPLES);
    vec2 offset = vec2(cos(angle), sin(angle)) * edgeBlur;
    float weight = 1.0;
    color += texture2D(textureSampler, vUV + offset) * weight;
    total += weight;
  }
  // Add centre sample
  color += texture2D(textureSampler, vUV) * float(SAMPLES);
  total += float(SAMPLES);
  
  gl_FragColor = color / total;
}
`

// ---------- Types ----------

export interface BoostEffectsInstance {
	/** Call every frame with the current boost normalised intensity (0–1). */
	update(dt: number, boostIntensity: number, elapsed: number): void
	/** Dispose all GPU resources. */
	dispose(): void
}

// ---------- Public API ----------

export interface CreateBoostEffectsParams {
	scene: Scene
	camera: FreeCamera
	/** Layer mask bit for this player's exclusive particles (e.g. 0x10000000 for P1). */
	particleLayerMask?: number
	/** Whether to enable the DoF effect (desktop-only gate). */
	enableDepthOfField?: boolean
}

/**
 * Create all boost effects for a single camera.
 * Returns an instance with an update() method to call each frame.
 */
export function createBoostEffects(
	params: CreateBoostEffectsParams,
): BoostEffectsInstance {
	const {
		scene,
		camera,
		particleLayerMask,
		enableDepthOfField = false,
	} = params

	// --- Speed-line particles ---
	const speedLines = createSpeedLineParticles(scene, camera, particleLayerMask)

	// --- Radial motion blur PostProcess ---
	const radialBlur = createRadialBlurPostProcess(scene, camera)

	// --- Depth of field PostProcess (optional) ---
	const dof = enableDepthOfField ? createDofPostProcess(scene, camera) : null

	// Smoothed intensity for fade-in/out
	let smoothIntensity = 0
	const FADE_IN_SPEED = 6
	const FADE_OUT_SPEED = 3

	return {
		update(dt: number, boostIntensity: number, elapsed: number) {
			// Smooth the intensity to avoid pop
			const target = Math.max(0, Math.min(1, boostIntensity))
			if (target > smoothIntensity) {
				smoothIntensity +=
					(target - smoothIntensity) * Math.min(1, FADE_IN_SPEED * dt)
			} else {
				smoothIntensity +=
					(target - smoothIntensity) * Math.min(1, FADE_OUT_SPEED * dt)
			}
			if (smoothIntensity < 0.001) smoothIntensity = 0

			// 1. Camera shake — applied as position offset AFTER camera system positions it
			applyShake(camera, smoothIntensity, elapsed)

			// 2. Speed lines
			if (smoothIntensity > 0.01 && !speedLines.isStarted()) {
				speedLines.start()
			} else if (smoothIntensity <= 0.01 && speedLines.isStarted()) {
				speedLines.stop()
			}
			speedLines.emitRate = 120 * smoothIntensity
			speedLines.minEmitPower = 8 + 16 * smoothIntensity
			speedLines.maxEmitPower = 14 + 26 * smoothIntensity

			// 3. Radial blur
			if (radialBlur) {
				radialBlur.updateEffect(smoothIntensity)
			}

			// 4. DoF
			if (dof) {
				dof.updateEffect(smoothIntensity)
			}
		},

		dispose() {
			speedLines.dispose()
			radialBlur?.dispose()
			dof?.dispose()
		},
	}
}

// ---------- Camera shake ----------

function applyShake(
	camera: FreeCamera,
	intensity: number,
	elapsed: number,
): void {
	if (intensity <= 0) return

	const amp = SHAKE_INTENSITY * intensity
	// Overlay multiple sine waves at incommensurate frequencies for organic noise
	const ox =
		amp *
		(Math.sin(elapsed * SHAKE_FREQ_1) * 0.5 +
			Math.sin(elapsed * SHAKE_FREQ_2 + 1.3) * 0.3 +
			Math.sin(elapsed * SHAKE_FREQ_3 + 2.7) * 0.2)
	const oy =
		amp *
		(Math.sin(elapsed * SHAKE_FREQ_2 + 0.7) * 0.5 +
			Math.sin(elapsed * SHAKE_FREQ_3 + 1.9) * 0.3 +
			Math.sin(elapsed * SHAKE_FREQ_1 + 3.1) * 0.2)

	camera.position.x += ox
	camera.position.y += oy
}

// ---------- Speed-line particles ----------

function createSpeedLineParticles(
	scene: Scene,
	camera: FreeCamera,
	layerMask?: number,
): ParticleSystem {
	const ps = new ParticleSystem('boostSpeedLines', 300, scene)

	// Create a small streak texture procedurally
	const tex = new DynamicTexture(
		'speedLineTex',
		{ width: 8, height: 64 },
		scene,
		false,
	)
	const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
	const grad = ctx.createLinearGradient(0, 0, 0, 64)
	grad.addColorStop(0, 'rgba(255,255,255,0)')
	grad.addColorStop(0.3, 'rgba(255,255,255,0.9)')
	grad.addColorStop(0.7, 'rgba(255,255,255,0.9)')
	grad.addColorStop(1, 'rgba(255,255,255,0)')
	ctx.fillStyle = grad
	ctx.fillRect(0, 0, 8, 64)
	tex.update()
	ps.particleTexture = tex

	// Emitter placed AHEAD of camera (toward the bus) — particles spawn there
	// and fly back toward / past the camera, giving the "speed from bus" look.
	const emitter = MeshBuilder.CreateBox(
		'speedLineEmitter',
		{ size: 0.01 },
		scene,
	)
	emitter.isVisible = false
	emitter.parent = camera
	// Place emitter well ahead in camera's forward direction (+Z in camera space)
	emitter.position = new Vector3(0, 0, 12)
	ps.emitter = emitter

	// Spawn in a ring around that forward point (peripheral, not centre).
	// In camera local space: X = left/right, Y = up/down, Z = forward.
	// Ring radius ensures lines appear at edges, not overlapping the bus.
	ps.minEmitBox = new Vector3(-6, -4, -3)
	ps.maxEmitBox = new Vector3(6, 4, 3)

	// Particles fly TOWARD camera (negative Z in camera space = backward)
	ps.direction1 = new Vector3(-0.3, -0.2, -20)
	ps.direction2 = new Vector3(0.3, 0.2, -28)

	// Colour: bright white streaks
	ps.color1 = new Color4(1, 1, 1, 0.7)
	ps.color2 = new Color4(0.85, 0.92, 1, 0.5)
	ps.colorDead = new Color4(1, 1, 1, 0)

	ps.minSize = 0.06
	ps.maxSize = 0.14
	ps.minScaleY = 14
	ps.maxScaleY = 28
	ps.minLifeTime = 0.15
	ps.maxLifeTime = 0.4
	ps.emitRate = 0
	ps.blendMode = ParticleSystem.BLENDMODE_ADD
	ps.minEmitPower = 12
	ps.maxEmitPower = 22
	ps.updateSpeed = 0.016
	ps.gravity = new Vector3(0, 0, 0)

	// Billboard mode: stretched (so they look like streaks flying past)
	ps.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED

	// Local space so everything stays relative to camera orientation
	ps.isLocal = true

	// Layer mask for per-player exclusivity in split-screen
	if (layerMask !== undefined) {
		ps.layerMask = layerMask
		emitter.layerMask = layerMask
	}

	ps.stop() // dormant until boost
	return ps
}

// ---------- Radial motion blur PostProcess ----------

interface RadialBlurHandle {
	updateEffect(intensity: number): void
	dispose(): void
}

function createRadialBlurPostProcess(
	scene: Scene,
	camera: FreeCamera,
): RadialBlurHandle {
	const shaderName = 'boostRadialBlur_' + camera.name

	// Register shader inline
	Effect.ShadersStore[shaderName + 'FragmentShader'] = RADIAL_BLUR_FRAGMENT

	const pp = new PostProcess(
		shaderName,
		shaderName,
		['strength', 'centerX', 'centerY'], // uniforms
		null, // samplers
		0.75, // ratio (render at 75% res for perf)
		camera,
		0, // sampling mode (NEAREST)
		scene.getEngine(),
		false,
	)

	let currentStrength = 0

	pp.onApply = (effect) => {
		effect.setFloat('strength', currentStrength)
		effect.setFloat('centerX', 0.5)
		effect.setFloat('centerY', 0.5)
	}

	// Start disabled
	pp.activate(camera)

	return {
		updateEffect(intensity: number) {
			currentStrength = RADIAL_BLUR_STRENGTH * intensity
			// When zero, the shader still runs but is essentially pass-through
			// (all samples converge on the same point). For perf we could detach,
			// but the overhead at strength=0 is minimal with 8 samples.
		},
		dispose() {
			pp.dispose()
		},
	}
}

// ---------- Depth of field PostProcess (desktop only) ----------

interface DofHandle {
	updateEffect(intensity: number): void
	dispose(): void
}

function createDofPostProcess(scene: Scene, camera: FreeCamera): DofHandle {
	const shaderName = 'boostDof_' + camera.name

	Effect.ShadersStore[shaderName + 'FragmentShader'] = DOF_FRAGMENT

	const pp = new PostProcess(
		shaderName,
		shaderName,
		['blurAmount'],
		null,
		0.5, // half-res for perf on this pass
		camera,
		0,
		scene.getEngine(),
		false,
	)

	let currentBlur = 0

	pp.onApply = (effect) => {
		effect.setFloat('blurAmount', currentBlur)
	}

	pp.activate(camera)

	return {
		updateEffect(intensity: number) {
			// Ramp blur amount from 0 to max
			currentBlur = DOF_APERTURE * intensity * 0.01
		},
		dispose() {
			pp.dispose()
		},
	}
}
