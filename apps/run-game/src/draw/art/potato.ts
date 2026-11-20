import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * Potato Rain's art (see `minigames/potatoRain`): a giant potato,
 * falling; the same smashed onto the path where it's landed, its
 * mash splattered out from under it; and the heap of earth round anyone
 * it's knocked into the ground. Lit from above and to the left, as
 * everything is.
 */

const CELL = 2

/** Its skin: highlight, lit, base, shade and deep shade. */
const SKIN_HI = '#dcae74'
const SKIN_LIT = '#c48a4f'
const SKIN = '#a8703a'
const SKIN_SHADE = '#865427'
const SKIN_DEEP = '#5e3a1a'
const SKIN_TONES = [SKIN_DEEP, SKIN_SHADE, SKIN, SKIN_LIT, SKIN_HI]
/** Its fluffy inside, smashed. */
const FLESH_HI = '#fffbe6'
const FLESH = '#fff0c2'

/** The same speckle for the same cell, every time: its skin's texture. */
const speckle = (x: number, y: number) => {
	const n =
		Math.sin(Math.floor(x) * 12.9898 + Math.floor(y) * 78.233) * 43758.5453
	return n - Math.floor(n)
}

/**
 * Skin lit from above and to the left, at `dx`, `dy` across an oval (each
 * -1 to 1): one of `SKIN_TONES`, darker in the odd speckle.
 */
function skinAt(x: number, y: number, dx: number, dy: number) {
	const light = -(dx * 0.5 + dy * 0.85)
	let tone =
		light > 0.6 ? 4 : light > 0.2 ? 3 : light > -0.25 ? 2 : light > -0.6 ? 1 : 0
	if (speckle(x, y) < 0.09) tone = Math.max(0, tone - 1)
	return SKIN_TONES[tone]
}

/** A falling potato's size, in cells, and its oval of skin. */
const POTATO_COLUMNS = 44
const POTATO_ROWS = 30
const BODY = { x: 22, y: 18.5, rx: 20.5, ry: 11 }

/**
 * A giant potato: a lumpy oval of skin, speckled, lit from above. Just a
 * potato, falling.
 */
export const POTATO = paintedArt(POTATO_COLUMNS, POTATO_ROWS, (x, y) => {
	const dx = (x - BODY.x) / BODY.rx
	const dy = (y - BODY.y) / BODY.ry
	const angle = Math.atan2(dy, dx)
	const lump =
		1 + 0.05 * Math.sin(3 * angle + 0.6) + 0.035 * Math.cos(5 * angle)
	if (Math.hypot(dx, dy) > lump) return undefined
	return skinAt(x, y, dx, dy)
})
export const POTATO_WIDTH = POTATO_COLUMNS * CELL
export const POTATO_HEIGHT = POTATO_ROWS * CELL

/** A smashed potato's size, in cells, and the row the path's at in it. */
const SMASH_COLUMNS = 92
const SMASH_ROWS = 28
const SMASH_GROUND = 21
const SMASH_MIDDLE = SMASH_COLUMNS / 2
/** The potato itself, squashed flat on landing: wider and lower than falling. */
const SQUASHED = { y: 14, rx: 17, ry: 8 }
/** The splat's edge, a little darker: mash spread thin. */
const MASH_EDGE = '#dcb56a'
/** An oval, by its middle and half its width and height, in cells. */
type Oval = [x: number, y: number, rx: number, ry: number]
const M = SMASH_MIDDLE
const G = SMASH_GROUND
/**
 * The mash splattered over the path, seen from a little above: blobs of
 * it, run together round where it landed, out further in lobes.
 */
const SPLAT: Oval[] = [
	[M, G, 25, 3.4],
	[M + 3, G - 3, 10, 1.6],
	[M - 26, G + 0.6, 7, 1.9],
	[M + 27, G - 0.2, 8, 2.1],
	[M - 14, G + 2.8, 8, 1.9],
	[M + 13, G + 3, 9, 1.7],
]
/** Spikes sprayed out of it, tapering: [from x, y, to x, y, width at its root]. */
const SPIKES = [
	[M - 31, G + 0.4, M - 39, G - 1.6, 1.6],
	[M + 33, G + 0.4, M + 41, G + 2.2, 1.8],
	[M - 20, G + 4, M - 26, G + 5.6, 1.4],
	[M + 20, G + 4, M + 27, G + 5.4, 1.4],
	[M - 8, G - 3, M - 13, G - 5, 1.2],
]
/** And blobs flung further, beyond the spikes. */
const DROPLETS: Oval[] = [
	[M - 42, G - 2.4, 1.3, 1],
	[M + 44, G + 3, 1.6, 1.1],
	[M - 30, G + 4.4, 1.2, 0.9],
	[M + 32, G + 4.2, 1.1, 0.8],
	[M - 3, G + 4.6, 1.4, 0.8],
	[M + 37, G - 2.2, 1, 0.8],
]
const inOval = (x: number, y: number, [ox, oy, rx, ry]: Oval) =>
	((x - ox) / rx) ** 2 + ((y - oy) / ry) ** 2 <= 1
