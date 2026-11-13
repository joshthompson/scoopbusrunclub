/**
 * The bus's drill, in place of its scoop, boring through a Cave: drawn as
 * the bus is, three-quarters on, so it's bolted onto the front of it, not
 * stuck out of its side. Its base, round, seen at an angle on the bus's
 * grille, an upright ellipse; a short collar, striped yellow and black; and
 * the bit, a cone, tapering from there to its point out in front, its
 * flutes spiralling round it, lit from above. Two frames, its flutes a
 * half-turn on in the second, so it turns.
 *
 * In the bus's own pixels, from `DRILL_AT` on the bus's picture: its point
 * where the old one's was, at the scoop's front, so where the bus is and
 * where the rock flies off it are as they were.
 */

export const DRILL_WIDTH = 120
export const DRILL_HEIGHT = 68
/** Where it goes on the bus's picture: its top left. */
export const DRILL_AT = { x: 176, y: 58 }

/** Its base's middle, and its point, in its own pixels. */
const BASE = { x: 30, y: 34 }
export const DRILL_POINT = { x: 118, y: 34 }
/** Its base's half-width, foreshortened, seen at an angle, and its half-height. */
const ACROSS = 13
const UP = 22
/** Across the bus's front, which slopes a little down to the right, as drawn. */
const LATERAL = { x: 1, y: 0.09 }
/** How far along it the collar goes, before the bit starts tapering. */
const COLLAR = 0.1
/** How many flutes spiral round the bit, and how far round each goes, base to point. */
const FLUTES = 3
const TWIST = 1.3

const INK = '#1a1a1d'
const STEEL = ['#dfe3e8', '#b8bec7', '#8f97a2', '#666e79']
const GROOVE = '#454b54'
const HAZARD = ['#f2c12e', '#232323']

/**
 * What's at `x`, `y` of it: the nearest part of it to the eye there, the
 * cross-section of it furthest along towards its point that it's in, and
 * how far round that it is.
 */
function surface(x: number, y: number) {
	for (let t = 1; t >= 0; t -= 0.004) {
		const shrink = t < COLLAR ? 1 : 1 - (t - COLLAR) / (1 - COLLAR)
		if (shrink <= 0) continue
		const cx = BASE.x + (DRILL_POINT.x - BASE.x) * t
		const cy = BASE.y + (DRILL_POINT.y - BASE.y) * t
		// Out from its middle, across the bus's front and up it.
		const along = (x - cx) / LATERAL.x
		const down = y - cy - along * LATERAL.y
		const a = along / (ACROSS * shrink)
		const b = down / (UP * shrink)
		if (a * a + b * b <= 1) return { t, round: Math.atan2(b, a) }
	}
	return undefined
}

function drill(turn: number) {
	const cells: (string | undefined)[][] = []
	for (let y = 0; y < DRILL_HEIGHT; y++) {
		const row: (string | undefined)[] = []
		for (let x = 0; x < DRILL_WIDTH; x++) {
			const at = surface(x + 0.5, y + 0.5)
			if (!at) {
				row.push(undefined)
				continue
			}
			const round = at.round / (Math.PI * 2)
			if (at.t < COLLAR) {
				// The collar, striped, and darker underneath.
				const stripe = Math.floor((round + 1) * 16) % 2
				row.push(at.round > 0.9 && at.round < 2.4 ? GROOVE : HAZARD[stripe])
				continue
			}
			// Lit from above and a little behind: brightest on its top.
			const light = Math.cos(at.round + 1.9)
			const shade = light > 0.55 ? 0 : light > 0 ? 1 : light > -0.6 ? 2 : 3
			const flute =
				((((round + at.t * TWIST) * FLUTES + turn) % 1) + 1) % 1 < 0.22
			row.push(flute ? (shade < 2 ? STEEL[2] : GROOVE) : STEEL[shade])
		}
		cells.push(row)
	}
	// An ink outline round it, as the bus has.
	const filled = (x: number, y: number) => !!cells[y]?.[x]
	const inked = cells.map((row, y) =>
		row.map((colour, x) =>
			colour &&
			(!filled(x - 1, y) ||
				!filled(x + 1, y) ||
				!filled(x, y - 1) ||
				!filled(x, y + 1))
				? INK
				: colour,
		),
	)
	// As a picture of its own, not rects: drawn bigger, on a phone, rects
	// leave hairlines between their rows.
	const canvas = document.createElement('canvas')
	canvas.width = DRILL_WIDTH
	canvas.height = DRILL_HEIGHT
	const ctx = canvas.getContext('2d')
	inked.forEach((row, y) =>
		row.forEach((colour, x) => {
			if (!colour || !ctx) return
			ctx.fillStyle = colour
			ctx.fillRect(x, y, 1, 1)
		}),
	)
	return canvas.toDataURL()
}

/** Its two frames, turning. */
export const DRILL_FRAMES: [string, string] = [drill(0), drill(0.5)]
