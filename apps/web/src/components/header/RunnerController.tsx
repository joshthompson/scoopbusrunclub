import { createController, createObjectSignal, Scene } from "@/engine"
import { RUNNER_SIZE, runners } from "./runners"
import { css } from "@style/css"
import { Accessor } from "solid-js"

const LABEL_RENDER_DISTANCE = 100

export function createRunnerController(
  id: string,
  runnerId: keyof typeof runners,
  yShift: number,
  scene: Scene,
  mousePosition: Accessor<{ x: number, y: number }>,
) {
  const [runner] = runners[runnerId]
  let baseY = 125 + yShift

  return createController({
    frames: [...runner().frames],
    randomStartFrame: true,
    init() {
      const { x, setX } = createObjectSignal(scene.canvas.get().width() * Math.random(), 'x')
      const { y, setY } = createObjectSignal(baseY, 'y')
      const width = () => runner().width * RUNNER_SIZE
      const height = () => runner().height * RUNNER_SIZE
      return {
        id,
        type: 'runner',
        state: () => 'play',
        runnerId,
        frameInterval: () => runner().frameInterval,
        x, setX,
        y, setY,
        ...createObjectSignal(baseY, 'baseY'),
        ...createObjectSignal(0, 'rotation'),
        ...createObjectSignal(0, 'ySpeed'),
        ...createObjectSignal(false, 'scooped'),
        ...createObjectSignal(runner().frames, 'frames'),
        ...createObjectSignal(0, 'sitting'),
        width,
        height,
        children: () => {
          const closest = scene.getControllersByType<RunnerController>('runner')
            .map(c => ({
              id: c.data.id,
              dist: Math.hypot(
                c.data.x() + c.data.width() / 2 - mousePosition().x,
                c.data.y() + c.data.height() / 2 - mousePosition().y
              )
            }))
            .filter(({ dist }) => dist < LABEL_RENDER_DISTANCE)
            .sort((a, b) => a.dist - b.dist)[0]

          const name = runner().name
          const time = runner().latestTime && runnerId !== 'link' ? ` - ${runner().latestTime}` : ''
          
          return <div
            style={{
              display: closest?.id === id ? 'block' : 'none',
              transform:
                runnerId === 'lyra' || runnerId === 'link'
                  ? 'translate(-50%, -50%)'
                  : 'translate(-50%, -150%)'
            }}
            class={css({
              position: 'absolute',
              background: 'black',
              left: '50%',
              color: 'white',
              fontFamily: '"Pixelify Sans", sans-serif',
              fontSize: '12px',
              p: '0px 8px',
              width: 'max-content',
            })}
            children={name + time}
          />
        },
      }
    },
    onEnterFrame({ $, $scene }) {
      // If connected to another runner, follow them instead of running
      if (runner().connectedTo) {
        const connectedController = $scene.getControllersByType<RunnerController>('runner').find(
          controller => controller.data.runnerId === runner().connectedTo,
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
        $.setFrames(runner().frames.map(() => runner().sitFrames[0]))
      }

      // Running
      else if (!$.scooped()) {
        $.setFrames(runner().frames)
        $.setX($.x() - runner().speed * (1 + Math.random() * 0.4))
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
        $.setX($scene.canvas.get().width() + 50 + Math.random() * 50)
        $.setY(baseY)
      }
    }
  })
}

export type RunnerController = ReturnType<typeof createRunnerController>