import { type Collectable, courseCollectables } from '../game/collectables'
import { COURSES } from './index'
import type { Course } from './types'

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
	return own
})()

/** A course's own collectables: see `OWN`. */
export const levelCollectables = (course: Course): Collectable[] =>
	OWN.get(course.id) ?? []
