/**
 * Stopwatch Bingo maths.
 *
 * "Stopwatch Bingo" is collecting every possible finishing-second 00–59 across
 * your official parkrun times. Because each new second gets rarer as you fill
 * the card, this is the classic coupon-collector problem.
 *
 * Expected parkruns to collect the Nth distinct second (given you already have
 * N-1 of the 60) is `60 / (60 - N + 1)` — there are `60 - N + 1` seconds left
 * out of 60, so the chance of a new one per run is `(60 - N + 1) / 60`.
 */

export const BINGO_SLOTS = 60

/** Expected parkruns to collect the Nth distinct second (1-indexed). */
export function expectedRunsForToken(n: number): number {
	return BINGO_SLOTS / (BINGO_SLOTS - n + 1)
}

/** Expected total parkruns to have collected `score` distinct seconds (0..60). */
export function expectedRunsForScore(score: number): number {
	let total = 0
	for (let n = 1; n <= score; n++) {
		total += expectedRunsForToken(n)
	}
	return total
}

/** Expected additional parkruns to finish the card from a given score (0..60). */
export function expectedRunsRemaining(score: number): number {
	let total = 0
	for (let n = score + 1; n <= BINGO_SLOTS; n++) {
		total += expectedRunsForToken(n)
	}
	return total
}

/**
 * How a runner is doing versus the coupon-collector average, in parkruns.
 *
 * The baseline is the expected runs to reach the current score *including the
 * next, in-progress token* — i.e. `expectedRunsForScore(score + 1)`. This
 * matches the agreed worked example: 54/60 → baseline of N=1..55 ≈ 143.79, so
 * 155 runs reads as ~10 behind. Positive → behind (used more runs than
 * average); negative → ahead.
 */
export function runsVsAverage(runs: number, score: number): number {
	const baseline = expectedRunsForScore(Math.min(score + 1, BINGO_SLOTS))
	return runs - baseline
}

/** A single parkrun reduced to what Bingo cares about: when, and which second. */
export interface BingoRun {
	date: string // YYYY-MM-DD
	second: number // 0..59
}

export interface BingoCompletion {
	date: string // date the card was filled
	totalRuns: number // cumulative parkruns run to reach this completion
}

export interface BingoProgress {
	completions: number // how many full cards (min count across all 60 seconds)
	completionsList: BingoCompletion[] // one entry per completed card, in order
	nextProgress: number // seconds collected toward the next card (0..59)
}

/**
 * Walk a runner's parkruns in date order and work out how many times they've
 * filled the whole 00–59 card. A card is complete when every second has been
 * hit at least once more than the previous card, so `completions` is the
 * minimum count across all 60 seconds, and each completion is dated to the run
 * that pushed that minimum up.
 */
export function computeBingoProgress(runs: BingoRun[]): BingoProgress {
	const sorted = [...runs].sort((a, b) => a.date.localeCompare(b.date))
	const counts = new Array<number>(BINGO_SLOTS).fill(0)

	let completions = 0
	const completionsList: BingoCompletion[] = []

	for (let i = 0; i < sorted.length; i++) {
		counts[sorted[i].second]++

		// Adding one run raises the minimum by at most one, so at most one new
		// completion per run.
		let min = Number.POSITIVE_INFINITY
		for (const count of counts) {
			if (count < min) min = count
		}

		if (min > completions) {
			completions = min
			completionsList.push({ date: sorted[i].date, totalRuns: i + 1 })
		}
	}

	let nextProgress = 0
	for (const count of counts) {
		if (count > completions) nextProgress++
	}

	return { completions, completionsList, nextProgress }
}
