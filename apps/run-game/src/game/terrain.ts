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
	/**
	 * Stretches with no Ground, in order. `groundY` still runs straight
	 * across them, as the line the bus and the Pacers keep to.
	 */
	gaps: Gap[]
	/** Whether there's no Ground at `x`. */
	inGap: (x: number) => boolean
	/**
	 * Where the Ground has a side to run into, in order: either edge of a
	 * Gap, and anywhere it steps up or down.
	 */
	walls: number[]
	/** The buildings, on a course over rooftops: drawn as buildings, not hills. */
	blocks?: Block[]
}

/** A building, `from` to `to` along, its roof `height` px over the lowest the ground goes. */
export interface Block {
	from: number
	to: number
	height: number
}

/** A stretch of the course with no Ground, `from` to `to` along it. */
export interface Gap {
	from: number
	to: number
}

/** A terrain's gaps and walls, from its gaps and where its ground steps. */
export function withGaps(
	ground: Pick<Terrain, 'length' | 'finishX' | 'groundY' | 'slope'>,
	gaps: Gap[] = [],
	steps: number[] = [],
): Terrain {
	const sorted = [...gaps].sort((a, b) => a.from - b.from)
	const inGap = (x: number) => {
		for (const gap of sorted) {
			if (x < gap.from) return false
			if (x < gap.to) return true
		}
		return false
	}
	const walls = [...sorted.flatMap((gap) => [gap.from, gap.to]), ...steps].sort(
		(a, b) => a - b,
	)
	return { ...ground, gaps: sorted, inGap, walls }
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
	{
		bumps = true,
		gaps = [],
		stairs = 0,
	}: {
		/** Without the small bumps on top: a running track's dead flat. */
		bumps?: boolean
		gaps?: Gap[]
		/**
		 * Stone stairs, steps this many px high, in place of a smooth slope:
		 * low enough to run up. Its slope, for speed, is still the hill's.
		 */
		stairs?: number
	} = {},
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
	const stepped = stairs
		? (x: number) => Math.round(groundY(x) / stairs) * stairs
		: groundY

	return withGaps({ length, finishX, groundY: stepped, slope }, gaps)
}

/**
 * Ground over rooftops: flat roofs at `blocks`' heights, a step up or down
 * wherever one building meets the next (a Wall, going up), and a Gap
 * wherever there's room between them. Across a Gap, `groundY` runs straight
 * from one roof to the next, for the bus and the Pacers.
 */
export function createRooftops(blocks: Block[], distanceM: number): Terrain {
	const sorted = [...blocks].sort((a, b) => a.from - b.from)
	const length = distanceM * PX_PER_M
	const finishX = START_X + length
	const top = (block: Block) => GROUND_Y - block.height

	/** The building at `x`, or the two either side of the gap it's in. */
	const around = (x: number) => {
		let before = sorted[0]
		for (const block of sorted) {
			if (x < block.from) return { before, after: block }
			if (x < block.to) return { on: block }
			before = block
		}
		return { on: before }
	}
	const groundY = (x: number) => {
		const at = around(x)
		if (at.on) return top(at.on)
		const { before, after } = at as { before: Block; after: Block }
		if (x < before.from) return top(before)
		const t = (x - before.to) / (after.from - before.to)
		return top(before) + (top(after) - top(before)) * t
	}
	const slope = (x: number) => {
		const at = around(x)
		if (at.on) return 0
		const { before, after } = at as { before: Block; after: Block }
		return (top(after) - top(before)) / (after.from - before.to)
	}

	const gaps: Gap[] = []
	const steps: number[] = []
	for (let i = 1; i < sorted.length; i++) {
		const before = sorted[i - 1]
		const after = sorted[i]
		if (after.from > before.to) gaps.push({ from: before.to, to: after.from })
		else if (after.height !== before.height) steps.push(after.from)
	}
	return {
		...withGaps({ length, finishX, groundY, slope }, gaps, steps),
		blocks: sorted,
	}
}
