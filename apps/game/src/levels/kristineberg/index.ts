import type { LevelData } from '../types';
import course from './course.json';
import altitude from './altitude.json';
import water from './water.json';
import buildings from './buildings.json';
import paths from './paths.json';
import fences from './fences.json';
import roads from './roads.json';
import regions from './regions.json';
import trees from './trees.json';
import objects from './objects.json';
import trackUrl from '../../assets/track.png';

const level: LevelData = {
  id: 'kristineberg',
  name: 'Kristineberg',
  course: course as LevelData['course'],
  altitude,
  water: water as LevelData['water'],
  buildings: buildings as LevelData['buildings'],
  paths: paths as LevelData['paths'],
  roads: roads as LevelData['roads'],
  /** Fence sits 150m from the bounding circle (arena track) */
  fenceDistance: 150,
  /** Keep real-world 400m scale — don't stretch to 5km */
  targetLength: 400,
  kmSigns: false,
  parkrunSign: false,
  fences: false,
  customFences: fences as LevelData['customFences'],
  showMarshals: false,
  startCircle: false,
  minimapZoom: 4,
  pathTexture: trackUrl,
  regions: regions as LevelData['regions'],
  manualTrees: trees as LevelData['manualTrees'],
  objects: objects as LevelData['objects'],
  trees: false,
};

export default level;
