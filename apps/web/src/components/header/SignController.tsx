import { createController } from "@/engine"
import signAsset from "@/assets/misc/pr-sign.png"

const SIGN_SCALE = 1

export function createSignController(id: string) {
  return createController({
    frames: [signAsset],
    randomStartFrame: true,
    init() {
      return {
        id,
        type: 'sign',
        x: () => 50,
        y: () => 160 - 35 * SIGN_SCALE, // 34 is the height of the sign asset
        width: () => 70 * SIGN_SCALE,
        height: () => 35 * SIGN_SCALE,
      }
    },
  })
}