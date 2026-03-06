import { createController, createObjectSignal } from "@/engine"
import { RUNNER_SIZE, runners } from "./data"

export function createRunnerController(id: string, runnerId: keyof typeof runners, yShift = 0) {
  const runner = runners[runnerId]

  let baseY = 125 + yShift

  return createController({
    frames: [...runner.frames],
    randomStartFrame: true,
    init() {
      return {
        id,
        type: 'runner',
        state: () => 'play',
        runnerId,
        frameInterval: () => runner.frameInterval,
        ...createObjectSignal(1000 * Math.random(), 'x'),
        ...createObjectSignal(baseY, 'y'),
        ...createObjectSignal(baseY, 'baseY'),
        ...createObjectSignal(0, 'rotation'),
        ...createObjectSignal(0, 'ySpeed'),
        ...createObjectSignal(false, 'scooped'),
        ...createObjectSignal(runner.frames, 'frames'),
        ...createObjectSignal(0, 'sitting'),
        width: () => runner.width * RUNNER_SIZE,
        height: () => runner.height * RUNNER_SIZE,
      }
    },
    onEnterFrame({ $, $scene }) {
      // If connected to another runner, follow them instead of running
      if (runner.connectedTo) {
        const connectedController = $scene.getControllersByType<RunnerController>('runner').find(
          controller => controller.data.runnerId === runner.connectedTo,
        )
        if (connectedController) {
          $.setX(connectedController.data.x() + 28)
          if (!$.scooped() && !connectedController.data.scooped()) {
            $.setSitting(connectedController.data.sitting())
          }
        }
      }

      // Sitting
      if ($.sitting() > 0) {
        $.setSitting($.sitting() - 1)
        $.setFrames(runner.frames.map(() => runner.sitFrames[0]))
      }

      // Running
      else if (!$.scooped()) {
        $.setFrames(runner.frames)
        $.setX($.x() - runner.speed * (1 + Math.random() * 0.4))
        $.setRotation(Math.random() * 3 - 0.5)
      }

      // Scooped
      else {
        $.setY($.y() + $.ySpeed())
        $.setYSpeed($.ySpeed() + 3)

        // If hit the ground, reset
        if ($.y() >= $.baseY()) {
          $.setY($.baseY())
          $.setScooped(false)
          $.setSitting(Math.random() * 30 + 30)
        }
      }

      if ($.x() < -100) {
        $.setX($scene.canvas.get().width + Math.random() * 300)
        $.setY(baseY)
      }
    }
  })
}

export type RunnerController = ReturnType<typeof createRunnerController>