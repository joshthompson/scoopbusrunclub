import type { Component } from 'solid-js'
import type { Course } from '../courses/types'
import type { Sound } from '../sfx'
import {
	CONDOR_HEIGHT,
	CONDOR_SEAT_X,
	CONDOR_SEAT_Y,
	CONDOR_WIDTH,
	CondorArt,
} from './art/condor'
import {
	DRAGON_HEIGHT,
	DRAGON_NECK,
	DRAGON_WIDTH,
	DragonArt,
	dragonBack,
} from './art/dragon'
import {
	FLYING_GOOSE_HEIGHT,
	FLYING_GOOSE_WIDTH,
	FlyingGooseArt,
} from './art/geese'

/** What flies over a course to be ridden: geese, or on the Great Wall, a dragon. */
export interface FlyerLook {
	width: number
	height: number
	Art: Component<{ now: number; carrying: boolean }>
	/** Heard, grabbing hold of one. What's said is its `PICKUP_WORD`. */
	sound: Sound
	/** What its rides are called in the summary. */
	rides: string
	/** How far up from its bottom whoever's riding hangs on underneath it: its feet. */
	grip: number
	/**
	 * Ridden on top instead, sat on its back: how far ahead of its middle,
	 * and how far up from its bottom its back is there, `now` ticks in, as
	 * it ripples; and how far down into it they sit, astride it, its body
	 * over their lap.
	 */
	seat?: { ahead: number; back: (now: number) => number; sink: number }
}

const GOOSE: FlyerLook = {
	width: FLYING_GOOSE_WIDTH,
	height: FLYING_GOOSE_HEIGHT,
	Art: FlyingGooseArt,
	sound: 'honk',
	rides: 'Goose rides',
	grip: 10,
}

const DRAGON: FlyerLook = {
	width: DRAGON_WIDTH,
	height: DRAGON_HEIGHT,
	Art: DragonArt,
	sound: 'whoosh',
	rides: 'Dragon rides',
	grip: DRAGON_HEIGHT / 2 + 4,
	// Ridden sat up on its neck, behind its head, where it ripples along
	// under you.
	seat: {
		ahead: DRAGON_NECK - DRAGON_WIDTH / 2,
		back: (now) => DRAGON_HEIGHT - dragonBack(DRAGON_NECK, now),
		sink: 12,
	},
}

const CONDOR: FlyerLook = {
	width: CONDOR_WIDTH,
	height: CONDOR_HEIGHT,
	// Beating its wings, swooping in; soaring, once it's got someone.
	Art: (props) =>
		CondorArt({
			get now() {
				return props.now
			},
			get beating() {
				return !props.carrying
			},
		}),
	sound: 'whoosh',
	rides: 'Condor rides',
	grip: CONDOR_HEIGHT / 2,
	// Ridden sat on its back, between its wings, its far wing up behind.
	seat: {
		ahead: CONDOR_SEAT_X - CONDOR_WIDTH / 2,
		back: () => CONDOR_SEAT_Y,
		sink: 6,
	},
}

export const flyerLook = (course: Pick<Course, 'flyer'>) =>
	course.flyer === 'dragon'
		? DRAGON
		: course.flyer === 'condor'
			? CONDOR
			: GOOSE
