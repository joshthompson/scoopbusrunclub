import {
  Color4,
  DynamicTexture,
  MeshBuilder,
  ParticleSystem,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

/**
 * Create a flame particle system attached to the back of the local bus.
 * Starts stopped — call start() when a runner is scooped.
 */
export function createExhaustFlames(scene: Scene, busMesh: TransformNode): ParticleSystem {
  const ps = new ParticleSystem('exhaustFlames', 300, scene);

  const flameTex = new DynamicTexture('flameTex', 64, scene, false);
  const ctx = flameTex.getContext() as unknown as CanvasRenderingContext2D;
  const cx = 32, cy = 32, r = 30;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,180,50,0.8)');
  grad.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  flameTex.update();
  ps.particleTexture = flameTex;

  // Emitter at the rear-underside of the bus (exhaust pipe area)
  const emitter = MeshBuilder.CreateBox('exhaustEmitter', { size: 0.01 }, scene);
  emitter.isVisible = false;
  emitter.position = new Vector3(0.5, 0.65, -3.8);
  emitter.parent = busMesh;
  ps.emitter = emitter;

  // Emit backward and slightly up
  ps.direction1 = new Vector3(-0.3, 0.5, -2);
  ps.direction2 = new Vector3(0.3, 1.0, -3);
  ps.minEmitBox = new Vector3(-0.15, -0.05, 0);
  ps.maxEmitBox = new Vector3(0.15, 0.05, 0);

  // Flame appearance
  ps.color1 = new Color4(1, 0.6, 0.1, 1);     // orange-yellow
  ps.color2 = new Color4(1, 0.2, 0.0, 1);     // red-orange
  ps.colorDead = new Color4(0.2, 0.2, 0.2, 0); // transparent smoke

  ps.minSize = 0.3;
  ps.maxSize = 0.9;
  ps.minLifeTime = 0.15;
  ps.maxLifeTime = 0.45;
  ps.emitRate = 300;
  ps.blendMode = ParticleSystem.BLENDMODE_ONEONE;
  ps.minEmitPower = 3;
  ps.maxEmitPower = 6;
  ps.updateSpeed = 0.02;
  ps.gravity = new Vector3(0, 2, 0); // flames rise

  ps.stop(); // dormant until scoop
  return ps;
}

/**
 * Create exhaust flames for a remote bus (identical config, different parent).
 */
export function createExhaustFlamesForBus(scene: Scene, busRoot: TransformNode): ParticleSystem {
  const ps = new ParticleSystem('exhaustFlames_remote', 300, scene);

  const flameTex = new DynamicTexture('flameTex_r', 64, scene, false);
  const ctx = flameTex.getContext() as unknown as CanvasRenderingContext2D;
  const cx = 32, cy = 32, r = 30;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,180,50,0.8)');
  grad.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  flameTex.update();
  ps.particleTexture = flameTex;

  const emitter = MeshBuilder.CreateBox('exhaustEmitter_r', { size: 0.01 }, scene);
  emitter.isVisible = false;
  emitter.position = new Vector3(0.5, 0.65, -3.8);
  emitter.parent = busRoot;
  ps.emitter = emitter;

  ps.direction1 = new Vector3(-0.3, 0.5, -2);
  ps.direction2 = new Vector3(0.3, 1.0, -3);
  ps.minEmitBox = new Vector3(-0.15, -0.05, 0);
  ps.maxEmitBox = new Vector3(0.15, 0.05, 0);

  ps.color1 = new Color4(1, 0.6, 0.1, 1);
  ps.color2 = new Color4(1, 0.2, 0.0, 1);
  ps.colorDead = new Color4(0.2, 0.2, 0.2, 0);

  ps.minSize = 0.3;
  ps.maxSize = 0.9;
  ps.minLifeTime = 0.15;
  ps.maxLifeTime = 0.45;
  ps.emitRate = 300;
  ps.blendMode = ParticleSystem.BLENDMODE_ONEONE;
  ps.minEmitPower = 3;
  ps.maxEmitPower = 6;
  ps.updateSpeed = 0.02;
  ps.gravity = new Vector3(0, 2, 0);

  ps.stop();
  return ps;
}

