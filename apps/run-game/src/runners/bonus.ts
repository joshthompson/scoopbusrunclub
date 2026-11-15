import { runnerUnlocked } from '../saved/unlocked'
import type { Playable } from './playable'
import { YETI_SPRITE } from './yetiArt'

/**
 * Bonus runners: not club members, and not anyone's own, but found out on
 * the courses, and unlocked to run as by finding them. The Yeti, under
 * Everest, the first.
 */

export const YETI: Playable = {
	id: 'bonus:yeti',
	name: 'Yeti',
	bonus: true,
	sprite: YETI_SPRITE,
}

export const BONUS_RUNNERS: Playable[] = [YETI]

/** A bonus runner, by their runner id: unlocked here or not, to show anyone who's running as them. */
export const bonusRunner = (id: string) =>
	BONUS_RUNNERS.find((r) => r.id === id)

/** The bonus runners unlocked in this browser: who's to pick from. */
export const unlockedBonusRunners = () =>
	BONUS_RUNNERS.filter((runner) => runnerUnlocked(runner.id))
