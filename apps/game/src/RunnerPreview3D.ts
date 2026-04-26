/**
 * Renders a 3D preview of a runner using BabylonJS into a 2D data URL.
 * A single off-screen engine is shared and reused for all previews.
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
import { createRunnerModel, poseStanding } from './game/objects/RunnerModel';
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
  const cam = new FreeCamera('prevCam', new Vector3(0, 1.25 * hs, 1.4), scene);
  cam.setTarget(new Vector3(0, 1.05 * hs, 0));
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
  const cam = new FreeCamera('prevCam', new Vector3(0, 0.55, 1.0), scene);
  cam.setTarget(new Vector3(0, 0.35, 0));
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
