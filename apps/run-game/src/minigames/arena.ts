import type {
	Course,
	CourseDefinition,
	CourseId,
	CourseLook,
} from '../courses/types'
import { GROUND_Y, START_X, VIEW_WIDTH } from '../game/constants'
import { createTerrain } from '../game/terrain'

/**
 * A minigame's arena: one screen of somewhere, the camera kept still on
 * it, and walls either side nobody gets past. Either a plain flat path of
 * its own, dressed by a set (see `arenaCourse`, `arenaSets`), or a spot on
 * one of the courses, as it is (see `courseArena`).
 */

/** Where an arena is: the screen's left edge and how far up it's looking, and its walls. */
export interface Arena {
	left: number
	cameraY: number
	walls: { left: number; right: number }
}

/** The left edge of the screen, kept there: the arena's the screen, the start line in its middle. */
export const ARENA_LEFT = START_X - VIEW_WIDTH / 2
/** How far in from each edge of the screen nobody can go past: clear of anything there, a cannon. */
const WALL_IN = 76
export const ARENA_WALLS = {
	left: ARENA_LEFT + WALL_IN,
	right: ARENA_LEFT + VIEW_WIDTH - WALL_IN,
}

/** A plain arena's: the path, its middle the start line. */
export const PLAIN_ARENA: Arena = {
	left: ARENA_LEFT,
	cameraY: 0,
	walls: ARENA_WALLS,
}

/** Flat, and long enough that its finish line's nowhere near. */
const terrain = createTerrain([0, 0], 5000, 5000, { bumps: false })

/** An arena for minigame `id`: a course of nothing but path. */
export function arenaCourse(
	id: CourseId,
	name: string,
	blurb: string,
	// Plain: hills, and nothing on them or the field in front.
	look: CourseLook = { far: [], near: [], horizonTrees: false },
): Course {
	return {
		id,
		number: 0,
		name,
		blurb,
		terrain,
		obstacles: [],
		boosts: [],
		runDirectors: ['keith'],
		cheerers: [],
		scenery: [],
		look,
	}
}

/**
 * A minigame played on a spot on a course, `middle` across it, as it is:
 * its ground, its scenery, its sky. The course stripped of everything on
 * it to run into, pick up or ride, and anyone about, so it's just the
 * place; and the screen kept on it, its floor at `floorOnScreen` down the
 * screen (`GROUND_Y`, as on a plain arena, if not said), between `walls`.
 */
export function courseArena(
	course: CourseDefinition,
	id: CourseId,
	name: string,
	blurb: string,
	place: {
		middle: number
		walls: { left: number; right: number }
		floorOnScreen?: number
	},
): { course: Course; arena: Arena } {
	const floor = course.terrain.groundY(place.middle)
	return {
		course: {
			...course,
			id,
			number: 0,
			name,
			blurb,
			obstacles: [],
			boosts: [],
			cheerers: [],
			kmSignsAt: {},
			corgis: undefined,
			furbies: undefined,
			giantFurby: undefined,
			flyovers: undefined,
			leap: undefined,
			secret: undefined,
			portals: undefined,
			boss: undefined,
			cage: undefined,
			found: undefined,
			hunt: undefined,
			mine: undefined,
			football: undefined,
			egg: undefined,
			special: undefined,
			crowd: undefined,
			rails: undefined,
			hut: undefined,
			skiJump: undefined,
			longJump: undefined,
		},
		arena: {
			left: place.middle - VIEW_WIDTH / 2,
			cameraY: floor - (place.floorOnScreen ?? GROUND_Y),
			walls: place.walls,
		},
	}
}

/** `racers` shuffled: where each starts along the arena, a different order every game. */
export function inRandomOrder<T>(racers: readonly T[]): T[] {
	const order = [...racers]
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[order[i], order[j]] = [order[j], order[i]]
	}
	return order
}
