import {
	COLLECTABLES,
	type Collectable,
	courseCollectables,
} from '../game/collectables'
import { MINIGAMES } from '../minigames'
import { COURSES } from './index'
import type { Course, CourseId } from './types'

/**
 * The collectables each course counts as its own: whatever's on it that's
 * not on a course before it, in `COURSES`' order. Something on more than
 * one, a fika or a ride, belongs to the first it's on; worked out from the
 * order the courses are in, so moving them round moves it with them.
 */
const OWN = (() => {
	const seen = new Set<Collectable>()
	const own = new Map<string, Collectable[]>()
	for (const course of COURSES) {
		const mine = courseCollectables(course).filter((c) => !seen.has(c))
		for (const c of mine) seen.add(c)
		own.set(course.id, mine)
	}
	// Then each minigame's, had playing it: its arena's, as a course's.
	for (const { course, collectables } of MINIGAMES) {
		const mine = collectables.filter((c) => !seen.has(c))
		for (const c of mine) seen.add(c)
		own.set(course.id, mine)
	}
	// Anything on no course at all has no "Somewhere on..." on the
	// Collectables screen, and can't be had: a course meant to have it
	// doesn't.
	for (const c of COLLECTABLES)
		if (!seen.has(c)) console.error(`${c} isn't on any course`)
	return own
})()

/** A course's own collectables: see `OWN`. */
export const levelCollectables = (course: Course): Collectable[] =>
	OWN.get(course.id) ?? []

/** The course `id` is first found on, if it's on one: see `OWN`. */
export function collectableCourse(id: Collectable): Course | undefined {
	for (const course of [...COURSES, ...MINIGAMES.map((m) => m.course)])
		if (OWN.get(course.id)?.includes(id)) return course
	return undefined
}

/**
 * How each course is said, where something's found on it: in Haga, on The
 * Slopes, at the Pyramids. A `Record`, so a new course won't build till
 * it's said.
 */
const WHERE: Record<CourseId, string> = {
	haga: 'in',
	kristineberg: 'at',
	'gamla-stan': 'in',
	huddinge: 'in',
	pyramids: 'at the',
	'halloween-town': 'in',
	'scoop-line': 'on',
	caves: 'in',
	'great-wall': 'on the',
	'furby-fields': 'in',
	'machu-picchu': 'on',
	sewers: 'in',
	'city-rooftop': 'on',
	cliff: 'on',
	everest: 'on',
	slopes: 'on',
	karolinska: 'in',
	midnattsloppet: 'at',
	'dino-island': 'on',
	'rocket-launch': 'on',
	'fruit-kebab': 'in the',
	'potato-rain': 'in the',
	'jump-rope': 'in the',
	'pogo-sticks': 'in the',
	'iceberg-bump': 'in the',
	'beach-volleyball': 'in the',
	'red-light-green-light': 'in the',
	'memory-dunk': 'in the',
	paintbrush: 'in the',
	'hungry-goose': 'in the',
}

/**
 * Where on `course` something is: "in Haga", "on The Slopes"; or in a
 * minigame, "in the Fruit Kebab minigame".
 */
export const onCourse = (course: Course) =>
	`${WHERE[course.id]} ${course.name}${MINIGAMES.some((m) => m.course.id === course.id) ? ' minigame' : ''}`
