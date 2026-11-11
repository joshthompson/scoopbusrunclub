import {
	BARCODE_BEFORE,
	BARCODE_HEIGHT,
	START_X,
	VIEW_HEIGHT,
} from '../game/constants'
import { platformAt } from '../game/platforms'
import { CAMERA_FOOTROOM, CAMERA_HEADROOM, MAX_ZOOM } from '../game/step'
import { caves } from './caves'
import { cityRooftop } from './cityRooftop'
import { cliff } from './cliff'
import { furbyFields } from './furbyFields'
import { gamlaStan } from './gamlaStan'
import { greatWall } from './greatWall'
import { haga } from './haga'
import { halloweenTown } from './halloweenTown'
import { huddinge } from './huddinge'
import { kristineberg } from './kristineberg'
import { machuPicchu } from './machuPicchu'
import { pyramids } from './pyramids'
import { scoopLine } from './scoopLine'
import { sewers } from './sewers'
import type { Course, CourseDefinition } from './types'

/**
 * How high a course can climb, from its lowest Ground to its highest
 * Platform: as much as a Round zoomed right out shows, less the room the
 * camera keeps above and below.
 */
export const MAX_CLIMB =
	VIEW_HEIGHT * MAX_ZOOM - CAMERA_HEADROOM - CAMERA_FOOTROOM

/** From its lowest Ground to its highest Platform, at any point in their swings. */
export function climbOf(course: CourseDefinition) {
	const { terrain } = course
	let low = Number.NEGATIVE_INFINITY
	let high = Number.POSITIVE_INFINITY
	for (let x = START_X; x <= terrain.finishX; x += 10) {
		if (terrain.inGap(x)) continue
		const y = terrain.groundY(x)
		low = Math.max(low, y)
		high = Math.min(high, y)
	}
	for (const platform of course.platforms ?? []) {
		const swing = platform.move?.ticks ?? 1
		for (let t = 0; t < swing; t += Math.max(1, swing / 16))
			high = Math.min(high, platformAt(terrain, platform, t).top)
	}
	return low - high
}

/**
 * Every course, in the order they're played, roughly easiest first: a
 * course's number is where it is here, so moving one is moving it in this
 * list.
 */
export const COURSES: Course[] = [
	haga,
	kristineberg,
	gamlaStan,
	huddinge,
	pyramids,
	halloweenTown,
	scoopLine,
	caves,
	greatWall,
	furbyFields,
	machuPicchu,
	sewers,
	cityRooftop,
	cliff,
].map((course, i) => {
	const climb = climbOf(course)
	// So a Round can always get everyone on the screen.
	if (climb > MAX_CLIMB)
		console.error(
			`${course.name} climbs ${Math.round(climb)} px: more than ${MAX_CLIMB}`,
		)
	return { ...course, boosts: withBarcode(course), number: i + 1 }
})

/** A parkrun's boosts, with its barcode token just before the finish, as at every parkrun. */
function withBarcode(course: CourseDefinition): Course['boosts'] {
	if (!course.parkrun) return course.boosts
	return [
		...course.boosts,
		{
			kind: 'barcode',
			x: course.terrain.finishX - BARCODE_BEFORE,
			height: BARCODE_HEIGHT,
		},
	]
}