/**
 * Create water-wake particle systems (left + right V-wake + centre churn).
 * Attached to the bus; dormant until the bus enters water.
 */
export function createWaterWake(scene: Scene, busMesh: TransformNode): ParticleSystem[] {
  // Shared circle texture for spray droplets
  const tex = new DynamicTexture('wakeTex', 64, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const cx = 32, cy = 32, r = 30;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(245,248,255,0.7)');
  grad.addColorStop(1, 'rgba(235,240,250,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  tex.update();

  const systems: ParticleSystem[] = [];

  // --- Left and right V-wake sprays ---
  for (const side of [-1, 1]) {
    const ps = new ParticleSystem(`wake_${side < 0 ? 'L' : 'R'}`, 200, scene);
    ps.particleTexture = tex;

    const emitter = MeshBuilder.CreateBox(`wakeEmit_${side}`, { size: 0.01 }, scene);
    emitter.isVisible = false;
    emitter.position = new Vector3(side * 1.2, 0.3, -3.5);
    emitter.parent = busMesh;
    ps.emitter = emitter;

    // Spray outward and backward in a V pattern
    ps.direction1 = new Vector3(side * 1.5, 0.2, -2);
    ps.direction2 = new Vector3(side * 3.0, 0.6, -4);
    ps.minEmitBox = new Vector3(-0.1, 0, -0.1);
    ps.maxEmitBox = new Vector3(0.1, 0.1, 0.1);

    ps.color1 = new Color4(1.0, 1.0, 1.0, 0.85);
    ps.color2 = new Color4(0.95, 0.97, 1.0, 0.6);
    ps.colorDead = new Color4(0.95, 0.97, 1.0, 0);

    ps.minSize = 0.15;
    ps.maxSize = 0.6;
    ps.minLifeTime = 0.4;
    ps.maxLifeTime = 1.2;
    ps.emitRate = 120;
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    ps.minEmitPower = 2;
    ps.maxEmitPower = 5;
    ps.updateSpeed = 0.02;
    ps.gravity = new Vector3(0, -2, 0);

    ps.stop();
    systems.push(ps);
  }

  // --- Centre churn / foam behind the bus ---
  const centre = new ParticleSystem('wake_centre', 150, scene);
  centre.particleTexture = tex;

  const cEmitter = MeshBuilder.CreateBox('wakeEmit_C', { size: 0.01 }, scene);
  cEmitter.isVisible = false;
  cEmitter.position = new Vector3(0, 0.2, -3.8);
  cEmitter.parent = busMesh;
  centre.emitter = cEmitter;

  centre.direction1 = new Vector3(-0.5, 0.3, -1);
  centre.direction2 = new Vector3(0.5, 0.8, -2.5);
  centre.minEmitBox = new Vector3(-0.6, 0, -0.2);
  centre.maxEmitBox = new Vector3(0.6, 0.1, 0.2);

  centre.color1 = new Color4(1.0, 1.0, 1.0, 0.75);
  centre.color2 = new Color4(0.95, 0.97, 1.0, 0.5);
  centre.colorDead = new Color4(0.97, 0.98, 1.0, 0);

  centre.minSize = 0.3;
  centre.maxSize = 1.0;
  centre.minLifeTime = 0.6;
  centre.maxLifeTime = 1.8;
  centre.emitRate = 80;
  centre.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  centre.minEmitPower = 1;
  centre.maxEmitPower = 3;
  centre.updateSpeed = 0.02;
  centre.gravity = new Vector3(0, -1, 0);

  centre.stop();
  systems.push(centre);

  return systems;
}

/** Start or stop the water wake. */
export function setWaterWakeActive(wake: ParticleSystem[], currentlyActive: boolean, active: boolean): boolean {
  if (active === currentlyActive) return currentlyActive;
  for (const ps of wake) {
    if (active) ps.start();
    else ps.stop();
  }
  return active;
}

/** Scale wake intensity with bus speed so it grows at higher speeds. */
export function updateWakeIntensity(wake: ParticleSystem[], active: boolean, busSpeed: number): void {
  if (!active) return;
  const speedKmh = Math.abs(busSpeed) * 3.6;
  const t = Math.min(1, speedKmh / 60); // 0 at rest, 1 at 60 km/h+
  // Side V-wake sprays (indices 0, 1)
  for (let i = 0; i < 2 && i < wake.length; i++) {
    wake[i].emitRate = 30 + t * 150;
    wake[i].minEmitPower = 1 + t * 3;
    wake[i].maxEmitPower = 2 + t * 5;
  }
  // Centre churn (index 2)
  if (wake.length > 2) {
    wake[2].emitRate = 20 + t * 100;
    wake[2].minEmitPower = 0.5 + t * 2;
    wake[2].maxEmitPower = 1 + t * 3;
  }
}

/**
 * Create dirt-spray particle systems (left + right rear tyres).
 * Attached to the bus; dormant until the bus drives on dirt paths.
 */
export function createDirtSpray(scene: Scene, busMesh: TransformNode): ParticleSystem[] {
  const tex = new DynamicTexture('dirtTex', 64, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const cx = 32, cy = 32, r = 30;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(200,170,120,0.45)');
  grad.addColorStop(0.5, 'rgba(190,160,110,0.3)');
  grad.addColorStop(1, 'rgba(180,150,100,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  tex.update();

  const systems: ParticleSystem[] = [];

  // Left and right rear-tyre sprays
  for (const side of [-1, 1]) {
    const ps = new ParticleSystem(`dirt_${side < 0 ? 'L' : 'R'}`, 150, scene);
    ps.particleTexture = tex;

    const emitter = MeshBuilder.CreateBox(`dirtEmit_${side}`, { size: 0.01 }, scene);
    emitter.isVisible = false;
    emitter.position = new Vector3(side * 1.0, 0.2, -3.2);
    emitter.parent = busMesh;
    ps.emitter = emitter;

    // Gentle puff upward — particles stay roughly where generated
    ps.direction1 = new Vector3(side * 0.3, 0.2, -0.1);
    ps.direction2 = new Vector3(side * 0.6, 0.6, 0.1);
    ps.minEmitBox = new Vector3(-0.2, 0, -0.2);
    ps.maxEmitBox = new Vector3(0.2, 0.1, 0.2);

    ps.color1 = new Color4(0.78, 0.65, 0.45, 0.35);  // light tan
    ps.color2 = new Color4(0.72, 0.58, 0.38, 0.25);  // soft sandy brown
    ps.colorDead = new Color4(0.7, 0.55, 0.35, 0);   // fade out

    ps.minSize = 0.2;
    ps.maxSize = 0.6;
    ps.minLifeTime = 0.4;
    ps.maxLifeTime = 1.0;
    ps.emitRate = 60;
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    ps.minEmitPower = 0.3;
    ps.maxEmitPower = 0.8;
    ps.updateSpeed = 0.02;
    ps.gravity = new Vector3(0, -0.5, 0); // very gentle settle

    ps.stop();
    systems.push(ps);
  }

  return systems;
}

/** Start or stop the dirt spray. */
export function setDirtSprayActive(spray: ParticleSystem[], currentlyActive: boolean, active: boolean): boolean {
  if (active === currentlyActive) return currentlyActive;
  for (const ps of spray) {
    if (active) ps.start();
    else ps.stop();
  }
  return active;
}

/** Scale dirt spray intensity with bus speed. */
export function updateDirtSprayIntensity(spray: ParticleSystem[], active: boolean, busSpeed: number): void {
  if (!active) return;
  const speedKmh = Math.abs(busSpeed) * 3.6;
  const t = Math.min(1, speedKmh / 50); // 0 at rest, 1 at 50 km/h+
  for (const ps of spray) {
    ps.emitRate = 15 + t * 60;
    ps.minEmitPower = 0.2 + t * 0.3;
    ps.maxEmitPower = 0.5 + t * 0.6;
    ps.minSize = 0.15 + t * 0.15;
    ps.maxSize = 0.35 + t * 0.4;
  }
}
