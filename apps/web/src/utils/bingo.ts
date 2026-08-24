/**
 * Generic "Bingo" completion tracking, shared by Stopwatch Bingo (finishing
 * seconds, 60 slots) and Alphabet (event first-letters, 25 slots).
 *
 * A card has `slots` cells and each parkrun fills exactly one. The card is
 * complete once every cell has been filled at least once, and it can be
 * completed repeatedly — so `completions` is the minimum count across all
 * cells, and each completion is dated to the run that pushed that minimum up.
 */

export interface BingoRun {
	date: string // YYYY-MM-DD
	slot: number // 0..slots-1
}

export interface BingoCompletion {
	date: string // date the card was filled
	totalRuns: number // cumulative parkruns run to reach this completion
}

export interface BingoProgress {
	completions: number
	completionsList: BingoCompletion[] // one entry per completed card, in order
	nextProgress: number // cells collected toward the next card (0..slots-1)
}

export function computeBingoProgress(
	runs: BingoRun[],
	slots: number,
): BingoProgress {
	const sorted = [...runs].sort((a, b) => a.date.localeCompare(b.date))
	const counts = new Array<number>(slots).fill(0)

	let completions = 0
	const completionsList: BingoCompletion[] = []

	for (let i = 0; i < sorted.length; i++) {
		const slot = sorted[i].slot
		if (slot < 0 || slot >= slots) continue
		counts[slot]++

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

/**
 * Coupon-collector maths for a bingo card, shared by every card size.
 *
 * Because each new cell gets rarer as you fill the card, filling one is the
 * classic coupon-collector problem. Expected parkruns to collect the Nth
 * distinct cell (given you already have N-1 of `slots`) is
 * `slots / (slots - N + 1)` — there are `slots - N + 1` cells left out of
 * `slots`, so the chance of a new one per run is `(slots - N + 1) / slots`.
 *
 * This assumes every cell is equally likely, which holds well for finishing
 * seconds but only loosely for finishing positions.
 */

/** Expected parkruns to collect the Nth distinct cell (1-indexed). */
export function expectedRunsForToken(n: number, slots: number): number {
	return slots / (slots - n + 1)
}

/** Expected total parkruns to have collected `score` distinct cells. */
export function expectedRunsForScore(score: number, slots: number): number {
	let total = 0
	for (let n = 1; n <= score; n++) {
		total += expectedRunsForToken(n, slots)
	}
	return total
}

/** Expected additional parkruns to finish the card from a given score. */
export function expectedRunsRemaining(score: number, slots: number): number {
	let total = 0
	for (let n = score + 1; n <= slots; n++) {
		total += expectedRunsForToken(n, slots)
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
export function runsVsAverage(
	runs: number,
	score: number,
	slots: number,
): number {
	return runs - expectedRunsForScore(Math.min(score + 1, slots), slots)
}
