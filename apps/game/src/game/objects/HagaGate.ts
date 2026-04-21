import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
} from '@babylonjs/core';

/**
 * The Royal Gate at Haga Park, Stockholm.
 *
 * An ornate entrance gate with:
 * - Two large salmon/terracotta brick gatehouse buildings
 * - Ornamental white iron gate spanning the path
 * - A decorative crown/monogram crest at the top
 * - Dark slate roofs on the gatehouses
 *
 * Placed perpendicular to and spanning over the running track.
 */
export function createHagaGate(
  scene: Scene,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  y: number,
): TransformNode {
  const root = new TransformNode('hagaGate', scene);

  // Compute centre, span, and orientation from the two endpoints
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const span = Math.sqrt(dx * dx + dz * dz);
  const yaw = Math.atan2(dx, dz);

  root.position = new Vector3(cx, y - 0.65, cz);
  root.rotation.y = yaw + Math.PI / 2;

  // --- Scale ---
  // Reference gate is ~12 m wide; scale geometry to match the GPS span
  const s = (span / 12) * 1.44 * 0.8;

  // --- Materials ---
  const brickMat = new StandardMaterial('gateBrick', scene);
  brickMat.diffuseColor = new Color3(0.76, 0.52, 0.40); // salmon/terracotta
  brickMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const roofMat = new StandardMaterial('gateRoof', scene);
  roofMat.diffuseColor = new Color3(0.22, 0.24, 0.26); // dark slate
  roofMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const ironMat = new StandardMaterial('gateIron', scene);
  ironMat.diffuseColor = new Color3(0.82, 0.84, 0.86); // light silvery white
  ironMat.specularColor = new Color3(0.3, 0.3, 0.3);

  const goldMat = new StandardMaterial('gateGold', scene);
  goldMat.diffuseColor = new Color3(0.85, 0.70, 0.20);
  goldMat.specularColor = new Color3(0.4, 0.35, 0.1);

  const darkMat = new StandardMaterial('gateDark', scene);
  darkMat.diffuseColor = new Color3(0.12, 0.10, 0.10);
  darkMat.specularColor = Color3.Black();

  const windowMat = new StandardMaterial('gateWindow', scene);
  windowMat.diffuseColor = new Color3(0.15, 0.15, 0.18);
  windowMat.specularColor = Color3.Black();

  // ========================================
  // BRICK GATEHOUSES — two large pillars/buildings
  // ========================================

  const gateWidth = 5.0 * s * 2.25;  // gap between gatehouses (path width), widened 2.25×
  const houseW = 3.5 * s;          // gatehouse width (along gate axis)
  const houseD = 3.0 * s;          // gatehouse depth (along track)
  const houseH = 4.5 * s;          // gatehouse wall height
  const roofH = 2.0 * s;           // pitched roof height

  for (const side of [-1, 1]) {
    const offsetX = side * (gateWidth / 2 + houseW / 2);

    // Main brick body
    const house = MeshBuilder.CreateBox(
      `gateHouse_${side}`,
      { width: houseW, height: houseH, depth: houseD },
      scene,
    );
    house.position.set(offsetX, houseH / 2, 0);
    house.material = brickMat;
    house.parent = root;

    // Pitched roof (pyramid / low cone)
    const roof = MeshBuilder.CreateCylinder(
      `gateRoof_${side}`,
      {
        height: roofH,
        diameterTop: 0,
        diameterBottom: Math.max(houseW, houseD) * 1.35,
        tessellation: 4,
      },
      scene,
    );
    roof.position.set(offsetX, houseH + roofH / 2, 0);
    roof.rotation.y = Math.PI / 4; // align square pyramid with box
    roof.material = roofMat;
    roof.parent = root;

    // Arched window recess (dark inset on the front face)
    const windowH = 1.6 * s;
    const windowW = 1.0 * s;
    const windowRecess = MeshBuilder.CreateBox(
      `gateWindow_${side}`,
      { width: windowW, height: windowH, depth: 0.15 * s },
      scene,
    );
    windowRecess.position.set(offsetX, houseH * 0.55, houseD / 2 + 0.05 * s);
    windowRecess.material = windowMat;
    windowRecess.parent = root;

    // Window arch top (small half-sphere look via a disc)
    const arch = MeshBuilder.CreateDisc(
      `gateArch_${side}`,
      { radius: windowW / 2, tessellation: 12 },
      scene,
    );
    arch.position.set(offsetX, houseH * 0.55 + windowH / 2, houseD / 2 + 0.06 * s);
    arch.rotation.x = 0; // facing outward
    arch.material = windowMat;
    arch.parent = root;

    // Back window too
    const windowBack = MeshBuilder.CreateBox(
      `gateWindowBack_${side}`,
      { width: windowW, height: windowH, depth: 0.15 * s },
      scene,
    );
    windowBack.position.set(offsetX, houseH * 0.55, -(houseD / 2 + 0.05 * s));
    windowBack.material = windowMat;
    windowBack.parent = root;
  }

  // ========================================
  // IRON GATE — ornamental metalwork spanning the gap (OPEN)
  // ========================================

  // Two tall gate posts (pillars) — iron colored, at inner edges of gatehouses
  const postH = 5.5 * s;
  const postR = 0.15 * s;
  for (const side of [-1, 1]) {
    const px = side * (gateWidth / 2);
    const post = MeshBuilder.CreateCylinder(
      `gatePost_${side}`,
      { height: postH, diameter: postR * 2, tessellation: 8 },
      scene,
    );
    post.position.set(px, postH / 2, 0);
    post.material = ironMat;
    post.parent = root;

    // Post cap (small sphere)
    const cap = MeshBuilder.CreateSphere(
      `gatePostCap_${side}`,
      { diameter: postR * 3, segments: 8 },
      scene,
    );
    cap.position.set(px, postH + postR * 1, 0);
    cap.material = ironMat;
    cap.parent = root;
  }

  // Gate leaves — each half swings open ~85° around its hinge post
  const barH = 4.0 * s;
  const barR = 0.04 * s;
  const barsPerLeaf = 5;
  const leafWidth = gateWidth / 2; // each leaf covers half the opening
  const openAngle = Math.PI * 0.47; // ~85° open

  for (const side of [-1, 1]) {
    // Pivot node at the hinge post position
    const pivot = new TransformNode(`gateLeaf_${side}`, scene);
    pivot.position.set(side * (gateWidth / 2), 0, 0);
    pivot.rotation.y = side * openAngle; // swing open outward
    pivot.parent = root;

    // Vertical bars on this leaf (offset from pivot toward centre)
    for (let i = 1; i <= barsPerLeaf; i++) {
      const t = i / (barsPerLeaf + 1);
      // bars go from the hinge toward the centre (negative side direction)
      const localX = -side * t * leafWidth;
      const bar = MeshBuilder.CreateCylinder(
        `gateBar_${side}_${i}`,
        { height: barH, diameter: barR * 2, tessellation: 6 },
        scene,
      );
      bar.position.set(localX, barH / 2, 0);
      bar.material = ironMat;
      bar.parent = pivot;
    }

    // Horizontal crossbars on this leaf
    const crossbarYs = [0.5 * s, 2.0 * s, 3.8 * s];
    for (let ci = 0; ci < crossbarYs.length; ci++) {
      const crossbar = MeshBuilder.CreateBox(
        `gateCrossbar_${side}_${ci}`,
        { width: leafWidth, height: 0.08 * s, depth: 0.08 * s },
        scene,
      );
      crossbar.position.set(-side * leafWidth / 2, crossbarYs[ci], 0);
      crossbar.material = ironMat;
      crossbar.parent = pivot;
    }
  }

  // ========================================
  // ARCH — ornamental curved arch over the gate
  // ========================================

  const archBarH = 4.0 * s; // height where the arch starts (matches gate leaf bar height)
  // Curved arch using a torus segment (half torus)
  const archRadius = gateWidth / 2;
  const archThickness = 0.12 * s;
  const archSegments = 16;

  // Build arch from small boxes along a half-circle
  for (let i = 0; i <= archSegments; i++) {
    const angle = (i / archSegments) * Math.PI; // 0 to PI
    const ax = Math.cos(angle) * archRadius;
    const ay = Math.sin(angle) * archRadius * 0.5; // flatter arch

    const segment = MeshBuilder.CreateBox(
      `gateArchSeg_${i}`,
      { width: 0.25 * s, height: archThickness, depth: archThickness },
      scene,
    );
    segment.position.set(ax, archBarH + ay, 0);
    segment.rotation.z = angle - Math.PI / 2;
    segment.material = ironMat;
    segment.parent = root;
  }

  // Decorative scrollwork — two mirrored C-curves inside the arch
  const scrollSegs = 10;
  const scrollR = archRadius * 0.35;
  for (const side of [-1, 1]) {
    for (let i = 0; i <= scrollSegs; i++) {
      const t = i / scrollSegs;
      const angle = t * Math.PI * 0.8 + Math.PI * 0.1;
      const sx = side * scrollR * 0.6 + Math.cos(angle) * scrollR * 0.5;
      const sy = Math.sin(angle) * scrollR * 0.6;
      const scroll = MeshBuilder.CreateBox(
        `gateScroll_${side}_${i}`,
        { width: 0.06 * s, height: 0.06 * s, depth: archThickness * 0.8 },
        scene,
      );
      scroll.position.set(sx, archBarH + archRadius * 0.15 + sy, 0);
      scroll.material = ironMat;
      scroll.parent = root;
    }
  }

  // ========================================
  // CROWN / MONOGRAM CREST — gold decoration at the top
  // ========================================

  const crestY = archBarH + archRadius * 0.5 + 0.3 * s;

  // Shield / medallion base
  const shield = MeshBuilder.CreateCylinder(
    'gateCrestShield',
    { height: 0.15 * s, diameter: 1.0 * s, tessellation: 16 },
    scene,
  );
  shield.position.set(0, crestY, 0);
  shield.rotation.x = Math.PI / 2;
  shield.material = goldMat;
  shield.parent = root;

  // Crown shape — a larger base with pointed tips
  const crownBaseH = 0.4 * s;
  const crownBase = MeshBuilder.CreateBox(
    'gateCrownBase',
    { width: 1.2 * s, height: crownBaseH, depth: 0.15 * s },
    scene,
  );
  crownBase.position.set(0, crestY + 0.5 * s, 0);
  crownBase.material = goldMat;
  crownBase.parent = root;

  // Crown points
  const crownPoints = 5;
  for (let i = 0; i < crownPoints; i++) {
    const t = (i + 0.5) / crownPoints;
    const px = -0.5 * s + t * 1.0 * s;
    const point = MeshBuilder.CreateCylinder(
      `gateCrownPoint_${i}`,
      { height: 0.35 * s, diameterTop: 0, diameterBottom: 0.15 * s, tessellation: 6 },
      scene,
    );
    point.position.set(px, crestY + 0.5 * s + crownBaseH / 2 + 0.15 * s, 0);
    point.material = goldMat;
    point.parent = root;
  }

  // Small gold orb on very top
  const topOrb = MeshBuilder.CreateSphere(
    'gateCrownOrb',
    { diameter: 0.25 * s, segments: 8 },
    scene,
  );
  topOrb.position.set(0, crestY + 0.5 * s + crownBaseH + 0.45 * s, 0);
  topOrb.material = goldMat;
  topOrb.parent = root;

  // ========================================
  // FLOWER PLANTERS — barrel planters at the base
  // ========================================

  for (const side of [-1, 1]) {
    const planterX = side * (gateWidth / 2) * 0.5;

    // Barrel
    const barrel = MeshBuilder.CreateCylinder(
      `gatePlanter_${side}`,
      { height: 0.6 * s, diameter: 0.6 * s, tessellation: 10 },
      scene,
    );
    barrel.position.set(planterX, 0.3 * s, houseD / 2 + 0.5 * s);
    const barrelMat = new StandardMaterial(`gateBarrelMat_${side}`, scene);
    barrelMat.diffuseColor = new Color3(0.55, 0.35, 0.20); // wood brown
    barrelMat.specularColor = Color3.Black();
    barrel.material = barrelMat;
    barrel.parent = root;

    // Flowers (green blob)
    const flowers = MeshBuilder.CreateSphere(
      `gateFlowers_${side}`,
      { diameter: 0.55 * s, segments: 6 },
      scene,
    );
    flowers.position.set(planterX, 0.7 * s, houseD / 2 + 0.5 * s);
    const flowerMat = new StandardMaterial(`gateFlowerMat_${side}`, scene);
    flowerMat.diffuseColor = new Color3(0.25, 0.55, 0.20);
    flowerMat.specularColor = Color3.Black();
    flowers.material = flowerMat;
    flowers.parent = root;
  }

  return root;
}
