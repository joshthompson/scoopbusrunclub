import type { Component } from 'solid-js'
import type { Course } from '../courses/types'
import { CORGI_SADDLE } from '../game/constants'
import type { Sound } from '../sfx'
import {
	BactrianArt,
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
	DEER_BACK,
	DEER_HEIGHT,
	DEER_SADDLE,
	DEER_WIDTH,
	DeerArt,
} from './art/deer'
import { GLIDER_HEIGHT, GLIDER_WIDTH, GliderArt } from './art/glider'
import {
	LLAMA_BACK,
	LLAMA_HEIGHT,
	LLAMA_SADDLE,
	LLAMA_WIDTH,
	LlamaArt,
} from './art/llama'
import {
	UNICORN_BACK,
	UNICORN_HEIGHT,
	UNICORN_SADDLE,
	UNICORN_WIDTH,
	UnicornArt,
} from './art/unicorn'

/**
 * What a course's Rides are, waiting on the path to be ridden: corgis,
 * llamas, camels or deer; or gliders, parked.
 */
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
	/**
	 * A rarer one, now and then one of them, `share` of the time: its own
	 * look, and its own Collectable, ridden the same.
	 */
	rare?: {
		Art: Component<{ pose: CorgiPose }>
		kind: 'bactrian'
		share: number
	}
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
	// Now and then, two humps.
	rare: { Art: BactrianArt, kind: 'bactrian', share: 0.1 },
}

const DEER: RideLook = {
	width: DEER_WIDTH,
	height: DEER_HEIGHT,
	back: DEER_BACK,
	saddle: DEER_SADDLE,
	Art: DeerArt,
	// Deer bark, as it happens.
	call: 'Bark!',
	sound: 'honk',
	rides: 'Deer rides',
}

const UNICORN: RideLook = {
	width: UNICORN_WIDTH,
	height: UNICORN_HEIGHT,
	back: UNICORN_BACK,
	saddle: UNICORN_SADDLE,
	Art: UnicornArt,
	call: 'Neigh!',
	// A sparkle of a sound.
	sound: 'scan',
	rides: 'Unicorn rides',
}

/** Hung under, not sat on: run into it. See `gliders`. */
const GLIDER: RideLook = {
	width: GLIDER_WIDTH,
	height: GLIDER_HEIGHT,
	back: GLIDER_HEIGHT,
	saddle: 0,
	Art: GliderArt,
	call: '',
	sound: 'whoosh',
	rides: 'Glider rides',
}

const RIDES = {
	corgi: CORGI,
	llama: LLAMA,
	camel: CAMEL,
	deer: DEER,
	unicorn: UNICORN,
	glider: GLIDER,
}

export const rideLook = (course: Pick<Course, 'ride'>) =>
	RIDES[course.ride ?? 'corgi']
