/**
 * Character configuration for runners and buses.
 *
 * Runners have pre-defined appearance presets (name + visual options).
 * Buses have selectable colours.
 *
 * These are the canonical definitions shared by the character select UI,
 * the 3D model builders, and multiplayer sync.
 */
import { Color3 } from '@babylonjs/core';

// ────────────────────────────────────────────
// Runner customisation types
// ────────────────────────────────────────────

export type HairStyle = 'bald' | 'short' | 'medium' | 'long' | 'ponytail';

export type HairColor =
  | 'dark'
  | 'blonde'
  | 'red'
  | 'lightBrown'
  | 'mediumBrown'
  | 'darkBrown'
  | 'black';

export type FacialHair = 'moustache' | 'stubble' | 'beard' | 'longBeard';

export type SkinTone =
  | 'veryLight'
  | 'light'
  | 'mediumLight'
  | 'medium'
  | 'mediumDark'
  | 'dark'
  | 'veryDark';

export type TopStyle = 'tshirt' | 'vest' | 'longSleeve';
export type BottomStyle = 'shorts' | 'trousers';

export interface RunnerAppearance {
  hat?: string;            // undefined = no hat, string = hat colour (CSS name or hex)
  hair: HairStyle;
  hairColor: HairColor;
  facialHair?: FacialHair;  // undefined = none
  skin: SkinTone;
  top: TopStyle;
  topColor: string;
  bottom: BottomStyle;
  bottomColor: string;
  socks?: string;          // optional sock colour (CSS name or hex); renders on lower 1/4 of leg
  heightScale?: number;    // optional height multiplier (default 1); e.g. 0.5 = half height, 1.2 = 20% taller
}

export interface RunnerPreset {
  id: string;              // unique stable key (lowercase, no spaces)
  name: string;            // display name
  appearance: RunnerAppearance;
}

// ────────────────────────────────────────────
// Bus colour types
// ────────────────────────────────────────────

export interface BusColorOption {
  id: string;              // unique stable key
  name: string;            // display label
  cssColor: string;        // for UI swatches
  bodyHex: string;         // hex colour for the 3D body
  roofHex: string;         // hex colour for the 3D roof (darker shade)
}

// ────────────────────────────────────────────
// Runner presets
// ────────────────────────────────────────────

export const RUNNER_PRESETS: RunnerPreset[] = [
  {
    id: 'josh',
    name: 'Josh',
    appearance: {
      hat: 'LightGrey',
      hair: 'bald',
      hairColor: 'lightBrown',
      facialHair: 'stubble',
      skin: 'light',
      top: 'vest',
      topColor: 'Red',
      bottom: 'shorts',
      bottomColor: '#000000',
      socks: '#ffffff',
    },
  },
  {
    id: 'keith',
    name: 'Keith',
    appearance: {
      hair: 'short',
      hairColor: 'darkBrown',
      facialHair: 'longBeard',
      skin: 'light',
      top: 'tshirt',
      topColor: '#333333',
      bottom: 'shorts',
      bottomColor: '#000000',
      socks: '#333333',
    },
  },
  {
    id: 'claire',
    name: 'Claire',
    appearance: {
      hair: 'medium',
      hairColor: 'blonde',
      skin: 'light',
      top: 'longSleeve',
      topColor: '#8030b0',
      bottom: 'trousers',
      bottomColor: '#000000',
    },
  },
  {
    id: 'alisa',
    name: 'Alisa',
    appearance: {
      hat: '#5391BE',
      hair: 'ponytail',
      hairColor: 'mediumBrown',
      skin: 'light',
      top: 'longSleeve',
      topColor: '#CDB1DC',
      bottom: 'shorts',
      bottomColor: '#000000',
      socks: '#ffffff',
    },
  },
  {
    id: 'eline',
    name: 'Eline',
    appearance: {
      hair: 'ponytail',
      hairColor: 'blonde',
      skin: 'light',
      top: 'tshirt',
      topColor: '#D2732C',
      bottom: 'shorts',
      bottomColor: '#000000',
      socks: '#ffffff',
    },
  },
  {
    id: 'rick',
    name: 'Rick',
    appearance: {
      hair: 'short',
      hairColor: 'mediumBrown',
      facialHair: 'beard',
      skin: 'light',
      top: 'tshirt',
      topColor: '#5641A0',
      bottom: 'shorts',
      bottomColor: '#000000',
      socks: '#ffffff',
    },
  },
  {
    id: 'sophie',
    name: 'Sophie',
    appearance: {
      hair: 'ponytail',
      hairColor: 'lightBrown',
      skin: 'light',
      top: 'tshirt',
      topColor: '#4CA853',
      bottom: 'shorts',
      bottomColor: '#000000',
    },
  },
  {
    id: 'anna',
    name: 'Anna',
    appearance: {
      hat: '#CCCCCC',
      hair: 'ponytail',
      hairColor: 'mediumBrown',
      skin: 'light',
      top: 'longSleeve',
      topColor: '#305E56',
      bottom: 'shorts',
      bottomColor: '#000000',
    },
  },
  {
    id: 'august',
    name: 'August',
    appearance: {
      hair: 'short',
      hairColor: 'darkBrown',
      skin: 'light',
      top: 'tshirt',
      topColor: '#2A3367',
      bottom: 'trousers',
      bottomColor: '#000000',
      heightScale: 1.1,
    },
  },
  {
    id: 'lyra',
    name: 'Lyra',
    appearance: {
      hair: 'ponytail',
      hairColor: 'lightBrown',
      skin: 'light',
      top: 'longSleeve',
      topColor: '#9D79B8',
      bottom: 'shorts',
      bottomColor: '#9D79B8',
      heightScale: 0.5,
      socks: '#E39CE4',
    },
  },
  {
    id: 'mikael',
    name: 'Mikael',
    appearance: {
      hair: 'short',
      hairColor: 'blonde',
      skin: 'light',
      top: 'tshirt',
      topColor: '#1B2968',
      bottom: 'trousers',
      bottomColor: '#000000',
    },
  },
  {
    id: 'adam',
    name: 'Adam',
    appearance: {
      hair: 'short',
      hairColor: 'blonde',
      skin: 'light',
      top: 'tshirt',
      topColor: '#E4E3E2',
      bottom: 'shorts',
      bottomColor: '#000000',
      heightScale: 1.2,
    },
  },
  {
    id: 'otherjosh',
    name: 'Other Josh',
    appearance: {
      hair: 'short',
      hairColor: 'red',
      skin: 'light',
      top: 'tshirt',
      topColor: '#68417C',
      bottom: 'trousers',
      bottomColor: '#000000',
    },
  }
];

