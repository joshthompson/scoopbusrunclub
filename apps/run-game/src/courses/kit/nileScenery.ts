import { type PixelRect, paintedArt, pixelArt } from './pixelArt'

/**
 * The Nile's, on the Pyramids: papyrus and reeds along its banks, a bush or
 * two, and its crocodiles, lying in the water. Each a cell to a pixel,
 * drawn twice the size (`scale: 2`).
 */

const STALK = '#5f8a2e'
const STALK_LIT = '#86b04a'
const STALK_SHADE = '#41631f'
const UMBEL = '#9cc95a'
const UMBEL_LIT = '#c3e07e'
const LEAF = '#4f7f2a'
const LEAF_LIT = '#79a944'
const LEAF_SHADE = '#355a1c'
const CATTAIL = '#7a4a24'
const CATTAIL_LIT = '#9c6534'

/**
 * Papyrus: a clump of tall stalks, leaning a little, each topped with its
 * umbel, a mop of fine green threads splayed out like a firework. 22 by 34.
 */
export const papyrus = (() => {
	const rects: PixelRect[] = []
	const stalks: [base: number, top: number, lean: number][] = [
		[6, 6, -3],
		[9, 2, 0],
		[12, 8, 2],
		[15, 4, 4],
	]
	for (const [base, top, lean] of stalks) {
		const tall = 34 - top
		for (let i = 0; i < tall; i++) {
			const x = base + Math.round((lean * (tall - i)) / tall)
			rects.push([x, 34 - 1 - i, 1, 1, i < 6 ? STALK_SHADE : STALK])
		}
		// Its umbel, splayed out over the top of it.
		const x = base + lean
		rects.push(
			[x - 3, top + 1, 7, 1, UMBEL],
			[x - 2, top, 5, 1, UMBEL_LIT],
			[x - 4, top + 2, 2, 1, UMBEL],
			[x + 3, top + 2, 2, 1, UMBEL],
			[x - 1, top + 2, 3, 1, STALK_LIT],
			[x, top - 1, 1, 1, UMBEL_LIT],
		)
	}
	// Leaves round its foot.
	rects.push(
		[3, 30, 4, 4, LEAF],
		[14, 30, 5, 4, LEAF],
		[4, 30, 2, 1, LEAF_LIT],
		[15, 30, 2, 1, LEAF_LIT],
		[7, 32, 8, 2, LEAF_SHADE],
	)
	return pixelArt(22, 34, rects)
})()

/** Reeds: thin blades, two bulrushes up among them. 14 by 24. */
export const reeds = pixelArt(14, 24, [
	// The blades, some bent over.
	[2, 8, 1, 16, LEAF],
	[1, 6, 1, 3, LEAF],
	[5, 4, 1, 20, LEAF_LIT],
	[7, 10, 1, 14, LEAF],
	[8, 7, 1, 4, LEAF],
	[9, 6, 1, 2, LEAF],
	[11, 9, 1, 15, LEAF_SHADE],
	[12, 6, 1, 4, LEAF_SHADE],
	// The bulrushes, on their stems.
	[4, 0, 1, 2, STALK],
	[3, 2, 3, 6, CATTAIL],
	[3, 2, 1, 6, CATTAIL_LIT],
	[4, 8, 1, 16, STALK],
	[10, 3, 1, 2, STALK],
	[9, 5, 3, 5, CATTAIL],
	[9, 5, 1, 5, CATTAIL_LIT],
	[10, 10, 1, 14, STALK],
	// Their foot.
	[0, 22, 14, 2, LEAF_SHADE],
])

/** A low, leafy bush, a mound of it, lit on top. 20 by 10. */
export const bush = paintedArt(20, 10, (x, y) => {
	const dx = (x - 10) / 10
	const dy = (y - 10) / 9
	const r = dx * dx + dy * dy
	if (r > 1) return undefined
	// A lumpy top: a leaf here and there out of it.
	if ((Math.floor(x) * 7 + Math.floor(y) * 3) % 11 === 0) return LEAF_LIT
	return y < 4 ? LEAF_LIT : y > 7 ? LEAF_SHADE : LEAF
})

// --- The crocodiles -------------------------------------------------------------

const CROC = '#4f7a35'
const CROC_LIT = '#6e9a48'
const CROC_SHADE = '#36552a'
const CROC_DARK = '#24391c'
const BELLY = '#c9c98a'
const EYE = '#f2d14a'
const INK = '#1d1d1d'
const TOOTH = '#fffaf0'

export const CROC_COLUMNS = 34
export const CROC_ROWS = 10
/** How far down its picture the water's surface comes: the rows over it show. */
export const CROC_WATERLINE = 5

/**
 * A crocodile, side on, lying in the water facing left, the way you come:
 * its long snout, a row of teeth along its jaw, its eye up on top, the
 * ridges down its back and its tail, and its legs, paddling, under the
 * water. Only its top `CROC_WATERLINE` rows are out of it, to its jaw. 34
 * by 10.
 */
export const crocodile = pixelArt(CROC_COLUMNS, CROC_ROWS, [
	// Its snout, its nostrils up at its tip.
	[0, 1, 9, 2, CROC],
	[1, 0, 1, 1, CROC_DARK],
	[0, 1, 9, 1, CROC_LIT],
	// Its jaw, under, the teeth along it.
	[0, 3, 10, 1, CROC_SHADE],
	[1, 3, 1, 1, TOOTH],
	[3, 3, 1, 1, TOOTH],
	[5, 3, 1, 1, TOOTH],
	[7, 3, 1, 1, TOOTH],
	[1, 4, 9, 1, BELLY],
	// Its head, its eye up on top of it.
	[8, 0, 4, 1, CROC],
	[9, 0, 2, 1, EYE],
	[10, 0, 1, 1, INK],
	[8, 1, 6, 4, CROC],
	// Its body, the ridges along its back, its belly under it.
	[12, 1, 14, 5, CROC],
	[12, 1, 14, 1, CROC_LIT],
	...[13, 16, 19, 22, 25].map((x): PixelRect => [x, 0, 2, 1, CROC_DARK]),
	[13, 5, 12, 1, BELLY],
	[12, 6, 13, 1, CROC_SHADE],
	// Its tail, tapering off behind it, ridged.
	[26, 2, 4, 3, CROC],
	[26, 2, 4, 1, CROC_LIT],
	[30, 2, 3, 2, CROC],
	[33, 3, 1, 1, CROC_SHADE],
	...[27, 30].map((x): PixelRect => [x, 1, 1, 1, CROC_DARK]),
	// Its legs, paddling under it.
	[12, 6, 3, 3, CROC_SHADE],
	[11, 9, 3, 1, CROC_DARK],
	[21, 6, 3, 3, CROC_SHADE],
	[22, 9, 3, 1, CROC_DARK],
])
