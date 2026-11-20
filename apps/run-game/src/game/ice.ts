import type { Course } from '../courses/types'

/**
 * Ice: anywhere a course says it's icy (see `Course['ice']`), anyone on
 * their feet on it slips. Pushing off gets them going only slowly
 * (`ICE_GRIP` of the grip they'd have), letting go they slide on and on
 * (`ICE_COAST_KEEP`), and down a slope it takes them further
 * (`ICE_SLIDE`). For a stretch of a course, or all of a minigame's arena.
 */

/** How much of their usual grip they have, running on it. */
export const ICE_GRIP = 0.25
/** How much of their speed they keep each tick, sliding on it, holding nothing. */
export const ICE_COAST_KEEP = 0.994
/** How much more a slope pulls them down it, on it. */
export const ICE_SLIDE = 1.8

/** Whether `x` along `course` is on its ice. */
export const onIce = (course: Pick<Course, 'ice'>, x: number) =>
	!!course.ice?.some((stretch) => x >= stretch.from && x <= stretch.to)
