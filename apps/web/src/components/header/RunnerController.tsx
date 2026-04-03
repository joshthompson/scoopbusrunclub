import { createController, createObjectSignal, Scene } from "@/engine"
import { RUNNER_SIZE, runners, type RunnerState } from '@/data/runners'
import { css } from "@style/css"
import { Accessor } from "solid-js"
import { createCameraFlashController } from "./CameraFlashController"

export const RUNNER_LABEL_RENDER_DISTANCE = 50

const STANDING_STATES: RunnerState[] = ['scanner', 'photographer', 'run-director']

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

  // 1. Must fit within 100% of the viewport
  const absStart = 0
  const absEnd = canvasWidth - myWidth

  // 3. Preferred range: 35-55% of viewport
  const prefStart = Math.max(absStart, canvasWidth * 0.35)
  const prefEnd = Math.min(absEnd, canvasWidth * 0.55 - myWidth)

  // Try preferred range first, then fall back to full viewport
  const ranges = prefEnd > prefStart
    ? [{ start: prefStart, end: prefEnd }, { start: absStart, end: absEnd }]
    : [{ start: absStart, end: absEnd }]

  for (const { start, end } of ranges) {
    if (end <= start) continue
    for (let attempts = 0; attempts < 50; attempts++) {
      const candidate = start + Math.random() * (end - start)
      // 2. Minimum 40px apart from others
      const overlaps = others.some(
        o => candidate < o.x + o.width + margin && candidate + myWidth + margin > o.x,
      )
      if (!overlaps) return candidate
    }
  }

  // Last resort: evenly distribute across the full viewport
  const totalCount = others.length + 1
  const slot = Math.round(canvasWidth / totalCount)
  const myIndex = others.length
  return Math.max(0, Math.min(absEnd, slot * myIndex + slot / 2 - myWidth / 2))
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
  let flashTriggered = false
  let flashCounter = 0
  const FLASH_PROXIMITY = 60

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
          const parts: string[] = []
          if (runner().latestTime && runnerId !== 'link') parts.push(runner().latestTime!)
          if (runner().volunteerRoles?.length) parts.push(...runner().volunteerRoles!)
          const suffix = parts.length ? ` - ${parts.join(', ')}` : ''
          
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
            children={name + suffix}
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

      // --- Standing states (scanner, photographer, etc.) ---
      if (isStandingState(state)) {
        if (state === 'scanner' && runner().frames.scanner) {
          $.setFrames(runner().frames.scanner!)
        }
        if (state === 'photographer' && runner().frames.photographer) {
          $.setFrames(runner().frames.photographer!)
        }
        if (state === 'run-director' && runner().frames.runDirector) {
          $.setFrames(runner().frames.runDirector!)
        }
        // No movement, no scooping — just render in place
        return
      }

      // --- Moving states (run, tail-walker) ---
      const isTailWalker = state === 'tail-walker'

      // If connected to another runner, follow them instead of running
      if (runner().connectedTo && !isStandingState(state)) {
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
        flashTriggered = false
      }

      // Camera flash: when this runner passes a photographer, trigger a flash
      if (!flashTriggered && !$.scooped()) {
        const photographers = $scene.getControllersByType<RunnerController>('runner')
          .filter(c => c.data.id !== id && c.data.activeState() === 'photographer')

        for (const photographer of photographers) {
          const dx = Math.abs($.x() + $.width() / 2 - (photographer.data.x() + photographer.data.width() / 2))
          if (dx < FLASH_PROXIMITY) {
            flashTriggered = true
            const flashX = photographer.data.x() + photographer.data.width() / 2
            const flashY = photographer.data.y() + photographer.data.height() * 0.3
            const flashId = `flash-${id}-${flashCounter++}`
            $scene.addController(createCameraFlashController(flashId, flashX, flashY))
            break
          }
        }
      }
    }
  })
}

export type RunnerController = ReturnType<typeof createRunnerController>