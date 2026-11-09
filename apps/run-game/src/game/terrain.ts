import { GROUND_Y, HILL_PX_PER_M, PX_PER_M, START_X } from './constants'

export interface Terrain {
	/** How long the course is, start line to finish line, in world pixels. */
	length: number
	/** Where the finish line is. */
	finishX: number
	/** The ground's height at `x`, as a y on the screen. */
	groundY: (x: number) => number
	/** Its slope at `x`: how far down it goes for every pixel along, so negative is uphill. */
	slope: (x: number) => number
}

/** Flat ground for this far around the start and the finish, for the countdown and the funnel. */
const FLAT_RUN = 500

/**
 * The ground of a course: its real hills, from its elevation profile, with
 * small bumps on top, so the stretches the course itself is flat still have
 * something to run up and down.
 *
 * The course is `distanceM` long, whatever the GPS made it: the profile's
 * stretched or squeezed to fit, so a parkrun is 5 km on the nose.
 */
export function createTerrain(
	heights: number[],
	stepM: number,
	distanceM: number,
	/** Without the small bumps on top: a running track's dead flat. */
	{ bumps = true }: { bumps?: boolean } = {},
): Terrain {
	const length = distanceM * PX_PER_M
	const finishX = START_X + length
	/** The profile's own metres for each metre of the course. */
	const stretch = ((heights.length - 1) * stepM) / distanceM

	const heightAt = (metres: number) => {
		const i = Math.max(
			0,
			Math.min(heights.length - 1, (metres * stretch) / stepM),
		)
		const lower = Math.floor(i)
		const upper = Math.min(heights.length - 1, lower + 1)
		return heights[lower] + (heights[upper] - heights[lower]) * (i - lower)
	}

	/** 0 on the flat around the start and finish, easing up to 1 in between. */
	const bumpiness = (x: number) => {
		if (!bumps) return 0
		const fromEnds = Math.min(x - START_X, finishX - x)
		const t = Math.max(0, Math.min(1, fromEnds / FLAT_RUN))
		return t * t * (3 - 2 * t)
	}

	const groundY = (x: number) => {
		const along = Math.max(0, Math.min(length, x - START_X))
		const hill = heightAt(along / PX_PER_M) * HILL_PX_PER_M
		const bumps =
			(14 * Math.sin(x / 190) + 7 * Math.sin(x / 61 + 1.3)) * bumpiness(x)
		return GROUND_Y - hill - bumps
	}

	const slope = (x: number) => (groundY(x + 4) - groundY(x - 4)) / 8

	return { length, finishX, groundY, slope }
}
