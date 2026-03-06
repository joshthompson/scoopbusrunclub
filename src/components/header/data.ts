
import adamAsset from '@/assets/runners/adam.png'
import adamSitAsset from '@/assets/runners/adam-sit.png'
import alisaAsset from '@/assets/runners/alisa.png'
import alisaSitAsset from '@/assets/runners/alisa-sit.png'
import annaAsset from '@/assets/runners/anna.png'
import annaSitAsset from '@/assets/runners/anna-sit.png'
import augustAsset from '@/assets/runners/august.png'
import augustSitAsset from '@/assets/runners/august-sit.png'
import claireAsset from '@/assets/runners/claire.png'
import claireSitAsset from '@/assets/runners/claire-sit.png'
import elineAsset from '@/assets/runners/eline.png'
import elineSitAsset from '@/assets/runners/eline-sit.png'
import joshAsset from '@/assets/runners/josh.png'
import joshSitAsset from '@/assets/runners/josh-sit.png'
import keithAsset from '@/assets/runners/keith.png'
import keithSitAsset from '@/assets/runners/keith-sit.png'
import linkAsset from '@/assets/runners/link.png'
import linkSitAsset from '@/assets/runners/link-sit.png'
import lyraAsset from '@/assets/runners/lyra.png'
import lyraSitAsset from '@/assets/runners/lyra-sit.png'
import rickAsset from '@/assets/runners/rick.png'
import rickSitAsset from '@/assets/runners/rick-sit.png'
import sophieAsset from '@/assets/runners/sophie.png'
import sophieSitAsset from '@/assets/runners/sophie-sit.png'
import { generateFrames } from '@/utils'

export const RUNNER_SIZE = 2
export const FRAME_COUNT = 4

interface RunnerData {
  frames: string[]
  sitFrames: string[]
  width: number
  height: number
  speed: number
  frameInterval: number
  connectedTo?: string
}

export const runners: Record<string, RunnerData> = {
  josh: {
    frames: generateFrames(joshAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [joshSitAsset],
    width: 21,
    height: 28,
    speed: 4,
    frameInterval: 62,
  },
  keith: {
    frames: generateFrames(keithAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [keithSitAsset],
    width: 21,
    height: 28,
    speed: 3,
    frameInterval: 80,
  },
  claire: {
    frames: generateFrames(claireAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [claireSitAsset],
    width: 21,
    height: 28,
    speed: 2,
    frameInterval: 125,
    // connectedTo: 'anna',
  },
  lyra: {
    frames: generateFrames(lyraAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [lyraSitAsset],
    width: 21,
    height: 28,
    speed: 1.5,
    frameInterval: 80,
  },
  adam: {
    frames: generateFrames(adamAsset,  22 * FRAME_COUNT, 30, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [adamSitAsset],
    width: 21,
    height: 30,
    speed: 3.9,
    frameInterval: 65,
  },
  anna: {
    frames: generateFrames(annaAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [annaSitAsset],
    width: 21,
    height: 28,
    speed: 1.5,
    frameInterval: 120,
    connectedTo: 'lyra',
  },
  eline: {
    frames: generateFrames(elineAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [elineSitAsset],
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  },
  rick: {
    frames: generateFrames(rickAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [rickSitAsset],
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  },
  sophie: {
    frames: generateFrames(sophieAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [sophieSitAsset],
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  },
  august: {
    frames: generateFrames(augustAsset, 50 * FRAME_COUNT, 30, 50 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [augustSitAsset],
    width: 49,
    height: 30,
    speed: 3.2,
    frameInterval: 100,
  },
  alisa: {
    frames: generateFrames(alisaAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [alisaSitAsset],
    width: 21,
    height: 28,
    speed: 2.5,
    frameInterval: 75,
  },
  link: {
    frames: generateFrames(linkAsset, 20 * 2, 28, 20 * 2, 2, true),
    sitFrames: [linkSitAsset],
    width: 20,
    height: 28,
    speed: 2.5,
    frameInterval: 75,
    connectedTo: 'alisa',
  },
}
