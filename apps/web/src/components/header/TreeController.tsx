import { createController } from "@/engine";
import tree1Asset from '@/assets/misc/tree1.png'
import tree2Asset from '@/assets/misc/tree2.png'

const trees = [
  { asset: tree1Asset, w: 87, h: 120 },
  { asset: tree2Asset, w: 56, h: 110 },
]

export function createTreeController(id: string, x: number) {
  const size = Math.random() * 0.25 + 1
  const tree = trees[Math.floor(Math.random() * trees.length)]
  return createController({
    frames: [tree.asset],
    init() {
      return {
        id,
        type: 'tree',
        width: () => tree.w * size,
        height: () => 120 * size,
        x: () => x + Math.random() * 150 - 75,
        y: () => Math.random() * 10,
      }
    },
  })
}