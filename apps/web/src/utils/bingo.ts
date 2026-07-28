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
