/**
 * Blocky Pembroke Welsh Corgi model.
 *
 * Returns the same RunnerModelResult interface as the human runner so all
 * existing pose / animation helpers (poseRunning, poseSitting, etc.) work
 * unmodified.
 *
 * Mapping:
 *   leftArm / rightArm  →  front-left / front-right leg
 *   leftLeg / rightLeg   →  back-left  / back-right  leg
 *
 * Total height (ground → ear tip) ≈ 0.64 m  ≈ 40 % of the default human
 * runner (~1.6 m).
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
import type { RunnerModelResult } from './RunnerModel';

// ── Corgi Pembroke colour palette ──────────────────────────

const ORANGE = new Color3(0.91, 0.60, 0.24);          // warm sable/orange
const WHITE = new Color3(0.94, 0.92, 0.88);           // warm white
const NOSE_BLACK = new Color3(0.07, 0.07, 0.07);
const EYE_DARK = new Color3(0.16, 0.10, 0.04);
const INNER_EAR = new Color3(0.95, 0.78, 0.70);       // pinkish inner-ear

// ── Dimensions (metres) ───────────────────────────────────

// Legs
const LEG_H = 0.13;
const LEG_W = 0.06;
const LEG_D = 0.06;

// Body (long barrel)
const BODY_W = 0.22;
const BODY_H = 0.17;
const BODY_D = 0.38;
const BODY_BOTTOM = LEG_H;                // body sits on top of legs
const BODY_Y = BODY_BOTTOM + BODY_H / 2;  // 0.215
const BODY_TOP = BODY_BOTTOM + BODY_H;    // 0.30

// Head
const HEAD_W = 0.17;
const HEAD_H = 0.16;
const HEAD_D = 0.15;
const HEAD_Y = BODY_TOP + HEAD_H / 2 + 0.01;   // 0.39
const HEAD_Z = BODY_D / 2 + 0.01;               // 0.20

// Snout
const SNOUT_W = 0.11;
const SNOUT_H = 0.08;
const SNOUT_D = 0.10;
const SNOUT_Y = HEAD_Y - 0.02;
const SNOUT_Z = HEAD_Z + HEAD_D / 2 + SNOUT_D / 2 - 0.02;

// Ears (tall + pointy → 0.64 m total)
const EAR_W = 0.065;
const EAR_H = 0.17;
const EAR_D = 0.05;

// Nose
const NOSE_W = 0.04;
const NOSE_H = 0.035;
const NOSE_D = 0.02;

// Tail (Pembroke stub)
const TAIL_W = 0.06;
const TAIL_H = 0.07;
const TAIL_D = 0.04;

// ───────────────────────────────────────────────────────────

export function createCorgiModel(
  scene: Scene,
  id: number,
): RunnerModelResult {
  const root = new TransformNode(`corgi_${id}`, scene);

  // ── Materials ──
  const orangeMat = makeMat(`cOrange_${id}`, ORANGE, scene);
  const whiteMat = makeMat(`cWhite_${id}`, WHITE, scene);
  const noseMat = makeMat(`cNose_${id}`, NOSE_BLACK, scene);
  const eyeMat = makeMat(`cEye_${id}`, EYE_DARK, scene);
  const innerEarMat = makeMat(`cInnerEar_${id}`, INNER_EAR, scene);
  const shoeMat = makeMat(`cShoe_${id}`, new Color3(1, 1, 1), scene);

  // ═══════════════════════════════════════
  //  Body
  // ═══════════════════════════════════════
  const body = MeshBuilder.CreateBox(`cBody_${id}`, {
    width: BODY_W, height: BODY_H, depth: BODY_D,
  }, scene);
  body.material = orangeMat;
  body.position.y = BODY_Y;
  body.parent = root;

  // White belly strip (underneath)
  const bellyH = 0.04;
  const belly = MeshBuilder.CreateBox(`cBelly_${id}`, {
    width: BODY_W - 0.04, height: bellyH, depth: BODY_D - 0.06,
  }, scene);
  belly.material = whiteMat;
  belly.position.set(0, BODY_BOTTOM + bellyH / 2 + 0.005, 0);
  belly.parent = root;

  // White chest patch (front of body, extends upward)
  const chestH = 0.12;
  const chest = MeshBuilder.CreateBox(`cChest_${id}`, {
    width: BODY_W - 0.04, height: chestH, depth: 0.08,
  }, scene);
  chest.material = whiteMat;
  chest.position.set(0, BODY_Y - BODY_H / 2 + chestH / 2 + 0.01, BODY_D / 2 - 0.02);
  chest.parent = root;

  // ═══════════════════════════════════════
  //  Head
  // ═══════════════════════════════════════
  const head = MeshBuilder.CreateBox(`cHead_${id}`, {
    width: HEAD_W, height: HEAD_H, depth: HEAD_D,
  }, scene);
  head.material = orangeMat;
  head.position.set(0, HEAD_Y, HEAD_Z);
  head.parent = root;

  // White face blaze (vertical stripe down front of face)
  const blazeH = HEAD_H - 0.02;
  const blaze = MeshBuilder.CreateBox(`cBlaze_${id}`, {
    width: 0.07, height: blazeH, depth: 0.02,
  }, scene);
  blaze.material = whiteMat;
  blaze.position.set(0, HEAD_Y + 0.01, HEAD_Z + HEAD_D / 2 + 0.001);
  blaze.parent = root;

  // Snout (white, extends forward)
  const snout = MeshBuilder.CreateBox(`cSnout_${id}`, {
    width: SNOUT_W, height: SNOUT_H, depth: SNOUT_D,
  }, scene);
  snout.material = whiteMat;
  snout.position.set(0, SNOUT_Y, SNOUT_Z);
  snout.parent = root;

  // Nose (black, on tip of snout)
  const nose = MeshBuilder.CreateBox(`cNose_${id}`, {
    width: NOSE_W, height: NOSE_H, depth: NOSE_D,
  }, scene);
  nose.material = noseMat;
  nose.position.set(
    0,
    SNOUT_Y + SNOUT_H / 2 - NOSE_H / 2 - 0.005,
    SNOUT_Z + SNOUT_D / 2 + 0.001,
  );
  nose.parent = root;

  // Eyes
  const eyeSize = 0.03;
  const eyeY = HEAD_Y + 0.025;
  const eyeX = 0.055;
  const eyeZ = HEAD_Z + HEAD_D / 2 + 0.001;
  for (const side of [-1, 1]) {
    const eye = MeshBuilder.CreateBox(`cEye${side > 0 ? 'R' : 'L'}_${id}`, {
      width: eyeSize, height: eyeSize, depth: 0.02,
    }, scene);
    eye.material = eyeMat;
    eye.position.set(side * eyeX, eyeY, eyeZ);
    eye.parent = root;
  }

  // ═══════════════════════════════════════
  //  Ears (tall, erect — characteristic corgi ears)
  // ═══════════════════════════════════════
  const headTop = HEAD_Y + HEAD_H / 2;
  const earX = HEAD_W / 2 - EAR_W / 2 + 0.01;

  for (const side of [-1, 1]) {
    // Outer ear (orange)
    const ear = MeshBuilder.CreateBox(`cEar${side > 0 ? 'R' : 'L'}_${id}`, {
      width: EAR_W, height: EAR_H, depth: EAR_D,
    }, scene);
    ear.material = orangeMat;
    ear.position.set(side * earX, headTop + EAR_H / 2, HEAD_Z - 0.02);
    ear.parent = root;

    // Inner ear (pinkish, on the front face)
    const innerH = EAR_H - 0.04;
    const inner = MeshBuilder.CreateBox(`cEarIn${side > 0 ? 'R' : 'L'}_${id}`, {
      width: EAR_W - 0.02, height: innerH, depth: 0.015,
    }, scene);
    inner.material = innerEarMat;
    inner.position.set(
      side * earX,
      headTop + innerH / 2 + 0.01,
      HEAD_Z - 0.02 + EAR_D / 2 + 0.001,
    );
    inner.parent = root;
  }

  // ═══════════════════════════════════════
  //  Tail (Pembroke stub, angled upward)
  // ═══════════════════════════════════════
  const tail = MeshBuilder.CreateBox(`cTail_${id}`, {
    width: TAIL_W, height: TAIL_H, depth: TAIL_D,
  }, scene);
  tail.material = orangeMat;
  tail.position.set(0, BODY_TOP - 0.01, -BODY_D / 2 - TAIL_D / 2 + 0.01);
  tail.parent = root;

  // ═══════════════════════════════════════
  //  Front legs → leftArm / rightArm pivots
  // ═══════════════════════════════════════
  const frontLegZ = BODY_D / 2 - LEG_D / 2 - 0.02;
  const legX = BODY_W / 2 - LEG_W / 2 - 0.01;   // ±0.08

  const leftArmPivot = new TransformNode(`cLFrontPiv_${id}`, scene);
  leftArmPivot.position = new Vector3(-legX, LEG_H, frontLegZ);
  leftArmPivot.parent = root;

  const leftFrontLeg = MeshBuilder.CreateBox(`cLFront_${id}`, {
    width: LEG_W, height: LEG_H, depth: LEG_D,
  }, scene);
  leftFrontLeg.material = whiteMat;
  leftFrontLeg.position.y = -LEG_H / 2;
  leftFrontLeg.parent = leftArmPivot;

  const rightArmPivot = new TransformNode(`cRFrontPiv_${id}`, scene);
  rightArmPivot.position = new Vector3(legX, LEG_H, frontLegZ);
  rightArmPivot.parent = root;

  const rightFrontLeg = MeshBuilder.CreateBox(`cRFront_${id}`, {
    width: LEG_W, height: LEG_H, depth: LEG_D,
  }, scene);
  rightFrontLeg.material = whiteMat;
  rightFrontLeg.position.y = -LEG_H / 2;
  rightFrontLeg.parent = rightArmPivot;

  // ═══════════════════════════════════════
  //  Back legs → leftLeg / rightLeg pivots
  // ═══════════════════════════════════════
  const backLegZ = -BODY_D / 2 + LEG_D / 2 + 0.02;

  const leftLegPivot = new TransformNode(`cLBackPiv_${id}`, scene);
  leftLegPivot.position = new Vector3(-legX, LEG_H, backLegZ);
  leftLegPivot.parent = root;

  const leftBackLeg = MeshBuilder.CreateBox(`cLBack_${id}`, {
    width: LEG_W, height: LEG_H, depth: LEG_D,
  }, scene);
  leftBackLeg.material = orangeMat;
  leftBackLeg.position.y = -LEG_H / 2;
  leftBackLeg.parent = leftLegPivot;

  const rightLegPivot = new TransformNode(`cRBackPiv_${id}`, scene);
  rightLegPivot.position = new Vector3(legX, LEG_H, backLegZ);
  rightLegPivot.parent = root;

  const rightBackLeg = MeshBuilder.CreateBox(`cRBack_${id}`, {
    width: LEG_W, height: LEG_H, depth: LEG_D,
  }, scene);
  rightBackLeg.material = orangeMat;
  rightBackLeg.position.y = -LEG_H / 2;
  rightBackLeg.parent = rightLegPivot;

  // ═══════════════════════════════════════
  //  Shoes (hidden by default – needed for RunnerModelResult interface)
  // ═══════════════════════════════════════
  const leftShoe = MeshBuilder.CreateBox(`cLShoe_${id}`, {
    width: LEG_W, height: 0.02, depth: LEG_D * 1.3,
  }, scene);
  leftShoe.material = shoeMat;
  leftShoe.position.set(0, -LEG_H - 0.01, LEG_D * 0.15);
  leftShoe.parent = leftLegPivot;
  leftShoe.setEnabled(false);

  const rightShoe = MeshBuilder.CreateBox(`cRShoe_${id}`, {
    width: LEG_W, height: 0.02, depth: LEG_D * 1.3,
  }, scene);
  rightShoe.material = shoeMat;
  rightShoe.position.set(0, -LEG_H - 0.01, LEG_D * 0.15);
  rightShoe.parent = rightLegPivot;
  rightShoe.setEnabled(false);

  // Scale up 25% from base corgi size
  root.scaling = new Vector3(1.25, 1.25, 1.25);

  // Base scale for power-up compatibility
  (root as any).__baseScale = 1.25;

  return {
    root,
    leftArm: leftArmPivot,
    rightArm: rightArmPivot,
    leftLeg: leftLegPivot,
    rightLeg: rightLegPivot,
    leftShoe,
    rightShoe,
  };
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
