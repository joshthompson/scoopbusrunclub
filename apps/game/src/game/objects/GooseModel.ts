/**
 * Blocky Canada Goose model.
 *
 * Low-poly box-based geometry matching the corgi style.
 * Black head/neck, white chinstrap, brown-tan body, white breast,
 * dark legs with flat webbed feet, black beak.
 *
 * Total height (ground → head top) ≈ 0.70 m standing.
 * Forward direction is +Z (beak faces +Z).
 */
import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';

// ── Canada Goose colour palette ────────────────────────────

const BLACK = new Color3(0.08, 0.08, 0.08);
const NECK_BLACK = new Color3(0.10, 0.10, 0.10);
const CHINSTRAP = new Color3(0.95, 0.95, 0.95);       // white chinstrap
const BREAST_WHITE = new Color3(0.92, 0.90, 0.86);    // warm white breast
const BODY_BROWN = new Color3(0.55, 0.45, 0.35);      // brown-tan body
const WING_DARK = new Color3(0.38, 0.32, 0.26);       // darker brown wings
const TAIL_BLACK = new Color3(0.12, 0.12, 0.12);
const BEAK_COLOR = new Color3(0.12, 0.12, 0.12);      // dark beak
const LEG_COLOR = new Color3(0.22, 0.22, 0.22);       // dark grey legs
const EYE_COLOR = new Color3(0.05, 0.05, 0.05);
const EYE_RING = new Color3(0.92, 0.90, 0.85);        // faint white ring around eye

// ── Dimensions (metres) ───────────────────────────────────

// Legs
const LEG_H = 0.12;
const LEG_W = 0.03;
const LEG_D = 0.03;
const FOOT_W = 0.06;
const FOOT_D = 0.08;
const FOOT_H = 0.015;

// Body (oval-ish barrel, wider than tall)
const BODY_W = 0.20;
const BODY_H = 0.18;
const BODY_D = 0.32;
const BODY_Y = LEG_H + BODY_H / 2;    // centre of body

// Breast (white patch on front underside)
const BREAST_H = 0.10;
const BREAST_D = 0.14;

// Wings (thin slabs on sides)
const WING_W = 0.03;
const WING_H = 0.14;
const WING_D = 0.28;

// Neck (vertical column rising from front of body)
const NECK_W = 0.07;
const NECK_H = 0.22;
const NECK_D = 0.07;
const NECK_BOTTOM = LEG_H + BODY_H * 0.6;    // starts partway up body
const NECK_Y = NECK_BOTTOM + NECK_H / 2;
const NECK_Z = BODY_D / 2 - 0.02;             // front of body

// Head
const HEAD_W = 0.08;
const HEAD_H = 0.07;
const HEAD_D = 0.09;
const HEAD_Y = NECK_BOTTOM + NECK_H + HEAD_H / 2 - 0.01;
const HEAD_Z = NECK_Z + 0.01;

// Chinstrap (white patch wrapping under head)
const CHIN_W = HEAD_W + 0.005;
const CHIN_H = 0.035;
const CHIN_D = HEAD_D + 0.005;

// Beak
const BEAK_W = 0.04;
const BEAK_H = 0.025;
const BEAK_D = 0.05;

// Tail (short, angled up from rear)
const TAIL_W = 0.10;
const TAIL_H = 0.04;
const TAIL_D = 0.08;

// ───────────────────────────────────────────────────────────

export interface GooseModelResult {
  root: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
  neck: TransformNode;
}

