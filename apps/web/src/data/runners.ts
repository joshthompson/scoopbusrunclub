import { generateFrames } from '@/utils'
import { Accessor, createSignal, Setter } from 'solid-js'
import * as assets from './runner-assets'

export const RUNNER_SIZE = 2
export const FRAME_COUNT = 4

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type Birthday = `${Digit}${Digit}/${Digit}${Digit}`

export type RunnerName =
  | 'josh'
  | 'keith'
  | 'claire'
  | 'lyra'
  | 'adam'
  | 'anna'
  | 'eline'
  | 'rick'
  | 'sophie'
  | 'august'
  | 'alisa'
  | 'link'
  | 'otherJosh'

export interface RunnerData {
  name: string
  altNames?: string[]
  id: string
  birthday: Birthday // Format: DD/MM
  frames: {
    run: string[]
    sit: string[]
    face: string[]
    volunteer?: string[]
    volunteerSit?: string[]
  }
  width: number
  height: number
  speed: number
  frameInterval: number
  connectedTo?: string
  latestTime?: string
  time?: string
}

export const runners: Record<RunnerName, [Accessor<RunnerData>, Setter<RunnerData>]> = {
  josh: createSignal<RunnerData>({
    name: 'Josh',
    id: '8070821',
    birthday: '15/12',
    frames: {
      run: generateFrames(assets.joshRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.joshSit],
      face: [assets.joshFace],
    },
    width: 21,
    height: 28,
    speed: 4,
    frameInterval: 62,
  }),
  keith: createSignal<RunnerData>({
    name: 'Keith',
    id: '5635044',
    birthday: '01/08',
    frames: {
      run: generateFrames(assets.keithRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.keithSit],
      face: [assets.keithFace],
    },
    width: 21,
    height: 28,
    speed: 3,
    frameInterval: 80,
  }),
  claire: createSignal<RunnerData>({
    name: 'Claire',
    id: '377595',
    birthday: '06/06',
    frames: {
      run: generateFrames(assets.claireRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.claireSit],
      face: [assets.claireFace],
    },
    width: 21,
    height: 28,
    speed: 2,
    frameInterval: 125,
  }),
  lyra: createSignal<RunnerData>({
    name: 'Lyra',
    id: '8009111',
    birthday: '00/00',
    frames: {
      run: generateFrames(assets.lyraRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.lyraSit],
      face: [assets.lyraFace],
    },
    width: 21,
    height: 28,
    speed: 1.5,
    frameInterval: 80,
  }),
  adam: createSignal<RunnerData>({
    name: 'Adam',
    id: '7758658',
    birthday: '12/05',
    frames: {
      run: generateFrames(assets.adamRun, 22 * FRAME_COUNT, 30, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.adamSit],
      face: [assets.adamFace],
    },
    width: 21,
    height: 30,
    speed: 3.9,
    frameInterval: 65,
  }),
  anna: createSignal<RunnerData>({
    name: 'Anna',
    id: '850764',
    birthday: '02/12',
    frames: {
      run: generateFrames(assets.annaRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.annaSit],
      face: [assets.annaFace],
      volunteer: generateFrames(assets.annaVolunteer, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      volunteerSit: [assets.annaVolunteerSit],
    },
    width: 21,
    height: 28,
    speed: 1.5,
    frameInterval: 120,
  }),
  eline: createSignal<RunnerData>({
    name: 'Eline',
    id: '8943925',
    birthday: '06/12',
    frames: {
      run: generateFrames(assets.elineRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.elineSit],
      face: [assets.elineFace],
    },
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  }),
  rick: createSignal<RunnerData>({
    name: 'Rick',
    id: '9679233',
    birthday: '10/08',
    frames: {
      run: generateFrames(assets.rickRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.rickSit],
      face: [assets.rickFace],
    },
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  }),
  sophie: createSignal<RunnerData>({
    name: 'Sophie',
    id: '6076813',
    birthday: '28/11',
    frames: {
      run: generateFrames(assets.sophieRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.sophieSit],
      face: [assets.sophieFace],
    },
    width: 21,
    height: 28,
    speed: 3.2,
    frameInterval: 75,
  }),
  august: createSignal<RunnerData>({
    name: 'August',
    id: '545803',
    birthday: '02/12',
    frames: {
      run: generateFrames(assets.augustRun, 50 * FRAME_COUNT, 30, 50 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.augustSit],
      face: [assets.augustFace],
    },
    width: 49,
    height: 30,
    speed: 3.2,
    frameInterval: 100,
  }),
  alisa: createSignal<RunnerData>({
    name: 'Alisa',
    id: '10663604',
    birthday: '22/11',
    frames: {
      run: generateFrames(assets.alisaRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.alisaSit],
      face: [assets.alisaFace],
    },
    width: 21,
    height: 28,
    speed: 2.5,
    frameInterval: 75,
  }),
  link: createSignal<RunnerData>({
    name: 'Link',
    id: '', // Uses Alisa's speed/data
    birthday: '09/03',
    frames: {
      run: generateFrames(assets.linkRun, 20 * 2, 28, 20 * 2, 2, true),
      sit: [assets.linkSit],
      face: [assets.linkFace],
    },
    width: 20,
    height: 28,
    speed: 2.5,
    frameInterval: 75,
    connectedTo: 'alisa',
  }),
  otherJosh: createSignal<RunnerData>({
    name: 'Other Josh',
    altNames: ['Other Josh', 'Josh 2', 'Joshua II', 'Cass', 'Josh Cass', 'Ozzy Josh', 'OJ'],
    id: '5346109',
    birthday: '02/07',
    frames: {
      run: generateFrames(assets.otherJoshRun, 22 * FRAME_COUNT, 28, 22 * RUNNER_SIZE, FRAME_COUNT, true),
      sit: [assets.otherJoshSit],
      face: [assets.otherJoshFace],
    },
    width: 21,
    height: 28,
    speed: 2.5,
    frameInterval: 80,
  }),
}
