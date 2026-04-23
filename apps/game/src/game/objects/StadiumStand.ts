import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
} from '@babylonjs/core';

/**
 * Kristinebergs IP stadium grandstand.
 *
 * Based on the real-world covered grandstand at Kristinebergs Idrottsplats:
 * - Ground-level white building with windows (changing rooms / facilities)
 * - Second level: tiered seating rows stepping upward and backward
 * - Brown canopy roof supported by steel columns over the seating
 * - Central entrance on the front face
 *
 * Layout in local space (root already positioned & oriented by buildings.ts):
 *   X = along the grandstand length
 *   Z = front-to-back (positive Z = front / track side)
 *   Y = up
 *
 * Heights are fixed in metres regardless of footprint size so the building
 * looks realistic. The footprint width/depth only control the horizontal
 * extents.
 */
export function createStadiumStand(
  scene: Scene,
  root: TransformNode,
  width: number,   // along the grandstand length (local X)
  depth: number,   // front-to-back (local Z)
  _groundY: number,
): void {
  // --- Materials ---
  const whiteMat = new StandardMaterial('stadiumWhite', scene);
  whiteMat.diffuseColor = new Color3(0.94, 0.93, 0.90);
  whiteMat.specularColor = Color3.Black();

  const lightGreyMat = new StandardMaterial('stadiumLightGrey', scene);
  lightGreyMat.diffuseColor = new Color3(0.82, 0.82, 0.84);
  lightGreyMat.specularColor = Color3.Black();

  const brownRoofMat = new StandardMaterial('stadiumBrownRoof', scene);
  brownRoofMat.diffuseColor = new Color3(0.48, 0.28, 0.15);
  brownRoofMat.specularColor = new Color3(0.06, 0.04, 0.02);

  const steelMat = new StandardMaterial('stadiumSteel', scene);
  steelMat.diffuseColor = new Color3(0.50, 0.52, 0.55);
  steelMat.specularColor = new Color3(0.15, 0.15, 0.15);

  const darkMat = new StandardMaterial('stadiumDark', scene);
  darkMat.diffuseColor = new Color3(0.15, 0.15, 0.17);
  darkMat.specularColor = Color3.Black();

  const windowMat = new StandardMaterial('stadiumWindow', scene);
  windowMat.diffuseColor = new Color3(0.30, 0.42, 0.55);
  windowMat.emissiveColor = new Color3(0.04, 0.06, 0.08);
  windowMat.specularColor = new Color3(0.2, 0.2, 0.3);

  const seatMat = new StandardMaterial('stadiumSeat', scene);
  seatMat.diffuseColor = new Color3(0.55, 0.55, 0.58);
  seatMat.specularColor = Color3.Black();

  const railMat = new StandardMaterial('stadiumRail', scene);
  railMat.diffuseColor = new Color3(0.62, 0.64, 0.66);
  railMat.specularColor = new Color3(0.2, 0.2, 0.2);

  // --- Fixed heights (metres) ---
  const groundFloorH = 3.2;   // white base building
  const numRows = 7;
  const rowStepH = 0.5;        // each row rises this much
  const rowStepD = 0.9;        // each row is this deep (front-to-back)
  const seatingTotalH = numRows * rowStepH;  // ~3.5m total seating height
  const roofClearance = 2.0;   // gap above top seat row to roof underside
  const roofThick = 0.3;
  const totalH = groundFloorH + seatingTotalH + roofClearance + roofThick;

  const halfW = width * 0.5;
  const halfD = depth * 0.5;

  // Seating block occupies a portion of the depth, back portion of building
  const seatingDepth = numRows * rowStepD;
  // Front of seating aligns near front of footprint; seats step backward
  const seatingFrontZ = halfD * 0.4;

  // ========================================
  // GROUND FLOOR — white box with windows
  // ========================================

  const baseBody = MeshBuilder.CreateBox('stadiumBase', {
    width,
    height: groundFloorH,
    depth,
  }, scene);
  baseBody.position.y = groundFloorH * 0.5;
  baseBody.material = whiteMat;
  baseBody.parent = root;

  // Windows along the front face
  const winW = 1.0;
  const winH = 1.2;
  const winSpacing = Math.max(2.5, width / Math.max(1, Math.floor(width / 2.8)));
  const numWins = Math.max(2, Math.floor((width * 0.85) / winSpacing));
  const winStartX = -(numWins - 1) * winSpacing * 0.5;

  for (let w = 0; w < numWins; w++) {
    const wx = winStartX + w * winSpacing;
    const win = MeshBuilder.CreateBox(`stadiumWin_${w}`, {
      width: winW,
      height: winH,
      depth: 0.15,
    }, scene);
    win.position = new Vector3(wx, groundFloorH * 0.55, halfD + 0.05);
    win.material = windowMat;
    win.parent = root;

    // White sill below window
    const sill = MeshBuilder.CreateBox(`stadiumSill_${w}`, {
      width: winW + 0.2,
      height: 0.08,
      depth: 0.25,
    }, scene);
    sill.position = new Vector3(wx, groundFloorH * 0.55 - winH * 0.5 - 0.04, halfD + 0.08);
    sill.material = lightGreyMat;
    sill.parent = root;
  }

  // Windows along the rear face
  for (let w = 0; w < numWins; w++) {
    const wx = winStartX + w * winSpacing;
    const win = MeshBuilder.CreateBox(`stadiumWinR_${w}`, {
      width: winW,
      height: winH,
      depth: 0.15,
    }, scene);
    win.position = new Vector3(wx, groundFloorH * 0.55, -halfD - 0.05);
    win.material = windowMat;
    win.parent = root;
  }

  // Horizontal trim strip at top of ground floor
  const trimStrip = MeshBuilder.CreateBox('stadiumTrim', {
    width: width + 0.1,
    height: 0.12,
    depth: depth + 0.1,
  }, scene);
  trimStrip.position.y = groundFloorH;
  trimStrip.material = lightGreyMat;
  trimStrip.parent = root;

  // ========================================
  // CENTRAL ENTRANCE — dark opening in front face
  // ========================================

  const entranceW = Math.min(3.0, width * 0.08);
  const entranceH = 2.6;

  const entrance = MeshBuilder.CreateBox('stadiumEntrance', {
    width: entranceW,
    height: entranceH,
    depth: 0.25,
  }, scene);
  entrance.position = new Vector3(0, entranceH * 0.5, halfD + 0.05);
  entrance.material = darkMat;
  entrance.parent = root;

  // Grey lintel above entrance
  const lintel = MeshBuilder.CreateBox('stadiumLintel', {
    width: entranceW + 0.5,
    height: 0.2,
    depth: 0.3,
  }, scene);
  lintel.position = new Vector3(0, entranceH + 0.1, halfD + 0.05);
  lintel.material = lightGreyMat;
  lintel.parent = root;

  // ========================================
  // TIERED SEATING — rows stepping up and backward
  // ========================================
  // Row 0 (front, lowest) sits on top of the ground floor at the front.
  // Each subsequent row is higher and further back.

  for (let r = 0; r < numRows; r++) {
    const rowY = groundFloorH + r * rowStepH;
    const rowZ = seatingFrontZ - r * rowStepD;

    // Seat platform (visible stepped block)
    const seat = MeshBuilder.CreateBox(`stadiumSeat_${r}`, {
      width: width * 0.94,
      height: rowStepH,
      depth: rowStepD * 0.92,
    }, scene);
    seat.position = new Vector3(0, rowY + rowStepH * 0.5, rowZ);
    seat.material = r % 2 === 0 ? lightGreyMat : seatMat;
    seat.parent = root;
  }

  // Back-fill slab behind the seating rows (the triangular cross-section fill)
  // Approximated as a single wedge-like box
  const backFillH = seatingTotalH;
  const backFillD = seatingDepth;
  const backFill = MeshBuilder.CreateBox('stadiumBackFill', {
    width: width * 0.94,
    height: backFillH * 0.5,
    depth: backFillD,
  }, scene);
  backFill.position = new Vector3(
    0,
    groundFloorH + backFillH * 0.25,
    seatingFrontZ - seatingDepth * 0.5,
  );
  backFill.material = whiteMat;
  backFill.parent = root;

  // ========================================
  // FRONT RAILING — along the front edge of seating
  // ========================================

  const railY = groundFloorH + 1.0;
  const railBar = MeshBuilder.CreateBox('stadiumRailBar', {
    width: width * 0.92,
    height: 0.06,
    depth: 0.06,
  }, scene);
  railBar.position = new Vector3(0, railY, seatingFrontZ + rowStepD * 0.5 + 0.15);
  railBar.material = railMat;
  railBar.parent = root;

  const numPosts = Math.max(3, Math.round(width / 6));
  const postSpacing = (width * 0.9) / (numPosts - 1);
  for (let p = 0; p < numPosts; p++) {
    const px = -width * 0.45 + p * postSpacing;
    const post = MeshBuilder.CreateBox(`stadiumPost_${p}`, {
      width: 0.06,
      height: 1.0,
      depth: 0.06,
    }, scene);
    post.position = new Vector3(px, groundFloorH + 0.5, seatingFrontZ + rowStepD * 0.5 + 0.15);
    post.material = railMat;
    post.parent = root;
  }

  // ========================================
  // ROOF CANOPY — brown awning over the seating
  // ========================================

  const roofY = groundFloorH + seatingTotalH + roofClearance;
  const canopyOverhang = 2.0;  // how far it extends past the front seats
  const canopyD = seatingDepth + canopyOverhang + 1.0;
  // Centre the canopy over the seating area
  const canopyCZ = seatingFrontZ - seatingDepth * 0.5 + canopyOverhang * 0.3;

  const canopy = MeshBuilder.CreateBox('stadiumCanopy', {
    width: width * 1.04,
    height: roofThick,
    depth: canopyD,
  }, scene);
  canopy.position = new Vector3(0, roofY + roofThick * 0.5, canopyCZ);
  canopy.material = brownRoofMat;
  canopy.parent = root;

  // Underside fascia
  const fascia = MeshBuilder.CreateBox('stadiumFascia', {
    width: width * 1.04,
    height: 0.1,
    depth: canopyD,
  }, scene);
  fascia.position = new Vector3(0, roofY - 0.05, canopyCZ);
  fascia.material = darkMat;
  fascia.parent = root;

  // Front edge lip of canopy
  const lip = MeshBuilder.CreateBox('stadiumCanopyLip', {
    width: width * 1.04,
    height: 0.25,
    depth: 0.15,
  }, scene);
  lip.position = new Vector3(0, roofY + roofThick * 0.5, canopyCZ + canopyD * 0.5);
  lip.material = darkMat;
  lip.parent = root;

  // ========================================
  // SUPPORT COLUMNS — steel pillars holding the canopy
  // ========================================

  const numCols = Math.max(4, Math.round(width / 6));
  const colSpacing = (width * 0.88) / (numCols - 1);
  const colStartX = -width * 0.44;
  const colZ = seatingFrontZ + rowStepD * 0.5 + 0.4; // just in front of seating
  const colH = roofY;
  const colR = 0.1;

  for (let c = 0; c < numCols; c++) {
    const cx = colStartX + c * colSpacing;

    // Vertical column
    const col = MeshBuilder.CreateCylinder(`stadiumCol_${c}`, {
      height: colH,
      diameter: colR * 2,
      tessellation: 8,
    }, scene);
    col.position = new Vector3(cx, colH * 0.5, colZ);
    col.material = steelMat;
    col.parent = root;

    // Angled brace from column top going backward under the canopy
    const braceLen = 3.0;
    const brace = MeshBuilder.CreateCylinder(`stadiumBrace_${c}`, {
      height: braceLen,
      diameter: colR * 1.5,
      tessellation: 6,
    }, scene);
    brace.position = new Vector3(cx, colH - 0.8, colZ - 1.2);
    brace.rotation.x = Math.PI * 0.25;
    brace.material = steelMat;
    brace.parent = root;
  }

  // ========================================
  // SIDE WALLS of seating area — white end-caps
  // ========================================

  for (const side of [-1, 1]) {
    const endcap = MeshBuilder.CreateBox(`stadiumEndcap_${side}`, {
      width: 0.2,
      height: seatingTotalH + roofClearance,
      depth: seatingDepth + 0.5,
    }, scene);
    endcap.position = new Vector3(
      side * halfW,
      groundFloorH + (seatingTotalH + roofClearance) * 0.5,
      seatingFrontZ - seatingDepth * 0.5,
    );
    endcap.material = whiteMat;
    endcap.parent = root;
  }

  // ========================================
  // FLOODLIGHT MASTS — at each end
  // ========================================

  const mastH = totalH * 1.6;

  for (const side of [-1, 1]) {
    const mx = side * (halfW + 1.5);

    const mast = MeshBuilder.CreateCylinder(`stadiumMast_${side}`, {
      height: mastH,
      diameterTop: 0.12,
      diameterBottom: 0.25,
      tessellation: 8,
    }, scene);
    mast.position = new Vector3(mx, mastH * 0.5, 0);
    mast.material = steelMat;
    mast.parent = root;

    const light = MeshBuilder.CreateBox(`stadiumLight_${side}`, {
      width: 1.2,
      height: 0.6,
      depth: 0.8,
    }, scene);
    light.position = new Vector3(mx, mastH + 0.3, 0);
    light.material = whiteMat;
    light.parent = root;
  }
}
