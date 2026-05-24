import shadowAsset from '@/assets/runners/shadow.png'
import { RUNNER_SIZE, guestRunners, runners } from '@/data/runners'
import { createController } from '@/engine'
import { type RunnerController, isStandingState } from './RunnerController'

export function createShadowController(id: string, runner: RunnerController) {
	const [runnerData] =
		runners[runner.data.runnerId as keyof typeof runners] ??
		guestRunners[runner.data.runnerId] ??
		[]
	if (!runnerData) return createController({ frames: [], init: () => ({ id, type: 'shadow', x: () => 0, y: () => 0, width: () => 0, height: () => 0 }) })
	const runnerJumpHeight = () => runner.data.baseY() - runner.data.y()
	const JUMP_SHADOW_SIZE = 100

	const sizeMultiplier = () => (runnerData().name === 'Lyra' ? 0.6 : 1)
	const xShift = () => (runnerData().name === 'Lyra' ? 6 : 0)

	return createController({
		frames: [shadowAsset],
		randomStartFrame: true,
		init() {
			return {
				id,
				type: 'shadow',
				x: () =>
					runner.data.x() -
					runnerJumpHeight() / (JUMP_SHADOW_SIZE * 2) +
					xShift(),
				y: () => runner.data.baseY() + runnerData().height + 20,
				width: () =>
					runnerData().width * RUNNER_SIZE * sizeMultiplier() +
					runnerJumpHeight() / JUMP_SHADOW_SIZE,
				height: () => 12,
				style: () => ({
					opacity: isStandingState(runner.data.activeState())
						? 0
						: 1 * Math.max(0, 1 - runnerJumpHeight() / (JUMP_SHADOW_SIZE * 4)),
				}),
			}
		},
	})
}
