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
        y: () => 10 + Math.random() * 5,
      }
    },
  })
}

import flower1Asset from '@/assets/misc/flower1.png'
import flower2Asset from '@/assets/misc/flower2.png'
import flower3Asset from '@/assets/misc/flower3.png'
import flower4Asset from '@/assets/misc/flower4.png'

const flowers = [
  { asset: flower1Asset, w: 12, h: 14 },
  { asset: flower2Asset, w: 11, h: 11 },
  { asset: flower3Asset, w: 12, h: 12 },
  { asset: flower4Asset, w: 11, h: 9 },
  { asset: shrub1Asset, w: 24, h: 14 },
]

export function createFlowerController(id: string, x: number) {
  const size = Math.random() * 1 + 1
  const flower = flowers[Math.floor(Math.random() * flowers.length)]
  const xScale = Math.random() < 0.5 ? -1 : 1
  return createController({
    frames: [flower.asset],
    init() {
      return {
        id,
        type: 'flower',
        width: () => flower.w * size,
        height: () => flower.h * size,
        x: () => x + Math.random() * 100 - 50,
        y: () => 130 + Math.random() * 11,
       xScale: () => xScale,
      }
    },
  })
}

import shrub1Asset from '@/assets/misc/shrub1.png'
import shrub2Asset from '@/assets/misc/shrub2.png'

const shrubs = [
  { asset: shrub1Asset, w: 24, h: 14 },
  // { asset: shrub2Asset, w: 24, h: 14 },
]

export function createShrubController(id: string, x: number) {
  const size = Math.random() * 0.5 + 1
  const shrub = shrubs[Math.floor(Math.random() * shrubs.length)]
  const xScale = Math.random() < 0.5 ? -1 : 1
  return createController({
    frames: [shrub.asset],
    init() {
      return {
        id,
        type: 'shrub',
        width: () => shrub.w * size,
        height: () => shrub.h * size,
        x: () => x + Math.random() * 100 - 50,
        y: () => 210 + Math.random() * 11,
       xScale: () => xScale,
      }
    },
  })
}