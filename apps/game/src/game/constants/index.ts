import type { GameMode } from '../types';

export const MODE: GameMode = 'SCOOP_THEN_RIDE';

export const PATH_HALF_WIDTH = 5;
export const COURSE_TARGET_LENGTH = 5000;
export const ALTITUDE_EXAGGERATION = 2.5;
export const BUS_MAX_SPEED = 12 * 3;
export const BUS_ACCELERATION = 12;
export const BUS_BRAKE = 8;
export const BUS_FRICTION = 10;
export const COUNTDOWN_DURATION = 3.0;
export const BUS_TURN_SPEED = 1.08;
export const BUS_TURN_SPEED_STANDSTILL = 0.4;
export const RUNNER_COUNT = 30;
export const RUNNER_MIN_SPEED = 2.5;
export const RUNNER_MAX_SPEED = 4.5 * 2;
export const RUNNER_PLAYER_SPEED = RUNNER_MAX_SPEED + 2;
export const RUNNER_PLAYER_ACCELERATION = 8;
export const RUNNER_PLAYER_DECELERATION = 7;
export const RUNNER_PLAYER_ANIM_SPEED_FACTOR = 0.5;
export const RUNNER_PLAYER_TURN_SPEED = 2.6;
export const RUNNER_JUMP_HEIGHT = 3;
export const RUNNER_PLAYER_MAX_JUMPS = 2;
export const RUNNER_PLAYER_JUMP_SIDE_VELOCITY = 5.5;
export const RUNNER_COLLISION_RADIUS = 0.75;
export const SCOOP_DISTANCE = 3.5;
export const RUNNER_ESCAPE_DISTANCE = 60;
export const RUNNER_ESCAPE_SPEED = 2.5;
export const SCOOP_UP_FACTOR = 0.75;
export const SCOOP_MIN_UP = 10;
export const SCOOP_FORWARD_FACTOR = 0.5;
export const SCOOP_ANIM_DURATION = 0.35;
export const SCOOP_BOOST_DURATION = 2;
export const SCOOP_BOOST_MULTIPLIER = 2;
export const RUNNER_SIT_DURATION = 2.5;
export const GRAVITY = 20;
export const BUS_GRAVITY = 4;
export const BUS_JUMP_PITCH_THRESHOLD = 0.04;
export const BUS_START_OFFSET = 15;
export const START_CIRCLE_RADIUS = 15;
export const BUS_ROOF_Y = 2.85;
export const GATE_SPACING = 100;
export const GATE_RADIUS = 25;
export const POWER_UP_ITEM_SPACING = 250;
export const POWER_UP_ITEM_RESPAWN_SECONDS = 20;
export const POWER_UP_TOKEN_FLOAT_HEIGHT = 2.4;
export const POWER_UP_TOKEN_FLOAT_AMPLITUDE = 0.35;
export const POWER_UP_TOKEN_FLOAT_SPEED = 2.5;
export const POWER_UP_TOKEN_PICKUP_RADIUS = 1.2;
export const POWER_UP_TOKEN_RADIUS = 0.75;
export const POWER_UP_MIN_TOKEN_SPACING_METRES = 100;
export const POWER_UP_START_EXCLUSION_METRES = 100;
export const POWER_UP_ROLL_DURATION_MS = 1200;
export const POWER_UP_ROLL_STEP_MS = 90;
export const POWER_UP_FIKA_DURATION_SECONDS = 15;
export const POWER_UP_FIKA_SCALE_MULTIPLIER = 2;
export const POWER_UP_FIKA_SCALE_TRANSITION_SPEED = 8;
export const POWER_UP_FIKA_SPEED_MULTIPLIER = 1.5;
export const POWER_UP_FIKA_ANIM_SPEED_MULTIPLIER = 0.75;
export const POWER_UP_SHOE_DURATION_SECONDS = 30;
export const POWER_UP_SHOE_SPEED_MULTIPLIER = 2;
export const POWER_UP_ICE_RADIUS_METRES = 25;
export const POWER_UP_ICE_GROW_SECONDS = 0.5;
export const POWER_UP_ICE_DURATION_SECONDS = 30;
export const POWER_UP_ICE_FADE_SECONDS = 1;
export const POWER_UP_ICE_BASE_ALPHA = 0.4;
export const TREE_COUNT = 3000;
export const TREE_SPREAD = 200;
export const TREE_MIN_DIST_FROM_PATH = 8;
export const AUTO_DRIVE_SPEED = 10;
export const DEMO_CAMERA_SPEED = 10; // metres/s — title screen flyover speed
export const DRIFT_GRIP = 6;
export const DRIFT_HIGH_SPEED_GRIP_FACTOR = 0.45;
export const WATER_DRIFT_GRIP = 2.5;
export const WATER_BOB_AMPLITUDE = 0.12;
export const WATER_BOB_SPEED = 2.5;
export const WATER_SINK = 1.0;
// ---------- Runner social interactions ----------
export const WAVE_TRIGGER_DISTANCE = 12;       // metres – start waving when this close
export const HIGH_FIVE_TRIGGER_DISTANCE = 1.8;  // metres – switch to high-five
export const WAVE_DURATION = 2.0;               // seconds the wave animation plays
export const HIGH_FIVE_DURATION = 0.6;          // seconds the high-five freeze plays
export const INTERACTION_COOLDOWN = 4.0;         // seconds before same pair can interact again
export const INTERACTION_CLOSING_SPEED = 0.5;    // must be closing at ≥ this m/s

export const ELASTIC_SPRING_K = 12;
export const ELASTIC_DAMPING = 4;
export const ELASTIC_MAX_TILT = 0.55;
export const ELASTIC_SPEED_PENALTY = 0.4;
export const BUS_DOWNHILL_ACCEL_BOOST = 8;
export const BUS_DOWNHILL_SLOPE_THRESHOLD = -0.01;
export const RUNNER_DOWNHILL_SPEED_BOOST = 1.5;
export const RUNNER_DOWNHILL_SLOPE_THRESHOLD = -0.02;
export const BUS_COLLISION_RADIUS = 2.0;

// Engine vibration (body oscillates on the wheels)
export const ENGINE_VIBE_FREQUENCY = 3;   // Hz — fast idle-engine rumble
export const ENGINE_VIBE_AMPLITUDE = 0.03; // metres — subtle vertical shake

// ---------- Render / draw distance / LOD ----------
export const RENDER_PATH_MASK_RESOLUTION = 8192;
export const RENDER_TEXTURE_ANISOTROPY = 16;
export const RENDER_BUILDING_LOD_DISTANCE = 500;
export const RENDER_ANIMATION_CULL_DISTANCE = 500;
export const RENDER_OBJECTS_MAX_DISTANCE = 500;
export const RENDER_TREES_MAX_DISTANCE = 500;

// Re-export lighting constants so consumers can still import from './constants'
export * from './lighting';
