import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  SpotLight,
  type Mesh,
} from '@babylonjs/core';
import {
  FLOODLIGHT_PRIMARY_INTENSITY,
  FLOODLIGHT_PRIMARY_RANGE,
  FLOODLIGHT_PRIMARY_ANGLE,
  FLOODLIGHT_PRIMARY_EXPONENT,
  FLOODLIGHT_PRIMARY_COLOR_R,
  FLOODLIGHT_PRIMARY_COLOR_G,
  FLOODLIGHT_PRIMARY_COLOR_B,
  FLOODLIGHT_SOFT_INTENSITY,
  FLOODLIGHT_SOFT_RANGE,
  FLOODLIGHT_SOFT_ANGLE,
  FLOODLIGHT_SOFT_EXPONENT,
  FLOODLIGHT_SOFT_COLOR_R,
  FLOODLIGHT_SOFT_COLOR_G,
  FLOODLIGHT_SOFT_COLOR_B,
} from '../constants';

// ── Floodlight geometry constants ───────────────────────────────────────

const FL_MAST_H = 25; // metres — taller than stadium stand (~14m)
const FL_MAST_BOT_D = 0.4; // base diameter
const FL_MAST_TOP_D = 0.18; // top diameter
const FL_BASE_H = 0.5;
const FL_BASE_D = 1.4;
const FL_HOUSING_W = 2.0;
const FL_HOUSING_H = 0.8;
const FL_HOUSING_D = 1.2;
const FL_BRACKET_H = 1.2;
const FL_BRACKET_D = 0.1;

// ── Instanced template meshes ───────────────────────────────────────────

export interface FloodlightTemplates {
  base: Mesh;
  mast: Mesh;
  bracket: Mesh;
  housing: Mesh;
  lens: Mesh;
}

export function createFloodlightTemplates(scene: Scene): FloodlightTemplates {
  // --- Materials ---
  const steelMat = new StandardMaterial('flSteelMat', scene);
  steelMat.diffuseColor = new Color3(0.50, 0.52, 0.55);
  steelMat.specularColor = new Color3(0.15, 0.15, 0.15);

  const darkMat = new StandardMaterial('flDarkMat', scene);
  darkMat.diffuseColor = new Color3(0.12, 0.12, 0.14);
  darkMat.specularColor = new Color3(0.08, 0.08, 0.08);

  const lensMat = new StandardMaterial('flLensMat', scene);
  lensMat.diffuseColor = new Color3(1.0, 0.98, 0.9);
  lensMat.emissiveColor = new Color3(0.8, 0.75, 0.55);
  lensMat.specularColor = new Color3(0.3, 0.3, 0.2);
  lensMat.alpha = 0.9;

  // --- Geometry templates (invisible, used for instancing) ---

  const base = MeshBuilder.CreateCylinder('tpl_fl_base', {
    height: FL_BASE_H,
    diameterTop: FL_BASE_D * 0.85,
    diameterBottom: FL_BASE_D,
    tessellation: 8,
  }, scene);
  base.material = steelMat;
  base.isVisible = false;

  const mast = MeshBuilder.CreateCylinder('tpl_fl_mast', {
    height: FL_MAST_H,
    diameterTop: FL_MAST_TOP_D,
    diameterBottom: FL_MAST_BOT_D,
    tessellation: 8,
  }, scene);
  mast.material = steelMat;
  mast.isVisible = false;

  const bracket = MeshBuilder.CreateCylinder('tpl_fl_bracket', {
    height: FL_BRACKET_H,
    diameter: FL_BRACKET_D,
    tessellation: 6,
  }, scene);
  bracket.material = steelMat;
  bracket.isVisible = false;

  const housing = MeshBuilder.CreateBox('tpl_fl_housing', {
    width: FL_HOUSING_W,
    height: FL_HOUSING_H,
    depth: FL_HOUSING_D,
  }, scene);
  housing.material = darkMat;
  housing.isVisible = false;

  const lens = MeshBuilder.CreateBox('tpl_fl_lens', {
    width: FL_HOUSING_W * 0.85,
    height: 0.08,
    depth: FL_HOUSING_D * 0.8,
  }, scene);
  lens.material = lensMat;
  lens.isVisible = false;

  return { base, mast, bracket, housing, lens };
}

// ── Placement ───────────────────────────────────────────────────────────

/**
 * Place a single floodlight tower and optionally create SpotLights for night.
 */
export function placeFloodlight(
  tpl: FloodlightTemplates,
  scene: Scene,
  i: number,
  x: number,
  y: number,
  z: number,
  rotation: number,
  isNight: boolean,
): TransformNode {
  const root = new TransformNode(`floodlight_${i}`, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  // Base
  const b = tpl.base.createInstance(`fl_${i}_base`);
  b.position.y = FL_BASE_H / 2;
  b.parent = root;

  // Mast
  const m = tpl.mast.createInstance(`fl_${i}_mast`);
  m.position.y = FL_BASE_H + FL_MAST_H / 2;
  m.parent = root;

  // Bracket — tilts forward from top of mast to housing
  const topY = FL_BASE_H + FL_MAST_H;
  const br = tpl.bracket.createInstance(`fl_${i}_bracket`);
  br.position.set(0, topY - 0.1, 0);
  br.rotation.x = 0.3; // slight forward tilt
  br.parent = root;

  // Housing — sits at top of mast
  const housingY = topY + FL_HOUSING_H * 0.5 + 0.1;
  const h = tpl.housing.createInstance(`fl_${i}_housing`);
  h.position.set(0, housingY, 0);
  h.parent = root;

  // Lens — glowing underside of housing
  const l = tpl.lens.createInstance(`fl_${i}_lens`);
  l.position.set(0, housingY - FL_HOUSING_H * 0.5 - 0.04, 0);
  l.parent = root;

  // --- Actual lights (night mode) ---
  if (isNight) {
    const lightY = housingY - 0.1;

    // Primary bright spotlight — wide cone, very soft gradual falloff
    const primary = new SpotLight(
      `fl_${i}_primary`,
      new Vector3(0, lightY, 0),
      new Vector3(0, -1, 0.1),
      FLOODLIGHT_PRIMARY_ANGLE,
      FLOODLIGHT_PRIMARY_EXPONENT,
      scene,
    );
    primary.diffuse = new Color3(FLOODLIGHT_PRIMARY_COLOR_R, FLOODLIGHT_PRIMARY_COLOR_G, FLOODLIGHT_PRIMARY_COLOR_B);
    primary.intensity = FLOODLIGHT_PRIMARY_INTENSITY;
    primary.range = FLOODLIGHT_PRIMARY_RANGE;
    primary.parent = root;

    // Softer ambient wash — even wider, much further, very gentle
    const soft = new SpotLight(
      `fl_${i}_soft`,
      new Vector3(0, lightY, 0),
      new Vector3(0, -1, 0.05),
      FLOODLIGHT_SOFT_ANGLE,
      FLOODLIGHT_SOFT_EXPONENT,
      scene,
    );
    soft.diffuse = new Color3(FLOODLIGHT_SOFT_COLOR_R, FLOODLIGHT_SOFT_COLOR_G, FLOODLIGHT_SOFT_COLOR_B);
    soft.intensity = FLOODLIGHT_SOFT_INTENSITY;
    soft.range = FLOODLIGHT_SOFT_RANGE;
    soft.parent = root;
  }

  return root;
}
