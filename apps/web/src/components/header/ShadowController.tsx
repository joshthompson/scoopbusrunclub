import shadowAsset from '@/assets/runners/shadow.png'
import { RUNNER_SIZE, findRunnerSignal } from '@/data/runners'
import { createController } from '@/engine'
import { type RunnerController, isStandingState } from './RunnerController'

export function createShadowController(id: string, runner: RunnerController) {
	const [runnerData] = findRunnerSignal(runner.data.runnerId) ?? []
	if (!runnerData)
		return createController({
			frames: [],
			init: () => ({
				id,
				type: 'shadow',
				x: () => 0,
				y: () => 0,
				width: () => 0,
				height: () => 0,
			}),
		})
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
				// Just above their feet on the ground, however tall they're drawn.
				y: () => runner.data.ground() - 8,
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