/** Special "random runner" sentinel id. */
export const RANDOM_RUNNER_ID = '__random__';

// ────────────────────────────────────────────
// Bus colour options
// ────────────────────────────────────────────

export const BUS_COLOR_OPTIONS: BusColorOption[] = [
  { id: 'yellow',  name: 'Yellow',  cssColor: '#f0c820', bodyHex: '#f0c820', roofHex: '#d1a610' },
  { id: 'red',     name: 'Red',     cssColor: '#d94030', bodyHex: '#d94030', roofHex: '#b02e1e' },
  { id: 'blue',    name: 'Blue',    cssColor: '#3470d8', bodyHex: '#3470d8', roofHex: '#2352b3' },
  { id: 'purple',  name: 'Purple',  cssColor: '#9940cc', bodyHex: '#9940cc', roofHex: '#7328a6' },
  { id: 'orange',  name: 'Orange',  cssColor: '#e88020', bodyHex: '#e88020', roofHex: '#c06818' },
  { id: 'green',   name: 'Green',   cssColor: '#3aaa40', bodyHex: '#3aaa40', roofHex: '#2d8832' },
  { id: 'black',   name: 'Black',   cssColor: '#333333', bodyHex: '#333333', roofHex: '#1a1a1a' },
  { id: 'pink',    name: 'Pink',    cssColor: '#e868a8', bodyHex: '#e868a8', roofHex: '#c05088' },
];

// ────────────────────────────────────────────
// Colour look-up helpers (name → hex)
// ────────────────────────────────────────────

/** Map skin tone id → hex colour (for 3D model). */
export const SKIN_TONE_HEX: Record<SkinTone, string> = {
  veryLight:   '#fce4d4',
  light:       '#f5d6b8',
  mediumLight: '#dfb790',
  medium:      '#c29268',
  mediumDark:  '#8d6040',
  dark:        '#614028',
  veryDark:    '#3d2818',
};

/** Map hair colour id → hex. */
export const HAIR_COLOR_HEX: Record<HairColor, string> = {
  dark:        '#1a1a1a',
  blonde:      '#e8d070',
  red:         '#AA6732',
  lightBrown:  '#9a7850',
  mediumBrown: '#6b4c30',
  darkBrown:   '#3d2a18',
  black:       '#0a0a0a',
};

