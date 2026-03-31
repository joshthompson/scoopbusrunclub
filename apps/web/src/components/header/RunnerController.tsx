import { createController, createObjectSignal, Scene } from "@/engine"
import { RUNNER_SIZE, runners, type RunnerState } from '@/data/runners'
import { css } from "@style/css"
import { Accessor } from "solid-js"

export const RUNNER_LABEL_RENDER_DISTANCE = 50

const STANDING_STATES: RunnerState[] = ['scanner']

export function isStandingState(state: RunnerState): boolean {
  return STANDING_STATES.includes(state)
}

/** Find a random x position that doesn't overlap any other standing-state runners */
function findNonOverlappingX(
  canvasWidth: number,
  myWidth: number,
  others: { x: number; width: number }[],
): number {
  const margin = 40
  // Start candidates in the 35-55% range of the canvas
  const rangeStart = canvasWidth * 0.35
  const rangeEnd = canvasWidth * 0.55 - myWidth
  for (let attempts = 0; attempts < 50; attempts++) {
    const candidate = rangeStart + Math.random() * (rangeEnd - rangeStart)
    const overlaps = others.some(
      o => candidate < o.x + o.width + margin && candidate + myWidth + margin > o.x,
    )
    if (!overlaps) return candidate
  }
  // Fallback: just pick a random position in the range
  return rangeStart + Math.random() * (rangeEnd - rangeStart)
}

export function createRunnerController(
  id: string,
  runnerId: keyof typeof runners,
  yShift: number,
  scene: Scene,
  mousePosition: Accessor<{ x: number, y: number }>,
) {
  const [runner] = runners[runnerId]
  let baseY = 124 + yShift

  return createController({
    frames: [...runner().frames.run],
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
        ...createObjectSignal(runner().frames.run, 'frames'),
        ...createObjectSignal(0, 'sitting'),
        ...createObjectSignal('run' as RunnerState, 'activeState'),
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
            .filter(({ dist }) => dist < RUNNER_LABEL_RENDER_DISTANCE)
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
              fontFamily: '"Jersey 10", sans-serif',
              fontSize: '12px',
              p: '0px 8px',
              width: 'max-content',
              borderRadius: '3px',
              cornerShape: 'notch',
            })}
            children={name + time}
          />
        },
      }
    },
    onEnterFrame({ $, $scene }) {
      const state: RunnerState = runner().runnerState ?? 'run'

      // Transition into/out of standing states
      if (state !== $.activeState()) {
        $.setActiveState(state)

        if (isStandingState(state)) {
          // Position for standing: fixed y of 150, non-overlapping x
          const otherStanding = $scene.getControllersByType<RunnerController>('runner')
            .filter(c => c.data.id !== id && isStandingState(c.data.activeState()))
            .map(c => ({ x: c.data.x(), width: c.data.width() }))
          $.setX(findNonOverlappingX($scene.canvas.get().width(), $.width(), otherStanding))
          $.setY(110)
          $.setScooped(false)
          $.setRotation(0)
        } else {
          // Returning to a moving state — reset y
          $.setY(baseY)
        }
      }

      // --- Standing states (scanner, etc.) ---
      if (isStandingState(state)) {
        if (state === 'scanner' && runner().frames.scanner) {
          $.setFrames(runner().frames.scanner!)
        }
        // No movement, no scooping — just render in place
        return
      }

      // --- Moving states (run, tail-walker) ---
      const isTailWalker = state === 'tail-walker'

      // If connected to another runner, follow them instead of running
      if (runner().connectedTo && !isStandingState(state)) {
        // const connectedController = $scene.getControllersByType<RunnerController>('runner').find(
        //   controller => controller.data.runnerId === runner().connectedTo,
        // )
        // if (connectedController) {
        //   $.setX(connectedController.data.x() + 28)
        //   if (!$.scooped() && !connectedController.data.scooped()) {
        //     $.setSitting(connectedController.data.sitting())
        //   }
        // }
      }

      // Sitting
      if ($.sitting() > 0) {
        $.setSitting($.sitting() - 1)
        const sitFrames = isTailWalker && runner().frames.tailSit
          ? runner().frames.tailSit!
          : runner().frames.sit
        $.setFrames(runner().frames.run.map(() => sitFrames[0]))
      }

      // Running
      else if (!$.scooped()) {
        if (isTailWalker && runner().frames.tailWalk) {
          $.setFrames(runner().frames.tailWalk!)
        } else {
          $.setFrames(runner().frames.run)
        }
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