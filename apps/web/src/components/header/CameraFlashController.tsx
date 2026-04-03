import { createSignal } from "solid-js"
import { createController } from "@/engine"
import flashAsset from "@/assets/misc/flash.png"

const FLASH_DURATION = 12 // frames (~480ms at 40ms/frame)
const FLASH_SIZE = 100
const MAX_OPACITY = 0.8

/**
 * Creates a camera-flash effect at the given position.
 * The flash fades out over FLASH_DURATION frames and then removes itself
 * from the scene automatically.
 */
export function createCameraFlashController(id: string, x: number, y: number) {
  const [opacity, setOpacity] = createSignal(1)

  return createController({
    init() {
      return {
        id,
        type: 'camera-flash',
        x: () => x - FLASH_SIZE / 2 + 10,
        y: () => y - FLASH_SIZE / 2 - 20,
        width: () => FLASH_SIZE,
        height: () => FLASH_SIZE,
        style: () => ({
          'background-image': `url(${flashAsset})`,
          'background-size': '100% 100%',
          'image-rendering': 'pixelated',
          opacity: opacity() * MAX_OPACITY,
          'pointer-events': 'none',
        }),
      }
    },
    onEnterFrame({ $scene, $age }) {
      // Fast ease-out: starts bright, fades quickly
      const progress = $age / FLASH_DURATION
      setOpacity(Math.max(0, 1 - progress * progress))

      if ($age >= FLASH_DURATION) {
        $scene.removeController(id)
      }
    },
  })
}
