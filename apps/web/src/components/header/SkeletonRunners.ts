import skeletonRunAsset from '@/assets/halloween/skeleton-run.png'
import skeletonSitAsset from '@/assets/halloween/skeleton-sit.png'
import {
	FRAME_COUNT,
	RUNNER_SIZE,
	type RunnerData,
	skeletonRunners,
} from '@/data/runners'
import type { Scene } from '@/engine'
import { type Accessor, createSignal } from 'solid-js'
import { addToPath } from './PathOrder'
import {
	type RunnerController,
	createRunnerController,
} from './RunnerController'
import { createShadowController } from './ShadowController'

/** How many skeletons run in Halloween mode. */
const SKELETON_COUNT = 5

/**
 * The slowest and fastest skeleton, on the club's own scale (18:00 is 4,
 * 36:00 is 2). The rest are spread evenly between, so the pack strings out
 * along the path rather than running as one clump.
 */
const SLOWEST_SKELETON = 2.2
const FASTEST_SKELETON = 3.8

const skeletonSpeeds = Array.from(
	{ length: SKELETON_COUNT },
	(_, i) =>
		SLOWEST_SKELETON +
		((FASTEST_SKELETON - SLOWEST_SKELETON) * i) /
			Math.max(1, SKELETON_COUNT - 1),
)

/** Whether a runner is one of Halloween's skeletons rather than a person. */
export function isSkeleton(runnerId: string) {
	return runnerId in skeletonRunners
}

/**
 * The run cycle, stepped through with negative offsets rather than
 * `generateFrames`' positive ones. Those rely on the background wrapping round
 * at exactly four frames' width, so a sheet saved a few pixels narrower or
 * wider would land every frame a little off and show a sliver of the next one.
 * Stepping left from the start doesn't care how wide the sheet is.
 */
const runFrames = Array.from(
	{ length: FRAME_COUNT },
	(_, n) =>
		`${skeletonRunAsset}#${-23 * RUNNER_SIZE * n},0,${23 * FRAME_COUNT},29`,
)

/**
 * Register the skeletons, the first time they're needed. They're drawn the same
 * size as Josh, and have no head point, so nobody puts a pumpkin on a skull.
 */
function registerSkeletons() {
	skeletonSpeeds.forEach((speed, i) => {
		const key = `skeleton_${i}`
		if (skeletonRunners[key]) return
		skeletonRunners[key] = createSignal<RunnerData>({
			name: 'Skeleton',
			id: key,
			birthday: '01/01',
			joined: -1,
			frames: {
				run: runFrames,
				// Already dead.
				zombie: undefined,
				sit: [skeletonSitAsset],
				face: undefined,
				tailWalk: undefined,
				tailSit: undefined,
				scanner: undefined,
				photographer: undefined,
				runDirector: undefined,
				marshal: undefined,
				volunteerGeneric: undefined,
				numberChecker: undefined,
			},
			width: 23,
			height: 29,
			speed,
			frameInterval: 186 - 31 * speed,
		})
	})
}

/**
 * Put the skeletons out on the path in Halloween mode, among the runners at
 * the depth their feet put them, or take them away again. Safe to call
 * whenever: it only adds the ones that aren't already out.
 */
export function syncSkeletons(
	scene: Scene,
	on: boolean,
	mousePosition: Accessor<{ x: number; y: number }>,
) {
	const out = scene
		.getControllersByType<RunnerController>('runner')
		.filter((runner) => isSkeleton(runner.data.runnerId))

	if (!on) {
		if (!out.length) return
		// Their shadows go with them; their ids are made from the runner's.
		const leaving = new Set(out.flatMap(({ id }) => [id, `shadow-${id}`]))
		scene.controllers.set(
			scene.controllers.get().filter(({ id }) => !leaving.has(id)),
		)
		return
	}

	registerSkeletons()
	const there = new Set(out.map((runner) => runner.data.runnerId))
	const joining = Object.keys(skeletonRunners)
		.filter((key) => !there.has(key))
		.map((key) =>
			createRunnerController(
				`runner-${key}`,
				key,
				Math.ceil(Math.random() * 30),
				scene,
				mousePosition,
			),
		)
	if (!joining.length) return

	addToPath(
		scene,
		joining,
		joining.map((runner) =>
			createShadowController(`shadow-${runner.data.id}`, runner),
		),
	)
}
