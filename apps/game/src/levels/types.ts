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
    type: 'grey' | 'red';
    height?: number;
    points: [number, number][];
  }[];
  /** Paths/trails as polylines of [lat, lon] points */
  paths?: {
    type: 'footway' | 'cycleway' | 'path' | 'track' | 'steps' | 'bridleway';
    points: [number, number][];
  }[];
  hide?: boolean;
}
