/**
 * Renders a 3D preview of a runner using BabylonJS into a 2D data URL,
 * and provides a live animated preview for hover states.
 * A single off-screen engine is shared and reused for all static previews.
 * A second engine powers the live hover animation.
 */
import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  HemisphericLight,
  Color3,
  Color4,
} from '@babylonjs/core';
import { createRunnerModel, poseStanding, poseWaving } from './game/objects/RunnerModel';
import type { RunnerModelResult } from './game/objects/RunnerModel';
import { createCorgiModel } from './game/objects/CorgiModel';
import type { RunnerAppearance } from './game/characters';

const PREVIEW_WIDTH = 160;
const PREVIEW_HEIGHT = 200;

let sharedCanvas: HTMLCanvasElement | null = null;
let sharedEngine: Engine | null = null;

function getSharedEngine(): { canvas: HTMLCanvasElement; engine: Engine } {
  if (sharedCanvas && sharedEngine) {
    return { canvas: sharedCanvas, engine: sharedEngine };
  }
  sharedCanvas = document.createElement('canvas');
  sharedCanvas.width = PREVIEW_WIDTH;
  sharedCanvas.height = PREVIEW_HEIGHT;
  sharedEngine = new Engine(sharedCanvas, true, {
    preserveDrawingBuffer: true,
    stencil: false,
    disableWebGL2Support: false,
    powerPreference: 'low-power',
  }, false);
  sharedEngine.renderEvenInBackground = true;
  return { canvas: sharedCanvas, engine: sharedEngine };
}

/**
 * Render a runner model with the given appearance to a data URL image.
 * Camera is positioned to show head and shoulders.
 */
export function renderRunnerPreview(appearance: RunnerAppearance): Promise<string> {
  const { canvas, engine } = getSharedEngine();

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0); // transparent

  // Camera: positioned to frame head + shoulders, adjusted for height scale
  const hs = appearance.heightScale ?? 1;
  const cam = new FreeCamera('prevCam', new Vector3(0, 1.25 * hs, 1.6), scene);
  cam.setTarget(new Vector3(0, 1.0 * hs, 0));
  cam.minZ = 0.1;

  // Lighting
  const light = new HemisphericLight('prevLight', new Vector3(0.3, 1, 0.5), scene);
  light.intensity = 1.2;
  light.groundColor = new Color3(0.3, 0.3, 0.35);

  // Build runner
  const model = createRunnerModel(scene, 999, new Color3(0.5, 0.5, 0.5), appearance);
  poseStanding(model);
  // Slight angle so you see depth
  model.root.rotation.y = 0.3;

  return new Promise<string>((resolve) => {
    scene.executeWhenReady(() => {
      // Render one frame with proper frame wrapping
      engine.beginFrame();
      scene.render();
      engine.endFrame();

      const dataUrl = canvas.toDataURL('image/png');
      scene.dispose();
      resolve(dataUrl);
    });
  });
}

/** Cache of presetId → data URL so we only render once per preset. */
const previewCache = new Map<string, string>();

export async function getRunnerPreviewUrl(presetId: string, appearance: RunnerAppearance): Promise<string> {
  const cached = previewCache.get(presetId);
  if (cached) return cached;
  const url = await renderRunnerPreview(appearance);
  previewCache.set(presetId, url);
  return url;
}

/**
 * Render a corgi model to a data URL image.
 * Camera is positioned lower to frame the smaller dog.
 */
export function renderCorgiPreview(): Promise<string> {
  const { canvas, engine } = getSharedEngine();

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);

  // Camera: lower + closer to frame the corgi (~0.8 m tall with 1.25× scale)
  const cam = new FreeCamera('prevCam', new Vector3(0, 0.55, 1.1), scene);
  cam.setTarget(new Vector3(0, 0.3, 0));
  cam.minZ = 0.1;

  // Lighting
  const light = new HemisphericLight('prevLight', new Vector3(0.3, 1, 0.5), scene);
  light.intensity = 1.2;
  light.groundColor = new Color3(0.3, 0.3, 0.35);

  // Build corgi
  const model = createCorgiModel(scene, 998);
  poseStanding(model);
  model.root.rotation.y = 0.3;

  return new Promise<string>((resolve) => {
    scene.executeWhenReady(() => {
      engine.beginFrame();
      scene.render();
      engine.endFrame();

      const dataUrl = canvas.toDataURL('image/png');
      scene.dispose();
      resolve(dataUrl);
    });
  });
}

