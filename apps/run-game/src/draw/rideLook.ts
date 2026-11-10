import type { Component } from 'solid-js'
import type { Course } from '../courses/types'
import { CORGI_SADDLE } from '../game/constants'
import type { Sound } from '../sfx'
import {
	CORGI_HEAD,
	CORGI_HEIGHT,
	CORGI_WIDTH,
	CorgiArt,
	type CorgiPose,
} from './art/corgi'
import {
	LLAMA_BACK,
	LLAMA_HEIGHT,
	LLAMA_SADDLE,
	LLAMA_WIDTH,
	LlamaArt,
} from './art/llama'

/** What a course's Rides are, waiting on the path to be ridden: corgis, or llamas. */
export interface RideLook {
	width: number
	height: number
	/** How tall it is to where you land on it to ride it. */
	back: number
	/** How far above its feet its rider sits. */
	saddle: number
	Art: Component<{ pose: CorgiPose }>
	/** What it says, calling to be ridden, and the sound of it. */
	call: string
	sound: Sound
}

const CORGI: RideLook = {
	width: CORGI_WIDTH,
	height: CORGI_HEIGHT,
	back: CORGI_HEAD,
	saddle: CORGI_SADDLE,
	Art: CorgiArt,
	call: 'Woof!',
	sound: 'woof',
}

const LLAMA: RideLook = {
	width: LLAMA_WIDTH,
	height: LLAMA_HEIGHT,
	back: LLAMA_BACK,
	saddle: LLAMA_SADDLE,
	Art: LlamaArt,
	// Llamas hum.
	call: 'Hmmm!',
	sound: 'cheer',
}

export const rideLook = (course: Pick<Course, 'ride'>) =>
	course.ride === 'llama' ? LLAMA : CORGI
