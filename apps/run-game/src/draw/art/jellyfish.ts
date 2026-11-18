import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * A jellyfish, drifting in the sea off Dino Island (see `Obstacle`'s
 * `jellyfish`): a pink dome of a bell, lit along its top, its frilly rim
 * darker, its inside glowing through it; and its tentacles trailing down
 * under it, waving. Two frames: its bell open, and pulsed in, its
 * tentacles swung the other way. Swim into it, or its tentacles, and
 * you're stung. In cells of 2, as the runners are.
 */

const CELL = 2
const COLUMNS = 16
const ROWS = 26
/** How deep its bell is, in cells: the tentacles hang under that. */
const BELL = 9

export const JELLYFISH_WIDTH = COLUMNS * CELL
export const JELLYFISH_HEIGHT = ROWS * CELL
/** How far down its picture its bell's bottom is, in screen pixels: where it's said to be. */
export const JELLYFISH_BELL = BELL * CELL

const BELL_COLOUR = '#f08fc0'
const BELL_LIT = '#ffc4e1'
const BELL_SHADE = '#c9609a'
const GLOW = '#ffe3f1'
const TENTACLE = '#d978b0'
const TENTACLE_PALE = '#f5b3d6'

/** Its picture: its bell `open`, or pulsed in, narrower and taller. */
function jellyfish(open: boolean) {
	const half = open ? 7.5 : 6
	const top = open ? 1 : 0
	return paintedArt(COLUMNS, ROWS, (px, py) => {
		// The cell it's painting (`paintedArt` hands over its middle).
		const x = Math.floor(px)
		const y = Math.floor(py)
		const mid = COLUMNS / 2
		const dx = x + 0.5 - mid
		if (y < BELL) {
			// A dome: round on top, flat along its rim.
			const t = (y + 0.5 - top) / (BELL - top)
			if (t < 0) return undefined
			const width = half * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2))
			if (Math.abs(dx) > width) return undefined
			if (y === BELL - 1) return x % 2 === 0 ? BELL_SHADE : undefined
			if (Math.abs(dx) > width - 1.2 && t > 0.4) return BELL_SHADE
			if (t < 0.3) return BELL_LIT
			if (Math.abs(dx) < 2 && t > 0.45 && t < 0.85) return GLOW
			return BELL_COLOUR
		}
		// Its tentacles, four of them, waving, the middle two longer.
		const down = y - BELL
		for (const [at, long] of [
			[-4, 11],
			[-1, 16],
			[2, 15],
			[5, 10],
		] as const) {
			if (down >= long) continue
			const sway = Math.round(
				Math.sin(down / 2.6 + at + (open ? 0 : Math.PI)) * 1.2,
			)
			if (Math.floor(dx) === at + sway)
				return down % 3 === 2 ? TENTACLE_PALE : TENTACLE
		}
		return undefined
	})
}

export const JELLYFISH_FRAMES = [jellyfish(true), jellyfish(false)]
