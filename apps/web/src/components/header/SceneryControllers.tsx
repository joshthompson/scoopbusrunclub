import { createController, createObjectSignal } from "@/engine";

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
import shrub1Asset from '@/assets/misc/shrub1.png'
const plants = [
  { asset: flower1Asset, w: 12, h: 14 },
  { asset: flower2Asset, w: 11, h: 11 },
  { asset: flower3Asset, w: 12, h: 12 },
  { asset: flower4Asset, w: 11, h: 9 },
  { asset: shrub1Asset, w: 24, h: 14 },
]
export function createPlantController(id: string, x: number) {
  const size = Math.random() * 1 + 1
  const plant = plants[Math.floor(Math.random() * plants.length)]
  const xScale = Math.random() < 0.5 ? -1 : 1
  return createController({
    frames: [plant.asset],
    init() {
      return {
        id,
        type: 'plant',
        width: () => plant.w * size,
        height: () => plant.h * size,
        x: () => x + Math.random() * 100 - 50,
        y: () => 130 + Math.random() * 11,
       xScale: () => xScale,
      }
    },
  })
}

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
        ...createObjectSignal(Math.random() * 20 + 5, 'y'),
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