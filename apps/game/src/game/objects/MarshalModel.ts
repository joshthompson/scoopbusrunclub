import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
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

/** Fluorescent / hi-vis yellow-green */
const HI_VIS_YELLOW = new Color3(0.85, 1.0, 0.0);
/** Reflective silver-grey stripe accent */
const REFLECTIVE_STRIPE = new Color3(0.78, 0.78, 0.78);

export interface MarshalModelResult {
  root: TransformNode;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
}

/**
 * Create a blocky marshal character — identical proportions to a runner
 * but wearing a fluorescent yellow safety vest with reflective stripes.
 *
 * Body proportions match RunnerModel (Minecraft-ish, total ~1.6 m).
 * The vest covers the torso and upper-arm sleeves.
 */
export function createMarshalModel(
  scene: Scene,
  id: number,
): MarshalModelResult {
  const root = new TransformNode(`marshal_${id}`, scene);

  const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];

  // --- Materials ---
  const vestMat = makeMat(`mVest_${id}`, HI_VIS_YELLOW, scene);
  vestMat.emissiveColor = new Color3(0.25, 0.3, 0.0); // slight glow so it pops
  const stripeMat = makeMat(`mStripe_${id}`, REFLECTIVE_STRIPE, scene);
  stripeMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
  const skinMat = makeMat(`mSkin_${id}`, skin, scene);
  const shortsMat = makeMat(`mShorts_${id}`, new Color3(0.08, 0.08, 0.08), scene);
  const hairMat = makeMat(`mHair_${id}`, new Color3(
    0.15 + Math.random() * 0.25,
    0.1 + Math.random() * 0.15,
    0.05 + Math.random() * 0.1,
  ), scene);

  // ═══════════════════════════════════════
  // Torso (hi-vis vest)
  // ═══════════════════════════════════════
  const torsoH = 0.5;
  const torsoW = 0.4;
  const torsoD = 0.25;
  const torsoY = 0.55 + torsoH / 2;

  const torso = MeshBuilder.CreateBox(`mTorso_${id}`, {
    width: torsoW, height: torsoH, depth: torsoD,
  }, scene);
  torso.material = vestMat;
  torso.position.y = torsoY;
  torso.parent = root;

  // Reflective stripe across the chest (thin box overlaid on torso)
  const stripe = MeshBuilder.CreateBox(`mStripe_${id}`, {
    width: torsoW + 0.02, height: 0.06, depth: torsoD + 0.02,
  }, scene);
  stripe.material = stripeMat;
  stripe.position.y = torsoY - 0.05;
  stripe.parent = root;

  // Second stripe lower
  const stripe2 = MeshBuilder.CreateBox(`mStripe2_${id}`, {
    width: torsoW + 0.02, height: 0.06, depth: torsoD + 0.02,
  }, scene);
  stripe2.material = stripeMat;
  stripe2.position.y = torsoY + 0.12;
  stripe2.parent = root;

  // ═══════════════════════════════════════
  // Head
  // ═══════════════════════════════════════
  const headSize = 0.3;
  const headY = torsoY + torsoH / 2 + headSize / 2 + 0.02;

  const head = MeshBuilder.CreateBox(`mHead_${id}`, {
    width: headSize, height: headSize, depth: headSize,
  }, scene);
  head.material = skinMat;
  head.position.y = headY;
  head.parent = root;

  // Hair
  const hair = MeshBuilder.CreateBox(`mHairBox_${id}`, {
    width: headSize + 0.02, height: 0.08, depth: headSize + 0.02,
  }, scene);
  hair.material = hairMat;
  hair.position.y = headY + headSize / 2 + 0.02;
  hair.parent = root;

  // ═══════════════════════════════════════
  // Arms (vest sleeves on upper arm)
  // ═══════════════════════════════════════
  const armW = 0.15;
  const armH = 0.55;
  const armD = 0.15;
  const shoulderY = torsoY + torsoH / 2 - 0.05;
  const shoulderX = torsoW / 2 + armW / 2 + 0.01;

  const leftArmPivot = new TransformNode(`mLArmPiv_${id}`, scene);
  leftArmPivot.position = new Vector3(-shoulderX, shoulderY, 0);
  leftArmPivot.parent = root;

  const leftArmUpper = MeshBuilder.CreateBox(`mLArmUp_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  leftArmUpper.material = vestMat; // vest sleeve
  leftArmUpper.position.y = -armH / 4;
  leftArmUpper.parent = leftArmPivot;

  const leftArmLower = MeshBuilder.CreateBox(`mLArmLo_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  leftArmLower.material = skinMat;
  leftArmLower.position.y = -armH * 3 / 4;
  leftArmLower.parent = leftArmPivot;

  const rightArmPivot = new TransformNode(`mRArmPiv_${id}`, scene);
  rightArmPivot.position = new Vector3(shoulderX, shoulderY, 0);
  rightArmPivot.parent = root;

  const rightArmUpper = MeshBuilder.CreateBox(`mRArmUp_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  rightArmUpper.material = vestMat; // vest sleeve
  rightArmUpper.position.y = -armH / 4;
  rightArmUpper.parent = rightArmPivot;

  const rightArmLower = MeshBuilder.CreateBox(`mRArmLo_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  rightArmLower.material = skinMat;
  rightArmLower.position.y = -armH * 3 / 4;
  rightArmLower.parent = rightArmPivot;

  // ═══════════════════════════════════════
  // Legs
  // ═══════════════════════════════════════
  const legW = 0.18;
  const legH = 0.55;
  const legD = 0.18;
  const hipY = torsoY - torsoH / 2;
  const hipX = 0.1;

  const leftLegPivot = new TransformNode(`mLLegPiv_${id}`, scene);
  leftLegPivot.position = new Vector3(-hipX, hipY, 0);
  leftLegPivot.parent = root;

  const leftLegUpper = MeshBuilder.CreateBox(`mLLegUp_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  leftLegUpper.material = shortsMat;
  leftLegUpper.position.y = -legH / 4;
  leftLegUpper.parent = leftLegPivot;

  const leftLegLower = MeshBuilder.CreateBox(`mLLegLo_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  leftLegLower.material = skinMat;
  leftLegLower.position.y = -legH * 3 / 4;
  leftLegLower.parent = leftLegPivot;

  const rightLegPivot = new TransformNode(`mRLegPiv_${id}`, scene);
  rightLegPivot.position = new Vector3(hipX, hipY, 0);
  rightLegPivot.parent = root;

  const rightLegUpper = MeshBuilder.CreateBox(`mRLegUp_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  rightLegUpper.material = shortsMat;
  rightLegUpper.position.y = -legH / 4;
  rightLegUpper.parent = rightLegPivot;

  const rightLegLower = MeshBuilder.CreateBox(`mRLegLo_${id}`, {
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

// ── Pose helpers ──

/**
 * Animated cheering pose: one arm points forward (directing runners),
 * the other arm waves / claps encouragingly. Legs stay planted.
 * `phase` should advance with real time.
 */
export function poseCheering(
  model: MarshalModelResult,
  phase: number,
): void {
  // Legs: standing still, very slight weight shift
  model.leftLeg.rotation.x = 0;
  model.leftLeg.rotation.z = 0;
  model.rightLeg.rotation.x = 0;
  model.rightLeg.rotation.z = 0;

  // Right arm: pointing forward (extended, slight oscillation)
  model.rightArm.rotation.x = -1.3 + Math.sin(phase * 1.5) * 0.1;
  model.rightArm.rotation.z = 0.15;

  // Left arm: waving / cheering
  const waveCycle = Math.sin(phase * 4.0);
  model.leftArm.rotation.x = -2.2 + waveCycle * 0.5;
  model.leftArm.rotation.z = -0.3 + Math.sin(phase * 3.2) * 0.2;
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