export function createGooseModel(
  scene: Scene,
  id: number,
): GooseModelResult {
  const root = new TransformNode(`goose_${id}`, scene);

  // ── Materials ──
  const blackMat = makeMat(`gBlack_${id}`, BLACK, scene);
  const neckMat = makeMat(`gNeck_${id}`, NECK_BLACK, scene);
  const chinMat = makeMat(`gChin_${id}`, CHINSTRAP, scene);
  const breastMat = makeMat(`gBreast_${id}`, BREAST_WHITE, scene);
  const bodyMat = makeMat(`gBody_${id}`, BODY_BROWN, scene);
  const wingMat = makeMat(`gWing_${id}`, WING_DARK, scene);
  const tailMat = makeMat(`gTail_${id}`, TAIL_BLACK, scene);
  const beakMat = makeMat(`gBeak_${id}`, BEAK_COLOR, scene);
  const legMat = makeMat(`gLeg_${id}`, LEG_COLOR, scene);
  const eyeMat = makeMat(`gEye_${id}`, EYE_COLOR, scene);
  const eyeRingMat = makeMat(`gEyeR_${id}`, EYE_RING, scene);

  // ═══════════════════════════════════════
  //  Body
  // ═══════════════════════════════════════
  const body = MeshBuilder.CreateBox(`gBody_${id}`, {
    width: BODY_W, height: BODY_H, depth: BODY_D,
  }, scene);
  body.material = bodyMat;
  body.position.y = BODY_Y;
  body.parent = root;

  // White breast patch (front-underside)
  const breast = MeshBuilder.CreateBox(`gBreast_${id}`, {
    width: BODY_W - 0.04, height: BREAST_H, depth: BREAST_D,
  }, scene);
  breast.material = breastMat;
  breast.position.set(0, LEG_H + BREAST_H / 2 + 0.01, BODY_D / 2 - BREAST_D / 2 - 0.02);
  breast.parent = root;

  // ═══════════════════════════════════════
  //  Wings (darker slabs on each side)
  // ═══════════════════════════════════════
  for (const side of [-1, 1]) {
    const wing = MeshBuilder.CreateBox(`gWing${side > 0 ? 'R' : 'L'}_${id}`, {
      width: WING_W, height: WING_H, depth: WING_D,
    }, scene);
    wing.material = wingMat;
    wing.position.set(side * (BODY_W / 2 + WING_W / 2 - 0.005), BODY_Y + 0.01, -0.01);
    wing.parent = root;
  }

  // ═══════════════════════════════════════
  //  Tail
  // ═══════════════════════════════════════
  const tail = MeshBuilder.CreateBox(`gTail_${id}`, {
    width: TAIL_W, height: TAIL_H, depth: TAIL_D,
  }, scene);
  tail.material = tailMat;
  tail.position.set(0, BODY_Y + BODY_H / 2 - 0.02, -BODY_D / 2 - TAIL_D / 2 + 0.03);
  tail.rotation.x = -0.3; // angled slightly upward
  tail.parent = root;

  // ═══════════════════════════════════════
  //  Neck (black column)
  // ═══════════════════════════════════════
  const neckPivot = new TransformNode(`gNeckPiv_${id}`, scene);
  neckPivot.position = new Vector3(0, NECK_BOTTOM, NECK_Z);
  neckPivot.parent = root;

  const neck = MeshBuilder.CreateBox(`gNeck_${id}`, {
    width: NECK_W, height: NECK_H, depth: NECK_D,
  }, scene);
  neck.material = neckMat;
  neck.position.y = NECK_H / 2;
  neck.parent = neckPivot;

  // ═══════════════════════════════════════
  //  Head (black, on top of neck)
  // ═══════════════════════════════════════
  const headLocalY = NECK_H + HEAD_H / 2 - 0.01;
  const headLocalZ = 0.01;

  const head = MeshBuilder.CreateBox(`gHead_${id}`, {
    width: HEAD_W, height: HEAD_H, depth: HEAD_D,
  }, scene);
  head.material = blackMat;
  head.position.set(0, headLocalY, headLocalZ);
  head.parent = neckPivot;

  // Chinstrap (white patch on sides/underside of head)
  const chin = MeshBuilder.CreateBox(`gChin_${id}`, {
    width: CHIN_W, height: CHIN_H, depth: CHIN_D,
  }, scene);
  chin.material = chinMat;
  chin.position.set(0, headLocalY - HEAD_H / 2 + CHIN_H / 2 + 0.005, headLocalZ);
  chin.parent = neckPivot;

  // Eyes (small dark dots on head sides)
  const eyeSize = 0.018;
  const eyeY = headLocalY + 0.01;
  for (const side of [-1, 1]) {
    // White eye ring
    const ring = MeshBuilder.CreateBox(`gEyeR${side > 0 ? 'R' : 'L'}_${id}`, {
      width: 0.01, height: eyeSize + 0.006, depth: eyeSize + 0.006,
    }, scene);
    ring.material = eyeRingMat;
    ring.position.set(side * (HEAD_W / 2 + 0.001), eyeY, headLocalZ + HEAD_D / 4);
    ring.parent = neckPivot;

    // Eye
    const eye = MeshBuilder.CreateBox(`gEye${side > 0 ? 'R' : 'L'}_${id}`, {
      width: 0.012, height: eyeSize, depth: eyeSize,
    }, scene);
    eye.material = eyeMat;
    eye.position.set(side * (HEAD_W / 2 + 0.002), eyeY, headLocalZ + HEAD_D / 4);
    eye.parent = neckPivot;
  }

  // ═══════════════════════════════════════
  //  Beak (dark, extends forward from head)
  // ═══════════════════════════════════════
  const beak = MeshBuilder.CreateBox(`gBeak_${id}`, {
    width: BEAK_W, height: BEAK_H, depth: BEAK_D,
  }, scene);
  beak.material = beakMat;
  beak.position.set(0, headLocalY - 0.015, headLocalZ + HEAD_D / 2 + BEAK_D / 2 - 0.01);
  beak.parent = neckPivot;

  // ═══════════════════════════════════════
  //  Legs (with webbed feet)
  // ═══════════════════════════════════════
  const legX = 0.05;
  const legZ = BODY_D * 0.1;

  const leftLegPivot = new TransformNode(`gLLegPiv_${id}`, scene);
  leftLegPivot.position = new Vector3(-legX, LEG_H, legZ);
  leftLegPivot.parent = root;

  const leftLeg = MeshBuilder.CreateBox(`gLLeg_${id}`, {
    width: LEG_W, height: LEG_H, depth: LEG_D,
  }, scene);
  leftLeg.material = legMat;
  leftLeg.position.y = -LEG_H / 2;
  leftLeg.parent = leftLegPivot;

  // Left foot (webbed)
  const leftFoot = MeshBuilder.CreateBox(`gLFoot_${id}`, {
    width: FOOT_W, height: FOOT_H, depth: FOOT_D,
  }, scene);
  leftFoot.material = legMat;
  leftFoot.position.set(0, -LEG_H + FOOT_H / 2, FOOT_D / 4);
  leftFoot.parent = leftLegPivot;

  const rightLegPivot = new TransformNode(`gRLegPiv_${id}`, scene);
  rightLegPivot.position = new Vector3(legX, LEG_H, legZ);
  rightLegPivot.parent = root;

  const rightLeg = MeshBuilder.CreateBox(`gRLeg_${id}`, {
    width: LEG_W, height: LEG_H, depth: LEG_D,
  }, scene);
  rightLeg.material = legMat;
  rightLeg.position.y = -LEG_H / 2;
  rightLeg.parent = rightLegPivot;

  // Right foot (webbed)
  const rightFoot = MeshBuilder.CreateBox(`gRFoot_${id}`, {
    width: FOOT_W, height: FOOT_H, depth: FOOT_D,
  }, scene);
  rightFoot.material = legMat;
  rightFoot.position.set(0, -LEG_H + FOOT_H / 2, FOOT_D / 4);
  rightFoot.parent = rightLegPivot;

  return {
    root,
    leftLeg: leftLegPivot,
    rightLeg: rightLegPivot,
    neck: neckPivot,
  };
}