/** Map common colour names used in presets → hex. */
export const NAMED_COLORS: Record<string, string> = {
  Red:        '#d03030',
  Blue:       '#3060d0',
  Black:      '#111111',
  White:      '#f0f0f0',
  DarkGrey:   '#444444',
  LightGrey:  '#bbbbbb',
  Green:      '#30a040',
  Yellow:     '#f0c820',
  Orange:     '#e08020',
  Pink:       '#e060a0',
  Purple:     '#8030b0',
};

/** Resolve a colour name to hex (pass-through if already hex). */
export function resolveColor(name: string): string {
  if (name.startsWith('#')) return name;
  return NAMED_COLORS[name] ?? '#888888';
}

/** Convert a hex string like '#f0c820' to a BabylonJS Color3. */
export function hexToColor3(hex: string): Color3 {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return new Color3(r, g, b);
}

/** Look up a BusColorOption by id; returns undefined if not found. */
export function getBusColorById(id: string): BusColorOption | undefined {
  return BUS_COLOR_OPTIONS.find((o) => o.id === id);
}

/** Look up a RunnerPreset by id; returns undefined if not found. */
export function getRunnerPresetById(id: string): RunnerPreset | undefined {
  return RUNNER_PRESETS.find((p) => p.id === id);
}

/** Pick a random runner preset (excluding the RANDOM sentinel). */
export function pickRandomRunner(): RunnerPreset {
  return RUNNER_PRESETS[Math.floor(Math.random() * RUNNER_PRESETS.length)];
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ALL_TOP_COLORS = ['Red', 'Blue', 'Green', 'Orange', 'Purple', 'Pink', 'DarkGrey', 'Black', 'White', 'Yellow'];
const ALL_BOTTOM_COLORS = ['Black', 'DarkGrey', 'Blue'];
const HAIR_STYLES: HairStyle[] = ['bald', 'short', 'medium', 'long', 'ponytail'];
const HAIR_COLORS: HairColor[] = ['dark', 'blonde', 'red', 'lightBrown', 'mediumBrown', 'darkBrown', 'black'];
const FACIAL_HAIRS: FacialHair[] = ['moustache', 'stubble', 'beard', 'longBeard'];
const SKIN_TONES: SkinTone[] = ['veryLight', 'light', 'mediumLight', 'medium', 'mediumDark', 'dark', 'veryDark'];
const TOP_STYLES: TopStyle[] = ['tshirt', 'vest', 'longSleeve'];
const BOTTOM_STYLES: BottomStyle[] = ['shorts', 'trousers'];
const HAT_COLORS = ['Red', 'Blue', 'Black', 'White', 'DarkGrey', 'LightGrey', 'Green', 'Orange', 'Pink', 'Purple'];
const SOCK_COLORS = ['#ffffff', '#000000', '#dd3030', '#3060d0'];

/** Generate a completely random runner appearance. */
export function generateRandomAppearance(): RunnerAppearance {
  const appearance: RunnerAppearance = {
    hair: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    skin: pick(SKIN_TONES),
    top: pick(TOP_STYLES),
    topColor: pick(ALL_TOP_COLORS),
    bottom: pick(BOTTOM_STYLES),
    bottomColor: pick(ALL_BOTTOM_COLORS),
  };
  // 30% chance of facial hair
  if (Math.random() < 0.3) {
    appearance.facialHair = pick(FACIAL_HAIRS);
  }
  // 30% chance of hat
  if (Math.random() < 0.3) {
    appearance.hat = pick(HAT_COLORS);
  }
  // 40% chance of socks
  if (Math.random() < 0.4) {
    appearance.socks = pick(SOCK_COLORS);
  }
  return appearance;
}

/** Resolve a runner id to an appearance. Handles RANDOM_RUNNER_ID. */
export function resolveRunnerAppearance(runnerId: string): RunnerAppearance {
  if (runnerId === RANDOM_RUNNER_ID) {
    return generateRandomAppearance();
  }
  const preset = getRunnerPresetById(runnerId);
  return preset?.appearance ?? generateRandomAppearance();
}

// ────────────────────────────────────────────
// Selection state types (used by UI & sync)
// ────────────────────────────────────────────

export interface BusSelection {
  type: 'bus';
  busColorId: string;  // id from BUS_COLOR_OPTIONS
}

export interface RunnerSelection {
  type: 'runner';
  runnerId: string;    // id from RUNNER_PRESETS or RANDOM_RUNNER_ID
}

export type CharacterSelection = BusSelection | RunnerSelection;
