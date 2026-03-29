import { createConnectedController, createController, Scene } from '@/engine'
import { createObjectSignal } from '@/engine'

import busBackAsset from '@/assets/bus/bus-back.png'
import busAsset from '@/assets/bus/bus.png'
import wheel1Asset from '@/assets/bus/wheel1.png'
import wheel2Asset from '@/assets/bus/wheel2.png'
import wheel3Asset from '@/assets/bus/wheel3.png'
import wheel4Asset from '@/assets/bus/wheel4.png'
import scoopAsset from '@/assets/bus/scoop.png'
import windowAsset from '@/assets/bus/windows.png'
import shadowAsset from '@/assets/bus/shadow.png'
import { type RunnerController } from './RunnerController'

const BUS_SPEED = 10
const SCOOP_SPEED = 50
const SCOOP_DURATION = 125
const MIN_BUS_START_X = 1100
const MIN_BUS_OFFSCREEN_PX = 250

export function createBusController(id: string, scene: Scene) {

  const startX = Math.max(scene.canvas.get().width() + 22, MIN_BUS_START_X) // 22 is the width of the scoop, which is the leftmost part of the bus
  const endX = -247 // 247 is the width of the bus, which is the rightmost part of the bus

  const baseY = 58
  const bus = createController({
    frames: [busBackAsset],
    init() {
      return {
        id,
        type: 'bus',
        width: () => 247,
        height: () => 127,
        ...createObjectSignal(startX, 'x'),
        ...createObjectSignal(baseY, 'y'),
        ...createObjectSignal(0, 'rotation'),
        ...createObjectSignal(false, 'scooping'),
      }
    },
    onEnterFrame({ $, $age, $scene }) {
      const float = Math.cos(10 + $age) * 1
      $.setY(baseY + float)
      $.setX($.x() - BUS_SPEED)
      $.setRotation(Math.random() * 1 - 0.5)

      // Reset
      if ($.x() < endX) {
        $.setX(Math.max($scene.canvas.get().width() + 22 + MIN_BUS_OFFSCREEN_PX, MIN_BUS_START_X))
      }

      // Scoop the runners
      const bodyController = $scene.getControllersByType('bus-bus-body')?.[0]
      if (bodyController && !$.scooping()) {
        const scoopXStart = $.x()
        const scoopXEnd = scoopXStart + 88

        $scene.getControllersByType<RunnerController>('runner').forEach(controller => {
          const x = controller.data.x() + controller.data.width()
          if (!controller.data.scooped() && x >= scoopXStart && x <= scoopXEnd) {
            controller.data.setScooped(true)
            controller.data.setYSpeed(SCOOP_SPEED * -1 * (1 + Math.random() * 0.6))
            $.setScooping(true)
            setTimeout(() => $.setScooping(false), SCOOP_DURATION)
          }
        })
      }
    }
  })

  // Attach items
  bus.attach(createConnectedController({
    type: 'bus-shadow',
    base: bus,
    frames: [shadowAsset],
    width: () => 270,
    height: () => 50,
    offset: { x: -20, y: 107 },
    style: () => ({ opacity: 0.1 }),
  }))
  bus.attach(createConnectedController({
    type: 'bus-wheel1',
    base: bus,
    frames: [wheel1Asset],
    width: () => 34,
    height: () => 38,
    offset: { x: 73, y: 105 },
    y: (_, $age) => Math.cos(10 + $age) * -1,
  }))
  bus.attach(createConnectedController({
    type: 'bus-wheel2',
    base: bus,
    frames: [wheel2Asset],
    width: () => 34,
    height: () => 38,
    offset: { x: 5, y: 103 },
    y: (_, $age) => Math.cos(10 + $age + 5) * -1,
  }))
  bus.attach(createConnectedController({
    type: 'bus-wheel3',
    base: bus,
    frames: [wheel3Asset],
    width: () => 19,
    height: () => 23,
    offset: { x: 160, y: 105 },
    y: (_, $age) => Math.cos(10 + $age + 10) * -1,
  }))
  bus.attach(createConnectedController({
    type: 'bus-wheel4',
    base: bus,
    frames: [wheel4Asset],
    width: () => 26,
    height: () => 30,
    offset: { x: 197, y: 102 },
    y: (_, $age) => Math.cos(10 + $age + 15) * -1,
  }))
  bus.attach(createConnectedController({
    type: 'bus-window',
    base: bus,
    frames: [windowAsset],
    width: () => 212,
    height: () => 40,
    offset: { x: 26, y: 26 },
    style: () => ({ opacity: 0.75 }),
  }))
  bus.attach(createConnectedController({
    type: 'bus-body',
    base: bus,
    frames: [busAsset],
    width: () => 247,
    height: () => 127,
    offset: { x: 0, y: 0 },
  }))
  bus.attach(createConnectedController({
    type: 'bus-scoop',
    base: bus,
    frames: [scoopAsset],
    width: () => 88,
    height: () => 57,
    offset: { x: -22, y: 94 },
    style: ($) => ({
      transition: `transform ${SCOOP_DURATION / 2}ms linear`,
      transform: $.scooping() ? 'translateY(-45px) rotate(10deg)' : 'translateY(0px) rotate(0deg)',
    }),
  }))
  return bus
}
