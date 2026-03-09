import { createController, createObjectSignal } from "@/engine";
import cloudAsset from '@/assets/misc/cloud1.png'

export function createCloudController(id: string, x: number, startX: number) {
  const size = Math.random() * 0.5 + 1
  return createController({
    frames: [cloudAsset],
    init() {
      return {
        id,
        type: 'cloud',
        width: () => 74 * size,
        height: () => 26 * size,
        ...createObjectSignal(x + Math.random() * 200 - 100, 'x'),
        ...createObjectSignal(Math.random() * 40 + 5, 'y'),
      }
    },
    onEnterFrame({ $, $age }) {
      if ($age % 3 === 0) $.setX($.x() - 1)

      if ($.x() < -100) {
        $.setX(startX)
        $.setY(Math.random() * 40 + 5)
      }
    }
  })
}