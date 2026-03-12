
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
import otherJoshAsset from '@/assets/runners/other-josh.png'
import otherJoshSitAsset from '@/assets/runners/other-josh-sit.png'
import rickAsset from '@/assets/runners/rick.png'
import rickSitAsset from '@/assets/runners/rick-sit.png'
import sophieAsset from '@/assets/runners/sophie.png'
import sophieSitAsset from '@/assets/runners/sophie-sit.png'
import { generateFrames } from '@/utils'
import { Accessor, createSignal, Setter } from 'solid-js'

export const RUNNER_SIZE = 2
export const FRAME_COUNT = 4

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type Birthday = `${Digit}${Digit}/${Digit}${Digit}`

export interface RunnerData {
  name: string
  id: string
  birthday: Birthday // Format: DD/MM
  frames: string[]
  sitFrames: string[]
  width: number
  height: number
  speed: number
  frameInterval: number
  connectedTo?: string
  latestTime?: string
}

export const runners: Record<string, [Accessor<RunnerData>, Setter<RunnerData>]> = {
  josh: createSignal<RunnerData>({
    name: 'Josh',
    id: '8070821',
    birthday: '15/12',
    frames: generateFrames(joshAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [joshSitAsset],
    width: 21,
    height: 28,
    speed: 4,
    frameInterval: 62,
  }),
  keith: createSignal<RunnerData>({
    name: 'Keith',
    id: '5635044',
    birthday: '01/08',
    frames: generateFrames(keithAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [keithSitAsset],
    width: 21,
    height: 28,
    speed: 3,
    frameInterval: 80,
  }),
  claire: createSignal<RunnerData>({
    name: 'Claire',
    id: '377595',
    birthday: '06/06',
    frames: generateFrames(claireAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [claireSitAsset],
    width: 21,
    height: 28,
    speed: 2,
    frameInterval: 125,
  }),
  lyra: createSignal<RunnerData>({
    name: 'Lyra',
    id: '8009111',
    birthday: '00/00',
    frames: generateFrames(lyraAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [lyraSitAsset],
    width: 21,
    height: 28,
    speed: 1.5,
    frameInterval: 80,
  }),
  adam: createSignal<RunnerData>({
    name: 'Adam',
    id: '7758658',
    birthday: '12/05',
    frames: generateFrames(adamAsset,  22 * FRAME_COUNT, 30, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [adamSitAsset],
    width: 21,
    height: 30,
    speed: 3.9,
    frameInterval: 65,
  }),
  anna: createSignal<RunnerData>({
    name: 'Anna',
    id: '850764',
    birthday: '02/12',
    frames: generateFrames(annaAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [annaSitAsset],
    width: 21,
    height: 28,
    speed: 1.5,
    frameInterval: 120,
  }),
  eline: createSignal<RunnerData>({
    name: 'Eline',
    id: '8943925',
    birthday: '06/12',
    frames: generateFrames(elineAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [elineSitAsset],
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  }),
  rick: createSignal<RunnerData>({
    name: 'Rick',
    id: '9679233',
    birthday: '10/08',
    frames: generateFrames(rickAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [rickSitAsset],
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  }),
  sophie: createSignal<RunnerData>({
    name: 'Sophie',
    id: '6076813',
    birthday: '28/11',
    frames: generateFrames(sophieAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [sophieSitAsset],
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  }),
  august: createSignal<RunnerData>({
    name: 'August',
    id: '545803',
    birthday: '02/12',
    frames: generateFrames(augustAsset, 50 * FRAME_COUNT, 30, 50 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [augustSitAsset],
    width: 49,
    height: 30,
    speed: 3.2,
    frameInterval: 100,
  }),
  alisa: createSignal<RunnerData>({
    name: 'Alisa',
    id: '10663604',
    birthday: '22/11',
    frames: generateFrames(alisaAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [alisaSitAsset],
    width: 21,
    height: 28,
    speed: 2.5,
    frameInterval: 75,
  }),
  link: createSignal<RunnerData>({
    name: 'Link',
    id: '', // Uses Alisa's speed/data
    birthday: '09/03',
    frames: generateFrames(linkAsset, 20 * 2, 28, 20 * 2, 2, true),
    sitFrames: [linkSitAsset],
    width: 20,
    height: 28,
    speed: 2.5,
    frameInterval: 75,
    connectedTo: 'alisa',
  }),
  otherJosh: createSignal<RunnerData>({
    name: 'Other Josh',
    id: '5346109',
    birthday: '02/07',
    frames: generateFrames(otherJoshAsset,  22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
    sitFrames: [otherJoshSitAsset],
    width: 21,
    height: 28,
    speed: 2.5,
    frameInterval: 80,
  }),
}
