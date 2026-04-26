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
  altitude: number[];
  water: LevelWaterFeature[];
  /** GPS positions [lat, lon] where course marshals stand */
  marshals?: [number, number][];
  /** Roads as line segments [lat, lon] */
  roads?: [number, number][][];
  /** Buildings as polygons of [lat, lon] points */
  buildings?: {
    type: 'grey' | 'red' | 'kristineberg';
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
   * Polygons (arrays of [lat, lon] points) where trees should NOT be spawned.
   * Each polygon is a closed ring — the last point connects back to the first.
   */
  noTreeZones?: [number, number][][];
}
