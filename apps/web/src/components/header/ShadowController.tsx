import { createController } from "@/engine"
import { RUNNER_SIZE, runners } from "./runners"
import shadowAsset from "@/assets/runners/shadow.png"
import { RunnerController } from "./RunnerController"

export function createShadowController(id: string, runner: RunnerController) {
  const [runnerData] = runners[runner.data.runnerId]
  const runnerJumpHeight = () => runner.data.baseY() - runner.data.y()
  const JUMP_SHADOW_SIZE = 100

  return createController({
    frames: [shadowAsset],
    randomStartFrame: true,
    init() {
      return {
        id,
        type: 'shadow',
        x: () => runner.data.x() - runnerJumpHeight() / (JUMP_SHADOW_SIZE * 2),
        y: () => runner.data.baseY() + runnerData().height + 20,
        width: () => runnerData().width * RUNNER_SIZE + runnerJumpHeight() / JUMP_SHADOW_SIZE,
        height: () => 12,
        style: () => ({ opacity: 0.1 * Math.max(0, 1 - runnerJumpHeight() / (JUMP_SHADOW_SIZE * 4)) }),
      }
    },
  })
}
