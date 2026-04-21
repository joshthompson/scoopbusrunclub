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
  hide?: boolean;
}
