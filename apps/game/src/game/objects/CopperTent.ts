import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';

/**
 * The Copper Tent (Koppartältet) at Haga Park, Stockholm.
 *
 * A striking blue-and-gold tent-shaped building with:
 * - A large central dome/spire
 * - Two flanking wing tents
 * - Decorative gold trim and finials
 *
 * Built from Babylon primitives to match the low-poly aesthetic.
 */
export function createCopperTent(
  scene: Scene,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  y: number,
): TransformNode {
  const root = new TransformNode('copperTent', scene);

  // Compute centre, length, and orientation from the two endpoints
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const yaw = Math.atan2(dx, dz);

  root.position = new Vector3(cx, y, cz);
  root.rotation.y = yaw;

  // --- Materials ---
  const blueMat = new StandardMaterial('tentBlue', scene);
  blueMat.diffuseColor = new Color3(0.30, 0.55, 0.82); // sky blue
  blueMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const darkBlueMat = new StandardMaterial('tentDarkBlue', scene);
  darkBlueMat.diffuseColor = new Color3(0.20, 0.40, 0.68);
  darkBlueMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const goldMat = new StandardMaterial('tentGold', scene);
  goldMat.diffuseColor = new Color3(0.85, 0.68, 0.20);
  goldMat.specularColor = new Color3(0.4, 0.35, 0.1);

  const creamMat = new StandardMaterial('tentCream', scene);
  creamMat.diffuseColor = new Color3(0.92, 0.88, 0.78);
  creamMat.specularColor = Color3.Black();

  const darkMat = new StandardMaterial('tentDark', scene);
  darkMat.diffuseColor = new Color3(0.15, 0.12, 0.10);
  darkMat.specularColor = Color3.Black();

  // --- Proportions (scaled to fit between the two GPS points) ---
  const scale = length / 30; // normalise: ~30m real-world building length

  // ========================================
  // CENTRAL DOME — the main tall tent
  // ========================================

  // Base walls (octagonal cylinder)
  const centralBaseH = 5 * scale;
  const centralBaseR = 6 * scale;
  const centralBase = MeshBuilder.CreateCylinder(
    'tentCentralBase',
    { height: centralBaseH, diameter: centralBaseR * 2, tessellation: 8 },
    scene,
  );
  centralBase.position.y = centralBaseH / 2;
  centralBase.material = creamMat;
  centralBase.parent = root;

  // Blue tent roof (cone)
  const centralRoofH = 8 * scale;
  const centralRoof = MeshBuilder.CreateCylinder(
    'tentCentralRoof',
    {
      height: centralRoofH,
      diameterTop: 0,
      diameterBottom: centralBaseR * 2.2,
      tessellation: 8,
    },
    scene,
  );
  centralRoof.position.y = centralBaseH + centralRoofH / 2;
  centralRoof.material = blueMat;
  centralRoof.parent = root;

  // Gold band at roof base
  const bandH = 0.4 * scale;
  const band = MeshBuilder.CreateCylinder(
    'tentBand',
    { height: bandH, diameter: centralBaseR * 2.25, tessellation: 8 },
    scene,
  );
  band.position.y = centralBaseH + bandH / 2;
  band.material = goldMat;
  band.parent = root;

  // Gold spire on top
  const spireH = 3 * scale;
  const spire = MeshBuilder.CreateCylinder(
    'tentSpire',
    { height: spireH, diameterTop: 0.1 * scale, diameterBottom: 0.4 * scale, tessellation: 8 },
    scene,
  );
  spire.position.y = centralBaseH + centralRoofH + spireH / 2;
  spire.material = goldMat;
  spire.parent = root;

  // Gold ring at top of spire
  const ring = MeshBuilder.CreateTorus(
    'tentRing',
    { diameter: 1.0 * scale, thickness: 0.15 * scale, tessellation: 16 },
    scene,
  );
  ring.position.y = centralBaseH + centralRoofH + spireH + 0.3 * scale;
  ring.material = goldMat;
  ring.parent = root;

  // ========================================
  // WING TENTS — two flanking tent structures
  // ========================================

  const wingOffsetZ = 8 * scale; // distance from centre along building axis
  const wingBaseH = 3 * scale;
  const wingBaseR = 4 * scale;
  const wingRoofH = 5 * scale;

  for (const side of [-1, 1]) {
    const wz = side * wingOffsetZ;

    // Wing base walls
    const wingBase = MeshBuilder.CreateCylinder(
      `tentWingBase_${side}`,
      { height: wingBaseH, diameter: wingBaseR * 2, tessellation: 8 },
      scene,
    );
    wingBase.position.set(0, wingBaseH / 2, wz);
    wingBase.material = creamMat;
    wingBase.parent = root;

    // Wing blue tent roof
    const wingRoof = MeshBuilder.CreateCylinder(
      `tentWingRoof_${side}`,
      {
        height: wingRoofH,
        diameterTop: 0,
        diameterBottom: wingBaseR * 2.2,
        tessellation: 8,
      },
      scene,
    );
    wingRoof.position.set(0, wingBaseH + wingRoofH / 2, wz);
    wingRoof.material = darkBlueMat;
    wingRoof.parent = root;

    // Gold band at wing roof base
    const wingBand = MeshBuilder.CreateCylinder(
      `tentWingBand_${side}`,
      { height: bandH, diameter: wingBaseR * 2.25, tessellation: 8 },
      scene,
    );
    wingBand.position.set(0, wingBaseH + bandH / 2, wz);
    wingBand.material = goldMat;
    wingBand.parent = root;

    // Small gold finial on wing
    const wingFinial = MeshBuilder.CreateCylinder(
      `tentWingFinial_${side}`,
      { height: 1.5 * scale, diameterTop: 0.05 * scale, diameterBottom: 0.25 * scale, tessellation: 8 },
      scene,
    );
    wingFinial.position.set(0, wingBaseH + wingRoofH + 0.75 * scale, wz);
    wingFinial.material = goldMat;
    wingFinial.parent = root;
  }

  // ========================================
  // CONNECTING SECTIONS — low galleries between centre and wings
  // ========================================

  const galleryW = 5 * scale;
  const galleryH = 3.5 * scale;
  const galleryD = 3 * scale; // depth (along building axis)

  for (const side of [-1, 1]) {
    const gz = side * (wingOffsetZ / 2);

    // Gallery body
    const gallery = MeshBuilder.CreateBox(
      `tentGallery_${side}`,
      { width: galleryW, height: galleryH, depth: galleryD },
      scene,
    );
    gallery.position.set(0, galleryH / 2, gz);
    gallery.material = creamMat;
    gallery.parent = root;

    // Gallery sloped roof
    const galleryRoof = MeshBuilder.CreateBox(
      `tentGalleryRoof_${side}`,
      { width: galleryW * 1.1, height: 0.3 * scale, depth: galleryD * 1.1 },
      scene,
    );
    galleryRoof.position.set(0, galleryH + 0.15 * scale, gz);
    galleryRoof.material = blueMat;
    galleryRoof.parent = root;

    // Decorative scallop — gold trim along gallery top
    const trim = MeshBuilder.CreateBox(
      `tentTrim_${side}`,
      { width: galleryW * 1.05, height: 0.25 * scale, depth: 0.1 * scale },
      scene,
    );
    trim.position.set(0, galleryH, gz + side * galleryD / 2);
    trim.material = goldMat;
    trim.parent = root;
  }

  // ========================================
  // ENTRANCE — dark archway at the front
  // ========================================

  const entranceW = 3 * scale;
  const entranceH = 3.5 * scale;
  const entrance = MeshBuilder.CreateBox(
    'tentEntrance',
    { width: entranceW, height: entranceH, depth: 0.5 * scale },
    scene,
  );
  entrance.position.set(0, entranceH / 2, 0);
  // Push entrance slightly forward from the central base
  entrance.position.x = centralBaseR * 0.95;
  entrance.material = darkMat;
  entrance.parent = root;

  // Gold trim above entrance
  const entranceTrim = MeshBuilder.CreateBox(
    'tentEntranceTrim',
    { width: entranceW * 1.1, height: 0.3 * scale, depth: 0.6 * scale },
    scene,
  );
  entranceTrim.position.set(centralBaseR * 0.95, entranceH + 0.15 * scale, 0);
  entranceTrim.material = goldMat;
  entranceTrim.parent = root;

  // ========================================
  // DECORATIVE GOLD STRIPES on the central roof
  // ========================================

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stripeH = centralRoofH * 0.85;
    const stripe = MeshBuilder.CreateBox(
      `tentStripe_${i}`,
      { width: 0.15 * scale, height: stripeH, depth: 0.05 * scale },
      scene,
    );
    const r = centralBaseR * 0.55;
    stripe.position.set(
      Math.cos(angle) * r,
      centralBaseH + stripeH / 2 + 0.5 * scale,
      Math.sin(angle) * r,
    );
    // Tilt stripe to follow roof slope
    const tiltAngle = Math.atan2(centralBaseR * 1.1, centralRoofH);
    stripe.rotation.x = -Math.sin(angle) * tiltAngle;
    stripe.rotation.z = Math.cos(angle) * tiltAngle;
    stripe.rotation.y = angle;
    stripe.material = goldMat;
    stripe.parent = root;
  }

  return root;
}
