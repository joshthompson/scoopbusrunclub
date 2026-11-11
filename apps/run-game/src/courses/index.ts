import {
	BARCODE_BEFORE,
	BARCODE_HEIGHT,
	ROUND_BUS_LEASH_MAX,
	START_X,
	VIEW_HEIGHT,
} from '../game/constants'
import { platformAt } from '../game/platforms'
import { CAMERA_FOOTROOM, CAMERA_HEADROOM, MAX_ZOOM } from '../game/step'
import { caves } from './caves'
import { cityRooftop } from './cityRooftop'
import { cliff } from './cliff'
import { everest } from './everest'
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
 * How high a course can climb within a Round's reach, from the lowest
 * Ground to the highest Platform: as much as a Round zoomed right out
 * shows, less the room the camera keeps above and below.
 */
export const MAX_CLIMB =
	VIEW_HEIGHT * MAX_ZOOM - CAMERA_HEADROOM - CAMERA_FOOTROOM

/**
 * How far apart along the course everyone in a Round can be: anyone further
 * back than the bus's leash, it's got.
 */
const ROUND_REACH = ROUND_BUS_LEASH_MAX

/**
 * The most it climbs within a Round's reach, from its lowest Ground to its
 * highest Platform, at any point in their swings: what a Round's camera has
 * to fit in, all at once. A mountain can climb much more than this all
 * told, just not all in one go.
 */
export function climbOf(course: CourseDefinition) {
	const { terrain } = course
	const SAMPLE = 10
	/** The lowest and highest of anything to stand on, every `SAMPLE` px. */
	const lows: number[] = []
	const highs: number[] = []
	for (let x = START_X; x <= terrain.finishX; x += SAMPLE) {
		const y = terrain.inGap(x) ? undefined : terrain.groundY(x)
		lows.push(y ?? Number.NEGATIVE_INFINITY)
		highs.push(y ?? Number.POSITIVE_INFINITY)
	}
	for (const platform of course.platforms ?? []) {
		const swing = platform.move?.ticks ?? 1
		for (let t = 0; t < swing; t += Math.max(1, swing / 16)) {
			const at = platformAt(terrain, platform, t)
			const i = Math.round((at.left - START_X) / SAMPLE)
			const j = Math.round((at.right - START_X) / SAMPLE)
			for (let k = Math.max(0, i); k <= Math.min(highs.length - 1, j); k++)
				highs[k] = Math.min(highs[k], at.top)
		}
	}
	const reach = Math.round(ROUND_REACH / SAMPLE)
	let most = 0
	for (let i = 0; i < lows.length; i++) {
		let low = Number.NEGATIVE_INFINITY
		let high = Number.POSITIVE_INFINITY
		for (let k = i; k < Math.min(lows.length, i + reach); k++) {
			low = Math.max(low, lows[k])
			high = Math.min(high, highs[k])
		}
		most = Math.max(most, low - high)
	}
	return most
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
	everest,
].map((course, i) => {
	const climb = climbOf(course)
	// So a Round can always get everyone on the screen.
	if (climb > MAX_CLIMB)
		console.error(
			`${course.name} climbs ${Math.round(climb)} px in a Round's reach: more than ${MAX_CLIMB}`,
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