/** How near a point is to a spike's line, along it and across it, tapering to its tip. */
function inSpike(x: number, y: number, [x1, y1, x2, y2, root]: number[]) {
	const dx = x2 - x1
	const dy = y2 - y1
	const along = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
	if (along < 0 || along > 1) return false
	const across = Math.abs((x - x1) * dy - (y - y1) * dx) / Math.hypot(dx, dy)
	return across <= root * (1 - along * 0.75)
}
const inSplat = (x: number, y: number) =>
	SPLAT.some((o) => inOval(x, y, o)) ||
	SPIKES.some((s) => inSpike(x, y, s)) ||
	DROPLETS.some((o) => inOval(x, y, o))
/** Where mash has burst out from under it, bulging out of its sides. */
const OOZE: Oval[] = [
	[M - 17, G - 1.8, 3.6, 2.8],
	[M - 21.5, G - 0.6, 2.6, 2],
	[M + 17, G - 1.6, 3.4, 2.7],
	[M + 21.5, G - 0.4, 2.4, 1.9],
]

/**
 * A potato smashed onto the path: still whole on top, its skin unbroken,
 * but squashed flat and burst along the bottom, its mash bulging out of
 * its sides and splattered across the path all round: blobs run together,
 * spikes sprayed out of them, and drops flung further, like a splash of
 * paint.
 */
export const POTATO_SMASHED = paintedArt(SMASH_COLUMNS, SMASH_ROWS, (x, y) => {
	// The potato, squashed: skin over the top, burst into mash underneath.
	const dx = (x - M) / SQUASHED.rx
	const dy = (y - SQUASHED.y) / SQUASHED.ry
	const angle = Math.atan2(dy, dx)
	const lump =
		1 + 0.05 * Math.sin(3 * angle + 0.6) + 0.035 * Math.cos(5 * angle)
	if (Math.hypot(dx, dy) <= lump) {
		const burst = SQUASHED.y + 2.6 + 1.2 * Math.sin(x * 0.55 + 0.8)
		if (y < burst) return skinAt(x, y, dx, dy)
		return y - burst < 1 ? FLESH_HI : FLESH
	}
	// Mash bulging out of its sides, where it's burst.
	const ooze = OOZE.find((o) => inOval(x, y, o))
	if (ooze) return y < ooze[1] - ooze[3] * 0.4 ? FLESH_HI : FLESH
	if (!inSplat(x, y)) return undefined
	// A drop flung clear of it: fresh mash, lit on top.
	const drop = DROPLETS.find((o) => inOval(x, y, o))
	if (drop && !SPLAT.some((o) => inOval(x, y, o)))
		return y < drop[1] ? FLESH_HI : FLESH
	// The splat: a darker rim along its edge, lit on top near the middle.
	const edge = !inSplat(x - 1, y) || !inSplat(x + 1, y) || !inSplat(x, y + 1)
	if (edge) return MASH_EDGE
	return y < G - 1 && Math.abs(x - M) < 20 ? FLESH_HI : FLESH
})
export const SMASH_WIDTH = SMASH_COLUMNS * CELL
export const SMASH_HEIGHT = SMASH_ROWS * CELL
/** How far down the smash, in px, the path is: where it sits on it. */
export const SMASH_GROUND_Y = SMASH_GROUND * CELL
/** Where steam comes off the top of it, in px from its left. */
export const SMASH_STEAM = [SMASH_MIDDLE - 9, SMASH_MIDDLE + 6].map(
	(x) => x * CELL,
)
/** How far down the smash the top of the potato is, in px: where the steam starts. */
export const SMASH_TOP_Y = Math.round((SQUASHED.y - SQUASHED.ry) * CELL)

/** The heap of earth round someone buried, in cells. */
const MOUND_COLUMNS = 28
const MOUND_ROWS = 6

/** Earth heaped up round someone knocked into the ground, a clod or two on it. */
export const MOUND = paintedArt(MOUND_COLUMNS, MOUND_ROWS, (x, y) => {
	const dx = (x - MOUND_COLUMNS / 2) / (MOUND_COLUMNS / 2)
	const top = MOUND_ROWS * (0.2 + 0.8 * dx * dx)
	if (Math.abs(dx) > 1 || y < top) return undefined
	if (
		(Math.floor(x) === 5 && Math.floor(y) === 3) ||
		(Math.floor(x) === 21 && Math.floor(y) === 2)
	)
		return '#4a3018'
	return y - top < 1 ? '#9a6a36' : y > MOUND_ROWS - 2 ? '#5e3c1c' : '#7a4f24'
})
export const MOUND_WIDTH = MOUND_COLUMNS * CELL
export const MOUND_HEIGHT = MOUND_ROWS * CELL
