import { PILE } from '../courses/kit/huddingeScenery'
import { play } from '../sfx'
import type { World } from './world'

/**
 * A forest harvester at work (see `CourseLook['harvester']`): when it
 * starts, and what's heard as it goes. Only to be seen and heard: nobody
 * runs into it. Drawn by `draw/harvester.ts`, from `harvesterAt`.
 */

/** How far short of its tree whoever's in front is when it starts: just before it's on the screen. */
export const HARVESTER_STARTS = 650
/** How long each part takes, in ticks: sawing through, the tree falling, and cutting each log. */
export const HARVESTER_SAW_TICKS = 36
export const HARVESTER_FALL_TICKS = 48
export const HARVESTER_LOG_TICKS = 36
/** How many logs it cuts the tree into: one for each spot on its pile. */
export const HARVESTER_LOGS = PILE.length
/** When the tree hits the ground, and it starts feeding it through, cutting it up. */
export const HARVESTER_FEEDING_FROM = HARVESTER_SAW_TICKS + HARVESTER_FALL_TICKS
/** When it's done: the tree all cut up, only its stump left. */
export const HARVESTER_DONE =
	HARVESTER_FEEDING_FROM + HARVESTER_LOGS * HARVESTER_LOG_TICKS
/** How far into cutting each log its saw goes through it, heard. */
const LOG_CUT = HARVESTER_LOG_TICKS - 20

/**
 * Started, once whoever's racing in front is near enough, with its chainsaw
 * through the trunk; then, by the tick, the tree hitting the ground, and its
 * saw through each log.
 */
export function stepHarvester(world: World) {
	const own = world.course.look?.harvester
	if (!own) return
	const now = world.ticks()
	if (world.harvesterAt === undefined) {
		if (
			now >= 0 &&
			world.racers.some((r) => !r.out && r.body.x > own.x - HARVESTER_STARTS)
		) {
			world.harvesterAt = now
			play('chainsaw')
		}
		return
	}
	const t = now - world.harvesterAt
	if (t === HARVESTER_FEEDING_FROM) play('timber')
	for (let i = 0; i < HARVESTER_LOGS; i++)
		if (t === HARVESTER_FEEDING_FROM + i * HARVESTER_LOG_TICKS + LOG_CUT)
			play('logCut')
}
