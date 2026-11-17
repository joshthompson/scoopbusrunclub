import type { Medal } from '../game/medals'
import { COURSES } from './index'

/**
 * Endless's goals: three, a medal each, for how many courses one run gets
 * through: bronze for five, silver for halfway, however many courses there
 * are by then, and gold for every one, which unlocks a bonus runner too
 * (see `BONNIE_BOTTLE`). Its medal saved under `ENDLESS`, where a
 * course's is under its id.
 */

/** Endless's id, where its medal is saved. */
export const ENDLESS = 'endless'

/** How many courses one run has to get through for each medal. */
export const ENDLESS_MEDAL_COURSES: Record<Medal, number> = {
	bronze: Math.min(5, COURSES.length),
	silver: Math.ceil(COURSES.length / 2),
	gold: COURSES.length,
}

/** The medal a run of Endless that's got through `cleared` courses gets, if any. */
export function endlessMedalFor(cleared: number): Medal | undefined {
	return cleared >= ENDLESS_MEDAL_COURSES.gold
		? 'gold'
		: cleared >= ENDLESS_MEDAL_COURSES.silver
			? 'silver'
			: cleared >= ENDLESS_MEDAL_COURSES.bronze
				? 'bronze'
				: undefined
}

/** Each of its goals, said, worst to best: what each medal's for. */
export const ENDLESS_GOALS: { medal: Medal; goal: string }[] = [
	{ medal: 'bronze', goal: `Beat ${ENDLESS_MEDAL_COURSES.bronze} courses` },
	{
		medal: 'silver',
		goal: `Make it halfway (${ENDLESS_MEDAL_COURSES.silver} courses)`,
	},
	{ medal: 'gold', goal: 'Finish every course' },
]
