import type { LevelData } from '../types'
import course from './course'
import altitude from './altitude'
import water from './water'
import buildings from './buildings'
import paths from './paths'
import fences from './fences'
import roads from './roads'
import regions from './regions'
import trees from './trees'
import objects from './objects'
import trackUrl from '../../assets/track.png'

const level: LevelData = {
	id: 'kristineberg',
	name: 'Kristineberg',
	course,
	altitude,
	water,
	buildings,
	paths,
	roads,
	/** Fence sits 150m from the bounding circle (arena track) */
	fenceDistance: 150,
	/** Keep real-world 400m scale — don't stretch to 5km */
	targetLength: 400,
	kmSigns: false,
	parkrunSign: false,
	fences: false,
	customFences: fences,
	showMarshals: false,
	startCircle: false,
	minimapZoom: 4,
	pathTexture: trackUrl,
	regions,
	manualTrees: trees,
	objects,
	trees: false,
	timeOfDay: 'night',
}

export default level
