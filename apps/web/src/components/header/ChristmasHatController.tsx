import hatAsset from '@/assets/christmas/father-christmas-hat.png'
import { RUNNER_SIZE } from '@/data/runners'
import { createController } from '@/engine'
import { isChristmas } from '@/utils/christmas'
import type { Accessor } from 'solid-js'

/**
 * The hat's size, doubled up like the runners rather than drawn at its own
 * pixel size like the pumpkins, so its pixels are the same size as theirs.
 */
const HAT_WIDTH = 9 * RUNNER_SIZE
const HAT_HEIGHT = 6 * RUNNER_SIZE

/**
 * How far in from the hat's left edge the middle of its brim is: the bobble
 * hangs off to the right, behind anyone running left.
 */
const BRIM_MIDDLE = 3 * RUNNER_SIZE

/**
 * How far above the middle of the face the bottom of the brim sits, in screen
 * pixels: pulled down over the top row of the head.
 */
const HEAD_TOP = 4

/** The bits of a runner a hat on their head needs. */
interface Wearer {
	id: string
	data: {
		head: Accessor<Vector | undefined>
		facingRight: Accessor<boolean>
	}
}

/**
 * A Father Christmas hat on a runner's head for as long as Christmas mode
 * lasts, attached to the runner the same as Halloween's pumpkins, so it sits
 * on their head in whichever pose they're drawn in, and tips with them when
 * they're scooped. Anyone without a head in their pose goes without.
 */
export function createChristmasHatController(runner: Wearer) {
	const { head, facingRight } = runner.data

	return createController({
		frames: [hatAsset],
		init: () => ({
			id: `${runner.id}-christmas-hat`,
			type: 'christmas-hat',
			// The brim on the middle of their head, wherever turning the hat round
			// for anyone stood facing right puts it.
			x: () =>
				(head()?.x ?? 0) * RUNNER_SIZE -
				(facingRight() ? HAT_WIDTH - BRIM_MIDDLE : BRIM_MIDDLE),
			y: () => (head()?.y ?? 0) * RUNNER_SIZE - HEAD_TOP - HAT_HEIGHT,
			width: () => HAT_WIDTH,
			height: () => HAT_HEIGHT,
			// Drawn on someone running left, so turned round for anyone stood
			// at a volunteer post, who face right.
			xScale: () => (facingRight() ? -1 : 1),
			style: () => ({
				display: isChristmas() && head() ? 'block' : 'none',
			}),
		}),
	})
}
