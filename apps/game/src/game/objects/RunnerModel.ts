import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';

// ---------- Skin tones ----------
const SKIN_TONES: Color3[] = [
  new Color3(0.96, 0.84, 0.72), // light
  new Color3(0.87, 0.72, 0.53), // medium-light
  new Color3(0.76, 0.57, 0.38), // medium
  new Color3(0.55, 0.38, 0.24), // medium-dark
  new Color3(0.38, 0.25, 0.16), // dark
];

export interface RunnerModelResult {
  /** Root node – position/rotate this to move the runner */
  root: TransformNode;
  /** Pivot nodes for animation */
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
}

/**
 * Create a blocky runner character.
 *
 * Body proportions (Minecraft-ish, total ~1.6 m):
 *   Head:  0.3 × 0.3 × 0.3
 *   Torso: 0.4 × 0.5 × 0.25
 *   Arm:   0.15 × 0.55 × 0.15  (upper = sleeve, lower = skin)
 *   Leg:   0.18 × 0.55 × 0.18  (upper = shorts, lower = skin)
 *
 * The root origin is at foot level (y = 0).
 */
export function createRunnerModel(
  scene: Scene,
  id: number,
  tshirtColor: Color3,
): RunnerModelResult {
  const root = new TransformNode(`runner_${id}`, scene);

  // Pick a random skin tone
  const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];

  // --- Materials ---
  const shirtMat = makeMat(`rShirt_${id}`, tshirtColor, scene);
  const skinMat = makeMat(`rSkin_${id}`, skin, scene);
  const shortsMat = makeMat(`rShorts_${id}`, new Color3(0.08, 0.08, 0.08), scene);
  const hairMat = makeMat(`rHair_${id}`, new Color3(
    0.15 + Math.random() * 0.25,
    0.1 + Math.random() * 0.15,
    0.05 + Math.random() * 0.1,
  ), scene);

  // ═══════════════════════════════════════
  // Torso (t-shirt)
  // ═══════════════════════════════════════
  const torsoH = 0.5;
  const torsoW = 0.4;
  const torsoD = 0.25;
  const torsoY = 0.55 + torsoH / 2; // legs are 0.55 tall

  const torso = MeshBuilder.CreateBox(`rTorso_${id}`, {
    width: torsoW, height: torsoH, depth: torsoD,
  }, scene);
  torso.material = shirtMat;
  torso.position.y = torsoY;
  torso.parent = root;

  // ═══════════════════════════════════════
  // Head
  // ═══════════════════════════════════════
  const headSize = 0.3;
  const headY = torsoY + torsoH / 2 + headSize / 2 + 0.02;

  const head = MeshBuilder.CreateBox(`rHead_${id}`, {
    width: headSize, height: headSize, depth: headSize,
  }, scene);
  head.material = skinMat;
  head.position.y = headY;
  head.parent = root;

  // Hair on top of head
  const hair = MeshBuilder.CreateBox(`rHair_${id}`, {
    width: headSize + 0.02, height: 0.08, depth: headSize + 0.02,
  }, scene);
  hair.material = hairMat;
  hair.position.y = headY + headSize / 2 + 0.02;
  hair.parent = root;

  // ═══════════════════════════════════════
  // Arms (pivoted at shoulder)
  // ═══════════════════════════════════════
  const armW = 0.15;
  const armH = 0.55;
  const armD = 0.15;
  const shoulderY = torsoY + torsoH / 2 - 0.05; // just below top of torso
  const shoulderX = torsoW / 2 + armW / 2 + 0.01;

  // Each arm has a pivot at the shoulder, arms hang down from there.
  // The arm mesh is offset so the pivot is at the top.

  const leftArmPivot = new TransformNode(`rLArmPiv_${id}`, scene);
  leftArmPivot.position = new Vector3(-shoulderX, shoulderY, 0);
  leftArmPivot.parent = root;

  const leftArmUpper = MeshBuilder.CreateBox(`rLArmUp_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  leftArmUpper.material = shirtMat; // sleeve
  leftArmUpper.position.y = -armH / 4;
  leftArmUpper.parent = leftArmPivot;

  const leftArmLower = MeshBuilder.CreateBox(`rLArmLo_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  leftArmLower.material = skinMat;
  leftArmLower.position.y = -armH * 3 / 4;
  leftArmLower.parent = leftArmPivot;

  const rightArmPivot = new TransformNode(`rRArmPiv_${id}`, scene);
  rightArmPivot.position = new Vector3(shoulderX, shoulderY, 0);
  rightArmPivot.parent = root;

  const rightArmUpper = MeshBuilder.CreateBox(`rRArmUp_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  rightArmUpper.material = shirtMat;
  rightArmUpper.position.y = -armH / 4;
  rightArmUpper.parent = rightArmPivot;

  const rightArmLower = MeshBuilder.CreateBox(`rRArmLo_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  rightArmLower.material = skinMat;
  rightArmLower.position.y = -armH * 3 / 4;
  rightArmLower.parent = rightArmPivot;

  // ═══════════════════════════════════════
  // Legs (pivoted at hip)
  // ═══════════════════════════════════════
  const legW = 0.18;
  const legH = 0.55;
  const legD = 0.18;
  const hipY = torsoY - torsoH / 2; // bottom of torso
  const hipX = 0.1; // slight spread

  const leftLegPivot = new TransformNode(`rLLegPiv_${id}`, scene);
  leftLegPivot.position = new Vector3(-hipX, hipY, 0);
  leftLegPivot.parent = root;

  const leftLegUpper = MeshBuilder.CreateBox(`rLLegUp_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  leftLegUpper.material = shortsMat; // shorts
  leftLegUpper.position.y = -legH / 4;
  leftLegUpper.parent = leftLegPivot;

  const leftLegLower = MeshBuilder.CreateBox(`rLLegLo_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  leftLegLower.material = skinMat;
  leftLegLower.position.y = -legH * 3 / 4;
  leftLegLower.parent = leftLegPivot;

  const rightLegPivot = new TransformNode(`rRLegPiv_${id}`, scene);
  rightLegPivot.position = new Vector3(hipX, hipY, 0);
  rightLegPivot.parent = root;

  const rightLegUpper = MeshBuilder.CreateBox(`rRLegUp_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  rightLegUpper.material = shortsMat;
  rightLegUpper.position.y = -legH / 4;
  rightLegUpper.parent = rightLegPivot;

  const rightLegLower = MeshBuilder.CreateBox(`rRLegLo_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  rightLegLower.material = skinMat;
  rightLegLower.position.y = -legH * 3 / 4;
  rightLegLower.parent = rightLegPivot;

  return {
    root,
    leftArm: leftArmPivot,
    rightArm: rightArmPivot,
    leftLeg: leftLegPivot,
    rightLeg: rightLegPivot,
  };
}

// ── Pose helpers (call each frame) ──

/** Swing arms and legs in a running motion. `phase` advances with time × speed. */
export function poseRunning(
  model: RunnerModelResult,
  phase: number,
): void {
  const swing = Math.sin(phase) * 0.7; // ±0.7 rad ≈ ±40°
  model.leftArm.rotation.x = swing;
  model.rightArm.rotation.x = -swing;
  model.leftLeg.rotation.x = -swing;
  model.rightLeg.rotation.x = swing;
  // Reset Z rotation (no splay)
  model.leftArm.rotation.z = 0;
  model.rightArm.rotation.z = 0;
  model.leftLeg.rotation.z = 0;
  model.rightLeg.rotation.z = 0;
}

/** Arms and legs flail randomly while airborne. */
export function poseFlailing(
  model: RunnerModelResult,
  phase: number,
): void {
  model.leftArm.rotation.x = Math.sin(phase * 3.7) * 1.5;
  model.leftArm.rotation.z = Math.sin(phase * 2.3) * 0.8 - 0.4;
  model.rightArm.rotation.x = Math.sin(phase * 4.1 + 1) * 1.5;
  model.rightArm.rotation.z = -Math.sin(phase * 2.7 + 0.5) * 0.8 + 0.4;
  model.leftLeg.rotation.x = Math.sin(phase * 3.2 + 2) * 1.0;
  model.leftLeg.rotation.z = Math.sin(phase * 1.9) * 0.3;
  model.rightLeg.rotation.x = Math.sin(phase * 3.6 + 0.7) * 1.0;
  model.rightLeg.rotation.z = -Math.sin(phase * 2.1 + 1.3) * 0.3;
}

/** Sitting pose: legs forward and flat, arms resting at sides. */
export function poseSitting(
  model: RunnerModelResult,
): void {
  // Legs straight out in front (rotated -90° around X = forward)
  model.leftLeg.rotation.x = -Math.PI / 2;
  model.leftLeg.rotation.z = -0.1; // slight outward splay
  model.rightLeg.rotation.x = -Math.PI / 2;
  model.rightLeg.rotation.z = 0.1;
  // Arms resting at sides, slightly back
  model.leftArm.rotation.x = 0.2;
  model.leftArm.rotation.z = -0.15;
  model.rightArm.rotation.x = 0.2;
  model.rightArm.rotation.z = 0.15;
}

/** Neutral standing pose. */
export function poseStanding(
  model: RunnerModelResult,
): void {
  model.leftArm.rotation.x = 0;
  model.leftArm.rotation.z = 0;
  model.rightArm.rotation.x = 0;
  model.rightArm.rotation.z = 0;
  model.leftLeg.rotation.x = 0;
  model.leftLeg.rotation.z = 0;
  model.rightLeg.rotation.x = 0;
  model.rightLeg.rotation.z = 0;
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
