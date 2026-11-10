import skeletonRunAsset from '@/assets/halloween/skeleton-run.png'
import { type RunnerName, runners } from '@/data/runners'
import { ZOMBIE_TINT } from '@/utils/halloween'
import { RUNNER_SCALE } from '../game/constants'
import type { Playable } from './playable'

/**
 * The website's Halloween skeleton, as a runner's sprite: its run, stepped
 * through as the website's header does (see `SkeletonRunners`). Like
 * everyone's, it runs left.
 */
export const SKELETON_SPRITE: Playable['sprite'] = {
	run: [0, 1, 2, 3].map(
		(n) => `${skeletonRunAsset}#${-23 * RUNNER_SCALE * n},0,92,29`,
	),
	width: 23,
	height: 29,
}

/**
 * Club members as Zombies, the website's way: their own zombie run, arms
 * out in front, for everyone who has one.
 */
const ZOMBIES: Playable['sprite'][] = (Object.keys(runners) as RunnerName[])
	.map((member) => runners[member][0]())
	.filter((runner) => runner.frames.zombie?.length)
	.map((runner) => ({
		run: runner.frames.zombie ?? [],
		width: runner.width,
		height: runner.height,
	}))

/** A Zombie's look, over that: the website's green, and glowing, to be seen at night. */
export const ZOMBIE_FILTER = `${ZOMBIE_TINT} drop-shadow(0 0 3px #8dff7a)`
/** A skeleton just glows. */
export const SKELETON_FILTER = 'drop-shadow(0 0 3px #8dff7a)'

/** Who a Zombie was: a club member, `who` picking which, or a skeleton. */
export function zombieSprite(zombie: { who: number; skeleton?: boolean }) {
	if (zombie.skeleton)
		return { sprite: SKELETON_SPRITE, filter: SKELETON_FILTER }
	return {
		sprite: ZOMBIES[zombie.who % ZOMBIES.length],
		filter: ZOMBIE_FILTER,
	}
}
