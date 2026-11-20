import { COURSES } from '../courses'
import type { Course } from '../courses/types'
import { MINIGAMES, type Minigame, playableBy } from '../minigames'
import type { RoundKind } from './protocol'

/**
 * What a Round can be: a course, raced, or a minigame, played in its arena.
 * Each by its place in `PLAYS`: every course first, in its own order, so a
 * course's index is the same as in `COURSES`; then every minigame.
 */
export type Play =
	| { kind: 'race'; course: Course; minigame?: undefined }
	| { kind: 'minigame'; course: Course; minigame: Minigame }

export const PLAYS: Play[] = [
	...COURSES.map((course): Play => ({ kind: 'race', course })),
	...MINIGAMES.map(
		(minigame): Play => ({
			kind: 'minigame',
			course: minigame.course,
			minigame,
		}),
	),
]

/** The course's own tune, or a minigame's. */
export const playTuneOf = (play: Play) =>
	play.minigame ? play.minigame.tune : play.course.id

/** Its name, and for a minigame, that it is one: for lists of them. */
export const playName = (play: Play) =>
	play.minigame ? `${play.course.name} (minigame)` : play.course.name

/** Every race, by index. */
export const RACES = PLAYS.flatMap((p, i) => (p.kind === 'race' ? [i] : []))

/** Every minigame `players` can play at once, by index. */
export const minigamesFor = (players: number) =>
	PLAYS.flatMap((p, i) =>
		p.minigame && playableBy(p.minigame, players) ? [i] : [],
	)

/** What a Room's Rounds can be, by index, as it's set and for so many Players. */
export function poolFor(kind: RoundKind, players: number) {
	if (kind === 'races') return RACES
	if (kind === 'minigames') return minigamesFor(players)
	return [...RACES, ...minigamesFor(players)]
}
