import { MEDAL_SCORES, type MedalPoints } from '../courses/medalScores'
import type { Course } from '../courses/types'
import { PX_PER_M } from './constants'

/**
 * A course's medals, its score goal: bronze for the points getting round it
 * is worth, silver and gold for a good many more besides (see
 * `medalScores`).
 */
export type Medal = 'bronze' | 'silver' | 'gold'

/** Worst to best. */
export const MEDALS: Medal[] = ['bronze', 'silver', 'gold']

/** What each of a course's boosts is worth, had: what's there to be had on it. */
const BOOST_POINTS: Record<string, number> = {
	fika: 100,
	cheer: 50,
	barcode: 250,
	pumpkin: 100,
	hat: 150,
	ring: 50,
	gate: 50,
}
/** A ride's worth, and how many of them anyone's likely to have. */
const RIDE_POINTS = 250
const RIDES_HAD = 2

/** To the nearest 250: a score to aim for looks like one. */
const round = (points: number) => Math.round(points / 250) * 250

/**
 * The points each of a course's medals takes: its own, from
 * `MEDAL_SCORES`, where they're tweaked. A course not there yet gets them
 * worked out. Bronze, its distance's: what getting round it's worth, a
 * point a metre. Silver and gold, its distance's and on top a share of
 * what there is to be had on it, fika, cheers, rides, hats, and more again
 * for speed: half of it for silver, nearly all of it and a good deal of
 * speed for gold.
 */
export function medalScores(course: Course): MedalPoints {
	const own = MEDAL_SCORES[course.id]
	if (own) return own
	const distance = course.terrain.length / PX_PER_M
	const there =
		course.boosts.reduce((sum, b) => sum + (BOOST_POINTS[b.kind] ?? 0), 0) +
		Math.min(course.corgis?.length ?? 0, RIDES_HAD) * RIDE_POINTS +
		Math.min(course.flyovers?.length ?? 0, RIDES_HAD) * RIDE_POINTS
	return {
		bronze: distance,
		silver: round(distance + there * 0.5 + 1500),
		gold: round(distance + there * 0.85 + 3000),
	}
}

/** The medal a go at `course` scoring `score` gets, if any. */
export function medalFor(course: Course, score: number): Medal | undefined {
	const { bronze, silver, gold } = medalScores(course)
	return score >= gold
		? 'gold'
		: score >= silver
			? 'silver'
			: score >= bronze
				? 'bronze'
				: undefined
}

/** Whether `a` is a better medal than `b`, or `b`'s none. */
export const better = (a: Medal, b: Medal | undefined) =>
	!b || MEDALS.indexOf(a) > MEDALS.indexOf(b)

/** The medal after `medal`, the next to go for, if there is one; bronze, after none. */
export const nextMedal = (medal: Medal | undefined): Medal | undefined =>
	MEDALS[medal ? MEDALS.indexOf(medal) + 1 : 0]
