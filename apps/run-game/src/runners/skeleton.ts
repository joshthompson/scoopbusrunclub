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

/**
 * A Zombie's look, over that: the website's tint, a hue-rotate. Their zombie
 * run's already green, so no glow on top.
 */
export const ZOMBIE_FILTER = ZOMBIE_TINT

/** Who a Zombie was: a club member, `who` picking which, or a skeleton. */
export function zombieSprite(zombie: { who: number; skeleton?: boolean }) {
	if (zombie.skeleton)
		// As it is: white bones, no glow.
		return { sprite: SKELETON_SPRITE, filter: undefined }
	return {
		sprite: ZOMBIES[zombie.who % ZOMBIES.length],
		filter: ZOMBIE_FILTER,
	}
}
