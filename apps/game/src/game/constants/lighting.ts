// ---------- Lighting ----------

// Day — hemisphere light
export const LIGHT_DAY_HEMI_INTENSITY = 0.6;
export const LIGHT_DAY_HEMI_GROUND_R = 0.3;
export const LIGHT_DAY_HEMI_GROUND_G = 0.25;
export const LIGHT_DAY_HEMI_GROUND_B = 0.2;

// Day — directional sun
export const LIGHT_DAY_SUN_INTENSITY = 0.8;
export const LIGHT_DAY_SUN_DIR_X = -0.5;
export const LIGHT_DAY_SUN_DIR_Y = -1;
export const LIGHT_DAY_SUN_DIR_Z = 0.5;

// Night — hemisphere light (moonlit ambience)
export const LIGHT_NIGHT_HEMI_INTENSITY = 0.5;
export const LIGHT_NIGHT_HEMI_DIFFUSE_R = 0.22;
export const LIGHT_NIGHT_HEMI_DIFFUSE_G = 0.22;
export const LIGHT_NIGHT_HEMI_DIFFUSE_B = 0.35;
export const LIGHT_NIGHT_HEMI_GROUND_R = 0.10;
export const LIGHT_NIGHT_HEMI_GROUND_G = 0.10;
export const LIGHT_NIGHT_HEMI_GROUND_B = 0.16;

// Night — directional moonlight
export const LIGHT_NIGHT_SUN_INTENSITY = 0.25;
export const LIGHT_NIGHT_SUN_DIR_X = -0.3;
export const LIGHT_NIGHT_SUN_DIR_Y = -1;
export const LIGHT_NIGHT_SUN_DIR_Z = 0.6;
export const LIGHT_NIGHT_SUN_DIFFUSE_R = 0.20;
export const LIGHT_NIGHT_SUN_DIFFUSE_G = 0.20;
export const LIGHT_NIGHT_SUN_DIFFUSE_B = 0.32;

// Night — terrain shader lighting (baked into custom ground shader)
export const LIGHT_NIGHT_TERRAIN_SUN_INTENSITY = 0.12;
export const LIGHT_NIGHT_TERRAIN_HEMI_INTENSITY = 0.25;
export const LIGHT_NIGHT_TERRAIN_HEMI_GROUND_R = 0.06;
export const LIGHT_NIGHT_TERRAIN_HEMI_GROUND_G = 0.06;
export const LIGHT_NIGHT_TERRAIN_HEMI_GROUND_B = 0.10;

// Floodlight — primary (bright, focused downward)
export const FLOODLIGHT_PRIMARY_INTENSITY = 1.5;
export const FLOODLIGHT_PRIMARY_RANGE = 200;
export const FLOODLIGHT_PRIMARY_ANGLE = Math.PI * 0.8;    // ~144° wide cone
export const FLOODLIGHT_PRIMARY_EXPONENT = 0.3;           // soft gradual centre fade
export const FLOODLIGHT_PRIMARY_COLOR_R = 1.0;
export const FLOODLIGHT_PRIMARY_COLOR_G = 0.95;
export const FLOODLIGHT_PRIMARY_COLOR_B = 0.85;

// Floodlight — soft ambient wash (wider, dimmer, further)
export const FLOODLIGHT_SOFT_INTENSITY = 0.1;
export const FLOODLIGHT_SOFT_RANGE = 300;
export const FLOODLIGHT_SOFT_ANGLE = Math.PI * 0.95;      // nearly hemispherical
export const FLOODLIGHT_SOFT_EXPONENT = 0.1;              // extremely soft falloff
export const FLOODLIGHT_SOFT_COLOR_R = 0.85;
export const FLOODLIGHT_SOFT_COLOR_G = 0.82;
export const FLOODLIGHT_SOFT_COLOR_B = 0.7;
