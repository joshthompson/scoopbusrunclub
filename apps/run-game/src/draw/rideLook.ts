import type { Component } from 'solid-js'
import type { Course } from '../courses/types'
import { CORGI_SADDLE } from '../game/constants'
import type { Sound } from '../sfx'
import {
	CAMEL_BACK,
	CAMEL_HEIGHT,
	CAMEL_SADDLE,
	CAMEL_WIDTH,
	CamelArt,
} from './art/camel'
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

/** What a course's Rides are, waiting on the path to be ridden: corgis, llamas or camels. */
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
	/** What its rides are called in the summary. */
	rides: string
}

const CORGI: RideLook = {
	width: CORGI_WIDTH,
	height: CORGI_HEIGHT,
	back: CORGI_HEAD,
	saddle: CORGI_SADDLE,
	Art: CorgiArt,
	call: 'Woof!',
	sound: 'woof',
	rides: 'Corgi rides',
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
	rides: 'Llama rides',
}

const CAMEL: RideLook = {
	width: CAMEL_WIDTH,
	height: CAMEL_HEIGHT,
	back: CAMEL_BACK,
	saddle: CAMEL_SADDLE,
	Art: CamelArt,
	// Camels grumble.
	call: 'Hrrmph!',
	sound: 'groan',
	rides: 'Camel rides',
}

export const rideLook = (course: Pick<Course, 'ride'>) =>
	course.ride === 'llama' ? LLAMA : course.ride === 'camel' ? CAMEL : CORGI
