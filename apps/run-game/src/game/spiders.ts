import type { Course, Obstacle, SpiderLook } from '../courses/types'
import {
	SPIDER_BITE,
	SPIDER_BODY,
	SPIDER_FRAMES,
	SPIDER_HEAD,
	SPIDER_HEIGHT,
	SPIDER_SQUASHED,
	SPIDER_WIDTH,
} from '../draw/art/spider'
import type { ObstacleState, World } from './world'

/** The Caves' own spider: its picture, and where on it to land, or not to run into. */
const SPIDER: SpiderLook = {
	frames: SPIDER_FRAMES,
	squashed: SPIDER_SQUASHED,
	width: SPIDER_WIDTH,
	height: SPIDER_HEIGHT,
	head: SPIDER_HEAD,
	body: SPIDER_BODY,
	bite: SPIDER_BITE,
	word: 'Eek!',
}

/** A course's huge spiders' look: its own, if it has one (a triceratops), or The Caves'. */
export const spiderLook = (course: Pick<Course, 'look'>) =>
	course.look?.spider ?? SPIDER

/**
 * The Caves' huge spiders (see `Obstacle`'s `spider`): scuttling to and fro
 * along their `range`, from the start, by the race's clock, so the same on
 * every screen; or where the bus scooped them.
 */

type Spider = Extract<Obstacle, { kind: 'spider' }>

/** How fast one scuttles, a pixel a tick. */
const SPEED = 1.7

/**
 * Where a spider is, its middle, and which way it's going: right first,
 * from where it starts, and back, turning at the ends of its range.
 */
export function spiderAt(
	world: Pick<World, 'raceTicks' | 'course'>,
	state: Pick<ObstacleState, 'scooped'> & { obstacle: Spider },
) {
	const o = state.obstacle
	if (state.scooped?.x !== undefined)
		return { x: state.scooped.x, facing: -1 as const, walking: false }
	// Kept far enough in from the ends that all of it stays inside them.
	const { width } = spiderLook(world.course)
	const from = o.range[0] + width / 2
	const to = o.range[1] - width / 2
	const span = Math.max(1, to - from)
	const walked = SPEED * Math.max(0, world.raceTicks())
	const along = (((o.x - from + walked) % (span * 2)) + span * 2) % (span * 2)
	return along <= span
		? { x: from + along, facing: 1 as const, walking: true }
		: { x: from + span * 2 - along, facing: -1 as const, walking: true }
}
