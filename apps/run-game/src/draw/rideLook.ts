import type { Component } from 'solid-js'
import type { Course } from '../courses/types'
import { CORGI_SADDLE } from '../game/constants'
import type { Sound } from '../sfx'
import {
	BLOOD_CELL_BACK,
	BLOOD_CELL_HEIGHT,
	BLOOD_CELL_OUTLINE,
	BLOOD_CELL_SADDLE,
	BLOOD_CELL_WIDTH,
	BloodCellArt,
	bloodCellPicture,
} from './art/bloodCell'
import {
	CAMEL_BACK,
	CAMEL_HEIGHT,
	CAMEL_OUTLINE,
	CAMEL_SADDLE,
	CAMEL_WIDTH,
	CamelArt,
	bactrianPicture,
	camelPicture,
} from './art/camel'
import {
	CORGI_HEAD,
	CORGI_HEIGHT,
	CORGI_OUTLINE,
	CORGI_WIDTH,
	CorgiArt,
	type CorgiPose,
	corgiPicture,
} from './art/corgi'
import {
	DEER_BACK,
	DEER_HEIGHT,
	DEER_OUTLINE,
	DEER_SADDLE,
	DEER_WIDTH,
	DeerArt,
	deerPicture,
} from './art/deer'
import {
	GLIDER_HEIGHT,
	GLIDER_SHADOW,
	GLIDER_WIDTH,
	GliderArt,
	gliderPicture,
} from './art/glider'
import {
	GOAT_BACK,
	GOAT_HEIGHT,
	GOAT_OUTLINE,
	GOAT_SADDLE,
	GOAT_WIDTH,
	GoatArt,
	goatPicture,
} from './art/goat'
import {
	HORSE_BACK,
	HORSE_HEIGHT,
	HORSE_OUTLINE,
	HORSE_SADDLE,
	HORSE_WIDTH,
	HorseArt,
	horsePicture,
} from './art/horse'
import {
	LLAMA_BACK,
	LLAMA_HEIGHT,
	LLAMA_OUTLINE,
	LLAMA_SADDLE,
	LLAMA_WIDTH,
	LlamaArt,
	llamaPicture,
} from './art/llama'
import {
	MOLE_BACK,
	MOLE_HEIGHT,
	MOLE_OUTLINE,
	MOLE_SADDLE,
	MOLE_WIDTH,
	MoleArt,
	molePicture,
} from './art/mole'
import {
	SKATEBOARD_BACK,
	SKATEBOARD_FLIP,
	SKATEBOARD_FLIP_TICKS,
	SKATEBOARD_HEIGHT,
	SKATEBOARD_SADDLE,
	SKATEBOARD_WIDTH,
	SkateboardArt,
	skateboardPicture,
} from './art/skateboard'
import {
	STOOD_HEIGHT,
	STOOD_WIDTH,
	StoodBoardArt,
	stoodBoardPicture,
} from './art/skis'
import {
	UNICORN_BACK,
	UNICORN_HEIGHT,
	UNICORN_OUTLINE,
	UNICORN_SADDLE,
	UNICORN_WIDTH,
	UnicornArt,
	unicornPicture,
} from './art/unicorn'
import type { PictureShadow } from './paint/picture'

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
	/** Drawn on a page (a course's preview), in a pose. */
	Art: Component<{ pose: CorgiPose }>
	/**
	 * For a Draw Hook to paint: its picture in each pose, and the outline or
	 * shadow round it.
	 */
	picture: (pose: CorgiPose) => string
	shadow?: PictureShadow
	/** What it says, calling to be ridden, and the sound of it. */
	call: string
	sound: Sound
	/** What its rides are called in the summary. */
	rides: string
	/** How long a ride on it lasts, in ticks, if not as long as a corgi's. */
	ticks?: number
	/** How fast it goes, if not at a corgi's gallop. */
	speed?: number
	/** Stepped onto at a run, rather than jumped down onto: a mole, a skateboard. */
	runInto?: boolean
	/** Stood on by its rider, rather than sat on: a skateboard. */
	stood?: boolean
	/**
	 * A trick it does whenever its rider jumps: these pictures, each for
	 * `ticks`, from leaving the ground, the last held till it lands. A
	 * skateboard's kickflip; `word`, what pops up as it goes.
	 */
	trick?: { frames: string[]; ticks: number; word: string }
	/**
	 * A rarer one, now and then one of them, `share` of the time: its own
	 * look, and its own Collectable, ridden the same.
	 */
	rare?: {
		picture: (pose: CorgiPose) => string
		shadow: PictureShadow
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
	picture: corgiPicture,
	shadow: CORGI_OUTLINE,
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
	picture: llamaPicture,
	shadow: LLAMA_OUTLINE,
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
	picture: camelPicture,
	shadow: CAMEL_OUTLINE,
	// Camels grumble.
	call: 'Hrrmph!',
	sound: 'groan',
	rides: 'Camel rides',
	// Now and then, two humps.
	rare: {
		picture: bactrianPicture,
		shadow: CAMEL_OUTLINE,
		kind: 'bactrian',
		share: 0.1,
	},
}

