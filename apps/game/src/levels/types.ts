export interface LevelCourse {
  eventId: string;
  coordinates: number[][]; // [[lon, lat, alt], ...]
  points: { name: string; coordinates: number[] }[];
}

export interface LevelWaterFeature {
  coords: [number, number][];
  type: 'water' | 'river';
}

export interface LevelData {
  id: string;
  name: string;
  course: LevelCourse;
  /** Altitude samples as [lat, lon, alt][] — independent of course coordinates */
  altitude: [number, number, number][];
  /** Optional alternative course (same map, different route) */
  altCourse?: LevelCourse;
  water: LevelWaterFeature[];
  /** GPS positions [lat, lon] where course marshals stand */
  marshals?: [number, number][];
  /** Roads as line segments [lat, lon] */
  roads?: [number, number][][];
  /** Buildings as polygons of [lat, lon] points */
  buildings?: {
    type: 'grey' | 'red' | 'green' | 'yellow' | 'kristineberg';
    height?: number;
    points: [number, number][];
  }[];
  /** Paths/trails as polylines of [lat, lon] points */
  paths?: {
    type: 'footway' | 'cycleway' | 'path' | 'track' | 'steps' | 'bridleway';
    points: [number, number][];
  }[];
  /**
   * Distance in metres from the track to place the boundary fence.
   * Defaults to 500m if not specified. Set to a smaller value for arena levels.
   */
  fenceDistance?: number;
  /**
   * Override the scaled course length (metres). Defaults to COURSE_TARGET_LENGTH (5000).
   * Set to a real-world value (e.g. 400) for short tracks that shouldn't be stretched.
   */
  targetLength?: number;
  /** Disable procedural tree generation (default true) */
  trees?: boolean;
  /** Disable km marker signs along the course (default true) */
  kmSigns?: boolean;
  /** Disable the parkrun start-line sign (default true) */
  parkrunSign?: boolean;
  /** Disable boundary fences (default true) */
  fences?: boolean;
  /** Disable the large starting circle behind the start line (default true) */
  startCircle?: boolean;
  /**
   * Time of day for the level. Affects skybox and lighting.
   * Defaults to 'day' if not specified.
   */
  timeOfDay?: 'day' | 'night';
  /** Disable course marshals (default true) */
  showMarshals?: boolean;
  /**
   * Asset path for the running-path terrain texture.
   * If set, replaces the default dirt texture on the path surface.
   * Use an import like: `import trackUrl from '../assets/track.png'`
   */
  pathTexture?: string;
  /**
   * Custom fence polygons defined as arrays of [lat, lon] points.
   * Used to block off specific regions within a level (e.g. palace grounds).
   */
  customFences?: {
    points: [number, number][];
  }[];
  /**
   * Minimap zoom multiplier. Default is 1. Values > 1 zoom in (show less area).
   * e.g. 4 = 4× closer than the default 500 m view radius.
   */
  minimapZoom?: number;
  hide?: boolean;
  /**
   * Region polygons grouped by terrain type.
   * Each sub-key is an array of polygons (arrays of [lat, lon] points).
   * Fields stop random tree spawns and use field texture.
   * Concrete uses a hard surface texture.
   */
  regions?: LevelRegions;
  /**
   * Manually placed trees as [lat, lon] positions.
   */
  manualTrees?: [number, number][];
  /**
   * Placed objects — each sub-key is an array of [lat, lon, rotation]
   * where rotation is compass heading in degrees (0 = north, 90 = east).
   */
  objects?: LevelObjects;
}

export interface LevelRegions {
  /** Open grass fields — stops random tree spawns, uses field texture */
  fields?: [number, number][][];
  /** Hard concrete/paved areas — uses concrete texture */
  concrete?: [number, number][][];
}

export interface LevelObjects {
  /** Park benches */
  benches?: [number, number, number][];
  /** Street lampposts */
  lampposts?: [number, number, number][];
  /** Tennis courts */
  tennisCourts?: [number, number, number][];
  /** Tall floodlight towers with spotlights */
  floodlights?: [number, number, number][];
}
