/**
 * Position Bingo card definition.
 *
 * "Position Bingo" is collecting every finishing position 00–99 across your
 * official parkrun results, where a position counts as its last two digits —
 * 100th place is 00, and 1st and 101st both fill the 01 slot. The completion
 * tracking lives in `bingo.ts` and is shared with the other bingo cards.
 *
 * Unlike Stopwatch Bingo this card deliberately shows no coupon-collector
 * pace estimates: those assume every slot is equally likely, and a runner's
 * finishing positions cluster around their usual place in the field.
 */

export const POSITION_SLOTS = 100

/** Map a finishing position to its Position Bingo slot (0..99), or -1 if unset. */
export function positionSlot(position: number): number {
	if (!Number.isFinite(position) || position <= 0) return -1
	return Math.floor(position) % POSITION_SLOTS
}