const DEER: RideLook = {
	width: DEER_WIDTH,
	height: DEER_HEIGHT,
	back: DEER_BACK,
	saddle: DEER_SADDLE,
	Art: DeerArt,
	picture: deerPicture,
	shadow: DEER_OUTLINE,
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
	picture: unicornPicture,
	shadow: UNICORN_OUTLINE,
	call: 'Neigh!',
	// A sparkle of a sound.
	sound: 'scan',
	rides: 'Unicorn rides',
}

const GOAT: RideLook = {
	width: GOAT_WIDTH,
	height: GOAT_HEIGHT,
	back: GOAT_BACK,
	saddle: GOAT_SADDLE,
	Art: GoatArt,
	picture: goatPicture,
	shadow: GOAT_OUTLINE,
	call: 'Meh-eh-eh!',
	sound: 'bleat',
	rides: 'Goat rides',
}

/** A horse of the Royal Guard's, stood waiting in the street, saddled. */
const HORSE: RideLook = {
	width: HORSE_WIDTH,
	height: HORSE_HEIGHT,
	back: HORSE_BACK,
	saddle: HORSE_SADDLE,
	Art: HorseArt,
	picture: horsePicture,
	shadow: HORSE_OUTLINE,
	call: 'Neigh!',
	sound: 'neigh',
	rides: 'Horse rides',
}

/**
 * A mole: hopping along with you on its back, over and over, and on
 * through whatever rock's in the way (see `moles`), faster than running.
 */
const MOLE: RideLook = {
	width: MOLE_WIDTH,
	height: MOLE_HEIGHT,
	back: MOLE_BACK,
	saddle: MOLE_SADDLE,
	Art: MoleArt,
	picture: molePicture,
	shadow: MOLE_OUTLINE,
	call: 'Squeak!',
	sound: 'furby',
	rides: 'Mole rides',
	runInto: true,
	// Faster than running, and a good long ride, for the climb up to it.
	speed: 8,
	ticks: 320,
}

/** Hung under, not sat on: run into it. See `gliders`. */
const GLIDER: RideLook = {
	width: GLIDER_WIDTH,
	height: GLIDER_HEIGHT,
	back: GLIDER_HEIGHT,
	saddle: 0,
	Art: GliderArt,
	picture: gliderPicture,
	shadow: GLIDER_SHADOW,
	call: '',
	sound: 'whoosh',
	rides: 'Glider rides',
}

/**
 * Stood up in the snow, not sat on: run into a pair and they're yours, the
 * whole way down. See `skis`.
 */
const SKIS: RideLook = {
	width: STOOD_WIDTH,
	height: STOOD_HEIGHT,
	back: STOOD_HEIGHT,
	saddle: 0,
	Art: () => StoodBoardArt({ board: 1 }),
	picture: () => stoodBoardPicture(1),
	call: '',
	sound: 'whoosh',
	rides: 'Skis and boards',
}

/**
 * A red blood cell, in the bloodstream: going with the flow, faster than
 * running, and a long ride, up the artery.
 */
const BLOOD_CELL: RideLook = {
	width: BLOOD_CELL_WIDTH,
	height: BLOOD_CELL_HEIGHT,
	back: BLOOD_CELL_BACK,
	saddle: BLOOD_CELL_SADDLE,
	Art: BloodCellArt,
	picture: bloodCellPicture,
	shadow: BLOOD_CELL_OUTLINE,
	call: 'Blub!',
	sound: 'pop',
	rides: 'Blood cell rides',
	speed: 8.5,
	ticks: 360,
}

/**
 * A skateboard, lying on the road: step on at a run and roll, stood up on
 * it, faster than running. Jump, and it kickflips under your feet.
 */
const SKATEBOARD: RideLook = {
	width: SKATEBOARD_WIDTH,
	height: SKATEBOARD_HEIGHT,
	back: SKATEBOARD_BACK,
	saddle: SKATEBOARD_SADDLE,
	Art: SkateboardArt,
	picture: skateboardPicture,
	call: '',
	sound: 'grind',
	rides: 'Skateboard rides',
	speed: 8,
	runInto: true,
	stood: true,
	trick: {
		frames: SKATEBOARD_FLIP,
		ticks: SKATEBOARD_FLIP_TICKS,
		word: 'Kickflip!',
	},
}

const RIDES = {
	corgi: CORGI,
	llama: LLAMA,
	camel: CAMEL,
	deer: DEER,
	unicorn: UNICORN,
	glider: GLIDER,
	goat: GOAT,
	horse: HORSE,
	mole: MOLE,
	skis: SKIS,
	bloodCell: BLOOD_CELL,
	skateboard: SKATEBOARD,
}

export const rideLook = (course: Pick<Course, 'ride'>) =>
	RIDES[course.ride ?? 'corgi']