export async function getCorgiPreviewUrl(presetId: string): Promise<string> {
  const cached = previewCache.get(presetId);
  if (cached) return cached;
  const url = await renderCorgiPreview();
  previewCache.set(presetId, url);
  return url;
}

/** Clear the preview cache (e.g. if presets change). */
export function clearRunnerPreviewCache(): void {
  previewCache.clear();
}

// ────────────────────────────────────────────────────────────
// Live animated preview (single shared engine, moved between tiles)
// ────────────────────────────────────────────────────────────

const LIVE_WIDTH = 160;
const LIVE_HEIGHT = 200;

let liveCanvas: HTMLCanvasElement | null = null;
let liveEngine: Engine | null = null;
let liveScene: Scene | null = null;
let liveModel: RunnerModelResult | null = null;
let liveRafId = 0;
let liveStartTime = 0;

function getLiveEngine(): { canvas: HTMLCanvasElement; engine: Engine } {
  if (liveCanvas && liveEngine) return { canvas: liveCanvas, engine: liveEngine };
  liveCanvas = document.createElement('canvas');
  liveCanvas.width = LIVE_WIDTH;
  liveCanvas.height = LIVE_HEIGHT;
  liveCanvas.style.width = '100%';
  liveCanvas.style.height = '100%';
  liveCanvas.style.objectFit = 'contain';
  liveCanvas.style.pointerEvents = 'none';
  liveEngine = new Engine(liveCanvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    disableWebGL2Support: false,
    powerPreference: 'low-power',
  }, false);
  liveEngine.renderEvenInBackground = true;
  return { canvas: liveCanvas, engine: liveEngine };
}

function liveLoop() {
  if (!liveEngine || !liveScene || !liveModel) return;
  const elapsed = (performance.now() - liveStartTime) / 1000;

  // Smoothly ramp wave t from 0→1 over 0.4 s, then hold at a cycling mid-wave
  const rampT = Math.min(elapsed / 0.4, 1);
  // Wave oscillation (t stays in 0.3–0.7 range = fully raised region)
  const waveT = 0.3 + 0.2 * Math.sin(elapsed * 3) * rampT + 0.2 * rampT;
  // Run-phase drives the oscillation on the waving arm
  const runPhase = elapsed * 6;

  poseWaving(liveModel, runPhase, Math.min(rampT, waveT), 1);

  liveEngine.beginFrame();
  liveScene.render();
  liveEngine.endFrame();

  liveRafId = requestAnimationFrame(liveLoop);
}

/**
 * Start a live animated wave preview inside `container`.
 * The shared live canvas is moved into the container.
 * Returns a cleanup function (called on mouse-leave).
 */
export function startLiveWavePreview(
  container: HTMLElement,
  appearance: RunnerAppearance | null,  // null = corgi
): () => void {
  // Tear down any existing live preview
  stopLivePreviewInternal();

  const { canvas, engine } = getLiveEngine();
  container.appendChild(canvas);

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);

  let camPos: Vector3;
  let camTarget: Vector3;

  if (appearance) {
    // Human runner — same camera as static preview
    const hs = appearance.heightScale ?? 1;
    camPos = new Vector3(0, 1.25 * hs, 1.6);
    camTarget = new Vector3(0, 1.0 * hs, 0);
  } else {
    // Corgi — same camera as static corgi preview
    camPos = new Vector3(0, 0.55, 1.1);
    camTarget = new Vector3(0, 0.3, 0);
  }

  const cam = new FreeCamera('liveCam', camPos, scene);
  cam.setTarget(camTarget);
  cam.minZ = 0.1;

  const light = new HemisphericLight('liveLight', new Vector3(0.3, 1, 0.5), scene);
  light.intensity = 1.2;
  light.groundColor = new Color3(0.3, 0.3, 0.35);

  const model = appearance
    ? createRunnerModel(scene, 997, new Color3(0.5, 0.5, 0.5), appearance)
    : createCorgiModel(scene, 997);
  poseStanding(model);
  model.root.rotation.y = 0.3;

  liveScene = scene;
  liveModel = model;
  liveStartTime = performance.now();

  // Start render loop
  liveRafId = requestAnimationFrame(liveLoop);

  // Return cleanup
  return () => stopLivePreviewInternal();
}

function stopLivePreviewInternal(): void {
  if (liveRafId) {
    cancelAnimationFrame(liveRafId);
    liveRafId = 0;
  }
  if (liveScene) {
    liveScene.dispose();
    liveScene = null;
  }
  liveModel = null;
  // Remove canvas from its current parent (if any)
  if (liveCanvas?.parentElement) {
    liveCanvas.parentElement.removeChild(liveCanvas);
  }
}