// ── Animation poses ─────────────────────────────────────────

/** Walking animation — legs swing, neck bobs. */
export function poseGooseWalking(model: GooseModelResult, phase: number) {
  const swing = Math.sin(phase) * 0.5;
  model.leftLeg.rotation.x = swing;
  model.rightLeg.rotation.x = -swing;
  // Subtle neck bob
  model.neck.rotation.x = Math.sin(phase * 2) * 0.08;
}

/** Idle/standing pose — legs straight, neck slightly tilted. */
export function poseGooseIdle(model: GooseModelResult) {
  model.leftLeg.rotation.x = 0;
  model.rightLeg.rotation.x = 0;
  model.neck.rotation.x = 0;
}

/** Sitting pose — legs tucked, neck upright. */
export function poseGooseSitting(model: GooseModelResult) {
  model.leftLeg.rotation.x = -1.2;
  model.rightLeg.rotation.x = -1.2;
  model.neck.rotation.x = -0.1;
  // Lower body slightly when sitting
}

/** Fleeing pose — fast leg swing, neck stretched forward. */
export function poseGooseFleeing(model: GooseModelResult, phase: number) {
  const swing = Math.sin(phase) * 0.7;
  model.leftLeg.rotation.x = swing;
  model.rightLeg.rotation.x = -swing;
  // Neck stretched forward for running
  model.neck.rotation.x = 0.35;
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
