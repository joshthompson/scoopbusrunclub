import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';
import type { RunnerAppearance } from '../characters';
import type { PreviewRunnerRole } from '../systems/previewRunners';
import {
  hexToColor3,
  resolveColor,
  SKIN_TONE_HEX,
  HAIR_COLOR_HEX,
} from '../characters';

// ---------- Skin tones (legacy fallback for NPC runners) ----------
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
  leftShoe: Mesh;
  rightShoe: Mesh;
}

/**
 * Create a blocky runner character.
 *
 * Body proportions (Minecraft-ish, total ~1.6 m):
 *   Head:  0.3 × 0.3 × 0.3
 *   Torso: 0.4 × 0.5 × 0.25
 *   Arm:   0.15 × 0.55 × 0.15  (upper = sleeve, lower = skin)
 *   Leg:   0.18 × 0.55 × 0.18  (upper = shorts/trousers, lower = skin)
 *
 * The root origin is at foot level (y = 0).
 *
 * @param appearance  If provided, the model is built from the preset config.
 *                    When omitted, legacy random NPC behaviour is used.
 */
export function createRunnerModel(
  scene: Scene,
  id: number,
  tshirtColor: Color3,
  appearance?: RunnerAppearance,
): RunnerModelResult {
  const root = new TransformNode(`runner_${id}`, scene);

  // --- Resolve colours from appearance (or fall back to legacy random) ---
  const skinColor: Color3 = appearance
    ? hexToColor3(SKIN_TONE_HEX[appearance.skin])
    : SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];

  const hairColor: Color3 = appearance
    ? hexToColor3(HAIR_COLOR_HEX[appearance.hairColor])
    : new Color3(
        0.15 + Math.random() * 0.25,
        0.1 + Math.random() * 0.15,
        0.05 + Math.random() * 0.1,
      );

  const topColor: Color3 = appearance
    ? hexToColor3(resolveColor(appearance.topColor))
    : tshirtColor;

  const bottomColor: Color3 = appearance
    ? hexToColor3(resolveColor(appearance.bottomColor))
    : new Color3(0.08, 0.08, 0.08);

  // --- Materials ---
  const shirtMat = makeMat(`rShirt_${id}`, topColor, scene);
  const skinMat = makeMat(`rSkin_${id}`, skinColor, scene);
  const bottomMat = makeMat(`rShorts_${id}`, bottomColor, scene);
  const shoeMat = makeMat(`rShoe_${id}`, new Color3(1, 1, 1), scene);
  const hairMat = makeMat(`rHair_${id}`, hairColor, scene);

  // Height scale: >1 stretches legs + torso, <1 shrinks whole model uniformly
  const hs = appearance?.heightScale ?? 1;
  const stretch = hs > 1 ? hs : 1;

  // ═══════════════════════════════════════
  // Torso
  // ═══════════════════════════════════════
  const torsoH = 0.5 * stretch;
  const torsoW = 0.4;
  const torsoD = 0.25;
  const baseLegH = 0.55 * stretch; // used for torsoY before legs section
  const torsoY = baseLegH + torsoH / 2;

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

  // --- Hat (baseball cap) ---
  const hasHat = !!appearance?.hat;
  if (hasHat) {
    const hatHex = resolveColor(appearance!.hat!);
    const hatMat = makeMat(`rHat_${id}`, hexToColor3(hatHex), scene);
    const hatDarkMat = makeMat(`rHatDark_${id}`, hexToColor3(hatHex).scale(0.7), scene);

    // Crown — sits on top of the head (wider than hair so it renders over it)
    const crownH = 0.1;
    const crown = MeshBuilder.CreateBox(`rHatCrown_${id}`, {
      width: headSize + 0.1, height: crownH, depth: headSize + 0.1,
    }, scene);
    crown.material = hatMat;
    crown.position.y = headY + headSize / 2 + crownH / 2;
    crown.parent = root;

    // Visor / bill — extends forward from the front of the crown
    const visorDepth = 0.16;
    const visor = MeshBuilder.CreateBox(`rHatVisor_${id}`, {
      width: headSize + 0.08, height: 0.025, depth: visorDepth,
    }, scene);
    visor.material = hatDarkMat;
    visor.position.set(
      0,
      headY + headSize / 2 + 0.01,
      headSize / 2 + visorDepth / 2 - 0.02,
    );
    visor.parent = root;
  }

  // --- Hair (always rendered, hat sits on top) ---
  const hairStyle = appearance?.hair ?? 'short';
  if (hairStyle !== 'bald') {
    if (hairStyle === 'short') {
      // Short: just a cap on top
      const hairTop = MeshBuilder.CreateBox(`rHairTop_${id}`, {
        width: headSize + 0.02, height: 0.06, depth: headSize + 0.02,
      }, scene);
      hairTop.material = hairMat;
      hairTop.position.y = headY + headSize / 2 + 0.03;
      hairTop.parent = root;
    } else if (hairStyle === 'medium') {
      // Medium: shoulder-length continuous helmet — top, sides, and back as one visual mass
      // Top
      const mTop = MeshBuilder.CreateBox(`rHairMedTop_${id}`, {
        width: headSize + 0.04, height: 0.08, depth: headSize + 0.04,
      }, scene);
      mTop.material = hairMat;
      mTop.position.y = headY + headSize / 2 + 0.04;
      mTop.parent = root;
      // Sides (run from top of head down to shoulders)
      const sideH = headSize + 0.15; // extends below head to shoulder level
      for (const side of [-1, 1]) {
        const sideBlock = MeshBuilder.CreateBox(`rHairMedSide${side > 0 ? 'R' : 'L'}_${id}`, {
          width: 0.05, height: sideH, depth: headSize + 0.04,
        }, scene);
        sideBlock.material = hairMat;
        sideBlock.position.set(
          side * (headSize / 2 + 0.015),
          headY + headSize / 2 - sideH / 2 + 0.04,
          0,
        );
        sideBlock.parent = root;
      }
      // Back (runs from top of head down to shoulders)
      const backH = headSize + 0.15;
      const mBack = MeshBuilder.CreateBox(`rHairMedBack_${id}`, {
        width: headSize + 0.04, height: backH, depth: 0.05,
      }, scene);
      mBack.material = hairMat;
      mBack.position.set(
        0,
        headY + headSize / 2 - backH / 2 + 0.04,
        -(headSize / 2 + 0.015),
      );
      mBack.parent = root;
    } else if (hairStyle === 'ponytail') {
      // Ponytail: continuous hair shell (like medium) + tail from the back
      // Top — single slab covering the head
      const ptTop = MeshBuilder.CreateBox(`rHairPTTop_${id}`, {
        width: headSize + 0.04, height: 0.07, depth: headSize + 0.04,
      }, scene);
      ptTop.material = hairMat;
      ptTop.position.y = headY + headSize / 2 + 0.035;
      ptTop.parent = root;

      // Sides — continuous shell from top-of-head down past ear level
      const ptSideH = headSize * 0.6;
      for (const side of [-1, 1]) {
        const sideBlock = MeshBuilder.CreateBox(`rHairPTSide${side > 0 ? 'R' : 'L'}_${id}`, {
          width: 0.05, height: ptSideH, depth: headSize + 0.04,
        }, scene);
        sideBlock.material = hairMat;
        sideBlock.position.set(
          side * (headSize / 2 + 0.015),
          headY + headSize / 2 - ptSideH / 2 + 0.035,
          0,
        );
        sideBlock.parent = root;
      }

      // Back — continuous from top-of-head down
      const ptBackH = headSize * 0.6;
      const ptBack = MeshBuilder.CreateBox(`rHairPTBack_${id}`, {
        width: headSize + 0.04, height: ptBackH, depth: 0.05,
      }, scene);
      ptBack.material = hairMat;
      ptBack.position.set(
        0,
        headY + headSize / 2 - ptBackH / 2 + 0.035,
        -(headSize / 2 + 0.015),
      );
      ptBack.parent = root;

      // Tie / gather point at upper-back of the head
      const tie = MeshBuilder.CreateBox(`rHairPTTie_${id}`, {
        width: 0.1, height: 0.08, depth: 0.07,
      }, scene);
      tie.material = hairMat;
      tie.position.set(0, headY + 0.02, -(headSize / 2 + 0.04));
      tie.parent = root;

      // Tail — flows down from the tie point
      const tail = MeshBuilder.CreateBox(`rHairPTTail_${id}`, {
        width: 0.08, height: 0.25, depth: 0.06,
      }, scene);
      tail.material = hairMat;
      tail.position.set(0, headY - 0.13, -(headSize / 2 + 0.05));
      tail.parent = root;

      // Tail tip — tapers slightly
      const tailTip = MeshBuilder.CreateBox(`rHairPTTip_${id}`, {
        width: 0.06, height: 0.1, depth: 0.05,
      }, scene);
      tailTip.material = hairMat;
      tailTip.position.set(0, headY - 0.3, -(headSize / 2 + 0.05));
      tailTip.parent = root;
    } else {
      // Long: top cap + sides + back hanging down
      const hairTop = MeshBuilder.CreateBox(`rHairTop_${id}`, {
        width: headSize + 0.02, height: 0.1, depth: headSize + 0.02,
      }, scene);
      hairTop.material = hairMat;
      hairTop.position.y = headY + headSize / 2 + 0.05;
      hairTop.parent = root;

      // Sides
      for (const side of [-1, 1]) {
        const sideBlock = MeshBuilder.CreateBox(`rHairSide${side > 0 ? 'R' : 'L'}_${id}`, {
          width: 0.04, height: headSize * 0.6, depth: headSize,
        }, scene);
        sideBlock.material = hairMat;
        sideBlock.position.set(side * (headSize / 2 + 0.01), headY, 0);
        sideBlock.parent = root;
      }

      // Back hangs down well below head
      const backH = MeshBuilder.CreateBox(`rHairBack_${id}`, {
        width: headSize, height: headSize * 0.8, depth: 0.04,
      }, scene);
      backH.material = hairMat;
      backH.position.set(0, headY - headSize * 0.15, -(headSize / 2 + 0.01));
      backH.parent = root;
    }
  }

  // --- Facial hair ---
  const facialHair = appearance?.facialHair;
  if (facialHair) {
    const fhMat = makeMat(`rFacialHair_${id}`, hairColor.scale(0.85), scene);
    const chinZ = headSize / 2 + 0.005; // slightly in front of face

    // --- Non-overlapping facial hair layout ---
    // Sideburns sit at the outer edges of the face (x = ±faceEdge).
    // Central pieces (moustache, chin) span only the gap between the
    // inner edges of the sideburns so nothing overlaps.
    const sbW = 0.05;  // sideburn width
    const faceEdge = headSize / 2 - sbW / 2; // x-centre of each sideburn
    const centralW = (faceEdge - sbW / 2) * 2; // gap between inner sideburn edges
    const hairlineY = headY + headSize / 2 - 0.02; // top of sideburns

    /**
     * Build two sideburn strips from hairline down to `bottomY`.
     * They sit at the true left/right edges of the face.
     */
    const addSideburns = (tag: string, bottomY: number, mat: typeof fhMat) => {
      const sbH = hairlineY - bottomY;
      for (const side of [-1, 1]) {
        const sb = MeshBuilder.CreateBox(`r${tag}SB${side > 0 ? 'R' : 'L'}_${id}`, {
          width: sbW, height: sbH, depth: 0.03,
        }, scene);
        sb.material = mat;
        sb.position.set(
          side * faceEdge,
          hairlineY - sbH / 2,
          chinZ,
        );
        sb.parent = root;
      }
    };

    if (facialHair === 'stubble') {
      const stubbleMat = fhMat.clone(`rStubbleMat_${id}`);
      stubbleMat.alpha = 0.5;

      // Sideburns — full face-edge, hairline to jaw
      const jawY = headY - headSize * 0.35;
      addSideburns('Stub', jawY, stubbleMat);

      // Moustache area (central, between sideburns)
      const moH = 0.04;
      const moY = headY - headSize * 0.12;
      const mo = MeshBuilder.CreateBox(`rStubMo_${id}`, {
        width: centralW, height: moH, depth: 0.02,
      }, scene);
      mo.material = stubbleMat;
      mo.position.set(0, moY, chinZ);
      mo.parent = root;

      // Chin area (central, below moustache to jaw — no overlap with mo)
      const chinTop = moY - moH / 2;
      const chinH = chinTop - jawY;
      const chin = MeshBuilder.CreateBox(`rStubChin_${id}`, {
        width: centralW, height: chinH, depth: 0.02,
      }, scene);
      chin.material = stubbleMat;
      chin.position.set(0, chinTop - chinH / 2, chinZ);
      chin.parent = root;

    } else if (facialHair === 'moustache') {
      const mo = MeshBuilder.CreateBox(`rMoustache_${id}`, {
        width: headSize * 0.4, height: 0.04, depth: 0.025,
      }, scene);
      mo.material = fhMat;
      mo.position.set(0, headY - headSize * 0.12, chinZ);
      mo.parent = root;

    } else if (facialHair === 'beard') {
      // Sideburns — hairline to below chin
      const beardBottom = headY - headSize * 0.48;
      addSideburns('Brd', beardBottom, fhMat);

      // Moustache strip (central)
      const moH = 0.04;
      const moY = headY - headSize * 0.12;
      const mo = MeshBuilder.CreateBox(`rBrdMo_${id}`, {
        width: centralW, height: moH, depth: 0.03,
      }, scene);
      mo.material = fhMat;
      mo.position.set(0, moY, chinZ);
      mo.parent = root;

      // Chin block (central, below moustache — no overlap)
      const chinTop = moY - moH / 2;
      const chinH = chinTop - beardBottom;
      const chin = MeshBuilder.CreateBox(`rBrdChin_${id}`, {
        width: centralW, height: chinH, depth: 0.04,
      }, scene);
      chin.material = fhMat;
      chin.position.set(0, chinTop - chinH / 2, chinZ);
      chin.parent = root;

    } else if (facialHair === 'longBeard') {
      // Sideburns — hairline to well below chin
      const lbBottom = headY - headSize * 0.7;
      addSideburns('LB', lbBottom, fhMat);

      // Moustache strip (central)
      const moH = 0.04;
      const moY = headY - headSize * 0.1;
      const lbMo = MeshBuilder.CreateBox(`rLBMo_${id}`, {
        width: centralW, height: moH, depth: 0.03,
      }, scene);
      lbMo.material = fhMat;
      lbMo.position.set(0, moY, chinZ);
      lbMo.parent = root;

      // Chin + long beard block (central, below moustache — no overlap)
      const chinTop = moY - moH / 2;
      const chinH = chinTop - lbBottom;
      const lbChin = MeshBuilder.CreateBox(`rLBChin_${id}`, {
        width: centralW, height: chinH, depth: 0.05,
      }, scene);
      lbChin.material = fhMat;
      lbChin.position.set(0, chinTop - chinH / 2, chinZ);
      lbChin.parent = root;
    }
  }

  // ═══════════════════════════════════════
  // Arms (pivoted at shoulder)
  // ═══════════════════════════════════════
  const armW = 0.15;
  const armH = 0.55;
  const armD = 0.15;
  const shoulderY = torsoY + torsoH / 2 - 0.05;
  const shoulderX = torsoW / 2 + armW / 2 + 0.01;

  const topStyle = appearance?.top ?? 'tshirt';
  // Vest: upper arm = skin, Long sleeve: upper arm = shirt
  const upperArmMat = topStyle === 'vest' ? skinMat : shirtMat;

  const leftArmPivot = new TransformNode(`rLArmPiv_${id}`, scene);
  leftArmPivot.position = new Vector3(-shoulderX, shoulderY, 0);
  leftArmPivot.parent = root;

  const leftArmUpper = MeshBuilder.CreateBox(`rLArmUp_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  leftArmUpper.material = upperArmMat;
  leftArmUpper.position.y = -armH / 4;
  leftArmUpper.parent = leftArmPivot;

  const leftArmLower = MeshBuilder.CreateBox(`rLArmLo_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  leftArmLower.material = topStyle === 'longSleeve' ? shirtMat : skinMat;
  leftArmLower.position.y = -armH * 3 / 4;
  leftArmLower.parent = leftArmPivot;

  // Hand (skin) visible at end of long sleeve
  if (topStyle === 'longSleeve') {
    const leftHand = MeshBuilder.CreateBox(`rLHand_${id}`, {
      width: armW, height: 0.06, depth: armD,
    }, scene);
    leftHand.material = skinMat;
    leftHand.position.y = -armH - 0.03;
    leftHand.parent = leftArmPivot;
  }

  const rightArmPivot = new TransformNode(`rRArmPiv_${id}`, scene);
  rightArmPivot.position = new Vector3(shoulderX, shoulderY, 0);
  rightArmPivot.parent = root;

  const rightArmUpper = MeshBuilder.CreateBox(`rRArmUp_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  rightArmUpper.material = upperArmMat;
  rightArmUpper.position.y = -armH / 4;
  rightArmUpper.parent = rightArmPivot;

  const rightArmLower = MeshBuilder.CreateBox(`rRArmLo_${id}`, {
    width: armW, height: armH / 2, depth: armD,
  }, scene);
  rightArmLower.material = topStyle === 'longSleeve' ? shirtMat : skinMat;
  rightArmLower.position.y = -armH * 3 / 4;
  rightArmLower.parent = rightArmPivot;

  // Hand (skin) visible at end of long sleeve
  if (topStyle === 'longSleeve') {
    const rightHand = MeshBuilder.CreateBox(`rRHand_${id}`, {
      width: armW, height: 0.06, depth: armD,
    }, scene);
    rightHand.material = skinMat;
    rightHand.position.y = -armH - 0.03;
    rightHand.parent = rightArmPivot;
  }

  // ═══════════════════════════════════════
  // Legs (pivoted at hip)
  // ═══════════════════════════════════════
  const legW = 0.18;
  const legH = baseLegH;
  const legD = 0.18;
  const hipY = torsoY - torsoH / 2;
  const hipX = 0.1;

  const bottomStyle = appearance?.bottom ?? 'shorts';
  // Trousers: both upper AND lower leg use bottomMat
  const lowerLegMat = bottomStyle === 'trousers' ? bottomMat : skinMat;

  const leftLegPivot = new TransformNode(`rLLegPiv_${id}`, scene);
  leftLegPivot.position = new Vector3(-hipX, hipY, 0);
  leftLegPivot.parent = root;

  const leftLegUpper = MeshBuilder.CreateBox(`rLLegUp_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  leftLegUpper.material = bottomMat;
  leftLegUpper.position.y = -legH / 4;
  leftLegUpper.parent = leftLegPivot;

  const leftLegLower = MeshBuilder.CreateBox(`rLLegLo_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  leftLegLower.material = lowerLegMat;
  leftLegLower.position.y = -legH * 3 / 4;
  leftLegLower.parent = leftLegPivot;

  const rightLegPivot = new TransformNode(`rRLegPiv_${id}`, scene);
  rightLegPivot.position = new Vector3(hipX, hipY, 0);
  rightLegPivot.parent = root;

  const rightLegUpper = MeshBuilder.CreateBox(`rRLegUp_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  rightLegUpper.material = bottomMat;
  rightLegUpper.position.y = -legH / 4;
  rightLegUpper.parent = rightLegPivot;

  const rightLegLower = MeshBuilder.CreateBox(`rRLegLo_${id}`, {
    width: legW, height: legH / 2, depth: legD,
  }, scene);
  rightLegLower.material = lowerLegMat;
  rightLegLower.position.y = -legH * 3 / 4;
  rightLegLower.parent = rightLegPivot;

  // Socks (optional — render on lower 1/4 of each leg, slightly wider so they show over skin)
  const sockColor = appearance?.socks;
  if (sockColor) {
    const sockMat = makeMat(`rSock_${id}`, hexToColor3(resolveColor(sockColor)), scene);
    const sockH = legH / 4;
    const sockW = legW + 0.005;
    const sockD = legD + 0.005;
    // Socks sit at the bottom quarter of the leg
    const sockY = -legH + sockH / 2;

    const leftSock = MeshBuilder.CreateBox(`rLSock_${id}`, {
      width: sockW, height: sockH, depth: sockD,
    }, scene);
    leftSock.material = sockMat;
    leftSock.position.y = sockY;
    leftSock.parent = leftLegPivot;

    const rightSock = MeshBuilder.CreateBox(`rRSock_${id}`, {
      width: sockW, height: sockH, depth: sockD,
    }, scene);
    rightSock.material = sockMat;
    rightSock.position.y = sockY;
    rightSock.parent = rightLegPivot;
  }

  // Shoes (hidden by default; enabled by shoe power-up)
  const shoeH = 0.08;
  const shoeD = 0.28;
  const shoeW = legW * 1.05;

  const leftShoe = MeshBuilder.CreateBox(`rLShoe_${id}`, {
    width: shoeW, height: shoeH, depth: shoeD,
  }, scene);
  leftShoe.material = shoeMat;
  leftShoe.position.set(0, -legH - shoeH * 0.5, shoeD * 0.2);
  leftShoe.parent = leftLegPivot;
  leftShoe.setEnabled(false);

  const rightShoe = MeshBuilder.CreateBox(`rRShoe_${id}`, {
    width: shoeW, height: shoeH, depth: shoeD,
  }, scene);
  rightShoe.material = shoeMat;
  rightShoe.position.set(0, -legH - shoeH * 0.5, shoeD * 0.2);
  rightShoe.parent = rightLegPivot;
  rightShoe.setEnabled(false);

  // For heightScale < 1, shrink the whole model uniformly
  if (hs < 1) {
    root.scaling = new Vector3(hs, hs, hs);
  }
  // Store base scale so power-ups can multiply on top of it
  (root as any).__baseScale = hs < 1 ? hs : 1;

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

/** Jump pose: arms raised, legs slightly tucked, no frantic flailing. */
export function poseJump(
  model: RunnerModelResult,
  lift = 1,
  lateralLean = 0,
): void {
  const heightT = Math.max(0, Math.min(1, lift));
  const lean = Math.max(-1, Math.min(1, lateralLean));

  const armRaiseX = -0.45 + heightT * -1.75;
  const armSpreadZ = 0.08 + heightT * 0.2;
  const legLiftX = 0.1 + heightT * 0.55;
  const legSplayZ = 0.03 + heightT * 0.12;

  model.leftArm.rotation.x = armRaiseX;
  model.rightArm.rotation.x = armRaiseX;
  model.leftArm.rotation.z = -armSpreadZ + lean * 0.2;
  model.rightArm.rotation.z = armSpreadZ + lean * 0.2;

  model.leftLeg.rotation.x = legLiftX;
  model.rightLeg.rotation.x = legLiftX;
  model.leftLeg.rotation.z = -legSplayZ - lean * 0.12;
  model.rightLeg.rotation.z = legSplayZ - lean * 0.12;
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

/**
 * Animated sitting pose: legs stay put, but one arm occasionally
 * raises up and waves. `phase` should advance with real time so
 * different runners with different phase offsets wave at different moments.
 */
export function poseSittingAnimated(
  model: RunnerModelResult,
  phase: number,
): void {
  // Legs: same as static sitting
  model.leftLeg.rotation.x = -Math.PI / 2;
  model.leftLeg.rotation.z = -0.1;
  model.rightLeg.rotation.x = -Math.PI / 2;
  model.rightLeg.rotation.z = 0.1;

  // Alternate which arm waves each cycle
  const cycleDuration = 10; // full cycle in seconds
  const waveDuration = 2.5; // seconds of actual waving per cycle
  const cycle = ((phase % cycleDuration) + cycleDuration) % cycleDuration;
  const cycleIndex = Math.floor(((phase < 0 ? phase + 1e6 : phase)) / cycleDuration);
  const useLeft = cycleIndex % 2 === 0;

  const wavingArm = useLeft ? model.leftArm : model.rightArm;
  const restingArm = useLeft ? model.rightArm : model.leftArm;
  const sideSign = useLeft ? -1 : 1; // flip z direction for left vs right arm

  // Resting arm defaults
  restingArm.rotation.x = 0.2;
  restingArm.rotation.z = sideSign * -0.15;

  if (cycle < waveDuration) {
    const t = cycle;
    const rampUp = 0.4;
    const rampDown = 0.4;
    let raise: number;
    if (t < rampUp) {
      raise = t / rampUp; // ease arm up
    } else if (t > waveDuration - rampDown) {
      raise = (waveDuration - t) / rampDown; // ease arm down
    } else {
      raise = 1; // fully raised
    }

    // Raised arm: rotation.x → -2.8 (arm up), oscillate z for wave
    const waveOsc = Math.sin(phase * 8) * 0.25;
    wavingArm.rotation.x = 0.2 * (1 - raise) + (-2.8) * raise;
    wavingArm.rotation.z = sideSign * (0.15 * (1 - raise) + (0.5 + waveOsc) * raise);
  } else {
    // Resting
    wavingArm.rotation.x = 0.2;
    wavingArm.rotation.z = sideSign * 0.15;
  }
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

/**
 * Running + one arm raised waving.
 * `side` = 1  → wave with right arm (partner is to the right)
 * `side` = -1 → wave with left arm (partner is to the left)
 * `t` is 0→1 normalised progress through the wave (ramps up then oscillates).
 */
export function poseWaving(
  model: RunnerModelResult,
  runPhase: number,
  t: number,
  side: number,
): void {
  // Legs keep running normally
  const legSwing = Math.sin(runPhase) * 0.7;
  model.leftLeg.rotation.x = -legSwing;
  model.leftLeg.rotation.z = 0;
  model.rightLeg.rotation.x = legSwing;
  model.rightLeg.rotation.z = 0;

  // Ramp envelope: ease-in for first 20%, full for middle 60%, ease-out last 20%
  let envelope: number;
  if (t < 0.2) envelope = t / 0.2;
  else if (t > 0.8) envelope = (1 - t) / 0.2;
  else envelope = 1;

  const wavingArm = side >= 0 ? model.rightArm : model.leftArm;
  const freeArm = side >= 0 ? model.leftArm : model.rightArm;

  // Free arm runs normally (opposite of legs)
  const armSwing = Math.sin(runPhase) * 0.7;
  freeArm.rotation.x = side >= 0 ? armSwing : -armSwing;
  freeArm.rotation.z = 0;

  // Waving arm: raise up and oscillate
  const raiseX = -2.6 * envelope;                                   // arm up over head
  const waveOsc = Math.sin(runPhase * 2.5) * 0.3 * envelope;        // gentle wave oscillation
  const splayZ = (side >= 0 ? 1 : -1) * (0.4 + waveOsc) * envelope;

  wavingArm.rotation.x = raiseX + (1 - envelope) * (side >= 0 ? -armSwing : armSwing);
  wavingArm.rotation.z = splayZ;
}

/**
 * High-five pose: one arm punches forward to meet the other runner's hand.
 * `side` = 1  → right arm forward, -1 → left arm forward.
 * `t` is 0→1 normalised progress (thrust out, hold, retract).
 */
export function poseHighFive(
  model: RunnerModelResult,
  t: number,
  side: number,
): void {
  // Legs brake to a brief stop
  const legBend = 0.15;
  model.leftLeg.rotation.x = legBend;
  model.leftLeg.rotation.z = 0;
  model.rightLeg.rotation.x = legBend;
  model.rightLeg.rotation.z = 0;

  // Envelope: quick thrust (0→0.3), hold (0.3→0.7), retract (0.7→1)
  let envelope: number;
  if (t < 0.3) envelope = t / 0.3;
  else if (t > 0.7) envelope = (1 - t) / 0.3;
  else envelope = 1;

  const activeArm = side >= 0 ? model.rightArm : model.leftArm;
  const passiveArm = side >= 0 ? model.leftArm : model.rightArm;

  // Active arm: thrust forward-up (rotation.x = -1.5 rad ≈ arm out in front)
  activeArm.rotation.x = -1.5 * envelope;
  activeArm.rotation.z = (side >= 0 ? 1 : -1) * 0.3 * envelope;

  // Passive arm stays relaxed at side
  passiveArm.rotation.x = 0.1;
  passiveArm.rotation.z = 0;
}

// ── Volunteer vest overlay ──

/** Hi-vis blue for parkwalkers */
const PARKWALKER_BLUE = new Color3(0.0, 0.45, 0.9);
/** Hi-vis orange for tailwalkers */
const TAILWALKER_ORANGE = new Color3(1.0, 0.5, 0.0);
/** Reflective silver-grey stripe accent */
const REFLECTIVE_STRIPE = new Color3(0.78, 0.78, 0.78);

/**
 * Overlay a coloured hi-vis volunteer vest (with reflective stripes) on top
 * of an existing runner model. Blue for parkwalker, orange for tailwalker.
 *
 * The vest covers the torso and upper-arm sleeves, identical to MarshalModel
 * proportions but in the appropriate volunteer colour.
 */
export function applyVolunteerVest(
  scene: Scene,
  model: RunnerModelResult,
  role: PreviewRunnerRole,
  id: number,
): void {
  const vestColor = role === 'parkwalker' ? PARKWALKER_BLUE : TAILWALKER_ORANGE;
  const emissive = role === 'parkwalker'
    ? new Color3(0.0, 0.12, 0.25)
    : new Color3(0.3, 0.15, 0.0);

  const vestMat = makeMat(`rVest_${id}`, vestColor, scene);
  vestMat.emissiveColor = emissive; // slight glow so it pops
  const stripeMat = makeMat(`rVStripe_${id}`, REFLECTIVE_STRIPE, scene);
  stripeMat.emissiveColor = new Color3(0.2, 0.2, 0.2);

  // Dimensions must match RunnerModel defaults (heightScale=1)
  const torsoH = 0.5;
  const torsoW = 0.4;
  const torsoD = 0.25;
  const torsoY = 0.55 + torsoH / 2; // 0.80

  // Vest torso overlay (slightly larger so it renders on top)
  const vestTorso = MeshBuilder.CreateBox(`rVestTorso_${id}`, {
    width: torsoW + 0.02, height: torsoH + 0.02, depth: torsoD + 0.02,
  }, scene);
  vestTorso.material = vestMat;
  vestTorso.position.y = torsoY;
  vestTorso.parent = model.root;

  // Reflective stripe across the chest
  const stripe1 = MeshBuilder.CreateBox(`rVStripe1_${id}`, {
    width: torsoW + 0.04, height: 0.06, depth: torsoD + 0.04,
  }, scene);
  stripe1.material = stripeMat;
  stripe1.position.y = torsoY - 0.05;
  stripe1.parent = model.root;

  // Second stripe higher up
  const stripe2 = MeshBuilder.CreateBox(`rVStripe2_${id}`, {
    width: torsoW + 0.04, height: 0.06, depth: torsoD + 0.04,
  }, scene);
  stripe2.material = stripeMat;
  stripe2.position.y = torsoY + 0.12;
  stripe2.parent = model.root;

  // Vest sleeve overlays on upper arms (parented to arm pivots so they animate)
  const armW = 0.15;
  const armH = 0.55;
  const armD = 0.15;

  const leftSleeve = MeshBuilder.CreateBox(`rVSleeveL_${id}`, {
    width: armW + 0.02, height: armH / 2 + 0.02, depth: armD + 0.02,
  }, scene);
  leftSleeve.material = vestMat;
  leftSleeve.position.y = -armH / 4;
  leftSleeve.parent = model.leftArm;

  const rightSleeve = MeshBuilder.CreateBox(`rVSleeveR_${id}`, {
    width: armW + 0.02, height: armH / 2 + 0.02, depth: armD + 0.02,
  }, scene);
  rightSleeve.material = vestMat;
  rightSleeve.position.y = -armH / 4;
  rightSleeve.parent = model.rightArm;
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
